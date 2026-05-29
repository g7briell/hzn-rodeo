const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /<div style=\{\{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0\.85rem' \}\}>\s*<span>\{peao\.cidade\}<\/span>\s*<\/div>/g;
const replacement = `<div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <span>{peao.cidade}</span>
                        <span style={{ color: '#E11D48', fontWeight: 'bold' }}>{peao.score !== undefined ? peao.score : (peao.total !== undefined ? peao.total : 0)} pts</span>
                      </div>`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Points patched!');
