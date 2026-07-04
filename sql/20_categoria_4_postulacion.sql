-- Capa 1 (categorias) - Paso 4
-- postulacion gana categoria_id (Opcion B: mantiene tambien convocatoria_id).
-- FK compuesta garantiza que la categoria pertenece a la convocatoria indicada.
-- Ejecutar en transaccion.

BEGIN;

ALTER TABLE postulacion ADD COLUMN categoria_id integer;

UPDATE postulacion p
SET categoria_id = cat.id
FROM categoria_convocatoria cat
WHERE cat.convocatoria_id = p.convocatoria_id;

ALTER TABLE postulacion ALTER COLUMN categoria_id SET NOT NULL;

-- FK compuesta (convocatoria_id, categoria_id) -> categoria_convocatoria(convocatoria_id, id):
-- impide que categoria y convocatoria de una postulacion se desincronicen.
-- RESTRICT: no se puede borrar una categoria que tenga postulaciones.
ALTER TABLE postulacion
  ADD CONSTRAINT fk_postulacion_categoria
    FOREIGN KEY (convocatoria_id, categoria_id)
    REFERENCES categoria_convocatoria (convocatoria_id, id) ON DELETE RESTRICT;

-- indice clave del cambio: evaluacion, ranking y seleccion filtran por categoria.
CREATE INDEX idx_postulacion_categoria_estado ON postulacion (categoria_id, estado);

COMMIT;

-- Nota: se conservan convocatoria_id, uq(convocatoria_id, empresa_id),
-- idx(convocatoria_id, estado) e idx(empresa_id) (Opcion B).
