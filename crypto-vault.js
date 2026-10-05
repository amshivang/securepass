/**
 * SecurePass Zero-Knowledge Cryptographic Vault Engine
 * 
 * Implements local authenticated vault encryption:
 * - PBKDF2-HMAC-SHA256 (600,000 rounds for new vaults) key derivation
 * - AES-256-GCM authenticated encryption (confidentiality + integrity)
 * - Atomic disk writes to protect against data corruption
 * - Memory zeroing on lock
 * 
 * Uses native Node.js crypto without external cryptographic dependencies.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PBKDF2_ITERATIONS = 600000;
const LEGACY_PBKDF2_ITERATIONS = 100000;
const MIN_PBKDF2_ITERATIONS = 100000;
const MAX_PBKDF2_ITERATIONS = 5000000;
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16;
const MIN_MASTER_PASSWORD_LENGTH = 8;
const MAX_ITEM_FIELD_LENGTHS = {
  title: 500,
  username: 2000,
  password: 4096,
  url: 2048,
  notes: 10000,
  totpSecret: 512
};
const ITEM_CATEGORIES = new Set(['Logins', 'Cards', 'Secure Notes']);
const DEFAULT_CATEGORIES = ['All', 'Logins', 'Cards', 'Secure Notes'];
const MAX_VAULT_BYTES = 20 * 1024 * 1024;

function validateMasterPassword(masterPassword, fieldName = 'Master password') {
  if (typeof masterPassword !== 'string' || masterPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
    throw new Error(`${fieldName} must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`);
  }
}

function getIterationCount(value, allowMissing = false) {
  if (value === undefined && allowMissing) return LEGACY_PBKDF2_ITERATIONS;
  if (!Number.isSafeInteger(value) || value < MIN_PBKDF2_ITERATIONS || value > MAX_PBKDF2_ITERATIONS) {
    throw new Error('Invalid vault file format.');
  }
  return value;
}

function decodeHexField(value, expectedBytes, fieldName) {
  if (typeof value !== 'string' || value.length !== expectedBytes * 2 || !/^[0-9a-f]+$/i.test(value)) {
    throw new Error(`Invalid vault file format: malformed ${fieldName}.`);
  }
  return Buffer.from(value, 'hex');
}

function validateEnvelope(envelope) {
  if (!envelope || Array.isArray(envelope) || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-HMAC-SHA256') {
    throw new Error('Invalid vault file format.');
  }
}

function scrubBuffer(buffer) {
  if (Buffer.isBuffer(buffer)) buffer.fill(0);
}

function scrubVaultData(data) {
  if (!data || !Array.isArray(data.items)) return;
  for (const item of data.items) {
    if (!item || typeof item !== 'object') continue;
    for (const key of ['password', 'username', 'notes', 'totpSecret']) {
      if (typeof item[key] === 'string') item[key] = '';
    }
    if (Array.isArray(item.customFields)) {
      for (const field of item.customFields) field.value = '';
      item.customFields.length = 0;
    }
  }
  data.items.length = 0;
}

function assertStringField(value, fieldName, maxLength, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') {
    throw new Error(`Invalid item: ${fieldName} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new Error(`Invalid item: ${fieldName} is too long.`);
  }
  return value;
}

function normalizeItem(item, { preserveId = false } = {}) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('Invalid item: expected an object.');
  }

  const id = item.id === undefined || item.id === null || item.id === ''
    ? crypto.randomUUID()
    : assertStringField(item.id, 'id', 128);
  if (!id.trim()) throw new Error('Invalid item: id must not be empty.');
  if (!preserveId && item.id !== undefined && item.id !== null && item.id !== '') {
    throw new Error('Invalid item: id cannot be changed.');
  }

  const category = item.category === undefined || item.category === null || item.category === ''
    ? 'Logins'
    : assertStringField(item.category, 'category', 64);
  if (!ITEM_CATEGORIES.has(category)) {
    throw new Error(`Invalid item: unsupported category "${category}".`);
  }

  const now = new Date().toISOString();
  const createdAt = item.createdAt === undefined
    ? now
    : assertStringField(item.createdAt, 'createdAt', 64, now);
  const updatedAt = item.updatedAt === undefined
    ? now
    : assertStringField(item.updatedAt, 'updatedAt', 64, now);

  return {
    id,
    title: assertStringField(item.title, 'title', MAX_ITEM_FIELD_LENGTHS.title, 'Untitled') || 'Untitled',
    username: assertStringField(item.username, 'username', MAX_ITEM_FIELD_LENGTHS.username),
    password: assertStringField(item.password, 'password', MAX_ITEM_FIELD_LENGTHS.password),
    url: assertStringField(item.url, 'url', MAX_ITEM_FIELD_LENGTHS.url),
    notes: assertStringField(item.notes, 'notes', MAX_ITEM_FIELD_LENGTHS.notes),
    category,
    favorite: Boolean(item.favorite),
    totpSecret: assertStringField(item.totpSecret, 'totpSecret', MAX_ITEM_FIELD_LENGTHS.totpSecret).trim(),
    customFields: normalizeCustomFields(item.customFields),
    createdAt,
    updatedAt
  };
}

function normalizeCustomFields(fields = []) {
  if (!Array.isArray(fields) || fields.length > 20) {
    throw new Error('Invalid item: at most 20 custom fields are allowed.');
  }
  return fields.map(field => {
    if (!field || typeof field !== 'object' || Array.isArray(field)) throw new Error('Invalid custom field.');
    const name = assertStringField(field.name, 'custom field name', 200).trim();
    if (!name) throw new Error('Custom fields need a field name or ID.');
    return { name, value: assertStringField(field.value, 'custom field value', 4096) };
  });
}

function normalizeVaultData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.items)) {
    throw new Error('Invalid vault payload.');
  }

  const items = data.items.map(item => normalizeItem(item, { preserveId: true }));
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Duplicate item IDs in vault.');
  return {
    version: Number.isSafeInteger(data.version) ? data.version : 1,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    items,
    categories: Array.isArray(data.categories) && data.categories.every(category => typeof category === 'string')
      ? [...data.categories]
      : [...DEFAULT_CATEGORIES]
  };
}

function writeAtomicFile(filePath, contents) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tmpFile = `${filePath}.tmp`;
  let fileHandle;
  try {
    if (fs.existsSync(tmpFile)) {
      const temporaryStat = fs.lstatSync(tmpFile);
      if (!temporaryStat.isFile()) throw new Error('Unsafe vault temporary file.');
      fs.unlinkSync(tmpFile);
    }
    // Exclusive creation prevents following an existing temporary-file symlink.
    fileHandle = fs.openSync(tmpFile, 'wx', 0o600);
    fs.writeFileSync(fileHandle, contents, 'utf8');
    fs.fsyncSync(fileHandle);
    fs.closeSync(fileHandle);
    fileHandle = null;
    fs.renameSync(tmpFile, filePath);
    // Tighten permissions for existing vaults as well as newly created ones.
    fs.chmodSync(filePath, 0o600);
  } catch (error) {
    const created = fileHandle !== undefined;
    if (fileHandle !== undefined && fileHandle !== null) fs.closeSync(fileHandle);
    try {
      if (created && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch (_cleanupError) {
      // Preserve the original write error.
    }
    throw error;
  }
}

/**
 * Decode standard RFC 4648 Base32 string to Buffer.
 * Ignores spaces, hyphens, lowercase, and padding '='.
 */
function base32Decode(base32) {
  if (!base32 || typeof base32 !== 'string') return Buffer.alloc(0);
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  if (!clean.length) return Buffer.alloc(0);
  if (clean.length > 1024) throw new Error('Base32 secret is too long.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${clean[i]}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate RFC 6238 Time-based One-Time Password (TOTP).
 * Computes 8-byte big-endian counter from epoch seconds, calculates HMAC-SHA1,
 * and performs dynamic truncation per RFC 6238 / RFC 4226.
 */
function generateTOTP(secret, timestamp = Date.now(), stepSeconds = 30) {
  if (!secret) return null;
  if (typeof secret !== 'string') {
    throw new Error('TOTP secret must be a string.');
  }
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error('TOTP timestamp must be a non-negative number.');
  }
  if (!Number.isSafeInteger(stepSeconds) || stepSeconds <= 0 || stepSeconds > 86400) {
    throw new Error('TOTP step must be a positive integer no greater than 86400 seconds.');
  }
  const key = base32Decode(secret);
  if (key.length === 0) return null;
  const epoch = Math.floor(timestamp / 1000);
  const counter = Math.floor(epoch / stepSeconds);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  let hmac;
  try {
    hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  } finally {
    scrubBuffer(key);
  }
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt = ((hmac[offset] & 0x7f) << 24) |
                  ((hmac[offset + 1] & 0xff) << 16) |
                  ((hmac[offset + 2] & 0xff) << 8) |
                  (hmac[offset + 3] & 0xff);

  const code = (codeInt % 1000000).toString().padStart(6, '0');
  const remainingSeconds = stepSeconds - (epoch % stepSeconds);

  return { code, remainingSeconds };
}

class CryptoVault {
  constructor(vaultFilePath) {
    this.vaultFilePath = vaultFilePath;
    this.derivedKey = null;
    this.unlockedData = null;
    this.isUnlocked = false;
    this.salt = null;
    this.kdfIterations = PBKDF2_ITERATIONS;
  }

  /**
   * Check if vault file exists on disk
   */
  exists() {
    return fs.existsSync(this.vaultFilePath);
  }

  /**
   * Derive 256-bit encryption key from master password using PBKDF2
   */
  _deriveKey(masterPassword, salt, iterations = this.kdfIterations) {
    return crypto.pbkdf2Sync(
      masterPassword,
      salt,
      iterations,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Non-blocking PBKDF2 key derivation using worker thread pool
   */
  _deriveKeyAsync(masterPassword, salt, iterations = this.kdfIterations) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        masterPassword,
        salt,
        iterations,
        KEY_LENGTH,
        'sha256',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Initialize a brand new vault with a master password
   */
  initialize(masterPassword) {
    validateMasterPassword(masterPassword);
    if (this.exists()) {
      throw new Error('Vault already exists. Unlock it or delete the existing file.');
    }

    const salt = crypto.randomBytes(SALT_LENGTH);
    this.salt = salt;
    this.kdfIterations = PBKDF2_ITERATIONS;
    this.derivedKey = this._deriveKey(masterPassword, salt);
    this.unlockedData = {
      version: 1,
      createdAt: new Date().toISOString(),
      items: [],
      categories: [...DEFAULT_CATEGORIES],
    };
    this.isUnlocked = true;

    try {
      this.save();
    } catch (error) {
      this.lock();
      throw error;
    }
    return { success: true };
  }

  /**
   * Unlock an existing vault with master password
   */
  unlock(masterPassword) {
    validateMasterPassword(masterPassword);
    if (this.isUnlocked) {
      throw new Error('Vault is already unlocked.');
    }
    if (!this.exists()) {
      throw new Error('Vault file not found.');
    }

    let raw;
    try {
      if (fs.statSync(this.vaultFilePath).size > MAX_VAULT_BYTES) throw new Error('Vault file too large.');
      raw = fs.readFileSync(this.vaultFilePath, 'utf8');
    } catch (_error) {
      throw new Error('Unable to read vault file.');
    }
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch (e) {
      throw new Error('Corrupted vault file format.');
    }

    let salt;
    let iv;
    let tag;
    let ciphertext;
    let iterations;
    try {
      validateEnvelope(envelope);
      salt = decodeHexField(envelope.salt, SALT_LENGTH, 'salt');
      iv = decodeHexField(envelope.iv, IV_LENGTH, 'iv');
      tag = decodeHexField(envelope.tag, AUTH_TAG_LENGTH, 'authentication tag');
      if (typeof envelope.data !== 'string' || envelope.data.length % 2 !== 0 ||
          (envelope.data.length > 0 && !/^[0-9a-f]+$/i.test(envelope.data))) {
        throw new Error('Invalid vault file format: malformed ciphertext.');
      }
      ciphertext = Buffer.from(envelope.data, 'hex');
      iterations = getIterationCount(envelope.iterations, true);
    } catch (error) {
      if (error.message === 'Invalid vault file format.') {
        throw error;
      }
      throw new Error('Corrupted vault file format.');
    }

    const key = this._deriveKey(masterPassword, salt, iterations);

    let decrypted;
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      const parsedData = JSON.parse(decrypted.toString('utf8'));
      const normalizedData = normalizeVaultData(parsedData);

      this.salt = salt;
      this.kdfIterations = iterations;
      this.derivedKey = key;
      this.unlockedData = normalizedData;
      this.isUnlocked = true;

      return { success: true, data: this.unlockedData };
    } catch (err) {
      // GCM authentication failed -> wrong password or tampered ciphertext
      scrubBuffer(key);
      throw new Error('Invalid master password or vault has been corrupted.');
    } finally {
      scrubBuffer(decrypted);
    }
  }

  /**
   * Lock vault and clear master key from memory
   */
  lock() {
    scrubBuffer(this.derivedKey);
    this.derivedKey = null;
    scrubBuffer(this.salt);
    this.salt = null;
    scrubVaultData(this.unlockedData);

    this.unlockedData = null;
    this.isUnlocked = false;
    this.kdfIterations = PBKDF2_ITERATIONS;
    return { success: true };
  }

  /**
   * Reset vault, locking session and permanently deleting the vault file from disk
   */
  reset() {
    this.lock();
    if (this.exists()) {
      fs.unlinkSync(this.vaultFilePath);
    }
    if (fs.existsSync(`${this.vaultFilePath}.tmp`)) {
      fs.unlinkSync(`${this.vaultFilePath}.tmp`);
    }
    return { success: true };
  }

  /**
   * Rotate master password, re-encrypting vault under a fresh salt and new key
   */
  changeMasterPassword(currentPassword, newPassword) {
    this._ensureUnlocked();
    validateMasterPassword(currentPassword, 'Current master password');
    validateMasterPassword(newPassword, 'New master password');
    if (currentPassword === newPassword) {
      throw new Error('New master password must be different from current master password.');
    }

    // 1. Verify current password matches active session
    const verifyKey = this._deriveKey(currentPassword, this.salt);
    try {
      if (!crypto.timingSafeEqual(verifyKey, this.derivedKey)) {
        throw new Error('Current master password is incorrect.');
      }
    } finally {
      verifyKey.fill(0);
    }

    // 2. Generate brand new salt and derive new key
    const oldKey = this.derivedKey;
    const oldSalt = this.salt;
    const oldIterations = this.kdfIterations;
    const newSalt = crypto.randomBytes(SALT_LENGTH);
    const newKey = this._deriveKey(newPassword, newSalt, PBKDF2_ITERATIONS);

    // Re-encrypt before discarding the old active session so a failed write can
    // safely continue using the original key and salt.
    this.derivedKey = newKey;
    this.salt = newSalt;
    this.kdfIterations = PBKDF2_ITERATIONS;
    try {
      this.save();
    } catch (error) {
      scrubBuffer(newKey);
      scrubBuffer(newSalt);
      this.derivedKey = oldKey;
      this.salt = oldSalt;
      this.kdfIterations = oldIterations;
      throw error;
    }

    scrubBuffer(oldKey);
    scrubBuffer(oldSalt);
    return { success: true };
  }

  /**
   * Save current unlocked data securely to disk (atomic write)
   */
  save() {
    if (!this.isUnlocked || !this.derivedKey) {
      throw new Error('Cannot save locked vault.');
    }

    if (!this.salt) {
      throw new Error('Active salt missing from unlocked vault session.');
    }
    const salt = this.salt;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.derivedKey, iv);

    const plaintext = Buffer.from(JSON.stringify(this.unlockedData), 'utf8');
    if (plaintext.length * 2 + 1024 > MAX_VAULT_BYTES) {
      scrubBuffer(plaintext);
      throw new Error('Vault exceeds the 20 MB size limit.');
    }
    let ciphertext;
    let tag;
    try {
      ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final()
      ]);
      tag = cipher.getAuthTag();
    } finally {
      scrubBuffer(plaintext);
    }

    const envelope = {
      version: 1,
      kdf: 'PBKDF2-HMAC-SHA256',
      iterations: this.kdfIterations,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: ciphertext.toString('hex'),
      updatedAt: new Date().toISOString()
    };

    // Atomic, flushed write to prevent partial writes and reduce the chance of
    // leaving a readable vault file with default permissions.
    writeAtomicFile(this.vaultFilePath, JSON.stringify(envelope, null, 2));

    return { success: true };
  }

  generateTOTP(secret, timestamp, stepSeconds) {
    return generateTOTP(secret, timestamp, stepSeconds);
  }

  static generateTOTP(secret, timestamp, stepSeconds) {
    return generateTOTP(secret, timestamp, stepSeconds);
  }

  /**
   * Vault CRUD operations
   */
  getItems() {
    this._ensureUnlocked();
    return this.unlockedData.items || [];
  }

  addItem(item) {
    this._ensureUnlocked();
    const newItem = normalizeItem(item);
    this._commitItems([newItem, ...this.unlockedData.items]);
    return newItem;
  }

  updateItem(id, itemUpdate) {
    this._ensureUnlocked();
    const index = this.unlockedData.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');

    if (!itemUpdate || typeof itemUpdate !== 'object' || Array.isArray(itemUpdate)) {
      throw new Error('Invalid item update: expected an object.');
    }

    const allowedFields = ['title', 'username', 'password', 'url', 'notes', 'category', 'favorite', 'totpSecret', 'customFields'];
    const sanitizedUpdate = {};
    for (const field of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(itemUpdate, field)) continue;
      if (field === 'category') {
        const category = assertStringField(itemUpdate[field], field, 64);
        if (!ITEM_CATEGORIES.has(category)) throw new Error(`Invalid item: unsupported category "${category}".`);
        sanitizedUpdate[field] = category;
      } else if (field === 'favorite') {
        sanitizedUpdate[field] = Boolean(itemUpdate[field]);
      } else if (field === 'customFields') {
        sanitizedUpdate[field] = normalizeCustomFields(itemUpdate[field]);
      } else {
        sanitizedUpdate[field] = assertStringField(itemUpdate[field], field, MAX_ITEM_FIELD_LENGTHS[field]);
        if (field === 'totpSecret') sanitizedUpdate[field] = sanitizedUpdate[field].trim();
      }
    }

    const items = [...this.unlockedData.items];
    items[index] = {
      ...this.unlockedData.items[index],
      ...sanitizedUpdate,
      id, // protect ID
      updatedAt: new Date().toISOString()
    };
    this._commitItems(items);
    return this.unlockedData.items[index];
  }

  deleteItem(id) {
    this._ensureUnlocked();
    const before = this.unlockedData.items.length;
    const items = this.unlockedData.items.filter(i => i.id !== id);
    if (items.length === before) throw new Error('Item not found');
    this._commitItems(items);
    return { success: true };
  }

  exportEncryptedBackup() {
    this._ensureUnlocked();
    return fs.readFileSync(this.vaultFilePath, 'utf8');
  }

  exportPlaintextBackup() {
    this._ensureUnlocked();
    return JSON.stringify(this.unlockedData, null, 2);
  }

  exportBackup() {
    return this.exportEncryptedBackup();
  }

  importEncryptedBackup(backupEnvelopeString, masterPassword, mergeMode = 'merge') {
    validateMasterPassword(masterPassword, 'Backup master password');
    this._validateMergeMode(mergeMode);
    let envelope;
    try {
      if (typeof backupEnvelopeString === 'string' && Buffer.byteLength(backupEnvelopeString) > MAX_VAULT_BYTES) {
        throw new Error('Backup too large.');
      }
      envelope = typeof backupEnvelopeString === 'string' ? JSON.parse(backupEnvelopeString) : backupEnvelopeString;
    } catch (e) {
      throw new Error('Invalid encrypted backup format: invalid JSON.');
    }

    if (!envelope || typeof envelope !== 'object' || !envelope.salt || !envelope.iv || !envelope.tag || !envelope.data) {
      throw new Error('Invalid encrypted backup envelope: missing required crypto fields (salt, iv, tag, data).');
    }

    let salt;
    let iv;
    let tag;
    let ciphertext;
    let iterations;
    try {
      validateEnvelope(envelope);
      salt = decodeHexField(envelope.salt, SALT_LENGTH, 'salt');
      iv = decodeHexField(envelope.iv, IV_LENGTH, 'iv');
      tag = decodeHexField(envelope.tag, AUTH_TAG_LENGTH, 'authentication tag');
      if (typeof envelope.data !== 'string' || envelope.data.length % 2 !== 0 ||
          (envelope.data.length > 0 && !/^[0-9a-f]+$/i.test(envelope.data))) {
        throw new Error('malformed ciphertext');
      }
      ciphertext = Buffer.from(envelope.data, 'hex');
      iterations = getIterationCount(envelope.iterations, true);
    } catch (_error) {
      throw new Error('Invalid encrypted backup envelope: malformed cryptographic parameters.');
    }

    const key = this._deriveKey(masterPassword, salt, iterations);
    let decryptedData;
    let decrypted;
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
      decryptedData = JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
      scrubBuffer(key);
      throw new Error('Invalid master password for encrypted backup or backup file is corrupted.');
    } finally {
      scrubBuffer(decrypted);
    }

    if (!decryptedData || !Array.isArray(decryptedData.items)) {
      scrubBuffer(key);
      throw new Error('Invalid backup payload: missing items array.');
    }
    try {
      decryptedData = normalizeVaultData(decryptedData);
    } catch (_error) {
      scrubBuffer(key);
      throw new Error('Invalid backup payload: malformed item data.');
    }

    const effectiveMode = (!this.isUnlocked && !this.exists()) ? 'replace' : mergeMode;
    if (this.isUnlocked || effectiveMode === 'merge') {
      try {
        this._ensureUnlocked();
        return this._applyImportedItems(decryptedData.items, effectiveMode);
      } finally {
        scrubBuffer(key);
        scrubVaultData(decryptedData);
      }
    }

    const previousKey = this.derivedKey;
    const previousSalt = this.salt;
    const previousData = this.unlockedData;
    try {
      writeAtomicFile(this.vaultFilePath, JSON.stringify(envelope, null, 2));
    } catch (error) {
      scrubBuffer(key);
      throw error;
    }

    // Set active session data only after the encrypted file is safely written.
    scrubBuffer(previousKey);
    scrubBuffer(previousSalt);
    scrubVaultData(previousData);
    this.salt = salt;
    this.derivedKey = key;
    this.kdfIterations = iterations;
    this.unlockedData = decryptedData;
    this.isUnlocked = true;

    return { success: true, count: decryptedData.items.length };
  }

  _applyImportedItems(incomingItems, mergeMode = 'merge') {
    this._ensureUnlocked();
    this._validateMergeMode(mergeMode);
    if (!Array.isArray(incomingItems)) {
      throw new Error('Invalid backup file format: missing items array.');
    }

    const existingMap = new Map(mergeMode === 'merge' ? this.unlockedData.items.map(item => [item.id, item]) : []);
    const incomingIds = new Set();
    for (const item of incomingItems) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid item: expected an object.');
      const existing = typeof item.id === 'string' ? existingMap.get(item.id) : undefined;
      const normalized = normalizeItem({ ...existing, ...item }, { preserveId: true });
      if (incomingIds.has(normalized.id)) throw new Error('Duplicate item IDs in backup.');
      incomingIds.add(normalized.id);
      existingMap.set(normalized.id, normalized);
    }
    this._commitItems([...existingMap.values()]);
    return { success: true, count: this.unlockedData.items.length };
  }

  importBackup(jsonString, mergeMode = 'merge') {
    this._ensureUnlocked();
    this._validateMergeMode(mergeMode);
    let parsed;
    try {
      if (typeof jsonString === 'string' && Buffer.byteLength(jsonString) > MAX_VAULT_BYTES) throw new Error('Backup too large.');
      parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (_error) {
      throw new Error('Invalid backup file format: invalid JSON.');
    }
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error('Invalid backup file format: missing items array.');
    }
    return this._applyImportedItems(parsed.items, mergeMode);
  }

  _validateMergeMode(mergeMode) {
    if (mergeMode !== 'merge' && mergeMode !== 'replace') {
      throw new Error('Invalid backup merge mode.');
    }
  }

  _commitItems(items) {
    const previous = this.unlockedData.items;
    this.unlockedData.items = items;
    try {
      this.save();
    } catch (error) {
      this.unlockedData.items = previous;
      throw error;
    }
  }

  _ensureUnlocked() {
    if (!this.isUnlocked || !this.unlockedData) {
      throw new Error('Vault is locked. Unlock before performing operations.');
    }
  }
}

module.exports = { CryptoVault, base32Decode, generateTOTP };
