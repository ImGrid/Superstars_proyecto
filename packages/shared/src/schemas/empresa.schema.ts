import { z } from 'zod';

// Crear empresa (proponente registra su empresa)
export const createEmpresaSchema = z.object({
  razonSocial: z.string().min(1),
  nit: z.string().min(1),
  registroSeprec: z.string().optional(),
  tipoEmpresa: z.string().optional(),
  departamento: z.string().optional(),
  anioFundacion: z.number().int().positive().optional(),
  rubro: z.string().optional(),
});

// Actualizar empresa
export const updateEmpresaSchema = createEmpresaSchema.partial();

export type CreateEmpresaDto = z.infer<typeof createEmpresaSchema>;
export type UpdateEmpresaDto = z.infer<typeof updateEmpresaSchema>;
