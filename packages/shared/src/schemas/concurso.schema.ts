import { z } from 'zod';

// Crear concurso (chk_concurso_monto: monto_premio > 0, chk_concurso_ganadores: numero_ganadores > 0, chk_concurso_top_n: top_n_sistema > 0)
export const createConcursoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().date(),
  fechaCierrePostulacion: z.string().date(),
  fechaAnuncioGanadores: z.string().date().optional(),
  montoPremio: z.number().positive(),
  numeroGanadores: z.number().int().positive().default(3),
  topNSistema: z.number().int().positive().default(5),
  departamentos: z.array(z.string()).min(1),
}).refine(
  // chk_concurso_fechas: fecha_cierre_postulacion >= fecha_inicio_postulacion
  (data) => data.fechaCierrePostulacion >= data.fechaInicioPostulacion,
  { message: 'La fecha de cierre debe ser igual o posterior a la fecha de inicio', path: ['fechaCierrePostulacion'] },
);

// Actualizar concurso (solo en estado borrador)
export const updateConcursoSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().date().optional(),
  fechaCierrePostulacion: z.string().date().optional(),
  fechaAnuncioGanadores: z.string().date().optional(),
  montoPremio: z.number().positive().optional(),
  numeroGanadores: z.number().int().positive().optional(),
  topNSistema: z.number().int().positive().optional(),
  departamentos: z.array(z.string()).min(1).optional(),
});

export type CreateConcursoDto = z.infer<typeof createConcursoSchema>;
export type UpdateConcursoDto = z.infer<typeof updateConcursoSchema>;
