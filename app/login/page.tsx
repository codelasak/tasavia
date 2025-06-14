"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { auth } from "@/lib/auth";

import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in (in useEffect)
  // This logic is now handled in AuthProvider for centralization.
  // useEffect(() => {
  //   if (!loading && user) {
  //     router.replace("/portal/dashboard");
  //   }
  // }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    console.log("Attempting login with email:", email);

    const { error, user: signedInUser } = await auth.signIn(email, password);
    setSubmitting(false);

    if (error) {
      console.error("Login error:", error);
      setError(error);
    } else {
      console.log("Login successful! User:", signedInUser);
      router.replace("/portal/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-100 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 transition-colors">
      {/* Animated background blobs */}
      <motion.div
        className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-600 via-cyan-400 to-cyan-200 opacity-30 rounded-full blur-3xl z-0"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.1 }}
      />
      <motion.div
        className="absolute -bottom-40 right-0 w-[28rem] h-[28rem] bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-200 opacity-30 rounded-full blur-3xl z-0"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      {/* Glassmorphic login card */}
      <motion.div
        className="relative w-full max-w-md p-8 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 backdrop-blur-lg z-10"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-extrabold text-center bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-8 tracking-tight">
          Welcome Back
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
              <input
                type="email"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 focus:ring-2 focus:ring-blue-400 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="you@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5" />
              <input
                type="password"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 focus:ring-2 focus:ring-blue-400 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Your password"
              />
            </div>
          </div>
          {error && (
            <motion.div
              className="text-red-600 text-sm text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}
          <motion.button
            type="submit"
            className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg hover:from-cyan-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all text-lg tracking-wide mt-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={submitting}
          >
            {submitting ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="inline-block"
              >
                Logging in...
              </motion.span>
            ) : (
              "Login"
            )}
          </motion.button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <span>Forgot your password?</span>
          <a href="#" className="ml-2 text-blue-600 hover:underline">Reset</a>
        </div>
      </motion.div>
    </div>
  );
} 