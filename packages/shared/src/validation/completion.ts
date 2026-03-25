import type { SchemaDefinition } from '../schemas/formulario.schema';

// Calcula el porcentaje de completado basado en campos requeridos llenos
export function calculateCompletionPercentage(
  schema: SchemaDefinition,
  responseData: Record<string, unknown>,
): number {
  const allCampos = schema.secciones.flatMap(s => s.campos);
  const requiredFields = allCampos.filter(c => c.requerido);

  if (requiredFields.length === 0) return 100;

  let filledCount = 0;

  for (const campo of requiredFields) {
    const value = responseData[campo.id];
    if (isFieldFilled(campo.tipo, value)) {
      filledCount++;
    }
  }

  const percentage = (filledCount / requiredFields.length) * 100;
  // Redondear a 2 decimales (numeric(5,2) en DB)
  return Math.round(percentage * 100) / 100;
}

// Determina si un campo tiene un valor valido segun su tipo
export function isFieldFilled(tipo: string, value: unknown): boolean {
  if (value === undefined || value === null) return false;

  switch (tipo) {
    case 'texto_corto':
    case 'texto_largo':
    case 'texto_url':
    case 'seleccion_unica':
      return typeof value === 'string' && value.trim().length > 0;

    case 'numerico':
      return typeof value === 'number' && !isNaN(value);

    case 'seleccion_multiple':
      return Array.isArray(value) && value.length > 0;

    case 'tabla':
      if (!Array.isArray(value) || value.length === 0) return false;
      // Al menos 1 fila con al menos 1 celda no vacia
      return (value as Record<string, unknown>[]).some((row) =>
        Object.values(row).some(
          (v) => v !== undefined && v !== null && String(v).trim().length > 0,
        ),
      );

    case 'archivo':
      return Array.isArray(value) && value.length > 0;

    case 'si_no':
      return typeof value === 'boolean';

    default:
      return false;
  }
}
