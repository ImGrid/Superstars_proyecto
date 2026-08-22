import { Injectable, Inject } from '@nestjs/common';
import { and, asc, desc, eq, ne, sql, count } from 'drizzle-orm';
import {
  convocatoria,
  categoriaConvocatoria,
  documentoCategoria,
  formularioDinamico,
  rubrica,
  criterio,
  subCriterio,
  nivelEvaluacion,
  postulacion,
  empresa,
} from '@superstars/db';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';

// Repositorio del rol observador (solo lectura).
//
// REGLA DEL MODULO: cada consulta lista sus columnas A MANO. Nunca select() sin
// proyeccion, nunca getTableColumns(), nunca reusar una consulta de admin. Si
// manana alguien agrega una columna sensible a una de estas tablas, NO se filtra
// al observador porque nadie la agrego aca. Falla cerrado por construccion.
//
// Lo que este repositorio NO debe exponer jamas (contrato acordado con el cliente):
//   * calificaciones individuales del jurado (solo el puntaje final consolidado)
//   * archivo_postulacion (los adjuntos que suben las empresas)
//   * documentos con proposito 'jurado'
//   * datos de empresa mas alla de la razon social
@Injectable()
export class ObservadorRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // --- Convocatorias ---

  // El observador ve todas las convocatorias, en cualquier estado (incluido
  // borrador): el cliente lo pidio explicitamente.
  async findConvocatorias() {
    return this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        descripcion: convocatoria.descripcion,
        estado: convocatoria.estado,
        fechaInicioPostulacion: convocatoria.fechaInicioPostulacion,
        fechaCierrePostulacion: convocatoria.fechaCierrePostulacion,
        fechaAnuncioGanadores: convocatoria.fechaAnuncioGanadores,
        fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
        departamentos: convocatoria.departamentos,
        // se expone si hay imagen, no la clave de almacenamiento
        tieneImagen: sql<boolean>`(convocatoria.imagen_key is not null)`,
        numCategorias: sql<number>`(select count(*)::int from categoria_convocatoria cc where cc.convocatoria_id = convocatoria.id)`,
        numPostulaciones: sql<number>`(select count(*)::int from postulacion po where po.convocatoria_id = convocatoria.id)`,
        createdAt: convocatoria.createdAt,
      })
      .from(convocatoria)
      .orderBy(desc(convocatoria.createdAt));
  }

  async findConvocatoriaById(convocatoriaId: number) {
    const rows = await this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        descripcion: convocatoria.descripcion,
        estado: convocatoria.estado,
        fechaInicioPostulacion: convocatoria.fechaInicioPostulacion,
        fechaCierrePostulacion: convocatoria.fechaCierrePostulacion,
        fechaCierreEfectiva: convocatoria.fechaCierreEfectiva,
        fechaAnuncioGanadores: convocatoria.fechaAnuncioGanadores,
        fechaPublicacionResultados: convocatoria.fechaPublicacionResultados,
        departamentos: convocatoria.departamentos,
        tieneImagen: sql<boolean>`(convocatoria.imagen_key is not null)`,
        createdAt: convocatoria.createdAt,
        updatedAt: convocatoria.updatedAt,
      })
      .from(convocatoria)
      .where(eq(convocatoria.id, convocatoriaId))
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Categorias ---

  // Sin conteos de jurado: el observador no ve nada del jurado, ni su volumen.
  // Correlacion escrita como literal calificado (no interpolando la columna)
  // porque en posicion SELECT Drizzle la renderiza sin calificar y da ambiguedad.
  async findCategorias(convocatoriaId: number) {
    return this.db
      .select({
        id: categoriaConvocatoria.id,
        convocatoriaId: categoriaConvocatoria.convocatoriaId,
        nombre: categoriaConvocatoria.nombre,
        descripcion: categoriaConvocatoria.descripcion,
        bases: categoriaConvocatoria.bases,
        monto: categoriaConvocatoria.monto,
        numeroGanadores: categoriaConvocatoria.numeroGanadores,
        orden: categoriaConvocatoria.orden,
        fechaSeleccionGanadores: categoriaConvocatoria.fechaSeleccionGanadores,
        tieneFormulario: sql<boolean>`(select count(*) > 0 from formulario_dinamico fd where fd.categoria_id = categoria_convocatoria.id)`,
        tieneRubrica: sql<boolean>`(select count(*) > 0 from rubrica ru where ru.categoria_id = categoria_convocatoria.id)`,
        numPostulaciones: sql<number>`(select count(*)::int from postulacion po where po.categoria_id = categoria_convocatoria.id)`,
      })
      .from(categoriaConvocatoria)
      .where(eq(categoriaConvocatoria.convocatoriaId, convocatoriaId))
      .orderBy(asc(categoriaConvocatoria.orden));
  }

  // Coherencia: devuelve la categoria SOLO si pertenece a esa convocatoria.
  // El servicio traduce null a 404 para no revelar si el id existe en otra parte.
  async findCategoriaEnConvocatoria(convocatoriaId: number, categoriaId: number) {
    const rows = await this.db
      .select({
        id: categoriaConvocatoria.id,
        convocatoriaId: categoriaConvocatoria.convocatoriaId,
        nombre: categoriaConvocatoria.nombre,
      })
      .from(categoriaConvocatoria)
      .where(
        and(
          eq(categoriaConvocatoria.id, categoriaId),
          eq(categoriaConvocatoria.convocatoriaId, convocatoriaId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Formulario (estructura, no respuestas) ---

  async findFormulario(categoriaId: number) {
    const rows = await this.db
      .select({
        id: formularioDinamico.id,
        categoriaId: formularioDinamico.categoriaId,
        nombre: formularioDinamico.nombre,
        descripcion: formularioDinamico.descripcion,
        schemaDefinition: formularioDinamico.schemaDefinition,
        version: formularioDinamico.version,
        updatedAt: formularioDinamico.updatedAt,
      })
      .from(formularioDinamico)
      .where(eq(formularioDinamico.categoriaId, categoriaId))
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Rubrica (criterios de evaluacion, sin notas de nadie) ---

  async findRubrica(categoriaId: number) {
    const rows = await this.db
      .select({
        id: rubrica.id,
        categoriaId: rubrica.categoriaId,
        nombre: rubrica.nombre,
        descripcion: rubrica.descripcion,
        puntajeTotal: rubrica.puntajeTotal,
      })
      .from(rubrica)
      .where(eq(rubrica.categoriaId, categoriaId))
      .limit(1);
    const cabecera = rows[0];
    if (!cabecera) return null;

    const criterios = await this.db
      .select({
        id: criterio.id,
        nombre: criterio.nombre,
        descripcion: criterio.descripcion,
        tipo: criterio.tipo,
        pesoPorcentaje: criterio.pesoPorcentaje,
        orden: criterio.orden,
      })
      .from(criterio)
      .where(eq(criterio.rubricaId, cabecera.id))
      .orderBy(asc(criterio.orden));

    const subCriterios = criterios.length
      ? await this.db
          .select({
            id: subCriterio.id,
            criterioId: subCriterio.criterioId,
            nombre: subCriterio.nombre,
            descripcion: subCriterio.descripcion,
            pesoPorcentaje: subCriterio.pesoPorcentaje,
            orden: subCriterio.orden,
          })
          .from(subCriterio)
          .innerJoin(criterio, eq(criterio.id, subCriterio.criterioId))
          .where(eq(criterio.rubricaId, cabecera.id))
          .orderBy(asc(subCriterio.orden))
      : [];

    // Niveles por sub-criterio (basico/intermedio/avanzado con su rango de
    // puntaje): sin ellos la rubrica no comunica COMO se evalua. Se ordenan por
    // puntaje minimo asc para que salgan de menor a mayor exigencia.
    const niveles = subCriterios.length
      ? await this.db
          .select({
            id: nivelEvaluacion.id,
            subCriterioId: nivelEvaluacion.subCriterioId,
            nivel: nivelEvaluacion.nivel,
            descripcion: nivelEvaluacion.descripcion,
            puntajeMin: nivelEvaluacion.puntajeMin,
            puntajeMax: nivelEvaluacion.puntajeMax,
          })
          .from(nivelEvaluacion)
          .innerJoin(subCriterio, eq(subCriterio.id, nivelEvaluacion.subCriterioId))
          .innerJoin(criterio, eq(criterio.id, subCriterio.criterioId))
          .where(eq(criterio.rubricaId, cabecera.id))
          .orderBy(asc(nivelEvaluacion.puntajeMin))
      : [];

    return {
      ...cabecera,
      criterios: criterios.map((c) => ({
        ...c,
        subCriterios: subCriterios
          .filter((s) => s.criterioId === c.id)
          .map((s) => ({
            ...s,
            niveles: niveles.filter((n) => n.subCriterioId === s.id),
          })),
      })),
    };
  }

  // --- Documentos de la convocatoria ---

  // Excluye SIEMPRE los de proposito 'jurado' (guia interna de evaluacion).
  // El filtro va en el repositorio, no en el servicio: asi no hay forma de
  // pedir "todos" desde arriba por descuido.
  async findDocumentos(categoriaId: number) {
    return this.db
      .select({
        id: documentoCategoria.id,
        nombre: documentoCategoria.nombre,
        nombreOriginal: documentoCategoria.nombreOriginal,
        mimeType: documentoCategoria.mimeType,
        tamanoBytes: documentoCategoria.tamanoBytes,
        proposito: documentoCategoria.proposito,
        orden: documentoCategoria.orden,
        createdAt: documentoCategoria.createdAt,
      })
      .from(documentoCategoria)
      .where(
        and(
          eq(documentoCategoria.categoriaId, categoriaId),
          ne(documentoCategoria.proposito, 'jurado'),
        ),
      )
      .orderBy(asc(documentoCategoria.orden));
  }

  // Para descargar: incluye storageKey, pero mantiene el mismo filtro de
  // proposito y ademas exige que el documento sea de esa categoria.
  async findDocumentoDescargable(categoriaId: number, documentoId: number) {
    const rows = await this.db
      .select({
        id: documentoCategoria.id,
        nombreOriginal: documentoCategoria.nombreOriginal,
        mimeType: documentoCategoria.mimeType,
        storageKey: documentoCategoria.storageKey,
      })
      .from(documentoCategoria)
      .where(
        and(
          eq(documentoCategoria.id, documentoId),
          eq(documentoCategoria.categoriaId, categoriaId),
          ne(documentoCategoria.proposito, 'jurado'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Postulaciones ---

  // Sin responseData (evita cargar JSONB grandes en el listado) y sin conteos
  // de calificaciones (info del jurado).
  async findPostulaciones(convocatoriaId: number, categoriaId?: number) {
    const condiciones = [eq(postulacion.convocatoriaId, convocatoriaId)];
    if (categoriaId) condiciones.push(eq(postulacion.categoriaId, categoriaId));

    return this.db
      .select({
        id: postulacion.id,
        convocatoriaId: postulacion.convocatoriaId,
        categoriaId: postulacion.categoriaId,
        empresaRazonSocial: empresa.razonSocial,
        estado: postulacion.estado,
        porcentajeCompletado: postulacion.porcentajeCompletado,
        fechaEnvio: postulacion.fechaEnvio,
        observacion: postulacion.observacion,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        createdAt: postulacion.createdAt,
        updatedAt: postulacion.updatedAt,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(and(...condiciones))
      .orderBy(desc(postulacion.updatedAt));
  }

  // Detalle: agrega responseData (las respuestas del formulario). Los adjuntos
  // NO se exponen: en response_data un campo de tipo archivo guarda solo IDs
  // numericos de archivo_postulacion, que sin el endpoint de archivos son
  // numeros opacos. No se hace join con archivo_postulacion a proposito.
  async findPostulacionEnConvocatoria(convocatoriaId: number, postulacionId: number) {
    const rows = await this.db
      .select({
        id: postulacion.id,
        convocatoriaId: postulacion.convocatoriaId,
        categoriaId: postulacion.categoriaId,
        empresaRazonSocial: empresa.razonSocial,
        estado: postulacion.estado,
        responseData: postulacion.responseData,
        schemaVersion: postulacion.schemaVersion,
        porcentajeCompletado: postulacion.porcentajeCompletado,
        fechaEnvio: postulacion.fechaEnvio,
        observacion: postulacion.observacion,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        createdAt: postulacion.createdAt,
        updatedAt: postulacion.updatedAt,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(
        and(
          eq(postulacion.id, postulacionId),
          eq(postulacion.convocatoriaId, convocatoriaId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  // --- Ranking (puntaje final consolidado, nunca notas por jurado) ---

  async findRanking(categoriaId: number) {
    return this.db
      .select({
        postulacionId: postulacion.id,
        empresaRazonSocial: empresa.razonSocial,
        puntajeFinal: postulacion.puntajeFinal,
        posicionFinal: postulacion.posicionFinal,
        estado: postulacion.estado,
        fechaEnvio: postulacion.fechaEnvio,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(postulacion.empresaId, empresa.id))
      .where(
        and(
          eq(postulacion.categoriaId, categoriaId),
          sql`${postulacion.estado} in ('calificado','ganador','no_seleccionado')`,
        ),
      )
      .orderBy(desc(postulacion.puntajeFinal));
  }

  // --- Resumen general (pantalla de inicio del observador) ---

  async findResumen() {
    const [convocatorias] = await this.db
      .select({ total: count() })
      .from(convocatoria);

    const postulacionesPorEstado = await this.db
      .select({ estado: postulacion.estado, total: count() })
      .from(postulacion)
      .groupBy(postulacion.estado);

    return {
      totalConvocatorias: Number(convocatorias?.total ?? 0),
      postulacionesPorEstado: postulacionesPorEstado.map((r) => ({
        estado: r.estado,
        total: Number(r.total),
      })),
    };
  }
}
