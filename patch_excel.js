const fs = require('fs');

let m = fs.readFileSync('client_app/main.js', 'utf8');
const formatStr = `(function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })`;

m = m.replace(/bull\.lado \|\| ''/g, formatStr + `(bull.lado)`);
m = m.replace(/b\.lado \|\| ''/g, formatStr + `(b.lado)`);
m = m.replace(/b\.lado \? b\.lado\.toUpperCase\(\) : ''/g, formatStr + `(b.lado)`);
fs.writeFileSync('client_app/main.js', m);

let r = fs.readFileSync('client_app/renderer.js', 'utf8');
r = r.replace(/lado === 'C' \? 'CERTO' : \(lado === 'E' \? 'ERRADO' : lado\)/g, `lado === 'D' || lado === 'Direito' || lado === 'C' || lado === 'CERTO' ? 'CERTO (C)' : (lado === 'E' || lado === 'Esquerdo' || lado === 'ERRADO' ? 'ERRADO (E)' : lado)`);
fs.writeFileSync('client_app/renderer.js', r);
