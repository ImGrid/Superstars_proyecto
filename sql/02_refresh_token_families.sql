-- 02_refresh_token_families.sql
-- Migracion: agrega token families con deteccion de reuso a sesion_refresh_token
-- Ejecutar contra superstars_db:
--   PGPASSWORD=12345 "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d superstars_db -f "sql/02_refresh_token_families.sql"

BEGIN;

-- family_id: agrupa tokens de una misma cadena de rotacion
ALTER TABLE sesion_refresh_token
    ADD COLUMN family_id TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;

-- quitar el default (solo servia para filas existentes)
ALTER TABLE sesion_refresh_token
    ALTER COLUMN family_id DROP DEFAULT;

-- revocado_en: marca cuando un token fue consumido o revocado
ALTER TABLE sesion_refresh_token
    ADD COLUMN revocado_en TIMESTAMPTZ;

-- replaced_by: apunta al token que lo reemplazo en la rotacion
ALTER TABLE sesion_refresh_token
    ADD COLUMN replaced_by INT;

-- FK self-referencing para replaced_by
ALTER TABLE sesion_refresh_token
    ADD CONSTRAINT fk_sesion_replaced_by
    FOREIGN KEY (replaced_by) REFERENCES sesion_refresh_token(id) ON DELETE SET NULL;

-- indice para buscar todos los tokens de una familia
CREATE INDEX idx_sesion_family_id ON sesion_refresh_token(family_id);

-- indice parcial para buscar tokens activos por expiracion (cleanup cron)
CREATE INDEX idx_sesion_expira_en ON sesion_refresh_token(expira_en) WHERE revocado_en IS NULL;

COMMIT;
