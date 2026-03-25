"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import React from "react";

// mapeo de segmentos de ruta a labels legibles
const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  usuarios: "Usuarios",
  concursos: "Concursos",
  publicaciones: "Publicaciones",
  "mi-empresa": "Mi Empresa",
  "mis-postulaciones": "Mis Postulaciones",
  "mis-evaluaciones": "Mis Evaluaciones",
  nuevo: "Nuevo",
  editar: "Editar",
};

function buildBreadcrumbs(pathname: string) {
  // /dashboard/concursos/5/editar → ["dashboard", "concursos", "5", "editar"]
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label =
      segmentLabels[segment] ?? (isNaN(Number(segment)) ? segment : `#${segment}`);
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function PortalHeader() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <React.Fragment key={crumb.href}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
