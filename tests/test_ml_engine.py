import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from ml_engine import PasswordAgent


class TestPasswordAgent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.agent = PasswordAgent()

    def test_predict_strength_returns_valid_label(self):
        label, score, confidence = self.agent.predict_strength("MyP@ssw0rd!!Secure99")
        self.assertIn(label, ("Weak", "Medium", "Strong"))
        self.assertGreaterEqual(score, 0)
        self.assertGreaterEqual(confidence, 0)
        self.assertLessEqual(confidence, 1)

    def test_weak_password_classified_weak(self):
        label, _, _ = self.agent.predict_strength("abc")
        self.assertEqual(label, "Weak")

    def test_strong_password_classified_strong(self):
        label, _, _ = self.agent.predict_strength("MyP@ssw0rd!!Secure99")
        self.assertEqual(label, "Strong")

    def test_deceptive_keyboard_walk_is_weak(self):
        label, _, _ = self.agent.predict_strength("Qwertyuiop123!")
        self.assertEqual(label, "Weak")

    def test_estimate_crack_time_empty(self):
        self.assertEqual(self.agent.estimate_crack_time(""), "Instantly")

    def test_estimate_crack_time_common_password_overridden(self):
        result = self.agent.estimate_crack_time("hunter2", is_common=True)
        self.assertIn("known/leaked", result)

    def test_estimate_crack_time_pattern_overridden(self):
        result = self.agent.estimate_crack_time("abcdefgh1234")
        self.assertIn("pattern", result)

    def test_get_score_percentage_bounds(self):
        self.assertEqual(self.agent.get_score_percentage(0), 0)
        self.assertEqual(self.agent.get_score_percentage(15), 100)
        self.assertEqual(self.agent.get_score_percentage(30), 100)  # clamps at 100

    def test_get_rational_advice_flags_short_password(self):
        advice = self.agent.get_rational_advice("abc")
        self.assertTrue(any("length" in tip.lower() for tip in advice))

    def test_get_rational_advice_flags_keyboard_walk(self):
        advice = self.agent.get_rational_advice("Qwertyuiop123!")
        self.assertTrue(any("keyboard" in tip.lower() for tip in advice))

    def test_get_rational_advice_empty_for_strong_password(self):
        advice = self.agent.get_rational_advice("MyP@ssw0rd!!Secure99")
        self.assertEqual(advice, [])

    def test_analyze_returns_expected_keys(self):
        result = self.agent.analyze("Test1234!", blacklist={"password"})
        expected_keys = {
            "is_common", "label", "score", "confidence", "percentage",
            "crack_time", "advice", "model_used", "features",
        }
        self.assertEqual(set(result.keys()), expected_keys)

    def test_analyze_flags_blacklisted_password(self):
        result = self.agent.analyze("password", blacklist={"password"})
        self.assertTrue(result["is_common"])


if __name__ == "__main__":
    unittest.main()
