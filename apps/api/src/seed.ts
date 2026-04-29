// Script para insertar usuarios de prueba en la BD
// Ejecutar: npx ts-node src/seed.ts
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Mismos parametros de argon2 que auth.constants.ts
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
};

// Leer .env manualmente
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
  }
  return env;
}

const USERS = [
  { email: 'admin@superstars.com', password: 'Admin12345678', nombre: 'Administrador', rol: 'administrador' },
  { email: 'responsable@superstars.com', password: 'Resp12345678', nombre: 'Responsable Convocatoria', rol: 'responsable_convocatoria' },
  { email: 'evaluador@superstars.com', password: 'Eval12345678', nombre: 'Evaluador', rol: 'evaluador' },
  { email: 'proponente@superstars.com', password: 'Prop12345678', nombre: 'Proponente', rol: 'proponente' },
];

async function seed() {
  const env = loadEnv();
  const pepper = Buffer.from(env.PASSWORD_PEPPER || '');

  const pool = new Pool({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5432', 10),
    user: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'superstars_db',
  });

  try {
    for (const user of USERS) {
      // Verificar si ya existe
      const exists = await pool.query('SELECT id FROM usuario WHERE email = $1', [user.email]);
      if (exists.rows.length > 0) {
        console.log(`[SKIP] ${user.email} ya existe (id: ${exists.rows[0].id})`);
        continue;
      }

      const passwordHash = await argon2.hash(user.password, {
        ...ARGON2_OPTIONS,
        secret: pepper,
      });

      const result = await pool.query(
        'INSERT INTO usuario (email, password_hash, rol, nombre) VALUES ($1, $2, $3::rol_usuario, $4) RETURNING id, email, rol',
        [user.email, passwordHash, user.rol, user.nombre],
      );

      console.log(`[OK] ${result.rows[0].email} creado (id: ${result.rows[0].id}, rol: ${result.rows[0].rol})`);
    }

    // Insertar categorias de publicacion
    const CATEGORIAS = [
      { nombre: 'Noticias', slug: 'noticias' },
      { nombre: 'Eventos', slug: 'eventos' },
      { nombre: 'Convocatorias', slug: 'convocatorias' },
      { nombre: 'Resultados', slug: 'resultados' },
      { nombre: 'Institucional', slug: 'institucional' },
    ];

    console.log('');
    for (const cat of CATEGORIAS) {
      const result = await pool.query(
        `INSERT INTO categoria_publicacion (nombre, slug) VALUES ($1, $2)
         ON CONFLICT (nombre) DO NOTHING
         RETURNING id, nombre`,
        [cat.nombre, cat.slug],
      );
      if (result.rows.length > 0) {
        console.log(`[OK] Categoria "${result.rows[0].nombre}" creada (id: ${result.rows[0].id})`);
      } else {
        console.log(`[SKIP] Categoria "${cat.nombre}" ya existe`);
      }
    }

    console.log('\nSeed completado.');
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
