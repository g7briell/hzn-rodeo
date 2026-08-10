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
    syncUserCloudEvents: async (email) => {
      try {
        const cleanEmail = (email || '').trim();
        if (!cleanEmail) return { success: false, error: "Email do usuário não informado." };

        const url = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=*&or=(organizador_email.eq.${encodeURIComponent(cleanEmail)},status.eq.compartilhado)&limit=200`;
        const res = await fetch(url, { headers: SUPABASE_HEADERS });
        if (!res.ok) {
          throw new Error(`Erro no servidor de banco de dados (${res.status} ${res.statusText})`);
        }
        const cloudEvents = await res.json();

        const key = getStorageKey(cleanEmail, 'events');
        let localEvents = JSON.parse(localStorage.getItem(key) || '[]');

        if (Array.isArray(cloudEvents)) {
          cloudEvents.forEach(cloudEv => {
            if (cloudEv.detalhes && cloudEv.detalhes.localData) {
              const cloudLocal = cloudEv.detalhes.localData;
              const idx = localEvents.findIndex(l => l.id === cloudLocal.id || (l.share_id && cloudEv.detalhes.share_id && l.share_id === cloudEv.detalhes.share_id));
              if (idx > -1) {
                localEvents[idx] = { ...localEvents[idx], ...cloudLocal };
              } else if (cloudEv.organizador_email === cleanEmail) {
                localEvents.push(cloudLocal);
              }
            }
          });
          localStorage.setItem(key, JSON.stringify(localEvents));
        }

        return { success: true };
      } catch (e) {
        console.error("Erro em syncUserCloudEvents (web):", e);
        return { success: false, error: e.message || String(e) };
      }
    },
    saveLocalEvent: async ({ email, newEvent }) => {
      try {
        const key = getStorageKey(email, 'events');
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        current.push(newEvent);
        localStorage.setItem(key, JSON.stringify(current));

        const sanitizedEv = JSON.parse(JSON.stringify(newEvent));
        if (sanitizedEv.overlaySettings) delete sanitizedEv.overlaySettings.mediaData;

        const payload = {
          id: 'web-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8),
          nome: newEvent.name,
          data_inicio: (newEvent.days || '3') + ' dias',
          data_fim: '',
          local: newEvent.city || '',
          organizador_email: email,
          status: newEvent.share_id ? 'compartilhado' : 'ativo',
          detalhes: {
            share_id: newEvent.share_id || '',
            share_password: newEvent.share_password || '',
            sport: 'rodeio',
            localData: sanitizedEv
          }
        };

        fetch('https://api.rodeoapp.pro/rest/v1/eventos_oficiais', {
          method: 'POST',
          headers: SUPABASE_HEADERS,
          body: JSON.stringify(payload)
        }).catch(err => console.error("Cloud push background error:", err));

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

        if (updatedEvent) {
          const sanitizedEv = JSON.parse(JSON.stringify(updatedEvent));
          if (sanitizedEv.overlaySettings) delete sanitizedEv.overlaySettings.mediaData;

          const payload = {
            nome: updatedEvent.name,
            local: updatedEvent.city || '',
            organizador_email: email,
            detalhes: {
              share_id: updatedEvent.share_id || '',
              share_password: updatedEvent.share_password || '',
              sport: 'rodeio',
              localData: sanitizedEv
            }
          };

          const checkUrl = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&organizador_email=eq.${encodeURIComponent(email)}&nome=ilike.${encodeURIComponent(updatedEvent.name.trim())}&limit=1`;
          fetch(checkUrl, { headers: SUPABASE_HEADERS })
            .then(res => res.json())
            .then(list => {
              if (list && list.length > 0) {
                fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?id=eq.${list[0].id}`, {
                  method: 'PATCH',
                  headers: SUPABASE_HEADERS,
                  body: JSON.stringify(payload)
                });
              }
            }).catch(err => console.error("Cloud patch background error:", err));
        }

        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
    deleteLocalEvent: async ({ email, id }) => {
      try {
        const key = getStorageKey(email, 'events');
        let current = JSON.parse(localStorage.getItem(key) || '[]');
        const target = current.find(ev => ev.id === id);
        current = current.filter(ev => ev.id !== id);
        localStorage.setItem(key, JSON.stringify(current));

        if (target) {
          const checkUrl = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?organizador_email=eq.${encodeURIComponent(email)}&nome=ilike.${encodeURIComponent(target.name.trim())}`;
          fetch(checkUrl, { method: 'DELETE', headers: SUPABASE_HEADERS })
            .catch(err => console.error("Cloud delete background error:", err));
        }

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
    shareEventToCloud: async ({ email, eventId, password }) => {
      try {
        const events = await window.electronAPI.getLocalEvents(email);
        const ev = events.find(e => e.id === eventId);
        if (!ev) throw new Error("Evento não encontrado localmente.");

        if (!ev.share_id) {
          const cleanName = ev.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const randNum = Math.floor(10000000 + Math.random() * 90000000);
          ev.share_id = `${cleanName}-${randNum}`;
          ev.share_password = password;
          await window.electronAPI.updateLocalEvent({ email, updatedEvent: ev, id: ev.id });
        } else {
          ev.share_password = password;
          await window.electronAPI.updateLocalEvent({ email, updatedEvent: ev, id: ev.id });
        }

        const sanitizedEv = JSON.parse(JSON.stringify(ev));
        if (sanitizedEv.overlaySettings) {
          delete sanitizedEv.overlaySettings.mediaData;
        }

        const payload = {
          nome: ev.name,
          data_inicio: (ev.days || '3') + ' dias',
          data_fim: '',
          local: ev.city || '',
          organizador_email: email,
          status: 'compartilhado',
          detalhes: {
            share_id: ev.share_id,
            share_password: password,
            sport: 'rodeio',
            localData: sanitizedEv
          }
        };

        const checkUrl = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&organizador_email=eq.${encodeURIComponent(email)}&nome=ilike.${encodeURIComponent(ev.name.trim())}&limit=1`;
        const checkRes = await fetch(checkUrl, { headers: SUPABASE_HEADERS });
        const checkList = await checkRes.json();

        let existingId = (checkList && checkList.length > 0) ? checkList[0].id : null;

        if (existingId) {
          await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?id=eq.${existingId}`, {
            method: 'PATCH',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify(payload)
          });
        } else {
          payload.id = 'web-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
          await fetch('https://api.rodeoapp.pro/rest/v1/eventos_oficiais', {
            method: 'POST',
            headers: SUPABASE_HEADERS,
            body: JSON.stringify(payload)
          });
        }

        return { success: true, shareId: ev.share_id };
      } catch (e) {
        console.error("Erro ao compartilhar evento na nuvem (web):", e);
        return { success: false, error: e.message };
      }
    },
    pullEventFromCloud: async ({ email, shareId, password }) => {
      try {
        const cleanShareId = (shareId || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();

        if (!cleanShareId || !cleanPass) {
          throw new Error("Por favor, preencha o ID do evento e a Senha.");
        }

        const url = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=*&status=eq.compartilhado&order=created_at.desc&limit=200`;
        const res = await fetch(url, { headers: SUPABASE_HEADERS });
        const list = await res.json();

        if (!list || !Array.isArray(list)) {
          throw new Error("Falha ao conectar com o banco de dados na nuvem.");
        }

        const cloudEvent = list.find(e => {
          const det = e.detalhes || {};
          const sId = String(det.share_id || '').trim().toLowerCase();
          const sPass = String(det.share_password || '').trim();
          return sId === cleanShareId && sPass === cleanPass;
        });

        if (!cloudEvent || !cloudEvent.detalhes || !cloudEvent.detalhes.localData) {
          throw new Error("ID do evento ou senha inválidos.");
        }

        const localDataObj = cloudEvent.detalhes.localData;
        localDataObj.share_id = shareId.trim();
        localDataObj.share_password = password.trim();

        const events = await window.electronAPI.getLocalEvents(email);
        const existingIdx = events.findIndex(e => e.id === localDataObj.id || (e.share_id && e.share_id.toLowerCase() === cleanShareId));

        if (existingIdx > -1) {
          events[existingIdx] = localDataObj;
          await window.electronAPI.updateLocalEvent({ email, updatedEvent: localDataObj, id: localDataObj.id });
        } else {
          await window.electronAPI.saveLocalEvent({ email, newEvent: localDataObj });
        }

        return { success: true, eventName: localDataObj.name };
      } catch (e) {
        console.error("Erro ao importar evento da nuvem (web):", e);
        return { success: false, error: e.message || String(e) };
      }
    },
    sendOverlayCommand: () => {},
    uploadMedia: async () => ({ success: false }),
    deleteMedia: async () => ({ success: true }),
    updateTabletConfig: async () => ({ success: true })
  };
})();
