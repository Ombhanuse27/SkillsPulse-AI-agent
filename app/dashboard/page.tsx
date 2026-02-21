"use client";
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Loader2, Play, CheckCircle, ExternalLink, Map, LogOut, Code, Video, 
  Sparkles, GraduationCap, MessageSquare, X, Send, ChevronRight, 
  BookOpen, Zap, Brain, Trophy, Flame, Target, Star, Lock, Clock, Award
} from 'lucide-react';

// --- TYPES ---
interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text?: string;
  quiz?: QuizData;
  userAnswer?: number;
}

interface UserProgress {
  stats: {
    level: number;
    totalXP: number;
    currentStreak: number;
    xpToNextLevel: number;
    nextLevelXP: number;
  };
  dailyGoal: {
    minsCompleted: number;
    targetMins: number;
    quizzesSolved: number;
    targetQuizzes: number;
    progressPercentage: number;
  };
  achievements: any[];
}

// --- GRAPHQL FETCHER ---
async function fetchRoadmaps(userId: string) {
  const query = `
    query {
      myRoadmaps(userId: "${userId}") {
        id
        title
        completionPercentage
        milestones {
          id
          title
          description
          week
          estimatedHours
          resources {
            id
            title
            url
            type
          }
          progress {
            status
            resourcesViewed
          }
        }
      }
    }
  `;
  const res = await fetch('/api/graphql-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  return json.data?.myRoadmaps || [];
}

async function fetchUserProgress(userId: string) {
  const query = `
    query {
      myProgress(userId: "${userId}") {
        stats {
          level
          totalXP
          currentStreak
          xpToNextLevel
          nextLevelXP
        }
        dailyGoal {
          minsCompleted
          targetMins
          quizzesSolved
          targetQuizzes
          progressPercentage
        }
        achievements {
          badgeId
          badgeName
          badgeIcon
          description
        }
      }
    }
  `;
  const res = await fetch('/api/graphql-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  return json.data?.myProgress;
}

// --- COMPONENTS ---

// 1. Stats Bar Component
function StatsBar({ progress, onShowAchievements }: { progress: UserProgress, onShowAchievements: () => void }) {
  if (!progress?.stats) return null;

  const { stats, dailyGoal } = progress;
  const xpPercentage = ((stats.nextLevelXP - stats.xpToNextLevel) / stats.nextLevelXP) * 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Level Card */}
      <div className="bg-[#111] border border-white/10 p-4 rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Level {stats.level}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalXP.toLocaleString()} XP</h3>
          </div>
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
            <Zap size={20} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{stats.xpToNextLevel} XP to Level {stats.level + 1}</p>
      </div>

      {/* Streak Card */}
      <div className="bg-[#111] border border-white/10 p-4 rounded-2xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Day Streak</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.currentStreak} 🔥</h3>
          </div>
          <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-400">
            <Flame size={20} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Keep it up!</p>
      </div>

      {/* Daily Goal Card */}
      <div className="bg-[#111] border border-white/10 p-4 rounded-2xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Daily Goal</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-bold text-white">{dailyGoal?.minsCompleted || 0}</h3>
              <span className="text-gray-500 text-sm">/ {dailyGoal?.targetMins || 0}m</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-400">
            <Target size={20} />
          </div>
        </div>
        <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="bg-green-500 h-full rounded-full" style={{ width: `${dailyGoal?.progressPercentage || 0}%` }} />
        </div>
      </div>

      {/* Achievements Trigger */}
      <button 
        onClick={onShowAchievements}
        className="bg-[#111] border border-white/10 p-4 rounded-2xl hover:bg-[#151515] transition-all text-left group"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Badges</p>
            <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-yellow-400 transition-colors">
              {progress.achievements?.length || 0}
            </h3>
          </div>
          <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
            <Trophy size={20} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">View Collection &rarr;</p>
      </button>
    </div>
  );
}

// 2. Interactive Quiz Component (Unchanged)
function InteractiveQuiz({ 
  quiz, 
  userAnswer, 
  onAnswer 
}: { 
  quiz: QuizData; 
  userAnswer?: number; 
  onAnswer: (index: number) => void;
}) {
  const answered = userAnswer !== undefined;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-400 mb-3">
        <GraduationCap size={20} />
        <h4 className="font-bold">Knowledge Check</h4>
      </div>
      
      <p className="text-white font-medium mb-4">{quiz.question}</p>
      
      <div className="space-y-2">
        {quiz.options.map((option, index) => {
          const isCorrect = index === quiz.correctIndex;
          const isUserChoice = index === userAnswer;
          
          let bgClass = 'bg-white/5 hover:bg-white/10';
          let borderClass = 'border-white/10';
          let textClass = 'text-gray-300';
          
          if (answered) {
            if (isCorrect) {
              bgClass = 'bg-green-500/20';
              borderClass = 'border-green-500';
              textClass = 'text-green-300';
            } else if (isUserChoice && !isCorrect) {
              bgClass = 'bg-red-500/20';
              borderClass = 'border-red-500';
              textClass = 'text-red-300';
            }
          }
          
          return (
            <button
              key={index}
              onClick={() => !answered && onAnswer(index)}
              disabled={answered}
              className={`w-full text-left p-3 rounded-xl border transition-all ${bgClass} ${borderClass} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">
                  {String.fromCharCode(65 + index)})
                </span>
                <span className={textClass}>{option}</span>
                {answered && isCorrect && (
                  <CheckCircle size={16} className="ml-auto text-green-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {answered && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-300">
            <strong>Explanation:</strong> {quiz.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  
  // --- ENHANCED MENTOR STATE ---
  const [activeMilestone, setActiveMilestone] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth/signin');
      setUser(user);
      
      // Parallel fetch
      const [maps, progress] = await Promise.all([
        fetchRoadmaps(user.id),
        fetchUserProgress(user.id)
      ]);
      
      setRoadmaps(maps);
      setUserProgress(progress);
    };
    init();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isStreaming, isThinking]);

  // Reset welcome when milestone changes
  useEffect(() => {
    if (activeMilestone) {
      setShowWelcome(chatHistory.length === 0);
    }
  }, [activeMilestone, chatHistory]);

  const handleGenerate = async () => {
    if(!goal.trim()) return;
    setLoading(true);
    
    try {
      await fetch('/api/agent', {
        method: 'POST',
        body: JSON.stringify({ goal, userId: user.id }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const updatedMaps = await fetchRoadmaps(user.id);
      setRoadmaps(updatedMaps);
      setGoal('');
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate roadmap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- PROGRESS ACTIONS ---
  const handleProgressAction = async (action: string, data: any) => {
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id, data })
      });
      const result = await res.json();
      
      if (result.success) {
        // Refresh state
        const [updatedMaps, updatedProgress] = await Promise.all([
          fetchRoadmaps(user.id),
          fetchUserProgress(user.id)
        ]);
        setRoadmaps(updatedMaps);
        setUserProgress(updatedProgress);
        return result;
      }
    } catch (e) {
      console.error("Progress update failed", e);
    }
  };

  const startMilestone = async (milestone: any) => {
    await handleProgressAction('start_milestone', { milestoneId: milestone.id });
    // Update local state simply for UI responsiveness before re-fetch
    setActiveMilestone({...milestone, progress: { status: 'in_progress' }});
  };

  const completeMilestone = async (milestone: any) => {
    if (confirm("Are you sure you've mastered this milestone?")) {
      await handleProgressAction('complete_milestone', { milestoneId: milestone.id });
      // Award XP Animation could go here
    }
  };

  const trackResourceView = async (milestone: any, resourceId: string) => {
    await handleProgressAction('mark_resource_viewed', { 
      milestoneId: milestone.id, 
      resourceId 
    });
  };

  // --- ENHANCED CHAT HANDLER ---
  const handleAskMentor = async (
    mode: 'chat' | 'explain' | 'quiz', 
    milestoneOverride?: any, 
    text?: string
  ) => {
    const targetMilestone = milestoneOverride || activeMilestone;
    if (!targetMilestone) return;

    if (milestoneOverride && milestoneOverride.id !== activeMilestone?.id) {
      setActiveMilestone(milestoneOverride);
      setChatHistory([]);
    }

    const userMsg = text || chatInput;
    if (!userMsg && mode === 'chat') return;

    setIsStreaming(true);
    setIsThinking(true);
    setChatInput('');
    setShowWelcome(false);

    let displayMsg = userMsg;
    if (mode === 'quiz') displayMsg = "🎲 Quiz Me";
    if (mode === 'explain') displayMsg = "💡 Explain this concept";
    
    const newUserMessage: ChatMessage = { role: 'user', text: displayMsg };
    setChatHistory(prev => [...prev, newUserMessage]);

    // Track detailed minutes for progress
    handleProgressAction('update_daily_progress', { minsSpent: 1 });

    const historyForAPI = [...chatHistory, newUserMessage].map(msg => ({
      role: msg.role,
      text: msg.text || ''
    }));

    try {
      const response = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg || `Generate a ${mode} for this topic`, 
          context: `${targetMilestone.title}: ${targetMilestone.description}`,
          mode: mode,
          chatHistory: historyForAPI
        }),
      });

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentMessage: ChatMessage = { role: 'ai', text: '' };
      let messageAdded = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            if (parsed.type === 'thinking') {
              setIsThinking(true);
            } else if (parsed.type === 'content') {
              setIsThinking(false);
              if (!messageAdded) {
                setChatHistory(prev => [...prev, currentMessage]);
                messageAdded = true;
              }
            } else if (parsed.type === 'data') {
              setIsThinking(false);
              if (!messageAdded) {
                setChatHistory(prev => [...prev, currentMessage]);
                messageAdded = true;
              }
              currentMessage.text = (currentMessage.text || '') + parsed.content;
              setChatHistory(prev => {
                const newHistory = [...prev];
                const lastMsg = newHistory[newHistory.length - 1];
                if (lastMsg.role === 'ai') lastMsg.text = currentMessage.text;
                return newHistory;
              });
            } else if (parsed.type === 'quiz') {
              setIsThinking(false);
              const quizMessage: ChatMessage = { role: 'ai', quiz: parsed.data };
              setChatHistory(prev => [...prev, quizMessage]);
              messageAdded = true;
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    } catch (err) {
      console.error("Stream Error:", err);
      setIsThinking(false);
    } finally {
      setIsStreaming(false);
      setIsThinking(false);
    }
  };

  const handleQuizAnswer = async (messageIndex: number, answerIndex: number) => {
    setChatHistory(prev => {
      const newHistory = [...prev];
      const msg = newHistory[messageIndex];
      if (msg.quiz) {
        msg.userAnswer = answerIndex;
      }
      return newHistory;
    });

    const msg = chatHistory[messageIndex];
    if (msg.quiz) {
       // Only using AI generated quizzes in chat for now, but recording XP
       // Ideally we'd map this to a DB quiz ID if available
       const isCorrect = answerIndex === msg.quiz.correctIndex;
       if (isCorrect) {
          await handleProgressAction('submit_quiz_manual', { xp: 25 }); // Helper for ad-hoc quiz xp
       }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleMilestoneClick = (milestone: any) => {
    setActiveMilestone(milestone);
    setChatHistory([]);
    setShowWelcome(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32}/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 md:p-8 flex overflow-hidden">
      
      {/* --- MAIN CONTENT --- */}
      <div className={`flex-1 transition-all duration-300 ${activeMilestone ? 'mr-[500px]' : ''}`}>
        
        <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Map size={18} />
            </div>
            SkillPulse
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </header>

        <main className="max-w-7xl mx-auto">
          
          {/* USER STATS BAR */}
          {userProgress && (
            <StatsBar 
              progress={userProgress} 
              onShowAchievements={() => setShowAchievements(true)} 
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* INPUT COLUMN */}
            <div className="lg:col-span-4">
              <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-3xl sticky top-8">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Zap size={24} className="text-yellow-500"/>
                  New Mission
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                  What do you want to master? <br/>
                  <span className="text-xs text-blue-400">Try: "React in 3 days" or "Learn DevOps"</span>
                </p>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white min-h-[140px] focus:outline-none focus:border-blue-500 mb-4 transition-colors resize-none"
                  placeholder="e.g., Master System Design in 30 days..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleGenerate();
                    }
                  }}
                />
                <button 
                  onClick={handleGenerate} 
                  disabled={loading || !goal.trim()} 
                  className="w-full bg-white text-black hover:bg-blue-500 hover:text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Crafting Your Path...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18}/>
                      Generate Roadmap
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ROADMAPS */}
            <div className="lg:col-span-8 space-y-8 h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar pb-20">
              {roadmaps.length === 0 ? (
                <div className="text-center text-gray-600 mt-20">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                  <p>No roadmaps yet. Create your first learning path!</p>
                </div>
              ) : (
                roadmaps.map((map) => {
                  // NEW: Detect if this is an intensive/daily course based on title
                  const isDailyCourse = map.title.toLowerCase().includes('day') || 
                                        map.milestones.some((m:any) => m.title.toLowerCase().includes('day'));

                  return (
                    <div key={map.id} className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden hover:border-white/20 transition-colors">
                      <div className="p-8 border-b border-white/5 flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold flex items-center gap-2">
                            {map.title}
                            {isDailyCourse && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                Intensive
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-500 text-sm mt-1">
                            {map.milestones.length} milestones • {map.completionPercentage}% Complete
                          </p>
                        </div>
                        {map.completionPercentage === 100 && (
                          <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30 flex items-center gap-1">
                            <Trophy size={12} /> COMPLETED
                          </div>
                        )}
                      </div>
                      <div className="p-8 space-y-8 relative before:absolute before:inset-0 before:ml-11 before:h-full before:w-0.5 before:bg-white/5">
                        {map.milestones.map((milestone: any, idx: number) => {
                          const status = milestone.progress?.status || 'not_started';
                          const isLocked = idx > 0 && map.milestones[idx - 1].progress?.status !== 'completed';
                          
                          return (
                            <div key={idx} className={`relative pl-12 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
                              
                              {/* STATUS INDICATOR ICON */}
                              <div 
                                onClick={() => !isLocked && handleMilestoneClick(milestone)}
                                className={`absolute left-0 top-1 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold z-10 transition-all ${
                                  status === 'completed' 
                                    ? 'bg-green-500 border-green-500 text-black' 
                                    : status === 'in_progress'
                                    ? 'bg-blue-600 border-blue-600 animate-pulse'
                                    : isLocked 
                                    ? 'bg-[#111] border-white/10 text-gray-600'
                                    : 'bg-[#111] border-gray-600 hover:border-blue-500'
                                } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {status === 'completed' ? <CheckCircle size={14}/> : 
                                 isLocked ? <Lock size={12}/> : 
                                 status === 'in_progress' ? <Play size={12} fill="currentColor"/> : 
                                 idx + 1}
                              </div>

                              <div className="flex justify-between items-start">
                                <div 
                                  onClick={() => !isLocked && handleMilestoneClick(milestone)}
                                  className={isLocked ? "cursor-not-allowed" : "cursor-pointer group"}
                                >
                                  <h4 className="font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">
                                    {milestone.title}
                                  </h4>
                                  <p className="text-gray-400 text-sm mb-4">
                                    {milestone.description}
                                  </p>
                                  {/* UPDATED: Smart Time Label */}
                                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                                    <span className="flex items-center gap-1">
                                      <Clock size={12}/> 
                                      {/* Logic: If it's daily, show "Day X", else "Week X" */}
                                      {isDailyCourse ? `Day ${idx + 1}` : `Week ${milestone.week || idx + 1}`}
                                      {' • '} 
                                      {milestone.estimatedHours}h est.
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* ACTION BUTTONS */}
                              {!isLocked && (
                                <div className="flex gap-2 mb-4 flex-wrap items-center">
                                  {/* PRIMARY ACTION BUTTON */}
                                  {status === 'not_started' && (
                                    <button 
                                      onClick={() => startMilestone(milestone)}
                                      className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg flex gap-2 font-bold hover:bg-blue-500 transition-all"
                                    >
                                      Start Mission
                                    </button>
                                  )}
                                  {status === 'in_progress' && (
                                    <button 
                                      onClick={() => completeMilestone(milestone)}
                                      className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg flex gap-2 font-bold hover:bg-green-500 transition-all"
                                    >
                                      Mark Complete
                                    </button>
                                  )}

                                  <div className="w-px h-4 bg-white/10 mx-2"></div>

                                  <button onClick={() => handleAskMentor('explain', milestone)} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex gap-2 border border-white/5">
                                    <Sparkles size={12} className="text-yellow-400" /> Explain
                                  </button>
                                  <button onClick={() => handleAskMentor('quiz', milestone)} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex gap-2 border border-white/5">
                                    <GraduationCap size={12} className="text-green-400" /> Quiz
                                  </button>
                                </div>
                              )}

                              {/* RESOURCES */}
                              {milestone.resources && milestone.resources.length > 0 && !isLocked && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {milestone.resources.map((res: any, rId: number) => {
                                    const isViewed = milestone.progress?.resourcesViewed?.includes(res.id || res.url);
                                    return (
                                      <a 
                                        key={rId} 
                                        href={res.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={() => trackResourceView(milestone, res.id || res.url)}
                                        className={`flex items-center gap-3 border p-3 rounded-xl transition-all group/link ${
                                          isViewed 
                                            ? 'bg-blue-900/10 border-blue-500/20' 
                                            : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20'
                                        }`}
                                      >
                                        {res.type === 'YOUTUBE' && <Video size={16} className="text-red-500 flex-shrink-0" />}
                                        {res.type === 'GITHUB' && <Code size={16} className="text-purple-500 flex-shrink-0" />}
                                        {res.type === 'INTERACTIVE' && <Play size={16} className="text-green-500 flex-shrink-0" />}
                                        {res.type === 'ARTICLE' && <BookOpen size={16} className="text-blue-500 flex-shrink-0" />}
                                        {!['YOUTUBE', 'GITHUB', 'INTERACTIVE', 'ARTICLE'].includes(res.type) && <ExternalLink size={16} className="text-gray-500 flex-shrink-0" />}
                                        
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-xs truncate font-medium ${isViewed ? 'text-blue-200' : 'text-gray-300 group-hover/link:text-white'}`}>
                                            {res.title}
                                          </p>
                                        </div>
                                        
                                        {isViewed ? (
                                          <CheckCircle size={12} className="text-blue-500 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight size={12} className="text-gray-600 group-hover/link:text-white flex-shrink-0" />
                                        )}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* --- NEURAL MENTOR SIDEBAR --- */}
      <div className={`fixed inset-y-0 right-0 w-[500px] bg-[#0c0c0c] border-l border-white/10 transform transition-transform duration-300 shadow-2xl z-40 flex flex-col ${
        activeMilestone ? 'translate-x-0' : 'translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2 text-lg">
              <Sparkles size={18} className="text-blue-500" /> 
              Neural Mentor
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[300px] mt-1">
              {activeMilestone?.title}
            </p>
          </div>
          <button 
            onClick={() => {
              setActiveMilestone(null);
              setChatHistory([]);
              setShowWelcome(true);
            }} 
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20}/>
          </button>
        </div>

        {/* CHAT HISTORY */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0c0c0c] custom-scrollbar" 
          ref={chatScrollRef}
        >
          {/* Welcome Message */}
          {showWelcome && chatHistory.length === 0 && (
            <div className="text-center mt-12 space-y-6">
              <Sparkles size={48} className="opacity-20 mx-auto"/>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">
                  Ready to Master This Topic?
                </h4>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                  I can explain complex concepts, quiz your knowledge, or help you debug code related to this milestone.
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <button
                  onClick={() => handleAskMentor('explain')}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition-all text-sm flex flex-col items-center gap-2"
                >
                  <Sparkles size={20} className="text-yellow-400"/>
                  <span>Explain Concept</span>
                </button>
                <button
                  onClick={() => handleAskMentor('quiz')}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition-all text-sm flex flex-col items-center gap-2"
                >
                  <GraduationCap size={20} className="text-green-400"/>
                  <span>Test My Knowledge</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Chat Messages */}
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#151515] text-gray-300 border border-white/10'
              }`}>
                {msg.quiz ? (
                  <InteractiveQuiz 
                    quiz={msg.quiz} 
                    userAnswer={msg.userAnswer}
                    onAnswer={(answerIndex) => handleQuizAnswer(idx, answerIndex)}
                  />
                ) : msg.text ? (
                  msg.role === 'ai' ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({children}) => <h1 className="text-lg font-bold text-white mb-2 pb-1 border-b border-white/10">{children}</h1>,
                        h2: ({children}) => <h2 className="text-base font-bold text-white mb-2 mt-4">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-bold text-blue-300 mb-1 mt-3 uppercase tracking-wide">{children}</h3>,
                        ul: ({children}) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="pl-1">{children}</li>,
                        p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
                        strong: ({children}) => <strong className="text-white font-bold">{children}</strong>,
                        code({node, inline, className, children, ...props}: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="rounded-lg overflow-hidden my-4 border border-white/10 shadow-xl">
                              <div className="bg-[#1e1e1e] px-3 py-1.5 text-[10px] text-gray-400 border-b border-white/5 font-mono flex justify-between">
                                <span>{match[1].toUpperCase()}</span>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ 
                                  margin: 0, 
                                  padding: '1rem', 
                                  background: '#0a0a0a', 
                                  fontSize: '12px', 
                                  lineHeight: '1.5' 
                                }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs border border-blue-500/20" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )
                ) : null}
              </div>
            </div>
          ))}
          
          {/* Thinking/Streaming Indicators (Unchanged) */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-[#151515] p-4 rounded-2xl flex items-center gap-3 border border-white/10">
                <Brain className="text-blue-400 animate-pulse" size={20}/>
                <span className="text-xs text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
          <div className="relative">
            <input 
              type="text" 
              className="w-full bg-[#151515] border border-white/10 rounded-xl py-4 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
              placeholder="Ask a question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isStreaming) {
                  handleAskMentor('chat');
                }
              }}
              disabled={isStreaming}
            />
            <button 
              onClick={() => handleAskMentor('chat')} 
              disabled={isStreaming || !chatInput.trim()}
              className="absolute right-2 top-2 bottom-2 w-10 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS MODAL */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" /> 
                Achievements Gallery
              </h2>
              <button onClick={() => setShowAchievements(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar">
              {(userProgress?.achievements?.length || 0) === 0 ? (
                <div className="col-span-full text-center py-10 text-gray-500">
                  <Award size={40} className="mx-auto mb-3 opacity-20"/>
                  <p>No badges earned yet. Keep learning!</p>
                </div>
              ) : (
                userProgress?.achievements?.map((badge, i) => (
                  <div key={i} className="bg-[#151515] border border-white/5 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                    <div className="text-4xl mb-2">{badge.badgeIcon}</div>
                    <h3 className="font-bold text-white text-sm">{badge.badgeName}</h3>
                    <p className="text-xs text-gray-500">{badge.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}