-- ============================================================================
-- Migracion 16: rename "concurso" -> "convocatoria" y "monto_premio" -> "monto"
-- ============================================================================
--
-- Motivo: requisito legal/contractual del cliente (ONG) que prohibe el uso de
-- la palabra "concurso" y "premio" por asociacion con juego/apuestas.
--
-- Alcance (verificado contra information_schema y pg_catalog):
--   * 4 tablas       -> renombradas
--   * 9 columnas     -> renombradas (8 FK + 1 monto_premio)
--   * 1 ENUM type    -> renombrado (estado_concurso)
--   * 1 ENUM value   -> renombrado (rol_usuario.responsable_concurso)
--   * 25 constraints -> renombrados (5 check, 4 pkey, 11 fk, 5 unique)
--   * 6 indices      -> renombrados (los no-derivados de constraints)
--   * 4 secuencias   -> renombradas (auto-IDENTITY)
--   * 1 trigger      -> renombrado
--
-- Naturaleza del cambio:
--   * Solo cambios de metadata del catalogo (catalog rename). 0 cambios de datos.
--   * PostgreSQL actualiza automaticamente las dependencias internas:
--       - CHECK ((monto_premio > 0)) se reescribe a CHECK ((monto > 0))
--       - FK ... REFERENCES concurso(id) se reescribe a REFERENCES convocatoria(id)
--       - 'borrador'::estado_concurso se reescribe a 'borrador'::estado_convocatoria
--       - usuario.rol = 'responsable_concurso' queda como 'responsable_convocatoria'
--   * Ejecucion 100% transaccional: si algo falla, ROLLBACK automatico.
--   * Tiempo esperado: < 1 segundo. Cada ALTER toma ACCESS EXCLUSIVE lock por
--     microsegundos (no copia datos, solo edita catalog).
--
-- PRE-REQUISITOS antes de ejecutar:
--   1. Backup creado: backups/superstars_pre_rename_concurso_*.sql
--   2. API/web detenida (sino la app actual rompera al consultar tablas viejas)
--   3. Los paquetes TypeScript (Drizzle/shared/api/web) deben actualizarse
--      DESPUES de aplicar esta migracion.
--
-- Para revertir:
--   * Opcion A: ejecutar sql/16_rollback_rename_concurso.sql
--   * Opcion B: restaurar el backup pre-migracion
--
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ENUMs
-- ---------------------------------------------------------------------------

-- Renombrar el valor 'responsable_concurso' del enum rol_usuario.
-- Las filas existentes en usuario.rol con este valor quedan automaticamente
-- como 'responsable_convocatoria' (rename solo cambia el label, no los datos).
ALTER TYPE rol_usuario RENAME VALUE 'responsable_concurso' TO 'responsable_convocatoria';

-- Renombrar el tipo enum completo (los 6 valores internos no contienen
-- "concurso" — borrador/publicado/cerrado/en_evaluacion/resultados_listos/finalizado)
ALTER TYPE estado_concurso RENAME TO estado_convocatoria;

-- ---------------------------------------------------------------------------
-- 2. Columnas (renombradas ANTES de las tablas para legibilidad)
-- ---------------------------------------------------------------------------

ALTER TABLE concurso              RENAME COLUMN monto_premio TO monto;

ALTER TABLE documento_concurso    RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE evaluador_concurso    RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE formulario_dinamico   RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE notificacion_email    RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE postulacion           RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE pregunta_frecuente    RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE responsable_concurso  RENAME COLUMN concurso_id  TO convocatoria_id;
ALTER TABLE rubrica               RENAME COLUMN concurso_id  TO convocatoria_id;

-- ---------------------------------------------------------------------------
-- 3. Tablas
-- ---------------------------------------------------------------------------

ALTER TABLE concurso              RENAME TO convocatoria;
ALTER TABLE documento_concurso    RENAME TO documento_convocatoria;
ALTER TABLE evaluador_concurso    RENAME TO evaluador_convocatoria;
ALTER TABLE responsable_concurso  RENAME TO responsable_convocatoria;

-- ---------------------------------------------------------------------------
-- 4. Secuencias IDENTITY (PostgreSQL no las renombra auto al renombrar tabla)
-- ---------------------------------------------------------------------------

ALTER SEQUENCE concurso_id_seq              RENAME TO convocatoria_id_seq;
ALTER SEQUENCE documento_concurso_id_seq    RENAME TO documento_convocatoria_id_seq;
ALTER SEQUENCE evaluador_concurso_id_seq    RENAME TO evaluador_convocatoria_id_seq;
ALTER SEQUENCE responsable_concurso_id_seq  RENAME TO responsable_convocatoria_id_seq;

-- ---------------------------------------------------------------------------
-- 5. Primary keys (PG conserva los pkey con nombre antiguo tras rename de tabla)
-- ---------------------------------------------------------------------------

ALTER TABLE convocatoria              RENAME CONSTRAINT concurso_pkey              TO convocatoria_pkey;
ALTER TABLE documento_convocatoria    RENAME CONSTRAINT documento_concurso_pkey    TO documento_convocatoria_pkey;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT evaluador_concurso_pkey    TO evaluador_convocatoria_pkey;
ALTER TABLE responsable_convocatoria  RENAME CONSTRAINT responsable_concurso_pkey  TO responsable_convocatoria_pkey;

-- ---------------------------------------------------------------------------
-- 6. Check constraints (la expresion interna se actualiza sola)
-- ---------------------------------------------------------------------------

ALTER TABLE convocatoria RENAME CONSTRAINT chk_concurso_cierre_efectiva TO chk_convocatoria_cierre_efectiva;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_concurso_fechas          TO chk_convocatoria_fechas;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_concurso_ganadores       TO chk_convocatoria_ganadores;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_concurso_monto           TO chk_convocatoria_monto;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_concurso_top_n           TO chk_convocatoria_top_n;

-- ---------------------------------------------------------------------------
-- 7. Foreign keys (las referencias REFERENCES se actualizan solas)
-- ---------------------------------------------------------------------------

ALTER TABLE convocatoria              RENAME CONSTRAINT fk_concurso_created_by             TO fk_convocatoria_created_by;
ALTER TABLE documento_convocatoria    RENAME CONSTRAINT fk_documento_concurso              TO fk_documento_convocatoria;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT fk_evaluador_concurso_asignado_por TO fk_evaluador_convocatoria_asignado_por;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT fk_evaluador_concurso_concurso     TO fk_evaluador_convocatoria_convocatoria;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT fk_evaluador_concurso_evaluador    TO fk_evaluador_convocatoria_evaluador;
ALTER TABLE formulario_dinamico       RENAME CONSTRAINT fk_formulario_concurso             TO fk_formulario_convocatoria;
ALTER TABLE notificacion_email        RENAME CONSTRAINT fk_notificacion_concurso           TO fk_notificacion_convocatoria;
ALTER TABLE postulacion               RENAME CONSTRAINT fk_postulacion_concurso            TO fk_postulacion_convocatoria;
ALTER TABLE pregunta_frecuente        RENAME CONSTRAINT fk_faq_concurso                    TO fk_faq_convocatoria;
ALTER TABLE responsable_convocatoria  RENAME CONSTRAINT fk_responsable_concurso            TO fk_responsable_convocatoria;
ALTER TABLE rubrica                   RENAME CONSTRAINT fk_rubrica_concurso                TO fk_rubrica_convocatoria;

-- ---------------------------------------------------------------------------
-- 8. Unique constraints
-- ---------------------------------------------------------------------------

ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT uq_evaluador_concurso           TO uq_evaluador_convocatoria;
ALTER TABLE formulario_dinamico       RENAME CONSTRAINT uq_formulario_concurso          TO uq_formulario_convocatoria;
ALTER TABLE postulacion               RENAME CONSTRAINT uq_postulacion_concurso_empresa TO uq_postulacion_convocatoria_empresa;
ALTER TABLE responsable_convocatoria  RENAME CONSTRAINT uq_responsable_concurso_usuario TO uq_responsable_convocatoria_usuario;
ALTER TABLE rubrica                   RENAME CONSTRAINT uq_rubrica_concurso             TO uq_rubrica_convocatoria;

-- ---------------------------------------------------------------------------
-- 9. Indices no derivados de constraints
-- ---------------------------------------------------------------------------

ALTER INDEX idx_documento_concurso_id           RENAME TO idx_documento_convocatoria_id;
ALTER INDEX idx_evaluador_concurso_concurso_id  RENAME TO idx_evaluador_convocatoria_convocatoria_id;
ALTER INDEX idx_evaluador_concurso_evaluador_id RENAME TO idx_evaluador_convocatoria_evaluador_id;
ALTER INDEX idx_postulacion_concurso_estado     RENAME TO idx_postulacion_convocatoria_estado;
ALTER INDEX idx_faq_concurso_id                 RENAME TO idx_faq_convocatoria_id;
ALTER INDEX idx_responsable_concurso_id         RENAME TO idx_responsable_convocatoria_id;

-- ---------------------------------------------------------------------------
-- 10. Trigger updated_at
-- ---------------------------------------------------------------------------

ALTER TRIGGER trg_concurso_updated_at ON convocatoria RENAME TO trg_convocatoria_updated_at;

COMMIT;

-- ============================================================================
-- Fin de migracion. Ejecutar sql/16_verify_rename.sql para validar integridad.
-- ============================================================================
