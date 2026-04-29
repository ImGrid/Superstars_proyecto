"use client";

import { ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import type { OpcionCampo } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OpcionesEditorProps {
  opciones: OpcionCampo[];
  onChange: (opciones: OpcionCampo[]) => void;
  disabled?: boolean;
}

// slug simple para valor automatico
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    || "opcion";
}

export function OpcionesEditor({ opciones, onChange, disabled }: OpcionesEditorProps) {
  const canRemove = opciones.length > 2;

  function updateLabel(index: number, label: string) {
    const updated = opciones.map((opt, i) =>
      i === index ? { ...opt, label, valor: slugify(label) } : opt,
    );
    onChange(updated);
  }

  function removeOption(index: number) {
    if (!canRemove) return;
    onChange(opciones.filter((_, i) => i !== index));
  }

  function addOption() {
    const num = opciones.length + 1;
    onChange([
      ...opciones,
      { valor: `opcion_${num}`, label: `Opcion ${num}` },
    ]);
  }

  function reorder(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= opciones.length) return;
    const next = [...opciones];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Label>Opciones</Label>
      <div className="space-y-1">
        {opciones.map((opt, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={opt.label}
              onChange={(e) => updateLabel(i, e.target.value)}
              placeholder={`Opcion ${i + 1}`}
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
              disabled={disabled || i === opciones.length - 1}
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
              onClick={() => removeOption(i)}
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
          onClick={addOption}
          className="w-full"
        >
          <Plus className="size-4" />
          Agregar opcion
        </Button>
      )}
    </div>
  );
}
