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
    const clubName = url.searchParams.get('club');
    const limitDays = Number(url.searchParams.get('limit_days') || '90');

    if (!clubName || clubName.trim() === '') {
      return new Response(JSON.stringify({ error: 'Parâmetro club é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const base = supabaseUrl.replace(/\/$/, '') + '/rest/v1';
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    };

    // 1) Resolver clubName -> club_id consultando tabela clubs
    async function resolveClubIdByName(name) {
      const nameCols = ['name', 'club_name']; // tentativas comuns
      let lastText = '';

      for (const col of nameCols) {
        const p = new URLSearchParams();
        p.set('select', 'id,' + col);
        p.set(col, `eq.${name}`);

        const target = `${base}/clubs?${p.toString()}`;
        const res = await fetch(target, { headers });
        const text = await res.text();

        if (res.ok) {
          let rows = [];
          try {
            rows = JSON.parse(text);
          } catch {
            rows = [];
          }
          if (Array.isArray(rows) && rows.length > 0 && rows[0]?.id) {
            return { clubId: rows[0].id, matchedBy: col };
          }
        } else {
          lastText = text;
        }
      }

      // fallback: tentativa "ilike" se existir (útil se houver variação de maiúsculas)
      for (const col of ['name', 'club_name']) {
        const p = new URLSearchParams();
        p.set('select', 'id,' + col);
        p.set(col, `ilike.${name}`); // pode falhar se PostgREST não aceitar, mas tentamos

        const target = `${base}/clubs?${p.toString()}`;
        const res = await fetch(target, { headers });
        const text = await res.text();

        if (res.ok) {
          let rows = [];
          try {
            rows = JSON.parse(text);
          } catch {
            rows = [];
          }
          if (Array.isArray(rows) && rows.length > 0 && rows[0]?.id) {
            return { clubId: rows[0].id, matchedBy: `${col} ilike` };
          }
        } else {
          lastText = text;
        }
      }

      return { clubId: null, matchedBy: null, lastText };
    }

    const resolved = await resolveClubIdByName(clubName.trim());
    if (!resolved.clubId) {
      return new Response(
        JSON.stringify({
          error: 'Clube não encontrado na tabela clubs pelo nome informado',
          club: clubName,
          details: resolved.lastText || '',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const clubId = resolved.clubId;

    // 2) Buscar série temporal filtrando por club_id nas views/tabelas candidatas
    const resources = ['daily_ranking_with_names', 'daily_ranking', 'daily_rankings'];
    const dateCols = ['bucket_date', 'day', 'date', 'ranking_date', 'metric_date'];
    const scoreCols = ['score', 'iap'];

    let series = null;
    let meta = { resource: '', dateCol: '', scoreCol: '' };
    let lastErrorText = '';

    for (const resource of resources) {
      for (const dateCol of dateCols) {
        for (const scoreCol of scoreCols) {
          const p = new URLSearchParams();
          p.set('select', `${dateCol},${scoreCol},club_id`);
          p.set('club_id', `eq.${clubId}`);
          p.set('order', `${dateCol}.asc`);
          p.set('limit', String(limitDays));

          const target = `${base}/${resource}?${p.toString()}`;
          const res = await fetch(target, { headers });
          const text = await res.text();

          if (res.ok) {
            let rows = [];
            try {
              rows = JSON.parse(text);
            } catch {
              rows = [];
            }

            series = (Array.isArray(rows) ? rows : [])
              .map((r) => ({
                date: r?.[dateCol],
                value: r?.[scoreCol],
                club_id: r?.club_id ?? clubId,
                club_name: clubName,
              }))
              .filter((r) => r.date != null && r.value != null);

            meta = { resource, dateCol, scoreCol };
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
      return new Response(
        JSON.stringify({
          error: 'Não foi possível montar a série temporal (view/colunas incompatíveis)',
          club: clubName,
          club_id: clubId,
          details: lastErrorText,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(series), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Club-Id': clubId,
        'X-Club-Matched-By': resolved.matchedBy || '',
        'X-Source-Resource': meta.resource,
        'X-Date-Col': meta.dateCol,
        'X-Score-Col': meta.scoreCol,
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
