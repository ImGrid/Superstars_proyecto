"use client";

import { use, useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  EstadoPostulacion,
  calculateCompletionPercentage,
  isConvocatoriaAbierta,
} from "@superstars/shared";
import type { SchemaDefinition } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  formularioQueries,
  postulacionQueries,
  empresaQueries,
  convocatoriaQueries,
} from "@/lib/api/query-keys";
import { submitPostulacion } from "@/lib/api/postulacion.api";
import { useAuth } from "@/hooks/use-auth";
import { StepperHeader } from "./_components/stepper-header";
import { StepperFooter } from "./_components/stepper-footer";
import { CampoRenderer } from "./_components/campo-renderer";
import { ReviewStep } from "./_components/review-step";
import { useDraftSave } from "./_hooks/use-draft-save";
import { buildAutoFilledDefaults } from "./_hooks/use-auto-fill";
import { iconParaSeccion } from "./_lib/icono-seccion";

interface PostularPageProps {
  params: Promise<{ id: string }>;
}

export default function PostularPage({ params }: PostularPageProps) {
  const { id } = use(params);
  const convocatoriaId = Number(id);
  const router = useRouter();
  const { data: user } = useAuth();
  const searchParams = useSearchParams();
  const categoriaIdParam = searchParams.get("categoriaId");

  // cargar postulacion existente (404 = no tiene, es valido)
  const {
    data: postulacion,
    isLoading: isLoadingPost,
  } = useQuery({
    ...postulacionQueries.mine(convocatoriaId),
    retry: (failureCount, err) => {
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  // la categoria: si ya hay postulacion, la suya (no se puede cambiar); si no,
  // la que el proponente eligio en la pagina de la convocatoria (?categoriaId=)
  const categoriaId =
    postulacion?.categoriaId ??
    (categoriaIdParam ? Number(categoriaIdParam) : null);

  // cargar el formulario de la categoria (solo cuando ya sabemos cual es)
  const {
    data: formulario,
    isLoading: isLoadingForm,
    isError: isErrorForm,
  } = useQuery({
    ...formularioQueries.detail(convocatoriaId, categoriaId ?? 0),
    enabled: categoriaId != null,
    retry: (failureCount, err) => {
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  // cargar empresa: sirve para auto-rellenar y, sobre todo, para no dejar
  // escribir un formulario que el backend rechazara en cada guardado
  const { data: empresa, isPending: isLoadingEmpresa } = useQuery({
    ...empresaQueries.me(),
    retry: (failureCount, err) => {
      if (isAxiosError(err) && err.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  // la convocatoria: necesaria para no dejar escribir un formulario que el
  // backend rechazara al guardar (solo acepta envios si esta abierta)
  const { data: convocatoria, isLoading: isLoadingConv } = useQuery(
    convocatoriaQueries.detail(convocatoriaId),
  );

  const isLoading =
    isLoadingPost ||
    isLoadingConv ||
    isLoadingEmpresa ||
    (categoriaId != null && isLoadingForm);

  // cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // sin empresa registrada el backend rechaza cada guardado, asi que no se
  // abre el formulario: se explica el paso que falta y se lleva hasta el.
  // Antes se podia llenar entero y todo el trabajo se perdia.
  if (!empresa) {
    return (
      <div className="mx-auto max-w-xl space-y-5 py-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary-50">
          <Icon icon="ph:building-office-duotone" className="size-7 text-primary-600" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold text-primary-800">
            Antes de postular es necesario registrar la empresa
          </h1>
          <p className="text-secondary-700">
            La postulación se registra a nombre de la empresa, por lo que primero
            debe crearse su perfil. Solo se requiere la razón social; los demás
            datos pueden completarse más adelante.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="gap-2"
            onClick={() => router.push("/dashboard/mi-empresa")}
          >
            <Icon icon="ph:building-office-duotone" className="size-4" />
            Registrar mi empresa
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/convocatorias/${convocatoriaId}`)}
          >
            <ArrowLeft className="size-4" />
            Volver a la convocatoria
          </Button>
        </div>
      </div>
    );
  }

  // el proponente llego sin elegir categoria y aun no tiene postulacion
  if (categoriaId == null) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Elige una categoría desde la página de la convocatoria para empezar tu postulación.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/convocatorias/${convocatoriaId}`)}
        >
          <ArrowLeft className="size-4" />
          Volver a la convocatoria
        </Button>
      </div>
    );
  }

  // error del formulario
  if (isErrorForm || !formulario) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar el formulario de la categoría.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </div>
    );
  }

  // la convocatoria ya no acepta envios: no dejamos escribir un formulario que
  // el backend rechazara al guardar (llegar aqui por URL directa o link viejo)
  if (convocatoria && !isConvocatoriaAbierta(convocatoria)) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            El plazo de postulación de esta convocatoria ya cerró, así que el
            formulario no se puede editar ni enviar.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/convocatorias/${convocatoriaId}`)}
        >
          <ArrowLeft className="size-4" />
          Volver a la convocatoria
        </Button>
      </div>
    );
  }

  // verificar que la postulacion no este en un estado que no permite edicion
  const estadoNoEditable =
    postulacion &&
    postulacion.estado !== EstadoPostulacion.BORRADOR &&
    postulacion.estado !== EstadoPostulacion.OBSERVADO;

  if (estadoNoEditable) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Tu postulación ya fue enviada, así que el formulario no se puede editar.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <PostularFormContent
      convocatoriaId={convocatoriaId}
      categoriaId={categoriaId}
      schema={formulario.schemaDefinition as SchemaDefinition}
      existingData={postulacion?.responseData as Record<string, unknown> | undefined}
      postulacionId={postulacion?.id}
      observacion={postulacion?.observacion}
      estado={postulacion?.estado}
      empresa={empresa}
      userNombre={user?.nombre}
      userEmail={user?.email}
      router={router}
    />
  );
}

// componente interno con el formulario (separado para que los hooks se ejecuten con datos listos)
function PostularFormContent({
  convocatoriaId,
  categoriaId,
  schema,
  existingData,
  postulacionId,
  observacion,
  estado,
  empresa,
  userNombre,
  userEmail,
  router,
}: {
  convocatoriaId: number;
  categoriaId: number;
  schema: SchemaDefinition;
  existingData: Record<string, unknown> | undefined;
  postulacionId: number | undefined;
  observacion: string | null | undefined;
  estado: EstadoPostulacion | undefined;
  empresa: any;
  userNombre: string | undefined;
  userEmail: string | undefined;
  router: ReturnType<typeof useRouter>;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const secciones = schema.secciones;
  const totalSteps = secciones.length + 1; // +1 para revision
  const isReviewStep = currentStep === secciones.length;

  // construir defaultValues: si hay datos existentes usarlos, si no auto-rellenar desde empresa
  const hasExisting = !!existingData && Object.keys(existingData).length > 0;
  const autoFilledDefaults = hasExisting
    ? {}
    : buildAutoFilledDefaults(schema, empresa, userNombre, userEmail);

  const form = useForm<Record<string, unknown>>({
    defaultValues: hasExisting ? existingData : autoFilledDefaults,
    mode: "onTouched",
  });

  // guardar borrador
  const { saveDraft: saveDraftFn, saveDraftAsync, isSaving } = useDraftSave(convocatoriaId, categoriaId, form);

  // enviar postulacion
  const submitMutation = useMutation({
    mutationFn: async () => {
      // guardar ultimo draft antes de enviar
      const data = form.getValues();
      await saveDraftAsync(data);
      return submitPostulacion(convocatoriaId);
    },
    onSuccess: () => {
      toast.success("Postulación enviada correctamente");
      router.push("/dashboard/mis-postulaciones");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? "Error al enviar la postulación";
      toast.error(msg);
    },
  });

  // guardar borrador manualmente
  const handleSaveDraft = useCallback(() => {
    const data = form.getValues();
    saveDraftFn(data);
  }, [form, saveDraftFn]);

  // navegar al paso anterior
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      // guardar antes de cambiar de paso
      const data = form.getValues();
      saveDraftFn(data);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, form, saveDraftFn]);

  // navegar al siguiente paso
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      // guardar antes de cambiar de paso
      const data = form.getValues();
      saveDraftFn(data);
      // marcar paso actual como visitado
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, form, saveDraftFn]);

  // navegar a un paso especifico (click en stepper)
  const handleStepClick = useCallback(
    (step: number) => {
      if (step === currentStep) return;
      // guardar antes de cambiar
      const data = form.getValues();
      saveDraftFn(data);
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(step);
    },
    [currentStep, form, saveDraftFn],
  );

  // calcular porcentaje de completado
  const responseData = form.getValues();
  const porcentaje = calculateCompletionPercentage(schema, responseData);
  const canSubmit = porcentaje >= 100;

  return (
    // max-w-3xl mantiene el formulario en una columna legible (~768px). Investigación
    // NN/G + Baymard recomienda evitar layouts muy anchos: la lectura vertical mejora
    // y el espacio sobrante a la derecha (queja del cliente) desaparece sin necesidad
    // de forzar multi-columna (que aumenta errores y abandono según Baymard 2023).
    <div className="max-w-3xl mx-auto space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/convocatorias/${convocatoriaId}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold text-secondary-900">
            Formulario de postulación
          </h1>
          <p className="text-sm text-secondary-500">
            Completa todas las secciones para enviar tu propuesta.
          </p>
        </div>
      </div>

      {/* alerta de observacion */}
      {estado === EstadoPostulacion.OBSERVADO && observacion && (
        <Alert className="border-warning-300 bg-warning-50">
          <Icon icon="ph:warning-duotone"className="size-4 text-warning-600" />
          <AlertDescription className="text-warning-800">
            <span className="font-medium">Observacion del responsable:</span>{" "}
            {observacion}
          </AlertDescription>
        </Alert>
      )}

      {/* barra de progreso global */}
      <div className="flex items-center gap-3">
        <Progress value={porcentaje} className="h-2 flex-1" />
        <span className="text-sm font-medium text-secondary-600 shrink-0">
          {Math.round(porcentaje)}%
        </span>
      </div>

      {/* stepper */}
      <StepperHeader
        secciones={secciones}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* contenido del paso actual */}
      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {isReviewStep ? (
            <ReviewStep
              schema={schema}
              responseData={form.getValues()}
              onGoToStep={handleStepClick}
            />
          ) : (
            <Card>
              <CardContent className="space-y-6 pt-6">
                {/* titulo de la seccion con icono identificador */}
                <div className="flex items-start gap-3 pb-2 border-b border-secondary-100">
                  <span className="size-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <Icon
                      icon={iconParaSeccion(secciones[currentStep].id)}
                      className="size-5"
                    />
                  </span>
                  <div className="flex-1">
                    <h2 className="font-heading text-lg font-semibold text-secondary-900">
                      {secciones[currentStep].titulo}
                    </h2>
                    {secciones[currentStep].descripcion && (
                      <p className="mt-0.5 text-sm text-secondary-500">
                        {secciones[currentStep].descripcion}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-secondary-400">
                      Los campos con <span className="text-error-500">*</span> son obligatorios.
                    </p>
                  </div>
                </div>

                {/* campos de la seccion actual */}
                {secciones[currentStep].campos
                  .sort((a, b) => a.orden - b.orden)
                  .map((campo) => (
                    <CampoRenderer
                      key={campo.id}
                      campo={campo}
                      form={form}
                      convocatoriaId={convocatoriaId}
                      postulacionId={postulacionId}
                    />
                  ))}
              </CardContent>
            </Card>
          )}

          {/* footer con navegacion */}
          <StepperFooter
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            onSubmit={() => submitMutation.mutate()}
            isSaving={isSaving}
            isSubmitting={submitMutation.isPending}
            canSubmit={canSubmit}
            isReviewStep={isReviewStep}
          />
        </form>
      </FormProvider>

      {/* mensaje de guardado */}
      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-xs text-secondary-400">
          <Loader2 className="size-3 animate-spin" />
          Guardando borrador...
        </div>
      )}
    </div>
  );
}
