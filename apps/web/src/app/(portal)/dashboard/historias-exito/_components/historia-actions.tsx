"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { HistoriaExitoResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  deleteHistoriaExito,
  toggleActivaHistoriaExito,
} from "@/lib/api/historia-exito.api";
import { historiaExitoQueries } from "@/lib/api/query-keys";
import { HistoriaFormDialog } from "./historia-form-dialog";

interface HistoriaActionsProps {
  historia: HistoriaExitoResponse;
}

export function HistoriaActions({ historia }: HistoriaActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => toggleActivaHistoriaExito(historia.id, !historia.activa),
    onSuccess: (updated) => {
      toast.success(
        updated.activa
          ? "Historia activada. Ya se muestra en el sitio web."
          : "Historia desactivada. Ya no se muestra en el sitio web.",
      );
      queryClient.invalidateQueries({ queryKey: historiaExitoQueries.all() });
      queryClient.invalidateQueries({ queryKey: ["public", "historias-exito"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al cambiar el estado.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHistoriaExito(historia.id),
    onSuccess: () => {
      toast.success("Historia eliminada correctamente.");
      queryClient.invalidateQueries({ queryKey: historiaExitoQueries.all() });
      queryClient.invalidateQueries({ queryKey: ["public", "historias-exito"] });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al eliminar la historia.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setDeleteOpen(false);
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="size-8 bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            {historia.activa ? (
              <>
                <EyeOff className="size-4" />
                Desactivar
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Activar
              </>
            )}
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

      <HistoriaFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        historia={historia}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar historia"
        description={`Se eliminará "${historia.titulo}" y su imagen. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
