const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Extract the modal
const modalStartStr = '{/* ==================================== */}\n        {/* MODAL DE PERFIL DO COMPETIDOR */}';
const modalEndStr = '{/* MODAL DE CADASTRO */}'; // We injected it right before this
let modalJsx = '';

const startIndex = c.indexOf(modalStartStr);
const endIndex = c.indexOf(modalEndStr);

if (startIndex !== -1 && endIndex !== -1) {
    // Extract the modal JSX, including the start string
    modalJsx = c.substring(startIndex, endIndex - 41); // Roughly remove the formatting before MODAL DE CADASTRO
} else {
    // Fallback: define it directly if we can't extract
    modalJsx = `
        {/* ==================================== */}
        {/* MODAL DE PERFIL DO COMPETIDOR */}
        {/* ==================================== */}
        <div className={\`modal-overlay \${isProfileModalOpen ? 'active' : ''}\`} style={{ zIndex: 9999 }}>
          {isProfileModalOpen && selectedPeaoProfile && (
            <div className="auth-modal" style={{ maxWidth: '900px', width: '90%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <button className="close-btn" onClick={() => setIsProfileModalOpen(false)}>✕</button>
              
              <div className="profile-card" style={{ width: '100%', marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                {/* Left Column: Avatar & Role */}
                <div className="profile-sidebar" style={{ flex: '1', minWidth: '250px', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                  <div className="profile-avatar-wrapper" style={{ margin: '0 auto' }}>
                    <img 
                      src={selectedPeaoProfile.foto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80"} 
                      alt="Foto de Perfil" 
                      className={\`profile-avatar \${selectedPeaoProfile.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}\`}
                    />
                  </div>
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: '#fff' }}>{selectedPeaoProfile.nome}</h3>
                  </div>

                  <span className="badge badge-role" style={{ marginTop: '1rem', background: '#E11D48', color: '#fff', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    COMPETIDOR
                  </span>

                  {selectedPeaoProfile.veio_do_app_desktop && (
                    <div style={{ marginTop: '1rem' }}>
                      <span className="badge badge-rodeoapp" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.5)', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        Verificado RodeoApp
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Column: Info */}
                <div className="profile-content" style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="profile-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                      <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Cidade / Estado</label>
                      <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', color: '#fff' }}>{selectedPeaoProfile.cidade || selectedPeaoProfile.endereco || 'Não informado'}</div>
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Data de Nasc.</label>
                      <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', color: '#fff' }}>{selectedPeaoProfile.nascimento || 'Não informado'}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Biografia</label>
                    <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', minHeight: '80px', color: '#fff' }}>
                      {selectedPeaoProfile.bio || 'Este competidor ainda não adicionou uma biografia.'}
                    </div>
                  </div>
                  
                  {/* Historico */}
                  <div className="profile-history-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Histórico em Eventos (HZN)</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPeaoProfile.historico && selectedPeaoProfile.historico.length > 0 ? (
                          selectedPeaoProfile.historico.map((hist: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#fff' }}>{hist.eventoNome}</h4>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{hist.cidade}</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Posição</span>
                                <strong style={{ color: '#E11D48', fontSize: '1.5rem' }}>{hist.posicao}º</strong>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum evento registrado ainda.</p>
                        )}
                      </div>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>\n`;
}

// 2. Inject it before the end of the Standalone event block
const eventEndTarget = `            </div>
          </div>
        </div>
      );
    }

  if (publicProfileSlug) {`;

const eventEndReplace = `            </div>
          </div>
${modalJsx}
        </div>
      );
    }

  if (publicProfileSlug) {`;

c = c.split(eventEndTarget).join(eventEndReplace);

fs.writeFileSync(file, c);
console.log('Moved modal JSX inside the event block!');
