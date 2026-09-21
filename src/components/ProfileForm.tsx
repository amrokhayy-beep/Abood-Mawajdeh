import { useState, FormEvent } from 'react';
import { Sparkles, User, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { StudentProfile } from '../types';

interface ProfileFormProps {
  username: string;
  onCompleted: (profile: Omit<StudentProfile, 'completedAt'>) => void;
  onCancel?: () => void;
}

export default function ProfileForm({ username, onCompleted, onCancel }: ProfileFormProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [yearBorn, setYearBorn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const ageNum = parseInt(age, 10);
    const yearNum = parseInt(yearBorn, 10);

    if (!trimmedName) {
      setError('Please enter your real name so your teacher can recognize you.');
      return;
    }
    if (isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
      setError('Please enter a valid age (between 5 and 100).');
      return;
    }
    if (isNaN(yearNum) || yearNum < 1920 || yearNum > 2025) {
      setError('Please enter a valid 4-digit birth year (e.g. 2008).');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onCompleted({
        name: trimmedName,
        age: ageNum,
        yearBorn: yearNum,
        honor: 100,
        level: 1,
        exp: 1,
      });
    }, 250);
  };

  return (
    <div id="profile-form-screen" className="relative min-h-screen flex items-center justify-center bg-[#f0f7fc] text-[#152742] p-4">
      <div className="relative z-10 w-full max-w-lg bg-white border border-[#152742]/10 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-[#152742]/10 transition-all">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>STUDENT ONBOARDING</span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold text-[#b9860f] tracking-tight">
            Welcome, @{username}!
          </h1>
          <p className="text-sm text-[#3c5a7a] mt-1 font-medium">
            Before you continue to your dashboard, please answer these quick questions.
          </p>
        </div>

        <div className="bg-[#eaf5ff] border border-[#8fc6e8] rounded-2xl p-4 mb-6 text-xs sm:text-sm text-[#1c5177] leading-relaxed flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-[#134a6e]">Just a heads-up:</strong> Please use your real first and last name so your teacher can identify your work, and stick to one account per student. Thanks for helping us keep things organized!
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="student-name-input" className="block text-xs font-bold uppercase tracking-wider text-[#3c5a7a]">
              What is your name? (real name)
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-[#3c5a7a]" />
              <input
                id="student-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ahmad Khaled"
                className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#152742]/15 rounded-xl text-[#152742] text-sm focus:outline-none focus:border-[#2f9e97] focus:ring-2 focus:ring-[#2f9e97]/20 transition-all"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-age-input" className="block text-xs font-bold uppercase tracking-wider text-[#3c5a7a]">
              What is your age?
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-[#3c5a7a]">#</span>
              <input
                id="student-age-input"
                type="number"
                min="5"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 16"
                className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#152742]/15 rounded-xl text-[#152742] text-sm focus:outline-none focus:border-[#2f9e97] focus:ring-2 focus:ring-[#2f9e97]/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-year-input" className="block text-xs font-bold uppercase tracking-wider text-[#3c5a7a]">
              What year were you born?
            </label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3.5 w-4 h-4 text-[#3c5a7a]" />
              <input
                id="student-year-input"
                type="number"
                min="1920"
                max="2025"
                value={yearBorn}
                onChange={(e) => setYearBorn(e.target.value)}
                placeholder="e.g. 2009"
                className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#152742]/15 rounded-xl text-[#152742] text-sm focus:outline-none focus:border-[#2f9e97] focus:ring-2 focus:ring-[#2f9e97]/20 transition-all"
                required
              />
            </div>
          </div>

          <button
            id="btn-submit-profile"
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 px-6 rounded-full font-['Space_Grotesk'] font-semibold text-white bg-gradient-to-r from-[#2f9e97] to-[#1f7d78] shadow-lg shadow-teal-900/20 hover:shadow-teal-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Entering Dashboard...' : 'SUBMIT & ENTER DASHBOARD'}</span>
          </button>
        </form>

        {onCancel && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[#3c5a7a] hover:underline cursor-pointer"
            >
              Sign in with a different account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
