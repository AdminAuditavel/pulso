// app/api/daily_ranking/route.js
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

const RANKING_SOURCES = ["daily_ranking_with_names", "daily_ranking", "daily_rankings"];

// ajuste se o nome do recurso for diferente
const AGG_SOURCE = "daily_aggregations_v2";
const CLUBS_SOURCE = "clubs";

function isYmd(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function getLatestAggregationDateFrom(base, supabaseKey, resource) {
  const q = new URLSearchParams();
  q.set("select", "aggregation_date");
  q.set("order", "aggregation_date.desc");
  q.set("limit", "1");

  const url = `${base}/${resource}?${q.toString()}`;
  const res = await sbFetch(url, supabaseKey);
  const text = await res.text();
  if (!res.ok) return "";
  const arr = safeJson(text);
  const d = arr?.[0]?.aggregation_date ? String(arr[0].aggregation_date).slice(0, 10) : "";
  return d || "";
}

async function getLatestAggregationDate(base, supabaseKey) {
  for (const r of RANKING_SOURCES) {
    const d = await getLatestAggregationDateFrom(base, supabaseKey, r);
    if (d) return { date: d, source: r };
  }
  const dAgg = await getLatestAggregationDateFrom(base, supabaseKey, AGG_SOURCE);
  if (dAgg) return { date: dAgg, source: AGG_SOURCE };
  return { date: "", source: "" };
}

async function fetchRankingMaterialized(base, supabaseKey, requestedDate, incoming) {
  const limit = incoming.get("limit") || "20";
  const order = incoming.get("order") || "score.desc";
  const select = incoming.get("select") || "*";

  const params = new URLSearchParams();
  params.set("select", select);
  params.set("order", order);
  params.set("limit", limit);
  params.set("aggregation_date", `eq.${requestedDate}`);

  let lastErrorText = "";
  for (const resource of RANKING_SOURCES) {
    const target = `${base}/${resource}?${params.toString()}`;
    const res = await sbFetch(target, supabaseKey);
    const text = await res.text();

    if (!res.ok) {
      lastErrorText = text;
      continue;
    }
    const parsed = safeJson(text);
    const arr = Array.isArray(parsed) ? parsed : [];
    return { ok: true, data: arr, usedResource: resource, lastErrorText: "" };
  }

  return { ok: false, data: null, usedResource: "", lastErrorText };
}

async function fetchClubsMap(base, supabaseKey) {
  // fallback: map club_id -> club_name (depende do schema; tentamos o máximo)
  const q = new URLSearchParams();
  q.set("select", "*");
  q.set("limit", "5000");

  const url = `${base}/${CLUBS_SOURCE}?${q.toString()}`;
  const res = await sbFetch(url, supabaseKey);
  const text = await res.text();
  if (!res.ok) return new Map();

  const arr = safeJson(text);
  const map = new Map();

  (Array.isArray(arr) ? arr : []).forEach((c) => {
    const id =
      c?.id ??
      c?.club_id ??
      c?.uuid ??
      c?.public_id ??
      null;

    const name =
      c?.name ??
      c?.label ??
      c?.club_name ??
      c?.display_name ??
      c?.short_name ??
      null;

    if (id && name) map.set(String(id), String(name));
  });

  return map;
}

function extractEmbeddedName(r) {
  // tenta padrões comuns de embed
  // ex: r.clubs = { name }, ou r.club = { name }, ou r.clubs = [{name}]
  const v =
    r?.clubs?.name ??
    r?.club?.name ??
    r?.clubs?.[0]?.name ??
    r?.club?.[0]?.name ??
    null;
  return v ? String(v) : "";
}

async function fetchAggregationsWithName(base, supabaseKey, requestedDate, limit) {
  // Tentativas de embed (o PostgREST aceita sintaxes diferentes dependendo do relacionamento)
  const selectVariants = [
    "club_id,aggregation_date,volume_total,volume_normalized,sentiment_score,clubs(name)",
    "club_id,aggregation_date,volume_total,volume_normalized,sentiment_score,club(name)",
    "club_id,aggregation_date,volume_total,volume_normalized,sentiment_score,clubs:clubs(name)",
    "club_id,aggregation_date,volume_total,volume_normalized,sentiment_score,club:clubs(name)",
  ];

  for (const sel of selectVariants) {
    const p = new URLSearchParams();
    p.set("select", sel);
    p.set("aggregation_date", `eq.${requestedDate}`);
    p.set("limit", String(Math.max(1, Number(limit) || 20)));

    const url = `${base}/${AGG_SOURCE}?${p.toString()}`;
    const res = await sbFetch(url, supabaseKey);
    const text = await res.text();

    if (!res.ok) continue;

    const arr = safeJson(text);
    if (Array.isArray(arr)) return arr;
  }

  // fallback sem embed
  const p0 = new URLSearchParams();
  p0.set("select", "club_id,aggregation_date,volume_total,volume_normalized,sentiment_score");
  p0.set("aggregation_date", `eq.${requestedDate}`);
  p0.set("limit", String(Math.max(1, Number(limit) || 20)));

  const url0 = `${base}/${AGG_SOURCE}?${p0.toString()}`;
  const res0 = await sbFetch(url0, supabaseKey);
  const text0 = await res0.text();
  if (!res0.ok) return [];

  const arr0 = safeJson(text0);
  return Array.isArray(arr0) ? arr0 : [];
}

function buildRankingFromAggregations(aggRows, clubsMap, limit) {
  const rows = (Array.isArray(aggRows) ? aggRows : [])
    .map((r) => {
      const clubId = r?.club_id ? String(r.club_id) : "";

      // 1) tenta embed
      const embeddedName = extractEmbeddedName(r);

      // 2) tenta map
      const mappedName = clubsMap.get(clubId);

      const clubName = embeddedName || mappedName || r?.club_name || clubId || "—";

      const score =
        toNumber(r?.volume_normalized) ??
        toNumber(r?.score) ??
        toNumber(r?.volume_total) ??
        null;

      const volumeTotal = toNumber(r?.volume_total) ?? 0;
      const sentiment = toNumber(r?.sentiment_score) ?? 0;

      return {
        aggregation_date: String(r?.aggregation_date || "").slice(0, 10),
        club_id: clubId,
        club_name: clubName,
        score,
        volume_total: volumeTotal,
        sentiment_score: sentiment,
      };
    })
    .filter((x) => x.club_id && x.club_name && x.club_name !== "—");

  rows.sort((a, b) => {
    const x = a.score;
    const y = b.score;
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return y - x;
  });

  const sliced = rows.slice(0, Math.max(1, Number(limit) || 20));

  let lastVal = null;
  let lastRank = 0;
  for (let i = 0; i < sliced.length; i += 1) {
    const v = sliced[i].score;
    const pos = i + 1;
    if (v === null) {
      sliced[i].rank_position = pos;
    } else if (lastVal !== null && v === lastVal) {
      sliced[i].rank_position = lastRank;
    } else {
      sliced[i].rank_position = pos;
      lastRank = pos;
      lastVal = v;
    }
  }

  return sliced.map((item) => ({
    ...item,
    club: { name: item.club_name },
  }));
}

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return jsonResp({ error: "SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados" }, 500);
    }

    const incoming = new URL(req.url).searchParams;
    const base = supabaseUrl.replace(/\/$/, "") + "/rest/v1";

    const hadDateParam = incoming.has("date") && (incoming.get("date") || "").trim() !== "";

    let requestedDate = (incoming.get("date") || "").trim();
    if (requestedDate && !isYmd(requestedDate)) {
      return jsonResp({ error: "Parâmetro date deve estar no formato YYYY-MM-DD" }, 400);
    }

    if (!requestedDate) {
      const latest = await getLatestAggregationDate(base, supabaseKey);
      requestedDate = latest.date;
      if (!requestedDate) {
        return jsonResp({ error: "Não foi possível determinar a data mais recente do ranking" }, 500);
      }
    }

    // 1) ranking materializado
    const materialized = await fetchRankingMaterialized(base, supabaseKey, requestedDate, incoming);
    if (!materialized.ok) {
      return jsonResp(
        { error: "Erro ao buscar daily_ranking (nenhuma fonte retornou ok)", details: materialized.lastErrorText },
        500
      );
    }

    let usedSource = materialized.usedResource;
    let rows = materialized.data;

    // 2) fallback para agregações quando materializado não existir para a data
    if (Array.isArray(rows) && rows.length === 0) {
      const limit = incoming.get("limit") || "20";

      // carrega agregações já tentando embed de nome
      const aggArr = await fetchAggregationsWithName(base, supabaseKey, requestedDate, limit);

      if (Array.isArray(aggArr) && aggArr.length > 0) {
        const clubsMap = await fetchClubsMap(base, supabaseKey);
        const computed = buildRankingFromAggregations(aggArr, clubsMap, limit);
        if (computed.length > 0) {
          usedSource = AGG_SOURCE;
          rows = computed;
        }
      }

      // se usuário NÃO passou date e não achou nada, resolve para último dia com dados em AGG_SOURCE
      if (!hadDateParam && Array.isArray(rows) && rows.length === 0) {
        const latestAgg = await getLatestAggregationDateFrom(base, supabaseKey, AGG_SOURCE);
        if (latestAgg && latestAgg !== requestedDate) {
          requestedDate = latestAgg;
          const aggArr2 = await fetchAggregationsWithName(base, supabaseKey, requestedDate, limit);
          if (Array.isArray(aggArr2) && aggArr2.length > 0) {
            const clubsMap2 = await fetchClubsMap(base, supabaseKey);
            const computed2 = buildRankingFromAggregations(aggArr2, clubsMap2, limit);
            if (computed2.length > 0) {
              usedSource = AGG_SOURCE;
              rows = computed2;
            }
          }
        }
      }
    }

    // compat final
    const mapped = (Array.isArray(rows) ? rows : []).map((item) => {
      if (item?.club?.name) return item;
      if (item?.club_name) return { ...item, club: { name: item.club_name } };
      return item;
    });

    return jsonResp({
      resolved_date: requestedDate,
      source: usedSource,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    console.error("Erro na rota /api/daily_ranking:", err);
    return jsonResp({ error: "Erro interno na API" }, 500);
  }
}
