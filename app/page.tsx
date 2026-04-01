"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Brain, FileText, ArrowRight, Terminal, Sparkles, Map, ChevronRight, Zap, Shield, TrendingUp } from "lucide-react";

/* ─────────────────────────────────────────────
   Particle Canvas Background
───────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const COUNT = 80;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);

    particlesRef.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const pts = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      pts.forEach((p) => {
        const dx = mx - p.x, dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.vx -= (dx / dist) * 0.04;
          p.vy -= (dy / dist) * 0.04;
        }
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,210,150,${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0,210,150,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", opacity: 0.6,
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Animated Counter
───────────────────────────────────────────── */
function Counter({ target, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setVal(Math.floor(ease * target));
          if (t < 1) requestAnimationFrame(tick);
          else setVal(target);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─────────────────────────────────────────────
   Typewriter
───────────────────────────────────────────── */
function Typewriter({ phrases }) {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIdx];
    let timeout;
    if (!deleting && charIdx <= phrase.length) {
      timeout = setTimeout(() => {
        setDisplayed(phrase.slice(0, charIdx));
        setCharIdx((c) => c + 1);
      }, 60);
    } else if (!deleting && charIdx > phrase.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplayed(phrase.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
      }, 35);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, phraseIdx, phrases]);

  return (
    <span>
      {displayed}
      <span style={{
        display: "inline-block", width: "2px", height: "1em",
        background: "#00d296", marginLeft: "2px",
        animation: "blink 1s step-end infinite", verticalAlign: "text-bottom",
      }} />
    </span>
  );
}

/* ─────────────────────────────────────────────
   Module Card
───────────────────────────────────────────── */
function ModuleCard({ href, icon: Icon, title, description, cta, color, glowColor, delay }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);

  const onMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <Link href={href}>
      <div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={onMouseMove}
        style={{
          position: "relative", overflow: "hidden",
          background: "#0a0a0a",
          border: `1px solid ${hovered ? glowColor + "60" : "rgba(255,255,255,0.07)"}`,
          borderRadius: "1.75rem",
          padding: "2rem",
          display: "flex", flexDirection: "column",
          cursor: "pointer",
          transform: hovered ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s",
          boxShadow: hovered ? `0 20px 60px ${glowColor}20, 0 0 0 1px ${glowColor}20` : "none",
          animationDelay: `${delay}ms`,
          animationFillMode: "both",
        }}
        className="card-reveal"
      >
        {/* Spotlight */}
        {hovered && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `radial-gradient(300px circle at ${pos.x}% ${pos.y}%, ${glowColor}12, transparent 70%)`,
            transition: "opacity 0.2s",
          }} />
        )}

        {/* Top stripe */}
        <div style={{
          position: "absolute", top: 0, left: "20%", right: "20%", height: "1px",
          background: `linear-gradient(90deg, transparent, ${glowColor}80, transparent)`,
          opacity: hovered ? 1 : 0, transition: "opacity 0.3s",
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Icon */}
          <div style={{
            width: "3.5rem", height: "3.5rem", marginBottom: "1.5rem",
            background: hovered ? glowColor : glowColor + "18",
            borderRadius: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: hovered ? "#000" : glowColor,
            transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            transform: hovered ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)",
            flexShrink: 0,
          }}>
            <Icon size={26} strokeWidth={2} />
          </div>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "3px 10px", borderRadius: "9999px",
            background: glowColor + "15", border: `1px solid ${glowColor}30`,
            color: glowColor, fontSize: "11px", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "0.875rem", width: "fit-content",
          }}>
            <Zap size={10} />Module
          </div>

          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
            {title}
          </h2>
          <p style={{ color: "#666", fontSize: "0.875rem", lineHeight: 1.7, flex: 1, marginBottom: "1.5rem" }}>
            {description}
          </p>

          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "0.875rem", fontWeight: 700, color: glowColor,
            marginTop: "auto",
          }}>
            {cta}
            <ArrowRight size={16} style={{
              transform: hovered ? "translateX(4px)" : "translateX(0)",
              transition: "transform 0.3s",
            }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Main Landing Page
───────────────────────────────────────────── */
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [navBlur, setNavBlur] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      setScrollY(window.scrollY);
      setNavBlur(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const modules = [
    {
      href: "/dashboard",
      icon: Map,
      title: "Career Architect",
      description: "Input your dream role. Our multi-agent system plans milestones, scrapes resources, and schedules your path to success with precision.",
      cta: "Generate Roadmap",
      color: "#00d296",
      glowColor: "#00d296",
      delay: 100,
    },
    {
      href: "/resume-analyzer",
      icon: FileText,
      title: "Resume Audit",
      description: "Upload your resume and JD. Our agent scans for missing keywords, suggests project ideas, and builds a tailored study roadmap instantly.",
      cta: "Launch Analyzer",
      color: "#3b9eff",
      glowColor: "#3b9eff",
      delay: 200,
    },
    {
      href: "/interview-prep",
      icon: Brain,
      title: "AI Interviewer",
      description: "Real-time voice/text mock interviews. Get instant feedback on clarity, confidence, and technical accuracy from an adaptive AI evaluator.",
      cta: "Start Interview",
      color: "#a78bfa",
      glowColor: "#a78bfa",
      delay: 300,
    },
  ];

  const stats = [
    { value: 98, suffix: "%", label: "Success Rate", icon: TrendingUp },
    { value: 12, suffix: "k+", label: "Audits Run", icon: Shield },
    { value: 50, suffix: "+", label: "Job Roles", icon: Sparkles },
    { value: 4.9, suffix: "/5", label: "User Rating", icon: Zap },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #050505; }

        .sp-root {
          min-height: 100vh;
          background: #050505;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
        }

        .sp-heading {
          font-family: 'Syne', sans-serif;
        }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-8px) rotate(1deg); }
          66%       { transform: translateY(-4px) rotate(-1deg); }
        }

        @keyframes gradRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse-ring {
          0%   { transform: scale(0.85); opacity: 0.6; }
          100% { transform: scale(1.15); opacity: 0; }
        }

        .hero-fadeup { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both; }
        .hero-fadein { animation: fadeIn 1s ease both; }

        .card-reveal {
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }

        .shimmer-text {
          background: linear-gradient(
            120deg,
            #fff 0%, #fff 30%,
            #00d296 45%,
            #3b9eff 55%,
            #fff 70%, #fff 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .btn-primary {
          position: relative; overflow: hidden;
          padding: 14px 32px;
          background: #00d296;
          color: #000;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: 0.03em;
          border-radius: 9999px;
          border: none; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.3s;
          text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.3), transparent 60%);
          transition: opacity 0.3s;
        }
        .btn-primary:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(0,210,150,0.5); }

        .btn-ghost {
          padding: 14px 32px;
          background: transparent;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
          backdrop-filter: blur(8px);
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.3); }

        .stat-card {
          position: relative;
          padding: 1.5rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 1.25rem;
          text-align: center;
          transition: all 0.3s;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,210,150,0.5), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .stat-card:hover { border-color: rgba(0,210,150,0.2); transform: translateY(-4px); }
        .stat-card:hover::before { opacity: 1; }

        .nav-link {
          position: relative; color: #888; font-size: 0.875rem; font-weight: 500;
          text-decoration: none; cursor: pointer; border: none; background: none;
          transition: color 0.2s; padding: 4px 0;
        }
        .nav-link::after {
          content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
          height: 1px; background: #00d296;
          transform: scaleX(0); transform-origin: left;
          transition: transform 0.3s;
        }
        .nav-link:hover { color: #fff; }
        .nav-link:hover::after { transform: scaleX(1); }

        .feature-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 9999px;
          background: rgba(0,210,150,0.08);
          border: 1px solid rgba(0,210,150,0.2);
          color: #00d296; font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
        }

        @media (max-width: 768px) {
          .modules-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-title { font-size: clamp(2.8rem, 10vw, 5rem) !important; }
          .nav-links { display: none !important; }
          .hero-btns { flex-direction: column; align-items: stretch !important; }
          .hero-btns a { text-align: center; justify-content: center; }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="sp-root">
        <ParticleCanvas />

        {/* Grid background */}
        <div className="grid-bg" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

        {/* Radial glows */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <div style={{
            position: "absolute", top: "-15%", left: "-10%",
            width: "50%", height: "50%", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,210,150,0.06) 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", right: "-10%",
            width: "45%", height: "45%", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,158,255,0.05) 0%, transparent 70%)",
          }} />
        </div>

        {/* ── NAV ── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          padding: "0 clamp(1.5rem, 5vw, 3rem)",
          height: "4.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          maxWidth: "1280px", margin: "0 auto",
          backdropFilter: navBlur ? "blur(20px)" : "none",
          WebkitBackdropFilter: navBlur ? "blur(20px)" : "none",
          background: navBlur ? "rgba(5,5,5,0.8)" : "transparent",
          borderBottom: navBlur ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
          transition: "background 0.4s, border-color 0.4s",
          width: "100%",
        }}>
          {/* Logo */}
          <div className="sp-heading" style={{
            display: "flex", alignItems: "center", gap: "10px",
            fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.02em",
          }}>
            <div style={{
              width: "36px", height: "36px",
              background: "linear-gradient(135deg, #00d296, #3b9eff)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Terminal size={18} color="#000" strokeWidth={2.5} />
            </div>
            <span>SkillPulse<span style={{ color: "#00d296" }}>.ai</span></span>
          </div>

          {/* Nav links */}
          <div className="nav-links" style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            {["Features", "Pricing", "Docs", "Blog"].map((item) => (
              <button key={item} className="nav-link">{item}</button>
            ))}
          </div>

          {/* Nav CTA */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link href="/auth/signin" style={{
              color: "#888", fontSize: "0.875rem", fontWeight: 500,
              textDecoration: "none", transition: "color 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "#888"}
            >
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn-primary" style={{ padding: "10px 22px", fontSize: "0.8rem" }}>
              Get Started <ChevronRight size={14} />
            </Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section ref={heroRef} style={{
          position: "relative", zIndex: 10,
          maxWidth: "1280px", margin: "0 auto",
          padding: "clamp(3rem, 8vw, 7rem) clamp(1.5rem, 5vw, 3rem) clamp(3rem, 6vw, 5rem)",
          textAlign: "center",
        }}>
          {/* Pill badge */}
          <div className="hero-fadein feature-pill" style={{ animationDelay: "0ms", margin: "0 auto 2rem" }}>
            <Sparkles size={12} style={{ animation: "float 3s ease-in-out infinite" }} />
            v2.0 Neural Engine — Now Live
          </div>

          {/* Headline */}
          <h1
            className="sp-heading hero-title shimmer-text hero-fadeup"
            style={{
              fontSize: "clamp(3.5rem, 8vw, 7.5rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
              animationDelay: "80ms",
            }}
          >
            Architect Your<br />Future Career.
          </h1>

          {/* Typewriter sub */}
          <p className="hero-fadeup" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#555",
            maxWidth: "600px",
            margin: "0 auto 1rem",
            lineHeight: 1.6,
            animationDelay: "160ms",
          }}>
            The autonomous career agent that bridges the gap between
          </p>
          <p className="hero-fadeup sp-heading" style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)",
            color: "#00d296",
            fontWeight: 700,
            marginBottom: "2.5rem",
            animationDelay: "240ms",
            letterSpacing: "-0.01em",
          }}>
            <Typewriter phrases={[
              "where you are → where you want to be.",
              "junior developer → staff engineer.",
              "job seeker → dream role holder.",
              "confused → confidently hired.",
            ]} />
          </p>

          {/* CTA buttons */}
          <div className="hero-btns hero-fadeup" style={{
            display: "flex", gap: "1rem", justifyContent: "center",
            alignItems: "center", animationDelay: "320ms", flexWrap: "wrap",
          }}>
            <Link href="/auth/signup" className="btn-primary">
              Start for Free <Sparkles size={15} />
            </Link>
            <Link href="/auth/signin" className="btn-ghost">
              Sign In <ArrowRight size={15} />
            </Link>
          </div>

          {/* Trust line */}
          <p className="hero-fadeup" style={{
            color: "#444", fontSize: "0.8rem", marginTop: "1.5rem",
            animationDelay: "400ms",
          }}>
            No credit card required · 12,000+ careers accelerated
          </p>
        </section>

        {/* ── MODULE CARDS ── */}
        <section style={{
          position: "relative", zIndex: 10,
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 clamp(1.5rem, 5vw, 3rem) clamp(4rem, 8vw, 7rem)",
        }}>
          {/* Section label */}
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="feature-pill" style={{ margin: "0 auto 1rem" }}>
              <Zap size={12} /> Core Modules
            </div>
            <h2 className="sp-heading" style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 800, letterSpacing: "-0.02em",
              color: "#fff",
            }}>
              Three tools. One mission.
            </h2>
          </div>

          <div className="modules-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
          }}>
            {modules.map((mod) => (
              <ModuleCard key={mod.href} {...mod} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{
          position: "relative", zIndex: 10,
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 clamp(1.5rem, 5vw, 3rem) clamp(4rem, 8vw, 7rem)",
        }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(0,210,150,0.04), rgba(59,158,255,0.03))",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "2rem",
            padding: "clamp(2rem, 5vw, 3.5rem)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "2rem",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Decorative corner */}
            <div style={{
              position: "absolute", top: 0, right: 0,
              width: "200px", height: "200px",
              background: "radial-gradient(circle at top right, rgba(0,210,150,0.06), transparent 70%)",
            }} />

            {[
              { step: "01", title: "Upload Your Profile", desc: "Resume, LinkedIn URL, or just your skills — we accept anything.", color: "#00d296" },
              { step: "02", title: "AI Deep Analysis", desc: "Multi-agent system dissects gaps, trends, and market fit in seconds.", color: "#3b9eff" },
              { step: "03", title: "Get Your Roadmap", desc: "Personalized action plan with resources, milestones, and timelines.", color: "#a78bfa" },
              { step: "04", title: "Practice & Execute", desc: "Mock interviews, resume rewrites, and progress tracking built-in.", color: "#f59e0b" },
            ].map(({ step, title, desc, color }) => (
              <div key={step} style={{ position: "relative" }}>
                <div style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "3rem", fontWeight: 800,
                  color: color + "20",
                  lineHeight: 1, marginBottom: "0.5rem",
                  letterSpacing: "-0.04em",
                }}>{step}</div>
                <h3 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700, fontSize: "1rem",
                  color: "#fff", marginBottom: "0.5rem",
                }}>{title}</h3>
                <p style={{ color: "#555", fontSize: "0.85rem", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS ── */}
        <section style={{
          position: "relative", zIndex: 10,
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 clamp(1.5rem, 5vw, 3rem) clamp(4rem, 8vw, 6rem)",
        }}>
          <div className="stats-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}>
            {stats.map(({ value, suffix, label, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div style={{
                  width: "2.5rem", height: "2.5rem", margin: "0 auto 0.75rem",
                  background: "rgba(0,210,150,0.1)", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#00d296",
                }}>
                  <Icon size={18} />
                </div>
                <div className="sp-heading" style={{
                  fontSize: "2.25rem", fontWeight: 800, color: "#fff",
                  letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "0.4rem",
                }}>
                  <Counter target={typeof value === "number" && value % 1 !== 0 ? value * 10 : value}
                    suffix={typeof value === "number" && value % 1 !== 0 ? "" : suffix}
                  />
                  {typeof value === "number" && value % 1 !== 0 && <span>/5</span>}
                </div>
                <div style={{ color: "#555", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA BANNER ── */}
        <section style={{
          position: "relative", zIndex: 10,
          maxWidth: "1280px", margin: "0 auto",
          padding: "0 clamp(1.5rem, 5vw, 3rem) clamp(4rem, 8vw, 6rem)",
        }}>
          <div style={{
            position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, #00d29610, #3b9eff08)",
            border: "1px solid rgba(0,210,150,0.15)",
            borderRadius: "2rem",
            padding: "clamp(2.5rem, 6vw, 4rem) clamp(2rem, 5vw, 3rem)",
            textAlign: "center",
          }}>
            {/* Animated border top */}
            <div style={{
              position: "absolute", top: 0, left: "10%", right: "10%", height: "1px",
              background: "linear-gradient(90deg, transparent, #00d296, transparent)",
            }} />

            <div className="feature-pill" style={{ margin: "0 auto 1.5rem" }}>
              <Sparkles size={12} /> Limited Early Access
            </div>
            <h2 className="sp-heading" style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 800, color: "#fff",
              letterSpacing: "-0.03em", marginBottom: "1rem",
            }}>
              Ready to accelerate<br />your career?
            </h2>
            <p style={{ color: "#555", fontSize: "1rem", marginBottom: "2rem", maxWidth: "500px", margin: "0 auto 2rem" }}>
              Join thousands of professionals who are using SkillPulse to land their dream roles faster.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="btn-primary">
                Start for Free — No Card Required <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          position: "relative", zIndex: 10,
          maxWidth: "1280px", margin: "0 auto",
          padding: "2rem clamp(1.5rem, 5vw, 3rem) 2.5rem",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: "1rem",
        }}>
          <div className="sp-heading" style={{
            fontWeight: 700, color: "#333", fontSize: "0.9rem",
          }}>
            SkillPulse<span style={{ color: "#00d296" }}>.ai</span>
          </div>
          <div style={{ color: "#333", fontSize: "0.8rem" }}>
            © 2025 SkillPulse. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a key={l} href="#" style={{
                color: "#444", fontSize: "0.8rem",
                textDecoration: "none", transition: "color 0.2s",
              }}
                onMouseEnter={e => e.target.style.color = "#00d296"}
                onMouseLeave={e => e.target.style.color = "#444"}
              >{l}</a>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}