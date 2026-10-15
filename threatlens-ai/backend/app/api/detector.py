from datetime import datetime, timezone
import io
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
import pandas as pd

from app.db.session import get_db
from app.db.models import Alert, BlockedIP
from app.services.ml_service import ml_service
from app.core.security import get_current_user

router = APIRouter(prefix="/detector", tags=["Detector & Anomaly Engine"])


class PacketPayload(BaseModel):
    source_ip: str = Field(default="192.168.1.105")
    destination_ip: str = Field(default="10.0.0.1")
    source_port: int = Field(default=49152)
    destination_port: int = Field(default=80)
    protocol: str = Field(default="TCP")
    packet_length: int = Field(default=512)
    duration_ms: float = Field(default=45.0)
    bytes_in: float = Field(default=512.0)
    bytes_out: float = Field(default=1024.0)
    tcp_flags: int = Field(default=16)
    flow_packets_per_sec: Optional[float] = None
    flow_bytes_per_sec: Optional[float] = None


class BatchPacketPayload(BaseModel):
    packets: List[PacketPayload]


class AlertMitigationRequest(BaseModel):
    action: str  # "BLOCK_IP", "QUARANTINE_HOST", "ISOLATE_VLAN", "DISMISS", "MARK_FALSE_POSITIVE"
    notes: Optional[str] = ""


class BlockIPRequest(BaseModel):
    ip_address: str
    reason: str


@router.get("/model-info")
async def get_model_info():
    """Retrieve runtime diagnostics of the Isolation Forest model."""
    return {
        "is_loaded": ml_service.is_loaded,
        "metadata": ml_service.model_metadata,
        "feature_names": [
            "Source Port",
            "Destination Port",
            "Protocol (Numeric)",
            "Packet Length (bytes)",
            "Flow Duration (ms)",
            "Bytes In",
            "Bytes Out",
            "TCP Flags Mask",
            "Packets / Sec",
            "Bytes / Sec"
        ]
    }


@router.post("/score-packet")
async def score_packet(
    packet: PacketPayload,
    db: AsyncSession = Depends(get_db),
    # Allow scoring without strict auth for streaming telemetry or with auth
):
    """Real-time scoring of a single telemetry packet."""
    packet_dict = packet.model_dump()
    result = ml_service.predict_packet(packet_dict)

    saved_alert_id = None
    # If anomaly detected, automatically record an Alert in PostgreSQL
    if result["is_anomaly"]:
        alert = Alert(
            source_ip=packet.source_ip,
            destination_ip=packet.destination_ip,
            source_port=packet.source_port,
            destination_port=packet.destination_port,
            protocol=packet.protocol,
            packet_length=packet.packet_length,
            anomaly_score=result["anomaly_score"],
            severity=result["severity"],
            attack_type=result["attack_type"],
            status="UNRESOLVED",
            features_json=packet_dict,
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        saved_alert_id = alert.id

    return {
        "packet": packet_dict,
        "prediction": result,
        "alert_created": result["is_anomaly"],
        "alert_id": saved_alert_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.post("/batch-score")
async def batch_score_packets(
    payload: BatchPacketPayload,
    db: AsyncSession = Depends(get_db)
):
    """Score multiple network packets in a single batch operation."""
    results = []
    anomalies_created = 0

    for pkt in payload.packets:
        p_dict = pkt.model_dump()
        pred = ml_service.predict_packet(p_dict)
        alert_id = None

        if pred["is_anomaly"]:
            alert = Alert(
                source_ip=pkt.source_ip,
                destination_ip=pkt.destination_ip,
                source_port=pkt.source_port,
                destination_port=pkt.destination_port,
                protocol=pkt.protocol,
                packet_length=pkt.packet_length,
                anomaly_score=pred["anomaly_score"],
                severity=pred["severity"],
                attack_type=pred["attack_type"],
                status="UNRESOLVED",
                features_json=p_dict,
            )
            db.add(alert)
            anomalies_created += 1

        results.append({
            "packet": p_dict,
            "prediction": pred,
        })

    if anomalies_created > 0:
        await db.commit()

    return {
        "total_packets": len(payload.packets),
        "anomalies_found": anomalies_created,
        "results": results
    }


@router.post("/upload-pcap-csv")
async def upload_pcap_or_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload CSV or JSON packet capture dump to run full anomaly scoring."""
    content = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith(".json"):
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Supported file formats are CSV and JSON")

        records = df.to_dict(orient="records")
        scored_records = []
        anomalies_count = 0

        for r in records[:500]:  # Limit to 500 records per upload for responsiveness
            pred = ml_service.predict_packet(r)
            if pred["is_anomaly"]:
                alert = Alert(
                    source_ip=str(r.get("source_ip", r.get("src_ip", "192.168.1.100"))),
                    destination_ip=str(r.get("destination_ip", r.get("dst_ip", "10.0.0.1"))),
                    source_port=int(r.get("source_port", r.get("src_port", 44321))),
                    destination_port=int(r.get("destination_port", r.get("dst_port", 80))),
                    protocol=str(r.get("protocol", "TCP")),
                    packet_length=int(r.get("packet_length", r.get("length", 512))),
                    anomaly_score=pred["anomaly_score"],
                    severity=pred["severity"],
                    attack_type=pred["attack_type"],
                    status="UNRESOLVED",
                    features_json=r,
                )
                db.add(alert)
                anomalies_count += 1

            scored_records.append({
                "packet": r,
                "prediction": pred
            })

        if anomalies_count > 0:
            await db.commit()

        return {
            "filename": file.filename,
            "rows_processed": len(records[:500]),
            "anomalies_detected": anomalies_count,
            "results": scored_records
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse and score dataset: {str(e)}")


@router.get("/alerts")
async def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve security incident alerts with filtering."""
    query = select(Alert).order_by(desc(Alert.timestamp))
    if status:
        query = query.where(Alert.status == status)
    if severity:
        query = query.where(Alert.severity == severity)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    # Total count query
    count_query = select(func.count(Alert.id))
    if status:
        count_query = count_query.where(Alert.status == status)
    if severity:
        count_query = count_query.where(Alert.severity == severity)
    count_res = await db.execute(count_query)
    total_count = count_res.scalar_one()

    return {
        "total": total_count,
        "items": alerts
    }


@router.post("/alerts/{alert_id}/mitigate")
async def mitigate_alert(
    alert_id: str,
    req: AlertMitigationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Apply SOC defensive mitigation actions on an alert (Block IP, Quarantine, etc.)."""
    stmt = select(Alert).where(Alert.id == alert_id)
    res = await db.execute(stmt)
    alert = res.scalars().first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "MITIGATED" if req.action != "MARK_FALSE_POSITIVE" else "FALSE_POSITIVE"
    alert.mitigation_action = req.action
    if req.notes:
        alert.notes = (alert.notes or "") + f"\n[{datetime.now(timezone.utc).isoformat()}] {req.notes}"

    # If action is BLOCK_IP, also add to blocked IPs
    if req.action == "BLOCK_IP":
        # Check if already blocked
        check_block = select(BlockedIP).where(BlockedIP.ip_address == alert.source_ip)
        existing = (await db.execute(check_block)).scalars().first()
        if not existing:
            blocked = BlockedIP(
                ip_address=alert.source_ip,
                reason=f"Auto-mitigated from Alert {alert.id} ({alert.attack_type})"
            )
            db.add(blocked)

    await db.commit()
    await db.refresh(alert)
    return {"message": "Alert mitigation executed successfully", "alert": alert}


@router.get("/blocked-ips")
async def list_blocked_ips(db: AsyncSession = Depends(get_db)):
    """List all currently active blocked IP addresses."""
    stmt = select(BlockedIP).order_by(desc(BlockedIP.blocked_at))
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/block-ip")
async def manual_block_ip(req: BlockIPRequest, db: AsyncSession = Depends(get_db)):
    """Manually add an IP to the active firewall blocklist."""
    check = select(BlockedIP).where(BlockedIP.ip_address == req.ip_address)
    existing = (await db.execute(check)).scalars().first()
    if existing:
        return {"message": "IP is already blocked", "item": existing}

    new_block = BlockedIP(
        ip_address=req.ip_address,
        reason=req.reason,
        blocked_by="SOC Analyst (Manual)"
    )
    db.add(new_block)
    await db.commit()
    await db.refresh(new_block)
    return {"message": "IP successfully blocked", "item": new_block}
