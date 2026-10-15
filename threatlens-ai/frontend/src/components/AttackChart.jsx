import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export const TelemetryTimeSeriesChart = ({ data = [] }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff2a5f" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ff2a5f" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pktGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00f2fe" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#070d1e',
              borderColor: '#1e293b',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              color: '#fff',
            }}
          />
          <Area
            type="monotone"
            dataKey="packets_sec"
            name="Packets / s"
            stroke="#00f2fe"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#pktGrad)"
          />
          <Area
            type="monotone"
            dataKey="anomalies"
            name="Anomalies Flagged"
            stroke="#ff2a5f"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#anomGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AttackDistributionChart = ({ data = [] }) => {
  const COLORS = ['#ff2a5f', '#f97316', '#eab308', '#00f2fe', '#8b5cf6', '#10b981'];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94a3b8"
            tick={{ fontSize: 10, fill: '#cbd5e1' }}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#070d1e',
              borderColor: '#1e293b',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
