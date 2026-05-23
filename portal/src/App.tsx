import { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './supabaseClient';

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
  const [userBio, setUserBio] = useState('');
  const [userFoto, setUserFoto] = useState('');
  const [currentTab, setCurrentTab] = useState<'home' | 'explore' | 'feed' | 'boiadas' | 'profile' | 'minha-boiada'>('home');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [eventosOficiais, setEventosOficiais] = useState<any[]>([]);
  const [selectedBoiada, setSelectedBoiada] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isBoiadasLoading, setIsBoiadasLoading] = useState(false);

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
        // Load bio and foto from localStorage
        const savedBio = localStorage.getItem(`bio_${email.toLowerCase().trim()}`);
        const savedFoto = localStorage.getItem(`foto_${email.toLowerCase().trim()}`);
        setUserBio(savedBio || '');
        setUserFoto(savedFoto || '');
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

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
        setEventosOficiais(data);
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
        if (user?.email) {
          localStorage.setItem(`foto_${user.email.toLowerCase().trim()}`, base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.email) return;

    localStorage.setItem(`bio_${user.email.toLowerCase().trim()}`, userBio);
    if (userFoto) {
      localStorage.setItem(`foto_${user.email.toLowerCase().trim()}`, userFoto);
    }

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
    const handleRouting = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/perfil/')) {
        const slug = path.replace('/perfil/', '').toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (slug) {
          setPublicProfileSlug(slug);
          setPublicBoiadaSlug(null);
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

  if (publicProfileSlug) {
    return (
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>RODEO<span className="text-primary">APP</span></div>
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
                    src={publicProfileFoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80"} 
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
      <div className="container">
        <header className="header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>RODEO<span className="text-primary">APP</span></div>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => navigateTo('/')}>Ir para o Portal</button>
          </div>
        </header>

        <div className="profile-container" style={{ minHeight: '70vh', padding: '2rem 0' }}>
          {isPublicBoiadaLoading ? (
            <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 600, textAlign: 'center', marginTop: '4rem' }}>Carregando Boiada...</div>
          ) : publicBoiada ? (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3rem', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>{publicBoiada.nome}</h1>
                <div style={{ display: 'inline-block', marginTop: '1rem' }}>
                  <span className="badge badge-rodeoapp" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>Boiada Oficial</span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
                Touros do Plantel ({Object.keys(publicBoiada.lados || {}).filter(k => k !== '__meta').length})
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {Object.keys(publicBoiada.lados || {}).filter(k => k !== '__meta').map(bullName => {
                  const side = publicBoiada.lados[bullName];
                  const details = publicBoiada.lados?.__meta?.touros_info?.[bullName] || {};
                  const hasVideo = !!details.video_url && getYoutubeId(details.video_url);
                  
                  return (
                    <div key={bullName} style={{ position: 'relative', height: '350px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', border: '2px solid rgba(255,255,255,0.1)' }}>
                      <img 
                        src={details.foto || "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=500&h=700&q=80"} 
                        alt="Foto do Touro" 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                      />
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)', zIndex: 1 }} />
                      
                      <div style={{ position: 'relative', zIndex: 2, padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '2rem', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                            {bullName}
                          </h4>
                          <span className={`bull-side side-${side.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                            Lado {side}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '1.1rem', textTransform: 'uppercase', fontStyle: 'italic', color: '#ddd', fontWeight: 300 }}>
                          {publicBoiada.nome}
                        </p>
                      </div>
                      
                      {hasVideo && (
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}>
                          <button 
                            style={{ background: 'rgba(255,0,0,0.8)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}
                            onClick={() => {
                              const vid = getYoutubeId(details.video_url);
                              if (vid) setActiveYoutubeVideoId(vid);
                            }}
                          >
                            ▶ Ver Pulo
                          </button>
                        </div>
                      )}
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

  if (!user) {
    return (
      <>
        <div className="container">
          {/* Header */}
          <header className="header">
            <div className="logo" style={{ cursor: 'pointer' }} onClick={() => { setCurrentTab('home'); navigateTo('/'); }}>RODEO<span className="text-primary">APP</span></div>
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
              {eventosOficiais.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
                  Nenhum evento oficial disponível no momento.
                </div>
              ) : (
                eventosOficiais.map(ev => (
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
  const filteredEvents = eventosOficiais.filter(ev => {
    if (ev.status !== 'aprovado') return false;
    return ev.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
           ev.cidade.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredNews = newsFeed.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBoiadas = boiadas.filter(b => {
    const isPending = b.lados?.__meta?.status === 'pendente';
    if (isPending) return false;
    return b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.lados && Object.keys(b.lados).some(bull => bull !== '__meta' && bull.toLowerCase().includes(searchTerm.toLowerCase())));
  });

  // Authenticated Dashboard Layout
  return (
    <>
      <div className="dashboard-layout">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-logo">
            RODEO<span className="text-primary">APP</span>
          </div>
          
          <nav className="sidebar-menu">
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
            
            {userProfile?.cargo === 'tropeiro' && (
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
                src={userFoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80"} 
                alt="Foto de Perfil" 
                className={`header-avatar ${userProfile?.veio_do_app_desktop ? 'rodeo-pulsing-avatar-small' : ''}`}
                onClick={() => setCurrentTab('profile')}
              />
            </div>
          </header>

          {/* Dynamic Tabs Content */}
          <div className="dashboard-content">
            
            {/* EVENTOS TAB (formerly Explore) */}
            {currentTab === 'explore' && (
              <div>
                {selectedEvent ? (
                  <div className="event-detail-view fade-in">
                    <button className="back-btn" onClick={() => setSelectedEvent(null)} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                      Voltar para Eventos
                    </button>

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

                    <div className="event-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div className="ranking-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Ranking (Peões)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedEvent.detalhes?.ranking && selectedEvent.detalhes.ranking.length > 0 ? (
                            selectedEvent.detalhes.ranking.map((peao: any, idx: number) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <span style={{ fontWeight: '900', color: '#E11D48', width: '20px' }}>{idx + 1}º</span>
                                  <span style={{ fontWeight: 'bold', cursor: 'pointer' }} className="hover:text-primary transition-colors" title="Em breve: Perfil do Competidor">
                                    {peao.nome}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                  <span>{peao.cidade}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum competidor registrado ainda.</p>
                          )}
                        </div>
                      </div>

                      <div className="boiadas-section" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Boiadas Registradas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedEvent.detalhes?.boiadas && selectedEvent.detalhes.boiadas.length > 0 ? (
                            selectedEvent.detalhes.boiadas.map((b: any, idx: number) => (
                              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontWeight: 'bold' }}>
                                {b.nome}
                              </div>
                            ))
                          ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Nenhuma boiada registrada ainda.</p>
                          )}
                        </div>
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
                          <div key={ev.id} onClick={() => setSelectedEvent(ev)} className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
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
                        <div key={b.id} className="boiada-card" onClick={() => setSelectedBoiada(b)}>
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
            {currentTab === 'minha-boiada' && userProfile?.cargo === 'tropeiro' && (
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
                              src={details.foto || "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=500&h=700&q=80"} 
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

                            <div style={{ position: 'relative', zIndex: 2, padding: '1.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                                  {bullName}
                                </h4>
                                <span className={`bull-side side-${side.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                                  Lado {side}
                                </span>
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
                        src={userFoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80"} 
                        alt="Foto de Perfil" 
                        className={`profile-avatar ${userProfile?.veio_do_app_desktop ? 'rodeo-pulsing-avatar' : ''}`}
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

                    <span className="badge badge-role" style={{ marginTop: '1rem' }}>
                      {userProfile?.cargo ? userProfile.cargo.replace('_', ' ') : 'Membro'}
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
      {/* MODAL DE DETALHES DA BOIADA (TOUROS) */}
      {/* ==================================== */}
      {selectedBoiada && (
        <div className="modal-overlay active">
          <div className="auth-modal" style={{ maxWidth: '600px' }}>
            <button className="close-btn" onClick={() => setSelectedBoiada(null)}>×</button>
            <h2 className="modal-title">{selectedBoiada.nome}</h2>
            <p className="modal-subtitle">Lista de touros oficiais desta companhia e suas direções de giro na arena.</p>
            
            <div className="bulls-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {Object.entries(selectedBoiada.lados || {}).map(([bullName, side]: [string, any]) => (
                <div key={bullName} className="bull-item">
                  <span className="bull-name">{bullName}</span>
                  <span className={`bull-side side-${side.toLowerCase().replace(/[^a-z]/g, '')}`}>
                    Lado {side}
                  </span>
                </div>
              ))}
              {Object.keys(selectedBoiada.lados || {}).length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  Nenhum touro cadastrado nesta boiada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <option value="Esquerdo">Esquerdo</option>
                  <option value="Direito">Direito</option>
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
