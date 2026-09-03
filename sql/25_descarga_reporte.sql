-- Auditoria de descargas de reportes (modulo reporte, solo administrador)
--
-- Registra QUIEN descargo QUE reporte, CUANDO, con QUE filtros y CUANTAS filas
-- se llevo. Motivo: los reportes exportan datos personales de todas las personas
-- registradas (nombre, correo, telefono, cargo, direccion, genero, fecha de
-- nacimiento) en un archivo que sale del sistema y puede circular por correo o
-- WhatsApp. Si alguna vez hay un reclamo por filtracion de datos, tiene que
-- existir rastro de quien genero ese archivo y que contenia.
--
-- Por que una tabla nueva y no reusar acceso_observador:
--   * acceso_observador es el rastro del rol observador (financiador externo) y
--     tiene CHECK cerrados: recurso IN ('postulacion','documento') y
--     accion IN ('ver','descargar'). No admite reportes sin alterar el CHECK.
--   * Son dos cosas distintas: alli se audita LECTURA de un recurso puntual;
--     aqui se audita EXTRACCION masiva de datos por parte del administrador.
--   * Las columnas tampoco coinciden: un reporte no tiene recurso_id, y en
--     cambio necesita filtros y volumen de filas.
--
-- Decisiones de diseño:
--   * usuario_id es NULL-able con ON DELETE SET NULL: borrar un usuario NO debe
--     borrar ni bloquear su rastro de auditoria.
--   * usuario_email es una FOTO del correo al momento de la descarga. Si el
--     usuario se borra o cambia de correo, el registro sigue diciendo quien fue.
--   * tipo NO lleva CHECK con la lista de reportes, A PROPOSITO. El catalogo de
--     reportes esta pensado para crecer; un CHECK cerrado obligaria a una
--     migracion cada vez que se agrega uno. La lista valida vive en el esquema
--     Zod de packages/shared, que es la capa que debe conocerla. Es la leccion
--     de acceso_observador, cuyo CHECK cerrado hoy impide reutilizar la tabla.
--   * formato SI lleva CHECK: 'excel' y 'pdf' son estables y no van a crecer.
--   * filtros es jsonb con default '{}': guarda el recorte exacto (convocatoria,
--     categoria, departamento, rango de fechas). Sin esto no se puede saber que
--     contenia el archivo, solo que se descargo.
--   * filas_exportadas permite dimensionar una fuga: no es lo mismo un reporte
--     de 3 filas que uno con las 192 personas registradas.
--   * Se registra DESPUES de generar el archivo con exito. Un reporte que fallo
--     no se audita porque no salio ningun dato del sistema.
--
-- Aditivo y no destructivo. Idempotente.
-- Rollback en sql/25_rollback_descarga_reporte.sql
-- Verificacion en sql/25_verify_descarga_reporte.sql

CREATE TABLE IF NOT EXISTS descarga_reporte (
    id               integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    usuario_id       integer,
    usuario_email    text        NOT NULL,
    tipo             text        NOT NULL,
    formato          text        NOT NULL,
    filtros          jsonb       NOT NULL DEFAULT '{}'::jsonb,
    filas_exportadas integer     NOT NULL,
    ip               text,
    created_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT fk_descarga_reporte_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT chk_descarga_reporte_formato
        CHECK (formato IN ('excel', 'pdf')),
    CONSTRAINT chk_descarga_reporte_tipo_nonempty
        CHECK (length(tipo) > 0),
    CONSTRAINT chk_descarga_reporte_email_nonempty
        CHECK (length(usuario_email) > 0),
    CONSTRAINT chk_descarga_reporte_filas_no_negativas
        CHECK (filas_exportadas >= 0)
);

-- Consultas esperadas: "que descargo este usuario", "quien saco este reporte",
-- "que se exporto en tal periodo".
CREATE INDEX IF NOT EXISTS idx_descarga_reporte_usuario ON descarga_reporte (usuario_id);
CREATE INDEX IF NOT EXISTS idx_descarga_reporte_tipo    ON descarga_reporte (tipo);
CREATE INDEX IF NOT EXISTS idx_descarga_reporte_created ON descarga_reporte (created_at DESC);

-- IMPORTANTE al aplicar en el VPS: alli las migraciones se corren con
-- `sudo -u postgres`, lo que deja la tabla con owner postgres y sin permisos
-- para superstars_user (el API responderia 500). Correr ademas:
--   ALTER TABLE descarga_reporte OWNER TO superstars_user;
