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

export const TextoCortoField = memo(function TextoCortoField({
  campo,
  form,
}: FieldRendererProps) {
  // extraer props especificas del tipo texto_corto
  const placeholder = "placeholder" in campo ? (campo.placeholder as string) : undefined;
  const maxLength = "maxLength" in campo ? (campo.maxLength as number) : undefined;

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
              placeholder={placeholder}
              maxLength={maxLength}
              {...field}
              value={(field.value as string) ?? ""}
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
