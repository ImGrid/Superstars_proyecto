-- Crear rubrica completa para concurso 6 (SuperStar Bolivia 2026)
-- 4 criterios x 25% = 100%
-- Cada criterio tiene 2 sub-criterios, cada sub-criterio tiene 3 niveles
BEGIN;

-- limpiar criterios viejos (cascade borra sub_criterios y niveles)
DELETE FROM criterio WHERE rubrica_id = 5;

-- === CRITERIO 1: Modelo de impacto (25%) ===
INSERT INTO criterio (rubrica_id, tipo, nombre, descripcion, peso_porcentaje, orden)
VALUES (5, 'social', 'Modelo de impacto del negocio',
  'El modelo de negocio promueve triple impacto positivo', 25.00, 1);

-- sub-criterio 1.1 (15%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Estrategia de triple impacto',
  'Evalúa cómo la empresa incorpora objetivos sociales, ambientales y económicos', 15.00, 1);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'El impacto se menciona pero no está integrado en el modelo', 1.00, 5.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'El modelo incorpora elementos de impacto aunque no completamente articulado', 6.00, 10.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'El modelo genera triple impacto de forma coherente y estratégica', 11.00, 15.00);

-- sub-criterio 1.2 (10%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Indicadores y metas de impacto',
  'Evalúa si la empresa define y mide sus objetivos mediante indicadores concretos', 10.00, 2);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'No se presentan indicadores ni metas claras', 1.00, 3.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'Se presentan algunos indicadores sin sistema robusto', 4.00, 7.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'Indicadores definidos con metas claras y seguimiento', 8.00, 10.00);

-- === CRITERIO 2: Viabilidad de la propuesta (25%) ===
INSERT INTO criterio (rubrica_id, tipo, nombre, descripcion, peso_porcentaje, orden)
VALUES (5, 'tecnico', 'Viabilidad y relevancia de la propuesta',
  'La propuesta es clara, relevante y factible de implementar', 25.00, 2);

-- sub-criterio 2.1 (15%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Claridad y relevancia del modelo',
  'Evalúa si el modelo de negocio está definido y genera triple impacto', 15.00, 1);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'El modelo está descrito de forma general sin conexión con triple impacto', 1.00, 5.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'El modelo muestra intención de generar triple impacto', 6.00, 10.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'El modelo está claramente estructurado con triple impacto positivo', 11.00, 15.00);

-- sub-criterio 2.2 (10%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Presupuesto y contribución propia',
  'Evalúa si el presupuesto es claro y la contribución propia es significativa', 10.00, 2);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'El presupuesto es poco claro sin contribución propia', 1.00, 3.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'El presupuesto es razonable con contribución parcial', 4.00, 7.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'Presupuesto claro y realista con contribución significativa', 8.00, 10.00);

-- === CRITERIO 3: Fuerza del equipo (25%) ===
INSERT INTO criterio (rubrica_id, tipo, nombre, descripcion, peso_porcentaje, orden)
VALUES (5, 'economico', 'Fuerza de la empresa de triple impacto',
  'El equipo tiene liderazgo, competencias y capacidad de implementación', 25.00, 3);

-- sub-criterio 3.1 (15%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Liderazgo orientado al triple impacto',
  'Evalúa si el liderazgo impulsa objetivos sociales, ambientales y económicos', 15.00, 1);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'El liderazgo tiene intención de impacto pero no está articulado', 1.00, 5.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'El liderazgo promueve objetivos de forma parcial', 6.00, 10.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'El liderazgo guía activamente hacia el triple impacto', 11.00, 15.00);

-- sub-criterio 3.2 (10%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Competencias del equipo',
  'Evalúa habilidades y experiencia para implementar la propuesta', 10.00, 2);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'El equipo tiene experiencia limitada en gestión de impacto', 1.00, 3.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'El equipo cuenta con competencias relevantes', 4.00, 7.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'Experiencia sólida y capacidades demostradas en impacto', 8.00, 10.00);

-- === CRITERIO 4: Potencial de crecimiento (25%) ===
INSERT INTO criterio (rubrica_id, tipo, nombre, descripcion, peso_porcentaje, orden)
VALUES (5, 'financiero', 'Potencial de crecimiento y sostenibilidad',
  'El negocio tiene estrategia de crecimiento clara y desempeño financiero sólido', 25.00, 4);

-- sub-criterio 4.1 (15%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Estrategia de crecimiento con impacto',
  'Evalúa si la estrategia de crecimiento fortalece el impacto positivo', 15.00, 1);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'La empresa tiene visión de crecimiento sin estrategia clara', 1.00, 5.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'Estrategia que considera impacto social y ambiental', 6.00, 10.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'Estrategia definida y realista que maximiza impacto positivo', 11.00, 15.00);

-- sub-criterio 4.2 (10%)
INSERT INTO sub_criterio (criterio_id, nombre, descripcion, peso_porcentaje, orden)
VALUES (currval('criterio_id_seq'), 'Desempeño financiero y proyecciones',
  'Evalúa resultados financieros y proyecciones de sostenibilidad', 10.00, 2);

INSERT INTO nivel_evaluacion (sub_criterio_id, nivel, descripcion, puntaje_min, puntaje_max) VALUES
  (currval('sub_criterio_id_seq'), 'basico', 'Cifras financieras limitadas con baja proyección', 1.00, 3.00),
  (currval('sub_criterio_id_seq'), 'intermedio', 'Cifras históricas y proyecciones razonables', 4.00, 7.00),
  (currval('sub_criterio_id_seq'), 'avanzado', 'Buen desempeño y alto potencial con proyecciones claras', 8.00, 10.00);

COMMIT;
