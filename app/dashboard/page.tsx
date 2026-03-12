"use client";
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Loader2, Play, CheckCircle, ExternalLink, Map, LogOut, Code, Video,
  Sparkles, GraduationCap, MessageSquare, X, Send, ChevronRight,
  BookOpen, Zap, Brain, Trophy, Flame, Target, Star, Lock, Clock, Award,
  FileText, Menu, Home, ChevronDown, Cpu, BarChart2, Bell, Settings,
  TrendingUp, Activity
} from 'lucide-react';

// --- REDUX ---
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser, clearUser } from '@/store/slices/userSlice';
import {
  loadRoadmaps,
  generateRoadmap,
  setGoal,
  setRoadmaps,
} from '@/store/slices/roadmapSlice';
import {
  loadUserProgress,
  performProgressAction,
  setShowAchievements,
} from '@/store/slices/progressSlice';
import {
  openMilestone,
  closeMentor,
  setChatInput,
  setIsStreaming,
  setIsThinking,
  setShowWelcome,
  appendChatMessage,
  updateLastAiMessage,
  setQuizAnswer,
  setActiveMilestone,
  setChatHistory,
} from '@/store/slices/mentorSlice';
import { fetchRoadmaps } from '@/store/slices/roadmapSlice';
import { fetchUserProgress } from '@/store/slices/progressSlice';
import type { ChatMessage } from '@/store/slices/mentorSlice';

// --- TYPES ---
interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
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

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/dashboard',        icon: Home,     color: 'text-blue-400',   accent: 'blue'   },
  { label: 'Career Architect', href: '/dashboard',        icon: Map,      color: 'text-green-400',  accent: 'green'  },
  { label: 'Resume Audit',     href: '/resume-analyzer',  icon: FileText, color: 'text-sky-400',    accent: 'sky'    },
  { label: 'AI Interviewer',   href: '/interview-prep',   icon: Brain,    color: 'text-purple-400', accent: 'purple' },
];

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({
  user,
  onLogout,
  progress,
}: {
  user: any;
  onLogout: () => void;
  progress?: UserProgress;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 shadow-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tighter group shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/60 transition-shadow">
              <Cpu size={16} className="text-white" />
            </div>
            <span className="hidden sm:inline">
              Skill<span className="text-blue-500">Pulse</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href && item.href === '/dashboard';
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isCurrent
                      ? `bg-white/10 ${item.color}`
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} className={`transition-all group-hover:${item.color}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* XP Badge */}
            {progress?.stats && (
              <div className="hidden lg:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 text-xs font-bold text-blue-400">
                <Zap size={12} className="animate-pulse" />
                {progress.stats.totalXP.toLocaleString()} XP
              </div>
            )}

            {/* Streak Badge */}
            {progress?.stats?.currentStreak ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-bold text-orange-400">
                <Flame size={12} />
                {progress.stats.currentStreak}d
              </div>
            ) : null}

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <LogOut size={14} />
              <span className="hidden lg:inline">Sign Out</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl ${
            mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all ${item.color}`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Nav spacer */}
      <div className="h-16" />
    </>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({
  progress,
  onShowAchievements,
}: {
  progress: UserProgress;
  onShowAchievements: () => void;
}) {
  if (!progress?.stats) return null;

  const { stats, dailyGoal } = progress;
  const xpPercentage =
    ((stats.nextLevelXP - stats.xpToNextLevel) / stats.nextLevelXP) * 100;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
      {/* Level / XP */}
      <div className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-blue-500/30 transition-all duration-300 cursor-default">
        <div
          className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent transition-all duration-1000 rounded-full"
          style={{ width: `${xpPercentage}%` }}
        />
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/5 rounded-full group-hover:bg-blue-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
              Level {stats.level}
            </p>
            <h3 className="text-xl font-black text-white mt-1 tabular-nums">
              {stats.totalXP.toLocaleString()}
              <span className="text-xs text-blue-400 font-bold ml-1">XP</span>
            </h3>
          </div>
          <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
            <Zap size={18} />
          </div>
        </div>
        <div className="mt-3 w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
            style={{ width: `${xpPercentage}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          {stats.xpToNextLevel} XP to Level {stats.level + 1}
        </p>
      </div>

      {/* Streak */}
      <div className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-orange-500/30 transition-all duration-300 cursor-default">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-500/5 rounded-full group-hover:bg-orange-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Day Streak</p>
            <h3 className="text-xl font-black text-white mt-1 tabular-nums">
              {stats.currentStreak}
              <span className="ml-1">🔥</span>
            </h3>
          </div>
          <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 group-hover:scale-110 transition-all">
            <Flame size={18} />
          </div>
        </div>
        <p className="text-[10px] text-gray-600 mt-3">Keep it going!</p>
      </div>

      {/* Daily Goal */}
      <div className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-green-500/30 transition-all duration-300 cursor-default">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-green-500/5 rounded-full group-hover:bg-green-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Daily Goal</p>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-xl font-black text-white tabular-nums">{dailyGoal?.minsCompleted || 0}</h3>
              <span className="text-gray-500 text-xs">/ {dailyGoal?.targetMins || 0}m</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 group-hover:bg-green-500/20 group-hover:scale-110 transition-all">
            <Target size={18} />
          </div>
        </div>
        <div className="mt-3 w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-700"
            style={{ width: `${dailyGoal?.progressPercentage || 0}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">{dailyGoal?.progressPercentage || 0}% complete today</p>
      </div>

      {/* Achievements */}
      <button
        onClick={onShowAchievements}
        className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-yellow-500/30 transition-all duration-300 text-left"
      >
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-yellow-500/5 rounded-full group-hover:bg-yellow-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Badges</p>
            <h3 className="text-xl font-black text-white mt-1 group-hover:text-yellow-400 transition-colors tabular-nums">
              {progress.achievements?.length || 0}
            </h3>
          </div>
          <div className="w-9 h-9 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all">
            <Trophy size={18} />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-3 flex items-center gap-1 group-hover:text-yellow-400 transition-colors">
          View Gallery <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
        </p>
      </button>
    </div>
  );
}

// ─── AGENT QUICK-NAV CARDS ────────────────────────────────────────────────────
function AgentCards() {
  const agents = [
    {
      href: '/resume-analyzer',
      icon: FileText,
      label: 'Resume Audit',
      sub: 'Upload & optimize',
      from: 'from-sky-500/10',
      border: 'hover:border-sky-500/40',
      text: 'text-sky-400',
      glow: 'shadow-sky-500/20',
    },
    {
      href: '/interview-prep',
      icon: Brain,
      label: 'AI Interviewer',
      sub: 'Mock interviews',
      from: 'from-purple-500/10',
      border: 'hover:border-purple-500/40',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20',
    },
  ];

  return (
    <div className="flex gap-3 mb-8 flex-wrap">
      {agents.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className={`flex items-center gap-3 bg-[#0d0d0d] border border-white/8 ${a.border} rounded-2xl px-4 py-3 transition-all duration-300 group hover:shadow-lg ${a.glow}`}
          >
            <div className={`w-8 h-8 bg-gradient-to-br ${a.from} to-transparent rounded-xl flex items-center justify-center ${a.text} group-hover:scale-110 transition-transform`}>
              <Icon size={16} />
            </div>
            <div>
              <p className={`text-xs font-bold ${a.text}`}>{a.label}</p>
              <p className="text-[10px] text-gray-600">{a.sub}</p>
            </div>
            <ChevronRight size={14} className="text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1" />
          </Link>
        );
      })}
    </div>
  );
}

// ─── INTERACTIVE QUIZ ─────────────────────────────────────────────────────────
function InteractiveQuiz({
  quiz,
  userAnswer,
  onAnswer,
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
              className={`w-full text-left p-3 rounded-xl border transition-all ${bgClass} ${borderClass} ${
                answered ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{String.fromCharCode(65 + index)})</span>
                <span className={textClass}>{option}</span>
                {answered && isCorrect && <CheckCircle size={16} className="ml-auto text-green-400" />}
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

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const supabase = createClient();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // local UI state
  const [inputFocused, setInputFocused] = useState(false);

  // --- SELECTORS ---
  const user = useAppSelector((s) => s.user.user);
  const { roadmaps, goal, loading } = useAppSelector((s) => s.roadmap);
  const { userProgress, showAchievements } = useAppSelector((s) => s.progress);
  const {
    activeMilestone,
    chatHistory,
    chatInput,
    isStreaming,
    isThinking,
    showWelcome,
  } = useAppSelector((s) => s.mentor);

  // --- INIT ---
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return router.push('/auth/signin');
      dispatch(setUser(authUser));
      dispatch(loadRoadmaps(authUser.id));
      dispatch(loadUserProgress(authUser.id));
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
      dispatch(setShowWelcome(chatHistory.length === 0));
    }
  }, [activeMilestone, chatHistory]);

  // --- GENERATE ROADMAP ---
  const handleGenerate = async () => {
    if (!goal.trim() || !user) return;
    try {
      await dispatch(generateRoadmap({ goal, userId: user.id })).unwrap();
    } catch {
      alert('Failed to generate roadmap. Please try again.');
    }
  };

  // --- PROGRESS ACTIONS ---
  const handleProgressAction = async (action: string, data: any) => {
    if (!user) return;
    try {
      const result = await dispatch(
        performProgressAction({ action, userId: user.id, data })
      ).unwrap();
      dispatch(loadRoadmaps(user.id));
      return result?.result;
    } catch (e) {
      console.error('Progress update failed', e);
    }
  };

  const startMilestone = async (milestone: any) => {
    await handleProgressAction('start_milestone', { milestoneId: milestone.id });
    dispatch(setActiveMilestone({ ...milestone, progress: { status: 'in_progress' } }));
  };

  const completeMilestone = async (milestone: any) => {
    if (confirm("Are you sure you've mastered this milestone?")) {
      await handleProgressAction('complete_milestone', { milestoneId: milestone.id });
    }
  };

  const trackResourceView = async (milestone: any, resourceId: string) => {
    await handleProgressAction('mark_resource_viewed', {
      milestoneId: milestone.id,
      resourceId,
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
      dispatch(openMilestone(milestoneOverride));
    }

    const userMsg = text || chatInput;
    if (!userMsg && mode === 'chat') return;

    dispatch(setIsStreaming(true));
    dispatch(setIsThinking(true));
    dispatch(setChatInput(''));
    dispatch(setShowWelcome(false));

    let displayMsg = userMsg;
    if (mode === 'quiz') displayMsg = '🎲 Quiz Me';
    if (mode === 'explain') displayMsg = '💡 Explain this concept';

    const newUserMessage: ChatMessage = { role: 'user', text: displayMsg };
    dispatch(appendChatMessage(newUserMessage));

    handleProgressAction('update_daily_progress', { minsSpent: 1 });

    const historyForAPI = [...chatHistory, newUserMessage].map((msg) => ({
      role: msg.role,
      text: msg.text || '',
    }));

    try {
      const response = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg || `Generate a ${mode} for this topic`,
          context: `${targetMilestone.title}: ${targetMilestone.description}`,
          mode,
          chatHistory: historyForAPI,
        }),
      });

      if (!response.body) throw new Error('No response stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentAiText = '';
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
              dispatch(setIsThinking(true));
            } else if (parsed.type === 'content') {
              dispatch(setIsThinking(false));
              if (!messageAdded) {
                dispatch(appendChatMessage({ role: 'ai', text: '' }));
                messageAdded = true;
              }
            } else if (parsed.type === 'data') {
              dispatch(setIsThinking(false));
              if (!messageAdded) {
                dispatch(appendChatMessage({ role: 'ai', text: '' }));
                messageAdded = true;
              }
              currentAiText += parsed.content;
              dispatch(updateLastAiMessage(currentAiText));
            } else if (parsed.type === 'quiz') {
              dispatch(setIsThinking(false));
              dispatch(appendChatMessage({ role: 'ai', quiz: parsed.data }));
              messageAdded = true;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    } catch (err) {
      console.error('Stream Error:', err);
      dispatch(setIsThinking(false));
    } finally {
      dispatch(setIsStreaming(false));
      dispatch(setIsThinking(false));
    }
  };

  const handleQuizAnswer = async (messageIndex: number, answerIndex: number) => {
    dispatch(setQuizAnswer({ index: messageIndex, answer: answerIndex }));
    const msg = chatHistory[messageIndex];
    if (msg?.quiz) {
      const isCorrect = answerIndex === msg.quiz.correctIndex;
      if (isCorrect) {
        await handleProgressAction('submit_quiz_manual', { xp: 25 });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(clearUser());
    router.push('/');
  };

  const handleMilestoneClick = (milestone: any) => {
    dispatch(openMilestone(milestone));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <Cpu size={20} className="text-white" />
          </div>
          <Loader2 className="animate-spin text-blue-400" size={24} />
        </div>
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">

      {/* Subtle background glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/8 rounded-full blur-[150px]" />
      </div>

      {/* ── NAVBAR ── */}
      <Navbar user={user} onLogout={handleLogout} progress={userProgress} />

      {/* ── MAIN LAYOUT ── */}
      <div className="relative z-10 flex min-h-[calc(100vh-64px)]">

        {/* CONTENT AREA — shifts left when mentor panel open */}
        <div
          className={`flex-1 transition-all duration-300 ease-in-out ${
            activeMilestone ? 'xl:mr-[500px]' : ''
          }`}
        >
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">

            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Learning <span className="text-blue-500">Dashboard</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Welcome back, <span className="text-gray-300">{user?.email?.split('@')[0]}</span> —
                {userProgress?.stats?.currentStreak
                  ? ` you're on a ${userProgress.stats.currentStreak}-day streak! 🔥`
                  : ' let\'s build something great today.'}
              </p>
            </div>

            {/* AGENT QUICK-NAV */}
            <AgentCards />

            {/* STATS BAR */}
            {userProgress && (
              <StatsBar
                progress={userProgress}
                onShowAchievements={() => dispatch(setShowAchievements(true))}
              />
            )}

            {/* TWO-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT — NEW MISSION INPUT */}
              <div className="lg:col-span-4">
                <div
                  className={`bg-[#0a0a0a] border rounded-3xl p-6 sticky top-24 transition-all duration-300 ${
                    inputFocused
                      ? 'border-blue-500/50 shadow-xl shadow-blue-500/10'
                      : 'border-white/8 hover:border-white/15'
                  }`}
                >
                  <h2 className="text-xl font-black mb-1 flex items-center gap-2">
                    <div className="w-7 h-7 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                      <Zap size={16} className="text-yellow-500" />
                    </div>
                    New Mission
                  </h2>
                  <p className="text-gray-500 text-xs mb-4 leading-relaxed">
                    What do you want to master?{' '}
                    <span className="text-blue-400 font-medium">
                      Try: "React in 3 days" or "Learn DevOps"
                    </span>
                  </p>

                  <textarea
                    className="w-full bg-white/4 border border-white/8 rounded-2xl p-4 text-white text-sm min-h-[130px] focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/3 mb-4 transition-all resize-none placeholder:text-gray-600"
                    placeholder="e.g., Master System Design in 30 days..."
                    value={goal}
                    onChange={(e) => dispatch(setGoal(e.target.value))}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleGenerate();
                    }}
                  />

                  <button
                    onClick={handleGenerate}
                    disabled={loading || !goal.trim()}
                    className="w-full relative overflow-hidden bg-white text-black hover:bg-blue-500 hover:text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group text-sm"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Crafting Your Path…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate Roadmap
                        <span className="text-[10px] opacity-40 font-normal">⌘+↵</span>
                      </>
                    )}
                  </button>

                  {/* Tips */}
                  <div className="mt-4 space-y-1.5">
                    {['React in 3 days', 'Kubernetes mastery', 'DSA for interviews'].map((tip) => (
                      <button
                        key={tip}
                        onClick={() => dispatch(setGoal(tip))}
                        className="w-full text-left text-[11px] text-gray-600 hover:text-blue-400 px-3 py-1.5 rounded-lg bg-white/2 hover:bg-blue-500/5 border border-white/4 hover:border-blue-500/20 transition-all"
                      >
                        ↳ {tip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT — ROADMAPS */}
              <div className="lg:col-span-8 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar pb-16">
                {roadmaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-24 text-gray-700">
                    <div className="w-16 h-16 rounded-3xl bg-white/3 border border-white/5 flex items-center justify-center mb-5">
                      <BookOpen size={28} className="opacity-30" />
                    </div>
                    <p className="font-bold text-gray-500">No roadmaps yet.</p>
                    <p className="text-sm text-gray-700 mt-1">Generate your first learning path on the left.</p>
                  </div>
                ) : (
                  roadmaps.map((map) => {
                    const isDailyCourse =
                      map.title.toLowerCase().includes('day') ||
                      map.milestones.some((m: any) => m.title.toLowerCase().includes('day'));

                    const completedCount = map.milestones.filter(
                      (m: any) => m.progress?.status === 'completed'
                    ).length;

                    return (
                      <div
                        key={map.id}
                        className="bg-[#0a0a0a] border border-white/8 rounded-3xl overflow-hidden hover:border-white/15 transition-all duration-300 group/card"
                      >
                        {/* Roadmap Header */}
                        <div className="px-7 py-5 border-b border-white/5 flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-black flex items-center gap-2 truncate">
                              {map.title}
                              {isDailyCourse && (
                                <span className="shrink-0 text-[9px] bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                                  Intensive
                                </span>
                              )}
                            </h3>
                            <div className="flex items-center gap-3 mt-1.5">
                              <p className="text-gray-600 text-xs">
                                {completedCount}/{map.milestones.length} milestones
                              </p>
                              <div className="flex-1 max-w-[120px] bg-white/5 h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-700"
                                  style={{ width: `${map.completionPercentage}%` }}
                                />
                              </div>
                              <p className="text-gray-500 text-xs">{map.completionPercentage}%</p>
                            </div>
                          </div>
                          {map.completionPercentage === 100 && (
                            <div className="shrink-0 bg-green-500/15 text-green-400 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/25 flex items-center gap-1 ml-4">
                              <Trophy size={11} /> COMPLETED
                            </div>
                          )}
                        </div>

                        {/* Milestones */}
                        <div className="px-7 py-5 space-y-7 relative before:absolute before:left-[1.75rem] before:top-0 before:bottom-0 before:w-px before:bg-white/5">
                          {map.milestones.map((milestone: any, idx: number) => {
                            const status = milestone.progress?.status || 'not_started';
                            const isLocked =
                              idx > 0 &&
                              map.milestones[idx - 1].progress?.status !== 'completed';

                            return (
                              <div
                                key={idx}
                                className={`relative pl-11 transition-opacity duration-300 ${
                                  isLocked ? 'opacity-40' : 'opacity-100'
                                }`}
                              >
                                {/* Status Icon */}
                                <div
                                  onClick={() => !isLocked && handleMilestoneClick(milestone)}
                                  className={`absolute left-0 top-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black z-10 transition-all duration-200 ${
                                    status === 'completed'
                                      ? 'bg-green-500 border-green-500 text-black'
                                      : status === 'in_progress'
                                      ? 'bg-blue-600 border-blue-500 animate-pulse'
                                      : isLocked
                                      ? 'bg-[#111] border-white/10 text-gray-700'
                                      : 'bg-[#111] border-gray-700 hover:border-blue-500 hover:bg-blue-500/10'
                                  } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  {status === 'completed' ? (
                                    <CheckCircle size={13} />
                                  ) : isLocked ? (
                                    <Lock size={11} />
                                  ) : status === 'in_progress' ? (
                                    <Play size={10} fill="currentColor" />
                                  ) : (
                                    idx + 1
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex justify-between items-start gap-4">
                                  <div
                                    onClick={() => !isLocked && handleMilestoneClick(milestone)}
                                    className={isLocked ? 'cursor-not-allowed' : 'cursor-pointer group/ms'}
                                  >
                                    <h4 className="font-bold text-sm mb-1 group-hover/ms:text-blue-400 transition-colors">
                                      {milestone.title}
                                    </h4>
                                    <p className="text-gray-500 text-xs mb-2 leading-relaxed">
                                      {milestone.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                      <Clock size={10} />
                                      {isDailyCourse ? `Day ${idx + 1}` : `Week ${milestone.week || idx + 1}`}
                                      {' · '}
                                      {milestone.estimatedHours}h est.
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                {!isLocked && (
                                  <div className="flex gap-2 mt-3 mb-3 flex-wrap items-center">
                                    {status === 'not_started' && (
                                      <button
                                        onClick={() => startMilestone(milestone)}
                                        className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5"
                                      >
                                        <Play size={10} fill="currentColor" />
                                        Start Mission
                                      </button>
                                    )}
                                    {status === 'in_progress' && (
                                      <button
                                        onClick={() => completeMilestone(milestone)}
                                        className="text-[11px] bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5"
                                      >
                                        <CheckCircle size={10} />
                                        Mark Complete
                                      </button>
                                    )}
                                    <div className="w-px h-4 bg-white/8" />
                                    <button
                                      onClick={() => handleAskMentor('explain', milestone)}
                                      className="text-[11px] bg-white/5 hover:bg-yellow-500/10 hover:text-yellow-300 hover:border-yellow-500/20 px-3 py-1.5 rounded-lg flex gap-1.5 items-center border border-white/5 transition-all"
                                    >
                                      <Sparkles size={11} className="text-yellow-400" />
                                      Explain
                                    </button>
                                    <button
                                      onClick={() => handleAskMentor('quiz', milestone)}
                                      className="text-[11px] bg-white/5 hover:bg-green-500/10 hover:text-green-300 hover:border-green-500/20 px-3 py-1.5 rounded-lg flex gap-1.5 items-center border border-white/5 transition-all"
                                    >
                                      <GraduationCap size={11} className="text-green-400" />
                                      Quiz Me
                                    </button>
                                    <button
                                      onClick={() => handleMilestoneClick(milestone)}
                                      className="text-[11px] bg-white/5 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/20 px-3 py-1.5 rounded-lg flex gap-1.5 items-center border border-white/5 transition-all"
                                    >
                                      <MessageSquare size={11} className="text-blue-400" />
                                      Ask AI
                                    </button>
                                  </div>
                                )}

                                {/* Resources */}
                                {milestone.resources && milestone.resources.length > 0 && !isLocked && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {milestone.resources.map((res: any, rId: number) => {
                                      const isViewed = milestone.progress?.resourcesViewed?.includes(res.id || res.url);
                                      return (
                                        <a
                                          key={rId}
                                          href={res.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => trackResourceView(milestone, res.id || res.url)}
                                          className={`flex items-center gap-2.5 border p-2.5 rounded-xl transition-all group/link text-xs ${
                                            isViewed
                                              ? 'bg-blue-900/10 border-blue-500/20 text-blue-300'
                                              : 'bg-white/3 hover:bg-white/6 border-white/5 hover:border-white/15 text-gray-400 hover:text-white'
                                          }`}
                                        >
                                          {res.type === 'YOUTUBE' && <Video size={13} className="text-red-500 shrink-0" />}
                                          {res.type === 'GITHUB' && <Code size={13} className="text-purple-500 shrink-0" />}
                                          {res.type === 'INTERACTIVE' && <Play size={13} className="text-green-500 shrink-0" />}
                                          {res.type === 'ARTICLE' && <BookOpen size={13} className="text-blue-500 shrink-0" />}
                                          {!['YOUTUBE', 'GITHUB', 'INTERACTIVE', 'ARTICLE'].includes(res.type) && (
                                            <ExternalLink size={13} className="text-gray-500 shrink-0" />
                                          )}
                                          <span className="flex-1 truncate font-medium">{res.title}</span>
                                          {isViewed ? (
                                            <CheckCircle size={11} className="text-blue-500 shrink-0" />
                                          ) : (
                                            <ChevronRight size={11} className="text-gray-600 group-hover/link:text-white shrink-0 transition-colors" />
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
          </div>
        </div>

        {/* ── NEURAL MENTOR SIDEBAR ── */}
        <div
          className={`fixed inset-y-0 right-0 w-full sm:w-[440px] xl:w-[500px] bg-[#0a0a0a] border-l border-white/8 transform transition-transform duration-300 ease-in-out shadow-2xl z-40 flex flex-col top-16 ${
            activeMilestone ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className="px-5 py-4 border-b border-white/8 flex justify-between items-center bg-gradient-to-r from-blue-600/8 to-purple-600/5 shrink-0">
            <div className="min-w-0">
              <h3 className="font-black text-white flex items-center gap-2 text-sm">
                <div className="w-6 h-6 bg-blue-500/15 rounded-lg flex items-center justify-center">
                  <Sparkles size={13} className="text-blue-400" />
                </div>
                Neural Mentor
              </h3>
              <p className="text-[11px] text-gray-600 truncate mt-0.5 max-w-[280px]">
                {activeMilestone?.title}
              </p>
            </div>
            <button
              onClick={() => dispatch(closeMentor())}
              className="w-8 h-8 rounded-xl bg-white/4 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat History */}
          <div
            className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar"
            ref={chatScrollRef}
          >
            {/* Welcome Screen */}
            {showWelcome && chatHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-3xl flex items-center justify-center border border-white/5">
                  <Brain size={28} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-black text-white text-base mb-2">Ready to Master This?</h4>
                  <p className="text-gray-600 text-xs max-w-[220px] mx-auto leading-relaxed">
                    I can explain concepts, quiz you, or answer questions about this milestone.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-[260px]">
                  <button
                    onClick={() => handleAskMentor('explain')}
                    className="bg-white/4 hover:bg-yellow-500/10 border border-white/8 hover:border-yellow-500/25 p-4 rounded-2xl transition-all text-xs flex flex-col items-center gap-2 group"
                  >
                    <Sparkles size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-gray-300 group-hover:text-yellow-300 transition-colors">Explain</span>
                    <span className="text-[10px] text-gray-600">Deep dive</span>
                  </button>
                  <button
                    onClick={() => handleAskMentor('quiz')}
                    className="bg-white/4 hover:bg-green-500/10 border border-white/8 hover:border-green-500/25 p-4 rounded-2xl transition-all text-xs flex flex-col items-center gap-2 group"
                  >
                    <GraduationCap size={20} className="text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-gray-300 group-hover:text-green-300 transition-colors">Quiz Me</span>
                    <span className="text-[10px] text-gray-600">+25 XP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[95%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-[#141414] text-gray-300 border border-white/6 rounded-bl-sm'
                  }`}
                >
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
                          h1: ({ children }) => (
                            <h1 className="text-base font-black text-white mb-2 pb-1 border-b border-white/10">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-sm font-black text-white mb-2 mt-4">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xs font-black text-blue-400 mb-1 mt-3 uppercase tracking-wide">{children}</h3>
                          ),
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="pl-1">{children}</li>,
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="rounded-xl overflow-hidden my-3 border border-white/8 shadow-xl">
                                <div className="bg-[#1a1a1a] px-3 py-1.5 text-[9px] text-gray-500 border-b border-white/5 font-mono flex justify-between">
                                  <span>{match[1].toUpperCase()}</span>
                                </div>
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0, padding: '0.875rem', background: '#0d0d0d', fontSize: '11px', lineHeight: '1.5' }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs border border-blue-500/15" {...props}>
                                {children}
                              </code>
                            );
                          },
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

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-[#141414] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-3 border border-white/6">
                  <Brain className="text-blue-400 animate-pulse" size={16} />
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/8 bg-[#080808] shrink-0">
            {/* Quick action pills */}
            {chatHistory.length > 0 && !isStreaming && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  { label: '💡 Explain more', mode: 'explain' as const },
                  { label: '🎲 Quiz me', mode: 'quiz' as const },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    onClick={() => handleAskMentor(pill.mode)}
                    className="shrink-0 text-[11px] text-gray-500 hover:text-white bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/15 px-3 py-1.5 rounded-full transition-all"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                className="w-full bg-[#141414] border border-white/8 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-700"
                placeholder="Ask anything about this topic…"
                value={chatInput}
                onChange={(e) => dispatch(setChatInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isStreaming) handleAskMentor('chat');
                }}
                disabled={isStreaming}
              />
              <button
                onClick={() => handleAskMentor('chat')}
                disabled={isStreaming || !chatInput.trim()}
                className="absolute right-2 top-2 bottom-2 w-9 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACHIEVEMENTS MODAL ── */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/8 rounded-3xl max-w-xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/8 flex justify-between items-center">
              <h2 className="font-black flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} />
                Achievements Gallery
              </h2>
              <button
                onClick={() => dispatch(setShowAchievements(false))}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 custom-scrollbar">
              {(userProgress?.achievements?.length || 0) === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-600">
                  <Award size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold">No badges yet.</p>
                  <p className="text-xs mt-1">Complete milestones to earn badges!</p>
                </div>
              ) : (
                userProgress?.achievements?.map((badge, i) => (
                  <div
                    key={i}
                    className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-yellow-500/20 transition-all"
                  >
                    <div className="text-3xl mb-1">{badge.badgeIcon}</div>
                    <h3 className="font-black text-white text-xs">{badge.badgeName}</h3>
                    <p className="text-[10px] text-gray-600 leading-relaxed">{badge.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}