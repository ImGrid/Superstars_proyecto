"use client";

import { memo, useCallback, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { Icon as IconifyIcon } from "@iconify/react";
import type { FormField } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { SchemaAction } from "./_lib/schema-reducer";
import type { BuilderWarning } from "./_lib/builder-validation";
import { getWarningsForItem } from "./_lib/builder-validation";
import { campoTypeMap } from "./_lib/campo-types";
import { getAutoRellenoLabel } from "./_lib/auto-relleno-labels";

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

// separador visual entre metadatos de la segunda linea
function Dot() {
  return <span className="text-secondary-300">·</span>;
}

// cuenta legible de sub-elementos segun el tipo (opciones / columnas)
function getMetaCount(campo: FormField): string | null {
  if (campo.tipo === "seleccion_unica" || campo.tipo === "seleccion_multiple") {
    const n = campo.opciones?.length ?? 0;
    return `${n} ${n === 1 ? "opción" : "opciones"}`;
  }
  if (campo.tipo === "tabla") {
    const n = campo.columnas?.length ?? 0;
    return `${n} ${n === 1 ? "columna" : "columnas"}`;
  }
  return null;
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
  const isFijo = !!campo.fijo;
  const isInformativo = campo.tipo === "informativo";
  const metaCount = getMetaCount(campo);

  // los bloques informativos no tienen etiqueta: se muestra un fragmento del contenido
  const displayLabel = isInformativo
    ? (campo.contenido || "").replace(/<[^>]*>/g, " ").trim()
    : campo.etiqueta;

  const handleDelete = useCallback(() => {
    dispatch({
      type: "DELETE_CAMPO",
      payload: { seccionId, campoId: campo.id },
    });
    setDeleteOpen(false);
  }, [seccionId, campo.id, dispatch]);

  return (
    <div
      className={`flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary-50 ${
        hasError ? "bg-destructive/5" : ""
      }`}
    >
      {/* icono de tipo en caja de color */}
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
          isInformativo
            ? "bg-info-50 text-info-600"
            : "bg-primary-50 text-primary-600"
        }`}
      >
        <Icon className="size-4" />
      </span>

      {/* etiqueta (linea 1) + metadatos pegados (linea 2) -> sin hueco */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-secondary-800">
          {displayLabel || (
            <span className="italic text-secondary-400">
              {isInformativo ? "Bloque informativo" : "Sin etiqueta"}
            </span>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-secondary-400">
          <span>{typeInfo.label}</span>
          {metaCount && (
            <>
              <Dot />
              <span>{metaCount}</span>
            </>
          )}
          {campo.requerido && (
            <>
              <Dot />
              <span className="font-medium text-destructive">Obligatorio</span>
            </>
          )}
          {isFijo && (
            <>
              <Dot />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1 text-secondary-500">
                    <IconifyIcon
                      icon="ph:stack-duotone"
                      className="size-3.5"
                    />
                    De plantilla
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Viene de la plantilla por defecto. Puedes editarlo, moverlo o
                  eliminarlo como cualquier campo.
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {campo.autoRelleno && (
            <>
              <Dot />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1 text-secondary-500">
                    <IconifyIcon
                      icon="ph:sparkle-duotone"
                      className="size-3.5"
                    />
                    Autorrelleno
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  El proponente verá este campo ya cargado con{" "}
                  {getAutoRellenoLabel(campo.autoRelleno)}.
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {hasError && (
            <>
              <Dot />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1 font-medium text-destructive">
                    <AlertCircle className="size-3.5" />
                    Revisar
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {campoWarnings.map((w) => (
                    <p key={w.message}>{w.message}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* acciones: Editar visible (icono + texto) + menu etiquetado */}
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onEdit(seccionId, campo)}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Más acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={isFirst}
                onClick={() =>
                  dispatch({
                    type: "REORDER_CAMPO",
                    payload: { seccionId, campoId: campo.id, direction: "up" },
                  })
                }
              >
                <ArrowUp className="size-4" />
                Subir
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isLast}
                onClick={() =>
                  dispatch({
                    type: "REORDER_CAMPO",
                    payload: { seccionId, campoId: campo.id, direction: "down" },
                  })
                }
              >
                <ArrowDown className="size-4" />
                Bajar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* dialogo confirmar eliminacion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar campo"
        description={`Se eliminará el elemento "${displayLabel || "sin etiqueta"}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </div>
  );
});
