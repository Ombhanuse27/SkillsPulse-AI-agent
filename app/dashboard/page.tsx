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
  AlertCircle, Star, ChevronLeft,
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
  { label: 'Dashboard',        href: '/dashboard',        icon: Home,     color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { label: 'Career Architect', href: '/dashboard',        icon: Map,      color: 'text-green-400',  bg: 'bg-green-500/10'  },
  { label: 'Resume Audit',     href: '/resume-analyzer',  icon: FileText, color: 'text-sky-400',    bg: 'bg-sky-500/10'    },
  { label: 'AI Interviewer',   href: '/interview-prep',   icon: Brain,    color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

const MISSION_XP_COST = 100;
const TEST_RETRY_XP_COST = 50;
const PASSING_GRADES = new Set(['S', 'A', 'B']);

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; desc: string; emoji: string }> = {
  S: { label: 'S', color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', desc: 'Perfect Score! Master Level 🏆', emoji: '🏆' },
  A: { label: 'A', color: 'text-green-300',  bg: 'bg-green-500/15',  border: 'border-green-500/40',  desc: 'Excellent! You nailed it 🎯',  emoji: '🎯' },
  B: { label: 'B', color: 'text-blue-300',   bg: 'bg-blue-500/15',   border: 'border-blue-500/40',   desc: 'Good Job! Solid understanding 👍', emoji: '👍' },
  C: { label: 'C', color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/40', desc: 'Needs Review — revisit the topic 📖', emoji: '📖' },
  F: { label: 'F', color: 'text-red-300',    bg: 'bg-red-500/15',    border: 'border-red-500/40',    desc: 'Keep Studying — you got this 💪',  emoji: '💪' },
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
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-11 h-11 bg-[#0d0d0d] border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-xl"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#050505] border-r border-white/10 transition-all duration-300 ease-in-out shadow-2xl
          ${mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
      >
        <div className={`flex items-center border-b border-white/10 shrink-0 h-20 transition-all duration-300 ${collapsed ? 'px-3 justify-center' : 'px-6 justify-between'}`}>
          <Link href="/" className="flex items-center gap-3 font-black text-xl tracking-tighter group min-w-0">
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all">
              <Cpu size={18} className="text-white" />
            </div>
            {!collapsed && (
              <span className="truncate bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Skill<span className="text-blue-500">Pulse</span></span>
            )}
          </Link>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="hidden lg:flex w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-500 hover:text-white transition-all shrink-0">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="hidden lg:flex mx-auto mt-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 items-center justify-center text-gray-500 hover:text-white transition-all">
            <ChevronRight size={16} />
          </button>
        )}

        {!collapsed && <p className="px-6 pt-6 pb-3 text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">Menu</p>}

        <nav className={`flex-1 space-y-1.5 overflow-y-auto custom-scrollbar ${collapsed ? 'px-2 pt-4' : 'px-4'}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href && item.label === 'Dashboard';
            return (
              <Link
                key={item.label} href={item.href} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative
                  ${collapsed ? 'p-3 justify-center' : 'px-4 py-3'}
                  ${isCurrent ? `${item.bg} ${item.color} border border-white/10 shadow-inner` : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
                `}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all
                  ${isCurrent ? `${item.bg} scale-110 shadow-sm` : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-105'} ${item.color}`}
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
              <div className="flex items-center gap-2">
                {progress.stats.currentStreak > 0 && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-full px-2.5 py-1 text-[11px] font-bold text-orange-400 shadow-inner">
                    <Flame size={12} className="animate-pulse" />{progress.stats.currentStreak}d
                  </div>
                )}
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shadow-inner">
                  <Zap size={16} className="text-blue-400 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-white/5">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${xpPercentage}%` }}>
                 <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20 blur-[2px] rounded-full"></div>
              </div>
            </div>
            <p className="text-[10px] font-medium text-gray-500 text-right">{progress.stats.xpToNextLevel} XP to Lvl {progress.stats.level + 1}</p>
          </div>
        )}

        {progress?.stats && collapsed && (
          <div className="flex flex-col items-center gap-3 pb-4 px-2">
            <div title={`${progress.stats.totalXP.toLocaleString()} XP`} className="w-11 h-11 bg-blue-500/10 rounded-xl flex flex-col items-center justify-center border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
              <Zap size={16} className="text-blue-400" />
            </div>
            {progress.stats.currentStreak > 0 && (
              <div title={`${progress.stats.currentStreak} day streak`} className="w-11 h-11 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                <Flame size={16} className="text-orange-400 animate-pulse" />
              </div>
            )}
          </div>
        )}

        <div className={`border-t border-white/5 shrink-0 bg-black/20 ${collapsed ? 'p-3' : 'p-5'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shadow-lg border border-white/10">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button onClick={onLogout} title="Sign Out" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20">
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
              <button onClick={onLogout} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all shrink-0 border border-transparent hover:border-red-500/20" title="Sign Out">
                <LogOut size={15} />
              </button>
            </div>
          )}
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="group bg-[#0a0a0a] border border-white/5 shadow-lg p-5 rounded-3xl relative overflow-hidden hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 cursor-default">
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-blue-500/5 rounded-full group-hover:bg-blue-500/10 group-hover:scale-125 transition-all duration-500 blur-xl" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest mb-1">Level {stats.level}</p>
            <h3 className="text-2xl font-black text-white tabular-nums tracking-tight">{stats.totalXP.toLocaleString()}<span className="text-sm text-blue-400 font-bold ml-1">XP</span></h3>
          </div>
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all shadow-inner"><Zap size={20} /></div>
        </div>
        <div className="mt-4 w-full bg-black border border-white/5 h-1.5 rounded-full overflow-hidden relative z-10">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
        </div>
        <p className="text-[11px] text-gray-500 mt-2 font-medium relative z-10">{stats.xpToNextLevel} XP to Lvl {stats.level + 1}</p>
      </div>

      <div className="group bg-[#0a0a0a] border border-white/5 shadow-lg p-5 rounded-3xl relative overflow-hidden hover:border-orange-500/40 hover:-translate-y-1 transition-all duration-300 cursor-default">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-orange-500/5 rounded-full group-hover:bg-orange-500/10 group-hover:scale-125 transition-all duration-500 blur-xl" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest mb-1">Day Streak</p>
            <h3 className="text-2xl font-black text-white tabular-nums tracking-tight">{stats.currentStreak}<span className="ml-1 text-xl">🔥</span></h3>
          </div>
          <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 group-hover:scale-110 transition-all shadow-inner"><Flame size={20} /></div>
        </div>
        <p className="text-[11px] text-gray-500 mt-4 font-medium relative z-10">Don't break the chain!</p>
      </div>

      <div className="group bg-[#0a0a0a] border border-white/5 shadow-lg p-5 rounded-3xl relative overflow-hidden hover:border-green-500/40 hover:-translate-y-1 transition-all duration-300 cursor-default">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-green-500/5 rounded-full group-hover:bg-green-500/10 group-hover:scale-125 transition-all duration-500 blur-xl" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest mb-1">Daily Goal</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-black text-white tabular-nums tracking-tight">{dailyGoal?.minsCompleted || 0}</h3>
              <span className="text-gray-500 text-sm font-bold">/ {dailyGoal?.targetMins || 0}m</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center text-green-400 group-hover:bg-green-500/20 group-hover:scale-110 transition-all shadow-inner"><Target size={20} /></div>
        </div>
        <div className="mt-4 w-full bg-black border border-white/5 h-1.5 rounded-full overflow-hidden relative z-10">
          <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-700" style={{ width: `${dailyGoal?.progressPercentage || 0}%` }} />
        </div>
        <p className="text-[11px] text-gray-500 mt-2 font-medium relative z-10">{dailyGoal?.progressPercentage || 0}% complete today</p>
      </div>

      <button onClick={onShowAchievements} className="group bg-[#0a0a0a] border border-white/5 shadow-lg p-5 rounded-3xl relative overflow-hidden hover:border-yellow-500/40 hover:-translate-y-1 transition-all duration-300 text-left w-full active:scale-95">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-yellow-500/5 rounded-full group-hover:bg-yellow-500/10 group-hover:scale-125 transition-all duration-500 blur-xl" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest mb-1">Badges</p>
            <h3 className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors tabular-nums tracking-tight">{progress.achievements?.length || 0}</h3>
          </div>
          <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all shadow-inner"><Trophy size={20} /></div>
        </div>
        <p className="text-[11px] font-bold text-gray-500 mt-4 flex items-center gap-1 group-hover:text-yellow-400 transition-colors relative z-10">
          View Gallery <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </p>
      </button>
    </div>
  );
}

function InteractiveQuiz({ quiz, userAnswer, onAnswer }: { quiz: QuizData; userAnswer?: number; onAnswer: (index: number) => void; }) {
  const answered = userAnswer !== undefined;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-blue-400 mb-3"><GraduationCap size={20} /><h4 className="font-bold">Knowledge Check</h4></div>
      <p className="text-white font-medium mb-4 leading-relaxed">{quiz.question}</p>
      <div className="space-y-2.5">
        {quiz.options.map((option, index) => {
          const isCorrect = index === quiz.correctIndex;
          const isUserChoice = index === userAnswer;
          let bgClass = 'bg-[#111] hover:bg-white/5';
          let borderClass = 'border-white/10';
          let textClass = 'text-gray-300';
          
          if (answered) {
            if (isCorrect) { bgClass = 'bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]'; borderClass = 'border-green-500/50'; textClass = 'text-green-300'; }
            else if (isUserChoice && !isCorrect) { bgClass = 'bg-red-500/10'; borderClass = 'border-red-500/50'; textClass = 'text-red-300'; }
            else { bgClass = 'bg-black/50 opacity-50'; borderClass = 'border-transparent'; }
          }

          return (
            <button key={index} onClick={() => !answered && onAnswer(index)} disabled={answered} className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${bgClass} ${borderClass} ${answered ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0
                  ${answered && isCorrect ? 'bg-green-500/20 border-green-500 text-green-400' : answered && isUserChoice && !isCorrect ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-gray-400'}
                `}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className={`text-sm font-medium ${textClass}`}>{option}</span>
                {answered && isCorrect && <CheckCircle size={18} className="ml-auto text-green-400 shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-5 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-blue-200 leading-relaxed"><strong className="text-blue-400 uppercase tracking-widest text-[10px] block mb-1">Explanation</strong> {quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ pct, size = 48, stroke = 4, color = '#3b82f6' }: { pct: number; size?: number; stroke?: number; color?: string; }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') return <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full shadow-sm">Done</span>;
  if (status === 'in_progress') return <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />Active</span>;
  return null;
}

function GradePill({ testResult }: { testResult: TestResult }) {
  const cfg = GRADE_CONFIG[testResult.grade] ?? GRADE_CONFIG['F'];
  const isPassed = PASSING_GRADES.has(testResult.grade);
  return (
    <span
      title={`${cfg.desc} · ${testResult.attempts} attempt${testResult.attempts !== 1 ? 's' : ''}`}
      className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border} cursor-default shrink-0 shadow-sm`}
    >
      {isPassed ? <CheckCircle size={10} className="opacity-80" /> : <Star size={10} className="opacity-80" />}
      {testResult.score}/{testResult.total} · {testResult.grade}
    </span>
  );
}

// ─── TEST MODAL (Kept identical to original but styled) ────────────────────────
// (Using your exact existing logic for TestModal to save space, but ensuring it matches the new styling if needed. Left as is per your code since it was already robust, just needs the parent to trigger it properly.)
// ... [TestModal and TestButton remain exactly the same as they were fully functional] ...
// Copying them back to ensure code is complete:
function TestModal({ milestone, onClose, onComplete }: any) {
  // ... existing implementation ...
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
        const res = await fetch('/api/generate-test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneTitle: milestone.title, milestoneDescription: milestone.description }),
        });
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
    if (currentQ < questions.length - 1) { setCurrentQ(currentQ + 1); }
    else {
      const answers = questions.map((q, i) => ({ questionIndex: i, selectedIndex: selectedAnswers[i] ?? -1, correctIndex: q.correctIndex, isCorrect: selectedAnswers[i] === q.correctIndex }));
      onComplete(score, questions.length, answers); setPhase('results');
    }
  };
  const difficultyColor = (d: string) => d === 'easy' ? 'text-green-400 bg-green-500/10 border-green-500/20' : d === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-purple-900/20 to-blue-900/10">
          <div className="min-w-0">
            <h2 className="font-black text-white flex items-center gap-3 text-base">
              <div className="w-8 h-8 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center"><ClipboardList size={16} className="text-purple-400" /></div>
              Adaptive Assessment
            </h2>
            <p className="text-xs text-gray-400 truncate mt-1 max-w-[380px] font-medium">{milestone.title}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-32 gap-5">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative">
                <div className="absolute inset-0 border-2 border-purple-500/50 rounded-2xl animate-ping opacity-20"></div>
                <Loader2 size={28} className="text-purple-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white text-base font-black tracking-tight">Generating tailored questions...</p>
                <p className="text-gray-500 text-sm mt-1">Analyzing milestone context</p>
              </div>
            </div>
          )}

          {phase === 'questions' && questions.length > 0 && (
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  {questions.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i < currentQ ? 'w-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : i === currentQ ? 'w-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-full bg-white/10'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500">Q{currentQ + 1}/{questions.length}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${difficultyColor(questions[currentQ]?.difficulty || 'easy')}`}>
                    {questions[currentQ]?.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-white font-bold text-lg leading-relaxed mb-6">{questions[currentQ]?.question}</p>

              <div className="space-y-3">
                {questions[currentQ]?.options.map((opt, idx) => {
                  const answered = selectedAnswers[currentQ] !== null;
                  const isSelected = selectedAnswers[currentQ] === idx;
                  const isCorrect = idx === questions[currentQ].correctIndex;
                  let cls = 'bg-[#111] border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20 cursor-pointer';
                  if (answered) {
                    if (isCorrect) cls = 'bg-green-500/10 border-green-500/50 text-green-300 cursor-default shadow-[0_0_20px_rgba(34,197,94,0.1)]';
                    else if (isSelected) cls = 'bg-red-500/10 border-red-500/50 text-red-300 cursor-default';
                    else cls = 'bg-black/50 border-transparent text-gray-600 cursor-default opacity-40';
                  }
                  return (
                    <button key={idx} onClick={() => handleSelect(idx)} disabled={selectedAnswers[currentQ] !== null} className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 ${cls} ${!answered && 'active:scale-[0.99]'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${answered && isCorrect ? 'bg-green-500 text-black shadow-lg shadow-green-500/30' : answered && isSelected && !isCorrect ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm md:text-base font-medium leading-relaxed">{opt}</span>
                        {answered && isCorrect && <CheckCircle size={20} className="ml-auto text-green-400 shrink-0" />}
                        {answered && isSelected && !isCorrect && <X size={20} className="ml-auto text-red-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showExplanation && selectedAnswers[currentQ] !== null && (
                <div className={`mt-6 p-5 rounded-2xl border animate-in slide-in-from-top-2 fade-in duration-300 ${selectedAnswers[currentQ] === questions[currentQ].correctIndex ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                  <p className={`text-sm font-black mb-2 flex items-center gap-2 ${selectedAnswers[currentQ] === questions[currentQ].correctIndex ? 'text-green-400' : 'text-orange-400'}`}>
                    {selectedAnswers[currentQ] === questions[currentQ].correctIndex ? <><CheckCircle size={16}/> Correct!</> : <><AlertCircle size={16}/> Not quite</>}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">{questions[currentQ].explanation}</p>
                </div>
              )}

              {selectedAnswers[currentQ] !== null && (
                <button onClick={handleNext} className="mt-8 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-base shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-1">
                  {currentQ < questions.length - 1 ? <>Next Question <ChevronRight size={20} /></> : <><Trophy size={20} /> Submit Assessment</>}
                </button>
              )}
            </div>
          )}

          {phase === 'results' && (
            <div className="p-8">
              <div className={`rounded-3xl border p-8 text-center mb-8 relative overflow-hidden ${gradeConfig.bg} ${gradeConfig.border}`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className={`text-8xl font-black mb-4 tracking-tighter drop-shadow-2xl ${gradeConfig.color}`}>{gradeConfig.label}</div>
                <p className={`text-lg font-bold mb-2 ${gradeConfig.color}`}>{gradeConfig.desc}</p>
                <p className="text-gray-400 text-sm font-medium">{score}/{questions.length} correct answers</p>
                
                <div className="flex justify-center gap-3 mt-6">
                  <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-sm font-bold text-blue-400 shadow-inner">
                    <Zap size={16} />+{xpEarned} XP
                  </div>
                  {!isPassed ? (
                    <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2 text-sm font-bold text-orange-400 shadow-inner">
                      <RefreshCw size={14} />Retry available ({TEST_RETRY_XP_COST} XP)
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 text-sm font-bold text-green-400 shadow-inner">
                      <CheckCircle size={14} />Milestone Passed!
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ClipboardList size={14}/> Assessment Breakdown</p>
                {questions.map((q, i) => {
                  const isCorrect = selectedAnswers[i] === q.correctIndex;
                  return (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-red-500 shadow-lg shadow-red-500/30'}`}>
                        {isCorrect ? <CheckCircle size={14} className="text-black" /> : <X size={14} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium leading-relaxed mb-1">{q.question}</p>
                        {!isCorrect && <p className="text-xs text-gray-400 mt-1.5 p-2.5 bg-black/50 rounded-xl border border-white/5">Correct: <span className="text-green-400 font-medium">{q.options[q.correctIndex]}</span></p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all text-base shadow-lg active:scale-95">
                Close Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TestButton({ milestone, localTestResults, onOpenTest }: any) {
  const testResult: TestResult | undefined = localTestResults[milestone.id] ?? milestone.progress?.testResult;
  if (!testResult) {
    return (
      <button onClick={() => onOpenTest(milestone)} className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 px-3 py-2 rounded-xl flex gap-1.5 items-center transition-all font-bold shadow-sm active:scale-95">
        <ClipboardList size={12} />Take Test
      </button>
    );
  }
  const isPassed = PASSING_GRADES.has(testResult.grade);
  const cfg = GRADE_CONFIG[testResult.grade] ?? GRADE_CONFIG['F'];

  if (isPassed) {
    return (
      <span title={`${cfg.desc} · ${testResult.score}/${testResult.total}`} className={`text-xs px-3 py-2 rounded-xl flex gap-1.5 items-center border font-black cursor-default shadow-sm ${cfg.color} ${cfg.bg} ${cfg.border}`}>
        <Trophy size={12} />Grade {testResult.grade}
      </span>
    );
  }
  return (
    <button onClick={() => onOpenTest(milestone)} title={`Retry costs ${TEST_RETRY_XP_COST} XP.`} className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:border-orange-500/40 px-3 py-2 rounded-xl flex gap-1.5 items-center transition-all font-bold shadow-sm active:scale-95">
      <RefreshCw size={12} />Retry <span className="opacity-60 font-medium">({TEST_RETRY_XP_COST} XP)</span>
    </button>
  );
}

// ─── ROADMAP CARD ─────────────────────────────────────────────────────────────
function RoadmapCard({
  map, isExpanded, onToggle, onMilestoneClick, onStartMilestone, onCompleteMilestone,
  onTrackResource, onAskMentor, onOpenTest, isDailyCourse, localTestResults,
}: any) {
  const completedCount = map.milestones.filter((m: any) => m.progress?.status === 'completed').length;
  const pct = map.completionPercentage;
  const inProgressCount = map.milestones.filter((m: any) => m.progress?.status === 'in_progress').length;

  return (
    <div className={`bg-[#0a0a0a] border rounded-3xl overflow-hidden transition-all duration-500 ${isExpanded ? 'border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] my-6' : 'border-white/5 hover:border-white/10 hover:shadow-xl shadow-black/50'}`}>
      <button onClick={onToggle} className="w-full px-6 py-5 flex items-center gap-5 text-left group">
        <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
          <ProgressRing pct={pct} size={56} stroke={4} color={pct === 100 ? '#22c55e' : '#3b82f6'} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{pct}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-black text-white group-hover:text-blue-400 transition-colors truncate tracking-tight">{map.title}</h3>
            {isDailyCourse && <span className="shrink-0 text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest font-black shadow-sm">Intensive</span>}
            {pct === 100 && <span className="shrink-0 text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-md uppercase tracking-widest font-black flex items-center gap-1 shadow-sm"><Trophy size={10} />Mastered</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><ClipboardList size={12}/> {completedCount}/{map.milestones.length} milestones</span>
            {inProgressCount > 0 && <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />{inProgressCount} Active</span>}
          </div>
        </div>
        
        <div className={`shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/10 transition-all border border-white/5 group-hover:border-white/10 ${isExpanded ? 'rotate-180 bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}`}>
          <ChevronDown size={18} />
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-white/5 px-6 pb-6 pt-5 relative bg-[#050505]/50">
          {/* Main vertical timeline line */}
          <div className="absolute left-[2.1rem] top-8 bottom-8 w-[2px] bg-white/5 rounded-full"></div>

          {map.milestones.map((milestone: any, idx: number) => {
            const status = milestone.progress?.status || 'not_started';
            const isLocked = idx > 0 && map.milestones[idx - 1].progress?.status !== 'completed';
            const isLast = idx === map.milestones.length - 1;
            const testResult: TestResult | undefined = localTestResults[milestone.id] ?? milestone.progress?.testResult;

            // Compute if the segment above this milestone should be colored
            const isTimelineActive = status === 'completed' || status === 'in_progress';

            return (
              <div key={idx} className={`relative pl-12 transition-all duration-500 ${isLocked ? 'opacity-40 grayscale' : 'opacity-100'} ${isLast ? '' : 'pb-8'}`}>
                
                {/* Timeline connection glow for active paths */}
                {!isLast && isTimelineActive && (
                  <div className={`absolute left-[-15px] top-6 bottom-[-24px] w-[2px] rounded-full z-0 transition-all duration-1000 ${status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} style={{ transform: 'translateX(2.1rem)' }}></div>
                )}

                {/* Node circle */}
                <div
                  onClick={() => !isLocked && onMilestoneClick(milestone)}
                  className={`absolute left-0 top-0 w-8 h-8 rounded-full border-[3px] flex items-center justify-center text-[10px] font-black z-10 transition-all duration-300 ${
                    status === 'completed' ? 'bg-green-500 border-[#050505] text-black shadow-[0_0_15px_rgba(34,197,94,0.6)] scale-110' :
                    status === 'in_progress' ? 'bg-blue-500 border-[#050505] text-white shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse scale-110' :
                    isLocked ? 'bg-[#111] border-white/10 text-gray-700' :
                    'bg-[#111] border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400'
                  } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {status === 'completed' ? <CheckCircle size={14} /> : isLocked ? <Lock size={12} /> : status === 'in_progress' ? <Play size={10} fill="currentColor" className="ml-0.5" /> : <span>{idx + 1}</span>}
                </div>

                <div className={`group/ms bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5'}`} onClick={() => !isLocked && onMilestoneClick(milestone)}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h4 className={`font-black text-base transition-colors tracking-tight ${!isLocked ? 'group-hover/ms:text-blue-400' : ''} ${status === 'completed' ? 'text-gray-400 line-through decoration-gray-600/50' : 'text-white'}`}>
                          {milestone.title}
                        </h4>
                        <StatusPill status={status} />
                        {testResult && <GradePill testResult={testResult} />}
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed mt-2">{milestone.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                      <Clock size={12} className="text-blue-400" />
                      {isDailyCourse ? `Day ${idx + 1}` : `Week ${milestone.week || idx + 1}`}
                      <span className="text-white/20">|</span>
                      {milestone.estimatedHours}h
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex gap-2.5 mt-5 flex-wrap items-center pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      {status === 'not_started' && (
                        <button onClick={() => onStartMilestone(milestone)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 hover:-translate-y-0.5">
                          <Play size={12} fill="currentColor" />Start Milestone
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <button onClick={() => onCompleteMilestone(milestone)} className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 hover:-translate-y-0.5">
                          <CheckCircle size={12} />Mark Mastered
                        </button>
                      )}
                      
                      <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
                      
                      <button onClick={() => onAskMentor('explain', milestone)} className="text-xs bg-white/5 hover:bg-yellow-500/10 text-gray-300 hover:text-yellow-300 border border-white/10 hover:border-yellow-500/30 px-3 py-2 rounded-xl flex gap-1.5 items-center transition-all font-medium active:scale-95">
                        <Sparkles size={12} className="text-yellow-400" />Explain
                      </button>
                      <button onClick={() => onAskMentor('quiz', milestone)} className="text-xs bg-white/5 hover:bg-green-500/10 text-gray-300 hover:text-green-300 border border-white/10 hover:border-green-500/30 px-3 py-2 rounded-xl flex gap-1.5 items-center transition-all font-medium active:scale-95">
                        <GraduationCap size={12} className="text-green-400" />Quiz Me
                      </button>
                      <button onClick={() => onMilestoneClick(milestone)} className="text-xs bg-white/5 hover:bg-blue-500/10 text-gray-300 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 px-3 py-2 rounded-xl flex gap-1.5 items-center transition-all font-medium active:scale-95">
                        <MessageSquare size={12} className="text-blue-400" />Ask AI
                      </button>
                      
                      <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />
                      <TestButton milestone={milestone} localTestResults={localTestResults} onOpenTest={onOpenTest} />
                    </div>
                  )}

                  {milestone.resources && milestone.resources.length > 0 && !isLocked && (
                    <div className="mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Curated Resources</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {milestone.resources.map((res: any, rId: number) => {
                          const isViewed = milestone.progress?.resourcesViewed?.includes(res.id || res.url);
                          return (
                            <a key={rId} href={res.url} target="_blank" rel="noopener noreferrer" onClick={() => onTrackResource(milestone, res.id || res.url)}
                              className={`flex items-center gap-3 border p-3 rounded-xl transition-all group/link text-sm ${isViewed ? 'bg-blue-900/10 border-blue-500/20 text-blue-200' : 'bg-black hover:bg-white/5 border-white/5 hover:border-white/20 text-gray-300 hover:text-white shadow-inner'}`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isViewed ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400 group-hover/link:bg-white/10 group-hover/link:text-white'}`}>
                                {res.type === 'YOUTUBE' && <Video size={14} className={isViewed ? '' : "text-red-400"} />}
                                {res.type === 'GITHUB' && <Code size={14} />}
                                {res.type === 'INTERACTIVE' && <Play size={14} className={isViewed ? '' : "text-green-400"} />}
                                {res.type === 'ARTICLE' && <BookOpen size={14} className={isViewed ? '' : "text-blue-400"} />}
                                {!['YOUTUBE', 'GITHUB', 'INTERACTIVE', 'ARTICLE'].includes(res.type) && <ExternalLink size={14} />}
                              </div>
                              <span className="flex-1 truncate font-medium">{res.title}</span>
                              {isViewed ? <CheckCircle size={14} className="text-blue-500 shrink-0" /> : <ChevronRight size={14} className="text-gray-600 group-hover/link:text-white shrink-0 transition-colors" />}
                            </a>
                          );
                        })}
                      </div>
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

  const [inputFocused, setInputFocused] = useState(false);
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
  }, [dispatch, router, supabase.auth]);

  useEffect(() => {
    if (roadmaps.length > 0 && expandedRoadmaps.size === 0) setExpandedRoadmaps(new Set([roadmaps[0].id]));
  }, [roadmaps, expandedRoadmaps.size]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory, isStreaming, isThinking]);

  useEffect(() => {
    if (activeMilestone) dispatch(setShowWelcome(chatHistory.length === 0));
  }, [activeMilestone, chatHistory.length, dispatch]);

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
      setXpGateError(`You need ${MISSION_XP_COST} XP to start a new mission. Earn more XP by completing milestones, quizzes, and daily goals!`);
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
    const localResult = localTestResults[milestone.id];
    const reduxResult: TestResult | undefined = milestone.progress?.testResult;
    const testResult = localResult ?? reduxResult;

    if (testResult) {
      const isPassed = PASSING_GRADES.has(testResult.grade);
      if (isPassed) return;
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
      setRetryError(`You need ${TEST_RETRY_XP_COST} XP to retry. You have ${userProgress?.stats?.totalXP ?? 0} XP.`);
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
      if (!data.success) { setRetryError(data.error || 'Failed to deduct XP. Please try again.'); setRetryLoading(false); return; }
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

      if (res.status === 403) {
        console.warn('submit_test blocked: milestone already passed');
        return;
      }

      if (data.success) {
        const prevAttempts = (localTestResults[testMilestone.id]?.attempts ?? testMilestone.progress?.testResult?.attempts ?? 0);
        const newResult: TestResult = {
          grade: data.grade,
          score: data.score,
          total: data.total,
          attempts: data.attempts ?? prevAttempts + 1,
          passed: data.passed,
          xpEarned: data.xpEarned,
          lastAttemptAt: new Date().toISOString(),
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
    
    // Automatically open mentor sidebar on mobile if hidden
    if (!activeMilestone) dispatch(openMilestone(targetMilestone));

    dispatch(setIsStreaming(true));
    dispatch(setIsThinking(true));
    dispatch(setChatInput(''));
    dispatch(setShowWelcome(false));
    
    let displayMsg = userMsg;
    if (mode === 'quiz') displayMsg = '🎲 Generate a quiz to test my knowledge';
    if (mode === 'explain') displayMsg = '💡 Explain the core concepts of this topic clearly';
    
    const newUserMessage: ChatMessage = { role: 'user', text: displayMsg };
    dispatch(appendChatMessage(newUserMessage));
    handleProgressAction('update_daily_progress', { minsSpent: 1 });
    const historyForAPI = [...chatHistory, newUserMessage].map((msg) => ({ role: msg.role, text: msg.text || '' }));
    
    try {
      const response = await fetch('/api/mentor-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse">
            <Cpu size={32} className="text-white" />
          </div>
          <div className="flex flex-col items-center gap-2">
             <Loader2 className="animate-spin text-blue-400" size={24} />
             <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Initializing Core...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <Navbar user={user} onLogout={handleLogout} progress={userProgress ?? undefined} />

      <div className="lg:ml-64 transition-all duration-300 relative z-10">
        <div className="flex min-h-screen">
          {/* Main Content Area adjusts based on activeMilestone presence on XL screens */}
          <div className={`flex-1 transition-all duration-500 ease-in-out ${activeMilestone ? 'xl:mr-[460px] 2xl:mr-[500px]' : ''}`}>
            <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-20 lg:pt-10 pb-12">

              {/* Header */}
              <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-gray-400 bg-clip-text text-transparent">
                  Learning Architect
                </h1>
                <p className="text-gray-400 text-base mt-2">
                  Welcome back, <span className="text-gray-200 font-bold">{user?.email?.split('@')[0]}</span>. 
                  {userProgress?.stats?.currentStreak
                    ? ` Your momentum is building with a ${userProgress.stats.currentStreak}-day streak! 🔥`
                    : " Ready to accelerate your career today?"}
                </p>
              </div>

              {userProgress && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                   <StatsBar progress={userProgress} onShowAchievements={() => dispatch(setShowAchievements(true))} />
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                {/* New Mission Creator */}
                <div className="xl:col-span-4">
                  <div className={`bg-[#050505]/80 backdrop-blur-xl border rounded-3xl p-6 lg:p-8 sticky top-10 transition-all duration-500 shadow-2xl relative overflow-hidden group ${inputFocused ? 'border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)]' : 'border-white/10 hover:border-white/20'}`}>
                    
                    {/* Magical top border glow */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0 transition-opacity opacity-30 group-hover:opacity-100" />
                    
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20 shadow-inner">
                        <Zap size={20} className="text-yellow-400" />
                      </div>
                      Mission Control
                    </h2>
                    <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                      Define your objective. Our AI will compile an adaptive syllabus instantly.
                    </p>
                    
                    {!isMissionFree && (
                      <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border mb-5 shadow-sm ${canAffordMission ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                        <Zap size={12} />
                        {canAffordMission
                          ? `Generates for ${MISSION_XP_COST} XP`
                          : `Need ${MISSION_XP_COST} XP (You have ${userProgress?.stats?.totalXP ?? 0})`}
                      </div>
                    )}
                    {isMissionFree && (
                      <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 mb-5 shadow-sm">
                        <Sparkles size={12} />Your first mission is free!
                      </div>
                    )}

                    <div className="relative">
                       <textarea
                        className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-white text-base min-h-[140px] focus:outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none placeholder:text-gray-600 shadow-inner leading-relaxed"
                        placeholder="e.g., Learn Advanced React Patterns in 2 weeks..."
                        value={goal}
                        onChange={(e) => dispatch(setGoal(e.target.value))}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-1 items-center bg-white/5 px-2 py-1 rounded-md border border-white/5 pointer-events-none">
                         <span className="text-[10px] text-gray-500 font-bold font-mono">CTRL + ENTER</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerate}
                      disabled={loading || !goal.trim() || (!isMissionFree && !canAffordMission)}
                      className={`w-full mt-5 relative overflow-hidden font-black text-base py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl ${!isMissionFree && !canAffordMission ? 'bg-red-900/20 text-red-300 border border-red-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/30 hover:-translate-y-1'}`}
                    >
                      {!loading && (!isMissionFree ? canAffordMission : true) && (
                         <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      )}
                      {loading
                        ? <><Loader2 className="animate-spin text-blue-300" size={18} />Synthesizing Path…</>
                        : !isMissionFree && !canAffordMission
                          ? <><Lock size={18} />Insufficient XP</>
                          : <><Sparkles size={18} className="group-hover:animate-pulse"/> Generate Architecture</>
                      }
                    </button>

                    <div className="mt-6">
                       <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3">Quick Prompts</p>
                      <div className="space-y-2">
                        {['Master System Design for Interviews', 'Fullstack Next.js Bootcamp', 'Deep Learning Basics'].map((tip) => (
                          <button key={tip} onClick={() => dispatch(setGoal(tip))} className="w-full text-left text-xs font-medium text-gray-400 hover:text-blue-300 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all flex items-center gap-2 group/btn">
                             <ChevronRight size={14} className="text-gray-600 group-hover/btn:text-blue-400 transition-colors" /> {tip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roadmaps List */}
                <div className="xl:col-span-8 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar pb-20">
                  {roadmaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-32 text-gray-700 bg-[#0a0a0a]/50 rounded-3xl border border-white/5 shadow-inner">
                      <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-6 shadow-lg"><BookOpen size={40} className="text-gray-600" /></div>
                      <p className="text-2xl font-black text-white mb-2">No active missions.</p>
                      <p className="text-base text-gray-500 max-w-sm">Use Mission Control to generate your first adaptive learning path and start earning XP.</p>
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
                          onMilestoneClick={(m:any) => dispatch(openMilestone(m))}
                          onStartMilestone={startMilestone}
                          onCompleteMilestone={completeMilestone}
                          onTrackResource={trackResourceView}
                          onAskMentor={handleAskMentor}
                          onOpenTest={handleOpenTest}
                          isDailyCourse={isDailyCourse}
                          localTestResults={localTestResults}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── STREAMING NEURAL MENTOR OVERLAY/SIDEBAR ── */}
          {/* Overlay for mobile/tablet when sidebar is active */}
          {activeMilestone && (
             <div 
               className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 xl:hidden transition-opacity duration-300" 
               onClick={() => dispatch(closeMentor())}
             />
          )}

          <div className={`fixed inset-y-0 right-0 w-full sm:w-[440px] xl:w-[460px] 2xl:w-[500px] bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 transform transition-transform duration-500 ease-in-out shadow-2xl z-40 flex flex-col top-0 ${activeMilestone ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Mentor Header */}
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/10 shrink-0 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="min-w-0">
                <h3 className="font-black text-white flex items-center gap-3 text-base">
                  <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-inner">
                    <Sparkles size={16} className="text-blue-400" />
                  </div>
                  Streaming Neural Mentor
                </h3>
                <p className="text-xs text-gray-400 truncate mt-1 max-w-[300px] font-medium">{activeMilestone?.title}</p>
              </div>
              <button onClick={() => dispatch(closeMentor())} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={20} /></button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" ref={chatScrollRef}>
              {showWelcome && chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] space-y-8 animate-in fade-in duration-700">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                    <div className="w-20 h-20 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                      <Brain size={36} className="text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-white text-2xl mb-3 tracking-tight">Active Learning Session</h4>
                    <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">I have deep context on this milestone. Ask me anything, request an explanation, or test your skills.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-[320px]">
                    <button onClick={() => handleAskMentor('explain')} className="bg-gradient-to-br from-[#111] to-yellow-900/10 border border-white/10 hover:border-yellow-500/40 p-5 rounded-2xl transition-all flex flex-col items-center gap-3 group shadow-lg hover:-translate-y-1">
                      <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:scale-110 transition-transform"><Sparkles size={24} className="text-yellow-400" /></div>
                      <div className="text-center">
                         <span className="font-bold text-gray-200 group-hover:text-yellow-300 block mb-0.5">Deep Dive</span>
                         <span className="text-[11px] text-gray-500 font-medium">Explain concepts</span>
                      </div>
                    </button>
                    <button onClick={() => handleAskMentor('quiz')} className="bg-gradient-to-br from-[#111] to-green-900/10 border border-white/10 hover:border-green-500/40 p-5 rounded-2xl transition-all flex flex-col items-center gap-3 group shadow-lg hover:-translate-y-1">
                      <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform"><GraduationCap size={24} className="text-green-400" /></div>
                      <div className="text-center">
                         <span className="font-bold text-gray-200 group-hover:text-green-300 block mb-0.5">Quiz Me</span>
                         <span className="text-[11px] text-green-500 font-bold">+25 XP reward</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[90%] rounded-3xl p-5 text-sm md:text-base leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[#111] text-gray-300 border border-white/10 rounded-bl-sm'}`}>
                    {msg.quiz ? (
                      <InteractiveQuiz quiz={msg.quiz} userAnswer={msg.userAnswer} onAnswer={(answerIndex) => handleQuizAnswer(idx, answerIndex)} />
                    ) : msg.text ? (
                      msg.role === 'ai' ? (
                        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/10">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            h1: ({ children }) => <h1 className="text-lg font-black text-white mb-4 pb-2 border-b border-white/10 tracking-tight">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-black text-white mb-3 mt-6">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xs font-black text-blue-400 mb-2 mt-5 uppercase tracking-widest">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-blue-500">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-blue-500">{children}</ol>,
                            li: ({ children }) => <li className="pl-1 text-gray-300">{children}</li>,
                            p: ({ children }) => <p className="mb-4 last:mb-0 text-gray-300">{children}</p>,
                            strong: ({ children }) => <strong className="text-white font-black">{children}</strong>,
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <div className="rounded-xl overflow-hidden my-5 border border-white/10 shadow-2xl">
                                  <div className="bg-[#1a1a1a] px-4 py-2 text-[10px] font-black tracking-widest text-gray-400 border-b border-white/5 uppercase flex items-center gap-2">
                                     <Code size={12}/> {match[1]}
                                  </div>
                                  <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: '1rem', background: '#050505', fontSize: '13px', lineHeight: '1.6' }} {...props}>
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                </div>
                              ) : <code className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded-md font-mono text-xs border border-blue-500/20" {...props}>{children}</code>;
                            },
                          }}>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      ) : msg.text
                    ) : null}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="bg-[#111] px-5 py-4 rounded-3xl rounded-bl-sm flex items-center gap-4 border border-white/10 shadow-lg">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                       <Brain className="text-blue-400 animate-pulse" size={16} />
                    </div>
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.8)]" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.8)]" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_8px_rgba(96,165,250,0.8)]" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-5 border-t border-white/10 bg-[#050505] shrink-0 relative z-20">
              {chatHistory.length > 0 && !isStreaming && (
                <div className="flex gap-2.5 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                  {[{ label: '💡 Explain in more detail', mode: 'explain' as const }, { label: '🎲 Test my knowledge', mode: 'quiz' as const }].map((pill) => (
                    <button key={pill.label} onClick={() => handleAskMentor(pill.mode)} className="shrink-0 text-xs font-bold text-gray-400 hover:text-white bg-[#111] hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95">{pill.label}</button>
                  ))}
                </div>
              )}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
                <input
                  type="text"
                  className="w-full relative bg-[#0a0a0a] border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm md:text-base text-white focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-600 shadow-inner"
                  placeholder="Ask the AI mentor anything..."
                  value={chatInput}
                  onChange={(e) => dispatch(setChatInput(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isStreaming) handleAskMentor('chat'); }}
                  disabled={isStreaming}
                />
                <button onClick={() => handleAskMentor('chat')} disabled={isStreaming || !chatInput.trim()} className="absolute right-2 top-2 bottom-2 w-12 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md">
                  {isStreaming ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="text-white ml-1" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACHIEVEMENTS MODAL ── */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-yellow-900/10 to-transparent">
              <h2 className="font-black text-xl flex items-center gap-3"><Trophy className="text-yellow-500" size={24} /> Trophy Room</h2>
              <button onClick={() => dispatch(setShowAchievements(false))} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 custom-scrollbar bg-[#050505]">
              {(userProgress?.achievements?.length || 0) === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-600">
                  <Award size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-black text-lg">No badges yet.</p>
                  <p className="text-sm mt-2">Complete milestones and pass adaptive tests to fill your gallery!</p>
                </div>
              ) : userProgress?.achievements?.map((badge, i) => (
                <div key={i} className="bg-[#111] border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all shadow-lg group">
                  <div className="text-5xl mb-2 group-hover:scale-110 transition-transform drop-shadow-xl">{badge.badgeIcon}</div>
                  <h3 className="font-black text-white text-sm">{badge.badgeName}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MISSION XP GATE MODAL ── */}
      {showXpGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            {xpGateError ? (
              <>
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock size={32} className="text-red-400" /></div>
                <h3 className="font-black text-white text-center text-2xl mb-3">Insufficient XP</h3>
                <p className="text-gray-400 text-sm text-center leading-relaxed mb-8">{xpGateError}</p>
                <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0"><Zap size={24} className="text-red-400" /></div>
                  <div>
                    <p className="text-sm font-black text-red-300">Balance: {userProgress?.stats?.totalXP ?? 0} XP</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Requires {MISSION_XP_COST} XP to execute</p>
                  </div>
                </div>
                <button onClick={() => setShowXpGate(false)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all text-base active:scale-95">Acknowledge</button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><Zap size={32} className="text-blue-400 animate-pulse" /></div>
                <h3 className="font-black text-white text-center text-2xl mb-3">Launch Mission?</h3>
                <p className="text-gray-400 text-sm text-center leading-relaxed mb-8">
                  Synthesizing a new learning matrix requires <span className="text-blue-400 font-bold px-1">{MISSION_XP_COST} XP</span>.
                </p>
                <div className="bg-black border border-white/5 rounded-2xl p-5 mb-8 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3"><Zap size={18} className="text-blue-400" /><span className="text-sm font-bold text-gray-400">XP Balance</span></div>
                  <div className="flex items-center gap-3 text-sm font-black">
                    <span className="text-white">{userProgress?.stats?.totalXP ?? 0}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-blue-400">{(userProgress?.stats?.totalXP ?? 0) - MISSION_XP_COST}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowXpGate(false)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all text-base active:scale-95">Abort</button>
                  <button onClick={executeGenerate} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> Execute</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TEST RETRY GATE MODAL ── */}
      {testRetryGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            {(() => {
              const prev: TestResult = localTestResults[testRetryGate.milestone.id] ?? testRetryGate.milestone.progress?.testResult;
              const cfg = GRADE_CONFIG[prev?.grade ?? 'F'];
              return (
                <>
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 shadow-lg ${cfg.bg} ${cfg.border}`}>
                    <span className={`text-4xl font-black ${cfg.color}`}>{prev?.grade ?? 'F'}</span>
                  </div>
                  <h3 className="font-black text-white text-center text-2xl mb-2">Retry Assessment?</h3>
                  <p className="text-gray-400 text-sm text-center mb-2">
                    Previous score: <span className={`font-bold ${cfg.color}`}>{prev?.score ?? 0}/{prev?.total ?? 5}</span>.
                  </p>
                  <p className="text-gray-500 text-xs text-center mb-8 font-medium">
                    Grade B or above is required to advance. Retrying will deduct <span className="text-orange-400 font-bold">{TEST_RETRY_XP_COST} XP</span>.
                  </p>
                </>
              );
            })()}

            <div className={`rounded-2xl p-5 mb-6 flex items-center justify-between border shadow-inner ${canAffordRetry ? 'bg-orange-900/10 border-orange-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
              <div className="flex items-center gap-3">
                <Zap size={18} className={canAffordRetry ? 'text-orange-400' : 'text-red-400'} />
                <span className="text-sm font-bold text-gray-400">XP Balance</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-black">
                <span className="text-white">{userProgress?.stats?.totalXP ?? 0}</span>
                {canAffordRetry && <><span className="text-gray-600">→</span><span className="text-orange-400">{(userProgress?.stats?.totalXP ?? 0) - TEST_RETRY_XP_COST}</span></>}
              </div>
            </div>

            {(() => {
              const prev: TestResult = localTestResults[testRetryGate.milestone.id] ?? testRetryGate.milestone.progress?.testResult;
              return prev?.attempts > 1 ? (
                <div className="flex items-start gap-3 text-xs text-gray-400 mb-6 bg-black rounded-xl p-4 border border-white/5">
                  <AlertCircle size={16} className="text-gray-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">This is attempt <strong className="text-white">#{(prev.attempts ?? 0) + 1}</strong>. Adaptive tests change questions upon retry.</p>
                </div>
              ) : null;
            })()}

            {retryError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-sm font-medium text-red-300 flex items-center gap-3">
                <AlertCircle size={18} className="shrink-0" />{retryError}
              </div>
            )}

            {!canAffordRetry ? (
              <>
                <button onClick={() => { setTestRetryGate(null); setRetryError(''); }} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all text-base active:scale-95">Acknowledge</button>
              </>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => { setTestRetryGate(null); setRetryError(''); }} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all text-base active:scale-95">Cancel</button>
                <button onClick={handleRetryConfirm} disabled={retryLoading} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50">
                  {retryLoading ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={18} /> Retry Test</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global CSS enhancements */}
      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(255,255,255,0.1); 
          border-radius: 10px; 
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