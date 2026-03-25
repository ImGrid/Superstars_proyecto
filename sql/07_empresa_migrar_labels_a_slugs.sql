-- Migrar valores de empresa de labels a slugs
-- Para que sean compatibles con las opciones del formulario dinamico
BEGIN;

-- tipo_empresa: label -> slug
UPDATE empresa SET tipo_empresa = CASE tipo_empresa
  WHEN 'Unipersonal' THEN 'unipersonal'
  WHEN 'SRL o LTDA' THEN 'srl_ltda'
  WHEN 'S.A.' THEN 'sa'
  WHEN 'Otra' THEN 'otra'
  ELSE tipo_empresa
END
WHERE tipo_empresa IS NOT NULL;

-- numero_socios: "Mas de tres" -> "mas_de_tres" (los numericos "1","2","3" coinciden)
UPDATE empresa SET numero_socios = 'mas_de_tres'
WHERE numero_socios = 'Mas de tres';

-- rubro: label -> slug
UPDATE empresa SET rubro = CASE rubro
  WHEN 'Industria' THEN 'industria'
  WHEN 'Servicios' THEN 'servicios'
  WHEN 'Comercio' THEN 'comercio'
  WHEN 'Otro' THEN 'otro'
  ELSE rubro
END
WHERE rubro IS NOT NULL;

-- departamento: label -> slug
UPDATE empresa SET departamento = CASE departamento
  WHEN 'La Paz' THEN 'la_paz'
  WHEN 'Cochabamba' THEN 'cochabamba'
  WHEN 'Santa Cruz' THEN 'santa_cruz'
  WHEN 'Oruro' THEN 'oruro'
  WHEN 'Chuquisaca' THEN 'chuquisaca'
  WHEN 'Beni' THEN 'beni'
  WHEN 'Pando' THEN 'pando'
  WHEN 'Potosi' THEN 'potosi'
  WHEN 'Tarija' THEN 'tarija'
  ELSE departamento
END
WHERE departamento IS NOT NULL;

-- contacto_genero: label -> slug
UPDATE empresa SET contacto_genero = CASE contacto_genero
  WHEN 'Masculino' THEN 'masculino'
  WHEN 'Femenino' THEN 'femenino'
  WHEN 'Otro' THEN 'otro'
  ELSE contacto_genero
END
WHERE contacto_genero IS NOT NULL;

COMMIT;
