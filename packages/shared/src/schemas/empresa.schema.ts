import { z } from 'zod';

// Crear empresa (proponente registra su empresa)
export const createEmpresaSchema = z.object({
  // Datos legales (Q7-Q8)
  razonSocial: z.string().min(1),
  nit: z.string().min(1).optional(),
  registroSeprec: z.string().optional(),
  tipoEmpresa: z.string().optional(),

  // Datos generales (Q9-Q16)
  numeroSocios: z.string().optional(),
  numEmpleadosMujeres: z.number().int().min(0).optional(),
  numEmpleadosHombres: z.number().int().min(0).optional(),
  rubro: z.string().optional(),
  anioFundacion: z.number().int().positive().optional(),
  departamento: z.string().optional(),
  ciudad: z.string().optional(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  descripcion: z.string().optional(),

  // Persona de contacto (Q2-Q5)
  contactoCargo: z.string().optional(),
  contactoTelefono: z.string().optional(),
  contactoGenero: z.string().optional(),
  contactoFechaNacimiento: z.string().date().optional(),
});

// Actualizar empresa
export const updateEmpresaSchema = createEmpresaSchema.partial();

// Query params para listar empresas (admin)
export const listEmpresasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().min(1).optional(),
});

export type CreateEmpresaDto = z.infer<typeof createEmpresaSchema>;
export type UpdateEmpresaDto = z.infer<typeof updateEmpresaSchema>;
export type ListEmpresasQueryDto = z.infer<typeof listEmpresasQuerySchema>;

// GET /empresas/:id, GET /empresas/me, POST /empresas, PATCH /empresas/me
export interface EmpresaResponse {
  id: number;
  usuarioId: number;
  razonSocial: string;
  nit: string | null;
  registroSeprec: string | null;
  tipoEmpresa: string | null;
  numeroSocios: string | null;
  numEmpleadosMujeres: number | null;
  numEmpleadosHombres: number | null;
  rubro: string | null;
  anioFundacion: number | null;
  departamento: string | null;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  descripcion: string | null;
  contactoCargo: string | null;
  contactoTelefono: string | null;
  contactoGenero: string | null;
  contactoFechaNacimiento: string | null;
  createdAt: string;
  updatedAt: string;
}
