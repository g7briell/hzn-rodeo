const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'client_app', 'renderer.js');
let code = fs.readFileSync(file, 'utf8');

// 1. Fix doHeartbeat
code = code.replace(
  "if (res.data && res.data.data_ativacao && res.data.dias_validos) {",
  "if (res.data && res.data.data_ativacao && typeof res.data.dias_validos !== 'undefined') {"
);

const heartbeatTarget = `const newExp = new Date(res.data.data_ativacao);
                  newExp.setDate(newExp.getDate() + res.data.dias_validos);
                  const newExpISO = newExp.toISOString();`;

const heartbeatReplacement = `const newExp = new Date(res.data.data_ativacao);
                  newExp.setDate(newExp.getDate() + res.data.dias_validos);
                  if (newExp <= new Date()) {
                      alert('Sua licença expirou! O sistema será bloqueado.');
                      window.electronAPI.clearAuth();
                      showLogin();
                      return;
                  }
                  const newExpISO = newExp.toISOString();`;

code = code.replace(heartbeatTarget, heartbeatReplacement);


// 2. Fix Realtime update
const realtimeTarget = `const exp = new Date(updatedLicense.data_ativacao);
                exp.setDate(exp.getDate() + updatedLicense.dias_validos);
                const newExpiryISO = exp.toISOString();`;

const realtimeReplacement = `const exp = new Date(updatedLicense.data_ativacao);
                exp.setDate(exp.getDate() + updatedLicense.dias_validos);
                if (exp <= new Date()) {
                    alert('Sua licença expirou! O sistema será bloqueado.');
                    window.electronAPI.clearAuth();
                    showLogin();
                    return;
                }
                const newExpiryISO = exp.toISOString();`;

code = code.replace(realtimeTarget, realtimeReplacement);

fs.writeFileSync(file, code);
console.log('renderer.js patched successfully!');
