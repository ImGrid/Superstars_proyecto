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

export const TextoUrlField = memo(function TextoUrlField({
  campo,
  form,
}: FieldRendererProps) {
  const placeholder = "placeholder" in campo ? (campo.placeholder as string) : "https://";

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
              type="url"
              placeholder={placeholder}
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
