import { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './supabaseClient';
import AdminDashboard from './AdminDashboard';


const formatSide = (s: any) => {
  if (!s) return s;
  if (typeof s !== 'string') return s;
  const l = s.toLowerCase();
  if (l === 'direito' || l === 'd') return 'Certo (C)';
  if (l === 'esquerdo' || l === 'e') return 'Errado (E)';
  return s;
};

const formatBirthDate = (dateStr: any) => {
  if (!dateStr) return 'Não informado';
  const cleanDate = dateStr.split('T')[0];
  if (cleanDate.includes('-')) {
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

function App() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Register States
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regRg, setRegRg] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [isAppUser, setIsAppUser] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp'>('credentials');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Auth and Profile States
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const isAdmin = user?.email === 'g7briellrms@gmail.com';
  const [userBio, setUserBio] = useState('');
  const [userFoto, setUserFoto] = useState('');
  const [currentTab, setCurrentTab] = useState<'home' | 'explore' | 'feed' | 'boiadas' | 'profile' | 'minha-boiada' | 'dashboard'>('home');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [eventosOficiais, setEventosOficiais] = useState<any[]>([]);
  const [patrocinios, setPatrocinios] = useState<any[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedPeaoProfile, setSelectedPeaoProfile] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isBoiadasLoading, setIsBoiadasLoading] = useState(false);

  // Inicializar roteamento
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/') {
        setSelectedPeaoProfile(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Tropeiro Boiada States
  const [tropeiroBoiada, setTropeiroBoiada] = useState<any>(null);
  const [isTropeiroBoiadaLoading, setIsTropeiroBoiadaLoading] = useState(false);
  const [isEditBullModalOpen, setIsEditBullModalOpen] = useState(false);
  const [editingBullName, setEditingBullName] = useState<string | null>(null);
  const [bullForm, setBullForm] = useState({
    nome: '',
    lado: 'Esquerdo',
    foto: '',
    video_url: ''
  });
  const [activeYoutubeVideoId, setActiveYoutubeVideoId] = useState<string | null>(null);
  const [isCreatingBoiada, setIsCreatingBoiada] = useState(false);
  const [bulkBullsText, setBulkBullsText] = useState('');
  const [newBoiadaCiaName, setNewBoiadaCiaName] = useState('');

  // AI News States
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsRound, setNewsRound] = useState('');
  const [isGeneratingNews, setIsGeneratingNews] = useState(false);

  // Public Profile States
  const [publicProfileSlug, setPublicProfileSlug] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [publicProfileBio, setPublicProfileBio] = useState('');
  const [publicProfileFoto, setPublicProfileFoto] = useState('');
  const [isPublicProfileLoading, setIsPublicProfileLoading] = useState(false);

  // Public Boiada States
  const [publicBoiadaSlug, setPublicBoiadaSlug] = useState<string | null>(null);
  const [publicEventSlug, setPublicEventSlug] = useState<string | null>(null);
  const [publicNewsId, setPublicNewsId] = useState<string | null>(null);
  const [publicNews, setPublicNews] = useState<any>(null);
  const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');
  const [verifiedCpfs, setVerifiedCpfs] = useState<Set<string>>(new Set());
  const [eventTab, setEventTab] = useState<'home'|'ranking'|'sorteios'|'competidores'|'boiadas'|'noticias'|'midia'>('home');
  const [selectedSorteioDay, setSelectedSorteioDay] = useState<string>('');
  const [publicBoiada, setPublicBoiada] = useState<any>(null);
  const [isPublicBoiadaLoading, setIsPublicBoiadaLoading] = useState(false);
  const [publicRankingModal, setPublicRankingModal] = useState<any>(null);
  const [selectedBullProfile, setSelectedBullProfile] = useState<any>(null);
  const [selectedBullStats, setSelectedBullStats] = useState<any>(null);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '');
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleBullClick = (bullName: string, details: any, boiadaNome: string) => {
    const runs: any[] = [];
    let totalScore = 0;
    let totalOuts = 0;
    let fallsCount = 0;
    let fallScoreSum = 0;

    eventosOficiais.forEach(ev => {
      const notas = ev.detalhes?.notas || [];
      notas.forEach((n: any) => {
        if (n.touro && n.touro.toLowerCase().trim() === bullName.toLowerCase().trim()) {
          const score = typeof n.totalTouro === 'number' ? n.totalTouro : (typeof n.j1_touro === 'number' && typeof n.j2_touro === 'number' ? n.j1_touro + n.j2_touro : 0);
          
          const isFall = typeof n.tempo === 'number' && n.tempo < 8;
          if (score > 0) {
            totalOuts++;
            totalScore += score;
            if (isFall) {
              fallsCount++;
              fallScoreSum += score;
            }
          }

          runs.push({
            eventoNome: ev.nome,
            peao: n.peao,
            tempo: n.tempo,
            score: score,
            dia: n.dia,
            status: isFall ? 'Queda' : 'Parada'
          });
        }
      });
    });

    let currentEvent = null;
    for (const ev of eventosOficiais) {
      const sorteios = ev.detalhes?.sorteios || [];
      let foundInEvent = false;
      for (const s of sorteios) {
        const bullsInSorteio = s.bulls || [];
        if (bullsInSorteio.some((b: any) => b.nome && b.nome.toLowerCase().trim() === bullName.toLowerCase().trim())) {
          currentEvent = ev.nome;
          foundInEvent = true;
          break;
        }
      }
      if (foundInEvent) break;
    }

    const stats = {
      outs: totalOuts,
      mediaGeral: totalOuts > 0 ? (totalScore / totalOuts).toFixed(2) : '0.00',
      mediaQueda: fallsCount > 0 ? (fallScoreSum / fallsCount).toFixed(2) : '0.00',
      taxaQueda: totalOuts > 0 ? ((fallsCount / totalOuts) * 100).toFixed(0) + '%' : '0%',
      currentEvent: currentEvent || 'Nenhum evento agendado para esta semana',
      runs: runs
    };

    setSelectedBullProfile({
      nome: bullName,
      cia: boiadaNome,
      foto: details.foto || "/tourosfoto.jpg",
      video_url: details.video_url || ""
    });
    setSelectedBullStats(stats);
  };

  const getPeaoStats = (peaoName: string, peaoCpf?: string) => {
    let paradas = 0;
    let notas90Plus = 0;
    let totalOuts = 0;
    const runs: any[] = [];
    const cleanCpf = peaoCpf ? peaoCpf.replace(/\D/g, '') : '';
    
    // Collect all names associated with this CPF in event rankings to handle name spelling variations
    const associatedNames = new Set<string>([peaoName.toLowerCase().trim()]);
    if (cleanCpf) {
      eventosOficiais.forEach(ev => {
        const ranking = ev.detalhes?.ranking || [];
        ranking.forEach((r: any) => {
          if (r.cpf && r.cpf.replace(/\D/g, '') === cleanCpf) {
            if (r.nome) associatedNames.add(r.nome.toLowerCase().trim());
          }
        });
        const notas = ev.detalhes?.notes || ev.detalhes?.notas || [];
        notas.forEach((n: any) => {
          if (n.cpf && n.cpf.replace(/\D/g, '') === cleanCpf) {
            if (n.peao) associatedNames.add(n.peao.toLowerCase().trim());
          }
        });
      });
    }

    eventosOficiais.forEach(ev => {
      const notas = ev.detalhes?.notas || [];
      notas.forEach((n: any) => {
        const matchesName = n.peao && associatedNames.has(n.peao.toLowerCase().trim());
        const matchesCpf = cleanCpf && n.cpf && (n.cpf.replace(/\D/g, '') === cleanCpf);
        
        if (matchesName || matchesCpf) {
          const runScore = (typeof n.totalPeao === 'number' ? n.totalPeao : 0) + (typeof n.totalTouro === 'number' ? n.totalTouro : 0);
          if (runScore > 0) {
            totalOuts++;
            const isParada = typeof n.tempo === 'number' && n.tempo >= 8 && n.totalPeao > 0;
            
            if (isParada) {
              paradas++;
              if (runScore >= 90) {
                notas90Plus++;
              }
            }

            runs.push({
              eventoNome: ev.nome,
              touro: n.touro,
              tempo: n.tempo,
              score: runScore,
              dia: n.dia,
              status: isParada ? 'Parada' : 'Queda'
            });
          }
        }
      });
    });

    return {
      outs: totalOuts,
      paradas,
      notas90Plus,
      runs
    };
  };

  const fetchUserProfile = async (email: string) => {
    try {
      const { data } = await supabase
        .from('perfis_portal')
        .select('*')
        .ilike('email', email.trim())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const profile = data[0];
        
        // Dynamic check in licencas to override veio_do_app_desktop status
        try {
          const { data: licenseData } = await supabase
            .from('licencas')
            .select('email')
            .ilike('email', email.trim())
            .maybeSingle();

          if (licenseData && licenseData.email) {
            profile.veio_do_app_desktop = true;
          }
        } catch (err) {
          console.error('Erro ao buscar licença no Supabase:', err);
        }

        setUserProfile(profile);
        // Load bio and foto from Supabase
        setUserBio(profile.bio || '');
        setUserFoto(profile.foto || '');
      }
    } catch (err) {
      console.error('Error fetching global events:', err);
    }
  };

  // Checar URL inicial aps carregar eventos
  useEffect(() => {
    if (eventosOficiais.length > 0) {
      const path = window.location.pathname;
      if (path.startsWith('/perfil/')) {
        const slug = path.split('/perfil/')[1].replace(/-/g, '').toLowerCase();
        
        // Buscar perfil pelo slug do nome
        supabase.from('perfis_portal').select('*').then(({ data }) => {
          if (data) {
            const matchedProfile = data.find((p: any) => p.nome && p.nome.replace(/\s+/g, '').toLowerCase() === slug);
            if (matchedProfile) {
              // Calcular historico
              const historico: any[] = [];
              const cleanCpf = matchedProfile.cpf ? matchedProfile.cpf.replace(/\D/g, '') : '';
              
              eventosOficiais.forEach(ev => {
                const rankIndex = ev.detalhes?.ranking?.findIndex((r: any) => {
                  const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
                  return rCpf === cleanCpf;
                });
                if (rankIndex !== undefined && rankIndex >= 0) {
                  historico.push({
                    eventoNome: ev.nome,
                    cidade: ev.local || ev.cidade,
                    posicao: rankIndex + 1
                  });
                }
              });
              
              setSelectedPeaoProfile({ ...matchedProfile, historico });
              setCurrentTab('explore'); // ir para aba Eventos (antiga Explore)
            }
          }
        });
      }
    }
  }, [eventosOficiais]);

  const fetchBoiadas = async () => {
    setIsBoiadasLoading(true);
    try {
      const { data, error } = await supabase
        .from('boiadas_oficiais')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBoiadas(data);
      } else {
        // Fallback boiadas since DB starts empty
        setBoiadas([
          {
            id: 'mock-1',
            nome: 'CIA Rancho de Prata',
            lados: {
              'Corte Seco': 'Esquerdo',
              'Boca Quente': 'Direito',
              'Madrugada': 'Esquerdo',
              'Cometa': 'Direito'
            }
          },
          {
            id: 'mock-2',
            nome: 'CIA Terremoto',
            lados: {
              'Tsunami': 'Direito',
              'Vulcão': 'Esquerdo',
              'Terremoto': 'Direito',
              'Vendaval': 'Esquerdo'
            }
          },
          {
            id: 'mock-3',
            nome: 'CIA G04',
            lados: {
              'Faraó': 'Esquerdo',
              'Império': 'Direito',
              'Gladiador': 'Esquerdo'
            }
          },
          {
            id: 'mock-4',
            nome: 'CIA Califórnia',
            lados: {
              'Black Jack': 'Direito',
              'Pé de Pano': 'Esquerdo',
              'Destruidor': 'Direito'
            }
          }
        ]);
      }
    } catch (err) {
      console.error('Erro ao buscar boiadas:', err);
      setBoiadas([
        {
          id: 'mock-1',
          nome: 'CIA Rancho de Prata',
          lados: {
            'Corte Seco': 'Esquerdo',
            'Boca Quente': 'Direito',
            'Madrugada': 'Esquerdo'
          }
        },
        {
          id: 'mock-2',
          nome: 'CIA Terremoto',
          lados: {
            'Tsunami': 'Direito',
            'Vulcão': 'Esquerdo'
          }
        }
      ]);
    } finally {
      setIsBoiadasLoading(false);
    }
  };

  const fetchPatrocinios = async () => {
    try {
      const { data } = await supabase
        .from('patrocinios')
        .select('*')
        .eq('status', 'ativo');
      if (data) {
        setPatrocinios(data);
      }
    } catch (err) {
      console.error('Erro ao buscar patrocinios:', err);
    }
  };

  const fetchEventosOficiais = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos_oficiais')
        .select('*')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const sortedData = [...data].sort((a, b) => {
          const confA = (typeof a.detalhes === 'string' ? JSON.parse(a.detalhes) : (a.detalhes || {})).portalConfig || {};
          const confB = (typeof b.detalhes === 'string' ? JSON.parse(b.detalhes) : (b.detalhes || {})).portalConfig || {};
          const orderA = typeof confA.ordem === 'number' ? confA.ordem : 999;
          const orderB = typeof confB.ordem === 'number' ? confB.ordem : 999;
          return orderA - orderB;
        });
        setEventosOficiais(sortedData);
      }
    } catch (err) {
      console.error('Erro ao buscar eventos oficiais:', err);
    }
  };

  const handleGenerateNews = async () => {
    if (!isAdmin) return alert("Apenas o Administrador do portal pode gerar notícias com IA.");
    if (!newsRound) return alert("Selecione o Round / Dia.");
    
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('hzn_gemini_api_key');
    if (!apiKey) {
      const inputKey = prompt("Chave de API do Gemini não encontrada no ambiente. Por favor, cole a sua chave API do Google AI Studio para prosseguir:");
      if (!inputKey) return;
      localStorage.setItem('hzn_gemini_api_key', inputKey.trim());
      apiKey = inputKey.trim();
    }

    setIsGeneratingNews(true);
    try {
      const notas = selectedEvent.detalhes?.notas || [];
      
      // Filter notes for the selected round
      const roundNotes = notas.filter((n: any) => 
        (n.status === 'ativa' || n.status === 'nota_baixa') && 
        n.dia === newsRound && 
        (typeof n.totalPeao === 'number' && n.totalPeao > 0) &&
        (typeof n.tempo === 'number' && n.tempo >= 8)
      );

      if (roundNotes.length === 0) {
        throw new Error(`Nenhuma montaria com nota registrada no ${newsRound.replace(/DIA/i, 'ROUND')} deste evento.`);
      }

      // Sort notes to find top scores
      const sortedNotes = [...roundNotes].sort((a: any, b: any) => {
        const scoreA = (a.totalPeao || 0) + (a.totalTouro || 0);
        const scoreB = (b.totalPeao || 0) + (b.totalTouro || 0);
        return scoreB - scoreA;
      });

      const winner = sortedNotes[0];
      const winnerScore = (winner.totalPeao || 0) + (winner.totalTouro || 0);
      
      // Find best company (CIA)
      const ciaScores: { [key: string]: { total: number, count: number } } = {};
      sortedNotes.forEach((n: any) => {
        const matchedCia = boiadas.find((b: any) => b.lados && Object.keys(b.lados).some(k => k.toLowerCase().trim() === n.touro?.toLowerCase().trim()));
        const ciaName = matchedCia ? matchedCia.nome : 'Desconhecida';
        const score = (n.totalPeao || 0) + (n.totalTouro || 0);
        if (!ciaScores[ciaName]) {
          ciaScores[ciaName] = { total: 0, count: 0 };
        }
        ciaScores[ciaName].total += score;
        ciaScores[ciaName].count += 1;
      });

      const eligibleCias = Object.keys(ciaScores).filter(name => name !== 'Desconhecida' && ciaScores[name].count >= 2);
      const bestCiaName = eligibleCias.sort((a, b) => {
        const avgA = ciaScores[a].total / ciaScores[a].count;
        const avgB = ciaScores[b].total / ciaScores[b].count;
        return avgB - avgA;
      })[0] || 'Nenhuma boiada com 2+ saídas';

      // Find runner ups (top 3 next best)
      const runnerUps = sortedNotes.slice(1, 4).map((n: any) => {
        const score = (n.totalPeao || 0) + (n.totalTouro || 0);
        return `${n.peao} (${score.toFixed(2)} pts)`;
      });

      const winnerCiaMatch = boiadas.find((b: any) => b.lados && Object.keys(b.lados).some(k => k.toLowerCase().trim() === winner.touro?.toLowerCase().trim()));
      const winnerCia = winnerCiaMatch ? winnerCiaMatch.nome : 'Desconhecida';

      const promptText = `Escreva uma notícia sobre a noite do rodeio a partir dos seguintes dados reais:
Evento: ${selectedEvent.nome}
Cidade: ${selectedEvent.local}
Rodada: ${newsRound.replace(/DIA/i, 'Round ')}
Vencedor: ${winner.peao} montando o touro ${winner.touro} da CIA ${winnerCia}, fazendo a pontuação de ${winnerScore.toFixed(2)} pontos.
Outras melhores notas: ${runnerUps.join(', ') || 'Nenhuma registrada'}
Melhor Companhia (CIA) de Boiada da noite: ${bestCiaName} (baseado na média de pontos das montarias da CIA).

Instruções importantes:
- Escreva em português do Brasil com tom jornalístico de esportes de rodeio profissional e entusiasmado.
- O título deve ser exatamente no formato: "[Vencedor] fez a maior nota do [Rodada] na cidade de [Cidade]!". Exemplo: "Gabriel Ramos fez a maior nota do Round 1 na cidade de Barretos!".
- O corpo do texto ('conteudo') deve ser longo, aprofundado e altamente detalhado (mínimo de 400 a 600 palavras), dividido em 4 a 5 parágrafos extensos. Não escreva textos curtos ou resumos.
- IMPORTANTE: Separe obrigatoriamente cada um dos parágrafos inserindo quebras de linha dupla (adicione duas quebras de linha '\\n\\n' no meio do texto do campo 'conteudo' no JSON para separar os blocos). Exemplo de formato: "Texto do parágrafo 1.\\n\\nTexto do parágrafo 2."
- No primeiro parágrafo, apresente com emoção o vencedor da noite, o touro, a CIA de boiada, a pontuação obtida e situe o leitor sobre a atmosfera eletrizante da arena na cidade de ${selectedEvent.local}.
- Nos parágrafos seguintes, descreva com detalhes a técnica da montaria, o nível de dificuldade do touro que exigiu o máximo do atleta, a reação vibrante do público presente e mencione o desempenho individual de cada uma das outras melhores notas citadas (mostrando a competitividade acirrada da rodada).
- Dedique um parágrafo completo para destacar o prestígio e a constância da CIA eleita como a melhor boiada da noite (${bestCiaName}), comentando sobre a qualidade genética dos touros apresentados por essa companhia.
- Conclua projetando os próximos rounds do evento e a expectativa para as finais.
- Responda apenas em formato JSON com os campos 'titulo' e 'conteudo'. Não adicione markdown \`\`\`json ou outra formatação antes/depois do JSON.`;

      const fetchPayload = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                titulo: { type: "STRING" },
                conteudo: { type: "STRING" }
              },
              required: ["titulo", "conteudo"]
            }
          }
        })
      };

      let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, fetchPayload);
      let primaryError = '';

      if (!response.ok) {
        try {
          const errBody = await response.json();
          primaryError = errBody?.error?.message || JSON.stringify(errBody);
        } catch (_) {
          primaryError = response.statusText || `Status ${response.status}`;
        }
        console.warn(`Gemini 2.5 Flash falhou. Erro: ${primaryError}. Tentando fallback para Gemini 2.0 Flash...`);
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, fetchPayload);
      }

      if (!response.ok) {
        let errorMsg = response.statusText || '';
        try {
          const errBody = await response.json();
          if (errBody?.error?.message) {
            errorMsg = errBody.error.message;
          } else {
            errorMsg = JSON.stringify(errBody);
          }
        } catch (_) {
          try {
            const errText = await response.text();
            if (errText) errorMsg = errText;
          } catch (__) {}
        }
        throw new Error(`Erro na API do Gemini. 2.5-flash: ${primaryError || 'Erro desconhecido'} | 2.0-flash (fallback): ${errorMsg}`);
      }

      const resJson = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Resposta inválida da IA.");

      const result = JSON.parse(rawText);

      // Save to Evento detalhes
      const currentNoticias = selectedEvent.detalhes?.noticias || [];
      const newArticle = {
        id: Date.now().toString(),
        dia: newsRound,
        titulo: result.titulo,
        conteudo: result.conteudo,
        status: 'pendente',
        created_at: new Date().toISOString()
      };

      const updatedDetalhes = {
        ...selectedEvent.detalhes,
        noticias: [newArticle, ...currentNoticias]
      };

      const { error } = await supabase
        .from('eventos_oficiais')
        .update({ detalhes: updatedDetalhes })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      // Update local state
      setSelectedEvent({ ...selectedEvent, detalhes: updatedDetalhes });
      // Update global events array to sync state
      setEventosOficiais(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, detalhes: updatedDetalhes } : ev));
      
      alert("Notícia gerada com sucesso e enviada para aprovação do Administrador no painel!");
      setShowNewsModal(false);
      setNewsRound('');
    } catch (err: any) {
      alert("Erro ao gerar notícia: " + err.message);
    } finally {
      setIsGeneratingNews(false);
    }
  };

  const fetchTropeiroBoiada = async (email: string) => {
    setIsTropeiroBoiadaLoading(true);
    try {
      const { data, error } = await supabase
        .from('boiadas_oficiais')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const mine = data.find(b => b.lados?.__meta?.tropeiro_email?.toLowerCase().trim() === email.toLowerCase().trim());
        setTropeiroBoiada(mine || null);
      } else {
        setTropeiroBoiada(null);
      }
    } catch (err) {
      console.error('Erro ao buscar boiada do tropeiro:', err);
    } finally {
      setIsTropeiroBoiadaLoading(false);
    }
  };

  const handleCreateTropeiroBoiada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!newBoiadaCiaName.trim()) return alert("Digite o nome da boiada (CIA).");
    
    setIsCreatingBoiada(true);
    try {
      const tourosList = bulkBullsText
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const newLados: any = {
        "__meta": {
          "status": "pendente",
          "tropeiro_email": user.email,
          "touros_info": {}
        }
      };
      
      tourosList.forEach(t => {
        newLados[t] = "Esquerdo";
        newLados.__meta.touros_info[t] = {
          lado: "Esquerdo",
          foto: "",
          video_url: ""
        };
      });
      
      const { error } = await supabase
        .from('boiadas_oficiais')
        .insert([{
          nome: newBoiadaCiaName.trim().toUpperCase(),
          lados: newLados
        }]);
      
      if (error) throw error;
      
      alert("Boiada criada com sucesso e enviada para aprovação do Administrador!");
      setNewBoiadaCiaName('');
      setBulkBullsText('');
      await fetchTropeiroBoiada(user.email);
    } catch (err: any) {
      alert("Erro ao criar boiada: " + err.message);
    } finally {
      setIsCreatingBoiada(false);
    }
  };

  const handleSaveBull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !tropeiroBoiada) return;
    if (!bullForm.nome.trim()) return alert("Digite o nome do touro.");
    
    try {
      const updatedLados = { ...tropeiroBoiada.lados };
      if (!updatedLados.__meta) {
         updatedLados.__meta = {
           status: "pendente",
           tropeiro_email: user.email,
           touros_info: {}
         };
      }
      if (!updatedLados.__meta.touros_info) {
         updatedLados.__meta.touros_info = {};
      }
      
      const cleanName = bullForm.nome.trim();
      
      if (editingBullName && editingBullName !== cleanName) {
        delete updatedLados[editingBullName];
        if (updatedLados.__meta.touros_info[editingBullName]) {
          delete updatedLados.__meta.touros_info[editingBullName];
        }
      }
      
      updatedLados[cleanName] = bullForm.lado;
      updatedLados.__meta.touros_info[cleanName] = {
        lado: bullForm.lado,
        foto: bullForm.foto,
        video_url: bullForm.video_url.trim()
      };
      
      const { error } = await supabase
        .from('boiadas_oficiais')
        .update({ lados: updatedLados })
        .eq('id', tropeiroBoiada.id);
      
      if (error) throw error;
      
      alert("Touro salvo com sucesso!");
      setIsEditBullModalOpen(false);
      setEditingBullName(null);
      setBullForm({ nome: '', lado: 'Esquerdo', foto: '', video_url: '' });
      await fetchTropeiroBoiada(user.email);
    } catch (err: any) {
      alert("Erro ao salvar touro: " + err.message);
    }
  };

  const handleDeleteBull = async (bullName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o touro "${bullName}"?`)) return;
    if (!user?.email || !tropeiroBoiada) return;
    
    try {
      const updatedLados = { ...tropeiroBoiada.lados };
      if (updatedLados[bullName]) delete updatedLados[bullName];
      if (updatedLados.__meta?.touros_info?.[bullName]) {
        delete updatedLados.__meta.touros_info[bullName];
      }
      
      const { error } = await supabase
        .from('boiadas_oficiais')
        .update({ lados: updatedLados })
        .eq('id', tropeiroBoiada.id);
      
      if (error) throw error;
      
      alert("Touro removido com sucesso!");
      await fetchTropeiroBoiada(user.email);
    } catch (err: any) {
      alert("Erro ao remover touro: " + err.message);
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    fetchEventosOficiais();
    fetchPatrocinios();
    
    const checkSession = async () => {
      const isAuth = localStorage.getItem('hzn_portal_authenticated') === 'true';
      if (!isAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.signOut();
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        if (session.user.email) {
          fetchUserProfile(session.user.email);
          fetchBoiadas();
          fetchTropeiroBoiada(session.user.email);
          setCurrentTab('explore');
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuth = localStorage.getItem('hzn_portal_authenticated') === 'true';
      
      if (event === 'SIGNED_IN' && !isAuth) {
        const isSignupFlow = registerStep === 'otp' || isRegisterModalOpen;
        if (isSignupFlow) {
          localStorage.setItem('hzn_portal_authenticated', 'true');
          setUser(session?.user ?? null);
          if (session?.user?.email) {
            fetchUserProfile(session.user.email);
            fetchBoiadas();
            fetchTropeiroBoiada(session.user.email);
            setCurrentTab('explore');
          }
          return;
        }
      }

      if (session?.user && localStorage.getItem('hzn_portal_authenticated') === 'true') {
        setUser(session.user);
        if (session.user.email) {
          fetchUserProfile(session.user.email);
          fetchBoiadas();
          fetchEventosOficiais();
          fetchTropeiroBoiada(session.user.email);
          setCurrentTab(prev => prev === 'home' ? 'explore' : prev);
        }
      } else if (!session) {
        setUser(null);
        setUserProfile(null);
        setUserBio('');
        setUserFoto('');
        setCurrentTab('home');
      }
    });

    return () => subscription.unsubscribe();
  }, [registerStep, isRegisterModalOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setUserFoto(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.email) return;

    setIsSavingProfile(true);
    try {
      await supabase
        .from('perfis_portal')
        .update({
          bio: userBio,
          foto: userFoto
        } as any)
        .ilike('email', user.email.trim());
    } catch (err) {
      console.log("Salvo apenas localmente (colunas 'bio'/'foto' não encontradas no BD).");
    } finally {
      setIsSavingProfile(false);
      alert("Perfil atualizado com sucesso!");
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('hzn_portal_authenticated');
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setUserBio('');
    setUserFoto('');
    setIsLogoutConfirmOpen(false);
    setCurrentTab('home');
  };

  const handleCopyShareLink = () => {
    if (!userProfile?.nome) return;
    
    const slug = slugify(userProfile.nome);
    const shareUrl = `${window.location.origin}/perfil/${slug}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Link de compartilhamento copiado!");
    }).catch(() => {
      alert(`Copie o link: ${shareUrl}`);
    });
  };

  const handleCopyBoiadaLink = () => {
    if (!tropeiroBoiada?.nome) return;
    const slug = slugify(tropeiroBoiada.nome);
    const shareUrl = `${window.location.origin}/boiada/${slug}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Link da boiada copiado com sucesso!");
    }).catch(() => {
      alert(`Copie o link: ${shareUrl}`);
    });
  };

  useEffect(() => {
    if (selectedEvent?.detalhes?.ranking) {
      const cpfs = selectedEvent.detalhes.ranking.map((p: any) => p.cpf ? p.cpf.replace(/\D/g, '') : null).filter(Boolean);
      if (cpfs.length > 0) {
        supabase.from('perfis_portal').select('cpf').in('cpf', cpfs).then(({data}) => {
          if (data) {
            setVerifiedCpfs(new Set(data.map(d => d.cpf)));
          } else {
            setVerifiedCpfs(new Set());
          }
        });
      }
    }
  }, [selectedEvent]);

  useEffect(() => {
    const handleRouting = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/perfil/')) {
        const slug = path.replace('/perfil/', '').toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (slug) {
          setPublicProfileSlug(slug);
          setPublicBoiadaSlug(null);
            setPublicEventSlug(null);
          setIsPublicProfileLoading(true);
          try {
            const queryPattern = '%' + slug.split('').join('%') + '%';
            
            // Try fetching with the 'link' column (it may not exist if user didn't create it yet)
            let match = null;
            const { data, error } = await supabase
              .from('perfis_portal')
              .select('*')
              .or(`link.eq.${slug},nome.ilike.${queryPattern}`)
              .order('created_at', { ascending: false });

            if (error) {
              // Fallback for when the link column doesn't exist yet
              const { data: fallbackData } = await supabase
                .from('perfis_portal')
                .select('*')
                .ilike('nome', queryPattern)
                .order('created_at', { ascending: false });
              
              match = fallbackData?.find(p => slugify(p.nome) === slug);
            } else {
              // If we got data, prioritize exact match on link, otherwise fallback to slugified name
              match = data?.find(p => (p.link && p.link.toLowerCase() === slug) || (!p.link && slugify(p.nome) === slug));
            }

            if (match) {
              // Dynamic check in licencas to override veio_do_app_desktop status
              try {
                const { data: licenseData } = await supabase
                  .from('licencas')
                  .select('email')
                  .ilike('email', match.email.trim())
                  .maybeSingle();

                if (licenseData && licenseData.email) {
                  match.veio_do_app_desktop = true;
                }
              } catch (err) {
                console.error('Erro ao verificar licença no Supabase:', err);
              }

              setPublicProfile(match);
              setPublicProfileBio(match.bio || '');
              setPublicProfileFoto(match.foto || '');
            } else {
              setPublicProfile(null);
            }
          } catch (err) {
            console.error('Error fetching public profile:', err);
            setPublicProfile(null);
          } finally {
            setIsPublicProfileLoading(false);
          }
        }
      } else if (path.startsWith('/boiada/')) {
        const slug = path.replace('/boiada/', '').toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (slug) {
          setPublicBoiadaSlug(slug);
          setPublicProfileSlug(null);
          setIsPublicBoiadaLoading(true);
          try {
            const { data } = await supabase
              .from('boiadas_oficiais')
              .select('*');
            
            const match = data?.find(b => slugify(b.nome) === slug && (!b.lados?.__meta || b.lados.__meta.status !== 'pendente'));
            setPublicBoiada(match || null);
          } catch (err) {
            console.error(err);
          } finally {
            setIsPublicBoiadaLoading(false);
          }
        }
      } else if (path.startsWith('/noticia/')) {
        const id = path.replace('/noticia/', '');
        if (id) {
          setPublicNewsId(id);
          setPublicProfileSlug(null);
          setPublicBoiadaSlug(null);
          setPublicEventSlug(null);
          try {
            const { data } = await supabase
              .from('eventos_oficiais')
              .select('*');
            
            let foundNews = null;
            let foundEvent = null;
            (data || []).forEach(ev => {
              const noticias = ev.detalhes?.noticias || [];
              const match = noticias.find((n: any) => n.id === id);
              if (match) {
                foundNews = match;
                foundEvent = ev;
              }
            });
            setPublicNews(foundNews ? { article: foundNews, event: foundEvent } : null);
          } catch (err) {
            console.error(err);
            setPublicNews(null);
          }
        }
      } else {
        setPublicProfileSlug(null);
        setPublicProfile(null);
        setPublicBoiadaSlug(null);
        setPublicBoiada(null);
        setPublicEventSlug(null);
        setPublicNewsId(null);
        setPublicNews(null);
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  useEffect(() => {
    if (publicNewsId && publicNews) {
      document.body.style.backgroundColor = '#ffffff';
      document.body.classList.add('light-theme-news');
      return () => {
        document.body.style.backgroundColor = '';
        document.body.classList.remove('light-theme-news');
      };
    } else {
      document.body.style.backgroundColor = '';
      document.body.classList.remove('light-theme-news');
    }
  }, [publicNewsId, publicNews]);

  // Eventos Oficiais vêm do banco agora

  // ======================
  // FLUXO DE CADASTRO
  // ======================
  const handleRegEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegEmail(e.target.value);
    setIsAppUser(false); 
  };

  const checkEmailInDB = async () => {
    if (!regEmail || !regEmail.includes('@')) return;
    try {
      const { data } = await supabase
        .from('licencas')
        .select('email')
        .ilike('email', regEmail.trim())
        .maybeSingle();

      if (data && data.email) {
        setIsAppUser(true);
      }
    } catch (err) {
      console.error('Erro ao verificar email no Supabase:', err);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return; // Evita duplos cliques e envios simultâneos
    setIsRegistering(true);
    setRegisterError('');

    try {
      // 1. Criar usuário no Auth do Supabase (Dispara e-mail de confirmação OTP)
      // NOTA: Quando confirmação de e-mail está ativa, o Supabase retorna user=null
      // após o signUp() (modo OTP). O usuário só é confirmado após digitar o código.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });

      if (authError) throw new Error(authError.message);

      // Se authData.user existir (raro com OTP), salva o perfil agora
      if (authData.user) {
        const fullAddress = `${regAddress.trim()}, ${regCity.trim()} - ${regState.trim()}`;
        const { error: dbError } = await supabase.from('perfis_portal').insert([{
          id: authData.user.id,
          nome: regName,
          email: regEmail,
          whatsapp: regWhatsapp,
          cpf: regCpf,
          rg: regRg,
          endereco: fullAddress,
          cargo: regRole,
          veio_do_app_desktop: isAppUser 
        }]);
        if (dbError) console.warn('Aviso ao salvar perfil (pode já existir):', dbError.message);
      }

      // Avança para tela de verificação de e-mail (o e-mail OTP já foi enviado)
      setRegisterStep('otp');
      
    } catch (err: any) {
      setRegisterError("Erro ao realizar cadastro: " + err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegisterError('');

    try {
      // Validar código OTP de e-mail do Supabase
      const { data: otpData, error } = await supabase.auth.verifyOtp({
        email: regEmail,
        token: regOtpCode.trim(),
        type: 'signup'
      });

      if (error) throw new Error("Código inválido ou expirado.");

      // Após verificação OTP, o usuário está confirmado e temos o user.id real
      // Salvar perfil agora se ainda não foi salvo (caso user era null no signUp)
      if (otpData?.user) {
        const { data: existingProfile } = await supabase
          .from('perfis_portal')
          .select('id')
          .eq('id', otpData.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const fullAddress = `${regAddress.trim()}, ${regCity.trim()} - ${regState.trim()}`;
          const { error: dbError } = await supabase.from('perfis_portal').insert([{
            id: otpData.user.id,
            nome: regName,
            email: regEmail,
            whatsapp: regWhatsapp,
            cpf: regCpf,
            rg: regRg,
            endereco: fullAddress,
            cargo: regRole,
            veio_do_app_desktop: isAppUser
          }]);
          if (dbError) console.warn('Aviso ao salvar perfil no OTP:', dbError.message);
        }
      }

      alert(isAppUser ? "Sincronização concluída! E-mail verificado com sucesso." : "Cadastro e verificação de e-mail realizados com sucesso!");
      setIsRegisterModalOpen(false);
      setRegisterStep('form');
      
      // Limpar form
      setRegName(''); setRegEmail(''); setRegPassword(''); setRegWhatsapp('');
      setRegCpf(''); setRegRg(''); setRegAddress(''); setRegCity(''); setRegState(''); setRegRole(''); setRegOtpCode('');
    } catch (err: any) {
      setRegisterError(err.message);
    } finally {
      setIsRegistering(false);
    }
  };


  // ======================
  // FLUXO DE LOGIN (2FA)
  // ======================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (signInError) throw new Error("E-mail ou senha incorretos.");

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const { error: dbError } = await supabase
        .from('otp_codes')
        .insert([{ email: loginEmail.toLowerCase().trim(), code: code }]);

      if (dbError) throw new Error("Erro ao gerar código de segurança.");

      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.toLowerCase().trim(), code })
      });

      const result = await response.json();
      if (!result.success) throw new Error("Falha ao enviar e-mail de verificação.");

      setLoginStep('otp');
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Erro desconhecido ao tentar logar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', loginEmail.toLowerCase().trim())
        .eq('code', otpCode.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        throw new Error("Código inválido ou expirado.");
      }

      // 2FA code is correct! Authenticate them
      localStorage.setItem('hzn_portal_authenticated', 'true');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        if (session.user.email) {
          await fetchUserProfile(session.user.email);
          fetchBoiadas();
          fetchEventosOficiais();
        }
      }

      alert(`Acesso Liberado! Bem vindo ao portal, ${loginEmail}`);
      setIsLoginModalOpen(false);
      setLoginStep('credentials');
      setOtpCode('');
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || "Erro ao verificar código.");
    } finally {
      setIsLoading(false);
    }
  };


    if (publicEventSlug && selectedEvent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', width: '100vw', overflowX: 'hidden' }}>
        <header className="public-header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} /></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => { navigateTo('/'); setPublicEventSlug(null); setSelectedEvent(null); setEventTab('home'); }}>Ir para o Portal</button>
          </div>
        </header>

        <div className="event-detail-view fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', marginTop: '2rem' }}>
          <div className="event-header-banner" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
            {selectedEvent.detalhes?.logo ? (
              <img src={selectedEvent.detalhes.logo} alt={selectedEvent.nome} style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '24px', background: 'rgba(0,0,0,0.4)', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>LOGO</div>
            )}
            <div>
              <span className="event-date" style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>{selectedEvent.tipo || 'RODEIO'}</span>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', lineHeight: 1, fontWeight: '900', textTransform: 'uppercase' }}>{selectedEvent.nome}</h2>
              
              <div style={{ display: 'flex', gap: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {selectedEvent.local || selectedEvent.cidade}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Diretor: <strong style={{ color: '#fff' }}>{selectedEvent.detalhes?.diretor || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Abas de Navegação do Evento */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            {[
              { id: 'home', label: 'Início' },
              { id: 'ranking', label: 'Ranking' },
              { id: 'sorteios', label: 'Sorteio' },
              { id: 'competidores', label: 'Competidores' },
              { id: 'boiadas', label: 'Boiadas' },
              { id: 'noticias', label: 'Notícias' },
              { id: 'midia', label: 'Mídia' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setEventTab(tab.id as any)}
                style={{ 
                  background: 'none', border: 'none', color: eventTab === tab.id ? '#E11D48' : '#94a3b8', 
                  fontWeight: 'bold', fontSize: '1rem', padding: '0.5rem 1rem', cursor: 'pointer',
                  borderBottom: eventTab === tab.id ? '2px solid #E11D48' : '2px solid transparent',
                  textTransform: 'uppercase', whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo Dinâmico */}
          <div className="event-tab-content">
            
            {eventTab === 'home' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
                <div className="event-card" style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }} onClick={() => setEventTab('sorteios')}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Sorteio</h3>
                </div>
                <div className="event-card" style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }} onClick={() => setEventTab('ranking')}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Ranking</h3>
                </div>
                <div className="event-card" style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }} onClick={() => setEventTab('competidores')}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Competidores</h3>
                </div>
                <div className="event-card" style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }} onClick={() => setEventTab('boiadas')}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Boiadas</h3>
                </div>
                <div className="event-card" style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }} onClick={() => setEventTab('noticias')}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
                  <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Notícias</h3>
                </div>
              </div>
            )}

            
            {eventTab === 'sorteios' && (
              <div className="ranking-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                   {(() => {
                      if (!selectedEvent.detalhes?.sorteios || selectedEvent.detalhes.sorteios.length === 0) return null;
                      const days = selectedEvent.detalhes.sorteios.map((s: any) => s.day);
                      if (!selectedSorteioDay && days.length > 0) setTimeout(() => setSelectedSorteioDay(days[0]), 0);
                      
                      return days.map((dia: string) => (
                        <button 
                          key={dia}
                          onClick={() => setSelectedSorteioDay(dia)}
                          style={{
                            background: selectedSorteioDay === dia ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: selectedSorteioDay === dia ? '#000' : 'var(--text-muted)',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          {dia.toUpperCase().replace(/DIA /g, 'ROUND ')}
                        </button>
                      ));
                   })()}
                </div>

                <div className="ranking-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    if (!selectedEvent.detalhes?.sorteios) return <p style={{ color: 'var(--text-muted)' }}>Nenhum sorteio disponível.</p>;
                    const sorteio = selectedEvent.detalhes.sorteios.find((s: any) => s.day === selectedSorteioDay);
                    if (!sorteio) return null;

                    return sorteio.riders.map((rider: any, index: number) => {
                      const bullIndex = sorteio.assignments[index.toString()];
                      const bull = bullIndex !== undefined ? sorteio.bulls[bullIndex] : null;

                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 30, 30, 0.4)', borderRadius: '16px', padding: '1rem 1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)', width: '40px' }}>
                            {index + 1}º
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>{rider.nome}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rider.cidade}</div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                             X 
                          </div>

                          <div style={{ flex: 1, textAlign: 'right' }}>
                            {bull ? (
                              <>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent)' }}>{bull.nome}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Cia {bull.cia} <span style={{ background: bull.lado === 'E' ? 'rgba(0, 191, 255, 0.2)' : 'rgba(255, 69, 0, 0.2)', color: bull.lado === 'E' ? '#00BFFF' : '#FF4500', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 'bold' }}>{formatSide(bull.lado)}</span>
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Touro não definido</div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {eventTab === 'ranking' && (
              <div className="ranking-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                   {(() => {
                      const days = new Set<string>();
                      (selectedEvent.detalhes?.notas || []).forEach((n: any) => { if (n.dia) days.add(n.dia); });
                      const customSort = (a: string, b: string) => {
                          const wA = a.toUpperCase().includes('FINAL') && !a.toUpperCase().includes('SEMI') ? 100 : a.toUpperCase().includes('SEMI') ? 90 : 0;
                          const wB = b.toUpperCase().includes('FINAL') && !b.toUpperCase().includes('SEMI') ? 100 : b.toUpperCase().includes('SEMI') ? 90 : 0;
                          if (wA !== wB) return wA - wB;
                          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                      };
                      const dayList = ['Geral', ...Array.from(days).sort(customSort)];
                      return dayList.map(d => (
                         <button key={d} onClick={() => setSelectedRankingDay(d)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', background: selectedRankingDay === d ? '#E11D48' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>{d.replace(/DIA/i, 'ROUND')}</button>
                      ));
                   })()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedEvent.detalhes?.ranking && selectedEvent.detalhes.ranking.length > 0 ? (
                    (() => {
                       let rankingBase = [...selectedEvent.detalhes.ranking];
                       // Se for dia especifico
                       if (selectedRankingDay !== 'Geral') {
                           rankingBase = rankingBase.map((peao: any) => {
                               const peaoNotas = (selectedEvent.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa') && n.dia === selectedRankingDay);
                               let dayScore = 0;
                               let dayTempo = 0;
                               let detalheDia: any = null;
                               peaoNotas.forEach((n: any) => {
                                   if (n.totalPeao === 0 || n.tempo < 8) dayTempo += n.tempo;
                                   else dayScore += (n.totalPeao + n.totalTouro);
                                   detalheDia = n;
                               });
                               return { ...peao, score: dayScore, tempoAcumulado: dayTempo, detalheDia };
                           });
                       } else {
                           // Se for Geral, precisamos agregar as notas de cada dia para mostrar quebras
                           rankingBase = rankingBase.map((peao: any) => {
                               const peaoNotas = (selectedEvent.detalhes.notas || []).filter((n: any) => n.peao === peao.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                               const parciais: any = {};
                               let total = 0;
                               peaoNotas.forEach((n: any) => {
                                   if (n.totalPeao > 0 && n.tempo >= 8) {
                                       parciais[n.dia] = n.totalPeao + n.totalTouro;
                                       total += (n.totalPeao + n.totalTouro);
                                   } else {
                                       parciais[n.dia] = n.tempo + 's';
                                   }
                               });
                               return { ...peao, score: total, parciais };
                           });
                       }
                       // Ordena
                       return rankingBase.sort((a, b) => (b.score || 0) - (a.score || 0)).filter(p => selectedRankingDay === 'Geral' || (p.score > 0 || p.tempoAcumulado > 0));
                    })().map((peao: any, idx: number) => (
                      <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        
                        {/* Header do Card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: '900', color: '#E11D48', width: '24px', fontSize: '1.2rem' }}>{idx + 1}º</span>
                            <span 
                              style={{ fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }} 
                              className="hover:text-primary transition-colors" 
                              onClick={async () => {
                                let profileData = null;
                                
                                if (peao.cpf) {
                                  const cleanCpf = peao.cpf.replace(/\D/g, '');
                                  const { data } = await supabase.from('perfis_portal').select('*').eq('cpf', cleanCpf).limit(1);
                                  if (data && data.length > 0) {
                                    profileData = data[0];
                                  }
                                }
                                
                                if (!profileData) {
                                  profileData = {
                                    nome: peao.nome,
                                    cidade: peao.cidade || '',
                                    bio: 'Usuário não cadastrado',
                                    foto: '/novacontasfoto.jpg',
                                    veio_do_app_desktop: false,
                                    cpf: peao.cpf || ''
                                  };
                                }
                                
                                const historico: any[] = [];
                                const cleanCpfData = profileData.cpf ? profileData.cpf.replace(/\D/g, '') : '';
                                eventosOficiais.forEach(ev => {
                                  if (ev.detalhes?.ranking) {
                                      const rankingSorted = ev.detalhes.ranking.map((p: any) => {
                                          const peaoNotas = (ev.detalhes.notas || []).filter((n: any) => n.peao === p.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                                          let total = 0;
                                          peaoNotas.forEach((n: any) => {
                                              if (n.totalPeao > 0 && n.tempo >= 8) total += (n.totalPeao + n.totalTouro);
                                          });
                                          return { ...p, score: total };
                                      }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
                                      
                                      const rankIndex = rankingSorted.findIndex((r: any) => {
                                        const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
                                        if (cleanCpfData && rCpf) return rCpf === cleanCpfData;
                                        return r.nome === profileData.nome;
                                      });
                                      
                                      if (rankIndex !== -1) {
                                        historico.push({
                                          eventoNome: ev.nome,
                                          cidade: ev.local || ev.cidade,
                                          posicao: rankIndex + 1
                                        });
                                      }
                                  }
                                });
                                
                                setSelectedPeaoProfile({...profileData, historico});
                                setIsProfileModalOpen(true);
                              }}
                            >
                              {peao.nome}
                            {peao.cpf && verifiedCpfs.has(peao.cpf.replace(/\D/g, '')) && (
  <svg aria-label="Competidor Verificado" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '6px', verticalAlign: 'text-bottom', display: 'inline-block' }}>
    <path d="M11.517 1.408a.633.633 0 0 1 .966 0l1.79 2.148c.204.245.534.343.844.25l2.705-.81a.633.633 0 0 1 .803.582l.235 2.81c.026.319.23.593.524.704l2.639.998a.633.633 0 0 1 .386.915l-1.346 2.457a.89.89 0 0 0 0 .874l1.346 2.457a.633.633 0 0 1-.386.915l-2.639.998a.89.89 0 0 0-.524.704l-.235 2.81a.633.633 0 0 1-.803.582l-2.705-.81a.89.89 0 0 0-.844.25l-1.79 2.148a.633.633 0 0 1-.966 0l-1.79-2.148a.89.89 0 0 0-.844-.25l-2.705.81a.633.633 0 0 1-.803-.582l-.235-2.81a.89.89 0 0 0-.524-.704l-2.639-.998a.633.633 0 0 1-.386-.915L3.13 12.437a.89.89 0 0 0 0-.874L1.784 9.106a.633.633 0 0 1 .386-.915l2.639-.998a.89.89 0 0 0 .524-.704l.235-2.81a.633.633 0 0 1 .803-.582l2.705.81a.89.89 0 0 0 .844-.25l1.79-2.148z" fill="#3b82f6"/>
    <path d="M10.233 15.656a.8.8 0 0 1-.566-.234l-3.3-3.3a.8.8 0 0 1 1.132-1.132l2.734 2.734 5.734-5.734a.8.8 0 0 1 1.132 1.132l-6.3 6.3a.8.8 0 0 1-.566.234z" fill="#ffffff"/>
  </svg>
)}
                            </span>
                          </div>
                          <span style={{ color: '#E11D48', fontWeight: '900', fontSize: '1.2rem' }}>
                            {peao.score > 0 ? peao.score.toFixed(2) : peao.tempoAcumulado ? peao.tempoAcumulado.toFixed(2) + 's' : '0.00'} pts
                          </span>
                        </div>
                        <div style={{ marginLeft: '2.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>{peao.cidade}</div>

                        {/* Detalhamento das Notas (Dia Específico) */}
                        {selectedRankingDay !== 'Geral' && peao.detalheDia && (
                           <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', display: 'flex', gap: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', flexWrap: 'wrap' }}>
                             <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Touro</span><strong style={{ color: '#fff' }}>{peao.detalheDia.touro}</strong></div>
                             {peao.detalheDia.tempo >= 8 && peao.detalheDia.totalPeao > 0 ? (
                               <>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Juiz 1</span><strong style={{ color: '#fff' }}>{(peao.detalheDia.j1_peao + peao.detalheDia.j1_touro).toFixed(2)}</strong></div>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Juiz 2</span><strong style={{ color: '#fff' }}>{(peao.detalheDia.j2_peao + peao.detalheDia.j2_touro).toFixed(2)}</strong></div>
                                 <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Nota Final</span><strong style={{ color: '#10b981' }}>{(peao.detalheDia.totalPeao + peao.detalheDia.totalTouro).toFixed(2)}</strong></div>
                               </>
                             ) : (
                               <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Tempo</span><strong style={{ color: '#ef4444' }}>{peao.detalheDia.tempo.toFixed(2)}s</strong></div>
                             )}
                           </div>
                        )}

                        {/* Detalhamento Parcial (Geral) */}
                        {selectedRankingDay === 'Geral' && peao.parciais && Object.keys(peao.parciais).length > 0 && (
                          <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {Object.entries(peao.parciais).map(([dia, pont]: [string, any]) => (
                               <div key={dia} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                                 <span style={{ color: '#94a3b8', marginRight: '0.5rem' }}>{dia.replace(/DIA/i, 'ROUND')}:</span>
                                 <strong style={{ color: typeof pont === 'string' ? '#ef4444' : '#10b981' }}>{pont}</strong>
                               </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum competidor com notas neste dia.</p>
                  )}
                </div>
              </div>
            )}

            {eventTab === 'competidores' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {(selectedEvent.detalhes?.ranking || []).map((peao: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.2rem', margin: 0 }}>{peao.nome} {peao.cpf && verifiedCpfs.has(peao.cpf.replace(/\D/g, '')) && (
  <svg aria-label="Competidor Verificado" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '6px', verticalAlign: 'text-bottom', display: 'inline-block' }}>
    <path d="M11.517 1.408a.633.633 0 0 1 .966 0l1.79 2.148c.204.245.534.343.844.25l2.705-.81a.633.633 0 0 1 .803.582l.235 2.81c.026.319.23.593.524.704l2.639.998a.633.633 0 0 1 .386.915l-1.346 2.457a.89.89 0 0 0 0 .874l1.346 2.457a.633.633 0 0 1-.386.915l-2.639.998a.89.89 0 0 0-.524.704l-.235 2.81a.633.633 0 0 1-.803.582l-2.705-.81a.89.89 0 0 0-.844.25l-1.79 2.148a.633.633 0 0 1-.966 0l-1.79-2.148a.89.89 0 0 0-.844-.25l-2.705.81a.633.633 0 0 1-.803-.582l-.235-2.81a.89.89 0 0 0-.524-.704l-2.639-.998a.633.633 0 0 1-.386-.915L3.13 12.437a.89.89 0 0 0 0-.874L1.784 9.106a.633.633 0 0 1 .386-.915l2.639-.998a.89.89 0 0 0 .524-.704l.235-2.81a.633.633 0 0 1 .803-.582l2.705.81a.89.89 0 0 0 .844-.25l1.79-2.148z" fill="#3b82f6"/>
    <path d="M10.233 15.656a.8.8 0 0 1-.566-.234l-3.3-3.3a.8.8 0 0 1 1.132-1.132l2.734 2.734 5.734-5.734a.8.8 0 0 1 1.132 1.132l-6.3 6.3a.8.8 0 0 1-.566.234z" fill="#ffffff"/>
  </svg>
)}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{peao.cidade}</span>
                    <button 
                      className="btn btn-outline" 
                      style={{ marginTop: '1rem', width: '100%' }}
                      onClick={async () => {
                        let profileData = null;
                        
                        if (peao.cpf) {
                          const { data } = await supabase.from('perfis_portal').select('*').eq('cpf', peao.cpf.replace(/\D/g, '')).limit(1);
                          if (data && data.length > 0) {
                            profileData = data[0];
                          }
                        }
                        
                        if (!profileData) {
                          profileData = {
                            nome: peao.nome,
                            cidade: peao.cidade || '',
                            bio: 'Usuário não cadastrado',
                            foto: '/novacontasfoto.jpg',
                            veio_do_app_desktop: false,
                            cpf: peao.cpf || ''
                          };
                        }
                        
                        const historico: any[] = [];
                        const cleanCpf = profileData.cpf ? profileData.cpf.replace(/\D/g, '') : '';
                        
                        eventosOficiais.forEach(ev => {
                          if (ev.detalhes?.ranking) {
                              const rankingSorted = ev.detalhes.ranking.map((p: any) => {
                                  const peaoNotas = (ev.detalhes.notas || []).filter((n: any) => n.peao === p.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                                  let total = 0;
                                  peaoNotas.forEach((n: any) => {
                                      if (n.totalPeao > 0 && n.tempo >= 8) total += (n.totalPeao + n.totalTouro);
                                  });
                                  return { ...p, score: total };
                              }).sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
                              
                              const rankIndex = rankingSorted.findIndex((r: any) => {
                                const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
                                if (cleanCpf && rCpf) {
                                  return rCpf === cleanCpf;
                                }
                                return r.nome === profileData.nome;
                              });
                              
                              if (rankIndex !== -1) {
                                historico.push({
                                  eventoNome: ev.nome,
                                  cidade: ev.local || ev.cidade,
                                  posicao: rankIndex + 1
                                });
                              }
                          }
                        });
                        
                        setSelectedPeaoProfile({...profileData, historico});
                        setIsProfileModalOpen(true);
                      }}
                    >
                      Ver Perfil
                    </button>
                  </div>
                ))}
              </div>
            )}

            {eventTab === 'boiadas' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {selectedEvent.detalhes?.boiadas && selectedEvent.detalhes.boiadas.length > 0 ? (
                  selectedEvent.detalhes.boiadas.map((b: any, idx: number) => (
                    <div key={idx} 
                         onClick={async () => {
                            setIsPublicProfileLoading(true);
                            const { data } = await supabase.from('boiadas_oficiais').select('*');
                            setIsPublicProfileLoading(false);
                            if (data) {
                                let match = data.find(db => slugify(db.nome) === slugify(b.nome) && (!db.lados?.__meta || db.lados.__meta.status !== 'pendente'));
                                if (!match && b.touros && b.touros.length > 0) {
                                    match = data.find(db => {
                                        if (!db.touros) return false;
                                        const dbBulls = db.touros.map((t: string) => slugify(t));
                                        let matches = 0;
                                        b.touros.forEach((t: string) => { if (dbBulls.includes(slugify(t))) matches++; });
                                        return matches >= 2;
                                    });
                                }
                                if (match) {
                                    window.history.pushState({}, '', '/boiada/' + slugify(match.nome));
                                    setPublicBoiadaSlug(slugify(match.nome));
                                    setPublicProfileSlug(null);
                                    setPublicEventSlug(null);
                                    setPublicBoiada(match);
                                } else {
                                    alert("Esta boiada não possui um perfil público verificado no portal.");
                                }
                            }
                         }}
                         style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                         className="hover:bg-white/5 transition-colors"
                    >
                      <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{b.nome}</h4>
                      <p style={{ margin: '0.5rem 0 0 0', color: '#E11D48', fontSize: '0.85rem', fontWeight: 'bold' }}>VER PLANTEL COMPLETO &rarr;</p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma boiada registrada ainda.</p>
                )}
              </div>
            )}

            {eventTab === 'noticias' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {isAdmin && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Painel Admin - Notícias por IA</h4>
                      <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Gere notícias automáticas com inteligência artificial para os rounds deste evento (serão publicadas no Feed global após aprovação).</p>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setShowNewsModal(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      ✨ Gerar Notícia do Round com IA
                    </button>
                  </div>
                )}

                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Comunicados do Evento</h3>
                  <p style={{ color: '#94a3b8', maxWidth: '450px', margin: '0 auto', fontSize: '0.9rem' }}>Nenhum comunicado importante (como horários de início e avisos oficiais) foi publicado para este evento ainda.</p>
                </div>
              </div>
            )}

            {eventTab === 'midia' && (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Galeria de Mídia em Breve</h3>
                <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>Espaço reservado para as fotos oficiais e cobertura do evento.</p>
              </div>
            )}

          </div>
        {/* ==================================== */}
        {/* MODAL DE PERFIL DO COMPETIDOR */}
        {/* ==================================== */}
        <div className={`modal-overlay ${isProfileModalOpen ? 'active' : ''}`} style={{ zIndex: 9999 }}>
          {isProfileModalOpen && selectedPeaoProfile && (() => {
            const peaoStats = getPeaoStats(selectedPeaoProfile.nome, selectedPeaoProfile.cpf);
            return (
              <div className="auth-modal" style={{ maxWidth: '900px', width: '90%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                <button className="close-btn" onClick={() => setIsProfileModalOpen(false)}>✕</button>
                
                <div className="profile-card" style={{ width: '100%', marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                  {/* Left Column: Avatar & Role */}
                  <div className="profile-sidebar" style={{ flex: '1', minWidth: '250px', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="profile-avatar-wrapper" style={{ margin: '0 auto' }}>
                      <img 
                        src={selectedPeaoProfile.foto || "/novacontasfoto.jpg"} 
                        alt="Foto de Perfil" 
                        className={`profile-avatar ${selectedPeaoProfile.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}`}
                      />
                    </div>
                    
                    <div style={{ marginTop: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: '#fff' }}>{selectedPeaoProfile.nome}</h3>
                    </div>

                    <span className="badge badge-role" style={{ marginTop: '1rem', background: '#E11D48', color: '#fff', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      COMPETIDOR
                    </span>

                    {selectedPeaoProfile.veio_do_app_desktop && (
                      <div style={{ marginTop: '1rem' }}>
                        <span className="badge badge-rodeoapp" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.5)', padding: '0.4rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          Verificado RodeoApp
                        </span>
                      </div>
                    )}

                    {/* Stats Dashboard Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem 0.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '2rem', width: '100%' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Montarias</span>
                        <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{peaoStats.outs}</strong>
                      </div>
                      <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Paradas</span>
                        <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>{peaoStats.paradas}</strong>
                      </div>
                      <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Notas 90+</span>
                        <strong style={{ fontSize: '1.2rem', color: '#E11D48' }}>{peaoStats.notas90Plus}</strong>
                      </div>
                    </div>

                    {/* Social Media Links */}
                    {(selectedPeaoProfile.instagram || selectedPeaoProfile.facebook || selectedPeaoProfile.whatsapp) && (
                      <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '1.5rem', width: '100%' }}>
                        {selectedPeaoProfile.instagram && (
                          <a 
                            href={`https://instagram.com/${selectedPeaoProfile.instagram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center' }}
                            title="Instagram"
                            onMouseOver={(e) => e.currentTarget.style.color = '#E11D48'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                          </a>
                        )}
                        {selectedPeaoProfile.facebook && (
                          <a 
                            href={selectedPeaoProfile.facebook.startsWith('http') ? selectedPeaoProfile.facebook : `https://facebook.com/${selectedPeaoProfile.facebook}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center' }}
                            title="Facebook"
                            onMouseOver={(e) => e.currentTarget.style.color = '#3b82f6'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                          </a>
                        )}
                        {selectedPeaoProfile.whatsapp && (() => {
                          const waNum = selectedPeaoProfile.whatsapp.replace(/\D/g, '');
                          return waNum ? (
                            <a 
                              href={`https://wa.me/${waNum}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: '#94a3b8', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center' }}
                              title="WhatsApp"
                              onMouseOver={(e) => e.currentTarget.style.color = '#25d366'}
                              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            </a>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Info */}
                  <div className="profile-content" style={{ flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="profile-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div className="form-group">
                        <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Cidade / Estado</label>
                        <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', color: '#fff' }}>{selectedPeaoProfile.cidade || (selectedPeaoProfile.endereco ? selectedPeaoProfile.endereco.split(',').pop()?.trim() : 'Não informado')}</div>
                      </div>
                      <div className="form-group">
                        <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Data de Nasc.</label>
                        <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', color: '#fff' }}>{formatBirthDate(selectedPeaoProfile.nascimento)}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Biografia</label>
                      <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', minHeight: '80px', color: '#fff' }}>
                        {selectedPeaoProfile.bio || 'Este competidor ainda não adicionou uma biografia.'}
                      </div>
                    </div>

                    {/* Historico de Eventos */}
                    <div className="profile-history-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', width: '100%' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: '#94a3b8' }}>Histórico de Eventos</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }} className="custom-scrollbar">
                        {selectedPeaoProfile.historico && selectedPeaoProfile.historico.length > 0 ? (
                          selectedPeaoProfile.historico.map((hist: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{hist.eventoNome} <span style={{ color: '#E11D48', fontSize: '0.9rem', padding: '0.2rem 0.6rem', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '6px' }}>{hist.posicao}º Lugar</span></h4>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{hist.cidade}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum evento registrado ainda.</p>
                        )}
                      </div>
                    </div>

                    {/* Ultimas Montarias (últimas 3 apenas) */}
                    <div className="profile-history-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', width: '100%' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: '#94a3b8' }}>Últimas Montarias</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {peaoStats.runs.length > 0 ? (
                          [...peaoStats.runs].reverse().slice(0, 3).map((run: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#fff' }}>vs {run.touro}</h4>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{run.eventoNome} • {run.dia}</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.95rem', color: run.status === 'Parada' ? '#10b981' : '#ef4444' }}>
                                  {run.status} ({run.tempo.toFixed(2)}s)
                                </span>
                                {run.status === 'Parada' && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nota: {run.score.toFixed(2)}</span>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma montaria registrada ainda.</p>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                      * histórico de montarias registrado no RodeoApp
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        </div>

        {showNewsModal && selectedEvent && (
          <div className="modal-overlay active" onClick={() => !isGeneratingNews && setShowNewsModal(false)}>
            <div className="auth-modal" style={{ maxWidth: '450px', width: '90%', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => !isGeneratingNews && setShowNewsModal(false)}>×</button>
              <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Gerar Notícia</h2>
              <p className="modal-subtitle" style={{ marginBottom: '1.5rem' }}>Selecione qual round você deseja usar para que a IA crie a notícia automaticamente.</p>
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Selecione o Round / Dia</label>
                <select 
                  className="form-select" 
                  value={newsRound} 
                  onChange={(e) => setNewsRound(e.target.value)}
                  disabled={isGeneratingNews}
                >
                  <option value="">Selecione um round...</option>
                  {(() => {
                    const days = new Set<string>();
                    (selectedEvent.detalhes?.notas || []).forEach((n: any) => { if (n.dia) days.add(String(n.dia)); });
                    const customSort = (a: string, b: string) => {
                        const strA = String(a || '');
                        const strB = String(b || '');
                        const wA = strA.toUpperCase().includes('FINAL') && !strA.toUpperCase().includes('SEMI') ? 100 : strA.toUpperCase().includes('SEMI') ? 90 : 0;
                        const wB = strB.toUpperCase().includes('FINAL') && !strB.toUpperCase().includes('SEMI') ? 100 : strB.toUpperCase().includes('SEMI') ? 90 : 0;
                        if (wA !== wB) return wA - wB;
                        return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
                    };
                    return Array.from(days).sort(customSort).map(d => (
                      <option key={d} value={d}>{d.replace(/DIA/i, 'ROUND ')}</option>
                    ));
                  })()}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  style={{ flex: 1 }} 
                  onClick={() => setShowNewsModal(false)}
                  disabled={isGeneratingNews}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={handleGenerateNews}
                  disabled={isGeneratingNews || !newsRound}
                >
                  {isGeneratingNews ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeYoutubeVideoId && (
          <div className="modal-overlay active" onClick={() => setActiveYoutubeVideoId(null)}>
            <div className="auth-modal" style={{ maxWidth: '640px', padding: '1rem', background: '#000', border: '1px solid var(--border-light)' }} onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" style={{ top: '10px', right: '10px', zIndex: 10 }} onClick={() => setActiveYoutubeVideoId(null)}>×</button>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
                <iframe 
                  src={`https://www.youtube.com/embed/${activeYoutubeVideoId}?autoplay=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (publicProfileSlug) {
    let tropeiroBulls: any[] = [];
    let historico: any[] = [];
    let diretorEvents: any[] = [];

    const cargo = publicProfile?.cargo || '';
    const isTropeiro = cargo === 'tropeiro';
    const isDiretor = cargo.includes('diretor');
    const isMidia = cargo.includes('midia');
    const isCompetidor = !isTropeiro && !isDiretor && !isMidia;
    const peaoStats = publicProfile ? getPeaoStats(publicProfile.nome, publicProfile.cpf) : { outs: 0, paradas: 0, notas90Plus: 0, runs: [] };

    if (publicProfile) {
      // Calculate event history for all profiles regardless of their cargo
      const cleanCpf = publicProfile.cpf ? publicProfile.cpf.replace(/\D/g, '') : '';
      eventosOficiais.forEach(ev => {
        const rankIndex = ev.detalhes?.ranking?.findIndex((r: any) => {
          const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
          if (cleanCpf && rCpf) return rCpf === cleanCpf;
          return slugify(r.nome) === slugify(publicProfile.nome);
        });
        if (rankIndex !== undefined && rankIndex >= 0) {
          historico.push({
            eventoNome: ev.nome,
            cidade: ev.local || ev.cidade,
            posicao: rankIndex + 1,
            slug: slugify(ev.nome)
          });
        }
      });

      if (isTropeiro) {
        const tropeiroBoiada = boiadas.find(b => b.lados?.__meta?.tropeiro_email === publicProfile.email);
        if (tropeiroBoiada) {
          tropeiroBulls = Object.keys(tropeiroBoiada.lados).filter(k => k !== '__meta').map(bullName => ({
            nome: bullName,
            foto: tropeiroBoiada.lados.__meta?.touros_info?.[bullName]?.foto || '/tourosfoto.jpg'
          }));
        }
      } else if (isDiretor && publicProfile.veio_do_app_desktop) {
        diretorEvents = eventosOficiais.filter(ev => {
           return slugify(ev.diretor || '').includes(slugify(publicProfile.nome)) || slugify(ev.nome).includes(slugify(publicProfile.nome));
        });
      }
    }

    return (
      <div style={{ width: '100vw', overflowX: 'hidden' }}>
        <header className="public-header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} /></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => navigateTo('/')}>Ir para o Portal</button>
          </div>
        </header>

        <div className="profile-container" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {isPublicProfileLoading ? (
            <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 600, marginTop: '4rem' }}>Carregando Perfil...</div>
          ) : publicProfile ? (
            <div style={{ maxWidth: '1000px', width: '100%', padding: '0 1rem' }}>
              
              {/* Premium Banner & Avatar */}
              <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '24px 24px 0 0', background: publicProfile.capa ? `url(${publicProfile.capa}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary) 0%, #1e1e1e 100%)', marginBottom: '80px' }}>
                {publicProfile.capa && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', borderRadius: '24px 24px 0 0' }} />}
                <div style={{ position: 'absolute', bottom: '-60px', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', padding: '5px', background: 'var(--bg-main)' }}>
                  <img 
                    src={publicProfileFoto || "/novacontasfoto.jpg"} 
                    alt="Foto de Perfil" 
                    className={publicProfile.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}
                    style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-card)' }}
                  />
                </div>
              </div>

              {/* Nome & Cargo & Redes Sociais */}
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>{publicProfile.nome}</h1>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  <span className="badge badge-role" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    {cargo ? cargo.replace('_', ' ') : 'Competidor'}
                  </span>
                  {publicProfile.veio_do_app_desktop && (
                    <span className="badge badge-rodeoapp" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                      Sincronizado RodeoApp
                    </span>
                  )}
                </div>

                {/* Redes Sociais */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {publicProfile.whatsapp && (
                    <a href={`https://wa.me/55${publicProfile.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: '#25D366', color: '#fff', textDecoration: 'none', transition: 'transform 0.2s' }} className="social-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </a>
                  )}
                  {publicProfile.instagram && (
                    <a href={publicProfile.instagram.includes('http') ? publicProfile.instagram : `https://instagram.com/${publicProfile.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', textDecoration: 'none', transition: 'transform 0.2s' }} className="social-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                  )}
                  {publicProfile.facebook && (
                    <a href={publicProfile.facebook} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: '#1877F2', color: '#fff', textDecoration: 'none', transition: 'transform 0.2s' }} className="social-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </a>
                  )}
                  {publicProfile.twitter && (
                    <a href={publicProfile.twitter.includes('http') ? publicProfile.twitter : `https://twitter.com/${publicProfile.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: '#000', color: '#fff', border: '1px solid #333', textDecoration: 'none', transition: 'transform 0.2s' }} className="social-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Grid 2 colunas para telas grandes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
                
                {/* Coluna Esquerda: Bio & Competidor Stats */}
                <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)', height: 'fit-content' }}>
                  {(isCompetidor || isDiretor || isMidia || peaoStats.runs.length > 0) && (
                    <>
                      {/* Stats Dashboard Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem 0.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem', width: '100%' }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Montarias</span>
                          <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{peaoStats.outs}</strong>
                        </div>
                        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Paradas</span>
                          <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>{peaoStats.paradas}</strong>
                        </div>
                        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Notas 90+</span>
                          <strong style={{ fontSize: '1.2rem', color: '#E11D48' }}>{peaoStats.notas90Plus}</strong>
                        </div>
                      </div>

                      {/* Cidade/Estado e Nascimento */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                          <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Cidade / Estado</label>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '0.9rem' }}>
                            {publicProfile.cidade || (publicProfile.endereco ? publicProfile.endereco.split(',').pop()?.trim() : 'Não informado')}
                          </div>
                        </div>
                        <div>
                          <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Data de Nasc.</label>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px', color: '#fff', fontSize: '0.9rem' }}>
                            {formatBirthDate(publicProfile.nascimento)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Biografia</h3>
                  <p style={{ color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                    {publicProfileBio || "Este usuário ainda não adicionou uma biografia."}
                  </p>
                </div>

                {/* Coluna Direita: Conteúdo por Cargo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {(isCompetidor || isDiretor || isMidia || peaoStats.runs.length > 0) && (
                    <>
                      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Histórico de Eventos</h3>
                        {historico.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {historico.map((h, i) => (
                              <div key={i} onClick={() => navigateTo(`/evento/${h.slug}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{h.eventoNome}</h4>
                                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{h.cidade}</span>
                                </div>
                                <div style={{ background: 'rgba(225, 29, 72, 0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '100px', fontWeight: 'bold' }}>
                                  {h.posicao}º Lugar
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum evento registrado no histórico.</p>
                        )}
                      </div>

                      {/* Ultimas Montarias (últimas 3 apenas) */}
                      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Últimas Montarias</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {peaoStats.runs.length > 0 ? (
                            [...peaoStats.runs].reverse().slice(0, 3).map((run: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                                <div>
                                  <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', color: '#fff' }}>vs {run.touro}</h4>
                                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{run.eventoNome} • {run.dia}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.95rem', color: run.status === 'Parada' ? '#10b981' : '#ef4444' }}>
                                    {run.status} ({run.tempo.toFixed(2)}s)
                                  </span>
                                  {run.status === 'Parada' && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nota: {run.score.toFixed(2)}</span>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma montaria registrada ainda.</p>
                          )}
                        </div>
                        <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#64748b', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                          * histórico de montarias registrado no RodeoApp
                        </div>
                      </div>
                    </>
                  )}

                  {isTropeiro && (
                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Galeria da Companhia</h3>
                      {tropeiroBulls.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                          {tropeiroBulls.map((bull, i) => (
                            <div key={i} style={{ position: 'relative', height: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <img src={bull.foto} alt={bull.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '2rem 1rem 1rem 1rem' }}>
                                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', fontStyle: 'italic', textTransform: 'uppercase' }}>{bull.nome}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum touro registrado na companhia.</p>
                      )}
                    </div>
                  )}

                  {isDiretor && (
                    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-light)' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Eventos Direcionados</h3>
                      {diretorEvents.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {diretorEvents.map((ev, i) => (
                            <div key={i} onClick={() => navigateTo(`/evento/${slugify(ev.nome)}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} className="hover:bg-white/5">
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{ev.nome}</h4>
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{ev.local || ev.cidade} • {ev.data_inicio}</span>
                              </div>
                              <span style={{ color: 'var(--primary)' }}>Ver Evento &rarr;</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum evento sincronizado encontrado.</p>
                      )}
                    </div>
                  )}

                  {isMidia && (
                    <div style={{ background: 'var(--bg-card)', padding: '4rem 2rem', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', margin: '0 auto' }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Portfólio de Mídia</h3>
                      <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>Em breve, fotos e vídeos de eventos cobertos estarão disponíveis aqui.</p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ff4444' }}>Perfil Não Encontrado</h2>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>O perfil solicitado não foi encontrado ou o link é inválido.</p>
              <button className="btn btn-primary" onClick={() => navigateTo('/')}>Voltar ao Início</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (publicBoiadaSlug) {
    return (
      <div style={{ width: '100vw', overflowX: 'hidden' }}>
        <header className="public-header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} /></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => navigateTo('/')}>Ir para o Portal</button>
          </div>
        </header>

        <div className="profile-container" style={{ minHeight: '70vh', padding: '2rem 0', maxWidth: '100%' }}>
          {isPublicBoiadaLoading ? (
            <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 600, textAlign: 'center', marginTop: '4rem' }}>Carregando Boiada...</div>
          ) : publicBoiada ? (
            <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>{publicBoiada.nome}</h1>
                <div style={{ display: 'inline-block', marginTop: '1rem' }}>
                  <span className="badge badge-rodeoapp" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>Boiada Oficial</span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
                Touros do Plantel ({Object.keys(publicBoiada.lados || {}).filter(k => k !== '__meta').length})
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {Object.keys(publicBoiada.lados || {}).filter(k => k !== '__meta').map(bullName => {
                  const side = publicBoiada.lados[bullName];
                  const details = publicBoiada.lados?.__meta?.touros_info?.[bullName] || {};
                  const hasVideo = !!details.video_url && getYoutubeId(details.video_url);
                  
                  return (
                    <div key={bullName} onClick={() => handleBullClick(bullName, details, publicBoiada.nome)} style={{ position: 'relative', height: '350px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                      <img 
                        src={details.foto || "/tourosfoto.jpg"} 
                        alt="Foto do Touro" 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                      />
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)', zIndex: 1 }} />
                      
                      <span className={`bull-side side-${side.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 3, fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: '4px' }}>
                        Lado {formatSide(side)}
                      </span>

                      <div style={{ position: 'relative', zIndex: 2, padding: '1.5rem' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1.8rem', lineHeight: '1', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                            {bullName}
                          </h4>
                        </div>
                        <p style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#ddd', fontWeight: 300 }}>
                          {publicBoiada.nome}
                        </p>
                        
                        {hasVideo && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <button 
                              style={{ background: 'rgba(255,0,0,0.8)', border: 'none', color: '#fff', padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const vid = getYoutubeId(details.video_url);
                                if (vid) setActiveYoutubeVideoId(vid);
                              }}
                            >
                              ▶ Ver Pulo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ff4444' }}>Boiada Não Encontrada</h2>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>A boiada solicitada não existe ou ainda não foi aprovada pelo sistema.</p>
              <button className="btn btn-primary" onClick={() => navigateTo('/')}>Voltar ao Início</button>
            </div>
          )}
        </div>
        
        {activeYoutubeVideoId && (
          <div className="modal-overlay active" onClick={() => setActiveYoutubeVideoId(null)}>
            <div className="auth-modal" style={{ maxWidth: '640px', padding: '1rem', background: '#000', border: '1px solid var(--border-light)' }} onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" style={{ top: '10px', right: '10px', zIndex: 10 }} onClick={() => setActiveYoutubeVideoId(null)}>×</button>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
                <iframe 
                  src={`https://www.youtube.com/embed/${activeYoutubeVideoId}?autoplay=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {selectedBullProfile && selectedBullStats && (
          <div className="modal-overlay active" onClick={() => { setSelectedBullProfile(null); setSelectedBullStats(null); }}>
            <div className="auth-modal" style={{ maxWidth: '680px', padding: '2rem', background: '#0c0a09', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', color: '#fff' }} onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" style={{ top: '15px', right: '15px', zIndex: 10, fontSize: '24px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }} onClick={() => { setSelectedBullProfile(null); setSelectedBullStats(null); }}>×</button>
              
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
                <img 
                  src={selectedBullProfile.foto} 
                  alt={selectedBullProfile.nome} 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }} 
                />
                <div>
                  <span style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>TOURO DE RODEIO</span>
                  <h2 style={{ fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, lineHeight: 1.1 }}>{selectedBullProfile.nome}</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.95rem', textTransform: 'uppercase' }}>CIA {selectedBullProfile.cia}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Média Geral</span>
                  <strong style={{ fontSize: '1.4rem', color: '#E11D48' }}>{selectedBullStats.mediaGeral}</strong>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Saídas</span>
                  <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{selectedBullStats.outs}</strong>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Média Queda</span>
                  <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{selectedBullStats.mediaQueda}</strong>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Taxa de Queda</span>
                  <strong style={{ fontSize: '1.4rem', color: '#fff' }}>{selectedBullStats.taxaQueda}</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                📍 {selectedBullStats.currentEvent === 'Nenhum evento agendado para esta semana' ? 'Sem escala ativa para esta semana' : `Escalado no Evento: ${selectedBullStats.currentEvent}`}
              </div>

              <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: '#94a3b8' }}>Últimas Apresentações</h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }} className="custom-scrollbar">
                {selectedBullStats.runs.length > 0 ? (
                  selectedBullStats.runs.map((run: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#fff' }}>vs {run.peao}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{run.eventoNome} • {run.dia}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.95rem', color: run.status === 'Parada' ? '#10b981' : '#ef4444' }}>
                          {run.status} ({run.tempo.toFixed(2)}s)
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nota Touro: {run.score.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Nenhum histórico de montaria registrado para este touro.</p>
                )}
              </div>

              <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#64748b', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                * média de saída registrada no RodeoApp
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const homeEvents = eventosOficiais.filter(ev => {
    const config = (typeof ev.detalhes === 'string' ? JSON.parse(ev.detalhes) : (ev.detalhes || {})).portalConfig || {};
    return !config.ocultarDaHome;
  });

  const filteredEvents = eventosOficiais.filter(ev => {
    if (ev.status !== 'aprovado') return false;
    const config = (typeof ev.detalhes === 'string' ? JSON.parse(ev.detalhes) : (ev.detalhes || {})).portalConfig || {};
    if (!searchTerm.trim() && config.ocultarDaHome) return false;
    const nome = ev.nome || '';
    const cidade = ev.local || ev.cidade || '';
    return nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
           cidade.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!user) {
    return (
      <>
        <div style={{ width: '100vw', overflowX: 'hidden' }}>
          {/* Header */}
          <header className="public-header">
            <div className="logo" style={{ cursor: 'pointer' }} onClick={() => { setCurrentTab('home'); navigateTo('/'); }}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} /></div>
            <div className="header-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setIsLoginModalOpen(true)}>Entrar</button>
              <button className="btn btn-primary" onClick={() => setIsRegisterModalOpen(true)}>Cadastre-se</button>
            </div>
          </header>

          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 2rem' }}>
            {/* Hero Section */}
            <section className="hero-modern">
              <h1 className="hero-modern-title">
                O Portal Definitivo <br/>
                <span className="text-primary">do Competidor</span>
              </h1>
              <p className="hero-modern-subtitle">
                Acompanhe seus eventos, verifique suas notas ao vivo e gerencie seu perfil profissional de rodeio em um único lugar.
              </p>
              <button className="btn btn-primary btn-glow" style={{ padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '50px' }} onClick={() => setIsRegisterModalOpen(true)}>
                Fazer meu Cadastro Gratuito
              </button>
            </section>

            {/* Weekly Events Section */}
            <section className="events-section">
              <div className="section-header">
                <div>
                  <h2>Eventos da <span className="text-primary">Semana</span></h2>
                  <p className="text-muted" style={{ fontSize: '1.1rem' }}>Acompanhe as etapas que estão rolando agora no circuito</p>
                </div>
              </div>
              
              <div className="events-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                {homeEvents.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-secondary)', padding: '4rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem', opacity: 0.5 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Nenhum evento oficial disponível no momento</h3>
                    <p style={{ fontSize: '0.9rem' }}>Fique ligado! Em breve novos eventos serão adicionados.</p>
                  </div>
                ) : (
                  homeEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      className="glass-card hover:bg-white/5" 
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2.5rem 1.5rem', cursor: 'pointer', textAlign: 'center' }}
                      onClick={() => setPublicRankingModal(ev)}
                    >
                      {ev.detalhes?.logo ? (
                        <img src={ev.detalhes.logo} alt={ev.nome} style={{ width: '140px', height: '140px', objectFit: 'contain', borderRadius: '20px', background: 'rgba(0,0,0,0.4)', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }} />
                      ) : (
                        <div style={{ width: '140px', height: '140px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>LOGO</div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 className="event-name" style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', fontWeight: 900, color: 'var(--text-light)', lineHeight: '1.2' }}>{ev.nome}</h3>
                        <div className="event-date" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          {ev.data_inicio} {ev.data_fim ? `a ${ev.data_fim}` : ''}
                        </div>
                      </div>

                      <span style={{ fontSize: '0.75rem', padding: '0.4rem 1rem', background: 'var(--primary)', color: '#000', borderRadius: '20px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 'auto', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(255,215,0,0.3)' }}>
                        Ver Top 3
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* PUBLIC RANKING MODAL */}
          {publicRankingModal && (
            <div className="modal-overlay active" onClick={() => setPublicRankingModal(null)}>
              <div className="auth-modal fade-in" style={{ maxWidth: '500px', width: '90%', padding: '2.5rem 2rem' }} onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" style={{ top: '15px', right: '15px' }} onClick={() => setPublicRankingModal(null)}>×</button>
                
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  {publicRankingModal.detalhes?.logo && (
                    <img src={publicRankingModal.detalhes.logo} alt="Logo" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', padding: '10px', margin: '0 auto 1.5rem', border: '1px solid rgba(255,255,255,0.1)' }} />
                  )}
                  <h2 className="modal-title" style={{ margin: 0, fontSize: '1.85rem', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', lineHeight: '1.2' }}>{publicRankingModal.nome}</h2>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.75rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {publicRankingModal.local}
                  </div>
                </div>

                {publicRankingModal.detalhes?.ranking && publicRankingModal.detalhes.ranking.length > 0 ? (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1.25rem', fontWeight: '900', letterSpacing: '1px', textAlign: 'center' }}>Top 3 - Ranking Atual</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {publicRankingModal.detalhes.ranking.slice(0, 3).map((competidor: any, idx: number) => (
                        <div 
                          key={idx} 
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem 1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}
                          onClick={() => {
                            const slug = competidor.slug || slugify(competidor.nome);
                            navigateTo(`/perfil/${slug}`);
                          }}
                          className="hover:border-primary/50"
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <span style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32', fontSize: '1.25rem', fontWeight: '900' }}>{idx + 1}º</span>
                            {competidor.nome}
                          </span>
                          <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '1.1rem' }}>
                            {competidor.score > 0 ? competidor.score.toFixed(2) : competidor.tempoAcumulado ? competidor.tempoAcumulado.toFixed(2) + 's' : '0.00'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>pts</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    Ranking ainda não disponível para este evento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================================== */}
        

        {/* MODAL DE CADASTRO */}
        {/* ==================================== */}
        <div className={`modal-overlay ${isRegisterModalOpen ? 'active' : ''}`}>
          <div className="auth-modal" style={registerStep === 'otp' ? { maxWidth: '400px' } : {}}>
            <button className="close-btn" onClick={() => {
              setIsRegisterModalOpen(false);
              setRegisterStep('form');
              setRegisterError('');
            }}>×</button>
            
            <h2 className="modal-title">Crie sua <span className="text-primary">Conta</span></h2>
            
            {registerError && <div style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{registerError}</div>}

            {registerStep === 'form' ? (
              <>
                <p className="modal-subtitle">Preencha seus dados para acessar o portal do competidor.</p>
                <form onSubmit={handleRegisterSubmit}>
                  <div className="form-grid">
                    <div className="form-group full">
                      <label className="form-label">Nome Completo</label>
                      <input type="text" className="form-input" placeholder="João da Silva" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">E-mail {isAppUser && <span className="text-primary" style={{marginLeft:'5px', fontSize:'0.65rem'}}>Usuário do App Detectado!</span>}</label>
                      <input type="email" className="form-input" placeholder="joao@email.com" value={regEmail} onChange={handleRegEmailChange} onBlur={checkEmailInDB} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Crie uma Senha</label>
                      <input type="password" className="form-input" placeholder="Mínimo 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">WhatsApp</label>
                      <input type="tel" className="form-input" placeholder="(00) 00000-0000" value={regWhatsapp} onChange={(e) => setRegWhatsapp(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">CPF</label>
                      <input type="text" className="form-input" placeholder="000.000.000-00" value={regCpf} onChange={(e) => setRegCpf(e.target.value)} required />
                    </div>

                    <div className="form-group full">
                      <label className="form-label">RG</label>
                      <input type="text" className="form-input" placeholder="00.000.000-0" value={regRg} onChange={(e) => setRegRg(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cidade</label>
                      <input type="text" className="form-input" placeholder="Ex: São Paulo" value={regCity} onChange={(e) => setRegCity(e.target.value)} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Estado</label>
                      <input type="text" className="form-input" placeholder="Ex: SP" maxLength={2} value={regState} onChange={(e) => setRegState(e.target.value.toUpperCase())} required />
                    </div>

                    <div className="form-group full">
                      <label className="form-label">Endereço Completo</label>
                      <input type="text" className="form-input" placeholder="Rua, Número, Bairro" value={regAddress} onChange={(e) => setRegAddress(e.target.value)} required />
                    </div>

                    <div className="form-group full">
                      <label className="form-label">Qual o seu Cargo no Rodeio?</label>
                      <select className="form-select" required value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                        <option value="" disabled>Selecione um cargo...</option>
                        <option value="usuario_comum">Usuário Comum</option>
                        <option value="diretor">Diretor</option>
                        <option value="juiz">Juiz</option>
                        <option value="peao_touros">Peão de Touros</option>
                        <option value="peao_cavalos">Peão de Cavalos</option>
                        <option value="competidor_tambores">Competidor 3 Tambores</option>
                        <option value="competidor_team_roping">Competidor Team Roping</option>
                        <option value="tropeiro">Tropeiro</option>
                        <option value="treinador">Treinador</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', padding: '1rem', backgroundColor: isAppUser ? '#fff' : 'var(--primary)', color: '#000' }} disabled={isRegistering}>
                    {isRegistering ? 'Salvando...' : (isAppUser ? 'Sincronizar Perfil com o RodeoApp' : 'Finalizar Cadastro')}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="modal-subtitle">Enviamos um código de 6 dígitos para o e-mail <strong>{regEmail}</strong> para validar sua conta. Digite-o abaixo:</p>
                <form onSubmit={handleVerifySignupOtp}>
                  <div className="form-group">
                    <label className="form-label" style={{ textAlign: 'center' }}>Código de Validação</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value.trim())}
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', padding: '1rem' }} disabled={isRegistering}>
                    {isRegistering ? 'Verificando...' : 'Confirmar E-mail e Ativar Conta'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ==================================== */}
        {/* MODAL DE LOGIN (2FA) */}
        {/* ==================================== */}
        <div className={`modal-overlay ${isLoginModalOpen ? 'active' : ''}`}>
          <div className="auth-modal" style={{ maxWidth: '400px' }}>
            <button className="close-btn" onClick={() => {
              setIsLoginModalOpen(false);
              setLoginStep('credentials');
              setLoginError('');
            }}>×</button>
            
            <h2 className="modal-title">Acesse o <span className="text-primary">Portal</span></h2>
            
            {loginError && <div style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{loginError}</div>}

            {loginStep === 'credentials' ? (
              <>
                <p className="modal-subtitle">Insira suas credenciais para entrar.</p>
                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Senha</label>
                    <input type="password" className="form-input" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', padding: '1rem' }} disabled={isLoading}>
                    {isLoading ? 'Aguarde...' : 'Acessar Conta'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="modal-subtitle">Um código de 6 dígitos foi enviado para o seu e-mail (<strong>{loginEmail}</strong>). Digite-o abaixo.</p>
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <label className="form-label" style={{ textAlign: 'center' }}>Código de Segurança</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', padding: '1rem' }} disabled={isLoading}>
                    {isLoading ? 'Verificando...' : 'Verificar e Entrar'}
                  </button>
                  <button type="button" className="btn btn-outline mt-2" style={{ width: '100%', padding: '1rem' }} onClick={() => setLoginStep('credentials')}>
                    Voltar
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  if (publicNewsId && publicNews) {
    const article = publicNews.article;
    const event = publicNews.event;
    
    // Find active news portal sponsorships
    const activePortalAds = patrocinios.filter(p => p.tipo === 'portal' && p.status === 'ativo');
    const randomAd = activePortalAds.length > 0 ? activePortalAds[Math.floor(Math.random() * activePortalAds.length)] : null;

    // Process article content into paragraphs
    let rawConteudo = article.conteudo || '';
    if (typeof rawConteudo === 'string') {
      rawConteudo = rawConteudo.replace(/\\n/g, '\n');
    }
    
    let paragraphs = rawConteudo
      .split('\n')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);
      
    // If it's just one huge block of text (no newlines), artificially split it into paragraphs by sentences
    if (paragraphs.length === 1 && paragraphs[0].length > 500) {
      const sentences = paragraphs[0].match(/[^.!?]+[.!?]+/g) || [paragraphs[0]];
      paragraphs = [];
      let currentParagraph = '';
      for (const sentence of sentences) {
        currentParagraph += sentence.trim() + ' ';
        if (currentParagraph.length > 400) { // Approx 3-4 sentences per paragraph
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      }
      if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
      }
    }

    const half = Math.ceil(paragraphs.length / 2);
    const firstHalf = paragraphs.slice(0, half);
    const secondHalf = paragraphs.slice(half);

    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#1e293b', fontFamily: '"Outfit", sans-serif' }}>
        {/* Navigation Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>
            <img src="/header_logo.png" alt="RodeoApp" style={{ height: '35px', filter: 'invert(1) brightness(0.2)' }} />
          </div>
          <button className="btn btn-outline" style={{ borderColor: '#cbd5e1', color: '#1e293b' }} onClick={() => navigateTo('/')}>
            &larr; Voltar ao Portal
          </button>
        </header>

        {/* Article Container */}
        <main style={{ maxWidth: '800px', margin: '3rem auto 0 auto', padding: '0 2rem 6rem 2rem' }}>
          {/* Metadata */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ color: '#E11D48', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
              {event ? `EVENTOS • ${event.nome}` : 'NOTÍCIAS'}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: '1.15', color: '#0f172a', marginBottom: '1.5rem', textTransform: 'none', fontStyle: 'normal', letterSpacing: '-1px' }}>
            {article.titulo}
          </h1>

          {/* Byline / Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E11D48', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              RA
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#334155' }}>Redação RodeoApp</div>
              <div>Publicado em {new Date(article.created_at || Date.now()).toLocaleDateString('pt-BR')} às {new Date(article.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          {/* Content */}
          <div style={{ fontSize: '1.15rem', lineHeight: '1.8', color: '#334155', fontFamily: '"Inter", sans-serif' }}>
            {/* Render First Half of paragraphs */}
            {firstHalf.map((p: string, idx: number) => {
              const isQuote = p.startsWith('"') || p.endsWith('"');
              if (isQuote) {
                return (
                  <div key={idx} style={{ margin: '2.5rem 0' }}>
                    <hr style={{ border: 0, borderTop: '2px solid #E11D48', width: '80px', margin: '0 auto 1.5rem auto' }} />
                    <blockquote style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', color: '#0f172a', fontFamily: '"Outfit", sans-serif', margin: '0 auto', maxWidth: '650px', lineHeight: '1.5', fontStyle: 'italic' }}>
                      {p}
                    </blockquote>
                    <hr style={{ border: 0, borderTop: '2px solid #E11D48', width: '80px', margin: '1.5rem auto 0 auto' }} />
                  </div>
                );
              }
              return (
                <p key={idx} style={{ marginBottom: '1.5rem' }}>
                  {p}
                </p>
              );
            })}

            {/* ADVERTISEMENT SLOT */}
            {randomAd && (
              <div style={{ margin: '3rem 0', textAlign: 'center', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 0' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, marginBottom: '1rem' }}>
                  Continua depois da publicidade
                </span>
                <a href={randomAd.click_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', maxWidth: '100%' }}>
                  <img 
                    src={randomAd.logo_url} 
                    alt="Publicidade" 
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                  />
                </a>
              </div>
            )}

            {/* Render Second Half of paragraphs */}
            {secondHalf.map((p: string, idx: number) => {
              const isQuote = p.startsWith('"') || p.endsWith('"');
              if (isQuote) {
                return (
                  <div key={idx} style={{ margin: '2.5rem 0' }}>
                    <hr style={{ border: 0, borderTop: '2px solid #E11D48', width: '80px', margin: '0 auto 1.5rem auto' }} />
                    <blockquote style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', color: '#0f172a', fontFamily: '"Outfit", sans-serif', margin: '0 auto', maxWidth: '650px', lineHeight: '1.5', fontStyle: 'italic' }}>
                      {p}
                    </blockquote>
                    <hr style={{ border: 0, borderTop: '2px solid #E11D48', width: '80px', margin: '1.5rem auto 0 auto' }} />
                  </div>
                );
              }
              return (
                <p key={idx} style={{ marginBottom: '1.5rem' }}>
                  {p}
                </p>
              );
            })}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: '5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: '"Outfit", sans-serif' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
              ⚠️ Notícias geradas por IA podem conter erros. Contate o administrador se acaso quiser remover a matéria!
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Explore and feed lists

  const newsFeed: any[] = [];

  // Collect dynamic news articles from events
  const dynamicNews: any[] = [];
  eventosOficiais.forEach(ev => {
    const noticias = ev.detalhes?.noticias || [];
    noticias.forEach((news: any) => {
      if (news.status === 'aprovado') {
        dynamicNews.push({
          id: `dynamic-${news.id}`,
          title: news.titulo,
          description: news.conteudo,
          category: `EVENTOS - ${ev.nome.toUpperCase()}`,
          time: new Date(news.created_at).toLocaleDateString('pt-BR'),
          created_at: news.created_at
        });
      }
    });
  });

  // Sort dynamic news by date descending
  const sortedDynamicNews = [...dynamicNews].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const combinedNews = [...sortedDynamicNews, ...newsFeed];

  // Filters based on search
  const filteredNews = combinedNews.filter(post => {
    const title = post.title || '';
    const description = post.description || '';
    const category = post.category || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           description.toLowerCase().includes(searchTerm.toLowerCase()) ||
           category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredBoiadas = boiadas.filter(b => {
    if (b.nome === '__PUBLICIDADES__') return false;
    const isPending = b.lados?.__meta?.status === 'pendente';
    if (isPending) return false;
    const nome = b.nome || '';
    return nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.lados && Object.keys(b.lados).some(bull => bull !== '__meta' && bull.toLowerCase().includes(searchTerm.toLowerCase())));
  });

  // Authenticated Dashboard Layout
  return (
    <>
      <div className="dashboard-layout">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            <img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} />
          </div>
          
          <nav className="sidebar-menu">
            {isAdmin && (
              <button 
                className={`menu-item ${currentTab === 'dashboard' ? 'active' : ''}`} 
                onClick={() => { setCurrentTab('dashboard'); setSearchTerm(''); }}
                style={{ color: '#00ff00' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
            )}
            <button 
              className={`menu-item ${currentTab === 'explore' ? 'active' : ''}`} 
              onClick={() => { setCurrentTab('explore'); setSearchTerm(''); }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Eventos
            </button>
            
            <button 
              className={`menu-item ${currentTab === 'feed' ? 'active' : ''}`} 
              onClick={() => { setCurrentTab('feed'); setSearchTerm(''); }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Feed
            </button>

            <button 
              className={`menu-item ${currentTab === 'boiadas' ? 'active' : ''}`} 
              onClick={() => { setCurrentTab('boiadas'); setSearchTerm(''); }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Boiadas
            </button>
            
            {(isAdmin || userProfile?.cargo === 'tropeiro') && (
              <button 
                className={`menu-item ${currentTab === 'minha-boiada' ? 'active' : ''}`} 
                onClick={() => { setCurrentTab('minha-boiada'); setSearchTerm(''); }}
              >
                <svg viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Minha Boiada
              </button>
            )}
            
            <button 
              className={`menu-item ${currentTab === 'profile' ? 'active' : ''}`} 
              onClick={() => { setCurrentTab('profile'); setSearchTerm(''); }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="menu-item logout-btn" onClick={() => setIsLogoutConfirmOpen(true)}>
              <svg viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {/* Header */}
          <header className="dashboard-header">
            <div className="header-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder={
                  currentTab === 'explore' ? "Buscar por eventos ou locais..." :
                  currentTab === 'feed' ? "Buscar notícias..." :
                  currentTab === 'boiadas' ? "Buscar por boiada ou nome de touro..." :
                  "Buscar..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={currentTab === 'profile'}
              />
            </div>
            
            <div className="header-user-info">
              <span className="header-user-name" onClick={() => setCurrentTab('profile')}>
                {userProfile?.nome || user?.email}
              </span>
              <img 
                src={userFoto || "/novacontasfoto.jpg"} 
                alt="Foto de Perfil" 
                className={`header-avatar ${isAdmin ? 'admin-pulsing-avatar-small' : userProfile?.veio_do_app_desktop ? 'rodeo-pulsing-avatar-small' : ''}`}
                onClick={() => setCurrentTab('profile')}
              />
            </div>
          </header>

          {/* Dynamic Tabs Content */}
          <div className="dashboard-content">
            
            {/* ADMIN DASHBOARD TAB */}
            {currentTab === 'dashboard' && isAdmin && (
              <AdminDashboard />
            )}
            
            {/* EVENTOS TAB (formerly Explore) */}
            {currentTab === 'explore' && (
              <div>
                {selectedPeaoProfile ? (
                  <div className="profile-container fade-in" style={{ padding: 0, maxWidth: '100%' }}>
                    <button className="back-btn" onClick={() => {
                      setSelectedPeaoProfile(null);
                      window.history.pushState({}, '', '/');
                    }} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                      Voltar para o Ranking
                    </button>

                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Perfil do Competidor</h2>
                    <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Perfil público registrado na base do RodeoApp.</p>

                    <div className="profile-card" style={{ marginBottom: '2rem' }}>
                      {/* Left Column: Avatar & Role */}
                      <div className="profile-sidebar">
                        <div className="profile-avatar-wrapper">
                          <img 
                            src={selectedPeaoProfile.foto || "/novacontasfoto.jpg"} 
                            alt="Foto de Perfil" 
                            className={`profile-avatar ${selectedPeaoProfile.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}`}
                          />
                        </div>
                        
                        <div style={{ marginTop: '1.5rem' }}>
                          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{selectedPeaoProfile.nome}</h3>
                        </div>

                        <span className="badge badge-role" style={{ marginTop: '1rem', background: '#E11D48', color: '#fff' }}>
                          COMPETIDOR
                        </span>

                        {selectedPeaoProfile.veio_do_app_desktop && (
                          <span className="badge badge-rodeoapp" style={{ marginTop: '0.5rem' }}>
                            Sincronizado RodeoApp
                          </span>
                        )}
                      </div>

                      {/* Right Column: Bio & Data */}
                      <div className="profile-details">
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                          <label>Cidade / Estado</label>
                          <div className="read-only-field">{selectedPeaoProfile.cidade || (selectedPeaoProfile.endereco ? selectedPeaoProfile.endereco.split(',').pop()?.trim() : 'Não informado')}</div>
                        </div>

                        <div className="form-group">
                          <label>Biografia</label>
                          <div className="read-only-field" style={{ minHeight: '80px' }}>
                            {selectedPeaoProfile.bio || 'Este competidor ainda não adicionou uma biografia.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="profile-history-section" style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Histórico de Eventos</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedPeaoProfile.historico && selectedPeaoProfile.historico.length > 0 ? (
                          selectedPeaoProfile.historico.map((hist: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: 0, fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{hist.eventoNome} <span style={{ color: '#E11D48', fontSize: '0.9rem', padding: '0.2rem 0.6rem', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '6px' }}>{hist.posicao}º Lugar</span></h4>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{hist.cidade}</span>
                              </div>
                              
                            </div>
                          ))
                        ) : (
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum histórico encontrado para este competidor.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Eventos Oficiais</h2>
                    <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Acompanhe os rodeios aprovados, pontuações e detalhes dos eventos do circuito.</p>
                    
                    {filteredEvents.length === 0 ? (
                      <div className="empty-state">
                        <p>Nenhum evento oficial disponível no momento.</p>
                      </div>
                    ) : (
                      <div className="events-grid">
                        {filteredEvents.map(ev => (
                          <div key={ev.id} onClick={() => { window.history.pushState({}, '', '/evento/' + slugify(ev.nome)); setPublicEventSlug(slugify(ev.nome)); setSelectedEvent(ev); setSelectedRankingDay('Geral'); setEventTab('home'); }} className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                              {ev.detalhes?.logo ? (
                                <img src={ev.detalhes.logo} alt={ev.nome} style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', padding: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                              ) : (
                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>LOGO</div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <span className="event-date" style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{ev.tipo || 'RODEIO'}</span>
                                <h3 className="event-name" style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2, fontWeight: '900', textTransform: 'uppercase' }}>{ev.nome}</h3>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="event-location" style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                  <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                {ev.local || ev.cidade}
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                {ev.detalhes?.diretor || 'Diretor'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FEED TAB */}
            {currentTab === 'feed' && (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Feed de Notícias</h2>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Fique por dentro de tudo o que acontece no mundo do rodeio.</p>
                
                <div className="news-grid">
                  {filteredNews.map(post => {
                    const rawId = String(post.id).replace('dynamic-', '');
                    const cleanSummary = (post.description || '')
                      .split('\n')
                      .filter((p: string) => p.trim().length > 0)[1] || post.description || '';
                    const summaryText = cleanSummary.length > 150 ? cleanSummary.slice(0, 150) + '...' : cleanSummary;
                    
                    return (
                      <div key={post.id} className="news-card" onClick={() => navigateTo(`/noticia/${rawId}`)} style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}>
                        <div className="news-meta">
                          <span className="news-category">{post.category}</span>
                          <span className="news-time">{post.time}</span>
                        </div>
                        <h3 className="news-title">{post.title}</h3>
                        <p className="news-description">{summaryText}</p>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                          Leia a matéria completa &rarr;
                        </span>
                      </div>
                    );
                  })}
                  {filteredNews.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Nenhuma notícia encontrada para a busca "{searchTerm}".
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BOIADAS TAB */}
            {currentTab === 'boiadas' && (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Boiadas Oficiais</h2>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Consulte as companhias parceiras e a lista oficial de touros de rodeio.</p>
                
                {isBoiadasLoading ? (
                  <div style={{ color: 'var(--primary)', fontWeight: 600, textAlign: 'center', padding: '3rem' }}>Carregando boiadas...</div>
                ) : (
                  <div className="boiadas-grid">
                    {filteredBoiadas.map(b => {
                      const totalBulls = Object.keys(b.lados || {}).length;
                      return (
                        <div key={b.id} className="boiada-card" onClick={() => {
                          window.scrollTo(0, 0);
                          navigateTo(`/boiada/${slugify(b.nome)}`);
                        }}>
                          <h3 className="boiada-card-title">{b.nome}</h3>
                          <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                            {totalBulls} {totalBulls === 1 ? 'TOURO CADASTRADO' : 'TOUROS CADASTRADOS'}
                          </div>
                          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <span className="badge badge-rodeoapp" style={{ margin: 0, fontSize: '0.7rem' }}>Ver Touros</span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredBoiadas.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Nenhuma boiada encontrada para a busca "{searchTerm}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MINHA BOIADA TAB (Tropeiro Only) */}
            {currentTab === 'minha-boiada' && (isAdmin || userProfile?.cargo === 'tropeiro') && (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Minha Boiada</h2>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Cadastre e gerencie a lista oficial de touros da sua companhia.</p>
                
                {isTropeiroBoiadaLoading ? (
                  <div style={{ color: 'var(--primary)', fontWeight: 600, textAlign: 'center', padding: '3rem' }}>Carregando dados da boiada...</div>
                ) : !tropeiroBoiada ? (
                  /* Create Boiada flow */
                  <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '24px', padding: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--primary)' }}>Registrar Companhia (CIA)</h3>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>Insira o nome da sua CIA e a lista de touros inicial. O cadastro será enviado para aprovação do administrador do app.</p>
                    
                    <form onSubmit={handleCreateTropeiroBoiada} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">Nome da Companhia / CIA</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Ex: CIA DE RODEIO RANCHO DE PRATA" 
                          value={newBoiadaCiaName} 
                          onChange={(e) => setNewBoiadaCiaName(e.target.value)} 
                          required 
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Lista de Touros (Um por linha)</label>
                        <textarea 
                          className="form-input" 
                          style={{ minHeight: '150px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.9rem' }}
                          placeholder="Touro 1&#10;Touro 2&#10;Touro 3" 
                          value={bulkBullsText} 
                          onChange={(e) => setBulkBullsText(e.target.value)} 
                          required 
                        />
                      </div>
                      
                      <button type="submit" className="btn btn-primary" style={{ padding: '1rem', marginTop: '1rem' }} disabled={isCreatingBoiada}>
                        {isCreatingBoiada ? 'Registrando...' : 'Registrar e Enviar para Aprovação'}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Manage Boiada flow */
                  <div>
                    {/* Header Info & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.75rem', margin: 0, textTransform: 'uppercase' }}>{tropeiroBoiada.nome}</h3>
                        <p className="text-muted" style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                          Proponente: <strong>{tropeiroBoiada.lados?.__meta?.tropeiro_email}</strong>
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {tropeiroBoiada.lados?.__meta?.status === 'pendente' ? (
                          <span className="badge badge-rodeoapp" style={{ animation: 'badgeGlow 1.5s infinite alternate', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Aguardando Aprovação
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.15)', border: '1px solid #2ecc71', color: '#2ecc71', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                              Aprovada & Oficial
                            </span>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={handleCopyBoiadaLink}
                              title="Copiar link público da boiada"
                            >
                              🔗 Link Público
                            </button>
                          </div>
                        )}
                        
                        <button 
                          className="btn btn-primary" 
                          style={{ margin: 0, padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                          onClick={() => {
                            setEditingBullName(null);
                            setBullForm({ nome: '', lado: 'Esquerdo', foto: '', video_url: '' });
                            setIsEditBullModalOpen(true);
                          }}
                        >
                          + Adicionar Touro
                        </button>
                      </div>
                    </div>
                    
                    {/* Bulls list */}
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                      Touros Cadastrados ({Object.keys(tropeiroBoiada.lados || {}).filter(k => k !== '__meta').length})
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                      {Object.keys(tropeiroBoiada.lados || {}).filter(k => k !== '__meta').map(bullName => {
                        const side = tropeiroBoiada.lados[bullName];
                        const details = tropeiroBoiada.lados?.__meta?.touros_info?.[bullName] || {};
                        const hasVideo = !!details.video_url && getYoutubeId(details.video_url);
                        
                        return (
                          <div key={bullName} style={{ position: 'relative', height: '300px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', border: '2px solid rgba(255,255,255,0.1)' }}>
                            <img 
                              src={details.foto || "/tourosfoto.jpg"} 
                              alt="Foto do Touro" 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                            />
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)', zIndex: 1 }} />
                            
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2, display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                              <button 
                                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backdropFilter: 'blur(4px)' }}
                                onClick={() => {
                                  setEditingBullName(bullName);
                                  setBullForm({
                                    nome: bullName,
                                    lado: side,
                                    foto: details.foto || '',
                                    video_url: details.video_url || ''
                                  });
                                  setIsEditBullModalOpen(true);
                                }}
                                title="Editar Touro"
                              >
                                ✏️
                              </button>
                              <button 
                                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid #ff4444', color: '#ff4444', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backdropFilter: 'blur(4px)' }}
                                onClick={() => handleDeleteBull(bullName)}
                                title="Excluir Touro"
                              >
                                🗑️
                              </button>
                            </div>

                            <span className={`bull-side side-${side.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 3, fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: '4px' }}>
                              Lado {formatSide(side)}
                            </span>

                            <div style={{ position: 'relative', zIndex: 2, padding: '1.5rem' }}>
                              <div style={{ marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1.5rem', lineHeight: '1', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                                  {bullName}
                                </h4>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#ddd', fontWeight: 300 }}>
                                  {tropeiroBoiada.nome}
                                </p>
                                {hasVideo && (
                                  <button 
                                    style={{ background: 'rgba(255,0,0,0.8)', border: 'none', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}
                                    onClick={() => {
                                      const vid = getYoutubeId(details.video_url);
                                      if (vid) setActiveYoutubeVideoId(vid);
                                    }}
                                  >
                                    ▶ Pulo
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {Object.keys(tropeiroBoiada.lados || {}).filter(k => k !== '__meta').length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          Nenhum touro cadastrado nesta boiada. Clique no botão "+ Adicionar Touro" para começar.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MY PROFILE TAB */}
            {currentTab === 'profile' && (
              <div className="profile-container" style={{ padding: 0, maxWidth: '100%' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Meu Perfil</h2>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Gerencie suas informações pessoais, altere sua foto de exibição e edite sua biografia.</p>
                
                <div className="profile-card">
                  {/* Left Column: Avatar & Role */}
                  <div className="profile-sidebar">
                    <div className="profile-avatar-wrapper">
                      <img 
                        src={userFoto || "/novacontasfoto.jpg"} 
                        alt="Foto de Perfil" 
                        className={`profile-avatar ${isAdmin ? 'admin-pulsing-avatar' : userProfile?.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}`}
                      />
                    </div>
                    <label className="photo-upload-btn">
                      Alterar Foto
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    
                    <div style={{ marginTop: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{userProfile?.nome}</h3>
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>{user?.email}</p>
                    </div>

                    <span className={`badge ${isAdmin ? 'badge-primary' : ''}`} style={isAdmin ? { background: '#00ff00', color: '#000', fontWeight: 'bold' } : {}}>
                      {isAdmin ? 'Admin' : userProfile?.cargo ? userProfile.cargo.replace('_', ' ') : 'Membro'}
                    </span>

                    {userProfile?.veio_do_app_desktop && (
                      <span className="badge badge-rodeoapp" style={{ marginTop: '0.5rem' }}>
                        Sincronizado RodeoApp
                      </span>
                    )}

                    <button 
                      className="photo-upload-btn" 
                      style={{ marginTop: '1.5rem', width: '100%', fontSize: '0.8rem', padding: '0.6rem 1rem' }}
                      onClick={handleCopyShareLink}
                    >
                      🔗 Copiar Link Público
                    </button>
                  </div>

                  {/* Right Column: Bio & Details */}
                  <div className="profile-details">
                    <div>
                      <h4 className="profile-section-title">Sobre Mim (Biografia)</h4>
                      <textarea 
                        className="profile-bio-textarea" 
                        placeholder="Escreva um pouco sobre a sua carreira no rodeio, conquistas, etc..."
                        value={userBio}
                        onChange={(e) => setUserBio(e.target.value)}
                      />
                      <button 
                        className="btn btn-primary mt-2" 
                        style={{ padding: '0.75rem 2rem' }}
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                      >
                        {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 className="profile-section-title" style={{ margin: 0 }}>Informações Pessoais</h4>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => {
                          setEditProfileForm({...userProfile});
                          setIsProfileEditModalOpen(true);
                        }}>
                          Editar
                        </button>
                      </div>
                      <div className="profile-info-grid">
                        <div className="profile-info-item">
                          <span className="profile-info-label">WhatsApp</span>
                          <span className="profile-info-value">{userProfile?.whatsapp || '-'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">CPF</span>
                          <span className="profile-info-value">{userProfile?.cpf || '-'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">RG</span>
                          <span className="profile-info-value">{userProfile?.rg || '-'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">Data de Nascimento</span>
                          <span className="profile-info-value">{userProfile?.nascimento ? formatBirthDate(userProfile.nascimento) : '-'}</span>
                        </div>
                        <div className="profile-info-item">
                          <span className="profile-info-label">Endereço</span>
                          <span className="profile-info-value">{userProfile?.endereco || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {isAdmin && (
            <button className={`mobile-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setCurrentTab('dashboard'); setSearchTerm(''); }} style={{ color: currentTab === 'dashboard' ? '#00ff00' : 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Admin
            </button>
          )}
          <button className={`mobile-nav-item ${currentTab === 'explore' ? 'active' : ''}`} onClick={() => { setCurrentTab('explore'); setSearchTerm(''); }}>
            <svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Eventos
          </button>
          <button className={`mobile-nav-item ${currentTab === 'feed' ? 'active' : ''}`} onClick={() => { setCurrentTab('feed'); setSearchTerm(''); }}>
            <svg viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            Feed
          </button>
          <button className={`mobile-nav-item ${currentTab === 'boiadas' ? 'active' : ''}`} onClick={() => { setCurrentTab('boiadas'); setSearchTerm(''); }}>
            <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            Boiadas
          </button>
          <button className={`mobile-nav-item ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => { setCurrentTab('profile'); setSearchTerm(''); }}>
            <svg viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Perfil
          </button>
        </nav>
      </div>

      {/* ==================================== */}
      {/* MODAL EDITAR PERFIL */}
      {/* ==================================== */}
      <div className={`modal-overlay ${isProfileEditModalOpen && editProfileForm ? 'active' : ''}`}>
        <div className="auth-modal" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
          <button className="close-btn" onClick={() => setIsProfileEditModalOpen(false)}>×</button>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', textTransform: 'uppercase' }}>Editar Minhas Informações</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSavingProfile(true);
            try {
              const { error } = await supabase.from('perfis_portal').update({
                nome: editProfileForm.nome,
                whatsapp: editProfileForm.whatsapp,
                cpf: editProfileForm.cpf,
                rg: editProfileForm.rg,
                nascimento: editProfileForm.nascimento,
                endereco: editProfileForm.endereco,
                instagram: editProfileForm.instagram,
                facebook: editProfileForm.facebook,
                twitter: editProfileForm.twitter,
                link: editProfileForm.link,
                capa: editProfileForm.capa
              }).eq('id', userProfile.id);

              if (error) {
                alert("Erro ao atualizar informações no banco de dados:\n" + error.message);
                setIsSavingProfile(false);
                return;
              }

              setUserProfile({...userProfile, ...editProfileForm});
              setIsProfileEditModalOpen(false);
              alert("Informações atualizadas com sucesso!");
            } catch (err: any) {
              alert("Erro de conexão ao atualizar informações: " + err?.message);
            } finally {
              setIsSavingProfile(false);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div>
              <label className="form-label">Capa do Perfil</label>
              {editProfileForm?.capa && (
                <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <img src={editProfileForm.capa} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setEditProfileForm({...editProfileForm, capa: ''})} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(255,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              )}
              <label className="btn btn-outline" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                {editProfileForm?.capa ? 'Trocar Capa' : 'Enviar Foto de Capa'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setEditProfileForm({...editProfileForm, capa: reader.result as string});
                    reader.readAsDataURL(file);
                  }
                }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Nome Completo</label>
                <input className="form-input" value={editProfileForm?.nome || ''} onChange={e => setEditProfileForm({...editProfileForm, nome: e.target.value})} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Link Personalizado (@)</label>
                <input className="form-input" placeholder="ex: joaosilva" value={editProfileForm?.link || ''} onChange={e => setEditProfileForm({...editProfileForm, link: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">WhatsApp</label>
                <input className="form-input" placeholder="(00) 00000-0000" value={editProfileForm?.whatsapp || ''} onChange={e => setEditProfileForm({...editProfileForm, whatsapp: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Data de Nascimento</label>
                <input className="form-input" type="date" value={editProfileForm?.nascimento || ''} onChange={e => setEditProfileForm({...editProfileForm, nascimento: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">CPF</label>
                <input className="form-input" value={editProfileForm?.cpf || ''} onChange={e => setEditProfileForm({...editProfileForm, cpf: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">RG</label>
                <input className="form-input" value={editProfileForm?.rg || ''} onChange={e => setEditProfileForm({...editProfileForm, rg: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="form-label">Endereço Completo</label>
              <input className="form-input" placeholder="Rua, Número, Cidade, Estado" value={editProfileForm?.endereco || ''} onChange={e => setEditProfileForm({...editProfileForm, endereco: e.target.value})} />
            </div>

            <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Redes Sociais</h3>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Instagram</label>
                <input className="form-input" placeholder="@usuario ou Link" value={editProfileForm?.instagram || ''} onChange={e => setEditProfileForm({...editProfileForm, instagram: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Facebook</label>
                <input className="form-input" placeholder="Link do Perfil" value={editProfileForm?.facebook || ''} onChange={e => setEditProfileForm({...editProfileForm, facebook: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="form-label">Twitter / X</label>
              <input className="form-input" placeholder="@usuario ou Link" value={editProfileForm?.twitter || ''} onChange={e => setEditProfileForm({...editProfileForm, twitter: e.target.value})} />
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={isSavingProfile}>
              {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      </div>

      {/* ==================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE LOGOUT */}
      {/* ==================================== */}
      <div className={`modal-overlay ${isLogoutConfirmOpen ? 'active' : ''}`}>
        <div className="auth-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Sair da Conta</h2>
          <p className="modal-subtitle" style={{ marginBottom: '2rem' }}>Tem certeza que deseja sair do portal do competidor?</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsLogoutConfirmOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#ff4444', color: '#fff' }} onClick={handleLogout}>Sim, Sair</button>
          </div>
        </div>
      </div>

      {/* ==================================== */}

      {/* ==================================== */}
      {/* MODAL DE EDIÇÃO/CADASTRO DE TOURO */}
      {/* ==================================== */}
      {isEditBullModalOpen && (
        <div className="modal-overlay active">
          <div className="auth-modal" style={{ maxWidth: '500px' }}>
            <button className="close-btn" onClick={() => { setIsEditBullModalOpen(false); setEditingBullName(null); }}>×</button>
            <h2 className="modal-title">{editingBullName ? 'Editar Touro' : 'Adicionar Touro'}</h2>
            <p className="modal-subtitle">Insira as informações do touro da sua companhia.</p>
            
            <form onSubmit={handleSaveBull} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nome do Touro</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Corte Seco" 
                  value={bullForm.nome} 
                  onChange={(e) => setBullForm({ ...bullForm, nome: e.target.value })} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Direção de Giro (Lado)</label>
                <select 
                  className="form-select" 
                  value={bullForm.lado} 
                  onChange={(e) => setBullForm({ ...bullForm, lado: e.target.value })}
                  required
                >
                  <option value="Esquerdo">Errado (E)</option>
                  <option value="Direito">Certo (C)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Foto do Touro (Upload)</label>
                {bullForm.foto && (
                  <div style={{ marginBottom: '0.75rem', position: 'relative', width: '100px', height: '100px' }}>
                    <img 
                      src={bullForm.foto} 
                      alt="Preview" 
                      style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setBullForm({ ...bullForm, foto: '' })}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                    >
                      ×
                    </button>
                  </div>
                )}
                <label className="photo-upload-btn" style={{ display: 'inline-block', margin: 0, textAlign: 'center' }}>
                  Selecionar Foto
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setBullForm({ ...bullForm, foto: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">Link do Vídeo no YouTube</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  value={bullForm.video_url} 
                  onChange={(e) => setBullForm({ ...bullForm, video_url: e.target.value })} 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setIsEditBullModalOpen(false); setEditingBullName(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* MODAL DE PLAYER DE VÍDEO DO YOUTUBE */}
      {/* ==================================== */}
      {activeYoutubeVideoId && (
        <div className="modal-overlay active" onClick={() => setActiveYoutubeVideoId(null)}>
          <div className="auth-modal" style={{ maxWidth: '640px', padding: '1rem', background: '#000', border: '1px solid var(--border-light)' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" style={{ top: '10px', right: '10px', zIndex: 10 }} onClick={() => setActiveYoutubeVideoId(null)}>×</button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
              <iframe 
                src={`https://www.youtube.com/embed/${activeYoutubeVideoId}?autoplay=1`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* MODAL DE GERAR NOTÍCIA COM IA (GEMINI) */}
      {/* ==================================== */}
      {showNewsModal && selectedEvent && (
        <div className="modal-overlay active" onClick={() => !isGeneratingNews && setShowNewsModal(false)}>
          <div className="auth-modal" style={{ maxWidth: '450px', width: '90%', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => !isGeneratingNews && setShowNewsModal(false)}>×</button>
            <h2 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Gerar Notícia</h2>
            <p className="modal-subtitle" style={{ marginBottom: '1.5rem' }}>Selecione qual round você deseja usar para que a IA crie a notícia automaticamente.</p>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Selecione o Round / Dia</label>
              <select 
                className="form-select" 
                value={newsRound} 
                onChange={(e) => setNewsRound(e.target.value)}
                disabled={isGeneratingNews}
              >
                <option value="">Selecione um round...</option>
                {(() => {
                  const days = new Set<string>();
                  (selectedEvent.detalhes?.notas || []).forEach((n: any) => { if (n.dia) days.add(String(n.dia)); });
                  const customSort = (a: string, b: string) => {
                      const strA = String(a || '');
                      const strB = String(b || '');
                      const wA = strA.toUpperCase().includes('FINAL') && !strA.toUpperCase().includes('SEMI') ? 100 : strA.toUpperCase().includes('SEMI') ? 90 : 0;
                      const wB = strB.toUpperCase().includes('FINAL') && !strB.toUpperCase().includes('SEMI') ? 100 : strB.toUpperCase().includes('SEMI') ? 90 : 0;
                      if (wA !== wB) return wA - wB;
                      return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
                  };
                  return Array.from(days).sort(customSort).map(d => (
                    <option key={d} value={d}>{d.replace(/DIA/i, 'ROUND ')}</option>
                  ));
                })()}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ flex: 1 }} 
                onClick={() => setShowNewsModal(false)}
                disabled={isGeneratingNews}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={handleGenerateNews}
                disabled={isGeneratingNews || !newsRound}
              >
                {isGeneratingNews ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
