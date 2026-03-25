"use client";

import { useState, useEffect } from "react";
import type { FormField, OpcionCampo, ColumnaTabla } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Lock } from "lucide-react";
import { campoTypeMap } from "./_lib/campo-types";
import { OpcionesEditor } from "./opciones-editor";
import { ColumnasEditor } from "./columnas-editor";

interface CampoConfigSheetProps {
  campo: FormField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (campo: FormField) => void;
}

// presets de tipos de archivo
const filePresets = {
  pdf: [".pdf"],
  documentos: [".pdf", ".doc", ".docx"],
  imagenes: [".jpg", ".jpeg", ".png"],
} as const;

const allFileTypes = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"];

export function CampoConfigSheet({ campo, open, onOpenChange, onApply }: CampoConfigSheetProps) {
  // estado local para edicion sin afectar el reducer
  const [local, setLocal] = useState<FormField | null>(null);

  // sincronizar cuando se abre el sheet
  useEffect(() => {
    if (campo && open) {
      setLocal({ ...campo });
    }
  }, [campo, open]);

  if (!local) return null;

  const typeInfo = campoTypeMap[local.tipo];
  const Icon = typeInfo.icon;
  const isFijo = !!local.fijo;

  // helpers para actualizar estado local
  function updateBase(changes: Partial<FormField>) {
    setLocal((prev) => (prev ? { ...prev, ...changes } as FormField : null));
  }

  function handleApply() {
    if (local) onApply(local);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Icon className="size-5 text-secondary-500" />
            Configurar campo
            {isFijo && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Lock className="size-3" />
                Fijo
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {isFijo
              ? `Campo de la plantilla. Tipo: ${typeInfo.label}`
              : `Tipo: ${typeInfo.label}`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* propiedades comunes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campo-etiqueta">Etiqueta</Label>
              <Input
                id="campo-etiqueta"
                value={local.etiqueta}
                onChange={(e) => updateBase({ etiqueta: e.target.value })}
                placeholder="Ej: Nombre de la empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campo-descripcion">Descripcion (opcional)</Label>
              <Input
                id="campo-descripcion"
                value={local.descripcion ?? ""}
                onChange={(e) =>
                  updateBase({ descripcion: e.target.value || undefined })
                }
                placeholder="Instrucciones para el usuario"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="campo-requerido">Requerido</Label>
              <Switch
                id="campo-requerido"
                checked={local.requerido}
                onCheckedChange={(v) => updateBase({ requerido: v })}
              />
            </div>
          </div>

          <Separator />

          {/* propiedades especificas por tipo */}
          <div className="space-y-4">
            <TypeSpecificConfig campo={local} onChange={setLocal} disabled={false} />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar cambios
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// configuracion especifica por tipo de campo
function TypeSpecificConfig({
  campo,
  onChange,
  disabled,
}: {
  campo: FormField;
  onChange: (campo: FormField) => void;
  disabled: boolean;
}) {
  function update(changes: Record<string, unknown>) {
    onChange({ ...campo, ...changes } as FormField);
  }

  switch (campo.tipo) {
    case "texto_corto":
      return (
        <>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={campo.placeholder ?? ""}
              onChange={(e) => update({ placeholder: e.target.value || undefined })}
              placeholder="Texto de ejemplo"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Longitud maxima</Label>
            <Input
              type="number"
              value={campo.maxLength ?? ""}
              onChange={(e) =>
                update({ maxLength: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="Sin limite"
              min={1}
              disabled={disabled}
            />
          </div>
        </>
      );

    case "texto_largo":
      return (
        <>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={campo.placeholder ?? ""}
              onChange={(e) => update({ placeholder: e.target.value || undefined })}
              placeholder="Texto de ejemplo"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximo de palabras</Label>
            <Input
              type="number"
              value={campo.maxPalabras ?? ""}
              onChange={(e) =>
                update({ maxPalabras: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="Sin limite"
              min={1}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Filas</Label>
            <Input
              type="number"
              value={campo.filas ?? 4}
              onChange={(e) => update({ filas: Number(e.target.value) || 4 })}
              min={1}
              max={20}
              disabled={disabled}
            />
          </div>
        </>
      );

    case "numerico":
      return (
        <>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input
              value={campo.placeholder ?? ""}
              onChange={(e) => update({ placeholder: e.target.value || undefined })}
              placeholder="Texto de ejemplo"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Minimo</Label>
              <Input
                type="number"
                value={campo.min ?? ""}
                onChange={(e) =>
                  update({ min: e.target.value !== "" ? Number(e.target.value) : undefined })
                }
                placeholder="Sin min"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Maximo</Label>
              <Input
                type="number"
                value={campo.max ?? ""}
                onChange={(e) =>
                  update({ max: e.target.value !== "" ? Number(e.target.value) : undefined })
                }
                placeholder="Sin max"
                disabled={disabled}
              />
            </div>
          </div>
        </>
      );

    case "seleccion_unica":
      return (
        <>
          <OpcionesEditor
            opciones={campo.opciones}
            onChange={(opciones: OpcionCampo[]) => update({ opciones })}
            disabled={disabled}
          />
          <div className="flex items-center justify-between">
            <Label>Permite "Otra"</Label>
            <Switch
              checked={campo.permiteOtra ?? false}
              onCheckedChange={(v) => update({ permiteOtra: v })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Estilo de visualizacion</Label>
            <Select
              value={campo.display ?? "dropdown"}
              onValueChange={(v) => update({ display: v })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="radio">Radio buttons</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );

    case "seleccion_multiple":
      return (
        <>
          <OpcionesEditor
            opciones={campo.opciones}
            onChange={(opciones: OpcionCampo[]) => update({ opciones })}
            disabled={disabled}
          />
          <div className="flex items-center justify-between">
            <Label>Permite "Otra"</Label>
            <Switch
              checked={campo.permiteOtra ?? false}
              onCheckedChange={(v) => update({ permiteOtra: v })}
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min. selecciones</Label>
              <Input
                type="number"
                value={campo.minSelecciones ?? ""}
                onChange={(e) =>
                  update({ minSelecciones: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Sin min"
                min={0}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Max. selecciones</Label>
              <Input
                type="number"
                value={campo.maxSelecciones ?? ""}
                onChange={(e) =>
                  update({ maxSelecciones: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Sin max"
                min={1}
                disabled={disabled}
              />
            </div>
          </div>
        </>
      );

    case "tabla":
      return (
        <>
          <ColumnasEditor
            columnas={campo.columnas}
            onChange={(columnas: ColumnaTabla[]) => update({ columnas })}
          />
          <div className="space-y-2">
            <Label>Filas iniciales</Label>
            <Input
              type="number"
              value={campo.filasIniciales ?? 3}
              onChange={(e) => update({ filasIniciales: Number(e.target.value) || 3 })}
              min={1}
              max={50}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Filas dinamicas</Label>
            <Switch
              checked={campo.filasDinamicas ?? false}
              onCheckedChange={(v) => update({ filasDinamicas: v })}
              disabled={disabled}
            />
          </div>
        </>
      );

    case "archivo":
      return (
        <ArchivoConfig campo={campo} onChange={update} disabled={disabled} />
      );

    case "si_no":
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Label "Si"</Label>
            <Input
              value={campo.labelSi ?? "Si"}
              onChange={(e) => update({ labelSi: e.target.value || "Si" })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Label "No"</Label>
            <Input
              value={campo.labelNo ?? "No"}
              onChange={(e) => update({ labelNo: e.target.value || "No" })}
              disabled={disabled}
            />
          </div>
        </div>
      );

    case "texto_url":
      return (
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input
            value={campo.placeholder ?? ""}
            onChange={(e) => update({ placeholder: e.target.value || undefined })}
            placeholder="https://ejemplo.com"
            disabled={disabled}
          />
        </div>
      );

    default:
      return null;
  }
}

// configuracion de tipo archivo con presets
function ArchivoConfig({
  campo,
  onChange,
  disabled,
}: {
  campo: Extract<FormField, { tipo: "archivo" }>;
  onChange: (changes: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const current = campo.tiposPermitidos ?? [".pdf"];

  function toggleFileType(ext: string) {
    const next = current.includes(ext)
      ? current.filter((t) => t !== ext)
      : [...current, ext];
    if (next.length > 0) onChange({ tiposPermitidos: next });
  }

  function applyPreset(preset: keyof typeof filePresets) {
    onChange({ tiposPermitidos: [...filePresets[preset]] });
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Tipos permitidos</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("pdf")}
            className="text-xs"
            disabled={disabled}
          >
            Solo PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("documentos")}
            className="text-xs"
            disabled={disabled}
          >
            Documentos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset("imagenes")}
            className="text-xs"
            disabled={disabled}
          >
            Imagenes
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {allFileTypes.map((ext) => (
            <label key={ext} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={current.includes(ext)}
                onCheckedChange={() => toggleFileType(ext)}
                disabled={disabled}
              />
              {ext}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Max tamano (MB)</Label>
          <Input
            type="number"
            value={campo.maxTamanoMb ?? 10}
            onChange={(e) => onChange({ maxTamanoMb: Number(e.target.value) || 10 })}
            min={1}
            max={100}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>Max archivos</Label>
          <Input
            type="number"
            value={campo.maxArchivos ?? 1}
            onChange={(e) => onChange({ maxArchivos: Number(e.target.value) || 1 })}
            min={1}
            max={20}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}
