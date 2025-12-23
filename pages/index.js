// pages/index.js

import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

// Registrar os componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Home() {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Chamada para a API para pegar os dados do ranking
    axios.get("/api/daily_ranking")
      .then(response => {
        setRankingData(response.data); // Salva os dados retornados pela API
        setLoading(false); // Marca o carregamento como concluído
      })
      .catch(error => {
        setError("Erro ao carregar os dados."); // Captura qualquer erro na requisição
        setLoading(false); // Marca o carregamento como concluído
      });
  }, []);

  if (loading) return <div>Carregando...</div>; // Mostra mensagem de carregamento
  if (error) return <div>{error}</div>; // Mostra mensagem de erro

  // Dados para o gráfico
  const data = {
    labels: rankingData.map(item => item.clube), // Nome dos clubes
    datasets: [
      {
        label: "Ranking Diário", // Nome do gráfico
        data: rankingData.map(item => item.rank), // Dados do ranking
        borderColor: 'rgba(75, 192, 192, 1)', // Cor da linha do gráfico
        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Cor de fundo da linha
      },
    ],
  };

  return (
    <div>
      <h1>Ranking Diário dos Clubes</h1>
      <Line data={data} /> {/* Exibe o gráfico */}
    </div>
  );
}
