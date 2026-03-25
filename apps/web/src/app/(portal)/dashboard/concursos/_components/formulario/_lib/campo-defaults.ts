import type { FormField, TipoCampoFormulario } from "@superstars/shared";
import { campoId, opcionId, columnaId } from "./id-utils";

// crea un campo con valores por defecto segun el tipo
export function createDefaultCampo(
  tipo: TipoCampoFormulario,
  orden: number,
): FormField {
  const base = {
    id: campoId(),
    etiqueta: "",
    requerido: false,
    orden,
    fijo: false,
  };

  switch (tipo) {
    case "texto_corto":
      return { ...base, tipo: "texto_corto" };
    case "texto_largo":
      return { ...base, tipo: "texto_largo", filas: 4 };
    case "numerico":
      return { ...base, tipo: "numerico" };
    case "seleccion_unica":
      return {
        ...base,
        tipo: "seleccion_unica",
        opciones: [
          { valor: "opcion_1", label: "Opcion 1" },
          { valor: "opcion_2", label: "Opcion 2" },
        ],
        permiteOtra: false,
        display: "dropdown",
      };
    case "seleccion_multiple":
      return {
        ...base,
        tipo: "seleccion_multiple",
        opciones: [
          { valor: "opcion_1", label: "Opcion 1" },
          { valor: "opcion_2", label: "Opcion 2" },
        ],
        permiteOtra: false,
      };
    case "tabla":
      return {
        ...base,
        tipo: "tabla",
        columnas: [
          { id: columnaId(), titulo: "Columna 1", tipo: "texto_corto", requerido: false },
        ],
        filasIniciales: 3,
        filasDinamicas: false,
      };
    case "archivo":
      return {
        ...base,
        tipo: "archivo",
        tiposPermitidos: [".pdf"],
        maxTamanoMb: 10,
        maxArchivos: 1,
      };
    case "si_no":
      return { ...base, tipo: "si_no", labelSi: "Si", labelNo: "No" };
    case "texto_url":
      return { ...base, tipo: "texto_url" };
  }
}
