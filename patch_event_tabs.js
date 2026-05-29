const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Inject state
content = content.replace(
  `const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');`,
  `const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');\n  const [eventTab, setEventTab] = useState<'ranking'|'competidores'|'boiadas'|'noticias'|'midia'>('ranking');`
);

// 2. Identify the standalone block
const standaloneStart = `  if (publicEventSlug && selectedEvent) {`;
const standaloneRegex = /if \(publicEventSlug && selectedEvent\) \{[\s\S]*?(?=if \(publicProfileSlug\) \{)/;

const newStandaloneBlock = `  if (publicEventSlug && selectedEvent) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%', left: 0 }}>
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>RODEO<span className="text-primary">APP</span></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => { navigateTo('/'); setPublicEventSlug(null); setSelectedEvent(null); setEventTab('ranking'); }}>Ir para o Portal</button>
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

          {/* Abas de Navegação do Evento */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            {[
              { id: 'ranking', label: 'Ranking' },
              { id: 'competidores', label: 'Competidores' },
              { id: 'boiadas', label: 'Boiadas' },
              { id: 'noticias', label: 'Notícias' },
              { id: 'midia', label: 'Mídia' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setEventTab(tab.id as any)}
                style={{ 
                  background: 'none', border: 'none', color: eventTab === tab.id ? '#E11D48' : '#94a3b8', 
                  fontWeight: 'bold', fontSize: '1rem', padding: '0.5rem 1rem', cursor: 'pointer',
                  borderBottom: eventTab === tab.id ? '2px solid #E11D48' : '2px solid transparent',
                  textTransform: 'uppercase', whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo Dinâmico */}
          <div className="event-tab-content">
            
            {eventTab === 'ranking' && (
              <div className="ranking-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                   {(() => {
                      const days = new Set<string>();
                      (selectedEvent.detalhes?.notas || []).forEach((n: any) => { if (n.dia) days.add(n.dia); });
                      const dayList = ['Geral', ...Array.from(days).sort()];
                      return dayList.map(d => (
                         <button key={d} onClick={() => setSelectedRankingDay(d)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', background: selectedRankingDay === d ? '#E11D48' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>{d}</button>
                      ));
                   })()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedEvent.detalhes?.ranking && selectedEvent.detalhes.ranking.length > 0 ? (
                    (() => {
                       let rankingBase = [...selectedEvent.detalhes.ranking];
                       // Se for dia especifico
                       if (selectedRankingDay !== 'Geral') {
                           rankingBase = rankingBase.map((peao: any) => {
                               const peaoNotas = (selectedEvent.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa') && n.dia === selectedRankingDay);
                               let dayScore = 0;
                               let dayTempo = 0;
                               let detalheDia: any = null;
                               peaoNotas.forEach((n: any) => {
                                   if (n.totalPeao === 0 || n.tempo < 8) dayTempo += n.tempo;
                                   else dayScore += (n.totalPeao + n.totalTouro);
                                   detalheDia = n;
                               });
                               return { ...peao, score: dayScore, tempoAcumulado: dayTempo, detalheDia };
                           });
                       } else {
                           // Se for Geral, precisamos agregar as notas de cada dia para mostrar quebras
                           rankingBase = rankingBase.map((peao: any) => {
                               const peaoNotas = (selectedEvent.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                               const parciais: any = {};
                               let total = 0;
                               peaoNotas.forEach((n: any) => {
                                   if (n.totalPeao > 0 && n.tempo >= 8) {
                                       parciais[n.dia] = n.totalPeao + n.totalTouro;
                                       total += (n.totalPeao + n.totalTouro);
                                   } else {
                                       parciais[n.dia] = n.tempo + 's';
                                   }
                               });
                               return { ...peao, score: total, parciais };
                           });
                       }
                       // Ordena
                       return rankingBase.sort((a, b) => (b.score || 0) - (a.score || 0)).filter(p => selectedRankingDay === 'Geral' || (p.score > 0 || p.tempoAcumulado > 0));
                    })().map((peao: any, idx: number) => (
                      <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        
                        {/* Header do Card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: '900', color: '#E11D48', width: '24px', fontSize: '1.2rem' }}>{idx + 1}º</span>
                            <span 
                              style={{ fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }} 
                              className="hover:text-primary transition-colors" 
                              onClick={async () => {
                                if (!peao.cpf) return alert("CPF não vinculado.");
                                setIsPeaoProfileLoading(true);
                                const cleanCpf = peao.cpf.replace(/\\D/g, '');
                                const { data } = await supabase.from('perfis_portal').select('*').eq('cpf', cleanCpf).limit(1);
                                setIsPeaoProfileLoading(false);
                                if (!data || data.length === 0) return alert("Perfil não criado.");
                                
                                setSelectedPeaoProfile(data[0]);
                                window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                              }}
                            >
                              {peao.nome}
                            </span>
                          </div>
                          <span style={{ color: '#E11D48', fontWeight: '900', fontSize: '1.2rem' }}>
                            {peao.score > 0 ? peao.score.toFixed(2) : peao.tempoAcumulado ? peao.tempoAcumulado.toFixed(2) + 's' : '0.00'} pts
                          </span>
                        </div>
                        <div style={{ marginLeft: '2.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>{peao.cidade}</div>

                        {/* Detalhamento das Notas (Dia Específico) */}
                        {selectedRankingDay !== 'Geral' && peao.detalheDia && (
                           <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', display: 'flex', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                             <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Touro</span><strong style={{ color: '#fff' }}>{peao.detalheDia.touro}</strong></div>
                             {peao.detalheDia.tempo >= 8 && peao.detalheDia.totalPeao > 0 ? (
                               <>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Juiz 1</span><strong style={{ color: '#fff' }}>{(peao.detalheDia.j1_peao + peao.detalheDia.j1_touro).toFixed(2)}</strong></div>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Juiz 2</span><strong style={{ color: '#fff' }}>{(peao.detalheDia.j2_peao + peao.detalheDia.j2_touro).toFixed(2)}</strong></div>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Nota Final</span><strong style={{ color: '#10b981' }}>{(peao.detalheDia.totalPeao + peao.detalheDia.totalTouro).toFixed(2)}</strong></div>
                               </>
                             ) : (
                               <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Tempo</span><strong style={{ color: '#ef4444' }}>{peao.detalheDia.tempo.toFixed(2)}s</strong></div>
                             )}
                           </div>
                        )}

                        {/* Detalhamento Parcial (Geral) */}
                        {selectedRankingDay === 'Geral' && peao.parciais && Object.keys(peao.parciais).length > 0 && (
                          <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {Object.entries(peao.parciais).map(([dia, pont]) => (
                               <div key={dia} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                                 <span style={{ color: '#94a3b8', marginRight: '0.5rem' }}>{dia}:</span>
                                 <strong style={{ color: typeof pont === 'string' ? '#ef4444' : '#10b981' }}>{pont}</strong>
                               </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum competidor com notas neste dia.</p>
                  )}
                </div>
              </div>
            )}

            {eventTab === 'competidores' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {(selectedEvent.detalhes?.ranking || []).map((peao: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.2rem', margin: 0 }}>{peao.nome}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{peao.cidade}</span>
                    <button 
                      className="btn btn-outline" 
                      style={{ marginTop: '1rem', width: '100%' }}
                      onClick={async () => {
                        if (!peao.cpf) return alert("CPF não vinculado.");
                        setIsPeaoProfileLoading(true);
                        const { data } = await supabase.from('perfis_portal').select('*').eq('cpf', peao.cpf.replace(/\\D/g, '')).limit(1);
                        setIsPeaoProfileLoading(false);
                        if (!data || data.length === 0) return alert("Perfil não encontrado.");
                        setSelectedPeaoProfile(data[0]);
                        window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                      }}
                    >
                      Ver Perfil
                    </button>
                  </div>
                ))}
              </div>
            )}

            {eventTab === 'boiadas' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
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
                         style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                         className="hover:bg-white/5 transition-colors"
                    >
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{b.nome}</h4>
                      <p style={{ margin: '0.5rem 0 0 0', color: '#E11D48', fontSize: '0.85rem', fontWeight: 'bold' }}>VER PLANTEL COMPLETO &rarr;</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma boiada registrada ainda.</p>
                )}
              </div>
            )}

            {eventTab === 'noticias' && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Notícias em Breve</h3>
                <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>Este módulo está em desenvolvimento. Em breve, a comissão poderá publicar novidades e informativos sobre o evento.</p>
              </div>
            )}

            {eventTab === 'midia' && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Galeria de Mídia em Breve</h3>
                <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>Espaço reservado para as fotos oficiais e cobertura do evento.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }
`;

content = content.replace(standaloneRegex, newStandaloneBlock + '\n');

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx patched with new standalone tabs!');
