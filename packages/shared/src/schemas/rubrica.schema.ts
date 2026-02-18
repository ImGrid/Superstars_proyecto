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

export const updateRubricaSchema = createRubricaSchema.partial();
export const updateCriterioSchema = createCriterioSchema.partial();
export const updateSubCriterioSchema = createSubCriterioSchema.partial();

export type CreateRubricaDto = z.infer<typeof createRubricaSchema>;
export type CreateCriterioDto = z.infer<typeof createCriterioSchema>;
export type CreateSubCriterioDto = z.infer<typeof createSubCriterioSchema>;
export type CreateNivelEvaluacionDto = z.infer<typeof createNivelEvaluacionSchema>;
export type UpdateRubricaDto = z.infer<typeof updateRubricaSchema>;
export type UpdateCriterioDto = z.infer<typeof updateCriterioSchema>;
export type UpdateSubCriterioDto = z.infer<typeof updateSubCriterioSchema>;
