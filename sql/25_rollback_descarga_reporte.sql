-- Rollback de la migracion 25: elimina la tabla de auditoria de descargas.
-- Destructivo: se pierde el historial de quien descargo que reporte y con que
-- filtros. Exportarlo antes si importa.
DROP TABLE IF EXISTS descarga_reporte;
