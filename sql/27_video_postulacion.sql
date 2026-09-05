-- Campo para subir el video o la presentacion de la empresa.
--
-- Causa raiz: las dos categorias hacen la misma pregunta ("¿Tiene una
-- presentacion o video que le gustaria compartir?"), pero solo la categoria 2
-- tenia despues el campo para subir el archivo. En la categoria 1, quien
-- respondia que si no tenia donde subir nada: 15 empresas quedaron asi.
-- Ademas el campo de la categoria 2 anunciaba 50 MB cuando el servidor y nginx
-- cortaban en 20 MB, con un mensaje de error que no explicaba nada.
--
-- Las plantillas quedaron corregidas en packages/shared (archivo-postulacion.ts,
-- compartido por las dos categorias para que no vuelvan a divergir). Esta
-- migracion arregla los formularios que ya existen en la BD, que son inmutables
-- por la via normal mientras la convocatoria esta publicada.
--
-- Aditiva y no destructiva:
--   * el campo es opcional (requerido: false), asi que NO entra en el calculo
--     del 100% y ninguna postulacion en borrador o ya enviada se invalida;
--   * no toca ninguna respuesta ya guardada;
--   * preserva el orden de secciones y de campos;
--   * es idempotente: se puede correr de nuevo sin duplicar nada.
--
-- Sube tambien la version del formulario (bloqueo optimista): si alguien tiene
-- el constructor abierto con la version vieja, su guardado sera rechazado en
-- lugar de pisar este cambio.

SET client_encoding TO 'UTF8';

BEGIN;

-- ---------------------------------------------------------------------------
-- A. Formularios que YA tienen el campo (categoria 2): alinear tamano y formatos
-- ---------------------------------------------------------------------------
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
                  THEN campo || '{"maxTamanoMb": 100, "tiposPermitidos": [".mp4", ".webm", ".mov", ".pdf", ".pptx"], "mostrarSi": {"campo": "empresa_tiene_video", "igual": true}}'::jsonb
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
    -- solo si todavia no esta como lo queremos (idempotencia)
    AND (
      campo->>'maxTamanoMb' IS DISTINCT FROM '100'
      OR campo->'tiposPermitidos' IS DISTINCT FROM '[".mp4", ".webm", ".mov", ".pdf", ".pptx"]'::jsonb
      OR campo->'mostrarSi' IS DISTINCT FROM '{"campo": "empresa_tiene_video", "igual": true}'::jsonb
    )
);

-- ---------------------------------------------------------------------------
-- B. Formularios que preguntan por el video pero NO tienen el campo (categoria 1):
--    agregarlo al final de la seccion donde vive la pregunta.
--    El campo lleva orden 35 y el formulario ordena por "orden", asi que queda
--    justo debajo de la pregunta (orden 34).
-- ---------------------------------------------------------------------------
UPDATE formulario_dinamico f
SET
  schema_definition = jsonb_set(
    f.schema_definition,
    '{secciones}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN EXISTS (
                 SELECT 1 FROM jsonb_array_elements(sec->'campos') cc
                 WHERE cc->>'id' = 'empresa_tiene_video'
               )
           AND NOT EXISTS (
                 SELECT 1 FROM jsonb_array_elements(sec->'campos') cc
                 WHERE cc->>'id' = 'empresa_video_archivo'
               )
            THEN jsonb_set(
                   sec,
                   '{campos}',
                   (sec->'campos') || jsonb_build_array(
                     jsonb_build_object(
                       'id', 'empresa_video_archivo',
                       'tipo', 'archivo',
                       'etiqueta', 'Suba el video o presentación',
                       'requerido', false,
                       'orden', 35,
                       'fijo', true,
                       'tiposPermitidos', jsonb_build_array('.mp4', '.webm', '.mov', '.pdf', '.pptx'),
                       'maxTamanoMb', 100,
                       'maxArchivos', 1,
                       -- solo se muestra si respondio que SI a la pregunta de arriba
                       'mostrarSi', jsonb_build_object('campo', 'empresa_tiene_video', 'igual', true)
                     )
                   )
                 )
          ELSE sec
        END
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
        WHERE campo->>'id' = 'empresa_tiene_video'
      )
  AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(f.schema_definition->'secciones') sec,
             jsonb_array_elements(sec->'campos') campo
        WHERE campo->>'id' = 'empresa_video_archivo'
      );

COMMIT;
