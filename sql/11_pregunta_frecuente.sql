-- Tabla pregunta_frecuente para FAQ configurable desde el panel admin
-- Patron: lista plana con orden, hard delete (sin soft-delete)

BEGIN;

CREATE TABLE pregunta_frecuente (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pregunta    TEXT        NOT NULL,
    respuesta   TEXT        NOT NULL,
    orden       INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_faq_orden CHECK (orden >= 0)
);

CREATE TRIGGER trg_faq_updated_at
    BEFORE UPDATE ON pregunta_frecuente
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;
