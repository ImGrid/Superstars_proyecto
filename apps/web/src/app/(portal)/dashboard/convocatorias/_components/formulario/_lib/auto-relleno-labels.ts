import type { AutoRelleno } from "@superstars/shared";

// diccionario de etiquetas amigables para cada combinación tabla.campo.
// el texto se inserta en la frase "El proponente verá este campo ya cargado con [X]."
// por eso los labels usan posesivo (su nombre, su empresa, etc.) referido al proponente.
// si se agrega un nuevo autoRelleno al template y no se actualiza este mapa,
// se muestra el fallback genérico para no romper la UX.
const AUTO_RELLENO_LABELS: Record<string, string> = {
  // tabla usuario
  "usuario.nombre": "su nombre",
  "usuario.email": "su correo electrónico",

  // tabla empresa - persona de contacto
  "empresa.contactoCargo": "su cargo en la empresa",
  "empresa.contactoTelefono": "su teléfono de contacto",
  "empresa.contactoGenero": "su género",

  // tabla empresa - datos generales
  "empresa.razonSocial": "la razón social de su empresa",
  "empresa.tipoEmpresa": "el tipo de su empresa",
  "empresa.numeroSocios": "el número de socios de su empresa",
  "empresa.numEmpleadosMujeres": "el número de empleadas mujeres de su empresa",
  "empresa.numEmpleadosHombres": "el número de empleados hombres de su empresa",
  "empresa.rubro": "el rubro de su empresa",
  "empresa.anioFundacion": "el año de fundación de su empresa",
  "empresa.departamento": "el departamento donde opera su empresa",
  "empresa.ciudad": "la ciudad donde opera su empresa",
  "empresa.direccion": "la dirección de su empresa",
  "empresa.telefono": "el teléfono de su empresa",
  "empresa.descripcion": "la descripción de su empresa",
};

const FALLBACK_GENERIC = "los datos registrados de su perfil";

// devuelve el texto amigable para mostrar en el tooltip del icono de auto-relleno
export function getAutoRellenoLabel(autoRelleno: AutoRelleno): string {
  const key = `${autoRelleno.tabla}.${autoRelleno.campo}`;
  return AUTO_RELLENO_LABELS[key] ?? FALLBACK_GENERIC;
}
