"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { NivelEnum } from "@superstars/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { rubricaQueries } from "@/lib/api/query-keys";
import { createSubCriterio } from "@/lib/api/rubrica.api";

interface AddSubCriterioDialogProps {
  convocatoriaId: number;
  criterioId: number;
  nextOrden: number;
}

// genera rangos sugeridos segun el peso
function sugerirRangos(peso: number) {
  if (peso <= 5) {
    // peso 5: basico 1-2, intermedio 3-4, avanzado 5
    const mid = Math.floor(peso / 2);
    return {
      basico: { min: 1, max: mid },
      intermedio: { min: mid + 1, max: peso - 1 },
      avanzado: { min: peso, max: peso },
    };
  }
  // peso > 5: distribuir en tercios
  const tercio = Math.floor(peso / 3);
  const basicoMax = tercio;
  const intermedMin = basicoMax + 1;
  const intermedMax = tercio * 2;
  return {
    basico: { min: 1, max: basicoMax },
    intermedio: { min: intermedMin, max: intermedMax },
    avanzado: { min: intermedMax + 1, max: peso },
  };
}

export function AddSubCriterioDialog({
  convocatoriaId,
  criterioId,
  nextOrden,
}: AddSubCriterioDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [peso, setPeso] = useState("5");

  // rangos editables
  const rangos = sugerirRangos(Number(peso) || 5);
  const [bMin, setBMin] = useState(String(rangos.basico.min));
  const [bMax, setBMax] = useState(String(rangos.basico.max));
  const [iMin, setIMin] = useState(String(rangos.intermedio.min));
  const [iMax, setIMax] = useState(String(rangos.intermedio.max));
  const [aMin, setAMin] = useState(String(rangos.avanzado.min));
  const [aMax, setAMax] = useState(String(rangos.avanzado.max));

  // descripciones
  const [descBasico, setDescBasico] = useState("");
  const [descIntermedio, setDescIntermedio] = useState("");
  const [descAvanzado, setDescAvanzado] = useState("");

  // al cambiar peso, auto-sugerir rangos
  function handlePesoChange(newPeso: string) {
    setPeso(newPeso);
    const p = Number(newPeso);
    if (p > 0) {
      const r = sugerirRangos(p);
      setBMin(String(r.basico.min));
      setBMax(String(r.basico.max));
      setIMin(String(r.intermedio.min));
      setIMax(String(r.intermedio.max));
      setAMin(String(r.avanzado.min));
      setAMax(String(r.avanzado.max));
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      createSubCriterio(convocatoriaId, {
        criterioId,
        nombre: nombre.trim(),
        pesoPorcentaje: Number(peso),
        orden: nextOrden,
        niveles: [
          {
            nivel: NivelEnum.BASICO,
            descripcion: descBasico.trim() || "Nivel basico",
            puntajeMin: Number(bMin),
            puntajeMax: Number(bMax),
          },
          {
            nivel: NivelEnum.INTERMEDIO,
            descripcion: descIntermedio.trim() || "Nivel intermedio",
            puntajeMin: Number(iMin),
            puntajeMax: Number(iMax),
          },
          {
            nivel: NivelEnum.AVANZADO,
            descripcion: descAvanzado.trim() || "Nivel avanzado",
            puntajeMin: Number(aMin),
            puntajeMax: Number(aMax),
          },
        ],
      }),
    onSuccess: () => {
      toast.success("Sub-criterio agregado");
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
        error.response?.data?.message ?? "Error al crear el sub-criterio";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function resetAndClose() {
    setNombre("");
    setPeso("5");
    const r = sugerirRangos(5);
    setBMin(String(r.basico.min));
    setBMax(String(r.basico.max));
    setIMin(String(r.intermedio.min));
    setIMax(String(r.intermedio.max));
    setAMin(String(r.avanzado.min));
    setAMax(String(r.avanzado.max));
    setDescBasico("");
    setDescIntermedio("");
    setDescAvanzado("");
    setOpen(false);
  }

  const isValid = nombre.trim().length > 0 && Number(peso) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full gap-1 text-xs">
          <Plus className="size-3.5" />
          Agregar sub-criterio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo sub-criterio</DialogTitle>
          <DialogDescription>
            Define el sub-criterio con sus 3 niveles de evaluacion (basico,
            intermedio, avanzado). Los rangos de puntos se auto-sugieren segun
            el peso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* nombre y peso */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sc-nombre">Nombre</Label>
              <Input
                id="sc-nombre"
                placeholder="Ej: Estrategia de triple impacto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sc-peso">Peso (%)</Label>
              <Input
                id="sc-peso"
                type="number"
                value={peso}
                onChange={(e) => handlePesoChange(e.target.value)}
                min={1}
                max={100}
              />
            </div>
          </div>

          <Separator />

          {/* nivel basico */}
          <NivelInput
            label="Basico"
            color="text-amber-700 bg-amber-50 border-amber-200"
            minVal={bMin}
            maxVal={bMax}
            desc={descBasico}
            onMinChange={setBMin}
            onMaxChange={setBMax}
            onDescChange={setDescBasico}
            placeholder="Descripcion del nivel basico..."
          />

          {/* nivel intermedio */}
          <NivelInput
            label="Intermedio"
            color="text-blue-700 bg-blue-50 border-blue-200"
            minVal={iMin}
            maxVal={iMax}
            desc={descIntermedio}
            onMinChange={setIMin}
            onMaxChange={setIMax}
            onDescChange={setDescIntermedio}
            placeholder="Descripcion del nivel intermedio..."
          />

          {/* nivel avanzado */}
          <NivelInput
            label="Avanzado"
            color="text-emerald-700 bg-emerald-50 border-emerald-200"
            minVal={aMin}
            maxVal={aMax}
            desc={descAvanzado}
            onMinChange={setAMin}
            onMaxChange={setAMax}
            onDescChange={setDescAvanzado}
            placeholder="Descripcion del nivel avanzado..."
          />
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

// input reutilizable para un nivel
function NivelInput({
  label,
  color,
  minVal,
  maxVal,
  desc,
  onMinChange,
  onMaxChange,
  onDescChange,
  placeholder,
}: {
  label: string;
  color: string;
  minVal: string;
  maxVal: string;
  desc: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  onDescChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex items-center gap-1 text-xs">
          <Input
            type="number"
            value={minVal}
            onChange={(e) => onMinChange(e.target.value)}
            className="h-7 w-16 text-center text-xs bg-white"
            min={0}
          />
          <span>-</span>
          <Input
            type="number"
            value={maxVal}
            onChange={(e) => onMaxChange(e.target.value)}
            className="h-7 w-16 text-center text-xs bg-white"
            min={0}
          />
          <span className="ml-1">pts</span>
        </div>
      </div>
      <Textarea
        value={desc}
        onChange={(e) => onDescChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[60px] text-xs bg-white resize-none"
        rows={2}
      />
    </div>
  );
}
