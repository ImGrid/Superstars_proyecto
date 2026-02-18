-- 00_create_db.sql
-- Ejecutar contra la BD 'postgres' (no contra superstars_db):
--   PGPASSWORD=12345 "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d postgres -f sql/00_create_db.sql

-- Terminar conexiones existentes a superstars_db
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'superstars_db' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS superstars_db;

CREATE DATABASE superstars_db
    ENCODING = 'UTF8'
    LC_COLLATE = 'Spanish_Bolivia.1252'
    LC_CTYPE = 'Spanish_Bolivia.1252'
    TEMPLATE = template0;
