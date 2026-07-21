process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const { machineIdSync } = require('node-machine-id');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

// Esporte ativo da sessão atual
let currentSportSession = 'rodeio';

// Função para gerar o caminho do banco baseado no e-mail e esporte
function getUserDBPath(email, esporte = currentSportSession) {
  const safeSport = (esporte || 'rodeio').toLowerCase().trim();
  if (!email) return path.join(app.getPath('userData'), `hzn_${safeSport}_default_data.json`);
  const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
  
  // Para retrocompatibilidade com o banco de rodeio existente, mantém o arquivo original
  if (safeSport === 'rodeio') {
    return path.join(app.getPath('userData'), `hzn_data_${hash}.json`);
  }
  return path.join(app.getPath('userData'), `hzn_data_${safeSport}_${hash}.json`);
}

function getLocalData(email, esporte = currentSportSession) {
  const dbPath = getUserDBPath(email, esporte);
  if (!fs.existsSync(dbPath)) return { eventos: [] };
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { eventos: [] };
  }
}

function saveLocalData(email, data, esporte = currentSportSession) {
  const dbPath = getUserDBPath(email, esporte);
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Credenciais Supabase
const SUPABASE_URL = 'https://api.rodeoapp.pro';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

let currentActiveEmail = null;
let mainWindow = null;

// Escutar mudanças na tabela licencas via Supabase Realtime
supabase
  .channel('realtime-licencas')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'licencas' },
    (payload) => {
      console.log('RODEOAPP Realtime: Atualização detectada na tabela licencas:', payload.new);
      if (mainWindow) {
        mainWindow.webContents.send('license-realtime-update', payload.new);
      }
    }
  )
  .subscribe((status) => {
    console.log('RODEOAPP Realtime: Status da assinatura:', status);
  });

  // Canal 1: Atualizações de Licença
  supabase
    .channel('rodeo-realtime-channel')
    .on(
      'broadcast',
      { event: 'license-updated' },
      (payload) => {
        if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: Broadcast recebido no main.js! Evento: license-updated' });
        console.log('RODEOAPP Realtime Broadcast: Sinal recebido:', payload.payload);
        if (mainWindow) {
          mainWindow.webContents.send('license-broadcast-signal', payload.payload);
        }
      }
    )
    .subscribe((status) => {
      console.log('RODEOAPP Realtime Broadcast (License): Status da assinatura:', status);
    });

  // Canal 2: Forçar Atualização Remota
  supabase
    .channel('rodeo-force-update-channel')
    .on(
      'broadcast',
      { event: 'force-update' },
      (payload) => {
        if (mainWindow) {
          mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: Broadcast recebido no main.js! Evento: force-update' });
        }
        
        if (payload.payload && payload.payload.email === currentActiveEmail) {
          if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: E-mail bateu! Chamando checkForUpdates...' });
          if (process.platform === 'darwin') {
              checkMacUpdates().then(res => {
                  if (res.available) {
                      if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-available', info: res.info });
                  } else {
                      if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-not-available', info: { version: app.getVersion() } });
                  }
              }).catch(err => {
                  if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'error', message: 'macOS check updates error: ' + err.message });
              });
          } else {
              try {
                  autoUpdater.checkForUpdates().then(res => {
                      if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: checkForUpdates resolved: ' + (res ? 'Success' : 'Null') });
                  }).catch(err => {
                      if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: checkForUpdates REJECTED: ' + err.message + ' ' + err.stack });
                  });
              } catch (e) {
                  if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: checkForUpdates SYNC ERROR: ' + e.message });
              }
          }
        } else {
          if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: E-mail não bateu. Ignorando.' });
        }
      }
    )
    .subscribe((status) => {
      console.log('RODEOAPP Realtime Broadcast (Updater): Status da assinatura:', status);
    });

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets/app_icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow = win;

  win.maximize();
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register('CommandOrControl+R', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.reload();
  });
  globalShortcut.register('F5', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.reload();
  });
  globalShortcut.register('F12', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.toggleDevTools();
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.toggleDevTools();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
const authFilePath = path.join(app.getPath('userData'), 'auth.json');

ipcMain.handle('save-auth', (event, data) => {
  try {
    fs.writeFileSync(authFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    console.error("Erro ao salvar auth.json:", e);
    return { success: false, error: e.message };
  }
});

ipcMain.on('get-auth-sync', (event) => {
  try {
    if (fs.existsSync(authFilePath)) {
      const content = fs.readFileSync(authFilePath, 'utf-8');
      event.returnValue = JSON.parse(content);
      return;
    }
  } catch (e) {
    console.error("Erro ao ler auth.json sync:", e);
  }
  event.returnValue = null;
});

ipcMain.handle('clear-auth', () => {
  try {
    if (fs.existsSync(authFilePath)) {
      fs.unlinkSync(authFilePath);
    }
  } catch (e) {
    console.error("Erro ao remover auth.json:", e);
  }
  return { success: true };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-hwid', () => {
  return machineIdSync();
});

ipcMain.handle('validate-license', async (event, { email, key, hwid, appVersion }) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = key.trim().toUpperCase();

    let { data, error } = await supabase
      .from('licencas')
      .select('*')
      .ilike('email', cleanEmail)
      .eq('key_code', cleanKey)
      .maybeSingle();

    if (error) {
      console.error("Supabase query error:", error);
      const errMsg = error.message ? error.message.toLowerCase() : '';
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connection') || errMsg.includes('timeout') || errMsg.includes('enotfound') || errMsg.includes('load failed')) {
        return { success: false, isNetworkError: true, message: 'Erro de conexão com o servidor. Verifique sua internet.' };
      }
      return { success: false, isNetworkError: true, message: 'Erro de conexão com o servidor.' };
    }

    if (!data) return { success: false, message: 'E-mail ou Chave inválidos.' };
    if (!data.is_active) return { success: false, message: 'Esta licença foi desativada.' };
    if (data.is_used && data.hwid !== hwid) return { success: false, message: 'Chave vinculada a outro PC.' };
    
    if (data.data_ativacao) {
      const expiry = new Date(data.data_ativacao);
      expiry.setDate(expiry.getDate() + data.dias_validos);
      if (expiry.getTime() < new Date().getTime()) {
        return { success: false, message: 'Plano expirado. Renove sua licença.' };
      }
    }

    if (!data.is_used) {
      const updatePayload = { 
        is_used: true, 
        hwid: hwid, 
        data_ativacao: new Date().toISOString() 
      };
      if (appVersion) updatePayload.app_version = appVersion;
      await supabase.from('licencas').update(updatePayload).eq('id', data.id);
    } else if (appVersion) {
      await supabase.from('licencas').update({ app_version: appVersion }).eq('id', data.id);
    }
    
    currentActiveEmail = cleanEmail;
    
    // Refresh data if we just activated
    if (!data.is_used) {
      const { data: updatedData } = await supabase.from('licencas').select('*').eq('id', data.id).single();
      if (updatedData) data = updatedData;
    }

    return { 
      success: true, 
      data: data
    };
  } catch (err) {
    console.error("Validate License Error:", err);
    return { success: false, isNetworkError: true, message: 'Erro interno: ' + err.message };
  }
});

ipcMain.handle('heartbeat', async (event, { email, key, appVersion }) => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = key.trim().toUpperCase();
    currentActiveEmail = cleanEmail;

    const updatePayload = { last_seen: new Date().toISOString() };
    if (appVersion) updatePayload.app_version = appVersion;

    const { data, error } = await supabase.from('licencas')
      .update(updatePayload)
      .ilike('email', cleanEmail)
      .eq('key_code', cleanKey)
      .select('is_active, dias_validos, data_ativacao, esportes')
      .maybeSingle();

    if (error) {
      console.error("Heartbeat error:", error);
      const errMsg = error.message ? error.message.toLowerCase() : '';
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connection') || errMsg.includes('timeout') || errMsg.includes('enotfound') || errMsg.includes('load failed')) {
        return { valid: true, isNetworkError: true };
      }
      return { valid: false, reason: 'deleted' };
    }

    if (!data) return { valid: false, reason: 'deleted' };
    if (!data.is_active) return { valid: false, reason: 'disabled' };
    return { valid: true, data: data };
  } catch (err) {
    return { valid: true };
  }
});

// Handler para definir o esporte ativo da janela/sessão do Electron
ipcMain.handle('set-current-sport', (event, sport) => {
  currentSportSession = (sport || 'rodeio').toLowerCase().trim();
  console.log('RODEOAPP: Esporte da sessão alterado para:', currentSportSession);
  return { success: true };
});

// Banco Local com Isolamento por E-mail (esporte implícito via currentSportSession)
ipcMain.handle('get-local-events', (event, email) => {
  return getLocalData(email).eventos;
});

ipcMain.handle('save-local-event', (event, { email, newEvent }) => {
  const data = getLocalData(email);
  const eventToSave = {
    ...newEvent,
    id: Date.now().toString(),
    created_at: new Date().toISOString()
  };
  data.eventos.push(eventToSave);
  saveLocalData(email, data);
  return { success: true, event: eventToSave };
});

ipcMain.handle('update-local-event', (event, { email, updatedEvent }) => {
  const data = getLocalData(email);
  const index = data.eventos.findIndex(e => e.id === updatedEvent.id);
  if (index !== -1) {
    data.eventos[index] = { ...data.eventos[index], ...updatedEvent };
    saveLocalData(email, data);
    return { success: true };
  }
  return { success: false };
});

  ipcMain.handle('delete-local-event', (event, { email, id }) => {
    const data = getLocalData(email);
    const index = data.eventos.findIndex(e => e.id === id);
    if (index !== -1) {
      data.eventos.splice(index, 1);
      saveLocalData(email, data);
      return { success: true };
    }
    return { success: false };
  });

  // Global Internal Database
  ipcMain.handle('get-global-data', (event, email) => {
    const data = getLocalData(email);
    
    if (!data.globalPeoes) data.globalPeoes = [];
    if (!data.globalBoiadas) data.globalBoiadas = [];
    
    let modified = false;
    
    if (data.eventos) {
        data.eventos.forEach(ev => {
            if (ev.peoes) {
                ev.peoes.forEach(p => {
                    const idx = data.globalPeoes.findIndex(gp => gp.nome === p.nome || (p.cpf && gp.cpf === p.cpf));
                    if (idx === -1) {
                        data.globalPeoes.push(p);
                        modified = true;
                    }
                });
            }
            if (ev.boiadas) {
                ev.boiadas.forEach(b => {
                    const idx = data.globalBoiadas.findIndex(gb => gb.nome === b.nome);
                    if (idx === -1) {
                        data.globalBoiadas.push(b);
                        modified = true;
                    } else {
                        if (b.touros) {
                            const current = data.globalBoiadas[idx].touros || [];
                            const newTouros = [...new Set([...current, ...b.touros])];
                            if (current.length !== newTouros.length) {
                                data.globalBoiadas[idx].touros = newTouros;
                                modified = true;
                            }
                        }
                    }
                });
            }
        });
    }
    
    if (modified) {
        saveLocalData(email, data);
    }

    return {
      peoes: data.globalPeoes,
      boiadas: data.globalBoiadas
    };
  });

  ipcMain.handle('save-global-peao', (event, { email, peao }) => {
    const data = getLocalData(email);
    data.globalPeoes = data.globalPeoes || [];
    const index = data.globalPeoes.findIndex(p => p.nome === peao.nome || (peao.cpf && p.cpf === peao.cpf));
    if (index >= 0) {
      data.globalPeoes[index] = { ...data.globalPeoes[index], ...peao };
    } else {
      data.globalPeoes.push(peao);
    }
    saveLocalData(email, data);
    return true;
  });

  ipcMain.handle('save-global-boiada', (event, { email, boiada }) => {
    const data = getLocalData(email);
    data.globalBoiadas = data.globalBoiadas || [];
    const index = data.globalBoiadas.findIndex(b => b.nome === boiada.nome);
    if (index >= 0) {
      data.globalBoiadas[index] = { ...data.globalBoiadas[index], ...boiada };
      if (boiada.touros) {
        const currentTouros = data.globalBoiadas[index].touros || [];
        data.globalBoiadas[index].touros = [...new Set([...currentTouros, ...boiada.touros])];
      }
    } else {
      data.globalBoiadas.push(boiada);
    }
    saveLocalData(email, data);
    return true;
  });

  ipcMain.handle('update-profile-name', async (event, { email, newName }) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from('licencas')
        .update({ nome: newName })
        .eq('email', cleanEmail)
        .select()
        .single();
      
      if (error) return { success: false, message: error.message };
      return { success: true, data };
    } catch (err) {
      console.error("Update profile error:", err);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('update-global-peao', (event, { email, index, peao }) => {
    const data = getLocalData(email);
    if (data.globalPeoes && data.globalPeoes[index]) {
      data.globalPeoes[index] = { ...data.globalPeoes[index], ...peao };
      saveLocalData(email, data);
      return true;
    }
    return false;
  });

  ipcMain.handle('delete-global-peao', (event, { email, index }) => {
    const data = getLocalData(email);
    if (data.globalPeoes && data.globalPeoes[index]) {
      data.globalPeoes.splice(index, 1);
      saveLocalData(email, data);
      return true;
    }
    return false;
  });

  ipcMain.handle('update-global-boiada', (event, { email, index, boiada }) => {
    const data = getLocalData(email);
    if (data.globalBoiadas && data.globalBoiadas[index]) {
      data.globalBoiadas[index] = { ...data.globalBoiadas[index], ...boiada };
      saveLocalData(email, data);
      return true;
    }
    return false;
  });

  ipcMain.handle('delete-global-boiada', (event, { email, index }) => {
    const data = getLocalData(email);
    if (data.globalBoiadas && data.globalBoiadas[index]) {
      data.globalBoiadas.splice(index, 1);
      saveLocalData(email, data);
      return true;
    }
    return false;
  });

ipcMain.handle('get-app-logo', () => {
  try {
    const logoPath = path.join(__dirname, 'assets', 'header_logo.png');
    const image = fs.readFileSync(logoPath);
    return `data:image/png;base64,${image.toString('base64')}`;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('get-pdf-logo', () => {
  try {
    const logoPath = path.join(__dirname, 'assets', 'rodeoapplogo_branca.png');
    const image = fs.readFileSync(logoPath);
    return `data:image/png;base64,${image.toString('base64')}`;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('export-sorteio-excel', async (event, { sorteioData }) => {
    try {
        const templatePath = path.join(__dirname, 'molde_sorteio.xlsx');
        if (!fs.existsSync(templatePath)) {
            return { success: false, message: 'O arquivo molde_sorteio.xlsx não foi encontrado na pasta do sistema.' };
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];

        const getRowTemplate = (rowNum) => {
            const rowData = [];
            const row = ws.getRow(rowNum);
            const height = row.height;
            for(let i=1; i<=7; i++) {
                const cell = row.getCell(i);
                rowData[i] = {
                    value: cell.value,
                    font: cell.font,
                    alignment: cell.alignment,
                    border: cell.border,
                    fill: cell.fill,
                    numFmt: cell.numFmt
                };
            }
            return { height, cells: rowData };
        };

        const compTpl = getRowTemplate(3);
        const resHeaderTpl = getRowTemplate(4);
        const resDataTpl = getRowTemplate(5);
        const footerTpl = getRowTemplate(6);

        const mergesToRemove = [];
        for (const merge of Object.values(ws._merges)) {
            if (merge.top >= 3) mergesToRemove.push(merge.model);
        }
        mergesToRemove.forEach(m => ws.unMergeCells(m.top, m.left, m.bottom, m.right));

        // Limpa as linhas originais do template para que não fiquem aparecendo restos no final do documento
        ws.spliceRows(3, 10);

        let currentRow = 3;

        const applyTemplate = (rowNum, tpl, dataOverrides) => {
            const row = ws.getRow(rowNum);
            if (tpl.height) row.height = tpl.height;
            for(let i=1; i<=7; i++) {
                const cell = row.getCell(i);
                if (tpl.cells[i]) {
                    if (tpl.cells[i].font) cell.font = tpl.cells[i].font;
                    if (tpl.cells[i].alignment) cell.alignment = tpl.cells[i].alignment;
                    if (tpl.cells[i].border) cell.border = tpl.cells[i].border;
                    if (tpl.cells[i].fill) cell.fill = tpl.cells[i].fill;
                    if (tpl.cells[i].numFmt) cell.numFmt = tpl.cells[i].numFmt;
                    
                    cell.value = (dataOverrides && dataOverrides[i] !== undefined) ? dataOverrides[i] : tpl.cells[i].value;
                }
            }
            row.commit();
        };

        sorteioData.riders.forEach((r, idx) => {
            const bull = sorteioData.bulls[sorteioData.assignments[idx]];
            const overrides = {
                1: idx + 1,
                2: r.nome.toUpperCase(),
                3: r.cidade.toUpperCase(),
                4: r.acumulado,
                5: bull.nome.toUpperCase(),
                6: bull.cia.toUpperCase(),
                7: (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(bull.lado)
            };
            applyTemplate(currentRow, compTpl, overrides);
            currentRow++;
        });

        const totalRiders = sorteioData.riders.length;
        if (sorteioData.bulls.length > totalRiders) {
            applyTemplate(currentRow, resHeaderTpl, null);
            ws.mergeCells(`A${currentRow}:D${currentRow}`);
            currentRow++;

            sorteioData.bulls.slice(totalRiders).forEach((b) => {
                const overrides = {
                    1: '', 2: '', 3: '', 4: '',
                    5: b.nome.toUpperCase(),
                    6: b.cia.toUpperCase(),
                    7: (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(b.lado)
                };
                applyTemplate(currentRow, resDataTpl, overrides);
                currentRow++;
            });
        }

        applyTemplate(currentRow, footerTpl, null);
        ws.mergeCells(`A${currentRow}:G${currentRow}`);

        // Força a repetição das linhas 1 e 2 (Cabeçalhos) em todas as páginas na hora de imprimir
        ws.pageSetup.printTitlesRow = '1:2';

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Salvar Sorteio Oficial',
            defaultPath: `Sorteio_Oficial.xlsx`,
            filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }]
        });

        if (!canceled && filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { success: true };
        }
        return { success: false, canceled: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});
ipcMain.handle('export-boiadas-excel', async (event, { sorteioData }) => {
    try {
        const templatePath = path.join(__dirname, 'listtourossorteio.xlsx');
        if (!fs.existsSync(templatePath)) return { success: false, message: "Arquivo molde 'listtourossorteio.xlsx' não encontrado." };

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];
        if (!ws) return { success: false, message: "Planilha 1 não encontrada." };

        const getRowTemplate = (rowNum) => {
            const row = ws.getRow(rowNum);
            const height = row.height;
            const rowData = {};
            for(let i=1; i<=4; i++) {
                const cell = row.getCell(i);
                rowData[i] = {
                    value: cell.value,
                    font: cell.font,
                    alignment: cell.alignment,
                    border: cell.border,
                    fill: cell.fill,
                    numFmt: cell.numFmt
                };
            }
            return { height, cells: rowData };
        };

        const normalBullTpl = getRowTemplate(4);
        const rerideHeaderTpl = getRowTemplate(5);
        const rerideDataTpl = getRowTemplate(6);
        const footerTpl = getRowTemplate(7);

        const mergesToRemove = [];
        for (const merge of Object.values(ws._merges)) {
            if (merge.top >= 4) mergesToRemove.push(merge.model);
        }
        mergesToRemove.forEach(m => ws.unMergeCells(m.top, m.left, m.bottom, m.right));

        // Limpa as linhas de template para não deixar lixo visual/mesclagens no final do arquivo
        ws.spliceRows(4, 10);

        let currentRow = 4;

        const applyTemplate = (rowNum, tpl, dataOverrides) => {
            const row = ws.getRow(rowNum);
            if (tpl.height) row.height = tpl.height;
            for(let i=1; i<=4; i++) {
                const cell = row.getCell(i);
                if (tpl.cells[i]) {
                    if (tpl.cells[i].font) cell.font = tpl.cells[i].font;
                    if (tpl.cells[i].alignment) cell.alignment = tpl.cells[i].alignment;
                    if (tpl.cells[i].border) cell.border = tpl.cells[i].border;
                    if (tpl.cells[i].fill) cell.fill = tpl.cells[i].fill;
                    if (tpl.cells[i].numFmt) cell.numFmt = tpl.cells[i].numFmt;
                    
                    cell.value = (dataOverrides && dataOverrides[i] !== undefined) ? dataOverrides[i] : tpl.cells[i].value;
                }
            }
            row.commit();
        };

        const totalRiders = sorteioData.riders.length;
        
        // Touros normais (sorteados)
        sorteioData.bulls.slice(0, totalRiders).forEach((b, idx) => {
            const overrides = {
                1: idx + 1,
                2: b.nome.toUpperCase(),
                3: b.cia.toUpperCase(),
                4: (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(b.lado)
            };
            applyTemplate(currentRow, normalBullTpl, overrides);
            currentRow++;
        });

        // Re-rides
        if (sorteioData.bulls.length > totalRiders) {
            applyTemplate(currentRow, rerideHeaderTpl, null);
            ws.mergeCells(`A${currentRow}:D${currentRow}`);
            currentRow++;

            sorteioData.bulls.slice(totalRiders).forEach((b, idx) => {
                const overrides = {
                    1: `R${idx + 1}`,
                    2: b.nome.toUpperCase(),
                    3: b.cia.toUpperCase(),
                    4: (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(b.lado)
                };
                applyTemplate(currentRow, rerideDataTpl, overrides);
                currentRow++;
            });
        }

        applyTemplate(currentRow, footerTpl, null);
        ws.mergeCells(`A${currentRow}:D${currentRow}`);

        ws.pageSetup.printTitlesRow = '1:3';

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Salvar Lista de Touros',
            defaultPath: `Lista_Boiada.xlsx`,
            filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }]
        });

        if (!canceled && filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { success: true };
        }
        return { success: false, canceled: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('export-juizes-excel', async (event, { sorteioData, eventName, day, juizNome }) => {
    try {
        const templatePath = path.join(__dirname, 'moldejuiz_sorteio.xlsx');
        if (!fs.existsSync(templatePath)) return { success: false, message: "Arquivo molde 'moldejuiz_sorteio.xlsx' não encontrado." };

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];
        if (!ws) return { success: false, message: "Planilha 1 não encontrada." };

        const getRowTemplate = (rowNum) => {
            const row = ws.getRow(rowNum);
            const height = row.height;
            const rowData = {};
            for(let i=1; i<=11; i++) { // Vai até a coluna K (11)
                const cell = row.getCell(i);
                rowData[i] = {
                    value: cell.value,
                    font: cell.font,
                    alignment: cell.alignment,
                    border: cell.border,
                    fill: cell.fill,
                    numFmt: cell.numFmt
                };
            }
            return { height, cells: rowData };
        };

        const normalTpl = getRowTemplate(5);
        const rerideHeaderTpl = getRowTemplate(6);
        const rerideDataTpl = getRowTemplate(7);
        const footerTpl = getRowTemplate(8);

        // Preenche o nome do Juiz na célula B3
        const judgeCell = ws.getCell('B3');
        judgeCell.value = juizNome;

        // Limpa merges antigos das linhas dinâmicas (5 em diante)
        const mergesToRemove = [];
        for (const merge of Object.values(ws._merges)) {
            if (merge.top >= 5) mergesToRemove.push(merge.model);
        }
        mergesToRemove.forEach(m => ws.unMergeCells(m.top, m.left, m.bottom, m.right));

        // Limpa as linhas de template para não deixar lixo visual/mesclagens no final do arquivo
        ws.spliceRows(5, 10);

        let currentRow = 5;

        const applyTemplate = (rowNum, tpl, dataOverrides) => {
            const row = ws.getRow(rowNum);
            if (tpl.height) row.height = tpl.height;
            for(let i=1; i<=11; i++) {
                const cell = row.getCell(i);
                if (tpl.cells[i]) {
                    if (tpl.cells[i].font) cell.font = tpl.cells[i].font;
                    if (tpl.cells[i].alignment) cell.alignment = tpl.cells[i].alignment;
                    if (tpl.cells[i].border) cell.border = tpl.cells[i].border;
                    if (tpl.cells[i].fill) cell.fill = tpl.cells[i].fill;
                    if (tpl.cells[i].numFmt) cell.numFmt = tpl.cells[i].numFmt;
                    
                    cell.value = (dataOverrides && dataOverrides[i] !== undefined) ? dataOverrides[i] : tpl.cells[i].value;
                }
            }
            row.commit();
        };

        const totalRiders = sorteioData.riders.length;
        
        // Dados normais (Sorteio Principal)
        sorteioData.riders.forEach((r, idx) => {
            const b = sorteioData.bulls[sorteioData.assignments[idx]];
            const overrides = {
                1: idx + 1,
                2: r.nome.toUpperCase(),
                3: r.cidade.toUpperCase(),
                4: r.acumulado || '0,00',
                5: b.nome.toUpperCase(),
                6: b.cia.toUpperCase(),
                7: (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(b.lado),
                8: '',
                9: '',
                10: '',
                11: ''
            };
            applyTemplate(currentRow, normalTpl, overrides);
            currentRow++;
        });

        // Re-rides
        if (sorteioData.bulls.length > totalRiders) {
            applyTemplate(currentRow, rerideHeaderTpl, null);
            ws.mergeCells(`A${currentRow}:D${currentRow}`);
            currentRow++;

            sorteioData.bulls.slice(totalRiders).forEach((b, idx) => {
                const overrides = {
                    1: '', 2: '', 3: '', 4: '',
                    5: b.nome.toUpperCase(),
                    6: b.cia.toUpperCase(),
                    7: (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(b.lado),
                    8: '',
                    9: '',
                    10: '',
                    11: ''
                };
                applyTemplate(currentRow, rerideDataTpl, overrides);
                currentRow++;
            });
        }

        applyTemplate(currentRow, footerTpl, null);
        ws.mergeCells(`A${currentRow}:G${currentRow}`); // Assume que o rodapé foi mesclado do A ao G pelo usuário (conforme A6:G6 mencionado)

        // Força a repetição das linhas 1 a 4 (Cabeçalhos do Juiz) em todas as páginas
        ws.pageSetup.printTitlesRow = '1:4';

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Salvar Planilha do Juiz',
            defaultPath: `Juiz_${juizNome.replace(/\s+/g, '_')}_${day.replace(/\s+/g, '_')}.xlsx`,
            filters: [{ name: 'Planilha Excel', extensions: ['xlsx'] }]
        });

        if (!canceled && filePath) {
            await workbook.xlsx.writeFile(filePath);
            return { success: true };
        }
        return { success: false, canceled: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('export-pdf', async (event, { htmlContent, defaultName }) => {
    try {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Salvar Relatório PDF',
            defaultPath: defaultName || `Relatorio.pdf`,
            filters: [{ name: 'Arquivo PDF', extensions: ['pdf'] }]
        });

        if (canceled || !filePath) return { success: false, canceled: true };

        const hiddenWin = new BrowserWindow({ 
            show: false, 
            webPreferences: { nodeIntegration: false, contextIsolation: true } 
        });

        await hiddenWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

        const pdfData = await hiddenWin.webContents.printToPDF({
            printBackground: true,
            landscape: true,
            margins: { marginType: 'default' }
        });

        fs.writeFileSync(filePath, pdfData);
        hiddenWin.close();

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('export-ordem-excel', async (event, { eventName, day, data, auth }) => {
    try {
        const templatePath = path.join(__dirname, 'ord_embretamento.xlsx');
        if (!fs.existsSync(templatePath)) return { success: false, message: "Arquivo molde 'ord_embretamento.xlsx' não encontrado." };

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];
        if (!ws) return { success: false, message: "Planilha 1 não encontrada." };

        const rowTpl = ws.getRow(5);
        const height = rowTpl.height;
        const rowStyle = {};
        for(let i=1; i<=6; i++) {
            const cell = rowTpl.getCell(i);
            rowStyle[i] = { font: cell.font, alignment: cell.alignment, border: cell.border, fill: cell.fill, numFmt: cell.numFmt };
        }

        let currRow = 5;
        data.riders.forEach((r, idx) => {
            const b = data.bulls[data.assignments[idx]];
            const row = ws.getRow(currRow);
            row.height = height;
            
            const colData = [
                idx + 1, // A
                r.nome.toUpperCase(), // B
                b.nome.toUpperCase(), // C
                b.cia.toUpperCase(), // D
                (function(s){ if(!s) return ''; const l = s.toLowerCase(); if(l==='direito'||l==='d') return 'Certo (C)'; if(l==='esquerdo'||l==='e') return 'Errado (E)'; return s.toUpperCase(); })(b.lado) // E
            ];

            colData.forEach((val, cIdx) => {
                const cell = row.getCell(cIdx + 1);
                cell.value = val;
                const s = rowStyle[cIdx + 1];
                if (s) {
                    if (s.font) cell.font = s.font;
                    if (s.alignment) cell.alignment = s.alignment;
                    if (s.border) cell.border = s.border;
                    if (s.fill) cell.fill = s.fill;
                    if (s.numFmt) cell.numFmt = s.numFmt;
                }
            });
            currRow++;
        });

        // Blank spacer
        currRow++;
        
        // Footer
        const footerRow = ws.getRow(currRow);
        ws.mergeCells(`A${currRow}:E${currRow}`);
        footerRow.getCell(1).value = `RODEOAPP (18) 98122-6665 - GESTÃO DE RODEIOS - LICENCIADO PARA: ${(auth && auth.nome) ? auth.nome.toUpperCase() : "CLIENTE RODEOAPP"}`;
        footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        footerRow.getCell(1).font = { bold: true, size: 10 };
        footerRow.height = 25;

        const defaultName = `Ordem_Embretamento_${eventName.replace(/\s+/g,'_')}_${day.replace(/\s+/g,'_')}.xlsx`;
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Salvar Planilha de Ordem',
            defaultPath: defaultName,
            filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
        });

        if (canceled || !filePath) return { success: false, canceled: true };
        await workbook.xlsx.writeFile(filePath);
        return { success: true };
    } catch(e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('export-ranking-excel', async (event, { eventName, day, data, auth }) => {
    try {
        const templatePath = path.join(__dirname, 'molde_ranking.xlsx');
        if (!fs.existsSync(templatePath)) return { success: false, message: "Arquivo molde 'molde_ranking.xlsx' não encontrado." };

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];
        if (!ws) return { success: false, message: "Planilha 1 não encontrada." };

        const safeDay = day || 'GERAL';
        ws.getCell('A1').value = eventName.toUpperCase() + '\nRANKING OFICIAL - ' + safeDay.toUpperCase();

        let headerCol = 4; 
        data.columnsDays.forEach(d => {
            ws.getCell(2, headerCol).value = d;
            headerCol++;
        });
        ws.getCell(2, headerCol).value = "TOTAL";

        const rowTpl = ws.getRow(3);
        const height = rowTpl.height || 20;
        const rowStyle = {};
        for(let i=1; i<=15; i++) { 
            const cell = rowTpl.getCell(i);
            rowStyle[i] = { font: cell.font, alignment: cell.alignment, border: cell.border, fill: cell.fill, numFmt: cell.numFmt };
        }

        let currRow = 3;
        data.rows.forEach((r, idx) => {
            const row = ws.getRow(currRow);
            row.height = height;
            
            const pos = (r.totalPoints > 0 || r.tempoAcumulado > 0) ? `${idx + 1}\u00BA` : '---';
            
            row.getCell(1).value = pos;
            row.getCell(2).value = r.nome.toUpperCase();
            row.getCell(3).value = r.cidade ? r.cidade.toUpperCase() : '';

            let cIdx = 4;
            data.columnsDays.forEach(d => {
                row.getCell(cIdx).value = r.daysScores[d];
                cIdx++;
            });
            
            const tempoInfo = (r.totalPoints === 0 && r.tempoAcumulado > 0) ? ` (${r.tempoAcumulado.toFixed(2)}s)` : '';
            const totalStr = (r.totalPoints > 0 ? r.totalPoints.toFixed(2).replace('.', ',') : '0,00') + tempoInfo;
            row.getCell(cIdx).value = totalStr;

            for(let i=1; i<=cIdx; i++) {
                const cell = row.getCell(i);
                const templateIndex = (i >= 4 && i < cIdx) ? 4 : (i === cIdx ? 7 : i); 
                const s = rowStyle[templateIndex];
                if (s) {
                    if (s.font) cell.font = s.font;
                    if (s.alignment) cell.alignment = s.alignment;
                    if (s.border) cell.border = s.border;
                    if (s.fill) cell.fill = s.fill;
                    if (s.numFmt) cell.numFmt = s.numFmt;
                }
            }
            currRow++;
        });

        currRow++;
        
        const footerRow = ws.getRow(currRow);
        ws.mergeCells(currRow, 1, currRow, 3 + data.columnsDays.length);
        const clienteNome = (auth && (auth.nome || auth.email)) ? (auth.nome || auth.email).toUpperCase() : 'CLIENTE RODEOAPP';
        footerRow.getCell(1).value = `Acesse rodeoapp.pro um novo conceito em gestão de provas! - Licenciado para: ${clienteNome}`;
        footerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        footerRow.getCell(1).font = { bold: true, size: 10 };
        footerRow.height = 25;

        const defaultName = 'Ranking_' + eventName.replace(/\s+/g,'_') + '_' + safeDay.replace(/\s+/g,'_') + '.xlsx';
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Salvar Planilha de Ranking',
            defaultPath: defaultName,
            filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
        });

        if (canceled || !filePath) return { success: false, canceled: true };
        await workbook.xlsx.writeFile(filePath);
        return { success: true };
    } catch(e) {
        console.error(e);
        return { success: false, message: e.message };
    }
});

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

ipcMain.handle('export-contracts', async (event, { email, eventId, target, format }) => {
    try {
        const data = getLocalData(email);
        const ev = data.eventos.find(e => e.id === eventId);
        if (!ev) return { success: false, error: 'Evento não encontrado.' };

        const cc = ev.contratoConfig || {};
        if (!cc.contratante) return { success: false, error: 'Configuração do contrato incompleta.' };

        const templateName = cc.contratante.mesmoEndereco ? 'moldecontratosendereço.docx' : 'moldecontratocendereço.docx';
        const templatePath = path.join(__dirname, '..', 'modelos_contrato', templateName);
        
        if (!fs.existsSync(templatePath)) {
            return { success: false, error: `Arquivo de molde não encontrado na pasta modelos_contrato: ${templateName}` };
        }

        const { dialog } = require('electron');
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Selecione a pasta para salvar os contratos',
            properties: ['openDirectory']
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, error: 'Exportação cancelada pelo usuário.' };
        }
        
        const outDir = filePaths[0];
        
        let peoesToExport = [];
        if (target === 'all') {
            peoesToExport = ev.peoes || [];
        } else {
            const p = (ev.peoes || []).find(x => (x.id || x.nome) === target);
            if (p) peoesToExport.push(p);
        }

        if (peoesToExport.length === 0) return { success: false, error: 'Nenhum peão para exportar.' };

        const content = fs.readFileSync(templatePath, 'binary');

        const con = cc.contratante;
        const c2 = cc.clausulaSegunda || {};
        const cq = cc.clausulaQuarta || {};
        const end = con.endereco || {};
        const endRep = con.enderecoRepresentante || {};
        const rec = cc.recibo || {};
        const forum = cc.forum || {};

        const buildEnd = (e) => {
            const sn = e.sn ? 'S/N' : (e.numero || '');
            return `${e.rua || ''}, ${sn}, ${e.bairro || ''}, ${e.cidade || ''}-${e.estado || ''}, CEP: ${e.cep || ''}`;
        };

        let valProp = '';
        let fracDias = '';
        let valInssCalc = '';
        let valLiquidoRec = '';
        
        if (c2.prazoNum && rec.valorBruto) {
            const dias = parseInt(c2.prazoNum, 10);
            const bruto = parseFloat((rec.valorBruto || '0').replace(/\./g, '').replace(',', '.'));
            if (!isNaN(dias) && !isNaN(bruto)) {
                fracDias = `${dias}/30`;
                const valPropNum = (bruto / 30) * dias;
                
                let inssPerc = 11;
                if (rec.valorInss) {
                    const parsedInss = parseFloat(rec.valorInss.replace(',', '.'));
                    if (!isNaN(parsedInss)) inssPerc = parsedInss;
                }
                
                const inssNum = valPropNum * (inssPerc / 100);
                const liquidoNum = valPropNum - inssNum;
                
                valProp = valPropNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                valInssCalc = inssNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                valLiquidoRec = liquidoNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
        }

        const baseTags = {
            NOME_FESTA: ev.name || '',
            CIDADE_FESTA: ev.city || '',
            NOME_EMPRESA: con.razaoSocial || '',
            CNPJ_EMPRESA: con.cnpj || '',
            ENDERECO_EMPRESA: buildEnd(end),
            NOME_CONTRATANTE: con.nomeRepresentante || '',
            CPF_CONTRATANTE: con.cpfRepresentante || '',
            RG_CONTRATANTE: con.rgRepresentante || '',
            ENDERECO_CONTRATANTE: con.mesmoEndereco ? buildEnd(end) : buildEnd(endRep),
            PRAZO_DIAS: c2.prazoNum || '',
            PRAZO_EXTENSO: c2.prazoExtenso || '',
            DATA_INICIO: c2.dataInicio || '',
            DATA_FIM: c2.dataFim || '',
            ANO_FIM: c2.dataFim ? c2.dataFim.split('/').pop() : '',
            FRACAO_DIAS: fracDias,
            VALOR_PROPORCIONAL: valProp,
            VALOR_INSS_CALCULADO: valInssCalc,
            VALOR_LIQUIDO_RECIBO: valLiquidoRec,
            VALOR_LIQUIDO: cq.valorLiquido || '',
            VALOR_LIQUIDO_EXTENSO: cq.valorLiquidoExtenso || '',
            DATA_PAGAMENTO: cq.dataPagamento || '',
            MODALIDADE: cq.modalidade || '',
            PREMIO_TOTAL: cq.premiacaoTotal || '',
            PREMIO_TOTAL_EXTENSO: cq.premiacaoTotalExtenso || '',
            distribuicao: cq.distribuicao || [],
            CIDADE_FORUM: forum.cidade || '',
            VALOR_CONTRATO_BRUTO: rec.valorBruto || '',
            VALOR_INSS: rec.valorInss || ''
        };

        const convertToPdf = (docxPath, pdfPath) => {
            return new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                const sofficePath = '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"';
                const outDirArg = path.dirname(pdfPath);
                
                const cmd = `${sofficePath} --headless --convert-to pdf "${docxPath}" --outdir "${outDirArg}"`;
                
                exec(cmd, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        // LibreOffice generates a file with the same name but .pdf extension in the outdir
                        // Let's ensure it's named exactly what we wanted in pdfPath
                        const expectedPdfName = path.basename(docxPath, '.docx') + '.pdf';
                        const generatedPdfPath = path.join(outDirArg, expectedPdfName);
                        
                        if (generatedPdfPath !== pdfPath && fs.existsSync(generatedPdfPath)) {
                            fs.renameSync(generatedPdfPath, pdfPath);
                        }
                        resolve();
                    }
                });
            });
        };

        const os = require('os');
        const buffers = [];
        let generatedCount = 0;

        for (const p of peoesToExport) {
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

            doc.render({
                ...baseTags,
                NOME_PEAO: p.nome || '',
                NOME_CONTRATADO: p.nome || '',
                CPF_PEAO: p.cpf || '',
                CPF_CONTRATADO: p.cpf || '',
                ENDERECO_PEAO: p.cidade || '',
                ENDERECO_CONTRATADO: p.cidade || ''
            });

            const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            buffers.push({ buf, name: p.nome || 'Competidor' });
            generatedCount++;
        }

        let finalBuffer;
        let finalFileNameBase;

        if (buffers.length === 1) {
            finalBuffer = buffers[0].buf;
            finalFileNameBase = `Contrato_${buffers[0].name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        } else {
            const DocxMerger = require('docx-merger');
            const merger = new DocxMerger({}, buffers.map(b => b.buf));
            finalBuffer = await new Promise((resolve, reject) => {
                try {
                    merger.save('nodebuffer', resolve);
                } catch (e) {
                    reject(e);
                }
            });
            finalFileNameBase = `Todos_os_Contratos`;
        }

        if (format === 'pdf') {
            const docxTempPath = path.join(os.tmpdir(), `temp_${Date.now()}_${finalFileNameBase}.docx`);
            fs.writeFileSync(docxTempPath, finalBuffer);
            
            const fileNamePdf = `${finalFileNameBase}.pdf`;
            const pdfOutPath = path.join(outDir, fileNamePdf);
            try {
                await convertToPdf(docxTempPath, pdfOutPath);
                try { fs.unlinkSync(docxTempPath); } catch(e){}
            } catch (err) {
                console.error("Erro conversão PDF: ", err);
                throw new Error(`Falha ao converter para PDF. Verifique se o LibreOffice está instalado. Detalhes: ${err.message}`);
            }
        } else {
            const fileNameDocx = `${finalFileNameBase}.docx`;
            const docxOutPath = path.join(outDir, fileNameDocx);
            fs.writeFileSync(docxOutPath, finalBuffer);
        }

        return { success: true, path: outDir, count: generatedCount };

    } catch (err) {
        console.error("Erro exportação de contrato:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('export-melhor-cia', async (event, { eventName, data, format }) => {
    try {
        const { dialog } = require('electron');
        const ExcelJS = require('exceljs');
        const path = require('path');
        const fs = require('fs');
        
        const templatePath = path.join(__dirname, '..', 'modelos_contrato', 'modelomelhorcia.xlsx');
        let hasTemplate = false;
        let wb = new ExcelJS.Workbook();
        
        // As the user said they created "modelomelhorcia.xlsx", let's check if it exists in the main folder or in modelos_contrato.
        let actualTemplatePath = path.join(__dirname, 'modelomelhorcia.xlsx');
        if (fs.existsSync(actualTemplatePath)) {
            await wb.xlsx.readFile(actualTemplatePath);
            hasTemplate = true;
        } else if (fs.existsSync(templatePath)) {
            await wb.xlsx.readFile(templatePath);
            hasTemplate = true;
        } else {
            return { success: false, error: 'Arquivo modelomelhorcia.xlsx não encontrado.' };
        }
        
        const templateWs = wb.worksheets[0];
        
        // We will create a new workbook and copy column widths and styles
        const newWb = new ExcelJS.Workbook();
        const newWs = newWb.addWorksheet('Melhor Cia');
        
        // Copy page setup and properties to ensure LibreOffice exports PDF correctly
        newWs.pageSetup = templateWs.pageSetup;
        newWs.properties = templateWs.properties;
        newWs.views = templateWs.views;
        
        // Sometimes ExcelJS fitToPage needs to be explicitly enforced for PDF
        if (!newWs.pageSetup) newWs.pageSetup = {};
        newWs.pageSetup.fitToPage = true;
        newWs.pageSetup.fitToWidth = 1;
        newWs.pageSetup.fitToHeight = 0;
        newWs.pageSetup.printArea = undefined; // Let it calculate automatically
        
        // Set generous column widths so the table stretches across the A4 page
        newWs.getColumn(1).width = Math.max(templateWs.getColumn(1).width || 20, 30);
        newWs.getColumn(2).width = Math.max(templateWs.getColumn(2).width || 10, 12);
        newWs.getColumn(3).width = Math.max(templateWs.getColumn(3).width || 10, 12);
        newWs.getColumn(4).width = Math.max(templateWs.getColumn(4).width || 10, 12);
        newWs.getColumn(5).width = Math.max(templateWs.getColumn(5).width || 15, 20);
        newWs.getColumn(6).width = Math.max(templateWs.getColumn(6).width || 10, 15);
        newWs.getColumn(7).width = Math.max(templateWs.getColumn(7).width || 10, 15);
        
        // Ensure it is centered and has small margins
        newWs.pageSetup.horizontalCentered = true;
        newWs.pageSetup.margins = {
            left: 0.25, right: 0.25,
            top: 0.5, bottom: 0.5,
            header: 0.3, footer: 0.3
        };
        
        let currRow = 1;
        
        // Add Image
        const logoPath = path.join(__dirname, 'assets', 'rodeoapplogo_branca.png');
        if (fs.existsSync(logoPath)) {
            const imageId = newWb.addImage({
                filename: logoPath,
                extension: 'png',
            });
            newWs.addImage(imageId, {
                tl: { col: 0.2, row: 0.15 }, // Centered vertically in the 90pt row height
                ext: { width: 135, height: 90 } // Larger logo (aspect ratio 1.5)
            });
        }

        // Row 1: Event Name (Beautiful Header)
        const r1 = newWs.getRow(currRow);
        r1.height = 90; // Fixed large height for a beautiful header
        newWs.mergeCells(currRow, 1, currRow, 7);
        
        for(let c=1; c<=7; c++) {
            r1.getCell(c).style = {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }, // Black background
                border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
            };
        }
        
        r1.getCell(1).value = {
            richText: [
                {
                    text: eventName.toUpperCase() + '\n',
                    font: { name: 'Arial Black', size: 24, italic: true, bold: true, color: { argb: 'FFFFFFFF' } }
                },
                {
                    text: 'MELHOR CIA',
                    font: { name: 'Arial', size: 12, bold: false, color: { argb: 'FFFFFFFF' } }
                }
            ]
        };
        currRow++;
        
        data.forEach(cia => {
            // Cia Name
            const rCia = newWs.getRow(currRow);
            rCia.height = templateWs.getRow(2).height;
            newWs.mergeCells(currRow, 1, currRow, 7);
            for(let c=1; c<=7; c++) rCia.getCell(c).style = templateWs.getCell(2, c).style;
            rCia.getCell(1).value = cia.nome.toUpperCase();
            currRow++;
            
            // Touros
            cia.touros.forEach(touro => {
                const rT = newWs.getRow(currRow);
                rT.height = templateWs.getRow(3).height;
                newWs.mergeCells(currRow, 1, currRow, 4);
                newWs.mergeCells(currRow, 6, currRow, 7);
                for(let c=1; c<=7; c++) rT.getCell(c).style = templateWs.getCell(3, c).style;
                rT.getCell(1).value = touro.nome.toUpperCase();
                rT.getCell(5).value = touro.dia.toUpperCase();
                rT.getCell(6).value = touro.nota.toFixed(2);
                currRow++;
            });
            
            // Totals
            const rTot = newWs.getRow(currRow);
            rTot.height = templateWs.getRow(4).height;
            newWs.mergeCells(currRow, 1, currRow, 3);
            newWs.mergeCells(currRow, 6, currRow, 7);
            for(let c=1; c<=7; c++) rTot.getCell(c).style = templateWs.getCell(4, c).style;
            
            rTot.getCell(1).value = templateWs.getCell(4, 1).value || 'MÉDIA';
            rTot.getCell(4).value = `Quantidade: ${cia.saidas}`;
            rTot.getCell(5).value = `Total: ${cia.sum.toFixed(2)}`;
            rTot.getCell(6).value = cia.media.toFixed(2);
            currRow++;
            
            // Empty row
            currRow++;
        });
        
        // Footer (rodapé)
        const rFoot = newWs.getRow(currRow);
        rFoot.height = templateWs.getRow(8).height || 30;
        newWs.mergeCells(currRow, 1, currRow, 7);
        for(let c=1; c<=7; c++) rFoot.getCell(c).style = templateWs.getCell(8, c).style;
        rFoot.getCell(1).value = templateWs.getCell(8, 1).value;
        
        // Save
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: format === 'pdf' ? 'Salvar Melhor CIA como PDF' : 'Salvar Melhor CIA como Excel',
            defaultPath: `MELHOR_CIA_${eventName.replace(/[^a-z0-9]/gi, '_')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
            filters: [
                format === 'pdf' ? { name: 'PDF', extensions: ['pdf'] } : { name: 'Excel', extensions: ['xlsx'] }
            ]
        });

        if (canceled || !filePath) return { canceled: true };

        if (format === 'excel') {
            await newWb.xlsx.writeFile(filePath);
        } else if (format === 'pdf') {
            const tempXlsx = filePath.replace('.pdf', '_temp.xlsx');
            await newWb.xlsx.writeFile(tempXlsx);
            
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            const soffice = process.platform === 'win32' 
                ? '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
                : 'soffice';
                
            const outdir = path.dirname(filePath);
            const cmd = `${soffice} --headless --convert-to pdf "${tempXlsx}" --outdir "${outdir}"`;
            
            try {
                await execAsync(cmd);
                if (fs.existsSync(tempXlsx)) fs.unlinkSync(tempXlsx);
                
                // Libreoffice automatically names it the same as input but .pdf
                // so we rename it to the actual selected filePath if it differs
                const expectedPdf = path.join(outdir, path.basename(tempXlsx, '.xlsx') + '.pdf');
                if (fs.existsSync(expectedPdf) && expectedPdf !== filePath) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    fs.renameSync(expectedPdf, filePath);
                }
            } catch (e) {
                if (fs.existsSync(tempXlsx)) fs.unlinkSync(tempXlsx);
                return { success: false, error: 'Erro ao gerar PDF: Certifique-se de que o LibreOffice está instalado.' };
            }
        }
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});


// --- EXPORT MELHOR ANIMAL ---
ipcMain.handle('export-melhor-animal', async (event, { eventName, data, format }) => {
    try {
        const { dialog } = require('electron');
        const ExcelJS = require('exceljs');
        const path = require('path');
        const fs = require('fs');
        
        let wb = new ExcelJS.Workbook();
        
        // Find template
        let templatePath = path.join(__dirname, 'modelmelhoranimal.xlsx');
        if (!fs.existsSync(templatePath)) {
            templatePath = path.join(__dirname, '..', 'modelos_contrato', 'modelmelhoranimal.xlsx');
        }
        
        if (fs.existsSync(templatePath)) {
            await wb.xlsx.readFile(templatePath);
        } else {
            return { success: false, error: 'Arquivo modelmelhoranimal.xlsx não encontrado.' };
        }
        
        const templateWs = wb.worksheets[0];
        const newWb = new ExcelJS.Workbook();
        const newWs = newWb.addWorksheet('Melhor Animal');
        
        // Page setup and column widths
        newWs.pageSetup = templateWs.pageSetup || {};
        newWs.properties = templateWs.properties;
        newWs.views = templateWs.views;
        newWs.pageSetup.fitToPage = true;
        newWs.pageSetup.fitToWidth = 1;
        newWs.pageSetup.fitToHeight = 0;
        newWs.pageSetup.horizontalCentered = true;
        newWs.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
        
        // Custom column widths
        newWs.getColumn(1).width = Math.max(templateWs.getColumn(1).width || 10, 15); // Pos
        newWs.getColumn(2).width = Math.max(templateWs.getColumn(2).width || 25, 35); // Animal
        newWs.getColumn(3).width = Math.max(templateWs.getColumn(3).width || 10, 15); // Cia 1
        newWs.getColumn(4).width = Math.max(templateWs.getColumn(4).width || 10, 15); // Cia 2
        newWs.getColumn(5).width = Math.max(templateWs.getColumn(5).width || 15, 20); // Round
        newWs.getColumn(6).width = Math.max(templateWs.getColumn(6).width || 10, 15); // Média 1
        newWs.getColumn(7).width = Math.max(templateWs.getColumn(7).width || 10, 15); // Média 2
        
        let currRow = 1;
        
        // Header Row (Beautified)
        const logoPath = path.join(__dirname, 'assets', 'rodeoapplogo_branca.png');
        if (fs.existsSync(logoPath)) {
            const imageId = newWb.addImage({ filename: logoPath, extension: 'png' });
            newWs.addImage(imageId, {
                tl: { col: 0.2, row: 0.15 },
                ext: { width: 135, height: 90 }
            });
        }

        const r1 = newWs.getRow(currRow);
        r1.height = 90;
        newWs.mergeCells(currRow, 1, currRow, 7);
        for(let c=1; c<=7; c++) {
            r1.getCell(c).style = {
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } },
                border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
                alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
            };
        }
        r1.getCell(1).value = {
            richText: [
                { text: eventName.toUpperCase() + '\n', font: { name: 'Arial Black', size: 24, italic: true, bold: true, color: { argb: 'FFFFFFFF' } } },
                { text: 'MELHOR ANIMAL', font: { name: 'Arial', size: 12, bold: false, color: { argb: 'FFFFFFFF' } } }
            ]
        };
        currRow++;
        
        // Fixed Headers (Row 2 from template)
        const r2 = newWs.getRow(currRow);
        r2.height = templateWs.getRow(2).height || 20;
        newWs.mergeCells(currRow, 3, currRow, 4); // Companhia
        newWs.mergeCells(currRow, 6, currRow, 7); // Media
        for(let c=1; c<=7; c++) {
            r2.getCell(c).style = templateWs.getCell(2, c).style;
            r2.getCell(c).value = templateWs.getCell(2, c).value;
        }
        currRow++;
        
        // Animal Blocks
        data.forEach((animal, index) => {
            const blockStartRow = currRow;
            const rounds = animal.montarias;
            const blockEndRow = currRow + rounds.length; // rounds + average row
            
            // Loop for each round + average
            for (let i = 0; i <= rounds.length; i++) {
                const rAnim = newWs.getRow(currRow + i);
                
                // Which template row to use for styles?
                let tRow = 4; // Round rows style
                if (i === rounds.length) tRow = 6; // Average row style
                
                rAnim.height = templateWs.getRow(tRow).height || 25;
                for(let c=1; c<=7; c++) {
                    rAnim.getCell(c).style = templateWs.getCell(tRow, c).style;
                }
                
                if (i < rounds.length) {
                    // Round Row
                    rAnim.getCell(5).value = rounds[i].dia.toUpperCase();
                    newWs.mergeCells(currRow + i, 6, currRow + i, 7);
                    rAnim.getCell(6).value = parseFloat(rounds[i].nota.toFixed(2));
                } else {
                    // Average Row
                    rAnim.getCell(5).value = templateWs.getCell(6, 1).value || 'Média:'; // Use the text from template
                    // Ensure it is right-aligned or follows the style
                    rAnim.getCell(5).style = { ...rAnim.getCell(5).style, alignment: { horizontal: 'right', vertical: 'middle' } };
                    
                    newWs.mergeCells(currRow + i, 6, currRow + i, 7);
                    rAnim.getCell(6).value = parseFloat(animal.media.toFixed(2));
                }
            }
            
            // Merge A, B, C:D across the entire block
            newWs.mergeCells(blockStartRow, 1, blockEndRow, 1);
            newWs.mergeCells(blockStartRow, 2, blockEndRow, 2);
            newWs.mergeCells(blockStartRow, 3, blockEndRow, 4); // C:D
            
            // Fill values in the first cell of the merged region
            const firstRow = newWs.getRow(blockStartRow);
            firstRow.getCell(1).value = index + 1 + '\u00BA';
            firstRow.getCell(2).value = animal.nome.toUpperCase();
            firstRow.getCell(3).value = animal.cia.toUpperCase();
            
            // Apply vertical alignment to the merged cells so they are centered
            [1, 2, 3].forEach(c => {
                 firstRow.getCell(c).style = {
                     ...firstRow.getCell(c).style,
                     alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
                 };
            });
            
            currRow = blockEndRow + 1; // move past the block
        });
        
        // Footer (Row 10 from template)
        const rFoot = newWs.getRow(currRow);
        rFoot.height = templateWs.getRow(10).height || 30;
        newWs.mergeCells(currRow, 1, currRow, 7);
        for(let c=1; c<=7; c++) rFoot.getCell(c).style = templateWs.getCell(10, c).style;
        rFoot.getCell(1).value = templateWs.getCell(10, 1).value;
        
        // Save
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: format === 'pdf' ? 'Salvar Melhor Animal como PDF' : 'Salvar Melhor Animal como Excel',
            defaultPath: `MELHOR_ANIMAL_${eventName.replace(/[^a-z0-9]/gi, '_')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
            filters: [
                format === 'pdf' ? { name: 'PDF', extensions: ['pdf'] } : { name: 'Excel', extensions: ['xlsx'] }
            ]
        });

        if (canceled || !filePath) return { canceled: true };

        if (format === 'excel') {
            await newWb.xlsx.writeFile(filePath);
        } else if (format === 'pdf') {
            const tempXlsx = filePath.replace('.pdf', '_temp.xlsx');
            await newWb.xlsx.writeFile(tempXlsx);
            
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            const soffice = process.platform === 'win32' 
                ? '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
                : 'soffice';
                
            const outdir = path.dirname(filePath);
            const cmd = `${soffice} --headless --convert-to pdf "${tempXlsx}" --outdir "${outdir}"`;
            
            try {
                await execAsync(cmd);
                if (fs.existsSync(tempXlsx)) fs.unlinkSync(tempXlsx);
                
                const expectedPdf = path.join(outdir, path.basename(tempXlsx, '.xlsx') + '.pdf');
                if (fs.existsSync(expectedPdf) && expectedPdf !== filePath) {
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    fs.renameSync(expectedPdf, filePath);
                }
            } catch (e) {
                if (fs.existsSync(tempXlsx)) fs.unlinkSync(tempXlsx);
                return { success: false, error: 'Erro ao gerar PDF: Certifique-se de que o LibreOffice está instalado.' };
            }
        }
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});


// --- AUTO UPDATER ---
const { autoUpdater } = require('electron-updater');
const https = require('https');

autoUpdater.autoDownload = false;

// Custom State for macOS update
let macUpdateInfo = null;
let macDownloadPath = null;

function isNewerVersion(latest, current) {
    const lParts = latest.split('.').map(Number);
    const cParts = current.split('.').map(Number);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
        const lVal = lParts[i] || 0;
        const cVal = cParts[i] || 0;
        if (lVal > cVal) return true;
        if (lVal < cVal) return false;
    }
    return false;
}

function checkMacUpdates() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/g7briell/hzn-rodeo/releases/latest`,
            headers: {
                'User-Agent': 'HZN-RodeoApp-Updater'
            }
        };
        
        https.get(options, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch updates, status code: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const latestVersion = release.tag_name.replace(/^v/, '');
                    const currentVersion = app.getVersion();
                    
                    if (isNewerVersion(latestVersion, currentVersion)) {
                        const zipAsset = release.assets.find(asset => asset.name.endsWith('.zip') && asset.name.toLowerCase().includes('mac'));
                        if (zipAsset) {
                            macUpdateInfo = {
                                version: latestVersion,
                                releaseName: release.name,
                                releaseNotes: release.body,
                                url: zipAsset.browser_download_url,
                                size: zipAsset.size
                            };
                            resolve({ available: true, info: macUpdateInfo });
                        } else {
                            resolve({ available: false });
                        }
                    } else {
                        resolve({ available: false });
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function downloadMacUpdate(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        
        function getUri(uri) {
            https.get(uri, {
                headers: { 'User-Agent': 'HZN-RodeoApp-Updater' }
            }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    return getUri(res.headers.location);
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to download update, status code: ${res.statusCode}`));
                }
                
                const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
                let downloadedBytes = 0;
                
                res.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    file.write(chunk);
                    if (totalBytes > 0 && onProgress) {
                        const percent = (downloadedBytes / totalBytes) * 100;
                        onProgress({
                            total: totalBytes,
                            transferred: downloadedBytes,
                            percent: percent
                        });
                    }
                });
                
                res.on('end', () => {
                    file.end();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        }
        
        getUri(url);
    });
}

autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-available', info });
});

autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-not-available', info });
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'download-progress', progress: progressObj });
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-downloaded', info });
});

autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'error', message: err.message });
});

ipcMain.handle('check-for-updates', () => {
    if (process.platform === 'darwin') {
        if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: Starting check-for-updates on macOS...' });
        checkMacUpdates().then(res => {
            if (res.available) {
                if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-available', info: res.info });
            } else {
                if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'update-not-available', info: { version: app.getVersion() } });
            }
        }).catch(err => {
            if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'error', message: 'macOS check updates error: ' + err.message });
        });
    } else {
        try {
            autoUpdater.checkForUpdates().then(res => {
                if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: IPC checkForUpdates resolved: ' + (res ? 'Success' : 'Null') });
            }).catch(err => {
                if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: IPC checkForUpdates REJECTED: ' + err.message });
            });
        } catch (e) {
            if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'RODEOAPP: IPC checkForUpdates SYNC ERROR: ' + e.message });
        }
    }
});

ipcMain.handle('download-update', () => {
    if (process.platform === 'darwin') {
        if (!macUpdateInfo) {
            if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'error', message: 'No update info available to download.' });
            return;
        }
        if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'debug', message: 'Starting macOS download from: ' + macUpdateInfo.url });
        
        const tempDir = app.getPath('temp');
        macDownloadPath = path.join(tempDir, `HZN-RodeoApp-Setup-${macUpdateInfo.version}.zip`);
        
        downloadMacUpdate(macUpdateInfo.url, macDownloadPath, (progress) => {
            if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
                mainWindow.webContents.send('updater-event', {
                    type: 'download-progress',
                    progress: {
                        percent: progress.percent,
                        transferred: progress.transferred,
                        total: progress.total,
                        bytesPerSecond: 0
                    }
                });
            }
        }).then(() => {
            if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send('updater-event', { type: 'update-downloaded', info: macUpdateInfo });
        }).catch(err => {
            if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) mainWindow.webContents.send('updater-event', { type: 'error', message: 'macOS download error: ' + err.message });
        });
    } else {
        autoUpdater.downloadUpdate();
    }
});

ipcMain.handle('install-update', () => {
    if (process.platform === 'darwin') {
        installMacUpdate();
    } else {
        autoUpdater.quitAndInstall();
    }
});

ipcMain.handle('quit-and-install', () => {
    if (process.platform === 'darwin') {
        installMacUpdate();
    } else {
        autoUpdater.quitAndInstall(false, true);
    }
});

function installMacUpdate() {
    try {
        if (!macDownloadPath || !fs.existsSync(macDownloadPath)) {
            throw new Error('Downloaded update file not found.');
        }
        
        const currentExe = app.getPath('exe');
        let appBundlePath = currentExe;
        if (appBundlePath.includes('.app/Contents/MacOS/')) {
            appBundlePath = appBundlePath.substring(0, appBundlePath.indexOf('.app') + 4);
        } else {
            appBundlePath = path.dirname(path.dirname(path.dirname(currentExe)));
        }
        
        const tempDir = app.getPath('temp');
        const scriptPath = path.join(tempDir, 'hzn_update.sh');
        
        const scriptContent = `#!/bin/bash
# Wait for the main process to exit
sleep 2

echo "Starting HZN RodeoApp update process..."
echo "Temp Zip: ${macDownloadPath}"
echo "Target App Path: ${appBundlePath}"

# Create temp extraction folder
mkdir -p "/tmp/hzn_update"

# Extract
unzip -o "${macDownloadPath}" -d "/tmp/hzn_update"

# Find the extracted app bundle (usually /tmp/hzn_update/*.app)
EXTRACTED_APP=$(find "/tmp/hzn_update" -maxdepth 2 -name "*.app" | head -n 1)

if [ -z "$EXTRACTED_APP" ]; then
    echo "Error: Extracted .app bundle not found!"
    exit 1
fi

echo "Extracted App: $EXTRACTED_APP"

# Move old app bundle to temp backup
rm -rf "/tmp/hzn_old_app.app"
if [ -d "${appBundlePath}" ]; then
    mv "${appBundlePath}" "/tmp/hzn_old_app.app"
fi

# Move new app to final destination
mv "$EXTRACTED_APP" "${appBundlePath}"

# Remove quarantine and set execution permissions
xattr -cr "${appBundlePath}"
chmod -R 755 "${appBundlePath}"

# Clean up
rm -rf "/tmp/hzn_update"
rm -f "${macDownloadPath}"

# Relaunch the app
open "${appBundlePath}"
`;

        fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
        
        const { spawn } = require('child_process');
        const child = spawn('/bin/bash', [scriptPath], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        
        app.quit();
    } catch (e) {
        if (mainWindow) mainWindow.webContents.send('updater-event', { type: 'error', message: 'macOS install error: ' + e.message });
    }
}

// Start checking shortly after startup
app.on('ready', () => {
    setTimeout(() => {
        if (process.platform === 'darwin') {
            checkMacUpdates().then(res => {
                if (res.available && mainWindow) {
                    mainWindow.webContents.send('updater-event', { type: 'update-available', info: res.info });
                }
            }).catch(e => console.log('Error checking mac updates:', e));
        } else {
            try {
                autoUpdater.checkForUpdates();
            } catch (e) {
                console.log('Error checking for updates:', e);
            }
        }
    }, 5000);
});

async function saveEventToRelationalDb(supabase, ev, email) {
    try {
        const evNome = ev.name.trim().toUpperCase();
        const evCidade = (ev.city || 'DESCONHECIDA').trim().toUpperCase();
        const evData = ev.days + ' dias';

        // 1. Get or create event in rel_eventos
        let relEvId = null;
        const { data: existingEvs } = await supabase.from('rel_eventos')
            .select('id')
            .eq('nome', evNome)
            .limit(1);

        if (existingEvs && existingEvs.length > 0) {
            relEvId = existingEvs[0].id;
            // Update event
            await supabase.from('rel_eventos')
                .update({ cidade: evCidade, data: evData })
                .eq('id', relEvId);
            // Clean up existing rides for this event to rebuild them
            await supabase.from('rel_montarias')
                .delete()
                .eq('evento_id', relEvId);
        } else {
            const { data: newEv, error: evErr } = await supabase.from('rel_eventos')
                .insert({ nome: evNome, cidade: evCidade, data: evData, is_manual: false })
                .select('id')
                .single();
            if (evErr) throw evErr;
            relEvId = newEv.id;
        }

        // 2. Pre-process Competitors from ranking and notas
        const competitors = []; // array of { name, cpf, cidade }
        const ranking = ev.peoes || [];
        const notas = ev.notas || [];

        for (const rider of ranking) {
            const name = rider.nome ? rider.nome.trim().toUpperCase() : '';
            if (!name) continue;
            const cpf = rider.cpf ? rider.cpf.replace(/\D/g, '') : '';
            const cidade = rider.cidade || rider.local ? (rider.cidade || rider.local).trim().toUpperCase() : '';
            competitors.push({ name, cpf, cidade });
        }

        for (const nota of notas) {
            const name = nota.peao ? nota.peao.trim().toUpperCase() : '';
            if (!name) continue;
            const cpf = nota.cpf ? nota.cpf.replace(/\D/g, '') : '';
            const existing = competitors.find(c => c.name === name);
            if (existing) {
                if (cpf && !existing.cpf) {
                    existing.cpf = cpf;
                }
            } else {
                competitors.push({ name, cpf, cidade: '' });
            }
        }

        // Insert competitors and retrieve their database IDs
        const compMap = new Map();
        for (const comp of competitors) {
            let compId = null;
            if (comp.cpf) {
                const { data: byCpf } = await supabase.from('rel_competidores')
                    .select('id, cpf')
                    .eq('cpf', comp.cpf)
                    .maybeSingle();
                if (byCpf) {
                    compId = byCpf.id;
                    await supabase.from('rel_competidores').update({ nome: comp.name }).eq('id', compId);
                }
            }

            if (!compId) {
                const { data: byName } = await supabase.from('rel_competidores')
                    .select('id, cpf')
                    .eq('nome', comp.name)
                    .limit(1);
                if (byName && byName.length > 0) {
                    compId = byName[0].id;
                    if (comp.cpf && !byName[0].cpf) {
                        await supabase.from('rel_competidores').update({ cpf: comp.cpf }).eq('id', compId);
                    }
                }
            }

            if (!compId) {
                const { data: newComp, error: insErr } = await supabase.from('rel_competidores')
                    .insert({ nome: comp.name, cpf: comp.cpf || null, cidade: comp.cidade || null })
                    .select('id')
                    .single();
                if (!insErr && newComp) {
                    compId = newComp.id;
                }
            }

            if (compId) {
                compMap.set(comp.name, compId);
                if (comp.cpf) compMap.set(comp.cpf, compId);
            }
        }

        // 3. Insert Cias and Bulls
        const boiadas = ev.boiadas || [];
        const bullMap = new Map();

        const ciasSet = new Set();
        const bullsList = [];

        for (const boiada of boiadas) {
            const ciaName = boiada.nome ? boiada.nome.trim().toUpperCase() : '';
            if (!ciaName) continue;
            ciasSet.add(ciaName);

            const lados = boiada.lados || {};
            const touros = boiada.touros || Object.keys(lados);
            for (const tName of touros) {
                const bullName = tName.trim().toUpperCase();
                if (!bullName || bullName === '__META') continue;
                let lado = lados[tName] || '';
                if (lado) lado = lado.trim();
                bullsList.push({ name: bullName, cia: ciaName, lado });
            }
        }

        for (const nota of notas) {
            const ciaName = nota.cia ? nota.cia.trim().toUpperCase() : '';
            const bullName = nota.touro ? nota.touro.trim().toUpperCase() : '';
            if (ciaName) ciasSet.add(ciaName);
            if (bullName && ciaName) {
                const exists = bullsList.some(b => b.name === bullName && b.cia === ciaName);
                if (!exists) {
                    bullsList.push({ name: bullName, cia: ciaName, lado: '' });
                }
            }
        }

        for (const cia of ciasSet) {
            const { data: existingCia } = await supabase.from('rel_cias')
                .select('id')
                .eq('nome', cia)
                .maybeSingle();
            if (!existingCia) {
                await supabase.from('rel_cias').insert({ nome: cia });
            }
        }

        for (const bull of bullsList) {
            let bullId = null;
            const { data: existingBull } = await supabase.from('rel_touros')
                .select('id')
                .eq('nome', bull.name)
                .eq('cia', bull.cia)
                .maybeSingle();

            if (existingBull) {
                bullId = existingBull.id;
                if (bull.lado) {
                    await supabase.from('rel_touros').update({ lado: bull.lado }).eq('id', bullId);
                }
            } else {
                const { data: newBull, error: bErr } = await supabase.from('rel_touros')
                    .insert({ nome: bull.name, cia: bull.cia, lado: bull.lado || null })
                    .select('id')
                    .single();
                if (!bErr && newBull) {
                    bullId = newBull.id;
                }
            }

            if (bullId) {
                bullMap.set(`${bull.name}#${bull.cia}`, bullId);
            }
        }

        // 4. Insert Montarias
        const montariasToInsert = [];
        for (const nota of notas) {
            const riderName = nota.peao ? nota.peao.trim().toUpperCase() : '';
            const riderCpf = nota.cpf ? nota.cpf.replace(/\D/g, '') : '';
            const bullName = nota.touro ? nota.touro.trim().toUpperCase() : '';
            const ciaName = nota.cia ? nota.cia.trim().toUpperCase() : '';

            if (!riderName) continue;

            const compId = compMap.get(riderCpf) || compMap.get(riderName);
            const bullId = bullMap.get(`${bullName}#${ciaName}`);

            if (!compId) continue;

            const dia = nota.dia || 'DIA 1';
            const tempo = typeof nota.tempo === 'number' ? nota.tempo : parseFloat(nota.tempo) || null;
            const j1_peao = typeof nota.j1_peao === 'number' ? nota.j1_peao : parseFloat(nota.j1_peao) || 0;
            const j2_peao = typeof nota.j2_peao === 'number' ? nota.j2_peao : parseFloat(nota.j2_peao) || 0;
            const j1_touro = typeof nota.j1_touro === 'number' ? nota.j1_touro : parseFloat(nota.j1_touro) || 0;
            const j2_touro = typeof nota.j2_touro === 'number' ? nota.j2_touro : parseFloat(nota.j2_touro) || 0;
            const total_peao = typeof nota.totalPeao === 'number' ? nota.totalPeao : parseFloat(nota.totalPeao) || (j1_peao + j2_peao);
            const total_touro = typeof nota.totalTouro === 'number' ? nota.totalTouro : parseFloat(nota.totalTouro) || (j1_touro + j2_touro);
            const nota_final = total_peao + total_touro;
            const status = nota.status || 'ativa';

            montariasToInsert.push({
                evento_id: relEvId,
                competidor_id: compId,
                touro_id: bullId || null,
                dia,
                tempo,
                j1_peao,
                j2_peao,
                j1_touro,
                j2_touro,
                total_peao,
                total_touro,
                nota_final,
                status
            });
        }

        if (montariasToInsert.length > 0) {
            await supabase.from('rel_montarias').insert(montariasToInsert);
        }

        console.log(`Relational sync completed for event: ${evNome}`);
    } catch (err) {
        console.error("Error in saveEventToRelationalDb:", err);
    }
}

// Envio para o Portal
ipcMain.handle('send-event-to-portal', async (event, { email, eventId }) => {
    try {
        const localData = getLocalData(email);
        const ev = localData.eventos.find(e => e.id === eventId);
        if (!ev) throw new Error("Evento não encontrado localmente.");

        // Buscar nome do diretor
        const { data: userLicense } = await supabase.from('licencas').select('nome').eq('email', email).single();
        const diretorNome = userLicense ? userLicense.nome : email;

        const payload = {
            nome: ev.name,
            data_inicio: ev.days + ' dias',
            data_fim: '',
            local: ev.city,
            organizador_email: email,
            status: 'pendente',
            created_at: new Date().toISOString(),
            detalhes: {
                ranking: ev.peoes || [],
                boiadas: ev.boiadas || [],
                notas: ev.notas || [],
                sorteios: ev.sorteios || [],
                logo: ev.logo || null,
                diretor: diretorNome,
                circuito: ev.circuito || null
            }
        };

        // Verifica se evento já existe
        const { data: existingEvents } = await supabase.from('eventos_oficiais')
            .select('id, status')
            .eq('organizador_email', email)
            .eq('nome', ev.name)
            .order('status', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(1);
            
        const existingEvent = existingEvents && existingEvents.length > 0 ? existingEvents[0] : null;

        if (existingEvent) {
            // Mantém status aprovado se já estiver
            if (existingEvent.status === 'aprovado') {
                payload.status = 'aprovado';
            }
            const { error } = await supabase.from('eventos_oficiais')
                .update(payload)
                .eq('id', existingEvent.id);
            if (error) throw error;
        } else {
            payload.id = require('crypto').randomUUID();
            const { error } = await supabase.from('eventos_oficiais').insert([payload]);
            if (error) throw error;
        }
        
        // Sincroniza dados relacionais no portal
        await saveEventToRelationalDb(supabase, ev, email);
        
        return { success: true };
    } catch (e) {
        console.error("Erro ao enviar portal:", e);
        return { success: false, error: e.message };
    }
});

// Compartilhar evento na nuvem (status 'compartilhado')
ipcMain.handle('share-event-to-cloud', async (event, { email, eventId, password }) => {
    try {
        const localData = getLocalData(email);
        const ev = localData.eventos.find(e => e.id === eventId);
        if (!ev) throw new Error("Evento não encontrado localmente.");

        // Gerar um share_id se não existir no objeto local
        if (!ev.share_id) {
            const cleanName = ev.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const randNum = Math.floor(10000000 + Math.random() * 90000000);
            ev.share_id = `${cleanName}-${randNum}`;
            ev.share_password = password;
            saveLocalData(email, localData);
        } else {
            ev.share_password = password;
            saveLocalData(email, localData);
        }

        const payload = {
            nome: ev.name,
            data_inicio: ev.days + ' dias',
            data_fim: '',
            local: ev.city,
            organizador_email: email,
            status: 'compartilhado',
            detalhes: {
                share_id: ev.share_id,
                share_password: password,
                sport: currentSportSession,
                localData: ev
            }
        };

        // Procurar por evento oficial existente usando o share_id no JSONB detalhes
        const { data: existingEvents } = await supabase.from('eventos_oficiais')
            .select('id')
            .eq('detalhes->>share_id', ev.share_id)
            .limit(1);

        const existingEvent = existingEvents && existingEvents.length > 0 ? existingEvents[0] : null;

        if (existingEvent) {
            const { error } = await supabase.from('eventos_oficiais')
                .update(payload)
                .eq('id', existingEvent.id);
            if (error) throw error;
        } else {
            payload.id = require('crypto').randomUUID();
            const { error } = await supabase.from('eventos_oficiais').insert([payload]);
            if (error) throw error;
        }

        return { success: true, shareId: ev.share_id };
    } catch (e) {
        console.error("Erro ao compartilhar evento na nuvem:", e);
        return { success: false, error: e.message };
    }
});

// Puxar evento existente da nuvem usando ID e Senha
ipcMain.handle('pull-event-from-cloud', async (event, { email, shareId, password }) => {
    try {
        const { data: events, error } = await supabase.from('eventos_oficiais')
            .select('*')
            .eq('detalhes->>share_id', shareId.trim())
            .eq('detalhes->>share_password', password.trim())
            .limit(1);

        if (error) throw error;
        if (!events || events.length === 0) {
            throw new Error("ID do evento ou senha inválidos.");
        }

        const cloudEvent = events[0];
        const localDataObj = cloudEvent.detalhes.localData;
        if (!localDataObj) {
            throw new Error("Dados do evento corrompidos na nuvem.");
        }

        // Adiciona ou atualiza no banco local
        const localData = getLocalData(email, currentSportSession);
        
        // Verifica se já existe localmente
        const existingIndex = localData.eventos.findIndex(e => e.id === localDataObj.id || (e.share_id && e.share_id === localDataObj.share_id));
        
        localDataObj.share_id = shareId;
        localDataObj.share_password = password;

        if (existingIndex > -1) {
            localData.eventos[existingIndex] = localDataObj;
        } else {
            localData.eventos.push(localDataObj);
        }

        saveLocalData(email, localData, currentSportSession);
        return { success: true, eventName: localDataObj.name, sport: currentSportSession };
    } catch (e) {
        console.error("Erro ao importar evento da nuvem:", e);
        return { success: false, error: e.message };
    }
});

// Verificar conexão com banco online
ipcMain.handle('check-db-connection', async () => {
    try {
        const { error } = await supabase.from('perfis_portal').select('id').limit(1);
        if (error) return false;
        return true;
    } catch (e) {
        return false;
    }
});

// Buscar competidores cadastrados online
ipcMain.handle('get-online-competitors', async () => {
    try {
        const { data, error } = await supabase
            .from('perfis_portal')
            .select('nome, cpf, endereco, cargo')
            .in('cargo', ['peao_touros', 'peao_cavalos']);
        
        if (error) throw error;
        return { success: true, competitors: data || [] };
    } catch (e) {
        console.error("Erro ao buscar competidores online:", e);
        return { success: false, error: e.message, competitors: [] };
    }
});

// --- SISTEMA DE OVERLAY (OBS/vMix) ---
const http = require('http');

let overlayWsClients = [];

// Criar Servidor HTTP na porta 3005
const overlayServer = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'overlay.html'), (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Erro ao carregar overlay.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        });
    } else if (req.url.startsWith('/media/')) {
        // Servir arquivos de mídia salvos pelo usuário (logos, vídeos de patrocinadores)
        const mediaDir = path.join(app.getPath('userData'), 'media');
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        
        const fileName = decodeURIComponent(req.url.replace('/media/', ''));
        const filePath = path.join(mediaDir, fileName);
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            let contentType = 'application/octet-stream';
            if (ext === '.png') contentType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            if (ext === '.svg') contentType = 'image/svg+xml';
            if (ext === '.mp4') contentType = 'video/mp4';
            if (ext === '.webm') contentType = 'video/webm';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    } else {
        // Servir assets do app caso o overlay os requisite
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            let contentType = 'text/plain';
            if (ext === '.css') contentType = 'text/css';
            if (ext === '.js') contentType = 'text/javascript';
            if (ext === '.png') contentType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            if (ext === '.svg') contentType = 'image/svg+xml';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        });
    }
});

// Manipuladores de Mídia
ipcMain.handle('upload-media', async (event, sourcePath) => {
    try {
        const mediaDir = path.join(app.getPath('userData'), 'media');
        if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
        
        const fileName = `${Date.now()}_${path.basename(sourcePath)}`;
        const destPath = path.join(mediaDir, fileName);
        
        fs.copyFileSync(sourcePath, destPath);
        return { success: true, url: `/media/${fileName}`, fileName };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('delete-media', async (event, fileName) => {
    try {
        const mediaDir = path.join(app.getPath('userData'), 'media');
        const filePath = path.join(mediaDir, fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Anexar servidor WebSocket ao servidor HTTP
const wssOverlay = new WebSocket.Server({ server: overlayServer });

wssOverlay.on('connection', (ws) => {
    console.log('OBS Overlay Client connected');
    overlayWsClients.push(ws);

    ws.on('close', () => {
        overlayWsClients = overlayWsClients.filter(client => client !== ws);
    });
});

overlayServer.listen(3005, () => {
    console.log('Overlay server running at http://localhost:3005/');
});

// Handler IPC para enviar comandos da Interface Principal para os Overlays
ipcMain.on('send-overlay-command', (event, payload) => {
    const message = JSON.stringify(payload);
    overlayWsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

