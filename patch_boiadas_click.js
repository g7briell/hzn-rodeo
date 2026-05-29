const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'portal', 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

const oldBoiadasBlock = `                            selectedEvent.detalhes.boiadas.map((b: any, idx: number) => (
                                <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontWeight: 'bold' }}>
                                  {b.nome}
                                </div>
                              ))`;

const newBoiadasBlock = `                            selectedEvent.detalhes.boiadas.map((b: any, idx: number) => (
                                <div key={idx} 
                                   onClick={async () => {
                                      setIsPublicProfileLoading(true);
                                      const { data } = await supabase.from('boiadas_oficiais').select('*').eq('status', 'aprovado');
                                      setIsPublicProfileLoading(false);
                                      if (data) {
                                          let match = data.find(db => slugify(db.nome) === slugify(b.nome));
                                          if (!match && b.touros && b.touros.length > 0) {
                                              match = data.find(db => {
                                                  if (!db.touros) return false;
                                                  const dbBulls = db.touros.map((t) => slugify(t));
                                                  let matches = 0;
                                                  b.touros.forEach((t) => { if (dbBulls.includes(slugify(t))) matches++; });
                                                  return matches >= 2;
                                              });
                                          }
                                          if (match) {
                                              window.history.pushState({}, '', '/boiada/' + slugify(match.nome));
                                              setPublicBoiadaSlug(slugify(match.nome));
                                              setPublicProfileSlug(null);
                                              setCurrentTab('explore');
                                              setSelectedEvent(null);
                                              setPublicBoiada(match);
                                          } else {
                                              alert("Esta boiada não possui um perfil público verificado no portal.");
                                          }
                                      }
                                   }}
                                   style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                   className="hover:bg-white/5 transition-colors"
                                >
                                  {b.nome}
                                </div>
                              ))`;

if (content.includes(oldBoiadasBlock)) {
    content = content.replace(oldBoiadasBlock, newBoiadasBlock);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched successfully.");
} else {
    console.log("Could not find the block to patch.");
}
