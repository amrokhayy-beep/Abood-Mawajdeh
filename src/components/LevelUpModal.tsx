import React, { useEffect, useRef } from 'react';
import { Sparkles, Trophy, Star, ArrowRight, Zap, Award, Flame, Check, Shield } from 'lucide-react';
import { LEVEL_THRESHOLDS, LevelThreshold } from '../types';

interface LevelUpModalProps {
  oldLevel: number;
  newLevel: number;
  totalExp: number;
  studentName?: string;
  onClose: () => void;
}

const MOTIVATIONAL_QUOTES: { [level: number]: { quote: string; perk: string } } = {
  2: {
    quote: "Every expert was once a beginner. You've taken your first big leap into English fluency!",
    perk: "Unlocked Apprentice Ranked Tier & Bronze Profile Flair"
  },
  3: {
    quote: "Consistency turns practice into perfection. Your vocabulary is expanding rapidly!",
    perk: "Unlocked Skilled Badge & Faster Matchmaking Pool"
  },
  4: {
    quote: "Fluency is not just about words; it's about confidence. You are speaking like a champion!",
    perk: "Unlocked Gold Scholar Ring & Advanced AI Conversation Scenarios"
  },
  5: {
    quote: "Halfway to the absolute summit! Your grammar and understanding are truly formidable.",
    perk: "Unlocked Diamond Elite Title & Exclusive Avatar Aura"
  },
  6: {
    quote: "Knowledge has no finish line, but today you stand among the top English scholars!",
    perk: "Unlocked Crystal Prestige Badge & High-Stakes Ranked Battles"
  },
  7: {
    quote: "Exceptional mastery! Your speed, accuracy, and confidence inspire everyone around you.",
    perk: "Unlocked Lightning Champion Halo & Elite Leaderboard Boost"
  },
  8: {
    quote: "True brilliance in action. Only a rare few reach this pinnacle of linguistic excellence!",
    perk: "Unlocked Guardian Crest & Veteran Honor Multipliers"
  },
  9: {
    quote: "A true English Legend! You command words with effortless precision and power.",
    perk: "Unlocked Royal Crown Aura & Grand Legend Status"
  },
  10: {
    quote: "MAXIMUM SUPREMACY! You are a Grandmaster Legend. You have mastered every horizon!",
    perk: "Unlocked Supreme Immortal Trophy & Master Prestige Forever"
  }
};

export default function LevelUpModal({
  oldLevel,
  newLevel,
  totalExp,
  studentName,
  onClose,
}: LevelUpModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const oldThreshold: LevelThreshold = LEVEL_THRESHOLDS.find(t => t.level === oldLevel) || {
    level: oldLevel,
    expRequired: 0,
    title: 'Novice Learner',
    badge: '🌱'
  };

  const newThreshold: LevelThreshold = LEVEL_THRESHOLDS.find(t => t.level === newLevel) || {
    level: newLevel,
    expRequired: 16000,
    title: 'Grandmaster Legend',
    badge: '🏆'
  };

  const motivation = MOTIVATIONAL_QUOTES[newLevel] || {
    quote: "Outstanding dedication and perseverance! Keep pushing boundaries and mastering new skills!",
    perk: "Unlocked Higher Ranked Status & Profile Prestige"
  };

  // Play celebratory audio fanfare using Web Audio API
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const playNote = (freq: number, start: number, duration: number, gainVal = 0.15) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.01, start);
          gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + duration);
        };

        // Fanfare chord progression: C4 -> E4 -> G4 -> C5 (Triumphant brass chime)
        playNote(523.25, now + 0.05, 0.25, 0.18); // C5
        playNote(659.25, now + 0.20, 0.25, 0.18); // E5
        playNote(783.99, now + 0.35, 0.35, 0.22); // G5
        playNote(1046.50, now + 0.55, 0.75, 0.25); // C6 (Grand sustain)
        playNote(1318.51, now + 0.65, 0.65, 0.15); // E6
      }
    } catch {
      // Audio not supported or blocked by browser policy
    }
  }, []);

  // Confetti Particle Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
      shape: 'rect' | 'circle' | 'star';
    }> = [];

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#eab308', '#06b6d4'];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate burst of 120 confetti particles
    for (let i = 0; i < 130; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height * 0.4 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.6 ? 'star' : Math.random() > 0.3 ? 'rect' : 'circle',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.99; // drag
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // simple 4-point sparkle
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.3, -p.size * 0.3);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(p.size * 0.3, p.size * 0.3);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.3, p.size * 0.3);
          ctx.lineTo(-p.size, 0);
          ctx.lineTo(-p.size * 0.3, -p.size * 0.3);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      id="level-up-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto"
      onClick={onClose}
    >
      {/* Confetti Background Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Main Ornate Card */}
      <div
        id="level-up-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-gradient-to-b from-[#131a26] via-[#0d121c] to-[#080b11] border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.45)] text-center text-white transform transition-all animate-in zoom-in-90 duration-300 overflow-hidden"
      >
        {/* Ornate Glowing Background Aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Floating Badge */}
        <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.5)] mb-5 animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span className="text-xs font-black uppercase tracking-widest text-amber-200">
            LEVEL UP ACHIEVEMENT!
          </span>
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
        </div>

        {/* Big Badge Icon with Radial Glow */}
        <div className="relative my-2">
          <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-700 p-1 shadow-[0_0_50px_rgba(245,158,11,0.6)] flex items-center justify-center animate-bounce duration-1000">
            <div className="w-full h-full bg-[#0d1117] rounded-[22px] flex items-center justify-center text-5xl">
              {newThreshold.badge}
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-black font-mono text-xs px-3 py-0.5 rounded-full shadow-lg">
            LVL {newLevel}
          </div>
        </div>

        {/* Congratulatory Title */}
        <div className="mt-4 space-y-1">
          <h2 className="text-3xl sm:text-4xl font-black font-['Space_Grotesk'] tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 bg-clip-text text-transparent">
            CONGRATULATIONS!
          </h2>
          <p className="text-xs sm:text-sm font-bold text-[#8b949e]">
            {studentName ? `${studentName}, you have ascended to a new rank!` : 'You have ascended to a new rank!'}
          </p>
        </div>

        {/* Before & After Progression Card (اللفل كان هيك وصار هيك) */}
        <div className="my-6 bg-[#161d2b]/90 border border-amber-500/40 rounded-2xl p-4 shadow-inner">
          <div className="text-[10px] uppercase tracking-widest font-black text-amber-400/90 mb-3 flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Rank Progression Overview</span>
          </div>

          <div className="grid grid-cols-11 items-center gap-1 sm:gap-2">
            {/* Previous Level Box */}
            <div className="col-span-5 bg-[#0d1117]/90 border border-[#30363d] rounded-xl p-3 text-center opacity-85">
              <span className="text-[10px] text-[#8b949e] font-bold uppercase block mb-1">
                Previous Level
              </span>
              <div className="text-2xl mb-1">{oldThreshold.badge}</div>
              <div className="font-['Space_Grotesk'] font-extrabold text-xs text-white">
                Level {oldLevel}
              </div>
              <div className="text-[10px] text-[#8b949e] truncate">
                {oldThreshold.title}
              </div>
            </div>

            {/* Animated Transition Arrow */}
            <div className="col-span-1 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 animate-pulse">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* New Level Box (Glowing) */}
            <div className="col-span-5 bg-gradient-to-br from-amber-950/60 to-emerald-950/40 border-2 border-amber-400 rounded-xl p-3 text-center shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50">
              <span className="text-[10px] text-amber-300 font-black uppercase block mb-1">
                ⭐ New Rank ⭐
              </span>
              <div className="text-2xl mb-1 animate-pulse">{newThreshold.badge}</div>
              <div className="font-['Space_Grotesk'] font-black text-sm text-amber-300">
                Level {newLevel}
              </div>
              <div className="text-[10px] text-emerald-300 font-bold truncate">
                {newThreshold.title}
              </div>
            </div>
          </div>

          {/* EXP Summary Bar */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#8b949e]">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Total Achieved EXP:</span>
            </div>
            <span className="font-black text-amber-400 text-sm">
              {totalExp.toLocaleString()} EXP
            </span>
          </div>
        </div>

        {/* Motivational Success Message & Quote */}
        <div className="bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-4 text-left space-y-2 mb-6 shadow-sm">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Scholar Inspiration & Unlocks</span>
          </div>
          <p className="text-xs sm:text-sm text-[#e6edf3] italic leading-relaxed">
            "{motivation.quote}"
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold pt-1 border-t border-white/10">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{motivation.perk}</span>
          </div>
        </div>

        {/* Claim / Celebrate Action Button */}
        <button
          type="button"
          id="btn-claim-level-up"
          onClick={onClose}
          className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-['Space_Grotesk'] font-black text-base rounded-2xl shadow-[0_10px_30px_rgba(245,158,11,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
        >
          <Trophy className="w-5 h-5 text-black" />
          <span>CLAIM REWARDS & CONTINUE</span>
          <Sparkles className="w-5 h-5 text-black" />
        </button>
      </div>
    </div>
  );
}
