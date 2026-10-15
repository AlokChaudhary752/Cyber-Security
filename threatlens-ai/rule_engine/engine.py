import time
import redis
import logging
import os
from ruamel.yaml import YAML

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("RuleEngine")

class RuleEngine:
    def __init__(self, config_path=None):
        """
        Initializes the Deterministic Rule Engine using Redis for sliding window counting.
        """
        if config_path is None:
            # File is at rule_engine/engine.py
            # We want rule_engine/config/rules.yaml
            base_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(base_dir, 'config', 'rules.yaml')
        
        try:
            yaml = YAML(typ='safe')
            with open(config_path, 'r') as f:
                self.config = yaml.load(f).get('rules', {})
            logger.info(f"Rule Engine initialized with {len(self.config)} rules. Config: {config_path}")
        except Exception as e:
            logger.error(f"Failed to load config from {config_path}: {e}")
            self.config = {}

        # Redis connection (Standard for high-speed velocity checks)
        self.r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    def is_allowed(self, rule_name, identifier):
        """
        Checks if a request is allowed based on the specified rule.
        Uses Redis Sorted Sets (ZSETs) to implement a sliding window.
        """
        rule = self.config.get(rule_name)
        if not rule:
            logger.debug(f"Rule '{rule_name}' not found. Defaulting to ALLOW.")
            return True, 0

        window = rule['window']       # Time window in seconds
        threshold = rule['threshold'] # Max allowed requests in window
        
        now = time.time()
        key = f"threatlens:rule:{rule_name}:{identifier}"

        try:
            pipe = self.r.pipeline()
            pipe.zadd(key, {str(now): now})
            pipe.zremrangebyscore(key, 0, now - window)
            pipe.zcard(key)
            pipe.expire(key, window)
            results = pipe.execute()
            current_count = results[2]

            if current_count > threshold:
                logger.warning(f"RULE TRIGGERED: [{rule_name}] for {identifier}. Count: {current_count}/{threshold}")
                return False, current_count
            
            return True, current_count

        except redis.RedisError as e:
            logger.error(f"Redis Error during rule check for {identifier}: {e}")
            return True, 0

if __name__ == "__main__":
    engine = RuleEngine()
    ip = "1.2.3.4"
    for i in range(1, 8):
        allowed, count = engine.is_allowed("brute_force", ip)
        print(f"Attempt {i}: Allowed={allowed}, Count={count}")
