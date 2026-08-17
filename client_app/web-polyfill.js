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

  const CURRENT_WEB_VERSION = '1.0.141';

  // Helper: garante que SheetJS está carregado antes de qualquer exportação
  const _ensureXLSX = () => new Promise((resolve) => {
    if (typeof window.XLSX !== 'undefined') { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

  // Helper: formata o lado do touro
  const _formatLado = (s) => {
    if (!s) return '';
    const l = s.toLowerCase();
    if (l === 'direito' || l === 'd') return 'Certo (C)';
    if (l === 'esquerdo' || l === 'e') return 'Errado (E)';
    return s.toUpperCase();
  };

  // Helper: tenta fazer fetch de um template .xlsx e retorna workbook ou null
  const _fetchTemplate = async (filename) => {
    try {
      const resp = await fetch(filename);
      if (!resp.ok) return null;
      const buf = await resp.arrayBuffer();
      return window.XLSX.read(buf, { type: 'array', cellStyles: true });
    } catch (e) {
      console.warn(`Template ${filename} não disponível:`, e.message);
      return null;
    }
  };

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
    getPdfLogo: async () => {
      try {
        const resp = await fetch('assets/rodeoapplogo_branca.png');
        if (!resp.ok) return '';
        const blob = await resp.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      } catch(e) { return ''; }
    },

    exportPDF: async ({ htmlContent, defaultName }) => {
      try {
        const filename = defaultName || 'Relatorio.pdf';
        const isLandscape = htmlContent.includes('landscape');
        const orientStyle = isLandscape
          ? '@page { size: A4 landscape; margin: 8mm; }'
          : '@page { size: A4 portrait; margin: 8mm; }';

        // Injeta estilos de impressão no HTML
        const printStyles = `<style>${orientStyle} @media print{body{margin:0!important;padding:0!important;}} body{margin:0;padding:0;background:#fff;color:#000;}</style>`;
        let finalHtml = htmlContent;
        if (/<\/head>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<\/head>/i, printStyles + '</head>');
        } else if (/<body[^>]*>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<body([^>]*)>/i, `<body$1>${printStyles}`);
        } else {
          finalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">${printStyles}</head><body>${finalHtml}</body></html>`;
        }

        // MOBILE: Web Share API
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile && navigator.share) {
          try {
            const blob = new Blob([finalHtml], { type: 'text/html' });
            const file = new File([blob], filename.replace('.pdf', '.html'), { type: 'text/html' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'RODEOAPP - ' + filename });
              return { success: true };
            }
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') return { success: true };
          }
        }

        // DESKTOP: iframe overlay na própria página
        // IMPORTANTE: NÃO removemos o loader do renderer.js aqui!
        // O renderer.js vai removê-lo depois que retornarmos { success: true }.
        // Usamos setTimeout para mostrar nosso overlay APÓS o loader ser removido.
        const blobUrl = URL.createObjectURL(new Blob([finalHtml], { type: 'text/html;charset=utf-8' }));

        setTimeout(() => {
          // Remove viewer anterior
          const existing = document.getElementById('rapp-pdf-viewer');
          if (existing) existing.remove();

          // Cria o overlay
          const overlay = document.createElement('div');
          overlay.id = 'rapp-pdf-viewer';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100vw';
          overlay.style.height = '100vh';
          overlay.style.background = '#1e293b';
          overlay.style.zIndex = '2147483647';
          overlay.style.display = 'flex';
          overlay.style.flexDirection = 'column';
          overlay.style.fontFamily = 'Arial, sans-serif';

          // Barra preta RODEOAPP
          const bar = document.createElement('div');
          bar.style.cssText = 'background:#0f172a;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 2px 12px rgba(0,0,0,0.9);min-height:56px;';
          bar.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:22px;">🤠</span>
              <div>
                <div style="font-weight:900;font-size:14px;color:#fff;letter-spacing:1px;">RODEOAPP</div>
                <div style="font-size:10px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${filename}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button id="rapp-print-btn" style="background:#eab308;color:#000;font-weight:900;padding:10px 18px;border:none;border-radius:7px;cursor:pointer;font-size:13px;white-space:nowrap;">🖨️ IMPRIMIR / SALVAR PDF</button>
              <button id="rapp-close-btn" style="background:#334155;color:#fff;font-weight:900;padding:10px 13px;border:1px solid #475569;border-radius:7px;cursor:pointer;font-size:18px;line-height:1;">✕</button>
            </div>`;

          // iframe para o relatório
          const iframe = document.createElement('iframe');
          iframe.id = 'rapp-pdf-iframe';
          iframe.style.cssText = 'flex:1;border:none;background:#fff;width:100%;';
          iframe.src = blobUrl;
          iframe.onload = () => setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

          overlay.appendChild(bar);
          overlay.appendChild(iframe);
          document.body.appendChild(overlay);

          // Botão fechar
          document.getElementById('rapp-close-btn').onclick = () => overlay.remove();

          // Botão imprimir/salvar → dispara impressão do iframe
          document.getElementById('rapp-print-btn').onclick = () => {
            const fr = document.getElementById('rapp-pdf-iframe');
            if (fr && fr.contentWindow) {
              fr.contentWindow.focus();
              fr.contentWindow.print();
            }
          };
        }, 400); // 400ms: tempo suficiente para o renderer.js remover o loader

        return { success: true };

      } catch (err) {
        console.error('Erro fatal ao exportar PDF:', err);
        return { success: false, message: err.message || String(err) };
      }
    },

    exportSorteioExcel: async (payload) => {
      try {
        await _ensureXLSX();
        const sData = payload.sorteioData || payload;
        const eventName = payload.eventName || sData.eventName || 'Evento';
        const day = payload.day || sData.day || 'Dia';
        const riders = sData.riders || [];
        const bulls = sData.bulls || [];
        const assignments = sData.assignments || {};

        const formatLado = (s) => {
          if (!s) return '';
          const l = s.toLowerCase();
          if (l === 'direito' || l === 'd') return 'Certo (C)';
          if (l === 'esquerdo' || l === 'e') return 'Errado (E)';
          return s.toUpperCase();
        };

        // Tenta usar o template real via fetch
        try {
          const resp = await fetch('molde_sorteio.xlsx');
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const wb = window.XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
            const ws = wb.Sheets[wb.SheetNames[0]];

            // Lê estilos das linhas de template (linha 3=competidor, 4=reserva header, 5=reserva data, 6=footer)
            // e preenche a partir da linha 3
            let currentRow = 3;
            const getRowStyle = (rowNum) => {
              const styleRow = {};
              for (let c = 1; c <= 7; c++) {
                const addr = window.XLSX.utils.encode_cell({ r: rowNum - 1, c: c - 1 });
                if (ws[addr]) styleRow[c] = ws[addr].s;
              }
              return styleRow;
            };
            const compStyle = getRowStyle(3);
            const resHeaderStyle = getRowStyle(4);
            const resDataStyle = getRowStyle(5);
            const footerStyle = getRowStyle(6);

            // Remove linhas de template (3..12) deixando cabeçalho 1-2
            const range = window.XLSX.utils.decode_range(ws['!ref'] || 'A1:G12');

            const writeRow = (rowIdx, values, styles) => {
              values.forEach((val, colIdx) => {
                const addr = window.XLSX.utils.encode_cell({ r: rowIdx - 1, c: colIdx });
                ws[addr] = { v: val, t: typeof val === 'number' ? 'n' : 's', s: styles ? styles[colIdx + 1] : undefined };
              });
            };

            // Apaga linhas de template
            for (let r = 3; r <= 12; r++) {
              for (let c = 1; c <= 7; c++) {
                delete ws[window.XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })];
              }
            }

            // Preenche competidores
            riders.forEach((rider, idx) => {
              const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
              const bull = bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };
              writeRow(currentRow, [
                idx + 1,
                (rider.nome || '').toUpperCase(),
                (rider.cidade || '').toUpperCase(),
                rider.acumulado || '0,00',
                (bull.nome || '').toUpperCase(),
                (bull.cia || '').toUpperCase(),
                formatLado(bull.lado)
              ], compStyle);
              currentRow++;
            });

            // Re-rides/reservas
            if (bulls.length > riders.length) {
              writeRow(currentRow, ['', '', '', '', 'RESERVAS / RE-RIDE', '', ''], resHeaderStyle);
              currentRow++;
              bulls.slice(riders.length).forEach((b, idx) => {
                writeRow(currentRow, ['', '', '', '', (b.nome || '').toUpperCase(), (b.cia || '').toUpperCase(), formatLado(b.lado)], resDataStyle);
                currentRow++;
              });
            }

            // Footer
            writeRow(currentRow, ['RODEOAPP - rodeoapp.pro', '', '', '', '', '', ''], footerStyle);

            // Atualiza range
            ws['!ref'] = window.XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow - 1, c: 6 } });

            window.XLSX.writeFile(wb, `Sorteio_${eventName.replace(/\s+/g, '_')}_${day.replace(/\s+/g, '_')}.xlsx`);
            return { success: true };
          }
        } catch (fetchErr) {
          console.warn('Template não disponível via fetch, gerando sem template:', fetchErr.message);
        }

        // Fallback: gera sem template
        const rows = [
          ["RODEOAPP - RELATÓRIO OFICIAL DE SORTEIO"],
          ["EVENTO:", eventName, "ETAPA / DIA:", day],
          [],
          ["ORDEM", "COMPETIDOR", "CIDADE / UF", "ACUMULADO", "TOURO", "COMPANHIA", "LADO"]
        ];
        riders.forEach((rider, idx) => {
          const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
          const bull = bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };
          rows.push([idx + 1, (rider.nome || '').toUpperCase(), (rider.cidade || '').toUpperCase(), rider.acumulado || '0,00', (bull.nome || '').toUpperCase(), (bull.cia || '').toUpperCase(), formatLado(bull.lado)]);
        });
        if (bulls.length > riders.length) {
          rows.push([]); rows.push(['--- RESERVAS / RE-RIDE ---']); rows.push(['Nº', 'TOURO', 'COMPANHIA', 'LADO']);
          bulls.slice(riders.length).forEach((b, i) => rows.push([`R${i+1}`, (b.nome||'').toUpperCase(), (b.cia||'').toUpperCase(), formatLado(b.lado)]));
        }
        const ws2 = window.XLSX.utils.aoa_to_sheet(rows);
        const wb2 = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb2, ws2, "Sorteio");
        window.XLSX.writeFile(wb2, `Sorteio_${eventName.replace(/\s+/g, '_')}_${day.replace(/\s+/g, '_')}.xlsx`);
        return { success: true };
      } catch (err) {
        console.error('Erro ao gerar Excel de Sorteio:', err);
        return { success: false, message: err.message };
      }
    },

    exportBoiadasExcel: async (payload) => {
      try {
        await _ensureXLSX();
        const sData = payload.sorteioData || payload;
        const day = sData.day || payload.day || 'Dia';
        const totalRiders = (sData.riders || []).length;
        const bulls = sData.bulls || [];

        // Tenta usar template real
        const wb = await _fetchTemplate('listtourossorteio.xlsx');
        if (wb) {
          const ws = wb.Sheets[wb.SheetNames[0]];
          // Captura estilos das linhas de template
          const getStyle = (r) => { const st = {}; for (let c=1;c<=4;c++){const a=window.XLSX.utils.encode_cell({r:r-1,c:c-1});if(ws[a])st[c]=ws[a].s;} return st; };
          const normalStyle = getStyle(4);
          const resHdrStyle = getStyle(5);
          const resDataStyle = getStyle(6);
          const footerStyle = getStyle(7);
          // Limpa linhas de template
          for (let r=4;r<=13;r++) for(let c=1;c<=4;c++) delete ws[window.XLSX.utils.encode_cell({r:r-1,c:c-1})];
          let cr = 4;
          const wr = (row, vals, styles) => vals.forEach((v,i)=>{ const a=window.XLSX.utils.encode_cell({r:row-1,c:i}); ws[a]={v,t:typeof v==='number'?'n':'s',s:styles?styles[i+1]:undefined}; });
          // Touros normais
          bulls.slice(0, totalRiders || bulls.length).forEach((b, idx) => {
            wr(cr, [idx+1, (b.nome||'').toUpperCase(), (b.cia||'').toUpperCase(), _formatLado(b.lado)], normalStyle);
            cr++;
          });
          // Re-rides
          if (bulls.length > totalRiders && totalRiders > 0) {
            wr(cr, ['', 'RESERVAS / RE-RIDE', '', ''], resHdrStyle); cr++;
            bulls.slice(totalRiders).forEach((b,i)=>{ wr(cr,[`R${i+1}`,(b.nome||'').toUpperCase(),(b.cia||'').toUpperCase(),_formatLado(b.lado)],resDataStyle); cr++; });
          }
          wr(cr, ['RODEOAPP - rodeoapp.pro','','',''], footerStyle);
          ws['!ref'] = window.XLSX.utils.encode_range({s:{r:0,c:0},e:{r:cr-1,c:3}});
          window.XLSX.writeFile(wb, `Boiada_${day.replace(/\s+/g, '_')}.xlsx`);
          return { success: true };
        }

        // Fallback
        const rows = [["RODEOAPP - LISTA DE BOIADA"],["DIA:", day],[],["Nº","TOURO","COMPANHIA","LADO"]];
        bulls.forEach((b,idx)=>rows.push([idx+1,(b.nome||'').toUpperCase(),(b.cia||'').toUpperCase(),_formatLado(b.lado)]));
        const ws2=window.XLSX.utils.aoa_to_sheet(rows); const wb2=window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb2,ws2,"Boiada");
        window.XLSX.writeFile(wb2,`Boiada_${day.replace(/\s+/g,'_')}.xlsx`);
        return { success: true };
      } catch (err) {
        console.error('Erro ao gerar Excel de Boiadas:', err);
        return { success: false, message: err.message };
      }
    },

    exportJuizesExcel: async ({ sorteioData, eventName, day, juizNome }) => {
      try {
        await _ensureXLSX();
        const sData = sorteioData || {};
        const riders = sData.riders || [];
        const bulls = sData.bulls || [];
        const assignments = sData.assignments || {};

        // Tenta usar template real
        const wb = await _fetchTemplate('moldejuiz_sorteio.xlsx');
        if (wb) {
          const ws = wb.Sheets[wb.SheetNames[0]];
          const getStyle = (r) => { const st={}; for(let c=1;c<=9;c++){const a=window.XLSX.utils.encode_cell({r:r-1,c:c-1});if(ws[a])st[c]=ws[a].s;} return st; };
          const rowStyle = getStyle(3);
          // Limpa linhas de template (3 em diante)
          for(let r=3;r<=15;r++) for(let c=1;c<=9;c++) delete ws[window.XLSX.utils.encode_cell({r:r-1,c:c-1})];
          let cr = 3;
          const wr = (row,vals,styles) => vals.forEach((v,i)=>{ const a=window.XLSX.utils.encode_cell({r:row-1,c:i}); ws[a]={v,t:typeof v==='number'?'n':'s',s:styles?styles[i+1]:undefined}; });
          riders.forEach((rider, idx) => {
            const bullIdx = assignments[idx] !== undefined ? assignments[idx] : idx;
            const bull = bulls[bullIdx] || { nome: '---', cia: '---', lado: '---' };
            wr(cr, [
              idx+1,
              (rider.nome||'').toUpperCase(),
              (rider.cidade||'').toUpperCase(),
              rider.acumulado||'0,00',
              (bull.nome||'').toUpperCase(),
              (bull.cia||'').toUpperCase(),
              _formatLado(bull.lado),
              '', ''
            ], rowStyle);
            cr++;
          });
          ws['!ref'] = window.XLSX.utils.encode_range({s:{r:0,c:0},e:{r:cr-1,c:8}});
          window.XLSX.writeFile(wb, `Juiz_${(juizNome||'Juiz').replace(/\s+/g,'_')}_${(day||'Dia').replace(/\s+/g,'_')}.xlsx`);
          return { success: true };
        }

        // Fallback
        const rows=[["RODEOAPP - PLANILHA JUIZ"],["JUIZ:",juizNome||'',"EVENTO:",eventName||'',"DIA:",day||''],[],["ORDEM","COMPETIDOR","CIDADE","ACUMULADO","TOURO","COMPANHIA","LADO","NOTA P","NOTA T"]];
        riders.forEach((rider,idx)=>{ const bIdx=assignments[idx]!==undefined?assignments[idx]:idx; const bull=bulls[bIdx]||{nome:'---',cia:'---',lado:'---'}; rows.push([idx+1,(rider.nome||'').toUpperCase(),(rider.cidade||'').toUpperCase(),rider.acumulado||'0,00',(bull.nome||'').toUpperCase(),(bull.cia||'').toUpperCase(),_formatLado(bull.lado),'','']); });
        const ws2=window.XLSX.utils.aoa_to_sheet(rows); const wb2=window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb2,ws2,"Notas Juiz");
        window.XLSX.writeFile(wb2,`Juiz_${(juizNome||'Juiz').replace(/\s+/g,'_')}_${(day||'Dia').replace(/\s+/g,'_')}.xlsx`);
        return { success: true };
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
              (item.riderNome || item.peao || item.nome || '').toUpperCase(),
              (item.riderCidade || item.cidade || '').toUpperCase(),
              (item.bullNome || item.touro || '').toUpperCase(),
              (item.bullCia || item.cia || '').toUpperCase(),
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
        const rawData = data || {};
        const rowsData = Array.isArray(rawData) ? rawData : (rawData.rows || []);
        const colsDays = Array.isArray(rawData.columnsDays) ? rawData.columnsDays : [];

        if (typeof window.XLSX !== 'undefined') {
          const headerRow = ["POS", "COMPETIDOR", "CIDADE / UF", ...colsDays, "PONTUAÇÃO TOTAL", "TEMPO ACUMULADO"];
          const rows = [
            ["RODEOAPP - RANKING GERAL OFICIAL"],
            ["EVENTO:", eventName || '', "ETAPA:", day || 'GERAL'],
            [],
            headerRow
          ];

          rowsData.forEach((item, idx) => {
            const hasScore = (item.totalPoints && item.totalPoints > 0) || (item.score && item.score > 0) || (item.tempoAcumulado && item.tempoAcumulado > 0);
            const posStr = hasScore ? `${idx + 1}º` : '---';
            const daysColsValues = colsDays.map(d => (item.daysScores && item.daysScores[d]) ? item.daysScores[d] : '-');
            const totalScore = item.totalPoints !== undefined ? item.totalPoints : (item.score !== undefined ? item.score : 0);
            const tempoAcum = item.tempoAcumulado !== undefined ? item.tempoAcumulado : (item.tempo !== undefined ? item.tempo : 0);

            rows.push([
              posStr,
              (item.nome || '').toUpperCase(),
              (item.cidade || '---').toUpperCase(),
              ...daysColsValues,
              typeof totalScore === 'number' ? totalScore.toFixed(2) : totalScore,
              typeof tempoAcum === 'number' ? tempoAcum.toFixed(2) : tempoAcum
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
