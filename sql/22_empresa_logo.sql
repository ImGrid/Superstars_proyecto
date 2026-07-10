-- Logo de la empresa (subido por el propio proponente).
-- Es opcional; muchas empresas ya tienen un logo y quieren mostrarlo en su perfil.
-- Se guarda la clave del archivo en storage (mismo patron que convocatoria.imagen_key).

ALTER TABLE empresa
  ADD COLUMN IF NOT EXISTS logo_key text;

-- Rollback:
-- ALTER TABLE empresa DROP COLUMN IF EXISTS logo_key;
