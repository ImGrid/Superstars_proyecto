import Link from "next/link";
import { Icon } from "@iconify/react";

// Franja compacta y tranquilizadora para cuando el usuario esta al dia (sin trabajo pendiente).
// Reemplaza a la tarjeta enorme vacia: comunica "todo en orden" sin desperdiciar espacio.
export function AlDiaStrip({
  titulo,
  detalle,
  ctaLabel,
  ctaHref,
}: {
  titulo: string;
  detalle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-success-500/30 bg-success-50 px-4 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-600 text-white">
        <Icon icon="ph:check-bold" className="size-4" />
      </div>
      <p className="flex-1 text-sm text-secondary-700">
        <span className="font-semibold text-success-700">{titulo}</span>
        {detalle && <span className="text-secondary-500"> — {detalle}</span>}
      </p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="shrink-0 text-xs font-semibold text-success-700 hover:text-success-800"
        >
          {ctaLabel} →
        </Link>
      )}
    </div>
  );
}
