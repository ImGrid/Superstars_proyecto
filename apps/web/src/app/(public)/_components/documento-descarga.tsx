"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Opcion de descarga de una tarjeta. Cuando el documento tiene una version por
// categoria hay 2 opciones y el boton abre un dialogo para elegir.
export interface OpcionDescarga {
  etiqueta: string;
  detalle: string;
  archivo: string;
}

interface Props {
  opciones: OpcionDescarga[];
  acento: string;
  // titulo de la tarjeta, se usa en el encabezado del dialogo
  titulo: string;
}

// clases compartidas por el boton y el enlace directo para que se vean igual
const CLASES_BOTON =
  "mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 font-display text-sm font-bold text-white transition-opacity hover:opacity-90";

export function DocumentoDescarga({ opciones, acento, titulo }: Props) {
  const [abierto, setAbierto] = useState(false);

  // sin opciones: el PDF todavia no esta cargado, asi que por ahora el boton
  // lleva a iniciar sesion (mismo aspecto que los demas)
  if (opciones.length === 0) {
    return (
      <Link
        href="/auth/login"
        className={CLASES_BOTON}
        style={{ backgroundColor: acento }}
      >
        <Download className="size-4" />
        Descargar
      </Link>
    );
  }

  // un solo documento: descarga directa, sin ventana intermedia
  if (opciones.length === 1) {
    return (
      <a
        href={opciones[0].archivo}
        download
        className={CLASES_BOTON}
        style={{ backgroundColor: acento }}
      >
        <Download className="size-4" />
        Descargar
      </a>
    );
  }

  // varias versiones: el boton abre el dialogo para elegir la categoria
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={CLASES_BOTON}
        style={{ backgroundColor: acento }}
      >
        <Download className="size-4" />
        Descargar
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-primary-600">
              {titulo}
            </DialogTitle>
            <DialogDescription>
              Este documento tiene una versión por categoría. Elige la que
              corresponde a tu postulación.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-3">
            {opciones.map((op) => (
              <a
                key={op.archivo}
                href={op.archivo}
                download
                onClick={() => setAbierto(false)}
                className="flex items-center gap-3 rounded-xl border-2 border-secondary-200 px-4 py-3 text-left transition-colors hover:border-secondary-300 hover:bg-secondary-50"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: acento }}
                >
                  <Download className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold text-primary-600">
                    {op.etiqueta}
                  </span>
                  <span className="block text-xs text-secondary-600">
                    {op.detalle}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
