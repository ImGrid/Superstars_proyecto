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
import { unlink } from 'fs/promises';
import type { SchemaDefinition, FormField } from '@superstars/shared';
import { EstadoPostulacion } from '@superstars/shared';
import {
  mimeSeguroDesdeExtension,
  esReproducible,
} from '../../common/constants/archivo.constants';
import { ArchivoRepository } from './archivo.repository';
import { PostulacionRepository } from '../postulacion/postulacion.repository';
import { FormularioService } from '../formulario/formulario.service';
import { ConvocatoriaAccessService } from '../convocatoria/convocatoria-access.service';
import { CategoriaService } from '../categoria/categoria.service';
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
    private readonly convocatoriaAccess: ConvocatoriaAccessService,
    private readonly categoriaService: CategoriaService,
    private readonly evaluacionRepo: EvaluacionRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Subir archivo para un campo del formulario.
  // `path` es el temporal que dejo multer en disco. Si algo falla despues, ese
  // temporal hay que borrarlo o se acumula basura de 100 MB por intento fallido.
  async upload(
    postulacionId: number,
    userId: number,
    fieldId: string,
    file: { originalname: string; mimetype: string; size: number; path: string },
  ) {
    let temporalMovido = false;
    try {
      const post = await this.getPostulacionOrFail(postulacionId);
      await this.verificarPropietario(post.empresaId, userId);
      this.verificarEditable(post.estado);

      // Buscar campo en el schema del formulario de la categoria de la postulacion
      const formulario = await this.formularioService.getByCategoriaId(post.categoriaId);
      const schemaDef = formulario.schemaDefinition as SchemaDefinition;
      const campo = this.findArchivoCampo(schemaDef, fieldId);

      // Validar tipo MIME contra tiposPermitidos del campo
      const ext = extname(file.originalname).toLowerCase();
      if (!campo.tiposPermitidos.some(t => t.toLowerCase() === ext)) {
        throw new BadRequestException(
          `Tipo de archivo "${ext}" no permitido. Permitidos: ${campo.tiposPermitidos.join(', ')}`,
        );
      }

      // Validar tamaño
      const maxBytes = campo.maxTamanoMb * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new BadRequestException(
          `El archivo excede el tamaño máximo de ${campo.maxTamanoMb} MB`,
        );
      }

      // Validar cantidad máxima de archivos para este campo
      const currentCount = await this.archivoRepo.countByPostulacionAndField(postulacionId, fieldId);
      if (currentCount >= campo.maxArchivos) {
        throw new ConflictException(
          `Ya se alcanzó el máximo de ${campo.maxArchivos} archivo(s) para este campo`,
        );
      }

      // Mover el temporal a su sitio definitivo (rename, no copia el contenido)
      const uuid = randomUUID();
      const storageKey = `postulaciones/${postulacionId}/${uuid}${ext}`;
      await this.storage.uploadFromPath(storageKey, file.path);
      temporalMovido = true;

      try {
        // Crear registro en BD
        return await this.archivoRepo.create({
          postulacionId,
          fieldId,
          nombreOriginal: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          tamanoBytes: file.size,
        });
      } catch (err) {
        // Sin fila en la BD el archivo es inalcanzable: no dejarlo ocupando disco
        await this.storage.delete(storageKey).catch(() => undefined);
        throw err;
      }
    } finally {
      if (!temporalMovido) {
        await unlink(file.path).catch(() => undefined);
      }
    }
  }

  // Listar archivos de una postulacion
  async findAllByPostulacion(
    convocatoriaId: number,
    postulacionId: number,
    userId: number,
    userRol: string,
  ) {
    // coherencia de ruta: la postulacion debe pertenecer a la convocatoria del path
    // (el guard @CheckConvocatoria ya valido que el responsable sea dueno de esa convocatoria)
    const post = await this.getPostulacionEnConvocatoria(postulacionId, convocatoriaId);
    if (userRol === 'proponente') {
      await this.verificarPropietario(post.empresaId, userId);
    } else if (userRol === 'evaluador') {
      await this.verificarAccesoEvaluador(postulacionId, userId);
    }
    return this.archivoRepo.findAllByPostulacionId(postulacionId);
  }

  // Autoriza el acceso a un archivo y devuelve lo necesario para enviarlo.
  // Lo usan la descarga y la reproduccion en pantalla: las dos comprueban lo
  // mismo, solo cambia como se entrega despues.
  //
  // No devuelve el contenido: un video de 100 MB no cabe comodo en memoria y
  // ademas hay que poder mandar solo el trozo que pide el navegador.
  async obtenerParaEnvio(
    convocatoriaId: number,
    postulacionId: number,
    archivoId: number,
    userId: number,
    userRol: string,
  ) {
    const archivo = await this.archivoRepo.findById(archivoId);
    // coherencia de ruta: el archivo debe pertenecer a la postulacion del path
    if (!archivo || archivo.postulacionId !== postulacionId) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // coherencia de ruta: la postulacion debe pertenecer a la convocatoria del path
    // (el guard @CheckConvocatoria ya valido que el responsable sea dueno de esa convocatoria)
    const post = await this.getPostulacionEnConvocatoria(postulacionId, convocatoriaId);

    // verificar acceso segun rol
    if (userRol === 'proponente') {
      await this.verificarPropietario(post.empresaId, userId);
    } else if (userRol === 'evaluador') {
      await this.verificarAccesoEvaluador(postulacionId, userId);
    }

    let size: number;
    try {
      ({ size } = await this.storage.stat(archivo.storageKey));
    } catch {
      // fila en la BD sin archivo en disco
      throw new NotFoundException('Archivo no encontrado');
    }

    const ext = extname(archivo.storageKey).toLowerCase();
    return {
      storageKey: archivo.storageKey,
      nombreOriginal: archivo.nombreOriginal,
      // el tipo se decide por la extension ya validada, NUNCA con el valor que
      // declaro el navegador de quien subio (ver archivo.constants)
      mimeType: mimeSeguroDesdeExtension(ext),
      reproducible: esReproducible(ext),
      size,
    };
  }

  // Abre el archivo para enviarlo por partes. El controlador ya autorizo el
  // acceso con obtenerParaEnvio; esto es solo el acceso al disco.
  abrirFlujo(storageKey: string, rango?: { inicio: number; fin: number }) {
    return this.storage.abrirFlujo(storageKey, rango);
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
      throw new NotFoundException('Postulación no encontrada');
    }
    return post;
  }

  // carga la postulacion y verifica que pertenece a la convocatoria del path (evita IDOR)
  private async getPostulacionEnConvocatoria(postulacionId: number, convocatoriaId: number) {
    const post = await this.postulacionRepo.findById(postulacionId);
    if (!post || post.convocatoriaId !== convocatoriaId) {
      throw new NotFoundException('Postulación no encontrada');
    }
    return post;
  }

  private async verificarPropietario(empresaId: number, userId: number): Promise<void> {
    const userEmpresaId = await this.postulacionRepo.getEmpresaIdByUsuarioId(userId);
    if (userEmpresaId !== empresaId) {
      throw new ForbiddenException('No tienes acceso a esta postulación');
    }
  }

  private verificarEditable(estado: string): void {
    if (estado !== EstadoPostulacion.BORRADOR && estado !== EstadoPostulacion.OBSERVADO) {
      throw new ConflictException('No se pueden modificar archivos en el estado actual');
    }
  }

  // Verifica que el evaluador siga en el jurado de la categoria y tenga la
  // postulacion asignada. Se exigen los dos niveles: sin el primero, un
  // evaluador retirado del jurado seguia descargando los archivos adjuntos.
  private async verificarAccesoEvaluador(postulacionId: number, userId: number): Promise<void> {
    const post = await this.getPostulacionOrFail(postulacionId);
    if (!ESTADOS_EVALUABLES.includes(post.estado as EstadoPostulacion)) {
      throw new ForbiddenException('La postulación no está en estado de evaluación');
    }
    const enJurado = await this.categoriaService.esEvaluadorDeCategoria(post.categoriaId, userId);
    if (!enJurado) {
      throw new ForbiddenException('No estás asignado como evaluador a esta categoría');
    }
    const esAsignado = await this.evaluacionRepo.isAsignadoAPostulacion(postulacionId, userId);
    if (!esAsignado) {
      throw new ForbiddenException('No estás asignado para evaluar esta postulación');
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
