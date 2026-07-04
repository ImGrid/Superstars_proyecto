import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario, EstadoConvocatoria, validateTemplateIntegrity, DEFAULT_TEMPLATE } from '@superstars/shared';
import type { CreateFormularioDto, UpdateFormularioDto, SchemaDefinition, AuthUser } from '@superstars/shared';
import { FormularioRepository } from './formulario.repository';
import { ConvocatoriaAccessService } from '../convocatoria/convocatoria-access.service';
import { ConvocatoriaRepository } from '../convocatoria/convocatoria.repository';
import { CategoriaService } from '../categoria/categoria.service';
import sanitizeHtml from 'sanitize-html';

// etiquetas HTML permitidas en el contenido de los bloques informativos.
// se sanitiza al guardar porque el contenido se muestra con dangerouslySetInnerHTML.
const SANITIZE_INFORMATIVO: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a',
    'h3', 'h4', 'h5', 'span', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  ],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
};

@Injectable()
export class FormularioService {
  constructor(
    private readonly formularioRepo: FormularioRepository,
    private readonly convocatoriaAccess: ConvocatoriaAccessService,
    private readonly convocatoriaRepo: ConvocatoriaRepository,
    private readonly categoriaService: CategoriaService,
  ) {}

  // Uso interno (postulacion, archivo): trae el formulario de una categoria ya validada.
  // La categoria viene de una postulacion existente, asi que no requiere coherencia.
  async getByCategoriaId(categoriaId: number) {
    const form = await this.formularioRepo.findByCategoriaId(categoriaId);
    if (!form) {
      throw new NotFoundException('La categoría no tiene un formulario configurado');
    }
    return form;
  }

  // Uso desde el controller (ruta anidada): coherencia categoria-convocatoria +
  // visibilidad para el proponente (no ve formularios de convocatorias en borrador).
  async find(convocatoriaId: number, categoriaId: number, user?: AuthUser) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);

    if (user && user.rol === RolUsuario.PROPONENTE) {
      const estado = await this.convocatoriaRepo.getEstado(convocatoriaId);
      if (!estado) {
        throw new NotFoundException('Convocatoria no encontrada');
      }
      if (estado === EstadoConvocatoria.BORRADOR) {
        throw new ForbiddenException('La convocatoria no esta disponible');
      }
    }

    return this.getByCategoriaId(categoriaId);
  }

  async create(convocatoriaId: number, categoriaId: number, dto: CreateFormularioDto) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    // inmutabilidad: solo editable mientras la convocatoria padre esta en borrador
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    // 1:1 con categoria (uq_formulario_categoria)
    const existing = await this.formularioRepo.findByCategoriaId(categoriaId);
    if (existing) {
      throw new ConflictException('La categoría ya tiene un formulario configurado');
    }

    // creacion manual: valida contra la plantilla por defecto (fallback del builder)
    this.verificarIntegridadPlantilla(dto.schemaDefinition, DEFAULT_TEMPLATE);

    return this.formularioRepo.create({
      categoriaId,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      schemaDefinition: this.sanitizarInformativos(dto.schemaDefinition),
    });
  }

  async update(convocatoriaId: number, categoriaId: number, dto: UpdateFormularioDto) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    // validar integridad si se actualiza el schema: los campos que ya existen en la
    // categoria no pueden cambiar de tipo. Se compara contra el schema PREVIO de esta
    // categoria (cada categoria tiene su propia plantilla), no contra una global.
    if (dto.schemaDefinition) {
      const previo = await this.formularioRepo.findByCategoriaId(categoriaId);
      if (previo) {
        this.verificarIntegridadPlantilla(
          dto.schemaDefinition,
          previo.schemaDefinition as SchemaDefinition,
        );
      }
    }

    const { version, ...data } = dto;
    if (data.schemaDefinition) {
      data.schemaDefinition = this.sanitizarInformativos(data.schemaDefinition);
    }
    const updated = await this.formularioRepo.update(categoriaId, data, version);

    if (!updated) {
      // Distinguir entre "no existe" y "version no coincide"
      const exists = await this.formularioRepo.findByCategoriaId(categoriaId);
      if (!exists) {
        throw new NotFoundException('La categoría no tiene un formulario configurado');
      }
      throw new ConflictException('El formulario fue modificado por otro usuario (version no coincide)');
    }

    return updated;
  }

  async delete(convocatoriaId: number, categoriaId: number) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    const deleted = await this.formularioRepo.delete(categoriaId);
    if (!deleted) {
      throw new NotFoundException('La categoría no tiene un formulario configurado');
    }
  }

  // verifica que el schema no elimine ni altere secciones/campos fijos de la plantilla.
  // TODO(plantillas por categoria): pasar el discriminador de plantilla (empresas/agricultura)
  // cuando exista el ladrillo de las 2 plantillas por defecto.
  private verificarIntegridadPlantilla(
    schema: SchemaDefinition,
    referencia: SchemaDefinition,
  ): void {
    const errors = validateTemplateIntegrity(schema, referencia);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  // sanitiza el HTML de los bloques informativos del schema (defensa XSS).
  // los demas campos no llevan HTML libre, se dejan intactos.
  private sanitizarInformativos(schema: SchemaDefinition): SchemaDefinition {
    return {
      ...schema,
      secciones: schema.secciones.map((seccion) => ({
        ...seccion,
        campos: seccion.campos.map((campo) =>
          campo.tipo === 'informativo'
            ? { ...campo, contenido: sanitizeHtml(campo.contenido, SANITIZE_INFORMATIVO) }
            : campo,
        ),
      })),
    };
  }
}
