/**
 * SecurePass Zero-Knowledge Cryptographic Vault Engine
 * 
 * Implements Bitwarden-grade client-side encryption:
 * - PBKDF2-HMAC-SHA256 (100,000 rounds) key derivation
 * - AES-256-GCM authenticated encryption (confidentiality + integrity)
 * - Atomic disk writes to protect against data corruption
 * - Memory zeroing on lock
 * 
 * ponytail: Native Node.js crypto used instead of external libraries - zero dependencies, OpenSSL C speed.
 * ponytail: AES-256-GCM provides encryption + authentication in one primitive without separate HMAC.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

class CryptoVault {
  constructor(vaultFilePath) {
    this.vaultFilePath = vaultFilePath;
    this.derivedKey = null;
    this.unlockedData = null;
    this.isUnlocked = false;
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
  _deriveKey(masterPassword, salt) {
    return crypto.pbkdf2Sync(
      masterPassword,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Initialize a brand new vault with a master password
   */
  initialize(masterPassword) {
    if (this.exists()) {
      throw new Error('Vault already exists. Unlock it or delete the existing file.');
    }

    const salt = crypto.randomBytes(SALT_LENGTH);
    this.derivedKey = this._deriveKey(masterPassword, salt);
    this.unlockedData = {
      version: 1,
      createdAt: new Date().toISOString(),
      items: [],
      categories: ['All', 'Logins', 'Cards', 'Secure Notes'],
    };
    this.isUnlocked = true;

    this.save(salt);
    return { success: true };
  }

  /**
   * Unlock an existing vault with master password
   */
  unlock(masterPassword) {
    if (!this.exists()) {
      throw new Error('Vault file not found.');
    }

    const raw = fs.readFileSync(this.vaultFilePath, 'utf8');
    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch (e) {
      throw new Error('Corrupted vault file format.');
    }

    const salt = Buffer.from(envelope.salt, 'hex');
    const iv = Buffer.from(envelope.iv, 'hex');
    const tag = Buffer.from(envelope.tag, 'hex');
    const ciphertext = Buffer.from(envelope.data, 'hex');

    const key = this._deriveKey(masterPassword, salt);

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      this.derivedKey = key;
      this.unlockedData = JSON.parse(decrypted.toString('utf8'));
      this.isUnlocked = true;

      return { success: true, data: this.unlockedData };
    } catch (err) {
      // GCM authentication failed -> wrong password or tampered ciphertext
      throw new Error('Invalid master password or vault has been corrupted.');
    }
  }

  /**
   * Lock vault and clear master key from memory
   */
  lock() {
    if (this.derivedKey) {
      // Zero out key buffer
      this.derivedKey.fill(0);
      this.derivedKey = null;
    }
    this.unlockedData = null;
    this.isUnlocked = false;
    return { success: true };
  }

  /**
   * Save current unlocked data securely to disk (atomic write)
   */
  save(optionalSalt = null) {
    if (!this.isUnlocked || !this.derivedKey) {
      throw new Error('Cannot save locked vault.');
    }

    // Ensure directory exists
    const dir = path.dirname(this.vaultFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let salt = optionalSalt;
    if (!salt) {
      // Re-read existing salt if available, otherwise generate new
      if (fs.existsSync(this.vaultFilePath)) {
        try {
          const raw = fs.readFileSync(this.vaultFilePath, 'utf8');
          const prev = JSON.parse(raw);
          salt = Buffer.from(prev.salt, 'hex');
        } catch (e) {
          salt = crypto.randomBytes(SALT_LENGTH);
        }
      } else {
        salt = crypto.randomBytes(SALT_LENGTH);
      }
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.derivedKey, iv);

    const plaintext = Buffer.from(JSON.stringify(this.unlockedData), 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    const envelope = {
      version: 1,
      kdf: 'PBKDF2-HMAC-SHA256',
      iterations: PBKDF2_ITERATIONS,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: ciphertext.toString('hex'),
      updatedAt: new Date().toISOString()
    };

    // Atomic write to prevent partial writes
    const tmpFile = `${this.vaultFilePath}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(envelope, null, 2), 'utf8');
    fs.renameSync(tmpFile, this.vaultFilePath);

    return { success: true };
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
    const newItem = {
      id: crypto.randomUUID(),
      title: item.title || 'Untitled',
      username: item.username || '',
      password: item.password || '',
      url: item.url || '',
      notes: item.notes || '',
      category: item.category || 'Logins',
      favorite: !!item.favorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.unlockedData.items.unshift(newItem);
    this.save();
    return newItem;
  }

  updateItem(id, itemUpdate) {
    this._ensureUnlocked();
    const index = this.unlockedData.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Item not found');

    this.unlockedData.items[index] = {
      ...this.unlockedData.items[index],
      ...itemUpdate,
      id, // protect ID
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.unlockedData.items[index];
  }

  deleteItem(id) {
    this._ensureUnlocked();
    const before = this.unlockedData.items.length;
    this.unlockedData.items = this.unlockedData.items.filter(i => i.id !== id);
    if (this.unlockedData.items.length === before) throw new Error('Item not found');
    this.save();
    return { success: true };
  }

  exportBackup() {
    this._ensureUnlocked();
    return JSON.stringify(this.unlockedData, null, 2);
  }

  importBackup(jsonString) {
    this._ensureUnlocked();
    const parsed = JSON.parse(jsonString);
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid backup file format.');
    }
    this.unlockedData.items = parsed.items;
    this.save();
    return { success: true, count: parsed.items.length };
  }

  _ensureUnlocked() {
    if (!this.isUnlocked || !this.unlockedData) {
      throw new Error('Vault is locked. Unlock before performing operations.');
    }
  }
}

module.exports = { CryptoVault };
