import { z } from 'zod';

// Guardar borrador de postulacion (response_data es JSONB flexible)
export const savePostulacionDraftSchema = z.object({
  responseData: z.record(z.string(), z.unknown()),
});

// Observar postulacion (responsable agrega observacion)
export const observarPostulacionSchema = z.object({
  observacion: z.string().min(1),
});

export type SavePostulacionDraftDto = z.infer<typeof savePostulacionDraftSchema>;
export type ObservarPostulacionDto = z.infer<typeof observarPostulacionSchema>;

import { EstadoPostulacion } from '../enums';

// GET /postulaciones/:id, PUT /draft, POST /enviar, POST /observar, POST /rechazar
export interface PostulacionResponse {
  id: number;
  convocatoriaId: number;
  empresaId: number;
  estado: EstadoPostulacion;
  responseData: Record<string, unknown>;
  schemaVersion: number;
  porcentajeCompletado: string;
  fechaEnvio: string | null;
  observacion: string | null;
  puntajeFinal: string | null;
  posicionFinal: number | null;
  createdAt: string;
  updatedAt: string;
  empresaRazonSocial: string;
}

// GET /convocatorias/:convocatoriaId/postulaciones (lista sin responseData)
export interface PostulacionListItem {
  id: number;
  convocatoriaId: number;
  empresaId: number;
  estado: EstadoPostulacion;
  porcentajeCompletado: string;
  fechaEnvio: string | null;
  observacion: string | null;
  puntajeFinal: string | null;
  posicionFinal: number | null;
  createdAt: string;
  updatedAt: string;
  empresaRazonSocial: string;
  // conteo de calificaciones en estado 'completado' pendientes de revision
  calificacionesPendientes: number;
  // campos extra del JOIN con convocatoria (solo en /mis-postulaciones)
  convocatoriaNombre?: string;
  convocatoriaEstado?: string;
}

// GET /postulaciones (cross-convocatoria, admin/responsable)
export const listPostulacionesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  convocatoriaId: z.coerce.number().int().positive().optional(),
  estado: z.string().optional(),
});

export type ListPostulacionesQueryDto = z.infer<typeof listPostulacionesQuerySchema>;

// item del listado cross-convocatoria con nombre de empresa y convocatoria
export interface PostulacionAdminListItem {
  id: number;
  convocatoriaId: number;
  empresaId: number;
  estado: EstadoPostulacion;
  porcentajeCompletado: string;
  fechaEnvio: string | null;
  observacion: string | null;
  puntajeFinal: string | null;
  posicionFinal: number | null;
  createdAt: string;
  updatedAt: string;
  empresaRazonSocial: string;
  convocatoriaNombre: string;
  calificacionesPendientes: number;
}

// POST /archivos, GET /archivos
export interface ArchivoResponse {
  id: number;
  postulacionId: number;
  fieldId: string;
  nombreOriginal: string;
  storageKey: string;
  mimeType: string;
  tamanoBytes: number;
  createdAt: string;
}
