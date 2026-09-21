import React, { useState } from 'react';
import { Video, FileText, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface SpeakingDeliveryModalProps {
  isOpen: boolean;
  onSelect: (mode: 'video' | 'text') => void;
  question: string;
}

export const SpeakingDeliveryModal: React.FC<SpeakingDeliveryModalProps> = ({
  isOpen,
  onSelect,
  question,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'video' | 'text'>('video');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelect(selectedFormat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#161b22] border border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-teal-950/50 flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">How would you like to receive the answer?</h3>
            <p className="text-xs text-[#8b949e]">Choose video call with lip-synced avatar or text</p>
          </div>
        </div>

        <div className="my-3 p-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs text-[#c9d1d9] truncate">
          <span className="text-teal-400 font-semibold mr-1.5">Topic:</span>
          &ldquo;{question}&rdquo;
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          {/* Option 1: Video Call with AI */}
          <div
            onClick={() => setSelectedFormat('video')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              selectedFormat === 'video'
                ? 'bg-teal-950/40 border-teal-400 shadow-md shadow-teal-900/30 ring-1 ring-teal-400/50'
                : 'bg-[#0d1117] border-[#30363d] hover:border-[#8b949e]/50 hover:bg-[#161b22]'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFormat === 'video'
                  ? 'bg-teal-500 text-black font-bold'
                  : 'bg-[#161b22] text-teal-400 border border-[#30363d]'
              }`}
            >
              <Video className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Video Call with Speaking Character</span>
                  <span className="text-[10px] text-teal-300 font-normal px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800">
                    Live Lip-Sync
                  </span>
                </span>
                {selectedFormat === 'video' && (
                  <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">
                Connect directly into an interactive video call where a realistic male character speaks to you and moves his lips in sync with the model answer.
              </p>
            </div>
          </div>

          {/* Option 2: Direct Text Response */}
          <div
            onClick={() => setSelectedFormat('text')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              selectedFormat === 'text'
                ? 'bg-teal-950/40 border-teal-400 shadow-md shadow-teal-900/30 ring-1 ring-teal-400/50'
                : 'bg-[#0d1117] border-[#30363d] hover:border-[#8b949e]/50 hover:bg-[#161b22]'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFormat === 'text'
                  ? 'bg-teal-500 text-black font-bold'
                  : 'bg-[#161b22] text-teal-400 border border-[#30363d]'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Direct Text Response</span>
                  <span className="text-[10px] text-teal-300 font-normal px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800">
                    Instant
                  </span>
                </span>
                {selectedFormat === 'text' && (
                  <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">
                View the complete, high-scoring written answer directly in the chat with vocabulary highlights and full structure.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-950/50 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>CONTINUE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
