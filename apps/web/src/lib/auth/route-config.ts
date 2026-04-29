import { RolUsuario } from "@superstars/shared";

// mapa de rutas del portal a roles permitidos (default deny)
// las rutas publicas no se listan aqui (se manejan en proxy.ts)
// las rutas no listadas redirigen a /dashboard
interface RouteRule {
  path: string;
  roles: RolUsuario[];
}

// rutas del portal con sus roles permitidos
// el orden importa: se evalua de mas especifica a mas general
const portalRoutes: RouteRule[] = [
  // admin: gestion de usuarios
  { path: "/dashboard/usuarios", roles: [RolUsuario.ADMINISTRADOR] },

  // admin + responsable + proponente: convocatorias (proponente ve solo publicadas)
  { path: "/dashboard/convocatorias", roles: [RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE] },
  { path: "/dashboard/publicaciones", roles: [RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA] },
  { path: "/dashboard/postulaciones", roles: [RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA] },
  { path: "/dashboard/faq", roles: [RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA] },

  // proponente: empresa y postulaciones propias
  { path: "/dashboard/mi-empresa", roles: [RolUsuario.PROPONENTE] },
  { path: "/dashboard/mis-postulaciones", roles: [RolUsuario.PROPONENTE] },

  // evaluador: evaluaciones asignadas
  { path: "/dashboard/mis-evaluaciones", roles: [RolUsuario.EVALUADOR] },

  // dashboard principal: todos los autenticados
  { path: "/dashboard", roles: [RolUsuario.ADMINISTRADOR, RolUsuario.RESPONSABLE_CONVOCATORIA, RolUsuario.PROPONENTE, RolUsuario.EVALUADOR] },
];

// verifica si un rol tiene acceso a una ruta del portal
export function isRoleAllowed(pathname: string, rol: RolUsuario): boolean {
  // buscar la regla mas especifica que coincida
  const rule = portalRoutes.find(
    (r) => pathname === r.path || pathname.startsWith(r.path + "/"),
  );

  // default deny: si no hay regla, no tiene acceso
  if (!rule) return false;

  return rule.roles.includes(rol);
}

// ruta default por rol (a donde redirigir despues del login)
export function getDefaultRoute(rol: RolUsuario): string {
  switch (rol) {
    case RolUsuario.ADMINISTRADOR:
      return "/dashboard";
    case RolUsuario.RESPONSABLE_CONVOCATORIA:
      return "/dashboard/convocatorias";
    case RolUsuario.PROPONENTE:
      return "/dashboard/mis-postulaciones";
    case RolUsuario.EVALUADOR:
      return "/dashboard/mis-evaluaciones";
    default:
      return "/dashboard";
  }
}
