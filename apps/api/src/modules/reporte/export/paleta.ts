// Paleta oficial de Empresas SUPERSTAR.
//
// Los valores son los mismos que define apps/web/src/app/globals.css, para que
// un reporte impreso y la pantalla del portal se vean del mismo programa. No es
// una paleta inventada para los documentos.
//
// El Excel usa estos mismos colores en formato ARGB (ver excel.util.ts); aqui
// van en hexadecimal para el CSS del PDF.
export const COLORES = {
  // --chart-1 y --sidebar: color de estructura. Cabeceras y titulos.
  navy: '#041F6B',
  // --primary: accion y acento
  morado: '#5A1092',
  // --chart-2
  teal: '#259999',
  // --chart-3
  verde: '#61A535',
  // --chart-4
  amarillo: '#FFCC43',
  // tono intermedio del degradado de marca, para el embudo
  azul: '#1E40AF',
  // --destructive
  rojo: '#DC2626',
  // --muted-foreground: textos secundarios
  gris: '#64748B',
  // navy muy diluido, para filas alternas y fondos suaves
  navyClaro: '#F2F5FA',
  borde: '#E2E8F0',
  texto: '#0F172A',
} as const;

// Fondos suaves por severidad, iguales a los del Excel
export const FONDO_SEVERIDAD = {
  error: '#FDE8E8',
  revisar: '#FFF6DC',
  falta: '#F1F5F9',
} as const;

export const BORDE_SEVERIDAD = {
  error: COLORES.rojo,
  revisar: COLORES.amarillo,
  falta: COLORES.gris,
} as const;
