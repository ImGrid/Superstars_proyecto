import { queryOptions } from "@tanstack/react-query";
import type {
  ListUsuariosQueryDto,
  ListEmpresasQueryDto,
  ListConvocatoriasQueryDto,
  ListPublicacionesQueryDto,
  ListPublicConvocatoriasQueryDto,
  ListPublicPublicacionesQueryDto,
  ListFaqQueryDto,
  ListHistoriasExitoQueryDto,
} from "@superstars/shared";
import { getMe } from "./auth.api";
import { listUsuarios, getUsuario } from "./usuario.api";
import { getMyEmpresa, listEmpresas, getEmpresa } from "./empresa.api";
import {
  listConvocatorias,
  getConvocatoria,
  canPublicar,
  canFinalizar,
  listResponsables,
  getResumenResultados,
  getRankingCategoria,
} from "./convocatoria.api";
import {
  listCategorias,
  getCategoria,
  listCategoriaEvaluadores,
} from "./categoria.api";
import { getFormulario } from "./formulario.api";
import { listDocumentos } from "./documento.api";
import {
  getMyPostulacion,
  listMyPostulaciones,
  listPostulaciones,
  listPostulacionesAdmin,
  getPostulacion,
} from "./postulacion.api";
import { listArchivos } from "./archivo.api";
import { getRubrica, validarRubrica } from "./rubrica.api";
import {
  listPublicaciones,
  getPublicacion,
  listCategoriasAdmin,
} from "./publicacion.api";
import {
  listPublicConvocatorias,
  getPublicConvocatoria,
  getPublicResultados,
  listPublicPublicaciones,
  getPublicPublicacion,
  listPublicCategorias,
  listPublicHistoriasExito,
} from "./public.api";
import {
  listHistoriasExito,
  getHistoriaExito,
} from "./historia-exito.api";
import {
  listMisCategorias,
  listPostulacionesEvaluables,
  getPostulacionDetalle,
  listCalificaciones,
  getCalificacionDetalle,
  listAsignacionesEvaluador,
} from "./evaluacion.api";
import { listPublicFaq, listFaq, listPublicFaqByConvocatoria } from "./faq.api";
import {
  getAdminDashboard,
  getResponsableDashboard,
  getEvaluadorDashboard,
  getProponenteDashboard,
} from "./dashboard.api";

// --- Auth ---

export const authQueries = {
  me: () =>
    queryOptions({
      queryKey: ["auth", "me"],
      queryFn: getMe,
    }),
};

// --- Usuarios ---

export const usuarioQueries = {
  all: () => ["usuarios"] as const,

  list: (filters?: Partial<ListUsuariosQueryDto>) =>
    queryOptions({
      queryKey: ["usuarios", "list", filters ?? {}] as const,
      queryFn: () => listUsuarios(filters),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ["usuarios", "detail", id] as const,
      queryFn: () => getUsuario(id),
    }),
};

// --- Empresas ---

export const empresaQueries = {
  all: () => ["empresas"] as const,

  me: () =>
    queryOptions({
      queryKey: ["empresas", "me"],
      queryFn: getMyEmpresa,
    }),

  list: (filters?: Partial<ListEmpresasQueryDto>) =>
    queryOptions({
      queryKey: ["empresas", "list", filters ?? {}] as const,
      queryFn: () => listEmpresas(filters),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ["empresas", "detail", id] as const,
      queryFn: () => getEmpresa(id),
    }),
};

// --- Convocatorias ---

export const convocatoriaQueries = {
  all: () => ["convocatorias"] as const,

  list: (filters?: Partial<ListConvocatoriasQueryDto>) =>
    queryOptions({
      queryKey: ["convocatorias", "list", filters ?? {}] as const,
      queryFn: () => listConvocatorias(filters),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", id] as const,
      queryFn: () => getConvocatoria(id),
    }),

  canPublicar: (id: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", id, "can-publicar"] as const,
      queryFn: () => canPublicar(id),
    }),

  canFinalizar: (id: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", id, "can-finalizar"] as const,
      queryFn: () => canFinalizar(id),
    }),

  responsables: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "responsables"] as const,
      queryFn: () => listResponsables(convocatoriaId),
    }),

  resumenResultados: () =>
    queryOptions({
      queryKey: ["convocatorias", "resumen-resultados"] as const,
      queryFn: getResumenResultados,
    }),
};

// --- Categorias (el pool de evaluadores y el ranking viven aqui, por categoria) ---

export const categoriaQueries = {
  list: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias"] as const,
      queryFn: () => listCategorias(convocatoriaId),
    }),

  detail: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias", categoriaId] as const,
      queryFn: () => getCategoria(convocatoriaId, categoriaId),
    }),

  evaluadores: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias", categoriaId, "evaluadores"] as const,
      queryFn: () => listCategoriaEvaluadores(convocatoriaId, categoriaId),
    }),

  ranking: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias", categoriaId, "ranking"] as const,
      queryFn: () => getRankingCategoria(convocatoriaId, categoriaId),
    }),
};

// --- Formularios ---

export const formularioQueries = {
  detail: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias", categoriaId, "formulario"] as const,
      queryFn: () => getFormulario(convocatoriaId, categoriaId),
    }),
};

// --- Documentos ---

export const documentoQueries = {
  list: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias", categoriaId, "documentos"] as const,
      queryFn: () => listDocumentos(convocatoriaId, categoriaId),
    }),
};

// --- Postulaciones ---

export const postulacionQueries = {
  all: () => ["postulaciones"] as const,

  mine: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["postulaciones", "mine", convocatoriaId] as const,
      queryFn: () => getMyPostulacion(convocatoriaId),
    }),

  myList: () =>
    queryOptions({
      queryKey: ["postulaciones", "my-list"] as const,
      queryFn: listMyPostulaciones,
    }),

  list: (convocatoriaId: number, estado?: string, categoriaId?: number) =>
    queryOptions({
      queryKey: ["postulaciones", "list", convocatoriaId, categoriaId ?? "all-cat", estado ?? "all"] as const,
      queryFn: () => listPostulaciones(convocatoriaId, estado, categoriaId),
    }),

  detail: (convocatoriaId: number, id: number) =>
    queryOptions({
      queryKey: ["postulaciones", "detail", convocatoriaId, id] as const,
      queryFn: () => getPostulacion(convocatoriaId, id),
    }),

  adminList: (filters: Record<string, unknown>) =>
    queryOptions({
      queryKey: ["postulaciones", "admin-list", filters] as const,
      queryFn: () => listPostulacionesAdmin(filters),
    }),
};

// --- Archivos ---

export const archivoQueries = {
  list: (convocatoriaId: number, postulacionId: number) =>
    queryOptions({
      queryKey: [
        "archivos",
        "list",
        convocatoriaId,
        postulacionId,
      ] as const,
      queryFn: () => listArchivos(convocatoriaId, postulacionId),
    }),
};

// --- Rubrica ---

export const rubricaQueries = {
  detail: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "categorias", categoriaId, "rubrica"] as const,
      queryFn: () => getRubrica(convocatoriaId, categoriaId),
    }),

  validacion: (convocatoriaId: number, categoriaId: number) =>
    queryOptions({
      queryKey: [
        "convocatorias",
        "detail",
        convocatoriaId,
        "categorias",
        categoriaId,
        "rubrica",
        "validacion",
      ] as const,
      queryFn: () => validarRubrica(convocatoriaId, categoriaId),
    }),
};

// --- Publicaciones (admin) ---

export const publicacionQueries = {
  all: () => ["publicaciones"] as const,

  list: (filters?: Partial<ListPublicacionesQueryDto>) =>
    queryOptions({
      queryKey: ["publicaciones", "list", filters ?? {}] as const,
      queryFn: () => listPublicaciones(filters),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ["publicaciones", "detail", id] as const,
      queryFn: () => getPublicacion(id),
    }),

  categorias: () =>
    queryOptions({
      queryKey: ["publicaciones", "categorias"] as const,
      queryFn: listCategoriasAdmin,
    }),
};

// --- Historias de exito (admin) ---

export const historiaExitoQueries = {
  all: () => ["historias-exito"] as const,

  list: (filters?: Partial<ListHistoriasExitoQueryDto>) =>
    queryOptions({
      queryKey: ["historias-exito", "list", filters ?? {}] as const,
      queryFn: () => listHistoriasExito(filters),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ["historias-exito", "detail", id] as const,
      queryFn: () => getHistoriaExito(id),
    }),
};

// --- Endpoints publicos (sin auth) ---

export const publicQueries = {
  convocatorias: (filters?: Partial<ListPublicConvocatoriasQueryDto>) =>
    queryOptions({
      queryKey: ["public", "convocatorias", "list", filters ?? {}] as const,
      queryFn: () => listPublicConvocatorias(filters),
    }),

  convocatoriaDetail: (id: number) =>
    queryOptions({
      queryKey: ["public", "convocatorias", "detail", id] as const,
      queryFn: () => getPublicConvocatoria(id),
    }),

  resultados: (id: number) =>
    queryOptions({
      queryKey: ["public", "convocatorias", "resultados", id] as const,
      queryFn: () => getPublicResultados(id),
    }),

  publicaciones: (filters?: Partial<ListPublicPublicacionesQueryDto>) =>
    queryOptions({
      queryKey: ["public", "publicaciones", "list", filters ?? {}] as const,
      queryFn: () => listPublicPublicaciones(filters),
    }),

  publicacionDetail: (slug: string) =>
    queryOptions({
      queryKey: ["public", "publicaciones", "detail", slug] as const,
      queryFn: () => getPublicPublicacion(slug),
    }),

  categorias: () =>
    queryOptions({
      queryKey: ["public", "publicaciones", "categorias"] as const,
      queryFn: listPublicCategorias,
    }),

  historiasExito: () =>
    queryOptions({
      queryKey: ["public", "historias-exito"] as const,
      queryFn: listPublicHistoriasExito,
    }),
};

// --- Evaluaciones (evaluador) ---

export const evaluacionQueries = {
  all: () => ["evaluaciones"] as const,

  misCategorias: () =>
    queryOptions({
      queryKey: ["evaluaciones", "mis-categorias"] as const,
      queryFn: listMisCategorias,
    }),

  postulaciones: (categoriaId: number) =>
    queryOptions({
      queryKey: ["evaluaciones", "postulaciones", categoriaId] as const,
      queryFn: () => listPostulacionesEvaluables(categoriaId),
    }),

  detalle: (categoriaId: number, postulacionId: number) =>
    queryOptions({
      queryKey: ["evaluaciones", "detalle", categoriaId, postulacionId] as const,
      queryFn: () => getPostulacionDetalle(categoriaId, postulacionId),
    }),
};

// --- Calificaciones (responsable) ---

export const calificacionQueries = {
  all: () => ["calificaciones"] as const,

  list: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["calificaciones", "list", convocatoriaId] as const,
      queryFn: () => listCalificaciones(convocatoriaId),
    }),

  detalle: (convocatoriaId: number, calificacionId: number) =>
    queryOptions({
      queryKey: ["calificaciones", "detalle", convocatoriaId, calificacionId] as const,
      queryFn: () => getCalificacionDetalle(convocatoriaId, calificacionId),
    }),
};

// --- Asignaciones evaluador-postulacion ---

export const asignacionQueries = {
  list: (convocatoriaId: number, postulacionId: number) =>
    queryOptions({
      queryKey: ["asignaciones", "list", convocatoriaId, postulacionId] as const,
      queryFn: () => listAsignacionesEvaluador(convocatoriaId, postulacionId),
    }),
};

// --- FAQ ---

export const faqQueries = {
  all: () => ["faq"] as const,

  list: (filters?: Partial<ListFaqQueryDto>) =>
    queryOptions({
      queryKey: ["faq", "list", filters ?? {}] as const,
      queryFn: () => listFaq(filters),
    }),

  public: () =>
    queryOptions({
      queryKey: ["public", "faq"] as const,
      queryFn: listPublicFaq,
    }),

  byConvocatoria: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["public", "faq", "convocatoria", convocatoriaId] as const,
      queryFn: () => listPublicFaqByConvocatoria(convocatoriaId),
    }),
};

// --- Dashboard (KPIs y trabajo pendiente por rol) ---
// staleTime corto: el dashboard cambia frecuentemente con la actividad del programa

export const dashboardQueries = {
  admin: () =>
    queryOptions({
      queryKey: ["dashboard", "admin"] as const,
      queryFn: getAdminDashboard,
      staleTime: 30 * 1000,
    }),

  responsable: () =>
    queryOptions({
      queryKey: ["dashboard", "responsable"] as const,
      queryFn: getResponsableDashboard,
      staleTime: 30 * 1000,
    }),

  evaluador: () =>
    queryOptions({
      queryKey: ["dashboard", "evaluador"] as const,
      queryFn: getEvaluadorDashboard,
      staleTime: 30 * 1000,
    }),

  proponente: () =>
    queryOptions({
      queryKey: ["dashboard", "proponente"] as const,
      queryFn: getProponenteDashboard,
      staleTime: 30 * 1000,
    }),
};
