const assert = require('assert');
const vm = require('vm');
const { getSafeWebUrl, buildAutofillScript } = require('../autofill');

function runAutofillInMockDom({ origin = 'https://login.example.com', formAction = '/submit', clobberAction = false, item }) {
  const createdValues = new Map();
  class MockElement {
    constructor(opts = {}) {
      this.tagName = opts.tagName || 'INPUT';
      this.type = opts.type || 'text';
      this.id = opts.id || '';
      this.name = opts.name || '';
      this.autocomplete = opts.autocomplete || '';
      this.placeholder = opts.placeholder || '';
      this.disabled = false;
      this.readOnly = false;
      this.form = opts.form || null;
      this.labels = opts.label ? [{ textContent: opts.label }] : [];
      this._ariaLabel = opts.ariaLabel || null;
      this._value = opts.value || '';
      this.dispatched = [];
    }
    getAttribute(attr) {
      if (attr === 'aria-label') return this._ariaLabel;
      return null;
    }
    matches() { return false; }
    getClientRects() { return [{ width: 100, height: 24 }]; }
    compareDocumentPosition() { return 4; }
    dispatchEvent(ev) { this.dispatched.push(ev.type); }
  }

  class MockForm {
    constructor(actionAttr, clobbered) {
      this._actionAttr = actionAttr;
      if (clobbered) this.action = new MockElement({ name: 'action', type: 'hidden' });
    }
  }
  MockForm.prototype.getAttribute = function (attr) {
    return attr === 'action' ? this._actionAttr : null;
  };

  const form = new MockForm(formAction, clobberAction);
  const emailInput = new MockElement({ type: 'email', name: 'email', autocomplete: 'username', form, label: 'Email' });
  const passInput = new MockElement({ type: 'password', autocomplete: 'current-password', form, label: 'Password' });
  const customInput = new MockElement({ type: 'text', name: 'employee_id', form, label: 'Employee ID' });
  const allInputs = [emailInput, passInput, customInput];

  const inputValueDesc = {
    get() { return this._value; },
    set(v) { this._value = String(v); createdValues.set(this.name || this.type, this._value); }
  };
  Object.defineProperty(MockElement.prototype, 'value', inputValueDesc);

  const script = buildAutofillScript(item, origin);
  const ctx = {
    location: { origin, href: `${origin}/login` },
    URL,
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    HTMLInputElement: { prototype: { get value() {}, set value(v) { this._value = String(v); } } },
    HTMLTextAreaElement: { prototype: { get value() {}, set value(v) { this._value = String(v); } } },
    Event: function (type, opts) { this.type = type; Object.assign(this, opts); },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    document: {
      querySelectorAll: (sel) => (sel === 'input, textarea' ? allInputs : [])
    }
  };
  Object.defineProperty(ctx.HTMLInputElement.prototype, 'value', inputValueDesc);
  ctx.HTMLFormElement = MockForm;
  const result = vm.runInNewContext(script, ctx);
  return { result, emailInput, passInput, customInput };
}

assert.strictEqual(getSafeWebUrl('javascript:alert(1)'), null);
assert.strictEqual(getSafeWebUrl('http://user:pass@example.com'), null);
assert.strictEqual(getSafeWebUrl('https://example.com/auth'), 'https://example.com/auth');

// Regression: form with <input name="action"> DOM-clobbering must still read form attribute action safely
const clobberedSameOrigin = runAutofillInMockDom({
  origin: 'https://login.example.com',
  formAction: '/session',
  clobberAction: true,
  item: {
    username: 'alice@example.com',
    password: 'SecretPassword123!',
    customFields: [
      { name: '', value: 'ignored-empty-name' },
      { name: 'Employee ID', value: 'EMP-9' }
    ]
  }
});
assert.strictEqual(clobberedSameOrigin.result.filled, 3);
assert.strictEqual(clobberedSameOrigin.emailInput.value, 'alice@example.com');
assert.strictEqual(clobberedSameOrigin.passInput.value, 'SecretPassword123!');
assert.strictEqual(clobberedSameOrigin.customInput.value, 'EMP-9');

// Cross-origin form action must block filling even when page URL matches expectedOrigin
const crossOriginBlocked = runAutofillInMockDom({
  origin: 'https://login.example.com',
  formAction: 'https://evil.example.net/steal',
  clobberAction: true,
  item: { username: 'alice@example.com', password: 'SecretPassword123!' }
});
assert.strictEqual(crossOriginBlocked.result.filled, 0);
assert.strictEqual(crossOriginBlocked.emailInput.value, '');

console.log('✓ All autofill unit and DOM-clobbering tests passed.');
