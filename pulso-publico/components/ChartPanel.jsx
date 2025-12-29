//components/ChartPanel.jsx
'use client';

import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import LoadingChartPlaceholder from './LoadingChartPlaceholder';
import { MANUAL_PALETTE } from '../lib/rankingUtils';

function toNumber(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = typeof x === 'string' ? Number(String(x).replace(',', '.')) : Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeClubKey(name) {
  const s = String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fmt2(x) {
  const n = toNumber(x);
  if (n === null) return '—';
  return n.toFixed(2);
}

/**
 * ChartPanel (Ranking chart)
 * Props:
 *  - rows: [{ club, value, rawItem, __club_key, ... }]
 *  - loading: bool
 *  - height: number (px)
 *  - topN: number
 *  - prevMetricsMap: Map(key -> { rank, score/iap/value, ... }) (opcional)
 *  - prevDateUsed: string YYYY-MM-DD (opcional)
 */
export default function ChartPanel({
  rows = [],
  loading = false,
  height = 520,
  topN = 20,
  prevMetricsMap = null,
  prevDateUsed = '',
}) {
  const primary = MANUAL_PALETTE[0] ?? '#337d26';

  const clean = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : [];

    return arr
      .map((r, idx) => {
        const club = r?.club;
        const rawItem = r?.rawItem ?? r;
        const value = toNumber(r?.value ?? r?.score ?? r?.iap ?? r?.iap_score ?? null);

        if (!club || club === '—' || value === null) return null;

        const rankPos = Number(rawItem?.rank_position) || idx + 1;
        const key = r?.__club_key || rawItem?.__club_key || normalizeClubKey(club);

        let prevRank = null;
        if (prevMetricsMap && typeof prevMetricsMap.get === 'function') {
          const pm =
            prevMetricsMap.get(key) ??
            prevMetricsMap.get(club) ??
            prevMetricsMap.get(normalizeClubKey(club));

          const pr = toNumber(pm?.rank);
          prevRank = pr !== null ? pr : null;
        }

        let rankDelta = null;
        if (prevRank !== null) rankDelta = prevRank - rankPos;

        return { club, value, rankPos, key, prevRank, rankDelta };
      })
      .filter(Boolean)
      .sort((a, b) => a.rankPos - b.rankPos)
      .slice(0, Math.max(1, Number(topN) || 20));
  }, [rows, topN, prevMetricsMap]);

  if (loading) {
    return (
      <div style={{ height, width: '100%' }}>
        <LoadingChartPlaceholder height={height} />
      </div>
    );
  }

  if (clean.length === 0) {
    return (
      <div style={{ height, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
        Sem dados para plotar.
      </div>
    );
  }

  const barData = {
    labels: clean.map((r) => r.club),
    datasets: [
      {
        label: 'IAP',
        data: clean.map((r) => r.value),
        backgroundColor: primary,
        borderWidth: 0,
        borderRadius: 10,
        barThickness: 16,
        maxBarThickness: 18,
      },
    ],
  };

  const barInnerLabelsPlugin = {
    id: 'barInnerLabels',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      const meta = chart.getDatasetMeta(0);
      const dataset = chart.data.datasets[0];

      if (!meta?.data?.length) return;

      ctx.save();
      ctx.textBaseline = 'middle';

      const insideFont = '600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      const outsideFont = '700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';

      for (let i = 0; i < meta.data.length; i += 1) {
        const bar = meta.data[i];
        const row = clean[i];
        const value = dataset.data[i];

        const props =
          typeof bar.getProps === 'function'
            ? bar.getProps(['x', 'y', 'base', 'width', 'height'], true)
            : bar;

        const xEnd = props.x;      // fim da barra (direita)
        const xStart = props.base; // início (esquerda)
        const yMid = props.y;

        const padIn = 10;
        const padOut = 10;

        // 1) TEXTO DENTRO DA BARRA: "20° . Botafogo ↑ 2"
        let trendTxt = '';
        if (row.rankDelta !== null) {
          const d = row.rankDelta;
          if (d > 0) trendTxt = `↑ ${d}`;
          else if (d < 0) trendTxt = `↓ ${Math.abs(d)}`;
          else trendTxt = '• 0';
        } else if (prevDateUsed) {
          trendTxt = '• —';
        } else {
          trendTxt = '';
        }

        const insideText = `${row.rankPos}° ${row.club}${trendTxt ? ' ' + trendTxt : ''}`;

        // largura disponível dentro da barra
        const innerLeft = Math.max(xStart + padIn, chartArea.left + 4);
        const innerRight = Math.min(xEnd - padIn, chartArea.right - 4);
        const innerWidth = innerRight - innerLeft;

        // desenha dentro só se couber minimamente (evita colisão visual)
        ctx.font = insideFont;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        if (innerWidth > 70) {
          // se estiver apertado, reduz o conteúdo (sem trend) antes de omitir
          let txt = insideText;
          const fullW = ctx.measureText(txt).width;

          if (fullW > innerWidth && trendTxt) {
            txt = `${row.rankPos}° ${row.club}`; // tira o trend
          }
          const w2 = ctx.measureText(txt).width;

          if (w2 <= innerWidth) {
            ctx.fillText(txt, innerLeft, yMid);
          } else if (innerWidth > 90) {
            // último recurso: abrevia clube
            const short = `${row.rankPos}° ${String(row.club).slice(0, 10)}…`;
            if (ctx.measureText(short).width <= innerWidth) {
              ctx.fillText(short, innerLeft, yMid);
            }
          }
        }

        // 2) VALOR FORA DA BARRA (à direita): "78.59"
        // posiciona fora, mas respeita chartArea
        const outX = Math.min(xEnd + padOut, chartArea.right - 2);

        ctx.font = outsideFont;
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.textAlign = 'left';

        // se a barra estiver muito perto do limite direito, ainda assim tenta desenhar,
        // mas sem estourar o chartArea (o clamp acima já protege)
        ctx.fillText(fmt2(value), outX, yMid);
      }

      ctx.restore();
    },
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      // espaço à direita para o valor fora da barra
      padding: { right: 46 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (items) => {
            if (!items?.length) return '';
            const idx = items[0].dataIndex;
            const row = clean[idx];
            return `${row.rankPos}° ${row.club}`;
          },
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const row = clean[idx];

            const lines = [];
            lines.push(`IAP: ${fmt2(row.value)}`);

            if (prevDateUsed) {
              if (row.rankDelta === null) lines.push(`Movimento vs ${prevDateUsed}: —`);
              else if (row.rankDelta > 0) lines.push(`Movimento vs ${prevDateUsed}: ↑ ${row.rankDelta}`);
              else if (row.rankDelta < 0) lines.push(`Movimento vs ${prevDateUsed}: ↓ ${Math.abs(row.rankDelta)}`);
              else lines.push(`Movimento vs ${prevDateUsed}: 0`);
            }

            return lines;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: { display: false },
        grid: { display: false },
      },
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { font: { size: 12 } },
      },
    },
  };

  return (
    <div style={{ height, width: '100%' }}>
      <Bar data={barData} options={barOptions} plugins={[barInnerLabelsPlugin]} />
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
        {prevDateUsed ? `Comparação: vs ${prevDateUsed}.` : 'Sem comparação (sem dia anterior).'} Passe o mouse/toque nas barras para detalhes.
      </div>
    </div>
  );
}
