-- Capa 1 (categorias) - Paso 3
-- Re-emparentar y renombrar:
--   evaluador_convocatoria -> evaluador_categoria
--   documento_convocatoria -> documento_categoria (+ columna proposito)
-- Crea el enum proposito_documento. Ejecutar en transaccion.

BEGIN;

-- ENUM de proposito/audiencia de documento
CREATE TYPE proposito_documento AS ENUM ('informativo', 'plantilla', 'jurado');

-- ================= evaluador_convocatoria -> evaluador_categoria =================
ALTER TABLE evaluador_convocatoria ADD COLUMN categoria_id integer;

UPDATE evaluador_convocatoria e
SET categoria_id = cat.id
FROM categoria_convocatoria cat
WHERE cat.convocatoria_id = e.convocatoria_id;

ALTER TABLE evaluador_convocatoria ALTER COLUMN categoria_id SET NOT NULL;

ALTER TABLE evaluador_convocatoria
  ADD CONSTRAINT fk_evaluador_categoria_categoria FOREIGN KEY (categoria_id)
    REFERENCES categoria_convocatoria (id) ON DELETE CASCADE;

-- pool unico por (categoria, evaluador). Columna lider categoria_id: tambien
-- sirve el listado del pool de una categoria, por eso NO recreamos idx suelto.
ALTER TABLE evaluador_convocatoria
  ADD CONSTRAINT uq_evaluador_categoria UNIQUE (categoria_id, evaluador_id);

-- quitar relacion vieja a convocatoria. Al dropear la columna se elimina solo
-- el idx redundante idx_evaluador_convocatoria_convocatoria_id.
ALTER TABLE evaluador_convocatoria DROP CONSTRAINT uq_evaluador_convocatoria;
ALTER TABLE evaluador_convocatoria DROP CONSTRAINT fk_evaluador_convocatoria_convocatoria;
ALTER TABLE evaluador_convocatoria DROP COLUMN convocatoria_id;

-- renombrar tabla y objetos que aun llevan el nombre viejo
ALTER TABLE evaluador_convocatoria RENAME TO evaluador_categoria;
ALTER TABLE evaluador_categoria RENAME CONSTRAINT evaluador_convocatoria_pkey TO evaluador_categoria_pkey;
ALTER TABLE evaluador_categoria RENAME CONSTRAINT fk_evaluador_convocatoria_evaluador TO fk_evaluador_categoria_evaluador;
ALTER TABLE evaluador_categoria RENAME CONSTRAINT fk_evaluador_convocatoria_asignado_por TO fk_evaluador_categoria_asignado_por;
ALTER INDEX idx_evaluador_convocatoria_evaluador_id RENAME TO idx_evaluador_categoria_evaluador_id;
ALTER SEQUENCE evaluador_convocatoria_id_seq RENAME TO evaluador_categoria_id_seq;

-- ================= documento_convocatoria -> documento_categoria =================
ALTER TABLE documento_convocatoria ADD COLUMN categoria_id integer;

UPDATE documento_convocatoria d
SET categoria_id = cat.id
FROM categoria_convocatoria cat
WHERE cat.convocatoria_id = d.convocatoria_id;

ALTER TABLE documento_convocatoria ALTER COLUMN categoria_id SET NOT NULL;

-- proposito: default 'informativo' para filas existentes (el responsable reclasifica).
ALTER TABLE documento_convocatoria
  ADD COLUMN proposito proposito_documento NOT NULL DEFAULT 'informativo';

ALTER TABLE documento_convocatoria
  ADD CONSTRAINT fk_documento_categoria_categoria FOREIGN KEY (categoria_id)
    REFERENCES categoria_convocatoria (id) ON DELETE CASCADE;

-- indice compuesto: sirve "docs de la categoria" y "docs de la categoria por proposito".
CREATE INDEX idx_documento_categoria ON documento_convocatoria (categoria_id, proposito);

-- quitar relacion vieja. Al dropear la columna se elimina solo idx_documento_convocatoria_id.
ALTER TABLE documento_convocatoria DROP CONSTRAINT fk_documento_convocatoria;
ALTER TABLE documento_convocatoria DROP COLUMN convocatoria_id;

ALTER TABLE documento_convocatoria RENAME TO documento_categoria;
ALTER TABLE documento_categoria RENAME CONSTRAINT documento_convocatoria_pkey TO documento_categoria_pkey;
ALTER SEQUENCE documento_convocatoria_id_seq RENAME TO documento_categoria_id_seq;

COMMIT;
