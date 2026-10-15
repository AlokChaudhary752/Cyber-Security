import time
from faker import Faker
from engine import RuleEngine

fake = Faker()
engine = RuleEngine()

def simulate_brute_force(target_ip="192.168.1.100", attempts=10):
    print(f"Simulating Brute Force attack on {target_ip}...")
    for i in range(attempts):
        allowed, count = engine.is_allowed("brute_force", target_ip)
        print(f"Attempt {i+1}: count={count}, allowed={allowed}")
        time.sleep(0.5)

def simulate_normal(n=50):
    print(f"Simulating normal traffic ({n} random IPs)...")
    for _ in range(n):
        engine.is_allowed("brute_force", fake.ipv4())
    print("Normal traffic simulation complete.")

if __name__ == "__main__":
    simulate_brute_force()
    print("\n")
    simulate_normal()
