import { queryOptions } from "@tanstack/react-query";
import type {
  ListUsuariosQueryDto,
  ListEmpresasQueryDto,
  ListConcursosQueryDto,
  ListPublicacionesQueryDto,
  ListPublicConcursosQueryDto,
  ListPublicPublicacionesQueryDto,
  ListFaqQueryDto,
} from "@superstars/shared";
import { getMe } from "./auth.api";
import { listUsuarios, getUsuario } from "./usuario.api";
import { getMyEmpresa, listEmpresas, getEmpresa } from "./empresa.api";
import {
  listConcursos,
  getConcurso,
  canPublicar,
  canFinalizar,
  listResponsables,
  listEvaluadores,
  getResumenResultados,
  getRankingConcurso,
} from "./concurso.api";
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
  listPublicConcursos,
  getPublicConcurso,
  getPublicResultados,
  listPublicPublicaciones,
  getPublicPublicacion,
  listPublicCategorias,
} from "./public.api";
import {
  listMisConcursos,
  listPostulacionesEvaluables,
  getPostulacionDetalle,
  listCalificaciones,
  getCalificacionDetalle,
  listAsignacionesEvaluador,
} from "./evaluacion.api";
import { listPublicFaq, listFaq, listPublicFaqByConcurso } from "./faq.api";

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

// --- Concursos ---

export const concursoQueries = {
  all: () => ["concursos"] as const,

  list: (filters?: Partial<ListConcursosQueryDto>) =>
    queryOptions({
      queryKey: ["concursos", "list", filters ?? {}] as const,
      queryFn: () => listConcursos(filters),
    }),

  detail: (id: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", id] as const,
      queryFn: () => getConcurso(id),
    }),

  canPublicar: (id: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", id, "can-publicar"] as const,
      queryFn: () => canPublicar(id),
    }),

  canFinalizar: (id: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", id, "can-finalizar"] as const,
      queryFn: () => canFinalizar(id),
    }),

  responsables: (concursoId: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", concursoId, "responsables"] as const,
      queryFn: () => listResponsables(concursoId),
    }),

  evaluadores: (concursoId: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", concursoId, "evaluadores"] as const,
      queryFn: () => listEvaluadores(concursoId),
    }),

  resumenResultados: () =>
    queryOptions({
      queryKey: ["concursos", "resumen-resultados"] as const,
      queryFn: getResumenResultados,
    }),

  ranking: (id: number) =>
    queryOptions({
      queryKey: ["concursos", "ranking", id] as const,
      queryFn: () => getRankingConcurso(id),
    }),
};

// --- Formularios ---

export const formularioQueries = {
  detail: (concursoId: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", concursoId, "formulario"] as const,
      queryFn: () => getFormulario(concursoId),
    }),
};

// --- Documentos ---

export const documentoQueries = {
  list: (concursoId: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", concursoId, "documentos"] as const,
      queryFn: () => listDocumentos(concursoId),
    }),
};

// --- Postulaciones ---

export const postulacionQueries = {
  all: () => ["postulaciones"] as const,

  mine: (concursoId: number) =>
    queryOptions({
      queryKey: ["postulaciones", "mine", concursoId] as const,
      queryFn: () => getMyPostulacion(concursoId),
    }),

  myList: () =>
    queryOptions({
      queryKey: ["postulaciones", "my-list"] as const,
      queryFn: listMyPostulaciones,
    }),

  list: (concursoId: number, estado?: string) =>
    queryOptions({
      queryKey: ["postulaciones", "list", concursoId, estado ?? "all"] as const,
      queryFn: () => listPostulaciones(concursoId, estado),
    }),

  detail: (concursoId: number, id: number) =>
    queryOptions({
      queryKey: ["postulaciones", "detail", concursoId, id] as const,
      queryFn: () => getPostulacion(concursoId, id),
    }),

  adminList: (filters: Record<string, unknown>) =>
    queryOptions({
      queryKey: ["postulaciones", "admin-list", filters] as const,
      queryFn: () => listPostulacionesAdmin(filters),
    }),
};

// --- Archivos ---

export const archivoQueries = {
  list: (concursoId: number, postulacionId: number) =>
    queryOptions({
      queryKey: [
        "archivos",
        "list",
        concursoId,
        postulacionId,
      ] as const,
      queryFn: () => listArchivos(concursoId, postulacionId),
    }),
};

// --- Rubrica ---

export const rubricaQueries = {
  detail: (concursoId: number) =>
    queryOptions({
      queryKey: ["concursos", "detail", concursoId, "rubrica"] as const,
      queryFn: () => getRubrica(concursoId),
    }),

  validacion: (concursoId: number) =>
    queryOptions({
      queryKey: [
        "concursos",
        "detail",
        concursoId,
        "rubrica",
        "validacion",
      ] as const,
      queryFn: () => validarRubrica(concursoId),
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
  concursos: (filters?: Partial<ListPublicConcursosQueryDto>) =>
    queryOptions({
      queryKey: ["public", "concursos", "list", filters ?? {}] as const,
      queryFn: () => listPublicConcursos(filters),
    }),

  concursoDetail: (id: number) =>
    queryOptions({
      queryKey: ["public", "concursos", "detail", id] as const,
      queryFn: () => getPublicConcurso(id),
    }),

  resultados: (id: number) =>
    queryOptions({
      queryKey: ["public", "concursos", "resultados", id] as const,
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

  misConcursos: () =>
    queryOptions({
      queryKey: ["evaluaciones", "mis-concursos"] as const,
      queryFn: listMisConcursos,
    }),

  postulaciones: (concursoId: number) =>
    queryOptions({
      queryKey: ["evaluaciones", "postulaciones", concursoId] as const,
      queryFn: () => listPostulacionesEvaluables(concursoId),
    }),

  detalle: (concursoId: number, postulacionId: number) =>
    queryOptions({
      queryKey: ["evaluaciones", "detalle", concursoId, postulacionId] as const,
      queryFn: () => getPostulacionDetalle(concursoId, postulacionId),
    }),
};

// --- Calificaciones (responsable) ---

export const calificacionQueries = {
  all: () => ["calificaciones"] as const,

  list: (concursoId: number) =>
    queryOptions({
      queryKey: ["calificaciones", "list", concursoId] as const,
      queryFn: () => listCalificaciones(concursoId),
    }),

  detalle: (concursoId: number, calificacionId: number) =>
    queryOptions({
      queryKey: ["calificaciones", "detalle", concursoId, calificacionId] as const,
      queryFn: () => getCalificacionDetalle(concursoId, calificacionId),
    }),
};

// --- Asignaciones evaluador-postulacion ---

export const asignacionQueries = {
  list: (concursoId: number, postulacionId: number) =>
    queryOptions({
      queryKey: ["asignaciones", "list", concursoId, postulacionId] as const,
      queryFn: () => listAsignacionesEvaluador(concursoId, postulacionId),
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

  byConcurso: (concursoId: number) =>
    queryOptions({
      queryKey: ["public", "faq", "concurso", concursoId] as const,
      queryFn: () => listPublicFaqByConcurso(concursoId),
    }),
};
