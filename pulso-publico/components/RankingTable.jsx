'use client';

import React from 'react';
import Link from 'next/link';
import MiniSparkline from './MiniSparkline';
import { MANUAL_PALETTE } from '../lib/rankingUtils';

/**
 * RankingTable
 * Props:
 *  - tableItems: array
 *  - renderTrend: function(item, idx) -> JSX
 *  - linkClub: fn
 */
export default function RankingTable({ tableItems = [], renderTrend = () => null, linkClub = (n) => `/club/${encodeURIComponent(n)}` }) {
  const sparkColor = MANUAL_PALETTE[0] ?? '#337d26';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 8 }}>Posição</th>
          <th style={{ textAlign: 'left', padding: 8 }}>Tendência</th>
          <th style={{ textAlign: 'left', padding: 8 }}>Clube</th>
          <th style={{ textAlign: 'left', padding: 8 }}>IAP</th>
          <th style={{ textAlign: 'left', padding: 8 }}>Tendência 7d</th>
        </tr>
      </thead>
      <tbody>
        {tableItems.map((item, idx) => {
          const clubName = (item && ((item.club && item.club.name) || item.club_name || item.name || item.club)) || '—';
          const href = linkClub(clubName);
          const rankPos = Number(item?.rank_position) || idx + 1;
          const key = item?.club_id ?? `${clubName}::${rankPos}::${idx}`;

          const series = Array.isArray(item?.series) ? item.series.map((s) => (s && s.value ? Number(String(s.value).replace(',', '.')) : null)) : [];

          return (
            <tr key={key}>
              <td style={{ padding: 8 }}>{rankPos}</td>
              <td style={{ padding: 8 }}>{renderTrend(item, idx)}</td>
              <td style={{ padding: 8 }}>
                {clubName && clubName !== '—' ? (
                  <Link href={href} style={{ textDecoration: 'underline', color: 'var(--c-1, #337d26)' }}>
                    {clubName}
                  </Link>
                ) : (
                  clubName
                )}
              </td>
              <td style={{ padding: 8, fontWeight: 700, color: 'var(--c-1, #337d26)' }}>{item.score ?? item.iap ?? '—'}</td>
              <td style={{ padding: 8, width: 140 }}>
                <MiniSparkline data={series} width={120} height={28} color={sparkColor} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
