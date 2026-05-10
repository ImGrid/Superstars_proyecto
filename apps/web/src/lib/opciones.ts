// Helpers para resolver el label visible de un valor (slug) almacenado en BD.
//
// Contexto: las columnas tipo dropdown (departamento, rubro, tipo_empresa, etc.)
// se almacenan como slug (la_paz, srl_ltda, ...) y las constantes OPCIONES_*
// del paquete @superstars/shared mapean cada slug a un label legible (La Paz,
// SRL o LTDA, ...). Este helper centraliza el lookup para no duplicar el patron
// en cada componente que muestra esos campos.

// Forma generica de cualquier OPCIONES_* del paquete shared.
// Usar `readonly` permite recibir tanto los `as const` del shared como arrays
// mutables que algun consumidor podria construir dinamicamente.
type Opcion = { readonly valor: string; readonly label: string };

// Resuelve un slug a su label visible.
// - Si el valor esta en las opciones, devuelve el label (ej: "la_paz" -> "La Paz").
// - Si NO esta (datos legacy guardados con label crudo "La Paz", o entrada
//   manual de campo libre), devuelve el valor tal cual. Esto evita que datos
//   pre-existentes se vean rotos antes de migrar la BD.
// - Si es null/undefined/'', devuelve null para que el caller decida que mostrar
//   (tipicamente un guion gris).
export function getOpcionLabel(
  valor: string | null | undefined,
  opciones: readonly Opcion[],
): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const opcion = opciones.find((o) => o.valor === valor);
  return opcion?.label ?? valor;
}
