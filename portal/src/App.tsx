import './index.css';

function App() {
  return (
    <div className="login-container">
      <h1 className="logo">RODEO<span>APP</span></h1>
      <p className="subtitle">Portal do Competidor</p>
      
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input 
            type="email" 
            id="email" 
            className="form-input" 
            placeholder="Digite seu e-mail" 
            required 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input 
            type="password" 
            id="password" 
            className="form-input" 
            placeholder="Digite sua senha" 
            required 
          />
        </div>
        
        <button type="submit" className="btn-primary">
          Entrar no Portal
        </button>
      </form>

      <div className="dev-badge">
        Em Desenvolvimento 🚧
      </div>
    </div>
  );
}

export default App;
