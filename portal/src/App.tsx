import { useState } from 'react';
import './index.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAppUser, setIsAppUser] = useState(false);

  // Simulação: se o e-mail terminar com @rodeoapp.pro, fingimos que ele já tem o App no PC
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val.includes('@rodeoapp.pro')) {
      setIsAppUser(true);
    } else {
      setIsAppUser(false);
    }
  };

  // Mock de eventos da semana para preencher a tela inicial
  const weeklyEvents = [
    { id: 1, name: "Barretos International Rodeo", date: "24 a 28 Ago", location: "Barretos, SP" },
    { id: 2, name: "Jaguariúna Rodeo Festival", date: "15 a 18 Set", location: "Jaguariúna, SP" },
    { id: 3, name: "Ribeirão Rodeo Music", date: "20 a 23 Abr", location: "Ribeirão Preto, SP" }
  ];

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAppUser) {
      alert("Sincronização com o App concluída com sucesso! (Simulação)");
    } else {
      alert("Cadastro simulado com sucesso! Em breve conectaremos ao Supabase.");
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="logo">RODEO<span className="text-primary">APP</span></div>
          <div className="header-buttons">
            <button className="btn btn-outline">Entrar</button>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Cadastre-se</button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero">
          <h1 className="hero-title">O Portal Definitivo <br/><span className="text-accent">do Competidor</span></h1>
          <p className="hero-subtitle">
            Acompanhe seus eventos, verifique suas notas ao vivo e gerencie seu perfil profissional de rodeio em um único lugar.
          </p>
          <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }} onClick={() => setIsModalOpen(true)}>
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

      {/* Registration Modal Overlay */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`}>
        <div className="auth-modal">
          <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
          <h2 className="modal-title">Crie sua <span className="text-primary">Conta</span></h2>
          <p className="modal-subtitle">Preencha seus dados para acessar o portal do competidor.</p>

          <form onSubmit={handleRegisterSubmit}>
            <div className="form-grid">
              
              <div className="form-group full">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="form-input" placeholder="João da Silva" required />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail {isAppUser && <span className="text-accent" style={{marginLeft:'5px', fontSize:'0.65rem'}}>Usuário do App Detectado!</span>}</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="joao@email.com" 
                  value={email}
                  onChange={handleEmailChange}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Crie uma Senha</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Mínimo 6 caracteres" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input type="tel" className="form-input" placeholder="(00) 00000-0000" required />
              </div>

              <div className="form-group">
                <label className="form-label">CPF</label>
                <input type="text" className="form-input" placeholder="000.000.000-00" required />
              </div>

              <div className="form-group">
                <label className="form-label">RG</label>
                <input type="text" className="form-input" placeholder="00.000.000-0" required />
              </div>

              <div className="form-group full">
                <label className="form-label">Endereço Completo</label>
                <input type="text" className="form-input" placeholder="Rua, Número, Bairro, Cidade - UF" required />
              </div>

              <div className="form-group full">
                <label className="form-label">Qual o seu Cargo no Rodeio?</label>
                <select className="form-select" required defaultValue="">
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

            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', padding: '1rem', backgroundColor: isAppUser ? 'var(--accent)' : 'var(--primary)' }}>
              {isAppUser ? 'Sincronizar Perfil com o RodeoApp' : 'Finalizar Cadastro'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
