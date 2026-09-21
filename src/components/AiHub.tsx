import React, { useState } from 'react';
import {
  Mic,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SpeakingAiChat } from './SpeakingAiChat';
import { GeminiChatView } from './GeminiChatView';

export type AiMode = 'speaking' | 'direct_question' | null;

interface AiHubProps {
  onNotify?: (msg: string) => void;
  activeMode: AiMode;
  onChangeActiveMode: (mode: AiMode) => void;
}

export const AiHub: React.FC<AiHubProps> = ({ onNotify, activeMode, onChangeActiveMode }) => {
  const [selectedCard, setSelectedCard] = useState<AiMode>('speaking');

  const AI_CATEGORIES = [
    {
      id: 'speaking' as const,
      name: 'SPEAKING',
      subLabel: 'Conversation Practice',
      desc: 'Gemini Speaking Solver with comprehensive answers & male AI video calls with moving lips',
      icon: Mic,
      gradient: 'from-teal-500/20 to-emerald-500/10',
      borderHover: 'hover:border-teal-400',
      activeBorder: 'border-teal-400 ring-2 ring-teal-400/40 bg-teal-950/30',
      badge: 'Video Call & Lip-Sync',
      badgeColor: 'text-teal-300 bg-teal-950 border-teal-800',
    },
    {
      id: 'direct_question' as const,
      name: 'DIRECT QUESTION',
      subLabel: 'Direct Q&A',
      desc: 'Chat live with Gemini to ask direct questions about any topic, grammar, or vocabulary naturally',
      icon: HelpCircle,
      gradient: 'from-amber-500/20 to-orange-500/10',
      borderHover: 'hover:border-amber-400',
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/30',
      badge: 'Gemini Chat',
      badgeColor: 'text-amber-300 bg-amber-950 border-amber-800',
    },
  ];

  const handleSubmitMode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    onChangeActiveMode(selectedCard);
  };

  if (activeMode === 'speaking') {
    return <SpeakingAiChat onBackToHub={() => onChangeActiveMode(null)} />;
  }

  if (activeMode === 'direct_question') {
    return (
      <GeminiChatView
        title="DIRECT QUESTION"
        subtitle="Ask any question and chat live with Gemini AI"
        category="direct_question"
        onBack={() => onChangeActiveMode(null)}
        onNotify={onNotify}
      />
    );
  }

  return (
    <div
      id="ai-hub"
      className="flex-1 w-full bg-[#161b22] border border-[#30363d] rounded-2xl sm:rounded-3xl p-4 sm:p-8 flex flex-col justify-start lg:justify-center items-center shadow-2xl relative overflow-y-auto min-h-[450px]"
    >
      <div className="w-full max-w-3xl flex flex-col items-center z-10">
        <div className="text-center mb-5 sm:mb-8">
          <div className="capsule-responsive bg-teal-500/10 border-teal-500/30 text-teal-400 gap-2 mb-3">
            <Sparkles className="icon-responsive" />
            <span>AI English Learning Studio</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            Choose an AI Learning Category
          </h2>
          <p className="text-[11px] sm:text-sm text-[#8b949e] mt-1.5 max-w-lg mx-auto leading-relaxed">
            Select a learning track below to practice speaking with video avatars, or open an interactive Gemini chat for writing enhancement and direct Q&A.
          </p>
        </div>

        <form onSubmit={handleSubmitMode} className="w-full flex flex-col items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full mb-6 sm:mb-10">
            {AI_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCard === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCard(cat.id)}
                  className={`p-5 sm:p-8 rounded-2xl sm:rounded-[2rem] border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden group min-h-[220px] sm:min-h-[280px] ${
                    isSelected
                      ? `${cat.activeBorder} scale-[1.02] border-teal-500 shadow-2xl shadow-teal-950/50`
                      : `bg-[#0d1117] border-[#30363d] ${cat.borderHover} hover:bg-[#1c2128] hover:border-teal-500/30 shadow-xl`
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cat.gradient}`}
                  />
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isSelected
                            ? 'bg-teal-500 text-black shadow-lg scale-110'
                            : 'bg-[#161b22] text-teal-400 border border-[#30363d] group-hover:scale-105'
                        }`}
                      >
                        <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`capsule-responsive py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-xl font-bold uppercase tracking-wider text-[9px] sm:text-[10px] ${cat.badgeColor}`}
                        >
                          {cat.badge}
                        </span>
                        {isSelected && (
                          <div className="bg-teal-500/20 p-0.5 rounded-full border border-teal-500/30">
                            <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-white text-lg sm:text-2xl tracking-tight uppercase flex flex-col">
                        <span className={isSelected ? 'text-teal-400' : 'text-white'}>{cat.name}</span>
                        <span className="text-xs sm:text-sm font-bold text-[#8b949e] mt-0.5">
                          {cat.subLabel}
                        </span>
                      </h3>
                      <p className="text-xs sm:text-sm text-[#8b949e] mt-2.5 sm:mt-4 leading-relaxed font-medium">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-[#30363d]/40 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                        isSelected ? 'text-teal-400' : 'text-[#8b949e] group-hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected Track' : 'Open Track'}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isSelected ? 'bg-teal-500 text-black rotate-0 translate-x-1' : 'bg-[#161b22] text-[#30363d] group-hover:text-teal-400'
                    }`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full max-w-sm">
            <button
              type="submit"
              disabled={!selectedCard}
              className="btn-responsive w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-extrabold shadow-xl shadow-teal-950/60"
            >
              <span>OPEN SECTION</span>
              <ArrowRight className="icon-responsive" />
            </button>
            <p className="text-[11px] text-[#8b949e] text-center mt-2.5">
              Select category and click to start practicing with Gemini AI
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
