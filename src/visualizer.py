def display_analysis(label, confidence):
    """Visualizes the ML Agent's findings."""
    max_score = 15 # Adjusted based on new weight logic
    bar_length = 30
    filled_length = int((confidence / max_score) * bar_length)
    
    if filled_length > bar_length:
        filled_length = bar_length

    bar = '█' * filled_length + '░' * (bar_length - filled_length)
    
    print(f"\n[AI Label]:      {label}")
    print(f"[Confidence]:    {round(confidence, 2)}")
    print(f"Strength Bar:   [{bar}]")

def time_to_crack(password):
    """Estimates the Adversarial Search time [CO2]."""
    # Assuming a high-end cracking rig (100 Billion guesses/sec)
    pool_size = 0
    if any(c.islower() for c in password): pool_size += 26
    if any(c.isupper() for c in password): pool_size += 26
    if any(c.isdigit() for c in password): pool_size += 10
    if any(not c.isalnum() for c in password): pool_size += 32
    
    if pool_size == 0: return
    
    combinations = pool_size ** len(password)
    seconds = combinations / 100_000_000_000
    
    print("Estimated Crack Time: ", end="")
    if seconds < 1: print("Instantly")
    elif seconds < 86400: print(f"{round(seconds/3600, 2)} hours")
    elif seconds < 31536000: print(f"{round(seconds/86400, 2)} days")
    else: print(f"{round(seconds/31536000, 2)} years")