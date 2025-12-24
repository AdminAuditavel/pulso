//app/api/daily_ranking/route.js
export async function GET(req) {
  // Dados simulados para o ranking diário
  const data = [
    { club: 'Flamengo', score: 90 },
    { club: 'São Paulo', score: 80 },
    { club: 'Palmeiras', score: 85 },
    { club: 'Vasco', score: 75 },
    { club: 'Grêmio', score: 70 },
  ];

  return new Response(JSON.stringify(data), { status: 200 });
}
