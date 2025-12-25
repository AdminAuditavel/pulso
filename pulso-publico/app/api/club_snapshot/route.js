// app/api/club_snapshot/route.js
export const runtime = "nodejs";
export const revalidate = 60;

async function sbFetch(url, supabaseKey) {
  return fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: "application/json",
    },
    next: { revalidate },
  });
}

function jsonResp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function resolveClubId(base, supabaseKey, clubName) {
  const q = new URLSearchParams();
  q.set("select", "id,name_official,name_short");
  q.set("or", `(name_official.eq.${clubName},name_short.eq.${clubName})`);
  q.set("limit", "1");

  const res = await sbFetch(`${base}/clubs?${q.toString()}`, supabaseKey);
  const text = await res.text();
  if (!res.ok) return { error: "Erro ao buscar clube", details: text };

  const arr = safeJson(text);
  if (!Array.isArray(arr) || arr.length === 0) return { error: "Clube não encontrado", details: text };

  return { id: arr[0].id };
}

async function getLatestAggregationDateForClub(base, supabaseKey, clubId) {
  // tenta na view com names primeiro
  const candidates = ["daily_ranking_with_names", "daily_ranking", "daily_rankings"];

  for (const resource of candidates) {
    const q = new URLSearchParams();
    q.set("select", "aggregation_date");
    q.set("club_id", `eq.${clubId}`);
    q.set("order", "aggregation_date.desc");
    q.set("limit", "1");

    const res = await sbFetch(`${base}/${resource}?${q.toString()}`, supabaseKey);
    const text = await res.text();
    if (!res.ok) continue;

    const arr = safeJson(text);
    const d = arr?.[0]?.aggregation_date ? String(arr[0].aggregation_date).slice(0, 10) : "";
    if (d) return d;
  }

  return "";
}

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return jsonResp({ error: "SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados" }, 500);
    }

    const url = new URL(req.url);
    const club = (url.searchParams.get("club") || "").trim();
    let date = (url.searchParams.get("date") || "").trim(); // opcional

    if (!club) return jsonResp({ error: "Parâmetro club é obrigatório" }, 400);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonResp({ error: "Parâmetro date deve estar no formato YYYY-MM-DD" }, 400);
    }

    const base = supabaseUrl.replace(/\/$/, "") + "/rest/v1";

    // resolve clubId
    const clubIdRes = await resolveClubId(base, supabaseKey, club);
    if (!clubIdRes?.id) {
      return jsonResp(
        { error: clubIdRes?.error || "Erro ao resolver club_id", club, details: clubIdRes?.details || null },
        404
      );
    }
    const clubId = clubIdRes.id;

    // resolve date quando não fornecida
    if (!date) {
      date = await getLatestAggregationDateForClub(base, supabaseKey, clubId);
      if (!date) {
        return jsonResp(
          { error: "Não foi possível determinar a data mais recente para este clube", club, club_id: clubId },
          404
        );
      }
    }

    // busca snapshot do dia na view/tabela disponível
    const candidates = ["daily_ranking_with_names", "daily_ranking", "daily_rankings"];
    let snapshot = null;
    let usedResource = "";
    let lastErrorText = "";

    for (const resource of candidates) {
      const q = new URLSearchParams();
      q.set("select", "*");
      q.set("club_id", `eq.${clubId}`);
      q.set("aggregation_date", `eq.${date}`);
      q.set("limit", "1");

      const res = await sbFetch(`${base}/${resource}?${q.toString()}`, supabaseKey);
      const text = await res.text();

      if (res.ok) {
        const arr = safeJson(text);
        if (Array.isArray(arr) && arr.length > 0) {
          snapshot = arr[0];
          usedResource = resource;
          break;
        } else {
          // sem dados para esse resource/data
          usedResource = resource;
        }
      } else {
        lastErrorText = text;
      }
    }

    // fallback: se a data escolhida não tem dados, pega última data com dados para o clube
    if (!snapshot) {
      const fallbackDate = await getLatestAggregationDateForClub(base, supabaseKey, clubId);
      if (fallbackDate && fallbackDate !== date) {
        date = fallbackDate;

        for (const resource of candidates) {
          const q = new URLSearchParams();
          q.set("select", "*");
          q.set("club_id", `eq.${clubId}`);
          q.set("aggregation_date", `eq.${date}`);
          q.set("limit", "1");

          const res = await sbFetch(`${base}/${resource}?${q.toString()}`, supabaseKey);
          const text = await res.text();

          if (res.ok) {
            const arr = safeJson(text);
            if (Array.isArray(arr) && arr.length > 0) {
              snapshot = arr[0];
              usedResource = resource;
              break;
            }
          } else {
            lastErrorText = text;
          }
        }
      }
    }

    if (!snapshot) {
      return jsonResp(
        {
          error: "Snapshot não encontrado (view/tabela incompatível ou sem dados)",
          club,
          club_id: clubId,
          requested_date: url.searchParams.get("date") || "",
          details: lastErrorText,
        },
        404
      );
    }

    // normaliza campos (mantém o que vier, mas garante algumas aliases úteis)
    const out = {
      ...snapshot,
      resolved_date: date,
      source: usedResource,
      club,
      club_id: clubId,
      // aliases frequentes
      score: snapshot.score ?? snapshot.iap_score ?? snapshot.iap ?? snapshot.score,
      aggregation_date: snapshot.aggregation_date ?? date,
    };

    return jsonResp(out, 200);
  } catch (err) {
    console.error("Erro na rota /api/club_snapshot:", err);
    return jsonResp({ error: "Erro interno na API" }, 500);
  }
}
