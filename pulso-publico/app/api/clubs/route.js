// app/api/clubs/route.js
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const base = supabaseUrl.replace(/\/$/, '') + '/rest/v1';
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    };

    // Lista de clubes para UI: preferir name_short (o que você exibe no ranking)
    const params = new URLSearchParams();
    params.set('select', 'id,name_official,name_short,active');
    params.set('active', 'eq.true');
    params.set('order', 'name_short.asc');

    const res = await fetch(`${base}/clubs?${params.toString()}`, { headers });
    const text = await res.text();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao buscar clubs', details: text }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let rows = [];
    try {
      rows = JSON.parse(text);
    } catch {
      rows = [];
    }

    // Entrega um formato amigável para dropdown
    const out = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      name_short: r.name_short,
      name_official: r.name_official,
      label: r.name_short || r.name_official || r.id,
    }));

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erro na rota /api/clubs:', err);
    return new Response(JSON.stringify({ error: 'Erro interno na API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
