-- 01_schema.sql
-- Ejecutar contra superstars_db:
--   PGPASSWORD=12345 "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d superstars_db -f sql/01_schema.sql
--
-- Decisiones de diseno (de research_postgresql_diseno.md):
--   - TEXT en vez de VARCHAR(N): constrain con CHECK cuando sea necesario
--   - TIMESTAMPTZ en vez de TIMESTAMP: siempre con timezone
--   - INT GENERATED ALWAYS AS IDENTITY en vez de SERIAL: estandar SQL
--   - Campos eliminados por YAGNI: ver plan de diseno

BEGIN;

-- ============================================================
-- ENUMS (7)
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
    'administrador',
    'responsable_concurso',
    'proponente',
    'evaluador'
);

CREATE TYPE estado_concurso AS ENUM (
    'borrador',
    'publicado',
    'cerrado',
    'en_evaluacion',
    'finalizado'
);

CREATE TYPE estado_postulacion AS ENUM (
    'borrador',
    'enviado',
    'observado',
    'rechazado',
    'en_evaluacion',
    'calificado',
    'ganador',
    'no_seleccionado'
);

CREATE TYPE nivel_enum AS ENUM (
    'basico',
    'intermedio',
    'avanzado'
);

CREATE TYPE tipo_criterio AS ENUM (
    'economico',
    'tecnico',
    'medioambiental',
    'social',
    'financiero'
);

CREATE TYPE estado_calificacion AS ENUM (
    'en_progreso',
    'completado',
    'aprobado',
    'devuelto'
);

CREATE TYPE tipo_notificacion AS ENUM (
    'observacion_propuesta',
    'rechazo_propuesta',
    'asignacion_evaluador',
    'devolucion_calificacion',
    'propuesta_calificada',
    'propuesta_ganadora',
    'propuesta_no_seleccionada',
    'general'
);

-- ============================================================
-- FUNCION TRIGGER: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLAS (17)
-- ============================================================

-- 1. USUARIO (8 cols)
CREATE TABLE usuario (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       TEXT        NOT NULL,
    password_hash TEXT      NOT NULL,
    rol         rol_usuario NOT NULL,
    nombre      TEXT        NOT NULL,
    activo      BOOLEAN     NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_usuario_email UNIQUE (email)
);

CREATE TRIGGER trg_usuario_updated_at
    BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 2. EMPRESA (30 cols)
CREATE TABLE empresa (
    id                          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id                  INT         NOT NULL,

    -- Datos legales (Q7-Q8)
    razon_social                TEXT        NOT NULL,
    nit                         TEXT        NOT NULL,
    registro_seprec             TEXT,
    tipo_empresa                TEXT,

    -- Datos generales (Q9-Q16)
    numero_socios               TEXT,
    num_empleados_mujeres       INT,
    num_empleados_hombres       INT,
    rubro                       TEXT,
    anio_fundacion              INT,
    departamento                TEXT,
    ciudad                      TEXT,
    direccion                   TEXT,
    telefono                    TEXT,
    descripcion                 TEXT,

    -- Perfil comercial (Q17-Q21)
    etapa                       TEXT,
    tipo_relacion_comercial     TEXT[],
    ubicacion_clientes          TEXT[],
    departamentos_clientes      TEXT[],
    productos_servicios         TEXT,

    -- Registros de la empresa (Q24-Q25)
    tipo_registros              TEXT,
    metodo_registros            TEXT,

    -- Presencia digital (Q29)
    redes_sociales              JSONB,

    -- Persona de contacto (Q2-Q5)
    contacto_cargo              TEXT,
    contacto_telefono           TEXT,
    contacto_genero             TEXT,
    contacto_fecha_nacimiento   DATE,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_empresa_usuario  UNIQUE (usuario_id),
    CONSTRAINT uq_empresa_nit      UNIQUE (nit),
    CONSTRAINT fk_empresa_usuario  FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_empresa_updated_at
    BEFORE UPDATE ON empresa
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 3. CONCURSO (16 cols)
CREATE TABLE concurso (
    id                              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre                          TEXT            NOT NULL,
    descripcion                     TEXT,
    bases                           TEXT,
    fecha_inicio_postulacion        DATE            NOT NULL,
    fecha_cierre_postulacion        DATE            NOT NULL,
    fecha_anuncio_ganadores         DATE,
    monto_premio                    NUMERIC(12,2)   NOT NULL,
    numero_ganadores                INT             NOT NULL DEFAULT 3,
    top_n_sistema                   INT             NOT NULL DEFAULT 5,
    departamentos                   TEXT[]          NOT NULL,
    estado                          estado_concurso NOT NULL DEFAULT 'borrador',
    fecha_publicacion_resultados    TIMESTAMPTZ,
    created_by                      INT             NOT NULL,
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT fk_concurso_created_by FOREIGN KEY (created_by) REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT chk_concurso_fechas    CHECK (fecha_cierre_postulacion >= fecha_inicio_postulacion),
    CONSTRAINT chk_concurso_monto     CHECK (monto_premio > 0),
    CONSTRAINT chk_concurso_ganadores CHECK (numero_ganadores > 0),
    CONSTRAINT chk_concurso_top_n     CHECK (top_n_sistema > 0)
);

CREATE TRIGGER trg_concurso_updated_at
    BEFORE UPDATE ON concurso
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 4. RESPONSABLE_CONCURSO (4 cols, sin activo)
CREATE TABLE responsable_concurso (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concurso_id INT         NOT NULL,
    usuario_id  INT         NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_responsable_concurso_usuario UNIQUE (concurso_id, usuario_id),
    CONSTRAINT fk_responsable_concurso         FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE CASCADE,
    CONSTRAINT fk_responsable_usuario          FOREIGN KEY (usuario_id)  REFERENCES usuario(id)  ON DELETE RESTRICT
);

-- 5. DOCUMENTO_CONCURSO (9 cols, sin descripcion)
CREATE TABLE documento_concurso (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concurso_id     INT         NOT NULL,
    nombre          TEXT        NOT NULL,
    storage_key     TEXT        NOT NULL,
    nombre_original TEXT        NOT NULL,
    mime_type       TEXT        NOT NULL,
    tamano_bytes    BIGINT      NOT NULL,
    orden           INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_documento_concurso FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE CASCADE,
    CONSTRAINT chk_documento_tamano  CHECK (tamano_bytes > 0)
);

-- 6. FORMULARIO_DINAMICO (8 cols, sin activo)
CREATE TABLE formulario_dinamico (
    id                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concurso_id       INT         NOT NULL,
    nombre            TEXT        NOT NULL,
    descripcion       TEXT,
    schema_definition JSONB       NOT NULL,
    version           INT         NOT NULL DEFAULT 1,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_formulario_concurso UNIQUE (concurso_id),
    CONSTRAINT fk_formulario_concurso FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE CASCADE,
    CONSTRAINT chk_formulario_version CHECK (version >= 1)
);

CREATE TRIGGER trg_formulario_updated_at
    BEFORE UPDATE ON formulario_dinamico
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 7. POSTULACION (14 cols)
CREATE TABLE postulacion (
    id                    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concurso_id           INT                 NOT NULL,
    empresa_id            INT                 NOT NULL,
    estado                estado_postulacion  NOT NULL DEFAULT 'borrador',
    response_data         JSONB               NOT NULL DEFAULT '{}',
    schema_version        INT                 NOT NULL DEFAULT 1,
    porcentaje_completado NUMERIC(5,2)        NOT NULL DEFAULT 0,
    fecha_envio           TIMESTAMPTZ,
    observacion           TEXT,
    puntaje_final         NUMERIC(6,2),
    posicion_final        INT,
    created_at            TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT uq_postulacion_concurso_empresa UNIQUE (concurso_id, empresa_id),
    CONSTRAINT fk_postulacion_concurso         FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE RESTRICT,
    CONSTRAINT fk_postulacion_empresa          FOREIGN KEY (empresa_id)  REFERENCES empresa(id)  ON DELETE RESTRICT,
    CONSTRAINT chk_postulacion_porcentaje      CHECK (porcentaje_completado BETWEEN 0 AND 100),
    CONSTRAINT chk_postulacion_puntaje         CHECK (puntaje_final IS NULL OR puntaje_final >= 0),
    CONSTRAINT chk_postulacion_posicion        CHECK (posicion_final IS NULL OR posicion_final > 0)
);

CREATE TRIGGER trg_postulacion_updated_at
    BEFORE UPDATE ON postulacion
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 8. ARCHIVO_POSTULACION (8 cols)
CREATE TABLE archivo_postulacion (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    postulacion_id  INT         NOT NULL,
    field_id        TEXT        NOT NULL,
    nombre_original TEXT        NOT NULL,
    storage_key     TEXT        NOT NULL,
    mime_type       TEXT        NOT NULL,
    tamano_bytes    BIGINT      NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_archivo_postulacion FOREIGN KEY (postulacion_id) REFERENCES postulacion(id) ON DELETE CASCADE,
    CONSTRAINT chk_archivo_tamano     CHECK (tamano_bytes > 0)
);

-- 9. RUBRICA (7 cols)
CREATE TABLE rubrica (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    concurso_id   INT           NOT NULL,
    nombre        TEXT          NOT NULL,
    descripcion   TEXT,
    puntaje_total NUMERIC(6,2)  NOT NULL DEFAULT 100,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_rubrica_concurso UNIQUE (concurso_id),
    CONSTRAINT fk_rubrica_concurso FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE CASCADE,
    CONSTRAINT chk_rubrica_puntaje CHECK (puntaje_total > 0)
);

CREATE TRIGGER trg_rubrica_updated_at
    BEFORE UPDATE ON rubrica
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 10. CRITERIO (7 cols)
CREATE TABLE criterio (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rubrica_id      INT           NOT NULL,
    tipo            tipo_criterio NOT NULL,
    nombre          TEXT          NOT NULL,
    descripcion     TEXT,
    peso_porcentaje NUMERIC(5,2)  NOT NULL,
    orden           INT           NOT NULL,

    CONSTRAINT fk_criterio_rubrica    FOREIGN KEY (rubrica_id) REFERENCES rubrica(id) ON DELETE CASCADE,
    CONSTRAINT chk_criterio_peso      CHECK (peso_porcentaje > 0 AND peso_porcentaje <= 100),
    CONSTRAINT chk_criterio_orden     CHECK (orden > 0)
);

-- 11. SUB_CRITERIO (6 cols)
CREATE TABLE sub_criterio (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    criterio_id     INT          NOT NULL,
    nombre          TEXT         NOT NULL,
    descripcion     TEXT,
    peso_porcentaje NUMERIC(5,2) NOT NULL,
    orden           INT          NOT NULL,

    CONSTRAINT fk_sub_criterio_criterio FOREIGN KEY (criterio_id) REFERENCES criterio(id) ON DELETE CASCADE,
    CONSTRAINT chk_sub_criterio_peso    CHECK (peso_porcentaje > 0 AND peso_porcentaje <= 100),
    CONSTRAINT chk_sub_criterio_orden   CHECK (orden > 0)
);

-- 12. NIVEL_EVALUACION (6 cols)
CREATE TABLE nivel_evaluacion (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sub_criterio_id INT          NOT NULL,
    nivel           nivel_enum   NOT NULL,
    descripcion     TEXT         NOT NULL,
    puntaje_min     NUMERIC(5,2) NOT NULL,
    puntaje_max     NUMERIC(5,2) NOT NULL,

    CONSTRAINT uq_nivel_sub_criterio_nivel UNIQUE (sub_criterio_id, nivel),
    CONSTRAINT fk_nivel_sub_criterio       FOREIGN KEY (sub_criterio_id) REFERENCES sub_criterio(id) ON DELETE CASCADE,
    CONSTRAINT chk_nivel_rango             CHECK (puntaje_max >= puntaje_min AND puntaje_min >= 0)
);

-- 13. ASIGNACION_EVALUADOR (5 cols, sin activo)
CREATE TABLE asignacion_evaluador (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    postulacion_id  INT         NOT NULL,
    evaluador_id    INT         NOT NULL,
    asignado_por    INT         NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_asignacion_postulacion_evaluador UNIQUE (postulacion_id, evaluador_id),
    CONSTRAINT fk_asignacion_postulacion           FOREIGN KEY (postulacion_id) REFERENCES postulacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_asignacion_evaluador             FOREIGN KEY (evaluador_id)   REFERENCES usuario(id)     ON DELETE RESTRICT,
    CONSTRAINT fk_asignacion_asignado_por          FOREIGN KEY (asignado_por)   REFERENCES usuario(id)     ON DELETE RESTRICT
);

-- 14. CALIFICACION (9 cols)
CREATE TABLE calificacion (
    id                      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    postulacion_id          INT                 NOT NULL,
    evaluador_id            INT                 NOT NULL,
    puntaje_total           NUMERIC(6,2),
    estado                  estado_calificacion NOT NULL DEFAULT 'en_progreso',
    comentario_general      TEXT,
    comentario_responsable  TEXT,
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT uq_calificacion_postulacion_evaluador UNIQUE (postulacion_id, evaluador_id),
    CONSTRAINT fk_calificacion_postulacion           FOREIGN KEY (postulacion_id) REFERENCES postulacion(id) ON DELETE RESTRICT,
    CONSTRAINT fk_calificacion_evaluador             FOREIGN KEY (evaluador_id)   REFERENCES usuario(id)     ON DELETE RESTRICT,
    CONSTRAINT chk_calificacion_puntaje              CHECK (puntaje_total IS NULL OR puntaje_total >= 0)
);

CREATE TRIGGER trg_calificacion_updated_at
    BEFORE UPDATE ON calificacion
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 15. CALIFICACION_DETALLE (5 cols)
CREATE TABLE calificacion_detalle (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    calificacion_id INT          NOT NULL,
    sub_criterio_id INT          NOT NULL,
    puntaje         NUMERIC(5,2) NOT NULL,
    justificacion   TEXT,

    CONSTRAINT uq_detalle_calificacion_sub_criterio UNIQUE (calificacion_id, sub_criterio_id),
    CONSTRAINT fk_detalle_calificacion              FOREIGN KEY (calificacion_id) REFERENCES calificacion(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_sub_criterio              FOREIGN KEY (sub_criterio_id) REFERENCES sub_criterio(id) ON DELETE RESTRICT,
    CONSTRAINT chk_detalle_puntaje                  CHECK (puntaje >= 0)
);

-- 16. NOTIFICACION_EMAIL (13 cols)
CREATE TABLE notificacion_email (
    id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    destinatario_id INT                 NOT NULL,
    remitente_id    INT,
    concurso_id     INT,
    postulacion_id  INT,
    tipo            tipo_notificacion   NOT NULL,
    asunto          TEXT                NOT NULL,
    contenido       TEXT                NOT NULL,
    enviado         BOOLEAN             NOT NULL DEFAULT false,
    fecha_envio     TIMESTAMPTZ,
    error_envio     TEXT,
    intentos        INT                 NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT fk_notificacion_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuario(id)      ON DELETE RESTRICT,
    CONSTRAINT fk_notificacion_remitente    FOREIGN KEY (remitente_id)    REFERENCES usuario(id)      ON DELETE SET NULL,
    CONSTRAINT fk_notificacion_concurso     FOREIGN KEY (concurso_id)     REFERENCES concurso(id)     ON DELETE SET NULL,
    CONSTRAINT fk_notificacion_postulacion  FOREIGN KEY (postulacion_id)  REFERENCES postulacion(id)  ON DELETE SET NULL,
    CONSTRAINT chk_notificacion_intentos    CHECK (intentos >= 0)
);

-- 17. SESION_REFRESH_TOKEN (8 cols)
CREATE TABLE sesion_refresh_token (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  INT         NOT NULL,
    token_hash  TEXT        NOT NULL,
    expira_en   TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    family_id   TEXT        NOT NULL,
    revocado_en TIMESTAMPTZ,
    replaced_by INT,

    CONSTRAINT uq_sesion_token_hash  UNIQUE (token_hash),
    CONSTRAINT fk_sesion_usuario     FOREIGN KEY (usuario_id)  REFERENCES usuario(id)              ON DELETE CASCADE,
    CONSTRAINT fk_sesion_replaced_by FOREIGN KEY (replaced_by) REFERENCES sesion_refresh_token(id)  ON DELETE SET NULL
);

-- ============================================================
-- INDICES
-- ============================================================
-- Nota: UNIQUE constraints ya crean indices automaticamente.
-- Solo creamos indices adicionales para FK usadas en JOINs
-- frecuentes y queries comunes.

-- responsable_concurso: buscar responsables de un concurso / concursos de un usuario
CREATE INDEX idx_responsable_concurso_id ON responsable_concurso(concurso_id);
CREATE INDEX idx_responsable_usuario_id  ON responsable_concurso(usuario_id);

-- documento_concurso: listar documentos de un concurso
CREATE INDEX idx_documento_concurso_id ON documento_concurso(concurso_id);

-- formulario_dinamico: busqueda JSONB
CREATE INDEX idx_formulario_schema_gin ON formulario_dinamico USING GIN (schema_definition jsonb_path_ops);

-- postulacion: listar postulaciones por concurso con filtro de estado (query mas comun)
CREATE INDEX idx_postulacion_concurso_estado ON postulacion(concurso_id, estado);
CREATE INDEX idx_postulacion_empresa_id      ON postulacion(empresa_id);

-- archivo_postulacion: listar archivos de una postulacion
CREATE INDEX idx_archivo_postulacion_id ON archivo_postulacion(postulacion_id);

-- criterio: listar criterios de una rubrica
CREATE INDEX idx_criterio_rubrica_id ON criterio(rubrica_id);

-- sub_criterio: listar sub-criterios de un criterio
CREATE INDEX idx_sub_criterio_criterio_id ON sub_criterio(criterio_id);

-- asignacion_evaluador: buscar asignaciones por evaluador
CREATE INDEX idx_asignacion_evaluador_id ON asignacion_evaluador(evaluador_id);

-- calificacion: buscar calificaciones por evaluador
CREATE INDEX idx_calificacion_evaluador_id ON calificacion(evaluador_id);

-- notificacion_email: listar notificaciones de un usuario
CREATE INDEX idx_notificacion_destinatario_id ON notificacion_email(destinatario_id);

-- sesion_refresh_token: buscar sesiones de un usuario
CREATE INDEX idx_sesion_usuario_id ON sesion_refresh_token(usuario_id);

-- sesion_refresh_token: buscar tokens por familia
CREATE INDEX idx_sesion_family_id ON sesion_refresh_token(family_id);

-- sesion_refresh_token: buscar tokens activos por expiracion (cleanup cron)
CREATE INDEX idx_sesion_expira_en ON sesion_refresh_token(expira_en) WHERE revocado_en IS NULL;

COMMIT;
