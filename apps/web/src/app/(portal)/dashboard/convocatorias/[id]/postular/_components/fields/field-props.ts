import type { FormField } from "@superstars/shared";
import type { UseFormReturn } from "react-hook-form";

// props comunes para todos los componentes de campo
export interface FieldRendererProps {
  campo: FormField;
  form: UseFormReturn<Record<string, unknown>>;
}
