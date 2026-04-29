"use client";

import { memo } from "react";
import { Download, FileIcon, ExternalLink } from "lucide-react";
import type { SchemaDefinition, FormField, ArchivoResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFileSize } from "@/lib/format";
import { downloadArchivo } from "@/lib/api/archivo.api";

interface ResponseViewerProps {
  schema: SchemaDefinition;
  responseData: Record<string, unknown>;
  archivos: ArchivoResponse[];
  convocatoriaId: number;
  postulacionId: number;
}

// tipos que ocupan ancho completo (contenido largo o complejo)
const WIDE_TYPES = new Set(["texto_largo", "tabla", "archivo"]);

// determina si un campo debe ocupar ancho completo
function isWideCampo(campo: FormField): boolean {
  return WIDE_TYPES.has(campo.tipo);
}

// renderiza las respuestas del formulario en modo solo lectura
export function ResponseViewer({
  schema,
  responseData,
  archivos,
  convocatoriaId,
  postulacionId,
}: ResponseViewerProps) {
  if (!schema.secciones.length) {
    return <p className="text-sm text-secondary-400">No hay secciones en el formulario.</p>;
  }

  const firstId = schema.secciones[0].id;

  return (
    <Tabs defaultValue={firstId}>
      <TabsList className="flex-wrap h-auto gap-1">
        {schema.secciones.map((sec) => (
          <TabsTrigger key={sec.id} value={sec.id} className="text-xs">
            {sec.titulo}
          </TabsTrigger>
        ))}
      </TabsList>

      {schema.secciones.map((sec) => (
        <TabsContent key={sec.id} value={sec.id} className="pt-4">
          {sec.descripcion && (
            <p className="mb-4 text-sm text-secondary-500">{sec.descripcion}</p>
          )}
          {sec.campos.length === 0 ? (
            <p className="text-sm text-secondary-400">Seccion sin campos.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {sec.campos.map((campo) => (
                <CampoReadonly
                  key={campo.id}
                  campo={campo}
                  value={responseData[campo.id]}
                  otraValue={responseData[`${campo.id}__otra`] as string | undefined}
                  archivos={archivos.filter((a) => a.fieldId === campo.id)}
                  convocatoriaId={convocatoriaId}
                  postulacionId={postulacionId}
                  wide={isWideCampo(campo)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// renderiza un campo individual en modo lectura
const CampoReadonly = memo(function CampoReadonly({
  campo,
  value,
  otraValue,
  archivos,
  convocatoriaId,
  postulacionId,
  wide,
}: {
  campo: FormField;
  value: unknown;
  otraValue?: string;
  archivos: ArchivoResponse[];
  convocatoriaId: number;
  postulacionId: number;
  wide: boolean;
}) {
  const isEmpty = value === undefined || value === null || value === ""
    || (Array.isArray(value) && value.length === 0);

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-secondary-500">
        {campo.etiqueta}
        {campo.requerido && <span className="ml-0.5 text-destructive">*</span>}
      </dt>
      <dd className={`mt-1 text-sm ${isEmpty ? "italic text-secondary-400" : "text-secondary-900"}`}>
        <FieldValue
          campo={campo}
          value={value}
          otraValue={otraValue}
          archivos={archivos}
          convocatoriaId={convocatoriaId}
          postulacionId={postulacionId}
        />
      </dd>
    </div>
  );
});

// switch por tipo de campo para renderizar el valor
function FieldValue({
  campo,
  value,
  otraValue,
  archivos,
  convocatoriaId,
  postulacionId,
}: {
  campo: FormField;
  value: unknown;
  otraValue?: string;
  archivos: ArchivoResponse[];
  convocatoriaId: number;
  postulacionId: number;
}) {
  if (value === undefined || value === null || value === "") {
    return <>Sin respuesta</>;
  }

  switch (campo.tipo) {
    case "texto_corto":
      return <>{String(value)}</>;

    case "texto_largo":
      return <p className="whitespace-pre-wrap leading-relaxed">{String(value)}</p>;

    case "texto_url": {
      const url = String(value);
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 underline break-all"
        >
          {url}
          <ExternalLink className="size-3 shrink-0" />
        </a>
      );
    }

    case "numerico":
      return <>{String(value)}</>;

    case "seleccion_unica": {
      if (campo.tipo !== "seleccion_unica") return null;
      const strVal = String(value);
      if (strVal === "__otra__" && otraValue) {
        return <>{otraValue}</>;
      }
      const opcion = campo.opciones.find((o) => o.valor === strVal);
      return <>{opcion?.label ?? strVal}</>;
    }

    case "seleccion_multiple": {
      if (campo.tipo !== "seleccion_multiple") return null;
      const arr = Array.isArray(value) ? (value as string[]) : [];
      if (arr.length === 0) return <>Sin respuesta</>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {arr.map((v) => {
            const opt = campo.opciones.find((o) => o.valor === v);
            return (
              <Badge key={v} variant="secondary" className="text-xs font-normal">
                {opt?.label ?? v}
              </Badge>
            );
          })}
        </div>
      );
    }

    case "tabla": {
      if (campo.tipo !== "tabla") return null;
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      if (rows.length === 0) return <>Sin datos</>;
      return (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary-50/80">
                {campo.columnas.map((col) => (
                  <th key={col.id} className="px-3 py-2 text-left text-xs font-medium text-secondary-600">
                    {col.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {rows.map((row, i) => (
                <tr key={i}>
                  {campo.columnas.map((col) => (
                    <td key={col.id} className="px-3 py-2 text-secondary-800">
                      {row[col.id] != null ? String(row[col.id]) : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "archivo": {
      if (archivos.length === 0) return <>Sin archivos</>;
      return (
        <div className="space-y-1.5">
          {archivos.map((archivo) => (
            <ArchivoItem
              key={archivo.id}
              archivo={archivo}
              convocatoriaId={convocatoriaId}
              postulacionId={postulacionId}
            />
          ))}
        </div>
      );
    }

    case "si_no": {
      if (campo.tipo !== "si_no") return null;
      const label = value === true
        ? (campo.labelSi ?? "Si")
        : value === false
          ? (campo.labelNo ?? "No")
          : "";
      return <>{label}</>;
    }

    default:
      return <>{String(value)}</>;
  }
}

// item de archivo con boton de descarga
function ArchivoItem({
  archivo,
  convocatoriaId,
  postulacionId,
}: {
  archivo: ArchivoResponse;
  convocatoriaId: number;
  postulacionId: number;
}) {
  const handleDownload = async () => {
    const blob = await downloadArchivo(convocatoriaId, postulacionId, archivo.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.nombreOriginal;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2 rounded-md border bg-secondary-50/50 px-3 py-2">
      <FileIcon className="size-4 shrink-0 text-secondary-400" />
      <span className="flex-1 truncate text-sm text-secondary-800">{archivo.nombreOriginal}</span>
      <span className="text-xs text-secondary-400 shrink-0">{formatFileSize(archivo.tamanoBytes)}</span>
      <Button variant="ghost" size="sm" className="size-7 shrink-0" onClick={handleDownload}>
        <Download className="size-3.5" />
      </Button>
    </div>
  );
}
