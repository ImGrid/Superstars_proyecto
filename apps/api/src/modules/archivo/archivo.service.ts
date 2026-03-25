import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { SchemaDefinition, FormField } from '@superstars/shared';
import { EstadoPostulacion } from '@superstars/shared';
import { ArchivoRepository } from './archivo.repository';
import { PostulacionRepository } from '../postulacion/postulacion.repository';
import { FormularioService } from '../formulario/formulario.service';
import { ConcursoAccessService } from '../concurso/concurso-access.service';
import { EvaluacionRepository } from '../evaluacion/evaluacion.repository';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';

// estados donde el evaluador puede acceder a archivos
const ESTADOS_EVALUABLES = [
  EstadoPostulacion.EN_EVALUACION,
  EstadoPostulacion.CALIFICADO,
  EstadoPostulacion.GANADOR,
  EstadoPostulacion.NO_SELECCIONADO,
];

@Injectable()
export class ArchivoService {
  constructor(
    private readonly archivoRepo: ArchivoRepository,
    private readonly postulacionRepo: PostulacionRepository,
    private readonly formularioService: FormularioService,
    private readonly concursoAccess: ConcursoAccessService,
    private readonly evaluacionRepo: EvaluacionRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Subir archivo para un campo del formulario
  async upload(
    postulacionId: number,
    userId: number,
    fieldId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    const post = await this.getPostulacionOrFail(postulacionId);
    await this.verificarPropietario(post.empresaId, userId);
    this.verificarEditable(post.estado);

    // Buscar campo en el schema del formulario
    const formulario = await this.formularioService.findByConcursoId(post.concursoId);
    const schemaDef = formulario.schemaDefinition as SchemaDefinition;
    const campo = this.findArchivoCampo(schemaDef, fieldId);

    // Validar tipo MIME contra tiposPermitidos del campo
    const ext = extname(file.originalname).toLowerCase();
    if (!campo.tiposPermitidos.some(t => t.toLowerCase() === ext)) {
      throw new BadRequestException(
        `Tipo de archivo "${ext}" no permitido. Permitidos: ${campo.tiposPermitidos.join(', ')}`,
      );
    }

    // Validar tamano
    const maxBytes = campo.maxTamanoMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `El archivo excede el tamano maximo de ${campo.maxTamanoMb} MB`,
      );
    }

    // Validar cantidad maxima de archivos para este campo
    const currentCount = await this.archivoRepo.countByPostulacionAndField(postulacionId, fieldId);
    if (currentCount >= campo.maxArchivos) {
      throw new ConflictException(
        `Ya se alcanzo el maximo de ${campo.maxArchivos} archivo(s) para este campo`,
      );
    }

    // Generar storage key y guardar archivo
    const uuid = randomUUID();
    const storageKey = `postulaciones/${postulacionId}/${uuid}${ext}`;
    await this.storage.upload(storageKey, file.buffer);

    // Crear registro en BD
    return this.archivoRepo.create({
      postulacionId,
      fieldId,
      nombreOriginal: file.originalname,
      storageKey,
      mimeType: file.mimetype,
      tamanoBytes: file.size,
    });
  }

  // Listar archivos de una postulacion
  async findAllByPostulacion(postulacionId: number, userId: number, userRol: string) {
    if (userRol === 'proponente') {
      const post = await this.getPostulacionOrFail(postulacionId);
      await this.verificarPropietario(post.empresaId, userId);
    } else if (userRol === 'evaluador') {
      await this.verificarAccesoEvaluador(postulacionId, userId);
    }
    return this.archivoRepo.findAllByPostulacionId(postulacionId);
  }

  // Descargar archivo
  async download(archivoId: number, userId: number, userRol: string) {
    const archivo = await this.archivoRepo.findById(archivoId);
    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // verificar acceso segun rol
    if (userRol === 'proponente') {
      const post = await this.postulacionRepo.findById(archivo.postulacionId);
      if (post) {
        await this.verificarPropietario(post.empresaId, userId);
      }
    } else if (userRol === 'evaluador') {
      await this.verificarAccesoEvaluador(archivo.postulacionId, userId);
    }

    const buffer = await this.storage.download(archivo.storageKey);
    return { buffer, mimeType: archivo.mimeType, nombreOriginal: archivo.nombreOriginal };
  }

  // Eliminar archivo
  async remove(archivoId: number, userId: number) {
    const archivo = await this.archivoRepo.findById(archivoId);
    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const post = await this.getPostulacionOrFail(archivo.postulacionId);
    await this.verificarPropietario(post.empresaId, userId);
    this.verificarEditable(post.estado);

    // Borrar del storage y de la BD
    await this.storage.delete(archivo.storageKey);
    await this.archivoRepo.delete(archivoId);
  }

  // --- Helpers privados ---

  private async getPostulacionOrFail(postulacionId: number) {
    const post = await this.postulacionRepo.findById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulacion no encontrada');
    }
    return post;
  }

  private async verificarPropietario(empresaId: number, userId: number): Promise<void> {
    const userEmpresaId = await this.postulacionRepo.getEmpresaIdByUsuarioId(userId);
    if (userEmpresaId !== empresaId) {
      throw new ForbiddenException('No tienes acceso a esta postulacion');
    }
  }

  private verificarEditable(estado: string): void {
    if (estado !== EstadoPostulacion.BORRADOR && estado !== EstadoPostulacion.OBSERVADO) {
      throw new ConflictException('No se pueden modificar archivos en el estado actual');
    }
  }

  // Verifica que el evaluador este asignado a la postulacion
  private async verificarAccesoEvaluador(postulacionId: number, userId: number): Promise<void> {
    const post = await this.getPostulacionOrFail(postulacionId);
    if (!ESTADOS_EVALUABLES.includes(post.estado as EstadoPostulacion)) {
      throw new ForbiddenException('La postulacion no esta en estado de evaluacion');
    }
    const esAsignado = await this.evaluacionRepo.isAsignadoAPostulacion(postulacionId, userId);
    if (!esAsignado) {
      throw new ForbiddenException('No estas asignado para evaluar esta postulacion');
    }
  }

  // Busca el campo de tipo 'archivo' en el schema del formulario
  private findArchivoCampo(schema: SchemaDefinition, fieldId: string): Extract<FormField, { tipo: 'archivo' }> {
    const allCampos = schema.secciones.flatMap(s => s.campos);
    const campo = allCampos.find(c => c.id === fieldId);

    if (!campo) {
      throw new BadRequestException(`Campo "${fieldId}" no existe en el formulario`);
    }
    if (campo.tipo !== 'archivo') {
      throw new BadRequestException(`Campo "${fieldId}" no es de tipo archivo`);
    }

    return campo as Extract<FormField, { tipo: 'archivo' }>;
  }
}
