import { z } from 'zod';
import { TipoCriterio, NivelEnum } from '../enums';

// Crear rubrica (chk_rubrica_puntaje: puntaje_total > 0)
export const createRubricaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  puntajeTotal: z.number().positive().default(100),
});

// Crear criterio (chk_criterio_peso: > 0 AND <= 100, chk_criterio_orden: > 0)
export const createCriterioSchema = z.object({
  tipo: z.nativeEnum(TipoCriterio),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  pesoPorcentaje: z.number().positive().max(100),
  orden: z.number().int().positive(),
});

// Crear sub-criterio (chk_sub_criterio_peso: > 0 AND <= 100, chk_sub_criterio_orden: > 0)
export const createSubCriterioSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  pesoPorcentaje: z.number().positive().max(100),
  orden: z.number().int().positive(),
});

// Crear nivel de evaluacion (chk_nivel_rango: puntaje_max >= puntaje_min AND puntaje_min >= 0)
export const createNivelEvaluacionSchema = z.object({
  nivel: z.nativeEnum(NivelEnum),
  descripcion: z.string().min(1),
  puntajeMin: z.number().min(0),
  puntajeMax: z.number().min(0),
}).refine(
  (data) => data.puntajeMax >= data.puntajeMin,
  { message: 'El puntaje maximo debe ser mayor o igual al minimo', path: ['puntajeMax'] },
);

// Crear sub-criterio con 3 niveles atomicamente (ruta flat, criterioId en body)
export const createSubCriterioConNivelesSchema = z.object({
  criterioId: z.number().int().positive(),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  pesoPorcentaje: z.number().positive().max(100),
  orden: z.number().int().positive(),
  niveles: z.array(createNivelEvaluacionSchema).length(3),
}).refine(
  (data) => {
    const tipos = data.niveles.map(n => n.nivel);
    return tipos.includes(NivelEnum.BASICO)
      && tipos.includes(NivelEnum.INTERMEDIO)
      && tipos.includes(NivelEnum.AVANZADO);
  },
  { message: 'Debe incluir exactamente un nivel basico, intermedio y avanzado', path: ['niveles'] },
);

export const updateRubricaSchema = createRubricaSchema.partial();
export const updateCriterioSchema = createCriterioSchema.partial();
export const updateSubCriterioSchema = createSubCriterioSchema.partial();

// Actualizar nivel individual (nivel NO se puede cambiar, es parte del UNIQUE)
export const updateNivelEvaluacionSchema = z.object({
  descripcion: z.string().min(1).optional(),
  puntajeMin: z.number().min(0).optional(),
  puntajeMax: z.number().min(0).optional(),
}).refine(
  (data) => {
    if (data.puntajeMin !== undefined && data.puntajeMax !== undefined) {
      return data.puntajeMax >= data.puntajeMin;
    }
    return true;
  },
  { message: 'El puntaje maximo debe ser mayor o igual al minimo', path: ['puntajeMax'] },
);

export type CreateRubricaDto = z.infer<typeof createRubricaSchema>;
export type CreateCriterioDto = z.infer<typeof createCriterioSchema>;
export type CreateSubCriterioDto = z.infer<typeof createSubCriterioSchema>;
export type CreateNivelEvaluacionDto = z.infer<typeof createNivelEvaluacionSchema>;
export type CreateSubCriterioConNivelesDto = z.infer<typeof createSubCriterioConNivelesSchema>;
export type UpdateRubricaDto = z.infer<typeof updateRubricaSchema>;
export type UpdateCriterioDto = z.infer<typeof updateCriterioSchema>;
export type UpdateSubCriterioDto = z.infer<typeof updateSubCriterioSchema>;
export type UpdateNivelEvaluacionDto = z.infer<typeof updateNivelEvaluacionSchema>;

// PUT /rubrica/niveles/:id
export interface NivelEvaluacionResponse {
  id: number;
  subCriterioId: number;
  nivel: NivelEnum;
  descripcion: string;
  puntajeMin: string;
  puntajeMax: string;
}

// PUT /rubrica/sub-criterios/:id
export interface SubCriterioResponse {
  id: number;
  criterioId: number;
  nombre: string;
  descripcion: string | null;
  pesoPorcentaje: string;
  orden: number;
}

// POST /rubrica/sub-criterios (creacion atomica con 3 niveles)
export interface SubCriterioConNivelesResponse extends SubCriterioResponse {
  niveles: NivelEvaluacionResponse[];
}

// POST /rubrica/criterios, PUT /rubrica/criterios/:id
export interface CriterioResponse {
  id: number;
  rubricaId: number;
  tipo: TipoCriterio;
  nombre: string;
  descripcion: string | null;
  pesoPorcentaje: string;
  orden: number;
}

// POST /rubrica, PUT /rubrica (sin relaciones)
export interface RubricaResponse {
  id: number;
  convocatoriaId: number;
  nombre: string;
  descripcion: string | null;
  puntajeTotal: string;
  createdAt: string;
  updatedAt: string;
}

// GET /rubrica (arbol completo con 4 niveles anidados)
export interface RubricaFullResponse extends RubricaResponse {
  criterios: (CriterioResponse & {
    subCriterios: (SubCriterioResponse & {
      nivelEvaluacions: NivelEvaluacionResponse[];
    })[];
  })[];
}

// GET /rubrica/validar
export interface RubricaValidacionResponse {
  completa: boolean;
  errores: string[];
}
