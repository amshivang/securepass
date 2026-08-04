import random
import string
import math
import os
import sys

# Ensure src/ is importable when run from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib


# ── Feature extraction ──────────────────────────────────────────────────────

def shannon_entropy(password: str) -> float:
    if not password:
        return 0.0
    freq: dict = {}
    for c in password:
        freq[c] = freq.get(c, 0) + 1
    entropy = 0.0
    n = len(password)
    for count in freq.values():
        p = count / n
        entropy -= p * math.log2(p)
    return entropy


def extract_features(password: str) -> list:
    """Return a 7-element feature vector."""
    n = len(password)
    has_upper  = int(any(c.isupper() for c in password))
    has_lower  = int(any(c.islower() for c in password))
    has_digit  = int(any(c.isdigit() for c in password))
    has_symbol = int(any(not c.isalnum() for c in password))
    entropy    = shannon_entropy(password)
    unique_r   = len(set(password)) / n if n > 0 else 0.0
    return [n, has_upper, has_lower, has_digit, has_symbol, entropy, unique_r]


def rule_label(password: str) -> int:
    """Ground-truth label: 0=Weak, 1=Medium, 2=Strong."""
    n = len(password)
    has_upper  = any(c.isupper() for c in password)
    has_lower  = any(c.islower() for c in password)
    has_digit  = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)
    entropy    = shannon_entropy(password)
    char_types = sum([has_upper, has_lower, has_digit, has_symbol])

    if n < 6 or (n < 8 and char_types <= 1) or entropy < 1.8:
        return 0  # Weak
    if n >= 12 and char_types >= 3 and entropy >= 3.2:
        return 2  # Strong
    return 1      # Medium


# ── Synthetic password generators ───────────────────────────────────────────

def gen_weak(n: int) -> list:
    out = []
    lc, dg = string.ascii_lowercase, string.digits
    templates = [
        lambda: ''.join(random.choices(lc, k=random.randint(1, 5))),
        lambda: random.choice(lc) * random.randint(3, 7),
        lambda: ''.join(random.choices(dg, k=random.randint(3, 6))),
        lambda: ''.join(str(i) for i in range(random.randint(0, 6), random.randint(6, 10))),
        lambda: random.choice(['pass', 'word', 'test', 'abc', 'user', 'login', 'admin',
                                'root', 'hello', 'qwerty', 'letmein', 'welcome']),
        lambda: ''.join(random.choices(lc, k=random.randint(4, 7))),
    ]
    for _ in range(n):
        out.append(random.choice(templates)())
    return out


def gen_medium(n: int) -> list:
    out = []
    for _ in range(n):
        length = random.randint(8, 11)
        choice = random.randint(0, 4)
        if choice == 0:
            chars = string.ascii_lowercase + string.ascii_uppercase
        elif choice == 1:
            chars = string.ascii_lowercase + string.digits
        elif choice == 2:
            word = ''.join(random.choices(string.ascii_lowercase, k=random.randint(5, 8)))
            nums = ''.join(random.choices(string.digits, k=random.randint(2, 4)))
            out.append(word + nums)
            continue
        elif choice == 3:
            chars = string.ascii_letters + string.digits
        else:
            chars = string.ascii_lowercase + string.digits + '!@#$'
        out.append(''.join(random.choices(chars, k=length)))
    return out


def gen_strong(n: int) -> list:
    out = []
    symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?'
    for _ in range(n):
        length = random.randint(12, 24)
        chars  = string.ascii_letters + string.digits + symbols
        pw     = list(''.join(random.choices(chars, k=length)))
        # Guarantee all 4 character classes
        pw[0] = random.choice(string.ascii_uppercase)
        pw[1] = random.choice(string.ascii_lowercase)
        pw[2] = random.choice(string.digits)
        pw[3] = random.choice(symbols)
        random.shuffle(pw)
        out.append(''.join(pw))
    return out


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("[ 1/4 ] Generating synthetic password dataset...")
    passwords = gen_weak(1200) + gen_medium(1200) + gen_strong(1200)
    random.shuffle(passwords)

    X = np.array([extract_features(pw) for pw in passwords])
    y = np.array([rule_label(pw)       for pw in passwords])

    label_names = {0: "Weak", 1: "Medium", 2: "Strong"}
    for k, v in label_names.items():
        print(f"   {v}: {(y == k).sum()} samples")

    print("[ 2/4 ] Splitting into train / test (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("[ 3/4 ] Training RandomForestClassifier (100 trees)...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=None,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    print("[ 4/4 ] Evaluating and saving model...")
    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["Weak", "Medium", "Strong"]))

    model_path = os.path.join(os.path.dirname(__file__), '..', 'Data', 'model.pkl')
    joblib.dump(clf, model_path)
    print(f"\n[OK] Model saved to: {os.path.abspath(model_path)}")

    # Quick sanity checks
    tests = [
        ("abc",                  "Weak"),
        ("password",             "Weak"),
        ("Hello123",             "Medium"),
        ("MyP@ssw0rd!!Secure99", "Strong"),
    ]
    print("\nSanity checks:")
    for pw, expected in tests:
        feat  = np.array([extract_features(pw)])
        pred  = ["Weak", "Medium", "Strong"][clf.predict(feat)[0]]
        proba = clf.predict_proba(feat)[0]
        ok    = "[OK]" if pred == expected else "[X]"
        print(f"  {ok}  {pw!r:30s}  -> {pred:6s}  (confidence {max(proba)*100:.1f}%)")


if __name__ == "__main__":
    main()
