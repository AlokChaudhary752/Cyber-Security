import time
import redis
from ruamel.yaml import YAML


class RuleEngine:
    def __init__(self, config_path='config/rules.yaml'):
        yaml = YAML(typ='safe')
        with open(config_path, 'r') as f:
            self.config = yaml.load(f)['rules']
        self.r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    def is_allowed(self, rule_name, identifier):
        rule = self.config.get(rule_name)
        if not rule:
            return True, 0

        now = time.time()
        key = f"rule:{rule_name}:{identifier}"

        pipe = self.r.pipeline()
        pipe.zadd(key, {str(now): now})
        pipe.zremrangebyscore(key, 0, now - rule['window'])
        pipe.zcard(key)
        pipe.expire(key, rule['window'])

        results = pipe.execute()
        count = results[2]

        return (count <= rule['threshold']), count