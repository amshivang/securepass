const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { CryptoVault } = require('../crypto-vault');

const TEST_VAULT = path.join(__dirname, 'test_vault.enc');

function cleanup() {
  if (fs.existsSync(TEST_VAULT)) fs.unlinkSync(TEST_VAULT);
  if (fs.existsSync(`${TEST_VAULT}.tmp`)) fs.unlinkSync(`${TEST_VAULT}.tmp`);
}

cleanup();
try {
  const vault = new CryptoVault(TEST_VAULT);
  const password = 'CorrectMasterPassword!2026';
  const wrongPassword = 'WrongMasterPassword!9999';

  // 1. Vault initialization with master password
  assert.strictEqual(vault.exists(), false, 'Vault file should not exist before init');
  const initResult = vault.initialize(password);
  assert.deepStrictEqual(initResult, { success: true }, 'Init should return { success: true }');
  assert.strictEqual(vault.isUnlocked, true, 'Vault should be unlocked after init');
  assert.strictEqual(vault.exists(), true, 'Vault file should exist on disk after init');
  assert.throws(
    () => vault.initialize(password),
    /Vault already exists/,
    'Re-initializing an existing vault should throw'
  );

  // 2. Item creation (addItem), retrieval (getItems), update (updateItem), and deletion (deleteItem)
  const item1Data = {
    title: 'Personal Email',
    username: 'alice@example.com',
    password: 'SuperSecretPassword!1',
    url: 'https://mail.example.com',
    notes: 'Recovery code 12345',
    category: 'Logins',
    favorite: true
  };
  const created1 = vault.addItem(item1Data);
  assert.ok(created1.id, 'Created item must have an id');
  assert.strictEqual(created1.title, item1Data.title);
  assert.strictEqual(created1.username, item1Data.username);
  assert.strictEqual(created1.password, item1Data.password);
  assert.strictEqual(created1.url, item1Data.url);
  assert.strictEqual(created1.notes, item1Data.notes);
  assert.strictEqual(created1.category, item1Data.category);
  assert.strictEqual(created1.favorite, true);

  const item2Data = {
    title: 'Work Portal',
    username: 'alice.work',
    password: 'WorkPassword!2',
    category: 'Logins'
  };
  const created2 = vault.addItem(item2Data);
  assert.ok(created2.id, 'Created second item must have an id');

  let items = vault.getItems();
  assert.strictEqual(items.length, 2, 'getItems should return 2 items');
  assert.strictEqual(items[0].id, created2.id, 'Newest item should be at the front');
  assert.strictEqual(items[1].id, created1.id);

  // Update item
  const updatePayload = {
    title: 'Personal Email (Updated)',
    username: 'alice.new@example.com',
    favorite: false
  };
  const updated1 = vault.updateItem(created1.id, updatePayload);
  assert.strictEqual(updated1.title, 'Personal Email (Updated)');
  assert.strictEqual(updated1.username, 'alice.new@example.com');
  assert.strictEqual(updated1.favorite, false);
  assert.strictEqual(updated1.password, item1Data.password, 'Unchanged fields should be preserved');
  assert.strictEqual(updated1.id, created1.id, 'ID must not change');

  // Verify non-existent item operations throw
  assert.throws(() => vault.updateItem('non-existent-id', { title: 'X' }), /Item not found/);
  assert.throws(() => vault.deleteItem('non-existent-id'), /Item not found/);

  // Delete item
  const delResult = vault.deleteItem(created1.id);
  assert.deepStrictEqual(delResult, { success: true });
  items = vault.getItems();
  assert.strictEqual(items.length, 1, 'getItems should return 1 item after deletion');
  assert.strictEqual(items[0].id, created2.id, 'Remaining item should be item2');

  // 3. Vault locking (lock) and verification that getItems() throws when locked
  const lockResult = vault.lock();
  assert.deepStrictEqual(lockResult, { success: true });
  assert.strictEqual(vault.isUnlocked, false, 'isUnlocked should be false after lock');
  assert.strictEqual(vault.derivedKey, null, 'derivedKey should be null after lock');
  assert.strictEqual(vault.unlockedData, null, 'unlockedData should be null after lock');

  assert.throws(
    () => vault.getItems(),
    /Vault is locked\. Unlock before performing operations\./,
    'getItems() must throw when vault is locked'
  );
  assert.throws(
    () => vault.addItem({ title: 'Test' }),
    /Vault is locked\. Unlock before performing operations\./,
    'addItem() must throw when vault is locked'
  );
  assert.throws(
    () => vault.updateItem(created2.id, { title: 'Test' }),
    /Vault is locked\. Unlock before performing operations\./,
    'updateItem() must throw when vault is locked'
  );
  assert.throws(
    () => vault.deleteItem(created2.id),
    /Vault is locked\. Unlock before performing operations\./,
    'deleteItem() must throw when vault is locked'
  );

  // 4. Unlocking with incorrect master password (verifying it fails GCM authentication cleanly)
  assert.throws(
    () => vault.unlock(wrongPassword),
    /Invalid master password or vault has been corrupted\./,
    'Unlocking with wrong password must throw authentication error'
  );
  assert.strictEqual(vault.isUnlocked, false, 'Vault must remain locked after failed unlock attempt');

  // 5. Unlocking with correct master password and verifying decrypted item integrity
  const unlockResult = vault.unlock(password);
  assert.strictEqual(unlockResult.success, true, 'Unlock with correct password should succeed');
  assert.strictEqual(vault.isUnlocked, true, 'Vault should be unlocked after successful unlock');

  const unlockedItems = vault.getItems();
  assert.strictEqual(unlockedItems.length, 1, 'Should have 1 item preserved across lock/unlock');
  assert.strictEqual(unlockedItems[0].id, created2.id);
  assert.strictEqual(unlockedItems[0].title, item2Data.title);
  assert.strictEqual(unlockedItems[0].username, item2Data.username);
  assert.strictEqual(unlockedItems[0].password, item2Data.password);

  // 6. Tamper detection: Modifying an encrypted byte in the vault file and verifying unlock fails with an authentication error
  vault.lock();

  // Read raw file envelope
  const rawEnvelope = JSON.parse(fs.readFileSync(TEST_VAULT, 'utf8'));
  const originalCipherHex = rawEnvelope.data;
  assert.ok(originalCipherHex.length > 2, 'Ciphertext should not be empty');

  // Flip the first two hex characters (one byte) in ciphertext
  const firstByte = parseInt(originalCipherHex.substring(0, 2), 16);
  const tamperedByte = (firstByte ^ 0xff).toString(16).padStart(2, '0');
  rawEnvelope.data = tamperedByte + originalCipherHex.substring(2);

  fs.writeFileSync(TEST_VAULT, JSON.stringify(rawEnvelope, null, 2), 'utf8');

  // Attempt to unlock tampered file
  assert.throws(
    () => vault.unlock(password),
    /Invalid master password or vault has been corrupted\./,
    'Tampered ciphertext must fail GCM tag verification and throw authentication error'
  );
  assert.strictEqual(vault.isUnlocked, false, 'Vault must remain locked after tampering detected');

  // Also test tampering with auth tag
  rawEnvelope.data = originalCipherHex;
  const tagByte = parseInt(rawEnvelope.tag.substring(0, 2), 16);
  rawEnvelope.tag = ((tagByte ^ 0xff).toString(16).padStart(2, '0')) + rawEnvelope.tag.substring(2);
  fs.writeFileSync(TEST_VAULT, JSON.stringify(rawEnvelope, null, 2), 'utf8');

  assert.throws(
    () => vault.unlock(password),
    /Invalid master password or vault has been corrupted\./,
    'Tampered auth tag must fail GCM authentication'
  );
  assert.strictEqual(vault.isUnlocked, false, 'Vault must remain locked when tag is tampered');

  // Also test corrupted JSON format
  fs.writeFileSync(TEST_VAULT, 'NOT_VALID_JSON{{{', 'utf8');
  assert.throws(
    () => vault.unlock(password),
    /Corrupted vault file format\./,
    'Corrupted JSON must throw corrupted vault file format error'
  );

  console.log('✓ All CryptoVault tests passed.');
} finally {
  // 7. Cleanup: Ensure temporary test vault files are deleted before and after test execution in a finally block
  cleanup();
}
