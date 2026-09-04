/**
 * RODEOAPP - Portal do Juiz (juiz.rodeoapp.pro)
 * Sistema de Lançamento de Notas em Tempo Real com Ably.com & Supabase
 * Foco na Arena, Sincronização entre Juízes, Regras de Escala, Bloqueio de Segurança em Alterações & Re-Ride (<80 pts)
 */

// ==========================================
// PREVENÇÃO DE ZOOM ACIDENTAL NO IOS SAFARI (DOUBLE-TAP & PINCH)
// ==========================================
let __lastTouchEndTime = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - __lastTouchEndTime <= 350) {
        event.preventDefault();
    }
    __lastTouchEndTime = now;
}, { passive: false });

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

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
    touroInt: 0,
    touroDec: ',00',
    competidorInt: 0,
    competidorDec: ',00',
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
    return { touroInt: 0, touroDec: ',00', compInt: 0, compDec: ',00' };
}

// ==========================================
// GESTÃO DE SESSÃO & STORAGE
// ==========================================
function saveSession() {
    try {
        const sessionData = {
            shareId: window.state.shareId,
            sharePassword: window.state.sharePassword,
            judgeIdx: (window.state.currentJudge && window.state.currentJudge.idx !== undefined && window.state.currentJudge.idx !== null) ? window.state.currentJudge.idx : null,
            judgeNome: window.state.currentJudge ? (typeof window.state.currentJudge === 'string' ? window.state.currentJudge : window.state.currentJudge.nome) : null,
            selectedDay: window.state.selectedDay
        };
        localStorage.setItem('RODEOAPP_JUIZ_SESSION', JSON.stringify(sessionData));
    } catch (e) {
        console.warn("Falha ao salvar sessão local:", e);
    }
}

function getCurrentJudgeName() {
    if (window.state.currentJudge) {
        return typeof window.state.currentJudge === 'string' ? window.state.currentJudge : (window.state.currentJudge.nome || 'JUIZ');
    }
    return 'JUIZ';
}

function getCurrentEventName() {
    if (window.state.eventData) {
        return window.state.eventData.name || window.state.eventData.nome || '49 EXPORÃ';
    }
    return '49 EXPORÃ';
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

function normalizeEventData(cloudEvent) {
    if (!cloudEvent) return null;
    const detalhes = cloudEvent.detalhes || {};
    const localData = (detalhes.localData && typeof detalhes.localData === 'object') ? detalhes.localData : detalhes;
    
    // Normalização completa de todas as propriedades fundamentais
    localData.name = localData.name || localData.nome || cloudEvent.nome || '49 EXPORÃ';
    localData.juizes = localData.juizes || detalhes.juizes || [];
    localData.judges = localData.judges || detalhes.judges || (localData.juizes.length > 0 ? localData.juizes.length : 2) || 2;
    localData.sorteios = localData.sorteios || detalhes.sorteios || [];
    localData.boiadas = localData.boiadas || detalhes.boiadas || [];
    localData.notas = localData.notas || detalhes.notas || [];
    
    return localData;
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

        const cleanShareId = String(cloudEvent.share_id || shareId).trim().toLowerCase();
        window.state.shareId = cleanShareId;
        window.state.sharePassword = password;
        window.state.eventData = normalizeEventData(cloudEvent);
        window.state.eventId = cloudEvent.id;

        // Atualiza header
        const headerEvent = document.getElementById('header-event-name');
        if (headerEvent) {
            headerEvent.innerText = window.state.eventData.name || 'EVENTO OFICIAL';
            headerEvent.classList.remove('hidden');
        }

        // Conecta ao canal específico do evento no Ably
        subscribeToEventChannel(cleanShareId);

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

        const cleanShareId = String(cloudEvent.share_id || savedSession.shareId).trim().toLowerCase();
        window.state.shareId = cleanShareId;
        window.state.sharePassword = savedSession.sharePassword;
        window.state.eventData = normalizeEventData(cloudEvent);
        window.state.eventId = cloudEvent.id;

        const headerEvent = document.getElementById('header-event-name');
        if (headerEvent) {
            headerEvent.innerText = window.state.eventData.name || 'EVENTO OFICIAL';
            headerEvent.classList.remove('hidden');
        }

        subscribeToEventChannel(window.state.shareId);

        const juizes = getJudgesListNormalized();
        
        let targetJudge = null;
        if (savedSession.judgeIdx !== null && savedSession.judgeIdx !== undefined && juizes[savedSession.judgeIdx]) {
            targetJudge = juizes[savedSession.judgeIdx];
        } else if (savedSession.judgeNome) {
            targetJudge = juizes.find(j => j.nome === savedSession.judgeNome) || null;
        }

        if (targetJudge) {
            window.state.currentJudge = targetJudge;
            renderRoundsList();
            showView('view-rounds-select');
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
    if (!window.state.eventData) return [];
    const rawJudges = window.state.eventData.juizes || [];
    
    if (rawJudges.length > 0) {
        return rawJudges.map((j, idx) => ({
            nome: typeof j === 'string' ? j : (j.nome || `JUIZ ${idx + 1}`),
            senha: typeof j === 'object' ? (j.senha || '') : '',
            idx: idx
        }));
    }

    const judgeCount = parseInt(window.state.eventData.judges || 2) || 2;
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
    const correctPin = String(pendingJudgeSelection.senha || '').trim();

    if (inputPin === correctPin) {
        const selectedJudge = pendingJudgeSelection; // Captura antes de fechar a modal
        closeJudgePasswordModal();
        authenticateJudgeDirect(selectedJudge);
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

    renderRoundsList();
    showView('view-rounds-select');
    showToast(`Bem-vindo, ${judgeObj.nome}!`, "success");
}

window.closeJudgePasswordModal = () => {
    document.getElementById('modal-judge-password').classList.add('hidden');
    pendingJudgeSelection = null;
};

window.backToEventLogin = () => {
    showView('view-login-event');
};

window.backToJudgeSelect = () => {
    renderJudgesList();
    showView('view-select-judge');
};

window.backToRoundsSelect = () => {
    renderRoundsList();
    showView('view-rounds-select');
};

// ==========================================
// TELA DE SELEÇÃO DE ROUNDS DO EVENTO
// ==========================================
let pendingFinishedRoundDay = null;

function getEventRoundsList() {
    if (!window.state.eventData) return [];
    
    const sorteios = window.state.eventData.sorteios || [];
    const totalDaysConfigured = parseInt(window.state.eventData.days || 3) || 3;
    const rounds = [];
    
    // 1. Adiciona todos os sorteios reais existentes no evento
    sorteios.forEach((s, idx) => {
        const rawDay = (s.day || `DIA ${idx + 1}`).trim();
        
        let label = rawDay.toUpperCase();
        if (label.startsWith('DIA ')) {
            label = label.replace('DIA ', 'ROUND ');
        }
        
        rounds.push({
            roundNumber: idx + 1,
            label: label,
            internalDay: s.day,
            sorteio: s
        });
    });
    
    // 2. Adiciona os rounds futuros configurados no evento que ainda não têm sorteio realizado
    const totalNeeded = Math.max(totalDaysConfigured, rounds.length);
    for (let i = rounds.length + 1; i <= totalNeeded; i++) {
        let label = `ROUND ${i}`;
        if (i === totalNeeded && totalNeeded >= 4) {
            label = `GRANDE FINAL`;
        } else if (i === totalNeeded - 1 && totalNeeded >= 4) {
            label = `SEMI FINAL`;
        }
        
        rounds.push({
            roundNumber: i,
            label: label,
            internalDay: `DIA ${i}`,
            sorteio: null
        });
    }
    
    return rounds;
}

function renderRoundsList() {
    const container = document.getElementById('rounds-cards-container');
    if (!container) return;

    const rounds = getEventRoundsList();
    const notas = (window.state.eventData && window.state.eventData.notas) || [];
    const jIdx = window.state.currentJudge ? window.state.currentJudge.idx : 0;

    container.innerHTML = rounds.map((r) => {
        const hasSorteio = r.sorteio && r.sorteio.riders && r.sorteio.riders.length > 0;
        const totalRiders = hasSorteio ? r.sorteio.riders.length : 0;
        
        // Data do sorteio
        let dataSorteioFormatada = 'Hoje';
        if (r.sorteio && r.sorteio.date) {
            dataSorteioFormatada = String(r.sorteio.date).split(',')[0].trim();
        }

        // Verifica se todas as montarias deste round já foram julgadas
        let isConcluido = false;
        let dataInicioAvaliacao = dataSorteioFormatada;
        let gradedCount = 0;

        if (hasSorteio) {
            r.sorteio.riders.forEach(rd => {
                const rNome = (typeof rd === 'string' ? rd : (rd && rd.nome ? rd.nome : '')).trim();
                const existingNota = notas.find(n => 
                    (n.peao === rNome || n.peaoNome === rNome) && 
                    (n.dia === r.internalDay || n.dia === r.label) && 
                    n.status !== 'substituida'
                );

                if (existingNota) {
                    if (existingNota.juizes_status && existingNota.juizes_status[jIdx] && existingNota.juizes_status[jIdx].enviado) {
                        gradedCount++;
                    } else if (existingNota.judgeIdx === jIdx || (jIdx === 0 && existingNota.j1_touro > 0) || (jIdx === 1 && existingNota.j2_touro > 0)) {
                        gradedCount++;
                    }
                    if (existingNota.created_at) {
                        try {
                            const d = new Date(existingNota.created_at);
                            dataInicioAvaliacao = d.toLocaleDateString('pt-BR');
                        } catch(e) {}
                    }
                }
            });

            if (totalRiders > 0 && gradedCount >= totalRiders) {
                isConcluido = true;
            }
        }

        // Estilos e Badges
        if (!hasSorteio) {
            return `
                <div class="glass-card p-5 sm:p-6 rounded-3xl border-white/5 opacity-40 cursor-not-allowed text-left">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
                            ${r.label}
                        </span>
                        <span class="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            🔒 BLOQUEADO
                        </span>
                    </div>
                    <h3 class="text-xl font-black italic uppercase text-slate-500 mb-1">
                        ${r.label}
                    </h3>
                    <p class="text-xs font-bold text-slate-600">
                        (Sorteio não realizado)
                    </p>
                </div>
            `;
        }

        if (isConcluido) {
            return `
                <div onclick="handleRoundCardClick('${r.internalDay}', true, true, '${r.label}')" class="glass-card p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400 transition-all text-left group touch-active cursor-pointer shadow-lg shadow-emerald-950/30">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                            ${r.label} • ${totalRiders} MONTARIAS
                        </span>
                        <span class="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg">
                            ✓ 100% JULGADO
                        </span>
                    </div>
                    <h3 class="text-xl font-black italic uppercase text-white group-hover:text-emerald-400 transition-colors mb-1 flex items-center justify-between">
                        <span>${r.label}</span>
                        <span class="text-xs text-slate-400 font-bold group-hover:text-white">🔒 EXIGE SENHA ➔</span>
                    </h3>
                    <p class="text-xs font-bold text-emerald-300/80">
                        (Rodeio Avaliado dia ${dataInicioAvaliacao})
                    </p>
                </div>
            `;
        }

        // Round Ativo / Pendente
        return `
            <div onclick="handleRoundCardClick('${r.internalDay}', false, true, '${r.label}')" class="glass-card p-5 sm:p-6 rounded-3xl border-2 border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-500/10 transition-all text-left group touch-active cursor-pointer shadow-xl shadow-yellow-500/10">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-xl border border-yellow-500/30">
                        ${r.label} • ${totalRiders} MONTARIAS
                    </span>
                    <span class="text-[10px] font-black uppercase tracking-wider text-black bg-yellow-500 px-2.5 py-1 rounded-lg font-black animate-pulse">
                        ⚡ EM ANDAMENTO (${gradedCount}/${totalRiders})
                    </span>
                </div>
                <h3 class="text-xl font-black italic uppercase text-white group-hover:text-yellow-400 transition-colors mb-1 flex items-center justify-between">
                    <span>${r.label}</span>
                    <span class="text-xs text-yellow-400 font-black group-hover:underline">ENTRAR NA ARENA ➔</span>
                </h3>
                <p class="text-xs font-bold text-slate-400">
                    (Sorteio dia ${dataSorteioFormatada})
                </p>
            </div>
        `;
    }).join('');
}

window.handleRoundCardClick = (internalDay, isConcluido, hasSorteio, roundLabel) => {
    if (!hasSorteio) {
        showToast("Sorteio não realizado para este Round.", "error");
        return;
    }

    if (isConcluido) {
        // Round concluído: exige senha do juiz para acessar histórico
        pendingFinishedRoundDay = internalDay;
        const modal = document.getElementById('modal-confirm-finished-round');
        document.getElementById('finished-round-modal-title').innerText = `${roundLabel} JÁ FOI JULGADO`;
        document.getElementById('input-finished-round-pin').value = '';
        document.getElementById('finished-round-auth-error').classList.add('hidden');
        modal.classList.remove('hidden');
        setTimeout(() => document.getElementById('input-finished-round-pin')?.focus(), 100);
        return;
    }

    // Round Ativo: Toca animação cinematográfica em tela cheia e entra
    playRoundSplashIntro(roundLabel, () => {
        enterRound(internalDay, false);
    });
};

window.closeFinishedRoundModal = () => {
    document.getElementById('modal-confirm-finished-round').classList.add('hidden');
    pendingFinishedRoundDay = null;
};

window.confirmEnterFinishedRound = () => {
    if (!pendingFinishedRoundDay || !window.state.currentJudge) return;

    const inputPin = (document.getElementById('input-finished-round-pin')?.value || '').trim();
    const correctPin = String(window.state.currentJudge.senha || '').trim();

    if (!correctPin || inputPin === correctPin) {
        const targetDay = pendingFinishedRoundDay;
        closeFinishedRoundModal();
        
        playRoundSplashIntro(targetDay.replace(/DIA/gi, 'ROUND'), () => {
            enterRound(targetDay, true);
        });
    } else {
        document.getElementById('finished-round-auth-error').innerText = "Senha incorreta. Tente novamente.";
        document.getElementById('finished-round-auth-error').classList.remove('hidden');
        document.getElementById('input-finished-round-pin')?.select();
    }
};

function playRoundSplashIntro(roundTitle, callback) {
    const splash = document.getElementById('splash-round-intro');
    const titleEl = document.getElementById('splash-round-title');
    
    if (titleEl) {
        titleEl.innerText = `BEM-VINDO AO ${roundTitle.toUpperCase()}`;
    }

    if (!splash) {
        if (callback) callback();
        return;
    }

    // Fade In
    splash.classList.remove('opacity-0', 'pointer-events-none');
    splash.classList.add('opacity-100', 'pointer-events-auto');

    setTimeout(() => {
        // Fade Out
        splash.classList.remove('opacity-100', 'pointer-events-auto');
        splash.classList.add('opacity-0', 'pointer-events-none');

        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }, 1200);
}

function enterRound(internalDay, isReadOnly = false) {
    window.state.selectedDay = internalDay;
    window.state.isRoundReadOnly = isReadOnly;
    saveSession();

    renderJudgeDashboard();
    showView('view-rides-list');
}

// ==========================================
// PAINEL DE MONTARIAS DO JUIZ (TELA 4)
// ==========================================
function getDefaultDay() {
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    if (sorteios.length > 0) {
        return sorteios[0].day || 'DIA 1';
    }
    return 'DIA 1';
}

function renderJudgeDashboard() {
    if (!window.state.eventData) return;

    const judgeName = getCurrentJudgeName();
    const eventName = getCurrentEventName();
    const maxPts = getJudgeScoreLimit();

    // Banner Somente Leitura
    const bannerReadOnly = document.getElementById('banner-round-readonly');
    if (bannerReadOnly) {
        if (window.state.isRoundReadOnly) bannerReadOnly.classList.remove('hidden');
        else bannerReadOnly.classList.add('hidden');
    }

    // Atualiza cabeçalho do Juiz e card da arena
    const headerJudgeName = document.getElementById('header-judge-name');
    if (headerJudgeName) headerJudgeName.innerText = judgeName;

    const headerScale = document.getElementById('header-judge-scale');
    if (headerScale) headerScale.innerText = `0 - ${maxPts} pts`;

    const flowScale = document.getElementById('flow-judge-scale-tag');
    if (flowScale) flowScale.innerText = `0-${maxPts}`;

    const profileChip = document.getElementById('judge-profile-chip');
    if (profileChip) profileChip.classList.remove('hidden');

    const ridesJudgeName = document.getElementById('rides-view-judge-name');
    if (ridesJudgeName) ridesJudgeName.innerText = judgeName;

    const ridesTitle = document.getElementById('rides-view-event-title');
    if (ridesTitle) ridesTitle.innerText = eventName;

    const headerEvent = document.getElementById('header-event-name');
    if (headerEvent) {
        headerEvent.innerText = eventName;
        headerEvent.classList.remove('hidden');
    }

    // Atualiza badge do round atual em julgamento
    const roundBadge = document.getElementById('rides-current-round-badge');
    if (roundBadge && window.state.selectedDay) {
        let displayRound = String(window.state.selectedDay).toUpperCase();
        displayRound = displayRound.replace(/DIA\s*/i, 'ROUND ');
        roundBadge.innerText = displayRound;
    }

    // Renderiza Abas de Dias se existirem
    renderDaysTabs();

    // Renderiza Montarias do Dia Selecionado
    renderRidesList();
}

function renderDaysTabs() {
    const container = document.getElementById('days-tabs-container');
    if (!container) return;

    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];

    let days = sorteios.map(s => s.day).filter(Boolean);
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

// ==========================================
// UTILITÁRIO: LOCALIZAR NOTA POR MONTARIA (PEÃO + TOURO + RERIDE)
// ==========================================
function isDayMatching(notaDia, targetDay) {
    if (!notaDia && !targetDay) return true;
    const nStr = String(notaDia || '').trim().toLowerCase();
    const tStr = String(targetDay || '').trim().toLowerCase();
    if (nStr === tStr) return true;
    const nNum = nStr.replace(/\D+/g, '');
    const tNum = tStr.replace(/\D+/g, '');
    if (nNum && tNum && nNum === tNum) return true;
    return false;
}

function findNotaForMatchup(notas, riderName, bullName, day, isRerideRide = false) {
    if (!notas || !Array.isArray(notas)) return null;
    const rLower = (riderName || '').trim().toLowerCase();
    const bLower = (bullName || '').trim().toLowerCase();

    // 1. Tenta correspondência exata: peão + dia + touro + isReride
    let found = notas.find(n => {
        const matchPeao = ((n.peao || n.peaoNome || '').trim().toLowerCase() === rLower);
        const matchDay = isDayMatching(n.dia || n.day, day);
        const notReplaced = n.status !== 'substituida';
        const matchBull = bLower ? ((n.touro || '').trim().toLowerCase() === bLower) : true;
        const matchReride = (isRerideRide !== undefined && n.isReride !== undefined) 
            ? Boolean(n.isReride) === Boolean(isRerideRide) 
            : true;
        return matchPeao && matchDay && notReplaced && matchBull && matchReride;
    });

    if (found) return found;

    // 2. Se não achou com isReride estrito, tenta pelo touro exato
    if (bLower) {
        found = notas.find(n => {
            const matchPeao = ((n.peao || n.peaoNome || '').trim().toLowerCase() === rLower);
            const matchDay = isDayMatching(n.dia || n.day, day);
            const notReplaced = n.status !== 'substituida';
            const matchBull = ((n.touro || '').trim().toLowerCase() === bLower);
            return matchPeao && matchDay && notReplaced && matchBull;
        });
        if (found) return found;
    }

    // 3. Fallback genérico: APENAS se esta montaria NÃO FOR RE-RIDE e a nota também NÃO FOR de re-ride
    if (!isRerideRide) {
        return notas.find(n => {
            const matchPeao = ((n.peao || n.peaoNome || '').trim().toLowerCase() === rLower);
            const matchDay = isDayMatching(n.dia || n.day, day);
            const notReplaced = n.status !== 'substituida';
            const notReride = !n.isReride;
            return matchPeao && matchDay && notReplaced && notReride;
        });
    }

    return null;
}

function isJudgeScoreGraded(nota, jIdx, judgeName = null) {
    if (!nota) return false;

    // 1. Status específico do juiz em juizes_status
    if (nota.juizes_status) {
        const js = nota.juizes_status[jIdx] !== undefined ? nota.juizes_status[jIdx] : nota.juizes_status[String(jIdx)];
        if (js && (js.enviado || js.touro !== undefined || js.peao !== undefined || js.isFall)) {
            return true;
        }
        // Se gravou por nome do juiz
        if (judgeName) {
            const jNameUpper = String(judgeName).trim().toUpperCase();
            const byName = Object.values(nota.juizes_status).find(s => 
                s && s.nome && String(s.nome).trim().toUpperCase() === jNameUpper && (s.enviado || s.touro !== undefined || s.isFall)
            );
            if (byName) return true;
        }
    }

    // 2. Campo judgeIdx gravado individualmente
    if (nota.judgeIdx !== undefined && nota.judgeIdx !== null && parseInt(nota.judgeIdx) === parseInt(jIdx)) {
        return true;
    }

    // 3. Checagem direta por j1, j2, j3
    const hasField = (val) => val !== undefined && val !== null && val !== '' && !isNaN(Number(val));
    if (jIdx === 0) {
        if (hasField(nota.j1_touro) || hasField(nota.j1_peao)) {
            if (Number(nota.j1_touro) > 0 || Number(nota.j1_peao) > 0 || nota.tempo === 0 || nota.isFall) return true;
        }
        if (nota.juizes_status && (nota.juizes_status[0]?.enviado || nota.juizes_status["0"]?.enviado)) return true;
    } else if (jIdx === 1) {
        if (hasField(nota.j2_touro) || hasField(nota.j2_peao)) {
            if (Number(nota.j2_touro) > 0 || Number(nota.j2_peao) > 0 || nota.tempo === 0 || nota.isFall) return true;
        }
        if (nota.juizes_status && (nota.juizes_status[1]?.enviado || nota.juizes_status["1"]?.enviado)) return true;
    } else if (jIdx === 2) {
        if (hasField(nota.j3_touro) || hasField(nota.j3_peao)) {
            if (Number(nota.j3_touro) > 0 || Number(nota.j3_peao) > 0 || nota.tempo === 0 || nota.isFall) return true;
        }
        if (nota.juizes_status && (nota.juizes_status[2]?.enviado || nota.juizes_status["2"]?.enviado)) return true;
    }

    // 4. Se a nota geral já foi salva e consolidada para este round e competidor
    if (nota.totalGeral !== undefined && Number(nota.totalGeral) > 0) {
        if (!nota.juizes_status || Object.keys(nota.juizes_status).length === 0) return true;
    }

    return false;
}

function renderRidesList() {
    const container = document.getElementById('rides-cards-container');
    const noRidesEl = document.getElementById('no-rides-message');

    // Garante que o nome do Juiz e do Evento estejam preenchidos no card superior e cabeçalho
    const judgeName = getCurrentJudgeName();
    const eventName = getCurrentEventName();

    const rjEl = document.getElementById('rides-view-judge-name');
    if (rjEl) rjEl.innerText = judgeName;

    const hjEl = document.getElementById('header-judge-name');
    if (hjEl) hjEl.innerText = judgeName;

    const chip = document.getElementById('judge-profile-chip');
    if (chip) chip.classList.remove('hidden');

    const rtEl = document.getElementById('rides-view-event-title');
    if (rtEl) rtEl.innerText = eventName;

    const heEl = document.getElementById('header-event-name');
    if (heEl) {
        heEl.innerText = eventName;
        heEl.classList.remove('hidden');
    }

    const roundBadge = document.getElementById('rides-current-round-badge');
    if (roundBadge && window.state.selectedDay) {
        let displayRound = String(window.state.selectedDay).toUpperCase();
        displayRound = displayRound.replace(/DIA\s*/i, 'ROUND ');
        roundBadge.innerText = displayRound;
    }

    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay) || sorteios[0];

    if (!currentSorteio || !currentSorteio.riders || currentSorteio.riders.length === 0) {
        if (container) container.innerHTML = '';
        if (noRidesEl) noRidesEl.classList.remove('hidden');
        updateCounters(0, 0, 0);
        return;
    }

    if (noRidesEl) noRidesEl.classList.add('hidden');

    const riders = currentSorteio.riders || [];
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

        const riderNome = (typeof r === 'string' ? r : (r && r.nome ? r.nome : `COMPETIDOR #${idx + 1}`)).trim();
        const riderCidade = typeof r === 'object' && r ? (r.cidade || '') : '';
        const bullNome = (typeof bull === 'string' ? bull : (bull && bull.nome ? bull.nome : 'TOURO')).trim();
        const bullCia = (typeof bull === 'object' && bull ? bull.cia : '---') || '---';
        const bullLado = (typeof bull === 'object' && bull && bull.lado) ? String(bull.lado).toUpperCase() : 'C';
        const isRerideRide = Boolean(r.isReride);

        // Verifica se esta montaria original foi substituída por um Re-Ride
        const isReplacedRide = !isRerideRide && notas.some(n => 
            ((n.peao || n.peaoNome || '').trim().toLowerCase() === riderNome.toLowerCase()) && 
            String(n.dia || n.day) === String(window.state.selectedDay) && 
            (n.status === 'substituida' || n.status === 're_ride') &&
            (bullNome ? (n.touro && n.touro.trim().toLowerCase() === bullNome.toLowerCase()) : true)
        );

        // Procura a nota deste Juiz para este competidor especificamente neste touro
        const existingNota = isReplacedRide ? null : findNotaForMatchup(notas, riderNome, bullNome, window.state.selectedDay, isRerideRide);

        let myJudgeGraded = false;
        let myScoreObj = { bScore: 0, rScore: 0, isFall: false };

        if (existingNota) {
            myJudgeGraded = isJudgeScoreGraded(existingNota, jIdx, window.state.currentJudge?.nome);
            const js = existingNota.juizes_status ? (existingNota.juizes_status[jIdx] || existingNota.juizes_status[String(jIdx)]) : null;
            if (js && (js.enviado || js.touro !== undefined || js.peao !== undefined || js.isFall)) {
                myScoreObj = {
                    bScore: Number(js.touro) || 0,
                    rScore: Number(js.peao) || 0,
                    isFall: Boolean(js.isFall)
                };
            } else if (existingNota.judgeIdx === jIdx) {
                myScoreObj = {
                    bScore: Number(existingNota.bullScore) || 0,
                    rScore: Number(existingNota.riderScore) || 0,
                    isFall: Boolean(existingNota.isFall) || (Number(existingNota.riderScore) === 0)
                };
            } else if (jIdx === 0) {
                myScoreObj = { bScore: Number(existingNota.j1_touro) || 0, rScore: Number(existingNota.j1_peao) || 0, isFall: (Number(existingNota.j1_peao) === 0 && (existingNota.tempo === 0 || existingNota.isFall)) };
            } else if (jIdx === 1) {
                myScoreObj = { bScore: Number(existingNota.j2_touro) || 0, rScore: Number(existingNota.j2_peao) || 0, isFall: (Number(existingNota.j2_peao) === 0 && (existingNota.tempo === 0 || existingNota.isFall)) };
            } else if (jIdx === 2) {
                myScoreObj = { bScore: Number(existingNota.j3_touro) || 0, rScore: Number(existingNota.j3_peao) || 0, isFall: (Number(existingNota.j3_peao) === 0 && (existingNota.tempo === 0 || existingNota.isFall)) };
            }
        }

        const isGraded = myJudgeGraded || isReplacedRide;
        if (isGraded) gradedCount++;
        else pendingCount++;

        // Filtro
        if (window.state.activeFilter === 'pending' && isGraded) return '';
        if (window.state.activeFilter === 'graded' && !isGraded) return '';

        const isArenaActive = Boolean(activeArenaRiderName && activeArenaRiderName.trim().toUpperCase() === riderNome.toUpperCase());

        // Efeito de Foco na Arena e montarias avaliadas apagadinhas
        let cardContainerClasses = "glass-card p-4 sm:p-5 rounded-3xl transition-all cursor-pointer group touch-active relative overflow-hidden";
        
        if (isArenaActive) {
            cardContainerClasses += " arena-active-card border-yellow-400";
        } else if (activeArenaRiderName) {
            cardContainerClasses += " opacity-35 scale-[0.98] hover:opacity-100 hover:scale-100 border-white/5";
        } else if (isReplacedRide) {
            cardContainerClasses += " opacity-35 grayscale bg-slate-950/80 border border-red-500/30 cursor-not-allowed";
        } else {
            cardContainerClasses += isRerideRide 
                ? (isGraded ? ' border-yellow-500/40 bg-yellow-950/20 opacity-50 hover:opacity-90' : ' border-2 border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/10')
                : (isGraded ? ' border-emerald-500/30 bg-emerald-950/20 opacity-50 hover:opacity-90' : ' border-white/5 hover:border-yellow-500/40 bg-slate-900/60');
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
        } else if (isReplacedRide) {
            statusBadge = `
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-red-500/20 text-red-400">
                    <span class="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">🔄 SUBSTITUÍDA (RE-RIDE)</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase">ANULADA</span>
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
                            ${riderNome} ${rerideTag}
                        </div>
                        <div class="text-[10px] font-medium text-slate-400 uppercase truncate">${riderCidade}</div>
                    </div>
                </div>

                <div class="bg-black/50 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div>
                        <div class="text-[8px] font-black uppercase tracking-widest text-yellow-500/80">ANIMAL / TOURO</div>
                        <div class="text-sm font-black text-yellow-500 uppercase truncate">${bullNome}</div>
                        <div class="text-[10px] font-medium text-slate-400 truncate">${bullCia}</div>
                    </div>
                    <span class="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                        ${bullLado}
                    </span>
                </div>

                ${statusBadge}
            </div>
        `;
    }).join('');

    if (container) container.innerHTML = cardsHTML;
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
    if (window.state.isRoundReadOnly) {
        showToast("Este round já foi 100% julgado e está em modo Somente Leitura.", "info");
        return;
    }

    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay) || sorteios[0];
    if (!currentSorteio || !currentSorteio.riders) return;

    const r = currentSorteio.riders[matchupIdx];
    if (!r) return;
    const rNome = (typeof r === 'string' ? r : (r.nome || '')).trim();
    const bullIdx = currentSorteio.assignments[matchupIdx] !== undefined ? currentSorteio.assignments[matchupIdx] : matchupIdx;
    const bull = currentSorteio.bulls[bullIdx] || { nome: '' };
    const bullNome = (typeof bull === 'string' ? bull : (bull && bull.nome ? bull.nome : '')).trim();
    const isRerideRide = Boolean(r.isReride);
    const notas = (window.state.eventData && window.state.eventData.notas) || [];
    const jIdx = window.state.currentJudge ? window.state.currentJudge.idx : 0;

    // Se esta montaria foi substituída por Re-Ride, bloqueia o acesso
    const isReplacedRide = !isRerideRide && notas.some(n => 
        ((n.peao || n.peaoNome || '').trim().toLowerCase() === rNome.toLowerCase()) && 
        String(n.dia || n.day) === String(window.state.selectedDay) && 
        (n.status === 'substituida' || n.status === 're_ride') &&
        (bullNome ? (n.touro && n.touro.trim().toLowerCase() === bullNome.toLowerCase()) : true)
    );

    if (isReplacedRide) {
        showToast("Esta montaria foi substituída por Re-Ride. Avalie o novo touro de Re-ride.", "info");
        return;
    }

    // Verifica se este Juiz já avaliou este competidor neste touro específico
    const existingNota = findNotaForMatchup(notas, rNome, bullNome, window.state.selectedDay, isRerideRide);

    const isAlreadyGradedByMe = isJudgeScoreGraded(existingNota, jIdx, window.state.currentJudge?.nome);

    // Se já foi avaliada: SEMPRE exige senha e mostra o aviso de segurança para desbloquear
    if (isAlreadyGradedByMe) {
        window.state.pendingEditMatchupIdx = matchupIdx;
        const pinInput = document.getElementById('input-edit-security-pin');
        if (pinInput) pinInput.value = '';
        const errEl = document.getElementById('edit-security-error');
        if (errEl) errEl.classList.add('hidden');
        document.getElementById('modal-security-change-score')?.classList.remove('hidden');
        setTimeout(() => pinInput?.focus(), 100);
        return;
    }

    // Montaria PENDENTE: abre direto para julgar
    openScoreModalDirect(matchupIdx);
};

window.confirmUnlockEditScore = () => {
    const pin = (document.getElementById('input-edit-security-pin')?.value || '').trim();
    const judgePin = String(window.state.currentJudge?.senha || '').trim();
    const eventPin = String(window.state.sharePassword || window.state.eventData?.password || '').trim();

    let isValid = false;
    if (judgePin && pin.toLowerCase() === judgePin.toLowerCase()) {
        isValid = true;
    } else if (eventPin && pin.toLowerCase() === eventPin.toLowerCase()) {
        isValid = true;
    } else if (!judgePin && !eventPin && pin.length > 0) {
        isValid = true;
    }

    if (isValid) {
        const targetIdx = window.state.pendingEditMatchupIdx; // Captura antes de fechar o modal
        document.getElementById('modal-security-change-score').classList.add('hidden');
        window.state.pendingEditMatchupIdx = null;

        if (targetIdx !== null && targetIdx !== undefined) {
            openScoreModalDirect(targetIdx);
            showToast("Acesso liberado para alteração de nota.", "success");
        }
    } else {
        const errEl = document.getElementById('edit-security-error');
        if (errEl) {
            errEl.innerText = "Senha incorreta. Digite sua senha de Juiz ou a senha do Evento.";
            errEl.classList.remove('hidden');
        }
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
    if (matchupIdx === null || matchupIdx === undefined) return;
    const sorteios = (window.state.eventData && window.state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === window.state.selectedDay) || sorteios[0];
    if (!currentSorteio || !currentSorteio.riders) return;

    const r = currentSorteio.riders[matchupIdx];
    if (!r) return;

    const bullIdx = currentSorteio.assignments[matchupIdx] !== undefined ? currentSorteio.assignments[matchupIdx] : matchupIdx;
    const bull = currentSorteio.bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };

    window.state.currentMatchupIdx = matchupIdx;
    window.state.currentRider = r;
    window.state.currentBull = bull;

    // Transmite pelo Ably que esta montaria está sendo avaliada na arena agora
    broadcastActiveArenaMatchup(r.nome, bull.nome, bull.cia, bull.lado, Boolean(r.isReride));

    // Preenche cabeçalhos fixos da montaria
    document.getElementById('flow-matchup-number').innerText = `#${matchupIdx + 1}`;
    const rerideTag = r.isReride ? ' (RE-RIDE)' : '';
    document.getElementById('flow-matchup-title').innerText = `${r.nome}${rerideTag} VS ${bull.nome}`;
    document.getElementById('flow-rider-city').innerText = r.cidade || 'CIDADE - UF';
    document.getElementById('flow-bull-cia').innerText = bull.cia || 'CIA DE RODEIO';

    // 1. Procura se este Juiz já possui nota gravada para esta montaria específica
    const notas = (window.state.eventData && window.state.eventData.notas) || [];
    const jIdx = window.state.currentJudge ? window.state.currentJudge.idx : 0;
    const existingNota = findNotaForMatchup(notas, r.nome, bull.nome, window.state.selectedDay, Boolean(r.isReride));

    const defaults = getDefaultScoresForJudge();

    if (existingNota) {
        let savedBullScore = 0;
        let savedRiderScore = 0;
        let isFall = false;

        const js = existingNota.juizes_status ? (existingNota.juizes_status[jIdx] || existingNota.juizes_status[String(jIdx)]) : null;
        if (js && (js.enviado || js.touro !== undefined || js.peao !== undefined || js.isFall)) {
            savedBullScore = Number(js.touro) || 0;
            savedRiderScore = Number(js.peao) || 0;
            isFall = Boolean(js.isFall);
        } else if (existingNota.judgeIdx === jIdx) {
            savedBullScore = Number(existingNota.bullScore) || 0;
            savedRiderScore = Number(existingNota.riderScore) || 0;
            isFall = Boolean(existingNota.isFall) || (Number(existingNota.riderScore) === 0);
        } else if (jIdx === 0) {
            savedBullScore = Number(existingNota.j1_touro) || 0;
            savedRiderScore = Number(existingNota.j1_peao) || 0;
            isFall = (Number(existingNota.j1_peao) === 0 && (existingNota.tempo === 0 || existingNota.isFall));
        } else if (jIdx === 1) {
            savedBullScore = Number(existingNota.j2_touro) || 0;
            savedRiderScore = Number(existingNota.j2_peao) || 0;
            isFall = (Number(existingNota.j2_peao) === 0 && (existingNota.tempo === 0 || existingNota.isFall));
        } else if (jIdx === 2) {
            savedBullScore = Number(existingNota.j3_touro) || 0;
            savedRiderScore = Number(existingNota.j3_peao) || 0;
            isFall = (Number(existingNota.j3_peao) === 0 && (existingNota.tempo === 0 || existingNota.isFall));
        }

        if (savedBullScore > 0 || savedRiderScore > 0 || isFall) {
            const bInt = Math.floor(savedBullScore);
            const bDecRaw = (savedBullScore - bInt).toFixed(2);
            const rInt = Math.floor(savedRiderScore);
            const rDecRaw = (savedRiderScore - rInt).toFixed(2);

            window.judgingState.touroInt = bInt || defaults.touroInt;
            window.judgingState.touroDec = formatDecString(bDecRaw);
            window.judgingState.competidorInt = isFall ? 0 : (rInt || defaults.compInt);
            window.judgingState.competidorDec = isFall ? ',00' : formatDecString(rDecRaw);
            window.judgingState.isFall = isFall;
            window.judgingState.isReride = Boolean(existingNota.isReride);
        } else {
            window.judgingState.touroInt = defaults.touroInt;
            window.judgingState.touroDec = defaults.touroDec;
            window.judgingState.competidorInt = defaults.compInt;
            window.judgingState.competidorDec = defaults.compDec;
            window.judgingState.isFall = false;
            window.judgingState.isReride = Boolean(r.isReride);
        }
    } else {
        window.judgingState.touroInt = defaults.touroInt;
        window.judgingState.touroDec = defaults.touroDec;
        window.judgingState.competidorInt = defaults.compInt;
        window.judgingState.competidorDec = defaults.compDec;
        window.judgingState.isFall = false;
        window.judgingState.isReride = Boolean(r.isReride);
    }

    updateDisplays();
    goToStepTouro();
    document.getElementById('view-judging-flow').classList.remove('hidden');
}

function formatDecString(decStr) {
    if (decStr.includes('.75') || decStr.includes(',75')) return ',75';
    if (decStr.includes('.5') || decStr.includes(',5')) return ',50';
    if (decStr.includes('.25') || decStr.includes(',25')) return ',25';
    return ',00';
}

function broadcastActiveArenaMatchup(riderName, bullName = null, bullCia = null, lado = null, isReride = false) {
    window.state.activeArenaRider = riderName;
    renderRidesList();

    if (ablyChannel && window.state.currentJudge) {
        ablyChannel.publish('judge-active-matchup', {
            riderName: riderName,
            bullName: bullName,
            bullCia: bullCia,
            lado: lado,
            isReride: Boolean(isReride),
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

function closeJudgingFlow() {
    const flowEl = document.getElementById('view-judging-flow');
    if (flowEl) flowEl.classList.add('hidden');
    window.state.currentMatchupIdx = null;
    window.state.currentRider = null;
    window.state.currentBull = null;
    broadcastClearActiveArenaMatchup();
    renderRidesList();
}
window.closeJudgingFlow = closeJudgingFlow;

window.handleJudgingBackBtn = () => {
    if (window.judgingState.step === 'conferencia') {
        goToStepCompetidor();
    } else if (window.judgingState.step === 'competidor') {
        goToStepTouro();
    } else {
        closeJudgingFlow();
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

        // Salva dados da montaria antes de fechar a tela para permitir Re-Ride
        window.state.lastCompletedMatchup = {
            matchupIdx: window.state.currentMatchupIdx,
            rider: window.state.currentRider,
            bull: window.state.currentBull,
            day: window.state.selectedDay,
            isReride: isReride,
            riderName: scorePayload.riderName,
            bullName: scorePayload.bullName,
            bullCia: scorePayload.bullCia,
            riderCity: scorePayload.riderCity
        };

        // 4. Minimiza/fecha a tela de julgamento imediatamente após lançar a nota!
        closeJudgingFlow();

        // 5. Verifica se todos os juízes já enviaram para esta montaria
        const totalJudgesExpected = parseInt(window.state.eventData.judges || 2) || 2;
        const currentMatchupScores = getMatchupScoresMap(scorePayload.riderName, scorePayload.day, scorePayload.bullName, scorePayload.isReride);

        const submittedJudgesCount = Object.keys(currentMatchupScores).length;

        if (submittedJudgesCount < totalJudgesExpected && totalJudgesExpected > 1) {
            // Entra na tela de "Aguardando avaliação do outro juiz" com polling de verificação
            window.state.waitingMatchup = {
                riderName: scorePayload.riderName,
                bullName: scorePayload.bullName,
                isReride: scorePayload.isReride,
                day: scorePayload.day,
                matchupIdx: scorePayload.matchupIdx
            };
            showWaitingOtherJudgeModal(currentMatchupScores, totalJudgesExpected);
            startWaitingPollInterval();
            showToast("Nota enviada com sucesso! Aguardando o outro juiz...", "success");
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

function getMatchupScoresMap(riderName, day, bullName = null, isReride = false) {
    const notas = window.state.eventData?.notas || [];
    const nota = findNotaForMatchup(notas, riderName, bullName, day, isReride);
    if (!nota) return {};
    return nota.juizes_status || {};
}

function showWaitingOtherJudgeModal(scoresMap, totalExpected) {
    const container = document.getElementById('waiting-judges-status-list');
    const juizes = getJudgesListNormalized();
    const currentJudgeIdx = window.state.currentJudge ? window.state.currentJudge.idx : -1;

    container.innerHTML = juizes.map((j, idx) => {
        const isMyJudgeSubmitted = (idx === currentJudgeIdx && window.state.waitingMatchup);
        const isDone = Boolean((scoresMap[idx] && scoresMap[idx].enviado) || isMyJudgeSubmitted);
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
                const rawLocal = normalizeEventData(cloudEvent);
                
                // Mescla com juizes_status locais para não perder notas em trânsito
                if (rawLocal && rawLocal.notas && window.state.eventData && window.state.eventData.notas) {
                    rawLocal.notas.forEach(cloudNota => {
                        const localNota = window.state.eventData.notas.find(n => 
                            isDayMatching(n.dia, cloudNota.dia) && 
                            (n.peao === cloudNota.peao || n.peaoNome === cloudNota.peaoNome) &&
                            (n.touro && cloudNota.touro ? n.touro.toUpperCase() === cloudNota.touro.toUpperCase() : true)
                        );
                        if (localNota && localNota.juizes_status) {
                            cloudNota.juizes_status = { ...(cloudNota.juizes_status || {}), ...localNota.juizes_status };
                        }
                    });
                }

                window.state.eventData = rawLocal;

                const totalJudgesExpected = parseInt(window.state.eventData.judges || 2) || 2;
                const scoresMap = getMatchupScoresMap(
                    window.state.waitingMatchup.riderName,
                    window.state.waitingMatchup.day,
                    window.state.waitingMatchup.bullName,
                    window.state.waitingMatchup.isReride
                );

                if (Object.keys(scoresMap).length >= totalJudgesExpected) {
                    stopWaitingPollInterval();
                    handleAllJudgesCompleted(scoresMap, {
                        riderName: window.state.waitingMatchup.riderName,
                        bullName: window.state.waitingMatchup.bullName,
                        isReride: window.state.waitingMatchup.isReride,
                        day: window.state.waitingMatchup.day
                    });
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
    document.getElementById('modal-waiting-other-judge')?.classList.add('hidden');
    window.state.waitingMatchup = null;
    closeJudgingFlow();
};

function handleAllJudgesCompleted(scoresMap, scorePayload) {
    stopWaitingPollInterval();
    document.getElementById('modal-waiting-other-judge')?.classList.add('hidden');

    // Calcula Soma Total de Todos os Juízes
    let sumTotal = 0;
    let anyQueda = false;

    Object.values(scoresMap).forEach(s => {
        if (s.isFall || s.peao === 0) anyQueda = true;
        sumTotal += (s.touro || 0) + (s.peao || 0);
    });

    console.log(`[RODEOAPP JUIZ] Montaria finalizada por todos os juízes. Soma Total: ${sumTotal}, Queda: ${anyQueda}`);

    // Regra: Se a nota for < 80.00 e NÃO for queda (0,00) -> Abre Popup de Re-Ride
    const isLowScore = (sumTotal > 0 && sumTotal < 80.00 && !anyQueda);
    const isRerideFlag = Boolean(scorePayload?.isReride);

    if (isLowScore || isRerideFlag) {
        const day = scorePayload?.day || window.state.lastCompletedMatchup?.day || window.state.waitingMatchup?.day || window.state.selectedDay;
        const sorteios = window.state.eventData?.sorteios || [];
        const currentSorteio = sorteios.find(s => s.day === day) || sorteios[0];
        
        let riderObj = window.state.currentRider || window.state.lastCompletedMatchup?.rider;
        let bullObj = window.state.currentBull || window.state.lastCompletedMatchup?.bull;
        let mIdx = (window.state.currentMatchupIdx !== null && window.state.currentMatchupIdx !== undefined)
            ? window.state.currentMatchupIdx 
            : (window.state.lastCompletedMatchup?.matchupIdx !== undefined ? window.state.lastCompletedMatchup.matchupIdx : window.state.waitingMatchup?.matchupIdx);

        const rName = scorePayload?.riderName || window.state.lastCompletedMatchup?.rider?.nome || window.state.waitingMatchup?.riderName;

        if ((!riderObj || mIdx === null || mIdx === undefined) && currentSorteio && currentSorteio.riders) {
            if (rName) {
                const foundIdx = currentSorteio.riders.findIndex(r => r && r.nome && r.nome.trim().toUpperCase() === rName.trim().toUpperCase());
                if (foundIdx !== -1) {
                    mIdx = foundIdx;
                    riderObj = currentSorteio.riders[foundIdx];
                }
            }
        }

        if (mIdx !== null && mIdx !== undefined && currentSorteio && currentSorteio.bulls) {
            const bullIdx = currentSorteio.assignments[mIdx] !== undefined ? currentSorteio.assignments[mIdx] : mIdx;
            if (currentSorteio.bulls[bullIdx]) {
                bullObj = currentSorteio.bulls[bullIdx];
            }
        }

        if (!riderObj && rName) {
            riderObj = { nome: rName, cidade: scorePayload?.riderCity || '' };
        }
        if (!bullObj && scorePayload?.bullName) {
            bullObj = { nome: scorePayload.bullName, cia: scorePayload.bullCia || '---' };
        }

        window.state.reridePendingMatchup = {
            rider: riderObj,
            bull: bullObj,
            matchupIdx: mIdx,
            day: day
        };
        window.state.currentRider = riderObj;
        window.state.currentBull = bullObj;
        window.state.currentMatchupIdx = mIdx;
        window.state.waitingMatchup = null;

        // Atualiza display da nota
        const sumDisplayEl = document.getElementById('low-score-sum-display');
        if (sumDisplayEl) sumDisplayEl.innerText = sumTotal.toFixed(2);

        // Busca o touro sugerido da reserva
        const availableBull = currentSorteio ? findNextAvailableRerideBull(currentSorteio) : null;
        window.state.suggestedRerideBull = availableBull;

        const rNameEl = document.getElementById('low-score-rider-display');
        if (rNameEl && riderObj) rNameEl.innerText = `COMPETIDOR: ${riderObj.nome}`;

        const bullSuggestBox = document.getElementById('low-score-bull-suggest-box');
        const bullSuggestName = document.getElementById('low-score-suggested-bull-name');
        const bullSuggestCia = document.getElementById('low-score-suggested-bull-cia');
        const bullSuggestLado = document.getElementById('low-score-suggested-bull-lado');

        if (availableBull) {
            if (bullSuggestBox) bullSuggestBox.classList.remove('hidden');
            if (bullSuggestName) bullSuggestName.innerText = availableBull.nome;
            if (bullSuggestCia) bullSuggestCia.innerText = `CIA ${availableBull.cia || '---'}`;
            if (bullSuggestLado) {
                const ladoStr = availableBull.lado === 'E' ? 'ESQUERDA (E)' : (availableBull.lado === 'D' ? 'DIREITA (D)' : 'CENTRO / AMBOS (C)');
                bullSuggestLado.innerText = `LADO: ${ladoStr}`;
            }
        } else {
            if (bullSuggestBox) bullSuggestBox.classList.add('hidden');
        }

        document.getElementById('modal-low-score-reride')?.classList.remove('hidden');
    } else {
        window.state.waitingMatchup = null;
        closeJudgingFlow();
        showToast("Notas consolidadas com sucesso!", "success");
    }
}

// ==========================================
// POP-UP DE RE-RIDE (< 80 PONTOS)
// ==========================================
window.handleKeepLowScore = () => {
    document.getElementById('modal-low-score-reride')?.classList.add('hidden');
    window.state.suggestedRerideBull = null;
    window.state.reridePendingMatchup = null;
    closeJudgingFlow();
    showToast("Nota confirmada mantida!", "success");
};

window.handleRequestNextBullReride = async () => {
    document.getElementById('modal-low-score-reride')?.classList.add('hidden');

    if (!window.state.currentRider && window.state.reridePendingMatchup?.rider) {
        window.state.currentRider = window.state.reridePendingMatchup.rider;
        window.state.currentBull = window.state.reridePendingMatchup.bull;
        window.state.currentMatchupIdx = window.state.reridePendingMatchup.matchupIdx;
    }

    if (!window.state.currentRider) {
        showToast("Competidor não encontrado para Re-Ride.", "error");
        renderRidesList();
        return;
    }

    const day = window.state.selectedDay;
    const sorteios = window.state.eventData?.sorteios || [];
    const currentSorteio = sorteios.find(s => s.day === day) || sorteios[0];

    if (!currentSorteio) {
        showToast("Sorteio do dia não encontrado!", "error");
        return;
    }

    // Busca o touro sugerido da reserva
    let bull = window.state.suggestedRerideBull || findNextAvailableRerideBull(currentSorteio);

    if (bull) {
        // Concede diretamente o Re-Ride e vai para a TELA DO TOURO!
        await confirmCreateRerideWithBull(bull);
    } else {
        // Sem touro sugerido automaticamente: abre a lista completa de touros de re-ride
        openRerideBullsListModal();
    }
};

// Clicou em "SIM" no modal de confirmação do touro sugerido
window.handleAcceptSuggestedRerideBull = async () => {
    document.getElementById('modal-confirm-reride-bull')?.classList.add('hidden');
    const bull = window.state.suggestedRerideBull;
    if (bull) {
        await confirmCreateRerideWithBull(bull);
    }
};

// Clicou em "NÃO" no modal de confirmação do touro sugerido -> Abre lista de touros de re-ride
window.handleRejectSuggestedBullAndOpenList = () => {
    document.getElementById('modal-confirm-reride-bull')?.classList.add('hidden');
    openRerideBullsListModal();
};

// Abre modal com todos os touros de re-ride / boiadas disponíveis
window.openRerideBullsListModal = () => {
    document.getElementById('modal-low-score-reride')?.classList.add('hidden');
    document.getElementById('modal-confirm-reride-bull')?.classList.add('hidden');

    if (!window.state.currentRider && window.state.reridePendingMatchup?.rider) {
        window.state.currentRider = window.state.reridePendingMatchup.rider;
        window.state.currentBull = window.state.reridePendingMatchup.bull;
        window.state.currentMatchupIdx = window.state.reridePendingMatchup.matchupIdx;
    }

    const day = window.state.selectedDay;
    const sorteios = window.state.eventData?.sorteios || [];
    const currentSorteio = sorteios.find(s => s.day === day) || sorteios[0];

    const rider = window.state.currentRider;
    const subEl = document.getElementById('reride-list-rider-sub');
    if (subEl && rider) {
        subEl.innerHTML = `Competidor: <span class="text-yellow-400 font-black">${rider.nome}</span>`;
    }

    const searchInput = document.getElementById('input-search-reride-bull');
    if (searchInput) searchInput.value = '';

    const allBulls = getAllAvailableRerideBulls(currentSorteio);
    window.state.allRerideBullsList = allBulls;

    renderRerideBullsList(allBulls);
    document.getElementById('modal-select-reride-bull-list')?.classList.remove('hidden');
};

window.closeRerideBullsListModal = () => {
    document.getElementById('modal-select-reride-bull-list')?.classList.add('hidden');
};

window.filterRerideBullsList = (query) => {
    const q = (query || '').trim().toLowerCase();
    const all = window.state.allRerideBullsList || [];
    if (!q) {
        renderRerideBullsList(all);
        return;
    }
    const filtered = all.filter(b => 
        (b.nome || '').toLowerCase().includes(q) || 
        (b.cia || '').toLowerCase().includes(q)
    );
    renderRerideBullsList(filtered);
};

function renderRerideBullsList(bulls) {
    const container = document.getElementById('reride-bulls-grid');
    if (!container) return;

    if (!bulls || bulls.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-500 font-bold text-xs uppercase tracking-wider">
                Nenhum touro de re-ride encontrado.
            </div>
        `;
        return;
    }

    container.innerHTML = bulls.map((b, idx) => {
        const isE = b.lado === 'E';
        const ladoClass = isE 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
        
        const badgeReserva = b.isReservaDoDia 
            ? `<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">⭐ RESERVA DO DIA</span>` 
            : '';

        const badgeUsed = b.isUsed 
            ? `<span class="px-2 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-800">Já correu hoje</span>` 
            : `<span class="px-2 py-0.5 rounded text-[9px] font-black text-emerald-400 bg-emerald-950/30 border border-emerald-800/40">Disponível</span>`;

        return `
            <div onclick="selectRerideBullFromList(${idx})" class="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-yellow-500/60 hover:bg-yellow-500/5 transition-all cursor-pointer group flex items-center justify-between gap-3 active:scale-[0.99] touch-active">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm sm:text-base font-black text-white uppercase group-hover:text-yellow-400 transition-colors truncate">${b.nome}</span>
                        ${badgeReserva}
                    </div>
                    <div class="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase">
                        <span class="truncate">CIA ${b.cia || '---'}</span>
                        <span>•</span>
                        ${badgeUsed}
                    </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${ladoClass}">
                        ${b.lado || 'C'}
                    </span>
                    <span class="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center text-xs font-black group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                        ➔
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

window.selectRerideBullFromList = async (bullIdx) => {
    const all = window.state.allRerideBullsList || [];
    const chosenBull = all[bullIdx];
    if (!chosenBull) return;

    document.getElementById('modal-select-reride-bull-list').classList.add('hidden');
    await confirmCreateRerideWithBull(chosenBull);
};

// Efetiva a criação da montaria de re-ride com o touro escolhido
async function confirmCreateRerideWithBull(selectedBull) {
    if (!window.state.currentRider && window.state.reridePendingMatchup?.rider) {
        window.state.currentRider = window.state.reridePendingMatchup.rider;
        window.state.currentBull = window.state.reridePendingMatchup.bull;
        window.state.currentMatchupIdx = window.state.reridePendingMatchup.matchupIdx;
    }

    if (!window.state.currentRider || !selectedBull) {
        showToast("Erro ao criar Re-Ride: competidor ou touro inválido.", "error");
        return;
    }

    const rider = window.state.currentRider;
    const currentBull = window.state.currentBull;
    const day = window.state.selectedDay;
    const sorteios = window.state.eventData?.sorteios || [];
    const currentSorteio = sorteios.find(s => s.day === day) || sorteios[0];

    if (!currentSorteio) return;

    // 1. Marca a nota anterior do touro original como substituída por Re-Ride
    if (window.state.eventData && window.state.eventData.notas) {
        const prevNota = findNotaForMatchup(
            window.state.eventData.notas,
            rider.nome,
            currentBull ? currentBull.nome : null,
            day,
            false
        );
        if (prevNota) {
            prevNota.status = 'substituida';
            prevNota.updatedAt = new Date().toISOString();
        }
    }

    // 2. Cria nova montaria de Re-Ride no sorteio
    currentSorteio.riders = currentSorteio.riders || [];
    currentSorteio.bulls = currentSorteio.bulls || [];
    currentSorteio.assignments = currentSorteio.assignments || {};

    const newRiderIndex = currentSorteio.riders.length;
    currentSorteio.riders.push({
        nome: rider.nome,
        cidade: rider.cidade || '',
        isReride: true
    });

    let bullIdx = currentSorteio.bulls.findIndex(b => b && b.nome && b.nome.trim().toUpperCase() === selectedBull.nome.trim().toUpperCase());
    if (bullIdx === -1) {
        currentSorteio.bulls.push({
            nome: selectedBull.nome,
            cia: selectedBull.cia || '---',
            lado: selectedBull.lado || 'C'
        });
        bullIdx = currentSorteio.bulls.length - 1;
    }

    currentSorteio.assignments[newRiderIndex] = bullIdx;

    // 3. Salva na nuvem e transmite via Ably
    await syncEventUpdateToCloudAndAbly();

    // Notifica outros juízes e transmissão que o re-ride foi criado
    if (ablyChannel) {
        ablyChannel.publish('judge-reride-created', {
            riderName: rider.nome,
            bullName: selectedBull.nome,
            bullCia: selectedBull.cia || '---',
            lado: selectedBull.lado || 'C',
            newRiderIndex: newRiderIndex,
            day: day,
            judgeName: window.state.currentJudge?.nome || 'Juiz'
        });
    }

    // Fecha todos os modais de re-ride e de espera
    document.getElementById('modal-confirm-reride-bull')?.classList.add('hidden');
    document.getElementById('modal-select-reride-bull-list')?.classList.add('hidden');
    document.getElementById('modal-low-score-reride')?.classList.add('hidden');
    document.getElementById('modal-reride-result-msg')?.classList.add('hidden');
    document.getElementById('modal-waiting-other-judge')?.classList.add('hidden');
    stopWaitingPollInterval();
    window.state.suggestedRerideBull = null;
    window.state.reridePendingMatchup = null;

    // 4. ABRE IMEDIATAMENTE A TELA DO TOURO PARA O NOVO RE-RIDE!
    openScoreModalDirect(newRiderIndex);
    goToStepTouro();

    showToast(`Re-Ride criado! Julgando ${selectedBull.nome}`, "success");
}

function getAllAvailableRerideBulls(currentSorteio) {
    const list = [];
    const usedBullNames = new Set(
        Object.values(currentSorteio.assignments || {})
            .map(idx => currentSorteio.bulls[idx]?.nome?.trim()?.toUpperCase())
            .filter(Boolean)
    );

    // 1. Touros reservas do sorteio do dia (não atribuídos)
    (currentSorteio.bulls || []).forEach((b, idx) => {
        if (!b || !b.nome) return;
        const bNameUpper = b.nome.trim().toUpperCase();
        const isAssigned = Object.values(currentSorteio.assignments || {}).includes(idx);
        if (!isAssigned) {
            list.push({
                nome: b.nome.trim(),
                cia: b.cia || '---',
                lado: b.lado || 'C',
                isReservaDoDia: true,
                isUsed: false
            });
        }
    });

    // 2. Touros cadastrados nas boiadas do evento
    const boiadas = window.state.eventData?.boiadas || [];
    boiadas.forEach(cia => {
        const ciaNome = cia.nome || 'CIA';
        const touros = cia.touros || [];
        touros.forEach(tNome => {
            const tUpper = (tNome || '').trim().toUpperCase();
            if (list.some(item => item.nome.toUpperCase() === tUpper)) return;

            const isUsed = usedBullNames.has(tUpper);
            const lado = (cia.lados && cia.lados[tNome]) ? cia.lados[tNome] : 'C';

            list.push({
                nome: tNome.trim(),
                cia: ciaNome,
                lado: lado,
                isReservaDoDia: false,
                isUsed: isUsed
            });
        });
    });

    // 3. Fallback: todos os touros de currentSorteio.bulls se a lista estiver vazia
    if (list.length === 0 && currentSorteio.bulls && currentSorteio.bulls.length > 0) {
        currentSorteio.bulls.forEach(b => {
            if (b && b.nome && !list.some(item => item.nome.toUpperCase() === b.nome.trim().toUpperCase())) {
                list.push({
                    nome: b.nome.trim(),
                    cia: b.cia || '---',
                    lado: b.lado || 'C',
                    isReservaDoDia: false,
                    isUsed: true
                });
            }
        });
    }

    return list;
}

function findNextAvailableRerideBull(currentSorteio) {
    // 1. Procura primeiro nos reservas do sorteio do dia
    const availableReservas = (currentSorteio.bulls || []).filter((b, idx) => {
        if (!b || !b.nome) return false;
        const isAssigned = Object.values(currentSorteio.assignments || {}).includes(idx);
        return !isAssigned;
    });

    if (availableReservas.length > 0) {
        return availableReservas[0];
    }

    // 2. Procura nas boiadas touro que ainda não foi montado hoje
    const usedBulls = Object.values(currentSorteio.assignments || {}).map(idx => currentSorteio.bulls[idx]?.nome?.trim()?.toUpperCase());
    const boiadas = window.state.eventData?.boiadas || [];

    for (const cia of boiadas) {
        for (const t of (cia.touros || [])) {
            if (!usedBulls.includes(t.trim().toUpperCase())) {
                const lado = (cia.lados && cia.lados[t]) ? cia.lados[t] : 'C';
                return { nome: t, cia: cia.nome, lado: lado };
            }
        }
    }

    // 3. Fallback: qualquer touro cadastrado
    for (const cia of boiadas) {
        if (cia.touros && cia.touros.length > 0) {
            const t = cia.touros[0];
            const lado = (cia.lados && cia.lados[t]) ? cia.lados[t] : 'C';
            return { nome: t, cia: cia.nome, lado: lado };
        }
    }

    return null;
}

window.closeRerideResultModal = () => {
    document.getElementById('modal-reride-result-msg')?.classList.add('hidden');
    document.getElementById('modal-select-reride-bull-list')?.classList.add('hidden');
    document.getElementById('modal-confirm-reride-bull')?.classList.add('hidden');
    document.getElementById('modal-low-score-reride')?.classList.add('hidden');
    window.state.suggestedRerideBull = null;
    window.state.reridePendingMatchup = null;
};

// ==========================================
// PERSISTÊNCIA & ABLY PUBSUB
// ==========================================
function updateLocalScoreState(scorePayload) {
    window.state.eventData.notas = window.state.eventData.notas || [];
    
    let consolidatedNota = findNotaForMatchup(
        window.state.eventData.notas,
        scorePayload.riderName,
        scorePayload.bullName,
        scorePayload.day,
        Boolean(scorePayload.isReride)
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
        const getSignal = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(4000) : undefined;
        const urlGet = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(window.state.eventId)}&select=*`;
        const getRes = await fetch(urlGet, { headers: SUPABASE_HEADERS, signal: getSignal });
        if (!getRes.ok) return;

        const rows = await getRes.json();
        if (!rows || rows.length === 0) return;

        const currentEventRow = rows[0];
        const detalhes = currentEventRow.detalhes || {};
        const localData = detalhes.localData || detalhes;
        localData.notas = localData.notas || [];

        let consolidatedNota = findNotaForMatchup(
            localData.notas,
            scorePayload.riderName,
            scorePayload.bullName,
            scorePayload.day,
            Boolean(scorePayload.isReride)
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

        const patchSignal = (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(4000) : undefined;
        const urlPatch = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(window.state.eventId)}`;
        await fetch(urlPatch, {
            method: 'PATCH',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify({ detalhes, updated_at: new Date().toISOString() }),
            signal: patchSignal
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

        const cleanShareId = String(shareId).trim().toLowerCase();
        const channelName = `rodeoapp-event-${cleanShareId}`;
        ablyChannel = ablyClient.channels.get(channelName);
        console.log(`[RODEOAPP JUIZ] Conectado ao canal Ably: ${channelName}`);
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
                    const scoresMap = getMatchupScoresMap(message.data.riderName, message.data.day, message.data.bullName, message.data.isReride);
                    
                    if (Object.keys(scoresMap).length >= totalJudgesExpected) {
                        handleAllJudgesCompleted(scoresMap, message.data);
                    } else {
                        showWaitingOtherJudgeModal(scoresMap, totalJudgesExpected);
                    }
                }
            }
        });

        // Escuta criação de Re-Ride feita pelo outro juiz ou pelo Admin
        ablyChannel.subscribe('judge-reride-created', (message) => {
            console.log("[ABLY REALTIME] Re-ride criado recebido:", message.data);
            if (message.data && message.data.day === window.state.selectedDay) {
                document.getElementById('modal-low-score-reride')?.classList.add('hidden');
                document.getElementById('modal-confirm-reride-bull')?.classList.add('hidden');
                document.getElementById('modal-select-reride-bull-list')?.classList.add('hidden');
                document.getElementById('modal-waiting-other-judge')?.classList.add('hidden');
                stopWaitingPollInterval();

                if (message.data.newRiderIndex !== undefined && message.data.newRiderIndex !== null) {
                    openScoreModalDirect(message.data.newRiderIndex);
                    goToStepTouro();
                    showToast(`Re-Ride criado: Julgando ${message.data.bullName || 'Touro'}`, "info");
                }
            }
        });

        // Escuta atualizações do Admin
        ablyChannel.subscribe('admin-event-updated', (message) => {
            if (message.data && message.data.localData) {
                const normalized = {
                    ...message.data.localData,
                    name: message.data.localData.name || message.data.localData.nome || window.state.eventData?.name || '49 EXPORÃ',
                    juizes: message.data.localData.juizes || window.state.eventData?.juizes || [],
                    judges: message.data.localData.judges || window.state.eventData?.judges || 2,
                    sorteios: message.data.localData.sorteios || window.state.eventData?.sorteios || [],
                    boiadas: message.data.localData.boiadas || window.state.eventData?.boiadas || [],
                    notas: message.data.localData.notas || window.state.eventData?.notas || []
                };
                window.state.eventData = normalized;
                
                if (window.state.currentJudge) {
                    renderJudgeDashboard();
                } else {
                    renderJudgesList();
                    showView('view-select-judge');
                }
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
            window.state.eventData = normalizeEventData(cloudEvent);
            window.state.eventId = cloudEvent.id;

            if (window.state.currentJudge) {
                renderJudgeDashboard();
            } else {
                renderJudgesList();
                showView('view-select-judge');
            }
            showToast("Dados atualizados com sucesso!", "success");
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
    window.state.activeArenaRider = null;
    window.state.waitingMatchup = null;
    saveSession();
    
    document.getElementById('judge-profile-chip').classList.add('hidden');
    document.getElementById('view-judging-flow').classList.add('hidden');
    document.getElementById('modal-waiting-other-judge').classList.add('hidden');
    
    renderJudgesList();
    showView('view-select-judge');
    showToast("Selecione seu nome de Juiz.", "info");
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
    const views = ['view-login-event', 'view-select-judge', 'view-rounds-select', 'view-rides-list'];
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
