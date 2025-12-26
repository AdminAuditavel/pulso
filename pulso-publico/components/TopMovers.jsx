//components/TopMovers.jsx

'use client';

import React from 'react';
import Link from 'next/link';

function getDisplayName(it) {
  return (it && ((it.club && it.club.name) || it.club_name || it.name || it.club || it.label)) || null;
}

function normalizeClubKey(name) {
  const s = String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * TopMovers
 * Props:
 *  - tableItems: array
 *  - prevRankMap: Map (aceita chave por display e/ou por key normalizada)
 *  - prevDateUsed: string
 */
export default function TopMovers({ tableItems = [], prevRankMap = new Map(), prevDateUsed = '' }) {
  if (!Array.isArray(tableItems) || tableItems.length === 0) {
    return <div style={{ fontSize: 12, opacity: 0.8 }}>Sem dados.</div>;
  }

  if (!prevDateUsed || !(prevRankMap instanceof Map) || prevRankMap.size === 0) {
    return <div style={{ fontSize: 12, opacity: 0.8 }}>Sem comparação disponível (não há dados do dia anterior).</div>;
  }

  const all = [];

  for (let i = 0; i < tableItems.length; i += 1) {
    const it = tableItems[i];

    const name = getDisplayName(it);
    if (!name || name === '—') continue;

    const key = String(it?.__club_key || it?._club_key || normalizeClubKey(name));

    const currRank = Number(it?.rank_position) || i + 1;

    // lookup robusto: tenta display e key
    const prevRank =
      prevRankMap.get(name) ??
      prevRankMap.get(key) ??
      null;

    if (!prevRank || !currRank) continue;

    const delta = Number(prevRank) - Number(currRank);
    if (!Number.isFinite(delta) || delta === 0) continue;

    all.push({ name, currRank, prevRank: Number(prevRank), delta });
  }

  const up = all.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
  const down = all.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Mais subiram</div>
        {up.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>—</div>
        ) : (
          <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
            {up.map((m) => (
              <li key={m.name} style={{ marginBottom: 6, fontSize: 13 }}>
                <Link href={`/club/${encodeURIComponent(m.name)}`} style={{ textDecoration: 'underline' }}>
                  {m.name}
                </Link>{' '}
                <span style={{ fontWeight: 700, color: '#16A34A' }}>↑ +{m.delta}</span>{' '}
                <span style={{ opacity: 0.75 }}>({m.prevRank} → {m.currRank})</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div style={{ border: '1px solid #f0f0f0', borderRadius: 10, padding: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>Mais caíram</div>
        {down.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>—</div>
        ) : (
          <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
            {down.map((m) => (
              <li key={m.name} style={{ marginBottom: 6, fontSize: 13 }}>
                <Link href={`/club/${encodeURIComponent(m.name)}`} style={{ textDecoration: 'underline' }}>
                  {m.name}
                </Link>{' '}
                <span style={{ fontWeight: 700, color: '#DC2626' }}>↓ {m.delta}</span>{' '}
                <span style={{ opacity: 0.75 }}>({m.prevRank} → {m.currRank})</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
