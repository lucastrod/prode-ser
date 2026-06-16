async function fetchESPN() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
  const data = await res.json();
  const events = data.events || [];
  events.forEach(e => {
    console.log(e.name, '-', e.date, '-', e.status.type.shortDetail);
  });
}

fetchESPN();
