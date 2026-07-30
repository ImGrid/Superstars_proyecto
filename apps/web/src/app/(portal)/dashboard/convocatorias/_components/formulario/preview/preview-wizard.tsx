"use client";

import { useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Icon } from "@iconify/react";
import type { SchemaDefinition } from "@superstars/shared";
import { calculateCompletionPercentage } from "@superstars/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StepperHeader } from "@/app/(portal)/dashboard/convocatorias/[id]/postular/_components/stepper-header";
import { StepperFooter } from "@/app/(portal)/dashboard/convocatorias/[id]/postular/_components/stepper-footer";
import { CampoRenderer } from "@/app/(portal)/dashboard/convocatorias/[id]/postular/_components/campo-renderer";
import { ReviewStep } from "@/app/(portal)/dashboard/convocatorias/[id]/postular/_components/review-step";
import { iconParaSeccion } from "@/app/(portal)/dashboard/convocatorias/[id]/postular/_lib/icono-seccion";

// Replica del wizard del proponente (PostularFormContent) para la vista previa del
// builder. Misma estructura y MISMOS componentes de campo, para que lo que se ve aqui
// sea lo que vera el proponente. Lo que NO tiene: guardado de borrador, envio,
// auto-relleno desde la empresa y subida de archivos. Todo vive en memoria: al cerrar
// el dialogo se descarta.
export function PreviewWizard({ schema }: { schema: SchemaDefinition }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const secciones = schema.secciones;
  const totalSteps = secciones.length + 1; // +1 para revision
  const isReviewStep = currentStep === secciones.length;

  const form = useForm<Record<string, unknown>>({
    defaultValues: {},
    mode: "onTouched",
  });

  const handlePrevious = useCallback(() => {
    setCurrentStep((paso) => Math.max(0, paso - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((paso) => {
      if (paso >= totalSteps - 1) return paso;
      setCompletedSteps((prev) => new Set([...prev, paso]));
      return paso + 1;
    });
  }, [totalSteps]);

  const handleStepClick = useCallback((step: number) => {
    setCurrentStep((paso) => {
      if (step === paso) return paso;
      setCompletedSteps((prev) => new Set([...prev, paso]));
      return step;
    });
  }, []);

  // el porcentaje se recalcula en cada render igual que en el wizard real
  const porcentaje = calculateCompletionPercentage(schema, form.watch());

  // una seccion sin campos igual debe poder verse (el operador puede estar armandola)
  const seccionActual = secciones[currentStep];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* cabecera igual a la del proponente, sin el boton de volver */}
      <div>
        <h2 className="font-heading text-xl font-bold text-secondary-900">
          Formulario de postulación
        </h2>
        <p className="text-sm text-secondary-500">
          Completa todas las secciones para enviar tu propuesta.
        </p>
      </div>

      {/* barra de progreso global */}
      <div className="flex items-center gap-3">
        <Progress value={porcentaje} className="h-2 flex-1" />
        <span className="shrink-0 text-sm font-medium text-secondary-600">
          {Math.round(porcentaje)}%
        </span>
      </div>

      <StepperHeader
        secciones={secciones}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <FormProvider {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          {isReviewStep || !seccionActual ? (
            <ReviewStep
              schema={schema}
              responseData={form.getValues()}
              onGoToStep={handleStepClick}
            />
          ) : (
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-start gap-3 border-b border-secondary-100 pb-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <Icon icon={iconParaSeccion(seccionActual.id)} className="size-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-semibold text-secondary-900">
                      {seccionActual.titulo}
                    </h3>
                    {seccionActual.descripcion && (
                      <p className="mt-0.5 text-sm text-secondary-500">
                        {seccionActual.descripcion}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-secondary-400">
                      Los campos con <span className="text-error-500">*</span> son obligatorios.
                    </p>
                  </div>
                </div>

                {seccionActual.campos.length === 0 ? (
                  <p className="py-6 text-center text-sm text-secondary-400">
                    Esta sección todavía no tiene campos.
                  </p>
                ) : (
                  [...seccionActual.campos]
                    .sort((a, b) => a.orden - b.orden)
                    .map((campo) => (
                      <CampoRenderer
                        key={campo.id}
                        campo={campo}
                        form={form}
                        convocatoriaId={0}
                        postulacionId={undefined}
                        modoPreview
                      />
                    ))
                )}
              </CardContent>
            </Card>
          )}

          <StepperFooter
            currentStep={currentStep}
            totalSteps={totalSteps}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSaveDraft={() => {}}
            onSubmit={() => {}}
            isSaving={false}
            isSubmitting={false}
            canSubmit={false}
            isReviewStep={isReviewStep}
            modoPreview
          />
        </form>
      </FormProvider>
    </div>
  );
}
