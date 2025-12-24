//app/ranking/page.js

'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Registrando os componentes necessários do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const RankingPage = () => {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/daily_ranking')
      .then(response => {
        setRankingData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar os dados do ranking:", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  // Dados para o gráfico
  const chartData = {
    labels: rankingData.map(item => item.club), // Nome dos clubes
    datasets: [{
      label: 'Ranking Diário',
      data: rankingData.map(item => item.score), // Pontuação dos clubes
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
    }]
  };

  return (
    <div>
      <h1>Ranking Diário de Clubes</h1>
      <Line data={chartData} />
    </div>
  );
};

export default RankingPage;
