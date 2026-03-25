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
import { Input } from "@/components/ui/input";
import type { FieldRendererProps } from "./field-props";

export const NumericoField = memo(function NumericoField({
  campo,
  form,
}: FieldRendererProps) {
  const min = "min" in campo ? (campo.min as number) : undefined;
  const max = "max" in campo ? (campo.max as number) : undefined;
  const placeholder = "placeholder" in campo ? (campo.placeholder as string) : undefined;

  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {campo.etiqueta}
            {campo.requerido && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              min={min}
              max={max}
              {...field}
              value={field.value != null ? String(field.value) : ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? undefined : Number(v));
              }}
            />
          </FormControl>
          {campo.descripcion && (
            <FormDescription>{campo.descripcion}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
});
