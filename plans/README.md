# SecurePass Implementation Plans

Index of prioritized implementation plans produced by the `/improve` senior advisor audit.

## Execution Order & Status

| Plan | Title | Category | Priority | Effort | Status | Depends On |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [**001**](001-crypto-vault-automated-test-suite.md) | Establish Automated CryptoVault Test Suite Baseline | Tests | P1 | S | **DONE** | None |
| [**002**](002-fix-backup-encryption-and-salt-bug.md) | Fix Backup Encryption and Salt Regeneration Bug | Security / Bug | P1 | S | **DONE** | Plan 001 |
| [**003**](003-security-hardening-clipboard-and-csp.md) | Security Hardening: Clipboard Flush on Exit and CSP | Security | P2 | S | **DONE** | None |
| [**004**](004-change-master-password.md) | Implement "Change Master Password" Workflow | Correctness | P2 | M | **TODO** | Plan 001, 002 |

---

## Dependency Graph

```
[001: Automated Test Suite] ──┬──> [002: Fix Backup & Salt Bug] ──> [004: Change Master Password]
                              │
[003: Clipboard & CSP] ───────┘ (independent)
```

## Guidelines for Executors

1. Each plan is 100% self-contained.
2. Verify all done criteria with explicit terminal commands before marking a step complete.
3. If any STOP condition in a plan is triggered, halt and report back immediately.
