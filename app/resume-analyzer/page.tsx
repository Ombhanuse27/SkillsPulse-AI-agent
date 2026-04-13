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
  Menu, Home, Map, LogOut, ChevronLeft, Cpu, Sparkles,
  Briefcase, AlignLeft, FileUp
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
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden relative">
      
      {/* ── BACKGROUND AMBIENT GLOWS ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[150px]" />
      </div>

      {/* ── VERTICAL SIDEBAR NAVBAR (Only when logged in) ── */}
      {user && (
        <Navbar user={user} onLogout={handleLogout} progress={userProgress ?? undefined} />
      )}

      {/* ── MAIN AREA ── */}
      <div className={`transition-all duration-300 relative z-10 p-4 sm:p-8 md:p-12 ${user ? 'md:ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 pt-12 md:pt-0">
          
          {/* INPUT SECTION */}
          <div className="xl:col-span-4 space-y-6">
            <div className="mb-4">
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-sky-400 to-purple-400 bg-clip-text text-transparent tracking-tight">Resume Audit</h1>
              <p className="text-gray-400 mt-2 text-sm leading-relaxed">AI-powered resume alignment, gap analysis, and tailored career roadmap.</p>
            </div>
            
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] space-y-5 relative overflow-hidden">
              {/* Decorative top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />

              {!user && !localStorage.getItem('free_resume_analysis_used') && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                  <Sparkles size={16} className="text-green-300 animate-pulse" /> 
                  <span>Your first analysis is on the house!</span>
                </div>
              )}
              {user && (
                <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-3">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-gray-300">Cost: {RESUME_ANALYSIS_XP_COST} XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Balance</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${((userProgress?.stats?.totalXP ?? 0) >= RESUME_ANALYSIS_XP_COST) ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {userProgress?.stats?.totalXP ?? 0} XP
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Briefcase size={12}/> Target Role</label>
                <input 
                  value={jobRole} 
                  onChange={(e) => setJobRole(e.target.value)} 
                  className="w-full bg-black/50 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600" 
                  placeholder="e.g. Senior Frontend Engineer" 
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlignLeft size={12}/> Job Description</label>
                <textarea 
                  value={jdText} 
                  onChange={(e) => setJdText(e.target.value)} 
                  className="w-full h-36 bg-black/50 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all custom-scrollbar placeholder:text-gray-600 resize-none" 
                  placeholder="Paste the target job description here..." 
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileUp size={12}/> Resume (PDF)</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:bg-white/5 file:text-white file:font-medium file:cursor-pointer hover:file:bg-white/10 file:transition-all cursor-pointer border border-white/10 rounded-xl bg-black/50 overflow-hidden group-hover:border-white/20 transition-all"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleProcess} 
                disabled={loading || (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST)} 
                className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 group
                  ${loading 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                    : (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST) 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 hover:-translate-y-0.5'
                  }`}
              >
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Analyzing Context...</>
                ) : (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST) ? (
                  "Not Enough XP"
                ) : (
                  <><Sparkles size={16} className="group-hover:animate-pulse" /> Launch Analysis</>
                )}
              </button>
            </div>
          </div>

          {/* DASHBOARD */}
          <div className="xl:col-span-8">
            {!result ? (
              <div className="h-full bg-[#0a0a0a]/50 backdrop-blur-sm rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center p-12 min-h-[600px] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-50" />
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 relative z-10">
                  <Terminal size={32} className="text-gray-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-2 relative z-10">Awaiting Submissions</h3>
                <p className="text-sm text-gray-500 max-w-sm relative z-10">Upload your resume and a target job description to uncover your fit, skill gaps, and a personalized learning roadmap.</p>
              </div>
            ) : (
              <div className="bg-[#0a0a0a]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gradient-to-r from-blue-900/10 via-transparent to-purple-900/10 relative">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      <ShieldCheck size={24} className="text-blue-400" /> Agent Report
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-300 border border-blue-500/20">{result.status} Match</span>
                      {resumeId && <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-300 border border-purple-500/20">DB Cached</span>}
                    </div>
                  </div>
                  <div className="text-left sm:text-right bg-black/40 p-4 rounded-2xl border border-white/5 min-w-[140px]">
                    <div className={`text-4xl font-black ${result.score >= 80 ? "text-green-400" : result.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                      {result.score}<span className="text-2xl text-gray-500">%</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Overall Fit Score</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 overflow-x-auto custom-scrollbar px-2">
                  {['overview', 'roadmap', 'ats', 'letter', 'quiz', 'builder'].map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      className={`px-5 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap relative
                        ${activeTab === tab ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-t-xl'}
                      `}
                    >
                      {tab === 'letter' ? 'Cover Letter' : tab === 'builder' ? 'Ideas' : tab}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-6 md:p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                  
                  {/* 1. OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-1">Time to Ready</div>
                          <div className="text-2xl font-black text-white">{metrics.timeToReady}</div>
                        </div>
                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-1">Portfolio Status</div>
                          <div className="text-2xl font-black text-white capitalize">{result.status.replace('_', ' ')}</div>
                        </div>
                        <div className="bg-black/40 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-1">Tech Coverage</div>
                          <div className="text-2xl font-black text-white">{metrics.coverage}%</div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 p-6 rounded-2xl border border-blue-500/20 shadow-inner">
                        <h3 className="text-blue-400 font-black text-sm mb-3 flex items-center gap-2 uppercase tracking-wide"><Brain size={16}/> Executive Summary</h3>
                        <p className="text-blue-50 text-sm leading-relaxed">"{result.summary}"</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-green-400 font-black text-xs uppercase tracking-wider mb-4 flex items-center gap-2"><CheckCircle size={14}/> Strength Highlights</h4>
                          <div className="flex flex-wrap gap-2">
                            {metrics.strengths?.map((s: string, i: number) => <span key={i} className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-300 rounded-lg text-xs font-medium">{s}</span>)}
                          </div>
                        </div>
                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-red-400 font-black text-xs uppercase tracking-wider mb-4 flex items-center gap-2"><AlertOctagon size={14}/> Critical Skill Gaps</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.topMissingSkills?.map((s: string, i: number) => <span key={i} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs font-medium">{s}</span>)}
                          </div>
                        </div>
                      </div>

                      {/* GENERATE BUTTONS */}
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <button onClick={() => handleGenerateQuiz(getQuizTopic())} disabled={featureLoading} className="p-5 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl hover:bg-purple-500/10 transition-all text-left group">
                          <h3 className="font-bold text-purple-300 flex items-center gap-2 text-sm"><Play size={16} className="text-purple-400 group-hover:scale-110 transition-transform"/> Test My Knowledge</h3>
                          <p className="text-xs text-gray-500 mt-2">{featureLoading ? "Generating assessment..." : `Take a specialized ${getQuizTopic()} quiz.`}</p>
                        </button>
                        <button onClick={handleGenerateIdeas} disabled={featureLoading} className="p-5 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-2xl hover:bg-green-500/10 transition-all text-left group">
                          <h3 className="font-bold text-green-300 flex items-center gap-2 text-sm"><Lightbulb size={16} className="text-green-400 group-hover:scale-110 transition-transform"/> Project Ideas</h3>
                          <p className="text-xs text-gray-500 mt-2">{featureLoading ? "Brainstorming concepts..." : "Generate portfolio ideas to cover your gaps."}</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. ROADMAP TAB */}
                  {activeTab === 'roadmap' && (
                    <div className="space-y-0 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
                      <div className="absolute left-6 top-4 bottom-4 w-[2px] bg-white/5 rounded-full"></div>
                      {result.roadmap?.map((week: any, i: number) => (
                        <div key={i} className="relative pl-16 pb-8 group">
                          <div className="absolute left-[18px] top-0 w-6 h-6 rounded-full bg-[#0a0a0a] border-[3px] border-blue-500 z-10 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div>
                          </div>
                          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all shadow-lg group-hover:-translate-y-1 group-hover:shadow-blue-500/10">
                            <h3 className="text-lg font-black text-white mb-4">
                              <span className="text-blue-400">{week.week.toString().toLowerCase().includes("week") ? week.week : `Week ${week.week}`}</span>: {week.goal}
                            </h3>
                            <div className="space-y-2.5">
                              {week.tasks.map((t: string, j: number) => (
                                <div key={j} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                  <span className="text-sm text-gray-300 leading-relaxed">{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. ATS FIXES TAB */}
                  {activeTab === 'ats' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {(!result.atsFixes || result.atsFixes.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white/5 rounded-3xl border border-white/5">
                          <ShieldCheck size={48} className="text-green-500/50 mb-4" />
                          <p className="font-bold text-white">ATS Perfected</p>
                          <p className="text-sm">No keyword or formatting improvements needed. Great job!</p>
                        </div>
                      ) : (
                        result.atsFixes.map((fix: any, i: number) => (
                          <div key={i} className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
                            <div className="p-5 bg-red-500/5 border-b border-white/5">
                              <div className="text-[10px] font-black tracking-widest text-red-400 uppercase mb-2 flex items-center gap-2"><AlertOctagon size={14}/> Original Bullet</div>
                              <p className="text-gray-400 text-sm line-through decoration-red-500/50">{fix.original}</p>
                            </div>
                            <div className="p-5 bg-green-500/5">
                              <div className="text-[10px] font-black tracking-widest text-green-400 uppercase mb-2 flex items-center gap-2"><CheckCircle size={14}/> Agent Improvement</div>
                              <p className="text-gray-200 text-sm font-medium leading-relaxed">{fix.improved}</p>
                              <div className="mt-4 pt-3 border-t border-green-500/20">
                                <p className="text-xs text-green-400/80 italic flex items-start gap-2"><Lightbulb size={14} className="shrink-0 mt-0.5"/> {fix.reason}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 4. COVER LETTER TAB */}
                  {activeTab === 'letter' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="bg-black/40 p-8 rounded-3xl border border-white/5 shadow-2xl relative">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                          <h3 className="text-xl font-black text-white flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><FileText size={20} className="text-blue-400"/></div>
                            Generated Cover Letter
                          </h3>
                          <button onClick={() => navigator.clipboard.writeText(result.coverLetter)} className="text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-gray-300 transition-colors flex items-center gap-2">
                            Copy Text
                          </button>
                        </div>
                        <div className="prose prose-invert max-w-none text-gray-300 text-sm md:text-base whitespace-pre-line leading-relaxed tracking-wide">
                          {result.coverLetter || "No cover letter generated."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. QUIZ TAB */}
                  {activeTab === 'quiz' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {!quizData ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/5 rounded-3xl border border-white/5">
                          <Play size={40} className="opacity-20 mb-4" />
                          <p className="text-sm font-medium">Select "Test My Knowledge" in the Overview tab to generate questions.</p>
                        </div>
                      ) : (
                        quizData.map((q:any, i:number) => (
                          <div key={i} className="bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                            <h4 className="font-bold text-white mb-5 text-sm md:text-base leading-relaxed"><span className="text-purple-400 mr-2">Q{i+1}.</span>{q.question}</h4>
                            <div className="space-y-3">
                              {q.options.map((opt:string, idx:number) => {
                                const isSelected = selectedAnswers[i] === idx;
                                const isCorrect = idx === q.correctAnswer;
                                const showResult = selectedAnswers[i] !== undefined;
                                
                                let btnClass = "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300";
                                if (showResult) {
                                  if (isCorrect) btnClass = "bg-green-500/20 border-green-500/50 text-green-300";
                                  else if (isSelected) btnClass = "bg-red-500/20 border-red-500/50 text-red-300";
                                  else btnClass = "bg-white/2 border-transparent text-gray-600 opacity-50";
                                }

                                return (
                                  <button 
                                    key={idx} 
                                    disabled={showResult}
                                    onClick={() => setSelectedAnswers(prev => ({...prev, [i]: idx}))} 
                                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all font-medium flex items-center justify-between ${btnClass} ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <span>{opt}</span>
                                    {showResult && isCorrect && <CheckCircle size={16} className="text-green-400 shrink-0 ml-4" />}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedAnswers[i] !== undefined && (
                              <div className="mt-5 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                <p className="text-xs text-purple-300 leading-relaxed"><span className="font-bold uppercase tracking-widest text-[10px] mr-2">Explanation:</span> {q.explanation}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 6. BUILDER TAB */}
                  {activeTab === 'builder' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {!projectIdeas ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white/5 rounded-3xl border border-white/5">
                          <Lightbulb size={40} className="opacity-20 mb-4" />
                          <p className="text-sm font-medium">Select "Project Ideas" in the Overview tab to brainstorm concepts.</p>
                        </div>
                      ) : (
                        projectIdeas.map((idea:any, i:number) => (
                          <div key={i} className="p-8 rounded-3xl border border-white/5 bg-black/40 hover:border-white/10 transition-colors relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Layers size={80} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-3 relative z-10">{idea.title}</h3>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed relative z-10 max-w-2xl">{idea.description}</p>
                            <div className="relative z-10 mb-6">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Key Features</p>
                              <ul className="grid sm:grid-cols-2 gap-2 text-xs text-gray-300">
                                {idea.keyFeatures?.map((f:string, idx:number) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="relative z-10 pt-4 border-t border-white/5">
                              <div className="flex gap-2 flex-wrap items-center">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2">Stack:</span>
                                {idea.techStack.map((t:string, k:number) => (
                                  <span key={k} className="px-2.5 py-1 bg-white/5 rounded-md border border-white/10 text-[11px] font-medium text-gray-300">{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}