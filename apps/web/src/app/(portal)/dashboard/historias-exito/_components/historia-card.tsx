"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@iconify/react";
import { Building2 } from "lucide-react";
import type { HistoriaExitoResponse } from "@superstars/shared";
import { Badge } from "@/components/ui/badge";
import { HistoriaActions } from "./historia-actions";

interface HistoriaCardProps {
  historia: HistoriaExitoResponse;
  draggable?: boolean;
}

export function HistoriaCard({ historia, draggable = false }: HistoriaCardProps) {
  const sortable = useSortable({
    id: historia.id,
    disabled: !draggable,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style = draggable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}/historias-exito/${historia.id}/imagen`;

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={style}
      className={`group relative overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-sm transition-shadow hover:shadow-md ${
        !historia.activa ? "opacity-60" : ""
      }`}
    >
      {/* imagen */}
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={historia.titulo}
          className="size-full object-cover"
        />
        {/* drag handle (solo si draggable) */}
        {draggable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="absolute left-2 top-2 flex size-8 cursor-grab items-center justify-center rounded-md bg-white/90 text-secondary-600 backdrop-blur-sm hover:bg-white active:cursor-grabbing"
            aria-label="Arrastrar para reordenar"
            title="Arrastrar para reordenar"
          >
            <Icon icon="ph:dots-six-vertical-duotone" className="size-5" />
          </button>
        )}
        {/* acciones */}
        <div className="absolute right-2 top-2">
          <HistoriaActions historia={historia} />
        </div>
        {/* indicador de inactiva */}
        {!historia.activa && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-secondary-800/80 text-white">
              <Icon icon="ph:eye-slash-duotone" className="mr-1 size-3" />
              Inactiva
            </Badge>
          </div>
        )}
      </div>

      {/* contenido */}
      <div className="p-4">
        {historia.badge && (
          <Badge className="mb-2 bg-primary-50 text-primary-700">
            {historia.badge}
          </Badge>
        )}
        <h3 className="line-clamp-2 font-heading text-base font-bold text-primary-800">
          {historia.titulo}
        </h3>
        {historia.empresaNombre && (
          <p className="mt-1 flex items-center gap-1 text-xs text-secondary-500">
            <Building2 className="size-3" />
            <span className="truncate">{historia.empresaNombre}</span>
          </p>
        )}
        <p className="mt-2 line-clamp-3 text-sm text-secondary-600">
          {historia.descripcion}
        </p>
      </div>
    </div>
  );
}
