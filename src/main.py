import sys
import io

# Force UTF-8 output so Unicode bar chars work on Windows CMD/PowerShell
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from ml_engine import PasswordAgent
import validator


def main():
    print("=" * 46)
    print("   AI-ML Password Security Agent v3.1")
    print("=" * 46)

    agent = PasswordAgent()
    blacklist = validator.load_common_passwords()
    print(f"[*] Blacklist loaded: {len(blacklist)} known bad passwords")
    print("Type 'q' and press Enter or Ctrl+C to exit.\n")

    while True:
        try:
            user_input = input("Enter password to analyze: ")

            if user_input.lower() == "q" or user_input == "":
                print("Exiting...")
                break

            result = agent.analyze(user_input, blacklist)

            # Common-password guard
            if not validator.check_security(user_input, blacklist):
                print("\n[!] ALERT: Rational Agent identifies this as a Common/Known Password.")
                print("    Action: Rejecting — extremely high vulnerability.\n")
                continue

            # Display results
            bar_len = 30
            filled = int(result["percentage"] / 100 * bar_len)
            bar = "█" * filled + "░" * (bar_len - filled)

            print(f"\n  [AI Label]      : {result['label']}")
            print(f"  [AI Score]      : {result['score']} / 15")
            print(f"  [Strength]      : [{bar}] {result['percentage']}%")
            print(f"  [Crack Time]    : {result['crack_time']}")

            if result["advice"]:
                print("\n  Agent's Optimization Plan:")
                for tip in result["advice"]:
                    print(f"   -> {tip}")
            else:
                print("\n  [✓] Excellent! This password meets all security criteria.")

            print()

        except KeyboardInterrupt:
            print("\n\nInterrupted by user (Ctrl+C). Exiting...")
            break


if __name__ == "__main__":
    main()