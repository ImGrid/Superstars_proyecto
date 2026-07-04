-- Tabla historia_exito para la seccion "Historias que inspiran" de la landing publica
-- Patron: lista plana con orden manual (drag-and-drop), boolean activa para mostrar/ocultar
-- El cap de "6 activas maximo" se enforce en backend (HistoriaExitoService), no en BD
-- empresa_id es opcional: si existe, snapshot del nombre se guarda en empresa_nombre;
-- si no, empresa_nombre puede ser texto libre escrito por el admin o NULL

BEGIN;

CREATE TABLE historia_exito (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo          TEXT        NOT NULL,
    badge           TEXT,
    descripcion     TEXT        NOT NULL,
    imagen_key      TEXT        NOT NULL,
    empresa_id      INT,
    empresa_nombre  TEXT,
    orden           INT         NOT NULL DEFAULT 0,
    activa          BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_historia_exito_empresa
        FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE SET NULL,
    CONSTRAINT chk_historia_exito_titulo_len
        CHECK (length(titulo) BETWEEN 1 AND 200),
    CONSTRAINT chk_historia_exito_badge_len
        CHECK (badge IS NULL OR length(badge) BETWEEN 1 AND 50),
    CONSTRAINT chk_historia_exito_descripcion_len
        CHECK (length(descripcion) BETWEEN 1 AND 400),
    CONSTRAINT chk_historia_exito_imagen_key_nonempty
        CHECK (length(imagen_key) > 0),
    CONSTRAINT chk_historia_exito_empresa_nombre_len
        CHECK (empresa_nombre IS NULL OR length(empresa_nombre) BETWEEN 1 AND 200),
    CONSTRAINT chk_historia_exito_orden
        CHECK (orden >= 0)
);

CREATE TRIGGER trg_historia_exito_updated_at
    BEFORE UPDATE ON historia_exito
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indice parcial para la query publica (solo activas, ordenadas)
CREATE INDEX idx_historia_exito_activa_orden
    ON historia_exito (orden) WHERE activa = true;

COMMIT;
