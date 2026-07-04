-- 18_convocatoria_imagen.sql
-- Agrega columna imagen_key a la tabla convocatoria para almacenar la clave
-- de almacenamiento de la imagen de portada (similar a publicacion.imagen_destacada_key).
-- Nullable: la imagen es opcional. El responsable la sube despues de crear la convocatoria.

BEGIN;

ALTER TABLE convocatoria
  ADD COLUMN IF NOT EXISTS imagen_key TEXT;

COMMIT;
