"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { TipoCampoFormulario } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SchemaAction } from "./_lib/schema-reducer";
import { categorias, getCamposByCategoria } from "./_lib/campo-types";
import { createDefaultCampo } from "./_lib/campo-defaults";

interface AddCampoPopoverProps {
  seccionId: string;
  nextOrden: number;
  dispatch: (action: SchemaAction) => void;
}

export function AddCampoPopover({ seccionId, nextOrden, dispatch }: AddCampoPopoverProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(tipo: TipoCampoFormulario) {
    const campo = createDefaultCampo(tipo, nextOrden);
    dispatch({
      type: "ADD_CAMPO",
      payload: { seccionId, campo },
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full text-secondary-500">
          <Plus className="size-4" />
          Agregar campo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          {categorias.map((cat) => {
            const tipos = getCamposByCategoria(cat.key);
            return (
              <div key={cat.key}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-secondary-400">
                  {cat.label}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {tipos.map(({ tipo, label, icon: Icon }) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => handleSelect(tipo)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-secondary-700 hover:bg-secondary-100 transition-colors text-left"
                    >
                      <Icon className="size-4 shrink-0 text-secondary-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
