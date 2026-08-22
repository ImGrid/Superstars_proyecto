-- Auditoria de lectura del rol observador
--
-- Registra QUE consulto o descargo un observador (financiador externo) y CUANDO.
-- Motivo: el observador accede a documentacion de convocatorias y a propuestas de
-- empresas de terceros. Si alguna vez hay un reclamo, tiene que existir rastro de
-- quien vio que. Los roles internos no se auditan aca: para ellos la trazabilidad
-- de negocio ya vive en las tablas del flujo (calificacion, postulacion, etc).
--
-- Que se registra: solo los accesos con contenido sensible (detalle de una
-- postulacion y descarga de un documento). Los listados NO se registran: serian
-- ruido y no revelan datos de una empresa en particular.
--
-- Decisiones de diseño:
--   * usuario_id es NULL-able con ON DELETE SET NULL: borrar un usuario NO debe
--     borrar ni bloquear su rastro de auditoria.
--   * usuario_email es una FOTO del email al momento del acceso. Si el usuario se
--     borra o cambia de email, el registro sigue diciendo quien fue.
--   * convocatoria_id sin FK a proposito: si se borra una convocatoria vieja, el
--     registro de auditoria debe sobrevivir igual.
--
-- Aditivo y no destructivo. Idempotente.
-- Rollback en sql/24_rollback_acceso_observador.sql

CREATE TABLE IF NOT EXISTS acceso_observador (
    id              integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    usuario_id      integer,
    usuario_email   text        NOT NULL,
    accion          text        NOT NULL,
    recurso         text        NOT NULL,
    recurso_id      integer     NOT NULL,
    convocatoria_id integer,
    ip              text,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fk_acceso_observador_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT chk_acceso_observador_accion
        CHECK (accion IN ('ver', 'descargar')),
    CONSTRAINT chk_acceso_observador_recurso
        CHECK (recurso IN ('postulacion', 'documento')),
    CONSTRAINT chk_acceso_observador_email_nonempty
        CHECK (length(usuario_email) > 0)
);

-- Consultas esperadas: "que hizo este usuario", "quien toco este recurso",
-- "que paso en tal periodo".
CREATE INDEX IF NOT EXISTS idx_acceso_observador_usuario   ON acceso_observador (usuario_id);
CREATE INDEX IF NOT EXISTS idx_acceso_observador_recurso   ON acceso_observador (recurso, recurso_id);
CREATE INDEX IF NOT EXISTS idx_acceso_observador_created   ON acceso_observador (created_at DESC);

-- IMPORTANTE al aplicar en el VPS: alli las migraciones se corren con
-- `sudo -u postgres`, lo que deja la tabla con owner postgres y sin permisos
-- para superstars_user (el API responderia 500). Correr ademas:
--   ALTER TABLE acceso_observador OWNER TO superstars_user;
