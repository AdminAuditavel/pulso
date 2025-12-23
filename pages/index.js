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

  useEffect(() => {
    // Chamada para a API para pegar os dados do ranking
    axios.get("/api/daily_ranking")
      .then(response => {
        setRankingData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar dados", error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Carregando...</div>;

  // Definindo os dados para o gráfico
  const data = {
    labels: rankingData.map(item => item.clube),
    datasets: [
      {
        label: "Ranking Diário",
        data: rankingData.map(item => item.rank),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  return (
    <div>
      <h1>Ranking Diário dos Clubes</h1>
      <Line data={data} />
    </div>
  );
}
