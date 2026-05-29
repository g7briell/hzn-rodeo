const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

const searchCompetidores = `setSelectedPeaoProfile(data[0]);
                          setPublicEventSlug(null);
                          setPublicBoiadaSlug(null);
                          setPublicProfileSlug(peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                          window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

const replaceCompetidores = `setSelectedPeaoProfile(data[0]);
                          setIsProfileModalOpen(true);`;

c = c.replace(searchCompetidores, replaceCompetidores);


// Also check if there's any other place that does setSelectedPeaoProfile(data[0]) and sets publicProfileSlug.
const search2 = `setSelectedPeaoProfile(data[0]);
                                  setPublicEventSlug(null);
                                  setPublicBoiadaSlug(null);
                                  setPublicProfileSlug(peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                                  window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

const replace2 = `setSelectedPeaoProfile(data[0]);
                                  setIsProfileModalOpen(true);`;
                                  
c = c.replace(search2, replace2);

fs.writeFileSync(file, c);
console.log('Fixed profile click handlers!');
