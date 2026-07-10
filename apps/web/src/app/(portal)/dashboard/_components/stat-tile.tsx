import Link from "next/link";
import { cn } from "@/lib/utils";

// tono semantico del icono y del pie de la metrica
type Tone = "primary" | "success" | "warning" | "error" | "orange" | "neutral";

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  // linea de contexto accionable (ej. "1 cierra en 5 dias")
  foot?: string;
  footTone?: Tone;
  // color del icono a la derecha
  tone?: Tone;
  icon?: React.ReactNode;
  href?: string;
}

const iconBg: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  error: "bg-error-100 text-error-700",
  orange: "bg-orange-100 text-orange-700",
  neutral: "bg-secondary-100 text-secondary-600",
};

const footText: Record<Tone, string> = {
  primary: "text-primary-600",
  success: "text-success-600",
  warning: "text-warning-700",
  error: "text-error-600",
  orange: "text-orange-700",
  neutral: "text-secondary-500",
};

// KPI compacto: numero grande a la izquierda, icono a la derecha (ocupa el espacio).
// Sin la barra vertical de color de la version anterior.
export function StatTile({
  label,
  value,
  unit,
  foot,
  footTone = "neutral",
  tone = "primary",
  icon,
  href,
}: StatTileProps) {
  const inner = (
    <div className="flex h-full items-center gap-3 rounded-xl border border-secondary-200 bg-white px-4 py-3 transition-colors hover:border-secondary-300">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-500">
          {label}
        </p>
        <p className="mt-1 font-bold leading-none text-secondary-900">
          <span className="text-2xl tabular-nums">{value}</span>
          {unit && (
            <span className="ml-1 text-sm font-semibold text-secondary-400">{unit}</span>
          )}
        </p>
        {foot && (
          <p className={cn("mt-1.5 text-[11.5px] font-medium tabular-nums", footText[footTone])}>
            {foot}
          </p>
        )}
      </div>
      {icon && (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconBg[tone],
          )}
        >
          {icon}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
