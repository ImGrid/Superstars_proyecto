"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Loader2 } from "lucide-react";
import { EstadoConcurso } from "@superstars/shared";
import type { ConcursoResponse } from "@superstars/shared";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateFechasConcurso } from "@/lib/api/concurso.api";
import { concursoQueries } from "@/lib/api/query-keys";
import { formatDate } from "@/lib/format";

// estados donde se permite modificar fechas
const ESTADOS_EDITABLES = [
  EstadoConcurso.PUBLICADO,
  EstadoConcurso.CERRADO,
  EstadoConcurso.EN_EVALUACION,
];

interface ModificarFechasDialogProps {
  concurso: ConcursoResponse;
  // modo controlado (desde dropdown de acciones)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ModificarFechasDialog({
  concurso,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ModificarFechasDialogProps) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);

  // determinar si es controlado o interno
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const canEditCierre = concurso.estado === EstadoConcurso.PUBLICADO;

  const [fechaCierreEfectiva, setFechaCierreEfectiva] = useState(
    concurso.fechaCierreEfectiva ?? "",
  );
  const [fechaAnuncioGanadores, setFechaAnuncioGanadores] = useState(
    concurso.fechaAnuncioGanadores ?? "",
  );

  // resetear valores al abrir
  useEffect(() => {
    if (open) {
      setFechaCierreEfectiva(concurso.fechaCierreEfectiva ?? "");
      setFechaAnuncioGanadores(concurso.fechaAnuncioGanadores ?? "");
    }
  }, [open, concurso.fechaCierreEfectiva, concurso.fechaAnuncioGanadores]);

  function handleOpenChange(isOpen: boolean) {
    if (isControlled) {
      controlledOnOpenChange?.(isOpen);
    } else {
      setInternalOpen(isOpen);
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const dto: Record<string, string | null> = {};

      if (canEditCierre) {
        dto.fechaCierreEfectiva = fechaCierreEfectiva || null;
      }

      dto.fechaAnuncioGanadores = fechaAnuncioGanadores || null;

      return updateFechasConcurso(concurso.id, dto);
    },
    onSuccess: () => {
      toast.success("Fechas actualizadas correctamente");
      queryClient.invalidateQueries({ queryKey: concursoQueries.all() });
      handleOpenChange(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al actualizar fechas";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // no mostrar si no esta en estado editable
  if (!ESTADOS_EDITABLES.includes(concurso.estado as EstadoConcurso)) {
    return null;
  }

  // contenido del dialog (compartido entre ambos modos)
  const dialogContent = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Modificar fechas del concurso</DialogTitle>
        <DialogDescription>
          Ajusta las fechas del concurso. La fecha de inicio y cierre original no se pueden modificar.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label className="text-secondary-500">Inicio de postulacion (no modificable)</Label>
          <p className="text-sm font-medium">{formatDate(concurso.fechaInicioPostulacion)}</p>
        </div>

        <div className="space-y-1">
          <Label className="text-secondary-500">Cierre original de postulacion (no modificable)</Label>
          <p className="text-sm font-medium">{formatDate(concurso.fechaCierrePostulacion)}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fechaCierreEfectiva">
            Nueva fecha de cierre
            {!canEditCierre && (
              <span className="ml-1 text-xs text-secondary-400">(solo modificable en publicado)</span>
            )}
          </Label>
          <Input
            id="fechaCierreEfectiva"
            type="date"
            value={fechaCierreEfectiva}
            onChange={(e) => setFechaCierreEfectiva(e.target.value)}
            min={concurso.fechaCierrePostulacion}
            disabled={!canEditCierre}
          />
          {canEditCierre && (
            <p className="text-xs text-secondary-500">
              Debe ser igual o posterior al {formatDate(concurso.fechaCierrePostulacion)}. Dejar vacio para mantener la fecha original.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fechaAnuncioGanadores">Fecha de anuncio de ganadores</Label>
          <Input
            id="fechaAnuncioGanadores"
            type="date"
            value={fechaAnuncioGanadores}
            onChange={(e) => setFechaAnuncioGanadores(e.target.value)}
          />
          <p className="text-xs text-secondary-500">
            Dejar vacio si aun no se ha definido.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => handleOpenChange(false)}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-1"
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  // modo controlado: sin trigger, solo el dialog
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // modo con trigger: boton azul visible en el header
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50">
          <CalendarClock className="size-4" />
          Modificar fechas
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
