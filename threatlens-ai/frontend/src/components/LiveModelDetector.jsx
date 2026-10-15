import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Zap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  Sliders,
  RotateCcw,
  Flame,
  Lock,
  Radio,
  Binary,
  Cpu,
  BarChart2,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { SeverityBadge } from './SeverityBadge';
import { scoreTelemetryLocally, cyberAudio } from '../utils/cyberSimulation';
import { api } from '../api/client';

export const LiveModelDetector = ({ onBlockIp, onIncidentDetected }) => {
  const [isRunning, setIsRunning] = useState(true);
  const [streamSpeed, setStreamSpeed] = useState(1200); // ms per packet
  const [autoMitigate, setAutoMitigate] = useState(true);

  // Active injected scenario: 'normal', 'ddos', 'brute', 'log4j', 'portscan', 'c2'
  const [activeScenario, setActiveScenario] = useState('normal');

  // Live evaluated packet & ML prediction
  const [currentPacket, setCurrentPacket] = useState({
    source_ip: '192.168.1.105',
    destination_ip: '10.0.0.80',
    source_port: 51234,
    destination_port: 443,
    protocol: 'TCP',
    packet_length: 512,
    duration_ms: 35.0,
    flow_packets_per_sec: 18.0,
    flow_bytes_per_sec: 9216.0,
    tcp_flags: 16,
  });

  const [currentPrediction, setCurrentPrediction] = useState({
    is_anomaly: false,
    anomaly_score: 0.124,
    severity: 'BENIGN',
    attack_type: 'Benign Web Traffic',
    risk_index: 0.08,
    confidence: 0.95,
  });

  // Rolling time-series chart of anomaly scores (last 20 points)
  const [scoreHistory, setScoreHistory] = useState([
    { time: '0s', score: 0.12, threshold: -0.1 },
    { time: '1s', score: 0.14, threshold: -0.1 },
    { time: '2s', score: 0.11, threshold: -0.1 },
    { time: '3s', score: 0.13, threshold: -0.1 },
    { time: '4s', score: 0.10, threshold: -0.1 },
  ]);

  // Statistics counters
  const [stats, setStats] = useState({
    packetsScored: 1420,
    anomaliesCaught: 38,
    inferencesPerSec: 1.2,
    avgInferenceTimeMs: 1.15,
  });

  // Live detection event log
  const [detectionLogs, setDetectionLogs] = useState([]);

  // Generate packet based on active scenario
  const getNextPacket = (scenario) => {
    const timestamp = new Date().toISOString();

    if (scenario === 'ddos') {
      return {
        source_ip: `185.${Math.floor(Math.random() * 200 + 20)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200 + 1)}`,
        destination_ip: '10.0.0.80',
        source_port: Math.floor(Math.random() * 40000 + 1024),
        destination_port: 443,
        protocol: 'TCP',
        packet_length: 1500,
        duration_ms: Number((Math.random() * 8 + 1).toFixed(1)),
        bytes_in: Math.floor(Math.random() * 300000 + 100000),
        bytes_out: 400,
        tcp_flags: 2, // SYN Flood
        flow_packets_per_sec: Number((Math.random() * 1500 + 3500).toFixed(1)),
        flow_bytes_per_sec: Number((Math.random() * 2000000 + 5000000).toFixed(1)),
        timestamp,
      };
    } else if (scenario === 'brute') {
      return {
        source_ip: `103.245.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200 + 1)}`,
        destination_ip: '10.0.0.12',
        source_port: Math.floor(Math.random() * 30000 + 20000),
        destination_port: 22,
        protocol: 'TCP',
        packet_length: 64,
        duration_ms: 15.0,
        bytes_in: 1200,
        bytes_out: 1200,
        tcp_flags: 24, // PSH-ACK
        flow_packets_per_sec: Number((Math.random() * 100 + 150).toFixed(1)),
        flow_bytes_per_sec: 15600.0,
        timestamp,
      };
    } else if (scenario === 'log4j') {
      return {
        source_ip: `45.154.255.${Math.floor(Math.random() * 200 + 1)}`,
        destination_ip: '10.0.0.44',
        source_port: Math.floor(Math.random() * 30000 + 10000),
        destination_port: 8080,
        protocol: 'TCP',
        packet_length: 1420,
        duration_ms: 45.0,
        bytes_in: 1420,
        bytes_out: 256,
        tcp_flags: 24,
        flow_packets_per_sec: Number((Math.random() * 300 + 600).toFixed(1)),
        flow_bytes_per_sec: 900000.0,
        timestamp,
      };
    } else if (scenario === 'portscan') {
      return {
        source_ip: `91.240.118.${Math.floor(Math.random() * 200 + 1)}`,
        destination_ip: '10.0.0.1',
        source_port: Math.floor(Math.random() * 40000 + 10000),
        destination_port: Math.floor(Math.random() * 1024 + 1),
        protocol: 'TCP',
        packet_length: 64,
        duration_ms: 2.5,
        bytes_in: 64,
        bytes_out: 0,
        tcp_flags: 2, // SYN scan
        flow_packets_per_sec: Number((Math.random() * 40 + 90).toFixed(1)),
        flow_bytes_per_sec: 7680.0,
        timestamp,
      };
    } else if (scenario === 'c2') {
      return {
        source_ip: '10.0.0.145',
        destination_ip: `198.51.100.${Math.floor(Math.random() * 200 + 1)}`,
        source_port: Math.floor(Math.random() * 20000 + 40000),
        destination_port: 53,
        protocol: 'UDP',
        packet_length: 2048,
        duration_ms: 450.0,
        bytes_in: 256,
        bytes_out: 120000,
        tcp_flags: 0,
        flow_packets_per_sec: 15.0,
        flow_bytes_per_sec: 30720.0,
        timestamp,
      };
    } else {
      // Normal Benign Traffic
      return {
        source_ip: `192.168.1.${Math.floor(Math.random() * 150 + 10)}`,
        destination_ip: '10.0.0.80',
        source_port: Math.floor(Math.random() * 50000 + 1024),
        destination_port: Math.random() < 0.8 ? 443 : 80,
        protocol: 'TCP',
        packet_length: Math.floor(Math.random() * 800 + 200),
        duration_ms: Number((Math.random() * 40 + 15).toFixed(1)),
        bytes_in: Math.floor(Math.random() * 2048 + 512),
        bytes_out: Math.floor(Math.random() * 4096 + 1024),
        tcp_flags: 16, // ACK
        flow_packets_per_sec: Number((Math.random() * 15 + 10).toFixed(1)),
        flow_bytes_per_sec: Number((Math.random() * 20000 + 5000).toFixed(1)),
        timestamp,
      };
    }
  };

  // Main Live Detection Loop
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(async () => {
      const pkt = getNextPacket(activeScenario);
      let pred = null;

      // Try FastAPI backend first, fall back seamlessly to local Isolation Forest
      try {
        const res = await api.detector.scorePacket(pkt);
        pred = res.prediction;
      } catch (err) {
        pred = scoreTelemetryLocally(pkt);
      }

      setCurrentPacket(pkt);
      setCurrentPrediction(pred);

      // Update counters
      setStats((prev) => ({
        ...prev,
        packetsScored: prev.packetsScored + 1,
        anomaliesCaught: pred.is_anomaly ? prev.anomaliesCaught + 1 : prev.anomaliesCaught,
      }));

      // Update rolling decision waveform
      setScoreHistory((prev) => {
        const nextTime = new Date().toLocaleTimeString().slice(3, 8);
        const nextItem = {
          time: nextTime,
          score: pred.anomaly_score,
          threshold: -0.1,
          isAnomaly: pred.is_anomaly,
        };
        return [...prev.slice(-18), nextItem];
      });

      // If anomaly detected, trigger alerts & mitigation
      if (pred.is_anomaly) {
        cyberAudio.playAlertAlarm();

        const logEntry = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          ip: pkt.source_ip,
          type: pred.attack_type,
          score: pred.anomaly_score,
          severity: pred.severity,
          mitigated: autoMitigate,
        };

        setDetectionLogs((prev) => [logEntry, ...prev.slice(0, 14)]);

        if (autoMitigate && onBlockIp) {
          onBlockIp(pkt.source_ip, `Auto-mitigated live ${pred.attack_type}`);
        }

        if (onIncidentDetected) {
          onIncidentDetected({
            id: `LIVE-${Date.now()}`,
            timestamp: new Date().toISOString(),
            source_ip: pkt.source_ip,
            destination_ip: pkt.destination_ip,
            source_port: pkt.source_port,
            destination_port: pkt.destination_port,
            protocol: pkt.protocol,
            packet_length: pkt.packet_length,
            anomaly_score: pred.anomaly_score,
            severity: pred.severity,
            attack_type: pred.attack_type,
            status: autoMitigate ? 'MITIGATED' : 'UNRESOLVED',
          });
        }
      }
    }, streamSpeed);

    return () => clearInterval(timer);
  }, [isRunning, activeScenario, streamSpeed, autoMitigate]);

  // Anomaly score gauge percentage: Maps [-0.5, 0.2] to [100%, 0%] danger
  const gaugeRiskPercent = Math.min(
    100,
    Math.max(0, Math.round(((0.2 - currentPrediction.anomaly_score) / 0.7) * 100))
  );

  return (
    <div className="space-y-6">
      {/* Top Engine Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
            <Cpu className="w-5 h-5 text-black" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-white">
                LIVE MACHINE LEARNING ANOMALY DETECTION ENGINE
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                REAL-TIME INFERENCE ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Model: IsolationForest (150 trees) • Feature Tensor: 10 Dimensions • Decision Threshold: -0.100
            </p>
          </div>
        </div>

        {/* Engine Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stream Play/Pause */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isRunning
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'PAUSE INGEST' : 'RESUME INGEST'}
          </button>

          {/* Speed Selector */}
          <select
            value={streamSpeed}
            onChange={(e) => setStreamSpeed(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
          >
            <option value="600">⚡ Turbo (600ms)</option>
            <option value="1200">Normal (1.2s)</option>
            <option value="2500">Slow (2.5s)</option>
          </select>

          {/* Auto-Mitigate Toggle */}
          <button
            onClick={() => setAutoMitigate(!autoMitigate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              autoMitigate
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Auto-Drop: {autoMitigate ? 'ENABLED' : 'OFF'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ATTACK SIMULATION INJECTION BAR - LIVE DEMO CONTROLLER */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl glass-panel-glow border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            LIVE ATTACK INJECTION SIMULATOR (Test Model Response Instantly)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Click any button to inject real cyber attack telemetry into the live model stream:
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => {
              setActiveScenario('normal');
              cyberAudio.playRadarPing();
            }}
            className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
              activeScenario === 'normal'
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Normal Traffic</span>
          </button>

          <button
            onClick={() => {
              setActiveScenario('ddos');
              cyberAudio.playAlertAlarm();
            }}
            className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
              activeScenario === 'ddos'
                ? 'bg-red-500/25 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(255,42,95,0.3)] animate-pulse'
                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-red-400" />
            <span>💥 SYN DDoS Flood</span>
          </button>

          <button
            onClick={() => {
              setActiveScenario('brute');
              cyberAudio.playAlertAlarm();
            }}
            className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
              activeScenario === 'brute'
                ? 'bg-orange-500/25 border-orange-500/60 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.3)] animate-pulse'
                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 text-orange-400" />
            <span>💥 SSH Brute Force</span>
          </button>

          <button
            onClick={() => {
              setActiveScenario('log4j');
              cyberAudio.playAlertAlarm();
            }}
            className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
              activeScenario === 'log4j'
                ? 'bg-red-500/25 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(255,42,95,0.3)] animate-pulse'
                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>💥 Log4j RCE Probe</span>
          </button>

          <button
            onClick={() => {
              setActiveScenario('portscan');
              cyberAudio.playAlertAlarm();
            }}
            className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
              activeScenario === 'portscan'
                ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse'
                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>💥 Port Sweep Scan</span>
          </button>

          <button
            onClick={() => {
              setActiveScenario('c2');
              cyberAudio.playAlertAlarm();
            }}
            className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
              activeScenario === 'c2'
                ? 'bg-purple-500/25 border-purple-500/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse'
                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-purple-400" />
            <span>💥 C2 DNS Exfil</span>
          </button>
        </div>
      </div>

      {/* Main Real-Time Detection HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Gauge & Live Classification Verdict */}
        <div
          className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
            currentPrediction.is_anomaly
              ? 'bg-red-950/20 border-red-500/50 shadow-[0_0_30px_rgba(255,42,95,0.15)]'
              : 'glass-panel border-white/10'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-slate-400">ISOLATION FOREST VERDICT</span>
              <SeverityBadge severity={currentPrediction.severity} />
            </div>

            {/* Attack Classification Headline */}
            <div className="mb-4">
              <h3
                className={`text-xl font-bold font-mono tracking-tight ${
                  currentPrediction.is_anomaly ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {currentPrediction.is_anomaly
                  ? `🚨 ${currentPrediction.attack_type.toUpperCase()}`
                  : '✅ BENIGN NETWORK TELEMETRY'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Evaluated across 150 Isolation Trees in ~{stats.avgInferenceTimeMs}ms
              </p>
            </div>

            {/* Circular Gauge / Danger Meter */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Live Anomaly Risk:</span>
                <span
                  className={`font-bold ${
                    gaugeRiskPercent > 60
                      ? 'text-red-400'
                      : gaugeRiskPercent > 30
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {gaugeRiskPercent}% DANGER
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    gaugeRiskPercent > 60
                      ? 'bg-gradient-to-r from-amber-500 to-red-500'
                      : gaugeRiskPercent > 30
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${gaugeRiskPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>0.0 (Safe Inlier)</span>
                <span>Threshold: -0.100</span>
                <span>-0.50 (Hostile Outlier)</span>
              </div>
            </div>

            {/* Decision boundary & confidence values */}
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-500 text-[10px] block">DECISION SCORE</span>
                <span
                  className={`text-base font-bold ${
                    currentPrediction.anomaly_score < -0.1 ? 'text-red-400' : 'text-cyan-400'
                  }`}
                >
                  {currentPrediction.anomaly_score > 0 ? '+' : ''}
                  {currentPrediction.anomaly_score}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-slate-500 text-[10px] block">ML CONFIDENCE</span>
                <span className="text-base font-bold text-white">
                  {(currentPrediction.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {currentPrediction.is_anomaly && autoMitigate && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                IP Auto-Quarantined in Firewall
              </span>
              <span className="font-bold text-white">{currentPacket.source_ip}</span>
            </div>
          )}
        </div>

        {/* Real-Time Decision Waveform (Oscilloscope Chart) */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Real-Time ML Anomaly Decision Waveform
              </h3>
              <p className="text-xs text-slate-400">
                Continuous rolling stream of decision function outputs (Below red dashed line = Threat detected)
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              ROLLING BUFFER
            </span>
          </div>

          {/* Recharts Live Line Chart */}
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff2a5f" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[-0.5, 0.3]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070d1e',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                />
                <ReferenceLine
                  y={-0.1}
                  stroke="#ff2a5f"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Anomaly Threshold (-0.10)',
                    fill: '#ff2a5f',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Anomaly Score"
                  stroke="#00f2fe"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#liveScoreGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Real-Time Packet Vector Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-2 border-t border-white/5">
            <div className="p-2 rounded-lg bg-black/30">
              <span className="text-slate-500 text-[10px] block">SOURCE IP</span>
              <span className="text-cyan-400 font-semibold truncate block">
                {currentPacket.source_ip}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-black/30">
              <span className="text-slate-500 text-[10px] block">PORT & PROTO</span>
              <span className="text-slate-200">
                {currentPacket.destination_port} / {currentPacket.protocol}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-black/30">
              <span className="text-slate-500 text-[10px] block">PACKETS / SEC</span>
              <span
                className={`font-bold ${
                  currentPacket.flow_packets_per_sec > 1000 ? 'text-red-400' : 'text-slate-200'
                }`}
              >
                {currentPacket.flow_packets_per_sec} pps
              </span>
            </div>
            <div className="p-2 rounded-lg bg-black/30">
              <span className="text-slate-500 text-[10px] block">PACKET SIZE</span>
              <span className="text-slate-200">{currentPacket.packet_length} Bytes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Detection Events Table */}
      <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <h3 className="text-sm font-bold font-mono text-white">
              Live Threat Interception Feed ({stats.anomaliesCaught} Anomalies Detected)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Scored: <strong className="text-white">{stats.packetsScored}</strong>
          </span>
        </div>

        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                <th className="pb-2">Time</th>
                <th className="pb-2">Attacker IP</th>
                <th className="pb-2">Attack Classification</th>
                <th className="pb-2">Anomaly Score</th>
                <th className="pb-2">Severity</th>
                <th className="pb-2 text-right">Perimeter Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {detectionLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2 text-slate-400">{log.time}</td>
                  <td className="py-2 text-cyan-400 font-bold">{log.ip}</td>
                  <td className="py-2 text-white font-sans font-semibold">{log.type}</td>
                  <td className="py-2 text-red-400 font-bold">{log.score.toFixed(4)}</td>
                  <td className="py-2">
                    <SeverityBadge severity={log.severity} />
                  </td>
                  <td className="py-2 text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      {log.mitigated ? 'AUTO-DROPPED' : 'FLAGGED'}
                    </span>
                  </td>
                </tr>
              ))}
              {detectionLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-mono">
                    Monitoring clean traffic stream. Click an Attack button above to trigger live anomalies!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
