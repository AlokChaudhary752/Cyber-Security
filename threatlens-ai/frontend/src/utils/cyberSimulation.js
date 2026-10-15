// ThreatLens AI - Cyber Defense Simulation & Anomaly Math Engine

// Initial realistic security incidents for SOC Command Center
export const INITIAL_ALERTS = [
  {
    id: 'ALT-8921-X',
    timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    source_ip: '185.220.101.5',
    destination_ip: '10.0.0.80',
    source_port: 48192,
    destination_port: 443,
    protocol: 'TCP',
    packet_length: 1500,
    anomaly_score: -0.3421,
    severity: 'CRITICAL',
    attack_type: 'DDoS / Volumetric SYN Flood',
    mitre_technique: 'T1498 - Network Denial of Service',
    mitre_tactic: 'Impact',
    confidence: 0.98,
    status: 'UNRESOLVED',
    country: 'Russia',
    country_code: 'RU',
    details: 'Sustained 4,200 pps burst with invalid TCP window and SYN flags targeting public ingress gateway.',
  },
  {
    id: 'ALT-7740-C',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    source_ip: '103.245.236.19',
    destination_ip: '10.0.0.12',
    source_port: 59104,
    destination_port: 22,
    protocol: 'TCP',
    packet_length: 64,
    anomaly_score: -0.2815,
    severity: 'HIGH',
    attack_type: 'SSH Automated Brute Force',
    mitre_technique: 'T1110 - Brute Force',
    mitre_tactic: 'Credential Access',
    confidence: 0.94,
    status: 'INVESTIGATING',
    country: 'China',
    country_code: 'CN',
    details: '240 failed SSH authentication handshakes within 60 seconds from unauthorized foreign ASN.',
  },
  {
    id: 'ALT-6102-K',
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    source_ip: '45.154.255.88',
    destination_ip: '10.0.0.44',
    source_port: 33410,
    destination_port: 8080,
    protocol: 'TCP',
    packet_length: 890,
    anomaly_score: -0.2984,
    severity: 'CRITICAL',
    attack_type: 'Log4j / Remote Code Execution Probe',
    mitre_technique: 'T1190 - Exploit Public-Facing Application',
    mitre_tactic: 'Initial Access',
    confidence: 0.96,
    status: 'UNRESOLVED',
    country: 'Netherlands',
    country_code: 'NL',
    details: 'JNDI injection signature ${jndi:ldap://...} detected in User-Agent header stream.',
  },
  {
    id: 'ALT-5419-B',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    source_ip: '194.26.29.112',
    destination_ip: '10.0.0.99',
    source_port: 5353,
    destination_port: 53,
    protocol: 'UDP',
    packet_length: 1420,
    anomaly_score: -0.2190,
    severity: 'HIGH',
    attack_type: 'Cobalt Strike C2 DNS Tunneling',
    mitre_technique: 'T1071.004 - Application Layer Protocol: DNS',
    mitre_tactic: 'Command and Control',
    confidence: 0.91,
    status: 'MITIGATED',
    country: 'Brazil',
    country_code: 'BR',
    details: 'Base64 encoded sub-domain queries exhibiting high entropy periodic beaconing pattern (every 30s).',
  },
  {
    id: 'ALT-4890-S',
    timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    source_ip: '91.240.118.17',
    destination_ip: '10.0.0.2',
    source_port: 41002,
    destination_port: 80,
    protocol: 'TCP',
    packet_length: 412,
    anomaly_score: -0.1782,
    severity: 'MEDIUM',
    attack_type: 'Port Scan / Host Reconnaissance',
    mitre_technique: 'T1046 - Network Service Discovery',
    mitre_tactic: 'Discovery',
    confidence: 0.88,
    status: 'FALSE_POSITIVE',
    country: 'Germany',
    country_code: 'DE',
    details: 'Sequential SYN sweep traversing ports 21 through 1024; identified as Shodan research scanner.',
  },
];

// Initial Firewall rules
export const INITIAL_BLOCKED_IPS = [
  {
    id: 'BLK-001',
    ip_address: '185.220.101.5',
    reason: 'Volumetric DDoS Flood Mitigation (Isolation Forest Rule)',
    blocked_by: 'Alex Mercer (SOC Lead)',
    blocked_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    packets_dropped: 148920,
    status: 'ACTIVE',
  },
  {
    id: 'BLK-002',
    ip_address: '45.154.255.88',
    reason: 'Exploit Attempt: Log4j CVE-2021-44228 JNDI Injection',
    blocked_by: 'ThreatLens Auto-Defense Engine',
    blocked_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    packets_dropped: 2940,
    status: 'ACTIVE',
  },
  {
    id: 'BLK-003',
    ip_address: '194.26.29.112',
    reason: 'Malicious C2 Beaconing Channel - Cobalt Strike profile',
    blocked_by: 'Alex Mercer (SOC Lead)',
    blocked_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    packets_dropped: 812,
    status: 'ACTIVE',
  },
];

// Client-side Isolation Forest Scoring Algorithm (Realistic Heuristic)
export const scoreTelemetryLocally = (packet) => {
  const pps = Number(packet.flow_packets_per_sec || 0);
  const bps = Number(packet.flow_bytes_per_sec || 0);
  const pktLen = Number(packet.packet_length || 0);
  const dstPort = Number(packet.destination_port || 0);
  const tcpFlags = Number(packet.tcp_flags || 0);
  const duration = Number(packet.duration_ms || 1);

  let anomalyScore = 0.12; // positive = normal/inlier
  let attackType = 'Benign Traffic';
  let severity = 'BENIGN';
  let isAnomaly = false;

  // DDoS volumetric rule
  if (pps > 2500 || bps > 3000000 || (pps > 1000 && pktLen < 120)) {
    anomalyScore = -0.32 - Math.min(0.2, (pps / 10000) * 0.1);
    attackType = 'DDoS / Volumetric Flood';
    severity = 'CRITICAL';
    isAnomaly = true;
  }
  // SSH / RDP Brute Force
  else if ((dstPort === 22 || dstPort === 3389) && duration < 30 && pps > 150) {
    anomalyScore = -0.26;
    attackType = 'Credential Brute Force';
    severity = 'HIGH';
    isAnomaly = true;
  }
  // Port Scan / Discovery
  else if (tcpFlags === 2 && pktLen < 80 && pps > 80 && duration < 10) {
    anomalyScore = -0.22;
    attackType = 'Reconnaissance Port Scan';
    severity = 'MEDIUM';
    isAnomaly = true;
  }
  // Data Exfiltration anomaly
  else if (bps > 1500000 && pktLen > 1400 && duration > 500) {
    anomalyScore = -0.29;
    attackType = 'Suspicious High-Volume Data Exfiltration';
    severity = 'HIGH';
    isAnomaly = true;
  }
  // Web Exploit probe on 80/443/8080
  else if ((dstPort === 80 || dstPort === 8080 || dstPort === 443) && pktLen > 1200 && pps > 600) {
    anomalyScore = -0.24;
    attackType = 'Web Application Exploit (SQLi/XSS)';
    severity = 'HIGH';
    isAnomaly = true;
  }

  const riskIndex = isAnomaly ? Math.min(0.99, Math.abs(anomalyScore) * 2.4) : Math.max(0.04, 0.15 - anomalyScore);
  const confidence = isAnomaly ? 0.92 + Math.random() * 0.07 : 0.95;

  return {
    is_anomaly: isAnomaly,
    anomaly_score: Number(anomalyScore.toFixed(4)),
    severity,
    attack_type: attackType,
    risk_index: Number(riskIndex.toFixed(3)),
    confidence: Number(confidence.toFixed(2)),
  };
};

// Web Audio API Subtle Sound Effects (Radar Ping & Threat Siren)
class CyberAudioService {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playRadarPing() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playAlertAlarm() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, this.ctx.currentTime);
      osc.frequency.setValueAtTime(420, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch (e) {
      // Ignore audio restriction
    }
  }
}

export const cyberAudio = new CyberAudioService();
