-- 19_normalizar_empresa_labels_legacy.sql
-- Normaliza valores legacy en la tabla empresa que quedaron como labels crudos
-- en lugar de los slugs estandar usados por el resto del sistema.
--
-- Origen del drift: registros creados antes de sql/07_empresa_migrar_labels_a_slugs.sql
-- o antes de la unificacion de tipos en OPCIONES_TIPO_EMPRESA.
--
-- Auditoria previa (count de cada valor encontrado):
--   departamento: 'La Paz' (1 registro)  -> deberia ser 'la_paz'
--   tipo_empresa: 'srl'    (1 registro)  -> deberia ser 'srl_ltda' (forma actual)
--
-- Los demas campos (rubro, numero_socios, contacto_genero) ya estan en slugs.
-- Los campos de texto libre (ciudad, direccion, descripcion, telefono) NO se
-- tocan: son entrada manual del proponente y no tienen slug normalizado.

BEGIN;

-- Departamento: 'La Paz' -> 'la_paz'
-- WHERE explicito por valor exacto para no afectar otros datos accidentalmente.
UPDATE empresa
   SET departamento = 'la_paz'
 WHERE departamento = 'La Paz';

-- Tipo de empresa: 'srl' -> 'srl_ltda'
-- La forma actual en OPCIONES_TIPO_EMPRESA es 'srl_ltda' (SRL o LTDA).
UPDATE empresa
   SET tipo_empresa = 'srl_ltda'
 WHERE tipo_empresa = 'srl';

COMMIT;
