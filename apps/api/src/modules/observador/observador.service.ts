import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ObservadorRepository } from './observador.repository';
import { AuditoriaObservadorService } from './auditoria.service';
import { STORAGE_SERVICE } from '../storage/storage.interface';
import type { StorageService } from '../storage/storage.interface';
import type { AuthUser } from '@superstars/shared';

// Servicio del rol observador (solo lectura).
//
// No expone ni un metodo de escritura: el modulo entero no tiene forma de mutar
// nada. La unica escritura que ocurre aca es el registro de auditoria, que no
// toca datos de negocio.
//
// Coherencia de rutas anidadas: toda categoria/postulacion se valida contra la
// convocatoria de la URL. Si no coinciden se responde 404 (no 403) para no
// confirmar que el id existe en otra convocatoria.
@Injectable()
export class ObservadorService {
  constructor(
    private readonly repo: ObservadorRepository,
    private readonly auditoria: AuditoriaObservadorService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // --- Convocatorias ---

  async listarConvocatorias() {
    return this.repo.findConvocatorias();
  }

  async verConvocatoria(convocatoriaId: number) {
    const c = await this.repo.findConvocatoriaById(convocatoriaId);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');
    return c;
  }

  // --- Categorias ---

  async listarCategorias(convocatoriaId: number) {
    // valida que la convocatoria exista antes de listar
    await this.verConvocatoria(convocatoriaId);
    return this.repo.findCategorias(convocatoriaId);
  }

  // --- Formulario y rubrica de una categoria ---

  async verFormulario(convocatoriaId: number, categoriaId: number) {
    await this.exigirCategoriaCoherente(convocatoriaId, categoriaId);
    const formulario = await this.repo.findFormulario(categoriaId);
    if (!formulario) {
      throw new NotFoundException('Esta categoría todavía no tiene formulario');
    }
    return formulario;
  }

  async verRubrica(convocatoriaId: number, categoriaId: number) {
    await this.exigirCategoriaCoherente(convocatoriaId, categoriaId);
    const rubrica = await this.repo.findRubrica(categoriaId);
    if (!rubrica) {
      throw new NotFoundException('Esta categoría todavía no tiene rúbrica');
    }
    return rubrica;
  }

  // --- Documentos de la convocatoria ---

  async listarDocumentos(convocatoriaId: number, categoriaId: number) {
    await this.exigirCategoriaCoherente(convocatoriaId, categoriaId);
    return this.repo.findDocumentos(categoriaId);
  }

  // Descarga. El repositorio ya excluye los de proposito jurado y exige que el
  // documento sea de esa categoria, asi que un id ajeno cae en 404.
  async descargarDocumento(
    convocatoriaId: number,
    categoriaId: number,
    documentoId: number,
    user: AuthUser,
    ip?: string,
  ) {
    await this.exigirCategoriaCoherente(convocatoriaId, categoriaId);

    const doc = await this.repo.findDocumentoDescargable(categoriaId, documentoId);
    if (!doc) throw new NotFoundException('Documento no encontrado');

    const buffer = await this.storage.download(doc.storageKey);

    await this.auditoria.registrar({
      user,
      accion: 'descargar',
      recurso: 'documento',
      recursoId: documentoId,
      convocatoriaId,
      ip,
    });

    return { buffer, mimeType: doc.mimeType, nombreOriginal: doc.nombreOriginal };
  }

  // --- Postulaciones ---

  async listarPostulaciones(convocatoriaId: number, categoriaId?: number) {
    await this.verConvocatoria(convocatoriaId);
    if (categoriaId) {
      await this.exigirCategoriaCoherente(convocatoriaId, categoriaId);
    }
    return this.repo.findPostulaciones(convocatoriaId, categoriaId);
  }

  // Detalle: se audita, porque aca se ve el contenido de la propuesta de una
  // empresa concreta.
  async verPostulacion(
    convocatoriaId: number,
    postulacionId: number,
    user: AuthUser,
    ip?: string,
  ) {
    const p = await this.repo.findPostulacionEnConvocatoria(convocatoriaId, postulacionId);
    if (!p) throw new NotFoundException('Postulación no encontrada');

    await this.auditoria.registrar({
      user,
      accion: 'ver',
      recurso: 'postulacion',
      recursoId: postulacionId,
      convocatoriaId,
      ip,
    });

    return p;
  }

  // --- Resultados ---

  async verRanking(convocatoriaId: number, categoriaId: number) {
    await this.exigirCategoriaCoherente(convocatoriaId, categoriaId);
    const filas = await this.repo.findRanking(categoriaId);
    return filas.map((f) => ({
      ...f,
      puntajeFinal: f.puntajeFinal !== null ? Number(f.puntajeFinal) : null,
    }));
  }

  async verResumen() {
    return this.repo.findResumen();
  }

  // --- Helpers ---

  // 404 si la categoria no pertenece a esa convocatoria: no se distingue entre
  // "no existe" y "existe pero es de otra convocatoria".
  private async exigirCategoriaCoherente(convocatoriaId: number, categoriaId: number) {
    const categoria = await this.repo.findCategoriaEnConvocatoria(convocatoriaId, categoriaId);
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }
}
