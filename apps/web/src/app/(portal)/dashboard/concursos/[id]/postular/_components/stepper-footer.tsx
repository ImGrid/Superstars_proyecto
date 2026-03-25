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
          Guardar borrador
        </Button>
      </div>

      {/* lado derecho: siguiente o enviar */}
      <div className="flex items-center gap-2">
        {isReviewStep ? (
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
            Enviar postulacion
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={isBusy}
            className="gap-1"
          >
            {isLastSectionStep ? "Ir a revision" : "Siguiente"}
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
});
