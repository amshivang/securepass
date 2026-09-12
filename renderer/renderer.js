/**
 * SecurePass Desktop - Renderer Controller
 * 
 * Manages Vault UI, Zero-Knowledge operations, and Real-time Password Analyzer.
 * ponytail: Clean event delegation, zero external runtime UI frameworks, minimal footprint.
 */

// Application State
const state = {
  isSetupMode: false,
  items: [],
  activeCategory: 'All',
  searchQuery: '',
  autoLockMinutes: 15,
  inactivityTimer: null
};

// DOM References
const authView = document.getElementById('authView');
const vaultView = document.getElementById('vaultView');
const analyzerView = document.getElementById('analyzerView');
const settingsView = document.getElementById('settingsView');
const navTabs = document.getElementById('navTabs');
const lockVaultBtn = document.getElementById('lockVaultBtn');

// Auth DOM
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authForm = document.getElementById('authForm');
const masterPasswordInput = document.getElementById('masterPasswordInput');
const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authErrorBanner = document.getElementById('authErrorBanner');
const authErrorText = document.getElementById('authErrorText');
const toggleAuthEye = document.getElementById('toggleAuthEye');
const authEyeOpen = document.getElementById('authEyeOpen');
const authEyeClosed = document.getElementById('authEyeClosed');
const resetVaultContainer = document.getElementById('resetVaultContainer');
const resetVaultBtn = document.getElementById('resetVaultBtn');

// Vault DOM
const itemsList = document.getElementById('itemsList');
const emptyVaultState = document.getElementById('emptyVaultState');
const vaultSearchInput = document.getElementById('vaultSearchInput');
const categoryFilter = document.getElementById('categoryFilter');
const addItemBtn = document.getElementById('addItemBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');

// Modal DOM
const itemModal = document.getElementById('itemModal');
const modalTitle = document.getElementById('modalTitle');
const itemForm = document.getElementById('itemForm');
const itemId = document.getElementById('itemId');
const itemCategory = document.getElementById('itemCategory');
const itemTitle = document.getElementById('itemTitle');
const itemUsername = document.getElementById('itemUsername');
const itemPassword = document.getElementById('itemPassword');
const itemUrl = document.getElementById('itemUrl');
const itemTotp = document.getElementById('itemTotp');
const itemNotes = document.getElementById('itemNotes');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const modalGenPasswordBtn = document.getElementById('modalGenPasswordBtn');
const modalStrengthMeter = document.getElementById('modalStrengthMeter');
const toggleModalPasswordEye = document.getElementById('toggleModalPasswordEye');
const modalEyeOpen = document.getElementById('modalEyeOpen');
const modalEyeClosed = document.getElementById('modalEyeClosed');

// Analyzer DOM
const analyzerPasswordInput = document.getElementById('analyzerPasswordInput');
const toggleAnalyzerEye = document.getElementById('toggleAnalyzerEye');
const analyzerEyeOpen = document.getElementById('analyzerEyeOpen');
const analyzerEyeClosed = document.getElementById('analyzerEyeClosed');
const analyzerGenBtn = document.getElementById('analyzerGenBtn');
const analyzerCopyBtn = document.getElementById('analyzerCopyBtn');
const analyzerCopyIcon = document.getElementById('analyzerCopyIcon');
const analyzerCheckIcon = document.getElementById('analyzerCheckIcon');
const strengthSection = document.getElementById('strengthSection');
const strengthTag = document.getElementById('strengthTag');
const confidenceBadge = document.getElementById('confidenceBadge');
const strengthPct = document.getElementById('strengthPct');
const strengthFill = document.getElementById('strengthFill');
const statCrack = document.getElementById('statCrack');
const statScore = document.getElementById('statScore');
const commonBanner = document.getElementById('commonBanner');
const adviceBanner = document.getElementById('adviceBanner');
const adviceList = document.getElementById('adviceList');
const allGoodBanner = document.getElementById('allGoodBanner');
const breachBtn = document.getElementById('breachBtn');
const breachDangerBanner = document.getElementById('breachDangerBanner');
const breachDangerText = document.getElementById('breachDangerText');
const breachSafeBanner = document.getElementById('breachSafeBanner');

// Settings DOM
const autoLockSelect = document.getElementById('autoLockSelect');
const exportEncryptedBtn = document.getElementById('exportEncryptedBtn');
const exportPlaintextBtn = document.getElementById('exportPlaintextBtn');
const importBackupBtn = document.getElementById('importBackupBtn');
const backupFileInput = document.getElementById('backupFileInput');
const changePasswordForm = document.getElementById('changePasswordForm');
const currentMasterPassword = document.getElementById('currentMasterPassword');
const newMasterPassword = document.getElementById('newMasterPassword');
const confirmNewMasterPassword = document.getElementById('confirmNewMasterPassword');

// Toast
const appToast = document.getElementById('appToast');
let toastTimeout = null;

function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  appToast.textContent = message;
  appToast.style.display = 'block';
  toastTimeout = setTimeout(() => {
    appToast.style.display = 'none';
  }, 2500);
}

// -------------------------------------------------------------
// 1. INITIALIZATION & AUTH
// -------------------------------------------------------------
async function initApp() {
  const savedAutoLock = localStorage.getItem('securepass_autolock_minutes');
  state.autoLockMinutes = savedAutoLock !== null ? parseInt(savedAutoLock, 10) : 15;
  if (isNaN(state.autoLockMinutes)) {
    state.autoLockMinutes = 15;
  }
  if (autoLockSelect) {
    autoLockSelect.value = String(state.autoLockMinutes);
  }

  resetInactivityTimer();
  ['click', 'keydown', 'mousemove'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });

  if (window.securePassAPI && window.securePassAPI.onVaultLocked) {
    window.securePassAPI.onVaultLocked(() => {
      if (state.items.length > 0 || !state.isSetupMode) {
        lockVault();
        showToast('Vault locked due to system lock/sleep.');
      }
    });
  }

  const exists = await window.securePassAPI.vaultCheckExists();
  if (!exists) {
    state.isSetupMode = true;
    authTitle.textContent = 'Create Master Password';
    authSubtitle.textContent = 'Set a master password to encrypt your vault. Write this down — zero-knowledge means it cannot be recovered if lost!';
    confirmPasswordGroup.style.display = 'block';
    if (resetVaultContainer) resetVaultContainer.style.display = 'none';
    authSubmitBtn.querySelector('span').textContent = 'Create Master Vault';
  } else {
    state.isSetupMode = false;
    authTitle.textContent = 'Unlock Your Vault';
    authSubtitle.textContent = 'Zero-knowledge AES-256-GCM encryption. Enter your master password to unlock.';
    confirmPasswordGroup.style.display = 'none';
    if (resetVaultContainer) resetVaultContainer.style.display = 'block';
    authSubmitBtn.querySelector('span').textContent = 'Unlock Vault';
  }
}

authForm.addEventListener('submit', async () => {
  const masterPassword = masterPasswordInput.value.trim();
  if (!masterPassword) return;

  hideAuthError();

  if (state.isSetupMode) {
    const confirm = confirmPasswordInput.value.trim();
    if (masterPassword.length < 8) {
      showAuthError('Master password must be at least 8 characters.');
      return;
    }
    if (masterPassword !== confirm) {
      showAuthError('Passwords do not match. Please re-type.');
      return;
    }

    const res = await window.securePassAPI.vaultInitialize(masterPassword);
    if (res.error) {
      showAuthError(res.error);
      return;
    }
    onVaultUnlocked();
  } else {
    authSubmitBtn.disabled = true;
    authSubmitBtn.querySelector('span').textContent = 'Decrypting…';

    const res = await window.securePassAPI.vaultUnlock(masterPassword);
    authSubmitBtn.disabled = false;
    authSubmitBtn.querySelector('span').textContent = 'Unlock Vault';

    if (res.error) {
      showAuthError(res.error);
      return;
    }
    onVaultUnlocked();
  }
});

function showAuthError(msg) {
  authErrorText.textContent = msg;
  authErrorBanner.style.display = 'block';
}

function hideAuthError() {
  authErrorBanner.style.display = 'none';
}

toggleAuthEye.addEventListener('click', () => {
  const isPass = masterPasswordInput.type === 'password';
  masterPasswordInput.type = isPass ? 'text' : 'password';
  authEyeOpen.style.display = isPass ? 'none' : 'block';
  authEyeClosed.style.display = isPass ? 'block' : 'none';
});

if (resetVaultBtn) {
  resetVaultBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to reset your vault? This will permanently delete any existing encrypted vault file and allow you to set a brand new master password.');
    if (!confirmed) return;

    const res = await window.securePassAPI.vaultReset();
    if (res && res.error) {
      showAuthError(`Failed to reset vault: ${res.error}`);
      return;
    }

    state.isSetupMode = true;
    authTitle.textContent = 'Create Master Password';
    authSubtitle.textContent = 'Set a master password to encrypt your vault. Write this down — zero-knowledge means it cannot be recovered if lost!';
    confirmPasswordGroup.style.display = 'block';
    if (resetVaultContainer) resetVaultContainer.style.display = 'none';
    authSubmitBtn.querySelector('span').textContent = 'Create Master Vault';
    masterPasswordInput.value = '';
    confirmPasswordInput.value = '';
    hideAuthError();
    showToast('Vault reset. You can now set your new master password.');
  });
}

async function onVaultUnlocked() {
  masterPasswordInput.value = '';
  confirmPasswordInput.value = '';
  authView.style.display = 'none';
  navTabs.style.display = 'flex';
  lockVaultBtn.style.display = 'flex';

  switchView('vaultView');
  await refreshVaultItems();
  showToast('Vault unlocked securely.');
}

async function lockVault() {
  await window.securePassAPI.vaultLock();
  state.items = [];
  itemsList.innerHTML = '';
  navTabs.style.display = 'none';
  lockVaultBtn.style.display = 'none';
  vaultView.style.display = 'none';
  analyzerView.style.display = 'none';
  settingsView.style.display = 'none';
  authView.style.display = 'flex';
  state.isSetupMode = false;
  authTitle.textContent = 'Unlock Your Vault';
  confirmPasswordGroup.style.display = 'none';
  if (resetVaultContainer) resetVaultContainer.style.display = 'block';
  authSubmitBtn.querySelector('span').textContent = 'Unlock Vault';
  showToast('Vault locked.');
}

lockVaultBtn.addEventListener('click', lockVault);

function resetInactivityTimer() {
  if (state.inactivityTimer) clearTimeout(state.inactivityTimer);
  if (state.autoLockMinutes <= 0) return;

  state.inactivityTimer = setTimeout(() => {
    if (navTabs.style.display !== 'none') {
      lockVault();
    }
  }, state.autoLockMinutes * 60 * 1000);
}

// -------------------------------------------------------------
// 2. NAVIGATION
// -------------------------------------------------------------
function switchView(targetId) {
  [vaultView, analyzerView, settingsView].forEach(v => v.style.display = 'none');
  document.getElementById(targetId).style.display = 'flex';

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.target === targetId);
  });
}

navTabs.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    switchView(tab.dataset.target);
  });
});

// -------------------------------------------------------------
// 3. VAULT MANAGEMENT
// -------------------------------------------------------------
async function refreshVaultItems() {
  const res = await window.securePassAPI.vaultGetItems();
  if (res.items) {
    state.items = res.items;
    renderVaultItems();
  }
}

function renderVaultItems() {
  const query = state.searchQuery.toLowerCase();
  const filtered = state.items.filter(item => {
    const matchesCategory = state.activeCategory === 'All' || item.category === state.activeCategory;
    const matchesSearch = !query || 
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.username && item.username.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  itemsList.innerHTML = '';

  if (filtered.length === 0) {
    emptyVaultState.style.display = 'flex';
    itemsList.style.display = 'none';
    return;
  }

  emptyVaultState.style.display = 'none';
  itemsList.style.display = 'grid';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vault-card';

    const categoryIcons = {
      'Logins': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      'Cards': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
      'Secure Notes': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
    };

    const iconSvg = categoryIcons[item.category] || categoryIcons['Logins'];

    card.innerHTML = `
      <div class="card-top">
        <div class="card-info">
          <div class="card-icon">${iconSvg}</div>
          <div>
            <div class="card-title">${escapeHtml(item.title)}</div>
            <div class="card-category">${escapeHtml(item.category)}</div>
          </div>
        </div>
        <button class="card-menu-btn delete-item-btn" data-id="${item.id}" title="Delete Item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      <div class="card-details">
        ${item.username ? `
          <div class="detail-row">
            <span class="detail-label">Username</span>
            <span class="detail-value">${escapeHtml(item.username)}</span>
          </div>
        ` : ''}
        ${item.password ? `
          <div class="detail-row">
            <span class="detail-label">Password</span>
            <span class="detail-value">••••••••••••</span>
          </div>
        ` : ''}
        ${item.url ? `
          <div class="detail-row">
            <span class="detail-label">Website</span>
            <span class="detail-value">${escapeHtml(item.url.replace(/^https?:\/\//, ''))}</span>
          </div>
        ` : ''}
        ${item.totpSecret ? `
          <div class="totp-card-row" data-totp-id="${item.id}" data-totp-secret="${escapeHtml(item.totpSecret)}">
            <div class="totp-left">
              <div class="totp-badge">2FA</div>
              <div class="totp-digits" id="totp-code-${item.id}">------</div>
              <div class="totp-countdown" id="totp-countdown-${item.id}">--s</div>
            </div>
            <button type="button" class="btn-card-action copy-totp-btn" data-id="${item.id}" title="Copy 2FA Code">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
        ` : ''}
      </div>

      <div class="card-actions">
        <div class="copy-buttons">
          ${item.username ? `
            <button class="btn-card-action copy-username-btn" data-username="${escapeHtml(item.username)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>User</span>
            </button>
          ` : ''}
          ${item.password ? `
            <button class="btn-card-action copy-pass-btn" data-id="${item.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Password</span>
            </button>
          ` : ''}
          ${item.totpSecret ? `
            <button class="btn-card-action copy-totp-btn" data-id="${item.id}" title="Copy 2FA Code">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>2FA</span>
            </button>
          ` : ''}
        </div>
        <button class="btn-card-action edit-item-btn" data-id="${item.id}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>Edit</span>
        </button>
      </div>
    `;

    itemsList.appendChild(card);
  });

  updateActiveTOTPCodes();
}

// -------------------------------------------------------------
// TOTP 2FA Engine - Active Display & Countdown Timer
// -------------------------------------------------------------
async function updateActiveTOTPCodes() {
  if (vaultView.style.display === 'none') return;
  const totpRows = document.querySelectorAll('.totp-card-row');
  if (totpRows.length === 0) return;

  await Promise.all(Array.from(totpRows).map(async (row) => {
    const id = row.dataset.totpId;
    const secret = row.dataset.totpSecret;
    if (!secret) return;

    const codeEl = document.getElementById(`totp-code-${id}`);
    const timerEl = document.getElementById(`totp-countdown-${id}`);
    if (!codeEl || !timerEl) return;

    try {
      const res = await window.securePassAPI.vaultGenerateTOTP(secret);
      if (res && res.code) {
        codeEl.textContent = `${res.code.slice(0, 3)} ${res.code.slice(3)}`;
        timerEl.textContent = `${res.remainingSeconds}s`;
        if (res.remainingSeconds <= 5) {
          timerEl.style.color = 'var(--weak)';
        } else {
          timerEl.style.color = 'var(--text-dim)';
        }
      } else if (res && res.error) {
        codeEl.textContent = 'Invalid Key';
        timerEl.textContent = '!';
        timerEl.style.color = 'var(--weak)';
      }
    } catch (_err) {
      codeEl.textContent = 'Error';
      timerEl.textContent = '--';
    }
  }));
}

// 1-second interval to update any active TOTP displays and countdowns
setInterval(updateActiveTOTPCodes, 1000);

// Vault Event Listeners
vaultSearchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  renderVaultItems();
});

categoryFilter.querySelectorAll('.pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    categoryFilter.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderVaultItems();
  });
});

// Item delegation (Copy, Edit, Delete)
itemsList.addEventListener('click', async (e) => {
  const copyUserBtn = e.target.closest('.copy-username-btn');
  if (copyUserBtn) {
    const user = copyUserBtn.dataset.username;
    await window.securePassAPI.copyToClipboard(user, false);
    showToast('Username copied!');
    return;
  }

  const copyPassBtn = e.target.closest('.copy-pass-btn');
  if (copyPassBtn) {
    const id = copyPassBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item && item.password) {
      await window.securePassAPI.copyToClipboard(item.password, true);
      showToast('Password copied! (Auto-clears in 30s)');
    }
    return;
  }

  const copyTotpBtn = e.target.closest('.copy-totp-btn');
  if (copyTotpBtn) {
    const id = copyTotpBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item && item.totpSecret) {
      const res = await window.securePassAPI.vaultGenerateTOTP(item.totpSecret);
      if (res && res.code) {
        await window.securePassAPI.copyToClipboard(res.code, true);
        showToast('2FA code copied! (Auto-clears in 30s)');
      } else if (res && res.error) {
        showToast(`2FA Error: ${res.error}`);
      }
    }
    return;
  }

  const editBtn = e.target.closest('.edit-item-btn');
  if (editBtn) {
    const id = editBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item) openItemModal(item);
    return;
  }

  const deleteBtn = e.target.closest('.delete-item-btn');
  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (confirm('Are you sure you want to permanently delete this item?')) {
      await window.securePassAPI.vaultDeleteItem(id);
      await refreshVaultItems();
      showToast('Item deleted.');
    }
    return;
  }
});

// Modal Operations
function openItemModal(item = null) {
  if (item) {
    modalTitle.textContent = 'Edit Item';
    itemId.value = item.id;
    itemCategory.value = item.category || 'Logins';
    itemTitle.value = item.title || '';
    itemUsername.value = item.username || '';
    itemPassword.value = item.password || '';
    itemUrl.value = item.url || '';
    itemTotp.value = item.totpSecret || '';
    itemNotes.value = item.notes || '';
    updateModalStrength(item.password);
  } else {
    modalTitle.textContent = 'Add New Credential';
    itemForm.reset();
    itemId.value = '';
    itemTotp.value = '';
    modalStrengthMeter.textContent = 'Strength: —';
    modalStrengthMeter.style.color = 'var(--text-dim)';
  }
  itemModal.style.display = 'flex';
  itemTitle.focus();
}

function closeItemModal() {
  itemModal.style.display = 'none';
}

addItemBtn.addEventListener('click', () => openItemModal());
emptyAddBtn.addEventListener('click', () => openItemModal());
closeModalBtn.addEventListener('click', closeItemModal);
cancelModalBtn.addEventListener('click', closeItemModal);

itemForm.addEventListener('submit', async () => {
  const id = itemId.value;
  const payload = {
    title: itemTitle.value.trim() || 'Untitled',
    category: itemCategory.value,
    username: itemUsername.value.trim(),
    password: itemPassword.value,
    url: itemUrl.value.trim(),
    totpSecret: itemTotp.value.trim(),
    notes: itemNotes.value.trim()
  };

  if (id) {
    await window.securePassAPI.vaultUpdateItem(id, payload);
    showToast('Item updated in vault.');
  } else {
    await window.securePassAPI.vaultAddItem(payload);
    showToast('New item encrypted & saved.');
  }

  closeItemModal();
  await refreshVaultItems();
});

// Modal Password Generation & Reveal
modalGenPasswordBtn.addEventListener('click', () => {
  const generated = generateStrongPassword(20);
  itemPassword.value = generated;
  itemPassword.type = 'text';
  modalEyeOpen.style.display = 'none';
  modalEyeClosed.style.display = 'block';
  updateModalStrength(generated);
});

toggleModalPasswordEye.addEventListener('click', () => {
  const isPass = itemPassword.type === 'password';
  itemPassword.type = isPass ? 'text' : 'password';
  modalEyeOpen.style.display = isPass ? 'none' : 'block';
  modalEyeClosed.style.display = isPass ? 'block' : 'none';
});

itemPassword.addEventListener('input', (e) => {
  updateModalStrength(e.target.value);
});

function updateModalStrength(pwd) {
  if (!pwd) {
    modalStrengthMeter.textContent = 'Strength: —';
    modalStrengthMeter.style.color = 'var(--text-dim)';
    return;
  }
  const score = evaluatePasswordScore(pwd);
  if (score >= 11) {
    modalStrengthMeter.textContent = 'Strength: Strong';
    modalStrengthMeter.style.color = 'var(--strong)';
  } else if (score >= 6) {
    modalStrengthMeter.textContent = 'Strength: Medium';
    modalStrengthMeter.style.color = 'var(--medium)';
  } else {
    modalStrengthMeter.textContent = 'Strength: Weak';
    modalStrengthMeter.style.color = 'var(--weak)';
  }
}

// -------------------------------------------------------------
// 4. SECUREPASS PASSWORD ANALYZER & GENERATOR ENGINE
// -------------------------------------------------------------
function generateStrongPassword(length = 18) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[array[i] % charset.length];
  }
  return result;
}

function analyzePassword(pwd) {
  if (!pwd) {
    strengthSection.style.display = 'none';
    commonBanner.style.display = 'none';
    adviceBanner.style.display = 'none';
    allGoodBanner.style.display = 'none';
    breachBtn.disabled = true;
    analyzerCopyBtn.disabled = true;
    return;
  }

  analyzerCopyBtn.disabled = false;
  breachBtn.disabled = false;
  strengthSection.style.display = 'block';

  const entropy = calculateShannonEntropy(pwd);
  const score = evaluatePasswordScore(pwd);
  statScore.textContent = `${score}/15 (${entropy.toFixed(1)} bits)`;
  statCrack.textContent = estimateCrackTime(pwd);

  const pct = Math.round((score / 15) * 100);
  strengthPct.textContent = `${pct}%`;
  strengthFill.style.width = `${pct}%`;

  const commonList = ['password', '123456', 'qwerty', 'admin', 'welcome', 'letmein', 'football', 'monkey'];
  const isCommon = commonList.includes(pwd.toLowerCase());
  commonBanner.style.display = isCommon ? 'flex' : 'none';

  // Advice
  const advice = [];
  if (pwd.length < 12) advice.push('Increase length to at least 12–16 characters.');
  if (!/[A-Z]/.test(pwd)) advice.push('Add uppercase letters (A–Z).');
  if (!/[a-z]/.test(pwd)) advice.push('Add lowercase letters (a–z).');
  if (!/[0-9]/.test(pwd)) advice.push('Include numerical digits (0–9).');
  if (!/[^a-zA-Z0-9]/.test(pwd)) advice.push('Add special symbols (!@#$%^&*).');

  if (advice.length > 0 && !isCommon) {
    adviceList.innerHTML = advice.map(a => `<li>${a}</li>`).join('');
    adviceBanner.style.display = 'flex';
    allGoodBanner.style.display = 'none';
  } else if (!isCommon) {
    adviceBanner.style.display = 'none';
    allGoodBanner.style.display = 'flex';
  }

  // Label & color
  const entropyLabel = `${entropy.toFixed(1)} bits entropy`;
  if (score >= 11 && !isCommon) {
    strengthTag.textContent = 'Strong';
    strengthTag.style.color = 'var(--strong)';
    strengthFill.style.backgroundColor = 'var(--strong)';
    confidenceBadge.textContent = `High Confidence (${entropyLabel})`;
  } else if (score >= 6 && !isCommon) {
    strengthTag.textContent = 'Medium';
    strengthTag.style.color = 'var(--medium)';
    strengthFill.style.backgroundColor = 'var(--medium)';
    confidenceBadge.textContent = `Moderate (${entropyLabel})`;
  } else {
    strengthTag.textContent = 'Weak';
    strengthTag.style.color = 'var(--weak)';
    strengthFill.style.backgroundColor = 'var(--weak)';
    confidenceBadge.textContent = `High Risk (${entropyLabel})`;
  }
}

analyzerPasswordInput.addEventListener('input', (e) => {
  analyzePassword(e.target.value);
});

toggleAnalyzerEye.addEventListener('click', () => {
  const isPass = analyzerPasswordInput.type === 'password';
  analyzerPasswordInput.type = isPass ? 'text' : 'password';
  analyzerEyeOpen.style.display = isPass ? 'none' : 'block';
  analyzerEyeClosed.style.display = isPass ? 'block' : 'none';
});

analyzerGenBtn.addEventListener('click', () => {
  const generated = generateStrongPassword(20);
  analyzerPasswordInput.value = generated;
  analyzePassword(generated);
});

analyzerCopyBtn.addEventListener('click', async () => {
  const pwd = analyzerPasswordInput.value;
  if (!pwd) return;
  await window.securePassAPI.copyToClipboard(pwd, true);
  analyzerCopyIcon.style.display = 'none';
  analyzerCheckIcon.style.display = 'block';
  showToast('Copied to clipboard! (Auto-clears in 30s)');
  setTimeout(() => {
    analyzerCopyIcon.style.display = 'block';
    analyzerCheckIcon.style.display = 'none';
  }, 2000);
});

// Breach check with HIBP k-anonymity (SHA-1 hash prefix)
breachBtn.addEventListener('click', async () => {
  const pwd = analyzerPasswordInput.value;
  if (!pwd) return;

  breachBtn.disabled = true;
  breachBtn.querySelector('span').textContent = 'Checking breach records…';
  breachDangerBanner.style.display = 'none';
  breachSafeBanner.style.display = 'none';

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const text = await response.text();

    const lines = text.split('\n');
    let matchCount = 0;
    for (const line of lines) {
      const [hashPart, count] = line.trim().split(':');
      if (hashPart === suffix) {
        matchCount = parseInt(count, 10);
        break;
      }
    }

    if (matchCount > 0) {
      breachDangerText.textContent = `Warning: This password was exposed in ${matchCount.toLocaleString()} known data breaches. Do not use it for any sensitive account.`;
      breachDangerBanner.style.display = 'flex';
    } else {
      breachSafeBanner.style.display = 'flex';
    }
  } catch (err) {
    showToast('Could not reach breach database. Check your internet connection.');
  } finally {
    breachBtn.disabled = false;
    breachBtn.querySelector('span').textContent = 'Check known breaches (k-anonymity)';
  }
});

// -------------------------------------------------------------
// 5. SETTINGS & BACKUP
// -------------------------------------------------------------
if (autoLockSelect) {
  autoLockSelect.addEventListener('change', () => {
    const mins = parseInt(autoLockSelect.value, 10);
    state.autoLockMinutes = isNaN(mins) ? 15 : mins;
    localStorage.setItem('securepass_autolock_minutes', state.autoLockMinutes);
    resetInactivityTimer();
    showToast(state.autoLockMinutes === 0 ? 'Auto-lock disabled.' : `Auto-lock set to ${state.autoLockMinutes} minute${state.autoLockMinutes > 1 ? 's' : ''}.`);
  });
}

exportEncryptedBtn.addEventListener('click', async () => {
  const res = await window.securePassAPI.vaultExportEncryptedBackup();
  if (res.error) {
    showToast(`Export failed: ${res.error}`);
    return;
  }
  if (res.backup) {
    const blob = new Blob([res.backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securepass-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Encrypted vault backup exported.');
  }
});

if (exportPlaintextBtn) {
  exportPlaintextBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      'WARNING: Plaintext backups contain all your passwords in unencrypted plain text! Anyone with access to this file will be able to read all credentials.\n\nAre you sure you want to export an unencrypted backup?'
    );
    if (!confirmed) return;

    const res = await window.securePassAPI.vaultExportPlaintextBackup();
    if (res.error) {
      showToast(`Export failed: ${res.error}`);
      return;
    }
    if (res.backup) {
      const blob = new Blob([res.backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securepass-plaintext-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Plaintext backup exported.');
    }
  });
}

importBackupBtn.addEventListener('click', () => {
  backupFileInput.click();
});

backupFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const content = event.target.result;
      const parsed = JSON.parse(content);

      if (parsed.salt && parsed.iv && parsed.tag && parsed.data) {
        const password = prompt('This backup is encrypted. Enter the master password used to encrypt it:');
        if (!password) {
          showToast('Import cancelled.');
          return;
        }
        const res = await window.securePassAPI.vaultImportEncryptedBackup(content, password);
        if (res.error) {
          alert(`Failed to import encrypted backup: ${res.error}`);
        } else {
          await refreshVaultItems();
          showToast(`Successfully imported ${res.count} items from encrypted backup!`);
        }
      } else {
        const res = await window.securePassAPI.vaultImportBackup(content);
        if (res.error) {
          alert(`Failed to import backup: ${res.error}`);
        } else {
          await refreshVaultItems();
          showToast(`Successfully imported ${res.count} items!`);
        }
      }
    } catch (err) {
      alert('Invalid backup JSON file.');
    } finally {
      backupFileInput.value = '';
    }
  };
  reader.readAsText(file);
});

// Change Master Password
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const current = currentMasterPassword ? currentMasterPassword.value : '';
    const next = newMasterPassword ? newMasterPassword.value : '';
    const confirm = confirmNewMasterPassword ? confirmNewMasterPassword.value : '';

    if (!current || !next || !confirm) {
      showToast('All fields are required.');
      return;
    }

    if (next !== confirm) {
      showToast('New passwords do not match.');
      return;
    }

    if (next.length < 8) {
      showToast('New master password must be at least 8 characters.');
      return;
    }

    const res = await window.securePassAPI.vaultChangeMasterPassword(current, next);
    if (res && res.error) {
      showToast(res.error);
    } else {
      changePasswordForm.reset();
      showToast('Master password successfully updated!');
    }
  });
}

// Helper
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Start app
initApp();
