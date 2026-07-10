-- Edad del contacto: agregar limite max (y alinear min) en los formularios ya creados.
-- Causa raiz: el campo numerico "contacto_edad" de las plantillas tenia min:1 sin max,
-- por lo que aceptaba valores absurdos (ej. 999999999999). Las constantes correctas ya
-- existian (EDAD_MINIMA_REPRESENTANTE=18, EDAD_MAXIMA_REPRESENTANTE=100) y ya se usan en
-- empresa.schema.ts, pero las plantillas no las cableaban. Las plantillas quedaron
-- corregidas en packages/shared; esta migracion actualiza los formularios existentes en BD.
-- Aditiva y no destructiva: solo toca el campo contacto_edad, preserva el orden de campos.

UPDATE formulario_dinamico f
SET schema_definition = jsonb_set(
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
              WHEN campo->>'id' = 'contacto_edad'
                THEN campo || '{"min": 18, "max": 100}'::jsonb
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
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(f.schema_definition->'secciones') sec,
       jsonb_array_elements(sec->'campos') campo
  WHERE campo->>'id' = 'contacto_edad'
);
