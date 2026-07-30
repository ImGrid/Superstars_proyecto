"use client";

import { memo } from "react";
import { FormLabel } from "@/components/ui/form";

// Enunciado de un campo del formulario de postulacion.
//
// No se usa el Label base tal cual porque ese esta pensado para etiquetas de una
// o dos palabras: es un contenedor flex con interlineado 1. Con enunciados largos
// eso da dos problemas medidos: las lineas quedan pegadas (sin aire entre
// renglones) y el asterisco de obligatorio se despega del texto y flota en el
// extremo derecho, a media altura del bloque.
//
// Aqui el enunciado se trata como lo que es, texto de lectura: bloque,
// interlineado de lectura y asterisco pegado a la ultima palabra. Los enunciados
// largos ademas van en peso normal: un parrafo entero en semi-negrita se lee
// como un muro.
//
// El enunciado ocupa TODO el ancho del campo a proposito. Acortar la linea se
// leeria algo mejor, pero deja un hueco a la derecha entre el texto y su caja de
// respuesta, y el cliente ya pidio antes que no sobre espacio a la derecha.

// a partir de aqui el enunciado deja de ser una etiqueta y es un parrafo
const LARGO_PARRAFO = 120;

export const CampoLabel = memo(function CampoLabel({
  etiqueta,
  requerido,
}: {
  // opcional porque no todos los tipos de campo llevan etiqueta
  etiqueta?: string;
  requerido?: boolean;
}) {
  const esParrafo = (etiqueta?.length ?? 0) > LARGO_PARRAFO;

  return (
    <FormLabel
      className={`block leading-relaxed ${esParrafo ? "font-normal" : ""}`}
    >
      {etiqueta}
      {requerido && <span className="ml-1 text-error-500">*</span>}
    </FormLabel>
  );
});
