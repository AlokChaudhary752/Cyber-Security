import React from 'react';

export const SeverityBadge = ({ severity }) => {
  const sev = (severity || 'BENIGN').toUpperCase();

  const styles = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    BENIGN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
  };

  const currentStyle = styles[sev] || styles.BENIGN;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          sev === 'CRITICAL'
            ? 'bg-red-400 animate-ping'
            : sev === 'HIGH'
            ? 'bg-orange-400 animate-pulse'
            : sev === 'BENIGN'
            ? 'bg-emerald-400'
            : 'bg-amber-400'
        }`}
      />
      {sev}
    </span>
  );
};
