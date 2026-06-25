const fs = require('fs');
let content = fs.readFileSync('client_app/renderer.js', 'utf8');

// 1. Target block for fetchGlobalData and helpers
const fetchGlobalDataTarget = `async function fetchGlobalData() {
    const email = getCurrentUserEmail();
    if (!email) return;
    try {
        const data = await window.electronAPI.getGlobalData(email);
        globalPeoes = data.peoes || [];
        globalBoiadas = data.boiadas || [];
    } catch (e) {
        console.error('Failed to fetch global data:', e);
    }
}`;

const fetchGlobalDataReplacement = `function updateConnectionStatus(status) {
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    if (!dot || !text) return;
    
    dot.className = "w-2 h-2 rounded-full animate-pulse";
    text.className = "text-[9px] font-black uppercase tracking-[0.3em]";
    
    if (status === 'connected') {
        dot.classList.add('bg-emerald-500', 'shadow-[0_0_10px_rgba(16,185,129,0.5)]');
        text.classList.add('text-emerald-500');
        text.innerText = "BANCO ONLINE";
    } else if (status === 'connecting') {
        dot.classList.add('bg-yellow-500', 'shadow-[0_0_10px_rgba(234,179,8,0.5)]');
        text.classList.add('text-yellow-500');
        text.innerText = "CONECTANDO BANCO";
    } else {
        dot.classList.add('bg-red-500', 'shadow-[0_0_10px_rgba(239,68,68,0.5)]');
        text.classList.add('text-red-500');
        text.innerText = "BANCO OFFLINE";
    }
}

async function verifyConnection() {
    updateConnectionStatus('connecting');
    if (!navigator.onLine) {
        updateConnectionStatus('offline');
        return false;
    }
    const connected = await window.electronAPI.checkDbConnection();
    if (connected) {
        updateConnectionStatus('connected');
        return true;
    } else {
        updateConnectionStatus('offline');
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

async function fetchGlobalData() {
    const email = getCurrentUserEmail();
    if (!email) return;
    try {
        const data = await window.electronAPI.getGlobalData(email);
        globalPeoes = data.peoes || [];
        globalBoiadas = data.boiadas || [];
        
        // Se estiver online, buscar competidores do portal e fazer merge/deduplicação
        if (navigator.onLine) {
            try {
                const res = await window.electronAPI.getOnlineCompetitors();
                if (res && res.success && res.competitors) {
                    const mergedPeoes = [...globalPeoes];
                    res.competitors.forEach(op => {
                        const opName = (op.nome || '').trim().toUpperCase();
                        const opCpf = (op.cpf || '').replace(/\\D/g, '');
                        const opCity = parseCityFromAddress(op.endereco);
                        
                        if (!opName) return;
                        
                        const exists = mergedPeoes.some(gp => {
                            const gpName = (gp.nome || '').trim().toUpperCase();
                            const gpCpf = (gp.cpf || '').replace(/\\D/g, '');
                            if (opCpf && gpCpf) {
                                return opCpf === gpCpf;
                            }
                            return gpName === opName;
                        });
                        
                        if (!exists) {
                            mergedPeoes.push({
                                nome: opName,
                                cidade: opCity,
                                cpf: op.cpf || '',
                                score: 0
                            });
                        }
                    });
                    globalPeoes = mergedPeoes;
                }
            } catch (err) {
                console.error("Erro ao fundir dados online:", err);
            }
        }
    } catch (e) {
        console.error('Failed to fetch global data:', e);
    }
}`;

// 2. Target block for init function
const initTarget = `async function init() {
    console.log("RODEOAPP: Iniciando sistema...");`;

const initReplacement = `async function init() {
    // Inicializar verificação de conexão
    verifyConnection();
    window.addEventListener('online', verifyConnection);
    window.addEventListener('offline', () => updateConnectionStatus('offline'));
    setInterval(verifyConnection, 30000);

    console.log("RODEOAPP: Iniciando sistema...");`;

// Perform replacements handling both CRLF and LF
let replacedCount = 0;

function normalize(str) {
    return str.replace(/\r\n/g, '\n').trim();
}

// Normalize main content to search accurately
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedFetchTarget = normalize(fetchGlobalDataTarget);
const normalizedInitTarget = normalize(initTarget);

if (normalizedContent.includes(normalizedFetchTarget)) {
    // Replaces using regex/string directly
    const index = normalizedContent.indexOf(normalizedFetchTarget);
    content = content.replace(/\r\n/g, '\n');
    content = content.substring(0, index) + fetchGlobalDataReplacement + content.substring(index + normalizedFetchTarget.length);
    replacedCount++;
}

const updatedNormalizedContent = content.replace(/\r\n/g, '\n');
if (updatedNormalizedContent.includes(normalizedInitTarget)) {
    const index = updatedNormalizedContent.indexOf(normalizedInitTarget);
    content = content.replace(/\r\n/g, '\n');
    content = content.substring(0, index) + initReplacement + content.substring(index + normalizedInitTarget.length);
    replacedCount++;
}

if (replacedCount === 2) {
    fs.writeFileSync('client_app/renderer.js', content, 'utf8');
    console.log("SUCCESS! Both fetchGlobalData and init updated successfully in renderer.js");
} else {
    console.log("ERROR! ReplacedCount was: " + replacedCount);
}
