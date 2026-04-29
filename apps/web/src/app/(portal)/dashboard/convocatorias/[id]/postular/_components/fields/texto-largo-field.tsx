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
import { Textarea } from "@/components/ui/textarea";
import type { FieldRendererProps } from "./field-props";

export const TextoLargoField = memo(function TextoLargoField({
  campo,
  form,
}: FieldRendererProps) {
  const maxPalabras = "maxPalabras" in campo ? (campo.maxPalabras as number) : undefined;
  const filas = "filas" in campo ? (campo.filas as number) : 4;
  const placeholder = "placeholder" in campo ? (campo.placeholder as string) : undefined;

  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={({ field }) => {
        const text = (field.value as string) ?? "";
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

        return (
          <FormItem>
            <FormLabel>
              {campo.etiqueta}
              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={placeholder}
                rows={filas}
                {...field}
                value={text}
              />
            </FormControl>
            <div className="flex items-center justify-between">
              {campo.descripcion ? (
                <FormDescription>{campo.descripcion}</FormDescription>
              ) : (
                <span />
              )}
              {maxPalabras && (
                <span
                  className={`text-xs ${
                    wordCount > maxPalabras
                      ? "text-red-500 font-medium"
                      : "text-secondary-400"
                  }`}
                >
                  {wordCount}/{maxPalabras} palabras
                </span>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
});
