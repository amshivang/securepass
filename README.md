# 🛡️ SecurePass — Intelligent ML Password Security Analyzer

[![Python Version](https://img.shields.io/badge/python-3.x-blue.svg)](https://python.org)
[![Machine Learning](https://img.shields.io/badge/ML-Scikit--learn-green.svg)](https://scikit-learn.org/)
[![Deployment](https://img.shields.io/badge/Deployment-PythonAnywhere-success.svg)](#)
[![Framework](https://img.shields.io/badge/Framework-Flask-0078d4.svg)](#)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SecurePass** is an intelligent, real-time password security analyzer powered by Machine Learning. Rather than relying on simple regex rules, it uses a trained Random Forest classifier and advanced feature engineering to evaluate the true strength of your passwords, estimate brute-force crack times, and provide targeted, actionable advice to help you secure your accounts.

**Live Demo:** [http://shivang.pythonanywhere.com](http://shivang.pythonanywhere.com)

---

## ✨ Key Features

- **🤖 ML Classification**: Uses a Random Forest model trained on synthetic password datasets to classify passwords into Weak, Medium, or Strong.
- **📚 Blacklist & Leet-Speak Detection**: Cross-references inputs against known breached passwords (e.g., `password123`) and normalizes leet-speak (`p@ssw0rd`) to catch sneaky substitutions.
- **⏱️ Crack Time Estimation**: Calculates how long a high-end cracking rig (capable of 100 billion guesses/second) would take to brute-force the password.
- **💡 Agent's Optimization Plan**: Instead of just telling you a password is weak, the Rational Agent provides precise, actionable feedback on exactly what characters or length to add.
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

---

## ⚡ How It Works (Internal Pipeline)

1. **Feature Extraction**: When you type a password, the raw text is immediately converted into a 7-dimensional numeric vector (Length, Has Uppercase, Has Lowercase, Has Digit, Has Symbol, Shannon Entropy, Unique Character Ratio).
2. **Local Processing**: Raw text never leaves the application, ensuring maximum privacy and security.
3. **Random Forest Inference**: These 7 features are fed into a Random Forest Classifier composed of 100 independent decision trees.
4. **Majority Consensus**: Each tree independently casts a vote, and the majority consensus determines the strength of the password, returning a confidence percentage.

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

