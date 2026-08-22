-- ============================================================================
-- Verificacion de la migracion 23 (rol observador)
-- Correr DESPUES de aplicar sql/23_rol_observador.sql
-- ============================================================================

\echo '--- 1. El enum rol_usuario tiene 5 valores, observador al final ---'
SELECT e.enumlabel, e.enumsortorder
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'rol_usuario'
ORDER BY e.enumsortorder;

\echo '--- 2. observador existe (esperado: 1 fila) ---'
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'rol_usuario' AND e.enumlabel = 'observador';

\echo '--- 3. Los 4 roles originales siguen intactos (esperado: 4 filas) ---'
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'rol_usuario'
  AND e.enumlabel IN ('administrador','responsable_convocatoria','proponente','evaluador')
ORDER BY e.enumsortorder;

\echo '--- 4. usuario.rol sigue siendo NOT NULL y del tipo correcto ---'
SELECT column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuario' AND column_name = 'rol';

\echo '--- 5. Reparto actual de usuarios por rol (nadie deberia ser observador todavia) ---'
SELECT rol, count(*) AS usuarios
FROM usuario
GROUP BY rol
ORDER BY rol;

\echo '--- 6. Prueba de aceptacion: el tipo acepta un valor observador ---'
\echo '    (castea sin insertar nada; si el enum estuviera mal, esto falla)'
SELECT 'observador'::rol_usuario AS cast_ok;
