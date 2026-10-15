import numpy as np
from rule_engine.engine import RuleEngine
from anomaly_detector import AnomalyDetector
from attack_classifier import AttackClassifier

class ThreatLensPipeline:
    def __init__(self):
        # LAYER 1: Deterministic Rule Engine (First line of defense)
        self.layer1 = RuleEngine()
        # LAYER 2: Unsupervised ML (Isolation Forest)
        self.layer2 = AnomalyDetector()
        # LAYER 3: Supervised ML (Random Forest)
        self.layer3 = AttackClassifier()

    def process_request(self, identifier, rule_name, features):
        """
        Multi-layered Security Pipeline.
        identifier: IP address or User ID
        rule_name: Rule to check (e.g., 'brute_force')
        features: Feature vector for ML layers
        """
        print(f"\n>>> SECURE GATEWAY: Processing request from {identifier} <<<")

        # --- LAYER 1: DETERMINISTIC CHECK ---
        # Checks sliding window counts in Redis
        allowed, count = self.layer1.is_allowed(rule_name, identifier)
        if not allowed:
            print(f"[LAYER 1] 🚩 BLOCKED: {rule_name} threshold exceeded. Requests: {count}")
            return {"status": "BLOCKED", "layer": 1, "reason": "Deterministic Rule Triggered", "count": count}
        
        print("[LAYER 1] ✅ PASS: Traffic within deterministic limits.")

        # --- LAYER 2: ANOMALY DETECTION ---
        # Checks if the packet is a statistical outlier
        is_anomaly = self.layer2.is_anomaly(features)
        if not is_anomaly:
            print("[LAYER 2] ✅ PASS: Traffic looks benign (Inlier).")
            return {"status": "ALLOWED", "layer": 2, "reason": "Benign Traffic"}
        
        print("[LAYER 2] ⚠️  ANOMALY DETECTED: Traffic is an outlier.")

        # --- LAYER 3: ATTACK CLASSIFICATION ---
        # Classifies the specific type of attack
        attack_type = self.layer3.classify(features)
        print(f"[LAYER 3] 🚨 CRITICAL: Attack classified as {attack_type}")
        return {"status": "BLOCKED", "layer": 3, "reason": f"Classified Attack: {attack_type}"}

if __name__ == "__main__":
    pipeline = ThreatLensPipeline()
    
    # Setup test data
    ip_attacker = "10.0.0.5"
    ip_normal = "192.168.1.1"
    feature_len = 118
    normal_features = [0.5] * feature_len
    
    # TEST 1: Normal User
    print("\n--- Testing Normal User ---")
    print(pipeline.process_request(ip_normal, "brute_force", normal_features))

    # TEST 2: Brute Force Simulation
    print("\n--- Testing Brute Force Simulation ---")
    for i in range(1, 8):
        res = pipeline.process_request(ip_attacker, "brute_force", normal_features)
        print(f"Request {i} Result: {res['status']}")
        if res['status'] == "BLOCKED":
            break
