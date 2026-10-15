import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Pause,
  Play,
  Crosshair,
  MapPin,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { cyberAudio } from '../utils/cyberSimulation';

// Key global attack origins with geographic percentage coordinates (x, y % on SVG projection)
const GLOBAL_NODES = [
  { id: 'ru', name: 'Moscow / St. Petersburg', code: 'RU', x: 62, y: 28, threatLevel: 'CRITICAL', asn: 'AS49505' },
  { id: 'cn', name: 'Shenzhen / Shanghai', code: 'CN', x: 78, y: 44, threatLevel: 'HIGH', asn: 'AS4134' },
  { id: 'nl', name: 'Amsterdam Bulletproof DC', code: 'NL', x: 50, y: 31, threatLevel: 'HIGH', asn: 'AS60781' },
  { id: 'br', name: 'São Paulo Botnet Cluster', code: 'BR', x: 33, y: 72, threatLevel: 'MEDIUM', asn: 'AS28573' },
  { id: 'ro', name: 'Bucharest Proxy Pool', code: 'RO', x: 56, y: 34, threatLevel: 'HIGH', asn: 'AS9009' },
  { id: 'ir', name: 'Tehran Scanning Node', code: 'IR', x: 63, y: 41, threatLevel: 'MEDIUM', asn: 'AS58224' },
];

// Target SOC datacenter (e.g. US East Datacenter / Headquarters)
const SOC_TARGET = { name: 'HQ SOC Perimeter (10.0.0.1)', code: 'US', x: 26, y: 36 };

export const GlobalAttackMap = ({ onInvestigateAlert }) => {
  const [attacks, setAttacks] = useState([
    {
      id: 1,
      source: GLOBAL_NODES[0],
      type: 'DDoS SYN Flood',
      proto: 'TCP:443',
      rate: '4.2 Gbps',
      severity: 'CRITICAL',
      time: 'Just now',
    },
    {
      id: 2,
      source: GLOBAL_NODES[1],
      type: 'SSH Automated Brute Force',
      proto: 'TCP:22',
      rate: '240 auth/s',
      severity: 'HIGH',
      time: '4s ago',
    },
    {
      id: 3,
      source: GLOBAL_NODES[2],
      type: 'Log4j Exploit Probe',
      proto: 'TCP:8080',
      rate: 'JNDI Payload',
      severity: 'CRITICAL',
      time: '8s ago',
    },
  ]);

  const [isLive, setIsLive] = useState(true);
  const [selectedNode, setSelectedNode] = useState(GLOBAL_NODES[0]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const randomNode = GLOBAL_NODES[Math.floor(Math.random() * GLOBAL_NODES.length)];
      const attackTypes = [
        { type: 'DDoS SYN Flood', proto: 'TCP:443', rate: `${(Math.random() * 8 + 1).toFixed(1)} Gbps`, sev: 'CRITICAL' },
        { type: 'SSH Brute Force', proto: 'TCP:22', rate: `${Math.floor(Math.random() * 200 + 40)} req/s`, sev: 'HIGH' },
        { type: 'Cobalt Strike C2 Beacon', proto: 'UDP:53', rate: 'Entropy 7.9', sev: 'HIGH' },
        { type: 'SQL Injection Sweep', proto: 'TCP:80', rate: 'Payload probe', sev: 'MEDIUM' },
        { type: 'Zero-Day Buffer Overflow', proto: 'TCP:8443', rate: 'Heap exploit', sev: 'CRITICAL' },
      ];
      const selected = attackTypes[Math.floor(Math.random() * attackTypes.length)];

      const newAttack = {
        id: Date.now(),
        source: randomNode,
        type: selected.type,
        proto: selected.proto,
        rate: selected.rate,
        severity: selected.sev,
        time: 'Just now',
      };

      setAttacks((prev) => [newAttack, ...prev.slice(0, 19)]);
      if (selected.sev === 'CRITICAL') {
        cyberAudio.playRadarPing();
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isLive]);

  const filteredAttacks = attacks.filter(
    (a) => filterSeverity === 'ALL' || a.severity === filterSeverity
  );

  return (
    <div className="space-y-6">
      {/* Top Threat Telemetry Status Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <Globe className="w-5 h-5 animate-spin" style={{ animationDuration: '24s' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              REAL-TIME GLOBAL CYBER ATTACK MAP
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                DEFCON 2 ELEVATED
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live geographic threat vector telemetry and hostile ASN ingress tracing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isLive ? 'RADAR ACTIVE' : 'RADAR PAUSED'}
          </button>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Holographic SVG Map */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-panel border border-white/10 space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Crosshair className="w-3.5 h-3.5" />
              Target Destination: {SOC_TARGET.name}
            </span>
            <span className="text-emerald-400">Interception Rate: 99.4%</span>
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full h-80 sm:h-96 rounded-xl bg-[#030712] border border-cyan-500/20 overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
            {/* Grid Scanline Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  'radial-gradient(#00f2fe 1px, transparent 1px), linear-gradient(to bottom, transparent 95%, rgba(0,242,254,0.15) 100%)',
                backgroundSize: '24px 24px, 100% 20px',
              }}
            />

            {/* Radar Sweep Animation Line */}
            <div
              className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent pointer-events-none animate-radar-sweep"
              style={{
                animation: 'radarSweep 6s linear infinite',
              }}
            />

            <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d">
              {/* World Map Simplified Continent Silhouettes */}
              <g fill="#0e172a" stroke="#1e293b" strokeWidth="0.4">
                {/* North America */}
                <path d="M 15 20 Q 25 15 35 25 Q 38 45 28 50 Q 18 45 15 20 Z" />
                {/* South America */}
                <path d="M 28 55 Q 38 58 35 78 Q 28 85 26 70 Z" />
                {/* Europe */}
                <path d="M 46 22 Q 58 20 60 35 Q 52 42 46 32 Z" />
                {/* Africa */}
                <path d="M 46 40 Q 60 42 58 65 Q 48 72 44 55 Z" />
                {/* Asia */}
                <path d="M 60 20 Q 88 18 86 48 Q 72 60 62 40 Z" />
                {/* Australia */}
                <path d="M 76 68 Q 88 66 86 82 Q 74 84 76 68 Z" />
              </g>

              {/* Dynamic Attack Arc Trajectories */}
              {isLive &&
                filteredAttacks.slice(0, 5).map((atk) => {
                  const src = atk.source;
                  const midX = (src.x + SOC_TARGET.x) / 2;
                  const midY = (src.y + SOC_TARGET.y) / 2 - 14; // Arc upwards

                  return (
                    <g key={atk.id}>
                      {/* Curving Attack Vector Path */}
                      <path
                        d={`M ${src.x} ${src.y} Q ${midX} ${midY} ${SOC_TARGET.x} ${SOC_TARGET.y}`}
                        fill="none"
                        stroke={atk.severity === 'CRITICAL' ? '#ff2a5f' : '#f97316'}
                        strokeWidth="0.6"
                        strokeDasharray="2, 2"
                        className="animate-pulse"
                      />
                      {/* Moving Attack Particle along vector */}
                      <circle
                        cx={midX}
                        cy={midY}
                        r="0.9"
                        fill={atk.severity === 'CRITICAL' ? '#ff2a5f' : '#00f2fe'}
                      >
                        <animate
                          attributeName="opacity"
                          values="0.2;1;0.2"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  );
                })}

              {/* Target Datacenter Marker */}
              <g className="cursor-pointer">
                <circle
                  cx={SOC_TARGET.x}
                  cy={SOC_TARGET.y}
                  r="3.5"
                  fill="none"
                  stroke="#00f2fe"
                  strokeWidth="0.4"
                  className="animate-ping"
                />
                <circle cx={SOC_TARGET.x} cy={SOC_TARGET.y} r="1.8" fill="#00f2fe" />
                <text
                  x={SOC_TARGET.x + 3}
                  y={SOC_TARGET.y + 1}
                  fill="#00f2fe"
                  fontSize="2.4"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  US-EAST SOC
                </text>
              </g>

              {/* Global Threat Origins Markers */}
              {GLOBAL_NODES.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isCritical = node.threatLevel === 'CRITICAL';

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? '2.8' : '2'}
                      fill={isCritical ? '#ff2a5f' : '#f97316'}
                      opacity={isSelected ? 1 : 0.8}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="4"
                      fill="none"
                      stroke={isCritical ? '#ff2a5f' : '#f97316'}
                      strokeWidth="0.3"
                      className="animate-pulse"
                    />
                    <text
                      x={node.x + 2.5}
                      y={node.y + 1}
                      fill="#e2e8f0"
                      fontSize="2.1"
                      fontFamily="monospace"
                    >
                      {node.code}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Floating Threat Summary inside map */}
            <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-[#070d1e]/90 backdrop-blur-md border border-white/10 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300">
                Selected Origin:{' '}
                <strong className="text-cyan-400">{selectedNode.name}</strong> ({selectedNode.asn})
              </span>
              <span className="text-red-400 font-bold">
                Threat Status: {selectedNode.threatLevel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="block text-[10px] font-mono text-slate-400">ACTIVE ORIGINS</span>
              <span className="text-lg font-bold font-mono text-cyan-400">6 Global Asns</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="block text-[10px] font-mono text-slate-400">PEAK INGRESS</span>
              <span className="text-lg font-bold font-mono text-red-400">14.8 Gbps</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="block text-[10px] font-mono text-slate-400">AUTONOMOUS MITIGATIONS</span>
              <span className="text-lg font-bold font-mono text-emerald-400">100% Active</span>
            </div>
          </div>
        </div>

        {/* Live Attack Feed & Threat Origin Inspector */}
        <div className="p-5 rounded-2xl glass-panel border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                Hostile Telemetry Ingress Feed
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Live Ingest</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredAttacks.map((atk) => (
                <div
                  key={atk.id}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-mono space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                      {atk.type}
                    </span>
                    <SeverityBadge severity={atk.severity} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      From: <strong className="text-cyan-400">{atk.source.code}</strong> ({atk.source.name})
                    </span>
                    <span className="text-slate-300">{atk.proto}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span>Rate: {atk.rate}</span>
                    <span className="text-amber-400 font-semibold">{atk.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (onInvestigateAlert) onInvestigateAlert(filteredAttacks[0]);
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 hover:text-white hover:bg-red-500/30 font-mono font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            Engage Global Ingress Drop Rule
          </button>
        </div>
      </div>
    </div>
  );
};
