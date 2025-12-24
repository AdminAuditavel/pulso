//pulso-publico/components/Ranking.jsx

'use client';

import useSWR from 'swr';

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Erro ao buscar dados');
    return r.json();
  });

export default function Ranking() {
  const { data, error, isLoading, mutate } = useSWR('/api/daily_ranking', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60 * 1000,
  });

  if (isLoading) return <div>Carregando ranking…</div>;
  if (error)
    return (
      <div>
        Erro ao buscar ranking: {error.message}
        <button onClick={() => mutate()}>Tentar novamente</button>
      </div>
    );
  if (!data || !Array.isArray(data) || data.length === 0) return <div>Nenhum dado disponível</div>;

  return (
    <div>
      <h2>Ranking Diário</h2>
      <table>
        <thead>
          <tr>
            <th>Posição</th>
            <th>Clube</th>
            <th>IAP</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={item.club_id ?? idx}>
              <td>{idx + 1}</td>
              <td>{item.club_name ?? item.club ?? '—'}</td>
              <td>{item.iap ?? item.score ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
