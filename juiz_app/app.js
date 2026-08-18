/**
 * RODEOAPP - Portal do Juiz (juiz.rodeoapp.pro)
 * Sistema de Lançamento de Notas em Tempo Real com Ably.com & Supabase
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

// Inicializa Supabase Client
const supabase = (typeof window.supabase !== 'undefined' && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    : null;

// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let state = {
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

let ablyClient = null;
let ablyChannel = null;

// ==========================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[RODEOAPP JUIZ] Inicializando Portal do Juiz...");

    // Inicializa conexão Ably no boot para validar status
    initAblyBaseConnection();

    // Verifica parâmetros de URL (ex: ?id=49expor-95675698&pass=1234)
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
            shareId: state.shareId,
            sharePassword: state.sharePassword,
            judgeIdx: state.currentJudge ? state.currentJudge.idx : null,
            judgeNome: state.currentJudge ? state.currentJudge.nome : null,
            selectedDay: state.selectedDay
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
    state.eventId = null;
    state.shareId = null;
    state.sharePassword = null;
    state.eventData = null;
    state.currentJudge = null;
    state.selectedDay = null;
}

// ==========================================
// FLUXO DE LOGIN 1: EVENTO (ID + SENHA)
// ==========================================
window.handleEventLogin = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
        e.stopPropagation();
    }

    const idInput = document.getElementById('input-event-id');
    const passInput = document.getElementById('input-event-password');
    const btnSubmit = document.getElementById('btn-submit-event');

    const shareId = (idInput ? idInput.value : '').trim();
    const password = (passInput ? passInput.value : '').trim();

    if (!shareId || !password) {
        showToast("Preencha o ID e a Senha do Evento.", "error");
        return false;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="animate-spin inline-block mr-2">🔄</span> Buscando Evento...`;
    }

    try {
        const cloudEvent = await fetchCloudEventByShare(shareId, password);
        if (!cloudEvent) {
            showToast("ID do evento ou senha incorretos.", "error");
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<span>CONECTAR AO EVENTO</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
            }
            return false;
        }

        state.shareId = shareId;
        state.sharePassword = password;
        state.eventData = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : cloudEvent.detalhes;
        state.eventId = cloudEvent.id;

        // Atualiza header
        const headerEvent = document.getElementById('header-event-name');
        if (headerEvent) {
            headerEvent.innerText = state.eventData.name || 'EVENTO OFICIAL';
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
        showToast(err.message || "Erro de conexão com o servidor. Tente novamente.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>CONECTAR AO EVENTO</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
        }
    }
    return false;
};

async function restoreSession(savedSession) {
    try {
        const cloudEvent = await fetchCloudEventByShare(savedSession.shareId, savedSession.sharePassword);
        if (!cloudEvent) {
            clearSession();
            showView('view-login-event');
            return;
        }

        state.shareId = savedSession.shareId;
        state.sharePassword = savedSession.sharePassword;
        state.eventData = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : cloudEvent.detalhes;
        state.eventId = cloudEvent.id;

        const headerEvent = document.getElementById('header-event-name');
        if (headerEvent) {
            headerEvent.innerText = state.eventData.name || 'EVENTO OFICIAL';
            headerEvent.classList.remove('hidden');
        }

        subscribeToEventChannel(state.shareId);

        // Se tinha juiz selecionado anteriormente
        const juizes = state.eventData.juizes || [];
        if (savedSession.judgeIdx !== null && juizes[savedSession.judgeIdx]) {
            const j = juizes[savedSession.judgeIdx];
            const jNome = typeof j === 'string' ? j : (j.nome || `JUIZ ${savedSession.judgeIdx + 1}`);
            const jSenha = typeof j === 'object' ? (j.senha || '') : '';
            state.currentJudge = { nome: jNome, senha: jSenha, idx: savedSession.judgeIdx };
            
            state.selectedDay = savedSession.selectedDay || getDefaultDay();
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

    // 1º Tentativa: Direct REST Fetch (ultra-rápido e compatível com todos os navegadores)
    try {
        const url = `${SUPABASE_URL}/rest/v1/eventos_oficiais?status=eq.compartilhado&select=*&order=created_at.desc&limit=150`;
        const resp = await fetch(url, { headers: SUPABASE_HEADERS });
        if (resp.ok) {
            const events = await resp.json();
            const found = (events || []).find(e => {
                const det = e.detalhes || {};
                const sId = String(det.share_id || '').trim().toLowerCase();
                const sPass = String(det.share_password || '').trim();
                return sId === cleanShareId && sPass === cleanPassword;
            });
            if (found) return found;
        }
    } catch (fetchErr) {
        console.warn("Direct REST fetch falhou, tentando Supabase Client:", fetchErr);
    }

    // 2º Tentativa: Supabase JS Client SDK
    if (supabase) {
        const { data: events, error } = await supabase
            .from('eventos_oficiais')
            .select('*')
            .eq('status', 'compartilhado')
            .order('created_at', { ascending: false })
            .limit(150);

        if (error) throw new Error(error.message || "Erro na conexão Supabase.");

        return (events || []).find(e => {
            const det = e.detalhes || {};
            const sId = String(det.share_id || '').trim().toLowerCase();
            const sPass = String(det.share_password || '').trim();
            return sId === cleanShareId && sPass === cleanPassword;
        });
    }

    return null;
}

// ==========================================
// FLUXO DE LOGIN 2: SELEÇÃO DE JUIZ & SENHA
// ==========================================
let pendingJudgeSelection = null;

function renderJudgesList() {
    const container = document.getElementById('judges-list-container');
    const juizes = (state.eventData && state.eventData.juizes) || [];

    if (juizes.length === 0) {
        container.innerHTML = `
            <div class="glass-card p-6 rounded-2xl text-center text-slate-400 font-medium text-xs">
                Nenhum juiz cadastrado neste evento ainda.<br>
                <span class="text-slate-500 mt-1 block">Peça ao Administrador para cadastrar os juízes no aplicativo RODEOAPP.</span>
            </div>`;
        return;
    }

    container.innerHTML = juizes.map((j, idx) => {
        const jNome = typeof j === 'string' ? j : (j.nome || `JUIZ ${idx + 1}`);
        const hasSenha = typeof j === 'object' && j.senha && String(j.senha).trim().length > 0;

        return `
            <button type="button" onclick="selectJudgeFromList(${idx})" class="glass-card p-5 rounded-2xl border-white/5 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all text-left flex items-center justify-between group touch-active">
                <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center font-black text-sm group-hover:bg-yellow-500 group-hover:text-black transition-all">
                        ${idx + 1}
                    </div>
                    <div>
                        <div class="font-black text-white text-base uppercase group-hover:text-yellow-400 transition-colors">${jNome}</div>
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Juiz Oficial • ${hasSenha ? '🔒 Protegido por Senha' : 'Livre'}</div>
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
    const juizes = state.eventData.juizes || [];
    const j = juizes[idx];
    if (!j) return;

    const jNome = typeof j === 'string' ? j : (j.nome || `JUIZ ${idx + 1}`);
    const jSenha = typeof j === 'object' ? (j.senha || '') : '';

    pendingJudgeSelection = { nome: jNome, senha: jSenha, idx };

    // Se o juiz possui senha cadastrada, abre o modal de autenticação
    if (jSenha && jSenha.trim().length > 0) {
        document.getElementById('modal-pwd-judge-name').innerText = jNome;
        document.getElementById('input-judge-pin').value = '';
        document.getElementById('judge-auth-error').classList.add('hidden');
        document.getElementById('modal-judge-password').classList.remove('hidden');
        setTimeout(() => document.getElementById('input-judge-pin')?.focus(), 100);
    } else {
        // Se não tem senha cadastrada, entra direto
        authenticateJudgeDirect(pendingJudgeSelection);
    }
};

window.handleJudgeAuth = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!pendingJudgeSelection) return;

    const inputPin = document.getElementById('input-judge-pin').value.trim();
    const correctPin = pendingJudgeSelection.senha.trim();

    if (inputPin === correctPin) {
        closeJudgePasswordModal();
        authenticateJudgeDirect(pendingJudgeSelection);
    } else {
        document.getElementById('judge-auth-error').innerText = "Senha do juiz incorreta. Tente novamente.";
        document.getElementById('judge-auth-error').classList.remove('hidden');
        document.getElementById('input-judge-pin').select();
    }
};

function authenticateJudgeDirect(judgeObj) {
    state.currentJudge = judgeObj;
    saveSession();

    // Re-inicia Ably com clientId do Juiz
    if (state.shareId) {
        subscribeToEventChannel(state.shareId);
    }

    // Configura o Painel de Montarias
    state.selectedDay = state.selectedDay || getDefaultDay();
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
    const sorteios = (state.eventData && state.eventData.sorteios) || [];
    if (sorteios.length > 0) {
        return sorteios[sorteios.length - 1].day;
    }
    return 'DIA 1';
}

function renderJudgeDashboard() {
    if (!state.currentJudge || !state.eventData) return;

    // Atualiza cabeçalho do Juiz
    document.getElementById('header-judge-name').innerText = state.currentJudge.nome;
    document.getElementById('judge-profile-chip').classList.remove('hidden');
    document.getElementById('rides-view-judge-name').innerText = state.currentJudge.nome;
    document.getElementById('rides-view-event-title').innerText = state.eventData.name || 'EVENTO';

    // Renderiza Abas de Dias
    renderDaysTabs();

    // Renderiza Montarias do Dia Selecionado
    renderRidesList();
}

function renderDaysTabs() {
    const container = document.getElementById('days-tabs-container');
    const sorteios = (state.eventData && state.eventData.sorteios) || [];

    // Obter dias únicos disponíveis
    let days = sorteios.map(s => s.day);
    if (days.length === 0) {
        days = ['DIA 1'];
    } else {
        days = [...new Set(days)];
    }

    if (!state.selectedDay || !days.includes(state.selectedDay)) {
        state.selectedDay = days[0];
    }

    container.innerHTML = days.map(d => {
        const isActive = d === state.selectedDay;
        const activeClass = isActive 
            ? 'bg-yellow-500 text-black font-black shadow-lg shadow-yellow-500/20' 
            : 'bg-slate-900 text-slate-400 font-bold border border-slate-800 hover:text-white';

        return `
            <button type="button" onclick="selectDay('${d}')" class="px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all whitespace-nowrap touch-active ${activeClass}">
                ${d.replace(/DIA/gi, 'ROUND')}
            </button>
        `;
    }).join('');
}

window.selectDay = (day) => {
    state.selectedDay = day;
    saveSession();
    renderDaysTabs();
    renderRidesList();
};

function renderRidesList() {
    const container = document.getElementById('rides-cards-container');
    const noRidesEl = document.getElementById('no-rides-message');
    const sorteios = (state.eventData && state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === state.selectedDay);

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
    const notas = (state.eventData && state.eventData.notas) || [];

    let totalCount = riders.length;
    let gradedCount = 0;
    let pendingCount = 0;

    const cardsHTML = riders.map((r, idx) => {
        const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
        const bull = bulls[bullIdx] || { nome: 'TOURO INDEFINIDO', cia: '---', lado: '---' };

        // Procura a nota deste Juiz para este competidor neste dia
        const myScore = notas.find(n => 
            n.peaoNome === r.nome && 
            n.dia === state.selectedDay && 
            n.judgeIdx === state.currentJudge.idx && 
            n.status !== 'substituida'
        );

        const isGraded = Boolean(myScore);
        if (isGraded) gradedCount++;
        else pendingCount++;

        // Filtro
        if (state.activeFilter === 'pending' && isGraded) return '';
        if (state.activeFilter === 'graded' && !isGraded) return '';

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
                            P: <b class="text-white">${myScore.riderScore.toFixed(2)}</b> | T: <b class="text-yellow-400">${myScore.bullScore.toFixed(2)}</b>
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
                        AVALIAR ➔
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
    state.activeFilter = type;
    ['all', 'pending', 'graded'].forEach(f => {
        const btn = document.getElementById(`filter-btn-${f}`);
        if (btn) {
            if (f === type) {
                btn.className = "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500 text-black shadow-lg transition-all touch-active";
            } else {
                btn.className = "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-all touch-active";
            }
        }
    });
    renderRidesList();
};

// ==========================================
// MODAL DE LANÇAMENTO DE NOTA (TOUCH ARENA)
// ==========================================
window.openScoreModal = (matchupIdx) => {
    const sorteios = (state.eventData && state.eventData.sorteios) || [];
    const currentSorteio = sorteios.find(s => s.day === state.selectedDay);
    if (!currentSorteio) return;

    const r = currentSorteio.riders[matchupIdx];
    const bullIdx = currentSorteio.assignments[matchupIdx] !== undefined ? currentSorteio.assignments[matchupIdx] : matchupIdx;
    const bull = currentSorteio.bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };

    state.currentMatchupIdx = matchupIdx;
    state.currentRider = r;
    state.currentBull = bull;

    // Preenche cabeçalhos do modal
    document.getElementById('modal-score-ordem').innerText = matchupIdx + 1;
    document.getElementById('modal-score-judge-label').innerText = `${state.currentJudge.nome} (JUIZ ${state.currentJudge.idx + 1})`;
    document.getElementById('modal-score-rider-name').innerText = r.nome;
    document.getElementById('modal-score-rider-city').innerText = r.cidade || 'CIDADE / UF';
    document.getElementById('modal-score-bull-name').innerText = bull.nome;
    document.getElementById('modal-score-bull-cia').innerText = bull.cia;
    document.getElementById('modal-score-bull-lado').innerText = bull.lado || 'C';

    // Carrega nota existente se houver
    const notas = state.eventData.notas || [];
    const myScore = notas.find(n => 
        n.peaoNome === r.nome && 
        n.dia === state.selectedDay && 
        n.judgeIdx === state.currentJudge.idx && 
        n.status !== 'substituida'
    );

    if (myScore) {
        document.getElementById('input-score-rider').value = myScore.riderScore.toFixed(2);
        document.getElementById('input-score-bull').value = myScore.bullScore.toFixed(2);
    } else {
        // Defaults confortáveis
        document.getElementById('input-score-rider').value = '22.50';
        document.getElementById('input-score-bull').value = '22.50';
    }

    updateScoreTotal();
    document.getElementById('modal-score-entry').classList.remove('hidden');
};

window.closeScoreEntryModal = () => {
    document.getElementById('modal-score-entry').classList.add('hidden');
    state.currentMatchupIdx = null;
    state.currentRider = null;
    state.currentBull = null;
};

window.updateScoreTotal = () => {
    const rScore = parseFloat(document.getElementById('input-score-rider').value) || 0;
    const bScore = parseFloat(document.getElementById('input-score-bull').value) || 0;
    const total = (rScore + bScore).toFixed(2);
    document.getElementById('modal-score-total-display').innerText = total;
};

window.adjustScore = (target, delta) => {
    const input = document.getElementById(target === 'rider' ? 'input-score-rider' : 'input-score-bull');
    let val = parseFloat(input.value) || 0;
    val = Math.max(0, Math.min(50, val + delta));
    input.value = val.toFixed(2);
    updateScoreTotal();
};

window.setPresetScore = (target, value) => {
    const input = document.getElementById(target === 'rider' ? 'input-score-rider' : 'input-score-bull');
    input.value = parseFloat(value).toFixed(2);
    updateScoreTotal();
};

window.submitNoScore = () => {
    document.getElementById('input-score-rider').value = '0.00';
    document.getElementById('input-score-bull').value = '0.00';
    updateScoreTotal();
    submitScoreToRealtime(true);
};

window.submitReride = () => {
    if (confirm("Deseja solicitar RE-RIDE para esta montaria? O competidor terá direito a novo touro.")) {
        submitScoreToRealtime(false, true);
    }
};

// ==========================================
// ENVIO DA NOTA EM TEMPO REAL (ABLY + SUPABASE)
// ==========================================
window.submitScoreToRealtime = async (isFall = false, isReride = false) => {
    if (!state.currentJudge || !state.currentRider) return;

    const rScore = parseFloat(document.getElementById('input-score-rider').value) || 0;
    const bScore = parseFloat(document.getElementById('input-score-bull').value) || 0;
    const totalScore = isFall ? 0 : (rScore + bScore);

    const btnSubmit = document.getElementById('btn-submit-score');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="animate-spin mr-2">🔄</span> ENVIANDO NOTA...`;
    }

    const scorePayload = {
        shareId: state.shareId,
        day: state.selectedDay,
        matchupIdx: state.currentMatchupIdx,
        riderName: state.currentRider.nome,
        bullName: state.currentBull.nome,
        bullCia: state.currentBull.cia,
        judgeName: state.currentJudge.nome,
        judgeIdx: state.currentJudge.idx,
        riderScore: isFall ? 0 : rScore,
        bullScore: isFall ? 0 : bScore,
        totalScore: totalScore,
        isFall: isFall,
        fallTime: isFall ? '0.00' : '8.00',
        isReride: isReride,
        timestamp: Date.now()
    };

    try {
        // 1. Envia via Ably Realtime (WebSocket ultra-rápido)
        if (ablyChannel) {
            ablyChannel.publish('judge-score-submitted', scorePayload);
            console.log("[ABLY REALTIME] Nota enviada via canal:", scorePayload);
        } else {
            console.warn("Ably canal não aberto no momento, gravando direto no Supabase.");
        }

        // 2. Grava diretamente no Supabase para garantir persistência total
        await saveScoreDirectToSupabase(scorePayload);

        // 3. Atualiza estado local na memória
        state.eventData.notas = state.eventData.notas || [];
        const existingIdx = state.eventData.notas.findIndex(n => 
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
            state.eventData.notas[existingIdx] = localNota;
        } else {
            state.eventData.notas.push(localNota);
        }

        closeScoreEntryModal();
        renderRidesList();
        showToast("⚡ Nota transmitida em tempo real!", "success");

    } catch (err) {
        console.error("Erro ao enviar nota:", err);
        showToast("Erro ao transmitir nota. Verifique a conexão.", "error");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>⚡ ENVIAR NOTA EM TEMPO REAL</span>`;
        }
    }
};

async function saveScoreDirectToSupabase(scorePayload) {
    if (!state.eventId) return;

    try {
        // Fetch evento atualizado
        const urlGet = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(state.eventId)}&select=*`;
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

        const urlPatch = `${SUPABASE_URL}/rest/v1/eventos_oficiais?id=eq.${encodeURIComponent(state.eventId)}`;
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
            ablyClient = new Ably.Realtime({ key: ablyKey, clientId: `juiz-${state.currentJudge ? state.currentJudge.nome : 'anon'}-${Date.now()}` });
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
                state.eventData = message.data.localData;
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
        dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
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
    if (!state.shareId || !state.sharePassword) return;
    showToast("Atualizando dados da nuvem...", "info");
    try {
        const cloudEvent = await fetchCloudEventByShare(state.shareId, state.sharePassword);
        if (cloudEvent) {
            state.eventData = (cloudEvent.detalhes && cloudEvent.detalhes.localData) ? cloudEvent.detalhes.localData : cloudEvent.detalhes;
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
    document.getElementById('judge-menu-info').innerText = `${state.currentJudge ? state.currentJudge.nome : 'JUIZ'} • ${state.eventData ? state.eventData.name : ''}`;
    document.getElementById('modal-judge-menu').classList.remove('hidden');
};

window.closeJudgeMenuModal = () => {
    document.getElementById('modal-judge-menu').classList.add('hidden');
};

window.switchJudge = () => {
    closeJudgeMenuModal();
    state.currentJudge = null;
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
