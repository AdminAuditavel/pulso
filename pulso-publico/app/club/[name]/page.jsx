// app/club/[name]/page.jsx

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function toNumber(x) {
  const n = typeof x === 'string' ? Number(String(x).replace(',', '.')) : Number(x);
  return Number.isFinite(n) ? n : null;
}
function fmt2(n) {
  const v = toNumber(n);
  return v === null ? '—' : v.toFixed(2);
}
function fmtInt(n) {
  const v = toNumber(n);
  return v === null ? '—' : String(Math.round(v));
}
function pct(delta, base) {
  const d = toNumber(delta);
  const b = toNumber(base);
  if (d === null || b === null || b === 0) return '—';
  return ((d / b) * 100).toFixed(2) + '%';
}

function normalizeSeries(series) {
  const arr = (Array.isArray(series) ? series : [])
    .map((r) => ({
      date: r?.date ? String(r.date).slice(0, 10) : null,
      value: toNumber(r?.value),
      rank_position: toNumber(r?.rank_position),
      volume_total: toNumber(r?.volume_total),
    }))
    .filter((r) => r.date && r.value !== null);

  arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return arr;
}

export default function ClubPage() {
  const params = useParams();
  const rawName = params?.name;

  const clubName = useMemo(() => {
    if (!rawName) return '';
    const v = Array.isArray(rawName) ? rawName[0] : rawName;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }, [rawName]);

  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comparação
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [compareClub, setCompareClub] = useState(''); // name_short
  const [compareSeries, setCompareSeries] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);

  const fetchSeries = async (name) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/club_series?club=${encodeURIComponent(name)}&limit_days=180`);
      if (!res.ok) throw new Error(`Erro ao buscar série do clube (${res.status})`);
      const json = await res.json();
      setSeries(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    setClubsLoading(true);
    try {
      const res = await fetch('/api/clubs');
      if (!res.ok) throw new Error(`Erro ao buscar lista de clubes (${res.status})`);
      const json = await res.json();
      setClubs(Array.isArray(json) ? json : []);
    } catch {
      setClubs([]);
    } finally {
      setClubsLoading(false);
    }
  };

  const fetchCompare = async (name) => {
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch(`/api/club_series?club=${encodeURIComponent(name)}&limit_days=180`);
      if (!res.ok) throw new Error(`Erro ao buscar série do clube comparado (${res.status})`);
      const json = await res.json();
      setCompareSeries(Array.isArray(json) ? json : []);
    } catch (err) {
      setCompareError(err);
      setCompareSeries([]);
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (clubName) fetchSeries(clubName);
  }, [clubName]);

  useEffect(() => {
    fetchClubs();
  }, []);

  // Se trocar de clube na URL, limpa comparação automaticamente (evita confusão)
  useEffect(() => {
    setCompareClub('');
    setCompareSeries([]);
    setCompareError(null);
    setCompareLoading(false);
  }, [clubName]);

  const rows = useMemo(() => normalizeSeries(series), [series]);
  const rowsCompare = useMemo(() => normalizeSeries(compareSeries), [compareSeries]);

  // KPIs do clube principal (igual ao passo anterior)
  const kpi = useMemo(() => {
    if (!rows.length) return null;
    const last = rows[rows.length - 1];
    const prev = rows.length >= 2 ? rows[rows.length - 2] : null;
    const delta = prev ? (last.value ?? 0) - (prev.value ?? 0) : null;

    return {
      lastDate: last.date,
      iap: last.value,
      rank: last.rank_position,
      volume: last.volume_total,
      delta,
      deltaPct: prev ? pct(delta, prev.value) : '—',
      prevDate: prev?.date ?? null,
    };
  }, [rows]);

  // Monta labels alinhadas (união de datas)
  const aligned = useMemo(() => {
    const dates = new Set();
    rows.forEach((r) => dates.add(r.date));
    rowsCompare.forEach((r) => dates.add(r.date));
    const labels = Array.from(dates).sort((a, b) => String(a).localeCompare(String(b)));

    const mapA = new Map(rows.map((r) => [r.date, r.value]));
    const mapB = new Map(rowsCompare.map((r) => [r.date, r.value]));

    const a = labels.map((d) => (mapA.has(d) ? mapA.get(d) : null));
    const b = labels.map((d) => (mapB.has(d) ? mapB.get(d) : null));

    return { labels, a, b };
  }, [rows, rowsCompare]);

  const chartData = useMemo(() => {
    const datasets = [
      { label: clubName || 'Clube', data: aligned.a },
    ];

    if (compareClub) {
      datasets.push({ label: compareClub, data: aligned.b });
    }

    return { labels: aligned.labels, datasets };
  }, [aligned, clubName, compareClub]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } },
    };
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16, padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>{clubName || 'Clube'}</h1>
        <Link href="/" style={{ textDecoration: 'underline' }}>
          Voltar ao ranking
        </Link>
      </div>

      {loading ? <div>Carregando série…</div> : null}

      {error ? (
        <div>
          Erro ao buscar série: {error.message}
          <button onClick={() => fetchSeries(clubName)} style={{ marginLeft: 12 }}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!loading && !error && rows.length === 0 ? <div>Nenhum dado de série disponível para este clube.</div> : null}

      {/* KPIs */}
      {!loading && !error && kpi ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>IAP (último)</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt2(kpi.iap)}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Data: {kpi.lastDate}</div>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Variação vs anterior</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {kpi.delta === null ? '—' : (kpi.delta >= 0 ? '+' : '') + fmt2(kpi.delta)}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {kpi.prevDate ? `Base: ${kpi.prevDate} (${kpi.deltaPct})` : 'Sem dia anterior'}
            </div>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Rank (último)</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.rank === null ? '—' : fmtInt(kpi.rank)}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Data: {kpi.lastDate}</div>
          </div>

          <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Volume (último)</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{kpi.volume === null ? '—' : fmtInt(kpi.volume)}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Data: {kpi.lastDate}</div>
          </div>
        </div>
      ) : null}

      {/* COMPARAR */}
      {!loading && !error ? (
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Comparar com outro clube</div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 14 }}>Clube:</label>

            <select
              value={compareClub}
              onChange={(e) => {
                const v = e.target.value;
                setCompareClub(v);
                setCompareSeries([]);
                setCompareError(null);
                if (v) fetchCompare(v);
              }}
              disabled={clubsLoading}
              style={{ padding: 6, minWidth: 220 }}
            >
              <option value="">{clubsLoading ? 'Carregando…' : 'Selecione…'}</option>
              {clubs
                .map((c) => c.label)
                .filter((label) => label && label !== clubName) // não comparar consigo mesmo
                .map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
            </select>

            <button
              onClick={() => {
                setCompareClub('');
                setCompareSeries([]);
                setCompareError(null);
              }}
              disabled={!compareClub}
              title="Limpar comparação"
            >
              Limpar
            </button>

            {compareLoading ? <span style={{ fontSize: 12, opacity: 0.75 }}>Carregando comparação…</span> : null}
          </div>

          {compareError ? (
            <div style={{ fontSize: 13 }}>
              Erro na comparação: {compareError.message}{' '}
              <button onClick={() => compareClub && fetchCompare(compareClub)} style={{ marginLeft: 8 }}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            O gráfico abaixo mostra {clubName}
            {compareClub ? ` vs ${compareClub}` : ''} ao longo do tempo.
          </div>
        </div>
      ) : null}

      {/* Gráfico (agora suporta 1 ou 2 linhas) */}
      {!loading && !error && rows.length > 0 ? (
        <div style={{ height: 460, width: '100%' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : null}
    </div>
  );
}
