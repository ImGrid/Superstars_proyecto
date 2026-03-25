import {
  LayoutDashboard,
  Users,
  Trophy,
  Building2,
  FileText,
  ClipboardCheck,
  Newspaper,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RolUsuario } from "@superstars/shared";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// items de navegacion del sidebar por rol
const navByRole: Record<RolUsuario, NavItem[]> = {
  [RolUsuario.ADMINISTRADOR]: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Usuarios", href: "/dashboard/usuarios", icon: Users },
    { label: "Concursos", href: "/dashboard/concursos", icon: Trophy },
    { label: "Postulaciones", href: "/dashboard/postulaciones", icon: FileText },
    { label: "Publicaciones", href: "/dashboard/publicaciones", icon: Newspaper },
    { label: "FAQ", href: "/dashboard/faq", icon: HelpCircle },
  ],

  [RolUsuario.RESPONSABLE_CONCURSO]: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Concursos", href: "/dashboard/concursos", icon: Trophy },
    { label: "Postulaciones", href: "/dashboard/postulaciones", icon: FileText },
    { label: "Publicaciones", href: "/dashboard/publicaciones", icon: Newspaper },
    { label: "FAQ", href: "/dashboard/faq", icon: HelpCircle },
  ],

  [RolUsuario.PROPONENTE]: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Concursos", href: "/dashboard/concursos", icon: Trophy },
    { label: "Mi Empresa", href: "/dashboard/mi-empresa", icon: Building2 },
    { label: "Mis Postulaciones", href: "/dashboard/mis-postulaciones", icon: FileText },
  ],

  [RolUsuario.EVALUADOR]: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Mis Evaluaciones", href: "/dashboard/mis-evaluaciones", icon: ClipboardCheck },
  ],
};

// retorna los items de navegacion para un rol
export function getNavItems(rol: RolUsuario): NavItem[] {
  return navByRole[rol] ?? [];
}
