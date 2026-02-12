"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, Play, CheckCircle, ExternalLink, Map, LogOut, Code, Video } from 'lucide-react';

// GraphQL Fetcher
async function fetchRoadmaps(userId: string) {
  const query = `
    query {
      myRoadmaps(userId: "${userId}") {
        id
        title
        milestones {
          title
          description
          week
          resources {
            title
            url
            type
          }
        }
      }
    }
  `;
  const res = await fetch('/api/graphql-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  return json.data?.myRoadmaps || [];
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth/signin');
      setUser(user);
      const maps = await fetchRoadmaps(user.id);
      setRoadmaps(maps);
    };
    init();
  }, []);

  const handleGenerate = async () => {
    if(!goal) return;
    setLoading(true);
    
    // Call LangGraph Agent
    await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({ goal, userId: user.id }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const updatedMaps = await fetchRoadmaps(user.id);
    setRoadmaps(updatedMaps);
    setGoal('');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Map size={18} />
          </div>
          SkillPulse <span className="text-gray-500">/ Dashboard</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* INPUT COLUMN (Left) */}
        <div className="lg:col-span-4">
          <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-3xl sticky top-8">
            <h2 className="text-2xl font-bold mb-2">New Mission</h2>
            <p className="text-gray-400 text-sm mb-6">Describe your target role. Our agents will plan, research, and schedule it.</p>
            
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white min-h-[140px] focus:outline-none focus:border-blue-500 mb-4 transition-colors resize-none"
              placeholder="e.g. I want to become a Senior Full Stack Engineer specializing in Next.js and AI integration..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            
            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-blue-500 hover:text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
              {loading ? "Architecting..." : "Generate Roadmap"}
            </button>

            {loading && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-green-400 animate-fade-in">
                    <CheckCircle size={16} /> Planner: Analyzing Skills...
                </div>
                <div className="flex items-center gap-3 text-sm text-blue-400 animate-pulse delay-75">
                    <Loader2 size={16} className="animate-spin" /> Researcher: Scraping Content...
                </div>
                <div className="flex items-center gap-3 text-sm text-purple-400 animate-pulse delay-150">
                    <Loader2 size={16} className="animate-spin" /> Scheduler: Finalizing...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS COLUMN (Right) */}
        <div className="lg:col-span-8 space-y-8">
          {roadmaps.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-white/10 rounded-3xl text-gray-500">
                <Map size={48} className="mb-4 opacity-20" />
                <p>No active missions. Start one on the left.</p>
            </div>
          )}

          {roadmaps.map((map) => (
            <div key={map.id} className="group relative bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all">
              <div className="p-8 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-1">{map.title}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">AI Generated Strategy</p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20">
                        Active
                    </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-3.5 before:h-full before:w-0.5 before:bg-white/5">
                  {map.milestones.map((milestone: any, idx: number) => (
                    <div key={idx} className="relative pl-12">
                      {/* Timeline Dot */}
                      <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#111] border border-blue-500/50 flex items-center justify-center text-xs text-blue-500 font-bold z-10 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                        {idx + 1}
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                        <h4 className="font-bold text-lg text-white">{milestone.title}</h4>
                        <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">Week {milestone.week}</span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-6 leading-relaxed">{milestone.description}</p>
                      
                      {/* Resources */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {milestone.resources.map((res: any, rId: number) => (
                          <a key={rId} href={res.url} target="_blank" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-3 rounded-xl transition-all group/link">
                             {res.type === 'YOUTUBE' ? <Video size={16} className="text-red-500" /> : <Code size={16} className="text-blue-500" />}
                             <span className="text-xs truncate flex-1 text-gray-300 group-hover/link:text-white font-medium">
                               {res.title}
                             </span>
                             <ExternalLink size={12} className="text-gray-600 group-hover/link:text-white transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}