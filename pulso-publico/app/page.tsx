import Link from 'next/link';
import React from 'react';

function Header() {
  return (
    <header style={headerStyle} role="banner">
      <div style={headerInnerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={logoStyle} aria-hidden>
            Comentaram
          </div>
          <div style={{ fontSize: 14, color: '#333', fontWeight: 700 }}>Painel Público de Inteligência</div>
        </div>

        <nav aria-label="Main navigation">
          <ul style={navListStyle}>
            <li><Link href="/" style={navLinkStyle}>Home</Link></li>
            <li><Link href="/ranking" style={navLinkStyle}>Rankings</Link></li>
            <li><Link href="/ranking/esporte" style={navLinkStyle}>Esporte</Link></li>
            <li><Link href="/ranking/politica" style={navLinkStyle}>Política</Link></li>
            <li><Link href="/metodologia" style={navLinkStyle}>Metodologia</Link></li>
            <li><Link href="/fontes" style={navLinkStyle}>Fontes</Link></li>
            <li><Link href="/sobre" style={navLinkStyle}>Sobre</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <main style={containerStyle}>
      <Header />

      <section style={heroStyle} aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title" style={{ color: '#0377fc', margin: 0 }}>Comentaram</h1>
          <p style={{ fontSize: 20, marginTop: 8, color: '#333', fontWeight: 400 }}>
            Painel público que transforma conversas abertas em indicadores — esportes, política, cultura, tecnologia e mais.
          </p>

          <p style={{ color: '#444', lineHeight: 1.5 }}>
            Usamos apenas dados públicos para gerar rankings, gráficos e sinais de atenção pública — sempre em formato agregado e sem expor comentários individuais ou dados pessoais.
          </p>

          <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/ranking" style={primaryButtonStyle}>Ver Rankings</Link>
            <Link href="/metodologia" style={secondaryButtonStyle}>Metodologia</Link>
            <div style={{ marginLeft: 6, color: '#666', fontSize: 13 }}>
              Última atualização: <strong>agora (placeholder)</strong>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <SourceBadge label="YouTube" />
            <SourceBadge label="Reddit" />
            <SourceBadge label="Google Trends" />
            <SourceBadge label="Outras fontes públicas" />
            <div style={{ color: '#777', fontSize: 13, marginLeft: 8 }}>Janela padrão: 24h · Dados agregados · Multitemas</div>
          </div>
        </div>

        <aside style={heroCardStyle} aria-label="Resumo rápido">
          <div style={{ fontSize: 13, color: '#666' }}>Hoje em foco</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>Esporte · Top 5</div>
          <div style={{ marginTop: 10, color: '#444', fontSize: 13, lineHeight: 1.4 }}>
            Ex.: Flamengo, Palmeiras, Corinthians... <br/>
            Clique em "Ver Rankings" ou em qualquer tema abaixo para ver detalhes por plataforma e sentimento.
          </div>
        </aside>
      </section>

      <section style={{ maxWidth: 980, margin: '2rem auto 3rem' }}>
        <h3 style={{ marginBottom: 8 }}>Temas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <TopicCard title="Esporte" href="/ranking/esporte" description="Rankings diários de clubes e atletas — volume e sentimento." emoji="⚽" />
          <TopicCard title="Política" href="/ranking/politica" description="Tópicos e atores em evidência na esfera política." emoji="🏛️" />
          <TopicCard title="Cultura" href="/ranking/cultura" description="Assuntos culturais, lançamentos e discussões públicas." emoji="🎭" />
          <TopicCard title="Tecnologia" href="/ranking/tecnologia" description="Tendências e debates em tecnologia e inovação." emoji="💻" />
        </div>

        <div style={{ marginTop: 18 }}>
          <h4 style={{ marginBottom: 8 }}>O que oferecemos</h4>
          <ul style={{ paddingLeft: 18, color: '#444', lineHeight: 1.6 }}>
            <li>Rankings diários por tema (janela 24h)</li>
            <li>Quebra por plataforma (YouTube / Reddit / Trends)</li>
            <li>Sinais de sentimento e indicadores de possível manipulação</li>
            <li>Página pública com metodologia e fontes</li>
          </ul>
        </div>
      </section>

      <footer style={footerStyle}>
        <div>© {new Date().getFullYear()} Comentaram — Dados públicos e agregados</div>
        <div style={{ fontSize: 13, color: '#666' }}>
          <Link href="/metodologia" style={{ color: '#666', textDecoration: 'underline' }}>Metodologia</Link> ·
          <Link href="/fontes" style={{ color: '#666', textDecoration: 'underline', marginLeft: 8 }}>Fontes</Link> ·
          <Link href="/sobre" style={{ color: '#666', textDecoration: 'underline', marginLeft: 8 }}>Sobre</Link>
        </div>
      </footer>
    </main>
  );
}

function SourceBadge({ label }: { label: string }) {
  return (
    <div style={{
      background: '#f3f6ff',
      color: '#034fcc',
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 600,
      border: '1px solid rgba(3,119,252,0.08)'
    }}>
      {label}
    </div>
  );
}

function TopicCard({ title, href, description, emoji }: { title: string, href: string, description: string, emoji?: string }) {
  return (
    <Link href={href} style={{
      display: 'block',
      padding: 14,
      borderRadius: 10,
      border: '1px solid #eee',
      textDecoration: 'none',
      color: '#222',
      background: '#fff',
      boxShadow: '0 6px 18px rgba(28,49,79,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 22 }}>{emoji}</div>
        <div>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>{description}</div>
        </div>
      </div>
    </Link>
  );
}

/* Styles (inline for quick copy-paste; recomendo extrair para CSS/Module/Tailwind depois) */
const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '1.25rem',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
};

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  marginBottom: 18,
};

const headerInnerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
};

const logoStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#0377fc,#00a3ff)',
  color: '#fff',
  padding: '8px 12px',
  borderRadius: 8,
  fontWeight: 800,
  letterSpacing: 0.6,
  fontSize: 16,
};

const navListStyle: React.CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  gap: 12,
  margin: 0,
  padding: 0,
  alignItems: 'center',
};

const navLinkStyle: React.CSSProperties = {
  color: '#333',
  textDecoration: 'none',
  fontSize: 14,
  padding: '6px 8px',
  borderRadius: 6,
};

const heroStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 320px',
  gap: 20,
  alignItems: 'start',
  marginTop: 6,
};

const heroCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 8,
  padding: '14px',
  boxShadow: '0 6px 20px rgba(28,49,79,0.04)',
};

const primaryButtonStyle: React.CSSProperties = {
  background: '#0377fc',
  color: '#fff',
  padding: '10px 14px',
  borderRadius: 8,
  textDecoration: 'none',
  fontWeight: 700,
  display: 'inline-block'
};

const secondaryButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#0377fc',
  padding: '8px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  border: '1px solid rgba(3,119,252,0.12)',
  fontWeight: 700,
  display: 'inline-block'
};

const footerStyle: React.CSSProperties = {
  borderTop: '1px solid #f0f0f0',
  paddingTop: 18,
  marginTop: 28,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: '#666',
  fontSize: 13
};
