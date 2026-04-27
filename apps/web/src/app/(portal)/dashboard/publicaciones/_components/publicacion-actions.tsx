"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Calendar,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EstadoPublicacion, type PublicacionResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  deletePublicacion,
  publicarPublicacion,
  archivarPublicacion,
  republicarPublicacion,
  cancelarProgramacion,
} from "@/lib/api/publicacion.api";
import { publicacionQueries } from "@/lib/api/query-keys";

interface PublicacionActionsProps {
  publicacion: PublicacionResponse;
}

export function PublicacionActions({ publicacion }: PublicacionActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publicarOpen, setPublicarOpen] = useState(false);
  const [programarOpen, setProgramarOpen] = useState(false);
  const [archivarOpen, setArchivarOpen] = useState(false);
  const [republicarOpen, setRepublicarOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const estado = publicacion.estado;

  // permisos por estado
  const canEdit =
    estado === EstadoPublicacion.BORRADOR ||
    estado === EstadoPublicacion.PROGRAMADO ||
    estado === EstadoPublicacion.PUBLICADO ||
    estado === EstadoPublicacion.ARCHIVADO;
  const canDelete =
    estado === EstadoPublicacion.BORRADOR ||
    estado === EstadoPublicacion.EXPIRADO ||
    estado === EstadoPublicacion.ARCHIVADO;
  const canPublicar = estado === EstadoPublicacion.BORRADOR;
  const canProgramar = estado === EstadoPublicacion.BORRADOR;
  const canArchivar =
    estado === EstadoPublicacion.PUBLICADO ||
    estado === EstadoPublicacion.EXPIRADO;
  const canRepublicar =
    estado === EstadoPublicacion.EXPIRADO ||
    estado === EstadoPublicacion.ARCHIVADO;
  const canCancelar = estado === EstadoPublicacion.PROGRAMADO;

  function onSuccess(msg: string) {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: publicacionQueries.all() });
  }

  function onError(error: any) {
    const msg =
      error.response?.data?.message ?? "Error al realizar la accion";
    toast.error(Array.isArray(msg) ? msg[0] : msg);
  }

  const deleteMutation = useMutation({
    mutationFn: () => deletePublicacion(publicacion.id),
    onSuccess: () => {
      onSuccess("Publicacion eliminada correctamente");
      setDeleteOpen(false);
    },
    onError: (error: any) => {
      onError(error);
      setDeleteOpen(false);
    },
  });

  const publicarMutation = useMutation({
    mutationFn: () => publicarPublicacion(publicacion.id),
    onSuccess: () => {
      onSuccess("Publicacion publicada correctamente");
      setPublicarOpen(false);
    },
    onError: (error: any) => {
      onError(error);
      setPublicarOpen(false);
    },
  });

  const programarMutation = useMutation({
    mutationFn: () =>
      publicarPublicacion(publicacion.id, {
        fechaPublicacion: new Date(fechaProgramada).toISOString(),
      }),
    onSuccess: () => {
      onSuccess("Publicacion programada correctamente");
      setProgramarOpen(false);
      setFechaProgramada("");
    },
    onError: (error: any) => {
      onError(error);
      setProgramarOpen(false);
    },
  });

  const archivarMutation = useMutation({
    mutationFn: () => archivarPublicacion(publicacion.id),
    onSuccess: () => {
      onSuccess("Publicacion archivada correctamente");
      setArchivarOpen(false);
    },
    onError: (error: any) => {
      onError(error);
      setArchivarOpen(false);
    },
  });

  const republicarMutation = useMutation({
    mutationFn: () => republicarPublicacion(publicacion.id),
    onSuccess: () => {
      onSuccess("Publicacion republicada correctamente");
      setRepublicarOpen(false);
    },
    onError: (error: any) => {
      onError(error);
      setRepublicarOpen(false);
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: () => cancelarProgramacion(publicacion.id),
    onSuccess: () => {
      onSuccess("Programacion cancelada correctamente");
      setCancelarOpen(false);
    },
    onError: (error: any) => {
      onError(error);
      setCancelarOpen(false);
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
          {canEdit && (
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/dashboard/publicaciones/${publicacion.id}/editar`,
                )
              }
            >
              <Pencil className="size-4" />
              Editar
            </DropdownMenuItem>
          )}

          {canPublicar && (
            <DropdownMenuItem onClick={() => setPublicarOpen(true)}>
              <Send className="size-4" />
              Publicar ahora
            </DropdownMenuItem>
          )}

          {canProgramar && (
            <DropdownMenuItem onClick={() => setProgramarOpen(true)}>
              <Calendar className="size-4" />
              Programar
            </DropdownMenuItem>
          )}

          {canCancelar && (
            <DropdownMenuItem onClick={() => setCancelarOpen(true)}>
              <XCircle className="size-4" />
              Cancelar programacion
            </DropdownMenuItem>
          )}

          {canArchivar && (
            <DropdownMenuItem onClick={() => setArchivarOpen(true)}>
              <Archive className="size-4" />
              Archivar
            </DropdownMenuItem>
          )}

          {canRepublicar && (
            <DropdownMenuItem onClick={() => setRepublicarOpen(true)}>
              <RefreshCw className="size-4" />
              Republicar
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
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

      {/* dialogo: publicar */}
      <ConfirmDialog
        open={publicarOpen}
        onOpenChange={setPublicarOpen}
        title="Publicar publicación"
        description="La publicación será visible inmediatamente en el sitio público."
        confirmLabel="Publicar"
        onConfirm={() => publicarMutation.mutate()}
        isLoading={publicarMutation.isPending}
        destructive={false}
      />

      {/* dialogo: programar */}
      <Dialog open={programarOpen} onOpenChange={setProgramarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar publicación</DialogTitle>
            <DialogDescription>
              Selecciona la fecha y hora en que se publicará automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fecha-programada">Fecha y hora de publicación</Label>
            <Input
              id="fecha-programada"
              type="datetime-local"
              value={fechaProgramada}
              onChange={(e) => setFechaProgramada(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProgramarOpen(false);
                setFechaProgramada("");
              }}
              disabled={programarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => programarMutation.mutate()}
              disabled={!fechaProgramada || programarMutation.isPending}
            >
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialogo: archivar */}
      <ConfirmDialog
        open={archivarOpen}
        onOpenChange={setArchivarOpen}
        title="Archivar publicación"
        description="La publicación dejará de ser visible en el sitio público."
        confirmLabel="Archivar"
        onConfirm={() => archivarMutation.mutate()}
        isLoading={archivarMutation.isPending}
        destructive={false}
      />

      {/* dialogo: republicar */}
      <ConfirmDialog
        open={republicarOpen}
        onOpenChange={setRepublicarOpen}
        title="Republicar publicación"
        description="La publicación volverá a ser visible en el sitio público."
        confirmLabel="Republicar"
        onConfirm={() => republicarMutation.mutate()}
        isLoading={republicarMutation.isPending}
        destructive={false}
      />

      {/* dialogo: cancelar programacion */}
      <ConfirmDialog
        open={cancelarOpen}
        onOpenChange={setCancelarOpen}
        title="Cancelar programación"
        description="La publicación volverá a estado borrador y no se publicará automáticamente."
        confirmLabel="Cancelar programación"
        onConfirm={() => cancelarMutation.mutate()}
        isLoading={cancelarMutation.isPending}
        destructive={false}
      />

      {/* dialogo: eliminar */}
      {canDelete && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar publicación"
          description={`Se eliminará permanentemente la publicación "${publicacion.titulo}". Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  );
}
