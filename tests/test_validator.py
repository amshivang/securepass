import hashlib
import os
import sys
import unittest
from unittest.mock import patch, MagicMock

import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

import validator


class TestValidator(unittest.TestCase):
    def test_load_common_passwords_returns_nonempty_set(self):
        blacklist = validator.load_common_passwords()
        self.assertIsInstance(blacklist, set)
        self.assertIn("password", blacklist)
        self.assertGreater(len(blacklist), 1000)

    def test_check_pwned_empty_password(self):
        checked, count = validator.check_pwned("")
        self.assertTrue(checked)
        self.assertEqual(count, 0)

    @patch("validator.requests.get")
    def test_check_pwned_found(self, mock_get):
        password = "password"
        sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
        suffix = sha1[5:]
        mock_response = MagicMock()
        mock_response.text = f"{suffix}:3730471\nAAAA1111AAAA1111AAAA1111AAAA1111AAA:5"
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        checked, count = validator.check_pwned(password)
        self.assertTrue(checked)
        self.assertEqual(count, 3730471)

    @patch("validator.requests.get")
    def test_check_pwned_not_found(self, mock_get):
        mock_response = MagicMock()
        mock_response.text = "AAAA1111AAAA1111AAAA1111AAAA1111AAA:5"
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        checked, count = validator.check_pwned("some-very-unique-password-xyz")
        self.assertTrue(checked)
        self.assertEqual(count, 0)

    @patch("validator.requests.get")
    def test_check_pwned_network_failure(self, mock_get):
        mock_get.side_effect = requests.RequestException("boom")
        checked, count = validator.check_pwned("password")
        self.assertFalse(checked)
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
