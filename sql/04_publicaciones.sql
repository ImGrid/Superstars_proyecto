-- 04_publicaciones.sql

BEGIN;

-- ENUM
CREATE TYPE estado_publicacion AS ENUM (
    'borrador',
    'programado',
    'publicado',
    'expirado',
    'archivado'
);

-- Tabla: categoria_publicacion
CREATE TABLE categoria_publicacion (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      TEXT    NOT NULL,
    slug        TEXT    NOT NULL,
    descripcion TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_categoria_publicacion_slug   UNIQUE (slug),
    CONSTRAINT uq_categoria_publicacion_nombre UNIQUE (nombre)
);

-- Tabla: publicacion
CREATE TABLE publicacion (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo                  TEXT                NOT NULL,
    slug                    TEXT                NOT NULL,
    extracto                TEXT,
    contenido               TEXT                NOT NULL,
    categoria_id            INT,
    imagen_destacada_key    TEXT,
    estado                  estado_publicacion  NOT NULL DEFAULT 'borrador',
    fecha_publicacion       TIMESTAMPTZ,
    fecha_expiracion        TIMESTAMPTZ,
    destacado               BOOLEAN             NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT uq_publicacion_slug      UNIQUE (slug),
    CONSTRAINT fk_publicacion_categoria FOREIGN KEY (categoria_id) REFERENCES categoria_publicacion(id) ON DELETE SET NULL,
    CONSTRAINT chk_publicacion_fechas   CHECK (
        fecha_expiracion IS NULL OR fecha_publicacion IS NULL
        OR fecha_expiracion > fecha_publicacion
    )
);

CREATE TRIGGER trg_publicacion_updated_at
    BEFORE UPDATE ON publicacion
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indices
CREATE INDEX idx_publicacion_estado_fecha  ON publicacion(estado, fecha_publicacion DESC) WHERE estado = 'publicado';
CREATE INDEX idx_publicacion_categoria_id  ON publicacion(categoria_id);
CREATE INDEX idx_publicacion_programadas   ON publicacion(fecha_publicacion) WHERE estado = 'programado';
CREATE INDEX idx_publicacion_expiracion    ON publicacion(fecha_expiracion) WHERE estado = 'publicado' AND fecha_expiracion IS NOT NULL;

COMMIT;
