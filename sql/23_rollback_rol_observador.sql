-- ============================================================================
-- Rollback de la migracion 23: quitar el valor 'observador' del enum rol_usuario
-- ============================================================================
--
-- PostgreSQL NO permite borrar un valor de un enum (no existe ALTER TYPE ...
-- DROP VALUE). La unica forma es recrear el tipo completo y migrar la columna
-- que lo usa. Por eso este rollback es mas largo que la migracion.
--
-- Verificado contra el esquema antes de escribir esto:
--   * rol_usuario lo usa UNA sola columna: usuario.rol (NOT NULL, sin default)
--   * no hay CHECK constraints sobre esa columna
--   * no hay indices sobre usuario.rol
--   * no hay vistas que dependan del tipo
--   * el unico trigger de usuario (trg_usuario_updated_at) es de tabla y no se
--     ve afectado por cambiar el tipo de una columna
-- Si alguna de esas condiciones cambio, revisar antes de correr esto.
--
-- Cuando usarlo: la migracion 23 se aplico pero hay que volver atras y el
-- codigo TS (Drizzle/shared/api/web) todavia NO conoce el rol nuevo.
--
-- IMPORTANTE: falla a proposito si existe algun usuario con rol 'observador'.
-- Borrar o reasignar esos usuarios primero; el rollback no decide por vos a
-- que rol moverlos.
-- ============================================================================

BEGIN;

-- 1. Guardia: no se puede quitar el valor si hay filas usandolo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM usuario WHERE rol = 'observador') THEN
    RAISE EXCEPTION
      'Hay % usuario(s) con rol observador. Reasignalos o borralos antes del rollback.',
      (SELECT count(*) FROM usuario WHERE rol = 'observador');
  END IF;
END
$$;

-- 2. Apartar el tipo actual
ALTER TYPE rol_usuario RENAME TO rol_usuario_old;

-- 3. Recrear el tipo con los 4 valores originales, en el orden original
CREATE TYPE rol_usuario AS ENUM (
    'administrador',
    'responsable_convocatoria',
    'proponente',
    'evaluador'
);

-- 4. Migrar la columna al tipo nuevo (pasa por text; seguro porque el paso 1
--    garantiza que ningun valor existente es 'observador')
ALTER TABLE usuario
  ALTER COLUMN rol TYPE rol_usuario USING rol::text::rol_usuario;

-- 5. Descartar el tipo viejo
DROP TYPE rol_usuario_old;

COMMIT;
