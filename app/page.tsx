"use client";
import Link from "next/link";
import { Brain, FileText, ArrowRight, Activity, Terminal, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none"></div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Terminal size={18} />
          </div>
          SkillPulse <span className="text-blue-500">.ai</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-gray-400 font-medium">
          <button className="hover:text-white transition-colors">Features</button>
          <button className="hover:text-white transition-colors">Pricing</button>
          <button className="hover:text-white transition-colors">Docs</button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold mb-10 animate-fade-in backdrop-blur-md">
          <Sparkles size={14} className="animate-pulse" /> 
          <span className="uppercase tracking-widest">v2.0 Neural Engine Live</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent leading-[1.1]">
          Architecting <br className="hidden md:block" /> Future Careers.
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          The autonomous career agent that bridges the gap between where you are and where you want to be. 
          <span className="text-gray-200"> Audit. Upskill. Conquer.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-blue-500 hover:text-white transition-all duration-300 transform hover:scale-105">
                Get Started Free
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-full hover:bg-white/10 transition-all">
                Watch Demo
            </button>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-6 mb-32">
        
        {/* Module 1: Resume Analyzer */}
        <Link href="/resume-analyzer" 
          className="group relative overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-10 transition-all duration-500 hover:border-blue-500/40"
        >
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10">
            <div className="w-14 h-14 mb-8 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
              <FileText size={28} />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">Resume Audit</h2>
            <p className="text-gray-400 mb-10 text-lg leading-relaxed">
              Upload your resume and JD. Our agent scans for missing keywords, suggests project ideas, and builds a study roadmap.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
              Launch Analyzer <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Module 2: Interview Simulator */}
        <Link href="/interview-prep" 
          className="group relative overflow-hidden bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-10 transition-all duration-500 hover:border-purple-500/40"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative z-10">
            <div className="w-14 h-14 mb-8 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-500">
              <Brain size={28} />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white tracking-tight">AI Interviewer</h2>
            <p className="text-gray-400 mb-10 text-lg leading-relaxed">
              Real-time voice/text mock interviews. Get instant feedback on clarity, confidence, and technical accuracy.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
              Start Interview <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

      </div>

      {/* Footer / Stats */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-20 border-t border-white/5 pt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="text-center">
                <div className="text-2xl font-bold">98%</div>
                <div className="text-xs uppercase tracking-widest text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold">12k+</div>
                <div className="text-xs uppercase tracking-widest text-gray-500">Audits Run</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold">50+</div>
                <div className="text-xs uppercase tracking-widest text-gray-500">Job Roles</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold">GPT-4o</div>
                <div className="text-xs uppercase tracking-widest text-gray-500">Core Neural</div>
            </div>
        </div>
      </div>
    </div>
  );
}