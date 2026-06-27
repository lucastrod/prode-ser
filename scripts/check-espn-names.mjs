// Check ESPN team names for dates with missing matches
const dates = ['20260611','20260612','20260613','20260614','20260615','20260616','20260617','20260618','20260619','20260620','20260621','20260622','20260623','20260624','20260625','20260626','20260627'];

for (const dateStr of dates) {
  const resp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`);
  const data = await resp.json();
  const events = data.events || [];
  if (events.length === 0) continue;
  console.log(`\n📅 ${dateStr} (${events.length} eventos):`);
  for (const e of events) {
    const comps = e.competitions?.[0]?.competitors || [];
    const home = comps.find(c => c.homeAway === 'home');
    const away = comps.find(c => c.homeAway === 'away');
    const score = `${home?.score ?? '?'}-${away?.score ?? '?'}`;
    console.log(`  ${home?.team?.displayName} ${score} ${away?.team?.displayName} | ${e.status?.type?.shortDetail}`);
  }
}
