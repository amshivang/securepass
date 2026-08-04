import os
import sys
import unittest

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


if __name__ == "__main__":
    unittest.main()
