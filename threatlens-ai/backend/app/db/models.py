from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="soc_analyst")  # admin, soc_analyst, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    source_ip = Column(String(50), index=True, nullable=False)
    destination_ip = Column(String(50), nullable=False)
    source_port = Column(Integer, nullable=False)
    destination_port = Column(Integer, nullable=False)
    protocol = Column(String(20), nullable=False)
    packet_length = Column(Integer, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(String(20), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW, BENIGN
    attack_type = Column(String(100), default="Unknown Anomaly")  # DDoS, PortScan, Exfiltration, etc.
    status = Column(String(50), default="UNRESOLVED")  # UNRESOLVED, INVESTIGATING, MITIGATED, FALSE_POSITIVE
    mitigation_action = Column(String(100), nullable=True)
    features_json = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)


class BlockedIP(Base):
    __tablename__ = "blocked_ips"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ip_address = Column(String(50), unique=True, index=True, nullable=False)
    reason = Column(String(255), nullable=False)
    blocked_by = Column(String(100), default="ThreatLens AI Auto-Defense")
    blocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
