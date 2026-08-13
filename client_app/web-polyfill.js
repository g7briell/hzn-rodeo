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

  const CURRENT_WEB_VERSION = '1.0.135';

  window.electronAPI = {
    getAppVersion: async () => CURRENT_WEB_VERSION + ' Web',
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
              app_version: CURRENT_WEB_VERSION + ' Web'
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
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) return { success: false, error: "Email do usuário não informado." };

        const url = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=*&or=(organizador_email.ilike.${encodeURIComponent(cleanEmail)},status.eq.compartilhado)&order=created_at.desc&limit=500`;
        const res = await fetch(url, { headers: SUPABASE_HEADERS });
        if (!res.ok) {
          throw new Error(`Erro no servidor de banco de dados (${res.status} ${res.statusText})`);
        }
        const cloudEvents = await res.json();

        const key = getStorageKey(cleanEmail, 'events');
        let localEvents = JSON.parse(localStorage.getItem(key) || '[]');

        if (Array.isArray(cloudEvents)) {
          cloudEvents.forEach(cloudEv => {
            let cloudLocal = null;
            if (cloudEv.detalhes && cloudEv.detalhes.localData) {
              cloudLocal = cloudEv.detalhes.localData;
            } else {
              cloudLocal = {
                id: cloudEv.id,
                name: cloudEv.nome || 'Evento',
                city: cloudEv.local || '',
                days: parseInt(cloudEv.data_inicio) || 3,
                judges: (cloudEv.detalhes && cloudEv.detalhes.juizes) ? cloudEv.detalhes.juizes.length : 2,
                peoes: (cloudEv.detalhes && (cloudEv.detalhes.peoes || cloudEv.detalhes.ranking)) || [],
                boiadas: (cloudEv.detalhes && cloudEv.detalhes.boiadas) || [],
                juizes: (cloudEv.detalhes && cloudEv.detalhes.juizes) || [],
                sorteios: (cloudEv.detalhes && cloudEv.detalhes.sorteios) || [],
                notas: (cloudEv.detalhes && cloudEv.detalhes.notas) || [],
                share_id: (cloudEv.detalhes && cloudEv.detalhes.share_id) || '',
                share_password: (cloudEv.detalhes && cloudEv.detalhes.share_password) || ''
              };
            }

            const idx = localEvents.findIndex(l => 
              (l.id && cloudLocal.id && String(l.id) === String(cloudLocal.id)) ||
              (l.id && cloudEv.id && String(l.id) === String(cloudEv.id)) ||
              (l.share_id && cloudEv.detalhes && cloudEv.detalhes.share_id && l.share_id === cloudEv.detalhes.share_id) ||
              (l.name && cloudLocal.name && l.name.trim().toLowerCase() === cloudLocal.name.trim().toLowerCase())
            );

            if (idx > -1) {
              const localEv = localEvents[idx];
              const merged = { ...cloudLocal, ...localEv };

              if (Array.isArray(localEv.peoes) || Array.isArray(cloudLocal.peoes)) {
                const peaoMap = new Map();
                (localEv.peoes || []).forEach(p => peaoMap.set((p.id || p.nome || '').trim().toLowerCase(), p));
                (cloudLocal.peoes || []).forEach(p => {
                  const k = (p.id || p.nome || '').trim().toLowerCase();
                  if (peaoMap.has(k)) peaoMap.set(k, { ...peaoMap.get(k), ...p });
                  else peaoMap.set(k, p);
                });
                merged.peoes = Array.from(peaoMap.values());
              }

              if (Array.isArray(localEv.boiadas) || Array.isArray(cloudLocal.boiadas)) {
                const boiadaMap = new Map();
                (localEv.boiadas || []).forEach(b => boiadaMap.set((b.nome || '').trim().toLowerCase(), b));
                (cloudLocal.boiadas || []).forEach(b => {
                  const k = (b.nome || '').trim().toLowerCase();
                  if (boiadaMap.has(k)) {
                    const ex = boiadaMap.get(k);
                    const allT = Array.from(new Set([...(ex.touros || []), ...(b.touros || [])]));
                    boiadaMap.set(k, { ...ex, ...b, touros: allT });
                  } else boiadaMap.set(k, b);
                });
                merged.boiadas = Array.from(boiadaMap.values());
              }

              if (Array.isArray(localEv.juizes) || Array.isArray(cloudLocal.juizes)) {
                const jMap = new Map();
                (localEv.juizes || []).forEach(j => {
                  const name = typeof j === 'string' ? j : (j.nome || '');
                  if (name) jMap.set(name.trim().toLowerCase(), typeof j === 'string' ? { nome: name } : j);
                });
                (cloudLocal.juizes || []).forEach(j => {
                  const name = typeof j === 'string' ? j : (j.nome || '');
                  if (name) jMap.set(name.trim().toLowerCase(), typeof j === 'string' ? { nome: name } : j);
                });
                merged.juizes = Array.from(jMap.values());
              }

              if (Array.isArray(localEv.sorteios) || Array.isArray(cloudLocal.sorteios)) {
                const sMap = new Map();
                (localEv.sorteios || []).forEach(s => sMap.set((s.day || s.date || '').trim().toLowerCase(), s));
                (cloudLocal.sorteios || []).forEach(s => sMap.set((s.day || s.date || '').trim().toLowerCase(), s));
                merged.sorteios = Array.from(sMap.values());
              }

              if (Array.isArray(localEv.notas) || Array.isArray(cloudLocal.notas)) {
                const nMap = new Map();
                (localEv.notas || []).forEach(n => nMap.set(`${n.day || n.dia}_${n.peaoNome || n.peao}_${n.juiz || ''}`.trim().toLowerCase(), n));
                (cloudLocal.notas || []).forEach(n => nMap.set(`${n.day || n.dia}_${n.peaoNome || n.peao}_${n.juiz || ''}`.trim().toLowerCase(), n));
                merged.notas = Array.from(nMap.values());
              }

              localEvents[idx] = merged;
            } else {
              localEvents.push(cloudLocal);
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
    saveLocalEvent: async (arg1, arg2) => {
      try {
        let email = '';
        let newEvent = null;

        if (typeof arg1 === 'object' && arg1 !== null) {
          email = arg1.email;
          newEvent = arg1.newEvent || arg1.eventData || arg1.updatedEvent;
        } else {
          email = arg1;
          newEvent = arg2;
        }

        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail || !newEvent) return { success: false, error: "Dados inválidos para salvar evento." };

        const eventToSave = {
          ...newEvent,
          id: newEvent.id || ('web_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7)),
          created_at: newEvent.created_at || new Date().toISOString()
        };

        const key = getStorageKey(cleanEmail, 'events');
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        
        const existingIdx = current.findIndex(e => (e.id && String(e.id) === String(eventToSave.id)) || (e.name && eventToSave.name && e.name.toLowerCase() === eventToSave.name.toLowerCase()));
        if (existingIdx > -1) {
          current[existingIdx] = eventToSave;
        } else {
          current.push(eventToSave);
        }
        localStorage.setItem(key, JSON.stringify(current));

        const sanitizedEv = JSON.parse(JSON.stringify(eventToSave));
        if (sanitizedEv.overlaySettings) delete sanitizedEv.overlaySettings.mediaData;

        const payload = {
          nome: newEvent.name,
          data_inicio: (newEvent.days || '3') + ' dias',
          data_fim: '',
          local: newEvent.city || '',
          organizador_email: cleanEmail,
          status: newEvent.share_id ? 'compartilhado' : 'ativo',
          detalhes: {
            share_id: newEvent.share_id || '',
            share_password: newEvent.share_password || '',
            sport: 'rodeio',
            localData: sanitizedEv
          }
        };

        let targetRecordId = null;
        if (newEvent.id && /^[0-9a-f-]{36}$/i.test(String(newEvent.id))) {
          const checkRes = await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&id=eq.${encodeURIComponent(newEvent.id)}&limit=1`, { headers: SUPABASE_HEADERS });
          const checkList = await checkRes.json();
          if (checkList && checkList.length > 0) targetRecordId = checkList[0].id;
        }
        if (!targetRecordId && newEvent.share_id) {
          const checkRes = await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&detalhes->>share_id=eq.${encodeURIComponent(newEvent.share_id)}&limit=1`, { headers: SUPABASE_HEADERS });
          const checkList = await checkRes.json();
          if (checkList && checkList.length > 0) targetRecordId = checkList[0].id;
        }
        if (!targetRecordId) {
          const checkUrl = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&organizador_email=ilike.${encodeURIComponent(cleanEmail)}&nome=ilike.${encodeURIComponent(newEvent.name.trim())}&order=created_at.desc&limit=1`;
          const checkRes = await fetch(checkUrl, { headers: SUPABASE_HEADERS });
          const checkList = await checkRes.json();
          if (checkList && checkList.length > 0) targetRecordId = checkList[0].id;
        }

        if (targetRecordId) {
          await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?id=eq.${targetRecordId}`, {
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

        return { success: true };
      } catch (e) {
        console.error("Erro em saveLocalEvent (web):", e);
        return { success: false, error: e.message };
      }
    },
    updateLocalEvent: async (arg1, arg2, arg3) => {
      try {
        let email = '';
        let updatedEvent = null;

        if (typeof arg1 === 'object' && arg1 !== null) {
          email = arg1.email;
          updatedEvent = arg1.updatedEvent || arg1.newEvent || arg1.eventData;
        } else if (typeof arg2 === 'object' && arg2 !== null) {
          email = arg1;
          updatedEvent = arg2;
        } else {
          email = arg1;
          updatedEvent = arg3;
        }

        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail || !updatedEvent) return { success: false, error: "Dados inválidos para atualizar evento." };

        const key = getStorageKey(cleanEmail, 'events');
        let current = JSON.parse(localStorage.getItem(key) || '[]');
        const targetId = updatedEvent.id;
        
        let found = false;
        current = current.map(ev => {
          if (String(ev.id) === String(targetId) || (ev.name && updatedEvent.name && ev.name.toLowerCase() === updatedEvent.name.toLowerCase())) {
            found = true;
            return updatedEvent;
          }
          return ev;
        });

        if (!found) {
          current.push(updatedEvent);
        }

        localStorage.setItem(key, JSON.stringify(current));

        const sanitizedEv = JSON.parse(JSON.stringify(updatedEvent));
        if (sanitizedEv.overlaySettings) delete sanitizedEv.overlaySettings.mediaData;

        const payload = {
          nome: updatedEvent.name,
          local: updatedEvent.city || '',
          organizador_email: cleanEmail,
          status: updatedEvent.share_id ? 'compartilhado' : 'ativo',
          detalhes: {
            share_id: updatedEvent.share_id || '',
            share_password: updatedEvent.share_password || '',
            sport: 'rodeio',
            localData: sanitizedEv
          }
        };

        let targetRecordId = null;
        if (updatedEvent.id && /^[0-9a-f-]{36}$/i.test(String(updatedEvent.id))) {
          const checkRes = await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&id=eq.${encodeURIComponent(updatedEvent.id)}&limit=1`, { headers: SUPABASE_HEADERS });
          const checkList = await checkRes.json();
          if (checkList && checkList.length > 0) targetRecordId = checkList[0].id;
        }
        if (!targetRecordId && updatedEvent.share_id) {
          const checkRes = await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&detalhes->>share_id=eq.${encodeURIComponent(updatedEvent.share_id)}&limit=1`, { headers: SUPABASE_HEADERS });
          const checkList = await checkRes.json();
          if (checkList && checkList.length > 0) targetRecordId = checkList[0].id;
        }
        if (!targetRecordId) {
          const checkUrl = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?select=id&organizador_email=ilike.${encodeURIComponent(cleanEmail)}&nome=ilike.${encodeURIComponent(updatedEvent.name.trim())}&order=created_at.desc&limit=1`;
          const checkRes = await fetch(checkUrl, { headers: SUPABASE_HEADERS });
          const checkList = await checkRes.json();
          if (checkList && checkList.length > 0) targetRecordId = checkList[0].id;
        }

        if (targetRecordId) {
          await fetch(`https://api.rodeoapp.pro/rest/v1/eventos_oficiais?id=eq.${targetRecordId}`, {
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

        return { success: true };
      } catch (e) {
        console.error("Erro em updateLocalEvent (web):", e);
        return { success: false, error: e.message };
      }
    },
    deleteLocalEvent: async (arg1, arg2) => {
      try {
        let email = '';
        let targetId = '';

        if (typeof arg1 === 'object' && arg1 !== null) {
          email = arg1.email;
          targetId = arg1.id;
        } else {
          email = arg1;
          targetId = arg2;
        }

        const cleanEmail = (email || '').trim();
        const key = getStorageKey(cleanEmail, 'events');
        let current = JSON.parse(localStorage.getItem(key) || '[]');
        const target = current.find(ev => ev.id === targetId);
        current = current.filter(ev => ev.id !== targetId);
        localStorage.setItem(key, JSON.stringify(current));

        if (target) {
          const checkUrl = `https://api.rodeoapp.pro/rest/v1/eventos_oficiais?organizador_email=eq.${encodeURIComponent(cleanEmail)}&nome=ilike.${encodeURIComponent(target.name.trim())}`;
          await fetch(checkUrl, { method: 'DELETE', headers: SUPABASE_HEADERS });
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

    exportPDF: async ({ htmlContent, defaultName }) => {
      try {
        const filename = defaultName || 'Relatorio.pdf';
        const isLandscape = htmlContent.includes('size: landscape') || htmlContent.includes('landscape');

        // Carrega html2pdf dinamicamente se necessário
        if (typeof window.html2pdf !== 'function') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          });
        }

        if (typeof window.html2pdf === 'function') {
          const container = document.createElement('div');
          container.id = 'pdf-render-temp-container';
          container.style.position = 'fixed';
          container.style.top = '0';
          container.style.left = '0';
          container.style.width = isLandscape ? '1120px' : '820px';
          container.style.zIndex = '9999999';
          container.style.backgroundColor = '#ffffff';
          container.style.color = '#000000';
          container.style.padding = '15px';
          container.style.overflow = 'visible';

          // Parseia o HTML recebido para extrair styles e body
          const parser = new DOMParser();
          const parsedDoc = parser.parseFromString(htmlContent, 'text/html');

          // Clona todos os elementos de style
          const styles = parsedDoc.querySelectorAll('style');
          styles.forEach(st => container.appendChild(st.cloneNode(true)));

          // Clona todos os nós filhos do body
          const bodyNodes = parsedDoc.body.childNodes;
          Array.from(bodyNodes).forEach(node => container.appendChild(node.cloneNode(true)));

          document.body.appendChild(container);

          // Aguarda reflow do navegador
          await new Promise(r => setTimeout(r, 350));

          const opt = {
            margin: [4, 4, 4, 4],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
              scale: 2, 
              useCORS: true, 
              letterRendering: true, 
              backgroundColor: '#ffffff',
              scrollY: 0,
              scrollX: 0,
              windowWidth: isLandscape ? 1200 : 900
            },
            jsPDF: { 
              unit: 'mm', 
              format: 'a4', 
              orientation: isLandscape ? 'landscape' : 'portrait' 
            }
          };

          // Gera o Blob garantindo que a compilação esteja 100% concluída antes de remover o container
          const pdfBlob = await window.html2pdf().set(opt).from(container).output('blob');

          // Cria link de download e dispara o salvamento do arquivo
          const blobUrl = URL.createObjectURL(pdfBlob);
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = filename;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

          // Remove o container apenas após o arquivo ser gerado
          if (document.body.contains(container)) document.body.removeChild(container);
          return { success: true };
        }

        // Fallback limpo: cria iframe isolado com APENAS o relatório (sem overlay de "Gerando PDF")
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          }, 3000);
        }, 500);

        return { success: true };
      } catch (err) {
        console.error('Erro ao gerar PDF na web:', err);
        return { success: false, message: err.message || String(err) };
      }
    },

    exportSorteioExcel: async (payload) => {
      try {
        if (typeof window.XLSX === 'undefined') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          });
        }

        const sorteioData = payload.sorteioData || payload;
        const eventName = sorteioData.eventName || 'Evento';
        const day = sorteioData.day || 'Dia';
        
        if (typeof window.XLSX !== 'undefined') {
          const rows = [
            ["RODEOAPP - RELATÓRIO OFICIAL DE SORTEIO"],
            ["EVENTO:", eventName, "ETAPA / DIA:", day],
            [],
            ["ORDEM", "COMPETIDOR", "CIDADE / UF", "TOURO", "COMPANHIA", "LADO"]
          ];

          const riders = sorteioData.riders || [];
          const bulls = sorteioData.bulls || [];
          const assignments = sorteioData.assignments || {};

          riders.forEach((rider, idx) => {
            const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
            const bull = bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };
            rows.push([
              idx + 1,
              rider.nome || '',
              rider.cidade || '',
              bull.nome || '',
              bull.cia || '',
              bull.lado || ''
            ]);
          });

          if (bulls.length > riders.length) {
            rows.push([]);
            rows.push(["--- TOUROS DE RE-RIDE / RESERVAS ---"]);
            rows.push(["Nº", "TOURO", "COMPANHIA", "LADO"]);
            for (let i = riders.length; i < bulls.length; i++) {
              const b = bulls[i];
              rows.push([
                `R${i - riders.length + 1}`,
                b.nome || '',
                b.cia || '',
                b.lado || ''
              ]);
            }
          }

          const ws = window.XLSX.utils.aoa_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, "Sorteio");
          window.XLSX.writeFile(wb, `Sorteio_${eventName.replace(/\s+/g, '_')}_${day.replace(/\s+/g, '_')}.xlsx`);
          return { success: true };
        }

        return { success: false, message: 'Biblioteca de Excel não carregada.' };
      } catch (err) {
        console.error('Erro ao gerar Excel de Sorteio:', err);
        return { success: false, message: err.message };
      }
    },

    exportBoiadasExcel: async (payload) => {
      try {
        if (typeof window.XLSX === 'undefined') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          });
        }

        const sorteioData = payload.sorteioData || payload;
        const day = sorteioData.day || 'Dia';
        const bulls = sorteioData.bulls || [];

        if (typeof window.XLSX !== 'undefined') {
          const rows = [
            ["RODEOAPP - LISTA DE BOIADA / TOUROS"],
            ["ETAPA / DIA:", day],
            [],
            ["Nº", "TOURO", "COMPANHIA", "LADO"]
          ];

          bulls.forEach((b, idx) => {
            rows.push([idx + 1, b.nome || '', b.cia || '', b.lado || '']);
          });

          const ws = window.XLSX.utils.aoa_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, "Boiada");
          window.XLSX.writeFile(wb, `Boiada_${day.replace(/\s+/g, '_')}.xlsx`);
          return { success: true };
        }

        return { success: false, message: 'Biblioteca de Excel não carregada.' };
      } catch (err) {
        console.error('Erro ao gerar Excel de Boiadas:', err);
        return { success: false, message: err.message };
      }
    },

    exportJuizesExcel: async ({ sorteioData, eventName, day, juizNome }) => {
      try {
        if (typeof window.XLSX === 'undefined') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          });
        }

        if (typeof window.XLSX !== 'undefined') {
          const rows = [
            ["RODEOAPP - PLANILHA DE NOTAS DO JUIZ"],
            ["JUIZ:", (juizNome || 'JUIZ').toUpperCase(), "EVENTO:", eventName || '', "DIA:", day || ''],
            [],
            ["ORDEM", "COMPETIDOR", "CIDADE", "TOURO", "COMPANHIA", "LADO", "NOTA PEÃO", "NOTA TOURO", "TOTAL"]
          ];

          const riders = sorteioData.riders || [];
          const bulls = sorteioData.bulls || [];
          const assignments = sorteioData.assignments || {};

          riders.forEach((rider, idx) => {
            const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
            const bull = bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };
            rows.push([
              idx + 1,
              rider.nome || '',
              rider.cidade || '',
              bull.nome || '',
              bull.cia || '',
              bull.lado || '',
              '', '', ''
            ]);
          });

          const ws = window.XLSX.utils.aoa_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, "Notas Juiz");
          window.XLSX.writeFile(wb, `Juiz_${(juizNome || 'Juiz').replace(/\s+/g, '_')}_${(day || 'Dia').replace(/\s+/g, '_')}.xlsx`);
          return { success: true };
        }

        return { success: false, message: 'Biblioteca de Excel não carregada.' };
      } catch (err) {
        console.error('Erro ao gerar Excel de Juízes:', err);
        return { success: false, message: err.message };
      }
    },

    exportOrdemExcel: async (payload) => {
      try {
        if (typeof window.XLSX === 'undefined') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          });
        }

        const { eventName, day, data } = payload;
        if (typeof window.XLSX !== 'undefined') {
          const rows = [
            ["RODEOAPP - ORDEM DE ENTRADA OFICIAL"],
            ["EVENTO:", eventName || '', "ETAPA / DIA:", day || ''],
            [],
            ["ORDEM", "COMPETIDOR", "CIDADE", "TOURO", "COMPANHIA", "LADO", "TEMPO", "NOTA", "STATUS"]
          ];

          (data || []).forEach((item, idx) => {
            rows.push([
              item.ordem || (idx + 1),
              item.riderNome || item.peao || '',
              item.riderCidade || item.cidade || '',
              item.bullNome || item.touro || '',
              item.bullCia || item.cia || '',
              item.bullLado || item.lado || '',
              item.tempo || '',
              item.score || item.nota || '',
              item.status || ''
            ]);
          });

          const ws = window.XLSX.utils.aoa_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, "Ordem");
          window.XLSX.writeFile(wb, `Ordem_${(day || 'Dia').replace(/\s+/g, '_')}.xlsx`);
          return { success: true };
        }

        return { success: false, message: 'Biblioteca de Excel não carregada.' };
      } catch (err) {
        console.error('Erro ao gerar Excel de Ordem:', err);
        return { success: false, message: err.message };
      }
    },

    exportRankingExcel: async (payload) => {
      try {
        if (typeof window.XLSX === 'undefined') {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
          });
        }

        const { eventName, day, data } = payload;
        if (typeof window.XLSX !== 'undefined') {
          const rows = [
            ["RODEOAPP - RANKING GERAL OFICIAL"],
            ["EVENTO:", eventName || '', "ETAPA:", day || 'GERAL'],
            [],
            ["POS", "COMPETIDOR", "CIDADE", "PONTUAÇÃO TOTAL", "TEMPO ACUMULADO"]
          ];

          (data || []).forEach((item, idx) => {
            rows.push([
              idx + 1,
              item.nome || '',
              item.cidade || '',
              typeof item.score === 'number' ? item.score.toFixed(2) : (item.score || '0.00'),
              typeof item.tempoAcumulado === 'number' ? item.tempoAcumulado.toFixed(2) : (item.tempoAcumulado || item.tempo || '0.00')
            ]);
          });

          const ws = window.XLSX.utils.aoa_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, "Ranking");
          window.XLSX.writeFile(wb, `Ranking_${(eventName || 'Evento').replace(/\s+/g, '_')}_${(day || 'Geral').replace(/\s+/g, '_')}.xlsx`);
          return { success: true };
        }

        return { success: false, message: 'Biblioteca de Excel não carregada.' };
      } catch (err) {
        console.error('Erro ao gerar Excel de Ranking:', err);
        return { success: false, message: err.message };
      }
    },

    exportMelhorCia: async ({ eventName, data, format }) => {
      try {
        if (format === 'excel') {
          if (typeof window.XLSX === 'undefined') {
            await new Promise((resolve) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
              s.onload = () => resolve(true);
              s.onerror = () => resolve(false);
              document.head.appendChild(s);
            });
          }

          if (typeof window.XLSX !== 'undefined') {
            const rows = [
              ["RODEOAPP - RANKING DE MELHOR COMPANHIA"],
              ["EVENTO:", eventName || ''],
              [],
              ["POS", "COMPANHIA", "MÉDIA", "TOTAL DE TOUROS"]
            ];

            (data || []).forEach((item, idx) => {
              rows.push([
                idx + 1,
                item.nome || item.cia || '',
                typeof item.media === 'number' ? item.media.toFixed(2) : (item.media || '0.00'),
                item.tourosCount || (item.touros ? item.touros.length : '') || ''
              ]);
            });

            const ws = window.XLSX.utils.aoa_to_sheet(rows);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, "Melhor Cia");
            window.XLSX.writeFile(wb, `Melhor_Cia_${(eventName || 'Evento').replace(/\s+/g, '_')}.xlsx`);
            return { success: true };
          }
        }

        // Se formato PDF na web
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="text-align: center; margin-bottom: 5px;">RODEOAPP - MELHOR COMPANHIA</h1>
            <h3 style="text-align: center; color: #666; margin-bottom: 20px;">${eventName || 'EVENTO'}</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f2f2f2; border-bottom: 2px solid #333;">
                  <th style="padding: 10px; width: 60px;">POS</th>
                  <th style="padding: 10px;">COMPANHIA</th>
                  <th style="padding: 10px; text-align: right;">MÉDIA</th>
                </tr>
              </thead>
              <tbody>
                ${(data || []).map((item, idx) => `
                  <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">${idx + 1}º</td>
                    <td style="padding: 10px;">${item.nome || item.cia || ''}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">${typeof item.media === 'number' ? item.media.toFixed(2) : item.media}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        return window.electronAPI.exportPDF({ htmlContent: html, defaultName: `Melhor_Cia_${(eventName || 'Evento').replace(/\s+/g, '_')}.pdf` });
      } catch (err) {
        console.error('Erro ao exportar Melhor Cia:', err);
        return { success: false, message: err.message };
      }
    },

    exportMelhorAnimal: async ({ eventName, data, format }) => {
      try {
        if (format === 'excel') {
          if (typeof window.XLSX === 'undefined') {
            await new Promise((resolve) => {
              const s = document.createElement('script');
              s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
              s.onload = () => resolve(true);
              s.onerror = () => resolve(false);
              document.head.appendChild(s);
            });
          }

          if (typeof window.XLSX !== 'undefined') {
            const rows = [
              ["RODEOAPP - RANKING DE MELHOR ANIMAL / TOURO"],
              ["EVENTO:", eventName || ''],
              [],
              ["POS", "ANIMAL / TOURO", "COMPANHIA", "SAÍDAS", "MÉDIA"]
            ];

            (data || []).forEach((item, idx) => {
              rows.push([
                idx + 1,
                item.nome || '',
                item.cia || '',
                item.saidas || 0,
                typeof item.media === 'number' ? item.media.toFixed(2) : (item.media || '0.00')
              ]);
            });

            const ws = window.XLSX.utils.aoa_to_sheet(rows);
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, ws, "Melhor Animal");
            window.XLSX.writeFile(wb, `Melhor_Animal_${(eventName || 'Evento').replace(/\s+/g, '_')}.xlsx`);
            return { success: true };
          }
        }

        // Se formato PDF na web
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="text-align: center; margin-bottom: 5px;">RODEOAPP - MELHOR ANIMAL</h1>
            <h3 style="text-align: center; color: #666; margin-bottom: 20px;">${eventName || 'EVENTO'}</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #f2f2f2; border-bottom: 2px solid #333;">
                  <th style="padding: 10px; width: 60px;">POS</th>
                  <th style="padding: 10px;">ANIMAL</th>
                  <th style="padding: 10px;">COMPANHIA</th>
                  <th style="padding: 10px; text-align: center;">SAÍDAS</th>
                  <th style="padding: 10px; text-align: right;">MÉDIA</th>
                </tr>
              </thead>
              <tbody>
                ${(data || []).map((item, idx) => `
                  <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; font-weight: bold;">${idx + 1}º</td>
                    <td style="padding: 10px;">${item.nome || ''}</td>
                    <td style="padding: 10px;">${item.cia || ''}</td>
                    <td style="padding: 10px; text-align: center;">${item.saidas || 0}</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">${typeof item.media === 'number' ? item.media.toFixed(2) : item.media}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        return window.electronAPI.exportPDF({ htmlContent: html, defaultName: `Melhor_Animal_${(eventName || 'Evento').replace(/\s+/g, '_')}.pdf` });
      } catch (err) {
        console.error('Erro ao exportar Melhor Animal:', err);
        return { success: false, message: err.message };
      }
    },

    exportContracts: async () => {
      alert('Exportação de contratos em arquivo Word (.docx) é exclusiva do App Desktop.');
      return { success: false };
    },
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
