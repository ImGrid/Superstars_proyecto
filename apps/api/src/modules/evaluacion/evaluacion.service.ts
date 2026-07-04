import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  EstadoCalificacion,
  EstadoPostulacion,
} from '@superstars/shared';
import type { SaveCalificacionDto, DevolverCalificacionDto, AssignEvaluadorPostulacionDto } from '@superstars/shared';
import { EvaluacionRepository } from './evaluacion.repository';
import { CalificacionStateMachine } from './calificacion.state-machine';
import { CategoriaService } from '../categoria/categoria.service';

@Injectable()
export class EvaluacionService {
  private readonly stateMachine = new CalificacionStateMachine();

  constructor(
    private readonly evaluacionRepo: EvaluacionRepository,
    private readonly categoriaService: CategoriaService,
  ) {}

  // --- Evaluador ---

  // categorias donde soy jurado (pool nivel 1), con el contexto de su convocatoria
  async findMisCategorias(evaluadorId: number) {
    return this.evaluacionRepo.findCategoriasDelEvaluador(evaluadorId);
  }

  // postulaciones que me asignaron (nivel 2) en una categoria de cuyo pool formo parte
  async findPostulacionesEvaluables(categoriaId: number, evaluadorId: number) {
    await this.verificarPoolCategoria(categoriaId, evaluadorId);
    return this.evaluacionRepo.findPostulacionesEvaluables(categoriaId, evaluadorId);
  }

  // detalle de postulacion (para que el evaluador vea la propuesta)
  async findPostulacionDetalle(categoriaId: number, postulacionId: number, evaluadorId: number) {
    // el gate real es la asignacion (nivel 2); la categoria da coherencia de la ruta
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.categoriaId !== categoriaId) {
      throw new ForbiddenException('La postulación no pertenece a esta categoría');
    }

    // obtener calificacion del evaluador si existe
    const calif = await this.evaluacionRepo.findCalificacion(postulacionId, evaluadorId);
    const detalles = calif
      ? await this.evaluacionRepo.findDetalles(calif.id)
      : [];

    return {
      postulacion: post,
      calificacion: calif,
      detalles,
    };
  }

  // guardar calificacion parcial (crear o actualizar)
  async saveCalificacion(
    postulacionId: number,
    evaluadorId: number,
    dto: SaveCalificacionDto,
  ) {
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.estado !== EstadoPostulacion.EN_EVALUACION) {
      throw new ConflictException('La postulación no está en estado de evaluación');
    }

    // validar puntajes contra los rangos de la rubrica de la categoria de la postulacion
    await this.validarRangosPuntaje(post.categoriaId, dto.detalles);

    let calif = await this.evaluacionRepo.findCalificacion(postulacionId, evaluadorId);

    if (!calif) {
      // crear calificacion nueva
      calif = await this.evaluacionRepo.createCalificacion({
        postulacionId,
        evaluadorId,
      });
    } else {
      // solo se puede editar en en_progreso o devuelto
      if (calif.estado !== EstadoCalificacion.EN_PROGRESO && calif.estado !== EstadoCalificacion.DEVUELTO) {
        throw new ConflictException(
          `La calificación no se puede editar en estado "${calif.estado}"`,
        );
      }
      // si estaba devuelta, volver a en_progreso
      if (calif.estado === EstadoCalificacion.DEVUELTO) {
        calif = await this.evaluacionRepo.updateCalificacion(calif.id, {
          estado: EstadoCalificacion.EN_PROGRESO,
          comentarioResponsable: null,
        });
      }
    }

    // guardar detalles (puntaje por sub-criterio)
    const detalles = dto.detalles.map(d => ({
      subCriterioId: d.subCriterioId,
      puntaje: d.puntaje.toString(),
      justificacion: d.justificacion,
    }));

    await this.evaluacionRepo.saveDetalles(calif!.id, detalles);

    // actualizar comentario general si viene
    if (dto.comentarioGeneral !== undefined) {
      await this.evaluacionRepo.updateCalificacion(calif!.id, {
        comentarioGeneral: dto.comentarioGeneral,
      });
    }

    return this.evaluacionRepo.findCalificacion(postulacionId, evaluadorId);
  }

  // completar calificacion (enviar para revision)
  async completarCalificacion(postulacionId: number, evaluadorId: number) {
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }

    const calif = await this.evaluacionRepo.findCalificacion(postulacionId, evaluadorId);
    if (!calif) {
      throw new NotFoundException('No tienes una calificación para esta postulación');
    }

    if (!this.stateMachine.canTransition(calif.estado, 'completar')) {
      throw new ConflictException(
        `No se puede completar una calificación en estado "${calif.estado}"`,
      );
    }

    // verificar que todos los sub-criterios (de la rubrica de la categoria) tienen puntaje
    const detalles = await this.evaluacionRepo.findDetalles(calif.id);
    const totalSubCriterios = await this.evaluacionRepo.countSubCriteriosByCategoria(post.categoriaId);

    if (detalles.length < totalSubCriterios) {
      throw new BadRequestException(
        `Faltan sub-criterios por calificar (${detalles.length}/${totalSubCriterios})`,
      );
    }

    // calcular puntaje total
    const puntajeTotal = detalles.reduce((sum, d) => sum + Number(d.puntaje), 0);

    return this.evaluacionRepo.updateCalificacion(calif.id, {
      estado: EstadoCalificacion.COMPLETADO,
      puntajeTotal: puntajeTotal.toString(),
    });
  }

  // --- Responsable / Admin ---

  // listar calificaciones de una convocatoria
  async findCalificacionesByConvocatoria(convocatoriaId: number) {
    return this.evaluacionRepo.findCalificacionesByConvocatoria(convocatoriaId);
  }

  // detalle de una calificacion (para revision del responsable)
  async findCalificacionDetalle(convocatoriaId: number, calificacionId: number) {
    await this.verificarCalificacionEnConvocatoria(calificacionId, convocatoriaId);
    const result = await this.evaluacionRepo.findCalificacionConDetalle(calificacionId);
    if (!result) {
      throw new NotFoundException('Calificación no encontrada');
    }
    return result;
  }

  // aprobar calificacion
  async aprobarCalificacion(convocatoriaId: number, calificacionId: number) {
    const calif = await this.verificarCalificacionEnConvocatoria(calificacionId, convocatoriaId);

    if (!this.stateMachine.canTransition(calif.estado, 'aprobar')) {
      throw new ConflictException(
        `No se puede aprobar una calificacion en estado "${calif.estado}"`,
      );
    }

    const updated = await this.evaluacionRepo.updateCalificacion(calificacionId, {
      estado: EstadoCalificacion.APROBADO,
    });

    // verificar si TODAS las calificaciones de la postulacion estan aprobadas
    await this.verificarYCalcularPuntajeFinal(calif.postulacionId);

    return updated;
  }

  // devolver calificacion al evaluador
  async devolverCalificacion(convocatoriaId: number, calificacionId: number, dto: DevolverCalificacionDto) {
    const calif = await this.verificarCalificacionEnConvocatoria(calificacionId, convocatoriaId);

    if (!this.stateMachine.canTransition(calif.estado, 'devolver')) {
      throw new ConflictException(
        `No se puede devolver una calificacion en estado "${calif.estado}"`,
      );
    }

    return this.evaluacionRepo.updateCalificacion(calificacionId, {
      estado: EstadoCalificacion.DEVUELTO,
      comentarioResponsable: dto.comentarioResponsable,
    });
  }

  // --- Asignacion de evaluadores a postulaciones (admin/responsable) ---

  // listar evaluadores asignados a una postulacion
  async findAsignacionesByPostulacion(convocatoriaId: number, postulacionId: number) {
    await this.verificarPostulacionEnConvocatoria(postulacionId, convocatoriaId);
    return this.evaluacionRepo.findAsignacionesByPostulacion(postulacionId);
  }

  // asignar evaluador a una postulacion
  async assignEvaluadorToPostulacion(
    convocatoriaId: number,
    postulacionId: number,
    dto: AssignEvaluadorPostulacionDto,
    asignadoPor: number,
  ) {
    // verificar que la postulacion existe y pertenece a la convocatoria
    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.convocatoriaId !== convocatoriaId) {
      throw new ForbiddenException('La postulación no pertenece a esta convocatoria');
    }

    // coherencia: solo se asigna (nivel 2) si el evaluador esta en el pool (nivel 1) de la categoria
    const enPool = await this.categoriaService.esEvaluadorDeCategoria(post.categoriaId, dto.evaluadorId);
    if (!enPool) {
      throw new BadRequestException(
        'El evaluador no está en el pool de esta categoría. Primero asígnalo a la categoría.',
      );
    }

    try {
      return await this.evaluacionRepo.assignEvaluadorToPostulacion({
        postulacionId,
        evaluadorId: dto.evaluadorId,
        asignadoPor,
      });
    } catch (error: any) {
      const pgCode = error?.cause?.code ?? error?.code;
      if (pgCode === '23505') {
        throw new ConflictException('El evaluador ya está asignado a esta postulación');
      }
      throw error;
    }
  }

  // desasignar evaluador de una postulacion
  async removeAsignacion(convocatoriaId: number, postulacionId: number, evaluadorId: number) {
    // verificar que la postulacion pertenece a la convocatoria
    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.convocatoriaId !== convocatoriaId) {
      throw new ForbiddenException('La postulación no pertenece a esta convocatoria');
    }

    const removed = await this.evaluacionRepo.removeAsignacion(postulacionId, evaluadorId);
    if (!removed) {
      throw new NotFoundException('El evaluador no está asignado a esta postulación');
    }
  }

  // --- Helpers privados ---

  // el evaluador debe estar en el pool (nivel 1) de la categoria
  private async verificarPoolCategoria(categoriaId: number, evaluadorId: number) {
    const enPool = await this.categoriaService.esEvaluadorDeCategoria(categoriaId, evaluadorId);
    if (!enPool) {
      throw new ForbiddenException('No estás asignado como evaluador a esta categoría');
    }
  }

  // verificar que el evaluador esta asignado a la postulacion especifica (nivel 2)
  private async verificarAsignacionPostulacion(postulacionId: number, evaluadorId: number) {
    const isAsignado = await this.evaluacionRepo.isAsignadoAPostulacion(postulacionId, evaluadorId);
    if (!isAsignado) {
      throw new ForbiddenException('No estás asignado para evaluar esta postulación');
    }
  }

  // coherencia de ruta anidada: la postulacion debe pertenecer a la convocatoria del path.
  // El guard @CheckConvocatoria valida propiedad de la convocatoria; esto evita el IDOR
  // en que un responsable de la convocatoria A opera sobre recursos de la convocatoria B.
  private async verificarPostulacionEnConvocatoria(postulacionId: number, convocatoriaId: number) {
    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post || post.convocatoriaId !== convocatoriaId) {
      throw new NotFoundException('Postulación no encontrada');
    }
    return post;
  }

  // coherencia: la calificacion, via su postulacion, debe pertenecer a la convocatoria del path
  private async verificarCalificacionEnConvocatoria(calificacionId: number, convocatoriaId: number) {
    const calif = await this.evaluacionRepo.findCalificacionById(calificacionId);
    if (!calif) {
      throw new NotFoundException('Calificación no encontrada');
    }
    const post = await this.evaluacionRepo.findPostulacionById(calif.postulacionId);
    if (!post || post.convocatoriaId !== convocatoriaId) {
      throw new NotFoundException('Calificación no encontrada');
    }
    return calif;
  }

  // valida que cada puntaje este dentro del rango [basico.min, avanzado.max] del sub-criterio (de la categoria)
  private async validarRangosPuntaje(
    categoriaId: number,
    detalles: { subCriterioId: number; puntaje: number }[],
  ) {
    const niveles = await this.evaluacionRepo.findRangosPuntajeByCategoria(categoriaId);

    // construir mapa subCriterioId -> { min, max, nombre }
    const rangos = new Map<number, { min: number; max: number; nombre: string }>();
    for (const n of niveles) {
      const existing = rangos.get(n.subCriterioId);
      const pMin = Number(n.puntajeMin);
      const pMax = Number(n.puntajeMax);
      if (!existing) {
        rangos.set(n.subCriterioId, { min: pMin, max: pMax, nombre: n.nombre });
      } else {
        if (pMin < existing.min) existing.min = pMin;
        if (pMax > existing.max) existing.max = pMax;
      }
    }

    const errores: string[] = [];
    for (const d of detalles) {
      const rango = rangos.get(d.subCriterioId);
      if (!rango) {
        errores.push(`Sub-criterio ${d.subCriterioId} no pertenece a la rúbrica de esta categoría`);
        continue;
      }
      if (d.puntaje < rango.min || d.puntaje > rango.max) {
        errores.push(
          `"${rango.nombre}": puntaje ${d.puntaje} fuera de rango (${rango.min}-${rango.max})`,
        );
      }
    }

    if (errores.length > 0) {
      throw new BadRequestException({ message: 'Puntajes fuera de rango', errors: errores });
    }
  }

  // si todas las calificaciones de una postulacion estan aprobadas, calcular promedio
  private async verificarYCalcularPuntajeFinal(postulacionId: number) {
    const stats = await this.evaluacionRepo.countCalificacionesByPostulacion(postulacionId);

    if (stats.todasAprobadas && stats.promedioPuntaje !== null) {
      await this.evaluacionRepo.updatePostulacionPuntaje(
        postulacionId,
        stats.promedioPuntaje.toFixed(2),
        EstadoPostulacion.CALIFICADO,
      );
    }
  }
}
