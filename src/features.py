"""
Shared password feature-extraction utilities.

Used by both `train_model.py` (to build the training dataset and the
ground-truth heuristic labels) and `ml_engine.py` (at inference time), so
the two never drift out of sync with each other.
"""

import math
from typing import Any

# Order matters: this is the exact column order fed into the model.
FEATURE_NAMES = [
    'length', 'has_upper', 'has_lower', 'has_digit', 'has_symbol',
    'entropy', 'unique_ratio', 'total_entropy', 'max_repeat_ratio',
    'has_keyboard_walk', 'has_sequential_run',
]

# Contiguous rows/columns on a standard QWERTY keyboard (lowercased).
_KEYBOARD_ROWS = [
    "1234567890",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
]


def shannon_entropy(password: str) -> float:
    """Shannon entropy in bits per character (average, not total)."""
    if not password:
        return 0.0
    freq: dict[str, int] = {}
    for c in password:
        freq[c] = freq.get(c, 0) + 1
    n = len(password)
    return -sum((cnt / n) * math.log2(cnt / n) for cnt in freq.values())


def has_keyboard_walk(password: str, min_len: int = 4) -> bool:
    """True if the password contains a contiguous keyboard-row walk
    (e.g. 'qwerty', 'asdfgh', '13579' is not one, but '1234' is)."""
    s = password.lower()
    if len(s) < min_len:
        return False
    for row in _KEYBOARD_ROWS:
        row_rev = row[::-1]
        for i in range(len(s) - min_len + 1):
            chunk = s[i:i + min_len]
            if chunk in row or chunk in row_rev:
                return True
    return False


def has_sequential_run(password: str, min_len: int = 4) -> bool:
    """True if the password contains an ascending or descending run of
    consecutive character codes of at least `min_len` (e.g. 'abcd', '4321')."""
    s = password.lower()
    n = len(s)
    if n < min_len:
        return False
    asc = desc = 1
    for i in range(1, n):
        delta = ord(s[i]) - ord(s[i - 1])
        asc = asc + 1 if delta == 1 else 1
        desc = desc + 1 if delta == -1 else 1
        if asc >= min_len or desc >= min_len:
            return True
    return False


def max_repeat_ratio(password: str) -> float:
    """Length of the longest run of an identical repeated character,
    normalised by password length (e.g. 'aaabbb' -> 3/6 = 0.5)."""
    n = len(password)
    if n == 0:
        return 0.0
    max_run = run = 1
    for i in range(1, n):
        if password[i] == password[i - 1]:
            run += 1
            max_run = max(max_run, run)
        else:
            run = 1
    return max_run / n


def extract_features(password: str) -> dict[str, Any]:
    """Return a labelled feature dict for a password."""
    n = len(password)
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)
    entropy = shannon_entropy(password)
    unique_r = len(set(password)) / n if n > 0 else 0.0

    return {
        'length': n,
        'has_upper': int(has_upper),
        'has_lower': int(has_lower),
        'has_digit': int(has_digit),
        'has_symbol': int(has_symbol),
        'entropy': entropy,
        'unique_ratio': unique_r,
        'total_entropy': entropy * n,
        'max_repeat_ratio': max_repeat_ratio(password),
        'has_keyboard_walk': int(has_keyboard_walk(password)),
        'has_sequential_run': int(has_sequential_run(password)),
    }


def features_to_vector(password: str) -> list[float]:
    """Return the feature dict values as an ordered list matching FEATURE_NAMES."""
    f = extract_features(password)
    return [f[name] for name in FEATURE_NAMES]
