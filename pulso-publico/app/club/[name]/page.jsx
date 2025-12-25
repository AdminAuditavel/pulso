// app/club/[name]/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

function toNumber(x) {
  const n = typeof x === 'string' ? Number(String(x).replace(',', '.')) : Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeSeries(series) {
  const arr = (Array.isArray(series) ? series : [])
    .map((r) => ({
      date: r?.date ? String(r.date).slice(0, 10) : null,
      value: toNumber(r?.value),
    }))
    .filter((r) => r.date && r.value !== null);

  arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return arr;
}

export default function ClubPage() {
  const params = useParams();

  const clubName = useMemo(() => {
    const raw = params?.name;
    const asString = Array.isArray(raw) ? raw[0] : raw;
    return asString ? decodeURIComponent(String(asString)) : '';
  }, [params]);

  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD (opcional)

  const [snapshot, setSnapshot] = useState(null);
  const [snapLoading, setSnapLoading] = useState(true);
  const [snapError, setSnapError] = useState(null);

  const [series, setSeries] = useState([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState(null);

  // Sources do dia
  const [sourcesDay, setSourcesDay] = useState(null);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState(null);

  async function fetchSnapshot(date) {
    if (!clubName) return;
    setSnapLoading(true);
    setSnapError(null);

    try {
      const qs = new URLSearchParams();
      qs.set('club', clubName);
      if (date) qs.set('date', date);

      const res = await fetch(`/api/club_snapshot?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ao buscar snapshot (${res.status})${text ? ` - ${text}` : ''}`);
      }
      const json = await res.json();
      setSnapshot(json);
    } catch (e) {
      setSnapError(e);
      setSnapshot(null);
    } finally {
      setSnapLoading(false);
    }
  }

  async function fetchSeries() {
    if (!clubName) return;
    setSeriesLoading(true);
    setSeriesError(null);

    try {
      const res = await fetch(`/api/club_series?club=${encodeURIComponent(clubName)}&limit_days=180`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ao buscar série do clube (${res.status})${text ? ` - ${text}` : ''}`);
      }
      const json = await res.json();
      setSeries(normalizeSeries(json));
    } catch (e) {
      setSeriesError(e);
      setSeries([]);
    } finally {
      setSeriesLoading(false);
    }
  }

  async function fetchSourcesDay(date) {
    if (!clubName) return;
    setSourcesLoading(true);
    setSourcesError(null);

    try {
      const qs = new URLSearchParams();
      qs.set('club', clubName);
      if (date) qs.set('date', date);

      const res = await fetch(`/api/club_sources_day?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ao buscar fontes do dia (${res.status})${text ? ` - ${text}` : ''}`);
      }
      const json = await res.json();
      setSourcesDay(json);
    } catch (e) {
      setSourcesError(e);
      setSourcesDay(null);
    } finally {
      setSourcesLoading(false);
    }
  }

  // Primeiro load
  useEffect(() => {
    if (!clubName) return;
    fetchSnapshot('');
    fetchSeries();
    fetchSourcesDay('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubName]);

  // Atualiza quando troca data (painel + fontes do dia)
  useEffect(() => {
    if (!clubName) return;
    fetchSnapshot(selectedDate);
    fetchSourcesDay(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, clubName]);

  const lineData = useMemo(() => {
    return {
      labels: series.map((p) => p.date),
      datasets: [
        {
          label: 'IAP (série)',
          data: series.map((p) => p.value),
          borderColor: '#2563EB',
          backgroundColor: '#2563EB',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [series]);

  const lineOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } },
      elements: { line: { tension: 0.25 } },
    };
  }, []);

  const driversData = useMemo(() => {
    const vol = toNumber(snapshot?.volume_total);
    const sent = toNumber(snapshot?.sentiment_score);

    return {
      labels: ['Volume', 'Sentimento (x100)'],
      datasets: [
        {
          label: 'Drivers do dia',
          data: [vol !== null ? vol : 0, sent !== null ? Math.round(sent * 100) : 0],
          backgroundColor: ['#16A34A', '#F97316'],
        },
      ],
    };
  }, [snapshot]);

  const driversOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } },
    };
  }, []);

  // Gráfico: Volume por fonte
  const sourcesBarData = useMemo(() => {
    const src = sourcesDay?.sources;
    if (!Array.isArray(src) || src.length === 0) return null;

    return {
      labels: src.map((s) => s.source_code || s.source_id),
      datasets: [
        {
          label: 'Volume (dia)',
          data: src.map((s) => toNumber(s.volume_total) ?? 0),
        },
      ],
    };
  }, [sourcesDay]);

  const sourcesBarOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } },
    };
  }, []);

  const sourcesTop3 = useMemo(() => {
    const src = sourcesDay?.sources;
    if (!Array.isArray(src)) return [];
    return [...src].slice(0, 3);
  }, [sourcesDay]);

  if (!clubName) {
    return (
      <main style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
        <div>Carregando clube…</div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 16, display: 'grid', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Clube — {clubName}</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            <Link href="/" style={{ textDecoration: 'underline' }}>
              Voltar ao ranking
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13 }}>Data (painel do dia):</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <button onClick={() => setSelectedDate('')} title="Usar o último dia disponível">
            Último dia
          </button>
        </div>
      </div>

      {/* Painel do dia (snapshot) */}
      <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Painel do dia</div>

        {snapLoading ? (
          <div>Carregando painel…</div>
        ) : snapError ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>Erro ao buscar painel: {snapError.message}</div>
            <button onClick={() => fetchSnapshot(selectedDate)}>Tentar novamente</button>
          </div>
        ) : snapshot ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Data</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{snapshot.aggregation_date || '—'}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>IAP (score)</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {snapshot.score !== null && snapshot.score !== undefined ? Number(snapshot.score).toFixed(2) : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Volume total</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {snapshot.volume_total !== null && snapshot.volume_total !== undefined ? snapshot.volume_total : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Sentimento</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {snapshot.sentiment_score !== null && snapshot.sentiment_score !== undefined
                    ? Number(snapshot.sentiment_score).toFixed(2)
                    : '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Posição</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {snapshot.rank_position !== null && snapshot.rank_position !== undefined ? snapshot.rank_position : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Nota: no gráfico “Drivers”, o sentimento está multiplicado por 100 apenas para visual.
              </div>
              <div style={{ height: 220 }}>
                <Bar data={driversData} options={driversOptions} />
              </div>
            </div>
          </>
        ) : (
          <div>Nenhum snapshot encontrado.</div>
        )}
      </section>

      {/* De onde veio o score hoje? (fontes) */}
      <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>De onde veio o score hoje?</div>

        {sourcesLoading ? (
          <div>Carregando fontes do dia…</div>
        ) : sourcesError ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>Erro ao buscar fontes do dia: {sourcesError.message}</div>
            <button onClick={() => fetchSourcesDay(selectedDate)}>Tentar novamente</button>
          </div>
        ) : !sourcesDay || !Array.isArray(sourcesDay.sources) || sourcesDay.sources.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.85 }}>Sem dados de buckets por fonte para este dia.</div>
        ) : (
          <>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Data: <strong>{sourcesDay.date}</strong> | Top 3 fontes por volume:{' '}
              {sourcesTop3.map((s, i) => (
                <span key={s.source_id}>
                  {i > 0 ? ', ' : ''}
                  <strong>{s.source_code}</strong> ({s.volume_total})
                </span>
              ))}
            </div>

            <div style={{ height: 260 }}>
              <Bar data={sourcesBarData} options={sourcesBarOptions} />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Fonte</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Volume</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Sentimento médio</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcesDay.sources.map((s) => (
                    <tr key={s.source_id}>
                      <td style={{ padding: 8 }}>{s.source_code}</td>
                      <td style={{ padding: 8 }}>{s.volume_total}</td>
                      <td style={{ padding: 8 }}>
                        {s.sentiment_avg === null || s.sentiment_avg === undefined
                          ? '—'
                          : Number(s.sentiment_avg).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Série temporal */}
      <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Série temporal (últimos 180 dias)</div>

        {seriesLoading ? (
          <div>Carregando série…</div>
        ) : seriesError ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>Erro ao buscar série: {seriesError.message}</div>
            <button onClick={fetchSeries}>Tentar novamente</button>
          </div>
        ) : series.length === 0 ? (
          <div>Nenhum dado de série disponível.</div>
        ) : (
          <div style={{ height: 420 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        )}
      </section>
    </main>
  );
}
