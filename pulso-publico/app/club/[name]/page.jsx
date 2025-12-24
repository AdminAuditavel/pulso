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

  useEffect(() => {
    if (clubName) fetchSeries(clubName);
  }, [clubName]);

  // Normaliza e ordena por data
  const rows = useMemo(() => {
    const arr = (Array.isArray(series) ? series : [])
      .map((r) => ({
        date: r?.date ? String(r.date).slice(0, 10) : null,
        value: toNumber(r?.value),
        rank_position: toNumber(r?.rank_position),
        volume_total: toNumber(r?.volume_total),
      }))
      .filter((r) => r.date && r.value !== null);

    // ordena asc por data
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return arr;
  }, [series]);

  // KPIs (último dia e anterior)
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

  const chartData = useMemo(() => {
    return {
      labels: rows.map((r) => r.date),
      datasets: [{ label: 'IAP', data: rows.map((r) => r.value) }],
    };
  }, [rows]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
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

      {!loading && !error && rows.length === 0 ? (
        <div>Nenhum dado de série disponível para este clube.</div>
      ) : null}

      {/* KPIs */}
      {!loading && !error && kpi ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
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

      {/* Gráfico */}
      {!loading && !error && rows.length > 0 ? (
        <div style={{ height: 420, width: '100%' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : null}
    </div>
  );
}
