import { z } from 'zod';

// Crear documento del concurso (nombre viene en multipart junto al archivo)
export const createDocumentoSchema = z.object({
  nombre: z.string().min(1),
  orden: z.number().int().min(0).optional(),
});

// Actualizar metadatos del documento (sin archivo, JSON body)
export const updateDocumentoSchema = z.object({
  nombre: z.string().min(1).optional(),
  orden: z.number().int().min(0).optional(),
});

export type CreateDocumentoDto = z.infer<typeof createDocumentoSchema>;
export type UpdateDocumentoDto = z.infer<typeof updateDocumentoSchema>;

// GET /concursos/:concursoId/documentos, POST, PUT
export interface DocumentoResponse {
  id: number;
  concursoId: number;
  nombre: string;
  storageKey: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  orden: number;
  createdAt: string;
}
