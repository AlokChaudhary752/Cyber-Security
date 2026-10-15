# 🛡️ ThreatLens AI — AI Cybersecurity Operations Platform

**ThreatLens AI** is a production-grade, modern, dark-themed AI Cybersecurity Operations Center (SOC) platform for real-time network anomaly and intrusion detection. It leverages unsupervised Machine Learning (**Isolation Forest**) to score live packet telemetry and detect zero-day cyber attacks.

---

## ⚡ Key Features

- **Isolation Forest ML Engine**: Multi-tree anomaly scoring of 10-dimensional network vectors (ports, protocol, packet size, flow duration, TCP flags, packets/sec).
- **Real-Time WebSocket Packet Stream**: Sub-second live packet telemetry inspection with live play/pause controls.
- **SOC Command Center**: Incident dashboards, time-series telemetry charts, and threat vector distribution powered by Recharts.
- **Manual & Batch Testing**: Interactive single-packet parameter slider tester & batch PCAP/CSV drag-and-drop anomaly parser.
- **Incident Response & 1-Click Mitigation**: Instant IP firewall blocking, host isolation, and audit trail logging.
- **Production FastAPI Backend**: Async SQLAlchemy, PostgreSQL/SQLite ORM, JWT authentication (bcrypt), and OpenAPI docs at `/docs`.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Vite + React Frontend                │
│    (Landing Page | Live Stream | SOC Incident Center)  │
└───────────────────────────▲────────────────────────────┘
                            │ REST / WebSocket
┌───────────────────────────▼────────────────────────────┐
│                    FastAPI Backend Core                │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Auth & JWT  │  Detector API  │  Telemetry Stream   │ │
│ └───────────────────────┬────────────────────────────┘ │
│                         │                              │
│       ┌─────────────────▼─────────────────┐            │
│       │ Isolation Forest ML Service (.pkl)│            │
│       └─────────────────┬─────────────────┘            │
│                         │                              │
│       ┌─────────────────▼─────────────────┐            │
│       │ Async PostgreSQL / SQLite ORM     │            │
│       └───────────────────────────────────┘            │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Backend Setup (FastAPI)

```bash
cd threatlens-ai/backend

# 1. Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch Backend
python run.py
```
> Backend will be running at: `http://localhost:8000`  
> OpenAPI Swagger Documentation: `http://localhost:8000/docs`

---

### 2. Frontend Setup (React + Vite)

```bash
cd threatlens-ai/frontend

# 1. Install npm packages
npm install

# 2. Launch development server
npm run dev
```
> Frontend will be running at: `http://localhost:5173`

---

## 🔑 Default Credentials (Pre-seeded)

- **Username**: `analyst`
- **Password**: `ThreatLens@2025`
- **Role**: `Lead SOC Analyst (admin)`

---

## 📊 Network Telemetry Feature Vector

The Isolation Forest scores packets across 10 network telemetry dimensions:
1. `src_port` — Source Port (0 - 65535)
2. `dst_port` — Destination Port (22, 80, 443, 53, etc.)
3. `protocol_num` — Protocol code (6=TCP, 17=UDP, 1=ICMP)
4. `packet_length` — Packet length in bytes
5. `duration_ms` — Flow duration in milliseconds
6. `bytes_in` — Inbound byte volume
7. `bytes_out` — Outbound byte volume
8. `tcp_flags` — TCP flag bitmask (SYN, ACK, FIN, PSH)
9. `flow_packets_per_sec` — Packet ingestion rate
10. `flow_bytes_per_sec` — Bandwidth utilization rate
