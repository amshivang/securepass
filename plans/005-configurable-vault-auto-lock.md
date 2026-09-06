# Plan 005: Configurable Vault Inactivity Auto-Lock Duration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53bf3eb..HEAD -- renderer/index.html renderer/renderer.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security / feature
- **Planned at**: commit `53bf3eb`, 2026-09-06

## Why this matters

The vault inactivity auto-lock timeout is currently hardcoded to 15 minutes (`15 * 60 * 1000`). Users operating in high-security environments, shared offices, or public spaces cannot configure tighter auto-lock windows (e.g. 1 minute or 5 minutes), nor can users in trusted home workstations extend the duration. This plan adds a persistent Auto-Lock Timeout selector to the Settings view.

## Current state

- `renderer/renderer.js:770` contains:
```javascript
function resetAutoLockTimer() {
  if (autoLockTimeout) clearTimeout(autoLockTimeout);
  if (authView.classList.contains('active')) return;

  autoLockTimeout = setTimeout(() => {
    lockVault();
    showToast('Vault auto-locked due to inactivity.');
  }, 15 * 60 * 1000); // 15 minutes
}
```
- `renderer/index.html` has `#settingsView` containing cards for Encryption Details, Vault Backup & Portability, and Change Master Password.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `npm test` | exit 0, all tests pass |
| Syntax Check | `node -c main.js` | exit 0 |

## Scope

**In scope**:
- `renderer/index.html` (add Auto-Lock duration dropdown selector in Settings)
- `renderer/renderer.js` (persist setting in `localStorage`, apply dynamic timeout)

**Out of scope**:
- Do not edit `crypto-vault.js` or `main.js`.

## Steps

### Step 1: Add Auto-Lock Selector to Settings in `renderer/index.html`

In `renderer/index.html`, inside `<section id="settingsView">` inside `<div class="settings-container">`, add a new card:
```html
        <div class="settings-card">
          <h3>Inactivity Auto-Lock</h3>
          <p class="settings-desc">Automatically lock your vault when no keyboard or mouse activity is detected.</p>
          <div class="form-group" style="margin-top: 14px; max-width: 320px;">
            <label for="autoLockSelect">Lock after inactivity:</label>
            <select id="autoLockSelect" class="text-input" style="background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; width: 100%; margin-top: 6px;">
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="15" selected>15 minutes (Default)</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="0">Never (Manual lock only)</option>
            </select>
          </div>
        </div>
```

### Step 2: Implement Dynamic Timeout in `renderer/renderer.js`

In `renderer/renderer.js`:
1. Reference `#autoLockSelect`:
```javascript
const autoLockSelect = document.getElementById('autoLockSelect');
```
2. Initialize from `localStorage`:
```javascript
function getAutoLockDurationMinutes() {
  const saved = localStorage.getItem('securepass_autolock_minutes');
  return saved !== null ? parseInt(saved, 10) : 15;
}

if (autoLockSelect) {
  autoLockSelect.value = String(getAutoLockDurationMinutes());
  autoLockSelect.addEventListener('change', () => {
    const mins = parseInt(autoLockSelect.value, 10);
    localStorage.setItem('securepass_autolock_minutes', mins);
    resetAutoLockTimer();
    showToast(mins === 0 ? 'Auto-lock disabled.' : `Auto-lock set to ${mins} minute${mins > 1 ? 's' : ''}.`);
  });
}
```
3. Update `resetAutoLockTimer()`:
```javascript
function resetAutoLockTimer() {
  if (autoLockTimeout) clearTimeout(autoLockTimeout);
  if (authView.classList.contains('active')) return;

  const minutes = getAutoLockDurationMinutes();
  if (minutes <= 0) return; // Never auto-lock

  autoLockTimeout = setTimeout(() => {
    lockVault();
    showToast('Vault auto-locked due to inactivity.');
  }, minutes * 60 * 1000);
}
```

## Done criteria

- [ ] `npm test` exits 0.
- [ ] Changing dropdown updates `localStorage` and resets timeout window.
- [ ] Selecting "Never" disables the timeout.
- [ ] Setting is remembered across application restarts.
