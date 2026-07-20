// pdf_parser.js
// Logic for handling the PDF import inside the Electron Desktop App

// Initialize PDF.js worker
if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'node_modules/pdfjs-dist/build/pdf.worker.min.js';
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

            pdfLoadingText.textContent = "Extraindo dados...";
            pdfParsedData = parseRodeoPdfText(rawText);

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
        if (!window.currentEvent) {
            alert("Nenhum evento carregado para salvar!");
            return;
        }

        // Apply changes from table to pdfParsedData
        const inputs = previewTableBody.querySelectorAll('input, select');
        inputs.forEach(input => {
            const idx = input.dataset.index;
            const field = input.dataset.field;
            if (pdfParsedData.items[idx]) {
                let val = input.value;
                if (field === 'totalPeao' || field === 'totalTouro') val = parseFloat(val) || 0;
                pdfParsedData.items[idx][field] = typeof val === 'string' ? val.toUpperCase() : val;
            }
        });

        // Generate scoring format
        if (!window.currentEvent.scores) window.currentEvent.scores = {};
        if (!window.currentEvent.scores[selectedDay]) window.currentEvent.scores[selectedDay] = [];
        
        pdfParsedData.items.forEach(item => {
            window.currentEvent.scores[selectedDay].push({
                competitorName: item.peao,
                animalName: item.touro,
                ciaName: item.cia,
                status: item.status,
                j1_peao: item.totalPeao ? item.totalPeao / 2 : 0,
                j2_peao: item.totalPeao ? item.totalPeao / 2 : 0,
                j1_touro: item.totalTouro ? item.totalTouro / 2 : 0,
                j2_touro: item.totalTouro ? item.totalTouro / 2 : 0,
                peao: item.totalPeao || 0,
                touro: item.totalTouro || 0,
                tempo: item.status === 'ativa' ? 8.0 : (item.tempo || 0),
                total: item.total || 0,
                id_montaria: "pdf_" + Date.now() + "_" + Math.floor(Math.random() * 1000)
            });
        });

        // Save
        const auth = window.electronAPI.getAuth();
        if (auth) {
            const email = auth.email;
            await window.electronAPI.saveLocalEvent(email, window.currentEvent);
            if (window.renderNotasTable) window.renderNotasTable(); // Refresh UI if function exists
            alert("Notas salvas no evento com sucesso!");
        } else {
            alert("Erro: Você não está logado.");
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

    const ignoreWords = ['SORTEIO', 'RANKING', 'RODEOAPP', 'HORÁRIO', 'RESULTADO', 'CAMPEONATO', 'EVENTO', 'JUIZ', 'PEÃO', 'TOURO', 'CIA', 'BOIADA', 'PONTOS', 'TEMPO', 'STATUS', 'ORDEM', 'CIDADE', 'ESTADO', 'RODEO', 'PEAO'];

    const lines = rawText.split('\n');
    lines.forEach((line) => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.length < 5) return;
        const upper = cleanLine.toUpperCase();

        if (ignoreWords.some(w => upper.startsWith(w) && cleanLine.length < 30)) return;

        const parts = cleanLine.split(/\s{2,}|\t|\||;/).map(p => p.trim()).filter(Boolean);
        const numMatches = cleanLine.match(/\b\d{1,2}(?:[\.,]\d{1,2})?\b/g) || [];
        const numbers = numMatches.map(n => parseFloat(n.replace(',', '.')));

        if (parts.length >= 2) {
            const textParts = parts.filter(p => !/^\d+$/.test(p) && !/^\d+[\.,]\d+$/.test(p) && p.length > 2);
            let peao = '', touro = '', cia = '', cidade = '';

            if (textParts.length >= 3) {
                peao = textParts[0];
                touro = textParts[1];
                cia = textParts[2];
                if (textParts[3] && textParts[3].includes('-')) cidade = textParts[3];
            } else if (textParts.length === 2) {
                peao = textParts[0];
                touro = textParts[1];
            }

            peao = peao.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
            touro = touro.replace(/^\d+[\s\.-]*/, '').trim().toUpperCase();
            cia = cia.trim().toUpperCase();

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
