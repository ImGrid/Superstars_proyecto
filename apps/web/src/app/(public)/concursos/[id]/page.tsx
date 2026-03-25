"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trophy,
  Clock,
  CheckCircle2,
  FileSearch,
  Award,
} from "lucide-react";
import { publicQueries } from "@/lib/api/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  formatDate,
  formatMoney,
  formatFileSize,
  getDiasRestantes,
  formatShortMonth,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// todos los departamentos de Bolivia
const TODOS_DEPTOS = 9;

// fases del cronograma
function buildTimelinePhases(concurso: {
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaAnuncioGanadores: string | null;
}) {
  const now = new Date();

  const phases = [
    {
      label: "Registro abierto",
      date: concurso.fechaInicioPostulacion,
      icon: FileSearch,
    },
    {
      label: "Cierre postulaciones",
      date: concurso.fechaCierrePostulacion,
      icon: Clock,
    },
    {
      label: "Evaluacion",
      date: concurso.fechaCierrePostulacion,
      icon: CheckCircle2,
    },
    {
      label: "Resultados",
      date: concurso.fechaAnuncioGanadores,
      icon: Award,
    },
  ];

  return phases.map((phase) => {
    const phaseDate = phase.date ? new Date(phase.date) : null;
    const isPast = phaseDate ? phaseDate < now : false;
    return { ...phase, isPast };
  });
}

export default function ConcursoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const concursoId = Number(id);

  const {
    data: concurso,
    isLoading,
    isError,
  } = useQuery(publicQueries.concursoDetail(concursoId));

  // skeleton de carga
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-5 w-40" />
        <Skeleton className="mb-2 h-6 w-24" />
        <Skeleton className="mb-6 h-10 w-3/4" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // error o no encontrado
  if (isError || !concurso) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        <EmptyState
          icon={Trophy}
          title="Concurso no encontrado"
          description="El concurso que buscas no existe o no esta disponible."
          action={
            <Button asChild variant="outline">
              <Link href="/concursos">
                <ArrowLeft className="mr-2 size-4" />
                Volver a concursos
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const deptos = concurso.departamentos ?? [];
  const deadline = getDiasRestantes(concurso.fechaCierrePostulacion);
  const phases = buildTimelinePhases(concurso);

  // texto de deadline para sidebar
  const deadlineText = (() => {
    if (deadline < 0) return { text: "Cerrado", className: "text-secondary-500" };
    if (deadline === 0) return { text: "Cierra hoy", className: "text-error-600 font-semibold" };
    if (deadline <= 7)
      return {
        text: `Ultimos ${deadline} dia${deadline > 1 ? "s" : ""}`,
        className: "text-warning-600 font-semibold",
      };
    if (deadline <= 30)
      return { text: `Quedan ${deadline} dias`, className: "text-primary-700 font-semibold" };
    return {
      text: `Cierra: ${formatShortMonth(concurso.fechaCierrePostulacion)}`,
      className: "text-secondary-700",
    };
  })();

  return (
    <div className="pt-28 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* sidebar mobile (antes de contenido principal) */}
        <div className="mb-8 lg:hidden">
          <SidebarCard
            concurso={concurso}
            deptos={deptos}
            deadlineText={deadlineText}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* columna izquierda */}
          <div className="lg:col-span-2">
            {/* estado + titulo */}
            <div className="mb-1">
              <StateBadge tipo="concurso" valor={concurso.estado} />
            </div>
            <h1 className="mt-2 font-heading text-3xl font-bold text-primary-800 sm:text-4xl">
              {concurso.nombre}
            </h1>

            {/* sponsors */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-secondary-400">
              <span>Con el apoyo de:</span>
              {["OXFAM", "Ayuda en Accion", "FUNDES Bolivia"].map((s) => (
                <span key={s} className="font-semibold text-secondary-500">
                  {s}
                </span>
              ))}
            </div>

            {/* tabs */}
            <Tabs defaultValue="descripcion" className="mt-8">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="descripcion">Descripcion y Requisitos</TabsTrigger>
                <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
              </TabsList>

              {/* tab: descripcion + bases + documentos */}
              <TabsContent value="descripcion" className="mt-6 space-y-8">
                {/* descripcion del concurso */}
                {concurso.descripcion && (
                  <div className="prose prose-lg max-w-none text-secondary-700">
                    <p className="whitespace-pre-line">{concurso.descripcion}</p>
                  </div>
                )}

                {/* bases y requisitos */}
                {concurso.bases && (
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-primary-800">
                      Bases y requisitos
                    </h3>
                    <div className="prose prose-lg max-w-none text-secondary-700">
                      <p className="whitespace-pre-line">{concurso.bases}</p>
                    </div>
                  </div>
                )}

                {/* documentos descargables */}
                {concurso.documentos && concurso.documentos.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-primary-800">
                      Documentos del concurso
                    </h3>
                    <div className="space-y-2">
                      {concurso.documentos.map((doc) => (
                        <Link
                          key={doc.id}
                          href="/auth/login"
                          className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-secondary-50"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                            <FileSearch className="size-5 text-primary-700" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-secondary-900">
                              {doc.nombre}
                            </p>
                            <p className="text-xs text-secondary-500">
                              {doc.nombreOriginal} — {formatFileSize(doc.tamanoBytes)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white">
                            Descargar
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* sin descripcion ni bases */}
                {!concurso.descripcion && !concurso.bases && (!concurso.documentos || concurso.documentos.length === 0) && (
                  <p className="text-secondary-500">
                    La informacion de este concurso aun no ha sido publicada.
                  </p>
                )}
              </TabsContent>

              {/* tab: cronograma */}
              <TabsContent value="cronograma" className="mt-6">
                <ConcursoTimeline phases={phases} />
              </TabsContent>
            </Tabs>
          </div>

          {/* columna derecha - sidebar desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <SidebarCard
                concurso={concurso}
                deptos={deptos}
                deadlineText={deadlineText}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// card lateral con info clave y CTA
function SidebarCard({
  concurso,
  deptos,
  deadlineText,
}: {
  concurso: { estado: string; montoPremio: string; fechaCierrePostulacion: string };
  deptos: string[];
  deadlineText: { text: string; className: string };
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {/* estado */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary-500">Estado</span>
          <StateBadge tipo="concurso" valor={concurso.estado} />
        </div>

        <Separator />

        {/* deadline */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary-500">Plazo</span>
          <span className={cn("text-sm", deadlineText.className)}>
            {deadlineText.text}
          </span>
        </div>

        <Separator />

        {/* monto */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary-500">Premio</span>
          <span className="font-bold text-orange-600">
            {formatMoney(concurso.montoPremio)}
          </span>
        </div>

        <Separator />

        {/* departamentos */}
        <div>
          <span className="text-sm text-secondary-500">Departamentos</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {deptos.length >= TODOS_DEPTOS ? (
              <Badge variant="secondary" className="font-normal">
                Todos
              </Badge>
            ) : deptos.length > 0 ? (
              deptos.map((d) => (
                <Badge
                  key={d}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {d}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-secondary-400">
                No especificado
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* CTA */}
        <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
          <Link href="/auth/login">
            Quiero participar
          </Link>
        </Button>
        <p className="text-center text-xs text-secondary-400">
          Necesitas una cuenta para participar
        </p>
      </CardContent>
    </Card>
  );
}

// timeline visual del cronograma
function ConcursoTimeline({
  phases,
}: {
  phases: {
    label: string;
    date: string | null;
    icon: React.ComponentType<{ className?: string }>;
    isPast: boolean;
  }[];
}) {
  return (
    <>
      {/* desktop: horizontal */}
      <div className="hidden sm:block">
        <div className="flex items-start justify-between">
          {phases.map((phase, idx) => (
            <div key={phase.label} className="flex flex-1 flex-col items-center text-center">
              {/* icono */}
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2",
                  phase.isPast
                    ? "border-success-500 bg-success-50"
                    : "border-secondary-300 bg-white",
                )}
              >
                <phase.icon
                  className={cn(
                    "size-5",
                    phase.isPast ? "text-success-600" : "text-secondary-400",
                  )}
                />
              </div>
              {/* linea conectora */}
              {idx < phases.length - 1 && (
                <div className="absolute" />
              )}
              {/* texto */}
              <p
                className={cn(
                  "mt-3 text-sm font-semibold",
                  phase.isPast ? "text-primary-800" : "text-secondary-500",
                )}
              >
                {phase.label}
              </p>
              <p className="mt-1 text-xs text-secondary-400">
                {phase.date ? formatShortMonth(phase.date) : "Por definir"}
              </p>
            </div>
          ))}
        </div>

        {/* barra de progreso horizontal */}
        <div className="relative mx-auto mt-[-52px] mb-16 flex items-center px-[10%]">
          {phases.slice(0, -1).map((phase, idx) => (
            <div
              key={`line-${idx}`}
              className={cn(
                "h-0.5 flex-1",
                phase.isPast && phases[idx + 1]?.isPast
                  ? "bg-success-500"
                  : "bg-secondary-200",
              )}
            />
          ))}
        </div>
      </div>

      {/* mobile: vertical */}
      <div className="sm:hidden">
        <div className="space-y-6">
          {phases.map((phase, idx) => (
            <div key={phase.label} className="flex gap-4">
              {/* linea vertical + icono */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border-2",
                    phase.isPast
                      ? "border-success-500 bg-success-50"
                      : "border-secondary-300 bg-white",
                  )}
                >
                  <phase.icon
                    className={cn(
                      "size-5",
                      phase.isPast ? "text-success-600" : "text-secondary-400",
                    )}
                  />
                </div>
                {idx < phases.length - 1 && (
                  <div
                    className={cn(
                      "mt-1 h-8 w-0.5",
                      phase.isPast ? "bg-success-500" : "bg-secondary-200",
                    )}
                  />
                )}
              </div>

              {/* texto */}
              <div className="pt-1.5">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    phase.isPast ? "text-primary-800" : "text-secondary-500",
                  )}
                >
                  {phase.label}
                </p>
                <p className="text-xs text-secondary-400">
                  {phase.date ? formatShortMonth(phase.date) : "Por definir"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
