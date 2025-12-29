//components/RankingTable.jsx
'use client';

import React from 'react';
import Link from 'next/link';
import MiniSparkline from './MiniSparkline';
import { MANUAL_PALETTE } from '../lib/rankingUtils';

function toNumber(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = typeof x === 'string' ? Number(String(x).replace(',', '.')) : Number(x);
  return Number.isFinite(n) ? n : null;
}

function formatIap(x) {
  const n = toNumber(x);
  if (n === null) return '—';
  return n.toFixed(2);
}

/**
 * RankingTable (compact)
 * Props:
 *  - tableItems: array
 *  - renderTrend: function(item, idx) -> JSX
 *  - linkClub: fn(name) -> href
 *  - height: number (altura do container com scroll)
 */
export default function RankingTable({
  tableItems = [],
  renderTrend = () => null,
  linkClub = (n) => `/club/${encodeURIComponent(n)}`,
  height = 520,
}) {
  const sparkColor = MANUAL_PALETTE[0] ?? '#337d26';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ maxHeight: height, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={th({ width: 62 })}>#</th>
              <th style={th({ width: 76 })}>Δ</th>
              <th style={th({})}>Clube</th>
              <th style={th({ width: 86, textAlign: 'right' })}>IAP</th>
              <th style={th({ width: 132, textAlign: 'right' })}>7d</th>
            </tr>
          </thead>

          <tbody>
            {tableItems.map((item, idx) => {
              const clubName =
                (item && ((item.club && item.club.name) || item.club_name || item.name || item.club)) || '—';

              const href = linkClub(clubName);
              const rankPos = Number(item?.rank_position) || idx + 1;
              const key = item?.club_id ?? `${clubName}::${rankPos}::${idx}`;

              const iap = item?.score ?? item?.iap ?? item?.iap_score ?? item?.value ?? null;

              const series = Array.isArray(item?.series)
                ? item.series.map((s) => {
                    const v = s?.value ?? s?.iap ?? s?.score ?? null;
                    return toNumber(v);
                  })
                : [];

              return (
                <tr key={key} style={rowStyle}>
                  <td style={td({ width: 62, fontVariantNumeric: 'tabular-nums' })}>{rankPos}</td>

                  <td style={td({ width: 76 })}>{renderTrend(item, idx)}</td>

                  <td style={td({})}>
                    {clubName && clubName !== '—' ? (
                      <Link
                        href={href}
                        title={clubName}
                        style={{
                          display: 'block',
                          color: 'var(--c-1, #337d26)',
                          textDecoration: 'none',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {clubName}
                      </Link>
                    ) : (
                      clubName
                    )}
                  </td>

                  <td
                    style={td({
                      width: 86,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: 'var(--c-1, #337d26)',
                    })}
                    title={iap !== null ? String(iap) : ''}
                  >
                    {formatIap(iap)}
                  </td>

                  <td style={td({ width: 132, textAlign: 'right' })}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <MiniSparkline data={series} width={110} height={24} color={sparkColor} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {(!Array.isArray(tableItems) || tableItems.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: 12, opacity: 0.75 }}>
                  Sem dados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ estilos helpers ============ */

function th(extra = {}) {
  return {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: '#fff',
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    padding: '10px 10px',
    textAlign: 'left',
    fontSize: 12,
    letterSpacing: 0.2,
    color: 'rgba(0,0,0,0.70)',
    fontWeight: 800,
    ...extra,
  };
}

function td(extra = {}) {
  return {
    padding: '8px 10px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    fontSize: 13,
    verticalAlign: 'middle',
    overflow: 'hidden',
    ...extra,
  };
}

const rowStyle = {
  background: '#fff',
};
