-- Verificacion de 27_video_postulacion.sql
-- Se espera: las DOS categorias con el campo, opcional, 100 MB y los 5 formatos.

SET client_encoding TO 'UTF8';

\echo '== 1. El campo existe en los dos formularios, con los valores correctos =='
SELECT
  f.id            AS formulario,
  f.categoria_id  AS categoria,
  f.version,
  campo->>'orden'           AS orden,
  campo->>'etiqueta'        AS etiqueta,
  campo->>'requerido'       AS requerido,
  campo->>'maxTamanoMb'     AS max_mb,
  campo->>'maxArchivos'     AS max_archivos,
  campo->'tiposPermitidos'  AS formatos
FROM formulario_dinamico f,
     jsonb_array_elements(f.schema_definition->'secciones') sec,
     jsonb_array_elements(sec->'campos') campo
WHERE campo->>'id' = 'empresa_video_archivo'
ORDER BY f.categoria_id;

\echo '== 2. Queda justo debajo de la pregunta, en la misma seccion =='
SELECT
  f.categoria_id AS categoria,
  sec->>'id'     AS seccion,
  campo->>'orden' AS orden,
  campo->>'id'    AS campo
FROM formulario_dinamico f,
     jsonb_array_elements(f.schema_definition->'secciones') sec,
     jsonb_array_elements(sec->'campos') campo
WHERE campo->>'id' IN ('empresa_tiene_video', 'empresa_video_archivo')
ORDER BY f.categoria_id, (campo->>'orden')::int;

\echo '== 3. No se duplico el campo (debe decir 1 por formulario) =='
SELECT f.categoria_id AS categoria, count(*) AS veces
FROM formulario_dinamico f,
     jsonb_array_elements(f.schema_definition->'secciones') sec,
     jsonb_array_elements(sec->'campos') campo
WHERE campo->>'id' = 'empresa_video_archivo'
GROUP BY f.categoria_id
ORDER BY f.categoria_id;

\echo '== 4. Los ids de campo siguen siendo unicos en todo el formulario =='
SELECT f.categoria_id AS categoria,
       count(*)                        AS total_campos,
       count(DISTINCT campo->>'id')    AS ids_distintos,
       CASE WHEN count(*) = count(DISTINCT campo->>'id')
            THEN 'OK' ELSE 'HAY IDS REPETIDOS' END AS resultado
FROM formulario_dinamico f,
     jsonb_array_elements(f.schema_definition->'secciones') sec,
     jsonb_array_elements(sec->'campos') campo
GROUP BY f.categoria_id
ORDER BY f.categoria_id;

\echo '== 5. Ninguna postulacion quedo por debajo del 100% por este cambio =='
\echo '   (el campo es opcional: el porcentaje guardado no debe haber cambiado)'
SELECT estado, count(*) AS postulaciones,
       count(*) FILTER (WHERE porcentaje_completado = 100) AS al_100
FROM postulacion
GROUP BY estado
ORDER BY estado;

\echo '== 6. El numero de secciones y de campos por seccion no se rompio =='
SELECT f.categoria_id AS categoria,
       sec->>'id'     AS seccion,
       jsonb_array_length(sec->'campos') AS campos
FROM formulario_dinamico f,
     jsonb_array_elements(f.schema_definition->'secciones') sec
ORDER BY f.categoria_id, (sec->>'orden')::int;
