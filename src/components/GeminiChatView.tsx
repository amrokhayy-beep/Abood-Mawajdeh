import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, ArrowLeft, Trash2, CheckCircle2, Copy, Volume2, Zap, Square } from 'lucide-react';

interface GeminiChatViewProps {
  title: string;
  subtitle: string;
  category: 'writing' | 'direct_question';
  onBack: () => void;
  onNotify?: (msg: string) => void;
}

interface ChatMessageItem {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  time: string;
}

export const GeminiChatView: React.FC<GeminiChatViewProps> = ({
  title,
  subtitle,
  category,
  onBack,
  onNotify,
}) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    // Attempt to load from localStorage to keep state persistent during session
    const saved = localStorage.getItem(`gemini_chat_history_${category}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to initial
      }
    }
    return [
      {
        id: 'init-1',
        sender: 'gemini',
        text:
          category === 'writing'
            ? "Welcome to your premium Writing Assistant! ✍️\n\nPaste your paragraphs, essays, or emails below. I will carefully analyze your grammar, suggest elevated vocabulary synonyms, refine the tone, and offer a beautifully polished model version."
            : "Hello there! I am your interactive English Grammar & Vocabulary Tutor. 🤖✨\n\nAsk me absolutely anything! Prepositions, idioms, modal verbs, or sentence structural rules—I am here to explain it with simple formulas and real-world examples.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    const stoppedMsg: ChatMessageItem = {
      id: `stopped-${Date.now()}`,
      sender: 'gemini',
      text: '⚠️ Response generation stopped by user.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, stoppedMsg]);
    onNotify?.('AI generation stopped');
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`gemini_chat_history_${category}`, JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [isLoading]);

  // Handle Speech Synthesis
  const handleSpeak = (text: string, id: string) => {
    if (typeof window === 'undefined') return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop current speech
      const cleanText = text.replace(/[^\w\s.,?!'"]/gi, ''); // clean emojis for smooth English reading
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      
      // Try to find a premium English voice
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      }

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      onNotify?.('Voice synthesis is not supported on this browser');
    }
  };

  // Copy to Clipboard
  const handleCopy = (text: string, id: string) => {
    if (typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend.trim();
    if (!customText) setInputText('');

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, category }),
        signal: controller.signal,
      });
      const data = await res.json();
      const aiResponseText = data.answer || 'I am sorry, I could not synthesize a proper answer.';

      const geminiMsg: ChatMessageItem = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, geminiMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Handled by handleStopGeneration
      }
      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        sender: 'gemini',
        text: 'Connection to Gemini AI lost. Please check your network and tap to try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      onNotify?.('Network error with Gemini API');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const suggestions = category === 'writing' 
    ? [
        { title: '📝 Boost Email', query: 'Enhance this email to make it completely professional, correct any typos, and provide a polite greeting: "Hey am writing to check if you got my resume and when can we have interview"' },
        { title: '🌟 Vocabulary Power', query: 'Give me 5 premium synonyms to replace basic words like "important", "very nice", and "big" along with clear English examples.' },
        { title: '🔧 Grammar Repair', query: 'Fix all grammar issues in this sentence and explain why: "She don\'t like went to the cinema because she feel sick always"' },
        { title: '🎓 Essay upgrade', query: 'Rewrite this sentence in an advanced academic style for an essay: "I think smoking is very bad and the government should make people stop it."' }
      ]
    : [
        { title: '⏳ since vs for', query: 'Explain the difference between "since" and "for" in English with extremely clear rules and 3 daily-life examples.' },
        { title: '⚡ Present Perfect', query: 'How do I use the Present Perfect tense? What is the core formula and when exactly do we use it?' },
        { title: '💬 5 Daily Idioms', query: 'Give me 5 common English idioms used in daily conversations, along with their meanings and a sample conversation.' },
        { title: '🛠️ Active vs Passive', query: 'What is the passive voice? Explain how to turn a simple sentence into passive with a step-by-step formula.' }
      ];

  const handleClearHistory = () => {
    const initMsg: ChatMessageItem = {
      id: 'init-1',
      sender: 'gemini',
      text: 'Chat history cleared. How can I help you further with your English practice?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initMsg]);
    localStorage.removeItem(`gemini_chat_history_${category}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#161b22] border border-[#30363d] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl min-h-0 relative overflow-hidden">
      
      {/* Header */}
      <div className="px-1 sm:px-0 flex items-center justify-between pb-3.5 border-b border-[#30363d]/80 mb-4 shrink-0 gap-2 z-10">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:px-4 sm:py-2 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Back</span>
          </button>
          
          <div className="hidden sm:flex w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500/10 via-emerald-500/10 to-amber-500/10 border border-teal-500/20 items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-xs sm:text-base tracking-tight truncate">
                {title}
              </h3>
              <span className="hidden xs:inline-flex px-2 py-0.5 text-[9px] font-black tracking-widest text-teal-300 bg-teal-950/70 border border-teal-800/80 rounded-full uppercase">
                Gemini 1.5 Flash
              </span>
            </div>
            <p className="text-[10px] text-[#8b949e] truncate hidden sm:block mt-0.5">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearHistory}
          className="p-2 rounded-xl bg-[#0d1117] hover:bg-[#21262d] text-[#8b949e] hover:text-rose-400 border border-[#30363d] transition-colors cursor-pointer shrink-0"
          title="Clear Chat History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-0 z-10 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in-50 duration-200`}
            >
              {/* Avatar Box */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-md border ${
                  isUser
                    ? 'bg-gradient-to-br from-teal-600/30 to-teal-800/40 border-teal-500/40 text-teal-300'
                    : 'bg-[#21262d] border-[#30363d] text-amber-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble Wrapper */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Header info */}
                <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e] mb-1">
                  <span className={`font-bold ${isUser ? 'text-teal-400' : 'text-amber-400'}`}>
                    {isUser ? 'You' : 'Gemini AI Tutor'}
                  </span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>

                {/* Bubble Container */}
                <div className="relative group">
                  <div
                    className={`leading-relaxed px-4 py-3 rounded-2xl text-xs sm:text-[13px] font-medium whitespace-pre-line shadow-sm border transition-all ${
                      isUser
                        ? 'bg-[#142f2f] text-teal-100 border-teal-700/50 rounded-tr-none'
                        : 'bg-[#1f242c] text-[#f0f6fc] border-[#30363d] rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Bubble Actions Bar (Instant Copy / Read Aloud) */}
                  {!isUser && msg.id !== 'init-1' && (
                    <div className="absolute -bottom-3.5 right-2 flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-lg px-1.5 py-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shadow-lg z-20">
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg.text, msg.id)}
                        className={`p-1 hover:text-white transition-colors cursor-pointer rounded ${speakingId === msg.id ? 'text-amber-400 animate-pulse' : 'text-[#8b949e]'}`}
                        title="Read Aloud (English Voice)"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                      <div className="w-[1px] h-3 bg-[#30363d]" />
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className={`p-1 hover:text-white transition-colors cursor-pointer rounded ${copiedId === msg.id ? 'text-emerald-400' : 'text-[#8b949e]'}`}
                        title="Copy to Clipboard"
                      >
                        {copiedId === msg.id ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Shimmer/Pulse Loader when generating answers */}
        {isLoading && (
          <div className="flex items-start gap-3 animate-in fade-in-50">
            <div className="w-8 h-8 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-center text-amber-400 shrink-0 mt-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start gap-1 max-w-[85%]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e] mb-0.5">
                <span className="font-bold text-amber-400">Gemini AI Tutor</span>
                <span>•</span>
                <span className="italic animate-pulse">thinking...</span>
              </div>
              <div className="px-4 py-3 bg-[#1f242c] border border-[#30363d] text-teal-300 rounded-2xl rounded-tl-none flex items-center gap-2.5 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-[#8b949e] font-semibold font-['Space_Grotesk']">Formulating beautiful feedback...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips Panel (Only shown if chat has only the initial message) */}
      {messages.length === 1 && !isLoading && (
        <div className="mt-4 pt-3 border-t border-[#30363d]/50 shrink-0 z-10 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
              Quick Suggestions (Tap to ask)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSendMessage(undefined, suggestion.query)}
                className="p-2 sm:p-2.5 text-left rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] hover:border-teal-500/40 text-[10px] sm:text-xs text-[#f0f6fc] hover:text-white transition-all cursor-pointer font-semibold shadow-xs flex flex-col gap-0.5 line-clamp-2"
              >
                <span className="text-[10px] text-teal-400 font-extrabold">{suggestion.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Box */}
      <div className="mt-4 pt-3 border-t border-[#30363d]/80 shrink-0 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              category === 'writing'
                ? 'Type or paste your English text to check grammar and style...'
                : 'Ask Gemini any English grammar, vocabulary, or idiom question...'
            }
            className="flex-1 bg-[#0d1117] border border-[#30363d] focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-[#8b949e] focus:outline-none transition-all shadow-inner"
            autoFocus
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="btn-responsive px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-950/60 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer animate-pulse shrink-0"
              title="Stop AI generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="btn-responsive px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-30 disabled:hover:bg-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-950/60 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
