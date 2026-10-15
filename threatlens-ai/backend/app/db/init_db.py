import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import engine, Base
from app.db.models import User, Alert, BlockedIP
from app.core.security import get_password_hash

logger = logging.getLogger("threatlens.init_db")


async def init_database():
    """Create all database tables asynchronously and seed initial demo analyst user and alerts."""
    logger.info("Initializing database schema...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"Error during schema migration: {e}")

    # Seed default SOC analyst user and demo data
    try:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            # Check if default admin exists
            res = await session.execute(select(User).where(User.username == "analyst"))
            user = res.scalars().first()
            if not user:
                logger.info("Seeding default analyst account (analyst / ThreatLens@2025)...")
                default_user = User(
                    username="analyst",
                    email="analyst@threatlens.ai",
                    full_name="Alex Mercer (Lead SOC Analyst)",
                    hashed_password=get_password_hash("ThreatLens@2025"),
                    role="admin"
                )
                session.add(default_user)

                # Seed sample realistic cyber incident alerts
                sample_alerts = [
                    Alert(
                        source_ip="185.220.101.5",
                        destination_ip="10.0.0.80",
                        source_port=48192,
                        destination_port=443,
                        protocol="TCP",
                        packet_length=1500,
                        anomaly_score=-0.284,
                        severity="CRITICAL",
                        attack_type="DDoS / Volumetric Flood",
                        status="UNRESOLVED",
                        features_json={"flow_packets_per_sec": 4200.0, "tcp_flags": 2}
                    ),
                    Alert(
                        source_ip="45.154.255.89",
                        destination_ip="10.0.0.22",
                        source_port=59012,
                        destination_port=22,
                        protocol="TCP",
                        packet_length=840,
                        anomaly_score=-0.198,
                        severity="HIGH",
                        attack_type="SSH/RDP Brute Force Attempt",
                        status="INVESTIGATING",
                        features_json={"flow_packets_per_sec": 45.0, "duration_ms": 120.0}
                    ),
                    Alert(
                        source_ip="194.26.29.112",
                        destination_ip="10.0.0.12",
                        source_port=33011,
                        destination_port=445,
                        protocol="TCP",
                        packet_length=64,
                        anomaly_score=-0.165,
                        severity="HIGH",
                        attack_type="Stealth Port Scan (SYN/FIN Scan)",
                        status="UNRESOLVED",
                        features_json={"tcp_flags": 41, "flow_packets_per_sec": 120.0}
                    ),
                    Alert(
                        source_ip="10.0.0.145",
                        destination_ip="198.51.100.77",
                        source_port=52340,
                        destination_port=53,
                        protocol="DNS",
                        packet_length=2048,
                        anomaly_score=-0.221,
                        severity="CRITICAL",
                        attack_type="Zero-Day C2 Exfiltration",
                        status="UNRESOLVED",
                        features_json={"bytes_out": 120000, "duration_ms": 450.0}
                    )
                ]
                for a in sample_alerts:
                    session.add(a)

                # Seed sample blocked IP
                sample_block = BlockedIP(
                    ip_address="185.220.101.5",
                    reason="Automated mitigation for critical volumetric SYN flood attack."
                )
                session.add(sample_block)

                await session.commit()
                logger.info("Default seed data created successfully.")
    except Exception as e:
        logger.warning(f"Seed data insertion skipped or failed: {e}")
