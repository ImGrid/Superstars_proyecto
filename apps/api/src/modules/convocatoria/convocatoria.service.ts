import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type {
  CreateConvocatoriaDto,
  UpdateConvocatoriaDto,
  UpdateFechasConvocatoriaDto,
  ListConvocatoriasQueryDto,
  SeleccionarGanadoresDto,
  PaginatedResponse,
  AuthUser,
} from '@superstars/shared';
import { RolUsuario, EstadoConvocatoria, CATEGORIAS_DEFAULT } from '@superstars/shared';
import { ConvocatoriaRepository } from './convocatoria.repository';
import { ConvocatoriaStateMachine } from './convocatoria.state-machine';
import type { ConvocatoriaEvent } from './convocatoria.state-machine';
import { RubricaService } from '../rubrica/rubrica.service';
import { CategoriaService } from '../categoria/categoria.service';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface';
import {
  IMAGE_CONFIG,
  IMAGE_ERROR_MESSAGES,
  resolveMimeFromExt,
} from '../../common/constants/image.constants';

@Injectable()
export class ConvocatoriaService {
  private readonly stateMachine = new ConvocatoriaStateMachine();

  constructor(
    private readonly convocatoriaRepo: ConvocatoriaRepository,
    @Inject(forwardRef(() => RubricaService))
    private readonly rubricaService: RubricaService,
    private readonly categoriaService: CategoriaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // --- CRUD ---

  async create(dto: CreateConvocatoriaDto, user: AuthUser) {
    // SB-6: la convocatoria nace con sus categorias por defecto + sus formularios
    // (plantillas fieles a los PDF). Si un responsable la crea, se auto-asigna.
    // Todo transaccional: o se crea la convocatoria completa, o nada.
    const responsableUserId =
      user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA ? user.id : null;

    return this.convocatoriaRepo.createConCategorias(
      {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        fechaInicioPostulacion: dto.fechaInicioPostulacion,
        fechaCierrePostulacion: dto.fechaCierrePostulacion,
        fechaAnuncioGanadores: dto.fechaAnuncioGanadores,
        departamentos: dto.departamentos,
        createdBy: user.id,
      },
      responsableUserId,
      CATEGORIAS_DEFAULT.map((c) => ({
        nombre: c.nombre,
        monto: c.monto,
        numeroGanadores: c.numeroGanadores,
        topNSistema: c.topNSistema,
        orden: c.orden,
        formularioNombre: c.formularioNombre,
        schemaDefinition: c.schemaDefinition,
      })),
    );
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
      // Proponente: filtra entre abiertas (publicado), anteriores (cerrado/en_evaluacion/
      // resultados_listos/finalizado) o todas las visibles. tipo=undefined preserva
      // compat para selectores que quieren todas las visibles.
      result = await this.convocatoriaRepo.findAllVisiblesParaProponente(query, query.tipo);
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

    const updated = await this.convocatoriaRepo.update(id, dto);
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

    // Borrar la imagen del storage si existia (best-effort, no romper si falla)
    if (c.imagenKey) {
      await this.storage.delete(c.imagenKey).catch(() => {});
    }
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

    // Cada categoria debe tener su formulario y su rubrica completa (6 reglas)
    const categorias = await this.categoriaService.findByConvocatoria(convocatoriaId);
    if (categorias.length === 0) {
      errors.push('La convocatoria debe tener al menos una categoría');
    }

    for (const cat of categorias) {
      const hasForm = await this.convocatoriaRepo.hasFormulario(cat.id);
      if (!hasForm) {
        errors.push(`La categoría "${cat.nombre}" no tiene un formulario de postulación configurado`);
      }

      const rubricaResult = await this.rubricaService.validar(convocatoriaId, cat.id);
      if (!rubricaResult.completa) {
        errors.push(...rubricaResult.errores.map((e) => `[${cat.nombre}] ${e}`));
      }
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

  // Seleccionar ganadores de UNA categoria. No transiciona la convocatoria salvo
  // que esta sea la ultima categoria en resolverse (fan-in -> resultados_listos).
  async seleccionarGanadores(convocatoriaId: number, categoriaId: number, dto: SeleccionarGanadoresDto) {
    const c = await this.ensureExists(convocatoriaId);
    const categoria = await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    // solo se seleccionan ganadores mientras la convocatoria esta en evaluacion
    if (c.estado !== EstadoConvocatoria.EN_EVALUACION) {
      throw new ConflictException(
        `No se pueden seleccionar ganadores en el estado "${c.estado}"`,
      );
    }

    // no debe quedar ninguna postulacion en evaluacion en esta categoria
    const pendientes = await this.convocatoriaRepo.countPostulacionesPendientes(categoriaId);
    if (pendientes > 0) {
      throw new BadRequestException(
        `Hay ${pendientes} postulación(es) aún en evaluación en esta categoría. Todas deben estar calificadas.`,
      );
    }

    // no debe haber calificaciones sin aprobar en esta categoria
    const califNoAprobadas = await this.convocatoriaRepo.countCalificacionesNoAprobadas(categoriaId);
    if (califNoAprobadas > 0) {
      throw new BadRequestException(
        `Hay ${califNoAprobadas} calificación(es) no aprobadas en esta categoría. Todas deben estar aprobadas.`,
      );
    }

    // debe haber postulaciones calificadas en la categoria
    const calificadas = await this.convocatoriaRepo.findPostulacionesCalificadas(categoriaId);
    if (calificadas.length === 0) {
      throw new BadRequestException('No hay postulaciones calificadas para seleccionar ganadores en esta categoría');
    }

    // los ganadorIds deben ser postulaciones calificadas de ESTA categoria
    const idsCalificadas = new Set(calificadas.map(p => p.id));
    const idsInvalidos = dto.ganadorIds.filter((id: number) => !idsCalificadas.has(id));
    if (idsInvalidos.length > 0) {
      throw new BadRequestException(
        `Las postulaciones [${idsInvalidos.join(', ')}] no están calificadas o no pertenecen a esta categoría`,
      );
    }

    // no exceder el numero de ganadores configurado en la categoria
    if (dto.ganadorIds.length > categoria.numeroGanadores) {
      throw new BadRequestException(
        `Se seleccionaron ${dto.ganadorIds.length} ganadores pero el máximo de la categoría es ${categoria.numeroGanadores}`,
      );
    }

    // 1. ranking dentro de la categoria (DENSE_RANK)
    await this.convocatoriaRepo.calcularRanking(categoriaId);
    // 2. marcar ganadores
    await this.convocatoriaRepo.marcarGanadores(dto.ganadorIds);
    // 3. marcar el resto de calificadas de la categoria como no seleccionadas
    await this.convocatoriaRepo.marcarNoSeleccionados(categoriaId, dto.ganadorIds);
    // 4. marcar la categoria como resuelta
    await this.categoriaService.marcarGanadoresSeleccionados(categoriaId);

    // 5. fan-in: si TODAS las categorias estan resueltas, avanzar la convocatoria
    const noResueltas = await this.categoriaService.countCategoriasNoResueltas(convocatoriaId);
    if (noResueltas === 0) {
      await this.convocatoriaRepo.updateEstado(
        convocatoriaId,
        EstadoConvocatoria.EN_EVALUACION,
        EstadoConvocatoria.RESULTADOS_LISTOS,
      );
    }

    // devolver el ranking resultante de la categoria
    return this.getRankingCategoria(convocatoriaId, categoriaId);
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

    // todas las categorias deben tener sus ganadores seleccionados (resueltas)
    const noResueltas = await this.categoriaService.countCategoriasNoResueltas(convocatoriaId);
    if (noResueltas > 0) {
      errors.push(`Hay ${noResueltas} categoría(s) sin ganadores seleccionados`);
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

  // ranking de postulaciones de UNA categoria
  async getRankingCategoria(convocatoriaId: number, categoriaId: number) {
    const categoria = await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    const rows = await this.convocatoriaRepo.findRankingPostulaciones(categoriaId);

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
      categoriaId: categoria.id,
      categoriaNombre: categoria.nombre,
      convocatoriaId,
      monto: categoria.monto,
      numeroGanadores: categoria.numeroGanadores,
      resuelta: categoria.fechaSeleccionGanadores !== null,
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

  // --- Imagen de portada ---
  // La imagen se sube despues de crear la convocatoria (no en el POST inicial).
  // Se permite cambiarla en cualquier estado (incluso publicada o finalizada),
  // porque es solo presentacion visual y no compromete las reglas del concurso.

  async uploadImagen(id: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.fileMissing);
    }
    const c = await this.ensureExists(id);

    // Validar tipo MIME
    if (!IMAGE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.invalidMime);
    }

    // Validar tamano
    if (file.size > IMAGE_CONFIG.maxSizeBytes) {
      throw new BadRequestException(IMAGE_ERROR_MESSAGES.exceedsMaxSize);
    }

    // Subir la imagen nueva primero (clave unica para evitar colisiones)
    const ext = extname(file.originalname).toLowerCase();
    const newKey = `convocatorias/${id}/${randomUUID()}${ext}`;
    await this.storage.upload(newKey, file.buffer);

    try {
      const updated = await this.convocatoriaRepo.update(id, { imagenKey: newKey });
      if (!updated) {
        // No deberia pasar (ensureExists ya valido) pero por seguridad
        await this.storage.delete(newKey).catch(() => {});
        throw new NotFoundException('Convocatoria no encontrada');
      }
      // Borrar la imagen anterior despues del UPDATE exitoso (best-effort)
      if (c.imagenKey) {
        await this.storage.delete(c.imagenKey).catch(() => {});
      }
      return updated;
    } catch (err) {
      // Si el UPDATE falla, limpiar la imagen huerfana
      await this.storage.delete(newKey).catch(() => {});
      throw err;
    }
  }

  async downloadImagen(id: number): Promise<{ buffer: Buffer; mimeType: string }> {
    const c = await this.ensureExists(id);
    if (!c.imagenKey) {
      throw new NotFoundException('Esta convocatoria no tiene imagen de portada.');
    }

    const buffer = await this.storage.download(c.imagenKey);
    const mimeType = resolveMimeFromExt(extname(c.imagenKey));

    return { buffer, mimeType };
  }

  async removeImagen(id: number) {
    const c = await this.ensureExists(id);
    if (!c.imagenKey) {
      throw new NotFoundException('Esta convocatoria no tiene imagen de portada.');
    }

    // Persistir el cambio en BD primero (si falla, la imagen sigue accesible)
    const updated = await this.convocatoriaRepo.update(id, { imagenKey: null });
    if (!updated) throw new NotFoundException('Convocatoria no encontrada');

    // Borrar el archivo del storage (best-effort)
    await this.storage.delete(c.imagenKey).catch(() => {});

    return updated;
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
