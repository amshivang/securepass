# Plan 002: Fix Backup Encryption and Salt Regeneration Bug

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat a4b9763..HEAD -- crypto-vault.js renderer/renderer.js renderer/index.html`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-crypto-vault-automated-test-suite.md
- **Category**: security / bug
- **Planned at**: commit `a4b9763`, 2026-09-06

## Why this matters

1. **Vulnerability (SEC-01):** The UI presents a button *"Export Encrypted Backup (.json)"*, but `crypto-vault.js:exportBackup()` returns unencrypted plaintext JSON (`JSON.stringify(this.unlockedData)`). Users storing this backup on external media will expose all their passwords in plain text.
2. **Data Loss Hazard (CORR-01):** When saving updates to the vault, `crypto-vault.js:save()` re-reads `this.vaultFilePath` from disk to find `prev.salt`. If this disk read throws or encounters a missing file, it generates a fresh salt with `crypto.randomBytes()`, writes the new salt to the header, but encrypts with the key derived from the *old* salt. The vault becomes permanently un-decryptable on next unlock.

## Current state

- `crypto-vault.js:143-157` has:
  ```javascript
  let salt = optionalSalt;
  if (!salt) {
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
  ```
- `crypto-vault.js:239-242` has:
  ```javascript
  exportBackup() {
    this._ensureUnlocked();
    return JSON.stringify(this.unlockedData, null, 2);
  }
  ```
- `renderer/index.html:190-202` and `renderer/renderer.js:712-725` call `vaultExportBackup()` and save it as a JSON file, implying it is encrypted.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0, all tests pass |

## Scope

**In scope**:
- `crypto-vault.js` (store salt on instance; implement true encrypted backup export & import)
- `tests/crypto-vault.test.js` (add tests for salt preservation and encrypted backup)
- `renderer/renderer.js` and `renderer/index.html` (update export/import UI text and handling)

**Out of scope**:
- Do not change the PBKDF2 iteration count or basic envelope JSON schema on disk.

## Steps

### Step 1: Store `salt` on `CryptoVault` instance

In `crypto-vault.js`:
1. In constructor, add `this.salt = null;`.
2. In `initialize(masterPassword)`: store `this.salt = salt;`.
3. In `unlock(masterPassword)`: store `this.salt = salt;`.
4. In `lock()`: clear `this.salt = null;`.
5. In `save()`:
   Use `this.salt`. Never re-read from disk or generate a random salt during a routine save:
   ```javascript
   if (!this.salt) {
     throw new Error('Active salt missing from unlocked vault session.');
   }
   const salt = this.salt;
   ```

**Verification**: Run `npm test`.

---

### Step 2: Implement True Encrypted Backup Export & Import

In `crypto-vault.js`:
1. `exportEncryptedBackup()`:
   Read the encrypted envelope directly from `this.vaultFilePath` (or re-serialize the encrypted ciphertext envelope). Return the JSON string of the encrypted envelope:
   ```javascript
   exportEncryptedBackup() {
     this._ensureUnlocked();
     return fs.readFileSync(this.vaultFilePath, 'utf8');
   }
   ```
2. `exportPlaintextBackup()`:
   Retain a method for unencrypted plaintext JSON, clearly named `exportPlaintextBackup()`.
3. `importEncryptedBackup(backupEnvelopeString, masterPassword)`:
   Verify that the imported file is a valid encrypted envelope (has `salt`, `iv`, `tag`, `data`). Test decryption with the provided `masterPassword`. If successful, write it atomically to `this.vaultFilePath` and set active session data.

In `main.js`:
- Update IPC handlers to expose `vault:export-encrypted-backup` and `vault:export-plaintext-backup`.

In `renderer/index.html` and `renderer/renderer.js`:
- Update the export button to download the true encrypted envelope.
- Add an explicit option for plaintext export with a confirmation warning dialog.

**Verification**: `npm test` passing with new test cases asserting that `exportEncryptedBackup()` output cannot be read without the master key.

## Done criteria

1. Active salt is persisted in memory on `this.salt` and never randomly regenerated during `save()`.
2. `exportEncryptedBackup()` outputs ciphertext with auth tag, not plaintext passwords.
3. `npm test` passes cleanly.
