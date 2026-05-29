const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

// The exact string to replace (first occurrence)
const target = `                                const historico: any[] = [];
                                const cleanCpfData = data[0].cpf ? data[0].cpf.replace(/\\D/g, '') : '';
                                eventosOficiais.forEach(ev => {
                                  const rankIndex = ev.detalhes?.ranking?.findIndex((r: any) => {
                                    const rCpf = r.cpf ? r.cpf.replace(/\\D/g, '') : '';
                                    return rCpf === cleanCpfData;
                                  });
                                  if (rankIndex !== undefined && rankIndex >= 0) {
                                    historico.push({
                                      eventoNome: ev.nome,
                                      cidade: ev.cidade,
                                      posicao: rankIndex + 1
                                    });
                                  }
                                });`;

const replacement = `                                const historico: any[] = [];
                                const cleanCpfData = data[0].cpf ? data[0].cpf.replace(/\\D/g, '') : '';
                                eventosOficiais.forEach(ev => {
                                  if (ev.detalhes?.ranking) {
                                      const rankingSorted = ev.detalhes.ranking.map((peao: any) => {
                                          const peaoNotas = (ev.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                                          let total = 0;
                                          peaoNotas.forEach((n: any) => {
                                              if (n.totalPeao > 0 && n.tempo >= 8) total += (n.totalPeao + n.totalTouro);
                                          });
                                          return { ...peao, score: total };
                                      }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
                                      
                                      const rankIndex = rankingSorted.findIndex((r: any) => {
                                        const rCpf = r.cpf ? r.cpf.replace(/\\D/g, '') : '';
                                        return rCpf === cleanCpfData;
                                      });
                                      
                                      if (rankIndex !== -1) {
                                        historico.push({
                                          eventoNome: ev.nome,
                                          cidade: ev.cidade,
                                          posicao: rankIndex + 1
                                        });
                                      }
                                  }
                                });`;

c = c.replace(target, replacement);

// Second occurrence (cleanCpf instead of cleanCpfData)
const target2 = `                        const historico: any[] = [];
                        const cleanCpf = data[0].cpf ? data[0].cpf.replace(/\\D/g, '') : '';
                        eventosOficiais.forEach(ev => {
                          const rankIndex = ev.detalhes?.ranking?.findIndex((r: any) => {
                            const rCpf = r.cpf ? r.cpf.replace(/\\D/g, '') : '';
                            return rCpf === cleanCpf;
                          });
                          if (rankIndex !== undefined && rankIndex >= 0) {
                            historico.push({
                              eventoNome: ev.nome,
                              cidade: ev.cidade,
                              posicao: rankIndex + 1
                            });
                          }
                        });`;

const replacement2 = `                        const historico: any[] = [];
                        const cleanCpf = data[0].cpf ? data[0].cpf.replace(/\\D/g, '') : '';
                        eventosOficiais.forEach(ev => {
                          if (ev.detalhes?.ranking) {
                              const rankingSorted = ev.detalhes.ranking.map((peao: any) => {
                                  const peaoNotas = (ev.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                                  let total = 0;
                                  peaoNotas.forEach((n: any) => {
                                      if (n.totalPeao > 0 && n.tempo >= 8) total += (n.totalPeao + n.totalTouro);
                                  });
                                  return { ...peao, score: total };
                              }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
                              
                              const rankIndex = rankingSorted.findIndex((r: any) => {
                                const rCpf = r.cpf ? r.cpf.replace(/\\D/g, '') : '';
                                return rCpf === cleanCpf;
                              });
                              
                              if (rankIndex !== -1) {
                                historico.push({
                                  eventoNome: ev.nome,
                                  cidade: ev.cidade,
                                  posicao: rankIndex + 1
                                });
                              }
                          }
                        });`;

c = c.replace(target2, replacement2);

fs.writeFileSync(file, c);
console.log('Patched sorted historico calculation!');
