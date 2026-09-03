import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ETAPA_EMBUDO_LABEL,
  ESTADO_POSTULACION_LABEL,
  etiquetaDeEstado,
  etiquetaDeOpcion,
  OPCIONES_DEPARTAMENTO,
  OPCIONES_RUBRO,
  OPCIONES_TIPO_EMPRESA,
  OPCIONES_GENERO,
  OPCIONES_NUMERO_SOCIOS,
  etapaEmbudoValues,
} from '@superstars/shared';
import type {
  ReporteQueryDto,
  TipoReporte,
  FormatoReporte,
  FiltroReporte,
  ReporteCatalogoItem,
  ReporteCatalogoResponse,
  EtapaEmbudo,
} from '@superstars/shared';
import { ReporteRepository } from './reporte.repository';
import {
  construirExcel,
  parseFechaBD,
  bytesAMb,
  type ColumnaExcel,
  type HojaExcel,
  type DatosPortada,
} from './export/excel.util';
import { PdfService } from './export/pdf.service';
import {
  construirPdfReporte,
  tablaHtml,
  fichaHtml,
  escaparHtml as escaparHtmlPdf,
  pdfNum,
  type ColumnaPdf,
  type CabeceraPdf,
  type SeccionFicha,
} from './export/pdf.util';
import { svgBarras, svgEmbudo, svgAnillo } from './export/chart.util';
import { COLORES } from './export/paleta';
import type {
  FilaContacto,
  FilaPostulacion,
  CampoFormulario,
  FilaCalidad,
} from './reporte.types';

// Archivo generado, listo para que el controlador lo mande por HTTP
export interface ArchivoReporte {
  buffer: Buffer;
  nombreArchivo: string;
  mimeType: string;
  // cuantas filas de datos salieron; se guarda en la auditoria de descargas
  filasExportadas: number;
}

// Definicion estatica de cada reporte: como se llama, que explica, en que
// formatos existe y que filtros acepta. Es la unica lista de reportes del
// sistema; la base guarda el tipo como texto libre justamente para que sumar
// uno nuevo se haga aqui y no con una migracion.
interface DefinicionReporte {
  nombre: string;
  descripcion: string;
  formatos: FormatoReporte[];
  filtros: FiltroReporte[];
}

const CATALOGO: Record<TipoReporte, DefinicionReporte> = {
  contactos: {
    nombre: 'Base de contactos para seguimiento',
    // La descripcion se lee en una lista, asi que cabe en una linea. El detalle
    // (que significa cada etapa, por que faltan telefonos) va en la portada del
    // propio archivo, donde se lee en el momento de usarlo.
    descripcion:
      'Para llamar o escribir a quienes aún no terminaron su postulación, agrupados por etapa.',
    formatos: ['excel', 'pdf'],
    filtros: ['convocatoriaId', 'categoriaId', 'departamento', 'etapa', 'desde', 'hasta'],
  },
  postulaciones: {
    nombre: 'Detalle de postulaciones',
    descripcion:
      'Avance de cada postulación y qué campos obligatorios le faltan. Incluye los borradores.',
    formatos: ['excel', 'pdf'],
    filtros: ['convocatoriaId', 'categoriaId', 'departamento', 'estado', 'desde', 'hasta'],
  },
  respuestas: {
    nombre: 'Respuestas completas del formulario',
    descripcion:
      'Todo lo que respondió cada empresa. En Excel para analizar, en PDF como ficha para leer.',
    formatos: ['excel', 'pdf'],
    filtros: ['convocatoriaId', 'categoriaId', 'estado'],
  },
  ecosistema: {
    nombre: 'Perfil del ecosistema',
    descripcion:
      'Quiénes participan: departamento, rubro, tipo de organización, género y empleo.',
    formatos: ['excel', 'pdf'],
    filtros: [],
  },
  calidad_datos: {
    nombre: 'Auditoría de calidad de datos',
    descripcion:
      'Datos inválidos, ausentes o dudosos en los perfiles de empresa, para corregirlos a tiempo.',
    formatos: ['excel', 'pdf'],
    filtros: ['departamento'],
  },
};

@Injectable()
export class ReporteService {
  constructor(
    private readonly repo: ReporteRepository,
    private readonly pdf: PdfService,
  ) {}

  // ============== CATALOGO ==============

  async getCatalogo(): Promise<ReporteCatalogoResponse> {
    const conteos = await this.repo.getConteos();

    const filasPorTipo: Record<TipoReporte, number> = {
      contactos: conteos.contactos,
      postulaciones: conteos.postulaciones,
      respuestas: conteos.respuestas,
      ecosistema: conteos.ecosistema,
      calidad_datos: conteos.calidadDatos,
    };

    const reportes: ReporteCatalogoItem[] = (
      Object.keys(CATALOGO) as TipoReporte[]
    ).map((tipo) => {
      const definicion = CATALOGO[tipo];
      const filas = filasPorTipo[tipo];
      // Si el servidor no tiene configurada la ruta de Chrome, el PDF no se
      // ofrece: es preferible que el boton no aparezca a que falle al pulsarlo.
      const formatos = this.pdf.disponible
        ? definicion.formatos
        : definicion.formatos.filter((f) => f !== 'pdf');
      return {
        tipo,
        nombre: definicion.nombre,
        descripcion: definicion.descripcion,
        formatos,
        filtros: definicion.filtros,
        filas,
        disponible: filas > 0,
        motivoNoDisponible:
          filas > 0
            ? null
            : 'Todavía no hay datos suficientes para generar este reporte.',
      };
    });

    return { reportes, generadoEn: new Date().toISOString() };
  }

  // ============== GENERACION ==============

  async generar(
    tipo: TipoReporte,
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const definicion = CATALOGO[tipo];

    if (!definicion.formatos.includes(filtros.formato)) {
      throw new BadRequestException(
        `El reporte "${definicion.nombre}" todavía no está disponible en formato ${filtros.formato}.`,
      );
    }

    if (filtros.formato === 'pdf') {
      switch (tipo) {
        case 'contactos':
          return this.generarContactosPdf(filtros, generadoPor);
        case 'postulaciones':
          return this.generarPostulacionesPdf(filtros, generadoPor);
        case 'respuestas':
          return this.generarRespuestasPdf(filtros, generadoPor);
        case 'ecosistema':
          return this.generarEcosistemaPdf(filtros, generadoPor);
        case 'calidad_datos':
          return this.generarCalidadDatosPdf(filtros, generadoPor);
      }
    }

    switch (tipo) {
      case 'contactos':
        return this.generarContactos(filtros, generadoPor);
      case 'postulaciones':
        return this.generarPostulaciones(filtros, generadoPor);
      case 'respuestas':
        return this.generarRespuestas(filtros, generadoPor);
      case 'ecosistema':
        return this.generarEcosistema(filtros, generadoPor);
      case 'calidad_datos':
        return this.generarCalidadDatos(filtros, generadoPor);
    }
  }

  // ============== R1 · CONTACTOS ==============

  private async generarContactos(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const filas = await this.repo.getContactos(filtros);

    const columnas: ColumnaExcel[] = [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Correo electrónico', key: 'email', width: 34 },
      { header: 'Etapa', key: 'etapa', width: 26 },
      { header: 'Teléfono de contacto', key: 'telefonoContacto', width: 20 },
      { header: 'Teléfono de la empresa', key: 'telefonoEmpresa', width: 20 },
      { header: 'Teléfono en la postulación', key: 'telefonoPostulacion', width: 22 },
      { header: 'Cargo', key: 'cargo', width: 26 },
      { header: 'Empresa', key: 'razonSocial', width: 36 },
      { header: 'Departamento', key: 'departamento', width: 16 },
      { header: 'Ciudad', key: 'ciudad', width: 18 },
      { header: 'Categorías', key: 'categorias', width: 32 },
      { header: 'Postulaciones', key: 'postulaciones', width: 13, numFmt: '#,##0', align: 'right' },
      { header: 'Mayor avance', key: 'mejorAvance', width: 13, numFmt: '0.00"%"', align: 'right' },
      { header: 'Último envío', key: 'ultimoEnvio', width: 16, numFmt: 'dd/mm/yyyy', align: 'center' },
      { header: 'Fecha de registro', key: 'fechaRegistro', width: 16, numFmt: 'dd/mm/yyyy', align: 'center' },
    ];

    const aFilaExcel = (c: FilaContacto): Record<string, unknown> => ({
      nombre: c.nombre,
      email: c.email,
      etapa: ETAPA_EMBUDO_LABEL[c.etapa],
      telefonoContacto: c.telefonoContacto,
      telefonoEmpresa: c.telefonoEmpresa,
      telefonoPostulacion: c.telefonoPostulacion,
      cargo: c.cargo,
      razonSocial: c.razonSocial,
      departamento: etiquetaDeOpcion(OPCIONES_DEPARTAMENTO, c.departamento),
      ciudad: c.ciudad,
      categorias: c.categorias,
      postulaciones: c.postulaciones,
      mejorAvance: c.mejorAvance,
      ultimoEnvio: parseFechaBD(c.ultimoEnvio),
      fechaRegistro: parseFechaBD(c.fechaRegistro),
    });

    // Una hoja por etapa del embudo, mas una con todas. El mensaje que hay que
    // mandarle a alguien que ni creo su empresa no es el mismo que el de alguien
    // que tiene el formulario al 97%, y separarlos evita tener que filtrar.
    const hojas: HojaExcel[] = [
      {
        nombre: 'Todos',
        subtitulo: `${filas.length} personas registradas como postulantes`,
        columnas,
        filas: filas.map(aFilaExcel),
      },
    ];

    for (const etapa of etapaEmbudoValues) {
      const deEsaEtapa = filas.filter((c) => c.etapa === etapa);
      if (deEsaEtapa.length === 0) continue;
      hojas.push({
        nombre: ETAPA_EMBUDO_LABEL[etapa as EtapaEmbudo],
        subtitulo: `${deEsaEtapa.length} personas`,
        columnas,
        filas: deEsaEtapa.map(aFilaExcel),
        nota: this.notaDeEtapa(etapa as EtapaEmbudo, deEsaEtapa.length),
      });
    }

    const sinTelefono = filas.filter(
      (c) => !c.telefonoContacto && !c.telefonoEmpresa && !c.telefonoPostulacion,
    ).length;

    const buffer = await construirExcel(
      this.portada(
        'Base de contactos para seguimiento',
        CATALOGO.contactos.descripcion,
        generadoPor,
        filtros,
        filas.length,
        [
          'Hay una hoja por cada etapa del embudo, más la hoja "Todos" con el listado completo.',
          `${sinTelefono} de las ${filas.length} personas no tienen ningún teléfono registrado. ` +
            'El sistema solo pide el teléfono al completar el perfil de la empresa, así que quienes ' +
            'se registraron y no avanzaron solo se pueden contactar por correo.',
          'Las tres columnas de teléfono van separadas porque pueden diferir: la persona puede haber ' +
            'declarado en su postulación un número distinto al de su perfil.',
        ],
      ),
      hojas,
    );

    return {
      buffer,
      nombreArchivo: this.nombreArchivo('contactos', 'xlsx'),
      mimeType: MIME_EXCEL,
      filasExportadas: filas.length,
    };
  }

  private notaDeEtapa(etapa: EtapaEmbudo, cantidad: number): string {
    switch (etapa) {
      case 'solo_registrado':
        return `${cantidad} personas confirmaron su correo pero nunca crearon el perfil de su empresa. No hay teléfono de ellas: el único contacto posible es el correo.`;
      case 'empresa_sin_postular':
        return `${cantidad} personas completaron el perfil de su empresa pero todavía no abrieron ninguna postulación.`;
      case 'borrador':
        return `${cantidad} personas tienen una postulación empezada y sin enviar. La columna "Mayor avance" indica qué tan cerca están de terminarla.`;
      case 'enviada':
        return `${cantidad} personas ya enviaron su postulación.`;
    }
  }

  // ============== R3 · POSTULACIONES ==============

  private async generarPostulaciones(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const filas = await this.repo.getPostulaciones(filtros);

    const columnas: ColumnaExcel[] = [
      { header: 'N.º', key: 'postulacionId', width: 7, numFmt: '#,##0', align: 'right' },
      { header: 'Convocatoria', key: 'convocatoria', width: 22 },
      { header: 'Categoría', key: 'categoria', width: 34 },
      { header: 'Empresa', key: 'razonSocial', width: 38 },
      { header: 'Persona de contacto', key: 'contacto', width: 28 },
      { header: 'Correo electrónico', key: 'email', width: 32 },
      { header: 'Teléfono', key: 'telefonoContacto', width: 18 },
      { header: 'Departamento', key: 'departamento', width: 16 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Avance', key: 'porcentajeCompletado', width: 10, numFmt: '0.00"%"', align: 'right' },
      { header: 'Campos que faltan', key: 'camposFaltantes', width: 12, numFmt: '#,##0', align: 'right' },
      { header: 'Qué le falta', key: 'queLeFalta', width: 60, ajustarTexto: true },
      { header: 'Archivos', key: 'archivos', width: 10, numFmt: '#,##0', align: 'right' },
      { header: 'Peso', key: 'pesoMb', width: 12, numFmt: '#,##0.00" MB"', align: 'right' },
      { header: 'Iniciada', key: 'iniciada', width: 16, numFmt: 'dd/mm/yyyy', align: 'center' },
      { header: 'Última edición', key: 'ultimaEdicion', width: 17, numFmt: 'dd/mm/yyyy hh:mm', align: 'center' },
      { header: 'Fecha de envío', key: 'fechaEnvio', width: 17, numFmt: 'dd/mm/yyyy hh:mm', align: 'center' },
    ];

    const aFilaExcel = (p: FilaPostulacion): Record<string, unknown> => ({
      postulacionId: p.postulacionId,
      convocatoria: p.convocatoria,
      categoria: p.categoria,
      razonSocial: p.razonSocial,
      contacto: p.contacto,
      email: p.email,
      telefonoContacto: p.telefonoContacto,
      departamento: etiquetaDeOpcion(OPCIONES_DEPARTAMENTO, p.departamento),
      estado: etiquetaDeEstado(ESTADO_POSTULACION_LABEL, p.estado),
      porcentajeCompletado: p.porcentajeCompletado,
      camposFaltantes: p.camposFaltantes,
      queLeFalta: p.queLeFalta,
      archivos: p.archivos,
      pesoMb: bytesAMb(p.bytesArchivos),
      iniciada: parseFechaBD(p.iniciada),
      ultimaEdicion: parseFechaBD(p.ultimaEdicion),
      fechaEnvio: parseFechaBD(p.fechaEnvio),
    });

    const hojas: HojaExcel[] = [
      {
        nombre: 'Postulaciones',
        subtitulo: `${filas.length} postulaciones, incluidas las que están en borrador`,
        columnas,
        filas: filas.map(aFilaExcel),
        total: {
          archivos: filas.reduce((a, p) => a + p.archivos, 0),
          pesoMb: bytesAMb(filas.reduce((a, p) => a + p.bytesArchivos, 0)),
        },
        nota:
          'La columna "Qué le falta" lista los campos obligatorios sin llenar, comparando lo que la ' +
          'persona respondió contra el formulario de su categoría. Una postulación no se puede enviar ' +
          'hasta que esa lista quede vacía.',
      },
    ];

    // Resumen por categoria y estado, para leer el panorama sin filtrar
    const resumen = new Map<string, { categoria: string; estado: string; total: number; avance: number }>();
    for (const p of filas) {
      const clave = `${p.categoria}|${p.estado}`;
      const actual = resumen.get(clave) ?? {
        categoria: p.categoria,
        estado: etiquetaDeEstado(ESTADO_POSTULACION_LABEL, p.estado),
        total: 0,
        avance: 0,
      };
      actual.total += 1;
      actual.avance += p.porcentajeCompletado;
      resumen.set(clave, actual);
    }

    if (resumen.size > 0) {
      hojas.unshift({
        nombre: 'Resumen',
        subtitulo: 'Cuántas postulaciones hay en cada categoría y estado',
        columnas: [
          { header: 'Categoría', key: 'categoria', width: 40 },
          { header: 'Estado', key: 'estado', width: 18 },
          { header: 'Postulaciones', key: 'total', width: 14, numFmt: '#,##0', align: 'right' },
          { header: 'Avance promedio', key: 'avancePromedio', width: 16, numFmt: '0.00"%"', align: 'right' },
        ],
        filas: [...resumen.values()]
          .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.estado.localeCompare(b.estado))
          .map((r) => ({
            categoria: r.categoria,
            estado: r.estado,
            total: r.total,
            avancePromedio: Math.round((r.avance / r.total) * 100) / 100,
          })),
        total: { total: filas.length },
      });
    }

    const buffer = await construirExcel(
      this.portada(
        'Detalle de postulaciones',
        CATALOGO.postulaciones.descripcion,
        generadoPor,
        filtros,
        filas.length,
        [
          'Incluye las postulaciones en borrador: sirve para saber en qué punto está cada una antes de que cierre la convocatoria.',
          'Ordenadas de mayor a menor avance, así las que están a punto de terminar aparecen primero.',
        ],
      ),
      hojas,
    );

    return {
      buffer,
      nombreArchivo: this.nombreArchivo('postulaciones', 'xlsx'),
      mimeType: MIME_EXCEL,
      filasExportadas: filas.length,
    };
  }

  // ============== R4 · RESPUESTAS ==============

  private async generarRespuestas(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const [categorias, respuestas] = await Promise.all([
      this.repo.getCategoriasConFormulario(filtros),
      this.repo.getRespuestas(filtros),
    ]);

    // Una categoria sin formulario no genera hoja, y sus postulaciones se
    // quedarian fuera del archivo sin que nadie se entere. Hoy no deberia
    // pasar (no se puede postular sin formulario), pero una categoria recien
    // creada nace sin el. Se avisa en la portada en vez de omitir en silencio.
    const conHoja = new Set(categorias.map((c) => c.categoriaId));
    const sinFormulario = [
      ...new Set(
        respuestas.filter((r) => !conHoja.has(r.categoriaId)).map((r) => r.categoriaId),
      ),
    ];
    const omitidas = respuestas.filter((r) => !conHoja.has(r.categoriaId)).length;

    // Una hoja por categoria y no una sola tabla: las dos categorias reutilizan
    // ids de campo con tipos distintos (empresa_socios es seleccion unica en una
    // y texto corto en la otra) y tienen preguntas propias. Mezclarlas daria una
    // columna con dos significados.
    const hojas: HojaExcel[] = [];

    for (const categoria of categorias) {
      const suyas = respuestas.filter((r) => r.categoriaId === categoria.categoriaId);
      if (suyas.length === 0) continue;

      const columnas: ColumnaExcel[] = [
        { header: 'N.º', key: '_id', width: 7, numFmt: '#,##0', align: 'right' },
        { header: 'Empresa', key: '_empresa', width: 36 },
        { header: 'Correo electrónico', key: '_email', width: 32 },
        { header: 'Estado', key: '_estado', width: 16 },
        { header: 'Avance', key: '_avance', width: 10, numFmt: '0.00"%"', align: 'right' },
        { header: 'Fecha de envío', key: '_envio', width: 17, numFmt: 'dd/mm/yyyy hh:mm', align: 'center' },
        ...categoria.campos.map((campo) => ({
          header: campo.etiqueta,
          key: campo.fieldId,
          width: this.anchoSegunTipo(campo.tipo),
          ajustarTexto: campo.tipo === 'texto_largo' || campo.tipo === 'seleccion_multiple',
        })),
      ];

      hojas.push({
        nombre: categoria.categoriaNombre,
        subtitulo: `${suyas.length} postulaciones · ${categoria.campos.length} preguntas`,
        columnas,
        filas: suyas.map((r) => {
          const fila: Record<string, unknown> = {
            _id: r.postulacionId,
            _empresa: r.razonSocial,
            _email: r.email,
            _estado: etiquetaDeEstado(ESTADO_POSTULACION_LABEL, r.estado),
            _avance: r.porcentajeCompletado,
            _envio: parseFechaBD(r.fechaEnvio),
          };
          for (const campo of categoria.campos) {
            fila[campo.fieldId] = this.valorDeCampo(
              campo,
              r.responseData[campo.fieldId],
              r.archivos[campo.fieldId],
            );
          }
          return fila;
        }),
        nota:
          'Las preguntas de solo lectura (textos informativos del formulario) no se exportan porque no ' +
          'contienen respuestas. Los archivos adjuntos se muestran con su nombre original.',
      });
    }

    const buffer = await construirExcel(
      this.portada(
        'Respuestas completas del formulario',
        CATALOGO.respuestas.descripcion,
        generadoPor,
        filtros,
        respuestas.length,
        [
          'Hay una hoja por categoría porque cada una tiene su propio formulario. Algunas preguntas ' +
            'comparten nombre interno entre categorías pero significan cosas distintas, así que no se pueden mezclar.',
          'Las respuestas de selección múltiple aparecen separadas por punto y coma.',
          'Las tablas del formulario, como la evolución financiera, se muestran con una línea por fila de la tabla.',
          ...(omitidas > 0
            ? [
                `ATENCIÓN: ${omitidas} postulación(es) quedaron fuera de este archivo porque su categoría ` +
                  `(${sinFormulario.join(', ')}) todavía no tiene un formulario configurado. ` +
                  'Configura el formulario de esa categoría y vuelve a descargar el reporte.',
              ]
            : []),
        ],
      ),
      hojas,
    );

    return {
      buffer,
      nombreArchivo: this.nombreArchivo('respuestas', 'xlsx'),
      mimeType: MIME_EXCEL,
      filasExportadas: respuestas.length,
    };
  }

  // Convierte el valor guardado en el JSONB a algo legible en una celda.
  // Cada tipo de campo guarda una forma distinta y hay que respetarla.
  private valorDeCampo(
    campo: CampoFormulario,
    valor: unknown,
    archivos: string[] | undefined,
  ): unknown {
    // los campos de archivo no guardan nada en response_data: el dato esta en
    // la tabla de archivos
    if (campo.tipo === 'archivo') {
      return archivos && archivos.length > 0 ? archivos.join(' | ') : null;
    }
    if (valor === null || valor === undefined || valor === '') return null;

    switch (campo.tipo) {
      case 'si_no':
        return valor === true ? 'Sí' : valor === false ? 'No' : null;

      case 'seleccion_unica':
        return etiquetaDeOpcion(campo.opciones, String(valor));

      case 'seleccion_multiple':
        if (!Array.isArray(valor)) return String(valor);
        if (valor.length === 0) return null;
        return valor.map((v) => etiquetaDeOpcion(campo.opciones, String(v))).join('; ');

      case 'tabla': {
        if (!Array.isArray(valor) || valor.length === 0) return null;
        // una linea por fila de la tabla, con "columna: valor" separado por comas
        return valor
          .map((fila) => {
            const registro = fila as Record<string, unknown>;
            return campo.columnas
              .map((col) => `${col.titulo}: ${registro[col.id] ?? ''}`)
              .join(', ');
          })
          .join('\n');
      }

      case 'numerico': {
        const numero = Number(valor);
        return Number.isNaN(numero) ? String(valor) : numero;
      }

      default:
        return String(valor);
    }
  }

  private anchoSegunTipo(tipo: string): number {
    switch (tipo) {
      case 'texto_largo':
      case 'tabla':
        return 55;
      case 'seleccion_multiple':
        return 45;
      case 'texto_url':
        return 30;
      case 'numerico':
      case 'si_no':
        return 14;
      default:
        return 26;
    }
  }

  // ============== R5 · ECOSISTEMA ==============

  private async generarEcosistema(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const [resumen, dimensiones, embudo] = await Promise.all([
      this.repo.getResumenEcosistema(),
      this.repo.getDimensiones(),
      this.repo.getEmbudo(),
    ]);

    const totalEmpleados = resumen.empleadasMujeres + resumen.empleadosHombres;
    const pctMujeres =
      totalEmpleados > 0
        ? Math.round((resumen.empleadasMujeres / totalEmpleados) * 10000) / 100
        : 0;

    const hojas: HojaExcel[] = [
      {
        nombre: 'Resumen',
        subtitulo: 'Cifras generales del programa',
        columnas: [
          { header: 'Indicador', key: 'indicador', width: 46 },
          { header: 'Valor', key: 'valor', width: 16, numFmt: '#,##0.##', align: 'right' },
        ],
        filas: [
          { indicador: 'Personas registradas como postulantes', valor: resumen.proponentes },
          { indicador: 'Empresas con perfil creado', valor: resumen.empresas },
          { indicador: 'Postulaciones abiertas (incluye borradores)', valor: resumen.postulaciones },
          { indicador: 'Postulaciones enviadas', valor: resumen.enviadas },
          { indicador: 'Mujeres empleadas por las empresas', valor: resumen.empleadasMujeres },
          { indicador: 'Hombres empleados por las empresas', valor: resumen.empleadosHombres },
          { indicador: 'Porcentaje de empleo femenino', valor: pctMujeres },
          { indicador: 'Empresas con mayoría de mujeres en su planilla', valor: resumen.empresasMayoriaMujeres },
          { indicador: 'Empresas que declararon ambas cifras de empleo', valor: resumen.empresasConAmbasCifras },
          { indicador: 'Año de fundación promedio', valor: resumen.anioFundacionPromedio },
        ],
        nota:
          'El indicador de empresas con mayoría de mujeres se calcula solo sobre las que declararon ' +
          `las dos cifras (${resumen.empresasConAmbasCifras} de ${resumen.empresas}). Contar como mayoría ` +
          'femenina a una empresa que simplemente no declaró cuántos hombres emplea inflaría el dato.',
      },
      {
        nombre: 'Embudo de participación',
        subtitulo: 'Hasta dónde llegó cada persona registrada',
        columnas: [
          { header: 'Etapa', key: 'etapa', width: 32 },
          { header: 'Personas', key: 'personas', width: 12, numFmt: '#,##0', align: 'right' },
          { header: 'Con teléfono', key: 'conTelefono', width: 14, numFmt: '#,##0', align: 'right' },
          { header: 'Cobertura de teléfono', key: 'cobertura', width: 20, numFmt: '0.0"%"', align: 'right' },
        ],
        filas: etapaEmbudoValues
          .map((etapa) => embudo.find((e) => e.etapa === etapa))
          .filter((e): e is NonNullable<typeof e> => e !== undefined)
          .map((e) => ({
            etapa: ETAPA_EMBUDO_LABEL[e.etapa],
            personas: e.personas,
            conTelefono: e.conTelefono,
            cobertura:
              e.personas > 0 ? Math.round((e.conTelefono / e.personas) * 1000) / 10 : 0,
          })),
        total: {
          personas: embudo.reduce((a, e) => a + e.personas, 0),
          conTelefono: embudo.reduce((a, e) => a + e.conTelefono, 0),
        },
      },
    ];

    // Una hoja por dimension, con su porcentaje sobre el total de empresas
    for (const dimension of DIMENSIONES) {
      const suyas = dimensiones.filter((d) => d.dimension === dimension.clave);
      if (suyas.length === 0) continue;
      const total = suyas.reduce((a, d) => a + d.total, 0);

      hojas.push({
        nombre: dimension.nombre,
        subtitulo: `Empresas por ${dimension.nombre.toLowerCase()}`,
        columnas: [
          { header: dimension.nombre, key: 'valor', width: 34 },
          { header: 'Empresas', key: 'total', width: 12, numFmt: '#,##0', align: 'right' },
          { header: 'Porcentaje', key: 'porcentaje', width: 13, numFmt: '0.0"%"', align: 'right' },
        ],
        filas: suyas.map((d) => ({
          valor:
            d.valor === ''
              ? 'Sin dato'
              : etiquetaDeOpcion(dimension.opciones, d.valor),
          total: d.total,
          porcentaje: total > 0 ? Math.round((d.total / total) * 1000) / 10 : 0,
        })),
        total: { total },
      });
    }

    const buffer = await construirExcel(
      this.portada(
        'Perfil del ecosistema',
        CATALOGO.ecosistema.descripcion,
        generadoPor,
        filtros,
        resumen.empresas,
        [
          'Las filas marcadas como "Sin dato" corresponden a empresas que dejaron ese campo vacío en su perfil.',
          'Los porcentajes se calculan sobre el total de empresas con perfil creado.',
        ],
      ),
      hojas,
    );

    return {
      buffer,
      nombreArchivo: this.nombreArchivo('ecosistema', 'xlsx'),
      mimeType: MIME_EXCEL,
      filasExportadas: resumen.empresas,
    };
  }

  // ============== R9 · CALIDAD DE DATOS ==============

  private async generarCalidadDatos(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const filas = await this.repo.getCalidadDatos(filtros);

    const columnas: ColumnaExcel[] = [
      { header: 'Severidad', key: 'severidad', width: 14 },
      { header: 'Empresa', key: 'razonSocial', width: 40 },
      { header: 'Correo electrónico', key: 'emailUsuario', width: 32 },
      { header: 'Teléfono de contacto', key: 'telefonoContacto', width: 20 },
      { header: 'Departamento', key: 'departamento', width: 16 },
      { header: 'Problema', key: 'problema', width: 62, ajustarTexto: true },
      { header: 'Valor actual', key: 'valorActual', width: 24 },
      { header: 'Código', key: 'codigo', width: 28 },
      { header: 'N.º de empresa', key: 'empresaId', width: 13, numFmt: '#,##0', align: 'right' },
    ];

    const aFilaExcel = (c: FilaCalidad): Record<string, unknown> => ({
      severidad: SEVERIDAD_LABEL[c.severidad],
      razonSocial: c.razonSocial,
      emailUsuario: c.emailUsuario,
      telefonoContacto: c.telefonoContacto,
      departamento: etiquetaDeOpcion(OPCIONES_DEPARTAMENTO, c.departamento),
      problema: c.problema,
      valorActual: c.valorActual,
      codigo: c.codigo,
      empresaId: c.empresaId,
      _severidad: c.severidad,
    });

    // Resumen por tipo de problema, para saber por donde empezar
    const porCodigo = new Map<string, { problema: string; severidad: string; total: number }>();
    for (const c of filas) {
      const actual = porCodigo.get(c.codigo) ?? {
        problema: c.problema,
        severidad: SEVERIDAD_LABEL[c.severidad],
        total: 0,
      };
      actual.total += 1;
      porCodigo.set(c.codigo, actual);
    }

    const hojas: HojaExcel[] = [
      {
        nombre: 'Resumen',
        subtitulo: 'Cuántas empresas tienen cada problema',
        columnas: [
          { header: 'Severidad', key: 'severidad', width: 14 },
          { header: 'Problema', key: 'problema', width: 66, ajustarTexto: true },
          { header: 'Empresas', key: 'total', width: 12, numFmt: '#,##0', align: 'right' },
          { header: 'Código', key: 'codigo', width: 28 },
        ],
        filas: [...porCodigo.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([codigo, r]) => ({
            severidad: r.severidad,
            problema: r.problema,
            total: r.total,
            codigo,
          })),
        total: { total: filas.length },
        totalEtiqueta: 'TOTAL DE PROBLEMAS',
      },
      {
        nombre: 'Detalle',
        subtitulo: `${filas.length} problemas detectados`,
        columnas,
        filas: filas.map(aFilaExcel),
        colorearPorSeveridad: '_severidad',
      },
    ];

    const buffer = await construirExcel(
      this.portada(
        'Auditoría de calidad de datos',
        CATALOGO.calidad_datos.descripcion,
        generadoPor,
        filtros,
        filas.length,
        [
          'Error: el dato guardado no pasaría la validación que el sistema aplica hoy. Muchos de estos ' +
            'perfiles se guardaron antes de que las reglas se endurecieran.',
          'Falta: es un dato opcional que quedó vacío. No impide postular, pero limita el seguimiento.',
          'Revisar: el dato es válido pero conviene que una persona lo mire, por ejemplo un teléfono que ' +
            'figura en varias empresas o un año de fundación muy antiguo.',
          'Hay una fila por problema, así que una misma empresa puede aparecer varias veces.',
        ],
      ),
      hojas,
    );

    return {
      buffer,
      nombreArchivo: this.nombreArchivo('calidad-datos', 'xlsx'),
      mimeType: MIME_EXCEL,
      filasExportadas: filas.length,
    };
  }

  // ============== PDF · POSTULACIONES ==============

  // El PDF de postulaciones es un documento de trabajo: sirve para repasar en
  // una reunion o imprimir antes de llamar. Por eso no repite las diecisiete
  // columnas del Excel, sino las que se leen de un vistazo, y encabeza con lo
  // accionable: cuantas estan a punto de terminar y que campos las traban.
  private async generarPostulacionesPdf(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const filas = await this.repo.getPostulaciones(filtros);

    const enviadas = filas.filter((p) => p.fechaEnvio !== null).length;
    const borradores = filas.filter((p) => p.estado === 'borrador');
    const casiListas = borradores.filter((p) => p.porcentajeCompletado >= 90).length;

    // Que campo traba a mas borradores. Sale de contar las etiquetas que el
    // repositorio ya devuelve concatenadas.
    const traba = new Map<string, number>();
    for (const p of borradores) {
      if (!p.queLeFalta) continue;
      for (const etiqueta of p.queLeFalta.split(' | ')) {
        traba.set(etiqueta, (traba.get(etiqueta) ?? 0) + 1);
      }
    }

    const graficoTrabas = svgBarras({
      items: [...traba.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })),
      titulo: 'Campos obligatorios que faltan en más borradores',
      maximoItems: 10,
      sufijo: 'borradores',
      color: COLORES.morado,
    });

    // Distribucion por categoria y estado
    const porCategoria = new Map<string, number>();
    for (const p of filas) {
      porCategoria.set(p.categoria, (porCategoria.get(p.categoria) ?? 0) + 1);
    }
    const graficoCategorias = svgBarras({
      items: [...porCategoria.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })),
      titulo: 'Postulaciones por categoría',
      sufijo: 'postulaciones',
    });

    const columnas: ColumnaPdf[] = [
      { header: 'Empresa', key: 'razonSocial', ancho: 26 },
      { header: 'Categoría', key: 'categoria', ancho: 18 },
      { header: 'Contacto', key: 'contacto', ancho: 16 },
      { header: 'Teléfono', key: 'telefonoContacto', ancho: 10 },
      { header: 'Estado', key: 'estado', ancho: 9 },
      { header: 'Avance', key: 'porcentajeCompletado', tipo: 'porcentaje', ancho: 8 },
      { header: 'Faltan', key: 'camposFaltantes', tipo: 'entero', ancho: 6 },
      { header: 'Última edición', key: 'ultimaEdicion', tipo: 'fecha', ancho: 7 },
    ];

    const filasTabla = filas.map((p) => ({
      razonSocial: p.razonSocial,
      categoria: p.categoria,
      contacto: p.contacto,
      telefonoContacto: p.telefonoContacto,
      estado: etiquetaDeEstado(ESTADO_POSTULACION_LABEL, p.estado),
      porcentajeCompletado: p.porcentajeCompletado,
      camposFaltantes: p.camposFaltantes,
      ultimaEdicion: parseFechaBD(p.ultimaEdicion),
    }));

    // Detalle de lo que le falta a cada borrador que ya esta cerca de terminar:
    // es la lista con la que alguien puede levantar el telefono.
    const cercanas = borradores
      .filter((p) => p.porcentajeCompletado >= 70)
      .map((p) => ({
        razonSocial: p.razonSocial,
        contacto: p.contacto,
        telefonoContacto: p.telefonoContacto,
        porcentajeCompletado: p.porcentajeCompletado,
        queLeFalta: p.queLeFalta,
      }));

    const html = construirPdfReporte({
      cabecera: this.cabeceraPdf('Detalle de postulaciones', generadoPor, filtros,
        `${filas.length} postulaciones, incluidas las que están en borrador`),
      kpis: [
        { etiqueta: 'Postulaciones', valor: pdfNum.entero(filas.length) },
        { etiqueta: 'Enviadas', valor: pdfNum.entero(enviadas) },
        { etiqueta: 'En borrador', valor: pdfNum.entero(borradores.length) },
        { etiqueta: 'A un paso (90% o más)', valor: pdfNum.entero(casiListas) },
      ],
      aviso: {
        titulo: 'Cómo leer este reporte',
        puntos: [
          'La columna "Faltan" cuenta los campos obligatorios que la postulación todavía no tiene llenos. Mientras no llegue a cero, no se puede enviar.',
          'Las postulaciones en borrador no son visibles para el jurado: solo cuentan las enviadas.',
        ],
      },
      secciones: [
        ...(graficoCategorias ? [{ html: graficoCategorias }] : []),
        ...(graficoTrabas
          ? [{ titulo: 'Dónde se traban las postulaciones', html: graficoTrabas }]
          : []),
        {
          titulo: 'Listado completo',
          html: tablaHtml(columnas, filasTabla, {
            vacio: 'No hay postulaciones con estos filtros.',
          }),
        },
        ...(cercanas.length > 0
          ? [
              {
                titulo: 'Borradores con 70% o más: qué le falta a cada uno',
                saltoDePagina: true,
                html: tablaHtml(
                  [
                    { header: 'Empresa', key: 'razonSocial', ancho: 22 },
                    { header: 'Contacto', key: 'contacto', ancho: 16 },
                    { header: 'Teléfono', key: 'telefonoContacto', ancho: 10 },
                    { header: 'Avance', key: 'porcentajeCompletado', tipo: 'porcentaje', ancho: 8 },
                    { header: 'Le falta', key: 'queLeFalta', ancho: 44 },
                  ],
                  cercanas,
                ),
              },
            ]
          : []),
      ],
    });

    const buffer = await this.pdf.render(html, { horizontal: true });
    return {
      buffer,
      nombreArchivo: this.nombreArchivo('postulaciones', 'pdf'),
      mimeType: MIME_PDF,
      filasExportadas: filas.length,
    };
  }

  // ============== PDF · CONTACTOS ==============

  // El PDF de contactos NO es el listado completo del Excel: es una hoja de
  // llamadas. Va en horizontal, separada por etapa del embudo y solo con las
  // columnas que sirven para levantar el telefono. Quien quiera filtrar y
  // ordenar usa el Excel; quien va a llamar imprime esto.
  private async generarContactosPdf(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const filas = await this.repo.getContactos(filtros);

    const columnas: ColumnaPdf[] = [
      { header: 'Nombre', key: 'nombre', ancho: 20 },
      { header: 'Teléfono', key: 'telefono', ancho: 12 },
      { header: 'Correo electrónico', key: 'email', ancho: 24 },
      { header: 'Empresa', key: 'razonSocial', ancho: 22 },
      { header: 'Departamento', key: 'departamento', ancho: 12 },
      { header: 'Avance', key: 'mejorAvance', tipo: 'porcentaje', ancho: 10 },
    ];

    const aFila = (c: FilaContacto) => ({
      nombre: c.nombre,
      // en una hoja para llamar se muestra UN telefono, el mejor disponible.
      // El Excel conserva los tres por separado para cuando difieren.
      telefono: c.telefonoContacto ?? c.telefonoEmpresa ?? c.telefonoPostulacion,
      email: c.email,
      razonSocial: c.razonSocial,
      departamento: etiquetaDeOpcion(OPCIONES_DEPARTAMENTO, c.departamento),
      mejorAvance: c.mejorAvance,
    });

    const secciones: { titulo?: string; html: string; saltoDePagina?: boolean }[] = [];
    let primera = true;

    // Orden inverso al del embudo: primero quienes están más cerca de terminar,
    // que son a quienes conviene llamar antes.
    for (const etapa of [...etapaEmbudoValues].reverse()) {
      const deEsaEtapa = filas.filter((c) => c.etapa === etapa);
      if (deEsaEtapa.length === 0) continue;

      secciones.push({
        titulo: `${ETAPA_EMBUDO_LABEL[etapa as EtapaEmbudo]} · ${deEsaEtapa.length} personas`,
        saltoDePagina: !primera,
        html:
          tablaHtml(columnas, deEsaEtapa.map(aFila)) +
          `<p class="nota">${escaparHtmlPdf(this.notaDeEtapa(etapa as EtapaEmbudo, deEsaEtapa.length))}</p>`,
      });
      primera = false;
    }

    const conTelefono = filas.filter(
      (c) => c.telefonoContacto ?? c.telefonoEmpresa ?? c.telefonoPostulacion,
    ).length;

    const html = construirPdfReporte({
      cabecera: this.cabeceraPdf('Hoja de llamadas', generadoPor, filtros,
        'Personas registradas, agrupadas por la etapa en la que se quedaron'),
      kpis: [
        { etiqueta: 'Personas', valor: pdfNum.entero(filas.length) },
        { etiqueta: 'Con teléfono', valor: pdfNum.entero(conTelefono) },
        { etiqueta: 'Sin teléfono', valor: pdfNum.entero(filas.length - conTelefono) },
      ],
      aviso: {
        titulo: 'Cómo usar esta hoja',
        puntos: [
          'Las etapas van de la más avanzada a la menos avanzada: conviene empezar por arriba.',
          'Se muestra un solo teléfono por persona, el mejor disponible. La versión en Excel conserva los tres por separado para cuando no coinciden.',
          'Quienes solo se registraron no tienen teléfono: a esas personas hay que escribirles por correo.',
        ],
      },
      secciones,
    });

    const buffer = await this.pdf.render(html, { horizontal: true });
    return {
      buffer,
      nombreArchivo: this.nombreArchivo('hoja-de-llamadas', 'pdf'),
      mimeType: MIME_PDF,
      filasExportadas: filas.length,
    };
  }

  // ============== PDF · RESPUESTAS ==============

  // Una ficha por postulación, no una tabla. Un formulario de setenta preguntas
  // no entra en columnas, pero se lee perfectamente como el formulario impreso
  // que llenaría una persona. Es el formato que necesita quien evalúa.
  private async generarRespuestasPdf(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const [categorias, respuestas] = await Promise.all([
      this.repo.getCategoriasConFormulario(filtros),
      this.repo.getRespuestas(filtros),
    ]);

    const porCategoria = new Map(categorias.map((c) => [c.categoriaId, c]));
    const secciones: { titulo?: string; html: string; saltoDePagina?: boolean }[] = [];
    let primera = true;
    let incluidas = 0;

    for (const r of respuestas) {
      const categoria = porCategoria.get(r.categoriaId);
      if (!categoria) continue;

      // Los campos se agrupan por la sección del formulario, respetando su orden
      const seccionesFicha: SeccionFicha[] = [];
      for (const campo of categoria.campos) {
        const valor = this.valorDeCampo(
          campo,
          r.responseData[campo.fieldId],
          r.archivos[campo.fieldId],
        );
        if (valor === null || valor === undefined || valor === '') continue;

        let seccion = seccionesFicha.find((s) => s.titulo === campo.seccion);
        if (!seccion) {
          seccion = { titulo: campo.seccion || 'Respuestas', campos: [] };
          seccionesFicha.push(seccion);
        }
        seccion.campos.push({
          etiqueta: campo.etiqueta,
          valor: String(valor),
          ancho:
            campo.tipo === 'texto_largo' || campo.tipo === 'tabla' ||
            campo.tipo === 'seleccion_multiple' || campo.tipo === 'archivo'
              ? 'completo'
              : 'medio',
        });
      }

      const claseEstado =
        r.estado === 'borrador' ? 'revisar' : r.estado === 'rechazado' ? 'error' : 'falta';

      secciones.push({
        saltoDePagina: !primera,
        html: fichaHtml({
          titulo: r.razonSocial,
          subtitulo: `${categoria.categoriaNombre} · ${r.email} · Postulación N.º ${r.postulacionId}`,
          etiquetas: [
            { texto: etiquetaDeEstado(ESTADO_POSTULACION_LABEL, r.estado), clase: claseEstado },
            { texto: `${pdfNum.porcentaje(r.porcentajeCompletado)} completado`, clase: 'falta' },
          ],
          secciones: seccionesFicha,
        }),
      });
      primera = false;
      incluidas++;
    }

    const html = construirPdfReporte({
      cabecera: this.cabeceraPdf('Respuestas de las postulaciones', generadoPor, filtros,
        `${incluidas} postulaciones, una ficha por cada una`),
      aviso: {
        titulo: 'Sobre este documento',
        puntos: [
          'Cada postulación ocupa su propia página, con las preguntas agrupadas igual que en el formulario.',
          'Las preguntas sin responder no aparecen: solo se muestra lo que la persona llenó.',
          'Los documentos adjuntos se listan por su nombre; los archivos en sí no van dentro de este PDF.',
          incluidas > 15
            ? `Este documento tiene ${incluidas} fichas. Para imprimir menos, filtra por categoría o por estado.`
            : 'Para incluir solo las postulaciones enviadas, filtra por estado.',
        ],
      },
      secciones,
    });

    const buffer = await this.pdf.render(html);
    return {
      buffer,
      nombreArchivo: this.nombreArchivo('respuestas', 'pdf'),
      mimeType: MIME_PDF,
      filasExportadas: incluidas,
    };
  }

  // ============== PDF · CALIDAD DE DATOS ==============

  private async generarCalidadDatosPdf(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const filas = await this.repo.getCalidadDatos(filtros);

    const porSeveridad = (s: string) => filas.filter((f) => f.severidad === s);
    const errores = porSeveridad('error');
    const revisar = porSeveridad('revisar');
    const faltantes = porSeveridad('falta');

    // Resumen por tipo de problema, para saber por dónde empezar
    const porCodigo = new Map<string, { problema: string; severidad: string; total: number }>();
    for (const f of filas) {
      const actual = porCodigo.get(f.codigo) ?? {
        problema: f.problema,
        severidad: SEVERIDAD_LABEL[f.severidad],
        total: 0,
      };
      actual.total += 1;
      porCodigo.set(f.codigo, actual);
    }

    const graficoProblemas = svgBarras({
      items: [...porCodigo.values()].map((r) => ({ etiqueta: r.problema, valor: r.total })),
      titulo: 'Problemas más frecuentes',
      maximoItems: 10,
      sufijo: 'empresas',
      color: COLORES.morado,
    });

    const columnas: ColumnaPdf[] = [
      { header: 'Empresa', key: 'razonSocial', ancho: 26 },
      { header: 'Correo electrónico', key: 'emailUsuario', ancho: 22 },
      { header: 'Teléfono', key: 'telefonoContacto', ancho: 11 },
      { header: 'Problema', key: 'problema', ancho: 30 },
      { header: 'Valor actual', key: 'valorActual', ancho: 11 },
    ];

    const aFila = (f: FilaCalidad) => ({
      razonSocial: f.razonSocial,
      emailUsuario: f.emailUsuario,
      telefonoContacto: f.telefonoContacto,
      problema: f.problema,
      valorActual: f.valorActual,
      _severidad: f.severidad,
    });

    const secciones: { titulo?: string; html: string; saltoDePagina?: boolean }[] = [];

    if (graficoProblemas) secciones.push({ html: graficoProblemas });

    secciones.push({
      titulo: 'Resumen por tipo de problema',
      html: tablaHtml(
        [
          { header: 'Severidad', key: 'severidad', ancho: 12 },
          { header: 'Problema', key: 'problema', ancho: 66 },
          { header: 'Empresas', key: 'total', tipo: 'entero', ancho: 22 },
        ],
        [...porCodigo.values()].sort((a, b) => b.total - a.total),
        { total: { total: filas.length }, etiquetaTotal: 'TOTAL DE PROBLEMAS' },
      ),
    });

    const bloques: [string, FilaCalidad[], string][] = [
      ['Errores: el dato no pasaría la validación actual', errores, 'error'],
      ['A revisar: el dato es válido pero conviene mirarlo', revisar, 'revisar'],
      ['Datos ausentes: opcionales que quedaron vacíos', faltantes, 'falta'],
    ];

    for (const [titulo, grupo] of bloques) {
      if (grupo.length === 0) continue;
      secciones.push({
        titulo: `${titulo} · ${grupo.length}`,
        saltoDePagina: true,
        html: tablaHtml(columnas, grupo.map(aFila), { severidadEn: '_severidad' }),
      });
    }

    const html = construirPdfReporte({
      cabecera: this.cabeceraPdf('Auditoría de calidad de datos', generadoPor, filtros,
        `${filas.length} problemas detectados en los perfiles de empresa`),
      kpis: [
        { etiqueta: 'Total de problemas', valor: pdfNum.entero(filas.length) },
        { etiqueta: 'Errores', valor: pdfNum.entero(errores.length) },
        { etiqueta: 'A revisar', valor: pdfNum.entero(revisar.length) },
        { etiqueta: 'Datos ausentes', valor: pdfNum.entero(faltantes.length) },
      ],
      aviso: {
        titulo: 'Qué significa cada severidad',
        puntos: [
          'Error: el dato guardado no pasaría la validación que el sistema aplica hoy. Muchos perfiles se guardaron antes de que las reglas se endurecieran.',
          'A revisar: el dato es válido pero conviene que una persona lo mire, por ejemplo un teléfono que figura en varias empresas.',
          'Falta: es un dato opcional que quedó vacío. No impide postular, pero limita el seguimiento.',
          'Una misma empresa puede aparecer varias veces, una por cada problema.',
        ],
      },
      secciones,
    });

    const buffer = await this.pdf.render(html, { horizontal: true });
    return {
      buffer,
      nombreArchivo: this.nombreArchivo('calidad-datos', 'pdf'),
      mimeType: MIME_PDF,
      filasExportadas: filas.length,
    };
  }

  // ============== PDF · ECOSISTEMA ==============

  // Este es el reporte que se le entrega a las organizaciones que financian el
  // programa, asi que va con la identidad de la marca y con los graficos que
  // resumen la participacion.
  private async generarEcosistemaPdf(
    filtros: ReporteQueryDto,
    generadoPor: string,
  ): Promise<ArchivoReporte> {
    const [resumen, dimensiones, embudo] = await Promise.all([
      this.repo.getResumenEcosistema(),
      this.repo.getDimensiones(),
      this.repo.getEmbudo(),
    ]);

    const totalEmpleados = resumen.empleadasMujeres + resumen.empleadosHombres;
    const pctMujeres =
      totalEmpleados > 0 ? (resumen.empleadasMujeres / totalEmpleados) * 100 : 0;

    const graficoEmbudo = svgEmbudo({
      items: etapaEmbudoValues
        .map((etapa) => embudo.find((e) => e.etapa === etapa))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .map((e) => ({ etiqueta: ETAPA_EMBUDO_LABEL[e.etapa], valor: e.personas })),
      titulo: 'Hasta dónde llegó cada persona registrada',
    });

    const anilloEmpleo = svgAnillo({
      partes: [
        { etiqueta: 'Mujeres', valor: resumen.empleadasMujeres, color: COLORES.morado },
        { etiqueta: 'Hombres', valor: resumen.empleadosHombres, color: COLORES.navy },
      ],
      titulo: 'Personas empleadas por las empresas',
    });

    const secciones: { titulo?: string; html: string; saltoDePagina?: boolean }[] = [];

    if (graficoEmbudo) {
      secciones.push({ titulo: 'Embudo de participación', html: graficoEmbudo });
    }

    // Una seccion por dimension, con su grafico y su tabla
    for (const dimension of DIMENSIONES) {
      const suyas = dimensiones.filter((d) => d.dimension === dimension.clave);
      if (suyas.length === 0) continue;
      const total = suyas.reduce((a, d) => a + d.total, 0);

      const items = suyas.map((d) => ({
        etiqueta: d.valor === '' ? 'Sin dato' : etiquetaDeOpcion(dimension.opciones, d.valor),
        valor: d.total,
      }));

      const grafico = svgBarras({
        items,
        sufijo: 'empresas',
        color: dimension.color,
      });

      const tabla = tablaHtml(
        [
          { header: dimension.nombre, key: 'etiqueta', ancho: 55 },
          { header: 'Empresas', key: 'valor', tipo: 'entero', ancho: 20 },
          { header: 'Porcentaje', key: 'porcentaje', tipo: 'porcentaje', ancho: 25 },
        ],
        items.map((i) => ({
          ...i,
          porcentaje: total > 0 ? (i.valor / total) * 100 : 0,
        })),
        { total: { valor: total }, etiquetaTotal: 'TOTAL' },
      );

      secciones.push({
        titulo: `Empresas por ${dimension.nombre.toLowerCase()}`,
        html: grafico ? `${grafico}${tabla}` : tabla,
      });
    }

    if (anilloEmpleo) {
      secciones.push({
        titulo: 'Empleo e inclusión',
        saltoDePagina: true,
        html:
          anilloEmpleo +
          `<p class="nota">De las ${pdfNum.entero(resumen.empresas)} empresas registradas, ` +
          `${pdfNum.entero(resumen.empresasConAmbasCifras)} declararon cuántas mujeres y cuántos hombres emplean. ` +
          `Entre ellas, ${pdfNum.entero(resumen.empresasMayoriaMujeres)} tienen mayoría de mujeres en su planilla. ` +
          'El indicador se calcula solo sobre las que declararon ambas cifras: contar como mayoría femenina a una ' +
          'empresa que no declaró cuántos hombres emplea inflaría el resultado.</p>',
      });
    }

    const html = construirPdfReporte({
      cabecera: this.cabeceraPdf('Perfil del ecosistema', generadoPor, filtros,
        'Caracterización de las empresas registradas en el programa'),
      kpis: [
        { etiqueta: 'Empresas registradas', valor: pdfNum.entero(resumen.empresas) },
        { etiqueta: 'Personas postulantes', valor: pdfNum.entero(resumen.proponentes) },
        { etiqueta: 'Postulaciones enviadas', valor: pdfNum.entero(resumen.enviadas) },
        { etiqueta: 'Empleo femenino', valor: pdfNum.porcentaje(pctMujeres) },
      ],
      secciones,
    });

    const buffer = await this.pdf.render(html);
    return {
      buffer,
      nombreArchivo: this.nombreArchivo('ecosistema', 'pdf'),
      mimeType: MIME_PDF,
      filasExportadas: resumen.empresas,
    };
  }

  // ============== HELPERS ==============

  private cabeceraPdf(
    titulo: string,
    generadoPor: string,
    filtros: ReporteQueryDto,
    subtitulo?: string,
  ): CabeceraPdf {
    const legibles = this.filtrosLegibles(filtros);
    const descripcion = Object.entries(legibles)
      .map(([clave, valor]) => `${clave}: ${String(valor)}`)
      .join(' · ');
    return {
      titulo,
      subtitulo,
      generadoPor,
      generadoEn: new Date(),
      filtros: descripcion || undefined,
    };
  }

  private portada(
    titulo: string,
    descripcion: string,
    generadoPor: string,
    filtros: ReporteQueryDto,
    totalFilas: number,
    advertencias: string[],
  ): DatosPortada {
    return {
      titulo,
      descripcion,
      generadoPor,
      generadoEn: new Date(),
      filtros: this.filtrosLegibles(filtros),
      totalFilas,
      advertencias,
    };
  }

  // Traduce los filtros aplicados a algo que se entienda en la portada. Sin
  // esto, quien recibe el archivo no sabe si tiene todo o un recorte.
  private filtrosLegibles(filtros: ReporteQueryDto): Record<string, unknown> {
    const legibles: Record<string, unknown> = {};
    if (filtros.convocatoriaId !== undefined) legibles['Convocatoria'] = filtros.convocatoriaId;
    if (filtros.categoriaId !== undefined) legibles['Categoría'] = filtros.categoriaId;
    if (filtros.departamento !== undefined) {
      legibles['Departamento'] = etiquetaDeOpcion(OPCIONES_DEPARTAMENTO, filtros.departamento);
    }
    if (filtros.etapa !== undefined) legibles['Etapa'] = ETAPA_EMBUDO_LABEL[filtros.etapa];
    if (filtros.estado !== undefined) {
      legibles['Estado'] = etiquetaDeEstado(ESTADO_POSTULACION_LABEL, filtros.estado);
    }
    if (filtros.desde !== undefined) legibles['Desde'] = filtros.desde;
    if (filtros.hasta !== undefined) legibles['Hasta'] = filtros.hasta;
    return legibles;
  }

  // Nombre con fecha y hora para que dos descargas del mismo reporte no se
  // pisen en la carpeta de descargas
  // Nombre con fecha y hora DE BOLIVIA, no en horario universal. Con
  // toISOString el archivo salia marcado cuatro horas adelantado y se
  // contradecia con la fecha que muestra su propia portada.
  private nombreArchivo(tipo: string, extension: string): string {
    const partes = new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const dato = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((p) => p.type === tipo)?.value ?? '00';

    const marca = `${dato('year')}-${dato('month')}-${dato('day')}-${dato('hour')}${dato('minute')}`;
    return `superstar-${tipo}-${marca}.${extension}`;
  }
}

const MIME_EXCEL =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MIME_PDF = 'application/pdf';

const SEVERIDAD_LABEL: Record<string, string> = {
  error: 'Error',
  falta: 'Falta',
  revisar: 'Revisar',
};

// Dimensiones del perfil del ecosistema, con el arreglo de opciones que traduce
// cada slug a su etiqueta visible
const DIMENSIONES = [
  { clave: 'departamento', nombre: 'Departamento', opciones: OPCIONES_DEPARTAMENTO, color: COLORES.navy },
  { clave: 'rubro', nombre: 'Rubro', opciones: OPCIONES_RUBRO, color: COLORES.teal },
  { clave: 'tipo_empresa', nombre: 'Tipo de empresa', opciones: OPCIONES_TIPO_EMPRESA, color: COLORES.morado },
  { clave: 'genero_contacto', nombre: 'Género del contacto', opciones: OPCIONES_GENERO, color: COLORES.verde },
  { clave: 'numero_socios', nombre: 'Número de socios', opciones: OPCIONES_NUMERO_SOCIOS, color: COLORES.azul },
] as const;
