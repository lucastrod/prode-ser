async function fetchESPN() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

fetchESPN();
