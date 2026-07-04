import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type {
  CreateRubricaDto,
  UpdateRubricaDto,
  CreateCriterioDto,
  UpdateCriterioDto,
  CreateSubCriterioConNivelesDto,
  UpdateSubCriterioDto,
  UpdateNivelEvaluacionDto,
} from '@superstars/shared';
import { RubricaRepository } from './rubrica.repository';
import { ConvocatoriaAccessService } from '../convocatoria/convocatoria-access.service';
import { CategoriaService } from '../categoria/categoria.service';

@Injectable()
export class RubricaService {
  constructor(
    private readonly rubricaRepo: RubricaRepository,
    private readonly convocatoriaAccess: ConvocatoriaAccessService,
    private readonly categoriaService: CategoriaService,
  ) {}

  // --- Rubrica (1:1 con categoria) ---

  async findByCategoria(convocatoriaId: number, categoriaId: number) {
    await this.ensureCategoria(convocatoriaId, categoriaId);

    const tree = await this.rubricaRepo.findFullTree(categoriaId);
    if (!tree) {
      throw new NotFoundException('La categoría no tiene una rúbrica configurada');
    }
    return tree;
  }

  async create(convocatoriaId: number, categoriaId: number, dto: CreateRubricaDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    // 1:1 con categoria (uq_rubrica_categoria)
    const existing = await this.rubricaRepo.findByCategoriaId(categoriaId);
    if (existing) {
      throw new ConflictException('La categoría ya tiene una rúbrica configurada');
    }

    return this.rubricaRepo.createRubrica({
      categoriaId,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      puntajeTotal: dto.puntajeTotal.toString(),
    });
  }

  async updateRubrica(convocatoriaId: number, categoriaId: number, dto: UpdateRubricaDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    const rub = await this.rubricaRepo.findByCategoriaId(categoriaId);
    if (!rub) {
      throw new NotFoundException('La categoría no tiene una rúbrica configurada');
    }

    const data: Record<string, unknown> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.puntajeTotal !== undefined) data.puntajeTotal = dto.puntajeTotal.toString();

    if (Object.keys(data).length === 0) return rub;

    const updated = await this.rubricaRepo.updateRubrica(rub.id, data);
    if (!updated) throw new NotFoundException('Rúbrica no encontrada');
    return updated;
  }

  async deleteRubrica(convocatoriaId: number, categoriaId: number) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    const deleted = await this.rubricaRepo.deleteRubrica(categoriaId);
    if (!deleted) {
      throw new NotFoundException('La categoría no tiene una rúbrica configurada');
    }
  }

  // --- Criterio ---

  async createCriterio(convocatoriaId: number, categoriaId: number, dto: CreateCriterioDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    const rub = await this.rubricaRepo.findByCategoriaId(categoriaId);
    if (!rub) {
      throw new NotFoundException('La categoría no tiene una rúbrica configurada');
    }

    return this.rubricaRepo.createCriterio({
      rubricaId: rub.id,
      tipo: dto.tipo,
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      pesoPorcentaje: dto.pesoPorcentaje.toString(),
      orden: dto.orden,
    });
  }

  async updateCriterio(convocatoriaId: number, categoriaId: number, criterioId: number, dto: UpdateCriterioDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);
    await this.ensureCriterioBelongsToCategoria(criterioId, categoriaId);

    const data: Record<string, unknown> = {};
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.pesoPorcentaje !== undefined) data.pesoPorcentaje = dto.pesoPorcentaje.toString();
    if (dto.orden !== undefined) data.orden = dto.orden;

    if (Object.keys(data).length === 0) {
      const row = await this.rubricaRepo.findCriterioById(criterioId);
      return row;
    }

    const updated = await this.rubricaRepo.updateCriterio(criterioId, data);
    if (!updated) throw new NotFoundException('Criterio no encontrado');
    return updated;
  }

  async deleteCriterio(convocatoriaId: number, categoriaId: number, criterioId: number) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);
    await this.ensureCriterioBelongsToCategoria(criterioId, categoriaId);

    const deleted = await this.rubricaRepo.deleteCriterio(criterioId);
    if (!deleted) throw new NotFoundException('Criterio no encontrado');
  }

  // --- Sub-criterio (creacion atomica con 3 niveles) ---

  async createSubCriterioConNiveles(convocatoriaId: number, categoriaId: number, dto: CreateSubCriterioConNivelesDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);

    // Verificar que el criterioId pertenece a esta categoria
    await this.ensureCriterioBelongsToCategoria(dto.criterioId, categoriaId);

    return this.rubricaRepo.createSubCriterioConNiveles(
      {
        criterioId: dto.criterioId,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        pesoPorcentaje: dto.pesoPorcentaje.toString(),
        orden: dto.orden,
      },
      dto.niveles.map(n => ({
        nivel: n.nivel,
        descripcion: n.descripcion,
        puntajeMin: n.puntajeMin.toString(),
        puntajeMax: n.puntajeMax.toString(),
      })),
    );
  }

  async updateSubCriterio(convocatoriaId: number, categoriaId: number, subCriterioId: number, dto: UpdateSubCriterioDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);
    await this.ensureSubCriterioBelongsToCategoria(subCriterioId, categoriaId);

    const data: Record<string, unknown> = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.pesoPorcentaje !== undefined) data.pesoPorcentaje = dto.pesoPorcentaje.toString();
    if (dto.orden !== undefined) data.orden = dto.orden;

    if (Object.keys(data).length === 0) {
      const row = await this.rubricaRepo.findSubCriterioByIdAndCategoria(subCriterioId, categoriaId);
      return row!.subCriterio;
    }

    const updated = await this.rubricaRepo.updateSubCriterio(subCriterioId, data);
    if (!updated) throw new NotFoundException('Sub-criterio no encontrado');
    return updated;
  }

  async deleteSubCriterio(convocatoriaId: number, categoriaId: number, subCriterioId: number) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);
    await this.ensureSubCriterioBelongsToCategoria(subCriterioId, categoriaId);

    const deleted = await this.rubricaRepo.deleteSubCriterio(subCriterioId);
    if (!deleted) throw new NotFoundException('Sub-criterio no encontrado');
  }

  // --- Nivel evaluacion ---

  async updateNivel(convocatoriaId: number, categoriaId: number, nivelId: number, dto: UpdateNivelEvaluacionDto) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);
    await this.ensureNivelBelongsToCategoria(nivelId, categoriaId);

    const data: Record<string, unknown> = {};
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.puntajeMin !== undefined) data.puntajeMin = dto.puntajeMin.toString();
    if (dto.puntajeMax !== undefined) data.puntajeMax = dto.puntajeMax.toString();

    if (Object.keys(data).length === 0) {
      const row = await this.rubricaRepo.findNivelByIdAndCategoria(nivelId, categoriaId);
      return row!.nivelEvaluacion;
    }

    const updated = await this.rubricaRepo.updateNivel(nivelId, data);
    if (!updated) throw new NotFoundException('Nivel de evaluación no encontrado');
    return updated;
  }

  async deleteNivel(convocatoriaId: number, categoriaId: number, nivelId: number) {
    await this.ensureCategoria(convocatoriaId, categoriaId);
    await this.convocatoriaAccess.verificarEditable(convocatoriaId);
    await this.ensureNivelBelongsToCategoria(nivelId, categoriaId);

    const deleted = await this.rubricaRepo.deleteNivel(nivelId);
    if (!deleted) throw new NotFoundException('Nivel de evaluación no encontrado');
  }

  // --- Validacion de completitud (6 reglas cross-entity) ---
  // Se ancla por categoria. Lo consumen el endpoint GET /validar y canPublicar
  // (que itera las categorias de la convocatoria; la coherencia pasa trivialmente).

  async validar(convocatoriaId: number, categoriaId: number) {
    await this.ensureCategoria(convocatoriaId, categoriaId);

    const errores: string[] = [];

    const tree = await this.rubricaRepo.findFullTree(categoriaId);
    if (!tree) {
      return { completa: false, errores: ['No existe rúbrica para esta categoría'] };
    }

    const criterios = tree.criterios;
    if (criterios.length === 0) {
      errores.push('La rúbrica debe tener al menos un criterio');
      return { completa: false, errores };
    }

    // Regla 6: cada criterio tiene tipo asignado (ya cubierto por NOT NULL, pero verificamos)
    for (const c of criterios) {
      if (!c.tipo) {
        errores.push(`Criterio "${c.nombre}" no tiene tipo de criterio asignado`);
      }
    }

    // Regla 1: SUM(criterio.peso_porcentaje) = rubrica.puntaje_total
    const sumaCriterios = criterios.reduce((sum, c) => sum + Number(c.pesoPorcentaje), 0);
    const puntajeTotal = Number(tree.puntajeTotal);
    if (Math.abs(sumaCriterios - puntajeTotal) > 0.01) {
      errores.push(
        `Los criterios suman ${sumaCriterios}%, deben sumar ${puntajeTotal}`,
      );
    }

    for (const c of criterios) {
      const subCriterios = c.subCriterios;

      if (subCriterios.length === 0) {
        errores.push(`Criterio "${c.nombre}" no tiene sub-criterios`);
        continue;
      }

      // Regla 2: SUM(sub_criterio.peso_porcentaje) del criterio = criterio.peso_porcentaje
      const sumaSubCriterios = subCriterios.reduce((sum, sc) => sum + Number(sc.pesoPorcentaje), 0);
      const pesoCriterio = Number(c.pesoPorcentaje);
      if (Math.abs(sumaSubCriterios - pesoCriterio) > 0.01) {
        errores.push(
          `Sub-criterios de "${c.nombre}" suman ${sumaSubCriterios}%, deben sumar ${pesoCriterio}`,
        );
      }

      for (const sc of subCriterios) {
        const niveles = sc.nivelEvaluacions;

        // Regla 3: exactamente 3 niveles (basico, intermedio, avanzado)
        if (niveles.length !== 3) {
          errores.push(
            `Sub-criterio "${sc.nombre}" tiene ${niveles.length} niveles, debe tener 3`,
          );
          continue;
        }

        const basico = niveles.find(n => n.nivel === 'basico');
        const intermedio = niveles.find(n => n.nivel === 'intermedio');
        const avanzado = niveles.find(n => n.nivel === 'avanzado');

        if (!basico || !intermedio || !avanzado) {
          errores.push(
            `Sub-criterio "${sc.nombre}" no tiene los 3 niveles requeridos (basico, intermedio, avanzado)`,
          );
          continue;
        }

        // Regla 4: rangos consecutivos sin huecos
        const bMax = Number(basico.puntajeMax);
        const iMin = Number(intermedio.puntajeMin);
        const iMax = Number(intermedio.puntajeMax);
        const aMin = Number(avanzado.puntajeMin);

        if (iMin !== bMax + 1) {
          errores.push(
            `Sub-criterio "${sc.nombre}": hueco entre basico(max=${bMax}) e intermedio(min=${iMin})`,
          );
        }
        if (aMin !== iMax + 1) {
          errores.push(
            `Sub-criterio "${sc.nombre}": hueco entre intermedio(max=${iMax}) y avanzado(min=${aMin})`,
          );
        }

        // Regla 5: puntaje_max del avanzado = peso_porcentaje del sub-criterio
        const aMax = Number(avanzado.puntajeMax);
        const pesoSc = Number(sc.pesoPorcentaje);
        if (Math.abs(aMax - pesoSc) > 0.01) {
          errores.push(
            `Sub-criterio "${sc.nombre}": puntaje max avanzado (${aMax}) debe ser igual al peso (${pesoSc})`,
          );
        }
      }
    }

    return { completa: errores.length === 0, errores };
  }

  // --- Helpers privados ---

  // coherencia de rutas anidadas /convocatorias/:convocatoriaId/categorias/:categoriaId/...
  private async ensureCategoria(convocatoriaId: number, categoriaId: number) {
    await this.categoriaService.verificarPerteneceAConvocatoria(categoriaId, convocatoriaId);
  }

  private async ensureCriterioBelongsToCategoria(criterioId: number, categoriaId: number) {
    const row = await this.rubricaRepo.findCriterioByIdAndCategoria(criterioId, categoriaId);
    if (!row) {
      throw new NotFoundException('Criterio no encontrado');
    }
    return row;
  }

  private async ensureSubCriterioBelongsToCategoria(subCriterioId: number, categoriaId: number) {
    const row = await this.rubricaRepo.findSubCriterioByIdAndCategoria(subCriterioId, categoriaId);
    if (!row) {
      throw new NotFoundException('Sub-criterio no encontrado');
    }
    return row;
  }

  private async ensureNivelBelongsToCategoria(nivelId: number, categoriaId: number) {
    const row = await this.rubricaRepo.findNivelByIdAndCategoria(nivelId, categoriaId);
    if (!row) {
      throw new NotFoundException('Nivel de evaluación no encontrado');
    }
    return row;
  }
}
