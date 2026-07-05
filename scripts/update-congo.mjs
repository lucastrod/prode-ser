import { Pool } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_4sfcXahAGo7U@ep-autumn-lake-atf08sgk.c-9.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE matches SET home_team = 'RD Congo' WHERE home_team = 'República Democrática del Congo'");
    await client.query("UPDATE matches SET away_team = 'RD Congo' WHERE away_team = 'República Democrática del Congo'");
    console.log("Updated matches table.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
main();
