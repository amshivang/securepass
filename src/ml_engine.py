import re
import os
from typing import Any, Optional

import numpy as np
import joblib

import features as feat


class PasswordAgent:
    """
    Password security agent backed by a trained RandomForestClassifier.
    Falls back to a heuristic scorer if the model file is not found.
    """

    MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'Data', 'model.pkl')
    GUESSES_PER_SECOND = 100_000_000_000  # 100 billion (high-end GPU rig)

    FEATURE_NAMES = feat.FEATURE_NAMES

    def __init__(self):
        self._model = None
        self._load_model()

    def _load_model(self):
        try:
            model = joblib.load(self.MODEL_PATH)
            if hasattr(model, 'n_features_in_') and model.n_features_in_ != len(self.FEATURE_NAMES):
                print(f"[ML] Model feature mismatch (expected {len(self.FEATURE_NAMES)}, got {model.n_features_in_}). Retraining...")
                import train_model
                train_model.main()
                model = joblib.load(self.MODEL_PATH)
            self._model = model
            print(f"[ML] RandomForest model loaded from {self.MODEL_PATH}")
        except Exception as e:
            print(f"[ML] Model not found or invalid, using heuristic fallback. ({e})")
            self._model = None

    @property
    def model_name(self) -> str:
        return "RandomForest (scikit-learn)" if self._model else "Heuristic"

    # ── Feature Engineering ──────────────────────────────────────────────────

    def extract_features(self, password: str) -> dict[str, Any]:
        """Return a labelled feature dict — used by both model and advice engine."""
        return feat.extract_features(password)

    def _features_to_array(self, password: str):
        return np.array([feat.features_to_vector(password)])

    # ── Prediction ───────────────────────────────────────────────────────────

    def predict_strength(self, password: str) -> tuple[str, float, float]:
        """
        Returns (label, raw_score_0_to_15, confidence_0_to_1).
        Uses the RandomForest model when available, heuristic otherwise.
        """
        if self._model is not None:
            try:
                X       = self._features_to_array(password)
                idx     = self._model.predict(X)[0]           # 0/1/2
                proba   = self._model.predict_proba(X)[0]     # per-class probability
                labels  = ['Weak', 'Medium', 'Strong']
                label   = labels[idx]
                conf    = float(proba[idx])
                # Map confidence to a score bucket: Weak≤4, Medium 4–9, Strong 9–15
                buckets = {'Weak': conf * 4, 'Medium': 4 + conf * 5, 'Strong': 9 + conf * 6}
                return label, round(buckets[label], 2), round(conf, 3)
            except Exception as e:
                print(f"[ML] Inference failed ({e}), using heuristic fallback.")
                return self._heuristic_predict(password)
        else:
            return self._heuristic_predict(password)

    def _heuristic_predict(self, password: str) -> tuple[str, float, float]:
        f = self.extract_features(password)
        norm_length = min(f['length'], 20) / 20
        complexity  = (f['has_upper'] + f['has_lower'] + f['has_digit'] + f['has_symbol']) / 4
        score = (norm_length * 8) + (complexity * 7)
        if f['has_keyboard_walk'] or f['has_sequential_run'] or f['max_repeat_ratio'] >= 0.5:
            score = min(score, 4.9)  # cap: structural patterns are always weak
        if score < 5:
            return 'Weak',   round(score, 2), round(score / 5,  3)
        elif score < 9:
            return 'Medium', round(score, 2), round((score - 5) / 4, 3)
        else:
            return 'Strong', round(score, 2), round(min((score - 9) / 6, 1.0), 3)

    def get_score_percentage(self, score: float) -> int:
        return min(int(score / 15 * 100), 100)

    # ── Crack Time ───────────────────────────────────────────────────────────

    def estimate_crack_time(self, password: str, is_common: bool = False) -> str:
        """
        Estimate brute-force crack time. If the password is a known/leaked
        password or built from an obvious structural pattern (keyboard walk,
        sequential run), a real attacker would use a dictionary/pattern
        attack rather than pure brute force — so we report that instead of
        a misleadingly large brute-force figure.
        """
        if not password:
            return 'Instantly'

        if is_common:
            return 'Instantly (known/leaked password)'

        f = self.extract_features(password)
        if f['has_keyboard_walk'] or f['has_sequential_run']:
            return 'Seconds (predictable pattern)'

        pool = 0
        if any(c.islower()     for c in password): pool += 26
        if any(c.isupper()     for c in password): pool += 26
        if any(c.isdigit()     for c in password): pool += 10
        if any(not c.isalnum() for c in password): pool += 32
        if pool == 0:
            return 'Instantly'

        seconds = (pool ** len(password)) / self.GUESSES_PER_SECOND
        if   seconds < 1:          return 'Instantly'
        elif seconds < 60:         return f'{seconds:.1f} seconds'
        elif seconds < 3_600:      return f'{seconds/60:.1f} minutes'
        elif seconds < 86_400:     return f'{seconds/3600:.2f} hours'
        elif seconds < 31_536_000: return f'{seconds/86400:.2f} days'
        else:
            years = seconds / 31_536_000
            return 'Heat death of the universe' if years > 1e15 else f'{years:,.2f} years'

    # ── Advice ───────────────────────────────────────────────────────────────

    def get_rational_advice(self, password: str) -> list[str]:
        f    = self.extract_features(password)
        tips = []
        if f['length'] < 12:
            tips.append('Increase length to at least 12 characters to expand the search space.')
        if not f['has_upper']:
            tips.append('Add uppercase letters (A–Z) to increase character variety.')
        if not f['has_lower']:
            tips.append('Add lowercase letters (a–z) for better base complexity.')
        if not f['has_digit']:
            tips.append('Include numbers (0–9) to boost entropy.')
        if not f['has_symbol']:
            tips.append('Add special characters (!@#$%^&*) for maximum entropy.')
        if f['entropy'] < 2.5 and f['length'] >= 8:
            tips.append('Your password has low randomness — avoid repeated or predictable characters.')
        if f['has_sequential_run'] or re.search(
            r'(012|123|234|345|456|567|678|789|abc|bcd|cde|def)', password.lower()
        ):
            tips.append('Avoid sequential patterns like "123" or "abc" — easy to brute-force.')
        if f['has_keyboard_walk']:
            tips.append('Avoid keyboard walks like "qwerty" or "asdfgh" — one of the first things attackers try.')
        if f['max_repeat_ratio'] >= 0.4 and f['length'] >= 4:
            tips.append('Avoid repeating the same character many times in a row.')
        return tips

    # ── Full Analysis ────────────────────────────────────────────────────────

    def analyze(self, password: str, blacklist: Optional[set[str]] = None) -> dict[str, Any]:
        is_common  = bool(blacklist and password.lower() in blacklist)
        label, score, confidence = self.predict_strength(password)
        percentage = self.get_score_percentage(score)
        advice     = self.get_rational_advice(password)
        crack_time = self.estimate_crack_time(password, is_common=is_common)
        features   = self.extract_features(password)

        return {
            'is_common':  is_common,
            'label':      label,
            'score':      score,
            'confidence': round(confidence * 100, 1),   # as %
            'percentage': percentage,
            'crack_time': crack_time,
            'advice':     advice,
            'model_used': self.model_name,
            'features':   {k: round(v, 4) if isinstance(v, float) else v
                           for k, v in features.items()},
        }
