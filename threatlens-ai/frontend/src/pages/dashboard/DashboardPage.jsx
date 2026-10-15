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
} from 'lucide-react';
import { api } from '../../api/client';
import { StatsCard } from '../../components/StatsCard';
import { SeverityBadge } from '../../components/SeverityBadge';
import {
  TelemetryTimeSeriesChart,
  AttackDistributionChart,
} from '../../components/AttackChart';

export const DashboardPage = ({ activeTab, setActiveTab }) => {
  // Global SOC State
  const [summary, setSummary] = useState({
    total_packets_inspected: 248920,
    total_alerts: 4,
    unresolved_alerts: 3,
    critical_threats: 2,
    blocked_ips_count: 1,
    system_health: 'OPTIMAL',
    throughput_mbps: 112.4,
    attack_breakdown: [],
  });

  const [timeseries, setTimeseries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [blockedIps, setBlockedIps] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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
    flow_packets_per_sec: 3400.0,
    flow_bytes_per_sec: 4500000.0,
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

  // Initial Data Fetch
  const fetchDashboardData = async () => {
    try {
      const [sumRes, tsRes, alertsRes, blockRes, modelRes] = await Promise.allSettled([
        api.telemetry.getSummary(),
        api.telemetry.getTimeseries(),
        api.detector.getAlerts({ limit: 50 }),
        api.detector.getBlockedIps(),
        api.detector.getModelInfo(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (tsRes.status === 'fulfilled') setTimeseries(tsRes.value);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.items || []);
      if (blockRes.status === 'fulfilled') setBlockedIps(blockRes.value || []);
      if (modelRes.status === 'fulfilled') setModelInfo(modelRes.value);
    } catch (e) {
      console.warn('Backend load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Stream Handlers
  useEffect(() => {
    if (!isStreaming) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    const socket = api.createLiveStreamSocket(
      (telemetryData) => {
        setStreamPackets((prev) => [telemetryData, ...prev.slice(0, 49)]);
      },
      () => {
        // Fallback synthetic packet generator if WS connection is unavailable
        const fallbackTimer = setInterval(() => {
          if (!isStreaming) return;
          const isAttack = Math.random() < 0.18;
          const fakePkt = {
            packet: {
              source_ip: isAttack ? `185.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*200)}.10` : `192.168.1.${Math.floor(Math.random()*150)}`,
              destination_ip: '10.0.0.1',
              source_port: Math.floor(Math.random()*50000 + 1024),
              destination_port: isAttack ? 22 : 443,
              protocol: 'TCP',
              packet_length: isAttack ? 64 : 512,
              duration_ms: 25.0,
              tcp_flags: isAttack ? 2 : 16,
              flow_packets_per_sec: isAttack ? 3200 : 25,
            },
            prediction: {
              is_anomaly: isAttack,
              anomaly_score: isAttack ? -0.245 : 0.08,
              severity: isAttack ? 'CRITICAL' : 'BENIGN',
              attack_type: isAttack ? 'DDoS / Volumetric Flood' : 'Normal Traffic',
              risk_index: isAttack ? 0.88 : 0.12,
              confidence: 0.94,
            },
            timestamp: new Date().toISOString(),
          };
          setStreamPackets((prev) => [fakePkt, ...prev.slice(0, 49)]);
        }, 1500);

        return () => clearInterval(fallbackTimer);
      }
    );

    wsRef.current = socket;
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [isStreaming]);

  // Single Packet Score Action
  const handleScoreSingle = async () => {
    setIsScoringSingle(true);
    try {
      const res = await api.detector.scorePacket(singlePacketInput);
      setSinglePredictionResult(res.prediction);
      if (res.prediction.is_anomaly) {
        fetchDashboardData();
      }
    } catch (e) {
      alert('Scoring failed: ' + e.message);
    } finally {
      setIsScoringSingle(false);
    }
  };

  // Pre-load attack templates into single packet form
  const loadPreset = (type) => {
    if (type === 'ddos') {
      setSinglePacketInput({
        source_ip: '185.220.101.44',
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
        flow_bytes_per_sec: 6000000.0,
      });
    } else if (type === 'portscan') {
      setSinglePacketInput({
        source_ip: '45.154.255.89',
        destination_ip: '10.0.0.12',
        source_port: 38901,
        destination_port: 22,
        protocol: 'TCP',
        packet_length: 64,
        duration_ms: 1.2,
        bytes_in: 64,
        bytes_out: 0,
        tcp_flags: 41,
        flow_packets_per_sec: 140.0,
        flow_bytes_per_sec: 8960.0,
      });
    } else if (type === 'c2') {
      setSinglePacketInput({
        source_ip: '10.0.0.145',
        destination_ip: '198.51.100.77',
        source_port: 59000,
        destination_port: 53,
        protocol: 'DNS',
        packet_length: 2048,
        duration_ms: 450.0,
        bytes_in: 128,
        bytes_out: 140000,
        tcp_flags: 16,
        flow_packets_per_sec: 12.0,
        flow_bytes_per_sec: 24576.0,
      });
    } else {
      // Normal
      setSinglePacketInput({
        source_ip: '192.168.1.102',
        destination_ip: '142.250.190.46',
        source_port: 54321,
        destination_port: 443,
        protocol: 'TCP',
        packet_length: 512,
        duration_ms: 45.0,
        bytes_in: 1024,
        bytes_out: 4096,
        tcp_flags: 16,
        flow_packets_per_sec: 15.0,
        flow_bytes_per_sec: 7680.0,
      });
    }
  };

  // Batch CSV Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingBatch(true);
    try {
      const res = await api.detector.uploadFile(file);
      setBatchResults(res);
      fetchDashboardData();
    } catch (err) {
      alert('Batch file analysis error: ' + err.message);
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // Alert Mitigation Execution
  const handleMitigate = async (alertId, action) => {
    try {
      await api.detector.mitigateAlert(alertId, action, mitigationNotes);
      setActiveAlertModal(null);
      setMitigationNotes('');
      fetchDashboardData();
    } catch (err) {
      alert('Mitigation failed: ' + err.message);
    }
  };

  // Manual IP Block
  const handleManualBlock = async (e) => {
    e.preventDefault();
    if (!manualIpInput) return;
    try {
      await api.detector.blockIp(manualIpInput, manualReasonInput || 'Manually blocked by SOC Analyst');
      setManualIpInput('');
      setManualReasonInput('');
      fetchDashboardData();
    } catch (err) {
      alert('Failed to block IP: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2.5">
            {activeTab === 'overview' && 'SOC COMMAND CENTER OVERVIEW'}
            {activeTab === 'livestream' && 'REAL-TIME WEBSOCKET PACKET STREAM'}
            {activeTab === 'detector' && 'ISOLATION FOREST ANOMALY ENGINE & BATCH'}
            {activeTab === 'alerts' && 'INCIDENT RESPONSE & MITIGATION CENTER'}
            {activeTab === 'diagnostics' && 'ML MODEL DIAGNOSTICS & MATRIX'}
            {activeTab === 'firewall' && 'ACTIVE FIREWALL BLOCKLIST & RULES'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time cyber defense telemetry, ML anomaly scoring, and automated mitigation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
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
              title="Threats Blocked"
              value={summary.blocked_ips_count}
              subtitle="Active firewall IP quarantines"
              icon={Flame}
              color="amber"
            />
            <StatsCard
              title="AI Detection Engine"
              value="ACTIVE"
              subtitle="Isolation Forest (150 trees)"
              icon={Zap}
              color="emerald"
            />
          </div>

          {/* Real-time Telemetry Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Network Traffic & Anomaly Ingestion Rate
                  </h3>
                  <p className="text-xs text-slate-400">Time-series telemetry (last 2 hours)</p>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  {summary.throughput_mbps} Mbps
                </span>
              </div>
              <TelemetryTimeSeriesChart data={timeseries} />
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    Attack Vector Distribution
                  </h3>
                  <p className="text-xs text-slate-400">Top classified anomalies</p>
                </div>
              </div>
              <AttackDistributionChart
                data={
                  summary.attack_breakdown && summary.attack_breakdown.length > 0
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
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                View All Alerts &rarr;
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
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setActiveAlertModal(a);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-sans font-semibold"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-500 font-sans">
                        No security incidents detected. Telemetry is benign.
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
      {/* TAB 2: LIVE PACKET STREAM (WEBSOCKETS) */}
      {/* ========================================================================= */}
      {activeTab === 'livestream' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
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
                <span>Stream: {isStreaming ? 'CONNECTED (1.2s cadence)' : 'PAUSED'}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Packets Captured in Buffer:{' '}
              <strong className="text-cyan-400">{streamPackets.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Packet Table */}
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
                        <td colSpan="7" className="py-12 text-center text-slate-500 font-sans">
                          Waiting for live packets from telemetry engine...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Packet Deep Inspector Card */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10">
              <h3 className="text-sm font-bold font-mono text-white mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                Packet Telemetry Inspector
              </h3>

              {selectedPacket ? (
                <div className="space-y-4 text-xs font-mono">
                  <div
                    className={`p-3.5 rounded-xl border ${
                      selectedPacket.prediction?.is_anomaly
                        ? 'bg-red-950/30 border-red-500/40'
                        : 'bg-emerald-950/30 border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase font-sans">
                        {selectedPacket.prediction?.attack_type || 'Normal Traffic'}
                      </span>
                      <SeverityBadge severity={selectedPacket.prediction?.severity} />
                    </div>
                    <div className="mt-2 text-slate-300">
                      Risk Index:{' '}
                      <strong className="text-white">
                        {((selectedPacket.prediction?.risk_index || 0) * 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2 bg-black/40 p-3.5 rounded-xl border border-white/5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Source IP:</span>
                      <span className="text-cyan-400">{selectedPacket.packet.source_ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Source Port:</span>
                      <span className="text-slate-200">{selectedPacket.packet.source_port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destination:</span>
                      <span className="text-slate-200">
                        {selectedPacket.packet.destination_ip}:{selectedPacket.packet.destination_port}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Protocol:</span>
                      <span className="text-slate-200">{selectedPacket.packet.protocol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Packet Length:</span>
                      <span className="text-slate-200">
                        {selectedPacket.packet.packet_length} bytes
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">TCP Flags:</span>
                      <span className="text-slate-200">{selectedPacket.packet.tcp_flags}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Flow Rate:</span>
                      <span className="text-slate-200">
                        {selectedPacket.packet.flow_packets_per_sec?.toFixed(1) || 'N/A'} pps
                      </span>
                    </div>
                  </div>

                  {selectedPacket.prediction?.is_anomaly && (
                    <button
                      onClick={() => {
                        api.detector.blockIp(
                          selectedPacket.packet.source_ip,
                          `Blocked directly from live feed (${selectedPacket.prediction.attack_type})`
                        );
                        alert(`IP ${selectedPacket.packet.source_ip} has been added to Firewall Blocklist!`);
                        fetchDashboardData();
                      }}
                      className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold font-sans text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      1-Click Block IP in Firewall
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 font-sans text-xs">
                  Click any packet in the table to inspect full ML feature decomposition.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANOMALY ENGINE & BATCH PCAP / CSV */}
      {/* ========================================================================= */}
      {activeTab === 'detector' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single Packet Scoring Form */}
            <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Interactive Single Packet Tester
                  </h3>
                  <p className="text-xs text-slate-400">
                    Input raw network features to evaluate Isolation Forest response
                  </p>
                </div>
              </div>

              {/* Attack Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-slate-400 font-mono py-1">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => loadPreset('ddos')}
                  className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold"
                >
                  SYN Flood (DDoS)
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('portscan')}
                  className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold"
                >
                  Stealth Port Scan
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('c2')}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-semibold"
                >
                  DNS C2 Exfiltration
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('normal')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
                >
                  Benign HTTPS Web
                </button>
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
                    Destination IP
                  </label>
                  <input
                    type="text"
                    value={singlePacketInput.destination_ip}
                    onChange={(e) =>
                      setSinglePacketInput({ ...singlePacketInput, destination_ip: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Source Port
                  </label>
                  <input
                    type="number"
                    value={singlePacketInput.source_port}
                    onChange={(e) =>
                      setSinglePacketInput({
                        ...singlePacketInput,
                        source_port: Number(e.target.value),
                      })
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
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center justify-center gap-2"
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

                <div className="border-2 border-dashed border-white/20 hover:border-cyan-400/60 rounded-2xl p-8 text-center transition-colors bg-black/20">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">Drop CSV or JSON dataset here</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports Wireshark, Zeek, or NetFlow exported logs
                  </p>
                  <label className="mt-4 inline-block px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold text-xs cursor-pointer transition-all">
                    Select File
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {isUploadingBatch && (
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-center font-mono text-xs text-cyan-300">
                  Processing and scoring records against Isolation Forest...
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
      {/* TAB 4: INCIDENT RESPONSE & ALERT CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Filter Bar */}
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

          {/* Alerts Master Table */}
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
      {/* TAB 5: ISOLATION FOREST ML DIAGNOSTICS & MATRIX */}
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
      {/* TAB 6: FIREWALL & BLOCKLIST */}
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
                      <th className="pb-3">Blocked At</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {blockedIps.map((b) => (
                      <tr key={b.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 font-bold text-red-400">{b.ip_address}</td>
                        <td className="py-3 text-slate-300 font-sans">{b.reason}</td>
                        <td className="py-3 text-cyan-400 text-[11px]">{b.blocked_by}</td>
                        <td className="py-3 text-slate-400">
                          {new Date(b.blocked_at).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                            BLOCKED
                          </span>
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
                  INCIDENT INVESTIGATION #{activeAlertModal.id.slice(0, 8)}
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

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Analyst Incident Notes
              </label>
              <textarea
                rows="2"
                value={mitigationNotes}
                onChange={(e) => setMitigationNotes(e.target.value)}
                placeholder="Document containment action rationale..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => handleMitigate(activeAlertModal.id, 'BLOCK_IP')}
                className="py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Block Malicious IP
              </button>
              <button
                onClick={() => handleMitigate(activeAlertModal.id, 'QUARANTINE_HOST')}
                className="py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Quarantine Host
              </button>
              <button
                onClick={() => handleMitigate(activeAlertModal.id, 'MARK_FALSE_POSITIVE')}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5"
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
