// pdf_parser.js
// Logic for handling the PDF import inside the Electron Desktop App

// Initialize PDF.js worker
if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let pdfParsedData = null;
let currentPdfFile = null;

// DOM Elements
const pdfFileInput = document.getElementById('pdf-file-input');
const pdfStep1 = document.getElementById('pdf-step-1');
const pdfStep2 = document.getElementById('pdf-step-2');
const pdfStep3 = document.getElementById('pdf-step-3');
const pdfStep4 = document.getElementById('pdf-step-4');
const pdfLoading = document.getElementById('pdf-loading');
const pdfLoadingText = document.getElementById('pdf-loading-text');

const cbPeoes = document.getElementById('pdf-cb-peoes');
const cbTouros = document.getElementById('pdf-cb-touros');
const cbCias = document.getElementById('pdf-cb-cias');
const cbNotas = document.getElementById('pdf-cb-notas');
const btnToggleAll = document.getElementById('pdf-btn-toggle-all');
const btnProcess = document.getElementById('pdf-btn-process');
const btnBackTo2 = document.getElementById('pdf-btn-back-to-2');
const btnConfirmDay = document.getElementById('pdf-btn-confirm-day');
const btnBackTo3 = document.getElementById('pdf-btn-back-to-3');
const btnSaveEvent = document.getElementById('pdf-btn-save-event');
const dayButtons = document.querySelectorAll('.pdf-day-btn');
const previewTableBody = document.getElementById('pdf-preview-table-body');
const summaryModal = document.getElementById('modal-pdf-summary');
const summaryBox = document.getElementById('pdf-summary-box');
const btnSummaryOk = document.getElementById('pdf-btn-summary-ok');

let selectedDay = 'dia1';

function toggleAllCheckboxes() {
    const allChecked = cbPeoes.checked && cbTouros.checked && cbCias.checked && cbNotas.checked;
    cbPeoes.checked = !allChecked;
    cbTouros.checked = !allChecked;
    cbCias.checked = !allChecked;
    cbNotas.checked = !allChecked;
    btnToggleAll.textContent = allChecked ? 'Marcar Tudo' : 'Desmarcar Tudo';
}

if (btnToggleAll) {
    btnToggleAll.addEventListener('click', toggleAllCheckboxes);
}

if (pdfFileInput) {
    pdfFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currentPdfFile = file;
        
        pdfStep1.classList.add('hidden');
        pdfStep2.classList.remove('hidden');
        
        cbPeoes.checked = true;
        cbTouros.checked = true;
        cbCias.checked = true;
        cbNotas.checked = true;
        btnToggleAll.textContent = 'Desmarcar Tudo';
    });
}

if (btnProcess) {
    btnProcess.addEventListener('click', async () => {
        if (!currentPdfFile) return;
        
        pdfStep2.classList.add('hidden');
        pdfLoading.classList.remove('hidden');
        pdfLoadingText.textContent = "Lendo o PDF...";

        try {
            const arrayBuffer = await currentPdfFile.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let rawText = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                let lastY = null;
                let line = '';
                
                content.items.forEach((item) => {
                    const y = Math.round(item.transform[5]);
                    if (lastY !== null && Math.abs(y - lastY) > 4) {
                        if (line.trim()) rawText += line.trim() + '\n';
                        line = '';
                    }
                    line += item.str + ' ';
                    lastY = y;
                });
                if (line.trim()) rawText += line.trim() + '\n';
            }

            pdfLoadingText.textContent = "Processando com Inteligência Artificial (Gemini)...";
            const aiResult = await parsePdfWithGemini(rawText);
            if (aiResult && ((aiResult.montarias && aiResult.montarias.length > 0) || (aiResult.reservas && aiResult.reservas.length > 0))) {
                pdfParsedData = convertGeminiResultToParsedData(aiResult, rawText);
            } else {
                pdfLoadingText.textContent = "Extraindo dados nativamente...";
                pdfParsedData = parseRodeoPdfText(rawText);
            }

            // Deduplication and DB sync
            pdfLoadingText.textContent = "Verificando banco de dados...";
            const summaryData = await processAndSaveExtractedData(pdfParsedData);

            pdfLoading.classList.add('hidden');
            
            // Show summary popup
            document.getElementById('pdf-summary-peoes').textContent = summaryData.newPeoes;
            document.getElementById('pdf-summary-touros').textContent = summaryData.newTouros;
            document.getElementById('pdf-summary-cias').textContent = summaryData.newCias;
            document.getElementById('pdf-summary-montarias').textContent = pdfParsedData.items.length;
            
            summaryModal.classList.remove('hidden');
            setTimeout(() => {
                summaryBox.classList.remove('scale-95', 'opacity-0');
                summaryBox.classList.add('scale-100', 'opacity-100');
            }, 50);

        } catch (error) {
            console.error("Erro ao ler o PDF:", error);
            alert("Erro ao ler o PDF: " + error.message);
            pdfLoading.classList.add('hidden');
            pdfStep2.classList.remove('hidden');
        }
    });
}

if (btnSummaryOk) {
    btnSummaryOk.addEventListener('click', () => {
        summaryBox.classList.remove('scale-100', 'opacity-100');
        summaryBox.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            summaryModal.classList.add('hidden');
            if (cbNotas.checked) {
                pdfStep3.classList.remove('hidden');
                autoSelectDay(pdfParsedData.suggestedDay);
            } else {
                // Done
                document.getElementById('modal-import-pdf').classList.add('hidden');
                resetPdfWizard();
            }
        }, 300);
    });
}

function autoSelectDay(dayName) {
    dayButtons.forEach(btn => {
        const val = btn.dataset.day;
        if (dayName.toLowerCase().replace(/[\s-]/g, '') === val) {
            btn.click();
        }
    });
}

dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        dayButtons.forEach(b => {
            b.classList.remove('border-yellow-500', 'text-yellow-500', 'bg-yellow-500/10');
            b.classList.add('border-slate-800', 'text-slate-400');
        });
        btn.classList.add('border-yellow-500', 'text-yellow-500', 'bg-yellow-500/10');
        btn.classList.remove('border-slate-800', 'text-slate-400');
        selectedDay = btn.dataset.day;
        btnConfirmDay.disabled = false;
    });
});

if (btnConfirmDay) {
    btnConfirmDay.addEventListener('click', () => {
        pdfStep3.classList.add('hidden');
        renderPdfPreviewTable();
        pdfStep4.classList.remove('hidden');
    });
}

if (btnBackTo2) {
    btnBackTo2.addEventListener('click', () => {
        pdfStep3.classList.add('hidden');
        pdfStep2.classList.remove('hidden');
    });
}

if (btnBackTo3) {
    btnBackTo3.addEventListener('click', () => {
        pdfStep4.classList.add('hidden');
        pdfStep3.classList.remove('hidden');
    });
}

function renderPdfPreviewTable() {
    previewTableBody.innerHTML = '';
    
    if (!pdfParsedData || !pdfParsedData.items) return;

    pdfParsedData.items.forEach((item, index) => {
        const tr = document.createElement('tr');
        const defaultTempo = item.tempo !== undefined ? item.tempo : (item.status === 'ativa' ? 8.0 : 0);
        
        tr.innerHTML = `
            <td class="px-4 py-2 border-b border-slate-800">
                <input type="text" class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs font-bold uppercase" value="${item.peao}" data-index="${index}" data-field="peao">
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <input type="text" class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs font-bold uppercase" value="${item.touro}" data-index="${index}" data-field="touro">
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <input type="text" class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs font-bold uppercase" value="${item.cia}" data-index="${index}" data-field="cia">
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <select class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs font-bold uppercase" data-index="${index}" data-field="status">
                    <option value="ativa" ${item.status === 'ativa' ? 'selected' : ''}>Válida</option>
                    <option value="queda" ${item.status === 'queda' ? 'selected' : ''}>Queda</option>
                    <option value="reride" ${item.status === 'reride' ? 'selected' : ''}>Re-ride</option>
                </select>
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <input type="number" step="0.1" class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs text-center font-bold" value="${defaultTempo}" data-index="${index}" data-field="tempo">
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <input type="number" step="0.25" class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs text-center font-bold" value="${item.totalPeao || 0}" data-index="${index}" data-field="totalPeao" onchange="window.updatePdfTotal(${index})">
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <input type="number" step="0.25" class="bg-slate-900 border border-slate-700 rounded p-1 w-full text-white text-xs text-center font-bold" value="${item.totalTouro || 0}" data-index="${index}" data-field="totalTouro" onchange="window.updatePdfTotal(${index})">
            </td>
            <td class="px-4 py-2 border-b border-slate-800">
                <div class="text-yellow-500 font-black text-center" id="pdf-total-${index}">${item.total || 0}</div>
            </td>
        `;
        previewTableBody.appendChild(tr);
    });
}

window.updatePdfTotal = (index) => {
    const inputs = document.querySelectorAll(`input[data-index="${index}"]`);
    let peao = 0, touro = 0;
    inputs.forEach(inp => {
        if (inp.dataset.field === 'totalPeao') peao = parseFloat(inp.value) || 0;
        if (inp.dataset.field === 'totalTouro') touro = parseFloat(inp.value) || 0;
    });
    const total = peao + touro;
    document.getElementById(`pdf-total-${index}`).textContent = total.toFixed(2);
    
    // Save locally to pdfParsedData
    if (pdfParsedData && pdfParsedData.items[index]) {
        pdfParsedData.items[index].totalPeao = peao;
        pdfParsedData.items[index].totalTouro = touro;
        pdfParsedData.items[index].total = total;
    }
}

if (btnSaveEvent) {
    btnSaveEvent.addEventListener('click', async () => {
        const targetEvent = window.currentEvent || (typeof window.getCurrentEvent === 'function' ? window.getCurrentEvent() : null);
        if (!targetEvent) {
            alert("Nenhum evento aberto! Por favor, abra um evento na tela de eventos antes de importar o PDF.");
            return;
        }

        // Apply changes from preview table inputs to pdfParsedData
        const inputs = previewTableBody.querySelectorAll('input, select');
        inputs.forEach(input => {
            const idx = input.dataset.index;
            const field = input.dataset.field;
            if (pdfParsedData.items[idx]) {
                let val = input.value;
                if (field === 'totalPeao' || field === 'totalTouro' || field === 'tempo') val = parseFloat(val) || 0;
                pdfParsedData.items[idx][field] = typeof val === 'string' ? val.toUpperCase() : val;
            }
        });

        // 1. Populate targetEvent.peoes
        targetEvent.peoes = targetEvent.peoes || [];
        pdfParsedData.items.forEach(item => {
            if (item.peao && item.peao.trim()) {
                const peaoNome = item.peao.trim().toUpperCase();
                const exists = targetEvent.peoes.some(p => (typeof p === 'string' ? p : p.nome).toUpperCase() === peaoNome);
                if (!exists) {
                    targetEvent.peoes.push({ nome: peaoNome, cidade: item.cidade || '' });
                }
            }
        });

        // 2. Populate targetEvent.boiadas (CIAs & Bulls)
        targetEvent.boiadas = targetEvent.boiadas || [];
        const tourosByCia = {};

        pdfParsedData.items.forEach(item => {
            if (item.touro && item.touro.trim()) {
                const cia = (item.cia || 'CIA OUTRAS').trim().toUpperCase();
                const touro = item.touro.trim().toUpperCase();
                tourosByCia[cia] = tourosByCia[cia] || new Set();
                tourosByCia[cia].add(touro);
            }
        });

        if (pdfParsedData.detectedTouros) {
            pdfParsedData.detectedTouros.forEach(t => {
                const cia = (t.cia || 'CIA OUTRAS').trim().toUpperCase();
                const touro = t.nome.trim().toUpperCase();
                tourosByCia[cia] = tourosByCia[cia] || new Set();
                tourosByCia[cia].add(touro);
            });
        }

        Object.keys(tourosByCia).forEach(ciaNome => {
            let existingCia = targetEvent.boiadas.find(b => b.nome.toUpperCase() === ciaNome);
            if (!existingCia) {
                existingCia = { nome: ciaNome, touros: [] };
                targetEvent.boiadas.push(existingCia);
            }
            tourosByCia[ciaNome].forEach(t => {
                if (!existingCia.touros.some(existingT => existingT.toUpperCase() === t)) {
                    existingCia.touros.push(t);
                }
            });
        });

        // 3. Populate targetEvent.sorteios for selectedDay
        targetEvent.sorteios = targetEvent.sorteios || [];
        const ridersList = pdfParsedData.items.map(i => ({ nome: i.peao, cidade: i.cidade || '' }));
        const bullsList = pdfParsedData.items.map(i => ({ nome: i.touro, cia: i.cia }));
        const assignmentsMap = {};
        pdfParsedData.items.forEach((_, idx) => {
            assignmentsMap[idx] = idx;
        });

        const drawToSave = {
            day: selectedDay,
            date: new Date().toLocaleString(),
            riders: ridersList,
            bulls: bullsList,
            assignments: assignmentsMap
        };

        const existingDrawIdx = targetEvent.sorteios.findIndex(s => s.day.toUpperCase() === selectedDay.toUpperCase());
        if (existingDrawIdx !== -1) {
            targetEvent.sorteios[existingDrawIdx] = drawToSave;
        } else {
            targetEvent.sorteios.push(drawToSave);
        }

        // 4. Populate targetEvent.notas (Flat array used across renderer.js)
        targetEvent.notas = targetEvent.notas || [];
        targetEvent.notas = targetEvent.notas.filter(n => (n.dia || '').toUpperCase() !== selectedDay.toUpperCase());

        pdfParsedData.items.forEach(item => {
            const itemTempo = item.tempo !== undefined ? item.tempo : (item.status === 'ativa' ? 8.0 : 0);
            const j1_p = item.totalPeao ? item.totalPeao / 2 : 0;
            const j2_p = item.totalPeao ? item.totalPeao / 2 : 0;
            const j1_t = item.totalTouro ? item.totalTouro / 2 : 0;
            const j2_t = item.totalTouro ? item.totalTouro / 2 : 0;
            const calcTotal = (item.totalPeao || 0) + (item.totalTouro || 0);

            targetEvent.notas.push({
                peao: item.peao,
                peaoNome: item.peao,
                touro: item.touro,
                touroNome: item.touro,
                cia: item.cia,
                ciaNome: item.cia,
                dia: selectedDay,
                status: item.status || 'ativa',
                tempo: itemTempo,
                j1_peao: j1_p,
                j2_peao: j2_p,
                j1_touro: j1_t,
                j2_touro: j2_t,
                peao_score: item.totalPeao || 0,
                touro_score: item.totalTouro || 0,
                totalPeao: item.totalPeao || 0,
                totalTouro: item.totalTouro || 0,
                total: item.total || calcTotal,
                id_montaria: "pdf_" + Date.now() + "_" + Math.floor(Math.random() * 1000)
            });
        });

        // Update global reference in renderer
        if (typeof window.setCurrentEvent === 'function') {
            window.setCurrentEvent(targetEvent);
        } else {
            window.currentEvent = targetEvent;
        }

        // 5. Save to database using updateLocalEvent
        const auth = window.electronAPI.getAuth();
        const email = auth ? auth.email : '';
        
        if (email) {
            await window.electronAPI.updateLocalEvent(email, targetEvent);
            
            // Re-render screens with exact renderer function names
            if (typeof window.openListPeoes === 'function') window.openListPeoes();
            if (typeof window.openListBoiadas === 'function') window.openListBoiadas();
            if (typeof window.openSorteiosList === 'function') window.openSorteiosList();
            if (typeof window.renderEvents === 'function') window.renderEvents();
            if (typeof window.renderNotasTable === 'function') window.renderNotasTable();
            
            alert("Sorteio, Peões, Boiadas e Notas salvos no evento com sucesso!");
        } else {
            alert("Erro: Você não está logado no sistema.");
        }
        
        document.getElementById('modal-import-pdf').classList.add('hidden');
        resetPdfWizard();
    });
}

function resetPdfWizard() {
    pdfStep4.classList.add('hidden');
    pdfStep3.classList.add('hidden');
    pdfStep2.classList.add('hidden');
    pdfStep1.classList.remove('hidden');
    pdfFileInput.value = '';
    currentPdfFile = null;
    pdfParsedData = null;
}

async function getGeminiApiKey() {
    let apiKey = localStorage.getItem('hzn_gemini_api_key') || localStorage.getItem('gemini_api_key');
    if (apiKey && apiKey.trim().length > 10) return apiKey.trim();

    try {
        const supabaseUrl = 'https://api.rodeoapp.pro';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';
        const res = await fetch(`${supabaseUrl}/rest/v1/portal_configs?key=eq.gemini_api_key&select=value`, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0].value) {
            apiKey = data[0].value.trim();
            localStorage.setItem('hzn_gemini_api_key', apiKey);
            return apiKey;
        }
    } catch (e) {
        console.warn("Erro ao buscar chave Gemini do Supabase portal_configs:", e);
    }
    return null;
}

function customGeminiPrompt(title, placeholder) {
    return new Promise((resolve) => {
        const bg = document.createElement('div');
        bg.className = 'fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md';
        bg.innerHTML = `
            <div class="bg-slate-900 border-2 border-yellow-500/50 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
                <div class="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
                    <svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                </div>
                <h3 class="text-white font-black text-lg mb-2 uppercase">${title}</h3>
                <p class="text-slate-400 text-xs mb-6">Cole sua chave do Google AI Studio para ativar a Inteligência Artificial no leitor de PDF.</p>
                <input type="password" id="custom-prompt-input" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm font-mono mb-6 text-center focus:border-yellow-500 outline-none" placeholder="${placeholder}">
                <div class="flex gap-3">
                    <button id="custom-prompt-cancel" class="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold uppercase text-xs">Pular / Off-line</button>
                    <button id="custom-prompt-ok" class="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-black uppercase text-xs shadow-lg">Salvar e Usar</button>
                </div>
            </div>
        `;
        document.body.appendChild(bg);
        const input = document.getElementById('custom-prompt-input');
        input.focus();

        const cleanup = (val) => {
            document.body.removeChild(bg);
            resolve(val);
        };

        document.getElementById('custom-prompt-cancel').onclick = () => cleanup(null);
        document.getElementById('custom-prompt-ok').onclick = () => cleanup(input.value);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') cleanup(input.value);
            if (e.key === 'Escape') cleanup(null);
        };
    });
}

async function parsePdfWithGemini(rawText) {
    let apiKey = await getGeminiApiKey();
    if (!apiKey) {
        const inputKey = await customGeminiPrompt("Chave API do Gemini", "AIzaSy...");
        if (!inputKey || !inputKey.trim()) return null;
        apiKey = inputKey.trim();
        localStorage.setItem('hzn_gemini_api_key', apiKey);
    }

    const systemPrompt = `Você é um leitor especialista de súmulas, notas e listas de sorteio de rodeios brasileiros.
Sua função é analisar o texto extraído de um arquivo PDF de rodeio (que pode ser uma Lista de Sorteio OU um Resultado/Súmula de Notas com tempos e notas dos juízes) e retornar um JSON estrito contendo:

1. "tipo_pdf": "SORTEIO" ou "RESULTADO".
2. "montarias": lista de todos os confrontos/montarias.
3. "reservas": lista de touros reservas/repete/re-ride da seção "Animais Reservas" ou "Re-Rider".

Retorne APENAS um objeto JSON com essa estrutura idêntica (sem blocos markdown \`\`\`json):
{
  "tipo_pdf": "RESULTADO",
  "montarias": [
    {
      "peao": "KAYQUE RUAN DA SILVA CRUZ",
      "cidade": "MIGUELOPOLIS-SP",
      "touro": "JAGUNÇO",
      "cia": "OR.2B.BULLS",
      "tempo": 8.0,
      "j1_peao": 22.0,
      "j1_touro": 21.5,
      "j2_peao": 22.25,
      "j2_touro": 21.75,
      "total_peao": 44.25,
      "total_touro": 43.25,
      "total": 87.50,
      "status": "ativa"
    },
    {
      "peao": "MARCIO JUNIO CARVALHO",
      "cidade": "CASTILHO-SP",
      "touro": "AFRICANO JR",
      "cia": "ESTRADEIRO",
      "tempo": 6.97,
      "j1_peao": 0.0,
      "j1_touro": 22.0,
      "j2_peao": 0.0,
      "j2_touro": 21.75,
      "total_peao": 0.0,
      "total_touro": 43.75,
      "total": 0.0,
      "status": "queda"
    }
  ],
  "reservas": [
    {
      "peao": "FELIPE DIAS REIS",
      "touro": "PARANGOLE",
      "cia": "OR.2B.BULLS"
    }
  ]
}

REGRAS RÍGIDAS DE EXTRAÇÃO:
- "tempo": se houver coluna de tempo no PDF, extraia o número exato (ex: 8,00 -> 8.0, 6,97 -> 6.97, 5,08 -> 5.08, 3,28 -> 3.28, 0,00 -> 0.0). Se não houver coluna de tempo no PDF (PDF apenas de Sorteio), deixe 8.0.
- "status":
    * Se o tempo for 8.0 e houver nota de peão > 0, "status" = "ativa".
    * Se o tempo for menor que 8.0 e maior que 0 (ex: 6.97, 5.08, 3.28), aconteceu uma QUEDA do peão! Nesse caso, j1_peao = 0, j2_peao = 0, total_peao = 0, total = 0 e "status" = "queda".
    * Se o total for "Clock" ou tempo 0, "status" = "queda".
- Extraia os valores individuais dos juízes (j1_peao, j1_touro, j2_peao, j2_touro) e os totais se presentes.
- Todos os nomes devem estar limpos e em MAIÚSCULAS.
- Ignore números de ordem (1, 2, 28) e letras de lado ('E', 'C').`;

    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ];

    for (const model of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\nTEXTO BRUTO DO PDF:\n${rawText}` }] }
                    ]
                })
            });
            const data = await response.json();
            if (data.error && (data.error.code === 400 || data.error.code === 403)) {
                console.warn("Chave API do Gemini inválida. Removendo do localStorage...");
                localStorage.removeItem('hzn_gemini_api_key');
            }
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                let text = data.candidates[0].content.parts[0].text;
                text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                const parsed = JSON.parse(text);
                if (parsed && (parsed.montarias || parsed.reservas)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn(`Tentativa Gemini (${model}) falhou:`, e);
        }
    }
    return null;
}

function convertGeminiResultToParsedData(aiResult, rawText) {
    const items = [];
    const peoesSet = new Set();
    const tourosMap = new Map();
    const ciasSet = new Set();

    if (aiResult.montarias && Array.isArray(aiResult.montarias)) {
        aiResult.montarias.forEach(m => {
            const peao = (m.peao || '').trim().toUpperCase();
            const touro = (m.touro || '').trim().toUpperCase();
            const cia = (m.cia || 'CIA OUTRAS').trim().toUpperCase();
            const cidade = (m.cidade || '').trim().toUpperCase();

            if (peao && peao.length >= 3) {
                peoesSet.add(peao);
                if (touro && touro.length >= 2) {
                    if (cia && cia.length >= 2) {
                        ciasSet.add(cia);
                        tourosMap.set(touro, cia);
                    } else if (!tourosMap.has(touro)) {
                        tourosMap.set(touro, 'CIA OUTRAS');
                    }

                    let tempo = parseFloat(m.tempo);
                    if (isNaN(tempo)) tempo = (m.status === 'ativa' ? 8.0 : 0);

                    const j1_peao = parseFloat(m.j1_peao) || 0;
                    const j1_touro = parseFloat(m.j1_touro) || 0;
                    const j2_peao = parseFloat(m.j2_peao) || 0;
                    const j2_touro = parseFloat(m.j2_touro) || 0;

                    let totalPeao = parseFloat(m.total_peao);
                    if (isNaN(totalPeao)) totalPeao = j1_peao + j2_peao;

                    let totalTouro = parseFloat(m.total_touro);
                    if (isNaN(totalTouro)) totalTouro = j1_touro + j2_touro;

                    if (tempo < 8.0) {
                        totalPeao = 0;
                    }

                    let total = parseFloat(m.total);
                    if (isNaN(total)) total = totalPeao + totalTouro;
                    if (tempo < 8.0) total = 0;

                    let status = m.status || (tempo >= 8.0 && total > 0 ? 'ativa' : 'queda');

                    items.push({
                        peao,
                        cidade,
                        touro,
                        cia: cia || tourosMap.get(touro) || 'CIA OUTRAS',
                        status,
                        tempo,
                        j1_peao,
                        j1_touro,
                        j2_peao,
                        j2_touro,
                        totalPeao,
                        totalTouro,
                        total
                    });
                }
            }
        });
    }

    if (aiResult.reservas && Array.isArray(aiResult.reservas)) {
        aiResult.reservas.forEach(r => {
            const touro = (r.touro || '').trim().toUpperCase();
            const cia = (r.cia || 'CIA OUTRAS').trim().toUpperCase();
            if (touro && touro.length >= 2) {
                if (cia && cia.length >= 2) {
                    ciasSet.add(cia);
                    tourosMap.set(touro, cia);
                } else if (!tourosMap.has(touro)) {
                    tourosMap.set(touro, 'CIA OUTRAS');
                }
            }
        });
    }

    const detectedTouros = [];
    tourosMap.forEach((cia, nome) => detectedTouros.push({ nome, cia }));

    let suggestedDay = 'DIA 1';
    const fullUpper = rawText.toUpperCase();
    if (fullUpper.includes('FINAL')) suggestedDay = 'FINAL';
    else if (fullUpper.includes('SEMI')) suggestedDay = 'SEMI-FINAL';
    else if (fullUpper.includes('DIA 4') || fullUpper.includes('ROUND 4') || fullUpper.includes('4º ROUND') || fullUpper.includes('4° ROUND')) suggestedDay = 'DIA 4';
    else if (fullUpper.includes('DIA 3') || fullUpper.includes('ROUND 3') || fullUpper.includes('3º ROUND') || fullUpper.includes('3° ROUND')) suggestedDay = 'DIA 3';
    else if (fullUpper.includes('DIA 2') || fullUpper.includes('ROUND 2') || fullUpper.includes('2º ROUND') || fullUpper.includes('2° ROUND')) suggestedDay = 'DIA 2';
    else if (fullUpper.includes('DIA 1') || fullUpper.includes('ROUND 1') || fullUpper.includes('1º ROUND') || fullUpper.includes('1° ROUND')) suggestedDay = 'DIA 1';

    return {
        rawText,
        items,
        detectedPeoes: Array.from(peoesSet),
        detectedTouros,
        detectedCias: Array.from(ciasSet),
        suggestedDay
    };
}

function parseRodeoPdfText(rawText) {
    let suggestedDay = 'DIA 1';
    const fullUpper = rawText.toUpperCase();
    if (fullUpper.includes('FINAL')) suggestedDay = 'FINAL';
    else if (fullUpper.includes('SEMI')) suggestedDay = 'SEMI-FINAL';
    else if (fullUpper.includes('DIA 4') || fullUpper.includes('ROUND 4')) suggestedDay = 'DIA 4';
    else if (fullUpper.includes('DIA 3') || fullUpper.includes('ROUND 3')) suggestedDay = 'DIA 3';
    else if (fullUpper.includes('DIA 2') || fullUpper.includes('ROUND 2')) suggestedDay = 'DIA 2';
    else if (fullUpper.includes('DIA 1') || fullUpper.includes('ROUND 1')) suggestedDay = 'DIA 1';

    const items = [];
    const peoesSet = new Set();
    const tourosMap = new Map();
    const ciasSet = new Set();

    const ignoreWords = ['SORTEIO', 'RANKING', 'RODEOAPP', 'HORÁRIO', 'RESULTADO', 'CAMPEONATO', 'EVENTO', 'JUIZ', 'PEÃO', 'TOURO', 'CIA', 'BOIADA', 'PONTOS', 'TEMPO', 'STATUS', 'ORDEM', 'CIDADE', 'ESTADO', 'RODEO', 'PEAO', 'COMPETIDOR', 'ANIMAL', 'COMPANHIA', 'LADO', 'Nº', 'NO'];

    const reserveKeywords = [
        'ANIMAIS RESERVAS', 'ANIMAIS RESERVA', 'ANIMAL RESERVA', 'ANIMAL RESERVAS',
        'TOUROS RESERVAS', 'TOUROS RESERVA', 'TOURO RESERVA', 'TOURO RESERVAS',
        'RESERVA', 'RESERVAS', 'REPETE', 'REPETES', 'RE-RIDE', 'RERIDE', 'RR'
    ];

    let inReserveSection = false;

    const lines = rawText.split('\n');
    lines.forEach((line) => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.length < 3) return;
        const upper = cleanLine.toUpperCase();

        if (ignoreWords.some(w => upper === w || upper.startsWith(w + ' ') || upper.startsWith(w + '\t'))) {
            if (upper.includes('ANIMAIS RESERVAS') || upper.includes('ANIMAIS RESERVA') || upper.includes('REPETE')) {
                inReserveSection = true;
            } else if (upper.includes('SORTEIO') || upper.includes('RANKING') || upper.includes('COMPETIDOR')) {
                inReserveSection = false;
            }
            return;
        }

        // Detect reserve / repete section headers
        if (reserveKeywords.some(kw => upper.includes(kw))) {
            if (cleanLine.length < 45 && !upper.includes('VS') && !upper.includes(' X ') && !upper.includes('|')) {
                inReserveSection = true;
                return;
            }
        }

        const parts = cleanLine.split(/\s{2,}|\t|\||;/).map(p => p.trim()).filter(Boolean);
        const numMatches = cleanLine.match(/\b\d{1,2}(?:[\.,]\d{1,2})?\b/g) || [];
        const numbers = numMatches.map(n => parseFloat(n.replace(',', '.')));

        if (parts.length >= 1) {
            const firstPartClean = parts[0].replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
            const isRepetePrefix = reserveKeywords.some(kw => firstPartClean.startsWith(kw) || upper.startsWith(kw));

            if (inReserveSection || isRepetePrefix) {
                // Reserve bull line without rider
                const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length >= 2 && p.toUpperCase() !== 'E' && p.toUpperCase() !== 'C');
                const cleanTextParts = textParts.filter(p => {
                    const cleanP = p.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
                    return !reserveKeywords.some(kw => cleanP.includes(kw));
                });

                if (cleanTextParts.length >= 1) {
                    let touro = cleanTextParts[0].replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
                    let cia = cleanTextParts[1] ? cleanTextParts[1].trim().toUpperCase() : 'CIA OUTRAS';

                    if (touro && touro.length >= 2 && !ignoreWords.includes(touro)) {
                        if (cia && cia.length >= 2 && !ignoreWords.includes(cia)) {
                            ciasSet.add(cia);
                            tourosMap.set(touro, cia);
                        } else if (!tourosMap.has(touro)) {
                            tourosMap.set(touro, 'CIA OUTRAS');
                        }
                    }
                }
                return;
            }

            // Filter out standalone numbers and side letters ('E', 'C' at the end)
            const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length >= 2 && p.toUpperCase() !== 'E' && p.toUpperCase() !== 'C');

            let peao = '';
            let touro = '';
            let cia = '';
            let cidade = '';

            // Check if one of the textParts is a City with state suffix (e.g. VILA RICA-MT, GUAIRA-SP, MIGUELOPOLIS-SP)
            const cityIdx = textParts.findIndex(p => /-[A-Z]{2}$/i.test(p.trim()));

            if (cityIdx > 0) {
                peao = textParts.slice(0, cityIdx).join(' ');
                cidade = textParts[cityIdx];
                touro = textParts[cityIdx + 1] || '';
                cia = textParts[cityIdx + 2] || '';
            } else if (textParts.length >= 4) {
                peao = textParts[0];
                cidade = textParts[1];
                touro = textParts[2];
                cia = textParts[3];
            } else if (textParts.length === 3) {
                peao = textParts[0];
                touro = textParts[1];
                cia = textParts[2];
            } else if (textParts.length === 2) {
                peao = textParts[0];
                touro = textParts[1];
            }

            peao = peao.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
            touro = touro.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
            cia = cia.trim().toUpperCase();

            // Ignore if peao is actually a repete / reserve keyword
            if (reserveKeywords.some(kw => peao.includes(kw))) {
                if (touro && touro.length >= 2 && !ignoreWords.includes(touro)) {
                    if (cia && cia.length >= 2 && !ignoreWords.includes(cia)) {
                        ciasSet.add(cia);
                        tourosMap.set(touro, cia);
                    } else if (!tourosMap.has(touro)) {
                        tourosMap.set(touro, 'CIA OUTRAS');
                    }
                }
                return;
            }

            if (peao && peao.length >= 3 && !ignoreWords.includes(peao)) {
                peoesSet.add(peao);
                if (touro && touro.length >= 3 && !ignoreWords.includes(touro)) {
                    if (cia && cia.length >= 2 && !ignoreWords.includes(cia)) {
                        ciasSet.add(cia);
                        tourosMap.set(touro, cia);
                    } else if (!tourosMap.has(touro)) {
                        tourosMap.set(touro, 'CIA OUTRAS');
                    }

                    let score = 0;
                    let tempo = 8.0;
                    let status = 'ativa';

                    if (upper.includes('QUEDA') || upper.includes('ZERO') || upper.includes('0,00') || upper.includes('0.00')) {
                        status = 'queda';
                        score = 0;
                    } else if (upper.includes('RERIDE') || upper.includes('RE-RIDE')) {
                        status = 'reride';
                    } else if (numbers.length > 0) {
                        const validScores = numbers.filter(n => n > 50 && n <= 100);
                        if (validScores.length > 0) {
                            score = validScores[0];
                        }
                    }

                    items.push({
                        peao,
                        cidade,
                        touro,
                        cia: cia || tourosMap.get(touro) || 'CIA OUTRAS',
                        status,
                        tempo,
                        totalPeao: score > 0 ? Math.round(score / 2) : 0,
                        totalTouro: score > 0 ? Math.round(score / 2) : 0,
                        total: score,
                    });
                }
            }
        }
    });

    const detectedTouros = [];
    tourosMap.forEach((cia, nome) => detectedTouros.push({ nome, cia }));

    return {
        rawText,
        items,
        detectedPeoes: Array.from(peoesSet),
        detectedTouros,
        detectedCias: Array.from(ciasSet),
        suggestedDay,
    };
}

async function processAndSaveExtractedData(data) {
    let newPeoes = 0, newTouros = 0, newCias = 0;
    const auth = window.electronAPI.getAuth();
    if (!auth) return { newPeoes, newTouros, newCias };
    
    // We fetch global dat
    const globalData = window.globalData || { peoes: [], animais: [], cias: [] };
    
    // Add Peões
    if (cbPeoes.checked) {
        data.detectedPeoes.forEach(pName => {
            if (!globalData.peoes) globalData.peoes = [];
            const exists = globalData.peoes.some(p => p.nome.toUpperCase() === pName);
            if (!exists) {
                globalData.peoes.push({
                    id: 'peao_' + Date.now() + Math.random(),
                    nome: pName,
                    cidade: '', estado: '', photo_url: '', active: true, score: 0, money: 0, finals: 0, events: 0
                });
                newPeoes++;
            }
        });
    }

    // Add CIAs
    if (cbCias.checked) {
        data.detectedCias.forEach(cName => {
            if (!globalData.cias) globalData.cias = [];
            const exists = globalData.cias.some(c => c.nome.toUpperCase() === cName);
            if (!exists) {
                globalData.cias.push({
                    id: 'cia_' + Date.now() + Math.random(),
                    nome: cName,
                    dono: '',
                    media_atual: 0,
                    active: true
                });
                newCias++;
            }
        });
    }

    // Add Touros
    if (cbTouros.checked) {
        data.detectedTouros.forEach(touro => {
            if (!globalData.animais) globalData.animais = [];
            const exists = globalData.animais.some(a => a.nome.toUpperCase() === touro.nome && a.cia.toUpperCase() === touro.cia);
            if (!exists) {
                globalData.animais.push({
                    id: 'touro_' + Date.now() + Math.random(),
                    nome: touro.nome,
                    cia: touro.cia,
                    media_atual: 0,
                    active: true,
                    peso: 0,
                    tipo: 'touro'
                });
                newTouros++;
            }
        });
    }

    if (newPeoes > 0 || newTouros > 0 || newCias > 0) {
        // Save globally
        window.globalData = globalData;
        
        // Electron has a method to save global data? Wait, we can save via local storage or existing sync mechanisms.
        // For now modifying window.globalData works for the current session.
        // Let's call the renderer's reload functions to sync if they exist.
        if (window.renderPeoesList) window.renderPeoesList();
        if (window.renderBoiadasList) window.renderBoiadasList();
    }

    return { newPeoes, newTouros, newCias };
}
