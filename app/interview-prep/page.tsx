"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, Send, Play, Terminal, Cpu, AlertCircle, CheckCircle } from "lucide-react";

// Types
type Message = {
  sender: "AI" | "USER";
  content: string;
  metrics?: { score: number; feedback: string; betterAnswer: string };
};

export default function InterviewPrep() {
  const [started, setStarted] = useState(false);
  const [role, setRole] = useState("Full Stack Developer");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startInterview = async () => {
    setLoading(true);
    // Create session via API (Simplified for brevity, usually you'd hit an endpoint to create session ID)
    const newSessionId = crypto.randomUUID(); 
    setSessionId(newSessionId);
    
    // Initial AI Message
    setMessages([{ sender: "AI", content: `Hello! I'm your AI interviewer for the ${role} position. Let's start with a foundational question. Tell me about a challenging technical problem you solved recently.` }]);
    setStarted(true);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    
    // Add User Message immediately
    const newMessages = [...messages, { sender: "USER", content: userMsg } as Message];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Find the last question asked by AI
      const lastAiMsg = [...messages].reverse().find(m => m.sender === "AI");

      // Inside handleSend() in app/interview-prep/page.tsx

const res = await fetch("/api/interview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId,
    userAnswer: userMsg,
    currentQuestion: lastAiMsg ? lastAiMsg.content : "Intro",
    role: role // <--- ADD THIS LINE
  })
});

      const data = await res.json();
      
      setMessages(prev => [
        ...prev, 
        { 
          sender: "AI", 
          content: data.nextQuestion,
          metrics: {
            score: data.score,
            feedback: data.feedback,
            betterAnswer: data.betterAnswer
          }
        }
      ]);
    } catch (err) {
      alert("Error getting AI response");
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-[#111] p-8 rounded-2xl border border-gray-800">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-purple-900/20 rounded-full text-purple-400">
              <Cpu size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Configure Interview</h2>
          <p className="text-gray-500 text-center text-sm mb-6">Select a role to generate a custom interview pack.</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Target Role</label>
              <input 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-lg mt-1 text-white" 
              />
            </div>
            <button 
              onClick={startInterview} 
              disabled={loading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              <Play size={20} /> Start Simulation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      
      {/* LEFT: Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        <header className="p-6 border-b border-gray-800 bg-[#0f0f0f] flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">{role} Interview</h1>
            <span className="text-xs text-green-500 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live Session</span>
          </div>
          <button onClick={() => setStarted(false)} className="text-xs text-red-400 hover:text-red-300">End Session</button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "USER" 
                  ? "bg-blue-600 text-white rounded-br-none" 
                  : "bg-[#1a1a1a] border border-gray-800 text-gray-200 rounded-bl-none"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-[#1a1a1a] p-4 rounded-2xl text-gray-500 text-sm animate-pulse">AI is thinking...</div></div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 bg-[#0f0f0f] border-t border-gray-800">
          <div className="relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer here..."
              className="w-full bg-[#1a1a1a] border border-gray-700 p-4 pr-12 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
            />
            <button onClick={handleSend} className="absolute right-3 top-3 p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-500">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Real-time Analysis Panel */}
      <div className="hidden md:flex w-96 bg-[#111] border-l border-gray-800 flex-col p-6 overflow-y-auto">
        <h3 className="font-bold text-gray-400 text-xs uppercase mb-6 flex items-center gap-2">
          <Terminal size={14} /> Live Evaluator
        </h3>

        {messages.length > 0 && messages[messages.length - 1].sender === "AI" && messages[messages.length - 1].metrics ? (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             {/* Score Card */}
             <div className="p-6 bg-[#1a1a1a] rounded-xl border border-gray-800 text-center">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  {messages[messages.length - 1].metrics?.score}/100
                </div>
                <div className="text-xs text-gray-500 mt-2 uppercase tracking-widest">Answer Quality</div>
             </div>

             {/* Feedback */}
             <div className="space-y-4">
                <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-lg">
                  <h4 className="text-red-400 font-bold text-xs uppercase mb-2 flex items-center gap-2"><AlertCircle size={12}/> Feedback</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {messages[messages.length - 1].metrics?.feedback}
                  </p>
                </div>

                <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-lg">
                  <h4 className="text-green-400 font-bold text-xs uppercase mb-2 flex items-center gap-2"><CheckCircle size={12}/> Suggested Answer</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {messages[messages.length - 1].metrics?.betterAnswer}
                  </p>
                </div>
             </div>
           </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600 text-center p-4">
             <Cpu size={32} className="mb-3 opacity-20"/>
             <p className="text-sm">Submit an answer to receive real-time AI critique and scoring.</p>
          </div>
        )}
      </div>

    </div>
  );
}