const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { CryptoVault, base32Decode, generateTOTP } = require('../crypto-vault');

console.log('Testing RFC 6238 TOTP Engine & Base32 Decoder...');

// =============================================================
// Test Suite 1: RFC 6238 Standard Test Vectors
// Secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' (ASCII '12345678901234567890')
// =============================================================
console.log('  1. Testing RFC 6238 reference vectors...');
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

const testVectors = [
  { timestamp: 59000, expectedCode: '287082', expectedRemaining: 1 },
  { timestamp: 1111111109000, expectedCode: '081804', expectedRemaining: 1 },
  { timestamp: 1111111111000, expectedCode: '050471', expectedRemaining: 29 },
  { timestamp: 1234567890000, expectedCode: '005924', expectedRemaining: 30 },
  { timestamp: 2000000000000, expectedCode: '279037', expectedRemaining: 10 }
];

for (const { timestamp, expectedCode, expectedRemaining } of testVectors) {
  const result = generateTOTP(RFC_SECRET, timestamp);
  assert.ok(result, `generateTOTP returned falsy result for timestamp ${timestamp}`);
  assert.strictEqual(
    result.code,
    expectedCode,
    `TOTP at timestamp ${timestamp} should be ${expectedCode}, got ${result.code}`
  );
  assert.strictEqual(
    result.remainingSeconds,
    expectedRemaining,
    `Remaining seconds at timestamp ${timestamp} should be ${expectedRemaining}, got ${result.remainingSeconds}`
  );
}

// =============================================================
// Test Suite 2: Secret Formatting Resilience
// (lowercase, spaces, hyphens, padding '=')
// =============================================================
console.log('  2. Testing secret formatting resilience (spaces, hyphens, lowercase, padding)...');

const formattingVariations = [
  { name: 'lowercase', secret: 'gezdgnbvgy3tqojqgezdgnbvgy3tqojq' },
  { name: 'spaces', secret: 'GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ' },
  { name: 'hyphens', secret: 'GEZD-GNBV-GY3T-QOJQ-GEZD-GNBV-GY3T-QOJQ' },
  { name: 'padding', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ====' },
  { name: 'mixed', secret: '  gezd-gnbv gy3t-qojq gezd-gnbv gy3t-qojq=  ' }
];

for (const { name, secret } of formattingVariations) {
  const result = generateTOTP(secret, 59000);
  assert.ok(result, `Failed to generate TOTP for format variation: ${name}`);
  assert.strictEqual(
    result.code,
    '287082',
    `Format variation '${name}' failed: expected '287082', got '${result.code}'`
  );
}

// =============================================================
// Test Suite 3: Base32 Decoding & Error Handling
// =============================================================
console.log('  3. Testing Base32 decoding and error handling...');

// Empty / falsy inputs
assert.strictEqual(generateTOTP(''), null, 'Empty string secret should return null');
assert.strictEqual(generateTOTP(null), null, 'null secret should return null');
assert.strictEqual(generateTOTP(undefined), null, 'undefined secret should return null');
assert.strictEqual(base32Decode('').length, 0, 'Empty string should decode to empty buffer');
assert.strictEqual(base32Decode(null).length, 0, 'null should decode to empty buffer');

// Decodes RFC 4648 and RFC 6238 test vectors correctly
assert.strictEqual(
  base32Decode('MZXW6YTBOI======').toString('utf8'),
  'foobar',
  'Base32 MZXW6YTBOI====== should decode to "foobar"'
);
assert.strictEqual(
  base32Decode(RFC_SECRET).toString('utf8'),
  '12345678901234567890',
  'Base32 RFC_SECRET should decode to ASCII "12345678901234567890"'
);

// Invalid Base32 characters throw errors (e.g., characters 0, 1, 8, 9, special chars)
const invalidSecrets = [
  'INVALID89!',
  '1234567890',
  'GEZD!NBV'
];

for (const invalid of invalidSecrets) {
  assert.throws(
    () => base32Decode(invalid),
    /Invalid Base32 character/,
    `Expected invalid Base32 error for '${invalid}'`
  );
  assert.throws(
    () => generateTOTP(invalid),
    /Invalid Base32 character/,
    `Expected generateTOTP to throw on invalid secret '${invalid}'`
  );
}

// =============================================================
// Test Suite 4: CryptoVault Integration with TOTP
// =============================================================
console.log('  4. Testing CryptoVault TOTP methods and vault item storage...');

// Static & instance method tests
assert.strictEqual(
  CryptoVault.generateTOTP(RFC_SECRET, 59000).code,
  '287082',
  'CryptoVault.generateTOTP static method failed'
);

const testVaultPath = path.join(os.tmpdir(), `securepass-totp-test-${Date.now()}.enc`);
const vault = new CryptoVault(testVaultPath);

try {
  vault.initialize('MasterTestPassword123!');

  assert.strictEqual(
    vault.generateTOTP(RFC_SECRET, 59000).code,
    '287082',
    'vault.generateTOTP instance method failed'
  );

  // addItem with totpSecret
  const itemWithTotp = vault.addItem({
    title: 'GitHub',
    username: 'octocat',
    password: 'SuperSecretPassword!',
    totpSecret: '  JBSWY3DPEHPK3PXP  '
  });

  assert.strictEqual(
    itemWithTotp.totpSecret,
    'JBSWY3DPEHPK3PXP',
    'totpSecret should be trimmed on addItem'
  );

  // addItem without totpSecret defaults to empty string
  const itemWithoutTotp = vault.addItem({
    title: 'Google',
    username: 'test@example.com',
    password: 'AnotherSecretPassword!'
  });

  assert.strictEqual(
    itemWithoutTotp.totpSecret,
    '',
    'totpSecret should default to empty string when not provided'
  );

  // updateItem updates totpSecret
  const updatedItem = vault.updateItem(itemWithoutTotp.id, {
    totpSecret: ' GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ '
  });

  assert.strictEqual(
    updatedItem.totpSecret,
    'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
    'updateItem should trim and update totpSecret'
  );

  // updateItem preserves totpSecret when other fields updated
  const updatedOther = vault.updateItem(updatedItem.id, {
    title: 'Google Personal'
  });

  assert.strictEqual(
    updatedOther.title,
    'Google Personal',
    'title should be updated'
  );
  assert.strictEqual(
    updatedOther.totpSecret,
    'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
    'totpSecret should be preserved when updating other fields'
  );

  // Lock and unlock vault, verify persistence
  vault.lock();
  vault.unlock('MasterTestPassword123!');
  const items = vault.getItems();
  const fetched = items.find(i => i.id === updatedItem.id);
  assert.ok(fetched, 'Item should exist in unlocked vault');
  assert.strictEqual(
    fetched.totpSecret,
    'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
    'totpSecret should persist across vault lock/unlock cycle'
  );

} finally {
  vault.lock();
  if (fs.existsSync(testVaultPath)) {
    fs.unlinkSync(testVaultPath);
  }
}

console.log('✓ All TOTP and Base32 unit tests passed successfully.');
