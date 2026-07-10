"use client";

import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  ClipboardPaste,
  AlertCircle,
} from "lucide-react";
import type { OpcionCampo } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpcionesEditorProps {
  opciones: OpcionCampo[];
  onChange: (opciones: OpcionCampo[]) => void;
  disabled?: boolean;
}

// slug simple para valor automatico
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "opcion"
  );
}

// detecta opciones vacias y duplicadas (validacion en vivo).
// devuelve un mensaje por indice con problema.
function getOpcionErrors(opciones: OpcionCampo[]): Map<number, string> {
  const errors = new Map<number, string>();
  const vistas = new Map<string, number>();
  opciones.forEach((opt, i) => {
    const label = opt.label.trim();
    if (label === "") {
      errors.set(i, "Esta opción está vacía. Escribe un texto o elimínala.");
      return;
    }
    const clave = label.toLowerCase();
    if (vistas.has(clave)) {
      errors.set(i, "Ya existe una opción con este texto. Cámbiala o elimínala.");
    } else {
      vistas.set(clave, i);
    }
  });
  return errors;
}

export function OpcionesEditor({ opciones, onChange, disabled }: OpcionesEditorProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const canRemove = opciones.length > 2;
  const errors = getOpcionErrors(opciones);

  // conteo para el resumen
  let numVacias = 0;
  let numDuplicadas = 0;
  errors.forEach((msg) => {
    if (msg.startsWith("Esta opción está vacía")) numVacias++;
    else numDuplicadas++;
  });
  const partesResumen: string[] = [];
  if (numVacias > 0) {
    partesResumen.push(`${numVacias} ${numVacias === 1 ? "vacía" : "vacías"}`);
  }
  if (numDuplicadas > 0) {
    partesResumen.push(
      `${numDuplicadas} ${numDuplicadas === 1 ? "repetida" : "repetidas"}`,
    );
  }

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
      { valor: `opcion_${num}`, label: `Opción ${num}` },
    ]);
  }

  function reorder(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= opciones.length) return;
    const next = [...opciones];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  // agrega las lineas pegadas (una opción por línea) al final de la lista
  function insertarPegadas() {
    const nuevas = pasteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (nuevas.length === 0) return;
    const base = opciones.length;
    const agregadas = nuevas.map((label, k) => ({
      valor: slugify(label) || `opcion_${base + k + 1}`,
      label,
    }));
    onChange([...opciones, ...agregadas]);
    setPasteText("");
    setPasteOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Opciones</Label>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setPasteOpen((v) => !v)}
          >
            <ClipboardPaste className="size-3.5" />
            Pegar lista
          </Button>
        )}
      </div>

      {/* resumen de problemas */}
      {partesResumen.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          Revisa las opciones: hay {partesResumen.join(" y ")}.
        </div>
      )}

      {/* pegar lista de opciones (una por linea) */}
      {pasteOpen && !disabled && (
        <div className="space-y-2 rounded-md border border-secondary-200 bg-secondary-50/50 p-2.5">
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Pega una opción por línea…\nOpción A\nOpción B\nOpción C"}
            rows={4}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={insertarPegadas}
              disabled={!pasteText.trim()}
            >
              Insertar opciones
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setPasteOpen(false);
                setPasteText("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* lista de opciones: input de ancho completo + acciones con tooltip */}
      <div className="space-y-1.5">
        {opciones.map((opt, i) => {
          const err = errors.get(i);
          return (
            <div key={i}>
              <div className="flex items-center gap-1">
                <Input
                  value={opt.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  placeholder={`Opción ${i + 1}`}
                  className={`h-9 flex-1 text-sm ${
                    err ? "border-destructive bg-destructive/5" : ""
                  }`}
                  disabled={disabled}
                />
                <OpcionBtn
                  label="Subir"
                  icon={<ArrowUp className="size-3.5" />}
                  disabled={disabled || i === 0}
                  onClick={() => reorder(i, "up")}
                />
                <OpcionBtn
                  label="Bajar"
                  icon={<ArrowDown className="size-3.5" />}
                  disabled={disabled || i === opciones.length - 1}
                  onClick={() => reorder(i, "down")}
                />
                <OpcionBtn
                  label={canRemove ? "Eliminar" : "Se necesitan al menos 2 opciones"}
                  icon={<X className="size-3.5" />}
                  destructive
                  disabled={disabled || !canRemove}
                  onClick={() => removeOption(i)}
                />
              </div>
              {err && (
                <p className="mt-1 flex items-center gap-1 pl-1 text-xs text-destructive">
                  <AlertCircle className="size-3 shrink-0" />
                  {err}
                </p>
              )}
            </div>
          );
        })}
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
          Agregar opción
        </Button>
      )}
    </div>
  );
}

// boton de accion de una opcion, con tooltip (para que se entienda el icono)
function OpcionBtn({
  label,
  icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 shrink-0 ${
            destructive ? "text-destructive hover:text-destructive" : ""
          }`}
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
