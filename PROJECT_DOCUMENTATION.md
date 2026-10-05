# 🛡️ SecurePass: Full Technical Architecture & System Documentation

**Project Name:** SecurePass  
**Type:** Zero-Knowledge Desktop Password Manager, 2FA Authenticator & Real-Time Security Analyzer  
**Target Platform:** Windows (NSIS Installer & Portable Executable)  
**Repository:** `amshivang/securepass`  
**License:** MIT  

---

## 1. Executive Summary & Project Evolution

### 1.1 Overview
**SecurePass** is a privacy-first, zero-knowledge desktop credential manager, RFC 6238 two-factor authenticator (2FA), and real-time cryptographic security analyzer built specifically for Windows. Designed with an ultra-clean, minimalist pure-black aesthetic (`#0a0a0a`), SecurePass combines **Bitwarden-grade client-side authenticated encryption**, a **native RFC 6238 TOTP engine**, and **Shannon entropy mathematical analysis**.

### 1.2 The Evolution: From Toy ML Analyzer to Production Zero-Knowledge Vault
* **The Legacy Prototype:** Originally, SecurePass was a web-based proof-of-concept built in Python/Flask that used a Random Forest classifier to predict password strength based on synthetic datasets. While mathematically interesting, it was not a practical security product—passwords had to be sent over network sockets to a backend server, violating fundamental zero-trust principles.
* **The Modern Architecture:** SecurePass was completely rebuilt from the ground up into a hardened desktop application using **Electron, Node.js (`crypto`), and vanilla JavaScript**. It replaces synthetic ML heuristics with rigorous mathematical entropy formulas ($H(X)$), offline brute-force time estimations, and an end-to-end Zero-Knowledge Cryptographic Vault where master passwords and credentials never touch disk or network in unencrypted form.

---

## 2. High-Level System Architecture

The application adopts a decoupled **Two-Tier Desktop Architecture** utilizing Electron's secure process model:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          RENDERER PROCESS                              │
│  (Isolated Chromium Sandboxed UI - HTML5, Modern CSS3, Vanilla JS)     │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │   Vault Management   │  │ Entropy Analyzer │  │ TOTP Countdown  │   │
│  │   (Search, Categories│  │ (Shannon Entropy,│  │  (Live 30s UI   │   │
│  │    CRUD, Modals)     │  │  Crack Estimates)│  │   Auto-Refresh) │   │
│  └──────────┬───────────┘  └──────────────────┘  └─────────────────┘   │
└─────────────┼──────────────────────────────────────────────────────────┘
              │ window.securePassAPI (Context Bridge)
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           PRELOAD SCRIPT                               │
│  (Strict Context Isolation, Node Integration Disabled, Sandboxed)      │
│  - Whitelists only safe IPC function invocations                       │
│  - Exposes zero Node.js or OS internals to the DOM                     │
└─────────────┬──────────────────────────────────────────────────────────┘
              │ ipcRenderer.invoke() / ipcMain.handle()
              ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            MAIN PROCESS                                │
│               (Node.js Runtime & Native OpenSSL Layer)                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       CryptoVault Engine                         │  │
│  │                                                                  │  │
│  │  1. Key Derivation: PBKDF2-HMAC-SHA256 (100,000 Rounds + Salt)   │  │
│  │  2. Encryption:     AES-256-GCM (12-byte IV + 16-byte Auth Tag)  │  │
│  │  3. Memory Defense: RAM Key Zeroing on Lock/Suspend (Buffer.fill)│  │
│  │  4. TOTP 2FA:       RFC 6238 / RFC 4226 Base32 HMAC-SHA1 Engine  │  │
│  │  5. Storage Safety: Atomic Disk Persistence (.tmp -> renameSync) │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌───────────────────────────────┐  │  ┌────────────────────────────┐  │
│  │   Clipboard Security Manager  │  │  │    Power & Session Monitor │  │
│  │  (30s Auto-Clear Timer + Flush│  │  │   (Auto-Lock on Windows    │  │
│  │   on App Exit / Window Blur)  │  │  │    Lock Screen / Suspend)  │  │
│  └───────────────────────────────┘  │  └────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      ▼
                         ┌──────────────────────────┐
                         │   Encrypted Vault File   │
                         │      (`vault.enc`)       │
                         │   [Ciphertext Envelope]  │
                         └──────────────────────────┘
```

---

## 3. Cryptographic Deep-Dive (`crypto-vault.js`)

SecurePass implements the cryptographic security standards formulated by Bitwarden and NIST SP 800-132.

### 3.1 Key Derivation Function (KDF)
The user’s master password is never stored anywhere on disk or in the vault. To unlock the vault, the master key is derived dynamically using:
* **Algorithm:** `PBKDF2-HMAC-SHA256`
* **Iteration Count:** `100,000` rounds (mitigates GPU/ASIC dictionary cracking attacks)
* **Salt:** 16 cryptographically secure random bytes generated via `crypto.randomBytes(16)`
* **Derived Key Length:** 32 bytes (256 bits)

```javascript
_deriveKey(masterPassword, salt) {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    100000,
    32,
    'sha256'
  );
}
```

### 3.2 Authenticated Encryption (AES-256-GCM)
Unlike legacy CBC mode (which requires separate HMAC signing to prevent padding-oracle attacks), SecurePass uses **AES-256-GCM (Galois/Counter Mode)**, an Authenticated Encryption with Associated Data (AEAD) primitive:
* **Confidentiality:** 256-bit AES encryption ensures total privacy.
* **Integrity & Authenticity:** A 16-byte authentication tag (`authTag`) is computed over the ciphertext and header. If even a single bit of the encrypted file is modified, decryption immediately throws an authentication error without leaking plaintext.
* **Initialization Vector (IV):** A unique, non-repeating 12-byte IV (96 bits) is generated via `crypto.randomBytes(12)` on every single write operation.

### 3.3 The On-Disk Encrypted Envelope
When persisted to `vault.enc`, the file structure is stored as an authenticated JSON envelope:

```json
{
  "version": 1,
  "kdf": "PBKDF2-HMAC-SHA256",
  "iterations": 100000,
  "salt": "3f8b1c... (32 hex characters / 16 bytes)",
  "iv": "9a01f2... (24 hex characters / 12 bytes)",
  "tag": "e7c41b... (32 hex characters / 16 bytes auth tag)",
  "data": "5b7a9e... (hex encoded ciphertext)",
  "updatedAt": "2026-09-16T09:15:00.000Z"
}
```

### 3.4 Memory Zeroing & Defense Against Cold-Boot Attacks
In memory-resident password managers, lingering master keys in heap memory can be dumped by unauthorized local processes. SecurePass implements defensive memory wiping:
1. When the user clicks **Lock Vault**, locks their computer, or closes the app:
   ```javascript
   lock() {
     if (this.derivedKey) {
       this.derivedKey.fill(0); // Overwrites memory buffer with zeroes
       this.derivedKey = null;
     }
     if (this.salt && Buffer.isBuffer(this.salt)) {
       this.salt.fill(0);
       this.salt = null;
     }
     // In-place overwrite of plaintext strings in RAM
     if (this.unlockedData && Array.isArray(this.unlockedData.items)) {
       for (const item of this.unlockedData.items) {
         item.password = '';
         item.username = '';
         item.notes = '';
         item.totpSecret = '';
       }
       this.unlockedData.items.length = 0;
     }
     this.unlockedData = null;
     this.isUnlocked = false;
   }
   ```

### 3.5 Timing-Safe Master Password Rotation
SecurePass allows users to change their master password at any time. To prevent side-channel timing attacks when verifying the current password:
* It computes the derivation key of the candidate password.
* Compares it against the active session key using `crypto.timingSafeEqual()`.
* Generates a completely fresh 16-byte salt and derives a new 256-bit key.
* Re-encrypts the entire vault atomically.

### 3.6 Atomic File Writes
To protect user vaults against data corruption caused by power failure or sudden crashes during a write operation:
1. Data is written to a temporary sibling file: `vault.enc.tmp`.
2. `fs.renameSync()` is executed, which is an atomic filesystem operation on Windows and POSIX systems.

---

## 4. Built-in RFC 6238 TOTP Authenticator Engine

Instead of forcing users to use a separate authenticator app on their smartphone, SecurePass natively implements a standard Time-based One-Time Password (TOTP) generator:

### 4.1 RFC 4648 Base32 Decoding
* Accepts standard 2FA seed formats provided by Google Authenticator, GitHub, AWS, etc.
* Cleanses arbitrary user inputs (stripping hyphens, whitespaces, padding `=` and tolerating lowercase characters).
* Converts 5-bit Base32 symbols into raw binary byte buffers.

### 4.2 Dynamic HMAC-SHA1 Truncation (RFC 4226 / RFC 6238)
* Derives the time counter $T = \lfloor \frac{\text{epochSeconds}}{30} \rfloor$.
* Encodes $T$ into an 8-byte big-endian buffer.
* Computes `HMAC-SHA1(key, counter)`.
* Performs dynamic truncation: uses the low 4 bits of the last HMAC byte as an offset into the 20-byte digest, extracting a 31-bit unsigned integer.
* Calculates $\text{code} = \text{truncatedValue} \pmod{10^6}$ and formats it into a 6-digit zero-padded string.
* Calculates exact remaining seconds ($30 - (\text{epochSeconds} \pmod{30})$) for the live radial/linear UI progress ring.

---

## 5. Real-Time Password Analyzer & Generator (`analyzer-engine.js`)

### 5.1 Shannon Entropy Mathematical Calculation
Password complexity is measured using information theory:
$$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
Where:
* $n$ is the total length of the password string.
* $P(x_i)$ is the frequency probability of character $x_i$ appearing in the string.
This gives the true randomness and density of the password, flagging low-entropy repetition even in long passwords.

### 5.2 Realistic Brute-Force Crack Estimation
SecurePass models offline cracking cluster attacks:
* Calculates the character pool size $S$ (Lowercase: 26, Uppercase: 26, Digits: 10, Symbols: 33 $\rightarrow$ Total pool up to 95).
* Computes total combinations: $C = S^L$ where $L$ is length.
* Assumes modern high-end cracking hardware (Hashcat rig running at $10^{11}$ guesses/second = 100 billion guesses/sec).
* Evaluates average crack time:
  $$\text{Time} = \frac{S^L}{2 \times 10^{11}} \text{ seconds}$$
* Translates into human-readable bounds: *Instant (<1s)*, *Seconds*, *Hours*, *Days*, *Years*, or *Trillions of years*.

### 5.3 Privacy-Preserving k-Anonymity Breach Scanner
SecurePass lets users audit whether their credentials have been exposed in known public data breaches (via HaveIBeenPwned API):
* **k-Anonymity Principle:** The user's password is never transmitted across the network.
* SecurePass hashes the candidate password locally using SHA-1.
* Only the **first 5 characters** of the hex hash (the prefix) are sent to the HIBP API.
* The API returns a list of suffix hashes matching that 5-character prefix.
* SecurePass checks locally if the remaining 35 characters match any entry in the returned set.

---

## 6. Threat Model & Security Hardening

| Threat Vector | Mitigation in SecurePass |
| :--- | :--- |
| **Tampering / Disk Manipulation** | AES-256-GCM authentication tag verification. If any byte in `vault.enc` is tampered with, decryption fails cleanly. |
| **Memory Dump / Cold-Boot Attack** | Sensitive master key buffers and salt buffers are zeroed via `Buffer.fill(0)` when locking or quitting. Plaintext fields in JS objects are wiped. |
| **Clipboard Snooping** | When passwords are copied, an automatic 30-second timer is initiated. After 30 seconds, clipboard is wiped. On app exit or lock, the clipboard is immediately flushed. |
| **XSS / Malicious Code Injection** | Strict Content Security Policy (CSP) headers; `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` prevent renderer scripts from calling Node APIs. |
| **Malicious URL Hijacking** | Hyperlinks clicked in item details do not navigate inside Electron; `setWindowOpenHandler` denies new windows and safely invokes OS browser via `shell.openExternal`. |
| **Power Interruption Corruption** | Atomic disk persistence (`.tmp` file write + `fs.renameSync`) ensures the vault file is never half-written. |
| **Physical Snooping (Unattended PC)** | PowerMonitor hooks listen for Windows `lock-screen` and `suspend` events, auto-locking the vault immediately. Configurable 15-minute inactivity auto-lock. |

---

## 7. Automated Test Suite

SecurePass features a zero-dependency, self-contained test suite run with `npm test`:

```
> npm test
✓ All CryptoVault tests passed.
  - Vault initialization & disk existence
  - Item CRUD operations (add, get, update, delete)
  - Memory key zeroing on lock
  - Decryption failure on incorrect password
  - AES-256-GCM ciphertext tampering detection
  - Timing-safe master password rotation
  - Encrypted backup export and roundtrip import
  - Plaintext backup export and import
✓ All Password Analyzer unit tests passed.
  - Shannon entropy calculation accuracy
  - Multi-tier scoring logic
  - Crack time estimation bounds
✓ All TOTP and Base32 unit tests passed.
  - RFC 6238 official test vectors at standard epoch timestamps
  - Secret format resilience (spaces, hyphens, lowercase, padding '=')
  - Base32 decoder edge cases and error handling
```

---

## 8. Technology Stack Summary

* **Runtime:** Electron 34 (Chromium + Node.js)
* **Packaging & Installer:** `electron-builder` 25 (Windows NSIS Setup & Portable Exe)
* **Cryptographic Core:** Node.js native `crypto` (OpenSSL C-bindings)
* **Entropy & Randomness:** Web Crypto API (`crypto.getRandomValues`) & Information Theory
* **Frontend Architecture:** Pure Vanilla JavaScript (ES6+), HTML5, CSS3 Glassmorphism
* **External Runtime Dependencies:** **0** (Zero runtime npm dependencies; 100% native standard library implementation)

---

## 9. Interview Talking Points & Architecture Highlights

When discussing SecurePass in engineering interviews:

1. **Why Electron with zero runtime dependencies?**  
   *Using third-party npm packages for cryptography (like crypto-js or bcrypt) introduces supply chain risk and slower JavaScript execution. SecurePass relies solely on Node.js's native OpenSSL bindings, maximizing cryptographic speed and minimizing the dependency attack surface.*

2. **Why AES-256-GCM over AES-256-CBC?**  
   *CBC requires padding and a separate MAC (like HMAC-SHA256) under an Encrypt-then-MAC scheme to protect against padding oracle and bit-flipping attacks. AES-GCM provides built-in authenticated encryption (AEAD) in a single primitive with an authentication tag.*

3. **Why 100,000 PBKDF2 Rounds?**  
   *Following OWASP and NIST recommendations, 100,000 rounds of HMAC-SHA256 impose a significant computational cost on attackers attempting GPU-accelerated brute-force attacks while remaining imperceptible (<150ms) to the authorized user on unlock.*

4. **How does k-anonymity protect passwords during breach checks?**  
   *Neither the password nor the full SHA-1 hash is ever sent over the network. By only transmitting the 5-character prefix, the remote server cannot determine which of the thousands of matching candidate passwords belongs to the user.*
