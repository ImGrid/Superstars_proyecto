-- Capa 1 (categorias) - Paso 2
-- Re-emparentar formulario_dinamico y rubrica: de convocatoria -> categoria.
-- Backfill data-driven via join por convocatoria_id (cada convocatoria tiene 1 categoria).
-- Ejecutar en transaccion.

BEGIN;

-- ================= formulario_dinamico =================
ALTER TABLE formulario_dinamico ADD COLUMN categoria_id integer;

UPDATE formulario_dinamico f
SET categoria_id = cat.id
FROM categoria_convocatoria cat
WHERE cat.convocatoria_id = f.convocatoria_id;

ALTER TABLE formulario_dinamico ALTER COLUMN categoria_id SET NOT NULL;

ALTER TABLE formulario_dinamico
  ADD CONSTRAINT fk_formulario_categoria FOREIGN KEY (categoria_id)
    REFERENCES categoria_convocatoria (id) ON DELETE CASCADE;

-- 1 formulario por categoria
ALTER TABLE formulario_dinamico
  ADD CONSTRAINT uq_formulario_categoria UNIQUE (categoria_id);

-- eliminar GIN: no se hacen busquedas dentro del JSONB, solo frena escrituras
DROP INDEX IF EXISTS idx_formulario_schema_gin;

-- quitar la relacion vieja a convocatoria
ALTER TABLE formulario_dinamico DROP CONSTRAINT uq_formulario_convocatoria;
ALTER TABLE formulario_dinamico DROP CONSTRAINT fk_formulario_convocatoria;
ALTER TABLE formulario_dinamico DROP COLUMN convocatoria_id;

-- ================= rubrica =================
ALTER TABLE rubrica ADD COLUMN categoria_id integer;

UPDATE rubrica r
SET categoria_id = cat.id
FROM categoria_convocatoria cat
WHERE cat.convocatoria_id = r.convocatoria_id;

ALTER TABLE rubrica ALTER COLUMN categoria_id SET NOT NULL;

ALTER TABLE rubrica
  ADD CONSTRAINT fk_rubrica_categoria FOREIGN KEY (categoria_id)
    REFERENCES categoria_convocatoria (id) ON DELETE CASCADE;

-- 1 rubrica por categoria
ALTER TABLE rubrica
  ADD CONSTRAINT uq_rubrica_categoria UNIQUE (categoria_id);

ALTER TABLE rubrica DROP CONSTRAINT uq_rubrica_convocatoria;
ALTER TABLE rubrica DROP CONSTRAINT fk_rubrica_convocatoria;
ALTER TABLE rubrica DROP COLUMN convocatoria_id;

COMMIT;
