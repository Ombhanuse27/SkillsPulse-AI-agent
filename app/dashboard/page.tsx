"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
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
  BookOpen, Zap, Brain, Trophy, Flame, Target, Lock, Clock, Award,
  FileText, Menu, Home, ChevronDown, Cpu, ClipboardList,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setUser, clearUser } from '@/store/slices/userSlice';
import { loadRoadmaps, generateRoadmap, setGoal } from '@/store/slices/roadmapSlice';
import { loadUserProgress, performProgressAction, setShowAchievements } from '@/store/slices/progressSlice';
import {
  openMilestone, closeMentor, setChatInput, setIsStreaming, setIsThinking,
  setShowWelcome, appendChatMessage, updateLastAiMessage, setQuizAnswer, setActiveMilestone,
} from '@/store/slices/mentorSlice';
import type { ChatMessage } from '@/store/slices/mentorSlice';

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
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

const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/dashboard',        icon: Home,     color: 'text-blue-400',   },
  { label: 'Career Architect', href: '/dashboard',        icon: Map,      color: 'text-green-400',  },
  { label: 'Resume Audit',     href: '/resume-analyzer',  icon: FileText, color: 'text-sky-400',    },
  { label: 'AI Interviewer',   href: '/interview-prep',   icon: Brain,    color: 'text-purple-400', },
];

// ─── MISSION XP COST ────────────────────────────────────────────────────────────
const MISSION_XP_COST = 100;

// ─── GRADE CONFIG ──────────────────────────────────────────────────────────────
const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; desc: string }> = {
  S: { label: 'S', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', desc: 'Perfect Score! Master Level 🏆' },
  A: { label: 'A', color: 'text-green-300',  bg: 'bg-green-500/15',  border: 'border-green-500/40',  desc: 'Excellent! You nailed it 🎯' },
  B: { label: 'B', color: 'text-blue-300',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40',   desc: 'Good Job! Solid understanding 👍' },
  C: { label: 'C', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/40', desc: 'Needs Review — revisit the topic 📖' },
  F: { label: 'F', color: 'text-red-300',    bg: 'bg-red-500/15',    border: 'border-red-500/40',    desc: 'Keep Studying — you got this 💪' },
};

function getGrade(score: number, total: number): string {
  const r = score / total;
  if (r === 1) return 'S';
  if (r >= 0.8) return 'A';
  if (r >= 0.6) return 'B';
  if (r >= 0.4) return 'C';
  return 'F';
}

function getTestXP(score: number, total: number): number {
  const r = score / total;
  if (r === 1) return 100;
  if (r >= 0.8) return 75;
  if (r >= 0.6) return 50;
  if (r >= 0.4) return 25;
  return 10;
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ user, onLogout, progress }: { user: any; onLogout: () => void; progress?: UserProgress; }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 shadow-xl' : 'bg-transparent'}`}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tighter group shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/60 transition-shadow">
              <Cpu size={16} className="text-white" />
            </div>
            <span className="hidden sm:inline">Skill<span className="text-blue-500">Pulse</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href && item.href === '/dashboard';
              return (
                <Link key={item.label} href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isCurrent ? `bg-white/10 ${item.color}` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            {progress?.stats && (
              <div className="hidden lg:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 text-xs font-bold text-blue-400">
                <Zap size={12} className="animate-pulse" />
                {progress.stats.totalXP.toLocaleString()} XP
              </div>
            )}
            {progress?.stats?.currentStreak ? (
              <div className="hidden sm:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-bold text-orange-400">
                <Flame size={12} />
                {progress.stats.currentStreak}d
              </div>
            ) : null}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button onClick={onLogout} className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
              <LogOut size={14} />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400">
              <Menu size={18} />
            </button>
          </div>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 border-t border-white/5 bg-[#0a0a0a]/95 backdrop-blur-xl ${mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all ${item.color}`}>
                  <Icon size={16} />{item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-white/5">
              <button onClick={onLogout} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <LogOut size={16} />Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="h-16" />
    </>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ progress, onShowAchievements }: { progress: UserProgress; onShowAchievements: () => void; }) {
  if (!progress?.stats) return null;
  const { stats, dailyGoal } = progress;
  const xpPercentage = ((stats.nextLevelXP - stats.xpToNextLevel) / stats.nextLevelXP) * 100;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
      <div className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-blue-500/30 transition-all duration-300 cursor-default">
        <div className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent transition-all duration-1000 rounded-full" style={{ width: `${xpPercentage}%` }} />
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/5 rounded-full group-hover:bg-blue-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Level {stats.level}</p>
            <h3 className="text-xl font-black text-white mt-1 tabular-nums">{stats.totalXP.toLocaleString()}<span className="text-xs text-blue-400 font-bold ml-1">XP</span></h3>
          </div>
          <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all"><Zap size={18} /></div>
        </div>
        <div className="mt-3 w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">{stats.xpToNextLevel} XP to Level {stats.level + 1}</p>
      </div>
      <div className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-orange-500/30 transition-all duration-300 cursor-default">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-orange-500/5 rounded-full group-hover:bg-orange-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Day Streak</p>
            <h3 className="text-xl font-black text-white mt-1 tabular-nums">{stats.currentStreak}<span className="ml-1">🔥</span></h3>
          </div>
          <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 group-hover:scale-110 transition-all"><Flame size={18} /></div>
        </div>
        <p className="text-[10px] text-gray-600 mt-3">Keep it going!</p>
      </div>
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
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 group-hover:bg-green-500/20 group-hover:scale-110 transition-all"><Target size={18} /></div>
        </div>
        <div className="mt-3 w-full bg-white/5 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-700" style={{ width: `${dailyGoal?.progressPercentage || 0}%` }} />
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">{dailyGoal?.progressPercentage || 0}% complete today</p>
      </div>
      <button onClick={onShowAchievements} className="group bg-[#0d0d0d] border border-white/8 p-4 rounded-2xl relative overflow-hidden hover:border-yellow-500/30 transition-all duration-300 text-left">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-yellow-500/5 rounded-full group-hover:bg-yellow-500/10 transition-colors" />
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Badges</p>
            <h3 className="text-xl font-black text-white mt-1 group-hover:text-yellow-400 transition-colors tabular-nums">{progress.achievements?.length || 0}</h3>
          </div>
          <div className="w-9 h-9 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all"><Trophy size={18} /></div>
        </div>
        <p className="text-[10px] text-gray-500 mt-3 flex items-center gap-1 group-hover:text-yellow-400 transition-colors">View Gallery <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" /></p>
      </button>
    </div>
  );
}

function AgentCards() {
  const agents = [
    { href: '/resume-analyzer', icon: FileText, label: 'Resume Audit', sub: 'Upload & optimize', from: 'from-sky-500/10', border: 'hover:border-sky-500/40', text: 'text-sky-400', glow: 'shadow-sky-500/20' },
    { href: '/interview-prep', icon: Brain, label: 'AI Interviewer', sub: 'Mock interviews', from: 'from-purple-500/10', border: 'hover:border-purple-500/40', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  ];
  return (
    <div className="flex gap-3 mb-8 flex-wrap">
      {agents.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.href} href={a.href} className={`flex items-center gap-3 bg-[#0d0d0d] border border-white/8 ${a.border} rounded-2xl px-4 py-3 transition-all duration-300 group hover:shadow-lg ${a.glow}`}>
            <div className={`w-8 h-8 bg-gradient-to-br ${a.from} to-transparent rounded-xl flex items-center justify-center ${a.text} group-hover:scale-110 transition-transform`}><Icon size={16} /></div>
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

// ─── INLINE QUIZ (Neural Mentor) ──────────────────────────────────────────────
function InteractiveQuiz({ quiz, userAnswer, onAnswer }: { quiz: QuizData; userAnswer?: number; onAnswer: (index: number) => void; }) {
  const answered = userAnswer !== undefined;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-400 mb-3"><GraduationCap size={20} /><h4 className="font-bold">Knowledge Check</h4></div>
      <p className="text-white font-medium mb-4">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((option, index) => {
          const isCorrect = index === quiz.correctIndex;
          const isUserChoice = index === userAnswer;
          let bgClass = 'bg-white/5 hover:bg-white/10';
          let borderClass = 'border-white/10';
          let textClass = 'text-gray-300';
          if (answered) {
            if (isCorrect) { bgClass = 'bg-green-500/20'; borderClass = 'border-green-500'; textClass = 'text-green-300'; }
            else if (isUserChoice && !isCorrect) { bgClass = 'bg-red-500/20'; borderClass = 'border-red-500'; textClass = 'text-red-300'; }
          }
          return (
            <button key={index} onClick={() => !answered && onAnswer(index)} disabled={answered} className={`w-full text-left p-3 rounded-xl border transition-all ${bgClass} ${borderClass} ${answered ? 'cursor-default' : 'cursor-pointer'}`}>
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
          <p className="text-sm text-blue-300"><strong>Explanation:</strong> {quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}

// ─── CIRCULAR PROGRESS RING ───────────────────────────────────────────────────
function ProgressRing({ pct, size = 44, stroke = 3, color = '#3b82f6' }: { pct: number; size?: number; stroke?: number; color?: string; }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') return <span className="text-[9px] font-black uppercase tracking-widest bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full">Done</span>;
  if (status === 'in_progress') return <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse inline-block" />Active</span>;
  return null;
}

// ─── ★ TEST MODAL ─────────────────────────────────────────────────────────────
function TestModal({
  milestone,
  onClose,
  onComplete,
}: {
  milestone: any;
  onClose: () => void;
  onComplete: (score: number, total: number, answers: any[]) => void;
}) {
  const [phase, setPhase] = useState<'loading' | 'questions' | 'results'>('loading');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState('');

  // Computed results
  const score = selectedAnswers.filter((a, i) => questions[i] && a === questions[i].correctIndex).length;
  const grade = questions.length > 0 ? getGrade(score, questions.length) : 'F';
  const gradeConfig = GRADE_CONFIG[grade];
  const xpEarned = questions.length > 0 ? getTestXP(score, questions.length) : 0;

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/generate-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            milestoneTitle: milestone.title,
            milestoneDescription: milestone.description,
          }),
        });
        const data = await res.json();
        if (!data.success || !data.questions?.length) throw new Error('No questions returned');
        setQuestions(data.questions);
        setSelectedAnswers(new Array(data.questions.length).fill(null));
        setPhase('questions');
      } catch (e) {
        setError('Failed to generate test. Please try again.');
        setPhase('questions');
      }
    };
    fetchQuestions();
  }, [milestone.id]);

  const handleSelect = (optionIdx: number) => {
    if (selectedAnswers[currentQ] !== null) return; // already answered
    const updated = [...selectedAnswers];
    updated[currentQ] = optionIdx;
    setSelectedAnswers(updated);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setPhase('results');
      // Build answers array
      const answers = questions.map((q, i) => ({
        questionIndex: i,
        selectedIndex: selectedAnswers[i] ?? -1,
        correctIndex: q.correctIndex,
        isCorrect: selectedAnswers[i] === q.correctIndex,
      }));
      onComplete(score, questions.length, answers);
    }
  };

  const difficultyColor = (d: string) =>
    d === 'easy' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
    d === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
    'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    // Overlay — uses min-height trick (no position:fixed) for iframe compat
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-600/8 to-blue-600/5">
          <div className="min-w-0">
            <h2 className="font-black text-white flex items-center gap-2 text-sm">
              <div className="w-6 h-6 bg-purple-500/15 rounded-lg flex items-center justify-center"><ClipboardList size={13} className="text-purple-400" /></div>
              Milestone Test
            </h2>
            <p className="text-[11px] text-gray-500 truncate mt-0.5 max-w-[380px]">{milestone.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/4 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all shrink-0"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ── LOADING ── */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                <Loader2 size={24} className="text-purple-400 animate-spin" />
              </div>
              <p className="text-gray-400 text-sm font-bold">Generating your personalised test…</p>
              <p className="text-gray-600 text-xs">5 questions tailored to this milestone</p>
            </div>
          )}

          {/* ── QUESTIONS ── */}
          {phase === 'questions' && questions.length > 0 && (
            <div className="p-6">
              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-1.5">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i < currentQ ? 'w-6 bg-green-500' :
                        i === currentQ ? 'w-8 bg-blue-500' :
                        'w-4 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-gray-600 shrink-0">Q{currentQ + 1} of {questions.length}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${difficultyColor(questions[currentQ]?.difficulty || 'easy')}`}>
                  {questions[currentQ]?.difficulty}
                </span>
              </div>

              {/* Question */}
              <p className="text-white font-bold text-base leading-relaxed mb-5">
                {questions[currentQ]?.question}
              </p>

              {/* Options */}
              <div className="space-y-2.5">
                {questions[currentQ]?.options.map((opt, idx) => {
                  const answered = selectedAnswers[currentQ] !== null;
                  const isSelected = selectedAnswers[currentQ] === idx;
                  const isCorrect = idx === questions[currentQ].correctIndex;

                  let cls = 'bg-white/4 border-white/8 text-gray-300 hover:bg-white/8 hover:border-white/20 cursor-pointer';
                  if (answered) {
                    if (isCorrect) cls = 'bg-green-500/20 border-green-500/60 text-green-200 cursor-default';
                    else if (isSelected) cls = 'bg-red-500/20 border-red-500/60 text-red-200 cursor-default';
                    else cls = 'bg-white/2 border-white/5 text-gray-600 cursor-default opacity-50';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={selectedAnswers[currentQ] !== null}
                      className={`w-full text-left px-4 py-3 rounded-2xl border transition-all duration-200 ${cls}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                          answered && isCorrect ? 'bg-green-500 text-black' :
                          answered && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                          'bg-white/8 text-gray-400'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm leading-relaxed">{opt}</span>
                        {answered && isCorrect && <CheckCircle size={15} className="ml-auto text-green-400 shrink-0" />}
                        {answered && isSelected && !isCorrect && <X size={15} className="ml-auto text-red-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && selectedAnswers[currentQ] !== null && (
                <div className={`mt-4 p-4 rounded-2xl border ${
                  selectedAnswers[currentQ] === questions[currentQ].correctIndex
                    ? 'bg-green-500/8 border-green-500/25'
                    : 'bg-orange-500/8 border-orange-500/25'
                }`}>
                  <p className="text-xs font-bold mb-1 text-white">
                    {selectedAnswers[currentQ] === questions[currentQ].correctIndex ? '✓ Correct!' : '✗ Not quite'}
                  </p>
                  <p className="text-[12px] text-gray-400 leading-relaxed">{questions[currentQ].explanation}</p>
                </div>
              )}

              {/* Next / Submit */}
              {selectedAnswers[currentQ] !== null && (
                <button
                  onClick={handleNext}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm"
                >
                  {currentQ < questions.length - 1 ? (
                    <><ChevronRight size={16} />Next Question</>
                  ) : (
                    <><Trophy size={16} />Submit Test</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error state */}
          {phase === 'questions' && questions.length === 0 && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                <X size={20} className="text-red-400" />
              </div>
              <p className="text-gray-400 text-sm">{error}</p>
              <button onClick={onClose} className="text-xs text-blue-400 hover:text-blue-300">Close</button>
            </div>
          )}

          {/* ── RESULTS ── */}
          {phase === 'results' && (
            <div className="p-6">
              {/* Score card */}
              <div className={`rounded-3xl border p-6 text-center mb-6 ${gradeConfig.bg} ${gradeConfig.border}`}>
                <div className={`text-7xl font-black mb-2 ${gradeConfig.color}`}>{gradeConfig.label}</div>
                <p className={`text-sm font-bold mb-1 ${gradeConfig.color}`}>{gradeConfig.desc}</p>
                <p className="text-gray-500 text-xs">{score}/{questions.length} correct answers</p>

                {/* XP badge */}
                <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1.5 text-xs font-bold text-blue-400">
                  <Zap size={12} />+{xpEarned} XP earned
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="space-y-2 mb-6">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">Question Breakdown</p>
                {questions.map((q, i) => {
                  const isCorrect = selectedAnswers[i] === q.correctIndex;
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isCorrect ? 'bg-green-500/6 border-green-500/20' : 'bg-red-500/6 border-red-500/20'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                        {isCorrect ? <CheckCircle size={11} className="text-black" /> : <X size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium leading-relaxed">{q.question}</p>
                        {!isCorrect && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Correct: <span className="text-green-400">{q.options[q.correctIndex]}</span>
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                        q.difficulty === 'easy' ? 'bg-green-500/15 text-green-400' :
                        q.difficulty === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>{q.difficulty}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl transition-all text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ROADMAP CARD (ACCORDION) ─────────────────────────────────────────────────
function RoadmapCard({
  map, isExpanded, onToggle, onMilestoneClick, onStartMilestone, onCompleteMilestone,
  onTrackResource, onAskMentor, onOpenTest, isDailyCourse,
}: {
  map: any; isExpanded: boolean; onToggle: () => void;
  onMilestoneClick: (m: any) => void; onStartMilestone: (m: any) => void;
  onCompleteMilestone: (m: any) => void; onTrackResource: (m: any, id: string) => void;
  onAskMentor: (mode: 'chat' | 'explain' | 'quiz', m?: any) => void;
  onOpenTest: (m: any) => void;
  isDailyCourse: boolean;
}) {
  const completedCount = map.milestones.filter((m: any) => m.progress?.status === 'completed').length;
  const pct = map.completionPercentage;
  const inProgressCount = map.milestones.filter((m: any) => m.progress?.status === 'in_progress').length;

  return (
    <div className={`bg-[#0a0a0a] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-white/15 shadow-xl shadow-black/30' : 'border-white/8 hover:border-white/12'}`}>
      {/* Header */}
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center gap-4 text-left group">
        <div className="relative shrink-0">
          <ProgressRing pct={pct} size={44} stroke={3} color={pct === 100 ? '#22c55e' : '#3b82f6'} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-300">{pct}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors truncate">{map.title}</h3>
            {isDailyCourse && <span className="shrink-0 text-[9px] bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Intensive</span>}
            {pct === 100 && <span className="shrink-0 text-[9px] bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full uppercase tracking-widest font-black flex items-center gap-1"><Trophy size={9} />Done</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[11px] text-gray-600">{completedCount}/{map.milestones.length} milestones</span>
            {inProgressCount > 0 && <span className="text-[11px] text-blue-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />{inProgressCount} in progress</span>}
          </div>
          <div className="mt-2 w-full max-w-[200px] bg-white/5 h-1 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {!isExpanded && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {map.milestones.slice(0, 5).map((m: any, i: number) => {
              const s = m.progress?.status || 'not_started';
              return <div key={i} className={`w-2 h-2 rounded-full transition-all ${s === 'completed' ? 'bg-green-500' : s === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} />;
            })}
            {map.milestones.length > 5 && <span className="text-[10px] text-gray-600">+{map.milestones.length - 5}</span>}
          </div>
        )}
        <div className={`shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-white group-hover:bg-white/10 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={14} />
        </div>
      </button>

      {/* Body */}
      <div className={`overflow-hidden transition-all duration-400 ease-in-out ${isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-white/5 px-5 pb-5 pt-4 relative before:absolute before:left-[1.625rem] before:top-0 before:bottom-5 before:w-px before:bg-gradient-to-b before:from-white/8 before:to-transparent">
          {map.milestones.map((milestone: any, idx: number) => {
            const status = milestone.progress?.status || 'not_started';
            const isLocked = idx > 0 && map.milestones[idx - 1].progress?.status !== 'completed';
            const isLast = idx === map.milestones.length - 1;

            return (
              <div key={idx} className={`relative pl-10 transition-all duration-300 ${isLocked ? 'opacity-35' : 'opacity-100'} ${isLast ? '' : 'pb-6'}`}>
                {/* Node */}
                <div
                  onClick={() => !isLocked && onMilestoneClick(milestone)}
                  className={`absolute left-0 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-black z-10 transition-all duration-200 ${
                    status === 'completed' ? 'bg-green-500 border-green-400 text-black shadow-lg shadow-green-500/30' :
                    status === 'in_progress' ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/30 animate-pulse' :
                    isLocked ? 'bg-[#111] border-white/8 text-gray-700' :
                    'bg-[#111] border-gray-700 hover:border-blue-500 hover:bg-blue-500/10'
                  } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {status === 'completed' ? <CheckCircle size={11} /> : isLocked ? <Lock size={9} /> : status === 'in_progress' ? <Play size={8} fill="currentColor" /> : <span>{idx + 1}</span>}
                </div>

                {/* Content */}
                <div className={`group/ms ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => !isLocked && onMilestoneClick(milestone)}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-bold text-sm transition-colors ${!isLocked ? 'group-hover/ms:text-blue-400' : ''} ${status === 'completed' ? 'text-gray-400 line-through decoration-gray-600' : 'text-white'}`}>
                          {milestone.title}
                        </h4>
                        <StatusPill status={status} />
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">{milestone.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-600">
                        <Clock size={9} />
                        <span>{isDailyCourse ? `Day ${idx + 1}` : `Week ${milestone.week || idx + 1}`}</span>
                        <span className="text-white/10">·</span>
                        <span>{milestone.estimatedHours}h est.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action strip */}
                {!isLocked && (
                  <div className="flex gap-2 mt-2.5 flex-wrap items-center" onClick={(e) => e.stopPropagation()}>
                    {status === 'not_started' && (
                      <button onClick={() => onStartMilestone(milestone)} className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
                        <Play size={9} fill="currentColor" />Start
                      </button>
                    )}
                    {status === 'in_progress' && (
                      <button onClick={() => onCompleteMilestone(milestone)} className="text-[11px] bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-green-500/20">
                        <CheckCircle size={9} />Mark Done
                      </button>
                    )}
                    <div className="w-px h-4 bg-white/8" />
                    <button onClick={() => onAskMentor('explain', milestone)} className="text-[11px] bg-white/4 hover:bg-yellow-500/10 hover:text-yellow-300 hover:border-yellow-500/20 px-2.5 py-1.5 rounded-lg flex gap-1.5 items-center border border-white/5 transition-all">
                      <Sparkles size={10} className="text-yellow-400" />Explain
                    </button>
                    <button onClick={() => onAskMentor('quiz', milestone)} className="text-[11px] bg-white/4 hover:bg-green-500/10 hover:text-green-300 hover:border-green-500/20 px-2.5 py-1.5 rounded-lg flex gap-1.5 items-center border border-white/5 transition-all">
                      <GraduationCap size={10} className="text-green-400" />Quiz
                    </button>
                    <button onClick={() => onMilestoneClick(milestone)} className="text-[11px] bg-white/4 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/20 px-2.5 py-1.5 rounded-lg flex gap-1.5 items-center border border-white/5 transition-all">
                      <MessageSquare size={10} className="text-blue-400" />Ask AI
                    </button>
                    {/* ── NEW: Test button ── */}
                    <button
                      onClick={() => onOpenTest(milestone)}
                      className="text-[11px] bg-purple-500/8 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 hover:border-purple-500/30 px-2.5 py-1.5 rounded-lg flex gap-1.5 items-center border border-purple-500/15 transition-all font-bold"
                    >
                      <ClipboardList size={10} />Test
                    </button>
                  </div>
                )}

                {/* Resources */}
                {milestone.resources && milestone.resources.length > 0 && !isLocked && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
                    {milestone.resources.map((res: any, rId: number) => {
                      const isViewed = milestone.progress?.resourcesViewed?.includes(res.id || res.url);
                      return (
                        <a key={rId} href={res.url} target="_blank" rel="noopener noreferrer" onClick={() => onTrackResource(milestone, res.id || res.url)}
                          className={`flex items-center gap-2.5 border p-2.5 rounded-xl transition-all group/link text-xs ${isViewed ? 'bg-blue-900/10 border-blue-500/20 text-blue-300' : 'bg-white/2 hover:bg-white/5 border-white/5 hover:border-white/12 text-gray-400 hover:text-white'}`}
                        >
                          {res.type === 'YOUTUBE' && <Video size={12} className="text-red-500 shrink-0" />}
                          {res.type === 'GITHUB' && <Code size={12} className="text-purple-500 shrink-0" />}
                          {res.type === 'INTERACTIVE' && <Play size={12} className="text-green-500 shrink-0" />}
                          {res.type === 'ARTICLE' && <BookOpen size={12} className="text-blue-500 shrink-0" />}
                          {!['YOUTUBE', 'GITHUB', 'INTERACTIVE', 'ARTICLE'].includes(res.type) && <ExternalLink size={12} className="text-gray-500 shrink-0" />}
                          <span className="flex-1 truncate font-medium text-[11px]">{res.title}</span>
                          {isViewed ? <CheckCircle size={10} className="text-blue-500 shrink-0" /> : <ChevronRight size={10} className="text-gray-600 group-hover/link:text-white shrink-0 transition-colors" />}
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
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const supabase = createClient();
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [inputFocused, setInputFocused] = useState(false);
  const [expandedRoadmaps, setExpandedRoadmaps] = useState<Set<string>>(new Set());

  // ── NEW: Test modal state ──
  const [testMilestone, setTestMilestone] = useState<any | null>(null);

  // ── NEW: XP gate state ──
  const [showXpGate, setShowXpGate] = useState(false);
  const [xpGateError, setXpGateError] = useState('');

  const user = useAppSelector((s) => s.user.user);
  const { roadmaps, goal, loading } = useAppSelector((s) => s.roadmap);
  const { userProgress, showAchievements } = useAppSelector((s) => s.progress);
  const { activeMilestone, chatHistory, chatInput, isStreaming, isThinking, showWelcome } = useAppSelector((s) => s.mentor);

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

  useEffect(() => {
    if (roadmaps.length > 0) setExpandedRoadmaps(new Set([roadmaps[0].id]));
  }, [roadmaps.length]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory, isStreaming, isThinking]);

  useEffect(() => {
    if (activeMilestone) dispatch(setShowWelcome(chatHistory.length === 0));
  }, [activeMilestone, chatHistory]);

  const toggleRoadmap = (id: string) => {
    setExpandedRoadmaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── PROGRESS ACTIONS ──
  const handleProgressAction = async (action: string, data: any) => {
    if (!user) return;
    try {
      const result = await dispatch(performProgressAction({ action, userId: user.id, data })).unwrap();
      dispatch(loadRoadmaps(user.id));
      return result?.result;
    } catch (e) { console.error('Progress update failed', e); }
  };

  // ── XP GATE: check if mission requires XP ──
  const isMissionFree = roadmaps.length === 0;
  const canAffordMission = (userProgress?.stats?.totalXP ?? 0) >= MISSION_XP_COST;

  // ── GENERATE ROADMAP WITH XP GATE ──
  const handleGenerate = async () => {
    if (!goal.trim() || !user) return;

    // First mission is always free
    if (!isMissionFree && !canAffordMission) {
      setXpGateError(`You need ${MISSION_XP_COST} XP to start a new mission. Earn more XP by completing milestones, quizzes, and daily goals!`);
      setShowXpGate(true);
      return;
    }

    // Confirm XP spend (not for first mission)
    if (!isMissionFree) {
      setShowXpGate(true);
      setXpGateError('');
      return;
    }

    await executeGenerate();
  };

  const executeGenerate = async () => {
    setShowXpGate(false);
    if (!goal.trim() || !user) return;

    try {
      // Deduct XP for non-first missions
      if (!isMissionFree) {
        const deductResult = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deduct_xp', userId: user.id, data: { amount: MISSION_XP_COST } }),
        });
        const deductData = await deductResult.json();
        if (!deductData.success) {
          alert(deductData.error || 'Failed to deduct XP');
          return;
        }
        // Refresh progress to reflect new XP
        dispatch(loadUserProgress(user.id));
      }

      const result = await dispatch(generateRoadmap({ goal, userId: user.id })).unwrap();
      if (result?.id) setExpandedRoadmaps((prev) => new Set([...prev, result.id]));
    } catch {
      alert('Failed to generate roadmap. Please try again.');
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
    await handleProgressAction('mark_resource_viewed', { milestoneId: milestone.id, resourceId });
  };

  // ── NEW: Test handlers ──
  const handleOpenTest = (milestone: any) => setTestMilestone(milestone);
  const handleCloseTest = () => setTestMilestone(null);

  const handleTestComplete = async (score: number, total: number, answers: any[]) => {
    if (!user || !testMilestone) return;
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_test',
          userId: user.id,
          data: {
            milestoneId: testMilestone.id,
            milestoneTitle: testMilestone.title,
            score,
            total,
            answers,
          },
        }),
      });
      dispatch(loadUserProgress(user.id));
    } catch (e) {
      console.error('Test submit failed', e);
    }
  };

  const handleAskMentor = async (mode: 'chat' | 'explain' | 'quiz', milestoneOverride?: any, text?: string) => {
    const targetMilestone = milestoneOverride || activeMilestone;
    if (!targetMilestone) return;
    if (milestoneOverride && milestoneOverride.id !== activeMilestone?.id) dispatch(openMilestone(milestoneOverride));
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
    const historyForAPI = [...chatHistory, newUserMessage].map((msg) => ({ role: msg.role, text: msg.text || '' }));
    try {
      const response = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg || `Generate a ${mode} for this topic`, context: `${targetMilestone.title}: ${targetMilestone.description}`, mode, chatHistory: historyForAPI }),
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
            if (parsed.type === 'thinking') { dispatch(setIsThinking(true)); }
            else if (parsed.type === 'content') {
              dispatch(setIsThinking(false));
              if (!messageAdded) { dispatch(appendChatMessage({ role: 'ai', text: '' })); messageAdded = true; }
            } else if (parsed.type === 'data') {
              dispatch(setIsThinking(false));
              if (!messageAdded) { dispatch(appendChatMessage({ role: 'ai', text: '' })); messageAdded = true; }
              currentAiText += parsed.content;
              dispatch(updateLastAiMessage(currentAiText));
            } else if (parsed.type === 'quiz') {
              dispatch(setIsThinking(false));
              dispatch(appendChatMessage({ role: 'ai', quiz: parsed.data }));
              messageAdded = true;
            }
          } catch (e) { console.error('Parse error:', e); }
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
      if (isCorrect) await handleProgressAction('submit_quiz_manual', { xp: 25 });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(clearUser());
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse"><Cpu size={20} className="text-white" /></div>
          <Loader2 className="animate-spin text-blue-400" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/8 rounded-full blur-[150px]" />
      </div>

      <Navbar user={user} onLogout={handleLogout} progress={userProgress} />

      <div className="relative z-10 flex min-h-[calc(100vh-64px)]">
        <div className={`flex-1 transition-all duration-300 ease-in-out ${activeMilestone ? 'xl:mr-[500px]' : ''}`}>
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Learning <span className="text-blue-500">Dashboard</span></h1>
              <p className="text-gray-500 text-sm mt-1">
                Welcome back, <span className="text-gray-300">{user?.email?.split('@')[0]}</span> —
                {userProgress?.stats?.currentStreak ? ` you're on a ${userProgress.stats.currentStreak}-day streak! 🔥` : " let's build something great today."}
              </p>
            </div>

            <AgentCards />
            {userProgress && <StatsBar progress={userProgress} onShowAchievements={() => dispatch(setShowAchievements(true))} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT — MISSION INPUT */}
              <div className="lg:col-span-4">
                <div className={`bg-[#0a0a0a] border rounded-3xl p-6 sticky top-24 transition-all duration-300 ${inputFocused ? 'border-blue-500/50 shadow-xl shadow-blue-500/10' : 'border-white/8 hover:border-white/15'}`}>
                  <h2 className="text-xl font-black mb-1 flex items-center gap-2">
                    <div className="w-7 h-7 bg-yellow-500/10 rounded-lg flex items-center justify-center"><Zap size={16} className="text-yellow-500" /></div>
                    New Mission
                  </h2>
                  <p className="text-gray-500 text-xs mb-1 leading-relaxed">
                    What do you want to master?{' '}
                    <span className="text-blue-400 font-medium">Try: "React in 3 days" or "Learn DevOps"</span>
                  </p>

                  {/* ── XP COST BADGE ── */}
                  {!isMissionFree && (
                    <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border mb-3 ${
                      canAffordMission
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      <Zap size={10} />
                      {canAffordMission
                        ? `Costs ${MISSION_XP_COST} XP · You have ${userProgress?.stats?.totalXP ?? 0} XP`
                        : `Need ${MISSION_XP_COST} XP · You have ${userProgress?.stats?.totalXP ?? 0} XP`}
                    </div>
                  )}
                  {isMissionFree && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-500/20 bg-green-500/8 text-green-400 mb-3">
                      <Sparkles size={10} />First mission is FREE!
                    </div>
                  )}

                  <textarea
                    className="w-full bg-white/4 border border-white/8 rounded-2xl p-4 text-white text-sm min-h-[120px] focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/3 mb-4 transition-all resize-none placeholder:text-gray-600"
                    placeholder="e.g., Master System Design in 30 days..."
                    value={goal}
                    onChange={(e) => dispatch(setGoal(e.target.value))}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                  />

                  <button
                    onClick={handleGenerate}
                    disabled={loading || !goal.trim() || (!isMissionFree && !canAffordMission)}
                    className={`w-full relative overflow-hidden font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group text-sm ${
                      !isMissionFree && !canAffordMission
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-white text-black hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {loading ? (
                      <><Loader2 className="animate-spin" size={16} />Crafting Your Path…</>
                    ) : !isMissionFree && !canAffordMission ? (
                      <><Lock size={16} />Not Enough XP</>
                    ) : (
                      <><Sparkles size={16} />Generate Roadmap{!isMissionFree && <span className="text-[10px] opacity-60 ml-1">({MISSION_XP_COST} XP)</span>}</>
                    )}
                  </button>

                  <div className="mt-4 space-y-1.5">
                    {['React in 3 days', 'Kubernetes mastery', 'DSA for interviews'].map((tip) => (
                      <button key={tip} onClick={() => dispatch(setGoal(tip))} className="w-full text-left text-[11px] text-gray-600 hover:text-blue-400 px-3 py-1.5 rounded-lg bg-white/2 hover:bg-blue-500/5 border border-white/4 hover:border-blue-500/20 transition-all">↳ {tip}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT — ROADMAPS */}
              <div className="lg:col-span-8 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1 custom-scrollbar pb-16">
                {roadmaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-24 text-gray-700">
                    <div className="w-16 h-16 rounded-3xl bg-white/3 border border-white/5 flex items-center justify-center mb-5"><BookOpen size={28} className="opacity-30" /></div>
                    <p className="font-bold text-gray-500">No roadmaps yet.</p>
                    <p className="text-sm text-gray-700 mt-1">Generate your first learning path on the left.</p>
                  </div>
                ) : (
                  roadmaps.map((map) => {
                    const isDailyCourse = map.title.toLowerCase().includes('day') || map.milestones.some((m: any) => m.title.toLowerCase().includes('day'));
                    return (
                      <RoadmapCard
                        key={map.id}
                        map={map}
                        isExpanded={expandedRoadmaps.has(map.id)}
                        onToggle={() => toggleRoadmap(map.id)}
                        onMilestoneClick={(m) => dispatch(openMilestone(m))}
                        onStartMilestone={startMilestone}
                        onCompleteMilestone={completeMilestone}
                        onTrackResource={trackResourceView}
                        onAskMentor={handleAskMentor}
                        onOpenTest={handleOpenTest}
                        isDailyCourse={isDailyCourse}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── NEURAL MENTOR SIDEBAR ── */}
        <div className={`fixed inset-y-0 right-0 w-full sm:w-[440px] xl:w-[500px] bg-[#0a0a0a] border-l border-white/8 transform transition-transform duration-300 ease-in-out shadow-2xl z-40 flex flex-col top-16 ${activeMilestone ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="px-5 py-4 border-b border-white/8 flex justify-between items-center bg-gradient-to-r from-blue-600/8 to-purple-600/5 shrink-0">
            <div className="min-w-0">
              <h3 className="font-black text-white flex items-center gap-2 text-sm">
                <div className="w-6 h-6 bg-blue-500/15 rounded-lg flex items-center justify-center"><Sparkles size={13} className="text-blue-400" /></div>
                Neural Mentor
              </h3>
              <p className="text-[11px] text-gray-600 truncate mt-0.5 max-w-[280px]">{activeMilestone?.title}</p>
            </div>
            <button onClick={() => dispatch(closeMentor())} className="w-8 h-8 rounded-xl bg-white/4 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar" ref={chatScrollRef}>
            {showWelcome && chatHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] space-y-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-3xl flex items-center justify-center border border-white/5"><Brain size={28} className="text-blue-400" /></div>
                <div>
                  <h4 className="font-black text-white text-base mb-2">Ready to Master This?</h4>
                  <p className="text-gray-600 text-xs max-w-[220px] mx-auto leading-relaxed">I can explain concepts, quiz you, or answer questions about this milestone.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-[260px]">
                  <button onClick={() => handleAskMentor('explain')} className="bg-white/4 hover:bg-yellow-500/10 border border-white/8 hover:border-yellow-500/25 p-4 rounded-2xl transition-all text-xs flex flex-col items-center gap-2 group">
                    <Sparkles size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-gray-300 group-hover:text-yellow-300 transition-colors">Explain</span>
                    <span className="text-[10px] text-gray-600">Deep dive</span>
                  </button>
                  <button onClick={() => handleAskMentor('quiz')} className="bg-white/4 hover:bg-green-500/10 border border-white/8 hover:border-green-500/25 p-4 rounded-2xl transition-all text-xs flex flex-col items-center gap-2 group">
                    <GraduationCap size={20} className="text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-gray-300 group-hover:text-green-300 transition-colors">Quiz Me</span>
                    <span className="text-[10px] text-gray-600">+25 XP</span>
                  </button>
                </div>
              </div>
            )}

            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[95%] rounded-2xl p-4 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#141414] text-gray-300 border border-white/6 rounded-bl-sm'}`}>
                  {msg.quiz ? (
                    <InteractiveQuiz quiz={msg.quiz} userAnswer={msg.userAnswer} onAnswer={(answerIndex) => handleQuizAnswer(idx, answerIndex)} />
                  ) : msg.text ? (
                    msg.role === 'ai' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-base font-black text-white mb-2 pb-1 border-b border-white/10">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-black text-white mb-2 mt-4">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-black text-blue-400 mb-1 mt-3 uppercase tracking-wide">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="pl-1">{children}</li>,
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="rounded-xl overflow-hidden my-3 border border-white/8 shadow-xl">
                                <div className="bg-[#1a1a1a] px-3 py-1.5 text-[9px] text-gray-500 border-b border-white/5 font-mono"><span>{match[1].toUpperCase()}</span></div>
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: '0.875rem', background: '#0d0d0d', fontSize: '11px', lineHeight: '1.5' }} {...props}>
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded font-mono text-xs border border-blue-500/15" {...props}>{children}</code>;
                          },
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : msg.text
                  ) : null}
                </div>
              </div>
            ))}

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

          <div className="p-4 border-t border-white/8 bg-[#080808] shrink-0">
            {chatHistory.length > 0 && !isStreaming && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                {[{ label: '💡 Explain more', mode: 'explain' as const }, { label: '🎲 Quiz me', mode: 'quiz' as const }].map((pill) => (
                  <button key={pill.label} onClick={() => handleAskMentor(pill.mode)} className="shrink-0 text-[11px] text-gray-500 hover:text-white bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/15 px-3 py-1.5 rounded-full transition-all">{pill.label}</button>
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !isStreaming) handleAskMentor('chat'); }}
                disabled={isStreaming}
              />
              <button onClick={() => handleAskMentor('chat')} disabled={isStreaming || !chatInput.trim()} className="absolute right-2 top-2 bottom-2 w-9 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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
              <h2 className="font-black flex items-center gap-2"><Trophy className="text-yellow-500" size={20} />Achievements Gallery</h2>
              <button onClick={() => dispatch(setShowAchievements(false))} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={16} /></button>
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
                  <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-yellow-500/20 transition-all">
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

      {/* ── XP GATE MODAL ── */}
      {showXpGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl max-w-sm w-full shadow-2xl p-6">
            {xpGateError ? (
              // Insufficient XP
              <>
                <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} className="text-red-400" />
                </div>
                <h3 className="font-black text-white text-center text-lg mb-2">Not Enough XP</h3>
                <p className="text-gray-500 text-xs text-center leading-relaxed mb-5">{xpGateError}</p>
                <div className="bg-red-500/8 border border-red-500/20 rounded-2xl p-3 mb-5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500/15 rounded-xl flex items-center justify-center shrink-0"><Zap size={16} className="text-red-400" /></div>
                  <div>
                    <p className="text-xs font-bold text-red-300">You have {userProgress?.stats?.totalXP ?? 0} XP</p>
                    <p className="text-[10px] text-gray-600">Need {MISSION_XP_COST} XP to unlock</p>
                  </div>
                </div>
                <button onClick={() => setShowXpGate(false)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl transition-all text-sm">Got it</button>
              </>
            ) : (
              // Confirm spend
              <>
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-blue-400" />
                </div>
                <h3 className="font-black text-white text-center text-lg mb-2">Start New Mission?</h3>
                <p className="text-gray-500 text-xs text-center leading-relaxed mb-5">
                  Launching a new learning mission costs <span className="text-blue-400 font-bold">{MISSION_XP_COST} XP</span>. Your roadmap will be generated instantly.
                </p>
                <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-3 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-blue-400" />
                    <span className="text-xs text-gray-400">Your balance</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-white">{userProgress?.stats?.totalXP ?? 0} XP</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-blue-400">{(userProgress?.stats?.totalXP ?? 0) - MISSION_XP_COST} XP</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowXpGate(false)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-2xl transition-all text-sm">Cancel</button>
                  <button onClick={executeGenerate} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl transition-all text-sm flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={14} />Confirm</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TEST MODAL ── */}
      {testMilestone && (
        <TestModal
          milestone={testMilestone}
          onClose={handleCloseTest}
          onComplete={handleTestComplete}
        />
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