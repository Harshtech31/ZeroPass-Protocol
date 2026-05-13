'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string; role?: string } | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);

  // Define baseUrl at the component level so all functions can access it
  const baseUrl = '/api';

  const fetchData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch User Profile
      const userRes = await fetch(`${baseUrl}/users/me`, { headers });
      if (!userRes.ok) throw new Error('Unauthorized');
      const userData = await userRes.json();
      setUser(userData);

      // Fetch Devices
      const devicesRes = await fetch(`${baseUrl}/users/devices`, { headers });
      const devicesData = await devicesRes.json();
      setDevices(devicesData);

      // Fetch Logs
      const logsRes = await fetch(`${baseUrl}/audit/logs`, { headers });
      const logsData = await logsRes.json();
      setLogs(logsData);

    } catch (err) {
      console.error(err);
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const triggerStepUp = async () => {
    try {
      const token = localStorage.getItem('access_token');
      // 1. Begin Step-Up
      const beginRes = await fetch(`${baseUrl}/auth/step-up/begin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const options = await beginRes.json();

      // 2. Browser Prompt
      const { prepareLoginOptions, prepareLoginResponse } = await import('@/lib/webauthn');
      const credential = await navigator.credentials.get({
        publicKey: prepareLoginOptions(options)
      });
      if (!credential) return false;

      // 3. Complete Step-Up
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

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device?')) return;
    
    const performRevoke = async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/users/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 403) {
        const data = await res.json();
        if (data.detail?.error === 'step_up_required') {
          const success = await triggerStepUp();
          if (success) return performRevoke(); // Retry
        }
      }
      
      if (res.ok) {
        setDevices(devices.filter(d => d.id !== deviceId));
      }
    };
    
    await performRevoke();
  };

  const handleRename = async (deviceId: string, currentName: string) => {
    const newName = prompt('Enter new device name:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/users/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setDevices(devices.map(d => d.id === deviceId ? { ...d, device_name: newName } : d));
      }
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleAddDevice = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const username = user?.username;
      if (!username) return;

      // 1. Begin Registration
      const beginRes = await fetch(`${baseUrl}/auth/register/begin?username=${username}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await beginRes.json();
      const options = data.publicKey || data;

      // 2. Browser WebAuthn Prompt (using native API + helpers)
      const { prepareRegistrationOptions, prepareRegistrationResponse } = await import('@/lib/webauthn');
      const preparedOptions = prepareRegistrationOptions(options);
      const credential = await navigator.credentials.create({ publicKey: preparedOptions });
      const attestationResponse = prepareRegistrationResponse(credential);

      // 3. Complete Registration
      const completeRes = await fetch(`${baseUrl}/auth/register/complete?username=${username}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(attestationResponse),
      });

      if (completeRes.ok) {
        alert('New device added successfully!');
        // Refresh device list
        const devicesRes = await fetch(`${baseUrl}/users/devices`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        setDevices(await devicesRes.json());
      }
    } catch (err) {
      console.error('Failed to add device:', err);
      alert('Failed to add device. Please try again.');
    }
  };

  const handleGenerateCodes = async () => {
    const performGenerate = async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/users/recovery/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.detail?.error === 'step_up_required') {
          const success = await triggerStepUp();
          if (success) return performGenerate(); // Retry
        }
      }

      if (!res.ok) throw new Error('Failed to generate codes');
      const data = await res.json();
      setRecoveryCodes(data.recovery_codes);
      setShowCodes(true);
    };

    try {
      await performGenerate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const downloadCodes = () => {
    const text = `ZeroPass Emergency Recovery Codes\nAccount: ${user?.username}\nGenerated: ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zeropass-recovery-codes.txt';
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-[#f8fafc] overflow-hidden selection:bg-[#7deded] selection:text-[#0a101a] dot-grid">
      {/* Background Layer */}
      <div className="mesh-gradient opacity-20"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* Top Navigation / Status Bar */}
        <div className="flex justify-between items-center mb-12 p-6 bg-[#0a101a]/40 backdrop-blur-xl border border-white/5 rounded-[24px]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#7deded]/10 border border-[#7deded]/20">
              <span className="w-1.5 h-1.5 bg-[#7deded] rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#7deded]">Active Protocol</span>
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <p className="text-xs font-bold text-[#686e78]">
              OPERATOR: <span className="text-[#f8fafc] tracking-widest">@{user?.username?.toUpperCase()}</span>
            </p>
            {(user?.role === 'admin' || user?.role === 'analyst') && (
              <>
                <div className="h-4 w-px bg-white/10"></div>
                <Link 
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-[#7deded]/10 border border-[#7deded]/20 text-[#7deded] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#7deded]/20 transition-all flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Intelligence Center
                </Link>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl group"
          >
            Terminate
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* Welcome & System Stats (Span 8) */}
          <div className="col-span-12 lg:col-span-8 bento-card p-10 flex flex-col justify-between group">
            <div>
              <h1 className="text-5xl font-black tracking-tighter mb-4 text-[#f8fafc]">
                Security <span className="text-[#7deded]">Dashboard</span>
              </h1>
              <p className="text-[#686e78] font-medium text-lg max-w-md">
                Managing cryptographically verified hardware identifiers and real-time risk telemetry.
              </p>
            </div>
            <div className="flex gap-12 mt-8">
              <div>
                <p className="text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-1">Risk Score</p>
                <p className="text-3xl font-black text-[#7deded]">0.02</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-1">Encrypted Keys</p>
                <p className="text-3xl font-black text-[#f8fafc]">{devices.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-1">Uptime</p>
                <p className="text-3xl font-black text-[#f8fafc]">99.9%</p>
              </div>
            </div>
          </div>

          {/* System Health / Terminal (Span 4) */}
          <div className="col-span-12 lg:col-span-4 bento-card bg-[#0a101a]/80 p-6 font-mono text-[10px] relative">
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
            </div>
            <div className="space-y-1.5 text-[#686e78]">
              <p><span className="text-[#7deded] mr-2">➜</span> [SYSTEM] Initializing ZeroPass Protocol...</p>
              <p><span className="text-[#7deded] mr-2">➜</span> [AUTH] FIDO2 Handshake verified.</p>
              <p><span className="text-[#7deded] mr-2">➜</span> [RISK] AI Engine score: 0.02 (Nominal)</p>
              <p><span className="text-[#7deded] mr-2">➜</span> [SYNC] 128-bit cross-node sync complete.</p>
              <p className="animate-pulse"><span className="text-[#7deded] mr-2">➜</span> [LIVE] Monitoring telemetry...</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-5 pointer-events-none">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>

          {/* Trusted Devices (Span 12 or 8) */}
          <div className="col-span-12 lg:col-span-12 bento-card p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black tracking-tight uppercase">Hardware Keys</h2>
              <button 
                onClick={handleAddDevice}
                className="px-4 py-2 bg-[#7deded] text-[#0a101a] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                Register New Key
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <div key={device.id} className="p-6 bg-[#0a101a]/40 border border-white/5 rounded-[20px] hover:border-[#7deded]/30 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-[#253754]/40 rounded-2xl flex items-center justify-center text-[#7deded]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <button 
                      onClick={() => handleRevoke(device.id)}
                      className="text-[10px] font-black text-red-500/40 hover:text-red-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Revoke
                    </button>
                  </div>
                  <h3 className="font-black text-lg tracking-tight mb-1">{device.device_name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#686e78] font-bold uppercase tracking-widest">
                      ID: {device.id.slice(0, 8)}...
                    </p>
                    <button 
                      onClick={() => handleRename(device.id, device.device_name)}
                      className="text-[10px] text-[#7deded]/40 hover:text-[#7deded] font-black uppercase tracking-widest"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs (Span 7) */}
          <div className="col-span-12 lg:col-span-7 bento-card p-8">
            <h2 className="text-xl font-black tracking-tight uppercase mb-8">Audit Manifest</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-[#0a101a]/20 border border-white/5 rounded-2xl hover:bg-[#0a101a]/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-1.5 rounded-full ${log.risk_score > 0.5 ? 'bg-red-500' : 'bg-[#7deded]'}`}></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{log.action}</p>
                      <p className="text-[9px] text-[#686e78] font-bold tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-[#253754] px-2 py-1 bg-white/5 rounded-md uppercase">
                    {log.ip_address}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency (Span 5) */}
          <div className="col-span-12 lg:col-span-5 bento-card p-8 relative overflow-hidden">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight uppercase mb-2">Recovery</h2>
                <p className="text-xs text-[#686e78] font-medium leading-relaxed mb-8">
                  One-time emergency bypass manifest. Use only if all hardware identifiers are lost.
                </p>
              </div>
              
              {showCodes ? (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {recoveryCodes.slice(0, 4).map((code, i) => (
                    <div key={i} className="bg-[#0a101a] p-3 rounded-xl border border-white/5 text-center font-mono text-[10px] font-black text-[#7deded] tracking-wider">
                      {code}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-white/5 rounded-3xl text-center mb-6">
                  <p className="text-[9px] font-black text-[#686e78] uppercase tracking-widest">Manifest Locked</p>
                </div>
              )}

              <button
                onClick={handleGenerateCodes}
                className="w-full py-4 bg-[#f8fafc] text-[#0a101a] rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white"
              >
                {showCodes ? 'Regenerate Manifest' : 'Authorize Manifest Access'}
              </button>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zM7 7a3 3 0 016 0v2H7V7z" />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
