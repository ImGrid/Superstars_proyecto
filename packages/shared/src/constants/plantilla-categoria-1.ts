// Plantilla por defecto — CATEGORIA 1: Empresas de Triple Impacto.
// Fiel al PDF "FORMULARIO DE POSTULACION CATEGORIA 1 EMPRESAS TRIPLE IMPACTO".
// 37 preguntas, secciones A (ambitos) + B, C, D, E. Texto verbatim del PDF.
// Los campos de perfil (B y C) reusan los ids contacto_*/empresa_* con autoRelleno.
import type { SchemaDefinition, FormField, Seccion } from '../schemas/formulario.schema';
import {
  OPCIONES_GENERO,
  OPCIONES_TIPO_EMPRESA,
  OPCIONES_NUMERO_SOCIOS,
  OPCIONES_RUBRO,
  OPCIONES_DEPARTAMENTO,
  OPCIONES_ETAPA,
  OPCIONES_RELACION_COMERCIAL_CAT1,
  OPCIONES_UBICACION_CLIENTES,
  OPCIONES_TIPO_REGISTROS,
  OPCIONES_METODO_REGISTROS,
} from './opciones-empresa';

export const PLANTILLA_CAT1_SECTION_IDS = {
  AMBITOS: 'sec_ambitos',
  CONTACTO: 'sec_contacto',
  EMPRESA: 'sec_empresa',
  PROPUESTA: 'sec_propuesta',
  DOCUMENTOS: 'sec_documentos',
} as const;

// tipo_empresa y rubro quitan su opcion "otra"/"otro" (se maneja con permiteOtra)
const OPCIONES_TIPO_EMPRESA_SIN_OTRA = OPCIONES_TIPO_EMPRESA.filter(o => o.valor !== 'otra');
const OPCIONES_RUBRO_SIN_OTRO = OPCIONES_RUBRO.filter(o => o.valor !== 'otro');

// === SECCION A — Ambitos de Accion Elegibles ===
const camposAmbitos: FormField[] = [
  {
    id: 'info_bienvenida',
    tipo: 'informativo',
    variante: 'parrafo',
    orden: 1,
    fijo: true,
    contenido:
      'Bienvenido al Programa Empresas SUPERSTAR Bolivia 2026. Estimada/o postulante, apreciamos su interés y le invitamos a enviar su postulación al programa SUPERSTAR. Le agradecemos que pueda completar el formulario de una manera breve y clara. Ud. puede ir llenando el formulario, guardarlo y continuar más tarde; recuerde que para ser considerado en el programa el formulario debe estar completo al 100%. La calificación principal estará basada en el proyecto que cada empresa proponga desarrollar en caso de ser seleccionada como una empresa SUPERSTAR. Este proyecto debe demostrar un enfoque claro de triple impacto (económico, social y ambiental) y ser inclusivo, promoviendo la equidad y la participación activa de diversos grupos. Asimismo, el postulante acepta que la evaluación de las propuestas será realizada por un comité independiente, sin vínculos con las instituciones organizadoras del evento, garantizando transparencia y objetividad en el proceso.',
  },
  {
    id: 'info_ambitos_intro',
    tipo: 'informativo',
    variante: 'parrafo',
    orden: 2,
    fijo: true,
    contenido: 'Su empresa actúa en alguno o varios de estos ámbitos:',
  },
  {
    id: 'ambitos_ambiental',
    tipo: 'seleccion_multiple',
    etiqueta: 'Impacto Ambiental',
    requerido: false,
    orden: 3,
    fijo: true,
    opciones: [
      { valor: 'residuos_materia_prima', label: 'La empresa transforma o utiliza residuos como materia prima en su proceso productivo.' },
      { valor: 'reciclaje', label: 'Apoya activamente el reciclaje, la recolección, reutilización, reducción o transformación de materiales y residuos.' },
      { valor: 'cero_residuos', label: 'Implementa prácticas de "cero residuos" en su operación.' },
      { valor: 'cadena_valor', label: 'Integra prácticas ambientales responsables en toda su cadena de valor (proveedores, distribución, logística y otros).' },
    ],
    permiteOtra: false,
  },
  {
    id: 'ambitos_social',
    tipo: 'seleccion_multiple',
    etiqueta: 'Impacto Social',
    requerido: false,
    orden: 4,
    fijo: true,
    opciones: [
      { valor: 'inclusion_genero', label: 'La empresa trabaja con enfoque inclusivo y de género, promoviendo la equidad en el acceso a oportunidades y liderazgo.' },
      { valor: 'comunidades_vulnerables', label: 'Colabora con grupos de base, como recolectoras/es informales, generando ingresos dignos y condiciones laborales justas.' },
      { valor: 'redistribucion_justa', label: 'Redistribuye beneficios de manera equitativa en su cadena de proveeduría, generando empleo y oportunidades en sectores tradicionalmente excluidos.' },
    ],
    permiteOtra: false,
  },
  {
    id: 'ambitos_economico',
    tipo: 'seleccion_multiple',
    etiqueta: 'Impacto Económico',
    requerido: false,
    orden: 5,
    fijo: true,
    opciones: [
      { valor: 'modelo_sostenible', label: 'La empresa demuestra viabilidad económica mientras genera impactos sociales y ambientales positivos (triple impacto).' },
    ],
    permiteOtra: false,
  },
];

// === SECCION B — Datos de la persona que realiza la postulacion (Q1-6) ===
const camposContacto: FormField[] = [
  { id: 'contacto_nombre', tipo: 'texto_corto', etiqueta: 'Nombre de la persona que está realizando el registro', requerido: true, orden: 1, fijo: true, autoRelleno: { tabla: 'usuario', campo: 'nombre' } },
  { id: 'contacto_cargo', tipo: 'texto_corto', etiqueta: 'Puesto/cargo en la empresa', requerido: true, orden: 2, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'contactoCargo' } },
  { id: 'contacto_telefono', tipo: 'texto_corto', etiqueta: 'Número de contacto', requerido: true, orden: 3, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'contactoTelefono' } },
  { id: 'contacto_genero', tipo: 'seleccion_unica', etiqueta: 'Género', requerido: true, orden: 4, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'contactoGenero' }, opciones: [...OPCIONES_GENERO], permiteOtra: false, display: 'dropdown' },
  { id: 'contacto_edad', tipo: 'numerico', etiqueta: 'Edad', requerido: true, orden: 5, fijo: true, min: 1 },
  { id: 'contacto_email', tipo: 'texto_corto', etiqueta: 'Dirección de correo electrónico', requerido: true, orden: 6, fijo: true, autoRelleno: { tabla: 'usuario', campo: 'email' } },
];

// === SECCION C — Datos de la empresa (Q7-29) ===
const camposEmpresa: FormField[] = [
  { id: 'empresa_razon_social', tipo: 'texto_corto', etiqueta: 'Nombre de la empresa (como está registrada jurídicamente)', requerido: true, orden: 1, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'razonSocial' } },
  { id: 'empresa_tipo', tipo: 'seleccion_unica', etiqueta: 'Tipo de Empresa', requerido: true, orden: 2, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'tipoEmpresa' }, opciones: [...OPCIONES_TIPO_EMPRESA_SIN_OTRA], permiteOtra: true, display: 'dropdown' },
  { id: 'empresa_socios', tipo: 'seleccion_unica', etiqueta: 'Cuántos socios tiene la empresa', requerido: true, orden: 3, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'numeroSocios' }, opciones: [...OPCIONES_NUMERO_SOCIOS], permiteOtra: false, display: 'dropdown' },
  { id: 'empresa_empleadas_mujeres', tipo: 'numerico', etiqueta: 'Número de mujeres que trabajan en la empresa', descripcion: 'Permanentes y no permanentes.', requerido: true, orden: 4, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'numEmpleadosMujeres' }, min: 0 },
  { id: 'empresa_empleados_hombres', tipo: 'numerico', etiqueta: 'Número de hombres que trabajan en la empresa', descripcion: 'Permanentes y no permanentes.', requerido: true, orden: 5, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'numEmpleadosHombres' }, min: 0 },
  { id: 'empresa_rubro', tipo: 'seleccion_unica', etiqueta: 'Rubro o sector de actividad', requerido: true, orden: 6, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'rubro' }, opciones: [...OPCIONES_RUBRO_SIN_OTRO], permiteOtra: true, display: 'dropdown' },
  { id: 'empresa_anio_fundacion', tipo: 'numerico', etiqueta: 'Año de fundación o creación de la empresa', requerido: true, orden: 7, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'anioFundacion' }, min: 1900 },
  { id: 'empresa_departamento', tipo: 'seleccion_unica', etiqueta: 'Departamento donde opera', requerido: true, orden: 8, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'departamento' }, opciones: [...OPCIONES_DEPARTAMENTO], permiteOtra: false, display: 'dropdown' },
  { id: 'empresa_ciudad', tipo: 'texto_corto', etiqueta: 'Ciudad donde opera', requerido: true, orden: 9, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'ciudad' } },
  { id: 'empresa_direccion', tipo: 'texto_corto', etiqueta: 'Dirección de la empresa', requerido: true, orden: 10, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'direccion' } },
  { id: 'empresa_telefono', tipo: 'texto_corto', etiqueta: 'Número de teléfono de la empresa', requerido: true, orden: 11, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'telefono' } },
  { id: 'empresa_descripcion', tipo: 'texto_largo', etiqueta: 'Explique brevemente a qué se dedica su empresa, qué necesidad atiende en el mercado y qué propuesta innovadora ofrece a través de su negocio. (Máximo 200 palabras)', requerido: true, orden: 12, fijo: true, autoRelleno: { tabla: 'empresa', campo: 'descripcion' }, maxPalabras: 200, filas: 4 },
  { id: 'empresa_etapa', tipo: 'seleccion_unica', etiqueta: 'Cuál es la etapa en la que se encuentra la empresa', requerido: true, orden: 13, fijo: true, opciones: [...OPCIONES_ETAPA], permiteOtra: false, display: 'radio' },
  { id: 'empresa_relacion_comercial', tipo: 'seleccion_unica', etiqueta: '¿Qué tipo de relación comercial tiene su empresa con el mercado?', requerido: true, orden: 14, fijo: true, opciones: [...OPCIONES_RELACION_COMERCIAL_CAT1], permiteOtra: false, display: 'radio' },
  { id: 'empresa_ubicacion_clientes', tipo: 'seleccion_multiple', etiqueta: '¿Dónde se encuentran ubicados sus clientes?', requerido: true, orden: 15, fijo: true, opciones: [...OPCIONES_UBICACION_CLIENTES], permiteOtra: false },
  { id: 'empresa_productos_servicios', tipo: 'texto_largo', etiqueta: 'Describa sus principales productos y/o servicios.', requerido: true, orden: 16, fijo: true, filas: 4 },
  {
    id: 'info_estrategia', tipo: 'informativo', variante: 'subtitulo', orden: 17, fijo: true,
    contenido: 'Estrategia de Crecimiento',
  },
  { id: 'empresa_crecer_escalar', tipo: 'texto_largo', etiqueta: '¿Cómo puede crecer/escalar la empresa en los siguientes 3 años? (Máximo 150 palabras)', requerido: true, orden: 18, fijo: true, maxPalabras: 150, filas: 4 },
  { id: 'empresa_plan_crecer', tipo: 'texto_largo', etiqueta: '¿Qué está haciendo o planea hacer su empresa para crecer y llegar a más clientes o mercados en los siguientes 3 años? (Máximo 150 palabras)', requerido: true, orden: 19, fijo: true, maxPalabras: 150, filas: 4 },
  { id: 'empresa_tipo_registros', tipo: 'seleccion_unica', etiqueta: 'Su empresa cuenta con registros productivos y financieros', requerido: true, orden: 20, fijo: true, opciones: [...OPCIONES_TIPO_REGISTROS], permiteOtra: false, display: 'radio' },
  { id: 'empresa_metodo_registros', tipo: 'seleccion_unica', etiqueta: 'Sus registros son elaborados:', requerido: true, orden: 21, fijo: true, opciones: [...OPCIONES_METODO_REGISTROS], permiteOtra: false, display: 'radio' },
  {
    id: 'info_evolucion_financiera', tipo: 'informativo', variante: 'nota', orden: 22, fijo: true,
    contenido: 'NOTA: La información que se proporcione sobre el desempeño financiero de su empresa no será compartida fuera de esta postulación. Pedimos esta información solamente para entender adecuadamente la situación actual de su negocio.',
  },
  {
    id: 'empresa_evolucion_financiera', tipo: 'tabla',
    etiqueta: 'Evolución Financiera: por favor proporcione los datos en la siguiente tabla',
    requerido: true, orden: 23, fijo: true,
    columnas: [
      { id: 'gestion', titulo: 'Gestión', tipo: 'texto_corto', requerido: false },
      { id: 'ingresos', titulo: 'Ingresos anuales (Bs.)', tipo: 'numerico', requerido: false },
      { id: 'utilidades', titulo: 'Utilidades o pérdidas (Bs.)', tipo: 'numerico', requerido: false },
    ],
    filasIniciales: 3,
    filasFijas: [
      { key: '2024', label: '2024' },
      { key: '2025', label: '2025' },
      { key: '2026', label: '2026 (proyectado)' },
    ],
    filasDinamicas: false,
  },
  { id: 'empresa_activos', tipo: 'numerico', etiqueta: '¿A cuánto ascienden los activos de la empresa? (Monto en Bs.)', requerido: true, orden: 24, fijo: true, min: 0 },
  { id: 'empresa_costos', tipo: 'texto_largo', etiqueta: '¿Cuáles son los principales costos de su negocio? Detalle', requerido: true, orden: 25, fijo: true, filas: 4 },
  {
    id: 'info_visibilidad', tipo: 'informativo', variante: 'subtitulo', orden: 26, fijo: true,
    contenido: 'Visibilidad de la empresa',
  },
  { id: 'empresa_red_web', tipo: 'texto_url', etiqueta: 'Sitio WEB (indique la URL de la página de la empresa)', requerido: false, orden: 27, fijo: true },
  { id: 'empresa_red_facebook', tipo: 'texto_url', etiqueta: 'Página de Facebook (indique la URL)', requerido: false, orden: 28, fijo: true },
  { id: 'empresa_red_twitter', tipo: 'texto_url', etiqueta: 'Twitter (indique la URL)', requerido: false, orden: 29, fijo: true },
  { id: 'empresa_red_linkedin', tipo: 'texto_url', etiqueta: 'LinkedIn (indique la URL)', requerido: false, orden: 30, fijo: true },
  { id: 'empresa_red_youtube', tipo: 'texto_url', etiqueta: 'YouTube (indique la URL)', requerido: false, orden: 31, fijo: true },
  { id: 'empresa_red_tiktok', tipo: 'texto_url', etiqueta: 'TikTok (indique la URL)', requerido: false, orden: 32, fijo: true },
  { id: 'empresa_red_instagram', tipo: 'texto_url', etiqueta: 'Instagram (indique la URL)', requerido: false, orden: 33, fijo: true },
  { id: 'empresa_tiene_video', tipo: 'si_no', etiqueta: '¿Tiene una presentación o video que le gustaría compartir?', requerido: false, orden: 34, fijo: true, labelSi: 'Sí', labelNo: 'No' },
];

// === SECCION D — Propuesta o Proyecto de Triple Impacto (Q30-34) ===
const camposPropuesta: FormField[] = [
  {
    id: 'info_propuesta_intro', tipo: 'informativo', variante: 'parrafo', orden: 1, fijo: true,
    contenido:
      'Para participar en el programa SUPERSTAR, la empresa debe presentar una propuesta o proyecto específico que forme parte de sus operaciones o planes de crecimiento. Esta propuesta o proyecto debe estar alineado con los principios de triple impacto (económico, social y ambiental). Los ganadores del SUPERSTAR se beneficiarán de un incentivo de Bs. 50.000,00 (Cincuenta mil 00/100 bolivianos) en Inversión y Asistencia Técnica.',
  },
  {
    id: 'info_actividades_elegibles', tipo: 'informativo', variante: 'detalle', orden: 2, fijo: true,
    etiqueta: 'Actividades Elegibles para la propuesta o proyecto',
    contenido:
      '<p>Al desarrollar su propuesta considere los gastos elegibles para su financiamiento de acuerdo al siguiente cuadro:</p>' +
      '<table><thead><tr><th>Actividades subvencionables para la financiación</th><th>Actividades NO subvencionables para la financiación</th></tr></thead><tbody>' +
      '<tr><td>Servicios de desarrollo empresarial (consultores/expertos en escalamiento, ventas, operaciones, inversiones, impacto social).</td><td>Compra y/o alquiler/arrendamiento de terrenos o edificios/instalaciones.</td></tr>' +
      '<tr><td>Escalamiento del impacto (rediseño de procesos, producción, certificaciones).</td><td>Comisiones bancarias y similares, costos de garantías y cargos similares.</td></tr>' +
      '<tr><td>Inversiones (máquinas o equipos necesarios para escalar).</td><td>Costos generales como materiales de oficina, personal de apoyo, administración.</td></tr>' +
      '<tr><td>Costos de desarrollo comercial (probar o lanzar nuevos productos, estudio de mercado).</td><td>Costos legales como registros de propiedad intelectual.</td></tr>' +
      '<tr><td>Costos de visibilidad (diseño de marca, material promocional, ferias comerciales).</td><td></td></tr>' +
      '</tbody></table>',
  },
  {
    id: 'info_propuesta_ejemplo', tipo: 'informativo', variante: 'nota', orden: 3, fijo: true,
    contenido:
      'Ejemplo: La empresa trabaja en su cadena de valor con proveedores recicladores de base ofreciendo precios justos y transformando los residuos sólidos aprovechables que retornan al mercado con mayor valor agregado. Con el proyecto se incrementa en 20% los ingresos de recolectoras a través de acuerdos comerciales entre la empresa y las recolectoras.',
  },
  { id: 'propuesta_descripcion', tipo: 'texto_largo', etiqueta: 'Realice la descripción de su propuesta incluyendo el Impacto Social, ambiental y económico. Identifique las necesidades o desafíos que busca atender su propuesta o proyecto, detalle la forma de hacerlo, indicando objetivos, metas, actividades más relevantes y los resultados esperados. Estas actividades deberían considerarse también en el presupuesto. (Máximo 400 palabras)', requerido: true, orden: 4, fijo: true, maxPalabras: 400, filas: 8 },
  { id: 'propuesta_indicadores', tipo: 'texto_largo', etiqueta: 'Dentro de su propuesta de triple impacto identifique los indicadores de mejora en los ámbitos de medio ambiente, social y económico. Por favor incluya números o porcentajes en su explicación. (Máximo 150 palabras)', requerido: true, orden: 5, fijo: true, maxPalabras: 150, filas: 4 },
  { id: 'propuesta_subvenciones', tipo: 'texto_largo', etiqueta: '¿Qué subvenciones, donaciones o apoyo recibió su empresa en los últimos 2 años o planea recibir en este año (2026)? (Máximo 50 palabras)', requerido: true, orden: 6, fijo: true, maxPalabras: 50, filas: 3 },
  {
    id: 'info_presupuesto', tipo: 'informativo', variante: 'subtitulo', orden: 7, fijo: true,
    contenido: 'Presupuesto del Proyecto',
  },
  { id: 'propuesta_monto', tipo: 'numerico', etiqueta: '¿Cuál es el monto total del proyecto propuesto? (en Bs.)', requerido: true, orden: 8, fijo: true, min: 0 },
  {
    id: 'propuesta_presupuesto_archivo', tipo: 'archivo',
    etiqueta: 'Descargue el Formato de Presupuesto en bolivianos, y una vez lleno súbalo aquí.',
    requerido: true, orden: 9, fijo: true,
    tiposPermitidos: ['.xlsx', '.xls'], maxTamanoMb: 10, maxArchivos: 1,
  },
  { id: 'propuesta_contribucion', tipo: 'numerico', etiqueta: '¿Cuál es el monto de contribución de su empresa? (La subvención solicitada requiere una contribución en especie o en efectivo)', requerido: true, orden: 10, fijo: true, min: 0 },
];

// === SECCION E — Documentos de respaldo y cierre (Q35-37) ===
const camposDocumentos: FormField[] = [
  {
    id: 'info_documentos_intro', tipo: 'informativo', variante: 'parrafo', orden: 1, fijo: true,
    contenido: 'Adjunte los siguientes documentos de respaldo (Archivos en .PDF).',
  },
  { id: 'doc_organigrama', tipo: 'archivo', etiqueta: 'Organigrama de la empresa', requerido: true, orden: 2, fijo: true, tiposPermitidos: ['.pdf'], maxTamanoMb: 10, maxArchivos: 1 },
  { id: 'doc_cvs', tipo: 'archivo', etiqueta: 'CVs del personal relevante', requerido: true, orden: 3, fijo: true, tiposPermitidos: ['.pdf'], maxTamanoMb: 10, maxArchivos: 3 },
  { id: 'doc_matricula', tipo: 'archivo', etiqueta: 'Matrícula de Comercio', requerido: true, orden: 4, fijo: true, tiposPermitidos: ['.pdf'], maxTamanoMb: 10, maxArchivos: 1 },
  { id: 'comentario_adicional', tipo: 'texto_largo', etiqueta: 'Si desea añadir algún comentario que considere relevante en el marco del presente programa puede hacerlo en esta sección.', requerido: false, orden: 5, fijo: true, filas: 4 },
  { id: 'consentimiento', tipo: 'si_no', etiqueta: 'Consentimiento: por la presente confirmo que OXFAM y FUNDES pueden ponerse en contacto conmigo si tienen preguntas sobre las respuestas proporcionadas en este formulario de solicitud.', requerido: true, orden: 6, fijo: true, labelSi: 'Sí', labelNo: 'No' },
];

const secciones: Seccion[] = [
  { id: PLANTILLA_CAT1_SECTION_IDS.AMBITOS, titulo: 'Ámbitos de Acción Elegibles', descripcion: 'Indique en qué ámbitos de acción actúa su empresa.', orden: 1, fija: true, campos: camposAmbitos },
  { id: PLANTILLA_CAT1_SECTION_IDS.CONTACTO, titulo: 'Datos de la persona que realiza la postulación', orden: 2, fija: true, campos: camposContacto },
  { id: PLANTILLA_CAT1_SECTION_IDS.EMPRESA, titulo: 'Datos de la empresa', orden: 3, fija: true, campos: camposEmpresa },
  { id: PLANTILLA_CAT1_SECTION_IDS.PROPUESTA, titulo: 'Propuesta o Proyecto de Triple Impacto', orden: 4, fija: true, campos: camposPropuesta },
  { id: PLANTILLA_CAT1_SECTION_IDS.DOCUMENTOS, titulo: 'Documentos de respaldo', orden: 5, fija: true, campos: camposDocumentos },
];

export const PLANTILLA_CATEGORIA_1: SchemaDefinition = { secciones };
