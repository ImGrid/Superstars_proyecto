import { RolUsuario } from "@superstars/shared";

export interface NavItem {
  label: string;
  href: string;
  // nombre del icono Iconify (ej: "ph:trophy-duotone")
  icon: string;
}

// items de navegacion del sidebar por rol
const navByRole: Record<RolUsuario, NavItem[]> = {
  [RolUsuario.ADMINISTRADOR]: [
    { label: "Dashboard", href: "/dashboard", icon: "ph:squares-four-duotone" },
    { label: "Usuarios", href: "/dashboard/usuarios", icon: "ph:users-three-duotone" },
    { label: "Concursos", href: "/dashboard/concursos", icon: "ph:trophy-duotone" },
    { label: "Postulaciones", href: "/dashboard/postulaciones", icon: "ph:file-text-duotone" },
    { label: "Resultados", href: "/dashboard/resultados", icon: "ph:chart-line-up-duotone" },
    { label: "Publicaciones", href: "/dashboard/publicaciones", icon: "ph:newspaper-duotone" },
    { label: "FAQ", href: "/dashboard/faq", icon: "ph:question-duotone" },
  ],

  [RolUsuario.RESPONSABLE_CONCURSO]: [
    { label: "Dashboard", href: "/dashboard", icon: "ph:squares-four-duotone" },
    { label: "Concursos", href: "/dashboard/concursos", icon: "ph:trophy-duotone" },
    { label: "Postulaciones", href: "/dashboard/postulaciones", icon: "ph:file-text-duotone" },
    { label: "Resultados", href: "/dashboard/resultados", icon: "ph:chart-line-up-duotone" },
    { label: "Publicaciones", href: "/dashboard/publicaciones", icon: "ph:newspaper-duotone" },
    { label: "FAQ", href: "/dashboard/faq", icon: "ph:question-duotone" },
  ],

  [RolUsuario.PROPONENTE]: [
    { label: "Dashboard", href: "/dashboard", icon: "ph:squares-four-duotone" },
    { label: "Concursos", href: "/dashboard/concursos", icon: "ph:trophy-duotone" },
    { label: "Mi Empresa", href: "/dashboard/mi-empresa", icon: "ph:building-office-duotone" },
    { label: "Mis Postulaciones", href: "/dashboard/mis-postulaciones", icon: "ph:file-text-duotone" },
  ],

  [RolUsuario.EVALUADOR]: [
    { label: "Dashboard", href: "/dashboard", icon: "ph:squares-four-duotone" },
    { label: "Mis Evaluaciones", href: "/dashboard/mis-evaluaciones", icon: "ph:clipboard-text-duotone" },
  ],
};

// retorna los items de navegacion para un rol
export function getNavItems(rol: RolUsuario): NavItem[] {
  return navByRole[rol] ?? [];
}
