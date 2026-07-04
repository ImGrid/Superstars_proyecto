-- ============================================================================
-- Verificacion post-migracion 16: rename concurso -> convocatoria
-- ============================================================================
--
-- Ejecutar DESPUES de aplicar sql/16_rename_concurso_a_convocatoria.sql
-- Si cualquier consulta retorna filas, hay un problema.
--
-- Modo de ejecucion:
--   PGPASSWORD=12345 "C:\Program Files\PostgreSQL\17\bin\psql.exe" \
--     -U postgres -d superstars_db -f sql/16_verify_rename.sql
--
-- Resultado esperado: 4 secciones, todas con conteo 0 (excepto la seccion
-- final de filas que debe coincidir con el baseline pre-migracion).
-- ============================================================================

\echo '================================================================'
\echo 'VERIFICACION 1/4: rastros de "concurso" o "monto_premio" en BD'
\echo 'Esperado: 0 filas en cada bloque'
\echo '================================================================'

\echo ''
\echo '--- 1.1 Tablas con "concurso" en el nombre (debe estar vacio) ---'
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE '%concurso%';

\echo ''
\echo '--- 1.2 Columnas con "concurso" o "monto_premio" en el nombre (debe estar vacio) ---'
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND (column_name LIKE '%concurso%' OR column_name LIKE '%monto_premio%');

\echo ''
\echo '--- 1.3 ENUM types con "concurso" en el nombre (debe estar vacio) ---'
SELECT t.typname
FROM pg_type t
JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typname LIKE '%concurso%';

\echo ''
\echo '--- 1.4 ENUM values con "concurso" en el label (debe estar vacio) ---'
SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND e.enumlabel LIKE '%concurso%';

\echo ''
\echo '--- 1.5 Constraints con "concurso" o "monto_premio" en el nombre (debe estar vacio) ---'
SELECT conname, conrelid::regclass AS tabla
FROM pg_constraint
WHERE connamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')
  AND (conname LIKE '%concurso%' OR conname LIKE '%monto_premio%');

\echo ''
\echo '--- 1.6 Indices con "concurso" o "monto_premio" en el nombre (debe estar vacio) ---'
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname='public'
  AND (indexname LIKE '%concurso%' OR indexname LIKE '%monto_premio%');

\echo ''
\echo '--- 1.7 Triggers con "concurso" en el nombre (debe estar vacio) ---'
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema='public' AND trigger_name LIKE '%concurso%';

\echo ''
\echo '--- 1.8 Secuencias con "concurso" en el nombre (debe estar vacio) ---'
SELECT c.relname AS secuencia
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='S' AND c.relname LIKE '%concurso%';


\echo ''
\echo '================================================================'
\echo 'VERIFICACION 2/4: nombres nuevos esperados estan presentes'
\echo 'Esperado: 4 tablas convocatoria + 1 enum estado_convocatoria'
\echo '================================================================'

\echo ''
\echo '--- 2.1 Tablas convocatoria (esperado: 4) ---'
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE '%convocatoria%'
ORDER BY table_name;

\echo ''
\echo '--- 2.2 Columna convocatoria_id (esperado: 8 tablas) ---'
SELECT table_name
FROM information_schema.columns
WHERE table_schema='public' AND column_name='convocatoria_id'
ORDER BY table_name;

\echo ''
\echo '--- 2.3 Columna monto en convocatoria (esperado: 1 fila) ---'
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='convocatoria' AND column_name='monto';

\echo ''
\echo '--- 2.4 ENUM type estado_convocatoria con sus 6 valores (esperado: 6 filas) ---'
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid=t.oid
WHERE t.typname='estado_convocatoria'
ORDER BY e.enumsortorder;

\echo ''
\echo '--- 2.5 ENUM rol_usuario con responsable_convocatoria (esperado: 1 fila) ---'
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid=t.oid
WHERE t.typname='rol_usuario' AND e.enumlabel='responsable_convocatoria';


\echo ''
\echo '================================================================'
\echo 'VERIFICACION 3/4: conteo de filas (debe coincidir con baseline)'
\echo 'Baseline pre-migracion: convocatoria=3, documento_convocatoria=1,'
\echo '                       evaluador_convocatoria=2, responsable_convocatoria=3,'
\echo '                       formulario_dinamico=2, notificacion_email=0,'
\echo '                       postulacion=7, pregunta_frecuente=8, rubrica=3'
\echo '================================================================'

SELECT 'convocatoria'              AS tabla, COUNT(*) AS filas FROM convocatoria
UNION ALL SELECT 'documento_convocatoria',   COUNT(*) FROM documento_convocatoria
UNION ALL SELECT 'evaluador_convocatoria',   COUNT(*) FROM evaluador_convocatoria
UNION ALL SELECT 'responsable_convocatoria', COUNT(*) FROM responsable_convocatoria
UNION ALL SELECT 'formulario_dinamico',      COUNT(*) FROM formulario_dinamico
UNION ALL SELECT 'notificacion_email',       COUNT(*) FROM notificacion_email
UNION ALL SELECT 'postulacion',              COUNT(*) FROM postulacion
UNION ALL SELECT 'pregunta_frecuente',       COUNT(*) FROM pregunta_frecuente
UNION ALL SELECT 'rubrica',                  COUNT(*) FROM rubrica
ORDER BY tabla;


\echo ''
\echo '================================================================'
\echo 'VERIFICACION 4/4: integridad referencial (FK + datos coherentes)'
\echo 'Esperado: 0 filas huerfanas en cada bloque'
\echo '================================================================'

\echo ''
\echo '--- 4.1 Postulaciones con convocatoria_id huerfano (debe ser 0) ---'
SELECT COUNT(*) AS huerfanos FROM postulacion p
LEFT JOIN convocatoria c ON c.id=p.convocatoria_id
WHERE c.id IS NULL;

\echo ''
\echo '--- 4.2 Rubricas con convocatoria_id huerfano (debe ser 0) ---'
SELECT COUNT(*) AS huerfanos FROM rubrica r
LEFT JOIN convocatoria c ON c.id=r.convocatoria_id
WHERE c.id IS NULL;

\echo ''
\echo '--- 4.3 Formularios con convocatoria_id huerfano (debe ser 0) ---'
SELECT COUNT(*) AS huerfanos FROM formulario_dinamico f
LEFT JOIN convocatoria c ON c.id=f.convocatoria_id
WHERE c.id IS NULL;

\echo ''
\echo '--- 4.4 Responsables con convocatoria_id huerfano (debe ser 0) ---'
SELECT COUNT(*) AS huerfanos FROM responsable_convocatoria r
LEFT JOIN convocatoria c ON c.id=r.convocatoria_id
WHERE c.id IS NULL;

\echo ''
\echo '--- 4.5 Evaluadores con convocatoria_id huerfano (debe ser 0) ---'
SELECT COUNT(*) AS huerfanos FROM evaluador_convocatoria e
LEFT JOIN convocatoria c ON c.id=e.convocatoria_id
WHERE c.id IS NULL;

\echo ''
\echo '--- 4.6 Documentos con convocatoria_id huerfano (debe ser 0) ---'
SELECT COUNT(*) AS huerfanos FROM documento_convocatoria d
LEFT JOIN convocatoria c ON c.id=d.convocatoria_id
WHERE c.id IS NULL;

\echo ''
\echo '--- 4.7 FAQs con convocatoria_id huerfano (puede ser 0 si todos tienen, o N para los globales con NULL — los NULL son OK) ---'
SELECT COUNT(*) AS huerfanos FROM pregunta_frecuente p
LEFT JOIN convocatoria c ON c.id=p.convocatoria_id
WHERE p.convocatoria_id IS NOT NULL AND c.id IS NULL;

\echo ''
\echo '--- 4.8 Usuarios con rol responsable_convocatoria (verifica que el RENAME VALUE preservo datos) ---'
SELECT rol, COUNT(*) AS usuarios
FROM usuario
WHERE rol = 'responsable_convocatoria'
GROUP BY rol;

\echo ''
\echo '--- 4.9 Validar todas las check constraints de convocatoria ---'
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'convocatoria'::regclass AND contype = 'c'
ORDER BY conname;


\echo ''
\echo '================================================================'
\echo 'FIN. Si las 4 secciones cumplen lo esperado, la migracion es OK.'
\echo '================================================================'
