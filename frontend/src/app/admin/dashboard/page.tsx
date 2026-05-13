'use client';

import { useEffect, useState } from 'react';

export default function SOCDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSOCData = async () => {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const [statsRes, logsRes] = await Promise.all([
          fetch('http://127.0.0.1:8005/api/audit/stats', { headers }),
          fetch('http://127.0.0.1:8005/api/audit/logs', { headers }) // Admin sees all logs in a real app
        ]);

        if (statsRes.status === 403) {
           alert("Access Denied: Admin privileges required.");
           window.location.href = '/dashboard';
           return;
        }

        const statsData = await statsRes.json();
        const logsData = await logsRes.json();

        setStats(statsData);
        setLogs(logsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSOCData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0a101a] flex items-center justify-center text-[#f8fafc] font-black uppercase tracking-[0.3em] dot-grid">
      Initializing SOC...
    </div>
  );

  return (
    <div className="min-h-screen relative text-[#f8fafc] p-8 overflow-hidden selection:bg-[#7deded] selection:text-[#0a101a] dot-grid">
      {/* Background Layer */}
      <div className="mesh-gradient opacity-20"></div>

      <div className="relative z-10 max-w-7xl mx-auto py-12">
        <header className="flex justify-between items-end mb-16 p-8 bg-[#0a101a]/40 backdrop-blur-xl border border-white/5 rounded-[32px]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500">Live SOC Feed</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase">Intelligence <span className="text-red-500">Center</span></h1>
            <p className="text-[#686e78] font-bold mt-2 font-mono text-[10px] tracking-widest">Cross-Protocol Security Operations Center</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Export Intelligence</button>
            <button className="px-6 py-3 bg-[#f8fafc] text-[#0a101a] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Secure Lockdown</button>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6 auto-rows-[minmax(140px,auto)]">
          
          {/* Stats Row */}
          {[
            { label: 'Total Auth Attempts', value: stats?.total_attempts, color: '#7deded' },
            { label: 'Failed Handshakes', value: stats?.failed_attempts, color: '#facc15' },
            { label: 'High Risk Events', value: stats?.high_risk_events, color: '#ef4444' },
            { label: 'Active Sessions', value: stats?.recent_24h, color: '#f8fafc' },
          ].map((item, i) => (
            <div key={i} className="col-span-12 md:col-span-3 bento-card p-6 flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 opacity-20" style={{ backgroundColor: item.color }}></div>
              <p className="text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-4">{item.label}</p>
              <p className="text-4xl font-black" style={{ color: item.color }}>{item.value || 0}</p>
            </div>
          ))}

          {/* Main Intelligence Feed (Span 8) */}
          <div className="col-span-12 lg:col-span-8 bento-card overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight">Threat Intelligence Manifest</h2>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-red-500 animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                LIVE STREAMING
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px]">
                <thead className="bg-[#0a101a]/50 text-[#686e78]">
                  <tr className="border-b border-white/5">
                    <th className="p-6 uppercase tracking-widest">Timestamp</th>
                    <th className="p-6 uppercase tracking-widest">Event Protocol</th>
                    <th className="p-6 uppercase tracking-widest">Source IP</th>
                    <th className="p-6 uppercase tracking-widest text-right">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#7deded]/5 transition-colors group">
                      <td className="p-6 text-[#686e78] font-bold">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-6 font-black uppercase tracking-tight text-[#f8fafc]">{log.action}</td>
                      <td className="p-6 text-[#686e78] font-bold">{log.ip_address}</td>
                      <td className="p-6 text-right">
                        <span className={`px-3 py-1.5 rounded-lg font-black tracking-widest ${log.risk_score > 0.7 ? 'bg-red-500/10 text-red-500' : 'bg-[#7deded]/10 text-[#7deded]'}`}>
                          {log.risk_score.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Posture (Span 4) */}
          <div className="col-span-12 lg:col-span-4 bento-card p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight mb-8">System Posture</h2>
              <div className="space-y-10">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3 text-[#686e78]">
                    <span>Global Trust Level</span>
                    <span className="text-[#7deded]">98.4%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#253754]/40 rounded-full overflow-hidden">
                    <div className="h-full w-[98.4%] bg-[#7deded] shadow-[0_0_10px_#7deded]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3 text-[#686e78]">
                    <span>Attack Pressure</span>
                    <span className="text-yellow-400">Moderate</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#253754]/40 rounded-full overflow-hidden">
                    <div className="h-full w-[45%] bg-yellow-400"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl group hover:bg-red-500/10 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Protocol Advisory</p>
              </div>
              <p className="text-[10px] text-[#686e78] font-bold leading-relaxed">
                System heartbeat is stable. No unauthorized hardware attempts detected in the last 128 cycles.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
  );
}
