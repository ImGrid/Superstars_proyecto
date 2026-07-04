-- Capa 1 (categorias) - Paso 5
-- Quitar de convocatoria las columnas que ya se movieron a categoria_convocatoria.
-- Los CHECK que dependen de estas columnas se eliminan solos al dropear la columna.
-- Ejecutar en transaccion.

BEGIN;

ALTER TABLE convocatoria DROP COLUMN monto;             -- movido a categoria
ALTER TABLE convocatoria DROP COLUMN numero_ganadores;  -- movido a categoria
ALTER TABLE convocatoria DROP COLUMN top_n_sistema;     -- movido a categoria
ALTER TABLE convocatoria DROP COLUMN bases;             -- movido a categoria

COMMIT;
