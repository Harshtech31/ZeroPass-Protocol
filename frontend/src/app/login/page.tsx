'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { prepareLoginOptions, prepareLoginResponse } from '@/lib/webauthn';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);
  const [step, setStep] = useState<'idle' | 'captcha'>('idle');
  const [captchaData, setCaptchaData] = useState<{images: string[], instruction: string} | null>(null);
  const [tempAuth, setTempAuth] = useState<{token: string, userData: any} | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential && 
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(result => {
        setBiometricsAvailable(result);
      });
    }
  }, []);

  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setStatus('loading');
    setMessage('Requesting challenge...');

    try {
      const baseUrl = '/api';
      // 1. Get options from server
      const beginRes = await fetch(`${baseUrl}/auth/login/begin?username=${username}`, {
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
      const completeRes = await fetch(`${baseUrl}/auth/login/complete?username=${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareLoginResponse(credential)),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.detail || 'Verification failed');
      }

      const result = await completeRes.json();
      
      if (result.status === 'captcha_required') {
        // Step 3: Trigger Captcha
        const capRes = await fetch(`${baseUrl}/auth/captcha/generate?username=${username}`);
        const capData = await capRes.json();
        setCaptchaData(capData);
        
        setStep('captcha');
        setStatus('idle');
        setMessage('Final Human Verification Required');
      } else {
        // Fallback for immediate auth if enabled
        localStorage.setItem('access_token', result.access_token);
        setStatus('success');
        setMessage('Login successful!');
        setTimeout(() => window.location.href = '/dashboard', 1500);
      }

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
      const baseUrl = '/api';
      const res = await fetch(`${baseUrl}/users/recovery/verify`, {
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

  const handleCaptchaSelect = async (index: number) => {
    setStatus('loading');
    setMessage('Analyzing visual selection...');
    
    try {
      const res = await fetch(`/api/auth/captcha/verify?username=${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          index: index,
          flow: 'login'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Visual mismatch detected');
      }
      
      const result = await res.json();
      localStorage.setItem('access_token', result.access_token);
      
      setStatus('success');
      setMessage('Access granted! Redirecting...');
      
      setTimeout(() => {
        if (result.user_data?.role === 'admin' || result.user_data?.role === 'analyst') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1500);

    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
      // Refresh puzzle on failure
      const capRes = await fetch(`/api/auth/captcha/generate?username=${username}`);
      const capData = await capRes.json();
      setCaptchaData(capData);
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
            <div className="inline-flex items-center justify-center w-24 h-24 bg-[#253754]/40 rounded-[24px] border border-white/10 mb-6 shadow-inner overflow-hidden">
              <img src="/logo.png" alt="ZeroPass Protocol" className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(125,237,237,0.4)]" />
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
          {step === 'idle' ? (
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

              {!useRecoveryCode && biometricsAvailable && (
                <div className="flex items-center space-x-2 px-1 animate-in fade-in slide-in-from-left-2 duration-500">
                  <div className="w-2 h-2 bg-[#7deded] rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-[#7deded] uppercase tracking-widest">
                    Biometric Unlock Available
                  </span>
                </div>
              )}

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
          ) : (
            <div className="space-y-6 relative z-10 animate-in fade-in zoom-in duration-500">
              <div className="text-center mb-4">
                <p className="text-[10px] font-black text-[#7deded] uppercase tracking-[0.2em] animate-pulse">
                  {captchaData?.instruction || 'Visual Attestation Required'}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 p-2 bg-[#0a101a]/30 border border-white/5 rounded-[24px]">
                {captchaData?.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCaptchaSelect(idx)}
                    disabled={status === 'loading'}
                    className="relative aspect-square rounded-[16px] overflow-hidden border border-white/5 hover:border-[#7deded]/50 hover:scale-[1.05] transition-all group"
                  >
                    <img src={img} alt={`Puzzle ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#7deded]/0 group-hover:bg-[#7deded]/10 transition-colors" />
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 bg-[#7deded] rounded-full shadow-[0_0_8px_#7deded]" />
                    </div>
                  </button>
                ))}
              </div>

              {message && (
                <div className={`p-4 rounded-[16px] text-center text-[10px] font-black uppercase tracking-widest ${
                  status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                  status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  'bg-[#7deded]/10 text-[#7deded] border border-[#7deded]/20'
                }`}>
                  {message}
                </div>
              )}

              <div className="text-center pt-2">
                <button 
                  onClick={async () => {
                    const capRes = await fetch(`/api/auth/captcha/generate?username=${username}`);
                    const capData = await capRes.json();
                    setCaptchaData(capData);
                  }}
                  className="text-[10px] font-bold text-[#686e78] hover:text-[#7deded] uppercase tracking-widest transition-colors"
                >
                  Regenerate Challenge
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Security Footer Note */}
        <p className="mt-8 text-center text-[10px] font-bold text-[#686e78] uppercase tracking-widest">
          End-to-End Cryptographic Verification Active
        </p>
      </div>
    </div>
  );
}

