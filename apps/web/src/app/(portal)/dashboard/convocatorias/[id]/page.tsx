"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Download,
  Eye,
} from "lucide-react";
import { Icon } from "@iconify/react";
import {
  EstadoConvocatoria,
  EstadoPostulacion,
  RolUsuario,
  isConvocatoriaAbierta,
} from "@superstars/shared";
import type { CategoriaResponse } from "@superstars/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RowAction } from "@/components/shared/row-actions";
import { StateBadge } from "@/components/shared/state-badge";
import {
  convocatoriaQueries,
  postulacionQueries,
  documentoQueries,
  categoriaQueries,
} from "@/lib/api/query-keys";
import {
  formatDate,
  formatMoney,
  formatFileSize,
  formatPercent,
} from "@/lib/format";
import { downloadDocumento } from "@/lib/api/documento.api";
import { useAuth } from "@/hooks/use-auth";
import { ConvocatoriaEstadoActions } from "../_components/convocatoria-estado-actions";
import { ResponsablesTab } from "../_components/responsables-tab";
import { DocumentosTab } from "../_components/documentos-tab";
import { FormularioTab } from "../_components/formulario/formulario-tab";
import { PostulacionesTab } from "../_components/postulaciones-tab";
import { EvaluadoresTab } from "../_components/evaluadores-tab";
import { RubricaTab } from "../_components/rubrica/rubrica-tab";
import { ModificarFechasDialog } from "../_components/modificar-fechas-dialog";
import { ConvocatoriaImagenCard } from "../_components/convocatoria-imagen-card";
import { CategoriaEditDialog } from "../_components/categoria-edit-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCategoria } from "@/lib/api/categoria.api";

interface ConvocatoriaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ConvocatoriaDetailPage({ params }: ConvocatoriaDetailPageProps) {
  const { id } = use(params);
  const convocatoriaId = Number(id);
  const router = useRouter();
  const { data: user } = useAuth();

  const { data, isLoading, isError } = useQuery(convocatoriaQueries.detail(convocatoriaId));

  const isProponente = user?.rol === RolUsuario.PROPONENTE;

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

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar la convocatoria. Verifica que el ID sea correcto.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dashboard/convocatorias")}>
          <ArrowLeft className="size-4" />
          Volver a convocatorias
        </Button>
      </div>
    );
  }

  if (isProponente) {
    return (
      <ConvocatoriaDetailProponente
        data={data}
        convocatoriaId={convocatoriaId}
        router={router}
      />
    );
  }

  return (
    <ConvocatoriaDetailAdmin
      data={data}
      convocatoriaId={convocatoriaId}
      router={router}
    />
  );
}

// --- Vista del proponente ---
function ConvocatoriaDetailProponente({
  data,
  convocatoriaId,
  router,
}: {
  data: any;
  convocatoriaId: number;
  router: ReturnType<typeof useRouter>;
}) {
  const fechaCierreReal = data.fechaCierreEfectiva ?? data.fechaCierrePostulacion;
  const isAbierto = isConvocatoriaAbierta(data);
  const plazoExtendido = !!data.fechaCierreEfectiva;

  // categorias de la convocatoria (cada una con su premio, documentos y formulario)
  const { data: categorias } = useQuery(categoriaQueries.list(convocatoriaId));

  // la postulacion del proponente en esta convocatoria (una empresa = una categoria)
  const { data: miPostulacion } = useQuery({
    ...postulacionQueries.mine(convocatoriaId),
    retry: (failureCount, err) => {
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
          onClick={() => router.push("/dashboard/convocatorias")}
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

      {/* fechas + departamentos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-4 text-secondary-400" />
              Fechas importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              label="Inicio de postulación"
              value={formatDate(data.fechaInicioPostulacion)}
            />
            <InfoRow
              label="Cierre de postulación"
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
      </div>

      <Separator />

      {/* categorias: el proponente elige una para postular */}
      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-secondary-900">
            Categorías
          </h2>
          <p className="text-sm text-secondary-500">
            Elige la categoría a la que quieres postular. Solo puedes participar en una por convocatoria.
          </p>
        </div>
        {!categorias || categorias.length === 0 ? (
          <p className="text-sm text-secondary-500">
            Esta convocatoria todavía no tiene categorías configuradas.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {categorias.map((cat) => (
              <CategoriaCardProponente
                key={cat.id}
                convocatoriaId={convocatoriaId}
                categoria={cat}
                miPostulacion={miPostulacion}
                isAbierto={isAbierto}
                estadoConvocatoria={data.estado as EstadoConvocatoria}
                router={router}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// tarjeta de una categoria para el proponente: premio, documentos y llamado a postular
function CategoriaCardProponente({
  convocatoriaId,
  categoria,
  miPostulacion,
  isAbierto,
  estadoConvocatoria,
  router,
}: {
  convocatoriaId: number;
  categoria: CategoriaResponse;
  miPostulacion: any;
  isAbierto: boolean;
  estadoConvocatoria: EstadoConvocatoria;
  router: ReturnType<typeof useRouter>;
}) {
  const esMiCategoria = miPostulacion?.categoriaId === categoria.id;
  const yaPostuladoEnOtra = !!miPostulacion && !esMiCategoria;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{categoria.nombre}</CardTitle>
        <CardDescription>
          Premio: {formatMoney(categoria.monto)} · {categoria.numeroGanadores} ganadores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoria.descripcion && (
          <p className="text-sm text-secondary-700">{categoria.descripcion}</p>
        )}
        {categoria.bases && (
          <div>
            <p className="text-sm font-medium text-secondary-800">Bases</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-secondary-600">
              {categoria.bases}
            </p>
          </div>
        )}

        <DocumentosProponente convocatoriaId={convocatoriaId} categoriaId={categoria.id} />

        {/* llamado a la accion segun el estado de la postulacion */}
        {esMiCategoria ? (
          <PostulacionCTA
            convocatoriaId={convocatoriaId}
            categoriaId={categoria.id}
            miPostulacion={miPostulacion}
            isAbierto={isAbierto}
            estadoConvocatoria={estadoConvocatoria}
            router={router}
          />
        ) : yaPostuladoEnOtra ? (
          <p className="rounded-md bg-secondary-50 px-4 py-3 text-sm text-secondary-600">
            Ya tienes una postulación en otra categoría de esta convocatoria.
          </p>
        ) : isAbierto ? (
          <Button
            className="w-full gap-2"
            onClick={() =>
              router.push(
                `/dashboard/convocatorias/${convocatoriaId}/postular?categoriaId=${categoria.id}`,
              )
            }
          >
            <Icon icon="ph:file-text-duotone" className="size-4" />
            Postularme a esta categoría
          </Button>
        ) : (
          <p className="rounded-md bg-secondary-50 px-4 py-3 text-sm text-secondary-600">
            {motivoNoPostulable(estadoConvocatoria)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// documentos de una categoria para el proponente (solo lectura + descarga)
function DocumentosProponente({
  convocatoriaId,
  categoriaId,
}: {
  convocatoriaId: number;
  categoriaId: number;
}) {
  const { data: documentos, isLoading } = useQuery(
    documentoQueries.list(convocatoriaId, categoriaId),
  );

  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (!documentos || documentos.length === 0) return null;

  async function handleDownload(doc: { id: number; nombreOriginal: string }) {
    try {
      const blob = await downloadDocumento(convocatoriaId, categoriaId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombreOriginal;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // el toast global maneja el error
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-secondary-800">Documentos</p>
      {documentos.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
            <Icon icon="ph:file-text-duotone" className="size-4 text-primary-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-secondary-900">
              {doc.nombre}
            </p>
            <p className="text-xs text-secondary-500">
              {doc.nombreOriginal} — {formatFileSize(doc.tamanoBytes)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      ))}
    </div>
  );
}

// --- Vista admin/responsable ---
function ConvocatoriaDetailAdmin({
  data,
  convocatoriaId,
  router,
}: {
  data: any;
  convocatoriaId: number;
  router: ReturnType<typeof useRouter>;
}) {
  const isBorrador = data.estado === EstadoConvocatoria.BORRADOR;

  // categorias de la convocatoria; la seleccionada gobierna los tabs por categoria
  const { data: categorias } = useQuery(categoriaQueries.list(convocatoriaId));
  const queryClient = useQueryClient();
  const [selCategoriaId, setSelCategoriaId] = useState<number | null>(null);
  // { categoria: null } = crear; { categoria } = editar esa categoria
  const [categoriaDialog, setCategoriaDialog] = useState<{
    categoria: CategoriaResponse | null;
  } | null>(null);
  const [deleteCategoriaTarget, setDeleteCategoriaTarget] =
    useState<CategoriaResponse | null>(null);
  // descripcion del header: recortada por defecto (puede ser larga)
  const [descExpanded, setDescExpanded] = useState(false);
  // categoria cuyas bases se muestran en el modal
  const [basesModalCat, setBasesModalCat] = useState<CategoriaResponse | null>(null);
  const categoriaId = selCategoriaId ?? categorias?.[0]?.id ?? null;
  const categoriaActiva =
    categorias?.find((c) => c.id === categoriaId) ?? null;

  const deleteCategoriaMutation = useMutation({
    mutationFn: (catId: number) => deleteCategoria(convocatoriaId, catId),
    onSuccess: () => {
      toast.success("Categoría eliminada correctamente");
      queryClient.invalidateQueries({
        queryKey: categoriaQueries.list(convocatoriaId).queryKey,
      });
      // si se elimino la categoria seleccionada, volver a la primera
      setSelCategoriaId(null);
      setDeleteCategoriaTarget(null);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al eliminar la categoría";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setDeleteCategoriaTarget(null);
    },
  });

  const selector = (
    <CategoriaSelector
      categorias={categorias}
      categoriaId={categoriaId}
      onChange={setSelCategoriaId}
    />
  );

  return (
    <div className="space-y-6">
      {/* header: volver + nombre + estado + boton editar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/convocatorias")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-secondary-900">
                {data.nombre}
              </h1>
              <StateBadge tipo="convocatoria" valor={data.estado} />
            </div>
            {data.descripcion && (
              <div className="mt-1">
                <p
                  className={`text-sm text-secondary-500 ${
                    descExpanded ? "" : "line-clamp-2"
                  }`}
                >
                  {data.descripcion}
                </p>
                {data.descripcion.length > 160 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-0.5 text-xs font-medium text-primary-600"
                  >
                    {descExpanded ? "Ver menos" : "Ver más"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isBorrador && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/convocatorias/${data.id}/editar`)}
            >
              <Pencil className="size-4" />
              Editar
            </Button>
          )}
          <ModificarFechasDialog convocatoria={data} />
          <ConvocatoriaEstadoActions convocatoria={data} button />
        </div>
      </div>

      <ConvocatoriaEstadoActions convocatoria={data} alerts />

      <Separator />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="responsables">Responsables</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="formulario">Formulario</TabsTrigger>
          <TabsTrigger value="rubrica">Rúbrica</TabsTrigger>
          <TabsTrigger value="evaluadores">Evaluadores</TabsTrigger>
          <TabsTrigger value="postulaciones">Postulaciones</TabsTrigger>
        </TabsList>

        {/* tab general: fechas + departamentos + categorias (protagonista) + imagen */}
        <TabsContent value="general" className="mt-4 space-y-6">
          {/* fechas + departamentos (compactas, 2 columnas) */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="ph:calendar-dots-duotone" className="size-5 text-primary-600" />
                  Fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  label="Inicio postulación"
                  value={formatDate(data.fechaInicioPostulacion)}
                />
                <InfoRow
                  label="Cierre postulación"
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="ph:map-pin-duotone" className="size-5 text-primary-600" />
                  Departamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.departamentos.map((dep: string) => (
                    <Badge key={dep} variant="outline">{dep}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* categorias: protagonista del tab. Premio, ganadores, descripcion y
              acceso a las bases completas (modal, porque pueden ser largas) */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon icon="ph:trophy-duotone" className="size-5 text-amber-500" />
                <h2 className="font-heading text-lg font-semibold text-secondary-900">
                  Categorías
                </h2>
                <span className="hidden text-xs text-secondary-400 md:inline">
                  Cada una tiene su propio premio, formulario, rúbrica y jurado.
                </span>
              </div>
              {isBorrador && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setCategoriaDialog({ categoria: null })}
                >
                  <Plus className="size-3.5" />
                  Agregar categoría
                </Button>
              )}
            </div>
            {!isBorrador && (
              <p className="mb-3 text-xs text-secondary-400">
                La convocatoria ya no está en borrador, así que las categorías no se pueden modificar.
              </p>
            )}
            {!categorias || categorias.length === 0 ? (
              <p className="rounded-xl border border-secondary-200 py-8 text-center text-sm text-secondary-500">
                Sin categorías configuradas.
              </p>
            ) : (
              <div
                className={
                  categorias.length > 1
                    ? "grid gap-3 lg:grid-cols-2"
                    : "space-y-3"
                }
              >
                {categorias.map((cat) => (
                  <CategoriaResumenCard
                    key={cat.id}
                    categoria={cat}
                    isBorrador={isBorrador}
                    canDelete={categorias.length > 1}
                    wide={categorias.length === 1}
                    onVerBases={() => setBasesModalCat(cat)}
                    onEditar={() => setCategoriaDialog({ categoria: cat })}
                    onEliminar={() => setDeleteCategoriaTarget(cat)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* imagen de portada */}
          <ConvocatoriaImagenCard
            convocatoriaId={convocatoriaId}
            imagenKey={data.imagenKey ?? null}
          />
        </TabsContent>

        <TabsContent value="responsables" className="mt-4">
          <ResponsablesTab convocatoriaId={convocatoriaId} />
        </TabsContent>

        {/* tabs por categoria: requieren una categoria seleccionada */}
        <TabsContent value="documentos" className="mt-4 space-y-4">
          {selector}
          {categoriaId != null ? (
            <DocumentosTab
              convocatoriaId={convocatoriaId}
              categoriaId={categoriaId}
              estadoConvocatoria={data.estado}
            />
          ) : (
            <SinCategorias />
          )}
        </TabsContent>

        <TabsContent value="formulario" className="mt-4 space-y-4">
          {selector}
          {categoriaId != null ? (
            <FormularioTab
              convocatoriaId={convocatoriaId}
              categoriaId={categoriaId}
              estadoConvocatoria={data.estado}
            />
          ) : (
            <SinCategorias />
          )}
        </TabsContent>

        <TabsContent value="rubrica" className="mt-4 space-y-4">
          {selector}
          {categoriaId != null ? (
            <RubricaTab
              convocatoriaId={convocatoriaId}
              categoriaId={categoriaId}
              estadoConvocatoria={data.estado}
            />
          ) : (
            <SinCategorias />
          )}
        </TabsContent>

        <TabsContent value="evaluadores" className="mt-4 space-y-4">
          {selector}
          {categoriaId != null ? (
            <EvaluadoresTab convocatoriaId={convocatoriaId} categoriaId={categoriaId} />
          ) : (
            <SinCategorias />
          )}
        </TabsContent>

        <TabsContent value="postulaciones" className="mt-4 space-y-4">
          {selector}
          {categoriaId != null && categoriaActiva ? (
            <PostulacionesTab
              convocatoriaId={convocatoriaId}
              categoriaId={categoriaId}
              estadoConvocatoria={data.estado}
              numeroGanadores={categoriaActiva.numeroGanadores}
            />
          ) : (
            <SinCategorias />
          )}
        </TabsContent>
      </Tabs>

      <CategoriaEditDialog
        convocatoriaId={convocatoriaId}
        categoria={categoriaDialog?.categoria ?? null}
        nextOrden={(categorias?.length ?? 0) + 1}
        open={!!categoriaDialog}
        onOpenChange={(open) => {
          if (!open) setCategoriaDialog(null);
        }}
      />

      {/* modal con las bases completas de una categoria (pueden ser largas) */}
      <Dialog
        open={!!basesModalCat}
        onOpenChange={(open) => !open && setBasesModalCat(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bases · {basesModalCat?.nombre}</DialogTitle>
            {basesModalCat && (
              <DialogDescription>
                Premio {formatMoney(basesModalCat.monto)} ·{" "}
                {basesModalCat.numeroGanadores} ganadores
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-secondary-700">
            {basesModalCat?.bases}
          </div>
        </DialogContent>
      </Dialog>

      {deleteCategoriaTarget && (
        <ConfirmDialog
          open={!!deleteCategoriaTarget}
          onOpenChange={(open) => !open && setDeleteCategoriaTarget(null)}
          title="Eliminar categoría"
          description={`Se eliminará la categoría "${deleteCategoriaTarget.nombre}" junto con su formulario, rúbrica, documentos y evaluadores. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={() => deleteCategoriaMutation.mutate(deleteCategoriaTarget.id)}
          isLoading={deleteCategoriaMutation.isPending}
          destructive
        />
      )}
    </div>
  );
}

// selector de categoria para los tabs por categoria. Si hay una sola categoria,
// no muestra el control (no hay nada que elegir).
function CategoriaSelector({
  categorias,
  categoriaId,
  onChange,
}: {
  categorias: CategoriaResponse[] | undefined;
  categoriaId: number | null;
  onChange: (id: number) => void;
}) {
  if (!categorias || categorias.length <= 1) return null;
  // banner con color suave para remarcar en que categoria se esta trabajando
  // (todos los tabs por categoria cuelgan de esta seleccion; evita confusion)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-primary-50/60 px-4 py-3">
      <Icon
        icon="ph:folder-notch-open-duotone"
        className="size-5 shrink-0 text-primary-600"
      />
      <span className="text-sm font-medium text-primary-900">Categoría:</span>
      <Select
        value={categoriaId != null ? String(categoriaId) : ""}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="w-64 border-primary-300 bg-white font-semibold text-primary-800">
          <SelectValue placeholder="Selecciona una categoría" />
        </SelectTrigger>
        <SelectContent>
          {categorias.map((cat) => (
            <SelectItem key={cat.id} value={String(cat.id)}>
              {cat.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="hidden text-xs text-primary-700/80 sm:inline">
        Lo que ves y editas abajo es de esta categoría.
      </span>
    </div>
  );
}

// aviso cuando la convocatoria aun no tiene categorias
function SinCategorias() {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-secondary-500">
        Esta convocatoria todavía no tiene categorías configuradas.
      </CardContent>
    </Card>
  );
}

// tarjeta resumen de una categoria en el tab general: premio, ganadores,
// descripcion recortada y acceso a las bases completas (modal). En borrador
// permite editar/eliminar. Las acciones son iconos con tooltip (compactas).
function CategoriaResumenCard({
  categoria,
  isBorrador,
  canDelete,
  wide,
  onVerBases,
  onEditar,
  onEliminar,
}: {
  categoria: CategoriaResponse;
  isBorrador: boolean;
  canDelete: boolean;
  // una sola categoria: layout horizontal (llena el ancho); varias: tarjeta en grid
  wide: boolean;
  onVerBases: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const icono = (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
      <Icon icon="ph:trophy-duotone" className="size-5" />
    </div>
  );

  const identidad = (
    <>
      <p className="text-sm font-semibold text-secondary-900">
        {categoria.nombre}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700">
          {formatMoney(categoria.monto)}
        </span>
        <span className="text-xs text-secondary-500">
          {categoria.numeroGanadores} ganadores
        </span>
      </div>
      {categoria.descripcion && (
        <p className="mt-2 line-clamp-2 text-sm text-secondary-600">
          {categoria.descripcion}
        </p>
      )}
      {!categoria.bases && (
        <p className="mt-2 text-xs text-secondary-400">Sin bases definidas.</p>
      )}
    </>
  );

  // estado de configuracion y actividad de la categoria
  const estado = (
    <>
      <ConfigChip ok={(categoria.numFormularios ?? 0) > 0} label="Formulario" />
      <ConfigChip ok={(categoria.numCriterios ?? 0) > 0} label="Rúbrica" />
      <span className="inline-flex items-center gap-1 text-secondary-500">
        <Icon
          icon="ph:users-three-duotone"
          className="size-3.5 text-secondary-400"
        />
        <span className="font-semibold tabular-nums text-secondary-700">
          {categoria.numEvaluadores ?? 0}
        </span>
        evaluadores
      </span>
      <span className="inline-flex items-center gap-1 text-secondary-500">
        <Icon
          icon="ph:file-text-duotone"
          className="size-3.5 text-secondary-400"
        />
        <span className="font-semibold tabular-nums text-secondary-700">
          {categoria.numPostulaciones ?? 0}
        </span>
        postulaciones
      </span>
    </>
  );

  const acciones = (
    <div className="flex shrink-0 items-center gap-0.5">
      {categoria.bases && (
        <RowAction
          icon={<Eye className="size-4" />}
          label="Ver bases completas"
          onClick={onVerBases}
        />
      )}
      {isBorrador && (
        <RowAction
          icon={<Pencil className="size-4" />}
          label="Editar categoría"
          onClick={onEditar}
        />
      )}
      {isBorrador && canDelete && (
        <RowAction
          icon={<Trash2 className="size-4" />}
          label="Eliminar categoría"
          onClick={onEliminar}
          destructive
        />
      )}
    </div>
  );

  // una sola categoria: horizontal, con el estado repartido en el centro para
  // llenar el ancho (evita el hueco de una tarjeta a media pantalla)
  if (wide) {
    return (
      <div className="flex items-center gap-5 rounded-xl border border-secondary-200 bg-white p-4">
        {icono}
        <div className="w-64 shrink-0">{identidad}</div>
        <div className="flex flex-1 flex-wrap items-center justify-around gap-x-4 gap-y-1.5 text-xs">
          {estado}
        </div>
        {acciones}
      </div>
    );
  }

  // varias categorias: tarjeta vertical (estado debajo de la identidad) en grid
  return (
    <div className="flex h-full items-start gap-4 rounded-xl border border-secondary-200 bg-white p-4">
      {icono}
      <div className="min-w-0 flex-1">
        {identidad}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {estado}
        </div>
      </div>
      {acciones}
    </div>
  );
}

// motivo legible para el proponente cuando una convocatoria no admite postulaciones.
function motivoNoPostulable(estado: EstadoConvocatoria): string {
  switch (estado) {
    case EstadoConvocatoria.PUBLICADO:
      return "El plazo de postulación ya cerró.";
    case EstadoConvocatoria.CERRADO:
      return "La convocatoria cerró y está a la espera de revisión.";
    case EstadoConvocatoria.EN_EVALUACION:
      return "La convocatoria está en proceso de evaluación.";
    case EstadoConvocatoria.RESULTADOS_LISTOS:
      return "Los resultados ya están listos para publicarse.";
    case EstadoConvocatoria.FINALIZADO:
      return "La convocatoria ya finalizó.";
    default:
      return "La convocatoria no acepta postulaciones en este momento.";
  }
}

// llamado a la accion segun el estado de la postulacion del proponente
function PostulacionCTA({
  convocatoriaId,
  categoriaId,
  miPostulacion,
  isAbierto,
  estadoConvocatoria,
  router,
}: {
  convocatoriaId: number;
  categoriaId: number;
  miPostulacion: any;
  isAbierto: boolean;
  estadoConvocatoria: EstadoConvocatoria;
  router: ReturnType<typeof useRouter>;
}) {
  const postularHref = `/dashboard/convocatorias/${convocatoriaId}/postular?categoriaId=${categoriaId}`;

  if (!miPostulacion && !isAbierto) {
    return (
      <p className="rounded-md bg-secondary-50 px-4 py-3 text-sm text-secondary-600">
        {motivoNoPostulable(estadoConvocatoria)}
      </p>
    );
  }

  if (!miPostulacion) {
    return (
      <Button className="w-full gap-2" onClick={() => router.push(postularHref)}>
        <Icon icon="ph:file-text-duotone" className="size-4" />
        Empezar mi postulación
      </Button>
    );
  }

  const estado = miPostulacion.estado as EstadoPostulacion;
  const pct = formatPercent(miPostulacion.porcentajeCompletado);

  // borrador u observada que quedaron sin enviar al cerrar el plazo: el backend
  // rechaza guardar/enviar, asi que no ofrecemos el boton, explicamos por que.
  if (
    !isAbierto &&
    (estado === EstadoPostulacion.BORRADOR || estado === EstadoPostulacion.OBSERVADO)
  ) {
    return (
      <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
        <p className="font-semibold text-secondary-800">
          Ya no puedes editar esta postulación
        </p>
        <p className="mt-0.5 text-sm text-secondary-600">
          {motivoNoPostulable(estadoConvocatoria)} Tu postulación quedó sin enviar.
        </p>
      </div>
    );
  }

  if (estado === EstadoPostulacion.BORRADOR) {
    return (
      <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4">
        <p className="font-semibold text-primary-900">Tu postulación está en borrador</p>
        <p className="mt-0.5 text-sm text-primary-700">
          Has completado el {pct} del formulario. Continúa para enviar tu propuesta.
        </p>
        <Button className="mt-3 w-full gap-2" onClick={() => router.push(postularHref)}>
          <Icon icon="ph:file-text-duotone" className="size-4" />
          Continuar mi postulación
        </Button>
      </div>
    );
  }

  if (estado === EstadoPostulacion.OBSERVADO) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/50 p-4">
        <div>
          <p className="font-semibold text-amber-900">Tu postulación fue observada</p>
          <p className="mt-0.5 text-sm text-amber-700">
            El responsable devolvió tu postulación con observaciones. Corrige lo indicado y vuelve a enviar.
          </p>
        </div>
        {miPostulacion.observacion && (
          <div className="rounded-md bg-amber-100 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Observación:</p>
            <p className="mt-1 text-sm text-amber-700">{miPostulacion.observacion}</p>
          </div>
        )}
        <Button className="w-full gap-2" onClick={() => router.push(postularHref)}>
          <Icon icon="ph:file-text-duotone" className="size-4" />
          Corregir mi postulación
        </Button>
      </div>
    );
  }

  if (estado === EstadoPostulacion.ENVIADO) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <Icon icon="ph:check-circle-duotone" className="size-5 shrink-0 text-blue-600" />
        <div className="flex-1">
          <p className="font-semibold text-blue-900">Tu postulación fue enviada</p>
          <p className="mt-0.5 text-sm text-blue-700">
            Está pendiente de revisión por el responsable de la convocatoria.
          </p>
        </div>
        <StateBadge tipo="postulacion" valor={estado} />
      </div>
    );
  }

  if (estado === EstadoPostulacion.RECHAZADO) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
        <Icon icon="ph:warning-duotone" className="size-5 shrink-0 text-red-600" />
        <div>
          <p className="font-semibold text-red-900">Tu postulación fue rechazada</p>
          {miPostulacion.observacion && (
            <p className="mt-0.5 text-sm text-red-700">{miPostulacion.observacion}</p>
          )}
        </div>
      </div>
    );
  }

  // en_evaluacion, calificado, ganador, no_seleccionado: solo info + badge
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-secondary-200 p-4">
      <div>
        <p className="font-semibold text-secondary-900">Tu postulación</p>
        <p className="mt-0.5 text-sm text-secondary-500">
          Enviada el {miPostulacion.fechaEnvio ? formatDate(miPostulacion.fechaEnvio) : ""}
        </p>
      </div>
      <StateBadge tipo="postulacion" valor={estado} />
    </div>
  );
}

// indicador de configuracion (formulario / rubrica): verde si esta, gris si no
function ConfigChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        ok ? "text-success-700" : "text-secondary-400"
      }`}
    >
      <Icon
        icon={ok ? "ph:check-circle-duotone" : "ph:x-circle-duotone"}
        className="size-3.5"
      />
      {label}
    </span>
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
