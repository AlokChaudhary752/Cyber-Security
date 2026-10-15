import redis
import time
import unittest
from engine import RuleEngine

class TestRuleEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RuleEngine()
        self.r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        # Clear redis before each test to ensure isolation
        self.r.flushdb()

    def test_exact_threshold(self):
        """Verify that block occurs exactly at threshold + 1"""
        ip = "10.0.0.1"
        rule = "brute_force" # Threshold is 5
        
        # First 5 attempts should be ALLOWED
        for i in range(1, 6):
            allowed, count = self.engine.is_allowed(rule, ip)
            self.assertTrue(allowed, f"Attempt {i} should be allowed")
            self.assertEqual(count, i)
            
        # 6th attempt should be BLOCKED
        allowed, count = self.engine.is_allowed(rule, ip)
        self.assertFalse(allowed, "6th attempt should be blocked")
        self.assertEqual(count, 6)

    def test_window_eviction(self):
        """Verify that events older than the window are purged"""
        ip = "10.0.0.2"
        rule = "brute_force" # Window is 300s
        
        # Inject an ancient event (Unix timestamp 1000000000)
        self.r.zadd(f"rule:{rule}:{ip}", {"1000000000": 1000000000})
        
        # Current attempt should NOT count the ancient event
        allowed, count = self.engine.is_allowed(rule, ip)
        self.assertEqual(count, 1, "Only the current event should be counted")
        self.assertTrue(allowed)

    def test_identifier_isolation(self):
        """Verify that attacks on one IP do not block another IP"""
        ip_attacker = "1.1.1.1"
        ip_victim = "2.2.2.2"
        rule = "brute_force"
        
        # Attacker hits threshold
        for _ in range(6):
            self.engine.is_allowed(rule, ip_attacker)
            
        # Attacker should be blocked
        allowed_attacker, _ = self.engine.is_allowed(rule, ip_attacker)
        self.assertFalse(allowed_attacker)
        
        # Victim should still be allowed
        allowed_victim, count_victim = self.engine.is_allowed(rule, ip_victim)
        self.assertTrue(allowed_victim)
        self.assertEqual(count_victim, 1)

    def test_api_velocity(self):
        """Verify the api_velocity rule independently"""
        key = "api-key-test"
        rule = "api_velocity" # Threshold is 100
        
        # Fill up to 100
        for i in range(1, 101):
            allowed, count = self.engine.is_allowed(rule, key)
            self.assertTrue(allowed)
            
        # 101st should be blocked
        allowed, count = self.engine.is_allowed(rule, key)
        self.assertFalse(allowed)
        self.assertEqual(count, 101)

if __name__ == "__main__":
    unittest.main()
