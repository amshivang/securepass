from flask import Flask, render_template, request, jsonify
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

model_path = os.path.join(os.path.dirname(__file__), "Data", "model.pkl")
if not os.path.exists(model_path):
    print("Model not found. Training model now...")
    import train_model
    train_model.main()

from ml_engine import PasswordAgent
import validator

app = Flask(__name__)

_agent     = PasswordAgent()
_blacklist = validator.load_common_passwords()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/ml-architecture")
def ml_architecture():
    return render_template("ml.html", model_name=_agent.model_name)


@app.route("/analyze", methods=["POST"])
def analyze():
    data     = request.get_json(silent=True) or {}
    password = data.get("password", "")
    if not password:
        return jsonify({"error": "No password provided"}), 400
    if len(password) > 256:
        return jsonify({"error": "Password exceeds maximum allowed length of 256 characters"}), 400

    result = _agent.analyze(password, _blacklist)
    result["is_common"] = not validator.check_security(password, _blacklist)
    return jsonify(result)


# ── Health check for Cloud Run / load balancers ──────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": _agent.model_name}), 200


# ── Local dev entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    print(f"Starting SecurePass at http://0.0.0.0:{port}  (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)
