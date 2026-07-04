-- ============================================================================
-- Rollback de la migracion 16: convocatoria -> concurso, monto -> monto_premio
-- ============================================================================
--
-- Este script revierte sql/16_rename_concurso_a_convocatoria.sql aplicando
-- los renames inversos. Mantiene la misma estructura por seccion para que sea
-- facil verificar la simetria.
--
-- Cuando usar este script:
--   * La migracion 16 corrio sin errores pero hay que volver atras (ej. la app
--     no funciona y no hay tiempo de debug).
--   * Solo aplicable si los TS layers (Drizzle/shared/api/web) AUN apuntan a
--     los nombres viejos. Si ya se desplego codigo con los nombres nuevos,
--     restaurar el backup en su lugar.
--
-- Si la migracion 16 fallo a la mitad: NO USAR ESTE SCRIPT. La migracion 16
-- se ejecuta en una sola transaccion, asi que un fallo dispara ROLLBACK
-- automatico y la BD queda intacta. Verificar con sql/16_verify_rename.sql.
--
-- ============================================================================

BEGIN;

-- 10. Trigger
ALTER TRIGGER trg_convocatoria_updated_at ON convocatoria RENAME TO trg_concurso_updated_at;

-- 9. Indices
ALTER INDEX idx_documento_convocatoria_id                RENAME TO idx_documento_concurso_id;
ALTER INDEX idx_evaluador_convocatoria_convocatoria_id   RENAME TO idx_evaluador_concurso_concurso_id;
ALTER INDEX idx_evaluador_convocatoria_evaluador_id      RENAME TO idx_evaluador_concurso_evaluador_id;
ALTER INDEX idx_postulacion_convocatoria_estado          RENAME TO idx_postulacion_concurso_estado;
ALTER INDEX idx_faq_convocatoria_id                      RENAME TO idx_faq_concurso_id;
ALTER INDEX idx_responsable_convocatoria_id              RENAME TO idx_responsable_concurso_id;

-- 8. Unique constraints
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT uq_evaluador_convocatoria             TO uq_evaluador_concurso;
ALTER TABLE formulario_dinamico       RENAME CONSTRAINT uq_formulario_convocatoria            TO uq_formulario_concurso;
ALTER TABLE postulacion               RENAME CONSTRAINT uq_postulacion_convocatoria_empresa   TO uq_postulacion_concurso_empresa;
ALTER TABLE responsable_convocatoria  RENAME CONSTRAINT uq_responsable_convocatoria_usuario   TO uq_responsable_concurso_usuario;
ALTER TABLE rubrica                   RENAME CONSTRAINT uq_rubrica_convocatoria               TO uq_rubrica_concurso;

-- 7. Foreign keys
ALTER TABLE convocatoria              RENAME CONSTRAINT fk_convocatoria_created_by              TO fk_concurso_created_by;
ALTER TABLE documento_convocatoria    RENAME CONSTRAINT fk_documento_convocatoria               TO fk_documento_concurso;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT fk_evaluador_convocatoria_asignado_por  TO fk_evaluador_concurso_asignado_por;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT fk_evaluador_convocatoria_convocatoria  TO fk_evaluador_concurso_concurso;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT fk_evaluador_convocatoria_evaluador     TO fk_evaluador_concurso_evaluador;
ALTER TABLE formulario_dinamico       RENAME CONSTRAINT fk_formulario_convocatoria              TO fk_formulario_concurso;
ALTER TABLE notificacion_email        RENAME CONSTRAINT fk_notificacion_convocatoria            TO fk_notificacion_concurso;
ALTER TABLE postulacion               RENAME CONSTRAINT fk_postulacion_convocatoria             TO fk_postulacion_concurso;
ALTER TABLE pregunta_frecuente        RENAME CONSTRAINT fk_faq_convocatoria                     TO fk_faq_concurso;
ALTER TABLE responsable_convocatoria  RENAME CONSTRAINT fk_responsable_convocatoria             TO fk_responsable_concurso;
ALTER TABLE rubrica                   RENAME CONSTRAINT fk_rubrica_convocatoria                 TO fk_rubrica_concurso;

-- 6. Check constraints
ALTER TABLE convocatoria RENAME CONSTRAINT chk_convocatoria_cierre_efectiva TO chk_concurso_cierre_efectiva;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_convocatoria_fechas          TO chk_concurso_fechas;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_convocatoria_ganadores       TO chk_concurso_ganadores;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_convocatoria_monto           TO chk_concurso_monto;
ALTER TABLE convocatoria RENAME CONSTRAINT chk_convocatoria_top_n           TO chk_concurso_top_n;

-- 5. Primary keys
ALTER TABLE convocatoria              RENAME CONSTRAINT convocatoria_pkey              TO concurso_pkey;
ALTER TABLE documento_convocatoria    RENAME CONSTRAINT documento_convocatoria_pkey    TO documento_concurso_pkey;
ALTER TABLE evaluador_convocatoria    RENAME CONSTRAINT evaluador_convocatoria_pkey    TO evaluador_concurso_pkey;
ALTER TABLE responsable_convocatoria  RENAME CONSTRAINT responsable_convocatoria_pkey  TO responsable_concurso_pkey;

-- 4. Secuencias
ALTER SEQUENCE convocatoria_id_seq              RENAME TO concurso_id_seq;
ALTER SEQUENCE documento_convocatoria_id_seq    RENAME TO documento_concurso_id_seq;
ALTER SEQUENCE evaluador_convocatoria_id_seq    RENAME TO evaluador_concurso_id_seq;
ALTER SEQUENCE responsable_convocatoria_id_seq  RENAME TO responsable_concurso_id_seq;

-- 3. Tablas
ALTER TABLE convocatoria              RENAME TO concurso;
ALTER TABLE documento_convocatoria    RENAME TO documento_concurso;
ALTER TABLE evaluador_convocatoria    RENAME TO evaluador_concurso;
ALTER TABLE responsable_convocatoria  RENAME TO responsable_concurso;

-- 2. Columnas
ALTER TABLE concurso              RENAME COLUMN monto             TO monto_premio;
ALTER TABLE documento_concurso    RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE evaluador_concurso    RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE formulario_dinamico   RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE notificacion_email    RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE postulacion           RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE pregunta_frecuente    RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE responsable_concurso  RENAME COLUMN convocatoria_id   TO concurso_id;
ALTER TABLE rubrica               RENAME COLUMN convocatoria_id   TO concurso_id;

-- 1. ENUMs
ALTER TYPE estado_convocatoria RENAME TO estado_concurso;
ALTER TYPE rol_usuario RENAME VALUE 'responsable_convocatoria' TO 'responsable_concurso';

COMMIT;
