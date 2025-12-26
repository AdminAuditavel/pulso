'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './controls.module.css';

/**
 * HeaderLogo - logo à esquerda + categoria; título centralizado
 * Props:
 *  - title: string (ex: "Ranking Diário")
 *  - category: string (ex: "Esporte")
 */
export default function HeaderLogo({ title = 'Ranking Diário', category = '' }) {
  useEffect(() => {
    // Hotfix: remove elemento com texto exato "Pulso — Ranking" se existir
    // Fazemos uma busca por h1/h2/h3 no document e removemos apenas quando o texto for exatamente igual
    try {
      const els = Array.from(document.querySelectorAll('h1,h2,h3'));
      for (const el of els) {
        if (el && el.textContent && el.textContent.trim() === 'Pulso — Ranking') {
          el.remove();
          break;
        }
      }
    } catch (e) {
      // não quebrar a execução por causa de correção visual
      // eslint-disable-next-line no-console
      console.warn('HeaderLogo: não foi possível remover texto duplicado (não crítico).', e);
    }
  }, []);

  return (
    <div className={styles.headerRow}>
      <div className={styles.leftGroup}>
        <Link href="/" className={styles.logoAnchor} aria-label="Comentaram — voltar para a página inicial">
          <Image src="/Comentaram_#07889B.png" alt="Comentaram" width={160} height={40} priority />
        </Link>

        {category ? (
          <div className={styles.categoryBadge} aria-hidden>
            {category}
          </div>
        ) : null}
      </div>

      <div className={styles.centerTitle} role="heading" aria-level="1">
        {title}
      </div>

      <div className={styles.rightSpacer} /> {/* espaço à direita para manter o centro visual */}
    </div>
  );
}
