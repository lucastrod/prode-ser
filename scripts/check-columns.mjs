import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_4sfcXahAGo7U@ep-autumn-lake-atf08sgk.c-9.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require", 
  ssl: true 
});
const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
console.log('Columnas de users:', rows.map(r => r.column_name).join(', '));
await pool.end();
