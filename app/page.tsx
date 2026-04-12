"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Brain, FileText, ArrowRight, Terminal, Sparkles, Map, Menu, X,
  Cpu, Zap, Trophy, Target, LogOut, ChevronRight, Star,
  Shield, Clock, BarChart3, Flame,
} from "lucide-react";

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Navbar({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#050505]/90 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/50"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-black text-xl tracking-tighter group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/60 transition-all">
              <Cpu size={15} className="text-white" />
            </div>
            <span>
              Skill<span className="text-blue-500">Pulse</span>
            </span>
          </Link>

          {/* Desktop Center Links */}
          <div className="hidden md:flex items-center gap-1">
            {["Features", "Pricing", "Docs"].map((item) => (
              <button
                key={item}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all font-medium"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              /* ── LOGGED-IN STATE ── */
              <>
                <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-300 font-medium max-w-[120px] truncate">
                    {user.email}
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                >
                  <Zap size={14} />
                  Dashboard
                </Link>
                <button
                  onClick={onLogout}
                  className="w-8 h-8 rounded-xl bg-white/4 hover:bg-red-500/15 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all border border-white/6"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              /* ── LOGGED-OUT STATE ── */
              <>
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white font-medium rounded-xl hover:bg-white/5 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-lg"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 border-t border-white/5 bg-[#080808]/95 backdrop-blur-xl ${
            mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 py-4 space-y-2">
            {["Features", "Pricing", "Docs"].map((item) => (
              <button
                key={item}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                {item}
              </button>
            ))}
            <div className="pt-2 border-t border-white/5 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/4 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-300 truncate">{user.email}</span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl"
                  >
                    <Zap size={14} /> Go to Dashboard
                  </Link>
                  <button
                    onClick={() => { onLogout(); setMobileOpen(false); }}
                    className="w-full py-2.5 text-sm text-gray-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full py-2.5 text-center text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full py-2.5 text-center bg-white text-black text-sm font-bold rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="h-16" />
    </>
  );
}

// ─── LOGGED-IN HERO BANNER ────────────────────────────────────────────────────
function LoggedInBanner({ user }: { user: any }) {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4">
      <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-blue-500/30 shrink-0">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-white font-black text-sm">
                Welcome back, {user.email?.split("@")[0]} 👋
              </p>
              <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                Active
              </span>
            </div>
            <p className="text-gray-500 text-xs">
              Your learning missions are waiting — keep the streak alive.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          <Zap size={14} className="animate-pulse" />
          Continue Learning
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ user }: { user: any }) {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-24 text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-[10px] sm:text-xs font-bold mb-8 backdrop-blur-md">
        <Sparkles size={12} className="animate-pulse" />
        <span className="uppercase tracking-[0.15em]">Neural Engine v2.0 · Live</span>
      </div>

      {/* Headline */}
      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-black tracking-tighter mb-6 leading-[1.0] sm:leading-[1.0]">
        <span className="bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
          Architecting
        </span>
        <br />
        <span className="bg-gradient-to-b from-blue-400 via-blue-500 to-blue-800 bg-clip-text text-transparent">
          Future Careers.
        </span>
      </h1>

      {/* Subheading */}
      <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed px-4 sm:px-0">
        The autonomous career agent that bridges the gap between where you are and where you want to be.{" "}
        <span className="text-gray-200 font-medium">Audit. Plan. Conquer.</span>
      </p>

      {/* CTA Buttons */}
      {user ? (
        /* Logged in: show dashboard shortcut + quick actions */
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.12)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 text-sm"
          >
            <Zap size={16} />
            Continue on Dashboard
          </Link>
          <Link
            href="/resume-analyzer"
            className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all text-sm text-gray-300 hover:text-white"
          >
            <FileText size={15} />
            Audit My Resume
          </Link>
        </div>
      ) : (
        /* Logged out: signup CTA */
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-sm mx-auto sm:max-w-none">
          <Link
            href="/auth/signup"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.12)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 text-sm"
          >
            Get Started Free
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/auth/signin"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all text-sm text-gray-300 hover:text-white"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Social proof strip */}
      {!user && (
        <p className="mt-6 text-[11px] text-gray-600 flex items-center justify-center gap-2">
          <Star size={10} className="text-yellow-500 fill-yellow-500" />
          Trusted by 12,000+ professionals — no credit card required
        </p>
      )}
    </div>
  );
}

// ─── MODULE CARDS ─────────────────────────────────────────────────────────────
const MODULES = [
  {
    href: "/dashboard",
    icon: Map,
    label: "Career Architect",
    desc: "Input your dream role. Our multi-agent system plans milestones, scrapes resources, and schedules your success path.",
    cta: "Generate Roadmap",
    accent: "green",
    border: "hover:border-green-500/40",
    iconBg: "bg-green-500/10 group-hover:bg-green-500",
    iconColor: "text-green-500 group-hover:text-white",
    glow: "from-green-500/8",
    ctaColor: "text-green-400",
  },
  {
    href: "/resume-analyzer",
    icon: FileText,
    label: "Resume Audit",
    desc: "Upload your resume and JD. Our agent scans for missing keywords, suggests project ideas, and builds a study roadmap.",
    cta: "Launch Analyzer",
    accent: "blue",
    border: "hover:border-blue-500/40",
    iconBg: "bg-blue-500/10 group-hover:bg-blue-500",
    iconColor: "text-blue-500 group-hover:text-white",
    glow: "from-blue-500/8",
    ctaColor: "text-blue-400",
  },
  {
    href: "/interview-prep",
    icon: Brain,
    label: "AI Interviewer",
    desc: "Real-time voice/text mock interviews. Get instant feedback on clarity, confidence, and technical accuracy.",
    cta: "Start Interview",
    accent: "purple",
    border: "hover:border-purple-500/40",
    iconBg: "bg-purple-500/10 group-hover:bg-purple-500",
    iconColor: "text-purple-500 group-hover:text-white",
    glow: "from-purple-500/8",
    ctaColor: "text-purple-400",
  },
];

// ─── FEATURES (shown below modules) ──────────────────────────────────────────
const FEATURES = [
  { icon: Zap,      label: "XP & Levels",      desc: "Earn XP for every milestone, quiz, and daily goal you crush.", color: "text-blue-400",   bg: "bg-blue-500/10"   },
  { icon: Flame,    label: "Streak Tracking",   desc: "Build unstoppable daily learning habits with fire streaks.",   color: "text-orange-400", bg: "bg-orange-500/10" },
  { icon: Trophy,   label: "Achievements",      desc: "Unlock badges that showcase your real skill progression.",      color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { icon: Target,   label: "Daily Goals",       desc: "Hit personalized time and quiz targets every single day.",      color: "text-green-400",  bg: "bg-green-500/10"  },
  { icon: Shield,   label: "Milestone Tests",   desc: "Prove your knowledge with AI-generated graded assessments.",   color: "text-purple-400", bg: "bg-purple-500/10" },
  { icon: BarChart3,"label": "Progress Analytics", desc: "Visual dashboards showing exactly how far you've come.",  color: "text-sky-400",    bg: "bg-sky-500/10"    },
];

// ─── STATS ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "98%",  label: "Success Rate" },
  { value: "12k+", label: "Audits Run"   },
  { value: "50+",  label: "Job Roles"    },
  { value: "GPT-4o", label: "Core Neural" },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser ?? null);
      setLoadingSession(false);
    };
    checkSession();

    // Listen for auth state changes (login/logout in other tabs etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">

      {/* ── Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[55%] sm:w-[40%] h-[45%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[55%] sm:w-[40%] h-[45%] rounded-full bg-purple-900/10 blur-[120px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Grain */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.12] brightness-100 contrast-150" />
      </div>

      {/* ── Navbar ── */}
      <Navbar user={user} onLogout={handleLogout} />

      {/* ── Logged-in banner (only when signed in) ── */}
      {!loadingSession && user && <LoggedInBanner user={user} />}

      {/* ── Hero ── */}
      {!loadingSession && <Hero user={user} />}

      {/* ── Loading skeleton for session check ── */}
      {loadingSession && (
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 flex flex-col items-center gap-6">
          <div className="w-48 h-5 bg-white/5 rounded-full animate-pulse" />
          <div className="w-96 h-16 bg-white/5 rounded-3xl animate-pulse" />
          <div className="w-80 h-6 bg-white/5 rounded-full animate-pulse" />
          <div className="flex gap-3">
            <div className="w-36 h-12 bg-white/5 rounded-2xl animate-pulse" />
            <div className="w-28 h-12 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      )}

      {/* ── Module Cards ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={`group relative overflow-hidden bg-[#0a0a0a] border border-white/8 rounded-[2rem] p-6 sm:p-8 transition-all duration-500 ${mod.border} flex flex-col hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10 flex-1 flex flex-col">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 mb-6 ${mod.iconBg} rounded-2xl flex items-center justify-center ${mod.iconColor} group-hover:scale-110 transition-all duration-500`}
                >
                  <Icon size={24} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black mb-3 text-white tracking-tight">{mod.label}</h2>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed flex-1">{mod.desc}</p>
                <div className={`flex items-center gap-2 text-sm font-bold ${mod.ctaColor} mt-auto`}>
                  {mod.cta}
                  <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Features Grid ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 mb-24">
        <div className="text-center mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-3">Platform Features</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            Built for Serious Learners
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.label}
                className="group bg-[#0a0a0a] border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`w-9 h-9 ${feat.bg} rounded-xl flex items-center justify-center ${feat.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={17} />
                </div>
                <h3 className="font-black text-white text-sm mb-1.5">{feat.label}</h3>
                <p className="text-gray-600 text-[12px] leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CTA Banner (logged-out only) ── */}
      {!loadingSession && !user && (
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 mb-24">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/15 via-blue-500/5 to-purple-600/10 border border-blue-500/20 rounded-3xl p-10 sm:p-14 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-blue-600/10 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-xs font-bold mb-5">
                <Sparkles size={12} />First mission is completely FREE
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
                Start Your First<br className="hidden sm:block" /> Learning Mission
              </h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
                Generate a personalised roadmap, get AI mentoring, and track your growth — all for free on your first career mission.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.12)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 text-sm"
              >
                <Zap size={16} />
                Launch for Free
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Logged-in CTA Banner ── */}
      {!loadingSession && user && (
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 mb-24">
          <div className="relative overflow-hidden bg-gradient-to-br from-green-600/10 via-blue-500/5 to-blue-600/10 border border-green-500/20 rounded-3xl p-10 sm:p-14 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-green-400 text-xs font-bold mb-5">
                <Flame size={12} />You're on a roll — keep going
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
                Your Journey Continues
              </h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
                Head back to your dashboard to track milestones, chat with your Neural Mentor, and keep your streak alive.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-lg hover:-translate-y-0.5 text-sm"
                >
                  <Zap size={16} className="animate-pulse" />
                  Go to Dashboard
                </Link>
                <Link
                  href="/resume-analyzer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-gray-300 font-bold rounded-2xl hover:bg-white/10 hover:text-white transition-all text-sm"
                >
                  <FileText size={15} />
                  Audit Resume
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats / Footer ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 border-t border-white/5 pt-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center group">
              <div className="text-3xl sm:text-4xl font-black bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent mb-1 tabular-nums">
                {s.value}
              </div>
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-gray-600 group-hover:text-gray-400 transition-colors">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        {/* Footer links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm font-black tracking-tighter">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <Cpu size={11} className="text-white" />
            </div>
            Skill<span className="text-blue-500">Pulse</span>
          </div>
          <p className="text-[11px] text-gray-700">
            © {new Date().getFullYear()} SkillPulse. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-gray-600">
            <button className="hover:text-white transition-colors">Privacy</button>
            <button className="hover:text-white transition-colors">Terms</button>
            <button className="hover:text-white transition-colors">Contact</button>
          </div>
        </div>
      </div>
    </div>
  );
}