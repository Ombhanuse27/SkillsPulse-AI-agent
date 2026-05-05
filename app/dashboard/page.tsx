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
  FileText, Menu, Home, ChevronDown, Cpu, ClipboardList, RefreshCw,
  AlertCircle, Star, ChevronLeft, Bot, Activity
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

interface TestResult {
  grade: string;
  score: number;
  total: number;
  attempts: number;
  passed: boolean;
  xpEarned: number;
  lastAttemptAt: string;
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
  { label: 'Dashboard',        href: '/dashboard',        icon: Home,     color: 'text-blue-400',   bg: 'bg-blue-500/15',  border: 'border-blue-500' },
  { label: 'Career Architect', href: '/dashboard',        icon: Map,      color: 'text-green-400',  bg: 'bg-green-500/15', border: 'border-green-500' },
  { label: 'Resume Audit',     href: '/resume-analyzer',  icon: FileText, color: 'text-sky-400',    bg: 'bg-sky-500/15',   border: 'border-sky-500' },
  { label: 'AI Interviewer',   href: '/interview-prep',   icon: Brain,    color: 'text-purple-400', bg: 'bg-purple-500/15',border: 'border-purple-500' },
];

const MISSION_XP_COST = 100;
const TEST_RETRY_XP_COST = 50;
const PASSING_GRADES = new Set(['S', 'A', 'B']);

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; desc: string; emoji: string }> = {
  S: { label: 'S', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', desc: 'Master Level 🏆', emoji: '🏆' },
  A: { label: 'A', color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/40',  desc: 'Excellent! 🎯',  emoji: '🎯' },
  B: { label: 'B', color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40',   desc: 'Solid Job 👍', emoji: '👍' },
  C: { label: 'C', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40', desc: 'Needs Review 📖', emoji: '📖' },
  F: { label: 'F', color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/40',    desc: 'Keep Studying 💪',  emoji: '💪' },
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

// ─── VERTICAL SIDEBAR NAVBAR ──────────────────────────────────────────────────
function Navbar({ user, onLogout, progress }: { user: any; onLogout: () => void; progress?: UserProgress; }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const xpPercentage = progress?.stats
    ? ((progress.stats.nextLevelXP - progress.stats.xpToNextLevel) / progress.stats.nextLevelXP) * 100
    : 0;

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="fixed top-3 left-3 z-50 md:hidden w-12 h-12 bg-[#111] border-b-4 border-white/10 active:border-b-0 active:translate-y-1 rounded-2xl flex items-center justify-center text-white transition-all shadow-xl">
        <Menu size={20} />
      </button>

      {mobileOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed md:relative z-50 h-full flex flex-col bg-[#0a0a0a] border-r border-white/5 transition-all duration-300 shrink-0
          ${mobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-[88px]' : 'md:w-72'}`}>
        
        <div className={`flex items-center border-b border-white/5 shrink-0 h-20 transition-all ${collapsed ? 'px-4 justify-center' : 'px-6 justify-between'}`}>
          <Link href="/" className="flex items-center gap-3 font-black text-2xl tracking-tighter group">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all">
              <Cpu size={20} className="text-white" />
            </div>
            {!collapsed && <span className="text-white tracking-wide">Skill<span className="text-blue-500">Pulse</span></span>}
          </Link>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="hidden md:flex w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-400 hover:text-white transition-all">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="hidden md:flex mx-auto mt-6 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 items-center justify-center text-gray-400 hover:text-white transition-all">
            <ChevronRight size={18} />
          </button>
        )}

        <nav className={`flex-1 space-y-2 overflow-y-auto custom-scrollbar pt-6 ${collapsed ? 'px-3' : 'px-4'}`}>
          {!collapsed && <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">Navigation</p>}
          {NAV_ITEMS.map((item) => {
            const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href && item.label === 'Dashboard';
            return (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}
                className={`flex items-center gap-4 rounded-2xl text-sm font-bold transition-all duration-200 group relative
                  ${collapsed ? 'p-3 justify-center' : 'px-4 py-3.5'}
                  ${isCurrent ? `bg-white/[0.08] text-white` : 'text-gray-400 hover:text-white hover:bg-white/5'}
                  active:scale-[0.98]`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all border-b-4
                  ${isCurrent ? `${item.bg} ${item.border} border-opacity-50 text-white shadow-lg` : 'bg-black border-white/5 text-gray-500 group-hover:border-white/20 group-hover:text-white'} `}>
                  <item.icon size={18} />
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {progress?.stats && !collapsed && (
          <div className="px-4 py-4 mx-4 mb-4 bg-white/[0.03] border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Level {progress.stats.level}</p>
                <p className="text-xl font-black text-white tabular-nums">{progress.stats.totalXP.toLocaleString()}<span className="text-blue-400 text-[10px] ml-1">XP</span></p>
              </div>
              {progress.stats.currentStreak > 0 && (
                <div className="flex items-center gap-1 bg-orange-500/20 border-b-2 border-orange-500 rounded-xl px-2.5 py-1.5 text-xs font-black text-orange-400">
                  <Flame size={12} className="animate-pulse" />{progress.stats.currentStreak}
                </div>
              )}
            </div>
            <div className="w-full bg-black h-2.5 rounded-full overflow-hidden border border-white/10 relative">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 relative" style={{ width: `${xpPercentage}%` }}>
                <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 mt-2 text-center">{progress.stats.xpToNextLevel} XP to Level {progress.stats.level + 1}</p>
          </div>
        )}

        {progress?.stats && collapsed && (
          <div className="flex flex-col items-center gap-3 pb-4 px-3">
            <div title={`${progress.stats.totalXP.toLocaleString()} XP`} className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border-b-4 border-blue-500 text-blue-400">
              <Zap size={20} />
            </div>
            {progress.stats.currentStreak > 0 && (
              <div title={`${progress.stats.currentStreak} day streak`} className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center border-b-4 border-orange-500 text-orange-400">
                <Flame size={20} className="animate-pulse" />
              </div>
            )}
          </div>
        )}

        <div className={`border-t border-white/5 shrink-0 bg-[#080808] ${collapsed ? 'p-3' : 'p-4'}`}>
          <div className={`flex ${collapsed ? 'flex-col' : ''} items-center gap-3`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shrink-0 border-b-2 border-purple-700">
              <div className="w-full h-full bg-[#111] rounded-[10px] flex items-center justify-center text-sm font-black text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-gray-500 font-bold truncate">{user?.email}</p>
              </div>
            )}
            <button onClick={onLogout} title="Sign Out" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500 text-gray-400 hover:text-white border-b-4 border-transparent hover:border-red-700 active:border-b-0 active:translate-y-1 flex items-center justify-center transition-all shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ progress, onShowAchievements }: { progress: UserProgress; onShowAchievements: () => void; }) {
  if (!progress?.stats) return null;
  const { stats, dailyGoal } = progress;
  const xpPercentage = ((stats.nextLevelXP - stats.xpToNextLevel) / stats.nextLevelXP) * 100;
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
      <div className="bg-[#111] border-b-4 border-white/10 p-4 rounded-2xl relative overflow-hidden group hover:border-blue-500 transition-all cursor-default">
        <div className="flex justify-between items-start mb-3">
          <div><p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Level {stats.level}</p><h3 className="text-2xl font-black text-white tabular-nums leading-none">{stats.totalXP.toLocaleString()}<span className="text-xs text-blue-400 ml-1">XP</span></h3></div>
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><Zap size={20} /></div>
        </div>
        <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5"><div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${xpPercentage}%` }} /></div>
      </div>

      <div className="bg-[#111] border-b-4 border-white/10 p-4 rounded-2xl relative overflow-hidden group hover:border-orange-500 transition-all cursor-default">
        <div className="flex justify-between items-start">
          <div><p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">Day Streak</p><h3 className="text-2xl font-black text-white tabular-nums leading-none">{stats.currentStreak} <span className="text-xl">🔥</span></h3></div>
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform"><Flame size={20} /></div>
        </div>
        <p className="text-[11px] font-bold text-gray-500 mt-4">Keep the fire burning!</p>
      </div>

      <div className="bg-[#111] border-b-4 border-white/10 p-4 rounded-2xl relative overflow-hidden group hover:border-green-500 transition-all cursor-default">
        <div className="flex justify-between items-start mb-3">
          <div><p className="text-green-400 text-[10px] font-black uppercase tracking-widest mb-1">Daily Goal</p><div className="flex items-baseline gap-1"><h3 className="text-2xl font-black text-white tabular-nums leading-none">{dailyGoal?.minsCompleted || 0}</h3><span className="text-gray-500 text-xs font-bold">/ {dailyGoal?.targetMins || 0}m</span></div></div>
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform"><Target size={20} /></div>
        </div>
        <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5"><div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${dailyGoal?.progressPercentage || 0}%` }} /></div>
      </div>

      <button onClick={onShowAchievements} className="bg-[#111] border-b-4 border-white/10 p-4 rounded-2xl relative overflow-hidden group hover:border-yellow-500 transition-all text-left active:border-b-0 active:translate-y-1">
        <div className="flex justify-between items-start">
          <div><p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1">Badges</p><h3 className="text-2xl font-black text-white tabular-nums leading-none">{progress.achievements?.length || 0}</h3></div>
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform"><Trophy size={20} /></div>
        </div>
        <p className="text-[11px] font-bold text-gray-400 mt-4 flex items-center gap-1 group-hover:text-yellow-400 transition-colors">View Gallery <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" /></p>
      </button>
    </div>
  );
}

function InteractiveQuiz({ quiz, userAnswer, onAnswer }: { quiz: QuizData; userAnswer?: number; onAnswer: (index: number) => void; }) {
  const answered = userAnswer !== undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-blue-400 mb-2"><GraduationCap size={18} /><h4 className="font-black text-sm uppercase tracking-wide">Knowledge Check</h4></div>
      <p className="text-white font-bold mb-3">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((option, index) => {
          const isCorrect = index === quiz.correctIndex;
          const isUserChoice = index === userAnswer;
          let bgClass = 'bg-[#111] hover:bg-white/10 border-white/10';
          let textClass = 'text-gray-300';
          if (answered) {
            if (isCorrect) { bgClass = 'bg-green-500/20 border-green-500'; textClass = 'text-green-400'; }
            else if (isUserChoice && !isCorrect) { bgClass = 'bg-red-500/20 border-red-500'; textClass = 'text-red-400'; }
          }
          return (
            <button key={index} onClick={() => !answered && onAnswer(index)} disabled={answered} className={`w-full text-left p-3.5 rounded-xl border-b-4 border-2 transition-all ${bgClass} ${answered ? 'border-b-2 cursor-default translate-y-0.5' : 'active:border-b-2 active:translate-y-0.5 cursor-pointer'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${answered && isCorrect ? 'bg-green-500 text-black' : answered && isUserChoice && !isCorrect ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}>{String.fromCharCode(65 + index)}</span>
                <span className={`font-bold ${textClass}`}>{option}</span>
                {answered && isCorrect && <CheckCircle size={18} className="ml-auto text-green-500" />}
              </div>
            </button>
          );
        })}
      </div>
      {answered && <div className="mt-3 p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl"><p className="text-sm text-blue-100 font-medium"><strong className="text-blue-400">Explanation:</strong> {quiz.explanation}</p></div>}
    </div>
  );
}

function ProgressRing({ pct, size = 48, stroke = 4, color = '#3b82f6' }: { pct: number; size?: number; stroke?: number; color?: string; }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') return <span className="text-[9px] font-black uppercase tracking-widest bg-green-500 text-black px-2 py-0.5 rounded-md shadow-sm">Done</span>;
  if (status === 'in_progress') return <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Activity size={10} className="animate-pulse" />Active</span>;
  return null;
}

function GradePill({ testResult }: { testResult: TestResult }) {
  const cfg = GRADE_CONFIG[testResult.grade] ?? GRADE_CONFIG['F'];
  const isPassed = PASSING_GRADES.has(testResult.grade);
  return (
    <span title={`${cfg.desc} · ${testResult.attempts} attempt${testResult.attempts !== 1 ? 's' : ''}`} className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${cfg.color} ${cfg.bg} ${cfg.border} shrink-0`}>
      {isPassed ? <CheckCircle size={10} /> : <Star size={10} />}
      {testResult.score}/{testResult.total} · {testResult.grade}
    </span>
  );
}

// ─── TEST MODAL ───────────────────────────────────────────────────────────────
function TestModal({ milestone, onClose, onComplete }: { milestone: any; onClose: () => void; onComplete: (score: number, total: number, answers: any[]) => void; }) {
  const [phase, setPhase] = useState<'loading' | 'questions' | 'results'>('loading');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState('');

  const score = selectedAnswers.filter((a, i) => questions[i] && a === questions[i].correctIndex).length;
  const grade = questions.length > 0 ? getGrade(score, questions.length) : 'F';
  const gradeConfig = GRADE_CONFIG[grade];
  const xpEarned = questions.length > 0 ? getTestXP(score, questions.length) : 0;
  const isPassed = PASSING_GRADES.has(grade);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/generate-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ milestoneTitle: milestone.title, milestoneDescription: milestone.description }) });
        const data = await res.json();
        if (!data.success || !data.questions?.length) throw new Error('No questions returned');
        setQuestions(data.questions); setSelectedAnswers(new Array(data.questions.length).fill(null)); setPhase('questions');
      } catch (e) { setError('Failed to generate test. Please try again.'); setPhase('questions'); }
    };
    fetchQuestions();
  }, [milestone.id]);

  const handleSelect = (optionIdx: number) => {
    if (selectedAnswers[currentQ] !== null) return;
    const updated = [...selectedAnswers]; updated[currentQ] = optionIdx; setSelectedAnswers(updated); setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
    else {
      const answers = questions.map((q, i) => ({ questionIndex: i, selectedIndex: selectedAnswers[i] ?? -1, correctIndex: q.correctIndex, isCorrect: selectedAnswers[i] === q.correctIndex }));
      onComplete(score, questions.length, answers); setPhase('results');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0f0f0f] border-2 border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="px-6 py-4 bg-[#1a1a1a] border-b-2 border-white/5 flex items-center justify-between shrink-0">
          <div><h2 className="font-black text-white text-lg flex items-center gap-2"><ClipboardList className="text-purple-400"/> Knowledge Check</h2><p className="text-xs text-gray-400 font-bold mt-0.5">{milestone.title}</p></div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white border-b-4 border-transparent hover:border-white/20 active:border-b-0 active:translate-y-1 transition-all"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="w-20 h-20 bg-purple-500 rounded-3xl flex items-center justify-center animate-pulse"><Loader2 size={40} className="text-white animate-spin" /></div>
              <p className="text-white text-xl font-black">Generating challenge...</p>
            </div>
          )}
          {phase === 'questions' && questions.length > 0 && (
            <div>
              <div className="flex gap-2 mb-8">
                {questions.map((_, i) => (
                  <div key={i} className={`h-2.5 rounded-full flex-1 transition-all ${i < currentQ ? 'bg-green-500' : i === currentQ ? 'bg-blue-500' : 'bg-white/10'}`} />
                ))}
              </div>
              <h3 className="text-xl font-black text-white mb-6 leading-relaxed">{questions[currentQ]?.question}</h3>
              <div className="space-y-3">
                {questions[currentQ]?.options.map((opt, idx) => {
                  const answered = selectedAnswers[currentQ] !== null; const isSelected = selectedAnswers[currentQ] === idx; const isCorrect = idx === questions[currentQ].correctIndex;
                  let cls = 'bg-[#1a1a1a] border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20';
                  if (answered) {
                    if (isCorrect) cls = 'bg-green-500 text-black border-green-600';
                    else if (isSelected) cls = 'bg-red-500 text-white border-red-600';
                    else cls = 'bg-black opacity-50 border-white/5';
                  }
                  return (
                    <button key={idx} onClick={() => handleSelect(idx)} disabled={answered} className={`w-full text-left px-5 py-4 rounded-2xl border-b-4 border-2 transition-all ${cls} ${answered ? 'border-b-2 cursor-default translate-y-0.5' : 'active:border-b-2 active:translate-y-0.5'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 ${answered && isCorrect ? 'bg-black/20 text-black' : answered && isSelected && !isCorrect ? 'bg-black/20 text-white' : 'bg-white/10 text-gray-400'}`}>{String.fromCharCode(65 + idx)}</span>
                        <span className="font-bold text-[15px]">{opt}</span>
                        {answered && isCorrect && <CheckCircle size={24} className="ml-auto opacity-80" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {showExplanation && (
                <div className={`mt-6 p-5 rounded-2xl border-2 ${selectedAnswers[currentQ] === questions[currentQ].correctIndex ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                  <p className="font-black text-white mb-2 text-sm">{selectedAnswers[currentQ] === questions[currentQ].correctIndex ? '✅ Correct!' : '💡 Let\'s learn from this'}</p>
                  <p className="text-gray-300 font-medium text-sm">{questions[currentQ].explanation}</p>
                </div>
              )}
              {selectedAnswers[currentQ] !== null && (
                <button onClick={handleNext} className="mt-8 w-full bg-blue-500 hover:bg-blue-400 text-white font-black py-4 rounded-2xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-lg">
                  {currentQ < questions.length - 1 ? 'Next Question' : 'Complete Challenge'} <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
          {phase === 'questions' && questions.length === 0 && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400"><X size={32} /></div>
              <p className="text-gray-400 font-bold">{error}</p>
              <button onClick={onClose} className="text-white font-bold bg-white/10 px-4 py-2 rounded-xl mt-4">Close</button>
            </div>
          )}
          {phase === 'results' && (
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto rounded-[2.5rem] flex items-center justify-center mb-6 border-4 shadow-2xl ${gradeConfig.bg} ${gradeConfig.border}`}>
                <span className={`text-6xl font-black ${gradeConfig.color}`}>{gradeConfig.label}</span>
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{gradeConfig.desc}</h2>
              <p className="text-gray-400 font-bold mb-6">You scored {score} out of {questions.length}</p>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-5 py-2.5 rounded-xl font-black text-lg border-2 border-blue-500/30 mb-8"><Zap size={20}/> +{xpEarned} XP</div>
              <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border-b-4 border-white/10 hover:border-white/30 active:border-b-0 active:translate-y-1 transition-all text-lg">Return to Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TEST BUTTON ──────────────────────────────────────────────────────────────
function TestButton({ milestone, localTestResults, onOpenTest }: { milestone: any; localTestResults: Record<string, TestResult>; onOpenTest: (m: any) => void; }) {
  const testResult: TestResult | undefined = localTestResults[milestone.id] ?? milestone.progress?.testResult;

  if (!testResult) {
    return (
      <button onClick={() => onOpenTest(milestone)} className="text-[11px] bg-purple-500 hover:bg-purple-400 text-white px-4 py-2 rounded-xl font-black border-b-4 border-purple-700 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1.5 ml-auto">
        <ClipboardList size={12} /> Take Test
      </button>
    );
  }

  const isPassed = PASSING_GRADES.has(testResult.grade);
  const cfg = GRADE_CONFIG[testResult.grade] ?? GRADE_CONFIG['F'];

  if (isPassed) {
    return (
      <span title={`${cfg.desc} · ${testResult.score}/${testResult.total} · ${testResult.attempts} attempt${testResult.attempts !== 1 ? 's' : ''}`} className={`text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 border-2 font-black cursor-default ml-auto ${cfg.color} ${cfg.bg} ${cfg.border}`}>
        <Trophy size={12} /> Grade {testResult.grade} ✓
      </span>
    );
  }

  return (
    <button onClick={() => onOpenTest(milestone)} title={`Retry costs ${TEST_RETRY_XP_COST} XP.`} className="text-[11px] bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-xl font-black border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1.5 ml-auto">
      <RefreshCw size={12} /> Retry Test <span className="text-[9px] opacity-80">({TEST_RETRY_XP_COST} XP)</span>
    </button>
  );
}

// ─── ROADMAP CARD ─────────────────────────────────────────────────────────────
function RoadmapCard({ map, isExpanded, onToggle, onMilestoneClick, onStartMilestone, onCompleteMilestone, onTrackResource, onAskMentor, onOpenTest, isDailyCourse, localTestResults }: any) {
  const completedCount = map.milestones.filter((m: any) => m.progress?.status === 'completed').length;
  const pct = map.completionPercentage;
  const inProgressCount = map.milestones.filter((m: any) => m.progress?.status === 'in_progress').length;

  return (
    <div className={`mb-6 bg-[#111] border-2 border-white/5 rounded-3xl overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-xl' : 'hover:border-white/20'}`}>
      <button onClick={onToggle} className="w-full p-5 flex items-center gap-4 text-left group">
        <div className="w-12 h-12 bg-[#1a1a1a] rounded-2xl flex items-center justify-center border-2 border-white/10 shrink-0 relative">
          <ProgressRing pct={pct} size={40} stroke={4} color={pct === 100 ? '#22c55e' : '#3b82f6'} />
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">{pct}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-white tracking-tight truncate">{map.title}</h2>
            {isDailyCourse && <span className="shrink-0 text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md uppercase font-black">Intensive</span>}
            {pct === 100 && <span className="shrink-0 text-[10px] bg-green-500 text-black px-2 py-0.5 rounded-md uppercase font-black flex items-center gap-1"><Trophy size={10}/> Mastered</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-xs font-bold text-gray-500">{completedCount} of {map.milestones.length} Milestones Completed</p>
            {inProgressCount > 0 && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-black flex items-center gap-1"><Activity size={10} className="animate-pulse"/> {inProgressCount} Active</span>}
          </div>
        </div>
        <div className={`shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-white/10 group-hover:text-white transition-all ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} />
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 pt-0 space-y-3 relative before:absolute before:left-[2.15rem] before:top-2 before:bottom-6 before:w-1.5 before:bg-[#1a1a1a] before:rounded-full">
          {map.milestones.map((milestone: any, idx: number) => {
            const status = milestone.progress?.status || 'not_started';
            const isLocked = idx > 0 && map.milestones[idx - 1].progress?.status !== 'completed';
            const testResult: TestResult | undefined = localTestResults[milestone.id] ?? milestone.progress?.testResult;

            return (
              <div key={idx} className={`relative pl-14 transition-all duration-300 ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                <div onClick={() => !isLocked && onMilestoneClick(milestone)} className={`absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-[4px] flex items-center justify-center text-[10px] font-black z-10 transition-all ${
                    status === 'completed' ? 'bg-green-500 border-[#111] text-black scale-110' :
                    status === 'in_progress' ? 'bg-blue-500 border-[#111] text-white scale-125 shadow-[0_0_15px_rgba(59,130,246,0.6)]' :
                    isLocked ? 'bg-[#1a1a1a] border-[#111] text-gray-600' : 'bg-white border-[#111] text-black hover:scale-110 cursor-pointer'
                  }`}>
                  {status === 'completed' ? <CheckCircle size={12} /> : isLocked ? <Lock size={10} /> : status === 'in_progress' ? <Play size={8} fill="currentColor" className="ml-0.5" /> : <span>{idx + 1}</span>}
                </div>

                <div className={`bg-[#1a1a1a] border-2 border-white/5 rounded-2xl p-4 transition-all ${isLocked ? 'cursor-not-allowed' : 'hover:border-white/20 hover:bg-[#222] shadow-lg cursor-pointer active:scale-[0.99]'}`} onClick={() => !isLocked && onMilestoneClick(milestone)}>
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div>
                      <h4 className={`font-black text-[15px] mb-1 ${status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>{milestone.title}</h4>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">{milestone.description}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      <StatusPill status={status} />
                      {testResult && <GradePill testResult={testResult} />}
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      {status === 'not_started' && (
                        <button onClick={() => onStartMilestone(milestone)} className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl font-black border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2">
                          <Play size={12} fill="currentColor" /> Start
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <button onClick={() => onCompleteMilestone(milestone)} className="text-xs bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-xl font-black border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2">
                          <CheckCircle size={12} /> Mark Done
                        </button>
                      )}
                      <button onClick={() => onAskMentor('explain', milestone)} className="text-xs bg-[#2a2a2a] hover:bg-[#333] text-white px-3 py-2 rounded-xl font-bold border-b-4 border-[#111] active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1.5"><Sparkles size={14} className="text-yellow-400"/> Explain</button>
                      <button onClick={() => onAskMentor('quiz', milestone)} className="text-xs bg-[#2a2a2a] hover:bg-[#333] text-white px-3 py-2 rounded-xl font-bold border-b-4 border-[#111] active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1.5"><GraduationCap size={14} className="text-green-400"/> Quiz</button>
                      
                      <TestButton milestone={milestone} localTestResults={localTestResults} onOpenTest={onOpenTest} />
                    </div>
                  )}

                  {milestone.resources && milestone.resources.length > 0 && !isLocked && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      {milestone.resources.map((res: any, rId: number) => {
                        const isViewed = milestone.progress?.resourcesViewed?.includes(res.id || res.url);
                        return (
                          <a key={rId} href={res.url} target="_blank" rel="noopener noreferrer" onClick={() => onTrackResource(milestone, res.id || res.url)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-b-4 border-2 transition-all group/link text-xs font-bold active:border-b-2 active:translate-y-0.5 ${isViewed ? 'bg-blue-900/20 border-blue-500/30 text-blue-400 border-b-2 translate-y-0.5' : 'bg-[#111] hover:bg-[#222] border-white/5 hover:border-white/10 text-gray-400 hover:text-white'}`}>
                            {res.type === 'YOUTUBE' && <Video size={14} className="text-red-500 shrink-0" />}
                            {res.type === 'GITHUB' && <Code size={14} className="text-purple-500 shrink-0" />}
                            {res.type === 'INTERACTIVE' && <Play size={14} className="text-green-500 shrink-0" />}
                            {res.type === 'ARTICLE' && <BookOpen size={14} className="text-blue-500 shrink-0" />}
                            {!['YOUTUBE', 'GITHUB', 'INTERACTIVE', 'ARTICLE'].includes(res.type) && <ExternalLink size={14} className="text-gray-500 shrink-0" />}
                            <span className="flex-1 truncate">{res.title}</span>
                            {isViewed ? <CheckCircle size={14} className="text-blue-500 shrink-0" /> : <ChevronRight size={14} className="text-gray-600 group-hover/link:text-white shrink-0" />}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
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

  const [expandedRoadmaps, setExpandedRoadmaps] = useState<Set<string>>(new Set());
  const [testMilestone, setTestMilestone] = useState<any | null>(null);
  const [showXpGate, setShowXpGate] = useState(false);
  const [xpGateError, setXpGateError] = useState('');
  const [testRetryGate, setTestRetryGate] = useState<{ milestone: any } | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [localTestResults, setLocalTestResults] = useState<Record<string, TestResult>>({});

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

  useEffect(() => { if (roadmaps.length > 0) setExpandedRoadmaps(new Set([roadmaps[0].id])); }, [roadmaps.length]);
  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatHistory, isStreaming, isThinking]);
  useEffect(() => { if (activeMilestone) dispatch(setShowWelcome(chatHistory.length === 0)); }, [activeMilestone, chatHistory]);

  const toggleRoadmap = (id: string) => {
    setExpandedRoadmaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleProgressAction = async (action: string, data: any) => {
    if (!user) return;
    try {
      const result = await dispatch(performProgressAction({ action, userId: user.id, data })).unwrap();
      dispatch(loadRoadmaps(user.id));
      return result?.result;
    } catch (e) { console.error('Progress update failed', e); }
  };

  const isMissionFree = roadmaps.length === 0;
  const canAffordMission = (userProgress?.stats?.totalXP ?? 0) >= MISSION_XP_COST;
  const canAffordRetry = (userProgress?.stats?.totalXP ?? 0) >= TEST_RETRY_XP_COST;

  const handleGenerate = async () => {
    if (!goal.trim() || !user) return;
    if (!isMissionFree && !canAffordMission) {
      setXpGateError(`Need ${MISSION_XP_COST} XP. Complete daily goals!`);
      setShowXpGate(true);
      return;
    }
    if (!isMissionFree) { setShowXpGate(true); setXpGateError(''); return; }
    await executeGenerate();
  };

  const executeGenerate = async () => {
    setShowXpGate(false);
    if (!goal.trim() || !user) return;
    try {
      if (!isMissionFree) {
        const deductResult = await fetch('/api/progress', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deduct_xp', userId: user.id, data: { amount: MISSION_XP_COST } }),
        });
        const deductData = await deductResult.json();
        if (!deductData.success) { alert(deductData.error || 'Failed to deduct XP'); return; }
        dispatch(loadUserProgress(user.id));
      }
      const result = await dispatch(generateRoadmap({ goal, userId: user.id })).unwrap();
      if (result?.id) setExpandedRoadmaps((prev) => new Set([...prev, result.id]));
      dispatch(setGoal(''));
    } catch { alert('Failed to generate roadmap. Please try again.'); }
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

  const handleOpenTest = (milestone: any) => {
    const testResult = localTestResults[milestone.id] ?? milestone.progress?.testResult;
    if (testResult) {
      if (PASSING_GRADES.has(testResult.grade)) return;
      setRetryError('');
      setTestRetryGate({ milestone });
      return;
    }
    setTestMilestone(milestone);
  };

  const handleCloseTest = () => {
    setTestMilestone(null);
    if (user) {
      dispatch(loadRoadmaps(user.id));
      dispatch(loadUserProgress(user.id));
    }
  };

  const handleRetryConfirm = async () => {
    if (!user || !testRetryGate) return;
    if (!canAffordRetry) {
      setRetryError(`Need ${TEST_RETRY_XP_COST} XP to retry.`);
      return;
    }
    setRetryLoading(true);
    setRetryError('');
    try {
      const res = await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deduct_xp', userId: user.id, data: { amount: TEST_RETRY_XP_COST } }),
      });
      const data = await res.json();
      if (!data.success) { setRetryError(data.error); setRetryLoading(false); return; }
      dispatch(loadUserProgress(user.id));
      setTestRetryGate(null);
      setTestMilestone(testRetryGate.milestone);
    } catch { setRetryError('Something went wrong. Please try again.'); }
    finally { setRetryLoading(false); }
  };

  const handleTestComplete = async (score: number, total: number, answers: any[]) => {
    if (!user || !testMilestone) return;
    try {
      const res = await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_test',
          userId: user.id,
          data: { milestoneId: testMilestone.id, milestoneTitle: testMilestone.title, score, total, answers },
        }),
      });
      const data = await res.json();
      if (data.success) {
        const prevAttempts = (localTestResults[testMilestone.id]?.attempts ?? testMilestone.progress?.testResult?.attempts ?? 0);
        const newResult: TestResult = {
          grade: data.grade, score: data.score, total: data.total, attempts: data.attempts ?? prevAttempts + 1, passed: data.passed, xpEarned: data.xpEarned, lastAttemptAt: new Date().toISOString(),
        };
        setLocalTestResults((prev) => ({ ...prev, [testMilestone.id]: newResult }));
        dispatch(loadUserProgress(user.id));
        dispatch(loadRoadmaps(user.id));
      }
    } catch (e) { console.error('Test submit failed', e); }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg || `Generate a ${mode}`, context: `${targetMilestone.title}: ${targetMilestone.description}`, mode, chatHistory: historyForAPI }),
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* ── LEFT NAVBAR ── */}
      <Navbar user={user} onLogout={handleLogout} progress={userProgress ?? undefined} />

      {/* ── MIDDLE AREA (MAIN CONTENT) ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mission Builder Header (Sticky & Compact) */}
        <div className="bg-[#0a0a0a] border-b border-white/5 p-4 md:p-6 shrink-0 z-20 shadow-xl">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-4 items-center">
             <div className="flex-1 w-full relative">
               <input 
                  type="text" 
                  value={goal} 
                  onChange={(e) => dispatch(setGoal(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                  placeholder="What do you want to master next? (e.g. System Design, React Native)"
                  className="w-full bg-[#111] border-2 border-white/10 rounded-2xl py-4 pl-5 pr-32 text-white font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
               />
               <button 
                  onClick={handleGenerate} 
                  disabled={loading || !goal.trim() || (!isMissionFree && !canAffordMission)}
                  className="absolute right-2 top-2 bottom-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:bg-gray-600 text-white font-black px-6 rounded-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2"
               >
                 {loading ? <Loader2 size={16} className="animate-spin"/> : 'Generate'}
               </button>
             </div>
             {!isMissionFree && (
                <div className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border-2 font-bold text-sm ${canAffordMission ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  <Zap size={16}/> {MISSION_XP_COST} XP
                </div>
             )}
          </div>
        </div>

        {/* Scrollable Feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            {userProgress && <StatsBar progress={userProgress} onShowAchievements={() => dispatch(setShowAchievements(true))} />}

            {roadmaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 bg-[#111] rounded-3xl border-2 border-dashed border-white/10">
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4"><Map size={32} className="text-gray-500" /></div>
                <h3 className="text-xl font-black text-white mb-2">No active missions</h3>
                <p className="text-gray-500 font-bold max-w-sm">Use the command bar above to generate a highly personalized learning roadmap.</p>
              </div>
            ) : (
              roadmaps.map((map) => (
                <RoadmapCard
                  key={map.id}
                  map={map}
                  isExpanded={expandedRoadmaps.has(map.id)}
                  onToggle={() => toggleRoadmap(map.id)}
                  onMilestoneClick={(m:any) => dispatch(openMilestone(m))}
                  onStartMilestone={startMilestone}
                  onCompleteMilestone={completeMilestone}
                  onTrackResource={trackResourceView}
                  onAskMentor={handleAskMentor}
                  onOpenTest={handleOpenTest}
                  isDailyCourse={map.title.toLowerCase().includes('day') || map.milestones.some((m: any) => m.title.toLowerCase().includes('day'))}
                  localTestResults={localTestResults}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT AREA (NEURAL MENTOR ALWAYS ON DESKTOP) ── */}
      <aside className={`fixed lg:relative inset-y-0 right-0 z-40 w-full md:w-[450px] bg-[#0a0a0a] border-l border-white/5 flex flex-col shrink-0 transition-transform duration-300
         ${activeMilestone ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} `}>
        
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#111] shrink-0 h-20">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center border-b-4 border-purple-700"><Bot size={20} className="text-white"/></div>
             <div>
               <h3 className="font-black text-white text-base">Neural Mentor</h3>
               <p className="text-xs text-green-400 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Online</p>
             </div>
          </div>
          <button onClick={() => dispatch(closeMentor())} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar" ref={chatScrollRef}>
          {!activeMilestone ? (
             <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6"><Brain size={40} className="text-gray-600"/></div>
                <h4 className="text-xl font-black text-white mb-2">Awaiting Context</h4>
                <p className="text-sm font-bold text-gray-500">Select a milestone from your roadmap to begin a deep-learning session.</p>
             </div>
          ) : showWelcome && chatHistory.length === 0 ? (
             <div className="flex flex-col items-center text-center mt-10 space-y-6">
                <div className="bg-purple-500/20 p-4 rounded-3xl border border-purple-500/30"><Sparkles size={32} className="text-purple-400" /></div>
                <div><h4 className="font-black text-xl mb-1 text-white">{activeMilestone.title}</h4><p className="text-xs font-bold text-gray-500">Context Loaded. How can I assist?</p></div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button onClick={() => handleAskMentor('explain')} className="bg-[#111] hover:bg-[#1a1a1a] border-b-4 border-white/5 active:border-b-0 active:translate-y-1 p-4 rounded-2xl transition-all font-black text-sm flex flex-col items-center gap-2"><Sparkles size={20} className="text-yellow-400"/> Explain</button>
                  <button onClick={() => handleAskMentor('quiz')} className="bg-[#111] hover:bg-[#1a1a1a] border-b-4 border-white/5 active:border-b-0 active:translate-y-1 p-4 rounded-2xl transition-all font-black text-sm flex flex-col items-center gap-2"><GraduationCap size={20} className="text-green-400"/> Quiz (+25 XP)</button>
                </div>
             </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl p-4 text-sm font-medium ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#151515] border border-white/5 text-gray-200 rounded-bl-sm'}`}>
                  {msg.quiz ? <InteractiveQuiz quiz={msg.quiz} userAnswer={msg.userAnswer} onAnswer={(ans) => handleQuizAnswer(idx, ans)} /> : msg.text ? (
                    msg.role === 'ai' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        h1: ({ children }) => <h1 className="text-lg font-black text-white mb-2">{children}</h1>,
                        h3: ({ children }) => <h3 className="text-xs font-black text-blue-400 mb-1 mt-3 uppercase tracking-wide">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                        strong: ({ children }) => <strong className="text-white font-black">{children}</strong>,
                        code({ inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="rounded-xl overflow-hidden my-3 border border-white/10"><SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: '1rem', background: '#0a0a0a', fontSize: '12px' }} {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter></div>
                          ) : <code className="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded-md font-mono text-xs" {...props}>{children}</code>;
                        },
                      }}>{msg.text}</ReactMarkdown>
                    ) : msg.text
                  ) : null}
                </div>
              </div>
            ))
          )}
          {isThinking && (
             <div className="flex justify-start"><div className="bg-[#151515] border border-white/5 px-5 py-4 rounded-2xl rounded-bl-sm flex gap-2 items-center"><span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"/><span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"/><span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"/></div></div>
          )}
        </div>

        <div className="p-4 bg-[#111] border-t border-white/5 shrink-0">
           <div className="relative">
             <input type="text" className="w-full bg-[#1a1a1a] border-2 border-white/5 rounded-2xl py-4 pl-4 pr-14 text-white font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 disabled:opacity-50" placeholder={activeMilestone ? "Ask the mentor..." : "Select milestone to chat"} value={chatInput} onChange={(e) => dispatch(setChatInput(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter' && !isStreaming) handleAskMentor('chat'); }} disabled={isStreaming || !activeMilestone} />
             <button onClick={() => handleAskMentor('chat')} disabled={isStreaming || !chatInput.trim() || !activeMilestone} className="absolute right-2 top-2 bottom-2 w-12 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:bg-gray-600 rounded-xl flex items-center justify-center border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all text-white">
               {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
             </button>
           </div>
        </div>
      </aside>

      {/* ── MODALS (XP GATE, RETRY GATE, TEST MODAL, ACHIEVEMENTS) ── */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border-2 border-white/10 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b-2 border-white/5 flex justify-between items-center"><h2 className="font-black text-xl flex items-center gap-2"><Trophy className="text-yellow-500"/> Badges</h2><button onClick={() => dispatch(setShowAchievements(false))} className="w-10 h-10 rounded-xl bg-white/5 active:translate-y-1 flex items-center justify-center"><X size={20} /></button></div>
            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 custom-scrollbar">
              {(userProgress?.achievements?.length || 0) === 0 ? <div className="col-span-full text-center py-10 text-gray-500 font-bold">No badges yet. Keep learning!</div> : userProgress?.achievements?.map((badge, i) => (
                <div key={i} className="bg-[#1a1a1a] border-b-4 border-white/5 rounded-2xl p-5 flex flex-col items-center text-center gap-2"><div className="text-4xl mb-2">{badge.badgeIcon}</div><h3 className="font-black text-white text-sm">{badge.badgeName}</h3><p className="text-xs text-gray-400 font-bold">{badge.description}</p></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showXpGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border-2 border-white/10 rounded-3xl max-w-sm w-full p-6 text-center">
             <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400"><Zap size={32}/></div>
             <h3 className="font-black text-white text-xl mb-2">{xpGateError ? 'Not Enough XP' : 'Generate Mission?'}</h3>
             <p className="text-gray-400 font-bold text-sm mb-6">{xpGateError || `Generating a new roadmap costs ${MISSION_XP_COST} XP.`}</p>
             <div className="flex gap-3">
                <button onClick={() => setShowXpGate(false)} className="flex-1 bg-[#222] text-white font-black py-3 rounded-xl border-b-4 border-[#000] active:border-b-0 active:translate-y-1 transition-all">Cancel</button>
                {!xpGateError && <button onClick={executeGenerate} disabled={loading} className="flex-[2] bg-blue-500 text-white font-black py-3 rounded-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin"/> : 'Confirm'}</button>}
             </div>
          </div>
        </div>
      )}

      {testRetryGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border-2 border-white/10 rounded-3xl max-w-sm w-full p-6 text-center">
             <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-400"><RefreshCw size={32}/></div>
             <h3 className="font-black text-white text-xl mb-2">Retry Test?</h3>
             <p className="text-gray-400 font-bold text-sm mb-6">Retrying requires <span className="text-orange-400">{TEST_RETRY_XP_COST} XP</span>.</p>
             {retryError && <p className="text-red-400 font-bold text-xs mb-4">{retryError}</p>}
             <div className="flex gap-3">
                <button onClick={() => { setTestRetryGate(null); setRetryError(''); }} className="flex-1 bg-[#222] text-white font-black py-3 rounded-xl border-b-4 border-[#000] active:border-b-0 active:translate-y-1 transition-all">Cancel</button>
                {canAffordRetry && <button onClick={handleRetryConfirm} disabled={retryLoading} className="flex-[2] bg-orange-500 text-white font-black py-3 rounded-xl border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2">{retryLoading ? <Loader2 className="animate-spin"/> : 'Retry'}</button>}
             </div>
          </div>
        </div>
      )}

      {testMilestone && <TestModal milestone={testMilestone} onClose={handleCloseTest} onComplete={handleTestComplete} />}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}