# Plan 001: Establish Automated CryptoVault Test Suite Baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat a4b9763..HEAD -- package.json crypto-vault.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `a4b9763`, 2026-09-06

## Why this matters

Currently, there is zero automated test coverage for the zero-knowledge cryptographic vault engine. The script `npm run test:crypto` points to `test-crypto.js` which does not exist, causing tests to crash with `MODULE_NOT_FOUND`. Without an automated test suite, any refactoring or bug fixing in `crypto-vault.js` risks silent cryptographic regressions, data corruption, or vault lockouts. This plan establishes a fast, zero-dependency test suite running on `npm test`.

## Current state

- `package.json:10` currently has:
  ```json
  "test:crypto": "node test-crypto.js",
  ```
  `test-crypto.js` is missing from the repository root.
- `crypto-vault.js:23-263` exposes the class `CryptoVault` with methods:
  - `initialize(masterPassword)`
  - `unlock(masterPassword)`
  - `lock()`
  - `save()`
  - `addItem(item)`
  - `updateItem(id, itemUpdate)`
  - `deleteItem(id)`
  - `exportBackup()`
  - `importBackup(jsonString)`
- Repo convention: Use native Node.js standard libraries (`assert`, `fs`, `path`, `crypto`) with zero third-party testing dependencies, adhering to the Ponytail simplicity principle.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Run tests | `npm test` | exit 0, all assertions pass |

## Scope

**In scope**:
- `package.json` (update scripts)
- `tests/crypto-vault.test.js` (create test suite)

**Out of scope**:
- Do NOT edit `crypto-vault.js` in this plan.
- Do NOT add heavy test runners (Jest, Mocha). Use Node's built-in `assert` module.

## Steps

### Step 1: Create `tests/crypto-vault.test.js`

Create a comprehensive test suite covering:
1. Vault initialization with master password.
2. Item creation (`addItem`), retrieval (`getItems`), update (`updateItem`), and deletion (`deleteItem`).
3. Vault locking (`lock`) and verification that `getItems()` throws when locked.
4. Unlocking with incorrect master password (verifying it fails GCM authentication cleanly).
5. Unlocking with correct master password and verifying decrypted item integrity.
6. Tamper detection: Modifying an encrypted byte in the vault file and verifying `unlock` fails with an authentication error.
7. Cleanup: Ensure temporary test vault files are deleted before and after test execution in a `finally` block.

Exemplar structure:
```javascript
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
  // Test cases...
  console.log('✓ All CryptoVault tests passed.');
} finally {
  cleanup();
}
```

**Verification**: `node tests/crypto-vault.test.js`  
**Expected**: Output `✓ All CryptoVault tests passed.` with exit code 0.

---

### Step 2: Update `package.json` scripts

Update `package.json` to define:
```json
"scripts": {
  "start": "electron .",
  "test": "node tests/crypto-vault.test.js",
  "pack:win": "electron-builder --win --dir",
  "dist:win": "electron-builder --win"
}
```

**Verification**: `npm test`  
**Expected**: Output `✓ All CryptoVault tests passed.` with exit code 0.

## Done criteria

1. `npm test` exits with code 0 and passes all crypto test cases.
2. Temporary test files are cleaned up after execution.
3. Zero external dependencies added.
