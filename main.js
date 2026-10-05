/** SecurePass desktop lifecycle, trusted IPC, and clipboard/session controls. */
const { app, BrowserWindow, ipcMain, clipboard, shell, powerMonitor } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { CryptoVault, generateTOTP } = require('./crypto-vault');
const { LoginBrowser } = require('./login-browser');
const { getSafeWebUrl } = require('./autofill');

const INDEX_FILE = path.join(__dirname, 'renderer', 'index.html');
const AUTO_LOCK_VALUES = [0, 1, 5, 15, 30, 60];
let mainWindow = null;
let vault = null;
let loginBrowser = null;
let clipboardTimeout = null;
let lastSensitiveCopied = null;
let idleTimer = null;
let autoLockMinutes = 15;

function getVaultPath() {
  const directory = process.env.PORTABLE_EXECUTABLE_DIR
    ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'securepass-data') : app.getPath('userData');
  return path.join(directory, 'vault.enc');
}

function preferencesPath() {
  return path.join(path.dirname(getVaultPath()), 'preferences.json');
}

function flushSensitiveClipboard() {
  if (lastSensitiveCopied !== null && clipboard.readText() === lastSensitiveCopied) clipboard.clear();
  if (clipboardTimeout) clearTimeout(clipboardTimeout);
  clipboardTimeout = null;
  lastSensitiveCopied = null;
}

function lockSession(reason) {
  if (vault) vault.lock();
  flushSensitiveClipboard();
  if (loginBrowser) loginBrowser.closeAll();
  if (reason && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('vault:locked', reason);
  return { success: true };
}

function trustedSender(event) {
  return mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame &&
    event.senderFrame.url === pathToFileURL(INDEX_FILE).href;
}

function handle(channel, callback) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!trustedSender(event)) return { error: 'Untrusted request.' };
    try { return await callback(...args); } catch (error) { return { error: error.message }; }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120, height: 780, minWidth: 860, minHeight: 600, backgroundColor: '#0a0a0a',
    title: 'SecurePass — Password Manager',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.setMenuBarVisibility(false);
  const openExternal = url => {
    const safeUrl = getSafeWebUrl(url);
    if (safeUrl) shell.openExternal(safeUrl).catch(() => {});
  };
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => { event.preventDefault(); openExternal(url); });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.on('render-process-gone', () => lockSession());
  mainWindow.on('closed', () => { lockSession(); mainWindow = null; });
  mainWindow.loadFile(INDEX_FILE);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    vault = new CryptoVault(getVaultPath());
    loginBrowser = new LoginBrowser(itemId => vault.isUnlocked ? vault.getItems().find(item => item.id === itemId) : null);
    try {
      const preferences = JSON.parse(fs.readFileSync(preferencesPath(), 'utf8'));
      if (AUTO_LOCK_VALUES.includes(preferences.autoLockMinutes)) autoLockMinutes = preferences.autoLockMinutes;
    } catch (_error) {}
    powerMonitor.on('lock-screen', () => lockSession('system'));
    powerMonitor.on('suspend', () => lockSession('system'));
    idleTimer = setInterval(() => {
      if (vault.isUnlocked && autoLockMinutes > 0 && powerMonitor.getSystemIdleTime() >= autoLockMinutes * 60) lockSession('inactivity');
    }, 5000);
    idleTimer.unref();

    handle('vault:check-exists', () => vault.exists());
    handle('vault:initialize', password => vault.initialize(password));
    handle('vault:unlock', password => { vault.unlock(password); return { success: true }; });
    handle('vault:lock', () => lockSession());
    handle('vault:reset', () => { lockSession(); return vault.reset(); });
    handle('vault:change-master-password', (current, next) => vault.changeMasterPassword(current, next));
    handle('vault:get-items', () => ({ items: vault.getItems() }));
    handle('vault:add-item', item => ({ item: vault.addItem(item) }));
    handle('vault:update-item', (id, item) => ({ item: vault.updateItem(id, item) }));
    handle('vault:delete-item', id => vault.deleteItem(id));
    handle('vault:export-backup', () => ({ backup: vault.exportEncryptedBackup() }));
    handle('vault:export-encrypted-backup', () => ({ backup: vault.exportEncryptedBackup() }));
    handle('vault:export-plaintext-backup', () => ({ backup: vault.exportPlaintextBackup() }));
    handle('vault:import-backup', (data, mode = 'merge') => vault.importBackup(data, mode));
    handle('vault:import-encrypted-backup', (data, password, mode = 'merge') => vault.importEncryptedBackup(data, password, mode));
    handle('vault:generate-totp', secret => { if (!vault.isUnlocked) throw new Error('Vault is locked.'); return generateTOTP(secret); });
    handle('app:open-login-and-fill', itemId => loginBrowser.open(itemId, mainWindow));
    handle('app:clear-sensitive-clipboard', () => { flushSensitiveClipboard(); return { success: true }; });
    handle('app:copy-clipboard', (text, isSensitive) => {
      if (!vault.isUnlocked) throw new Error('Vault is locked.');
      if (typeof text !== 'string' || text.length > 20000) throw new Error('Invalid clipboard text.');
      flushSensitiveClipboard();
      clipboard.writeText(text);
      if (isSensitive && text) { lastSensitiveCopied = text; clipboardTimeout = setTimeout(flushSensitiveClipboard, 30000); }
      return { success: true };
    });
    handle('app:get-auto-lock', () => ({ minutes: autoLockMinutes }));
    handle('app:set-auto-lock', minutes => {
      if (!AUTO_LOCK_VALUES.includes(minutes)) throw new Error('Invalid auto-lock interval.');
      const file = preferencesPath();
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify({ autoLockMinutes: minutes }), { mode: 0o600 });
      autoLockMinutes = minutes;
      return { success: true };
    });
    ipcMain.on('app:window-action', (event, action) => {
      if (!trustedSender(event)) return;
      if (action === 'minimize') mainWindow.minimize();
      if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
      if (action === 'close') mainWindow.close();
    });
    createWindow();
    app.on('activate', () => { if (!mainWindow) createWindow(); });
  });
}

app.on('before-quit', () => { if (idleTimer) clearInterval(idleTimer); lockSession(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
