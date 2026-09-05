-- Rollback de 27_video_postulacion.sql
--
-- Deja los formularios como estaban: quita el campo de la categoria 1 y
-- devuelve la categoria 2 a 50 MB con los 4 formatos originales.
--
-- CUIDADO: si alguien ya subio un archivo en ese campo, quitar el campo NO
-- borra el archivo (sigue en archivo_postulacion y en disco), pero deja de
-- verse en el formulario y su id queda huerfano dentro de response_data.
-- Revisar antes:
--   SELECT count(*) FROM archivo_postulacion WHERE field_id = 'empresa_video_archivo';

SET client_encoding TO 'UTF8';

BEGIN;

-- A. Quitar el campo de los formularios donde lo agrego esta migracion.
--    Solo de la categoria 1: la categoria 2 ya lo tenia de antes.
UPDATE formulario_dinamico f
SET
  schema_definition = jsonb_set(
    f.schema_definition,
    '{secciones}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          sec,
          '{campos}',
          COALESCE(
            (
              SELECT jsonb_agg(campo ORDER BY ord)
              FROM jsonb_array_elements(sec->'campos') WITH ORDINALITY AS c(campo, ord)
              WHERE campo->>'id' <> 'empresa_video_archivo'
            ),
            '[]'::jsonb
          )
        )
        ORDER BY sord
      )
      FROM jsonb_array_elements(f.schema_definition->'secciones') WITH ORDINALITY AS s(sec, sord)
    )
  ),
  version = f.version + 1
WHERE f.categoria_id IN (
  SELECT c.id FROM categoria_convocatoria c WHERE c.orden = 1
);

-- B. Devolver la categoria 2 a sus valores anteriores
UPDATE formulario_dinamico f
SET
  schema_definition = jsonb_set(
    f.schema_definition,
    '{secciones}',
    (
      SELECT jsonb_agg(
        jsonb_set(
          sec,
          '{campos}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN campo->>'id' = 'empresa_video_archivo'
                  THEN campo || '{"maxTamanoMb": 50, "tiposPermitidos": [".mp4", ".mov", ".pdf", ".pptx"]}'::jsonb
                ELSE campo
              END
              ORDER BY ord
            )
            FROM jsonb_array_elements(sec->'campos') WITH ORDINALITY AS c(campo, ord)
          )
        )
        ORDER BY sord
      )
      FROM jsonb_array_elements(f.schema_definition->'secciones') WITH ORDINALITY AS s(sec, sord)
    )
  ),
  version = f.version + 1
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(f.schema_definition->'secciones') sec,
       jsonb_array_elements(sec->'campos') campo
  WHERE campo->>'id' = 'empresa_video_archivo'
);

COMMIT;
