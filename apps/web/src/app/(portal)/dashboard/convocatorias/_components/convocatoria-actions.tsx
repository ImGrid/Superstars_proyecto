"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2, CalendarClock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EstadoConvocatoria, type ConvocatoriaResponse } from "@superstars/shared";
import { RowActions, RowAction } from "@/components/shared/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ModificarFechasDialog } from "./modificar-fechas-dialog";
import { deleteConvocatoria } from "@/lib/api/convocatoria.api";
import { convocatoriaQueries } from "@/lib/api/query-keys";

interface ConvocatoriaActionsProps {
  convocatoria: ConvocatoriaResponse;
}

export function ConvocatoriaActions({ convocatoria }: ConvocatoriaActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fechasOpen, setFechasOpen] = useState(false);
  const queryClient = useQueryClient();

  const isBorrador = convocatoria.estado === EstadoConvocatoria.BORRADOR;
  const isFinalizado = convocatoria.estado === EstadoConvocatoria.FINALIZADO;
  const canEditFechas = !isBorrador && !isFinalizado;

  const deleteMutation = useMutation({
    mutationFn: () => deleteConvocatoria(convocatoria.id),
    onSuccess: () => {
      toast.success("Convocatoria eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al eliminar la convocatoria";
      toast.error(msg);
      setDeleteOpen(false);
    },
  });

  return (
    <>
      <RowActions>
        <RowAction
          icon={<Eye className="size-4" />}
          label="Ver detalle"
          href={`/dashboard/convocatorias/${convocatoria.id}`}
        />
        {canEditFechas && (
          <RowAction
            icon={<CalendarClock className="size-4" />}
            label="Modificar fechas"
            onClick={() => setFechasOpen(true)}
          />
        )}
        {isBorrador && (
          <RowAction
            icon={<Pencil className="size-4" />}
            label="Editar"
            href={`/dashboard/convocatorias/${convocatoria.id}/editar`}
          />
        )}
        {isBorrador && (
          <RowAction
            icon={<Trash2 className="size-4" />}
            label="Eliminar"
            onClick={() => setDeleteOpen(true)}
            destructive
          />
        )}
      </RowActions>

      {isBorrador && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar convocatoria"
          description={`Se eliminará permanentemente la convocatoria "${convocatoria.nombre}". Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      )}

      <ModificarFechasDialog
        convocatoria={convocatoria}
        open={fechasOpen}
        onOpenChange={setFechasOpen}
      />
    </>
  );
}
