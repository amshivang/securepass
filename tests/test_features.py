import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

import features as feat


class TestFeatures(unittest.TestCase):
    def test_shannon_entropy_empty(self):
        self.assertEqual(feat.shannon_entropy(""), 0.0)

    def test_shannon_entropy_uniform_zero(self):
        # A single repeated character has zero entropy.
        self.assertEqual(feat.shannon_entropy("aaaa"), 0.0)

    def test_has_keyboard_walk_detects_row(self):
        self.assertTrue(feat.has_keyboard_walk("myqwertypass"))
        self.assertTrue(feat.has_keyboard_walk("1qaz9876"))  # reversed digit row "9876"
        self.assertFalse(feat.has_keyboard_walk("MyP@ssw0rd!!Secure99"))

    def test_has_sequential_run_ascending_and_descending(self):
        self.assertTrue(feat.has_sequential_run("abcd1234"))
        self.assertTrue(feat.has_sequential_run("9876xyz"))
        self.assertFalse(feat.has_sequential_run("MyP@ssw0rd!!Secure99"))

    def test_has_sequential_run_respects_min_len(self):
        self.assertFalse(feat.has_sequential_run("ab1"))

    def test_max_repeat_ratio(self):
        self.assertAlmostEqual(feat.max_repeat_ratio("aaabbb"), 0.5)
        self.assertEqual(feat.max_repeat_ratio(""), 0.0)
        self.assertAlmostEqual(feat.max_repeat_ratio("abcabc"), 1 / 6)

    def test_extract_features_keys(self):
        f = feat.extract_features("Test123!")
        self.assertEqual(set(f.keys()), set(feat.FEATURE_NAMES))

    def test_extract_features_empty_password(self):
        f = feat.extract_features("")
        self.assertEqual(f["length"], 0)
        self.assertEqual(f["unique_ratio"], 0.0)
        self.assertEqual(f["total_entropy"], 0.0)

    def test_features_to_vector_order_matches_names(self):
        f = feat.extract_features("Abc123!@")
        vec = feat.features_to_vector("Abc123!@")
        self.assertEqual(vec, [f[name] for name in feat.FEATURE_NAMES])


if __name__ == "__main__":
    unittest.main()
