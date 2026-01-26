"use client";
import Link from "next/link";
import { Brain, FileText, ArrowRight, Activity, Terminal } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8">
          <Activity size={16} /> SkillPulse AI Agent
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-br from-white via-gray-200 to-gray-600 bg-clip-text text-transparent">
          Master Your Career <br /> with Neural Intelligence.
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12">
          An autonomous agent that audits your resume, identifies skill gaps, and conducts mock interviews to get you hired.
        </p>
      </div>

      {/* Modules Grid */}
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 mb-20">
        
        {/* Module 1: Resume Analyzer (Links to your existing page) */}
        {/* NOTE: Move your existing Home component to app/resume-analyzer/page.tsx */}
        <Link href="/resume-analyzer" className="group relative bg-[#0f0f0f] border border-gray-800 hover:border-blue-500/50 rounded-3xl p-8 transition-all hover:shadow-2xl hover:shadow-blue-900/20">
          <div className="absolute top-8 right-8 bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <FileText size={24} className="text-blue-500 group-hover:text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-100">Resume Audit</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Upload your resume and JD. Our agent scans for missing keywords, suggests project ideas, and builds a study roadmap.
          </p>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-400 group-hover:text-blue-300">
            Launch Analyzer <ArrowRight size={16} />
          </div>
        </Link>

        {/* Module 2: Interview Simulator (New) */}
        <Link href="/interview-prep" className="group relative bg-[#0f0f0f] border border-gray-800 hover:border-purple-500/50 rounded-3xl p-8 transition-all hover:shadow-2xl hover:shadow-purple-900/20">
          <div className="absolute top-8 right-8 bg-purple-500/10 p-3 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <Brain size={24} className="text-purple-500 group-hover:text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4 text-gray-100">AI Interviewer</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Real-time voice/text mock interviews. Get instant feedback on clarity, confidence, and technical accuracy.
          </p>
          <div className="flex items-center gap-2 text-sm font-bold text-purple-400 group-hover:text-purple-300">
            Start Interview <ArrowRight size={16} />
          </div>
        </Link>

      </div>
    </div>
  );
}