const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for verified CPFs
content = content.replace(
  `const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');`,
  `const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');\n  const [verifiedCpfs, setVerifiedCpfs] = useState<Set<string>>(new Set());`
);

// 2. Add useEffect for fetching verified CPFs
const useEffectRegex = /useEffect\(\(\) => \{\s*const handleRouting = async \(\) => \{/;
const newUseEffect = `useEffect(() => {
    if (selectedEvent?.detalhes?.ranking) {
       const cpfs = selectedEvent.detalhes.ranking.map((p: any) => p.cpf ? p.cpf.replace(/\\D/g, '') : null).filter(Boolean);
       if (cpfs.length > 0) {
          supabase.from('perfis_portal').select('cpf').in('cpf', cpfs).then(({data}) => {
             if (data) {
                setVerifiedCpfs(new Set(data.map(d => d.cpf)));
             }
          });
       }
    } else {
       setVerifiedCpfs(new Set());
    }
  }, [selectedEvent]);\n\n  useEffect(() => {\n    const handleRouting = async () => {`;
content = content.replace(useEffectRegex, newUseEffect);

// 3. SVG for Verified Badge
const verifiedBadgeSVG = `
{peao.cpf && verifiedCpfs.has(peao.cpf.replace(/\\D/g, '')) && (
  <svg title="Competidor Verificado" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '6px', verticalAlign: 'text-bottom', display: 'inline-block' }}>
    <path d="M11.517 1.408a.633.633 0 0 1 .966 0l1.79 2.148c.204.245.534.343.844.25l2.705-.81a.633.633 0 0 1 .803.582l.235 2.81c.026.319.23.593.524.704l2.639.998a.633.633 0 0 1 .386.915l-1.346 2.457a.89.89 0 0 0 0 .874l1.346 2.457a.633.633 0 0 1-.386.915l-2.639.998a.89.89 0 0 0-.524.704l-.235 2.81a.633.633 0 0 1-.803.582l-2.705-.81a.89.89 0 0 0-.844.25l-1.79 2.148a.633.633 0 0 1-.966 0l-1.79-2.148a.89.89 0 0 0-.844-.25l-2.705.81a.633.633 0 0 1-.803-.582l-.235-2.81a.89.89 0 0 0-.524-.704l-2.639-.998a.633.633 0 0 1-.386-.915L3.13 12.437a.89.89 0 0 0 0-.874L1.784 9.106a.633.633 0 0 1 .386-.915l2.639-.998a.89.89 0 0 0 .524-.704l.235-2.81a.633.633 0 0 1 .803-.582l2.705.81a.89.89 0 0 0 .844-.25l1.79-2.148z" fill="#3b82f6"/>
    <path d="M10.233 15.656a.8.8 0 0 1-.566-.234l-3.3-3.3a.8.8 0 0 1 1.132-1.132l2.734 2.734 5.734-5.734a.8.8 0 0 1 1.132 1.132l-6.3 6.3a.8.8 0 0 1-.566.234z" fill="#ffffff"/>
  </svg>
)}
`;

// 4. Update the name render in Ranking
const rankingNameRegex = /\{peao\.nome\}\s*<\/span>\s*<\/div>\s*<span style=\{\{ color: '#E11D48'/g;
const newRankingName = `{peao.nome}\n                            ${verifiedBadgeSVG.trim()}\n                            </span>\n                          </div>\n                          <span style={{ color: '#E11D48'`;
content = content.replace(rankingNameRegex, newRankingName);

// 5. Update the name render in Competidores Tab
const compNameRegex = /<h4 style=\{\{ fontSize: '1\.2rem', margin: 0 \}\}>\{peao\.nome\}<\/h4>/g;
const newCompName = `<h4 style={{ fontSize: '1.2rem', margin: 0 }}>{peao.nome} ${verifiedBadgeSVG.trim()}</h4>`;
content = content.replace(compNameRegex, newCompName);

fs.writeFileSync(file, content, 'utf8');
console.log('App.tsx patched with verified badge!');
