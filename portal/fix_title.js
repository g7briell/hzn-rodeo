const fs = require('fs');
const file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/title="Competidor Verificado"/g, 'aria-label="Competidor Verificado"');
fs.writeFileSync(file, c);
console.log('Fixed SVG title');
