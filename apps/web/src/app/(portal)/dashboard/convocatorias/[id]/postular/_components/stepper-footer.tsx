"use client";

import { memo } from "react";
import { ArrowLeft, ArrowRight, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepperFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  isReviewStep: boolean;
  // vista previa del builder: no se guarda ni se envia nada
  modoPreview?: boolean;
}

export const StepperFooter = memo(function StepperFooter({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSaveDraft,
  onSubmit,
  isSaving,
  isSubmitting,
  canSubmit,
  isReviewStep,
  modoPreview = false,
}: StepperFooterProps) {
  const isFirstStep = currentStep === 0;
  const isLastSectionStep = currentStep === totalSteps - 2;
  const isBusy = isSaving || isSubmitting;

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      {/* lado izquierdo: anterior + guardar */}
      <div className="flex items-center gap-2">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isBusy}
            className="gap-1"
          >
            <ArrowLeft className="size-4" />
            Anterior
          </Button>
        )}
        {!modoPreview && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSaveDraft}
            disabled={isBusy}
            className="gap-1 text-secondary-600"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Guardar y seguir después
          </Button>
        )}
      </div>

      {/* lado derecho: siguiente o enviar */}
      <div className="flex items-center gap-2">
        {isReviewStep ? (
          // en la vista previa el boton se ve igual que para el proponente, pero
          // apagado: aqui no se envia nada
          modoPreview ? (
            <div className="flex flex-col items-end gap-1">
              <Button type="button" disabled className="gap-1" size="lg">
                <Send className="size-4" />
                Enviar postulación
              </Button>
              <span className="text-xs text-secondary-400">
                En la vista previa no se envía nada.
              </span>
            </div>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isBusy || !canSubmit}
              className="gap-1"
              size="lg"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar postulación
            </Button>
          )
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={isBusy}
            className="gap-1"
          >
            {isLastSectionStep ? "Ir a revisión" : "Continuar"}
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
