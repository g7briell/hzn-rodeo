const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add selectedRankingDay state
content = content.replace(
  'const [selectedEvent, setSelectedEvent] = useState<any>(null);',
  'const [selectedEvent, setSelectedEvent] = useState<any>(null);\n  const [selectedRankingDay, setSelectedRankingDay] = useState<string>(\'Geral\');'
);

// 2. Fix Routing
const routeCheckOld = `        const path = window.location.pathname;
        if (path.startsWith('/perfil/')) {`;
const routeCheckNew = `        const path = window.location.pathname;
        if (path.startsWith('/evento/')) {
          const slug = path.split('/evento/')[1].replace(/[^a-z0-9-]/g, '');
          const match = eventosOficiais.find(ev => (ev.nome && ev.nome.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9-]/g, '') === slug) || (ev.nome && ev.nome.replace(/\\s+/g, '').toLowerCase() === slug));
          if (match) {
            setSelectedEvent(match);
            setCurrentTab('explore');
          }
        } else if (path.startsWith('/perfil/')) {`;
content = content.replace(routeCheckOld, routeCheckNew);

// 3. Update onClick for selecting an event in the list
const eventCardClickOld = `onClick={() => setSelectedEvent(ev)}`;
const eventCardClickNew = `onClick={() => { window.history.pushState({}, '', '/evento/' + slugify(ev.nome)); setSelectedEvent(ev); setSelectedRankingDay('Geral'); }}`;
content = content.replace(eventCardClickOld, eventCardClickNew);

// 4. Update Back button for Event
const backBtnOld = `onClick={() => setSelectedEvent(null)}`;
const backBtnNew = `onClick={() => { window.history.pushState({}, '', '/'); setSelectedEvent(null); setSelectedRankingDay('Geral'); }}`;
content = content.replace(backBtnOld, backBtnNew);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx patched for Routing!');
