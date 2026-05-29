const fs = require('fs');
let c = fs.readFileSync('portal/src/App.tsx', 'utf8');

// 1. Add sorteios to eventTab types and selectedSorteioDay state
c = c.replace(
  /const \[eventTab, setEventTab\] = useState<.*?>\('home'\);/,
  "const [eventTab, setEventTab] = useState<'home'|'ranking'|'sorteios'|'competidores'|'boiadas'|'noticias'|'midia'>('home');\n  const [selectedSorteioDay, setSelectedSorteioDay] = useState<string>('');"
);

// 2. Add 'sorteios' to the tab list
c = c.replace(
  /\{ id: 'ranking', label: 'Ranking' \},/,
  "{ id: 'ranking', label: 'Ranking' },\n              { id: 'sorteios', label: 'Sorteio' },"
);

// 3. Add 'Sorteios' button to home grid
c = c.replace(
  /<div className="event-card" style=\{\{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' \}\} onClick=\{\(\) => setEventTab\('ranking'\)\}>/,
  `<div className="event-card" style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }} onClick={() => setEventTab('sorteios')}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Sorteio</h3>
                </div>
                $&`
);

// 4. Add Sorteios tab content
const sorteioContent = `
            {eventTab === 'sorteios' && (
              <div className="ranking-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                   {(() => {
                      if (!selectedEvent.detalhes?.sorteios || selectedEvent.detalhes.sorteios.length === 0) return null;
                      const days = selectedEvent.detalhes.sorteios.map((s: any) => s.day);
                      if (!selectedSorteioDay && days.length > 0) setTimeout(() => setSelectedSorteioDay(days[0]), 0);
                      
                      return days.map((dia: string) => (
                        <button 
                          key={dia}
                          onClick={() => setSelectedSorteioDay(dia)}
                          style={{
                            background: selectedSorteioDay === dia ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: selectedSorteioDay === dia ? '#000' : 'var(--text-muted)',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          {dia.toUpperCase().replace(/DIA /g, 'ROUND ')}
                        </button>
                      ));
                   })()}
                </div>

                <div className="ranking-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    if (!selectedEvent.detalhes?.sorteios) return <p style={{ color: 'var(--text-muted)' }}>Nenhum sorteio disponível.</p>;
                    const sorteio = selectedEvent.detalhes.sorteios.find((s: any) => s.day === selectedSorteioDay);
                    if (!sorteio) return null;

                    return sorteio.riders.map((rider: any, index: number) => {
                      const bullIndex = sorteio.assignments[index.toString()];
                      const bull = bullIndex !== undefined ? sorteio.bulls[bullIndex] : null;

                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 30, 30, 0.4)', borderRadius: '16px', padding: '1rem 1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)', width: '40px' }}>
                            {index + 1}º
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>{rider.nome}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rider.cidade}</div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                             X 
                          </div>

                          <div style={{ flex: 1, textAlign: 'right' }}>
                            {bull ? (
                              <>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent)' }}>{bull.nome}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Cia {bull.cia} <span style={{ background: bull.lado === 'E' ? 'rgba(0, 191, 255, 0.2)' : 'rgba(255, 69, 0, 0.2)', color: bull.lado === 'E' ? '#00BFFF' : '#FF4500', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 'bold' }}>{bull.lado}</span>
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Touro não definido</div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
`;

c = c.replace(
  /\{eventTab === 'ranking' && \(/,
  sorteioContent + "\n            $&"
);

fs.writeFileSync('portal/src/App.tsx', c);
