import asyncio
import json
import random
import time
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.session import get_db, AsyncSessionLocal
from app.db.models import Alert, BlockedIP
from app.services.ml_service import ml_service

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Real-Time Feeds"])

# Active connected WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()


def generate_synthetic_packet(attack_injection_probability: float = 0.15) -> Dict[str, Any]:
    """Generate a realistic network telemetry packet with occasional cyber attack injection."""
    is_attack = random.random() < attack_injection_probability

    if is_attack:
        attack_scenario = random.choice(["ddos", "portscan", "bruteforce", "sqli", "c2"])
        if attack_scenario == "ddos":
            return {
                "source_ip": f"185.{random.randint(10,250)}.{random.randint(1,250)}.{random.randint(1,250)}",
                "destination_ip": "10.0.0.5",
                "source_port": random.randint(1024, 65535),
                "destination_port": random.choice([80, 443]),
                "protocol": "TCP",
                "packet_length": random.choice([1480, 1500, 65535]),
                "duration_ms": random.uniform(1.0, 15.0),
                "bytes_in": random.randint(50000, 500000),
                "bytes_out": random.randint(100, 1000),
                "tcp_flags": 2,  # SYN Flood
                "flow_packets_per_sec": random.uniform(800.0, 4500.0),
                "flow_bytes_per_sec": random.uniform(500000.0, 5000000.0),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        elif attack_scenario == "portscan":
            return {
                "source_ip": f"45.{random.randint(10,250)}.{random.randint(1,250)}.{random.randint(1,250)}",
                "destination_ip": "10.0.0.12",
                "source_port": random.randint(30000, 60000),
                "destination_port": random.choice([21, 22, 23, 25, 110, 143, 445, 3389, 8080]),
                "protocol": "TCP",
                "packet_length": 64,
                "duration_ms": 2.5,
                "bytes_in": 64,
                "bytes_out": 0,
                "tcp_flags": 41,  # SYN-FIN-PSH scan
                "flow_packets_per_sec": 120.0,
                "flow_bytes_per_sec": 7680.0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        elif attack_scenario == "bruteforce":
            return {
                "source_ip": f"91.240.{random.randint(1,250)}.{random.randint(1,250)}",
                "destination_ip": "10.0.0.22",
                "source_port": random.randint(40000, 50000),
                "destination_port": 22,
                "protocol": "TCP",
                "packet_length": 840,
                "duration_ms": 120.0,
                "bytes_in": 4200,
                "bytes_out": 3800,
                "tcp_flags": 24,
                "flow_packets_per_sec": 35.0,
                "flow_bytes_per_sec": 29400.0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        elif attack_scenario == "sqli":
            return {
                "source_ip": f"194.26.{random.randint(1,250)}.{random.randint(1,250)}",
                "destination_ip": "10.0.0.80",
                "source_port": random.randint(35000, 55000),
                "destination_port": 443,
                "protocol": "TCP",
                "packet_length": 4820,
                "duration_ms": 240.0,
                "bytes_in": 14500,
                "bytes_out": 89000,
                "tcp_flags": 24,
                "flow_packets_per_sec": 45.0,
                "flow_bytes_per_sec": 217000.0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else: # c2 exfil
            return {
                "source_ip": "10.0.0.145",
                "destination_ip": f"198.51.100.{random.randint(1,250)}",
                "source_port": random.randint(50000, 60000),
                "destination_port": 53,
                "protocol": "DNS",
                "packet_length": 2048,
                "duration_ms": 450.0,
                "bytes_in": 256,
                "bytes_out": 120000,
                "tcp_flags": 16,
                "flow_packets_per_sec": 15.0,
                "flow_bytes_per_sec": 30720.0,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    else:
        # Normal baseline traffic
        return {
            "source_ip": f"192.168.1.{random.randint(10, 200)}",
            "destination_ip": random.choice(["10.0.0.1", "172.217.16.206", "142.250.190.46", "1.1.1.1"]),
            "source_port": random.randint(1024, 65535),
            "destination_port": random.choice([80, 443, 53, 8080, 3000]),
            "protocol": random.choice(["TCP", "TCP", "TCP", "UDP", "HTTPS"]),
            "packet_length": random.randint(128, 1400),
            "duration_ms": random.uniform(10.0, 150.0),
            "bytes_in": random.randint(512, 4096),
            "bytes_out": random.randint(1024, 16384),
            "tcp_flags": 16,
            "flow_packets_per_sec": random.uniform(2.0, 25.0),
            "flow_bytes_per_sec": random.uniform(1000.0, 35000.0),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


@router.get("/summary")
async def get_soc_summary(db: AsyncSession = Depends(get_db)):
    """Summary overview telemetry for the SOC dashboard header cards."""
    # Total alerts
    res_total = await db.execute(select(func.count(Alert.id)))
    total_alerts = res_total.scalar_one()

    # Unresolved alerts
    res_unresolved = await db.execute(select(func.count(Alert.id)).where(Alert.status == "UNRESOLVED"))
    unresolved_alerts = res_unresolved.scalar_one()

    # Critical / High threats
    res_crit = await db.execute(
        select(func.count(Alert.id)).where(Alert.severity.in_(["CRITICAL", "HIGH"]))
    )
    critical_threats = res_crit.scalar_one()

    # Blocked IPs
    res_blocked = await db.execute(select(func.count(BlockedIP.id)).where(BlockedIP.is_active == True))
    blocked_ips_count = res_blocked.scalar_one()

    # Attack breakdown
    res_attacks = await db.execute(
        select(Alert.attack_type, func.count(Alert.id))
        .group_by(Alert.attack_type)
        .order_by(desc(func.count(Alert.id)))
        .limit(6)
    )
    attack_breakdown = [{"name": row[0], "count": row[1]} for row in res_attacks.all()]

    # Severity distribution
    res_sev = await db.execute(
        select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)
    )
    severity_distribution = [{"severity": row[0], "count": row[1]} for row in res_sev.all()]

    return {
        "total_packets_inspected": 248920 + total_alerts * 12,
        "total_alerts": total_alerts,
        "unresolved_alerts": unresolved_alerts,
        "critical_threats": critical_threats,
        "blocked_ips_count": blocked_ips_count,
        "system_health": "OPTIMAL",
        "ml_engine_status": "ONLINE (Isolation Forest Active)",
        "throughput_mbps": round(random.uniform(84.5, 142.3), 1),
        "attack_breakdown": attack_breakdown,
        "severity_distribution": severity_distribution,
    }


@router.get("/timeseries")
async def get_telemetry_timeseries():
    """Returns 24-point time-series data for bandwidth, anomalies, and CPU load."""
    now = datetime.now(timezone.utc)
    series = []
    for i in range(24, 0, -1):
        t = now - timedelta(minutes=i * 5)
        series.append({
            "time": t.strftime("%H:%M"),
            "packets_sec": random.randint(1200, 3800),
            "anomalies": random.choice([0, 1, 2, 0, 0, 4, 1, 0, 7, 2]),
            "bandwidth_mbps": round(random.uniform(45.0, 120.0), 1),
            "cpu_utilization": round(random.uniform(18.0, 42.0), 1),
            "risk_score_avg": round(random.uniform(0.08, 0.28), 2)
        })
    return series


@router.websocket("/ws/live-stream")
async def websocket_live_stream(websocket: WebSocket):
    """WebSocket feed streaming live packets and on-the-fly ML anomaly scores."""
    await manager.connect(websocket)
    try:
        while True:
            # Generate packet & score
            pkt = generate_synthetic_packet()
            pred = ml_service.predict_packet(pkt)
            
            message = {
                "type": "PACKET_TELEMETRY",
                "data": {
                    "packet": pkt,
                    "prediction": pred,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
            await websocket.send_json(message)
            await asyncio.sleep(1.2)  # Emit every 1.2 seconds for realistic fluid telemetry
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
