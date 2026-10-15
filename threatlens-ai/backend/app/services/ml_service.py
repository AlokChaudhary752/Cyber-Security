import os
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Union
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from app.core.config import settings

logger = logging.getLogger("threatlens.ml")
logging.basicConfig(level=logging.INFO)

# Default expected network telemetry feature columns
FEATURE_NAMES = [
    "src_port",
    "dst_port",
    "protocol_num",      # 6 for TCP, 17 for UDP, 1 for ICMP, etc.
    "packet_length",
    "duration_ms",
    "bytes_in",
    "bytes_out",
    "tcp_flags",         # Bitmask / numeric representation
    "flow_packets_per_sec",
    "flow_bytes_per_sec"
]

PROTOCOL_MAP = {
    "TCP": 6,
    "UDP": 17,
    "ICMP": 1,
    "HTTP": 80,
    "HTTPS": 443,
    "DNS": 53,
    "SSH": 22
}


class MLAnomalyService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.is_loaded = False
        self.model_metadata: Dict[str, Any] = {}
        self.load_or_initialize_model()

    def _resolve_path(self, relative_path: str) -> str:
        """Resolve file path relative to current backend root or workspace."""
        if os.path.isabs(relative_path):
            return relative_path
        
        # Check current working directory
        if os.path.exists(relative_path):
            return relative_path
        
        # Check relative to app folder
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        joined = os.path.join(base_dir, relative_path.replace("app/", ""))
        if os.path.exists(joined):
            return joined
        
        return os.path.join(base_dir, "models", os.path.basename(relative_path))

    def load_or_initialize_model(self):
        """Loads pre-trained Isolation Forest model & Scaler or synthesizes a high-fidelity baseline."""
        model_path = self._resolve_path(settings.MODEL_PATH)
        scaler_path = self._resolve_path(settings.SCALER_PATH)

        try:
            if os.path.exists(model_path):
                logger.info(f"Loading pre-trained Isolation Forest from {model_path}")
                self.model = joblib.load(model_path)
                self.is_loaded = True
                
                if os.path.exists(scaler_path):
                    logger.info(f"Loading pre-trained Scaler from {scaler_path}")
                    self.scaler = joblib.load(scaler_path)
                else:
                    logger.info("No scaler file found, utilizing raw feature normalization.")
                    self.scaler = None

                self.model_metadata = {
                    "source": "pre-trained .pkl",
                    "model_type": type(self.model).__name__,
                    "n_estimators": getattr(self.model, "n_estimators", 100),
                    "contamination": getattr(self.model, "contamination", 0.05),
                    "features_expected": FEATURE_NAMES,
                    "status": "active"
                }
                return
        except Exception as e:
            logger.warning(f"Failed to load custom pickle: {e}. Generating fallback baseline model.")

        # If model doesn't exist yet, synthesize an Isolation Forest tuned on network telemetry
        self._generate_baseline_model(model_path, scaler_path)

    def _generate_baseline_model(self, save_model_path: str, save_scaler_path: str):
        """Train and persist a robust default Isolation Forest model."""
        logger.info("Initializing baseline CyberSec Isolation Forest model...")
        np.random.seed(42)
        n_samples = 4000
        
        # Normal traffic distribution
        src_port = np.random.randint(1024, 65535, n_samples)
        dst_port = np.random.choice([80, 443, 53, 22, 8080, 3000, 5432], n_samples, p=[0.3, 0.45, 0.1, 0.05, 0.05, 0.03, 0.02])
        proto = np.random.choice([6, 17, 1], n_samples, p=[0.75, 0.2, 0.05])
        pkt_len = np.random.normal(512, 200, n_samples).clip(64, 1500)
        dur = np.random.exponential(120, n_samples).clip(1, 5000)
        b_in = pkt_len * np.random.randint(1, 10, n_samples)
        b_out = pkt_len * np.random.randint(1, 20, n_samples)
        tcp_flags = np.random.choice([2, 16, 24, 18], n_samples)  # SYN, ACK, PSH-ACK, SYN-ACK
        flow_pkts = (b_in + b_out) / (dur + 1)
        flow_bytes = flow_pkts * 64

        X_normal = np.column_stack([
            src_port, dst_port, proto, pkt_len, dur, b_in, b_out, tcp_flags, flow_pkts, flow_bytes
        ])

        # Anomaly traffic (DDoS, scans, exfiltration)
        n_anom = 250
        anom_src_port = np.random.randint(1, 1024, n_anom)
        anom_dst_port = np.random.randint(1, 65535, n_anom)
        anom_proto = np.random.choice([6, 17, 1], n_anom)
        anom_pkt_len = np.random.choice([40, 1500, 65535], n_anom)
        anom_dur = np.random.exponential(10, n_anom)
        anom_b_in = np.random.exponential(50000, n_anom)
        anom_b_out = np.random.exponential(150000, n_anom)
        anom_tcp_flags = np.random.choice([0, 1, 41, 255], n_anom)  # NULL, FIN, SYN-FIN-PSH, ALL
        anom_flow_pkts = np.random.exponential(1000, n_anom)
        anom_flow_bytes = anom_flow_pkts * 1000

        X_anom = np.column_stack([
            anom_src_port, anom_dst_port, anom_proto, anom_pkt_len, anom_dur,
            anom_b_in, anom_b_out, anom_tcp_flags, anom_flow_pkts, anom_flow_bytes
        ])

        X_all = np.vstack([X_normal, X_anom])

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_all)

        self.model = IsolationForest(
            n_estimators=150,
            contamination=0.06,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X_scaled)
        self.is_loaded = True

        # Save artifacts to model directory if directory exists
        try:
            os.makedirs(os.path.dirname(save_model_path), exist_ok=True)
            joblib.dump(self.model, save_model_path)
            joblib.dump(self.scaler, save_scaler_path)
            logger.info(f"Saved generated baseline models to {save_model_path}")
        except Exception as e:
            logger.warning(f"Could not persist baseline model files: {e}")

        self.model_metadata = {
            "source": "threatlens_trained_isolation_forest",
            "model_type": "IsolationForest",
            "n_estimators": 150,
            "contamination": 0.06,
            "features_expected": FEATURE_NAMES,
            "status": "active"
        }

    def _extract_feature_vector(self, packet: Dict[str, Any]) -> np.ndarray:
        """Convert a packet dictionary to a numeric 10-feature vector."""
        src_p = float(packet.get("source_port", packet.get("src_port", 44321)))
        dst_p = float(packet.get("destination_port", packet.get("dst_port", 80)))
        
        # Protocol
        p_raw = str(packet.get("protocol", "TCP")).upper()
        p_num = float(PROTOCOL_MAP.get(p_raw, 6))

        pkt_len = float(packet.get("packet_length", packet.get("length", 512)))
        dur = float(packet.get("duration_ms", packet.get("duration", 50)))
        b_in = float(packet.get("bytes_in", pkt_len))
        b_out = float(packet.get("bytes_out", pkt_len * 2))
        flags = float(packet.get("tcp_flags", packet.get("flags", 16)))
        
        flow_pkts = float(packet.get("flow_packets_per_sec", (b_in + b_out) / max(dur, 1.0)))
        flow_bytes = float(packet.get("flow_bytes_per_sec", flow_pkts * 64.0))

        return np.array([
            src_p, dst_p, p_num, pkt_len, dur, b_in, b_out, flags, flow_pkts, flow_bytes
        ], dtype=np.float64).reshape(1, -1)

    def _classify_attack_type(self, packet: Dict[str, Any], score: float) -> str:
        """Heuristic signature & pattern analysis for anomaly classification."""
        dst_p = int(packet.get("destination_port", packet.get("dst_port", 0)))
        proto = str(packet.get("protocol", "TCP")).upper()
        pkt_len = int(packet.get("packet_length", packet.get("length", 0)))
        flags = int(packet.get("tcp_flags", packet.get("flags", 0)))
        flow_pkts = float(packet.get("flow_packets_per_sec", 0))

        if flow_pkts > 500 or pkt_len > 60000:
            return "DDoS / Volumetric Flood"
        elif dst_p in [22, 3389, 21, 23] and score < -0.15:
            return "SSH/RDP Brute Force Attempt"
        elif dst_p in [80, 443, 8080] and pkt_len > 4000:
            return "SQLi / Web Payload Injection"
        elif flags in [0, 41, 255]:
            return "Stealth Port Scan (SYN/FIN Scan)"
        elif proto == "DNS" and (pkt_len > 1024 or score < -0.12):
            return "DNS Amplification / Tunneling"
        elif dst_p == 445 or dst_p == 139:
            return "SMB / Lateral Movement Exploit"
        elif score < -0.2:
            return "Zero-Day C2 Exfiltration"
        else:
            return "Behavioral Statistical Anomaly"

    def predict_packet(self, packet: Dict[str, Any]) -> Dict[str, Any]:
        """Score a single network packet against the Isolation Forest."""
        if not self.is_loaded or self.model is None:
            self.load_or_initialize_model()

        feat_vec = self._extract_feature_vector(packet)
        
        # Scale if scaler is available
        if self.scaler is not None:
            try:
                feat_vec = self.scaler.transform(feat_vec)
            except Exception:
                pass

        # Isolation Forest: decision_function returns anomaly score (negative = anomaly)
        # score_samples or decision_function
        try:
            raw_score = float(self.model.decision_function(feat_vec)[0])
            pred_label = int(self.model.predict(feat_vec)[0])  # -1 = anomaly, 1 = normal
        except Exception as e:
            logger.error(f"Prediction execution error: {e}")
            raw_score = 0.05
            pred_label = 1

        is_anomaly = (pred_label == -1) or (raw_score < settings.ANOMALY_THRESHOLD)

        # Normalize score into [0.0, 1.0] risk index (higher = more dangerous)
        # decision_function typically ranges from -0.5 (extreme anomaly) to +0.5 (normal)
        risk_index = round(float(np.clip((0.2 - raw_score) / 0.5, 0.0, 1.0)), 4)

        if not is_anomaly:
            severity = "BENIGN"
            attack_type = "Normal Traffic"
        else:
            if risk_index >= 0.85 or raw_score < -0.25:
                severity = "CRITICAL"
            elif risk_index >= 0.65 or raw_score < -0.15:
                severity = "HIGH"
            elif risk_index >= 0.45:
                severity = "MEDIUM"
            else:
                severity = "LOW"
            attack_type = self._classify_attack_type(packet, raw_score)

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(raw_score, 5),
            "risk_index": risk_index,
            "severity": severity,
            "attack_type": attack_type,
            "confidence": round(float(min(0.99, max(0.60, 0.5 + abs(raw_score) * 2))), 3),
            "features_analyzed": FEATURE_NAMES
        }

    def predict_batch(self, packets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Score a list of packets efficiently."""
        return [self.predict_packet(p) for p in packets]


ml_service = MLAnomalyService()
