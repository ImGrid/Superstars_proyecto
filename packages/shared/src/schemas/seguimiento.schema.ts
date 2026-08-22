import { EstadoConvocatoria, EstadoPostulacion, TipoCriterio, NivelEnum } from '../enums';
import type { PropositoDocumento } from './documento.schema';
import type { SchemaDefinition } from './formulario.schema';

// Tipos de respuesta del portal de seguimiento (rol observador / financiador).
//
// Son la contraparte tipada de las proyecciones de apps/api ObservadorRepository.
// Cada shape lista SOLO los campos que el observador tiene permitido ver: nunca
// calificaciones por jurado, archivos de las postulaciones, documentos de
// proposito jurado ni datos de empresa mas alla de la razon social. Si algun dia
// se agrega un campo aca, tiene que agregarse tambien en la proyeccion del
// backend; el backend es la fuente de verdad y no expone nada que no este alli.

// --- Convocatorias ---

// Item del listado (GET /seguimiento/convocatorias)
export interface SeguimientoConvocatoriaListItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoConvocatoria;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
  fechaPublicacionResultados: string | null;
  departamentos: string[];
  // se expone si hay imagen, no la clave de almacenamiento
  tieneImagen: boolean;
  numCategorias: number;
  numPostulaciones: number;
  createdAt: string;
}

// Detalle (GET /seguimiento/convocatorias/:id)
export interface SeguimientoConvocatoriaDetalle {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: EstadoConvocatoria;
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaCierreEfectiva: string | null;
  fechaAnuncioGanadores: string | null;
  fechaPublicacionResultados: string | null;
  departamentos: string[];
  tieneImagen: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Categorias ---

// Item del listado (GET /seguimiento/convocatorias/:id/categorias). Sin conteos
// de jurado: el observador no ve nada del jurado, ni su volumen.
export interface SeguimientoCategoria {
  id: number;
  convocatoriaId: number;
  nombre: string;
  descripcion: string | null;
  bases: string | null;
  // numeric de Postgres: llega como string
  monto: string;
  numeroGanadores: number;
  orden: number;
  fechaSeleccionGanadores: string | null;
  tieneFormulario: boolean;
  tieneRubrica: boolean;
  numPostulaciones: number;
}

// --- Formulario (estructura, no respuestas) ---

export interface SeguimientoFormulario {
  id: number;
  categoriaId: number;
  nombre: string;
  descripcion: string | null;
  schemaDefinition: SchemaDefinition;
  version: number;
  updatedAt: string;
}

// --- Rubrica (criterios de evaluacion, sin notas de nadie) ---

// Nivel de evaluacion de un sub-criterio (basico/intermedio/avanzado con su
// rango de puntaje). Es lo que define como se evalua cada sub-criterio.
export interface SeguimientoNivel {
  id: number;
  subCriterioId: number;
  nivel: NivelEnum;
  descripcion: string;
  // numeric: llegan como string
  puntajeMin: string;
  puntajeMax: string;
}

export interface SeguimientoSubCriterio {
  id: number;
  criterioId: number;
  nombre: string;
  descripcion: string | null;
  // numeric: llega como string
  pesoPorcentaje: string;
  orden: number;
  niveles: SeguimientoNivel[];
}

export interface SeguimientoCriterio {
  id: number;
  nombre: string;
  descripcion: string | null;
  tipo: TipoCriterio;
  pesoPorcentaje: string;
  orden: number;
  subCriterios: SeguimientoSubCriterio[];
}

export interface SeguimientoRubrica {
  id: number;
  categoriaId: number;
  nombre: string;
  descripcion: string | null;
  puntajeTotal: string;
  criterios: SeguimientoCriterio[];
}

// --- Documentos de la convocatoria (nunca proposito jurado) ---

export interface SeguimientoDocumento {
  id: number;
  nombre: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  proposito: PropositoDocumento;
  orden: number;
  createdAt: string;
}

// --- Postulaciones ---

// Item del listado. Sin responseData ni datos de jurado. La empresa solo por
// razon social.
export interface SeguimientoPostulacionListItem {
  id: number;
  convocatoriaId: number;
  categoriaId: number;
  empresaRazonSocial: string;
  estado: EstadoPostulacion;
  // numeric: llega como string
  porcentajeCompletado: string;
  fechaEnvio: string | null;
  observacion: string | null;
  puntajeFinal: string | null;
  posicionFinal: number | null;
  createdAt: string;
  updatedAt: string;
}

// Detalle: agrega las respuestas del formulario. Los adjuntos NO se exponen: en
// responseData un campo de tipo archivo guarda solo IDs numericos, opacos sin el
// endpoint de archivos (que el observador no tiene).
export interface SeguimientoPostulacionDetalle extends SeguimientoPostulacionListItem {
  responseData: Record<string, unknown>;
  schemaVersion: number;
}

// --- Ranking (puntaje final consolidado, nunca notas por jurado) ---
// OJO: aca puntajeFinal es number|null (el service lo convierte con Number()),
// a diferencia del listado de postulaciones donde llega como string.
export interface SeguimientoRankingItem {
  postulacionId: number;
  empresaRazonSocial: string;
  puntajeFinal: number | null;
  posicionFinal: number | null;
  estado: EstadoPostulacion;
  fechaEnvio: string | null;
}

// --- Resumen general ---

export interface SeguimientoResumen {
  totalConvocatorias: number;
  postulacionesPorEstado: Array<{
    estado: EstadoPostulacion;
    total: number;
  }>;
}
