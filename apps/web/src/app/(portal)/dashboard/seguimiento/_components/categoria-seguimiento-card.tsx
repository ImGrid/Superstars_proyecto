"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { FileText, ListChecks, Users, ChartLine } from "lucide-react";
import type { SeguimientoCategoria } from "@superstars/shared";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { seguimientoQueries } from "@/lib/api/query-keys";
import { formatMoney } from "@/lib/format";
import { acentoCategoria, iconoCategoria } from "@/lib/acento-categoria";
import { FormularioPreviewDialog } from "@/app/(portal)/dashboard/convocatorias/_components/formulario/preview/formulario-preview-dialog";
import { RubricaSeguimientoDialog } from "./rubrica-seguimiento-dialog";

interface Props {
  convocatoriaId: number;
  categoria: SeguimientoCategoria;
}

// Card de categoria en el detalle de seguimiento. Muestra los datos de la
// categoria (premio, ganadores, descripcion, bases) y sus documentos
// descargables. Sin CTA de accion: el observador solo consulta.
export function CategoriaSeguimientoCard({ convocatoriaId, categoria }: Props) {
  const acento = acentoCategoria(categoria.orden);
  const [formularioOpen, setFormularioOpen] = useState(false);
  const [rubricaOpen, setRubricaOpen] = useState(false);

  // El formulario se carga solo cuando el observador abre la vista previa: no
  // tiene sentido traer el schema de todas las categorias al entrar.
  const { data: formulario, isFetching: cargandoForm } = useQuery({
    ...seguimientoQueries.formulario(convocatoriaId, categoria.id),
    enabled: formularioOpen,
  });

  // La rubrica tambien se carga on-demand al abrir su vista.
  const { data: rubrica, isFetching: cargandoRubrica } = useQuery({
    ...seguimientoQueries.rubrica(convocatoriaId, categoria.id),
    enabled: rubricaOpen,
  });

  return (
    <Card className={acento.borde}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${acento.iconoFondo}`}
            aria-hidden="true"
          >
            <Icon icon={iconoCategoria(categoria.orden)} className={`size-6 ${acento.icono}`} />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className={`text-base leading-tight ${acento.texto}`}>
              {categoria.nombre}
            </CardTitle>
            <p className="mt-1.5">
              <span className={`font-display text-2xl font-bold tracking-tight ${acento.texto}`}>
                {formatMoney(categoria.monto)}
              </span>
              <span className="ml-1.5 text-sm text-secondary-600">
                para cada una de las {categoria.numeroGanadores} ganadoras
              </span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoria.descripcion && (
          <p className="max-w-[68ch] text-sm break-words whitespace-pre-line text-secondary-700">
            {categoria.descripcion}
          </p>
        )}

        {categoria.bases && (
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-secondary-800">
              <Icon icon="ph:list-checks-duotone" className={`size-4 ${acento.icono}`} />
              Bases y requisitos
            </p>
            <p className="mt-1 max-w-[68ch] text-sm leading-relaxed break-words whitespace-pre-line text-secondary-700">
              {categoria.bases}
            </p>
          </div>
        )}

        {/* accesos de consulta de la categoria */}
        <div className="flex flex-wrap gap-2 border-t border-secondary-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!categoria.tieneFormulario || cargandoForm}
            onClick={() => setFormularioOpen(true)}
          >
            <FileText className="size-4" />
            Ver formulario
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!categoria.tieneRubrica || cargandoRubrica}
            onClick={() => setRubricaOpen(true)}
          >
            <ListChecks className="size-4" />
            Ver rúbrica
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link
              href={`/dashboard/seguimiento/${convocatoriaId}/postulaciones?categoriaId=${categoria.id}`}
            >
              <Users className="size-4" />
              Postulaciones
              {categoria.numPostulaciones > 0 && (
                <span className="tabular-nums text-secondary-500">
                  ({categoria.numPostulaciones})
                </span>
              )}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link
              href={`/dashboard/seguimiento/${convocatoriaId}/ranking?categoriaId=${categoria.id}`}
            >
              <ChartLine className="size-4" />
              Ranking
            </Link>
          </Button>
        </div>
      </CardContent>

      {/* vista previa del formulario: se reutiliza el mismo dialogo del builder,
          que solo recibe el schema y lo muestra como lo ve el postulante */}
      {formulario && (
        <FormularioPreviewDialog
          open={formularioOpen}
          onOpenChange={setFormularioOpen}
          schema={formulario.schemaDefinition}
          isDirty={false}
          textoCerrar="Volver"
        />
      )}

      {rubrica && (
        <RubricaSeguimientoDialog
          open={rubricaOpen}
          onOpenChange={setRubricaOpen}
          rubrica={rubrica}
        />
      )}
    </Card>
  );
}
