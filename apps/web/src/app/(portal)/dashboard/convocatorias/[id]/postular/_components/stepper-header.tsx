"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import type { Seccion } from "@superstars/shared";

interface StepperHeaderProps {
  secciones: Seccion[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

// stepper horizontal que muestra las secciones como pasos
export const StepperHeader = memo(function StepperHeader({
  secciones,
  currentStep,
  completedSteps,
  onStepClick,
}: StepperHeaderProps) {
  // incluir paso de revision como ultimo
  const totalSteps = secciones.length + 1;

  return (
    <nav aria-label="Progreso del formulario" className="w-full">
      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {secciones.map((sec, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = completedSteps.has(idx);

          return (
            <li key={sec.id} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary-100 text-primary-700 font-medium"
                    : isCompleted
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-secondary-50 text-secondary-500 hover:bg-secondary-100"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-primary-600 text-white"
                      : isCompleted
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary-200 text-secondary-600"
                  }`}
                >
                  {isCompleted ? <Check className="size-3.5" /> : idx + 1}
                </span>
                <span className="hidden sm:inline">{sec.titulo}</span>
              </button>
              {idx < totalSteps - 1 && (
                <div
                  className={`h-px w-6 ${
                    isCompleted ? "bg-emerald-300" : "bg-secondary-200"
                  }`}
                />
              )}
            </li>
          );
        })}

        {/* paso de revision */}
        <li className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onStepClick(secciones.length)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              currentStep === secciones.length
                ? "bg-primary-100 text-primary-700 font-medium"
                : "bg-secondary-50 text-secondary-500 hover:bg-secondary-100"
            }`}
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                currentStep === secciones.length
                  ? "bg-primary-600 text-white"
                  : "bg-secondary-200 text-secondary-600"
              }`}
            >
              {secciones.length + 1}
            </span>
            <span className="hidden sm:inline">Revision</span>
          </button>
        </li>
      </ol>
    </nav>
  );
});
