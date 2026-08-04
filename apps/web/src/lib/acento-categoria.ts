// Identidad de color por categoria.
//
// Una convocatoria tiene N categorias y elegir entre ellas es la decision mas
// importante que toma el postulante: define su formulario, su rubrica y su
// premio. Hasta ahora las dos categorias se veian identicas y el proponente no
// tenia forma de reconocer "la suya" de un vistazo en ninguna pantalla.
//
// El color se asigna por `orden`, no por nombre, para que funcione con
// cualquier cantidad de categorias y con los nombres que ponga el responsable.
// Los tonos salen de la paleta oficial (azul, teal, morado); el amarillo queda
// libre porque es el color reservado a la accion principal.
//
// El color nunca es el unico medio: siempre va acompanado del nombre de la
// categoria, como pide WCAG 1.4.1.

export interface AcentoCategoria {
  /** texto del nombre y del monto */
  texto: string;
  /** fondo tenue para la tarjeta de la categoria */
  fondo: string;
  /** borde de la tarjeta */
  borde: string;
  /** fondo del cuadro del icono */
  iconoFondo: string;
  /** color del icono */
  icono: string;
  /** chip compacto (fondo + texto + borde juntos) */
  chip: string;
}

const ACENTOS: AcentoCategoria[] = [
  {
    texto: "text-azul-800",
    fondo: "bg-azul-50",
    borde: "border-azul-200",
    iconoFondo: "bg-azul-100",
    icono: "text-azul-700",
    chip: "bg-azul-50 text-azul-800 border-azul-200",
  },
  {
    texto: "text-info-800",
    fondo: "bg-info-50",
    borde: "border-info-200",
    iconoFondo: "bg-info-100",
    icono: "text-info-700",
    chip: "bg-info-50 text-info-800 border-info-200",
  },
  {
    texto: "text-purple-800",
    fondo: "bg-purple-50",
    borde: "border-purple-200",
    iconoFondo: "bg-purple-100",
    icono: "text-purple-700",
    chip: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    texto: "text-primary-800",
    fondo: "bg-primary-50",
    borde: "border-primary-200",
    iconoFondo: "bg-primary-100",
    icono: "text-primary-700",
    chip: "bg-primary-50 text-primary-800 border-primary-200",
  },
];

// Iconos por posicion. Son formas distintas, no solo colores distintos: quien
// no distingue los tonos igual reconoce la categoria por la silueta.
const ICONOS = [
  "ph:buildings-duotone",
  "ph:plant-duotone",
  "ph:lightbulb-filament-duotone",
  "ph:handshake-duotone",
];

export function acentoCategoria(orden: number): AcentoCategoria {
  // orden empieza en 1; si viniera 0 o negativo, cae en el primero
  const i = Math.max(0, orden - 1) % ACENTOS.length;
  return ACENTOS[i];
}

export function iconoCategoria(orden: number): string {
  const i = Math.max(0, orden - 1) % ICONOS.length;
  return ICONOS[i];
}
