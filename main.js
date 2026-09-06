/**
 * SecurePass Desktop - Main Electron Process
 * 
 * ponytail: Clean IPC routing and zero boilerplate, using native Node.js and Electron APIs.
 */

const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('path');
const { CryptoVault, generateTOTP } = require('./crypto-vault');

let mainWindow = null;
let clipboardTimeout = null;
let lastSensitiveCopied = null;
let vault = null;

function getVaultPath() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'securepass-data');
    return path.join(portableDataDir, 'vault.enc');
  }
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'vault.enc');
}

function flushSensitiveClipboard() {
  if (lastSensitiveCopied && clipboard.readText() === lastSensitiveCopied) {
    clipboard.clear();
  }
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout);
    clipboardTimeout = null;
  }
  lastSensitiveCopied = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1060,
    height: 720,
    minWidth: 860,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    frame: true,
    titleBarStyle: 'default',
    title: 'SecurePass - Password Manager & Security Analyzer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Remove default menu for a clean, distraction-free modern look
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    flushSensitiveClipboard();
    if (vault) vault.lock();
  });
}

app.whenReady().then(() => {
  vault = new CryptoVault(getVaultPath());

  // IPC: Check if vault exists
  ipcMain.handle('vault:check-exists', async () => {
    return vault.exists();
  });

  // IPC: Initialize vault with new master password
  ipcMain.handle('vault:initialize', async (_event, masterPassword) => {
    try {
      return vault.initialize(masterPassword);
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: Unlock vault
  ipcMain.handle('vault:unlock', async (_event, masterPassword) => {
    try {
      return vault.unlock(masterPassword);
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: Lock vault
  ipcMain.handle('vault:lock', async () => {
    return vault.lock();
  });

  // IPC: Reset vault
  ipcMain.handle('vault:reset', async () => {
    try {
      if (!vault) throw new Error('Vault not initialized.');
      return vault.reset();
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: Change Master Password
  ipcMain.handle('vault:change-master-password', async (_event, currentPassword, newPassword) => {
    try {
      if (!vault) throw new Error('Vault not initialized.');
      return vault.changeMasterPassword(currentPassword, newPassword);
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: CRUD
  ipcMain.handle('vault:get-items', async () => {
    try {
      return { items: vault.getItems() };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:add-item', async (_event, item) => {
    try {
      return { item: vault.addItem(item) };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:update-item', async (_event, id, item) => {
    try {
      return { item: vault.updateItem(id, item) };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:delete-item', async (_event, id) => {
    try {
      return vault.deleteItem(id);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:export-encrypted-backup', async () => {
    try {
      return { backup: vault.exportEncryptedBackup() };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:export-plaintext-backup', async () => {
    try {
      return { backup: vault.exportPlaintextBackup() };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:export-backup', async () => {
    try {
      return { backup: vault.exportEncryptedBackup() };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:import-encrypted-backup', async (_event, backupEnvelopeString, masterPassword) => {
    try {
      return vault.importEncryptedBackup(backupEnvelopeString, masterPassword);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('vault:import-backup', async (_event, jsonString) => {
    try {
      return vault.importBackup(jsonString);
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: Generate TOTP 2FA code
  ipcMain.handle('vault:generate-totp', async (_event, secret) => {
    try {
      if (!secret) return null;
      return CryptoVault.generateTOTP ? CryptoVault.generateTOTP(secret) : generateTOTP(secret);
    } catch (err) {
      return { error: err.message };
    }
  });

  // IPC: Secure Clipboard Copy with auto-clear (Bitwarden security feature)
  ipcMain.handle('app:copy-clipboard', async (_event, text, isSensitive) => {
    clipboard.writeText(text);

    if (isSensitive) {
      lastSensitiveCopied = text;
      if (clipboardTimeout) clearTimeout(clipboardTimeout);
      clipboardTimeout = setTimeout(() => {
        // Only clear if the user hasn't copied something else in between
        if (clipboard.readText() === text) {
          clipboard.clear();
        }
        lastSensitiveCopied = null;
      }, 30000); // 30 seconds
    }
    return { success: true };
  });

  // IPC: Window control
  ipcMain.on('app:window-action', (_event, action) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'maximize') {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
    if (action === 'close') mainWindow.close();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  flushSensitiveClipboard();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
