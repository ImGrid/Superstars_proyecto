"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { AdminCoberturaDepartamentoItem } from "@superstars/shared";
import { cn } from "@/lib/utils";

// GeoJSON de los 9 departamentos (geoBoundaries ADM1, simplificado). Se sirve
// estatico desde /public y se descarga solo cuando el admin abre el dashboard.
const GEO_URL = "/geo/bolivia-departamentos.geojson";
const W = 340;
const H = 380;

// normaliza el nombre del GeoJSON (shapeName) al slug canonico usado en empresa
// y OPCIONES_DEPARTAMENTO: "La Paz" -> la_paz, "Potosi" -> potosi, "Santa Cruz" -> santa_cruz
function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
}

// escala secuencial navy; los departamentos sin empresas se pintan ambar (oportunidad)
function fillClass(total: number): string {
  if (total <= 0) return "fill-warning-100";
  if (total <= 2) return "fill-primary-200";
  if (total <= 5) return "fill-primary-400";
  return "fill-primary-600";
}

interface GeoFeature {
  type: "Feature";
  properties: { shapeName: string };
  geometry: unknown;
}
interface GeoData {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface Props {
  data: AdminCoberturaDepartamentoItem[];
  onSelectDepartamento?: (slug: string) => void;
}

export function BoliviaChoropleth({ data, onSelectDepartamento }: Props) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [hover, setHover] = useState<{
    label: string;
    total: number;
    x: number;
    y: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((d: GeoData) => {
        if (alive) setGeo(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // indice slug -> item de cobertura
  const bySlug = useMemo(() => {
    const m = new Map<string, AdminCoberturaDepartamentoItem>();
    for (const d of data) m.set(d.departamento, d);
    return m;
  }, [data]);

  // proyeccion + paths (se recalcula solo cuando cambia el geojson o la data)
  const paths = useMemo(() => {
    if (!geo) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projection = geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], geo as any);
    const pathGen = geoPath(projection);
    return geo.features.map((f) => {
      const slug = slugify(f.properties.shapeName);
      const item = bySlug.get(slug);
      return {
        slug,
        label: item?.label ?? f.properties.shapeName,
        total: item?.total ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        d: pathGen(f as any) ?? "",
      };
    });
  }, [geo, bySlug]);

  if (!geo) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-secondary-400">
        Cargando mapa…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Empresas registradas por departamento de Bolivia"
      >
        {paths.map((p) => (
          <path
            key={p.slug}
            d={p.d}
            className={cn(
              fillClass(p.total),
              "cursor-pointer stroke-white transition-all [stroke-width:0.8] hover:stroke-amarillo-600 hover:[stroke-width:1.6]",
            )}
            onMouseMove={(e) => {
              const rect = wrapRef.current?.getBoundingClientRect();
              setHover({
                label: p.label,
                total: p.total,
                x: e.clientX - (rect?.left ?? 0),
                y: e.clientY - (rect?.top ?? 0),
              });
            }}
            onMouseLeave={() => setHover(null)}
            onClick={() => onSelectDepartamento?.(p.slug)}
          />
        ))}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-secondary-200 bg-white px-2 py-1 text-xs shadow-md"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <span className="font-semibold text-secondary-900">{hover.label}</span>
          <span className="ml-1.5 text-secondary-500">
            {hover.total} {hover.total === 1 ? "empresa" : "empresas"}
          </span>
        </div>
      )}
    </div>
  );
}
