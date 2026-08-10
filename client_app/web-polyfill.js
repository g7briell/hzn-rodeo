/**
 * Web Polyfill for HZN RodeoApp Client
 * Enables client_app to run in any standard web browser at web.rodeoapp.pro
 */
(function() {
  if (window.electronAPI) return; // Already running inside Electron desktop app

  console.log('RODEOAPP WEB MODE: Initializing browser polyfill for web.rodeoapp.pro');

  const SUPABASE_APIKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';
  const SUPABASE_HEADERS = {
    'apikey': SUPABASE_APIKEY,
    'Authorization': 'Bearer ' + SUPABASE_APIKEY,
    'Content-Type': 'application/json'
  };

  function getLocalHWID() {
    let hwid = localStorage.getItem('hzn_web_hwid');
    if (!hwid) {
      hwid = 'WEB-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('hzn_web_hwid', hwid);
    }
    return hwid;
  }

  function getStorageKey(email, key) {
    const cleanEmail = (email || 'anonymous').toLowerCase().trim();
    return `hzn_${cleanEmail}_${key}`;
  }

  window.electronAPI = {
    getAppVersion: async () => '1.0.112 Web',
    getHWID: async () => getLocalHWID(),
    
    validateLicense: async (payload) => {
      try {
        const cleanEmail = (payload.email || '').trim().toLowerCase();
        const cleanKey = (payload.key || '').trim().toUpperCase();
        const hwid = payload.hwid || getLocalHWID();

        const url = `https://api.rodeoapp.pro/rest/v1/licencas?select=*&email=ilike.${encodeURIComponent(cleanEmail)}&key_code=eq.${encodeURIComponent(cleanKey)}`;
        const res = await fetch(url, { headers: SUPABASE_HEADERS });
        const dataList = await res.json();

        if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
          return { success: false, message: 'E-mail ou Chave inválidos.' };
        }

        let data = dataList[0];

        if (!data.is_active) {
          return { success: false, message: 'Esta licença foi desativada.' };
        }

        if (data.data_ativacao) {
          const expiry = new Date(data.data_ativacao);
          expiry.setDate(expiry.getDate() + (data.dias_validos || 30));
          if (expiry.getTime() < new Date().getTime()) {
            return { success: false, message: 'Plano expirado. Renove sua licença.' };
          }
        }

        if (!data.is_used) {
          const patchRes = await fetch(`https://api.rodeoapp.pro/rest/v1/licencas?id=eq.${data.id}`, {
            method: 'PATCH',
            headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              is_used: true,
              hwid: hwid,
              data_ativacao: new Date().toISOString(),
              app_version: 'Web'
            })
          });
          const updated = await patchRes.json();
          if (updated && Array.isArray(updated) && updated.length > 0) data = updated[0];
        }

        return {
          success: true,
          data: data
        };
      } catch (err) {
        console.error('Web validateLicense error:', err);
        return { success: false, message: 'Erro ao conectar ao servidor de licenças.' };
      }
    },

    sendHeartbeat: async (payload) => {
      try {
        const cleanEmail = (payload.email || '').trim().toLowerCase();
        const cleanKey = (payload.key || '').trim().toUpperCase();
        if (!cleanEmail || !cleanKey) return { valid: true };

        const url = `https://api.rodeoapp.pro/rest/v1/licencas?select=is_active,dias_validos,data_ativacao,esportes&email=ilike.${encodeURIComponent(cleanEmail)}&key_code=eq.${encodeURIComponent(cleanKey)}`;
        const res = await fetch(url, { headers: SUPABASE_HEADERS });
        const dataList = await res.json();

        if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
          return { valid: false, reason: 'deleted' };
        }
        const data = dataList[0];
        if (!data.is_active) {
          return { valid: false, reason: 'disabled' };
        }
        return { valid: true, data: data };
      } catch (err) {
        return { valid: true };
      }
    },
    onLicenseRealtimeUpdate: (callback) => {},
    onLicenseBroadcastSignal: (callback) => {},

    saveAuth: async (data) => {
      try { localStorage.setItem('hzn_auth', JSON.stringify(data)); } catch (e) {}
      return { success: true };
    },
    getAuth: () => {
      try {
        const local = localStorage.getItem('hzn_auth');
        if (local) return JSON.parse(local);
      } catch (e) {}
      return null;
    },
    clearAuth: async () => {
      try { localStorage.removeItem('hzn_auth'); } catch (e) {}
      return { success: true };
    },

    setCurrentSport: async (sport) => ({ success: true }),

    // Local Storage Events DB for Web Mode
    getLocalEvents: async (email) => {
      try {
        const key = getStorageKey(email, 'events');
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    saveLocalEvent: async ({ email, newEvent }) => {
      try {
        const key = getStorageKey(email, 'events');
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        current.push(newEvent);
        localStorage.setItem(key, JSON.stringify(current));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    updateLocalEvent: async ({ email, updatedEvent, id }) => {
      try {
        const key = getStorageKey(email, 'events');
        let current = JSON.parse(localStorage.getItem(key) || '[]');
        const targetId = (updatedEvent && updatedEvent.id) || id;
        current = current.map(ev => (ev.id === targetId) ? (updatedEvent || ev) : ev);
        localStorage.setItem(key, JSON.stringify(current));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    deleteLocalEvent: async ({ email, id }) => {
      try {
        const key = getStorageKey(email, 'events');
        let current = JSON.parse(localStorage.getItem(key) || '[]');
        current = current.filter(ev => ev.id !== id);
        localStorage.setItem(key, JSON.stringify(current));
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    // Global Data (Peões and Boiadas)
    getGlobalData: async (email) => {
      try {
        const key = getStorageKey(email, 'global_data');
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : { peoes: [], boiadas: [] };
      } catch (e) {
        return { peoes: [], boiadas: [] };
      }
    },
    saveGlobalPeao: async ({ email, peao }) => {
      const key = getStorageKey(email, 'global_data');
      const data = JSON.parse(localStorage.getItem(key) || '{"peoes":[],"boiadas":[]}');
      if (!data.peoes) data.peoes = [];
      data.peoes.push(peao);
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    },
    saveGlobalBoiada: async ({ email, boiada }) => {
      const key = getStorageKey(email, 'global_data');
      const data = JSON.parse(localStorage.getItem(key) || '{"peoes":[],"boiadas":[]}');
      if (!data.boiadas) data.boiadas = [];
      data.boiadas.push(boiada);
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    },
    updateGlobalPeao: async ({ email, index, peao }) => {
      const key = getStorageKey(email, 'global_data');
      const data = JSON.parse(localStorage.getItem(key) || '{"peoes":[],"boiadas":[]}');
      if (data.peoes && data.peoes[index]) data.peoes[index] = peao;
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    },
    deleteGlobalPeao: async ({ email, index }) => {
      const key = getStorageKey(email, 'global_data');
      const data = JSON.parse(localStorage.getItem(key) || '{"peoes":[],"boiadas":[]}');
      if (data.peoes) data.peoes.splice(index, 1);
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    },
    updateGlobalBoiada: async ({ email, index, boiada }) => {
      const key = getStorageKey(email, 'global_data');
      const data = JSON.parse(localStorage.getItem(key) || '{"peoes":[],"boiadas":[]}');
      if (data.boiadas && data.boiadas[index]) data.boiadas[index] = boiada;
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    },
    deleteGlobalBoiada: async ({ email, index }) => {
      const key = getStorageKey(email, 'global_data');
      const data = JSON.parse(localStorage.getItem(key) || '{"peoes":[],"boiadas":[]}');
      if (data.boiadas) data.boiadas.splice(index, 1);
      localStorage.setItem(key, JSON.stringify(data));
      return { success: true };
    },
    updateProfileName: async ({ email, newName }) => {
      const auth = window.electronAPI.getAuth() || {};
      auth.nome = newName;
      localStorage.setItem('hzn_auth', JSON.stringify(auth));
      return { success: true };
    },

    // Auto Updater Stubs in Web Mode
    checkForUpdates: async () => {},
    downloadUpdate: async () => {},
    quitAndInstall: async () => {},
    onUpdaterEvent: (callback) => {},

    // Exports and Tools
    getAppLogo: async () => '',
    getPdfLogo: async () => '',
    exportSorteioExcel: async () => { window.print(); return { success: true }; },
    exportBoiadasExcel: async () => { window.print(); return { success: true }; },
    exportJuizesExcel: async () => { window.print(); return { success: true }; },
    exportOrdemExcel: async () => { window.print(); return { success: true }; },
    exportRankingExcel: async () => { window.print(); return { success: true }; },
    exportPDF: async () => { window.print(); return { success: true }; },
    exportContracts: async () => { alert('Exportação de contratos é exclusiva do App Desktop.'); return { success: false }; },
    exportMelhorCia: async () => { window.print(); return { success: true }; },
    exportMelhorAnimal: async () => { window.print(); return { success: true }; },
    sendEventToPortal: async () => ({ success: true }),
    checkDbConnection: async () => ({ success: true }),
    getOnlineCompetitors: async () => [],
    shareEventToCloud: async () => ({ success: true }),
    pullEventFromCloud: async () => ({ success: false, message: 'Recurso disponível na versão desktop.' }),
    sendOverlayCommand: () => {},
    uploadMedia: async () => ({ success: false }),
    deleteMedia: async () => ({ success: true }),
    updateTabletConfig: async () => ({ success: true })
  };
})();
