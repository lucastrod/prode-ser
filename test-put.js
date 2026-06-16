async function main() {
  const url = 'https://prode-ya.vercel.app/api/admin/matches';
  
  const payload = {
    id: 1,
    homeTeam: "México",
    awayTeam: "Sudáfrica",
    matchDate: "2026-06-11T04:00:00.000Z",
    groupName: "Group A",
    status: "FINISHED",
    homeScore: 2,
    awayScore: 0
  };

  try {
    console.log('Sending PUT request to', url);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
