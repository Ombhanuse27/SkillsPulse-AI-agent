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
  Briefcase, AlignLeft, FileUp, Check
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
        className="fixed top-4 left-4 z-50 lg:hidden w-11 h-11 bg-[#0a0a0a] border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-xl hover:shadow-blue-500/20"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#050505]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out shadow-2xl
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
      >
        <div className={`flex items-center border-b border-white/5 shrink-0 h-20 transition-all duration-300 ${collapsed ? 'px-3 justify-center' : 'px-6 justify-between'}`}>
          <Link href="/" className="flex items-center gap-3 font-black text-xl tracking-tighter group min-w-0">
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all">
              <Cpu size={18} className="text-white" />
            </div>
            {!collapsed && (
              <span className="truncate bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-all">
                Skill<span className="text-blue-500">Pulse</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:flex w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-500 hover:text-white transition-all shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden lg:flex mx-auto mt-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 items-center justify-center text-gray-500 hover:text-white transition-all"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {!collapsed && (
          <p className="px-6 pt-6 pb-3 text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">Menu</p>
        )}

        <nav className={`flex-1 space-y-1.5 overflow-y-auto custom-scrollbar ${collapsed ? 'px-2 pt-4' : 'px-4'}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative
                  ${collapsed ? 'p-3 justify-center' : 'px-4 py-3'}
                  ${isCurrent
                    ? `${item.bg} ${item.color} border border-white/10 shadow-inner`
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300
                  ${isCurrent ? `${item.bg} scale-110 shadow-sm` : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-105'}
                  ${item.color}`}
                >
                  <Icon size={16} />
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#111] border border-white/10 rounded-xl text-xs text-white font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 shadow-2xl z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {progress?.stats && !collapsed && (
          <div className="px-4 py-4 mx-4 mb-4 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/5 rounded-2xl space-y-3 hover:border-white/10 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Level {progress.stats.level}</p>
                <p className="text-base font-black text-white tabular-nums flex items-end gap-1">
                  {progress.stats.totalXP.toLocaleString()}
                  <span className="text-blue-400 text-xs font-bold mb-0.5">XP</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                <Zap size={16} className="text-blue-400 animate-pulse" />
              </div>
            </div>
            <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${xpPercentage}%` }}
              >
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 blur-[2px] rounded-full"></div>
              </div>
            </div>
            <p className="text-[10px] font-medium text-gray-500 text-right">{progress.stats.xpToNextLevel} XP to Lvl {progress.stats.level + 1}</p>
          </div>
        )}

        {progress?.stats && collapsed && (
          <div className="flex flex-col items-center gap-2 pb-4 px-2">
            <div title={`${progress.stats.totalXP.toLocaleString()} XP`} className="w-11 h-11 bg-blue-500/10 rounded-xl flex flex-col items-center justify-center border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-help">
              <Zap size={16} className="text-blue-400" />
            </div>
          </div>
        )}

        <div className={`border-t border-white/5 shrink-0 bg-black/20 ${collapsed ? 'p-3' : 'p-5'}`}>
          {!user ? (
            <div className="flex justify-center">
              <Link href="/auth/signin" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl transition-colors w-full text-center shadow-lg shadow-blue-500/20">
                {collapsed ? <LogOut size={16} className="mx-auto" /> : "Sign In"}
              </Link>
            </div>
          ) : collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shadow-lg border border-white/10">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shadow-lg border border-white/10 shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all shrink-0 border border-transparent hover:border-red-500/20"
                title="Sign Out"
              >
                <LogOut size={15} />
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
      alert("Please fill in all fields (Target Role, Job Description, and Resume)."); 
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
      alert(err.message || "Error processing resume. Please try again."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleGenerateQuiz = async (topic: string) => {
    setFeatureLoading(true);
    const query = `mutation { generateQuiz(topic: "${topic}", jobRole: "${jobRole}") { question options correctAnswer explanation } }`;
    try {
      const res = await fetch("/api/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const { data } = await res.json();
      setQuizData(data.generateQuiz);
      setSelectedAnswers({});
      setActiveTab("quiz");
    } catch (error) { alert("Failed to generate quiz."); } finally { setFeatureLoading(false); }
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
    <div className="min-h-screen bg-[#020202] text-white font-sans overflow-x-hidden relative selection:bg-blue-500/30">
      
      {/* ── BACKGROUND AMBIENT GLOWS ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      {/* ── VERTICAL SIDEBAR NAVBAR ── */}
      {user && (
        <Navbar user={user} onLogout={handleLogout} progress={userProgress ?? undefined} />
      )}

      {/* ── MAIN AREA ── */}
      <div className={`transition-all duration-300 relative z-10 p-4 sm:p-8 lg:p-12 ${user ? 'lg:ml-64' : ''}`}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pt-16 lg:pt-0">
          
          {/* ── INPUT SECTION (LEFT COLUMN) ── */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="mb-2">
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white via-blue-100 to-gray-400 bg-clip-text text-transparent tracking-tight">Resume Audit</h1>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">Map your current experience to your dream role. Get tailored roadmaps, cover letters, and gap analysis instantly.</p>
            </div>
            
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl p-6 lg:p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6 relative overflow-hidden group">
              {/* Decorative top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 transition-opacity opacity-50 group-hover:opacity-100" />

              {/* Status / Cost Banners */}
              {!user && !localStorage.getItem('free_resume_analysis_used') && (
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 text-green-400 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-inner">
                  <Sparkles size={18} className="text-green-300 animate-pulse shrink-0" /> 
                  <span>Your first analysis is completely free!</span>
                </div>
              )}
              {user && (
                <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-blue-500/10 p-1.5 rounded-lg">
                      <Zap size={14} className="text-blue-400" />
                    </div>
                    <span className="text-sm font-bold text-gray-300">Cost: {RESUME_ANALYSIS_XP_COST} XP</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Balance</span>
                    <span className={`text-sm font-black px-3 py-1 rounded-xl border ${((userProgress?.stats?.totalXP ?? 0) >= RESUME_ANALYSIS_XP_COST) ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                      {userProgress?.stats?.totalXP ?? 0} XP
                    </span>
                  </div>
                </div>
              )}

              {/* Form Inputs */}
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2"><Briefcase size={14} className="text-blue-400"/> Target Role</label>
                  <input 
                    value={jobRole} 
                    onChange={(e) => setJobRole(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-600 shadow-inner" 
                    placeholder="e.g. Senior Frontend Engineer" 
                  />
                </div>
                
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2"><AlignLeft size={14} className="text-blue-400"/> Job Description</label>
                  <textarea 
                    value={jdText} 
                    onChange={(e) => setJdText(e.target.value)} 
                    className="w-full h-40 bg-black/40 border border-white/10 p-4 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all custom-scrollbar placeholder:text-gray-600 resize-none shadow-inner leading-relaxed" 
                    placeholder="Paste the complete job description here to analyze keyword fit..." 
                  />
                </div>
                
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-2"><FileUp size={14} className="text-blue-400"/> Resume (PDF)</label>
                  
                  {/* Custom Dropzone UI */}
                  <div className="relative group cursor-pointer h-32 w-full rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-black/40 hover:bg-blue-500/5 transition-all overflow-hidden flex flex-col items-center justify-center">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none p-4 text-center">
                      {file ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-1">
                            <Check size={20} />
                          </div>
                          <span className="text-sm font-bold text-white truncate max-w-[200px]">{file.name}</span>
                          <span className="text-xs text-gray-500">Click to replace file</span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-full bg-white/5 text-gray-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center mb-1">
                            <Upload size={20} />
                          </div>
                          <span className="text-sm font-medium text-gray-300">Click or drag PDF to upload</span>
                          <span className="text-xs text-gray-600">Max file size: 5MB</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleProcess} 
                disabled={loading || (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST)} 
                className={`w-full py-4 rounded-xl font-bold text-base shadow-xl transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden
                  ${loading 
                    ? 'bg-white/5 text-gray-400 cursor-wait border border-white/10' 
                    : (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST) 
                      ? 'bg-black text-red-500/50 border border-red-500/20 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/30 hover:-translate-y-1'
                  }`}
              >
                {!loading && user && (userProgress?.stats?.totalXP ?? 0) >= RESUME_ANALYSIS_XP_COST && (
                   <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                )}

                {loading ? (
                  <><RefreshCw size={18} className="animate-spin text-blue-400" /> Analyzing Profile...</>
                ) : (user && (userProgress?.stats?.totalXP ?? 0) < RESUME_ANALYSIS_XP_COST) ? (
                  "Insufficient XP to Analyze"
                ) : (
                  <><Sparkles size={18} className="group-hover:animate-pulse" /> Launch Full Analysis</>
                )}
              </button>
            </div>
          </div>

          {/* ── DASHBOARD (RIGHT COLUMN) ── */}
          <div className="lg:col-span-8 flex flex-col">
            {!result ? (
              // Empty or Loading State
              <div className="flex-1 bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center p-8 lg:p-12 min-h-[600px] shadow-2xl relative overflow-hidden transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-30" />
                
                {loading ? (
                  <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 mb-8 relative">
                      <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Cpu size={32} className="text-blue-400 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">Architecting Your Career...</h3>
                    <p className="text-base text-gray-500 max-w-md leading-relaxed">Our AI is parsing your experience, extracting keywords, and building a custom roadmap tailored to your target role.</p>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-700">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-inner">
                      <Terminal size={40} className="text-gray-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">Ready for Input</h3>
                    <p className="text-base text-gray-500 max-w-md leading-relaxed">Provide your target role, job description, and resume to uncover your alignment score, identify skill gaps, and generate actionable next steps.</p>
                  </div>
                )}
              </div>
            ) : (
              // Result Dashboard
              <div className="flex-1 bg-[#0a0a0a]/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden min-h-[600px] flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-700">
                
                {/* Header */}
                <div className="p-6 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gradient-to-r from-blue-900/10 via-transparent to-purple-900/10 relative">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                        <ShieldCheck size={28} className="text-blue-400" />
                      </div>
                      Analysis Report
                    </h2>
                    <div className="flex flex-wrap gap-2.5 mt-4">
                      <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-300 border border-blue-500/20 shadow-sm flex items-center gap-1.5">
                        <Target size={12} /> {result.status} Match
                      </span>
                      {resumeId && (
                        <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm flex items-center gap-1.5">
                           Cached in DB
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Score Circular Display or Distinct Box */}
                  <div className="text-left sm:text-right bg-black/50 p-5 rounded-2xl border border-white/5 min-w-[150px] shadow-inner group hover:border-white/10 transition-all">
                    <div className="flex items-end justify-start sm:justify-end gap-1">
                      <div className={`text-5xl font-black tracking-tighter ${result.score >= 80 ? "text-green-400" : result.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        {result.score}
                      </div>
                      <span className="text-2xl text-gray-600 font-bold mb-1">%</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-2">Overall Alignment</div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/5 overflow-x-auto custom-scrollbar px-4 pt-2">
                  {[
                    { id: 'overview', label: 'Overview', icon: Eye },
                    { id: 'roadmap',  label: 'Roadmap',  icon: TrendingUp },
                    { id: 'ats',      label: 'ATS Check',icon: ShieldCheck },
                    { id: 'letter',   label: 'Cover Letter', icon: FileText },
                    { id: 'quiz',     label: 'Skill Quiz', icon: Play },
                    { id: 'builder',  label: 'Project Ideas', icon: Lightbulb }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap relative group
                          ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-t-xl'}
                        `}
                      >
                        <Icon size={14} className={activeTab === tab.id ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400"} />
                        {tab.label}
                        {activeTab === tab.id && (
                          <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-500 rounded-t-full shadow-[0_-2px_12px_rgba(59,130,246,0.8)]" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Tab Content Area */}
                <div className="p-6 lg:p-8 overflow-y-auto max-h-[650px] custom-scrollbar flex-1 relative">
                  
                  {/* 1. OVERVIEW TAB */}
                  {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                      
                      {/* Metric Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="bg-black/50 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-1 group">
                          <div className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2 flex items-center gap-2">
                            <Clock size={12} className="group-hover:text-blue-400 transition-colors" /> Time to Ready
                          </div>
                          <div className="text-3xl font-black text-white">{metrics.timeToReady}</div>
                        </div>
                        <div className="bg-black/50 p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all hover:-translate-y-1 group">
                          <div className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2 flex items-center gap-2">
                            <Briefcase size={12} className="group-hover:text-purple-400 transition-colors" /> Portfolio Status
                          </div>
                          <div className="text-2xl font-black text-white capitalize truncate">{result.status.replace('_', ' ')}</div>
                        </div>
                        <div className="bg-black/50 p-6 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all hover:-translate-y-1 group">
                          <div className="text-gray-500 text-[10px] font-black tracking-widest uppercase mb-2 flex items-center gap-2">
                            <Layers size={12} className="group-hover:text-green-400 transition-colors" /> Tech Coverage
                          </div>
                          <div className="flex items-end gap-1">
                            <div className="text-3xl font-black text-white">{metrics.coverage}</div>
                            <span className="text-xl text-gray-500 font-bold mb-0.5">%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Summary Box */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/20 to-purple-900/10 p-6 lg:p-8 rounded-2xl border border-blue-500/20 shadow-inner group">
                        <div className="absolute -right-10 -top-10 text-blue-500/10 group-hover:scale-110 transition-transform duration-700">
                          <Brain size={120} />
                        </div>
                        <h3 className="text-blue-400 font-black text-sm mb-4 flex items-center gap-2 uppercase tracking-widest relative z-10">
                          <Sparkles size={16}/> Executive Summary
                        </h3>
                        <p className="text-blue-50/90 text-sm lg:text-base leading-relaxed relative z-10 italic">
                          "{result.summary}"
                        </p>
                      </div>

                      {/* Strengths & Gaps */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-black/40 p-6 lg:p-8 rounded-2xl border border-white/5 shadow-inner">
                          <h4 className="text-green-400 font-black text-xs uppercase tracking-widest mb-5 flex items-center gap-2">
                            <CheckCircle size={16}/> Strength Highlights
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {metrics.strengths?.map((s: string, i: number) => (
                              <span key={i} className="px-3.5 py-2 bg-green-500/10 border border-green-500/20 text-green-300 rounded-xl text-xs font-bold shadow-sm">{s}</span>
                            ))}
                            {(!metrics.strengths || metrics.strengths.length === 0) && (
                              <span className="text-sm text-gray-500">No explicit matching strengths found.</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-black/40 p-6 lg:p-8 rounded-2xl border border-white/5 shadow-inner">
                          <h4 className="text-red-400 font-black text-xs uppercase tracking-widest mb-5 flex items-center gap-2">
                            <AlertOctagon size={16}/> Critical Skill Gaps
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {result.topMissingSkills?.map((s: string, i: number) => (
                              <span key={i} className="px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs font-bold shadow-sm">{s}</span>
                            ))}
                            {(!result.topMissingSkills || result.topMissingSkills.length === 0) && (
                              <span className="text-sm text-gray-500">Perfect match! No major gaps detected.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* GENERATE BUTTONS */}
                      <div className="grid sm:grid-cols-2 gap-5 pt-4">
                        <button onClick={() => handleGenerateQuiz(getQuizTopic())} disabled={featureLoading} className="p-6 bg-gradient-to-br from-[#111] to-purple-900/10 border border-white/5 hover:border-purple-500/30 rounded-2xl hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all text-left group flex flex-col justify-between h-full">
                          <div>
                            <h3 className="font-black text-white flex items-center gap-3 text-base mb-2">
                              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                                <Play size={16} className="text-purple-400"/>
                              </div>
                              Test My Knowledge
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{featureLoading ? "Generating assessment..." : `Take a specialized ${getQuizTopic()} quiz to prep for interviews.`}</p>
                          </div>
                          <div className="mt-4 text-xs font-bold text-purple-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                            Start Quiz <ChevronRight size={14} />
                          </div>
                        </button>
                        
                        <button onClick={handleGenerateIdeas} disabled={featureLoading} className="p-6 bg-gradient-to-br from-[#111] to-green-900/10 border border-white/5 hover:border-green-500/30 rounded-2xl hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all text-left group flex flex-col justify-between h-full">
                          <div>
                            <h3 className="font-black text-white flex items-center gap-3 text-base mb-2">
                              <div className="p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform">
                                <Lightbulb size={16} className="text-green-400"/>
                              </div>
                              Project Ideas
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{featureLoading ? "Brainstorming concepts..." : "Generate portfolio projects tailored to cover your identified skill gaps."}</p>
                          </div>
                          <div className="mt-4 text-xs font-bold text-green-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                            Generate <ChevronRight size={14} />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. ROADMAP TAB */}
                  {activeTab === 'roadmap' && (
                    <div className="space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pl-4">
                      {/* Timeline vertical line */}
                      <div className="absolute left-9 top-6 bottom-6 w-[2px] bg-gradient-to-b from-blue-500 via-purple-500 to-transparent rounded-full opacity-30"></div>
                      
                      {result.roadmap?.map((week: any, i: number) => (
                        <div key={i} className="relative pl-14 pb-10 group">
                          {/* Timeline dot */}
                          <div className="absolute left-[13px] top-6 w-4 h-4 rounded-full bg-blue-500 border-4 border-[#0a0a0a] z-10 shadow-[0_0_15px_rgba(59,130,246,0.6)] group-hover:scale-125 transition-transform duration-300"></div>
                          
                          <div className="bg-black/50 p-6 lg:p-8 rounded-3xl border border-white/5 hover:border-blue-500/20 transition-all shadow-lg group-hover:-translate-y-1 group-hover:shadow-blue-500/5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20 w-fit">
                                {week.week.toString().toLowerCase().includes("week") ? week.week : `Week ${week.week}`}
                              </span>
                              <h3 className="text-lg font-bold text-white leading-tight">
                                {week.goal}
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {week.tasks.map((t: string, j: number) => (
                                <div key={j} className="flex items-start gap-3.5 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
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
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {(!result.atsFixes || result.atsFixes.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-black/40 rounded-3xl border border-white/5 shadow-inner">
                          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-5">
                            <ShieldCheck size={40} className="text-green-400" />
                          </div>
                          <p className="text-xl font-black text-white mb-2">ATS Perfected</p>
                          <p className="text-sm text-gray-400">No keyword or formatting improvements needed. Great job!</p>
                        </div>
                      ) : (
                        result.atsFixes.map((fix: any, i: number) => (
                          <div key={i} className="bg-black/50 rounded-3xl border border-white/5 overflow-hidden group hover:border-white/10 transition-all shadow-lg hover:shadow-xl">
                            <div className="p-6 bg-red-900/10 border-b border-white/5 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                              <div className="text-[10px] font-black tracking-widest text-red-400 uppercase mb-3 flex items-center gap-2">
                                <AlertOctagon size={14}/> Original Bullet
                              </div>
                              <p className="text-gray-400 text-sm leading-relaxed opacity-80">{fix.original}</p>
                            </div>
                            <div className="p-6 bg-green-900/10 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-green-500/50" />
                              <div className="text-[10px] font-black tracking-widest text-green-400 uppercase mb-3 flex items-center gap-2">
                                <CheckCircle size={14}/> Agent Improvement
                              </div>
                              <p className="text-gray-100 text-sm md:text-base font-medium leading-relaxed">{fix.improved}</p>
                              <div className="mt-5 pt-4 border-t border-green-500/10">
                                <p className="text-xs text-green-300/80 flex items-start gap-2.5 bg-green-500/5 p-3 rounded-xl border border-green-500/10">
                                  <Lightbulb size={16} className="shrink-0 text-green-400"/> 
                                  <span className="leading-relaxed font-medium">{fix.reason}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 4. COVER LETTER TAB */}
                  {activeTab === 'letter' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                      <div className="bg-black/50 p-6 lg:p-10 rounded-3xl border border-white/5 shadow-2xl relative min-h-full">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 border-b border-white/5 pb-6">
                          <h3 className="text-xl font-black text-white flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                              <FileText size={24} className="text-blue-400"/>
                            </div>
                            AI Drafted Cover Letter
                          </h3>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(result.coverLetter);
                              alert("Copied to clipboard!");
                            }} 
                            className="text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 rounded-xl text-white transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-95"
                          >
                            Copy to Clipboard
                          </button>
                        </div>
                        <div className="bg-[#111] p-6 lg:p-8 rounded-2xl border border-white/5 shadow-inner">
                          <div className="prose prose-invert max-w-none text-gray-300 text-sm md:text-base whitespace-pre-line leading-relaxed tracking-wide font-serif">
                            {result.coverLetter || "No cover letter generated."}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. QUIZ TAB */}
                  {activeTab === 'quiz' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {!quizData ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-black/40 rounded-3xl border border-white/5 shadow-inner">
                          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Play size={32} className="opacity-50" />
                          </div>
                          <p className="text-base font-medium text-white mb-2">No Quiz Generated Yet</p>
                          <p className="text-sm text-gray-400">Head over to the Overview tab and click "Test My Knowledge" to begin.</p>
                        </div>
                      ) : (
                        quizData.map((q:any, i:number) => (
                          <div key={i} className="bg-black/50 p-6 lg:p-8 rounded-3xl border border-white/5 hover:border-purple-500/20 transition-all shadow-lg group">
                            <h4 className="font-bold text-white mb-6 text-base md:text-lg leading-relaxed flex items-start gap-3">
                              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 text-sm shrink-0 border border-purple-500/20">{i+1}</span>
                              <span className="pt-1">{q.question}</span>
                            </h4>
                            <div className="space-y-3 pl-0 sm:pl-11">
                              {q.options.map((opt:string, idx:number) => {
                                const isSelected = selectedAnswers[i] === idx;
                                const isCorrect = idx === q.correctAnswer;
                                const showResult = selectedAnswers[i] !== undefined;
                                
                                let btnClass = "bg-[#111] border-white/5 hover:bg-white/5 text-gray-300 hover:border-white/10";
                                if (showResult) {
                                  if (isCorrect) btnClass = "bg-green-500/10 border-green-500/40 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]";
                                  else if (isSelected) btnClass = "bg-red-500/10 border-red-500/40 text-red-300";
                                  else btnClass = "bg-black/50 border-transparent text-gray-600 opacity-40";
                                }

                                return (
                                  <button 
                                    key={idx} 
                                    disabled={showResult}
                                    onClick={() => setSelectedAnswers(prev => ({...prev, [i]: idx}))} 
                                    className={`w-full text-left p-4 lg:p-5 rounded-2xl border text-sm transition-all duration-300 font-medium flex items-center justify-between ${btnClass} ${showResult ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors
                                        ${showResult && isCorrect ? 'border-green-400 bg-green-400/20' : showResult && isSelected ? 'border-red-400 bg-red-400/20' : 'border-white/20'}
                                      `}>
                                        {showResult && isCorrect && <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />}
                                        {showResult && isSelected && !isCorrect && <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />}
                                      </div>
                                      <span>{opt}</span>
                                    </div>
                                    {showResult && isCorrect && <CheckCircle size={18} className="text-green-400 shrink-0 ml-4" />}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {/* Animated Explanation Reveal */}
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${selectedAnswers[i] !== undefined ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
                              <div className="p-5 sm:ml-11 bg-purple-500/5 border border-purple-500/20 rounded-2xl relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50 rounded-l-2xl" />
                                <p className="text-sm text-purple-200/90 leading-relaxed flex flex-col gap-2">
                                  <span className="font-black uppercase tracking-widest text-[10px] text-purple-400 flex items-center gap-1.5">
                                    <Brain size={12}/> Explanation
                                  </span> 
                                  {q.explanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 6. BUILDER TAB */}
                  {activeTab === 'builder' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {!projectIdeas ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-black/40 rounded-3xl border border-white/5 shadow-inner">
                          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Lightbulb size={32} className="opacity-50" />
                          </div>
                          <p className="text-base font-medium text-white mb-2">No Projects Generated</p>
                          <p className="text-sm text-gray-400">Navigate to Overview and click "Project Ideas" to generate a tailored portfolio.</p>
                        </div>
                      ) : (
                        projectIdeas.map((idea:any, i:number) => (
                          <div key={i} className="p-6 lg:p-8 rounded-3xl border border-white/5 bg-black/50 hover:border-white/10 transition-all shadow-lg hover:shadow-xl relative overflow-hidden group">
                            {/* Background decorative icon */}
                            <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                              <Layers size={140} />
                            </div>
                            
                            <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
                              <h3 className="text-xl font-black text-white">{idea.title}</h3>
                              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
                                {idea.difficulty || "Intermediate"}
                              </span>
                            </div>
                            
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed relative z-10 max-w-3xl">
                              {idea.description}
                            </p>
                            
                            <div className="relative z-10 mb-6 bg-[#111] p-5 rounded-2xl border border-white/5">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CheckCircle size={12} className="text-blue-400"/> Key Features
                              </p>
                              <ul className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                                {idea.keyFeatures?.map((f:string, idx:number) => (
                                  <li key={idx} className="flex items-start gap-2.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                                    <span className="leading-snug">{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="relative z-10 pt-5 border-t border-white/5 flex flex-wrap gap-2.5 items-center">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-1 flex items-center gap-1.5">
                                <Cpu size={12}/> Tech Stack:
                              </span>
                              {idea.techStack.map((t:string, k:number) => (
                                <span key={k} className="px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-xs font-bold text-blue-300 shadow-sm">
                                  {t}
                                </span>
                              ))}
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
      
      {/* Global & custom styles */}
      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(255,255,255,0.1); 
          border-radius: 20px; 
          border: 2px solid transparent; 
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background-color: rgba(255,255,255,0.2); 
        }
      `}</style>
    </div>
  );
}