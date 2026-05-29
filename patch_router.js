const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /const path = window\.location\.pathname;\s*if \(path\.startsWith\('\/perfil\/'\)\) \{/g;
const replacement = `const path = window.location.pathname;
        if (path.startsWith('/evento/')) {
          const slug = path.split('/evento/')[1].replace(/[^a-z0-9-]/g, '');
          const match = eventosOficiais.find(ev => (ev.nome && ev.nome.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9-]/g, '') === slug) || (ev.nome && ev.nome.replace(/\\s+/g, '').toLowerCase() === slug));
          if (match) {
            setPublicEventSlug(slug);
            setSelectedEvent(match);
            setCurrentTab('explore');
          }
        } else if (path.startsWith('/perfil/')) {`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Router patched successfully!');
