import { z } from 'zod';

// Proposito / audiencia de un documento de categoria.
// informativo: publico/proponente lo lee (bases, criterios).
// plantilla: el proponente lo descarga, llena y sube (formulario, presupuesto).
// jurado: exclusivo para los evaluadores del pool de la categoria (guia de evaluacion).
export const propositoDocumentoValues = ['informativo', 'plantilla', 'jurado'] as const;
export const propositoDocumentoSchema = z.enum(propositoDocumentoValues);
export type PropositoDocumento = z.infer<typeof propositoDocumentoSchema>;

// Crear documento de la categoria (nombre/proposito vienen en multipart junto al archivo)
export const createDocumentoSchema = z.object({
  nombre: z.string().min(1),
  orden: z.number().int().min(0).optional(),
  proposito: propositoDocumentoSchema.default('informativo'),
});

// Actualizar metadatos del documento (sin archivo, JSON body)
export const updateDocumentoSchema = z.object({
  nombre: z.string().min(1).optional(),
  orden: z.number().int().min(0).optional(),
  proposito: propositoDocumentoSchema.optional(),
});

export type CreateDocumentoDto = z.infer<typeof createDocumentoSchema>;
export type UpdateDocumentoDto = z.infer<typeof updateDocumentoSchema>;

// GET /convocatorias/:convocatoriaId/categorias/:categoriaId/documentos, POST, PUT
export interface DocumentoResponse {
  id: number;
  categoriaId: number;
  nombre: string;
  storageKey: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  orden: number;
  proposito: PropositoDocumento;
  createdAt: string;
}
