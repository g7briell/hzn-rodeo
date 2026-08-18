/**
 * RODEOAPP - Portal do Juiz (juiz.rodeoapp.pro)
 * Sistema de Lançamento de Notas em Tempo Real com Ably.com & Supabase
 * Fluxo de Julgamento Tátil Baseado em Pranchetas (Arena Touch Flow)
 */

// ==========================================
// CONFIGURAÇÕES & CREDENCIAIS
// ==========================================
const SUPABASE_URL = 'https://api.rodeoapp.pro';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';

const SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// Chave oficial Ably Realtime
const DEFAULT_ABLY_KEY = 'ZpXrAw.0ShBdA:PN-cy5nGO2hVtllKkQIQppoPtl4FGufzq58uT9WHXts';

// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
window.state = {
    eventId: null,
    shareId: null,
    sharePassword: null,
    eventData: null,
    currentJudge: null, // { nome: 'MARCOS', senha: '123', idx: 0 }
    selectedDay: null,
    activeFilter: 'all',
    currentMatchupIdx: null,
    currentRider: null,
    currentBull: null
};

// Estado do Fluxo de Julgamento Ativo
window.judgingState = {
    step: 'touro', // 'touro' | 'competidor' | 'conferencia'
    touroInt: 22,
    touroDec: ',00',
    competidorInt: 23,
    competidorDec: ',75',
    isFall: false,
    isReride: false
};

let ablyClient = null;
let ablyChannel = null;

// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
window.addEventListener('load', async () => {
    console.log("[RODEOAPP JUIZ] Aplicação carregada.");

    // Inicializa conexão Ably no boot para validar status
    initAblyBaseConnection();

    // Verifica parâmetros de URL (ex: ?id=49expor-23086140&pass=1)
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('id') || urlParams.get('event');
    const paramPass = urlParams.get('pass') || urlParams.get('senha');
    const customAblyKey = urlParams.get('ably_key');

    if (customAblyKey) {
        localStorage.setItem('RODEOAPP_ABLY_KEY', customAblyKey);
    }

    if (paramId) {
        const idInput = document.getElementById('input-event-id');
        if (idInput) idInput.value = paramId;
        const passInput = document.getElementById('input-event-password');
        if (paramPass && passInput) passInput.value = paramPass;
    }

    // Tenta restaurar sessão anterior do localStorage
    const savedSession = loadSavedSession();
    if (savedSession && savedSession.shareId && savedSession.sharePassword) {
        await restoreSession(savedSession);
    } else {
        showView('view-login-event');
    }
});

// ==========================================
// GESTÃO DE SESSÃO & STORAGE
// ==========================================
function saveSession() {
    try {
        const sessionData = {
            shareId: window.state.shareId,
            sharePassword: window.state.sharePassword,
            judgeIdx: window.state.currentJudge ? window.state.currentJudge.idx : null,
            judgeNome: window.state.currentJudge ? window.state.currentJudge.nome : null,
            selectedDay: window.state.selectedDay
        };
        localStorage.setItem('RODEOAPP_JUIZ_SESSION', JSON.stringify(sessionData));
    } catch (e) {
        console.warn("Falha ao salvar sessão local:", e);
    }
}

function loadSavedSession() {
    try {
        const data = localStorage.getItem('RODEOAPP_JUIZ_SESSION');
        return data ? JSON.parse(data) : null;
    } catch(e) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('RODEOAPP_JUIZ_SESSION');
    window.state.eventId = null;
    window.state.shareId = null;
    window.state.sharePassword = null;
    window.state.eventData = null;
    window.state.currentJudge = null;
    window.state.selectedDay = null;
}

// ==========================================
// FLUXO DE LOGIN 1: EVENTO (ID + SENHA)
// ==========================================
window.handleEventLogin = async () => {
    const idInput = document.getElementById('input-event-id');
    const passInput = document.getElementById('input-event-password');
    const btnSubmit = document.getElementById('btn-submit-event');
    const errorEl = document.getElementById('login-error-msg');

    if (errorEl) errorEl.classList.add('hidden');

    const shareId = (idInput ? idInput.value : '').trim();
    const password = (passInput ? passInput.value : '').trim();

    if (!shareId || !password) {
        showLoginError("Por favor, preencha o ID e a Senha do Evento.");
        return false;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="animate-spin inline-block mr-2">🔄</span> Buscando Evento...`;
    }

    try {
        console.log(`[RODEOAPP JUIZ] Buscando evento com ID: "${shareId}"`);
        const cloudEvent = await fetchCloudEventByShare(shareId, password);
        
        if (!cloudEvent) {
            showLoginError("ID do evento ou senha incorretos. Verifique os dados no RODEOAPP.");
            return false;
        }

        window.state.shareId = shareId;
        window.state.sharePassword = password;
        
        const rawLocal = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : (cloudEvent.detalhes || {});
        rawLocal.name = rawLocal.name || cloudEvent.nome || 'EVENTO OFICIAL';
        rawLocal.judges = rawLocal.judges || (rawLocal.juizes ? rawLocal.juizes.length : 3) || 3;
        window.state.eventData = rawLocal;
        window.state.eventId = cloudEvent.id;

        // Atualiza header
        const headerEvent = document.getElementById('header-event-name');
        if (headerEvent) {
            headerEvent.innerText = window.state.eventData.name || 'EVENTO OFICIAL';
            headerEvent.classList.remove('hidden');
        }

        // Conecta ao canal específico do evento no Ably
        subscribeToEventChannel(shareId);

        // Salva sessão parcial
        saveSession();

        // Passa para Tela 2: Selecionar Juiz
        renderJudgesList();
        showView('view-select-judge');
        showToast("Conectado ao evento com sucesso!", "success");

    } catch (err) {
        console.error("Erro no login do evento:", err);
        showLoginError(err.message || "Erro de conexão com o servidor. Tente novamente.");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>CONECTAR AO EVENTO</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
        }
    }
    return false;
};

function showLoginError(msg) {
    const errorEl = document.getElementById('login-error-msg');
    if (errorEl) {
        errorEl.innerText = msg;
        errorEl.classList.remove('hidden');
    }
    showToast(msg, "error");
}

async function restoreSession(savedSession) {
    try {
        const cloudEvent = await fetchCloudEventByShare(savedSession.shareId, savedSession.sharePassword);
        if (!cloudEvent) {
            clearSession();
            showView('view-login-event');
            return;
        }

        window.state.shareId = savedSession.shareId;
        window.state.sharePassword = savedSession.sharePassword;
        
        const rawLocal = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : (cloudEvent.detalhes || {});
        rawLocal.name = rawLocal.name || cloudEvent.nome || 'EVENTO OFICIAL';
        rawLocal.judges = rawLocal.judges || (rawLocal.juizes ? rawLocal.juizes.length : 3) || 3;
        window.state.eventData = rawLocal;
        window.state.eventId = cloudEvent.id;

        const headerEvent = document.getElementById('header-event-name');
        if (headerEvent) {
            headerEvent.innerText = window.state.eventData.name || 'EVENTO OFICIAL';
            headerEvent.classList.remove('hidden');
        }

        subscribeToEventChannel(window.state.shareId);

        const juizes = getJudgesListNormalized();
        if (savedSession.judgeIdx !== null && juizes[savedSession.judgeIdx]) {
            window.state.currentJudge = juizes[savedSession.judgeIdx];
            window.state.selectedDay = savedSession.selectedDay || getDefaultDay();
            renderJudgeDashboard();
            showView('view-rides-list');
        } else {
            renderJudgesList();
            showView('view-select-judge');
        }
    } catch (e) {
        console.error("Erro ao restaurar sessão:", e);
        showView('view-login-event');
    }
}

async function fetchCloudEventByShare(shareId, password) {
    const cleanShareId = shareId.trim().toLowerCase();
    const cleanPassword = password.trim();

    const url = `${SUPABASE_URL}/rest/v1/eventos_oficiais?status=eq.compartilhado&select=*&order=created_at.desc&limit=150`;
    const resp = await fetch(url, { headers: SUPABASE_HEADERS });
    
    if (!resp.ok) {
        throw new Error(`Servidor respondeu com status ${resp.status}`);
    }

    const events = await resp.json();
    console.log(`[RODEOAPP JUIZ] Total de eventos compartilhados na nuvem: ${events ? events.length : 0}`);

    const found = (events || []).find(e => {
        const det = e.detalhes || {};
        const sId = String(det.share_id || '').trim().toLowerCase();
        const sPass = String(det.share_password || '').trim();
        return sId === cleanShareId && sPass === cleanPassword;
    });

    return found || null;
}

// ==========================================
// FLUXO DE LOGIN 2: SELEÇÃO DE JUIZ & SENHA
// ==========================================
let pendingJudgeSelection = null;

function getJudgesListNormalized() {
    const rawJudges = (window.state.eventData && window.state.eventData.juizes) || [];
    
    if (rawJudges.length > 0) {
        return rawJudges.map((j, idx) => ({
            nome: typeof j === 'string' ? j : (j.nome || `JUIZ ${idx + 1}`),
            senha: typeof j === 'object' ? (j.senha || '') : '',
            idx: idx
        }));
    }

    // Se a lista de juízes estiver vazia, gera conforme a contagem do evento (ex: 3 juízes)
    const judgeCount = parseInt(window.state.eventData.judges || 3) || 3;
    const generated = [];
    for (let i = 0; i < judgeCount; i++) {
        generated.push({
            nome: `JUIZ ${i + 1}`,
            senha: '',
            idx: i
        });
    }
    return generated;
}

function renderJudgesList() {
    const container = document.getElementById('judges-list-container');
    const juizes = getJudgesListNormalized();

    container.innerHTML = juizes.map((j, idx) => {
        const hasSenha = j.senha && String(j.senha).trim().length > 0;

        return `
            <button type="button" onclick="selectJudgeFromList(${idx})" class="glass-card p-5 rounded-2xl border-white/5 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all text-left flex items-center justify-between group touch-active cursor-pointer">
                <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-black text-sm group-hover:bg-yellow-500 group-hover:text-black transition-all">
                        ${idx + 1}
                    </div>
                    <div>
                        <div class="font-black text-white text-base uppercase group-hover:text-yellow-400 transition-colors">${j.nome}</div>
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Juiz Oficial • ${hasSenha ? '🔒 Senha Cadastrada' : 'Acesso Livre'}</div>
                    </div>
                </div>
                <div class="text-slate-500 group-hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>
            </button>
        `;
    }).join('');
}

window.selectJudgeFromList = (idx) => {
    const juizes = getJudgesListNormalized();
    const j = juizes[idx];
    if (!j) return;

    pendingJudgeSelection = j;

    // Se o juiz possui senha cadastrada, abre o modal de autenticação
    if (j.senha && j.senha.trim().length > 0) {
        document.getElementById('modal-pwd-judge-name').innerText = j.nome;
        document.getElementById('input-judge-pin').value = '';
        document.getElementById('judge-auth-error').classList.add('hidden');
        document.getElementById('modal-judge-password').classList.remove('hidden');
        setTimeout(() => document.getElementById('input-judge-pin')?.focus(), 100);
    } else {
        // Se não tem senha cadastrada, entra direto
        authenticateJudgeDirect(pendingJudgeSelection);
    }
};

window.handleJudgeAuth = () => {
    if (!pendingJudgeSelection) return;

    const inputPin = (document.getElementById('input-judge-pin')?.value || '').trim();
    const correctPin = pendingJudgeSelection.senha.trim();

    if (inputPin === correctPin) {
        closeJudgePasswordModal();
        authenticateJudgeDirect(pendingJudgeSelection);
    } else {
        document.getElementById('judge-auth-error').innerText = "Senha do juiz incorreta. Tente novamente.";
        document.getElementById('judge-auth-error').classList.remove('hidden');
        document.getElementById('input-judge-pin')?.select();
    }
};

function authenticateJudgeDirect(judgeObj) {
    window.state.currentJudge = judgeObj;
    saveSession();

    // Re-inicia Ably com clientId do Juiz
    if (window.state.shareId) {
        subscribeToEventChannel(window.state.shareId);
    }

    // Configura o Painel de Montarias
    window.state.selectedDay = window.state.selectedDay || getDefaultDay();
    renderJudgeDashboard();
    showView('view-rides-list');
    showToast(`Bem-vindo, ${judgeObj.nome}!`, "success");
}

window.closeJudgePasswordModal = () => {
    document.getElementById('modal-judge-password').classList.add('hidden');
    pendingJudgeSelection = null;
};

window.backToEventLogin = () => {
    showView('view-login-event');
};

// ==========================================
// PAINEL DE MONTARIAS DO JUIZ (TELA 3)
// ==========================================
function getDefaultDay() {
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    if (sorteios.length > 0) {
        return sorteios[sorteios.length - 1].day;
    }
    return 'DIA 1';
}

function renderJudgeDashboard() {
    if (!window.state.eventData) return;

    if (!window.state.currentJudge) {
        const juizes = getJudgesListNormalized();
        if (juizes.length > 0) {
            window.state.currentJudge = juizes[0];
            saveSession();
        } else {
            renderJudgesList();
            showView('view-select-judge');
            return;
        }
    }

    // Atualiza cabeçalho do Juiz
    document.getElementById('header-judge-name').innerText = window.state.currentJudge.nome;
    document.getElementById('judge-profile-chip').classList.remove('hidden');
    document.getElementById('rides-view-judge-name').innerText = window.state.currentJudge.nome;
    document.getElementById('rides-view-event-title').innerText = window.state.eventData.name || window.state.eventData.nome || 'EVENTO';

    // Renderiza Abas de Dias
    renderDaysTabs();

    // Renderiza Montarias do Dia Selecionado
    renderRidesList();
}

function renderDaysTabs() {
    const container = document.getElementById('days-tabs-container');
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];

    // Obter dias únicos disponíveis
    let days = sorteios.map(s => s.day);
    if (days.length === 0) {
        days = ['DIA 1'];
    } else {
        days = [...new Set(days)];
    }

    if (!window.state.selectedDay || !days.includes(window.state.selectedDay)) {
        window.state.selectedDay = days[0];
    }

    container.innerHTML = days.map(d => {
        const isActive = d === window.state.selectedDay;
        const activeClass = isActive 
            ? 'bg-yellow-500 text-black font-black shadow-lg shadow-yellow-500/20' 
            : 'bg-slate-900 text-slate-400 font-bold border border-slate-800 hover:text-white';

        return `
            <button type="button" onclick="selectDay('${d}')" class="px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all whitespace-nowrap touch-active cursor-pointer ${activeClass}">
                ${d.replace(/DIA/gi, 'ROUND')}
            </button>
        `;
    }).join('');
}

window.selectDay = (day) => {
    window.state.selectedDay = day;
    saveSession();
    renderDaysTabs();
    renderRidesList();
};

function renderRidesList() {
    const container = document.getElementById('rides-cards-container');
    const noRidesEl = document.getElementById('no-rides-message');
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay);

    if (!currentSorteio || !currentSorteio.riders || currentSorteio.riders.length === 0) {
        container.innerHTML = '';
        noRidesEl.classList.remove('hidden');
        updateCounters(0, 0, 0);
        return;
    }

    noRidesEl.classList.add('hidden');

    const riders = currentSorteio.riders;
    const bulls = currentSorteio.bulls || [];
    const assignments = currentSorteio.assignments || {};
    const notas = (window.state.eventData && window.state.eventData.notas) || [];

    let totalCount = riders.length;
    let gradedCount = 0;
    let pendingCount = 0;

    const cardsHTML = riders.map((r, idx) => {
        const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
        const bull = bulls[bullIdx] || { nome: 'TOURO INDEFINIDO', cia: '---', lado: '---' };

        // Procura a nota deste Juiz para este competidor neste dia
        const myScore = notas.find(n => 
            n.peaoNome === r.nome && 
            n.dia === window.state.selectedDay && 
            n.judgeIdx === window.state.currentJudge.idx && 
            n.status !== 'substituida'
        );

        const isGraded = Boolean(myScore);
        if (isGraded) gradedCount++;
        else pendingCount++;

        // Filtro
        if (window.state.activeFilter === 'pending' && isGraded) return '';
        if (window.state.activeFilter === 'graded' && !isGraded) return '';

        // Status Card
        let cardBorder = isGraded ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-white/5 hover:border-yellow-500/40 bg-slate-900/60';
        let statusBadge = '';

        if (isGraded) {
            const isZero = myScore.riderScore === 0 && myScore.bullScore === 0;
            if (isZero) {
                statusBadge = `
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-red-500/20 text-red-400">
                        <span class="text-[10px] font-black uppercase tracking-wider">STATUS</span>
                        <span class="text-sm font-black italic">SEM TEMPO (0,00)</span>
                    </div>`;
            } else {
                const total = (myScore.riderScore + myScore.bullScore).toFixed(2);
                statusBadge = `
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-emerald-500/20 text-emerald-400">
                        <div class="text-[10px] font-bold text-slate-400">
                            Touro: <b class="text-white">${myScore.bullScore.toFixed(2)}</b> | Peão: <b class="text-yellow-400">${myScore.riderScore.toFixed(2)}</b>
                        </div>
                        <div class="text-lg font-black italic font-mono text-emerald-400">
                            ${total}
                        </div>
                    </div>`;
            }
        } else {
            statusBadge = `
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PENDENTE</span>
                    <span class="text-xs font-black text-yellow-500 group-hover:underline flex items-center gap-1">
                        JULGAR ➔
                    </span>
                </div>`;
        }

        const rerideTag = r.isReride ? `<span class="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase ml-1.5">RE-RIDE</span>` : '';

        return `
            <div onclick="openScoreModal(${idx})" class="glass-card p-4 sm:p-5 rounded-3xl border ${cardBorder} transition-all cursor-pointer group touch-active relative overflow-hidden">
                <div class="flex items-start justify-between gap-3 mb-2.5">
                    <span class="w-7 h-7 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-center font-black text-xs">
                        ${idx + 1}
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">COMPETIDOR</div>
                        <div class="text-sm sm:text-base font-black text-white uppercase truncate flex items-center">
                            ${r.nome} ${rerideTag}
                        </div>
                        <div class="text-[10px] font-medium text-slate-400 uppercase truncate">${r.cidade || ''}</div>
                    </div>
                </div>

                <div class="bg-black/40 p-2.5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                        <div class="text-[8px] font-black uppercase tracking-widest text-yellow-500/80">ANIMAL</div>
                        <div class="text-xs font-black text-yellow-500 uppercase truncate">${bull.nome}</div>
                        <div class="text-[9px] font-medium text-slate-500 truncate">${bull.cia}</div>
                    </div>
                    <span class="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                        ${bull.lado ? bull.lado.toUpperCase() : 'C'}
                    </span>
                </div>

                ${statusBadge}
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHTML;
    updateCounters(totalCount, gradedCount, pendingCount);
}

function updateCounters(total, graded, pending) {
    document.getElementById('count-all').innerText = total;
    document.getElementById('count-graded').innerText = graded;
    document.getElementById('count-pending').innerText = pending;
    document.getElementById('rides-progress-badge').innerText = `${graded} / ${total} Avaliadas`;
}

window.filterRides = (type) => {
    window.state.activeFilter = type;
    ['all', 'pending', 'graded'].forEach(f => {
        const btn = document.getElementById(`filter-btn-${f}`);
        if (btn) {
            if (f === type) {
                btn.className = "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500 text-black shadow-lg transition-all touch-active cursor-pointer";
            } else {
                btn.className = "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-all touch-active cursor-pointer";
            }
        }
    });
    renderRidesList();
};

// ==========================================
// FLUXO DE JULGAMENTO (PRANCHETAS 1, 2, 3, 4)
// ==========================================
window.openScoreModal = (matchupIdx) => {
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay);
    if (!currentSorteio) return;

    const r = currentSorteio.riders[matchupIdx];
    const bullIdx = currentSorteio.assignments[matchupIdx] !== undefined ? currentSorteio.assignments[matchupIdx] : matchupIdx;
    const bull = currentSorteio.bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };

    window.state.currentMatchupIdx = matchupIdx;
    window.state.currentRider = r;
    window.state.currentBull = bull;

    // Preenche cabeçalhos fixos da montaria
    document.getElementById('flow-matchup-number').innerText = `#${matchupIdx + 1}`;
    document.getElementById('flow-matchup-title').innerText = `${r.nome} VS ${bull.nome}`;
    document.getElementById('flow-rider-city').innerText = r.cidade || 'CIDADE - UF';
    document.getElementById('flow-bull-cia').innerText = bull.cia || 'CIA DE RODEIO';

    // Carrega notas pré-existentes se houver
    const notas = window.state.eventData.notas || [];
    const myScore = notas.find(n => 
        n.peaoNome === r.nome && 
        n.dia === window.state.selectedDay && 
        n.judgeIdx === window.state.currentJudge.idx && 
        n.status !== 'substituida'
    );

    if (myScore) {
        const bScore = myScore.bullScore;
        const rScore = myScore.riderScore;
        
        window.judgingState.touroInt = Math.floor(bScore);
        window.judgingState.touroDec = formatDecimalString(bScore % 1);
        
        window.judgingState.competidorInt = Math.floor(rScore);
        window.judgingState.competidorDec = formatDecimalString(rScore % 1);
        window.judgingState.isFall = (bScore === 0 && rScore === 0);
        window.judgingState.isReride = false;
    } else {
        // Defaults conforme o estilo da prancheta (22,00 touro e 23,75 competidor)
        window.judgingState.touroInt = 22;
        window.judgingState.touroDec = ',00';
        window.judgingState.competidorInt = 23;
        window.judgingState.competidorDec = ',75';
        window.judgingState.isFall = false;
        window.judgingState.isReride = false;
    }

    updateDisplays();
    goToStepTouro();
    document.getElementById('view-judging-flow').classList.remove('hidden');
};

function formatDecimalString(decVal) {
    const rounded = Math.round(decVal * 100);
    if (rounded === 75) return ',75';
    if (rounded === 50) return ',50';
    if (rounded === 25) return ',25';
    return ',00';
}

function updateDisplays() {
    const touroStr = `${window.judgingState.touroInt}${window.judgingState.touroDec}`;
    const competidorStr = `${window.judgingState.competidorInt}${window.judgingState.competidorDec}`;

    // Atualiza Displays das Pranchetas 1 e 2
    const dispTouro = document.getElementById('display-touro-score');
    if (dispTouro) dispTouro.innerText = touroStr;

    const dispComp = document.getElementById('display-competidor-score');
    if (dispComp) dispComp.innerText = competidorStr;

    // Atualiza Displays da Prancheta 3 (Conferência)
    const confTouro = document.getElementById('conf-touro-score');
    if (confTouro) confTouro.innerText = touroStr;

    const confComp = document.getElementById('conf-competidor-score');
    if (confComp) confComp.innerText = competidorStr;

    // Calcula Soma Total
    const bVal = parseScoreToNumber(window.judgingState.touroInt, window.judgingState.touroDec);
    const rVal = parseScoreToNumber(window.judgingState.competidorInt, window.judgingState.competidorDec);
    const totalVal = (bVal + rVal).toFixed(2).replace('.', ',');

    const confTotal = document.getElementById('conf-total-score');
    if (confTotal) confTotal.innerText = totalVal;
}

function parseScoreToNumber(intVal, decStr) {
    let decNum = 0.0;
    if (decStr === ',75') decNum = 0.75;
    else if (decStr === ',50') decNum = 0.50;
    else if (decStr === ',25') decNum = 0.25;
    return parseFloat(intVal) + decNum;
}

// Navegação entre Pranchetas
window.goToStepTouro = () => {
    window.judgingState.step = 'touro';
    document.getElementById('step-julgando-touro').classList.remove('hidden');
    document.getElementById('step-julgando-competidor').classList.add('hidden');
    document.getElementById('step-conferencia-notas').classList.add('hidden');
};

window.goToStepCompetidor = () => {
    window.judgingState.step = 'competidor';
    document.getElementById('step-julgando-touro').classList.add('hidden');
    document.getElementById('step-julgando-competidor').classList.remove('hidden');
    document.getElementById('step-conferencia-notas').classList.add('hidden');
};

window.goToStepConferencia = () => {
    window.judgingState.step = 'conferencia';
    updateDisplays();
    document.getElementById('step-julgando-touro').classList.add('hidden');
    document.getElementById('step-julgando-competidor').classList.add('hidden');
    document.getElementById('step-conferencia-notas').classList.remove('hidden');
};

window.handleJudgingBackBtn = () => {
    if (window.judgingState.step === 'conferencia') {
        goToStepCompetidor();
    } else if (window.judgingState.step === 'competidor') {
        goToStepTouro();
    } else {
        // Fecha o fluxo de julgamento e volta ao painel
        document.getElementById('view-judging-flow').classList.add('hidden');
        window.state.currentMatchupIdx = null;
    }
};

// ==========================================
// TECLADO NUMÉRICO TÁTIL (ARENA TOUCH)
// ==========================================
window.keypadPress = (num) => {
    triggerHaptic();

    if (window.judgingState.step === 'touro') {
        let current = String(window.judgingState.touroInt);
        // Se estava 0 ou valor padrão inicial, substitui com o novo dígito
        if (current === '0' || current.length >= 2) {
            window.judgingState.touroInt = num;
        } else {
            let combined = parseInt(current + num);
            if (combined > 50) combined = 50; // Limite máximo
            window.judgingState.touroInt = combined;
        }
    } else if (window.judgingState.step === 'competidor') {
        let current = String(window.judgingState.competidorInt);
        if (current === '0' || current.length >= 2) {
            window.judgingState.competidorInt = num;
        } else {
            let combined = parseInt(current + num);
            if (combined > 50) combined = 50;
            window.judgingState.competidorInt = combined;
        }
    }

    updateDisplays();
};

window.keypadFraction = (frac) => {
    triggerHaptic();

    if (window.judgingState.step === 'touro') {
        window.judgingState.touroDec = frac;
    } else if (window.judgingState.step === 'competidor') {
        window.judgingState.competidorDec = frac;
    }

    updateDisplays();
};

window.keypadBackspace = () => {
    triggerHaptic();

    if (window.judgingState.step === 'touro') {
        let current = String(window.judgingState.touroInt);
        if (current.length > 1) {
            window.judgingState.touroInt = parseInt(current.slice(0, -1));
        } else {
            window.judgingState.touroInt = 0;
            window.judgingState.touroDec = ',00';
        }
    } else if (window.judgingState.step === 'competidor') {
        let current = String(window.judgingState.competidorInt);
        if (current.length > 1) {
            window.judgingState.competidorInt = parseInt(current.slice(0, -1));
        } else {
            window.judgingState.competidorInt = 0;
            window.judgingState.competidorDec = ',00';
        }
    }

    updateDisplays();
};

function triggerHaptic() {
    if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(25); } catch(e) {}
    }
}

// ==========================================
// PRANCHETA 4: MODAL DE VAR E DECISÕES
// ==========================================
window.openVarModal = () => {
    document.getElementById('modal-var-decisions').classList.remove('hidden');
};

window.closeVarModal = () => {
    document.getElementById('modal-var-decisions').classList.add('hidden');
};

window.applyVarDecision = (type) => {
    closeVarModal();

    if (type === 'julgar') {
        // Volta para digitação normal
        goToStepTouro();
        showToast("Julgamento Normal", "info");
    } else if (type === 'reride') {
        window.judgingState.isReride = true;
        window.judgingState.isFall = false;
        // Envia direto como Re-ride
        submitFinalScoreToRealtime(false, true);
    } else if (type === 'apelo') {
        // Apelo / Sem Tempo / Queda (0,00)
        window.judgingState.touroInt = 0;
        window.judgingState.touroDec = ',00';
        window.judgingState.competidorInt = 0;
        window.judgingState.competidorDec = ',00';
        window.judgingState.isFall = true;
        window.judgingState.isReride = false;
        updateDisplays();
        goToStepConferencia();
        showToast("Apelo / Sem Tempo (0,00) selecionado", "error");
    }
};

// ==========================================
// ENVIO FINAL EM TEMPO REAL (ABLY + SUPABASE)
// ==========================================
window.submitFinalScoreToRealtime = async (isFallOverride = null, isRerideOverride = null) => {
    if (!window.state.currentJudge || !window.state.currentRider) return;

    const bVal = parseScoreToNumber(window.judgingState.touroInt, window.judgingState.touroDec);
    const rVal = parseScoreToNumber(window.judgingState.competidorInt, window.judgingState.competidorDec);
    
    const isFall = isFallOverride !== null ? isFallOverride : (window.judgingState.isFall || (bVal === 0 && rVal === 0));
    const isReride = isRerideOverride !== null ? isRerideOverride : window.judgingState.isReride;
    const totalScore = isFall ? 0 : (bVal + rVal);

    const btnSubmit = document.getElementById('btn-submit-final');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="animate-spin mr-2">🔄</span> TRANSMITINDO...`;
    }

    const scorePayload = {
        shareId: window.state.shareId,
        day: window.state.selectedDay,
        matchupIdx: window.state.currentMatchupIdx,
        riderName: window.state.currentRider.nome,
        bullName: window.state.currentBull.nome,
        bullCia: window.state.currentBull.cia,
        judgeName: window.state.currentJudge.nome,
        judgeIdx: window.state.currentJudge.idx,
        riderScore: isFall ? 0 : rVal,
        bullScore: isFall ? 0 : bVal,
        totalScore: totalScore,
        isFall: isFall,
        fallTime: isFall ? '0.00' : '8.00',
        isReride: isReride,
        timestamp: Date.now()
    };

    try {
        // 1. Envia via Ably Realtime (WebSocket ultra-rápido para o Admin)
        if (ablyChannel) {
            ablyChannel.publish('judge-score-submitted', scorePayload);
            console.log("[ABLY REALTIME] Nota enviada via canal:", scorePayload);
        } else {
            console.warn("Ably canal não conectado, gravando direto no Supabase.");
        }

        // 2. Grava diretamente no Supabase para persistência oficial
        await saveScoreDirectToSupabase(scorePayload);

        // 3. Atualiza estado local da lista
        window.state.eventData.notas = window.state.eventData.notas || [];
        const existingIdx = window.state.eventData.notas.findIndex(n => 
            n.peaoNome === scorePayload.riderName && 
            n.dia === scorePayload.day && 
            n.judgeIdx === scorePayload.judgeIdx && 
            n.status !== 'substituida'
        );

        const localNota = {
            peaoNome: scorePayload.riderName,
            dia: scorePayload.day,
            judgeIdx: scorePayload.judgeIdx,
            juizNome: scorePayload.judgeName,
            riderScore: scorePayload.riderScore,
            bullScore: scorePayload.bullScore,
            fallTime: scorePayload.fallTime,
            status: isReride ? 'substituida' : 'ativa',
            updatedAt: new Date().toISOString()
        };

        if (existingIdx > -1) {
            window.state.eventData.notas[existingIdx] = localNota;
        } else {
            window.state.eventData.notas.push(localNota);
        }

        // Fecha a tela cheia de julgamento e volta ao painel
        document.getElementById('view-judging-flow').classList.add('hidden');
        window.state.currentMatchupIdx = null;

        renderRidesList();
        showToast("⚡ Nota transmitida em tempo real!", "success");

    } catch (err) {
        console.error("Erro ao enviar nota:", err);
        showToast("Erro ao transmitir nota. Verifique a conexão.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>⚡ ENVIAR</span>`;
        }
    }
};

async function saveScoreDirectToSupabase(scorePayload) {
    if (!window.state.eventId) return;

    try {
        const urlGet = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(window.state.eventId)}&select=*`;
        const getRes = await fetch(urlGet, { headers: SUPABASE_HEADERS });
        if (!getRes.ok) return;

        const rows = await getRes.json();
        if (!rows || rows.length === 0) return;

        const currentEventRow = rows[0];
        const detalhes = currentEventRow.detalhes || {};
        const localData = detalhes.localData || detalhes;
        localData.notas = localData.notas || [];

        const existingIdx = localData.notas.findIndex(n => 
            n.peaoNome === scorePayload.riderName && 
            n.dia === scorePayload.day && 
            n.judgeIdx === scorePayload.judgeIdx && 
            n.status !== 'substituida'
        );

        const notaToSave = {
            peaoNome: scorePayload.riderName,
            dia: scorePayload.day,
            judgeIdx: scorePayload.judgeIdx,
            juizNome: scorePayload.judgeName,
            riderScore: scorePayload.riderScore,
            bullScore: scorePayload.bullScore,
            fallTime: scorePayload.fallTime,
            status: scorePayload.isReride ? 'substituida' : 'ativa',
            updatedAt: new Date().toISOString()
        };

        if (existingIdx > -1) {
            localData.notas[existingIdx] = notaToSave;
        } else {
            localData.notas.push(notaToSave);
        }

        detalhes.localData = localData;

        const urlPatch = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(window.state.eventId)}`;
        await fetch(urlPatch, {
            method: 'PATCH',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify({ detalhes, updated_at: new Date().toISOString() })
        });

    } catch (err) {
        console.warn("Aviso na gravação direta Supabase:", err);
    }
}

// ==========================================
// ABLY REALTIME CLIENT & LIFECYCLE
// ==========================================
function initAblyBaseConnection() {
    if (typeof Ably === 'undefined') {
        console.warn("Ably SDK não disponível globalmente.");
        updateAblyBadge('failed');
        return;
    }

    try {
        const ablyKey = localStorage.getItem('RODEOAPP_ABLY_KEY') || DEFAULT_ABLY_KEY;
        ablyClient = new Ably.Realtime({ key: ablyKey, clientId: `juiz-init-${Date.now()}` });

        ablyClient.connection.on('connected', () => {
            console.log(`[ABLY REALTIME] Conectado ao cluster Ably com sucesso.`);
            if (!ablyChannel) {
                updateAblyBadge('connected');
            }
        });

        ablyClient.connection.on('disconnected', () => {
            updateAblyBadge('disconnected');
        });

        ablyClient.connection.on('failed', (err) => {
            console.error(`[ABLY REALTIME] Falha na conexão Ably:`, err);
            updateAblyBadge('failed');
        });

    } catch (e) {
        console.error("Erro ao instanciar Ably:", e);
        updateAblyBadge('failed');
    }
}

function subscribeToEventChannel(shareId) {
    if (!shareId) return;

    try {
        if (!ablyClient) {
            const ablyKey = localStorage.getItem('RODEOAPP_ABLY_KEY') || DEFAULT_ABLY_KEY;
            ablyClient = new Ably.Realtime({ key: ablyKey, clientId: `juiz-${window.state.currentJudge ? window.state.currentJudge.nome : 'anon'}-${Date.now()}` });
        }

        if (ablyChannel) {
            ablyChannel.unsubscribe();
            ablyChannel = null;
        }

        const channelName = `rodeoapp-event-${shareId}`;
        ablyChannel = ablyClient.channels.get(channelName);

        updateAblyBadge('live');

        // Escutar atualizações do Administrador (ex: sorteio novo, re-ride gerado)
        ablyChannel.subscribe('admin-event-updated', (message) => {
            console.log("[ABLY REALTIME] Atualização do evento recebida do Administrador:", message.data);
            if (message.data && message.data.localData) {
                window.state.eventData = message.data.localData;
                renderJudgeDashboard();
                showToast("Evento atualizado pelo Administrador!", "info");
            }
        });

    } catch (err) {
        console.error("Erro ao conectar canal do evento no Ably:", err);
    }
}

function closeAblyConnection() {
    try {
        if (ablyChannel) {
            ablyChannel.unsubscribe();
            ablyChannel = null;
        }
        if (ablyClient) {
            ablyClient.close();
            ablyClient = null;
        }
    } catch(e) {}
}

function updateAblyBadge(status) {
    const dot = document.getElementById('ably-status-dot');
    const text = document.getElementById('ably-status-text');
    if (!dot || !text) return;

    if (status === 'live') {
        dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse";
        text.innerText = "ABLY: AO VIVO";
        text.className = "text-emerald-400";
    } else if (status === 'connected') {
        dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse";
        text.innerText = "ABLY: ONLINE";
        text.className = "text-emerald-400";
    } else if (status === 'disconnected') {
        dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500";
        text.innerText = "ABLY: RECONECTANDO";
        text.className = "text-amber-400";
    } else {
        dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
        text.innerText = "ABLY: DESCONECTADO";
        text.className = "text-red-400";
    }
}

window.refreshEventDataFromCloud = async () => {
    if (!window.state.shareId || !window.state.sharePassword) return;
    showToast("Atualizando dados da nuvem...", "info");
    try {
        const cloudEvent = await fetchCloudEventByShare(window.state.shareId, window.state.sharePassword);
        if (cloudEvent) {
            window.state.eventData = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : cloudEvent.detalhes;
            renderJudgeDashboard();
            showToast("Dados atualizados!", "success");
        }
    } catch (e) {
        showToast("Falha ao atualizar dados.", "error");
    }
};

// ==========================================
// MODAL DE OPÇÕES DO JUIZ
// ==========================================
window.openJudgeMenuModal = () => {
    document.getElementById('judge-menu-info').innerText = `${window.state.currentJudge ? window.state.currentJudge.nome : 'JUIZ'} • ${window.state.eventData ? window.state.eventData.name : ''}`;
    document.getElementById('modal-judge-menu').classList.remove('hidden');
};

window.closeJudgeMenuModal = () => {
    document.getElementById('modal-judge-menu').classList.add('hidden');
};

window.switchJudge = () => {
    closeJudgeMenuModal();
    window.state.currentJudge = null;
    saveSession();
    renderJudgesList();
    showView('view-select-judge');
};

window.logoutEvent = () => {
    closeJudgeMenuModal();
    clearSession();
    closeAblyConnection();
    document.getElementById('header-event-name').classList.add('hidden');
    document.getElementById('judge-profile-chip').classList.add('hidden');
    showView('view-login-event');
    showToast("Você saiu do evento.", "info");
};

// ==========================================
// HELPERS DE UI & TOAST
// ==========================================
function showView(viewId) {
    const views = ['view-login-event', 'view-select-judge', 'view-rides-list'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === viewId) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });
}

window.togglePasswordVisibility = (inputId) => {
    const el = document.getElementById(inputId);
    if (el) {
        el.type = el.type === 'password' ? 'text' : 'password';
    }
};

let toastTimeout = null;
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const title = document.getElementById('toast-title');
    const msg = document.getElementById('toast-message');
    const icon = document.getElementById('toast-icon');
    const body = document.getElementById('toast-body');

    if (!container) return;

    if (type === 'success') {
        icon.innerText = '✅';
        title.innerText = 'Sucesso';
        body.style.borderColor = '#10B981';
    } else if (type === 'error') {
        icon.innerText = '❌';
        title.innerText = 'Atenção';
        body.style.borderColor = '#EF4444';
    } else {
        icon.innerText = '⚡';
        title.innerText = 'RODEOAPP Realtime';
        body.style.borderColor = '#EAB308';
    }

    msg.innerText = message;

    container.classList.remove('opacity-0', '-translate-y-full');
    container.classList.add('opacity-100', 'translate-y-0');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        container.classList.remove('opacity-100', 'translate-y-0');
        container.classList.add('opacity-0', '-translate-y-full');
    }, 3500);
}
