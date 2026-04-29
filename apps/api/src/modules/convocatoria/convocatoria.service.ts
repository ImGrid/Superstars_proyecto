import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type {
  CreateConvocatoriaDto,
  UpdateConvocatoriaDto,
  UpdateFechasConvocatoriaDto,
  ListConvocatoriasQueryDto,
  SeleccionarGanadoresDto,
  PaginatedResponse,
  AuthUser,
} from '@superstars/shared';
import { RolUsuario, EstadoConvocatoria } from '@superstars/shared';
import { ConvocatoriaRepository } from './convocatoria.repository';
import { ConvocatoriaStateMachine } from './convocatoria.state-machine';
import type { ConvocatoriaEvent } from './convocatoria.state-machine';
import { RubricaService } from '../rubrica/rubrica.service';

@Injectable()
export class ConvocatoriaService {
  private readonly stateMachine = new ConvocatoriaStateMachine();

  constructor(
    private readonly convocatoriaRepo: ConvocatoriaRepository,
    @Inject(forwardRef(() => RubricaService))
    private readonly rubricaService: RubricaService,
  ) {}

  // --- CRUD ---

  async create(dto: CreateConvocatoriaDto, user: AuthUser) {
    const created = await this.convocatoriaRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      bases: dto.bases,
      fechaInicioPostulacion: dto.fechaInicioPostulacion,
      fechaCierrePostulacion: dto.fechaCierrePostulacion,
      fechaAnuncioGanadores: dto.fechaAnuncioGanadores,
      monto: dto.monto.toString(),
      numeroGanadores: dto.numeroGanadores,
      topNSistema: dto.topNSistema,
      departamentos: dto.departamentos,
      createdBy: user.id,
    });

    // Si un responsable crea la convocatoria, auto-asignarse
    if (user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA) {
      await this.convocatoriaRepo.addResponsable(created.id, user.id);
    }

    return created;
  }

  async findById(id: number, user?: AuthUser) {
    const c = await this.convocatoriaRepo.findById(id);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');

    // Proponente no puede ver convocatorias en borrador
    if (user?.rol === RolUsuario.PROPONENTE && c.estado === EstadoConvocatoria.BORRADOR) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    return c;
  }

  async findAll(query: ListConvocatoriasQueryDto, user: AuthUser): Promise<PaginatedResponse<unknown>> {
    const { page, limit } = query;

    let result: { data: unknown[]; total: number };

    if (user.rol === RolUsuario.PROPONENTE) {
      // Proponente ve todas las convocatorias excepto borradores
      result = await this.convocatoriaRepo.findAllExcludeEstado(query, EstadoConvocatoria.BORRADOR);
    } else if (user.rol === RolUsuario.ADMINISTRADOR) {
      result = await this.convocatoriaRepo.findAll(query);
    } else {
      // Responsable solo ve las asignadas
      result = await this.convocatoriaRepo.findAllByResponsable(user.id, query);
    }

    const totalPages = Math.ceil(result.total / limit);
    return { data: result.data, total: result.total, page, limit, totalPages };
  }

  async update(id: number, dto: UpdateConvocatoriaDto) {
    // Solo se puede editar en borrador
    const c = await this.convocatoriaRepo.findById(id);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');
    if (c.estado !== EstadoConvocatoria.BORRADOR) {
      throw new ConflictException('Solo se puede editar una convocatoria en estado borrador');
    }

    // Convertir monto a string si viene en el dto
    const data: Record<string, unknown> = { ...dto };
    if (dto.monto !== undefined) {
      data.monto = dto.monto.toString();
    }

    const updated = await this.convocatoriaRepo.update(id, data);
    if (!updated) throw new NotFoundException('Convocatoria no encontrada');
    return updated;
  }

  async delete(id: number) {
    const c = await this.convocatoriaRepo.findById(id);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');
    if (c.estado !== EstadoConvocatoria.BORRADOR) {
      throw new ConflictException('Solo se puede eliminar una convocatoria en estado borrador');
    }

    const deleted = await this.convocatoriaRepo.delete(id);
    if (!deleted) throw new NotFoundException('Convocatoria no encontrada');
  }

  // --- Transiciones de estado ---

  // Verificar requisitos para publicar (devuelve lista de errores)
  async canPublicar(convocatoriaId: number): Promise<string[]> {
    const errors: string[] = [];

    const c = await this.convocatoriaRepo.findById(convocatoriaId);
    if (!c) {
      return ['Convocatoria no encontrada'];
    }

    if (!this.stateMachine.canTransition(c.estado, 'publicar')) {
      errors.push(`No se puede publicar desde el estado "${c.estado}"`);
      return errors;
    }

    // Debe tener al menos 1 responsable
    const numResponsables = await this.convocatoriaRepo.countResponsables(convocatoriaId);
    if (numResponsables === 0) {
      errors.push('La convocatoria debe tener al menos un responsable asignado');
    }

    // Debe tener formulario dinamico
    const hasForm = await this.convocatoriaRepo.hasFormulario(convocatoriaId);
    if (!hasForm) {
      errors.push('La convocatoria debe tener un formulario de postulacion configurado');
    }

    // Validar rubrica completa (6 reglas)
    const rubricaResult = await this.rubricaService.validar(convocatoriaId);
    if (!rubricaResult.completa) {
      errors.push(...rubricaResult.errores);
    }

    return errors;
  }

  async publicar(convocatoriaId: number) {
    const errors = await this.canPublicar(convocatoriaId);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const updated = await this.convocatoriaRepo.updateEstado(
      convocatoriaId,
      EstadoConvocatoria.BORRADOR,
      EstadoConvocatoria.PUBLICADO,
    );

    if (!updated) {
      throw new ConflictException('No se pudo publicar la convocatoria (estado ya cambio)');
    }

    return updated;
  }

  async cerrar(convocatoriaId: number) {
    return this.executeTransition(convocatoriaId, 'cerrar');
  }

  async iniciarEvaluacion(convocatoriaId: number) {
    return this.executeTransition(convocatoriaId, 'iniciar_evaluacion');
  }

  // Seleccionar ganadores (batch: en_evaluacion -> resultados_listos)
  async seleccionarGanadores(convocatoriaId: number, dto: SeleccionarGanadoresDto) {
    const c = await this.ensureExists(convocatoriaId);

    if (!this.stateMachine.canTransition(c.estado, 'seleccionar_ganadores')) {
      throw new ConflictException(
        `No se puede seleccionar ganadores desde el estado "${c.estado}"`,
      );
    }

    // validar que no haya postulaciones pendientes de evaluacion
    const pendientes = await this.convocatoriaRepo.countPostulacionesPendientes(convocatoriaId);
    if (pendientes > 0) {
      throw new BadRequestException(
        `Hay ${pendientes} postulacion(es) aun en evaluacion. Todas deben estar calificadas.`,
      );
    }

    // validar que no haya calificaciones sin aprobar
    const califNoAprobadas = await this.convocatoriaRepo.countCalificacionesNoAprobadas(convocatoriaId);
    if (califNoAprobadas > 0) {
      throw new BadRequestException(
        `Hay ${califNoAprobadas} calificacion(es) no aprobadas. Todas deben estar aprobadas.`,
      );
    }

    // verificar que las postulaciones calificadas existen
    const calificadas = await this.convocatoriaRepo.findPostulacionesCalificadas(convocatoriaId);
    if (calificadas.length === 0) {
      throw new BadRequestException('No hay postulaciones calificadas para seleccionar ganadores');
    }

    // validar que los IDs de ganadores pertenecen a postulaciones calificadas de la convocatoria
    const idsCalificadas = new Set(calificadas.map(p => p.id));
    const idsInvalidos = dto.ganadorIds.filter((id: number) => !idsCalificadas.has(id));
    if (idsInvalidos.length > 0) {
      throw new BadRequestException(
        `Las postulaciones [${idsInvalidos.join(', ')}] no estan calificadas o no pertenecen a esta convocatoria`,
      );
    }

    // validar cantidad de ganadores vs numero_ganadores de la convocatoria
    if (dto.ganadorIds.length > c.numeroGanadores) {
      throw new BadRequestException(
        `Se seleccionaron ${dto.ganadorIds.length} ganadores pero el maximo permitido es ${c.numeroGanadores}`,
      );
    }

    // ejecutar todo en transaccion
    // 1. calcular ranking
    await this.convocatoriaRepo.calcularRanking(convocatoriaId);
    // 2. marcar ganadores
    await this.convocatoriaRepo.marcarGanadores(dto.ganadorIds);
    // 3. marcar no seleccionados
    await this.convocatoriaRepo.marcarNoSeleccionados(convocatoriaId, dto.ganadorIds);
    // 4. transicionar convocatoria a resultados_listos
    const updated = await this.convocatoriaRepo.updateEstado(
      convocatoriaId,
      EstadoConvocatoria.EN_EVALUACION,
      EstadoConvocatoria.RESULTADOS_LISTOS,
    );

    if (!updated) {
      throw new ConflictException('No se pudo cambiar el estado (concurrencia detectada)');
    }

    return updated;
  }

  // Verificar requisitos para publicar resultados
  async canFinalizar(convocatoriaId: number): Promise<string[]> {
    const errors: string[] = [];

    const c = await this.convocatoriaRepo.findById(convocatoriaId);
    if (!c) {
      return ['Convocatoria no encontrada'];
    }

    if (!this.stateMachine.canTransition(c.estado, 'publicar_resultados')) {
      errors.push(`No se puede publicar resultados desde el estado "${c.estado}"`);
      return errors;
    }

    // debe haber al menos 1 ganador
    const numGanadores = await this.convocatoriaRepo.countGanadores(convocatoriaId);
    if (numGanadores === 0) {
      errors.push('No se han seleccionado ganadores');
    }

    // no deben quedar postulaciones calificadas sin decidir
    const sinDecidir = await this.convocatoriaRepo.countCalificadasSinDecidir(convocatoriaId);
    if (sinDecidir > 0) {
      errors.push(`Hay ${sinDecidir} postulacion(es) calificadas sin decidir (ganador/no seleccionado)`);
    }

    return errors;
  }

  // Publicar resultados (resultados_listos -> finalizado)
  async publicarResultados(convocatoriaId: number) {
    const errors = await this.canFinalizar(convocatoriaId);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const updated = await this.convocatoriaRepo.updateEstado(
      convocatoriaId,
      EstadoConvocatoria.RESULTADOS_LISTOS,
      EstadoConvocatoria.FINALIZADO,
    );

    if (!updated) {
      throw new ConflictException('No se pudo cambiar el estado (concurrencia detectada)');
    }

    // marcar timestamp de publicacion
    await this.convocatoriaRepo.setFechaPublicacionResultados(convocatoriaId);

    // retornar con el timestamp actualizado
    return this.convocatoriaRepo.findById(convocatoriaId);
  }

  // --- Responsables ---

  async findResponsables(convocatoriaId: number) {
    await this.ensureExists(convocatoriaId);
    return this.convocatoriaRepo.findResponsables(convocatoriaId);
  }

  async addResponsable(convocatoriaId: number, usuarioId: number) {
    await this.ensureExists(convocatoriaId);

    try {
      return await this.convocatoriaRepo.addResponsable(convocatoriaId, usuarioId);
    } catch (error: unknown) {
      // Drizzle 0.45 envuelve el error de PG en DrizzleQueryError.cause
      const pgCode = (error as any)?.cause?.code ?? (error as any)?.code;
      // UNIQUE violation: ya es responsable
      if (pgCode === '23505') {
        throw new ConflictException('El usuario ya es responsable de esta convocatoria');
      }
      // FK violation: usuario no existe
      if (pgCode === '23503') {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }

  async removeResponsable(convocatoriaId: number, usuarioId: number) {
    await this.ensureExists(convocatoriaId);
    const removed = await this.convocatoriaRepo.removeResponsable(convocatoriaId, usuarioId);
    if (!removed) {
      throw new NotFoundException('El usuario no es responsable de esta convocatoria');
    }
  }

  // --- Evaluadores de la convocatoria ---

  async findEvaluadores(convocatoriaId: number) {
    await this.ensureExists(convocatoriaId);
    return this.convocatoriaRepo.findEvaluadores(convocatoriaId);
  }

  async addEvaluador(convocatoriaId: number, evaluadorId: number, asignadoPor: number) {
    await this.ensureExists(convocatoriaId);

    try {
      return await this.convocatoriaRepo.addEvaluador(convocatoriaId, evaluadorId, asignadoPor);
    } catch (error: unknown) {
      const pgCode = (error as any)?.cause?.code ?? (error as any)?.code;
      // UNIQUE violation: ya es evaluador
      if (pgCode === '23505') {
        throw new ConflictException('El usuario ya es evaluador de esta convocatoria');
      }
      // FK violation: usuario no existe
      if (pgCode === '23503') {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }

  async removeEvaluador(convocatoriaId: number, evaluadorId: number) {
    await this.ensureExists(convocatoriaId);
    const removed = await this.convocatoriaRepo.removeEvaluador(convocatoriaId, evaluadorId);
    if (!removed) {
      throw new NotFoundException('El usuario no es evaluador de esta convocatoria');
    }
  }

  // --- Modificar fechas (convocatoria publicada o posterior, no finalizada) ---

  async updateFechas(id: number, dto: UpdateFechasConvocatoriaDto) {
    const c = await this.convocatoriaRepo.findById(id);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');

    // solo permitido en publicado, cerrado, en_evaluacion o resultados_listos
    const estadosPermitidos = [
      EstadoConvocatoria.PUBLICADO,
      EstadoConvocatoria.CERRADO,
      EstadoConvocatoria.EN_EVALUACION,
      EstadoConvocatoria.RESULTADOS_LISTOS,
    ];
    if (!estadosPermitidos.includes(c.estado as EstadoConvocatoria)) {
      throw new ConflictException(
        'Solo se pueden modificar fechas en convocatorias publicadas, cerradas o en evaluacion',
      );
    }

    const data: Record<string, unknown> = {};

    // fecha cierre efectiva: solo modificable si la convocatoria esta publicada
    if (dto.fechaCierreEfectiva !== undefined) {
      if (c.estado !== EstadoConvocatoria.PUBLICADO) {
        throw new ConflictException(
          'La fecha de cierre solo se puede extender cuando la convocatoria esta publicada',
        );
      }
      if (dto.fechaCierreEfectiva !== null && dto.fechaCierreEfectiva < c.fechaCierrePostulacion) {
        throw new BadRequestException(
          'La fecha de cierre efectiva debe ser igual o posterior a la fecha de cierre original',
        );
      }
      data.fechaCierreEfectiva = dto.fechaCierreEfectiva;
    }

    // fecha anuncio ganadores: modificable en publicado, cerrado o en_evaluacion
    if (dto.fechaAnuncioGanadores !== undefined) {
      data.fechaAnuncioGanadores = dto.fechaAnuncioGanadores;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No se proporcionaron fechas para actualizar');
    }

    const updated = await this.convocatoriaRepo.update(id, data);
    if (!updated) throw new NotFoundException('Convocatoria no encontrada');
    return updated;
  }

  // --- Auto-cierre de convocatorias vencidas ---

  async cerrarVencidos(): Promise<number> {
    return this.convocatoriaRepo.cerrarVencidos();
  }

  // --- Resultados: vista admin/responsable ---

  // resumen estadistico de convocatorias en evaluacion/resultados_listos/finalizado
  async getResumenResultados(user: AuthUser) {
    const usuarioId = user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA ? user.id : undefined;
    const rows = await this.convocatoriaRepo.findResumenResultados(usuarioId);

    return rows.map(row => ({
      ...row,
      promedioCalificadas: row.promedioCalificadas !== null ? Number(row.promedioCalificadas) : null,
    }));
  }

  // ranking completo de postulaciones de una convocatoria
  async getRankingConvocatoria(convocatoriaId: number) {
    const c = await this.convocatoriaRepo.findById(convocatoriaId);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');

    const rows = await this.convocatoriaRepo.findRankingPostulaciones(convocatoriaId);

    // calcular estadisticas de puntajes
    const puntajes = rows
      .map(r => r.puntajeFinal ? Number(r.puntajeFinal) : null)
      .filter((p): p is number => p !== null);

    const promedioCalificadas = puntajes.length > 0
      ? Math.round((puntajes.reduce((a, b) => a + b, 0) / puntajes.length) * 100) / 100
      : null;
    const maxPuntaje = puntajes.length > 0 ? Math.max(...puntajes) : null;
    const minPuntaje = puntajes.length > 0 ? Math.min(...puntajes) : null;

    return {
      id: c.id,
      nombre: c.nombre,
      estado: c.estado,
      monto: c.monto,
      numeroGanadores: c.numeroGanadores,
      totalCalificadas: rows.length,
      promedioCalificadas,
      maxPuntaje,
      minPuntaje,
      ranking: rows.map(r => ({
        postulacionId: r.postulacionId,
        empresaNombre: r.empresaNombre,
        puntajeFinal: r.puntajeFinal ? Number(r.puntajeFinal) : null,
        posicionFinal: r.posicionFinal,
        estado: r.estado,
        fechaEnvio: r.fechaEnvio,
      })),
    };
  }

  // --- Helpers privados ---

  private async ensureExists(convocatoriaId: number) {
    const c = await this.convocatoriaRepo.findById(convocatoriaId);
    if (!c) throw new NotFoundException('Convocatoria no encontrada');
    return c;
  }

  private async executeTransition(convocatoriaId: number, event: ConvocatoriaEvent) {
    const c = await this.ensureExists(convocatoriaId);

    if (!this.stateMachine.canTransition(c.estado, event)) {
      throw new ConflictException(
        `No se puede ejecutar "${event}" desde el estado "${c.estado}"`,
      );
    }

    const newEstado = this.stateMachine.transition(c.estado, event);
    const updated = await this.convocatoriaRepo.updateEstado(c.id, c.estado, newEstado);

    if (!updated) {
      throw new ConflictException('No se pudo cambiar el estado (concurrencia detectada)');
    }

    return updated;
  }
}
