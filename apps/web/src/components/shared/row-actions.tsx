"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Contenedor de acciones de fila: botones directos alineados a la derecha.
// Reemplaza al dropdown de 3 puntos por acciones visibles y descubribles.
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5">{children}</div>
  );
}

interface RowActionProps {
  icon: React.ReactNode;
  // texto del tooltip y label accesible
  label: string;
  // navegacion (href) o accion (onClick); usar uno de los dos
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

// Boton de accion individual: solo icono, con tooltip. Usa el TooltipProvider
// global (layout.tsx).
export function RowAction({
  icon,
  label,
  href,
  onClick,
  destructive = false,
  disabled = false,
}: RowActionProps) {
  const className = cn(
    "size-8 text-secondary-500 hover:text-secondary-900",
    destructive && "text-destructive hover:text-destructive hover:bg-destructive/10",
  );

  const content = (
    <>
      {icon}
      <span className="sr-only">{label}</span>
    </>
  );

  const trigger =
    href && !disabled ? (
      <Button asChild variant="ghost" size="icon" className={className}>
        <Link href={href}>{content}</Link>
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </Button>
    );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
