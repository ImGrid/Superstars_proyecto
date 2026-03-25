-- Agregar campo fecha_cierre_efectiva para extension de plazo de postulacion
-- La fecha original (fecha_cierre_postulacion) se conserva intacta como registro historico
-- fecha_cierre_efectiva es la nueva fecha de cierre cuando se extiende el plazo
BEGIN;

ALTER TABLE concurso
  ADD COLUMN fecha_cierre_efectiva DATE;

ALTER TABLE concurso
  ADD CONSTRAINT chk_concurso_cierre_efectiva
  CHECK (fecha_cierre_efectiva IS NULL OR fecha_cierre_efectiva >= fecha_cierre_postulacion);

COMMIT;
