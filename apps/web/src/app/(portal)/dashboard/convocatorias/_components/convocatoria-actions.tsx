"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, Trash2, CalendarClock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EstadoConvocatoria, type ConvocatoriaResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const router = useRouter();
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/convocatorias/${convocatoria.id}`)}
          >
            <Eye className="size-4" />
            Ver detalle
          </DropdownMenuItem>
          {canEditFechas && (
            <DropdownMenuItem onClick={() => setFechasOpen(true)}>
              <CalendarClock className="size-4" />
              Modificar fechas
            </DropdownMenuItem>
          )}
          {isBorrador && (
            <>
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/convocatorias/${convocatoria.id}/editar`)}
              >
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
