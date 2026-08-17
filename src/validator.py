import hashlib
import logging
import os

import requests

logger = logging.getLogger(__name__)

# Leet-speak substitution map for fuzzy matching
_LEET_MAP = str.maketrans("4@3!1|0$7", "aaeiilost")

HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/"


def normalize(password: str) -> str:
    """Lower-case and collapse common leet-speak substitutions."""
    return password.lower().translate(_LEET_MAP)


def load_common_passwords() -> set[str]:
    """Loads known bad passwords from the data file into a set."""
    current_dir = os.path.dirname(__file__)
    file_path = os.path.join(current_dir, "..", "Data", "common_passwords.txt")

    bad_passwords: set[str] = set()
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                # Each line may have multiple space-separated words
                for word in line.strip().split():
                    bad_passwords.add(word.lower())
    except FileNotFoundError:
        logger.warning("Dataset not found at %s. Using empty blacklist.", file_path)

    return bad_passwords


def check_security(password: str, bad_passwords_set: set[str]) -> bool:
    """
    Returns False (insecure) if the password OR its leet-speak
    normalisation appears in the blacklist.
    """
    return (
        password.lower() not in bad_passwords_set
        and normalize(password) not in bad_passwords_set
    )


def check_pwned(password: str, timeout: float = 3.0) -> tuple[bool, int]:
    """
    Check a password against the "Have I Been Pwned" Pwned Passwords API
    using k-anonymity: only the first 5 characters of the SHA-1 hash are
    ever sent over the network, so the plaintext password (and even its
    full hash) never leaves the machine.

    Returns (checked, count):
        - checked=True, count=N  -> password appeared in N known breaches
        - checked=True, count=0  -> not found in the breach corpus
        - checked=False, count=0 -> the check could not be completed
          (e.g. offline, API unreachable, timeout). Callers must treat
          this as "unknown", not "safe".
    """
    if not password:
        return True, 0

    sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]

    try:
        resp = requests.get(
            HIBP_RANGE_URL + prefix,
            timeout=timeout,
            headers={"Add-Padding": "true", "User-Agent": "SecurePass-App"},
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.warning("HIBP lookup failed: %s", e)
        return False, 0

    for line in resp.text.splitlines():
        parts = line.strip().split(":")
        if len(parts) != 2:
            continue
        line_suffix, count_str = parts
        if line_suffix.strip() == suffix:
            try:
                return True, int(count_str)
            except ValueError:
                return True, 0

    return True, 0
