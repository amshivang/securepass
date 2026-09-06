import logging
import os
import sys
from typing import Any

from flask import Flask, render_template, request, jsonify

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("securepass")

model_path = os.path.join(os.path.dirname(__file__), "Data", "model.pkl")
should_train = not os.path.exists(model_path)
if not should_train:
    try:
        import joblib
        import features as feat
        loaded_model = joblib.load(model_path)
        if hasattr(loaded_model, "n_features_in_") and loaded_model.n_features_in_ != len(feat.FEATURE_NAMES):
            logger.info("Existing model feature count (%d) != expected (%d). Retraining...",
                        loaded_model.n_features_in_, len(feat.FEATURE_NAMES))
            should_train = True
    except Exception as e:
        logger.warning("Could not validate existing model (%s). Retraining...", e)
        should_train = True

if should_train:
    logger.info("Training fresh model...")
    import train_model
    train_model.main()

from ml_engine import PasswordAgent
import validator

Limiter = None
get_remote_address = None
limiter_available = False
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter_available = True
except ImportError:  # pragma: no cover - only hit if dependency isn't installed
    pass

MAX_PASSWORD_LENGTH = 256

app = Flask(__name__)

_agent     = PasswordAgent()
_blacklist = validator.load_common_passwords()
logger.info("Loaded %d blacklisted passwords.", len(_blacklist))


class _NoopLimiter:
    """Fallback used only if flask-limiter isn't installed, so the app
    still runs (without rate limiting) rather than crashing on import."""

    def limit(self, *_args: Any, **_kwargs: Any):
        def decorator(fn):
            return fn
        return decorator


if limiter_available and Limiter is not None and get_remote_address is not None:
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["120 per minute"],
        storage_uri="memory://",
    )
else:  # pragma: no cover
    logger.warning("flask-limiter not installed; rate limiting is disabled.")
    limiter = _NoopLimiter()


# ── Security headers ─────────────────────────────────────────────────────────
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; img-src 'self' data:;"
    )
    return response


def _extract_password(data: dict[str, Any]) -> tuple[str | None, tuple[Any, int] | None]:
    """Validate and return the password from a request payload.

    Returns (password, error_response). Exactly one of the two is None.
    """
    password = data.get("password", "")
    if not isinstance(password, str):
        return None, (jsonify({"error": "Password must be a string"}), 400)
    if not password:
        return None, (jsonify({"error": "No password provided"}), 400)
    if len(password) > MAX_PASSWORD_LENGTH:
        return None, (jsonify({
            "error": f"Password exceeds maximum allowed length of {MAX_PASSWORD_LENGTH} characters"
        }), 400)
    return password, None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/ml-architecture")
def ml_architecture():
    return render_template("ml.html", model_name=_agent.model_name)


@app.route("/analyze", methods=["POST"])
@limiter.limit("30 per minute")
def analyze():
    data = request.get_json(silent=True) or {}
    password, err = _extract_password(data)
    if password is None:
        return err if err is not None else (jsonify({"error": "Invalid request"}), 400)

    result = _agent.analyze(password, _blacklist)
    result["is_common"] = not validator.check_security(password, _blacklist)
    return jsonify(result)


@app.route("/check-breach", methods=["POST"])
@limiter.limit("10 per minute")
def check_breach():
    """
    Explicit, opt-in breach check against the Have I Been Pwned database.
    Unlike /analyze (which is fully local and instant), this makes an
    outbound network request using k-anonymity — only the first 5 hex
    characters of the password's SHA-1 hash are sent, never the password
    or its full hash. Intended to be triggered by an explicit user action,
    not on every keystroke.
    """
    data = request.get_json(silent=True) or {}
    password, err = _extract_password(data)
    if password is None:
        return err if err is not None else (jsonify({"error": "Invalid request"}), 400)

    checked, count = validator.check_pwned(password)
    return jsonify({"checked": checked, "pwned": checked and count > 0, "count": count})


# ── Error handlers ────────────────────────────────────────────────────────────
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Too many requests. Please slow down."}), 429


@app.errorhandler(500)
def internal_error_handler(e):
    logger.exception("Unhandled server error")
    return jsonify({"error": "Internal server error"}), 500


# ── Health check for Cloud Run / load balancers ──────────────────────────────
@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "model": _agent.model_name,
        "version": "2.2.0",
    }), 200


# ── Local dev entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    logger.info(f"Starting SecurePass at http://0.0.0.0:{port}  (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)
