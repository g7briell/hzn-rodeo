import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

interface Evento { id: number; nome: string; local: string; data: string; status: string; detalhes: any; }
interface Patrocinio { id: number; nome: string; logo_url: string; detalhes?: any; status: string; }

const fmtDate = (s: string) => {
  if (!s) return '';
  try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return s; }
};
const fmtScore = (v: any) => {
  if (v === null || v === undefined || v === '') return '-';
  const n = parseFloat(v); return isNaN(n) ? '-' : n.toFixed(2);
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#000;color:#fff;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:2px}
  @keyframes tSpin{to{transform:rotate(360deg)}}
  @keyframes tPulseGold{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0);border-color:rgba(212,175,55,0.7)}50%{box-shadow:0 0 0 5px rgba(212,175,55,0.12),0 0 18px rgba(212,175,55,0.18);border-color:#d4af37}}
  @keyframes tSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes tPulseText{0%,100%{opacity:0.3}50%{opacity:0.6}}
  @keyframes tLive{0%,100%{opacity:1}50%{opacity:0.25}}
`;

// ── Screensaver ──────────────────────────────────────────────────────────────
function Screensaver({ logos, onWake }: { logos: string[]; onWake: () => void }) {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  const all = ['/header_logo.png', ...logos];

  useEffect(() => {
    const id = setInterval(() => {
      setVis(false);
      setTimeout(() => { setIdx(p => (p + 1) % all.length); setVis(true); }, 700);
    }, 3700);
    return () => clearInterval(id);
  }, [all.length]);

  useEffect(() => {
    const h = () => onWake();
    ['click', 'touchstart', 'mousemove', 'keydown'].forEach(e => document.addEventListener(e, h, { passive: true }));
    return () => ['click', 'touchstart', 'mousemove', 'keydown'].forEach(e => document.removeEventListener(e, h));
  }, [onWake]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3.5rem', zIndex: 9999, cursor: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(212,175,55,0.03) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ opacity: vis ? 1 : 0, transition: 'opacity 0.7s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', width: '100%', maxWidth: '640px' }}>
        <img src={all[idx]} alt="Logo" style={{ maxHeight: '240px', maxWidth: '580px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {all.map((_, i) => (
          <div key={i} style={{ width: i === idx ? '22px' : '6px', height: '6px', borderRadius: '3px', background: i === idx ? '#d4af37' : 'rgba(255,255,255,0.1)', transition: 'all 0.4s ease' }} />
        ))}
      </div>
      <p style={{ position: 'absolute', bottom: '3rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 400, letterSpacing: '0.22em', textTransform: 'uppercase', animation: 'tPulseText 2.5s ease-in-out infinite' }}>
        Toque na tela para informações do evento
      </p>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
function Empty({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', gap: '1rem', opacity: 0.2 }}>
      <span style={{ fontSize: '3rem' }}>{icon}</span>
      <p style={{ fontSize: '0.88rem', textAlign: 'center', fontWeight: 500, letterSpacing: '0.05em' }}>{msg}</p>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ color, bg, text }: { color: string; bg: string; text: string }) {
  return <span style={{ background: bg, color, border: `1px solid ${color}28`, borderRadius: '4px', padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{text}</span>;
}

// ── Section Heading ──────────────────────────────────────────────────────────
function SecHead({ icon, title, count }: { icon: string; title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>{title}</span>
      {count !== undefined && count > 0 && (
        <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', borderRadius: '4px', padding: '1px 7px', fontSize: '0.65rem', fontWeight: 600 }}>{count}</span>
      )}
    </div>
  );
}

// ── Event Dashboard ──────────────────────────────────────────────────────────
type DTab = 'sorteio' | 'ranking' | 'touros' | 'rerides';

function Dashboard({ evento, pats }: { evento: Evento; pats: Patrocinio[] }) {
  const [tab, setTab] = useState<DTab>('sorteio');
  const det = typeof evento.detalhes === 'string' ? JSON.parse(evento.detalhes || '{}') : (evento.detalhes || {});
  const notas: any[] = det.notas || [];
  const sorteio: any[] = det.sorteio || [];
  const src = sorteio.length > 0 ? sorteio : notas;
  const isLive = notas.some((n: any) => n.status === 'ativa');

  // ranking
  const rmap: Record<string, { peao: string; total: number; count: number }> = {};
  notas.forEach((n: any) => {
    if (n.status === 'ativa' && n.peao) {
      const s = (n.totalPeao || 0) + (n.totalTouro || 0);
      if (!rmap[n.peao]) rmap[n.peao] = { peao: n.peao, total: 0, count: 0 };
      rmap[n.peao].total += s; rmap[n.peao].count += 1;
    }
  });
  const ranking = Object.values(rmap).sort((a, b) => b.total - a.total).slice(0, 50);

  // touros
  const tmap: Record<string, { nome: string; cia: string; saidas: number; pts: number[] }> = {};
  notas.forEach((n: any) => {
    if (n.touro) {
      if (!tmap[n.touro]) tmap[n.touro] = { nome: n.touro, cia: n.cia || '-', saidas: 0, pts: [] };
      tmap[n.touro].saidas += 1;
      if (n.status === 'ativa') tmap[n.touro].pts.push((n.totalPeao || 0) + (n.totalTouro || 0));
    }
  });
  const touros = Object.values(tmap).sort((a, b) => b.saidas - a.saidas);
  const rerides = notas.filter((n: any) => n.status === 'reride' || n.reride === true);

  const TABS: { id: DTab; label: string; icon: string }[] = [
    { id: 'sorteio', label: 'Sorteio', icon: '🎲' },
    { id: 'ranking', label: 'Ranking', icon: '🏆' },
    { id: 'touros', label: 'Touros', icon: '🐂' },
    { id: 'rerides', label: 'Re-rides', icon: '🔄' },
  ];

  const MEDAL = ['#d4af37', 'rgba(190,190,210,0.85)', 'rgba(160,100,60,0.85)'];
  const MEDAL_BG = ['rgba(212,175,55,0.06)', 'rgba(190,190,210,0.03)', 'rgba(160,100,60,0.04)'];

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', color: '#fff' }}>

      {/* Header */}
      <header style={{ background: '#000', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '1.4rem 2.5rem', display: 'flex', alignItems: 'center', gap: '2rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isLive && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '4px', padding: '2px 7px', marginBottom: '0.4rem' }}>
              <span style={{ width: '5px', height: '5px', background: '#22c55e', borderRadius: '50%', animation: 'tLive 1.2s ease-in-out infinite', display: 'inline-block' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ao Vivo</span>
            </div>
          )}
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evento.nome}</h1>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 400 }}>
            {evento.local}{evento.local && evento.data ? ' · ' : ''}{fmtDate(evento.data)}
          </p>
        </div>
        <img src="/header_logo.png" alt="RodeoApp" style={{ height: '36px', objectFit: 'contain', opacity: 0.75, flexShrink: 0 }} />
      </header>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#000', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 2rem', alignItems: 'stretch', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #d4af37' : '2px solid transparent', color: tab === t.id ? '#d4af37' : 'rgba(255,255,255,0.25)', padding: '0.9rem 1.6rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: tab === t.id ? 700 : 500, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.45rem', transition: 'all 0.2s', whiteSpace: 'nowrap', marginBottom: '-1px', outline: 'none' }}>
            <span style={{ fontSize: '0.85rem' }}>{t.icon}</span>
            {t.label}
            {t.id === 'rerides' && rerides.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '0.58rem', fontWeight: 800, padding: '1px 5px', lineHeight: 1.7 }}>{rerides.length}</span>
            )}
          </button>
        ))}
        {/* Abertura */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingLeft: '1.5rem', paddingRight: '0.25rem' }}>
          <button style={{ background: 'transparent', border: '1.5px solid #d4af37', color: '#d4af37', borderRadius: '5px', padding: '0.4rem 1.3rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', animation: 'tPulseGold 1.8s ease-in-out infinite', outline: 'none' }}>
            Abertura
          </button>
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto', animation: 'tSlide 0.2s ease' }} key={tab}>

        {/* Sorteio */}
        {tab === 'sorteio' && (
          <>
            <SecHead icon="🎲" title="Sorteio de Montarias" count={src.length} />
            {src.length === 0 ? <Empty icon="🎲" msg="Nenhuma montaria registrada." /> : (
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr 1fr auto', padding: '0.55rem 1.2rem', background: 'rgba(255,255,255,0.02)', gap: '0.75rem' }}>
                  {['#', 'Peão', 'Touro', 'Status'].map(h => (
                    <span key={h} style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {src.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr 1fr auto', padding: '0.8rem 1.2rem', background: i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent', borderTop: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>{item.peao || item.competidor || '—'}</div>
                      {item.dia && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem', marginTop: '1px' }}>{item.dia}</div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#d4af37', lineHeight: 1.3 }}>{item.touro || '—'}</div>
                      {item.cia && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem', marginTop: '1px' }}>{item.cia}</div>}
                    </div>
                    <div>
                      {item.status === 'ativa' && <Badge color="#22c55e" bg="rgba(34,197,94,0.08)" text={fmtScore((item.totalPeao || 0) + (item.totalTouro || 0)) + ' pts'} />}
                      {item.status === 'derrubada' && <Badge color="#ef4444" bg="rgba(239,68,68,0.08)" text="Derrubada" />}
                      {item.status === 'reride' && <Badge color="#a78bfa" bg="rgba(167,139,250,0.08)" text="Re-ride" />}
                      {(!item.status || item.status === 'pendente') && <Badge color="rgba(255,255,255,0.18)" bg="rgba(255,255,255,0.03)" text="Aguardando" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Ranking */}
        {tab === 'ranking' && (
          <>
            <SecHead icon="🏆" title="Classificação Geral" count={ranking.length} />
            {ranking.length === 0 ? <Empty icon="🏆" msg="Nenhuma nota ainda." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {ranking.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', padding: '0.8rem 1.2rem', background: i < 3 ? MEDAL_BG[i] : 'rgba(255,255,255,0.015)', border: `1px solid ${i < 3 ? MEDAL[i] + '18' : 'rgba(255,255,255,0.04)'}`, borderRadius: '8px' }}>
                    <div style={{ width: '1.9rem', height: '1.9rem', borderRadius: '50%', background: i < 3 ? MEDAL[i] + '18' : 'rgba(255,255,255,0.04)', border: `1px solid ${i < 3 ? MEDAL[i] + '40' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: i < 3 ? MEDAL[i] : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.peao}</div>
                      <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.68rem', marginTop: '2px' }}>{item.count} montaria{item.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: i === 0 ? '#d4af37' : '#fff', letterSpacing: '-0.02em' }}>{fmtScore(item.total)}</div>
                      <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.6rem', letterSpacing: '0.1em' }}>PTS</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Touros */}
        {tab === 'touros' && (
          <>
            <SecHead icon="🐂" title="Touros do Evento" count={touros.length} />
            {touros.length === 0 ? <Empty icon="🐂" msg="Nenhum touro registrado." /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
                {touros.map((t, i) => {
                  const avg = t.pts.length > 0 ? t.pts.reduce((a, b) => a + b, 0) / t.pts.length : null;
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '9px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.25 }}>{t.nome}</div>
                          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.68rem', marginTop: '3px' }}>{t.cia}</div>
                        </div>
                        <Badge color="#d4af37" bg="rgba(212,175,55,0.07)" text={`${t.saidas}×`} />
                      </div>
                      {avg !== null && (
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Média</span>
                          <span style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.85rem' }}>{fmtScore(avg)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Re-rides */}
        {tab === 'rerides' && (
          <>
            <SecHead icon="🔄" title="Re-rides" count={rerides.length} />
            {rerides.length === 0 ? <Empty icon="🔄" msg="Nenhuma re-ride registrada." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {rerides.map((item: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.2rem', background: 'rgba(167,139,250,0.03)', border: '1px solid rgba(167,139,250,0.08)', borderRadius: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.peao || '—'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.72rem', marginTop: '2px' }}>{item.touro && `${item.touro}`}{item.dia && ` · ${item.dia}`}</div>
                    </div>
                    <Badge color="#a78bfa" bg="rgba(167,139,250,0.07)" text="Re-ride" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* Sponsor footer — BIGGER logos */}
      {pats.length > 0 && (
        <footer style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '1.5rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.5rem', flexWrap: 'wrap', minHeight: '90px' }}>
          {pats.map((p, i) => {
            const url = p.detalhes?.splash_app?.logo_url || p.logo_url;
            if (!url) return null;
            return <img key={i} src={url} alt={p.nome} style={{ maxHeight: '52px', maxWidth: '150px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }} onError={(e: any) => { e.target.style.display = 'none'; }} />;
          })}
        </footer>
      )}
    </div>
  );
}

// ── Event List ────────────────────────────────────────────────────────────────
function EventList({ eventos, loading, onSelect }: { eventos: Evento[]; loading: boolean; onSelect: (e: Evento) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <header style={{ padding: '2.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Painel · Tablet</p>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#c8941c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RODEOAPP</h1>
        </div>
        <img src="/header_logo.png" alt="RodeoApp" style={{ height: '44px', objectFit: 'contain', opacity: 0.75, flexShrink: 0 }} />
      </header>

      <div style={{ padding: '2.5rem 3rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>Selecione um Evento</p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7rem', gap: '0.75rem', color: 'rgba(255,255,255,0.18)' }}>
            <div style={{ width: '26px', height: '26px', border: '2px solid rgba(212,175,55,0.12)', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'tSpin 0.7s linear infinite' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Carregando...</span>
          </div>
        ) : eventos.length === 0 ? (
          <Empty icon="📅" msg="Nenhum evento encontrado." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {eventos.map(ev => {
              const det = typeof ev.detalhes === 'string' ? JSON.parse(ev.detalhes || '{}') : (ev.detalhes || {});
              const notas: any[] = det.notas || [];
              const live = notas.some((n: any) => n.status === 'ativa');
              return (
                <button key={ev.id} onClick={() => onSelect(ev)}
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '9px', padding: '1.5rem 1.6rem', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'Inter, sans-serif', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: '0.7rem', width: '100%', outline: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.28)'; e.currentTarget.style.background = 'rgba(212,175,55,0.025)'; }}
                  onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{ev.nome}</h3>
                    {live && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.58rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                        <span style={{ width: '4px', height: '4px', background: '#22c55e', borderRadius: '50%', animation: 'tLive 1.2s ease-in-out infinite', display: 'inline-block' }} />
                        Live
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.27)', fontSize: '0.75rem' }}>📍 {ev.local || '—'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.72rem' }}>📅 {fmtDate(ev.data)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '0.1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.14)', fontSize: '0.7rem', letterSpacing: '0.04em' }}>
                      {notas.length > 0 ? `${notas.length} montaria${notas.length !== 1 ? 's' : ''}` : 'Sem montarias'}
                    </span>
                    <span style={{ color: '#d4af37', fontSize: '0.75rem', fontWeight: 600 }}>Abrir →</span>
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function TabletApp() {
  const [screen, setScreen] = useState<'events' | 'event'>('events');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pats, setPats] = useState<Patrocinio[]>([]);
  const [selected, setSelected] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [ss, setSs] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ev, pat] = await Promise.all([
          supabase.from('eventos_oficiais').select('*').order('created_at', { ascending: false }),
          supabase.from('patrocinios').select('*').eq('status', 'ativo'),
        ]);
        if (ev.data) setEventos(ev.data);
        if (pat.data) setPats(pat.data);
      } finally { setLoading(false); }
    })();
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSs(true), 60_000);
  }, []);

  useEffect(() => {
    if (screen !== 'event') { if (timerRef.current) clearTimeout(timerRef.current); setSs(false); return; }
    resetTimer();
    const evts = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll', 'click'];
    evts.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    return () => { if (timerRef.current) clearTimeout(timerRef.current); evts.forEach(e => document.removeEventListener(e, resetTimer)); };
  }, [screen, resetTimer]);

  const handleSelect = (ev: Evento) => { setSelected(ev); setScreen('event'); setSs(false); };
  const handleWake = useCallback(() => { setSs(false); resetTimer(); }, [resetTimer]);
  const ssLogos = pats.map(p => p.detalhes?.splash_app?.logo_url || p.logo_url).filter(Boolean) as string[];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {ss && <Screensaver logos={ssLogos} onWake={handleWake} />}
      {screen === 'events' && <EventList eventos={eventos} loading={loading} onSelect={handleSelect} />}
      {screen === 'event' && selected && <Dashboard evento={selected} pats={pats} />}
    </>
  );
}
