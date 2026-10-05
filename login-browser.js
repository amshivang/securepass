const { BrowserWindow, WebContentsView, ipcMain, shell } = require('electron');
const crypto = require('crypto');
const path = require('path');
const { pathToFileURL } = require('url');
const { getSafeWebUrl, buildAutofillScript } = require('./autofill');

const TOOLBAR_HEIGHT = 116;
const TOOLBAR_FILE = path.join(__dirname, 'renderer', 'login.html');

class LoginBrowser {
  constructor(getItem) {
    this.getItem = getItem;
    this.windows = new Map();
    ipcMain.handle('login:action', async (event, action) => {
      const record = this.windows.get(event.sender.id);
      if (!record || event.senderFrame !== record.window.webContents.mainFrame ||
          event.senderFrame.url !== pathToFileURL(TOOLBAR_FILE).href) return { error: 'Untrusted login window.' };
      try {
        if (action === 'state') return this.getState(record);
        if (action === 'fill') return await this.fill(record);
        if (action === 'reload') record.page.reload();
        else if (action === 'external') {
          const url = getSafeWebUrl(record.page.getURL());
          if (url) await shell.openExternal(url);
        } else return { error: 'Unknown login action.' };
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    });
  }

  getState(record) {
    const url = getSafeWebUrl(record.page.getURL());
    return {
      title: record.title,
      url: url || '',
      status: record.status,
      canFill: Boolean(url && new URL(url).origin === record.origin)
    };
  }

  sendState(record) {
    if (!record.window.isDestroyed()) record.window.webContents.send('login:state', this.getState(record));
  }

  async fill(record) {
    if (record.page.isDestroyed()) return { error: 'Login window is closed.' };
    const item = this.getItem(record.itemId);
    if (!item) throw new Error('Unlock the vault and select an existing login.');
    const current = getSafeWebUrl(record.page.getURL());
    const saved = getSafeWebUrl(item.url);
    if (!current || !saved || new URL(current).origin !== record.origin || new URL(saved).origin !== record.origin) {
      record.status = 'Different website: filling is blocked. Save its exact login URL as another item.';
      this.sendState(record);
      return { error: 'The current page does not match the saved website origin.' };
    }
    // An isolated world prevents a page from replacing the native DOM setters,
    // URL checks, or JavaScript built-ins used by the form filler.
    const result = await record.page.executeJavaScriptInIsolatedWorld(1001, [{
      code: buildAutofillScript(item, record.origin)
    }], true);
    if (record.page.isDestroyed()) return { error: 'Login window is closed.' };
    record.status = result.status === 'origin-mismatch' ? 'Different website: filling is blocked.'
      : result.filled ? `Filled ${result.filled} field${result.filled === 1 ? '' : 's'}. Review the form, then sign in yourself.`
      : result.detected ? 'Matching fields already have values. Clear a field and choose Fill Again to refill it.'
      : 'No matching fields yet. Navigate to the login form and choose Fill Again.';
    this.sendState(record);
    return { success: true, filled: result.filled };
  }

  open(itemId, parent) {
    const item = this.getItem(itemId);
    if (!item || item.category !== 'Logins') throw new Error('Select an existing login item.');
    const url = getSafeWebUrl(item.url);
    if (!url || new URL(url).protocol !== 'https:') throw new Error('Open & Fill requires a valid HTTPS login URL.');
    const window = new BrowserWindow({
      width: 1180, height: 820, minWidth: 860, minHeight: 600,
      title: `SecurePass — ${item.title}`, backgroundColor: '#0a0a0a', parent,
      webPreferences: {
        preload: path.join(__dirname, 'login-preload.js'), contextIsolation: true,
        nodeIntegration: false, sandbox: true
      }
    });
    window.setMenuBarVisibility(false);
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    const view = new WebContentsView({ webPreferences: {
      partition: `securepass-login-${crypto.randomUUID()}`,
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true
    } });
    const page = view.webContents;
    const pageSession = page.session;
    const toolbarId = window.webContents.id;
    page.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    page.session.setPermissionCheckHandler(() => false);
    const record = {
      window, page, itemId, origin: new URL(url).origin,
      title: item.title, timers: new Set(), generation: 0, status: 'Loading the saved login page…'
    };
    this.windows.set(window.webContents.id, record);
    window.contentView.addChildView(view);
    const resize = () => {
      const [width, height] = window.getContentSize();
      view.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width, height: Math.max(0, height - TOOLBAR_HEIGHT) });
    };
    resize();
    window.on('resize', resize);
    const clearTimers = () => {
      for (const timer of record.timers) clearTimeout(timer);
      record.timers.clear();
    };
    const guardNavigation = (event, target) => {
      if (!getSafeWebUrl(target)) event.preventDefault();
    };
    page.on('will-navigate', guardNavigation);
    page.on('will-redirect', guardNavigation);
    page.setWindowOpenHandler(() => ({ action: 'deny' }));
    page.on('will-attach-webview', event => event.preventDefault());
    page.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => {
      if (!mainFrame) return;
      record.generation++;
      clearTimers();
      record.status = 'Loading…';
      this.sendState(record);
    });
    page.on('did-navigate', () => this.sendState(record));
    page.on('did-navigate-in-page', (_event, _url, mainFrame) => {
      if (mainFrame) this.sendState(record);
    });
    page.on('did-finish-load', () => {
      const generation = record.generation;
      for (const delay of [250, 1500]) {
        const timer = setTimeout(() => {
          record.timers.delete(timer);
          if (page.isDestroyed() || generation !== record.generation) return;
          this.fill(record).catch(error => {
            record.status = error.message;
            this.sendState(record);
          });
        }, delay);
        record.timers.add(timer);
      }
    });
    page.on('did-fail-load', (_event, code, _description, _url, mainFrame) => {
      if (!mainFrame || code === -3) return;
      record.status = 'The page could not load. Check the URL or connection and choose Reload.';
      this.sendState(record);
    });
    window.webContents.on('did-finish-load', () => this.sendState(record));
    window.on('closed', () => {
      clearTimers();
      this.windows.delete(toolbarId);
      if (!page.isDestroyed()) page.close();
      pageSession.clearStorageData().catch(() => {});
    });
    window.loadFile(TOOLBAR_FILE);
    page.loadURL(url).catch(() => {});
    return { success: true };
  }

  closeAll() {
    for (const record of [...this.windows.values()]) {
      if (!record.window.isDestroyed()) record.window.destroy();
    }
  }
}

module.exports = { LoginBrowser };
