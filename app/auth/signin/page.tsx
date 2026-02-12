"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Terminal, ArrowRight } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Terminal size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Back</h2>
        <p className="text-gray-400 text-center mb-8 text-sm">Access your neural career dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Sign In"} <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          New Agent? <Link href="/auth/signup" className="text-blue-400 hover:underline">Initialize Protocol</Link>
        </div>
      </div>
    </div>
  );
}