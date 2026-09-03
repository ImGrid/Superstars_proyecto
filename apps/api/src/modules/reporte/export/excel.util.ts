import ExcelJS = require('exceljs');

// Constructor de los archivos Excel de los reportes.
//
// Colores: son los de la marca, tomados de apps/web/src/app/globals.css, no una
// paleta generica. Navy #041F6B es el color de estructura (cabecera de tabla y
// titulos), igual que la barra lateral del portal.
//
// Reglas que NO son opcionales:
//  * Los numeros y las fechas se guardan CRUDOS (number / Date) con numFmt.
//    Nunca como texto preformateado: si se guarda "97,50%" como cadena, Excel
//    no puede sumar, ordenar ni filtrar, y el separador decimal queda fijo en
//    vez de adaptarse al idioma de quien abre el archivo.
//  * Toda celda de texto pasa por sanearTexto (ver abajo).

// Paleta oficial (globals.css). ExcelJS usa ARGB, con FF de opacidad al inicio.
const NAVY = 'FF041F6B'; // --chart-1 / --sidebar: estructura
const MORADO = 'FF5A1092'; // --primary: acento
const ZEBRA = 'FFF2F5FA'; // navy muy diluido para las filas alternas
const GRIS = 'FF64748B'; // --muted-foreground: textos secundarios
const AMBAR = 'FFFFCC43'; // --chart-4
const ROJO = 'FFDC2626'; // --destructive

// Calibri y no las fuentes de marca (Open Sans / IBM Plex) a proposito: esas no
// estan instaladas en la mayoria de los equipos que van a abrir el archivo, asi
// que Excel caeria igual a una fuente de reemplazo. Las fuentes de marca se usan
// en el PDF, donde si se pueden incrustar.
const FUENTE = 'Calibri';

export type AlineacionColumna = 'left' | 'right' | 'center';

export interface ColumnaExcel {
  header: string;
  key: string;
  width?: number;
  // formato de Excel: '#,##0', '0.00"%"', 'dd/mm/yyyy', '#,##0.00" MB"'
  numFmt?: string;
  align?: AlineacionColumna;
  // ajusta el texto en varias lineas (para columnas largas como "que le falta")
  ajustarTexto?: boolean;
}

export interface HojaExcel {
  nombre: string;
  columnas: ColumnaExcel[];
  filas: Record<string, unknown>[];
  // se muestra bajo el titulo de la hoja
  subtitulo?: string;
  // fila final de totales, con las mismas claves que las columnas
  total?: Record<string, unknown>;
  totalEtiqueta?: string;
  // aclaracion al pie de la tabla
  nota?: string;
  // pinta la fila segun el valor de esta columna (se usa en calidad de datos)
  colorearPorSeveridad?: string;
}

export interface DatosPortada {
  titulo: string;
  descripcion: string;
  generadoPor: string;
  generadoEn: Date;
  filtros: Record<string, unknown>;
  totalFilas: number;
  advertencias?: string[];
}

// Excel interpreta como formula toda celda de texto que empieza con = + - @ o
// con tabulacion / salto de linea, y eso permite construir un archivo que
// ejecuta algo al abrirlo (OWASP: CSV Injection). Los reportes exportan texto
// escrito por 179 personas de afuera (descripciones, propuestas, comentarios),
// asi que el saneo es obligatorio, no defensivo.
//
// Se antepone una comilla simple: Excel la usa como marca de "esto es texto" y
// no la muestra en la celda.
export function sanearTexto(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

// Las marcas de tiempo de Postgres llegan como '2026-09-03 11:18:19.213316-04',
// que no es ISO 8601: el separador es un espacio y el desfase horario no lleva
// minutos. Date no lo parsea de forma fiable en todos los entornos, asi que se
// normaliza antes. Devuelve null si no se puede interpretar, para que la celda
// quede vacia en lugar de mostrar "Invalid Date".
export function parseFechaBD(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const bruto = valor.trim();

  // El caso de fecha sola se resuelve PRIMERO y se sale. Si no, lo rompe el
  // arreglo del desfase horario de mas abajo: la expresion ([+-]\d{2})$ tambien
  // coincide con el final de '2026-09-03' (el -03 del dia) y lo convertiria en
  // '2026-09-03:00', que no es una fecha valida. Las columnas de tipo date
  // saldrian vacias en el Excel.
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) {
    return fechaValidaONull(`${bruto}T00:00:00`);
  }

  // '2026-09-03 11:18:19.213316-04' -> ISO: separador T y desfase con minutos
  const texto = bruto.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return fechaValidaONull(texto);
}

function fechaValidaONull(texto: string): Date | null {
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Bytes a megabytes, para que la columna de peso sea legible y siga siendo
// un numero con el que Excel pueda operar.
export function bytesAMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

// Colores de fondo por severidad del reporte de calidad de datos.
const FONDO_SEVERIDAD: Record<string, string> = {
  error: 'FFFDE8E8',
  revisar: 'FFFFF6DC',
  falta: 'FFF1F5F9',
};

const BORDE_SEVERIDAD: Record<string, string> = {
  error: ROJO,
  revisar: AMBAR,
  falta: GRIS,
};

// Arma el archivo completo. La primera hoja siempre es la de informacion: el
// archivo lleva datos personales y tiene que poder decir por si solo quien lo
// genero, cuando y con que recorte, aunque se reenvie por correo semanas
// despues sin contexto.
export async function construirExcel(
  portada: DatosPortada,
  hojas: HojaExcel[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Empresas SUPERSTAR';
  wb.created = portada.generadoEn;

  escribirPortada(wb, portada);
  for (const hoja of hojas) escribirHoja(wb, hoja);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function escribirPortada(wb: ExcelJS.Workbook, portada: DatosPortada): void {
  const ws = wb.addWorksheet('Información', {
    properties: { tabColor: { argb: NAVY } },
  });
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 82;

  ws.mergeCells(1, 1, 1, 2);
  const titulo = ws.getCell(1, 1);
  titulo.value = portada.titulo;
  titulo.font = { name: FUENTE, bold: true, size: 16, color: { argb: NAVY } };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, 2);
  const desc = ws.getCell(2, 1);
  desc.value = portada.descripcion;
  desc.font = { name: FUENTE, size: 10, color: { argb: GRIS } };
  desc.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(2).height = 30;

  const datos: [string, string][] = [
    ['Generado por', portada.generadoPor],
    ['Fecha y hora', formatearFechaHora(portada.generadoEn)],
    ['Filtros aplicados', describirFiltros(portada.filtros)],
    ['Filas exportadas', String(portada.totalFilas)],
  ];

  let fila = 4;
  for (const [etiqueta, valor] of datos) {
    const celdaEtiqueta = ws.getCell(fila, 1);
    celdaEtiqueta.value = etiqueta;
    celdaEtiqueta.font = { name: FUENTE, bold: true, size: 10, color: { argb: NAVY } };
    celdaEtiqueta.alignment = { vertical: 'top' };

    const celdaValor = ws.getCell(fila, 2);
    celdaValor.value = sanearTexto(valor) as ExcelJS.CellValue;
    celdaValor.font = { name: FUENTE, size: 10 };
    celdaValor.alignment = { wrapText: true, vertical: 'top' };
    fila++;
  }

  if (portada.advertencias && portada.advertencias.length > 0) {
    fila++;
    ws.mergeCells(fila, 1, fila, 2);
    const cabecera = ws.getCell(fila, 1);
    cabecera.value = 'Cómo leer este archivo';
    cabecera.font = { name: FUENTE, bold: true, size: 11, color: { argb: MORADO } };
    fila++;

    for (const texto of portada.advertencias) {
      ws.mergeCells(fila, 1, fila, 2);
      const celda = ws.getCell(fila, 1);
      celda.value = sanearTexto(`• ${texto}`) as ExcelJS.CellValue;
      celda.font = { name: FUENTE, size: 10 };
      celda.alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(fila).height = Math.max(15, Math.ceil(texto.length / 95) * 15);
      fila++;
    }
  }

  fila++;
  ws.mergeCells(fila, 1, fila, 2);
  const aviso = ws.getCell(fila, 1);
  aviso.value =
    'Este archivo contiene datos personales de las personas registradas en la plataforma. ' +
    'Compártelo únicamente con quien deba tratarlos y evita reenviarlo por canales abiertos.';
  aviso.font = { name: FUENTE, size: 9, italic: true, color: { argb: GRIS } };
  aviso.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(fila).height = 28;
}

function escribirHoja(wb: ExcelJS.Workbook, hoja: HojaExcel): void {
  const ws = wb.addWorksheet(nombreDeHojaValido(hoja.nombre));
  const numColumnas = hoja.columnas.length;

  // Anchos y formatos por columna
  hoja.columnas.forEach((col, i) => {
    const columna = ws.getColumn(i + 1);
    columna.width = col.width ?? 18;
    if (col.numFmt) columna.numFmt = col.numFmt;
  });

  // Fila 1: nombre de la hoja
  ws.mergeCells(1, 1, 1, numColumnas);
  const titulo = ws.getCell(1, 1);
  titulo.value = hoja.nombre;
  titulo.font = { name: FUENTE, bold: true, size: 14, color: { argb: NAVY } };
  ws.getRow(1).height = 22;

  // Fila 2: subtitulo
  ws.mergeCells(2, 1, 2, numColumnas);
  const subtitulo = ws.getCell(2, 1);
  subtitulo.value = hoja.subtitulo ?? `${hoja.filas.length} registros`;
  subtitulo.font = { name: FUENTE, size: 10, color: { argb: GRIS } };
  ws.getRow(2).height = 16;

  // Fila 3: cabecera de la tabla
  const cabecera = ws.getRow(3);
  hoja.columnas.forEach((col, i) => {
    const celda = cabecera.getCell(i + 1);
    celda.value = col.header;
    celda.font = { name: FUENTE, bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    celda.alignment = {
      vertical: 'middle',
      horizontal: col.align ?? 'left',
      wrapText: true,
    };
  });
  cabecera.height = 28;

  // Filas de datos
  const indiceSeveridad = hoja.colorearPorSeveridad
    ? hoja.columnas.findIndex((c) => c.key === hoja.colorearPorSeveridad)
    : -1;

  hoja.filas.forEach((datos, indice) => {
    const fila = ws.getRow(4 + indice);
    const severidad =
      hoja.colorearPorSeveridad != null
        ? String(datos[hoja.colorearPorSeveridad] ?? '')
        : '';
    const fondo = FONDO_SEVERIDAD[severidad] ?? (indice % 2 === 1 ? ZEBRA : null);

    hoja.columnas.forEach((col, i) => {
      const celda = fila.getCell(i + 1);
      celda.value = sanearTexto(datos[col.key] ?? null) as ExcelJS.CellValue;
      celda.font = { name: FUENTE, size: 10 };
      celda.alignment = {
        horizontal: col.align ?? 'left',
        vertical: 'top',
        wrapText: col.ajustarTexto ?? false,
      };
      if (fondo) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
      }
    });

    // barra de color a la izquierda segun severidad
    if (indiceSeveridad >= 0 && BORDE_SEVERIDAD[severidad]) {
      fila.getCell(1).border = {
        left: { style: 'thick', color: { argb: BORDE_SEVERIDAD[severidad] } },
      };
    }
  });

  // Fila de totales
  if (hoja.total) {
    const fila = ws.getRow(4 + hoja.filas.length);
    hoja.columnas.forEach((col, i) => {
      const celda = fila.getCell(i + 1);
      if (i === 0) celda.value = hoja.totalEtiqueta ?? 'TOTAL';
      else if (hoja.total![col.key] != null) {
        celda.value = hoja.total![col.key] as ExcelJS.CellValue;
      }
      celda.font = { name: FUENTE, bold: true, size: 10, color: { argb: NAVY } };
      celda.border = { top: { style: 'thin', color: { argb: NAVY } } };
      celda.alignment = { horizontal: col.align ?? 'left' };
    });
  }

  // Nota al pie, separada de la tabla para que el autofiltro no la tome como dato
  if (hoja.nota) {
    const numeroFila = 4 + hoja.filas.length + (hoja.total ? 1 : 0) + 1;
    ws.mergeCells(numeroFila, 1, numeroFila, numColumnas);
    const celda = ws.getCell(numeroFila, 1);
    celda.value = sanearTexto(hoja.nota) as ExcelJS.CellValue;
    celda.font = { name: FUENTE, size: 9, italic: true, color: { argb: GRIS } };
    celda.alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(numeroFila).height = Math.max(16, Math.ceil(hoja.nota.length / 110) * 15);
  }

  // Cabecera fija al desplazarse y filtro automatico sobre la fila 3
  ws.views = [{ state: 'frozen', ySplit: 3 }];
  if (hoja.filas.length > 0) {
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: numColumnas },
    };
  }
}

// Excel rechaza nombres de hoja con : \ / ? * [ ] y limita a 31 caracteres. Los
// nombres de categoria del concurso son largos ("Emprendimientos de Agricultura
// Sostenible"), asi que hay que recortarlos o el archivo sale corrupto.
export function nombreDeHojaValido(nombre: string): string {
  const limpio = nombre.replace(/[:\\/?*[\]]/g, ' ').trim();
  return limpio.length > 31 ? `${limpio.slice(0, 30)}…` : limpio || 'Hoja';
}

function formatearFechaHora(fecha: Date): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

// Traduce el objeto de filtros a una frase legible para la portada. Sin esto,
// quien recibe el archivo no sabe si tiene todo o un recorte.
function describirFiltros(filtros: Record<string, unknown>): string {
  const partes = Object.entries(filtros)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([clave, valor]) => `${clave}: ${String(valor)}`);
  return partes.length > 0 ? partes.join(' · ') : 'Ninguno (informe completo)';
}
