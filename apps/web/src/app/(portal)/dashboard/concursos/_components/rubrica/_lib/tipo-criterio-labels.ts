import { TipoCriterio } from "@superstars/shared";

// labels legibles para tipos de criterio
export const tipoCriterioLabels: Record<TipoCriterio, string> = {
  [TipoCriterio.ECONOMICO]: "Economico",
  [TipoCriterio.TECNICO]: "Tecnico",
  [TipoCriterio.MEDIOAMBIENTAL]: "Medioambiental",
  [TipoCriterio.SOCIAL]: "Social",
  [TipoCriterio.FINANCIERO]: "Financiero",
};

// opciones para selects
export const tipoCriterioOptions = Object.entries(tipoCriterioLabels).map(
  ([value, label]) => ({ value, label }),
);
