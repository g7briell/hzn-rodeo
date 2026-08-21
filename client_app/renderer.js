window.formatSide = function(s) {
  if (!s) return '';
  const l = String(s).trim().toLowerCase();
  if (l === 'direito' || l === 'd' || l === 'c' || l === 'certo') return 'C';
  if (l === 'esquerdo' || l === 'e' || l === 'errado') return 'E';
  return String(s).trim().toUpperCase();
};
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('[ERRO GLOBAL CAPTURADO]:', msg, url, lineNo, columnNo, error);
    if (typeof window.showDebugLogError === 'function') {
        window.showDebugLogError('Erro no Script', error || new Error(msg), { url, lineNo, columnNo });
    }
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('[PROMISE REJEITADA]:', event.reason);
    if (typeof window.showDebugLogError === 'function') {
        window.showDebugLogError('Operação Assíncrona Rejeitada', event.reason || new Error(String(event.reason)));
    }
});

// Seleção de elementos (serão preenchidos no DOMContentLoaded)
let loginScreen, homeScreen, introScreen, introText, errorMsg, btnActivate, daysBadge, loadingOverlay;
let modalEvento, formEvento, eventControlView, supportBtn, sportSelectScreen, transmissaoScreen;

let currentEvent = null;
window.getCurrentEvent = () => currentEvent;
window.setCurrentEvent = (ev) => { currentEvent = ev; window.currentEvent = ev; };
let heartbeatInterval = null;
let offlineCheckInterval = null;
let currentExpiryDate = null;
let editingPeaoIdx = null;
let editingBoiadaIdx = null;
let daysBadgeInterval = null;

// Estados Globais de Esportes
let userSports = ['rodeio'];
let currentSport = 'rodeio';

// Banco de Dados Local Global
let globalPeoes = [];
let globalBoiadas = [];

window.lastSyncStatus = 'connecting';
window.lastSyncErrorDetails = '';

function updateConnectionStatus(status, errorDetails = '') {
    window.lastSyncStatus = status;
    if (errorDetails) window.lastSyncErrorDetails = errorDetails;

    const dots = [
        document.getElementById('db-status-dot'), 
        document.getElementById('transmissao-db-status-dot'),
        document.getElementById('event-sync-dot')
    ];
    const texts = [
        document.getElementById('db-status-text'), 
        document.getElementById('transmissao-db-status-text'),
        document.getElementById('event-sync-text')
    ];
    
    dots.forEach((dot, idx) => {
        const text = texts[idx];
        if (!dot || !text) return;
        
        dot.className = "w-3 h-3 rounded-full transition-all";
        text.className = "text-[9px] font-black uppercase tracking-[0.3em] transition-all";
        
        if (status === 'connected' || status === 'synced') {
            dot.classList.add('bg-emerald-500', 'shadow-[0_0_10px_rgba(16,185,129,0.8)]');
            text.classList.add('text-emerald-400');
            text.innerText = "SINCRONIZADO";
        } else if (status === 'connecting' || status === 'syncing') {
            dot.classList.add('bg-yellow-500', 'shadow-[0_0_10px_rgba(234,179,8,0.8)]', 'animate-pulse');
            text.classList.add('text-yellow-400');
            text.innerText = "SINCRONIZANDO...";
        } else {
            dot.classList.add('bg-red-500', 'shadow-[0_0_10px_rgba(239,68,68,0.8)]', 'animate-bounce');
            text.classList.add('text-red-400');
            text.innerText = "NÃO SINCRONIZADO";
        }
    });
}

window.handleSyncStatusClick = () => {
    const modalMsg = document.getElementById('sync-error-modal-message');
    const modalSubtitle = document.getElementById('sync-error-modal-subtitle');
    const modal = document.getElementById('modal-sync-error');
    
    if (!modal) return;
    
    if (window.lastSyncStatus === 'connected' || window.lastSyncStatus === 'synced') {
        if (modalSubtitle) modalSubtitle.innerText = "Status: Conectado e Sincronizado";
        if (modalMsg) modalMsg.innerHTML = `<span class="text-emerald-400 font-bold">🟢 Todos os eventos e alterações estão 100% salvos e sincronizados com a nuvem no seu e-mail (${getCurrentUserEmail()}).</span>`;
    } else if (window.lastSyncStatus === 'connecting' || window.lastSyncStatus === 'syncing') {
        if (modalSubtitle) modalSubtitle.innerText = "Status: Sincronizando com a Nuvem";
        if (modalMsg) modalMsg.innerHTML = `<span class="text-yellow-400 font-bold">🟡 O sistema está enviando/recebendo atualizações do banco de dados na nuvem neste momento...</span>`;
    } else {
        if (modalSubtitle) modalSubtitle.innerText = "Status: Erro de Sincronização / Conexão";
        if (modalMsg) modalMsg.innerText = window.lastSyncErrorDetails || "Não foi possível conectar ou enviar alterações para o banco de dados na nuvem. Verifique sua conexão de internet.";
    }
    
    modal.classList.remove('hidden');
};

function debounce(func, wait = 150) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.retrySync = async () => {
    const modal = document.getElementById('modal-sync-error');
    if (modal) modal.classList.add('hidden');
    await window.verifyConnection();
    await window.syncUserEventsWithCloud();
};

window.syncUserEventsWithCloud = async () => {
    const email = getCurrentUserEmail();
    if (!email) return;

    try {
        if (window.electronAPI && window.electronAPI.syncUserCloudEvents) {
            const res = await window.electronAPI.syncUserCloudEvents(email);
            if (res && res.success) {
                updateConnectionStatus('synced');

                // Só re-renderiza a tela se de fato houve alteração vinda da nuvem
                if (res.hasChanges) {
                    renderEvents();

                    if (currentEvent) {
                        const allEvs = await window.electronAPI.getLocalEvents(email);
                        const freshEv = (allEvs || []).find(e => 
                            (e.id && currentEvent.id && String(e.id) === String(currentEvent.id)) || 
                            (e.share_id && currentEvent.share_id && e.share_id === currentEvent.share_id) ||
                            (e.name && currentEvent.name && e.name.trim().toLowerCase() === currentEvent.name.trim().toLowerCase())
                        );
                        if (freshEv) {
                            currentEvent = freshEv;
                            refreshActiveViewData();
                        }
                    }
                }
            } else {
                updateConnectionStatus('error', res ? res.error : "Erro ao sincronizar eventos com a nuvem.");
            }
        } else {
            updateConnectionStatus('synced');
        }
    } catch (e) {
        console.error("Erro na sincronização automática dos eventos:", e);
        updateConnectionStatus('error', e.message || String(e));
    }
};

window.persistAndSyncEvent = async (eventObj) => {
    const email = getCurrentUserEmail();
    if (!email || !eventObj) return;
    try {
        // Atualiza localmente e despacha sync em background direto sem re-renderizar o DOM em loop
        await window.electronAPI.updateLocalEvent(email, eventObj);
    } catch (err) {
        console.error("Erro ao persistir evento:", err);
    }
};

// Guarda índice do sorteio detalhado aberto (para restaurar após sync)
let _openSorteioDetailIdx = null;

function refreshActiveViewData() {
    if (!currentEvent) return;

    // Atualiza cabeçalhos do evento
    const infoEl = document.getElementById('control-event-info');
    if (infoEl) {
        const jCount = currentEvent.juizes ? currentEvent.juizes.length : (currentEvent.judges || 0);
        infoEl.innerText = `${currentEvent.city || ''} - ${currentEvent.days || 3} DIAS - ${jCount} JUIZES`;
    }

    // 1. Lista de Peões (Tela cheia) — preserva scroll
    const listPeoesView = document.getElementById('list-peoes-view');
    if (listPeoesView && !listPeoesView.classList.contains('hidden')) {
        const scrollEl = listPeoesView.querySelector('[id$="-container"]') || listPeoesView;
        const savedScroll = scrollEl.scrollTop;
        openListPeoes();
        requestAnimationFrame(() => { scrollEl.scrollTop = savedScroll; });
    }

    // 2. Modal de Juízes
    const modalJuizes = document.getElementById('modal-list-juizes');
    if (modalJuizes && !modalJuizes.classList.contains('hidden')) {
        openListJuizes();
    }

    // 3. Lista de Boiadas (Tela cheia) — preserva scroll
    const listBoiadasView = document.getElementById('list-boiadas-view');
    if (listBoiadasView && !listBoiadasView.classList.contains('hidden')) {
        const scrollEl = listBoiadasView.querySelector('[id$="-container"]') || listBoiadasView;
        const savedScroll = scrollEl.scrollTop;
        openListBoiadas();
        requestAnimationFrame(() => { scrollEl.scrollTop = savedScroll; });
    }

    // 4. Lista de Sorteios Realizados — preserva estado
    const listSorteiosView = document.getElementById('list-sorteios-view');
    if (listSorteiosView && !listSorteiosView.classList.contains('hidden')) {
        const container = document.getElementById('sorteios-table-container');
        const savedScroll = container ? container.scrollTop : 0;
        if (_openSorteioDetailIdx !== null && currentEvent.sorteios && currentEvent.sorteios[_openSorteioDetailIdx]) {
            window.viewDrawDetails(_openSorteioDetailIdx);
        } else {
            openSorteiosList();
            requestAnimationFrame(() => { if (container) container.scrollTop = savedScroll; });
        }
    }

    // 5. Tela de Lançamento de Notas / Cards — preserva scroll
    const viewNotasList = document.getElementById('view-notas-list');
    if (viewNotasList && !viewNotasList.classList.contains('hidden')) {
        const scrollEl = viewNotasList.querySelector('[id$="-container"]') || viewNotasList;
        const savedScroll = scrollEl.scrollTop;
        renderNotasCards();
        requestAnimationFrame(() => { scrollEl.scrollTop = savedScroll; });
    }

    // 6. Tela de Ranking — preserva scroll
    const rankingView = document.getElementById('ranking-view');
    if (rankingView && !rankingView.classList.contains('hidden')) {
        const savedScroll = rankingView.scrollTop;
        renderRanking('geral');
        requestAnimationFrame(() => { rankingView.scrollTop = savedScroll; });
    }

    // 7. Tela de Ranking de Animais — preserva scroll
    const rankingAnimaisView = document.getElementById('ranking-animais-view');
    if (rankingAnimaisView && !rankingAnimaisView.classList.contains('hidden')) {
        const savedScroll = rankingAnimaisView.scrollTop;
        renderRankingAnimais();
        requestAnimationFrame(() => { rankingAnimaisView.scrollTop = savedScroll; });
    }

    // 8. Modal de Conferência de Notas — não re-renderiza durante flow ativo
    const modalNotasSummary = document.getElementById('modal-notas-summary');
    if (modalNotasSummary && !modalNotasSummary.classList.contains('hidden')) {
        window.finishScoringFlow();
    }
}

// Loop de Sincronização em Tempo Real (a cada 30 segundos suave e não intrusivo)
let realtimeSyncInterval = null;
function startRealtimeSyncLoop() {
    if (realtimeSyncInterval) clearInterval(realtimeSyncInterval);
    realtimeSyncInterval = setInterval(() => {
        if (!navigator.onLine || !getCurrentUserEmail()) return;
        // Não sincroniza se o usuário está no meio de um sorteio manual (step > 1)
        const sorteioView = document.getElementById('sorteio-manual-view');
        const step1 = document.getElementById('step-1');
        const inSorteioFlow = sorteioView && !sorteioView.classList.contains('hidden') &&
                              step1 && step1.classList.contains('hidden');
        if (inSorteioFlow) return;
        window.syncUserEventsWithCloud();
    }, 30000);
}

startRealtimeSyncLoop();

async function verifyConnection() {
    if (!navigator.onLine) {
        updateConnectionStatus('error', 'Sem conexão com a internet.');
        return false;
    }
    try {
        const connected = await window.electronAPI.checkDbConnection();
        if (connected) {
            updateConnectionStatus('connected');
            return true;
        } else {
            updateConnectionStatus('error', 'Não foi possível estabelecer resposta com o banco de dados.');
            return false;
        }
    } catch (e) {
        updateConnectionStatus('error', 'Erro ao verificar conexão.');
        return false;
    }
}

function parseCityFromAddress(address) {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length > 1) {
        const cityState = parts[1].split('-');
        return cityState[0].trim().toUpperCase();
    }
    return address.trim().toUpperCase();
}

let _cachedOnlineCompetitors = null;
let _lastOnlineCompetitorsFetch = 0;

async function fetchGlobalData() {
    const email = getCurrentUserEmail();
    if (!email) return;
    try {
        const data = await window.electronAPI.getGlobalData(email);
        globalPeoes = data.peoes || [];
        globalBoiadas = data.boiadas || [];
        
        // Cache de 3 minutos para competidores online do portal (evita flood de queries)
        if (navigator.onLine) {
            try {
                const now = Date.now();
                if (!_cachedOnlineCompetitors || (now - _lastOnlineCompetitorsFetch > 180000)) {
                    const res = await window.electronAPI.getOnlineCompetitors();
                    if (res && res.success && res.competitors) {
                        _cachedOnlineCompetitors = res.competitors;
                        _lastOnlineCompetitorsFetch = now;
                    }
                }

                if (_cachedOnlineCompetitors && _cachedOnlineCompetitors.length > 0) {
                    const peaoKeySet = new Set();
                    globalPeoes.forEach(p => {
                        const cpf = (p.cpf || '').replace(/\D/g, '');
                        if (cpf) peaoKeySet.add(`cpf:${cpf}`);
                        const name = (p.nome || '').trim().toUpperCase();
                        if (name) peaoKeySet.add(`name:${name}`);
                    });

                    const extraPeoes = [];
                    _cachedOnlineCompetitors.forEach(op => {
                        const opName = (op.nome || '').trim().toUpperCase();
                        const opCpf = (op.cpf || '').replace(/\D/g, '');
                        if (!opName) return;

                        const hasCpf = opCpf && peaoKeySet.has(`cpf:${opCpf}`);
                        const hasName = peaoKeySet.has(`name:${opName}`);

                        if (!hasCpf && !hasName) {
                            if (opCpf) peaoKeySet.add(`cpf:${opCpf}`);
                            peaoKeySet.add(`name:${opName}`);
                            extraPeoes.push({
                                nome: opName,
                                cidade: parseCityFromAddress(op.endereco),
                                cpf: op.cpf || '',
                                score: 0
                            });
                        }
                    });

                    if (extraPeoes.length > 0) {
                        globalPeoes = [...globalPeoes, ...extraPeoes];
                    }
                }
            } catch (err) {
                console.warn("Erro ao fundir dados online:", err);
            }
        }
    } catch (e) {
        console.error('Failed to fetch global data:', e);
    }
}

// Calcula o tempo restante a partir de uma data de expiração ISO
function getRemainingTime(expiryISO) {
    if (!expiryISO) return { days: 0, hours: 0, minutes: 0, total: 0 };
    const now = new Date();
    const expiry = new Date(expiryISO);
    const diff = expiry - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, total: 0 };
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return { days, hours, minutes, total: diff };
}

// Atualiza o texto do badge com dias restantes reais
function updateDaysBadge() {
    if (!daysBadge) return;
    try {
        if (!currentExpiryDate) {
            daysBadge.innerText = '-- dias restantes';
            return;
        }
        const r = getRemainingTime(currentExpiryDate);
        if (r.total <= 0) {
            daysBadge.innerText = 'LICENÇA EXPIRADA';
            daysBadge.style.color = '#ef4444';
            
            alert('O tempo da sua licença acabou! O sistema será bloqueado de forma automática.');
            window.electronAPI.clearAuth();
            showLogin();
            return;
        } else if (r.days === 0) {
            daysBadge.innerText = r.hours + 'h ' + r.minutes + 'min restantes';
            daysBadge.style.color = '#f97316';
        } else {
            daysBadge.innerText = r.days + ' dias restantes';
            daysBadge.style.color = '';
        }
    } catch(e) {
        daysBadge.innerText = '-- dias restantes';
    }
}

// Flag para evitar múltiplos listeners no badge
let daysBadgeTooltipSetup = false;

// Configura o tooltip de contagem regressiva no badge
function setupDaysBadgeTooltip() {
    if (!daysBadge || daysBadgeTooltipSetup) return;
    daysBadgeTooltipSetup = true;
    daysBadge.style.cursor = 'help';
    daysBadge.style.position = 'relative';

    let tooltip = document.getElementById('days-countdown-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'days-countdown-tooltip';
        tooltip.style.cssText = [
            'display:none',
            'position:fixed',
            'background:linear-gradient(135deg,#0f172a,#1e293b)',
            'border:1px solid rgba(234,179,8,0.3)',
            'color:#fff',
            'padding:14px 20px',
            'border-radius:16px',
            'font-size:13px',
            'font-weight:700',
            'font-family:Arial,sans-serif',
            'white-space:nowrap',
            'z-index:99999',
            'pointer-events:none',
            'box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(234,179,8,0.1)',
            'backdrop-filter:blur(10px)',
            'transition:opacity 0.2s'
        ].join(';');
        document.body.appendChild(tooltip);
    }

    let tipInterval = null;

    function updateTip() {
        const r = getRemainingTime(currentExpiryDate);
        if (r.total <= 0) {
            tooltip.innerHTML = '<div style="color:#ef4444;font-size:15px;">&#9940; Licença expirada!</div>';
        } else {
            const urgency = r.days < 3 ? '#ef4444' : r.days < 7 ? '#f97316' : '#eab308';
            tooltip.innerHTML =
                '<div style="color:#94a3b8;font-size:10px;letter-spacing:2px;margin-bottom:8px;">&#9203; TEMPO RESTANTE DE USO</div>' +
                '<div style="font-size:22px;font-weight:900;font-style:italic;color:' + urgency + ';">' +
                    (r.days > 0 ? r.days + '<span style="font-size:12px;color:#94a3b8;"> dia' + (r.days !== 1 ? 's' : '') + '</span> ' : '') +
                    r.hours + '<span style="font-size:12px;color:#94a3b8;">h </span>' +
                    r.minutes + '<span style="font-size:12px;color:#94a3b8;">min</span>' +
                '</div>';
        }
    }

    daysBadge.addEventListener('mouseenter', function(e) {
        updateTip();
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY - 70) + 'px';
        tipInterval = setInterval(updateTip, 30000);
    });

    daysBadge.addEventListener('mousemove', function(e) {
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY - 70) + 'px';
    });

    daysBadge.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
        if (tipInterval) { clearInterval(tipInterval); tipInterval = null; }
    });
}

// Helper para visibilidade do suporte
function toggleSupportBtn(visible) {
    const btn = document.getElementById('support-btn');
    if (btn) {
        if (visible) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    }
}

// Estados de Sorteio
let sorteioData = { day: '', riders: [], bulls: [], assignments: {} };

// Helper para pegar o email do usuário logado
function getCurrentUserEmail() {
    const auth = window.electronAPI.getAuth();
    return auth ? auth.email : null;
}

// Inicialização segura
window.addEventListener('DOMContentLoaded', () => {
    // --- Version Display ---
    if (window.electronAPI && window.electronAPI.getAppVersion) {
        window.electronAPI.getAppVersion().then(v => {
            const versionEl = document.getElementById('app-version-display');
            if (versionEl) versionEl.innerText = 'v' + v;
        }).catch(console.error);
    }

    loginScreen = document.getElementById('login-screen');
    homeScreen = document.getElementById('home-screen');
    introScreen = document.getElementById('intro-screen');
    introText = document.getElementById('intro-text');
    errorMsg = document.getElementById('error-msg');
    btnActivate = document.getElementById('btn-activate');
    daysBadge = document.getElementById('days-badge');
    loadingOverlay = document.getElementById('loading-overlay');
    modalEvento = document.getElementById('modal-evento');
    formEvento = document.getElementById('form-evento');
    eventControlView = document.getElementById('event-control-view');
    supportBtn = document.getElementById('support-btn');
    sportSelectScreen = document.getElementById('sport-select-screen');
    transmissaoScreen = document.getElementById('transmissao-screen');

    if (btnActivate) btnActivate.addEventListener('click', handleActivation);
    if (formEvento) formEvento.addEventListener('submit', handleEventSubmit);

    // Registrar listener em tempo real para atualizações na licença
    if (window.electronAPI.onLicenseRealtimeUpdate) {
        window.electronAPI.onLicenseRealtimeUpdate((updatedLicense) => {
            const auth = window.electronAPI.getAuth();
            if (auth && auth.email && updatedLicense.email && auth.email.toLowerCase().trim() === updatedLicense.email.toLowerCase().trim()) {
                console.log('RODEOAPP Realtime: Recebida atualização da licença pelo admin!', updatedLicense);
                
                // Se foi desativada pelo admin
                if (!updatedLicense.is_active) {
                    alert('Sua licença foi desativada pelo administrador. O sistema será bloqueado.');
                    window.electronAPI.clearAuth();
                    showLogin();
                    return;
                }

                // Caso contrário, recalcula expiração
                const exp = new Date(updatedLicense.data_ativacao);
                exp.setDate(exp.getDate() + updatedLicense.dias_validos);
                if (exp <= new Date()) {
                    alert('Sua licença expirou! O sistema será bloqueado.');
                    window.electronAPI.clearAuth();
                    showLogin();
                    return;
                }
                const newExpiryISO = exp.toISOString();

                // Atualiza dados na memória e salvos locais
                currentExpiryDate = newExpiryISO;
                auth.expiry = newExpiryISO;
                auth.days = updatedLicense.dias_validos;
                auth.esportes = updatedLicense.esportes || 'rodeio';
                window.electronAPI.saveAuth(auth);

                // Atualiza permissões de esportes em tempo real
                userSports = auth.esportes.split(',').map(s => s.trim().toLowerCase());

                // Se o esporte atual foi removido, volta para a tela de seleção
                if (homeScreen && !homeScreen.classList.contains('hidden') && !userSports.includes(currentSport)) {
                    alert(`Seu acesso ao esporte ${currentSport === '3tambores' ? '3 Tambores' : 'Rodeio'} foi revogado pelo administrador.`);
                    backToSports();
                    return;
                } else if (sportSelectScreen && !sportSelectScreen.classList.contains('hidden')) {
                    // Se estiver na tela de seleção, re-renderiza as permissões visuais
                    showSportSelection();
                }

                // Atualiza visual
                updateDaysBadge();
                alert('Sua licença foi atualizada pelo administrador!\nNovo tempo de uso sincronizado em tempo real.');
            }
        });
    }

    // Registrar listener em tempo real para sinal de broadcast (admin clicou em atualizar)
    if (window.electronAPI.onLicenseBroadcastSignal) {
        window.electronAPI.onLicenseBroadcastSignal((payload) => {
            const auth = window.electronAPI.getAuth();
            if (auth && auth.email && payload && payload.email && auth.email.toLowerCase().trim() === payload.email.toLowerCase().trim()) {
                console.log('RODEOAPP Realtime: Sinal de atualização recebido do admin! Recarregando dados da licença...');
                if (typeof startSecurityChecks === 'function') {
                    startSecurityChecks(auth.email, auth.key, currentExpiryDate);
                }
            }
        });
    }

    init();
});

async function init() {
    // Inicializar verificação de conexão
    verifyConnection();
    window.addEventListener('online', verifyConnection);
    window.addEventListener('offline', () => updateConnectionStatus('offline'));
    setInterval(verifyConnection, 30000);

    console.log("RODEOAPP: Iniciando sistema...");
    const auth = window.electronAPI.getAuth();
    
    if (auth && auth.email && auth.key) {
        try {
            localStorage.setItem('hzn_last_email', auth.email);
            localStorage.setItem('hzn_last_key', auth.key);
        } catch(e) {}
        console.log("RODEOAPP: Autenticação encontrada, validando...");
        fetchGlobalData();
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        try {
            const hwid = await window.electronAPI.getHWID();
            console.log("RODEOAPP: HWID obtido:", hwid);
            const res = await window.electronAPI.validateLicense({ email: auth.email, key: auth.key, hwid });
            
            if (res && res.success) {
                console.log("RODEOAPP: Licença válida!");
                const data = res.data;
                const exp = new Date(data.data_ativacao);
                exp.setDate(exp.getDate() + data.dias_validos);
                const authData = { 
                    email: auth.email, 
                    key: auth.key, 
                    nome: data.nome, 
                    days: data.dias_validos, 
                    expiry: exp.toISOString(),
                    esportes: data.esportes || 'rodeio'
                };
                window.electronAPI.saveAuth(authData);
                currentExpiryDate = authData.expiry;
                userSports = authData.esportes.split(',').map(s => s.trim().toLowerCase());
                showIntro(`RODEO<span class="text-yellow-500">APP</span>`, authData.expiry, authData.nome, authData.expiry);
                return;
            } else {
                console.warn("RODEOAPP: Licença inválida ou expirada no servidor:", res ? res.message : 'Sem resposta');
                
                // FALLBACK SE ESTIVER OFFLINE OU SE HOUVER ERRO DE CONEXÃO COM O SERVIDOR
                const isNetworkError = !res || 
                    res.isNetworkError ||
                    (res.message && (
                        res.message.toLowerCase().includes('fetch') || 
                        res.message.toLowerCase().includes('failed to fetch') || 
                        res.message.toLowerCase().includes('enotfound') || 
                        res.message.toLowerCase().includes('etimedout') || 
                        res.message.toLowerCase().includes('connect') ||
                        res.message.toLowerCase().includes('network') ||
                        res.message.toLowerCase().includes('erro de conexão') ||
                        res.message.toLowerCase().includes('erro interno')
                    )) ||
                    !navigator.onLine;

                if (isNetworkError && auth.expiry) {
                    const exp = new Date(auth.expiry);
                    if (exp > new Date()) {
                        console.log("RODEOAPP: Sem conexão com o servidor. Usando licença local válida até", auth.expiry);
                        currentExpiryDate = auth.expiry;
                        userSports = (auth.esportes || 'rodeio').split(',').map(s => s.trim().toLowerCase());
                        showIntro(`RODEO<span class="text-yellow-500">APP</span>`, auth.expiry, auth.nome || 'Usuário', auth.expiry);
                        return;
                    }
                }

                alert(res && res.message ? res.message : 'Sua licença expirou ou é inválida.');
                window.electronAPI.clearAuth();
                showLogin();
            }
        } catch (e) { 
            console.error("RODEOAPP: Erro crítico no init:", e);
            if (auth.expiry) {
                const exp = new Date(auth.expiry);
                if (exp > new Date()) {
                    console.log("RODEOAPP: Exceção no init. Usando licença local válida até", auth.expiry);
                    currentExpiryDate = auth.expiry;
                    userSports = (auth.esportes || 'rodeio').split(',').map(s => s.trim().toLowerCase());
                    showIntro(`RODEO<span class="text-yellow-500">APP</span>`, auth.expiry, auth.nome || 'Usuário', auth.expiry);
                    return;
                }
            }
        } finally {
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
        }
    } else {
        console.log("RODEOAPP: Nenhuma autenticação prévia encontrada.");
    }
    
    console.log("RODEOAPP: Redirecionando para Login.");
    showLogin();
}

async function handleActivation() {
    const email = document.getElementById('email').value;
    const key = document.getElementById('key').value;
    if (errorMsg) errorMsg.classList.add('hidden');
    if (!email || !key) { if (errorMsg) { errorMsg.innerText = "Preencha todos os campos."; errorMsg.classList.remove('hidden'); } return; }

    try {
        localStorage.setItem('hzn_last_email', email);
        localStorage.setItem('hzn_last_key', key);
    } catch(e) {}
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    btnActivate.disabled = true;
    try {
        const hwid = await window.electronAPI.getHWID();
        const version = await window.electronAPI.getAppVersion();
        const res = await window.electronAPI.validateLicense({ email, key, hwid, appVersion: version });
        if (res.success) {
            const data = res.data;
            const exp = new Date(data.data_ativacao);
            exp.setDate(exp.getDate() + data.dias_validos);
            const authData = { 
                email, 
                key, 
                nome: data.nome, 
                days: data.dias_validos, 
                expiry: exp.toISOString(),
                esportes: data.esportes || 'rodeio'
            };
            window.electronAPI.saveAuth(authData);
            userSports = authData.esportes.split(',').map(s => s.trim().toLowerCase());
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
            showIntro(`RODEO<span class="text-yellow-500">APP</span>`, exp.toISOString(), data.nome, exp.toISOString());
        } else {
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
            if (errorMsg) { errorMsg.innerText = res.message || "Erro ao validar licença."; errorMsg.classList.remove('hidden'); }
        }
    } catch (err) {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        if (errorMsg) { errorMsg.innerText = "Falha na conexão com o servidor."; errorMsg.classList.remove('hidden'); }
    } finally { btnActivate.disabled = false; }
}

let activeIntroTimeouts = [];
let activeIntroRunId = null;

function clearIntroAnimations() {
    activeIntroTimeouts.forEach(t => clearTimeout(t));
    activeIntroTimeouts = [];
}

function getAnimationGroups(n) {
    if (n === 5) return [[2], [1, 3], [0, 4]];
    if (n === 4) return [[1, 2], [0, 3]];
    if (n === 3) return [[1], [0, 2]];
    if (n === 2) return [[0, 1]];
    return [[0]];
}

async function animateSponsorsByGroups(sponsors, container, runId, onComplete) {
    if (!container) {
        onComplete();
        return;
    }

    if (activeIntroRunId !== runId) return;

    // Helper to extract position 1-5 from click_url hash fragment (#pos-X)
    function getSponsorPosition(s) {
        if (s.click_url && s.click_url.includes('#pos-')) {
            const pos = parseInt(s.click_url.split('#pos-')[1]);
            if (!isNaN(pos)) return pos;
        }
        return 3; // default center
    }

    // Sort sponsors by position (1 to 5) so they line up correctly side-by-side
    const sortedSponsors = [...sponsors].sort((a, b) => getSponsorPosition(a) - getSponsorPosition(b));

    // Render sorted sponsors side-by-side with inline style fallback for absolute safety
    container.innerHTML = sortedSponsors.map((s, idx) => `
        <img id="splash-sponsor-logo-${idx}" 
             src="${s.logo_url}" 
             class="h-28 md:h-36 w-auto object-contain max-w-[150px] md:max-w-[200px]" 
             style="opacity: 0; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));" />
    `).join('');

    const groups = getAnimationGroups(sponsors.length);

    // Function to animate a group
    function animateGroup(groupIndex) {
        if (activeIntroRunId !== runId) return;

        if (groupIndex >= groups.length) {
            // All groups are now visible. Wait 2 seconds (2000ms), then perform the general fade out.
            const t = setTimeout(() => {
                if (activeIntroRunId === runId) onComplete();
            }, 2000);
            activeIntroTimeouts.push(t);
            return;
        }

        const indices = groups[groupIndex];
        indices.forEach(idx => {
            const img = document.getElementById(`splash-sponsor-logo-${idx}`);
            if (img) img.classList.add('logo-fade-in');
        });

        // Delay between showing next group (e.g. 800ms)
        const t = setTimeout(() => {
            if (activeIntroRunId === runId) animateGroup(groupIndex + 1);
        }, 800);
        activeIntroTimeouts.push(t);
    }

    // Start animating groups after a tiny delay to allow DOM insertion
    const t = setTimeout(() => {
        animateGroup(0);
    }, 100);
    activeIntroTimeouts.push(t);
}

async function showIntro(htmlText, days, nome, expiry) {
    const currentRunId = Math.random().toString(36).substring(2, 15);
    activeIntroRunId = currentRunId;
    clearIntroAnimations();
    if (loginScreen) loginScreen.classList.add('hidden'); 
    if (homeScreen) homeScreen.classList.add('hidden');
    if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
    
    // Reset splash state
    const splashLogo = document.getElementById('splash-logo');
    const splashSponsors = document.getElementById('splash-sponsors');
    const sponsorsContainer = document.getElementById('splash-sponsors-logos');
    
    if (introScreen) {
        introScreen.style.opacity = '1';
        introScreen.style.transition = '';
    }
    
    if (splashLogo) {
        splashLogo.classList.remove('hidden', 'splash-logo-out');
        splashLogo.classList.add('fade-in-out');
    }
    if (splashSponsors) splashSponsors.classList.add('hidden');
    
    if (introScreen) { introScreen.classList.remove('hidden'); if (introText) introText.innerHTML = htmlText; }

    // === PARALLEL: Start fetch AND minimum logo display at the same time ===
    const MIN_LOGO_DISPLAY_MS = 1500;
    const logoStartTime = Date.now();

    // Fetch sponsors (runs in parallel with logo display)
    let appSponsors = [];
    let fetchSuccess = false;

    const portalUrls = [
        'https://portal.rodeoapp.pro/api/sponsors',
        'https://rodeoapp.pro/api/sponsors',
        'http://localhost:3000/api/sponsors'
    ];

    for (const portalUrl of portalUrls) {
        if (activeIntroRunId !== currentRunId) return;
        try {
            const response = await fetch(portalUrl);
            if (activeIntroRunId !== currentRunId) return;
            if (response.ok) {
                appSponsors = await response.json();
                fetchSuccess = true;
                break;
            }
        } catch (e) {
            console.warn(`Erro ao buscar patrocinadores da URL ${portalUrl}:`, e);
        }
    }

    if (activeIntroRunId !== currentRunId) return;

    if (!fetchSuccess) {
        try {
            const url = 'https://api.rodeoapp.pro/rest/v1/patrocinios?select=*&status=eq.ativo&tipo=eq.app';
            const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';
            const response = await fetch(url, { headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } });
            if (activeIntroRunId !== currentRunId) return;
            if (response.ok) {
                appSponsors = await response.json();
                fetchSuccess = true;
            } else {
                throw new Error('Falha na resposta HTTP: ' + response.status);
            }
        } catch (e) {
            console.warn('Erro ao buscar patrocinios diretamente do Supabase:', e);
        }
    }

    if (activeIntroRunId !== currentRunId) return;

    // Cache results offline or fallback to cache if completely offline
    if (fetchSuccess) {
        try {
            localStorage.setItem('rodeo_offline_sponsors', JSON.stringify(appSponsors));
        } catch (err) {
            console.error('Erro ao salvar cache de patrocinadores', err);
        }
    } else {
        console.warn('Carregando patrocinadores do cache offline...');
        try {
            const cached = localStorage.getItem('rodeo_offline_sponsors');
            if (cached) {
                appSponsors = JSON.parse(cached);
            }
        } catch (err) {
            console.error('Erro ao ler cache de patrocinadores', err);
        }
    }

    if (activeIntroRunId !== currentRunId) return;

    // === Wait only the remaining time of the minimum logo display ===
    const elapsed = Date.now() - logoStartTime;
    const remainingWait = Math.max(0, MIN_LOGO_DISPLAY_MS - elapsed);

    const tIntro = setTimeout(() => {
        if (activeIntroRunId !== currentRunId) return;

        // Fade out the logo
        if (splashLogo) {
            splashLogo.classList.remove('fade-in-out');
            splashLogo.classList.add('splash-logo-out');
        }

        // After logo fade-out (400ms), show sponsors immediately
        const tAfterLogoOut = setTimeout(() => {
            if (activeIntroRunId !== currentRunId) return;
            if (splashLogo) splashLogo.classList.add('hidden');

            if (appSponsors.length > 0) {
                if (splashSponsors) {
                    splashSponsors.classList.remove('hidden');
                    const selectedSponsors = appSponsors.sort(() => 0.5 - Math.random()).slice(0, 5);
                    
                    animateSponsorsByGroups(selectedSponsors, sponsorsContainer, currentRunId, () => {
                        if (activeIntroRunId !== currentRunId) return;
                        if (introScreen) {
                            introScreen.style.opacity = '0';
                        }
                        const tFade = setTimeout(() => {
                            if (activeIntroRunId !== currentRunId) return;
                            if (introScreen) {
                                introScreen.classList.add('hidden');
                                introScreen.style.opacity = '1';
                            }
                            showSportSelection();
                            startSecurityChecks(null, null, expiry);
                        }, 800);
                        activeIntroTimeouts.push(tFade);
                    });
                }
            } else {
                // No sponsors - just fade out intro
                if (introScreen) {
                    introScreen.style.opacity = '0';
                }
                const tFade = setTimeout(() => {
                    if (activeIntroRunId !== currentRunId) return;
                    if (introScreen) {
                        introScreen.classList.add('hidden');
                        introScreen.style.opacity = '1';
                    }
                    showSportSelection();
                    startSecurityChecks(null, null, expiry);
                }, 800);
                activeIntroTimeouts.push(tFade);
            }
        }, 400);
        activeIntroTimeouts.push(tAfterLogoOut);
    }, remainingWait);
    activeIntroTimeouts.push(tIntro);
}

function showLogin() { 
    activeIntroRunId = null;
    clearIntroAnimations();

    if (typeof hideAllModalsAndViews === 'function') {
        hideAllModalsAndViews();
    }

    const screensToHide = [
        'home-screen', 'sport-select-screen', 'intro-screen', 'transmissao-screen',
        'event-control-view', 'transmissao-event-view', 'modal-transmissao-eventos',
        'modal-tablet-control', 'content-view'
    ];
    screensToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    if (loginScreen) loginScreen.classList.remove('hidden'); 
    toggleSupportBtn(false);

    try {
        const emailInput = document.getElementById('email');
        const keyInput = document.getElementById('key');
        const lastEmail = localStorage.getItem('hzn_last_email') || '';
        const lastKey = localStorage.getItem('hzn_last_key') || '';
        if (emailInput && lastEmail) emailInput.value = lastEmail;
        if (keyInput && lastKey) keyInput.value = lastKey;
    } catch (e) {}
}

function showSportSelection() {
    const auth = window.electronAPI.getAuth();
    if (!auth || !auth.email || !auth.key) {
        showLogin();
        return;
    }

    if (loginScreen) loginScreen.classList.add('hidden');
    if (homeScreen) homeScreen.classList.add('hidden');
    if (introScreen) introScreen.classList.add('hidden');
    if (transmissaoScreen) transmissaoScreen.classList.add('hidden');
    if (eventControlView) eventControlView.classList.add('hidden');
    
    if (auth && auth.esportes) {
        userSports = auth.esportes.split(',').map(s => s.trim().toLowerCase());
    }

    if (userSports.length === 1) {
        // Redireciona direto se tiver apenas um esporte liberado
        selectSport(userSports[0]);
        return;
    }

    if (sportSelectScreen) {
        // Reset animation classes before showing
        sportSelectScreen.classList.remove('sport-anim-active');
        sportSelectScreen.classList.remove('hidden');
        // Trigger entrance animations after a tiny delay for DOM update
        requestAnimationFrame(() => {
            sportSelectScreen.classList.add('sport-anim-active');
        });
    }
    toggleSupportBtn(true);

    // Configura botões de esporte
    const btnRodeio = document.getElementById('btn-sport-rodeio');
    const badgeRodeio = document.getElementById('badge-rodeio');
    if (btnRodeio && badgeRodeio) {
        if (userSports.includes('rodeio')) {
            btnRodeio.disabled = false;
            btnRodeio.style.opacity = '1';
            btnRodeio.style.cursor = 'pointer';
            badgeRodeio.innerText = 'Liberado';
            badgeRodeio.className = 'absolute top-6 right-6 text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest';
        } else {
            btnRodeio.disabled = true;
            btnRodeio.style.opacity = '0.4';
            btnRodeio.style.cursor = 'not-allowed';
            badgeRodeio.innerText = 'Bloqueado';
            badgeRodeio.className = 'absolute top-6 right-6 text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-widest';
        }
    }

    const btn3Tambores = document.getElementById('btn-sport-3tambores');
    const badge3Tambores = document.getElementById('badge-3tambores');
    if (btn3Tambores && badge3Tambores) {
        if (userSports.includes('3tambores')) {
            btn3Tambores.disabled = false;
            btn3Tambores.style.opacity = '1';
            btn3Tambores.style.cursor = 'pointer';
            badge3Tambores.innerText = 'Liberado';
            badge3Tambores.className = 'absolute top-6 right-6 text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest';
        } else {
            btn3Tambores.disabled = true;
            btn3Tambores.style.opacity = '0.4';
            btn3Tambores.style.cursor = 'not-allowed';
            badge3Tambores.innerText = 'Bloqueado';
            badge3Tambores.className = 'absolute top-6 right-6 text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-widest';
        }
    }

    const btnTransmissao = document.getElementById('btn-sport-transmissao');
    const badgeTransmissao = document.getElementById('badge-transmissao');
    if (btnTransmissao && badgeTransmissao) {
        if (userSports.includes('transmissao')) {
            btnTransmissao.disabled = false;
            btnTransmissao.style.opacity = '1';
            btnTransmissao.style.cursor = 'pointer';
            badgeTransmissao.innerText = 'Liberado';
            badgeTransmissao.className = 'absolute top-6 right-6 text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest';
        } else {
            btnTransmissao.disabled = true;
            btnTransmissao.style.opacity = '0.4';
            btnTransmissao.style.cursor = 'not-allowed';
            badgeTransmissao.innerText = 'Bloqueado';
            badgeTransmissao.className = 'absolute top-6 right-6 text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-widest';
        }
    }
}

window.selectSport = async (sport) => {
    const auth = window.electronAPI.getAuth();
    if (!auth || !auth.email || !auth.key) {
        showLogin();
        return;
    }

    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    try {
        await window.electronAPI.setCurrentSport(sport);
        currentSport = sport;
        
        if (sport === 'transmissao') {
            if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
            if (transmissaoScreen) {
                transmissaoScreen.classList.remove('hidden');
                transmissaoScreen.querySelectorAll('.reveal-item').forEach(item => item.classList.add('animate-reveal'));
            }
        } else {
            // Atualiza o badge do esporte no header
            const badge = document.getElementById('sport-active-badge');
            if (badge) {
                badge.innerText = sport === '3tambores' ? '3 Tambores' : 'Rodeio';
            }

            if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
            showHome(auth ? auth.expiry : null, auth ? auth.nome : '');
        }
    } catch(e) {
        console.error(e);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
};

window.backToSports = () => {
    if (homeScreen) homeScreen.classList.add('hidden');
    if (transmissaoScreen) transmissaoScreen.classList.add('hidden');
    if (eventControlView) eventControlView.classList.add('hidden');
    const contentView = document.getElementById('content-view');
    if (contentView) contentView.classList.add('hidden');
    showSportSelection();
};

function showHome(expiryOrDays, nome) { 
    const auth = window.electronAPI.getAuth();
    if (!auth || !auth.email || !auth.key) {
        showLogin();
        return;
    }

    if (loginScreen) loginScreen.classList.add('hidden'); 
    if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
    if (transmissaoScreen) transmissaoScreen.classList.add('hidden');
    if (homeScreen) homeScreen.classList.remove('hidden');
    // Se receber ISO string de expiry, usa ela; senão usa currentExpiryDate
    if (typeof expiryOrDays === 'string' && expiryOrDays.includes('T')) {
        currentExpiryDate = expiryOrDays;
    }
    updateDaysBadge();
    setupDaysBadgeTooltip();
    // Atualiza o badge a cada minuto
    if (daysBadgeInterval) clearInterval(daysBadgeInterval);
    daysBadgeInterval = setInterval(updateDaysBadge, 60000);
    toggleSupportBtn(true);
    document.querySelectorAll('.reveal-item').forEach(item => item.classList.add('animate-reveal')); 

    renderEvents();
    if (navigator.onLine) {
        window.syncUserEventsWithCloud().then(() => renderEvents());
    }
}

function startSecurityChecks(email, key, expiry) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (offlineCheckInterval) clearInterval(offlineCheckInterval);

    currentExpiryDate = expiry || currentExpiryDate;

    // â”€â”€ Heartbeat: sincroniza com Supabase a cada 60s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Pega os dados atualizados (dias_validos, is_active, data_ativacao)
    // Se o admin mudar o plano ou desativar, o app reflete imediatamente
    const doHeartbeat = async () => {
        const auth = window.electronAPI.getAuth();
        if (!auth || !auth.email || !auth.key) return;
        try {
            const version = await window.electronAPI.getAppVersion();
            const res = await window.electronAPI.sendHeartbeat({ email: auth.email, key: auth.key, appVersion: version });
            if (!res) return;

            // Admin desativou ou deletou a licença
            if (!res.valid) {
                const motivo = res.reason === 'disabled'
                    ? 'Sua licença foi desativada pelo administrador.'
                    : 'Sua licença foi removida do sistema.';
                alert(motivo + ' O sistema será bloqueado.');
                window.electronAPI.clearAuth();
                showLogin();
                return;
            }

            // Atualiza expiry com dados frescos do Supabase
            if (res.data && res.data.data_ativacao && typeof res.data.dias_validos !== 'undefined') {
                const newExp = new Date(res.data.data_ativacao);
                newExp.setDate(newExp.getDate() + res.data.dias_validos);
                const newExpISO = newExp.toISOString();
                const newEsportes = res.data.esportes || 'rodeio';

                // SÓ atualiza se mudou (admin mexeu nos dias ou nos esportes)
                const savedAuth = window.electronAPI.getAuth();
                const sportsChanged = savedAuth && savedAuth.esportes !== newEsportes;
                if (newExpISO !== currentExpiryDate || sportsChanged) {
                    currentExpiryDate = newExpISO;
                    
                    if (savedAuth) {
                        savedAuth.expiry = currentExpiryDate;
                        savedAuth.days = res.data.dias_validos;
                        savedAuth.esportes = newEsportes;
                        window.electronAPI.saveAuth(savedAuth);
                    }
                    
                    userSports = newEsportes.split(',').map(s => s.trim().toLowerCase());
                    
                    // Se o esporte ativo atual foi revogado, volta pra seleção
                    if (homeScreen && !homeScreen.classList.contains('hidden') && !userSports.includes(currentSport)) {
                        alert(`Seu acesso ao esporte ${currentSport === '3tambores' ? '3 Tambores' : 'Rodeio'} foi revogado pelo administrador.`);
                        backToSports();
                        return;
                    } else if (sportSelectScreen && !sportSelectScreen.classList.contains('hidden')) {
                        showSportSelection();
                    }

                    updateDaysBadge();
                    console.log('RODEOAPP: Plano atualizado pelo admin â€” novo expiry:', currentExpiryDate, 'esportes:', newEsportes);
                }

                // Checa se expirou com base nos dados do servidor
                if (new Date() > newExp) {
                    alert('Sua licença de uso expirou! O sistema será bloqueado.');
                    window.electronAPI.clearAuth();
                    showLogin();
                    return;
                }
            }
        } catch(e) {
            console.warn('RODEOAPP: Heartbeat offline â€”', e.message);
        }
    };

    // Executa imediatamente ao iniciar, depois a cada 60s
    doHeartbeat();
    heartbeatInterval = setInterval(doHeartbeat, 60000);
}

// Navegação
window.openTab = async (tab) => {
    console.log("RODEOAPP: Abrindo aba", tab);
    const cv = document.getElementById('content-view');
    const vt = document.getElementById('view-title');
    const vb = document.getElementById('view-body');
    
    if (cv) cv.classList.remove('hidden');
    toggleSupportBtn(false);

    try {
        if (tab === 'eventos') { 
            if (vt) { vt.innerText = "EVENTOS"; vt.className = "text-5xl font-black italic text-yellow-500"; }
            await renderEvents(); 
        }
        else if (tab === 'notas') { 
            if (vt) { vt.innerText = "NOTAS DOS JUÍZES"; vt.className = "text-5xl font-black italic text-yellow-500"; }
            if (vb) vb.innerHTML = '<div class="p-20 text-center text-slate-500 italic font-bold uppercase text-2xl">O Lançamento de Notas agora é feito dentro do Painel de cada Evento.<br><br><span class="text-sm text-slate-600">Abra o seu evento na aba "Eventos" e clique no botão "Registrar Notas".</span></div>';
        }
        else if (tab === 'contratos') {
            if (vt) { vt.innerText = "CONTRATOS"; vt.className = "text-5xl font-black italic text-yellow-500"; }
            await renderContratosEvents();
        }
        else if (tab === 'exportar') {
            if (vt) { vt.innerText = "CENTRAL DE RELATÓRIOS & EXPORTAÇÃO"; vt.className = "text-5xl font-black italic text-yellow-500"; }
            await renderExportarEvents();
        }
    } catch (e) {
        console.error("RODEOAPP: Erro ao abrir aba:", e);
        if (vb) vb.innerHTML = `<div class="p-20 text-center text-red-500 font-bold">Erro ao carregar conteúdo: ${e.message}</div>`;
    }
};

window.closeTab = () => { const cv = document.getElementById('content-view'); if (cv) cv.classList.add('hidden'); toggleSupportBtn(true); };

async function renderExportarEvents() {
    const email = getCurrentUserEmail();
    const viewBody = document.getElementById('view-body');
    const eventos = await window.electronAPI.getLocalEvents(email);
    
    if (eventos.length === 0) {
        if (viewBody) viewBody.innerHTML = '<div class="p-20 text-center text-slate-500 italic font-bold">Nenhum evento cadastrado para exportar relatórios.</div>';
        return;
    }

    let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
    
    eventos.forEach(ev => { 
        html += `
            <div class="glass p-8 rounded-[2.5rem] border-white/5 hover:border-yellow-500/50 transition-all flex flex-col justify-between">
                <div class="flex gap-6 items-start mb-6">
                    ${ev.logo ? `<img src="${ev.logo}" class="w-16 h-16 object-contain rounded-2xl bg-black/40 p-2 border border-white/10 shadow-lg">` : `<div class="w-16 h-16 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-slate-700 font-black italic text-xs">LOGO</div>`}
                    <div>
                        <div class="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">EVENTO DE RODEIO</div>
                        <h3 class="text-2xl font-black text-white uppercase tracking-tight">${ev.name}</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase mt-0.5">${ev.city || 'ARENA'} • ${ev.days || 3} DIAS</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.openReportViewerForEvent('${ev.id}', 'sumula')" class="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2">
                        <span>📄</span>
                        <span>SÚMULAS & RANKINGS</span>
                    </button>
                    <button onclick="window.openReportViewerForEvent('${ev.id}', 'contratos')" class="bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                        <span>📜</span>
                        <span>CONTRATOS A4</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    if (viewBody) viewBody.innerHTML = html;
}

window.openReportViewerForEvent = async (eventId, type = 'sumula') => {
    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    const ev = eventos.find(e => e.id === eventId);
    if (ev) {
        currentEvent = ev;
        window.currentEvent = currentEvent;
    }
    openReportViewer(type);
};

async function renderContratosEvents() {
    const email = getCurrentUserEmail();
    const viewBody = document.getElementById('view-body');
    const eventos = await window.electronAPI.getLocalEvents(email);
    
    if (eventos.length === 0) {
        if (viewBody) viewBody.innerHTML = '<div class="p-20 text-center text-slate-500 italic font-bold">Nenhum evento cadastrado.</div>';
        return;
    }

    let html = `<div class="grid grid-cols-2 gap-8">`;
    
    eventos.forEach(ev => { 
        html += `<div class="relative group">
            <button onclick="openContratosPeoes('${ev.id}')" class="w-full glass p-10 rounded-[2.5rem] border-white/5 flex justify-between items-start text-left hover:border-yellow-500 transition-all">
                <div class="flex gap-6 items-start">
                    ${ev.logo ? `<img src="${ev.logo}" class="w-20 h-20 object-contain rounded-2xl bg-black/40 p-2 border border-white/10 shadow-lg">` : `<div class="w-20 h-20 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-slate-700 font-black italic text-xs">LOGO</div>`}
                    <div>
                        <div class="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2">GERAR CONTRATOS</div>
                        <h4 class="text-3xl font-black italic mb-1 uppercase tracking-tighter">${ev.name}</h4>
                        <p class="text-slate-500 font-bold text-sm uppercase">${ev.city}</p>
                    </div>
                </div>
            </button>
            <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                <button onclick="openModalContratoConfig('${ev.id}')" class="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 hover:text-black transition-all shadow-xl border border-yellow-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
            </div>
        </div>`; 
    });
    if (viewBody) viewBody.innerHTML = html + `</div>`;
}

window.openContratosPeoes = async (eventId) => {
    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    const ev = eventos.find(e => e.id === eventId);
    
    if (!ev) return;

    const viewBody = document.getElementById('view-body');
    const vt = document.getElementById('view-title');
    if (vt) { vt.innerText = `CONTRATOS - ${ev.name}`; vt.className = "text-4xl font-black italic text-yellow-500"; }
    
    let html = `
        <div class="flex flex-wrap justify-between items-center gap-4 mb-8">
            <button onclick="openTab('contratos')" class="text-slate-500 hover:text-white flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                Voltar aos Eventos
            </button>
            <div class="flex items-center gap-3">
                <button onclick="openReportViewer('contratos')" class="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-yellow-500/20 hover:scale-[1.02] transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Visualizar Contratos (A4)
                </button>
                <button onclick="openModalExportContract('${eventId}', 'all')" class="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Exportar Arquivos
                </button>
            </div>
        </div>
    `;

    const peoes = ev.peoes || [];
    if (peoes.length === 0) {
        html += '<div class="p-20 text-center text-slate-500 italic font-bold">Nenhum competidor cadastrado neste evento.</div>';
    } else {
        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
        peoes.forEach(p => {
            html += `
                <div onclick="openModalExportContract('${eventId}', '${p.id || p.nome}')" class="glass p-6 rounded-2xl border-white/5 flex justify-between items-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group">
                    <div>
                        <h4 class="text-lg font-black text-white uppercase tracking-tighter group-hover:text-blue-400 transition-colors">${p.nome}</h4>
                        <p class="text-xs text-slate-400 font-bold uppercase">${p.cidade}</p>
                    </div>
                    <div class="text-right flex items-center gap-4">
                        <div>
                            <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">CPF</p>
                            <p class="text-sm text-slate-300 font-mono">${p.cpf || '---'}</p>
                        </div>
                        <svg class="w-6 h-6 text-slate-700 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (viewBody) viewBody.innerHTML = html;
};


let editingEventId = null;

async function renderEvents() {
    const email = getCurrentUserEmail();
    const viewBody = document.getElementById('view-body');
    const eventos = await window.electronAPI.getLocalEvents(email);
    let html = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8"><button onclick="openModalEvento()" class="glass p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] flex flex-col items-center justify-center border-dashed border-2 border-slate-800 hover:border-accent transition-all group min-h-[160px]"><div class="w-14 h-14 sm:w-16 sm:h-16 bg-accent/10 rounded-full flex items-center justify-center mb-3 sm:mb-4"><svg class="w-7 h-7 sm:w-8 sm:h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></div><span class="font-bold text-slate-400 uppercase text-xs tracking-widest">Criar Novo Evento</span></button>`;
    
    eventos.forEach((ev, idx) => { 
        if (!ev.id || ev.id === 'undefined') {
            ev.id = 'evt_' + Date.now().toString() + '_' + idx;
            window.electronAPI.updateLocalEvent(email, ev);
        }
        html += `<div class="relative group">
            <div onclick="openEventControl('${ev.id}')" class="w-full cursor-pointer glass p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border-white/5 flex flex-col sm:flex-row justify-between items-start text-left hover:border-accent transition-all gap-4">
                <div class="flex gap-4 sm:gap-6 items-start w-full">
                    ${ev.logo ? `<img src="${ev.logo}" class="w-14 h-14 sm:w-20 sm:h-20 object-contain rounded-2xl bg-black/40 p-2 border border-white/10 shadow-lg flex-shrink-0">` : `<div class="w-14 h-14 sm:w-20 sm:h-20 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-slate-700 font-black italic text-[10px] sm:text-xs flex-shrink-0">LOGO</div>`}
                    <div class="flex-1 min-w-0">
                        <div class="text-[10px] font-black text-accent uppercase tracking-widest mb-1 sm:mb-2">${ev.type}</div>
                        <h4 class="text-xl sm:text-3xl font-black italic mb-1 uppercase tracking-tighter truncate">${ev.name}</h4>
                        <div class="flex gap-2 flex-wrap items-center mt-2 mb-2">
                            <button onclick="event.stopPropagation(); sendEventToPortal('${ev.id}')" class="bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border border-blue-500/20 shadow-lg w-fit">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12"/></svg>
                                Portal
                            </button>
                            <button onclick="event.stopPropagation(); promptShareEvent('${ev.id}')" class="bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border border-green-500/20 shadow-lg w-fit">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 10.742a3 3 0 11-2.2-.075m.93 1.185l6.164 2.739m0 0a3 3 0 11-.412 1.411m-.518-2.58l-6.164-2.74"/></svg>
                                Compartilhar
                            </button>
                        </div>
                        ${ev.share_id ? `<div class="text-[10px] font-bold text-slate-500 font-mono tracking-wider mb-1 truncate">ID: ${ev.share_id}</div>` : ''}
                        <p class="text-slate-500 font-bold text-xs sm:text-sm uppercase">${ev.city}</p>
                    </div>
                </div>
                <div class="text-xs font-black bg-slate-950 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-800 self-end sm:self-start">${ev.days}D / ${ev.judges}J</div>
            </div>
            <div class="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                <button onclick="openModalEvento('${ev.id}')" class="p-2 sm:p-3 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 hover:text-black transition-all shadow-xl border border-yellow-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                <button onclick="deleteEvent('${ev.id}')" class="p-2 sm:p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-xl border border-red-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
        </div>`; 
    });
    if (viewBody) viewBody.innerHTML = html + `</div>`;
}

window.openModalEvento = async (id = null) => {
    editingEventId = id;
    if (id) {
        openModalEventoDirect(id);
    } else {
        const chooseModal = document.getElementById('modal-choose-creation');
        if (chooseModal) chooseModal.classList.remove('hidden');
    }
};

window.openModalEventoDirect = async (id = null) => {
    editingEventId = id;
    const title = document.querySelector('#modal-evento h2');
    const previewImg = document.getElementById('logo-preview-img');
    const previewContainer = document.getElementById('logo-preview-container');
    
    if (id) {
        const email = getCurrentUserEmail();
        const eventos = await window.electronAPI.getLocalEvents(email);
        const ev = eventos.find(e => e.id === id);
        if (ev) {
            document.getElementById('event-type').value = ev.type;
            document.getElementById('event-name').value = ev.name;
            document.getElementById('event-city').value = ev.city;
            document.getElementById('event-circuito').value = ev.circuito || '';
            const dirInput = document.getElementById('event-director');
            if (dirInput) dirInput.value = ev.director || ev.diretor || '';
            document.getElementById('event-days').value = ev.days;
            document.getElementById('event-judges').value = ev.judges;
            if (ev.logo) {
                previewImg.src = ev.logo;
                previewImg.classList.remove('hidden');
                previewContainer.classList.add('hidden');
            }
            if (title) title.innerText = "EDITAR EVENTO";
            const btnSubmit = document.getElementById('btn-submit-evento');
            if (btnSubmit) btnSubmit.innerText = "SALVAR ALTERAÇÕES";
        }
    } else {
        document.getElementById('form-evento').reset();
        previewImg.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        if (title) title.innerText = "CRIAR NOVO EVENTO";
        const btnSubmit = document.getElementById('btn-submit-evento');
        if (btnSubmit) btnSubmit.innerText = "CRIAR EVENTO";
    }
    if (modalEvento) modalEvento.classList.remove('hidden');
    setTimeout(() => document.getElementById('event-name')?.focus(), 50);
};

window.choosePullEvent = () => {
    const chooseModal = document.getElementById('modal-choose-creation');
    if (chooseModal) chooseModal.classList.add('hidden');
    const pullModal = document.getElementById('modal-pull-event');
    if (pullModal) pullModal.classList.remove('hidden');
    document.getElementById('pull-share-id')?.focus();
};

window.chooseCreateNewEvent = () => {
    const chooseModal = document.getElementById('modal-choose-creation');
    if (chooseModal) chooseModal.classList.add('hidden');
    openModalEventoDirect(null);
};

window.deleteEvent = async (id) => {
    if (!confirm('Excluir este evento?')) return;
    const email = getCurrentUserEmail();
    await window.electronAPI.deleteLocalEvent(email, id);
    if (editingEventId === id) closeEventControl();
    renderEvents();
    window.syncUserEventsWithCloud().then(() => renderEvents());
};

window.exportBullsToExcel = () => {
    if (!currentEvent || !currentEvent.boiadas || currentEvent.boiadas.length === 0) {
        alert("Nenhum touro cadastrado neste evento para exportar.");
        return;
    }
    
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
            <table border="1">
                <thead>
                    <tr>
                        <th colspan="3" style="background-color: #000000; color: #ffffff; font-size: 20px; font-weight: bold; text-align: center; height: 50px;">
                            ${currentEvent.name.toUpperCase()} - LISTA DE TOUROS
                        </th>
                    </tr>
                    <tr>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">CIA (BOIADA)</th>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">NOME DO TOURO</th>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">LADO (C/E)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let totalTouros = 0;
    currentEvent.boiadas.forEach(cia => {
        if (cia.touros) {
            cia.touros.forEach(touroNome => {
                totalTouros++;
                const lado = cia.lados && cia.lados[touroNome] ? cia.lados[touroNome] : '-';
                html += `
                    <tr>
                        <td style="padding: 5px;">${cia.nome.toUpperCase()}</td>
                        <td style="padding: 5px; font-weight: bold;">${touroNome.toUpperCase()}</td>
                        <td style="padding: 5px; text-align: center; font-weight: bold;">${window.formatSide(lado)}</td>
                    </tr>
                `;
            });
        }
    });

    html += `
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" style="background-color: #000000; color: #ffffff; font-weight: bold; text-align: center; height: 30px;">
                            TOTAL DE TOUROS: ${totalTouros} | GERADO POR RODEOAPP
                        </th>
                    </tr>
                </tfoot>
            </table>
        </body></html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Touros_${currentEvent.name.replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.exportDrawsToExcel = () => {
    if (!currentEvent || !currentEvent.sorteios || currentEvent.sorteios.length === 0) {
        alert("Nenhum sorteio gerado neste evento para exportar.");
        return;
    }
    
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
            <table border="1">
                <thead>
                    <tr>
                        <th colspan="5" style="background-color: #000000; color: #ffffff; font-size: 20px; font-weight: bold; text-align: center; height: 50px;">
                            ${currentEvent.name.toUpperCase()} - SORTEIOS (CONFRONTOS)
                        </th>
                    </tr>
                    <tr>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">DIA</th>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">ORDEM</th>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">COMPETIDOR</th>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">TOURO</th>
                        <th style="background-color: #000000; color: #ffffff; font-weight: bold; padding: 10px;">CIA</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let totalMontarias = 0;
    currentEvent.sorteios.forEach(sorteio => {
        if (sorteio.riders) {
            sorteio.riders.forEach((r, idx) => {
                totalMontarias++;
                const bullIdx = sorteio.assignments[idx];
                const bull = sorteio.bulls[bullIdx];
                const isReride = r.isReride ? ' (RE-RIDE)' : '';
                html += `
                    <tr>
                        <td style="padding: 5px; text-align: center;">${sorteio.day}</td>
                        <td style="padding: 5px; text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 5px; font-weight: bold;">${r.nome.toUpperCase()}${isReride}</td>
                        <td style="padding: 5px; color: #b91c1c; font-weight: bold;">${bull ? bull.nome.toUpperCase() : 'A DEFINIR'}</td>
                        <td style="padding: 5px;">${bull ? bull.cia.toUpperCase() : '-'}</td>
                    </tr>
                `;
            });
        }
    });

    html += `
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="5" style="background-color: #000000; color: #ffffff; font-weight: bold; text-align: center; height: 30px;">
                            TOTAL DE MONTARIAS: ${totalMontarias} | GERADO POR RODEOAPP
                        </th>
                    </tr>
                </tfoot>
            </table>
        </body></html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sorteios_${currentEvent.name.replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

async function handleEventSubmit(e) {
    e.preventDefault();
    const email = getCurrentUserEmail();
    const previewImg = document.getElementById('logo-preview-img');
    const loadingText = document.getElementById('loading-text');
    const loadingSub = document.getElementById('loading-subtext');
    
    // TELA DE LOAD
    if (loadingOverlay) {
        if (loadingText) loadingText.innerText = "CADASTRANDO EVENTO";
        if (loadingSub) loadingSub.innerText = "Analisando identidade visual...";
        loadingOverlay.classList.remove('hidden');
    }

    // Pequena pausa para garantir que a imagem foi processada pelo browser
    await new Promise(r => setTimeout(r, 800));

    let themeColor = '#EAB308';
    let logoBase64 = null;

    if (previewImg && !previewImg.classList.contains('hidden')) {
        logoBase64 = previewImg.src;
        themeColor = extractDominantColor(previewImg);
    }

    const eventDirectorVal = document.getElementById('event-director')?.value?.trim() || '';

    const eventData = { 
        type: document.getElementById('event-type').value, 
        name: document.getElementById('event-name').value, 
        city: document.getElementById('event-city').value, 
        circuito: document.getElementById('event-circuito').value, 
        director: eventDirectorVal,
        diretor: eventDirectorVal,
        days: document.getElementById('event-days').value, 
        judges: document.getElementById('event-judges').value, 
        logo: logoBase64,
        themeColor: themeColor
    };

    let res;
    if (editingEventId) {
        const eventos = await window.electronAPI.getLocalEvents(email);
        const existing = eventos.find(e => e.id === editingEventId);
        res = await window.electronAPI.updateLocalEvent(email, { ...existing, ...eventData });
    } else {
        const newId = 'evt_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
        res = await window.electronAPI.saveLocalEvent(email, { 
            ...eventData,
            id: newId,
            created_at: new Date().toISOString(),
            peoes: [], boiadas: [], juizes: [], sorteios: [], notas: [] 
        });
    }

    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    if (res.success) {
        closeModalEvento();
        renderEvents();
        window.syncUserEventsWithCloud().then(() => renderEvents());
    }
}

// Atualizar Sorteio Manual para usar cores dinâmicas
function renderStep2() {
    const container = document.getElementById('riders-selection-list');
    const peoes = [...(currentEvent.peoes || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const leaderScore = peoes.length > 0 ? (peoes[0].score || 0) : 0;
    if (container) container.innerHTML = peoes.map((p, idx) => {
        const score = p.score || 0;
        const diff = idx > 0 ? (leaderScore - score).toFixed(2) : null;
        return `<label class="glass p-6 rounded-2xl border-white/5 flex items-center gap-4 cursor-pointer hover:bg-slate-800/30 transition-all"><input type="checkbox" class="rider-checkbox w-6 h-6 rounded-lg accent-accent" onchange="updateSorteioCounters()" data-nome="${p.nome}" data-cidade="${p.cidade}" data-score="${score}"><div class="flex-1"><div class="font-black text-sm text-white uppercase">${p.nome}</div><div class="text-[10px] font-bold text-slate-500 uppercase">${p.cidade}</div></div><div class="text-right"><div class="text-xs font-black text-accent">${score.toFixed(2)}</div>${diff && diff > 0 ? `<div class="text-[9px] font-black text-red-500">-${diff}</div>` : ''}</div></label>`;
    }).join('');
    updateSorteioCounters();
}

function renderStep3() {
    const container = document.getElementById('bulls-selection-list');
    const boiadas = currentEvent.boiadas || [];
    if (container) container.innerHTML = boiadas.map(b => `<div class="glass p-8 rounded-[2.5rem] border-white/5"><h4 class="text-xs font-black text-accent uppercase tracking-widest mb-6">${b.nome}</h4><div class="grid grid-cols-4 gap-4">${b.touros.map(t => `<label class="bg-slate-950/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-all"><input type="checkbox" class="bull-checkbox w-5 h-5 rounded-lg accent-accent" onchange="updateSorteioCounters()" data-nome="${t}" data-cia="${b.nome}"><span class="text-xs font-black text-white uppercase truncate">${t}</span></label>`).join('')}</div></div>`).join('');
    updateSorteioCounters();
}

window.updateSorteioCounters = () => {
    const ridersCount = document.querySelectorAll('.rider-checkbox:checked').length;
    const bullsCount = document.querySelectorAll('.bull-checkbox:checked').length;
    const cr = document.getElementById('count-riders');
    const cb = document.getElementById('count-bulls');
    if (cr) cr.innerText = ridersCount;
    if (cb) cb.innerText = bullsCount;
    const alert = document.getElementById('reride-alert');
    if (bullsCount > ridersCount) { if (alert) { alert.classList.remove('hidden'); alert.style.borderColor = (currentEvent.themeColor || '#EAB308') + '33'; } const rt = document.getElementById('reride-text'); if (rt) { rt.innerText = `${bullsCount - ridersCount} RE-RIDES`; rt.style.color = (currentEvent.themeColor || '#EAB308'); } } 
    else { if (alert) alert.classList.add('hidden'); }
};

window.generateDrawList = () => {
    sorteioData.riders = Array.from(document.querySelectorAll('.rider-checkbox:checked')).map(cb => ({ nome: cb.dataset.nome, cidade: cb.dataset.cidade }));
    sorteioData.bulls = Array.from(document.querySelectorAll('.bull-checkbox:checked')).map(cb => ({ nome: cb.dataset.nome, cia: cb.dataset.cia }));
    if (sorteioData.riders.length === 0 || sorteioData.bulls.length === 0) { alert("Selecione peões e touros."); return; }
    const listContainer = document.getElementById('final-draw-list');
    let normalCount = 0;
    const theme = currentEvent.themeColor || '#EAB308';
    if (listContainer) listContainer.innerHTML = sorteioData.bulls.map((b, idx) => {
        const isReride = idx >= sorteioData.riders.length;
        if (!isReride) normalCount++;
        return `<div class="flex items-center gap-6 p-6 bg-slate-950/50 border border-slate-800 rounded-2xl"><div class="w-12 h-12 flex items-center justify-center font-black text-xl italic rounded-xl" style="background-color: ${isReride ? theme+'22' : theme}; color: ${isReride ? theme : '#000'}; border: ${isReride ? `1px solid ${theme}44` : 'none'}">${isReride ? 'R' : normalCount}</div><div class="flex-1"><div class="text-xl font-black italic text-white uppercase">${b.nome}</div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${b.cia}</div></div>${isReride ? `<div class="bg-accent/10 text-accent px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">RE-RIDE ${idx - sorteioData.riders.length + 1}</div>` : ''}</div>`;
    }).join('');
    goToStep(4);
};

window.openEventControl = async (id) => {
    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    currentEvent = eventos.find(e => 
        (e.id && id && String(e.id) === String(id)) ||
        (id === 'undefined' && e.name) ||
        (id && e.share_id && e.share_id === id)
    );
    if (!currentEvent && eventos.length > 0 && (!id || id === 'undefined')) {
        currentEvent = eventos[0];
    }
    if (!currentEvent) return;
    if (!currentEvent.id || currentEvent.id === 'undefined') {
        currentEvent.id = 'evt_' + Date.now().toString();
        await window.electronAPI.updateLocalEvent(email, currentEvent);
    }
    window.currentEvent = currentEvent;

    toggleSupportBtn(false);

    // APLICAR COR DO EVENTO
    applyThemeColor(currentEvent.themeColor || '#EAB308');

    // EXIBIR LOGO NO HEADER
    const headerTitleArea = document.querySelector('#event-control-view h2').parentElement;
    const oldLogo = document.getElementById('event-control-logo');
    if (oldLogo) oldLogo.remove();
    
    if (currentEvent.logo) {
        const logoImg = document.createElement('img');
        logoImg.id = 'event-control-logo';
        logoImg.src = currentEvent.logo;
        logoImg.className = "h-24 w-auto object-contain mb-4 rounded-xl shadow-2xl border border-white/10";
        headerTitleArea.prepend(logoImg);
    }

    document.getElementById('control-event-name').innerText = currentEvent.name;
    document.getElementById('control-event-info').innerText = `${currentEvent.city} - ${currentEvent.days} DIAS - ${currentEvent.judges} JUIZES`;
    
    // Ajustar visibilidade dos botões para o módulo de Transmissão (apenas mostra Listas, Sorteios e Rankings)
    const btnCadastro = document.getElementById('control-btn-cadastro');
    const btnExportar = document.getElementById('control-btn-exportar');
    const btnNotas = document.getElementById('control-btn-notas');
    const btnSorteios = document.getElementById('control-btn-sorteios');
    
    if (currentSport === 'transmissao') {
        if (btnCadastro) btnCadastro.classList.add('hidden');
        if (btnExportar) btnExportar.classList.add('hidden');
        if (btnNotas) btnNotas.classList.add('hidden');
        if (btnSorteios) btnSorteios.setAttribute('onclick', 'openSorteiosList()');
    } else {
        if (btnCadastro) btnCadastro.classList.remove('hidden');
        if (btnExportar) btnExportar.classList.remove('hidden');
        if (btnNotas) btnNotas.classList.remove('hidden');
        if (btnSorteios) btnSorteios.setAttribute('onclick', "document.getElementById('modal-menu-sorteios').classList.remove('hidden')");
    }

    const userEmail = (email || '').toLowerCase().trim();
    const btnTablet = document.getElementById('control-btn-tablet');
    if (btnTablet) {
        if (userEmail === 'g7briell@hotmail.com' || userEmail === 'admin@rodeoapp.pro') {
            btnTablet.classList.remove('hidden');
        } else {
            btnTablet.classList.add('hidden');
        }
    }

    if (eventControlView) eventControlView.classList.remove('hidden');
    updateConnectionStatus(window.lastSyncStatus || 'synced');
    window.syncUserEventsWithCloud();

    // Inicializa canal Ably Realtime para receber notas dos Juízes ao vivo
    if (currentEvent.share_id) {
        window.initAblyRealtimeForEvent(currentEvent.share_id);
    }
};

window.hideAllModalsAndViews = () => {
    const ids = [
        'list-peoes-view', 'list-boiadas-view', 'list-sorteios-view',
        'modal-menu-cadastro', 'modal-menu-lista', 'modal-menu-sorteios', 'modal-menu-rankings',
        'modal-peao', 'modal-list-juizes', 'modal-juiz', 'modal-bulk-peoes',
        'modal-cloud-boiadas', 'modal-boiada', 'modal-evento', 'modal-choose-creation',
        'modal-pull-event', 'modal-share-event', 'modal-share-success',
        'modal-ordem-days', 'modal-ordem-dragdrop', 'modal-ordem-smart',
        'modal-export-days', 'modal-export-options', 'modal-export-juiz', 'modal-export-format',
        'modal-notas-days', 'modal-scoring-new', 'modal-reride-reason', 'modal-reride-bull',
        'modal-reride-confirm', 'modal-notas-summary', 'modal-contrato-config', 'modal-export-contract',
        'modal-settings', 'modal-global-peao', 'modal-global-boiada',
        'overlay-settings-list-screen', 'overlay-settings-config-screen',
        'modal-tablet-control', 'modal-import-pdf', 'modal-transmissao-eventos',
        'modal-choose-import', 'modal-photo-notes', 'modal-ocr-progress', 'modal-review-photo-notes',
        'event-control-view', 'transmissao-event-view', 'home-screen', 'sport-select-screen',
        'intro-screen', 'transmissao-screen', 'content-view'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
};

window.closeEventControl = () => {
    window.closeAblyRealtime();
    if (eventControlView) eventControlView.classList.add('hidden');
    toggleSupportBtn(true);
    applyThemeColor('#EAB308'); // Volta para o Dourado RODEOAPP
    
    window.hideAllModalsAndViews();
    
    if (currentSport === 'transmissao') {
        if (transmissaoScreen) transmissaoScreen.classList.remove('hidden');
        const modalTrans = document.getElementById('modal-transmissao-eventos');
        if (modalTrans) modalTrans.classList.remove('hidden');
    } else {
        if (homeScreen) homeScreen.classList.remove('hidden');
    }
};

// ==========================================
// IMPORTAR INFORMAÇÕES - LEITURA DE PLANILHA DE NOTAS POR FOTO / CÂMERA (OCR)
// ==========================================

let currentPhotoNotesImageBase64 = null;
let cameraMediaStream = null;

window.openImportChoiceModal = () => {
    const modal = document.getElementById('modal-choose-import');
    if (modal) modal.classList.remove('hidden');
};

window.selectImportOption = (type) => {
    const modalChoice = document.getElementById('modal-choose-import');
    if (modalChoice) modalChoice.classList.add('hidden');

    if (type === 'pdf') {
        const modalPdf = document.getElementById('modal-import-pdf');
        if (modalPdf) modalPdf.classList.remove('hidden');
    } else if (type === 'photo') {
        openPhotoNotesModal();
    }
};

window.openPhotoNotesModal = () => {
    if (!currentEvent) return alert("Abra um evento primeiro para importar notas por foto.");
    
    currentPhotoNotesImageBase64 = null;
    stopCameraStream();

    const previewContainer = document.getElementById('photo-notes-preview-container');
    const cameraContainer = document.getElementById('camera-stream-container');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (cameraContainer) cameraContainer.classList.add('hidden');

    populatePhotoNotesSelectors();

    const modal = document.getElementById('modal-photo-notes');
    if (modal) modal.classList.remove('hidden');
};

window.closePhotoNotesModal = () => {
    stopCameraStream();
    const modal = document.getElementById('modal-photo-notes');
    if (modal) modal.classList.add('hidden');
};

function populatePhotoNotesSelectors() {
    const daySelect = document.getElementById('photo-notes-day-select');
    const judgeSelect = document.getElementById('photo-notes-judge-select');

    if (daySelect) {
        const daysCount = parseInt((currentEvent && currentEvent.days) || '3', 10) || 3;
        let dayHtml = '';
        for (let d = 1; d <= daysCount; d++) {
            dayHtml += `<option value="${d}">Dia ${d}</option>`;
        }
        daySelect.innerHTML = dayHtml;
    }

    if (judgeSelect) {
        const juizes = (currentEvent && currentEvent.juizes) || [];
        if (juizes.length === 0) {
            judgeSelect.innerHTML = `<option value="Juiz Único">Juiz Único (Padrão)</option>`;
        } else {
            judgeSelect.innerHTML = juizes.map((j, idx) => {
                const jName = typeof j === 'string' ? j : (j.nome || `Juiz ${idx + 1}`);
                return `<option value="${jName}">Juiz ${idx + 1}: ${jName}</option>`;
            }).join('');
        }
    }
}

window.triggerPhotoFileInput = () => {
    const fileInput = document.getElementById('photo-notes-file-input');
    if (fileInput) fileInput.click();
};

window.handlePhotoNotesFileSelect = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    stopCameraStream();
    const reader = new FileReader();
    reader.onload = (e) => {
        currentPhotoNotesImageBase64 = e.target.result;
        showPhotoNotesPreview(currentPhotoNotesImageBase64);
    };
    reader.readAsDataURL(file);
};

window.toggleCameraMode = async () => {
    const cameraContainer = document.getElementById('camera-stream-container');
    const video = document.getElementById('photo-camera-video');

    if (cameraMediaStream) {
        stopCameraStream();
        return;
    }

    try {
        cameraMediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (video) {
            video.srcObject = cameraMediaStream;
            video.play();
        }
        if (cameraContainer) cameraContainer.classList.remove('hidden');
    } catch (err) {
        console.error("Erro ao acessar câmera:", err);
        alert("Não foi possível acessar a câmera do dispositivo: " + (err.message || err));
    }
};

function stopCameraStream() {
    if (cameraMediaStream) {
        cameraMediaStream.getTracks().forEach(track => track.stop());
        cameraMediaStream = null;
    }
    const cameraContainer = document.getElementById('camera-stream-container');
    if (cameraContainer) cameraContainer.classList.add('hidden');
}

window.captureCameraSnapshot = () => {
    const video = document.getElementById('photo-camera-video');
    if (!video || !cameraMediaStream) return alert("Câmera não está ativa.");

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    currentPhotoNotesImageBase64 = canvas.toDataURL('image/jpeg', 0.95);
    stopCameraStream();
    showPhotoNotesPreview(currentPhotoNotesImageBase64);
};

function showPhotoNotesPreview(imageSrc) {
    const imgEl = document.getElementById('photo-notes-preview-img');
    const container = document.getElementById('photo-notes-preview-container');
    if (imgEl) imgEl.src = imageSrc;
    if (container) container.classList.remove('hidden');
}

function preprocessImageForOCR(imageSrc) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(2000 / Math.max(img.width, img.height), 2.0);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const contrast = 1.6; 
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            
            for (let i = 0; i < data.length; i += 4) {
                let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                gray = factor * (gray - 128) + 128;
                let val = gray < 140 ? 0 : 255;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageSrc;
    });
}

window.startPhotoNotesOCRProcessing = async () => {
    if (!currentPhotoNotesImageBase64) return alert("Selecione ou tire uma foto da planilha primeiro.");

    closePhotoNotesModal();

    const modalProgress = document.getElementById('modal-ocr-progress');
    const progressBar = document.getElementById('ocr-progress-bar');
    const progressText = document.getElementById('ocr-progress-step-text');
    
    if (modalProgress) modalProgress.classList.remove('hidden');

    const updateProgress = (pct, text) => {
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.innerText = text;
    };

    try {
        updateProgress(15, "1/5. Upload da imagem da planilha...");
        await new Promise(r => setTimeout(r, 400));

        updateProgress(40, "2/5. Pré-processando contraste e nitidez...");
        const processedImage = await preprocessImageForOCR(currentPhotoNotesImageBase64);

        updateProgress(70, "3/5. Executando leitura de números das notas (OCR)...");

        let ocrText = '';
        if (window.Tesseract) {
            const worker = await Tesseract.createWorker('por');
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/-\n'
            });
            const ret = await worker.recognize(processedImage);
            ocrText = ret.data.text;
            await worker.terminate();
        } else {
            throw new Error("Biblioteca OCR Tesseract não foi carregada.");
        }

        updateProgress(90, "4/5. Associando competidores e notas dos juízes...");
        await new Promise(r => setTimeout(r, 300));

        const dayVal = parseInt(document.getElementById('photo-notes-day-select').value || '1', 10);
        const judgeVal = document.getElementById('photo-notes-judge-select').value || 'Juiz Único';

        const extractedRows = parsePhotoNotesOCRText(ocrText, judgeVal, dayVal);

        updateProgress(100, "5/5. Concluído com sucesso!");
        await new Promise(r => setTimeout(r, 300));

        if (modalProgress) modalProgress.classList.add('hidden');

        openPhotoNotesReviewModal(extractedRows, dayVal, judgeVal);
    } catch (err) {
        console.error("Erro na leitura OCR da planilha:", err);
        if (modalProgress) modalProgress.classList.add('hidden');
        alert("Falha na leitura da planilha: " + (err.message || err));
    }
};

function parsePhotoNotesOCRText(text, judgeName, dayVal) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const peoesList = (currentEvent && currentEvent.peoes) ? currentEvent.peoes : [];
    const results = [];

    lines.forEach(line => {
        const numMatches = line.match(/\b([1-9]\d(?:\.\d)?)\b/g);
        if (numMatches && numMatches.length > 0) {
            const numbers = numMatches.map(n => parseFloat(n)).filter(n => n >= 10 && n <= 100);
            if (numbers.length > 0) {
                let cleanText = line.replace(/[\d\.,\/\\-]/g, ' ').trim();
                let matchedPeao = null;

                if (cleanText.length >= 3) {
                    matchedPeao = peoesList.find(p => {
                        const pName = (p.nome || '').toLowerCase();
                        const cText = cleanText.toLowerCase();
                        return pName.includes(cText) || cText.includes(pName) || levDistance(pName, cText) < 4;
                    });
                }

                let notaPeao = 0;
                let notaTouro = 0;
                let notaTotal = 0;

                if (numbers.length >= 2) {
                    notaPeao = numbers[0];
                    notaTouro = numbers[1];
                    notaTotal = notaPeao + notaTouro;
                } else if (numbers.length === 1) {
                    if (numbers[0] >= 40) {
                        notaTotal = numbers[0];
                        notaPeao = Math.round(numbers[0] / 2 * 10) / 10;
                        notaTouro = Math.round(numbers[0] / 2 * 10) / 10;
                    } else {
                        notaPeao = numbers[0];
                        notaTotal = numbers[0];
                    }
                }

                results.push({
                    peaoNome: matchedPeao ? matchedPeao.nome : (cleanText || 'Competidor Não Identificado'),
                    peaoCidade: matchedPeao ? matchedPeao.cidade : '',
                    notaPeao: notaPeao,
                    notaTouro: notaTouro,
                    notaTotal: notaTotal,
                    juiz: judgeName,
                    day: dayVal
                });
            }
        }
    });

    if (results.length === 0 && peoesList.length > 0) {
        peoesList.forEach(p => {
            results.push({
                peaoNome: p.nome,
                peaoCidade: p.cidade || '',
                notaPeao: 0,
                notaTouro: 0,
                notaTotal: 0,
                juiz: judgeName,
                day: dayVal
            });
        });
    }

    return results;
}

function levDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}

let photoNotesReviewState = { day: 1, judge: '', rows: [] };

function openPhotoNotesReviewModal(rows, dayVal, judgeVal) {
    photoNotesReviewState = { day: dayVal, judge: judgeVal, rows: rows };

    const subtitle = document.getElementById('review-photo-notes-subtitle');
    if (subtitle) subtitle.innerText = `Planilha do Dia ${dayVal} • ${judgeVal}`;

    renderPhotoNotesReviewTable();

    const modal = document.getElementById('modal-review-photo-notes');
    if (modal) modal.classList.remove('hidden');
}

function renderPhotoNotesReviewTable() {
    const tbody = document.getElementById('photo-notes-review-tbody');
    const tableHeader = document.querySelector('#modal-review-photo-notes table thead tr');
    if (!tbody) return;

    const judgeName = photoNotesReviewState.judge || 'Juiz 1';
    if (tableHeader) {
        tableHeader.innerHTML = `
            <th class="p-3">Competidor (Peão)</th>
            <th class="p-3 text-center text-emerald-400">Nota Peão (${judgeName})</th>
            <th class="p-3 text-center text-yellow-400">Nota Touro (${judgeName})</th>
            <th class="p-3 text-center text-white font-black">Nota Total</th>
            <th class="p-3 text-center">Ação</th>
        `;
    }

    const peoesList = (currentEvent && currentEvent.peoes) ? currentEvent.peoes : [];

    let html = photoNotesReviewState.rows.map((row, idx) => {
        return `
        <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="p-3">
                <select onchange="updatePhotoNotesReviewRow(${idx}, 'peaoNome', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold outline-none focus:border-yellow-500">
                    ${peoesList.map(p => `<option value="${p.nome}" ${p.nome === row.peaoNome ? 'selected' : ''}>${p.nome} (${p.cidade || 'S/C'})</option>`).join('')}
                    ${!peoesList.some(p => p.nome === row.peaoNome) ? `<option value="${row.peaoNome}" selected>${row.peaoNome}</option>` : ''}
                </select>
            </td>
            <td class="p-3 text-center">
                <input type="number" step="0.5" value="${row.notaPeao || 0}" onchange="updatePhotoNotesReviewRow(${idx}, 'notaPeao', this.value)" class="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-white font-black outline-none focus:border-yellow-500">
            </td>
            <td class="p-3 text-center">
                <input type="number" step="0.5" value="${row.notaTouro || 0}" onchange="updatePhotoNotesReviewRow(${idx}, 'notaTouro', this.value)" class="w-20 bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-white font-black outline-none focus:border-yellow-500">
            </td>
            <td class="p-3 text-center font-black text-yellow-500 text-sm">
                ${((parseFloat(row.notaPeao) || 0) + (parseFloat(row.notaTouro) || 0)).toFixed(1)}
            </td>
            <td class="p-3 text-center">
                <button onclick="removeReviewRow(${idx})" class="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Remover">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');

    tbody.innerHTML = html || '<tr><td colspan="5" class="text-center p-6 text-slate-500 font-bold">Nenhum registro extraído. Adicione uma linha manualmente.</td></tr>';
}

window.updatePhotoNotesReviewRow = (idx, field, val) => {
    if (!photoNotesReviewState.rows[idx]) return;
    if (field === 'notaPeao' || field === 'notaTouro') {
        photoNotesReviewState.rows[idx][field] = parseFloat(val) || 0;
        photoNotesReviewState.rows[idx].notaTotal = (parseFloat(photoNotesReviewState.rows[idx].notaPeao) || 0) + (parseFloat(photoNotesReviewState.rows[idx].notaTouro) || 0);
    } else {
        photoNotesReviewState.rows[idx][field] = val;
    }
    renderPhotoNotesReviewTable();
};

window.addManualReviewRow = () => {
    const firstPeao = (currentEvent && currentEvent.peoes && currentEvent.peoes.length > 0) ? currentEvent.peoes[0].nome : 'Competidor Manual';
    photoNotesReviewState.rows.push({
        peaoNome: firstPeao,
        notaPeao: 20,
        notaTouro: 20,
        notaTotal: 40,
        juiz: photoNotesReviewState.judge,
        day: photoNotesReviewState.day
    });
    renderPhotoNotesReviewTable();
};

window.removeReviewRow = (idx) => {
    photoNotesReviewState.rows.splice(idx, 1);
    renderPhotoNotesReviewTable();
};

window.confirmAndSavePhotoNotes = async () => {
    if (!currentEvent) return;

    const email = getCurrentUserEmail();
    const day = photoNotesReviewState.day;

    if (!currentEvent.notas) currentEvent.notas = [];

    photoNotesReviewState.rows.forEach(r => {
        const total = (parseFloat(r.notaPeao) || 0) + (parseFloat(r.notaTouro) || 0);
        const existingIdx = currentEvent.notas.findIndex(n => n.day == day && n.peaoNome === r.peaoNome && (!n.juiz || n.juiz === r.juiz));

        if (existingIdx > -1) {
            currentEvent.notas[existingIdx].notaPeao = r.notaPeao;
            currentEvent.notas[existingIdx].notaTouro = r.notaTouro;
            currentEvent.notas[existingIdx].notaTotal = total;
            currentEvent.notas[existingIdx].juiz = r.juiz;
        } else {
            currentEvent.notas.push({
                day: day,
                peaoNome: r.peaoNome,
                notaPeao: r.notaPeao,
                notaTouro: r.notaTouro,
                notaTotal: total,
                juiz: r.juiz
            });
        }
    });

    // Limpar imediatamente a foto/imagem da memória para não ocupar espaço
    currentPhotoNotesImageBase64 = null;
    photoNotesReviewState = { day: 1, judge: '', rows: [] };
    const imgEl = document.getElementById('photo-notes-preview-img');
    if (imgEl) imgEl.src = '';
    const containerPreview = document.getElementById('photo-notes-preview-container');
    if (containerPreview) containerPreview.classList.add('hidden');

    await window.persistAndSyncEvent(currentEvent);

    document.getElementById('modal-review-photo-notes').classList.add('hidden');
    alert(`As notas da planilha do ${photoNotesReviewState.judge || 'Juiz'} (Dia ${day}) foram salvas com sucesso!`);

    openNotasSummaryModal();
};

// Sorteio Manual
window.openSorteioManual = () => {
    sorteioData = { day: '', riders: [], bulls: [], assignments: {} };
    const sv = document.getElementById('sorteio-manual-view');
    const sc = document.getElementById('sorteio-counters');
    if (sv) sv.classList.remove('hidden');
    if (sc) sc.classList.add('hidden');
    goToStep(1);
    renderStep1();
};
window.closeSorteioManual = () => { const sv = document.getElementById('sorteio-manual-view'); if (sv) sv.classList.add('hidden'); };

function goToStep(step) {
    document.querySelectorAll('.sorteio-step').forEach(s => s.classList.add('hidden'));
    const stepEl = document.getElementById(step === 'reride' ? 'step-reride' : `step-${step}`);
    if (stepEl) stepEl.classList.remove('hidden');
    const sc = document.getElementById('sorteio-counters');
    if (step !== 1 && sc) sc.classList.remove('hidden');
    if (step === 2) renderStep2();
    if (step === 3) renderStep3();
    if (step === 'reride') renderStepReRide();
    if (step === 5) renderStep5();
    if (step === 6) { saveDrawToEvent(); renderStep6(); }
}

window.getEventDaysList = () => {
    if (!currentEvent || !currentEvent.days) return ['DIA 1', 'SEMI-FINAL', 'FINAL'];
    const totalDays = parseInt(currentEvent.days) || 1;
    const classificatoryDays = Math.max(1, totalDays - 1);
    const days = [];
    for (let i = 1; i <= classificatoryDays; i++) {
        days.push(`DIA ${i}`);
    }
    days.push('SEMI-FINAL', 'FINAL');
    return days;
};

function renderStep1() {
    const container = document.getElementById('days-container');
    const daysList = getEventDaysList();
    let html = '';
    daysList.forEach(day => {
        html += `<button onclick="selectSorteioDay('${day}')" class="glass p-10 rounded-[2.5rem] border-white/5 hover:border-yellow-500 hover:bg-yellow-500/10 transition-all text-center"><h4 class="font-black text-3xl text-white italic">${day.replace(/DIA/gi, "ROUND")}</h4></button>`;
    });
    if (container) container.innerHTML = html;
}

window.selectSorteioDay = (day) => { sorteioData.day = day; goToStep(2); };

function renderStep2() {
    const container = document.getElementById('riders-selection-list');
    
    // Sort riders by score (DESC) and then by tempoAcumulado (DESC) for tie-breaker
    const peoes = [...(currentEvent.peoes || [])].sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.tempoAcumulado || 0) - (a.tempoAcumulado || 0);
    });
    
    const leaderScore = peoes.length > 0 ? (peoes[0].score || 0) : 0;
    const isDia1 = sorteioData.day === 'DIA 1';

    if (container) container.innerHTML = peoes.map((p, idx) => {
        const score = p.score || 0;
        const tempo = p.tempoAcumulado || 0;
        const diff = idx > 0 ? (leaderScore - score).toFixed(2) : null;
        
        const posText = !isDia1 ? `<span class="bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] mr-2 font-black">${idx + 1}º</span>` : '';
        
        const scoreDisplay = score === 0 && tempo > 0 
            ? `0.00 <div class="text-[9px] text-slate-500">(${tempo.toFixed(2)}s)</div>` 
            : `${score.toFixed(2)}`;

        return `<label class="glass p-6 rounded-2xl border-white/5 flex items-center gap-4 cursor-pointer hover:bg-slate-800/30 transition-all"><input type="checkbox" class="rider-checkbox w-6 h-6 rounded-lg accent-yellow-500" onchange="updateSorteioCounters()" data-nome="${p.nome}" data-cidade="${p.cidade}" data-score="${score}"><div class="flex-1"><div class="font-black text-sm text-white uppercase flex items-center">${posText}${p.nome}</div><div class="text-[10px] font-bold text-slate-500 uppercase">${p.cidade}</div></div><div class="text-right"><div class="text-xs font-black text-yellow-500 text-right">${scoreDisplay}</div>${diff && diff > 0 ? `<div class="text-[9px] font-black text-red-500">-${diff}</div>` : ''}</div></label>`;
    }).join('');
    updateSorteioCounters();
}

window.selectAllRiders = () => { document.querySelectorAll('.rider-checkbox').forEach(cb => cb.checked = true); updateSorteioCounters(); };

window.filterBullsStep3 = () => {
    const term = document.getElementById('search-bulls-step3').value.toLowerCase();
    document.querySelectorAll('#bulls-selection-list .bull-container').forEach(container => {
        let hasVisibleBull = false;
        const ciaTitle = container.querySelector('h4').innerText.toLowerCase();
        
        container.querySelectorAll('label').forEach(label => {
            const bullName = label.querySelector('span').innerText.toLowerCase();
            if (bullName.includes(term) || ciaTitle.includes(term)) {
                label.style.display = '';
                hasVisibleBull = true;
            } else {
                label.style.display = 'none';
            }
        });
        
        container.style.display = hasVisibleBull ? '' : 'none';
    });
};

window.filterBullsReRide = () => {
    const term = document.getElementById('search-bulls-reride').value.toLowerCase();
    document.querySelectorAll('#bulls-reride-list .bull-container').forEach(container => {
        let hasVisibleBull = false;
        const ciaTitle = container.querySelector('h4').innerText.toLowerCase();
        
        container.querySelectorAll('label').forEach(label => {
            const bullName = label.querySelector('span').innerText.toLowerCase();
            if (bullName.includes(term) || ciaTitle.includes(term)) {
                label.style.display = '';
                hasVisibleBull = true;
            } else {
                label.style.display = 'none';
            }
        });
        
        container.style.display = hasVisibleBull ? '' : 'none';
    });
};

function renderStep3() {
    const container = document.getElementById('bulls-selection-list');
    const boiadas = currentEvent.boiadas || [];
    if (container) container.innerHTML = boiadas.map(b => `
        <div class="glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white/5 bull-container mb-6">
            <div class="flex justify-between items-center mb-4 sm:mb-6">
                <h4 class="text-xs font-black text-yellow-500 uppercase tracking-widest">${b.nome}</h4>
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${(b.touros || []).length} touros</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                ${(b.touros || []).map(t => {
                    const bSide = (b.lados && b.lados[t]) ? b.lados[t] : 'C';
                    const isE = bSide === 'E';
                    return `
                    <label class="bull-card-wrapper bg-slate-950/60 border border-slate-800 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:border-yellow-500/60 transition-all select-none group">
                        <div class="flex items-center gap-3 min-w-0">
                            <input type="checkbox" class="bull-checkbox w-5 h-5 rounded-lg accent-yellow-500 flex-shrink-0 cursor-pointer" onchange="updateSorteioCounters()" data-nome="${t}" data-cia="${b.nome}" data-lado="${bSide}">
                            <span class="text-xs font-black text-white uppercase truncate group-hover:text-yellow-400 transition-colors">${t}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex-shrink-0 flex items-center gap-1 ${isE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'}">
                            <span class="w-1.5 h-1.5 rounded-full ${isE ? 'bg-emerald-400' : 'bg-yellow-400'}"></span>
                            ${bSide}
                        </span>
                    </label>`;
                }).join('')}
            </div>
        </div>
    `).join('');
    updateSorteioCounters();
}

window.validateAndGoToReRide = () => {
    sorteioData.riders = Array.from(document.querySelectorAll('.rider-checkbox:checked')).map(cb => ({ nome: cb.dataset.nome, cidade: cb.dataset.cidade }));
    const bullCheckboxes = Array.from(document.querySelectorAll('.bull-checkbox:checked'));
    
    if (sorteioData.riders.length === 0) return alert("Selecione os competidores no passo anterior!");
    if (bullCheckboxes.length !== sorteioData.riders.length) {
        return alert(`A quantidade de touros principais (${bullCheckboxes.length}) deve ser exatamente igual a quantidade de competidores (${sorteioData.riders.length})!`);
    }

    sorteioData.bulls = bullCheckboxes.map(cb => {
        const cia = (currentEvent.boiadas || []).find(c => c.nome === cb.dataset.cia);
        const lado = (cia && cia.lados && cia.lados[cb.dataset.nome]) ? cia.lados[cb.dataset.nome] : (cb.dataset.lado || 'C');
        return { 
            nome: cb.dataset.nome, 
            cia: cb.dataset.cia, 
            lado: lado === 'E' ? 'E' : 'C' 
        };
    });
    goToStep('reride');
};

function renderStepReRide() {
    const container = document.getElementById('bulls-reride-list');
    const boiadas = currentEvent.boiadas || [];
    const mainBullNames = sorteioData.bulls.map(b => b.nome);
    
    let html = '';
    boiadas.forEach(b => {
        const availableTouros = (b.touros || []).filter(t => !mainBullNames.includes(t));
        if (availableTouros.length > 0) {
            html += `
            <div class="glass p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border-white/5 bull-container mb-6">
                <div class="flex justify-between items-center mb-4 sm:mb-6">
                    <h4 class="text-xs font-black text-red-500 uppercase tracking-widest">${b.nome}</h4>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${availableTouros.length} disponíveis</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    ${availableTouros.map(t => {
                        const bSide = (b.lados && b.lados[t]) ? b.lados[t] : 'C';
                        const isE = bSide === 'E';
                        return `
                        <label class="bull-card-wrapper bg-slate-950/60 border border-slate-800 p-3 sm:p-4 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:border-red-500/60 transition-all select-none group">
                            <div class="flex items-center gap-3 min-w-0">
                                <input type="checkbox" class="reride-checkbox w-5 h-5 rounded-lg accent-red-500 flex-shrink-0 cursor-pointer" data-nome="${t}" data-cia="${b.nome}" data-lado="${bSide}">
                                <span class="text-xs font-black text-white uppercase truncate group-hover:text-red-400 transition-colors">${t}</span>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex-shrink-0 flex items-center gap-1 ${isE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'}">
                                <span class="w-1.5 h-1.5 rounded-full ${isE ? 'bg-emerald-400' : 'bg-yellow-400'}"></span>
                                ${bSide}
                            </span>
                        </label>`;
                    }).join('')}
                </div>
            </div>`;
        }
    });
    
    if (container) container.innerHTML = html || '<div class="text-center text-slate-500 font-bold p-10">Nenhum touro disponível para reserva.</div>';
}

window.updateSorteioCounters = () => {
    const ridersCount = document.querySelectorAll('.rider-checkbox:checked').length;
    const bullsCount = document.querySelectorAll('.bull-checkbox:checked').length;
    const cr = document.getElementById('count-riders');
    const cb = document.getElementById('count-bulls');
    if (cr) cr.innerText = ridersCount;
    if (cb) cb.innerText = bullsCount;
    const alertBox = document.getElementById('reride-alert');
    if (bullsCount !== ridersCount && ridersCount > 0) { 
        if (alertBox) alertBox.classList.remove('hidden'); 
        const rt = document.getElementById('reride-text'); 
        if (rt) rt.innerText = bullsCount > ridersCount ? `SOBRANDO: ${bullsCount - ridersCount}` : `FALTANDO: ${ridersCount - bullsCount}`; 
    } else { 
        if (alertBox) alertBox.classList.add('hidden'); 
    }
};

window.generateDrawListWithReRides = () => {
    const rerideCheckboxes = Array.from(document.querySelectorAll('.reride-checkbox:checked'));
    const rerides = rerideCheckboxes.map(cb => {
        const nome = cb.dataset.nome;
        const ciaNome = cb.dataset.cia;
        const cia = (currentEvent.boiadas || []).find(c => c.nome === ciaNome);
        const lado = (cia && cia.lados && cia.lados[nome]) ? cia.lados[nome] : (cb.dataset.lado || 'C');
        return { 
            nome, 
            cia: ciaNome, 
            lado: lado === 'E' ? 'E' : 'C' 
        };
    });

    // A lista oficial de touros será: os touros principais (já salvos) + os re-rides (adicionados no final)
    const allBulls = [...sorteioData.bulls, ...rerides];
    sorteioData.bulls = allBulls;
    
    const listContainer = document.getElementById('final-draw-list');
    let normalCount = 0;
    if (listContainer) listContainer.innerHTML = sorteioData.bulls.map((b, idx) => {
        const isReride = idx >= sorteioData.riders.length;
        if (!isReride) normalCount++;
        const isE = b.lado === 'E';
        return `
        <div class="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div class="w-10 h-10 sm:w-12 sm:h-12 ${isReride ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-yellow-500 text-black'} rounded-xl flex items-center justify-center font-black text-lg sm:text-xl italic flex-shrink-0">
                ${isReride ? 'R' : normalCount}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-base sm:text-xl font-black italic text-white uppercase truncate">${b.nome}</div>
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">${b.cia}</div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'}">
                    LADO ${b.lado}
                </span>
                ${isReride ? `<div class="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hidden sm:block">RE-RIDE ${idx - sorteioData.riders.length + 1}</div>` : ''}
            </div>
        </div>`;
    }).join('');
    
    goToStep(4);
};

window.exportBoiadas = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.bulls) return alert("Não há dados de touros para exportar!");

    // Anexar lados aos touros
    if (currentEvent.boiadas) {
        sorteioData.bulls.forEach(b => {
            const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (!b.lado && cia && cia.lados && cia.lados[b.nome]) b.lado = cia.lados[b.nome];
        });
    }

    const result = await window.electronAPI.exportBoiadasExcel({
        sorteioData: sorteioData
    });
    
    if (result.success) {
        alert('Lista de Touros exportada com sucesso!');
    } else if (!result.canceled) {
        alert('Erro ao exportar Lista de Touros: ' + result.message);
    }
};

window.exportToExcel = window.exportBoiadas;

window.exportJuizesExcel = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.riders || !sorteioData.bulls) return alert("Não há dados de sorteio para exportar!");

    // Anexar lados aos touros
    if (currentEvent.boiadas) {
        sorteioData.bulls.forEach(b => {
            const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (!b.lado && cia && cia.lados && cia.lados[b.nome]) b.lado = cia.lados[b.nome];
        });
    }

    // Anexar acumulado aos peões
    if (currentEvent.peoes) {
        sorteioData.riders.forEach(r => {
            const peao = currentEvent.peoes.find(p => p.nome === r.nome);
            r.acumulado = peao && peao.score ? peao.score.toFixed(2).replace('.', ',') : "0,00";
        });
    }

    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const day = (sorteioData.day || '---').toUpperCase();

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando Planilha...</h2>';
    document.body.appendChild(loader);

    const result = await window.electronAPI.exportJuizesExcel({
        sorteioData: sorteioData,
        eventName: eventName,
        day: day,
        juizNome: (pendingExportJuiz || 'JUIZ').toUpperCase()
    });
    
    document.body.removeChild(loader);

    if (result.success) {
        alert('Planilha do Juiz exportada com sucesso!');
    } else if (!result.canceled) {
        alert('Erro ao exportar Planilha do Juiz: ' + result.message);
    }
};

// ==========================================
// NOVO FLUXO DE EXPORTAÇÃO
// ==========================================
let pendingExportDay = '';
let pendingExportType = '';

window.openExportFlow = async () => {
    try {
        console.log('[EXPORT FLOW] openExportFlow called, currentEvent:', currentEvent);
        if (!currentEvent || !currentEvent.id) {
            const email = getCurrentUserEmail();
            if (email && window.electronAPI && typeof window.electronAPI.getLocalEvents === 'function') {
                const eventos = await window.electronAPI.getLocalEvents(email);
                if (eventos && eventos.length > 0) {
                    currentEvent = eventos[0];
                    window.currentEvent = currentEvent;
                }
            }
        }
        
        if (!currentEvent) {
            alert("⚠️ Por favor, selecione ou abra um evento primeiro!");
            return;
        }
        
        const daysContainer = document.getElementById('export-days-grid');
        if (daysContainer) {
            const daysList = getEventDaysList();
            daysContainer.innerHTML = daysList.map(day => `
                <button onclick="selectExportDay('${day}')" class="bg-slate-950 border border-slate-800 py-6 rounded-2xl font-black text-white hover:border-yellow-500 hover:text-yellow-500 transition-all">${day.replace(/DIA/gi, "ROUND")}</button>
            `).join('');
        }

        const modal = document.getElementById('modal-export-days');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    } catch(err) {
        console.error('[EXPORT FLOW] Error:', err);
        window.showDebugLogError('Abrir Menu Exportar', err);
    }
};

window.closeExportDaysModal = () => {
    const modal = document.getElementById('modal-export-days');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.closeExportOptionsModal = () => {
    const modal = document.getElementById('modal-export-options');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.closeExportJuizModal = () => {
    const modal = document.getElementById('modal-export-juiz');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.closeExportFormatModal = () => {
    const modal = document.getElementById('modal-export-format');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.selectExportDay = (day) => {
    pendingExportDay = day;
    const titleEl = document.getElementById('export-selected-day');
    if (titleEl) titleEl.innerText = `DIA SELECIONADO: ${day}`;
    
    window.closeExportDaysModal();
    const modalOptions = document.getElementById('modal-export-options');
    if (modalOptions) {
        modalOptions.classList.remove('hidden');
        modalOptions.style.display = 'flex';
    }
};

let pendingExportJuiz = '';

window.selectExportType = (type) => {
    pendingExportType = type;
    window.closeExportOptionsModal();
    
    if (type === 'juizes') {
        if (!currentEvent || !currentEvent.juizes || currentEvent.juizes.length === 0) {
            alert('Não há juízes cadastrados neste evento!');
            return;
        }
        const container = document.getElementById('export-juiz-list');
        container.innerHTML = currentEvent.juizes.map(j => {
            const jNome = typeof j === 'string' ? j : j.nome;
            return `
            <button onclick="selectExportJuiz('${jNome}')" class="bg-slate-950 border border-slate-800 p-6 rounded-2xl font-black text-white hover:border-yellow-500 hover:bg-yellow-500/10 text-left transition-all">
                ${jNome.toUpperCase()}
            </button>
            `;
        }).join('');
        const modalJuiz = document.getElementById('modal-export-juiz');
        if (modalJuiz) {
            modalJuiz.classList.remove('hidden');
            modalJuiz.style.display = 'flex';
        }
    } else {
        const modalFormat = document.getElementById('modal-export-format');
        if (modalFormat) {
            modalFormat.classList.remove('hidden');
            modalFormat.style.display = 'flex';
        }
    }
};

window.selectExportJuiz = (juizNome) => {
    pendingExportJuiz = juizNome;
    window.closeExportJuizModal();
    const modalFormat = document.getElementById('modal-export-format');
    if (modalFormat) {
        modalFormat.classList.remove('hidden');
        modalFormat.style.display = 'flex';
    }
};

window.executeReportView = () => {
    window.closeExportFormatModal();
    let reportMap = {
        'sorteio': 'sorteio',
        'touros': 'boiadas',
        'ordem': 'embretamento',
        'juizes': 'sumula',
        'ranking': 'ranking_geral',
        'melhor_cia': 'ranking_cias'
    };
    let targetType = reportMap[pendingExportType] || 'sorteio';
    openReportViewer(targetType, pendingExportDay);
};

window.executeExport = (format) => {
    window.closeExportFormatModal();
    
    if (pendingExportType === 'sorteio' || pendingExportType === 'touros' || pendingExportType === 'juizes' || pendingExportType === 'ordem') {
        if (currentEvent && currentEvent.sorteios) {
            const salvos = currentEvent.sorteios.filter(s => s.day.toUpperCase() === pendingExportDay.toUpperCase());
            if (salvos.length === 1) {
                sorteioData = salvos[0];
            } else if (salvos.length > 1) {
                return alert(`Existem ${salvos.length} sorteios diferentes salvos para o ${pendingExportDay}!\n\nPara exportar o correto, acesse o botão "HISTÓRICO SORTEIOS" na tela do evento e clique no botão EXPORTAR correspondente ao sorteio exato que você deseja.`);
            } else {
                return alert(`Não há sorteio salvo para o ${pendingExportDay}!`);
            }
        } else {
            return alert("Não há sorteios salvos neste evento!");
        }
    }

    if (!sorteioData) sorteioData = {};
    sorteioData.day = pendingExportDay;

    if (format === 'excel') {
        if (pendingExportType === 'sorteio') {
            window.exportConfrontos();
        } else if (pendingExportType === 'touros') {
            window.exportBoiadas();
        } else if (pendingExportType === 'juizes') {
            window.exportJuizesExcel();
        } else if (pendingExportType === 'ordem') {
            window.exportOrdemExcel();
        } else if (pendingExportType === 'ranking') {
            window.exportRankingExcel();
        } else if (pendingExportType === 'melhor_cia') {
            window.exportMelhorCia('excel');
        }
    } else if (format === 'pdf') {
        if (pendingExportType === 'sorteio') {
            window.exportConfrontosPDF();
        } else if (pendingExportType === 'touros') {
            window.exportBoiadasPDF();
        } else if (pendingExportType === 'juizes') {
            window.exportJuizesPDF();
        } else if (pendingExportType === 'ordem') {
            window.exportOrdemPDF();
        } else if (pendingExportType === 'ranking') {
            window.exportRankingPDF();
        } else if (pendingExportType === 'melhor_cia') {
            window.exportMelhorCia('pdf');
        }
    }
};

window.exportJuizesPDF = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.riders || !sorteioData.bulls) return alert("Não há dados de sorteio para exportar!");

    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const day = (sorteioData.day || '---').toUpperCase();
    const auth = window.electronAPI.getAuth();
    const clientName = (auth && auth.nome) || "Cliente RODEOAPP";
    const juizNome = (pendingExportJuiz || 'JUIZ').toUpperCase();

    const logoBase64 = await window.electronAPI.getPdfLogo();

    let html = `
    <html><head><meta charset="UTF-8">
    <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        th, td { border: 1px solid #000; padding: 6px 4px; text-align: left; white-space: nowrap; font-size: 12px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .reservas { background-color: #d1d5db; font-weight: bold; text-align: center; }
        .col-header { background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; }
        .header-container { background-color: #000; padding: 10px 20px; border: 1px solid #000; color: #fff; display: flex; align-items: center; justify-content: space-between; }
        .footer-container { background-color: #000; padding: 10px; text-align: center; border: 1px solid #000; color: #fff; font-size: 12px; font-weight: bold; }
        .judge-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; border: 1px solid #000; padding: 5px; background: #f3f4f6; display: inline-block; }
    </style></head><body>
        <div class="judge-name">NOME DO JUIZ: ${juizNome}</div>
        <table>
            <thead>
                <tr>
                    <td colspan="11" style="padding: 0; border: none;">
                        <div class="header-container">
                            ${logoBase64 ? `<img src="${logoBase64}" style="height: 35px;">` : '<div style="width: 100px;"></div>'}
                            <div style="flex-grow: 1; text-align: center;">
                                <h1 style="margin:0; font-size: 20px; font-style: italic; font-weight: 900;">${eventName}</h1>
                                <p style="margin:2px 0 0; font-size: 10px; letter-spacing: 2px;">PLANILHA JUIZ - ${day}</p>
                            </div>
                            <div style="width: 100px;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th class="col-header" style="width:4%;">MONT</th>
                    <th class="col-header" style="width:19%; text-align: left;">COMPETIDOR</th>
                    <th class="col-header" style="width:12%; text-align: left;">CIDADE</th>
                    <th class="col-header" style="width:6%;">ACUM.</th>
                    <th class="col-header" style="width:17%; text-align: left;">ANIMAL</th>
                    <th class="col-header" style="width:11%; text-align: left;">COMPANHIA</th>
                    <th class="col-header" style="width:4%;">LADO</th>
                    <th class="col-header" style="width:7%;">TEMPO</th>
                    <th class="col-header" style="width:6%;">ANIMAL</th>
                    <th class="col-header" style="width:7%;">COMP.</th>
                    <th class="col-header" style="width:7%;">TOTAL</th>
                </tr>
            </thead>
            <tfoot>
                <tr>
                    <td colspan="11" style="padding: 0; border: none;">
                        <div class="footer-container">
                            RODEOAPP (18) 98122-6665 - GEST&Atilde;O DE RODEIOS - LICENCIADO PARA: ${clientName.toUpperCase()}
                        </div>
                    </td>
                </tr>
            </tfoot>
            <tbody>
    `;

    const totalRiders = sorteioData.riders.length;

    // Touros Sorteados
    sorteioData.riders.forEach((r, idx) => {
        const b = sorteioData.bulls[sorteioData.assignments[idx]];
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (b.lado) lado = b.lado; else if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
        }
        let acum = "0,00";
        if (currentEvent && currentEvent.peoes) {
            const peao = currentEvent.peoes.find(p => p.nome === r.nome);
            if (peao && peao.score) acum = peao.score.toFixed(2).replace('.', ',');
        }

        html += `<tr>
            <td class="center bold" style="font-size: 13px;">${idx + 1}</td>
            <td style="font-size: 13px; font-weight: bold;">${r.nome.toUpperCase()}</td>
            <td style="font-size: 10px;">${(r.cidade || '').toUpperCase()}</td>
            <td class="center bold" style="font-size: 11px;">${acum}</td>
            <td style="font-size: 13px; font-weight: bold;">${b.nome.toUpperCase()}</td>
            <td style="font-size: 10px;">${b.cia.toUpperCase()}</td>
            <td class="center bold" style="font-size: 12px;">${window.formatSide(lado)}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    });

    // Touros Re-rides
    if (sorteioData.bulls.length > totalRiders) {
        html += `<tr>
            <td colspan="11" class="reservas" style="padding: 10px;">ANIMAIS RESERVAS (RE-RIDE)</td>
        </tr>`;
        
        sorteioData.bulls.slice(totalRiders).forEach((b, idx) => {
            let lado = '';
            if (currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (b.lado) lado = b.lado; else if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }
            html += `<tr>
                <td class="center bold" style="font-size: 13px; color: #d32f2f;">R${idx + 1}</td>
                <td></td>
                <td></td>
                <td></td>
                <td style="font-size: 13px; font-weight: bold;">${b.nome.toUpperCase()}</td>
                <td style="font-size: 10px;">${b.cia.toUpperCase()}</td>
                <td class="center bold" style="font-size: 12px;">${window.formatSide(lado)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`;
        });
    }

    html += `</tbody></table></body></html>`;

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando PDF...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportPDF({ htmlContent: html, defaultName: `Juiz_${juizNome.replace(/\s+/g,'_')}_${eventName.replace(/\s+/g,'_')}_${day.replace(/\s+/g,'_')}.pdf` });
        document.body.removeChild(loader);
        if (res && res.success) alert("PDF do Juiz exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar PDF: " + res.message);
    } catch(e) {
        document.body.removeChild(loader);
        alert("Erro inesperado: " + e.message);
    }
};

window.exportConfrontosPDF = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.riders || !sorteioData.bulls) return alert("Não há dados de sorteio para exportar!");
    
    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const day = (sorteioData.day || '---').toUpperCase();
    const auth = window.electronAPI.getAuth();
    const clientName = (auth && auth.nome) || "Cliente RODEOAPP";

    // Pega a logo branca
    const logoBase64 = await window.electronAPI.getPdfLogo();

    let html = `
    <html><head><meta charset="UTF-8">
    <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        th, td { border: 1px solid #000; padding: 10px 5px; text-align: left; white-space: nowrap; font-size: 14px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .reservas { background-color: #d1d5db; font-weight: bold; }
        .col-header { background-color: #e5e7eb; font-weight: bold; text-align: center; }
        .header-container { background-color: #000; padding: 10px 20px; border: 1px solid #000; color: #fff; display: flex; align-items: center; justify-content: space-between; }
        .footer-container { background-color: #000; padding: 10px; text-align: center; border: 1px solid #000; color: #fff; font-size: 12px; font-weight: bold; }
    </style></head><body>
        <table>
            <thead>
                <tr>
                    <td colspan="7" style="padding: 0; border: none;">
                        <div class="header-container">
                            ${logoBase64 ? `<img src="${logoBase64}" style="height: 35px;">` : '<div style="width: 100px;"></div>'}
                            <div style="flex-grow: 1; text-align: center;">
                                <h1 style="margin:0; font-size: 22px; font-style: italic; font-weight: 900;">${eventName}</h1>
                                <p style="margin:2px 0 0; font-size: 12px; letter-spacing: 2px;">SORTEIO OFICIAL - ${day}</p>
                            </div>
                            <div style="width: 100px;"></div> <!-- Spacer invisível para equilibrar o flexbox -->
                        </div>
                    </td>
                </tr>
                <tr>
                    <th class="col-header" style="width:5%;">N&ordm;</th>
                    <th class="col-header" style="width:30%; text-align: left;">COMPETIDOR</th>
                    <th class="col-header" style="width:20%; text-align: left;">CIDADE</th>
                    <th class="col-header" style="width:10%;">ACUM.</th>
                    <th class="col-header" style="width:15%; text-align: left;">ANIMAL</th>
                    <th class="col-header" style="width:15%; text-align: left;">COMPANHIA</th>
                    <th class="col-header" style="width:5%;">L</th>
                </tr>
            </thead>
            <tfoot>
                <tr>
                    <td colspan="7" style="padding: 0; border: none;">
                        <div class="footer-container">
                            RODEOAPP (18) 98122-6665 - GEST&Atilde;O DE RODEIOS - LICENCIADO PARA: ${clientName.toUpperCase()}
                        </div>
                    </td>
                </tr>
            </tfoot>
            <tbody>
    `;

    sorteioData.riders.forEach((r, idx) => {
        const bull = sorteioData.bulls[sorteioData.assignments[idx]];
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const cia = currentEvent.boiadas.find(c => c.nome === bull.cia);
            if (bull.lado) lado = bull.lado; else if (cia && cia.lados && cia.lados[bull.nome]) lado = cia.lados[bull.nome];
        }
        let acum = "0,00";
        if (currentEvent && currentEvent.peoes) {
            const peao = currentEvent.peoes.find(p => p.nome === r.nome);
            if (peao && peao.score) acum = peao.score.toFixed(2).replace('.', ',');
        }

        html += `<tr>
            <td class="center bold" style="font-size: 16px;">${idx + 1}</td>
            <td style="font-size: 15px; font-weight: bold;">${r.nome.toUpperCase()}</td>
            <td style="font-size: 12px;">${(r.cidade || '').toUpperCase()}</td>
            <td class="center bold" style="font-size: 14px;">${acum}</td>
            <td style="font-size: 14px; font-weight: bold;">${bull.nome.toUpperCase()}</td>
            <td style="font-size: 11px;">${bull.cia.toUpperCase()}</td>
            <td class="center bold" style="font-size: 16px;">${window.formatSide(lado)}</td>
        </tr>`;
    });

    const totalRiders = sorteioData.riders.length;
    if (sorteioData.bulls.length > totalRiders) {
        html += `<tr>
            <td colspan="4" class="reservas center">ANIMAIS RESERVAS</td>
            <td class="reservas">ANIMAL</td>
            <td class="reservas">COMPANHIA</td>
            <td class="reservas center">L</td>
        </tr>`;
        sorteioData.bulls.slice(totalRiders).forEach((b) => {
            let lado = '';
            if (currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (b.lado) lado = b.lado; else if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }
            html += `<tr>
                <td></td><td></td><td></td><td></td>
                <td style="font-size: 14px; font-weight: bold;">${b.nome.toUpperCase()}</td>
                <td style="font-size: 11px;">${b.cia.toUpperCase()}</td>
                <td class="center bold" style="font-size: 16px;">${window.formatSide(lado)}</td>
            </tr>`;
        });
    }

    html += `</tbody></table></body></html>`;

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando PDF...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportPDF({ htmlContent: html, defaultName: `Sorteio_${eventName.replace(/\s+/g,'_')}_${day.replace(/\s+/g,'_')}.pdf` });
        document.body.removeChild(loader);
        if (res && res.success) alert("PDF exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar PDF: " + res.message);
    } catch(e) {
        document.body.removeChild(loader);
        alert("Erro inesperado: " + e.message);
    }
};

window.exportBoiadasPDF = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.bulls) return alert("Não há dados de touros para exportar!");

    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const day = (sorteioData.day || '---').toUpperCase();
    const auth = window.electronAPI.getAuth();
    const clientName = (auth && auth.nome) || "Cliente RODEOAPP";

    const logoBase64 = await window.electronAPI.getPdfLogo();

    let html = `
    <html><head><meta charset="UTF-8">
    <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        th, td { border: 1px solid #000; padding: 10px 5px; text-align: left; white-space: nowrap; font-size: 14px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .reservas { background-color: #d1d5db; font-weight: bold; text-align: center; }
        .col-header { background-color: #e5e7eb; font-weight: bold; text-align: center; }
        .header-container { background-color: #000; padding: 10px 20px; border: 1px solid #000; color: #fff; display: flex; align-items: center; justify-content: space-between; }
        .footer-container { background-color: #000; padding: 10px; text-align: center; border: 1px solid #000; color: #fff; font-size: 12px; font-weight: bold; }
    </style></head><body>
        <table>
            <thead>
                <tr>
                    <td colspan="4" style="padding: 0; border: none;">
                        <div class="header-container">
                            ${logoBase64 ? `<img src="${logoBase64}" style="height: 35px;">` : '<div style="width: 100px;"></div>'}
                            <div style="flex-grow: 1; text-align: center;">
                                <h1 style="margin:0; font-size: 22px; font-style: italic; font-weight: 900;">${eventName}</h1>
                                <p style="margin:2px 0 0; font-size: 12px; letter-spacing: 2px;">LISTA DE TOUROS - ${day}</p>
                            </div>
                            <div style="width: 100px;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th class="col-header" style="width:10%;">N&ordm;</th>
                    <th class="col-header" style="width:45%; text-align: left;">TOURO</th>
                    <th class="col-header" style="width:35%; text-align: left;">COMPANHIA</th>
                    <th class="col-header" style="width:10%;">LADO</th>
                </tr>
            </thead>
            <tfoot>
                <tr>
                    <td colspan="4" style="padding: 0; border: none;">
                        <div class="footer-container">
                            RODEOAPP (18) 98122-6665 - GEST&Atilde;O DE RODEIOS - LICENCIADO PARA: ${clientName.toUpperCase()}
                        </div>
                    </td>
                </tr>
            </tfoot>
            <tbody>
    `;

    const totalRiders = sorteioData.riders.length;

    // Touros Sorteados
    sorteioData.bulls.slice(0, totalRiders).forEach((b, idx) => {
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (b.lado) lado = b.lado; else if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
        }

        html += `<tr>
            <td class="center bold" style="font-size: 16px;">${idx + 1}</td>
            <td style="font-size: 15px; font-weight: bold;">${b.nome.toUpperCase()}</td>
            <td style="font-size: 14px;">${b.cia.toUpperCase()}</td>
            <td class="center bold" style="font-size: 16px;">${window.formatSide(lado)}</td>
        </tr>`;
    });

    // Touros Re-rides
    if (sorteioData.bulls.length > totalRiders) {
        html += `<tr>
            <td colspan="4" class="reservas" style="padding: 15px;">ANIMAIS RESERVAS (RE-RIDE)</td>
        </tr>`;
        
        sorteioData.bulls.slice(totalRiders).forEach((b, idx) => {
            let lado = '';
            if (currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (b.lado) lado = b.lado; else if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }
            html += `<tr>
                <td class="center bold" style="font-size: 16px; color: #d32f2f;">R${idx + 1}</td>
                <td style="font-size: 15px; font-weight: bold;">${b.nome.toUpperCase()}</td>
                <td style="font-size: 14px;">${b.cia.toUpperCase()}</td>
                <td class="center bold" style="font-size: 16px;">${window.formatSide(lado)}</td>
            </tr>`;
        });
    }

    html += `</tbody></table></body></html>`;

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando PDF...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportPDF({ htmlContent: html, defaultName: `Lista_Touros_${eventName.replace(/\s+/g,'_')}_${day.replace(/\s+/g,'_')}.pdf` });
        document.body.removeChild(loader);
        if (res && res.success) alert("PDF de Touros exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar PDF: " + res.message);
    } catch(e) {
        document.body.removeChild(loader);
        alert("Erro inesperado: " + e.message);
    }
};

window.exportConfrontos = async () => {
    const themeColor = currentEvent.themeColor || '#EAB308';
    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const day = (sorteioData.day || '---').toUpperCase();
    const auth = window.electronAPI.getAuth();
    const clientName = (auth && auth.nome) || "Cliente RODEOAPP";

    const ridersMapped = sorteioData.riders.map((r) => {
        let acum = "0,00";
        if (currentEvent && currentEvent.peoes) {
            const peao = currentEvent.peoes.find(p => p.nome === r.nome);
            if (peao && peao.score) {
                acum = peao.score.toFixed(2).replace('.', ',');
            }
        }
        return { nome: r.nome, cidade: r.cidade, acumulado: acum };
    });

    const bullsMapped = sorteioData.bulls.map((b) => {
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const ciaObj = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (b.lado) { lado = b.lado; } else if (ciaObj && ciaObj.lados && ciaObj.lados[b.nome]) {
                lado = ciaObj.lados[b.nome];
            }
        }
        return { nome: b.nome, cia: b.cia, lado: lado };
    });

    const exportPayload = {
        eventName,
        day,
        clientName,
        sorteioData: {
            riders: ridersMapped,
            bulls: bullsMapped,
            assignments: sorteioData.assignments
        }
    };

    const loader = document.createElement('div');
    loader.style.position = 'fixed';
    loader.style.top = '0'; loader.style.left = '0'; loader.style.width = '100vw'; loader.style.height = '100vh';
    loader.style.backgroundColor = 'rgba(0,0,0,0.8)'; loader.style.color = '#fff'; loader.style.display = 'flex';
    loader.style.alignItems = 'center'; loader.style.justifyContent = 'center'; loader.style.zIndex = '9999';
    loader.innerHTML = '<h2 style="color: white;">Gerando Excel a partir do Molde...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportSorteioExcel(exportPayload);
        document.body.removeChild(loader);
        
        if (res && res.success) {
            alert("Sorteio exportado com sucesso usando o Molde!");
        } else if (res && !res.canceled) {
            alert("Erro ao exportar: " + (res.message || 'Desconhecido'));
        }
    } catch (e) {
        document.body.removeChild(loader);
        alert("Erro inesperado ao exportar: " + e.message);
    }
};

window.confirmContinueToStep5 = () => { if (confirm("JÁ exportou a lista de touros?")) goToStep(5); };

function renderStep5() {
    const container = document.getElementById('assignment-list');
    const availableBulls = sorteioData.bulls.slice(0, sorteioData.riders.length);
    if (container) container.innerHTML = sorteioData.riders.map((r, rIdx) => {
        const assignedBullIdx = sorteioData.assignments[rIdx];
        const assignedBull = assignedBullIdx !== undefined ? availableBulls[assignedBullIdx] : null;
        const isE = assignedBull && assignedBull.lado === 'E';
        return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl hover:border-yellow-500/30 transition-all mb-3">
            <div class="flex-1 min-w-0">
                <div class="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1">Competidor #${rIdx + 1}</div>
                <div class="text-lg sm:text-2xl font-black italic text-white uppercase truncate">${r.nome}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">${r.cidade}</div>
            </div>
            
            <div class="hidden sm:flex w-10 h-10 items-center justify-center text-slate-500 font-black text-xl italic flex-shrink-0">VS</div>
            
            <div class="flex-1 min-w-0">
                <button type="button" onclick="openBullSelector(${rIdx})" class="w-full bg-slate-950/80 border border-slate-800 p-4 sm:p-5 rounded-2xl text-left hover:border-yellow-500/60 hover:bg-yellow-500/5 transition-all group cursor-pointer active:scale-98">
                    ${assignedBull ? `
                        <div class="flex items-center justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <div class="text-[9px] font-black text-yellow-500 uppercase tracking-wider mb-0.5">Touro Sorteado</div>
                                <div class="text-base sm:text-xl font-black italic text-white uppercase truncate group-hover:text-yellow-400">${assignedBull.nome}</div>
                                <div class="text-[10px] font-bold text-slate-400 uppercase truncate">${assignedBull.cia}</div>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${isE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'}">
                                LADO ${assignedBull.lado || 'C'}
                            </span>
                        </div>
                    ` : `
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-black text-xs sm:text-sm uppercase tracking-wider">Clique para Escolher Touro...</span>
                            <svg class="w-5 h-5 text-slate-600 group-hover:text-yellow-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    `}
                </button>
            </div>
        </div>`;
    }).join('');
    const btn = document.getElementById('btn-finish-assignment');
    if (btn) {
        const allAssigned = Object.keys(sorteioData.assignments).length === sorteioData.riders.length;
        btn.disabled = !allAssigned;
        btn.className = allAssigned ? "bg-yellow-500 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-black text-black shadow-xl uppercase transition-all hover:bg-yellow-400 active:scale-95 cursor-pointer" : "bg-slate-800 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-black text-slate-600 opacity-50 cursor-not-allowed uppercase transition-all";
    }
}

window.openBullSelector = (riderIdx) => {
    const availableBulls = sorteioData.bulls.slice(0, sorteioData.riders.length);
    const assignedIndices = Object.values(sorteioData.assignments);
    
    // Remove modal anterior se houver
    document.querySelectorAll('.bull-selector-modal-root').forEach(el => el.remove());

    let html = `
    <div class="bull-selector-modal-root fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 md:p-10 animate-in fade-in duration-200">
        <div class="bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div class="flex justify-between items-start mb-6 gap-4 border-b border-white/5 pb-4">
                <div class="min-w-0">
                    <div class="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">ESCOLHER TOURO PARA O COMPETIDOR</div>
                    <h3 class="text-xl sm:text-2xl md:text-3xl font-black italic uppercase text-white tracking-tighter truncate">${sorteioData.riders[riderIdx].nome}</h3>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${sorteioData.riders[riderIdx].cidade}</div>
                </div>
                <button type="button" onclick="this.closest('.bull-selector-modal-root').remove()" class="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 transition-all flex-shrink-0 cursor-pointer">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 custom-scroll">`;

    availableBulls.forEach((b, bIdx) => {
        if (!assignedIndices.includes(bIdx) || sorteioData.assignments[riderIdx] === bIdx) { 
            const isSelected = sorteioData.assignments[riderIdx] === bIdx;
            const isE = b.lado === 'E';
            html += `
            <button type="button" onclick="assignBull(${riderIdx}, ${bIdx}); this.closest('.bull-selector-modal-root').remove();" class="bg-slate-950/90 border ${isSelected ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-800 hover:border-yellow-500/60 hover:bg-yellow-500/5'} p-4 sm:p-5 rounded-2xl text-left transition-all group flex items-center justify-between gap-3 active:scale-98 cursor-pointer">
                <div class="min-w-0 flex-1">
                    <div class="text-base sm:text-lg font-black italic text-white uppercase group-hover:text-yellow-400 truncate leading-snug">
                        ${bIdx + 1} - ${b.nome}
                    </div>
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-1">
                        ${b.cia}
                    </div>
                </div>
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${isE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'}">
                    LADO ${b.lado || 'C'}
                </span>
            </button>`; 
        }
    });

    html += `</div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.assignBull = (riderIdx, bullIdx) => { sorteioData.assignments[riderIdx] = bullIdx; renderStep5(); };

async function saveDrawToEvent() {
    const email = getCurrentUserEmail();
    currentEvent.sorteios = currentEvent.sorteios || [];
    const drawToSave = { day: sorteioData.day, date: new Date().toLocaleString(), riders: sorteioData.riders, bulls: sorteioData.bulls, assignments: sorteioData.assignments };
    const existingIdx = currentEvent.sorteios.findIndex(s => s.day.toUpperCase() === sorteioData.day.toUpperCase());
    if (existingIdx !== -1) currentEvent.sorteios[existingIdx] = drawToSave;
    else currentEvent.sorteios.push(drawToSave);
    await window.persistAndSyncEvent(currentEvent);
}

function askBullName(msg) {
    return new Promise(resolve => {
        const bg = document.createElement('div');
        bg.className = 'fixed inset-0 z-[300] bg-black/95 flex items-center justify-center backdrop-blur-md';
        bg.innerHTML = `
            <div class="bg-slate-900 p-10 rounded-[3rem] max-w-md w-full text-center border-2 border-yellow-500/30 shadow-2xl">
                <div class="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </div>
                <h3 class="text-white font-black uppercase text-2xl mb-6 tracking-tighter">${msg}</h3>
                <input type="text" id="prompt-input" class="w-full bg-black border-2 border-slate-800 rounded-2xl p-6 text-white font-black text-2xl text-center mb-8 outline-none focus:border-yellow-500 transition-all uppercase" placeholder="NOME DO TOURO">
                <div class="flex gap-4">
                    <button id="prompt-cancel" class="flex-1 py-5 bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-black uppercase transition-all">Cancelar</button>
                    <button id="prompt-ok" class="flex-1 py-5 bg-yellow-500 text-black hover:bg-yellow-400 rounded-2xl font-black uppercase transition-all shadow-xl">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(bg);
        const input = document.getElementById('prompt-input');
        input.focus();
        
        document.getElementById('prompt-cancel').onclick = () => { document.body.removeChild(bg); resolve(null); };
        document.getElementById('prompt-ok').onclick = () => { document.body.removeChild(bg); resolve(input.value); };
        input.onkeydown = (e) => { 
            if(e.key === 'Enter') document.getElementById('prompt-ok').click(); 
            if(e.key === 'Escape') document.getElementById('prompt-cancel').click(); 
        };
    });
}

window.triggerReride = async () => {
    console.log("RODEOAPP: Iniciando processo de Re-ride...");
    if (!confirm("Confirmar RE-RIDE? A nota do TOURO será mantida, a do PEÃO será ZERADA e uma nova montaria será gerada.")) return;
    
    try {
        const email = getCurrentUserEmail();
        const day = scoringState.day;
        const sorteioIdx = currentEvent.sorteios.findIndex(s => s.day === day);
        if (sorteioIdx === -1) throw new Error("Sorteio não encontrado.");
        
        const sorteio = currentEvent.sorteios[sorteioIdx];
        const matchupIdx = scoringState.matchupIdx;
        const rider = sorteio.riders[matchupIdx];
        
        // Pegar notas atuais da tela antes de fechar
        const currentBullScore = parseFloat(document.getElementById('score-bull').value) || 0;

        // 1. Marcar notas atuais como substituídas e PRESERVAR nota do touro
        currentEvent.notas = currentEvent.notas || [];
        let notaEncontrada = false;
        currentEvent.notas.forEach(n => {
            if (n.peaoNome === rider.nome && n.dia === day && n.judgeIdx === scoringState.judgeIdx && n.status !== 'substituida') {
                n.status = 'substituida';
                n.riderScore = 0;
                n.bullScore = currentBullScore; // Mantém a nota do touro digitada
                notaEncontrada = true;
            }
        });

        // Se não tinha nota salva ainda, cria a nota substituída com o que está na tela
        if (!notaEncontrada) {
            currentEvent.notas.push({
                peaoNome: rider.nome,
                dia: day,
                judgeIdx: scoringState.judgeIdx,
                riderScore: 0,
                bullScore: currentBullScore,
                status: 'substituida'
            });
        }

        // 2. Criar nova montaria com NOME (RE-RIDE)
        const newRiderName = `${rider.nome} (RE-RIDE)`;
        const newRider = { ...rider, nome: newRiderName, isReride: true, originalName: rider.nome };
        sorteio.riders.push(newRider);
        const newMatchupIdx = sorteio.riders.length - 1;

        // 3. Pedir novo touro usando modal customizado (Electron bloqueia prompt nativo)
        const novoTouroNome = await askBullName(`NOVO TOURO PARA<br><span class="text-yellow-500">${newRiderName}</span>`);
        if (!novoTouroNome || novoTouroNome.trim() === '') {
            alert("RE-RIDE CANCELADO: Nome do touro é obrigatório.");
            sorteio.riders.pop();
            return;
        }

        const newBull = { nome: novoTouroNome.toUpperCase().trim(), cia: 'RE-RIDE' };
        sorteio.bulls.push(newBull);
        sorteio.assignments[newMatchupIdx] = sorteio.bulls.length - 1;

        // 5. Salvar e Atualizar
        currentEvent.sorteios[sorteioIdx] = sorteio;
        await window.persistAndSyncEvent(currentEvent);
        
        alert("RE-RIDE GERADO!\nO card antigo ficou cinza e o novo está no final da lista.");
        closeScoringPopup();
        renderScoringList(day);
    } catch (err) {
        console.error("RODEOAPP: Erro no Re-ride:", err);
    }
};

window.saveScoring = async () => {
    const sorteio = currentEvent.sorteios.find(s => s.day === scoringState.day);
    const r = sorteio.riders[scoringState.matchupIdx];
    
    const nota = {
        peaoNome: r.nome,
        dia: scoringState.day,
        judgeIdx: scoringState.judgeIdx,
        riderScore: parseFloat(document.getElementById('score-rider').value) || 0,
        bullScore: parseFloat(document.getElementById('score-bull').value) || 0,
        fallTime: document.getElementById('fall-time').value,
        status: 'ativa'
    };

    currentEvent.notas = currentEvent.notas || [];
    // Busca nota ativa para este peão/dia/juiz
    const idx = currentEvent.notas.findIndex(n => n.peaoNome === r.nome && n.dia === scoringState.day && n.judgeIdx === scoringState.judgeIdx && n.status !== 'substituida');
    
    if (idx > -1) currentEvent.notas[idx] = nota;
    else currentEvent.notas.push(nota);

    await window.persistAndSyncEvent(currentEvent);
    closeScoringPopup();
    renderScoringList(scoringState.day);
};

function renderStep6() {
    const container = document.getElementById('confrontos-list');
    const theme = currentEvent.themeColor || '#EAB308';
    if (container) container.innerHTML = sorteioData.riders.map((r, rIdx) => {
        const bull = sorteioData.bulls[sorteioData.assignments[rIdx]];
        return `<div class="glass p-6 rounded-2xl border-white/5 flex items-center gap-4"><div class="text-accent font-black italic text-sm w-8">${rIdx + 1}</div><div class="flex-1 font-black uppercase text-white truncate text-sm">${r.nome.split(' ').slice(0, 2).join(' ')}</div><div class="text-slate-600 font-black italic px-2">VS</div><div class="flex-1 font-black uppercase text-accent truncate text-sm">${bull.nome} (${bull.cia})</div></div>`;
    }).join('');
}

// Histórico de Sorteios
window.openSorteiosList = () => {
    _openSorteioDetailIdx = null; // usuário voltou à lista
    const container = document.getElementById('sorteios-table-container');
    const sorteios = currentEvent.sorteios || [];
    if (sorteios.length === 0) { if (container) container.innerHTML = `<div class="col-span-3 p-20 text-center text-slate-500 italic font-bold">Nenhum sorteio realizado ainda.</div>`; }
    else { if (container) container.innerHTML = sorteios.map((s, idx) => `<div onclick="viewDrawDetails(${idx})" class="glass p-8 rounded-[2.5rem] border-white/5 hover:border-yellow-500/50 transition-all group cursor-pointer relative overflow-hidden"><div class="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/5 rounded-full group-hover:scale-150 transition-transform"></div><div class="text-[10px] font-black text-yellow-500 mb-2 uppercase">${s.date}</div><h4 class="text-3xl font-black italic mb-6 uppercase text-white group-hover:text-yellow-500 transition-colors tracking-tighter">${s.day}</h4><div class="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Clique para ver detalhes</div></div>`).join(''); }
    const lv = document.getElementById('list-sorteios-view'); if (lv) lv.classList.remove('hidden');
};

window.viewDrawDetails = (idx) => {
    _openSorteioDetailIdx = idx; // guarda qual detalhe está aberto
    const s = currentEvent.sorteios[idx];
    const container = document.getElementById('sorteios-table-container');
    const deleteBtn = currentSport === 'transmissao' ? '' : `<button onclick="deleteSorteio(${idx})" class="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl hover:bg-red-500 hover:text-white transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`;
    let html = `<div class="col-span-3 animate-in fade-in zoom-in-95 duration-300"><div class="flex items-center justify-between mb-8"><div class="flex items-center gap-4"><button onclick="openSorteiosList()" class="p-3 bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-all"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button><div><h4 class="text-2xl font-black italic uppercase text-yellow-500 tracking-tighter">${s.day}</h4><p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sorteio realizado em ${s.date}</p></div></div><div class="flex gap-4"><button onclick="reExportSorteio(${idx})" class="bg-emerald-600/10 text-emerald-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>EXPORTAR</button>${deleteBtn}</div></div><div class="grid grid-cols-2 gap-4">${s.riders.map((r, rIdx) => { const bull = s.bulls[s.assignments[rIdx]]; return `<div class="glass p-5 rounded-2xl border-white/5 flex items-center justify-between"><div class="flex-1"><div class="text-[9px] font-black text-yellow-500 uppercase tracking-tighter mb-1">Competidor</div><div class="text-sm font-black text-white uppercase">${r.nome}</div></div><div class="px-4 text-slate-700 font-black italic">VS</div><div class="flex-1 text-right"><div class="text-[9px] font-black text-yellow-500 uppercase tracking-tighter mb-1">Touro</div><div class="text-sm font-black text-white uppercase">${bull.nome}</div><div class="text-[8px] font-bold text-slate-500">${bull.cia}</div></div></div>`; }).join('')}</div></div>`;
    if (container) container.innerHTML = html;
};

window.closeSorteiosList = () => { const lv = document.getElementById('list-sorteios-view'); if (lv) lv.classList.add('hidden'); };

window.reExportSorteio = (idx) => { const s = currentEvent.sorteios[idx]; sorteioData = { day: s.day, riders: s.riders, bulls: s.bulls, assignments: s.assignments }; window.exportConfrontos(); };

window.deleteSorteio = async (idx) => { if (confirm("Tem certeza que deseja excluir este sorteio?")) { currentEvent.sorteios.splice(idx, 1); await window.persistAndSyncEvent(currentEvent); openSorteiosList(); } };

// Modais e Listas
window.openModalPeao = (idx = null) => { editingPeaoIdx = idx; const title = document.querySelector('#modal-peao h2'); if (idx !== null) { const p = currentEvent.peoes[idx]; document.getElementById('peao-name').value = p.nome; document.getElementById('peao-city').value = p.cidade; document.getElementById('peao-cpf').value = p.cpf || ''; if (title) title.innerText = "EDITAR PEÃO"; } else { const fp = document.getElementById('form-peao'); if (fp) fp.reset(); if (title) title.innerText = "CADASTRAR PEÃO"; } const mp = document.getElementById('modal-peao'); if (mp) mp.classList.remove('hidden'); };
window.closeModalPeao = () => { const mp = document.getElementById('modal-peao'); if (mp) mp.classList.add('hidden'); };
window.openListPeoes = () => {
    const container = document.getElementById('peoes-table-container'); const peoes = currentEvent.peoes || [];
    if (peoes.length === 0) { if (container) container.innerHTML = `<div class="p-20 text-center text-slate-500 italic font-bold">Nenhum peão cadastrado.</div>`; }
    else {
        let html = `<table class="w-full text-left"><thead class="bg-slate-950/50 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest"><tr><th class="px-3 py-3 sm:px-8 sm:py-6">NOME</th><th class="px-3 py-3 sm:px-8 sm:py-6">CIDADE</th><th class="px-3 py-3 sm:px-8 sm:py-6">PONTOS</th><th class="px-2 py-3 sm:px-8 sm:py-6 text-right">AÇÕES</th></tr></thead><tbody class="divide-y divide-slate-800/50">`;
        peoes.forEach((p, idx) => { 
            const pts = (p.score || 0).toFixed(2);
            const tempo = (p.tempoAcumulado && p.tempoAcumulado > 0 && p.score === 0) ? `<span class="text-[9px] sm:text-[10px] text-slate-500 ml-1">(${p.tempoAcumulado.toFixed(2)}s)</span>` : '';
            html += `<tr class="hover:bg-slate-800/20"><td class="px-3 py-3 sm:px-8 sm:py-6 font-bold text-white uppercase text-xs sm:text-base truncate max-w-[130px] sm:max-w-none">${p.nome}</td><td class="px-3 py-3 sm:px-8 sm:py-6 text-slate-400 font-medium uppercase text-[10px] sm:text-base truncate max-w-[90px] sm:max-w-none">${p.cidade}</td><td class="px-3 py-3 sm:px-8 sm:py-6 font-mono text-[10px] sm:text-sm text-yellow-500 whitespace-nowrap">${pts} ${tempo}</td><td class="px-2 py-3 sm:px-8 sm:py-6 text-right space-x-1 sm:space-x-2 whitespace-nowrap"><button onclick="openModalPeao(${idx})" class="p-1.5 sm:p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20"><svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button><button onclick="deletePeao(${idx})" class="p-1.5 sm:p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"><svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td></tr>`; 
        });
        if (container) container.innerHTML = html + `</tbody></table>`;
    }
    const lp = document.getElementById('list-peoes-view'); if (lp) lp.classList.remove('hidden');
};
window.closeListPeoes = () => { const lp = document.getElementById('list-peoes-view'); if (lp) lp.classList.add('hidden'); };

window.openListBoiadas = () => {
    const container = document.getElementById('boiadas-cards-container'); 
    const boiadas = currentEvent.boiadas || [];
    if (boiadas.length === 0) { 
        if (container) container.innerHTML = `<div class="col-span-3 text-center text-slate-500 italic font-bold">Nenhuma boiada cadastrada no evento.</div>`; 
    } else { 
        if (container) container.innerHTML = boiadas.map((b, idx) => {
            const tourosCount = (b.touros || []).length;
            return `
            <div class="glass p-8 rounded-[2.5rem] relative group border-white/5 flex flex-col justify-between">
                <div class="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onclick="openModalBoiada(${idx})" class="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20" title="Editar Boiada">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button onclick="deleteBoiada(${idx})" class="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20" title="Excluir Boiada">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
                <div>
                    <div class="text-[10px] font-black text-yellow-500 mb-1 uppercase tracking-widest">COMPANHIA DE RODEIO</div>
                    <h4 class="text-2xl font-black italic mb-2 uppercase tracking-tighter text-white">${b.nome}</h4>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">${tourosCount} TOUROS CADASTRADOS</div>
                    <div class="space-y-2 overflow-y-auto max-h-56 pr-2 custom-scroll">
                        ${(b.touros || []).map(t => {
                            const side = (b.lados && b.lados[t]) ? b.lados[t] : 'C';
                            const isE = side === 'E';
                            return `
                            <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-[10px] font-bold text-slate-300 uppercase tracking-tighter flex items-center justify-between gap-2 hover:border-slate-700 transition-all">
                                <span class="truncate font-black text-white">${t}</span>
                                <button type="button" onclick="toggleBullSide(${idx}, '${t.replace(/'/g, "\\'")}')" class="px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${isE ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30'}" title="Clique para alternar o lado deste touro">
                                    <span class="w-1.5 h-1.5 rounded-full ${isE ? 'bg-emerald-400' : 'bg-yellow-400'}"></span>
                                    ${isE ? 'E (ERRADO)' : 'C (CERTO)'}
                                </button>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
        }).join(''); 
    }
    const lb = document.getElementById('list-boiadas-view'); 
    if (lb) lb.classList.remove('hidden'); 
};

window.closeListBoiadas = () => { 
    const lb = document.getElementById('list-boiadas-view'); 
    if (lb) lb.classList.add('hidden'); 
};

// --- CADASTRO EM MASSA (PEÕES) ---
window.openModalBulkPeoes = () => {
    const modal = document.getElementById('modal-bulk-peoes');
    if (modal) modal.classList.remove('hidden');
    const n = document.getElementById('bulk-peao-names'); if (n) n.value = '';
    const c = document.getElementById('bulk-peao-cities'); if (c) c.value = '';
    const cp = document.getElementById('bulk-peao-cpfs'); if (cp) cp.value = '';
};

window.closeModalBulkPeoes = () => {
    const modal = document.getElementById('modal-bulk-peoes');
    if (modal) modal.classList.add('hidden');
};

window.saveBulkPeoes = async () => {
    const names = (document.getElementById('bulk-peao-names')?.value || '').split('\n').filter(l => l.trim() !== '');
    const cities = (document.getElementById('bulk-peao-cities')?.value || '').split('\n');
    const cpfs = (document.getElementById('bulk-peao-cpfs')?.value || '').split('\n');

    if (names.length === 0) return alert("Insira ao menos os nomes dos peões!");

    const newPeoes = names.map((name, i) => ({
        nome: name.trim().toUpperCase(),
        cidade: (cities[i] || '').trim().toUpperCase() || '---',
        cpf: (cpfs[i] || '').trim(),
        score: 0
    }));

    currentEvent.peoes = [...(currentEvent.peoes || []), ...newPeoes];
    await window.persistAndSyncEvent(currentEvent);
    
    closeModalBulkPeoes();
    closeModalPeao();
    openListPeoes();
    alert(`${newPeoes.length} peões cadastrados com sucesso!`);
};

window.toggleBullSide = async (boiadaIdx, bullName) => {
    if (!currentEvent || !currentEvent.boiadas || !currentEvent.boiadas[boiadaIdx]) return;
    const b = currentEvent.boiadas[boiadaIdx];
    b.lados = b.lados || {};
    const currentSide = b.lados[bullName] || 'C';
    const newSide = currentSide === 'E' ? 'C' : 'E';
    b.lados[bullName] = newSide;

    await window.persistAndSyncEvent(currentEvent);
    const email = getCurrentUserEmail();
    if (email && window.electronAPI?.saveGlobalBoiada) {
        await window.electronAPI.saveGlobalBoiada(email, b);
    }
    openListBoiadas();
};

window.openModalBoiada = (idx = null) => { 
    editingBoiadaIdx = (idx !== null && idx !== undefined) ? parseInt(idx) : null; 
    const title = document.querySelector('#modal-boiada h2'); 
    const inputCia = document.getElementById('boiada-cia');
    const inputCerto = document.getElementById('touros-certo');
    const inputErrado = document.getElementById('touros-errado');

    if (editingBoiadaIdx !== null && currentEvent && currentEvent.boiadas && currentEvent.boiadas[editingBoiadaIdx]) { 
        const b = currentEvent.boiadas[editingBoiadaIdx]; 
        if (inputCia) inputCia.value = b.nome || '';
        
        const certoList = [];
        const erradoList = [];
        (b.touros || []).forEach(t => {
            if (b.lados && b.lados[t] === 'E') {
                erradoList.push(t);
            } else {
                certoList.push(t);
            }
        });

        if (inputCerto) inputCerto.value = certoList.join('\n');
        if (inputErrado) inputErrado.value = erradoList.join('\n');
        if (title) title.innerText = "EDITAR BOIADA"; 
    } else { 
        editingBoiadaIdx = null;
        const fb = document.getElementById('form-boiada'); 
        if (fb) fb.reset(); 
        if (inputCia) inputCia.value = '';
        if (inputCerto) inputCerto.value = ''; 
        if (inputErrado) inputErrado.value = ''; 
        if (title) title.innerText = "CADASTRAR BOIADA (CIA)"; 
    } 
    const mb = document.getElementById('modal-boiada'); 
    if (mb) mb.classList.remove('hidden'); 
    setTimeout(() => document.getElementById('boiada-cia')?.focus(), 50); 
};
window.closeModalBoiada = () => { 
    const mb = document.getElementById('modal-boiada'); 
    if (mb) mb.classList.add('hidden'); 
    editingBoiadaIdx = null;
};

window.deletePeao = async (idx) => { if (confirm('Excluir este peão?')) { currentEvent.peoes.splice(idx, 1); await window.persistAndSyncEvent(currentEvent); openListPeoes(); } };
window.deleteBoiada = async (idx) => { if (confirm('Excluir esta boiada?')) { currentEvent.boiadas.splice(idx, 1); await window.persistAndSyncEvent(currentEvent); openListBoiadas(); } };

let editingJuizIdx = null;

window.toggleJuizSenhaVisibility = () => {
    const input = document.getElementById('juiz-senha');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
};

window.openListJuizes = () => {
    document.getElementById('list-juizes-title').innerText = "JUÍZES CADASTRADOS";
    const tbody = document.getElementById('list-juizes-tbody');
    if (!tbody) return;
    
    if (currentEvent && currentEvent.juizes && currentEvent.juizes.length > 0) {
        tbody.innerHTML = currentEvent.juizes.map((j, idx) => {
            const jNome = typeof j === 'string' ? j : (j.nome || 'JUIZ');
            const hasSenha = typeof j === 'object' && j.senha && String(j.senha).trim().length > 0;
            const senhaBadge = hasSenha 
                ? `<span class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold shadow-sm"><svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Senha: ••••</span>`
                : `<span class="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">Sem Senha</span>`;

            return `
                <tr class="hover:bg-slate-800/20 border-b border-slate-800/40">
                    <td class="px-8 py-5">
                        <div class="font-bold text-white uppercase text-base flex items-center gap-3">
                            <span>${jNome}</span>
                            ${senhaBadge}
                        </div>
                        <div class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Juiz ${idx + 1} • Acesso Web Juiz (juiz.rodeoapp.pro)</div>
                    </td>
                    <td class="px-8 py-5 text-right space-x-2">
                        <button onclick="openModalJuiz(${idx})" class="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500/20 transition-all active:scale-95" title="Editar Juiz e Senha">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button onclick="deleteJuiz(${idx})" class="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all active:scale-95" title="Excluir Juiz">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    } else {
        tbody.innerHTML = '';
    }
    document.getElementById('modal-list-juizes').classList.remove('hidden');
};

window.openModalJuiz = (idx = null) => {
    editingJuizIdx = idx;
    const titleEl = document.getElementById('modal-juiz-title') || document.querySelector('#modal-juiz h2');
    const senhaInput = document.getElementById('juiz-senha');
    if (senhaInput) senhaInput.type = 'password';

    if (idx !== null) {
        const j = currentEvent.juizes[idx];
        document.getElementById('juiz-nome').value = typeof j === 'string' ? j : (j.nome || '');
        if (senhaInput) senhaInput.value = typeof j === 'object' ? (j.senha || '') : '';
        if (titleEl) titleEl.innerText = "EDITAR JUIZ";
    } else {
        document.getElementById('juiz-nome').value = '';
        if (senhaInput) senhaInput.value = '';
        if (titleEl) titleEl.innerText = "CADASTRAR JUIZ";
    }
    document.getElementById('modal-juiz').classList.remove('hidden');
    setTimeout(() => document.getElementById('juiz-nome')?.focus(), 50);
};

window.saveJuiz = async (e) => {
    e.preventDefault();
    const nome = document.getElementById('juiz-nome').value.trim().toUpperCase();
    const senha = (document.getElementById('juiz-senha')?.value || '').trim();
    if (!nome) return;
    
    currentEvent.juizes = currentEvent.juizes || [];
    
    const juizObj = { nome, senha };
    
    if (editingJuizIdx !== null) {
        currentEvent.juizes[editingJuizIdx] = juizObj;
    } else {
        currentEvent.juizes.push(juizObj);
    }
    
    document.getElementById('modal-juiz').classList.add('hidden');
    openListJuizes();
    await window.persistAndSyncEvent(currentEvent);
};

window.deleteJuiz = async (idx) => {
    if (confirm("Excluir este Juiz?")) {
        currentEvent.juizes.splice(idx, 1);
        openListJuizes();
        await window.persistAndSyncEvent(currentEvent);
    }
};

// ==========================================
// ABLY REALTIME INTEGRATION (ADMIN RECEIVER)
// ==========================================
let ablyRealtimeClient = null;
let currentAblyChannel = null;
const DEFAULT_ABLY_KEY = 'ZpXrAw.0ShBdA:PN-cy5nGO2hVtllKkQIQppoPtl4FGufzq58uT9WHXts'; // Chave oficial Ably Realtime

window.initAblyRealtimeForEvent = (shareId) => {
    if (!shareId) return;
    if (typeof Ably === 'undefined') {
        console.warn("Ably Realtime SDK ainda não carregado.");
        return;
    }

    try {
        if (currentAblyChannel && currentAblyChannel.name === `rodeoapp-event-${shareId}`) {
            return; // Já conectado no canal correto
        }

        window.closeAblyRealtime();

        const ablyKey = localStorage.getItem('RODEOAPP_ABLY_KEY') || DEFAULT_ABLY_KEY;
        ablyRealtimeClient = new Ably.Realtime({ key: ablyKey, clientId: `admin-${Date.now()}` });

        const channelName = `rodeoapp-event-${shareId}`;
        currentAblyChannel = ablyRealtimeClient.channels.get(channelName);

        // Status de conexão do Ably
        ablyRealtimeClient.connection.on('connected', () => {
            console.log(`[ABLY REALTIME] Conectado com sucesso ao canal ${channelName}`);
            updateAblyStatusIndicator('connected');
        });

        ablyRealtimeClient.connection.on('disconnected', () => {
            console.warn(`[ABLY REALTIME] Desconectado do Ably.`);
            updateAblyStatusIndicator('disconnected');
        });

        ablyRealtimeClient.connection.on('failed', (err) => {
            console.error(`[ABLY REALTIME] Falha na conexão:`, err);
            updateAblyStatusIndicator('failed');
        });

        // Escutar notas enviadas pelos juízes
        currentAblyChannel.subscribe('judge-score-submitted', async (message) => {
            console.log('[ABLY REALTIME] Nota recebida do Juiz:', message.data);
            await handleJudgeScoreReceived(message.data);
        });

    } catch (err) {
        console.error("Erro ao inicializar Ably Realtime:", err);
    }
};

window.closeAblyRealtime = () => {
    try {
        if (currentAblyChannel) {
            currentAblyChannel.unsubscribe();
            currentAblyChannel = null;
        }
        if (ablyRealtimeClient) {
            ablyRealtimeClient.close();
            ablyRealtimeClient = null;
        }
        updateAblyStatusIndicator('closed');
    } catch(e) {
        console.warn("Erro ao fechar Ably:", e);
    }
};

function updateAblyStatusIndicator(status) {
    const dot = document.getElementById('ably-sync-dot');
    const text = document.getElementById('ably-sync-text');
    if (!dot || !text) return;

    if (status === 'connected') {
        dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse";
        text.innerText = "ABLY REALTIME: ATIVO";
        text.className = "text-[9px] font-black uppercase tracking-widest text-emerald-400";
    } else if (status === 'disconnected' || status === 'closed') {
        dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500";
        text.innerText = "ABLY: DESCONECTADO";
        text.className = "text-[9px] font-black uppercase tracking-widest text-amber-400";
    } else {
        dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
        text.innerText = "ABLY: OFF";
        text.className = "text-[9px] font-black uppercase tracking-widest text-red-400";
    }
}

async function handleJudgeScoreReceived(scoreData) {
    if (!currentEvent || !scoreData) return;

    const { day, riderName, bullName, judgeName, judgeIdx, riderScore, bullScore, isFall, fallTime, isReride } = scoreData;

    currentEvent.notas = currentEvent.notas || [];
    
    const rScore = parseFloat(riderScore) || 0;
    const bScore = parseFloat(bullScore) || 0;
    const jIdx = parseInt(judgeIdx) || 0;
    const isQueda = Boolean(isFall) || (rScore === 0);

    // 1. Procura registro de nota consolidada para este competidor neste dia
    let consolidatedNota = currentEvent.notas.find(n => 
        (n.peao === riderName || n.peaoNome === riderName) && 
        n.dia === day && 
        n.status !== 'substituida'
    );

    if (!consolidatedNota) {
        consolidatedNota = {
            id: crypto.randomUUID(),
            dia: day,
            peao: riderName,
            peaoNome: riderName,
            touro: bullName,
            isReride: Boolean(isReride),
            tempo: isQueda ? 0.00 : 8.00,
            j1_touro: 0, j1_peao: 0,
            j2_touro: 0, j2_peao: 0,
            j3_touro: 0, j3_peao: 0,
            totalPeao: 0,
            totalTouro: 0,
            totalGeral: 0,
            status: isReride ? 're_ride' : 'ativa',
            juizes_status: {},
            updatedAt: new Date().toISOString()
        };
        currentEvent.notas.push(consolidatedNota);
    }

    // 2. Atualiza a nota do juiz correspondente
    if (jIdx === 0) {
        consolidatedNota.j1_touro = bScore;
        consolidatedNota.j1_peao = isQueda ? 0 : rScore;
    } else if (jIdx === 1) {
        consolidatedNota.j2_touro = bScore;
        consolidatedNota.j2_peao = isQueda ? 0 : rScore;
    } else if (jIdx === 2) {
        consolidatedNota.j3_touro = bScore;
        consolidatedNota.j3_peao = isQueda ? 0 : rScore;
    }

    // Grava metadado do juiz
    consolidatedNota.juizes_status = consolidatedNota.juizes_status || {};
    consolidatedNota.juizes_status[jIdx] = {
        nome: judgeName || `JUIZ ${jIdx + 1}`,
        touro: bScore,
        peao: rScore,
        isFall: isQueda,
        enviado: true,
        timestamp: Date.now()
    };

    // Regra do tempo: se qualquer juiz der nota de peão > 0, assume 8 segundos; se peão for 0, fica 0.00 (queda)
    const hasPeaoScore = (consolidatedNota.j1_peao > 0 || consolidatedNota.j2_peao > 0 || consolidatedNota.j3_peao > 0);
    consolidatedNota.tempo = hasPeaoScore ? 8.00 : 0.00;

    // Recalcula totais
    consolidatedNota.totalTouro = (consolidatedNota.j1_touro || 0) + (consolidatedNota.j2_touro || 0) + (consolidatedNota.j3_touro || 0);
    consolidatedNota.totalPeao = (consolidatedNota.j1_peao || 0) + (consolidatedNota.j2_peao || 0) + (consolidatedNota.j3_peao || 0);
    consolidatedNota.totalGeral = consolidatedNota.totalTouro + consolidatedNota.totalPeao;
    consolidatedNota.updatedAt = new Date().toISOString();

    // 3. Persiste no arquivo local e na nuvem
    await window.persistAndSyncEvent(currentEvent);

    // 4. Atualiza a tela de notas se estiver aberta
    const viewNotasList = document.getElementById('view-notas-list');
    if (viewNotasList && !viewNotasList.classList.contains('hidden')) {
        renderNotasCards();
    }

    // 5. Exibe notificação toast em tempo real para o Administrador
    showJudgeScoreToast({
        judgeName: judgeName || `JUIZ ${jIdx + 1}`,
        riderName,
        bullName,
        rScore: isQueda ? 0 : rScore,
        bScore,
        total: (isQueda ? 0 : rScore) + bScore,
        isFall: isQueda,
        totalGeral: consolidatedNota.totalGeral,
        juizesCount: Object.keys(consolidatedNota.juizes_status || {}).length
    });
}

function showJudgeScoreToast(data) {
    const existing = document.getElementById('realtime-score-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'realtime-score-toast';
    toast.className = "fixed top-6 right-6 z-[9999] bg-slate-900/95 border-2 border-yellow-500 p-5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start gap-4 transform transition-all duration-300 translate-y-0 text-left max-w-lg min-w-[300px] animate-bounce";
    
    toast.innerHTML = `
        <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-4 mb-2">
                <span class="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 whitespace-nowrap">Nota Recebida • Realtime</span>
                <span class="text-[10px] font-mono text-slate-400 whitespace-nowrap">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="text-sm font-black text-white uppercase leading-tight mb-2 break-words">
                ${data.judgeName} AVALIOU ${data.riderName}
            </div>
            <div class="text-[11px] font-bold text-slate-400 uppercase mb-2">
                ${data.isFall ? '<span class="text-red-400">QUEDA (0.00)</span>' : `Deste juiz: Peão <span class="text-white">${data.rScore.toFixed(2)}</span> + Touro <span class="text-yellow-400">${data.bScore.toFixed(2)}</span> = ${data.total.toFixed(2)}`}
            </div>
            <div class="text-sm font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg inline-block w-full text-center">
                NOTA SOMADA (${data.juizesCount} JUIZ${data.juizesCount > 1 ? 'ES' : ''}): ${data.totalGeral.toFixed(2)} PTS
            </div>
        </div>
        <button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-white font-bold p-1 flex-shrink-0 -mt-1 -mr-2">✕</button>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}

// --- SISTEMA DE CORES DINÂMICAS ---
function applyThemeColor(color) {
    if (!color) color = '#EAB308';
    console.log("RODEOAPP: Aplicando cor do tema:", color);
    document.documentElement.style.setProperty('--event-accent', color);
    const rgb = hexToRgb(color);
    if (rgb) document.documentElement.style.setProperty('--event-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function extractDominantColor(imgElement) {
    try {
        if (!imgElement || imgElement.naturalWidth === 0) return '#EAB308';
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Reduzir para processar mais rápido e pegar a cor média melhor
        canvas.width = 50; 
        canvas.height = 50;
        ctx.drawImage(imgElement, 0, 0, 50, 50);
        
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha < 128) continue; // Pular transparente

            const currR = data[i];
            const currG = data[i+1];
            const currB = data[i+2];

            // Pular tons muito escuros (quase preto) ou muito claros (quase branco)
            const brightness = (currR * 299 + currG * 587 + currB * 114) / 1000;
            if (brightness < 30 || brightness > 240) continue;

            r += currR; g += currG; b += currB;
            count++;
        }

        if (count === 0) return '#EAB308';
        r = Math.floor(r / count); g = Math.floor(g / count); b = Math.floor(b / count);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch (e) {
        console.error("Erro na extração de cor:", e);
        return '#EAB308';
    }
}

// Inicialização segura
window.addEventListener('DOMContentLoaded', () => {
    // ... mapeamento anterior ...
    const logoInput = document.getElementById('event-logo-input');
    const previewImg = document.getElementById('logo-preview-img');
    const previewContainer = document.getElementById('logo-preview-container');

    if (logoInput) {
        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImg.src = event.target.result;
                    previewImg.classList.remove('hidden');
                    if (previewContainer) previewContainer.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Inicializar elementos do modal evento
    modalEvento = document.getElementById('modal-evento');
    formEvento = document.getElementById('form-evento');


    init();
});



// --- FUNÇÕES GLOBAIS (Visíveis para o HTML) ---
window.confirmLogout = () => { 
    if (confirm("Deseja realmente sair do sistema?")) logout(); 
};


window.closeModalEvento = () => { if (modalEvento) modalEvento.classList.add('hidden'); };

window.closeTab = () => { 
    const cv = document.getElementById('content-view'); 
    if (cv) cv.classList.add('hidden'); 
    toggleSupportBtn(true);
};

window.closeEventControl = () => { 
    if (eventControlView) eventControlView.classList.add('hidden'); 
    toggleSupportBtn(true);
    applyThemeColor('#EAB308'); // Volta para o Dourado RODEOAPP
    
    window.hideAllModalsAndViews();
    
    if (currentSport === 'transmissao') {
        if (transmissaoScreen) transmissaoScreen.classList.remove('hidden');
        const modalTrans = document.getElementById('modal-transmissao-eventos');
        if (modalTrans) modalTrans.classList.remove('hidden');
    } else {
        if (homeScreen) homeScreen.classList.remove('hidden');
    }
};

function logout(message) {
    if (message) alert(message); 
    window.electronAPI.clearAuth();
    clearInterval(heartbeatInterval); 
    clearInterval(offlineCheckInterval);
    showLogin();
}

init();

// --- CADASTRO EM MASSA (PEÕES) ---
window.openModalBulkPeoes = () => {
    document.getElementById('modal-bulk-peoes').classList.remove('hidden');
    document.getElementById('bulk-peao-names').value = '';
    document.getElementById('bulk-peao-cities').value = '';
    document.getElementById('bulk-peao-cpfs').value = '';
};

window.closeModalBulkPeoes = () => {
    document.getElementById('modal-bulk-peoes').classList.add('hidden');
};

window.saveBulkPeoes = async () => {
    const rawNames = document.getElementById('bulk-peao-names').value.split('\n');
    const rawCities = document.getElementById('bulk-peao-cities').value.split('\n');
    const rawCpfs = document.getElementById('bulk-peao-cpfs').value.split('\n');

    // Filtramos os nomes primeiro para saber quantos peões REAIS temos
    const names = rawNames.map(n => n.trim()).filter(n => n !== '');
    
    if (names.length === 0) return alert("Insira ao menos os nomes dos peões!");

    // Criamos os objetos apenas para as linhas que têm nome
    const newPeoes = [];
    let nameIdx = 0;
    
    // Percorremos a lista original de nomes para manter a sincronia com as outras caixas
    rawNames.forEach((name, i) => {
        const trimmedName = name.trim();
        if (trimmedName !== '') {
            newPeoes.push({
                nome: trimmedName.toUpperCase(),
                cidade: (rawCities[i] || '').trim().toUpperCase() || '---',
                cpf: (rawCpfs[i] || '').trim(),
                score: 0
            });
        }
    });

    currentEvent.peoes = [...(currentEvent.peoes || []), ...newPeoes];
    await window.electronAPI.updateLocalEvent(getCurrentUserEmail(), currentEvent);
    
    closeModalBulkPeoes();
    closeModalPeao();
    openListPeoes();
    alert(`${newPeoes.length} peões cadastrados com sucesso! (Linhas vazias foram ignoradas)`);
};

// AUTOCOMPLETE LOGIC
function setupAutocomplete(inputId, listId, getDataFn, onSelectCallback, displayKey) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;

    input.addEventListener('input', () => {
        const val = input.value.toUpperCase();
        if (!val) {
            list.classList.add('hidden');
            return;
        }

        const dataArray = getDataFn() || [];
        const matches = dataArray.filter(item => {
            if (typeof item === 'string') return item.toUpperCase().includes(val);
            if (item.cpf && item.cpf.includes(val)) return true;
            return item[displayKey] && item[displayKey].toUpperCase().includes(val);
        });

        if (matches.length === 0) {
            list.classList.add('hidden');
            return;
        }

        list.innerHTML = '';
        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = "px-6 py-4 border-b border-slate-800 text-white font-bold cursor-pointer hover:bg-slate-800 transition-all text-xs";
            
            if (displayKey === 'nome' && item.cidade) {
                div.innerHTML = `<span class="uppercase">${item.nome}</span> <span class="text-[10px] text-slate-500 ml-2">(${item.cidade})</span>`;
            } else if (displayKey === 'nome' && item.touros) {
                div.innerHTML = `<span class="uppercase">${item.nome}</span> <span class="text-[10px] text-slate-500 ml-2">(${item.touros.length} touros)</span>`;
            } else {
                div.innerText = item[displayKey] || item;
            }

            div.addEventListener('click', () => {
                input.value = item[displayKey] || item;
                list.classList.add('hidden');
                if (onSelectCallback) onSelectCallback(item);
            });
            list.appendChild(div);
        });
        list.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input && !list.contains(e.target)) {
            list.classList.add('hidden');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    setupAutocomplete('peao-name', 'peao-autocomplete-list', () => globalPeoes, (item) => {
        document.getElementById('peao-city').value = item.cidade || '';
        document.getElementById('peao-cpf').value = item.cpf || '';
    }, 'nome');

    setupAutocomplete('boiada-cia', 'boiada-autocomplete-list', () => globalBoiadas, (item) => {
        document.getElementById('touros-bulk').value = (item.touros || []).join('\n');
    }, 'nome');
});

// Handlers Extras
document.getElementById('form-peao').addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    const email = getCurrentUserEmail(); 
    const peao = { 
        nome: document.getElementById('peao-name').value.toUpperCase().trim(), 
        cidade: document.getElementById('peao-city').value.toUpperCase().trim(), 
        cpf: document.getElementById('peao-cpf').value.trim(), 
        score: 0 
    }; 
    if (!peao.nome) return;
    currentEvent.peoes = currentEvent.peoes || []; 
    if (editingPeaoIdx !== null) { 
        peao.score = currentEvent.peoes[editingPeaoIdx].score || 0; 
        currentEvent.peoes[editingPeaoIdx] = peao; 
    } else currentEvent.peoes.push(peao); 
    await window.persistAndSyncEvent(currentEvent); 
    await window.electronAPI.saveGlobalPeao(email, peao);
    fetchGlobalData();
    closeModalPeao(); 
    if (editingPeaoIdx !== null) openListPeoes(); 
});

document.getElementById('form-boiada').addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    const email = getCurrentUserEmail(); 
    const nome = document.getElementById('boiada-cia').value.trim().toUpperCase();
    if (!nome) return;

    const inputCerto = document.getElementById('touros-certo');
    const inputErrado = document.getElementById('touros-errado');

    const tourosCerto = inputCerto ? inputCerto.value.split('\n').map(t => t.trim().toUpperCase()).filter(t => t !== '') : [];
    const tourosErrado = inputErrado ? inputErrado.value.split('\n').map(t => t.trim().toUpperCase()).filter(t => t !== '') : [];

    const allTouros = [...tourosCerto, ...tourosErrado];
    if (allTouros.length === 0) {
        return alert("Insira ao menos um touro no Lado Certo ou no Lado Errado!");
    }
    
    const lados = {};
    tourosCerto.forEach(t => lados[t] = 'C');
    tourosErrado.forEach(t => lados[t] = 'E');

    const cia = { nome, touros: allTouros, lados };
    currentEvent.boiadas = currentEvent.boiadas || []; 
    if (editingBoiadaIdx !== null) {
        currentEvent.boiadas[editingBoiadaIdx] = cia;
    } else {
        currentEvent.boiadas.push(cia); 
    }
    await window.persistAndSyncEvent(currentEvent); 
    await window.electronAPI.saveGlobalBoiada(email, cia);
    fetchGlobalData();
    closeModalBoiada(); 
    openListBoiadas(); 
    alert(`Boiada ${nome} salva com sucesso! (${tourosCerto.length} Lado Certo / ${tourosErrado.length} Lado Errado)`);
});

// Ranking
window.openRankingView = () => {
    const filters = document.getElementById('ranking-filters'); 
    if (filters) {
        let html = `<button onclick="renderRanking('geral')" class="rank-filter-btn active px-6 py-2 rounded-xl text-xs font-black uppercase transition-all">Geral</button>`;
        const daysList = getEventDaysList();
        daysList.forEach(day => {
            html += `<button onclick="renderRanking('${day}')" class="rank-filter-btn px-6 py-2 rounded-xl text-xs font-black uppercase transition-all">${day.replace(/DIA/gi, "ROUND")}</button>`;
        });
        filters.innerHTML = html;
        document.querySelectorAll('.rank-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.rank-filter-btn').forEach(b => b.classList.remove('active', 'bg-yellow-500', 'text-black'));
                this.classList.add('active', 'bg-yellow-500', 'text-black');
            });
        });
    }
    const rv = document.getElementById('ranking-view'); if (rv) rv.classList.remove('hidden');
    renderRanking('geral');
};
window.closeRankingView = () => { const rv = document.getElementById('ranking-view'); if (rv) rv.classList.add('hidden'); };
window.renderRanking = (filter = 'geral') => {
    const container = document.getElementById('ranking-table-container'); 
    const peoes = [...(currentEvent.peoes || [])]; 
    const notas = (currentEvent.notas || []).filter(n => n.status === 'ativa');

    const rankingData = peoes.map(p => {
        let totalPoints = 0; 
        let tempoAcumulado = 0;
        
        const peaoNotas = notas.filter(n => n.peao === p.nome && (filter === 'geral' || n.dia === filter));
        
        peaoNotas.forEach(curr => {
            if (curr.totalPeao === 0 || curr.tempo < 8.00) {
                tempoAcumulado += curr.tempo;
            } else {
                totalPoints += (curr.totalPeao + curr.totalTouro);
                tempoAcumulado += curr.tempo;
            }
        });
        
        return { ...p, totalPoints, tempoAcumulado };
    });
    const hasScores = rankingData.some(p => p.totalPoints > 0 || p.tempoAcumulado > 0);
    
    if (hasScores) {
        rankingData.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return b.tempoAcumulado - a.tempoAcumulado;
        });
    } else {
        rankingData.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    
    if (rankingData.length === 0) { if (container) container.innerHTML = `<div class="p-20 text-center text-slate-500 italic font-bold">Nenhum competidor cadastrado.</div>`; return; }
    let html = `<table class="w-full text-left border-collapse"><thead class="bg-slate-950/50 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest"><tr><th class="px-3 py-3 sm:px-8 sm:py-6 w-12 sm:w-20">POS</th><th class="px-3 py-3 sm:px-8 sm:py-6">COMPETIDOR</th><th class="px-3 py-3 sm:px-8 sm:py-6">CIDADE</th><th class="px-3 py-3 sm:px-8 sm:py-6 text-right">PONTOS</th></tr></thead><tbody class="divide-y divide-slate-800/50">`;
    rankingData.forEach((p, idx) => {
        const pos = hasScores ? `${idx + 1}º` : '---'; const isPodium = hasScores && idx < 3;
        const rowClass = isPodium ? (idx === 0 ? 'bg-yellow-500/5' : 'bg-slate-800/10') : 'hover:bg-slate-800/20';
        const posClass = idx === 0 ? 'text-yellow-500 font-black' : (idx < 3 ? 'text-white font-black' : 'text-slate-500 font-bold');
        html += `<tr class="${rowClass} transition-colors"><td class="px-3 py-3 sm:px-8 sm:py-6 ${posClass} italic text-sm sm:text-xl">${pos}</td><td class="px-3 py-3 sm:px-8 sm:py-6"><div class="font-black text-white uppercase text-xs sm:text-lg tracking-tighter truncate max-w-[140px] sm:max-w-none">${p.nome}</div></td><td class="px-3 py-3 sm:px-8 sm:py-6 text-slate-500 font-bold uppercase text-[10px] sm:text-xs truncate max-w-[100px] sm:max-w-none">${p.cidade}</td><td class="px-3 py-3 sm:px-8 sm:py-6 text-right"><div class="text-sm sm:text-2xl font-black italic ${p.totalPoints > 0 ? 'text-yellow-500' : 'text-slate-700'}">${p.totalPoints.toFixed(2)}</div></td></tr>`;
    });
    if (container) container.innerHTML = html + `</tbody></table>`;
};



// ==========================================
// ORDEM DE EMBRETAMENTO (DRAG & DROP)
// ==========================================
let currentOrdemDay = '';
let currentOrdemType = 'manual';

window.openOrdemDaySelection = (type = 'manual') => {
    currentOrdemType = type;
    if (!currentEvent || !currentEvent.sorteios || currentEvent.sorteios.length === 0) {
        return alert("Não há sorteios salvos para gerar Ordem de Embretamento!");
    }
    const container = document.getElementById('ordem-days-container');
    
    const daysList = getEventDaysList();
    let html = '';
    daysList.forEach(day => {
        html += `<button onclick="selectOrdemDay('${day}')" class="bg-slate-950 border border-slate-800 py-6 rounded-2xl font-black text-white hover:border-emerald-500 hover:text-emerald-500 transition-all">${day.replace(/DIA/gi, "ROUND")}</button>`;
    });
    
    container.innerHTML = html;
    document.getElementById('modal-ordem-days').classList.remove('hidden');
};

window.selectOrdemDay = (day) => {
    const salvos = currentEvent.sorteios.filter(s => s.day.toUpperCase() === day.toUpperCase());
    if (salvos.length === 0) return alert(`Não há sorteio salvo para o ${day}!`);
    if (salvos.length > 1) return alert(`Existem ${salvos.length} sorteios para o ${day}! Vá no Histórico de Sorteios e apague os errados/antigos antes de gerar a Ordem.`);
    
    currentOrdemDay = day;
    sorteioData = salvos[0]; // Load it
    
    if (currentOrdemType === 'smart') {
        initSmartOrdem();
    } else {
        renderManualOrdem();
    }
};

function renderManualOrdem() {
    const container = document.getElementById('ordem-list-container');
    let html = '';
    sorteioData.riders.forEach((r, idx) => {
        const bullIdx = sorteioData.assignments[idx];
        const bull = sorteioData.bulls[bullIdx];
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const cia = currentEvent.boiadas.find(c => c.nome === bull.cia);
            if (bull.lado) lado = bull.lado; else if (cia && cia.lados && cia.lados[bull.nome]) lado = cia.lados[bull.nome];
        }
        
        html += `
        <div class="ordem-card bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-4 cursor-move hover:border-emerald-500 transition-all" draggable="true" data-original-index="${idx}">
            <div class="text-emerald-500 cursor-move"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></div>
            <div class="flex-1">
                <div class="font-black text-white text-lg uppercase">${r.nome}</div>
                <div class="text-xs font-bold text-slate-500 uppercase">${r.cidade}</div>
            </div>
            <div class="flex-1 text-right">
                <div class="font-black text-yellow-500 text-lg uppercase">${bull.nome} ${lado ? `(${window.formatSide(lado)})` : ``}</div>
                <div class="text-xs font-bold text-slate-500 uppercase">${bull.cia}</div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
    
    let draggedItem = null;
    const cards = document.querySelectorAll('.ordem-card');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', function() {
            draggedItem = card;
            setTimeout(() => card.style.opacity = '0.4', 0);
        });
        card.addEventListener('dragend', function() {
            setTimeout(() => {
                draggedItem.style.opacity = '1';
                draggedItem = null;
            }, 0);
        });
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        });
    });
    
    document.getElementById('modal-ordem-days').classList.add('hidden');
    document.getElementById('modal-ordem-dragdrop').classList.remove('hidden');
}

let smartOrderState = {
    remainingCias: [],
    orderedRides: []
};

function initSmartOrdem() {
    smartOrderState.orderedRides = [];
    const ciasMap = {};
    
    sorteioData.riders.forEach((r, idx) => {
        const b = sorteioData.bulls[sorteioData.assignments[idx]];
        const cia = b.cia || 'SEM CIA';
        if (!ciasMap[cia]) ciasMap[cia] = [];
        ciasMap[cia].push(idx);
    });
    
    smartOrderState.remainingCias = Object.keys(ciasMap).map(ciaName => ({
        name: ciaName,
        rides: ciasMap[ciaName]
    }));
    
    renderSmartOrdem();
    document.getElementById('modal-ordem-days').classList.add('hidden');
    document.getElementById('modal-ordem-smart').classList.remove('hidden');
}

window.resetSmartOrdem = () => { initSmartOrdem(); };

function renderSmartOrdem() {
    const leftContainer = document.getElementById('smart-cias-list');
    leftContainer.innerHTML = smartOrderState.remainingCias.map(ciaObj => {
        if (ciaObj.rides.length === 0) return ''; // Hide empty Cias
        
        let ridesHtml = ciaObj.rides.map(idx => {
            const r = sorteioData.riders[idx];
            const bull = sorteioData.bulls[sorteioData.assignments[idx]];
            let peaoAcum = "0,00";
            if (currentEvent && currentEvent.peoes) {
                const peao = currentEvent.peoes.find(p => p.nome === r.nome);
                if (peao && peao.score) peaoAcum = peao.score.toFixed(2).replace('.', ',');
            }
            let lado = '';
            if (currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === bull.cia);
                if (bull.lado) lado = bull.lado; else if (cia && cia.lados && cia.lados[bull.nome]) lado = cia.lados[bull.nome];
            }
            let ladoBadge = '';
            if (lado) {
                const l = lado.toUpperCase();
                if (l === 'C') ladoBadge = `<span class="text-emerald-500 font-black ml-1">(C)</span>`;
                else if (l === 'E') ladoBadge = `<span class="text-red-500 font-black ml-1">(E)</span>`;
                else ladoBadge = `<span class="text-yellow-500 font-black ml-1">(${l})</span>`;
            }
            return `
            <button onclick="moveRideToSmartOrder('${ciaObj.name}', ${idx})" class="w-full bg-slate-900 border border-slate-800 hover:border-blue-500 hover:bg-blue-500/10 p-3 rounded-xl flex items-center justify-between transition-all group text-left">
                <div class="flex-1 min-w-0 pr-2">
                    <div class="font-black text-white text-[13px] uppercase truncate">${r.nome}</div>
                    <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">${peaoAcum} PTS</div>
                </div>
                <div class="flex-1 min-w-0 text-right">
                    <div class="font-black text-yellow-500 text-[13px] uppercase truncate">${bull.nome}${ladoBadge}</div>
                </div>
            </button>`;
        }).join('');

        return `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-3">
                <h4 class="font-black text-white text-sm uppercase tracking-widest">${ciaObj.name}</h4>
                <span class="bg-slate-800 text-slate-400 font-black px-2 py-1 rounded text-[10px]">${ciaObj.rides.length} restando</span>
            </div>
            <div class="space-y-2 pl-2 border-l-2 border-slate-800">
                ${ridesHtml}
            </div>
        </div>
        `;
    }).join('');

    const rightContainer = document.getElementById('smart-embretamento-list');
    rightContainer.innerHTML = smartOrderState.orderedRides.map(idx => {
        const r = sorteioData.riders[idx];
        const bull = sorteioData.bulls[sorteioData.assignments[idx]];
        let peaoAcum = "0,00";
        if (currentEvent && currentEvent.peoes) {
            const peao = currentEvent.peoes.find(p => p.nome === r.nome);
            if (peao && peao.score) peaoAcum = peao.score.toFixed(2).replace('.', ',');
        }
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const cia = currentEvent.boiadas.find(c => c.nome === bull.cia);
            if (bull.lado) lado = bull.lado; else if (cia && cia.lados && cia.lados[bull.nome]) lado = cia.lados[bull.nome];
        }
        let ladoBadge = '';
        if (lado) {
            const l = lado.toUpperCase();
            if (l === 'C') ladoBadge = `<span class="text-emerald-500 font-black ml-1">(C)</span>`;
            else if (l === 'E') ladoBadge = `<span class="text-red-500 font-black ml-1">(E)</span>`;
            else ladoBadge = `<span class="text-yellow-500 font-black ml-1">(${l})</span>`;
        }

        return `
        <div class="smart-ordem-card bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-center gap-4 cursor-move hover:border-blue-500 transition-all shadow-lg" draggable="true" data-original-index="${idx}">
            <div class="text-blue-500 cursor-move"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></div>
            <div class="flex-1 min-w-0">
                <div class="font-black text-white text-[15px] uppercase truncate">${r.nome}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${peaoAcum} PTS</div>
            </div>
            <div class="flex-1 min-w-0 text-right">
                <div class="font-black text-yellow-500 text-[15px] uppercase truncate">${bull.nome}${ladoBadge}</div>
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">${bull.cia}</div>
            </div>
        </div>
        `;
    }).join('');

    let draggedItem = null;
    document.querySelectorAll('.smart-ordem-card').forEach(card => {
        card.addEventListener('dragstart', function() { draggedItem = card; setTimeout(() => card.style.opacity = '0.4', 0); });
        card.addEventListener('dragend', function() { setTimeout(() => { draggedItem.style.opacity = '1'; draggedItem = null; }, 0); });
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElementSmart(rightContainer, e.clientY);
            if (afterElement == null) rightContainer.appendChild(draggedItem);
            else rightContainer.insertBefore(draggedItem, afterElement);
        });
    });
}

function getDragAfterElementSmart(container, y) {
    const draggableElements = [...container.querySelectorAll('.smart-ordem-card:not([style*="opacity: 0.4"])')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

window.moveRideToSmartOrder = (ciaName, rideIdx) => {
    const ciaIdx = smartOrderState.remainingCias.findIndex(c => c.name === ciaName);
    if (ciaIdx > -1) {
        const cia = smartOrderState.remainingCias[ciaIdx];
        const rIndex = cia.rides.indexOf(rideIdx);
        if (rIndex > -1) {
            cia.rides.splice(rIndex, 1);
            smartOrderState.orderedRides.push(rideIdx);
            renderSmartOrdem();
        }
    }
};

window.saveAndExportSmartOrdem = () => {
    let hasRemaining = false;
    smartOrderState.remainingCias.forEach(c => { if (c.rides.length > 0) hasRemaining = true; });
    
    if (hasRemaining) {
        return alert("Você precisa enviar todas as montarias para a Ordem Final antes de salvar!");
    }

    const cards = document.querySelectorAll('.smart-ordem-card');
    const newRiders = [];
    const newAssignments = [];
    
    cards.forEach(card => {
        const origIdx = parseInt(card.getAttribute('data-original-index'));
        newRiders.push(sorteioData.riders[origIdx]);
        newAssignments.push(sorteioData.assignments[origIdx]);
    });
    
    sorteioData.riders = newRiders;
    sorteioData.assignments = newAssignments;
    
    saveDrawToEvent();
    
    document.getElementById('modal-ordem-smart').classList.add('hidden');
    pendingExportType = 'ordem';
    pendingExportDay = currentOrdemDay;
    document.getElementById('modal-export-format').classList.remove('hidden');
};

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.ordem-card:not([style*="opacity: 0.4"])')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

window.saveAndExportOrdem = () => {
    const cards = document.querySelectorAll('.ordem-card');
    const newRiders = [];
    const newAssignments = [];
    
    cards.forEach(card => {
        const origIdx = parseInt(card.getAttribute('data-original-index'));
        newRiders.push(sorteioData.riders[origIdx]);
        newAssignments.push(sorteioData.assignments[origIdx]);
    });
    
    sorteioData.riders = newRiders;
    sorteioData.assignments = newAssignments;
    
    // Save to event
    saveDrawToEvent();
    
    // Close and open export prompt
    document.getElementById('modal-ordem-dragdrop').classList.add('hidden');
    pendingExportType = 'ordem';
    pendingExportDay = currentOrdemDay;
    document.getElementById('modal-export-format').classList.remove('hidden');
};

window.exportOrdemPDF = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.riders || !sorteioData.bulls) return alert("Não há dados para exportar!");

    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const day = (sorteioData.day || '---').toUpperCase();
    const auth = window.electronAPI.getAuth();
    const clientName = (auth && auth.nome) || "Cliente RODEOAPP";
    const logoBase64 = await window.electronAPI.getPdfLogo();

    let html = `
    <html><head><meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        th, td { border: 1px solid #000; padding: 8px 6px; text-align: left; font-size: 14px; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .col-header { background-color: #e5e7eb; font-weight: bold; text-align: center; }
        .header-container { background-color: #000; padding: 15px 20px; border: 1px solid #000; color: #fff; display: flex; align-items: center; justify-content: space-between; }
        .footer-container { background-color: #000; padding: 10px; text-align: center; border: 1px solid #000; color: #fff; font-size: 12px; font-weight: bold; }
    </style></head><body>
        <table>
            <thead>
                <tr>
                    <td colspan="5" style="padding: 0; border: none;">
                        <div class="header-container">
                            ${logoBase64 ? `<img src="${logoBase64}" style="height: 45px;">` : '<div style="width: 100px;"></div>'}
                            <div style="flex-grow: 1; text-align: center;">
                                <h1 style="margin:0; font-size: 24px; font-style: italic; font-weight: 900;">${eventName}</h1>
                                <p style="margin:4px 0 0; font-size: 14px; letter-spacing: 2px;">ORDEM DE EMBRETAMENTO - ${day}</p>
                            </div>
                            <div style="width: 100px;"></div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th class="col-header" style="width:10%;">N&ordm;</th>
                    <th class="col-header" style="width:35%; text-align: left;">COMPETIDOR</th>
                    <th class="col-header" style="width:25%; text-align: left;">TOURO</th>
                    <th class="col-header" style="width:20%; text-align: left;">COMPANHIA</th>
                    <th class="col-header" style="width:10%;">LADO</th>
                </tr>
            </thead>
            <tfoot>
                <tr>
                    <td colspan="5" style="padding: 0; border: none;">
                        <div class="footer-container">
                            RODEOAPP (18) 98122-6665 - GEST&Atilde;O DE RODEIOS - LICENCIADO PARA: ${clientName.toUpperCase()}
                        </div>
                    </td>
                </tr>
            </tfoot>
            <tbody>
    `;

    sorteioData.riders.forEach((r, idx) => {
        const b = sorteioData.bulls[sorteioData.assignments[idx]];
        let lado = '';
        if (currentEvent && currentEvent.boiadas) {
            const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (b.lado) lado = b.lado; else if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
        }

        html += `<tr>
            <td class="center bold" style="font-size: 16px;">${idx + 1}</td>
            <td style="font-size: 16px; font-weight: bold;">${r.nome.toUpperCase()}</td>
            <td style="font-size: 16px; font-weight: bold;">${b.nome.toUpperCase()}</td>
            <td style="font-size: 12px;">${b.cia.toUpperCase()}</td>
            <td class="center bold" style="font-size: 16px;">${window.formatSide(lado)}</td>
        </tr>`;
    });

    html += `</tbody></table></body></html>`;

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando PDF...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportPDF({ htmlContent: html, defaultName: `Ordem_${eventName.replace(/\s+/g,'_')}_${day.replace(/\s+/g,'_')}.pdf` });
        document.body.removeChild(loader);
        if (res && res.success) alert("PDF da Ordem exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar PDF: " + res.message);
    } catch(e) {
        document.body.removeChild(loader);
        alert("Erro inesperado: " + e.message);
    }
};

window.exportOrdemExcel = async () => {
    if (!currentEvent || !sorteioData || !sorteioData.riders || !sorteioData.bulls) return alert("Não há dados de ordem para exportar!");

    // Adiciona os lados aos touros
    if (currentEvent.boiadas) {
        sorteioData.bulls.forEach(b => {
            const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
            if (!b.lado && cia && cia.lados && cia.lados[b.nome]) b.lado = cia.lados[b.nome];
        });
    }

    const payload = {
        eventName: currentEvent.name || 'EVENTO',
        day: sorteioData.day || '---',
        data: sorteioData,
        auth: window.electronAPI.getAuth()
    };

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando Planilha...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportOrdemExcel(payload);
        document.body.removeChild(loader);
        if (res && res.success) alert("Excel de Ordem exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar Excel: " + res.message);
    } catch (e) {
        document.body.removeChild(loader);
        alert("Erro inesperado: " + e.message);
    }
};

window.prepareRankingDataForExport = (filterDay) => {
    const peoes = [...(currentEvent.peoes || [])]; 
    const notas = (currentEvent.notas || []).filter(n => n.status === 'ativa');
    const allDays = getEventDaysList(); 
    const dayIndex = allDays.indexOf(filterDay);
    const columnsDays = dayIndex > -1 ? allDays.slice(0, dayIndex + 1) : allDays;

    const rankingData = peoes.map(p => {
        let totalPoints = 0; 
        let tempoAcumulado = 0;
        const peaoNotas = notas.filter(n => n.peao === p.nome);
        peaoNotas.filter(n => columnsDays.includes(n.dia)).forEach(curr => {
            if (curr.totalPeao === 0 || curr.tempo < 8.00) {
                tempoAcumulado += curr.tempo;
            } else {
                totalPoints += (curr.totalPeao + curr.totalTouro);
                tempoAcumulado += curr.tempo;
            }
        });
        
        const daysScores = {};
        columnsDays.forEach(d => {
            const nota = peaoNotas.find(n => n.dia === d);
            if (nota) {
                if (nota.totalPeao === 0 || nota.tempo < 8.00) {
                    daysScores[d] = '0.00';
                } else {
                    daysScores[d] = (nota.totalPeao + nota.totalTouro).toFixed(2).replace('.', ',');
                }
            } else {
                daysScores[d] = '-';
            }
        });

        return { ...p, totalPoints, tempoAcumulado, daysScores };
    });
    
    const hasScores = rankingData.some(p => p.totalPoints > 0 || p.tempoAcumulado > 0);
    if (hasScores) {
        rankingData.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return b.tempoAcumulado - a.tempoAcumulado;
        });
    } else {
        rankingData.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return { rows: rankingData, columnsDays };
};

window.exportRankingExcel = async () => {
    if (!currentEvent) return alert("Nenhum evento ativo!");
    const safeDay = pendingExportDay || 'GERAL';
    const rankingData = prepareRankingDataForExport(safeDay);
    const payload = {
        eventName: currentEvent.name || 'EVENTO',
        day: safeDay,
        data: rankingData,
        auth: window.electronAPI.getAuth()
    };
    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Gerando Planilha...</h2>';
    document.body.appendChild(loader);
    try {
        const res = await window.electronAPI.exportRankingExcel(payload);
        document.body.removeChild(loader);
        if (res && res.success) alert("Excel de Ranking exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar Excel: " + res.message);
    } catch (e) {
        document.body.removeChild(loader);
        alert("Erro inesperado: " + e.message);
    }
};

window.exportRankingPDF = async () => {
    if (!currentEvent) return alert("Nenhum evento ativo!");
    const safeDay = pendingExportDay || 'GERAL';
    const rankingData = prepareRankingDataForExport(safeDay);
    const eventName = (currentEvent.name || 'EVENTO').toUpperCase();
    const logoBase64 = await window.electronAPI.getPdfLogo();
    const auth = window.electronAPI.getAuth();
    const clienteNome = (auth && (auth.nome || auth.email)) ? (auth.nome || auth.email).toUpperCase() : 'CLIENTE RODEOAPP';
    const numCols = 4 + rankingData.columnsDays.length;

    const logoHtml = logoBase64
        ? '<img src="' + logoBase64 + '" style="height:45px;">'
        : '<div style="width:100px;"></div>';

    let dayHeaderCells = '';
    rankingData.columnsDays.forEach(function(d) { dayHeaderCells += '<td>' + d + '</td>'; });

    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    html += '<style>';
    html += '@page { size: A4 landscape; margin: 15mm; }';
    html += 'body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }';
    html += 'table { width: 100%; border-collapse: collapse; page-break-inside: auto; }';
    html += 'tr { page-break-inside: avoid; page-break-after: auto; }';
    html += 'thead { display: table-header-group; }';
    html += 'tfoot { display: table-footer-group; }';
    html += 'th, td { border: 1px solid #000; padding: 8px 6px; text-align: left; font-size: 14px; color: #000; }';
    html += '.center { text-align: center; }';
    html += '.bold { font-weight: bold; }';
    html += '.col-header { background-color: #e5e7eb; font-weight: bold; text-align: center; }';
    html += '.header-container { background-color: #000; padding: 15px 20px; border: 1px solid #000; color: #fff; display: flex; align-items: center; justify-content: space-between; }';
    html += '.footer-container { background-color: #000; padding: 10px; text-align: center; border: 1px solid #000; color: #fff; font-size: 12px; font-weight: bold; }';
    html += '</style></head><body>';
    html += '<table><thead>';
    html += '<tr><td colspan="' + numCols + '" style="padding:0;border:none;">';
    html += '<div class="header-container">';
    html += logoHtml;
    html += '<div style="flex-grow:1;text-align:center;">';
    html += '<h1 style="margin:0;font-size:24px;font-style:italic;font-weight:900;">' + eventName + '</h1>';
    html += '<h2 style="margin:5px 0 0 0;font-size:16px;color:#eab308;">RANKING OFICIAL - ' + safeDay.toUpperCase() + '</h2>';
    html += '</div>';
    html += '<div style="width:100px;"></div></div></td></tr>';
    html += '<tr><td colspan="' + numCols + '" style="border:none;height:10px;"></td></tr>';
    html += '<tr class="col-header">';
    html += '<td style="width:5%;">POS</td>';
    html += '<td style="width:35%;">COMPETIDOR</td>';
    html += '<td style="width:25%;">CIDADE</td>';
    html += dayHeaderCells;
    html += '<td style="width:15%;">TOTAL</td>';
    html += '</tr></thead><tbody>';

    rankingData.rows.forEach(function(r, idx) {
        const hasScore = r.totalPoints > 0 || r.tempoAcumulado > 0;
        const pos = hasScore ? (idx + 1) + 'º' : '---';
        const tempoInfo = (r.totalPoints === 0 && r.tempoAcumulado > 0) ? ' (' + r.tempoAcumulado.toFixed(2) + 's)' : '';
        const totalStr = (r.totalPoints > 0 ? r.totalPoints.toFixed(2).replace('.', ',') : '0,00') + tempoInfo;

        html += '<tr>';
        html += '<td class="center bold">' + pos + '</td>';
        html += '<td class="bold" style="text-transform:uppercase;">' + r.nome + '</td>';
        html += '<td style="text-transform:uppercase;">' + (r.cidade || '---') + '</td>';
        rankingData.columnsDays.forEach(function(d) {
            html += '<td class="center">' + (r.daysScores[d] || '-') + '</td>';
        });
        html += '<td class="center bold">' + totalStr + '</td>';
        html += '</tr>';
    });

    html += '</tbody>';
    html += '<tfoot>';
    html += '<tr><td colspan="' + numCols + '" style="border:none;height:10px;"></td></tr>';
    html += '<tr><td colspan="' + numCols + '" style="padding:0;border:none;">';
    html += '<div class="footer-container">Acesse rodeoapp.pro um novo conceito em gest&atilde;o de provas! - Licenciado para: ' + clienteNome + '</div>';
    html += '</td></tr></tfoot>';
    html += '</table></body></html>';

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white;font-style:italic;font-weight:900;font-size:2rem;">Gerando PDF...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportPDF({ htmlContent: html, defaultName: 'Ranking_' + eventName.replace(/\s+/g, '_') + '_' + safeDay.replace(/\s+/g, '_') + '.pdf' });
        document.body.removeChild(loader);
        if (res && res.success) alert('PDF do Ranking exportado com sucesso!');
        else if (res && !res.canceled) alert('Erro ao exportar PDF: ' + res.message);
    } catch (e) {
        document.body.removeChild(loader);
        alert('Erro inesperado: ' + e.message);
    }
};

// ==========================================
// NOVO SISTEMA DE LANÇAMENTO DE NOTAS
// ==========================================
let notasState = {
    day: null,
    matchupIdx: null,
    sorteio: null,
    rerideReason: null,
    rerideBull: null
};

window.openNotasDays = () => {
    if (!currentEvent || !currentEvent.sorteios || currentEvent.sorteios.length === 0) {
        return alert("Não há sorteios salvos para registrar notas!");
    }
    const grid = document.getElementById('notas-days-grid');
    if (!grid) return;
    
    const dias = [...new Set(currentEvent.sorteios.map(s => s.day))];
    grid.innerHTML = dias.map(day => 
        `<button onclick="openNotasListView('${day}')" class="bg-black border border-slate-800 p-8 rounded-3xl hover:border-blue-500 hover:bg-blue-500/10 transition-all font-black text-white text-xl uppercase tracking-tighter text-center">${day.replace(/DIA/gi, "ROUND")}</button>`
    ).join('');

    document.getElementById('modal-notas-days').classList.remove('hidden');
};

window.openNotasListView = (day) => {
    document.getElementById('modal-notas-days').classList.add('hidden');
    notasState.day = day;
    notasState.sorteio = currentEvent.sorteios.find(s => s.day === day);
    
    document.getElementById('notas-list-subtitle').innerText = `${currentEvent.name} - ${day}`;
    document.getElementById('view-notas-list').classList.remove('hidden');
    
    renderNotasCards();
};

window.closeNotasView = () => {
    document.getElementById('view-notas-list').classList.add('hidden');
};

window.renderNotasCards = () => {
    const container = document.getElementById('notas-cards-container');
    if (!container || typeof notasState === 'undefined' || !notasState || !notasState.sorteio || !notasState.sorteio.riders) return;
    
    let totalGraded = 0;
    
    const cardsHtml = notasState.sorteio.riders.map((r, idx) => {
        const bull = (notasState.sorteio.bulls && notasState.sorteio.assignments) 
            ? (notasState.sorteio.bulls[notasState.sorteio.assignments[idx]] || { nome: '-', cia: '-' })
            : { nome: '-', cia: '-' };
        
        const notaAtiva = (currentEvent.notas || []).find(n => n.peao === r.nome && n.touro === bull.nome && n.dia === notasState.day && n.status === 'ativa');
        const notaSub = (currentEvent.notas || []).find(n => n.peao === r.nome && n.touro === bull.nome && n.dia === notasState.day && n.status !== 'ativa');
        
        if (notaAtiva || notaSub) totalGraded++;
        
        let statusClasses = "border-white/5 bg-slate-900/50 hover:border-blue-500/50 group";
        let scoreHTML = "";
        let isLocked = false;

        if (notaSub && !notaAtiva) {
            statusClasses = "border-red-500/20 bg-slate-900/80 grayscale opacity-40 cursor-not-allowed";
            scoreHTML = `<div class="text-[10px] font-black text-red-500 mt-4 uppercase text-center border-t border-red-500/10 pt-3">SUBSTITUÍDA (RE-RIDE)</div>`;
            isLocked = true;
        } else if (notaAtiva) {
            statusClasses = "border-blue-500/50 bg-blue-500/10 opacity-75 group hover:opacity-100";
            scoreHTML = `<div class="flex justify-between items-center mt-4 pt-4 border-t border-white/10"><div class="text-[10px] text-blue-500 font-black tracking-widest uppercase">TOTAL</div><div class="text-2xl font-black italic text-white">${(notaAtiva.totalPeao + notaAtiva.totalTouro).toFixed(2)}</div></div>`;
        }
        
        let rerideBadge = r.isReride ? `<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] ml-2 uppercase animate-pulse">Re-Ride</span>` : '';

        return `
            <button onclick="${isLocked ? '' : `openScoringModal(${idx})`}" class="text-left p-6 rounded-[2.5rem] border ${statusClasses} transition-all relative">
                ${notaAtiva ? `<div class="absolute top-6 right-6 text-blue-500/50 group-hover:text-blue-500 transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div>` : ''}
                <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">COMPETIDOR</div>
                <div class="text-xl font-black text-white uppercase truncate mb-4 flex items-center">${r.nome} ${rerideBadge}</div>
                
                <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">TOURO (CIA)</div>
                <div class="text-lg font-black text-yellow-500 uppercase truncate">${bull.nome}</div>
                <div class="text-[10px] font-bold text-slate-400 uppercase truncate">${bull.cia}</div>
                
                ${scoreHTML}
            </button>
        `;
    }).join('');

    container.innerHTML = cardsHtml;

    if (totalGraded === notasState.sorteio.riders.length && notasState.sorteio.riders.length > 0) {
        document.getElementById('btn-lancar-ranking').classList.remove('hidden');
    } else {
        document.getElementById('btn-lancar-ranking').classList.add('hidden');
    }
};

window.openScoringModal = (idx) => {
    notasState.matchupIdx = idx;
    const r = notasState.sorteio.riders[idx];
    const bull = notasState.sorteio.bulls[notasState.sorteio.assignments[idx]];
    
    document.getElementById('score-peao-name').innerText = r.nome + (r.isReride ? ' (RE-RIDE)' : '');
    document.getElementById('score-touro-name').innerText = bull.nome;

    // Nomes dos juízes cadastrados no evento
    const juizes = (currentEvent && currentEvent.juizes && currentEvent.juizes.length > 0)
        ? currentEvent.juizes.map((j, i) => typeof j === 'string' ? j : (j.nome || `JUIZ ${i+1}`))
        : ['JUIZ 1', 'JUIZ 2'];

    const j1Name = (juizes[0] || 'JUIZ 1').toUpperCase();
    const j2Name = (juizes[1] || 'JUIZ 2').toUpperCase();
    const maxNota = (currentEvent && currentEvent.judges == 1) ? 50 : 25;

    const j1Label = document.getElementById('score-j1-label');
    if (j1Label) j1Label.innerText = j1Name;
    const j2Label = document.getElementById('score-j2-label');
    if (j2Label) j2Label.innerText = j2Name;

    const j1tLabel = document.getElementById('score-j1-touro-label');
    if (j1tLabel) j1tLabel.innerText = `Touro (0-${maxNota})`;
    const j1pLabel = document.getElementById('score-j1-peao-label');
    if (j1pLabel) j1pLabel.innerText = `Peão (0-${maxNota})`;
    const j2tLabel = document.getElementById('score-j2-touro-label');
    if (j2tLabel) j2tLabel.innerText = `Touro (0-${maxNota})`;
    const j2pLabel = document.getElementById('score-j2-peao-label');
    if (j2pLabel) j2pLabel.innerText = `Peão (0-${maxNota})`;
    
    document.getElementById('score-tempo').value = '';
    ['j1-touro', 'j1-peao', 'j2-touro', 'j2-peao'].forEach(id => document.getElementById(`score-${id}`).value = '');
    
    const notaAtiva = (currentEvent.notas || []).find(n => n.peao === r.nome && n.touro === bull.nome && n.dia === notasState.day && n.status === 'ativa');
    const inputs = ['score-tempo', 'score-j1-touro', 'score-j1-peao', 'score-j2-touro', 'score-j2-peao'];
    
    if (notaAtiva) {
        document.getElementById('score-tempo').value = notaAtiva.tempo;
        document.getElementById('score-j1-touro').value = notaAtiva.j1_touro || '';
        document.getElementById('score-j1-peao').value = notaAtiva.j1_peao || '';
        document.getElementById('score-j2-touro').value = notaAtiva.j2_touro || '';
        document.getElementById('score-j2-peao').value = notaAtiva.j2_peao || '';
        
        // Bloquear edição
        inputs.forEach(id => document.getElementById(id).disabled = true);
        inputs.forEach(id => document.getElementById(id).classList.add('opacity-50', 'cursor-not-allowed'));
        document.getElementById('btn-save-new-score').classList.add('hidden');
        document.getElementById('btn-unlock-score').classList.remove('hidden');
        document.getElementById('btn-reride-score').classList.add('hidden');
    } else {
        // Modo criação
        inputs.forEach(id => document.getElementById(id).disabled = false);
        inputs.forEach(id => document.getElementById(id).classList.remove('opacity-50', 'cursor-not-allowed'));
        document.getElementById('btn-unlock-score').classList.add('hidden');
        document.getElementById('btn-reride-score').classList.remove('hidden');
    }
    
    document.getElementById('modal-scoring-new').classList.remove('hidden');
    updateScoringFields();
    updateScoringFields();
    if (!notaAtiva) {
        setTimeout(() => document.getElementById('score-tempo').focus(), 50);
    }
};

window.unlockScoringModal = () => {
    const inputs = ['score-tempo', 'score-j1-touro', 'score-j1-peao', 'score-j2-touro', 'score-j2-peao'];
    inputs.forEach(id => document.getElementById(id).disabled = false);
    inputs.forEach(id => document.getElementById(id).classList.remove('opacity-50', 'cursor-not-allowed'));
    document.getElementById('btn-save-new-score').classList.remove('hidden');
    document.getElementById('btn-unlock-score').classList.add('hidden');
    document.getElementById('btn-reride-score').classList.remove('hidden');
    updateScoringFields(); // Re-avalia o estado dos campos com base no tempo
    document.getElementById('score-tempo').focus();
};

window.updateScoringFields = () => {
    const tempo = parseFloat(document.getElementById('score-tempo').value);
    const panelJudges = document.getElementById('score-panel-judges');
    const panelResult = document.getElementById('score-panel-result');
    const btnSave = document.getElementById('btn-save-new-score');
    
    const isLocked = document.getElementById('score-tempo').disabled;
    
    if (isNaN(tempo)) {
        panelJudges.classList.add('hidden');
        panelResult.classList.add('hidden');
        btnSave.classList.add('hidden');
        return;
    }
    
    panelJudges.classList.remove('hidden');
    panelResult.classList.remove('hidden');
    if (!isLocked) {
        btnSave.classList.remove('hidden');
    } else {
        btnSave.classList.add('hidden');
    }
    
    const peaoCols = document.querySelectorAll('.peao-score-col');
    if (tempo < 8.00) {
        peaoCols.forEach(col => {
            col.classList.add('opacity-30', 'pointer-events-none');
            col.querySelector('input').value = '';
        });
    } else {
        peaoCols.forEach(col => col.classList.remove('opacity-30', 'pointer-events-none'));
    }
    
    calculateRealTimeScore();
};

window.calculateRealTimeScore = () => {
    const tempo = parseFloat(document.getElementById('score-tempo').value) || 0;
    
    const j1t = parseFloat(document.getElementById('score-j1-touro').value) || 0;
    const j2t = parseFloat(document.getElementById('score-j2-touro').value) || 0;
    
    let j1p = parseFloat(document.getElementById('score-j1-peao').value) || 0;
    let j2p = parseFloat(document.getElementById('score-j2-peao').value) || 0;
    
    if (tempo < 8.00) { j1p = 0; j2p = 0; }
    
    document.getElementById('score-live-touro').innerText = (j1t + j2t).toFixed(2);
    document.getElementById('score-live-peao').innerText = (j1p + j2p).toFixed(2);
    document.getElementById('score-live-total').innerText = ((j1t + j2t) + (j1p + j2p)).toFixed(2);
};

window.validateTempo = (el) => {
    let val = parseFloat(el.value);
    if (isNaN(val)) return;
    if (val < 0) val = 0;
    if (val > 8.00) val = 8.00;
    el.value = val.toFixed(2);
    updateScoringFields();
};

window.validateNota = (el) => {
    let val = parseFloat(el.value);
    if (isNaN(val)) return;
    
    const max = (currentEvent && currentEvent.judges == 1) ? 50 : 25;
    
    // Arredondar para o múltiplo de 0.25 mais próximo
    val = Math.round(val * 4) / 4;
    
    if (val < 0) val = 0;
    if (val > max) val = max;
    
    el.value = val.toFixed(2);
    calculateRealTimeScore();
};

window.saveNewScore = async () => {
    const tempo = parseFloat(document.getElementById('score-tempo').value);
    if (isNaN(tempo)) return alert("Preencha o tempo da montaria!");
    
    const j1t = parseFloat(document.getElementById('score-j1-touro').value) || 0;
    const j2t = parseFloat(document.getElementById('score-j2-touro').value) || 0;
    let j1p = parseFloat(document.getElementById('score-j1-peao').value) || 0;
    let j2p = parseFloat(document.getElementById('score-j2-peao').value) || 0;
    
    if (tempo < 8.00) { j1p = 0; j2p = 0; }
    
    const totalPeao = j1p + j2p;
    const totalTouro = j1t + j2t;
    
    const r = notasState.sorteio.riders[notasState.matchupIdx];
    const bull = notasState.sorteio.bulls[notasState.sorteio.assignments[notasState.matchupIdx]];
    
    const novaNota = {
        id: crypto.randomUUID(),
        dia: notasState.day,
        peao: r.nome,
        touro: bull.nome,
        isReride: r.isReride || false,
        tempo: tempo,
        j1_touro: j1t, j1_peao: j1p,
        j2_touro: j2t, j2_peao: j2p,
        totalPeao, totalTouro,
        status: 'ativa'
    };
    
    currentEvent.notas = currentEvent.notas || [];
    currentEvent.notas = currentEvent.notas.filter(n => !(n.peao === r.nome && n.dia === notasState.day && n.status === 'ativa'));
    currentEvent.notas.push(novaNota);
    
    await window.persistAndSyncEvent(currentEvent);
    
    document.getElementById('modal-scoring-new').classList.add('hidden');
    renderNotasCards();
};

window.openRerideOptions = () => {
    document.getElementById('modal-scoring-new').classList.add('hidden');
    document.getElementById('modal-reride-reason').classList.remove('hidden');
};

window.selectRerideReason = (motivo) => {
    notasState.rerideReason = motivo;
    document.getElementById('modal-reride-reason').classList.add('hidden');
    
    if (motivo === 'nota_baixa') {
        const j1t = parseFloat(document.getElementById('score-j1-touro').value) || 0;
        const j2t = parseFloat(document.getElementById('score-j2-touro').value) || 0;
        if (j1t === 0 && j2t === 0) {
            alert("Sendo Nota Baixa, você precisa preencher a nota do Touro antes! O peão ficará com 0, mas a nota do touro entrará nas médias.");
            document.getElementById('modal-scoring-new').classList.remove('hidden');
            return;
        }
        processRerideScoreAndOpenBullSelection();
    } else {
        processRerideScoreAndOpenBullSelection();
    }
};

window.processRerideScoreAndOpenBullSelection = async () => {
    const r = notasState.sorteio.riders[notasState.matchupIdx];
    const bull = notasState.sorteio.bulls[notasState.sorteio.assignments[notasState.matchupIdx]];
    
    let j1t = 0, j2t = 0;
    if (notasState.rerideReason === 'nota_baixa') {
        j1t = parseFloat(document.getElementById('score-j1-touro').value) || 0;
        j2t = parseFloat(document.getElementById('score-j2-touro').value) || 0;
    }
    
    const novaNota = {
        id: crypto.randomUUID(),
        dia: notasState.day,
        peao: r.nome,
        touro: bull.nome,
        isReride: r.isReride || false,
        tempo: parseFloat(document.getElementById('score-tempo').value) || 0,
        j1_touro: j1t, j1_peao: 0,
        j2_touro: j2t, j2_peao: 0,
        totalPeao: 0, totalTouro: j1t + j2t,
        status: notasState.rerideReason
    };
    
    currentEvent.notas = currentEvent.notas || [];
    currentEvent.notas = currentEvent.notas.filter(n => !(n.peao === r.nome && n.dia === notasState.day && n.status === 'ativa'));
    currentEvent.notas.push(novaNota);
    await window.persistAndSyncEvent(currentEvent);
    
    document.getElementById('modal-reride-bull').classList.remove('hidden');
    filterRerideBulls();
};

window.filterRerideBulls = () => {
    const q = document.getElementById('reride-search-bull').value.toUpperCase();
    const container = document.getElementById('reride-bull-list');
    container.innerHTML = '';
    
    let allBulls = [];
    if (currentEvent && currentEvent.boiadas) {
        currentEvent.boiadas.forEach(c => {
            if (c.touros && Array.isArray(c.touros)) {
                c.touros.forEach(t => allBulls.push({ nome: t, cia: c.nome, lado: c.lados ? c.lados[t] : '' }));
            }
        });
    }
    
    const assignedBullsNames = [];
    const reservaBullsNames = [];
    
    if (notasState.sorteio && notasState.sorteio.assignments && notasState.sorteio.bulls) {
        Object.values(notasState.sorteio.assignments).forEach(bullIdx => {
            if (notasState.sorteio.bulls[bullIdx]) {
                assignedBullsNames.push(notasState.sorteio.bulls[bullIdx].nome.toUpperCase());
            }
        });
        
        notasState.sorteio.bulls.forEach(b => {
            if (!assignedBullsNames.includes(b.nome.toUpperCase())) {
                reservaBullsNames.push(b.nome.toUpperCase());
            }
        });
    }

    // Sort all bulls alphabetically, but put 'Reservas' at the top
    allBulls.sort((a, b) => {
        const aIsReserva = reservaBullsNames.includes(a.nome.toUpperCase());
        const bIsReserva = reservaBullsNames.includes(b.nome.toUpperCase());
        if (aIsReserva && !bIsReserva) return -1;
        if (!aIsReserva && bIsReserva) return 1;
        return a.nome.localeCompare(b.nome);
    });
    
    // Filter out bulls that are already assigned to buck today
    let filtered = allBulls.filter(b => !assignedBullsNames.includes(b.nome.toUpperCase()));
    
    if (q) filtered = filtered.filter(b => b.nome.toUpperCase().includes(q) || b.cia.toUpperCase().includes(q));
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-slate-500 font-black italic p-8">NENHUM TOURO ENCONTRADO</div>`;
        return;
    }
    
    container.innerHTML = filtered.map(b => {
        const isReserva = reservaBullsNames.includes(b.nome.toUpperCase());
        return `
            <button onclick="selectRerideBull('${b.nome}', '${b.cia}', '${b.lado}')" class="bg-black border ${isReserva ? 'border-emerald-500/50' : 'border-slate-800'} p-6 rounded-2xl hover:border-blue-500 text-left transition-all group relative">
                ${isReserva ? '<div class="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg rounded-tr-xl">RESERVA DO DIA</div>' : ''}
                <div class="font-black text-white text-lg uppercase truncate group-hover:text-blue-500 pr-20">${b.nome}</div>
                <div class="font-bold text-slate-500 text-xs uppercase truncate">${b.cia}</div>
            </button>
        `;
    }).join('');
};

window.selectRerideBull = (nome, cia, lado = '') => {
    let resolvedLado = lado || '';

    // Se lado não veio preenchido, busca nas boiadas cadastradas no evento
    if (!resolvedLado && currentEvent && currentEvent.boiadas) {
        currentEvent.boiadas.forEach(c => {
            if (c.lados && c.lados[nome]) {
                resolvedLado = c.lados[nome];
            }
        });
    }

    // Se ainda não achou, busca no banco global de boiadas
    if (!resolvedLado && typeof globalBoiadas !== 'undefined' && Array.isArray(globalBoiadas)) {
        globalBoiadas.forEach(b => {
            if (b.lados && b.lados[nome]) {
                resolvedLado = b.lados[nome];
            }
        });
    }

    notasState.rerideBull = { nome, cia, lado: resolvedLado };
    
    // Normaliza o lado
    const l = String(resolvedLado || '').trim().toUpperCase();
    const isEsquerdo = (l === 'E' || l === 'ESQUERDO' || l === 'ERRADO');
    const isDireito = (l === 'D' || l === 'C' || l === 'DIREITO' || l === 'CERTO');

    // Auto-seleciona o radio button do lado no modal de confirmação
    document.querySelectorAll('input[name="manual-reride-lado"]').forEach(r => {
        if (isEsquerdo && r.value === 'E') {
            r.checked = true;
        } else if (isDireito && r.value === 'D') {
            r.checked = true;
        } else if (!isEsquerdo && !isDireito) {
            r.checked = (r.value === 'E'); // Padrão Esquerdo se não informado
        } else {
            r.checked = false;
        }
    });
    
    document.getElementById('modal-reride-bull').classList.add('hidden');
    document.getElementById('modal-reride-confirm').classList.remove('hidden');
};

window.confirmRerideNow = async (launchNow) => {
    const ladoRadio = document.querySelector('input[name="manual-reride-lado"]:checked');
    if (!ladoRadio) {
        return alert("Você deve selecionar o LADO (E ou D) do touro para confirmar o Re-ride!");
    }
    
    notasState.rerideBull.lado = ladoRadio.value;
    
    const r = notasState.sorteio.riders[notasState.matchupIdx];
    
    let newBullIdx = notasState.sorteio.bulls.findIndex(b => b.nome.toUpperCase() === notasState.rerideBull.nome.toUpperCase());
    if (newBullIdx === -1) {
        notasState.sorteio.bulls.push(notasState.rerideBull);
        newBullIdx = notasState.sorteio.bulls.length - 1;
    }
    
    notasState.sorteio.riders.push({ nome: r.nome, isReride: true });
    const newRiderIdx = notasState.sorteio.riders.length - 1;
    notasState.sorteio.assignments[newRiderIdx] = newBullIdx;
    
    const sorteioIdx = currentEvent.sorteios.findIndex(s => s.day === notasState.day);
    currentEvent.sorteios[sorteioIdx] = notasState.sorteio;
    await window.persistAndSyncEvent(currentEvent);
    
    document.getElementById('modal-reride-confirm').classList.add('hidden');
    
    if (launchNow) {
        renderNotasCards();
        openScoringModal(notasState.sorteio.riders.length - 1);
    } else {
        renderNotasCards();
    }
};

function getScoresForRiderAndBull(peaoNome, bullNome, dayVal) {
    if (!currentEvent || !currentEvent.notas) {
        return { j1_peao: 0, j1_touro: 0, j2_peao: 0, j2_touro: 0, totalPeao: 0, totalTouro: 0, totalScore: 0, tempo: 0 };
    }

    const dayStr = String(dayVal || '1');
    const peaoLower = (peaoNome || '').trim().toLowerCase();

    const juizesList = (currentEvent.juizes && currentEvent.juizes.length > 0)
        ? currentEvent.juizes.map((j, i) => typeof j === 'string' ? j : (j.nome || `Juiz ${i+1}`))
        : ['Juiz 1', 'Juiz 2'];

    let j1p = 0, j1t = 0, j2p = 0, j2t = 0, tempo = 0;

    const notaManual = currentEvent.notas.find(n => 
        ((n.peao || n.peaoNome || '').trim().toLowerCase() === peaoLower) &&
        (String(n.dia || n.day) === dayStr) &&
        (n.status === 'ativa' || !n.status)
    );

    if (notaManual && (notaManual.j1_peao !== undefined || notaManual.j1_touro !== undefined || notaManual.totalPeao !== undefined || notaManual.notaPeao !== undefined)) {
        j1p = parseFloat(notaManual.j1_peao || notaManual.notaPeao) || 0;
        j1t = parseFloat(notaManual.j1_touro || notaManual.notaTouro) || 0;
        j2p = parseFloat(notaManual.j2_peao) || 0;
        j2t = parseFloat(notaManual.j2_touro) || 0;
        tempo = parseFloat(notaManual.tempo) || 8.00;

        if (j1p === 0 && j2p === 0 && notaManual.totalPeao > 0) j1p = notaManual.totalPeao;
        if (j1t === 0 && j2t === 0 && notaManual.totalTouro > 0) j1t = notaManual.totalTouro;
    } else {
        const j1Match = currentEvent.notas.find(n => 
            ((n.peao || n.peaoNome || '').trim().toLowerCase() === peaoLower) &&
            String(n.dia || n.day) === dayStr &&
            (n.juiz === juizesList[0] || (n.juiz && n.juiz.toLowerCase().includes('1')))
        );
        if (j1Match) {
            j1p = parseFloat(j1Match.notaPeao || j1Match.j1_peao) || 0;
            j1t = parseFloat(j1Match.notaTouro || j1Match.j1_touro) || 0;
        }

        const j2Match = currentEvent.notas.find(n => 
            ((n.peao || n.peaoNome || '').trim().toLowerCase() === peaoLower) &&
            String(n.dia || n.day) === dayStr &&
            (n.juiz === juizesList[1] || (n.juiz && n.juiz.toLowerCase().includes('2')))
        );
        if (j2Match) {
            j2p = parseFloat(j2Match.notaPeao || j2Match.j2_peao) || 0;
            j2t = parseFloat(j2Match.notaTouro || j2Match.j2_touro) || 0;
        }
    }

    const totalPeao = j1p + j2p;
    const totalTouro = j1t + j2t;
    const totalScore = totalPeao + totalTouro;

    return { j1_peao: j1p, j1_touro: j1t, j2_peao: j2p, j2_touro: j2t, totalPeao, totalTouro, totalScore, tempo };
}

window.openNotasSummaryModal = () => {
    window.finishScoringFlow();
};

window.finishScoringFlow = () => {
    const tbody = document.getElementById('notas-summary-tbody');
    const tableHeader = document.querySelector('#modal-notas-summary table thead');
    if (!tbody) return;

    const juizes = (currentEvent && currentEvent.juizes && currentEvent.juizes.length > 0)
        ? currentEvent.juizes.map((j, i) => typeof j === 'string' ? j : (j.nome || `Juiz ${i+1}`))
        : ['Juiz 1', 'Juiz 2'];

    const j1Name = juizes[0] || 'Juiz 1';
    const j2Name = juizes[1] || 'Juiz 2';
    const isMultiJudge = juizes.length >= 2 || (currentEvent && parseInt(currentEvent.judges, 10) >= 2);

    if (tableHeader) {
        if (isMultiJudge) {
            tableHeader.innerHTML = `
                <tr class="text-[10px] font-black uppercase tracking-widest border-b border-slate-800 text-slate-400">
                    <th class="py-4 px-3">POS</th>
                    <th class="py-4 px-3">Competidor</th>
                    <th class="py-4 px-3">Touro</th>
                    <th class="py-4 px-3 text-center">Tempo</th>
                    <th class="py-4 px-3 text-center text-emerald-400 bg-emerald-500/5">Peão (${j1Name})</th>
                    <th class="py-4 px-3 text-center text-yellow-400 bg-yellow-500/5">Touro (${j1Name})</th>
                    <th class="py-4 px-3 text-center text-emerald-400 bg-emerald-500/5">Peão (${j2Name})</th>
                    <th class="py-4 px-3 text-center text-yellow-400 bg-yellow-500/5">Touro (${j2Name})</th>
                    <th class="py-4 px-3 text-center text-white font-black bg-blue-500/10">Total Peão</th>
                    <th class="py-4 px-3 text-center text-white font-black bg-blue-500/10">Total Touro</th>
                    <th class="py-4 px-3 text-center text-yellow-500 font-black text-xs bg-yellow-500/10">Nota Final</th>
                </tr>
            `;
        } else {
            tableHeader.innerHTML = `
                <tr class="text-[10px] font-black uppercase tracking-widest border-b border-slate-800 text-slate-400">
                    <th class="py-4 px-3">POS</th>
                    <th class="py-4 px-3">Competidor</th>
                    <th class="py-4 px-3">Touro</th>
                    <th class="py-4 px-3 text-center">Tempo</th>
                    <th class="py-4 px-3 text-center text-emerald-400 bg-emerald-500/5">Nota Peão (${j1Name})</th>
                    <th class="py-4 px-3 text-center text-yellow-400 bg-yellow-500/5">Nota Touro (${j1Name})</th>
                    <th class="py-4 px-3 text-center text-yellow-500 font-black text-xs bg-yellow-500/10">Nota Final</th>
                </tr>
            `;
        }
    }

    if (notasState && notasState.sorteio && notasState.sorteio.riders && notasState.sorteio.riders.length > 0) {
        tbody.innerHTML = notasState.sorteio.riders.map((r, idx) => {
            const bull = (notasState.sorteio.bulls && notasState.sorteio.assignments) ? (notasState.sorteio.bulls[notasState.sorteio.assignments[idx]] || { nome: '-' }) : { nome: '-' };
            const scores = getScoresForRiderAndBull(r.nome, bull.nome, notasState.day);

            let tempoHtml = scores.tempo > 0 ? scores.tempo.toFixed(2) : '-';
            let j1p = scores.j1_peao > 0 ? `<span class="text-emerald-400 font-bold">${scores.j1_peao.toFixed(2)}</span>` : '-';
            let j1t = scores.j1_touro > 0 ? `<span class="text-yellow-400 font-bold">${scores.j1_touro.toFixed(2)}</span>` : '-';
            let j2p = scores.j2_peao > 0 ? `<span class="text-emerald-400 font-bold">${scores.j2_peao.toFixed(2)}</span>` : '-';
            let j2t = scores.j2_touro > 0 ? `<span class="text-yellow-400 font-bold">${scores.j2_touro.toFixed(2)}</span>` : '-';
            let totP = scores.totalPeao > 0 ? `<span class="text-white font-bold">${scores.totalPeao.toFixed(2)}</span>` : '-';
            let totT = scores.totalTouro > 0 ? `<span class="text-yellow-500 font-bold">${scores.totalTouro.toFixed(2)}</span>` : '-';
            let finalScore = scores.totalScore > 0 ? `<span class="text-yellow-400 font-black text-base">${scores.totalScore.toFixed(2)}</span>` : '-';

            if (isMultiJudge) {
                return `
                    <tr class="hover:bg-slate-800/20 text-xs transition-colors">
                        <td class="py-3 px-3 text-slate-500 font-bold">${idx+1}</td>
                        <td class="py-3 px-3 font-bold text-white">${r.nome} ${r.isReride ? '<span class="bg-red-500 px-1.5 py-0.5 rounded text-[8px] text-white ml-1">RE-RIDE</span>' : ''}</td>
                        <td class="py-3 px-3 text-slate-400 font-medium">${bull.nome}</td>
                        <td class="py-3 px-3 text-center font-black">${tempoHtml}</td>
                        <td class="py-3 px-3 text-center bg-emerald-500/5">${j1p}</td>
                        <td class="py-3 px-3 text-center bg-yellow-500/5">${j1t}</td>
                        <td class="py-3 px-3 text-center bg-emerald-500/5">${j2p}</td>
                        <td class="py-3 px-3 text-center bg-yellow-500/5">${j2t}</td>
                        <td class="py-3 px-3 text-center font-bold bg-blue-500/5">${totP}</td>
                        <td class="py-3 px-3 text-center font-bold bg-blue-500/5">${totT}</td>
                        <td class="py-3 px-3 text-center font-black bg-yellow-500/10">${finalScore}</td>
                    </tr>
                `;
            } else {
                return `
                    <tr class="hover:bg-slate-800/20 text-xs transition-colors">
                        <td class="py-3 px-3 text-slate-500 font-bold">${idx+1}</td>
                        <td class="py-3 px-3 font-bold text-white">${r.nome} ${r.isReride ? '<span class="bg-red-500 px-1.5 py-0.5 rounded text-[8px] text-white ml-1">RE-RIDE</span>' : ''}</td>
                        <td class="py-3 px-3 text-slate-400 font-medium">${bull.nome}</td>
                        <td class="py-3 px-3 text-center font-black">${tempoHtml}</td>
                        <td class="py-3 px-3 text-center bg-emerald-500/5">${j1p}</td>
                        <td class="py-3 px-3 text-center bg-yellow-500/5">${j1t}</td>
                        <td class="py-3 px-3 text-center font-black bg-yellow-500/10">${finalScore}</td>
                    </tr>
                `;
            }
        }).join('');
    } else {
        tbody.innerHTML = '';
    }

    document.getElementById('modal-notas-summary').classList.remove('hidden');
};

window.lancarNotasRanking = async () => {
    // Calcula a pontuação total (soma de todos os dias de todas as notas 'ativa' do evento)
    currentEvent.peoes.forEach(p => {
        const peaoNotas = (currentEvent.notas || []).filter(n => n.peao === p.nome && n.status === 'ativa');
        
        let scoreTotal = 0;
        let tempoAcumulado = 0;

        peaoNotas.forEach(curr => {
            if (curr.totalPeao === 0 || curr.tempo < 8.00) {
                tempoAcumulado += curr.tempo;
            } else {
                scoreTotal += (curr.totalPeao + curr.totalTouro);
                tempoAcumulado += curr.tempo;
            }
        });

        p.score = scoreTotal;
        p.tempoAcumulado = tempoAcumulado;
    });
    
    await window.persistAndSyncEvent(currentEvent);
    
    alert(`As notas do dia ${notasState.day} foram lançadas com sucesso e o Ranking do Evento foi atualizado!`);
    closeNotasView();
    renderEvents(); // Atualiza painel por baixo
};
let editingContratoEventId = null;

window.openModalContratoConfig = async (eventId) => {
    editingContratoEventId = eventId;
    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    const ev = eventos.find(e => e.id === eventId);
    if (!ev) return;

    const cc = ev.contratoConfig || {};
    const con = cc.contratante || {};
    const end = con.endereco || {};
    const endRep = con.enderecoRepresentante || {};
    const cq = cc.clausulaQuarta || {};
    const c2 = cc.clausulaSegunda || {};
    const forum = cc.forum || {};
    const rec = cc.recibo || {};

    // Popula campos
    document.getElementById('cc-razao-social').value = con.razaoSocial || '';
    document.getElementById('cc-cnpj').value = con.cnpj || '';
    document.getElementById('cc-cep').value = end.cep || '';
    document.getElementById('cc-estado').value = end.estado || '';
    document.getElementById('cc-cidade').value = end.cidade || '';
    document.getElementById('cc-bairro').value = end.bairro || '';
    document.getElementById('cc-rua').value = end.rua || '';
    document.getElementById('cc-numero').value = end.numero || '';
    document.getElementById('cc-sn').checked = !!end.sn;
    
    document.getElementById('cc-nome-rep').value = con.nomeRepresentante || '';
    if(document.getElementById('cc-cpf-rep')) document.getElementById('cc-cpf-rep').value = con.cpfRepresentante || '';
    if(document.getElementById('cc-rg-rep')) document.getElementById('cc-rg-rep').value = con.rgRepresentante || '';
    document.getElementById('cc-mesmo-endereco').checked = con.mesmoEndereco !== false;
    
    document.getElementById('cc-rep-cep').value = endRep.cep || '';
    document.getElementById('cc-rep-estado').value = endRep.estado || '';
    document.getElementById('cc-rep-cidade').value = endRep.cidade || '';
    document.getElementById('cc-rep-bairro').value = endRep.bairro || '';
    document.getElementById('cc-rep-rua').value = endRep.rua || '';
    document.getElementById('cc-rep-numero').value = endRep.numero || '';
    document.getElementById('cc-rep-sn').checked = !!endRep.sn;

    document.getElementById('cc-valor-liq').value = cq.valorLiquido || '';
    document.getElementById('cc-valor-liq-ext').value = cq.valorLiquidoExtenso || '';
    document.getElementById('cc-data-pag').value = cq.dataPagamento || '';
    document.getElementById('cc-modalidade').value = cq.modalidade || '';
    document.getElementById('cc-premio-total').value = cq.premiacaoTotal || '';
    document.getElementById('cc-premio-total-ext').value = cq.premiacaoTotalExtenso || '';

    if(document.getElementById('cc-prazo-num')) document.getElementById('cc-prazo-num').value = c2.prazoNum || '';
    if(document.getElementById('cc-prazo-ext')) document.getElementById('cc-prazo-ext').value = c2.prazoExtenso || '';
    if(document.getElementById('cc-data-inicio')) document.getElementById('cc-data-inicio').value = c2.dataInicio || '';
    if(document.getElementById('cc-data-fim')) document.getElementById('cc-data-fim').value = c2.dataFim || '';

    if(document.getElementById('cc-cidade-forum')) document.getElementById('cc-cidade-forum').value = forum.cidade || '';

    if(document.getElementById('cc-recibo-bruto')) document.getElementById('cc-recibo-bruto').value = rec.valorBruto || '';
    if(document.getElementById('cc-recibo-inss')) document.getElementById('cc-recibo-inss').value = rec.valorInss || '';

    toggleSN();
    toggleEnderecoRep();
    toggleRepSN();

    const distContainer = document.getElementById('cc-distribuicao-container');
    distContainer.innerHTML = '';
    const dist = cq.distribuicao || [];
    if (dist.length === 0) {
        addCcDist('1º lugar', '');
    } else {
        dist.forEach(d => addCcDist(d.posicao, d.valor));
    }

    document.getElementById('modal-contrato-config').classList.remove('hidden');
};

window.closeModalContratoConfig = () => {
    document.getElementById('modal-contrato-config').classList.add('hidden');
    editingContratoEventId = null;
};

window.toggleSN = () => {
    const isSN = document.getElementById('cc-sn').checked;
    const numInput = document.getElementById('cc-numero');
    numInput.disabled = isSN;
    if (isSN) numInput.value = '';
};

window.toggleRepSN = () => {
    const isSN = document.getElementById('cc-rep-sn').checked;
    const numInput = document.getElementById('cc-rep-numero');
    numInput.disabled = isSN;
    if (isSN) numInput.value = '';
};

window.toggleEnderecoRep = () => {
    const isSame = document.getElementById('cc-mesmo-endereco').checked;
    const container = document.getElementById('endereco-rep-container');
    if (isSame) {
        container.classList.add('hidden');
    } else {
        container.classList.remove('hidden');
    }
};

window.addCcDist = (posicao = '', valor = '') => {
    const container = document.getElementById('cc-distribuicao-container');
    const row = document.createElement('div');
    row.className = 'flex items-center gap-4 cc-dist-row';
    row.innerHTML = `
        <div class="flex-1">
            <input type="text" placeholder="Posição (ex: 1º Lugar)" value="${posicao}" class="cc-dist-posicao w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-yellow-500 outline-none text-xs font-bold">
        </div>
        <div class="flex-1">
            <input type="text" placeholder="Valor (ex: 5.000,00)" value="${valor}" class="cc-dist-valor w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-yellow-500 outline-none text-xs font-bold">
        </div>
        <button type="button" onclick="removeCcDist(this)" class="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    `;
    container.appendChild(row);
};

window.removeCcDist = (btn) => {
    btn.closest('.cc-dist-row').remove();
};

document.getElementById('form-contrato-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingContratoEventId) return;

    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    const ev = eventos.find(event => event.id === editingContratoEventId);
    
    if (!ev) return;

    const distribuicao = Array.from(document.querySelectorAll('.cc-dist-row')).map(row => {
        return {
            posicao: row.querySelector('.cc-dist-posicao').value.trim(),
            valor: row.querySelector('.cc-dist-valor').value.trim()
        };
    }).filter(d => d.posicao || d.valor);

    ev.contratoConfig = {
        contratante: {
            razaoSocial: document.getElementById('cc-razao-social').value.trim(),
            cnpj: document.getElementById('cc-cnpj').value.trim(),
            endereco: {
                cep: document.getElementById('cc-cep').value.trim(),
                estado: document.getElementById('cc-estado').value.trim(),
                cidade: document.getElementById('cc-cidade').value.trim(),
                bairro: document.getElementById('cc-bairro').value.trim(),
                rua: document.getElementById('cc-rua').value.trim(),
                numero: document.getElementById('cc-numero').value.trim(),
                sn: document.getElementById('cc-sn').checked
            },
            nomeRepresentante: document.getElementById('cc-nome-rep').value.trim(),
            cpfRepresentante: document.getElementById('cc-cpf-rep') ? document.getElementById('cc-cpf-rep').value.trim() : '',
            rgRepresentante: document.getElementById('cc-rg-rep') ? document.getElementById('cc-rg-rep').value.trim() : '',
            mesmoEndereco: document.getElementById('cc-mesmo-endereco').checked,
            enderecoRepresentante: {
                cep: document.getElementById('cc-rep-cep').value.trim(),
                estado: document.getElementById('cc-rep-estado').value.trim(),
                cidade: document.getElementById('cc-rep-cidade').value.trim(),
                bairro: document.getElementById('cc-rep-bairro').value.trim(),
                rua: document.getElementById('cc-rep-rua').value.trim(),
                numero: document.getElementById('cc-rep-numero').value.trim(),
                sn: document.getElementById('cc-rep-sn').checked
            }
        },
        clausulaSegunda: {
            prazoNum: document.getElementById('cc-prazo-num') ? document.getElementById('cc-prazo-num').value.trim() : '',
            prazoExtenso: document.getElementById('cc-prazo-ext') ? document.getElementById('cc-prazo-ext').value.trim() : '',
            dataInicio: document.getElementById('cc-data-inicio') ? document.getElementById('cc-data-inicio').value.trim() : '',
            dataFim: document.getElementById('cc-data-fim') ? document.getElementById('cc-data-fim').value.trim() : ''
        },
        clausulaQuarta: {
            valorLiquido: document.getElementById('cc-valor-liq').value.trim(),
            valorLiquidoExtenso: document.getElementById('cc-valor-liq-ext').value.trim(),
            dataPagamento: document.getElementById('cc-data-pag').value.trim(),
            modalidade: document.getElementById('cc-modalidade').value.trim(),
            premiacaoTotal: document.getElementById('cc-premio-total').value.trim(),
            premiacaoTotalExtenso: document.getElementById('cc-premio-total-ext').value.trim(),
            distribuicao: distribuicao
        },
        forum: {
            cidade: document.getElementById('cc-cidade-forum') ? document.getElementById('cc-cidade-forum').value.trim() : ''
        },
        recibo: {
            valorBruto: document.getElementById('cc-recibo-bruto') ? document.getElementById('cc-recibo-bruto').value.trim() : '',
            valorInss: document.getElementById('cc-recibo-inss') ? document.getElementById('cc-recibo-inss').value.trim() : ''
        }
    };

    await window.electronAPI.updateLocalEvent(email, ev);
    alert('Configurações de contrato salvas com sucesso!');
    closeModalContratoConfig();
});


let currentExportEventId = null;
let currentExportTarget = null;

window.openModalExportContract = (eventId, target) => {
    currentExportEventId = eventId;
    currentExportTarget = target;
    const desc = target === 'all' ? 'Exportar contratos de TODOS os competidores' : 'Exportar contrato deste competidor';
    document.getElementById('export-contract-desc').innerText = desc;
    document.getElementById('modal-export-contract').classList.remove('hidden');
};

window.closeModalExportContract = () => {
    document.getElementById('modal-export-contract').classList.add('hidden');
    currentExportEventId = null;
    currentExportTarget = null;
};

window.executeExportContract = async (format) => {
    if (!currentExportEventId || !currentExportTarget) return;
    
    document.getElementById('modal-export-contract').classList.add('hidden');
    document.getElementById('modal-loading').classList.remove('hidden');
    
    try {
        const email = getCurrentUserEmail();
        const result = await window.electronAPI.exportContracts(email, currentExportEventId, currentExportTarget, format);
        if (result.success) {
            alert(`Contrato(s) gerado(s) com sucesso!\nSalvo em: ${result.path}`);
        } else {
            alert(`Erro ao gerar contratos: ${result.error}`);
        }
    } catch (e) {
        alert(`Erro de execução: ${e.message}`);
    } finally {
        document.getElementById('modal-loading').classList.add('hidden');
    }
};
// ==========================================
// RANKING DE ANIMAIS (Touros e Boiadas)
// ==========================================
let currentRankingAnimaisType = 'touro';

window.openRankingAnimaisView = () => {
    currentRankingAnimaisType = 'touro';
    updateRankingAnimaisButtons();
    
    const filters = document.getElementById('ranking-animais-filters'); 
    if (filters) {
        let html = `<button onclick="renderRankingAnimais('${currentRankingAnimaisType}', 'geral')" class="rank-animal-filter-btn active px-6 py-2 rounded-xl text-xs font-black uppercase transition-all bg-emerald-500 text-black">Geral</button>`;
        const daysList = getEventDaysList();
        daysList.forEach(day => {
            html += `<button onclick="renderRankingAnimais('${currentRankingAnimaisType}', '${day}')" class="rank-animal-filter-btn px-6 py-2 rounded-xl text-xs font-black uppercase transition-all hover:text-white text-slate-500">${day.replace(/DIA/gi, "ROUND")}</button>`;
        });
        filters.innerHTML = html;
        document.querySelectorAll('.rank-animal-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.rank-animal-filter-btn').forEach(b => {
                    b.classList.remove('active', 'bg-emerald-500', 'text-black');
                    b.classList.add('text-slate-500', 'hover:text-white');
                });
                this.classList.remove('text-slate-500', 'hover:text-white');
                this.classList.add('active', 'bg-emerald-500', 'text-black');
            });
        });
    }
    const rv = document.getElementById('ranking-animais-view'); if (rv) rv.classList.remove('hidden');
    renderRankingAnimais(currentRankingAnimaisType, 'geral');
};

window.closeRankingAnimaisView = () => { const rv = document.getElementById('ranking-animais-view'); if (rv) rv.classList.add('hidden'); };

window.setRankingAnimaisType = (type) => {
    currentRankingAnimaisType = type;
    updateRankingAnimaisButtons();
    
    const activeBtn = document.querySelector('.rank-animal-filter-btn.active');
    let currentDay = 'geral';
    if(activeBtn && activeBtn.innerText.toLowerCase() !== 'geral') {
        currentDay = activeBtn.innerText;
    }
    
    document.querySelectorAll('.rank-animal-filter-btn').forEach(btn => {
        const dayText = btn.innerText.toLowerCase() === 'geral' ? 'geral' : btn.innerText;
        btn.setAttribute('onclick', `renderRankingAnimais('${type}', '${dayText}')`);
    });
    
    renderRankingAnimais(type, currentDay);
};

window.updateRankingAnimaisButtons = () => {
    const btnTouro = document.getElementById('btn-ranking-type-touro');
    const btnBoiada = document.getElementById('btn-ranking-type-boiada');
    if (!btnTouro || !btnBoiada) return;
    if(currentRankingAnimaisType === 'touro') {
        btnTouro.classList.add('bg-emerald-500', 'text-black');
        btnTouro.classList.remove('text-slate-500', 'hover:text-white');
        btnBoiada.classList.remove('bg-emerald-500', 'text-black');
        btnBoiada.classList.add('text-slate-500', 'hover:text-white');
    } else {
        btnBoiada.classList.add('bg-emerald-500', 'text-black');
        btnBoiada.classList.remove('text-slate-500', 'hover:text-white');
        btnTouro.classList.remove('bg-emerald-500', 'text-black');
        btnTouro.classList.add('text-slate-500', 'hover:text-white');
    }
};

window.renderRankingAnimais = (type, filter = 'geral') => {
    const container = document.getElementById('ranking-animais-table-container'); 
    if (!currentEvent || !currentEvent.notas) {
        if (container) container.innerHTML = `<div class="p-20 text-center text-slate-500 italic font-bold">Nenhuma nota registrada no evento.</div>`;
        return;
    }
    const notas = (currentEvent.notas || []).filter(n => n && (n.status === 'ativa' || n.status === 'nota_baixa' || n.status === 're_ride'));
    
    const getSafeStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') return (val.nome || val.name || val.touro || '').trim();
        return String(val).trim();
    };

    let rankingData = [];
    
    if (type === 'touro') {
        const bullsMap = {};
        if (currentEvent.boiadas && Array.isArray(currentEvent.boiadas)) {
            currentEvent.boiadas.forEach(c => {
                const cNome = getSafeStr(c.nome || c.cia || 'SEM CIA');
                if (c.touros && Array.isArray(c.touros)) {
                    c.touros.forEach(t => {
                        const tNome = getSafeStr(t);
                        if (tNome) {
                            bullsMap[tNome.toUpperCase()] = { nome: tNome, cia: cNome };
                        }
                    });
                }
            });
        }
        
        notas.forEach(n => {
            const tNome = getSafeStr(n.touro || n.touroNome || n.bullName);
            if (tNome && !bullsMap[tNome.toUpperCase()]) {
                const cNome = getSafeStr(n.cia || n.bullCia || 'SEM CIA');
                bullsMap[tNome.toUpperCase()] = { nome: tNome, cia: cNome };
            }
        });
        
        const tourosData = [];
        for (const [upperNome, bInfo] of Object.entries(bullsMap)) {
            const peaoNotas = notas.filter(n => {
                const nTouroUpper = getSafeStr(n.touro || n.touroNome || n.bullName).toUpperCase();
                return nTouroUpper === upperNome && (filter === 'geral' || n.dia === filter);
            });
            if (peaoNotas.length === 0) continue;
            
            let sum = 0;
            peaoNotas.forEach(n => { sum += (parseFloat(n.totalTouro) || 0); });
            const media = sum / peaoNotas.length;
            
            tourosData.push({ ...bInfo, saidas: peaoNotas.length, media });
        }
        rankingData = tourosData;
    } else {
        const boiadaMap = {}; 
        if (currentEvent.boiadas && Array.isArray(currentEvent.boiadas)) {
            currentEvent.boiadas.forEach(c => {
                const cNome = getSafeStr(c.nome || c.cia);
                if (cNome) {
                    boiadaMap[cNome.toUpperCase()] = { nome: cNome, sum: 0, count: 0 };
                }
            });
        }
        
        const getBullCia = (n) => {
            const explicitCia = getSafeStr(n.cia || n.bullCia);
            if (explicitCia) return explicitCia.toUpperCase();

            const bullName = getSafeStr(n.touro || n.touroNome || n.bullName).toUpperCase();
            if (!bullName || !currentEvent.boiadas || !Array.isArray(currentEvent.boiadas)) return null;

            for (const c of currentEvent.boiadas) {
                const cNome = getSafeStr(c.nome || c.cia);
                if (c.touros && Array.isArray(c.touros)) {
                    if (c.touros.some(t => getSafeStr(t).toUpperCase() === bullName)) {
                        return cNome.toUpperCase();
                    }
                }
            }
            return null;
        };
        
        notas.forEach(n => {
            if (filter !== 'geral' && n.dia !== filter) return;
            const ciaUpper = getBullCia(n);
            if (ciaUpper) {
                if (!boiadaMap[ciaUpper]) {
                    boiadaMap[ciaUpper] = { nome: ciaUpper, sum: 0, count: 0 };
                }
                boiadaMap[ciaUpper].sum += (parseFloat(n.totalTouro) || 0);
                boiadaMap[ciaUpper].count++;
            }
        });
        
        const boiadasData = [];
        for (const [ciaUpper, data] of Object.entries(boiadaMap)) {
            if (data.count > 0) {
                boiadasData.push({ nome: data.nome, saidas: data.count, media: data.sum / data.count });
            }
        }
        rankingData = boiadasData;
    }
    
    rankingData.sort((a, b) => b.media - a.media);
    
    if (rankingData.length === 0) { 
        if (container) container.innerHTML = `<div class="p-20 text-center text-slate-500 italic font-bold">Nenhum animal/boiada qualificado para o filtro atual.</div>`; 
        return; 
    }
    
    const isTouro = type === 'touro';
    
    let html = `<table class="w-full text-left border-collapse">
        <thead class="bg-slate-950/50 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <tr>
                <th class="px-3 py-3 sm:px-8 sm:py-6 w-12 sm:w-20">POS</th>
                <th class="px-3 py-3 sm:px-8 sm:py-6">${isTouro ? 'TOURO' : 'BOIADA (CIA)'}</th>
                ${isTouro ? '<th class="px-3 py-3 sm:px-8 sm:py-6">CIA</th>' : ''}
                <th class="px-3 py-3 sm:px-8 sm:py-6 text-center w-16 sm:w-32">SAÍDAS</th>
                <th class="px-3 py-3 sm:px-8 sm:py-6 text-right w-20 sm:w-32">MÉDIA</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/50">`;
        
    rankingData.forEach((item, idx) => {
        const pos = `${idx + 1}º`;
        const isPodium = idx < 3;
        const rowClass = isPodium ? (idx === 0 ? 'bg-emerald-500/5' : 'bg-slate-800/10') : 'hover:bg-slate-800/20';
        const posClass = idx === 0 ? 'text-emerald-500 font-black' : (idx < 3 ? 'text-white font-black' : 'text-slate-500 font-bold');
        
        html += `<tr class="${rowClass} transition-colors">
            <td class="px-3 py-3 sm:px-8 sm:py-6 ${posClass} italic text-sm sm:text-xl">${pos}</td>
            <td class="px-3 py-3 sm:px-8 sm:py-6"><div class="font-black text-white uppercase text-xs sm:text-lg tracking-tighter truncate max-w-[140px] sm:max-w-none">${item.nome}</div></td>
            ${isTouro ? `<td class="px-3 py-3 sm:px-8 sm:py-6 text-slate-500 font-bold uppercase text-[10px] sm:text-xs truncate max-w-[100px] sm:max-w-none">${item.cia || 'SEM CIA'}</td>` : ''}
            <td class="px-3 py-3 sm:px-8 sm:py-6 text-center text-slate-300 font-bold text-xs sm:text-base">${item.saidas}</td>
            <td class="px-3 py-3 sm:px-8 sm:py-6 text-right">
                <div class="text-sm sm:text-2xl font-black italic text-emerald-500">${item.media.toFixed(2)}</div>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    if (container) container.innerHTML = html;
};

window.exportMelhorCia = async (format = 'excel') => {
    if (!currentEvent || !currentEvent.id) return;
    const notas = (currentEvent.notas || []).filter(n => n && (n.status === 'ativa' || n.status === 'nota_baixa'));
    
    const getSafeStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') return (val.nome || val.name || val.touro || '').trim();
        return String(val).trim();
    };

    const boiadaMap = {}; 
    if (currentEvent.boiadas && Array.isArray(currentEvent.boiadas)) {
        currentEvent.boiadas.forEach(c => {
            const cNome = getSafeStr(c.nome || c.cia);
            if (cNome) {
                boiadaMap[cNome.toUpperCase()] = { nome: cNome, sum: 0, count: 0, touros: [] };
            }
        });
    }
    
    const getBullCia = (n) => {
        const explicitCia = getSafeStr(n.cia || n.bullCia);
        if (explicitCia) return explicitCia.toUpperCase();

        const bullName = getSafeStr(n.touro || n.touroNome || n.bullName).toUpperCase();
        if (!bullName || !currentEvent.boiadas || !Array.isArray(currentEvent.boiadas)) return null;

        for (const c of currentEvent.boiadas) {
            const cNome = getSafeStr(c.nome || c.cia);
            if (c.touros && Array.isArray(c.touros)) {
                if (c.touros.some(t => getSafeStr(t).toUpperCase() === bullName)) {
                    return cNome.toUpperCase();
                }
            }
        }
        return null;
    };
    
    notas.forEach(n => {
        const ciaUpper = getBullCia(n);
        const tNome = getSafeStr(n.touro || n.touroNome || n.bullName);
        const notaVal = parseFloat(n.totalTouro) || 0;

        if (ciaUpper) {
            if (!boiadaMap[ciaUpper]) {
                boiadaMap[ciaUpper] = { nome: ciaUpper, sum: 0, count: 0, touros: [] };
            }
            boiadaMap[ciaUpper].sum += notaVal;
            boiadaMap[ciaUpper].count++;
            boiadaMap[ciaUpper].touros.push({ nome: tNome, dia: n.dia || '', nota: notaVal });
        }
    });
    
    const boiadasData = [];
    for (const [ciaUpper, data] of Object.entries(boiadaMap)) {
        if (data.count > 0) {
            boiadasData.push({ 
                nome: data.nome, 
                saidas: data.count, 
                media: data.sum / data.count, 
                sum: data.sum,
                touros: data.touros 
            });
        }
    }
    
    boiadasData.sort((a, b) => b.media - a.media);

    if (boiadasData.length === 0) return alert("Nenhuma boiada/cia com notas para exportar!");

    const payload = {
        eventName: currentEvent.name || 'EVENTO',
        data: boiadasData,
        format: format
    };

    const loader = document.createElement('div');
    loader.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9999;';
    loader.innerHTML = '<h2 style="color:white; font-style: italic; font-weight: 900; font-size: 2rem;">Exportando Melhor CIA...</h2>';
    document.body.appendChild(loader);

    try {
        const res = await window.electronAPI.exportMelhorCia(payload);
        document.body.removeChild(loader);
        if (res && res.success) alert("Exportado com sucesso!");
        else if (res && !res.canceled) alert("Erro ao exportar: " + res.message);
    } catch (e) {
        document.body.removeChild(loader);
        alert("Erro fatal ao exportar: " + e.message);
    }
};


// --- EXPORT MELHOR ANIMAL ---
async function exportMelhorAnimalPrompt() {
    // 1. Calculate best animals
    if (!currentEvent || !currentEvent.id) return;
    try {
        const getSafeStr = (val) => {
            if (!val) return '';
            if (typeof val === 'string') return val.trim();
            if (typeof val === 'object') return (val.nome || val.name || val.touro || '').trim();
            return String(val).trim();
        };

        const bullsMap = {};
        if (currentEvent.boiadas && Array.isArray(currentEvent.boiadas)) {
            currentEvent.boiadas.forEach(c => {
                const cNome = getSafeStr(c.nome || c.cia || 'Sem Cia');
                if (c.touros && Array.isArray(c.touros)) {
                    c.touros.forEach(t => { 
                        const tNome = getSafeStr(t);
                        if (tNome) bullsMap[tNome.toUpperCase()] = { nome: tNome, cia: cNome }; 
                    });
                }
            });
        }
        
        const notasAtivas = (currentEvent.notas || []).filter(n => n && (n.status === 'ativa' || n.status === 'nota_baixa'));
        
        notasAtivas.forEach(n => {
            const tNome = getSafeStr(n.touro || n.touroNome || n.bullName);
            if (tNome && !bullsMap[tNome.toUpperCase()]) {
                const cNome = getSafeStr(n.cia || n.bullCia || 'Sem Cia');
                bullsMap[tNome.toUpperCase()] = { nome: tNome, cia: cNome };
            }
        });
        
        let validAnimais = [];
        for (const [upperNome, bInfo] of Object.entries(bullsMap)) {
            const peaoNotas = notasAtivas.filter(n => getSafeStr(n.touro || n.touroNome || n.bullName).toUpperCase() === upperNome);
            if (peaoNotas.length === 0) continue;
            
            let sum = 0;
            let montarias = [];
            peaoNotas.forEach(n => {
                let notaVal = parseFloat(n.totalTouro) || 0;
                sum += notaVal;
                montarias.push({ dia: n.dia || 'Desconhecido', nota: notaVal });
            });
            const media = sum / peaoNotas.length;
            
            validAnimais.push({ ...bInfo, saidas: peaoNotas.length, media, montarias });
        }
        
        validAnimais.sort((a, b) => b.media - a.media);
            
        if (validAnimais.length === 0) {
            alert('Não encontramos nenhum animal com notas neste evento.');
            return;
        }

        // Custom prompt function built dynamically for Electron (to bypass prompt() restriction)
        const customPrompt = (title, htmlContent, buttons) => {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = "fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-left";
                
                let btnsHtml = buttons.map(b => `<button id="btn-${b.value}" class="bg-slate-950 border border-slate-800 hover:border-orange-500 hover:bg-orange-500/10 py-5 px-6 rounded-2xl font-black text-white text-sm transition-all">${b.text}</button>`).join('');
                
                modal.innerHTML = `
                <div class="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] max-w-sm w-full shadow-2xl relative text-center">
                    <h2 class="text-2xl font-black italic uppercase text-orange-500 mb-4">${title}</h2>
                    <div class="text-slate-300 font-medium mb-8 text-sm">${htmlContent}</div>
                    <div class="flex flex-col gap-3">
                        ${btnsHtml}
                        <button id="btn-cancel" class="mt-4 text-slate-500 font-bold uppercase text-xs hover:text-white transition-colors">Cancelar</button>
                    </div>
                </div>
                `;
                document.body.appendChild(modal);
                
                buttons.forEach(b => {
                    document.getElementById(`btn-${b.value}`).onclick = () => {
                        document.body.removeChild(modal);
                        resolve(b.value);
                    };
                });
                
                document.getElementById('btn-cancel').onclick = () => {
                    document.body.removeChild(modal);
                    resolve(null);
                };
            });
        };

        let buttons = [{text: 'EXPORTAR TODOS', value: 'all'}];
        if (validAnimais.length >= 3) buttons.push({text: 'TOP 3', value: '3'});
        if (validAnimais.length >= 5) buttons.push({text: 'TOP 5', value: '5'});
        if (validAnimais.length >= 10) buttons.push({text: 'TOP 10', value: '10'});
        
        let limitOption = await customPrompt(
            'Melhor Animal', 
            `Encontramos <b class="text-white">${validAnimais.length}</b> animais elegíveis.<br>Quantos deseja incluir na exportação?`, 
            buttons
        );
        
        if (!limitOption) return;
        
        let selectedAnimais = validAnimais;
        if (limitOption !== 'all') {
            selectedAnimais = validAnimais.slice(0, parseInt(limitOption));
        }

        let format = await customPrompt(
            'Formato', 
            'Escolha o formato do relatório:', 
            [
                {text: 'PDF (.pdf)', value: 'pdf'},
                {text: 'Excel (.xlsx)', value: 'excel'}
            ]
        );
        
        if (!format) return;

        // Call main process
        const eventNameStr = document.getElementById('control-event-name').innerText;
        const result = await window.electronAPI.exportMelhorAnimal({
            eventName: eventNameStr,
            data: selectedAnimais,
            format: format
        });

        if (result.canceled) return;

        if (result.success) {
            alert('Relatório de Melhor Animal gerado com sucesso!');
        } else {
            alert('Erro: ' + result.error);
        }

        } catch(err) {
        console.error(err);
        alert('Erro ao buscar animais para exportação: ' + err.message);
    }
}


// --- AUTO UPDATER UI ---
const updaterToast = document.getElementById('updater-toast');
const updaterTitle = document.getElementById('updater-title');
const updaterDesc = document.getElementById('updater-desc');
const updaterIcon = document.getElementById('updater-icon');
const updaterProgressContainer = document.getElementById('updater-progress-container');
const updaterProgressBar = document.getElementById('updater-progress-bar');
const btnInstallUpdate = document.getElementById('btn-install-update');

function showUpdaterToast() {
    if (!updaterToast) return;
    updaterToast.classList.remove('hidden');
    setTimeout(() => {
        updaterToast.classList.remove('translate-y-full', 'opacity-0');
    }, 50);
}

window.hideUpdaterToast = function() {
    if (!updaterToast) return;
    updaterToast.classList.add('translate-y-full', 'opacity-0');
    setTimeout(() => updaterToast.classList.add('hidden'), 300);
};

if (window.electronAPI && window.electronAPI.onUpdaterEvent) {
    window.electronAPI.onUpdaterEvent((data) => {
        if (data.type === 'debug') {
            console.log(data.message);
        }
        
        if (!updaterToast) return;
        
        if (data.type === 'update-available') {
            console.log('RODEOAPP: Evento update-available recebido!');
            showUpdaterToast();
            updaterTitle.innerText = "Nova Atualização";
            updaterDesc.innerText = "Baixando nova versão...";
            updaterIcon.className = "w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center animate-spin";
            updaterIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`;
            updaterProgressContainer.classList.remove('hidden');
            window.electronAPI.downloadUpdate();
        }
        
        if (data.type === 'update-not-available') {
            console.log('RODEOAPP: Evento update-not-available recebido!');
            showUpdaterToast();
            updaterTitle.innerText = "Sistema Atualizado";
            updaterDesc.innerText = "Você já está na última versão!";
            updaterIcon.className = "w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center";
            updaterIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
            setTimeout(hideUpdaterToast, 4000);
        }
        
        if (data.type === 'download-progress') {
            console.log('RODEOAPP: Evento download-progress recebido! ' + (data.progress.percent || 0) + '%');
            let percent = data.progress.percent || 0;
            updaterProgressBar.style.width = percent + '%';
            updaterDesc.innerText = `Baixando: ${Math.round(percent)}%`;
        }
        
        if (data.type === 'update-downloaded') {
            console.log('RODEOAPP: Evento update-downloaded recebido!');
            updaterIcon.className = "w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center";
            updaterIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
            updaterTitle.innerText = "Download Concluído";
            updaterDesc.innerText = "Pronto para instalar.";
            updaterProgressContainer.classList.add('hidden');
            btnInstallUpdate.classList.remove('hidden');
        }
        
        if (data.type === 'error') {
            console.log('RODEOAPP: Evento de ERRO no updater:', data.message);
            // Don't show toast for every silent error, but if it was already showing, tell them it failed
            if (!updaterToast.classList.contains('hidden')) {
                updaterIcon.className = "w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center";
                updaterIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
                updaterTitle.innerText = "Erro no Update";
                updaterDesc.innerText = "Falha ao baixar.";
                updaterProgressContainer.classList.add('hidden');
                setTimeout(() => {
                    updaterToast.classList.add('translate-y-full', 'opacity-0');
                    setTimeout(() => updaterToast.classList.add('hidden'), 300);
                }, 4000);
            }
        }
    });
}

// --- CLOUD BOIADAS IMPORT SYSTEM ---
window.openCloudBoiadas = async () => {
    const modal = document.getElementById('modal-cloud-boiadas');
    if (modal) modal.classList.remove('hidden');
    
    const list = document.getElementById('cloud-boiadas-list');
    if (list) list.innerHTML = '<div class="text-white/30 text-center py-10 font-black uppercase tracking-widest text-xs">Conectando ao Servidor Oficial...</div>';
    
    try {
        const url = 'https://api.rodeoapp.pro/rest/v1/boiadas_oficiais?select=*&order=nome';
        const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';
        
        const response = await fetch(url, {
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        if (!response.ok) throw new Error('Erro ao conectar com servidor oficial');
        const data = await response.json();
        
        if (data.length === 0) {
            if (list) list.innerHTML = '<div class="text-white/30 text-center py-10 font-black uppercase tracking-widest text-xs">Nenhuma boiada cadastrada no servidor.</div>';
            return;
        }
        
        if (list) {
            list.innerHTML = '';
            data.forEach(b => {
                const total = Object.keys(b.lados || {}).length;
                const btn = document.createElement('button');
                btn.className = 'w-full text-left bg-black border border-slate-800 p-6 rounded-2xl flex justify-between items-center group hover:border-indigo-500 hover:bg-indigo-500/10 transition-all mb-3';
                btn.innerHTML = `
                    <div>
                        <div class="font-black uppercase text-white mb-1 text-lg group-hover:text-indigo-400">${b.nome}</div>
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${total} TOUROS</div>
                    </div>
                    <div class="bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                        IMPORTAR CIA
                    </div>
                `;
                btn.onclick = () => importCloudBoiada(b);
                list.appendChild(btn);
            });
        }
        
    } catch(err) {
        if (list) list.innerHTML = `<div class="text-red-500/50 text-center py-10 font-black uppercase tracking-widest text-xs">${err.message}</div>`;
    }
};

window.importCloudBoiada = async (boiadaData) => {
    const nome = boiadaData.nome;
    const lados = boiadaData.lados || {};
    const touros = Object.keys(lados);
    
    currentEvent.boiadas = currentEvent.boiadas || [];
    // Sobrescreve a boiada se ela já existir
    currentEvent.boiadas = currentEvent.boiadas.filter(c => c.nome !== nome);
    
    currentEvent.boiadas.push({
        nome: nome,
        touros: touros,
        lados: lados
    });
    
    const email = getCurrentUserEmail();
    await window.persistAndSyncEvent(currentEvent);
    
    document.getElementById('modal-cloud-boiadas').classList.add('hidden');
    document.getElementById('modal-boiada').classList.add('hidden');
    openListBoiadas();
    
    alert(`Boiada Oficial "${nome}" baixada com sucesso!\n${touros.length} touros importados pro seu evento.`);
};


// --- SETTINGS MODAL ---
window.openSettingsModal = () => {
    const auth = window.electronAPI.getAuth();
    if (auth && auth.nome) {
        document.getElementById('profile-name-input').value = auth.nome;
    }
    document.getElementById('modal-settings').classList.remove('hidden');
    switchSettingsTab('profile');
    renderGlobalPeoes();
    renderGlobalBoiadas();
};

window.closeSettingsModal = () => {
    document.getElementById('modal-settings').classList.add('hidden');
};

window.switchSettingsTab = (tab) => {
    ['profile', 'peoes', 'boiadas'].forEach(t => {
        document.getElementById(`settings-tab-${t}`).classList.add('hidden');
        const btn = document.getElementById(`tab-btn-${t}`);
        btn.className = "px-6 py-2 rounded-xl text-xs font-black uppercase transition-all text-slate-400 hover:text-white";
    });
    
    document.getElementById(`settings-tab-${tab}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-btn-${tab}`);
    activeBtn.className = "px-6 py-2 rounded-xl text-xs font-black uppercase transition-all bg-yellow-500 text-black";
};

document.getElementById('form-profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('profile-name-input').value.trim();
    if (!newName) return;
    
    const email = getCurrentUserEmail();
    const res = await window.electronAPI.updateProfileName(email, newName);
    if (res.success) {
        let auth = window.electronAPI.getAuth();
        auth.nome = newName;
        window.electronAPI.saveAuth(auth);
        alert('Nome atualizado com sucesso!');
        // Update any UI showing the name if applicable
    } else {
        alert('Erro ao atualizar nome: ' + res.message);
    }
});

// GLOBAL PEOES
window.renderGlobalPeoes = () => {
    const container = document.getElementById('global-peoes-list');
    const search = document.getElementById('search-global-peoes').value.toUpperCase();
    
    const filtered = globalPeoes.map((p, index) => ({...p, originalIndex: index}))
                                .filter(p => p.nome.toUpperCase().includes(search) || (p.cpf && p.cpf.includes(search)));
                                
    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-500 font-bold italic">Nenhum peão encontrado no Banco Global.</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center hover:bg-slate-800/30">
            <div>
                <h4 class="text-sm font-bold text-white uppercase">${p.nome}</h4>
                <p class="text-[10px] text-slate-400 font-medium uppercase">${p.cidade || '---'} ${p.cpf ? '| ' + p.cpf : ''}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editGlobalPeao(${p.originalIndex})" class="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                <button onclick="deleteGlobalPeao(${p.originalIndex})" class="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
        </div>
    `).join('');
};

document.getElementById('search-global-peoes').addEventListener('input', debounce(renderGlobalPeoes, 120));

window.editGlobalPeao = (idx) => {
    const p = globalPeoes[idx];
    document.getElementById('global-peao-idx').value = idx;
    document.getElementById('global-peao-name').value = p.nome;
    document.getElementById('global-peao-city').value = p.cidade;
    document.getElementById('global-peao-cpf').value = p.cpf || '';
    document.getElementById('modal-global-peao').classList.remove('hidden');
};

window.closeModalGlobalPeao = () => {
    document.getElementById('modal-global-peao').classList.add('hidden');
};

document.getElementById('form-global-peao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('global-peao-idx').value);
    const peao = {
        nome: document.getElementById('global-peao-name').value.toUpperCase().trim(),
        cidade: document.getElementById('global-peao-city').value.toUpperCase().trim(),
        cpf: document.getElementById('global-peao-cpf').value.trim()
    };
    await window.electronAPI.updateGlobalPeao(getCurrentUserEmail(), idx, peao);
    await fetchGlobalData();
    renderGlobalPeoes();
    closeModalGlobalPeao();
});

window.deleteGlobalPeao = async (idx) => {
    if (confirm("Excluir este peão do banco global? Ele não aparecerá mais na busca.")) {
        await window.electronAPI.deleteGlobalPeao(getCurrentUserEmail(), idx);
        await fetchGlobalData();
        renderGlobalPeoes();
    }
};

// GLOBAL BOIADAS
window.renderGlobalBoiadas = () => {
    const container = document.getElementById('global-boiadas-list');
    const search = document.getElementById('search-global-boiadas').value.toUpperCase();
    
    const filtered = globalBoiadas.map((b, index) => ({...b, originalIndex: index}))
                                  .filter(b => b.nome.toUpperCase().includes(search));
                                  
    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-500 font-bold italic">Nenhuma boiada encontrada no Banco Global.</div>`;
        return;
    }

    container.innerHTML = filtered.map(b => `
        <div class="px-6 py-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800/50">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-sm font-bold text-white uppercase">${b.nome}</h4>
                <div class="flex gap-2">
                    <button onclick="editGlobalBoiada(${b.originalIndex})" class="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                    <button onclick="deleteGlobalBoiada(${b.originalIndex})" class="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
            </div>
            <div class="text-[10px] text-slate-400 font-medium uppercase">${(b.touros || []).length} touros cadastrados</div>
        </div>
    `).join('');
};

document.getElementById('search-global-boiadas').addEventListener('input', debounce(renderGlobalBoiadas, 120));

window.editGlobalBoiada = (idx) => {
    const b = globalBoiadas[idx];
    document.getElementById('global-boiada-idx').value = idx;
    document.getElementById('global-boiada-cia').value = b.nome || '';

    const certoList = [];
    const erradoList = [];
    (b.touros || []).forEach(t => {
        if (b.lados && b.lados[t] === 'E') {
            erradoList.push(t);
        } else {
            certoList.push(t);
        }
    });

    const inputCerto = document.getElementById('global-touros-certo');
    const inputErrado = document.getElementById('global-touros-errado');
    if (inputCerto) inputCerto.value = certoList.join('\n');
    if (inputErrado) inputErrado.value = erradoList.join('\n');

    document.getElementById('modal-global-boiada').classList.remove('hidden');
};

window.closeModalGlobalBoiada = () => {
    document.getElementById('modal-global-boiada').classList.add('hidden');
};

document.getElementById('form-global-boiada').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('global-boiada-idx').value);
    const nome = document.getElementById('global-boiada-cia').value.toUpperCase().trim();
    if (!nome) return;
    
    const inputCerto = document.getElementById('global-touros-certo');
    const inputErrado = document.getElementById('global-touros-errado');

    const tourosCerto = inputCerto ? inputCerto.value.split('\n').map(t => t.trim().toUpperCase()).filter(t => t !== '') : [];
    const tourosErrado = inputErrado ? inputErrado.value.split('\n').map(t => t.trim().toUpperCase()).filter(t => t !== '') : [];

    const allTouros = [...tourosCerto, ...tourosErrado];
    if (allTouros.length === 0) {
        return alert("Insira ao menos um touro!");
    }
        
    const newLados = {};
    tourosCerto.forEach(t => newLados[t] = 'C');
    tourosErrado.forEach(t => newLados[t] = 'E');
    
    const boiada = { nome, touros: allTouros, lados: newLados };
    await window.electronAPI.updateGlobalBoiada(getCurrentUserEmail(), idx, boiada);
    await fetchGlobalData();
    renderGlobalBoiadas();
    closeModalGlobalBoiada();
});

window.deleteGlobalBoiada = async (idx) => {
    if (confirm("Excluir esta companhia do banco global? Ela não aparecerá mais na busca.")) {
        await window.electronAPI.deleteGlobalBoiada(getCurrentUserEmail(), idx);
        await fetchGlobalData();
        renderGlobalBoiadas();
    }
};



window.sendEventToPortal = async (id) => {
    if (!confirm('Deseja enviar os dados deste evento (incluindo o ranking atual) para o Portal Oficial na nuvem? Ele ficará aguardando aprovação no painel.')) return;
    
    const email = getCurrentUserEmail();
    const btnText = document.querySelector(`button[onclick*="sendEventToPortal('${id}')"]`);
    const btnSyncDash = document.getElementById('btn-sync-dashboard');
    const originalTextDash = btnSyncDash ? btnSyncDash.innerHTML : '';
    
    if (btnText) btnText.innerHTML = `<span class="animate-pulse">Enviando...</span>`;
    if (btnSyncDash) btnSyncDash.innerHTML = `<span class="animate-pulse">Sincronizando...</span>`;

    try {
        const res = await window.electronAPI.sendEventToPortal({ email, eventId: id });
        if (res.success) {
            alert('Evento enviado com sucesso! Agora é só aprovar no Painel Admin.');
        } else {
            alert('Erro ao enviar evento: ' + (res.error || 'Desconhecido'));
        }
    } catch (e) {
        alert('Erro ao conectar com a nuvem.');
        console.error(e);
    } finally {
        if (btnSyncDash) btnSyncDash.innerHTML = originalTextDash;
        renderEvents();
    }
};

window.executePullEvent = async (e) => {
    e.preventDefault();
    const shareId = document.getElementById('pull-share-id').value;
    const password = document.getElementById('pull-share-password').value;
    const email = getCurrentUserEmail();

    const originalLoadingTitle = document.querySelector('#modal-loading h2').innerText;
    const originalLoadingDesc = document.querySelector('#modal-loading p').innerText;
    
    document.querySelector('#modal-loading h2').innerText = "IMPORTANDO EVENTO";
    document.querySelector('#modal-loading p').innerText = "Buscando dados na nuvem, aguarde...";
    document.getElementById('modal-loading').classList.remove('hidden');
    document.getElementById('modal-pull-event').classList.add('hidden');

    try {
        const res = await window.electronAPI.pullEventFromCloud({ email, shareId, password });
        if (res.success) {
            await showAlert(`Evento "${res.eventName}" importado com sucesso!`, "SUCESSO");
            document.getElementById('form-pull-event').reset();
            renderEvents();
            
            // Recarrega a lista de eventos da transmissão se o modal estiver aberto
            const transEventsModal = document.getElementById('modal-transmissao-eventos');
            if (transEventsModal && !transEventsModal.classList.contains('hidden')) {
                openTransmissaoEventsModal();
            }
        } else {
            await showAlert("Erro ao importar evento: " + (res.error || "Erro desconhecido"), "ERRO");
            document.getElementById('modal-pull-event').classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        await showAlert("Erro na conexão com a nuvem.", "ERRO");
        document.getElementById('modal-pull-event').classList.remove('hidden');
    } finally {
        document.getElementById('modal-loading').classList.add('hidden');
        document.querySelector('#modal-loading h2').innerText = originalLoadingTitle;
        document.querySelector('#modal-loading p').innerText = originalLoadingDesc;
    }
};

let currentSharingEventId = null;

window.promptShareEvent = async (eventId) => {
    currentSharingEventId = eventId;
    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    const ev = eventos.find(e => e.id === eventId);
    if (!ev) return;

    let shareId = ev.share_id;
    if (!shareId) {
        const cleanName = ev.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const randNum = Math.floor(10000000 + Math.random() * 90000000);
        shareId = `${cleanName}-${randNum}`;
    }

    document.getElementById('share-display-id').value = shareId;
    document.getElementById('share-input-password').value = ev.share_password || '';
    document.getElementById('modal-share-event').classList.remove('hidden');
};

window.executeShareEvent = async (e) => {
    e.preventDefault();
    if (!currentSharingEventId) return;

    const password = document.getElementById('share-input-password').value;
    const email = getCurrentUserEmail();

    const originalLoadingTitle = document.querySelector('#modal-loading h2').innerText;
    const originalLoadingDesc = document.querySelector('#modal-loading p').innerText;
    
    document.querySelector('#modal-loading h2').innerText = "COMPARTILHANDO EVENTO";
    document.querySelector('#modal-loading p').innerText = "Sincronizando dados com a nuvem, aguarde...";
    document.getElementById('modal-loading').classList.remove('hidden');
    document.getElementById('modal-share-event').classList.add('hidden');

    try {
        const res = await window.electronAPI.shareEventToCloud({ email, eventId: currentSharingEventId, password });
        if (res.success) {
            document.getElementById('form-share-event').reset();
            
            // Exibir modal de sucesso com dados preenchidos
            document.getElementById('success-display-id').value = res.shareId;
            document.getElementById('success-display-password').value = password;
            document.getElementById('modal-share-success').classList.remove('hidden');
            
            renderEvents();
        } else {
            await showAlert("Erro ao compartilhar evento: " + (res.error || "Erro desconhecido"), "ERRO");
            document.getElementById('modal-share-event').classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        await showAlert("Erro na conexão com a nuvem.", "ERRO");
        document.getElementById('modal-share-event').classList.remove('hidden');
    } finally {
        document.getElementById('modal-loading').classList.add('hidden');
        document.querySelector('#modal-loading h2').innerText = originalLoadingTitle;
        document.querySelector('#modal-loading p').innerText = originalLoadingDesc;
    }
};

window.copyToClipboard = (elementId) => {
    const inputEl = document.getElementById(elementId);
    if (!inputEl) return;
    
    inputEl.select();
    inputEl.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(inputEl.value).then(() => {
        const btn = inputEl.nextElementSibling;
        if (btn) {
            const origHTML = btn.innerHTML;
            btn.innerHTML = `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
            setTimeout(() => {
                btn.innerHTML = origHTML;
            }, 1500);
        }
    }).catch(err => {
        console.error('Falha ao copiar:', err);
    });
};

window.copyAllShareInfo = () => {
    const shareId = document.getElementById('success-display-id').value;
    const password = document.getElementById('success-display-password').value;
    const copyText = `ID do Evento: ${shareId}\nSenha: ${password}`;
    
    navigator.clipboard.writeText(copyText).then(() => {
        const copyBtn = document.querySelector('button[onclick="copyAllShareInfo()"]');
        if (copyBtn) {
            const origHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg> Copiado!`;
            setTimeout(() => {
                copyBtn.innerHTML = origHTML;
            }, 1500);
        }
    }).catch(err => {
        console.error('Falha ao copiar:', err);
    });
};

window.openTransmissaoEventsModal = async () => {
    const email = getCurrentUserEmail();
    const container = document.getElementById('transmissao-events-list-container');
    if (!container) return;

    document.getElementById('modal-transmissao-eventos').classList.remove('hidden');
    
    const events = await window.electronAPI.getLocalEvents(email);
    
    if (!events || events.length === 0) {
        container.innerHTML = '<div class="col-span-2 p-20 text-center text-slate-500 italic font-bold">Nenhum evento carregado para a transmissão. Puxe um evento existente usando ID e Senha!</div>';
        return;
    }

    let html = '';
    events.forEach(ev => {
        html += `
        <div onclick="document.getElementById('modal-transmissao-eventos').classList.add('hidden'); if(document.getElementById('transmissao-screen')) document.getElementById('transmissao-screen').classList.add('hidden'); openTransmissaoEventControl('${ev.id}')" class="w-full cursor-pointer glass p-8 rounded-[2.5rem] border-white/5 flex justify-between items-start text-left hover:border-accent transition-all relative group">
            <div class="flex gap-6 items-start">
                ${ev.logo ? `<img src="${ev.logo}" class="w-16 h-16 object-contain rounded-2xl bg-black/40 p-2 border border-white/10 shadow-lg">` : `<div class="w-16 h-16 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-slate-700 font-black italic text-[10px]">LOGO</div>`}
                <div>
                    <div class="text-[9px] font-black text-accent uppercase tracking-widest mb-1">${ev.type || 'EVENTO'}</div>
                    <h4 class="text-2xl font-black italic mb-1 uppercase tracking-tighter text-white">${ev.name}</h4>
                    <p class="text-slate-500 font-bold text-xs uppercase">${ev.city}</p>
                    ${ev.share_id ? `<div class="text-[9px] text-slate-500 font-bold font-mono mt-2 uppercase tracking-wide">ID: ${ev.share_id}</div>` : ''}
                </div>
            </div>
            <div class="text-[10px] font-black bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400">${ev.days}D / ${ev.judges}J</div>
        </div>`;
    });
    container.innerHTML = html;
};

window.openPullEventFromTransmissao = () => {
    const pullModal = document.getElementById('modal-pull-event');
    if (pullModal) {
        pullModal.classList.remove('hidden');
        document.getElementById('pull-share-id')?.focus();
    }
};

window.showAlert = (message, title = "AVISO") => {
    return new Promise((resolve) => {
        document.getElementById('modal-alert-title').innerText = title;
        document.getElementById('modal-alert-message').innerText = message;
        document.getElementById('modal-alert').classList.remove('hidden');
        
        window.closeModalAlert = () => {
            document.getElementById('modal-alert').classList.add('hidden');
            resolve();
        };
    });
};

window.openTransmissaoEventControl = async (id) => {
    const email = getCurrentUserEmail();
    const eventos = await window.electronAPI.getLocalEvents(email);
    currentEvent = eventos.find(e => e.id === id);
    if (!currentEvent) return;
    window.currentEvent = currentEvent;

    // APLICAR COR DO EVENTO
    applyThemeColor(currentEvent.themeColor || '#EAB308');

    document.getElementById('transmissao-event-name').innerText = currentEvent.name;
    document.getElementById('transmissao-event-info').innerText = `${currentEvent.city} - ${currentEvent.days} DIAS - ${currentEvent.judges} JUIZES`;
    
    const tv = document.getElementById('transmissao-event-view');
    if (tv) tv.classList.remove('hidden');
};

window.closeTransmissaoEventControl = () => {
    const tv = document.getElementById('transmissao-event-view');
    if (tv) tv.classList.add('hidden');
    
    window.hideAllModalsAndViews();
    
    applyThemeColor('#EAB308'); // Volta para o Dourado RODEOAPP
    
    const transmissaoScreen = document.getElementById('transmissao-screen');
    if (transmissaoScreen) transmissaoScreen.classList.remove('hidden');
    
    const modalTrans = document.getElementById('modal-transmissao-eventos');
    if (modalTrans) modalTrans.classList.remove('hidden');
};

// --- CONTROLES DE OVERLAY (OBS/vMix) ---
window.openOverlaySettingsList = async () => {
    const email = getCurrentUserEmail();
    const container = document.getElementById('overlay-settings-events-list');
    if (!container) return;

    document.getElementById('overlay-settings-list-screen').classList.remove('hidden');
    
    const events = await window.electronAPI.getLocalEvents(email);
    
    if (!events || events.length === 0) {
        container.innerHTML = '<div class="col-span-2 p-20 text-center text-slate-500 italic font-bold">Nenhum evento carregado para configurar.</div>';
        return;
    }

    let html = '';
    events.forEach(ev => {
        html += `
        <div onclick="openOverlayConfigForm('${ev.id}')" class="w-full cursor-pointer glass p-8 rounded-[2.5rem] border-white/5 flex justify-between items-start text-left hover:border-yellow-500 transition-all relative group">
            <div class="flex gap-6 items-start">
                ${ev.logo ? `<img src="${ev.logo}" class="w-16 h-16 object-contain rounded-2xl bg-black/40 p-2 border border-white/10 shadow-lg">` : `<div class="w-16 h-16 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-center text-slate-700 font-black italic text-[10px]">LOGO</div>`}
                <div>
                    <h4 class="text-2xl font-black italic mb-1 uppercase tracking-tighter text-white">${ev.name}</h4>
                    <p class="text-slate-500 font-bold text-xs uppercase">${ev.city}</p>
                </div>
            </div>
            <div class="text-xs font-black text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-xl">CONFIGURAR MÍDIAS</div>
        </div>`;
    });
    container.innerHTML = html;
};

window.closeOverlaySettingsList = () => {
    document.getElementById('overlay-settings-list-screen').classList.add('hidden');
};

let currentOverlayEventId = null;

window.openOverlayConfigForm = async (id) => {
    document.getElementById('overlay-settings-list-screen').classList.add('hidden');
    document.getElementById('overlay-settings-config-screen').classList.remove('hidden');
    
    const email = getCurrentUserEmail();
    const events = await window.electronAPI.getLocalEvents(email);
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    
    currentOverlayEventId = id;
    document.getElementById('overlay-config-event-name').innerText = ev.name;
    
    // Configurações atuais ou padrão
    const overlaySettings = ev.overlaySettings || { color: '#EAB308', logos: [], sponsors: [] };
    document.getElementById('overlay-color-picker').value = overlaySettings.color;
    
    renderOverlayMedia(overlaySettings);
};

window.closeOverlayConfigForm = () => {
    document.getElementById('overlay-settings-config-screen').classList.add('hidden');
    document.getElementById('overlay-settings-list-screen').classList.remove('hidden');
    currentOverlayEventId = null;
};

window.saveOverlayColor = async () => {
    if (!currentOverlayEventId) return;
    const color = document.getElementById('overlay-color-picker').value;
    
    const email = getCurrentUserEmail();
    const events = await window.electronAPI.getLocalEvents(email);
    const ev = events.find(e => e.id === currentOverlayEventId);
    
    if (!ev.overlaySettings) ev.overlaySettings = { color: '#EAB308', logos: [], sponsors: [] };
    ev.overlaySettings.color = color;
    
    await window.electronAPI.updateLocalEvent(email, currentOverlayEventId, ev);
    await showAlert('Cor do evento atualizada com sucesso!', 'SUCESSO');
};

window.handleMediaUpload = async (event, type) => {
    if (!currentOverlayEventId) return;
    const fileInput = event.target;
    if (fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    const email = getCurrentUserEmail();
    const events = await window.electronAPI.getLocalEvents(email);
    const ev = events.find(e => e.id === currentOverlayEventId);
    
    document.getElementById('modal-loading').classList.remove('hidden');
    try {
        const result = await window.electronAPI.uploadMedia(file.path);
        if (result.success) {
            if (!ev.overlaySettings) ev.overlaySettings = { color: '#EAB308', logos: [], sponsors: [] };
            if (type === 'logo') {
                ev.overlaySettings.logos.push(result.url);
            } else if (type === 'video') {
                ev.overlaySettings.sponsors.push(result.url);
            }
            await window.electronAPI.updateLocalEvent(email, currentOverlayEventId, ev);
            renderOverlayMedia(ev.overlaySettings);
        } else {
            await showAlert('Erro ao enviar arquivo: ' + result.error, 'ERRO');
        }
    } catch (e) {
        await showAlert('Falha ao comunicar com sistema de arquivos.', 'ERRO');
    } finally {
        document.getElementById('modal-loading').classList.add('hidden');
        fileInput.value = ''; // reseta
    }
};

window.deleteOverlayMedia = async (url, type) => {
    if (!currentOverlayEventId) return;
    
    const email = getCurrentUserEmail();
    const events = await window.electronAPI.getLocalEvents(email);
    const ev = events.find(e => e.id === currentOverlayEventId);
    
    if (!ev || !ev.overlaySettings) return;
    
    if (type === 'logo') {
        ev.overlaySettings.logos = ev.overlaySettings.logos.filter(l => l !== url);
    } else {
        ev.overlaySettings.sponsors = ev.overlaySettings.sponsors.filter(s => s !== url);
    }
    
    await window.electronAPI.updateLocalEvent(email, currentOverlayEventId, ev);
    renderOverlayMedia(ev.overlaySettings);
    
    // Opcional: deletar arquivo fisicamente
    const fileName = url.replace('/media/', '');
    await window.electronAPI.deleteMedia(fileName);
};

function renderOverlayMedia(settings) {
    const logosContainer = document.getElementById('overlay-logos-container');
    const videosContainer = document.getElementById('overlay-videos-container');
    
    if (logosContainer) {
        logosContainer.innerHTML = (settings.logos || []).map(url => `
            <div class="relative group w-24 h-24 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                <img src="http://localhost:3005${url}" class="w-full h-full object-contain p-2">
                <div class="absolute inset-0 bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onclick="deleteOverlayMedia('${url}', 'logo')">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </div>
            </div>`
        ).join('');
    }
    
    if (videosContainer) {
        videosContainer.innerHTML = (settings.sponsors || []).map(url => `
            <div class="relative group w-full aspect-video bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                <video src="http://localhost:3005${url}" class="w-full h-full object-cover opacity-50" autoplay muted loop></video>
                <div class="absolute inset-0 flex items-center justify-center">
                    <svg class="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                </div>
                <div class="absolute inset-0 bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onclick="deleteOverlayMedia('${url}', 'video')">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </div>
            </div>`
        ).join('');
    }
}

window.copyOBSLink = async () => {
    try {
        await navigator.clipboard.writeText('http://localhost:3005/');
        await showAlert('Link copiado! Cole no OBS Studio como uma Fonte de Navegador (Browser Source) com fundo transparente ou aplique o filtro Chroma Key no verde (#00FF00).', 'COPIADO');
    } catch (err) {
        await showAlert('Não foi possível copiar o link. O link é: http://localhost:3005/', 'ERRO');
    }
};

window.triggerOverlay = async (action, mode = '') => {
    let payload = { action, mode, data: [], settings: null };

    if (action === 'clear') {
        window.electronAPI.sendOverlayCommand(payload);
        return;
    }

    if (!currentEvent) {
        await showAlert('Nenhum evento selecionado para extrair dados.', 'ERRO');
        return;
    }

    // Incluir as configurações do evento atual
    payload.settings = currentEvent.overlaySettings || { color: '#EAB308', logos: [], sponsors: [] };

    if (action === 'show_competidores') {
        if (!currentEvent.peoes || currentEvent.peoes.length === 0) {
            await showAlert('Não há competidores neste evento.', 'AVISO');
            return;
        }
        payload.data = currentEvent.peoes; // Enviamos a lista de peões
    }

    if (action === 'show_ranking') {
        if (!currentEvent.peoes || currentEvent.peoes.length === 0) {
            await showAlert('Não há competidores para o ranking.', 'AVISO');
            return;
        }
        // Clona e envia para não mutar localmente
        payload.data = [...currentEvent.peoes];
    }

    window.electronAPI.sendOverlayCommand(payload);
};

// --- CONTROLE TABLET (Desktop & Mac App para g7briell@hotmail.com) ---
let desktopTabletDiaAtivo = 'DIA 1';
let desktopTabletNoticias = [];
let desktopTabletAberturaCompetidoresDestaque = [];

window.getDesktopEventCompetitors = (ev) => {
    if (!ev) return [];
    const set = new Set();

    if (Array.isArray(ev.sorteios)) {
        ev.sorteios.forEach(s => {
            const riders = s.riders || s.peoes || s.competidores || s.peoes_lista || s.bulls || [];
            riders.forEach(r => {
                const name = typeof r === 'string' ? r : (r.nome || r.name || r.peao);
                if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
            });
        });
    }

    const montarias = [...(ev.notas || []), ...(ev.notes || []), ...(ev.montarias || []), ...(ev.peoes || [])];
    montarias.forEach(m => {
        const name = typeof m === 'string' ? m : (m.peao || m.competidor || m.rider || m.nome);
        if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
};

window.openTabletControlModal = async () => {
    if (!currentEvent) return;

    document.getElementById('tablet-modal-event-name').innerText = currentEvent.name;

    const tc = currentEvent.tablet_config || {};
    desktopTabletDiaAtivo = tc.dia_ativo || 'DIA 1';
    desktopTabletNoticias = tc.noticias || [];
    
    document.getElementById('desktop-tablet-ticker-input').value = tc.ticker_noticias || tc.ticker || '';
    document.getElementById('desktop-tablet-abertura-ativa').checked = !!tc.abertura_ativa;
    document.getElementById('desktop-tablet-abertura-titulo').value = tc.abertura_titulo || 'ABERTURA OFICIAL';
    document.getElementById('desktop-tablet-abertura-subtitulo').value = tc.abertura_subtitulo || currentEvent.name || 'RODEOAPP';
    document.getElementById('desktop-tablet-abertura-url').value = tc.abertura_midia_url || '';
    document.getElementById('desktop-tablet-abertura-texto').value = tc.abertura_texto || '';

    const savedComps = tc.abertura_competidores_destaque || tc.competidores_destaque;
    const eventComps = getDesktopEventCompetitors(currentEvent);

    if (Array.isArray(savedComps)) {
        desktopTabletAberturaCompetidoresDestaque = [...savedComps];
    } else {
        desktopTabletAberturaCompetidoresDestaque = [];
    }

    renderDesktopTabletDays(parseInt(currentEvent.days) || 3);
    renderDesktopTabletNoticias();
    renderDesktopEventCompetitorsChips(eventComps);
    renderDesktopActiveCompetitorsBadges();

    document.getElementById('modal-tablet-control').classList.remove('hidden');
};

window.renderDesktopTabletDays = (numDays) => {
    const container = document.getElementById('desktop-tablet-days-container');
    if (!container) return;

    let daysList = [];
    for (let i = 1; i <= numDays; i++) {
        daysList.push(`DIA ${i}`);
    }
    daysList.push('FINAL');

    container.innerHTML = daysList.map(day => {
        const isActive = desktopTabletDiaAtivo === day;
        return `
            <button type="button" onclick="setDesktopTabletDiaAtivo('${day}')" class="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${
                isActive
                    ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'bg-black border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }">
                ${isActive ? '✓ ' : ''}${day}
            </button>
        `;
    }).join('');
};

window.setDesktopTabletDiaAtivo = (day) => {
    desktopTabletDiaAtivo = day;
    renderDesktopTabletDays(parseInt(currentEvent.days) || 3);
};

window.renderDesktopTabletNoticias = () => {
    const container = document.getElementById('desktop-tablet-noticias-list');
    if (!container) return;

    if (desktopTabletNoticias.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhum aviso ou notícia cadastrado no letreiro.</p>`;
        return;
    }

    container.innerHTML = desktopTabletNoticias.map((item, idx) => `
        <div class="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-slate-800 text-xs text-white">
            <span>• ${item}</span>
            <button type="button" onclick="removeDesktopTabletNoticia(${idx})" class="text-red-400 hover:text-red-300 font-bold uppercase text-[10px] ml-2">✕ Remover</button>
        </div>
    `).join('');
};

window.addDesktopTabletNoticia = () => {
    const input = document.getElementById('desktop-tablet-ticker-input');
    const val = input.value.trim();
    if (!val) return;
    desktopTabletNoticias.push(val);
    input.value = '';
    renderDesktopTabletNoticias();
};

window.removeDesktopTabletNoticia = (idx) => {
    desktopTabletNoticias.splice(idx, 1);
    renderDesktopTabletNoticias();
};

window.renderDesktopEventCompetitorsChips = (eventComps) => {
    const container = document.getElementById('desktop-event-competitors-chips');
    if (!container) return;

    if (eventComps.length === 0) {
        container.innerHTML = `<p class="text-[11px] text-slate-500 italic">Nenhum competidor cadastrado neste evento.</p>`;
        return;
    }

    container.innerHTML = eventComps.map(comp => {
        const isSelected = desktopTabletAberturaCompetidoresDestaque.includes(comp);
        return `
            <button type="button" onclick="toggleEventCompetidorDesktop('${comp.replace(/'/g, "\\'")}')" class="px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase transition-all border flex items-center gap-1 ${
                isSelected
                    ? 'bg-yellow-500 text-black border-yellow-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }">
                <span>${isSelected ? '✓' : '+'}</span>
                <span>${comp}</span>
            </button>
        `;
    }).join('');
};

window.renderDesktopActiveCompetitorsBadges = () => {
    const container = document.getElementById('desktop-active-competitors-badges');
    if (!container) return;

    if (desktopTabletAberturaCompetidoresDestaque.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhum competidor em destaque selecionado.</p>`;
        return;
    }

    container.innerHTML = desktopTabletAberturaCompetidoresDestaque.map((comp, idx) => `
        <div class="bg-yellow-500/10 border border-yellow-500/40 px-3 py-1 rounded-full text-xs font-black text-yellow-400 flex items-center gap-2 uppercase tracking-wider">
            <span>⭐ ${comp}</span>
            <button type="button" onclick="removeTabletCompetidorDesktop(${idx})" class="text-slate-400 hover:text-red-400 font-bold ml-1">✕</button>
        </div>
    `).join('');
};

window.toggleEventCompetidorDesktop = (compName) => {
    const idx = desktopTabletAberturaCompetidoresDestaque.indexOf(compName);
    if (idx >= 0) {
        desktopTabletAberturaCompetidoresDestaque.splice(idx, 1);
    } else {
        desktopTabletAberturaCompetidoresDestaque.push(compName);
    }
    const eventComps = getDesktopEventCompetitors(currentEvent);
    renderDesktopEventCompetitorsChips(eventComps);
    renderDesktopActiveCompetitorsBadges();
};

window.handlePullAllEventCompetitorsDesktop = () => {
    const eventComps = getDesktopEventCompetitors(currentEvent);
    if (eventComps.length === 0) {
        alert("Nenhum competidor cadastrado neste evento.");
        return;
    }
    desktopTabletAberturaCompetidoresDestaque = [...eventComps];
    renderDesktopEventCompetitorsChips(eventComps);
    renderDesktopActiveCompetitorsBadges();
};

window.addManualCompetidorDesktop = () => {
    const input = document.getElementById('desktop-tablet-manual-comp-input');
    const val = input.value.trim();
    if (!val) return;
    desktopTabletAberturaCompetidoresDestaque.push(val);
    input.value = '';
    const eventComps = getDesktopEventCompetitors(currentEvent);
    renderDesktopEventCompetitorsChips(eventComps);
    renderDesktopActiveCompetitorsBadges();
};

window.removeTabletCompetidorDesktop = (idx) => {
    desktopTabletAberturaCompetidoresDestaque.splice(idx, 1);
    const eventComps = getDesktopEventCompetitors(currentEvent);
    renderDesktopEventCompetitorsChips(eventComps);
    renderDesktopActiveCompetitorsBadges();
};

window.handleDesktopTabletPhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        document.getElementById('desktop-tablet-abertura-url').value = event.target.result;
    };
    reader.readAsDataURL(file);
};

window.saveTabletControlDesktop = async () => {
    if (!currentEvent) return;

    const email = getCurrentUserEmail();
    const tabletConfig = {
        dia_ativo: desktopTabletDiaAtivo,
        dias_disponiveis: Array.from({ length: parseInt(currentEvent.days) || 3 }, (_, i) => `DIA ${i + 1}`).concat(['FINAL']),
        ticker_noticias: document.getElementById('desktop-tablet-ticker-input').value.trim(),
        noticias: desktopTabletNoticias,
        abertura_ativa: document.getElementById('desktop-tablet-abertura-ativa').checked,
        abertura_titulo: document.getElementById('desktop-tablet-abertura-titulo').value.trim(),
        abertura_subtitulo: document.getElementById('desktop-tablet-abertura-subtitulo').value.trim(),
        abertura_midia_url: document.getElementById('desktop-tablet-abertura-url').value.trim(),
        abertura_texto: document.getElementById('desktop-tablet-abertura-texto').value.trim(),
        abertura_competidores_destaque: desktopTabletAberturaCompetidoresDestaque,
        updated_at: new Date().toISOString()
    };

    try {
        const res = await window.electronAPI.updateTabletConfig({
            email,
            eventId: currentEvent.id,
            tabletConfig
        });

        if (res && res.success) {
            currentEvent.tablet_config = tabletConfig;
            alert('📱 Configurações salvas e enviadas em TEMPO REAL para os Tablets ao vivo!');
            document.getElementById('modal-tablet-control').classList.add('hidden');
        } else {
            alert('Erro ao salvar no tablet: ' + (res.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error('Save tablet desktop err:', err);
        alert('Erro ao salvar configurações no tablet.');
    }
};

// ==========================================
// CHANGELOG & NOVIDADES DA VERSÃO (MODAL)
// ==========================================
const CHANGELOG_DATA = {
    "1.0.172": [
        {
            icon: "🐂",
            title: "Seleção Automática do Lado no Re-Ride",
            desc: "Ao selecionar um touro de re-ride, o sistema já identifica e marca automaticamente o lado do animal (Esquerdo ou Direito) cadastrado na boiada."
        },
        {
            icon: "✨",
            title: "Nomes de Competidor e Touro em 2 Linhas",
            desc: "Nomes longos de competidores e touros agora quebram em até 2 linhas sem cortes ou reticências, com tipografia proporcional e legível."
        },
        {
            icon: "🎯",
            title: "Painel de Notas Total Centralizado",
            desc: "Os totais de Peão, Touro e Montaria agora ficam perfeitamente centralizados e destacados no rodapé do card de notas."
        },
        {
            icon: "🚀",
            title: "Super Performance e Zero Gargalos",
            desc: "Pipeline assíncrono com cache em memória RAM e renderização em lote atômica."
        }
    ],
    "1.0.171": [
        {
            icon: "🚀",
            title: "Otimização Profunda do Pipeline e Zero Gargalos",
            desc: "Eliminamos chamadas de rede no caminho crítico de atualização local."
        }
    ]
};

window.checkAndShowWhatsNew = async () => {
    try {
        let appVersion = '1.0.172';
        if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
            const v = await window.electronAPI.getAppVersion();
            if (v) appVersion = v;
        }

        const lastSeen = localStorage.getItem('RODEOAPP_LAST_SEEN_CHANGELOG');
        if (lastSeen !== appVersion) {
            const versionEl = document.getElementById('whats-new-version');
            if (versionEl) versionEl.innerText = `v${appVersion}`;

            const container = document.getElementById('whats-new-items-container');
            // Busca o changelog exato. Se não achar da versão atual, exibe o mais recente ("1.0.172")
            const items = CHANGELOG_DATA[appVersion] || CHANGELOG_DATA["1.0.172"];

            if (container && items) {
                container.innerHTML = items.map(item => `
                    <div class="p-4 rounded-2xl border border-white/10 bg-slate-950/60 flex items-start gap-3.5 text-left">
                        <div class="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center text-xl shrink-0">
                            ${item.icon}
                        </div>
                        <div>
                            <h4 class="font-black text-white text-xs sm:text-sm uppercase tracking-tight mb-0.5">${item.title}</h4>
                            <p class="text-xs text-slate-300 font-medium leading-relaxed">${item.desc}</p>
                        </div>
                    </div>
                `).join('');

                const modal = document.getElementById('modal-whats-new');
                if (modal) modal.classList.remove('hidden');
            }
        }
    } catch (e) {
        console.warn("Aviso no changelog:", e);
    }
};

window.closeWhatsNewModal = async () => {
    try {
        let appVersion = '1.0.143';
        if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
            const v = await window.electronAPI.getAppVersion();
            if (v) appVersion = v;
        }
        localStorage.setItem('RODEOAPP_LAST_SEEN_CHANGELOG', appVersion);
    } catch(e) {}
    document.getElementById('modal-whats-new')?.classList.add('hidden');
};

// Executa verificação de novidades na inicialização
setTimeout(() => {
    window.checkAndShowWhatsNew();
}, 1200);

// ==========================================
// SISTEMA DE DIAGNÓSTICO E LOG DE ERROS VISUAL
// ==========================================
window.showDebugLogError = (actionName, errorObj, extraContext = {}) => {
    try {
        console.error(`[DIAGNÓSTICO] Falha em ${actionName}:`, errorObj, extraContext);
        
        const titleEl = document.getElementById('debug-log-title');
        const subtitleEl = document.getElementById('debug-log-subtitle');
        const contentEl = document.getElementById('debug-log-content');
        
        if (titleEl) titleEl.innerText = `FALHA EM: ${String(actionName).toUpperCase()}`;
        if (subtitleEl) subtitleEl.innerText = `Ocorrido em ${new Date().toLocaleTimeString('pt-BR')}`;
        
        const appVer = document.getElementById('whats-new-version')?.innerText || 'v1.0.146';
        const report = [
            `========================================`,
            `  RODEOAPP - LOG DE DIAGNÓSTICO VISUAL  `,
            `========================================`,
            `Ação executada: ${actionName}`,
            `Horário local: ${new Date().toLocaleString('pt-BR')}`,
            `Versão do aplicativo: ${appVer}`,
            `----------------------------------------`,
            `STATUS DO EVENTO:`,
            `Evento na memória: ${currentEvent ? (currentEvent.name + ' (ID: ' + currentEvent.id + ')') : 'NENHUM (currentEvent = null)'}`,
            `Competidores: ${currentEvent?.peoes?.length || 0}`,
            `Boiadas/Cias: ${currentEvent?.boiadas?.length || 0}`,
            `Sorteios gerados: ${currentEvent?.sorteios?.length || 0}`,
            `Notas registradas: ${currentEvent?.notas?.length || 0}`,
            `----------------------------------------`,
            `MENSAGEM DE ERRO:`,
            `${errorObj?.message || String(errorObj)}`,
            `----------------------------------------`,
            `STACK TRACE:`,
            `${errorObj?.stack || 'Nenhuma stack trace disponível.'}`,
            `----------------------------------------`,
            `CONTEXTO ADICIONAL:`,
            `${JSON.stringify(extraContext, null, 2)}`
        ].join('\n');

        if (contentEl) contentEl.innerText = report;
        
        const modal = document.getElementById('modal-debug-log');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    } catch (e) {
        alert(`Erro em ${actionName}: ${errorObj?.message || errorObj}`);
    }
};

window.copyDebugLogToClipboard = () => {
    const text = document.getElementById('debug-log-content')?.innerText || '';
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('📋 Log de diagnóstico copiado com sucesso! Pode colar no chat ou enviar ao suporte.');
        }).catch(() => {
            alert('Log selecionado. Use Ctrl+C para copiar.');
        });
    } else {
        alert('Log selecionado. Use Ctrl+C para copiar.');
    }
};

// ==========================================
// CENTRAL INTEGRADA DE RELATÓRIOS (REPORT VIEWER)
// ==========================================
let reportViewerState = {
    type: 'sorteio',
    day: 'DIA 1',
    targetPeao: 'all',
    zoom: 1.0,
    orientation: 'landscape' // 'landscape' (Horizontal) ou 'portrait' (Vertical)
};

window.openReportViewer = async (type = 'sorteio', defaultDay = null) => {
    try {
        console.log('[REPORT VIEWER] openReportViewer called with type:', type, 'defaultDay:', defaultDay);
        
        const modal = document.getElementById('modal-report-viewer');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }

        if (!currentEvent || !currentEvent.id) {
            const email = getCurrentUserEmail();
            if (email && window.electronAPI && typeof window.electronAPI.getLocalEvents === 'function') {
                const eventos = await window.electronAPI.getLocalEvents(email);
                if (eventos && eventos.length > 0) {
                    currentEvent = eventos[0];
                    window.currentEvent = currentEvent;
                }
            }
        }

        if (!currentEvent || !currentEvent.id) {
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
            window.showDebugLogError('Abrir Report Viewer', new Error('Nenhum evento ativo selecionado na memória.'), {
                motivo: 'O usuário tentou abrir relatórios sem nenhum evento carregado.',
                dica: 'Selecione e abra um evento na lista inicial antes de gerar o relatório.'
            });
            return;
        }

        reportViewerState.type = type || 'sorteio';
        reportViewerState.zoom = 1.0;
        if (!reportViewerState.orientation) reportViewerState.orientation = 'landscape';

        const selectType = document.getElementById('report-select-type');
        if (selectType) selectType.value = reportViewerState.type;

        updateReportFilterControls();
        updateReportOrientationUI();

        if (defaultDay) {
            reportViewerState.day = defaultDay;
            const selectDay = document.getElementById('report-select-day');
            if (selectDay) selectDay.value = defaultDay;
        }

        renderCurrentReport();
        updateZoomDisplay();
    } catch (err) {
        console.error('[REPORT VIEWER] Error in openReportViewer:', err);
        window.showDebugLogError('Abrir Report Viewer', err, { type, defaultDay, reportViewerState });
    }
};

window.closeReportViewer = () => {
    const modal = document.getElementById('modal-report-viewer');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.toggleReportOrientation = () => {
    reportViewerState.orientation = (reportViewerState.orientation === 'landscape') ? 'portrait' : 'landscape';
    updateReportOrientationUI();
    renderCurrentReport();
};

function updateReportOrientationUI() {
    const isLand = reportViewerState.orientation === 'landscape';
    const icon = document.getElementById('report-orientation-icon');
    const text = document.getElementById('report-orientation-text');
    const btn = document.getElementById('btn-report-orientation');
    if (icon) icon.innerText = isLand ? '📜' : '📄';
    if (text) text.innerText = isLand ? 'HORIZONTAL' : 'VERTICAL';
    if (btn) {
        btn.title = isLand ? 'Orientação atual: Horizontal (Paisagem). Clique para mudar para Vertical (Retrato)' : 'Orientação atual: Vertical (Retrato). Clique para mudar para Horizontal (Paisagem)';
    }
}

function updateReportFilterControls() {
    const selectDay = document.getElementById('report-select-day');
    if (!selectDay || !currentEvent) return;

    const type = reportViewerState.type;
    const sorteios = currentEvent.sorteios || [];
    let availableDays = sorteios.map(s => s.day).filter(Boolean);
    if (availableDays.length === 0) {
        const totalDays = parseInt(currentEvent.days) || 3;
        availableDays = Array.from({ length: totalDays }, (_, i) => `DIA ${i + 1}`);
    }

    if (type === 'contratos') {
        const peoes = currentEvent.peoes || [];
        selectDay.innerHTML = `<option value="all">📜 TODOS OS COMPETIDORES (${peoes.length})</option>` +
            peoes.map(p => `<option value="${p.id || p.nome}">👤 ${p.nome}</option>`).join('');
        selectDay.value = reportViewerState.targetPeao || 'all';
    } else if (type.startsWith('ranking')) {
        selectDay.innerHTML = `<option value="geral">🏆 GERAL (TODOS OS ROUNDS)</option>` +
            availableDays.map(d => `<option value="${d}">${d.replace(/DIA/gi, 'ROUND')}</option>`).join('');
        selectDay.value = 'geral';
        reportViewerState.day = 'geral';
    } else if (['peoes', 'boiadas', 'juizes'].includes(type)) {
        selectDay.innerHTML = `<option value="completa">📋 LISTA COMPLETA</option>`;
        selectDay.value = 'completa';
        reportViewerState.day = 'completa';
    } else {
        selectDay.innerHTML = availableDays.map(d => `<option value="${d}">${d.replace(/DIA/gi, 'ROUND')}</option>`).join('');
        if (!availableDays.includes(reportViewerState.day)) {
            reportViewerState.day = availableDays[0] || 'DIA 1';
        }
        selectDay.value = reportViewerState.day;
    }
}

window.handleReportTypeChange = (type) => {
    reportViewerState.type = type;
    updateReportFilterControls();
    renderCurrentReport();
};

window.handleReportDayChange = (val) => {
    if (reportViewerState.type === 'contratos') {
        reportViewerState.targetPeao = val;
    } else {
        reportViewerState.day = val;
    }
    renderCurrentReport();
};

window.adjustReportZoom = (delta) => {
    reportViewerState.zoom = Math.min(Math.max(reportViewerState.zoom + delta, 0.4), 2.5);
    updateZoomDisplay();
};

window.resetReportZoom = () => {
    reportViewerState.zoom = 1.0;
    updateZoomDisplay();
};

function updateZoomDisplay() {
    const container = document.getElementById('report-paper-container');
    const zoomText = document.getElementById('report-zoom-level');
    if (container) {
        container.style.transform = `scale(${reportViewerState.zoom})`;
    }
    if (zoomText) {
        zoomText.innerText = `${Math.round(reportViewerState.zoom * 100)}%`;
    }
}

window.printCurrentReport = () => {
    const isLand = reportViewerState.orientation === 'landscape';
    let styleEl = document.getElementById('dynamic-print-page-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-page-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: ${isLand ? 'landscape' : 'portrait'}; margin: 5mm; }`;
    window.print();
};

window.exportCurrentReportPDF = () => {
    const element = document.getElementById('report-paper-container');
    if (!element) return;
    const isLand = reportViewerState.orientation === 'landscape';

    const opt = {
        margin: 0,
        filename: `Relatorio_${reportViewerState.type}_${(currentEvent?.name || 'Rodeio').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: isLand ? 'landscape' : 'portrait' }
    };

    if (typeof html2pdf === 'function') {
        html2pdf().set(opt).from(element).save();
    } else {
        window.printCurrentReport();
    }
};

function renderCurrentReport() {
    const container = document.getElementById('report-paper-container');
    const titleEl = document.getElementById('report-viewer-title');
    if (!container) return;

    try {
        let html = '';
        const type = reportViewerState.type;
        const day = reportViewerState.day || 'DIA 1';

        switch (type) {
            case 'sorteio':
                if (titleEl) titleEl.innerText = `SORTEIO OFICIAL • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateSorteioOficialHTML(day);
                break;
            case 'sumula':
                if (titleEl) titleEl.innerText = `PLANILHA DO JUIZ • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateSumulaJuizHTML(day);
                break;
            case 'embretamento':
                if (titleEl) titleEl.innerText = `ORDEM DE EMBRETAMENTO • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateEmbretamentoHTML(day);
                break;
            case 'boiadas':
                if (titleEl) titleEl.innerText = `LISTA DE TOUROS • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateListaBoiadasHTML(day);
                break;
            case 'locutor':
                if (titleEl) titleEl.innerText = `FICHA DE APOIO DO LOCUTOR • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateLocutorHTML(day);
                break;
            case 'notas_dia':
                if (titleEl) titleEl.innerText = `PLANILHA DE NOTAS LANÇADAS • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateNotasDiaHTML(day);
                break;
            case 'peoes':
                if (titleEl) titleEl.innerText = `RELAÇÃO DE COMPETIDORES`;
                html = generateListaPeoesHTML();
                break;
            case 'juizes':
                if (titleEl) titleEl.innerText = `RELAÇÃO DE JUÍZES E PROFISSIONAIS`;
                html = generateListaJuizesHTML();
                break;
            case 'ranking_geral':
                if (titleEl) titleEl.innerText = `RANKING OFICIAL DO EVENTO`;
                html = generateRankingGeralHTML(day);
                break;
            case 'ranking_touros':
                if (titleEl) titleEl.innerText = `RANKING DE MELHORES TOUROS`;
                html = generateRankingTourosHTML(day);
                break;
            case 'ranking_cias':
                if (titleEl) titleEl.innerText = `RANKING DE MELHOR BOIADA (CIAS)`;
                html = generateRankingCiasHTML(day);
                break;
            case 'contratos':
                if (titleEl) titleEl.innerText = `CONTRATO OFICIAL DE COMPETIDOR`;
                html = generateContratosHTML(reportViewerState.targetPeao);
                break;
            default:
                if (titleEl) titleEl.innerText = `SORTEIO OFICIAL • ${day.replace(/DIA/gi, 'ROUND')}`;
                html = generateSorteioOficialHTML(day);
                break;
        }

        container.innerHTML = html;
    } catch (err) {
        console.error('[REPORT VIEWER] Error rendering report:', err);
        container.innerHTML = `
            <div style="background:#fff; color:#000; padding:40px; text-align:center; border:2px solid #ef4444; border-radius:12px; width:100%; max-width:800px; margin:auto;">
                <h3 style="color:#ef4444; font-weight:900; font-size:18px;">Erro ao carregar visualização do relatório</h3>
                <p style="color:#64748b; font-size:13px; margin-top:10px;">${err.message}</p>
            </div>
        `;
    }
}

// Helpers de Cabeçalho e Rodapé dos Modelos Oficiais com Logo do RodeoApp
function getReportOfficialHeaderHTML(title, subtitle) {
    const eventName = ((currentEvent && (currentEvent.name || currentEvent.nome)) || 'EVENTO').toUpperCase();
    
    return `
        <div style="background-color: #000; padding: 8px 14px; border: 1px solid #000; color: #fff; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
            <div style="width: 130px; display: flex; align-items: center;">
                <img src="assets/rodeoapplogo_branca.png" alt="RODEOAPP" style="height: 34px; max-width: 130px; object-fit: contain;" onerror="this.outerHTML='<span style=\\'font-weight:900;font-style:italic;font-size:1.2rem;letter-spacing:-0.05em;color:#fff;\\'>RODEO<span style=\\'color:#eab308;\\'>APP</span></span>'">
            </div>
            <div style="flex-grow: 1; text-align: center; padding: 0 10px;">
                <h1 style="margin: 0; font-size: 18px; font-style: italic; font-weight: 900; text-transform: uppercase; color: #fff; letter-spacing: 0.5px; line-height: 1.1;">${eventName}</h1>
                <p style="margin: 2px 0 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #e5e7eb; font-weight: bold;">${subtitle}</p>
            </div>
            <div style="width: 130px; text-align: right; font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase;">
                ${title || ''}
            </div>
        </div>
    `;
}

function getReportOfficialFooterHTML(pageNum = null, totalPages = null) {
    const auth = (window.electronAPI && typeof window.electronAPI.getAuth === 'function' && window.electronAPI.getAuth()) || {};
    const clientName = (auth && auth.nome) || "CLIENTE RODEOAPP";
    const pageText = (pageNum && totalPages && totalPages > 1) ? `PÁGINA ${pageNum}/${totalPages}` : (pageNum ? `PÁGINA ${pageNum}` : '');
    return `
        <div style="background-color: #000; padding: 6px 12px; text-align: center; border: 1px solid #000; border-top: none; color: #fff; font-size: 10px; font-weight: bold; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; margin-top: auto;">
            <div style="font-size: 9px; color: #9ca3af;">SISTEMA OFICIAL RODEOAPP</div>
            <div style="flex: 1; text-align: center;">RODEOAPP (18) 98122-6665 - GESTÃO DE RODEIOS - LICENCIADO PARA: ${clientName.toUpperCase()}</div>
            <div style="font-size: 10px; color: #eab308; font-weight: 900;">${pageText}</div>
        </div>
    `;
}

function findSorteioByDay(day) {
    if (!currentEvent || !currentEvent.sorteios || currentEvent.sorteios.length === 0) return null;
    if (!day) return currentEvent.sorteios[0];
    const cleanDay = String(day).replace(/round|dia|\s+/gi, '').trim();
    const found = currentEvent.sorteios.find(s => {
        if (!s || !s.day) return false;
        const sClean = String(s.day).replace(/round|dia|\s+/gi, '').trim();
        return sClean === cleanDay || s.day.toUpperCase() === String(day).toUpperCase();
    });
    return found || currentEvent.sorteios[0];
}

// Utilitário de Animais Reservas (Re-Rides) do Sorteio do Dia
function getReservaBullsForDay(day) {
    const sorteio = findSorteioByDay(day);
    const res = [];
    if (sorteio && sorteio.bulls && sorteio.riders) {
        const totalRiders = sorteio.riders.length;
        if (sorteio.bulls.length > totalRiders) {
            sorteio.bulls.slice(totalRiders).forEach(b => {
                let lado = b.lado || '';
                if (!lado && currentEvent && currentEvent.boiadas) {
                    const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                    if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
                }
                res.push({ nome: b.nome, cia: b.cia || '---', lado });
            });
        }
    }
    return res;
}

// Utilitário de Paginação Automática para Tabelas A4
function buildPaginatedReportHTML({
    title,
    subtitle,
    theadHtml,
    rows,
    renderRowFn,
    extraHtmlLastPage = '',
    customRowsPerPage = null
}) {
    const isLand = reportViewerState.orientation === 'landscape';
    // 16 linhas por página em Paisagem e 24 em Retrato
    const rowsPerPage = customRowsPerPage || (isLand ? 16 : 24);
    const pageWidth = isLand ? '297mm' : '210mm';
    
    const chunks = [];
    if (rows && rows.length > 0) {
        for (let i = 0; i < rows.length; i += rowsPerPage) {
            chunks.push(rows.slice(i, i + rowsPerPage));
        }
    } else {
        chunks.push([]);
    }

    const totalPages = chunks.length;
    let fullHtml = '';

    chunks.forEach((chunk, pageIndex) => {
        const pageNum = pageIndex + 1;
        const isLastPage = pageNum === totalPages;

        let rowsHtml = '';
        if (chunk.length === 0 && !extraHtmlLastPage) {
            rowsHtml = `<tr><td colspan="20" style="border:1px solid #000; text-align:center; height:45px; vertical-align:middle; color:#64748b; font-weight:bold;">⚠️ Nenhum dado registrado para exibição.</td></tr>`;
        } else {
            chunk.forEach((item, itemIdx) => {
                const globalIndex = pageIndex * rowsPerPage + itemIdx;
                rowsHtml += renderRowFn(item, globalIndex, itemIdx);
            });
        }

        const extraHtml = isLastPage ? extraHtmlLastPage : '';

        fullHtml += `
            <div class="report-a4-page ${isLand ? 'landscape' : 'portrait'}" style="background: #fff; color: #000; padding: 8mm 10mm; width: ${pageWidth}; box-sizing: border-box; font-family: Arial, sans-serif; margin: 0 auto 20px auto; box-shadow: 0 0 25px rgba(0,0,0,0.6); page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;">
                <div style="display: flex; flex-direction: column;">
                    ${getReportOfficialHeaderHTML(title, subtitle)}
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0; background: #fff; color: #000; table-layout: fixed;">
                        <thead>
                            ${theadHtml}
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            ${extraHtml}
                        </tbody>
                    </table>
                    ${getReportOfficialFooterHTML(pageNum, totalPages)}
                </div>
            </div>
        `;
    });

    return fullHtml;
}

// 1. SORTEIO OFICIAL (CONFRONTOS) - MODELO OFICIAL PAGINADO
function generateSorteioOficialHTML(day) {
    const sorteio = findSorteioByDay(day);

    if (!sorteio || !sorteio.riders || sorteio.riders.length === 0) {
        return buildPaginatedReportHTML({
            title: "SORTEIO OFICIAL",
            subtitle: `SORTEIO OFICIAL - ${(day || 'ROUND 1').toUpperCase()}`,
            theadHtml: `
                <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 4%;">Nº</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 28%; text-align: left;">Competidor</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 18%; text-align: left;">Cidade</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 8%;">Acum.</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 18%; text-align: left;">Animal</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 20%; text-align: left;">Companhia</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 4%;">L</th>
                </tr>
            `,
            rows: [],
            renderRowFn: () => ''
        });
    }

    const riders = sorteio.riders || [];
    const bulls = sorteio.bulls || [];
    const assignments = sorteio.assignments || {};
    const totalRiders = riders.length;

    let reservasHtml = '';
    const reservas = getReservaBullsForDay(sorteio.day || day);
    if (reservas.length > 0) {
        reservasHtml += `
            <tr style="background-color: #9ca3af; font-weight: bold; font-size: 11px; height: 26px;">
                <td colspan="4" style="border: 1px solid #000; padding: 0 6px; vertical-align: middle; text-align: left; color: #000;">Animais Reservas</td>
                <td style="border: 1px solid #000; padding: 0 6px; vertical-align: middle; text-align: left; color: #000;">Animal</td>
                <td style="border: 1px solid #000; padding: 0 6px; vertical-align: middle; text-align: left; color: #000;">Companhia</td>
                <td style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: center; color: #000;">L</td>
            </tr>
        `;
        reservas.forEach((b) => {
            reservasHtml += `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; vertical-align: middle; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; vertical-align: middle; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.cia || '---'}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; vertical-align: middle; text-align: center; font-weight: bold; font-size: 12px;">${window.formatSide(b.lado)}</td>
                </tr>
            `;
        });
    }

    return buildPaginatedReportHTML({
        title: "SORTEIO OFICIAL",
        subtitle: `SORTEIO OFICIAL - ${(sorteio.day || day || 'ROUND 1').toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 4%;">Nº</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 28%; text-align: left;">Competidor</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 18%; text-align: left;">Cidade</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 8%;">Acum.</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 18%; text-align: left;">Animal</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 20%; text-align: left;">Companhia</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 4%;">L</th>
            </tr>
        `,
        rows: riders,
        extraHtmlLastPage: reservasHtml,
        renderRowFn: (r, globalIdx) => {
            const rNome = typeof r === 'string' ? r : (r.nome || '---');
            const rCidade = (typeof r === 'object' && r.cidade) ? r.cidade : '';
            const bullIdx = assignments[globalIdx] !== undefined ? assignments[globalIdx] : globalIdx;
            const bull = bulls[bullIdx] || { nome: '---', cia: '---', lado: '' };

            let lado = bull.lado || '';
            if (!lado && currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === bull.cia);
                if (cia && cia.lados && cia.lados[bull.nome]) lado = cia.lados[bull.nome];
            }

            let acum = "0,00";
            if (currentEvent && currentEvent.peoes) {
                const peao = currentEvent.peoes.find(p => p.nome === rNome);
                if (peao && peao.score) acum = peao.score.toFixed(2).replace('.', ',');
            }

            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${globalIdx + 1}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rNome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; text-align: left; font-size: 10px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rCidade}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${acum}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bull.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bull.cia || '---'}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${window.formatSide(lado)}</td>
                </tr>
            `;
        }
    });
}

// 2. PLANILHA OFICIAL DO JUIZ - MODELO OFICIAL PAGINADO
function generateSumulaJuizHTML(day) {
    const sorteio = findSorteioByDay(day);

    if (!sorteio || !sorteio.riders || sorteio.riders.length === 0) {
        return buildPaginatedReportHTML({
            title: "PLANILHA JUIZ",
            subtitle: `PLANILHA JUIZ - ${(day || 'ROUND 1').toUpperCase()}`,
            theadHtml: `
                <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 10px; height: 28px;">
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">MONT</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 22%; text-align: left;">COMPETIDOR</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 13%; text-align: left;">CIDADE</th>
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 7%;">ACUM.</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%; text-align: left;">ANIMAL</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%; text-align: left;">COMPANHIA</th>
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">LADO</th>
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 5%;">TEMPO</th>
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 5%;">ANIMAL</th>
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">COMP.</th>
                    <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">TOTAL</th>
                </tr>
            `,
            rows: [],
            renderRowFn: () => ''
        });
    }

    const riders = sorteio.riders || [];
    const bulls = sorteio.bulls || [];
    const assignments = sorteio.assignments || {};

    let reservasHtml = '';
    const reservas = getReservaBullsForDay(sorteio.day || day);
    if (reservas.length > 0) {
        reservasHtml += `
            <tr style="background-color: #9ca3af; font-weight: bold; font-size: 10px; height: 26px;">
                <td colspan="4" style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: left; color: #000;">Animais Reservas (Re-Ride)</td>
                <td style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: left; color: #000;">Animal</td>
                <td style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: left; color: #000;">Companhia</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Lado</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Tempo</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Animal</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Comp.</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Total</td>
            </tr>
        `;
        reservas.forEach((b) => {
            reservasHtml += `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; vertical-align: middle; font-weight: bold; font-size: 11px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; vertical-align: middle; font-size: 9px; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.cia || '---'}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; vertical-align: middle; text-align: center; font-weight: bold; font-size: 12px;">${window.formatSide(b.lado)}</td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                </tr>
            `;
        });
    }

    return buildPaginatedReportHTML({
        title: "PLANILHA JUIZ",
        subtitle: `PLANILHA JUIZ - ${(sorteio.day || day || 'ROUND 1').toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 10px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">MONT</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 22%; text-align: left;">COMPETIDOR</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 13%; text-align: left;">CIDADE</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 7%;">ACUM.</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%; text-align: left;">ANIMAL</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%; text-align: left;">COMPANHIA</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">LADO</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 5%;">TEMPO</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 5%;">ANIMAL</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">COMP.</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">TOTAL</th>
            </tr>
        `,
        rows: riders,
        extraHtmlLastPage: reservasHtml,
        renderRowFn: (r, globalIdx) => {
            const rNome = typeof r === 'string' ? r : (r.nome || '---');
            const rCidade = (typeof r === 'object' && r.cidade) ? r.cidade : '';
            const bullIdx = assignments[globalIdx] !== undefined ? assignments[globalIdx] : globalIdx;
            const b = bulls[bullIdx] || { nome: '---', cia: '---', lado: '' };

            let lado = b.lado || '';
            if (!lado && currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }

            let acum = "0,00";
            if (currentEvent && currentEvent.peoes) {
                const peao = currentEvent.peoes.find(p => p.nome === rNome);
                if (peao && peao.score) acum = peao.score.toFixed(2).replace('.', ',');
            }

            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${globalIdx + 1}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rNome}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-size: 9px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rCidade}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 10px; vertical-align: middle;">${acum}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.cia || '---'}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${window.formatSide(lado)}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; vertical-align: middle;"></td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; vertical-align: middle;"></td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; vertical-align: middle;"></td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; vertical-align: middle;"></td>
                </tr>
            `;
        }
    });
}

// 3. ORDEM DE EMBRETAMENTO (BRETES) - MODELO OFICIAL PAGINADO
function generateEmbretamentoHTML(day) {
    const sorteio = findSorteioByDay(day);

    if (!sorteio || !sorteio.riders || sorteio.riders.length === 0) {
        return buildPaginatedReportHTML({
            title: "ORDEM DE EMBRETAMENTO",
            subtitle: `ORDEM DE EMBRETAMENTO - ${(day || 'ROUND 1').toUpperCase()}`,
            theadHtml: `
                <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">Nº</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 35%; text-align: left;">COMPETIDOR</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 25%; text-align: left;">TOURO</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 20%; text-align: left;">COMPANHIA</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">LADO</th>
                </tr>
            `,
            rows: [],
            renderRowFn: () => ''
        });
    }

    const riders = sorteio.riders || [];
    const bulls = sorteio.bulls || [];
    const assignments = sorteio.assignments || {};

    return buildPaginatedReportHTML({
        title: "ORDEM DE EMBRETAMENTO",
        subtitle: `ORDEM DE EMBRETAMENTO - ${(sorteio.day || day || 'ROUND 1').toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">Nº</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 35%; text-align: left;">COMPETIDOR</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 25%; text-align: left;">TOURO</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 20%; text-align: left;">COMPANHIA</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">LADO</th>
            </tr>
        `,
        rows: riders,
        renderRowFn: (r, globalIdx) => {
            const rNome = typeof r === 'string' ? r : (r.nome || '---');
            const bullIdx = assignments[globalIdx] !== undefined ? assignments[globalIdx] : globalIdx;
            const b = bulls[bullIdx] || { nome: '---', cia: '---', lado: '' };

            let lado = b.lado || '';
            if (!lado && currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }

            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${globalIdx + 1}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 11px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${rNome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 11px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 10px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.cia || '---'}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${window.formatSide(lado)}</td>
                </tr>
            `;
        }
    });
}

// 4. LISTA DE TOUROS (BOIADA) - MODELO OFICIAL PAGINADO
function generateListaBoiadasHTML(day) {
    const sorteio = findSorteioByDay(day);

    let bullsList = [];
    if (sorteio && sorteio.bulls && sorteio.bulls.length > 0) {
        bullsList = sorteio.bulls;
    } else if (currentEvent && currentEvent.boiadas) {
        currentEvent.boiadas.forEach(c => {
            if (c.touros && Array.isArray(c.touros)) {
                c.touros.forEach(t => {
                    const tNome = typeof t === 'string' ? t : (t.nome || t.name);
                    const tLado = typeof t === 'object' ? (t.lado || (c.lados && c.lados[tNome]) || '') : ((c.lados && c.lados[tNome]) || '');
                    if (tNome) bullsList.push({ nome: tNome, cia: c.nome, lado: tLado });
                });
            }
        });
    }

    return buildPaginatedReportHTML({
        title: "LISTA DE TOUROS",
        subtitle: `LISTA DE TOUROS - ${(day ? day.toUpperCase() : 'OFICIAL')}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">Nº</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 45%; text-align: left;">TOURO</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 35%; text-align: left;">COMPANHIA</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">LADO</th>
            </tr>
        `,
        rows: bullsList,
        renderRowFn: (b, globalIdx) => {
            let lado = b.lado || '';
            if (!lado && currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }

            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${globalIdx + 1}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 11px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 10px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.cia || '---'}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${window.formatSide(lado)}</td>
                </tr>
            `;
        }
    });
}

// 5. FICHA DE APOIO DO LOCUTOR PAGINADA
function generateLocutorHTML(day) {
    const sorteio = findSorteioByDay(day);

    if (!sorteio || !sorteio.riders || sorteio.riders.length === 0) {
        return `
            <div class="report-a4-page landscape" style="background: #fff; color: #000; padding: 8mm 10mm; width: 297mm; box-sizing: border-box; font-family: Arial, sans-serif; margin: 0 auto 20px auto; box-shadow: 0 0 25px rgba(0,0,0,0.6);">
                <div style="display: flex; flex-direction: column;">
                    ${getReportOfficialHeaderHTML("FICHA DO LOCUTOR", `FICHA DO LOCUTOR - ${(day || 'ROUND 1').toUpperCase()}`)}
                    <div style="border: 1px solid #000; border-top: none; padding: 60px 20px; text-align: center; font-weight: bold; color: #64748b;">
                        ⚠️ Nenhum sorteio realizado para o ${(day || 'Round 1').replace(/DIA/gi, 'Round ')}.
                    </div>
                    ${getReportOfficialFooterHTML()}
                </div>
            </div>
        `;
    }

    const riders = sorteio.riders || [];
    const bulls = sorteio.bulls || [];
    const assignments = sorteio.assignments || {};
    const isLand = reportViewerState.orientation === 'landscape';
    const cardsPerPage = isLand ? 12 : 18;
    const pageWidth = isLand ? '297mm' : '210mm';

    const chunks = [];
    for (let i = 0; i < riders.length; i += cardsPerPage) {
        chunks.push(riders.slice(i, i + cardsPerPage));
    }

    const totalPages = chunks.length;
    let fullHtml = '';

    chunks.forEach((chunk, pageIndex) => {
        const pageNum = pageIndex + 1;
        let cardsHtml = '';

        chunk.forEach((r, itemIdx) => {
            const globalIdx = pageIndex * cardsPerPage + itemIdx;
            const rNome = typeof r === 'string' ? r : (r.nome || '---');
            const rCidade = (typeof r === 'object' && r.cidade) ? r.cidade : '---';
            const bullIdx = assignments[globalIdx] !== undefined ? assignments[globalIdx] : globalIdx;
            const b = bulls[bullIdx] || { nome: '---', cia: '---', lado: '' };

            let lado = b.lado || '';
            if (!lado && currentEvent && currentEvent.boiadas) {
                const cia = currentEvent.boiadas.find(c => c.nome === b.cia);
                if (cia && cia.lados && cia.lados[b.nome]) lado = cia.lados[b.nome];
            }

            cardsHtml += `
                <div style="border: 1px solid #000; padding: 4px 8px; height: 38px; min-height: 38px; max-height: 38px; display: flex; justify-content: space-between; align-items: center; background: #f9fafb; box-sizing: border-box; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                        <div style="font-weight: 900; font-size: 13px; background: #000; color: #fff; width: 26px; height: 26px; min-width: 26px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                            ${globalIdx + 1}
                        </div>
                        <div style="overflow: hidden;">
                            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${rNome}
                            </div>
                            <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${rCidade}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 110px; overflow: hidden;">
                        <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #b45309; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            VS ${b.nome}
                        </div>
                        <div style="font-size: 9px; font-weight: bold; color: #000; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            CIA ${b.cia || '---'} • GIRO: ${window.formatSide(lado)}
                        </div>
                    </div>
                </div>
            `;
        });

        fullHtml += `
            <div class="report-a4-page ${isLand ? 'landscape' : 'portrait'}" style="background: #fff; color: #000; padding: 8mm 10mm; width: ${pageWidth}; box-sizing: border-box; font-family: Arial, sans-serif; margin: 0 auto 20px auto; box-shadow: 0 0 25px rgba(0,0,0,0.6); page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;">
                <div style="display: flex; flex-direction: column;">
                    ${getReportOfficialHeaderHTML("FICHA DE APOIO DO LOCUTOR", `FICHA DO LOCUTOR - ${(sorteio.day || day || 'ROUND 1').toUpperCase()}`)}
                    <div style="border: 1px solid #000; border-top: none; padding: 8px; background: #fff;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            ${cardsHtml}
                        </div>
                    </div>
                    ${getReportOfficialFooterHTML(pageNum, totalPages)}
                </div>
            </div>
        `;
    });

    return fullHtml;
}

// 6. PLANILHA DE NOTAS LANÇADAS PAGINADA COM RE-RIDES E CONFRONTOS
function generateNotasDiaHTML(day) {
    const sorteio = findSorteioByDay(day);
    const notasList = ((currentEvent && currentEvent.notas) || []).filter(n => n && (n.status === 'ativa' || n.status === 'nota_baixa' || n.status === 're_ride') && n.dia && n.dia.toUpperCase() === (day || '').toUpperCase());

    // Se temos sorteio para este dia, cruzamos os competidores do sorteio com as notas
    let tableRows = [];
    if (sorteio && sorteio.riders && sorteio.riders.length > 0) {
        const riders = sorteio.riders || [];
        const bulls = sorteio.bulls || [];
        const assignments = sorteio.assignments || {};

        riders.forEach((r, idx) => {
            const rNome = typeof r === 'string' ? r : (r.nome || '---');
            const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
            const b = bulls[bullIdx] || { nome: '---', cia: '---' };

            // Procurar se já há nota lançada para este peão neste dia
            const notaLancada = notasList.find(n => (n.peao || n.peaoNome || '').toUpperCase() === rNome.toUpperCase() && (n.touro || n.touroNome || '').toUpperCase() === b.nome.toUpperCase()) ||
                               notasList.find(n => (n.peao || n.peaoNome || '').toUpperCase() === rNome.toUpperCase());

            tableRows.push({
                idx: idx + 1,
                peao: rNome,
                touro: b.nome,
                cia: b.cia || '---',
                totalPeao: notaLancada ? (parseFloat(notaLancada.totalPeao) || 0).toFixed(2) : '0.00',
                totalTouro: notaLancada ? (parseFloat(notaLancada.totalTouro) || 0).toFixed(2) : '0.00',
                tempo: notaLancada ? (notaLancada.tempo || '8,00') : '8,00',
                totalGeral: notaLancada ? (parseFloat(notaLancada.totalGeral) || 0).toFixed(2) : '0.00'
            });
        });
    } else {
        // Fallback: usar apenas as notas registradas
        notasList.forEach((n, idx) => {
            tableRows.push({
                idx: idx + 1,
                peao: n.peao || n.peaoNome || '---',
                touro: n.touro || n.touroNome || '---',
                cia: n.cia || n.bullCia || '---',
                totalPeao: (parseFloat(n.totalPeao) || 0).toFixed(2),
                totalTouro: (parseFloat(n.totalTouro) || 0).toFixed(2),
                tempo: n.tempo || '8,00',
                totalGeral: (parseFloat(n.totalGeral) || 0).toFixed(2)
            });
        });
    }

    let reservasHtml = '';
    const reservas = getReservaBullsForDay(day);
    if (reservas.length > 0) {
        reservasHtml += `
            <tr style="background-color: #9ca3af; font-weight: bold; font-size: 10px; height: 26px;">
                <td colspan="2" style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: left; color: #000;">Animais Reservas (Re-Ride)</td>
                <td style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: left; color: #000;">Animal</td>
                <td style="border: 1px solid #000; padding: 0 4px; vertical-align: middle; text-align: left; color: #000;">Companhia</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Nt Peão</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Nt Touro</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Tempo</td>
                <td style="border: 1px solid #000; padding: 0 2px; vertical-align: middle; text-align: center; color: #000;">Total</td>
            </tr>
        `;
        reservas.forEach((b) => {
            reservasHtml += `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; vertical-align: middle; font-weight: bold; font-size: 11px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; vertical-align: middle; font-size: 9px; font-weight: bold; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.cia || '---'}</td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                    <td style="border: 1px solid #000; height: 28px;"></td>
                </tr>
            `;
        });
    }

    return buildPaginatedReportHTML({
        title: "PLANILHA DE NOTAS",
        subtitle: `PLANILHA DE NOTAS - ${(day || 'ROUND 1').toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 10px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 4%;">Nº</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 26%; text-align: left;">Competidor</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 18%; text-align: left;">Animal / Touro</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 20%; text-align: left;">Companhia</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 8%;">Nt Peão</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 8%;">Nt Touro</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 8%;">Tempo</th>
                <th style="border: 1px solid #000; padding: 0 2px; height: 28px; width: 8%;">Total</th>
            </tr>
        `,
        rows: tableRows,
        extraHtmlLastPage: reservasHtml,
        renderRowFn: (n, globalIdx) => {
            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${n.idx || (globalIdx + 1)}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.peao}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.touro}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-size: 9px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.cia}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${n.totalPeao}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${n.totalTouro}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: bold; font-size: 10px; vertical-align: middle;">${n.tempo}</td>
                    <td style="border: 1px solid #000; padding: 0 2px; height: 28px; text-align: center; font-weight: 900; font-size: 12px; color: #000; vertical-align: middle;">${n.totalGeral}</td>
                </tr>
            `;
        }
    });
}

// 7. RANKING OFICIAL DO EVENTO PAGINADO
function generateRankingGeralHTML(filter) {
    const safeDay = filter || 'GERAL';
    const rankingData = prepareRankingDataForExport(safeDay);

    if (!rankingData || !rankingData.rows || rankingData.rows.length === 0) {
        return buildPaginatedReportHTML({
            title: "RANKING OFICIAL",
            subtitle: `RANKING OFICIAL - ${safeDay.toUpperCase()}`,
            theadHtml: `
                <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 6%;">POS</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 40%; text-align: left;">COMPETIDOR</th>
                    <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 34%; text-align: left;">CIDADE</th>
                    <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 20%;">TOTAL</th>
                </tr>
            `,
            rows: [],
            renderRowFn: () => ''
        });
    }

    let dayHeaderCells = '';
    rankingData.columnsDays.forEach(d => {
        dayHeaderCells += `<th style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center;">${d.toUpperCase()}</th>`;
    });

    return buildPaginatedReportHTML({
        title: "RANKING OFICIAL",
        subtitle: `RANKING OFICIAL - ${safeDay.toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 6%;">POS</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 34%; text-align: left;">COMPETIDOR</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 24%; text-align: left;">CIDADE</th>
                ${dayHeaderCells}
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 14%;">TOTAL</th>
            </tr>
        `,
        rows: rankingData.rows,
        renderRowFn: (r, globalIdx) => {
            const hasScore = r.totalPoints > 0 || r.tempoAcumulado > 0;
            const pos = hasScore ? (globalIdx + 1) + 'º' : '---';
            const tempoInfo = (r.totalPoints === 0 && r.tempoAcumulado > 0) ? ` (${r.tempoAcumulado.toFixed(2)}s)` : '';
            const totalStr = (r.totalPoints > 0 ? r.totalPoints.toFixed(2).replace('.', ',') : '0,00') + tempoInfo;

            let dayScoresCells = '';
            rankingData.columnsDays.forEach(d => {
                dayScoresCells += `<td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${r.daysScores[d] || '-'}</td>`;
            });

            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${pos}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.nome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 10px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.cidade || '---'}</td>
                    ${dayScoresCells}
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 12px; vertical-align: middle;">${totalStr}</td>
                </tr>
            `;
        }
    });
}

// 8. RANKING MELHORES TOUROS PAGINADO
function generateRankingTourosHTML(filter) {
    const getSafeStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') return (val.nome || val.name || val.touro || '').trim();
        return String(val).trim();
    };

    const notas = ((currentEvent && currentEvent.notas) || []).filter(n => n && (n.status === 'ativa' || n.status === 'nota_baixa'));
    const bullsMap = {};

    if (currentEvent && currentEvent.boiadas && Array.isArray(currentEvent.boiadas)) {
        currentEvent.boiadas.forEach(c => {
            const cNome = getSafeStr(c.nome || c.cia || 'SEM CIA');
            if (c.touros && Array.isArray(c.touros)) {
                c.touros.forEach(t => {
                    const tNome = getSafeStr(t);
                    if (tNome) bullsMap[tNome.toUpperCase()] = { nome: tNome, cia: cNome };
                });
            }
        });
    }

    notas.forEach(n => {
        const tNome = getSafeStr(n.touro || n.touroNome || n.bullName);
        if (tNome && !bullsMap[tNome.toUpperCase()]) {
            const cNome = getSafeStr(n.cia || n.bullCia || 'SEM CIA');
            bullsMap[tNome.toUpperCase()] = { nome: tNome, cia: cNome };
        }
    });

    const tourosData = [];
    for (const [upperNome, bInfo] of Object.entries(bullsMap)) {
        const peaoNotas = notas.filter(n => {
            const nTouroUpper = getSafeStr(n.touro || n.touroNome || n.bullName).toUpperCase();
            return nTouroUpper === upperNome && (filter === 'geral' || (n.dia && n.dia.toUpperCase() === filter.toUpperCase()));
        });
        if (peaoNotas.length === 0) continue;

        let sum = 0;
        peaoNotas.forEach(n => { sum += (parseFloat(n.totalTouro) || 0); });
        const media = sum / peaoNotas.length;
        tourosData.push({ ...bInfo, saidas: peaoNotas.length, media, sum });
    }

    tourosData.sort((a, b) => b.media - a.media);

    return buildPaginatedReportHTML({
        title: "MELHOR ANIMAL (TOURO)",
        subtitle: `RANKING DE MELHORES TOUROS - ${(filter || 'GERAL').toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 8%;">POS</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 34%; text-align: left;">ANIMAL / TOURO</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 28%; text-align: left;">COMPANHIA DE RODEIO</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">SAÍDAS</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">SOMA</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">MÉDIA</th>
            </tr>
        `,
        rows: tourosData,
        renderRowFn: (item, globalIdx) => `
            <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${globalIdx + 1}º</td>
                <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nome}</td>
                <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 10px; font-weight: bold; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.cia}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${item.saidas}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-size: 11px; vertical-align: middle;">${item.sum.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: 900; font-size: 12px; vertical-align: middle;">${item.media.toFixed(2)}</td>
            </tr>
        `
    });
}

// 9. RANKING MELHOR BOIADA (CIAS) PAGINADO
function generateRankingCiasHTML(filter) {
    const getSafeStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'object') return (val.nome || val.name || val.touro || '').trim();
        return String(val).trim();
    };

    const notas = ((currentEvent && currentEvent.notas) || []).filter(n => n && (n.status === 'ativa' || n.status === 'nota_baixa'));
    const boiadaMap = {};

    if (currentEvent && currentEvent.boiadas && Array.isArray(currentEvent.boiadas)) {
        currentEvent.boiadas.forEach(c => {
            const cNome = getSafeStr(c.nome || c.cia);
            if (cNome) boiadaMap[cNome.toUpperCase()] = { nome: cNome, sum: 0, count: 0 };
        });
    }

    const getBullCia = (n) => {
        const explicitCia = getSafeStr(n.cia || n.bullCia);
        if (explicitCia) return explicitCia.toUpperCase();

        const bullName = getSafeStr(n.touro || n.touroNome || n.bullName).toUpperCase();
        if (!bullName || !currentEvent.boiadas || !Array.isArray(currentEvent.boiadas)) return null;

        for (const c of currentEvent.boiadas) {
            const cNome = getSafeStr(c.nome || c.cia);
            if (c.touros && Array.isArray(c.touros)) {
                if (c.touros.some(t => getSafeStr(t).toUpperCase() === bullName)) {
                    return cNome.toUpperCase();
                }
            }
        }
        return null;
    };

    notas.forEach(n => {
        if (filter !== 'geral' && n.dia && n.dia.toUpperCase() !== filter.toUpperCase()) return;
        const ciaUpper = getBullCia(n);
        if (ciaUpper) {
            if (!boiadaMap[ciaUpper]) {
                boiadaMap[ciaUpper] = { nome: ciaUpper, sum: 0, count: 0 };
            }
            boiadaMap[ciaUpper].sum += (parseFloat(n.totalTouro) || 0);
            boiadaMap[ciaUpper].count++;
        }
    });

    const boiadasData = [];
    for (const [ciaUpper, data] of Object.entries(boiadaMap)) {
        if (data.count > 0) {
            boiadasData.push({ nome: data.nome, saidas: data.count, media: data.sum / data.count, sum: data.sum });
        }
    }

    boiadasData.sort((a, b) => b.media - a.media);

    return buildPaginatedReportHTML({
        title: "MELHOR CIA (BOIADA)",
        subtitle: `RANKING DE MELHOR BOIADA - ${(filter || 'GERAL').toUpperCase()}`,
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 8%;">POS</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 44%; text-align: left;">COMPANHIA DE RODEIO (CIA)</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%;">SAÍDAS</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%;">SOMA NOTAS</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 16%;">MÉDIA BOIADA</th>
            </tr>
        `,
        rows: boiadasData,
        renderRowFn: (item, globalIdx) => `
            <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${globalIdx + 1}º</td>
                <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.nome}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${item.saidas}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-size: 11px; vertical-align: middle;">${item.sum.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: 900; font-size: 12px; vertical-align: middle;">${item.media.toFixed(2)}</td>
            </tr>
        `
    });
}

// 10. RELAÇÃO DE COMPETIDORES (LISTA) PAGINADA
function generateListaPeoesHTML() {
    const peoes = (currentEvent && currentEvent.peoes) || [];

    return buildPaginatedReportHTML({
        title: "RELAÇÃO DE COMPETIDORES",
        subtitle: "RELAÇÃO OFICIAL DE COMPETIDORES CADASTRADOS",
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">Nº</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 45%; text-align: left;">COMPETIDOR (PEÃO)</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 25%; text-align: left;">CIDADE</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 20%;">CPF</th>
            </tr>
        `,
        rows: peoes,
        renderRowFn: (p, globalIdx) => `
            <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${globalIdx + 1}</td>
                <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nome || '---'}</td>
                <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 10px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.cidade || '---'}</td>
                <td style="border: 1px solid #000; padding: 0 4px; height: 28px; font-size: 10px; text-align: center; vertical-align: middle;">${p.cpf || '---'}</td>
            </tr>
        `
    });
}

// 11. RELAÇÃO DE JUÍZES E PROFISSIONAIS PAGINADA
function generateListaJuizesHTML() {
    const juizes = (currentEvent && currentEvent.juizes) || [];

    return buildPaginatedReportHTML({
        title: "CORPO DE JUÍZES",
        subtitle: "RELAÇÃO DE JUÍZES E PROFISSIONAIS CADASTRADOS",
        theadHtml: `
            <tr style="background-color: #e5e7eb; font-weight: bold; text-align: center; font-size: 11px; height: 28px;">
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 10%;">Nº</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 45%; text-align: left;">NOME DO PROFISSIONAL</th>
                <th style="border: 1px solid #000; padding: 0 6px; height: 28px; width: 25%; text-align: left;">CIDADE</th>
                <th style="border: 1px solid #000; padding: 0 4px; height: 28px; width: 20%;">FUNÇÃO</th>
            </tr>
        `,
        rows: juizes,
        renderRowFn: (j, globalIdx) => {
            const jNome = typeof j === 'string' ? j : (j.nome || '---');
            const jCidade = typeof j === 'object' ? (j.cidade || '---') : '---';
            const jFuncao = typeof j === 'object' ? (j.funcao || 'JUIZ OFICIAL') : 'JUIZ OFICIAL';

            return `
                <tr style="height: 28px; min-height: 28px; max-height: 28px;">
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle;">${globalIdx + 1}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-weight: bold; font-size: 11px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${jNome}</td>
                    <td style="border: 1px solid #000; padding: 0 6px; height: 28px; font-size: 10px; text-transform: uppercase; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${jCidade}</td>
                    <td style="border: 1px solid #000; padding: 0 4px; height: 28px; text-align: center; font-weight: bold; font-size: 10px; text-transform: uppercase; vertical-align: middle;">${jFuncao}</td>
                </tr>
            `;
        }
    });
}

// 12. CONTRATOS OFICIAIS DE COMPETIDORES (A4)
function generateContratosHTML(targetPeao) {
    const cc = (currentEvent && currentEvent.contratoConfig) || {};
    const con = cc.contratante || {};
    const c2 = cc.clausulaSegunda || {};
    const cq = cc.clausulaQuarta || {};
    const end = con.endereco || {};
    const forum = cc.forum || {};

    const allPeoes = (currentEvent && currentEvent.peoes) || [];
    let peoesList = [];

    if (targetPeao === 'all' || !targetPeao) {
        peoesList = allPeoes;
    } else {
        const p = allPeoes.find(x => (x.id || x.nome) === targetPeao);
        if (p) peoesList = [p];
        else peoesList = allPeoes;
    }

    if (peoesList.length === 0) {
        return `
            <div class="report-a4-page portrait" style="background: #fff; color: #000; padding: 15mm; width: 210mm; min-height: 285mm; box-sizing: border-box; font-family: Arial, sans-serif; margin: 0 auto 24px auto; box-shadow: 0 0 30px rgba(0,0,0,0.6); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    ${getReportOfficialHeaderHTML("CONTRATO OFICIAL", "CONTRATO OFICIAL DE COMPETIDOR")}
                    <div style="border: 1px solid #000; border-top: none; padding: 60px 20px; text-align: center; font-weight: bold; color: #64748b;">
                        ⚠️ Nenhum competidor cadastrado para gerar contrato.
                    </div>
                </div>
                ${getReportOfficialFooterHTML()}
            </div>
        `;
    }

    const buildEnd = (e) => {
        if (!e) return '---';
        const sn = e.sn ? 'S/N' : (e.numero || '');
        return `${e.rua || ''}, ${sn}, ${e.bairro || ''}, ${e.cidade || ''}-${e.estado || ''}, CEP: ${e.cep || ''}`;
    };

    let fullSheets = '';

    peoesList.forEach((p, idx) => {
        const pNome = p.nome || 'COMPETIDOR';
        const pCpf = p.cpf || '---';
        const pCidade = p.cidade || '---';

        fullSheets += `
            <div class="report-a4-page portrait" style="background: #fff; color: #000; padding: 14mm; width: 210mm; min-height: 285mm; box-sizing: border-box; font-family: Arial, sans-serif; margin: 0 auto 24px auto; font-size: 11px; line-height: 1.5; box-shadow: 0 0 30px rgba(0,0,0,0.6); display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; break-after: page;">
                <div>
                    ${getReportOfficialHeaderHTML("CONTRATO OFICIAL", "CONTRATO DE PRESTAÇÃO DE SERVIÇOS E PARTICIPAÇÃO")}
                    
                    <div style="border: 1px solid #000; border-top: none; padding: 18px 22px;">
                        <div style="margin-bottom: 10px; text-align: justify;">
                            <strong>CONTRATANTE:</strong> ${con.razaoSocial || 'ORGANIZADORA DO EVENTO'}, pessoa jurídica inscrita no CNPJ sob nº ${con.cnpj || '---'}, com sede em ${buildEnd(end)}, neste ato representada por ${con.nomeRepresentante || '---'}, portador(a) do CPF nº ${con.cpfRepresentante || '---'} e RG nº ${con.rgRepresentante || '---'}.
                        </div>

                        <div style="margin-bottom: 12px; text-align: justify;">
                            <strong>CONTRATADO(A):</strong> <strong>${pNome}</strong>, atleta profissional de rodeio, inscrito(a) no CPF sob nº <strong>${pCpf}</strong>, residente e domiciliado(a) na comarca de <strong>${pCidade}</strong>.
                        </div>

                        <div style="margin-bottom: 10px; text-align: justify;">
                            <strong>CLÁUSULA PRIMEIRA - DO OBJETO:</strong> O presente instrumento tem como objeto a participação do(a) CONTRATADO(A) como atleta competidor em montarias em touros durante o evento <strong>${currentEvent.name || 'RODEIO'}</strong>, na cidade de <strong>${currentEvent.city || 'ARENA'}</strong>.
                        </div>

                        <div style="margin-bottom: 10px; text-align: justify;">
                            <strong>CLÁUSULA SEGUNDA - DO PRAZO:</strong> O presente contrato vigorará pelo prazo de <strong>${c2.prazoNum || '3'} (${c2.prazoExtenso || 'três'}) dias</strong>, com início em <strong>${c2.dataInicio || '---'}</strong> e término em <strong>${c2.dataFim || '---'}</strong>.
                        </div>

                        <div style="margin-bottom: 10px; text-align: justify;">
                            <strong>CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES:</strong> O(A) CONTRATADO(A) declara possuir pleno conhecimento dos riscos inerentes ao esporte, comprometendo-se a cumprir o regulamento oficial e as normas de bem-estar animal.
                        </div>

                        <div style="margin-bottom: 10px; text-align: justify;">
                            <strong>CLÁUSULA QUARTA - DA PREMIAÇÃO:</strong> Fica estipulada a premiação total no valor de <strong>${cq.premiacaoTotal || 'R$ 0,00'} (${cq.premiacaoTotalExtenso || ''})</strong> na modalidade ${cq.modalidade || 'Montaria em Touros'}, a ser distribuída aos melhores colocados segundo a tabela oficial do evento.
                        </div>

                        <div style="margin-bottom: 12px; text-align: justify;">
                            <strong>CLÁUSULA QUINTA - DO FORO:</strong> Para dirimir quaisquer dúvidas oriundas deste contrato, as partes elegem o foro da comarca de <strong>${forum.cidade || currentEvent.city || 'local do evento'}</strong>.
                        </div>

                        <div style="margin-top: 24px; text-align: center; font-size: 11px;">
                            ${currentEvent.city || 'Local'}, ${c2.dataInicio || new Date().toLocaleDateString('pt-BR')}
                        </div>

                        <div style="display: flex; justify-content: space-between; gap: 40px; margin-top: 40px; padding: 0 10px;">
                            <div style="flex: 1; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; font-size: 10px;">
                                CONTRATANTE<br>
                                <span style="font-size: 9px; font-weight: normal; color: #64748b;">${con.razaoSocial || 'ORGANIZADORA'}</span>
                            </div>
                            <div style="flex: 1; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; font-size: 10px;">
                                CONTRATADO (COMPETIDOR)<br>
                                <span style="font-size: 9px; font-weight: normal; color: #64748b;">${pNome}</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${getReportOfficialFooterHTML(idx + 1, peoesList.length)}
            </div>
        `;
    });

    return fullSheets;
}