import { useState, FormEvent } from 'react';
import { Eye, EyeOff, Lock, User, ArrowLeft, Check, BookOpen } from 'lucide-react';
import { registerUser, verifyUser, hasCompletedProfile, setCurrentUser } from '../services/storage';

interface AuthModalProps {
  onSuccess: (username: string, isProfileCompleted: boolean) => void;
  onBackToLanding: () => void;
}

export default function AuthModal({ onSuccess, onBackToLanding }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const trimmedUser = username.trim().toLowerCase();
    if (!trimmedUser) {
      setError('Please enter your username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setIsSubmitting(true);

    if (tab === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setIsSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }
      const res = await registerUser(trimmedUser, password);
      if (!res.success) {
        setError(res.message || 'Could not create account.');
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg('Account created successfully! Redirecting...');
      setCurrentUser(trimmedUser);
      setTimeout(() => {
        onSuccess(trimmedUser, false);
      }, 500);
    } else {
      if (trimmedUser.toLowerCase() === 'ahmed_admin123' && password === 'admin_200254') {
        setCurrentUser(trimmedUser);
        setSuccessMsg('Teacher login verified! Opening teacher dashboard...');
        setTimeout(() => {
          onSuccess(trimmedUser, true);
        }, 400);
        return;
      }
      const res = await verifyUser(trimmedUser, password);
      if (!res.success) {
        setError(res.message || 'Invalid username or password.');
        setIsSubmitting(false);
        return;
      }
      setCurrentUser(trimmedUser);
      const isCompleted = hasCompletedProfile(trimmedUser);
      setSuccessMsg(isCompleted ? 'Welcome back! Opening your dashboard...' : 'Account verified! Opening profile questions...');
      setTimeout(() => {
        onSuccess(trimmedUser, isCompleted);
      }, 400);
    }
  };

  return (
    <div id="auth-screen" className="relative min-h-screen flex items-center justify-center bg-[#f0f7fc] text-[#152742] p-4">
      <div className="relative z-10 w-full max-w-md bg-white border border-[#152742]/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#152742]/10">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3c5a7a] hover:text-[#152742] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            <BookOpen className="w-3 h-3 text-teal-600" />
            <span>STUDENT PORTAL</span>
          </div>
        </div>

        <h1 className="text-center font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold text-[#b9860f] tracking-tight mb-5">
          {tab === 'login' ? 'Student Login' : 'Create Account'}
        </h1>

        <div className="flex p-1 bg-[#152742]/5 rounded-2xl mb-6 border border-[#152742]/10">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-[#152742] shadow-sm'
                : 'text-[#3c5a7a] hover:text-[#152742]'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-white text-[#152742] shadow-sm'
                : 'text-[#3c5a7a] hover:text-[#152742]'
            }`}
          >
            SIGN UP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3c5a7a]">
              Username
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-[#3c5a7a]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Student username"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#cbd5e1] rounded-xl text-sm text-[#152742] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#2f9e97] focus:ring-2 focus:ring-[#2f9e97]/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3c5a7a]">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-[#3c5a7a]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#cbd5e1] rounded-xl text-sm text-[#152742] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#2f9e97] focus:ring-2 focus:ring-[#2f9e97]/20 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-[#3c5a7a] hover:text-[#152742] p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'signup' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3c5a7a]">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-[#3c5a7a]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#cbd5e1] rounded-xl text-sm text-[#152742] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#2f9e97] focus:ring-2 focus:ring-[#2f9e97]/20 transition-all"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-full font-['Space_Grotesk'] font-bold text-white bg-gradient-to-r from-[#2f9e97] to-[#1f7d78] shadow-lg shadow-teal-900/20 hover:shadow-teal-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            {tab === 'login' ? 'LOGIN' : 'SIGN UP'}
          </button>
        </form>
      </div>
    </div>
  );
}
