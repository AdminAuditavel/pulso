//pulso-frontend/app/page.tsx

"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Registrar os componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface RankingData {
  club_id: string;
  score: number;
}

interface ClubData {
  id: string;
  name_official: string;
}

interface SourceData {
  id: string;
  name: string;
}

export default function Home() {
  const [rankingData, setRankingData] = useState<RankingData[]>([]);
  const [clubData, setClubData] = useState<ClubData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Função para buscar dados do ranking diário
    const fetchData = async () => {
      try {
        // Usar rotas relativas para a API (serão /api/daily_ranking, /api/clubs, /api/sources)
        const rankingResponse = await axios.get('/api/daily_ranking');
        setRankingData(rankingResponse.data.data || []);

        const clubsResponse = await axios.get('/api/clubs');
        setClubData(clubsResponse.data.data || []);

        const sourcesResponse = await axios.get('/api/sources');
        setSourceData(sourcesResponse.data.data || []);

        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Preparar os dados para o gráfico
  const chartData = {
    labels: rankingData.map(item => item.club_id), // Usando o ID do clube como rótulo
    datasets: [
      {
        label: 'Ranking Diário',
        data: rankingData.map(item => item.score), // Usando a pontuação do ranking
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-center text-black dark:text-zinc-50">
          Pulso Esportivo - Ranking Diário
        </h1>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-xl text-black dark:text-zinc-50">Ranking dos Clubes</h2>
              <Line data={chartData} />
            </div>

            <h2 className="text-xl text-black dark:text-zinc-50 mt-6">Clubes</h2>
            <ul className="text-black dark:text-zinc-50">
              {clubData.map(club => (
                <li key={club.id}>
                  {club.name_official}
                </li>
              ))}
            </ul>

            <h2 className="text-xl text-black dark:text-zinc-50 mt-6">Fontes de Dados</h2>
            <ul className="text-black dark:text-zinc-50">
              {sourceData.map(source => (
                <li key={source.id}>
                  {source.name}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
