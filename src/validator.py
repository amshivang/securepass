import os
import re

# Leet-speak substitution map for fuzzy matching
_LEET_MAP = str.maketrans("4@3!1|0$7", "aaeiilost")


def normalize(password: str) -> str:
    """Lower-case and collapse common leet-speak substitutions."""
    return password.lower().translate(_LEET_MAP)


def load_common_passwords() -> set:
    """Loads known bad passwords from the data file into a set."""
    current_dir = os.path.dirname(__file__)
    file_path = os.path.join(current_dir, "..", "Data", "common_passwords.txt")

    bad_passwords = set()
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                # Each line may have multiple space-separated words
                for word in line.strip().split():
                    bad_passwords.add(word.lower())
    except FileNotFoundError:
        print(f"Warning: Dataset not found at {file_path}. Using empty blacklist.")

    return bad_passwords


def check_security(password: str, bad_passwords_set: set) -> bool:
    """
    Returns False (insecure) if the password OR its leet-speak
    normalisation appears in the blacklist.
    """
    return (
        password.lower() not in bad_passwords_set
        and normalize(password) not in bad_passwords_set
    )