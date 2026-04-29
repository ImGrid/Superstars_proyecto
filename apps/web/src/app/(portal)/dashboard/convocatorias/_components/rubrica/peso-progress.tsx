"use client";

import { cn } from "@/lib/utils";

interface PesoProgressProps {
  actual: number;
  objetivo: number;
  label?: string;
  className?: string;
}

// barra visual de progreso de pesos (suma actual vs objetivo)
export function PesoProgress({ actual, objetivo, label, className }: PesoProgressProps) {
  const porcentaje = objetivo > 0 ? Math.min((actual / objetivo) * 100, 100) : 0;
  const isExact = Math.abs(actual - objetivo) < 0.01;
  const isOver = actual > objetivo + 0.01;

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary-500">{label}</span>
          <span
            className={cn(
              "font-medium",
              isExact && "text-emerald-600",
              isOver && "text-destructive",
              !isExact && !isOver && "text-secondary-700",
            )}
          >
            {actual} / {objetivo}
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-secondary-100">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            isExact && "bg-emerald-500",
            isOver && "bg-destructive",
            !isExact && !isOver && "bg-primary",
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
