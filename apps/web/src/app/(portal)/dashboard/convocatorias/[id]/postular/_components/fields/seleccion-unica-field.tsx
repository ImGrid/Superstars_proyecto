"use client";

import { memo } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FieldRendererProps } from "./field-props";

// valor especial para la opcion "Otra"
const OTRA_VALUE = "__otra__";

export const SeleccionUnicaField = memo(function SeleccionUnicaField({
  campo,
  form,
}: FieldRendererProps) {
  if (campo.tipo !== "seleccion_unica") return null;

  const { opciones, permiteOtra, display } = campo;
  const otraFieldId = `${campo.id}__otra`;

  // dropdown mode
  if (display === "dropdown") {
    return (
      <FormField
        control={form.control}
        name={campo.id}
        render={({ field }) => {
          const isOtra = field.value === OTRA_VALUE;

          return (
            <FormItem>
              <FormLabel>
                {campo.etiqueta}
                {campo.requerido && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <Select
                onValueChange={(val) => {
                  field.onChange(val);
                  // limpiar campo "otra" si se selecciona una opcion normal
                  if (val !== OTRA_VALUE) {
                    form.setValue(otraFieldId, undefined);
                  }
                }}
                value={(field.value as string) ?? ""}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {opciones.map((opt) => (
                    <SelectItem key={opt.valor} value={opt.valor}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  {permiteOtra && (
                    <SelectItem value={OTRA_VALUE}>Otra...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {/* campo de texto para "Otra" */}
              {permiteOtra && isOtra && (
                <Input
                  placeholder="Especifique..."
                  className="mt-2"
                  value={(form.watch(otraFieldId) as string) ?? ""}
                  onChange={(e) =>
                    form.setValue(otraFieldId, e.target.value, { shouldDirty: true })
                  }
                />
              )}
              {campo.descripcion && (
                <FormDescription>{campo.descripcion}</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  // radio mode
  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={({ field }) => {
        const isOtra = field.value === OTRA_VALUE;

        return (
          <FormItem>
            <FormLabel>
              {campo.etiqueta}
              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(val) => {
                  field.onChange(val);
                  if (val !== OTRA_VALUE) {
                    form.setValue(otraFieldId, undefined);
                  }
                }}
                value={(field.value as string) ?? ""}
                className="space-y-2"
              >
                {opciones.map((opt) => (
                  <div key={opt.valor} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.valor} id={`${campo.id}_${opt.valor}`} />
                    <Label htmlFor={`${campo.id}_${opt.valor}`} className="font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
                {permiteOtra && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={OTRA_VALUE} id={`${campo.id}_otra`} />
                    <Label htmlFor={`${campo.id}_otra`} className="font-normal">
                      Otra
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </FormControl>
            {permiteOtra && isOtra && (
              <Input
                placeholder="Especifique..."
                className="mt-2"
                value={(form.watch(otraFieldId) as string) ?? ""}
                onChange={(e) =>
                  form.setValue(otraFieldId, e.target.value, { shouldDirty: true })
                }
              />
            )}
            {campo.descripcion && (
              <FormDescription>{campo.descripcion}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
});
