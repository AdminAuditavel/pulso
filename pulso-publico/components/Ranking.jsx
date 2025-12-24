// pulso-publico/components/Ranking.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

function getClubName(item) {
  if (!item) return '—';
  // prioridade: club.name -> club_name -> name -> club string -> club_id truncado
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

export default function Ranking() {
  /* ============================
     Ranking diário (tabela + bar)
  ============================ */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD
  const [selectedClub, setSelectedClub] = useState(''); // nome

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

  const clubOptions = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const names = data.map(getClubName).filter((n) => n && n !== '—');
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const baseRows = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        const raw = item?.score ?? item?.iap;
        const value = toNumber(raw);
        const club = getClubName(item);
        return { club, value, rawItem: item };
      })
      .filter((r) => r.value !== null);
  }, [data]);

  const rows = useMemo(() => {
    if (!selectedClub) return baseRows;
    return baseRows.filter((r) => r.club === selectedClub);
  }, [baseRows, selectedClub]);

  const barData = useMemo(() => {
    return {
      labels: rows.map((r) => r.club),
      datasets: [{ label: 'IAP', data: rows.map((r) => r.value) }],
    };
  }, [rows]);

  const barOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } },
    };
  }, []);

  const tableItems = useMemo(() => {
    return selectedClub ? rows.map((r) => r.rawItem) : Array.isArray(data) ? data : [];
  }, [selectedClub, rows, data]);

  /* ============================
     Comparação multi-clubes (linha)
  ============================ */
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  // nomes/labels selecionados (até 5 normalmente; no modo A+B pode chegar a 10)
  const [compareSelected, setCompareSelected] = useState([]);
  const [compareMap, setCompareMap] = useState({}); // { [label]: normalizedSeries[] }
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState(null);

  // Top 5 vs Top 5 (Data B)
  const [compareDateB, setCompareDateB] = useState(''); // YYYY-MM-DD
  const [top5BLoading, setTop5BLoading] = useState(false);
  const [top5BError, setTop5BError] = useState(null);

  const fetchClubs = async () => {
    setClubsLoading(true);
    try {
      const res = await fetch('/api/clubs');
      if (!res.ok) throw new Error('Erro ao carregar lista de clubes');
      const json = await res.json();
      setClubs(Array.isArray(json) ? json : []);
    } catch {
      setClubs([]);
    } finally {
      setClubsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  async function fetchTopNByDate(date, n = 5) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`/api/daily_ranking${qs}`);
    if (!res.ok) throw new Error(`Falha ao buscar ranking do dia (${res.status})`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : [];
    return arr
      .map((it) => getClubName(it))
      .filter((name) => name && name !== '—')
      .slice(0, n);
  }

  const toggleCompare = (clubName) => {
    setCompareError(null);
    setTop5BError(null);

    setCompareSelected((prev) => {
      const exists = prev.includes(clubName);
      if (exists) return prev.filter((x) => x !== clubName);

      // Limite: se já estiver em modo A+B (10), não adiciona mais; se não, limita a 5
      const max = prev.some((x) => /\((A|B)\)\s*$/.test(String(x))) ? 10 : 5;
      if (prev.length >= max) return prev;

      return [...prev, clubName];
    });
  };

  // Carrega séries faltantes conforme compareSelected
  useEffect(() => {
    const need = compareSelected.filter((label) => !compareMap[label]);
    if (need.length === 0) return;

    let cancelled = false;

    async function loadMissing() {
      setCompareBusy(true);
      try {
        const updates = {};
        for (const label of need) {
          // Suporta rótulos do modo A/B: "Cruzeiro (A)" -> "Cruzeiro"
          const realName = String(label).replace(/\s*\((A|B)\)\s*$/, '');
          const res = await fetch(`/api/club_series?club=${encodeURIComponent(realName)}&limit_days=180`);
          if (!res.ok) throw new Error(`Falha ao buscar série: ${label}`);
          const json = await res.json();
          updates[label] = normalizeSeries(json);
        }
        if (!cancelled) setCompareMap((prev) => ({ ...prev, ...updates }));
      } catch (e) {
        if (!cancelled) setCompareError(e);
      } finally {
        if (!cancelled) setCompareBusy(false);
      }
    }

    loadMissing();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareSelected]);

  // Remove séries do mapa quando desmarca (mantém leve)
  useEffect(() => {
    const setSel = new Set(compareSelected);
    const keys = Object.keys(compareMap);
    const toRemove = keys.filter((k) => !setSel.has(k));
    if (toRemove.length === 0) return;

    setCompareMap((prev) => {
      const next = { ...prev };
      toRemove.forEach((k) => delete next[k]);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareSelected]);

  // Alinhar datas (união de datas de todos labels selecionados)
  const compareAligned = useMemo(() => {
    const selected = compareSelected.filter((label) => compareMap[label]);
    if (selected.length === 0) return { labels: [], datasets: [] };

    const dateSet = new Set();
    selected.forEach((label) => {
      compareMap[label].forEach((r) => dateSet.add(r.date));
    });

    const labels = Array.from(dateSet).sort((a, b) => String(a).localeCompare(String(b)));

    const datasets = selected.map((label) => {
      const map = new Map(compareMap[label].map((r) => [r.date, r.value]));
      return {
        label,
        data: labels.map((d) => (map.has(d) ? map.get(d) : null)),
      };
    });

    return { labels, datasets };
  }, [compareSelected, compareMap]);

  const lineOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } },
      elements: { line: { tension: 0.25 } },
    };
  }, []);

  const clubsForCompareUI = useMemo(() => {
    return (Array.isArray(clubs) ? clubs : [])
      .map((c) => c.label)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [clubs]);

  /* ============================
     Render - estados de erro
  ============================ */
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
    <div style={{ display: 'grid', gap: 18 }}>
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
        <label style={{ fontSize: 14 }}>Data:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            const d = e.target.value;
            setSelectedDate(d);
            fetchData(d); // auto-aplica
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

        <label style={{ fontSize: 14, marginLeft: 8 }}>Clube:</label>
        <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)} style={{ padding: 4 }}>
          <option value="">Todos</option>
          {clubOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <button onClick={() => setSelectedClub('')} disabled={!selectedClub} title="Limpar filtro de clube">
          Limpar clube
        </button>
      </div>

      {/* GRÁFICO (ranking do dia) */}
      <div style={{ height: 360, width: '100%' }}>
        <Bar data={barData} options={barOptions} />
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
          {tableItems.map((item, idx) => {
            const clubName = getClubName(item);
            const href = `/club/${encodeURIComponent(clubName)}`;
            return (
              <tr key={item.club_id ?? idx}>
                <td style={{ padding: 8 }}>{idx + 1}</td>
                <td style={{ padding: 8 }}>
                  {clubName && clubName !== '—' ? (
                    <Link href={href} style={{ textDecoration: 'underline' }}>
                      {clubName}
                    </Link>
                  ) : (
                    clubName
                  )}
                </td>
                <td style={{ padding: 8 }}>{item.score ?? item.iap ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ============================
          COMPARAÇÃO MULTI-CLUBES
         ============================ */}
      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Comparar clubes — evolução do IAP</div>

        {/* TOP 5 vs TOP 5 (A vs B) */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Top 5 vs Top 5: compara o Top 5 do ranking exibido (Data A) com o Top 5 de uma segunda data (Data B).
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12 }}>
              Data A: <strong>{selectedDate || 'último dia'}</strong>
            </div>

            <label style={{ fontSize: 12 }}>Data B:</label>
            <input
              type="date"
              value={compareDateB}
              onChange={(e) => {
                setCompareDateB(e.target.value);
                setTop5BError(null);
              }}
            />

            <button
              onClick={async () => {
                setTop5BError(null);
                setTop5BLoading(true);
                try {
                  if (!compareDateB) throw new Error('Selecione a Data B.');

                  // Top 5 da tabela atual (Data A)
                  const topA = (Array.isArray(tableItems) ? tableItems : [])
                    .map((it) => getClubName(it))
                    .filter((n) => n && n !== '—')
                    .slice(0, 5);

                  // Top 5 da Data B
                  const topB = await fetchTopNByDate(compareDateB, 5);

                  // Rotula A/B para não conflitar (ex.: "Cruzeiro (A)" e "Cruzeiro (B)")
                  const merged = [...topA.map((n) => `${n} (A)`), ...topB.map((n) => `${n} (B)`)];

                  setCompareError(null);
                  setCompareMap({}); // força recarga limpa
                  setCompareSelected(merged);
                } catch (e) {
                  setTop5BError(e);
                } finally {
                  setTop5BLoading(false);
                }
              }}
              disabled={top5BLoading}
              title="Carrega Top 5 da Data A (tabela atual) + Top 5 da Data B e sobrepõe no gráfico"
            >
              Carregar Top 5 A + B
            </button>

            {top5BLoading ? <span style={{ fontSize: 12, opacity: 0.75 }}>Carregando…</span> : null}
          </div>

          {top5BError ? <div style={{ fontSize: 12 }}>Erro: {top5BError.message}</div> : null}
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Modo manual: selecione até 5 clubes para sobrepor as linhas no mesmo gráfico.
        </div>

        {clubsLoading ? (
          <div>Carregando clubes…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {clubsForCompareUI.map((name) => {
              const checked = compareSelected.includes(name);
              const isABMode = compareSelected.some((x) => /\((A|B)\)\s*$/.test(String(x)));
              const max = isABMode ? 10 : 5;
              const disabled = !checked && compareSelected.length >= max;

              return (
                <label
                  key={name}
                  style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: disabled ? 0.6 : 1 }}
                >
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleCompare(name)} />
                  <span>{name}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* AÇÕES */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Selecionados: <strong>{compareSelected.length}</strong>/{compareSelected.some((x) => /\((A|B)\)\s*$/.test(String(x))) ? 10 : 5}
          </div>

          <button
            onClick={() => {
              // Top 5 do ranking atual (tabela exibida)
              const source = Array.isArray(tableItems) ? tableItems : [];
              const top = source
                .map((it) => getClubName(it))
                .filter((n) => n && n !== '—')
                .slice(0, 5);

              setTop5BError(null);
              setCompareError(null);
              setCompareSelected(top);
              // não zera compareMap: effect carrega o que estiver faltando
            }}
            disabled={!Array.isArray(tableItems) || tableItems.length === 0}
            title="Seleciona automaticamente os 5 primeiros do ranking exibido"
          >
            Top 5 do dia
          </button>

          <button
            onClick={() => {
              setCompareSelected([]);
              setCompareMap({});
              setCompareError(null);
              setTop5BError(null);
            }}
            disabled={compareSelected.length === 0}
          >
            Limpar seleção
          </button>

          {compareBusy ? <span style={{ fontSize: 12, opacity: 0.75 }}>Carregando séries…</span> : null}
        </div>

        {compareError ? <div style={{ fontSize: 13 }}>Erro ao carregar comparação: {compareError.message}</div> : null}

        {compareAligned.datasets.length >= 1 ? (
          <div style={{ height: 420, width: '100%' }}>
            <Line data={{ labels: compareAligned.labels, datasets: compareAligned.datasets }} options={lineOptions} />
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Selecione pelo menos 1 clube para visualizar o gráfico comparativo.</div>
        )}
      </div>
    </div>
  );
}
