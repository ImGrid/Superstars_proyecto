-- Capa 1 (categorias) - Paso 1
-- Crea la tabla categoria_convocatoria y hace backfill de 1 categoria "General"
-- por cada convocatoria existente, copiando sus valores reales (data-driven).
-- No destructivo: preserva todos los datos actuales.
-- Ejecutar en transaccion.

BEGIN;

-- 1. Tabla categoria_convocatoria
--    Nombre con sufijo _convocatoria para no chocar con categoria_publicacion (noticias).
CREATE TABLE categoria_convocatoria (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  convocatoria_id integer NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  bases text,
  monto numeric(12, 2) NOT NULL,
  numero_ganadores integer NOT NULL DEFAULT 3,
  top_n_sistema integer NOT NULL DEFAULT 10,
  orden integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_categoria_convocatoria FOREIGN KEY (convocatoria_id)
    REFERENCES convocatoria (id) ON DELETE CASCADE,
  -- UNIQUE (convocatoria_id, id): destino de la FK compuesta de postulacion
  -- y ademas sirve el listado "categorias de una convocatoria" (columna lider).
  CONSTRAINT uq_categoria_convocatoria_id UNIQUE (convocatoria_id, id),
  CONSTRAINT chk_categoria_monto CHECK (monto > 0),
  CONSTRAINT chk_categoria_ganadores CHECK (numero_ganadores > 0),
  CONSTRAINT chk_categoria_top_n CHECK (top_n_sistema > 0)
);

-- 2. Trigger updated_at (misma funcion que el resto de tablas del esquema)
CREATE TRIGGER trg_categoria_convocatoria_updated_at
  BEFORE UPDATE ON categoria_convocatoria
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. Backfill: una categoria "General" por convocatoria existente.
--    Copia los valores REALES de cada convocatoria (no hardcodeados).
INSERT INTO categoria_convocatoria
  (convocatoria_id, nombre, bases, monto, numero_ganadores, top_n_sistema, orden)
SELECT id, 'General', bases, monto, numero_ganadores, top_n_sistema, 1
FROM convocatoria;

COMMIT;

-- Rollback de este paso (si hiciera falta):
--   DROP TABLE IF EXISTS categoria_convocatoria;
