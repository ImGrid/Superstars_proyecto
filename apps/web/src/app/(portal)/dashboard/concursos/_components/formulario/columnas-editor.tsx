"use client";

import { Plus, X } from "lucide-react";
import type { ColumnaTabla } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { columnaId } from "./_lib/id-utils";

interface ColumnasEditorProps {
  columnas: ColumnaTabla[];
  onChange: (columnas: ColumnaTabla[]) => void;
}

export function ColumnasEditor({ columnas, onChange }: ColumnasEditorProps) {
  const canRemove = columnas.length > 1;

  function updateColumna(index: number, changes: Partial<ColumnaTabla>) {
    const updated = columnas.map((col, i) =>
      i === index ? { ...col, ...changes } : col,
    );
    onChange(updated);
  }

  function removeColumna(index: number) {
    if (!canRemove) return;
    onChange(columnas.filter((_, i) => i !== index));
  }

  function addColumna() {
    onChange([
      ...columnas,
      {
        id: columnaId(),
        titulo: "",
        tipo: "texto_corto",
        requerido: false,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <Label>Columnas</Label>
      <div className="space-y-2">
        {columnas.map((col, i) => (
          <div key={col.id} className="flex items-center gap-2">
            <Input
              value={col.titulo}
              onChange={(e) => updateColumna(i, { titulo: e.target.value })}
              placeholder="Titulo columna"
              className="h-8 flex-1 text-sm"
            />
            <Select
              value={col.tipo}
              onValueChange={(v) =>
                updateColumna(i, { tipo: v as "texto_corto" | "numerico" })
              }
            >
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="texto_corto">Texto</SelectItem>
                <SelectItem value="numerico">Numerico</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Checkbox
                checked={col.requerido}
                onCheckedChange={(v) => updateColumna(i, { requerido: !!v })}
              />
              <span className="text-xs text-secondary-500">Req.</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              disabled={!canRemove}
              onClick={() => removeColumna(i)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addColumna}
        className="w-full"
      >
        <Plus className="size-4" />
        Agregar columna
      </Button>

      {/* mini-preview */}
      {columnas.length > 0 && columnas[0].titulo && (
        <div className="rounded border border-secondary-200 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columnas.map((col) => (
                  <TableHead key={col.id} className="text-xs">
                    {col.titulo || "..."}
                    {col.requerido && <span className="text-destructive"> *</span>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {columnas.map((col) => (
                  <TableCell key={col.id} className="text-xs text-secondary-400">
                    {col.tipo === "numerico" ? "0" : "Texto"}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
