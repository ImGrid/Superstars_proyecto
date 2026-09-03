import { LOGO_SUPERSTAR } from './logo.asset';
import { OPEN_SANS_400, OPEN_SANS_600, IBM_PLEX_400, IBM_PLEX_600 } from './fuentes.asset';
import { COLORES, FONDO_SEVERIDAD } from './paleta';

// Plantillas HTML de los PDF de reportes.
//
//  * El documento es autocontenido: el CSS va en linea y la tipografia y el
//    logo van incrustados en base64. No hace ninguna peticion de red, asi que
//    no depende del directorio de trabajo del proceso ni de que el servidor
//    tenga fuentes instaladas.
//  * Los colores son los de la marca (ver paleta.ts) y llevan
//    print-color-adjust exacto para que Chrome no los apague al imprimir.
//  * Los numeros y las fechas se formatean en el SERVIDOR con la configuracion
//    de Bolivia: coma decimal, punto de miles y fecha de dia/mes/año. No se
//    depende de la configuracion del navegador.
//  * Todo dato interpolado se escapa: los textos vienen de la base y los
//    escribieron personas de afuera.

// --- formato ---

const nfBO = (n: number, decimales = 2) =>
  new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);

const entero = (n: number) => nfBO(n, 0);
const porcentaje = (n: number) => `${nfBO(n, 1)}%`;

export const pdfNum = { entero, porcentaje, decimal: nfBO };

// Caracteres que quedan FUERA del subconjunto latino de las fuentes de marca.
//
// Si un texto los trae, Chrome no encuentra el glifo en Open Sans y cambia a
// otra fuente solo para ese caracter. El problema no es que se vea feo: es que
// la fuente de reemplazo depende de las que tenga instaladas el servidor. En
// Windows resuelve a Times New Roman y en el VPS a DejaVu, asi que el MISMO
// reporte saldria distinto segun donde se genere.
//
// Se sustituyen por su equivalente normal. Caso real detectado en los datos:
// una empresa escribio "CO₂" en su propuesta.
const REEMPLAZOS_FUERA_DEL_SUBCONJUNTO: Record<string, string> = {
  // subindices 0-9 (U+2080 a U+2089)
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  // superindices que tampoco estan en el subconjunto (el 4 si esta, U+2074)
  '⁰': '0', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

// Se listan los caracteres uno a uno y no como rango: un rango entre bloques
// Unicode distintos abarcaria de paso simbolos que si estan en el subconjunto.
const PATRON_FUERA_DEL_SUBCONJUNTO = new RegExp(
  `[${Object.keys(REEMPLAZOS_FUERA_DEL_SUBCONJUNTO).join('')}]`,
  'g',
);

export function normalizarParaPdf(texto: string): string {
  return texto.replace(
    PATRON_FUERA_DEL_SUBCONJUNTO,
    (c) => REEMPLAZOS_FUERA_DEL_SUBCONJUNTO[c] ?? c,
  );
}

export function escaparHtml(valor: unknown): string {
  return normalizarParaPdf(String(valor ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Fecha con la configuracion de Bolivia, sin desfase de zona horaria
export function fechaBO(valor: Date | null): string {
  if (!valor) return '';
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(valor);
}

export function fechaHoraBO(valor: Date): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(valor);
}

// --- columnas de tabla ---

export type TipoColumnaPdf = 'texto' | 'entero' | 'decimal' | 'porcentaje' | 'fecha';

export interface ColumnaPdf {
  header: string;
  key: string;
  tipo?: TipoColumnaPdf;
  // ancho relativo en porcentaje; si no se define, se reparte parejo
  ancho?: number;
}

function formatearCelda(tipo: TipoColumnaPdf | undefined, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') {
    return tipo && tipo !== 'texto' ? '—' : '';
  }
  switch (tipo) {
    case 'entero':
      return entero(Number(valor));
    case 'decimal':
      return nfBO(Number(valor));
    case 'porcentaje':
      return porcentaje(Number(valor));
    case 'fecha':
      return valor instanceof Date ? fechaBO(valor) : escaparHtml(valor);
    default:
      return escaparHtml(valor);
  }
}

const esNumerica = (tipo?: TipoColumnaPdf) => tipo != null && tipo !== 'texto' && tipo !== 'fecha';

// --- estilos ---

const ESTILOS = `
  /* Un archivo por peso, con fuentes estaticas. No se usan variables: Chrome
     las carga bien en pantalla pero NO las incrusta al exportar a PDF, y el
     documento sale con la tipografia de reemplazo. Ver fuentes.asset.ts. */
  @font-face {
    font-family: 'Open Sans';
    src: url('data:font/woff2;base64,${OPEN_SANS_400}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Open Sans';
    src: url('data:font/woff2;base64,${OPEN_SANS_600}') format('woff2');
    font-weight: 600;
    font-style: normal;
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    src: url('data:font/woff2;base64,${IBM_PLEX_400}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    src: url('data:font/woff2;base64,${IBM_PLEX_600}') format('woff2');
    font-weight: 600;
    font-style: normal;
  }

  /* sin esto Chrome apaga los fondos de color al imprimir */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Open Sans', Arial, sans-serif;
    color: ${COLORES.texto};
    font-size: 10.5px;
    line-height: 1.45;
  }
  h1, h2, h3, .titulo { font-family: 'IBM Plex Sans', Arial, sans-serif; }

  /* cabecera del documento */
  .cab {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 3px solid ${COLORES.navy};
    padding-bottom: 10px; margin-bottom: 14px;
  }
  .cab .marca { display: flex; align-items: center; gap: 10px; }
  .cab img { height: 42px; width: auto; }
  .cab .marca .nombre {
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: 13px; font-weight: 600; color: ${COLORES.navy}; line-height: 1.15;
  }
  .cab .marca .nombre small { display: block; font-size: 8.5px; font-weight: 400; color: ${COLORES.gris}; }
  .cab .meta { text-align: right; font-size: 8.5px; color: ${COLORES.gris}; }

  .titulo { font-size: 20px; font-weight: 600; color: ${COLORES.navy}; margin: 0 0 3px; }
  .subt { font-size: 10px; color: ${COLORES.gris}; margin: 0 0 14px; page-break-after: avoid; }

  /* tarjetas de indicador */
  .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; page-break-inside: avoid; }
  .kpi {
    flex: 1 1 0; min-width: 108px; background: #fff;
    border: 1px solid ${COLORES.borde}; border-top: 3px solid ${COLORES.morado};
    border-radius: 6px; padding: 9px 11px;
  }
  .kpi .lbl { font-size: 8px; text-transform: uppercase; letter-spacing: .35px; color: ${COLORES.gris}; }
  .kpi .val {
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: 17px; font-weight: 600; color: ${COLORES.navy}; margin-top: 2px;
  }

  /* tablas */
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  /* repite la cabecera de la tabla en cada hoja */
  thead { display: table-header-group; }
  th {
    background: ${COLORES.navy}; color: #fff; font-weight: 600;
    text-align: left; padding: 7px 8px;
  }
  th.num, td.num { text-align: right; white-space: nowrap; }
  td { padding: 6px 8px; border-bottom: 1px solid #EEF2F7; vertical-align: top; }
  /* evita que una fila se parta entre dos hojas */
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: ${COLORES.navyClaro}; }
  tr.total td { font-weight: 600; border-top: 2px solid ${COLORES.navy}; background: #fff; }

  /* severidades del reporte de calidad de datos */
  tbody tr.sev-error   { background: ${FONDO_SEVERIDAD.error}; }
  tbody tr.sev-revisar { background: ${FONDO_SEVERIDAD.revisar}; }
  tbody tr.sev-falta   { background: ${FONDO_SEVERIDAD.falta}; }
  .etiqueta {
    display: inline-block; padding: 1px 7px; border-radius: 9px;
    font-size: 8px; font-weight: 600; white-space: nowrap;
  }
  .etiqueta.error   { background: ${COLORES.rojo}; color: #fff; }
  .etiqueta.revisar { background: ${COLORES.amarillo}; color: ${COLORES.texto}; }
  .etiqueta.falta   { background: ${COLORES.gris}; color: #fff; }

  /* secciones y notas */
  .seccion { page-break-inside: avoid; margin-bottom: 16px; }
  .seccion h2 {
    font-size: 12px; color: ${COLORES.navy}; margin: 0 0 8px;
    padding-bottom: 4px; border-bottom: 1px solid ${COLORES.borde};
  }
  .nota { color: ${COLORES.gris}; font-size: 8.5px; margin: 6px 0 0; page-break-inside: avoid; }
  .vacio { color: ${COLORES.gris}; text-align: center; padding: 26px 0; }
  .aviso {
    background: ${COLORES.navyClaro}; border-left: 3px solid ${COLORES.morado};
    padding: 8px 11px; font-size: 8.5px; color: ${COLORES.gris};
    margin-bottom: 14px; page-break-inside: avoid;
  }
  .aviso strong { color: ${COLORES.navy}; }

  /* graficos */
  .grafico { margin: 2px 0 16px; page-break-inside: avoid; }
  .grafico .cap { font-size: 10px; color: ${COLORES.gris}; font-weight: 600; margin: 0 0 6px; }
  .grafico svg { display: block; }
  .grafico-flex { display: flex; gap: 22px; align-items: center; page-break-inside: avoid; }
  .anillo-leyenda { font-size: 10.5px; }
  .anillo-leyenda .it { display: flex; align-items: center; gap: 6px; margin: 5px 0; }
  .anillo-leyenda .sw { width: 11px; height: 11px; border-radius: 2px; display: inline-block; flex: 0 0 auto; }
  .dos-columnas { display: flex; gap: 26px; align-items: flex-start; page-break-inside: avoid; }
  .dos-columnas > * { flex: 1 1 0; min-width: 0; }

  .salto { page-break-before: always; }

  /* ficha de pregunta y respuesta (reporte de respuestas del formulario) */
  .ficha { margin-bottom: 18px; }
  .ficha-cab {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
    background: ${COLORES.navyClaro}; border-left: 4px solid ${COLORES.navy};
    padding: 9px 12px; margin-bottom: 12px; page-break-inside: avoid;
  }
  .ficha-cab h2 {
    font-size: 13px; color: ${COLORES.navy}; margin: 0; border: 0; padding: 0;
  }
  .ficha-cab .sub { font-size: 9px; color: ${COLORES.gris}; margin: 2px 0 0; }
  .ficha-etiquetas { white-space: nowrap; }
  .ficha-seccion { margin-bottom: 12px; page-break-inside: auto; }
  .ficha-seccion h3 {
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: 10.5px; color: ${COLORES.morado}; margin: 0 0 6px;
    text-transform: uppercase; letter-spacing: .3px;
  }
  .campos { display: flex; flex-wrap: wrap; gap: 0 16px; }
  .campo {
    flex: 0 0 calc(50% - 8px); padding: 4px 0;
    border-bottom: 1px dotted ${COLORES.borde}; page-break-inside: avoid;
  }
  .campo.completo { flex: 0 0 100%; }
  .campo .k { font-size: 8px; color: ${COLORES.gris}; text-transform: uppercase; letter-spacing: .25px; }
  .campo .v { font-size: 9.5px; color: ${COLORES.texto}; margin-top: 1px; }
`;

// --- bloques ---

export interface CabeceraPdf {
  titulo: string;
  subtitulo?: string;
  generadoPor: string;
  generadoEn: Date;
  filtros?: string;
}

function cabeceraHtml(datos: CabeceraPdf): string {
  const filtros = datos.filtros
    ? `<div>Filtros: ${escaparHtml(datos.filtros)}</div>`
    : '<div>Sin filtros: informe completo</div>';
  return `
  <div class="cab">
    <div class="marca">
      <img src="${LOGO_SUPERSTAR}" alt="Empresas SUPERSTAR" />
      <div class="nombre">Empresas SUPERSTAR<small>Programa de empresas de triple impacto</small></div>
    </div>
    <div class="meta">
      <div>Generado el ${escaparHtml(fechaHoraBO(datos.generadoEn))}</div>
      <div>Por ${escaparHtml(datos.generadoPor)}</div>
      ${filtros}
    </div>
  </div>
  <h1 class="titulo">${escaparHtml(datos.titulo)}</h1>
  ${datos.subtitulo ? `<p class="subt">${escaparHtml(datos.subtitulo)}</p>` : ''}`;
}

export function kpisHtml(kpis: { etiqueta: string; valor: string }[]): string {
  if (kpis.length === 0) return '';
  const tarjetas = kpis
    .map(
      (k) =>
        `<div class="kpi"><div class="lbl">${escaparHtml(k.etiqueta)}</div><div class="val">${escaparHtml(k.valor)}</div></div>`,
    )
    .join('');
  return `<div class="kpis">${tarjetas}</div>`;
}

export function tablaHtml(
  columnas: ColumnaPdf[],
  filas: Record<string, unknown>[],
  opciones: {
    total?: Record<string, unknown>;
    etiquetaTotal?: string;
    // nombre de la columna que decide la clase de severidad de la fila
    severidadEn?: string;
    vacio?: string;
  } = {},
): string {
  if (filas.length === 0) {
    return `<p class="vacio">${escaparHtml(opciones.vacio ?? 'No hay datos para mostrar con estos filtros.')}</p>`;
  }

  const anchos = columnas
    .map((c) => (c.ancho ? `<col style="width:${c.ancho}%" />` : '<col />'))
    .join('');

  const cabecera = columnas
    .map((c) => `<th class="${esNumerica(c.tipo) ? 'num' : ''}">${escaparHtml(c.header)}</th>`)
    .join('');

  const cuerpo = filas
    .map((fila) => {
      const clase = opciones.severidadEn
        ? ` class="sev-${escaparHtml(fila[opciones.severidadEn])}"`
        : '';
      const celdas = columnas
        .map(
          (c) =>
            `<td class="${esNumerica(c.tipo) ? 'num' : ''}">${formatearCelda(c.tipo, fila[c.key])}</td>`,
        )
        .join('');
      return `<tr${clase}>${celdas}</tr>`;
    })
    .join('');

  let total = '';
  if (opciones.total) {
    const celdas = columnas
      .map((c, i) => {
        if (i === 0) return `<td>${escaparHtml(opciones.etiquetaTotal ?? 'TOTAL')}</td>`;
        const valor = opciones.total![c.key];
        return `<td class="${esNumerica(c.tipo) ? 'num' : ''}">${valor == null ? '' : formatearCelda(c.tipo, valor)}</td>`;
      })
      .join('');
    total = `<tr class="total">${celdas}</tr>`;
  }

  return `<table><colgroup>${anchos}</colgroup><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}${total}</tbody></table>`;
}

// --- ficha: un bloque de "pregunta / respuesta" ---
//
// Es la forma correcta para el reporte de respuestas: un formulario de setenta
// preguntas no entra en una tabla, pero si se lee bien como una ficha por
// postulacion, igual que el formulario impreso que llenaria una persona.

export interface CampoFicha {
  etiqueta: string;
  valor: string | null;
  // los textos largos ocupan el ancho completo; el resto va en dos columnas
  ancho?: 'completo' | 'medio';
}

export interface SeccionFicha {
  titulo: string;
  campos: CampoFicha[];
}

export function fichaHtml(opciones: {
  titulo: string;
  subtitulo?: string;
  etiquetas?: { texto: string; clase?: string }[];
  secciones: SeccionFicha[];
  // cada ficha empieza en hoja nueva salvo la primera
  saltoDePagina?: boolean;
}): string {
  const clase = opciones.saltoDePagina ? 'ficha salto' : 'ficha';

  const etiquetas = (opciones.etiquetas ?? [])
    .map((e) => `<span class="etiqueta ${e.clase ?? 'falta'}">${escaparHtml(e.texto)}</span>`)
    .join(' ');

  const secciones = opciones.secciones
    .map((seccion) => {
      const campos = seccion.campos
        .filter((c) => c.valor !== null && c.valor !== '')
        .map((campo) => {
          const anchoClase = campo.ancho === 'completo' ? ' completo' : '';
          // se respetan los saltos de linea del valor (las tablas del
          // formulario traen una linea por fila)
          const valor = escaparHtml(campo.valor).replace(/\n/g, '<br />');
          return `<div class="campo${anchoClase}"><div class="k">${escaparHtml(campo.etiqueta)}</div><div class="v">${valor}</div></div>`;
        })
        .join('');
      if (!campos) return '';
      return `<div class="ficha-seccion"><h3>${escaparHtml(seccion.titulo)}</h3><div class="campos">${campos}</div></div>`;
    })
    .join('');

  return `<div class="${clase}">
    <div class="ficha-cab">
      <div>
        <h2>${escaparHtml(opciones.titulo)}</h2>
        ${opciones.subtitulo ? `<p class="sub">${escaparHtml(opciones.subtitulo)}</p>` : ''}
      </div>
      <div class="ficha-etiquetas">${etiquetas}</div>
    </div>
    ${secciones || '<p class="vacio">Esta postulación todavía no tiene respuestas.</p>'}
  </div>`;
}

export function avisoHtml(titulo: string, puntos: string[]): string {
  if (puntos.length === 0) return '';
  const lista = puntos.map((p) => `<div>· ${escaparHtml(p)}</div>`).join('');
  return `<div class="aviso"><strong>${escaparHtml(titulo)}</strong>${lista}</div>`;
}

// Envuelve el contenido en un documento completo
export function documentoPdf(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><style>${ESTILOS}</style></head>
<body><div class="hoja">${contenido}</div></body>
</html>`;
}

// Arma un reporte estandar: cabecera, indicadores, graficos y secciones.
export function construirPdfReporte(opciones: {
  cabecera: CabeceraPdf;
  kpis?: { etiqueta: string; valor: string }[];
  aviso?: { titulo: string; puntos: string[] };
  secciones: { titulo?: string; html: string; saltoDePagina?: boolean }[];
}): string {
  const partes: string[] = [cabeceraHtml(opciones.cabecera)];

  if (opciones.kpis && opciones.kpis.length > 0) partes.push(kpisHtml(opciones.kpis));
  if (opciones.aviso) partes.push(avisoHtml(opciones.aviso.titulo, opciones.aviso.puntos));

  for (const seccion of opciones.secciones) {
    const clase = seccion.saltoDePagina ? 'seccion salto' : 'seccion';
    const titulo = seccion.titulo ? `<h2>${escaparHtml(seccion.titulo)}</h2>` : '';
    partes.push(`<div class="${clase}">${titulo}${seccion.html}</div>`);
  }

  return documentoPdf(partes.join('\n'));
}
