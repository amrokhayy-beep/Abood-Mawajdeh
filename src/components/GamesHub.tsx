import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Trophy, Play, ArrowLeft, CheckCircle2, XCircle, RotateCcw, Flame, Sparkles, Send, Clock, AlertCircle, Swords, Timer, Lock, X, ShieldAlert, Award, TrendingUp, TrendingDown, Shield, Star, Zap, AlertTriangle } from 'lucide-react';
import { calculateLevelFromExp, getNextLevelInfo, LEVEL_THRESHOLDS } from '../types';
import { syncWithServerDatabase } from '../services/storage';

interface GamesHubProps {
  onBack: () => void;
  onNotify?: (msg: string) => void;
  currentUser?: string;
  studentName?: string;
  userAvatar?: string;
  onExamStateChange?: (inExam: boolean) => void;
}

export const GamesHub: React.FC<GamesHubProps> = ({
  onBack,
  onNotify,
  currentUser = 'Student',
  studentName = 'Student',
  userAvatar = '',
  onExamStateChange
}) => {
  const parseGuessItem = (raw: string) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        name: raw,
        validAnswers: [raw.toLowerCase()],
        imageUrl: '',
        arabicHint: 'شيء ما',
        englishHint: `Identify this object in English (e.g. ${raw})`,
        emoji: '🔍'
      };
    }
  };

  const checkGuessMatch = (input: string, rawGuess: string): boolean => {
    if (!input) return false;
    const item = parseGuessItem(rawGuess);
    if (!item) return false;

    let cleanInput = input.trim().toLowerCase();
    cleanInput = cleanInput.replace(/^(a|an|the)\s+/, '');

    const validList: string[] = item.validAnswers || [item.name?.toLowerCase() || ''];
    return validList.some(ans => {
      const cleanAns = ans.trim().toLowerCase();
      return cleanAns === cleanInput || cleanInput === cleanAns + 's' || cleanInput + 's' === cleanAns;
    });
  };

  const [gameMode, setGameMode] = useState<'select' | 'ranked' | 'not-ranked'>('select');
  const [rankedState, setRankedState] = useState<'intro' | 'matching' | 'matching-timeout' | 'face-off' | 'playing' | 'round-result' | 'game-over'>('intro');
  const [faceOffTimer, setFaceOffTimer] = useState(4);
  const [pendingMatchState, setPendingMatchState] = useState<any>(null);
  const [matchReward, setMatchReward] = useState<{
    result: 'win' | 'loss' | 'draw';
    expChange: number;
    honorChange: number;
    oldExp?: number;
    newExp: number;
    newLevel: number;
    newHonor: number;
    warning?: string;
  } | null>(null);

  const getArabicTopicHint = (topic: string): string => {
    if (!topic) return '💡 اكتب تعبيراً مفصلاً باللغة الإنجليزية حول هذا الموضوع.';
    if (topic.includes('continuous learning')) return '💡 ترجمة/تلميح الموضوع: صف أهمية التعلم المستمر والتطوير الذاتي في الحياة المعاصرة.';
    if (topic.includes('travel anywhere')) return '💡 ترجمة/تلميح الموضوع: ماذا ستفعل وأين ستذهب إذا كان بإمكانك السفر لأي مكان بالعالم غداً؟';
    if (topic.includes('technology has transformed')) return '💡 ترجمة/تلميح الموضوع: اشرح كيف غيرت التكنولوجيا الحديثة شكل وسائل التعليم والدراسة.';
    if (topic.includes('bilingual')) return '💡 ترجمة/تلميح الموضوع: ناقش فوائد ومزايا إتقان لغتين أو تعلم لغة جديدة في حياتك.';
    if (topic.includes('favorite book or movie')) return '💡 ترجمة/تلميح الموضوع: ما هو كتابك أو فيلمك المفضل وما الذي تعلمته واستفدته منه؟';
    if (topic.includes('protecting the environment')) return '💡 ترجمة/تلميح الموضوع: كيف يمكن للشباب والطلاب المساهمة في حماية البيئة والطبيعة؟';
    if (topic.includes('inspires you')) return '💡 ترجمة/تلميح الموضوع: صف شخصية تلهمك واذكر الصفات والخصال التي تعجبك وتقتدي بها.';
    if (topic.includes('social media')) return '💡 ترجمة/تلميح الموضوع: ما هي إيجابيات وسلبيات وسائل التواصل الاجتماعي في حياتنا اليومية؟';
    if (topic.includes('invent something')) return '💡 ترجمة/تلميح الموضوع: لو كان بإمكانك اختراع شيء لجعل العالم مكاناً أفضل، ماذا سيكون ولماذا؟';
    if (topic.includes('teamwork')) return '💡 ترجمة/تلميح الموضوع: اشرح لماذا يعتبر العمل الجماعي والتعاون أساسياً لتحقيق الأهداف الكبرى.';
    if (topic.includes('reading books')) return '💡 ترجمة/تلميح الموضوع: كيف تساعد قراءة الكتب في تنمية الخيال وتحسين مهارات التواصل؟';
    if (topic.includes('unforgettable experience')) return '💡 ترجمة/تلميح الموضوع: صف تجربة أو موقفاً لا يُنسى تعلمت منه درساً قيماً في الحياة.';
    if (topic.includes('academic excellence')) return '💡 ترجمة/تلميح الموضوع: ما هي العادات التي تساعد الطالب على التفوق الدراسي والتوازن في الحياة؟';
    if (topic.includes('artificial intelligence')) return '💡 ترجمة/تلميح الموضوع: كيف يمكن للذكاء الاصطناعي مساعدة البشرية في حل المشكلات المعقدة؟';
    if (topic.includes('dream career')) return '💡 ترجمة/تلميح الموضوع: ما هي مهنة أحلامك وما الخطوات التي تخطط لاتخاذها للوصول إليها؟';
    return `💡 ترجمة/تلميح الموضوع: اكتب فقرة تعبيرية متكاملة باللغة الإنجليزية حول هذه الفكرة.`;
  };

  const getGrammarArabicHint = (q: string, type: string): string => {
    if (!q) {
      return type === 'grammar' 
        ? '💡 التلميح بالعربية: اختر زمن الفعل المناسب أو حرف الجر الأدق لإكمال الجملة.'
        : '💡 التلميح بالعربية: اختر المرادف أو المعنى المناسب للكلمة بالإنجليزية.';
    }
    if (q.includes('yesterday')) return '💡 التلميح بالعربية: الكلمة (yesterday) تدل على الزمان الماضي البسيط (Past Simple).';
    if (q.includes('good ___ English')) return '💡 التلميح بالعربية: حرف الجر المناسب بعد صفة (good) لبيان المهارة هو (at).';
    if (q.includes('Present Perfect')) return '💡 التلميح بالعربية: زمن المضارع التام يتكون من (has/have) + التصريف الثالث للفعل (V3).';
    if (q.includes('helmet')) return '💡 التلميح بالعربية: اختر فعل الإلزام والوجوب القوي (must) الضروري للسلامة.';
    if (q.includes('rains tomorrow')) return '💡 التلميح بالعربية: الجملة الشرطية الأولى (First Conditional) تستخدم المضارع في فعل الشرط و (will + مصدر) في جواب الشرط.';
    if (q.includes('taught us English')) return '💡 التلميح بالعربية: اسم الموصول المستخدم للإشارة إلى الأشخاص والعاقل هو (who).';
    if (q.includes('Charles Dickens')) return '💡 التلميح بالعربية: صيغة المبني للمجهول في الماضي للرواية المفردة هي (was written).';
    if (q.includes('9:00 AM')) return '💡 التلميح بالعربية: حرف الجر الدال على الساعات والأوقات المحددة هو (at).';
    if (q.includes('than silver')) return '💡 التلميح بالعربية: صيغة المقارنة للصفات الطويلة مثل expensive تكون بإضافة (more expensive than).';
    if (q.includes('subject-verb agreement')) return '💡 التلميح بالعربية: كلمة (team) تعامل كمفرد وتأخذ (is working).';
    if (q.includes('five years')) return '💡 التلميح بالعربية: نستخدم (for) للتعبير عن المدة الزمنية المستمرة مثل (for five years).';
    if (q.includes('graduation party')) return '💡 التلميح بالعربية: السؤال المذيل (Question Tag) لجملة (You are...) يكون منفيًا (aren\'t you?).';
    if (q.includes('raining heavily')) return '💡 التلميح بالعربية: أداة الربط الدالة على التناقض المعنوي والافتراض هي (Although).';
    if (q.includes('insisted on')) return '💡 التلميح بالعربية: بعد حروف الجر مثل (on) يأتي الفعل متبوعاً بـ ing مثل (completing).';
    if (q.includes('rich, I would')) return '💡 التلميح بالعربية: في الحالة الشرطية الثانية (Second Conditional) التخيلية نستخدم (were) مع الضمائر.';
    if (q.includes('Enthusiastic')) return '💡 التلميح بالعربية: كلمة Enthusiastic تعني (متحمس / شغوف)، والمرادف هو Passionate.';
    if (q.includes('Generous')) return '💡 التلميح بالعربية: كلمة Generous تعني كريم، وعكسها (Selfish) أي أناني.';
    if (q.includes('Piece of')) return '💡 التلميح بالعربية: المثل الشهير هو (Piece of cake) ويعني أمر سهل للغاية.';
    if (q.includes('Resilient')) return '💡 التلميح بالعربية: الشخص الـ Resilient هو القادر على التعافي ومواجهة الصعاب بمرونة.';
    if (q.includes('Abundant')) return '💡 التلميح بالعربية: كلمة Abundant تعني وفير أو غزير، ومرادفها (Plentiful).';
    if (q.includes('Permanent')) return '💡 التلميح بالعربية: كلمة Permanent تعني دائم، والمضاد هو (Temporary) مؤقت.';
    if (q.includes('Bite the bullet')) return '💡 التلميح بالعربية: مصطلح يعني مواجهة أمر صعب بشجاعة وحزم.';
    if (q.includes('Meticulous')) return '💡 التلميح بالعربية: تعني دقيق للغاية ومنتبه لأصغر التفاصيل (Careful and precise).';
    if (q.includes('Arrogant')) return '💡 التلميح بالعربية: كلمة Arrogant تعني متكبر، وعكسها (Humble) متواضع.';
    if (q.includes('Call off')) return '💡 التلميح بالعربية: الفعل المركب (Call off) يعني إلغاء موعد أو حدث (Cancel).';
    if (q.includes('Crucial')) return '💡 التلميح بالعربية: تعني حاسم وجوهري وبالغ الأهمية (Vital and essential).';
    if (q.includes('Hit the')) return '💡 التلميح بالعربية: مصطلح (Hit the sack) يعني الذهاب إلى الفراش للنوم.';
    if (q.includes('Diligent')) return '💡 التلميح بالعربية: تعني مجتهد ومثابر في عمله أو دراسته (Hardworking and dedicated).';
    if (q.includes('Once in a blue moon')) return '💡 التلميح بالعربية: تعبير مجازي يعني حدوث الشيء نادراً جداً (Very rarely).';
    return type === 'grammar' 
      ? '💡 التلميح بالعربية: ركز في قواعد اللغة الإنجليزية واختبر الخيار الأدق.'
      : '💡 التلميح بالعربية: اختر المرادف المعنوي المناسب للكلمة المذكورة أعلاه.';
  };

  const getRoundInfo = (type: string) => {
    switch (type) {
      case 'memorize':
        return {
          titleEn: '🧠 Memorize & Spell',
          titleAr: 'تحدي الحفظ والإملاء السريع',
          descEn: 'You will have 10 seconds to memorize a word. Then, type it as fast as you can with perfect spelling!',
          descAr: 'ستظهر لك كلمة بالإنجليزية لمدة 10 ثوانٍ لحفظ حروفها، بعد انتهاء الوقت اكتبها بسرعة وبإملاء صحيح تماماً للفوز بالجولة.',
          badge: 'حفظ وإملاء (Memorize)'
        };
      case 'essay':
        return {
          titleEn: '✍️ Creative Essay',
          titleAr: 'تحدي التعبير والكتابة الإنشائية',
          descEn: 'Write a creative English essay on the prompt. Submissions are judged by our advanced writing evaluator!',
          descAr: 'اكتب فقرة تعبيرية بالإنجليزية عن الموضوع المحدد. سيتم تقييم دقة المفردات والقواعد لاختيار الفائز بالجولة.',
          badge: 'كتابة تعبير (Essay)'
        };
      case 'guess':
        return {
          titleEn: '🔍 Object Guessing',
          titleAr: 'تحدي تخمين الغرض من التلميحات',
          descEn: 'Read the descriptive clues and identify the hidden object. You have 20 seconds to submit!',
          descAr: 'اقرأ التلميحات والأوصاف الإنجليزية واكتشف الشيء أو الغرض المخفي واكتب اسمه قبل انتهاء 20 ثانية.',
          badge: 'تخمين (Guess)'
        };
      case 'grammar':
        return {
          titleEn: '📝 Grammar Challenge',
          titleAr: 'تحدي القواعد وتراكيب الجمل',
          descEn: 'Select the grammatically correct option to complete the English sentence. Be quick!',
          descAr: 'اختر الإجابة النحوية الصحيحة لإكمال الجملة بالإنجليزية. أسرع طالب يجيب إجابة صحيحة يحصل على النقطة.',
          badge: 'قواعد (Grammar)'
        };
      case 'vocab':
        return {
          titleEn: '📖 Vocabulary Challenge',
          titleAr: 'تحدي معاني ومفردات اللغة',
          descEn: 'Test your English vocabulary by picking the correct synonym or word meaning!',
          descAr: 'حدد المعنى أو المرادف الصحيح للكلمة المعروضة لاختبار حصيلتك اللغوية. الإجابة الأسرع والأصح تفوز.',
          badge: 'مفردات (Vocab)'
        };
      default:
        return {
          titleEn: '⚔️ English Challenge',
          titleAr: 'جولة التحدي والمنافسة',
          descEn: 'Compete against your opponent and submit the correct answer as fast as possible!',
          descAr: 'أجب بأسرع وأدق شكل ممكن للتفوق على منافسك في هذه الجولة!',
          badge: 'تحدي (Duel)'
        };
    }
  };
  
  // Ranked Match Data
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<{ name: string; username: string; avatar: string } | null>(null);
  const [matchingTimer, setMatchingTimer] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundType, setRoundType] = useState<'memorize' | 'essay' | 'guess' | 'grammar' | 'vocab'>('memorize');
  const [roundResultCountdown, setRoundResultCountdown] = useState<number>(5);

  // Synchronization refs to prevent stale closures
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;
  const matchIdRef = useRef(matchId);
  matchIdRef.current = matchId;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  
  // Round 1: Memorize & Type
  const [targetWord, setTargetWord] = useState('Vocabulary');
  const [showMemorizeCard, setShowMemorizeCard] = useState(true);
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(10);
  const [typeAnswer, setTypeAnswer] = useState('');
  const [roundTimer, setRoundTimer] = useState(7);
  
  // Round 2: Essay writing
  const [essayTopic, setEssayTopic] = useState('Describe your favorite hobby and why it brings you joy.');
  const [essayText, setEssayText] = useState('');
  const [essayTimeLeft, setEssayTimeLeft] = useState(30); // prep time
  const [writingTimeLeft, setWritingTimeLeft] = useState(75); // 1 min 15 sec
  
  // Round 3: Image / Object Guess
  const [guessImage, setGuessImage] = useState('Refrigerator');
  const [guessAnswer, setGuessAnswer] = useState('');

  // Round 4 & 5: Grammar & Vocab
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState(-1);
  
  // Scores
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [roundWinner, setRoundWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);

  // Synchronization and anti-reset states
  const [roundStartedAtTime, setRoundStartedAtTime] = useState<number>(0);
  const [lastResetRound, setLastResetRound] = useState(0);
  const [roundIntroTimeLeft, setRoundIntroTimeLeft] = useState(0);
  const [guessTimer, setGuessTimer] = useState(20);
  const [submittedLocally, setSubmittedLocally] = useState(false);
  
  // Anti-Cheat & Screenshot Security States
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [isCheatForfeit, setIsCheatForfeit] = useState(false);
  const [cheatForfeitReason, setCheatForfeitReason] = useState('');
  const cheatTriggeredRef = useRef(false);

  // Not-ranked state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [notRankedScore, setNotRankedScore] = useState(0);
  const [notRankedStreak, setNotRankedStreak] = useState(0);
  const [notRankedGameOver, setNotRankedGameOver] = useState(false);

  const updateMatchStateFromData = (state: any) => {
    if (!state) return;

    setCurrentRound(state.currentRound);
    setRoundType(state.roundType);
    setMyScore(state.myScore);
    setOpponentScore(state.opponentScore);
    if (state.opponent) {
      setOpponent(state.opponent);
    }
    if (state.roundStartedAt) {
      setRoundStartedAtTime(state.roundStartedAt);
    }

    // Sync content
    if (state.roundType === 'memorize') {
      setTargetWord(state.targetWord);
    } else if (state.roundType === 'essay') {
      setEssayTopic(state.essayTopic);
    } else if (state.roundType === 'guess') {
      setGuessImage(state.guessImage);
    } else if (state.roundType === 'grammar' || state.roundType === 'vocab') {
      setQuestion(state.question);
      setOptions(state.options || []);
      setCorrectIndex(state.correctIndex);
    }

    if (state.mySubmitted) {
      setSubmittedLocally(true);
    }
    if (state.myAnswer) {
      if (state.roundType === 'essay' && !essayText) setEssayText(state.myAnswer);
      if (state.roundType === 'memorize' && !typeAnswer) setTypeAnswer(state.myAnswer);
      if (state.roundType === 'guess' && !guessAnswer) setGuessAnswer(state.myAnswer);
    }

    if (state.matchReward) {
      setMatchReward(state.matchReward);
      const prevLvl = calculateLevelFromExp(state.matchReward.oldExp || 0);
      if (state.matchReward.newLevel > prevLvl) {
        window.dispatchEvent(new CustomEvent('player-level-up', {
          detail: {
            oldLevel: prevLvl,
            newLevel: state.matchReward.newLevel,
            totalExp: state.matchReward.newExp,
            studentName: studentName
          }
        }));
      }
    }

    if (state.status === 'round-result') {
      if (state.roundWinner === currentUser.toLowerCase().trim()) {
        setRoundWinner('me');
      } else if (state.roundWinner === 'draw') {
        setRoundWinner('draw');
      } else {
        setRoundWinner('opponent');
      }
      setRankedState('round-result');
    } else if (state.status === 'game-over') {
      setRankedState('game-over');
      syncWithServerDatabase(currentUser);
    } else if (state.status === 'playing') {
      // Robust detection of a brand new round that needs resetting
      const isNewRound = state.currentRound !== lastResetRound || 
        rankedState === 'matching' || 
        rankedState === 'intro';

      if (isNewRound) {
        setLastResetRound(state.currentRound);
        
        // Reset local round inputs and states
        setTypeAnswer('');
        setEssayText('');
        setGuessAnswer('');
        setRoundWinner(null);
        setSubmittedLocally(false);

        // Reset timers
        if (state.roundType === 'memorize') {
          setShowMemorizeCard(true);
          setMemorizeTimeLeft(10);
        } else if (state.roundType === 'essay') {
          setEssayTimeLeft(5);
          setWritingTimeLeft(75);
        } else if (state.roundType === 'guess' || state.roundType === 'grammar' || state.roundType === 'vocab') {
          setGuessTimer(20);
        }

        // Activate round introduction
        setRoundIntroTimeLeft(5);
        setRankedState('playing');
      }
    }
  };

  // Real student-to-student matchmaking queue algorithm with 60-second forced timeout
  useEffect(() => {
    if (rankedState === 'matching') {
      const timer = setInterval(() => {
        setMatchingTimer((prev) => {
          if (prev >= 59) {
            // Reached 60 seconds (1 minute)!
            // Forced cancellation / timeout!
            fetch('/api/ranked/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: currentUser })
            }).catch(() => {});
            setRankedState('matching-timeout');
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      // Poll server queue to find a real online student in matchmaking
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/ranked/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, name: studentName, avatar: userAvatar })
          });
          const data = await res.json();
          if (data.success && data.opponent && data.matchId) {
            setMatchId(data.matchId);
            setOpponent(data.opponent);
            clearInterval(pollInterval);
            clearInterval(timer);

            // Fetch initial match state
            const stateRes = await fetch('/api/ranked/check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: currentUser, matchId: data.matchId })
            });
            const stateData = await stateRes.json();
            if (stateData.success && stateData.matchState) {
              setPendingMatchState(stateData.matchState);
              if (stateData.matchState.roundStartedAt) {
                setRoundStartedAtTime(stateData.matchState.roundStartedAt);
              }
              const faceOffUntil = stateData.matchState.faceOffUntil || (Date.now() + 4000);
              const remaining = Math.max(1, Math.ceil((faceOffUntil - Date.now()) / 1000));
              setFaceOffTimer(remaining);
            } else {
              setFaceOffTimer(4);
            }

            // Show Face-off CV screen before starting round 1
            setRankedState('face-off');
          }
        } catch (e) {
          // Fallback if network fails
        }
      }, 700);

      return () => {
        clearInterval(timer);
        clearInterval(pollInterval);
      };
    }
  }, [rankedState, currentUser, studentName, userAvatar]);

  // Exam state determination: active ranked duel or active not-ranked practice
  const isInExam = (gameMode === 'ranked' && (rankedState === 'face-off' || rankedState === 'playing' || rankedState === 'round-result')) ||
                   (gameMode === 'not-ranked' && !notRankedGameOver);

  // Synchronize exam state with parent Dashboard
  useEffect(() => {
    onExamStateChange?.(isInExam);
    return () => {
      onExamStateChange?.(false);
    };
  }, [isInExam, onExamStateChange]);

  // Anti-copy protection during active exams
  useEffect(() => {
    if (!isInExam) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.clearData();
      }
      onNotify?.('⚠️ ممنوع نسخ النصوص أثناء الاختبار لضمان نزاهة الامتحان! / Copying text is strictly disabled during the exam!');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      onNotify?.('⚠️ القص والنسخ غير متاح أثناء الاختبار!');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onNotify?.('⚠️ القائمة المنسدلة والنسخ محظورة أثناء الاختبار!');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onNotify?.('⚠️ اختصار النسخ محظور أثناء الاختبار! Copying text is not allowed.');
      }
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [isInExam, onNotify]);

  // Synchronized Face-Off timer countdown effect
  useEffect(() => {
    if (rankedState === 'face-off') {
      const faceOffUntil = pendingMatchState?.faceOffUntil || (Date.now() + 4000);
      const faceOffInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((faceOffUntil - Date.now()) / 1000));
        setFaceOffTimer(remaining);
        if (Date.now() >= faceOffUntil) {
          clearInterval(faceOffInterval);
          if (pendingMatchState) {
            updateMatchStateFromData(pendingMatchState);
          } else {
            setRankedState('playing');
          }
        }
      }, 200);
      return () => clearInterval(faceOffInterval);
    }
  }, [rankedState, pendingMatchState]);

  // High-precision synchronized timer loop driven by server timestamp
  useEffect(() => {
    if (rankedState === 'playing') {
      const syncInterval = setInterval(() => {
        const t0 = roundStartedAtTime > 0 ? roundStartedAtTime : Date.now();
        const now = Date.now();
        const elapsed = Math.max(0, now - t0);

        // 1. Round Intro (first 5 seconds)
        const introLeft = Math.max(0, Math.ceil((5000 - elapsed) / 1000));
        setRoundIntroTimeLeft(introLeft);

        // 2. Round Gameplay based on elapsed
        if (roundType === 'memorize') {
          if (elapsed < 5000) {
            setShowMemorizeCard(true);
            setMemorizeTimeLeft(10);
            setRoundTimer(7);
          } else if (elapsed < 15000) {
            // Memorize view (10s)
            setShowMemorizeCard(true);
            setMemorizeTimeLeft(Math.max(0, Math.ceil((15000 - elapsed) / 1000)));
            setRoundTimer(7);
          } else if (elapsed < 22000) {
            // Typing phase (7s)
            setShowMemorizeCard(false);
            setMemorizeTimeLeft(0);
            setRoundTimer(Math.max(0, Math.ceil((22000 - elapsed) / 1000)));
          } else {
            setShowMemorizeCard(false);
            setRoundTimer(0);
            if (!submittedLocally) {
              evaluateRoundResult(typeAnswer.trim().toLowerCase() === targetWord.toLowerCase());
            }
          }
        } else if (roundType === 'essay') {
          if (elapsed < 5000) {
            setEssayTimeLeft(5);
            setWritingTimeLeft(75);
          } else if (elapsed < 10000) {
            // 5s prep
            setEssayTimeLeft(Math.max(0, Math.ceil((10000 - elapsed) / 1000)));
            setWritingTimeLeft(75);
          } else if (elapsed < 85000) {
            // 75s writing
            setEssayTimeLeft(0);
            setWritingTimeLeft(Math.max(0, Math.ceil((85000 - elapsed) / 1000)));
          } else {
            setEssayTimeLeft(0);
            setWritingTimeLeft(0);
            if (!submittedLocally) {
              evaluateEssayResult();
            }
          }
        } else if (roundType === 'guess' || roundType === 'grammar' || roundType === 'vocab') {
          if (elapsed < 5000) {
            setGuessTimer(20);
          } else if (elapsed < 25000) {
            // 20s question
            setGuessTimer(Math.max(0, Math.ceil((25000 - elapsed) / 1000)));
          } else {
            setGuessTimer(0);
            if (!submittedLocally) {
              if (roundType === 'guess') {
                evaluateRoundResult(checkGuessMatch(guessAnswer, guessImage), guessAnswer);
              } else {
                evaluateRoundResult(false, '');
              }
            }
          }
        }
      }, 200);

      return () => clearInterval(syncInterval);
    }
  }, [rankedState, roundStartedAtTime, roundType, submittedLocally, typeAnswer, targetWord, essayText, guessAnswer, guessImage]);

  const evaluateRoundResult = async (isCorrect: boolean, customAnswer?: string) => {
    setSubmittedLocally(true);

    if (!matchId) {
      // Fallback local
      setRoundWinner(isCorrect ? 'me' : 'draw');
      setRankedState('round-result');
      return;
    }

    try {
      const ans = customAnswer !== undefined ? customAnswer : (roundType === 'memorize' ? typeAnswer : guessAnswer);
      const res = await fetch('/api/ranked/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, username: currentUser, answer: ans, correct: isCorrect })
      });
      const data = await res.json();
      if (data.success && data.matchState) {
        updateMatchStateFromData(data.matchState);
      }
    } catch (e) {
      setRoundWinner(isCorrect ? 'me' : 'draw');
      setRankedState('round-result');
    }
  };

  const evaluateEssayResult = async () => {
    const wordCount = essayText.trim().split(/\s+/).filter(Boolean).length;
    const isGood = wordCount >= 5;
    
    setSubmittedLocally(true);

    if (!matchId) {
      setRoundWinner(isGood ? 'me' : 'draw');
      setRankedState('round-result');
      return;
    }

    try {
      const res = await fetch('/api/ranked/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, username: currentUser, answer: essayText, correct: isGood })
      });
      const data = await res.json();
      if (data.success && data.matchState) {
        updateMatchStateFromData(data.matchState);
      }
    } catch (e) {
      setRoundWinner(isGood ? 'me' : 'draw');
      setRankedState('round-result');
    }
  };

  // Poll active match state during gameplay to instantly lock when opponent submits
  useEffect(() => {
    if ((rankedState === 'playing' || rankedState === 'round-result') && matchId) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('/api/ranked/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, matchId })
          });
          const data = await res.json();
          if (data.success && data.matchState) {
            updateMatchStateFromData(data.matchState);
          }
        } catch (e) {}
      }, 500);
      return () => clearInterval(interval);
    }
  }, [rankedState, matchId, currentUser]);

  const handleNextRoundOrFinish = async () => {
    if (currentRound < 5) {
      if (matchId) {
        try {
          await fetch('/api/ranked/next-round', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, currentRound })
          });
          const res = await fetch('/api/ranked/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, matchId })
          });
          const data = await res.json();
          if (data.success && data.matchState) {
            updateMatchStateFromData(data.matchState);
          }
        } catch (e) {}
      }
    } else {
      setRankedState('game-over');
    }
  };

  // Automatic 5-second countdown to proceed to the next round without manual click
  useEffect(() => {
    if (rankedState === 'round-result') {
      setRoundResultCountdown(5);
      const timer = setInterval(() => {
        setRoundResultCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            const r = currentRoundRef.current;
            const mid = matchIdRef.current;
            const usr = currentUserRef.current;
            if (r < 5) {
              if (mid) {
                fetch('/api/ranked/next-round', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ matchId: mid, currentRound: r })
                }).then(() => {
                  return fetch('/api/ranked/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usr, matchId: mid })
                  });
                }).then(res => res.json()).then(data => {
                  if (data?.success && data?.matchState) {
                    updateMatchStateFromData(data.matchState);
                  }
                }).catch(() => {});
              }
            } else {
              setRankedState('game-over');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rankedState]);

  // Anti-Screenshot alert sound & clipboard sanitizer
  const playWarningBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  const triggerScreenshotWarning = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {});
      }
    } catch (e) {}
    playWarningBeep();
    setShowScreenshotWarning(true);
  };

  // Anti-Screenshot Event Listeners during Ranked Match
  useEffect(() => {
    const isRankedActive = gameMode === 'ranked' && (rankedState === 'playing' || rankedState === 'face-off' || rankedState === 'round-result');
    if (!isRankedActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotWarning();
        return false;
      }
      // Intercept Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotWarning();
        return false;
      }
      // Intercept Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotWarning();
        return false;
      }
      // Intercept Ctrl+Shift+S / Cmd+Shift+3/4/5 (Snipping Tool & screenshot shortcuts)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotWarning();
        return false;
      }
      // Intercept F12 / DevTools
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j'))) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotWarning();
        return false;
      }
      // Intercept Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotWarning();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        triggerScreenshotWarning();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerScreenshotWarning();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [gameMode, rankedState]);

  // Anti-Cheat: Tab Switch or Leaving Site Detection during active gameplay
  useEffect(() => {
    const isPlayingRound = gameMode === 'ranked' && rankedState === 'playing' && matchId;
    if (!isPlayingRound) return;

    const handleCheatForfeit = async (reasonText: string) => {
      if (cheatTriggeredRef.current) return;
      cheatTriggeredRef.current = true;
      setIsCheatForfeit(true);
      setCheatForfeitReason(reasonText);
      setRankedState('game-over');

      const mid = matchIdRef.current;
      const usr = currentUserRef.current;
      if (mid && usr) {
        try {
          const res = await fetch('/api/ranked/cheat-forfeit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: mid,
              username: usr,
              reason: reasonText,
            }),
          });
          const data = await res.json();
          if (data?.success && data?.matchState) {
            updateMatchStateFromData(data.matchState);
          }
        } catch (e) {}
      }

      // Sync user profile & notifications in storage
      syncWithServerDatabase(usr);
      window.dispatchEvent(new CustomEvent('profile-updated'));
      window.dispatchEvent(new CustomEvent('app-notification-received'));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheatForfeit('فتح علامة تبويب جديدة أو تصغير النافذة (Tab switched / Window minimized)');
      }
    };

    const handleWindowBlur = () => {
      // Detect when window loses focus (e.g. clicking outside, opening devtools or another app)
      handleCheatForfeit('الخروج من نافذة الاختبار أو النقر خارج الموقع (Window focus lost / Application left)');
    };

    const handleBeforeUnload = () => {
      handleCheatForfeit('محاولة إغلاق أو تحديث صفحة الموقع (Page leave / reload attempt)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameMode, rankedState, matchId]);

  const handlePlayAgain = (autoMatch = true) => {
    setMatchId(null);
    setOpponent(null);
    setSubmittedLocally(false);
    setLastResetRound(0);
    setMyScore(0);
    setOpponentScore(0);
    setCurrentRound(1);
    setTypeAnswer('');
    setEssayText('');
    setGuessAnswer('');
    setRoundWinner(null);
    cheatTriggeredRef.current = false;
    setIsCheatForfeit(false);
    setCheatForfeitReason('');

    if (autoMatch) {
      setRankedState('matching');
      setMatchingTimer(0);
    } else {
      setRankedState('intro');
    }
  };

  // Not-ranked questions
  const notRankedQuestions = [
    {
      id: 1,
      question: "What is the plural form of the noun 'child'?",
      options: ["Childs", "Children", "Childes", "Child"],
      correct: 1,
      explanation: "'Child' has an irregular plural form: 'Children' (جمع شاذ لكلمة طفل -> أطفال)."
    },
    {
      id: 2,
      question: "Which of the following words is a synonym for 'joyful'?",
      options: ["Miserable", "Angry", "Delighted", "Tired"],
      correct: 2,
      explanation: "'Delighted' means extremely happy and joyful (مبتهج / مسرور جداً)."
    },
    {
      id: 3,
      question: "Choose the correct indefinite article: 'She bought ___ umbrella for the rainy day.'",
      options: ["a", "an", "the", "some"],
      correct: 1,
      explanation: "We use 'an' before words starting with a vowel sound ('umbrella')."
    },
    {
      id: 4,
      question: "What is the antonym (opposite) of the word 'ancient'?",
      options: ["Old", "Modern", "Historic", "Antique"],
      correct: 1,
      explanation: "'Modern' (حديث / عصري) is the direct opposite of 'ancient' (قديم / أثري)."
    },
    {
      id: 5,
      question: "Complete the English idiom: 'It's a piece of ___' (meaning very easy).",
      options: ["cake", "bread", "pie", "cookie"],
      correct: 0,
      explanation: "'A piece of cake' is a common idiom meaning something is very easy to accomplish (سهل للغاية)."
    },
    {
      id: 6,
      question: "Choose the correct past participle: 'She has ___ all her homework.'",
      options: ["do", "did", "done", "doing"],
      correct: 2,
      explanation: "The past participle (V3) of 'do' is 'done' when used with 'has' in the Present Perfect."
    },
    {
      id: 7,
      question: "What is the synonym of 'Courageous'?",
      options: ["Timid", "Fearful", "Brave", "Weak"],
      correct: 2,
      explanation: "'Brave' is a direct synonym for 'Courageous' (شجاع / مقدام)."
    },
    {
      id: 8,
      question: "Choose the correct preposition: 'They traveled to Paris ___ train.'",
      options: ["in", "by", "on", "at"],
      correct: 1,
      explanation: "We use 'by' for modes of transportation: by train, by plane, by car."
    },
    {
      id: 9,
      question: "Select the correctly spelled word:",
      options: ["Recieve", "Receive", "Receeve", "Riceive"],
      correct: 1,
      explanation: "The rule 'i before e except after c' applies: 'Receive' (يستلم / يتلقى)."
    },
    {
      id: 10,
      question: "What is the antonym of 'Expand'?",
      options: ["Grow", "Contract", "Stretch", "Increase"],
      correct: 1,
      explanation: "'Contract' (ينكمش / يتقلص) is the opposite of 'Expand' (يتوسع / يتمدد)."
    },
    {
      id: 11,
      question: "Complete the sentence: 'If I were you, I ___ accept the offer.'",
      options: ["will", "would", "shall", "can"],
      correct: 1,
      explanation: "In second conditional advice ('If I were you...'), we use 'would + base verb'."
    },
    {
      id: 12,
      question: "What does the phrasal verb 'Look after' mean?",
      options: ["To search for", "To take care of", "To ignore", "To admire"],
      correct: 1,
      explanation: "'Look after' means to take care of someone or something (يعتني بـ / يرعى)."
    },
    {
      id: 13,
      question: "Choose the comparative form of 'Good':",
      options: ["Gooder", "Better", "Best", "More good"],
      correct: 1,
      explanation: "'Better' is the irregular comparative form of 'good'."
    },
    {
      id: 14,
      question: "Which word means 'able to speak two languages fluently'?",
      options: ["Monolingual", "Bilingual", "Multilingual", "Linguist"],
      correct: 1,
      explanation: "'Bilingual' refers to someone who speaks two languages fluently (ثنائي اللغة)."
    },
    {
      id: 15,
      question: "Identify the correct conjunction: 'He studied hard, ___ he passed the exam with top marks.'",
      options: ["so", "but", "although", "unless"],
      correct: 0,
      explanation: "'So' shows result / consequence: He studied hard, so he passed (لذلك / ولهذا السبب)."
    },
    {
      id: 16,
      question: "Choose the correct preposition: 'She sat ___ the front row of the classroom.'",
      options: ["in", "on", "at", "by"],
      correct: 0,
      explanation: "We say 'in the front/back row' (في الصف الأمامي)."
    },
    {
      id: 17,
      question: "Which of the following is a synonym for 'Abundant'?",
      options: ["Scarce", "Plentiful", "Rare", "Empty"],
      correct: 1,
      explanation: "'Plentiful' means existing in large amounts, exactly like 'Abundant' (وفير / غزير)."
    },
    {
      id: 18,
      question: "What is the antonym (opposite) of 'Artificial'?",
      options: ["Synthetic", "Fake", "Natural", "Man-made"],
      correct: 2,
      explanation: "'Natural' (طبيعي) is the direct opposite of 'Artificial' (صناعي / غير طبيعي)."
    },
    {
      id: 19,
      question: "Complete the Third Conditional: 'If she had studied harder, she ___ the exam.'",
      options: ["would pass", "would have passed", "passed", "will pass"],
      correct: 1,
      explanation: "Third conditional structure: If + past perfect, would have + past participle (V3)."
    },
    {
      id: 20,
      question: "What does the idiom 'Break a leg' mean in English?",
      options: ["Get injured", "Good luck", "Run fast", "Stop playing"],
      correct: 1,
      explanation: "'Break a leg' is a well-known theatrical idiom meaning 'Good luck!' (حظاً طيباً / بالتوفيق)."
    },
    {
      id: 21,
      question: "Choose the modal verb of negative certainty: 'The lights are off; they ___ be home.'",
      options: ["can't", "must", "might", "should"],
      correct: 0,
      explanation: "'Can't be' expresses strong certainty that something is impossible (مستحيل أن يكونوا في المنزل)."
    },
    {
      id: 22,
      question: "Select the correct verb form: 'She is looking forward to ___ her grandparents.'",
      options: ["visit", "visited", "visiting", "visits"],
      correct: 2,
      explanation: "The phrase 'look forward to' is followed by a gerund (-ing form): 'visiting'."
    },
    {
      id: 23,
      question: "Choose the correctly spelled English word:",
      options: ["Acommodate", "Accommodate", "Accomodate", "Acomodate"],
      correct: 1,
      explanation: "'Accommodate' has double 'c' and double 'm' (يستوعب / يوفر إقامة)."
    },
    {
      id: 24,
      question: "What is the meaning of the word 'Meticulous'?",
      options: ["Careless and messy", "Showing great attention to detail", "Angry and violent", "Very loud"],
      correct: 1,
      explanation: "'Meticulous' means very careful and precise with details (دقيق وحريص للغاية)."
    },
    {
      id: 25,
      question: "Select the correct relative pronoun: 'This is the student ___ project won first place.'",
      options: ["who", "whom", "whose", "which"],
      correct: 2,
      explanation: "'Whose' indicates possession (الذي مشروعه فاز بالمركز الأول)."
    },
    {
      id: 26,
      question: "What does the phrasal verb 'Give up' mean?",
      options: ["To start something new", "To quit or surrender", "To donate money", "To increase speed"],
      correct: 1,
      explanation: "'Give up' means to stop trying or surrender (يستسلم / يتوقف عن المحاولة)."
    },
    {
      id: 27,
      question: "Select the correct question tag: 'They haven't finished the assignment yet, ___?'",
      options: ["have they", "haven't they", "did they", "do they"],
      correct: 0,
      explanation: "A negative statement with 'haven't' takes a positive tag: 'have they?'."
    },
    {
      id: 28,
      question: "Choose the correct quantifier: 'There are only a ___ tickets left for the concert.'",
      options: ["little", "few", "much", "any"],
      correct: 1,
      explanation: "'A few' is used with countable plural nouns like 'tickets' (بضع تذاكر قليلة)."
    },
    {
      id: 29,
      question: "Complete the idiom: 'Hit the ___' (meaning to go to sleep).",
      options: ["wall", "sack", "road", "books"],
      correct: 1,
      explanation: "'Hit the sack' or 'hit the hay' is an English idiom meaning to go to bed/sleep (الخلود إلى النوم)."
    },
    {
      id: 30,
      question: "What does 'Hit the books' mean?",
      options: ["To throw books", "To buy new books", "To study intensely", "To write a story"],
      correct: 2,
      explanation: "'Hit the books' is a common idiom meaning to begin studying hard (البدء في الدراسة بجدية)."
    }
  ];

  const handleNotRankedAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const currentQ = notRankedQuestions[currentQuestionIndex];
    if (index === currentQ.correct) {
      setNotRankedScore((prev) => prev + 100);
      setNotRankedStreak((prev) => prev + 1);
      onNotify?.('Correct answer! 🎉');
    } else {
      setNotRankedStreak(0);
      onNotify?.('Incorrect answer. Keep learning!');
    }
  };

  const handleNextNotRanked = () => {
    if (currentQuestionIndex + 1 < notRankedQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setNotRankedGameOver(true);
    }
  };

  return (
    <div className={`flex-1 flex flex-col bg-[#161b22] border border-[#30363d] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl min-h-0 relative overflow-hidden ${isInExam ? 'select-none' : ''}`}>
      
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#30363d] mb-4 shrink-0 gap-3 z-10">
        <div className="flex items-center gap-3">
          {gameMode !== 'select' ? (
            <button
              type="button"
              disabled={isInExam}
              onClick={() => {
                if (isInExam) {
                  onNotify?.('🔒 الاختبار جارٍ حالياً! لا يمكنك الخروج حتى إنهاء الاختبار.');
                  return;
                }
                setGameMode('select');
                setRankedState('intro');
              }}
              className={`p-2 sm:px-4 sm:py-2 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-semibold ${
                isInExam
                  ? 'bg-[#161b22] border-rose-500/50 text-rose-300 opacity-70 cursor-not-allowed'
                  : 'bg-[#0d1117] hover:bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white cursor-pointer'
              }`}
            >
              {isInExam ? <Lock className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isInExam ? 'مغلق أثناء الاختبار' : 'Back to Games Hub'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="p-2 sm:px-4 sm:py-2 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Space_Grotesk'] font-bold text-white text-base sm:text-lg">
                {gameMode === 'select' && 'English Games Arena'}
                {gameMode === 'ranked' && '🔥 Ranked Competitive Duel'}
                {gameMode === 'not-ranked' && '🌱 Not-Ranked Practice Mode'}
              </h2>
              <p className="text-xs text-[#8b949e]">
                {gameMode === 'select' && 'Choose between Ranked 1v1 Matches or Relaxed Practice'}
                {gameMode === 'ranked' && `Round ${currentRound} of 5 — 1v1 Battle Arena`}
                {gameMode === 'not-ranked' && 'Stress-free grammar and vocabulary training'}
              </p>
            </div>
          </div>
        </div>

        {gameMode === 'ranked' && rankedState === 'playing' && (
          <div className="flex items-center gap-3 bg-[#0d1117] border border-[#30363d] px-4 py-2 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
              <span>{currentUser}: {myScore}</span>
            </div>
            <div className="w-[1px] h-4 bg-[#30363d]" />
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">
              <span>{opponent?.name || 'Opponent'}: {opponentScore}</span>
            </div>
          </div>
        )}
      </div>

      {/* Exam lockdown notification banner */}
      {isInExam && (
        <div className="w-full mb-5 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between gap-3 text-xs text-rose-200 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
              <Lock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-rose-300">🔒 وضع حماية الاختبار نشط (Exam Mode Active):</span>
              <span className="text-rose-200/90 ml-1.5 hidden sm:inline">
                تم قفل ميزات الموقع ومنع نسخ النصوص لضمان نزاهة الامتحان.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-900/60 border border-rose-500/40 text-[10px] font-mono text-rose-300 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Lock className="w-3 h-3 text-rose-400" />
            <span>Locked</span>
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 z-10 overflow-y-auto">
        
        {/* GAME MODE SELECTION */}
        {gameMode === 'select' && (
          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 py-6 animate-in fade-in-50 duration-300">
            
            {/* Ranked Games Card */}
            <div
              onClick={() => {
                setGameMode('ranked');
                setRankedState('intro');
              }}
              className="group relative rounded-3xl bg-gradient-to-br from-[#1f242c] to-[#141923] hover:from-[#222833] hover:to-[#181f2c] border border-amber-500/30 hover:border-amber-400 p-7 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-950/40 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 transition-transform shadow-inner">
                  <Trophy className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-['Space_Grotesk'] font-extrabold text-xl text-white tracking-tight">
                    RANKED GAMES
                  </h3>
                  <span className="text-[10px] font-black tracking-widest text-amber-300 bg-amber-950/80 border border-amber-700/80 px-2.5 py-1 rounded-full uppercase">
                    Competitive ⚡
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#8b949e] leading-relaxed mb-6">
                  Competitive 1v1 English duel consisting of 5 exciting rounds. Test your speed, memory, and writing skills against online rivals!
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-[#30363d]/80 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                <span>Start Ranked Match</span>
                <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Not-Ranked Games Card */}
            <div
              onClick={() => {
                setGameMode('not-ranked');
                setCurrentQuestionIndex(0);
                setSelectedOption(null);
                setIsAnswered(false);
                setNotRankedScore(0);
                setNotRankedStreak(0);
                setNotRankedGameOver(false);
              }}
              className="group relative rounded-3xl bg-gradient-to-br from-[#1f242c] to-[#141923] hover:from-[#222833] hover:to-[#181f2c] border border-emerald-500/30 hover:border-emerald-400 p-7 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/40 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform shadow-inner">
                  <Gamepad2 className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-['Space_Grotesk'] font-extrabold text-xl text-white tracking-tight">
                    NOT-RANKED GAMES
                  </h3>
                  <span className="text-[10px] font-black tracking-widest text-emerald-300 bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-1 rounded-full uppercase">
                    Practice 🌱
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#8b949e] leading-relaxed mb-6">
                  Relaxed, pressure-free English vocabulary and grammar training. Take your time to review detailed explanations for every answer.
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-[#30363d]/80 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                <span>Start Practice Session</span>
                <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        )}

        {/* RANKED GAME FLOW */}
        {gameMode === 'ranked' && (
          <div className="w-full max-w-2xl relative">
            
            {/* 1. INTRO FORM WITH BLUR OVERLAY */}
            {rankedState === 'intro' && (
              <div className="bg-[#1f242c] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 mx-auto mb-3">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <h3 className="font-['Space_Grotesk'] font-extrabold text-xl sm:text-2xl text-white">
                      Ranked Match Rules & Overview
                    </h3>
                    <p className="text-xs text-[#8b949e] leading-relaxed max-w-lg mx-auto">
                      Ranked means two students compete in a 1v1 duel consisting of 5 challenging rounds of English skills.
                    </p>
                  </div>

                  <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 text-xs text-[#c9d1d9] space-y-3 leading-relaxed">
                    <p>
                      <strong className="text-amber-400 font-semibold">EN:</strong> Ranked match means two students will engage in a duel consisting of 5 rounds. Students will solve 5 questions from different types. For example: A word will appear for the student to memorize within 10 seconds, then write it correctly with correct spelling, and the first student to finish correctly wins the round. Or each writes an essay on a given topic, and the first to submit the best and most accurate expression wins the round, and many more duels!
                    </p>
                    <hr className="border-[#30363d]" />
                    <p className="text-right font-arabic" dir="rtl">
                      <strong className="text-emerald-400 font-semibold">عربي:</strong> مباراة مصنفة تعني أن طالبين سوف يخوضون مباراة تبارز في ما بينهما تتألف من 5 جولات. سوف يقوم الطلاب بحل 5 أسئلة من أنواع مختلفة، مثل تذكر الكلمات وكتابتها بدقة، كتابة التعبيرات، وتحديات القواعد والمفردات.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setGameMode('select')}
                      className="flex-1 py-3 bg-[#0d1117] hover:bg-[#252b35] border border-[#30363d] text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Leave the game - back to dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRankedState('matching');
                        setMatchingTimer(0);
                      }}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Start play</span>
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MATCHMAKING SCREEN */}
            {rankedState === 'matching' && (
              <div className="bg-[#1f242c] border border-teal-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
                <div className="space-y-1">
                  <h3 className="font-['Space_Grotesk'] font-extrabold text-xl text-white">
                    Finding Your Opponent... | جاري البحث عن منافس...
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    Filtering online students currently in ranked queue...
                  </p>
                </div>

                {/* Progress bar towards 60s timeout */}
                <div className="max-w-xs mx-auto space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#8b949e]">
                    <span className="flex items-center gap-1 text-teal-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{matchingTimer}s / 60s</span>
                    </span>
                    <span className="text-rose-400 font-semibold">
                      إلغاء تلقائي بعد: {Math.max(0, 60 - matchingTimer)} ثانية
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 via-amber-500 to-rose-500 transition-all duration-1000"
                      style={{ width: `${Math.min(100, (matchingTimer / 60) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 py-2">
                  {/* My Card */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 overflow-hidden flex items-center justify-center text-teal-300 font-bold text-xl">
                      {userAvatar ? (
                        <img src={userAvatar} alt={studentName} className="w-full h-full object-cover" />
                      ) : (
                        studentName.charAt(0)
                      )}
                    </div>
                    <span className="font-bold text-white text-xs">{studentName}</span>
                    <span className="text-[10px] text-teal-400">@{currentUser}</span>
                  </div>

                  {/* VS */}
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-extrabold text-sm animate-pulse">
                    VS
                  </div>

                  {/* Opponent Card */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 overflow-hidden flex items-center justify-center text-rose-300 font-bold text-xl">
                      {opponent ? (
                        opponent.name.charAt(0)
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
                      )}
                    </div>
                    <span className="font-bold text-white text-xs">{opponent ? opponent.name : 'Searching...'}</span>
                    <span className="text-[10px] text-rose-400">{opponent ? `@${opponent.username}` : `(${matchingTimer}s)`}</span>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] py-2 px-4 rounded-xl text-xs text-teal-300 inline-block font-mono animate-pulse">
                  {opponent ? 'Match found! Preparing battle cards...' : 'Looking for online players in queue...'}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      fetch('/api/ranked/leave', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentUser })
                      }).catch(() => {});
                      setMatchingTimer(0);
                      setRankedState('intro');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#0d1117] hover:bg-rose-950/40 border border-[#30363d] hover:border-rose-500/60 text-xs font-bold text-[#8b949e] hover:text-rose-300 transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
                  >
                    <X className="w-4 h-4" />
                    <span>إلغاء البحث / Cancel Matchmaking</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2.1 MATCHMAKING FORCED TIMEOUT FORM (After 60s) */}
            {rankedState === 'matching-timeout' && (
              <div className="w-full max-w-xl mx-auto bg-[#1f242c] border-2 border-rose-500/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
                  <Clock className="w-8 h-8 text-rose-400 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>انتهت مهلة التوفيق الجبري (أكثر من دقيقة)</span>
                  </div>
                  <h3 className="font-['Space_Grotesk'] font-extrabold text-xl sm:text-2xl text-white">
                    إنهاء التوفيق الجبري / Matchmaking Aborted
                  </h3>
                </div>

                {/* Form Notice Box with exact requested Arabic & English texts */}
                <div className="bg-[#141922] border border-[#30363d] rounded-2xl p-5 text-left space-y-3 shadow-inner">
                  <div className="flex items-start gap-3 text-right rtl">
                    <span className="text-xl shrink-0">⚠️</span>
                    <p className="text-sm font-semibold text-rose-200 leading-relaxed font-sans">
                      لقد مر أكثر من دقيقه دون أي يظهر أي مبارز في ما يعني أن لا يوجد احد يريد لعب ranked
                    </p>
                  </div>

                  <div className="h-px bg-[#30363d] my-1" />

                  <div className="flex items-start gap-3 text-left ltr">
                    <span className="text-xl shrink-0">🌐</span>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      More than a minute has passed without an opponent appearing, which means no one is currently looking to play ranked.
                    </p>
                  </div>
                </div>

                {/* Action Suggestions */}
                <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs text-[#8b949e] leading-relaxed text-right rtl space-y-1">
                  <p className="text-teal-400 font-semibold">💡 ماذا يمكنك أن تفعل الآن؟</p>
                  <p>• إعادة البحث مجدداً فقد يدخل طالب جديد في هذه اللحظة.</p>
                  <p>• فتح الدردشة ودعوة أحد زملائك للمنافسة في الـ Ranked سوياً.</p>
                  <p>• التدرب الفردي في النمط غير المصنف (Not-Ranked Practice).</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchingTimer(0);
                      setRankedState('matching');
                    }}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-950/60 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>إعادة البحث عن منافس / Try Again</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGameMode('select');
                      setRankedState('intro');
                      setMatchingTimer(0);
                    }}
                    className="flex-1 py-3 px-4 bg-[#161b22] hover:bg-[#252b35] border border-[#30363d] text-[#8b949e] hover:text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>العودة لقائمة الألعاب / Games Menu</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2.5 FACE-OFF CV COMPARISON SCREEN (4 Seconds) */}
            {rankedState === 'face-off' && (
              <div className="w-full max-w-2xl bg-[#1f242c] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                    <Swords className="w-4 h-4" />
                    <span>MATCH FOUND! READY FOR FACE-OFF</span>
                  </div>
                  <h2 className="font-['Space_Grotesk'] font-extrabold text-2xl sm:text-3xl text-white">
                    ⚔️ تم العثور على منافس! بطاقات التحدي (CV)
                  </h2>
                  <p className="text-xs text-[#8b949e]">
                    معاينة بطاقات المتحديين! تبدأ المبارزة التنافسية فوراً عند انتهاء العداد...
                  </p>
                </div>

                {/* Countdown Badge */}
                <div className="inline-flex items-center justify-center gap-3 bg-[#0d1117] border border-amber-500/40 rounded-2xl px-6 py-3 shadow-lg">
                  <Timer className="w-5 h-5 text-amber-400 animate-spin" />
                  <span className="font-['Space_Grotesk'] font-extrabold text-base sm:text-lg text-white">
                    تبدأ المباراة خلال <span className="text-amber-400 text-2xl mx-1 font-mono">{faceOffTimer}</span> ثوانٍ...
                  </span>
                </div>

                {/* VS Battle Cards / CV Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center pt-2">
                  
                  {/* Player 1 Card (You) */}
                  <div className="md:col-span-3 bg-gradient-to-b from-[#141a22] to-[#0d1117] border-2 border-teal-500/60 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-xl group">
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/10 rounded-full blur-xl" />
                    <div className="inline-block bg-teal-950/80 border border-teal-500/40 text-teal-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      Your Player CV / بطاقتك الشخصية
                    </div>
                    
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 p-0.5 shadow-lg">
                      {userAvatar ? (
                        <img src={userAvatar} alt="You" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="w-full h-full bg-[#161b22] rounded-2xl flex items-center justify-center text-teal-300 font-extrabold text-xl">
                          {studentName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-['Space_Grotesk'] font-extrabold text-base text-white">
                        {studentName}
                      </h4>
                      <span className="text-[11px] text-teal-400 font-mono">@{currentUser}</span>
                    </div>

                    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 text-xs space-y-1 text-right">
                      <div className="flex items-center justify-between text-[#8b949e]">
                        <span>اللقب:</span>
                        <span className="font-bold text-teal-300">🔥 المتحدي الأول</span>
                      </div>
                      <div className="flex items-center justify-between text-[#8b949e]">
                        <span>النقاط:</span>
                        <span className="font-bold text-white">{myScore} pts</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg py-1 font-bold">
                      🟢 متصل وجاهز للمواجهة
                    </div>
                  </div>

                  {/* VS Emblem */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center my-2 md:my-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-rose-600 p-0.5 shadow-2xl shadow-rose-900/80 animate-bounce">
                      <div className="w-full h-full bg-[#0d1117] rounded-full flex items-center justify-center text-amber-400 font-extrabold text-sm italic border border-amber-400/40">
                        VS
                      </div>
                    </div>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-1">1v1 Duel</span>
                  </div>

                  {/* Player 2 Card (Opponent) */}
                  <div className="md:col-span-3 bg-gradient-to-b from-[#141a22] to-[#0d1117] border-2 border-rose-500/60 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-xl group">
                    <div className="absolute -top-12 -left-12 w-24 h-24 bg-rose-500/10 rounded-full blur-xl" />
                    <div className="inline-block bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      Opponent CV / بطاقة المنافس
                    </div>
                    
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 shadow-lg">
                      {opponent?.avatar ? (
                        <img src={opponent.avatar} alt="Opponent" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="w-full h-full bg-[#161b22] rounded-2xl flex items-center justify-center text-rose-300 font-extrabold text-xl">
                          {opponent?.name?.charAt(0) || 'O'}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-['Space_Grotesk'] font-extrabold text-base text-white">
                        {opponent?.name || 'Opponent'}
                      </h4>
                      <span className="text-[11px] text-rose-400 font-mono">@{opponent?.username || 'rival'}</span>
                    </div>

                    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 text-xs space-y-1 text-right">
                      <div className="flex items-center justify-between text-[#8b949e]">
                        <span>اللقب:</span>
                        <span className="font-bold text-rose-300">⚡ منافس مباشر</span>
                      </div>
                      <div className="flex items-center justify-between text-[#8b949e]">
                        <span>النقاط:</span>
                        <span className="font-bold text-white">{opponentScore} pts</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded-lg py-1 font-bold">
                      🔴 تم قفل الاقتران - أونلاين
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 3. PLAYING ROUNDS */}
            {rankedState === 'playing' && (() => {
              const roundInfo = getRoundInfo(roundType);
              return (
              <div className="bg-[#1f242c] border border-[#30363d] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 select-none">
                
                {/* Anti-Cheat & Question Protection Status Bar */}
                <div className="flex items-center justify-between bg-gradient-to-r from-rose-950/60 via-red-950/40 to-rose-950/60 border border-rose-500/40 rounded-xl px-3.5 py-1.5 text-[11px] text-rose-200 shadow-sm">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                    <span>🛡️ نظام حماية النزاهة نشط (Anti-Cheat & Anti-Screenshot Active)</span>
                  </div>
                  <span className="text-[10px] text-rose-300/90 font-mono hidden sm:inline">
                    🚫 لقطات الشاشة محظورة • ⚠️ حسم 7 نقاط عند مغادرة التبويب
                  </span>
                </div>

                {/* Round Progress Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#30363d] gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Round {currentRound} of 5
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[11px] font-bold text-amber-300">
                      {roundInfo.badge}
                    </span>
                  </div>
                  <span className="text-xs text-[#8b949e]">
                    Scores — You: {myScore} | {opponent?.name || 'Opponent'}: {opponentScore}
                  </span>
                </div>

                {roundIntroTimeLeft > 0 ? (
                  <div className="text-center py-8 sm:py-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-400/10 rounded-full border border-amber-400/20">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                        Upcoming: Round {currentRound} of 5 • {roundInfo.badge}
                      </span>
                    </div>
                    
                    <div className="space-y-4 max-w-lg mx-auto">
                      <div className="space-y-1">
                        <h3 className="font-['Space_Grotesk'] font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                          {roundInfo.titleEn}
                        </h3>
                        <p className="text-sm sm:text-base font-bold text-amber-400">
                          {roundInfo.titleAr}
                        </p>
                      </div>

                      {/* Instructions in English */}
                      <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed bg-[#0d1117]/80 border border-[#30363d] rounded-xl p-3">
                        <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider mb-1">Round Objective</span>
                        {roundInfo.descEn}
                      </p>

                      {/* Instructions in Arabic */}
                      <div className="bg-teal-950/60 border border-teal-500/40 rounded-xl p-3.5 text-right space-y-1 shadow-inner">
                        <div className="flex items-center justify-end gap-1.5 text-teal-300 text-xs font-bold">
                          <span>💡 الشرح وطريقة الجولة بالعربية:</span>
                        </div>
                        <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
                          {roundInfo.descAr}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="relative w-20 h-20 flex items-center justify-center bg-slate-800/40 border border-slate-700 rounded-full">
                        <span className="text-3xl font-['Space_Grotesk'] font-extrabold text-teal-400 animate-ping absolute">
                          {roundIntroTimeLeft}
                        </span>
                        <span className="text-3xl font-['Space_Grotesk'] font-extrabold text-teal-300 z-10">
                          {roundIntroTimeLeft}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Battle starts in...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ROUND TYPE A: MEMORIZE & SPELL */}
                    {roundType === 'memorize' && (
                      <div className="space-y-5">
                        {showMemorizeCard ? (
                          <div className="text-center py-8 bg-[#0d1117] border border-amber-500/40 rounded-2xl space-y-4 animate-in fade-in">
                            <span className="text-xs text-amber-400 font-semibold uppercase tracking-widest block">
                              Memorize this word ({memorizeTimeLeft}s)
                            </span>
                            <div className="font-['Space_Grotesk'] font-extrabold text-3xl sm:text-4xl text-white tracking-wider">
                              {targetWord}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-[#8b949e]">
                                The word will disappear soon. Get ready to type it correctly!
                              </p>
                              <div className="inline-block bg-teal-950/80 border border-teal-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-teal-300">
                                💡 التلميح بالعربية: احفظ الكلمة الجليلة جيداً قبل اختفائها، ثم أعد كتابتها بدقة بالإنجليزية دون أخطاء!
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="text-xs font-bold text-teal-300 block">
                                  Type the word you memorized:
                                </label>
                                <span className="text-[11px] text-teal-200/80 block">
                                  💡 اكتب الكلمة الإنجليزية التي حفظتها للتو بدقة هجائية
                                </span>
                              </div>
                              {!submittedLocally && (
                                <span className="text-xs font-mono text-rose-400 font-bold animate-pulse shrink-0">
                                  ⏱️ {roundTimer}s remaining
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={typeAnswer}
                              onChange={(e) => setTypeAnswer(e.target.value)}
                              disabled={submittedLocally}
                              readOnly={submittedLocally}
                              placeholder="Type exact spelling..."
                              className={`w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-sm text-white outline-none transition-all ${
                                submittedLocally
                                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200 cursor-not-allowed opacity-90'
                                  : 'border-[#30363d] focus:border-teal-500'
                              }`}
                              autoFocus={!submittedLocally}
                            />
                            {!submittedLocally ? (
                              <button
                                type="button"
                                onClick={() => evaluateRoundResult(typeAnswer.trim().toLowerCase() === targetWord.toLowerCase())}
                                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Send className="w-4 h-4" />
                                <span>Submit Answer</span>
                              </button>
                            ) : (
                              <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                    ✓
                                  </div>
                                  <div className="space-y-0.5 text-left">
                                    <h5 className="text-xs font-bold text-emerald-300">تم تقديم التسليم بنجاح!</h5>
                                    <p className="text-[11px] text-emerald-200/80">في انتظار زميلك للإنتهاء من التسليم...</p>
                                  </div>
                                </div>
                                <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin shrink-0" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROUND TYPE B: ESSAY WRITING */}
                    {roundType === 'essay' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-[#0d1117] border border-indigo-500/40 rounded-2xl space-y-2">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                            Writing Prompt {essayTimeLeft > 0 ? `(Starts in ${essayTimeLeft}s)` : ''}
                          </span>
                          <h4 className="font-['Space_Grotesk'] font-bold text-white text-sm sm:text-base">
                            {essayTopic}
                          </h4>
                          <div className="pt-1">
                            <span className="inline-block bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-lg text-xs font-bold text-indigo-300">
                              {getArabicTopicHint(essayTopic)}
                            </span>
                          </div>
                        </div>

                        {essayTimeLeft === 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-[#8b949e]">
                              <div>
                                <span className="block">Write your response (AI evaluation active):</span>
                                <span className="text-[11px] text-indigo-300/80 block">💡 اكتب تعبيرك باللغة الإنجليزية وسيقوم الذكاء الاصطناعي بتقييمه فوراً</span>
                              </div>
                              {!submittedLocally && (
                                <span className="text-amber-400 font-mono font-bold shrink-0">⏱️ {writingTimeLeft}s</span>
                              )}
                            </div>
                            <textarea
                              rows={4}
                              value={essayText}
                              onChange={(e) => setEssayText(e.target.value)}
                              disabled={submittedLocally}
                              readOnly={submittedLocally}
                              placeholder="Type your essay expression here..."
                              className={`w-full bg-[#0d1117] border rounded-xl p-4 text-xs sm:text-sm text-white outline-none resize-none transition-all ${
                                submittedLocally
                                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200 cursor-not-allowed opacity-90 font-mono'
                                  : 'border-[#30363d] focus:border-indigo-500'
                              }`}
                              autoFocus={!submittedLocally}
                            />
                            {!submittedLocally ? (
                              <button
                                type="button"
                                onClick={evaluateEssayResult}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Send className="w-4 h-4" />
                                <span>Submit Essay</span>
                              </button>
                            ) : (
                              <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                    ✓
                                  </div>
                                  <div className="space-y-0.5 text-left">
                                    <h5 className="text-xs font-bold text-emerald-300">تم تقديم التسليم بنجاح!</h5>
                                    <p className="text-[11px] text-emerald-200/80">في انتظار زميلك للإنتهاء من التسليم...</p>
                                  </div>
                                </div>
                                <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin shrink-0" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-amber-400 font-mono animate-pulse">
                            Get ready to write...
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROUND TYPE C: GUESS OBJECT */}
                    {roundType === 'guess' && (() => {
                      const item = parseGuessItem(guessImage);
                      return (
                        <div className="space-y-4">
                          <div className="p-5 bg-[#0d1117] border border-emerald-500/40 rounded-2xl text-center space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>{item?.emoji || '🖼️'}</span>
                                <span>خمن اسم الشيء بالإنجليزية / Identify Object</span>
                              </span>
                              {!submittedLocally && (
                                <span className="text-xs font-mono text-rose-400 font-bold animate-pulse">
                                  ⏱️ {guessTimer}s remaining
                                </span>
                              )}
                            </div>

                            {item?.imageUrl ? (
                              <div className="relative w-full max-w-sm mx-auto h-48 rounded-2xl overflow-hidden border border-emerald-500/30 bg-black/40 shadow-inner group">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute top-2.5 right-2.5 bg-black/80 border border-emerald-500/30 px-3 py-1 rounded-full text-base">
                                  {item.emoji}
                                </div>
                              </div>
                            ) : (
                              <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-300 mx-auto text-4xl">
                                {item?.emoji || '🖼️'}
                              </div>
                            )}

                            <div className="space-y-1.5 pt-1">
                              {item?.arabicHint && (
                                <div className="inline-block bg-emerald-950/80 border border-emerald-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-emerald-300 shadow-sm">
                                  💡 التلميح بالعربية: {item.arabicHint}
                                </div>
                              )}
                              <p className="text-xs text-[#c9d1d9] italic block">
                                "{item?.englishHint || 'Type the English word for this object.'}"
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="text"
                              value={guessAnswer}
                              onChange={(e) => setGuessAnswer(e.target.value)}
                              disabled={submittedLocally}
                              readOnly={submittedLocally}
                              placeholder="اكتب بالإنجليزية (مثلاً: Book, Airplane, Refrigerator...)"
                              className={`w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-sm text-white outline-none transition-all ${
                                submittedLocally
                                  ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-200 cursor-not-allowed opacity-90'
                                  : 'border-[#30363d] focus:border-emerald-500'
                              }`}
                              autoFocus={!submittedLocally}
                            />
                            {!submittedLocally ? (
                              <button
                                type="button"
                                onClick={() => evaluateRoundResult(checkGuessMatch(guessAnswer, guessImage), guessAnswer)}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Send className="w-4 h-4" />
                                <span>إرسال الإجابة / Submit Answer</span>
                              </button>
                            ) : (
                              <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                    ✓
                                  </div>
                                  <div className="space-y-0.5 text-left">
                                    <h5 className="text-xs font-bold text-emerald-300">تم إرسال إجابتك بنجاح!</h5>
                                    <p className="text-[11px] text-emerald-200/80">جار الحسم أو إجابة الزميل...</p>
                                  </div>
                                </div>
                                <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin shrink-0" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ROUND TYPE D & E: GRAMMAR & VOCAB */}
                    {(roundType === 'grammar' || roundType === 'vocab') && (
                      <div className="space-y-4">
                        <div className="p-5 bg-[#0d1117] border border-teal-500/40 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
                              {roundType === 'grammar' ? 'Grammar Challenge / تحدي القواعد' : 'Vocabulary Challenge / تحدي المفردات'}
                            </span>
                            {!submittedLocally && (
                              <span className="text-xs font-mono text-rose-400 font-bold animate-pulse">
                                ⏱️ {guessTimer}s remaining
                              </span>
                            )}
                          </div>
                          <h4 className="font-['Space_Grotesk'] font-bold text-white text-sm">
                            {question || (roundType === 'grammar' ? "Choose the correct verb tense: 'She ___ to London yesterday.'" : "What is the synonym of 'Enthusiastic'?")}
                          </h4>
                          <div>
                            <span className="inline-block bg-teal-950/80 border border-teal-500/40 px-3.5 py-1 rounded-full text-xs font-bold text-teal-300">
                              {getGrammarArabicHint(question, roundType)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            {(options.length > 0 ? options : (roundType === 'grammar' ? ['Go', 'Went', 'Gone', 'Going'] : ['Indifferent', 'Passionate', 'Apathetic', 'Sleepy'])).map((opt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                disabled={submittedLocally}
                                onClick={() => evaluateRoundResult(idx === (correctIndex !== -1 ? correctIndex : 1), opt)}
                                className={`p-3 rounded-xl border text-xs font-semibold transition-all text-left ${
                                  submittedLocally
                                    ? 'bg-[#161b22] border-slate-700/60 text-slate-400 cursor-not-allowed opacity-75'
                                    : 'bg-[#1c2128] hover:bg-teal-950/40 border-[#30363d] hover:border-teal-500 text-white cursor-pointer'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {submittedLocally && (
                            <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 animate-in fade-in mt-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                  ✓
                                </div>
                                <div className="space-y-0.5 text-left">
                                  <h5 className="text-xs font-bold text-emerald-300">تم تقديم التسليم بنجاح!</h5>
                                  <p className="text-[11px] text-emerald-200/80">في انتظار زميلك للإنتهاء من التسليم...</p>
                                </div>
                              </div>
                              <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin shrink-0" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
              );
            })()}

            {/* 4. ROUND RESULT MODAL / SCREEN */}
            {rankedState === 'round-result' && (
              <div className="bg-[#1f242c] border border-amber-500/40 rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner ${
                  roundWinner === 'me' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' :
                  roundWinner === 'opponent' ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400' :
                  'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                }`}>
                  <Trophy className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-['Space_Grotesk'] font-extrabold text-2xl text-white">
                    {roundWinner === 'me' ? 'BOOYAH! Round Won! 🎉' :
                     roundWinner === 'opponent' ? 'Round Lost! Keep pushing!' :
                     'Round Draw! 🤝 (تعادل في الجولة)'}
                  </h3>
                  <p className="text-xs text-[#8b949e]">
                    {roundWinner === 'me' ? 'You answered faster and more accurately than your opponent.' :
                     roundWinner === 'opponent' ? 'Your opponent secured this round. Get ready for the next!' :
                     'لم يقم أي من الطالبين بحل السؤال بشكل صحيح (أو تساوت الإجابات) — انتهت الجولة بالتعادل دون احتساب نقاط.'}
                  </p>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">Your Score</span>
                    <span className="font-['Space_Grotesk'] font-extrabold text-2xl text-amber-400">{myScore}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-[#30363d]" />
                  <div>
                    <span className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">{opponent?.name || 'Opponent'}</span>
                    <span className="font-['Space_Grotesk'] font-extrabold text-2xl text-rose-400">{opponentScore}</span>
                  </div>
                </div>

                {/* Automatic 5-second countdown to next round (no click required) */}
                <div className="bg-[#0d1117] border border-teal-500/40 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-extrabold text-lg shrink-0">
                      {roundResultCountdown}s
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>الانتقال التلقائي للجولة التالية خلال {roundResultCountdown} ثوانٍ...</span>
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping shrink-0" />
                      </h4>
                      <p className="text-[11px] text-[#8b949e]">
                        لا داعي للضغط على أي زر، ستبدأ الجولة التالية تلقائياً بعد 5 ثوانٍ
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">Auto-Next</span>
                    <span className="text-xs font-mono font-bold text-teal-200">{roundResultCountdown}s</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextRoundOrFinish}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {currentRound < 5
                      ? `الانتقال الآن وتخطي الانتظار (${roundResultCountdown}s) / Skip Wait`
                      : `عرض النتيجة النهائية (${roundResultCountdown}s)`}
                  </span>
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            )}

            {/* 5. GAME OVER RESULT SCREEN WITH EXP & HONOR REWARDS */}
            {rankedState === 'game-over' && (() => {
              const isWin = myScore > opponentScore;
              const isLoss = opponentScore > myScore;
              const isDraw = myScore === opponentScore;

              const effectiveExpChange = matchReward?.expChange !== undefined
                ? matchReward.expChange
                : isWin ? 70 : isLoss ? -20 : 10;

              const effectiveHonorChange = matchReward?.honorChange !== undefined
                ? matchReward.honorChange
                : 0;

              const effectiveWarning = matchReward?.warning || (isLoss && effectiveHonorChange < 0
                ? '⚠️ EXP Depleted (0 EXP): 3 points have been deducted from your Honor rating!'
                : '');

              return (
                <div className={`border rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300 space-y-6 ${
                  isWin
                    ? 'bg-[#15231e] border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-emerald-950/40'
                    : isLoss
                    ? 'bg-[#25171a] border-rose-500/60 ring-1 ring-rose-500/40 shadow-rose-950/40'
                    : 'bg-[#181d28] border-indigo-500/60 ring-1 ring-indigo-500/40'
                }`}>
                  {/* Icon Badge */}
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner ${
                    isWin
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : isLoss
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                      : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400'
                  }`}>
                    {isWin ? (
                      <Trophy className="w-10 h-10 animate-bounce" />
                    ) : isLoss ? (
                      <TrendingDown className="w-10 h-10 text-rose-400 animate-pulse" />
                    ) : (
                      <Award className="w-10 h-10 text-indigo-400" />
                    )}
                  </div>

                  {/* Outcome Heading */}
                  <div className="space-y-1.5">
                    <h3 className={`font-['Space_Grotesk'] font-black text-2xl sm:text-3xl tracking-tight ${
                      isWin ? 'text-emerald-300' : isLoss ? 'text-rose-300' : 'text-indigo-300'
                    }`}>
                      {isWin
                        ? '🏆 BOOYAH! Victory in Ranked Match!'
                        : isDraw
                        ? '🤝 Epic Match Draw!'
                        : '💔 Match Finished! Good Effort!'}
                    </h3>
                    <p className="text-xs text-[#8b949e]">
                      {isWin
                        ? `You outperformed your opponent in 5 intense rounds against ${opponent?.name || 'Opponent'}!`
                        : isDraw
                        ? `A hard-fought tie match against ${opponent?.name || 'Opponent'}!`
                        : `Great effort and learning experience against ${opponent?.name || 'Opponent'}!`}
                    </p>
                  </div>

                  {/* Final Score Board */}
                  <div className="bg-[#0d1117]/80 border border-[#30363d] rounded-2xl p-4 flex items-center justify-around shadow-inner">
                    <div className="text-center">
                      <span className="text-[10px] text-teal-400 uppercase font-black tracking-wider block mb-1">
                        You ({studentName})
                      </span>
                      <span className="font-['Space_Grotesk'] font-extrabold text-3xl text-white">
                        {myScore}
                      </span>
                    </div>
                    <div className="text-center font-bold text-xs text-[#8b949e] uppercase">
                      VS
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-indigo-400 uppercase font-black tracking-wider block mb-1">
                        {opponent?.name || 'Opponent'}
                      </span>
                      <span className="font-['Space_Grotesk'] font-extrabold text-3xl text-white">
                        {opponentScore}
                      </span>
                    </div>
                  </div>

                  {/* EXP & RANK REWARD CARD */}
                  <div className={`p-4 rounded-2xl border shadow-inner text-left space-y-3 ${
                    isWin
                      ? 'bg-emerald-950/40 border-emerald-500/50'
                      : isLoss
                      ? 'bg-rose-950/40 border-rose-500/50'
                      : 'bg-indigo-950/40 border-indigo-500/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-5 h-5 ${isWin ? 'text-amber-400 animate-pulse' : isLoss ? 'text-rose-400' : 'text-indigo-400'}`} />
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          Ranked Match Rewards
                        </span>
                      </div>

                      {/* Main EXP Badge & Honor Bonus Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isWin && matchReward && matchReward.honorChange > 0 && (
                          <div className="px-2.5 py-1 rounded-full font-mono font-black text-xs bg-amber-400 text-black flex items-center gap-1 shadow-md animate-bounce">
                            <Shield className="w-3 h-3 text-emerald-800 shrink-0" />
                            <span>+1 HONOR 🛡️</span>
                          </div>
                        )}
                        <div className={`px-3 py-1 rounded-full font-mono font-black text-sm flex items-center gap-1 shadow-md ${
                          effectiveExpChange > 0
                            ? 'bg-emerald-500 text-black animate-pulse'
                            : effectiveExpChange < 0
                            ? 'bg-rose-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}>
                          {effectiveExpChange > 0 ? `+${effectiveExpChange} EXP 🎉` : `${effectiveExpChange} EXP`}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-[#c9d1d9] leading-relaxed">
                      {/* CHEATING FORFEIT PENALTY SPECIAL CARD */}
                      {(isCheatForfeit || (matchReward && matchReward.honorChange === -7) || (matchReward?.warning && matchReward.warning.includes('CHEATING'))) ? (
                        <div className="bg-gradient-to-br from-rose-950/90 to-red-950/80 border-2 border-rose-500 rounded-2xl p-4 text-left space-y-3 shadow-xl ring-1 ring-rose-500/50">
                          <div className="flex items-center gap-2 text-rose-400">
                            <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse shrink-0" />
                            <div>
                              <span className="font-['Space_Grotesk'] font-extrabold text-sm text-white block">
                                🚨 تم كشف محاولة غش أثناء المبارزة! (Cheating Detected)
                              </span>
                              <span className="text-[10px] text-rose-300">
                                Match Forfeited & -7 Honor Points Deducted
                              </span>
                            </div>
                          </div>

                          <div className="bg-[#0d1117]/80 border border-rose-500/40 rounded-xl p-2.5 text-xs text-rose-100 space-y-1 text-right">
                            <p className="font-bold text-white text-[11px]">• سبب العقوبة:</p>
                            <p className="text-[#c9d1d9] text-[11px]">
                              {cheatForfeitReason || 'فتح علامة تبويب جديدة أو مغادرة صفحة الموقع أثناء الجولة التنافسية.'}
                            </p>
                            <p className="font-bold text-rose-300 text-[11px] pt-1 border-t border-rose-500/30">
                              • الإجراء المتخذ: اعتبار المباراة خسارة كاملة، وتطبيق حسم <strong className="text-rose-400 font-mono text-xs">-7 درجات فخر (Honor)</strong> فوراً، وإرسال إشعار رسمي إلى صندوق الإشعارات الخاص بك.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isWin && (
                            <>
                              <p className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Well-deserved victory! <strong>+70 EXP</strong> added to your profile!</span>
                              </p>
                              {matchReward && matchReward.honorChange > 0 && (
                                <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-xl p-2 flex items-center gap-2 text-emerald-200">
                                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span className="text-[11px] font-bold">
                                    🛡️ <strong>Honor Recovery Bonus:</strong> +1 Honor point restored for your victory! (Current Honor: {matchReward.newHonor}/100)
                                  </span>
                                </div>
                              )}
                            </>
                          )}

                          {isLoss && (
                            <p className="flex items-center gap-1.5 text-rose-300 font-bold">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                              <span>Ranked defeat: <strong>{Math.abs(effectiveExpChange)} EXP</strong> deducted.</span>
                            </p>
                          )}

                          {isDraw && (
                            <p className="flex items-center gap-1.5 text-indigo-300 font-bold">
                              <Award className="w-4 h-4 shrink-0 text-indigo-400" />
                              <span>Match tied! You earned a participation reward of <strong>+10 EXP</strong>!</span>
                            </p>
                          )}

                          {/* Warning on 0 EXP and -3 Pride penalty */}
                          {effectiveWarning && (
                            <div className="mt-2 bg-rose-950/80 border border-rose-500/70 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-rose-200 shadow-sm">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold text-rose-300 block mb-0.5">
                                  ⚠️ Honor Penalty Warning:
                                </span>
                                <span>{effectiveWarning}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Updated Level & Stats Snapshot if available */}
                    {matchReward && (
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[#8b949e]">Level:</span>
                          <span className="font-bold text-white">Lvl {matchReward.newLevel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[#8b949e]">Total EXP:</span>
                          <span className="font-bold text-amber-400">{matchReward.newExp} EXP</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[#8b949e]">Honor:</span>
                          <span className="font-bold text-white">{matchReward.newHonor}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setGameMode('select')}
                      className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      <span>Back to Games Hub</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* NOT-RANKED PRACTICE SESSION */}
        {gameMode === 'not-ranked' && !notRankedGameOver && (
          <div className="w-full max-w-2xl bg-[#1f242c] border border-[#30363d] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Practice Question {currentQuestionIndex + 1} of {notRankedQuestions.length}
              </span>
              <div className="w-32 h-2 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d]">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / notRankedQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <h3 className="font-['Space_Grotesk'] font-bold text-base sm:text-lg text-white mb-6 leading-snug">
              {notRankedQuestions[currentQuestionIndex].question}
            </h3>

            <div className="space-y-3 mb-6">
              {notRankedQuestions[currentQuestionIndex].options.map((option, index) => {
                const currentQ = notRankedQuestions[currentQuestionIndex];
                const isSelected = selectedOption === index;
                const isCorrectOption = index === currentQ.correct;

                let btnStyle = "bg-[#0d1117] border-[#30363d] text-[#f0f6fc] hover:bg-[#252b35] hover:border-teal-500/50";

                if (isAnswered) {
                  if (isCorrectOption) {
                    btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-lg";
                  } else if (isSelected && !isCorrectOption) {
                    btnStyle = "bg-rose-950/80 border-rose-500 text-rose-200 shadow-lg";
                  } else {
                    btnStyle = "bg-[#0d1117] border-[#30363d] text-[#8b949e] opacity-60";
                  }
                }

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleNotRankedAnswer(index)}
                    className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswered && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
                    {isAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="mb-6 p-4 rounded-2xl bg-[#141a22] border border-teal-500/30 text-xs text-teal-200 leading-relaxed animate-in fade-in-50">
                <span className="font-bold text-teal-400 block mb-1">💡 Explanation:</span>
                {notRankedQuestions[currentQuestionIndex].explanation}
              </div>
            )}

            {isAnswered && (
              <button
                type="button"
                onClick={handleNextNotRanked}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{currentQuestionIndex + 1 < notRankedQuestions.length ? 'Next Question' : 'View Practice Results'}</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>
        )}

        {/* Not-Ranked Finished Screen */}
        {gameMode === 'not-ranked' && notRankedGameOver && (
          <div className="w-full max-w-md bg-[#1f242c] border border-emerald-500/40 rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="font-['Space_Grotesk'] font-extrabold text-2xl text-white">
                Practice Completed! 🎉
              </h3>
              <p className="text-xs text-[#8b949e]">
                Great job reviewing your English vocabulary and grammar!
              </p>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 flex items-center justify-around">
              <div>
                <span className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">Total Score</span>
                <span className="font-['Space_Grotesk'] font-extrabold text-2xl text-amber-400">{notRankedScore}</span>
              </div>
              <div className="w-[1px] h-10 bg-[#30363d]" />
              <div>
                <span className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">Max Streak</span>
                <span className="font-['Space_Grotesk'] font-extrabold text-2xl text-emerald-400">{notRankedStreak} 🔥</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedOption(null);
                  setIsAnswered(false);
                  setNotRankedScore(0);
                  setNotRankedStreak(0);
                  setNotRankedGameOver(false);
                }}
                className="flex-1 py-3 bg-[#0d1117] hover:bg-[#252b35] border border-[#30363d] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Again</span>
              </button>
              <button
                type="button"
                onClick={() => setGameMode('select')}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Games Hub</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ANTI-SCREENSHOT SECURITY WARNING MODAL */}
      {showScreenshotWarning && (
        <div
          id="anti-screenshot-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowScreenshotWarning(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#161b22] border-2 border-rose-500 rounded-3xl p-6 sm:p-7 shadow-[0_20px_70px_rgba(244,63,94,0.4)] text-center space-y-4 ring-1 ring-rose-500/50 transform animate-in zoom-in-95 duration-200"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-950/90 border border-rose-500/60 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <ShieldAlert className="w-9 h-9 text-rose-500 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-extrabold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Security Protocol / حماية النزاهة</span>
              </div>
              <h3 className="font-['Space_Grotesk'] font-extrabold text-xl sm:text-2xl text-white">
                🚫 التقاط لقطات الشاشة ممنوع!
              </h3>
              <p className="text-xs text-rose-200 font-medium leading-relaxed">
                Screenshots and screen captures of duel questions are strictly prohibited!
              </p>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-3.5 text-xs text-[#8b949e] text-right space-y-1.5 leading-relaxed">
              <p className="text-white font-semibold">تنبيه أمني صارم للأكاديمية:</p>
              <p className="text-[#c9d1d9]">• يُمنع منعاً باتاً تصوير أو نسخ أو طباعة أي من أسئلة ومحتوى المبارزات التنافسية.</p>
              <p className="text-[#c9d1d9]">• تذكر: فتح علامة تبويب جديدة أو مغادرة شاشة الموقع أثناء الجولة يعتبر محاولة غش تُخسرك المباراة وتخصم 7 درجات من فخرك فوراً.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowScreenshotWarning(false)}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer active:scale-95"
            >
              فهمت ذلك وسألتزم بالقوانين (I Understand)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
