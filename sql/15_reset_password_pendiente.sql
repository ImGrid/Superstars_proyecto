-- Tabla para el flujo "olvide mi contrasena". Pattern analogo a
-- verificacion_pendiente pero para usuarios YA verificados que perdieron
-- su contrasena. Vinculado por usuario_id (FK) en vez de email porque
-- el usuario ya existe en la tabla usuario.
--
-- Defensas heredadas del patron de verificacion:
--   - intentos: limite por codigo (3) — kill code en exceso
--   - reenvios_solicitados: contador persistente (NO resetea con resend)
--                           cap absoluto = RESEND_MAX en codigo
--   - cooldown progresivo via ultimo_envio_at calculado server-side
--   - codigo_hash SHA-256 (no plaintext)
--   - expira_en con CHECK para invariante creacion < expiracion
--
-- UNIQUE(usuario_id): solo un reset pendiente por usuario a la vez. El UPSERT
-- en re-solicitud lo sobrescribe (igual patron que verificacion_pendiente).
-- ON DELETE CASCADE: si se borra el usuario, sus pendientes desaparecen

BEGIN;

CREATE TABLE reset_password_pendiente (
    id                    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id            INT         NOT NULL,
    codigo_hash           TEXT        NOT NULL,
    intentos              INT         NOT NULL DEFAULT 0,
    reenvios_solicitados  INT         NOT NULL DEFAULT 0,
    expira_en             TIMESTAMPTZ NOT NULL,
    ultimo_envio_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_reset_pwd_usuario   FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    CONSTRAINT uq_reset_pwd_usuario   UNIQUE (usuario_id),
    CONSTRAINT chk_reset_pwd_intentos CHECK (intentos >= 0),
    CONSTRAINT chk_reset_pwd_reenvios CHECK (reenvios_solicitados >= 0),
    CONSTRAINT chk_reset_pwd_expira   CHECK (expira_en > created_at)
);

CREATE INDEX idx_reset_pwd_expira_en
    ON reset_password_pendiente (expira_en);

CREATE TRIGGER trg_reset_password_pendiente_updated_at
    BEFORE UPDATE ON reset_password_pendiente
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;
