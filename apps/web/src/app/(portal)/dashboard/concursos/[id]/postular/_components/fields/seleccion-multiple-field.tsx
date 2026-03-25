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
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldRendererProps } from "./field-props";

export const SeleccionMultipleField = memo(function SeleccionMultipleField({
  campo,
  form,
}: FieldRendererProps) {
  if (campo.tipo !== "seleccion_multiple") return null;

  const { opciones } = campo;

  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={({ field }) => {
        const selected = (field.value as string[]) ?? [];

        return (
          <FormItem>
            <FormLabel>
              {campo.etiqueta}
              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <div className="grid gap-2 sm:grid-cols-2">
                {opciones.map((opt) => (
                  <label
                    key={opt.valor}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(opt.valor)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...selected, opt.valor]
                            : selected.filter((v) => v !== opt.valor),
                        );
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </FormControl>
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
