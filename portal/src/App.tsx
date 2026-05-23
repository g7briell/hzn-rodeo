import { useState } from 'react';
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

  return (
    <>
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo">RODEO<span className="text-primary">APP</span></div>
          <div className="header-buttons">
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

export default App;
