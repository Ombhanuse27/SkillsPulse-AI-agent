"use client";
import { useState } from "react";
import { 
  Upload, Brain, CheckCircle, Terminal, 
  ExternalLink, RefreshCw, AlertOctagon, 
  Play, Lightbulb, Clock, Target, 
  TrendingUp, Eye, ShieldCheck, Zap, Layers,
  ChevronRight, Calendar, FileText
} from "lucide-react";

export default function Home() {
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

  const handleProcess = async () => {
    if (!file || !jobRole || !jdText) { alert("Please fill in all fields"); return; }
    setLoading(true); setResult(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const parseRes = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const parseData = await parseRes.json();
      if (!parseData.text) throw new Error("PDF parse failed");
      setResumeId(parseData.resumeId); 

      // UPDATED QUERY: Added 'coverLetter' field
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
      setResult(data.analyzeApplication);
    } catch (err) { console.error(err); alert("Error processing resume"); } finally { setLoading(false); }
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
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* INPUT SECTION */}
        <div className="lg:col-span-4 space-y-6">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">SkillPulse Agent</h1>
            <p className="text-gray-500 mt-2 text-sm">AI-powered career coach.</p>
          </div>
          <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Target Role</label>
              <input value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-white" placeholder="e.g. Backend Engineer" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Job Description</label>
              <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-32 bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-sm text-gray-300" placeholder="Paste JD..." />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Resume</label>
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
            </div>
            <button onClick={handleProcess} disabled={loading} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${loading ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {loading ? "Analyzing..." : "Launch Analysis 🚀"}
            </button>
          </div>
        </div>

        {/* DASHBOARD */}
        <div className="lg:col-span-8">
          {!result ? (
            <div className="h-full bg-[#111] rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-gray-600 p-10 min-h-[600px]">
              <Terminal size={64} className="opacity-20 mb-4" /><p>Ready to analyze.</p>
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
              <div className="flex border-b border-gray-800 overflow-x-auto">
                {['overview', 'roadmap', 'ats', 'letter', 'quiz', 'builder'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition whitespace-nowrap ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/5' : 'text-gray-500'}`}>
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

                {/* 4. COVER LETTER TAB (NEW) */}
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
  );
}