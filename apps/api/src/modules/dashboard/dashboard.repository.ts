import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc, asc, isNull, inArray, ne, count } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import {
  convocatoria,
  categoriaConvocatoria,
  responsableConvocatoria,
  evaluadorCategoria,
  asignacionEvaluador,
  postulacion,
  empresa,
  usuario,
  calificacion,
} from '@superstars/db';

// estados que cuentan como convocatoria "activa" para los KPIs
const ESTADOS_ACTIVOS = ['publicado', 'cerrado', 'en_evaluacion', 'resultados_listos'] as const;

// estados de postulacion que cuentan como "aprobada" (paso por la revision del responsable)
const ESTADOS_POSTULACION_APROBADA = ['en_evaluacion', 'calificado', 'ganador', 'no_seleccionado'] as const;

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ============== ADMIN ==============

  // KPIs globales del admin: counts por estado de convocatoria, postulaciones, ganadores
  async getAdminConvocatoriaStats() {
    const [row] = await this.db
      .select({
        borrador: sql<number>`count(*) filter (where ${convocatoria.estado} = 'borrador')`.mapWith(Number),
        publicado: sql<number>`count(*) filter (where ${convocatoria.estado} = 'publicado')`.mapWith(Number),
        cerrado: sql<number>`count(*) filter (where ${convocatoria.estado} = 'cerrado')`.mapWith(Number),
        en_evaluacion: sql<number>`count(*) filter (where ${convocatoria.estado} = 'en_evaluacion')`.mapWith(Number),
        resultados_listos: sql<number>`count(*) filter (where ${convocatoria.estado} = 'resultados_listos')`.mapWith(Number),
        finalizado: sql<number>`count(*) filter (where ${convocatoria.estado} = 'finalizado')`.mapWith(Number),
      })
      .from(convocatoria);
    return row;
  }

  // counts globales de postulaciones (no borrador, ganadores) y empresas
  async getAdminGlobalCounts() {
    const [postRow] = await this.db
      .select({
        totalNoBorrador: sql<number>`count(*) filter (where ${postulacion.estado} != 'borrador')`.mapWith(Number),
        totalGanadores: sql<number>`count(*) filter (where ${postulacion.estado} = 'ganador')`.mapWith(Number),
      })
      .from(postulacion);

    const [empRow] = await this.db
      .select({ total: count() })
      .from(empresa);

    return {
      totalPostulacionesNoBorrador: postRow.totalNoBorrador,
      totalGanadoresHistoricos: postRow.totalGanadores,
      totalEmpresas: Number(empRow.total),
    };
  }

  // counts de usuarios activos por rol (solo admin)
  async getAdminUsuarioStats() {
    const [row] = await this.db
      .select({
        administrador: sql<number>`count(*) filter (where ${usuario.rol} = 'administrador')`.mapWith(Number),
        responsable_convocatoria: sql<number>`count(*) filter (where ${usuario.rol} = 'responsable_convocatoria')`.mapWith(Number),
        evaluador: sql<number>`count(*) filter (where ${usuario.rol} = 'evaluador')`.mapWith(Number),
        proponente: sql<number>`count(*) filter (where ${usuario.rol} = 'proponente')`.mapWith(Number),
      })
      .from(usuario)
      .where(eq(usuario.activo, true));
    return row;
  }

  // resumen de las convocatorias activas: id, nombre, estado, total postulaciones, dias para cerrar
  async getAdminConvocatoriasActivasResumen() {
    return this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        estado: convocatoria.estado,
        // postulaciones de la convocatoria (no borradores)
        totalPostulaciones: sql<number>`(
          select count(*) from postulacion p
          where p.convocatoria_id = convocatoria.id and p.estado != 'borrador'
        )`.mapWith(Number),
        // dias hasta el cierre real (efectiva si existe, si no la original). Solo aplica si esta publicado
        diasParaCerrar: sql<number | null>`case
          when ${convocatoria.estado} = 'publicado' then
            (coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion}) - current_date)::int
          else null
        end`,
      })
      .from(convocatoria)
      .where(inArray(convocatoria.estado, [...ESTADOS_ACTIVOS]))
      .orderBy(asc(sql`coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion})`));
  }

  // alertas operativas para el admin
  async getAdminAlertas() {
    // convocatorias en cerrado que aun no se llevaron a evaluacion
    const [cerradoSinEval] = await this.db
      .select({ count: count() })
      .from(convocatoria)
      .where(eq(convocatoria.estado, 'cerrado'));

    // convocatorias en borrador o publicado sin responsable asignado
    const [sinResponsable] = await this.db
      .select({ count: count() })
      .from(convocatoria)
      .where(and(
        inArray(convocatoria.estado, ['borrador', 'publicado']),
        sql`not exists (select 1 from ${responsableConvocatoria} rc where rc.convocatoria_id = ${convocatoria.id})`,
      ));

    return {
      convocatoriasCerradasSinEvaluacion: Number(cerradoSinEval.count),
      convocatoriasSinResponsable: Number(sinResponsable.count),
    };
  }

  // cobertura nacional: empresas agrupadas por departamento (slug canonico).
  // Omite empresas sin departamento declarado (decision de producto: a veces no lo cargan).
  async getAdminCoberturaNacional() {
    return this.db
      .select({
        departamento: empresa.departamento,
        total: count(),
      })
      .from(empresa)
      .where(and(sql`${empresa.departamento} is not null`, ne(empresa.departamento, '')))
      .groupBy(empresa.departamento);
  }

  // empresas creadas dentro del mes calendario actual
  async getAdminEmpresasNuevasEsteMes() {
    const [row] = await this.db
      .select({ total: count() })
      .from(empresa)
      .where(sql`${empresa.createdAt} >= date_trunc('month', now())`);
    return Number(row.total);
  }

  // suma de los montos de premio comprometidos (todas las categorias). numeric -> string
  async getAdminMontoComprometido() {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${categoriaConvocatoria.monto}), 0)::text` })
      .from(categoriaConvocatoria);
    return row.total;
  }

  // distribucion global de postulaciones por estado
  async getAdminPostulacionesPorEstado() {
    return this.db
      .select({ estado: postulacion.estado, total: count() })
      .from(postulacion)
      .groupBy(postulacion.estado);
  }

  // metricas de inclusion: empleados por genero y genero del contacto
  async getAdminInclusion() {
    const [empleados] = await this.db
      .select({
        mujeres: sql<number>`coalesce(sum(${empresa.numEmpleadosMujeres}), 0)`.mapWith(Number),
        hombres: sql<number>`coalesce(sum(${empresa.numEmpleadosHombres}), 0)`.mapWith(Number),
      })
      .from(empresa);

    const [contacto] = await this.db
      .select({
        femenino: sql<number>`count(*) filter (where ${empresa.contactoGenero} = 'femenino')`.mapWith(Number),
        conContacto: sql<number>`count(*) filter (where ${empresa.contactoGenero} is not null and ${empresa.contactoGenero} != '')`.mapWith(Number),
      })
      .from(empresa);

    return {
      empleadasMujeres: empleados.mujeres,
      empleadosHombres: empleados.hombres,
      empresasContactoFemenino: contacto.femenino,
      empresasConContacto: contacto.conContacto,
    };
  }

  // postulaciones enviadas agrupadas por mes (YYYY-MM), para la serie de tendencia.
  // El service arma la ventana de 6 meses y rellena los meses sin datos en 0.
  async getAdminPostulacionesPorMes() {
    return this.db
      .select({
        mes: sql<string>`to_char(${postulacion.fechaEnvio}, 'YYYY-MM')`,
        total: count(),
      })
      .from(postulacion)
      .where(sql`${postulacion.fechaEnvio} is not null`)
      .groupBy(sql`to_char(${postulacion.fechaEnvio}, 'YYYY-MM')`);
  }

  // ============== RESPONSABLE ==============

  // KPIs principales para un responsable: cuenta sus convocatorias y trabajo pendiente
  async getResponsableKpis(usuarioId: number) {
    // mis convocatorias: total y activas
    const [misConvocatorias] = await this.db
      .select({
        total: count(),
        activos: sql<number>`count(*) filter (where ${convocatoria.estado} in ('publicado', 'cerrado', 'en_evaluacion', 'resultados_listos'))`.mapWith(Number),
        proximosACerrar: sql<number>`count(*) filter (
          where ${convocatoria.estado} = 'publicado'
          and coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion}) <= current_date + interval '7 days'
        )`.mapWith(Number),
      })
      .from(convocatoria)
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, convocatoria.id))
      .where(eq(responsableConvocatoria.usuarioId, usuarioId));

    // postulaciones por revisar (estado=enviado en mis convocatorias)
    const [postPorRevisar] = await this.db
      .select({ count: count() })
      .from(postulacion)
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, postulacion.convocatoriaId))
      .where(and(
        eq(responsableConvocatoria.usuarioId, usuarioId),
        eq(postulacion.estado, 'enviado'),
      ));

    // calificaciones por aprobar (estado=completado en mis convocatorias)
    const [califPorAprobar] = await this.db
      .select({ count: count() })
      .from(calificacion)
      .innerJoin(postulacion, eq(postulacion.id, calificacion.postulacionId))
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, postulacion.convocatoriaId))
      .where(and(
        eq(responsableConvocatoria.usuarioId, usuarioId),
        eq(calificacion.estado, 'completado'),
      ));

    return {
      totalMisConvocatorias: Number(misConvocatorias.total),
      misConvocatoriasActivas: misConvocatorias.activos,
      convocatoriasProximasACerrar: misConvocatorias.proximosACerrar,
      postulacionesPorRevisar: Number(postPorRevisar.count),
      calificacionesPorAprobar: Number(califPorAprobar.count),
    };
  }

  // top 10 postulaciones esperando revision del responsable, ordenadas por la mas vieja
  async getResponsablePostulacionesPendientes(usuarioId: number) {
    return this.db
      .select({
        postulacionId: postulacion.id,
        empresaNombre: empresa.razonSocial,
        convocatoriaId: convocatoria.id,
        convocatoriaNombre: convocatoria.nombre,
        fechaEnvio: postulacion.fechaEnvio,
      })
      .from(postulacion)
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(convocatoria, eq(convocatoria.id, postulacion.convocatoriaId))
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, convocatoria.id))
      .where(and(
        eq(responsableConvocatoria.usuarioId, usuarioId),
        eq(postulacion.estado, 'enviado'),
      ))
      .orderBy(asc(postulacion.fechaEnvio))
      .limit(10);
  }

  // top 10 calificaciones esperando aprobacion del responsable
  async getResponsableCalificacionesPendientes(usuarioId: number) {
    return this.db
      .select({
        calificacionId: calificacion.id,
        postulacionId: postulacion.id,
        empresaNombre: empresa.razonSocial,
        convocatoriaId: convocatoria.id,
        convocatoriaNombre: convocatoria.nombre,
        evaluadorNombre: usuario.nombre,
        puntajeTotal: calificacion.puntajeTotal,
        fechaCompletada: calificacion.updatedAt,
      })
      .from(calificacion)
      .innerJoin(postulacion, eq(postulacion.id, calificacion.postulacionId))
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(convocatoria, eq(convocatoria.id, postulacion.convocatoriaId))
      .innerJoin(usuario, eq(usuario.id, calificacion.evaluadorId))
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, convocatoria.id))
      .where(and(
        eq(responsableConvocatoria.usuarioId, usuarioId),
        eq(calificacion.estado, 'completado'),
      ))
      .orderBy(asc(calificacion.updatedAt))
      .limit(10);
  }

  // resumen completo de las convocatorias del responsable con counts agregados
  async getResponsableConvocatoriasResumen(usuarioId: number) {
    return this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        estado: convocatoria.estado,
        fechaCierrePostulacion: convocatoria.fechaCierrePostulacion,
        fechaCierreEfectiva: convocatoria.fechaCierreEfectiva,
        // postulaciones de la convocatoria por estado
        totalPostulaciones: sql<number>`(
          select count(*) from postulacion p
          where p.convocatoria_id = convocatoria.id and p.estado != 'borrador'
        )`.mapWith(Number),
        postulacionesEnviadas: sql<number>`(
          select count(*) from postulacion p
          where p.convocatoria_id = convocatoria.id and p.estado = 'enviado'
        )`.mapWith(Number),
        postulacionesAprobadas: sql<number>`(
          select count(*) from postulacion p
          where p.convocatoria_id = convocatoria.id
          and p.estado in ('en_evaluacion', 'calificado', 'ganador', 'no_seleccionado')
        )`.mapWith(Number),
        totalCalificaciones: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where p.convocatoria_id = convocatoria.id
        )`.mapWith(Number),
        calificacionesAprobadas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where p.convocatoria_id = convocatoria.id and c.estado = 'aprobado'
        )`.mapWith(Number),
        diasParaCerrar: sql<number | null>`case
          when ${convocatoria.estado} = 'publicado' then
            (coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion}) - current_date)::int
          else null
        end`,
      })
      .from(convocatoria)
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, convocatoria.id))
      // solo vigentes: el dashboard no muestra las finalizadas (van a la pagina de convocatorias)
      .where(and(
        eq(responsableConvocatoria.usuarioId, usuarioId),
        ne(convocatoria.estado, 'finalizado'),
      ))
      .orderBy(desc(convocatoria.createdAt));
  }

  // distribucion de estados de postulaciones en las convocatorias del responsable
  async getResponsableDistribucionEstados(usuarioId: number) {
    return this.db
      .select({
        estado: postulacion.estado,
        total: count(),
      })
      .from(postulacion)
      .innerJoin(responsableConvocatoria, eq(responsableConvocatoria.convocatoriaId, postulacion.convocatoriaId))
      .where(eq(responsableConvocatoria.usuarioId, usuarioId))
      .groupBy(postulacion.estado);
  }

  // ============== EVALUADOR ==============

  // KPIs principales para un evaluador
  async getEvaluadorKpis(evaluadorId: number) {
    // convocatorias asignadas (distintas convocatorias en cuyas categorias soy jurado)
    const [convocatoriasRow] = await this.db
      .select({ count: sql<number>`count(distinct ${categoriaConvocatoria.convocatoriaId})`.mapWith(Number) })
      .from(evaluadorCategoria)
      .innerJoin(categoriaConvocatoria, eq(evaluadorCategoria.categoriaId, categoriaConvocatoria.id))
      .where(eq(evaluadorCategoria.evaluadorId, evaluadorId));

    // postulaciones asignadas pendientes de calificar (sin calificacion completada/aprobada)
    const [pendientesRow] = await this.db
      .select({ count: count() })
      .from(asignacionEvaluador)
      .leftJoin(calificacion, and(
        eq(calificacion.postulacionId, asignacionEvaluador.postulacionId),
        eq(calificacion.evaluadorId, asignacionEvaluador.evaluadorId),
      ))
      .innerJoin(postulacion, eq(postulacion.id, asignacionEvaluador.postulacionId))
      // solo cuenta si sigue en el jurado de la categoria de esa postulacion
      .innerJoin(evaluadorCategoria, and(
        eq(evaluadorCategoria.categoriaId, postulacion.categoriaId),
        eq(evaluadorCategoria.evaluadorId, asignacionEvaluador.evaluadorId),
      ))
      .where(and(
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
        eq(postulacion.estado, 'en_evaluacion'),
        // sin calificacion o en estados que el evaluador puede editar
        sql`(${calificacion.estado} is null or ${calificacion.estado} in ('en_progreso', 'devuelto'))`,
      ));

    // counts por estado de mis calificaciones
    const [estadoCounts] = await this.db
      .select({
        enProgreso: sql<number>`count(*) filter (where ${calificacion.estado} = 'en_progreso')`.mapWith(Number),
        completadas: sql<number>`count(*) filter (where ${calificacion.estado} = 'completado')`.mapWith(Number),
        devueltas: sql<number>`count(*) filter (where ${calificacion.estado} = 'devuelto')`.mapWith(Number),
        aprobadas: sql<number>`count(*) filter (where ${calificacion.estado} = 'aprobado')`.mapWith(Number),
      })
      .from(calificacion)
      .where(eq(calificacion.evaluadorId, evaluadorId));

    return {
      convocatoriasAsignadas: Number(convocatoriasRow.count),
      postulacionesPorCalificar: Number(pendientesRow.count),
      calificacionesEnProgreso: estadoCounts.enProgreso,
      calificacionesCompletadas: estadoCounts.completadas,
      calificacionesDevueltas: estadoCounts.devueltas,
      calificacionesAprobadas: estadoCounts.aprobadas,
    };
  }

  // top 10 postulaciones que el evaluador debe calificar
  async getEvaluadorPostulacionesPendientes(evaluadorId: number) {
    return this.db
      .select({
        postulacionId: postulacion.id,
        categoriaId: postulacion.categoriaId,
        convocatoriaId: convocatoria.id,
        convocatoriaNombre: convocatoria.nombre,
        empresaNombre: empresa.razonSocial,
        estadoCalificacion: calificacion.estado,
      })
      .from(asignacionEvaluador)
      .innerJoin(postulacion, eq(postulacion.id, asignacionEvaluador.postulacionId))
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(convocatoria, eq(convocatoria.id, postulacion.convocatoriaId))
      // solo lista si sigue en el jurado de la categoria de esa postulacion
      .innerJoin(evaluadorCategoria, and(
        eq(evaluadorCategoria.categoriaId, postulacion.categoriaId),
        eq(evaluadorCategoria.evaluadorId, asignacionEvaluador.evaluadorId),
      ))
      .leftJoin(calificacion, and(
        eq(calificacion.postulacionId, asignacionEvaluador.postulacionId),
        eq(calificacion.evaluadorId, asignacionEvaluador.evaluadorId),
      ))
      .where(and(
        eq(asignacionEvaluador.evaluadorId, evaluadorId),
        eq(postulacion.estado, 'en_evaluacion'),
        sql`(${calificacion.estado} is null or ${calificacion.estado} in ('en_progreso', 'devuelto'))`,
      ))
      .orderBy(asc(postulacion.createdAt))
      .limit(10);
  }

  // calificaciones del evaluador devueltas por el responsable
  async getEvaluadorCalificacionesDevueltas(evaluadorId: number) {
    return this.db
      .select({
        calificacionId: calificacion.id,
        postulacionId: postulacion.id,
        categoriaId: postulacion.categoriaId,
        convocatoriaId: convocatoria.id,
        convocatoriaNombre: convocatoria.nombre,
        empresaNombre: empresa.razonSocial,
        comentarioResponsable: calificacion.comentarioResponsable,
      })
      .from(calificacion)
      .innerJoin(postulacion, eq(postulacion.id, calificacion.postulacionId))
      .innerJoin(empresa, eq(empresa.id, postulacion.empresaId))
      .innerJoin(convocatoria, eq(convocatoria.id, postulacion.convocatoriaId))
      .where(and(
        eq(calificacion.evaluadorId, evaluadorId),
        eq(calificacion.estado, 'devuelto'),
      ))
      .orderBy(desc(calificacion.updatedAt));
  }

  // progreso por convocatoria asignada: counts agregados de calificaciones por estado
  async getEvaluadorProgresoPorConvocatoria(evaluadorId: number) {
    return this.db
      .select({
        convocatoriaId: convocatoria.id,
        convocatoriaNombre: convocatoria.nombre,
        totalAsignadas: sql<number>`(
          select count(*) from asignacion_evaluador ae
          inner join postulacion p on p.id = ae.postulacion_id
          where ae.evaluador_id = ${evaluadorId} and p.convocatoria_id = convocatoria.id
        )`.mapWith(Number),
        pendientes: sql<number>`(
          select count(*) from asignacion_evaluador ae
          inner join postulacion p on p.id = ae.postulacion_id
          left join calificacion c on c.postulacion_id = p.id and c.evaluador_id = ae.evaluador_id
          where ae.evaluador_id = ${evaluadorId} and p.convocatoria_id = convocatoria.id and c.id is null
        )`.mapWith(Number),
        enProgreso: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.convocatoria_id = convocatoria.id and c.estado = 'en_progreso'
        )`.mapWith(Number),
        completadas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.convocatoria_id = convocatoria.id and c.estado = 'completado'
        )`.mapWith(Number),
        aprobadas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.convocatoria_id = convocatoria.id and c.estado = 'aprobado'
        )`.mapWith(Number),
        devueltas: sql<number>`(
          select count(*) from calificacion c
          inner join postulacion p on p.id = c.postulacion_id
          where c.evaluador_id = ${evaluadorId} and p.convocatoria_id = convocatoria.id and c.estado = 'devuelto'
        )`.mapWith(Number),
      })
      .from(convocatoria)
      .where(sql`exists (
        select 1 from evaluador_categoria ec
        inner join categoria_convocatoria cc on cc.id = ec.categoria_id
        where cc.convocatoria_id = ${convocatoria.id} and ec.evaluador_id = ${evaluadorId}
      )`)
      .orderBy(desc(convocatoria.createdAt));
  }

  // ============== PROPONENTE ==============

  // KPIs del dashboard del proponente. Las dos cuentas de convocatorias se alinean
  // con la misma definicion de dominio que verificarConvocatoriaAbierta() en el
  // modulo postulacion: abierta <=> estado='publicado' y fecha_cierre vigente.
  // Incluimos el chequeo de fecha en SQL para que un job de cierre que se atrase
  // no infle el contador de "abiertas".
  async getProponenteKpis(usuarioId: number) {
    // empresa del proponente (para resolver "ya postule" y mostrar el nombre)
    const [empresaRow] = await this.db
      .select({ id: empresa.id, razonSocial: empresa.razonSocial })
      .from(empresa)
      .where(eq(empresa.usuarioId, usuarioId))
      .limit(1);

    const empresaId = empresaRow?.id ?? null;

    // counts de convocatorias por categoria visible al proponente
    const [convStats] = await this.db
      .select({
        abiertas: sql<number>`count(*) filter (
          where ${convocatoria.estado} = 'publicado'
          and coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion}) >= current_date
        )`.mapWith(Number),
        anteriores: sql<number>`count(*) filter (
          where ${convocatoria.estado} in ('cerrado', 'en_evaluacion', 'resultados_listos', 'finalizado')
        )`.mapWith(Number),
      })
      .from(convocatoria);

    return {
      empresaId,
      empresaRazonSocial: empresaRow?.razonSocial ?? null,
      convocatoriasAbiertas: convStats.abiertas,
      convocatoriasAnteriores: convStats.anteriores,
    };
  }

  // distribucion de las postulaciones del proponente por estado
  async getProponenteDistribucionEstados(empresaId: number) {
    return this.db
      .select({ estado: postulacion.estado, total: count() })
      .from(postulacion)
      .where(eq(postulacion.empresaId, empresaId))
      .groupBy(postulacion.estado);
  }

  // top 5 convocatorias abiertas mas urgentes (por fecha de cierre real ascendente).
  // Si el proponente tiene empresa, marcamos yaPostule cuando exista postulacion
  // suya en cualquier estado distinto de borrador (borrador no impide volver
  // a entrar, pero los demas estados sí cuentan como "ya entre al flujo")
  async getProponenteConvocatoriasAbiertasResumen(empresaId: number | null) {
    return this.db
      .select({
        id: convocatoria.id,
        nombre: convocatoria.nombre,
        fechaCierrePostulacion: convocatoria.fechaCierrePostulacion,
        fechaCierreEfectiva: convocatoria.fechaCierreEfectiva,
        montoMin: sql<string | null>`(select min(monto) from categoria_convocatoria where convocatoria_id = convocatoria.id)`,
        montoMax: sql<string | null>`(select max(monto) from categoria_convocatoria where convocatoria_id = convocatoria.id)`,
        numeroGanadores: sql<number>`(select coalesce(sum(numero_ganadores), 0) from categoria_convocatoria where convocatoria_id = convocatoria.id)`.mapWith(Number),
        departamentos: convocatoria.departamentos,
        totalPostulantes: sql<number>`(
          select count(*) from postulacion p
          where p.convocatoria_id = convocatoria.id and p.estado != 'borrador'
        )`.mapWith(Number),
        tieneImagen: sql<boolean>`${convocatoria.imagenKey} is not null`.mapWith(Boolean),
        // categorias con su premio, para los chips de la tarjeta (json_agg -> array parseado)
        categorias: sql<{ nombre: string; monto: string }[]>`(
          select coalesce(
            json_agg(json_build_object('nombre', nombre, 'monto', monto::text) order by orden),
            '[]'::json
          )
          from categoria_convocatoria where convocatoria_id = convocatoria.id
        )`,
        diasParaCerrar: sql<number>`(
          coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion}) - current_date
        )::int`.mapWith(Number),
        yaPostule: empresaId === null
          ? sql<boolean>`false`.mapWith(Boolean)
          : sql<boolean>`exists (
              select 1 from postulacion p
              where p.convocatoria_id = convocatoria.id
                and p.empresa_id = ${empresaId}
            )`.mapWith(Boolean),
      })
      .from(convocatoria)
      .where(and(
        eq(convocatoria.estado, 'publicado'),
        sql`coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion}) >= current_date`,
      ))
      .orderBy(asc(sql`coalesce(${convocatoria.fechaCierreEfectiva}, ${convocatoria.fechaCierrePostulacion})`))
      .limit(5);
  }
}
