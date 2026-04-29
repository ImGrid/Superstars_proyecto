import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  SavePostulacionDraftDto,
  ObservarPostulacionDto,
  ListPostulacionesQueryDto,
  SchemaDefinition,
  AuthUser,
  PaginatedResponse,
} from '@superstars/shared';
import {
  RolUsuario,
  EstadoConvocatoria,
  EstadoPostulacion,
  buildResponseSchema,
  calculateCompletionPercentage,
} from '@superstars/shared';
import { PostulacionRepository } from './postulacion.repository';
import { PostulacionStateMachine } from './postulacion.state-machine';
import { FormularioService } from '../formulario/formulario.service';
import { ConvocatoriaRepository } from '../convocatoria/convocatoria.repository';

@Injectable()
export class PostulacionService {
  private readonly stateMachine = new PostulacionStateMachine();

  constructor(
    private readonly postulacionRepo: PostulacionRepository,
    private readonly formularioService: FormularioService,
    private readonly convocatoriaRepo: ConvocatoriaRepository,
  ) {}

  // --- Proponente ---

  // Guardar borrador (crea si no existe, actualiza si ya hay uno)
  async saveDraft(convocatoriaId: number, userId: number, dto: SavePostulacionDraftDto) {
    const empresaId = await this.resolveEmpresaId(userId);
    await this.verificarConvocatoriaAbierta(convocatoriaId);

    const formulario = await this.formularioService.findByConvocatoriaId(convocatoriaId);
    const schemaDef = formulario.schemaDefinition as SchemaDefinition;

    // Validacion dinamica en modo draft (todo opcional, passthrough)
    const validated = this.validateResponseData(schemaDef, dto.responseData, 'draft');
    const porcentaje = calculateCompletionPercentage(schemaDef, validated);

    let existing = await this.postulacionRepo.findByEmpresaAndConvocatoria(empresaId, convocatoriaId);

    if (existing) {
      // Solo se puede editar en borrador u observado
      if (existing.estado !== EstadoPostulacion.BORRADOR && existing.estado !== EstadoPostulacion.OBSERVADO) {
        throw new ConflictException('La postulacion no se puede editar en su estado actual');
      }

      return this.postulacionRepo.updateDraft(existing.id, {
        responseData: validated,
        porcentajeCompletado: porcentaje.toString(),
        schemaVersion: formulario.version,
      });
    }

    // Crear nueva postulacion en borrador
    return this.postulacionRepo.create({
      convocatoriaId,
      empresaId,
      responseData: validated,
      porcentajeCompletado: porcentaje.toString(),
      schemaVersion: formulario.version,
    });
  }

  // Enviar postulacion (valida 100% y transiciona a enviado)
  async submit(convocatoriaId: number, userId: number) {
    const empresaId = await this.resolveEmpresaId(userId);
    await this.verificarConvocatoriaAbierta(convocatoriaId);

    const existing = await this.postulacionRepo.findByEmpresaAndConvocatoria(empresaId, convocatoriaId);
    if (!existing) {
      throw new NotFoundException('No tienes una postulacion para esta convocatoria');
    }

    // Verificar transicion valida
    if (!this.stateMachine.canTransition(existing.estado, 'enviar')) {
      throw new ConflictException(
        `No se puede enviar una postulacion en estado "${existing.estado}"`,
      );
    }

    // Validar con modo submit (requeridos obligatorios)
    const formulario = await this.formularioService.findByConvocatoriaId(convocatoriaId);
    const schemaDef = formulario.schemaDefinition as SchemaDefinition;
    const responseData = existing.responseData as Record<string, unknown>;

    this.validateResponseData(schemaDef, responseData, 'submit');

    const porcentaje = calculateCompletionPercentage(schemaDef, responseData);
    if (porcentaje < 100) {
      throw new BadRequestException(
        `El formulario debe estar completo al 100%. Actual: ${porcentaje}%`,
      );
    }

    const updated = await this.postulacionRepo.submitPostulacion(existing.id, existing.estado);
    if (!updated) {
      throw new ConflictException('La postulacion fue modificada por otro proceso');
    }

    return updated;
  }

  // Todas mis postulaciones cross-convocatoria (dashboard del proponente)
  async findAllMine(userId: number) {
    const empresaId = await this.resolveEmpresaId(userId);
    return this.postulacionRepo.findAllByEmpresa(empresaId);
  }

  // listado cross-convocatoria para admin/responsable
  async findAllAdmin(
    query: ListPostulacionesQueryDto,
    user: AuthUser,
  ): Promise<PaginatedResponse<unknown>> {
    const { page, limit, convocatoriaId, estado } = query;

    // responsable solo ve postulaciones de sus convocatorias asignadas
    const responsableUsuarioId =
      user.rol === RolUsuario.RESPONSABLE_CONVOCATORIA ? user.id : undefined;

    const { data, total } = await this.postulacionRepo.findAllAdmin({
      page,
      limit,
      convocatoriaId,
      estado,
      responsableUsuarioId,
    });

    const totalPages = Math.ceil(total / limit);
    return { data, total, page, limit, totalPages };
  }

  // Obtener mi postulacion para una convocatoria
  async findMine(convocatoriaId: number, userId: number) {
    const empresaId = await this.resolveEmpresaId(userId);
    const existing = await this.postulacionRepo.findByEmpresaAndConvocatoria(empresaId, convocatoriaId);
    if (!existing) {
      throw new NotFoundException('No tienes una postulacion para esta convocatoria');
    }
    return existing;
  }

  // --- Responsable / Admin ---

  // Listar postulaciones de una convocatoria (sin responseData)
  async findAllByConvocatoria(convocatoriaId: number, estado?: string) {
    // Verificar que la convocatoria existe
    const convocatoriaEstado = await this.convocatoriaRepo.getEstado(convocatoriaId);
    if (!convocatoriaEstado) {
      throw new NotFoundException('Convocatoria no encontrada');
    }

    return this.postulacionRepo.findAllByConvocatoria(convocatoriaId, estado);
  }

  // Detalle de una postulacion (con responseData)
  async findById(id: number) {
    const existing = await this.postulacionRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Postulacion no encontrada');
    }
    return existing;
  }

  // Observar postulacion (devolver al proponente con comentarios)
  async observar(id: number, dto: ObservarPostulacionDto) {
    const existing = await this.postulacionRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Postulacion no encontrada');
    }

    if (!this.stateMachine.canTransition(existing.estado, 'observar')) {
      throw new ConflictException(
        `No se puede observar una postulacion en estado "${existing.estado}"`,
      );
    }

    const updated = await this.postulacionRepo.observarPostulacion(id, dto.observacion);
    if (!updated) {
      throw new ConflictException('La postulacion fue modificada por otro proceso');
    }

    return updated;
  }

  // Rechazar postulacion (estado final)
  async rechazar(id: number) {
    const existing = await this.postulacionRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Postulacion no encontrada');
    }

    if (!this.stateMachine.canTransition(existing.estado, 'rechazar')) {
      throw new ConflictException(
        `No se puede rechazar una postulacion en estado "${existing.estado}"`,
      );
    }

    const updated = await this.postulacionRepo.updateEstado(
      id,
      existing.estado,
      EstadoPostulacion.RECHAZADO,
    );
    if (!updated) {
      throw new ConflictException('La postulacion fue modificada por otro proceso');
    }

    return updated;
  }

  // Aprobar postulacion para evaluacion (enviado → en_evaluacion)
  async aprobar(id: number) {
    const existing = await this.postulacionRepo.findById(id);
    if (!existing) {
      throw new NotFoundException('Postulacion no encontrada');
    }

    if (!this.stateMachine.canTransition(existing.estado, 'iniciar_evaluacion')) {
      throw new ConflictException(
        `No se puede aprobar una postulacion en estado "${existing.estado}"`,
      );
    }

    const updated = await this.postulacionRepo.updateEstado(
      id,
      existing.estado,
      EstadoPostulacion.EN_EVALUACION,
    );
    if (!updated) {
      throw new ConflictException('La postulacion fue modificada por otro proceso');
    }

    return updated;
  }


  // --- Helpers privados ---

  private async resolveEmpresaId(userId: number): Promise<number> {
    const empresaId = await this.postulacionRepo.getEmpresaIdByUsuarioId(userId);
    if (!empresaId) {
      throw new BadRequestException(
        'Debes registrar tu empresa antes de postular',
      );
    }
    return empresaId;
  }

  private async verificarConvocatoriaAbierta(convocatoriaId: number): Promise<void> {
    const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
    if (!estado) {
      throw new NotFoundException('Convocatoria no encontrada');
    }
    if (estado !== EstadoConvocatoria.PUBLICADO) {
      throw new ConflictException('La convocatoria no esta abierta para postulaciones');
    }
  }

  private validateResponseData(
    schema: SchemaDefinition,
    data: Record<string, unknown>,
    mode: 'draft' | 'submit',
  ): Record<string, unknown> {
    const validator = buildResponseSchema(schema, mode);
    const result = validator.safeParse(data);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Error de validacion del formulario',
        errors: result.error.issues.map(i => ({
          campo: i.path.join('.'),
          mensaje: i.message,
        })),
      });
    }

    return result.data as Record<string, unknown>;
  }
}
