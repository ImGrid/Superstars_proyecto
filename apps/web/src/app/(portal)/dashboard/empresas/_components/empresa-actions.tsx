"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmpresaActionsProps {
  empresaId: number;
}

// Boton directo Ver detalle. Sin dropdown porque el admin tiene una sola
// accion sobre una empresa (ver). Si en el futuro se agregan mas (ej:
// exportar datos), refactorizar a un dropdown como UsuarioActions.
export function EmpresaActions({ empresaId }: EmpresaActionsProps) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/dashboard/empresas/${empresaId}`}>
        <Eye className="size-4" />
        Ver detalle
      </Link>
    </Button>
  );
}
