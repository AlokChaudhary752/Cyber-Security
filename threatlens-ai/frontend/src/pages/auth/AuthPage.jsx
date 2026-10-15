import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, User, Key, ArrowLeft, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthPage = ({ initialMode = 'login', onBack, onSuccess }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  
  const [formData, setFormData] = useState({
    username_or_email: 'analyst',
    password: 'ThreatLens@2025',
    email: '',
    username: '',
    full_name: '',
    role: 'soc_analyst',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.username_or_email, formData.password);
      } else {
        await register({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setMode('login');
    setFormData((prev) => ({
      ...prev,
      username_or_email: 'analyst',
      password: 'ThreatLens@2025',
    }));
  };

  return (
    <div className="min-h-screen bg-[#040814] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Animated Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-[#070d1e]/60 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative z-10">
        
        {/* Left Side: Branding/Marketing (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-cyan-600/20 to-blue-900/20 border-r border-white/10">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,242,254,0.4)]">
                <ShieldAlert className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-white font-mono">
                THREAT<span className="text-cyan-400">LENS</span> AI
              </h2>
            </div>
            
            <h1 className="text-4xl font-bold text-white leading-tight">
              Secure your perimeter with <span className="text-cyan-400">AI-driven</span> intelligence.
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Join the elite circle of SOC analysts using unsupervised machine learning to detect 
              zero-day threats in real-time.
            </p>
            
            <div className="grid grid-cols-1 gap-4 mt-8">
              {[
                { icon: Zap, text: "Sub-second anomaly detection", color: "text-cyan-400" },
                { icon: Lock, text: "Enterprise-grade encryption", color: "text-blue-400" },
                { icon: CheckCircle2, text: "Automatic incident mitigation", color: "text-emerald-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(0,242,254,0.4)]">
              <ShieldAlert className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-xl font-bold font-mono text-white">
              THREAT<span className="text-cyan-400">LENS</span> AI
            </h2>
          </div>

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 mb-6 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Portal
          </button>

          {/* Mode Switcher */}
          <div className="flex p-1 bg-black/40 rounded-xl mb-8 border border-white/5">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login' ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register' ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(0,242,254,0.3)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'login' ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 ml-1">Username or Email</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={formData.username_or_email}
                      onChange={(e) => setFormData({ ...formData, username_or_email: e.target.value })}
                      placeholder="analyst@threatlens.ai"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase text-slate-400 ml-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono uppercase text-slate-400 ml-1">Username</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="jdoe_sec"
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@threatlens.ai"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 text-black font-bold text-sm hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Authorize Access' : 'Initialize Analyst Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
