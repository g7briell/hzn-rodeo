const fs = require('fs');
let content = fs.readFileSync('client_app/renderer.js', 'utf8');

// Normalize CRLF to LF for consistent replacement
content = content.replace(/\r\n/g, '\n');

// 1. Update variables list (top of renderer.js)
const varTarget = 'let modalEvento, formEvento, eventControlView, supportBtn, sportSelectScreen;';
const varReplacement = 'let modalEvento, formEvento, eventControlView, supportBtn, sportSelectScreen, transmissaoScreen;';

if (content.includes(varTarget)) {
    content = content.replace(varTarget, varReplacement);
} else {
    console.error("Variable definition target not found!");
}

// 2. Initialize transmissaoScreen inside DOMContentLoaded
const initTarget = 'sportSelectScreen = document.getElementById(\'sport-select-screen\');';
const initReplacement = 'sportSelectScreen = document.getElementById(\'sport-select-screen\');\n    transmissaoScreen = document.getElementById(\'transmissao-screen\');';

if (content.includes(initTarget)) {
    content = content.replace(initTarget, initReplacement);
} else {
    console.error("Initialization target not found!");
}

// 3. Update updateConnectionStatus to update both indicators
const statusTarget = `function updateConnectionStatus(status) {
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
}`;

const statusReplacement = `function updateConnectionStatus(status) {
    const dots = [document.getElementById('db-status-dot'), document.getElementById('transmissao-db-status-dot')];
    const texts = [document.getElementById('db-status-text'), document.getElementById('transmissao-db-status-text')];
    
    dots.forEach((dot, idx) => {
        const text = texts[idx];
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
    });
}`;

if (content.includes(statusTarget)) {
    content = content.replace(statusTarget, statusReplacement);
} else {
    console.error("updateConnectionStatus target not found!");
}

// 4. Update selectSport function
const selectSportTarget = `window.selectSport = async (sport) => {
    if (!userSports.includes(sport)) {
        alert('Você não tem acesso a esta modalidade.');
        return;
    }
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    try {
        await window.electronAPI.setCurrentSport(sport);
        currentSport = sport;
        
        // Atualiza o badge do esporte no header
        const badge = document.getElementById('sport-active-badge');
        if (badge) {
            badge.innerText = sport === '3tambores' ? '3 Tambores' : 'Rodeio';
        }

        if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
        const auth = window.electronAPI.getAuth();
        showHome(auth ? auth.expiry : null, auth ? auth.nome : '');
    } catch(e) {
        console.error(e);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
};`;

const selectSportReplacement = `window.selectSport = async (sport) => {
    if (sport !== 'transmissao' && !userSports.includes(sport)) {
        alert('Você não tem acesso a esta modalidade.');
        return;
    }
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    try {
        await window.electronAPI.setCurrentSport(sport);
        currentSport = sport;
        
        if (sport === 'transmissao') {
            if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
            if (transmissaoScreen) transmissaoScreen.classList.remove('hidden');
        } else {
            // Atualiza o badge do esporte no header
            const badge = document.getElementById('sport-active-badge');
            if (badge) {
                badge.innerText = sport === '3tambores' ? '3 Tambores' : 'Rodeio';
            }

            if (sportSelectScreen) sportSelectScreen.classList.add('hidden');
            const auth = window.electronAPI.getAuth();
            showHome(auth ? auth.expiry : null, auth ? auth.nome : '');
        }
    } catch(e) {
        console.error(e);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
};`;

if (content.includes(selectSportTarget)) {
    content = content.replace(selectSportTarget, selectSportReplacement);
} else {
    console.error("selectSport target not found!");
}

// 5. Update backToSports function
const backTarget = `window.backToSports = () => {
    if (homeScreen) homeScreen.classList.add('hidden');
    if (eventControlView) eventControlView.classList.add('hidden');
    const contentView = document.getElementById('content-view');
    if (contentView) contentView.classList.add('hidden');
    showSportSelection();
};`;

const backReplacement = `window.backToSports = () => {
    if (homeScreen) homeScreen.classList.add('hidden');
    if (transmissaoScreen) transmissaoScreen.classList.add('hidden');
    if (eventControlView) eventControlView.classList.add('hidden');
    const contentView = document.getElementById('content-view');
    if (contentView) contentView.classList.add('hidden');
    showSportSelection();
};`;

if (content.includes(backTarget)) {
    content = content.replace(backTarget, backReplacement);
} else {
    console.error("backToSports target not found!");
}

// Save back file
fs.writeFileSync('client_app/renderer.js', content, 'utf8');
console.log("Success! Updated renderer.js with all transmission navigation changes.");
