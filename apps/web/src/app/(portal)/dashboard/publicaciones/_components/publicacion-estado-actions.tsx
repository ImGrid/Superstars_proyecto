"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Calendar,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EstadoPublicacion, type PublicacionResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  publicarPublicacion,
  archivarPublicacion,
  republicarPublicacion,
  cancelarProgramacion,
} from "@/lib/api/publicacion.api";
import { publicacionQueries } from "@/lib/api/query-keys";

interface PublicacionEstadoActionsProps {
  publicacion: PublicacionResponse;
}

export function PublicacionEstadoActions({
  publicacion,
}: PublicacionEstadoActionsProps) {
  const queryClient = useQueryClient();

  function onTransitionSuccess(msg: string) {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: publicacionQueries.all() });
    queryClient.invalidateQueries({
      queryKey: publicacionQueries.detail(publicacion.id).queryKey,
    });
  }

  function onTransitionError(error: any) {
    const msg =
      error.response?.data?.message ?? "Error al cambiar el estado";
    if (Array.isArray(msg)) {
      msg.forEach((m: string) => toast.error(m));
    } else {
      toast.error(msg);
    }
  }

  switch (publicacion.estado) {
    case EstadoPublicacion.BORRADOR:
      return (
        <BorradorActions
          publicacionId={publicacion.id}
          onSuccess={onTransitionSuccess}
          onError={onTransitionError}
        />
      );
    case EstadoPublicacion.PROGRAMADO:
      return (
        <SimpleTransition
          label="Cancelar programacion"
          icon={<XCircle className="size-4" />}
          confirmTitle="Cancelar programacion"
          confirmDescription="La publicacion volvera a estado borrador y no se publicara automaticamente."
          mutationFn={() => cancelarProgramacion(publicacion.id)}
          onSuccess={() =>
            onTransitionSuccess("Programacion cancelada correctamente")
          }
          onError={onTransitionError}
        />
      );
    case EstadoPublicacion.PUBLICADO:
      return (
        <SimpleTransition
          label="Archivar"
          icon={<Archive className="size-4" />}
          confirmTitle="Archivar publicacion"
          confirmDescription="La publicacion dejara de ser visible en el sitio publico."
          mutationFn={() => archivarPublicacion(publicacion.id)}
          onSuccess={() =>
            onTransitionSuccess("Publicacion archivada correctamente")
          }
          onError={onTransitionError}
        />
      );
    case EstadoPublicacion.EXPIRADO:
      return (
        <div className="flex flex-wrap gap-2">
          <SimpleTransition
            label="Republicar"
            icon={<RefreshCw className="size-4" />}
            confirmTitle="Republicar publicacion"
            confirmDescription="La publicacion volvera a ser visible en el sitio publico."
            mutationFn={() => republicarPublicacion(publicacion.id)}
            onSuccess={() =>
              onTransitionSuccess("Publicacion republicada correctamente")
            }
            onError={onTransitionError}
          />
          <SimpleTransition
            label="Archivar"
            icon={<Archive className="size-4" />}
            variant="outline"
            confirmTitle="Archivar publicacion"
            confirmDescription="La publicacion se movera a archivados."
            mutationFn={() => archivarPublicacion(publicacion.id)}
            onSuccess={() =>
              onTransitionSuccess("Publicacion archivada correctamente")
            }
            onError={onTransitionError}
          />
        </div>
      );
    case EstadoPublicacion.ARCHIVADO:
      return (
        <SimpleTransition
          label="Republicar"
          icon={<RefreshCw className="size-4" />}
          confirmTitle="Republicar publicacion"
          confirmDescription="La publicacion volvera a estado borrador."
          mutationFn={() => republicarPublicacion(publicacion.id)}
          onSuccess={() =>
            onTransitionSuccess("Publicacion republicada correctamente")
          }
          onError={onTransitionError}
        />
      );
    default:
      return null;
  }
}

// acciones para estado borrador: publicar ahora + programar
function BorradorActions({
  publicacionId,
  onSuccess,
  onError,
}: {
  publicacionId: number;
  onSuccess: (msg: string) => void;
  onError: (error: any) => void;
}) {
  const [publicarOpen, setPublicarOpen] = useState(false);
  const [programarOpen, setProgramarOpen] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [fechaExpiracionPublicar, setFechaExpiracionPublicar] = useState("");
  const [fechaExpiracionProgramar, setFechaExpiracionProgramar] = useState("");

  const publicarMutation = useMutation({
    mutationFn: () =>
      publicarPublicacion(publicacionId, {
        fechaExpiracion: fechaExpiracionPublicar
          ? new Date(fechaExpiracionPublicar).toISOString()
          : null,
      }),
    onSuccess: () => {
      setPublicarOpen(false);
      setFechaExpiracionPublicar("");
      onSuccess("Publicacion publicada correctamente");
    },
    onError: (error) => {
      setPublicarOpen(false);
      onError(error);
    },
  });

  const programarMutation = useMutation({
    mutationFn: () =>
      publicarPublicacion(publicacionId, {
        fechaPublicacion: new Date(fechaProgramada).toISOString(),
        fechaExpiracion: fechaExpiracionProgramar
          ? new Date(fechaExpiracionProgramar).toISOString()
          : null,
      }),
    onSuccess: () => {
      setProgramarOpen(false);
      setFechaProgramada("");
      setFechaExpiracionProgramar("");
      onSuccess("Publicacion programada correctamente");
    },
    onError: (error) => {
      setProgramarOpen(false);
      onError(error);
    },
  });

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setPublicarOpen(true)}>
        <Send className="size-4" />
        Publicar ahora
      </Button>
      <Button variant="outline" onClick={() => setProgramarOpen(true)}>
        <Calendar className="size-4" />
        Programar
      </Button>

      {/* dialogo publicar ahora */}
      <Dialog open={publicarOpen} onOpenChange={setPublicarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar publicacion</DialogTitle>
            <DialogDescription>
              La publicacion sera visible inmediatamente en el sitio publico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fecha-exp-publicar">
              Fecha de expiracion (opcional)
            </Label>
            <Input
              id="fecha-exp-publicar"
              type="datetime-local"
              value={fechaExpiracionPublicar}
              onChange={(e) => setFechaExpiracionPublicar(e.target.value)}
            />
            <p className="text-xs text-secondary-500">
              Si no se establece, la publicacion permanecera visible
              indefinidamente.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPublicarOpen(false);
                setFechaExpiracionPublicar("");
              }}
              disabled={publicarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => publicarMutation.mutate()}
              disabled={publicarMutation.isPending}
            >
              {publicarMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialogo programar */}
      <Dialog open={programarOpen} onOpenChange={setProgramarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar publicacion</DialogTitle>
            <DialogDescription>
              Selecciona la fecha y hora en que se publicara automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-prog-edit">
                Fecha y hora de publicacion
              </Label>
              <Input
                id="fecha-prog-edit"
                type="datetime-local"
                value={fechaProgramada}
                onChange={(e) => setFechaProgramada(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-exp-programar">
                Fecha de expiracion (opcional)
              </Label>
              <Input
                id="fecha-exp-programar"
                type="datetime-local"
                value={fechaExpiracionProgramar}
                onChange={(e) => setFechaExpiracionProgramar(e.target.value)}
                min={fechaProgramada || undefined}
              />
              <p className="text-xs text-secondary-500">
                Si no se establece, la publicacion permanecera visible
                indefinidamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProgramarOpen(false);
                setFechaProgramada("");
                setFechaExpiracionProgramar("");
              }}
              disabled={programarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => programarMutation.mutate()}
              disabled={!fechaProgramada || programarMutation.isPending}
            >
              {programarMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// transicion simple con confirmacion
function SimpleTransition({
  label,
  icon,
  variant = "default",
  confirmTitle,
  confirmDescription,
  mutationFn,
  onSuccess,
  onError,
}: {
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "outline";
  confirmTitle: string;
  confirmDescription: string;
  mutationFn: () => Promise<PublicacionResponse>;
  onSuccess: () => void;
  onError: (error: any) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      setConfirmOpen(false);
      onSuccess();
    },
    onError: (error) => {
      setConfirmOpen(false);
      onError(error);
    },
  });

  return (
    <>
      <Button variant={variant} onClick={() => setConfirmOpen(true)}>
        {icon}
        {label}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={label}
        onConfirm={() => mutation.mutate()}
        isLoading={mutation.isPending}
        destructive={false}
      />
    </>
  );
}
