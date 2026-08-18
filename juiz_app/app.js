/**
 * RODEOAPP - Portal do Juiz (juiz.rodeoapp.pro)
 * Sistema de Lançamento de Notas em Tempo Real com Ably.com & Supabase
 * Foco na Arena, Sincronização entre Juízes, Regras de Escala, Bloqueio de Segurança em Alterações & Re-Ride (<80 pts)
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
    currentBull: null,
    waitingMatchup: null, // { riderName, day, matchupIdx }
    activeArenaRider: null, // Nome do competidor em avaliação na arena agora
    activeArenaJudgeName: null,
    pendingEditMatchupIdx: null // Guard para desbloqueio por senha ao alterar nota já dada
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
let waitingPollInterval = null;

// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
window.addEventListener('load', async () => {
    console.log("[RODEOAPP JUIZ] Aplicação carregada.");

    // Inicializa conexão Ably no boot para validar status
    initAblyBaseConnection();

    // Verifica parâmetros de URL
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
// REGRAS DE ESCALA DE NOTAS (1 JUIZ vs 2+ JUÍZES)
// ==========================================
function getJudgeScoreLimit() {
    const rawJudges = (window.state.eventData && (window.state.eventData.judges || (window.state.eventData.juizes ? window.state.eventData.juizes.length : 2))) || 2;
    const totalJudges = parseInt(rawJudges) || 2;
    return (totalJudges === 1) ? 50 : 25;
}

function getDefaultScoresForJudge() {
    const max = getJudgeScoreLimit();
    if (max === 50) {
        return { touroInt: 44, touroDec: ',00', compInt: 45, compDec: ',50' };
    }
    return { touroInt: 22, touroDec: ',00', compInt: 23, compDec: ',75' };
}

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
    window.state.activeArenaRider = null;
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
        rawLocal.judges = rawLocal.judges || (rawLocal.juizes ? rawLocal.juizes.length : 2) || 2;
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
        rawLocal.judges = rawLocal.judges || (rawLocal.juizes ? rawLocal.juizes.length : 2) || 2;
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

    const judgeCount = parseInt(window.state.eventData?.judges || 2) || 2;
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

    if (j.senha && j.senha.trim().length > 0) {
        document.getElementById('modal-pwd-judge-name').innerText = j.nome;
        document.getElementById('input-judge-pin').value = '';
        document.getElementById('judge-auth-error').classList.add('hidden');
        document.getElementById('modal-judge-password').classList.remove('hidden');
        setTimeout(() => document.getElementById('input-judge-pin')?.focus(), 100);
    } else {
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

    if (window.state.shareId) {
        subscribeToEventChannel(window.state.shareId);
    }

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

    const maxPts = getJudgeScoreLimit();

    // Atualiza cabeçalho do Juiz
    document.getElementById('header-judge-name').innerText = window.state.currentJudge.nome;
    document.getElementById('header-judge-scale').innerText = `0 - ${maxPts} pts`;
    document.getElementById('flow-judge-scale-tag').innerText = `0-${maxPts}`;
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
    const jIdx = window.state.currentJudge ? window.state.currentJudge.idx : 0;

    let totalCount = riders.length;
    let gradedCount = 0;
    let pendingCount = 0;

    const activeArenaRiderName = window.state.activeArenaRider;

    const cardsHTML = riders.map((r, idx) => {
        const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
        const bull = bulls[bullIdx] || { nome: 'TOURO INDEFINIDO', cia: '---', lado: '---' };

        // Procura a nota deste Juiz para este competidor neste dia
        const existingNota = notas.find(n => 
            (n.peao === r.nome || n.peaoNome === r.nome) && 
            n.dia === window.state.selectedDay && 
            n.status !== 'substituida'
        );

        let myJudgeGraded = false;
        let myScoreObj = { bScore: 0, rScore: 0, isFall: false };

        if (existingNota) {
            if (existingNota.juizes_status && existingNota.juizes_status[jIdx] && existingNota.juizes_status[jIdx].enviado) {
                myJudgeGraded = true;
                myScoreObj = {
                    bScore: existingNota.juizes_status[jIdx].touro || 0,
                    rScore: existingNota.juizes_status[jIdx].peao || 0,
                    isFall: existingNota.juizes_status[jIdx].isFall || false
                };
            } else if (existingNota.judgeIdx === jIdx) {
                myJudgeGraded = true;
                myScoreObj = {
                    bScore: existingNota.bullScore || 0,
                    rScore: existingNota.riderScore || 0,
                    isFall: existingNota.isFall || (existingNota.riderScore === 0)
                };
            } else if (jIdx === 0 && (existingNota.j1_touro > 0 || existingNota.j1_peao > 0)) {
                myJudgeGraded = true;
                myScoreObj = { bScore: existingNota.j1_touro, rScore: existingNota.j1_peao, isFall: (existingNota.j1_peao === 0) };
            } else if (jIdx === 1 && (existingNota.j2_touro > 0 || existingNota.j2_peao > 0)) {
                myJudgeGraded = true;
                myScoreObj = { bScore: existingNota.j2_touro, rScore: existingNota.j2_peao, isFall: (existingNota.j2_peao === 0) };
            }
        }

        const isGraded = myJudgeGraded;
        if (isGraded) gradedCount++;
        else pendingCount++;

        // Filtro
        if (window.state.activeFilter === 'pending' && isGraded) return '';
        if (window.state.activeFilter === 'graded' && !isGraded) return '';

        const isRerideRide = Boolean(r.isReride);
        const isArenaActive = (activeArenaRiderName && activeArenaRiderName.trim().toUpperCase() === r.nome.trim().toUpperCase());

        // Efeito de Foco na Arena: se houver um competidor ativo na arena, os outros diminuem opacidade
        let cardContainerClasses = "glass-card p-4 sm:p-5 rounded-3xl transition-all cursor-pointer group touch-active relative overflow-hidden";
        
        if (isArenaActive) {
            cardContainerClasses += " arena-active-card border-yellow-400";
        } else if (activeArenaRiderName) {
            cardContainerClasses += " opacity-35 scale-[0.98] hover:opacity-100 hover:scale-100 border-white/5";
        } else {
            cardContainerClasses += isRerideRide 
                ? ' border-2 border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/10'
                : (isGraded ? ' border-emerald-500/30 bg-emerald-950/10' : ' border-white/5 hover:border-yellow-500/40 bg-slate-900/60');
        }

        let statusBadge = '';

        if (isArenaActive) {
            statusBadge = `
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-yellow-500/40 text-yellow-300">
                    <span class="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        🔴 NA ARENA AGORA
                    </span>
                    <span class="text-xs font-black uppercase underline">
                        ${isGraded ? 'EDITAR NOTA ➔' : 'AVALIAR AGORA ➔'}
                    </span>
                </div>`;
        } else if (isGraded) {
            if (myScoreObj.isFall || myScoreObj.rScore === 0) {
                statusBadge = `
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-red-500/20 text-red-400">
                        <span class="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">🔒 SEM TEMPO (0,00)</span>
                        <span class="text-sm font-black italic">Touro: ${myScoreObj.bScore.toFixed(2)}</span>
                    </div>`;
            } else {
                const total = (myScoreObj.rScore + myScoreObj.bScore).toFixed(2);
                statusBadge = `
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-emerald-500/20 text-emerald-400">
                        <div class="text-[10px] font-bold text-slate-400">
                            🔒 Touro: <b class="text-white">${myScoreObj.bScore.toFixed(2)}</b> | Peão: <b class="text-yellow-400">${myScoreObj.rScore.toFixed(2)}</b>
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

        const rerideTag = isRerideRide 
            ? `<span class="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase ml-2 shadow-sm animate-pulse">RE-RIDE</span>` 
            : '';

        return `
            <div onclick="handleRideCardClick(${idx})" class="${cardContainerClasses}">
                <div class="flex items-start justify-between gap-3 mb-2.5">
                    <span class="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-center font-black text-xs">
                        ${idx + 1}
                    </span>
                    <div class="flex-1 min-w-0">
                        <div class="text-[9px] font-black uppercase tracking-widest text-slate-500">COMPETIDOR</div>
                        <div class="text-base sm:text-lg font-black text-white uppercase truncate flex items-center">
                            ${r.nome} ${rerideTag}
                        </div>
                        <div class="text-[10px] font-medium text-slate-400 uppercase truncate">${r.cidade || ''}</div>
                    </div>
                </div>

                <div class="bg-black/50 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                        <div class="text-[8px] font-black uppercase tracking-widest text-yellow-500/80">ANIMAL / TOURO</div>
                        <div class="text-sm font-black text-yellow-500 uppercase truncate">${bull.nome}</div>
                        <div class="text-[10px] font-medium text-slate-400 truncate">${bull.cia}</div>
                    </div>
                    <span class="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
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
// SEGURANÇA: CLIQUE NO CARD & SENHA DE ALTERAÇÃO
// ==========================================
window.handleRideCardClick = (matchupIdx) => {
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay);
    if (!currentSorteio) return;

    const r = currentSorteio.riders[matchupIdx];
    const notas = (window.state.eventData && window.state.eventData.notas) || [];
    const jIdx = window.state.currentJudge ? window.state.currentJudge.idx : 0;

    // Verifica se este Juiz já avaliou este competidor
    const existingNota = notas.find(n => 
        (n.peao === r.nome || n.peaoNome === r.nome) && 
        n.dia === window.state.selectedDay && 
        n.status !== 'substituida'
    );

    let isAlreadyGradedByMe = false;
    if (existingNota) {
        if (existingNota.juizes_status && existingNota.juizes_status[jIdx] && existingNota.juizes_status[jIdx].enviado) {
            isAlreadyGradedByMe = true;
        } else if (existingNota.judgeIdx === jIdx) {
            isAlreadyGradedByMe = true;
        } else if (jIdx === 0 && (existingNota.j1_touro > 0 || existingNota.j1_peao > 0)) {
            isAlreadyGradedByMe = true;
        } else if (jIdx === 1 && (existingNota.j2_touro > 0 || existingNota.j2_peao > 0)) {
            isAlreadyGradedByMe = true;
        }
    }

    // Se já foi avaliada e o juiz tem senha cadastrada: pede senha para autorizar alteração
    const hasSenha = window.state.currentJudge && window.state.currentJudge.senha && String(window.state.currentJudge.senha).trim().length > 0;

    if (isAlreadyGradedByMe && hasSenha) {
        window.state.pendingEditMatchupIdx = matchupIdx;
        document.getElementById('input-edit-security-pin').value = '';
        document.getElementById('edit-security-error').classList.add('hidden');
        document.getElementById('modal-security-change-score').classList.remove('hidden');
        setTimeout(() => document.getElementById('input-edit-security-pin')?.focus(), 100);
    } else {
        // Montaria PENDENTE ou juiz sem senha: abre direto!
        openScoreModalDirect(matchupIdx);
    }
};

window.confirmUnlockEditScore = () => {
    const pin = (document.getElementById('input-edit-security-pin')?.value || '').trim();
    const correctPin = (window.state.currentJudge?.senha || '').trim();

    if (pin === correctPin) {
        closeSecurityChangeScoreModal();
        const targetIdx = window.state.pendingEditMatchupIdx;
        window.state.pendingEditMatchupIdx = null;
        openScoreModalDirect(targetIdx);
        showToast("Acesso liberado para alteração de nota.", "success");
    } else {
        document.getElementById('edit-security-error').classList.remove('hidden');
        document.getElementById('input-edit-security-pin')?.select();
    }
};

window.closeSecurityChangeScoreModal = () => {
    document.getElementById('modal-security-change-score').classList.add('hidden');
    window.state.pendingEditMatchupIdx = null;
};

// ==========================================
// FLUXO DE JULGAMENTO (PRANCHETAS 1, 2, 3, 4)
// ==========================================
function openScoreModalDirect(matchupIdx) {
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay);
    if (!currentSorteio) return;

    const r = currentSorteio.riders[matchupIdx];
    const bullIdx = currentSorteio.assignments[matchupIdx] !== undefined ? currentSorteio.assignments[matchupIdx] : matchupIdx;
    const bull = currentSorteio.bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };

    window.state.currentMatchupIdx = matchupIdx;
    window.state.currentRider = r;
    window.state.currentBull = bull;

    // Transmite pelo Ably que esta montaria está sendo avaliada na arena agora
    broadcastActiveArenaMatchup(r.nome);

    // Preenche cabeçalhos fixos da montaria
    document.getElementById('flow-matchup-number').innerText = `#${matchupIdx + 1}`;
    document.getElementById('flow-matchup-title').innerText = `${r.nome} VS ${bull.nome}`;
    document.getElementById('flow-rider-city').innerText = r.cidade || 'CIDADE - UF';
    document.getElementById('flow-bull-cia').innerText = bull.cia || 'CIA DE RODEIO';

    // Defaults conforme escala (0-25 ou 0-50)
    const defaults = getDefaultScoresForJudge();
    window.judgingState.touroInt = defaults.touroInt;
    window.judgingState.touroDec = defaults.touroDec;
    window.judgingState.competidorInt = defaults.compInt;
    window.judgingState.competidorDec = defaults.compDec;
    window.judgingState.isFall = false;
    window.judgingState.isReride = false;

    updateDisplays();
    goToStepTouro();
    document.getElementById('view-judging-flow').classList.remove('hidden');
}

function broadcastActiveArenaMatchup(riderName) {
    window.state.activeArenaRider = riderName;
    renderRidesList();

    if (ablyChannel && window.state.currentJudge) {
        ablyChannel.publish('judge-active-matchup', {
            riderName: riderName,
            day: window.state.selectedDay,
            judgeName: window.state.currentJudge.nome,
            timestamp: Date.now()
        });
    }
}

function broadcastClearActiveArenaMatchup() {
    window.state.activeArenaRider = null;
    renderRidesList();

    if (ablyChannel) {
        ablyChannel.publish('judge-active-matchup-cleared', {
            day: window.state.selectedDay,
            timestamp: Date.now()
        });
    }
}

function updateDisplays() {
    const touroStr = `${window.judgingState.touroInt}${window.judgingState.touroDec}`;
    const competidorStr = `${window.judgingState.competidorInt}${window.judgingState.competidorDec}`;

    const dispTouro = document.getElementById('display-touro-score');
    if (dispTouro) dispTouro.innerText = touroStr;

    const dispComp = document.getElementById('display-competidor-score');
    if (dispComp) dispComp.innerText = competidorStr;

    const confTouro = document.getElementById('conf-touro-score');
    if (confTouro) confTouro.innerText = touroStr;

    const confComp = document.getElementById('conf-competidor-score');
    if (confComp) confComp.innerText = competidorStr;

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
        document.getElementById('view-judging-flow').classList.add('hidden');
        broadcastClearActiveArenaMatchup();
        window.state.currentMatchupIdx = null;
    }
};

// ==========================================
// TECLADO NUMÉRICO TÁTIL COM LIMITES DA REGRA
// ==========================================
window.keypadPress = (num) => {
    triggerHaptic();
    const maxLimit = getJudgeScoreLimit(); // 25 ou 50

    if (window.judgingState.step === 'touro') {
        let current = String(window.judgingState.touroInt);
        if (current === '0' || current.length >= 2) {
            window.judgingState.touroInt = num;
        } else {
            let combined = parseInt(current + num);
            if (combined > maxLimit) combined = maxLimit;
            window.judgingState.touroInt = combined;
        }
    } else if (window.judgingState.step === 'competidor') {
        let current = String(window.judgingState.competidorInt);
        if (current === '0' || current.length >= 2) {
            window.judgingState.competidorInt = num;
        } else {
            let combined = parseInt(current + num);
            if (combined > maxLimit) combined = maxLimit;
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
        goToStepTouro();
        showToast("Julgamento Normal", "info");
    } else if (type === 'reride') {
        window.judgingState.isReride = true;
        window.judgingState.isFall = false;
        submitFinalScoreToRealtime(false, true);
    } else if (type === 'apelo') {
        window.judgingState.competidorInt = 0;
        window.judgingState.competidorDec = ',00';
        window.judgingState.isFall = true;
        window.judgingState.isReride = false;
        updateDisplays();
        goToStepConferencia();
        showToast("Apelo / Sem Tempo (0,00) registrado", "error");
    }
};

// ==========================================
// ENVIO FINAL EM TEMPO REAL & SINCRONIZAÇÃO
// ==========================================
window.submitFinalScoreToRealtime = async (isFallOverride = null, isRerideOverride = null) => {
    if (!window.state.currentJudge || !window.state.currentRider) return;

    const bVal = parseScoreToNumber(window.judgingState.touroInt, window.judgingState.touroDec);
    const rVal = parseScoreToNumber(window.judgingState.competidorInt, window.judgingState.competidorDec);
    
    const isFall = isFallOverride !== null ? isFallOverride : (window.judgingState.isFall || (rVal === 0));
    const isReride = isRerideOverride !== null ? isRerideOverride : window.judgingState.isReride;
    const finalRiderScore = isFall ? 0 : rVal;
    const totalScore = isFall ? 0 : (bVal + rVal);

    const btnSubmit = document.getElementById('btn-submit-final');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="animate-spin mr-2">🔄</span> ENVIANDO...`;
    }

    const scorePayload = {
        shareId: window.state.shareId,
        day: window.state.selectedDay,
        matchupIdx: window.state.currentMatchupIdx,
        riderName: window.state.currentRider.nome,
        riderCity: window.state.currentRider.cidade || '',
        bullName: window.state.currentBull.nome,
        bullCia: window.state.currentBull.cia || '',
        judgeName: window.state.currentJudge.nome,
        judgeIdx: window.state.currentJudge.idx,
        riderScore: finalRiderScore,
        bullScore: bVal,
        totalScore: totalScore,
        isFall: isFall,
        fallTime: isFall ? '0.00' : '8.00',
        isReride: isReride,
        timestamp: Date.now()
    };

    try {
        // 1. Transmite via Ably Realtime para todos os juízes e o Admin
        if (ablyChannel) {
            ablyChannel.publish('judge-score-submitted', scorePayload);
            console.log("[ABLY REALTIME] Nota enviada via canal:", scorePayload);
        }

        // 2. Persiste diretamente no Supabase
        await saveScoreDirectToSupabase(scorePayload);

        // 3. Atualiza estado na memória local
        updateLocalScoreState(scorePayload);

        // Fecha a tela de notas
        document.getElementById('view-judging-flow').classList.add('hidden');
        broadcastClearActiveArenaMatchup();

        // 4. Verifica se todos os juízes já enviaram para esta montaria
        const totalJudgesExpected = parseInt(window.state.eventData.judges || 2) || 2;
        const currentMatchupScores = getMatchupScoresMap(scorePayload.riderName, scorePayload.day);

        const submittedJudgesCount = Object.keys(currentMatchupScores).length;

        if (submittedJudgesCount < totalJudgesExpected && totalJudgesExpected > 1) {
            // Entra na tela de "Aguardando avaliação do outro juiz" com polling de verificação
            window.state.waitingMatchup = {
                riderName: scorePayload.riderName,
                day: scorePayload.day,
                matchupIdx: scorePayload.matchupIdx
            };
            showWaitingOtherJudgeModal(currentMatchupScores, totalJudgesExpected);
            startWaitingPollInterval();
        } else {
            // Todos os juízes já avaliaram!
            handleAllJudgesCompleted(currentMatchupScores, scorePayload);
        }

    } catch (err) {
        console.error("Erro ao enviar nota:", err);
        showToast("Erro ao transmitir nota. Verifique a conexão.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>⚡ ENVIAR NOTA</span>`;
        }
    }
};

function getMatchupScoresMap(riderName, day) {
    const notas = window.state.eventData?.notas || [];
    const nota = notas.find(n => (n.peao === riderName || n.peaoNome === riderName) && n.dia === day && n.status !== 'substituida');
    if (!nota) return {};
    return nota.juizes_status || {};
}

function showWaitingOtherJudgeModal(scoresMap, totalExpected) {
    const container = document.getElementById('waiting-judges-status-list');
    const juizes = getJudgesListNormalized();

    container.innerHTML = juizes.map((j, idx) => {
        const isDone = Boolean(scoresMap[idx] && scoresMap[idx].enviado);
        const statusText = isDone ? '✅ AVALIAÇÃO CONCLUÍDA' : '⏳ AGUARDANDO NOTA...';
        const colorClass = isDone ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-amber-400 border-amber-500/30 bg-amber-950/20 animate-pulse';

        return `
            <div class="glass-card p-3 rounded-xl border ${colorClass} flex items-center justify-between text-xs font-bold">
                <span class="text-white uppercase">${j.nome}</span>
                <span>${statusText}</span>
            </div>
        `;
    }).join('');

    document.getElementById('modal-waiting-other-judge').classList.remove('hidden');
}

function startWaitingPollInterval() {
    stopWaitingPollInterval();
    waitingPollInterval = setInterval(async () => {
        if (!window.state.waitingMatchup) {
            stopWaitingPollInterval();
            return;
        }

        try {
            const cloudEvent = await fetchCloudEventByShare(window.state.shareId, window.state.sharePassword);
            if (cloudEvent) {
                const rawLocal = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : cloudEvent.detalhes;
                window.state.eventData = rawLocal;

                const totalJudgesExpected = parseInt(window.state.eventData.judges || 2) || 2;
                const scoresMap = getMatchupScoresMap(window.state.waitingMatchup.riderName, window.state.waitingMatchup.day);

                if (Object.keys(scoresMap).length >= totalJudgesExpected) {
                    stopWaitingPollInterval();
                    handleAllJudgesCompleted(scoresMap, { riderName: window.state.waitingMatchup.riderName, day: window.state.waitingMatchup.day });
                } else {
                    showWaitingOtherJudgeModal(scoresMap, totalJudgesExpected);
                }
            }
        } catch(e) {}
    }, 1800);
}

function stopWaitingPollInterval() {
    if (waitingPollInterval) {
        clearInterval(waitingPollInterval);
        waitingPollInterval = null;
    }
}

window.closeWaitingOtherJudgeModal = () => {
    stopWaitingPollInterval();
    document.getElementById('modal-waiting-other-judge').classList.add('hidden');
    window.state.waitingMatchup = null;
    renderRidesList();
};

function handleAllJudgesCompleted(scoresMap, scorePayload) {
    stopWaitingPollInterval();
    document.getElementById('modal-waiting-other-judge').classList.add('hidden');
    window.state.waitingMatchup = null;

    // Calcula Soma Total de Todos os Juízes
    let sumTotal = 0;
    let anyQueda = false;

    Object.values(scoresMap).forEach(s => {
        if (s.isFall || s.peao === 0) anyQueda = true;
        sumTotal += (s.touro || 0) + (s.peao || 0);
    });

    console.log(`[RODEOAPP JUIZ] Montaria finalizada por todos os juízes. Soma Total: ${sumTotal}, Queda: ${anyQueda}`);

    // Regra: Se a nota for < 80.00 e NÃO for queda (0,00) -> Abre Popup de Re-Ride
    if (sumTotal > 0 && sumTotal < 80.00 && !anyQueda) {
        document.getElementById('low-score-sum-display').innerText = sumTotal.toFixed(2);
        document.getElementById('modal-low-score-reride').classList.remove('hidden');
    } else {
        renderRidesList();
        showToast("Notas consolidadas com sucesso!", "success");
    }
}

// ==========================================
// POP-UP DE RE-RIDE (< 80 PONTOS)
// ==========================================
window.handleKeepLowScore = () => {
    document.getElementById('modal-low-score-reride').classList.add('hidden');
    showToast("Nota confirmada mantida!", "success");
    renderRidesList();
};

window.handleRequestNextBullReride = async () => {
    document.getElementById('modal-low-score-reride').classList.add('hidden');

    if (!window.state.currentRider) {
        renderRidesList();
        return;
    }

    const rider = window.state.currentRider;
    const day = window.state.selectedDay;
    const sorteios = window.state.eventData.sorteios || [];
    const currentSorteio = sorteios.find(s => s.day === day);

    // 1. Busca próximo touro reserva disponível no evento
    const availableBull = findNextAvailableRerideBull(currentSorteio);

    if (availableBull) {
        // Cria nova montaria de Re-Ride no sorteio
        if (currentSorteio) {
            currentSorteio.riders = currentSorteio.riders || [];
            currentSorteio.bulls = currentSorteio.bulls || [];
            currentSorteio.assignments = currentSorteio.assignments || {};

            const newRiderIndex = currentSorteio.riders.length;
            currentSorteio.riders.push({
                nome: rider.nome,
                cidade: rider.cidade || '',
                isReride: true
            });

            let bullIdx = currentSorteio.bulls.findIndex(b => b.nome === availableBull.nome);
            if (bullIdx === -1) {
                currentSorteio.bulls.push(availableBull);
                bullIdx = currentSorteio.bulls.length - 1;
            }

            currentSorteio.assignments[newRiderIndex] = bullIdx;

            // Salva na nuvem e transmite via Ably
            await syncEventUpdateToCloudAndAbly();

            // Mostra Pop-up de Sucesso
            document.getElementById('reride-msg-icon').className = "w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto mb-4 flex items-center justify-center text-3xl border border-emerald-500/40";
            document.getElementById('reride-msg-title').innerText = "MONTARIA DE RE-RIDE CRIADA";
            document.getElementById('reride-msg-text').innerHTML = `Montaria Criada para o Competidor <b class="text-white">${rider.nome}</b>, Touro <b class="text-yellow-400">${availableBull.nome}</b> (CIA ${availableBull.cia || '---'})`;
            document.getElementById('modal-reride-result-msg').classList.remove('hidden');
        }
    } else {
        // Sem touros de re-ride disponíveis
        document.getElementById('reride-msg-icon').className = "w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto mb-4 flex items-center justify-center text-3xl border border-amber-500/40";
        document.getElementById('reride-msg-title').innerText = "SEM TOUROS DE RE-RIDE";
        document.getElementById('reride-msg-text').innerText = "Sem Touros de Re-ride, Montaria para o Próximo Dia";
        document.getElementById('modal-reride-result-msg').classList.remove('hidden');
    }
};

function findNextAvailableRerideBull(currentSorteio) {
    const allBulls = window.state.eventData?.boiadas || [];
    const usedBulls = Object.values(currentSorteio.assignments || {}).map(idx => currentSorteio.bulls[idx]?.nome);

    // Touros marcados como re-ride ou touros ainda não utilizados hoje
    const available = allBulls.find(b => !usedBulls.includes(b.nome));
    if (available) return available;

    if (allBulls.length > 0) {
        return allBulls[Math.floor(Math.random() * allBulls.length)];
    }

    return null;
}

window.closeRerideResultModal = () => {
    document.getElementById('modal-reride-result-msg').classList.add('hidden');
    renderRidesList();
};

// ==========================================
// PERSISTÊNCIA & ABLY PUBSUB
// ==========================================
function updateLocalScoreState(scorePayload) {
    window.state.eventData.notas = window.state.eventData.notas || [];
    
    let consolidatedNota = window.state.eventData.notas.find(n => 
        (n.peao === scorePayload.riderName || n.peaoNome === scorePayload.riderName) && 
        n.dia === scorePayload.day && 
        n.status !== 'substituida'
    );

    if (!consolidatedNota) {
        consolidatedNota = {
            id: 'n_' + Date.now(),
            dia: scorePayload.day,
            peao: scorePayload.riderName,
            peaoNome: scorePayload.riderName,
            touro: scorePayload.bullName,
            isReride: Boolean(scorePayload.isReride),
            tempo: scorePayload.isFall ? 0.00 : 8.00,
            j1_touro: 0, j1_peao: 0,
            j2_touro: 0, j2_peao: 0,
            j3_touro: 0, j3_peao: 0,
            totalPeao: 0, totalTouro: 0, totalGeral: 0,
            status: scorePayload.isReride ? 're_ride' : 'ativa',
            juizes_status: {},
            updatedAt: new Date().toISOString()
        };
        window.state.eventData.notas.push(consolidatedNota);
    }

    const jIdx = scorePayload.judgeIdx;
    if (jIdx === 0) {
        consolidatedNota.j1_touro = scorePayload.bullScore;
        consolidatedNota.j1_peao = scorePayload.riderScore;
    } else if (jIdx === 1) {
        consolidatedNota.j2_touro = scorePayload.bullScore;
        consolidatedNota.j2_peao = scorePayload.riderScore;
    } else if (jIdx === 2) {
        consolidatedNota.j3_touro = scorePayload.bullScore;
        consolidatedNota.j3_peao = scorePayload.riderScore;
    }

    consolidatedNota.juizes_status = consolidatedNota.juizes_status || {};
    consolidatedNota.juizes_status[jIdx] = {
        nome: scorePayload.judgeName,
        touro: scorePayload.bullScore,
        peao: scorePayload.riderScore,
        isFall: scorePayload.isFall,
        enviado: true,
        timestamp: scorePayload.timestamp
    };

    const hasPeao = (consolidatedNota.j1_peao > 0 || consolidatedNota.j2_peao > 0 || consolidatedNota.j3_peao > 0);
    consolidatedNota.tempo = hasPeao ? 8.00 : 0.00;
    consolidatedNota.totalTouro = (consolidatedNota.j1_touro || 0) + (consolidatedNota.j2_touro || 0) + (consolidatedNota.j3_touro || 0);
    consolidatedNota.totalPeao = (consolidatedNota.j1_peao || 0) + (consolidatedNota.j2_peao || 0) + (consolidatedNota.j3_peao || 0);
    consolidatedNota.totalGeral = consolidatedNota.totalTouro + consolidatedNota.totalPeao;
}

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

        let consolidatedNota = localData.notas.find(n => 
            (n.peao === scorePayload.riderName || n.peaoNome === scorePayload.riderName) && 
            n.dia === scorePayload.day && 
            n.status !== 'substituida'
        );

        if (!consolidatedNota) {
            consolidatedNota = {
                id: 'n_' + Date.now(),
                dia: scorePayload.day,
                peao: scorePayload.riderName,
                peaoNome: scorePayload.riderName,
                touro: scorePayload.bullName,
                isReride: Boolean(scorePayload.isReride),
                tempo: scorePayload.isFall ? 0.00 : 8.00,
                j1_touro: 0, j1_peao: 0,
                j2_touro: 0, j2_peao: 0,
                j3_touro: 0, j3_peao: 0,
                totalPeao: 0, totalTouro: 0, totalGeral: 0,
                status: scorePayload.isReride ? 're_ride' : 'ativa',
                juizes_status: {},
                updatedAt: new Date().toISOString()
            };
            localData.notas.push(consolidatedNota);
        }

        const jIdx = scorePayload.judgeIdx;
        if (jIdx === 0) {
            consolidatedNota.j1_touro = scorePayload.bullScore;
            consolidatedNota.j1_peao = scorePayload.riderScore;
        } else if (jIdx === 1) {
            consolidatedNota.j2_touro = scorePayload.bullScore;
            consolidatedNota.j2_peao = scorePayload.riderScore;
        } else if (jIdx === 2) {
            consolidatedNota.j3_touro = scorePayload.bullScore;
            consolidatedNota.j3_peao = scorePayload.riderScore;
        }

        consolidatedNota.juizes_status = consolidatedNota.juizes_status || {};
        consolidatedNota.juizes_status[jIdx] = {
            nome: scorePayload.judgeName,
            touro: scorePayload.bullScore,
            peao: scorePayload.riderScore,
            isFall: scorePayload.isFall,
            enviado: true,
            timestamp: scorePayload.timestamp
        };

        const hasPeao = (consolidatedNota.j1_peao > 0 || consolidatedNota.j2_peao > 0 || consolidatedNota.j3_peao > 0);
        consolidatedNota.tempo = hasPeao ? 8.00 : 0.00;
        consolidatedNota.totalTouro = (consolidatedNota.j1_touro || 0) + (consolidatedNota.j2_touro || 0) + (consolidatedNota.j3_touro || 0);
        consolidatedNota.totalPeao = (consolidatedNota.j1_peao || 0) + (consolidatedNota.j2_peao || 0) + (consolidatedNota.j3_peao || 0);
        consolidatedNota.totalGeral = consolidatedNota.totalTouro + consolidatedNota.totalPeao;

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

async function syncEventUpdateToCloudAndAbly() {
    if (!window.state.eventId) return;

    try {
        const urlPatch = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(window.state.eventId)}`;
        const payload = {
            detalhes: { localData: window.state.eventData, share_id: window.state.shareId, share_password: window.state.sharePassword },
            updated_at: new Date().toISOString()
        };

        await fetch(urlPatch, {
            method: 'PATCH',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify(payload)
        });

        if (ablyChannel) {
            ablyChannel.publish('admin-event-updated', { localData: window.state.eventData });
        }
    } catch(e) {
        console.error("Erro ao sincronizar atualização de evento:", e);
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
            console.log(`[ABLY REALTIME] Conectado ao cluster Ably.`);
            if (!ablyChannel) updateAblyBadge('connected');
        });

        ablyClient.connection.on('disconnected', () => updateAblyBadge('disconnected'));
        ablyClient.connection.on('failed', () => updateAblyBadge('failed'));

    } catch (e) {
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

        // Escuta quando um juiz começa a avaliar uma montaria na arena (Destaque e Foco)
        ablyChannel.subscribe('judge-active-matchup', (message) => {
            if (message.data && message.data.riderName) {
                console.log("[ABLY REALTIME] Montaria ativa na arena:", message.data);
                window.state.activeArenaRider = message.data.riderName;
                window.state.activeArenaJudgeName = message.data.judgeName;
                renderRidesList();
            }
        });

        // Escuta quando a montaria ativa é finalizada ou cancelada
        ablyChannel.subscribe('judge-active-matchup-cleared', () => {
            window.state.activeArenaRider = null;
            window.state.activeArenaJudgeName = null;
            renderRidesList();
        });

        // Escuta notas enviadas por outros juízes
        ablyChannel.subscribe('judge-score-submitted', (message) => {
            console.log("[ABLY REALTIME] Nota recebida de outro Juiz:", message.data);
            if (message.data) {
                updateLocalScoreState(message.data);
                renderRidesList();

                // Se estava esperando este juiz na tela de espera
                if (window.state.waitingMatchup && window.state.waitingMatchup.riderName === message.data.riderName && window.state.waitingMatchup.day === message.data.day) {
                    const totalJudgesExpected = parseInt(window.state.eventData.judges || 2) || 2;
                    const scoresMap = getMatchupScoresMap(message.data.riderName, message.data.day);
                    
                    if (Object.keys(scoresMap).length >= totalJudgesExpected) {
                        handleAllJudgesCompleted(scoresMap, message.data);
                    } else {
                        showWaitingOtherJudgeModal(scoresMap, totalJudgesExpected);
                    }
                }
            }
        });

        // Escuta atualizações do Admin
        ablyChannel.subscribe('admin-event-updated', (message) => {
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
