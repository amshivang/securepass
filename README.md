# SecurePass 🛡️

**Live Demo:** [http://shivang.pythonanywhere.com](http://shivang.pythonanywhere.com)

SecurePass is an intelligent, real-time password security analyzer powered by Machine Learning. Rather than relying on simple regex rules, it uses a trained Random Forest classifier and advanced feature engineering to evaluate the true strength of your passwords, estimate brute-force crack times, and provide targeted, actionable advice to help you secure your accounts.

## ✨ Features

- **🤖 ML Classification:** Uses a Random Forest model trained on synthetic password datasets to classify passwords into Weak, Medium, or Strong.
- **📚 Blacklist & Leet-Speak Detection:** Cross-references inputs against known breached passwords (e.g., `password123`) and normalizes leet-speak (`p@ssw0rd`) to catch sneaky substitutions.
- **⏱️ Crack Time Estimation:** Calculates how long a high-end cracking rig (capable of 100 billion guesses/second) would take to brute-force the password.
- **💡 Agent's Optimization Plan:** Instead of just telling you a password is weak, the Rational Agent provides precise, actionable feedback on exactly what characters or length to add.
- **☁️ Cloud-Native 24/7 Deployment:** Fully containerized with Docker, deployed on Google Cloud Run with minimal latency.

## 🧠 How it Works (Under the Hood)

When you type a password, the raw text never leaves the application. Instead, it is immediately converted into a 7-dimensional numeric vector (Feature Extraction):
1. **Length**
2. **Has Uppercase**
3. **Has Lowercase**
4. **Has Digit**
5. **Has Symbol**
6. **Shannon Entropy** (Unpredictability based on character distribution)
7. **Unique Character Ratio**

These 7 features are fed into a **Random Forest Classifier** composed of 100 independent decision trees. Each tree independently casts a vote, and the majority consensus determines the strength of the password, returning a confidence percentage!

## 🚀 Getting Started (Local Development)

To run this project locally on your machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/amshivang/SecurePass.git
   cd SecurePass
   ```

2. **Install dependencies:**
   Make sure you have Python installed, then run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask application:**
   ```bash
   python app.py
   ```

4. **View in browser:**
   Open your browser and navigate to `http://localhost:5000`

## 📬 Contact & Links

- **LinkedIn:** [https://www.linkedin.com/in/amshivang/](https://www.linkedin.com/in/amshivang/)
- **Email:** linkwithshivang@gmail.com
