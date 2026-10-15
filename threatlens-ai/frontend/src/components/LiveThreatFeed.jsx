import React, { useState, useEffect } from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';

export const LiveThreatFeed = () => {
  const [logs, setLogs] = useState([
    { id: 1, msg: 'Inbound packet from 185.220.101.5 flagged as Anomaly', type: 'warn', time: '10:42:01' },
    { id: 2, msg: 'Isolation Forest: Node depth 4 detected for flow 8821', type: 'info', time: '10:42:05' },
    { id: 3, msg: 'Critical: DDoS SYN Flood detected on port 443', type: 'error', time: '10:42:12' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['info', 'warn', 'error'];
      const msgs = [
        'Scanning network perimeter...',
        'ML Engine updating contamination parameters...',
        'Anomaly detected: Stealth Port Scan from 45.12.x.x',
        'Heartbeat: Telemetry pipeline stable',
        'New attack vector identified: DNS Tunneling',
        'Packet flow synchronized with ML baseline',
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setLogs(prev => [{ id: Date.now(), msg, type, time }, ...prev].slice(0, 6));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getColor = (type) => {
    if (type === 'error') return 'text-red-400';
    if (type === 'warn') return 'text-amber-400';
    return 'text-cyan-400';
  };

  return (
    <div className="mt-12 max-w-3xl mx-auto w-full">
      <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Terminal className="w-3 h-3" />
            Live Security Event Log
          </div>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-amber-500/50" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
          </div>
        </div>
        <div className="p-4 font-mono text-[11px] space-y-1">
          {logs.map(log => (
            <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-500">
              <span className="text-slate-600">[{log.time}]</span>
              <span className={getColor(log.type)}>{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
