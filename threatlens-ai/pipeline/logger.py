import csv
import os
from datetime import datetime

LOG_FILE = "security_logs.csv"

def init_log():
    """Initialize the CSV log file with headers if it doesn't exist."""
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, mode='w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "identifier", "status", "layer", "reason", "count"])

def log_event(identifier, status, layer, reason, count=None):
    """Log a security event to the CSV file."""
    init_log()
    with open(LOG_FILE, mode='a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            identifier,
            status,
            layer,
            reason,
            count if count is not None else ""
        ])
