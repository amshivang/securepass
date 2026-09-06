# Plan 004: Implement "Change Master Password" Workflow

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat a4b9763..HEAD -- crypto-vault.js main.js preload.js renderer/index.html renderer/renderer.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-crypto-vault-automated-test-suite.md, plans/002-fix-backup-encryption-and-salt-bug.md
- **Category**: correctness / feature
- **Planned at**: commit `a4b9763`, 2026-09-06

## Why this matters

Password managers require a safe mechanism to rotate or change the Master Password. Currently, `CryptoVault` has no method to change the master password on an active vault. If a user's master password is compromised, or if they wish to upgrade to a stronger password, they have no option in the application other than deleting the entire vault file.

## Current state

- `crypto-vault.js:23-263` has `initialize(masterPassword)` and `unlock(masterPassword)`.
- `main.js` and `preload.js` do not expose an IPC handler for changing the master password.
- `renderer/index.html` has no modal or form in the Settings view to initiate a master password change.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0, all tests pass |

## Scope

**In scope**:
- `crypto-vault.js` (add `changeMasterPassword(currentPassword, newPassword)`)
- `tests/crypto-vault.test.js` (add automated test for master password change)
- `main.js` and `preload.js` (expose `vault:change-master-password`)
- `renderer/index.html` and `renderer/renderer.js` (add "Change Master Password" card in Settings)

**Out of scope**:
- Do not modify existing item schema.

## Steps

### Step 1: Add `changeMasterPassword` to `CryptoVault`

In `crypto-vault.js`:
```javascript
changeMasterPassword(currentPassword, newPassword) {
  this._ensureUnlocked();
  if (!newPassword || newPassword.length < 8) {
    throw new Error('New master password must be at least 8 characters.');
  }

  // 1. Verify current password matches active session
  const verifyKey = this._deriveKey(currentPassword, this.salt);
  if (!crypto.timingSafeEqual(verifyKey, this.derivedKey)) {
    throw new Error('Current master password is incorrect.');
  }

  // 2. Generate brand new salt for the new password
  const newSalt = crypto.randomBytes(SALT_LENGTH);
  const newKey = this._deriveKey(newPassword, newSalt);

  // 3. Update active session credentials
  if (this.derivedKey) this.derivedKey.fill(0);
  this.derivedKey = newKey;
  this.salt = newSalt;

  // 4. Re-encrypt entire vault with new key and new salt
  this.save(newSalt);
  return { success: true };
}
```

### Step 2: Add test in `tests/crypto-vault.test.js`

Add a test case that:
1. Creates vault with Password A.
2. Changes master password to Password B.
3. Locks vault.
4. Verifies unlocking with Password A fails.
5. Verifies unlocking with Password B succeeds and returns all items intact.

### Step 3: Wire IPC and Settings UI

1. In `main.js`: Add IPC handler `vault:change-master-password`.
2. In `preload.js`: Add `vaultChangeMasterPassword(currentPassword, newPassword)` to context bridge.
3. In `renderer/index.html` (Settings View): Add a "Change Master Password" card with current password, new password, and confirm new password fields.
4. In `renderer/renderer.js`: Handle form submission with validation and toast notifications.

**Verification**: `npm test` passing.

## Done criteria

1. Master password can be changed in an active vault session.
2. Old password ceases to work; new password decrypts all items.
3. Automated unit test confirms rotation behavior.
