import { cn } from "@/lib/utils";

// Contenedor base de los paneles del dashboard: compacto, sin el padding doble del Card shadcn.
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-secondary-200 bg-white", className)}>
      {children}
    </div>
  );
}

// Encabezado de panel: titulo + pista opcional a la izquierda, contenido opcional a la derecha.
export function PanelHeader({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-secondary-100 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-secondary-900">{title}</h2>
        {hint && <span className="text-xs text-secondary-400">{hint}</span>}
      </div>
      {right}
    </div>
  );
}
