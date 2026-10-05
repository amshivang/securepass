/** Shared URL validation and a self-contained, origin-bound form filler. */
function getSafeWebUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch (_error) {
    return null;
  }
}

// Executed in an isolated world in the remote page. Keep dependencies inside
// this function; credentials never become window properties or URL parameters.
function fillLoginForm(credentials, expectedOrigin) {
  if (location.origin !== expectedOrigin) return { filled: 0, status: 'origin-mismatch' };

  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const visible = element => {
    if (element.disabled || element.readOnly || element.matches(':disabled')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  const collect = root => {
    const inputs = Array.from(root.querySelectorAll('input, textarea'));
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) inputs.push(...collect(element.shadowRoot));
    }
    return inputs;
  };
  const metadata = element => [
    element.id, element.name, element.getAttribute('aria-label'), element.placeholder,
    ...Array.from(element.labels || []).map(label => label.textContent)
  ].filter(Boolean).map(normalize);
  const permittedForm = element => {
    if (!element.form) return true;
    try {
      return new URL(element.form.action || location.href, location.href).origin === expectedOrigin;
    } catch (_error) {
      return false;
    }
  };
  const inputs = collect(document).filter(element => visible(element) && permittedForm(element) &&
    (element.tagName === 'TEXTAREA' || ['text', 'email', 'tel', 'number', 'password'].includes(element.type)));
  const passwords = inputs.filter(element => element.type === 'password' &&
    !/new-password/.test(element.autocomplete) &&
    !metadata(element).some(value => /confirm|repeatpassword|newpassword/.test(value)));
  const password = passwords.find(element => element.autocomplete === 'current-password') ||
    (passwords.length === 1 ? passwords[0] : null);
  const candidates = inputs.filter(element => element.tagName === 'INPUT' && element.type !== 'password' &&
    (!password || !password.form || element.form === password.form));
  const ranked = candidates.map(element => {
    let score = 0;
    if (/username|email/.test(element.autocomplete)) score = 100;
    else if (element.type === 'email') score = 90;
    else if (metadata(element).some(value => /username|email|loginid|identifier|userid|accountname/.test(value))) score = 80;
    else if (password && ['text', 'email'].includes(element.type) &&
      (element.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING)) score = 10;
    return { element, score };
  }).filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score);
  const username = ranked.length && (!ranked[1] || ranked[0].score > ranked[1].score)
    ? ranked[0].element : null;
  let filled = 0;
  let detected = 0;
  const used = new Set();
  const setValue = (element, value) => {
    if (!element || typeof value !== 'string' || !value || used.has(element)) return;
    used.add(element);
    detected++;
    // Retries must never overwrite details the user has already typed.
    if (element.value) return;
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    filled++;
  };
  setValue(username, credentials.username);
  setValue(password, credentials.password);
  for (const field of credentials.customFields || []) {
    const matches = inputs.filter(element => !used.has(element) &&
      !/new-password/.test(element.autocomplete) && metadata(element).includes(normalize(field.name)));
    if (matches.length === 1) setValue(matches[0], field.value);
  }
  return { filled, detected, status: detected ? 'matched' : 'no-fields' };
}

function buildAutofillScript(item, expectedOrigin) {
  const credentials = JSON.stringify({
    username: item.username,
    password: item.password,
    customFields: item.customFields || []
  }).replace(/[<\u2028\u2029]/g, character =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `(${fillLoginForm.toString()})(${credentials}, ${JSON.stringify(expectedOrigin)})`;
}

module.exports = { getSafeWebUrl, buildAutofillScript };
