const assert = require('assert');
const { app, BrowserWindow } = require('electron');
const { buildAutofillScript, getSafeWebUrl } = require('../autofill');

async function main() {
  assert.strictEqual(getSafeWebUrl('javascript:alert(1)'), null);
  assert.strictEqual(getSafeWebUrl('https://user:pass@example.com/login'), null);
  assert.strictEqual(getSafeWebUrl('https://example.com/login'), 'https://example.com/login');

  await app.whenReady();
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <form>
        <label>Email <input type="email" name="email" autocomplete="username"></label>
        <label>Password <input type="password" autocomplete="current-password"></label>
        <label>Employee ID <input type="text" name="employee_id"></label>
      </form>
    `)}`);
    const item = {
      username: 'person@example.com', password: 'CorrectHorseBatteryStaple!',
      customFields: [{ name: 'Employee ID', value: 'EMP-42' }]
    };
    const result = await window.webContents.executeJavaScriptInIsolatedWorld(1001, [{
      code: buildAutofillScript(item, 'null')
    }], true);
    assert.strictEqual(result.filled, 3);
    const values = await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('input')).map(input => input.value)`);
    assert.deepStrictEqual(values, ['person@example.com', 'CorrectHorseBatteryStaple!', 'EMP-42']);

    const blocked = await window.webContents.executeJavaScriptInIsolatedWorld(1001, [{
      code: buildAutofillScript(item, 'https://other.example')
    }], true);
    assert.strictEqual(blocked.status, 'origin-mismatch');
    console.log('✓ Autofill desktop integration test passed.');
  } finally {
    window.destroy();
    if (app.isReady()) app.quit();
  }
}

main().catch(error => {
  console.error(error);
  app.exit(1);
});
