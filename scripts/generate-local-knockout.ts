import { dbClient } from '../src/lib/db-client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// We define FALLBACK_QUALIFIERS same as the route to make sure it runs correctly
const FALLBACK_QUALIFIERS: Record<string, string> = {
  "1A": "México",                     "2A": "Sudáfrica",
  "1B": "Argentina",                  "2B": "Canadá",
  "1C": "Brasil",                     "2C": "Marruecos",
  "1D": "Estados Unidos",             "2D": "Australia",
  "1E": "Alemania",                   "2E": "Costa de Marfil",
  "1F": "Países Bajos",               "2F": "Japón",
  "1G": "Bélgica",                    "2G": "Egipto",
  "1H": "España",                     "2H": "Argelia",
  "1I": "Francia",                    "2I": "Noruega",
  "1J": "Suiza",                      "2J": "Austria",
  "1K": "Colombia",                   "2K": "Portugal",
  "1L": "Inglaterra",                 "2L": "Croacia",
  "3A/B/C/D/F": "Paraguay",
  "3C/D/F/G/H": "Suecia",
  "3C/E/F/H/I": "Ecuador",
  "3E/H/I/J/K": "República Democrática del Congo",
  "3B/E/F/I/J": "Bosnia y Herzegovina",
  "3A/E/H/I/J": "Senegal",
  "3E/F/G/I/J": "Cabo Verde",
  "3D/E/I/J/L": "Ghana",
};

function isPlaceholder(name: string): boolean {
  return (
    /^[12][A-L]$/.test(name) ||           // 1A, 2B, ...
    /^3[A-L/]+$/.test(name) ||            // 3A/B/C/D/F, ...
    /^[WL]\d+$/.test(name) ||             // W73, L74 (winner/loser of match N)
    name.startsWith('[')                   // [1° Grupo A], etc.
  );
}

async function main() {
  console.log("Initializing fixtures...");
  await dbClient.importFixtures();

  console.log("Fetching matches...");
  const matches = await dbClient.getMatches();
  console.log(`Found ${matches.length} total matches.`);

  let updatedCount = 0;
  for (const match of matches) {
    if (match.stage !== 'GROUP') {
      let homeTeam = match.homeTeam;
      let awayTeam = match.awayTeam;
      let changed = false;

      if (isPlaceholder(homeTeam)) {
        const resolvedHome = FALLBACK_QUALIFIERS[homeTeam];
        if (resolvedHome) {
          homeTeam = resolvedHome;
          changed = true;
        }
      }

      if (isPlaceholder(awayTeam)) {
        const resolvedAway = FALLBACK_QUALIFIERS[awayTeam];
        if (resolvedAway) {
          awayTeam = resolvedAway;
          changed = true;
        }
      }

      if (changed) {
        console.log(`Resolving match ${match.id} (${match.stage}): ${match.homeTeam} vs ${match.awayTeam} -> ${homeTeam} vs ${awayTeam}`);
        await dbClient.updateMatch({
          id: match.id,
          homeTeam,
          awayTeam,
          matchDate: match.matchDate,
          groupName: match.groupName,
          status: match.status,
        });
        updatedCount++;
      }
    }
  }

  console.log(`Finished! Resolved ${updatedCount} knockout matches.`);
}

main().catch(err => {
  console.error(err);
});
