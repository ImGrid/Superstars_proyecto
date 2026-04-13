import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type {
  CreateConcursoDto,
  UpdateConcursoDto,
  UpdateFechasConcursoDto,
  ListConcursosQueryDto,
  SeleccionarGanadoresDto,
  PaginatedResponse,
  AuthUser,
} from '@superstars/shared';
import { RolUsuario, EstadoConcurso } from '@superstars/shared';
import { ConcursoRepository } from './concurso.repository';
import { ConcursoStateMachine } from './concurso.state-machine';
import type { ConcursoEvent } from './concurso.state-machine';
import { RubricaService } from '../rubrica/rubrica.service';

@Injectable()
export class ConcursoService {
  private readonly stateMachine = new ConcursoStateMachine();

  constructor(
    private readonly concursoRepo: ConcursoRepository,
    @Inject(forwardRef(() => RubricaService))
    private readonly rubricaService: RubricaService,
  ) {}

  // --- CRUD ---

  async create(dto: CreateConcursoDto, user: AuthUser) {
    const created = await this.concursoRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      bases: dto.bases,
      fechaInicioPostulacion: dto.fechaInicioPostulacion,
      fechaCierrePostulacion: dto.fechaCierrePostulacion,
      fechaAnuncioGanadores: dto.fechaAnuncioGanadores,
      montoPremio: dto.montoPremio.toString(),
      numeroGanadores: dto.numeroGanadores,
      topNSistema: dto.topNSistema,
      departamentos: dto.departamentos,
      createdBy: user.id,
    });

    // Si un responsable crea el concurso, auto-asignarse
    if (user.rol === RolUsuario.RESPONSABLE_CONCURSO) {
      await this.concursoRepo.addResponsable(created.id, user.id);
    }

    return created;
  }

  async findById(id: number, user?: AuthUser) {
    const c = await this.concursoRepo.findById(id);
    if (!c) throw new NotFoundException('Concurso no encontrado');

    // Proponente no puede ver concursos en borrador
    if (user?.rol === RolUsuario.PROPONENTE && c.estado === EstadoConcurso.BORRADOR) {
      throw new NotFoundException('Concurso no encontrado');
    }

    return c;
  }

  async findAll(query: ListConcursosQueryDto, user: AuthUser): Promise<PaginatedResponse<unknown>> {
    const { page, limit } = query;

    let result: { data: unknown[]; total: number };

    if (user.rol === RolUsuario.PROPONENTE) {
      // Proponente ve todos los concursos excepto borradores
      result = await this.concursoRepo.findAllExcludeEstado(query, EstadoConcurso.BORRADOR);
    } else if (user.rol === RolUsuario.ADMINISTRADOR) {
      result = await this.concursoRepo.findAll(query);
    } else {
      // Responsable solo ve los asignados
      result = await this.concursoRepo.findAllByResponsable(user.id, query);
    }

    const totalPages = Math.ceil(result.total / limit);
    return { data: result.data, total: result.total, page, limit, totalPages };
  }

  async update(id: number, dto: UpdateConcursoDto) {
    // Solo se puede editar en borrador
    const c = await this.concursoRepo.findById(id);
    if (!c) throw new NotFoundException('Concurso no encontrado');
    if (c.estado !== EstadoConcurso.BORRADOR) {
      throw new ConflictException('Solo se puede editar un concurso en estado borrador');
    }

    // Convertir montoPremio a string si viene en el dto
    const data: Record<string, unknown> = { ...dto };
    if (dto.montoPremio !== undefined) {
      data.montoPremio = dto.montoPremio.toString();
    }

    const updated = await this.concursoRepo.update(id, data);
    if (!updated) throw new NotFoundException('Concurso no encontrado');
    return updated;
  }

  async delete(id: number) {
    const c = await this.concursoRepo.findById(id);
    if (!c) throw new NotFoundException('Concurso no encontrado');
    if (c.estado !== EstadoConcurso.BORRADOR) {
      throw new ConflictException('Solo se puede eliminar un concurso en estado borrador');
    }

    const deleted = await this.concursoRepo.delete(id);
    if (!deleted) throw new NotFoundException('Concurso no encontrado');
  }

  // --- Transiciones de estado ---

  // Verificar requisitos para publicar (devuelve lista de errores)
  async canPublicar(concursoId: number): Promise<string[]> {
    const errors: string[] = [];

    const c = await this.concursoRepo.findById(concursoId);
    if (!c) {
      return ['Concurso no encontrado'];
    }

    if (!this.stateMachine.canTransition(c.estado, 'publicar')) {
      errors.push(`No se puede publicar desde el estado "${c.estado}"`);
      return errors;
    }

    // Debe tener al menos 1 responsable
    const numResponsables = await this.concursoRepo.countResponsables(concursoId);
    if (numResponsables === 0) {
      errors.push('El concurso debe tener al menos un responsable asignado');
    }

    // Debe tener formulario dinamico
    const hasForm = await this.concursoRepo.hasFormulario(concursoId);
    if (!hasForm) {
      errors.push('El concurso debe tener un formulario de postulacion configurado');
    }

    // Validar rubrica completa (6 reglas)
    const rubricaResult = await this.rubricaService.validar(concursoId);
    if (!rubricaResult.completa) {
      errors.push(...rubricaResult.errores);
    }

    return errors;
  }

  async publicar(concursoId: number) {
    const errors = await this.canPublicar(concursoId);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const updated = await this.concursoRepo.updateEstado(
      concursoId,
      EstadoConcurso.BORRADOR,
      EstadoConcurso.PUBLICADO,
    );

    if (!updated) {
      throw new ConflictException('No se pudo publicar el concurso (estado ya cambio)');
    }

    return updated;
  }

  async cerrar(concursoId: number) {
    return this.executeTransition(concursoId, 'cerrar');
  }

  async iniciarEvaluacion(concursoId: number) {
    return this.executeTransition(concursoId, 'iniciar_evaluacion');
  }

  // Seleccionar ganadores (batch: en_evaluacion -> resultados_listos)
  async seleccionarGanadores(concursoId: number, dto: SeleccionarGanadoresDto) {
    const c = await this.ensureExists(concursoId);

    if (!this.stateMachine.canTransition(c.estado, 'seleccionar_ganadores')) {
      throw new ConflictException(
        `No se puede seleccionar ganadores desde el estado "${c.estado}"`,
      );
    }

    // validar que no haya postulaciones pendientes de evaluacion
    const pendientes = await this.concursoRepo.countPostulacionesPendientes(concursoId);
    if (pendientes > 0) {
      throw new BadRequestException(
        `Hay ${pendientes} postulacion(es) aun en evaluacion. Todas deben estar calificadas.`,
      );
    }

    // validar que no haya calificaciones sin aprobar
    const califNoAprobadas = await this.concursoRepo.countCalificacionesNoAprobadas(concursoId);
    if (califNoAprobadas > 0) {
      throw new BadRequestException(
        `Hay ${califNoAprobadas} calificacion(es) no aprobadas. Todas deben estar aprobadas.`,
      );
    }

    // verificar que las postulaciones calificadas existen
    const calificadas = await this.concursoRepo.findPostulacionesCalificadas(concursoId);
    if (calificadas.length === 0) {
      throw new BadRequestException('No hay postulaciones calificadas para seleccionar ganadores');
    }

    // validar que los IDs de ganadores pertenecen a postulaciones calificadas del concurso
    const idsCalificadas = new Set(calificadas.map(p => p.id));
    const idsInvalidos = dto.ganadorIds.filter((id: number) => !idsCalificadas.has(id));
    if (idsInvalidos.length > 0) {
      throw new BadRequestException(
        `Las postulaciones [${idsInvalidos.join(', ')}] no estan calificadas o no pertenecen a este concurso`,
      );
    }

    // validar cantidad de ganadores vs numero_ganadores del concurso
    if (dto.ganadorIds.length > c.numeroGanadores) {
      throw new BadRequestException(
        `Se seleccionaron ${dto.ganadorIds.length} ganadores pero el maximo permitido es ${c.numeroGanadores}`,
      );
    }

    // ejecutar todo en transaccion
    // 1. calcular ranking
    await this.concursoRepo.calcularRanking(concursoId);
    // 2. marcar ganadores
    await this.concursoRepo.marcarGanadores(dto.ganadorIds);
    // 3. marcar no seleccionados
    await this.concursoRepo.marcarNoSeleccionados(concursoId, dto.ganadorIds);
    // 4. transicionar concurso a resultados_listos
    const updated = await this.concursoRepo.updateEstado(
      concursoId,
      EstadoConcurso.EN_EVALUACION,
      EstadoConcurso.RESULTADOS_LISTOS,
    );

    if (!updated) {
      throw new ConflictException('No se pudo cambiar el estado (concurrencia detectada)');
    }

    return updated;
  }

  // Verificar requisitos para publicar resultados
  async canFinalizar(concursoId: number): Promise<string[]> {
    const errors: string[] = [];

    const c = await this.concursoRepo.findById(concursoId);
    if (!c) {
      return ['Concurso no encontrado'];
    }

    if (!this.stateMachine.canTransition(c.estado, 'publicar_resultados')) {
      errors.push(`No se puede publicar resultados desde el estado "${c.estado}"`);
      return errors;
    }

    // debe haber al menos 1 ganador
    const numGanadores = await this.concursoRepo.countGanadores(concursoId);
    if (numGanadores === 0) {
      errors.push('No se han seleccionado ganadores');
    }

    // no deben quedar postulaciones calificadas sin decidir
    const sinDecidir = await this.concursoRepo.countCalificadasSinDecidir(concursoId);
    if (sinDecidir > 0) {
      errors.push(`Hay ${sinDecidir} postulacion(es) calificadas sin decidir (ganador/no seleccionado)`);
    }

    return errors;
  }

  // Publicar resultados (resultados_listos -> finalizado)
  async publicarResultados(concursoId: number) {
    const errors = await this.canFinalizar(concursoId);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const updated = await this.concursoRepo.updateEstado(
      concursoId,
      EstadoConcurso.RESULTADOS_LISTOS,
      EstadoConcurso.FINALIZADO,
    );

    if (!updated) {
      throw new ConflictException('No se pudo cambiar el estado (concurrencia detectada)');
    }

    // marcar timestamp de publicacion
    await this.concursoRepo.setFechaPublicacionResultados(concursoId);

    // retornar con el timestamp actualizado
    return this.concursoRepo.findById(concursoId);
  }

  // --- Responsables ---

  async findResponsables(concursoId: number) {
    await this.ensureExists(concursoId);
    return this.concursoRepo.findResponsables(concursoId);
  }

  async addResponsable(concursoId: number, usuarioId: number) {
    await this.ensureExists(concursoId);

    try {
      return await this.concursoRepo.addResponsable(concursoId, usuarioId);
    } catch (error: unknown) {
      // Drizzle 0.45 envuelve el error de PG en DrizzleQueryError.cause
      const pgCode = (error as any)?.cause?.code ?? (error as any)?.code;
      // UNIQUE violation: ya es responsable
      if (pgCode === '23505') {
        throw new ConflictException('El usuario ya es responsable de este concurso');
      }
      // FK violation: usuario no existe
      if (pgCode === '23503') {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }

  async removeResponsable(concursoId: number, usuarioId: number) {
    await this.ensureExists(concursoId);
    const removed = await this.concursoRepo.removeResponsable(concursoId, usuarioId);
    if (!removed) {
      throw new NotFoundException('El usuario no es responsable de este concurso');
    }
  }

  // --- Evaluadores del concurso ---

  async findEvaluadores(concursoId: number) {
    await this.ensureExists(concursoId);
    return this.concursoRepo.findEvaluadores(concursoId);
  }

  async addEvaluador(concursoId: number, evaluadorId: number, asignadoPor: number) {
    await this.ensureExists(concursoId);

    try {
      return await this.concursoRepo.addEvaluador(concursoId, evaluadorId, asignadoPor);
    } catch (error: unknown) {
      const pgCode = (error as any)?.cause?.code ?? (error as any)?.code;
      // UNIQUE violation: ya es evaluador
      if (pgCode === '23505') {
        throw new ConflictException('El usuario ya es evaluador de este concurso');
      }
      // FK violation: usuario no existe
      if (pgCode === '23503') {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }

  async removeEvaluador(concursoId: number, evaluadorId: number) {
    await this.ensureExists(concursoId);
    const removed = await this.concursoRepo.removeEvaluador(concursoId, evaluadorId);
    if (!removed) {
      throw new NotFoundException('El usuario no es evaluador de este concurso');
    }
  }

  // --- Modificar fechas (concurso publicado o posterior, no finalizado) ---

  async updateFechas(id: number, dto: UpdateFechasConcursoDto) {
    const c = await this.concursoRepo.findById(id);
    if (!c) throw new NotFoundException('Concurso no encontrado');

    // solo permitido en publicado, cerrado, en_evaluacion o resultados_listos
    const estadosPermitidos = [
      EstadoConcurso.PUBLICADO,
      EstadoConcurso.CERRADO,
      EstadoConcurso.EN_EVALUACION,
      EstadoConcurso.RESULTADOS_LISTOS,
    ];
    if (!estadosPermitidos.includes(c.estado as EstadoConcurso)) {
      throw new ConflictException(
        'Solo se pueden modificar fechas en concursos publicados, cerrados o en evaluacion',
      );
    }

    const data: Record<string, unknown> = {};

    // fecha cierre efectiva: solo modificable si el concurso esta publicado
    if (dto.fechaCierreEfectiva !== undefined) {
      if (c.estado !== EstadoConcurso.PUBLICADO) {
        throw new ConflictException(
          'La fecha de cierre solo se puede extender cuando el concurso esta publicado',
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

    const updated = await this.concursoRepo.update(id, data);
    if (!updated) throw new NotFoundException('Concurso no encontrado');
    return updated;
  }

  // --- Auto-cierre de concursos vencidos ---

  async cerrarVencidos(): Promise<number> {
    return this.concursoRepo.cerrarVencidos();
  }

  // --- Resultados: vista admin/responsable ---

  // resumen estadistico de concursos en evaluacion/resultados_listos/finalizado
  async getResumenResultados(user: AuthUser) {
    const usuarioId = user.rol === RolUsuario.RESPONSABLE_CONCURSO ? user.id : undefined;
    const rows = await this.concursoRepo.findResumenResultados(usuarioId);

    return rows.map(row => ({
      ...row,
      promedioCalificadas: row.promedioCalificadas !== null ? Number(row.promedioCalificadas) : null,
    }));
  }

  // ranking completo de postulaciones de un concurso
  async getRankingConcurso(concursoId: number) {
    const c = await this.concursoRepo.findById(concursoId);
    if (!c) throw new NotFoundException('Concurso no encontrado');

    const rows = await this.concursoRepo.findRankingPostulaciones(concursoId);

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
      montoPremio: c.montoPremio,
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

  private async ensureExists(concursoId: number) {
    const c = await this.concursoRepo.findById(concursoId);
    if (!c) throw new NotFoundException('Concurso no encontrado');
    return c;
  }

  private async executeTransition(concursoId: number, event: ConcursoEvent) {
    const c = await this.ensureExists(concursoId);

    if (!this.stateMachine.canTransition(c.estado, event)) {
      throw new ConflictException(
        `No se puede ejecutar "${event}" desde el estado "${c.estado}"`,
      );
    }

    const newEstado = this.stateMachine.transition(c.estado, event);
    const updated = await this.concursoRepo.updateEstado(c.id, c.estado, newEstado);

    if (!updated) {
      throw new ConflictException('No se pudo cambiar el estado (concurrencia detectada)');
    }

    return updated;
  }
}
