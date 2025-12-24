// pulso-publico/components/Ranking.jsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function getClubName(item) {
  if (!item) return '—';
  if (item.club && typeof item.club === 'object' && (item.club.name || item.club.club_name)) {
    return item.club.name ?? item.club.club_name;
  }
  if (item.club_name) return item.club_name;
  if (item.name) return item.name;
  if (item.club) {
    if (typeof item.club === 'string') return item.club;
    try {
      return JSON.stringify(item.club);
    } catch {
      // ignore
    }
  }
  if (item.club_id) return item.club_id.slice(0, 8) + '…';
  return '—';
}

function toNumber(x) {
  const n = typeof x === 'string' ? Number(String(x).replace(',', '.')) : Number(x);
  return Number.isFinite(n) ? n : null;
}

export default function Ranking() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
  const [selectedClub, setSelectedClub] = useState(''); // nome do clube

  const fetchData = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const qs = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`/api/daily_ranking${qs}`);
      if (!res.ok) throw new Error('Erro ao buscar dados');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lista de clubes para o dropdown (a partir dos dados carregados)
  const clubOptions = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const names = data.map(getClubName).filter((n) => n && n !== '—');
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Base rows (com valor numérico) — ainda sem filtro por clube
  const baseRows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        const raw = item?.score ?? item?.iap;
        const value = toNumber(raw);
        const club = getClubName(item);
        return {
          key: item?.club_id ?? `${club}-${Math.random()}`,
          club,
          value,
          rawItem: item,
        };
      })
      .filter((r) => r.value !== null);
  }, [data]);

  // Aplica filtro por clube (afeta tabela e gráfico)
  const rows = useMemo(() => {
    if (!selectedClub) return baseRows;
    return baseRows.filter((r) => r.club === selectedClub);
  }, [baseRows, selectedClub]);

  const chartData = useMemo(() => {
    return {
      labels: rows.map((r) => r.club),
      datasets: [{ label: 'IAP', data: rows.map((r) => r.value) }],
    };
  }, [rows]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: { y: { beginAtZero: true } },
    };
  }, []);

  if (loading) return <div>Carregando ranking…</div>;

  if (error)
    return (
      <div>
        Erro ao buscar ranking: {error.message}
        <button onClick={() => fetchData(selectedDate)} style={{ marginLeft: 12 }}>
          Tentar novamente
        </button>
      </div>
    );

  if (!data || !Array.isArray(data) || data.length === 0) return <div>Nenhum dado disponível</div>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Ranking Diário</h2>

      <div style={{ fontSize: 13, opacity: 0.85 }}>
        Exibindo: <strong>{selectedDate || 'último dia disponível'}</strong>
        {selectedClub ? (
          <>
            {' '}
            | Clube: <strong>{selectedClub}</strong>
          </>
        ) : null}
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Data (auto-aplica) */}
        <label style={{ fontSize: 14 }}>Data:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            const d = e.target.value;
            setSelectedDate(d);
            // ao trocar de data, mantém o clube selecionado (você pode mudar isso depois)
            fetchData(d);
          }}
        />

        <button
          onClick={() => {
            setSelectedDate('');
            fetchData('');
          }}
          disabled={loading}
          title="Voltar para o padrão (último dia disponível)"
        >
          Hoje/Último
        </button>

        {/* Clube (filtra localmente) */}
        <label style={{ fontSize: 14, marginLeft: 8 }}>Clube:</label>
        <select
          value={selectedClub}
          onChange={(e) => setSelectedClub(e.target.value)}
          style={{ padding: 4 }}
        >
          <option value="">Todos</option>
          {clubOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <button
          onClick={() => setSelectedClub('')}
          disabled={!selectedClub}
          title="Limpar filtro de clube"
        >
          Limpar clube
        </button>
      </div>

      {/* GRÁFICO */}
      <div style={{ height: 360, width: '100%' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* TABELA */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>Posição</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Clube</th>
            <th style={{ textAlign: 'left', padding: 8 }}>IAP</th>
          </tr>
        </thead>
        <tbody>
          {(selectedClub ? rows.map((r) => r.rawItem) : data).map((item, idx) => (
            <tr key={item.club_id ?? idx}>
              <td style={{ padding: 8 }}>{idx + 1}</td>
              <td style={{ padding: 8 }}>{getClubName(item)}</td>
              <td style={{ padding: 8 }}>{item.score ?? item.iap ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Observação: nenhuma linha tinha valor numérico em <code>score</code> ou <code>iap</code> para o filtro atual.
        </div>
      ) : null}
    </div>
  );
}
