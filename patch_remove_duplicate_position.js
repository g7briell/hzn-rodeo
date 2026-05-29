const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

// Replace using regex that accounts for the encoding anomaly
c = c.replace(/<div style=\{\{\s*textAlign:\s*'right'\s*\}\}>\s*<div style=\{\{\s*fontWeight:\s*'900',\s*color:\s*'#E11D48',\s*fontSize:\s*'1\.2rem'\s*\}\}>\{hist\.posicao\}[^L]*Lugar<\/div>\s*<\/div>/g, '');

fs.writeFileSync(file, c);
console.log('Removed duplicate right side position block!');
