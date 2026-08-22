-- Rollback de la migracion 24: elimina la tabla de auditoria del observador.
-- Destructivo: se pierde el historial de accesos. Exportarlo antes si importa.
DROP TABLE IF EXISTS acceso_observador;
