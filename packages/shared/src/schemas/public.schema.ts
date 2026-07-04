import { z } from 'zod';

// Query params para listar convocatorias publicas
export const listPublicConvocatoriasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().optional(),
  // activas = publicado, anteriores = cerrado/en_evaluacion/finalizado
  tipo: z.enum(['activas', 'anteriores']).default('activas'),
});

export type ListPublicConvocatoriasQueryDto = z.infer<typeof listPublicConvocatoriasQuerySchema>;

import { EstadoConvocatoria } from '../enums';
import type { SchemaDefinition } from './formulario.schema';

// GET /public/convocatorias (el premio/bases viven en las categorias)
export interface PublicConvocatoriaResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
  fechaCierreEfectiva: string | null;
  departamentos: string[];
  estado: EstadoConvocatoria;
  imagenKey: string | null;
  fechaPublicacionResultados: string | null;
  createdAt: string;
  updatedAt: string;
}

// Documento publico (metadata sin storageKey; no incluye los de proposito 'jurado')
export interface PublicDocumentoResponse {
  id: number;
  nombre: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  orden: number;
}

// Formulario publico (metadata + schema)
export interface PublicFormularioResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  schemaDefinition: SchemaDefinition;
  version: number;
}

// Categoria en el detalle publico: metadata + su formulario + sus documentos
export interface PublicCategoriaDetail {
  id: number;
  nombre: string;
  descripcion: string | null;
  bases: string | null;
  monto: string;
  numeroGanadores: number;
  orden: number;
  formulario: PublicFormularioResponse | null;
  documentos: PublicDocumentoResponse[];
}

// GET /public/convocatorias/:id (incluye sus categorias con formulario y documentos)
export interface PublicConvocatoriaDetailResponse extends PublicConvocatoriaResponse {
  categorias: PublicCategoriaDetail[];
}

// GET /public/convocatorias/:id/resultados (ganadores agrupados por categoria)
export interface PublicResultadoGanador {
  empresaNombre: string;
  posicionFinal: number;
}

export interface PublicResultadoCategoria {
  categoriaId: number;
  categoriaNombre: string;
  monto: string;
  ganadores: PublicResultadoGanador[];
}

export interface PublicResultadosResponse {
  convocatoriaNombre: string;
  fechaPublicacionResultados: string;
  categorias: PublicResultadoCategoria[];
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
