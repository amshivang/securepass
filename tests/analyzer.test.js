const assert = require('assert');
const {
  calculateShannonEntropy,
  evaluatePasswordScore,
  estimateCrackTime
} = require('../renderer/analyzer-engine');

// =============================================================
// Test Suite: Shannon Entropy Calculation
// =============================================================
console.log('Testing calculateShannonEntropy...');

// Empty or falsy input returns 0
assert.strictEqual(calculateShannonEntropy(''), 0, 'Empty string should return 0 entropy');
assert.strictEqual(calculateShannonEntropy(null), 0, 'null should return 0 entropy');
assert.strictEqual(calculateShannonEntropy(undefined), 0, 'undefined should return 0 entropy');

// Repeated single character has zero information entropy
assert.strictEqual(calculateShannonEntropy('aaaaa'), 0, 'Repeated single character string should return 0 entropy');
assert.strictEqual(calculateShannonEntropy('11111111'), 0, 'Repeated digits should return 0 entropy');

// Uniform distribution of 8 distinct characters = log2(8) = 3.0 bits
const entropy8 = calculateShannonEntropy('abcdefgh');
assert.ok(
  Math.abs(entropy8 - 3.0) < 1e-6,
  `'abcdefgh' should return exactly 3.0 entropy, got ${entropy8}`
);

// Uniform distribution of 2 characters = log2(2) = 1.0 bit
const entropy2 = calculateShannonEntropy('abababab');
assert.ok(
  Math.abs(entropy2 - 1.0) < 1e-6,
  `'abababab' should return exactly 1.0 entropy, got ${entropy2}`
);

// High diversity string (16 distinct mixed characters) = log2(16) = 4.0 bits > 3.5
const highDiversityEntropy = calculateShannonEntropy('aB1!cD2@eE3#fF4$');
assert.ok(
  highDiversityEntropy > 3.5,
  `High diversity string should have entropy > 3.5, got ${highDiversityEntropy}`
);

// Complex realistic password has high entropy > 3.5
const realisticEntropy = calculateShannonEntropy('P@ssw0rd!2026_Secure#Pass');
assert.ok(
  realisticEntropy > 3.5,
  `Complex realistic password should have entropy > 3.5, got ${realisticEntropy}`
);

// =============================================================
// Test Suite: Password Scoring Engine
// =============================================================
console.log('Testing evaluatePasswordScore...');

// Empty / falsy input returns 0
assert.strictEqual(evaluatePasswordScore(''), 0, 'Empty password should score 0');
assert.strictEqual(evaluatePasswordScore(null), 0, 'null password should score 0');
assert.strictEqual(evaluatePasswordScore(undefined), 0, 'undefined password should score 0');

// Short weak passwords score <= 2
const shortScore = evaluatePasswordScore('short');
assert.ok(
  shortScore <= 2,
  `'short' should return score <= 2, got ${shortScore}`
);
assert.strictEqual(evaluatePasswordScore('123'), 2, `'123' has only digits, length < 8 -> score 2`);
assert.strictEqual(evaluatePasswordScore('abc'), 1, `'abc' has only lowercase, length < 8 -> score 1`);

// Character class weights
// lowercase (+1), uppercase (+2), numbers (+2), special symbols (+3)
assert.strictEqual(evaluatePasswordScore('aA1!'), 1 + 2 + 2 + 3, 'Length < 8 with all 4 classes should score 8');

// Length tier testing
// 8 chars lowercase: length >= 8 (+2) + lowercase (+1) = 3
assert.strictEqual(evaluatePasswordScore('abcdefgh'), 3);

// 12 chars lowercase: length >= 8 (+2) + length >= 12 (+3) + lowercase (+1) = 6
assert.strictEqual(evaluatePasswordScore('abcdefghijkl'), 6);

// 16 chars lowercase: length >= 8 (+2) + length >= 12 (+3) + length >= 16 (+2) + lowercase (+1) = 8
assert.strictEqual(evaluatePasswordScore('abcdefghijklmnop'), 8);

// Complex 18+ character password returns maximum score 15
const complex18 = 'K8#mQ9$vL2!xP5@zW1'; // 18 chars, lowercase, uppercase, digits, symbols
assert.strictEqual(
  evaluatePasswordScore(complex18),
  15,
  `Complex 18+ char password should achieve maximum score 15, got ${evaluatePasswordScore(complex18)}`
);

// Score is capped at 15
const superComplex30 = 'A1!b2@C3#d4$E5%F6^G7&H8*I9(J0)';
assert.strictEqual(
  evaluatePasswordScore(superComplex30),
  15,
  'Score must never exceed 15'
);

// =============================================================
// Test Suite: Crack Time Estimation
// =============================================================
console.log('Testing estimateCrackTime...');

// Empty or falsy input returns 'Instant'
assert.strictEqual(estimateCrackTime(''), 'Instant', 'Empty string should return Instant');
assert.strictEqual(estimateCrackTime(null), 'Instant', 'null should return Instant');
assert.strictEqual(estimateCrackTime(undefined), 'Instant', 'undefined should return Instant');

// Short weak numbers: 10^6 combinations / 2e11 guesses/sec < 1 sec
assert.strictEqual(
  estimateCrackTime('123456'),
  'Instant (< 1 sec)',
  `'123456' should return 'Instant (< 1 sec)', got ${estimateCrackTime('123456')}`
);
assert.strictEqual(estimateCrackTime('abc'), 'Instant (< 1 sec)');

// 8 lowercase letters: 26^8 / 2e11 = 208,827,064,576 / 200,000,000,000 ≈ 1.04 sec -> '1 seconds'
assert.strictEqual(estimateCrackTime('abcdefgh'), '1 seconds');

// Medium password yields human-scale units
const mediumAlpha = 'abcdefghij'; // 26^10 / 2e11 ≈ 705 sec -> 12 minutes
assert.strictEqual(estimateCrackTime(mediumAlpha), '12 minutes');

// Complex 20-character password returns 'Trillions of years'
const complex20 = 'K8#mQ9$vL2!xP5@zW1!@';
assert.strictEqual(
  estimateCrackTime(complex20),
  'Trillions of years',
  `Complex 20-char password should return 'Trillions of years', got ${estimateCrackTime(complex20)}`
);

console.log('✓ All Password Analyzer unit tests passed.');
