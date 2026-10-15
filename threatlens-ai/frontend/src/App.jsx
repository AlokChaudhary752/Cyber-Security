import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/landing/LandingPage';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing', 'auth', 'dashboard'
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('overview');

  // If user is authenticated, default to dashboard
  const currentView = isAuthenticated ? 'dashboard' : view;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040814] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-cyan-400">Booting ThreatLens AI Engine...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'auth') {
    return (
      <AuthPage
        initialMode={authMode}
        onBack={() => setView('landing')}
        onSuccess={() => setView('dashboard')}
      />
    );
  }

  if (currentView === 'landing' && !isAuthenticated) {
    return (
      <LandingPage
        onEnterDashboard={() => setView('dashboard')}
        onOpenAuth={(mode) => {
          setAuthMode(mode);
          setView('auth');
        }}
      />
    );
  }

  // Dashboard layout
  return (
    <div className="min-h-screen bg-[#040814] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 max-w-7xl mx-auto overflow-y-auto w-full">
          <DashboardPage activeTab={activeTab} setActiveTab={setActiveTab} />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
