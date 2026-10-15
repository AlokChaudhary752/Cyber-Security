import React, { useState } from 'react';
import {
  Layers,
  ShieldAlert,
  Search,
  ExternalLink,
  ChevronRight,
  Flame,
  Binary,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';

const MITRE_TACTICS = [
  {
    id: 'recon',
    name: 'Reconnaissance',
    tacticId: 'TA0043',
    techniques: [
      {
        id: 'T1595',
        name: 'Active Scanning',
        sub: 'T1595.001 IP Blocks',
        detections: 14,
        severity: 'MEDIUM',
        scoreVector: 'tcp_flags=2, pps>80, pktLen<80',
        description: 'Adversary executes automated network probing to identify live IP addresses and vulnerable ingress points.',
        remediation: 'Rate limit ICMP/SYN handshakes; drop external scanning probes at edge firewall.',
      },
      {
        id: 'T1590',
        name: 'Gather Victim Network Info',
        sub: 'T1590.005 DNS Enumeration',
        detections: 3,
        severity: 'LOW',
        scoreVector: 'dst_port=53, high query entropy',
        description: 'Adversary queries authoritative DNS resolvers to map internal network topology and zone files.',
        remediation: 'Restrict DNS zone transfers (AXFR) and implement response rate limiting (RRL).',
      },
    ],
  },
  {
    id: 'initial-access',
    name: 'Initial Access',
    tacticId: 'TA0001',
    techniques: [
      {
        id: 'T1190',
        name: 'Exploit Public-Facing App',
        sub: 'T1190 CVE-2021-44228 Log4j',
        detections: 8,
        severity: 'CRITICAL',
        scoreVector: 'dst_port=8080/443, pps>600, payload regex',
        description: 'Adversaries exploit software vulnerabilities in Internet-connected services to gain initial execution.',
        remediation: 'Apply vendor hotfixes, activate WAF JNDI inspection filters, and isolate application JVM.',
      },
      {
        id: 'T1133',
        name: 'External Remote Services',
        sub: 'T1133 VPN / Gateway Exploit',
        detections: 2,
        severity: 'HIGH',
        scoreVector: 'dst_port=1194/443, abnormal duration',
        description: 'Adversaries leverage exposed VPN, Citrix, or RDP endpoints to establish ingress footholds.',
        remediation: 'Enforce hardware security key MFA and geo-fencing on all ingress remote endpoints.',
      },
    ],
  },
  {
    id: 'credential-access',
    name: 'Credential Access',
    tacticId: 'TA0006',
    techniques: [
      {
        id: 'T1110',
        name: 'Brute Force',
        sub: 'T1110.001 Password Guessing',
        detections: 24,
        severity: 'HIGH',
        scoreVector: 'dst_port=22/3389, pps>150, duration<30',
        description: 'Systematic guessing of account credentials against SSH, RDP, or HTTP basic auth portals.',
        remediation: 'Implement progressive exponential lockout backoff and ban offender IP automatically.',
      },
    ],
  },
  {
    id: 'c2',
    name: 'Command and Control',
    tacticId: 'TA0011',
    techniques: [
      {
        id: 'T1071',
        name: 'Application Layer Protocol',
        sub: 'T1071.004 DNS C2 Tunneling',
        detections: 6,
        severity: 'CRITICAL',
        scoreVector: 'dst_port=53, bps>120000, beaconing intervals',
        description: 'Adversaries embed bidirectional command instructions inside legitimate DNS or HTTPS traffic channels.',
        remediation: 'Enforce DNS RPZ (Response Policy Zones) and deploy entropy-based domain classifiers.',
      },
    ],
  },
  {
    id: 'exfiltration',
    name: 'Exfiltration',
    tacticId: 'TA0010',
    techniques: [
      {
        id: 'T1048',
        name: 'Exfiltration Over Alternative Protocol',
        sub: 'T1048.003 Symmetric UDP Flow',
        detections: 4,
        severity: 'HIGH',
        scoreVector: 'bytes_out>10MB, flow_bytes_per_sec>2M',
        description: 'Stolen intellectual property or database dumps streamed out across unmonitored ports.',
        remediation: 'Block egress on non-standard ports; mandate deep packet inspection on all outgoing proxy traffic.',
      },
    ],
  },
  {
    id: 'impact',
    name: 'Impact',
    tacticId: 'TA0040',
    techniques: [
      {
        id: 'T1498',
        name: 'Network Denial of Service',
        sub: 'T1498.001 Direct Volumetric Flood',
        detections: 19,
        severity: 'CRITICAL',
        scoreVector: 'flow_packets_per_sec>2500, score<-0.30',
        description: 'Exhausting network edge bandwidth or server CPU through coordinated multi-host packet saturation.',
        remediation: 'Trigger upstream BGP Flowspec blackholing and activate scrubbing center reverse proxy.',
      },
    ],
  },
];

export const MitreMatrix = ({ onTriggerPlaybook }) => {
  const [selectedTechnique, setSelectedTechnique] = useState(MITRE_TACTICS[1].techniques[0]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              MITRE ATT&CK® ENTERPRISE THREAT MATRIX
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                v14 Enterprise
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live mapping of Isolation Forest ML anomaly vectors into standardized adversary tactics.
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search technique or CVE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
          />
        </div>
      </div>

      {/* MITRE Enterprise Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {MITRE_TACTICS.map((tactic) => (
          <div
            key={tactic.id}
            className="rounded-2xl glass-panel border border-white/10 p-3 flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="pb-2 border-b border-white/10 mb-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">
                  {tactic.tacticId}
                </span>
                <h3 className="text-xs font-bold text-white font-mono truncate">{tactic.name}</h3>
              </div>

              <div className="space-y-2">
                {tactic.techniques
                  .filter(
                    (tech) =>
                      !searchQuery ||
                      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      tech.id.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((tech) => {
                    const isSelected = selectedTechnique?.id === tech.id;
                    const isCrit = tech.severity === 'CRITICAL';

                    return (
                      <div
                        key={tech.id}
                        onClick={() => setSelectedTechnique(tech)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-mono space-y-1 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(0,242,254,0.15)] text-white'
                            : 'bg-black/30 hover:bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-cyan-400">{tech.id}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isCrit
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {tech.detections} alerts
                          </span>
                        </div>
                        <p className="font-sans font-semibold text-[11px] line-clamp-1">
                          {tech.name}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Technique Deep-Dive Inspector */}
      {selectedTechnique && (
        <div className="p-5 rounded-2xl glass-panel-glow border border-cyan-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {selectedTechnique.id}
                </span>
                <h3 className="text-base font-bold text-white font-mono">
                  {selectedTechnique.name} ({selectedTechnique.sub})
                </h3>
              </div>
              <p className="text-xs text-slate-400">{selectedTechnique.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <SeverityBadge severity={selectedTechnique.severity} />
              <button
                onClick={() => {
                  if (onTriggerPlaybook) onTriggerPlaybook(selectedTechnique);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-xs hover:shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all flex items-center gap-1.5"
              >
                <span>Launch Containment Playbook</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 text-cyan-400" />
                Isolation Forest Telemetry Signature
              </span>
              <p className="text-cyan-300 bg-slate-950 p-2.5 rounded-lg border border-cyan-500/20">
                {selectedTechnique.scoreVector}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Recommended NIST / CISA Mitigation Action
              </span>
              <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-white/10">
                {selectedTechnique.remediation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
