const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getHWID: () => ipcRenderer.invoke('get-hwid'),
  validateLicense: (payload) => ipcRenderer.invoke('validate-license', payload),
  sendHeartbeat: (payload) => ipcRenderer.invoke('heartbeat', payload),
  onLicenseRealtimeUpdate: (callback) => ipcRenderer.on('license-realtime-update', (event, data) => callback(data)),
  onLicenseBroadcastSignal: (callback) => ipcRenderer.on('license-broadcast-signal', (event, data) => callback(data)),
  
  // Persistência local (LocalStorage ainda funciona no renderer, mas vamos manter o padrão)
  saveAuth: (data) => localStorage.setItem('hzn_auth', JSON.stringify(data)),
  getAuth: () => JSON.parse(localStorage.getItem('hzn_auth')),
  clearAuth: () => localStorage.removeItem('hzn_auth'),
  
  setCurrentSport: (sport) => ipcRenderer.invoke('set-current-sport', sport),
  
  // Banco Local (Agora com e-mail para isolamento)
  getLocalEvents: (email) => ipcRenderer.invoke('get-local-events', email),
  saveLocalEvent: (email, newEvent) => ipcRenderer.invoke('save-local-event', { email, newEvent }),
  updateLocalEvent: (email, updatedEvent) => ipcRenderer.invoke('update-local-event', { email, updatedEvent }),
  deleteLocalEvent: (email, id) => ipcRenderer.invoke('delete-local-event', { email, id }),

  // Banco Local Global (Peões e Boiadas persistentes)
  getGlobalData: (email) => ipcRenderer.invoke('get-global-data', email),
  saveGlobalPeao: (email, peao) => ipcRenderer.invoke('save-global-peao', { email, peao }),
  saveGlobalBoiada: (email, boiada) => ipcRenderer.invoke('save-global-boiada', { email, boiada }),
  updateGlobalPeao: (email, index, peao) => ipcRenderer.invoke('update-global-peao', { email, index, peao }),
  deleteGlobalPeao: (email, index) => ipcRenderer.invoke('delete-global-peao', { email, index }),
  updateGlobalBoiada: (email, index, boiada) => ipcRenderer.invoke('update-global-boiada', { email, index, boiada }),
  deleteGlobalBoiada: (email, index) => ipcRenderer.invoke('delete-global-boiada', { email, index }),
  updateProfileName: (email, newName) => ipcRenderer.invoke('update-profile-name', { email, newName }),
  
  // Auto Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdaterEvent: (callback) => ipcRenderer.on('updater-event', (event, data) => callback(data)),

  // Exports
  deleteLocalEvent: (email, id) => ipcRenderer.invoke('delete-local-event', { email, id }),
  getAppLogo: () => ipcRenderer.invoke('get-app-logo'),
  getPdfLogo: () => ipcRenderer.invoke('get-pdf-logo'),
  exportSorteioExcel: (data) => ipcRenderer.invoke('export-sorteio-excel', data),
  exportBoiadasExcel: (data) => ipcRenderer.invoke('export-boiadas-excel', data),
  exportJuizesExcel: (data) => ipcRenderer.invoke('export-juizes-excel', data),
  exportOrdemExcel: (data) => ipcRenderer.invoke('export-ordem-excel', data),
  exportRankingExcel: (data) => ipcRenderer.invoke('export-ranking-excel', data),
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  exportContracts: (email, eventId, target, format) => ipcRenderer.invoke('export-contracts', {email, eventId, target, format}),
  exportMelhorCia: (data) => ipcRenderer.invoke('export-melhor-cia', data),
  exportMelhorAnimal: (data) => ipcRenderer.invoke('export-melhor-animal', data),
  sendEventToPortal: (payload) => ipcRenderer.invoke('send-event-to-portal', payload),
  checkDbConnection: () => ipcRenderer.invoke('check-db-connection'),
  getOnlineCompetitors: () => ipcRenderer.invoke('get-online-competitors'),
  shareEventToCloud: (payload) => ipcRenderer.invoke('share-event-to-cloud', payload),
  pullEventFromCloud: (payload) => ipcRenderer.invoke('pull-event-from-cloud', payload),
  sendOverlayCommand: (payload) => ipcRenderer.send('send-overlay-command', payload),
  uploadMedia: (filePath) => ipcRenderer.invoke('upload-media', filePath),
  deleteMedia: (fileName) => ipcRenderer.invoke('delete-media', fileName)
});
