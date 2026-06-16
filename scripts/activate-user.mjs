import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;
const pool = new Pool({ connectionString, ssl: true });

// Borrar usuario de Santi (y sus predictions/standings)
const email = 'santiagomalve@gmail.com';

const { rows: [user] } = await pool.query(`SELECT id, name, email FROM users WHERE email = $1`, [email]);

if (!user) {
  console.log('⚠️  Usuario no encontrado:', email);
} else {
  console.log(`🗑️  Borrando: ${user.name} (${user.email})...`);
  await pool.query(`DELETE FROM predictions WHERE user_id = $1`, [user.id]);
  await pool.query(`DELETE FROM standings WHERE user_id = $1`, [user.id]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [user.id]);
  console.log('✅ Usuario eliminado correctamente.');
}

await pool.end();
