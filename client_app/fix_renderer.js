const fs = require('fs');
let content = fs.readFileSync('c:/Users/Admin/OneDrive/Área de Trabalho/RODEOAPP/HZN_System/client_app/renderer.js', 'utf8');

// The file might have invalid characters from PowerShell's Add-Content at the end.
// We'll try to find the start of our broken function or just remove it if we can.
const startIdx = content.lastIndexOf('window.sendEventToPortal = async (id) => {');
if (startIdx !== -1) {
    content = content.substring(0, startIdx);
} else {
    // If not found due to encoding, let's just strip the last 1500 chars and try to find the last known good function
    const goodIdx = content.lastIndexOf('window.deleteGlobalBoiada = async (idx) => {');
    if (goodIdx !== -1) {
        // find the end of deleteGlobalBoiada which is };
        const endOfGoodIdx = content.indexOf('};', goodIdx) + 2;
        content = content.substring(0, endOfGoodIdx);
    }
}

const func = `\n\nwindow.sendEventToPortal = async (id) => {
    if (!confirm('Deseja enviar os dados deste evento (incluindo o ranking atual) para o Portal Oficial na nuvem? Ele ficará aguardando aprovação no painel.')) return;
    
    const email = getCurrentUserEmail();
    const btnText = document.querySelector(\`button[onclick*="sendEventToPortal('\${id}')"]\`);
    if (btnText) btnText.innerHTML = \`<span class="animate-pulse">Enviando...</span>\`;

    try {
        const res = await window.electronAPI.sendEventToPortal({ email, eventId: id });
        if (res.success) {
            alert('Evento enviado com sucesso! Agora é só aprovar no Painel Admin.');
        } else {
            alert('Erro ao enviar evento: ' + (res.error || 'Desconhecido'));
        }
    } catch (e) {
        alert('Erro ao conectar com a nuvem.');
        console.error(e);
    } finally {
        renderEvents();
    }
};\n`;

fs.writeFileSync('c:/Users/Admin/OneDrive/Área de Trabalho/RODEOAPP/HZN_System/client_app/renderer.js', content + func, 'utf8');
console.log('Fixed renderer.js successfully.');
