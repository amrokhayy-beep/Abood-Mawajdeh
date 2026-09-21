import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Video,
  Bot,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  Clock,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { SpeakingDeliveryModal } from './SpeakingDeliveryModal';
import { TavusCallModal } from './TavusCallModal';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  isInitialPrompt?: boolean;
  provider?: string;
  modelAnswer?: boolean;
}

interface SpeakingAiChatProps {
  onBackToHub: () => void;
}

export const SpeakingAiChat: React.FC<SpeakingAiChatProps> = ({ onBackToHub }) => {
  const INITIAL_AI_MESSAGE: Message = {
    id: 'initial-ai-prompt',
    sender: 'ai',
    text: 'What is the SPEAKING question or topic you would like to solve? Please send only the question without greetings or additional messages.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isInitialPrompt: true,
  };

  const [messages, setMessages] = useState<Message[]>([INITIAL_AI_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<{
    question: string;
    answer: string;
    provider: string;
    arabicTranslation?: string;
  } | null>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [activeCallData, setActiveCallData] = useState<{
    script: string;
    question: string;
    tavusRoomUrl?: string | null;
    arabicTranslation?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = inputText.trim();
    if (!question || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      if (data.success && data.answer) {
        setPendingAnswer({
          question,
          answer: data.answer,
          provider: data.provider || 'Gemini Flash',
          arabicTranslation: data.arabicTranslation || '',
        });
        setShowDeliveryModal(true);
      } else {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Unable to process your question at the moment. Please try rephrasing your speaking question.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Error contacting speaking AI:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Connection error while contacting AI server. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const launchVideoCall = async (script: string, topic: string, arabicTranslation?: string) => {
    try {
      const tavusRes = await fetch('/api/tavus/create-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, question: topic }),
      });
      const tavusData = await tavusRes.json();
      setActiveCallData({
        script,
        question: topic,
        tavusRoomUrl: tavusData.conversationUrl || null,
        arabicTranslation,
      });
      setIsCallOpen(true);
    } catch (err) {
      console.error('Error starting video call:', err);
      setActiveCallData({
        script,
        question: topic,
        tavusRoomUrl: null,
        arabicTranslation,
      });
      setIsCallOpen(true);
    }
  };

  const handleSelectDelivery = async (format: 'video' | 'text') => {
    setShowDeliveryModal(false);
    if (!pendingAnswer) return;
    const { question, answer, provider, arabicTranslation } = pendingAnswer;

    const aiAnswerMsg: Message = {
      id: (Date.now() + 2).toString(),
      sender: 'ai',
      text: answer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider,
      modelAnswer: true,
    };
    setMessages((prev) => [...prev, aiAnswerMsg]);

    if (format === 'video') {
      await launchVideoCall(answer, question, arabicTranslation);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRestart = () => {
    setMessages([INITIAL_AI_MESSAGE]);
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#161b22] border border-[#30363d] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl min-h-0">
      <div className="px-3 py-3 sm:px-5 sm:py-4 bg-[#0d1117]/90 border-b border-[#30363d] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl text-[#8b949e] hover:text-white hover:bg-[#161b22] transition-colors cursor-pointer shrink-0"
            title="Back to AI Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex w-9 h-9 rounded-2xl bg-teal-500/10 border border-teal-500/30 items-center justify-center text-teal-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-xs sm:text-base truncate">Speaking AI Solver</h3>
              <span className="text-[9px] sm:text-[10px] bg-teal-950 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                Gemini
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] hidden sm:block mt-0.5">
              IELTS, TOEFL & Spoken English solver with live video call & lip-sync character
            </p>
          </div>
        </div>
        <button
          onClick={handleRestart}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#30363d] text-xs font-bold flex items-center gap-1.5 text-[#8b949e] hover:text-teal-400 hover:bg-[#161b22] transition-all cursor-pointer shrink-0"
          title="Start fresh question"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Topic</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 min-h-[220px] sm:min-h-[340px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] text-[#8b949e] mb-1.5 px-1">
              <span className="font-semibold text-white">
                {msg.sender === 'user' ? 'You' : 'Speaking AI'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {msg.time}
              </span>
              {msg.provider && (
                <span className="text-[10px] text-teal-400 font-mono">
                  via {msg.provider}
                </span>
              )}
            </div>
            <div
              className={`max-w-[85%] sm:max-w-[78%] chat-bubble-responsive ${
                msg.sender === 'user'
                  ? 'bg-teal-700 text-white rounded-tr-xs shadow-md shadow-teal-900/30 font-medium'
                  : msg.isInitialPrompt
                  ? 'bg-[#0d1117] border border-teal-500/40 text-teal-100 rounded-tl-xs shadow-lg'
                  : 'bg-[#1c2128] border border-[#30363d] text-white/95 rounded-tl-xs shadow-md'
              }`}
            >
              {msg.isInitialPrompt && (
                <div className="flex items-center gap-2 mb-2 text-teal-400 font-semibold text-xs">
                  <Lightbulb className="w-4 h-4" />
                  <span>Prompt Guideline</span>
                </div>
              )}
              <p className="whitespace-pre-line">{msg.text}</p>
              {msg.modelAnswer && (
                <div className="mt-3.5 pt-3 border-t border-[#30363d] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 capsule-responsive text-teal-300 bg-teal-950/60 border-teal-800/80">
                    <ShieldCheck className="icon-responsive text-teal-400" />
                    <span>Grammatically Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="btn-responsive bg-[#0d1117] hover:bg-[#21262d] text-[#8b949e] hover:text-white"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="icon-responsive text-teal-400" />
                          <span className="text-teal-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="icon-responsive" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => launchVideoCall(msg.text, 'Model Speaking Solution')}
                      className="btn-responsive bg-teal-600 hover:bg-teal-500 text-white"
                    >
                      <Video className="icon-responsive" />
                      <span>Start Video Call</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="flex items-center gap-2 text-[11px] text-teal-400 mb-1 px-1">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Gemini Engine</span>
            </div>
            <div className="chat-bubble-responsive bg-[#0d1117] border border-teal-500/40 text-teal-200 rounded-tl-xs flex items-center gap-3 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>Generating comprehensive speaking model answer via Gemini...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#0d1117] border-t border-[#30363d]">
        <form
          onSubmit={handleSendQuestion}
          className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-1.5 pl-4 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-400/30 transition-all shadow-inner"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Send only your speaking question (e.g. 'Describe a major technology shift')..."
            className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-white placeholder-[#8b949e] focus:ring-0 min-w-0"
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="btn-responsive bg-teal-600 hover:bg-teal-500 disabled:opacity-30 disabled:hover:bg-teal-600 disabled:cursor-not-allowed text-white shadow-md shadow-teal-900/40"
          >
            <Send className="icon-responsive" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      <SpeakingDeliveryModal
        isOpen={showDeliveryModal}
        question={pendingAnswer?.question || ''}
        onSelect={handleSelectDelivery}
      />

      {activeCallData && (
        <TavusCallModal
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          script={activeCallData.script}
          question={activeCallData.question}
          tavusRoomUrl={activeCallData.tavusRoomUrl}
          arabicTranslation={activeCallData.arabicTranslation}
        />
      )}
    </div>
  );
};
