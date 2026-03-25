-- Eliminar columnas de empresa que pertenecen al formulario del concurso
-- Estas columnas no son parte del perfil de la empresa
-- Los datos se capturan en el formulario dinamico (postulacion.response_data)
BEGIN;

ALTER TABLE empresa DROP COLUMN IF EXISTS etapa;
ALTER TABLE empresa DROP COLUMN IF EXISTS tipo_relacion_comercial;
ALTER TABLE empresa DROP COLUMN IF EXISTS ubicacion_clientes;
ALTER TABLE empresa DROP COLUMN IF EXISTS departamentos_clientes;
ALTER TABLE empresa DROP COLUMN IF EXISTS productos_servicios;
ALTER TABLE empresa DROP COLUMN IF EXISTS tipo_registros;
ALTER TABLE empresa DROP COLUMN IF EXISTS metodo_registros;
ALTER TABLE empresa DROP COLUMN IF EXISTS redes_sociales;

COMMIT;
