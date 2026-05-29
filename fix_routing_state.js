const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

const targetStr = `setSelectedPeaoProfile(data[0]);
                                window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

const replaceStr = `setSelectedPeaoProfile(data[0]);
                                setPublicEventSlug(null);
                                setPublicBoiadaSlug(null);
                                setPublicProfileSlug(peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                                window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

c = c.split(targetStr).join(replaceStr);

const targetStr2 = `setSelectedPeaoProfile(data[0]);
                        window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

const replaceStr2 = `setSelectedPeaoProfile(data[0]);
                        setPublicEventSlug(null);
                        setPublicBoiadaSlug(null);
                        setPublicProfileSlug(peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                        window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

c = c.split(targetStr2).join(replaceStr2);

fs.writeFileSync(file, c);
console.log('Fixed routing state!');
