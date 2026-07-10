"use client";

import { Eye } from "lucide-react";
import { RowActions, RowAction } from "@/components/shared/row-actions";

interface EmpresaActionsProps {
  empresaId: number;
}

// La razon social ya lleva al detalle; aca damos la accion explicita compacta.
export function EmpresaActions({ empresaId }: EmpresaActionsProps) {
  return (
    <RowActions>
      <RowAction
        icon={<Eye className="size-4" />}
        label="Ver detalle"
        href={`/dashboard/empresas/${empresaId}`}
      />
    </RowActions>
  );
}
