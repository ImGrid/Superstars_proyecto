-- ============================================================================
-- Verificacion de la limpieza 26 (usuarios de prueba)
-- Correr DESPUES de aplicar sql/26_limpiar_usuarios_de_prueba.sql
-- ============================================================================

\echo '--- 1. Los tres correos de prueba ya no existen (esperado: 0 filas) ---'
SELECT id, email, rol
FROM usuario
WHERE email IN ('innovaplast@test.com', 'ecoverde@test.com', 'poncehar0331+prueba1@gmail.com');

\echo '--- 2. La cuenta de prueba del equipo SIGUE existiendo (esperado: 1 fila) ---'
\echo '    Sin ella no se puede entrar al portal como proponente.'
SELECT id, email, nombre, rol, activo
FROM usuario
WHERE email = 'proponente@superstars.com';

\echo '--- 3. La cuenta poncehar0331@gmail.com sigue intacta con su empresa ---'
SELECT u.id, u.email, u.rol, e.id AS empresa_id, e.razon_social
FROM usuario u
LEFT JOIN empresa e ON e.usuario_id = u.id
WHERE u.email = 'poncehar0331@gmail.com';

\echo '--- 4. Reparto de usuarios por rol despues de la limpieza ---'
SELECT rol, count(*) AS usuarios
FROM usuario
GROUP BY rol
ORDER BY rol;

\echo '--- 5. No quedaron huerfanos: toda empresa tiene su usuario (esperado: 0) ---'
SELECT e.id, e.razon_social, e.usuario_id
FROM empresa e
LEFT JOIN usuario u ON u.id = e.usuario_id
WHERE u.id IS NULL;

\echo '--- 6. No quedaron huerfanos: toda postulacion tiene su empresa (esperado: 0) ---'
SELECT p.id, p.empresa_id
FROM postulacion p
LEFT JOIN empresa e ON e.id = p.empresa_id
WHERE e.id IS NULL;

\echo '--- 7. No quedaron sesiones de usuarios inexistentes (esperado: 0) ---'
SELECT s.id, s.usuario_id
FROM sesion_refresh_token s
LEFT JOIN usuario u ON u.id = s.usuario_id
WHERE u.id IS NULL;

\echo '--- 8. Totales que alimentan los reportes ---'
SELECT
    (SELECT count(*) FROM usuario)                          AS usuarios,
    (SELECT count(*) FROM usuario WHERE rol = 'proponente') AS proponentes,
    (SELECT count(*) FROM empresa)                          AS empresas,
    (SELECT count(*) FROM postulacion)                      AS postulaciones;

\echo '--- 9. Correos de aspecto de prueba que TODAVIA existen ---'
\echo '    Solo informativo: no se borran solos, la decision es de una persona.'
SELECT id, email, nombre, rol
FROM usuario
WHERE email ~* '(test|prueba|demo|ejemplo|superstars\.com|ggg\.com)'
ORDER BY rol, id;
