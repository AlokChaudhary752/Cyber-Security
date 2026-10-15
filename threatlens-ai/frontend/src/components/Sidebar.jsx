import React from 'react';
import {
  LayoutDashboard,
  Globe,
  Radio,
  Layers,
  Crosshair,
  ScanSearch,
  ShieldAlert,
  Workflow,
  Binary,
  Flame,
  Terminal,
  Cpu,
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const navSections = [
    {
      title: 'Operations Core',
      items: [
        { id: 'overview', label: 'SOC Command Center', icon: LayoutDashboard },
        { id: 'livemodel', label: 'Live Model (Real-Time)', icon: Cpu, badge: 'LIVE AI' },
        { id: 'threatmap', label: 'Global Attack Map', icon: Globe, badge: 'ACTIVE' },
        { id: 'livestream', label: 'Live Packet Stream (WS)', icon: Radio, badge: 'LIVE' },
      ],
    },
    {
      title: 'Threat Intelligence',
      items: [
        { id: 'mitre', label: 'MITRE ATT&CK Matrix', icon: Layers },
        { id: 'scanner', label: 'Target Vulnerability Hunter', icon: Crosshair, badge: 'CVE' },
        { id: 'detector', label: 'Anomaly Engine & Batch', icon: ScanSearch },
      ],
    },
    {
      title: 'Automated Defense',
      items: [
        { id: 'alerts', label: 'Incident Response & Alerts', icon: ShieldAlert },
        { id: 'playbooks', label: 'SOAR Incident Playbooks', icon: Workflow },
        { id: 'diagnostics', label: 'Isolation Forest Matrix', icon: Binary },
        { id: 'firewall', label: 'Firewall & Blocklist', icon: Flame },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-[#060b19] flex flex-col justify-between py-5 px-3 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.title}
            </p>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,254,0.1)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded ${
                        item.badge === 'LIVE' || item.badge === 'ACTIVE'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Cyber System Telemetry Pill at bottom */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-cyan-950/30 border border-cyan-500/20 text-xs">
        <div className="flex items-center justify-between text-[11px] mb-2 text-slate-300">
          <span className="flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            SOC Telemetry
          </span>
          <span className="text-emerald-400 font-mono">99.98% SLA</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-slate-400 font-mono">
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="text-slate-200">IsolationForest (150 trees)</span>
          </div>
          <div className="flex justify-between">
            <span>MITRE Mapping:</span>
            <span className="text-cyan-400">v14 Active</span>
          </div>
          <div className="flex justify-between">
            <span>Latency:</span>
            <span className="text-emerald-400">1.8ms</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
