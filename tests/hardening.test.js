const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CryptoVault } = require('../crypto-vault');

const vaultPath = path.join(os.tmpdir(), `securepass-hardening-${process.pid}-${Date.now()}.enc`);

function cleanup() {
  for (const file of [vaultPath, `${vaultPath}.tmp`]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

function createLegacyVault(password, data) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  const envelope = {
    version: 1,
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: 100000,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: ciphertext.toString('hex')
  };
  fs.writeFileSync(vaultPath, JSON.stringify(envelope), { mode: 0o600 });
  key.fill(0);
}

(async () => {
  cleanup();
  try {
    const password = 'HardeningMasterPassword!2026';
    const vault = new CryptoVault(vaultPath);
    vault.initialize(password);

    const envelope = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
    assert.strictEqual(envelope.iterations, 600000, 'New vaults should use the stronger KDF cost');

    const item = vault.addItem({
      title: 'Employee Portal',
      username: 'person@example.com',
      password: 'A secure password #1',
      category: 'Logins',
      customFields: [
        { name: 'Employee ID', value: 'EMP-42' },
        { name: 'PIN', value: '1234' }
      ]
    });
    const expectedCustomFields = [
      { name: 'Employee ID', value: 'EMP-42' },
      { name: 'PIN', value: '1234' }
    ];
    assert.deepStrictEqual(item.customFields, expectedCustomFields);

    vault.lock();
    assert.deepStrictEqual(item.customFields, [], 'Custom field values should be removed from references on lock');
    vault.unlock(password);
    assert.deepStrictEqual(vault.getItems()[0].customFields, expectedCustomFields);

    assert.throws(
      () => vault.addItem({ title: 'Bad Category', category: 'Unsupported' }),
      /unsupported category/
    );
    assert.throws(
      () => vault.addItem({ title: 'Bad Field', username: 1234 }),
      /username must be a string/
    );
    assert.throws(
      () => vault.importBackup(JSON.stringify({ items: [{ id: item.id }, { id: item.id }] }), 'replace'),
      /Duplicate item IDs/
    );
    assert.strictEqual(vault.getItems().length, 1, 'Rejected imports must not mutate the vault');

    vault.lock();
    const malformed = {
      version: 1,
      kdf: 'PBKDF2-HMAC-SHA256',
      iterations: 600000,
      salt: 'not-hex',
      iv: '00'.repeat(12),
      tag: '00'.repeat(16),
      data: ''
    };
    fs.writeFileSync(vaultPath, JSON.stringify(malformed));
    assert.throws(() => vault.unlock(password), /Corrupted vault file format/);

    createLegacyVault(password, {
      version: 1,
      createdAt: new Date().toISOString(),
      categories: ['All', 'Logins', 'Cards', 'Secure Notes'],
      items: [{
        id: 'legacy-item',
        title: 'Legacy',
        username: 'legacy-user',
        password: 'legacy-password',
        url: '',
        notes: '',
        category: 'Logins',
        favorite: false,
        totpSecret: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]
    });
    const legacyVault = new CryptoVault(vaultPath);
    legacyVault.unlock(password);
    assert.strictEqual(legacyVault.getItems()[0].password, 'legacy-password');
    assert.strictEqual(legacyVault.kdfIterations, 100000, 'Legacy vaults should remain readable');

    console.log('✓ All vault hardening tests passed.');
  } finally {
    cleanup();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
