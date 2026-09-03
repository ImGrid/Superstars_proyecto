import type { EtapaEmbudo } from '@superstars/shared';

// Filas que devuelve ReporteRepository. Viven aqui y no en packages/shared
// porque NUNCA viajan al frontend: se convierten en celdas de un Excel o en
// filas de una tabla del PDF dentro del propio backend. Lo unico que el
// frontend consume del modulo es el catalogo (ReporteCatalogoItem).
//
// Todos los campos de texto son `string | null` a proposito: la base tiene
// muchos datos opcionales y el reporte tiene que poder mostrar la celda vacia
// en lugar de inventar un valor.

// --- R1 contactos: una fila por persona ---

export interface FilaContacto {
  usuarioId: number;
  nombre: string;
  email: string;
  etapa: EtapaEmbudo;
  // los tres telefonos van separados y no colapsados: si difieren, el equipo
  // que llama necesita ver cual es cual
  telefonoContacto: string | null;
  telefonoEmpresa: string | null;
  telefonoPostulacion: string | null;
  cargo: string | null;
  razonSocial: string | null;
  // slug (la_paz); la traduccion a etiqueta la hace el servicio
  departamento: string | null;
  ciudad: string | null;
  // categorias a las que postulo, separadas por "; "
  categorias: string | null;
  postulaciones: number;
  mejorAvance: number | null;
  ultimoEnvio: string | null;
  fechaRegistro: string;
}

// --- R3 postulaciones: una fila por postulacion ---

export interface FilaPostulacion {
  postulacionId: number;
  convocatoria: string;
  categoria: string;
  razonSocial: string;
  contacto: string;
  email: string;
  telefonoContacto: string | null;
  departamento: string | null;
  estado: string;
  porcentajeCompletado: number;
  camposFaltantes: number;
  // etiquetas de los campos obligatorios sin llenar, separadas por " | "
  queLeFalta: string | null;
  archivos: number;
  bytesArchivos: number;
  iniciada: string;
  ultimaEdicion: string;
  fechaEnvio: string | null;
}

// --- R4 respuestas: el formulario de una categoria y sus respuestas ---

// Opcion de un campo de seleccion: la base guarda el slug y el reporte tiene
// que escribir la etiqueta
export interface OpcionCampo {
  valor: string;
  label: string;
}

// Columna de un campo de tipo tabla (por ejemplo la evolucion financiera)
export interface ColumnaCampoTabla {
  id: string;
  titulo: string;
}

// Un campo de dato del formulario, ya aplanado y en orden de aparicion
export interface CampoFormulario {
  fieldId: string;
  etiqueta: string;
  tipo: string;
  seccion: string;
  requerido: boolean;
  // presentes solo en los campos de seleccion
  opciones: OpcionCampo[];
  // presentes solo en los campos de tipo tabla
  columnas: ColumnaCampoTabla[];
}

export interface CategoriaConFormulario {
  categoriaId: number;
  categoriaNombre: string;
  campos: CampoFormulario[];
}

export interface FilaRespuesta {
  postulacionId: number;
  categoriaId: number;
  razonSocial: string;
  email: string;
  estado: string;
  porcentajeCompletado: number;
  fechaEnvio: string | null;
  responseData: Record<string, unknown>;
  // nombre original de cada archivo subido, por field_id
  archivos: Record<string, string[]>;
}

// --- R5 ecosistema: agregados ---

export interface ResumenEcosistema {
  empresas: number;
  proponentes: number;
  postulaciones: number;
  enviadas: number;
  empleadasMujeres: number;
  empleadosHombres: number;
  // solo empresas que declararon AMBAS cifras: con coalesce a 0 se contarian
  // como "mayoria de mujeres" empresas que simplemente no declararon hombres
  empresasMayoriaMujeres: number;
  empresasConAmbasCifras: number;
  anioFundacionPromedio: number | null;
}

export interface FilaDimension {
  dimension: string;
  valor: string;
  total: number;
}

export interface FilaEmbudo {
  etapa: EtapaEmbudo;
  personas: number;
  conTelefono: number;
}

// --- R9 calidad de datos: una fila por problema ---

// error:   el dato guardado NO pasaria la validacion que el sistema aplica hoy
// falta:   dato opcional ausente, no es un error pero limita el seguimiento
// revisar: pasa la validacion pero conviene que una persona lo mire
export type SeveridadProblema = 'error' | 'falta' | 'revisar';

export interface FilaCalidad {
  empresaId: number;
  razonSocial: string;
  emailUsuario: string;
  telefonoContacto: string | null;
  departamento: string | null;
  severidad: SeveridadProblema;
  codigo: string;
  problema: string;
  valorActual: string | null;
}

// --- Conteos para el catalogo ---

export interface ConteosCatalogo {
  contactos: number;
  postulaciones: number;
  respuestas: number;
  ecosistema: number;
  calidadDatos: number;
}
