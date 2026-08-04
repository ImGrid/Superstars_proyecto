import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RolUsuario, EstadoConvocatoria } from '@superstars/shared';
import type {
  CreateCategoriaDto,
  UpdateCategoriaDto,
  AuthUser,
  RemoverEvaluadorResponse,
} from '@superstars/shared';
import { CategoriaRepository } from './categoria.repository';

@Injectable()
export class CategoriaService {
  constructor(private readonly categoriaRepo: CategoriaRepository) {}

  // --- Coherencia / helpers usados por otros modulos ---

  // obtiene la categoria o lanza 404
  async getByIdOrFail(categoriaId: number) {
    const categoria = await this.categoriaRepo.getById(categoriaId);
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return categoria;
  }

  // Coherencia de rutas anidadas /convocatorias/:convocatoriaId/categorias/:categoriaId/...
  // Garantiza que la categoria pertenece a la convocatoria de la ruta; si no, 404.
  async verificarPerteneceAConvocatoria(categoriaId: number, convocatoriaId: number) {
    const categoria = await this.getByIdOrFail(categoriaId);
    if (categoria.convocatoriaId !== convocatoriaId) {
      throw new NotFoundException('La categoría no pertenece a esta convocatoria');
    }
    return categoria;
  }

  // ¿el evaluador esta en el pool (nivel 1) de esta categoria?
  async esEvaluadorDeCategoria(categoriaId: number, evaluadorId: number): Promise<boolean> {
    return this.categoriaRepo.isEvaluadorDeCategoria(categoriaId, evaluadorId);
  }

  // jurado de la categoria, sin revalidar la convocatoria: lo usa el reparto
  // automatico, que ya verifico la coherencia antes de llamar
  async getPoolEvaluadores(categoriaId: number) {
    return this.categoriaRepo.findEvaluadores(categoriaId);
  }

  // --- CRUD ---

  async findByConvocatoria(convocatoriaId: number, user?: AuthUser) {
    // Proponente no ve categorias de convocatorias en borrador, y recibe la
    // version SIN conteos (no exponemos volumen de jurado ni de postulaciones).
    // Excepcion: si ya postulo, puede consultarlas, igual que la convocatoria.
    if (user?.rol === RolUsuario.PROPONENTE) {
      await this.verificarVisibleParaProponente(convocatoriaId, user.id, 'Convocatoria no encontrada');
      return this.categoriaRepo.findByConvocatoriaId(convocatoriaId);
    }
    // admin/responsable: incluye el resumen de configuracion y actividad por categoria
    return this.categoriaRepo.findByConvocatoriaIdConResumen(convocatoriaId);
  }

  async getOne(convocatoriaId: number, categoriaId: number, user?: AuthUser) {
    const categoria = await this.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    if (user?.rol === RolUsuario.PROPONENTE) {
      await this.verificarVisibleParaProponente(convocatoriaId, user.id, 'Categoría no encontrada');
    }
    return categoria;
  }

  async create(convocatoriaId: number, dto: CreateCategoriaDto) {
    await this.verificarEditable(convocatoriaId);
    return this.categoriaRepo.create({
      convocatoriaId,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      bases: dto.bases,
      monto: dto.monto.toString(),
      numeroGanadores: dto.numeroGanadores,
      topNSistema: dto.topNSistema,
      orden: dto.orden,
    });
  }

  async update(convocatoriaId: number, categoriaId: number, dto: UpdateCategoriaDto) {
    await this.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    await this.verificarEditable(convocatoriaId);

    const data: Record<string, unknown> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.bases !== undefined) data.bases = dto.bases;
    if (dto.monto !== undefined) data.monto = dto.monto.toString();
    if (dto.numeroGanadores !== undefined) data.numeroGanadores = dto.numeroGanadores;
    if (dto.topNSistema !== undefined) data.topNSistema = dto.topNSistema;
    if (dto.orden !== undefined) data.orden = dto.orden;

    if (Object.keys(data).length === 0) return this.getByIdOrFail(categoriaId);

    const updated = await this.categoriaRepo.update(categoriaId, data);
    if (!updated) throw new NotFoundException('Categoría no encontrada');
    return updated;
  }

  async delete(convocatoriaId: number, categoriaId: number) {
    await this.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    await this.verificarEditable(convocatoriaId);

    const deleted = await this.categoriaRepo.delete(categoriaId);
    if (!deleted) throw new NotFoundException('Categoría no encontrada');
  }

  // --- Pool de evaluadores (nivel 1) ---

  async findEvaluadores(convocatoriaId: number, categoriaId: number) {
    await this.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    return this.categoriaRepo.findEvaluadores(categoriaId);
  }

  async addEvaluador(convocatoriaId: number, categoriaId: number, evaluadorId: number, asignadoPor: number) {
    await this.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    try {
      return await this.categoriaRepo.addEvaluador(categoriaId, evaluadorId, asignadoPor);
    } catch (error: unknown) {
      const pgCode = (error as any)?.cause?.code ?? (error as any)?.code;
      if (pgCode === '23505') {
        throw new ConflictException('El usuario ya es evaluador de esta categoría');
      }
      if (pgCode === '23503') {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }

  // Quitar a un jurado de la categoria le retira las postulaciones asignadas y
  // elimina sus calificaciones; los puntajes afectados se recalculan sin su nota.
  // Devuelve los conteos para poder informarle el alcance al responsable.
  async removeEvaluador(
    convocatoriaId: number,
    categoriaId: number,
    evaluadorId: number,
  ): Promise<RemoverEvaluadorResponse> {
    await this.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    const resultado = await this.categoriaRepo.removeEvaluador(categoriaId, evaluadorId);
    if (!resultado.removed) {
      throw new NotFoundException('El usuario no es evaluador de esta categoría');
    }
    return {
      asignacionesEliminadas: resultado.asignacionesEliminadas,
      calificacionesEliminadas: resultado.calificacionesEliminadas,
      puntajesRecalculados: resultado.puntajesRecalculados,
    };
  }

  // --- Resolucion (consumido por ConvocatoriaService al seleccionar ganadores) ---

  // marca la categoria como resuelta (sus ganadores ya fueron seleccionados)
  async marcarGanadoresSeleccionados(categoriaId: number) {
    await this.categoriaRepo.marcarResuelta(categoriaId);
  }

  // cuantas categorias de la convocatoria siguen sin ganadores seleccionados
  async countCategoriasNoResueltas(convocatoriaId: number): Promise<number> {
    return this.categoriaRepo.countCategoriasNoResueltas(convocatoriaId);
  }

  // --- Helpers privados ---

  // El proponente no ve convocatorias en borrador, salvo que ya tenga una
  // postulacion en ellas: en ese caso tiene un interes legitimo y necesita
  // poder consultarlas desde "Mis postulaciones".
  private async verificarVisibleParaProponente(
    convocatoriaId: number,
    usuarioId: number,
    mensaje: string,
  ) {
    const estado = await this.categoriaRepo.getConvocatoriaEstado(convocatoriaId);
    if (!estado) {
      throw new NotFoundException(mensaje);
    }
    if (estado === EstadoConvocatoria.BORRADOR) {
      const yaPostulo = await this.categoriaRepo.tienePostulacionDeUsuario(convocatoriaId, usuarioId);
      if (!yaPostulo) {
        throw new NotFoundException(mensaje);
      }
    }
  }

  // Solo se pueden crear, editar o borrar categorias mientras la convocatoria
  // esta en borrador. El pool de evaluadores NO pasa por aqui a proposito: el
  // jurado se arma y se ajusta despues de publicar la convocatoria.
  private async verificarEditable(convocatoriaId: number) {
    const estado = await this.categoriaRepo.getConvocatoriaEstado(convocatoriaId);
    if (!estado) {
      throw new NotFoundException('Convocatoria no encontrada');
    }
    if (estado !== EstadoConvocatoria.BORRADOR) {
      throw new ConflictException('Solo se pueden modificar categorías en una convocatoria en borrador');
    }
  }
}
