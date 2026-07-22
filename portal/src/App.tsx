import { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './supabaseClient';
import AdminDashboard from './AdminDashboard';
import { PdfImportModal } from './components/PdfImportModal';


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
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // App Loader States
  const [initialLoading, setInitialLoading] = useState(true);
  const [fadeLoader, setFadeLoader] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
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
  const isAdmin = user?.email === 'g7briellrms@gmail.com' || user?.email === 'admin@rodeoapp.pro' || userProfile?.cargo === 'admin' || userProfile?.cargo === 'administrador' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));
  const [userBio, setUserBio] = useState('');
  const [userFoto, setUserFoto] = useState('');
  const initialTab = (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) ? 'dashboard' : 'home';
  const [currentTab, setCurrentTab] = useState<'home' | 'explore' | 'feed' | 'boiadas' | 'profile' | 'minha-boiada' | 'dashboard' | 'aovivo'>(initialTab);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [eventosOficiais, setEventosOficiais] = useState<any[]>([]);
  const [patrocinios, setPatrocinios] = useState<any[]>([]);
  const [sponsorAdIndex, setSponsorAdIndex] = useState(0);
  const [sponsorFade, setSponsorFade] = useState(true);

  // Rotate sponsor ads every 45 seconds with smooth fade
  useEffect(() => {
    if (!patrocinios || patrocinios.length <= 1) return;
    const interval = setInterval(() => {
      setSponsorFade(false);
      setTimeout(() => {
        setSponsorAdIndex(prev => prev + 1);
        setSponsorFade(true);
      }, 300);
    }, 45000); // 45 segundos

    return () => clearInterval(interval);
  }, [patrocinios]);

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

  // Ao Vivo States
  const [lives, setLives] = useState<any[]>([]);
  const [selectedLive, setSelectedLive] = useState<any>(null);
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const [newAlertText, setNewAlertText] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');
  const [pollOpt3, setPollOpt3] = useState('');
  const [pollOpt4, setPollOpt4] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionIndex, setVotedOptionIndex] = useState<number | null>(null);

  // Rotation timer for important alerts cycling banner
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAlertIndex(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check if user has voted in the current active poll
  useEffect(() => {
    if (selectedLive?.id) {
      const voted = localStorage.getItem(`voted_poll_${selectedLive.id}`);
      if (voted !== null) {
        setHasVoted(true);
        setVotedOptionIndex(parseInt(voted, 10));
      } else {
        setHasVoted(false);
        setVotedOptionIndex(null);
      }
    }
  }, [selectedLive?.id, selectedLive?.enquete]);
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [liveOnlineCounts, setLiveOnlineCounts] = useState<{[key: number]: number}>({});
  const [ytOnlineCounts, setYtOnlineCounts] = useState<{[key: number]: number}>({});
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [liveAdmins, setLiveAdmins] = useState<string[]>([]);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [bannedUsersList, setBannedUsersList] = useState<any[]>([]);
  const [timeoutUsersList, setTimeoutUsersList] = useState<any[]>([]);
  const [liveChatChannel, setLiveChatChannel] = useState<any>(null);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [spamMessageTracker, setSpamMessageTracker] = useState<{text: string, count: number}>({ text: '', count: 0 });
  const [isUserBanned, setIsUserBanned] = useState(false);
  const [userTimeoutUntil, setUserTimeoutUntil] = useState<Date | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');

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
  const [loadingBoiadaLogo, setLoadingBoiadaLogo] = useState<string | null>(null);

  // Favorites State
  const [favorites, setFavorites] = useState<{ eventos: string[], competitors: string[], cias: string[] }>({
    eventos: [],
    competitors: [],
    cias: []
  });
  const [peaoProfilesList, setPeaoProfilesList] = useState<any[]>([]);

  // Load user favorites from localStorage when user is loaded
  useEffect(() => {
    if (user?.email) {
      const stored = localStorage.getItem(`rodeo_favs_${user.email.toLowerCase()}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFavorites({
            eventos: Array.isArray(parsed.eventos) ? parsed.eventos : [],
            competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
            cias: Array.isArray(parsed.cias) ? parsed.cias : []
          });
        } catch (e) {
          console.error("Error parsing favorites", e);
        }
      } else {
        setFavorites({ eventos: [], competitors: [], cias: [] });
      }
    }
  }, [user]);

  // Toggle favorite utility
  const toggleFavorite = (type: 'eventos' | 'competitors' | 'cias', idOrName: string) => {
    if (!user?.email) return;
    setFavorites(prev => {
      const current = prev[type] || [];
      const updatedList = current.includes(idOrName)
        ? current.filter(x => x !== idOrName)
        : [...current, idOrName];
      const nextFavs = { ...prev, [type]: updatedList };
      localStorage.setItem(`rodeo_favs_${user.email!.toLowerCase()}`, JSON.stringify(nextFavs));
      return nextFavs;
    });
  };

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase.from('perfis_portal').select('*');
      if (error) throw error;
      setPeaoProfilesList(data || []);
    } catch (err) {
      console.error("Error fetching profiles:", err);
    }
  };

  const [publicEventSlug, setPublicEventSlug] = useState<string | null>(null);
  const [isPublicEventLoading, setIsPublicEventLoading] = useState(false);
  const [publicNewsId, setPublicNewsId] = useState<string | null>(null);
  const [publicNews, setPublicNews] = useState<any>(null);
  const [currentArticleAd, setCurrentArticleAd] = useState<any>(null);
  const [thinBylineAd, setThinBylineAd] = useState<any>(null);
  const [aboveIaAd, setAboveIaAd] = useState<any>(null);
  const [gridMainAd, setGridMainAd] = useState<any>(null);

  useEffect(() => {
    if (publicNewsId && patrocinios.length > 0) {
      const portalSponsors = patrocinios.filter((p: any) => {
        if (!p.detalhes || Object.keys(p.detalhes).length === 0) {
          return p.tipo === 'portal';
        }
        return p.detalhes?.portal_noticias?.ativo === true;
      });

      if (portalSponsors.length > 0) {
        const getSponsorForPlacement = (placement: string) => {
          const validSponsors = portalSponsors.filter((p: any) => {
            if (!p.detalhes || Object.keys(p.detalhes).length === 0) {
              return !!p.logo_url;
            }
            if (placement === 'fino_redacao') return !!p.detalhes.portal_noticias?.fino_redacao?.logo_url;
            if (placement === 'meio_materia') return !!p.detalhes.portal_noticias?.meio_materia?.logo_url;
            if (placement === 'fino_ia') return !!p.detalhes.portal_noticias?.fino_ia?.logo_url;
            if (placement === 'grid_main') return !!p.detalhes.portal_noticias?.grid_lateral?.main?.logo_url;
            return false;
          });

          if (validSponsors.length === 0) return null;
          const selected = validSponsors[Math.floor(Math.random() * validSponsors.length)];
          
          if (!selected.detalhes || Object.keys(selected.detalhes).length === 0) {
            return {
              id: selected.id,
              nome: selected.empresa,
              logo_url: selected.logo_url,
              click_url: selected.click_url || '#'
            };
          }

          let art = null;
          if (placement === 'fino_redacao') art = selected.detalhes.portal_noticias?.fino_redacao;
          else if (placement === 'meio_materia') art = selected.detalhes.portal_noticias?.meio_materia;
          else if (placement === 'fino_ia') art = selected.detalhes.portal_noticias?.fino_ia;
          else if (placement === 'grid_main') art = selected.detalhes.portal_noticias?.grid_lateral?.main;
          
          return {
            id: selected.id,
            nome: selected.empresa,
            logo_url: art?.logo_url,
            click_url: art?.click_url || '#'
          };
        };

        const adByline = getSponsorForPlacement('fino_redacao');
        const adMeio = getSponsorForPlacement('meio_materia');
        const adIa = getSponsorForPlacement('fino_ia');
        const adGridMain = getSponsorForPlacement('grid_main');

        setCurrentArticleAd(adMeio);
        setThinBylineAd(adByline);
        setAboveIaAd(adIa);
        setGridMainAd(adGridMain);

        // Track impressions
        const uniqueSponsorIds = Array.from(new Set([
          adByline?.id,
          adMeio?.id,
          adIa?.id,
          adGridMain?.id
        ].filter(Boolean)));

        if (uniqueSponsorIds.length > 0) {
          fetch('https://api.rodeoapp.pro/api/sponsors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: uniqueSponsorIds })
          }).catch(err => console.error("Error sending sponsor impressions:", err));
        }
      } else {
        setCurrentArticleAd(null);
        setThinBylineAd(null);
        setAboveIaAd(null);
        setGridMainAd(null);
      }
    } else if (!publicNewsId) {
      setCurrentArticleAd(null);
      setThinBylineAd(null);
      setAboveIaAd(null);
      setGridMainAd(null);
    }
  }, [publicNewsId, patrocinios]);

  const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');
  const [expandedReRides, setExpandedReRides] = useState<Record<string, boolean>>({});
  const toggleReRide = (peaoName: string) => setExpandedReRides(p => ({...p, [peaoName]: !p[peaoName]}));
  const [verifiedCpfs, setVerifiedCpfs] = useState<Set<string>>(new Set());
  const [eventTab, setEventTab] = useState<'home'|'ranking'|'sorteios'|'competidores'|'boiadas'|'noticias'|'midia'>('home');
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
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

  const getConsonantPattern = (slug: string) => {
    return '%' + slug.toLowerCase().replace(/[aeiouy]/g, '%').split('').filter((c, i, a) => c !== '%' || a[i-1] !== '%').join('') + '%';
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

    let currentEvent = details?.escalado_no_evento || null;
    if (!currentEvent) {
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
            const isSubstituida = n.status === 'substituida' || n.status === 'nota_baixa' || n.status === 'tropeiro';
            const isParada = typeof n.tempo === 'number' && n.tempo >= 8 && n.totalPeao > 0;

            if (!isSubstituida) {
              totalOuts++;
              if (isParada) {
                paradas++;
                if (runScore >= 90) {
                  notas90Plus++;
                }
              }
            }

            runs.push({
              eventoNome: ev.nome,
              touro: n.touro,
              tempo: n.tempo,
              score: runScore,
              dia: n.dia,
              status: isSubstituida ? 'Re-Ride' : (isParada ? 'Parada' : 'Queda')
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
          let matchedProfile = data ? data.find((p: any) => p.nome && p.nome.replace(/\s+/g, '').toLowerCase() === slug) : null;
          
          if (!matchedProfile) {
            // Tentar achar nos rankings dos eventos (perfil gerado automaticamente)
            for (const ev of eventosOficiais) {
              if (ev.detalhes?.ranking) {
                const comp = ev.detalhes.ranking.find((r: any) => {
                  const rSlug = r.slug || (r.nome ? r.nome.replace(/\s+/g, '').toLowerCase() : '');
                  return rSlug === slug;
                });
                if (comp) {
                  matchedProfile = {
                    nome: comp.nome,
                    cpf: comp.cpf || '',
                    cargo: 'Competidor',
                    bio: 'Perfil de competidor do HZN Rodeo.',
                    foto: ''
                  };
                  break;
                }
              }
            }
          }

          if (matchedProfile) {
            // Calcular historico
            const historico: any[] = [];
            const cleanCpf = matchedProfile.cpf ? matchedProfile.cpf.replace(/\D/g, '') : '';
            
            eventosOficiais.forEach(ev => {
              if (!ev.detalhes?.ranking) return;
              
              const sortedRanking = [...ev.detalhes.ranking].map((p: any) => {
                const peaoNotas = (ev.detalhes.notas || []).filter((n: any) => n.peao === p.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
                let total = p.score || 0;
                if (peaoNotas.length > 0) {
                  let sum = 0;
                  peaoNotas.forEach((n: any) => {
                    if (n.totalPeao > 0 && n.tempo >= 8) sum += (n.totalPeao + n.totalTouro);
                  });
                  total = sum;
                }
                return { ...p, score: total };
              }).sort((a: any, b: any) => {
                if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                return (b.tempoAcumulado || 0) - (a.tempoAcumulado || 0);
              });

              const rankIndex = sortedRanking.findIndex((r: any) => {
                const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
                if (cleanCpf && rCpf && cleanCpf === rCpf) return true;
                if (r.nome && matchedProfile.nome) {
                  return r.nome.replace(/\s+/g, '').toLowerCase() === matchedProfile.nome.replace(/\s+/g, '').toLowerCase();
                }
                return false;
              });

              if (rankIndex !== -1) {
                historico.push({
                  eventoNome: ev.nome,
                  cidade: ev.local || ev.cidade,
                  posicao: rankIndex + 1,
                  slug: slugify(ev.nome)
                });
              }
            });
            
            setSelectedPeaoProfile({ ...matchedProfile, historico });
            setCurrentTab('explore'); // ir para aba Eventos (antiga Explore)
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

  const fetchYouTubeViewersCount = async (currentLives: any[]) => {
    if (!currentLives || currentLives.length === 0) return;
    const urls = currentLives.map(l => l.link_live || l.link).filter(Boolean);
    if (urls.length === 0) return;

    const endpoints = [
      "/api/youtube-viewers",
      "https://rodeoapp.pro/api/youtube-viewers",
      "https://admin.rodeoapp.pro/api/youtube-viewers"
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrls: urls })
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.success && data.viewersMap) {
          const newMap: {[key: number]: number} = {};
          currentLives.forEach(l => {
            const urlStr = l.link_live || l.link;
            if (urlStr && data.viewersMap[urlStr] !== undefined) {
              newMap[l.id] = data.viewersMap[urlStr];
            }
          });
          setYtOnlineCounts(prev => ({ ...prev, ...newMap }));
          break;
        }
      } catch (err) {
        console.warn(`Erro ao buscar espectadores no endpoint ${endpoint}:`, err);
      }
    }
  };

  const fetchLives = async () => {
    try {
      const { data, error } = await supabase.from('transmissoes_aovivo').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setLives(data);
        fetchYouTubeViewersCount(data);
      }
    } catch (err) {
      console.error('Erro ao buscar transmissões ao vivo:', err);
    }
  };

  const getSponsorImage = (s: any) => {
    if (!s) return null;
    const banner720x90 = 
      s.detalhes?.portal_noticias?.fino_redacao?.logo_url || 
      s.detalhes?.banner_url || 
      s.detalhes?.portal_noticias?.meio_materia?.logo_url || 
      s.detalhes?.fino_ia?.logo_url;
    return banner720x90 || null;
  };

  const renderSponsorAdBanner = (slotKey: string) => {
    if (!patrocinios || patrocinios.length === 0) return null;

    const activeSponsors = patrocinios.filter((p: any) => {
      if (p.status && p.status !== 'ativo') return false;
      return !!getSponsorImage(p);
    });

    if (activeSponsors.length === 0) return null;

    const slotOffset = slotKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const currentIndex = (sponsorAdIndex + slotOffset) % activeSponsors.length;
    const sponsor = activeSponsors[currentIndex];
    const bannerUrl = getSponsorImage(sponsor);

    if (!bannerUrl) return null;

    return (
      <a
        href={sponsor.click_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          width: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          marginBottom: '0.75rem',
          marginTop: '0.25rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          opacity: sponsorFade ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          background: '#050505',
          textDecoration: 'none'
        }}
        className="sponsor-banner-hover"
      >
        <img
          src={bannerUrl}
          alt={sponsor.empresa || sponsor.nome || 'Patrocinador Oficial'}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '120px',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </a>
    );
  };

  useEffect(() => {
    if (lives.length > 0) {
      const interval = setInterval(() => {
        fetchYouTubeViewersCount(lives);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [lives]);

  const handleGenerateNews = async () => {
    if (!isAdmin) return alert("Apenas o Administrador do portal pode gerar notícias com IA.");
    if (!newsRound) return alert("Selecione o Round / Dia.");
    
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      try {
        const { data: configData } = await supabase
          .from('portal_configs')
          .select('value')
          .eq('key', 'gemini_api_key')
          .maybeSingle();
        apiKey = configData?.value || '';
      } catch (err) {
        console.error('Erro ao buscar chave API do Gemini no Supabase:', err);
      }
    }
    
    if (!apiKey) {
      apiKey = localStorage.getItem('hzn_gemini_api_key') || '';
    }
    
    if (!apiKey) {
      const inputKey = prompt("Chave de API do Gemini não configurada globalmente no painel admin. Por favor, cole a sua chave API temporária do Google AI Studio para prosseguir:");
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
          id: crypto.randomUUID(),
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
    const initApp = async () => {
      // Helper function to preload images
      const preloadImages = (urls: string[]): Promise<void[]> => {
        return Promise.all(
          urls.map(url => {
            return new Promise<void>((resolve) => {
              if (!url) {
                resolve();
                return;
              }
              const img = new Image();
              img.src = url;
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          })
        );
      };

      // Animate progress bar organically to about 85%
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 8) + 4;
        if (progress > 85) {
          clearInterval(progressInterval);
        } else {
          setLoadingProgress(progress);
        }
      }, 70);

      // Start fetching db data and session
      const dbPromises = [
        fetchEventosOficiais(),
        fetchPatrocinios(),
        checkSession(),
        fetchAllProfiles(),
        fetchLives()
      ];

      try {
        await Promise.all(dbPromises);
      } catch (err) {
        console.error("Database fetch error:", err);
      }

      // Preload essential images
      const essentialImages = [
        '/splash_logo.png',
        '/header_logo.png',
        '/maiorqualidade.jpg'
      ];
      try {
        await preloadImages(essentialImages);
      } catch (err) {
        console.error("Image preloading error:", err);
      }

      // Finish progress bar to 100%
      clearInterval(progressInterval);
      setLoadingProgress(100);

      // Start the fadeout animation
      setTimeout(() => {
        setFadeLoader(true);
        setTimeout(() => {
          setInitialLoading(false);
        }, 800); // matches transition duration
      }, 500);
    };

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
          setCurrentTab('home');
        }
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuth = localStorage.getItem('hzn_portal_authenticated') === 'true';
      
      if (event === 'SIGNED_IN' && !isAuth) {
        const isSignupFlow = registerStep === 'otp';
        if (isSignupFlow) {
          localStorage.setItem('hzn_portal_authenticated', 'true');
          setUser(session?.user ?? null);
          if (session?.user?.email) {
            fetchUserProfile(session.user.email);
            fetchBoiadas();
            fetchTropeiroBoiada(session.user.email);
            setCurrentTab('home');
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
          setCurrentTab(prev => prev === 'explore' ? 'home' : prev);
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
  }, [registerStep, authMode]);

  useEffect(() => {
    const channel = supabase
      .channel('portal_realtime_events_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_oficiais' }, (payload) => {
        if (payload.new) {
          const updatedEv = payload.new as EventoOficial;
          setEventosOficiais(prev => {
            const isMatch = (e: EventoOficial) =>
              String(e.id) === String(updatedEv.id) ||
              (e.nome && updatedEv.nome && e.nome.trim().toLowerCase() === updatedEv.nome.trim().toLowerCase());

            const index = prev.findIndex(isMatch);
            if (index >= 0) {
              const copy = [...prev];
              copy[index] = updatedEv;
              return copy;
            } else {
              return [updatedEv, ...prev];
            }
          });
          setSelectedEvent(prev => {
            if (!prev) return prev;
            const isMatch =
              String(prev.id) === String(updatedEv.id) ||
              (prev.nome && updatedEv.nome && prev.nome.trim().toLowerCase() === updatedEv.nome.trim().toLowerCase());

            if (isMatch) {
              return updatedEv;
            }
            return prev;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transmissoes_aovivo' }, () => {
        fetchLives();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patrocinios' }, () => {
        fetchPatrocinios();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          setPublicNewsId(null);
          setPublicBoiada(null);
          setSelectedEvent(null);
          setPublicNews(null);
          setIsPublicProfileLoading(true);
          try {
            const queryPattern = getConsonantPattern(slug);
            
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
              // Fallback: search in event rankings
              try {
                const { data: evData } = await supabase.from('eventos_oficiais').select('*');
                let foundMatch = null;
                if (evData) {
                  for (const ev of evData) {
                    if (ev.detalhes?.ranking) {
                      const comp = ev.detalhes.ranking.find((r: any) => {
                        const rSlug = r.slug || (r.nome ? slugify(r.nome) : '');
                        return rSlug === slug;
                      });
                      if (comp) {
                        foundMatch = {
                          nome: comp.nome,
                          cpf: comp.cpf || '',
                          cargo: 'Competidor',
                          bio: 'Perfil de competidor.',
                          foto: ''
                        };
                        break;
                      }
                    }
                  }
                }
                
                if (foundMatch) {
                  setPublicProfile(foundMatch);
                  setPublicProfileBio(foundMatch.bio || '');
                  setPublicProfileFoto(foundMatch.foto || '');
                } else {
                  setPublicProfile(null);
                }
              } catch (e) {
                console.error('Error fetching mock public profile:', e);
                setPublicProfile(null);
              }
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
          setPublicEventSlug(null);
          setPublicNewsId(null);
          setPublicProfile(null);
          setSelectedEvent(null);
          setPublicNews(null);
          
          let initialLogo = null;
          if (boiadas && boiadas.length > 0) {
            const preMatch = boiadas.find(b => slugify(b.nome) === slug);
            if (preMatch) {
              initialLogo = preMatch.lados?.__meta?.logo || null;
            }
          }
          setLoadingBoiadaLogo(initialLogo);
          setIsPublicBoiadaLoading(true);
          
          try {
            const queryPattern = getConsonantPattern(slug);
            const { data, error } = await supabase
              .from('boiadas_oficiais')
              .select('*')
              .ilike('nome', queryPattern);
            
            if (error) throw error;
            
            const match = data?.find(b => slugify(b.nome) === slug && (!b.lados?.__meta || b.lados.__meta.status !== 'pendente'));
            if (match) {
              setPublicBoiada(match);
              setLoadingBoiadaLogo(match.lados?.__meta?.logo || null);
            } else {
              setPublicBoiada(null);
            }
          } catch (err) {
            console.error(err);
            setPublicBoiada(null);
          } finally {
            setIsPublicBoiadaLoading(false);
          }
        }
      } else if (path.startsWith('/evento/')) {
        const slug = path.replace('/evento/', '').toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (slug) {
          setPublicEventSlug(slug);
          setPublicProfileSlug(null);
          setPublicBoiadaSlug(null);
          setLoadingBoiadaLogo(null);
          setPublicNewsId(null);
          setPublicProfile(null);
          setPublicBoiada(null);
          setPublicNews(null);
          setIsPublicEventLoading(true);
          try {
            const queryPattern = getConsonantPattern(slug);
            const { data } = await supabase
              .from('eventos_oficiais')
              .select('*')
              .eq('status', 'aprovado')
              .ilike('nome', queryPattern);
            
            const match = data?.find(ev => slugify(ev.nome) === slug);
            setSelectedEvent(match || null);
          } catch (err) {
            console.error(err);
          } finally {
            setIsPublicEventLoading(false);
          }
        }
      } else if (path.startsWith('/noticia/')) {
        const id = path.replace('/noticia/', '');
        if (id) {
          setPublicNewsId(id);
          setPublicProfileSlug(null);
          setPublicBoiadaSlug(null);
          setLoadingBoiadaLogo(null);
          setPublicEventSlug(null);
          setPublicProfile(null);
          setPublicBoiada(null);
          setSelectedEvent(null);
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
            setPublicNews(foundNews ? { article: foundNews, event: foundEvent } : { error: true });
          } catch (err) {
            console.error(err);
            setPublicNews({ error: true });
          }
        }
      } else {
        setPublicProfileSlug(null);
        setPublicProfile(null);
        setPublicBoiadaSlug(null);
        setLoadingBoiadaLogo(null);
        setPublicBoiada(null);
        setPublicEventSlug(null);
        setSelectedEvent(null);
        setPublicNewsId(null);
        setPublicNews(null);
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);


  // Selected Live Chat & Moderation setup
  useEffect(() => {
    if (!selectedLive) {
      if (liveChatChannel) {
        supabase.removeChannel(liveChatChannel);
        setLiveChatChannel(null);
      }
      return;
    }

    const liveId = selectedLive.id;

    const fetchLatestLiveDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('transmissoes_aovivo')
          .select('*')
          .eq('id', liveId)
          .single();
        if (!error && data) {
          setSelectedLive(data);
        }
      } catch (err) {
        console.error("Erro ao buscar detalhes atualizados da live:", err);
      }
    };
    fetchLatestLiveDetails();

    const loadHistory = async () => {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (!error && data) {
        setLiveChatMessages(data);
      }
    };
    loadHistory();

    const checkModeratorStatus = async () => {
      if (!user?.email) return;
      
      if (user.email.toLowerCase() === 'g7briellrms@gmail.com') {
        setIsModerator(true);
        return;
      }

      const { data, error } = await supabase
        .from('chat_admins')
        .select('id')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();
      
      if (!error && data) {
        setIsModerator(true);
      } else {
        setIsModerator(false);
      }
    };
    checkModeratorStatus();

    const fetchChatConfig = async () => {
      const { data, error } = await supabase
        .from('chat_config')
        .select('locked')
        .eq('live_id', liveId)
        .maybeSingle();
      if (!error && data) {
        setIsChatLocked(data.locked);
      } else {
        setIsChatLocked(false);
      }
    };
    fetchChatConfig();

    const checkUserRestrictions = async () => {
      if (!user?.email) return;
      const { data, error } = await supabase
        .from('chat_moderation')
        .select('*')
        .eq('live_id', liveId)
        .eq('email', user.email.toLowerCase())
        .order('created_at', { ascending: false });

      if (!error && data) {
        const activeBan = data.find(m => m.tipo === 'ban');
        if (activeBan) {
          setIsUserBanned(true);
          return;
        }

        const activeTimeout = data.find(m => m.tipo === 'timeout' && new Date(m.until) > new Date());
        if (activeTimeout) {
          setUserTimeoutUntil(new Date(activeTimeout.until));
        } else {
          setUserTimeoutUntil(null);
        }
      }
    };
    checkUserRestrictions();

    const channelName = `live_chat_${liveId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user?.email || `anon_${Math.random().toString(36).substring(2, 7)}`
        }
      }
    });

    channel
      .on('broadcast', { event: 'new_message' }, ({ payload }) => {
        setLiveChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .on('broadcast', { event: 'message_deleted' }, ({ payload }) => {
        setLiveChatMessages(prev => prev.map(m => m.id === payload.id ? { ...m, texto: '(mensagem apagada por um administrador)', is_deleted: true } : m));
      })
      .on('broadcast', { event: 'chat_lock_changed' }, ({ payload }) => {
        setIsChatLocked(payload.locked);
      })
      .on('broadcast', { event: 'user_moderated' }, ({ payload }) => {
        if (user?.email && payload.email.toLowerCase() === user.email.toLowerCase()) {
          if (payload.tipo === 'ban') {
            setIsUserBanned(true);
          } else if (payload.tipo === 'timeout') {
            if (payload.until) {
              setUserTimeoutUntil(new Date(payload.until));
            } else {
              setUserTimeoutUntil(null);
            }
          }
        }
      })
      .on('broadcast', { event: 'poll_updated' }, ({ payload }) => {
        setSelectedLive(prev => prev ? { ...prev, enquete: payload.enquete } : prev);
      })
      .on('broadcast', { event: 'alerts_updated' }, ({ payload }) => {
        setSelectedLive(prev => prev ? { ...prev, alertas: payload.alertas } : prev);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setLiveOnlineCounts(prev => ({ ...prev, [liveId]: count }));
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const profileName = userProfile?.nome || user?.email?.split('@')[0] || 'Espectador';
        const profilePhoto = userProfile?.foto || '';
        await channel.track({
          online_at: new Date().toISOString(),
          email: user?.email || 'anonimo',
          nome: profileName,
          foto: profilePhoto
        });
      }
    });

    setLiveChatChannel(channel);

    fetchChatAdminsList();
    fetchModeratedUsers();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLive?.id, user?.email, userProfile]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLive || !liveChatInput.trim() || !user) return;

    if (isUserBanned) {
      alert("Você está banido deste chat.");
      return;
    }

    if (userTimeoutUntil && new Date() < userTimeoutUntil) {
      const secondsLeft = Math.ceil((userTimeoutUntil.getTime() - new Date().getTime()) / 1000);
      alert(`Você está em timeout. Aguarde mais ${secondsLeft} segundos.`);
      return;
    }

    if (isChatLocked && !isModerator) {
      alert("O chat está bloqueado temporariamente apenas para administradores.");
      return;
    }

    const now = Date.now();
    if (now - lastMessageTime < 2000 && !isModerator) {
      alert("Aguarde 2 segundos entre as mensagens.");
      return;
    }

    const text = liveChatInput.trim();
    setLiveChatInput('');
    setLastMessageTime(now);

    if (!isModerator) {
      let nextCount = 1;
      if (spamMessageTracker.text === text) {
        nextCount = spamMessageTracker.count + 1;
      }
      setSpamMessageTracker({ text, count: nextCount });

      if (nextCount >= 5) {
        const { data: pastTimeouts } = await supabase
          .from('chat_moderation')
          .select('id')
          .eq('live_id', selectedLive.id)
          .eq('email', user.email.toLowerCase())
          .eq('tipo', 'timeout');
        
        const offensesCount = pastTimeouts ? pastTimeouts.length : 0;
        let minutes = 1;
        if (offensesCount === 1) minutes = 5;
        else if (offensesCount === 2) minutes = 60;
        else if (offensesCount >= 3) minutes = 1440;

        const timeoutUntil = new Date(Date.now() + minutes * 60 * 1000);
        
        await supabase.from('chat_moderation').insert({
          live_id: selectedLive.id,
          email: user.email.toLowerCase(),
          nome: userProfile?.nome || user.email.split('@')[0],
          tipo: 'timeout',
          until: timeoutUntil.toISOString()
        });

        setUserTimeoutUntil(timeoutUntil);
        setSpamMessageTracker({ text: '', count: 0 });

        if (liveChatChannel) {
          liveChatChannel.send({
            type: 'broadcast',
            event: 'user_moderated',
            payload: {
              email: user.email.toLowerCase(),
              tipo: 'timeout',
              until: timeoutUntil.toISOString()
            }
          });
        }

        alert(`Você foi colocado em timeout por ${minutes} minuto(s) devido a spam.`);
        return;
      }
    }

    try {
      const profileName = userProfile?.nome || user.email.split('@')[0];
      const profilePhoto = userProfile?.foto || '';

      const { data, error } = await supabase.from('chat_mensagens').insert({
        live_id: selectedLive.id,
        email: user.email.toLowerCase(),
        nome: profileName,
        foto: profilePhoto,
        texto: text
      }).select('*').single();

      if (error) throw error;

      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: data
        });
      }

      setLiveChatMessages(prev => [...prev, data]);
    } catch (err: any) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  const handleDeleteChatMessage = async (msgId: number) => {
    if (!isModerator || !selectedLive) return;
    if (!window.confirm("Deseja realmente apagar esta mensagem?")) return;

    try {
      const { error } = await supabase
        .from('chat_mensagens')
        .update({ texto: '(mensagem apagada por um administrador)', is_deleted: true })
        .eq('id', msgId);

      if (error) throw error;

      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'message_deleted',
          payload: { id: msgId }
        });
      }

      setLiveChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, texto: '(mensagem apagada por um administrador)', is_deleted: true } : m));
    } catch (err: any) {
      alert("Erro ao deletar mensagem: " + err.message);
    }
  };

  const handleModerateUser = async (userEmail: string, userName: string, tipo: 'ban' | 'timeout' | 'unban' | 'untimeout', durationMinutes?: number) => {
    if (!isModerator || !selectedLive) return;

    try {
      if (tipo === 'unban') {
        const { error } = await supabase
          .from('chat_moderation')
          .delete()
          .eq('live_id', selectedLive.id)
          .eq('email', userEmail.toLowerCase())
          .eq('tipo', 'ban');
        if (error) throw error;
        alert(`Banimento de ${userName} removido.`);
      } else if (tipo === 'untimeout') {
        const { error } = await supabase
          .from('chat_moderation')
          .delete()
          .eq('live_id', selectedLive.id)
          .eq('email', userEmail.toLowerCase())
          .eq('tipo', 'timeout');
        if (error) throw error;
        
        if (liveChatChannel) {
          liveChatChannel.send({
            type: 'broadcast',
            event: 'user_moderated',
            payload: { email: userEmail, tipo: 'timeout', until: null }
          });
        }
        alert(`Timeout de ${userName} removido.`);
      } else if (tipo === 'ban') {
        const { error } = await supabase.from('chat_moderation').insert({
          live_id: selectedLive.id,
          email: userEmail.toLowerCase(),
          nome: userName,
          tipo: 'ban'
        });
        if (error) throw error;

        if (liveChatChannel) {
          liveChatChannel.send({
            type: 'broadcast',
            event: 'user_moderated',
            payload: { email: userEmail, tipo: 'ban' }
          });
        }
        alert(`${userName} foi banido.`);
      } else if (tipo === 'timeout' && durationMinutes) {
        const timeoutUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
        const { error } = await supabase.from('chat_moderation').insert({
          live_id: selectedLive.id,
          email: userEmail.toLowerCase(),
          nome: userName,
          tipo: 'timeout',
          until: timeoutUntil.toISOString()
        });
        if (error) throw error;

        if (liveChatChannel) {
          liveChatChannel.send({
            type: 'broadcast',
            event: 'user_moderated',
            payload: { email: userEmail, tipo: 'timeout', until: timeoutUntil.toISOString() }
          });
        }
        alert(`${userName} recebeu um timeout de ${durationMinutes} minutos.`);
      }

      fetchModeratedUsers();
    } catch (err: any) {
      alert("Erro na moderação: " + err.message);
    }
  };

  const fetchModeratedUsers = async () => {
    if (!selectedLive) return;
    const { data, error } = await supabase
      .from('chat_moderation')
      .select('*')
      .eq('live_id', selectedLive.id);

    if (!error && data) {
      setBannedUsersList(data.filter(m => m.tipo === 'ban'));
      setTimeoutUsersList(data.filter(m => m.tipo === 'timeout' && new Date(m.until) > new Date()));
    }
  };

  const handleVote = async (optionIdx: number) => {
    if (!selectedLive) return;
    try {
      const { data: latestLive, error: fetchErr } = await supabase
        .from('transmissoes_aovivo')
        .select('enquete')
        .eq('id', selectedLive.id)
        .single();
      if (fetchErr || !latestLive?.enquete) return;

      const updatedEnquete = { ...latestLive.enquete };
      if (!updatedEnquete.votos) {
        updatedEnquete.votos = updatedEnquete.opcoes.map(() => 0);
      }
      updatedEnquete.votos[optionIdx] = (updatedEnquete.votos[optionIdx] || 0) + 1;

      const { error: updateErr } = await supabase
        .from('transmissoes_aovivo')
        .update({ enquete: updatedEnquete })
        .eq('id', selectedLive.id);
      if (updateErr) throw updateErr;

      localStorage.setItem(`voted_poll_${selectedLive.id}`, optionIdx.toString());
      setSelectedLive(prev => prev ? { ...prev, enquete: updatedEnquete } : prev);

      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'poll_updated',
          payload: { enquete: updatedEnquete }
        });
      }
    } catch (err: any) {
      console.error("Erro ao votar:", err);
    }
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertText.trim() || !selectedLive) return;
    try {
      const updatedAlerts = [...(selectedLive.alertas || []), newAlertText.trim()];
      const { error } = await supabase
        .from('transmissoes_aovivo')
        .update({ alertas: updatedAlerts })
        .eq('id', selectedLive.id);
      if (error) throw error;
      
      setSelectedLive(prev => prev ? { ...prev, alertas: updatedAlerts } : prev);
      setNewAlertText('');
      
      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'alerts_updated',
          payload: { alertas: updatedAlerts }
        });
      }
    } catch (err: any) {
      alert("Erro ao adicionar alerta: " + err.message);
    }
  };

  const handleRemoveAlert = async (idx: number) => {
    if (!selectedLive) return;
    try {
      const updatedAlerts = (selectedLive.alertas || []).filter((_: any, i: number) => i !== idx);
      const { error } = await supabase
        .from('transmissoes_aovivo')
        .update({ alertas: updatedAlerts })
        .eq('id', selectedLive.id);
      if (error) throw error;
      
      setSelectedLive(prev => prev ? { ...prev, alertas: updatedAlerts } : prev);
      
      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'alerts_updated',
          payload: { alertas: updatedAlerts }
        });
      }
    } catch (err: any) {
      alert("Erro ao remover alerta: " + err.message);
    }
  };

  const handleLaunchPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLive) return;
    if (!pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()) {
      return alert("A enquete precisa de uma pergunta e pelo menos 2 opções.");
    }
    try {
      const options = [pollOpt1.trim(), pollOpt2.trim()];
      if (pollOpt3.trim()) options.push(pollOpt3.trim());
      if (pollOpt4.trim()) options.push(pollOpt4.trim());
      
      const newEnquete = {
        pergunta: pollQuestion.trim(),
        opcoes: options,
        votos: options.map(() => 0),
        ativa: true
      };
      
      const { error } = await supabase
        .from('transmissoes_aovivo')
        .update({ enquete: newEnquete })
        .eq('id', selectedLive.id);
      if (error) throw error;
      
      setSelectedLive(prev => prev ? { ...prev, enquete: newEnquete } : prev);
      
      setPollQuestion('');
      setPollOpt1('');
      setPollOpt2('');
      setPollOpt3('');
      setPollOpt4('');

      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'poll_updated',
          payload: { enquete: newEnquete }
        });
      }
    } catch (err: any) {
      alert("Erro ao lançar enquete: " + err.message);
    }
  };

  const handleClosePoll = async () => {
    if (!selectedLive || !selectedLive.enquete) return;
    try {
      const updatedEnquete = { ...selectedLive.enquete, ativa: false };
      const { error } = await supabase
        .from('transmissoes_aovivo')
        .update({ enquete: updatedEnquete })
        .eq('id', selectedLive.id);
      if (error) throw error;
      
      setSelectedLive(prev => prev ? { ...prev, enquete: updatedEnquete } : prev);
      
      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'poll_updated',
          payload: { enquete: updatedEnquete }
        });
      }
    } catch (err: any) {
      alert("Erro ao desativar enquete: " + err.message);
    }
  };

  const handleClearPoll = async () => {
    if (!selectedLive) return;
    try {
      const { error } = await supabase
        .from('transmissoes_aovivo')
        .update({ enquete: null })
        .eq('id', selectedLive.id);
      if (error) throw error;
      
      setSelectedLive(prev => prev ? { ...prev, enquete: null } : prev);
      
      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'poll_updated',
          payload: { enquete: null }
        });
      }
    } catch (err: any) {
      alert("Erro ao excluir enquete: " + err.message);
    }
  };

  const handleToggleChatLock = async () => {
    if (!isModerator || !selectedLive) return;
    const nextState = !isChatLocked;

    try {
      const { error } = await supabase
        .from('chat_config')
        .upsert({ live_id: selectedLive.id, locked: nextState });

      if (error) throw error;

      setIsChatLocked(nextState);

      if (liveChatChannel) {
        liveChatChannel.send({
          type: 'broadcast',
          event: 'chat_lock_changed',
          payload: { locked: nextState }
        });
      }
    } catch (err: any) {
      alert("Erro ao travar/destravar chat: " + err.message);
    }
  };

  const handleAddChatAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_admins')
        .insert({ email: newAdminEmail.trim().toLowerCase() });

      if (error) throw error;

      alert(`Administrador ${newAdminEmail} adicionado com sucesso!`);
      setNewAdminEmail('');
      
      fetchChatAdminsList();
    } catch (err: any) {
      alert("Erro ao adicionar administrador: " + err.message);
    }
  };

  const fetchChatAdminsList = async () => {
    const { data, error } = await supabase.from('chat_admins').select('email');
    if (!error && data) {
      setLiveAdmins(data.map(d => typeof d.email === 'string' ? d.email.toLowerCase() : '').filter(Boolean));
    }
  };

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
        localStorage.setItem('hzn_portal_authenticated', 'true');
        setUser(otpData.user);
        if (otpData.user.email) {
          fetchUserProfile(otpData.user.email);
          fetchBoiadas();
          fetchTropeiroBoiada(otpData.user.email);
          setCurrentTab('home');
        }

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

      const response = await fetch('https://www.rodeoapp.pro/api/send-otp', {
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


    if (publicEventSlug) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', width: '100vw', overflowX: 'hidden' }}>
        <header className="public-header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} /></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => { navigateTo('/'); setPublicEventSlug(null); setSelectedEvent(null); setEventTab('home'); }}>Ir para o Portal</button>
          </div>
        </header>

        {isPublicEventLoading ? (
          <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 600, textAlign: 'center', marginTop: '4rem' }}>Carregando Evento...</div>
        ) : selectedEvent ? (
          <div className="event-detail-view fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', marginTop: '2rem' }}>
          <div className="event-header-banner" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem' }}>
            {selectedEvent.detalhes?.logo ? (
              <img src={selectedEvent.detalhes.logo} alt={selectedEvent.nome} style={{ width: '120px', height: '120px', objectFit: 'contain', borderRadius: '24px', background: 'rgba(0,0,0,0.4)', padding: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>LOGO</div>
            )}
            <div>
              <span className="event-date" style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>{selectedEvent.tipo || 'RODEIO'}</span>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', lineHeight: 1, fontWeight: '900', textTransform: 'uppercase' }}>{selectedEvent.nome}</h2>
              {selectedEvent.detalhes?.circuito && (
                <h3 style={{ fontSize: '1.2rem', color: '#eab308', margin: '0 0 1rem 0', fontWeight: '800', textTransform: 'uppercase', fontStyle: 'italic' }}>
                  Etapa: {selectedEvent.detalhes.circuito}
                </h3>
              )}
              
              <div style={{ display: 'flex', gap: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {selectedEvent.local || selectedEvent.cidade}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Diretor: <strong style={{ color: '#fff' }}>{(selectedEvent.detalhes?.diretor?.includes('@') ? selectedEvent.detalhes.diretor.split('@')[0] : selectedEvent.detalhes?.diretor) || 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Abas de Navegação do Evento */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', overflowX: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                       return rankingBase.sort((a, b) => {
                         if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                         return (b.tempoAcumulado || 0) - (a.tempoAcumulado || 0);
                       }).filter(p => selectedRankingDay === 'Geral' || (p.score > 0 || p.tempoAcumulado > 0));
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
                              {peao.nome.replace(' (RE-RIDE)', '')}
                              {(() => {
                                 const baseName = peao.nome.replace(' (RE-RIDE)', '');
                                 const peaoAllNotesDay = (selectedEvent.detalhes.notas || []).filter((n: any) => 
                                     (n.peao === baseName || n.peaoNome === baseName) && 
                                     (selectedRankingDay === 'Geral' || n.dia === selectedRankingDay)
                                 );
                                 const hasReRide = peao.nome.includes('(RE-RIDE)') || peaoAllNotesDay.some((n: any) => n.isReride);
                                 if (!hasReRide) return null;
                                 return (
                                  <div 
                                    onClick={(e) => { e.stopPropagation(); toggleReRide(peao.nome); }}
                                    style={{ 
                                      display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eab30822', color: '#eab308', padding: '2px 8px', borderRadius: '6px', border: '1px solid #eab30855', fontSize: '0.7rem', cursor: 'pointer', marginLeft: '6px', verticalAlign: 'middle'
                                    }}
                                  >
                                    RE-RIDE
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedReRides[peao.nome] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                      <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                  </div>
                                 );
                              })()}
                            {peao.cpf && verifiedCpfs.has(peao.cpf.replace(/\D/g, '')) && (
  <svg aria-label="Competidor Verificado" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '6px', verticalAlign: 'text-bottom', display: 'inline-block' }}>
    <path d="M11.517 1.408a.633.633 0 0 1 .966 0l1.79 2.148c.204.245.534.343.844.25l2.705-.81a.633.633 0 0 1 .803.582l.235 2.81c.026.319.23.593.524.704l2.639.998a.633.633 0 0 1 .386.915l-1.346 2.457a.89.89 0 0 0 0 .874l1.346 2.457a.633.633 0 0 1-.386.915l-2.639.998a.89.89 0 0 0-.524.704l-.235 2.81a.633.633 0 0 1-.803.582l-2.705-.81a.89.89 0 0 0-.844.25l-1.79 2.148a.633.633 0 0 1-.966 0l-1.79-2.148a.89.89 0 0 0-.844-.25l-2.705.81a.633.633 0 0 1-.803-.582l-.235-2.81a.89.89 0 0 0-.524-.704l-2.639-.998a.633.633 0 0 1-.386-.915L3.13 12.437a.89.89 0 0 0 0-.874L1.784 9.106a.633.633 0 0 1 .386-.915l2.639-.998a.89.89 0 0 0 .524-.704l.235-2.81a.633.633 0 0 1 .803-.582l2.705.81a.89.89 0 0 0 .844-.25l1.79-2.148z" fill="#3b82f6"/>
    <path d="M10.233 15.656a.8.8 0 0 1-.566-.234l-3.3-3.3a.8.8 0 0 1 1.132-1.132l2.734 2.734 5.734-5.734a.8.8 0 0 1 1.132 1.132l-6.3 6.3a.8.8 0 0 1-.566.234z" fill="#ffffff"/>
  </svg>
)}
                            </span>
                          </div>
                          <span style={{ color: '#E11D48', fontWeight: '900', fontSize: '1.2rem' }}>
                            {peao.score > 0 ? peao.score.toFixed(2) + ' pts' : peao.tempoAcumulado ? peao.tempoAcumulado.toFixed(2) + 's' : '0.00 pts'}
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

                        {/* Detalhamento Re-Ride Expansion */}
                        {(() => {
                           const baseName = peao.nome.replace(' (RE-RIDE)', '');
                           const peaoAllNotesDay = (selectedEvent.detalhes.notas || []).filter((n: any) => 
                               (n.peao === baseName || n.peaoNome === baseName) && 
                               (selectedRankingDay === 'Geral' || n.dia === selectedRankingDay)
                           );
                           const hasReRide = peao.nome.includes('(RE-RIDE)') || peaoAllNotesDay.some((n: any) => n.isReride);
                           
                           if (!hasReRide || !expandedReRides[peao.nome]) return null;

                           const substitutedNotes = peaoAllNotesDay.filter((n: any) => 
                             n.status === 'substituida' || n.status === 'nota_baixa' || n.status === 'tropeiro'
                           );
                           
                           return (
                             <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#eab30811', padding: '1rem', borderRadius: '12px', border: '1px solid #eab30833' }}>
                               <strong style={{ color: '#eab308', fontSize: '0.8rem', textTransform: 'uppercase' }}>Detalhes do Touro Substituído (Re-Ride)</strong>
                               {substitutedNotes.length === 0 ? (
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Dados do touro original não encontrados neste dia.</div>
                               ) : substitutedNotes.map((subNote: any, sIdx: number) => (
                                  <div key={sIdx} style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Round</span><strong style={{ color: '#fff', fontSize: '0.85rem' }}>{subNote.dia?.replace(/DIA/i, 'ROUND')}</strong></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Touro Original</span><strong style={{ color: '#fff', fontSize: '0.85rem' }}>{subNote.touro || subNote.bullName || '---'}</strong></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Nota do Touro</span><strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>{subNote.bullScore ? subNote.bullScore.toFixed(2) : (subNote.totalTouro ? subNote.totalTouro.toFixed(2) : '---')}</strong></div>
                                  </div>
                               ))}
                             </div>
                           );
                        })()}

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
                                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.95rem', color: run.status === 'Parada' ? '#10b981' : (run.status === 'Re-Ride' ? '#eab308' : '#ef4444') }}>
                                  {run.status} ({run.tempo.toFixed(2)}s)
                                </span>
                                {(run.status === 'Parada' || run.status === 'Re-Ride') && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nota: {run.score.toFixed(2)}</span>}
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
        ) : (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ff4444' }}>Evento Não Encontrado</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>O evento solicitado não existe ou ainda não foi aprovado pelo sistema.</p>
            <button className="btn btn-primary" onClick={() => navigateTo('/')}>Voltar ao Início</button>
          </div>
        )}

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
        if (ev.detalhes?.ranking) {
          const rankingSorted = ev.detalhes.ranking.map((p: any) => {
            const peaoNotas = (ev.detalhes.notas || []).filter((n: any) => n.peao === p.nome && (n.status === 'ativa' || n.status === 'nota_baixa'));
            let total = p.score || 0;
            if (peaoNotas.length > 0) {
              let sum = 0;
              peaoNotas.forEach((n: any) => {
                if (n.totalPeao > 0 && n.tempo >= 8) sum += (n.totalPeao + n.totalTouro);
              });
              total = sum;
            }
            return { ...p, score: total };
          }).sort((a: any, b: any) => {
            if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
            return (b.tempoAcumulado || 0) - (a.tempoAcumulado || 0);
          });

          const rankIndex = rankingSorted.findIndex((r: any) => {
            const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
            if (cleanCpf && rCpf) return rCpf === cleanCpf;
            return slugify(r.nome) === slugify(publicProfile.nome);
          });

          if (rankIndex !== -1) {
            historico.push({
              eventoNome: ev.nome,
              cidade: ev.local || ev.cidade,
              posicao: rankIndex + 1,
              slug: slugify(ev.nome)
            });
          }
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
                                  <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.95rem', color: run.status === 'Parada' ? '#10b981' : (run.status === 'Re-Ride' ? '#eab308' : '#ef4444') }}>
                                    {run.status} ({run.tempo.toFixed(2)}s)
                                  </span>
                                  {(run.status === 'Parada' || run.status === 'Re-Ride') && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Nota: {run.score.toFixed(2)}</span>}
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
        <style>{`
          @keyframes fadeInUpStaggered {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .bull-card-staggered {
            opacity: 0;
            animation: fadeInUpStaggered 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes loadingPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
        `}</style>
        <header className="public-header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "25px", maxWidth: "100%", objectFit: "contain" }} /></div>
        </header>

        <div className="profile-container" style={{ minHeight: '70vh', padding: '2rem 0', maxWidth: '100%' }}>
          {isPublicBoiadaLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', animation: 'loadingPulse 1.5s infinite ease-in-out' }}>Carregando Plantel...</div>
            </div>
          ) : publicBoiada ? (
            <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {publicBoiada.lados?.__meta?.logo && (
                    <img src={publicBoiada.lados.__meta.logo} alt="Logo da CIA" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px' }} />
                  )}
                  <h1 style={{ fontSize: '3rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>{publicBoiada.nome}</h1>
                </div>
                <div style={{ display: 'inline-block', marginTop: '1rem' }}>
                  <span className="badge badge-rodeoapp" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>Boiada Oficial</span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
                Touros do Plantel ({Object.keys(publicBoiada.lados || {}).filter(k => k !== '__meta').length})
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {Object.keys(publicBoiada.lados || {}).filter(k => k !== '__meta').map((bullName, idx) => {
                  const side = publicBoiada.lados[bullName];
                  const details = publicBoiada.lados?.__meta?.touros_info?.[bullName] || {};
                  const hasVideo = !!details.video_url && getYoutubeId(details.video_url);
                  
                  return (
                    <div 
                      key={bullName} 
                      onClick={() => handleBullClick(bullName, details, publicBoiada.nome)} 
                      className="bull-card-staggered"
                      style={{ 
                        position: 'relative', 
                        height: '350px', 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'flex-end', 
                        border: '2px solid rgba(255,255,255,0.1)', 
                        cursor: 'pointer',
                        animationDelay: `${idx * 80}ms`
                      }}
                    >
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

  if (publicNewsId) {
    const article = publicNews?.article;
    const event = publicNews?.event;
    const randomAd = currentArticleAd;

    let paragraphs: string[] = [];
    let firstHalf: string[] = [];
    let secondHalf: string[] = [];

    if (article) {
      let rawConteudo = article.conteudo || '';
      if (typeof rawConteudo === 'string') {
        rawConteudo = rawConteudo.replace(/\\n/g, '\n');
      }
      
      paragraphs = rawConteudo
        .split('\n')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
        
      if (paragraphs.length === 1 && paragraphs[0].length > 500) {
        const sentences = paragraphs[0].match(/[^.!?]+[.!?]+/g) || [paragraphs[0]];
        paragraphs = [];
        let currentParagraph = '';
        for (const sentence of sentences) {
          currentParagraph += sentence.trim() + ' ';
          if (currentParagraph.length > 400) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = '';
          }
        }
        if (currentParagraph.trim().length > 0) {
          paragraphs.push(currentParagraph.trim());
        }
      }

      const half = Math.ceil(paragraphs.length / 2);
      firstHalf = paragraphs.slice(0, half);
      secondHalf = paragraphs.slice(half);
    }

    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#1e293b', fontFamily: '"Outfit", sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>
            <img src="/header_logo.png" alt="RodeoApp" style={{ height: '35px', filter: 'invert(1) brightness(0.2)' }} />
          </div>
          <button className="btn btn-outline" style={{ borderColor: '#cbd5e1', color: '#1e293b' }} onClick={() => navigateTo('/')}>
            &larr; Voltar ao Portal
          </button>
        </header>

        {!publicNews ? (
          <div style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 600, textAlign: 'center', marginTop: '6rem' }}>Carregando Notícia...</div>
        ) : publicNews.error ? (
          <div style={{ textAlign: 'center', marginTop: '6rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ff4444' }}>Notícia Não Encontrada</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>A notícia solicitada não existe ou foi removida.</p>
            <button className="btn btn-outline" onClick={() => navigateTo('/')}>Voltar ao Início</button>
          </div>
        ) : (
          <main style={{ maxWidth: '800px', margin: '3rem auto 0 auto', padding: '0 2rem 6rem 2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ color: '#E11D48', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
                {event ? `EVENTOS • ${event.nome}` : 'NOTÍCIAS'}
              </span>
            </div>

            <h1 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: '1.15', color: '#0f172a', marginBottom: '1.5rem', textTransform: 'none', fontStyle: 'normal', letterSpacing: '-1px' }}>
              {article.titulo}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E11D48', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                RA
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#334155' }}>Redação RodeoApp</div>
                <div>Publicado em {new Date(article.created_at || Date.now()).toLocaleDateString('pt-BR')} às {new Date(article.created_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            {thinBylineAd && (
              <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Publicidade
                </span>
                <a href={thinBylineAd.click_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', width: '100%' }}>
                  <img 
                    src={thinBylineAd.logo_url} 
                    alt="Patrocinador" 
                    style={{ width: '100%', maxHeight: '90px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e2e8f0' }} 
                  />
                </a>
              </div>
            )}

            <div style={{ fontSize: '1.15rem', lineHeight: '1.8', color: '#334155', fontFamily: '"Inter", sans-serif', position: 'relative' }}>
              {gridMainAd && (
                <div style={{
                  float: 'right',
                  width: '320px',
                  marginLeft: '1.5rem',
                  marginBottom: '1.5rem',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  fontFamily: '"Outfit", sans-serif',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={gridMainAd.click_url} target="_blank" rel="noopener noreferrer" style={{ width: '100%', display: 'block', position: 'relative' }}>
                        <img src={gridMainAd.logo_url} alt={gridMainAd.nome} style={{ width: '100%', height: '280px', objectFit: 'cover', borderRadius: '8px' }} />
                      </a>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px 0 4px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a' }}>{gridMainAd.nome}</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Anúncio</span>
                    </div>
                  </div>
                </div>
              )}

              {firstHalf.map((p: string, idx: number) => {
                const isQuote = p.startsWith('"') || p.endsWith('"');
                if (isQuote) {
                  return (
                    <div key={idx} style={{ margin: '2.5rem 0', clear: 'both' }}>
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

              {randomAd && (
                <div style={{ margin: '3rem 0', textAlign: 'center', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 0', clear: 'both' }}>
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

              {secondHalf.map((p: string, idx: number) => {
                const isQuote = p.startsWith('"') || p.endsWith('"');
                if (isQuote) {
                  return (
                    <div key={idx} style={{ margin: '2.5rem 0', clear: 'both' }}>
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

            {aboveIaAd && (
              <div style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Anúncio Patrocinado
                </span>
                <a href={aboveIaAd.click_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', width: '100%' }}>
                  <img 
                    src={aboveIaAd.logo_url} 
                    alt="Patrocinador" 
                    style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                  />
                </a>
              </div>
            )}

            <div style={{ marginTop: '5rem', borderTop: '1px solid #e2e8f0', paddingTop: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', fontFamily: '"Outfit", sans-serif' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>
                ⚠️ Notícias geradas por IA podem conter erros. Contate o administrador se acaso quiser remover a matéria!
              </p>
            </div>
          </main>
        )}
      </div>
    );
  }

  if (!user) {
    // Patrocinadores ativos do tipo app (Splash do app — para "Oferecimento" na landing)
    const sponsorLogos = patrocinios
      .filter(p => {
        if (p.status !== 'ativo') return false;
        if (p.tipo === 'app') return true;
        if (p.tipo === 'consolidated') {
          const details = typeof p.detalhes === 'string' ? JSON.parse(p.detalhes) : (p.detalhes || {});
          return details.splash_app?.ativo === true;
        }
        return false;
      })
      .map(p => {
        if (p.tipo === 'consolidated') {
          const details = typeof p.detalhes === 'string' ? JSON.parse(p.detalhes) : (p.detalhes || {});
          return {
            ...p,
            logo_url: details.splash_app?.logo_url || p.logo_url,
            click_url: details.splash_app?.click_url || p.click_url || '#'
          };
        }
        return p;
      });


    const inputStyle = {
      width: '100%',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '15px',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
    };

    if (isMobile) {
      const highlightEventsList = homeEvents.filter(ev => ev.detalhes?.logo && ev.detalhes?.destacar_home).slice(0, 4);
      const backupEventsList = homeEvents.filter(ev => ev.detalhes?.logo).slice(0, 3);
      const finalEventsToRender = highlightEventsList.length > 0 ? highlightEventsList : backupEventsList;

      return (
        <>
          {/* Style block for loading animations */}
          <style>{`
            @keyframes pulseGlow {
              0% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,215,0,0.2)); }
              50% { transform: scale(1.02); opacity: 1; filter: drop-shadow(0 0 35px rgba(255,215,0,0.6)); }
              100% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,215,0,0.2)); }
            }
            .custom-scrollbar::-webkit-scrollbar {
              height: 4px;
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(0,0,0,0.1);
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.15);
              border-radius: 4px;
            }
          `}</style>

          {initialLoading && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#000',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: fadeLoader ? 0 : 1,
              transition: 'opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
              pointerEvents: fadeLoader ? 'none' : 'auto',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'pulseGlow 2.5s infinite ease-in-out',
              }}>
                <img
                  src="/splash_logo.png"
                  alt="Carregando..."
                  style={{
                    height: '80px',
                    width: 'auto',
                    objectFit: 'contain',
                    marginBottom: '20px',
                  }}
                />
              </div>
              
              {/* Progress bar container */}
              <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '10px',
                overflow: 'hidden',
                marginTop: '10px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  width: `${loadingProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #FFD700 0%, #d97706 100%)',
                  boxShadow: '0 0 10px rgba(255,215,0,0.5)',
                  transition: 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>

              <p style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginTop: '12px',
                fontFamily: '"Outfit", "Inter", sans-serif',
              }}>
                Carregando {loadingProgress}%
              </p>
            </div>
          )}

          {/* BACKGROUND FOTO DO COMPETIDOR COM COBERTURA ESCURA */}
          <img
            src="/maiorqualidade.jpg"
            alt="Competidor"
            style={{
              position: 'fixed',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              zIndex: 0,
            }}
          />
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.92) 60%, #000 100%)',
            zIndex: 1,
          }} />

          {/* CONTEÚDO PRINCIPAL SCROLLABLE */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            width: '100vw',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 12px',
            fontFamily: '"Outfit", "Inter", sans-serif',
            boxSizing: 'border-box',
          }}>
            {/* TOPO: LOGO + EVENTOS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '14px' }}>
              {/* Brand Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
                <img
                  src="/splash_logo.png"
                  alt="RodeoApp"
                  style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                />
                <div style={{
                  background: 'linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(217,119,6,0.15) 100%)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', backgroundColor: '#FFD700', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #FFD700' }} />
                  <span style={{ fontSize: '10px', fontWeight: '900', color: '#FFD700', letterSpacing: '1px', textTransform: 'uppercase' }}>PORTAL</span>
                </div>
              </div>

              {/* EVENTOS EM DESTAQUE */}
              <div style={{ width: '100%', padding: '0 4px' }}>
                <p style={{
                  margin: '0 0 10px 4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}>
                  Eventos em <strong style={{ color: '#FFD700' }}>Destaque da Semana</strong>
                </p>
                
                {finalEventsToRender.length > 0 ? (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    width: '100%',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                  }} className="custom-scrollbar">
                    {finalEventsToRender.map(ev => {
                      const dateText = ev.data_inicio ? `${ev.data_inicio.split('-').reverse().slice(0, 2).join('/')}` : '';
                      const locationText = ev.local || ev.cidade || 'Brasil';
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setPublicRankingModal(ev)}
                          style={{
                            flex: '0 0 82%',
                            scrollSnapAlign: 'start',
                            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.7) 0%, rgba(10, 10, 10, 0.85) 100%)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: 'none',
                            borderRadius: '16px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <img
                            src={ev.detalhes.logo}
                            alt={ev.nome}
                            style={{
                              height: '46px',
                              width: '46px',
                              objectFit: 'contain',
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '10px',
                              padding: '4px',
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{
                                fontSize: '8px',
                                fontWeight: '900',
                                background: 'rgba(255, 215, 0, 0.15)',
                                color: '#FFD700',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                              }}>
                                SEMANA 🏆
                              </span>
                            </div>
                            <h4 style={{
                              margin: 0,
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#fff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {ev.nome}
                            </h4>
                            <p style={{
                              margin: 0,
                              fontSize: '11px',
                              color: 'rgba(255,255,255,0.4)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {locationText} {dateText ? `• ${dateText}` : ''}
                            </p>
                          </div>
                          <div style={{
                            backgroundColor: 'rgba(255,215,0,0.1)',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,215,0,0.2)',
                          }}>
                            <span style={{ color: '#FFD700', fontSize: '12px', fontWeight: 'bold' }}>→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '12px',
                    padding: '8px',
                  }}>
                    Nenhum evento em destaque no momento
                  </div>
                )}
              </div>
            </div>

            {/* MEIO: FORMULÁRIOS COM GLASSMORPHISM */}
            <div style={{
              width: '100%',
              maxWidth: '380px',
              margin: 'auto',
              background: 'rgba(10, 10, 10, 0.72)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
            }}>
              {authMode === 'login' && loginStep === 'credentials' && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', alignSelf: 'center', margin: '0 0 16px 0' }}>
                    Entrar no Portal
                  </p>
                  <form
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (isLoading) return;
                      setIsLoading(true);
                      setLoginError('');
                      try {
                        const { error } = await supabase.auth.signInWithPassword({
                          email: loginEmail,
                          password: loginPassword,
                        });
                        if (error) throw new Error(error.message);

                        const code = Math.floor(100000 + Math.random() * 900000).toString();
                        const { error: dbError } = await supabase
                          .from('otp_codes')
                          .insert([{ email: loginEmail.toLowerCase().trim(), code: code }]);
                        if (dbError) throw new Error("Erro ao gerar código de segurança.");

                        const response = await fetch('https://www.rodeoapp.pro/api/send-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: loginEmail.toLowerCase().trim(), code })
                        });
                        const result = await response.json();
                        if (!result.success) throw new Error("Falha ao enviar e-mail de verificação.");

                        setLoginStep('otp');
                      } catch (err: any) {
                        setLoginError(err.message || 'Erro ao entrar.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    <input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                      style={inputStyle}
                    />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                      style={inputStyle}
                    />
                    {loginError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0', textAlign: 'center' }}>{loginError}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isLoading ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '16px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                  </form>
                  <button
                    onClick={() => { setAuthMode('forgot-password'); setLoginError(''); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', marginTop: '12px', fontFamily: 'inherit' }}
                  >
                    Esqueceu a senha?
                  </button>
                  <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
                  <button
                    onClick={() => { setAuthMode('register'); setRegisterStep('form'); setRegisterError(''); }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.25)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Criar nova conta
                  </button>
                </>
              )}

              {authMode === 'login' && loginStep === 'otp' && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', alignSelf: 'center', margin: '0 0 14px 0' }}>
                    Código de Segurança
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', lineHeight: '1.4', textAlign: 'center', marginBottom: '16px', margin: '0 0 16px 0' }}>
                    Enviado para: <strong>{loginEmail}</strong>
                  </p>
                  <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="------"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '20px',
                        letterSpacing: '4px',
                        textAlign: 'center',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      required 
                    />
                    {loginError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0', textAlign: 'center' }}>{loginError}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isLoading ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '16px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isLoading ? 'Verificando...' : 'Verificar e Entrar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginStep('credentials')}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', marginTop: '10px', fontFamily: 'inherit' }}
                    >
                      Voltar para Login
                    </button>
                  </form>
                </>
              )}

              {authMode === 'forgot-password' && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', alignSelf: 'center', margin: '0 0 14px 0' }}>
                    Recuperar Senha
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', lineHeight: '1.4', textAlign: 'center', marginBottom: '16px', margin: '0 0 16px 0' }}>
                    Digite seu e-mail para receber o link de redefinição.
                  </p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (isLoading) return;
                    setIsLoading(true);
                    setLoginError('');
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
                        redirectTo: `${window.location.origin}/`,
                      });
                      if (error) throw error;
                      alert("Link de redefinição enviado!");
                      setAuthMode('login');
                    } catch (err: any) {
                      setLoginError(err.message || "Erro ao solicitar.");
                    } finally {
                      setIsLoading(false);
                    }
                  }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                      style={inputStyle}
                    />
                    {loginError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0', textAlign: 'center' }}>{loginError}</p>}
                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isLoading ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '16px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isLoading ? 'Enviando...' : 'Enviar Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', marginTop: '10px', fontFamily: 'inherit' }}
                    >
                      Voltar para Login
                    </button>
                  </form>
                </>
              )}

              {authMode === 'register' && registerStep === 'form' && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', alignSelf: 'center', margin: '0 0 14px 0' }}>
                    Criar Conta
                  </p>
                  <form
                    onSubmit={handleRegisterSubmit}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      maxHeight: '40vh',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                    className="custom-scrollbar"
                  >
                    <input type="text" placeholder="Nome Completo" value={regName} onChange={e => setRegName(e.target.value)} required style={inputStyle} />
                    <input type="email" placeholder="E-mail" value={regEmail} onChange={handleRegEmailChange} onBlur={checkEmailInDB} required style={inputStyle} />
                    <input type="password" placeholder="Senha" value={regPassword} onChange={e => setRegPassword(e.target.value)} required style={inputStyle} />
                    <input type="tel" placeholder="WhatsApp" value={regWhatsapp} onChange={e => setRegWhatsapp(e.target.value)} required style={inputStyle} />
                    <input type="text" placeholder="CPF" value={regCpf} onChange={e => setRegCpf(e.target.value)} required style={inputStyle} />
                    <input type="text" placeholder="RG" value={regRg} onChange={e => setRegRg(e.target.value)} required style={inputStyle} />
                    <input type="text" placeholder="Cidade" value={regCity} onChange={e => setRegCity(e.target.value)} required style={inputStyle} />
                    <input type="text" placeholder="Estado (UF)" maxLength={2} value={regState} onChange={e => setRegState(e.target.value.toUpperCase())} required style={inputStyle} />
                    <input type="text" placeholder="Endereço Completo" value={regAddress} onChange={e => setRegAddress(e.target.value)} required style={inputStyle} />
                    
                    <select
                      required
                      value={regRole}
                      onChange={e => setRegRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="" disabled style={{ backgroundColor: '#111' }}>Selecione um cargo...</option>
                      <option value="usuario_comum" style={{ backgroundColor: '#111' }}>Usuário Comum</option>
                      <option value="diretor" style={{ backgroundColor: '#111' }}>Diretor</option>
                      <option value="juiz" style={{ backgroundColor: '#111' }}>Juiz</option>
                      <option value="peao_touros" style={{ backgroundColor: '#111' }}>Peão de Touros</option>
                      <option value="peao_cavalos" style={{ backgroundColor: '#111' }}>Peão de Cavalos</option>
                      <option value="competidor_tambores" style={{ backgroundColor: '#111' }}>Competidor 3 Tambores</option>
                      <option value="competidor_team_roping" style={{ backgroundColor: '#111' }}>Competidor Team Roping</option>
                      <option value="tropeiro" style={{ backgroundColor: '#111' }}>Tropeiro</option>
                      <option value="treinador" style={{ backgroundColor: '#111' }}>Treinador</option>
                    </select>

                    {registerError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0', textAlign: 'center' }}>{registerError}</p>}
                    <button
                      type="submit"
                      disabled={isRegistering}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isRegistering ? 'rgba(255,255,255,0.5)' : (isAppUser ? '#fff' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)'),
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '15px',
                        cursor: isRegistering ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        marginTop: '8px',
                      }}
                    >
                      {isRegistering ? 'Salvando...' : (isAppUser ? 'Sincronizar' : 'Finalizar')}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', marginTop: '12px', fontFamily: 'inherit' }}
                  >
                    Voltar para Login
                  </button>
                </>
              )}

              {authMode === 'register' && registerStep === 'otp' && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', alignSelf: 'center', margin: '0 0 14px 0' }}>
                    Validar Conta
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', lineHeight: '1.4', textAlign: 'center', marginBottom: '16px', margin: '0 0 16px 0' }}>
                    Código enviado para: <strong>{regEmail}</strong>
                  </p>
                  <form onSubmit={handleVerifySignupOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                      type="text" 
                      placeholder="------"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '20px',
                        letterSpacing: '4px',
                        textAlign: 'center',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value.trim())}
                      required 
                    />
                    {registerError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0', textAlign: 'center' }}>{registerError}</p>}
                    <button
                      type="submit"
                      disabled={isRegistering}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: isRegistering ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '16px',
                        cursor: isRegistering ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {isRegistering ? 'Verificando...' : 'Confirmar e Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterStep('form')}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', marginTop: '10px', fontFamily: 'inherit' }}
                    >
                      Voltar
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* RODAPÉ: PATROCINADORES */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: 'auto' }}>
              {sponsorLogos.length > 0 && (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                  }}>
                    Oferecimento
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                  }} className="custom-scrollbar">
                    {sponsorLogos.map(p => (
                      <a
                        key={p.id}
                        href={p.click_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={p.logo_url}
                          alt={p.empresa}
                          style={{
                            height: '32px',
                            width: 'auto',
                            maxWidth: '85px',
                            objectFit: 'contain',
                            filter: 'brightness(0.95) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ opacity: 0.35 }}>
                <img
                  src="/header_logo.png"
                  alt="RodeoApp"
                  style={{ height: '18px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {/* Style block for loading animations */}
        <style>{`
          @keyframes pulseGlow {
            0% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,215,0,0.2)); }
            50% { transform: scale(1.02); opacity: 1; filter: drop-shadow(0 0 35px rgba(255,215,0,0.6)); }
            100% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,215,0,0.2)); }
          }
        `}</style>

        {initialLoading && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#000',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: fadeLoader ? 0 : 1,
            transition: 'opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: fadeLoader ? 'none' : 'auto',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'pulseGlow 2.5s infinite ease-in-out',
            }}>
              <img
                src="/splash_logo.png"
                alt="Carregando..."
                style={{
                  height: '110px',
                  width: 'auto',
                  objectFit: 'contain',
                  marginBottom: '24px',
                }}
              />
            </div>
            
            {/* Progress bar container */}
            <div style={{
              width: '250px',
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden',
              marginTop: '10px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: `${loadingProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #FFD700 0%, #d97706 100%)',
                boxShadow: '0 0 10px rgba(255,215,0,0.5)',
                transition: 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '16px',
              fontFamily: '"Outfit", "Inter", sans-serif',
            }}>
              Carregando {loadingProgress}%
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* LANDING PAGE — Split Screen (igual ao RodeoApp desktop app)  */}
        {/* ============================================================ */}
        <div style={{
          display: 'flex',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#000',
          fontFamily: '"Outfit", "Inter", sans-serif',
        }}>

          {/* ===== LADO ESQUERDO — Foto + Info ===== */}
          <div style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}>
            {/* Foto de fundo do competidor */}
            <img
              src="/maiorqualidade.jpg"
              alt="Competidor"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '24% center',
              }}
            />

            {/* Gradiente: fade para preto no lado direito (para fundir com o painel de login) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.92) 80%, #000 100%)',
            }} />

            {/* Gradiente sutil no topo e no rodapé */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%, transparent 65%, rgba(0,0,0,0.8) 100%)',
            }} />

            {/* ---- EVENTOS EM DESTAQUE DA SEMANA (topo esquerdo) ---- */}
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '5%',
              maxWidth: '55%',
            }}>
              <p style={{
                margin: '0 0 14px 0',
                fontSize: '13px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                Eventos em <strong style={{ color: '#FFD700' }}>Destaque</strong> da Semana:
              </p>
              {/* Logos dos eventos em destaque — implementação futura */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
              }}>
                {homeEvents.filter(ev => (ev.detalhes?.logo || ev.detalhes?.foto_evento) && (ev.detalhes?.portalConfig?.destaque || ev.detalhes?.destacar_home)).slice(0, 5).map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => setPublicRankingModal(ev)}
                    style={{ cursor: 'pointer' }}
                    title={ev.nome}
                  >
                    <img
                      src={ev.detalhes.logo || ev.detalhes.foto_evento}
                      alt={ev.nome}
                      style={{
                        height: '70px',
                        width: 'auto',
                        maxWidth: '150px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
                        borderRadius: '6px',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  </div>
                ))}
                {/* Placeholder enquanto não há eventos com destacar_home */}
                {homeEvents.filter(ev => (ev.detalhes?.logo || ev.detalhes?.foto_evento) && (ev.detalhes?.portalConfig?.destaque || ev.detalhes?.destacar_home)).length === 0 && homeEvents.filter(ev => ev.detalhes?.logo || ev.detalhes?.foto_evento).slice(0, 4).map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => setPublicRankingModal(ev)}
                    style={{ cursor: 'pointer' }}
                    title={ev.nome}
                  >
                    <img
                      src={ev.detalhes.logo || ev.detalhes.foto_evento}
                      alt={ev.nome}
                      style={{
                        height: '70px',
                        width: 'auto',
                        maxWidth: '150px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))',
                        borderRadius: '6px',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ---- OFERECIMENTO (rodapé esquerdo) ---- */}
            <div style={{
              position: 'absolute',
              bottom: '6%',
              left: '5%',
              maxWidth: '55%',
            }}>
              {sponsorLogos.length > 0 && (
                <>
                  <p style={{
                    margin: '0 0 10px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                  }}>
                    Oferecimento
                  </p>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '14px',
                    alignItems: 'center',
                  }}>
                    {sponsorLogos.map(p => (
                      <a
                        key={p.id}
                        href={p.click_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={p.empresa}
                        style={{ display: 'inline-block' }}
                      >
                        <img
                          src={p.logo_url}
                          alt={p.empresa}
                          style={{
                            height: '50px',
                            width: 'auto',
                            maxWidth: '140px',
                            objectFit: 'contain',
                            filter: 'brightness(0.9) drop-shadow(0 2px 4px rgba(0,0,0,0.9))',
                            transition: 'filter 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.9))')}
                          onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(0.9) drop-shadow(0 2px 4px rgba(0,0,0,0.9))')}
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ===== LADO DIREITO — Painel de Login ===== */}
          <div style={{
            width: '45%',
            minWidth: '380px',
            flexShrink: 0,
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 40px 40px 80px',
            gap: '0',
            position: 'relative',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '360px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>

            {/* Logo topo (splash_logo) */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <img
                src="/splash_logo.png"
                alt="RodeoApp"
                style={{ height: '90px', width: 'auto', objectFit: 'contain' }}
              />
            </div>

            {authMode === 'login' && loginStep === 'credentials' && (
              <>
                {/* Label */}
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                  alignSelf: 'flex-start',
                }}>
                  Entrar no Portal
                </p>

                {/* Formulário de Login Inline */}
                <form
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (isLoading) return;
                    setIsLoading(true);
                    setLoginError('');
                    try {
                      const { error } = await supabase.auth.signInWithPassword({
                        email: loginEmail,
                        password: loginPassword,
                      });
                      if (error) throw new Error(error.message);

                      const code = Math.floor(100000 + Math.random() * 900000).toString();
                      const { error: dbError } = await supabase
                        .from('otp_codes')
                        .insert([{ email: loginEmail.toLowerCase().trim(), code: code }]);
                      if (dbError) throw new Error("Erro ao gerar código de segurança.");

                      const response = await fetch('https://www.rodeoapp.pro/api/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: loginEmail.toLowerCase().trim(), code })
                      });
                      const result = await response.json();
                      if (!result.success) throw new Error("Falha ao enviar e-mail de verificação.");

                      setLoginStep('otp');
                    } catch (err: any) {
                      setLoginError(err.message || 'Erro ao entrar.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />

                  {loginError && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: '0', textAlign: 'center' }}>{loginError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: isLoading ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '17px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.5px',
                      fontFamily: 'inherit',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                {/* Esqueceu a senha */}
                <button
                  onClick={() => { setAuthMode('forgot-password'); setLoginError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    fontFamily: 'inherit',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Esqueceu a senha?
                </button>

                {/* Divider */}
                <div style={{
                  width: '100%',
                  height: '1px',
                  background: 'rgba(255,255,255,0.08)',
                  margin: '20px 0',
                }} />

                {/* Botão criar nova conta */}
                <button
                  onClick={() => { setAuthMode('register'); setRegisterStep('form'); setRegisterError(''); }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '0.3px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,215,0,0.5)';
                    e.currentTarget.style.color = '#FFD700';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                    e.currentTarget.style.color = '#fff';
                  }}
                >
                  Criar nova conta
                </button>
              </>
            )}

            {authMode === 'login' && loginStep === 'otp' && (
              <>
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                  alignSelf: 'flex-start',
                }}>
                  Código de Segurança
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13.5px', lineHeight: '1.5', textAlign: 'center', marginBottom: '20px' }}>
                  Um código de 6 dígitos foi enviado para o seu e-mail (<strong>{loginEmail}</strong>). Digite-o abaixo.
                </p>

                <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="------"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '22px',
                      letterSpacing: '6px',
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      fontFamily: 'inherit',
                    }}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    required 
                  />

                  {loginError && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: '0', textAlign: 'center' }}>{loginError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: isLoading ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '17px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.5px',
                      fontFamily: 'inherit',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    {isLoading ? 'Verificando...' : 'Verificar e Entrar'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setLoginStep('credentials')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontFamily: 'inherit',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                  >
                    Voltar para Login
                  </button>
                </form>
              </>
            )}

            {authMode === 'forgot-password' && (
              <>
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                  alignSelf: 'flex-start',
                }}>
                  Recuperar Senha
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13.5px', lineHeight: '1.5', textAlign: 'center', marginBottom: '20px' }}>
                  Digite seu e-mail para receber um link de redefinição de senha.
                </p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (isLoading) return;
                  setIsLoading(true);
                  setLoginError('');
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
                      redirectTo: `${window.location.origin}/`,
                    });
                    if (error) throw error;
                    alert("Link de redefinição enviado para o seu e-mail!");
                    setAuthMode('login');
                  } catch (err: any) {
                    setLoginError(err.message || "Erro ao solicitar recuperação.");
                  } finally {
                    setIsLoading(false);
                  }
                }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                  />

                  {loginError && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: '0', textAlign: 'center' }}>{loginError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: isLoading ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '17px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.5px',
                      fontFamily: 'inherit',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    {isLoading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontFamily: 'inherit',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                  >
                    Voltar para Login
                  </button>
                </form>
              </>
            )}

            {authMode === 'register' && registerStep === 'form' && (
              <>
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                  alignSelf: 'flex-start',
                }}>
                  Criar Conta
                </p>

                <form
                  onSubmit={handleRegisterSubmit}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxHeight: '52vh',
                    overflowY: 'auto',
                    paddingRight: '6px',
                  }}
                  className="custom-scrollbar"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Nome Completo</label>
                    <input
                      type="text"
                      placeholder="João da Silva"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>E-mail</label>
                    <input
                      type="email"
                      placeholder="joao@email.com"
                      value={regEmail}
                      onChange={handleRegEmailChange}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => { checkEmailInDB(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Crie uma Senha</label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={regWhatsapp}
                      onChange={e => setRegWhatsapp(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={regCpf}
                      onChange={e => setRegCpf(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>RG</label>
                    <input
                      type="text"
                      placeholder="00.000.000-0"
                      value={regRg}
                      onChange={e => setRegRg(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={regCity}
                      onChange={e => setRegCity(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Estado</label>
                    <input
                      type="text"
                      placeholder="Ex: SP"
                      maxLength={2}
                      value={regState}
                      onChange={e => setRegState(e.target.value.toUpperCase())}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Endereço Completo</label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro"
                      value={regAddress}
                      onChange={e => setRegAddress(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Qual o seu Cargo no Rodeio?</label>
                    <select
                      required
                      value={regRole}
                      onChange={e => setRegRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="" disabled style={{ backgroundColor: '#000' }}>Selecione um cargo...</option>
                      <option value="usuario_comum" style={{ backgroundColor: '#000' }}>Usuário Comum</option>
                      <option value="diretor" style={{ backgroundColor: '#000' }}>Diretor</option>
                      <option value="juiz" style={{ backgroundColor: '#000' }}>Juiz</option>
                      <option value="peao_touros" style={{ backgroundColor: '#000' }}>Peão de Touros</option>
                      <option value="peao_cavalos" style={{ backgroundColor: '#000' }}>Peão de Cavalos</option>
                      <option value="competidor_tambores" style={{ backgroundColor: '#000' }}>Competidor 3 Tambores</option>
                      <option value="competidor_team_roping" style={{ backgroundColor: '#000' }}>Competidor Team Roping</option>
                      <option value="tropeiro" style={{ backgroundColor: '#000' }}>Tropeiro</option>
                      <option value="treinador" style={{ backgroundColor: '#000' }}>Treinador</option>
                    </select>
                  </div>

                  {registerError && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: '0', textAlign: 'center' }}>{registerError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isRegistering}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: isRegistering ? 'rgba(255,255,255,0.5)' : (isAppUser ? '#fff' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)'),
                      border: 'none',
                      borderRadius: '10px',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '15px',
                      cursor: isRegistering ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.5px',
                      fontFamily: 'inherit',
                      transition: 'opacity 0.2s',
                      marginTop: '10px',
                    }}
                  >
                    {isRegistering ? 'Salvando...' : (isAppUser ? 'Sincronizar Perfil' : 'Finalizar Cadastro')}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '15px',
                    fontFamily: 'inherit',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Voltar para Login
                </button>
              </>
            )}

            {authMode === 'register' && registerStep === 'otp' && (
              <>
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  marginBottom: '18px',
                  alignSelf: 'flex-start',
                }}>
                  Validar Conta
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13.5px', lineHeight: '1.5', textAlign: 'center', marginBottom: '20px' }}>
                  Enviamos um código de 6 dígitos para o e-mail <strong>{regEmail}</strong> para validar sua conta. Digite-o abaixo:
                </p>

                <form onSubmit={handleVerifySignupOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="------"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '22px',
                      letterSpacing: '6px',
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      fontFamily: 'inherit',
                    }}
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value.trim())}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,215,0,0.6)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                    required 
                  />

                  {registerError && (
                    <p style={{ color: '#f87171', fontSize: '13px', margin: '0', textAlign: 'center' }}>{registerError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isRegistering}
                    style={{
                      width: '100%',
                      padding: '15px',
                      background: isRegistering ? 'rgba(255,215,0,0.5)' : 'linear-gradient(135deg, #FFD700 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#000',
                      fontWeight: 900,
                      fontSize: '17px',
                      cursor: isRegistering ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.5px',
                      fontFamily: 'inherit',
                      transition: 'opacity 0.2s',
                      boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    {isRegistering ? 'Verificando...' : 'Confirmar E-mail e Ativar Conta'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRegisterStep('form')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontFamily: 'inherit',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                  >
                    Voltar
                  </button>
                </form>
              </>
            )}

            {/* Logo rodapé (header_logo) */}
            <div style={{ marginTop: '28px', opacity: 0.5 }}>
              <img
                src="/header_logo.png"
                alt="RodeoApp"
                style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            </div>
          </div>
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
                    {[...publicRankingModal.detalhes.ranking]
                      .sort((a: any, b: any) => {
                        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
                        return (b.tempoAcumulado || 0) - (a.tempoAcumulado || 0);
                      })
                      .slice(0, 3)
                      .map((competidor: any, idx: number) => (
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
                          {competidor.score > 0 ? (
                            <>{competidor.score.toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>pts</span></>
                          ) : competidor.tempoAcumulado ? (
                            <>{competidor.tempoAcumulado.toFixed(2)}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>s</span></>
                          ) : (
                            <>0.00 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>pts</span></>
                          )}
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
      {/* Style block for loading animations */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,215,0,0.2)); }
          50% { transform: scale(1.02); opacity: 1; filter: drop-shadow(0 0 35px rgba(255,215,0,0.6)); }
          100% { transform: scale(0.95); opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,215,0,0.2)); }
        }
      `}</style>

      {initialLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fadeLoader ? 0 : 1,
          transition: 'opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
          pointerEvents: fadeLoader ? 'none' : 'auto',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'pulseGlow 2.5s infinite ease-in-out',
          }}>
            <img
              src="/splash_logo.png"
              alt="Carregando..."
              style={{
                height: '110px',
                width: 'auto',
                objectFit: 'contain',
                marginBottom: '24px',
              }}
            />
          </div>
          
          {/* Progress bar container */}
          <div style={{
            width: '250px',
            height: '4px',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
            marginTop: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #FFD700 0%, #d97706 100%)',
              boxShadow: '0 0 10px rgba(255,215,0,0.5)',
              transition: 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>

          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginTop: '16px',
            fontFamily: '"Outfit", "Inter", sans-serif',
          }}>
            Carregando {loadingProgress}%
          </p>
        </div>
      )}

      <div className="dashboard-layout">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            <img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} />
          </div>
          
          <nav className="sidebar-menu">
            <button 
              className={`menu-item ${currentTab === 'home' ? 'active' : ''}`} 
              onClick={() => { setCurrentTab('home'); setSearchTerm(''); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </button>
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

            <button 
              className={`menu-item ${currentTab === 'aovivo' ? 'active' : ''}`} 
              onClick={() => { setCurrentTab('aovivo'); setSelectedLive(null); setLiveChatMessages([]); setSearchTerm(''); }}
              style={{ position: 'relative' }}
            >
              <span className="relative flex h-2 w-2 mr-2" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              AoVivo
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
          {!selectedLive && (
            <header className="dashboard-header" style={isMobile ? { padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } : {}}>
              {isMobile ? (
                <div 
                  onClick={() => { setCurrentTab('home'); setSearchTerm(''); }}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', color: '#fff', letterSpacing: '-0.03em' }}>
                    RODEO<span style={{ color: '#eab308' }}>APP.PRO</span>
                  </span>
                </div>
              ) : (
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
              )}
            
              <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!isMobile && (
                  <span className="header-user-name" onClick={() => setCurrentTab('profile')} style={{ cursor: 'pointer' }}>
                    {userProfile?.nome || user?.email}
                  </span>
                )}
                <img 
                  src={userFoto || "/novacontasfoto.jpg"} 
                  alt="Foto de Perfil" 
                  className={`header-avatar ${isAdmin ? 'admin-pulsing-avatar-small' : userProfile?.veio_do_app_desktop ? 'rodeo-pulsing-avatar-small' : ''}`}
                  onClick={() => setCurrentTab('profile')}
                  style={{ cursor: 'pointer' }}
                  title="Meu Perfil"
                />
                {user && (
                  <button 
                    onClick={() => setIsLogoutConfirmOpen(true)}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)', 
                      color: '#ef4444', 
                      padding: isMobile ? '6px 10px' : '6px 12px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 900, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Sair da Conta"
                  >
                    🚪 {isMobile ? '' : 'Sair'}
                  </button>
                )}
              </div>
            </header>
          )}

          {/* Dynamic Tabs Content */}
          <div className="dashboard-content" style={currentTab === 'aovivo' && selectedLive ? { maxWidth: '1600px', width: '95%' } : undefined}>
            
            {/* HOME CUSTOM PANEL TAB */}
            {currentTab === 'home' && (
              <div className="fade-in">
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Meu Painel</h2>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Acompanhe em tempo real seus eventos, competidores e companhias favoritas.</p>
                
                {/* Onboarding Empty State */}
                {favorites.eventos.length === 0 && favorites.cias.length === 0 && favorites.competitors.length === 0 ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '24px',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    margin: '2rem auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⭐</span>
                    <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Seu Painel está Vazio</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
                      Navegue pelas abas do portal e clique no ícone de estrela nos seus eventos, companhias (Cias) ou competidores preferidos para adicioná-los aqui e acompanhá-los rapidamente!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    {/* 1. EVENTOS FAVORITOS */}
                    {favorites.eventos.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', textTransform: 'uppercase', color: '#FFD700', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>Eventos Favoritados</h3>
                        <div className="events-grid">
                          {eventosOficiais.filter(ev => favorites.eventos.includes(ev.id.toString())).map(ev => (
                            <div key={ev.id} onClick={() => { window.history.pushState({}, '', '/evento/' + slugify(ev.nome)); setPublicEventSlug(slugify(ev.nome)); setSelectedEvent(ev); setSelectedRankingDay('Geral'); setEventTab('home'); }} className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                {ev.detalhes?.logo ? (
                                  <img src={ev.detalhes.logo} alt={ev.nome} style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '16px', background: 'rgba(0,0,0,0.4)', padding: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                ) : (
                                  <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>LOGO</div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                  <span className="event-date" style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{ev.tipo || 'RODEIO'}</span>
                                  <h3 className="event-name" style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2, fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.nome}</h3>
                                  {ev.detalhes?.circuito && (
                                    <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 'bold', marginTop: '0.2rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      Etapa: {ev.detalhes.circuito}
                                    </span>
                                  )}
                                </div>
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite('eventos', ev.id.toString());
                                  }}
                                  style={{
                                    padding: '8px',
                                    cursor: 'pointer',
                                    fontSize: '22px',
                                    color: '#FFD700',
                                    alignSelf: 'center',
                                    lineHeight: 1,
                                  }}
                                >
                                  ★
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
                                  {(ev.detalhes?.diretor?.includes('@') ? ev.detalhes.diretor.split('@')[0] : ev.detalhes?.diretor) || 'Diretor'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 2. COMPETIDORES FAVORITOS */}
                    {favorites.competitors.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', textTransform: 'uppercase', color: '#FFD700', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>Competidores Favoritados</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                          {peaoProfilesList.filter(p => favorites.competitors.includes(p.nome)).map(p => {
                            return (
                              <div key={p.id} onClick={() => {
                                // Calculate event history
                                const historico: any[] = [];
                                const cleanCpf = p.cpf ? p.cpf.replace(/\D/g, '') : '';
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
                                setSelectedPeaoProfile({ ...p, historico });
                                setCurrentTab('explore'); // view detailed profile
                              }} className="event-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                <img src={p.foto || "/novacontasfoto.jpg"} alt={p.nome} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</h4>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{p.cidade || 'Competidor'}</p>
                                </div>
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite('competitors', p.nome);
                                  }}
                                  style={{
                                    padding: '6px',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    color: '#FFD700',
                                  }}
                                >
                                  ★
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. COMPANHIAS / CIAS FAVORITAS */}
                    {favorites.cias.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', textTransform: 'uppercase', color: '#FFD700', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>Companhias Favoritadas (Cias)</h3>
                        <div className="boiadas-grid">
                          {boiadas.filter(b => favorites.cias.includes(b.nome)).map(b => {
                            const totalBulls = Object.keys(b.lados || {}).length;
                            return (
                              <div key={b.id} className="boiada-card" onClick={() => {
                                window.scrollTo(0, 0);
                                navigateTo(`/boiada/${slugify(b.nome)}`);
                              }} style={{ position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                  <h3 className="boiada-card-title" style={{ flex: 1, minWidth: 0, margin: 0 }}>{b.nome}</h3>
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite('cias', b.nome);
                                    }}
                                    style={{
                                      padding: '4px',
                                      cursor: 'pointer',
                                      fontSize: '22px',
                                      color: '#FFD700',
                                      marginTop: '-4px',
                                      lineHeight: 1,
                                    }}
                                  >
                                    ★
                                  </div>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px', marginTop: '4px' }}>
                                  {totalBulls} {totalBulls === 1 ? 'TOURO CADASTRADO' : 'TOUROS CADASTRADOS'}
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                  <span className="badge badge-rodeoapp" style={{ margin: 0, fontSize: '0.7rem' }}>Ver Touros</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* ADMIN DASHBOARD TAB */}
            {currentTab === 'dashboard' && (
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
                        
                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{selectedPeaoProfile.nome}</h3>
                          
                          <button
                            onClick={() => toggleFavorite('competitors', selectedPeaoProfile.nome)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 215, 0, 0.3)',
                              borderRadius: '20px',
                              padding: '6px 14px',
                              color: '#FFD700',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              marginTop: '6px',
                              fontFamily: 'inherit',
                            }}
                          >
                            <span style={{ fontSize: '15px', lineHeight: 1 }}>{favorites.competitors.includes(selectedPeaoProfile.nome) ? '★' : '☆'}</span>
                            <span>{favorites.competitors.includes(selectedPeaoProfile.nome) ? 'Favoritado' : 'Favoritar'}</span>
                          </button>
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
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                <span className="event-date" style={{ color: '#E11D48', fontWeight: '900', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{ev.tipo || 'RODEO'}</span>
                                <h3 className="event-name" style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2, fontWeight: '900', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.nome}</h3>
                                {ev.detalhes?.circuito && (
                                  <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 'bold', marginTop: '0.2rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    Etapa: {ev.detalhes.circuito}
                                  </span>
                                )}
                              </div>
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite('eventos', ev.id.toString());
                                }}
                                style={{
                                  padding: '8px',
                                  cursor: 'pointer',
                                  fontSize: '22px',
                                  color: '#FFD700',
                                  alignSelf: 'center',
                                  lineHeight: 1,
                                }}
                              >
                                {favorites.eventos.includes(ev.id.toString()) ? '★' : '☆'}
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
                                {(ev.detalhes?.diretor?.includes('@') ? ev.detalhes.diretor.split('@')[0] : ev.detalhes?.diretor) || 'Diretor'}
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
                        }} style={{ position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <h3 className="boiada-card-title" style={{ flex: 1, minWidth: 0, margin: 0 }}>{b.nome}</h3>
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite('cias', b.nome);
                              }}
                              style={{
                                padding: '4px',
                                cursor: 'pointer',
                                fontSize: '22px',
                                color: '#FFD700',
                                marginTop: '-4px',
                                lineHeight: 1,
                              }}
                            >
                              {favorites.cias.includes(b.nome) ? '★' : '☆'}
                            </div>
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px', marginTop: '4px' }}>
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

                    <button 
                      className="photo-upload-btn" 
                      style={{ 
                        marginTop: '0.75rem', 
                        width: '100%', 
                        fontSize: '0.85rem', 
                        padding: '0.75rem 1rem', 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.3)', 
                        fontWeight: 900,
                        cursor: 'pointer'
                      }}
                      onClick={() => setIsLogoutConfirmOpen(true)}
                    >
                      🚪 Desconectar da Conta
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

            {/* AO VIVO TAB */}
            {currentTab === 'aovivo' && (
              <div className="fade-in">
                {!selectedLive ? (
                  <div className="aovivo-list-container" style={{ padding: '2rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                      <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                      </span>
                      <h2 className="section-title" style={{ margin: 0, textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900 }}>Rodeio Ao Vivo</h2>
                    </div>

                    {lives.length === 0 ? (
                      <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <svg style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.2)', marginBottom: '1rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>Nenhuma transmissão ao vivo no momento.</p>
                      </div>
                    ) : (
                      <div className="aovivo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                        {lives.map(l => {
                          const portalCount = liveOnlineCounts[l.id] || 0;
                          const ytCount = ytOnlineCounts[l.id] || 0;
                          const totalCount = portalCount + ytCount;
                          return (
                            <div 
                              key={l.id} 
                              className="aovivo-card" 
                              onClick={() => setSelectedLive(l)}
                              style={{ 
                                background: '#0e0e0e', 
                                border: '1px solid rgba(255,255,255,0.08)', 
                                borderRadius: '32px', 
                                overflow: 'hidden', 
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <div style={{ position: 'relative', height: '200px', width: '100%', overflow: 'hidden' }}>
                                <img 
                                  src={l.capa_url || '/maiorqualidade.jpg'} 
                                  alt={l.titulo} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                                <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', letterSpacing: '0.1em', animation: 'pulse 2s infinite' }}>
                                  AO VIVO
                                </div>
                              </div>
                              <div style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', margin: '0 0 1rem 0', color: '#fff' }}>{l.titulo}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>
                                    {totalCount} {totalCount === 1 ? 'espectador' : 'espectadores'} online
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  // LIVE STREAM DETAILS & CHAT
                  <div className="live-detail-container" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '2rem', padding: '1rem 0' }}>
                    
                    {/* Left: Video Player */}
                    <div style={{ flex: isMobile ? 1.5 : 3.2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {isMobile ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <button 
                              onClick={() => { setSelectedLive(null); setLiveChatMessages([]); }}
                              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            </button>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', color: '#fff', letterSpacing: '-0.03em' }}>
                              RODEO<span style={{ color: '#eab308' }}>APP.PRO</span>
                            </span>
                            <div style={{ width: '40px' }}></div>
                          </div>
                          {renderSponsorAdBanner('mobile_top')}
                        </>
                      ) : (
                        renderSponsorAdBanner('pc_video_top')
                      )}
                      
                      {/* Video Embed */}
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '24px', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <iframe 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                          src={`https://www.youtube.com/embed/${(() => {
                            try {
                              if (!selectedLive?.link_live || typeof selectedLive.link_live !== 'string') return '';
                              const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                              const match = selectedLive.link_live.match(regExp);
                              return (match && match[2] && match[2].length === 11) ? match[2] : '';
                            } catch(e) {
                              return '';
                            }
                          })()}?autoplay=1`}
                          title={selectedLive.titulo}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: '#fff', margin: 0 }}>
                          {selectedLive.titulo}
                        </h3>
                        {!isMobile && (
                          <button 
                            onClick={() => { setSelectedLive(null); setLiveChatMessages([]); }}
                            style={{ 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              color: '#fff', 
                              padding: '8px 16px', 
                              borderRadius: '12px', 
                              cursor: 'pointer', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            Voltar
                          </button>
                        )}
                      </div>

                      {/* Important Announcements Cycling Banner */}
                      {selectedLive.alertas && selectedLive.alertas.length > 0 && (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '24px',
                          padding: '1rem 1.5rem',
                          marginTop: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          overflow: 'hidden'
                        }}>
                          <span style={{ 
                            color: '#fff', 
                            fontWeight: 900, 
                            fontSize: '10px', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            background: '#ef4444', 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>⚠️</span> AVISO IMPORTANTE
                          </span>
                          <div style={{ 
                            flex: 1, 
                            color: '#fff', 
                            fontSize: '13px', 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            animation: selectedLive.alertas.length > 1 ? 'fadeIn 0.5s ease-in-out' : 'none'
                          }}>
                            {selectedLive.alertas[activeAlertIndex % selectedLive.alertas.length]}
                          </div>
                        </div>
                      )}

                      {/* Weather Info Section */}
                      {selectedLive.cidade && (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: isMobile ? 'flex-start' : 'center', 
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: isMobile ? '0.75rem' : '1.5rem', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '24px', 
                          padding: '1rem 1.5rem', 
                          marginTop: '0.75rem' 
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em' }}>Cidade do Evento</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{selectedLive.cidade}</span>
                          </div>
                          
                          {/* Divider */}
                          {!isMobile && <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>}
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                            {selectedLive.temperatura && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '18px' }}>🌡️</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 900 }}>Temp</span>
                                  <span style={{ fontSize: '13px', fontWeight: 'black', color: '#fff' }}>{selectedLive.temperatura}</span>
                                </div>
                              </div>
                            )}

                            {selectedLive.previsao_chuva && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '18px' }}>🌧️</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 900 }}>Chuva</span>
                                  <span style={{ fontSize: '13px', fontWeight: 'black', color: '#fff' }}>{selectedLive.previsao_chuva}</span>
                                </div>
                              </div>
                            )}

                            {selectedLive.clima && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '18px' }}>
                                  {selectedLive.clima.toLowerCase().includes('chuva') || selectedLive.clima.toLowerCase().includes('chuvisco') ? '🌧️' : 
                                   selectedLive.clima.toLowerCase().includes('nublado') || selectedLive.clima.toLowerCase().includes('encoberto') ? '☁️' : 
                                   selectedLive.clima.toLowerCase().includes('tempestade') ? '⛈️' : '☀️'}
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 900 }}>Clima</span>
                                  <span style={{ fontSize: '13px', fontWeight: 'black', color: '#eab308' }}>{selectedLive.clima}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Interactive Poll Section */}
                      {selectedLive.enquete && (
                        <div style={{ 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          border: '1px solid rgba(255, 255, 255, 0.06)', 
                          borderRadius: '24px', 
                          padding: '1.5rem', 
                          marginTop: '0.75rem' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <span style={{ 
                              background: selectedLive.enquete.ativa ? '#eab308' : 'rgba(255,255,255,0.1)', 
                              color: selectedLive.enquete.ativa ? '#000' : 'rgba(255,255,255,0.6)', 
                              fontSize: '9px', 
                              fontWeight: 950, 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {selectedLive.enquete.ativa ? "Enquete" : "Enquete Encerrada"}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                              {selectedLive.enquete.pergunta}
                            </h4>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {hasVoted || !selectedLive.enquete.ativa ? (
                              selectedLive.enquete.opcoes.map((opt, idx) => {
                                const votes = selectedLive.enquete.votos[idx] || 0;
                                const total = selectedLive.enquete.votos.reduce((a, b) => a + b, 0) || 1;
                                const percent = Math.round((votes / total) * 100);
                                const isUserChoice = votedOptionIndex === idx;
                                return (
                                  <div 
                                    key={idx} 
                                    style={{ 
                                      position: 'relative', 
                                      background: 'rgba(255,255,255,0.02)', 
                                      borderRadius: '16px', 
                                      padding: '12px 16px', 
                                      border: isUserChoice ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.06)', 
                                      overflow: 'hidden' 
                                    }}
                                  >
                                    <div style={{ 
                                      position: 'absolute', 
                                      top: 0, 
                                      left: 0, 
                                      bottom: 0, 
                                      width: `${percent}%`, 
                                      background: 'rgba(234, 179, 8, 0.08)', 
                                      transition: 'width 0.5s ease-out' 
                                    }}></div>
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {opt}
                                        {isUserChoice && <span style={{ color: '#eab308', fontSize: '14px' }}>✓</span>}
                                      </span>
                                      <span style={{ color: '#eab308', fontWeight: 900 }}>{percent}% ({votes} {votes === 1 ? 'voto' : 'votos'})</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              selectedLive.enquete.opcoes.map((opt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleVote(idx)}
                                  style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '16px',
                                    padding: '14px',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    outline: 'none'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                >
                                  {opt}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: isMobile ? 'none' : 1, minWidth: isMobile ? 'none' : '380px', display: 'flex', flexDirection: 'column' }}>
                      {/* Middle Sponsor Banner ONLY for Mobile */}
                      {isMobile && renderSponsorAdBanner('mobile_middle')}

                      {/* Chat Container */}
                      <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? '450px' : '700px', background: '#090909', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px', overflow: 'hidden', position: 'relative' }}>
                        
                        {/* Chat Header */}
                        <div style={{ padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem', background: '#0e0e0e', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', color: '#eab308' }}>Chat Ao Vivo</h4>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                              {(liveOnlineCounts[selectedLive.id] || 0) + (ytOnlineCounts[selectedLive.id] || 0)} espectadores online
                            </span>
                          </div>
                          {isModerator && (
                            <button 
                              onClick={() => setIsModerationModalOpen(true)}
                              style={{ 
                                background: '#eab308', 
                                border: 'none', 
                                color: '#000', 
                                padding: '8px 16px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 900, 
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              🛡️ Moderação
                            </button>
                          )}
                        </div>

                        {/* Chat Messages */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {liveChatMessages.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 'bold' }}>
                              Diga olá no chat! 👋
                            </div>
                          ) : (
                            liveChatMessages.map(m => {
                              const isMsgAdmin = typeof m.email === 'string' && liveAdmins.includes(m.email.toLowerCase());
                              return (
                                <div key={m.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', opacity: m.is_deleted ? 0.6 : 1 }}>
                                  <img 
                                    src={m.foto || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                                    alt={m.nome} 
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: isMsgAdmin ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} 
                                    onClick={() => {
                                      if (isModerator && m.email !== user?.email) {
                                        if (window.confirm(`Moderar usuário ${m.nome} (${m.email})?`)) {
                                          const action = window.prompt("Escolha a ação:\n1. Dar Timeout de 1 minuto\n2. Dar Timeout de 5 minutos\n3. Dar Timeout de 1 hora\n4. Banir permanentemente\nDigite o número da ação:");
                                          if (action === '1') handleModerateUser(m.email, m.nome, 'timeout', 1);
                                          else if (action === '2') handleModerateUser(m.email, m.nome, 'timeout', 5);
                                          else if (action === '3') handleModerateUser(m.email, m.nome, 'timeout', 60);
                                          else if (action === '4') handleModerateUser(m.email, m.nome, 'ban');
                                        }
                                      }
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '11px', fontWeight: 900, color: isMsgAdmin ? '#eab308' : 'rgba(255,255,255,0.8)' }}>
                                        {m.nome} {isMsgAdmin && <span style={{ fontSize: '8px', background: '#eab308/10', color: '#eab308', padding: '1px 4px', borderRadius: '4px', marginLeft: '2px' }}>ADMIN</span>}
                                      </span>
                                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
                                        {m.created_at && !isNaN(new Date(m.created_at).getTime()) ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '13px', color: m.is_deleted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)', fontStyle: m.is_deleted ? 'italic' : 'normal', wordBreak: 'break-word' }}>
                                      {m.texto}
                                    </p>
                                  </div>
                                  {isModerator && !m.is_deleted && (
                                    <button 
                                      onClick={() => handleDeleteChatMessage(m.id)}
                                      style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.4)', cursor: 'pointer', fontSize: '12px', padding: '4px' }}
                                      title="Apagar mensagem"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Chat Input */}
                        <div style={{ padding: isMobile ? '1rem' : '1.25rem', background: '#0e0e0e', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          {isUserBanned ? (
                            <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '12px', fontWeight: 'bold', padding: '8px' }}>
                              🚫 Você está banido deste chat.
                            </div>
                          ) : userTimeoutUntil && new Date() < userTimeoutUntil ? (
                            <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: '11px', fontWeight: 'bold', padding: '8px' }}>
                              ⏳ Chat bloqueado temporariamente por spam.
                            </div>
                          ) : isChatLocked && !isModerator ? (
                            <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: '11px', fontWeight: 'bold', padding: '8px' }}>
                              🔒 Chat travado apenas para administradores.
                            </div>
                          ) : (
                            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                              <input 
                                type="text" 
                                value={liveChatInput}
                                onChange={e => setLiveChatInput(e.target.value)}
                                placeholder={isChatLocked ? "Chat travado para admins..." : "Envie uma mensagem..."}
                                disabled={isChatLocked && !isModerator}
                                style={{ 
                                  flex: 1, 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid rgba(255,255,255,0.08)', 
                                  borderRadius: '16px', 
                                  padding: '10px 16px', 
                                  color: '#fff', 
                                  fontSize: '16px', 
                                  outline: 'none' 
                                }} 
                              />
                              <button 
                                type="submit"
                                style={{ 
                                  background: '#eab308', 
                                  border: 'none', 
                                  color: '#000', 
                                  padding: '10px 20px', 
                                  borderRadius: '16px', 
                                  fontSize: '13px', 
                                  fontWeight: 900, 
                                  cursor: 'pointer' 
                                }}
                              >
                                Enviar
                              </button>
                            </form>
                          )}
                        </div>

                      </div>

                      {/* Bottom Sponsor Banner */}
                      {!isMobile && renderSponsorAdBanner('desktop_chat_bottom')}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {!selectedLive && (
          <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => { setCurrentTab('home'); setSearchTerm(''); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Home
          </button>
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
          <button className={`mobile-nav-item ${currentTab === 'aovivo' ? 'active' : ''}`} onClick={() => { setCurrentTab('aovivo'); setSelectedLive(null); setLiveChatMessages([]); setSearchTerm(''); }}>
            <span className="relative flex h-2.5 w-2.5 mb-1" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            AoVivo
          </button>
        </nav>
        )}
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

      {/* MODAL DE MODERAÇÃO DE CHAT */}
      {isModerationModalOpen && selectedLive && (
        <div className="modal-overlay active" style={{ zIndex: 9999 }}>
          <div className="auth-modal" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="close-btn" onClick={() => setIsModerationModalOpen(false)}>×</button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, color: '#eab308' }}>
              Painel de Moderação
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Lock Chat Control */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase' }}>Configuração do Chat</h3>
                <button 
                  onClick={handleToggleChatLock}
                  style={{ 
                    width: '100%', 
                    background: isChatLocked ? '#ef4444' : '#22c55e', 
                    color: '#fff', 
                    padding: '12px', 
                    borderRadius: '16px', 
                    fontWeight: 'bold', 
                    border: 'none', 
                    cursor: 'pointer' 
                  }}
                >
                  {isChatLocked ? "🔒 DESTRAVAR CHAT" : "🔓 TRAVAR CHAT (Apenas Admins)"}
                </button>
              </div>

              {/* Add Admin */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase' }}>Adicionar Administrador de Chat</h3>
                <form onSubmit={handleAddChatAdmin} style={{ display: 'flex', gap: '0.75rem' }}>
                  <input 
                    type="email" 
                    value={newAdminEmail} 
                    onChange={e => setNewAdminEmail(e.target.value)} 
                    placeholder="E-mail do novo admin"
                    style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                  />
                  <button type="submit" style={{ background: '#eab308', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Adicionar
                  </button>
                </form>
              </div>

              {/* Banned Users */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444' }}>Usuários Banidos</h3>
                {bannedUsersList.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Nenhum usuário banido.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {bannedUsersList.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{u.nome} ({u.email})</span>
                        <button 
                          onClick={() => handleModerateUser(u.email, u.nome, 'unban')}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Desbanir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeout Users */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#f59e0b' }}>Usuários em Timeout</h3>
                {timeoutUsersList.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Nenhum usuário em timeout ativo.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {timeoutUsersList.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{u.nome} ({u.email})</span>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Até: {u.until && !isNaN(new Date(u.until).getTime()) ? new Date(u.until).toLocaleTimeString('pt-BR') : ''}</span>
                        </div>
                        <button 
                          onClick={() => handleModerateUser(u.email, u.nome, 'untimeout')}
                          style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Important Announcements (Alerts) Control */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444' }}>Avisos Importantes</h3>
                
                <form onSubmit={handleAddAlert} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    value={newAlertText} 
                    onChange={e => setNewAlertText(e.target.value)} 
                    placeholder="Ex: Rodeio inicia às 21h com atraso."
                    style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                  />
                  <button type="submit" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Adicionar
                  </button>
                </form>

                {(!selectedLive.alertas || selectedLive.alertas.length === 0) ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Nenhum aviso ativo.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedLive.alertas.map((alertText, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{alertText}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveAlert(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Polls Control */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', color: '#eab308' }}>Gerenciar Enquete</h3>
                
                {selectedLive.enquete ? (
                  <div>
                    <div style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      <span style={{ background: selectedLive.enquete.ativa ? '#22c55e' : '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', marginRight: '6px' }}>
                        {selectedLive.enquete.ativa ? 'Ativa' : 'Encerrada'}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#fff' }}>{selectedLive.enquete.pergunta}</strong>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {selectedLive.enquete.opcoes.map((opt, idx) => {
                        const votes = selectedLive.enquete.votos[idx] || 0;
                        const total = selectedLive.enquete.votos.reduce((a, b) => a + b, 0) || 1;
                        const percent = Math.round((votes / total) * 100);
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                            <span>{opt}</span>
                            <strong>{percent}% ({votes} {votes === 1 ? 'voto' : 'votos'})</strong>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {selectedLive.enquete.ativa ? (
                        <button 
                          type="button"
                          onClick={handleClosePoll}
                          style={{ flex: 1, background: '#f59e0b', color: '#000', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Encerrar Votação
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={handleClearPoll}
                          style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Excluir Enquete
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleLaunchPoll} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="text" 
                      value={pollQuestion} 
                      onChange={e => setPollQuestion(e.target.value)} 
                      placeholder="Pergunta da Enquete"
                      required
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                    <input 
                      type="text" 
                      value={pollOpt1} 
                      onChange={e => setPollOpt1(e.target.value)} 
                      placeholder="Opção 1"
                      required
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                    <input 
                      type="text" 
                      value={pollOpt2} 
                      onChange={e => setPollOpt2(e.target.value)} 
                      placeholder="Opção 2"
                      required
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                    <input 
                      type="text" 
                      value={pollOpt3} 
                      onChange={e => setPollOpt3(e.target.value)} 
                      placeholder="Opção 3 (Opcional)"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                    <input 
                      type="text" 
                      value={pollOpt4} 
                      onChange={e => setPollOpt4(e.target.value)} 
                      placeholder="Opção 4 (Opcional)"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                    />
                    <button type="submit" style={{ background: '#eab308', color: '#000', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}>
                      Lançar Enquete
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
