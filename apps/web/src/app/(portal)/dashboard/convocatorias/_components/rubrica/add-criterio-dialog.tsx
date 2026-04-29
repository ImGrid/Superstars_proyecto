"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { TipoCriterio } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rubricaQueries } from "@/lib/api/query-keys";
import { createCriterio } from "@/lib/api/rubrica.api";
import { tipoCriterioOptions } from "./_lib/tipo-criterio-labels";

interface AddCriterioDialogProps {
  convocatoriaId: number;
  nextOrden: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCriterioDialog({
  convocatoriaId,
  nextOrden,
  open,
  onOpenChange,
}: AddCriterioDialogProps) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCriterio>(TipoCriterio.TECNICO);
  const [peso, setPeso] = useState("25");

  const mutation = useMutation({
    mutationFn: () =>
      createCriterio(convocatoriaId, {
        nombre: nombre.trim(),
        tipo,
        pesoPorcentaje: Number(peso),
        orden: nextOrden,
      }),
    onSuccess: () => {
      toast.success("Criterio agregado");
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.detail(convocatoriaId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: rubricaQueries.validacion(convocatoriaId).queryKey,
      });
      resetAndClose();
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al crear el criterio";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function resetAndClose() {
    setNombre("");
    setTipo(TipoCriterio.TECNICO);
    setPeso("25");
    onOpenChange(false);
  }

  const isValid = nombre.trim().length > 0 && Number(peso) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="size-4" />
          Agregar criterio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo criterio de evaluacion</DialogTitle>
          <DialogDescription>
            Define el nombre, tipo y peso porcentual del criterio. Los pesos de
            todos los criterios deben sumar el puntaje total de la rubrica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crit-nombre">Nombre</Label>
            <Input
              id="crit-nombre"
              placeholder="Ej: Modelo de impacto del negocio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo de criterio</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoCriterio)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipoCriterioOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="crit-peso">Peso (%)</Label>
              <Input
                id="crit-peso"
                type="number"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                min={1}
                max={100}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
