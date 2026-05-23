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
  const [currentTab, setCurrentTab] = useState<'home' | 'profile'>('home');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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
          }
          return;
        }
      }

      if (session?.user && localStorage.getItem('hzn_portal_authenticated') === 'true') {
        setUser(session.user);
        if (session.user.email) {
          fetchUserProfile(session.user.email);
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

  return (
    <>
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => { setCurrentTab('home'); navigateTo('/'); }}>RODEO<span className="text-primary">APP</span></div>
          <div className="header-buttons" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {user ? (
              <>
                <span 
                  className="user-name-link" 
                  style={{ 
                    cursor: 'pointer', 
                    fontWeight: 600, 
                    color: 'var(--primary)',
                    textDecoration: 'underline',
                    fontSize: '0.95rem'
                  }}
                  onClick={() => setCurrentTab('profile')}
                >
                  {userProfile?.nome || user.email}
                </span>
                <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={() => setIsLogoutConfirmOpen(true)}>Sair</button>
              </>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => setIsLoginModalOpen(true)}>Entrar</button>
                <button className="btn btn-primary" onClick={() => setIsRegisterModalOpen(true)}>Cadastre-se</button>
              </>
            )}
          </div>
        </header>

        {currentTab === 'home' ? (
          <>
            {/* Hero Section */}
            <section className="hero">
              <h1 className="hero-title">O Portal Definitivo <br/><span className="text-primary">do Competidor</span></h1>
              <p className="hero-subtitle">
                Acompanhe seus eventos, verifique suas notas ao vivo e gerencie seu perfil profissional de rodeio em um único lugar.
              </p>
              {!user && (
                <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }} onClick={() => setIsRegisterModalOpen(true)}>
                  Fazer meu Cadastro Gratuito
                </button>
              )}
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
          </>
        ) : (
          <div className="profile-container">
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

    </>
  );
}

export default App;
