# SecurePass Implementation Plans

Index of prioritized implementation plans produced by the `/improve` senior advisor audit.

## Execution Order & Status

| Plan | Title | Category | Priority | Effort | Status | Depends On |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [**001**](001-crypto-vault-automated-test-suite.md) | Establish Automated CryptoVault Test Suite Baseline | Tests | P1 | S | **DONE** | None |
| [**002**](002-fix-backup-encryption-and-salt-bug.md) | Fix Backup Encryption and Salt Regeneration Bug | Security / Bug | P1 | S | **DONE** | Plan 001 |
| [**003**](003-security-hardening-clipboard-and-csp.md) | Security Hardening: Clipboard Flush on Exit and CSP | Security | P2 | S | **DONE** | None |
| [**004**](004-change-master-password.md) | Implement "Change Master Password" Workflow | Correctness | P2 | M | **DONE** | Plan 001, 002 |
| [**005**](005-configurable-vault-auto-lock.md) | Configurable Vault Inactivity Auto-Lock Duration | Security / Feature | P2 | S | **DONE** | None |
| [**006**](006-headless-password-analyzer-tests.md) | Headless Password Analyzer & Shannon Entropy Tests | Tests | P2 | S | **DONE** | None |
| [**007**](007-totp-authenticator-2fa-engine.md) | Integrated Two-Factor Authentication (TOTP) Engine | Direction / Feature | P3 | M | **DONE** | None |

---

## Dependency Graph

```
[001: Automated Test Suite] ──┬──> [002: Fix Backup & Salt Bug] ──> [004: Change Master Password]
                              │
[003: Clipboard & CSP] ───────┤ (independent)
[005: Auto-Lock Settings] ────┤ (independent)
[006: Analyzer Tests] ────────┤ (independent)
[007: TOTP Authenticator] ────┘ (independent)
```

## Guidelines for Executors

1. Each plan is 100% self-contained.
2. Verify all done criteria with explicit terminal commands before marking a step complete.
3. If any STOP condition in a plan is triggered, halt and report back immediately.
