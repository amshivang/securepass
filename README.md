# 🛡️ SecurePass — Intelligent ML Password Security Analyzer

[![Python Version](https://img.shields.io/badge/python-3.x-blue.svg)](https://python.org)
[![Machine Learning](https://img.shields.io/badge/ML-Scikit--learn-green.svg)](https://scikit-learn.org/)
[![Deployment](https://img.shields.io/badge/Deployment-PythonAnywhere-success.svg)](#)
[![Framework](https://img.shields.io/badge/Framework-Flask-0078d4.svg)](#)
[![Tests](https://github.com/amshivang/SecurePass/actions/workflows/tests.yml/badge.svg)](https://github.com/amshivang/SecurePass/actions/workflows/tests.yml)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SecurePass** is an intelligent, real-time password security analyzer powered by Machine Learning. Rather than relying on simple regex rules, it uses a trained Random Forest classifier and advanced feature engineering to evaluate the true strength of your passwords, estimate brute-force crack times, and provide targeted, actionable advice to help you secure your accounts.

**Live Demo:** [http://shivang.pythonanywhere.com](http://shivang.pythonanywhere.com)

---

## ✨ Key Features

- **🤖 ML Classification**: Uses a Random Forest model trained on a synthetic dataset — including deceptive "looks-strong-but-isn't" passwords (keyboard walks, sequential runs, heavy repetition) — to classify passwords into Weak, Medium, or Strong.
- **📚 10,000+ Entry Blacklist & Leet-Speak Detection**: Cross-references inputs against a curated list of 10k+ known breached/common passwords (e.g., `password123`) and normalizes leet-speak (`p@ssw0rd`) to catch sneaky substitutions.
- **🕵️ Pattern Detection**: Flags keyboard walks (`qwerty`, `asdfgh`), sequential runs (`abcd`, `4321`), and repeated-character padding — the exact tricks that make a password *look* complex while remaining trivial to guess.
- **🔓 Opt-in Breach Check (Have I Been Pwned)**: On explicit user request, checks a password against the HIBP Pwned Passwords database using k-anonymity — only a 5-character hash prefix is ever sent, the password itself never leaves your machine.
- **⏱️ Realistic Crack Time Estimation**: Calculates brute-force time at 100 billion guesses/second, but reports "instant"/"seconds" for known-breached or pattern-based passwords, since real attackers use dictionaries and rules — not pure brute force — against those.
- **🔑 Secure Password Generator**: Generates cryptographically random strong passwords client-side (`crypto.getRandomValues`), with one-click copy to clipboard.
- **💡 Agent's Optimization Plan**: Instead of just telling you a password is weak, the Rational Agent provides precise, actionable feedback on exactly what characters or length to add.
- **🛡️ Hardened API**: Rate-limited endpoints, strict input validation, and security response headers (CSP, X-Frame-Options, etc.).
- **☁️ Cloud-Native Deployment**: Fully containerized and deployed with minimal latency, available 24/7.

---

## 🛠️ Complete Technology Stack

| Layer / Component | Technology | Role / Rationale |
|---|---|---|
| **Core Runtime** | Python 3.x | Backend logic and model inference |
| **Web Framework** | Flask | Lightweight WSGI web application framework for API and frontend |
| **Machine Learning** | Scikit-learn | Random Forest Classifier training and prediction |
| **Math & Matrix Engine**| NumPy | High-performance vector math & feature array transformations |
| **Model Serialization**| Joblib | Efficient model loading and caching in memory |
| **Production Server** | Gunicorn | High-performance Python WSGI HTTP Server |
| **Rate Limiting** | Flask-Limiter | Per-IP request throttling on analysis/breach-check endpoints |
| **Breach Intelligence**| Requests + HIBP API | k-anonymity lookups against the Have I Been Pwned corpus |

---

## ⚡ How It Works (Internal Pipeline)

1. **Feature Extraction**: When you type a password, the raw text is immediately converted into an 11-dimensional numeric vector (Length, Has Uppercase, Has Lowercase, Has Digit, Has Symbol, Shannon Entropy, Unique Character Ratio, Total Entropy, Max Repeat Ratio, Has Keyboard Walk, Has Sequential Run).
2. **Local Processing**: Raw text never leaves the application for real-time analysis, ensuring maximum privacy and security. (The optional breach-check feature is the one exception — see below — and even then only a hash prefix is transmitted, never the password.)
3. **Random Forest Inference**: These 11 features are fed into a Random Forest Classifier composed of 100 independent decision trees.
4. **Majority Consensus**: Each tree independently casts a vote, and the majority consensus determines the strength of the password, returning a confidence percentage.
5. **Opt-in Breach Check**: If you click "Check known breaches", the app hashes your password (SHA-1) and sends only the first 5 hex characters of the hash to the HIBP API, which returns all matching hash suffixes for that prefix (k-anonymity) — the match is then done locally.

> **Note on training data:** the classifier is trained on a programmatically generated synthetic dataset (not real breach data), using structural rules (length, character variety, entropy, keyboard walks, sequential runs) as ground truth. This keeps the project self-contained and license-friendly, but means the model formalizes/generalizes those structural rules rather than learning from real-world attacker behavior. The blacklist and HIBP integration are what catch real-world breached passwords.

---

## 🚀 Quick Start (Local Development)

To run this project locally on your machine:

```bash
# Clone the repository
git clone https://github.com/amshivang/SecurePass.git
cd SecurePass

# Install dependencies
pip install -r requirements.txt

# Run the Flask application
python app.py
```

Open your browser and navigate to `http://localhost:5000`

### Running Tests

```bash
python -m unittest discover -s tests -v
```

### Retraining the Model

The model is auto-trained on first run if `Data/model.pkl` is missing. To retrain manually (e.g. after changing feature engineering or the dataset generators):

```bash
python src/train_model.py
```

---

## 📬 Contact & Links

- **LinkedIn:** [https://www.linkedin.com/in/amshivang/](https://www.linkedin.com/in/amshivang/)
- **Email:** linkwithshivang@gmail.com

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---
<div align="center">
  <a href="https://buymeacoffee.com/amshivang">
    <img src="https://raw.githubusercontent.com/amshivang/amshivang/main/qr-code.png" alt="Buy Me A Coffee" width="200">
  </a>
  <br>
  <strong><a href="https://buymeacoffee.com/amshivang">Support my work on Buy Me A Coffee! ☕</a></strong>
</div>

