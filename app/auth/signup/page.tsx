"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Terminal, UserPlus } from 'lucide-react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 1. Create Auth User
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else {
      // 2. Note: Ideally, you use a webhook to sync Prisma. 
      // For this demo, we assume Auth is enough to proceed.
      alert('Check your email for confirmation!');
      router.push('/auth/signin');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white">
            <Terminal size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">Initialize Agent</h2>
        <p className="text-gray-400 text-center mb-8 text-sm">Create your autonomous career profile</p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Create Password"
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Creating..." : "Create Account"} <UserPlus size={16} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already active? <Link href="/auth/signin" className="text-green-400 hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}