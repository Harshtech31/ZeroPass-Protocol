'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { prepareRegistrationOptions, prepareRegistrationResponse } from '@/lib/webauthn';

type Step = 'identifier' | 'totp' | 'captcha' | 'hardware' | 'success';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('identifier');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  // TOTP State
  const [totpData, setTotpData] = useState<{qr_code: string, secret: string} | null>(null);
  const [totpCode, setTotpCode] = useState('');
  
  // Captcha State
  const [captchaData, setCaptchaData] = useState<{images: string[], instruction: string} | null>(null);

  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential && 
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(result => {
        setBiometricsAvailable(result);
      });
    }
  }, []);

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    setStatus('loading');
    setMessage('Checking identifier...');
    
    try {
      // Step 1: Setup TOTP
      const res = await fetch(`/api/auth/register/totp/setup?username=${username}`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to initiate TOTP setup');
      }
      
      const data = await res.json();
      setTotpData(data);
      setStep('totp');
      setStatus('idle');
      setMessage('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode) return;
    
    setStatus('loading');
    setMessage('Verifying authenticator code...');
    
    try {
      const res = await fetch(`/api/auth/register/totp/verify?username=${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Invalid TOTP code');
      }
      
      // Step 2: Generate Custom Puzzle
      const capRes = await fetch(`/api/auth/captcha/generate?username=${username}`);
      const capData = await capRes.json();
      setCaptchaData(capData);
      
      setStep('captcha');
      setStatus('idle');
      setMessage('');
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
          flow: 'reg' 
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Visual mismatch detected');
      }
      
      setStep('hardware');
      setStatus('idle');
      setMessage('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
      // Refresh puzzle on failure
      const capRes = await fetch(`/api/auth/captcha/generate?username=${username}`);
      const capData = await capRes.json();
      setCaptchaData(capData);
    }
  };

  const handleHardwareRegister = async () => {
    setStatus('loading');
    setMessage('Requesting hardware handshake...');

    try {
      const baseUrl = '/api';
      // 1. Get options from server
      const beginRes = await fetch(`${baseUrl}/auth/register/begin?username=${username}`, {
        method: 'POST',
      });
      
      if (!beginRes.ok) {
        const err = await beginRes.json();
        throw new Error(err.detail || 'Failed to begin registration');
      }
      const responseData = await beginRes.json();
      const options = responseData.publicKey || responseData;

      // 2. Create credential
      setMessage('Please use your biometric or security key...');
      const credential = await navigator.credentials.create({
        publicKey: prepareRegistrationOptions(options)
      });

      if (!credential) throw new Error('Credential creation failed');

      // 3. Send response to server
      setMessage('Finalizing protocol identity...');
      const completeRes = await fetch(`${baseUrl}/auth/register/complete?username=${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareRegistrationResponse(credential)),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.detail || 'Verification failed');
      }

      setStep('success');
      setStatus('success');
      setMessage('Registration complete! Your identity is now secured by multiple factors.');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(err.message || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden selection:bg-[#7deded] selection:text-[#0a101a] dot-grid">
      {/* Background Layer */}
      <div className="mesh-gradient opacity-20"></div>

      {/* Terminal Decor */}
      <div className="absolute top-10 left-10 font-mono text-[10px] text-[#253754] opacity-20 pointer-events-none hidden lg:block">
        <p>➜ zeropass --initialize</p>
        <p>[SYSTEM] Checking hardware compatibility...</p>
        <p>[AUTH] Step 1/4: Identifier check...</p>
        {step !== 'identifier' && <p>[AUTH] Step 2/4: TOTP Secret Handshake...</p>}
        {(step === 'captcha' || step === 'hardware' || step === 'success') && <p>[AUTH] Step 3/4: Human verification...</p>}
        {(step === 'hardware' || step === 'success') && <p>[AUTH] Step 4/4: Secure Enclave Finalization...</p>}
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
              {step === 'identifier' && 'Initialize'}
              {step === 'totp' && '2FA Setup'}
              {step === 'captcha' && 'Security'}
              {step === 'hardware' && 'Handshake'}
              {step === 'success' && 'Secured'}
            </h1>
            <p className="text-[#686e78] font-medium px-4 leading-relaxed">
              {step === 'identifier' && 'Choose your protocol identifier to begin'}
              {step === 'totp' && 'Scan the QR code with your Authenticator App'}
              {step === 'captcha' && 'Confirm you are a human operator'}
              {step === 'hardware' && 'Finalize with your biometric or hardware key'}
              {step === 'success' && 'Your multi-factor protocol identity is active'}
            </p>
          </div>

          <div className="relative z-10">
            {step === 'identifier' && (
              <form onSubmit={handleIdentifierSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-3 ml-1">Identifier</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0a101a]/50 border border-white/5 rounded-[16px] px-5 py-4 text-[#f8fafc] placeholder:text-[#253754] focus:outline-none focus:ring-2 focus:ring-[#7deded]/20 transition-all font-bold"
                    placeholder="Unique username"
                    required
                    disabled={status === 'loading'}
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#7deded] hover:bg-[#7deded]/90 text-[#0a101a] font-black py-4 rounded-[16px] shadow-xl shadow-[#7deded]/10 transition-all uppercase tracking-widest text-[11px]"
                >
                  {status === 'loading' ? 'Checking...' : 'Next Step'}
                </button>
              </form>
            )}

            {step === 'totp' && totpData && (
              <form onSubmit={handleTotpVerify} className="space-y-6">
                <div className="flex justify-center p-6 bg-white rounded-[24px] mb-6 shadow-2xl shadow-black/50">
                  <img src={totpData.qr_code} alt="QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center mb-6">
                  <code className="text-[10px] text-[#7deded] bg-[#7deded]/10 px-3 py-1 rounded-full font-bold">
                    Secret: {totpData.secret.match(/.{1,4}/g)?.join(' ')}
                  </code>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-3 ml-1">6-Digit Code</label>
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    maxLength={6}
                    className="w-full bg-[#0a101a]/50 border border-white/5 rounded-[16px] px-5 py-4 text-[#f8fafc] text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#7deded]/20 transition-all font-black"
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-[#7deded] hover:bg-[#7deded]/90 text-[#0a101a] font-black py-4 rounded-[16px] uppercase tracking-widest text-[11px]"
                >
                  {status === 'loading' ? 'Verifying...' : 'Verify Authenticator'}
                </button>
              </form>
            )}

            {step === 'captcha' && captchaData && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <p className="text-[10px] font-black text-[#7deded] uppercase tracking-[0.2em] animate-pulse">
                    {captchaData.instruction}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 p-2 bg-[#0a101a]/30 border border-white/5 rounded-[24px]">
                  {captchaData.images.map((img, idx) => (
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
                <div className="text-center">
                  <button 
                    onClick={async () => {
                      const capRes = await fetch(`/api/auth/captcha/generate?username=${username}`);
                      const capData = await capRes.json();
                      setCaptchaData(capData);
                    }}
                    className="text-[10px] font-bold text-[#686e78] hover:text-[#7deded] uppercase tracking-widest transition-colors"
                  >
                    Generate New Challenge
                  </button>
                </div>
              </div>
            )}

            {step === 'hardware' && (
              <div className="space-y-6">
                <div className="p-8 bg-[#253754]/20 border border-[#7deded]/20 rounded-[24px] text-center">
                  <div className="w-16 h-16 bg-[#7deded]/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <svg className="w-8 h-8 text-[#7deded]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3a10.003 10.003 0 00-6.912 2.744m10.272 14.512l.054.09A10.003 10.003 0 0021 11a10.003 10.003 0 00-2.256-6.323" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-[#7deded] uppercase tracking-widest mb-2">Final Step</p>
                  <p className="text-xs text-[#686e78] font-medium px-4">Register your hardware key or biometric to complete the protocol initialization.</p>
                </div>
                <button
                  onClick={handleHardwareRegister}
                  disabled={status === 'loading'}
                  className="w-full bg-[#7deded] hover:bg-[#7deded]/90 text-[#0a101a] font-black py-4 rounded-[16px] shadow-xl shadow-[#7deded]/10 transition-all uppercase tracking-widest text-[11px]"
                >
                  {status === 'loading' ? 'Finalizing...' : 'Register Hardware'}
                </button>
              </div>
            )}

            {step === 'success' && (
              <div className="space-y-6 text-center">
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-[24px] mb-8">
                  <p className="text-sm text-green-400 font-bold leading-relaxed">
                    Identity Successfully Initialized. Your account is now protected by WebAuthn and TOTP.
                  </p>
                </div>
                <Link 
                  href="/login" 
                  className="block w-full bg-[#f8fafc] text-[#0a101a] font-black py-4 rounded-[16px] uppercase tracking-widest text-[11px] transition-all hover:scale-[1.02]"
                >
                  Proceed to Login
                </Link>
              </div>
            )}

            {message && status !== 'success' && (
              <div className={`mt-6 p-4 rounded-[16px] text-center text-[10px] font-black uppercase tracking-widest ${
                status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                'bg-[#7deded]/10 text-[#7deded] border border-[#7deded]/20'
              }`}>
                {message}
              </div>
            )}
          </div>

          <div className="mt-10 text-center">
            <Link href="/login" className="text-sm text-[#686e78] hover:text-[#7deded] transition-colors font-medium">
              Already have an account? <span className="font-black underline underline-offset-4 decoration-[#7deded]/30">Identify</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
