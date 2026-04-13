import { z } from 'zod';

// Query params para listar concursos publicos
export const listPublicConcursosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().optional(),
  // activos = publicado, anteriores = cerrado/en_evaluacion/finalizado
  tipo: z.enum(['activos', 'anteriores']).default('activos'),
});

export type ListPublicConcursosQueryDto = z.infer<typeof listPublicConcursosQuerySchema>;

import { EstadoConcurso } from '../enums';
import type { SchemaDefinition } from './formulario.schema';

// GET /public/concursos (excluye createdBy y topNSistema)
export interface PublicConcursoResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  bases: string | null;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
  fechaCierreEfectiva: string | null;
  montoPremio: string;
  numeroGanadores: number;
  departamentos: string[];
  estado: EstadoConcurso;
  fechaPublicacionResultados: string | null;
  createdAt: string;
  updatedAt: string;
}

// Documento publico (metadata sin storageKey)
export interface PublicDocumentoResponse {
  id: number;
  nombre: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  orden: number;
}

// GET /public/concursos/:id (incluye formulario y documentos)
export interface PublicConcursoDetailResponse extends PublicConcursoResponse {
  formulario: {
    id: number;
    nombre: string;
    descripcion: string | null;
    schemaDefinition: SchemaDefinition;
    version: number;
  } | null;
  documentos: PublicDocumentoResponse[];
}

// GET /public/concursos/:id/resultados
export interface PublicResultadoGanador {
  empresaNombre: string;
  posicionFinal: number;
}

export interface PublicResultadosResponse {
  concursoNombre: string;
  fechaPublicacionResultados: string;
  ganadores: PublicResultadoGanador[];
}

// GET /public/publicaciones (lista, sin contenido, con categoriaNombre)
export interface PublicPublicacionListItem {
  id: number;
  titulo: string;
  slug: string;
  extracto: string | null;
  categoriaId: number | null;
  imagenDestacadaKey: string | null;
  fechaPublicacion: string;
  destacado: boolean;
  categoriaNombre: string | null;
}

// GET /public/publicaciones/:slug (detalle con contenido)
export interface PublicPublicacionResponse {
  id: number;
  titulo: string;
  slug: string;
  extracto: string | null;
  contenido: string;
  categoriaId: number | null;
  imagenDestacadaKey: string | null;
  fechaPublicacion: string;
  destacado: boolean;
  categoriaNombre: string | null;
}
