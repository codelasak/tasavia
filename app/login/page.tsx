"use client"

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { auth } from "@/lib/auth";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { OTPVerificationForm } from "@/components/auth/OTPVerificationForm";

import { motion } from "framer-motion";
import { Mail, Lock, Phone, ArrowLeft, KeyRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type AuthStep = 'method-select' | 'email-form' | 'phone-form' | 'otp-verification';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  
  // Email auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  
  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [authStep, setAuthStep] = useState<AuthStep>('method-select');
  const [phoneError, setPhoneError] = useState("");
  
  // General state
  const [activeTab, setActiveTab] = useState("email");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Handle URL parameters for success messages
  useEffect(() => {
    const message = searchParams.get('message');
    const type = searchParams.get('type');
    
    if (message && type === 'success') {
      setSuccessMessage(decodeURIComponent(message));
      // Clear the URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      url.searchParams.delete('type');
      router.replace(url.pathname);
    }
  }, [searchParams, router]);

  // Clear success message after 10 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSubmitting(true);
    setEmailError("");

    console.log("Attempting login with email:", email);

    const { error, user: signedInUser } = await auth.signIn(email, password);
    setEmailSubmitting(false);

    if (error) {
      console.error("Login error:", error);
      setEmailError(error);
    } else {
      console.log("Login successful! User:", signedInUser);
      router.replace("/portal/dashboard");
    }
  };

  const handlePhoneOTPSent = (phone: string) => {
    setPhoneNumber(phone);
    setAuthStep('otp-verification');
    setPhoneError("");
  };

  const handlePhoneError = (error: string) => {
    setPhoneError(error);
  };

  const handleBackToPhoneForm = () => {
    setAuthStep('method-select');
    setPhoneError("");
  };

  const clearErrors = () => {
    setEmailError("");
    setPhoneError("");
    setSuccessMessage("");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    clearErrors(); // Clear errors when switching tabs
  };

  // Handle phone OTP verification step
  if (authStep === 'otp-verification' && phoneNumber) {
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
        
        <motion.div
          className="relative z-10"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <OTPVerificationForm
            phoneNumber={phoneNumber}
            onBack={handleBackToPhoneForm}
            onError={handlePhoneError}
          />
        </motion.div>
      </div>
    );
  }

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

        {/* Success Message */}
        {successMessage && (
          <motion.div
            className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              {successMessage}
            </div>
          </motion.div>
        )}
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email" className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4" />
              Phone
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleEmailSubmit} className="space-y-6">
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
              {emailError && (
                <motion.div
                  className="text-red-600 text-sm text-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {emailError}
                </motion.div>
              )}
              <motion.button
                type="submit"
                className="w-full py-2 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg hover:from-cyan-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all text-lg tracking-wide mt-2"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={emailSubmitting}
              >
                {emailSubmitting ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="inline-block"
                  >
                    Logging in...
                  </motion.span>
                ) : (
                  "Login with Email"
                )}
              </motion.button>
            </form>
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              <span>Forgot your password?</span>
              <Link 
                href="/forgot-password" 
                className="ml-2 text-blue-600 hover:text-blue-700 hover:underline transition-colors inline-flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                Reset Password
              </Link>
            </div>
          </TabsContent>
          
          <TabsContent value="phone" className="space-y-4">
            <PhoneAuthForm
              onOTPSent={handlePhoneOTPSent}
              onError={handlePhoneError}
            />
            {phoneError && (
              <motion.div
                className="text-red-600 text-sm text-center mt-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {phoneError}
              </motion.div>
            )}
            <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
              <span>Need to reset your password?</span>
              <Link 
                href="/forgot-password" 
                className="ml-2 text-blue-600 hover:text-blue-700 hover:underline transition-colors inline-flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                Reset Password
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
} 