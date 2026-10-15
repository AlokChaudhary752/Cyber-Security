import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  Activity,
  Zap,
  Lock,
  Cpu,
  Server,
  Database,
  ArrowRight,
  CheckCircle2,
  Radio,
  FileCode2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CyberScene from '../../components/CyberScene';
import { LiveThreatFeed } from '../../components/LiveThreatFeed';

export const LandingPage = ({ onEnterDashboard, onOpenAuth }) => {
  const { loginAsDemo } = useAuth();
  const [demoPacket, setDemoPacket] = useState({
    src_ip: '185.220.101.5',
    dst_ip: '10.0.0.80',
    proto: 'TCP',
    pps: 4200,
    status: 'Flagged (Anomaly Score -0.284)',
    type: 'DDoS SYN Flood',
  });

  const handleQuickDemo = () => {
    loginAsDemo();
    onEnterDashboard();
  };

  return (
    <div className="min-h-screen bg-[#040814] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black relative overflow-hidden">
      <CyberScene />
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-[#070d1e]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <span className="text-xl font-extrabold tracking-wider text-white font-mono">
            THREAT<span className="text-cyan-400">LENS</span> AI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-400 font-medium transition-colors"
          >
            <FileCode2 className="w-4 h-4" />
            FastAPI OpenAPI Docs
          </a>
          <button
            onClick={() => onOpenAuth('login')}
            className="text-xs px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-semibold transition-all"
          >
            Sign In
          </button>
          <button
            onClick={handleQuickDemo}
            className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center gap-1.5"
          >
            Instant SOC Demo
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 pt-20 pb-16 max-w-6xl mx-auto text-center">
          {/* Subtle Cyber Radar Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-6 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            AI Network Anomaly & Intrusion Detection Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Next-Generation AI Security Operations with{' '}
            <span className="cyber-gradient-text">ThreatLens AI</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real-time packet inspection powered by unsupervised Machine Learning (Isolation Forest)
            to identify zero-day intrusions, stealth port scans, and DDoS floods before damage occurs.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleQuickDemo}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-black font-extrabold text-sm hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] transition-all flex items-center gap-2"
            >
              Launch SOC Command Center
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold text-sm transition-all"
            >
              Create Analyst Account
            </button>
          </div>
          <LiveThreatFeed />

          {/* Interactive Live Stream Visualizer Preview */}
          <div className="mt-14 p-4 sm:p-6 rounded-2xl glass-panel-glow max-w-4xl mx-auto text-left">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-xs font-mono">
              <span className="flex items-center gap-2 text-cyan-400">
                <Terminal className="w-4 h-4" />
                Live Telemetry Ingestion Pipeline
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MODEL: ISOLATION FOREST ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                <p className="text-slate-500 uppercase text-[10px]">Ingested Packet</p>
                <p className="text-slate-300">
                  SRC: <span className="text-cyan-400">{demoPacket.src_ip}</span>:48192
                </p>
                <p className="text-slate-300">
                  DST: <span className="text-slate-400">{demoPacket.dst_ip}</span>:443
                </p>
                <p className="text-slate-400">PROTO: {demoPacket.proto} | FLOW: {demoPacket.pps} pps</p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                <p className="text-slate-500 uppercase text-[10px]">ML Inference Vector</p>
                <p className="text-slate-300">Decision Score: <span className="text-red-400 font-bold">-0.284</span></p>
                <p className="text-slate-300">Contamination: <span className="text-slate-400">0.06</span></p>
                <p className="text-red-400 font-bold">Label: -1 (ANOMALY DETECTED)</p>
              </div>

              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1.5">
                <p className="text-red-400 uppercase text-[10px] font-bold">Threat Classification</p>
                <p className="text-white font-bold">{demoPacket.type}</p>
                <p className="text-red-300 text-[11px]">Action: Immediate IP Firewall Quarantine</p>
                <button
                  onClick={handleQuickDemo}
                  className="mt-1 w-full py-1 text-center bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded text-[11px] font-bold"
                >
                  View in SOC Alert Center &rarr;
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-6 py-16 border-t border-white/5 bg-[#060b19]/60">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-mono">
                Enterprise Defense Architecture
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Engineered for High-Throughput Modern Security Operations Centers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl glass-panel border border-white/5 hover:border-cyan-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Isolation Forest AI</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Leverages multi-dimensional isolation trees to detect deviations from baseline
                  without requiring labeled zero-day threat samples.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel border border-white/5 hover:border-cyan-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Real-Time WebSocket Stream</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Continuous asynchronous telemetry feeds deliver live network packet metrics straight
                  into your browser with sub-second latency.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel border border-white/5 hover:border-cyan-500/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Automated Incident Mitigation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  1-Click IP firewall blocking, host isolation, and audit trail reporting to quickly neutralize
                  malicious threat actors.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-xs text-slate-500">
        <p>© 2026 ThreatLens AI. Production Cybersecurity Operations Platform.</p>
      </footer>
    </div>
  );
};
