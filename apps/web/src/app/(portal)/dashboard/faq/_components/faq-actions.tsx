"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FaqResponse } from "@superstars/shared";
import { RowActions, RowAction } from "@/components/shared/row-actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FaqFormDialog } from "./faq-form-dialog";
import { deleteFaq } from "@/lib/api/faq.api";
import { faqQueries } from "@/lib/api/query-keys";

interface FaqActionsProps {
  faq: FaqResponse;
}

export function FaqActions({ faq }: FaqActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteFaq(faq.id),
    onSuccess: () => {
      toast.success("Pregunta eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: faqQueries.all() });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al eliminar la pregunta";
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

      <FaqFormDialog open={editOpen} onOpenChange={setEditOpen} faq={faq} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar pregunta"
        description={`Se eliminará permanentemente esta pregunta. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
