-- Cambiar asignacion de evaluadores: de por-postulacion a por-concurso
-- Los evaluadores se asignan al concurso, no a postulaciones individuales
BEGIN;

-- eliminar tabla vieja (no tiene datos)
DROP TABLE IF EXISTS asignacion_evaluador;

-- crear tabla nueva: evaluador asignado a un concurso
CREATE TABLE evaluador_concurso (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  concurso_id INT NOT NULL,
  evaluador_id INT NOT NULL,
  asignado_por INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_evaluador_concurso_concurso
    FOREIGN KEY (concurso_id) REFERENCES concurso(id) ON DELETE CASCADE,
  CONSTRAINT fk_evaluador_concurso_evaluador
    FOREIGN KEY (evaluador_id) REFERENCES usuario(id) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluador_concurso_asignado_por
    FOREIGN KEY (asignado_por) REFERENCES usuario(id) ON DELETE RESTRICT,
  CONSTRAINT uq_evaluador_concurso
    UNIQUE (concurso_id, evaluador_id)
);

CREATE INDEX idx_evaluador_concurso_concurso_id ON evaluador_concurso(concurso_id);
CREATE INDEX idx_evaluador_concurso_evaluador_id ON evaluador_concurso(evaluador_id);

COMMIT;
