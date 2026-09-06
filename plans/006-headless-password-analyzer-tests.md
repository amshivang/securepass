# Plan 006: Headless Password Analyzer & Shannon Entropy Unit Test Suite

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53bf3eb..HEAD -- renderer/renderer.js package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `53bf3eb`, 2026-09-06

## Why this matters

Currently, the Shannon entropy calculation, brute-force crack time estimator, and password scoring engine are defined directly inside `renderer/renderer.js:520-568`. Because they are coupled with DOM code, they have zero automated test coverage. If an edge case (empty string, repetitive sequences, unicode characters) breaks the mathematical models, it cannot be caught until a user reports an issue. This plan extracts the pure mathematical functions into `analyzer-engine.js` and creates an automated test suite.

## Current state

- `renderer/renderer.js:520-568` defines:
  - `calculateShannonEntropy(str)`
  - `evaluatePasswordScore(pwd)`
  - `estimateCrackTime(pwd)`
- `package.json:10` currently has:
  `"test": "node tests/crypto-vault.test.js"`

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0, all tests pass |

## Scope

**In scope**:
- `analyzer-engine.js` (create pure math functions exportable for both Node and Browser)
- `renderer/index.html` (include `analyzer-engine.js`)
- `renderer/renderer.js` (use `analyzer-engine.js`)
- `tests/analyzer.test.js` (create test suite)
- `package.json` (update `"test"` script)

**Out of scope**:
- Do not edit `crypto-vault.js` or `main.js`.

## Steps

### Step 1: Create `analyzer-engine.js`

Extract the pure mathematical functions into a UMD / CommonJS compatible module:
```javascript
/**
 * SecurePass Analyzer Engine - Pure Mathematical & Cryptographic Logic
 */
function calculateShannonEntropy(str) {
  if (!str) return 0;
  const len = str.length;
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function evaluatePasswordScore(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score += 2;
  if (pwd.length >= 12) score += 3;
  if (pwd.length >= 16) score += 2;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/[A-Z]/.test(pwd)) score += 2;
  if (/[0-9]/.test(pwd)) score += 2;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 3;
  return Math.min(15, score);
}

function estimateCrackTime(pwd) {
  if (!pwd) return 'Instant';
  const len = pwd.length;
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 33;
  if (pool === 0) pool = 1;

  const combinations = Math.pow(pool, len);
  const guessesPerSec = 1e11; // 100 billion/sec (hashcat cluster)
  const seconds = combinations / (2 * guessesPerSec);

  if (seconds < 1) return 'Instant (< 1 sec)';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 315360000000) return `${Math.round(seconds / 3153600000)} centuries`;
  return 'Trillions of years';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateShannonEntropy,
    evaluatePasswordScore,
    estimateCrackTime
  };
}
```

### Step 2: Create `tests/analyzer.test.js`

Create test suite covering:
1. `calculateShannonEntropy`:
   - Empty string returns `0`.
   - Single character repeated (e.g. `'aaaaa'`) returns `0`.
   - High variety string returns expected entropy > 3.5.
2. `evaluatePasswordScore`:
   - Empty password returns `0`.
   - Weak password (e.g. `'abc'`) returns `1`.
   - 18-char complex password returns maximum `15`.
3. `estimateCrackTime`:
   - Short password returns `'Instant (< 1 sec)'`.
   - Strong password returns `'Trillions of years'`.

### Step 3: Update `package.json` and `renderer/index.html`

In `package.json`:
```json
"test": "node tests/crypto-vault.test.js && node tests/analyzer.test.js"
```
In `renderer/index.html`, add `<script src="../analyzer-engine.js"></script>` or copy to `renderer/analyzer-engine.js`.

**Verify**: `npm test` passing with exit 0.

## Done criteria

- [x] `npm test` runs both test suites and exits with code 0.
- [x] Shannon entropy and crack time math are verified by automated assertions.
