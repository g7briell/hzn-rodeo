const fs = require('fs');
let content = fs.readFileSync('portal/src/App.tsx', 'utf8');
content = content.replace(/"https:\/\/images\.unsplash\.com\/photo-1535713875002[^"]*"/g, '"/novacontasfoto.jpg"');
fs.writeFileSync('portal/src/App.tsx', content);
