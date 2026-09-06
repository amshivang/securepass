/**
 * SecurePass Analyzer Engine - Pure Mathematical & Cryptographic Logic
 * Headless module compatible with Node.js test runners and browser scripts.
 */

function calculateShannonEntropy(str) {
  if (!str) return 0;
  const len = str.length;
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function evaluatePasswordScore(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score += 2;
  if (pwd.length >= 12) score += 3;
  if (pwd.length >= 16) score += 2;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/[A-Z]/.test(pwd)) score += 2;
  if (/[0-9]/.test(pwd)) score += 2;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 3;
  return Math.min(15, score);
}

function estimateCrackTime(pwd) {
  if (!pwd) return 'Instant';
  const len = pwd.length;
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 33;
  if (pool === 0) pool = 1;

  const combinations = Math.pow(pool, len);
  const guessesPerSec = 1e11; // 100 billion/sec (hashcat cluster)
  const seconds = combinations / (2 * guessesPerSec);

  if (seconds < 1) return 'Instant (< 1 sec)';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 315360000000) return `${Math.round(seconds / 3153600000)} centuries`;
  return 'Trillions of years';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateShannonEntropy,
    evaluatePasswordScore,
    estimateCrackTime
  };
}
if (typeof window !== 'undefined') {
  window.calculateShannonEntropy = calculateShannonEntropy;
  window.evaluatePasswordScore = evaluatePasswordScore;
  window.estimateCrackTime = estimateCrackTime;
}
