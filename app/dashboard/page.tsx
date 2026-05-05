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
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-11 h-11 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-all shadow-2xl"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#050505]/80 backdrop-blur-2xl border-r border-white/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${mobileOpen ? 'translate-x-0 w-64 shadow-[20px_0_40px_rgba(0,0,0,0.5)]' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-[80px]' : 'md:w-64'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-white/10 shrink-0 h-20 transition-all duration-300 ${collapsed ? 'px-4 justify-center' : 'px-6 justify-between'}`}>
          <Link href="/" className="flex items-center gap-3 font-black text-2xl tracking-tighter group min-w-0">
            <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-300">
              <Cpu size={20} className="text-white" />
            </div>
            {!collapsed && (
              <span className="truncate bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors duration-300">
                Skill<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Pulse</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden md:flex w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 items-center justify-center text-gray-400 hover:text-white transition-all shrink-0 border border-transparent hover:border-white/10"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapse expand btn when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex mx-auto mt-4 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 items-center justify-center text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/10 shadow-lg"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Nav label */}
        {!collapsed && (
          <p className="px-6 pt-6 pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Menu</p>
        )}

        {/* Nav Items */}
        <nav className={`flex-1 space-y-2 overflow-y-auto custom-scrollbar ${collapsed ? 'px-3 pt-4' : 'px-4'}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = typeof window !== 'undefined' && window.location.pathname === item.href && item.label === 'Dashboard';
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                  ${collapsed ? 'p-3 justify-center' : 'px-4 py-3'}
                  ${isCurrent
                    ? `${item.bg} ${item.color} border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.03)_inset]`
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                  }`}
              >
                {isCurrent && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-current rounded-r-full" />}
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300
                  ${isCurrent ? `${item.bg} shadow-lg` : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-110'}
                  ${item.color}`}
                >
                  <Icon size={18} />
                </div>
                {!collapsed && <span className="truncate tracking-wide">{item.label}</span>}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl text-xs text-white font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-2xl z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Stats */}
        {progress?.stats && !collapsed && (
          <div className="px-4 py-4 mx-4 mb-4 bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-500" />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Level {progress.stats.level}</p>
                <p className="text-base font-black text-white tabular-nums mt-0.5 drop-shadow-md">
                  {progress.stats.totalXP.toLocaleString()}
                  <span className="text-blue-400 text-xs ml-1 opacity-80">XP</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {progress.stats.currentStreak > 0 && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-2.5 py-1 text-[11px] font-black text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                    <Flame size={12} className="animate-pulse" />{progress.stats.currentStreak}d
                  </div>
                )}
              </div>
            </div>
            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5 relative z-10">
              <div
                className="bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-400 h-full rounded-full transition-all duration-1000 relative"
                style={{ width: `${xpPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] w-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
              </div>
            </div>
            <p className="text-[11px] font-medium text-gray-500 relative z-10">{progress.stats.xpToNextLevel} XP to Next Level</p>
          </div>
        )}

        {/* Collapsed stats */}
        {progress?.stats && collapsed && (
          <div className="flex flex-col items-center gap-3 pb-4 px-3">
            <div title={`${progress.stats.totalXP.toLocaleString()} XP`} className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl flex flex-col items-center justify-center border border-blue-500/20 hover:border-blue-500/40 transition-colors shadow-lg shadow-blue-500/5">
              <Zap size={16} className="text-blue-400" />
            </div>
            {progress.stats.currentStreak > 0 && (
              <div title={`${progress.stats.currentStreak} day streak`} className="w-12 h-12 bg-gradient-to-br from-orange-500/10 to-transparent rounded-2xl flex items-center justify-center border border-orange-500/20 hover:border-orange-500/40 transition-colors shadow-lg shadow-orange-500/5">
                <Flame size={16} className="text-orange-400 animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* User + Sign Out */}
        <div className={`border-t border-white/10 shrink-0 bg-black/20 ${collapsed ? 'p-3' : 'p-5'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[2px] shadow-lg">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-sm font-black text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="w-11 h-11 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-transparent flex items-center justify-center text-gray-400 transition-all duration-300"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[2px] shrink-0 shadow-lg shadow-purple-500/20">
                <div className="w-full h-full bg-[#0a0a0a] rounded-full flex items-center justify-center text-sm font-black text-white">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate drop-shadow-md">{user?.email?.split('@')[0]}</p>
                <p className="text-[11px] text-gray-500 truncate font-medium">{user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all duration-300 shrink-0"
                title="Sign Out"
              >
                <LogOut size={16} />
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
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-10">
      <div className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden hover:border-blue-500/40 transition-all duration-500 cursor-default shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:-translate-y-1">
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-transparent transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-500" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-blue-400/80 text-[11px] font-black uppercase tracking-widest drop-shadow-sm">Level {stats.level}</p>
            <h3 className="text-3xl font-black text-white mt-1 tabular-nums tracking-tight">{stats.totalXP.toLocaleString()}<span className="text-sm text-blue-400 font-bold ml-1.5 opacity-80">XP</span></h3>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-500 border border-blue-500/20 shadow-inner"><Zap size={22} className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" /></div>
        </div>
        <div className="mt-5 w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 relative z-10">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000" style={{ width: `${xpPercentage}%` }} />
        </div>
        <p className="text-xs font-medium text-gray-500 mt-2 relative z-10">{stats.xpToNextLevel} XP to Level {stats.level + 1}</p>
      </div>

      <div className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden hover:border-orange-500/40 transition-all duration-500 cursor-default shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_40px_rgba(249,115,22,0.15)] hover:-translate-y-1">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors duration-500" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-orange-400/80 text-[11px] font-black uppercase tracking-widest drop-shadow-sm">Day Streak</p>
            <h3 className="text-3xl font-black text-white mt-1 tabular-nums tracking-tight">{stats.currentStreak}<span className="ml-2 text-2xl drop-shadow-md">🔥</span></h3>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-2xl flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform duration-500 border border-orange-500/20 shadow-inner"><Flame size={22} className="drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-pulse" /></div>
        </div>
        <p className="text-xs font-medium text-gray-500 mt-5 relative z-10">You're on fire! Keep it going.</p>
      </div>

      <div className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden hover:border-green-500/40 transition-all duration-500 cursor-default shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] hover:-translate-y-1">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors duration-500" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-green-400/80 text-[11px] font-black uppercase tracking-widest drop-shadow-sm">Daily Goal</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-3xl font-black text-white tabular-nums tracking-tight">{dailyGoal?.minsCompleted || 0}</h3>
              <span className="text-gray-500 text-sm font-bold">/ {dailyGoal?.targetMins || 0}m</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform duration-500 border border-green-500/20 shadow-inner"><Target size={22} className="drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" /></div>
        </div>
        <div className="mt-5 w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 relative z-10">
          <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-1000" style={{ width: `${dailyGoal?.progressPercentage || 0}%` }} />
        </div>
        <p className="text-xs font-medium text-gray-500 mt-2 relative z-10">{dailyGoal?.progressPercentage || 0}% complete today</p>
      </div>

      <button onClick={onShowAchievements} className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden hover:border-yellow-500/40 transition-all duration-500 text-left shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_0_40px_rgba(234,179,8,0.15)] hover:-translate-y-1">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors duration-500" />
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-yellow-400/80 text-[11px] font-black uppercase tracking-widest drop-shadow-sm">Badges</p>
            <h3 className="text-3xl font-black text-white mt-1 group-hover:text-yellow-400 transition-colors tabular-nums tracking-tight">{progress.achievements?.length || 0}</h3>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-2xl flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform duration-500 border border-yellow-500/20 shadow-inner"><Trophy size={22} className="drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" /></div>
        </div>
        <p className="text-xs font-bold text-gray-400 mt-5 flex items-center gap-1 group-hover:text-yellow-400 transition-colors relative z-10">View Gallery <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></p>
      </button>
    </div>
  );
}

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
            <button key={index} onClick={() => !answered && onAnswer(index)} disabled={answered} className={`w-full text-left p-3 rounded-xl border transition-all ${bgClass} ${borderClass} ${answered ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01]'}`}>
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

function ProgressRing({ pct, size = 52, stroke = 4, color = '#3b82f6' }: { pct: number; size?: number; stroke?: number; color?: string; }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
    </svg>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'completed') return <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.2)]">Done</span>;
  if (status === 'in_progress') return <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.2)]"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_5px_currentColor] inline-block" />Active</span>;
  return null;
}

function GradePill({ testResult }: { testResult: TestResult }) {
  const cfg = GRADE_CONFIG[testResult.grade] ?? GRADE_CONFIG['F'];
  const isPassed = PASSING_GRADES.has(testResult.grade);
  return (
    <span
      title={`${cfg.desc} · ${testResult.attempts} attempt${testResult.attempts !== 1 ? 's' : ''}`}
      className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border} cursor-default shrink-0 shadow-sm`}
    >
      {isPassed
        ? <CheckCircle size={10} className="opacity-90" />
        : <Star size={10} className="opacity-90" />}
      {testResult.score}/{testResult.total} · {testResult.grade}
    </span>
  );
}

// ─── TEST MODAL ───────────────────────────────────────────────────────────────
function TestModal({
  milestone, onClose, onComplete,
}: {
  milestone: any; onClose: () => void; onComplete: (score: number, total: number, answers: any[]) => void;
}) {
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneTitle: milestone.title, milestoneDescription: milestone.description }),
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
    if (selectedAnswers[currentQ] !== null) return;
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
      const answers = questions.map((q, i) => ({
        questionIndex: i,
        selectedIndex: selectedAnswers[i] ?? -1,
        correctIndex: q.correctIndex,
        isCorrect: selectedAnswers[i] === q.correctIndex,
      }));
      onComplete(score, questions.length, answers);
      setPhase('results');
    }
  };

  const difficultyColor = (d: string) =>
    d === 'easy' ? 'text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
    d === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
    'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl transition-all">
      <div className="bg-black/80 border border-white/10 rounded-[2rem] w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 z-10" />
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5 backdrop-blur-md">
          <div className="min-w-0">
            <h2 className="font-black text-white flex items-center gap-3 text-base tracking-tight">
              <div className="w-8 h-8 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30"><ClipboardList size={16} className="text-purple-400 drop-shadow-sm" /></div>
              Milestone Test
            </h2>
            <p className="text-[12px] text-gray-400 truncate mt-1 max-w-[380px] font-medium">{milestone.title}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0 hover:scale-105 active:scale-95"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-32 gap-6 relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.2)] relative">
                <Loader2 size={32} className="text-white animate-spin absolute" />
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-black tracking-tight mb-2">Generating personalized test...</p>
                <p className="text-gray-400 text-sm font-medium">Preparing 5 questions tailored to this milestone</p>
              </div>
            </div>
          )}

          {phase === 'questions' && questions.length > 0 && (
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex gap-2 flex-1">
                  {questions.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all duration-500 flex-1 ${i < currentQ ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : i === currentQ ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-400 shrink-0">Q{currentQ + 1} of {questions.length}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${difficultyColor(questions[currentQ]?.difficulty || 'easy')}`}>
                  {questions[currentQ]?.difficulty}
                </span>
              </div>

              <h3 className="text-white font-black text-xl leading-relaxed mb-8 drop-shadow-sm">{questions[currentQ]?.question}</h3>

              <div className="space-y-3">
                {questions[currentQ]?.options.map((opt, idx) => {
                  const answered = selectedAnswers[currentQ] !== null;
                  const isSelected = selectedAnswers[currentQ] === idx;
                  const isCorrect = idx === questions[currentQ].correctIndex;
                  let cls = 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer';
                  if (answered) {
                    if (isCorrect) cls = 'bg-green-500/20 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.15)] cursor-default';
                    else if (isSelected) cls = 'bg-red-500/20 border-red-500/50 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-default';
                    else cls = 'bg-white/2 border-white/5 text-gray-600 cursor-default opacity-40';
                  }
                  return (
                    <button key={idx} onClick={() => handleSelect(idx)} disabled={selectedAnswers[currentQ] !== null} className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 ${cls}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${answered && isCorrect ? 'bg-green-500 text-black' : answered && isSelected && !isCorrect ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-[15px] font-medium leading-relaxed">{opt}</span>
                        {answered && isCorrect && <CheckCircle size={20} className="ml-auto text-green-400 shrink-0 drop-shadow-[0_0_5px_currentColor]" />}
                        {answered && isSelected && !isCorrect && <X size={20} className="ml-auto text-red-400 shrink-0 drop-shadow-[0_0_5px_currentColor]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showExplanation && selectedAnswers[currentQ] !== null && (
                <div className={`mt-6 p-5 rounded-2xl border animate-in fade-in slide-in-from-bottom-4 duration-500 ${selectedAnswers[currentQ] === questions[currentQ].correctIndex ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                  <p className="text-sm font-black mb-2 text-white flex items-center gap-2">
                    {selectedAnswers[currentQ] === questions[currentQ].correctIndex ? <><CheckCircle size={16} className="text-green-400"/> Brilliant!</> : <><AlertCircle size={16} className="text-orange-400"/> Learning Moment</>}
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">{questions[currentQ].explanation}</p>
                </div>
              )}

              {selectedAnswers[currentQ] !== null && (
                <button onClick={handleNext} className="mt-8 w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:-translate-y-1 text-base active:scale-95 animate-in fade-in duration-300">
                  {currentQ < questions.length - 1 ? <><ChevronRight size={20} />Continue to Next</> : <><Trophy size={20} />Complete Test</>}
                </button>
              )}
            </div>
          )}

          {phase === 'questions' && questions.length === 0 && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-5 px-6 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"><X size={32} className="text-red-400" /></div>
              <p className="text-gray-300 text-base font-bold">{error}</p>
              <button onClick={onClose} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors">Close and Retry</button>
            </div>
          )}

          {phase === 'results' && (
            <div className="p-8 animate-in zoom-in-95 duration-500">
              <div className={`rounded-3xl border p-8 text-center mb-8 relative overflow-hidden ${gradeConfig.bg} ${gradeConfig.border}`}>
                <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
                <div className={`text-8xl font-black mb-4 drop-shadow-[0_0_20px_currentColor] ${gradeConfig.color}`}>{gradeConfig.label}</div>
                <p className={`text-lg font-black mb-2 ${gradeConfig.color}`}>{gradeConfig.desc}</p>
                <p className="text-gray-400 text-sm font-medium">{score}/{questions.length} correct answers</p>
                <div className="inline-flex items-center gap-2 mt-5 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 text-sm font-black text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <Zap size={16} className="drop-shadow-[0_0_5px_currentColor]" />+{xpEarned} XP Earned
                </div>
                {!isPassed && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 text-sm font-black text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                    <RefreshCw size={14} className="animate-spin-slow" />Retry available for {TEST_RETRY_XP_COST} XP
                  </div>
                )}
                {isPassed && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 text-sm font-black text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    <CheckCircle size={14} />Milestone test passed!
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-8">
                <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 pl-2">Performance Breakdown</p>
                {questions.map((q, i) => {
                  const isCorrect = selectedAnswers[i] === q.correctIndex;
                  return (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all hover:bg-white/5 ${isCorrect ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-md ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                        {isCorrect ? <CheckCircle size={14} className="text-black" /> : <X size={14} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 font-medium leading-relaxed">{q.question}</p>
                        {!isCorrect && <p className="text-xs text-gray-400 mt-2 font-medium">Correct Answer: <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded ml-1">{q.options[q.correctIndex]}</span></p>}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shrink-0 shadow-sm ${q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' : q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{q.difficulty}</span>
                    </div>
                  );
                })}
              </div>

              <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all duration-300 text-base hover:shadow-lg active:scale-95">
                Close Results
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TEST BUTTON ──────────────────────────────────────────────────────────────
function TestButton({
  milestone, localTestResults, onOpenTest,
}: {
  milestone: any; localTestResults: Record<string, TestResult>; onOpenTest: (m: any) => void;
}) {
  const testResult: TestResult | undefined =
    localTestResults[milestone.id] ?? milestone.progress?.testResult;

  if (!testResult) {
    return (
      <button
        onClick={() => onOpenTest(milestone)}
        className="text-[11px] bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 hover:text-purple-200 hover:border-purple-500/50 px-3 py-1.5 rounded-xl flex gap-1.5 items-center border border-purple-500/30 transition-all duration-300 font-black shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
      >
        <ClipboardList size={12} />Take Test
      </button>
    );
  }

  const isPassed = PASSING_GRADES.has(testResult.grade);
  const cfg = GRADE_CONFIG[testResult.grade] ?? GRADE_CONFIG['F'];

  if (isPassed) {
    return (
      <span
        title={`${cfg.desc} · ${testResult.score}/${testResult.total} · ${testResult.attempts} attempt${testResult.attempts !== 1 ? 's' : ''}`}
        className={`text-[11px] px-3 py-1.5 rounded-xl flex gap-1.5 items-center border font-black cursor-default shadow-md ${cfg.color} ${cfg.bg} ${cfg.border}`}
      >
        <Trophy size={12} />Grade {testResult.grade} ✓
      </span>
    );
  }

  return (
    <button
      onClick={() => onOpenTest(milestone)}
      title={`Grade ${testResult.grade} (${testResult.score}/${testResult.total}). Retry costs ${TEST_RETRY_XP_COST} XP.`}
      className="text-[11px] bg-orange-500/10 hover:bg-orange-500/25 text-orange-300 hover:text-orange-200 hover:border-orange-500/50 px-3 py-1.5 rounded-xl flex gap-1.5 items-center border border-orange-500/30 transition-all duration-300 font-black shadow-[0_0_10px_rgba(249,115,22,0.1)] hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
    >
      <RefreshCw size={12} />Retry Test
      <span className="text-[9px] opacity-70 ml-0.5 font-bold">({TEST_RETRY_XP_COST} XP)</span>
    </button>
  );
}

// ─── ROADMAP CARD ─────────────────────────────────────────────────────────────
function RoadmapCard({
  map, isExpanded, onToggle, onMilestoneClick, onStartMilestone, onCompleteMilestone,
  onTrackResource, onAskMentor, onOpenTest, isDailyCourse, localTestResults,
}: {
  map: any; isExpanded: boolean; onToggle: () => void;
  onMilestoneClick: (m: any) => void; onStartMilestone: (m: any) => void;
  onCompleteMilestone: (m: any) => void; onTrackResource: (m: any, id: string) => void;
  onAskMentor: (mode: 'chat' | 'explain' | 'quiz', m?: any) => void;
  onOpenTest: (m: any) => void;
  isDailyCourse: boolean;
  localTestResults: Record<string, TestResult>;
}) {
  const completedCount = map.milestones.filter((m: any) => m.progress?.status === 'completed').length;
  const pct = map.completionPercentage;
  const inProgressCount = map.milestones.filter((m: any) => m.progress?.status === 'in_progress').length;

  return (
    <div className={`bg-white/[0.02] backdrop-blur-xl border rounded-[1.5rem] overflow-hidden transition-all duration-500 group/card ${isExpanded ? 'border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.3)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]'}`}>
      <button onClick={onToggle} className="w-full px-6 py-5 flex items-center gap-5 text-left group">
        <div className="relative shrink-0 transition-transform duration-500 group-hover:scale-105">
          <ProgressRing pct={pct} size={52} stroke={4} color={pct === 100 ? '#22c55e' : '#3b82f6'} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-gray-300 drop-shadow-md">{pct}%</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-300 transition-all duration-300 truncate">{map.title}</h3>
            {isDailyCourse && <span className="shrink-0 text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black shadow-sm">Intensive</span>}
            {pct === 100 && <span className="shrink-0 text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-black flex items-center gap-1 shadow-[0_0_10px_rgba(34,197,94,0.2)]"><Trophy size={10} />Mastered</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500">{completedCount}/{map.milestones.length} Milestones</span>
            {inProgressCount > 0 && <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_5px_currentColor] inline-block" />{inProgressCount} Active</span>}
          </div>
          <div className="mt-3 w-full max-w-[240px] bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
            <div className={`h-full rounded-full transition-all duration-1000 relative ${pct === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`} style={{ width: `${pct}%` }}>
               <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] w-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
            </div>
          </div>
        </div>
        {!isExpanded && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 bg-black/20 p-2 rounded-xl border border-white/5">
            {map.milestones.slice(0, 5).map((m: any, i: number) => {
              const s = m.progress?.status || 'not_started';
              return <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${s === 'completed' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : s === 'in_progress' ? 'bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />;
            })}
            {map.milestones.length > 5 && <span className="text-[10px] font-bold text-gray-500 ml-1">+{map.milestones.length - 5}</span>}
          </div>
        )}
        <div className={`shrink-0 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-white/10 group-hover:border-white/10 border border-transparent transition-all duration-300 shadow-sm ${isExpanded ? 'rotate-180 bg-white/10 border-white/20 text-white' : ''}`}>
          <ChevronDown size={18} />
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-white/10 px-6 pb-6 pt-5 relative before:absolute before:left-[2.125rem] before:top-0 before:bottom-8 before:w-px before:bg-gradient-to-b before:from-white/20 before:via-white/10 before:to-transparent">
          {map.milestones.map((milestone: any, idx: number) => {
            const status = milestone.progress?.status || 'not_started';
            const isLocked = idx > 0 && map.milestones[idx - 1].progress?.status !== 'completed';
            const isLast = idx === map.milestones.length - 1;
            const testResult: TestResult | undefined =
              localTestResults[milestone.id] ?? milestone.progress?.testResult;

            return (
              <div key={idx} className={`relative pl-12 transition-all duration-500 ${isLocked ? 'opacity-40 grayscale-[50%]' : 'opacity-100'} ${isLast ? '' : 'pb-8'}`}>
                <div
                  onClick={() => !isLocked && onMilestoneClick(milestone)}
                  className={`absolute left-0 top-0.5 w-8 h-8 rounded-full border-[3px] flex items-center justify-center text-[10px] font-black z-10 transition-all duration-300 shadow-lg ${
                    status === 'completed' ? 'bg-green-500 border-green-300 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-110' :
                    status === 'in_progress' ? 'bg-blue-600 border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.4)] animate-pulse scale-110' :
                    isLocked ? 'bg-black border-white/10 text-gray-600' :
                    'bg-black border-gray-600 hover:border-blue-400 hover:bg-blue-900/30 hover:scale-110 text-gray-300'
                  } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {status === 'completed' ? <CheckCircle size={14} /> : isLocked ? <Lock size={12} /> : status === 'in_progress' ? <Play size={10} fill="currentColor" className="ml-0.5" /> : <span>{idx + 1}</span>}
                </div>

                <div className={`group/ms bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 p-5 rounded-2xl transition-all duration-300 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)] hover:-translate-y-0.5'}`} onClick={() => !isLocked && onMilestoneClick(milestone)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className={`font-black text-[15px] transition-colors duration-300 ${!isLocked ? 'group-hover/ms:text-transparent group-hover/ms:bg-clip-text group-hover/ms:bg-gradient-to-r group-hover/ms:from-blue-400 group-hover/ms:to-cyan-300' : ''} ${status === 'completed' ? 'text-gray-400 line-through decoration-gray-600/50' : 'text-white'}`}>
                          {milestone.title}
                        </h4>
                        <StatusPill status={status} />
                        {testResult && <GradePill testResult={testResult} />}
                      </div>
                      <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium line-clamp-2">{milestone.description}</p>
                      <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md border border-white/5"><Clock size={12} className="text-gray-400"/> {isDailyCourse ? `Day ${idx + 1}` : `Week ${milestone.week || idx + 1}`}</span>
                        <span className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md border border-white/5">~ {milestone.estimatedHours}h est.</span>
                        {testResult && (
                          <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${PASSING_GRADES.has(testResult.grade) ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                            {testResult.attempts} attempt{testResult.attempts !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex gap-2.5 mt-4 flex-wrap items-center pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      {status === 'not_started' && (
                        <button onClick={() => onStartMilestone(milestone)} className="text-[11px] bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95">
                          <Play size={10} fill="currentColor" />Start Milestone
                        </button>
                      )}
                      {status === 'in_progress' && (
                        <button onClick={() => onCompleteMilestone(milestone)} className="text-[11px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-4 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95">
                          <CheckCircle size={12} />Mark Mastered
                        </button>
                      )}
                      <div className="w-px h-5 bg-white/10 mx-1" />
                      <button onClick={() => onAskMentor('explain', milestone)} className="text-[11px] bg-white/5 hover:bg-yellow-500/15 hover:text-yellow-300 hover:border-yellow-500/40 px-3 py-1.5 rounded-xl flex gap-1.5 items-center border border-white/10 transition-all duration-300 font-bold hover:shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                        <Sparkles size={12} className="text-yellow-400" />Explain Concept
                      </button>
                      <button onClick={() => onAskMentor('quiz', milestone)} className="text-[11px] bg-white/5 hover:bg-green-500/15 hover:text-green-300 hover:border-green-500/40 px-3 py-1.5 rounded-xl flex gap-1.5 items-center border border-white/10 transition-all duration-300 font-bold hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                        <GraduationCap size={12} className="text-green-400" />Quick Quiz
                      </button>
                      <button onClick={() => onMilestoneClick(milestone)} className="text-[11px] bg-white/5 hover:bg-blue-500/15 hover:text-blue-300 hover:border-blue-500/40 px-3 py-1.5 rounded-xl flex gap-1.5 items-center border border-white/10 transition-all duration-300 font-bold hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <MessageSquare size={12} className="text-blue-400" />Discuss with AI
                      </button>
                      <TestButton milestone={milestone} localTestResults={localTestResults} onOpenTest={onOpenTest} />
                    </div>
                  )}

                  {milestone.resources && milestone.resources.length > 0 && !isLocked && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      {milestone.resources.map((res: any, rId: number) => {
                        const isViewed = milestone.progress?.resourcesViewed?.includes(res.id || res.url);
                        return (
                          <a key={rId} href={res.url} target="_blank" rel="noopener noreferrer" onClick={() => onTrackResource(milestone, res.id || res.url)}
                            className={`flex items-center gap-3 border p-3 rounded-xl transition-all duration-300 group/link text-xs shadow-sm ${isViewed ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' : 'bg-black/30 hover:bg-white/10 border-white/10 hover:border-white/20 text-gray-400 hover:text-white hover:-translate-y-0.5'}`}>
                            {res.type === 'YOUTUBE' && <Video size={14} className="text-red-500 shrink-0 drop-shadow-md" />}
                            {res.type === 'GITHUB' && <Code size={14} className="text-purple-400 shrink-0 drop-shadow-md" />}
                            {res.type === 'INTERACTIVE' && <Play size={14} className="text-green-400 shrink-0 drop-shadow-md" />}
                            {res.type === 'ARTICLE' && <BookOpen size={14} className="text-blue-400 shrink-0 drop-shadow-md" />}
                            {!['YOUTUBE', 'GITHUB', 'INTERACTIVE', 'ARTICLE'].includes(res.type) && <ExternalLink size={14} className="text-gray-400 shrink-0" />}
                            <span className="flex-1 truncate font-semibold text-[11px] tracking-wide">{res.title}</span>
                            {isViewed ? <CheckCircle size={12} className="text-blue-400 shrink-0" /> : <ChevronRight size={12} className="text-gray-600 group-hover/link:text-white shrink-0 transition-colors" />}
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
      <div className="min-h-screen bg-[#020202] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse"><Cpu size={32} className="text-white" /></div>
          <Loader2 className="animate-spin text-blue-400 drop-shadow-md" size={28} />
          <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Initializing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Dynamic Background orbs - Glassmorphism foundation */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/15 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/15 rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>

      {/* ── VERTICAL SIDEBAR NAVBAR ── */}
      <Navbar user={user} onLogout={handleLogout} progress={userProgress ?? undefined} />

      {/* ── MAIN AREA — offset for sidebar ── */}
      <div className="md:ml-64 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10">
        <div className="flex min-h-screen">
          <div className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeMilestone ? 'xl:mr-[500px]' : ''}`}>
            <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-20 md:pt-10 pb-10">

              {/* Header */}
              <div className="mb-10 relative">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-2 drop-shadow-sm">
                  Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Dashboard</span>
                </h1>
                <p className="text-gray-400 text-base mt-2 font-medium">
                  Welcome back, <span className="text-white font-bold">{user?.email?.split('@')[0]}</span> —
                  {userProgress?.stats?.currentStreak
                    ? ` you're on a ${userProgress.stats.currentStreak}-day streak! Keep the momentum alive. 🔥`
                    : " let's construct your next breakthrough today."}
                </p>
              </div>

              {/* Stats bar */}
              {userProgress && (
                <StatsBar
                  progress={userProgress}
                  onShowAchievements={() => dispatch(setShowAchievements(true))}
                />
              )}

              {/* Main grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* New Mission panel */}
                <div className="lg:col-span-4">
                  <div className={`bg-white/[0.02] backdrop-blur-xl border rounded-[2rem] p-6 sm:p-8 sticky top-10 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${inputFocused ? 'border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.15)] -translate-y-1' : 'border-white/10 hover:border-white/20'}`}>
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3 drop-shadow-md">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-xl flex items-center justify-center border border-yellow-500/20 shadow-inner">
                        <Zap size={20} className="text-yellow-400 drop-shadow-[0_0_5px_currentColor]" />
                      </div>
                      New Mission
                    </h2>
                    <p className="text-gray-400 text-sm mb-5 leading-relaxed font-medium">
                      What complex system do you want to master next?{' '}
                      <span className="text-blue-400 font-bold tracking-wide">Try: "React in 3 days" or "Learn DevOps"</span>
                    </p>
                    {!isMissionFree && (
                      <div className={`inline-flex items-center gap-2 text-xs font-black px-3.5 py-1.5 rounded-full border mb-5 shadow-sm ${canAffordMission ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                        <Zap size={12} className="drop-shadow-sm" />
                        {canAffordMission
                          ? `Costs ${MISSION_XP_COST} XP · Balance: ${userProgress?.stats?.totalXP ?? 0} XP`
                          : `Need ${MISSION_XP_COST} XP · Balance: ${userProgress?.stats?.totalXP ?? 0} XP`}
                      </div>
                    )}
                    {isMissionFree && (
                      <div className="inline-flex items-center gap-2 text-xs font-black px-3.5 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 mb-5 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                        <Sparkles size={12} className="drop-shadow-sm animate-pulse" />Your First Mission is FREE!
                      </div>
                    )}
                    <div className="relative group/input">
                      <div className={`absolute -inset-0.5 rounded-[1.5rem] bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 blur transition duration-500 group-hover/input:opacity-20 ${inputFocused ? 'opacity-40 blur-md' : ''}`}></div>
                      <textarea
                        className="relative w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-[1.25rem] p-5 text-white text-base min-h-[140px] focus:outline-none focus:border-blue-500/60 focus:bg-white/5 transition-all duration-300 resize-none placeholder:text-gray-600 shadow-inner font-medium"
                        placeholder="e.g., Master Multi-Agent Architectures using LangGraph..."
                        value={goal}
                        onChange={(e) => dispatch(setGoal(e.target.value))}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                      />
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !goal.trim() || (!isMissionFree && !canAffordMission)}
                      className={`w-full relative overflow-hidden font-black py-4 mt-6 rounded-2xl flex items-center justify-center gap-2 transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed group text-base shadow-[0_4px_20px_rgba(0,0,0,0.2)] ${!isMissionFree && !canAffordMission ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-gradient-to-r from-white to-gray-200 text-black hover:from-blue-500 hover:to-cyan-400 hover:text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-[0.98]'}`}
                    >
                      {loading
                        ? <><Loader2 className="animate-spin" size={18} />Architecting Path…</>
                        : !isMissionFree && !canAffordMission
                          ? <><Lock size={18} />Not Enough XP</>
                          : <><Sparkles size={18} className="group-hover:animate-pulse" />Generate Roadmap{!isMissionFree && <span className="text-xs opacity-70 ml-1.5 font-bold">({MISSION_XP_COST} XP)</span>}</>
                      }
                    </button>
                    <div className="mt-6 space-y-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Inspiration</p>
                      {['React & Next.js Ecosystem', 'Kubernetes Orchestration', 'Advanced System Design'].map((tip) => (
                        <button key={tip} onClick={() => dispatch(setGoal(tip))} className="w-full text-left text-xs font-semibold text-gray-400 hover:text-white px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 group/btn">
                          <span className="text-blue-500 group-hover/btn:text-cyan-400 transition-colors">↳</span> {tip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Roadmaps */}
                <div className="lg:col-span-8 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar pb-20">
                  {roadmaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-32 bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[2rem] shadow-inner">
                      <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-lg"><BookOpen size={40} className="text-gray-500 drop-shadow-md" /></div>
                      <p className="font-black text-xl text-gray-300 tracking-tight">No roadmaps constructed yet.</p>
                      <p className="text-base text-gray-500 mt-2 font-medium max-w-sm">Generate your first premium learning path using the Mission Control panel.</p>
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
                          localTestResults={localTestResults}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── NEURAL MENTOR SIDEBAR ── */}
          <div className={`fixed inset-y-0 right-0 w-full sm:w-[440px] xl:w-[500px] bg-black/80 backdrop-blur-2xl border-l border-white/10 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-40 flex flex-col top-0 ${activeMilestone ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
              <div className="min-w-0 relative z-10">
                <h3 className="font-black text-white flex items-center gap-3 text-base tracking-tight">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]"><Sparkles size={16} className="text-white drop-shadow-md" /></div>
                  Neural Mentor
                </h3>
                <p className="text-xs font-semibold text-gray-400 truncate mt-1.5 max-w-[280px]">{activeMilestone?.title}</p>
              </div>
              <button onClick={() => dispatch(closeMentor())} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all relative z-10 hover:scale-105 active:scale-95"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative" ref={chatScrollRef}>
              {showWelcome && chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative">
                    <div className="absolute inset-0 bg-white/5 rounded-[2rem] blur-xl" />
                    <Brain size={40} className="text-blue-400 relative z-10 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-2xl tracking-tight mb-3">Ready to Analyze?</h4>
                    <p className="text-gray-400 text-sm max-w-[260px] mx-auto leading-relaxed font-medium">I can break down complex architecture, run quick diagnostics (quizzes), or answer specific technical queries on this milestone.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-[320px]">
                    <button onClick={() => handleAskMentor('explain')} className="bg-white/[0.03] hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/30 p-5 rounded-3xl transition-all duration-300 text-sm flex flex-col items-center gap-3 group shadow-sm hover:shadow-[0_10px_30px_rgba(234,179,8,0.15)] hover:-translate-y-1">
                      <Sparkles size={24} className="text-yellow-400 group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                      <span className="font-black text-gray-300 group-hover:text-yellow-300 transition-colors">Deep Dive</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Concept Logic</span>
                    </button>
                    <button onClick={() => handleAskMentor('quiz')} className="bg-white/[0.03] hover:bg-green-500/10 border border-white/10 hover:border-green-500/30 p-5 rounded-3xl transition-all duration-300 text-sm flex flex-col items-center gap-3 group shadow-sm hover:shadow-[0_10px_30px_rgba(34,197,94,0.15)] hover:-translate-y-1">
                      <GraduationCap size={24} className="text-green-400 group-hover:scale-110 transition-transform duration-300 drop-shadow-md" />
                      <span className="font-black text-gray-300 group-hover:text-green-300 transition-colors">Run Quiz</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">+25 XP Reward</span>
                    </button>
                  </div>
                </div>
              )}

              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[90%] rounded-3xl p-5 text-[15px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-sm shadow-[0_5px_20px_rgba(59,130,246,0.3)]' : 'bg-white/[0.05] backdrop-blur-md text-gray-200 border border-white/10 rounded-bl-sm shadow-[0_5px_20px_rgba(0,0,0,0.2)]'}`}>
                    {msg.quiz ? (
                      <InteractiveQuiz quiz={msg.quiz} userAnswer={msg.userAnswer} onAnswer={(answerIndex) => handleQuizAnswer(idx, answerIndex)} />
                    ) : msg.text ? (
                      msg.role === 'ai' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          h1: ({ children }) => <h1 className="text-lg font-black text-white mb-3 pb-2 border-b border-white/10 tracking-tight">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-black text-white mb-3 mt-5 tracking-tight">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-black text-blue-400 mb-2 mt-4 uppercase tracking-wider">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-blue-500">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-blue-500">{children}</ol>,
                          li: ({ children }) => <li className="pl-1 text-gray-300">{children}</li>,
                          p: ({ children }) => <p className="mb-4 last:mb-0 text-gray-300">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-bold drop-shadow-sm">{children}</strong>,
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="rounded-2xl overflow-hidden my-4 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                <div className="bg-black/60 px-4 py-2 text-[10px] text-gray-400 border-b border-white/5 font-mono font-bold flex justify-between items-center">
                                  <span>{match[1].toUpperCase()}</span>
                                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"/><div className="w-2.5 h-2.5 rounded-full bg-green-500/50"/></div>
                                </div>
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: '1rem', background: 'rgba(0,0,0,0.3)', fontSize: '12px', lineHeight: '1.6' }} {...props}>
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : <code className="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded-md font-mono text-xs border border-white/10" {...props}>{children}</code>;
                          },
                        }}>
                          {msg.text}
                        </ReactMarkdown>
                      ) : msg.text
                    ) : null}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex justify-start animate-in fade-in duration-300">
                  <div className="bg-white/[0.03] backdrop-blur-md px-5 py-4 rounded-3xl rounded-bl-sm flex items-center gap-4 border border-white/10 shadow-lg">
                    <Brain className="text-blue-400 animate-pulse drop-shadow-[0_0_5px_currentColor]" size={20} />
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_5px_currentColor]" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_5px_currentColor]" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_5px_currentColor]" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0">
              {chatHistory.length > 0 && !isStreaming && (
                <div className="flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                  {[{ label: '💡 Elaborate further', mode: 'explain' as const }, { label: '🎲 Test my knowledge', mode: 'quiz' as const }].map((pill) => (
                    <button key={pill.label} onClick={() => handleAskMentor(pill.mode)} className="shrink-0 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-full transition-all duration-300 shadow-sm hover:shadow-md">{pill.label}</button>
                  ))}
                </div>
              )}
              <div className="relative group/chatinput">
                <div className="absolute -inset-0.5 rounded-[1.5rem] bg-gradient-to-r from-blue-500/50 to-purple-500/50 opacity-0 blur transition duration-500 group-focus-within/chatinput:opacity-30"></div>
                <input
                  type="text"
                  className="relative w-full bg-black/60 border border-white/10 rounded-[1.25rem] py-4 pl-5 pr-14 text-[15px] text-white focus:outline-none focus:border-blue-500/50 transition-all duration-300 placeholder:text-gray-600 shadow-inner font-medium"
                  placeholder="Query the Neural Mentor..."
                  value={chatInput}
                  onChange={(e) => dispatch(setChatInput(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isStreaming) handleAskMentor('chat'); }}
                  disabled={isStreaming}
                />
                <button onClick={() => handleAskMentor('chat')} disabled={isStreaming || !chatInput.trim()} className="absolute right-2 top-2 bottom-2 w-11 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95">
                  {isStreaming ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="text-white drop-shadow-sm ml-0.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACHIEVEMENTS MODAL ── */}
      {showAchievements && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl transition-all">
          <div className="bg-black/80 border border-white/10 rounded-[2rem] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-300">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 z-10" />
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md relative z-10">
              <h2 className="font-black text-xl flex items-center gap-3 tracking-tight"><div className="w-10 h-10 bg-yellow-500/20 flex items-center justify-center rounded-xl border border-yellow-500/30"><Trophy className="text-yellow-400 drop-shadow-md" size={20} /></div> Achievements Gallery</h2>
              <button onClick={() => dispatch(setShowAchievements(false))} className="w-10 h-10 rounded-2xl hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-white/10"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 custom-scrollbar relative z-0">
              {(userProgress?.achievements?.length || 0) === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-500">
                  <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6"><Award size={48} className="opacity-30" /></div>
                  <p className="font-black text-xl text-gray-300 tracking-tight">No badges unlocked yet.</p>
                  <p className="text-sm mt-2 font-medium">Complete milestones to fill your gallery!</p>
                </div>
              ) : userProgress?.achievements?.map((badge, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-500/30 hover:bg-white/[0.05] transition-all duration-300 shadow-sm hover:shadow-[0_10px_30px_rgba(234,179,8,0.15)] hover:-translate-y-1">
                  <div className="text-5xl mb-2 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110">{badge.badgeIcon}</div>
                  <h3 className="font-black text-white text-sm tracking-wide">{badge.badgeName}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MISSION XP GATE MODAL ── */}
      {showXpGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-black/90 border border-white/10 rounded-[2.5rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.6)] p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
            {xpGateError ? (
              <>
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 z-10" />
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]"><Lock size={32} className="text-red-400 drop-shadow-md" /></div>
                <h3 className="font-black text-white text-center text-2xl mb-3 tracking-tight">Insufficient XP</h3>
                <p className="text-gray-400 text-sm text-center leading-relaxed mb-8 font-medium">{xpGateError}</p>
                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-4 mb-8 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/15 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20"><Zap size={20} className="text-red-400" /></div>
                  <div>
                    <p className="text-sm font-black text-red-300">Balance: {userProgress?.stats?.totalXP ?? 0} XP</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Need {MISSION_XP_COST} XP to unlock</p>
                  </div>
                </div>
                <button onClick={() => setShowXpGate(false)} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black py-4 rounded-2xl transition-all duration-300 text-base active:scale-95">Understood</button>
              </>
            ) : (
              <>
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 z-10" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/20 rounded-full blur-[50px] pointer-events-none" />
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)] relative z-10"><Zap size={32} className="text-blue-400 drop-shadow-md" /></div>
                <h3 className="font-black text-white text-center text-2xl mb-3 tracking-tight relative z-10">Commence Mission?</h3>
                <p className="text-gray-400 text-sm text-center leading-relaxed mb-8 font-medium relative z-10">
                  Constructing a new roadmap architecture requires <span className="text-blue-400 font-black">{MISSION_XP_COST} XP</span>.
                </p>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-5 mb-8 flex items-center justify-between relative z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-3"><Zap size={18} className="text-blue-400" /><span className="text-sm font-bold text-gray-300">XP Balance</span></div>
                  <div className="flex items-center gap-3 text-sm font-black tracking-wide">
                    <span className="text-white">{userProgress?.stats?.totalXP ?? 0}</span>
                    <span className="text-gray-600">→</span>
                    <span className="text-blue-400">{(userProgress?.stats?.totalXP ?? 0) - MISSION_XP_COST}</span>
                  </div>
                </div>
                <div className="flex gap-3 relative z-10">
                  <button onClick={() => setShowXpGate(false)} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all duration-300 text-sm active:scale-95">Cancel</button>
                  <button onClick={executeGenerate} disabled={loading} className="flex-[2] bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-4 rounded-2xl transition-all duration-300 text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-95">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} />Initialize</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TEST RETRY GATE MODAL ── */}
      {testRetryGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="bg-black/90 border border-white/10 rounded-[2.5rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.6)] p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
            {(() => {
              const prev: TestResult = localTestResults[testRetryGate.milestone.id] ?? testRetryGate.milestone.progress?.testResult;
              const cfg = GRADE_CONFIG[prev?.grade ?? 'F'];
              return (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 z-10" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-orange-500/10 rounded-full blur-[50px] pointer-events-none" />
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 shadow-lg relative z-10 ${cfg.bg} ${cfg.border}`}>
                    <span className={`text-4xl font-black drop-shadow-md ${cfg.color}`}>{prev?.grade ?? 'F'}</span>
                  </div>
                  <h3 className="font-black text-white text-center text-2xl mb-2 tracking-tight relative z-10">Retry Diagnostics?</h3>
                  <p className="text-gray-400 text-sm text-center mb-2 font-medium relative z-10">
                    Previous score: <span className={`font-black ${cfg.color}`}>{prev?.score ?? 0}/{prev?.total ?? 5}</span>
                  </p>
                  <p className="text-gray-500 text-xs text-center mb-8 font-medium leading-relaxed relative z-10">
                    Grade B or above required. Retrying costs <span className="text-orange-400 font-bold">{TEST_RETRY_XP_COST} XP</span>.
                  </p>
                </>
              );
            })()}

            <div className={`rounded-3xl p-5 mb-5 flex items-center justify-between border relative z-10 backdrop-blur-sm ${canAffordRetry ? 'bg-orange-500/5 border-orange-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-center gap-3">
                <Zap size={18} className={canAffordRetry ? 'text-orange-400' : 'text-red-400'} />
                <span className="text-sm font-bold text-gray-300">XP Balance</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-black tracking-wide">
                <span className="text-white">{userProgress?.stats?.totalXP ?? 0}</span>
                {canAffordRetry && <><span className="text-gray-600">→</span><span className="text-orange-400">{(userProgress?.stats?.totalXP ?? 0) - TEST_RETRY_XP_COST}</span></>}
              </div>
            </div>

            {(() => {
              const prev: TestResult = localTestResults[testRetryGate.milestone.id] ?? testRetryGate.milestone.progress?.testResult;
              return prev?.attempts > 1 ? (
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium mb-6 bg-white/[0.03] rounded-2xl p-4 border border-white/10 relative z-10">
                  <AlertCircle size={16} className="text-gray-500 shrink-0" />
                  Attempt #{(prev.attempts ?? 0) + 1}. Costs {TEST_RETRY_XP_COST} XP per try.
                </div>
              ) : null;
            })()}

            {retryError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 text-sm text-red-300 flex items-center gap-3 font-medium relative z-10">
                <AlertCircle size={18} className="shrink-0" />{retryError}
              </div>
            )}

            {!canAffordRetry ? (
              <>
                <p className="text-sm text-red-400 text-center mb-6 font-medium relative z-10">Insufficient XP. Complete daily goals or quizzes to earn more.</p>
                <button onClick={() => { setTestRetryGate(null); setRetryError(''); }} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black py-4 rounded-2xl transition-all duration-300 text-base active:scale-95 relative z-10">Understood</button>
              </>
            ) : (
              <div className="flex gap-3 relative z-10">
                <button onClick={() => { setTestRetryGate(null); setRetryError(''); }} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl transition-all duration-300 text-sm active:scale-95">Cancel</button>
                <button onClick={handleRetryConfirm} disabled={retryLoading} className="flex-[2] bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-yellow-500 text-white font-black py-4 rounded-2xl transition-all duration-300 text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] active:scale-95">
                  {retryLoading ? <Loader2 size={18} className="animate-spin" /> : <><RefreshCw size={18} />Confirm Retry</>}
                </button>
              </div>
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.2); }
        
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}