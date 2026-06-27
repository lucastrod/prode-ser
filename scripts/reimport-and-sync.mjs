import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({ connectionString, ssl: true });

// ── TEAM TRANSLATIONS ──────────────────────────────────────────────────────────
const TEAM_TRANSLATIONS = {
  "Mexico": "México", "South Africa": "Sudáfrica", "South Korea": "Corea del Sur",
  "Czech Republic": "República Checa", "Czechia": "República Checa",
  "Algeria": "Argelia", "Argentina": "Argentina", "Australia": "Australia",
  "Austria": "Austria", "Belgium": "Bélgica", "Brazil": "Brasil",
  "Canada": "Canadá", "Colombia": "Colombia", "Croatia": "Croacia",
  "DR Congo": "República Democrática del Congo", "Congo DR": "República Democrática del Congo",
  "Ecuador": "Ecuador", "Egypt": "Egipto", "England": "Inglaterra",
  "France": "Francia", "Germany": "Alemania", "Ghana": "Ghana",
  "Haiti": "Haití", "Iran": "Irán", "Iraq": "Irak", "Ivory Coast": "Costa de Marfil",
  "Japan": "Japón", "Jordan": "Jordania", "Morocco": "Marruecos",
  "Netherlands": "Países Bajos", "New Zealand": "Nueva Zelanda",
  "Norway": "Noruega", "Panama": "Panamá", "Paraguay": "Paraguay",
  "Portugal": "Portugal", "Qatar": "Qatar", "Saudi Arabia": "Arabia Saudita",
  "Scotland": "Escocia", "Senegal": "Senegal", "Spain": "España",
  "Sweden": "Suecia", "Switzerland": "Suiza", "Tunisia": "Túnez",
  "Turkey": "Turquía", "Türkiye": "Turquía", "USA": "Estados Unidos",
  "United States": "Estados Unidos", "Uruguay": "Uruguay", "Uzbekistan": "Uzbekistán",
  "Bosnia & Herzegovina": "Bosnia y Herzegovina", "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "Cape Verde": "Cabo Verde", "Curaçao": "Curazao",
};

function translate(name) {
  return TEAM_TRANSLATIONS[name] || name;
}

function parseDate(dateStr, timeStr) {
  const m = timeStr.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d+)$/);
  if (m) {
    const [_, hh, mm, offset] = m;
    const offNum = parseInt(offset);
    const sign = offNum >= 0 ? '+' : '-';
    const abs = String(Math.abs(offNum)).padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:00${sign}${abs}:00`);
  }
  return new Date(`${dateStr}T00:00:00Z`);
}

// ── STEP 1: Delete existing GROUP stage matches ────────────────────────────────
console.log('\n🗑️  Borrando partidos de Fase de Grupos existentes...');
const { rows: groupMatchRows } = await pool.query(
  `SELECT id FROM matches WHERE stage = 'GROUP'`
);
const groupIds = groupMatchRows.map(r => r.id);

if (groupIds.length > 0) {
  await pool.query(`DELETE FROM predictions WHERE match_id = ANY($1)`, [groupIds]);
  const { rowCount } = await pool.query(`DELETE FROM matches WHERE stage = 'GROUP'`);
  console.log(`   ✅ Eliminados ${rowCount} partidos de grupo (y sus predicciones).`);
} else {
  console.log('   ℹ️  No había partidos de grupo para eliminar.');
}

// ── STEP 2: Import all 6 group matches per group ──────────────────────────────
console.log('\n📥 Importando 6 partidos por grupo desde fixture/worldcup.json...');
const fixturePath = path.join(__dirname, '..', 'fixture', 'worldcup.json');
const raw = fs.readFileSync(fixturePath, 'utf-8');
const fixtureData = JSON.parse(raw);

const rawGroupMatches = (fixtureData.matches || []).filter(m => m.group);

// Group by group name and sort chronologically
const byGroup = {};
for (const m of rawGroupMatches) {
  const g = m.group;
  if (!byGroup[g]) byGroup[g] = [];
  byGroup[g].push(m);
}

const allGroupMatches = [];
for (const g in byGroup) {
  const sorted = byGroup[g].sort((a, b) => parseDate(a.date, a.time) - parseDate(b.date, b.time));
  allGroupMatches.push(...sorted); // ALL 6 per group
}

let importedCount = 0;
for (let i = 0; i < allGroupMatches.length; i++) {
  const f = allGroupMatches[i];
  const matchDate = parseDate(f.date, f.time);
  const homeTeam = translate(f.team1);
  const awayTeam = translate(f.team2);
  const groupName = f.group.replace('Group', 'Grupo');

  await pool.query(
    `INSERT INTO matches (external_match_id, home_team, away_team, match_date, group_name, stage, status)
     VALUES ($1, $2, $3, $4, $5, 'GROUP', 'SCHEDULED')
     ON CONFLICT (external_match_id) DO NOTHING`,
    [`openfootball_2026_group_reimport_${i + 1}`, homeTeam, awayTeam, matchDate, groupName]
  );
  importedCount++;
}
console.log(`   ✅ Importados ${importedCount} partidos de grupo (${importedCount / 12} por grupo aprox).`);

// ── STEP 3: Sync results from ESPN for all past matches ───────────────────────
console.log('\n🌐 Sincronizando resultados desde ESPN para partidos ya jugados...');

// Get all scheduled matches that have already kicked off
const now = new Date();
const { rows: pastMatches } = await pool.query(
  `SELECT id, home_team, away_team, match_date, status FROM matches 
   WHERE match_date <= $1 AND status IN ('SCHEDULED', 'LIVE')
   ORDER BY match_date ASC`,
  [now]
);

console.log(`   📋 Partidos a procesar: ${pastMatches.length}`);

// Group by UTC date for ESPN queries
const byDate = {};
for (const m of pastMatches) {
  const d = new Date(m.match_date);
  const dateStr = `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
  if (!byDate[dateStr]) byDate[dateStr] = [];
  byDate[dateStr].push(m);
}

let finishedCount = 0;
let notFoundCount = 0;

for (const [dateStr, dateMatches] of Object.entries(byDate)) {
  console.log(`\n   📅 Consultando ESPN para fecha ${dateStr} (${dateMatches.length} partidos)...`);
  
  let events = [];
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`;
    const resp = await fetch(url);
    const apiData = await resp.json();
    events = apiData.events || [];
    console.log(`      ESPN devolvió ${events.length} eventos.`);
  } catch (err) {
    console.error(`      ❌ Error ESPN para ${dateStr}:`, err.message);
    continue;
  }

  for (const match of dateMatches) {
    const homeTeamEs = match.home_team;
    const awayTeamEs = match.away_team;

    // Find match in ESPN events
    const apiMatch = events.find(e => {
      const comps = e.competitions?.[0]?.competitors;
      if (!comps || comps.length < 2) return false;
      const homeNode = comps.find(c => c.homeAway === 'home');
      const awayNode = comps.find(c => c.homeAway === 'away');
      if (!homeNode || !awayNode) return false;
      const apiHomeEs = translate(homeNode.team.displayName) || homeNode.team.displayName;
      const apiAwayEs = translate(awayNode.team.displayName) || awayNode.team.displayName;
      return apiHomeEs === homeTeamEs && apiAwayEs === awayTeamEs;
    });

    if (!apiMatch) {
      console.log(`      ⚠️  No encontrado en ESPN: ${homeTeamEs} vs ${awayTeamEs}`);
      // Lock the match (it's past kickoff)
      await pool.query(`UPDATE matches SET status = 'LIVE' WHERE id = $1`, [match.id]);
      notFoundCount++;
      continue;
    }

    const comps = apiMatch.competitions[0].competitors;
    const homeNode = comps.find(c => c.homeAway === 'home');
    const awayNode = comps.find(c => c.homeAway === 'away');
    const homeScore = parseInt(homeNode.score, 10);
    const awayScore = parseInt(awayNode.score, 10);
    const statusShort = apiMatch.status?.type?.shortDetail ?? '';
    const isCompleted = apiMatch.status?.type?.completed === true;

    if (['FT', 'AET', 'PEN', 'Final', 'Full Time'].includes(statusShort) || isCompleted) {
      await pool.query(
        `UPDATE matches SET status = 'FINISHED', home_score = $1, away_score = $2 WHERE id = $3`,
        [isNaN(homeScore) ? null : homeScore, isNaN(awayScore) ? null : awayScore, match.id]
      );
      console.log(`      ✅ FINALIZADO: ${homeTeamEs} ${homeScore} - ${awayScore} ${awayTeamEs} (${statusShort})`);
      finishedCount++;
    } else {
      await pool.query(
        `UPDATE matches SET status = 'LIVE', home_score = $1, away_score = $2 WHERE id = $3`,
        [isNaN(homeScore) ? null : homeScore, isNaN(awayScore) ? null : awayScore, match.id]
      );
      console.log(`      🔴 EN JUEGO: ${homeTeamEs} ${homeScore} - ${awayScore} ${awayTeamEs}`);
    }
  }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ SINCRONIZACIÓN COMPLETA');
console.log(`   Partidos de grupo importados: ${importedCount}`);
console.log(`   Resultados actualizados (FINISHED): ${finishedCount}`);
console.log(`   No encontrados en ESPN (bloqueados): ${notFoundCount}`);
console.log('═══════════════════════════════════════════════════════\n');

await pool.end();
