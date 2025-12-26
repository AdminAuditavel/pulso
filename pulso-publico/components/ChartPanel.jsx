//components/ChartPanel.jsx
'use client';

import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import LoadingChartPlaceholder from './LoadingChartPlaceholder';
import { MANUAL_PALETTE, toNumber } from '../lib/rankingUtils';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

// IMPORTANT: registre aqui também (garante o Bar mesmo se tree-shaking modular ocorrer)
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/**
 * ChartPanel
 * Props:
 *  - rows: array of {club, value} (value precisa ser number)
 *  - loading: boolean
 */
export default function ChartPanel({ rows = [], loading = false }) {
  const primary = MANUAL_PALETTE[0] ?? '#337d26';

  // Sanitiza + ordena + limita (evita gráfico “achatado” quando há muitos clubes)
  const cleaned = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    const arr = rows
      .map((r) => {
        const club = r?.club ? String(r.club) : '';
        const v = toNumber(r?.value);
        return { club, value: v };
      })
      .filter((r) => r.club && r.club !== '—' && r.value !== null && Number.isFinite(r.value));

    // ordena desc (maior IAP primeiro)
    arr.sort((a, b) => b.value - a.value);

    // top N para legibilidade
    return arr.slice(0, 20);
  }, [rows]);

  const barData = useMemo(() => {
    return {
      labels: cleaned.map((r) => r.club),
      datasets: [
        {
          label: 'IAP',
          data: cleaned.map((r) => r.value),
          backgroundColor: primary,
        },
      ],
    };
  }, [cleaned, primary]);

  const barOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
          },
        },
        y: { beginAtZero: true },
      },
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: 360, width: '100%' }}>
        <LoadingChartPlaceholder height={360} />
      </div>
    );
  }

  if (!cleaned.length) {
    return (
      <div style={{ height: 360, width: '100%', display: 'grid', placeItems: 'center' }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Sem dados numéricos para plotar (verifique se <code>rows[].value</code> está vindo como número).
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 360, width: '100%' }}>
      <Bar data={barData} options={barOptions} />
    </div>
  );
}
