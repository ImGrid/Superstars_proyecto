"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Download,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { EstadoConcurso, EstadoPostulacion, RolUsuario } from "@superstars/shared";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StateBadge } from "@/components/shared/state-badge";
import { concursoQueries, postulacionQueries, documentoQueries } from "@/lib/api/query-keys";
import { formatDate, formatMoney, formatFileSize, formatPercent, getDiasRestantes } from "@/lib/format";
import { downloadDocumento } from "@/lib/api/documento.api";
import { useAuth } from "@/hooks/use-auth";
import { ConcursoEstadoActions } from "../_components/concurso-estado-actions";
import { ResponsablesTab } from "../_components/responsables-tab";
import { DocumentosTab } from "../_components/documentos-tab";
import { FormularioTab } from "../_components/formulario/formulario-tab";
import { PostulacionesTab } from "../_components/postulaciones-tab";
import { EvaluadoresTab } from "../_components/evaluadores-tab";
import { RubricaTab } from "../_components/rubrica/rubrica-tab";
import { ModificarFechasDialog } from "../_components/modificar-fechas-dialog";

interface ConcursoDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ConcursoDetailPage({ params }: ConcursoDetailPageProps) {
  const { id } = use(params);
  const concursoId = Number(id);
  const router = useRouter();
  const { data: user } = useAuth();

  const { data, isLoading, isError } = useQuery(concursoQueries.detail(concursoId));

  const isProponente = user?.rol === RolUsuario.PROPONENTE;

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // error
  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar el concurso. Verifica que el ID sea correcto.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dashboard/concursos")}>
          <ArrowLeft className="size-4" />
          Volver a concursos
        </Button>
      </div>
    );
  }

  // proponente ve una vista simplificada
  if (isProponente) {
    return (
      <ConcursoDetailProponente
        data={data}
        concursoId={concursoId}
        router={router}
      />
    );
  }

  // admin/responsable ven la vista de gestion
  return (
    <ConcursoDetailAdmin
      data={data}
      concursoId={concursoId}
      router={router}
    />
  );
}

// --- Vista del proponente ---
function ConcursoDetailProponente({
  data,
  concursoId,
  router,
}: {
  data: any;
  concursoId: number;
  router: ReturnType<typeof useRouter>;
}) {
  const fechaCierreReal = data.fechaCierreEfectiva ?? data.fechaCierrePostulacion;
  const dias = getDiasRestantes(fechaCierreReal);
  const isAbierto = dias >= 0;
  const plazoExtendido = !!data.fechaCierreEfectiva;

  // consultar si el proponente ya tiene postulacion para este concurso
  const {
    data: miPostulacion,
    isLoading: isLoadingPostulacion,
  } = useQuery({
    ...postulacionQueries.mine(concursoId),
    retry: (failureCount, err) => {
      // 404 = no tiene postulacion, es estado valido
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/concursos")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-secondary-900">
            {data.nombre}
          </h1>
          {data.descripcion && (
            <p className="mt-1 text-sm text-secondary-500">{data.descripcion}</p>
          )}
        </div>
      </div>

      {/* info destacada para el proponente */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* monto */}
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-100">
              <DollarSign className="size-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Premio</p>
              <p className="text-lg font-bold text-primary-700">
                {formatMoney(data.montoPremio)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* fecha limite */}
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className={`flex size-10 items-center justify-center rounded-lg ${
              !isAbierto
                ? "bg-secondary-100"
                : dias <= 3
                  ? "bg-red-100"
                  : dias <= 7
                    ? "bg-amber-100"
                    : "bg-emerald-100"
            }`}>
              <Clock className={`size-5 ${
                !isAbierto
                  ? "text-secondary-400"
                  : dias <= 3
                    ? "text-red-600"
                    : dias <= 7
                      ? "text-amber-600"
                      : "text-emerald-600"
              }`} />
            </div>
            <div>
              <p className="text-xs text-secondary-500">
                Fecha limite{plazoExtendido && " (plazo extendido)"}
              </p>
              <p className="text-sm font-semibold text-secondary-900">
                {formatDate(fechaCierreReal)}
              </p>
              <p className={`text-xs font-medium ${
                !isAbierto
                  ? "text-secondary-400"
                  : dias <= 3
                    ? "text-red-600"
                    : dias <= 7
                      ? "text-amber-600"
                      : "text-emerald-600"
              }`}>
                {!isAbierto
                  ? "Plazo cerrado"
                  : dias === 0
                    ? "Cierra hoy"
                    : dias === 1
                      ? "Queda 1 dia"
                      : `Quedan ${dias} dias`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ganadores */}
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary-100">
              <Icon icon="ph:users-three-duotone"className="size-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Ganadores</p>
              <p className="text-lg font-bold text-secondary-900">
                {data.numeroGanadores}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* documentos + CTA en 2 columnas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DocumentosProponente concursoId={concursoId} />
        {!isLoadingPostulacion && (
          <PostulacionCTA
            concursoId={concursoId}
            miPostulacion={miPostulacion}
            isAbierto={isAbierto}
            router={router}
          />
        )}
      </div>

      <Separator />

      {/* detalle del concurso */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* fechas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-4 text-secondary-400" />
              Fechas importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              label="Inicio de postulacion"
              value={formatDate(data.fechaInicioPostulacion)}
            />
            <InfoRow
              label="Cierre de postulacion"
              value={
                plazoExtendido
                  ? `${formatDate(fechaCierreReal)} (extendido)`
                  : formatDate(data.fechaCierrePostulacion)
              }
            />
            {data.fechaAnuncioGanadores && (
              <InfoRow
                label="Anuncio de ganadores"
                value={formatDate(data.fechaAnuncioGanadores)}
              />
            )}
          </CardContent>
        </Card>

        {/* departamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-4 text-secondary-400" />
              Departamentos elegibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.departamentos.map((dep: string) => (
                <Badge key={dep} variant="outline" className="text-sm">
                  {dep}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* bases */}
        {data.bases && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Bases del concurso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-700 whitespace-pre-line leading-relaxed">
                {data.bases}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// documentos para el proponente (solo lectura + descarga)
function DocumentosProponente({ concursoId }: { concursoId: number }) {
  const { data: documentos, isLoading } = useQuery(
    documentoQueries.list(concursoId),
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!documentos || documentos.length === 0) return null;

  async function handleDownload(doc: { id: number; nombreOriginal: string }) {
    try {
      const blob = await downloadDocumento(concursoId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombreOriginal;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // error silencioso, el toast global lo maneja
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos del concurso</CardTitle>
        <CardDescription>
          Descarga las bases, guias y plantillas del concurso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {documentos.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 rounded-lg border p-4"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
              <Icon icon="ph:file-text-duotone"className="size-5 text-primary-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-secondary-900">
                {doc.nombre}
              </p>
              <p className="text-xs text-secondary-500">
                {doc.nombreOriginal} — {formatFileSize(doc.tamanoBytes)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc)}
            >
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Vista admin/responsable ---
function ConcursoDetailAdmin({
  data,
  concursoId,
  router,
}: {
  data: any;
  concursoId: number;
  router: ReturnType<typeof useRouter>;
}) {
  const isBorrador = data.estado === EstadoConcurso.BORRADOR;

  return (
    <div className="space-y-6">
      {/* header: volver + nombre + estado + boton editar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/concursos")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-secondary-900">
                {data.nombre}
              </h1>
              <StateBadge tipo="concurso" valor={data.estado} />
            </div>
            {data.descripcion && (
              <p className="mt-1 text-sm text-secondary-500">{data.descripcion}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isBorrador && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/concursos/${data.id}/editar`)}
            >
              <Pencil className="size-4" />
              Editar
            </Button>
          )}
          <ModificarFechasDialog concurso={data} />
          <ConcursoEstadoActions concurso={data} button />
        </div>
      </div>

      <ConcursoEstadoActions concurso={data} alerts />

      <Separator />

      {/* tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="responsables">Responsables</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="formulario">Formulario</TabsTrigger>
          <TabsTrigger value="rubrica">Rubrica</TabsTrigger>
          <TabsTrigger value="evaluadores">Evaluadores</TabsTrigger>
          <TabsTrigger value="postulaciones">Postulaciones</TabsTrigger>
        </TabsList>

        {/* tab: general */}
        <TabsContent value="general" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* info del concurso */}
            <Card>
              <CardHeader>
                <CardTitle>Informacion del concurso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="Nombre" value={data.nombre} />
                <InfoRow label="Descripcion" value={data.descripcion ?? "Sin descripcion"} />
                <InfoRow label="Monto asignado" value={formatMoney(data.montoPremio)} />
                <InfoRow label="Ganadores" value={String(data.numeroGanadores)} />
                <InfoRow label="Top N sistema" value={String(data.topNSistema)} />
              </CardContent>
            </Card>

            {/* fechas */}
            <Card>
              <CardHeader>
                <CardTitle>Fechas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  label="Inicio postulacion"
                  value={formatDate(data.fechaInicioPostulacion)}
                />
                <InfoRow
                  label="Cierre postulacion"
                  value={formatDate(data.fechaCierrePostulacion)}
                />
                {data.fechaCierreEfectiva && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-secondary-500 shrink-0">Cierre efectivo</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary-700">
                        {formatDate(data.fechaCierreEfectiva)}
                      </span>
                      <Badge className="bg-primary-100 text-primary-700 text-[10px] px-1.5 py-0">
                        Extendido
                      </Badge>
                    </div>
                  </div>
                )}
                <InfoRow
                  label="Anuncio ganadores"
                  value={data.fechaAnuncioGanadores ? formatDate(data.fechaAnuncioGanadores) : "No definido"}
                />
                {data.fechaPublicacionResultados && (
                  <InfoRow
                    label="Resultados publicados"
                    value={formatDate(data.fechaPublicacionResultados)}
                  />
                )}
              </CardContent>
            </Card>

            {/* departamentos y bases */}
            <Card>
              <CardHeader>
                <CardTitle>Departamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.departamentos.map((dep: string) => (
                    <Badge key={dep} variant="outline">{dep}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {data.bases && (
              <Card>
                <CardHeader>
                  <CardTitle>Bases del concurso</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-secondary-700 whitespace-pre-line">{data.bases}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="responsables" className="mt-4">
          <ResponsablesTab concursoId={concursoId} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <DocumentosTab concursoId={concursoId} estadoConcurso={data.estado} />
        </TabsContent>

        <TabsContent value="formulario" className="mt-4">
          <FormularioTab concursoId={concursoId} estadoConcurso={data.estado} />
        </TabsContent>

        <TabsContent value="rubrica" className="mt-4">
          <RubricaTab concursoId={concursoId} estadoConcurso={data.estado} />
        </TabsContent>

        <TabsContent value="evaluadores" className="mt-4">
          <EvaluadoresTab concursoId={concursoId} />
        </TabsContent>

        <TabsContent value="postulaciones" className="mt-4">
          <PostulacionesTab concursoId={concursoId} estadoConcurso={data.estado} numeroGanadores={data.numeroGanadores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// CTA inteligente segun estado de postulacion
function PostulacionCTA({
  concursoId,
  miPostulacion,
  isAbierto,
  router,
}: {
  concursoId: number;
  miPostulacion: any;
  isAbierto: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  // la ruta destino para el formulario (aun no implementada)
  const postularHref = `/dashboard/concursos/${concursoId}/postular`;

  // sin postulacion: mostrar CTA solo si el concurso esta abierto
  if (!miPostulacion) {
    if (!isAbierto) return null;
    return (
      <Card className="border-primary-200 bg-primary-50/50">
        <CardContent className="flex flex-col items-center gap-3 py-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-semibold text-primary-900">
              Postulate a este concurso
            </p>
            <p className="mt-0.5 text-sm text-primary-700">
              Completa el formulario de postulacion para participar.
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2 shrink-0"
            onClick={() => router.push(postularHref)}
          >
            <Icon icon="ph:file-text-duotone"className="size-4" />
            Iniciar postulacion
          </Button>
        </CardContent>
      </Card>
    );
  }

  const estado = miPostulacion.estado as EstadoPostulacion;
  const pct = formatPercent(miPostulacion.porcentajeCompletado);

  // borrador: continuar llenando
  if (estado === EstadoPostulacion.BORRADOR) {
    return (
      <Card className="border-primary-200 bg-primary-50/50">
        <CardContent className="flex flex-col items-center gap-3 py-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-semibold text-primary-900">
              Tu postulacion esta en borrador
            </p>
            <p className="mt-0.5 text-sm text-primary-700">
              Has completado el {pct} del formulario. Continua para enviar tu propuesta.
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2 shrink-0"
            onClick={() => router.push(postularHref)}
          >
            <Icon icon="ph:file-text-duotone"className="size-4" />
            Continuar postulacion
          </Button>
        </CardContent>
      </Card>
    );
  }

  // observado: corregir
  if (estado === EstadoPostulacion.OBSERVADO) {
    return (
      <Card className="border-amber-300 bg-amber-50/50">
        <CardContent className="space-y-3 py-6">
          <div className="flex items-start gap-3">
            <Icon icon="ph:warning-duotone"className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Tu postulacion fue observada
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                El responsable del concurso devolvio tu postulacion con observaciones.
                Corrige lo indicado y vuelve a enviar.
              </p>
            </div>
          </div>
          {miPostulacion.observacion && (
            <div className="rounded-md bg-amber-100 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Observacion:</p>
              <p className="mt-1 text-sm text-amber-700">{miPostulacion.observacion}</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => router.push(postularHref)}
            >
              <Icon icon="ph:file-text-duotone"className="size-4" />
              Corregir postulacion
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // enviado: esperando revision
  if (estado === EstadoPostulacion.ENVIADO) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-center gap-3 py-6">
          <Icon icon="ph:check-circle-duotone"className="size-5 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-900">
              Tu postulacion fue enviada
            </p>
            <p className="mt-0.5 text-sm text-blue-700">
              Esta pendiente de revision por el responsable del concurso.
            </p>
          </div>
          <StateBadge tipo="postulacion" valor={estado} />
        </CardContent>
      </Card>
    );
  }

  // rechazado
  if (estado === EstadoPostulacion.RECHAZADO) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="flex items-center gap-3 py-6">
          <Icon icon="ph:warning-duotone"className="size-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">
              Tu postulacion fue rechazada
            </p>
            {miPostulacion.observacion && (
              <p className="mt-0.5 text-sm text-red-700">{miPostulacion.observacion}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // en_evaluacion, calificado, ganador, no_seleccionado: solo info + badge
  return (
    <Card className="border-secondary-200">
      <CardContent className="flex items-center justify-between gap-3 py-6">
        <div>
          <p className="font-semibold text-secondary-900">
            Tu postulacion
          </p>
          <p className="mt-0.5 text-sm text-secondary-500">
            Enviada el {miPostulacion.fechaEnvio ? formatDate(miPostulacion.fechaEnvio) : ""}
          </p>
        </div>
        <StateBadge tipo="postulacion" valor={estado} />
      </CardContent>
    </Card>
  );
}

// fila de info: label + valor
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-secondary-500 shrink-0">{label}</span>
      <span className="text-sm text-secondary-900 text-right">{value}</span>
    </div>
  );
}

// placeholder para tabs no implementados
function TabPlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon}
        <CardTitle className="mt-4 text-lg">{title}</CardTitle>
        <CardDescription className="mt-1">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
