"use client";

import { memo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";

// Valor centinela para la opcion "Otra" en seleccion_unica y seleccion_multiple.
// El backend persiste este string como uno de los valores y el texto libre
// va al sub-campo `${campoId}__otra`.
export const OTRA_VALUE = "__otra__";

// Sufijo del sub-campo donde se guarda el texto libre cuando el usuario marca "Otra".
export function getOtraFieldId(campoId: string): string {
  return `${campoId}__otra`;
}

// Input para escribir el valor libre cuando el usuario selecciono "Otra".
// Se subscribe al sub-campo con useWatch para que el re-render lo dispare el
// propio sub-campo y no dependa del FormField del campo principal (cuyo Controller
// solo escucha el name principal y no se re-renderiza al cambiar el sub-campo).
export const OtraInput = memo(function OtraInput({ name }: { name: string }) {
  const { setValue, control } = useFormContext();
  const value = useWatch({ control, name }) as string | undefined;
  return (
    <Input
      placeholder="Especifique..."
      className="mt-2"
      value={value ?? ""}
      onChange={(e) => setValue(name, e.target.value, { shouldDirty: true })}
    />
  );
});
