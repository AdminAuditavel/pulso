// app/api/club_series/route.js
export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const club = url.searchParams.get('club');
    const limitDays = url.searchParams.get('limit_days') || '60';

    if (!club || club.trim() === '') {
      return new Response(JSON.stringify({ error: 'Parâmetro club é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const base = supabaseUrl.replace(/\/$/, '') + '/rest/v1';

    // Prioriza view com nomes
    const resources = ['daily_ranking_with_names', 'daily_ranking', 'daily_rankings'];

    // Nomes comuns de coluna de data
    const dateCols = ['bucket_date', 'day', 'date', 'ranking_date', 'metric_date'];

    // Colunas comuns do score
    const scoreCols = ['score', 'iap'];

    let series = null;
    let usedResource = '';
    let usedDateCol = '';
    let usedScoreCol = '';
    let lastErrorText = '';

    for (const resource of resources) {
      for (const dateCol of dateCols) {
        for (const scoreCol of scoreCols) {
          // Monta query PostgREST
          // - filtro por club_name (quando existir)
          // - select mínimo
          // - ordena por data asc
          const params = new URLSearchParams();
          params.set('select', `${dateCol},${scoreCol},club_name`);
          params.set('order', `${dateCol}.asc`);
          params.set('limit', String(limitDays));
          params.set('club_name', `eq.${club}`);

          const target = `${base}/${resource}?${params.toString()}`;

          const res = await fetch(target, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              Accept: 'application/json',
            },
          });

          const text = await res.text();

          if (res.ok) {
            let data = [];
            try {
              data = JSON.parse(text);
            } catch {
              data = [];
            }

            // Normaliza output para { date, value }
            const mapped = Array.isArray(data)
              ? data
                  .map((row) => ({
                    date: row?.[dateCol],
                    value: row?.[scoreCol],
                    club_name: row?.club_name ?? club,
                  }))
                  .filter((r) => r.date != null && r.value != null)
              : [];

            series = mapped;
            usedResource = resource;
            usedDateCol = dateCol;
            usedScoreCol = scoreCol;
            break;
          } else {
            lastErrorText = text;
          }
        }
        if (series) break;
      }
      if (series) break;
    }

    if (!series) {
      // Fallback: devolve erro explícito para debugar no browser
      return new Response(
        JSON.stringify({
          error: 'Não foi possível montar a série do clube (resource/colunas não compatíveis)',
          details: lastErrorText,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(series), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Source-Resource': usedResource,
        'X-Date-Col': usedDateCol,
        'X-Score-Col': usedScoreCol,
      },
    });
  } catch (err) {
    console.error('Erro na rota /api/club_series:', err);
    return new Response(JSON.stringify({ error: 'Erro interno na API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
