/**
 * SecurePass Desktop - Renderer Controller
 * 
 * Manages Vault UI, Zero-Knowledge operations, and Real-time Password Analyzer.
 * Applying Anthropic Frontend Design & UI/UX principles with Ponytail minimal vanilla architecture.
 */

// Application State
const state = {
  isSetupMode: false,
  items: [],
  activeCategory: 'All',
  searchQuery: '',
  autoLockMinutes: 15,
  inactivityTimer: null,
  clipboardCountdownTimer: null,
  clipboardExpiresAt: 0,
  activeDetailItem: null,
  pendingDeleteItem: null,
  activeDetailPasswordRevealed: false
};

// DOM References - Navigation & Views
const authView = document.getElementById('authView');
const vaultView = document.getElementById('vaultView');
const analyzerView = document.getElementById('analyzerView');
const settingsView = document.getElementById('settingsView');
const navTabs = document.getElementById('navTabs');
const lockVaultBtn = document.getElementById('lockVaultBtn');

// Clipboard Header Status
const clipboardStatus = document.getElementById('clipboardStatus');
const clipboardCountdownText = document.getElementById('clipboardCountdownText');
const clearClipboardNowBtn = document.getElementById('clearClipboardNowBtn');

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
const filteredEmptyState = document.getElementById('filteredEmptyState');
const filterEmptyTitle = document.getElementById('filterEmptyTitle');
const filterEmptyDesc = document.getElementById('filterEmptyDesc');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const vaultSearchInput = document.getElementById('vaultSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const addItemBtn = document.getElementById('addItemBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');
const countAll = document.getElementById('countAll');
const countLogins = document.getElementById('countLogins');
const countCards = document.getElementById('countCards');
const countNotes = document.getElementById('countNotes');
const countFavorites = document.getElementById('countFavorites');
const dashboardTotal = document.getElementById('dashboardTotal');
const dashboardWeak = document.getElementById('dashboardWeak');
const dashboardReused = document.getElementById('dashboardReused');

// Add / Edit Modal DOM
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
const customFieldsContainer = document.getElementById('customFieldsContainer');
const addCustomFieldBtn = document.getElementById('addCustomFieldBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const modalGenPasswordBtn = document.getElementById('modalGenPasswordBtn');
const modalGenOptionsToggle = document.getElementById('modalGenOptionsToggle');
const modalGenOptionsDrawer = document.getElementById('modalGenOptionsDrawer');
const modalGenLength = document.getElementById('modalGenLength');
const modalGenLengthVal = document.getElementById('modalGenLengthVal');
const modalOptUpper = document.getElementById('modalOptUpper');
const modalOptLower = document.getElementById('modalOptLower');
const modalOptDigits = document.getElementById('modalOptDigits');
const modalOptSymbols = document.getElementById('modalOptSymbols');
const modalStrengthMeter = document.getElementById('modalStrengthMeter');
const toggleModalPasswordEye = document.getElementById('toggleModalPasswordEye');
const modalEyeOpen = document.getElementById('modalEyeOpen');
const modalEyeClosed = document.getElementById('modalEyeClosed');

// Item Detail Modal DOM
const itemDetailModal = document.getElementById('itemDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const detailCategoryIcon = document.getElementById('detailCategoryIcon');
const detailItemTitle = document.getElementById('detailItemTitle');
const detailItemCategory = document.getElementById('detailItemCategory');
const detailUsernameRow = document.getElementById('detailUsernameRow');
const detailUsernameVal = document.getElementById('detailUsernameVal');
const detailCopyUserBtn = document.getElementById('detailCopyUserBtn');
const detailPasswordRow = document.getElementById('detailPasswordRow');
const detailPasswordVal = document.getElementById('detailPasswordVal');
const detailToggleEyeBtn = document.getElementById('detailToggleEyeBtn');
const detailEyeText = document.getElementById('detailEyeText');
const detailCopyPassBtn = document.getElementById('detailCopyPassBtn');
const detailWebsiteRow = document.getElementById('detailWebsiteRow');
const detailWebsiteLink = document.getElementById('detailWebsiteLink');
const detailOpenWebsiteBtn = document.getElementById('detailOpenWebsiteBtn');
const detailAutofillBtn = document.getElementById('detailAutofillBtn');
const detailCopyWebsiteBtn = document.getElementById('detailCopyWebsiteBtn');
const detailTotpRow = document.getElementById('detailTotpRow');
const detailTotpCode = document.getElementById('detailTotpCode');
const detailTotpCountdown = document.getElementById('detailTotpCountdown');
const detailCopyTotpBtn = document.getElementById('detailCopyTotpBtn');
const detailNotesRow = document.getElementById('detailNotesRow');
const detailNotesVal = document.getElementById('detailNotesVal');
const detailCopyNotesBtn = document.getElementById('detailCopyNotesBtn');
const detailDeleteBtn = document.getElementById('detailDeleteBtn');
const detailEditBtn = document.getElementById('detailEditBtn');
const detailCloseBtn = document.getElementById('detailCloseBtn');

// Delete Confirmation Modal DOM
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteTargetTitle = document.getElementById('deleteTargetTitle');

// Analyzer DOM
const analyzerPasswordInput = document.getElementById('analyzerPasswordInput');
const toggleAnalyzerEye = document.getElementById('toggleAnalyzerEye');
const analyzerEyeOpen = document.getElementById('analyzerEyeOpen');
const analyzerEyeClosed = document.getElementById('analyzerEyeClosed');
const analyzerGenBtn = document.getElementById('analyzerGenBtn');
const analyzerToggleOptionsBtn = document.getElementById('analyzerToggleOptionsBtn');
const analyzerGenOptions = document.getElementById('analyzerGenOptions');
const analyzerGenLength = document.getElementById('analyzerGenLength');
const analyzerGenLengthVal = document.getElementById('analyzerGenLengthVal');
const analyzerOptUpper = document.getElementById('analyzerOptUpper');
const analyzerOptLower = document.getElementById('analyzerOptLower');
const analyzerOptDigits = document.getElementById('analyzerOptDigits');
const analyzerOptSymbols = document.getElementById('analyzerOptSymbols');
const analyzerOptAvoidAmbiguous = document.getElementById('analyzerOptAvoidAmbiguous');
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
const toggleCurrentEye = document.getElementById('toggleCurrentEye');
const currentEyeOpen = document.getElementById('currentEyeOpen');
const currentEyeClosed = document.getElementById('currentEyeClosed');
const toggleNewEye = document.getElementById('toggleNewEye');
const newEyeOpen = document.getElementById('newEyeOpen');
const newEyeClosed = document.getElementById('newEyeClosed');
const toggleConfirmEye = document.getElementById('toggleConfirmEye');
const confirmEyeOpen = document.getElementById('confirmEyeOpen');
const confirmEyeClosed = document.getElementById('confirmEyeClosed');

// Backup Import Modal DOM
const backupImportModal = document.getElementById('backupImportModal');
const closeBackupImportModalBtn = document.getElementById('closeBackupImportModalBtn');
const cancelBackupImportBtn = document.getElementById('cancelBackupImportBtn');
const confirmBackupImportBtn = document.getElementById('confirmBackupImportBtn');
const backupImportForm = document.getElementById('backupImportForm');
const backupPasswordGroup = document.getElementById('backupPasswordGroup');
const backupPasswordInput = document.getElementById('backupPasswordInput');
const toggleBackupPasswordEye = document.getElementById('toggleBackupPasswordEye');
const backupEyeOpen = document.getElementById('backupEyeOpen');
const backupEyeClosed = document.getElementById('backupEyeClosed');
const backupMergeMode = document.getElementById('backupMergeMode');
const backupImportErrorBanner = document.getElementById('backupImportErrorBanner');
const backupImportErrorText = document.getElementById('backupImportErrorText');
let pendingBackupData = null;

// Reset Vault Modal DOM
const resetVaultModal = document.getElementById('resetVaultModal');
const closeResetVaultModalBtn = document.getElementById('closeResetVaultModalBtn');
const cancelResetVaultModalBtn = document.getElementById('cancelResetVaultModalBtn');
const confirmResetVaultModalBtn = document.getElementById('confirmResetVaultModalBtn');

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
// Clipboard Security Indicator & Immediate Flush
// -------------------------------------------------------------
async function copySensitiveWithTracker(text, toastMsg = 'Password copied! (Auto-clears in 30s)') {
  if (!text) return;
  await window.securePassAPI.copyToClipboard(text, true);
  showToast(toastMsg);

  state.clipboardExpiresAt = Date.now() + 30000;
  if (clipboardStatus) clipboardStatus.style.display = 'flex';
  updateClipboardCountdownDisplay();

  if (state.clipboardCountdownTimer) clearInterval(state.clipboardCountdownTimer);
  state.clipboardCountdownTimer = setInterval(updateClipboardCountdownDisplay, 1000);
}

function updateClipboardCountdownDisplay() {
  const remainingMs = state.clipboardExpiresAt - Date.now();
  if (remainingMs <= 0) {
    if (clipboardStatus) clipboardStatus.style.display = 'none';
    if (state.clipboardCountdownTimer) {
      clearInterval(state.clipboardCountdownTimer);
      state.clipboardCountdownTimer = null;
    }
    return;
  }
  const secs = Math.ceil(remainingMs / 1000);
  if (clipboardCountdownText) {
    clipboardCountdownText.textContent = `${secs}s`;
  }
}

if (clearClipboardNowBtn) {
  clearClipboardNowBtn.addEventListener('click', async () => {
    await window.securePassAPI.clearSensitiveClipboard();
    state.clipboardExpiresAt = 0;
    if (clipboardStatus) clipboardStatus.style.display = 'none';
    if (state.clipboardCountdownTimer) {
      clearInterval(state.clipboardCountdownTimer);
      state.clipboardCountdownTimer = null;
    }
    showToast('Clipboard cleared.');
  });
}

// -------------------------------------------------------------
// 1. INITIALIZATION & AUTH
// -------------------------------------------------------------
async function initApp() {
  const autoLock = await window.securePassAPI.getAutoLock();
  state.autoLockMinutes = [0, 1, 5, 15, 30, 60].includes(autoLock.minutes) ? autoLock.minutes : 15;
  if (autoLockSelect) {
    autoLockSelect.value = String(state.autoLockMinutes);
  }

  resetInactivityTimer();
  ['click', 'keydown', 'mousemove'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });

  if (window.securePassAPI && window.securePassAPI.onVaultLocked) {
    window.securePassAPI.onVaultLocked(reason => {
      if (state.items.length > 0 || !state.isSetupMode) {
        lockVault();
        showToast(reason === 'inactivity' ? 'Vault locked due to inactivity.' : 'Vault locked due to system lock/sleep.');
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

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Whitespace is valid password material and must not be silently removed.
  const masterPassword = masterPasswordInput.value;
  if (!masterPassword) return;

  hideAuthError();

  if (state.isSetupMode) {
    const confirm = confirmPasswordInput.value;
    if (masterPassword.length < 8) {
      showAuthError('Master password must be at least 8 characters.');
      return;
    }
    if (masterPassword !== confirm) {
      showAuthError('Passwords do not match. Please re-type.');
      return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.querySelector('span').textContent = 'Creating…';

    const res = await window.securePassAPI.vaultInitialize(masterPassword);
    authSubmitBtn.disabled = false;
    authSubmitBtn.querySelector('span').textContent = 'Create Master Vault';

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

masterPasswordInput.addEventListener('input', hideAuthError);
confirmPasswordInput.addEventListener('input', hideAuthError);

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

// Setup Eye toggles for settings form
function setupPasswordEyeToggle(toggleBtn, inputEl, openSvg, closedSvg) {
  if (!toggleBtn || !inputEl) return;
  toggleBtn.addEventListener('click', () => {
    const isPass = inputEl.type === 'password';
    inputEl.type = isPass ? 'text' : 'password';
    if (openSvg) openSvg.style.display = isPass ? 'none' : 'block';
    if (closedSvg) closedSvg.style.display = isPass ? 'block' : 'none';
  });
}
setupPasswordEyeToggle(toggleCurrentEye, currentMasterPassword, currentEyeOpen, currentEyeClosed);
setupPasswordEyeToggle(toggleNewEye, newMasterPassword, newEyeOpen, newEyeClosed);
setupPasswordEyeToggle(toggleConfirmEye, confirmNewMasterPassword, confirmEyeOpen, confirmEyeClosed);

// Reset Vault Modal Handlers
function openResetVaultModal() {
  if (resetVaultModal) resetVaultModal.style.display = 'flex';
}

function closeResetVaultModal() {
  if (resetVaultModal) resetVaultModal.style.display = 'none';
}

if (resetVaultBtn) resetVaultBtn.addEventListener('click', openResetVaultModal);
if (closeResetVaultModalBtn) closeResetVaultModalBtn.addEventListener('click', closeResetVaultModal);
if (cancelResetVaultModalBtn) cancelResetVaultModalBtn.addEventListener('click', closeResetVaultModal);

if (confirmResetVaultModalBtn) {
  confirmResetVaultModalBtn.addEventListener('click', async () => {
    closeResetVaultModal();
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
  closeAllModals();
  navTabs.style.display = 'none';
  lockVaultBtn.style.display = 'none';
  if (clipboardStatus) clipboardStatus.style.display = 'none';
  vaultView.style.display = 'none';
  analyzerView.style.display = 'none';
  settingsView.style.display = 'none';
  authView.style.display = 'flex';
  masterPasswordInput.value = '';
  confirmPasswordInput.value = '';
  if (analyzerPasswordInput) {
    analyzerPasswordInput.value = '';
    analyzePassword('');
  }
  if (changePasswordForm) changePasswordForm.reset();
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
// 2. NAVIGATION & MODAL DISMISSAL
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

function closeAllModals() {
  closeItemModal();
  closeItemDetailModal();
  closeDeleteConfirmModal();
  closeBackupImportModal();
  closeResetVaultModal();
}

// Global Keyboard Shortcuts (Ctrl+F, Ctrl+N, Ctrl+L, Escape)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openBackdrops = Array.from(document.querySelectorAll('.modal-backdrop')).filter(el => el.style.display === 'flex');
    if (openBackdrops.length > 0) {
      closeAllModals();
    } else if (vaultSearchInput && document.activeElement === vaultSearchInput) {
      vaultSearchInput.value = '';
      state.searchQuery = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      renderVaultItems();
      vaultSearchInput.blur();
    }
    return;
  }

  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  if (isCtrlOrCmd) {
    if (e.key.toLowerCase() === 'f') {
      if (vaultView && vaultView.style.display !== 'none' && vaultSearchInput) {
        e.preventDefault();
        vaultSearchInput.focus();
        vaultSearchInput.select();
      }
    } else if (e.key.toLowerCase() === 'n') {
      if (vaultView && vaultView.style.display !== 'none') {
        e.preventDefault();
        openItemModal();
      }
    } else if (e.key.toLowerCase() === 'l') {
      if (navTabs && navTabs.style.display !== 'none') {
        e.preventDefault();
        lockVault();
      }
    }
  }
});

// Click outside modal card to dismiss
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeAllModals();
    }
  });
});

// -------------------------------------------------------------
// 3. VAULT MANAGEMENT & CARD RENDERING
// -------------------------------------------------------------
async function refreshVaultItems() {
  const res = await window.securePassAPI.vaultGetItems();
  if (res.items) {
    state.items = res.items;
    updateCategoryCounts();
    renderVaultItems();
  }
}

function updateCategoryCounts() {
  const total = state.items.length;
  const logins = state.items.filter(i => i.category === 'Logins').length;
  const cards = state.items.filter(i => i.category === 'Cards').length;
  const notes = state.items.filter(i => i.category === 'Secure Notes').length;
  const favorites = state.items.filter(i => i.favorite).length;

  if (countAll) countAll.textContent = total;
  if (countLogins) countLogins.textContent = logins;
  if (countCards) countCards.textContent = cards;
  if (countNotes) countNotes.textContent = notes;
  if (countFavorites) countFavorites.textContent = favorites;
  updateSecurityDashboard();
}

function updateSecurityDashboard() {
  const credentials = state.items.filter(item => item.category !== 'Secure Notes' && item.password);
  const weak = credentials.filter(item => evaluatePasswordScore(item.password) < 9).length;
  const counts = new Map();
  for (const item of credentials) counts.set(item.password, (counts.get(item.password) || 0) + 1);
  const reused = credentials.filter(item => counts.get(item.password) > 1).length;
  if (dashboardTotal) dashboardTotal.textContent = state.items.length;
  if (dashboardWeak) dashboardWeak.textContent = weak;
  if (dashboardReused) dashboardReused.textContent = reused;
}

function renderVaultItems() {
  const query = state.searchQuery.toLowerCase().trim();
  const filtered = state.items.filter(item => {
    const matchesCategory = state.activeCategory === 'All' ||
      (state.activeCategory === 'Favorites' ? item.favorite : item.category === state.activeCategory);
    const matchesSearch = !query || 
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.username && item.username.toLowerCase().includes(query)) ||
      (item.url && item.url.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  itemsList.innerHTML = '';

  // Handle Empty States
  if (state.items.length === 0) {
    emptyVaultState.style.display = 'flex';
    if (filteredEmptyState) filteredEmptyState.style.display = 'none';
    itemsList.style.display = 'none';
    return;
  }

  if (filtered.length === 0) {
    emptyVaultState.style.display = 'none';
    if (filteredEmptyState) {
      filteredEmptyState.style.display = 'flex';
      if (filterEmptyTitle) {
        filterEmptyTitle.textContent = query ? `No items found for "${escapeHtml(state.searchQuery)}"` : `No items in category "${escapeHtml(state.activeCategory)}"`;
      }
    }
    itemsList.style.display = 'none';
    return;
  }

  emptyVaultState.style.display = 'none';
  if (filteredEmptyState) filteredEmptyState.style.display = 'none';
  itemsList.style.display = 'grid';

  const categoryIcons = {
    'Logins': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'Cards': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    'Secure Notes': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
  };

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vault-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View details for ${escapeHtml(item.title)}`);

    const iconSvg = categoryIcons[item.category] || categoryIcons['Logins'];

    // Specific detail layout depending on category
    let detailsHtml = '';
    if (item.category === 'Secure Notes') {
      if (item.notes) {
        detailsHtml = `<div class="card-notes-preview">${escapeHtml(item.notes)}</div>`;
      } else {
        detailsHtml = `<div class="card-notes-preview" style="color: var(--text-dim); font-style: italic;">(Empty secure note)</div>`;
      }
    } else {
      detailsHtml = `
        <div class="card-details">
          ${item.username ? `
            <div class="detail-row">
              <span class="detail-label">${item.category === 'Cards' ? 'Cardholder' : 'Username'}</span>
              <span class="detail-value">${escapeHtml(item.username)}</span>
            </div>
          ` : ''}
          ${item.password ? `
            <div class="detail-row">
              <span class="detail-label">${item.category === 'Cards' ? 'Card / PIN' : 'Password'}</span>
              <span class="detail-value font-mono" id="card-pass-val-${item.id}">••••••••••••</span>
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-top">
        <div class="card-info">
          <div class="card-icon" aria-hidden="true">${iconSvg}</div>
          <div>
            <div class="card-title">${escapeHtml(item.title)}</div>
            <div class="card-category">${escapeHtml(item.category)}</div>
          </div>
        </div>
         <button type="button" class="card-menu-btn favorite-item-btn ${item.favorite ? 'is-favorite' : ''}" data-id="${item.id}" title="${item.favorite ? 'Remove from favorites' : 'Add to favorites'}" aria-label="${item.favorite ? 'Remove' : 'Add'} ${escapeHtml(item.title)} ${item.favorite ? 'from' : 'to'} favorites" aria-pressed="${item.favorite}">
           <svg width="15" height="15" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
         </button>
         <button type="button" class="card-menu-btn delete-item-btn" data-id="${item.id}" title="Delete Item" aria-label="Delete ${escapeHtml(item.title)}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      ${detailsHtml}

      <div class="card-actions">
        <div class="copy-buttons">
          ${item.username ? `
            <button type="button" class="btn-card-action copy-username-btn" data-username="${escapeHtml(item.username)}" title="Copy ${item.category === 'Cards' ? 'Cardholder' : 'Username'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>User</span>
            </button>
          ` : ''}
          ${item.password ? `
            <button type="button" class="btn-card-action copy-pass-btn" data-id="${item.id}" title="Copy Password">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Pass</span>
            </button>
            <button type="button" class="btn-card-action peek-pass-btn" data-id="${item.id}" title="Toggle Password Reveal">
              <span id="peek-btn-text-${item.id}">Peek</span>
            </button>
          ` : ''}
          ${item.notes && item.category === 'Secure Notes' ? `
            <button type="button" class="btn-card-action copy-notes-btn" data-id="${item.id}" title="Copy Note">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          ` : ''}
        </div>
        <button type="button" class="btn-card-action edit-item-btn" data-id="${item.id}" title="Edit Item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>Edit</span>
        </button>
      </div>
    `;

    // Click anywhere on card (except action buttons) to open details
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      openItemDetailModal(item);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('button') || e.target.closest('a')) return;
        e.preventDefault();
        openItemDetailModal(item);
      }
    });

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

  // Also update detail modal TOTP if open
  if (itemDetailModal && itemDetailModal.style.display === 'flex' && state.activeDetailItem && state.activeDetailItem.totpSecret) {
    try {
      const res = await window.securePassAPI.vaultGenerateTOTP(state.activeDetailItem.totpSecret);
      if (res && res.code) {
        if (detailTotpCode) detailTotpCode.textContent = `${res.code.slice(0, 3)} ${res.code.slice(3)}`;
        if (detailTotpCountdown) detailTotpCountdown.textContent = `${res.remainingSeconds}s`;
      }
    } catch (_e) {}
  }

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

// Search & Filter Listeners
vaultSearchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  if (clearSearchBtn) {
    clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
  }
  renderVaultItems();
});

if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    vaultSearchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderVaultItems();
    vaultSearchInput.focus();
  });
}

if (resetFilterBtn) {
  resetFilterBtn.addEventListener('click', () => {
    vaultSearchInput.value = '';
    state.searchQuery = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    state.activeCategory = 'All';
    categoryFilter.querySelectorAll('.pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === 'All');
    });
    renderVaultItems();
  });
}

categoryFilter.querySelectorAll('.pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    categoryFilter.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderVaultItems();
  });
});

// Card Action Delegation
itemsList.addEventListener('click', async (e) => {
  const copyUserBtn = e.target.closest('.copy-username-btn');
  if (copyUserBtn) {
    e.stopPropagation();
    const user = copyUserBtn.dataset.username;
    await window.securePassAPI.copyToClipboard(user, false);
    showToast('Username copied!');
    return;
  }

  const copyPassBtn = e.target.closest('.copy-pass-btn');
  if (copyPassBtn) {
    e.stopPropagation();
    const id = copyPassBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item && item.password) {
      await copySensitiveWithTracker(item.password, 'Password copied! (Auto-clears in 30s)');
    }
    return;
  }

  const peekPassBtn = e.target.closest('.peek-pass-btn');
  if (peekPassBtn) {
    e.stopPropagation();
    const id = peekPassBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    const passEl = document.getElementById(`card-pass-val-${id}`);
    const peekText = document.getElementById(`peek-btn-text-${id}`);
    if (item && passEl) {
      if (passEl.textContent === '••••••••••••') {
        passEl.textContent = item.password;
        if (peekText) peekText.textContent = 'Hide';
      } else {
        passEl.textContent = '••••••••••••';
        if (peekText) peekText.textContent = 'Peek';
      }
    }
    return;
  }

  const copyNotesBtn = e.target.closest('.copy-notes-btn');
  if (copyNotesBtn) {
    e.stopPropagation();
    const id = copyNotesBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item && item.notes) {
      await window.securePassAPI.copyToClipboard(item.notes, false);
      showToast('Note copied to clipboard!');
    }
    return;
  }

  const copyTotpBtn = e.target.closest('.copy-totp-btn');
  if (copyTotpBtn) {
    e.stopPropagation();
    const id = copyTotpBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item && item.totpSecret) {
      const res = await window.securePassAPI.vaultGenerateTOTP(item.totpSecret);
      if (res && res.code) {
        await copySensitiveWithTracker(res.code, '2FA code copied! (Auto-clears in 30s)');
      } else if (res && res.error) {
        showToast(`2FA Error: ${res.error}`);
      }
    }
    return;
  }

  const editBtn = e.target.closest('.edit-item-btn');
  if (editBtn) {
    e.stopPropagation();
    const id = editBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item) openItemModal(item);
    return;
  }

  const favoriteBtn = e.target.closest('.favorite-item-btn');
  if (favoriteBtn) {
    e.stopPropagation();
    const id = favoriteBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    const result = await window.securePassAPI.vaultUpdateItem(id, { favorite: !item.favorite });
    if (result && result.error) {
      showToast(`Favorite update failed: ${result.error}`);
      return;
    }
    await refreshVaultItems();
    showToast(item.favorite ? 'Removed from favorites.' : 'Added to favorites.');
    return;
  }

  const deleteBtn = e.target.closest('.delete-item-btn');
  if (deleteBtn) {
    e.stopPropagation();
    const id = deleteBtn.dataset.id;
    const item = state.items.find(i => i.id === id);
    if (item) openDeleteConfirmModal(item);
    return;
  }
});

// -------------------------------------------------------------
// 4. ITEM DETAIL MODAL
// -------------------------------------------------------------
function openItemDetailModal(item) {
  state.activeDetailItem = item;
  state.activeDetailPasswordRevealed = false;

  const categoryIcons = {
    'Logins': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'Cards': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    'Secure Notes': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
  };

  if (detailCategoryIcon) {
    detailCategoryIcon.innerHTML = categoryIcons[item.category] || categoryIcons['Logins'];
  }
  if (detailItemTitle) detailItemTitle.textContent = item.title;
  if (detailItemCategory) detailItemCategory.textContent = item.category;

  // Username
  if (item.username) {
    detailUsernameRow.style.display = 'flex';
    detailUsernameVal.textContent = item.username;
  } else {
    detailUsernameRow.style.display = 'none';
  }

  // Password
  if (item.password) {
    detailPasswordRow.style.display = 'flex';
    detailPasswordVal.textContent = '••••••••••••';
    if (detailEyeText) detailEyeText.textContent = 'Show';
  } else {
    detailPasswordRow.style.display = 'none';
  }

  // Website
  if (item.url) {
    detailWebsiteRow.style.display = 'flex';
    const safeUrl = getSafeExternalUrl(item.url);
    detailWebsiteLink.href = safeUrl || '#';
    detailWebsiteLink.textContent = item.url;
    if (detailOpenWebsiteBtn) detailOpenWebsiteBtn.disabled = !safeUrl;
    if (detailAutofillBtn) detailAutofillBtn.disabled = !getSafeAutofillUrl(item.url) || item.category !== 'Logins';
  } else {
    detailWebsiteRow.style.display = 'none';
    if (detailOpenWebsiteBtn) detailOpenWebsiteBtn.disabled = true;
    if (detailAutofillBtn) detailAutofillBtn.disabled = true;
  }

  // TOTP
  if (item.totpSecret) {
    detailTotpRow.style.display = 'flex';
    updateActiveTOTPCodes();
  } else {
    detailTotpRow.style.display = 'none';
  }

  // Notes
  if (item.notes) {
    detailNotesRow.style.display = 'flex';
    detailNotesVal.textContent = item.notes;
  } else {
    detailNotesRow.style.display = 'none';
  }

  itemDetailModal.style.display = 'flex';
}

function closeItemDetailModal() {
  if (itemDetailModal) itemDetailModal.style.display = 'none';
  if (detailPasswordVal) detailPasswordVal.textContent = '••••••••••••';
  if (detailUsernameVal) detailUsernameVal.textContent = '';
  if (detailNotesVal) detailNotesVal.textContent = '';
  if (detailTotpCode) detailTotpCode.textContent = '------';
  if (detailWebsiteLink) {
    detailWebsiteLink.href = '#';
    detailWebsiteLink.textContent = '';
  }
  state.activeDetailItem = null;
  state.activeDetailPasswordRevealed = false;
}

if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeItemDetailModal);
if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeItemDetailModal);

// Detail Modal Field Actions
if (detailCopyUserBtn) {
  detailCopyUserBtn.addEventListener('click', async () => {
    if (state.activeDetailItem && state.activeDetailItem.username) {
      await window.securePassAPI.copyToClipboard(state.activeDetailItem.username, false);
      showToast('Username copied!');
    }
  });
}

if (detailToggleEyeBtn) {
  detailToggleEyeBtn.addEventListener('click', () => {
    if (!state.activeDetailItem || !state.activeDetailItem.password) return;
    state.activeDetailPasswordRevealed = !state.activeDetailPasswordRevealed;
    if (state.activeDetailPasswordRevealed) {
      detailPasswordVal.textContent = state.activeDetailItem.password;
      detailEyeText.textContent = 'Hide';
    } else {
      detailPasswordVal.textContent = '••••••••••••';
      detailEyeText.textContent = 'Show';
    }
  });
}

if (detailCopyPassBtn) {
  detailCopyPassBtn.addEventListener('click', async () => {
    if (state.activeDetailItem && state.activeDetailItem.password) {
      await copySensitiveWithTracker(state.activeDetailItem.password, 'Password copied! (Auto-clears in 30s)');
    }
  });
}

if (detailOpenWebsiteBtn) {
  detailOpenWebsiteBtn.addEventListener('click', () => {
    if (state.activeDetailItem && state.activeDetailItem.url) {
      const safeUrl = getSafeExternalUrl(state.activeDetailItem.url);
      if (safeUrl) window.open(safeUrl, '_blank');
    }
  });
}

if (detailAutofillBtn) {
  detailAutofillBtn.addEventListener('click', async () => {
    if (!state.activeDetailItem || !getSafeAutofillUrl(state.activeDetailItem.url)) return;
    const result = await window.securePassAPI.openLoginAndFill(state.activeDetailItem.id);
    if (result && result.error) {
      showToast(`Open & Fill failed: ${result.error}`);
      return;
    }
    showToast('Login window opened. Its toolbar will show the fill result.');
  });
}

if (detailCopyWebsiteBtn) {
  detailCopyWebsiteBtn.addEventListener('click', async () => {
    if (state.activeDetailItem && state.activeDetailItem.url) {
      await window.securePassAPI.copyToClipboard(state.activeDetailItem.url, false);
      showToast('Website URL copied!');
    }
  });
}

if (detailCopyTotpBtn) {
  detailCopyTotpBtn.addEventListener('click', async () => {
    if (state.activeDetailItem && state.activeDetailItem.totpSecret) {
      const res = await window.securePassAPI.vaultGenerateTOTP(state.activeDetailItem.totpSecret);
      if (res && res.code) {
        await copySensitiveWithTracker(res.code, '2FA code copied! (Auto-clears in 30s)');
      }
    }
  });
}

if (detailCopyNotesBtn) {
  detailCopyNotesBtn.addEventListener('click', async () => {
    if (state.activeDetailItem && state.activeDetailItem.notes) {
      await window.securePassAPI.copyToClipboard(state.activeDetailItem.notes, false);
      showToast('Notes copied to clipboard!');
    }
  });
}

if (detailEditBtn) {
  detailEditBtn.addEventListener('click', () => {
    const item = state.activeDetailItem;
    closeItemDetailModal();
    if (item) openItemModal(item);
  });
}

if (detailDeleteBtn) {
  detailDeleteBtn.addEventListener('click', () => {
    const item = state.activeDetailItem;
    closeItemDetailModal();
    if (item) openDeleteConfirmModal(item);
  });
}

// -------------------------------------------------------------
// 5. CUSTOM DELETE CONFIRMATION MODAL
// -------------------------------------------------------------
function openDeleteConfirmModal(item) {
  state.pendingDeleteItem = item;
  if (deleteTargetTitle) deleteTargetTitle.textContent = `"${item.title}"`;
  if (deleteConfirmModal) deleteConfirmModal.style.display = 'flex';
  if (confirmDeleteBtn) confirmDeleteBtn.focus();
}

function closeDeleteConfirmModal() {
  if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
  state.pendingDeleteItem = null;
}

if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', closeDeleteConfirmModal);
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!state.pendingDeleteItem) {
      closeDeleteConfirmModal();
      return;
    }
    const id = state.pendingDeleteItem.id;
    closeDeleteConfirmModal();
    await window.securePassAPI.vaultDeleteItem(id);
    await refreshVaultItems();
    showToast('Item deleted from vault.');
  });
}

// -------------------------------------------------------------
// 6. ADD / EDIT ITEM MODAL
// -------------------------------------------------------------
function openItemModal(item = null) {
  if (modalGenOptionsDrawer) modalGenOptionsDrawer.style.display = 'none';

  if (item) {
    modalTitle.textContent = 'Edit Credential';
    itemId.value = item.id;
    itemCategory.value = item.category || 'Logins';
    itemTitle.value = item.title || '';
    itemUsername.value = item.username || '';
    itemPassword.value = item.password || '';
    itemUrl.value = item.url || '';
    itemTotp.value = item.totpSecret || '';
    itemNotes.value = item.notes || '';
    renderCustomFields(item.customFields || []);
    updateModalStrength(item.password);
  } else {
    modalTitle.textContent = 'Add New Credential';
    itemForm.reset();
    itemId.value = '';
    itemTotp.value = '';
    renderCustomFields([]);
    itemCategory.value = state.activeCategory !== 'All' ? state.activeCategory : 'Logins';
    modalStrengthMeter.textContent = 'Strength: —';
    modalStrengthMeter.style.color = 'var(--text-dim)';
  }
  itemModal.style.display = 'flex';
  itemTitle.focus();
}

function renderCustomFields(fields) {
  if (!customFieldsContainer) return;
  customFieldsContainer.innerHTML = '';
  fields.forEach(field => addCustomFieldRow(field.name, field.value));
}

function addCustomFieldRow(name = '', value = '') {
  if (!customFieldsContainer || customFieldsContainer.children.length >= 20) {
    showToast('You can add up to 20 custom fields.');
    return;
  }

  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.innerHTML = `
    <input type="text" class="text-input custom-field-name" placeholder="Field name or ID" maxlength="200" value="${escapeHtml(name)}" aria-label="Custom field name" />
    <input type="text" class="text-input custom-field-value" placeholder="Value" maxlength="4096" value="${escapeHtml(value)}" aria-label="Custom field value" />
    <button type="button" class="btn-ghost-sm custom-field-remove" aria-label="Remove custom field">×</button>
  `;
  row.querySelector('.custom-field-remove').addEventListener('click', () => row.remove());
  customFieldsContainer.appendChild(row);
}

if (addCustomFieldBtn) addCustomFieldBtn.addEventListener('click', () => addCustomFieldRow());

function closeItemModal() {
  itemModal.style.display = 'none';
  itemForm.reset();
  itemId.value = '';
  itemPassword.type = 'password';
  if (modalEyeOpen) modalEyeOpen.style.display = 'block';
  if (modalEyeClosed) modalEyeClosed.style.display = 'none';
  renderCustomFields([]);
}

addItemBtn.addEventListener('click', () => openItemModal());
emptyAddBtn.addEventListener('click', () => openItemModal());
closeModalBtn.addEventListener('click', closeItemModal);
cancelModalBtn.addEventListener('click', closeItemModal);

itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = itemId.value;
  const payload = {
    title: itemTitle.value.trim() || 'Untitled',
    category: itemCategory.value,
    username: itemUsername.value.trim(),
    password: itemPassword.value,
    url: itemUrl.value.trim(),
    totpSecret: itemTotp.value.trim(),
    notes: itemNotes.value.trim(),
    customFields: Array.from(customFieldsContainer ? customFieldsContainer.querySelectorAll('.custom-field-row') : [])
      .map(row => ({
        name: row.querySelector('.custom-field-name').value.trim(),
        value: row.querySelector('.custom-field-value').value
      }))
  };

  if (payload.customFields.some(field => !field.name)) {
    showToast('Every custom field needs a name or ID.');
    return;
  }

  if (id) {
    const res = await window.securePassAPI.vaultUpdateItem(id, payload);
    if (res && res.error) {
      showToast(`Save failed: ${res.error}`);
      return;
    }
    showToast('Item updated in vault.');
  } else {
    const res = await window.securePassAPI.vaultAddItem(payload);
    if (res && res.error) {
      showToast(`Save failed: ${res.error}`);
      return;
    }
    showToast('New item encrypted & saved.');
  }

  closeItemModal();
  await refreshVaultItems();
});

// Modal Generator Options Toggle
if (modalGenOptionsToggle) {
  modalGenOptionsToggle.addEventListener('click', () => {
    const isHidden = modalGenOptionsDrawer.style.display === 'none';
    modalGenOptionsDrawer.style.display = isHidden ? 'flex' : 'none';
  });
}

if (modalGenLength) {
  modalGenLength.addEventListener('input', (e) => {
    if (modalGenLengthVal) modalGenLengthVal.textContent = e.target.value;
  });
}

modalGenPasswordBtn.addEventListener('click', () => {
  const length = modalGenLength ? parseInt(modalGenLength.value, 10) : 20;
  const options = {
    length: length || 20,
    upper: modalOptUpper ? modalOptUpper.checked : true,
    lower: modalOptLower ? modalOptLower.checked : true,
    digits: modalOptDigits ? modalOptDigits.checked : true,
    symbols: modalOptSymbols ? modalOptSymbols.checked : true,
    avoidAmbiguous: false
  };
  const generated = generateConfigurablePassword(options);
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
// 7. PASSWORD ANALYZER & CONFIGURABLE GENERATOR
// -------------------------------------------------------------
function generateConfigurablePassword({
  length = 20,
  upper = true,
  lower = true,
  digits = true,
  symbols = true,
  avoidAmbiguous = false
} = {}) {
  let upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  let digitChars = '0123456789';
  let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (avoidAmbiguous) {
    upperChars = upperChars.replace(/[IO]/g, '');
    lowerChars = lowerChars.replace(/[lo]/g, '');
    digitChars = digitChars.replace(/[01]/g, '');
  }

  const pools = [];
  if (upper) pools.push(upperChars);
  if (lower) pools.push(lowerChars);
  if (digits) pools.push(digitChars);
  if (symbols) pools.push(symbolChars);
  if (pools.length === 0) pools.push(lowerChars, digitChars);

  const charset = pools.join('');
  const safeLength = Math.max(8, Math.min(64, Number.isFinite(length) ? Math.floor(length) : 20));
  const randomIndex = maxExclusive => {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const value = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(value);
    } while (value[0] >= limit);
    return value[0] % maxExclusive;
  };

  const resultChars = pools.slice(0, safeLength).map(pool => pool[randomIndex(pool.length)]);
  while (resultChars.length < safeLength) resultChars.push(charset[randomIndex(charset.length)]);
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [resultChars[i], resultChars[j]] = [resultChars[j], resultChars[i]];
  }
  return resultChars.join('');
}

if (analyzerToggleOptionsBtn) {
  analyzerToggleOptionsBtn.addEventListener('click', () => {
    const isHidden = analyzerGenOptions.style.display === 'none';
    analyzerGenOptions.style.display = isHidden ? 'flex' : 'none';
  });
}

if (analyzerGenLength) {
  analyzerGenLength.addEventListener('input', (e) => {
    if (analyzerGenLengthVal) analyzerGenLengthVal.textContent = e.target.value;
  });
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

  const commonList = [
    'password', '123456', '12345678', 'qwerty', 'admin', 'welcome', 'letmein',
    'football', 'monkey', 'iloveyou', 'starwars', 'dragon', 'login', 'princess'
  ];
  const isCommon = commonList.includes(pwd.toLowerCase()) || /^(.)\1+$/.test(pwd);
  commonBanner.style.display = isCommon ? 'flex' : 'none';

  // Advice
  const advice = [];
  if (pwd.length < 12) advice.push('Increase length to at least 14–16 characters.');
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

  // Label & colors
  const entropyLabel = `${entropy.toFixed(1)} bits entropy`;
  if (score >= 11 && !isCommon) {
    strengthTag.textContent = 'Strong';
    strengthTag.style.color = 'var(--strong)';
    strengthFill.style.backgroundColor = 'var(--strong)';
    confidenceBadge.textContent = `High Security (${entropyLabel})`;
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
  const length = analyzerGenLength ? parseInt(analyzerGenLength.value, 10) : 20;
  const options = {
    length: length || 20,
    upper: analyzerOptUpper ? analyzerOptUpper.checked : true,
    lower: analyzerOptLower ? analyzerOptLower.checked : true,
    digits: analyzerOptDigits ? analyzerOptDigits.checked : true,
    symbols: analyzerOptSymbols ? analyzerOptSymbols.checked : true,
    avoidAmbiguous: analyzerOptAvoidAmbiguous ? analyzerOptAvoidAmbiguous.checked : false
  };
  const generated = generateConfigurablePassword(options);
  analyzerPasswordInput.value = generated;
  analyzePassword(generated);
});

analyzerCopyBtn.addEventListener('click', async () => {
  const pwd = analyzerPasswordInput.value;
  if (!pwd) return;
  await copySensitiveWithTracker(pwd, 'Copied to clipboard! (Auto-clears in 30s)');
  analyzerCopyIcon.style.display = 'none';
  analyzerCheckIcon.style.display = 'block';
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        signal: controller.signal,
        headers: { 'Add-Padding': 'true' }
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Breach service returned HTTP ${response.status}.`);
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
    showToast('Could not reach breach database. Check your network connection.');
  } finally {
    breachBtn.disabled = false;
    breachBtn.querySelector('span').textContent = 'Check known breaches (k-anonymity)';
  }
});

// -------------------------------------------------------------
// 8. SETTINGS & BACKUPS
// -------------------------------------------------------------
if (autoLockSelect) {
  autoLockSelect.addEventListener('change', async () => {
    const mins = parseInt(autoLockSelect.value, 10);
    state.autoLockMinutes = isNaN(mins) ? 15 : mins;
    const result = await window.securePassAPI.setAutoLock(state.autoLockMinutes);
    if (result.error) { showToast(result.error); return; }
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

function openBackupImportModal(content, isEncrypted) {
  pendingBackupData = { content, isEncrypted };

  if (backupImportErrorBanner) backupImportErrorBanner.style.display = 'none';
  if (backupImportErrorText) backupImportErrorText.textContent = '';
  if (backupMergeMode) backupMergeMode.value = 'merge';

  if (isEncrypted) {
    if (backupPasswordGroup) backupPasswordGroup.style.display = 'block';
    if (backupPasswordInput) {
      backupPasswordInput.value = '';
      backupPasswordInput.type = 'password';
      backupPasswordInput.required = true;
    }
    if (backupEyeOpen) backupEyeOpen.style.display = 'block';
    if (backupEyeClosed) backupEyeClosed.style.display = 'none';
    if (backupImportModal) backupImportModal.style.display = 'flex';
    if (backupPasswordInput) backupPasswordInput.focus();
  } else {
    if (backupPasswordGroup) backupPasswordGroup.style.display = 'none';
    if (backupPasswordInput) {
      backupPasswordInput.value = '';
      backupPasswordInput.required = false;
    }
    if (backupImportModal) backupImportModal.style.display = 'flex';
    if (backupMergeMode) backupMergeMode.focus();
  }
}

function closeBackupImportModal() {
  if (backupImportModal) backupImportModal.style.display = 'none';
  if (backupImportErrorBanner) backupImportErrorBanner.style.display = 'none';
  if (backupImportErrorText) backupImportErrorText.textContent = '';
  if (backupPasswordInput) backupPasswordInput.value = '';
  pendingBackupData = null;
}

function showBackupImportError(msg) {
  if (backupImportErrorText) backupImportErrorText.textContent = msg;
  if (backupImportErrorBanner) backupImportErrorBanner.style.display = 'flex';
  showToast(msg);
}

if (closeBackupImportModalBtn) closeBackupImportModalBtn.addEventListener('click', closeBackupImportModal);
if (cancelBackupImportBtn) cancelBackupImportBtn.addEventListener('click', closeBackupImportModal);

if (toggleBackupPasswordEye) {
  toggleBackupPasswordEye.addEventListener('click', () => {
    if (!backupPasswordInput) return;
    const isPass = backupPasswordInput.type === 'password';
    backupPasswordInput.type = isPass ? 'text' : 'password';
    if (backupEyeOpen) backupEyeOpen.style.display = isPass ? 'none' : 'block';
    if (backupEyeClosed) backupEyeClosed.style.display = isPass ? 'block' : 'none';
  });
}

if (backupImportForm) {
  backupImportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pendingBackupData) {
      closeBackupImportModal();
      return;
    }

    if (backupImportErrorBanner) backupImportErrorBanner.style.display = 'none';
    const mergeMode = backupMergeMode ? backupMergeMode.value : 'merge';
    const { content, isEncrypted } = pendingBackupData;

    try {
      if (isEncrypted) {
        const password = backupPasswordInput ? backupPasswordInput.value : '';
        if (!password) {
          showBackupImportError('Backup master password is required.');
          return;
        }
        const res = await window.securePassAPI.vaultImportEncryptedBackup(content, password, mergeMode);
        if (res && res.error) {
          showBackupImportError(res.error);
          return;
        }
        closeBackupImportModal();
        await refreshVaultItems();
        showToast(`Successfully imported ${res.count} items from encrypted backup!`);
      } else {
        const res = await window.securePassAPI.vaultImportBackup(content, mergeMode);
        if (res && res.error) {
          showBackupImportError(res.error);
          return;
        }
        closeBackupImportModal();
        await refreshVaultItems();
        showToast(`Successfully imported ${res.count} items!`);
      }
    } catch (err) {
      showBackupImportError(err.message || 'Import failed.');
    }
  });
}

if (importBackupBtn) {
  importBackupBtn.addEventListener('click', () => {
    if (backupFileInput) backupFileInput.click();
  });
}

if (backupFileInput) {
  backupFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        const parsed = JSON.parse(content);

        const isEncrypted = Boolean(parsed && parsed.salt && parsed.iv && parsed.tag && parsed.data);
        const isPlaintext = Boolean(parsed && Array.isArray(parsed.items));

        if (!isEncrypted && !isPlaintext) {
          showToast('Invalid backup file: format not recognized.');
          return;
        }

        openBackupImportModal(content, isEncrypted);
      } catch (err) {
        showToast('Invalid backup JSON file.');
      } finally {
        backupFileInput.value = '';
      }
    };
    reader.readAsText(file);
  });
}

// Change Master Password Form
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

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

// Helper: Escape HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

function getSafeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch (_error) {
    return null;
  }
}

function getSafeAutofillUrl(value) {
  const url = getSafeExternalUrl(value);
  return url && new URL(url).protocol === 'https:' ? url : null;
}

// Start application
initApp();
