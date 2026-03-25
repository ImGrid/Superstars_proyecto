-- Migracion: Agregar 19 columnas nuevas a tabla empresa
-- Documentacion: docs/02_entidades_y_relaciones.md seccion EMPRESA (30 columnas)
-- Todas nullable porque son datos que el proponente llena gradualmente

BEGIN;

-- Datos generales (Q9-Q16): 7 columnas nuevas
ALTER TABLE empresa ADD COLUMN numero_socios TEXT;
ALTER TABLE empresa ADD COLUMN num_empleados_mujeres INT;
ALTER TABLE empresa ADD COLUMN num_empleados_hombres INT;
ALTER TABLE empresa ADD COLUMN ciudad TEXT;
ALTER TABLE empresa ADD COLUMN direccion TEXT;
ALTER TABLE empresa ADD COLUMN telefono TEXT;
ALTER TABLE empresa ADD COLUMN descripcion TEXT;

-- Perfil comercial (Q17-Q21): 5 columnas nuevas
ALTER TABLE empresa ADD COLUMN etapa TEXT;
ALTER TABLE empresa ADD COLUMN tipo_relacion_comercial TEXT[];
ALTER TABLE empresa ADD COLUMN ubicacion_clientes TEXT[];
ALTER TABLE empresa ADD COLUMN departamentos_clientes TEXT[];
ALTER TABLE empresa ADD COLUMN productos_servicios TEXT;

-- Registros de la empresa (Q24-Q25): 2 columnas nuevas
ALTER TABLE empresa ADD COLUMN tipo_registros TEXT;
ALTER TABLE empresa ADD COLUMN metodo_registros TEXT;

-- Presencia digital (Q29): 1 columna nueva
ALTER TABLE empresa ADD COLUMN redes_sociales JSONB;

-- Persona de contacto (Q2-Q5): 4 columnas nuevas
ALTER TABLE empresa ADD COLUMN contacto_cargo TEXT;
ALTER TABLE empresa ADD COLUMN contacto_telefono TEXT;
ALTER TABLE empresa ADD COLUMN contacto_genero TEXT;
ALTER TABLE empresa ADD COLUMN contacto_fecha_nacimiento DATE;

COMMIT;
