const fs = require('fs');

const formatSideStr = `const formatSide = (s: any) => {
  if (!s) return s;
  if (typeof s !== 'string') return s;
  const l = s.toLowerCase();
  if (l === 'direito' || l === 'd') return 'Certo (C)';
  if (l === 'esquerdo' || l === 'e') return 'Errado (E)';
  return s;
};`;

// Patch portal/src/App.tsx
let p = fs.readFileSync('portal/src/App.tsx', 'utf8');
if (!p.includes('formatSide =')) {
  p = p.replace(/function App\(\) \{/, formatSideStr + '\n\nfunction App() {');
}
p = p.replace(/Lado \{side\}/g, 'Lado {formatSide(side)}');
p = p.replace(/bull\.lado === 'E' \? 'E' : 'C'/g, 'formatSide(bull.lado)');
p = p.replace(/>\{bull\.lado\}<\/span>/g, '>{formatSide(bull.lado)}</span>');
p = p.replace(/<option value="Esquerdo">Esquerdo<\/option>/g, '<option value="Esquerdo">Errado (E)</option>');
p = p.replace(/<option value="Direito">Direito<\/option>/g, '<option value="Direito">Certo (C)</option>');
fs.writeFileSync('portal/src/App.tsx', p);

// Patch src/app/admin/page.tsx
let a = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
if (!a.includes('formatSide =')) {
  a = a.replace(/export default function AdminPage/, formatSideStr + '\n\nexport default function AdminPage');
}
a = a.replace(/\{details\.lado \|\| b\.lados\[t\]\}/g, '{formatSide(details.lado || b.lados[t])}');
fs.writeFileSync('src/app/admin/page.tsx', a);
