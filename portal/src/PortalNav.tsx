import { useEffect, useState } from 'react';

// Navegação da área logada do portal: menu lateral no computador e barra inferior no celular.

export type PortalTab = 'home' | 'dashboard' | 'explore' | 'feed' | 'boiadas' | 'minha-boiada' | 'profile' | 'aovivo';

type Item = { tab: PortalTab; label: string; icon: keyof typeof ICONES };

const ICONES = {
  inicio: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  eventos: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h3M8 16.5h6" />
    </>
  ),
  aovivo: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  feed: (
    <>
      <path d="M5 4h11a1 1 0 0 1 1 1v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z" />
      <path d="M17 9h2a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3" />
    </>
  ),
  boiadas: (
    <>
      <path d="M4 7c1.2 0 2.2-.8 2.6-2M20 7c-1.2 0-2.2-.8-2.6-2" />
      <path d="M6.6 7.5h10.8l-1 6.2A4.5 4.5 0 0 1 12 17.5a4.5 4.5 0 0 1-4.4-3.8z" />
      <path d="M10 20.5h4M9.5 11h.01M14.5 11h.01" />
    </>
  ),
  minha: (
    <>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3.5 19 6v5.5c0 4.2-3 7.6-7 9-4-1.4-7-4.8-7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  sair: <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />,
  mais: (
    <>
      <circle cx="5.5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18.5" cy="12" r="1.4" />
    </>
  ),
};

function Icone({ nome }: { nome: keyof typeof ICONES }) {
  return (
    <svg className="pnav-icone" viewBox="0 0 24 24" aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

type Props = {
  currentTab: string;
  onNavigate: (tab: PortalTab) => void;
  onLogout: () => void;
  isAdmin: boolean;
  isTropeiro: boolean;
  nome?: string;
  email?: string;
  foto?: string;
  hideMobile?: boolean;
};

function itensPrincipais(): Item[] {
  return [
    { tab: 'home', label: 'Início', icon: 'inicio' },
    { tab: 'explore', label: 'Eventos', icon: 'eventos' },
    { tab: 'aovivo', label: 'Ao vivo', icon: 'aovivo' },
    { tab: 'feed', label: 'Notícias', icon: 'feed' },
    { tab: 'boiadas', label: 'Boiadas', icon: 'boiadas' },
  ];
}

function itensConta(isAdmin: boolean, isTropeiro: boolean): Item[] {
  const lista: Item[] = [];
  if (isAdmin || isTropeiro) lista.push({ tab: 'minha-boiada', label: 'Minha boiada', icon: 'minha' });
  lista.push({ tab: 'profile', label: 'Meu perfil', icon: 'perfil' });
  if (isAdmin) lista.push({ tab: 'dashboard', label: 'Administração', icon: 'admin' });
  return lista;
}

function Rotulo({ item }: { item: Item }) {
  return (
    <>
      <Icone nome={item.icon} />
      <span>{item.label}</span>
      {item.tab === 'aovivo' && <span className="pnav-live" aria-hidden="true" />}
    </>
  );
}

export function PortalSidebar({ currentTab, onNavigate, onLogout, isAdmin, isTropeiro, nome, email, foto }: Props) {
  const botao = (item: Item) => (
    <button
      key={item.tab}
      type="button"
      className={`pnav-item${currentTab === item.tab ? ' is-active' : ''}`}
      aria-current={currentTab === item.tab ? 'page' : undefined}
      onClick={() => onNavigate(item.tab)}
    >
      <Rotulo item={item} />
    </button>
  );

  return (
    <aside className="dashboard-sidebar pnav-sidebar">
      <button type="button" className="pnav-marca" onClick={() => onNavigate('home')} aria-label="Início do portal">
        <img src="/header_logo.png" alt="RodeoApp" />
      </button>

      <nav className="pnav-grupo" aria-label="Portal">
        {itensPrincipais().map(botao)}
      </nav>

      <nav className="pnav-grupo pnav-grupo-conta" aria-label="Sua conta">
        <p className="pnav-titulo">Sua conta</p>
        {itensConta(isAdmin, isTropeiro).map(botao)}
      </nav>

      <div className="pnav-usuario">
        <img src={foto || '/novacontasfoto.jpg'} alt="" className="pnav-avatar" />
        <div className="pnav-usuario-texto">
          <strong>{nome || 'Minha conta'}</strong>
          {email && <span>{email}</span>}
        </div>
        <button type="button" className="pnav-sair" onClick={onLogout} title="Sair da conta" aria-label="Sair da conta">
          <Icone nome="sair" />
        </button>
      </div>
    </aside>
  );
}

export function PortalMobileNav({ currentTab, onNavigate, onLogout, isAdmin, isTropeiro, hideMobile }: Props) {
  const [maisAberto, setMaisAberto] = useState(false);
  const fixos: Item[] = itensPrincipais().filter(i => i.tab !== 'feed');
  const extras: Item[] = [{ tab: 'feed', label: 'Notícias', icon: 'feed' }, ...itensConta(isAdmin, isTropeiro)];
  const extraAtivo = extras.some(i => i.tab === currentTab);

  useEffect(() => {
    if (!maisAberto) return;
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setMaisAberto(false);
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [maisAberto]);

  if (hideMobile) return null;

  const ir = (tab: PortalTab) => {
    setMaisAberto(false);
    onNavigate(tab);
  };

  return (
    <>
      {maisAberto && (
        <div className="pnav-folha-fundo" onClick={() => setMaisAberto(false)}>
          <div className="pnav-folha" role="dialog" aria-label="Mais opções" onClick={e => e.stopPropagation()}>
            <span className="pnav-folha-alca" aria-hidden="true" />
            {extras.map(item => (
              <button
                key={item.tab}
                type="button"
                className={`pnav-item${currentTab === item.tab ? ' is-active' : ''}`}
                onClick={() => ir(item.tab)}
              >
                <Rotulo item={item} />
              </button>
            ))}
            <button type="button" className="pnav-item pnav-item-sair" onClick={() => { setMaisAberto(false); onLogout(); }}>
              <Icone nome="sair" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav pnav-barra" aria-label="Portal">
        {fixos.map(item => (
          <button
            key={item.tab}
            type="button"
            className={`pnav-aba${currentTab === item.tab ? ' is-active' : ''}`}
            aria-current={currentTab === item.tab ? 'page' : undefined}
            onClick={() => ir(item.tab)}
          >
            <Rotulo item={item} />
          </button>
        ))}
        <button
          type="button"
          className={`pnav-aba${extraAtivo || maisAberto ? ' is-active' : ''}`}
          aria-expanded={maisAberto}
          onClick={() => setMaisAberto(v => !v)}
        >
          <Icone nome="mais" />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}
