const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
content = content.replace(
  'const [publicBoiadaSlug, setPublicBoiadaSlug] = useState<string | null>(null);',
  'const [publicBoiadaSlug, setPublicBoiadaSlug] = useState<string | null>(null);\n  const [publicEventSlug, setPublicEventSlug] = useState<string | null>(null);\n  const [selectedRankingDay, setSelectedRankingDay] = useState<string>(\'Geral\');'
);

// 2. Fix the Routing Block
const routerOld = `        const path = window.location.pathname;
        if (path.startsWith('/perfil/')) {`;

const routerNew = `        const path = window.location.pathname;
        if (path.startsWith('/evento/')) {
          const slug = path.split('/evento/')[1].replace(/[^a-z0-9-]/g, '');
          const match = eventosOficiais.find(ev => (ev.nome && ev.nome.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9-]/g, '') === slug) || (ev.nome && ev.nome.replace(/\\s+/g, '').toLowerCase() === slug));
          if (match) {
            setPublicEventSlug(slug);
            setSelectedEvent(match);
          }
        } else if (path.startsWith('/perfil/')) {`;

content = content.replace(routerOld, routerNew);

// 3. Clear publicEventSlug when other routes are hit
content = content.replace('setPublicBoiadaSlug(null);', 'setPublicBoiadaSlug(null);\n            setPublicEventSlug(null);');
content = content.replace('setPublicBoiada(null);', 'setPublicBoiada(null);\n          setPublicEventSlug(null);');

// 4. Standalone Event Render Block
// We will inject a completely separate render block just above `if (publicProfileSlug)`
const standaloneEventBlock = `
  if (publicEventSlug && selectedEvent) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%', left: 0 }}>
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>RODEO<span className="text-primary">APP</span></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => { navigateTo('/'); setPublicEventSlug(null); setSelectedEvent(null); }}>Ir para o Portal</button>
          </div>
        </header>

        <div className="event-detail-view fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', marginTop: '2rem' }}>
          <div className="event-header-banner" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
            {selectedEvent.detalhes?.logo ? (
              <img src={selectedEvent.detalhes.logo} alt={selectedEvent.nome} style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '24px', background: 'rgba(0,0,0,0.4)', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>LOGO</div>
            )}
            <div>
              <span className="event-date" style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>{selectedEvent.tipo || 'RODEIO'}</span>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', lineHeight: 1, fontWeight: '900', textTransform: 'uppercase' }}>{selectedEvent.nome}</h2>
              
              <div style={{ display: 'flex', gap: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {selectedEvent.cidade}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Diretor: <strong style={{ color: '#fff' }}>{selectedEvent.detalhes?.diretor || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="event-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="ranking-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Ranking (Peões)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                 {(() => {
                    const days = new Set<string>();
                    (selectedEvent.detalhes?.notas || []).forEach((n: any) => { if (n.dia) days.add(n.dia); });
                    const dayList = ['Geral', ...Array.from(days).sort()];
                    return dayList.map(d => (
                       <button key={d} onClick={() => setSelectedRankingDay(d)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', background: selectedRankingDay === d ? '#E11D48' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>{d}</button>
                    ));
                 })()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedEvent.detalhes?.ranking && selectedEvent.detalhes.ranking.length > 0 ? (
                  (() => {
                     let rankingBase = [...selectedEvent.detalhes.ranking];
                     if (selectedRankingDay !== 'Geral') {
                         rankingBase = rankingBase.map((peao: any) => {
                             const peaoNotas = (selectedEvent.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa') && n.dia === selectedRankingDay);
                             let dayScore = 0;
                             let dayTempo = 0;
                             peaoNotas.forEach((n: any) => {
                                 if (n.totalPeao === 0 || n.tempo < 8) dayTempo += n.tempo;
                                 else dayScore += (n.totalPeao + n.totalTouro);
                             });
                             return { ...peao, score: dayScore, tempoAcumulado: dayTempo };
                         });
                     }
                     return rankingBase.sort((a, b) => (b.score || 0) - (a.score || 0)).filter(p => selectedRankingDay === 'Geral' || (p.score > 0 || p.tempoAcumulado > 0));
                  })().map((peao: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '900', color: '#E11D48', width: '20px' }}>{idx + 1}º</span>
                        <span 
                          style={{ fontWeight: 'bold', cursor: 'pointer' }} 
                          className="hover:text-primary transition-colors" 
                          title="Ver Perfil do Competidor"
                          onClick={async () => {
                            if (!peao.cpf) {
                              alert("Este competidor não possui um CPF vinculado pelo diretor do evento.");
                              return;
                            }
                            setIsPeaoProfileLoading(true);
                            const cleanCpf = peao.cpf.replace(/\\D/g, '');
                            const { data, error } = await supabase.from('perfis_portal').select('*').eq('cpf', cleanCpf).limit(1);
                            setIsPeaoProfileLoading(false);
                            
                            const profileData = data && data.length > 0 ? data[0] : null;

                            if (error || !profileData) {
                              alert("Este competidor ainda não criou o cadastro no Portal RodeoApp.");
                            } else {
                              const historico: any[] = [];
                              eventosOficiais.forEach(ev => {
                                const rankIndex = ev.detalhes?.ranking?.findIndex((r: any) => {
                                  const rCpf = r.cpf ? r.cpf.replace(/\\D/g, '') : '';
                                  return rCpf === cleanCpf;
                                });
                                if (rankIndex !== undefined && rankIndex >= 0) {
                                  historico.push({
                                    eventoNome: ev.nome,
                                    cidade: ev.cidade,
                                    posicao: rankIndex + 1
                                  });
                                }
                              });
                              setSelectedPeaoProfile({ ...profileData, historico });
                              const slug = peao.nome.trim().toLowerCase().replace(/\\s+/g, '');
                              window.history.pushState({}, '', '/perfil/' + slug);
                            }
                          }}
                        >
                          {peao.nome}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <span>{peao.cidade}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum competidor registrado ainda.</p>
                )}
              </div>
            </div>

            <div className="boiadas-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Boiadas Registradas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedEvent.detalhes?.boiadas && selectedEvent.detalhes.boiadas.length > 0 ? (
                  selectedEvent.detalhes.boiadas.map((b: any, idx: number) => (
                    <div key={idx} 
                         onClick={async () => {
                            setIsPublicProfileLoading(true);
                            const { data } = await supabase.from('boiadas_oficiais').select('*').eq('status', 'aprovado');
                            setIsPublicProfileLoading(false);
                            if (data) {
                                let match = data.find(db => slugify(db.nome) === slugify(b.nome));
                                if (!match && b.touros && b.touros.length > 0) {
                                    match = data.find(db => {
                                        if (!db.touros) return false;
                                        const dbBulls = db.touros.map((t: string) => slugify(t));
                                        let matches = 0;
                                        b.touros.forEach((t: string) => { if (dbBulls.includes(slugify(t))) matches++; });
                                        return matches >= 2;
                                    });
                                }
                                if (match) {
                                    window.history.pushState({}, '', '/boiada/' + slugify(match.nome));
                                    setPublicBoiadaSlug(slugify(match.nome));
                                    setPublicProfileSlug(null);
                                    setPublicEventSlug(null);
                                    setPublicBoiada(match);
                                } else {
                                    alert("Esta boiada não possui um perfil público verificado no portal.");
                                }
                            }
                         }}
                         style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                         className="hover:bg-white/5 transition-colors"
                    >
                      {b.nome}
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma boiada registrada ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
`;

content = content.replace('  if (publicProfileSlug) {', standaloneEventBlock + '\n  if (publicProfileSlug) {');

// 5. Remove event from main grid if we route there
const eventCardClickOld = `onClick={() => setSelectedEvent(ev)}`;
const eventCardClickNew = `onClick={() => { window.history.pushState({}, '', '/evento/' + slugify(ev.nome)); setPublicEventSlug(slugify(ev.nome)); setSelectedEvent(ev); setSelectedRankingDay('Geral'); }}`;
content = content.replace(eventCardClickOld, eventCardClickNew);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx correctly patched and separated standalone event block!');
