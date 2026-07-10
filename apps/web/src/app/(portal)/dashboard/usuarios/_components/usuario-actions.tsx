"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UsuarioResponse } from "@superstars/shared";
import { RowActions, RowAction } from "@/components/shared/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UsuarioFormDialog } from "./usuario-form-dialog";
import { deleteUsuario } from "@/lib/api/usuario.api";
import { usuarioQueries } from "@/lib/api/query-keys";

interface UsuarioActionsProps {
  usuario: UsuarioResponse;
}

export function UsuarioActions({ usuario }: UsuarioActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteUsuario(usuario.id),
    onSuccess: () => {
      toast.success("Usuario eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: usuarioQueries.all() });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al eliminar el usuario";
      toast.error(msg);
      setDeleteOpen(false);
    },
  });

  return (
    <>
      <RowActions>
        <RowAction
          icon={<Pencil className="size-4" />}
          label="Editar"
          onClick={() => setEditOpen(true)}
        />
        <RowAction
          icon={<Trash2 className="size-4" />}
          label="Eliminar"
          onClick={() => setDeleteOpen(true)}
          destructive
        />
      </RowActions>

      <UsuarioFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        usuario={usuario}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar usuario"
        description={`Se eliminará permanentemente a "${usuario.nombre}". Si tiene datos asociados, considera desactivarlo en su lugar.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
