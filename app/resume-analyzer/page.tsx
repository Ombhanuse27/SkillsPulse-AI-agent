"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser, clearUser } from '@/store/slices/userSlice';
import { loadUserProgress } from '@/store/slices/progressSlice';

import { 
  Upload, Brain, CheckCircle, Terminal, 
  ExternalLink, RefreshCw, AlertOctagon, 
  Play, Lightbulb, Clock, Target, 
  TrendingUp, Eye, ShieldCheck, Zap, Layers,
  ChevronRight, Calendar, FileText,
  Menu, Home, Map, LogOut, ChevronLeft, Cpu, Sparkles
} from "lucide-react";

// ─── COST CONFIGURATION ───────────────────────────────────────────────────────
const RESUME_ANALYSIS_XP_COST = 50;

// ─── NAVBAR CONSTANTS & COMPONENT ─────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/dashboard',        icon: Home,     color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { label: 'Career Architect', href: '/dashboard',        icon: Map,      color: 'text-green-400',  bg: 'bg-green-500/10'  },
  { label: 'Resume Audit',     href: '/resume-analyzer',  icon: FileText, color: 'text-sky-400',    bg: 'bg-sky-500/10'    },
  { label: 'AI Interviewer',   href: '/interview-prep',   icon: Brain,    color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

function Navbar({ user, onLogout, progress }: { user: any; onLogout: () => void; progress?: any; }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const xpPercentage = progress?.stats
    ? ((progress.stats.nextLevelXP - progress.stats.xpToNextLevel) / progress.stats.nextLevelXP) * 100
    : 0;

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-[#0d0d0d] border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#080808] border-r border-white/8 transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-[68px]' : 'md:w-64'}
        `}
      >
        <div className={`flex items-center border-b border-white/8 shrink-0 h-16 transition-all duration-300 ${collapsed ? 'px-3 justify-center' : 'px-5 justify-between'}`}>
          <Link href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tighter group min-w-0">
            <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <Cpu size={17} className="text-white" />
            </div>
            {!collapsed && (
              <span className="truncate">Skill<span className="text-blue-500">Pulse</span></span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden md:flex w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-600 hover:text-white transition-all shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex mx-auto mt-2 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-600 hover:text-white transition-all"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {!collapsed && (
          <p className="px-5 pt-5 pb-2 text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">Menu</p>
        )}

        <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'px-2 pt-3' : 'px-3'}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${collapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5'}
                  ${isCurrent
                    ? `${item.bg} ${item.color} border border-white/10`
                    : 'text-gray-400 hover:text-white hover:bg-white/6 border border-transparent'
                  }`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                  ${isCurrent ? `${item.bg}` : 'bg-white/4 group-hover:bg-white/10'}
                  ${item.color}`}
                >
                  <Icon size={15} />
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {progress?.stats && !collapsed && (
          <div className="px-3 py-3 mx-3 mb-3 bg-[#0e0e0e] border border-white/6 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Level {progress.stats.level}</p>
                <p className="text-sm font-black text-white tabular-nums">
                  {progress.stats.totalXP.toLocaleString()}
                  <span className="text-blue-400 text-[11px] ml-1">XP</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Zap size={14} className="text-blue-400 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600">{progress.stats.xpToNextLevel} XP to Level {progress.stats.level + 1}</p>
          </div>
        )}

        {progress?.stats && collapsed && (
          <div className="flex flex-col items-center gap-2 pb-3 px-2">
            <div title={`${progress.stats.totalXP.toLocaleString()} XP`} className="w-10 h-10 bg-blue-500/10 rounded-xl flex flex-col items-center justify-center border border-blue-500/15">
              <Zap size={13} className="text-blue-400" />
            </div>
          </div>
        )}

        <div className={`border-t border-white/8 shrink-0 ${collapsed ? 'p-2' : 'p-4'}`}>
          {!user ? (
            <div className="flex justify-center">
              <Link href="/auth/signin" className="text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-lg transition-colors w-full text-center">
                {collapsed ? <LogOut size={14} className="mx-auto" /> : "Sign In"}
              </Link>
            </div>
          ) : collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="w-9 h-9 rounded-xl bg-white/4 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-white/4 hover:bg-red-500/15 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all shrink-0"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── MAIN RESUME ANALYZER PAGE ────────────────────────────────────────────────
export default function ResumeAnalyzerPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const supabase = createClient();

  const user = useAppSelector((s) => s.user.user);
  const { userProgress } = useAppSelector((s) => s.progress);

  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("overview"); 
  const [quizData, setQuizData] = useState<any>(null);
  const [projectIdeas, setProjectIdeas] = useState<any>(null); 
  const [featureLoading, setFeatureLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});

  // Initialize Auth & Progress
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        dispatch(setUser(authUser));
        dispatch(loadUserProgress(authUser.id));
      }
    };
    init();
  }, [dispatch, supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(clearUser());
    router.push('/');
  };

  const handleProcess = async () => {
    if (!file || !jobRole || !jdText) { 
      alert("Please fill in all fields"); 
      return; 
    }

    // ─── GATE CHECK: FREE TIER VS PAID TIER ───────────────────────────────
    if (!user) {
      const hasUsedFree = localStorage.getItem('free_resume_analysis_used');
      if (hasUsedFree) {
        alert("You have used your one free analysis. Please sign in to continue building your career!");
        router.push('/auth/signin');
        return;
      }
    } else {
      const currentXP = userProgress?.stats?.totalXP ?? 0;
      if (currentXP < RESUME_ANALYSIS_XP_COST) {
        alert(`You need ${RESUME_ANALYSIS_XP_COST} XP to analyze a resume. You currently have ${currentXP} XP. Complete more milestones to earn XP!`);
        return;
      }
    }

    setLoading(true); 
    setResult(null);

    try {
      // 1. If logged in, deduct XP before proceeding
      if (user) {
        const deductResult = await fetch('/api/progress', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deduct_xp', userId: user.id, data: { amount: RESUME_ANALYSIS_XP_COST } }),
        });
        const deductData = await deductResult.json();
        if (!deductData.success) {
          throw new Error(deductData.error || 'Failed to deduct XP. Analysis aborted.');
        }
        dispatch(loadUserProgress(user.id));
      }

      // 2. Process Resume
      const formData = new FormData(); formData.append("file", file);
      const parseRes = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const parseData = await parseRes.json();
      
      if (!parseData.text || parseData.text.trim().length === 0) {
        throw new Error("No readable text found in PDF. Please upload a text-based resume.");
      }

      setResumeId(parseData.resumeId); 

      const query = `
        mutation {
          analyzeApplication(
            resumeText: ${JSON.stringify(parseData.text)}, 
            resumeId: "${parseData.resumeId || ""}",
            jobDescription: ${JSON.stringify(jdText)},
            jobRole: "${jobRole}"
          ) {
            score status summary projectIdea interviewPrep
            topMissingSkills recommendedStack coverLetter
            roadmap { week goal tasks resources { title url type } }
            atsFixes { original improved reason }
          }
        }
      `;
      const aiRes = await fetch("/api/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const { data, errors } = await aiRes.json();
      
      if (errors || !data) throw new Error("Analysis failed");
      
      // 3. Mark free tier as used if not logged in
      if (!user) {
        localStorage.setItem('free_resume_analysis_used', 'true');
      }

      setResult(data.analyzeApplication);
    } catch (err: any) { 
      console.error(err); 
      alert(err.message || "Error processing resume"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleGenerateQuiz = async (topic: string) => {
    setFeatureLoading(true);
    const query = `mutation { generateQuiz(topic: "${topic}", jobRole: "${jobRole}") { question options correctAnswer explanation } }`;
    const res = await fetch("/api/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    const { data } = await res.json();
    setQuizData(data.generateQuiz);
    setSelectedAnswers({});
    setActiveTab("quiz");
    setFeatureLoading(false);
  };

  const handleGenerateIdeas = async () => {
    setFeatureLoading(true);
    const missingSkills = result.topMissingSkills || [];
    const query = `mutation { generateProjectIdeas(missingSkills: ${JSON.stringify(missingSkills)}, jobRole: "${jobRole}",jobDescription: ${JSON.stringify(jdText)}) { title description difficulty techStack keyFeatures } }`;
    try {
      const res = await fetch("/api/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const { data } = await res.json();
      setProjectIdeas(data.generateProjectIdeas);
      setActiveTab("builder"); 
    } catch (error) { alert("Failed to generate ideas."); } finally { setFeatureLoading(false); }
  };

  const getQuizTopic = () => (result?.topMissingSkills?.length > 0 ? result.topMissingSkills[0] : jobRole);

  const getDerivedMetrics = () => {
    if (!result) return { timeToReady: "N/A", strengths: [], quickWins: [], coverage: 0 };
    
    const timeToReady = result.roadmap ? `${result.roadmap.length} Weeks` : "N/A";
    const allTech = result.recommendedStack ? result.recommendedStack.split(',').map((s: string) => s.trim()) : [];
    const missing = result.topMissingSkills || [];
    const strengths = allTech.filter((t: string) => !missing.includes(t)).slice(0, 4);
    
    const rawCoverage = allTech.length > 0 
      ? Math.round(((allTech.length - missing.length) / allTech.length) * 100) 
      : 0;
    const coverage = Math.max(0, rawCoverage);

    return { timeToReady, strengths, quickWins: [], coverage };
  };

  const metrics = getDerivedMetrics();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      
      {/* ── VERTICAL SIDEBAR NAVBAR ── */}
      <Navbar user={user} onLogout={handleLogout} progress={userProgress ?? undefined} />

      {/* ── MAIN AREA — offset for sidebar ── */}
      <div className="md:ml-64 transition-all duration-300 relative z-10 p-6 md:p-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pt-12 md:pt-0">
          
          {/* INPUT SECTION */}
          <div className="lg:col-span-4 space-y-6">
            <div className="mb-4">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Resume Audit</h1>
              <p className="text-gray-500 mt-2 text-sm">AI-powered resume alignment & roadmap.</p>
            </div>
            <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
              
              {!user && !localStorage.getItem('free_resume_analysis_used') && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Sparkles size={14} /> Your first analysis is free!
                </div>
              )}
              {user && (
                <div className="flex justify-between items-center text-xs font-bold px-1">
                  <span className="text-gray-400">Cost: <span className="text-blue-400">{RESUME_ANALYSIS_XP_COST} XP</span></span>
                  <span className="text-gray-400">Balance: <span className={((userProgress?.stats?.totalXP ?? 0) >= RESUME_ANALYSIS_XP_COST) ? "text-green-400" : "text-red-400"}>{userProgress?.stats?.totalXP ?? 0} XP</span></span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Target Role</label>
                <input value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Backend Engineer" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Job Description</label>
                <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-32 bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500 custom-scrollbar" placeholder="Paste JD..." />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Resume (PDF)</label>
                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition"/>
              </div>
              
              <button 
                onClick={handleProcess} 
                disabled={loading || (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST)} 
                className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all ${loading ? 'bg-gray-700' : (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST) ? 'bg-red-500/20 text-red-300 border border-red-500/30 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {loading ? "Analyzing Context..." : (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST) ? "Not Enough XP" : "Launch Analysis 🚀"}
              </button>
            </div>
          </div>

          {/* DASHBOARD */}
          <div className="lg:col-span-8">
            {!result ? (
              <div className="h-full bg-[#111] rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-gray-600 p-10 min-h-[600px]">
                <Terminal size={64} className="opacity-20 mb-4" />
                <p className="font-bold">Ready to analyze.</p>
                <p className="text-xs text-gray-500 mt-2">Upload your resume and the job description to see your fit.</p>
              </div>
            ) : (
              <div className="bg-[#111] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                
                {/* Header */}
                <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-900/10 to-purple-900/10">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Agent Report</h2>
                    <div className="flex gap-2 mt-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-300">{result.status} Match</span>
                      {resumeId && <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-500/20 text-purple-300">DB Cached</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-black ${result.score > 70 ? "text-green-500" : "text-yellow-500"}`}>{result.score}%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Fit Score</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800 overflow-x-auto custom-scrollbar">
                  {['overview', 'roadmap', 'ats', 'letter', 'quiz', 'builder'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition whitespace-nowrap ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/5' : 'text-gray-500 hover:text-gray-300'}`}>
                      {tab === 'letter' ? 'Cover Letter' : tab === 'builder' ? 'Ideas' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                  
                  {/* 1. OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="animate-in fade-in space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800"><div className="text-gray-500 text-xs font-bold uppercase mb-2">Time to Ready</div><div className="text-2xl font-bold text-white">{metrics.timeToReady}</div></div>
                          <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800"><div className="text-gray-500 text-xs font-bold uppercase mb-2">Portfolio Status</div><div className="text-2xl font-bold text-white">{result.status}</div></div>
                          <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800"><div className="text-gray-500 text-xs font-bold uppercase mb-2">Tech Coverage</div><div className="text-2xl font-bold text-white">{metrics.coverage}%</div></div>
                      </div>
                      
                      <div className="bg-blue-900/10 p-6 rounded-xl border border-blue-900/30">
                          <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><Brain size={18}/> Executive Summary</h3>
                          <p className="text-blue-100/80 leading-relaxed">"{result.summary}"</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                               <h4 className="text-green-400 font-bold text-sm mb-4 flex items-center gap-2"><Zap size={16}/> Strength Highlights</h4>
                               <div className="flex flex-wrap gap-2">{metrics.strengths?.map((s: string, i: number) => <span key={i} className="px-3 py-1.5 bg-green-900/20 border border-green-500/30 text-green-300 rounded text-xs">{s}</span>)}</div>
                          </div>
                          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                              <h4 className="text-red-400 font-bold text-sm mb-4 flex items-center gap-2"><AlertOctagon size={16}/> Critical Skill Gaps</h4>
                               <div className="flex flex-wrap gap-2">{result.topMissingSkills?.map((s: string, i: number) => <span key={i} className="px-3 py-1.5 bg-red-900/20 border border-red-500/30 text-red-300 rounded text-xs">{s}</span>)}</div>
                          </div>
                      </div>

                      {/* GENERATE BUTTONS */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4">
                         <button onClick={() => handleGenerateQuiz(getQuizTopic())} disabled={featureLoading} className="p-4 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl hover:scale-[1.02] transition text-left group">
                           <h3 className="font-bold text-white flex items-center gap-2"><Play size={20} className="text-purple-400"/> Test My Knowledge</h3>
                           <p className="text-xs text-gray-400 mt-1">{featureLoading ? "Generating..." : `Take a ${getQuizTopic()} quiz.`}</p>
                         </button>
                         <button onClick={handleGenerateIdeas} disabled={featureLoading} className="p-4 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-xl hover:scale-[1.02] transition text-left group">
                           <h3 className="font-bold text-white flex items-center gap-2"><Lightbulb size={20} className="text-green-400"/> Project Ideas</h3>
                           <p className="text-xs text-gray-400 mt-1">{featureLoading ? "Brainstorming..." : "Generate portfolio ideas."}</p>
                         </button>
                      </div>
                    </div>
                  )}

                  {/* 2. ROADMAP TAB */}
                  {activeTab === 'roadmap' && (
                    <div className="space-y-0 animate-in fade-in relative">
                      <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-800"></div>
                      {result.roadmap?.map((week: any, i: number) => (
                        <div key={i} className="relative pl-16 pb-8 group">
                          <div className="absolute left-3 top-0 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 border-blue-500 z-10 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-blue-500"></div></div>
                          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 hover:border-blue-500/30 transition shadow-lg">
                            <h3 className="text-xl font-bold text-white mb-4">
                              <span className="text-blue-400">{week.week.toString().toLowerCase().includes("week") ? week.week : `Week ${week.week}`}</span>: {week.goal}
                            </h3>
                            <div className="space-y-3">{week.tasks.map((t: string, j: number) => (<div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-black/40 border border-gray-800/50"><span className="text-sm text-gray-300">{t}</span></div>))}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. ATS FIXES TAB */}
                  {activeTab === 'ats' && (
                    <div className="space-y-6 animate-in fade-in">
                      {(!result.atsFixes || result.atsFixes.length === 0) ? (
                          <div className="text-center text-gray-500 py-10">No ATS improvements needed. Good job!</div>
                      ) : (
                          result.atsFixes.map((fix: any, i: number) => (
                          <div key={i} className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden group">
                              <div className="p-5 bg-red-900/5 border-b border-red-900/10">
                              <div className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-2"><AlertOctagon size={12}/> Original</div>
                              <p className="text-gray-500 text-sm line-through decoration-red-500/30">{fix.original}</p>
                              </div>
                              <div className="p-5 bg-green-900/5">
                              <div className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-2"><CheckCircle size={12}/> AI Improvement</div>
                              <p className="text-gray-200 text-sm font-medium leading-relaxed">{fix.improved}</p>
                              <div className="mt-3 pt-3 border-t border-green-500/10"><p className="text-xs text-green-500/70 italic flex gap-2"><Lightbulb size={12}/> {fix.reason}</p></div>
                              </div>
                          </div>
                          ))
                      )}
                    </div>
                  )}

                  {/* 4. COVER LETTER TAB */}
                  {activeTab === 'letter' && (
                    <div className="space-y-6 animate-in fade-in">
                      <div className="bg-[#1a1a1a] p-8 rounded-xl border border-gray-800 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-2xl font-bold text-white flex items-center gap-2"><FileText size={24} className="text-blue-400"/> Generated Cover Letter</h3>
                          <button onClick={() => navigator.clipboard.writeText(result.coverLetter)} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-gray-300 transition">Copy Text</button>
                        </div>
                        <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-line leading-relaxed">
                          {result.coverLetter || "No cover letter generated."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. QUIZ TAB */}
                  {activeTab === 'quiz' && (
                    <div className="space-y-6 animate-in fade-in">
                       {!quizData ? <div className="text-center text-gray-500 py-10">Select "Test My Knowledge" in Overview tab.</div> : quizData.map((q:any, i:number) => (
                          <div key={i} className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                            <h4 className="font-bold text-white mb-4">{q.question}</h4>
                            <div className="space-y-2">{q.options.map((opt:string, idx:number) => (<button key={idx} onClick={() => setSelectedAnswers(prev => ({...prev, [i]: idx}))} className={`w-full text-left p-4 rounded-lg border text-sm transition font-medium ${selectedAnswers[i]===idx ? (idx===q.correctAnswer ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400') : 'bg-black/50 border-gray-700'}`}>{opt}</button>))}</div>
                          </div>
                       ))}
                    </div>
                  )}

                  {/* 6. BUILDER TAB */}
                  {activeTab === 'builder' && (
                     <div className="space-y-6 animate-in fade-in">
                       {!projectIdeas ? <div className="text-center text-gray-500 py-10">Select "Project Ideas" in Overview tab.</div> : projectIdeas.map((idea:any, i:number) => (
                          <div key={i} className="p-6 rounded-xl border border-gray-800 bg-[#1a1a1a]">
                              <h3 className="text-xl font-bold text-white mb-2">{idea.title}</h3>
                              <p className="text-gray-400 text-sm mb-4">{idea.description}</p>
                              <div className="flex gap-2 flex-wrap">{idea.techStack.map((t:string, k:number) => <span key={k} className="px-2 py-1 bg-black rounded border border-gray-800 text-xs text-gray-400">{t}</span>)}</div>
                          </div>
                       ))}
                     </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}