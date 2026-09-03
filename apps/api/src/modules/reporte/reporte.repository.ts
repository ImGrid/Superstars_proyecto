import { Injectable, Inject } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import type { ReporteQueryDto } from '@superstars/shared';
import { DRIZZLE } from '../../database/drizzle.provider';
import type { DrizzleDB } from '../../database/drizzle.provider';
import type {
  FilaContacto,
  FilaPostulacion,
  FilaRespuesta,
  CategoriaConFormulario,
  CampoFormulario,
  ResumenEcosistema,
  FilaDimension,
  FilaEmbudo,
  FilaCalidad,
  ConteosCatalogo,
} from './reporte.types';

// Consultas de los reportes descargables.
//
// Se usa SQL crudo con db.execute en vez del constructor de Drizzle porque son
// consultas con CTE, union y recorrido de JSONB que el constructor no expresa
// bien. Solo se interpolan VALORES (parametrizados por el driver); las columnas
// van como literal. Eso ademas evita el problema conocido de Drizzle con
// columnas del FROM dentro de subconsultas correlacionadas en posicion SELECT.
//
// Regla de oro de este modulo: el repositorio NO traduce ni formatea. Devuelve
// los slugs y los numeros tal como estan en la base; traducir a etiquetas y dar
// formato es tarea del servicio, que es quien conoce el destino (Excel o PDF).
@Injectable()
export class ReporteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // Trozo de SQL reutilizable: clasifica a cada proponente segun hasta donde
  // llego. El orden de los CASE es el del embudo, del menos al mas avanzado.
  private readonly etapaCase = sql`
    case
      when e.id is null          then 'solo_registrado'
      when po.usuario_id is null then 'empresa_sin_postular'
      when po.enviadas > 0       then 'enviada'
      else 'borrador'
    end`;

  // Agregado de postulaciones por usuario. Se filtra por convocatoria/categoria
  // aqui adentro para que una persona sin postulaciones en ese recorte quede en
  // la etapa anterior, en vez de desaparecer del reporte.
  private postulacionesPorUsuario(filtros: ReporteQueryDto): SQL {
    const condiciones: SQL[] = [];
    if (filtros.convocatoriaId !== undefined) {
      condiciones.push(sql`p.convocatoria_id = ${filtros.convocatoriaId}`);
    }
    if (filtros.categoriaId !== undefined) {
      condiciones.push(sql`p.categoria_id = ${filtros.categoriaId}`);
    }
    const where =
      condiciones.length > 0
        ? sql`where ${sql.join(condiciones, sql` and `)}`
        : sql``;

    return sql`
      select e.usuario_id,
             count(*)                                          as total_postulaciones,
             count(*) filter (where p.fecha_envio is not null)  as enviadas,
             string_agg(distinct cc.nombre, '; ')               as categorias,
             max(p.porcentaje_completado)                       as mejor_avance,
             max(p.fecha_envio)                                 as ultimo_envio,
             (array_agg(p.response_data->>'contacto_telefono' order by p.updated_at desc)
              filter (where nullif(p.response_data->>'contacto_telefono','') is not null))[1]
                                                                as telefono_postulacion
      from postulacion p
      join empresa e on e.id = p.empresa_id
      join categoria_convocatoria cc on cc.id = p.categoria_id
      ${where}
      group by e.usuario_id`;
  }

  // ============== R1 · CONTACTOS ==============

  // Una fila por persona registrada como proponente. Nunca duplica a nadie:
  // las postulaciones se agregan antes del join.
  async getContactos(filtros: ReporteQueryDto): Promise<FilaContacto[]> {
    const condiciones: SQL[] = [sql`u.rol = 'proponente'`];

    if (filtros.departamento !== undefined) {
      condiciones.push(sql`e.departamento = ${filtros.departamento}`);
    }
    if (filtros.desde !== undefined) {
      condiciones.push(sql`u.created_at >= ${filtros.desde}::date`);
    }
    if (filtros.hasta !== undefined) {
      // + 1 dia para que el rango incluya el dia final completo
      condiciones.push(sql`u.created_at < (${filtros.hasta}::date + interval '1 day')`);
    }
    if (filtros.etapa !== undefined) {
      condiciones.push(sql`${this.etapaCase} = ${filtros.etapa}`);
    }

    const resultado = await this.db.execute(sql`
      with post as (${this.postulacionesPorUsuario(filtros)})
      select
        u.id                                as usuario_id,
        u.nombre,
        u.email,
        ${this.etapaCase}                   as etapa,
        e.contacto_telefono,
        e.telefono                          as telefono_empresa,
        po.telefono_postulacion,
        e.contacto_cargo                    as cargo,
        e.razon_social,
        e.departamento,
        e.ciudad,
        po.categorias,
        coalesce(po.total_postulaciones, 0) as postulaciones,
        po.mejor_avance,
        po.ultimo_envio,
        u.created_at                        as fecha_registro
      from usuario u
      left join empresa e on e.usuario_id = u.id
      left join post po   on po.usuario_id = u.id
      where ${sql.join(condiciones, sql` and `)}
      order by
        case ${this.etapaCase}
          when 'enviada' then 1
          when 'borrador' then 2
          when 'empresa_sin_postular' then 3
          else 4
        end,
        po.mejor_avance desc nulls last,
        u.created_at desc
    `);

    return resultado.rows.map((r: Record<string, unknown>) => ({
      usuarioId: Number(r.usuario_id),
      nombre: String(r.nombre),
      email: String(r.email),
      etapa: r.etapa as FilaContacto['etapa'],
      telefonoContacto: this.texto(r.contacto_telefono),
      telefonoEmpresa: this.texto(r.telefono_empresa),
      telefonoPostulacion: this.texto(r.telefono_postulacion),
      cargo: this.texto(r.cargo),
      razonSocial: this.texto(r.razon_social),
      departamento: this.texto(r.departamento),
      ciudad: this.texto(r.ciudad),
      categorias: this.texto(r.categorias),
      postulaciones: Number(r.postulaciones),
      mejorAvance: this.numero(r.mejor_avance),
      ultimoEnvio: this.texto(r.ultimo_envio),
      fechaRegistro: String(r.fecha_registro),
    }));
  }

  // ============== R3 · POSTULACIONES ==============

  // Una fila por postulacion, con el avance y que campos obligatorios le faltan.
  // Incluye los borradores a proposito: sirve justamente para saber en que punto
  // esta cada uno antes de que cierre la convocatoria.
  async getPostulaciones(filtros: ReporteQueryDto): Promise<FilaPostulacion[]> {
    const condiciones: SQL[] = [sql`true`];

    if (filtros.convocatoriaId !== undefined) {
      condiciones.push(sql`p.convocatoria_id = ${filtros.convocatoriaId}`);
    }
    if (filtros.categoriaId !== undefined) {
      condiciones.push(sql`p.categoria_id = ${filtros.categoriaId}`);
    }
    if (filtros.estado !== undefined) {
      condiciones.push(sql`p.estado = ${filtros.estado}`);
    }
    if (filtros.departamento !== undefined) {
      condiciones.push(sql`e.departamento = ${filtros.departamento}`);
    }
    if (filtros.desde !== undefined) {
      condiciones.push(sql`p.created_at >= ${filtros.desde}::date`);
    }
    if (filtros.hasta !== undefined) {
      condiciones.push(sql`p.created_at < (${filtros.hasta}::date + interval '1 day')`);
    }

    const resultado = await this.db.execute(sql`
      with campos as (
        select f.categoria_id,
               c->>'id'       as field_id,
               c->>'etiqueta' as etiqueta
        from formulario_dinamico f,
             jsonb_array_elements(f.schema_definition->'secciones') s,
             jsonb_array_elements(s->'campos') c
        where c->>'tipo' <> 'informativo'
          and coalesce((c->>'requerido')::boolean, false)
      ),
      faltantes as (
        select p.id                                             as postulacion_id,
               count(*)                                         as cuantos,
               string_agg(ca.etiqueta, ' | ' order by ca.etiqueta) as cuales
        from postulacion p
        join campos ca on ca.categoria_id = p.categoria_id
        where p.response_data->>ca.field_id is null
           or p.response_data->>ca.field_id = ''
           or (jsonb_typeof(p.response_data->ca.field_id) = 'array'
               and jsonb_array_length(p.response_data->ca.field_id) = 0)
        group by p.id
      ),
      archivos as (
        select postulacion_id,
               count(*)                    as cuantos,
               coalesce(sum(tamano_bytes),0) as bytes
        from archivo_postulacion
        group by postulacion_id
      )
      select
        p.id                          as postulacion_id,
        con.nombre                    as convocatoria,
        cc.nombre                     as categoria,
        e.razon_social,
        u.nombre                      as contacto,
        u.email,
        e.contacto_telefono,
        e.departamento,
        p.estado,
        p.porcentaje_completado,
        coalesce(fa.cuantos, 0)       as campos_faltantes,
        fa.cuales                     as que_le_falta,
        coalesce(ar.cuantos, 0)       as archivos,
        coalesce(ar.bytes, 0)         as bytes_archivos,
        p.created_at                  as iniciada,
        p.updated_at                  as ultima_edicion,
        p.fecha_envio
      from postulacion p
      join empresa e                  on e.id = p.empresa_id
      join usuario u                  on u.id = e.usuario_id
      join categoria_convocatoria cc  on cc.id = p.categoria_id
      join convocatoria con           on con.id = p.convocatoria_id
      left join faltantes fa          on fa.postulacion_id = p.id
      left join archivos ar           on ar.postulacion_id = p.id
      where ${sql.join(condiciones, sql` and `)}
      order by p.porcentaje_completado desc, p.updated_at desc
    `);

    return resultado.rows.map((r: Record<string, unknown>) => ({
      postulacionId: Number(r.postulacion_id),
      convocatoria: String(r.convocatoria),
      categoria: String(r.categoria),
      razonSocial: String(r.razon_social),
      contacto: String(r.contacto),
      email: String(r.email),
      telefonoContacto: this.texto(r.contacto_telefono),
      departamento: this.texto(r.departamento),
      estado: String(r.estado),
      porcentajeCompletado: Number(r.porcentaje_completado),
      camposFaltantes: Number(r.campos_faltantes),
      queLeFalta: this.texto(r.que_le_falta),
      archivos: Number(r.archivos),
      bytesArchivos: Number(r.bytes_archivos),
      iniciada: String(r.iniciada),
      ultimaEdicion: String(r.ultima_edicion),
      fechaEnvio: this.texto(r.fecha_envio),
    }));
  }

  // ============== R4 · RESPUESTAS DEL FORMULARIO ==============

  // Estructura del formulario de cada categoria, ya aplanada y en orden.
  //
  // Es imprescindible leer el schema_definition y no asumir ids fijos: las dos
  // categorias reutilizan ids con TIPOS distintos (empresa_socios es seleccion
  // unica en una y texto corto en la otra) y ademas tienen campos agregados a
  // mano con id autogenerado que no coinciden entre si.
  async getCategoriasConFormulario(
    filtros: ReporteQueryDto,
  ): Promise<CategoriaConFormulario[]> {
    const condiciones: SQL[] = [sql`true`];
    if (filtros.convocatoriaId !== undefined) {
      condiciones.push(sql`cc.convocatoria_id = ${filtros.convocatoriaId}`);
    }
    if (filtros.categoriaId !== undefined) {
      condiciones.push(sql`cc.id = ${filtros.categoriaId}`);
    }

    const resultado = await this.db.execute(sql`
      select
        cc.id                as categoria_id,
        cc.nombre            as categoria_nombre,
        s->>'titulo'         as seccion,
        coalesce((s->>'orden')::int, 0) as seccion_orden,
        c->>'id'             as field_id,
        c->>'etiqueta'       as etiqueta,
        c->>'tipo'           as tipo,
        coalesce((c->>'requerido')::boolean, false) as requerido,
        coalesce((c->>'orden')::int, 0)  as campo_orden,
        coalesce(c->'opciones', '[]'::jsonb) as opciones,
        coalesce(c->'columnas', '[]'::jsonb) as columnas
      from categoria_convocatoria cc
      join formulario_dinamico f on f.categoria_id = cc.id,
           jsonb_array_elements(f.schema_definition->'secciones') s,
           jsonb_array_elements(s->'campos') c
      where ${sql.join(condiciones, sql` and `)}
        and c->>'tipo' <> 'informativo'
      order by cc.orden, cc.id, seccion_orden, campo_orden
    `);

    const porCategoria = new Map<number, CategoriaConFormulario>();
    for (const r of resultado.rows as Record<string, unknown>[]) {
      const id = Number(r.categoria_id);
      if (!porCategoria.has(id)) {
        porCategoria.set(id, {
          categoriaId: id,
          categoriaNombre: String(r.categoria_nombre),
          campos: [],
        });
      }
      porCategoria.get(id)!.campos.push({
        fieldId: String(r.field_id),
        // un campo sin etiqueta cae al id: es preferible una columna con el id
        // tecnico a una columna sin encabezado
        etiqueta: this.texto(r.etiqueta) ?? String(r.field_id),
        tipo: String(r.tipo),
        seccion: this.texto(r.seccion) ?? '',
        requerido: Boolean(r.requerido),
        // solo los campos de seleccion traen opciones; el resto, arreglo vacio
        opciones: (r.opciones ?? []) as CampoFormulario['opciones'],
        // solo los campos de tipo tabla traen columnas
        columnas: ((r.columnas ?? []) as Record<string, unknown>[]).map((c) => ({
          id: String(c.id),
          titulo: String(c.titulo ?? c.id),
        })),
      });
    }
    return [...porCategoria.values()];
  }

  // Respuestas crudas de cada postulacion, mas los nombres de los archivos
  // subidos agrupados por campo.
  async getRespuestas(filtros: ReporteQueryDto): Promise<FilaRespuesta[]> {
    const condiciones: SQL[] = [sql`true`];
    if (filtros.convocatoriaId !== undefined) {
      condiciones.push(sql`p.convocatoria_id = ${filtros.convocatoriaId}`);
    }
    if (filtros.categoriaId !== undefined) {
      condiciones.push(sql`p.categoria_id = ${filtros.categoriaId}`);
    }
    if (filtros.estado !== undefined) {
      condiciones.push(sql`p.estado = ${filtros.estado}`);
    }

    const resultado = await this.db.execute(sql`
      select
        p.id                    as postulacion_id,
        p.categoria_id,
        e.razon_social,
        u.email,
        p.estado,
        p.porcentaje_completado,
        p.fecha_envio,
        p.response_data,
        coalesce(
          (select jsonb_object_agg(t.field_id, t.nombres)
           from (
             select ap.field_id, jsonb_agg(ap.nombre_original) as nombres
             from archivo_postulacion ap
             where ap.postulacion_id = p.id
             group by ap.field_id
           ) t),
          '{}'::jsonb
        ) as archivos
      from postulacion p
      join empresa e on e.id = p.empresa_id
      join usuario u on u.id = e.usuario_id
      where ${sql.join(condiciones, sql` and `)}
      order by p.categoria_id, p.id
    `);

    return resultado.rows.map((r: Record<string, unknown>) => ({
      postulacionId: Number(r.postulacion_id),
      categoriaId: Number(r.categoria_id),
      razonSocial: String(r.razon_social),
      email: String(r.email),
      estado: String(r.estado),
      porcentajeCompletado: Number(r.porcentaje_completado),
      fechaEnvio: this.texto(r.fecha_envio),
      responseData: (r.response_data ?? {}) as Record<string, unknown>,
      archivos: (r.archivos ?? {}) as Record<string, string[]>,
    }));
  }

  // ============== R5 · ECOSISTEMA ==============

  async getResumenEcosistema(): Promise<ResumenEcosistema> {
    const resultado = await this.db.execute(sql`
      select
        (select count(*) from empresa)                                   as empresas,
        (select count(*) from usuario where rol = 'proponente')          as proponentes,
        (select count(*) from postulacion)                               as postulaciones,
        (select count(*) from postulacion where fecha_envio is not null) as enviadas,
        (select coalesce(sum(num_empleados_mujeres), 0) from empresa)    as empleadas_mujeres,
        (select coalesce(sum(num_empleados_hombres), 0) from empresa)    as empleados_hombres,
        (select count(*) from empresa
          where num_empleados_mujeres is not null
            and num_empleados_hombres is not null
            and num_empleados_mujeres > num_empleados_hombres)           as empresas_mayoria_mujeres,
        (select count(*) from empresa
          where num_empleados_mujeres is not null
            and num_empleados_hombres is not null)                       as empresas_con_ambas_cifras,
        (select round(avg(anio_fundacion)) from empresa
          where anio_fundacion is not null)                              as anio_promedio
    `);

    const r = resultado.rows[0] as Record<string, unknown>;
    return {
      empresas: Number(r.empresas),
      proponentes: Number(r.proponentes),
      postulaciones: Number(r.postulaciones),
      enviadas: Number(r.enviadas),
      empleadasMujeres: Number(r.empleadas_mujeres),
      empleadosHombres: Number(r.empleados_hombres),
      empresasMayoriaMujeres: Number(r.empresas_mayoria_mujeres),
      empresasConAmbasCifras: Number(r.empresas_con_ambas_cifras),
      anioFundacionPromedio: this.numero(r.anio_promedio),
    };
  }

  // Distribucion de empresas por cada dimension, en un formato unico para que
  // el servicio las recorra igual. El valor null se representa como cadena
  // vacia y el servicio decide como mostrarlo.
  async getDimensiones(): Promise<FilaDimension[]> {
    const resultado = await this.db.execute(sql`
      select 'departamento' as dimension, coalesce(departamento, '') as valor, count(*) as total
        from empresa group by 2
      union all
      select 'rubro', coalesce(rubro, ''), count(*) from empresa group by 2
      union all
      select 'tipo_empresa', coalesce(tipo_empresa, ''), count(*) from empresa group by 2
      union all
      select 'genero_contacto', coalesce(contacto_genero, ''), count(*) from empresa group by 2
      union all
      select 'numero_socios', coalesce(numero_socios, ''), count(*) from empresa group by 2
      order by 1, 3 desc, 2
    `);

    return resultado.rows.map((r: Record<string, unknown>) => ({
      dimension: String(r.dimension),
      valor: String(r.valor ?? ''),
      total: Number(r.total),
    }));
  }

  // Embudo con cobertura de telefono por etapa. Responde de una la pregunta
  // "a cuantos de estos puedo llamar".
  async getEmbudo(): Promise<FilaEmbudo[]> {
    const resultado = await this.db.execute(sql`
      with post as (
        select e.usuario_id,
               count(*) filter (where p.fecha_envio is not null) as enviadas,
               (array_agg(p.response_data->>'contacto_telefono' order by p.updated_at desc)
                filter (where nullif(p.response_data->>'contacto_telefono','') is not null))[1]
                                                                 as telefono_postulacion
        from postulacion p
        join empresa e on e.id = p.empresa_id
        group by e.usuario_id
      ),
      clasificado as (
        select
          case
            when e.id is null          then 'solo_registrado'
            when po.usuario_id is null then 'empresa_sin_postular'
            when po.enviadas > 0       then 'enviada'
            else 'borrador'
          end as etapa,
          coalesce(
            nullif(e.contacto_telefono, ''),
            nullif(e.telefono, ''),
            po.telefono_postulacion
          ) as telefono
        from usuario u
        left join empresa e on e.usuario_id = u.id
        left join post po   on po.usuario_id = u.id
        where u.rol = 'proponente'
      )
      select etapa,
             count(*)                                as personas,
             count(*) filter (where telefono is not null) as con_telefono
      from clasificado
      group by etapa
    `);

    return resultado.rows.map((r: Record<string, unknown>) => ({
      etapa: r.etapa as FilaEmbudo['etapa'],
      personas: Number(r.personas),
      conTelefono: Number(r.con_telefono),
    }));
  }

  // ============== R9 · CALIDAD DE DATOS ==============

  // Una fila por problema detectado. Las reglas de "invalido" son exactamente
  // las de packages/shared/src/constants/validation-patterns.ts: un problema
  // marcado como error significa que ese dato NO pasaria la validacion que el
  // sistema aplica hoy (muchas filas se guardaron antes de endurecer las reglas).
  async getCalidadDatos(filtros: ReporteQueryDto): Promise<FilaCalidad[]> {
    const condiciones: SQL[] = [sql`true`];
    if (filtros.departamento !== undefined) {
      condiciones.push(sql`e.departamento = ${filtros.departamento}`);
    }

    const resultado = await this.db.execute(sql`
      with base as (
        select e.*, u.email as email_usuario, u.nombre as nombre_usuario
        from empresa e
        join usuario u on u.id = e.usuario_id
        where ${sql.join(condiciones, sql` and `)}
      ),
      telefonos_repetidos as (
        select contacto_telefono
        from base
        where contacto_telefono is not null and contacto_telefono <> ''
        group by contacto_telefono
        having count(*) > 1
      ),
      problemas as (
        -- errores: no pasarian la validacion actual
        select id, 'error' as severidad, 'nit_invalido' as codigo,
               'El NIT no tiene entre 7 y 13 dígitos' as problema, nit as valor
          from base where nit is not null and nit <> '' and nit !~ '^[0-9]{7,13}$'
        union all
        select id, 'error', 'seprec_invalido',
               'El registro SEPREC tiene un formato inválido', registro_seprec
          from base where registro_seprec is not null and registro_seprec <> ''
            and registro_seprec !~ '^[A-Za-z0-9/[:space:]-]{4,30}$'
        union all
        select id, 'error', 'telefono_contacto_invalido',
               'El teléfono de contacto no es un número válido', contacto_telefono
          from base where contacto_telefono is not null and contacto_telefono <> ''
            and contacto_telefono !~ '^\\+?[0-9[:space:]()-]{6,20}$'
        union all
        select id, 'error', 'telefono_empresa_invalido',
               'El teléfono de la empresa no es un número válido', telefono
          from base where telefono is not null and telefono <> ''
            and telefono !~ '^\\+?[0-9[:space:]()-]{6,20}$'
        union all
        select id, 'error', 'edad_contacto_invalida',
               'La edad de la persona de contacto está fuera del rango de 18 a 100 años',
               (extract(year from age(contacto_fecha_nacimiento))::int)::text
          from base where contacto_fecha_nacimiento is not null
            and (extract(year from age(contacto_fecha_nacimiento)) < 18
              or extract(year from age(contacto_fecha_nacimiento)) > 100)
        union all
        select id, 'error', 'anio_fundacion_invalido',
               'El año de fundación está fuera de rango', anio_fundacion::text
          from base where anio_fundacion is not null
            and (anio_fundacion < 1900 or anio_fundacion > extract(year from now())::int)

        -- faltantes: dato opcional ausente
        union all
        select id, 'falta', 'nit_ausente', 'Sin NIT registrado', null
          from base where nit is null or nit = ''
        union all
        select id, 'falta', 'seprec_ausente', 'Sin registro SEPREC', null
          from base where registro_seprec is null or registro_seprec = ''
        union all
        select id, 'falta', 'telefono_contacto_ausente',
               'Sin teléfono de la persona de contacto', null
          from base where contacto_telefono is null or contacto_telefono = ''
        union all
        select id, 'falta', 'cargo_ausente', 'Sin cargo de la persona de contacto', null
          from base where contacto_cargo is null or contacto_cargo = ''
        union all
        select id, 'falta', 'departamento_ausente', 'Sin departamento', null
          from base where departamento is null or departamento = ''
        union all
        select id, 'falta', 'ciudad_ausente', 'Sin ciudad', null
          from base where ciudad is null or ciudad = ''
        union all
        select id, 'falta', 'direccion_ausente', 'Sin dirección', null
          from base where direccion is null or direccion = ''
        union all
        select id, 'falta', 'rubro_ausente', 'Sin rubro', null
          from base where rubro is null or rubro = ''
        union all
        select id, 'falta', 'tipo_empresa_ausente', 'Sin tipo de empresa', null
          from base where tipo_empresa is null or tipo_empresa = ''

        -- a revisar: pasan la validacion pero conviene mirarlos
        union all
        select b.id, 'revisar', 'telefono_repetido',
               'Este teléfono de contacto figura en más de una empresa', b.contacto_telefono
          from base b
          join telefonos_repetidos tr on tr.contacto_telefono = b.contacto_telefono
        union all
        select id, 'revisar', 'anio_fundacion_antiguo',
               'Año de fundación anterior a 1972, el más antiguo declarado por una empresa real',
               anio_fundacion::text
          from base where anio_fundacion is not null and anio_fundacion < 1972
        union all
        select id, 'revisar', 'razon_social_igual_a_persona',
               'La razón social es igual al nombre de la persona: puede ser una actividad unipersonal',
               razon_social
          from base where lower(trim(razon_social)) = lower(trim(nombre_usuario))
        union all
        select id, 'revisar', 'sin_empleados_declarados',
               'No declaró ningún empleado, ni mujeres ni hombres', null
          from base
          where coalesce(num_empleados_mujeres, 0) + coalesce(num_empleados_hombres, 0) = 0
      )
      select
        b.id            as empresa_id,
        b.razon_social,
        b.email_usuario,
        b.contacto_telefono,
        b.departamento,
        pr.severidad,
        pr.codigo,
        pr.problema,
        pr.valor        as valor_actual
      from problemas pr
      join base b on b.id = pr.id
      order by
        case pr.severidad when 'error' then 1 when 'revisar' then 2 else 3 end,
        b.razon_social,
        pr.codigo
    `);

    return resultado.rows.map((r: Record<string, unknown>) => ({
      empresaId: Number(r.empresa_id),
      razonSocial: String(r.razon_social),
      emailUsuario: String(r.email_usuario),
      telefonoContacto: this.texto(r.contacto_telefono),
      departamento: this.texto(r.departamento),
      severidad: r.severidad as FilaCalidad['severidad'],
      codigo: String(r.codigo),
      problema: String(r.problema),
      valorActual: this.texto(r.valor_actual),
    }));
  }

  // ============== CATALOGO ==============

  // Cuantas filas tendria cada reporte ahora mismo, sin filtros. Se usa para no
  // ofrecer una descarga que saldria vacia y para que la persona sepa que va a
  // recibir antes de bajarla.
  async getConteos(): Promise<ConteosCatalogo> {
    // El de calidad de datos se cuenta con sumas sobre empresa y NO ejecutando
    // el reporte completo. Antes se llamaba a getCalidadDatos solo para medir
    // el largo del arreglo, y eso corria una consulta de veinte ramas de union
    // cada vez que se abria la pantalla de reportes.
    //
    // Las condiciones de aqui son las mismas que las de getCalidadDatos. Si se
    // agrega o quita una regla alli, hay que reflejarla aqui: la prueba compara
    // los dos caminos y falla si dejan de coincidir.
    const resultado = await this.db.execute(sql`
      select
        (select count(*) from usuario where rol = 'proponente') as contactos,
        (select count(*) from postulacion)                      as postulaciones,
        (select count(*) from postulacion)                      as respuestas,
        (select count(*) from empresa)                          as ecosistema,
        (
          select
            -- errores
            count(*) filter (where nit is not null and nit <> '' and nit !~ '^[0-9]{7,13}$')
          + count(*) filter (where registro_seprec is not null and registro_seprec <> ''
                               and registro_seprec !~ '^[A-Za-z0-9/[:space:]-]{4,30}$')
          + count(*) filter (where contacto_telefono is not null and contacto_telefono <> ''
                               and contacto_telefono !~ '^\\+?[0-9[:space:]()-]{6,20}$')
          + count(*) filter (where telefono is not null and telefono <> ''
                               and telefono !~ '^\\+?[0-9[:space:]()-]{6,20}$')
          + count(*) filter (where contacto_fecha_nacimiento is not null
                               and (extract(year from age(contacto_fecha_nacimiento)) < 18
                                 or extract(year from age(contacto_fecha_nacimiento)) > 100))
          + count(*) filter (where anio_fundacion is not null
                               and (anio_fundacion < 1900
                                 or anio_fundacion > extract(year from now())::int))
            -- faltantes
          + count(*) filter (where nit is null or nit = '')
          + count(*) filter (where registro_seprec is null or registro_seprec = '')
          + count(*) filter (where contacto_telefono is null or contacto_telefono = '')
          + count(*) filter (where contacto_cargo is null or contacto_cargo = '')
          + count(*) filter (where departamento is null or departamento = '')
          + count(*) filter (where ciudad is null or ciudad = '')
          + count(*) filter (where direccion is null or direccion = '')
          + count(*) filter (where rubro is null or rubro = '')
          + count(*) filter (where tipo_empresa is null or tipo_empresa = '')
            -- a revisar
          + count(*) filter (where anio_fundacion is not null and anio_fundacion < 1972)
          + count(*) filter (where coalesce(num_empleados_mujeres, 0)
                                 + coalesce(num_empleados_hombres, 0) = 0)
          from empresa
        )
        + (
          select count(*) from empresa e
          join usuario u on u.id = e.usuario_id
          where lower(trim(e.razon_social)) = lower(trim(u.nombre))
        )
        + (
          select coalesce(sum(repetidas), 0) from (
            select count(*) as repetidas from empresa
            where contacto_telefono is not null and contacto_telefono <> ''
            group by contacto_telefono having count(*) > 1
          ) t
        ) as calidad_datos
    `);

    const r = resultado.rows[0] as Record<string, unknown>;
    return {
      contactos: Number(r.contactos),
      postulaciones: Number(r.postulaciones),
      respuestas: Number(r.respuestas),
      ecosistema: Number(r.ecosistema),
      calidadDatos: Number(r.calidad_datos),
    };
  }

  // --- helpers de conversion ---

  // El driver devuelve null, undefined o cadena vacia segun el caso; el reporte
  // necesita un unico "no hay dato" para decidir si deja la celda en blanco.
  private texto(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v);
    return s === '' ? null : s;
  }

  // Las columnas numeric de Postgres llegan como cadena por el driver.
  private numero(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
}
