"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Pencil, Trash2, CalendarClock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EstadoConcurso, type ConcursoResponse } from "@superstars/shared";
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
import { deleteConcurso } from "@/lib/api/concurso.api";
import { concursoQueries } from "@/lib/api/query-keys";

interface ConcursoActionsProps {
  concurso: ConcursoResponse;
}

export function ConcursoActions({ concurso }: ConcursoActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fechasOpen, setFechasOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const isBorrador = concurso.estado === EstadoConcurso.BORRADOR;
  const isFinalizado = concurso.estado === EstadoConcurso.FINALIZADO;
  const canEditFechas = !isBorrador && !isFinalizado;

  const deleteMutation = useMutation({
    mutationFn: () => deleteConcurso(concurso.id),
    onSuccess: () => {
      toast.success("Concurso eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: concursoQueries.all() });
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al eliminar el concurso";
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
            onClick={() => router.push(`/dashboard/concursos/${concurso.id}`)}
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
                onClick={() => router.push(`/dashboard/concursos/${concurso.id}/editar`)}
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
          title="Eliminar concurso"
          description={`Se eliminara permanentemente el concurso "${concurso.nombre}". Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      )}

      <ModificarFechasDialog
        concurso={concurso}
        open={fechasOpen}
        onOpenChange={setFechasOpen}
      />
    </>
  );
}
