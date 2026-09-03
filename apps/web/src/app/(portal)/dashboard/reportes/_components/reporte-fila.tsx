"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import type { ReporteCatalogoItem, FormatoReporte } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  descargarReporte,
  guardarArchivo,
  mensajeErrorReporte,
} from "@/lib/api/reporte.api";
import {
  ReporteFiltros,
  FILTROS_VACIOS,
  contarFiltrosActivos,
  type ValoresFiltro,
} from "./reporte-filtros";

// Icono y color de cada reporte. Sirven para reconocerlo de un vistazo sin
// leer el titulo, que es lo que hace escaneable una lista.
const ASPECTO: Record<
  string,
  { icono: string; fondo: string }
> = {
  contactos: { icono: "ph:address-book-duotone", fondo: "bg-primary-100 text-primary-700" },
  postulaciones: { icono: "ph:file-text-duotone", fondo: "bg-info-100 text-info-700" },
  respuestas: { icono: "ph:list-checks-duotone", fondo: "bg-azul-100 text-azul-700" },
  ecosistema: { icono: "ph:chart-pie-slice-duotone", fondo: "bg-success-100 text-success-700" },
  calidad_datos: { icono: "ph:magnifying-glass-duotone", fondo: "bg-warning-100 text-warning-700" },
};

const ASPECTO_POR_DEFECTO = {
  icono: "ph:file-duotone",
  fondo: "bg-secondary-100 text-secondary-600",
};

const FORMATO: Record<FormatoReporte, { etiqueta: string; icono: string }> = {
  excel: { etiqueta: "Excel", icono: "ph:microsoft-excel-logo-duotone" },
  pdf: { etiqueta: "PDF", icono: "ph:file-pdf-duotone" },
};

export function ReporteFila({ reporte }: { reporte: ReporteCatalogoItem }) {
  const [abierto, setAbierto] = useState(false);
  const [filtros, setFiltros] = useState<ValoresFiltro>(FILTROS_VACIOS);
  const [descargando, setDescargando] = useState<FormatoReporte | null>(null);

  const aspecto = ASPECTO[reporte.tipo] ?? ASPECTO_POR_DEFECTO;
  const activos = contarFiltrosActivos(filtros);
  const tieneFiltros = reporte.filtros.length > 0;

  async function descargar(formato: FormatoReporte) {
    setDescargando(formato);
    try {
      const archivo = await descargarReporte(reporte.tipo, {
        formato,
        ...(filtros.convocatoriaId && { convocatoriaId: Number(filtros.convocatoriaId) }),
        ...(filtros.categoriaId && { categoriaId: Number(filtros.categoriaId) }),
        ...(filtros.departamento && { departamento: filtros.departamento }),
        ...(filtros.etapa && { etapa: filtros.etapa as never }),
        ...(filtros.estado && { estado: filtros.estado as never }),
        ...(filtros.desde && { desde: filtros.desde }),
        ...(filtros.hasta && { hasta: filtros.hasta }),
      });
      guardarArchivo(archivo);
      toast.success(`${reporte.nombre} descargado`);
    } catch (error) {
      toast.error(
        await mensajeErrorReporte(
          error,
          "No se pudo generar el reporte. Vuelve a intentarlo.",
        ),
      );
    } finally {
      setDescargando(null);
    }
  }

  return (
    <li className="border-b border-secondary-100 last:border-b-0">
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            aspecto.fondo,
          )}
        >
          <Icon icon={aspecto.icono} className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-sm font-semibold text-secondary-900">
              {reporte.nombre}
            </h3>
            {reporte.disponible ? (
              <span className="text-[11.5px] font-medium tabular-nums text-secondary-500">
                {reporte.filas.toLocaleString("es-BO")}{" "}
                {reporte.filas === 1 ? "fila" : "filas"}
              </span>
            ) : (
              <span className="text-[11.5px] font-medium text-warning-700">
                Sin datos todavía
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-secondary-500">
            {reporte.disponible
              ? reporte.descripcion
              : reporte.motivoNoDisponible}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {tieneFiltros && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-secondary-600"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
            >
              <Icon
                icon="ph:funnel-duotone"
                className={cn("size-4", activos > 0 && "text-primary-600")}
              />
              <span className="hidden sm:inline">Filtros</span>
              {activos > 0 && (
                <span className="ml-0.5 rounded-full bg-primary-100 px-1.5 text-[10px] font-bold text-primary-700 tabular-nums">
                  {activos}
                </span>
              )}
            </Button>
          )}

          {reporte.formatos.map((formato) => (
            <Button
              key={formato}
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!reporte.disponible || descargando !== null}
              onClick={() => void descargar(formato)}
            >
              {descargando === formato ? (
                <Icon icon="ph:spinner-gap-bold" className="size-4 animate-spin" />
              ) : (
                <Icon icon={FORMATO[formato].icono} className="size-4" />
              )}
              {FORMATO[formato].etiqueta}
            </Button>
          ))}
        </div>
      </div>

      {/* Los filtros aparecen debajo de su propio reporte, no en una barra
          general: cada uno acepta unos distintos y una barra comun obligaria a
          adivinar cuales aplican. */}
      {abierto && tieneFiltros && (
        <div className="border-t border-secondary-100 bg-secondary-50/60 px-4 py-3">
          <ReporteFiltros
            admitidos={reporte.filtros}
            valores={filtros}
            onChange={setFiltros}
          />
          {activos > 0 && (
            <button
              type="button"
              onClick={() => setFiltros(FILTROS_VACIOS)}
              className="mt-2.5 text-xs font-medium text-primary-700 hover:underline"
            >
              Quitar los filtros
            </button>
          )}
        </div>
      )}
    </li>
  );
}
