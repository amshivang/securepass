# 🛡️ SecurePass

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078D6?style=flat&logo=windows&logoColor=white)](https://github.com/amshivang/securepass/releases)
[![Electron](https://img.shields.io/badge/Electron-34%2B-47848F?style=flat&logo=electron&logoColor=white)](https://electronjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Cryptography](https://img.shields.io/badge/Cryptography-AES--256--GCM-7c3aed?style=flat)](https://github.com/amshivang/securepass)
[![Security](https://img.shields.io/badge/Security-100%25%20Zero--Knowledge%20Offline-10b981?style=flat)](https://github.com/amshivang/securepass)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=flat)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v1.2.1-blue?style=flat&logo=github)](https://github.com/amshivang/securepass/releases/latest)

**SecurePass** is a privacy-first, zero-knowledge desktop credential manager, RFC 6238 two-factor authenticator (2FA), and real-time cryptographic security analyzer engineered for Windows. Designed with an ultra-clean, minimalist pure-black aesthetic (`#0a0a0a`), SecurePass combines **Bitwarden-grade client-side authenticated encryption**, a **native RFC 6238 TOTP engine**, an **isolated Open & Fill login browser**, and **Shannon entropy mathematical analysis**—all with **zero external runtime dependencies**.

> **Note:** SecurePass is a local-first desktop application. Vault data is strictly encrypted on your device and never transmitted to any remote server or cloud infrastructure. Always keep encrypted backups of your credentials.

---

## 📑 Table of Contents

- [Executive Summary & Evolution](#-executive-summary--evolution)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
  - [Encrypted Zero-Knowledge Vault](#1-encrypted-zero-knowledge-vault)
  - [Credential Management & Custom Fields](#2-credential-management--custom-fields)
  - [Open & Fill Protected Login Browser](#3-open--fill-protected-login-browser)
  - [Native RFC 6238 TOTP 2FA Authenticator](#4-native-rfc-6238-totp-2fa-authenticator)
  - [Real-Time Password Analyzer & Generator](#5-real-time-password-analyzer--generator)
  - [Session & Clipboard Security](#6-session--clipboard-security)
  - [Responsive Desktop UX & Modal Controls](#7-responsive-desktop-ux--modal-controls)
- [Cryptographic Deep-Dive](#-cryptographic-deep-dive)
  - [Key Derivation Function (PBKDF2)](#key-derivation-function-pbkdf2)
  - [Authenticated Encryption (AES-256-GCM)](#authenticated-encryption-aes-256-gcm)
  - [On-Disk Encrypted Envelope Schema](#on-disk-encrypted-envelope-schema)
  - [Memory Scrubbing & Anti-Cold-Boot Defense](#memory-scrubbing--anti-cold-boot-defense)
  - [Timing-Safe Master Password Rotation](#timing-safe-master-password-rotation)
  - [Atomic Filesystem Persistence](#atomic-filesystem-persistence)
- [Threat Model & Security Hardening](#-threat-model--security-hardening)
- [Project Structure](#-project-structure)
- [Prerequisites & Getting Started](#-prerequisites--getting-started)
- [Automated Testing Suite](#-automated-testing-suite)
- [Building Windows Packages](#-building-windows-packages)
- [Local Data Locations](#-local-data-locations)
- [Interview & Architectural Talking Points](#-interview--architectural-talking-points)
- [License & Credits](#-license--credits)
- [Support My Work](#-support-my-work)

---

## 🚀 Executive Summary & Evolution

### The Evolution: From Toy ML Prototype to Production Zero-Knowledge Vault
* **The Legacy Prototype:** Originally, SecurePass was a web-based proof-of-concept built in Python/Flask that utilized a Random Forest classifier to predict password strength based on synthetic datasets. While conceptually novel, it was unsuitable as a practical security tool: passwords had to be sent over network sockets to a backend server, violating fundamental zero-trust principles.
* **The Modern Architecture:** SecurePass was completely rebuilt from the ground up into a hardened desktop application using **Electron, Node.js (`crypto`), and vanilla JavaScript**. It replaced synthetic ML heuristics with rigorous mathematical entropy formulas ($H(X)$), offline GPU brute-force time estimations, and an end-to-end Zero-Knowledge Cryptographic Vault where master passwords and credentials never touch disk or network in unencrypted form.

---

## 🏛️ System Architecture

SecurePass adopts a decoupled **Two-Tier Desktop Architecture** utilizing Electron's secure process model:

```text
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
│  │  1. Key Derivation: PBKDF2-HMAC-SHA256 (600,000 Rounds + Salt)   │  │
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
│                                     │                                  │
│  ┌──────────────────────────────────┴───────────────────────────────┐  │
│  │                 LoginBrowser (Protected Window)                  │  │
│  │  - Ephemeral session, popups & webviews blocked, origin-bound    │  │
│  │  - Isolated DOM autofill script (credentials never stored)       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      ▼
                         ┌──────────────────────────┐
                         │   Encrypted Vault File   │
                         │      (`vault.enc`)       │
                         │   [Ciphertext Envelope]  │
                         └──────────────────────────┘
```

---

## ✨ Key Features

### 1. Encrypted Zero-Knowledge Vault
- **AES-256-GCM Authenticated Encryption:** Every write generates a cryptographically random 12-byte initialization vector (IV) and a 16-byte GCM authentication tag.
- **600,000 PBKDF2 Rounds:** New vaults use 600,000 rounds of PBKDF2-HMAC-SHA256 (aligned with current OWASP recommendations). Legacy 100,000-iteration vaults are supported and automatically upgraded upon master password rotation.
- **Master Password Zero-Knowledge:** The master password is never stored on disk, sent over a network, or cached in plaintext.
- **Atomic Disk Writes:** Writes occur to a temporary sibling file (`vault.enc.tmp`) before atomic renaming (`fs.renameSync`), preventing corrupted vaults in the event of power cuts or system halts.
- **Encrypted & Plaintext Backups:** Export full encrypted JSON backups for external drive storage, or export plaintext backups with security warnings. Import supports both **Merge** (preserving existing IDs) and **Replace** modes.

### 2. Credential Management & Custom Fields
- **Categorized Storage:** Built-in categories for **Logins**, **Credit / Debit Cards**, and **Secure Notes**.
- **Favorites & Search:** Real-time search by title, username, category, or URL, plus quick-filter for Favorites.
- **Custom Fields:** Attach arbitrary key-value pairs (e.g., PIN, Account Number, Employee ID, Security Questions) to any credential.
- **Card Expiry & CVV:** Specialized input masking for card details with quick-copy controls.

### 3. Open & Fill Protected Login Browser
- **Single-Click Autofill:** Launch saved login sites directly in a separate, isolated browser window (`LoginBrowser`).
- **Origin-Bound Injection:** Only injects credentials into pages that match the credential's exact HTTPS origin.
- **User-Controlled Submission:** Fills username, password, and custom fields automatically, but **never automatically submits forms**. The user always reviews and submits.
- **Non-Destructive:** Never overwrites fields that already contain user input.
- **Ephemeral Sandbox:** Disables popups, webviews, and persistent cookies. The window automatically terminates when the main vault locks, the system suspends, or SecurePass exits.

### 4. Native RFC 6238 TOTP 2FA Authenticator
- **Built-in Authenticator:** Store 2FA secrets directly within credentials without relying on an external phone app.
- **RFC 4648 Base32 Decoding:** Tolerates spaces, hyphens, padding `=`, and lowercase characters from QR seed URLs.
- **Dynamic HMAC-SHA1 Truncation:** Computes exact 6-digit rolling codes with live 30-second circular countdown indicators.
- **One-Click Quick Copy:** Copy rolling 2FA codes directly to clipboard with visual feedback.

### 5. Real-Time Password Analyzer & Generator
- **Shannon Entropy Calculation ($H(X)$):** Evaluates character frequency probabilities to measure true mathematical randomness and information density.
- **GPU Cluster Crack-Time Estimation:** Models offline brute-force attacks at $10^{11}$ guesses/second (modern Hashcat GPU cluster) across character pools up to 95 symbols.
- **k-Anonymity Breach Scanner:** Checks passwords against known breach databases (HaveIBeenPwned API) using k-anonymity SHA-1 prefix matching (only 5 hex characters leave your device; the password itself is never exposed).
- **Configurable Generator:** Generates high-entropy passwords with adjustable length (8–64 characters) and toggleable character sets (uppercase, lowercase, numbers, symbols).

### 6. Session & Clipboard Security
- **PowerMonitor Integration:** Automatically locks the vault when Windows enters the lock screen (`Win+L`) or the machine suspends/sleeps.
- **Inactivity Auto-Lock:** Configurable timer (1 min, 5 min, 15 min default, 30 min, 1 hr, or Never).
- **Sensitive Clipboard Auto-Clear:** Clears passwords from the Windows clipboard after 30 seconds.
- **Exit & Lock Flush:** Automatically wipes the clipboard if it contains sensitive copied credentials upon app exit or vault lock.

### 7. Responsive Desktop UX & Modal Controls
- **Adaptive Viewport Scaling:** Modals automatically adapt to resized and unmaximized windows down to 500px height.
- **Sticky Modal Headers:** Headers with title and `×` close button stay pinned at the top while scrolling long forms.
- **Zero Coordinate Clipping:** Uses `margin: auto` and `overflow-y: auto` to prevent negative coordinate overflow, ensuring all fields and Save/Cancel buttons are accessible.
- **Sleek Custom Scrollbars:** Dark, low-profile custom scrollbars matching the pure-black desktop aesthetic.

---

## 🔒 Cryptographic Deep-Dive

SecurePass follows the zero-knowledge client-side encryption standards formulated by Bitwarden and NIST SP 800-132.

### Key Derivation Function (PBKDF2)
The user's master password is never stored. Unlocking the vault derives a 256-bit encryption key on the fly:
* **Algorithm:** `PBKDF2-HMAC-SHA256`
* **Iteration Count:** `600,000` rounds (new vaults) / `100,000` rounds (legacy vaults)
* **Salt:** 16 cryptographically random bytes via `crypto.randomBytes(16)`
* **Key Length:** 32 bytes (256 bits)

```javascript
_deriveKey(masterPassword, salt, iterations = PBKDF2_ITERATIONS) {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    iterations,
    KEY_LENGTH,
    'sha256'
  );
}
```

### Authenticated Encryption (AES-256-GCM)
Unlike legacy CBC mode (which requires a separate HMAC and is vulnerable to padding-oracle attacks if improperly implemented), SecurePass uses **AES-256-GCM (Galois/Counter Mode)**:
* **Confidentiality:** 256-bit AES encryption ensures total confidentiality.
* **Integrity & Authenticity:** A 16-byte authentication tag (`tag`) is verified upon decryption. If even a single bit of the file is altered, decryption immediately throws an authentication error without leaking plaintext.
* **Initialization Vector (IV):** A fresh 12-byte IV (96 bits) is generated on every save.

### On-Disk Encrypted Envelope Schema
Persisted inside `vault.enc` as an authenticated JSON envelope:

```json
{
  "version": 1,
  "kdf": "PBKDF2-HMAC-SHA256",
  "iterations": 600000,
  "salt": "3f8b1c4e9d02a7b8e5c1d4f7a2b9e6c3",
  "iv": "9a01f2e8b4c7d5a3f1e9b2c4",
  "tag": "e7c41b8a9f2d5e6a3c1b8f4d7e2a9b5c",
  "data": "5b7a9e1f... (ciphertext hex stream)",
  "updatedAt": "2026-10-05T18:50:00.000Z"
}
```

### Memory Scrubbing & Anti-Cold-Boot Defense
To mitigate RAM dumping and cold-boot attacks against memory-resident credentials:

```javascript
lock() {
  if (this.derivedKey) {
    this.derivedKey.fill(0); // Zeroes memory buffer in RAM
    this.derivedKey = null;
  }
  if (this.salt && Buffer.isBuffer(this.salt)) {
    this.salt.fill(0);
    this.salt = null;
  }
  // In-place overwrite of plaintext strings in RAM
  if (this.unlockedData && Array.isArray(this.unlockedData.items)) {
    for (const item of this.unlockedData.items) {
      if (typeof item.password === 'string') item.password = '';
      if (typeof item.username === 'string') item.username = '';
      if (typeof item.notes === 'string') item.notes = '';
      if (typeof item.totpSecret === 'string') item.totpSecret = '';
    }
    this.unlockedData.items.length = 0;
  }
  this.unlockedData = null;
  this.isUnlocked = false;
}
```

### Timing-Safe Master Password Rotation
When changing the master password:
1. Derives the verification key for the current password and uses `crypto.timingSafeEqual()` to prevent timing side-channel attacks.
2. Generates a fresh 16-byte random salt.
3. Derives a new key under 600,000 PBKDF2 iterations.
4. Overwrites the session key in memory and re-encrypts the vault atomically.

### Atomic Filesystem Persistence
1. Writes the encrypted JSON envelope to `vault.enc.tmp`.
2. Calls `fs.renameSync('vault.enc.tmp', 'vault.enc')`, ensuring the active vault file is never left partially written if power is interrupted.

---

## 🛡️ Threat Model & Security Hardening

| Threat Vector | Mitigation in SecurePass |
| :--- | :--- |
| **Ciphertext Tampering / Bit-Flipping** | AES-256-GCM 128-bit authentication tag verification. Any modification throws an authentication error. |
| **Memory Dumping / Cold-Boot Attack** | Sensitive master key buffers and salt buffers are zeroed via `Buffer.fill(0)` on lock/quit. Plaintext JS strings are overwritten and unreferenced. |
| **Clipboard Snooping** | Sensitive copies trigger a 30-second timer to wipe the clipboard. Quitting or locking the app flushes clipboard immediately. |
| **XSS / Malicious Code Injection** | Strict Content Security Policy (CSP); `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` prevent renderer scripts from invoking Node APIs. |
| **Malicious URL Hijacking** | External web links clicked in details are intercepted by `setWindowOpenHandler` and safely delegated to the OS browser via `shell.openExternal`. |
| **Power Failure Vault Corruption** | Atomic filesystem writes via temporary file write followed by `fs.renameSync()`. |
| **Physical Snooping (Unattended PC)** | Electron `powerMonitor` auto-locks the vault when Windows locks (`Win+L`) or sleeps. Inactivity timer auto-locks when idle. |
| **Credential Phishing in Browser** | `LoginBrowser` verifies exact HTTPS origin match before injecting credentials and never auto-submits forms. |

---

## 📁 Project Structure

```text
securepass/
├── crypto-vault.js         # Core zero-knowledge cryptographic vault, TOTP engine & backups
├── main.js                 # Electron main process, lifecycle, IPC handlers, PowerMonitor
├── preload.js              # Sandboxed ContextBridge API (window.securePassAPI)
├── autofill.js             # HTTPS URL validation & isolated form-filling automation
├── login-browser.js        # Protected Open & Fill login browser controller
├── login-preload.js        # Dedicated IPC bridge for the login window
├── renderer/
│   ├── index.html          # Main application user interface
│   ├── renderer.js         # UI controller, state management, search, and interactions
│   ├── style.css           # Pure-black UI stylesheet, responsive modal layouts, scrollbars
│   ├── analyzer-engine.js  # Shannon entropy, crack time, scoring mathematical engine
│   ├── login.html          # Open & Fill floating toolbar UI
│   ├── login.js            # Open & Fill toolbar controller
│   └── login.css           # Open & Fill toolbar styles
├── tests/
│   ├── crypto-vault.test.js # Core vault cryptography, CRUD, and backup unit tests
│   ├── hardening.test.js    # Vault hardening, iteration migration, and memory tests
│   ├── analyzer.test.js     # Shannon entropy and brute-force crack time tests
│   ├── totp.test.js         # RFC 6238 standard test vectors and Base32 decoding tests
│   └── autofill.test.js     # Electron headless form-filling integration tests
├── package.json            # Scripts, build configurations, and metadata
└── LICENSE                 # MIT License
```

> **Zero External Runtime Dependencies:** SecurePass utilizes Node.js standard libraries (`crypto`, `fs`, `path`, `url`) exclusively for all cryptographic and backend operations.

---

## 💻 Prerequisites & Getting Started

### Requirements
- **Operating System:** Windows 10 or 11 (for desktop installer)
- **Node.js:** Node.js 18.0 or newer
- **Package Manager:** npm 9.0 or newer

### Installation & Launch

```bash
# 1. Clone the repository
git clone https://github.com/amshivang/securepass.git
cd securepass

# 2. Install development dependencies
npm install

# 3. Launch SecurePass in development mode
npm start
```

---

## 🧪 Automated Testing Suite

SecurePass features a zero-dependency, comprehensive test suite executing across all layers:

```bash
npm test
```

Expected test execution output:

```text
> securepass-desktop@1.2.1 test
> npm run check && node tests/crypto-vault.test.js && node tests/hardening.test.js && node tests/analyzer.test.js && node tests/totp.test.js

> securepass-desktop@1.2.1 check
> node -c crypto-vault.js && node -c main.js && node -c preload.js && node -c autofill.js && node -c login-browser.js && node -c login-preload.js && node -c renderer/analyzer-engine.js && node -c renderer/renderer.js && node -c renderer/login.js

✓ All CryptoVault tests passed.
✓ All vault hardening tests passed.
Testing calculateShannonEntropy...
Testing evaluatePasswordScore...
Testing estimateCrackTime...
✓ All Password Analyzer unit tests passed.
Testing RFC 6238 TOTP Engine & Base32 Decoder...
  1. Testing RFC 6238 reference vectors...
  2. Testing secret formatting resilience (spaces, hyphens, lowercase, padding)...
  3. Testing Base32 decoding and error handling...
  4. Testing CryptoVault TOTP methods and vault item storage...
✓ All TOTP and Base32 unit tests passed successfully.
```

To run the headless browser autofill integration tests on Linux:

```bash
npm run test:autofill
```

---

## 📦 Building Windows Packages

To build production Windows binaries using `electron-builder`:

### Unpacked Executable Folder
```bash
npm run pack:win
```
Outputs unpacked binaries to `dist/win-unpacked/SecurePass.exe`.

### Complete Windows NSIS Installer (.exe)
```bash
npm run dist:win
```
Generates `dist/SecurePass-Setup-1.2.1.exe`.

---

## 📂 Local Data Locations

SecurePass stores the encrypted vault file strictly on your local machine:

- **Installed Application:**
  ```text
  %APPDATA%\securepass-desktop\vault.enc
  (C:\Users\<User>\AppData\Roaming\securepass-desktop\vault.enc)
  ```
- **Preferences:**
  ```text
  %APPDATA%\securepass-desktop\preferences.json
  ```
- **Portable Executables:**
  ```text
  <ExecutableDir>\securepass-data\vault.enc
  ```

---

## 🎯 Interview & Architectural Talking Points

When discussing SecurePass in systems engineering and software architecture reviews:

1. **Why Electron with zero runtime dependencies?**  
   *Using third-party npm packages for cryptography (like crypto-js or bcrypt) introduces supply-chain risks and performance overhead. SecurePass relies solely on Node.js's native OpenSSL bindings, maximizing cryptographic speed and minimizing the attack surface.*

2. **Why AES-256-GCM over AES-256-CBC?**  
   *CBC requires padding and a separate MAC (like HMAC-SHA256) under an Encrypt-then-MAC scheme to protect against padding-oracle and bit-flipping attacks. AES-GCM provides built-in authenticated encryption (AEAD) in a single primitive with an authentication tag.*

3. **Why 600,000 PBKDF2 Rounds?**  
   *Following updated OWASP and NIST recommendations, 600,000 rounds of HMAC-SHA256 impose a heavy computational barrier on attackers attempting GPU/ASIC-accelerated offline brute-force attacks, while remaining seamless (<200ms) on modern desktop CPUs during legitimate unlocks.*

4. **How does k-anonymity protect passwords during breach checks?**  
   *Neither the password nor its complete hash is ever transmitted. By sending only the first 5 hexadecimal characters of the SHA-1 hash to the HaveIBeenPwned API, the remote service only knows a broad prefix shared by thousands of unrelated hashes. Exact matching occurs locally inside the client.*

---

## 📜 License & Credits

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

### Acknowledgments
- [Bitwarden](https://github.com/bitwarden/clients) for client-side zero-knowledge vault architecture inspiration.
- [Have I Been Pwned](https://haveibeenpwned.com/) for the k-anonymity breach verification model.
- [RFC 6238](https://datatracker.ietf.org/doc/html/rfc6238) & [RFC 4226](https://datatracker.ietf.org/doc/html/rfc4226) for standardized TOTP authenticator specifications.

---
<div align="center">
  <a href="https://www.buymeacoffee.com/amshivang">
    <img src="https://raw.githubusercontent.com/amshivang/amshivang/main/qr-code.png" alt="Buy Me A Coffee" width="250">
  </a>
  <br>
  <strong><a href="https://www.buymeacoffee.com/amshivang">Support my work on Buy Me A Coffee! ☕</a></strong>
</div>
