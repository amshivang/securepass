# Plan 007: Integrated Two-Factor Authentication (TOTP) RFC 6238 Engine

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53bf3eb..HEAD -- crypto-vault.js renderer/index.html renderer/renderer.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction / feature
- **Planned at**: commit `53bf3eb`, 2026-09-06

## Why this matters

Modern password managers (Bitwarden, 1Password) integrate a built-in 2FA Authenticator engine. Currently, SecurePass items store only title, username, password, URL, and notes. When users log into two-factor protected accounts, they must open a separate mobile app (Google Authenticator) to fetch the 6-digit code. This plan introduces native RFC 6238 TOTP generation using Node.js's native `crypto` module with zero third-party dependencies.

## Current state

- `crypto-vault.js` manages credential schema:
```javascript
const item = {
  id: crypto.randomUUID(),
  title: data.title || '',
  username: data.username || '',
  password: data.password || '',
  url: data.url || '',
  notes: data.notes || '',
  category: data.category || 'Logins',
  favorite: !!data.favorite,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```
- There is currently no `totpSecret` field or RFC 6238 HMAC-SHA1 counter calculation.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0, all tests pass |

## Scope

**In scope**:
- `crypto-vault.js` (add Base32 decoder and `generateTOTP(secret, timestamp)` method)
- `tests/totp.test.js` (RFC 6238 test vectors verification)
- `main.js` and `preload.js` (expose `vault:generate-totp` IPC)
- `renderer/index.html` (add TOTP secret input field in modal, TOTP badge on credential cards)
- `renderer/renderer.js` (render live rotating 6-digit code with countdown timer)

**Out of scope**:
- Do not add external QR code scanning libraries.
- Zero npm runtime dependencies.

## Steps

### Step 1: Add RFC 6238 TOTP Engine to `crypto-vault.js`

Implement standard Base32 decoding and HMAC-SHA1 algorithm:
```javascript
function base32Decode(base32) {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, timestamp = Date.now(), stepSeconds = 30) {
  if (!secret) return null;
  const key = base32Decode(secret);
  const epoch = Math.floor(timestamp / 1000);
  const counter = Math.floor(epoch / stepSeconds);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt = ((hmac[offset] & 0x7f) << 24) |
                  ((hmac[offset + 1] & 0xff) << 16) |
                  ((hmac[offset + 2] & 0xff) << 8) |
                  (hmac[offset + 3] & 0xff);

  const code = (codeInt % 1000000).toString().padStart(6, '0');
  const remainingSeconds = stepSeconds - (epoch % stepSeconds);

  return { code, remainingSeconds };
}
```

### Step 2: Add RFC 6238 Test Suite in `tests/totp.test.js`

Validate RFC 6238 standard test vectors using secret `'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'` (ASCII string: `12345678901234567890`).

### Step 3: Wire IPC and Frontend UI

1. Expose `vaultGenerateTOTP(secret)` in `preload.js` and `main.js`.
2. In `renderer/index.html`:
   - In credential modal, add input `#itemTotp` ("2FA / Authenticator Key (Base32)").
   - On credential cards, if item has `totpSecret`, display a dedicated TOTP row with 6-digit code, remaining seconds, and one-click copy button.
3. In `renderer/renderer.js`:
   - Set up an interval every second to refresh active TOTP codes and update the countdown display.

## Done criteria

- [x] `npm test` passes all tests including TOTP test vectors.
- [x] Storing a 2FA secret generates the correct 6-digit rotating code.
- [x] 100% zero external dependencies used.
