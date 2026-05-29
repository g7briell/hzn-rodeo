const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state
content = content.replace(
  'const [publicBoiadaSlug, setPublicBoiadaSlug] = useState<string | null>(null);',
  'const [publicBoiadaSlug, setPublicBoiadaSlug] = useState<string | null>(null);\n  const [publicEventSlug, setPublicEventSlug] = useState<string | null>(null);'
);

// 2. Set publicEventSlug inside the URL router
const routeRouterOld = `        if (path.startsWith('/evento/')) {
          const slug = path.split('/evento/')[1].replace(/[^a-z0-9-]/g, '');
          const match = eventosOficiais.find(ev => (ev.nome && ev.nome.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9-]/g, '') === slug) || (ev.nome && ev.nome.replace(/\\s+/g, '').toLowerCase() === slug));
          if (match) {
            setSelectedEvent(match);
            setCurrentTab('explore');
          }
        } else if (path.startsWith('/perfil/')) {`;

const routeRouterNew = `        if (path.startsWith('/evento/')) {
          const slug = path.split('/evento/')[1].replace(/[^a-z0-9-]/g, '');
          const match = eventosOficiais.find(ev => (ev.nome && ev.nome.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9-]/g, '') === slug) || (ev.nome && ev.nome.replace(/\\s+/g, '').toLowerCase() === slug));
          if (match) {
            setPublicEventSlug(slug);
            setSelectedEvent(match);
            setCurrentTab('explore');
          }
        } else if (path.startsWith('/perfil/')) {`;
content = content.replace(routeRouterOld, routeRouterNew);

// reset publicEventSlug on other routes
content = content.replace('setPublicBoiadaSlug(null);', 'setPublicBoiadaSlug(null);\n            setPublicEventSlug(null);');
content = content.replace('setPublicBoiada(null);', 'setPublicBoiada(null);\n          setPublicEventSlug(null);');

// update "Voltar para Eventos" to reset publicEventSlug if it exists
content = content.replace(`setSelectedEvent(null); setSelectedRankingDay('Geral'); }`, `setSelectedEvent(null); setSelectedRankingDay('Geral'); setPublicEventSlug(null); }`);

// 3. Layout checks
const sidebarRegex = /<aside className={`sidebar \$\{isSidebarOpen \? 'open' : ''\}`}>\s*<div className="sidebar-header">/;
content = content.replace(sidebarRegex, `{!publicEventSlug && (\n        <aside className={\`sidebar \${isSidebarOpen ? 'open' : ''}\`}>\n          <div className="sidebar-header">`);

const sidebarEndRegex = /<div className="sidebar-overlay" onClick=\{\(\) => setIsSidebarOpen\(false\)\}\><\/div>\s*\)\}/;
content = content.replace(sidebarEndRegex, `<div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>\n      )}\n      )}`);

const mainRegex = /<main className="main-content">/;
content = content.replace(mainRegex, `<main className="main-content" style={ publicEventSlug ? { marginLeft: 0 } : {} }>`);

const headerRegex = /<header className="header">/;
content = content.replace(headerRegex, `{!publicEventSlug ? (\n          <header className="header">`);

const headerEndRegex = /<button className="btn btn-primary" onClick=\{\(\) => setIsLoginModalOpen\(true\)\}>ENTRAR<\/button>\s*<\/div>\s*<\/header>/;
content = content.replace(headerEndRegex, `<button className="btn btn-primary" onClick={() => setIsLoginModalOpen(true)}>ENTRAR</button>\n              </div>\n            </header>\n        ) : (\n          <header className="header" style={{ left: 0, width: '100%' }}>\n            <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>RODEO<span className="text-primary">APP</span></div>\n            <div className="header-buttons">\n              <button className="btn btn-primary" onClick={() => { navigateTo('/'); setPublicEventSlug(null); setSelectedEvent(null); }}>Ir para o Portal</button>\n            </div>\n          </header>\n        )}`);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx patched for Standalone Event View!');
