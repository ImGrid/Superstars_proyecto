-- ============================================================================
-- Verificacion de la migracion 25 (auditoria de descargas de reportes)
-- Correr DESPUES de aplicar sql/25_descarga_reporte.sql
--
-- Las pruebas de aceptacion insertan filas dentro de una transaccion que se
-- deshace al final, asi que este archivo NO deja basura en la tabla.
-- ============================================================================

\echo '--- 1. La tabla existe (esperado: 1 fila) ---'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema() AND table_name = 'descarga_reporte';

\echo '--- 2. Columnas y tipos (esperado: 9 columnas) ---'
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'descarga_reporte'
ORDER BY ordinal_position;

\echo '--- 3. Constraints (esperado: PK + FK + 4 CHECK) ---'
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'descarga_reporte'::regclass
ORDER BY conname;

\echo '--- 4. Indices (esperado: PK + usuario + tipo + created) ---'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'descarga_reporte'
ORDER BY indexname;

\echo '--- 5. tipo NO debe tener CHECK de lista cerrada (esperado: 0 filas) ---'
\echo '    Es intencional: el catalogo de reportes crece sin migraciones.'
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'descarga_reporte'::regclass
  AND pg_get_constraintdef(oid) LIKE '%tipo%'
  AND pg_get_constraintdef(oid) LIKE '%ANY (ARRAY%';

BEGIN;

\echo '--- 6. Aceptacion: una descarga valida se inserta ---'
DO $$
DECLARE
    v_usuario integer;
    v_id      integer;
BEGIN
    SELECT id INTO v_usuario FROM usuario WHERE rol = 'administrador' LIMIT 1;

    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filtros, filas_exportadas, ip)
    VALUES
        (v_usuario, 'prueba@verificacion.local', 'contactos', 'excel',
         '{"convocatoriaId": 12, "incluirPruebas": false}'::jsonb, 182, '127.0.0.1')
    RETURNING id INTO v_id;

    RAISE NOTICE 'OK: insert valido, id generado = %', v_id;
END $$;

\echo '--- 7. Aceptacion: se puede auditar sin usuario_id (usuario borrado) ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES
        (NULL, 'usuario-borrado@verificacion.local', 'calidad_datos', 'excel', 84);
    RAISE NOTICE 'OK: acepta usuario_id NULL (el rastro sobrevive al borrado)';
END $$;

\echo '--- 8. Aceptacion: un tipo de reporte nuevo NO requiere migracion ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES
        (NULL, 'prueba@verificacion.local', 'reporte_inventado_a_futuro', 'pdf', 1);
    RAISE NOTICE 'OK: tipo libre, el catalogo puede crecer sin tocar la BD';
END $$;

\echo '--- 9. Rechazo: formato invalido debe fallar ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES (NULL, 'prueba@verificacion.local', 'contactos', 'csv', 1);
    RAISE EXCEPTION 'FALLO: acepto un formato invalido (csv)';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'OK: rechaza formato invalido';
END $$;

\echo '--- 10. Rechazo: tipo vacio debe fallar ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES (NULL, 'prueba@verificacion.local', '', 'excel', 1);
    RAISE EXCEPTION 'FALLO: acepto un tipo vacio';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'OK: rechaza tipo vacio';
END $$;

\echo '--- 11. Rechazo: correo vacio debe fallar ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES (NULL, '', 'contactos', 'excel', 1);
    RAISE EXCEPTION 'FALLO: acepto un correo vacio';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'OK: rechaza correo vacio';
END $$;

\echo '--- 12. Rechazo: filas negativas debe fallar ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES (NULL, 'prueba@verificacion.local', 'contactos', 'excel', -5);
    RAISE EXCEPTION 'FALLO: acepto filas_exportadas negativas';
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'OK: rechaza filas_exportadas negativas';
END $$;

\echo '--- 13. Rechazo: usuario_id inexistente debe fallar (FK) ---'
DO $$
BEGIN
    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES (999999, 'prueba@verificacion.local', 'contactos', 'excel', 1);
    RAISE EXCEPTION 'FALLO: acepto un usuario_id inexistente';
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'OK: la FK rechaza un usuario inexistente';
END $$;

\echo '--- 14. Comportamiento ON DELETE SET NULL del rastro ---'
\echo '    Se crea un usuario descartable, se audita una descarga suya, se borra'
\echo '    el usuario y se comprueba que la fila de auditoria sobrevive.'
DO $$
DECLARE
    v_usuario integer;
    v_id      integer;
    v_fk      integer;
    v_email   text;
BEGIN
    INSERT INTO usuario (email, password_hash, rol, nombre, activo)
    VALUES ('descartable@verificacion.local', 'x', 'administrador', 'Descartable', true)
    RETURNING id INTO v_usuario;

    INSERT INTO descarga_reporte
        (usuario_id, usuario_email, tipo, formato, filas_exportadas)
    VALUES (v_usuario, 'descartable@verificacion.local', 'contactos', 'excel', 10)
    RETURNING id INTO v_id;

    DELETE FROM usuario WHERE id = v_usuario;

    SELECT usuario_id, usuario_email INTO v_fk, v_email
    FROM descarga_reporte WHERE id = v_id;

    IF v_fk IS NOT NULL THEN
        RAISE EXCEPTION 'FALLO: usuario_id deberia quedar NULL, quedo %', v_fk;
    END IF;
    IF v_email <> 'descartable@verificacion.local' THEN
        RAISE EXCEPTION 'FALLO: se perdio la foto del correo';
    END IF;

    RAISE NOTICE 'OK: el rastro sobrevive al borrado (usuario_id NULL, correo intacto)';
END $$;

\echo '--- 15. Filas insertadas durante la prueba (esperado: 4) ---'
\echo '    Cuatro inserts exitosos (pruebas 6, 7, 8 y 14). Las pruebas 9 a 13'
\echo '    son de rechazo y no deben insertar nada.'
SELECT count(*) AS filas_de_prueba FROM descarga_reporte;

ROLLBACK;

\echo '--- 16. Tras el ROLLBACK la tabla queda vacia (esperado: 0) ---'
SELECT count(*) AS filas_reales FROM descarga_reporte;

\echo '--- 17. Idempotencia: volver a correr la migracion no debe fallar ---'
\echo '    (comprobar manualmente re-ejecutando sql/25_descarga_reporte.sql)'
