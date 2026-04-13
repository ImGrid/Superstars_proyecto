-- Agregar estado 'resultados_listos' al enum estado_concurso
-- Se inserta antes de 'finalizado' para mantener el orden logico del flujo
ALTER TYPE estado_concurso ADD VALUE 'resultados_listos' BEFORE 'finalizado';
