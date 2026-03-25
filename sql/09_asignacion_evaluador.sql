-- Agregar tabla de asignacion de evaluadores a postulaciones individuales
-- Nivel 2: evaluador_concurso = pool del concurso, asignacion_evaluador = que postulaciones califica
BEGIN;

CREATE TABLE asignacion_evaluador (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  postulacion_id INT NOT NULL,
  evaluador_id INT NOT NULL,
  asignado_por INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_asignacion_postulacion
    FOREIGN KEY (postulacion_id) REFERENCES postulacion(id) ON DELETE CASCADE,
  CONSTRAINT fk_asignacion_evaluador
    FOREIGN KEY (evaluador_id) REFERENCES usuario(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asignacion_asignado_por
    FOREIGN KEY (asignado_por) REFERENCES usuario(id) ON DELETE RESTRICT,
  CONSTRAINT uq_asignacion_postulacion_evaluador
    UNIQUE (postulacion_id, evaluador_id)
);

CREATE INDEX idx_asignacion_postulacion_id ON asignacion_evaluador(postulacion_id);
CREATE INDEX idx_asignacion_evaluador_id ON asignacion_evaluador(evaluador_id);

COMMIT;
