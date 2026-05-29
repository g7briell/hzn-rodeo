const fs = require('fs');
const file = 'client_app/renderer.js';
let c = fs.readFileSync(file, 'utf8');

// Replace >${day}< with >${day.replace(/DIA/gi, 'ROUND')}<
c = c.replace(/>\$\{day\}</g, '>${day.replace(/DIA/gi, "ROUND")}<');

// Replace >${n.dia}< with >${(n.dia || '').replace(/DIA/gi, 'ROUND')}<
c = c.replace(/>\$\{n\.dia\}</g, '>${(n.dia || "").replace(/DIA/gi, "ROUND")}<');

fs.writeFileSync(file, c);
console.log('Patched UI strings in renderer.js!');
