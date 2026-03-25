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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { FieldRendererProps } from "./field-props";

export const SiNoField = memo(function SiNoField({
  campo,
  form,
}: FieldRendererProps) {
  const labelSi = "labelSi" in campo ? (campo.labelSi as string) : "Si";
  const labelNo = "labelNo" in campo ? (campo.labelNo as string) : "No";

  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={({ field }) => {
        // convertir boolean a string para RadioGroup y viceversa
        const stringValue =
          field.value === true ? "true" : field.value === false ? "false" : "";

        return (
          <FormItem>
            <FormLabel>
              {campo.etiqueta}
              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(val) => field.onChange(val === "true")}
                value={stringValue}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="true" id={`${campo.id}_si`} />
                  <Label htmlFor={`${campo.id}_si`} className="font-normal">
                    {labelSi}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="false" id={`${campo.id}_no`} />
                  <Label htmlFor={`${campo.id}_no`} className="font-normal">
                    {labelNo}
                  </Label>
                </div>
              </RadioGroup>
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
