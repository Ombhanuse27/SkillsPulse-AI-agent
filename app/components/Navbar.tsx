"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Cpu, Menu, ChevronLeft, ChevronRight, ChevronDown,
  Home, Map, FileText, Brain, LogOut, Zap, Flame,
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface UserStats {
  level: number;
  totalXP: number;
  currentStreak: number;
  xpToNextLevel: number;
  nextLevelXP: number;
}

interface UserProgress {
  stats: UserStats;
  dailyGoal?: any;
  achievements?: any[];
}

interface NavbarProps {
  user: any;
  onLogout: () => void;
  progress?: UserProgress;
}

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard",        href: "/dashboard",        icon: Home,     color: "text-blue-400",   bg: "bg-blue-500/10"   },
  { label: "Career Architect", href: "/dashboard",        icon: Map,      color: "text-green-400",  bg: "bg-green-500/10"  },
  { label: "Resume Audit",     href: "/resume-analyzer",  icon: FileText, color: "text-sky-400",    bg: "bg-sky-500/10"    },
  { label: "AI Interviewer",   href: "/interview-prep",   icon: Brain,    color: "text-purple-400", bg: "bg-purple-500/10" },
];

// ─── NAVBAR COMPONENT ─────────────────────────────────────────────────────────
export default function Navbar({ user, onLogout, progress }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const xpPercentage = progress?.stats
    ? ((progress.stats.nextLevelXP - progress.stats.xpToNextLevel) / progress.stats.nextLevelXP) * 100
    : 0;

  // Detect current path client-side
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-[#0d0d0d] border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#080808] border-r border-white/8 transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-[68px]" : "md:w-64"}
        `}
      >
        {/* Logo */}
        <div
          className={`flex items-center border-b border-white/8 shrink-0 h-16 transition-all duration-300 ${
            collapsed ? "px-3 justify-center" : "px-5 justify-between"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tighter group min-w-0">
            <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
              <Cpu size={17} className="text-white" />
            </div>
            {!collapsed && (
              <span className="truncate text-white">
                Skill<span className="text-blue-500">Pulse</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden md:flex w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-600 hover:text-white transition-all shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="hidden md:flex mx-auto mt-2 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 items-center justify-center text-gray-600 hover:text-white transition-all"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Nav label */}
        {!collapsed && (
          <p className="px-5 pt-5 pb-2 text-[9px] font-black uppercase tracking-[0.12em] text-gray-600">
            Menu
          </p>
        )}

        {/* Nav Items */}
        <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? "px-2 pt-3" : "px-3"}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCurrent = currentPath === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${collapsed ? "p-2.5 justify-center" : "px-3 py-2.5"}
                  ${
                    isCurrent
                      ? `${item.bg} ${item.color} border border-white/10`
                      : "text-gray-400 hover:text-white hover:bg-white/6 border border-transparent"
                  }`}
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                    ${isCurrent ? item.bg : "bg-white/4 group-hover:bg-white/10"}
                    ${item.color}`}
                >
                  <Icon size={15} />
                </div>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* XP Stats (expanded) */}
        {progress?.stats && !collapsed && (
          <div className="px-3 py-3 mx-3 mb-3 bg-[#0e0e0e] border border-white/6 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                  Level {progress.stats.level}
                </p>
                <p className="text-sm font-black text-white tabular-nums">
                  {progress.stats.totalXP.toLocaleString()}
                  <span className="text-blue-400 text-[11px] ml-1">XP</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {progress.stats.currentStreak > 0 && (
                  <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-1 text-[10px] font-bold text-orange-400">
                    <Flame size={10} />
                    {progress.stats.currentStreak}d
                  </div>
                )}
                <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Zap size={14} className="text-blue-400 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600">
              {progress.stats.xpToNextLevel} XP to Level {progress.stats.level + 1}
            </p>
          </div>
        )}

        {/* XP Stats (collapsed) */}
        {progress?.stats && collapsed && (
          <div className="flex flex-col items-center gap-2 pb-3 px-2">
            <div
              title={`${progress.stats.totalXP.toLocaleString()} XP`}
              className="w-10 h-10 bg-blue-500/10 rounded-xl flex flex-col items-center justify-center border border-blue-500/15"
            >
              <Zap size={13} className="text-blue-400" />
            </div>
            {progress.stats.currentStreak > 0 && (
              <div
                title={`${progress.stats.currentStreak} day streak`}
                className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/15"
              >
                <Flame size={13} className="text-orange-400" />
              </div>
            )}
          </div>
        )}

        {/* User + Sign Out */}
        <div className={`border-t border-white/8 shrink-0 ${collapsed ? "p-2" : "p-4"}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="w-9 h-9 rounded-xl bg-white/4 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shrink-0">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-xl bg-white/4 hover:bg-red-500/15 flex items-center justify-center text-gray-500 hover:text-red-400 transition-all shrink-0"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}