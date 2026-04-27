"use client";

import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import type { FilaFijaTabla } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// fila fija: la primera columna se prerellena con `label` y queda bloqueada;
// `key` es un identificador estable (sirve para correlacionar respuestas si
// el responsable reordena las filas en una version posterior del formulario)

interface FilasFijasEditorProps {
  filasFijas: FilaFijaTabla[];
  onChange: (filasFijas: FilaFijaTabla[]) => void;
  disabled?: boolean;
}

// slug simple para key automatica desde el label
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    || "fila";
}

export function FilasFijasEditor({
  filasFijas,
  onChange,
  disabled,
}: FilasFijasEditorProps) {
  const canRemove = filasFijas.length > 1;

  function updateLabel(index: number, label: string) {
    const updated = filasFijas.map((f, i) =>
      i === index ? { ...f, label, key: slugify(label) } : f,
    );
    onChange(updated);
  }

  function removeFila(index: number) {
    if (!canRemove) return;
    onChange(filasFijas.filter((_, i) => i !== index));
  }

  function addFila() {
    const num = filasFijas.length + 1;
    onChange([...filasFijas, { key: `fila_${num}`, label: `Fila ${num}` }]);
  }

  function reorder(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= filasFijas.length) return;
    const next = [...filasFijas];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Label>Filas predefinidas</Label>
      <p className="text-xs text-muted-foreground">
        El proponente verá estas filas con la primera columna ya rellenada
        (ej: años 2023, 2024, 2025). Solo llenará el resto de columnas.
      </p>
      <div className="space-y-1">
        {filasFijas.map((f, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={f.label}
              onChange={(e) => updateLabel(i, e.target.value)}
              placeholder={`Fila ${i + 1}`}
              className="h-8 flex-1 text-sm"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={disabled || i === 0}
              onClick={() => reorder(i, "up")}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={disabled || i === filasFijas.length - 1}
              onClick={() => reorder(i, "down")}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              disabled={disabled || !canRemove}
              onClick={() => removeFila(i)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addFila}
          className="w-full"
        >
          <Plus className="size-4" />
          Agregar fila predefinida
        </Button>
      )}
    </div>
  );
}
