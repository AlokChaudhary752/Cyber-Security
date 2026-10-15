import React from 'react';

export const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'cyan', change = null }) => {
  const colorMap = {
    cyan: 'border-cyan-500/20 text-cyan-400 from-cyan-950/40 to-slate-900/60 shadow-[0_0_15px_rgba(0,242,254,0.05)]',
    red: 'border-red-500/20 text-red-400 from-red-950/40 to-slate-900/60 shadow-[0_0_15px_rgba(239,68,68,0.05)]',
    emerald: 'border-emerald-500/20 text-emerald-400 from-emerald-950/40 to-slate-900/60 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
    amber: 'border-amber-500/20 text-amber-400 from-amber-950/40 to-slate-900/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
    purple: 'border-purple-500/20 text-purple-400 from-purple-950/40 to-slate-900/60 shadow-[0_0_15px_rgba(168,85,247,0.05)]',
  };

  const selectedColor = colorMap[color] || colorMap.cyan;

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-b p-5 backdrop-blur-md ${selectedColor}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${change.startsWith('+') ? 'text-red-400' : 'text-emerald-400'}`}>
            {change}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
