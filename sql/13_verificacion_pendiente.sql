-- Tabla verificacion_pendiente para el flujo de registro con codigo de verificacion por email
-- Patron: registro NO se crea en `usuario` hasta que el proponente confirma el codigo enviado
-- Los registros expirados se limpian con cron (cada 30 min) en el backend

BEGIN;

CREATE TABLE verificacion_pendiente (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           TEXT        NOT NULL,
    nombre          TEXT        NOT NULL,
    password_hash   TEXT        NOT NULL,
    codigo_hash     TEXT        NOT NULL,
    intentos        INT         NOT NULL DEFAULT 0,
    expira_en       TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_verif_pendiente_email          UNIQUE (email),
    CONSTRAINT chk_verif_pendiente_intentos      CHECK (intentos >= 0),
    CONSTRAINT chk_verif_pendiente_expira        CHECK (expira_en > created_at),
    CONSTRAINT chk_verif_pendiente_email_nonempty CHECK (length(email) > 0)
);

CREATE INDEX idx_verificacion_pendiente_expira_en
    ON verificacion_pendiente (expira_en);

CREATE TRIGGER trg_verificacion_pendiente_updated_at
    BEFORE UPDATE ON verificacion_pendiente
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;
