import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import validator
from app import app


class TestSecurePass(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_normalize_leetspeak(self):
        self.assertEqual(validator.normalize("P@$$w0rd"), "password")

    def test_check_security(self):
        blacklist = {"password", "123456", "admin"}
        self.assertFalse(validator.check_security("P@$$w0rd", blacklist))
        self.assertTrue(validator.check_security("CorrectHorseBatteryStaple!", blacklist))

    def test_health_endpoint(self):
        response = self.app.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertIn("status", response.get_json())

    def test_analyze_endpoint_empty(self):
        response = self.app.post("/analyze", json={})
        self.assertEqual(response.status_code, 400)

    def test_analyze_endpoint_too_long(self):
        long_pwd = "A" * 300
        response = self.app.post("/analyze", json={"password": long_pwd})
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds maximum allowed length", response.get_json().get("error", ""))

    def test_analyze_endpoint_non_string_password(self):
        response = self.app.post("/analyze", json={"password": 123456})
        self.assertEqual(response.status_code, 400)
        self.assertIn("must be a string", response.get_json().get("error", ""))

    def test_analyze_endpoint_non_string_password_list(self):
        response = self.app.post("/analyze", json={"password": ["a", "b"]})
        self.assertEqual(response.status_code, 400)

    def test_analyze_endpoint_valid(self):
        response = self.app.post("/analyze", json={"password": "MyP@ssw0rd!!Secure99"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        for key in ("label", "score", "confidence", "percentage", "crack_time", "advice", "is_common"):
            self.assertIn(key, data)

    def test_analyze_endpoint_known_common_password(self):
        response = self.app.post("/analyze", json={"password": "password123"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["is_common"])
        self.assertIn("known/leaked password", data["crack_time"])

    def test_security_headers_present(self):
        response = self.app.get("/health")
        self.assertIn("X-Content-Type-Options", response.headers)
        self.assertIn("Content-Security-Policy", response.headers)

    def test_check_breach_endpoint_empty(self):
        response = self.app.post("/check-breach", json={})
        self.assertEqual(response.status_code, 400)

    @patch("app.validator.check_pwned")
    def test_check_breach_endpoint_found(self, mock_check):
        mock_check.return_value = (True, 42)
        response = self.app.post("/check-breach", json={"password": "hunter2"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["checked"])
        self.assertTrue(data["pwned"])
        self.assertEqual(data["count"], 42)

    @patch("app.validator.check_pwned")
    def test_check_breach_endpoint_unreachable(self, mock_check):
        mock_check.return_value = (False, 0)
        response = self.app.post("/check-breach", json={"password": "hunter2"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertFalse(data["checked"])
        self.assertFalse(data["pwned"])


if __name__ == "__main__":
    unittest.main()
