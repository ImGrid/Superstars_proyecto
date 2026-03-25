import type { SchemaDefinition, EmpresaResponse } from "@superstars/shared";

// construye los defaultValues del formulario con auto-relleno desde empresa/usuario
// se llama UNA vez al crear el useForm, no en un useEffect
export function buildAutoFilledDefaults(
  schema: SchemaDefinition,
  empresa: EmpresaResponse | undefined,
  userNombre: string | undefined,
  userEmail: string | undefined,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  if (!empresa) return defaults;

  const allCampos = schema.secciones.flatMap((s) => s.campos);

  for (const campo of allCampos) {
    if (!campo.autoRelleno) continue;
    const { tabla, campo: campoDB } = campo.autoRelleno;

    let valor: unknown;

    if (tabla === "usuario") {
      if (campoDB === "nombre") valor = userNombre;
      else if (campoDB === "email") valor = userEmail;
    } else if (tabla === "empresa") {
      if (campoDB.includes(".")) {
        const [obj, key] = campoDB.split(".");
        const parent = (empresa as unknown as Record<string, unknown>)[obj];
        if (parent && typeof parent === "object") {
          valor = (parent as Record<string, unknown>)[key];
        }
      } else {
        valor = (empresa as unknown as Record<string, unknown>)[campoDB];
      }
    }

    if (valor !== undefined && valor !== null && valor !== "") {
      defaults[campo.id] = valor;
    }
  }

  return defaults;
}
