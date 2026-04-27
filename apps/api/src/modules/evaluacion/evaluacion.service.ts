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

@Injectable()
export class EvaluacionService {
  private readonly stateMachine = new CalificacionStateMachine();

  constructor(private readonly evaluacionRepo: EvaluacionRepository) {}

  // --- Evaluador ---

  // concursos asignados al evaluador
  async findMisConcursos(evaluadorId: number) {
    return this.evaluacionRepo.findConcursosDelEvaluador(evaluadorId);
  }

  // postulaciones evaluables de un concurso
  async findPostulacionesEvaluables(concursoId: number, evaluadorId: number) {
    await this.verificarAccesoEvaluador(concursoId, evaluadorId);
    return this.evaluacionRepo.findPostulacionesEvaluables(concursoId, evaluadorId);
  }

  // detalle de postulacion (para que el evaluador vea la propuesta)
  async findPostulacionDetalle(concursoId: number, postulacionId: number, evaluadorId: number) {
    await this.verificarAccesoEvaluador(concursoId, evaluadorId);
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.concursoId !== concursoId) {
      throw new ForbiddenException('La postulación no pertenece a este concurso');
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
    concursoId: number,
    postulacionId: number,
    evaluadorId: number,
    dto: SaveCalificacionDto,
  ) {
    await this.verificarAccesoEvaluador(concursoId, evaluadorId);
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.concursoId !== concursoId) {
      throw new ForbiddenException('La postulación no pertenece a este concurso');
    }
    if (post.estado !== EstadoPostulacion.EN_EVALUACION) {
      throw new ConflictException('La postulación no está en estado de evaluación');
    }

    // validar puntajes contra rangos de la rubrica
    await this.validarRangosPuntaje(concursoId, dto.detalles);

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
  async completarCalificacion(
    concursoId: number,
    postulacionId: number,
    evaluadorId: number,
  ) {
    await this.verificarAccesoEvaluador(concursoId, evaluadorId);
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const calif = await this.evaluacionRepo.findCalificacion(postulacionId, evaluadorId);
    if (!calif) {
      throw new NotFoundException('No tienes una calificación para esta postulación');
    }

    if (!this.stateMachine.canTransition(calif.estado, 'completar')) {
      throw new ConflictException(
        `No se puede completar una calificación en estado "${calif.estado}"`,
      );
    }

    // verificar que todos los sub-criterios tienen puntaje
    const detalles = await this.evaluacionRepo.findDetalles(calif.id);
    const totalSubCriterios = await this.evaluacionRepo.countSubCriteriosByConcurso(concursoId);

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

  // helper publico para obtener concursoId desde postulacionId
  async findPostulacionParaConcursoId(postulacionId: number) {
    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    return post;
  }

  // --- Responsable / Admin ---

  // listar calificaciones de un concurso
  async findCalificacionesByConcurso(concursoId: number) {
    return this.evaluacionRepo.findCalificacionesByConcurso(concursoId);
  }

  // detalle de una calificacion (para revision del responsable)
  async findCalificacionDetalle(calificacionId: number) {
    const result = await this.evaluacionRepo.findCalificacionConDetalle(calificacionId);
    if (!result) {
      throw new NotFoundException('Calificación no encontrada');
    }
    return result;
  }

  // aprobar calificacion
  async aprobarCalificacion(calificacionId: number) {
    const calif = await this.evaluacionRepo.findCalificacionById(calificacionId);
    if (!calif) {
      throw new NotFoundException('Calificación no encontrada');
    }

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
  async devolverCalificacion(calificacionId: number, dto: DevolverCalificacionDto) {
    const calif = await this.evaluacionRepo.findCalificacionById(calificacionId);
    if (!calif) {
      throw new NotFoundException('Calificación no encontrada');
    }

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
  async findAsignacionesByPostulacion(postulacionId: number) {
    return this.evaluacionRepo.findAsignacionesByPostulacion(postulacionId);
  }

  // asignar evaluador a una postulacion
  async assignEvaluadorToPostulacion(
    concursoId: number,
    postulacionId: number,
    dto: AssignEvaluadorPostulacionDto,
    asignadoPor: number,
  ) {
    // verificar que la postulacion existe y pertenece al concurso
    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.concursoId !== concursoId) {
      throw new ForbiddenException('La postulación no pertenece a este concurso');
    }

    // verificar que el evaluador pertenece al pool del concurso
    const enPool = await this.evaluacionRepo.isEvaluadorDelConcurso(concursoId, dto.evaluadorId);
    if (!enPool) {
      throw new BadRequestException(
        'El evaluador no esta asignado al concurso. Primero asignelo al concurso.',
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
  async removeAsignacion(concursoId: number, postulacionId: number, evaluadorId: number) {
    // verificar que la postulacion pertenece al concurso
    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.concursoId !== concursoId) {
      throw new ForbiddenException('La postulación no pertenece a este concurso');
    }

    const removed = await this.evaluacionRepo.removeAsignacion(postulacionId, evaluadorId);
    if (!removed) {
      throw new NotFoundException('El evaluador no está asignado a esta postulación');
    }
  }

  // --- Helpers privados ---

  private async verificarAccesoEvaluador(concursoId: number, evaluadorId: number) {
    const isAsignado = await this.evaluacionRepo.isEvaluadorDelConcurso(concursoId, evaluadorId);
    if (!isAsignado) {
      throw new ForbiddenException('No estás asignado como evaluador a este concurso');
    }
  }

  // verificar que el evaluador esta asignado a la postulacion especifica
  private async verificarAsignacionPostulacion(postulacionId: number, evaluadorId: number) {
    const isAsignado = await this.evaluacionRepo.isAsignadoAPostulacion(postulacionId, evaluadorId);
    if (!isAsignado) {
      throw new ForbiddenException('No estás asignado para evaluar esta postulación');
    }
  }

  // valida que cada puntaje este dentro del rango [basico.min, avanzado.max] del sub-criterio
  private async validarRangosPuntaje(
    concursoId: number,
    detalles: { subCriterioId: number; puntaje: number }[],
  ) {
    const niveles = await this.evaluacionRepo.findRangosPuntajeByConcurso(concursoId);

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
        errores.push(`Sub-criterio ${d.subCriterioId} no pertenece a la rubrica de este concurso`);
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
