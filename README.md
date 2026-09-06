# 🛡️ SecurePass — Zero-Knowledge Windows Password Manager & Security Analyzer

[![Release](https://img.shields.io/badge/release-v1.2.0-blue.svg)](https://github.com/amshivang/securepass/releases/tag/v1.2.0)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg?logo=windows)](https://github.com/amshivang/securepass/releases)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#-testing)
[![Security](https://img.shields.io/badge/encryption-AES--256--GCM-green.svg)](#-zero-knowledge-security-architecture)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**SecurePass** is a privacy-first, zero-knowledge desktop password manager, authenticator, and real-time security analyzer designed specifically for Windows. Built with an ultra-clean, minimalist pure-black aesthetic, SecurePass combines **Bitwarden-grade client-side encryption**, an integrated **RFC 6238 TOTP 2FA engine**, and an advanced **Shannon entropy and pattern security analyzer**.

Your master password never leaves your device. All your logins, 2FA authenticator seeds, payment cards, and secret notes are encrypted and stored locally in system memory and locked behind authenticated AES-256-GCM encryption.

---

## 📥 Downloads (Release v1.2.0)

SecurePass is available in two distribution formats on our [**Releases Page**](https://github.com/amshivang/securepass/releases/tag/v1.2.0):

| Download Type | File Name | Description |
| :--- | :--- | :--- |
| **🚀 Windows Installer (Recommended)** | `SecurePass-Setup-v1.2.0.exe` | Standard Windows setup wizard. Installs into your user Programs folder, creates desktop shortcut, and integrates into the Windows Start Menu & Search. |
| **💼 Portable Executable** | `SecurePass-v1.2.0-Portable.exe` | Standalone executable. Runs instantly with zero installation, perfect for running off USB drives. |

---

## ✨ Key Features

### 🔐 1. Zero-Knowledge Cryptographic Vault
* **Authenticated AES-256-GCM Encryption:** Every credential (title, username, password, URL, notes) is encrypted into an authenticated ciphertext envelope before being saved to disk.
* **PBKDF2-HMAC-SHA256 Key Derivation:** Uses 100,000 iterations and a cryptographically secure 16-byte random salt to derive the vault encryption key from your Master Password.
* **Master Password Rotation:** Rotate your master password at any time. SecurePass re-derives the key, generates a fresh random salt, and re-encrypts the entire vault using `crypto.timingSafeEqual` authentication.
* **Zero-Knowledge Architecture:** Your master password is never stored on disk or transmitted across any network. Only someone with your exact master password can decrypt the vault.
* **RAM Key Zeroing:** When the vault is locked or the application is closed, the derived encryption key buffer in memory is immediately cleared and zeroed out.
* **Atomic File Writes:** Prevents file corruption during unexpected power outages or app shutdowns by using atomic rename operations.

### 📋 2. Complete Password & Vault Management
* **Categorized Items:** Organize your digital credentials by **Logins**, **Credit / Debit Cards**, and **Secure Notes**.
* **Instant Fuzzy Search:** Filter through all your saved accounts and notes in real-time as you type.
* **One-Click Quick Copy:**
  * **Copy Username:** Instant copy with toast confirmation.
  * **Copy Password with Auto-Clear:** Copies the password and automatically triggers a 30-second countdown that wipes your Windows clipboard.
  * **Immediate Exit Flush:** If you close or exit the app while a sensitive password is still in the clipboard, it is flushed immediately.
* **CRUD Capabilities:** Easily add, edit, view, or permanently delete items.
* **In-Modal Generator:** Generate high-entropy passwords with real-time strength feedback without leaving the item creation form.

### 🧠 3. Real-Time Password Strength Analyzer & Generator
* **Real-time Entropy Scoring:** Evaluates character variety, length, uniqueness, and Shannon entropy to provide an accurate security score (out of 15).
* **Realistic Brute-Force Crack Estimation:** Calculates the realistic time an attacker would take using high-speed offline dictionary clusters (ranging from "Instant" to "Trillions of years").
* **Common Pattern & Dictionary Detection:** Catches keyboard walks, repetition patterns, and dictionary passwords.
* **Actionable Improvement Plans:** Delivers specific, actionable feedback on what characters or length to add.
* **Cryptographic Generator:** Generates 18–20 character cryptographically secure passwords client-side using `crypto.getRandomValues`.
* **k-Anonymity Breach Checker:** An opt-in breach scanner that queries HaveIBeenPwned's API using 5-character SHA-1 hash prefixes (k-anonymity) — your actual password never leaves your computer.

### ⚙️ 4. Security Hardening, Controls & Portability
* **Master Password Rotation:** Update your master password safely inside Settings; all vault data is automatically re-encrypted with a brand new salt.
* **True Encrypted Backups:** Export your entire vault as an encrypted AES-256-GCM ciphertext JSON envelope for cold storage or device migration.
* **Plaintext Backup with Safeguards:** Explicit plaintext export option guarded by a clear security confirmation prompt.
* **Import Backup:** Restore your credentials from an encrypted backup envelope at any time.
* **Inactivity Auto-Lock:** Automatically locks your vault after 15 minutes of inactivity to protect your credentials when stepping away from your PC.
* **Quick Lock Button:** Immediately lock your vault with a single click in the top header.
* **Content Security Policy (CSP):** Strict CSP meta headers blocking unauthorized remote scripts and origins.
* **Safe External Navigation:** External hyperlinks are intercepted and safely opened in the user's default system browser using `shell.openExternal`.

---

## 🎨 Minimalist Pure-Black User Interface

SecurePass is crafted with a distraction-free, modern dark aesthetic:
* `#0a0a0a` deep black background with glassmorphic `#121212` surface cards.
* High-contrast text typography (`Inter` & `JetBrains Mono`).
* Glowing status accents (Emerald for secure/strong, Amber for medium, Crimson for weak/alerts).
* Smooth, native micro-interactions and transitions.

---

## 🛡️ Zero-Knowledge Security Architecture

SecurePass follows the same zero-knowledge client encryption principles used by industry-leading password managers:

```
[ Master Password ] + [ 16-byte Cryptographic Salt ]
                       │
                       ▼
         PBKDF2-HMAC-SHA256 (100,000 Rounds)
                       │
                       ▼
              [ 256-Bit Master Key ]
                       │
                       ▼
         AES-256-GCM Authenticated Encryption
          (Fresh 12-byte IV + 16-byte Auth Tag)
                       │
                       ▼
        [ Encrypted Vault File on Disk ]
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Runtime** | Electron | Cross-platform desktop window and lifecycle management |
| **Cryptography** | Node.js Native `crypto` (OpenSSL) | PBKDF2 key derivation and AES-256-GCM encryption |
| **Frontend UI** | Vanilla HTML5, CSS3, JavaScript | Lightweight, zero-bloat, high-performance UI |
| **Entropy Math** | Web Crypto API | Cryptographically secure random generation & hashing |
| **Testing** | Node.js native `assert` & `crypto` | Zero-dependency cryptographic test suite |
| **Packaging** | `electron-builder` | Windows NSIS installer and Portable executable builds |

---

## 🧪 Testing

SecurePass includes a comprehensive, zero-dependency automated test suite covering all cryptographic vault operations:

```bash
npm test
```

The test suite validates:
* Vault initialization, credential CRUD, and atomic disk persistence.
* Memory key zeroing and lock integrity.
* Decryption failure and clean rejection on invalid master passwords.
* Ciphertext tampering detection using AES-256-GCM authentication tags.
* Encrypted backup export and roundtrip import.
* Master password rotation, timing-safe validation, and re-encryption under fresh salts.

---

## 📐 Implementation & Improvement Plans

All major features and security audits follow structured, self-contained implementation plans located in the [`plans/`](plans/README.md) directory:
* [`001`: Establish Automated CryptoVault Test Suite Baseline](plans/001-crypto-vault-automated-test-suite.md)
* [`002`: Fix Backup Encryption and Salt Regeneration Bug](plans/002-fix-backup-encryption-and-salt-bug.md)
* [`003`: Security Hardening: Clipboard Flush on Exit and CSP Protection](plans/003-security-hardening-clipboard-and-csp.md)
* [`004`: Implement "Change Master Password" Workflow](plans/004-change-master-password.md)

---

## 💻 Building from Source (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* `npm` (v9 or higher)

### Setup & Run
```bash
# 1. Clone the repository
git clone https://github.com/amshivang/securepass.git
cd securepass

# 2. Install dependencies
npm install

# 3. Launch application in development mode
npm start
```

### Packaging Windows Binaries
```bash
# Build standalone Windows NSIS Installer (.exe)
npm run dist:win
```
The compiled installer will be output to the `dist/` directory.

---

## 🙏 Credits & Acknowledgments

* **[Bitwarden](https://github.com/bitwarden/clients)**: Special credit and gratitude to the Bitwarden open-source project. The cryptographic architecture, zero-knowledge vault model, and PBKDF2 + AES-GCM security concepts implemented in SecurePass are directly inspired by and adapted from Bitwarden's proven open-source client codebase.
* **[Have I Been Pwned](https://haveibeenpwned.com/)**: For the free, privacy-preserving k-anonymity breach lookup API.

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
