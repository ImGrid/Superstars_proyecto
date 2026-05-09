"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, X } from "lucide-react";
import { listEmpresas } from "@/lib/api/empresa.api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface EmpresaComboboxValue {
  empresaId: number | null;
  empresaNombre: string | null;
}

interface EmpresaComboboxProps {
  value: EmpresaComboboxValue;
  onChange: (v: EmpresaComboboxValue) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Combobox creatable manual: permite seleccionar una empresa del sistema o escribir texto libre
export function EmpresaCombobox({ value, onChange, placeholder, disabled }: EmpresaComboboxProps) {
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // empresas del sistema (cacheado, sin paginar — admin tiene <100 empresas)
  const { data } = useQuery({
    queryKey: ["empresas-combobox"],
    queryFn: () => listEmpresas({ limit: 100 }),
    staleTime: 60_000,
  });

  const empresas = data?.data ?? [];
  const input = value.empresaNombre ?? "";

  // sugerencias: por nombre, ocultando la que ya esta exacta
  const sugerencias = input.trim()
    ? empresas
        .filter((e) =>
          e.razonSocial.toLowerCase().includes(input.toLowerCase()),
        )
        .filter((e) => e.razonSocial.toLowerCase() !== input.trim().toLowerCase())
        .slice(0, 5)
    : empresas.slice(0, 5);

  // cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(text: string) {
    // al editar el texto, se desvincula del id (debe re-seleccionar para vincular de nuevo)
    onChange({
      empresaId: null,
      empresaNombre: text.length > 0 ? text : null,
    });
  }

  function handleSelectEmpresa(emp: { id: number; razonSocial: string }) {
    onChange({ empresaId: emp.id, empresaNombre: emp.razonSocial });
    setShowList(false);
  }

  function handleClear() {
    onChange({ empresaId: null, empresaNombre: null });
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowList(true)}
          placeholder={placeholder ?? "Buscar empresa o escribir manualmente"}
          disabled={disabled}
          className="pr-24"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value.empresaId !== null && (
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 px-1.5 py-0 text-[10px] font-medium text-green-700"
            >
              <Building2 className="mr-0.5 size-2.5" />
              Vinculada
            </Badge>
          )}
          {input && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-secondary-100"
              aria-label="Limpiar empresa"
            >
              <X className="size-3.5 text-secondary-500" />
            </button>
          )}
        </div>
      </div>

      {showList && sugerencias.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-secondary-200 bg-white shadow-md">
          <div className="max-h-60 overflow-auto py-1">
            {sugerencias.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelectEmpresa(emp)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary-50"
              >
                <Building2 className="size-4 shrink-0 text-secondary-400" />
                <span className="truncate">{emp.razonSocial}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-1.5 text-xs text-secondary-500">
        {value.empresaId !== null
          ? "Vinculada a una empresa del sistema."
          : value.empresaNombre
            ? "Texto manual (no vinculado a ninguna empresa del sistema)."
            : "Opcional. Puedes buscar una empresa del sistema o escribir el nombre manualmente."}
      </p>
    </div>
  );
}
