// Opciones compartidas para campos de seleccion de empresa
// Usadas en: formulario "Mi Empresa" y template del formulario dinamico
// Formato: { valor (slug para BD), label (texto visible al usuario) }

export const OPCIONES_TIPO_EMPRESA = [
  { valor: 'unipersonal', label: 'Unipersonal' },
  { valor: 'srl_ltda', label: 'SRL o LTDA' },
  { valor: 'sa', label: 'S.A.' },
  { valor: 'otra', label: 'Otra' },
] as const;

export const OPCIONES_NUMERO_SOCIOS = [
  { valor: '1', label: '1' },
  { valor: '2', label: '2' },
  { valor: '3', label: '3' },
  { valor: 'mas_de_tres', label: 'Más de tres' },
] as const;

export const OPCIONES_RUBRO = [
  { valor: 'industria', label: 'Industria' },
  { valor: 'servicios', label: 'Servicios' },
  { valor: 'comercio', label: 'Comercio' },
  { valor: 'otro', label: 'Otro' },
] as const;

export const OPCIONES_DEPARTAMENTO = [
  { valor: 'la_paz', label: 'La Paz' },
  { valor: 'cochabamba', label: 'Cochabamba' },
  { valor: 'santa_cruz', label: 'Santa Cruz' },
  { valor: 'oruro', label: 'Oruro' },
  { valor: 'chuquisaca', label: 'Chuquisaca' },
  { valor: 'beni', label: 'Beni' },
  { valor: 'pando', label: 'Pando' },
  { valor: 'potosi', label: 'Potosí' },
  { valor: 'tarija', label: 'Tarija' },
] as const;

export const OPCIONES_GENERO = [
  { valor: 'masculino', label: 'Masculino' },
  { valor: 'femenino', label: 'Femenino' },
  { valor: 'otro', label: 'Otro' },
] as const;

export const OPCIONES_ETAPA = [
  { valor: 'startup', label: 'Estado Inicial o Temprano (Startup)' },
  { valor: 'crecimiento', label: 'Estado Crecimiento' },
  { valor: 'consolidada', label: 'Estado Madura o Consolidada' },
] as const;

export const OPCIONES_RELACION_COMERCIAL = [
  { valor: 'b2b', label: 'B2B (de negocio a negocio)' },
  { valor: 'b2b2b', label: 'B2B2B (de negocio a negocio y a otros negocios)' },
  { valor: 'b2b2c', label: 'B2B2C (de negocio a negocio y a cliente)' },
  { valor: 'b2b2g', label: 'B2B2G (de negocio a negocio y a gobierno)' },
  { valor: 'b2c', label: 'B2C (de negocio a cliente)' },
  { valor: 'c2c', label: 'C2C (de cliente a cliente)' },
] as const;

export const OPCIONES_UBICACION_CLIENTES = [
  { valor: 'urbanos', label: 'Clientes Urbanos' },
  { valor: 'rurales', label: 'Clientes Rurales' },
  { valor: 'nacionales', label: 'Nacionales' },
  { valor: 'extranjeros', label: 'Extranjeros (Exterior del país)' },
] as const;

export const OPCIONES_TIPO_REGISTROS = [
  { valor: 'ninguno', label: 'Ninguno' },
  { valor: 'solo_financieros', label: 'Solo Financieros' },
  { valor: 'solo_productivos', label: 'Solo Productivos' },
  { valor: 'ambos', label: 'Ambos' },
] as const;

export const OPCIONES_METODO_REGISTROS = [
  { valor: 'manual', label: 'De forma manual (Libros)' },
  { valor: 'digital', label: 'Digital (Excel, Word)' },
  { valor: 'sistemas', label: 'Se tienen sistemas (Contables - Productivos)' },
  { valor: 'ninguno', label: 'Ninguno' },
] as const;
