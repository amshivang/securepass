# SecurePass

SecurePass is a local-first Windows password manager, authenticator, and password security analyzer built with Electron. Vault data is encrypted on the device with AES-256-GCM. The master password is never stored or sent to a server.

> SecurePass is a personal desktop project. Review the source and make backups before relying on it for irreplaceable credentials.

## Features

### Encrypted vault

- AES-256-GCM authenticated encryption with a fresh IV for every save.
- PBKDF2-HMAC-SHA256 key derivation with 600,000 iterations for new vaults.
- Compatible with legacy 100,000-iteration vaults; password rotation upgrades them.
- Cryptographically random salt and encryption key.
- Atomic, flushed writes with restrictive file permissions.
- Memory cleanup when locking the vault or closing the application.
- Master password rotation with a fresh salt and key.
- Encrypted and optional plaintext backup export.
- Encrypted backup import with merge and replace modes.

### Credential management

- Logins, payment cards, and secure notes.
- Search and category filtering.
- Favorites and a Favorites filter.
- Custom fields for PINs, employee IDs, organization names, and account identifiers.
- TOTP authenticator support using RFC 6238.
- Password generator with configurable length and character groups.
- Password strength, entropy, common-pattern, and breach analysis.
- Local dashboard for weak and reused passwords.
- Sensitive clipboard auto-clear after 30 seconds, with manual clearing.

### Open & Fill

The credential details view includes **Open & Fill** for Login items with an HTTPS URL.

1. Open a Login item.
2. Select **Open & Fill**.
3. SecurePass opens the saved site in a separate protected login window.
4. Matching username, password, and custom fields are filled when the form is detected.
5. Review the form and submit it yourself.

Open & Fill:

- Requires HTTPS.
- Is restricted to the saved website origin.
- Never submits a form automatically.
- Never overwrites a field that already contains a value.
- Retries for client-rendered login forms.
- Closes when the vault locks, the system suspends, or SecurePass exits.
- Uses a temporary browser session with permissions, popups, and embedded webviews disabled.

## Security model

```text
Master password + random 16-byte salt
                │
                ▼
PBKDF2-HMAC-SHA256, 600,000 iterations
                │
                ▼
256-bit encryption key
                │
                ▼
AES-256-GCM + fresh 12-byte IV + 16-byte authentication tag
                │
                ▼
Encrypted vault file on disk
```

The vault file contains encrypted data and cryptographic metadata only. The master password is not recoverable. Losing it means losing access unless an accessible backup uses a known password.

The optional Have I Been Pwned check uses k-anonymity: only the first five characters of a SHA-1 hash are sent. The password itself is never sent.

## Project structure

```text
securepass/
├── crypto-vault.js       Vault encryption, backups, CRUD, and TOTP
├── main.js               Electron main process and trusted IPC
├── preload.js            Main renderer API bridge
├── autofill.js           URL validation and isolated form-filling logic
├── login-browser.js      Protected Open & Fill browser window
├── login-preload.js      Login-window IPC bridge
├── renderer/
│   ├── index.html        Main application UI
│   ├── renderer.js       Main UI controller
│   ├── analyzer-engine.js Password analysis logic
│   ├── login.html        Open & Fill toolbar
│   ├── login.js          Login toolbar controller
│   ├── style.css         Main application styles
│   └── login.css         Login toolbar styles
└── tests/                Unit and desktop integration tests
```

Generated folders such as `node_modules/` and `dist/` are intentionally ignored and are not part of the source repository.

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- Windows for the packaged installer
- Linux desktop integration tests additionally require `xvfb-run`

## Install and run

```bash
git clone https://github.com/amshivang/securepass.git
cd securepass
npm install
npm start
```

## Test

Run syntax checks and the vault, analyzer, hardening, and TOTP tests:

```bash
npm test
```

Run the Electron form-filling integration test on Linux:

```bash
npm run test:autofill
```

## Build Windows packages

Create an unpacked Windows build:

```bash
npm run pack:win
```

Create the NSIS installer:

```bash
npm run dist:win
```

Build output is written to `dist/`, which is ignored by git.

## Local data locations

For an installed application, SecurePass stores the encrypted vault under Electron's user-data directory. Portable builds use a `securepass-data/` directory beside the executable. These runtime locations are excluded from the repository by `.gitignore`.

## License

SecurePass is licensed under the MIT License. See [LICENSE](LICENSE).

## Credits

- [Bitwarden](https://github.com/bitwarden/clients) for client-side vault architecture inspiration.
- [Have I Been Pwned](https://haveibeenpwned.com/) for the k-anonymity breach lookup API.


---
<div align="center">
  <a href="https://www.buymeacoffee.com/amshivang">
    <img src="https://raw.githubusercontent.com/amshivang/amshivang/main/qr-code.png" alt="Buy Me A Coffee" width="250">
  </a>
  <br>
  <strong><a href="https://www.buymeacoffee.com/amshivang">Support my work on Buy Me A Coffee! ☕</a></strong>
</div>
