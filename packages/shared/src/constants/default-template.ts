import type { SchemaDefinition, FormField, Seccion } from '../schemas/formulario.schema';
import {
  OPCIONES_GENERO,
  OPCIONES_TIPO_EMPRESA,
  OPCIONES_NUMERO_SOCIOS,
  OPCIONES_RUBRO,
  OPCIONES_DEPARTAMENTO,
  OPCIONES_ETAPA,
  OPCIONES_RELACION_COMERCIAL,
  OPCIONES_UBICACION_CLIENTES,
  OPCIONES_TIPO_REGISTROS,
  OPCIONES_METODO_REGISTROS,
} from './opciones-empresa';

// IDs estables para secciones y campos de la plantilla
export const TEMPLATE_SECTION_IDS = {
  CONTACTO: 'sec_contacto',
  EMPRESA: 'sec_empresa',
} as const;

// seccion B: datos de la persona de contacto (6 campos)
const camposContacto: FormField[] = [
  {
    id: 'contacto_nombre',
    tipo: 'texto_corto',
    etiqueta: 'Nombre de la persona que realiza la postulacion',
    requerido: true,
    orden: 1,
    fijo: true,

    autoRelleno: { tabla: 'usuario', campo: 'nombre' },
  },
  {
    id: 'contacto_cargo',
    tipo: 'texto_corto',
    etiqueta: 'Puesto/cargo en la empresa',
    requerido: true,
    orden: 2,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'contactoCargo' },
  },
  {
    id: 'contacto_telefono',
    tipo: 'texto_corto',
    etiqueta: 'Numero de contacto',
    requerido: true,
    orden: 3,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'contactoTelefono' },
  },
  {
    id: 'contacto_genero',
    tipo: 'seleccion_unica',
    etiqueta: 'Genero',
    requerido: true,
    orden: 4,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'contactoGenero' },
    opciones: [...OPCIONES_GENERO],
    permiteOtra: false,
    display: 'dropdown',
  },
  {
    id: 'contacto_edad',
    tipo: 'numerico',
    etiqueta: 'Edad',
    requerido: true,
    orden: 5,
    fijo: true,

    min: 1,
  },
  {
    id: 'contacto_email',
    tipo: 'texto_corto',
    etiqueta: 'Direccion de correo electronico',
    requerido: true,
    orden: 6,
    fijo: true,

    autoRelleno: { tabla: 'usuario', campo: 'email' },
  },
];

// seccion C: datos de la empresa (26 campos)
const camposEmpresa: FormField[] = [
  {
    id: 'empresa_razon_social',
    tipo: 'texto_corto',
    etiqueta: 'Nombre de la empresa (razon social)',
    requerido: true,
    orden: 1,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'razonSocial' },
  },
  {
    id: 'empresa_tipo',
    tipo: 'seleccion_unica',
    etiqueta: 'Tipo de empresa',
    requerido: true,
    orden: 2,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'tipoEmpresa' },
    opciones: OPCIONES_TIPO_EMPRESA.filter(o => o.valor !== 'otra'),
    permiteOtra: true,
    display: 'dropdown',
  },
  {
    id: 'empresa_socios',
    tipo: 'seleccion_unica',
    etiqueta: 'Cuantos socios tiene la empresa',
    requerido: true,
    orden: 3,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'numeroSocios' },
    opciones: [...OPCIONES_NUMERO_SOCIOS],
    permiteOtra: false,
    display: 'dropdown',
  },
  {
    id: 'empresa_empleadas_mujeres',
    tipo: 'numerico',
    etiqueta: 'Numero de empleadas mujeres',
    descripcion: 'Permanentes y no permanentes',
    requerido: true,
    orden: 4,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'numEmpleadosMujeres' },
    min: 0,
  },
  {
    id: 'empresa_empleados_hombres',
    tipo: 'numerico',
    etiqueta: 'Numero de empleados hombres',
    descripcion: 'Permanentes y no permanentes',
    requerido: true,
    orden: 5,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'numEmpleadosHombres' },
    min: 0,
  },
  {
    id: 'empresa_rubro',
    tipo: 'seleccion_unica',
    etiqueta: 'Rubro o sector de actividad',
    requerido: true,
    orden: 6,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'rubro' },
    opciones: OPCIONES_RUBRO.filter(o => o.valor !== 'otro'),
    permiteOtra: true,
    display: 'dropdown',
  },
  {
    id: 'empresa_anio_fundacion',
    tipo: 'numerico',
    etiqueta: 'Anio de fundacion o creacion de la empresa',
    requerido: true,
    orden: 7,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'anioFundacion' },
    min: 1900,
  },
  {
    id: 'empresa_departamento',
    tipo: 'seleccion_unica',
    etiqueta: 'Departamento donde opera',
    requerido: true,
    orden: 8,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'departamento' },
    opciones: [...OPCIONES_DEPARTAMENTO],
    permiteOtra: false,
    display: 'dropdown',
  },
  {
    id: 'empresa_ciudad',
    tipo: 'texto_corto',
    etiqueta: 'Ciudad donde opera',
    requerido: true,
    orden: 9,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'ciudad' },
  },
  {
    id: 'empresa_direccion',
    tipo: 'texto_corto',
    etiqueta: 'Direccion de la empresa',
    requerido: true,
    orden: 10,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'direccion' },
  },
  {
    id: 'empresa_telefono',
    tipo: 'texto_corto',
    etiqueta: 'Numero de telefono de la empresa',
    requerido: true,
    orden: 11,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'telefono' },
  },
  {
    id: 'empresa_descripcion',
    tipo: 'texto_largo',
    etiqueta: 'Descripcion de la empresa',
    descripcion: 'Explique brevemente a que se dedica su empresa, que necesidad atiende en el mercado y que propuesta innovadora ofrece a traves de su negocio.',
    requerido: true,
    orden: 12,
    fijo: true,

    autoRelleno: { tabla: 'empresa', campo: 'descripcion' },
    maxPalabras: 200,
    filas: 4,
  },
  {
    id: 'empresa_etapa',
    tipo: 'seleccion_unica',
    etiqueta: 'Etapa en la que se encuentra la empresa',
    requerido: true,
    orden: 13,
    fijo: true,

    opciones: [...OPCIONES_ETAPA],
    permiteOtra: false,
    display: 'dropdown',
  },
  {
    id: 'empresa_relacion_comercial',
    tipo: 'seleccion_multiple',
    etiqueta: 'Tipo de relacion comercial con el mercado',
    requerido: true,
    orden: 14,
    fijo: true,

    opciones: [...OPCIONES_RELACION_COMERCIAL],
    permiteOtra: false,
  },
  {
    id: 'empresa_ubicacion_clientes',
    tipo: 'seleccion_multiple',
    etiqueta: 'Ubicacion de los clientes',
    requerido: true,
    orden: 15,
    fijo: true,

    opciones: [...OPCIONES_UBICACION_CLIENTES],
    permiteOtra: false,
  },
  {
    id: 'empresa_departamentos_clientes',
    tipo: 'seleccion_multiple',
    etiqueta: 'Departamentos donde se encuentran sus clientes',
    requerido: true,
    orden: 16,
    fijo: true,

    opciones: [...OPCIONES_DEPARTAMENTO, { valor: 'exterior', label: 'Exterior del pais' }],
    permiteOtra: false,
  },
  {
    id: 'empresa_productos_servicios',
    tipo: 'texto_largo',
    etiqueta: 'Principales productos y/o servicios',
    descripcion: 'Describa sus principales productos y/o servicios.',
    requerido: true,
    orden: 17,
    fijo: true,

    filas: 4,
  },
  {
    id: 'empresa_tipo_registros',
    tipo: 'seleccion_unica',
    etiqueta: 'Registros productivos y financieros',
    descripcion: 'Su empresa cuenta con registros productivos y financieros?',
    requerido: true,
    orden: 18,
    fijo: true,

    opciones: [...OPCIONES_TIPO_REGISTROS],
    permiteOtra: false,
    display: 'dropdown',
  },
  {
    id: 'empresa_metodo_registros',
    tipo: 'seleccion_unica',
    etiqueta: 'Metodo de elaboracion de registros',
    descripcion: 'Como son elaborados sus registros?',
    requerido: true,
    orden: 19,
    fijo: true,

    opciones: [...OPCIONES_METODO_REGISTROS],
    permiteOtra: false,
    display: 'dropdown',
  },
  // redes sociales: 7 campos texto_url individuales
  {
    id: 'empresa_red_web',
    tipo: 'texto_url',
    etiqueta: 'Sitio web',
    requerido: false,
    orden: 20,
    fijo: true,

    placeholder: 'https://www.ejemplo.com',
  },
  {
    id: 'empresa_red_facebook',
    tipo: 'texto_url',
    etiqueta: 'Facebook',
    requerido: false,
    orden: 21,
    fijo: true,

    placeholder: 'https://facebook.com/empresa',
  },
  {
    id: 'empresa_red_twitter',
    tipo: 'texto_url',
    etiqueta: 'Twitter',
    requerido: false,
    orden: 22,
    fijo: true,

    placeholder: 'https://twitter.com/empresa',
  },
  {
    id: 'empresa_red_linkedin',
    tipo: 'texto_url',
    etiqueta: 'LinkedIn',
    requerido: false,
    orden: 23,
    fijo: true,

    placeholder: 'https://linkedin.com/company/empresa',
  },
  {
    id: 'empresa_red_youtube',
    tipo: 'texto_url',
    etiqueta: 'YouTube',
    requerido: false,
    orden: 24,
    fijo: true,

    placeholder: 'https://youtube.com/channel/empresa',
  },
  {
    id: 'empresa_red_tiktok',
    tipo: 'texto_url',
    etiqueta: 'TikTok',
    requerido: false,
    orden: 25,
    fijo: true,

    placeholder: 'https://tiktok.com/@empresa',
  },
  {
    id: 'empresa_red_instagram',
    tipo: 'texto_url',
    etiqueta: 'Instagram',
    requerido: false,
    orden: 26,
    fijo: true,

    placeholder: 'https://instagram.com/empresa',
  },
];

// secciones fijas de la plantilla
const seccionContacto: Seccion = {
  id: TEMPLATE_SECTION_IDS.CONTACTO,
  titulo: 'Datos de la persona de contacto',
  descripcion: 'Informacion de la persona que realiza la postulacion.',
  orden: 1,
  fija: true,
  campos: camposContacto,
};

const seccionEmpresa: Seccion = {
  id: TEMPLATE_SECTION_IDS.EMPRESA,
  titulo: 'Datos de la empresa',
  descripcion: 'Informacion general de la empresa postulante.',
  orden: 2,
  fija: true,
  campos: camposEmpresa,
};

// plantilla por defecto con las 2 secciones fijas (32 campos)
export const DEFAULT_TEMPLATE: SchemaDefinition = {
  secciones: [seccionContacto, seccionEmpresa],
};

