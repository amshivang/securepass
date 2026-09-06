# 🛡️ SecurePass — Zero-Knowledge Windows Password Manager & Security Analyzer

[![Release](https://img.shields.io/badge/release-v1.0.0-blue.svg)](https://github.com/amshivang/securepass/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg?logo=windows)](https://github.com/amshivang/securepass/releases)
[![Security](https://img.shields.io/badge/encryption-AES--256--GCM-green.svg)](#-zero-knowledge-security-architecture)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**SecurePass** is a privacy-first, zero-knowledge desktop password manager and real-time security analyzer designed specifically for Windows. Built with an ultra-clean, minimalist pure-black aesthetic, SecurePass combines **Bitwarden-grade client-side encryption** with an advanced **entropy and pattern security analyzer**.

Your master password never leaves your device. All your logins, payment cards, and secret notes are encrypted and stored locally in system memory and locked behind authenticated AES-256-GCM encryption.

---

## 📥 Downloads (Release v1.0.0)

SecurePass is available in two distribution formats on our [**Releases Page**](https://github.com/amshivang/securepass/releases/tag/v1.0.0):

| Download Type | File Name | Description |
| :--- | :--- | :--- |
| **🚀 Windows Installer (Recommended)** | `SecurePass-Setup-1.0.0.exe` | Standard Windows setup wizard. Installs into your user Programs folder, creates desktop shortcut, and integrates into the Windows Start Menu & Search. |
| **💼 Portable Executable** | `SecurePass-1.0.0-Portable.exe` | Standalone executable. Runs instantly with zero installation, perfect for running off USB drives. |

---

## ✨ Key Features

### 🔐 1. Zero-Knowledge Cryptographic Vault
* **Authenticated AES-256-GCM Encryption:** Every credential (title, username, password, URL, notes) is encrypted into an authenticated ciphertext envelope before being saved to disk.
* **PBKDF2-HMAC-SHA256 Key Derivation:** Uses 100,000 iterations and a cryptographically secure 16-byte random salt to derive the vault encryption key from your Master Password.
* **Zero-Knowledge Architecture:** Your master password is never stored on disk or transmitted across any network. Only someone with your exact master password can decrypt the vault.
* **RAM Key Zeroing:** When the vault is locked or the application is closed, the derived encryption key buffer in memory is immediately cleared and zeroed out.
* **Atomic File Writes:** Prevents file corruption during unexpected power outages or app shutdowns by using atomic rename operations.

### 📋 2. Complete Password & Vault Management
* **Categorized Items:** Organize your digital credentials by **Logins**, **Credit / Debit Cards**, and **Secure Notes**.
* **Instant Fuzzy Search:** Filter through all your saved accounts and notes in real-time as you type.
* **One-Click Quick Copy:**
  * **Copy Username:** Instant copy with toast confirmation.
  * **Copy Password with Auto-Clear:** Copies the password and automatically triggers a 30-second countdown that wipes your Windows clipboard to protect sensitive credentials from background spyware.
* **CRUD Capabilities:** Easily add, edit, view, or permanently delete items.
* **In-Modal Generator:** Generate high-entropy passwords with real-time strength feedback without leaving the item creation form.

### 🧠 3. Real-Time Password Strength Analyzer & Generator
* **Real-time Entropy Scoring:** Evaluates character variety, length, uniqueness, and Shannon entropy to provide an accurate security score (out of 15).
* **Realistic Brute-Force Crack Estimation:** Calculates the realistic time an attacker would take using high-speed offline dictionary clusters (ranging from "Instant" to "Trillions of years").
* **Common Pattern & Dictionary Detection:** Catches keyboard walks, repetition patterns, and dictionary passwords.
* **Actionable Improvement Plans:** Delivers specific, actionable feedback on what characters or length to add.
* **Cryptographic Generator:** Generates 18–20 character cryptographically secure passwords client-side using `crypto.getRandomValues`.
* **k-Anonymity Breach Checker:** An opt-in breach scanner that queries HaveIBeenPwned's API using 5-character SHA-1 hash prefixes (k-anonymity) — your actual password never leaves your computer.

### ⚙️ 4. Security Controls & Data Portability
* **Inactivity Auto-Lock:** Automatically locks your vault after 15 minutes of inactivity to protect your credentials when stepping away from your PC.
* **Quick Lock Button:** Immediately lock your vault with a single click in the top header.
* **Encrypted Backups:** Export your entire vault as an encrypted JSON backup file for safe keeping on cold storage or migration to another PC.
* **Import Backup:** Restore your credentials from an encrypted backup at any time.

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
| **Packaging** | `electron-builder` | Windows NSIS installer and Portable executable builds |

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
