"use client";

import { useQuery } from "@tanstack/react-query";
import {
  OPCIONES_DEPARTAMENTO,
  ESTADOS_POSTULACION,
  ETAPA_EMBUDO_LABEL,
  ESTADO_POSTULACION_LABEL,
  etapaEmbudoValues,
} from "@superstars/shared";
import type { FiltroReporte } from "@superstars/shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convocatoriaQueries, categoriaQueries } from "@/lib/api/query-keys";

// Valores de un filtro. Se guarda todo como texto porque asi viaja en la
// consulta; el vacio significa "sin filtro".
export interface ValoresFiltro {
  convocatoriaId: string;
  categoriaId: string;
  departamento: string;
  etapa: string;
  estado: string;
  desde: string;
  hasta: string;
}

export const FILTROS_VACIOS: ValoresFiltro = {
  convocatoriaId: "",
  categoriaId: "",
  departamento: "",
  etapa: "",
  estado: "",
  desde: "",
  hasta: "",
};

// valor del select cuando no hay filtro (Radix no admite un item con valor "")
const TODOS = "todos";

export function contarFiltrosActivos(valores: ValoresFiltro): number {
  return Object.values(valores).filter((v) => v !== "").length;
}

// Campo con su etiqueta encima. La etiqueta va pequeña y en mayusculas, igual
// que en el resto del portal, para que ocupe poco y siga siendo legible.
//
// No lleva ancho propio: lo reparte la rejilla del contenedor. Con anchos fijos
// el ultimo campo caia solo en una segunda fila y dejaba un hueco al costado.
function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-secondary-500">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

function SelectFiltro({
  valor,
  onChange,
  placeholder,
  opciones,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  opciones: { valor: string; label: string }[];
}) {
  return (
    <Select
      value={valor === "" ? TODOS : valor}
      onValueChange={(v) => onChange(v === TODOS ? "" : v)}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODOS}>{placeholder}</SelectItem>
        {opciones.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Muestra SOLO los filtros que el reporte acepta. La lista viene del catálogo
// del servidor, así que si mañana un reporte gana o pierde un filtro, esta
// pantalla se ajusta sola sin tocar nada aquí.
export function ReporteFiltros({
  admitidos,
  valores,
  onChange,
}: {
  admitidos: FiltroReporte[];
  valores: ValoresFiltro;
  onChange: (valores: ValoresFiltro) => void;
}) {
  const acepta = (f: FiltroReporte) => admitidos.includes(f);

  // Las convocatorias se piden solo si este reporte las filtra.
  const { data: convocatorias } = useQuery({
    ...convocatoriaQueries.list({ page: 1, limit: 50 }),
    enabled: acepta("convocatoriaId"),
  });

  // Las categorías dependen de la convocatoria elegida: sin ella no hay lista
  // que mostrar, y sus ids no son únicos fuera de su convocatoria.
  const convocatoriaId = valores.convocatoriaId
    ? Number(valores.convocatoriaId)
    : null;
  const { data: categorias } = useQuery({
    ...categoriaQueries.list(convocatoriaId ?? 0),
    enabled: acepta("categoriaId") && convocatoriaId !== null,
  });

  const set = (parcial: Partial<ValoresFiltro>) =>
    onChange({ ...valores, ...parcial });

  return (
    // Rejilla de columnas iguales: los campos siempre reparten el ancho
    // disponible y las filas quedan parejas, en vez de dejar uno suelto.
    <div className="grid grid-cols-2 items-end gap-x-3 gap-y-2.5 md:grid-cols-3 xl:grid-cols-6">
      {acepta("convocatoriaId") && (
        <Campo etiqueta="Convocatoria">
          <SelectFiltro
            valor={valores.convocatoriaId}
            // al cambiar de convocatoria la categoría anterior deja de existir
            onChange={(v) => set({ convocatoriaId: v, categoriaId: "" })}
            placeholder="Todas"
            opciones={(convocatorias?.data ?? []).map((c) => ({
              valor: String(c.id),
              label: c.nombre,
            }))}
          />
        </Campo>
      )}

      {acepta("categoriaId") && (
        <Campo etiqueta="Categoría">
          {convocatoriaId === null ? (
            // Sin convocatoria no se puede filtrar por categoría, y el servidor
            // además lo rechaza. Se explica en vez de mostrar un select vacío.
            <p className="flex h-9 items-center text-xs text-secondary-400">
              Elige primero una convocatoria
            </p>
          ) : (
            <SelectFiltro
              valor={valores.categoriaId}
              onChange={(v) => set({ categoriaId: v })}
              placeholder="Todas"
              opciones={(categorias ?? []).map((c) => ({
                valor: String(c.id),
                label: c.nombre,
              }))}
            />
          )}
        </Campo>
      )}

      {acepta("etapa") && (
        <Campo etiqueta="Etapa">
          <SelectFiltro
            valor={valores.etapa}
            onChange={(v) => set({ etapa: v })}
            placeholder="Todas"
            opciones={etapaEmbudoValues.map((e) => ({
              valor: e,
              label: ETAPA_EMBUDO_LABEL[e],
            }))}
          />
        </Campo>
      )}

      {acepta("estado") && (
        <Campo etiqueta="Estado">
          <SelectFiltro
            valor={valores.estado}
            onChange={(v) => set({ estado: v })}
            placeholder="Todos"
            opciones={ESTADOS_POSTULACION.map((e) => ({
              valor: e,
              label: ESTADO_POSTULACION_LABEL[e],
            }))}
          />
        </Campo>
      )}

      {acepta("departamento") && (
        <Campo etiqueta="Departamento">
          <SelectFiltro
            valor={valores.departamento}
            onChange={(v) => set({ departamento: v })}
            placeholder="Todos"
            opciones={OPCIONES_DEPARTAMENTO.map((o) => ({
              valor: o.valor,
              label: o.label,
            }))}
          />
        </Campo>
      )}

      {acepta("desde") && (
        <Campo etiqueta="Desde">
          <Input
            type="date"
            className="h-9"
            value={valores.desde}
            max={valores.hasta || undefined}
            onChange={(e) => set({ desde: e.target.value })}
          />
        </Campo>
      )}

      {acepta("hasta") && (
        <Campo etiqueta="Hasta">
          <Input
            type="date"
            className="h-9"
            value={valores.hasta}
            min={valores.desde || undefined}
            onChange={(e) => set({ hasta: e.target.value })}
          />
        </Campo>
      )}
    </div>
  );
}
