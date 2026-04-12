"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, UserPlus, Loader2, Zap, Shield, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/auth/signin"), 2500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-blue-900/15 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-purple-900/8 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-xl tracking-tighter group mb-6">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/60 transition-all">
              <Cpu size={17} className="text-white" />
            </div>
            Skill<span className="text-blue-500">Pulse</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">

          {success ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Zap size={28} className="text-green-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Account Created!</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Check your email to confirm, then sign in to start your first free mission.
              </p>
              <div className="mt-4 w-full bg-white/5 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full animate-[grow_2.5s_linear_forwards]" style={{ width: "0%" }} />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                  Initialize Agent
                </h2>
                <p className="text-gray-500 text-sm">Create your autonomous career profile</p>
              </div>

              {/* Free tier callout */}
              <div className="flex items-center gap-3 bg-blue-500/8 border border-blue-500/15 rounded-2xl px-4 py-3 mb-6">
                <div className="w-8 h-8 bg-blue-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Zap size={15} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-blue-300">First mission is FREE</p>
                  <p className="text-[11px] text-gray-600">No credit card required to get started</p>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/4 border border-white/8 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/3 transition-all placeholder:text-gray-700"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/4 border border-white/8 rounded-2xl px-4 py-3.5 pr-12 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:bg-blue-500/3 transition-all placeholder:text-gray-700"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-4 py-3 text-red-300 text-xs font-medium">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black font-black py-3.5 rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <><Loader2 size={15} className="animate-spin" />Creating account…</>
                  ) : (
                    <>Create Account <UserPlus size={15} /></>
                  )}
                </button>
              </form>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-5">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                  <Shield size={10} className="text-gray-600" />
                  Secure & encrypted
                </div>
                <div className="w-px h-3 bg-white/8" />
                <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                  <Zap size={10} className="text-gray-600" />
                  Free forever plan
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/5 text-center text-sm text-gray-600">
                Already active?{" "}
                <Link
                  href="/auth/signin"
                  className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
                >
                  Sign In <ArrowRight size={12} className="inline" />
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-6">
          By signing up you agree to our{" "}
          <button className="text-gray-600 hover:text-white transition-colors">Terms</button>{" "}
          &{" "}
          <button className="text-gray-600 hover:text-white transition-colors">Privacy Policy</button>
        </p>
      </div>

      <style jsx>{`
        @keyframes grow {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  );
}