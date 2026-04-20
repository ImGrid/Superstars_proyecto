-- Agregar categoria y concurso_id a pregunta_frecuente
-- categoria: agrupa preguntas generales por tema ('general', 'participacion', 'proceso')
-- concurso_id: si tiene valor, la pregunta es especifica de ese concurso (no aparece en /faq publica)
BEGIN;

ALTER TABLE pregunta_frecuente
  ADD COLUMN categoria TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN concurso_id INT;

ALTER TABLE pregunta_frecuente
  ADD CONSTRAINT chk_faq_categoria
    CHECK (categoria IN ('general', 'participacion', 'proceso')),
  ADD CONSTRAINT fk_faq_concurso
    FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE SET NULL;

-- indice parcial: solo filas con concurso asignado (la mayoria sera NULL)
CREATE INDEX idx_faq_concurso_id ON pregunta_frecuente(concurso_id)
  WHERE concurso_id IS NOT NULL;

COMMIT;
