import React from 'react';
import {
  ShieldAlert,
  Activity,
  Bell,
  Cpu,
  LogOut,
  User,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ activeTab, setActiveTab, onOpenDocs }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070d1e]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Engine Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(0,242,254,0.4)]">
            <ShieldAlert className="w-5 h-5 text-black" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-wider text-white font-mono">
                THREAT<span className="text-cyan-400">LENS</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                AI SOC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Isolation Forest Engine Online
            </p>
          </div>
        </div>

        {/* Global Live Feed Status & Quick Stats */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FastAPI Core: <strong className="text-emerald-400">v1.0.0</strong></span>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-white">
              {user?.full_name || user?.username || 'SOC Analyst'}
            </span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase">
              {user?.role || 'Lead Analyst'}
            </span>
          </div>

          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            <User className="w-4 h-4" />
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
