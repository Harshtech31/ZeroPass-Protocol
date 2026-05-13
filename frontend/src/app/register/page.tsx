'use client';

import { useState } from 'react';
import Link from 'next/link';
import { prepareRegistrationOptions, prepareRegistrationResponse } from '@/lib/webauthn';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setStatus('loading');
    setMessage('Requesting challenge...');

    try {
      // 1. Get options from server
      const beginRes = await fetch(`http://127.0.0.1:8005/api/auth/register/begin?username=${username}`, {
        method: 'POST',
      });
      
      if (!beginRes.ok) throw new Error('Failed to begin registration');
      const responseData = await beginRes.json();
      const options = responseData.publicKey || responseData;

      // 2. Create credential
      setMessage('Please use your biometric or security key...');
      const credential = await navigator.credentials.create({
        publicKey: prepareRegistrationOptions(options)
      });

      if (!credential) throw new Error('Credential creation failed');

      // 3. Send response to server
      setMessage('Verifying credential...');
      const completeRes = await fetch(`http://127.0.0.1:8005/api/auth/register/complete?username=${username}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareRegistrationResponse(credential)),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.detail || 'Verification failed');
      }

      setStatus('success');
      setMessage('Registration complete! You can now log in.');
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
        <p>[AUTH] Preparing secure enclave...</p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bento-card p-10 relative overflow-hidden group">
          {/* Subtle Glow Decor */}
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#7deded]/5 rounded-full blur-3xl group-hover:bg-[#7deded]/10 transition-all duration-700"></div>
          
          <div className="relative z-10 text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#253754]/40 rounded-[20px] border border-white/10 mb-6 shadow-inner">
              <svg className="w-10 h-10 text-[#7deded]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-[#f8fafc] tracking-tighter mb-3 uppercase">
              Initialize
            </h1>
            <p className="text-[#686e78] font-medium px-4 leading-relaxed">
              Create your hardware-backed secure protocol identity
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6 relative z-10">
            <div>
              <label htmlFor="username" className="block text-[10px] font-black text-[#686e78] uppercase tracking-[0.2em] mb-3 ml-1">
                Choose Identifier
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0a101a]/50 border border-white/5 rounded-[16px] px-5 py-4 text-[#f8fafc] placeholder:text-[#253754] focus:outline-none focus:ring-2 focus:ring-[#7deded]/20 focus:border-[#7deded]/20 transition-all font-bold"
                placeholder="Unique username"
                required
                disabled={status === 'loading'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-[#7deded] hover:bg-[#7deded]/90 disabled:bg-[#253754] text-[#0a101a] font-black py-4 rounded-[16px] shadow-xl shadow-[#7deded]/10 transition-all active:scale-[0.98] flex items-center justify-center group/btn"
            >
              {status === 'loading' ? (
                <div className="w-6 h-6 border-3 border-[#0a101a]/30 border-t-[#0a101a] rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center uppercase tracking-widest text-[11px]">
                  Register Hardware
                  <svg className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
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
              {status === 'success' && (
                <Link 
                  href="/login" 
                  className="w-full py-4 bg-[#f8fafc] text-[#0a101a] text-center rounded-[16px] text-[11px] font-black uppercase tracking-widest transition-all hover:bg-white"
                >
                  Proceed to Identity Verification
                </Link>
              )}
              
              <div className="h-px bg-white/5 w-full"></div>
              
              <p className="text-center text-sm text-[#686e78] font-medium">
                Already registered?{' '}
                <Link href="/login" className="text-[#7deded] hover:underline font-bold underline-offset-4">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
        
        {/* Security Footer Note */}
        <p className="mt-8 text-center text-[10px] font-bold text-[#686e78] uppercase tracking-widest">
          FIDO2 / WebAuthn Standard Compliance Active
        </p>
      </div>
    </div>
  );
}
