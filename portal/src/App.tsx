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
  const [currentTab, setCurrentTab] = useState<'home' | 'explore' | 'feed' | 'boiadas' | 'profile'>('home');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [boiadas, setBoiadas] = useState<any[]>([]);
  const [selectedBoiada, setSelectedBoiada] = useState<any>(null);
  const [isBoiadasLoading, setIsBoiadasLoading] = useState(false);

  // Public Profile States
  const [publicProfileSlug, setPublicProfileSlug] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState<any>(null);
  const [publicProfileBio, setPublicProfileBio] = useState('');
  const [publicProfileFoto, setPublicProfileFoto] = useState('');
  const [isPublicProfileLoading, setIsPublicProfileLoading] = useState(false);

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
    
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    };

    const slug = slugify(userProfile.nome);
    const shareUrl = `${window.location.origin}/perfil/${slug}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Link de compartilhamento copiado!");
    }).catch(() => {
      alert(`Copie o link: ${shareUrl}`);
    });
  };

  useEffect(() => {
    const handleRouting = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/perfil/')) {
        const slug = path.replace('/perfil/', '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (slug) {
          setPublicProfileSlug(slug);
          setIsPublicProfileLoading(true);
          try {
            const queryPattern = '%' + slug.split('').join('%') + '%';
            const { data } = await supabase
              .from('perfis_portal')
              .select('*')
              .ilike('nome', queryPattern)
              .order('created_at', { ascending: false });

            const slugify = (text: string) => {
              return text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '');
            };

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
      } else {
        setPublicProfileSlug(null);
        setPublicProfile(null);
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    return () => window.removeEventListener('popstate', handleRouting);
  }, []);

  // Mock de eventos da semana
  const weeklyEvents = [
    { id: 1, name: "Barretos International Rodeo", date: "24 a 28 Ago", location: "Barretos, SP" },
    { id: 2, name: "Jaguariúna Rodeo Festival", date: "15 a 18 Set", location: "Jaguariúna, SP" },
    { id: 3, name: "Ribeirão Rodeo Music", date: "20 a 23 Abr", location: "Ribeirão Preto, SP" }
  ];

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
              {weeklyEvents.map(ev => (
                <div key={ev.id} className="event-card">
                  <div className="event-date">{ev.date}</div>
                  <h3 className="event-name">{ev.name}</h3>
                  <div className="event-location">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {ev.location}
                  </div>
                </div>
              ))}
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
  const exploreEvents = [
    { id: 1, name: "Barretos International Rodeo", date: "24 a 28 Ago", location: "Barretos, SP", status: "Próximo", description: "O maior rodeio da América Latina está de volta com as finais das montarias em touros e três tambores." },
    { id: 2, name: "Jaguariúna Rodeo Festival", date: "15 a 18 Set", location: "Jaguariúna, SP", status: "Inscrições Abertas", description: "Etapa qualificatória decisiva para o mundial, trazendo grandes shows e disputas eletrizantes na arena." },
    { id: 3, name: "Ribeirão Rodeo Music", date: "20 a 23 Abr", location: "Ribeirão Preto, SP", status: "Concluído", description: "Grande abertura do circuito paulista de rodeio com notas recordes e montarias inesquecíveis." },
    { id: 4, name: "Festa do Peão de Americana", date: "10 a 19 Jun", location: "Americana, SP", status: "Confirmado", description: "Uma das arenas mais tradicionais do país recebe a elite das boiadas brasileiras para mais uma edição histórica." }
  ];

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
  const filteredEvents = exploreEvents.filter(ev => 
    ev.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ev.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNews = newsFeed.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBoiadas = boiadas.filter(b => 
    b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.lados && Object.keys(b.lados).some(bull => bull.toLowerCase().includes(searchTerm.toLowerCase())))
  );

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
              Explore
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
            
            {/* EXPLORE TAB */}
            {currentTab === 'explore' && (
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Explorar Eventos</h2>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Acompanhe as etapas que estão rolando e os próximos grandes rodeios.</p>
                
                <div className="events-grid">
                  {filteredEvents.map(ev => (
                    <div key={ev.id} className="event-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="event-date">{ev.date}</span>
                        <span className="badge badge-rodeoapp" style={{ margin: 0, padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>{ev.status}</span>
                      </div>
                      <h3 className="event-name" style={{ fontSize: '1.35rem', margin: 0 }}>{ev.name}</h3>
                      <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4', flex: 1 }}>{ev.description}</p>
                      <div className="event-location" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        {ev.location}
                      </div>
                    </div>
                  ))}
                  {filteredEvents.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Nenhum evento encontrado para a busca "{searchTerm}".
                    </div>
                  )}
                </div>
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
    </>
  );
}

export default App;
