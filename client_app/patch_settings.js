
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

document.getElementById('search-global-peoes').addEventListener('input', renderGlobalPeoes);

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

document.getElementById('search-global-boiadas').addEventListener('input', renderGlobalBoiadas);

window.editGlobalBoiada = (idx) => {
    const b = globalBoiadas[idx];
    document.getElementById('global-boiada-idx').value = idx;
    document.getElementById('global-boiada-cia').value = b.nome;
    document.getElementById('global-touros-bulk').value = (b.touros || []).join('\n');
    document.getElementById('modal-global-boiada').classList.remove('hidden');
};

window.closeModalGlobalBoiada = () => {
    document.getElementById('modal-global-boiada').classList.add('hidden');
};

document.getElementById('form-global-boiada').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('global-boiada-idx').value);
    const existing = globalBoiadas[idx];
    const nome = document.getElementById('global-boiada-cia').value.toUpperCase().trim();
    
    const allTouros = document.getElementById('global-touros-bulk').value.split('\n')
        .map(t => t.trim().toUpperCase())
        .filter(t => t !== '');
        
    const newLados = {};
    allTouros.forEach(t => {
        newLados[t] = (existing.lados && existing.lados[t]) ? existing.lados[t] : '';
    });
    
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
