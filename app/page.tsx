"use client";
import Link from "next/link";
import { Brain, FileText, ArrowRight, Terminal, Sparkles, Map } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        * { box-sizing: border-box; }

        body { font-family: 'DM Sans', sans-serif; }

        .font-display { font-family: 'Syne', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes badge-pop {
          0%   { opacity: 0; transform: scale(0.85) translateY(-6px); }
          70%  { transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .animate-fade-up          { animation: fadeUp 0.7s ease forwards; }
        .animate-fade-up-1        { animation: fadeUp 0.7s 0.1s ease both; }
        .animate-fade-up-2        { animation: fadeUp 0.7s 0.25s ease both; }
        .animate-fade-up-3        { animation: fadeUp 0.7s 0.4s ease both; }
        .animate-fade-up-4        { animation: fadeUp 0.7s 0.55s ease both; }
        .animate-badge            { animation: badge-pop 0.6s 0.05s ease both; }
        .animate-float            { animation: float 4s ease-in-out infinite; }
        .animate-glow             { animation: glow-pulse 3s ease-in-out infinite; }

        .gradient-text {
          background: linear-gradient(135deg, #fff 30%, #93c5fd 70%, #6366f1 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .shimmer-text {
          background: linear-gradient(90deg,
            #fff 0%, #93c5fd 25%, #fff 50%, #c4b5fd 75%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }

        .card-green  { --card-accent: #22c55e; --card-glow: rgba(34,197,94,0.08); }
        .card-blue   { --card-accent: #3b82f6; --card-glow: rgba(59,130,246,0.08); }
        .card-purple { --card-accent: #a855f7; --card-glow: rgba(168,85,247,0.08); }

        .module-card {
          position: relative;
          overflow: hidden;
          background: rgba(10,10,10,0.9);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 2rem;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          transition: border-color 0.4s ease, transform 0.4s ease, box-shadow 0.4s ease;
          backdrop-filter: blur(10px);
        }
        .module-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top left, var(--card-glow), transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .module-card:hover {
          border-color: color-mix(in srgb, var(--card-accent) 40%, transparent);
          transform: translateY(-4px);
          box-shadow: 0 24px 60px -12px color-mix(in srgb, var(--card-accent) 15%, transparent);
        }
        .module-card:hover::before { opacity: 1; }

        .module-icon {
          width: 3.5rem; height: 3.5rem;
          border-radius: 1rem;
          display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--card-accent) 10%, transparent);
          color: var(--card-accent);
          transition: all 0.4s ease;
          margin-bottom: 1.5rem;
        }
        .module-card:hover .module-icon {
          background: var(--card-accent);
          color: #fff;
          transform: scale(1.1) rotate(-3deg);
        }

        .module-link {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.85rem; font-weight: 700;
          color: var(--card-accent);
          margin-top: auto;
        }
        .arrow-icon { transition: transform 0.3s ease; }
        .module-card:hover .arrow-icon { transform: translateX(4px); }

        /* Number ticker decorations */
        .stat-item {
          text-align: center;
          padding: 1rem;
        }
        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #93c5fd);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4b5563;
          margin-top: 2px;
        }

        /* Grid line decoration */
        .grid-lines {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* Orb accents */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        /* CTA button primary */
        .btn-primary {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.9rem 2.2rem;
          border-radius: 9999px;
          background: #fff;
          color: #000;
          font-weight: 700;
          font-size: 0.95rem;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .btn-primary:hover { transform: scale(1.04); color: #fff; }
        .btn-primary:hover::after { opacity: 1; }
        .btn-primary span { position: relative; z-index: 1; }

        .btn-secondary {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 0.9rem 2.2rem;
          border-radius: 9999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          transform: scale(1.04);
        }

        /* Responsive tweaks */
        @media (max-width: 768px) {
          .hero-title { font-size: 3.2rem !important; line-height: 1.1 !important; }
          .modules-grid { grid-template-columns: 1fr !important; }
          .stats-grid  { grid-template-columns: 1fr 1fr !important; }
          .nav-links   { display: none; }
          .hero-section { padding-top: 4rem !important; padding-bottom: 4rem !important; }
          .hero-sub    { font-size: 1rem !important; }
          .cta-row     { flex-direction: column !important; }
          .badge-text  { font-size: 0.65rem !important; }
        }
        @media (max-width: 480px) {
          .hero-title  { font-size: 2.5rem !important; }
          .module-card { padding: 1.5rem !important; border-radius: 1.5rem !important; }
        }
      `}</style>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div className="orb" style={{ top: '-15%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)' }} />
        <div className="orb" style={{ bottom: '-20%', right: '-10%', width: '55%', height: '55%', background: 'radial-gradient(circle, rgba(109,40,217,0.12), transparent 70%)' }} />
        <div className="orb animate-glow" style={{ top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)' }} />
        <div className="grid-lines" />
        {/* Noise texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')", opacity: 0.18, pointerEvents: 'none' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem' }}>
        <div className="font-display" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #2563eb, #6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
            <Terminal size={18} color="#fff" />
          </div>
          SkillPulse<span style={{ color: '#3b82f6' }}>.ai</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
          {['Features', 'Pricing', 'Docs'].map(item => (
            <button key={item} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = '#6b7280'}
            >{item}</button>
          ))}
        </div>
        {/* Mobile nav CTA */}
        <div style={{ display: 'none' }} className="mobile-cta">
          <Link href="/auth/signup" style={{ fontSize: '0.8rem', padding: '0.5rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9999, color: '#fff', fontWeight: 700 }}>
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero-section" style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '6rem 1.5rem 6rem', textAlign: 'center' }}>

        {/* Badge */}
        <div className="animate-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem 0.4rem 0.6rem', borderRadius: 9999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2.5rem', backdropFilter: 'blur(12px)' }}>
          <div style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', borderRadius: 9999, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Sparkles size={12} color="#fff" style={{ animation: 'spin-slow 3s linear infinite' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>NEW</span>
          </div>
          <span className="badge-text" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>v2.0 Neural Engine Live</span>
        </div>

        {/* Heading */}
        <h1 className="hero-title font-display animate-fade-up-1" style={{ fontSize: '5.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '1.75rem' }}>
          <span className="gradient-text">Architecting</span>
          <br />
          <span className="shimmer-text">Future Careers.</span>
        </h1>

        <p className="hero-sub animate-fade-up-2" style={{ color: '#6b7280', fontSize: '1.15rem', maxWidth: '560px', margin: '0 auto 3rem', lineHeight: 1.75, fontWeight: 300 }}>
          The autonomous career agent that bridges the gap between where you are and where you want to be.{' '}
          <span style={{ color: '#d1d5db', fontWeight: 500 }}>Audit. Plan. Conquer.</span>
        </p>

        {/* CTA */}
        <div className="cta-row animate-fade-up-3" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/signup" className="btn-primary"><span>Get Started Free</span></Link>
          <Link href="/auth/signin" className="btn-secondary">Sign In</Link>
        </div>

        {/* Floating trust indicator */}
        <div className="animate-fade-up-4" style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5rem', marginTop: '3rem', padding: '0.6rem 1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999 }}>
          {[['12k+', 'audits run'], ['98%', 'success'], ['50+', 'roles']].map(([val, lbl]) => (
            <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="font-display" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>{val}</span>
              <span style={{ fontSize: '0.6rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lbl}</span>
            </div>
          ))}
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', alignSelf: 'center' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'glow-pulse 2s ease infinite' }} />
            <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>Live</span>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="modules-grid" style={{ position: 'relative', zIndex: 10, maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '6rem' }}>

        {/* Career Architect */}
        <Link href="/dashboard" className="module-card card-green" style={{ textDecoration: 'none' }}>
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '0.6rem', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9999, padding: '0.2rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NEW</div>
          <div className="module-icon"><Map size={26} /></div>
          <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff', letterSpacing: '-0.02em' }}>Career Architect</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.7, flex: 1, marginBottom: '2rem' }}>
            Input your dream role. Our multi-agent system plans the milestones, scrapes resources, and schedules your success.
          </p>
          <div className="module-link">
            Generate Roadmap <ArrowRight size={16} className="arrow-icon" />
          </div>
        </Link>

        {/* Resume Audit */}
        <Link href="/resume-analyzer" className="module-card card-blue" style={{ textDecoration: 'none' }}>
          <div className="module-icon"><FileText size={26} /></div>
          <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff', letterSpacing: '-0.02em' }}>Resume Audit</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.7, flex: 1, marginBottom: '2rem' }}>
            Upload your resume and JD. Our agent scans for missing keywords, suggests project ideas, and builds a study roadmap.
          </p>
          <div className="module-link">
            Launch Analyzer <ArrowRight size={16} className="arrow-icon" />
          </div>
        </Link>

        {/* AI Interviewer */}
        <Link href="/interview-prep" className="module-card card-purple" style={{ textDecoration: 'none' }}>
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7', animation: 'glow-pulse 2s ease infinite' }} />
          </div>
          <div className="module-icon"><Brain size={26} /></div>
          <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff', letterSpacing: '-0.02em' }}>AI Interviewer</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.7, flex: 1, marginBottom: '2rem' }}>
            Real-time voice/text mock interviews. Get instant feedback on clarity, confidence, and technical accuracy.
          </p>
          <div className="module-link">
            Start Interview <ArrowRight size={16} className="arrow-icon" />
          </div>
        </Link>
      </div>

      {/* Stats Footer */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', transition: 'all 0.4s' }}>
          {[
            ['98%', 'Success Rate'],
            ['12k+', 'Audits Run'],
            ['50+', 'Job Roles'],
            ['GPT-4o', 'Core Neural'],
          ].map(([val, lbl]) => (
            <div key={lbl} className="stat-item"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center', transition: 'border-color 0.3s, background 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <div className="stat-value">{val}</div>
              <div className="stat-label">{lbl}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.75rem', color: '#374151', letterSpacing: '0.05em' }}>
          © 2025 SkillPulse.ai — Engineered for the ambitious.
        </p>
      </div>

    </div>
  );
}