"use client";

import { memo, useCallback, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Lock,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { FormField } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { SchemaAction } from "./_lib/schema-reducer";
import type { BuilderWarning } from "./_lib/builder-validation";
import { getWarningsForItem } from "./_lib/builder-validation";
import { campoTypeMap } from "./_lib/campo-types";

interface CampoItemProps {
  campo: FormField;
  seccionId: string;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  warnings: BuilderWarning[];
  dispatch: (action: SchemaAction) => void;
  onEdit: (seccionId: string, campo: FormField) => void;
}

export const CampoItem = memo(function CampoItem({
  campo,
  seccionId,
  isFirst,
  isLast,
  canEdit,
  warnings,
  dispatch,
  onEdit,
}: CampoItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const typeInfo = campoTypeMap[campo.tipo];
  const Icon = typeInfo.icon;
  const campoWarnings = getWarningsForItem(warnings, campo.id);
  const hasError = campoWarnings.some((w) => w.severity === "error");

  const handleDelete = useCallback(() => {
    dispatch({
      type: "DELETE_CAMPO",
      payload: { seccionId, campoId: campo.id },
    });
    setDeleteOpen(false);
  }, [seccionId, campo.id, dispatch]);

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary-50 ${
        hasError ? "bg-destructive/5" : ""
      }`}
    >
      {/* icono tipo */}
      <Icon className="size-4 shrink-0 text-secondary-400" />

      {/* etiqueta */}
      <span className="min-w-0 flex-1 truncate text-sm text-secondary-800">
        {campo.etiqueta || (
          <span className="italic text-secondary-400">Sin etiqueta</span>
        )}
      </span>

      {/* badges */}
      <Badge variant="outline" className="shrink-0 text-xs text-secondary-500">
        {typeInfo.label}
      </Badge>
      {campo.requerido && (
        <span className="shrink-0 text-sm font-bold text-destructive">*</span>
      )}
      {hasError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertCircle className="size-4 shrink-0 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            {campoWarnings.map((w) => (
              <p key={w.message}>{w.message}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      )}

      {/* acciones */}
      {canEdit && (
        <div className="flex shrink-0 items-center gap-0.5">
          {campo.fijo && <Lock className="size-3.5 text-secondary-400" />}

          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={isFirst}
            onClick={() =>
              dispatch({
                type: "REORDER_CAMPO",
                payload: { seccionId, campoId: campo.id, direction: "up" },
              })
            }
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={isLast}
            onClick={() =>
              dispatch({
                type: "REORDER_CAMPO",
                payload: { seccionId, campoId: campo.id, direction: "down" },
              })
            }
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => onEdit(seccionId, campo)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
      {/* dialogo confirmar eliminacion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar campo"
        description={`Se eliminara el campo "${campo.etiqueta || "Sin etiqueta"}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
});
