const fs = require('fs');

const code = `
// --- CLOUD BOIADAS IMPORT SYSTEM ---
window.openCloudBoiadas = async () => {
    const modal = document.getElementById('modal-cloud-boiadas');
    if (modal) modal.classList.remove('hidden');
    
    const list = document.getElementById('cloud-boiadas-list');
    if (list) list.innerHTML = '<div class="text-white/30 text-center py-10 font-black uppercase tracking-widest text-xs">Conectando ao Servidor Oficial...</div>';
    
    try {
        const url = 'https://scivakieachwewdhnuhv.supabase.co/rest/v1/boiadas_oficiais?select=*&order=nome';
        const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk';
        
        const response = await fetch(url, {
            headers: {
                'apikey': apiKey,
                'Authorization': \`Bearer \${apiKey}\`
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
                btn.innerHTML = \`
                    <div>
                        <div class="font-black uppercase text-white mb-1 text-lg group-hover:text-indigo-400">\${b.nome}</div>
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">\${total} TOUROS</div>
                    </div>
                    <div class="bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                        IMPORTAR CIA
                    </div>
                \`;
                btn.onclick = () => importCloudBoiada(b);
                list.appendChild(btn);
            });
        }
        
    } catch(err) {
        if (list) list.innerHTML = \`<div class="text-red-500/50 text-center py-10 font-black uppercase tracking-widest text-xs">\${err.message}</div>\`;
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
    await window.electronAPI.updateLocalEvent(email, currentEvent);
    
    document.getElementById('modal-cloud-boiadas').classList.add('hidden');
    document.getElementById('modal-boiada').classList.add('hidden');
    openListBoiadas();
    
    alert(\`Boiada Oficial "\${nome}" baixada com sucesso!\\n\${touros.length} touros importados pro seu evento.\`);
};
`;

const file = 'client_app/renderer.js';
fs.appendFileSync(file, '\\n' + code);
console.log('Appended code');
