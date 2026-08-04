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
import type {
  SaveCalificacionDto,
  DevolverCalificacionDto,
  AssignEvaluadorPostulacionDto,
  CerrarEvaluacionResponse,
  RepartirEvaluadoresDto,
  RepartirEvaluadoresResponse,
} from '@superstars/shared';
import { EvaluacionRepository } from './evaluacion.repository';
import { CalificacionStateMachine } from './calificacion.state-machine';
import { CategoriaService } from '../categoria/categoria.service';

// estados en los que el jurado puede ver una propuesta. Antes de llegar a
// evaluacion la propuesta es material privado del postulante.
const ESTADOS_VISIBLES_EVALUADOR = [
  EstadoPostulacion.EN_EVALUACION,
  EstadoPostulacion.CALIFICADO,
  EstadoPostulacion.GANADOR,
  EstadoPostulacion.NO_SELECCIONADO,
];

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
    // se exigen los dos niveles: seguir en el jurado de la categoria y tener la
    // postulacion asignada. Sin el primero, un evaluador retirado del jurado
    // seguia leyendo las propuestas que ya tenia asignadas.
    await this.verificarPoolCategoria(categoriaId, evaluadorId);
    await this.verificarAsignacionPostulacion(postulacionId, evaluadorId);

    const post = await this.evaluacionRepo.findPostulacionById(postulacionId);
    if (!post) {
      throw new NotFoundException('Postulación no encontrada');
    }
    if (post.categoriaId !== categoriaId) {
      throw new ForbiddenException('La postulación no pertenece a esta categoría');
    }
    // el jurado solo ve propuestas que llegaron a evaluacion; nunca un borrador
    // ni una propuesta enviada que el responsable todavia no aprobo
    if (!ESTADOS_VISIBLES_EVALUADOR.includes(post.estado as EstadoPostulacion)) {
      throw new ForbiddenException('Esta propuesta no está disponible para evaluar');
    }

    // obtener calificacion del evaluador si existe
    const calif = await this.evaluacionRepo.findCalificacion(postulacionId, evaluadorId);
    const detalles = calif
      ? await this.evaluacionRepo.findDetalles(calif.id)
      : [];
    const empresaRazonSocial = await this.evaluacionRepo.findEmpresaRazonSocial(post.empresaId);

    return {
      postulacion: { ...post, empresaRazonSocial },
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
    // debe seguir en el jurado de la categoria, no solo tener la asignacion
    await this.verificarPoolCategoria(post.categoriaId, evaluadorId);
    if (post.estado !== EstadoPostulacion.EN_EVALUACION) {
      throw new ConflictException(this.mensajeEvaluacionCerrada(post.estado));
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
    // debe seguir en el jurado de la categoria, no solo tener la asignacion
    await this.verificarPoolCategoria(post.categoriaId, evaluadorId);
    // si la evaluacion ya se cerro, tampoco se puede enviar una nota a medias
    if (post.estado !== EstadoPostulacion.EN_EVALUACION) {
      throw new ConflictException(this.mensajeEvaluacionCerrada(post.estado));
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
        `No se puede aprobar una calificación en estado "${calif.estado}"`,
      );
    }

    // Aprobar solo aprueba. El cierre de la evaluacion de la postulacion (y con
    // el, el calculo del puntaje) es una accion aparte y explicita del
    // responsable: ver cerrarEvaluacion(). Antes se cerraba aqui de forma
    // automatica contando solo las calificaciones existentes, lo que dejaba
    // fuera a los jurados que aun no habian empezado y los bloqueaba sin aviso.
    return this.evaluacionRepo.updateCalificacion(calificacionId, {
      estado: EstadoCalificacion.APROBADO,
    });
  }

  // devolver calificacion al evaluador
  async devolverCalificacion(convocatoriaId: number, calificacionId: number, dto: DevolverCalificacionDto) {
    const calif = await this.verificarCalificacionEnConvocatoria(calificacionId, convocatoriaId);

    if (!this.stateMachine.canTransition(calif.estado, 'devolver')) {
      throw new ConflictException(
        `No se puede devolver una calificación en estado "${calif.estado}"`,
      );
    }

    return this.evaluacionRepo.updateCalificacion(calificacionId, {
      estado: EstadoCalificacion.DEVUELTO,
      comentarioResponsable: dto.comentarioResponsable,
    });
  }

  // Cerrar la evaluacion de una postulacion (en_evaluacion -> calificado).
  // Es la accion explicita que reemplaza al viejo cierre automatico: el
  // responsable decide dar por terminada la evaluacion y el puntaje se calcula
  // con las notas aprobadas. Los jurados que no entregaron quedan fuera.
  async cerrarEvaluacion(
    convocatoriaId: number,
    postulacionId: number,
  ): Promise<CerrarEvaluacionResponse> {
    const post = await this.verificarPostulacionEnConvocatoria(postulacionId, convocatoriaId);

    if (post.estado !== EstadoPostulacion.EN_EVALUACION) {
      throw new ConflictException(
        `Solo se puede cerrar la evaluación de una postulación que está en evaluación. Esta postulación está en estado "${post.estado}".`,
      );
    }

    const resumen = await this.evaluacionRepo.resumenParaCierre(postulacionId);

    // Las notas ya enviadas tienen que resolverse antes: cerrar sin revisarlas
    // descartaria trabajo que el jurado si entrego.
    if (resumen.pendientesDeRevision > 0) {
      throw new BadRequestException(
        `Hay ${resumen.pendientesDeRevision} calificación(es) enviadas que todavía no revisaste. Apruébalas o devuélvelas antes de cerrar la evaluación.`,
      );
    }

    // sin ninguna nota aprobada no hay con que calcular un puntaje
    if (resumen.aprobadas === 0 || resumen.promedioAprobadas === null) {
      throw new BadRequestException(
        'No se puede cerrar la evaluación porque no hay ninguna calificación aprobada. Si esta postulación no se pudo evaluar, recházala indicando el motivo.',
      );
    }

    const puntajeFinal = resumen.promedioAprobadas.toFixed(2);
    const actualizada = await this.evaluacionRepo.updatePostulacionPuntaje(
      postulacionId,
      puntajeFinal,
      EstadoPostulacion.CALIFICADO,
    );
    if (!actualizada) {
      throw new ConflictException('La postulación fue modificada por otro proceso');
    }

    return {
      postulacionId,
      puntajeFinal,
      calificacionesConsideradas: resumen.aprobadas,
      evaluadoresSinEntregar: resumen.evaluadoresAsignados - resumen.aprobadas,
    };
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

    // solo se asignan jurados a propuestas que ya fueron aprobadas para evaluar.
    // Sin este filtro se podia asignar un jurado a un borrador sin enviar, y el
    // jurado terminaba leyendo datos que el postulante todavia no habia entregado.
    if (post.estado !== EstadoPostulacion.EN_EVALUACION) {
      throw new BadRequestException(
        'Solo se pueden asignar evaluadores a postulaciones aprobadas para evaluación. Primero apruébala desde la revisión.',
      );
    }

    // coherencia: solo se asigna (nivel 2) si el evaluador esta en el pool (nivel 1) de la categoria
    const enPool = await this.categoriaService.esEvaluadorDeCategoria(post.categoriaId, dto.evaluadorId);
    if (!enPool) {
      throw new BadRequestException(
        'El evaluador no está en el jurado de esta categoría. Primero agrégalo al jurado.',
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

  // Reparto automatico de jurados entre las propuestas de una categoria.
  // Se puede volver a ejecutar: respeta lo ya asignado (a mano o en un reparto
  // anterior) y solo completa lo que falta, contando la carga previa para que
  // el resultado quede parejo igual.
  async repartirEvaluadores(
    convocatoriaId: number,
    categoriaId: number,
    dto: RepartirEvaluadoresDto,
    asignadoPor: number,
  ): Promise<RepartirEvaluadoresResponse> {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const pool = await this.categoriaService.getPoolEvaluadores(categoriaId);
    if (pool.length === 0) {
      throw new BadRequestException(
        'Esta categoría todavía no tiene jurados. Agrega evaluadores al jurado antes de repartir.',
      );
    }

    const porPropuesta = dto.evaluadoresPorPostulacion;
    if (porPropuesta > pool.length) {
      throw new BadRequestException(
        `Pediste ${porPropuesta} evaluadores por propuesta, pero el jurado de esta categoría tiene ${pool.length}. Agrega más evaluadores al jurado o pide un número menor.`,
      );
    }

    const postulaciones = await this.evaluacionRepo.findPostulacionesEnEvaluacion(categoriaId);
    if (postulaciones.length === 0) {
      throw new BadRequestException(
        'No hay postulaciones en evaluación en esta categoría. Aprueba las postulaciones antes de repartir el jurado.',
      );
    }

    // punto de partida: lo que ya esta asignado
    const ids = postulaciones.map(p => p.id);
    const existentes = await this.evaluacionRepo.findAsignacionesDePostulaciones(ids);

    const carga = new Map<number, number>(pool.map(e => [e.evaluadorId, 0]));
    const asignadosPorPropuesta = new Map<number, Set<number>>(ids.map(id => [id, new Set<number>()]));
    for (const a of existentes) {
      asignadosPorPropuesta.get(a.postulacionId)?.add(a.evaluadorId);
      // solo cuenta la carga de quienes siguen en el jurado
      if (carga.has(a.evaluadorId)) {
        carga.set(a.evaluadorId, carga.get(a.evaluadorId)! + 1);
      }
    }

    // Se baraja el jurado una vez y despues se ordena por carga. El orden de
    // JavaScript es estable, asi que entre jurados con la misma carga se
    // conserva el orden barajado: reparto parejo, sin patron repetitivo.
    const idsPool = this.barajar(pool.map(e => e.evaluadorId));

    const nuevas: { postulacionId: number; evaluadorId: number; asignadoPor: number }[] = [];
    let postulacionesYaCompletas = 0;
    let postulacionesAfectadas = 0;

    for (const p of postulaciones) {
      const yaAsignados = asignadosPorPropuesta.get(p.id)!;
      const faltan = porPropuesta - yaAsignados.size;
      if (faltan <= 0) {
        postulacionesYaCompletas++;
        continue;
      }

      const candidatos = idsPool
        .filter(id => !yaAsignados.has(id))
        .sort((a, b) => carga.get(a)! - carga.get(b)!)
        .slice(0, faltan);

      for (const evaluadorId of candidatos) {
        nuevas.push({ postulacionId: p.id, evaluadorId, asignadoPor });
        carga.set(evaluadorId, carga.get(evaluadorId)! + 1);
      }
      if (candidatos.length > 0) postulacionesAfectadas++;
    }

    const asignacionesCreadas = await this.evaluacionRepo.crearAsignacionesEnLote(nuevas);

    return {
      asignacionesCreadas,
      postulacionesAfectadas,
      postulacionesYaCompletas,
      evaluadoresPorPostulacion: porPropuesta,
      cargaPorEvaluador: pool.map(e => ({
        evaluadorId: e.evaluadorId,
        nombre: e.nombre,
        totalAsignadas: carga.get(e.evaluadorId) ?? 0,
      })),
    };
  }

  // mezcla al azar (Fisher-Yates) para que el desempate por carga no siga
  // siempre el mismo orden de jurados
  private barajar(ids: number[]): number[] {
    const copia = [...ids];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
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

  // Explica al jurado por que ya no puede cargar su nota, en lugar de
  // devolverle el nombre tecnico del estado.
  private mensajeEvaluacionCerrada(estado: string): string {
    if (estado === EstadoPostulacion.CALIFICADO
      || estado === EstadoPostulacion.GANADOR
      || estado === EstadoPostulacion.NO_SELECCIONADO) {
      return 'La evaluación de esta propuesta ya fue cerrada por el responsable, así que no se pueden registrar más calificaciones. Si necesitas cargar la tuya, comunícate con la persona responsable de la convocatoria.';
    }
    return 'Esta propuesta no está disponible para evaluar en este momento.';
  }

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

}
