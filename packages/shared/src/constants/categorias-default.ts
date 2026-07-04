// Categorias por defecto que se auto-crean al crear una convocatoria (SB-6).
// Cada una trae su plantilla de formulario fiel al PDF. El responsable puede
// editar montos, nombres y ganadores despues; esto es solo la semilla inicial.
import type { SchemaDefinition } from '../schemas/formulario.schema';
import { PLANTILLA_CATEGORIA_1 } from './plantilla-categoria-1';
import { PLANTILLA_CATEGORIA_2 } from './plantilla-categoria-2';

export interface CategoriaDefault {
  nombre: string;
  monto: string;
  numeroGanadores: number;
  topNSistema: number;
  orden: number;
  formularioNombre: string;
  schemaDefinition: SchemaDefinition;
}

export const CATEGORIAS_DEFAULT: CategoriaDefault[] = [
  {
    nombre: 'Empresas de Triple Impacto',
    monto: '50000',
    numeroGanadores: 3,
    topNSistema: 10,
    orden: 1,
    formularioNombre: 'Formulario de Postulación — Empresas de Triple Impacto',
    schemaDefinition: PLANTILLA_CATEGORIA_1,
  },
  {
    nombre: 'Emprendimientos de Agricultura Sostenible',
    monto: '35000',
    numeroGanadores: 3,
    topNSistema: 10,
    orden: 2,
    formularioNombre: 'Formulario de Postulación — Agricultura Sostenible',
    schemaDefinition: PLANTILLA_CATEGORIA_2,
  },
];
