import { queryOptions } from "@tanstack/react-query";
import type {
  ListUsuariosQueryDto,
  ListEmpresasQueryDto,
  ListConvocatoriasQueryDto,
  ListPublicacionesQueryDto,
  ListPublicConvocatoriasQueryDto,
  ListPublicPublicacionesQueryDto,
  ListFaqQueryDto,
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
  listEvaluadores,
  getResumenResultados,
  getRankingConvocatoria,
} from "./convocatoria.api";
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
} from "./public.api";
import {
  listMisConvocatorias,
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

  evaluadores: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "evaluadores"] as const,
      queryFn: () => listEvaluadores(convocatoriaId),
    }),

  resumenResultados: () =>
    queryOptions({
      queryKey: ["convocatorias", "resumen-resultados"] as const,
      queryFn: getResumenResultados,
    }),

  ranking: (id: number) =>
    queryOptions({
      queryKey: ["convocatorias", "ranking", id] as const,
      queryFn: () => getRankingConvocatoria(id),
    }),
};

// --- Formularios ---

export const formularioQueries = {
  detail: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "formulario"] as const,
      queryFn: () => getFormulario(convocatoriaId),
    }),
};

// --- Documentos ---

export const documentoQueries = {
  list: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "documentos"] as const,
      queryFn: () => listDocumentos(convocatoriaId),
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

  list: (convocatoriaId: number, estado?: string) =>
    queryOptions({
      queryKey: ["postulaciones", "list", convocatoriaId, estado ?? "all"] as const,
      queryFn: () => listPostulaciones(convocatoriaId, estado),
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
  detail: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["convocatorias", "detail", convocatoriaId, "rubrica"] as const,
      queryFn: () => getRubrica(convocatoriaId),
    }),

  validacion: (convocatoriaId: number) =>
    queryOptions({
      queryKey: [
        "convocatorias",
        "detail",
        convocatoriaId,
        "rubrica",
        "validacion",
      ] as const,
      queryFn: () => validarRubrica(convocatoriaId),
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
};

// --- Evaluaciones (evaluador) ---

export const evaluacionQueries = {
  all: () => ["evaluaciones"] as const,

  misConvocatorias: () =>
    queryOptions({
      queryKey: ["evaluaciones", "mis-convocatorias"] as const,
      queryFn: listMisConvocatorias,
    }),

  postulaciones: (convocatoriaId: number) =>
    queryOptions({
      queryKey: ["evaluaciones", "postulaciones", convocatoriaId] as const,
      queryFn: () => listPostulacionesEvaluables(convocatoriaId),
    }),

  detalle: (convocatoriaId: number, postulacionId: number) =>
    queryOptions({
      queryKey: ["evaluaciones", "detalle", convocatoriaId, postulacionId] as const,
      queryFn: () => getPostulacionDetalle(convocatoriaId, postulacionId),
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
};
