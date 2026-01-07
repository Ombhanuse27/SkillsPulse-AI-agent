"use client";
import { useState } from "react";
import { 
  Upload, Brain, CheckCircle, Terminal, 
  BookOpen, ExternalLink, RefreshCw, AlertOctagon, Code, Play, Copy, FileCode, FolderTree, ChevronRight
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState("overview"); 
  const [quizData, setQuizData] = useState<any>(null);
  const [scaffoldData, setScaffoldData] = useState<any>(null);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({});

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
      if (errors) throw new Error(errors[0].message);
      setResult(data.analyzeApplication);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check console.");
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

  const handleScaffold = async () => {
    setFeatureLoading(true);
    const stack = result.recommendedStack || "Full Stack";
    // Asking for the rich "steps" with content and type
    const query = `
      mutation { 
        generateScaffold(
          techStack: "${stack}", 
          projectIdea: "${result.projectIdea.substring(0, 150)}..."
        ) { 
          projectName 
          techStack
          summary
          fileTree 
          steps { 
            id title description type content filePath
          } 
        } 
      }
    `;
    
    const res = await fetch("/api/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    const { data } = await res.json();
    setScaffoldData(data.generateScaffold);
    setActiveTab("builder");
    setFeatureLoading(false);
  };

  const getQuizTopic = () => {
    if (result?.topMissingSkills?.length > 0) return result.topMissingSkills[0]; 
    return jobRole;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              SkillPulse Agent
            </h1>
            <p className="text-gray-500 mt-2 text-sm"> AI-powered career coach that builds your roadmap.</p>
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
                    {tab === 'quiz' ? '⚔️ Skill Quiz' : tab === 'builder' ? '🚀 Builder' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-8 overflow-y-auto max-h-[600px] custom-scrollbar">
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="bg-blue-900/10 p-6 rounded-xl border border-blue-900/30">
                      <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Brain size={18}/> Executive Summary</h3>
                      <p className="text-blue-100 italic leading-relaxed text-lg">"{result.summary}"</p>
                    </div>
                    
                    {/* Missing Skills Warning */}
                    {result.topMissingSkills?.length > 0 && (
                      <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30 flex items-center justify-between">
                         <div>
                           <h4 className="text-red-400 font-bold text-sm">⚠️ Critical Skill Gaps</h4>
                           <p className="text-gray-400 text-xs">These skills are missing from your Projects/Experience.</p>
                         </div>
                         <div className="flex gap-2">
                           {result.topMissingSkills.map((s: string, i: number) => (
                             <span key={i} className="bg-red-900/50 text-red-200 px-2 py-1 rounded text-xs font-bold">{s}</span>
                           ))}
                         </div>
                      </div>
                    )}

                    {/* Feature Triggers */}
                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                       <button onClick={() => handleGenerateQuiz(getQuizTopic())} disabled={featureLoading}
                         className="p-4 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl hover:scale-[1.02] transition text-left group">
                         <h3 className="font-bold text-white flex items-center gap-2"><Play size={20} className="text-purple-400"/> Test My Knowledge</h3>
                         <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                           {featureLoading ? "Generating..." : `Take a specialized ${getQuizTopic()} quiz.`}
                         </p>
                       </button>
                       <button onClick={handleScaffold} disabled={featureLoading}
                         className="p-4 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-xl hover:scale-[1.02] transition text-left group">
                         <h3 className="font-bold text-white flex items-center gap-2"><Code size={20} className="text-green-400"/> Start Project</h3>
                         <p className="text-xs text-gray-400 mt-1 group-hover:text-gray-300">
                           {featureLoading ? "Building..." : `Generate ${result.recommendedStack || 'Project'} scaffold.`}
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

                {/* 5. BUILDER TAB (Rich Project View) */}
                {activeTab === 'builder' && (
                  <div className="space-y-6 animate-in fade-in">
                    {!scaffoldData ? (
                      <div className="text-center text-gray-500 py-10">Select "Start Project" to build scaffold.</div>
                    ) : (
                      <>
                        {/* Header Info */}
                        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6 rounded-xl border border-blue-900/30 mb-2">
                           <h3 className="text-xl font-bold text-white mb-2">🚀 {scaffoldData.projectName}</h3>
                           <p className="text-gray-400 text-xs font-mono mb-3 bg-black/30 inline-block px-2 py-1 rounded border border-white/10">{scaffoldData.techStack}</p>
                           <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{scaffoldData.summary}</p>
                        </div>

                        {/* File Tree Visualizer */}
                        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                          <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2"><FolderTree size={18}/> Project Structure</h3>
                          <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap custom-scrollbar bg-black p-4 rounded-lg border border-gray-800">
                            {scaffoldData.fileTree}
                          </pre>
                        </div>

                        {/* Detailed Steps */}
                        <div className="space-y-6">
                            {scaffoldData.steps?.map((step: any, i: number) => (
                            <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden">
                                {/* Step Header */}
                                <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                      {i+1}
                                    </div>
                                    <h3 className="font-bold text-white text-md">{step.title}</h3>
                                </div>
                                
                                {/* Step Content */}
                                <div className="p-5">
                                    <p className="text-gray-400 text-sm mb-4">{step.description}</p>
                                    
                                    <div className="relative group">
                                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition z-10">
                                            <Copy 
                                              size={16} 
                                              className="text-gray-400 cursor-pointer hover:text-white bg-gray-800 p-1 rounded"
                                              onClick={() => navigator.clipboard.writeText(step.content)}
                                            />
                                        </div>
                                        
                                        {step.type === 'code' && step.filePath && (
                                          <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-t-lg border-b border-gray-700 inline-block">
                                            📄 {step.filePath}
                                          </div>
                                        )}
                                        
                                        <pre className={`p-4 overflow-x-auto font-mono text-xs shadow-inner custom-scrollbar ${step.type === 'command' ? 'bg-black text-green-400 border border-gray-800 rounded-lg' : 'bg-[#0d0d0d] text-gray-300 border border-gray-800 rounded-b-lg rounded-tr-lg'}`}>
                                            {step.content}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                      </>
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