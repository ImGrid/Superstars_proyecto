"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FaqResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      const msg =
        error.response?.data?.message ?? "Error al eliminar la pregunta";
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
