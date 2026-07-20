import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Evento {
  id: number;
  nome: string;
  local: string;
  data: string;
  status: string;
  detalhes: any;
}

interface Patrocinio {
  id: number;
  nome: string;
  logo_url: string;
  detalhes?: any;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatScore = (val: any) => {
  if (val === null || val === undefined || val === '') return '-';
  const n = parseFloat(val);
  return isNaN(n) ? '-' : n.toFixed(2);
};

// ─── Screensaver ─────────────────────────────────────────────────────────────

function Screensaver({ logos, onWake }: { logos: string[]; onWake: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const allLogos = ['/header_logo.png', ...logos];

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % allLogos.length);
        setFadeIn(true);
      }, 800);
    }, 3800);
    return () => clearInterval(interval);
  }, [allLogos.length]);

  useEffect(() => {
    const wake = () => onWake();
    document.addEventListener('click', wake);
    document.addEventListener('touchstart', wake);
    document.addEventListener('mousemove', wake);
    document.addEventListener('keydown', wake);
    return () => {
      document.removeEventListener('click', wake);
      document.removeEventListener('touchstart', wake);
      document.removeEventListener('mousemove', wake);
      document.removeEventListener('keydown', wake);
    };
  }, [onWake]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3rem',
      zIndex: 9999,
      cursor: 'none',
    }}>
      <div style={{
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.8s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '220px',
      }}>
        <img
          src={allLogos[currentIndex]}
          alt="Logo"
          style={{ maxHeight: '200px', maxWidth: '480px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          onError={(e: any) => { e.target.style.display = 'none'; }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {allLogos.map((_, i) => (
          <div key={i} style={{
            width: i === currentIndex ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: i === currentIndex ? '#f59e0b' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>

      <p style={{
        color: 'rgba(255,255,255,0.4)',
        fontSize: '1.1rem',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: "'Montserrat', sans-serif",
        margin: 0,
        animation: 'tabletPulseText 2.5s ease-in-out infinite',
      }}>
        Toque na tela para informações do evento
      </p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', gap: '1rem', opacity: 0.35 }}>
      <div style={{ fontSize: '4rem' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: '1rem', textAlign: 'center', fontWeight: 500 }}>{message}</p>
    </div>
  );
}

// ─── Event Dashboard ──────────────────────────────────────────────────────────

type DashTab = 'sorteio' | 'ranking' | 'touros' | 'rerides';

function EventDashboard({ evento, patrocinios, onBack }: { evento: Evento; patrocinios: Patrocinio[]; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<DashTab>('sorteio');

  const detalhes = typeof evento.detalhes === 'string' ? JSON.parse(evento.detalhes) : (evento.detalhes || {});
  const notas: any[] = detalhes.notas || [];
  const sorteio: any[] = detalhes.sorteio || [];

  const ranking = (() => {
    const map: Record<string, { peao: string; totalScore: number; montarias: number }> = {};
    notas.forEach((n: any) => {
      if (n.status === 'ativa') {
        const score = (n.totalPeao || 0) + (n.totalTouro || 0);
        if (!map[n.peao]) map[n.peao] = { peao: n.peao, totalScore: 0, montarias: 0 };
        map[n.peao].totalScore += score;
        map[n.peao].montarias += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.totalScore - a.totalScore).slice(0, 30);
  })();

  const tourosMap: Record<string, { nome: string; cia: string; saidas: number; pontos: number[] }> = {};
  notas.forEach((n: any) => {
    if (n.touro) {
      if (!tourosMap[n.touro]) tourosMap[n.touro] = { nome: n.touro, cia: n.cia || '-', saidas: 0, pontos: [] };
      tourosMap[n.touro].saidas += 1;
      if (n.status === 'ativa') tourosMap[n.touro].pontos.push((n.totalPeao || 0) + (n.totalTouro || 0));
    }
  });
  const touros = Object.values(tourosMap).sort((a, b) => b.saidas - a.saidas);
  const rerides = notas.filter((n: any) => n.status === 'reride' || n.reride === true);

  const tabs: { id: DashTab; label: string; icon: string }[] = [
    { id: 'sorteio', label: 'Sorteio', icon: '🎲' },
    { id: 'ranking', label: 'Ranking', icon: '🏆' },
    { id: 'touros', label: 'Touros', icon: '🐂' },
    { id: 'rerides', label: 'Re-rides', icon: '🔄' },
  ];

  const srcList = sorteio.length > 0 ? sorteio : notas;

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', fontFamily: "'Montserrat', sans-serif", color: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f1923 0%, #0a0f18 100%)', borderBottom: '1px solid rgba(245,158,11,0.18)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: '10px', padding: '0.6rem 1.1rem', cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'Montserrat', sans-serif", transition: 'all 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
          ← Eventos
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{evento.nome}</h1>
          <p style={{ margin: '0.15rem 0 0', color: 'rgba(255,255,255,0.38)', fontSize: '0.82rem', letterSpacing: '0.03em' }}>
            {evento.local} · {formatDate(evento.data)}
          </p>
        </div>
        <img src="/header_logo.png" alt="RodeoApp" style={{ height: '36px', objectFit: 'contain', opacity: 0.9 }} />
      </div>

      {/* Tabs + Abertura Button */}
      <div style={{ display: 'flex', background: '#0a0f18', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 1.5rem', overflowX: 'auto', alignItems: 'stretch' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id ? '3px solid #f59e0b' : '3px solid transparent',
            color: activeTab === tab.id ? '#f59e0b' : 'rgba(255,255,255,0.38)',
            padding: '1rem 1.5rem',
            cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.9rem',
            fontWeight: activeTab === tab.id ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            marginBottom: '-1px',
          }}>
            {tab.icon} {tab.label}
            {tab.id === 'rerides' && rerides.length > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', lineHeight: 1.6 }}>
                {rerides.length}
              </span>
            )}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingLeft: '1.5rem' }}>
          <button style={{
            background: 'transparent',
            border: '2px solid #f59e0b',
            color: '#f59e0b',
            borderRadius: '10px',
            padding: '0.5rem 1.5rem',
            cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.88rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            animation: 'tabletPulseBorder 1.6s ease-in-out infinite',
          }}>
            Abertura
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

        {/* Sorteio */}
        {activeTab === 'sorteio' && (
          <div>
            <SectionTitle icon="🎲" title="Sorteio de Montarias" />
            {srcList.length === 0 ? <EmptyState icon="🎲" message="Nenhuma montaria registrada." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {srcList.map((item: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: '2.5rem 1fr 1fr auto', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontSize: '0.88rem' }}>#{idx + 1}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{item.peao || item.competidor || '-'}</div>
                      {item.dia && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '2px' }}>{item.dia}</div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.95rem' }}>{item.touro || '-'}</div>
                      {item.cia && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '2px' }}>{item.cia}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {item.status === 'ativa' && <StatusBadge color="#22c55e" bg="rgba(34,197,94,0.12)" text={formatScore((item.totalPeao || 0) + (item.totalTouro || 0)) + ' pts'} />}
                      {item.status === 'derrubada' && <StatusBadge color="#ef4444" bg="rgba(239,68,68,0.12)" text="Derrubada" />}
                      {item.status === 'reride' && <StatusBadge color="#8b5cf6" bg="rgba(139,92,246,0.12)" text="Re-ride" />}
                      {(!item.status || item.status === 'pendente') && <StatusBadge color="rgba(255,255,255,0.25)" bg="rgba(255,255,255,0.04)" text="Aguardando" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ranking */}
        {activeTab === 'ranking' && (
          <div>
            <SectionTitle icon="🏆" title="Classificação Geral" />
            {ranking.length === 0 ? <EmptyState icon="🏆" message="Nenhuma nota registrada ainda." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ranking.map((item, idx) => (
                  <div key={idx} style={{
                    background: idx === 0 ? 'rgba(245,158,11,0.07)' : idx === 1 ? 'rgba(200,200,220,0.04)' : idx === 2 ? 'rgba(170,100,50,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${idx === 0 ? 'rgba(245,158,11,0.22)' : idx === 1 ? 'rgba(200,200,220,0.12)' : idx === 2 ? 'rgba(170,100,50,0.16)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '12px', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem',
                  }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', background: idx === 0 ? '#f59e0b' : idx === 1 ? 'rgba(200,200,220,0.18)' : idx === 2 ? 'rgba(170,100,50,0.28)' : 'rgba(255,255,255,0.06)', color: idx === 0 ? '#000' : idx <= 2 ? 'white' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>{item.peao}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '2px' }}>{item.montarias} montaria{item.montarias !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.3rem', color: idx === 0 ? '#f59e0b' : 'white' }}>{formatScore(item.totalScore)}</div>
                      <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.73rem' }}>pontos</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Touros */}
        {activeTab === 'touros' && (
          <div>
            <SectionTitle icon="🐂" title="Touros do Evento" />
            {touros.length === 0 ? <EmptyState icon="🐂" message="Nenhum touro registrado." /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {touros.map((touro, idx) => {
                  const avg = touro.pontos.length > 0 ? touro.pontos.reduce((a, b) => a + b, 0) / touro.pontos.length : null;
                  return (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>{touro.nome}</div>
                          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '4px' }}>CIA: {touro.cia}</div>
                        </div>
                        <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {touro.saidas} saída{touro.saidas !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {avg !== null && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>Média: </span>
                          <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.95rem' }}>{formatScore(avg)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Re-rides */}
        {activeTab === 'rerides' && (
          <div>
            <SectionTitle icon="🔄" title="Re-rides" />
            {rerides.length === 0 ? <EmptyState icon="🔄" message="Nenhuma re-ride registrada." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {rerides.map((item: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🔄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{item.peao || '-'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', marginTop: '2px' }}>Touro: {item.touro || '-'}{item.dia ? ` · ${item.dia}` : ''}</div>
                    </div>
                    <StatusBadge color="#8b5cf6" bg="rgba(139,92,246,0.12)" text="Re-ride" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Sponsors Footer */}
      {patrocinios.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.7rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
          {patrocinios.map((p, idx) => {
            const url = p.detalhes?.splash_app?.logo_url || p.logo_url;
            if (!url) return null;
            return <img key={idx} src={url} alt={p.nome} style={{ maxHeight: '30px', maxWidth: '90px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }} onError={(e: any) => { e.target.style.display = 'none'; }} />;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span>{icon}</span> {title}
    </h2>
  );
}

function StatusBadge({ color, bg, text }: { color: string; bg: string; text: string }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${color}40`, borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

// ─── Event List ───────────────────────────────────────────────────────────────

function EventList({ eventos, loading, onSelect }: { eventos: Evento[]; loading: boolean; onSelect: (e: Evento) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080c10', fontFamily: "'Montserrat', sans-serif", color: 'white' }}>
      <div style={{ background: 'linear-gradient(135deg, #0f1923 0%, #0a0f18 100%)', borderBottom: '1px solid rgba(245,158,11,0.12)', padding: '2rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            RODEOAPP
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.88rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Painel de Eventos · Tablet
          </p>
        </div>
        <img src="/header_logo.png" alt="RodeoApp" style={{ height: '44px', objectFit: 'contain', opacity: 0.9 }} />
      </div>

      <div style={{ padding: '2.5rem' }}>
        <h2 style={{ margin: '0 0 1.75rem', fontSize: '1.05rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Selecione um Evento
        </h2>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6rem', gap: '1rem', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(245,158,11,0.15)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'tabletSpin 0.8s linear infinite' }} />
            <span style={{ fontWeight: 500, letterSpacing: '0.04em' }}>Carregando eventos...</span>
          </div>
        ) : eventos.length === 0 ? (
          <EmptyState icon="📅" message="Nenhum evento encontrado." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {eventos.map(evento => {
              const det = typeof evento.detalhes === 'string' ? JSON.parse(evento.detalhes || '{}') : (evento.detalhes || {});
              const notas: any[] = det.notas || [];
              const live = notas.some((n: any) => n.status === 'ativa');

              return (
                <button key={evento.id} onClick={() => onSelect(evento)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.75rem', cursor: 'pointer', textAlign: 'left', color: 'white', fontFamily: "'Montserrat', sans-serif", transition: 'all 0.25s', display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(245,158,11,0.3)'; e.currentTarget.style.background = 'rgba(245,158,11,0.04)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, lineHeight: 1.25 }}>{evento.nome}</h3>
                    {live && (
                      <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.22)', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ● AO VIVO
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.38)', fontSize: '0.83rem' }}>
                    📍 {evento.local || '-'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                    📅 {formatDate(evento.data)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.78rem' }}>
                      {notas.length > 0 ? `${notas.length} montaria${notas.length !== 1 ? 's' : ''}` : 'Sem montarias'}
                    </span>
                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.83rem' }}>Ver evento →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main TabletApp ───────────────────────────────────────────────────────────

type Screen = 'events' | 'event';

export default function TabletApp() {
  const [screen, setScreen] = useState<Screen>('events');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [patrocinios, setPatrocinios] = useState<Patrocinio[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_MS = 60_000;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [evRes, patRes] = await Promise.all([
          supabase.from('eventos_oficiais').select('*').order('created_at', { ascending: false }),
          supabase.from('patrocinios').select('*').eq('status', 'ativo'),
        ]);
        if (evRes.data) setEventos(evRes.data);
        if (patRes.data) setPatrocinios(patRes.data);
      } catch (err) {
        console.error('Tablet fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const resetTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => setShowScreensaver(true), INACTIVITY_MS);
  }, []);

  useEffect(() => {
    if (screen !== 'event') {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      setShowScreensaver(false);
      return;
    }
    resetTimer();
    const evts = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll', 'click'];
    evts.forEach(ev => document.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      evts.forEach(ev => document.removeEventListener(ev, resetTimer));
    };
  }, [screen, resetTimer]);

  const handleSelect = (evento: Evento) => {
    setSelectedEvento(evento);
    setScreen('event');
    setShowScreensaver(false);
  };

  const handleBack = () => {
    setScreen('events');
    setSelectedEvento(null);
    setShowScreensaver(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  };

  const handleWake = useCallback(() => {
    setShowScreensaver(false);
    resetTimer();
  }, [resetTimer]);

  const screensaverLogos = patrocinios
    .map(p => p.detalhes?.splash_app?.logo_url || p.logo_url)
    .filter(Boolean) as string[];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #080c10; }
        @keyframes tabletSpin { to { transform: rotate(360deg); } }
        @keyframes tabletPulseBorder {
          0%, 100% { border-color: #f59e0b; box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50% { border-color: #fbbf24; box-shadow: 0 0 0 5px rgba(245,158,11,0.22), 0 0 0 10px rgba(245,158,11,0.07); }
        }
        @keyframes tabletPulseText {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {showScreensaver && <Screensaver logos={screensaverLogos} onWake={handleWake} />}

      {screen === 'events' && <EventList eventos={eventos} loading={loading} onSelect={handleSelect} />}
      {screen === 'event' && selectedEvento && (
        <EventDashboard evento={selectedEvento} patrocinios={patrocinios} onBack={handleBack} />
      )}
    </>
  );
}
