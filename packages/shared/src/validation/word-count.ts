// Helpers para contar palabras y validar limites de texto largo.
// Reusados por response-validator (campos texto_largo del formulario dinamico)
// y por empresa.schema (descripcion). Mantener una sola implementacion evita
// que el conteo divirja entre los dos puntos donde se aplica.

// Cuenta palabras separadas por whitespace, descartando vacios.
// Coincide con la logica historica de response-validator: "hola  mundo "
// -> 2 palabras, " " -> 0 palabras.
export function countWords(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

// Predicado: el texto cumple un limite maximo de palabras.
// Vacio o undefined se consideran validos (el chequeo de obligatoriedad va aparte).
export function withinMaxWords(value: string | null | undefined, max: number): boolean {
  if (!value) return true;
  return countWords(value) <= max;
}
