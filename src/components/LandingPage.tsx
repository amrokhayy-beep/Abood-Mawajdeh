import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, BookOpen, GraduationCap, Lightbulb, Code2 } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const QUOTES = [
  { text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein" },
  { text: "Learning another language is not only learning different words for the same things, but learning another way to think about things.", author: "Flora Lewis" },
  { text: "One language sets you in a corridor for life. Two languages open every door along the way.", author: "Frank Smith" },
  { text: "Practice isn't the thing you do once you're good. It's the thing you do that makes you good.", author: "Malcolm Gladwell" },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  const [typedText, setTypedText] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const fullText = "YOUR ENGLISH IN OUR HAND";
    let charIndex = 0;
    let isTyping = true;
    let timer: NodeJS.Timeout;

    const step = () => {
      if (isTyping) {
        charIndex++;
        setTypedText(fullText.slice(0, charIndex));
        if (charIndex >= fullText.length) {
          isTyping = false;
          timer = setTimeout(step, 1400);
          return;
        }
        timer = setTimeout(step, 85);
      } else {
        charIndex--;
        setTypedText(fullText.slice(0, charIndex));
        if (charIndex <= 0) {
          isTyping = true;
          timer = setTimeout(step, 500);
          return;
        }
        timer = setTimeout(step, 40);
      }
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 4500);
    return () => clearInterval(quoteInterval);
  }, []);

  return (
    <div id="landing-screen" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#f0f7fc] text-[#152742] px-4 py-8">
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden" aria-hidden="true">
        <BookOpen className="absolute top-12 left-12 w-16 h-16 text-[#284a6f] animate-bounce" style={{ animationDuration: '6s' }} />
        <GraduationCap className="absolute bottom-16 left-16 w-20 h-20 text-[#2f9e97] animate-pulse" />
        <Lightbulb className="absolute top-20 right-16 w-14 h-14 text-amber-500 animate-bounce" style={{ animationDuration: '7s' }} />
        <Code2 className="absolute bottom-24 right-20 w-16 h-16 text-[#284a6f]" />
      </div>

      <main className="relative z-10 max-w-2xl w-full text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-teal-200 shadow-sm text-xs font-bold tracking-wider text-teal-800 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>ENGLISH LEARNING PLATFORM</span>
        </div>

        <h1 className="font-['Space_Grotesk'] font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight text-[#b9860f] min-h-[4rem] sm:min-h-[5rem] flex items-center justify-center">
          <span>{typedText}</span>
          <span className="inline-block w-1 h-8 sm:h-12 ml-1 bg-[#b9860f] animate-pulse" />
        </h1>

        <svg className="w-64 sm:w-80 h-4 my-3 text-teal-600/70" viewBox="0 0 360 22" fill="none">
          <path d="M6 16 C 90 4, 180 24, 354 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>

        <p className="text-base sm:text-lg text-[#3c5a7a] mt-2 mb-8 max-w-lg leading-relaxed">
          Let&apos;s start an exciting and captivating journey throughout the semester.
        </p>

        <button
          id="btn-lets-start"
          onClick={onStart}
          className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-full font-['Space_Grotesk'] font-semibold text-lg text-white bg-gradient-to-r from-[#2f9e97] to-[#1f7d78] shadow-lg shadow-teal-900/20 hover:shadow-teal-900/35 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <span>LET&apos;S START</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="mt-14 h-24 max-w-md w-full flex flex-col items-center justify-center text-center px-4 transition-all duration-500">
          <p className="text-sm italic text-[#3c5a7a] font-medium leading-relaxed">
            &ldquo;{QUOTES[quoteIndex].text}&rdquo;
          </p>
          <span className="text-xs font-semibold text-[#2f9e97] mt-1.5">
            {QUOTES[quoteIndex].author}
          </span>
        </div>
      </main>
    </div>
  );
}
