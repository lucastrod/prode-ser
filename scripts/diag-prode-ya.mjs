import pg from 'pg';
const { Pool } = pg;

const DB_YA = 'postgresql://neondb_owner:npg_jSTUJL2wQAo1@ep-cold-art-apl2ycee.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const pool = new Pool({ connectionString: DB_YA, ssl: true });

// 1. Ver todos los usuarios
console.log('👥 Todos los usuarios en PRODE-YA:');
const { rows: users } = await pool.query(`SELECT id, name, email FROM users ORDER BY name`);
users.forEach(u => console.log(`   - "${u.name}" <${u.email}>`));

// 2. Buscar partidos con Congo
console.log('\n⚽ Partidos con "Congo" en PRODE-YA:');
const { rows: matches } = await pool.query(
  `SELECT id, home_team, away_team, match_date, home_score, away_score, status
   FROM matches
   WHERE LOWER(home_team) LIKE '%congo%' OR LOWER(away_team) LIKE '%congo%'`
);
if (matches.length === 0) {
  console.log('   (ninguno)');
} else {
  matches.forEach(m => console.log(`   - [${m.id}] ${m.home_team} vs ${m.away_team} | Score: ${m.home_score ?? '-'}-${m.away_score ?? '-'} | Status: ${m.status}`));
}

// 3. Buscar partidos con England/Inglaterra
console.log('\n⚽ Partidos con "England/Inglat" en PRODE-YA:');
const { rows: engMatches } = await pool.query(
  `SELECT id, home_team, away_team FROM matches
   WHERE LOWER(home_team) LIKE '%eng%' OR LOWER(away_team) LIKE '%eng%'
      OR LOWER(home_team) LIKE '%inglat%' OR LOWER(away_team) LIKE '%inglat%'
   LIMIT 5`
);
engMatches.forEach(m => console.log(`   - [${m.id}] ${m.home_team} vs ${m.away_team}`));

await pool.end();
