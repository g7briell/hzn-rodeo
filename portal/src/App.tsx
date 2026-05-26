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
  const [searchTerm, setSearchTerm] = useState('');
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [eventosOficiais, setEventosOficiais] = useState<any[]>([]);

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

  // Public Profile States
  const [publicProfileSlug, setPublicProfileSlug] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [publicProfileBio, setPublicProfileBio] = useState('');
  const [publicProfileFoto, setPublicProfileFoto] = useState('');
  const [isPublicProfileLoading, setIsPublicProfileLoading] = useState(false);

  // Public Boiada States
  const [publicBoiadaSlug, setPublicBoiadaSlug] = useState<string | null>(null);
  const [publicEventSlug, setPublicEventSlug] = useState<string | null>(null);
  const [selectedRankingDay, setSelectedRankingDay] = useState<string>('Geral');
  const [verifiedCpfs, setVerifiedCpfs] = useState<Set<string>>(new Set());
  const [eventTab, setEventTab] = useState<'home'|'ranking'|'sorteios'|'competidores'|'boiadas'|'noticias'|'midia'>('home');
  const [selectedSorteioDay, setSelectedSorteioDay] = useState<string>('');
  const [publicBoiada, setPublicBoiada] = useState<any>(null);
  const [isPublicBoiadaLoading, setIsPublicBoiadaLoading] = useState(false);

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
                    cidade: ev.cidade,
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
          fetchEventosOficiais();
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
          fetchEventosOficiais();
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
             }
          });
       }
    } else {
       setVerifiedCpfs(new Set());
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
            const { data } = await supabase
              .from('perfis_portal')
              .select('*')
              .ilike('nome', queryPattern)
              .order('created_at', { ascending: false });

            const match = data?.find(p => slugify(p.nome) === slug);
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
              const savedBio = localStorage.getItem(`bio_${match.email.toLowerCase().trim()}`);
              const savedFoto = localStorage.getItem(`foto_${match.email.toLowerCase().trim()}`);
              setPublicProfileBio(savedBio || '');
              setPublicProfileFoto(savedFoto || '');
            } else {
              setPublicProfile(null);
            }
          } catch (err) {
            console.error(err);
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
      } else {
        setPublicProfileSlug(null);
        setPublicProfile(null);
        setPublicBoiadaSlug(null);
        setPublicBoiada(null);
          setPublicEventSlug(null);
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

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
    setIsRegistering(true);
    setRegisterError('');

    try {
      // 1. Criar usuário no Auth do Supabase (Dispara e-mail de confirmação se configurado)
      const { error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });

      if (authError) throw new Error(authError.message);

      // 2. Salvar na tabela perfis_portal com endereço completo contendo Cidade e Estado
      const fullAddress = `${regAddress.trim()}, ${regCity.trim()} - ${regState.trim()}`;
      const { error: dbError } = await supabase.from('perfis_portal').insert([{
        nome: regName,
        email: regEmail,
        whatsapp: regWhatsapp,
        cpf: regCpf,
        rg: regRg,
        endereco: fullAddress,
        cargo: regRole,
        veio_do_app_desktop: isAppUser 
      }]);

      if (dbError) throw new Error(dbError.message);

      // Avança para tela de verificação de e-mail em vez de fechar
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
      // Validar código nativo de e-mail do Supabase
      const { error } = await supabase.auth.verifyOtp({
        email: regEmail,
        token: regOtpCode.trim(),
        type: 'signup'
      });

      if (error) throw new Error("Código inválido ou expirado.");

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
                  {selectedEvent.cidade}
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
                                if (!peao.cpf) return alert("CPF não vinculado.");
                                
                                const cleanCpf = peao.cpf.replace(/\D/g, '');
                                const { data } = await supabase.from('perfis_portal').select('*').eq('cpf', cleanCpf).limit(1);
                                
                                if (!data || data.length === 0) return alert("Perfil não encontrado.");
                                
                                const historico: any[] = [];
                                const cleanCpfData = data[0].cpf ? data[0].cpf.replace(/\D/g, '') : '';
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
                                        const rCpf = r.cpf ? r.cpf.replace(/\D/g, '') : '';
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
                                });
                                
                                setSelectedPeaoProfile({...data[0], historico});
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
                                  cidade: ev.cidade,
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
                            const { data } = await supabase.from('boiadas_oficiais').select('*').eq('status', 'aprovado');
                            setIsPublicProfileLoading(false);
                            if (data) {
                                let match = data.find(db => slugify(db.nome) === slugify(b.nome));
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
              <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Notícias em Breve</h3>
                <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>Este módulo está em desenvolvimento. Em breve, a comissão poderá publicar novidades e informativos sobre o evento.</p>
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
          {isProfileModalOpen && selectedPeaoProfile && (
            <div className="auth-modal" style={{ maxWidth: '900px', width: '90%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <button className="close-btn" onClick={() => setIsProfileModalOpen(false)}>✕</button>
              
              <div className="profile-card" style={{ width: '100%', marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                {/* Left Column: Avatar & Role */}
                <div className="profile-sidebar" style={{ flex: '1', minWidth: '250px', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
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
                      <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', color: '#fff' }}>{selectedPeaoProfile.nascimento || 'Não informado'}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Biografia</label>
                    <div className="read-only-field" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', minHeight: '80px', color: '#fff' }}>
                      {selectedPeaoProfile.bio || 'Este competidor ainda não adicionou uma biografia.'}
                    </div>
                  </div>
                  
                  {/* Historico */}
                  <div className="profile-history-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Histórico de Eventos</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

if (publicProfileSlug) {
    return (
      <div style={{ width: '100vw', overflowX: 'hidden' }}>
        {/* Header */}
        <header className="public-header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}><img src="/header_logo.png" alt="RodeoApp" style={{ height: "auto", maxHeight: "40px", maxWidth: "100%", objectFit: "contain" }} /></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => navigateTo('/')}>Ir para o Portal</button>
          </div>
        </header>

        <div className="profile-container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isPublicProfileLoading ? (
            <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 600 }}>Carregando Perfil...</div>
          ) : publicProfile ? (
            <div className="profile-card" style={{ width: '100%' }}>
              
              {/* Left Column: Avatar & Role */}
              <div className="profile-sidebar">
                <div className="profile-avatar-wrapper">
                  <img 
                    src={publicProfileFoto || "/novacontasfoto.jpg"} 
                    alt="Foto de Perfil" 
                    className={`profile-avatar ${publicProfile.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}`}
                  />
                </div>
                
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{publicProfile.nome}</h3>
                  <span className="badge badge-role" style={{ marginTop: '0.5rem' }}>
                    {publicProfile.cargo ? publicProfile.cargo.replace('_', ' ') : 'Membro'}
                  </span>
                </div>

                {publicProfile.veio_do_app_desktop && (
                  <span className="badge badge-rodeoapp" style={{ marginTop: '0.5rem' }}>
                    Sincronizado RodeoApp
                  </span>
                )}
              </div>

              {/* Right Column: Bio & Details */}
              <div className="profile-details">
                <div>
                  <h4 className="profile-section-title">Biografia</h4>
                  <p style={{ 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '12px', 
                    padding: '1.5rem',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    minHeight: '100px'
                  }}>
                    {publicProfileBio || "Este competidor ainda não adicionou uma biografia."}
                  </p>
                </div>

                <div>
                  <h4 className="profile-section-title">Contato e Localização</h4>
                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <span className="profile-info-label">WhatsApp</span>
                      <span className="profile-info-value">{publicProfile.whatsapp || '-'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-label">Endereço</span>
                      <span className="profile-info-value">{publicProfile.endereco || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ff4444' }}>Perfil Não Encontrado</h2>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>O competidor solicitado não foi encontrado ou o link é inválido.</p>
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
                    <div key={bullName} style={{ position: 'relative', height: '350px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', border: '2px solid rgba(255,255,255,0.1)' }}>
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
    const cidade = ev.cidade || '';
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

          {/* Hero Section */}
          <section className="hero">
            <h1 className="hero-title">O Portal Definitivo <br/><span className="text-primary">do Competidor</span></h1>
            <p className="hero-subtitle">
              Acompanhe seus eventos, verifique suas notas ao vivo e gerencie seu perfil profissional de rodeio em um único lugar.
            </p>
            <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }} onClick={() => setIsRegisterModalOpen(true)}>
              Fazer meu Cadastro Gratuito
            </button>
          </section>

          {/* Weekly Events Section */}
          <section className="events-section">
            <div className="section-header">
              <div>
                <h2 style={{ fontSize: '2rem' }}>Eventos da <span className="text-primary">Semana</span></h2>
                <p className="text-muted">Acompanhe as etapas que estão rolando agora</p>
              </div>
            </div>
            
            <div className="events-grid">
              {homeEvents.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  Nenhum evento oficial disponível no momento.
                </div>
              ) : (
                homeEvents.map(ev => (
                  <div key={ev.id} className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="event-date" style={{ background: 'var(--primary)', color: 'var(--bg-dark)', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {ev.data_inicio} {ev.data_fim ? `a ${ev.data_fim}` : ''}
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,215,0,0.1)', color: 'var(--primary)', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                        OFICIAL
                      </span>
                    </div>
                    <h3 className="event-name" style={{ margin: 0, fontSize: '1.5rem', fontStyle: 'italic', textTransform: 'uppercase', fontWeight: 900, color: 'var(--text-light)' }}>{ev.nome}</h3>
                    <div className="event-location" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {ev.local}
                    </div>
                    
                    {/* Renderização do Ranking/Detalhes se existir */}
                    {ev.detalhes?.ranking && ev.detalhes.ranking.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Top 3 - Ranking</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {ev.detalhes.ranking.slice(0, 3).map((competidor: any, idx: number) => (
                            <div 
                              key={idx} 
                              style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                              onClick={() => {
                                // Redirecionar para o perfil se houver slug no payload, senão gerar fallback
                                const slug = competidor.slug || slugify(competidor.nome);
                                navigateTo(`/perfil/${slug}`);
                              }}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <span style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: '0.9rem' }}>{idx + 1}º {competidor.nome}</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{competidor.pontuacao} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
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

  // Explore and feed lists

  const newsFeed = [
    {
      id: 1,
      title: "Gabriel Ramos assume a liderança do ranking nacional de Rodeio",
      description: "Após uma montaria espetacular na etapa de Barretos, o competidor paulista Gabriel Ramos conquistou a nota 91.50 pontos a bordo do touro 'Corte Seco', assumindo o topo da tabela do campeonato nacional. A disputa segue acirrada para a próxima etapa.",
      category: "Competições",
      time: "Há 2 horas"
    },
    {
      id: 2,
      title: "Nova boiada da CIA Rancho de Prata promete agitar a arena em Americana",
      description: "A Cia de Rodeio Rancho de Prata anunciou a estreia de 4 novos touros de alto rendimento para a Festa do Peão de Americana. Conhecidos por seus giros rápidos e mudanças abruptas de direção, os animais devem dificultar a vida dos competidores.",
      category: "Boiadas",
      time: "Ontem"
    },
    {
      id: 3,
      title: "Inscrições abertas para a grande etapa do Jaguariúna Rodeo Festival",
      description: "A organização do evento abriu oficialmente o credenciamento de atletas para as montarias em touros e cavalos. Com premiações recordes este ano, o evento promete atrair os melhores competidores e as principais companhias do Brasil.",
      category: "Eventos",
      time: "Há 3 dias"
    },
    {
      id: 4,
      title: "Supabase anuncia integração com sistema de notas ao vivo do RodeoApp",
      description: "A nova versão do portal do competidor agora está totalmente integrada com a nuvem do Supabase, permitindo que juízes lancem notas direto da arena e os atletas consultem seus resultados em tempo real através do celular.",
      category: "Tecnologia",
      time: "Há 1 semana"
    }
  ];

  // Filters based on search
  const filteredNews = newsFeed.filter(post => {
    const title = post.title || '';
    const description = post.description || '';
    const category = post.category || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           description.toLowerCase().includes(searchTerm.toLowerCase()) ||
           category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredBoiadas = boiadas.filter(b => {
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
                                {ev.cidade}
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
                  {filteredNews.map(post => (
                    <div key={post.id} className="news-card">
                      <div className="news-meta">
                        <span className="news-category">{post.category}</span>
                        <span className="news-time">{post.time}</span>
                      </div>
                      <h3 className="news-title">{post.title}</h3>
                      <p className="news-description">{post.description}</p>
                    </div>
                  ))}
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
                      <h4 className="profile-section-title">Informações Pessoais</h4>
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
    </>
  );
}

export default App;
