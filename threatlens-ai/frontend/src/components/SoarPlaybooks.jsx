import React, { useState } from 'react';
import {
  Workflow,
  ShieldAlert,
  Play,
  CheckCircle,
  Clock,
  Terminal,
  Download,
  AlertTriangle,
  RotateCw,
  Flame,
  Lock,
} from 'lucide-react';
import { cyberAudio } from '../utils/cyberSimulation';

const PLAYBOOKS = [
  {
    id: 'PB-RANSOMWARE',
    name: 'Zero-Day Ransomware & C2 Kill-Chain Containment',
    category: 'Containment',
    target: 'Active Host Intrusion',
    steps: [
      { step: 1, action: 'Isolate compromised host virtual NIC & VLAN subnet', status: 'pending' },
      { step: 2, action: 'Revoke active OAuth / JWT tokens across identity broker', status: 'pending' },
      { step: 3, action: 'Inject BGP blackhole rule for adversary C2 DNS domain', status: 'pending' },
      { step: 4, action: 'Trigger volatile RAM memory capture & forensic artifact dump', status: 'pending' },
      { step: 5, action: 'Dispatch high-priority incident dispatch to CISO & Tier-3 SOC', status: 'pending' },
    ],
    mttc: '45 seconds',
  },
  {
    id: 'PB-DDOS',
    name: 'Autonomous Volumetric DDoS & SYN Flood Mitigation',
    category: 'Network Edge',
    target: 'Public Ingress Gateway',
    steps: [
      { step: 1, action: 'Activate edge kernel SYN-cookie validation mode', status: 'pending' },
      { step: 2, action: 'Route ingress subnet through Cloudflare Magic Transit scrubbing', status: 'pending' },
      { step: 3, action: 'Drop UDP reflection amplification vectors (NTP, DNS, SSDP)', status: 'pending' },
      { step: 4, action: 'Auto-scale reverse proxy ingress nodes (+4 instances)', status: 'pending' },
    ],
    mttc: '20 seconds',
  },
  {
    id: 'PB-BRUTEFORCE',
    name: 'Automated Credential Stuffing & SSH Bastion Shield',
    category: 'Identity & Access',
    target: 'Internal Bastion & Auth Services',
    steps: [
      { step: 1, action: 'Enforce immediate 30-minute lockout on targeted usernames', status: 'pending' },
      { step: 2, action: 'Inject dynamic iptables drop for attacking CIDR block', status: 'pending' },
      { step: 3, action: 'Mandate FIDO2 hardware MFA challenge on next authentication', status: 'pending' },
    ],
    mttc: '15 seconds',
  },
];

export const SoarPlaybooks = () => {
  const [activePlaybook, setActivePlaybook] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState([]);
  const [completed, setCompleted] = useState(false);

  const executePlaybook = (playbook) => {
    setActivePlaybook(playbook);
    setIsRunning(true);
    setCurrentStepIndex(0);
    setCompleted(false);
    cyberAudio.playAlertAlarm();

    const timestamp = () => new Date().toISOString().slice(11, 19);
    setLogs([`[${timestamp()}] [SOAR-INIT] Starting automated execution: ${playbook.name}`]);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= playbook.steps.length) {
        setCurrentStepIndex(step - 1);
        const currentAction = playbook.steps[step - 1].action;
        setLogs((prev) => [
          ...prev,
          `[${timestamp()}] [STEP-${step}] Executing: ${currentAction}...`,
          `[${timestamp()}] [STEP-${step}] Command verified -> STATUS: 200 OK`,
        ]);
        cyberAudio.playRadarPing();
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setCompleted(true);
        setLogs((prev) => [
          ...prev,
          `[${timestamp()}] [SOAR-COMPLETE] All containment rules applied successfully! MTTC recorded.`,
        ]);
      }
    }, 1200);
  };

  const handleExportReport = () => {
    const report = {
      playbook: activePlaybook?.name,
      executed_at: new Date().toISOString(),
      analyst: 'Alex Mercer (Lead SOC Analyst)',
      execution_logs: logs,
      status: 'SUCCESSFUL_CONTAINMENT',
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOAR_Execution_Report_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              SOAR INCIDENT RESPONSE PLAYBOOKS
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                1-CLICK AUTOMATION
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Pre-approved automated orchestration playbooks to neutralize zero-day threats in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Playbook Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLAYBOOKS.map((pb) => (
          <div
            key={pb.id}
            className="p-5 rounded-2xl glass-panel border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {pb.category}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> MTTC: {pb.mttc}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white font-mono mb-1">{pb.name}</h3>
              <p className="text-xs text-slate-400 mb-3">Scope: {pb.target}</p>

              {/* Steps list */}
              <div className="space-y-1.5 text-xs font-mono">
                {pb.steps.map((st) => (
                  <div key={st.step} className="flex items-start gap-2 text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-white/10 text-cyan-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {st.step}
                    </span>
                    <span className="text-[11px] leading-tight text-slate-300">{st.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => executePlaybook(pb)}
              disabled={isRunning}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs font-mono hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              {isRunning && activePlaybook?.id === pb.id ? 'Executing Workflow...' : 'Execute Automation'}
            </button>
          </div>
        ))}
      </div>

      {/* Execution Terminal Modal */}
      {activePlaybook && (
        <div className="p-5 rounded-2xl glass-panel-glow border border-purple-500/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-mono">
                SOAR LIVE ORCHESTRATOR: {activePlaybook.name}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {completed && (
                <button
                  onClick={handleExportReport}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 hover:bg-emerald-500/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Run Report
                </button>
              )}
              <button
                onClick={() => setActivePlaybook(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Stepper Display */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {activePlaybook.steps.map((st, idx) => {
              const isPast = idx < currentStepIndex || completed;
              const isCurr = idx === currentStepIndex && isRunning;

              return (
                <div
                  key={st.step}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    isPast
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : isCurr
                      ? 'bg-purple-950/40 border-purple-500/50 text-white animate-pulse'
                      : 'bg-black/30 border-white/10 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">Step {st.step}</span>
                    {isPast && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[10px] leading-tight line-clamp-2">{st.action}</p>
                </div>
              );
            })}
          </div>

          {/* Console Output */}
          <div className="p-4 rounded-xl bg-black/80 border border-purple-500/20 max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
            {logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes('STATUS: 200')
                    ? 'text-emerald-400'
                    : log.includes('SOAR-COMPLETE')
                    ? 'text-cyan-400 font-bold'
                    : 'text-slate-300'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
