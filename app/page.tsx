"use client";
import { useState } from "react";
import { 
  Upload, Brain, CheckCircle, Terminal, 
  ExternalLink, RefreshCw, AlertOctagon, 
  Play, Lightbulb, Clock, Target, 
  TrendingUp, Eye, ShieldCheck, Zap, Layers 
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState("overview"); 
  const [quizData, setQuizData] = useState<any>(null);
  const [projectIdeas, setProjectIdeas] = useState<any>(null); 
  const [featureLoading, setFeatureLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});

  // 1. PROCESS RESUME
  const handleProcess = async () => {
    if (!file || !jobRole || !jdText) {
      alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const parseRes = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const { text } = await parseRes.json();
      if (!text) throw new Error("PDF parse failed");

      const query = `
        mutation {
          analyzeApplication(
            resumeText: ${JSON.stringify(text)}, 
            jobDescription: ${JSON.stringify(jdText)},
            jobRole: "${jobRole}"
          ) {
            score status summary projectIdea interviewPrep
            topMissingSkills recommendedStack
            roadmap { week goal tasks resources { title url type } }
            atsFixes { original improved reason }
          }
        }
      `;
      const aiRes = await fetch("/api/graphql", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }),
      });
      const { data, errors } = await aiRes.json();
      
      if (errors || !data) {
        throw new Error(errors?.[0]?.message || "Analysis failed");
      }
      
      setResult(data.analyzeApplication);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check console.");
    } finally {
      setLoading(false);
    }
  };

  // 2. GENERATE QUIZ
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

  // 3. GENERATE PROJECT IDEAS
  const handleGenerateIdeas = async () => {
    setFeatureLoading(true);
    const missingSkills = result.topMissingSkills || [];
    
    const query = `
      mutation { 
        generateProjectIdeas(
          missingSkills: ${JSON.stringify(missingSkills)}, 
          jobRole: "${jobRole}"
        ) { 
          title 
          description 
          difficulty 
          techStack 
          keyFeatures 
        } 
      }
    `;
    
    try {
      const res = await fetch("/api/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const { data, errors } = await res.json();
      
      if (errors || !data) {
        throw new Error(errors?.[0]?.message || "Failed to generate ideas");
      }

      setProjectIdeas(data.generateProjectIdeas);
      setActiveTab("builder"); 
    } catch (error) {
      console.error(error);
      alert("Failed to generate project ideas.");
    } finally {
      setFeatureLoading(false);
    }
  };

  const getQuizTopic = () => {
    if (result?.topMissingSkills?.length > 0) return result.topMissingSkills[0]; 
    return jobRole;
  };

  // 🔥 FIXED: Derived Metrics Helper
  // Returns default values to prevent TypeScript/Runtime errors when result is null
  const getDerivedMetrics = () => {
    const defaultMetrics = { 
      timeToReady: "N/A", 
      strengths: [] as string[], 
      quickWins: [] as string[], 
      coverage: 0 
    };

    if (!result) return defaultMetrics;
    
    // 1. Time-to-Ready: Based on roadmap length
    const timeToReady = result.roadmap ? `${result.roadmap.length} Weeks` : "N/A";
    
    // 2. Strengths: Recommended stack items NOT in missing skills
    const allTech = result.recommendedStack ? result.recommendedStack.split(',').map((s: string) => s.trim()) : [];
    const missing = result.topMissingSkills || [];
    const strengths = allTech.filter((t: string) => !missing.includes(t)).slice(0, 4);
    
    // 3. Quick Wins: First 3 tasks from Week 1
    const quickWins = result.roadmap?.[0]?.tasks?.slice(0, 3) || [];

    // 4. Coverage %
    const coverage = allTech.length > 0 
      ? Math.round(((allTech.length - missing.length) / allTech.length) * 100) 
      : 0;

    return { timeToReady, strengths, quickWins, coverage };
  };

  const metrics = getDerivedMetrics();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              SkillPulse Agent
            </h1>
            <p className="text-gray-500 mt-2 text-sm"> AI-powered career coach.</p>
          </div>
          
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Role</label>
              <input value={jobRole} onChange={(e) => setJobRole(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="e.g. Backend Engineer" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Description</label>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                className="w-full h-32 bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-sm text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Paste the full JD here..." />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resume</label>
              <div className="mt-1 border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-[#1a1a1a] transition group relative">
                <input type="file" accept=".pdf" className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file ? ( <div className="flex items-center text-green-400 gap-2"><CheckCircle size={20}/> {file.name}</div> ) : (
                  <div className="flex flex-col items-center text-gray-500 group-hover:text-blue-400">
                    <Upload size={24} className="mb-2" /> <span className="text-sm">Upload PDF</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleProcess} disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${loading ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 hover:scale-[1.02]'}`}>
              {loading ? <span className="flex items-center justify-center gap-2 animate-pulse">Agent Working... <Brain className="animate-bounce" size={18}/></span> : "Launch Career Agent 🚀"}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Agent Dashboard */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="h-full bg-[#111] rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-gray-600 p-10 min-h-[600px]">
              <Terminal size={64} className="opacity-20 mb-4" />
              <p>Ready to analyze. Upload your resume to start.</p>
            </div>
          ) : (
            <div className="bg-[#111] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
              
              {/* Report Header */}
              <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-900/10 to-purple-900/10">
                <div>
                  <h2 className="text-2xl font-bold text-white">Agent Report</h2>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${result.score > 70 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{result.status} Match</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-black ${result.score > 75 ? "text-green-500" : result.score > 50 ? "text-yellow-500" : "text-red-500"}`}>{result.score}%</div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Fit Score</div>
                </div>
              </div>

              {/* Interactive Tabs */}
              <div className="flex border-b border-gray-800 overflow-x-auto">
                {['overview', 'roadmap', 'ats', 'quiz', 'builder'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} 
                    className={`px-6 py-4 text-sm font-bold uppercase tracking-wider hover:bg-[#1a1a1a] transition whitespace-nowrap ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/5' : 'text-gray-500'}`}>
                    {tab === 'quiz' ? '⚔️ Skill Quiz' : tab === 'builder' ? '🚀 Ideas' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="animate-in fade-in space-y-6">
                    
                    {/* Row 1: High Level Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Time to Ready */}
                        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-500 text-xs font-bold uppercase">Time to Ready</span>
                                <Clock size={16} className="text-blue-500"/>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{metrics.timeToReady}</div>
                                <div className="text-xs text-gray-500 mt-1">Based on skill gaps</div>
                            </div>
                        </div>

                        {/* Portfolio Readiness */}
                        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-500 text-xs font-bold uppercase">Portfolio Status</span>
                                <Layers size={16} className="text-purple-500"/>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white capitalize">{result.status}</div>
                                <div className="text-xs text-gray-500 mt-1">Project complexity check</div>
                            </div>
                        </div>

                        {/* Tech Coverage Radar */}
                        <div className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition">
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-500 text-xs font-bold uppercase">Tech Coverage</span>
                                <Target size={16} className={metrics.coverage > 70 ? "text-green-500" : "text-yellow-500"}/>
                            </div>
                            <div className="w-full">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-2xl font-bold text-white">{metrics.coverage}%</span>
                                </div>
                                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${metrics.coverage > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                        style={{ width: `${metrics.coverage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Executive Summary & Recruiter Eye */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        
                        {/* Executive Summary */}
                        <div className="md:col-span-3 bg-blue-900/10 p-6 rounded-xl border border-blue-900/30">
                            <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                                <Brain size={18}/> Executive Summary
                            </h3>
                            <p className="text-blue-100/80 leading-relaxed">
                                "{result.summary}"
                            </p>
                        </div>

                        {/* Recruiter Eye View */}
                        <div className="md:col-span-2 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                             <h3 className="text-gray-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Eye size={18}/> Recruiter Eye View
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <ShieldCheck size={16} className="text-green-500"/>
                                    <span>Keywords: <span className="text-white font-bold">{metrics.strengths?.length || 0} Strong Matches</span></span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <AlertOctagon size={16} className="text-red-500"/>
                                    <span>Red Flags: <span className="text-white font-bold">{result.topMissingSkills?.length || 0} Critical Gaps</span></span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <TrendingUp size={16} className="text-blue-500"/>
                                    <span>Potential: <span className="text-white font-bold">{result.status}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Strengths & Gaps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Highlights / Strengths */}
                        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                             <h4 className="text-green-400 font-bold text-sm mb-4 flex items-center gap-2">
                                <Zap size={16}/> Strength Highlights
                             </h4>
                             <div className="flex flex-wrap gap-2">
                                 {metrics.strengths && metrics.strengths.length > 0 ? (
                                     metrics.strengths.map((s: string, i: number) => (
                                        <span key={i} className="px-3 py-1.5 bg-green-900/20 border border-green-500/30 text-green-300 rounded text-xs font-semibold">
                                            {s}
                                        </span>
                                     ))
                                 ) : (
                                     <span className="text-gray-500 text-sm italic">Core strengths need alignment with JD.</span>
                                 )}
                             </div>
                        </div>

                        {/* Critical Gaps */}
                        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                            <h4 className="text-red-400 font-bold text-sm mb-4 flex items-center gap-2">
                                <AlertOctagon size={16}/> Critical Skill Gaps
                             </h4>
                             <div className="flex flex-wrap gap-2">
                                 {result.topMissingSkills?.map((s: string, i: number) => (
                                     <span key={i} className="px-3 py-1.5 bg-red-900/20 border border-red-500/30 text-red-300 rounded text-xs font-semibold">
                                         {s}
                                     </span>
                                 ))}
                             </div>
                        </div>
                    </div>

                    {/* Row 4: Quick Wins (7 Days) */}
                    <div className="bg-gradient-to-r from-gray-900 to-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-bold flex items-center gap-2">
                                <Play size={18} className="text-blue-500"/> Quick Wins (First 7 Days)
                            </h4>
                            <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">Immediate Action</span>
                        </div>
                        <div className="space-y-3">
                            {metrics.quickWins.map((task: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/40 border border-gray-800">
                                    <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>
                                    </div>
                                    <span className="text-sm text-gray-300">{task}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                       <button onClick={() => handleGenerateQuiz(getQuizTopic())} disabled={featureLoading}
                         className="p-4 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl hover:scale-[1.02] transition text-left group">
                         <h3 className="font-bold text-white flex items-center gap-2"><Play size={20} className="text-purple-400"/> Test My Knowledge</h3>
                         <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                           {featureLoading ? "Generating..." : `Take a specialized ${getQuizTopic()} quiz.`}
                         </p>
                       </button>
                       <button onClick={handleGenerateIdeas} disabled={featureLoading}
                         className="p-4 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-xl hover:scale-[1.02] transition text-left group">
                         <h3 className="font-bold text-white flex items-center gap-2"><Lightbulb size={20} className="text-green-400"/> Project Ideas</h3>
                         <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                           {featureLoading ? "Brainstorming..." : "Generate portfolio ideas for missing skills."}
                         </p>
                       </button>
                    </div>

                  </div>
                )}

                {/* 2. ROADMAP TAB */}
                {activeTab === 'roadmap' && (
                  <div className="space-y-8 animate-in fade-in">
                    {result.roadmap?.map((week: any, i: number) => (
                      <div key={i} className="relative pl-8 border-l-2 border-gray-800 pb-2">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-[#0a0a0a]"></div>
                        <div className="mb-2">
                          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{week.week}</span>
                          <h3 className="text-xl font-bold text-white">{week.goal}</h3>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {week.tasks.map((t: string, j: number) => ( <li key={j} className="text-gray-400 text-sm flex items-start gap-2"><span className="text-gray-600 mt-1">•</span> {t}</li>))}
                        </ul>
                        <div className="flex gap-3 flex-wrap">
                          {week.resources.map((res: any, k: number) => (
                            <a key={k} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] px-3 py-2 rounded-lg text-xs font-bold text-blue-300 transition border border-gray-800 hover:border-blue-500/50">
                              {res.type === 'Video' ? '📺' : '📚'} {res.title} <ExternalLink size={10}/>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. ATS FIXES TAB */}
                {activeTab === 'ats' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
                      <p className="text-gray-300 text-sm flex items-center gap-2">
                         <AlertOctagon size={16} className="text-yellow-500"/>
                         Suggested rewrites to match Job Description keywords.
                      </p>
                    </div>
                    {result.atsFixes?.map((fix: any, i: number) => (
                      <div key={i} className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition group">
                        <div className="p-4 bg-red-900/5 border-b border-red-900/10">
                          <div className="text-xs font-bold text-red-400 uppercase mb-2">Original</div>
                          <p className="text-gray-500 text-sm line-through decoration-red-500/30">{fix.original}</p>
                        </div>
                        <div className="p-4 bg-green-900/5">
                          <div className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-2">
                            <RefreshCw size={12}/> AI Rewrite
                          </div>
                          <p className="text-gray-200 text-sm font-medium leading-relaxed">{fix.improved}</p>
                          <p className="text-xs text-gray-500 mt-2 italic">Why: {fix.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. QUIZ TAB */}
                {activeTab === 'quiz' && (
                  <div className="space-y-6 animate-in fade-in">
                    {!quizData ? (
                      <div className="text-center text-gray-500 py-10"><Brain size={48} className="mx-auto mb-4 opacity-20"/><p>Click "Test My Knowledge" on Overview.</p></div>
                    ) : (
                      quizData.map((q: any, i: number) => (
                        <div key={i} className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition group">
                          <h4 className="font-bold text-white mb-4">Q{i+1}: {q.question}</h4>
                          <div className="space-y-2">
                            {q.options.map((opt: string, idx: number) => {
                                const isSelected = selectedAnswers[i] === idx;
                                const isCorrect = idx === q.correctAnswer;
                                return (
                                <button key={idx} 
                                  onClick={() => setSelectedAnswers(prev => ({...prev, [i]: idx}))}
                                  className={`w-full text-left p-3 rounded border text-sm transition ${
                                    isSelected 
                                      ? (isCorrect ? 'bg-green-900/20 border-green-500/50 text-green-200' : 'bg-red-900/20 border-red-500/50 text-red-200')
                                      : 'bg-black border-gray-700 hover:bg-gray-800'
                                  }`}
                                >
                                  {opt}
                                </button>
                            )})}
                          </div>
                          {selectedAnswers[i] !== undefined && (
                             <div className="mt-4 p-3 bg-blue-900/20 text-blue-300 text-xs rounded border border-blue-900/50">
                               ✅ Answer: Option {q.correctAnswer + 1} <br/> 💡 {q.explanation}
                             </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 5. BUILDER TAB (Project Ideas) */}
                {activeTab === 'builder' && (
                  <div className="space-y-6 animate-in fade-in">
                    {!projectIdeas ? (
                      <div className="text-center text-gray-500 py-10">Select "Project Ideas" to start.</div>
                    ) : (
                      <div className="grid gap-6">
                        {projectIdeas.map((idea: any, i: number) => (
                          <div key={i} className={`p-6 rounded-xl border border-gray-800 bg-[#1a1a1a] hover:border-gray-700 transition relative overflow-hidden group`}>
                            
                            <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg uppercase ${
                              idea.difficulty === 'Beginner' ? 'bg-green-900/50 text-green-400' :
                              idea.difficulty === 'Intermediate' ? 'bg-yellow-900/50 text-yellow-400' :
                              'bg-red-900/50 text-red-400'
                            }`}>
                              {idea.difficulty}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{idea.title}</h3>
                            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{idea.description}</p>
                            
                            <div className="mb-4">
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Key Features</h4>
                              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                                {idea.keyFeatures.map((f: string, j: number) => <li key={j}>{f}</li>)}
                              </ul>
                            </div>

                            <div className="flex gap-2 flex-wrap mt-auto">
                              {idea.techStack.map((tech: string, k: number) => (
                                <span key={k} className="px-2 py-1 bg-black rounded border border-gray-800 text-xs text-gray-400">{tech}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}