# Plan 003: Security Hardening: Clipboard Flush on Exit and CSP Protection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat a4b9763..HEAD -- main.js renderer/index.html`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `a4b9763`, 2026-09-06

## Why this matters

1. **Clipboard Lingering (SEC-02):** When a user copies a password, `main.js` schedules a 30s timer to clear the clipboard. However, if the user closes the window or quits the app before the timer expires, the timer is dropped and the sensitive password remains in the Windows clipboard indefinitely.
2. **Missing CSP (SEC-03):** `renderer/index.html` lacks a Content Security Policy `<meta>` tag, and `main.js` lacks navigation event handlers (`setWindowOpenHandler`). If any user-entered credential title or external link executes or triggers a navigation, Electron would navigate within the main window instead of delegating to the external browser via `shell.openExternal`.

## Current state

- `main.js:130-143`:
  ```javascript
  ipcMain.handle('app:copy-clipboard', async (_event, text, isSensitive) => {
    clipboard.writeText(text);

    if (isSensitive) {
      if (clipboardTimeout) clearTimeout(clipboardTimeout);
      clipboardTimeout = setTimeout(() => {
        if (clipboard.readText() === text) {
          clipboard.clear();
        }
      }, 30000);
    }
    return { success: true };
  });
  ```
  `mainWindow.on('closed')` and `app.on('before-quit')` do not clear the clipboard if `clipboardTimeout` is active.
- `renderer/index.html:1-10` lacks any CSP header or meta tag.
- `main.js:20-40` does not configure `setWindowOpenHandler`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Verify startup | `npm start` (or test run) | window launches cleanly |

## Scope

**In scope**:
- `main.js` (add clipboard cleanup on exit, add `setWindowOpenHandler` with `shell.openExternal`)
- `renderer/index.html` (add strict CSP `<meta>` tag)

**Out of scope**:
- Do not edit cryptographic logic in `crypto-vault.js`.

## Steps

### Step 1: Flush clipboard on app shutdown in `main.js`

In `main.js`:
1. Track the current sensitive clipboard text: `let lastSensitiveCopied = null;`.
2. In `app:copy-clipboard`:
   ```javascript
   if (isSensitive) {
     lastSensitiveCopied = text;
     if (clipboardTimeout) clearTimeout(clipboardTimeout);
     clipboardTimeout = setTimeout(() => {
       if (clipboard.readText() === text) {
         clipboard.clear();
       }
       lastSensitiveCopied = null;
     }, 30000);
   }
   ```
3. Create a helper function `flushSensitiveClipboard()`:
   ```javascript
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
   ```
4. Call `flushSensitiveClipboard()` in `mainWindow.on('closed')` and `app.on('before-quit')`.

---

### Step 2: Add Content Security Policy in `renderer/index.html`

In `<head>` of `renderer/index.html`, add:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.pwnedpasswords.com; img-src 'self' data:;" />
```
This allows Google Fonts and the HaveIBeenPwned k-anonymity API while forbidding inline execution of untrusted scripts.

---

### Step 3: Handle external URL opening in `main.js`

In `main.js`, add external link interception using `shell.openExternal`:
```javascript
const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');

mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (url.startsWith('https:') || url.startsWith('http:')) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});
```

## Done criteria

1. Closing the app while a sensitive password is on the clipboard clears the clipboard immediately.
2. `renderer/index.html` has a strict CSP meta tag.
3. External web links delegate to `shell.openExternal`.
