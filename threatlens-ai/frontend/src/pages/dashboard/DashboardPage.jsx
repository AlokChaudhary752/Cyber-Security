import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Activity,
  Radio,
  Flame,
  Binary,
  Download,
  Upload,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  Sliders,
  FileSpreadsheet,
  Zap,
  Terminal,
  Server,
  Layers,
  Sparkles,
  Globe,
  Crosshair,
  Workflow,
  CheckCircle2,
  Trash2,
  Cpu,
} from 'lucide-react';
import { api } from '../../api/client';
import { StatsCard } from '../../components/StatsCard';
import { SeverityBadge } from '../../components/SeverityBadge';
import {
  TelemetryTimeSeriesChart,
  AttackDistributionChart,
} from '../../components/AttackChart';
import { GlobalAttackMap } from '../../components/GlobalAttackMap';
import { MitreMatrix } from '../../components/MitreMatrix';
import { VulnerabilityScanner } from '../../components/VulnerabilityScanner';
import { SoarPlaybooks } from '../../components/SoarPlaybooks';
import { LiveModelDetector } from '../../components/LiveModelDetector';
import {
  INITIAL_ALERTS,
  INITIAL_BLOCKED_IPS,
  scoreTelemetryLocally,
  cyberAudio,
} from '../../utils/cyberSimulation';

export const DashboardPage = ({ activeTab, setActiveTab }) => {
  // Global SOC State
  const [summary, setSummary] = useState({
    total_packets_inspected: 248920,
    total_alerts: 5,
    unresolved_alerts: 4,
    critical_threats: 2,
    blocked_ips_count: 3,
    system_health: 'OPTIMAL',
    throughput_mbps: 112.4,
    attack_breakdown: [
      { name: 'DDoS SYN Flood', count: 8 },
      { name: 'SSH Brute Force', count: 5 },
      { name: 'Log4j RCE Probe', count: 4 },
      { name: 'C2 DNS Tunnel', count: 3 },
      { name: 'Port Scan Recon', count: 2 },
    ],
  });

  const [timeseries, setTimeseries] = useState([
    { time: '22:00', packets_sec: 120, anomalies: 0 },
    { time: '22:05', packets_sec: 145, anomalies: 1 },
    { time: '22:10', packets_sec: 210, anomalies: 0 },
    { time: '22:15', packets_sec: 180, anomalies: 0 },
    { time: '22:20', packets_sec: 4200, anomalies: 8 },
    { time: '22:25', packets_sec: 380, anomalies: 2 },
    { time: '22:30', packets_sec: 195, anomalies: 1 },
    { time: '22:35', packets_sec: 160, anomalies: 0 },
  ]);

  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('threatlens_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  const [blockedIps, setBlockedIps] = useState(() => {
    const saved = localStorage.getItem('threatlens_blocked_ips');
    return saved ? JSON.parse(saved) : INITIAL_BLOCKED_IPS;
  });

  const [modelInfo, setModelInfo] = useState({
    model_name: 'IsolationForest-v1.4',
    metadata: {
      n_estimators: 150,
      contamination: 0.06,
      max_samples: 'auto',
      features_count: 10,
    },
  });

  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Live Stream State
  const [streamPackets, setStreamPackets] = useState([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const wsRef = useRef(null);

  // Single Packet Tester State
  const [singlePacketInput, setSinglePacketInput] = useState({
    source_ip: '185.220.101.5',
    destination_ip: '10.0.0.80',
    source_port: 48192,
    destination_port: 443,
    protocol: 'TCP',
    packet_length: 1500,
    duration_ms: 12.0,
    bytes_in: 120000,
    bytes_out: 400,
    tcp_flags: 2,
    flow_packets_per_sec: 4200.0,
    flow_bytes_per_sec: 6300000.0,
  });
  const [singlePredictionResult, setSinglePredictionResult] = useState(null);
  const [isScoringSingle, setIsScoringSingle] = useState(false);

  // Batch Upload State
  const [batchResults, setBatchResults] = useState(null);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  // Alerts Filter & Modal State
  const [alertFilterSeverity, setAlertFilterSeverity] = useState('');
  const [alertFilterStatus, setAlertFilterStatus] = useState('');
  const [activeAlertModal, setActiveAlertModal] = useState(null);
  const [mitigationNotes, setMitigationNotes] = useState('');

  // Manual Block IP State
  const [manualIpInput, setManualIpInput] = useState('');
  const [manualReasonInput, setManualReasonInput] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Persist alerts and blocked IPs
  useEffect(() => {
    localStorage.setItem('threatlens_alerts', JSON.stringify(alerts));
    const unresolved = alerts.filter((a) => a.status === 'UNRESOLVED' || a.status === 'INVESTIGATING').length;
    const critical = alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'MITIGATED').length;
    setSummary((prev) => ({
      ...prev,
      total_alerts: alerts.length,
      unresolved_alerts: unresolved,
      critical_threats: critical,
    }));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('threatlens_blocked_ips', JSON.stringify(blockedIps));
    setSummary((prev) => ({
      ...prev,
      blocked_ips_count: blockedIps.length,
    }));
  }, [blockedIps]);

  // Initial Data Fetch & Health Probe
  const fetchDashboardData = async () => {
    try {
      const [sumRes, tsRes, alertsRes, blockRes, modelRes] = await Promise.allSettled([
        api.telemetry.getSummary(),
        api.telemetry.getTimeseries(),
        api.detector.getAlerts({ limit: 50 }),
        api.detector.getBlockedIps(),
        api.detector.getModelInfo(),
      ]);

      let backendReached = false;
      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
        backendReached = true;
      }
      if (tsRes.status === 'fulfilled') setTimeseries(tsRes.value);
      if (alertsRes.status === 'fulfilled' && alertsRes.value.items?.length) {
        setAlerts(alertsRes.value.items);
      }
      if (blockRes.status === 'fulfilled' && blockRes.value?.length) {
        setBlockedIps(blockRes.value);
      }
      if (modelRes.status === 'fulfilled') setModelInfo(modelRes.value);

      setBackendOnline(backendReached);
    } catch (e) {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 20000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Stream Handlers with Resilient Fallback Generator
  useEffect(() => {
    if (!isStreaming) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    let fallbackTimer = null;
    const socket = api.createLiveStreamSocket(
      (telemetryData) => {
        setStreamPackets((prev) => [telemetryData, ...prev.slice(0, 49)]);
        setSummary((prev) => ({
          ...prev,
          total_packets_inspected: prev.total_packets_inspected + 1,
        }));
      },
      () => {
        // Fallback synthetic generator if backend WebSocket is offline
        if (fallbackTimer) clearInterval(fallbackTimer);
        fallbackTimer = setInterval(() => {
          if (!isStreaming) return;
          const isAttack = Math.random() < 0.22;
          const attackTemplates = [
            { type: 'DDoS SYN Flood', port: 443, pps: 4200, score: -0.34, sev: 'CRITICAL', risk: 0.94 },
            { type: 'SSH Brute Force', port: 22, pps: 180, score: -0.27, sev: 'HIGH', risk: 0.82 },
            { type: 'Log4j JNDI RCE Probe', port: 8080, pps: 650, score: -0.31, sev: 'CRITICAL', risk: 0.91 },
            { type: 'C2 DNS Beaconing', port: 53, pps: 45, score: -0.24, sev: 'HIGH', risk: 0.78 },
          ];
          const atk = isAttack ? attackTemplates[Math.floor(Math.random() * attackTemplates.length)] : null;

          const fakePkt = {
            packet: {
              source_ip: isAttack
                ? `185.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200 + 1)}`
                : `192.168.1.${Math.floor(Math.random() * 150 + 2)}`,
              destination_ip: '10.0.0.80',
              source_port: Math.floor(Math.random() * 50000 + 1024),
              destination_port: isAttack ? atk.port : 443,
              protocol: 'TCP',
              packet_length: isAttack ? 1500 : 512,
              duration_ms: isAttack ? 12.0 : 45.0,
              tcp_flags: isAttack ? 2 : 16,
              flow_packets_per_sec: isAttack ? atk.pps : 22,
              flow_bytes_per_sec: isAttack ? 6300000 : 11264,
            },
            prediction: {
              is_anomaly: isAttack,
              anomaly_score: isAttack ? atk.score : 0.09,
              severity: isAttack ? atk.sev : 'BENIGN',
              attack_type: isAttack ? atk.type : 'Normal Telemetry',
              risk_index: isAttack ? atk.risk : 0.08,
              confidence: 0.95,
            },
            timestamp: new Date().toISOString(),
          };

          setStreamPackets((prev) => [fakePkt, ...prev.slice(0, 49)]);
          setSummary((prev) => ({
            ...prev,
            total_packets_inspected: prev.total_packets_inspected + 1,
          }));
        }, 1600);
      }
    );

    wsRef.current = socket;
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [isStreaming]);

  // Single Packet Score Action (with seamless fallback)
  const handleScoreSingle = async () => {
    setIsScoringSingle(true);
    cyberAudio.playRadarPing();

    try {
      const res = await api.detector.scorePacket(singlePacketInput);
      setSinglePredictionResult(res.prediction);
      if (res.prediction.is_anomaly) {
        showToast(`🚨 Threat Detected: ${res.prediction.attack_type}`, 'warning');
      } else {
        showToast('✅ Benign Traffic Confirmed by Isolation Forest', 'success');
      }
    } catch (e) {
      // Local ML scoring simulation fallback
      const localResult = scoreTelemetryLocally(singlePacketInput);
      setSinglePredictionResult(localResult);

      if (localResult.is_anomaly) {
        cyberAudio.playAlertAlarm();
        showToast(`🚨 Flagged by Local iForest Engine: ${localResult.attack_type}`, 'warning');
      } else {
        showToast('✅ Benign Traffic Confirmed by Local iForest Engine', 'success');
      }
    } finally {
      setIsScoringSingle(false);
    }
  };

  // Pre-load attack presets
  const loadPreset = (type) => {
    if (type === 'ddos') {
      setSinglePacketInput({
        source_ip: '185.220.101.5',
        destination_ip: '10.0.0.80',
        source_port: 52190,
        destination_port: 443,
        protocol: 'TCP',
        packet_length: 1500,
        duration_ms: 5.0,
        bytes_in: 250000,
        bytes_out: 200,
        tcp_flags: 2,
        flow_packets_per_sec: 4500.0,
        flow_bytes_per_sec: 6750000.0,
      });
    } else if (type === 'brute') {
      setSinglePacketInput({
        source_ip: '103.245.236.19',
        destination_ip: '10.0.0.12',
        source_port: 59012,
        destination_port: 22,
        protocol: 'TCP',
        packet_length: 64,
        duration_ms: 15.0,
        bytes_in: 1200,
        bytes_out: 1200,
        tcp_flags: 24,
        flow_packets_per_sec: 195.0,
        flow_bytes_per_sec: 15600.0,
      });
    } else if (type === 'benign') {
      setSinglePacketInput({
        source_ip: '192.168.1.45',
        destination_ip: '10.0.0.1',
        source_port: 51234,
        destination_port: 443,
        protocol: 'TCP',
        packet_length: 512,
        duration_ms: 45.0,
        bytes_in: 1024,
        bytes_out: 4096,
        tcp_flags: 16,
        flow_packets_per_sec: 22.0,
        flow_bytes_per_sec: 11264.0,
      });
    }
  };

  // Client-side CSV / Telemetry Analyzer
  const processCsvText = (csvText, fileName) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('File has no telemetry rows');

    const headers = lines[0].split(',').map((h) => h.trim());
    let anomaliesCount = 0;
    const discoveredAlerts = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length < 5) continue;

      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx];
      });

      const scoreResult = scoreTelemetryLocally(rowObj);
      if (scoreResult.is_anomaly) {
        anomaliesCount++;
        discoveredAlerts.push({
          id: `ALT-CSV-${Date.now()}-${i}`,
          timestamp: new Date().toISOString(),
          source_ip: rowObj.source_ip || '185.220.101.44',
          destination_ip: rowObj.destination_ip || '10.0.0.80',
          source_port: Number(rowObj.source_port || 443),
          destination_port: Number(rowObj.destination_port || 443),
          protocol: rowObj.protocol || 'TCP',
          packet_length: Number(rowObj.packet_length || 1500),
          anomaly_score: scoreResult.anomaly_score,
          severity: scoreResult.severity,
          attack_type: scoreResult.attack_type,
          status: 'UNRESOLVED',
          details: `Flagged from batch file: ${fileName}`,
        });
      }
    }

    if (discoveredAlerts.length > 0) {
      setAlerts((prev) => [...discoveredAlerts, ...prev]);
    }

    setBatchResults({
      filename: fileName,
      rows_processed: lines.length - 1,
      anomalies_detected: anomaliesCount,
      alerts_generated: discoveredAlerts.length,
    });

    showToast(
      `Analyzed ${lines.length - 1} rows: Found ${anomaliesCount} cyber anomalies!`,
      anomaliesCount > 0 ? 'warning' : 'success'
    );
  };

  // File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBatch(true);
    cyberAudio.playRadarPing();

    try {
      const text = await file.text();
      processCsvText(text, file.name);
    } catch (err) {
      showToast('Batch file error: ' + err.message, 'error');
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // One-click Sample Telemetry Loader
  const handleLoadSampleDataset = () => {
    setIsUploadingBatch(true);
    cyberAudio.playRadarPing();

    setTimeout(() => {
      const sampleCsv = `source_ip,destination_ip,source_port,destination_port,protocol,packet_length,duration_ms,bytes_in,bytes_out,tcp_flags,flow_packets_per_sec,flow_bytes_per_sec
192.168.1.45,10.0.0.1,51234,443,TCP,512,45.0,1024,4096,16,22.0,11264.0
192.168.1.88,142.250.190.46,49120,80,TCP,340,32.0,512,1024,16,15.0,5100.0
185.220.101.5,10.0.0.80,48192,443,TCP,1500,12.0,120000,400,2,4200.0,6300000.0
45.154.255.89,10.0.0.22,59012,22,TCP,840,120.0,4200,3800,24,195.0,37800.0
194.26.29.112,10.0.0.12,33011,445,TCP,64,2.5,64,0,41,120.0,7680.0
10.0.0.145,198.51.100.77,52340,53,DNS,2048,450.0,256,120000,16,15.0,30720.0
192.168.1.102,1.1.1.1,53120,53,UDP,128,15.0,128,256,0,10.0,1280.0
185.220.101.44,10.0.0.80,52190,443,TCP,1500,5.0,250000,200,2,4500.0,6750000.0
192.168.1.15,10.0.0.1,60123,8080,TCP,480,28.0,960,2048,16,18.0,8640.0
194.26.29.15,10.0.0.80,35000,443,TCP,4820,240.0,14500,89000,24,45.0,217000.0`;

      processCsvText(sampleCsv, 'sample_telemetry.csv (Built-in PCAP Vector)');
      setIsUploadingBatch(false);
    }, 600);
  };

  // Alert Mitigation Execution
  const handleMitigate = async (alertId, action) => {
    cyberAudio.playRadarPing();
    const targetAlert = alerts.find((a) => a.id === alertId);

    // Update alert status
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id === alertId) {
          return {
            ...a,
            status: action === 'MARK_FALSE_POSITIVE' ? 'FALSE_POSITIVE' : 'MITIGATED',
            mitigation_notes: mitigationNotes,
            mitigated_at: new Date().toISOString(),
          };
        }
        return a;
      })
    );

    // If block IP action selected, add to active firewall
    if (action === 'BLOCK_IP' && targetAlert) {
      const alreadyBlocked = blockedIps.some((b) => b.ip_address === targetAlert.source_ip);
      if (!alreadyBlocked) {
        setBlockedIps((prev) => [
          {
            id: `BLK-${Date.now()}`,
            ip_address: targetAlert.source_ip,
            reason: `Mitigated alert: ${targetAlert.attack_type}`,
            blocked_by: 'Alex Mercer (SOC Lead)',
            blocked_at: new Date().toISOString(),
            packets_dropped: Math.floor(Math.random() * 5000 + 1200),
            status: 'ACTIVE',
          },
          ...prev,
        ]);
      }
      showToast(`IP ${targetAlert.source_ip} blocked in perimeter firewall!`, 'success');
    } else if (action === 'QUARANTINE_HOST') {
      showToast(`Host ${targetAlert.destination_ip} isolated to VLAN 999!`, 'success');
    } else {
      showToast('Incident marked as benign false positive.', 'success');
    }

    setActiveAlertModal(null);
    setMitigationNotes('');
  };

  // Manual IP Block
  const handleManualBlock = (e) => {
    e.preventDefault();
    if (!manualIpInput) return;

    const alreadyBlocked = blockedIps.some((b) => b.ip_address === manualIpInput);
    if (alreadyBlocked) {
      showToast(`IP ${manualIpInput} is already on the firewall blocklist.`, 'warning');
      return;
    }

    setBlockedIps((prev) => [
      {
        id: `BLK-${Date.now()}`,
        ip_address: manualIpInput,
        reason: manualReasonInput || 'Manually blocked by SOC Analyst',
        blocked_by: 'Alex Mercer (SOC Lead)',
        blocked_at: new Date().toISOString(),
        packets_dropped: 0,
        status: 'ACTIVE',
      },
      ...prev,
    ]);

    showToast(`IP ${manualIpInput} added to active firewall blocklist!`, 'success');
    setManualIpInput('');
    setManualReasonInput('');
  };

  // Unblock IP
  const handleUnblockIp = (ipAddress) => {
    setBlockedIps((prev) => prev.filter((b) => b.ip_address !== ipAddress));
    showToast(`IP ${ipAddress} unblocked and firewall rule purged.`, 'success');
  };

  // Export full Forensics report JSON
  const exportForensicsReport = () => {
    const reportData = {
      threatlens_version: '2.0-Production',
      generated_at: new Date().toISOString(),
      analyst: 'Alex Mercer (Lead SOC Analyst)',
      soc_summary: summary,
      incidents: alerts,
      active_firewall_rules: blockedIps,
      ml_model_diagnostics: modelInfo,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ThreatLens_SOC_Forensics_Report_${Date.now()}.json`;
    a.click();
    showToast('Forensics JSON report generated & downloaded!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-xl border text-xs font-mono font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl animate-bounce ${
            toastMessage.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-300'
              : toastMessage.type === 'error'
              ? 'bg-red-950/90 border-red-500/50 text-red-300'
              : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2.5">
            {activeTab === 'overview' && 'SOC COMMAND CENTER OVERVIEW'}
            {activeTab === 'livemodel' && 'LIVE AI MODEL — REAL-TIME INFERENCE & ATTACK SIMULATOR'}
            {activeTab === 'threatmap' && 'GLOBAL CYBER ATTACK MAP & GEOLOCATION'}
            {activeTab === 'livestream' && 'REAL-TIME WEBSOCKET PACKET STREAM'}
            {activeTab === 'mitre' && 'MITRE ATT&CK ENTERPRISE THREAT MATRIX'}
            {activeTab === 'scanner' && 'TARGET VULNERABILITY & PORT SCANNER'}
            {activeTab === 'detector' && 'ISOLATION FOREST ANOMALY ENGINE & BATCH'}
            {activeTab === 'alerts' && 'INCIDENT RESPONSE & MITIGATION CENTER'}
            {activeTab === 'playbooks' && 'SOAR INCIDENT AUTOMATION PLAYBOOKS'}
            {activeTab === 'diagnostics' && 'ML MODEL DIAGNOSTICS & MATRIX'}
            {activeTab === 'firewall' && 'ACTIVE FIREWALL BLOCKLIST & RULES'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Production-grade AI Cybersecurity Operations Center (SOC)</span>
            <span className="text-slate-600">•</span>
            <span className={backendOnline ? 'text-emerald-400' : 'text-cyan-400 font-mono'}>
              {backendOnline
                ? '🟢 FastAPI Backend Connected'
                : '⚡ Interactive AI Simulation Mode Active'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportForensicsReport}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all font-mono"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Forensics Report
          </button>

          <button
            onClick={() => {
              fetchDashboardData();
              showToast('SOC Telemetry Synchronized!', 'success');
            }}
            className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-400 flex items-center gap-1.5 transition-all font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Sync Telemetry
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SOC COMMAND CENTER OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live Working Model Hero Card */}
          <div
            onClick={() => setActiveTab('livemodel')}
            className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/40 border border-cyan-500/40 hover:border-cyan-400 cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-4 group shadow-[0_0_25px_rgba(0,242,254,0.12)]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-mono text-white">
                    LIVE WORKING MODEL — REAL-TIME INFERENCE & ATTACK SIMULATOR
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                    LIVE DETECT ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  150-tree Isolation Forest continuously scoring live telemetry. Click to test live attack injection (DDoS, SSH Brute, Log4j RCE, C2) and watch real-time detection!
                </p>
              </div>
            </div>

            <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-mono font-bold text-xs hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all shrink-0 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Launch Live Model HUD &rarr;
            </button>
          </div>

          {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Packets Inspected"
              value={summary.total_packets_inspected.toLocaleString()}
              subtitle="Live stream throughput"
              icon={Activity}
              color="cyan"
              change="+14.2%"
            />
            <StatsCard
              title="Active Incidents"
              value={summary.unresolved_alerts}
              subtitle={`${summary.critical_threats} Critical / High priority`}
              icon={ShieldAlert}
              color="red"
              change="+2 new"
            />
            <StatsCard
              title="Perimeter Blocked IPs"
              value={blockedIps.length}
              subtitle="Firewall drop rules active"
              icon={Flame}
              color="orange"
              change="Zero-day shields"
            />
            <StatsCard
              title="Threat Containment MTTR"
              value="28s"
              subtitle="Mean time to remediation"
              icon={Binary}
              color="emerald"
              change="99.98% SLA"
            />
          </div>

          {/* Time Series Telemetry Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Network Traffic & Anomaly Ingress Volume
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time telemetry stream throughput vs. Isolation Forest anomaly scores
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  LIVE WINDOW
                </span>
              </div>
              <TelemetryTimeSeriesChart data={timeseries} />
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Threat Attack Classification
                </h3>
                <p className="text-xs text-slate-400">Top flagged adversary techniques</p>
              </div>
              <AttackDistributionChart
                data={
                  summary.attack_breakdown.length
                    ? summary.attack_breakdown
                    : [
                        { name: 'DDoS Flood', count: 8 },
                        { name: 'Port Scan', count: 5 },
                        { name: 'SSH Brute', count: 3 },
                        { name: 'SQLi Web', count: 2 },
                        { name: 'C2 Exfil', count: 2 },
                      ]
                }
              />
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('threatmap')}
              className="p-4 rounded-xl glass-panel border border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">Global Attack Map</h4>
                  <p className="text-[11px] text-slate-400">Geospatial hostile IP tracker</p>
                </div>
              </div>
              <span className="text-xs text-cyan-400 font-mono">&rarr;</span>
            </div>

            <div
              onClick={() => setActiveTab('scanner')}
              className="p-4 rounded-xl glass-panel border border-white/10 hover:border-orange-500/50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400">
                  <Crosshair className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">Vulnerability Hunter</h4>
                  <p className="text-[11px] text-slate-400">Scan open ports & CVE exploits</p>
                </div>
              </div>
              <span className="text-xs text-orange-400 font-mono">&rarr;</span>
            </div>

            <div
              onClick={() => setActiveTab('playbooks')}
              className="p-4 rounded-xl glass-panel border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Workflow className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono">SOAR Playbooks</h4>
                  <p className="text-[11px] text-slate-400">1-click automated response</p>
                </div>
              </div>
              <span className="text-xs text-purple-400 font-mono">&rarr;</span>
            </div>
          </div>

          {/* Recent Security Incidents Feed */}
          <div className="p-5 rounded-2xl glass-panel border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Recent High-Risk Security Alerts
                </h3>
                <p className="text-xs text-slate-400">Anomalies flagged by Isolation Forest</p>
              </div>
              <button
                onClick={() => setActiveTab('alerts')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 font-mono"
              >
                View All Incidents ({alerts.length}) &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Source IP</th>
                    <th className="pb-3">Destination</th>
                    <th className="pb-3">Attack Classification</th>
                    <th className="pb-3">Anomaly Score</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {alerts.slice(0, 5).map((a) => (
                    <tr key={a.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 text-slate-400">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 font-semibold text-cyan-400">{a.source_ip}</td>
                      <td className="py-3 text-slate-300">
                        {a.destination_ip}:{a.destination_port} ({a.protocol})
                      </td>
                      <td className="py-3 text-white font-sans font-semibold">{a.attack_type}</td>
                      <td className="py-3 text-red-400 font-bold">{a.anomaly_score.toFixed(4)}</td>
                      <td className="py-3">
                        <SeverityBadge severity={a.severity} />
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.status === 'MITIGATED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : a.status === 'FALSE_POSITIVE'
                              ? 'bg-slate-500/20 text-slate-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setActiveAlertModal(a)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-sans font-semibold"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LIVE WORKING MODEL & ATTACK SIMULATOR (REAL-TIME DETECT) */}
      {/* ========================================================================= */}
      {activeTab === 'livemodel' && (
        <LiveModelDetector
          onBlockIp={(ip, reason) => {
            setBlockedIps((prev) => {
              if (prev.some((b) => b.ip_address === ip)) return prev;
              return [
                {
                  id: `BLK-${Date.now()}`,
                  ip_address: ip,
                  reason,
                  blocked_by: 'ThreatLens Live AI Model',
                  blocked_at: new Date().toISOString(),
                  packets_dropped: Math.floor(Math.random() * 2000 + 500),
                  status: 'ACTIVE',
                },
                ...prev,
              ];
            });
            showToast(`Attacker IP ${ip} auto-blocked in firewall!`, 'success');
          }}
          onIncidentDetected={(incident) => {
            setAlerts((prev) => [incident, ...prev]);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GLOBAL CYBER ATTACK MAP (NEW FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'threatmap' && (
        <GlobalAttackMap
          onInvestigateAlert={(atk) => {
            setActiveAlertModal({
              id: `GEO-${Date.now()}`,
              timestamp: new Date().toISOString(),
              source_ip: atk.source.asn,
              destination_ip: '10.0.0.1 (SOC Datacenter)',
              destination_port: 443,
              protocol: 'TCP',
              attack_type: atk.type,
              anomaly_score: -0.38,
              severity: atk.severity,
              status: 'UNRESOLVED',
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE PACKET STREAM (WEBSOCKETS) */}
      {/* ========================================================================= */}
      {activeTab === 'livestream' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all font-mono ${
                  isStreaming
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-4 h-4" /> Pause Feed
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Resume Feed
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span>Stream: {isStreaming ? 'ACTIVE CAPTURE (1.6s Cadence)' : 'PAUSED'}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Packets Captured in Buffer:{' '}
              <strong className="text-cyan-400">{streamPackets.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10">
              <h3 className="text-sm font-bold font-mono text-white mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                Live Ingested Packets Feed
              </h3>

              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#070d1e] z-10">
                    <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Source</th>
                      <th className="pb-2">Dest Port</th>
                      <th className="pb-2">Protocol</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Severity</th>
                      <th className="pb-2 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {streamPackets.map((item, idx) => {
                      const pkt = item.packet;
                      const pred = item.prediction;
                      const isAnom = pred?.is_anomaly;

                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedPacket(item)}
                          className={`cursor-pointer transition-colors ${
                            isAnom
                              ? 'bg-red-950/20 hover:bg-red-950/40 text-red-300'
                              : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 text-slate-400 text-[11px]">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 font-semibold text-cyan-400">{pkt.source_ip}</td>
                          <td className="py-2.5">
                            {pkt.destination_port} ({pkt.protocol})
                          </td>
                          <td className="py-2.5">{pkt.protocol}</td>
                          <td
                            className={`py-2.5 font-bold ${
                              isAnom ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {pred?.anomaly_score?.toFixed(3) || '0.00'}
                          </td>
                          <td className="py-2.5">
                            <SeverityBadge severity={pred?.severity} />
                          </td>
                          <td className="py-2.5 text-right">
                            <Eye className="w-4 h-4 inline-block text-slate-400 hover:text-cyan-400" />
                          </td>
                        </tr>
                      );
                    })}
                    {streamPackets.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-500 font-mono">
                          Waiting for live telemetry stream frames...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deep Packet Inspection Drawer */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Deep Packet Inspection (DPI)
              </h3>

              {selectedPacket ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Timestamp:</span>
                      <span className="text-white">
                        {new Date(selectedPacket.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Source:</span>
                      <span className="text-cyan-400 font-bold">
                        {selectedPacket.packet.source_ip}:{selectedPacket.packet.source_port}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destination:</span>
                      <span className="text-white">
                        {selectedPacket.packet.destination_ip}:
                        {selectedPacket.packet.destination_port}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Protocol:</span>
                      <span className="text-white">{selectedPacket.packet.protocol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payload Size:</span>
                      <span className="text-white">
                        {selectedPacket.packet.packet_length} Bytes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flow Rate:</span>
                      <span className="text-white">
                        {selectedPacket.packet.flow_packets_per_sec} pps
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border ${
                      selectedPacket.prediction.is_anomaly
                        ? 'bg-red-950/30 border-red-500/40'
                        : 'bg-emerald-950/30 border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">
                        {selectedPacket.prediction.attack_type}
                      </span>
                      <SeverityBadge severity={selectedPacket.prediction.severity} />
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Score: <strong>{selectedPacket.prediction.anomaly_score}</strong> | Risk Index:{' '}
                      <strong>{(selectedPacket.prediction.risk_index * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  {selectedPacket.prediction.is_anomaly && (
                    <button
                      onClick={() => {
                        setManualIpInput(selectedPacket.packet.source_ip);
                        setActiveTab('firewall');
                      }}
                      className="w-full py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-bold hover:bg-red-500/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Block Malicious Source IP
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 font-mono text-xs">
                  Click on any packet in the live feed to inspect its 10-dimensional ML tensor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MITRE ATT&CK MATRIX (NEW FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'mitre' && (
        <MitreMatrix
          onTriggerPlaybook={(tech) => {
            setActiveTab('playbooks');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: VULNERABILITY & PORT SCANNER (NEW FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'scanner' && (
        <VulnerabilityScanner
          onApplyVirtualPatch={(target) => {
            setBlockedIps((prev) => [
              {
                id: `BLK-${Date.now()}`,
                ip_address: target.ip,
                reason: `Virtual Patch for ${target.name} (CVSS ${target.cvss})`,
                blocked_by: 'Alex Mercer (SOC Lead)',
                blocked_at: new Date().toISOString(),
                packets_dropped: 0,
                status: 'ACTIVE',
              },
              ...prev,
            ]);
            showToast(`Virtual firewall patch deployed for ${target.ip}!`, 'success');
            setActiveTab('firewall');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ANOMALY ENGINE & BATCH ANALYZER */}
      {/* ========================================================================= */}
      {activeTab === 'detector' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single Packet Tester */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Interactive Single Packet ML Scorer
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inject mock network telemetry into the 150-tree Isolation Forest
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => loadPreset('ddos')}
                    className="px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono hover:bg-red-500/30"
                  >
                    DDoS Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('brute')}
                    className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono hover:bg-amber-500/30"
                  >
                    SSH Brute
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('benign')}
                    className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono hover:bg-emerald-500/30"
                  >
                    Benign
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Source IP
                  </label>
                  <input
                    type="text"
                    value={singlePacketInput.source_ip}
                    onChange={(e) =>
                      setSinglePacketInput({ ...singlePacketInput, source_ip: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Destination Port
                  </label>
                  <input
                    type="number"
                    value={singlePacketInput.destination_port}
                    onChange={(e) =>
                      setSinglePacketInput({
                        ...singlePacketInput,
                        destination_port: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Protocol
                  </label>
                  <select
                    value={singlePacketInput.protocol}
                    onChange={(e) =>
                      setSinglePacketInput({ ...singlePacketInput, protocol: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="DNS">DNS</option>
                    <option value="HTTPS">HTTPS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Packet Length (bytes)
                  </label>
                  <input
                    type="number"
                    value={singlePacketInput.packet_length}
                    onChange={(e) =>
                      setSinglePacketInput({
                        ...singlePacketInput,
                        packet_length: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Flow Packets / Sec
                  </label>
                  <input
                    type="number"
                    value={singlePacketInput.flow_packets_per_sec}
                    onChange={(e) =>
                      setSinglePacketInput({
                        ...singlePacketInput,
                        flow_packets_per_sec: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    TCP Flags (Mask)
                  </label>
                  <input
                    type="number"
                    value={singlePacketInput.tcp_flags}
                    onChange={(e) =>
                      setSinglePacketInput({
                        ...singlePacketInput,
                        tcp_flags: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleScoreSingle}
                disabled={isScoringSingle}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center justify-center gap-2 font-mono"
              >
                <Zap className="w-4 h-4" />
                {isScoringSingle ? 'Evaluating ML Forest...' : 'Execute ML Anomaly Scoring'}
              </button>

              {/* Single Scoring Result Display */}
              {singlePredictionResult && (
                <div
                  className={`p-4 rounded-xl border font-mono text-xs ${
                    singlePredictionResult.is_anomaly
                      ? 'bg-red-950/30 border-red-500/40 text-red-200'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold font-sans text-sm text-white">
                      {singlePredictionResult.is_anomaly
                        ? `🚨 THREAT DETECTED: ${singlePredictionResult.attack_type}`
                        : '✅ BENIGN TRAFFIC CONFIRMED'}
                    </span>
                    <SeverityBadge severity={singlePredictionResult.severity} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      Anomaly Score:{' '}
                      <strong className="text-white">
                        {singlePredictionResult.anomaly_score}
                      </strong>
                    </div>
                    <div>
                      Risk Index:{' '}
                      <strong className="text-white">
                        {(singlePredictionResult.risk_index * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      Confidence:{' '}
                      <strong className="text-white">
                        {(singlePredictionResult.confidence * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div>
                      Isolation Verdict:{' '}
                      <strong className="text-white">
                        {singlePredictionResult.is_anomaly ? 'Outlier (-1)' : 'Inlier (+1)'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Batch File Upload Analyzer */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  Batch PCAP / CSV Telemetry Analyzer
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Upload captured PCAP exported CSV or JSON files to run automated bulk anomaly
                  classification.
                </p>

                <div className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-6 text-center transition-colors bg-black/20 space-y-3">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
                  <p className="text-xs font-semibold text-white">Drop CSV or JSON dataset here</p>
                  <p className="text-[11px] text-slate-400">
                    Supports Wireshark, Zeek, or NetFlow exported logs
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <label className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold text-xs cursor-pointer transition-all">
                      Select Custom CSV
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleLoadSampleDataset}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-500/40 text-emerald-400 font-semibold text-xs transition-all font-mono"
                    >
                      ⚡ Load sample_telemetry.csv
                    </button>
                  </div>
                </div>
              </div>

              {isUploadingBatch && (
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-center font-mono text-xs text-cyan-300 animate-pulse">
                  Processing and scoring records against Isolation Forest ensemble...
                </div>
              )}

              {batchResults && (
                <div className="p-4 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-white font-bold font-sans">
                    <span>Batch Analysis Complete</span>
                    <span className="text-cyan-400">{batchResults.filename}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      Rows Evaluated: <strong>{batchResults.rows_processed}</strong>
                    </div>
                    <div>
                      Anomalies Found:{' '}
                      <strong className="text-red-400">{batchResults.anomalies_detected}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✓ All detected anomalies automatically saved into SOC Incident Center.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: INCIDENT RESPONSE & ALERT CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Filters:
              </div>

              <select
                value={alertFilterSeverity}
                onChange={(e) => setAlertFilterSeverity(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={alertFilterStatus}
                onChange={(e) => setAlertFilterStatus(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">All Statuses</option>
                <option value="UNRESOLVED">Unresolved</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="MITIGATED">Mitigated</option>
                <option value="FALSE_POSITIVE">False Positive</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Total Incidents: <strong className="text-white">{alerts.length}</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-panel border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Source IP</th>
                    <th className="pb-3">Destination</th>
                    <th className="pb-3">Attack Type</th>
                    <th className="pb-3">Anomaly Score</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {alerts
                    .filter((a) => (alertFilterSeverity ? a.severity === alertFilterSeverity : true))
                    .filter((a) => (alertFilterStatus ? a.status === alertFilterStatus : true))
                    .map((a) => (
                      <tr key={a.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 text-slate-400">
                          {new Date(a.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 font-semibold text-cyan-400">{a.source_ip}</td>
                        <td className="py-3 text-slate-300">
                          {a.destination_ip}:{a.destination_port}
                        </td>
                        <td className="py-3 text-white font-sans font-bold">{a.attack_type}</td>
                        <td className="py-3 text-red-400 font-bold">
                          {a.anomaly_score.toFixed(4)}
                        </td>
                        <td className="py-3">
                          <SeverityBadge severity={a.severity} />
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.status === 'MITIGATED'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : a.status === 'FALSE_POSITIVE'
                                ? 'bg-slate-500/20 text-slate-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => setActiveAlertModal(a)}
                            className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-sans font-semibold"
                          >
                            Mitigate / Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500 font-sans">
                        No alerts matching current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SOAR INCIDENT PLAYBOOKS (NEW FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'playbooks' && <SoarPlaybooks />}

      {/* ========================================================================= */}
      {/* TAB 9: ISOLATION FOREST ML DIAGNOSTICS & MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Binary className="w-4 h-4 text-cyan-400" />
                Isolation Forest Parameters
              </h3>

              <div className="space-y-2.5 text-xs font-mono bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Algorithm:</span>
                  <span className="text-cyan-400 font-bold">iForest (Ensemble)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimators (Trees):</span>
                  <span className="text-white">{modelInfo?.metadata?.n_estimators || 150}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contamination Ratio:</span>
                  <span className="text-amber-400">
                    {modelInfo?.metadata?.contamination || 0.06} (6%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Inference Latency:</span>
                  <span className="text-emerald-400">~1.2 ms / packet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine Health:</span>
                  <span className="text-emerald-400">ONLINE</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Network Telemetry Feature Matrix
              </h3>
              <p className="text-xs text-slate-400">
                10-dimensional numeric tensor utilized for computing multi-tree isolation depths:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                {[
                  'Source Port (0-65535)',
                  'Destination Port',
                  'Protocol Enum (TCP/UDP/ICMP)',
                  'Packet Length (Bytes)',
                  'Flow Duration (ms)',
                  'Bytes Inbound',
                  'Bytes Outbound',
                  'TCP Flags Bitmask',
                  'Flow Packets / Sec',
                  'Flow Bytes / Sec',
                ].map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 text-[11px]">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: FIREWALL & BLOCKLIST */}
      {/* ========================================================================= */}
      {activeTab === 'firewall' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manual Block Form */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-400" />
                Manual IP Firewall Quarantine
              </h3>
              <p className="text-xs text-slate-400">
                Instantly inject IP ban rules into the active perimeter defense.
              </p>

              <form onSubmit={handleManualBlock} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 185.220.101.5"
                    value={manualIpInput}
                    onChange={(e) => setManualIpInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Reason</label>
                  <input
                    type="text"
                    placeholder="Threat actor reconnaissance"
                    value={manualReasonInput}
                    onChange={(e) => setManualReasonInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Add to Firewall Blocklist
                </button>
              </form>
            </div>

            {/* Blocked IP Table */}
            <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10">
              <h3 className="text-sm font-bold font-mono text-white mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Active Perimeter Blocked IPs ({blockedIps.length})
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="pb-3">Blocked IP</th>
                      <th className="pb-3">Reason</th>
                      <th className="pb-3">Enforcer</th>
                      <th className="pb-3">Packets Dropped</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {blockedIps.map((b) => (
                      <tr key={b.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 font-bold text-red-400">{b.ip_address}</td>
                        <td className="py-3 text-slate-300 font-sans">{b.reason}</td>
                        <td className="py-3 text-cyan-400 text-[11px]">{b.blocked_by}</td>
                        <td className="py-3 text-slate-400">
                          {b.packets_dropped?.toLocaleString() || '1,420'}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleUnblockIp(b.ip_address)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 text-xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                    {blockedIps.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-500 font-sans">
                          No active IP blocks in firewall.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALERT INVESTIGATION & MITIGATION MODAL */}
      {/* ========================================================================= */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-6 rounded-2xl glass-panel-glow border border-cyan-500/30 relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold font-mono text-white">
                  INCIDENT INVESTIGATION #{activeAlertModal.id.slice(0, 12)}
                </h3>
              </div>
              <button
                onClick={() => setActiveAlertModal(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-black/40 p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-400">Source IP:</span>{' '}
                <strong className="text-cyan-400">{activeAlertModal.source_ip}</strong>
              </div>
              <div>
                <span className="text-slate-400">Destination:</span>{' '}
                <strong className="text-white">
                  {activeAlertModal.destination_ip}:{activeAlertModal.destination_port}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Protocol:</span>{' '}
                <strong className="text-white">{activeAlertModal.protocol}</strong>
              </div>
              <div>
                <span className="text-slate-400">Attack Type:</span>{' '}
                <strong className="text-red-400 font-sans">{activeAlertModal.attack_type}</strong>
              </div>
              <div>
                <span className="text-slate-400">Anomaly Score:</span>{' '}
                <strong className="text-red-400">{activeAlertModal.anomaly_score}</strong>
              </div>
              <div>
                <span className="text-slate-400">Severity:</span>{' '}
                <SeverityBadge severity={activeAlertModal.severity} />
              </div>
            </div>

            {activeAlertModal.details && (
              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-300 font-mono">
                <span className="text-slate-500 block mb-1">Forensic Details:</span>
                {activeAlertModal.details}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Analyst Incident Notes
              </label>
              <textarea
                rows="2"
                value={mitigationNotes}
                onChange={(e) => setMitigationNotes(e.target.value)}
                placeholder="Document containment action rationale..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleMitigate(activeAlertModal.id, 'BLOCK_IP')}
                className="py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                Block Malicious IP
              </button>
              <button
                onClick={() => handleMitigate(activeAlertModal.id, 'QUARANTINE_HOST')}
                className="py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Quarantine Host
              </button>
              <button
                onClick={() => handleMitigate(activeAlertModal.id, 'MARK_FALSE_POSITIVE')}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Dismiss as Benign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
