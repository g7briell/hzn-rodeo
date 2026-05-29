const fs = require('fs');
let r = fs.readFileSync('client_app/renderer.js', 'utf8');

const formatSideStr = `window.formatSide = function(s) {
  if (!s) return s;
  if (typeof s !== 'string') return s;
  const l = s.toLowerCase();
  if (l === 'direito' || l === 'd') return 'Certo (C)';
  if (l === 'esquerdo' || l === 'e') return 'Errado (E)';
  return s.toUpperCase();
};\n`;

if (!r.includes('window.formatSide')) {
  r = formatSideStr + r;
}

r = r.replace(/>\$\{lado\}<\/td>/g, '>${window.formatSide(lado)}</td>');
r = r.replace(/\$\{lado \? `\(\$\{lado\}\)` : ''\}/g, '${lado ? `(${window.formatSide(lado)})` : ``}');
fs.writeFileSync('client_app/renderer.js', r);
