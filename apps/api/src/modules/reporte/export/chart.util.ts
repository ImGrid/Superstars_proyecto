// Graficos para el PDF, generados como SVG en el servidor.
//
// Por que SVG escrito a mano y no una libreria de graficos:
//  * Es vectorial: se ve nitido a cualquier ampliacion del PDF y el texto queda
//    seleccionable. Una libreria sobre canvas rasteriza y se ve borroso al
//    imprimir.
//  * No necesita navegador ni DOM: se arma como texto en Node, asi que no hay
//    dibujado asincrono ni animacion que esperar antes de imprimir. Esa es la
//    causa numero uno de "el PDF salio con el grafico vacio o a medias".
//  * Cero dependencias nuevas: una barra es un rectangulo con una regla de tres.
//
// Criterio de diseño, pensando en que lo lee gente no tecnica: barras
// horizontales ordenadas de mayor a menor, con el numero escrito al lado de la
// barra para no obligar a cruzar una leyenda, eje desde cero, un solo color por
// serie y nada de efectos tridimensionales.
//
// Los colores se imprimen gracias a print-color-adjust exacto en el CSS del PDF
// y a printBackground en el servicio.

import { COLORES } from './paleta';
import { normalizarParaPdf } from './pdf.util';

const nfBO = (n: number, decimales = 0) =>
  new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);

// Escapa el texto que se interpola dentro del SVG. Los nombres de empresa y de
// categoria vienen de la base y pueden traer & o <.
function escaparSvg(valor: unknown): string {
  // normalizarParaPdf sustituye los caracteres que no existen en el subconjunto
  // de las fuentes de marca; si no, ese glifo del grafico cambiaria de fuente
  return normalizarParaPdf(String(valor ?? ''))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Los nombres de categoria y de zona pueden ser muy largos y desbordan la
// columna de etiquetas.
function recortar(texto: string, maximo = 30): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

export interface ItemGrafico {
  etiqueta: string;
  valor: number;
}

// Barras horizontales ordenadas. Devuelve null si quedan menos de `minimo`
// barras con valor mayor que cero: un grafico de una sola barra no comunica
// nada, y es preferible que el reporte salga solo con la tabla.
export function svgBarras(opciones: {
  items: ItemGrafico[];
  titulo?: string;
  maximoItems?: number;
  minimo?: number;
  // texto que acompaña al valor, por ejemplo "empresas" o "%"
  sufijo?: string;
  color?: string;
}): string | null {
  const minimo = opciones.minimo ?? 2;
  const color = opciones.color ?? COLORES.navy;

  const top = opciones.items
    .filter((i) => i.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, opciones.maximoItems ?? 12);
  if (top.length < minimo) return null;

  const ANCHO = 700;
  const anchoEtiqueta = 190;
  const anchoValor = 70;
  const xBarra = anchoEtiqueta + 10;
  const anchoPista = ANCHO - xBarra - anchoValor;
  const altoFila = 24;
  const altoBarra = 14;
  const margenSuperior = 6;
  const ALTO = margenSuperior + top.length * altoFila + 4;

  const maximo = Math.max(...top.map((i) => i.valor)) || 1;

  const filas = top
    .map((item, indice) => {
      const centroY = margenSuperior + indice * altoFila + altoFila / 2;
      const anchoBarra = Math.max(1, (item.valor / maximo) * anchoPista);
      const texto = opciones.sufijo
        ? `${nfBO(item.valor)} ${opciones.sufijo}`
        : nfBO(item.valor);
      return `
      <text x="${anchoEtiqueta}" y="${centroY}" text-anchor="end" dominant-baseline="central" font-size="10.5" fill="#0F172A">${escaparSvg(recortar(item.etiqueta))}</text>
      <rect x="${xBarra}" y="${(centroY - altoBarra / 2).toFixed(1)}" width="${anchoBarra.toFixed(1)}" height="${altoBarra}" rx="2" fill="${color}" />
      <text x="${(xBarra + anchoBarra + 6).toFixed(1)}" y="${centroY}" dominant-baseline="central" font-size="10" fill="${COLORES.gris}">${escaparSvg(texto)}</text>`;
    })
    .join('');

  return envolver(opciones.titulo, ANCHO, ALTO, filas);
}

// Embudo: barras apiladas de arriba hacia abajo, cada una proporcional al total,
// con el porcentaje de caida respecto de la etapa anterior. Es el grafico que
// mejor cuenta donde se pierde la gente.
export function svgEmbudo(opciones: {
  items: ItemGrafico[];
  titulo?: string;
}): string | null {
  const items = opciones.items.filter((i) => i.valor >= 0);
  if (items.length < 2) return null;

  const total = items.reduce((a, i) => a + i.valor, 0);
  if (total <= 0) return null;

  const ANCHO = 700;
  const anchoEtiqueta = 200;
  const xBarra = anchoEtiqueta + 10;
  const anchoPista = ANCHO - xBarra - 130;
  const altoFila = 34;
  const altoBarra = 22;
  const ALTO = items.length * altoFila + 8;

  const maximo = Math.max(...items.map((i) => i.valor)) || 1;
  // degradado de la paleta: de navy a morado segun se avanza en el embudo
  const colores = [COLORES.navy, COLORES.azul, COLORES.teal, COLORES.verde];

  const filas = items
    .map((item, indice) => {
      const centroY = indice * altoFila + altoFila / 2;
      const anchoBarra = Math.max(2, (item.valor / maximo) * anchoPista);
      const porcentaje = (item.valor / total) * 100;
      const color = colores[indice % colores.length];
      return `
      <text x="${anchoEtiqueta}" y="${centroY}" text-anchor="end" dominant-baseline="central" font-size="10.5" fill="#0F172A">${escaparSvg(recortar(item.etiqueta, 34))}</text>
      <rect x="${xBarra}" y="${(centroY - altoBarra / 2).toFixed(1)}" width="${anchoBarra.toFixed(1)}" height="${altoBarra}" rx="3" fill="${color}" />
      <text x="${(xBarra + anchoBarra + 8).toFixed(1)}" y="${centroY}" dominant-baseline="central" font-size="10.5" font-weight="600" fill="#0F172A">${nfBO(item.valor)}</text>
      <text x="${(xBarra + anchoBarra + 8).toFixed(1)}" y="${centroY + 12}" dominant-baseline="central" font-size="8.5" fill="${COLORES.gris}">${nfBO(porcentaje, 1)}% del total</text>`;
    })
    .join('');

  return envolver(opciones.titulo, ANCHO, ALTO, filas);
}

// Anillo de dos categorias. Es el unico caso en que una dona se lee bien para
// alguien no tecnico: dos porciones que suman el cien por cien. Cada porcion se
// etiqueta al costado con su valor y su porcentaje, sin leyenda lejana.
export function svgAnillo(opciones: {
  partes: { etiqueta: string; valor: number; color?: string }[];
  titulo?: string;
}): string | null {
  const partes = opciones.partes.filter((p) => p.valor > 0);
  const total = partes.reduce((a, p) => a + p.valor, 0);
  if (partes.length === 0 || total <= 0) return null;

  const cx = 72;
  const cy = 72;
  const radioExterno = 62;
  const radioInterno = 36;
  const paleta = [COLORES.navy, COLORES.teal, COLORES.morado, COLORES.amarillo];

  let caminos: string;
  if (partes.length === 1) {
    // Una sola categoria: el anillo completo se dibuja como dos semicircunferencias.
    // Un arco cuyo angulo inicial es igual al final degenera y no se ve nada.
    const color = partes[0].color ?? paleta[0];
    caminos =
      `<path d="${arco(cx, cy, radioExterno, radioInterno, -Math.PI / 2, Math.PI / 2)}" fill="${color}"/>` +
      `<path d="${arco(cx, cy, radioExterno, radioInterno, Math.PI / 2, (3 * Math.PI) / 2)}" fill="${color}"/>`;
  } else {
    let angulo = -Math.PI / 2; // empieza arriba
    caminos = partes
      .map((parte, indice) => {
        const siguiente = angulo + (parte.valor / total) * 2 * Math.PI;
        const d = arco(cx, cy, radioExterno, radioInterno, angulo, siguiente);
        angulo = siguiente;
        return `<path d="${d}" fill="${parte.color ?? paleta[indice % paleta.length]}"/>`;
      })
      .join('');
  }

  const leyenda = partes
    .map((parte, indice) => {
      const color = parte.color ?? paleta[indice % paleta.length];
      const porcentaje = nfBO((parte.valor / total) * 100, 1);
      return `<div class="it"><span class="sw" style="background:${color}"></span>${escaparSvg(parte.etiqueta)}: <strong>${nfBO(parte.valor)}</strong> (${porcentaje}%)</div>`;
    })
    .join('');

  const titulo = opciones.titulo ? `<p class="cap">${escaparSvg(opciones.titulo)}</p>` : '';
  return `<figure class="grafico">${titulo}<div class="grafico-flex"><svg viewBox="0 0 144 144" width="144" height="144" role="img">${caminos}</svg><div class="anillo-leyenda">${leyenda}</div></div></figure>`;
}

// Camino de un sector de anillo entre dos angulos, en radianes y sentido
// horario, con el cero a la derecha. La parte delicada es el indicador de arco
// grande, que hay que activar cuando el sector supera media vuelta.
function arco(
  cx: number,
  cy: number,
  radioExterno: number,
  radioInterno: number,
  desde: number,
  hasta: number,
): string {
  const arcoGrande = hasta - desde > Math.PI ? 1 : 0;
  const punto = (radio: number, angulo: number) =>
    `${(cx + radio * Math.cos(angulo)).toFixed(2)},${(cy + radio * Math.sin(angulo)).toFixed(2)}`;
  return (
    `M${punto(radioExterno, desde)} ` +
    `A${radioExterno},${radioExterno} 0 ${arcoGrande} 1 ${punto(radioExterno, hasta)} ` +
    `L${punto(radioInterno, hasta)} ` +
    `A${radioInterno},${radioInterno} 0 ${arcoGrande} 0 ${punto(radioInterno, desde)} Z`
  );
}

function envolver(titulo: string | undefined, ancho: number, alto: number, contenido: string): string {
  const cabecera = titulo ? `<p class="cap">${escaparSvg(titulo)}</p>` : '';
  return `<figure class="grafico">${cabecera}<svg viewBox="0 0 ${ancho} ${alto}" width="100%" role="img" font-family="'Open Sans',Arial,sans-serif">${contenido}</svg></figure>`;
}
