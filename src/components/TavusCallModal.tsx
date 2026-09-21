import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Settings,
  ExternalLink,
  Radio,
} from 'lucide-react';

interface TavusCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  question: string;
  tavusRoomUrl?: string | null;
  arabicTranslation?: string;
}

export const TavusCallModal: React.FC<TavusCallModalProps> = ({
  isOpen,
  onClose,
  script,
  question,
  tavusRoomUrl: initialTavusRoomUrl,
  arabicTranslation,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'completed'>('connecting');
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState<number>(0.78);
  const [selectedAccent, setSelectedAccent] = useState<'clear' | 'us' | 'uk'>('clear');
  const [showArabic, setShowArabic] = useState<boolean>(false);
  const [sentenceTranslations, setSentenceTranslations] = useState<Record<number, string>>({});
  const [activeRoomUrl, setActiveRoomUrl] = useState<string | null>(initialTavusRoomUrl || null);
  const [showTavusConfig, setShowTavusConfig] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');
  const [isConnectingTavus, setIsConnectingTavus] = useState(false);
  const [audioWaveLevel, setAudioWaveLevel] = useState<number>(1);
  const [showScriptDrawer, setShowScriptDrawer] = useState(false);

  useEffect(() => {
    if (initialTavusRoomUrl) {
      setActiveRoomUrl(initialTavusRoomUrl);
    }
  }, [initialTavusRoomUrl]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSentenceRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sentences = useMemo(() => {
    if (!script) return [];
    const trimmed = script.trim();
    const matches = trimmed.match(/[^.!?]+[.!?]+|\S+/g);
    if (!matches || matches.length === 0) return [trimmed];
    return matches.map((s) => s.trim()).filter((s) => s.length > 0);
  }, [script]);

  const totalSentences = sentences.length;

  useEffect(() => {
    const text = sentences[currentSentenceIdx];
    if (!text || sentenceTranslations[currentSentenceIdx]) return;
    let isMounted = true;
    fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.translation) {
          setSentenceTranslations((prev) => ({
            ...prev,
            [currentSentenceIdx]: data.translation,
          }));
        }
      })
      .catch((err) => console.warn('Translation fetch note:', err));
    return () => {
      isMounted = false;
    };
  }, [currentSentenceIdx, sentences, sentenceTranslations]);

  useEffect(() => {
    currentSentenceRef.current = currentSentenceIdx;
  }, [currentSentenceIdx]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (isSpeaking && !isPaused) {
      waveIntervalRef.current = setInterval(() => {
        setAudioWaveLevel(Math.floor(Math.random() * 4) + 1);
      }, 140);
    } else {
      setAudioWaveLevel(0);
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    }
    return () => {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    };
  }, [isSpeaking, isPaused]);

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      setCallStatus('connecting');
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSentenceIdx(0);
      currentSentenceRef.current = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }

    const connectTimeout = setTimeout(() => {
      setCallStatus('connected');
    }, 800);

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    heartbeatRef.current = setInterval(() => {
      if (
        window.speechSynthesis &&
        window.speechSynthesis.speaking &&
        !window.speechSynthesis.paused
      ) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 9000);

    return () => {
      clearTimeout(connectTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [isOpen]);

  const playSentence = useCallback(
    (index: number) => {
      if (!('speechSynthesis' in window)) return;
      if (index < 0 || index >= sentences.length) {
        setIsSpeaking(false);
        setCallStatus('completed');
        return;
      }
      window.speechSynthesis.cancel();
      const text = sentences[index];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | undefined;
      if (selectedAccent === 'us') {
        chosenVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en-US') &&
              (v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('google') ||
                v.name.toLowerCase().includes('david') ||
                v.name.toLowerCase().includes('alex') ||
                v.name.toLowerCase().includes('guy'))
          ) || voices.find((v) => v.lang.startsWith('en-US'));
      } else if (selectedAccent === 'uk') {
        chosenVoice =
          voices.find(
            (v) =>
              v.lang === 'en-GB' &&
              (v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('george') ||
                v.name.toLowerCase().includes('oliver') ||
                v.name.toLowerCase().includes('google'))
          ) || voices.find((v) => v.lang === 'en-GB');
      } else {
        chosenVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('google') ||
                v.name.toLowerCase().includes('premium'))
          ) ||
          voices.find(
            (v) =>
              v.lang.startsWith('en-US') &&
              (v.name.toLowerCase().includes('david') ||
                v.name.toLowerCase().includes('alex') ||
                v.name.toLowerCase().includes('guy'))
          ) ||
          voices.find((v) => v.lang.startsWith('en'));
      }
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      (window as any).__speakingUtterance = utterance;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setCurrentSentenceIdx(index);
        currentSentenceRef.current = index;
      };

      utterance.onend = () => {
        if (!isPausedRef.current) {
          const nextIndex = index + 1;
          if (nextIndex < sentences.length) {
            setTimeout(() => {
              playSentence(nextIndex);
            }, 750);
          } else {
            setIsSpeaking(false);
            setCallStatus('completed');
          }
        }
      };

      utterance.onerror = (e) => {
        console.warn('Utterance note:', e);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          const nextIndex = index + 1;
          if (nextIndex < sentences.length) {
            playSentence(nextIndex);
          } else {
            setIsSpeaking(false);
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [sentences, speechRate, selectedAccent]
  );

  useEffect(() => {
    if (!isOpen || activeRoomUrl || callStatus !== 'connected') return;
    playSentence(0);
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, callStatus, activeRoomUrl, playSentence]);

  const handleTogglePause = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPaused) {
      setIsPaused(false);
      setIsSpeaking(true);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        playSentence(currentSentenceRef.current);
      }
    } else {
      setIsPaused(true);
      setIsSpeaking(false);
      window.speechSynthesis.pause();
    }
  };

  const handleReplayAll = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setCallStatus('connected');
    setCurrentSentenceIdx(0);
    currentSentenceRef.current = 0;
    setIsPaused(false);
    playSentence(0);
  };

  const handleSkipSentence = (delta: number) => {
    const target = currentSentenceRef.current + delta;
    if (target >= 0 && target < sentences.length) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPaused(false);
      playSentence(target);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isSpeaking && !isPaused) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      playSentence(currentSentenceRef.current);
    }
  };

  const handleAccentChange = (accent: 'clear' | 'us' | 'uk') => {
    setSelectedAccent(accent);
    if (isSpeaking && !isPaused) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      playSentence(currentSentenceRef.current);
    }
  };

  const handleEndCall = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onCloseRef.current();
  };

  const handleConnectTavus = async () => {
    if (customRoomInput.trim()) {
      setActiveRoomUrl(customRoomInput.trim());
      setShowTavusConfig(false);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    if (customApiKeyInput.trim()) {
      setIsConnectingTavus(true);
      try {
        const res = await fetch('/api/tavus/create-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: customApiKeyInput.trim(),
            script,
            question,
          }),
        });
        const data = await res.json();
        if (data.conversationUrl) {
          setActiveRoomUrl(data.conversationUrl);
          setShowTavusConfig(false);
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        } else {
          alert(data.error || 'Could not initiate Tavus room. Check your API key.');
        }
      } catch (err: any) {
        alert('Failed to connect to Tavus: ' + err.message);
      } finally {
        setIsConnectingTavus(false);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const currentSentenceText = sentences[currentSentenceIdx] || sentences[0] || script;
  const progressPercent =
    totalSentences > 0 ? Math.round(((currentSentenceIdx + 1) / totalSentences) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[94vh] max-h-[820px] bg-[#0d1117] border border-[#30363d] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header Bar */}
        <div className="px-5 py-3 bg-[#161b22]/95 border-b border-[#30363d] flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden border border-teal-500/40 shadow-sm shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80"
                alt="Dr. Julian Vance"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#161b22] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm sm:text-base">Dr. Julian Vance</span>
                <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-teal-400 animate-pulse" />
                  {activeRoomUrl ? 'Tavus Live Stream' : 'Photorealistic Male Tutor • 1080p'}
                </span>
              </div>
              <p className="text-[11px] text-[#8b949e] flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Senior IELTS & Spoken English Examiner (Official Speaking Session)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowTavusConfig(!showTavusConfig)}
              className="px-2.5 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Connect Direct Tavus Room or Key"
            >
              <Settings className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">Tavus Direct Key / Room</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d1117] border border-[#30363d] text-xs font-mono text-emerald-400 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{formatTimer(callDuration)}</span>
            </div>
            <button
              onClick={handleEndCall}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-rose-900/30"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>

        {showTavusConfig && (
          <div className="px-5 py-3 bg-[#1c2128] border-b border-[#30363d] z-30 flex flex-col md:flex-row items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-white">Direct Tavus Real Person Integration</span>
                <span className="text-[10px] text-[#8b949e]">
                  (Optional: paste your Tavus room link or API key to switch to live Tavus WebRTC)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Paste Tavus Room URL (e.g. https://tavus.daily.co/...)"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-white placeholder-[#8b949e] focus:outline-none focus:border-teal-500"
                />
                <input
                  type="password"
                  placeholder="Or Tavus API Key (x-api-key)"
                  value={customApiKeyInput}
                  onChange={(e) => setCustomApiKeyInput(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-white placeholder-[#8b949e] focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleConnectTavus}
                disabled={isConnectingTavus || (!customRoomInput && !customApiKeyInput)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isConnectingTavus ? (
                  <span>Connecting...</span>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Join Tavus Room</span>
                  </>
                )}
              </button>
              {activeRoomUrl && (
                <button
                  onClick={() => {
                    setActiveRoomUrl(null);
                    setShowTavusConfig(false);
                    playSentence(0);
                  }}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Return to Real Video Tutor
                </button>
              )}
            </div>
          </div>
        )}

        {/* Video Stage */}
        <div className="flex-1 relative bg-[#020617] flex items-center justify-center overflow-hidden min-h-0">
          {activeRoomUrl ? (
            <div className="relative w-full h-full flex flex-col">
              <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-slate-300 z-10">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
                    <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                    Live Tavus Conversational Video Room Connected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowScriptDrawer(!showScriptDrawer)}
                    className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-teal-300 border border-teal-500/30 transition-colors cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>{showScriptDrawer ? 'Hide Script' : 'View Gemini Answer'}</span>
                  </button>
                </div>
              </div>
              <iframe
                src={activeRoomUrl}
                title="Tavus Live Video Call"
                allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *; clipboard-write *; encrypted-media *"
                className="w-full h-full border-0 flex-1"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&h=800&q=80"
                  alt="Dr. Julian Vance - Real Male English Examiner"
                  className={`w-full h-full object-cover md:object-contain transition-transform duration-700 ${
                    isSpeaking && !isPaused ? 'scale-[1.012]' : 'scale-100'
                  }`}
                  style={{ filter: 'contrast(1.04) brightness(0.98)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

                {isSpeaking && !isPaused && (
                  <div className="absolute bottom-28 md:bottom-32 flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-black/85 border border-teal-500/40 shadow-xl pointer-events-none">
                    <span className="text-[11px] text-teal-300 font-mono font-semibold flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                      Speaking Voice Audio
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      {[12, 22, 16, 28, 20, 32, 18, 26, 14].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-gradient-to-t from-teal-500 to-emerald-300 rounded-full transition-all duration-100"
                          style={{
                            height: `${Math.max(6, Math.min(32, (h * audioWaveLevel) / 2))}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top Topic Overlay */}
              <div className="absolute top-3 inset-x-4 sm:inset-x-12 z-10 p-2.5 rounded-2xl bg-[#0d1117] border border-[#30363d] text-center shadow-lg">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-teal-300 animate-pulse" />
                    <span>Gemini Model Answer • Clear Educational Pacing ({speechRate}x)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex text-[10px] text-slate-400 font-mono items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      HD 1080p
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm font-medium text-white truncate px-2 mt-0.5">
                  &ldquo;{question}&rdquo;
                </p>
              </div>

              {/* Subtitle & Progress Box */}
              <div className="absolute bottom-4 inset-x-3 sm:inset-x-10 z-10 p-3 sm:p-4 rounded-2xl bg-[#0d1117] border border-teal-500/40 text-center shadow-2xl">
                <div className="flex items-center justify-between text-[11px] text-[#8b949e] mb-2 font-mono">
                  <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
                    {isSpeaking && !isPaused ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                        <span>Sentence {currentSentenceIdx + 1} of {totalSentences} • Speaking Clearly</span>
                      </>
                    ) : isPaused ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-medium">Paused</span>
                      </>
                    ) : callStatus === 'completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Model Answer Complete</span>
                      </>
                    ) : (
                      <span>Connecting audio stream...</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                      {speechRate}x Speed
                    </span>
                    <span>{progressPercent}% Completed</span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-[#161b22] rounded-full overflow-hidden border border-[#30363d] mb-2.5">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="text-xs sm:text-base md:text-lg text-white font-medium leading-relaxed max-w-3xl mx-auto px-2">
                  &ldquo;{currentSentenceText}&rdquo;
                </p>

                {showArabic && (
                  <div className="mt-2 pt-2 border-t border-teal-500/20 max-w-2xl mx-auto px-2">
                    <p className="text-xs sm:text-sm text-teal-200 leading-relaxed text-center" dir="rtl">
                      {sentenceTranslations[currentSentenceIdx] ||
                        (sentences.length === 1 && arabicTranslation ? arabicTranslation : 'Loading...')}
                    </p>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-[#30363d]/60 flex items-center justify-between text-[11px] text-slate-400">
                  <button
                    onClick={() => handleSkipSentence(-1)}
                    disabled={currentSentenceIdx === 0}
                    className="px-2 py-1 rounded-lg hover:bg-[#21262d] disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Previous</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {sentences.slice(0, 10).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (window.speechSynthesis) window.speechSynthesis.cancel();
                          playSentence(idx);
                        }}
                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                          idx === currentSentenceIdx
                            ? 'bg-teal-400 scale-125 ring-2 ring-teal-500/40'
                            : idx < currentSentenceIdx
                            ? 'bg-emerald-600'
                            : 'bg-slate-700 hover:bg-slate-500'
                        }`}
                        title={`Sentence ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleSkipSentence(1)}
                    disabled={currentSentenceIdx >= totalSentences - 1}
                    className="px-2 py-1 rounded-lg hover:bg-[#21262d] disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="px-5 py-3.5 bg-[#161b22] border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePause}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isPaused
                  ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              )}
            </button>
            <button
              onClick={handleReplayAll}
              className="px-3 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay From Start</span>
            </button>

            <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] rounded-xl p-0.5 text-xs font-mono">
              {[
                { rate: 0.65, label: '0.65x' },
                { rate: 0.78, label: '0.78x' },
                { rate: 0.9, label: '0.90x' },
                { rate: 1.05, label: '1.05x' },
              ].map((item) => (
                <button
                  key={item.rate}
                  onClick={() => handleRateChange(item.rate)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                    speechRate === item.rate
                      ? 'bg-teal-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                  : 'bg-[#21262d] border-[#30363d] text-white hover:bg-[#30363d]'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                !isVideoOn
                  ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                  : 'bg-[#21262d] border-[#30363d] text-white hover:bg-[#30363d]'
              }`}
            >
              {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button
              onClick={handleEndCall}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-900/40 transition-transform active:scale-95 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
