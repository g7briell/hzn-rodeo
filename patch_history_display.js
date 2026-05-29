const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/Histórico em Eventos \(HZN\)/g, 'Histórico de Eventos');
c = c.replace(/Hist\u00f3rico em Eventos \(HZN\)/g, 'Histórico de Eventos');
c = c.replace(/Histrico em Eventos \(HZN\)/g, 'Histórico de Eventos');

const oldRightDiv1 = `<div style={{ textAlign: 'right' }}>
                                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Posição</span>
                                  <strong style={{ color: '#E11D48', fontSize: '1.5rem' }}>{hist.posicao}º</strong>
                                </div>`;
const newRightDiv1 = ``;

const oldRightDiv1Encoded = `<div style={{ textAlign: 'right' }}>
                                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Posiǜo</span>
                                  <strong style={{ color: '#E11D48', fontSize: '1.5rem' }}>{hist.posicao}</strong>
                                </div>`;

const oldRightDiv2 = `<div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: '900', color: '#E11D48', fontSize: '1.2rem' }}>{hist.posicao}º Lugar</div>
                                </div>`;

const oldRightDiv2Encoded = `<div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: '900', color: '#E11D48', fontSize: '1.2rem' }}>{hist.posicao} Lugar</div>
                                </div>`;

const oldH4 = `<h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#fff' }}>{hist.eventoNome}</h4>`;
const newH4 = `<h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{hist.eventoNome} <span style={{ color: '#E11D48', fontSize: '0.9rem', padding: '0.2rem 0.6rem', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '6px' }}>{hist.posicao}º Lugar</span></h4>`;

const oldH4b = `<h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem' }}>{hist.eventoNome}</h4>`;
const newH4b = `<h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{hist.eventoNome} <span style={{ color: '#E11D48', fontSize: '0.9rem', padding: '0.2rem 0.6rem', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '6px' }}>{hist.posicao}º Lugar</span></h4>`;

c = c.split(oldRightDiv1).join('');
c = c.split(oldRightDiv1Encoded).join('');
c = c.split(oldRightDiv2).join('');
c = c.split(oldRightDiv2Encoded).join('');
c = c.split(oldH4).join(newH4);
c = c.split(oldH4b).join(newH4b);

fs.writeFileSync(file, c);
console.log('Patched history display!');
