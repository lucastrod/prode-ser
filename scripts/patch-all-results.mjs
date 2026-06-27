import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.POSTGRES_URL_NON_POOLING;
const pool = new Pool({ connectionString, ssl: true });

// COMPLETE ESPN name → Spanish name mapping (based on actual API responses)
const ESPN_TO_ES = {
  // Group A
  "Mexico": "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Czechia": "República Checa",
  // Group B
  "Canada": "Canadá",
  "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "United States": "Estados Unidos",
  "Paraguay": "Paraguay",
  // Group C
  "Qatar": "Qatar",
  "Switzerland": "Suiza",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  // Group D
  "Australia": "Australia",
  "Türkiye": "Turquía",
  "Germany": "Alemania",
  "Curaçao": "Curazao",
  "Netherlands": "Países Bajos",
  "Japan": "Japón",
  "Ivory Coast": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Sweden": "Suecia",
  "Tunisia": "Túnez",
  // Group E
  "Spain": "España",
  "Cape Verde": "Cabo Verde",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Saudi Arabia": "Arabia Saudita",
  "Uruguay": "Uruguay",
  "Iran": "Irán",
  "New Zealand": "Nueva Zelanda",
  // Group F
  "France": "Francia",
  "Senegal": "Senegal",
  "Iraq": "Irak",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argelia",
  // Group G
  "Austria": "Austria",
  "Jordan": "Jordania",
  "Portugal": "Portugal",
  "Congo DR": "República Democrática del Congo",
  "England": "Inglaterra",
  "Croatia": "Croacia",
  "Ghana": "Ghana",
  "Panama": "Panamá",
  "Uzbekistan": "Uzbekistán",
  "Colombia": "Colombia",
};

function translateEspn(name) {
  return ESPN_TO_ES[name] || name;
}

// All ESPN data from our check (hardcoded for reliability)
const allResults = [
  // 20260611
  { home: "Mexico", hs: 2, away: "South Africa", as: 0, date: "20260611" },
  { home: "South Korea", hs: 2, away: "Czechia", as: 1, date: "20260611" },
  // 20260612
  { home: "Canada", hs: 1, away: "Bosnia-Herzegovina", as: 1, date: "20260612" },
  { home: "United States", hs: 4, away: "Paraguay", as: 1, date: "20260612" },
  // 20260613
  { home: "Qatar", hs: 1, away: "Switzerland", as: 1, date: "20260613" },
  { home: "Brazil", hs: 1, away: "Morocco", as: 1, date: "20260613" },
  { home: "Haiti", hs: 0, away: "Scotland", as: 1, date: "20260613" },
  // 20260614
  { home: "Australia", hs: 2, away: "Türkiye", as: 0, date: "20260614" },
  { home: "Germany", hs: 7, away: "Curaçao", as: 1, date: "20260614" },
  { home: "Netherlands", hs: 2, away: "Japan", as: 2, date: "20260614" },
  { home: "Ivory Coast", hs: 1, away: "Ecuador", as: 0, date: "20260614" },
  { home: "Sweden", hs: 5, away: "Tunisia", as: 1, date: "20260614" },
  // 20260615
  { home: "Spain", hs: 0, away: "Cape Verde", as: 0, date: "20260615" },
  { home: "Belgium", hs: 1, away: "Egypt", as: 1, date: "20260615" },
  { home: "Saudi Arabia", hs: 1, away: "Uruguay", as: 1, date: "20260615" },
  { home: "Iran", hs: 2, away: "New Zealand", as: 2, date: "20260615" },
  // 20260616
  { home: "France", hs: 3, away: "Senegal", as: 1, date: "20260616" },
  { home: "Iraq", hs: 1, away: "Norway", as: 4, date: "20260616" },
  { home: "Argentina", hs: 3, away: "Algeria", as: 0, date: "20260616" },
  // 20260617
  { home: "Austria", hs: 3, away: "Jordan", as: 1, date: "20260617" },
  { home: "Portugal", hs: 1, away: "Congo DR", as: 1, date: "20260617" },
  { home: "England", hs: 4, away: "Croatia", as: 2, date: "20260617" },
  { home: "Ghana", hs: 1, away: "Panama", as: 0, date: "20260617" },
  { home: "Uzbekistan", hs: 1, away: "Colombia", as: 3, date: "20260617" },
  // 20260618
  { home: "Czechia", hs: 1, away: "South Africa", as: 1, date: "20260618" },
  { home: "Switzerland", hs: 4, away: "Bosnia-Herzegovina", as: 1, date: "20260618" },
  { home: "Canada", hs: 6, away: "Qatar", as: 0, date: "20260618" },
  { home: "Mexico", hs: 1, away: "South Korea", as: 0, date: "20260618" },
  // 20260619
  { home: "United States", hs: 2, away: "Australia", as: 0, date: "20260619" },
  { home: "Scotland", hs: 0, away: "Morocco", as: 1, date: "20260619" },
  { home: "Brazil", hs: 3, away: "Haiti", as: 0, date: "20260619" },
  { home: "Türkiye", hs: 0, away: "Paraguay", as: 1, date: "20260619" },
  // 20260620
  { home: "Netherlands", hs: 5, away: "Sweden", as: 1, date: "20260620" },
  { home: "Germany", hs: 2, away: "Ivory Coast", as: 1, date: "20260620" },
  { home: "Ecuador", hs: 0, away: "Curaçao", as: 0, date: "20260620" },
  // 20260621
  { home: "Tunisia", hs: 0, away: "Japan", as: 4, date: "20260621" },
  { home: "Spain", hs: 4, away: "Saudi Arabia", as: 0, date: "20260621" },
  { home: "Belgium", hs: 0, away: "Iran", as: 0, date: "20260621" },
  { home: "Uruguay", hs: 2, away: "Cape Verde", as: 2, date: "20260621" },
  { home: "New Zealand", hs: 1, away: "Egypt", as: 3, date: "20260621" },
  // 20260622
  { home: "Argentina", hs: 2, away: "Austria", as: 0, date: "20260622" },
  { home: "France", hs: 3, away: "Iraq", as: 0, date: "20260622" },
  { home: "Norway", hs: 3, away: "Senegal", as: 2, date: "20260622" },
  { home: "Jordan", hs: 1, away: "Algeria", as: 2, date: "20260622" },
  // 20260623
  { home: "Portugal", hs: 5, away: "Uzbekistan", as: 0, date: "20260623" },
  { home: "England", hs: 0, away: "Ghana", as: 0, date: "20260623" },
  { home: "Panama", hs: 0, away: "Croatia", as: 1, date: "20260623" },
  { home: "Colombia", hs: 1, away: "Congo DR", as: 0, date: "20260623" },
  // 20260624
  { home: "Bosnia-Herzegovina", hs: 3, away: "Qatar", as: 1, date: "20260624" },
  { home: "Switzerland", hs: 2, away: "Canada", as: 1, date: "20260624" },
  { home: "Morocco", hs: 4, away: "Haiti", as: 2, date: "20260624" },
  { home: "Scotland", hs: 0, away: "Brazil", as: 3, date: "20260624" },
  { home: "Czechia", hs: 0, away: "Mexico", as: 3, date: "20260624" },
  { home: "South Africa", hs: 1, away: "South Korea", as: 0, date: "20260624" },
  // 20260625
  { home: "Curaçao", hs: 0, away: "Ivory Coast", as: 2, date: "20260625" },
  { home: "Ecuador", hs: 2, away: "Germany", as: 1, date: "20260625" },
  { home: "Japan", hs: 1, away: "Sweden", as: 1, date: "20260625" },
  { home: "Tunisia", hs: 1, away: "Netherlands", as: 3, date: "20260625" },
  { home: "Paraguay", hs: 0, away: "Australia", as: 0, date: "20260625" },
  { home: "Türkiye", hs: 3, away: "United States", as: 2, date: "20260625" },
  // 20260626
  { home: "Norway", hs: 1, away: "France", as: 4, date: "20260626" },
  { home: "Senegal", hs: 5, away: "Iraq", as: 0, date: "20260626" },
  { home: "Cape Verde", hs: 0, away: "Saudi Arabia", as: 0, date: "20260626" },
  { home: "Uruguay", hs: 0, away: "Spain", as: 1, date: "20260626" },
  { home: "Egypt", hs: 1, away: "Iran", as: 1, date: "20260626" },
  { home: "New Zealand", hs: 1, away: "Belgium", as: 5, date: "20260626" },
];

console.log(`\n🔄 Actualizando ${allResults.length} resultados en la base de datos...\n`);

let updated = 0;
let notFound = 0;

for (const r of allResults) {
  const homeEs = translateEspn(r.home);
  const awayEs = translateEspn(r.away);

  const { rows } = await pool.query(
    `SELECT id, status FROM matches WHERE home_team = $1 AND away_team = $2`,
    [homeEs, awayEs]
  );

  if (rows.length === 0) {
    console.log(`⚠️  No encontrado en DB: ${homeEs} vs ${awayEs}`);
    notFound++;
    continue;
  }

  const match = rows[0];
  await pool.query(
    `UPDATE matches SET status = 'FINISHED', home_score = $1, away_score = $2 WHERE id = $3`,
    [r.hs, r.as, match.id]
  );
  console.log(`✅ ${homeEs} ${r.hs} - ${r.as} ${awayEs}`);
  updated++;
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`✅ Actualizados: ${updated}`);
console.log(`⚠️  No encontrados en DB: ${notFound}`);
console.log(`═══════════════════════════════════════════════\n`);

await pool.end();
