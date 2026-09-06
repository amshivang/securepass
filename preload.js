const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('securePassAPI', {
  vaultCheckExists: () => ipcRenderer.invoke('vault:check-exists'),
  vaultInitialize: (masterPassword) => ipcRenderer.invoke('vault:initialize', masterPassword),
  vaultUnlock: (masterPassword) => ipcRenderer.invoke('vault:unlock', masterPassword),
  vaultLock: () => ipcRenderer.invoke('vault:lock'),
  vaultGetItems: () => ipcRenderer.invoke('vault:get-items'),
  vaultAddItem: (item) => ipcRenderer.invoke('vault:add-item', item),
  vaultUpdateItem: (id, item) => ipcRenderer.invoke('vault:update-item', id, item),
  vaultDeleteItem: (id) => ipcRenderer.invoke('vault:delete-item', id),
  vaultExportBackup: () => ipcRenderer.invoke('vault:export-encrypted-backup'),
  vaultExportEncryptedBackup: () => ipcRenderer.invoke('vault:export-encrypted-backup'),
  vaultExportPlaintextBackup: () => ipcRenderer.invoke('vault:export-plaintext-backup'),
  vaultImportBackup: (jsonString) => ipcRenderer.invoke('vault:import-backup', jsonString),
  vaultImportEncryptedBackup: (backupEnvelopeString, masterPassword) => ipcRenderer.invoke('vault:import-encrypted-backup', backupEnvelopeString, masterPassword),
  copyToClipboard: (text, isSensitive = false) => ipcRenderer.invoke('app:copy-clipboard', text, isSensitive),
  windowAction: (action) => ipcRenderer.send('app:window-action', action)
});
