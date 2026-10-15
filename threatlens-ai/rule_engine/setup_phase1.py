#!/usr/bin/env python3
"""Phase 1: Infrastructure Setup & Verification"""
import subprocess
import sys
import time

def run(cmd, check=True):
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr and check:
        print(result.stderr.strip(), file=sys.stderr)
    if check and result.returncode != 0:
        sys.exit(result.returncode)
    return result

def main():
    print("=== Phase 1: Infrastructure Setup ===\n")

    # 1. Verify Python
    print("1. Python version:")
    run(f"{sys.executable} --version")

    # 2. Install Python dependencies
    print("\n2. Installing dependencies:")
    run(f"{sys.executable} -m pip install -r requirements.txt")

    # 3. Start Redis via Docker Compose
    print("\n3. Starting Redis container:")
    run("docker compose up -d")

    # 4. Wait for Redis to be healthy
    print("\n4. Waiting for Redis healthcheck...")
    for i in range(30):
        result = run("docker compose exec -T redis redis-cli ping", check=False)
        if "PONG" in result.stdout:
            print("   Redis is ready!")
            break
        time.sleep(1)
    else:
        print("   ERROR: Redis healthcheck failed")
        sys.exit(1)

    # 5. Verify Redis connection from Python
    print("\n5. Verifying Python -> Redis connection:")
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        r.ping()
        r.set("phase1:test", "ok")
        assert r.get("phase1:test") == "ok"
        r.delete("phase1:test")
        print("   SUCCESS: Redis connection verified")
    except Exception as e:
        print(f"   ERROR: {e}")
        sys.exit(1)

    print("\n=== Phase 1 COMPLETE ===")
    print("Redis running on localhost:6379")
    print("Dependencies installed: redis, pyyaml, faker")

if __name__ == "__main__":
    main()