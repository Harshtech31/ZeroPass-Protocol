'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SOCDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [isLockdown, setIsLockdown] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);
  const baseUrl = '/api';

  const fetchSOCData = async () => {
    const token = localStorage.getItem('access_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [statsRes, logsRes, usersRes, healthRes] = await Promise.all([
        fetch(`${baseUrl}/audit/stats`, { headers }),
        fetch(`${baseUrl}/audit/logs?limit=50`, { headers }),
        fetch(`${baseUrl}/admin/users`, { headers }),
        fetch(`${baseUrl}/admin/health`, { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch (err) {
      console.error('SOC Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchSOCData();
    const interval = setInterval(fetchSOCData, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerStepUp = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const beginRes = await fetch(`${baseUrl}/auth/step-up/begin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!beginRes.ok) throw new Error('Step-up initialization failed');
      const options = await beginRes.json();

      const { prepareLoginOptions, prepareLoginResponse } = await import('@/lib/webauthn');
      const credential = await navigator.credentials.get({
        publicKey: prepareLoginOptions(options)
      });
      if (!credential) return false;

      const completeRes = await fetch(`${baseUrl}/auth/step-up/complete`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(prepareLoginResponse(credential)),
      });

      return completeRes.ok;
    } catch (err) {
      console.error('Step-up failed:', err);
      return false;
    }
  };

  const handlePromote = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to promote ${username} to ADMIN? You will need to verify your hardware key.`)) return;

    setIsPromoting(userId);
    try {
      // 1. Force Step-Up first
      const verified = await triggerStepUp();
      if (!verified) {
        alert('Verification failed. Action cancelled.');
        return;
      }

      // 2. Perform promotion
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/admin/promote/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert(`${username} has been promoted to ADMIN.`);
        fetchSOCData(); // Refresh list
      } else {
        const err = await res.json();
        alert(`Promotion failed: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Promotion error:', err);
    } finally {
      setIsPromoting(null);
    }
  };

  const handleLockdown = async () => {
    const newState = !isLockdown;
    const action = newState ? 'INITIALIZE Secure Lockdown' : 'DEACTIVATE Secure Lockdown';
    
    if (confirm(`WARNING: ${action} will require hardware verification. Proceed?`)) {
      const verified = await triggerStepUp();
      if (!verified) {
        alert('Verification failed. Action cancelled.');
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${baseUrl}/admin/lockdown`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enabled: newState })
        });

        if (res.ok) {
          setIsLockdown(newState);
          alert(`SYSTEM ALERT: Global Lockdown ${newState ? 'INITIALIZED' : 'DEACTIVATED'}.`);
        }
      } catch (err) {
        console.error('Lockdown toggle failed:', err);
      }
    }
  };

  const handleExport = () => {
    const data = JSON.stringify({ stats, logs, users }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeropass-intelligence-${new Date().toISOString()}.json`;
    a.click();
  };

  return (
    <div className={`min-h-screen relative text-[#f8fafc] overflow-hidden selection:bg-red-500 selection:text-white dot-grid transition-colors duration-1000 ${isLockdown ? 'bg-red-950/20' : ''}`}>
      {/* Background Layer */}
      <div className={`mesh-gradient opacity-20 ${isLockdown ? 'animate-pulse' : ''}`}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* Header Section */}
        <header className="flex justify-between items-end mb-16 p-10 bg-[#0a101a]/60 backdrop-blur-3xl border border-white/5 rounded-[32px] shadow-2xl relative overflow-hidden group">
          {isLockdown && (
            <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>
          )}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Live SOC Feed</span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
              Intelligence <span className="text-red-600">Center</span>
            </h1>
            <p className="text-[#686e78] font-bold mt-2 font-mono text-[10px] tracking-widest">Cross-Protocol Security Operations Center</p>
          </div>
          <div className="flex gap-4 relative z-10">
            <Link 
              href="/dashboard"
              className="px-6 py-3 bg-[#0a101a]/40 border border-white/5 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Security
            </Link>
            <button 
              onClick={handleExport}
              className="px-6 py-3 bg-[#0a101a]/40 border border-white/5 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
            >
              Export Intelligence
            </button>
            <button 
              onClick={handleLockdown}
              className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl ${
                isLockdown ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-[#0a101a] hover:bg-white/90 shadow-white/5'
              }`}
            >
              {isLockdown ? 'SYSTEM LOCKED' : 'Secure Lockdown'}
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Auth Attempts', val: stats?.total_attempts || 0, color: 'text-cyan-400', border: 'border-cyan-500/20' },
            { label: 'Failed Handshakes', val: stats?.failed_attempts || 0, color: 'text-yellow-400', border: 'border-yellow-500/20' },
            { label: 'High Risk Events', val: stats?.high_risk_events || 0, color: 'text-red-500', border: 'border-red-500/20' },
            { label: 'Active Sessions', val: stats?.total_attempts || 0, color: 'text-white', border: 'border-white/20' },
          ].map((s, i) => (
            <div key={i} className={`bento-card p-8 border-t-2 ${s.border}`}>
              <p className="text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-4">{s.label}</p>
              <p className={`text-5xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* System Infrastructure Health */}
        <div className="mb-12 bento-card p-8 bg-black/40 backdrop-blur-xl">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black tracking-tight uppercase">Infrastructure Health</h2>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#686e78]">Last Pulse: {health?.timestamp ? new Date(health.timestamp * 1000).toLocaleTimeString() : '---'}</span>
              </div>
           </div>
           <div className="grid grid-cols-3 gap-6">
              {[
                { name: 'PostgreSQL Instance', status: health?.database, desc: 'Primary Persistence Layer' },
                { name: 'Redis Cache', status: health?.redis, desc: 'Session & Lockdown State' },
                { name: 'C++ Security Engine', status: health?.engine, desc: 'Advanced Cryptographic Core' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-[#0a101a]/40 rounded-2xl border border-white/5">
                  <div className={`w-3 h-3 rounded-full ${item.status === 'healthy' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'}`}></div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight">{item.name}</p>
                    <p className="text-[9px] font-bold text-[#686e78]">{item.desc} • <span className={item.status === 'healthy' ? 'text-green-500' : 'text-red-500'}>{item.status?.toUpperCase() || 'OFFLINE'}</span></p>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* User Management (New Section) */}
          <div className="col-span-12 lg:col-span-4 bento-card p-8">
            <h2 className="text-xl font-black tracking-tight uppercase mb-8">User Manifest</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {users.map((u) => (
                <div key={u.id} className="p-5 bg-[#0a101a]/40 border border-white/5 rounded-2xl group hover:border-[#7deded]/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-black text-white">{u.username}</p>
                      <p className="text-[9px] font-bold text-[#686e78] uppercase tracking-widest">{u.role}</p>
                    </div>
                    {u.role !== 'admin' && (
                      <button 
                        onClick={() => handlePromote(u.id, u.username)}
                        disabled={isPromoting === u.id}
                        className="px-3 py-1 bg-[#7deded] text-[#0a101a] text-[9px] font-black uppercase rounded-lg hover:scale-105 transition-all disabled:bg-[#253754]"
                      >
                        {isPromoting === u.id ? 'Verifying...' : 'Promote'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1 h-1 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-[9px] font-mono text-[#253754]">{u.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manifest (Span 8) */}
          <div className="col-span-12 lg:col-span-8 bento-card p-8">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black tracking-tight uppercase">Threat Intelligence Manifest</h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Live Streaming</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-4 px-6 py-3 text-[9px] font-black text-[#253754] uppercase tracking-widest border-b border-white/5">
                <div>Timestamp</div>
                <div>Event Protocol</div>
                <div>Source IP</div>
                <div className="text-right">Risk Score</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                    className={`grid grid-cols-4 px-6 py-6 border-b border-white/5 items-center hover:bg-white/[0.02] transition-all cursor-pointer group ${selectedLog === log.id ? 'bg-white/[0.05] border-red-500/30' : ''}`}
                  >
                    <div className="text-[11px] font-mono text-[#686e78] group-hover:text-white transition-colors">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-tight text-[#f8fafc]">
                      {log.action}
                    </div>
                    <div className="text-[11px] font-mono text-[#253754] group-hover:text-[#686e78] transition-colors">
                      {log.ip_address}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-lg font-mono text-[10px] font-black border ${
                        log.risk_score > 0.7 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                        log.risk_score > 0.3 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                      }`}>
                        {log.risk_score.toFixed(3)}
                      </span>
                    </div>
                    {selectedLog === log.id && (
                      <div className="col-span-4 mt-4 p-4 bg-black/40 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                        <p className="text-[10px] font-mono text-[#686e78] leading-relaxed">
                          [TRACE_ID] {log.id}<br/>
                          [HANDSHAKE] RSA-PSS-2048-SHA256<br/>
                          [TELEMETRY] Device Handshake Verified<br/>
                          [STATUS] {log.risk_score > 0.5 ? 'CRITICAL_ALERT' : 'NOMINAL_IDENT'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
