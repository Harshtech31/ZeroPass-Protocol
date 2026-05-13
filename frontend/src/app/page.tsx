import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#f8fafc] selection:bg-[#7deded] selection:text-[#0a101a] font-sans dot-grid">
      {/* Mesh Gradient Background */}
      <div className="mesh-gradient opacity-20"></div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#7deded] rounded-lg shadow-[0_0_15px_rgba(125,237,237,0.3)] flex items-center justify-center">
              <span className="text-[#0a101a] font-black text-xs">ZP</span>
            </div>
            <span className="font-black tracking-tight text-lg uppercase">ZeroPass</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm font-bold text-[#686e78] hover:text-[#f8fafc] transition-colors">Features</a>
            <a href="#" className="text-sm font-bold text-[#686e78] hover:text-[#f8fafc] transition-colors">Documentation</a>
            <a href="#" className="text-sm font-bold text-[#686e78] hover:text-[#f8fafc] transition-colors">Enterprise</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/5 transition-all">
              Sign In
            </Link>
            <Link href="/register" className="text-sm font-black px-6 py-2.5 rounded-full bg-[#7deded] text-[#0a101a] shadow-lg shadow-[#7deded]/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
              Deploy Protocol
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="pt-32 pb-24 px-8 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#253754]/40 border border-[#7deded]/20 mb-10 animate-fade-in">
            <span className="w-2 h-2 bg-[#7deded] rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7deded]">Powered by C++ Security Engine</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-gradient">
            Passwordless <br />
            Auth for Devs.
          </h1>
          
          <p className="text-xl md:text-2xl text-[#686e78] font-medium max-w-2xl mx-auto mb-16 leading-relaxed">
            ZeroPass-Protocol is the implementation-ready identity layer. Hardware-backed, AI-verified, and completely passwordless.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/register" className="h-16 px-10 bg-[#7deded] text-[#0a101a] rounded-[24px] font-black text-lg flex items-center shadow-2xl shadow-[#7deded]/20 hover:scale-105 transition-all">
              Start Building
            </Link>
            <a href="#" className="h-16 px-10 border border-white/10 hover:bg-white/5 rounded-[24px] font-black text-lg flex items-center transition-all">
              View Source
            </a>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-32 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bento-card p-10 group">
              <div className="w-12 h-12 bg-[#253754] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#7deded]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">WebAuthn Native</h3>
              <p className="text-[#686e78] font-medium leading-relaxed">
                First-class support for biometric passkeys, YubiKeys, and secure enclaves. Zero passwords, zero friction.
              </p>
            </div>

            <div className="bento-card p-10 group">
              <div className="w-12 h-12 bg-[#253754] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#7deded]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">C++ AI Engine</h3>
              <p className="text-[#686e78] font-medium leading-relaxed">
                Real-time risk scoring processed via a high-performance C++ backend. Detect anomalies before they hit your app.
              </p>
            </div>

            <div className="bento-card p-10 group">
              <div className="w-12 h-12 bg-[#253754] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-[#7deded]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Token-Driven</h3>
              <p className="text-[#686e78] font-medium leading-relaxed">
                Built with a consistent token system for developers. Scale from MVP to enterprise with a single identity layer.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-32 px-8">
          <div className="max-w-4xl mx-auto glass-card p-16 rounded-[48px] text-center border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7deded]/10 rounded-full blur-[100px]"></div>
            <h2 className="text-5xl font-black mb-8 relative z-10">Secure your stack today.</h2>
            <p className="text-xl text-[#686e78] mb-12 relative z-10 max-w-xl mx-auto">
              Join thousands of developers building a future without passwords.
            </p>
            <div className="flex justify-center gap-6 relative z-10">
              <Link href="/register" className="h-14 px-8 bg-[#f8fafc] text-[#0a101a] rounded-[16px] font-black text-sm flex items-center hover:scale-105 transition-all">
                Get Started for Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-20 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-md"></div>
            <span className="font-black text-sm uppercase tracking-widest opacity-50">ZeroPass Protocol</span>
          </div>
          <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest text-[#686e78]">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
          <p className="text-[10px] font-bold text-[#686e78]">© 2026 ZeroPass Inc.</p>
        </div>
      </footer>
    </div>
  );
}
