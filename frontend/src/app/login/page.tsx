'use client';

import { useState } from 'react';
import Link from 'next/link';
import { prepareLoginOptions, prepareLoginResponse } from '@/lib/webauthn';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setStatus('loading');
    setMessage('Requesting challenge...');

    try {
      // 1. Get options from server
      const beginRes = await fetch(`http://127.0.0.1:8005/api/auth/login/begin?username=${username}`, {
        method: 'POST',
      });
      
      if (!beginRes.ok) {
        const err = await beginRes.json();
        throw new Error(err.detail || 'Failed to begin login');
      }
      const responseData = await beginRes.json();
      const options = responseData.publicKey || responseData;

      // 2. Get assertion
      setMessage('Please verify your identity...');
      const { prepareLoginOptions, prepareLoginResponse } = await import('@/lib/webauthn');
      const credential = await navigator.credentials.get({
        publicKey: prepareLoginOptions(options)
      });

      if (!credential) throw new Error('Authentication failed');

      // 3. Send response to server
      setMessage('Verifying signature...');
      const completeRes = await fetch(`http://127.0.0.1:8005/api/auth/login/complete?username=${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareLoginResponse(credential)),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.detail || 'Verification failed');
      }

      const result = await completeRes.json();
      localStorage.setItem('access_token', result.access_token);

      setStatus('success');
      setMessage('Login successful! Redirecting...');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (err: any) {
      console.error('Login error:', err);
      setStatus('error');
      
      // Handle the browser's "NotAllowedError" which happens when no matching credentials are found
      if (err.name === 'NotAllowedError') {
        setMessage('This device is not recognized or has been revoked. Please use a registered device.');
      } else {
        setMessage(err.message || 'Login failed. Please try again.');
      }
    }
  };

  const handleRecoveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !recoveryCode) return;

    setStatus('loading');
    setMessage('Verifying recovery code...');

    try {
      const res = await fetch('http://127.0.0.1:8005/api/users/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code: recoveryCode }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Invalid recovery code');
      }

      const result = await res.json();
      localStorage.setItem('access_token', result.access_token);

      setStatus('success');
      setMessage('Recovery successful! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden selection:bg-[#7deded] selection:text-[#0a101a] dot-grid">
      {/* Background Layer */}
      <div className="mesh-gradient opacity-20"></div>

      {/* Terminal Decor */}
      <div className="absolute top-10 left-10 font-mono text-[10px] text-[#253754] opacity-20 pointer-events-none hidden lg:block">
        <p>➜ zeropass --identify</p>
        <p>[SYSTEM] Requesting hardware handshake...</p>
        <p>[AUTH] Waiting for biometric attestation...</p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bento-card p-10 relative overflow-hidden group">
          {/* Subtle Glow Decor */}
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#7deded]/5 rounded-full blur-3xl group-hover:bg-[#7deded]/10 transition-all duration-700"></div>
          
          <div className="relative z-10 text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#253754]/40 rounded-[20px] border border-white/10 mb-6 shadow-inner">
              <svg className="w-10 h-10 text-[#7deded]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-[#f8fafc] tracking-tighter mb-3 uppercase">
              {useRecoveryCode ? 'Recovery' : 'Identify'}
            </h1>
            <p className="text-[#686e78] font-medium px-4 leading-relaxed">
              {useRecoveryCode 
                ? 'Regain access via emergency manifest' 
                : 'Hardware-verified passwordless protocol'}
            </p>
          </div>

          <form onSubmit={useRecoveryCode ? handleRecoveryLogin : handleLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-3 ml-1">
                System Identifier
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0a101a]/50 border border-white/5 rounded-[16px] px-5 py-4 text-[#f8fafc] placeholder:text-[#253754] focus:outline-none focus:ring-2 focus:ring-[#7deded]/20 focus:border-[#7deded]/20 transition-all font-bold"
                placeholder="Unique username"
                required
                disabled={status === 'loading'}
              />
            </div>

            {useRecoveryCode && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-3 ml-1">
                  Bypass Manifest Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  className="w-full bg-[#0a101a]/80 border border-[#7deded]/30 rounded-[16px] px-5 py-4 text-[#7deded] placeholder:text-[#253754] font-mono focus:outline-none focus:ring-2 focus:ring-[#7deded]/20 transition-all text-center tracking-widest uppercase"
                  placeholder="XXXX-XXXX-XXXX"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-[#7deded] hover:bg-[#7deded]/90 disabled:bg-[#253754] text-[#0a101a] font-black py-4 rounded-[16px] shadow-xl shadow-[#7deded]/10 transition-all active:scale-[0.98] flex items-center justify-center group/btn"
            >
              {status === 'loading' ? (
                <div className="w-6 h-6 border-3 border-[#0a101a]/30 border-t-[#0a101a] rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center uppercase tracking-widest text-[11px]">
                  {useRecoveryCode ? 'Authorize Bypass' : 'Verify Identity'}
                  <svg className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>

            {message && (
              <div className={`p-4 rounded-[16px] text-center text-[10px] font-black uppercase tracking-widest ${
                status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                'bg-[#7deded]/10 text-[#7deded] border border-[#7deded]/20'
              }`}>
                {message}
              </div>
            )}

            <div className="flex flex-col space-y-4 pt-4">
              <button
                type="button"
                onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                className="text-[10px] font-black text-[#686e78] uppercase tracking-widest hover:text-[#7deded] transition-colors"
              >
                {useRecoveryCode ? 'Back to Passkey' : 'Lost Device? Use Recovery Manifest'}
              </button>
              
              <div className="h-px bg-white/5 w-full"></div>
              
              <p className="text-center text-sm text-[#686e78] font-medium">
                New to the protocol?{' '}
                <Link href="/register" className="text-[#7deded] hover:underline font-bold underline-offset-4">
                  Register Hardware
                </Link>
              </p>
            </div>
          </form>
        </div>
        
        {/* Security Footer Note */}
        <p className="mt-8 text-center text-[10px] font-bold text-[#686e78] uppercase tracking-widest">
          End-to-End Cryptographic Verification Active
        </p>
      </div>
    </div>
  );
}

