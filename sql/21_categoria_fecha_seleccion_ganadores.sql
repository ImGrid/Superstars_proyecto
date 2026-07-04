-- Categorias - indicador "resuelta"
-- Agrega fecha_seleccion_ganadores a categoria_convocatoria: marca cuando el
-- responsable selecciono los ganadores de ESA categoria. NULL = aun no resuelta.
-- Sirve de guardia para que la convocatoria solo se pueda finalizar cuando TODAS
-- sus categorias estan resueltas (selection de ganadores desacoplada del estado global).
-- Aditivo y no destructivo.

ALTER TABLE categoria_convocatoria
  ADD COLUMN IF NOT EXISTS fecha_seleccion_ganadores timestamptz;

-- Backfill: las categorias que ya tienen ganadores (convocatorias resueltas antes de
-- existir esta columna) deben quedar marcadas como resueltas. Usa la fecha de
-- publicacion de resultados de la convocatoria si existe, si no now(). Idempotente.
UPDATE categoria_convocatoria cc
SET fecha_seleccion_ganadores = COALESCE(c.fecha_publicacion_resultados, now())
FROM convocatoria c
WHERE c.id = cc.convocatoria_id
  AND cc.fecha_seleccion_ganadores IS NULL
  AND EXISTS (
    SELECT 1 FROM postulacion p
    WHERE p.categoria_id = cc.id AND p.estado = 'ganador'
  );
