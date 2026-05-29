const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex1 = /setSelectedPeaoProfile\(data\[0\]\);\s*window\.history\.pushState\(\{\}, '', '\/perfil\/' \+ peao\.nome\.trim\(\)\.toLowerCase\(\)\.replace\(\/\\\\s\+\/g, ''\)\);/g;

const replacement1 = `setSelectedPeaoProfile(data[0]);
                                setPublicEventSlug(null);
                                setPublicBoiadaSlug(null);
                                setPublicProfileSlug(peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));
                                window.history.pushState({}, '', '/perfil/' + peao.nome.trim().toLowerCase().replace(/\\s+/g, ''));`;

content = content.replace(regex1, replacement1);

// Replace the history pushState logic in the peao click (when doing historico)
const regex2 = /setSelectedPeaoProfile\(\{ \.\.\.profileData, historico \}\);\s*const slug = peao\.nome\.trim\(\)\.toLowerCase\(\)\.replace\(\/\\\\s\+\/g, ''\);\s*window\.history\.pushState\(\{\}, '', '\/perfil\/' \+ slug\);/g;
const replacement2 = `setSelectedPeaoProfile({ ...profileData, historico });
                                          const slug = peao.nome.trim().toLowerCase().replace(/\\s+/g, '');
                                          setPublicEventSlug(null);
                                          setPublicBoiadaSlug(null);
                                          setPublicProfileSlug(slug);
                                          window.history.pushState({}, '', '/perfil/' + slug);`;
                                          
content = content.replace(regex2, replacement2);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx patched for profile navigation!');
