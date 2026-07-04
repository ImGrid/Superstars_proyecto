-- Hace el campo NIT opcional en la tabla empresa.
-- Razon: el cliente confirmo que muchos proponentes no tienen NIT,
-- por lo que no debe ser obligatorio para crear/actualizar una empresa.
-- El UNIQUE constraint se mantiene porque PostgreSQL permite multiples NULL
-- en columnas con UNIQUE (NULL != NULL en SQL estandar).

BEGIN;

ALTER TABLE empresa ALTER COLUMN nit DROP NOT NULL;

COMMIT;
