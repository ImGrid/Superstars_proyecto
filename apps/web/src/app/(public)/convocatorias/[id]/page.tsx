"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  FileSearch,
  Award,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { publicQueries, faqQueries } from "@/lib/api/query-keys";
import { getConvocatoriaImagenUrl } from "@/lib/api/convocatoria.api";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  formatMoney,
  formatFileSize,
  getDiasRestantes,
  formatShortMonth,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { EstadoConvocatoria } from "@superstars/shared";

// todos los departamentos de Bolivia
const TODOS_DEPTOS = 9;

// fases del cronograma
function buildTimelinePhases(convocatoria: {
  fechaInicioPostulacion: string;
  fechaCierrePostulacion: string;
  fechaCierreEfectiva: string | null;
  fechaAnuncioGanadores: string | null;
  fechaPublicacionResultados: string | null;
  estado: EstadoConvocatoria;
}) {
  const now = new Date();
  // fecha real de cierre: la efectiva (extension) o la original
  const fechaCierreReal = convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion;

  // estados que indican que ya se paso de cada fase
  const enEvaluacionOPosterior =
    convocatoria.estado === EstadoConvocatoria.EN_EVALUACION ||
    convocatoria.estado === EstadoConvocatoria.RESULTADOS_LISTOS ||
    convocatoria.estado === EstadoConvocatoria.FINALIZADO;
  const evaluacionTerminada =
    convocatoria.estado === EstadoConvocatoria.RESULTADOS_LISTOS ||
    convocatoria.estado === EstadoConvocatoria.FINALIZADO;
  const resultadosPublicados = !!convocatoria.fechaPublicacionResultados;

  // si ya hay timestamp real de publicacion, mostrarlo en vez de la fecha planeada
  const fechaResultados = convocatoria.fechaPublicacionResultados ?? convocatoria.fechaAnuncioGanadores;

  const phases = [
    {
      label: "Registro abierto",
      date: convocatoria.fechaInicioPostulacion,
      icon: FileSearch,
    },
    {
      label: convocatoria.fechaCierreEfectiva ? "Cierre de postulaciones (extendido)" : "Cierre de postulaciones",
      date: fechaCierreReal,
      icon: Clock,
    },
    {
      label: "Evaluación",
      date: fechaCierreReal,
      // ph:check-circle-duotone via Icon (compatible con React.ComponentType rendering abajo)
      icon: (props: { className?: string }) => (
        <Icon icon="ph:check-circle-duotone" className={props.className} />
      ),
    },
    {
      label: resultadosPublicados ? "Resultados publicados" : "Resultados",
      date: fechaResultados,
      icon: Award,
    },
  ];

  return phases.map((phase, idx) => {
    const phaseDate = phase.date ? new Date(phase.date) : null;
    const dateBased = phaseDate ? phaseDate < now : false;

    // override por estado de la convocatoria para fases que dependen de transiciones,
    // no solo del calendario
    let isPast = dateBased;
    if (idx === 1) {
      // cierre postulaciones: pasado si convocatoria ya no acepta envios
      isPast = dateBased ||
        convocatoria.estado === EstadoConvocatoria.CERRADO ||
        enEvaluacionOPosterior;
    } else if (idx === 2) {
      // evaluacion: pasada solo si ya termino (resultados_listos o finalizado).
      // Mientras esta "en_evaluacion" sigue en curso aunque la fecha de cierre haya pasado
      isPast = evaluacionTerminada;
    } else if (idx === 3) {
      // resultados: pasada solo si ya se publicaron oficialmente
      isPast = resultadosPublicados;
    }

    return { ...phase, isPast };
  });
}

export default function ConvocatoriaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const convocatoriaId = Number(id);

  const {
    data: convocatoria,
    isLoading,
    isError,
  } = useQuery(publicQueries.convocatoriaDetail(convocatoriaId));

  const { data: faqItems } = useQuery(faqQueries.byConvocatoria(convocatoriaId));

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
  if (isError || !convocatoria) {
    return (
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        <EmptyState
          icon="ph:trophy-duotone"
          title="Convocatoria no encontrada"
          description="La convocatoria que buscas no existe o no está disponible."
          action={
            <Button asChild variant="outline">
              <Link href="/convocatorias">
                <ArrowLeft className="mr-2 size-4" />
                Volver a convocatorias
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const deptos = convocatoria.departamentos ?? [];
  // fecha real de cierre: la efectiva (extension) o la original
  const fechaCierreReal = convocatoria.fechaCierreEfectiva ?? convocatoria.fechaCierrePostulacion;
  const plazoExtendido = !!convocatoria.fechaCierreEfectiva;
  const deadline = getDiasRestantes(fechaCierreReal);
  const phases = buildTimelinePhases(convocatoria);

  // texto de deadline para sidebar
  const deadlineText = (() => {
    if (deadline < 0) return { text: "Cerrado", className: "text-secondary-500" };
    if (deadline === 0) return { text: "Cierra hoy", className: "text-error-600 font-semibold" };
    if (deadline <= 7)
      return {
        text: `Últimos ${deadline} día${deadline > 1 ? "s" : ""}`,
        className: "text-warning-600 font-semibold",
      };
    if (deadline <= 30)
      return { text: `Quedan ${deadline} días`, className: "text-primary-700 font-semibold" };
    return {
      text: `Cierra: ${formatShortMonth(fechaCierreReal)}`,
      className: "text-secondary-700",
    };
  })();

  // rango de premios entre las categorias (para el sidebar)
  const montos = convocatoria.categorias
    .map((c) => Number(c.monto))
    .filter((n) => !Number.isNaN(n));
  const premioLabel =
    montos.length === 0
      ? "—"
      : Math.min(...montos) === Math.max(...montos)
        ? formatMoney(String(Math.max(...montos)))
        : `${formatMoney(String(Math.min(...montos)))} – ${formatMoney(String(Math.max(...montos)))}`;

  // Los documentos que se repiten en todas las categorias se muestran una sola
  // vez, arriba. En la practica casi todos lo son: el responsable esta obligado
  // a subir las bases y los criterios a cada categoria, asi que sin agrupar la
  // misma lista aparece dos veces y ocupa mas de un cuarto de la pagina.
  const categorias = convocatoria.categorias;
  const nombresComunes =
    categorias.length > 1
      ? categorias[0].documentos
          .map((d) => d.nombre)
          .filter((nombre) =>
            categorias.every((c) => c.documentos.some((d) => d.nombre === nombre)),
          )
      : [];
  const documentosComunes = categorias.length > 1
    ? categorias[0].documentos.filter((d) => nombresComunes.includes(d.nombre))
    : [];
  const documentosPropios = (categoriaId: number) => {
    const categoria = categorias.find((c) => c.id === categoriaId);
    if (!categoria) return [];
    return categoria.documentos.filter((d) => !nombresComunes.includes(d.nombre));
  };

  return (
    <div className="pt-28 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* banner de portada cuando la convocatoria tiene imagen.
            Si no hay imagen no se muestra nada y se conserva el layout original. */}
        {convocatoria.imagenKey && (
          <div className="mb-8 overflow-hidden rounded-2xl bg-primary-700 shadow-sm">
            <img
              src={`${getConvocatoriaImagenUrl(convocatoriaId)}?v=${encodeURIComponent(convocatoria.imagenKey)}`}
              alt={convocatoria.nombre}
              className="aspect-[21/9] w-full object-cover sm:aspect-[24/9]"
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* columna izquierda. min-w-0 es imprescindible: por defecto un item de
              grid no baja de su ancho de contenido minimo, asi que una sola palabra
              larga en la descripcion (una URL, un correo) estiraba la columna y
              hacia que TODA la pagina se pudiera arrastrar de lado en el celular */}
          <div className="min-w-0 lg:col-span-2">
            {/* estado + titulo */}
            <div className="mb-1">
              <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
            </div>
            <h1 className="mt-2 font-display text-3xl leading-[1.2] tracking-[0.01em] break-words text-primary-800 sm:text-4xl">
              {convocatoria.nombre}
            </h1>

            {/* organizaciones aliadas: version a color porque el fondo es claro.
                Los anchos relativos son los del lockup oficial (ver
                sponsors-strip.tsx); --logo es el ancho de FUNDES */}
            <div className="mt-4 flex flex-wrap items-center gap-y-3 [--logo:84px] gap-x-[calc(var(--logo)*0.4)] sm:[--logo:96px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-600">
                En alianza con
              </span>
              {[
                { name: "FUNDES Bolivia", src: "/images/sponsors/fundes-color.png", factor: 1.0 },
                { name: "Ayuda en Acción", src: "/images/sponsors/ayuda-color.png", factor: 1.038 },
                { name: "MaríaMarina Foundation", src: "/images/sponsors/mariamarina-color.png", factor: 1.24 },
                { name: "OXFAM", src: "/images/sponsors/oxfam-color.png", factor: 1.119 },
              ].map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={a.name}
                  src={a.src}
                  alt={a.name}
                  style={{ width: `calc(var(--logo) * ${a.factor})` }}
                  className="h-auto opacity-80"
                />
              ))}
            </div>

            {/* En el celular la ficha va despues del titulo: antes aparecia arriba
                de todo y se leia el plazo y el premio sin saber de que convocatoria */}
            <div className="mt-6 lg:hidden">
              <SidebarCard
                convocatoria={convocatoria}
                premioLabel={premioLabel}
                deptos={deptos}
                deadlineText={deadlineText}
                plazoExtendido={plazoExtendido}
              />
            </div>

            {/* tabs */}
            <Tabs defaultValue="descripcion" className="mt-8">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="descripcion">Descripción y Requisitos</TabsTrigger>
                <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
                {/* tab preguntas: solo visible si la convocatoria tiene FAQs */}
                {faqItems && faqItems.length > 0 && (
                  <TabsTrigger value="preguntas">Preguntas frecuentes</TabsTrigger>
                )}
              </TabsList>

              {/* tab: descripcion + bases + documentos */}
              <TabsContent value="descripcion" className="mt-6 space-y-8">
                {/* descripcion de la convocatoria. max-w-[68ch] mantiene la linea
                    en el rango legible (50-75 caracteres); break-words evita que
                    una palabra o enlace largo desborde la pantalla en el celular */}
                {convocatoria.descripcion && (
                  <div className="prose prose-lg max-w-[68ch] break-words text-secondary-700">
                    <p className="whitespace-pre-line">{convocatoria.descripcion}</p>
                  </div>
                )}

                {/* categorias: cada una con su premio, descripcion y bases */}
                {categorias.map((categoria) => {
                  const propios = documentosPropios(categoria.id);
                  return (
                    <div
                      key={categoria.id}
                      className="rounded-xl border border-secondary-200 p-5 sm:p-6"
                    >
                      <h3 className="text-lg font-semibold break-words text-primary-800">
                        {categoria.nombre}
                      </h3>

                      {/* el premio es el dato que mas pesa al elegir: va destacado
                          y no escondido en una etiqueta gris */}
                      <p className="mt-2 font-display text-2xl font-bold text-primary-700">
                        {formatMoney(categoria.monto)}
                      </p>
                      <p className="text-sm text-secondary-600">
                        para cada una de las {categoria.numeroGanadores} empresas ganadoras
                      </p>

                      {categoria.descripcion && (
                        <p className="mt-4 max-w-[68ch] break-words whitespace-pre-line text-secondary-700">
                          {categoria.descripcion}
                        </p>
                      )}

                      {categoria.bases && (
                        <div className="mt-4">
                          <h4 className="mb-2 font-semibold text-primary-800">
                            Bases y requisitos
                          </h4>
                          <p className="max-w-[68ch] break-words whitespace-pre-line text-secondary-700">
                            {categoria.bases}
                          </p>
                        </div>
                      )}

                      {propios.length > 0 && (
                        <div className="mt-4">
                          <h4 className="mb-2 font-semibold text-primary-800">
                            Documentos de esta categoría
                          </h4>
                          <div className="space-y-2">
                            {propios.map((doc) => (
                              <DocumentoItem key={doc.id} documento={doc} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* documentos que valen para todas las categorias: se listan una
                    sola vez para no repetir la misma lista en cada una */}
                {documentosComunes.length > 0 && (
                  <div className="rounded-xl border border-secondary-200 p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-primary-800">
                      Documentos de la convocatoria
                    </h3>
                    <p className="mt-1 mb-4 text-sm text-secondary-600">
                      Aplican a todas las categorías.
                    </p>
                    <div className="space-y-2">
                      {documentosComunes.map((doc) => (
                        <DocumentoItem key={doc.id} documento={doc} />
                      ))}
                    </div>
                  </div>
                )}

                {/* sin descripcion ni categorias */}
                {!convocatoria.descripcion && convocatoria.categorias.length === 0 && (
                  <p className="text-secondary-500">
                    La información de esta convocatoria aún no ha sido publicada.
                  </p>
                )}
              </TabsContent>

              {/* tab: cronograma */}
              <TabsContent value="cronograma" className="mt-6">
                <ConvocatoriaTimeline phases={phases} />
              </TabsContent>

              {/* tab: preguntas frecuentes de la convocatoria */}
              {faqItems && faqItems.length > 0 && (
                <TabsContent value="preguntas" className="mt-6">
                  <Accordion type="multiple" className="w-full">
                    {faqItems.map((faq) => (
                      <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
                        <AccordionTrigger className="text-base font-medium text-secondary-900 hover:no-underline hover:text-primary-700">
                          {faq.pregunta}
                        </AccordionTrigger>
                        <AccordionContent className="leading-relaxed text-secondary-600">
                          {faq.respuesta}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* columna derecha - sidebar desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <SidebarCard
                convocatoria={convocatoria}
                premioLabel={premioLabel}
                deptos={deptos}
                deadlineText={deadlineText}
                plazoExtendido={plazoExtendido}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fila compacta de documento. Sigue llevando a crear cuenta, igual que antes:
// la descarga esta reservada a quienes se registran.
function DocumentoItem({
  documento,
}: {
  documento: {
    id: number;
    nombre: string;
    nombreOriginal: string;
    tamanoBytes: number;
  };
}) {
  const extension =
    documento.nombreOriginal.split(".").pop()?.toUpperCase() ?? "Archivo";

  return (
    <Link
      href="/auth/login"
      className="flex items-center gap-3 rounded-lg border border-secondary-200 px-3 py-2.5 transition-colors hover:border-primary-300 hover:bg-secondary-50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
        <FileSearch className="size-4 text-primary-700" />
      </div>
      <div className="min-w-0 flex-1">
        {/* los nombres del cliente son largos y repiten el nombre del programa
            en cada archivo; dos lineas alcanzan porque lo que distingue va al
            principio. El nombre completo queda en el title */}
        <p
          className="line-clamp-2 text-sm font-medium break-words text-secondary-900"
          title={documento.nombre}
        >
          {documento.nombre}
        </p>
        <p className="text-xs text-secondary-600">
          {extension} · {formatFileSize(documento.tamanoBytes)}
        </p>
      </div>
      <span className="shrink-0 rounded-md bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white">
        Descargar
      </span>
    </Link>
  );
}

// card lateral con info clave y CTA
function SidebarCard({
  convocatoria,
  premioLabel,
  deptos,
  deadlineText,
  plazoExtendido,
}: {
  convocatoria: { estado: string };
  premioLabel: string;
  deptos: string[];
  deadlineText: { text: string; className: string };
  plazoExtendido: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {/* estado */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary-500">Estado</span>
          <StateBadge tipo="convocatoria" valor={convocatoria.estado} />
        </div>

        <Separator />

        {/* deadline */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-secondary-500">Plazo</span>
            {plazoExtendido && (
              <span className="text-xs text-warning-700 font-medium">Plazo extendido</span>
            )}
          </div>
          <span className={cn("text-sm", deadlineText.className)}>
            {deadlineText.text}
          </span>
        </div>

        <Separator />

        {/* premio: con varias categorias es un rango, asi que la etiqueta lo aclara */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-secondary-600">Premio por categoría</span>
          <span className="text-right font-bold text-primary-700">{premioLabel}</span>
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
              <span className="text-xs text-secondary-600">
                No especificado
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* CTA - solo si la convocatoria esta abierto */}
        {convocatoria.estado === "publicado" ? (
          <>
            <Button asChild variant="cta" className="w-full">
              <Link href="/auth/login">
                Quiero participar
              </Link>
            </Button>
            <p className="text-center text-xs text-secondary-600">
              Necesitas una cuenta para participar
            </p>
          </>
        ) : (
          <p className="text-center text-sm text-secondary-500">
            Esta convocatoria ya no acepta postulaciones
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// timeline visual del cronograma
function ConvocatoriaTimeline({
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
        <div className="grid mb-8" style={{ gridTemplateColumns: `repeat(${phases.length}, 1fr)` }}>
          {phases.map((phase, idx) => (
            <div key={phase.label} className="flex flex-col items-center text-center">
              {/* icono con lineas conectoras */}
              <div className="relative flex w-full items-center justify-center">
                {/* linea izquierda */}
                {idx > 0 && (
                  <div
                    className={cn(
                      "absolute left-0 h-0.5 w-1/2",
                      phases[idx - 1]?.isPast && phase.isPast
                        ? "bg-success-500"
                        : "bg-secondary-200",
                    )}
                  />
                )}
                {/* linea derecha */}
                {idx < phases.length - 1 && (
                  <div
                    className={cn(
                      "absolute right-0 h-0.5 w-1/2",
                      phase.isPast && phases[idx + 1]?.isPast
                        ? "bg-success-500"
                        : "bg-secondary-200",
                    )}
                  />
                )}
                {/* icono */}
                <div
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-full border-2",
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
              </div>
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
