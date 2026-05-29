const fs = require('fs');
const file = 'portal/src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

const target1 = `                                  if (!data || data.length === 0) return alert("Perfil não criado.");
                                  
                                  setSelectedPeaoProfile(data[0]);`;

const replacement1 = `                                  if (!data || data.length === 0) return alert("Perfil não criado.");
                                  
                                  const historico: any[] = [];
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
                                  });
                                  
                                  setSelectedPeaoProfile({...data[0], historico});`;

const target2 = `                          if (!data || data.length === 0) return alert("Perfil não encontrado.");
                          setSelectedPeaoProfile(data[0]);`;

const replacement2 = `                          if (!data || data.length === 0) return alert("Perfil não encontrado.");
                          
                          const historico: any[] = [];
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
                          });
                          
                          setSelectedPeaoProfile({...data[0], historico});`;

c = c.replace(target1, replacement1);
c = c.replace(target2, replacement2);

fs.writeFileSync(file, c);
console.log('Patched historico calculation!');
