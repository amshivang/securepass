import random
import string
import os
import sys

# Ensure src/ is importable when run from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

import features as feat


# ── Ground-truth labelling ──────────────────────────────────────────────────

def rule_label(password: str) -> int:
    """Ground-truth label: 0=Weak, 1=Medium, 2=Strong.

    Structural red flags (keyboard walks, sequential runs, heavily repeated
    characters) always force a Weak label, regardless of length or charset
    variety — these are exactly the patterns that make a password *look*
    complex while still being trivial for a dictionary/pattern-based
    attacker to guess. This teaches the classifier to weight those features
    rather than relying purely on length/entropy thresholds.
    """
    f = feat.extract_features(password)
    n = f['length']
    char_types = f['has_upper'] + f['has_lower'] + f['has_digit'] + f['has_symbol']
    entropy = f['entropy']

    if f['has_keyboard_walk'] or f['has_sequential_run'] or f['max_repeat_ratio'] >= 0.5:
        return 0  # Weak

    if n < 6 or (n <= 10 and char_types <= 1) or entropy < 1.8:
        return 0  # Weak
    if n >= 12 and char_types >= 3 and entropy >= 3.2:
        return 2  # Strong
    return 1      # Medium


# ── Synthetic password generators ───────────────────────────────────────────

def gen_weak(n: int) -> list[str]:
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


_DICTIONARY_WORDS = [
    'password', 'letmein', 'welcome', 'monkey', 'dragon', 'sunshine', 'princess',
    'football', 'baseball', 'superman', 'batman', 'trustno1', 'iloveyou', 'shadow',
    'master', 'hunter', 'jennifer', 'jessica', 'michael', 'charlie', 'computer',
    'internet', 'starwars', 'freedom', 'whatever', 'nicole', 'daniel', 'summer',
    'winter', 'ginger', 'peanut', 'cookie', 'buster', 'ranger', 'soccer', 'tigger',
    'hockey', 'flower', 'chicken', 'diamond', 'pepper', 'jordan', 'maggie', 'joshua',
]


def gen_dictionary_weak(n: int) -> list[str]:
    """Plain dictionary-word-based passwords: single character class, short-
    to-medium length. These sit close to the Weak/Medium boundary and need
    enough training density so the classifier doesn't default to 'Medium'
    just because the length looks reasonable."""
    out = []
    for _ in range(n):
        word = random.choice(_DICTIONARY_WORDS)
        variant = random.randint(0, 2)
        if variant == 0:
            out.append(word)
        elif variant == 1:
            out.append(word.capitalize())
        else:
            out.append(word + str(random.randint(0, 99)) if random.random() < 0.3 else word)
    return out


def gen_deceptive_weak(n: int) -> list[str]:
    """Passwords that look complex (long, mixed-case, digits, symbols) but
    are built from keyboard walks, sequential runs, or heavy repetition —
    the kind of password a naive length/charset check would rate 'Strong'."""
    out = []
    kb_walks = ['qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl',
                '1qaz2wsx', 'qazwsx', '1q2w3e4r']
    seq_runs = ['abcdefgh', '12345678', '87654321', 'hgfedcba', '1234567890']
    symbols = '!@#$%^&*'
    for _ in range(n):
        choice = random.randint(0, 3)
        if choice == 0:
            base = random.choice(kb_walks)
            out.append(base.capitalize() + ''.join(random.choices(string.digits, k=random.randint(2, 4)))
                       + random.choice(symbols))
        elif choice == 1:
            base = random.choice(seq_runs)
            out.append(base.capitalize() + random.choice(symbols) * random.randint(1, 2))
        elif choice == 2:
            ch = random.choice(string.ascii_letters)
            out.append(ch * random.randint(8, 14) + random.choice(string.digits) + random.choice(symbols))
        else:
            base = random.choice(kb_walks + seq_runs)
            out.append(base.upper() + base.lower() + str(random.randint(0, 99)))
    return out


def gen_medium(n: int) -> list[str]:
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


def gen_strong(n: int) -> list[str]:
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
    passwords = (
        gen_weak(800)
        + gen_dictionary_weak(400)
        + gen_deceptive_weak(400)
        + gen_medium(1200)
        + gen_strong(1200)
    )
    random.shuffle(passwords)

    X = np.array([feat.features_to_vector(pw) for pw in passwords])
    y = np.array([rule_label(pw)               for pw in passwords])

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
        ("abc",                    "Weak"),
        ("password",               "Weak"),
        ("Qwertyuiop123!",         "Weak"),   # deceptive: keyboard walk
        ("Abcdefgh1234!",          "Weak"),   # deceptive: sequential run
        ("Hello123",               "Medium"),
        ("MyP@ssw0rd!!Secure99",   "Strong"),
    ]
    print("\nSanity checks:")
    for pw, expected in tests:
        vec   = np.array([feat.features_to_vector(pw)])
        pred  = ["Weak", "Medium", "Strong"][clf.predict(vec)[0]]
        proba = clf.predict_proba(vec)[0]
        ok    = "[OK]" if pred == expected else "[X]"
        print(f"  {ok}  {pw!r:30s}  -> {pred:6s}  (confidence {max(proba)*100:.1f}%)")


if __name__ == "__main__":
    main()
