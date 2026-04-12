"use client";
import Link from "next/link";
import { Brain, FileText, ArrowRight, Terminal, Sparkles, Map, Menu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] sm:w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px] sm:blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] sm:w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[100px] sm:blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] sm:opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tighter">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Terminal size={16} className="sm:w-[18px] sm:h-[18px]" />
          </div>
          SkillPulse <span className="text-blue-500">.ai</span>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 text-sm text-gray-400 font-medium">
          <button className="hover:text-white transition-colors">Features</button>
          <button className="hover:text-white transition-colors">Pricing</button>
          <button className="hover:text-white transition-colors">Docs</button>
        </div>

        {/* Mobile Nav Toggle */}
        <button className="md:hidden text-gray-400 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-400 text-[10px] sm:text-xs font-bold mb-8 sm:mb-10 animate-fade-in backdrop-blur-md">
          <Sparkles size={14} className="animate-pulse" /> 
          <span className="uppercase tracking-widest">v2.0 Neural Engine Live</span>
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 sm:mb-8 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent leading-[1.1] sm:leading-[1.1]">
          Architecting <br className="hidden sm:block" /> Future Careers.
        </h1>
        
        <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed px-4 sm:px-0">
          The autonomous career agent that bridges the gap between where you are and where you want to be. 
          <span className="text-gray-200 block sm:inline mt-2 sm:mt-0"> Audit. Plan. Conquer.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto sm:max-w-none">
            <Link href="/auth/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-105 text-center shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]">
                Get Started Free
            </Link>
            <Link href="/auth/signin" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-full hover:bg-white/10 transition-all text-center backdrop-blur-sm">
                Sign In
            </Link>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24 sm:mb-32">
        
        {/* Module 1: Path Planner */}
        <Link href="/dashboard" 
          className="group relative overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-6 sm:p-8 transition-all duration-500 hover:border-green-500/40 flex flex-col hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-6 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all duration-500">
              <Map size={24} className="sm:w-[28px] sm:h-[28px]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white tracking-tight">Career Architect</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed flex-1">
              Input your dream role. Our multi-agent system plans the milestones, scrapes resources, and schedules your success.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-green-400 mt-auto">
              Generate Roadmap <ArrowRight size={16} className="sm:w-[18px] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Module 2: Resume Analyzer */}
        <Link href="/resume-analyzer" 
          className="group relative overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-6 sm:p-8 transition-all duration-500 hover:border-blue-500/40 flex flex-col hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-6 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
              <FileText size={24} className="sm:w-[28px] sm:h-[28px]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white tracking-tight">Resume Audit</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed flex-1">
              Upload your resume and JD. Our agent scans for missing keywords, suggests project ideas, and builds a study roadmap.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-400 mt-auto">
              Launch Analyzer <ArrowRight size={16} className="sm:w-[18px] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Module 3: Interview Simulator */}
        <Link href="/interview-prep" 
          className="group relative overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-6 sm:p-8 transition-all duration-500 hover:border-purple-500/40 flex flex-col md:col-span-2 lg:col-span-1 hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-6 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-500">
              <Brain size={24} className="sm:w-[28px] sm:h-[28px]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white tracking-tight">AI Interviewer</h2>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed flex-1">
              Real-time voice/text mock interviews. Get instant feedback on clarity, confidence, and technical accuracy.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-purple-400 mt-auto">
              Start Interview <ArrowRight size={16} className="sm:w-[18px] group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

      </div>

      {/* Footer / Stats */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20 border-t border-white/5 pt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 opacity-60 hover:opacity-100 transition-all duration-500">
            <div className="text-center group">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-t from-gray-500 to-white bg-clip-text text-transparent mb-1">98%</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-400 transition-colors">Success Rate</div>
            </div>
            <div className="text-center group">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-t from-gray-500 to-white bg-clip-text text-transparent mb-1">12k+</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-400 transition-colors">Audits Run</div>
            </div>
            <div className="text-center group">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-t from-gray-500 to-white bg-clip-text text-transparent mb-1">50+</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-400 transition-colors">Job Roles</div>
            </div>
            <div className="text-center group">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-t from-gray-500 to-white bg-clip-text text-transparent mb-1">GPT-4o</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-400 transition-colors">Core Neural</div>
            </div>
        </div>
      </div>
    </div>
  );
}