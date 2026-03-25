"use client";

import { memo, useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Lock,
  Trash2,
} from "lucide-react";
import type { Seccion, FormField } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { SchemaAction } from "./_lib/schema-reducer";
import type { BuilderWarning } from "./_lib/builder-validation";
import { getWarningsForItem } from "./_lib/builder-validation";
import { CampoItem } from "./campo-item";
import { AddCampoPopover } from "./add-campo-popover";

interface SeccionItemProps {
  seccion: Seccion;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
  warnings: BuilderWarning[];
  dispatch: (action: SchemaAction) => void;
  onEditCampo: (seccionId: string, campo: FormField) => void;
}

export const SeccionItem = memo(function SeccionItem({
  seccion,
  isFirst,
  isLast,
  canEdit,
  warnings,
  dispatch,
  onEditCampo,
}: SeccionItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const secWarnings = getWarningsForItem(warnings, seccion.id);
  const hasError = secWarnings.some((w) => w.severity === "error");

  // titulo editable
  const handleTituloChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: "UPDATE_SECCION",
        payload: { id: seccion.id, changes: { titulo: e.target.value } },
      });
    },
    [seccion.id, dispatch],
  );

  // eliminar seccion
  const handleDelete = useCallback(() => {
    dispatch({ type: "DELETE_SECCION", payload: { id: seccion.id } });
    setDeleteOpen(false);
  }, [seccion.id, dispatch]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={`rounded-lg border ${hasError ? "border-destructive/50" : "border-secondary-200"} bg-white`}
      >
        {/* header */}
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              {isOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          {/* titulo editable */}
          {canEdit ? (
            <Input
              value={seccion.titulo}
              onChange={handleTituloChange}
              className="h-8 max-w-xs font-semibold text-secondary-900"
              placeholder="Titulo de la seccion"
            />
          ) : (
            <span className="text-sm font-semibold text-secondary-900">
              {seccion.titulo}
            </span>
          )}

          {/* badge conteo cuando colapsada */}
          {!isOpen && seccion.campos.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {seccion.campos.length} campo{seccion.campos.length !== 1 && "s"}
            </Badge>
          )}

          {/* spacer */}
          <div className="flex-1" />

          {/* acciones */}
          {canEdit && (
            <div className="flex items-center gap-1">
              {seccion.fija && <Lock className="size-4 text-secondary-400" />}

              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isFirst}
                onClick={() =>
                  dispatch({
                    type: "REORDER_SECCION",
                    payload: { id: seccion.id, direction: "up" },
                  })
                }
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isLast}
                onClick={() =>
                  dispatch({
                    type: "REORDER_SECCION",
                    payload: { id: seccion.id, direction: "down" },
                  })
                }
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* contenido colapsable: campos */}
        <CollapsibleContent>
          <div className="border-t border-secondary-100 px-3 py-2 space-y-1">
            {seccion.campos.length === 0 ? (
              <p className="py-4 text-center text-sm text-secondary-400">
                Esta seccion esta vacia. Agregue un campo.
              </p>
            ) : (
              seccion.campos.map((campo, idx) => (
                <CampoItem
                  key={campo.id}
                  campo={campo}
                  seccionId={seccion.id}
                  isFirst={idx === 0}
                  isLast={idx === seccion.campos.length - 1}
                  canEdit={canEdit}
                  warnings={warnings}
                  dispatch={dispatch}
                  onEdit={onEditCampo}
                />
              ))
            )}

            {/* boton agregar campo */}
            {canEdit && (
              <div className="pt-2 pb-1">
                <AddCampoPopover
                  seccionId={seccion.id}
                  nextOrden={seccion.campos.length + 1}
                  dispatch={dispatch}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>

      {/* dialogo confirmar eliminacion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar seccion"
        description={`Se eliminara la seccion "${seccion.titulo}" y todos sus campos. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
      />
    </Collapsible>
  );
});
