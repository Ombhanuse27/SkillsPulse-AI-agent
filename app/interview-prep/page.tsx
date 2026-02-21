"use client";
import { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Send, Play, Terminal, Cpu, AlertCircle,
  CheckCircle, Lightbulb, BarChart2, Clock, Award, BookOpen,
  Target, TrendingUp, X, ChevronDown,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type InterviewType = "TECHNICAL" | "BEHAVIORAL" | "SYSTEM_DESIGN" | "MIXED";
type Difficulty = "JUNIOR" | "MID" | "SENIOR" | "STAFF";

type Metrics = {
  score: number;
  feedback: string;
  betterAnswer: string;
  topicsCovered: string[];
  questionNumber: number;
};

type Message = {
  sender: "AI" | "USER";
  content: string;
  metrics?: Metrics;
};

type TopicScore = { topic: string; score: number };

type FinalReport = {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  topicBreakdown: TopicScore[];
  recommendation: string;
  nextSteps: string[];
  hiringSuggestion: "Strong Hire" | "Hire" | "No Hire" | "Strong No Hire";
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const INTERVIEW_TYPES: { value: InterviewType; label: string; desc: string; icon: string }[] = [
  { value: "TECHNICAL",    label: "Technical",     desc: "Coding, algorithms, system concepts", icon: "💻" },
  { value: "BEHAVIORAL",   label: "Behavioral",    desc: "STAR method, soft skills, culture fit", icon: "🧠" },
  { value: "SYSTEM_DESIGN",label: "System Design", desc: "Architecture, scalability, trade-offs",  icon: "🏗️" },
  { value: "MIXED",        label: "Mixed",         desc: "Combination of all types",               icon: "🎯" },
];

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: "JUNIOR", label: "Junior (0–2 yrs)", color: "text-green-400 border-green-500/40 bg-green-500/10" },
  { value: "MID",    label: "Mid (2–5 yrs)",    color: "text-blue-400 border-blue-500/40 bg-blue-500/10"   },
  { value: "SENIOR", label: "Senior (5–8 yrs)", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
  { value: "STAFF",  label: "Staff (8+ yrs)",   color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
];

// ─── Score Ring Component ───────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  // Guard against undefined / NaN coming in before the first AI response
  const safeScore   = typeof score === "number" && !isNaN(score) ? score : 0;
  const radius      = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (safeScore / 100) * circumference;
  const color       = safeScore >= 75 ? "#22c55e" : safeScore >= 50 ? "#eab308" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span className="absolute font-black text-base" style={{ color }}>{safeScore}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function InterviewPrep() {
  // Setup
  const [started, setStarted]             = useState(false);
  const [role, setRole]                   = useState("Full Stack Developer");
  const [interviewType, setInterviewType] = useState<InterviewType>("TECHNICAL");
  const [difficulty, setDifficulty]       = useState<Difficulty>("MID");
  const [topics, setTopics]               = useState("");
  const [maxQuestions, setMaxQuestions]   = useState(7);

  // Session
  const [loading, setLoading]               = useState(false);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [input, setInput]                   = useState("");
  const [sessionId, setSessionId]           = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [scores, setScores]                 = useState<number[]>([]);
  const [allTopics, setAllTopics]           = useState<Set<string>>(new Set());
  const [isInterviewOver, setIsInterviewOver] = useState(false);
  const [finalReport, setFinalReport]       = useState<FinalReport | null>(null);
  const [showReport, setShowReport]         = useState(false);

  // Timer
  const [timeLeft, setTimeLeft]       = useState(120);
  const [timerActive, setTimerActive] = useState(false);

  // Hint
  const [hint, setHint]           = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintUsed, setHintUsed]   = useState(false);

  // Voice — default OFF, toggle on click, persistent ref for stop()
  const [isListening, setIsListening]   = useState(false);
  const [interimText, setInterimText]   = useState("");       // live preview while mic is on
  const recognitionRef                  = useRef<any>(null);  // persistent SR instance
  const finalTranscriptRef              = useRef("");         // accumulated confirmed words

  // Mobile panel
  const [showMobileMetrics, setShowMobileMetrics] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timeLeft]);

  const resetTimer = () => { setTimeLeft(120); setTimerActive(true); };

  const resetSession = () => {
    setStarted(false);
    setMessages([]);
    setScores([]);
    setAllTopics(new Set());
    setQuestionNumber(0);
    setIsInterviewOver(false);
    setFinalReport(null);
    setShowReport(false);
    setHint(null);
    setHintUsed(false);
    setTimerActive(false);
  };

  // ─── Start Interview ──────────────────────────────────────────────────────────
  const startInterview = async () => {
    setLoading(true);
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    const intros: Record<InterviewType, string> = {
      TECHNICAL:     `Welcome! I'm your AI technical interviewer for the **${role}** position (${difficulty} level). Let's begin — Can you walk me through how you'd design a RESTful API and what key principles guide your decisions?`,
      BEHAVIORAL:    `Welcome! I'm your AI behavioral interviewer for the **${role}** role. To start — Tell me about a time you faced a major challenge at work. Please use the STAR method: Situation, Task, Action, Result.`,
      SYSTEM_DESIGN: `Welcome! I'm your AI system design interviewer for the **${role}** position. Let's dive in — Design a URL shortening service like bit.ly. Walk me through your approach step by step.`,
      MIXED:         `Welcome! I'm your AI interviewer for the **${role}** position (${difficulty} level). We'll mix technical, behavioral, and system design questions. To start — Give me a brief overview of your background and what excites you most about this role.`,
    };

    setMessages([{ sender: "AI", content: intros[interviewType] }]);
    setQuestionNumber(1);
    setStarted(true);
    setLoading(false);
    resetTimer();
  };

  // ─── Handle Answer Submission ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setTimerActive(false);
    const userMsg = input;
    setInput("");
    setHint(null);
    setHintUsed(false);

    const newMessages: Message[] = [...messages, { sender: "USER", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const lastAiMsg = [...messages].reverse().find(m => m.sender === "AI");

      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          sessionId,
          userAnswer: userMsg,
          currentQuestion: lastAiMsg?.content || "Introduction",
          role,
          interviewType,
          difficulty,
          topics,
          questionNumber,
          maxQuestions,
          hintUsed,
        }),
      });

      const data = await res.json();

      if (data.score !== undefined) setScores(prev => [...prev, data.score]);

      if (data.topicsCovered?.length) {
        setAllTopics(prev => {
          const next = new Set(prev);
          (data.topicsCovered as string[]).forEach(t => next.add(t));
          return next;
        });
      }

      const newQNum = questionNumber + 1;
      setQuestionNumber(newQNum);

      const isOver = data.isInterviewOver || newQNum > maxQuestions;
      setIsInterviewOver(isOver);

      setMessages(prev => [
        ...prev,
        {
          sender: "AI",
          content: isOver
            ? (data.nextQuestion || "That concludes our interview! You did great. 🎉 Check your full report below.")
            : data.nextQuestion,
          metrics: {
            score: data.score,
            feedback: data.feedback,
            betterAnswer: data.betterAnswer,
            topicsCovered: data.topicsCovered || [],
            questionNumber: questionNumber,
          },
        },
      ]);

      if (isOver && data.finalReport) setFinalReport(data.finalReport);
      if (!isOver) resetTimer();

    } catch {
      alert("Error getting AI response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Hint Request ──────────────────────────────────────────────────────────────
  const handleHint = async () => {
    if (hintLoading || hintUsed) return;
    setHintLoading(true);
    const lastAiMsg = [...messages].reverse().find(m => m.sender === "AI");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hint",
          currentQuestion: lastAiMsg?.content || "",
          role,
          interviewType,
          difficulty,
        }),
      });
      const data = await res.json();
      setHint(data.hint);
      setHintUsed(true);
    } catch {
      setHint("Think about the core concepts involved and break the problem into smaller parts.");
    } finally {
      setHintLoading(false);
    }
  };

  // ─── Voice Input — Toggle ON/OFF with live interim preview ───────────────────
  const toggleVoiceInput = () => {
    // ── STOP if already listening ────────────────────────────────────────────
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();   // triggers onend → cleans up
      return;
    }

    // ── START ────────────────────────────────────────────────────────────────
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SR();

    // ── Grammar hint: boosts recognition of technical vocabulary ─────────────
    // SpeechGrammarList is still experimental but helps Chrome & Edge pick the
    // right word when homophones exist (e.g. "array" vs "a ray", "queue" vs "cue")
    try {
      const SGL =
        (window as any).SpeechGrammarList ||
        (window as any).webkitSpeechGrammarList;
      if (SGL) {
        const techTerms = [
          // data structures & algorithms
          "array","linked list","hash map","hash table","binary tree","binary search",
          "depth first search","breadth first search","dynamic programming","memoization",
          "recursion","queue","stack","heap","trie","graph","adjacency list",
          "time complexity","space complexity","big O","O of n","O of log n",
          // languages & runtimes
          "JavaScript","TypeScript","Python","Java","Golang","Rust","C plus plus",
          "Node.js","Next.js","React","Vue","Angular","Svelte",
          // infra & cloud
          "Docker","Kubernetes","AWS","GCP","Azure","S3","EC2","Lambda",
          "Terraform","CI CD","GitHub Actions","Jenkins",
          // databases
          "PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","DynamoDB",
          "SQL","NoSQL","indexing","sharding","replication","ACID","BASE",
          // system design
          "load balancer","CDN","cache","message queue","Kafka","RabbitMQ",
          "microservices","monolith","API gateway","REST","GraphQL","gRPC",
          "WebSocket","rate limiting","circuit breaker","eventual consistency",
          // web & security
          "JWT","OAuth","HTTPS","SSL","TLS","CORS","CSRF","XSS",
          "authentication","authorization","middleware","webhook",
          // patterns
          "singleton","factory","observer","decorator","pub sub","CQRS","event sourcing",
        ].join(" | ");
        const grammar = `#JSGF V1.0; grammar tech; public <tech> = ${techTerms};`;
        const list = new SGL();
        list.addFromString(grammar, 1);
        recognition.grammars = list;
      }
    } catch {
      // Grammar API not available — continue without it, accuracy still fine
    }

    recognition.lang            = "en-US";
    recognition.continuous      = true;   // keep listening until user clicks OFF
    recognition.interimResults  = true;   // stream partial results for live preview
    recognition.maxAlternatives = 1;

    finalTranscriptRef.current = "";

    recognition.onresult = (e: any) => {
      let interim = "";
      let final   = finalTranscriptRef.current;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          // Append finalised chunk with a space separator
          final += (final && !final.endsWith(" ") ? " " : "") + transcript.trim();
        } else {
          interim = transcript;
        }
      }

      finalTranscriptRef.current = final;
      setInterimText(interim);          // show grey live preview
    };

    recognition.onend = () => {
      // Commit everything that was confirmed into the textarea
      const committed = finalTranscriptRef.current.trim();
      if (committed) {
        setInput(prev => (prev && !prev.endsWith(" ") ? prev + " " : prev) + committed);
      }
      finalTranscriptRef.current = "";
      setInterimText("");
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (e: any) => {
      // "no-speech" is benign — just means silence; ignore it
      if (e.error !== "no-speech") {
        console.warn("SpeechRecognition error:", e.error);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  // Cleanup: stop recognition if component unmounts mid-session
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  // ─── Derived State ─────────────────────────────────────────────────────────────
  const avgScore    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const lastMetrics = messages.length > 0 && messages[messages.length - 1].sender === "AI"
    ? messages[messages.length - 1].metrics : null;
  const timerColor  = timeLeft > 60 ? "text-green-400" : timeLeft > 30 ? "text-yellow-400" : "text-red-400 animate-pulse";
  const progress    = Math.min(((questionNumber - 1) / maxQuestions) * 100, 100);
  const hiringColor = (s: string) => s.includes("Strong Hire") ? "text-green-400" : s === "Hire" ? "text-blue-400" : s === "No Hire" ? "text-yellow-400" : "text-red-400";

  // ══════════════════════════════════════════════════════════════════════════════
  // SETUP SCREEN
  // ══════════════════════════════════════════════════════════════════════════════
  if (!started) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 text-white">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center">
            <div className="inline-flex p-4 bg-purple-900/20 rounded-2xl text-purple-400 mb-4">
              <Cpu size={38} />
            </div>
            <h1 className="text-3xl font-black mb-2">AI Interview Simulator</h1>
            <p className="text-gray-500 text-sm">Production-grade mock interviews with real-time AI evaluation, scoring & reports</p>
          </div>

          <div className="bg-[#111] rounded-2xl border border-gray-800 p-6 space-y-6">
            {/* Role */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Target Role</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g., Senior React Developer, ML Engineer, DevOps Lead..."
                className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Interview Type */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Interview Type</label>
              <div className="grid grid-cols-2 gap-3">
                {INTERVIEW_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setInterviewType(type.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      interviewType === type.value
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-xl mb-1">{type.icon}</div>
                    <div className="font-bold text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Seniority Level</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      difficulty === d.value ? d.color : "border-gray-700 text-gray-500 bg-[#1a1a1a] hover:border-gray-600"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topics & Question Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Focus Topics (optional)</label>
                <input
                  value={topics}
                  onChange={e => setTopics(e.target.value)}
                  placeholder="e.g., React, Docker, SQL..."
                  className="w-full bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                  Questions — <span className="text-purple-400">{maxQuestions}</span>
                </label>
                <input
                  type="range" min={3} max={10} value={maxQuestions}
                  onChange={e => setMaxQuestions(parseInt(e.target.value))}
                  className="w-full mt-4 accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1"><span>3</span><span>10</span></div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startInterview}
              disabled={loading || !role.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <Play size={20} /> Start Interview Session
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {["Real-time Scoring","Voice Input","Hint System","Final Report","Topic Tracking","Score History"].map(f => (
              <span key={f} className="px-3 py-1 bg-[#111] border border-gray-800 rounded-full text-xs text-gray-500">{f}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MAIN INTERVIEW SCREEN
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-800 flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── LEFT: Chat Area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="px-5 py-3 border-b border-gray-800 bg-[#0f0f0f] flex items-center justify-between gap-3 flex-shrink-0">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{role}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                Live · Q{questionNumber}/{maxQuestions} · {interviewType.replace("_"," ")} · {difficulty}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Timer */}
              <div className={`flex items-center gap-1 font-mono font-bold text-sm ${timerColor}`}>
                <Clock size={13} />
                {String(Math.floor(timeLeft / 60)).padStart(2,"0")}:{String(timeLeft % 60).padStart(2,"0")}
              </div>

              {/* Avg Score badge */}
              {avgScore !== null && (
                <div className="hidden sm:flex items-center gap-1.5 bg-[#1a1a1a] border border-gray-700 px-2.5 py-1 rounded-lg text-xs">
                  <TrendingUp size={11} className="text-purple-400" />
                  <span className="text-gray-400">Avg</span>
                  <span className="font-bold">{avgScore}</span>
                </div>
              )}

              {/* Mobile metrics toggle */}
              <button
                onClick={() => setShowMobileMetrics(v => !v)}
                className="md:hidden p-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg"
              >
                <BarChart2 size={15} />
              </button>

              <button onClick={resetSession} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 transition">
                End
              </button>
            </div>
          </header>

          {/* Mobile Metrics Drawer */}
          {showMobileMetrics && (
            <div className="md:hidden bg-[#111] border-b border-gray-800 p-4 max-h-64 overflow-y-auto">
              {lastMetrics ? (
                <div className="flex gap-4 items-start">
                  <ScoreRing score={lastMetrics.score} size={64} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{lastMetrics.feedback}</p>
                    {allTopics.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(allTopics).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-purple-900/40 text-purple-300 rounded text-xs">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-xs text-center">Submit an answer to see live evaluation.</p>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "USER" ? "justify-end" : "justify-start"}`}>
                {msg.sender === "AI" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-[10px] font-black mr-2 flex-shrink-0 mt-1">AI</div>
                )}
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === "USER"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-[#1a1a1a] border border-gray-800 text-gray-200 rounded-bl-none"
                }`}>
                  {msg.content}
                  {/* Topic tags */}
                  {msg.metrics?.topicsCovered?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-700/60">
                      {msg.metrics.topicsCovered.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-full text-xs">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Hint bubble */}
            {hint && (
              <div className="flex justify-center">
                <div className="max-w-[80%] bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl text-sm text-yellow-200">
                  <div className="flex items-center gap-1.5 font-bold text-yellow-400 mb-1.5 text-xs uppercase">
                    <Lightbulb size={11} /> Hint
                  </div>
                  {hint}
                </div>
              </div>
            )}

            {/* AI thinking indicator */}
            {loading && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-[10px] font-black">AI</div>
                <div className="bg-[#1a1a1a] px-4 py-3 rounded-2xl flex items-center gap-1.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!isInterviewOver ? (
            <div className="p-4 bg-[#0f0f0f] border-t border-gray-800 space-y-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHint}
                  disabled={hintLoading || hintUsed || loading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-40 transition"
                >
                  <Lightbulb size={11} />
                  {hintLoading ? "Loading..." : hintUsed ? "Hint Used ✓" : "Get Hint (−5 pts)"}
                </button>
                <span className="text-gray-700 text-xs hidden sm:inline">· Shift+Enter for new line · Enter to submit</span>
              </div>

              <div className="flex gap-2">
                {/* Mic toggle — OFF by default, click to start, click again to stop */}
                <button
                  onClick={toggleVoiceInput}
                  title={isListening ? "Click to stop recording" : "Click to start voice input"}
                  className={`p-3 rounded-xl border transition flex-shrink-0 ${
                    isListening
                      ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse"
                      : "border-gray-700 bg-[#1a1a1a] text-gray-400 hover:border-gray-500 hover:text-white"
                  }`}
                >
                  {isListening ? <MicOff size={17} /> : <Mic size={17} />}
                </button>

                {/* Textarea: shows committed input + live interim preview in grey */}
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={isListening ? "Listening... speak now" : "Type your answer... (Enter to submit)"}
                    rows={3}
                    className={`w-full bg-[#1a1a1a] border p-3 rounded-xl text-white text-sm focus:outline-none transition resize-none ${
                      isListening ? "border-red-500/60 focus:border-red-400" : "border-gray-700 focus:border-purple-500"
                    }`}
                  />
                  {/* Live interim transcript shown below the textarea */}
                  {isListening && interimText && (
                    <div className="absolute left-0 -bottom-6 text-xs text-gray-500 italic px-1 truncate max-w-full">
                      <span className="text-red-400">●</span> {interimText}
                    </div>
                  )}
                  {/* Mic active indicator label */}
                  {isListening && !interimText && (
                    <div className="absolute left-0 -bottom-6 text-xs text-red-400 italic px-1">
                      <span className="animate-pulse">●</span> Listening — speak your answer...
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && !isListening)}
                  className="p-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-xl flex-shrink-0 transition self-end"
                >
                  <Send size={17} />
                </button>
              </div>
              {/* Spacer so interim label doesn't overlap the border */}
              {isListening && <div className="h-5" />}
            </div>
          ) : (
            <div className="p-5 bg-[#0f0f0f] border-t border-gray-800 flex items-center justify-center gap-3 flex-shrink-0">
              <span className="text-gray-400 text-sm">Interview complete! 🎉</span>
              <button
                onClick={() => setShowReport(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-sm flex items-center gap-2 transition"
              >
                <Award size={16} /> View Full Report
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Analysis Panel ─────────────────────────────────────────────── */}
        <div className="hidden md:flex w-96 bg-[#111] border-l border-gray-800 flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto flex-1">
            <h3 className="font-bold text-gray-400 text-xs uppercase mb-5 flex items-center gap-2">
              <Terminal size={12} /> Live Evaluator
            </h3>

            {lastMetrics ? (
              <div className="space-y-4">
                {/* Score Card */}
                <div className="p-5 bg-[#1a1a1a] rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Answer Score</div>
                    <div className="text-xs text-gray-600 mt-0.5">Q{lastMetrics.questionNumber} of {maxQuestions}</div>
                    {avgScore !== null && (
                      <div className="text-xs text-purple-400 mt-2 font-semibold flex items-center gap-1">
                        <TrendingUp size={10} /> Session Avg: {avgScore}/100
                      </div>
                    )}
                  </div>
                  <ScoreRing score={lastMetrics.score} />
                </div>

                {/* Score History Bar Chart */}
                {scores.length > 1 && (
                  <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Score History</div>
                    <div className="flex items-end gap-1.5 h-14">
                      {scores.map((s, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t transition-all duration-500"
                            style={{
                              height: `${(s / 100) * 44}px`,
                              background: s >= 75 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444",
                              opacity: 0.85,
                            }}
                          />
                          <span className="text-[9px] text-gray-600">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics Covered */}
                {allTopics.size > 0 && (
                  <div className="p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <BookOpen size={10} /> Topics Assessed
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(allTopics).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-full text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl">
                  <h4 className="text-red-400 font-bold text-xs uppercase mb-2 flex items-center gap-1.5">
                    <AlertCircle size={11} /> Feedback
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{lastMetrics.feedback}</p>
                </div>

                {/* Better Answer */}
                <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-green-400 font-bold text-xs uppercase flex items-center gap-1.5">
                      <CheckCircle size={11} /> Suggested Answer
                    </h4>
                    <button
                      onClick={() => navigator.clipboard.writeText(lastMetrics.betterAnswer)}
                      className="text-[10px] text-gray-600 hover:text-gray-300 transition"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{lastMetrics.betterAnswer}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-center">
                <Cpu size={28} className="mb-3 opacity-20" />
                <p className="text-sm">Submit an answer to receive real-time AI critique and scoring.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ FINAL REPORT MODAL ═══════════════════════════════════════════════════ */}
      {showReport && finalReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#111] z-10">
              <div>
                <h2 className="text-xl font-black">Interview Report</h2>
                <p className="text-gray-500 text-sm">{role} · {interviewType.replace("_"," ")} · {difficulty}</p>
              </div>
              <button onClick={() => setShowReport(false)} className="p-2 hover:bg-gray-800 rounded-lg transition">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Overall Score */}
              <div className="flex items-center justify-between p-5 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Overall Performance</div>
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    {finalReport.overallScore}/100
                  </div>
                  <div className={`text-sm font-bold mt-2 ${hiringColor(finalReport.hiringSuggestion)}`}>
                    {finalReport.hiringSuggestion}
                  </div>
                </div>
                <ScoreRing score={finalReport.overallScore} size={90} />
              </div>

              {/* Topic Breakdown */}
              {finalReport.topicBreakdown?.length > 0 && (
                <div className="p-5 bg-[#1a1a1a] rounded-xl border border-gray-800">
                  <h3 className="font-bold text-sm mb-4 text-gray-300 flex items-center gap-2">
                    <BarChart2 size={14} className="text-purple-400" /> Topic Breakdown
                  </h3>
                  <div className="space-y-3">
                    {finalReport.topicBreakdown.map(({ topic, score }) => (
                      <div key={topic}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{topic}</span>
                          <span className="font-bold text-white">{score}/100</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${score}%`,
                              background: score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-green-900/10 border border-green-500/20 rounded-xl">
                  <h3 className="font-bold text-green-400 text-xs uppercase mb-3 flex items-center gap-1.5">
                    <CheckCircle size={11} /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {finalReport.strengths.map((s, i) => (
                      <li key={i} className="text-gray-400 text-xs flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 bg-red-900/10 border border-red-500/20 rounded-xl">
                  <h3 className="font-bold text-red-400 text-xs uppercase mb-3 flex items-center gap-1.5">
                    <AlertCircle size={11} /> Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {finalReport.weaknesses.map((w, i) => (
                      <li key={i} className="text-gray-400 text-xs flex items-start gap-2">
                        <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendation */}
              <div className="p-5 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <h3 className="font-bold text-sm mb-2 text-gray-300 flex items-center gap-2">
                  <Target size={13} className="text-purple-400" /> Recommendation
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{finalReport.recommendation}</p>
              </div>

              {/* Next Steps */}
              {finalReport.nextSteps?.length > 0 && (
                <div className="p-5 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                  <h3 className="font-bold text-blue-400 text-xs uppercase mb-3 flex items-center gap-1.5">
                    <BookOpen size={11} /> Next Steps
                  </h3>
                  <ol className="space-y-2">
                    {finalReport.nextSteps.map((step, i) => (
                      <li key={i} className="text-gray-400 text-xs flex items-start gap-2">
                        <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span> {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Start New */}
              <button
                onClick={resetSession}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                <Play size={15} /> Start New Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}