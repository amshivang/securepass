# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Cryptographic & Zero-Knowledge Architecture

**SecurePass** is engineered with a strict Zero-Knowledge cryptographic foundation:
- **Key Derivation**: PBKDF2 with HMAC-SHA256 and **600,000 iterations** following OWASP and NIST recommendations.
- **Authenticated Encryption**: AES-256-GCM with unique 12-byte IVs per vault write and 128-bit authentication tags to prevent bit-flipping and ciphertext tampering.
- **In-Memory Scrubbing**: Sensitive key material is zeroed out in memory upon vault lock (`crypto.randomFillSync`) to defend against cold-boot and memory-dump attacks.
- **Local Data Residency**: All credentials reside solely on the local filesystem (`vault.enc`). No credentials, master passwords, or encryption keys ever touch remote networks.

## Reporting a Vulnerability

If you discover any vulnerability in the cryptographic implementation, IPC boundary, or session security:
1. Please do **NOT** report security issues via public GitHub issues.
2. Email the maintainer directly at **linkwithshivang@gmail.com** with the subject line `[SECURITY] SecurePass Vulnerability Report`.
3. Provide detailed steps to reproduce, cryptographic proof-of-concept, and environment details.

All security reports are acknowledged and prioritized within 48 hours.
