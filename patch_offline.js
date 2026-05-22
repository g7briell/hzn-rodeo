const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'client_app', 'renderer.js');
let code = fs.readFileSync(file, 'utf8');

const target = `        if (r.total <= 0) {
            daysBadge.innerText = 'LICENÇA EXPIRADA';
            daysBadge.style.color = '#ef4444';
        } else if (r.days === 0) {`;

const replacement = `        if (r.total <= 0) {
            daysBadge.innerText = 'LICENÇA EXPIRADA';
            daysBadge.style.color = '#ef4444';
            
            alert('O tempo da sua licença acabou! O sistema será bloqueado de forma automática.');
            window.electronAPI.clearAuth();
            showLogin();
            return;
        } else if (r.days === 0) {`;

code = code.replace(target, replacement);

fs.writeFileSync(file, code);
console.log('Offline check patched successfully!');
