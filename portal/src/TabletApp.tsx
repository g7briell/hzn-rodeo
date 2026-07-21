import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface Boiada {
  id: string;
  nome: string;
  lados: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s: string) => {
  if (!s) return '';
  try {
    return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return s; }
};

const fmtScore = (v: any) => {
  if (v === null || v === undefined || v === '') return '-';
  const n = parseFloat(v);
  return isNaN(n) ? '-' : n.toFixed(2);
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  if (url.includes('youtube.com/watch')) {
    try {
      const u = new URL(url);
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } catch (_) {}
  }
  return url;
};

// ─── Global CSS ───────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #000; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  @keyframes tSpin { to { transform: rotate(360deg); } }
  @keyframes tPulseGold {
    0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); border-color: rgba(212,175,55,0.7); }
    50% { box-shadow: 0 0 0 6px rgba(212,175,55,0.15), 0 0 20px rgba(212,175,55,0.2); border-color: #d4af37; }
  }
  @keyframes tSlide {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes tPulseText {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }
  @keyframes tLive {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`;

// ─── Screensaver ──────────────────────────────────────────────────────────────

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

  const currentSrc = all[idx];
  const isHeaderLogo = currentSrc === '/header_logo.png';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3.5rem', zIndex: 9999, cursor: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(212,175,55,0.03) 0%, transparent 65%)', pointerEvents: 'none' }} />
      
      <div style={{ opacity: vis ? 1 : 0, transition: 'opacity 0.7s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', width: '100%', maxWidth: '640px' }}>
        <img
          src={currentSrc}
          alt="Logo"
          style={{
            maxHeight: '240px',
            maxWidth: '580px',
            objectFit: 'contain',
            filter: isHeaderLogo ? 'none' : 'brightness(0) invert(1)',
          }}
          onError={(e: any) => { e.target.style.display = 'none'; }}
        />
      </div>

      <p style={{ position: 'absolute', bottom: '3rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', fontWeight: 400, letterSpacing: '0.22em', textTransform: 'uppercase', animation: 'tPulseText 2.5s ease-in-out infinite' }}>
        Toque na tela para informações do evento
      </p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', gap: '1rem', opacity: 0.25 }}>
      <p style={{ fontSize: '0.9rem', textAlign: 'center', fontWeight: 500, letterSpacing: '0.05em' }}>{msg}</p>
    </div>
  );
}

// ─── Badge Component ──────────────────────────────────────────────────────────

function Badge({ color, bg, text }: { color: string; bg: string; text: string }) {
  return (
    <span style={{
      background: bg,
      color,
      border: `1px solid ${color}30`,
      borderRadius: '4px',
      padding: '3px 10px',
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {text}
    </span>
  );
}

// ─── Render Status Badge (with QUEDA detection) ───────────────────────────────

function renderStatusBadge(item: any) {
  if (item.status === 'reride' || item.reride) {
    return <Badge color="#a78bfa" bg="rgba(167,139,250,0.12)" text="Re-ride" />;
  }

  const total = (typeof item.totalPeao === 'number' ? item.totalPeao : 0) + (typeof item.totalTouro === 'number' ? item.totalTouro : 0);
  const tempo = typeof item.tempo === 'number' ? item.tempo : parseFloat(item.tempo || '8');
  const isQueda = item.status === 'derrubada' ||
                  (item.status === 'ativa' && (total === 0 || (tempo > 0 && tempo < 8))) ||
                  (typeof item.totalPeao === 'number' && item.totalPeao === 0 && item.status !== 'pendente');

  if (isQueda) {
    return <Badge color="#ef4444" bg="rgba(239,68,68,0.15)" text="QUEDA" />;
  }

  if (item.status === 'ativa' && total > 0) {
    return <Badge color="#22c55e" bg="rgba(34,197,94,0.1)" text={`${total.toFixed(2)} pts`} />;
  }

  if (total > 0) {
    return <Badge color="#22c55e" bg="rgba(34,197,94,0.1)" text={`${total.toFixed(2)} pts`} />;
  }

  return <Badge color="rgba(255,255,255,0.2)" bg="rgba(255,255,255,0.03)" text="Aguardando" />;
}

// ─── Video Modal ──────────────────────────────────────────────────────────────

function VideoModal({ videoUrl, onClose }: { videoUrl: string; onClose: () => void }) {
  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '2rem',
    }} onClick={onClose}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Vídeo do Pulo
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>
        <div style={{ position: 'relative', paddingTop: '56.25%', width: '100%', background: '#000' }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="Vídeo do Pulo"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
              URL do vídeo inválida
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Event Dashboard ──────────────────────────────────────────────────────────

type ViewState = 'menu' | 'sorteio' | 'ranking' | 'touros' | 'rerides';

function Dashboard({
  evento,
  pats,
  boiadas,
  relTouros,
  relCias
}: {
  evento: Evento;
  pats: Patrocinio[];
  boiadas: Boiada[];
  relTouros: any[];
  relCias: any[];
}) {
  const [view, setView] = useState<ViewState>('menu');
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [showAberturaModal, setShowAberturaModal] = useState<boolean>(false);

  const det = typeof evento.detalhes === 'string' ? JSON.parse(evento.detalhes || '{}') : (evento.detalhes || {});
  const tc = det.tablet_config || {};

  // Extract all montarias/notes from det.notas, det.notes, det.sorteio, AND det.sorteios (plural array)
  const allMontarias = useRef<any[]>([]);
  (() => {
    const list: any[] = [];
    if (Array.isArray(det.notas)) list.push(...det.notas);
    if (Array.isArray(det.notes)) list.push(...det.notes);
    if (Array.isArray(det.sorteio)) list.push(...det.sorteio);

    if (Array.isArray(det.sorteios)) {
      det.sorteios.forEach((s: any) => {
        const diaName = s.day || s.dia || 'DIA 1';
        const riders = s.riders || [];
        const bulls = s.bulls || [];
        const assignments = s.assignments || {};

        riders.forEach((r: any, idx: number) => {
          const bIdx = assignments[idx.toString()] !== undefined ? assignments[idx.toString()] : (assignments[idx] !== undefined ? assignments[idx] : idx);
          const bObj = bulls[bIdx];
          const peaoName = typeof r === 'string' ? r : (r?.nome || r?.name || 'DESCONHECIDO');
          
          let touroName = '';
          let ciaName = '';
          let foto = '';
          let video_url = '';

          if (typeof bObj === 'string') {
            touroName = bObj;
          } else if (typeof bObj === 'object' && bObj !== null) {
            touroName = bObj.nome || bObj.name || bObj.touro || '';
            ciaName = bObj.cia || bObj.cia_nome || bObj.boiada || '';
            foto = bObj.foto || bObj.foto_url || bObj.imagem || '';
            video_url = bObj.video_url || bObj.video || bObj.videoUrl || '';
          }

          if (peaoName || touroName) {
            list.push({
              id: `sorteio-${diaName}-${idx}`,
              dia: diaName,
              peao: peaoName,
              touro: touroName,
              cia: ciaName,
              foto: foto,
              video_url: video_url,
              status: r?.status || 'pendente',
              tempo: r?.tempo,
              totalPeao: r?.totalPeao,
              totalTouro: r?.totalTouro,
            });
          }
        });
      });
    }
    allMontarias.current = list;
  })();

  const src = allMontarias.current;
  const isLive = src.some((n: any) => n.status === 'ativa');

  // Bull Resolver function
  const resolveBull = useCallback((touroName: string, rawCia?: string, noteFoto?: string, noteVideo?: string) => {
    const cleanBull = (touroName || '').trim();
    let cleanCia = (rawCia || '').trim();

    if (cleanCia.toUpperCase() === 'OUTRAS' || cleanCia.toUpperCase() === 'DESCONHECIDA' || cleanCia.toUpperCase() === 'SEM CIA') {
      cleanCia = '';
    }

    let foundCia = cleanCia;
    let foundFoto = noteFoto || '';
    let foundVideo = noteVideo || '';

    // 1. Search in det.touros / det.plantel
    const evTouros: any[] = det.touros || det.plantel || [];
    const evB = evTouros.find((t: any) => (t.nome || t.name || t.touro || '').trim().toLowerCase() === cleanBull.toLowerCase());
    if (evB) {
      if (!foundCia && (evB.cia || evB.cia_nome || evB.boiada)) foundCia = (evB.cia || evB.cia_nome || evB.boiada).trim();
      if (!foundFoto && (evB.foto || evB.foto_url || evB.imagem)) foundFoto = (evB.foto || evB.foto_url || evB.imagem).trim();
      if (!foundVideo && (evB.video_url || evB.video || evB.videoUrl)) foundVideo = (evB.video_url || evB.video || evB.videoUrl).trim();
    }

    // 2. Search in det.sorteios (bulls array inside day sorteios)
    const evSorteios: any[] = det.sorteios || [];
    evSorteios.forEach((s: any) => {
      (s.bulls || []).forEach((b: any) => {
        if (typeof b === 'object' && b !== null && (b.nome || b.name || b.touro || '').trim().toLowerCase() === cleanBull.toLowerCase()) {
          if (!foundCia && (b.cia || b.cia_nome || b.boiada)) foundCia = (b.cia || b.cia_nome || b.boiada).trim();
          if (!foundFoto && (b.foto || b.foto_url || b.imagem)) foundFoto = (b.foto || b.foto_url || b.imagem).trim();
          if (!foundVideo && (b.video_url || b.video || b.videoUrl)) foundVideo = (b.video_url || b.video || b.videoUrl).trim();
        }
      });
    });

    // 3. Search in relTouros (Supabase rel_touros table)
    const relB = relTouros.find(r => r.nome && r.nome.trim().toLowerCase() === cleanBull.toLowerCase());
    if (relB) {
      if (!foundCia && relB.cia && relB.cia.trim()) foundCia = relB.cia.trim();
      if (!foundFoto && (relB.foto || relB.foto_url)) foundFoto = relB.foto || relB.foto_url;
      if (!foundVideo && (relB.video_url || relB.video)) foundVideo = relB.video_url || relB.video;
    }

    // 4. Search in boiadas (Supabase boiadas_oficiais table)
    for (const b of boiadas) {
      if (!b.lados) continue;
      const bName = b.nome ? b.nome.trim() : '';

      const tourosInfo = b.lados?.__meta?.touros_info || {};
      const infoKey = Object.keys(tourosInfo).find(k => k.trim().toLowerCase() === cleanBull.toLowerCase());
      const infoObj = infoKey ? tourosInfo[infoKey] : null;

      const ladosKeys = Object.keys(b.lados || {}).filter(k => k !== '__meta');
      const keyMatch = ladosKeys.find(k => k.trim().toLowerCase() === cleanBull.toLowerCase());

      if (infoKey || keyMatch) {
        if (!foundCia && bName) foundCia = bName;
        if (infoObj) {
          if (!foundFoto && (infoObj.foto || infoObj.foto_url)) foundFoto = infoObj.foto || infoObj.foto_url;
          if (!foundVideo && (infoObj.video_url || infoObj.video)) foundVideo = infoObj.video_url || infoObj.video;
        }
      }
    }

    // 5. Fallback for CIA
    if (!foundCia && det.boiada) foundCia = det.boiada;
    if (!foundCia && det.cia) foundCia = det.cia;

    if (!foundCia || foundCia.toUpperCase() === 'OUTRAS' || foundCia.toUpperCase() === 'DESCONHECIDA' || foundCia.toUpperCase() === 'SEM CIA') {
      foundCia = 'CIA DESCONHECIDA';
    }

    // 6. Check relCias for logo if still no photo
    if (!foundFoto && foundCia) {
      const relCia = relCias.find(c => c.nome && c.nome.trim().toLowerCase() === foundCia.toLowerCase());
      if (relCia && (relCia.logo_url || relCia.foto)) foundFoto = relCia.logo_url || relCia.foto;
    }

    return {
      nome: cleanBull,
      cia: foundCia.toUpperCase(),
      foto: foundFoto,
      video_url: foundVideo,
    };
  }, [det, relTouros, boiadas, relCias]);

  // Ranking calculation
  const rmap: Record<string, { peao: string; total: number; count: number }> = {};
  src.forEach((n: any) => {
    if (n.peao) {
      const total = (typeof n.totalPeao === 'number' ? n.totalPeao : 0) + (typeof n.totalTouro === 'number' ? n.totalTouro : 0);
      if (!rmap[n.peao]) rmap[n.peao] = { peao: n.peao, total: 0, count: 0 };
      if (n.status === 'ativa' && total > 0) {
        rmap[n.peao].total += total;
        rmap[n.peao].count += 1;
      }
    }
  });
  const ranking = Object.values(rmap).sort((a, b) => b.total - a.total).slice(0, 50);

  // Group Touros by Resolved CIA
  const tourosMap: Record<string, { nome: string; cia: string; saidas: number; foto?: string; video_url?: string }[]> = {};

  src.forEach((n: any) => {
    if (n.touro) {
      const res = resolveBull(n.touro, n.cia, n.foto || n.imagem, n.video_url || n.videoUrl);
      const ciaName = res.cia;
      if (!tourosMap[ciaName]) tourosMap[ciaName] = [];
      
      const existing = tourosMap[ciaName].find(t => t.nome.toLowerCase() === res.nome.toLowerCase());
      if (existing) {
        existing.saidas += 1;
        if (!existing.video_url && res.video_url) existing.video_url = res.video_url;
        if (!existing.foto && res.foto) existing.foto = res.foto;
      } else {
        tourosMap[ciaName].push({
          nome: res.nome,
          cia: ciaName,
          saidas: 1,
          foto: res.foto,
          video_url: res.video_url
        });
      }
    }
  });

  // Also include any touros explicitly defined in det.touros or det.plantel
  const extraTouros: any[] = det.touros || det.plantel || [];
  extraTouros.forEach((t: any) => {
    const bName = typeof t === "string" ? t : (t.nome || t.name || "");
    if (bName) {
      const res = resolveBull(bName, typeof t === "object" ? t.cia : "", typeof t === "object" ? (t.foto || t.imagem) : "", typeof t === "object" ? (t.video_url || t.video) : "");
      const ciaName = res.cia;
      if (!tourosMap[ciaName]) tourosMap[ciaName] = [];
      const existing = tourosMap[ciaName].find(x => x.nome.toLowerCase() === res.nome.toLowerCase());
      if (!existing) {
        tourosMap[ciaName].push({
          nome: res.nome,
          cia: ciaName,
          saidas: 0,
          foto: res.foto,
          video_url: res.video_url
        });
      }
    }
  });

  // Group Re-rides by Resolved CIA
  const reridesMap: Record<string, any[]> = {};
  src.filter((n: any) => n.status === "reride" || n.reride === true).forEach((n: any) => {
    const res = resolveBull(n.touro, n.cia, n.foto, n.video_url);
    const ciaName = res.cia;
    if (!reridesMap[ciaName]) reridesMap[ciaName] = [];
    reridesMap[ciaName].push({ ...n, resolvedCia: ciaName });
  });

  const MEDAL = ['#d4af37', 'rgba(190,190,210,0.85)', 'rgba(160,100,60,0.85)'];
  const MEDAL_BG = ['rgba(212,175,55,0.06)', 'rgba(190,190,210,0.03)', 'rgba(160,100,60,0.04)'];

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      
      {/* Realtime News Ticker Banner */}
      {tc.ticker_noticias && (
        <div style={{ background: 'linear-gradient(135deg, #d4af37 0%, #c8941c 100%)', color: '#000', overflow: 'hidden', whiteSpace: 'nowrap', padding: '6px 0', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }}>
          <div style={{ display: 'inline-block', animation: 'tMarquee 25s linear infinite' }}>
            📢 {tc.ticker_noticias} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📢 {tc.ticker_noticias}
          </div>
        </div>
      )}

      {/* Opening Fullscreen Screen */}
      {(showAberturaModal || tc.abertura_ativa) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'radial-gradient(circle at center, #1a1500 0%, #000 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 2rem',
          textAlign: 'center'
        }}>
          <button
            onClick={() => setShowAberturaModal(false)}
            style={{
              position: 'absolute',
              top: '25px',
              right: '25px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              fontSize: '20px',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>

          {tc.abertura_midia_url && (
            <div style={{ marginBottom: '2rem', maxWidth: '850px', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', border: '2px solid rgba(212,175,55,0.3)' }}>
              {tc.abertura_midia_url.endsWith('.mp4') ? (
                <video src={tc.abertura_midia_url} autoPlay loop controls style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }} />
              ) : (
                <img src={tc.abertura_midia_url} alt="Abertura" style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }} />
              )}
            </div>
          )}

          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d4af37', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            🎬 {tc.abertura_subtitulo || evento.nome}
          </span>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#c8941c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.2rem', textShadow: '0 4px 20px rgba(212,175,55,0.3)' }}>
            {tc.abertura_titulo || 'ABERTURA OFICIAL'}
          </h1>
          {tc.abertura_texto && (
            <p style={{ maxWidth: '750px', color: 'rgba(255,255,255,0.85)', fontSize: '1.15rem', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '2.5rem' }}>
              "{tc.abertura_texto}"
            </p>
          )}

          {/* Sponsor Logos */}
          {pats.length > 0 && (
            <div style={{ marginTop: 'auto', display: 'flex', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {pats.map((p, i) => {
                const url = p.detalhes?.splash_app?.logo_url || p.logo_url;
                if (!url) return null;
                return <img key={i} src={url} alt={p.nome} style={{ maxHeight: '50px', maxWidth: '140px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.7 }} />;
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for Video */}
      {activeVideoUrl && (
        <VideoModal videoUrl={activeVideoUrl} onClose={() => setActiveVideoUrl(null)} />
      )}

      {/* Header */}
      <header style={{ background: '#000', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '1.4rem 2.5rem', display: 'flex', alignItems: 'center', gap: '2rem', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* RodeoApp Logo Original (No Invert Filter) */}
        <img src="/header_logo.png" alt="RodeoApp" style={{ height: '38px', objectFit: 'contain', flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {isLive && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '4px', padding: '2px 7px', marginBottom: '0.3rem' }}>
              <span style={{ width: '5px', height: '5px', background: '#22c55e', borderRadius: '50%', animation: 'tLive 1.2s ease-in-out infinite', display: 'inline-block' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Ao Vivo</span>
            </div>
          )}
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {evento.nome}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 400 }}>
            {evento.local}{evento.local && evento.data ? ' · ' : ''}{fmtDate(evento.data)}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {view !== 'menu' && (
            <button onClick={() => setView('menu')} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '6px',
              padding: '0.5rem 1.2rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              outline: 'none',
              transition: 'all 0.2s',
            }}>
              Menu do Evento
            </button>
          )}

          <button onClick={() => setShowAberturaModal(true)} style={{
            background: tc.abertura_ativa ? '#dc2626' : 'transparent',
            border: '1.5px solid #d4af37',
            color: '#d4af37',
            borderRadius: '6px',
            padding: '0.45rem 1.3rem',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            animation: 'tPulseGold 1.8s ease-in-out infinite',
            outline: 'none',
          }}>
            🎬 Abertura {tc.abertura_ativa ? '(Ao Vivo)' : ''}
          </button>
        </div>
      </header>

      {/* Content Area */}
      <main style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', animation: 'tSlide 0.2s ease' }} key={view}>

        {/* ── TELA INICIAL DO EVENTO: 4 BOTÕES GRANDES ── */}
        {view === 'menu' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '2rem' }}>
              Selecione o que deseja visualizar
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              
              {/* Botão 1: Sorteio */}
              <button onClick={() => setView('sorteio')} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = '1px solid rgba(212,175,55,0.4)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.04)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase' }}>01</div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>SORTEIO</h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 400, lineHeight: 1.4 }}>
                    Confira a ordem das montarias e o sorteio dos competidores e touros
                  </p>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>{src.length} montarias</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4af37' }}>Acessar Sorteio →</span>
                </div>
              </button>

              {/* Botão 2: Ranking */}
              <button onClick={() => setView('ranking')} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = '1px solid rgba(212,175,55,0.4)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.04)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase' }}>02</div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>RANKING</h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 400, lineHeight: 1.4 }}>
                    Classificação geral atualizada e pontuação acumulada dos peões
                  </p>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>{ranking.length} competidores</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4af37' }}>Ver Ranking →</span>
                </div>
              </button>

              {/* Botão 3: Touros */}
              <button onClick={() => setView('touros')} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = '1px solid rgba(212,175,55,0.4)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.04)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase' }}>03</div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>TOUROS</h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 400, lineHeight: 1.4 }}>
                    Plantel de touros com foto grande e vídeos separados por Companhia
                  </p>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>{Object.keys(tourosMap).length} CIAs</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4af37' }}>Ver Touros →</span>
                </div>
              </button>

              {/* Botão 4: Re-rides */}
              <button onClick={() => setView('rerides')} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.border = '1px solid rgba(212,175,55,0.4)';
                e.currentTarget.style.background = 'rgba(212,175,55,0.04)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase' }}>04</div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>RE-RIDES</h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', fontWeight: 400, lineHeight: 1.4 }}>
                    Montarias com direito a novo touro concedido por CIA
                  </p>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>{Object.values(reridesMap).flat().length} re-rides</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d4af37' }}>Ver Re-rides →</span>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ── ABA 1: SORTEIO (ALINHAMENTO RIGOROSO) ── */}
        {view === 'sorteio' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                SORTEIO DE MONTARIAS
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                {src.length}
              </span>
            </div>

            {src.length === 0 ? <Empty msg="Nenhuma montaria registrada." /> : (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: '#050505' }}>
                
                {/* Fixed Columns Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '3.5rem 1.5fr 1.5fr 140px',
                  gap: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'left' }}>#</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'left' }}>PEÃO</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'left' }}>TOURO</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'right' }}>STATUS</span>
                </div>

                {/* Table Rows with Strict Grid Alignment */}
                {src.map((item: any, i: number) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '3.5rem 1.5fr 1.5fr 140px',
                    gap: '1rem',
                    padding: '0.9rem 1.5rem',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    alignItems: 'center',
                  }}>
                    {/* Col 1: # */}
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'left' }}>
                      {i + 1}
                    </span>

                    {/* Col 2: PEÃO */}
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.peao || item.competidor || '—'}
                      </div>
                      {item.dia && (
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {item.dia}
                        </div>
                      )}
                    </div>

                    {/* Col 3: TOURO (Strictly Aligned Left) */}
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#d4af37', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.touro || '—'}
                      </div>
                      {item.cia && (
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {item.cia}
                        </div>
                      )}
                    </div>

                    {/* Col 4: STATUS (Aligned Right) */}
                    <div style={{ textAlign: 'right', justifySelf: 'end' }}>
                      {renderStatusBadge(item)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 2: RANKING ── */}
        {view === 'ranking' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                CLASSIFICAÇÃO GERAL
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                {ranking.length}
              </span>
            </div>

            {ranking.length === 0 ? <Empty msg="Nenhuma nota ainda." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {ranking.map((item, i) => {
                  const isTop3 = i < 3;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      padding: '0.9rem 1.4rem',
                      background: isTop3 ? MEDAL_BG[i] : 'rgba(255,255,255,0.015)',
                      border: `1px solid ${isTop3 ? MEDAL[i] + '22' : 'rgba(255,255,255,0.04)'}`,
                      borderRadius: '10px',
                    }}>
                      <div style={{
                        width: '2.1rem',
                        height: '2.1rem',
                        borderRadius: '50%',
                        background: isTop3 ? MEDAL[i] + '18' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isTop3 ? MEDAL[i] + '50' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        color: isTop3 ? MEDAL[i] : 'rgba(255,255,255,0.2)',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                          {item.peao}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', marginTop: '2px' }}>
                          {item.count} montaria{item.count !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {item.total === 0 ? (
                          <Badge color="#ef4444" bg="rgba(239,68,68,0.15)" text="QUEDA" />
                        ) : (
                          <>
                            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: i === 0 ? '#d4af37' : '#fff', letterSpacing: '-0.02em' }}>
                              {fmtScore(item.total)}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.62rem', letterSpacing: '0.1em' }}>PTS</div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 3: TOUROS (SEM MÉDIA, COM FOTO GRANDE E VÍDEO, SEPARADO POR CIA) ── */}
        {view === 'touros' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                TOUROS DO EVENTO POR COMPANHIA
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                {Object.keys(tourosMap).length} CIAs
              </span>
            </div>

            {Object.keys(tourosMap).length === 0 ? <Empty msg="Nenhum touro registrado." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {Object.entries(tourosMap).map(([ciaName, tourosList]) => (
                  <div key={ciaName} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Header da CIA (Estilo Tela da CIA) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#d4af37', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {ciaName}
                      </h3>
                      <span style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '99px', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {tourosList.length} touro{tourosList.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Cards dos Touros (Vertical Portrait Style) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                      {tourosList.map((t, i) => (
                        <div key={i} style={{
                          position: 'relative',
                          height: '320px',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#0a0a0a',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                        }}>
                          {/* Full Background Photo */}
                          {t.foto ? (
                            <img
                              src={t.foto}
                              alt={t.nome}
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e: any) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sem foto</span>
                            </div>
                          )}

                          {/* Dark Gradient Overlay */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.1) 75%, transparent 100%)',
                            pointerEvents: 'none',
                          }} />

                          {/* Top Left Lado Badge */}
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(6px)',
                            color: '#fff',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(255,255,255,0.15)',
                            zIndex: 2,
                          }}>
                            {t.lado || 'LADO'}
                          </div>

                          {/* Bottom Text Overlay */}
                          <div style={{
                            position: 'relative',
                            padding: '1.2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.2rem',
                            zIndex: 2,
                          }}>
                            <h4 style={{
                              fontSize: '1.25rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              color: '#fff',
                              letterSpacing: '-0.02em',
                              lineHeight: 1.1,
                              textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                            }}>
                              {t.nome}
                            </h4>

                            <p style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              fontStyle: 'italic',
                              color: 'rgba(255,255,255,0.7)',
                              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                            }}>
                              {t.cia}
                            </p>

                            {/* Red Pill Ver Pulo Button */}
                            {t.video_url && (
                              <button onClick={() => setActiveVideoUrl(t.video_url || null)} style={{
                                marginTop: '0.65rem',
                                alignSelf: 'flex-start',
                                background: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '99px',
                                padding: '5px 14px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
                                outline: 'none',
                              }}>
                                ▶ Ver Pulo
                              </button>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 4: RE-RIDES (SEPARADO POR CIA) ── */}
        {view === 'rerides' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                MONTARIAS RE-RIDE POR COMPANHIA
              </span>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                {Object.values(reridesMap).flat().length}
              </span>
            </div>

            {Object.keys(reridesMap).length === 0 ? <Empty msg="Nenhuma re-ride registrada neste evento." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {Object.entries(reridesMap).map(([ciaName, list]) => (
                  <div key={ciaName} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(167,139,250,0.2)', paddingBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#a78bfa', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{ciaName}</h3>
                      <span style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '99px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>{list.length} re-ride{list.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {list.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.25rem', background: 'rgba(167,139,250,0.03)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.peao || '—'}</div>
                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '2px' }}>Touro: <span style={{ color: '#d4af37', fontWeight: 600 }}>{item.touro || '—'}</span>{item.dia ? ` · ${item.dia}` : ''}</div>
                          </div>
                          <Badge color="#a78bfa" bg="rgba(167,139,250,0.1)" text="Re-ride" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sponsor Footer */}
      {pats.length > 0 && (
        <footer style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '1.5rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.5rem', flexWrap: 'wrap', minHeight: '90px' }}>
          {pats.map((p, i) => {
            const url = p.detalhes?.splash_app?.logo_url || p.logo_url;
            if (!url) return null;
            return (
              <img
                key={i}
                src={url}
                alt={p.nome}
                style={{ maxHeight: '52px', maxWidth: '150px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.55 }}
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
            );
          })}
        </footer>
      )}
    </div>
  );
}

// ─── Event List ───────────────────────────────────────────────────────────────

function EventList({ eventos, loading, onSelect }: { eventos: Evento[]; loading: boolean; onSelect: (e: Evento) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <header style={{ padding: '2.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Painel · Tablet</p>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg,#d4af37 0%,#f0d060 50%,#c8941c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RODEOAPP</h1>
        </div>
        <img src="/header_logo.png" alt="RodeoApp" style={{ height: '46px', objectFit: 'contain', flexShrink: 0 }} />
      </header>
      <div style={{ padding: '2.5rem 3rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>Selecione um Evento</p>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7rem', gap: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
            <div style={{ width: '26px', height: '26px', border: '2px solid rgba(212,175,55,0.12)', borderTopColor: '#d4af37', borderRadius: '50%', animation: 'tSpin 0.7s linear infinite' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Carregando...</span>
          </div>
        ) : eventos.length === 0 ? <Empty msg="Nenhum evento encontrado." /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {eventos.map(ev => {
              const det = typeof ev.detalhes === 'string' ? JSON.parse(ev.detalhes || '{}') : (ev.detalhes || {});
              const notas: any[] = det.notas || [];
              const live = notas.some((n: any) => n.status === 'ativa');
              return (
                <button key={ev.id} onClick={() => onSelect(ev)} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.6rem 1.75rem', cursor: 'pointer', textAlign: 'left', color: '#fff', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', outline: 'none' }} onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.3)'; e.currentTarget.style.background = 'rgba(212,175,55,0.03)'; }} onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.65rem' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{ev.nome}</h3>
                    {live && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.58rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                        <span style={{ width: '4px', height: '4px', background: '#22c55e', borderRadius: '50%', animation: 'tLive 1.2s ease-in-out infinite', display: 'inline-block' }} /> Live
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>📍 {ev.local || '—'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>📅 {fmtDate(ev.data)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.72rem' }}>{notas.length > 0 ? `${notas.length} montaria${notas.length !== 1 ? 's' : ''}` : 'Sem montarias'}</span>
                    <span style={{ color: '#d4af37', fontSize: '0.78rem', fontWeight: 600 }}>Abrir Evento →</span>
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

export default function TabletApp() {
  const [screen, setScreen] = useState<'events' | 'event'>('events');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pats, setPats] = useState<Patrocinio[]>([]);
  const [boiadas, setBoiadas] = useState<Boiada[]>([]);
  const [relTouros, setRelTouros] = useState<any[]>([]);
  const [relCias, setRelCias] = useState<any[]>([]);
  const [selected, setSelected] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [ss, setSs] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ev, pat, boi, touros, cias] = await Promise.all([
          supabase.from('eventos_oficiais').select('*').order('created_at', { ascending: false }),
          supabase.from('patrocinios').select('*').eq('status', 'ativo'),
          supabase.from('boiadas_oficiais').select('*'),
          supabase.from('rel_touros').select('*'),
          supabase.from('rel_cias').select('*'),
        ]);
        if (ev.data) setEventos(ev.data);
        if (pat.data) setPats(pat.data);
        if (boi.data) setBoiadas(boi.data);
        if (touros.data) setRelTouros(touros.data);
        if (cias.data) setRelCias(cias.data);
      } catch (err) {
        console.error('Tablet fetch error:', err);
      } finally { setLoading(false); }
    })();

    const channel = supabase
      .channel('tablet_realtime_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_oficiais' }, (payload) => {
        if (payload.new) {
          const updatedEv = payload.new as Evento;
          setEventos(prev => prev.map(e => e.id === updatedEv.id ? updatedEv : e));
          setSelected(prev => (prev && prev.id === updatedEv.id ? updatedEv : prev));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSs(true), 60_000);
  }, []);

  useEffect(() => {
    if (screen !== 'event') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSs(false);
      return;
    }
    resetTimer();
    const evts = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll', 'click'];
    evts.forEach(e => document.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      evts.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [screen, resetTimer]);

  const handleSelect = (ev: Evento) => {
    setSelected(ev);
    setScreen('event');
    setSs(false);
  };

  const handleWake = useCallback(() => {
    setSs(false);
    resetTimer();
  }, [resetTimer]);

  const ssLogos = pats.map(p => p.detalhes?.splash_app?.logo_url || p.logo_url).filter(Boolean) as string[];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {ss && <Screensaver logos={ssLogos} onWake={handleWake} />}
      {screen === 'events' && <EventList eventos={eventos} loading={loading} onSelect={handleSelect} />}
      {screen === 'event' && selected && (
        <Dashboard
          evento={selected}
          pats={pats}
          boiadas={boiadas}
          relTouros={relTouros}
          relCias={relCias}
        />
      )}
    </>
  );
}
