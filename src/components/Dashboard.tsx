import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import {
  Bot,
  GraduationCap,
  LogOut,
  Sparkles,
  BookOpen,
  Send,
  UserCheck,
  CheckCircle2,
  X,
  User,
  Users,
  Home,
  ArrowLeft,
  Search,
  Award,
  ArrowRight,
  Clock,
  Compass,
  Lightbulb,
  Menu,
  Flag,
  UserPlus,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Download,
  Eye,
  Mic,
  Gamepad2,
  Trophy,
  Play,
  Flame,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { StudentProfile, DashboardTab, RegisteredUserProfile, ChatMessage, ChatGroup, AppNotification, calculateLevelFromExp } from '../types';
import {
  getRegisteredMembers,
  getProfile,
  getConversationMessages,
  getGroupMessages,
  getChatGroupsForUser,
  createChatGroup,
  saveChatMessage,
  SendMessageOptions,
  syncWithServerDatabase,
  getNotificationsForUser,
  respondToNotification,
  deleteNotification,
  saveHomeworkSubmission,
} from '../services/storage';
import UserProfileModal from './UserProfileModal';
import LevelUpModal from './LevelUpModal';
import { AiHub, AiMode } from './AiHub';
import { GamesHub } from './GamesHub';
import CreateGroupModal from './CreateGroupModal';
import { NotificationsModal } from './NotificationsModal';
import { AudioPlayer } from './AudioPlayer';
import { ImageLightboxModal } from './ImageLightboxModal';

interface DashboardProps {
  username: string;
  profile: StudentProfile | null;
  onLogout: () => void;
  onSwitchUser?: (username: string) => void;
}

export default function Dashboard({ username, profile, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab | null>(null);
  const [aiActiveMode, setAiActiveMode] = useState<AiMode>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem(`user_avatar_${username}`) || 'default';
  });
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [localProfile, setLocalProfile] = useState<StudentProfile | null>(profile);
  const [registeredMembers, setRegisteredMembers] = useState<RegisteredUserProfile[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<RegisteredUserProfile | null>(null);
  const [selectedChatGroup, setSelectedChatGroup] = useState<ChatGroup | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<RegisteredUserProfile | null>(null);
  const [userMenuOpenFor, setUserMenuOpenFor] = useState<string | null>(null);
  const [reportNotification, setReportNotification] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    dataUrl: string;
    type: 'image' | 'file';
    fileName: string;
    fileSize: string;
  } | null>(null);

  const [isExamMode, setIsExamMode] = useState(false);

  const handleExamLockedNotice = (featureName = 'هذه الميزة') => {
    setReportNotification(`🔒 تم قفل ${featureName} مؤقتاً! يمنع مغادرة الصفحة أو التبديل أثناء الاختبار لضمان نزاهة الامتحان.`);
    setTimeout(() => setReportNotification(null), 4000);
  };

  // Exam Mode: Prevent copying text, context menu, and accidental navigation
  useEffect(() => {
    if (!isExamMode) return;

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setReportNotification('⚠️ ميزة النسخ معطلة أثناء الاختبار لضمان نزاهة الامتحان! (Copying is disabled during exams)');
      setTimeout(() => setReportNotification(null), 3000);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X', 'a', 'A', 'u', 'U', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        setReportNotification('⚠️ اختصارات النسخ محظورة أثناء الاختبار! (Shortcuts disabled during exams)');
        setTimeout(() => setReportNotification(null), 3000);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'الاختبار جارٍ حالياً! هل أنت متأكد من رغبتك في المغادرة؟';
      return e.returnValue;
    };

    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('copy', handleCopyCut);
      window.removeEventListener('cut', handleCopyCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamMode]);

  const [gameModeType, setGameModeType] = useState<'select' | 'ranked' | 'not-ranked'>('select');
  const [gamePlaying, setGamePlaying] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOptIndex, setSelectedOptIndex] = useState<number | null>(null);
  const [gameFinished, setGameFinished] = useState(false);

  const rankedQuestions = [
    { question: "Choose the correct past participle of 'write':", options: ["Writed", "Written", "Wrote", "Writing"], correct: 1 },
    { question: "Which sentence uses the Present Perfect correctly?", options: ["I have went to London.", "She has finished her homework.", "They has played football.", "We has ate lunch."], correct: 1 },
    { question: "What is the passive voice of: 'The teacher explains the lesson'?", options: ["The lesson is explained by the teacher.", "The lesson was explain by teacher.", "The teacher is explained.", "Lesson explains."], correct: 0 },
    { question: "Choose the correct preposition: 'He is good ___ English.'", options: ["on", "in", "at", "with"], correct: 2 },
    { question: "Identify the correct modal verb for obligation: 'You ___ wear a helmet when riding a bicycle.'", options: ["must", "might", "could", "would"], correct: 0 }
  ];

  const notRankedQuestions = [
    { question: "What is the plural form of 'child'?", options: ["Childs", "Children", "Childes", "Child"], correct: 1 },
    { question: "Which word is a synonym for 'happy'?", options: ["Sad", "Angry", "Joyful", "Tired"], correct: 2 },
    { question: "Choose the correct article: 'She bought ___ apple.'", options: ["a", "an", "the", "some"], correct: 1 },
    { question: "What is the opposite of 'ancient'?", options: ["Old", "Modern", "Historic", "Slow"], correct: 1 },
    { question: "Complete the idiom: 'Piece of ___' (very easy)", options: ["cake", "bread", "pie", "cookie"], correct: 0 }
  ];
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    senderName?: string;
    time?: string;
    caption?: string;
  } | null>(null);

  const studentName = localProfile?.name || profile?.name || username;

  const [levelUpCelebration, setLevelUpCelebration] = useState<{
    oldLevel: number;
    newLevel: number;
    totalExp: number;
    studentName?: string;
  } | null>(null);

  // Global Level-Up Detection and Custom Event Listener
  useEffect(() => {
    if (!username) return;

    const handlePlayerLevelUp = (e: any) => {
      const detail = e.detail;
      if (detail && detail.newLevel && detail.oldLevel && detail.newLevel > detail.oldLevel) {
        setLevelUpCelebration({
          oldLevel: detail.oldLevel,
          newLevel: detail.newLevel,
          totalExp: detail.totalExp || 0,
          studentName: detail.studentName || studentName,
        });
        localStorage.setItem(`user_last_level_${username}`, detail.newLevel.toString());
      }
    };

    window.addEventListener('player-level-up', handlePlayerLevelUp);
    return () => window.removeEventListener('player-level-up', handlePlayerLevelUp);
  }, [username, studentName]);

  // Check profile EXP for level progression
  useEffect(() => {
    if (!username || !localProfile) return;
    const currentLvl = calculateLevelFromExp(localProfile.exp || 0);
    const key = `user_last_level_${username}`;
    const stored = localStorage.getItem(key);

    if (stored === null) {
      // First initialization for this device
      localStorage.setItem(key, currentLvl.toString());
    } else {
      const storedLvl = parseInt(stored, 10);
      if (!isNaN(storedLvl) && currentLvl > storedLvl) {
        setLevelUpCelebration({
          oldLevel: storedLvl,
          newLevel: currentLvl,
          totalExp: localProfile.exp || 0,
          studentName: localProfile.name || username,
        });
        localStorage.setItem(key, currentLvl.toString());
      }
    }
  }, [username, localProfile]);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [homeworkType, setHomeworkType] = useState<'select' | 'speaking' | 'writing' | 'copy' | 'another'>('select');
  const [homeworkInputText, setHomeworkInputText] = useState('');
  const [homeworkSubmittedSuccess, setHomeworkSubmittedSuccess] = useState(false);
  const [speakingVideos, setSpeakingVideos] = useState<File[]>([]);
  const [speakingNotes, setSpeakingNotes] = useState('');
  const [speakingSubmitted, setSpeakingSubmitted] = useState(false);
  const [homeworkImages, setHomeworkImages] = useState<File[]>([]);
  const [homeworkNotes, setHomeworkNotes] = useState('');
  const [homeworkModalSubmitted, setHomeworkModalSubmitted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>(() => (username ? [username.toLowerCase().trim()] : []));

  useEffect(() => {
    if (!username) return;
    const myKey = username.toLowerCase().trim();

    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: myKey })
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.onlineUsers)) {
          const list: string[] = data.onlineUsers.map((u: string) => u.toLowerCase().trim());
          if (!list.includes(myKey)) {
            list.push(myKey);
          }
          setOnlineUsers(list);
        }
      } catch (e) {
        // Fallback: at least preserve current user
        setOnlineUsers((prev) => (prev.length > 0 ? prev : [myKey]));
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000); // Heartbeat every 5 seconds

    const handleBeforeUnload = () => {
      try {
        const blob = new Blob([JSON.stringify({ username: myKey })], { type: 'application/json' });
        navigator.sendBeacon('/api/presence/leave', blob);
      } catch (e) {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [username]);

  const pendingNotifications = notifications.filter((n) => n.status === 'pending' || n.status === 'unread');

  useEffect(() => {
    syncWithServerDatabase(username);
    const updateData = async () => {
      const members = getRegisteredMembers(username);
      setRegisteredMembers(members);
      const groups = getChatGroupsForUser(username);
      setChatGroups(groups);
      const notifs = await getNotificationsForUser(username);
      setNotifications(notifs);
      
      const prof = getProfile(username);
      if (prof) setLocalProfile(prof);
    };
    updateData();
    const interval = setInterval(() => {
      syncWithServerDatabase(username).then(() => {
        updateData();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [username, activeTab]);

  useEffect(() => {
    if (selectedChatUser) {
      const updateMsgs = () => {
        const msgs = getConversationMessages(username, selectedChatUser.username);
        setActiveChatMessages(msgs);
      };
      updateMsgs();
      const interval = setInterval(updateMsgs, 2000);
      return () => clearInterval(interval);
    } else if (selectedChatGroup) {
      const updateMsgs = () => {
        const msgs = getGroupMessages(selectedChatGroup.id);
        setActiveChatMessages(msgs);
      };
      updateMsgs();
      const interval = setInterval(updateMsgs, 2000);
      return () => clearInterval(interval);
    } else {
      setActiveChatMessages([]);
    }
  }, [selectedChatUser, selectedChatGroup, username]);

  const sendMediaMessage = async (text: string, options: SendMessageOptions) => {
    const avatarToSend = userAvatar !== 'default' ? userAvatar : undefined;
    const finalOptions: SendMessageOptions = {
      ...options,
      isStudent: true,
      senderAvatar: avatarToSend,
    };
    if (selectedChatUser) {
      const msg = await saveChatMessage(
        username,
        studentName,
        selectedChatUser.username,
        text,
        finalOptions
      );
      setActiveChatMessages((prev) => [...prev, msg]);
    } else if (selectedChatGroup) {
      finalOptions.groupId = selectedChatGroup.id;
      const msg = await saveChatMessage(
        username,
        studentName,
        selectedChatGroup.id,
        text,
        finalOptions,
        avatarToSend,
        selectedChatGroup.id
      );
      setActiveChatMessages((prev) => [...prev, msg]);
    }
  };

  const handleSendChatMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() && !pendingAttachment) return;
    if (pendingAttachment) {
      const captionText = chatMessageText.trim();
      sendMediaMessage(captionText, {
        type: pendingAttachment.type,
        mediaUrl: pendingAttachment.dataUrl,
        fileName: pendingAttachment.fileName,
        fileSize: pendingAttachment.fileSize,
      });
      setPendingAttachment(null);
      setChatMessageText('');
    } else if (chatMessageText.trim()) {
      const textToSend = chatMessageText.trim();
      setChatMessageText('');
      sendMediaMessage(textToSend, { type: 'text' });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setReportNotification('Please select a valid image file (PNG, JPG, GIF, WebP).');
      setTimeout(() => setReportNotification(null), 3500);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setReportNotification('Image size exceeds 15MB limit.');
      setTimeout(() => setReportNotification(null), 3500);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingAttachment({
        dataUrl,
        type: 'image',
        fileName: file.name,
        fileSize: formatFileSize(file.size),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setReportNotification('File size exceeds 20MB limit.');
      setTimeout(() => setReportNotification(null), 3500);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImg = file.type.startsWith('image/');
      setPendingAttachment({
        dataUrl,
        type: isImg ? 'image' : 'file',
        fileName: file.name,
        fileSize: formatFileSize(file.size),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateGroup = async (data: { name: string; avatar?: string; members: string[] }) => {
    const newGroup = await createChatGroup(data.name, data.avatar, username, data.members);
    setChatGroups((prev) => [newGroup, ...prev]);
    setSelectedChatUser(null);
    setSelectedChatGroup(newGroup);
  };

  const handleAcceptNotification = async (notif: AppNotification) => {
    const result = await respondToNotification(notif.id, 'accept', username);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, status: 'accepted' } : n))
    );
    const updatedGroups = getChatGroupsForUser(username);
    setChatGroups(updatedGroups);
    if (result.group) {
      setSelectedChatUser(null);
      setSelectedChatGroup(result.group);
      setActiveTab('CHAT');
    }
    setReportNotification(`You joined "${notif.groupName || 'the group'}" successfully!`);
    setTimeout(() => setReportNotification(null), 4000);
  };

  const handleDeclineNotification = async (notif: AppNotification) => {
    await respondToNotification(notif.id, 'decline', username);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, status: 'declined' } : n))
    );
    setReportNotification(`Declined invitation for "${notif.groupName || 'the group'}".`);
    setTimeout(() => setReportNotification(null), 3500);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleReportUser = (targetUsername: string) => {
    setUserMenuOpenFor(null);
    setReportNotification(`Report submitted for @${targetUsername}. Our safety team will review this user.`);
    setTimeout(() => {
      setReportNotification(null);
    }, 4000);
  };

  return (
    <div
      id="dashboard-page"
      className={`min-h-screen w-full bg-[#0d1117] text-[#f0f6fc] font-['Inter',sans-serif] flex flex-col selection:bg-teal-500/30 selection:text-teal-200 antialiased overflow-y-auto ${
        isExamMode ? 'select-none' : ''
      }`}
    >
      {/* 1. TOP HEADER */}
      <header className="border-b border-[#30363d]/80 bg-[#161b22] sticky top-0 z-30 px-3.5 sm:px-6 py-2.5 flex items-center justify-between shadow-lg shadow-black/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-teal-500 to-indigo-500 p-[1.5px] shadow-md shadow-teal-500/20">
              <div className="w-full h-full bg-[#0d1117] rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-teal-400" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#161b22] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Space_Grotesk'] font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>YOUR ENGLISH IN OUR HAND</span>
              </h1>
              <span className="hidden md:inline-flex text-[10px] font-semibold text-teal-300 bg-teal-950/80 border border-teal-700/60 px-2 py-0.5 rounded-full">
                Workspace
              </span>
            </div>
            <p className="text-[10px] text-[#8b949e]">Integrated learning and communication platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-header-profile"
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الملف الشخصي (Profile)');
                return;
              }
              setIsProfileModalOpen(true);
            }}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl shadow-inner transition-all text-left group relative ${
              isExamMode
                ? 'bg-[#161b22] border border-rose-500/50 cursor-not-allowed opacity-80'
                : 'bg-[#1c2128] hover:bg-[#22272e] border border-[#30363d] hover:border-teal-400/60 cursor-pointer'
            }`}
            title={isExamMode ? 'Locked during exam' : 'Click to view My profile'}
          >
            {isExamMode && (
              <span className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-rose-600 border border-[#161b22] flex items-center justify-center text-white shadow-sm" title="Locked during exam">
                <Lock className="w-2.5 h-2.5 text-white animate-pulse" />
              </span>
            )}
            <div className="relative shrink-0">
              <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#262626] flex items-center justify-center border border-[#161b22]">
                  {userAvatar === 'default' || !userAvatar ? (
                    <svg viewBox="0 0 100 100" className="w-full h-full text-[#8e8e8e]">
                      <circle cx="50" cy="38" r="20" fill="currentColor" />
                      <path d="M18 88 C18 64 32 57 50 57 C68 57 82 64 82 88 Z" fill="currentColor" />
                    </svg>
                  ) : (
                    <img src={userAvatar} alt={studentName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white max-w-[110px] truncate group-hover:text-teal-300 transition-colors">{studentName}</span>
                <span className="text-[10px] text-teal-400 font-mono">@{username}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] hidden sm:flex mt-0.5">
                <span className="text-amber-400 font-semibold" title="Honor Score">
                  ★ {localProfile?.honor ?? 100}
                </span>
                <span className="text-teal-300 font-semibold" title="Current Level">
                  Lv. {localProfile?.level ?? 1}
                </span>
                <span className="text-indigo-300 font-medium" title="Experience Points">
                  {localProfile?.exp ?? 1} XP
                </span>
              </div>
            </div>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            id="btn-header-notifications"
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الإشعارات (Notifications)');
                return;
              }
              setIsNotificationsModalOpen(true);
            }}
            className={`btn-responsive relative ${
              isExamMode
                ? 'bg-[#161b22] border-rose-500/50 cursor-not-allowed opacity-80'
                : pendingNotifications.length > 0
                ? 'bg-[#1c2128] border-rose-500/60 hover:border-rose-400 shadow-rose-950/40 ring-1 ring-rose-500/40'
                : 'bg-[#1c2128] border-[#30363d] hover:border-teal-400/60'
            }`}
            title={
              isExamMode
                ? 'Locked during exam'
                : pendingNotifications.length > 0
                ? `${pendingNotifications.length} new notification(s)`
                : 'Notifications'
            }
          >
            {isExamMode && (
              <span className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-rose-600 border border-[#161b22] flex items-center justify-center text-white shadow-sm" title="Locked during exam">
                <Lock className="w-2.5 h-2.5 text-white animate-pulse" />
              </span>
            )}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`icon-responsive transition-all duration-200 ${
                pendingNotifications.length > 0
                  ? 'text-rose-400 group-hover:text-rose-300 group-hover:scale-110'
                  : 'text-[#8b949e] group-hover:text-teal-300 group-hover:scale-105'
              }`}
            >
              <path
                d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                fill="#0d1117"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.3 21C10.6685 21.6025 11.1963 22.0991 11.8265 22.4363C12.4566 22.7735 13.1678 22.9398 13.8822 22.917C14.5966 22.8942 15.2897 22.6831 15.8863 22.3069C16.4828 21.9307 16.9622 21.4022 17.27 20.77"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {pendingNotifications.length > 0 && !isExamMode && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-gradient-to-r from-rose-600 to-red-600 border-2 border-[#161b22] text-[10px] font-bold text-white shadow-lg shadow-rose-600/60 font-mono">
                  {pendingNotifications.length}
                </span>
              </span>
            )}
          </button>

          <button
            id="btn-logout"
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('تسجيل الخروج (Logout)');
                return;
              }
              onLogout();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border relative ${
              isExamMode
                ? 'bg-[#161b22] border-rose-500/50 text-rose-300 opacity-80 cursor-not-allowed'
                : 'text-[#8b949e] hover:text-rose-300 hover:bg-rose-950/40 hover:border-rose-800/60 border-[#30363d] cursor-pointer'
            }`}
            title={isExamMode ? 'Locked during exam' : 'Sign out / Logout'}
          >
            {isExamMode ? <Lock className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> : <LogOut className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isExamMode ? 'Locked' : 'Logout'}</span>
          </button>
        </div>
      </header>

      {/* 2. WORKSPACE */}
      <div className="flex-1 flex flex-row w-full min-h-0 relative overflow-hidden">
        <main className={`flex-1 flex flex-col min-w-0 bg-[#0d1117] ${
          (activeTab === 'CHAT' && (selectedChatUser !== null || selectedChatGroup !== null)) || (activeTab === 'AI' && aiActiveMode !== null)
            ? 'p-2 sm:p-5 pb-16 lg:pb-5 overflow-hidden min-h-0'
            : 'p-3 sm:p-5 pb-20 lg:pb-5 overflow-y-auto'
        }`}>
          {!((activeTab === 'CHAT' && (selectedChatUser !== null || selectedChatGroup !== null)) || (activeTab === 'AI' && aiActiveMode !== null)) && (
            <div className="mb-5 flex items-center justify-between bg-[#161b22] border border-[#30363d] rounded-2xl px-4 py-3 shadow-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {activeTab ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[#8b949e]">Active Section:</span>
                      <span className="text-teal-300 font-bold">{activeTab}</span>
                    </span>
                  ) : (
                    <span>Welcome to your learning dashboard, <strong className="text-teal-300">{studentName}</strong></span>
                  )}
                </span>
              </div>
              {activeTab && (
                <button
                  type="button"
                  onClick={() => {
                    if (isExamMode) {
                      handleExamLockedNotice('مغادرة القسم (Section Exit)');
                      return;
                    }
                    setActiveTab(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    isExamMode
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 opacity-80 cursor-not-allowed'
                      : 'bg-[#1c2128] hover:bg-[#22272e] border-[#30363d] text-[#8b949e] hover:text-white cursor-pointer shadow-xs'
                  }`}
                  title={isExamMode ? 'Locked during exam' : 'Close section and return to dashboard overview'}
                >
                  {isExamMode ? <Lock className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> : <X className="w-3.5 h-3.5" />}
                  <span>{isExamMode ? '🔒 مغلق أثناء الاختبار' : 'Close Section'}</span>
                </button>
              )}
            </div>
          )}

          {!activeTab && (
            <div id="overview-hub" className="flex-1 flex flex-col gap-6 animate-fadeIn">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161b22] via-[#1c2128] to-[#161b22] border border-[#30363d] p-6 sm:p-8 shadow-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-700/60 text-teal-300 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>English Language Mastery & Communication Platform</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      Welcome back, {studentName}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#8b949e] max-w-xl leading-relaxed">
                      Select any section below to get started: collaborate and chat with peers in <span className="text-teal-300 font-semibold">CHAT</span>, solve speaking topics via video calls in <span className="text-amber-300 font-semibold">AI TUTOR</span>, or explore curriculum lessons in <span className="text-indigo-300 font-semibold">HOMEWORKS</span>.
                    </p>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-300 mt-2 shadow-inner">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="font-bold">{Math.max(1, onlineUsers.length)}</span> active student{Math.max(1, onlineUsers.length) === 1 ? '' : 's'} currently online in the platform
                    </div>
                  </div>
                  <div className="flex sm:flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#161b22]/90 border border-[#30363d] shadow-sm">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Student Account</div>
                        <div className="text-[10px] text-teal-300 font-medium">Verified Active Profile</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#161b22]/90 border border-[#30363d] shadow-sm">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Current Track</div>
                        <div className="text-[10px] text-indigo-300 font-medium">English Mastery Foundation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div
                  onClick={() => setActiveTab('CHAT')}
                  className="group relative rounded-2xl bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] hover:border-teal-500/60 p-6 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-teal-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/20 transition-all" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white">
                        CHAT
                      </h3>
                      <span className="text-[10px] font-semibold text-teal-300 bg-teal-950/80 border border-teal-700/60 px-2 py-0.5 rounded-full">
                        {registeredMembers.length} {registeredMembers.length === 1 ? 'Member' : 'Members'}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] leading-relaxed mb-6">
                      Direct communication room with registered students and instructors to practice English in real-time.
                    </p>
                  </div>
                  <div className="relative z-10 pt-4 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                    <span>Open Member Directory</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('AI')}
                  className="group relative rounded-2xl bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] hover:border-amber-500/60 p-6 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-amber-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white">
                        AI TUTOR
                      </h3>
                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2 py-0.5 rounded-full">
                        Speaking Video Calls
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] leading-relaxed mb-6">
                      Your intelligent AI tutor for speaking model answers, video calls with lip-sync avatars, writing corrections, and grammar practice.
                    </p>
                  </div>
                  <div className="relative z-10 pt-4 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
                    <span>Open AI Studio</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('HOMEWORKS')}
                  className="group relative rounded-2xl bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] hover:border-indigo-500/60 p-6 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-indigo-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white">
                        HOMEWORKS
                      </h3>
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 px-2 py-0.5 rounded-full">
                        3 Units
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] leading-relaxed mb-6">
                      Structured curriculum roadmap: grammar modules, conversation drills, vocabulary builders, and exercises.
                    </p>
                  </div>
                  <div className="relative z-10 pt-4 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                    <span>Explore Units & Lessons</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveTab('GAMES');
                    setGameModeType('select');
                    setGamePlaying(false);
                  }}
                  className="group relative rounded-2xl bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] hover:border-emerald-500/60 p-6 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-emerald-950/40 hover:-translate-y-1 cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white">
                        GAMES
                      </h3>
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                        Ranked & Practice
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] leading-relaxed mb-6">
                      Engaging interactive English games. Choose between Ranked competitive matches or Not-Ranked practice games!
                    </p>
                  </div>
                  <div className="relative z-10 pt-4 border-t border-[#30363d]/60 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                    <span>Play Games Hub</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-[#161b22] border border-[#30363d] relative overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-400 mb-2">
                    <Lightbulb className="w-4 h-4" />
                    <span>Word of the Day</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-wide">
                      Resilient
                    </span>
                    <span className="text-xs text-[#8b949e] ml-2 font-mono">/rɪˈzɪliənt/ • (adjective)</span>
                  </div>
                  <p className="text-xs text-[#c9d1d9] leading-relaxed mb-2">
                    <strong>Definition:</strong> Able to withstand or recover quickly from difficult conditions; adaptable and persistent.
                  </p>
                  <p className="text-[11px] text-[#8b949e] italic bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d]/60">
                    &ldquo;Successful language learners are resilient; they embrace mistakes and keep practicing daily.&rdquo;
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-[#161b22] border border-[#30363d] relative overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                    <Compass className="w-4 h-4" />
                    <span>Grammar Insight</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-base font-bold text-white">
                      Since vs. For (with Present Perfect)
                    </span>
                  </div>
                  <p className="text-xs text-[#c9d1d9] leading-relaxed mb-2">
                    • Use <strong>Since</strong> when referring to a specific starting point in time: <code className="text-amber-300 font-mono">since 2021, since Monday</code>.
                    <br />
                    • Use <strong>For</strong> when referring to a continuous period or duration of time: <code className="text-amber-300 font-mono">for 3 years, for two hours</code>.
                  </p>
                  <p className="text-[11px] text-[#8b949e] italic bg-[#0d1117] p-2.5 rounded-xl border border-[#30363d]/60">
                    &ldquo;I have been studying English for two years, since I finished high school.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CHAT' && (
            <div
              id="project-chat"
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded-3xl p-4 sm:p-7 flex flex-col shadow-2xl"
              onClick={() => {
                if (userMenuOpenFor) setUserMenuOpenFor(null);
              }}
            >
              {!selectedChatUser && !selectedChatGroup ? (
                <div id="chat-members-directory" className="flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">
                            English Community Chat
                          </h3>
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-teal-300 bg-teal-950/70 border border-teal-700/50 px-2 py-0.5 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{Math.max(1, onlineUsers.length)} online</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8b949e] mt-0.5 truncate">
                          Connect with fellow students and instructors, join study circles, and build fluency
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-create-group"
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 hover:from-teal-500 hover:to-emerald-400 text-white font-semibold text-xs transition-all shadow-md shadow-teal-950/60 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border border-teal-400/30 shrink-0 self-start sm:self-auto whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Create group</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-medium">
                        New
                      </span>
                    </button>
                  </div>

                  {chatGroups.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                          <Users className="w-3.5 h-3.5" />
                          <span>Study Groups ({chatGroups.length})</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {chatGroups.map((group) => (
                          <div
                            key={group.id}
                            className="bg-[#1c2128] hover:bg-[#22272e] border border-[#30363d] hover:border-teal-500/60 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3.5 transition-all duration-200 shadow-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0 shadow-sm">
                                {group.avatar ? (
                                  <img
                                    src={group.avatar}
                                    alt={group.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="w-5 h-5 text-teal-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-white text-sm sm:text-base leading-snug break-words">
                                    {group.name}
                                  </h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-700/50 font-medium">
                                    Group
                                  </span>
                                </div>
                                <p className="text-xs text-[#8b949e] mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-teal-400 font-medium">
                                    {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                                  </span>
                                  <span>•</span>
                                  <span>Created by @{group.createdBy}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedChatUser(null);
                                setSelectedChatGroup(group);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer shrink-0 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
                            >
                              Join Chat
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Members Directory
                      </span>
                      <span className="text-[11px] text-[#8b949e]">
                        ({registeredMembers.length} available)
                      </span>
                    </div>
                    {registeredMembers.length > 0 && (
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchMemberQuery}
                          onChange={(e) => setSearchMemberQuery(e.target.value)}
                          placeholder="Search members or @username..."
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-teal-400 transition-colors"
                        />
                      </div>
                    )}
                  </div>

                  {registeredMembers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-14 text-center bg-[#0d1117]/60 border border-[#30363d] rounded-2xl">
                      <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4 text-teal-400 shadow-inner">
                        <Users className="w-8 h-8" />
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-white mb-2">
                        No other registered members yet
                      </h4>
                      <p className="text-xs sm:text-sm text-[#8b949e] max-w-md leading-relaxed">
                        You are registered as <span className="text-teal-400 font-medium font-mono">@{username}</span> ({studentName}). When other students or instructors register, their profiles will appear here automatically. You can also create a new group anytime using the button above!
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[300px] max-h-[500px]">
                      {/* Featured Instructor Section */}
                      {registeredMembers.some(m => m.role === 'teacher') && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            <GraduationCap className="w-3 h-3" />
                            <span>Your Instructors</span>
                          </div>
                          {registeredMembers
                            .filter(m => m.role === 'teacher')
                            .map((member) => (
                              <div
                                key={`instructor-${member.username}`}
                                className="relative bg-amber-950/10 hover:bg-amber-950/20 border border-amber-800/30 hover:border-amber-500/60 rounded-2xl p-3.5 flex items-center justify-between gap-3.5 transition-all duration-200 shadow-sm"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#21262d] border-2 border-amber-500/30 shadow-md flex items-center justify-center text-white">
                                      {member.avatar ? (
                                        <img
                                          src={member.avatar}
                                          alt={member.name}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${member.avatarBg} flex items-center justify-center`}>
                                          <User className="w-6 h-6 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#1c2128] rounded-full" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-white text-sm sm:text-base truncate flex items-center gap-2">
                                      {member.name}
                                      <span className="capsule-responsive bg-amber-500/20 text-amber-300 border-amber-500/30">Official</span>
                                    </h4>
                                    <p className="text-[10px] text-amber-200/60 truncate mt-0.5">@{member.username} • Academic Instructor</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedChatGroup(null);
                                    setSelectedChatUser(member);
                                  }}
                                  className="btn-responsive bg-amber-600 hover:bg-amber-500 text-white font-bold"
                                >
                                  <Send className="icon-responsive" />
                                  <span>Message</span>
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Other Members Section */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                          <Users className="w-3 h-3" />
                          <span>Student Community</span>
                        </div>
                          {registeredMembers
                            .filter((m) => m.role !== 'teacher')
                            .filter((m) =>
                              m.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
                              m.username.toLowerCase().includes(searchMemberQuery.toLowerCase())
                            )
                            .map((member) => (
                              <div
                                key={member.username}
                                className="relative bg-[#1c2128] hover:bg-[#22272e] border border-[#30363d] hover:border-teal-500/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3.5 transition-all duration-200 shadow-sm"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#21262d] border-2 border-[#30363d] shadow-md flex items-center justify-center text-white">
                                      {member.avatar ? (
                                        <img
                                          src={member.avatar}
                                          alt={member.name}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${member.avatarBg} flex items-center justify-center`}>
                                          <User className="w-6 h-6 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    {onlineUsers.map(u => u.toLowerCase().trim()).includes(member.username.toLowerCase().trim()) ? (
                                      <span
                                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#1c2128] rounded-full"
                                        title="Online now"
                                      />
                                    ) : (
                                      <span
                                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-zinc-600 border-2 border-[#1c2128] rounded-full"
                                        title="Offline"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-white text-sm sm:text-base truncate">
                                        {member.name}
                                      </h4>
                                      <div className="relative inline-block">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setUserMenuOpenFor(userMenuOpenFor === member.username ? null : member.username);
                                          }}
                                          className="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#2d333b] transition-colors cursor-pointer"
                                          title="Options"
                                        >
                                          <Menu className="w-3.5 h-3.5" />
                                        </button>
                                        {userMenuOpenFor === member.username && (
                                          <div
                                            className="absolute left-0 top-full mt-1.5 z-40 w-44 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setUserMenuOpenFor(null);
                                                setViewingProfileUser(member);
                                              }}
                                              className="w-full text-left px-3 py-2 rounded-xl text-xs text-white hover:bg-[#21262d] flex items-center gap-2 transition-colors cursor-pointer"
                                            >
                                              <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                              <span className="font-medium">Open user profile</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleReportUser(member.username)}
                                              className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                            >
                                              <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                              <span className="font-medium">Report</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-teal-400 font-mono font-medium">
                                        @{member.username}
                                      </span>
                                      <span
                                        className={`capsule-responsive ${
                                          member.role === 'teacher'
                                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                                            : 'bg-teal-950/80 text-teal-300 border-teal-800/80'
                                        }`}
                                      >
                                        {member.role === 'teacher' ? 'Instructor' : 'Student'}
                                      </span>
                                      <span className="capsule-responsive bg-amber-950/60 text-amber-300 border-amber-800/60 flex items-center gap-1 font-semibold" title="Honor Score">
                                        ★ {member.honor ?? 100}
                                      </span>
                                      <span className="capsule-responsive bg-[#1c2128] text-teal-300 border-teal-800/60 font-semibold" title="Level">
                                        Lv. {member.level ?? 1}
                                      </span>
                                      <span className="capsule-responsive bg-[#1c2128] text-indigo-300 border-indigo-800/60 font-semibold" title="Experience Points">
                                        {member.exp ?? 1} XP
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#8b949e] truncate mt-1">
                                      {member.bio || (member.age ? `Registered Member • Age: ${member.age}` : 'Registered Member')}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedChatGroup(null);
                                    setSelectedChatUser(member);
                                  }}
                                  className="btn-responsive bg-teal-600 hover:bg-teal-500 text-white font-semibold"
                                  title={`Start chat with ${member.name}`}
                                >
                                  <Send className="icon-responsive" />
                                  <span>Message</span>
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <div id="active-chat-room" className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between pb-3.5 border-b border-[#30363d] mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChatUser(null);
                          setSelectedChatGroup(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c2128] hover:bg-[#22272e] border border-[#30363d] text-xs text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                        title="Back to Directory"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      {selectedChatUser ? (
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#21262d] border border-[#30363d] flex items-center justify-center">
                              {selectedChatUser.avatar ? (
                                <img
                                  src={selectedChatUser.avatar}
                                  alt={selectedChatUser.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${selectedChatUser.avatarBg} flex items-center justify-center text-white`}>
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#161b22] rounded-full" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-white text-xs sm:text-sm">
                                {selectedChatUser.name}
                              </h3>
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserMenuOpenFor(userMenuOpenFor === selectedChatUser.username ? null : selectedChatUser.username);
                                  }}
                                  className="p-1 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#2d333b] transition-colors cursor-pointer"
                                  title="Options"
                                >
                                  <Menu className="w-3.5 h-3.5" />
                                </button>
                                {userMenuOpenFor === selectedChatUser.username && (
                                  <div
                                    className="absolute left-0 top-full mt-1.5 z-40 w-44 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-1.5 animate-in fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUserMenuOpenFor(null);
                                        setViewingProfileUser(selectedChatUser);
                                      }}
                                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-white hover:bg-[#21262d] flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <User className="w-3.5 h-3.5 text-teal-400" />
                                      <span>Open user profile</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReportUser(selectedChatUser.username)}
                                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Flag className="w-3.5 h-3.5 text-rose-400" />
                                      <span>Report</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {onlineUsers.map(u => u.toLowerCase().trim()).includes(selectedChatUser.username.toLowerCase().trim()) ? (
                              <div className="flex items-center gap-2 text-[10px] text-teal-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Online • @{selectedChatUser.username}</span>
                                <span className="text-amber-300 font-semibold">
                                  ★ {selectedChatUser.honor ?? 100}
                                </span>
                                <span className="text-teal-300 font-semibold">
                                  Lv. {selectedChatUser.level ?? 1}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                <span>Offline • @{selectedChatUser.username}</span>
                                <span className="text-amber-300 font-semibold">
                                  ★ {selectedChatUser.honor ?? 100}
                                </span>
                                <span className="text-teal-300 font-semibold">
                                  Lv. {selectedChatUser.level ?? 1}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : selectedChatGroup ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0">
                            {selectedChatGroup.avatar ? (
                              <img
                                src={selectedChatGroup.avatar}
                                alt={selectedChatGroup.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-4 h-4 text-teal-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-xs sm:text-sm">
                              {selectedChatGroup.name}
                            </h3>
                            <p className="text-[10px] text-teal-400">
                              Group Conversation • {selectedChatGroup.members.length} members
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 min-h-0">
                    {activeChatMessages.map((msg) => {
                      const isMe = msg.sender.toLowerCase() === username.toLowerCase();
                      const senderProfile = registeredMembers.find(m => m.username.toLowerCase() === msg.sender.toLowerCase());
                      const profileAvatar = senderProfile?.avatar;
                      const messageAvatar = msg.senderAvatar;
                      const effectiveAvatar = (profileAvatar && profileAvatar !== 'default') ? profileAvatar : 
                                              (messageAvatar && messageAvatar !== 'default') ? messageAvatar : 'default';
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div className="w-7 h-7 rounded-xl overflow-hidden bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0 mt-1 shadow-sm">
                            {effectiveAvatar && effectiveAvatar !== 'default' ? (
                              <img
                                src={effectiveAvatar}
                                alt={msg.senderName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                                {msg.senderName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className={`flex flex-col max-w-[82%] sm:max-w-[76%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e] mb-1">
                              <span className={`font-semibold ${isMe ? 'text-teal-400' : 'text-white'}`}>
                                {isMe ? 'You' : msg.senderName}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {msg.time}
                              </span>
                            </div>

                            {msg.type === 'image' && msg.mediaUrl ? (
                              <div
                                className={`rounded-2xl p-1.5 shadow-sm overflow-hidden group ${
                                  isMe
                                    ? 'bg-teal-700/60 border border-teal-500/40 rounded-tr-xs'
                                    : 'bg-[#1c2128] border border-[#30363d] rounded-tl-xs'
                                }`}
                              >
                                <div
                                  className="relative max-w-[280px] max-h-[260px] rounded-xl overflow-hidden cursor-pointer bg-black/40"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: msg.mediaUrl!,
                                      senderName: msg.senderName,
                                      time: msg.time,
                                      caption: msg.text && msg.text !== 'Photo' && msg.text !== msg.fileName ? msg.text : undefined,
                                    })
                                  }
                                >
                                  <img
                                    src={msg.mediaUrl}
                                    alt={msg.fileName || 'Shared photo'}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-auto max-h-[240px] object-cover transition-transform group-hover:scale-102 duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <span className="p-1.5 rounded-lg bg-black/70 text-white text-xs flex items-center gap-1 font-semibold">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>View</span>
                                    </span>
                                  </div>
                                </div>
                                {msg.text && msg.text !== 'Photo' && msg.text !== msg.fileName && (
                                  <div className="px-2 pt-2 pb-1 text-xs text-white leading-relaxed">
                                    {msg.text}
                                  </div>
                                )}
                              </div>
                            ) : msg.type === 'audio' && msg.mediaUrl ? (
                              <div className="mt-0.5">
                                <AudioPlayer
                                  src={msg.mediaUrl}
                                  duration={msg.audioDuration}
                                  isMe={isMe}
                                />
                              </div>
                            ) : msg.type === 'file' && msg.mediaUrl ? (
                              <div
                                className={`rounded-2xl p-3 shadow-sm flex flex-col gap-2 min-w-[200px] sm:min-w-[240px] max-w-[320px] ${
                                  isMe
                                    ? 'bg-teal-700/60 border border-teal-500/40 text-white rounded-tr-xs'
                                    : 'bg-[#1c2128] text-white border border-[#30363d] rounded-tl-xs'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold truncate" title={msg.fileName || msg.text}>
                                      {msg.fileName || msg.text}
                                    </div>
                                    <div className="text-[10px] text-[#8b949e] font-mono">
                                      {msg.fileSize || 'Attachment'}
                                    </div>
                                  </div>
                                  <a
                                    href={msg.mediaUrl}
                                    download={msg.fileName || 'download'}
                                    className="p-2 rounded-xl bg-[#0d1117] hover:bg-[#21262d] text-teal-400 hover:text-white transition-colors cursor-pointer shrink-0"
                                    title="Download File"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                                  isMe
                                    ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-tr-xs'
                                    : 'bg-[#1c2128] text-white border border-[#30363d] rounded-tl-xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {activeChatMessages.length === 0 && (
                      <div className="text-center py-12 px-4 rounded-2xl bg-[#0d1117]/60 border border-dashed border-[#30363d] flex flex-col items-center justify-center">
                        {selectedChatGroup ? (
                          <>
                            <div className="w-14 h-14 rounded-2xl mb-3 overflow-hidden bg-[#21262d] border border-[#30363d] flex items-center justify-center shadow-lg">
                              {selectedChatGroup.avatar ? (
                                <img
                                  src={selectedChatGroup.avatar}
                                  alt={selectedChatGroup.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="w-7 h-7 text-teal-400" />
                              )}
                            </div>
                            <h4 className="text-base sm:text-lg font-bold text-white mb-1">
                              Welcome to {selectedChatGroup.name}!
                            </h4>
                            <p className="text-xs text-[#8b949e] max-w-sm">
                              {selectedChatGroup.members.length} members in this group. Share text, photos, or documents to start collaborating!
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs sm:text-sm font-medium text-white mb-1">
                              No messages yet in this conversation
                            </p>
                            <p className="text-xs text-[#8b949e]">
                              Send a text, photo, or document to practice English with {selectedChatUser?.name}!
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleDocFileChange}
                  />

                  <div className="mt-4 pt-3 border-t border-[#30363d]">
                    <form
                      onSubmit={handleSendChatMessage}
                      className="flex flex-col bg-[#0d1117] border border-[#30363d] rounded-2xl p-1.5 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-400/30 transition-all shadow-inner"
                    >
                      {pendingAttachment && (
                        <div className="m-1 p-2 rounded-xl bg-[#161b22] border border-teal-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {pendingAttachment.type === 'image' ? (
                              <img
                                src={pendingAttachment.dataUrl}
                                alt="Preview"
                                className="w-10 h-10 rounded-lg object-cover border border-[#30363d] shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-[320px]">
                                {pendingAttachment.fileName}
                              </div>
                              <div className="text-[10px] text-[#8b949e]">
                                {pendingAttachment.fileSize} • Ready to send
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingAttachment(null)}
                            className="p-1.5 rounded-lg text-[#8b949e] hover:text-rose-400 hover:bg-[#21262d] transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2">
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="p-2 rounded-xl text-[#8b949e] hover:text-teal-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                            title="Attach Photo"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-xl text-[#8b949e] hover:text-indigo-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                            title="Attach File"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={chatMessageText}
                          onChange={(e) => setChatMessageText(e.target.value)}
                          placeholder={
                            pendingAttachment
                              ? 'Add an optional caption, or press Send...'
                              : selectedChatGroup
                              ? `Message #${selectedChatGroup.name}...`
                              : `Type message to ${selectedChatUser?.name}...`
                          }
                          className="flex-1 bg-transparent border-0 outline-none px-2 py-2 text-xs sm:text-sm text-white placeholder-[#8b949e] focus:outline-none focus:ring-0 min-w-0"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!chatMessageText.trim() && !pendingAttachment}
                          className="px-4 sm:px-5 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-30 disabled:hover:bg-teal-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md shadow-teal-900/40 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Send</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'AI' && (
            <AiHub
              onNotify={(msg) => {
                setReportNotification(msg);
                setTimeout(() => setReportNotification(null), 3000);
              }}
              activeMode={aiActiveMode}
              onChangeActiveMode={setAiActiveMode}
            />
          )}

          {activeTab === 'GAMES' && (
            <GamesHub
              onBack={() => {
                if (isExamMode) {
                  handleExamLockedNotice('مغادرة الاختبار (Exam Exit)');
                  return;
                }
                setActiveTab(null);
              }}
              currentUser={username}
              studentName={studentName}
              userAvatar={userAvatar}
              onExamStateChange={(inExam) => setIsExamMode(inExam)}
              onNotify={(msg) => {
                setReportNotification(msg);
                setTimeout(() => setReportNotification(null), 3000);
              }}
            />
          )}

          {activeTab === 'HOMEWORKS' && (
            <div
              id="project-homeworks"
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded-3xl p-4 sm:p-7 flex flex-col shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#30363d] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base sm:text-lg">Homeworks & Assignments</h3>
                    <p className="text-xs text-[#8b949e]">Submit speaking, writing, copywork, or ask questions</p>
                  </div>
                </div>
                {homeworkType !== 'select' && (
                  <button
                    onClick={() => {
                      setHomeworkType('select');
                      setHomeworkSubmittedSuccess(false);
                      setHomeworkInputText('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 px-3 py-1.5 rounded-xl hover:bg-indigo-900/80 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Types</span>
                  </button>
                )}
              </div>

              {homeworkType === 'select' ? (
                <div className="flex flex-col items-center py-6 sm:py-8 max-w-2xl mx-auto w-full">
                  <h3 className="font-['Space_Grotesk'] font-bold text-lg sm:text-xl text-amber-400 mb-6 text-center tracking-wide">
                    What type of homework would you like to submit?
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <button
                      onClick={() => setHomeworkType('speaking')}
                      className="group p-5 rounded-2xl bg-[#1c2128] border border-[#30363d] hover:border-amber-400 hover:bg-amber-950/20 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base mb-1">Speaking</h4>
                        <p className="text-xs text-[#8b949e]">Record or submit speaking practice and pronunciation tasks</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setHomeworkType('writing')}
                      className="group p-5 rounded-2xl bg-[#1c2128] border border-[#30363d] hover:border-purple-400 hover:bg-purple-950/20 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base mb-1">Writing</h4>
                        <p className="text-xs text-[#8b949e]">Submit essays, paragraphs, or sentence composition tasks</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setHomeworkType('copy')}
                      className="group p-5 rounded-2xl bg-[#1c2128] border border-[#30363d] hover:border-teal-400 hover:bg-teal-950/20 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base mb-1">Copy</h4>
                        <p className="text-xs text-[#8b949e]">Submit dictation, transcription, or copywork exercises</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setHomeworkType('another')}
                      className="group p-5 rounded-2xl bg-[#1c2128] border border-[#30363d] hover:border-indigo-400 hover:bg-indigo-950/20 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base mb-1">Another question</h4>
                        <p className="text-xs text-[#8b949e]">Ask any custom question or request feedback on general tasks</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : homeworkType === 'speaking' ? (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-[#161b22] border border-[#30363d] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto">
                    <button
                      onClick={() => {
                        setHomeworkType('select');
                        setSpeakingVideos([]);
                        setSpeakingNotes('');
                        setSpeakingSubmitted(false);
                      }}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-['Space_Grotesk'] font-bold text-lg sm:text-xl text-amber-400">
                          Speaking Homework Submission
                        </h3>
                        <p className="text-xs text-[#8b949e]">Upload your video recordings and add notes for your teacher</p>
                      </div>
                    </div>

                    {speakingSubmitted ? (
                      <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-lg">Speaking Homework Submitted Successfully!</h4>
                        <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                          Your video files ({speakingVideos.length} attached) and teacher notes have been securely recorded in the cloud database.
                        </p>
                        <button
                          onClick={() => {
                            setHomeworkType('select');
                            setSpeakingVideos([]);
                            setSpeakingNotes('');
                            setSpeakingSubmitted(false);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0d1117] font-bold text-xs transition-all cursor-pointer shadow-md"
                        >
                          Close & Return
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-white flex items-center justify-between">
                            <span>1. Attach Video(s) (Multiple videos allowed, any length):</span>
                            <span className="text-[11px] text-amber-400">{speakingVideos.length} selected</span>
                          </label>
                          <label className="border-2 border-dashed border-[#30363d] hover:border-amber-400/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0d1117] transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Paperclip className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-white">Click to browse or drag & drop video files</span>
                            <span className="text-[10px] text-[#8b949e]">MP4, MOV, WEBM, AVI (Long videos supported)</span>
                            <input
                              type="file"
                              multiple
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  const filesArray = Array.from(e.target.files);
                                  setSpeakingVideos((prev) => [...prev, ...filesArray]);
                                }
                              }}
                            />
                          </label>

                          {speakingVideos.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {speakingVideos.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl text-xs">
                                  <span className="text-white truncate max-w-[320px]">{file.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-[#8b949e]">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    <button
                                      type="button"
                                      onClick={() => setSpeakingVideos(speakingVideos.filter((_, i) => i !== idx))}
                                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-white">
                            2. Notes for the teacher:
                          </label>
                          <textarea
                            rows={4}
                            value={speakingNotes}
                            onChange={(e) => setSpeakingNotes(e.target.value)}
                            placeholder="Write any comments, questions, or notes for your teacher regarding your speaking recording..."
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-amber-400 transition-all resize-none shadow-inner"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#30363d]">
                          <button
                            type="button"
                            onClick={() => {
                              setHomeworkType('select');
                              setSpeakingVideos([]);
                              setSpeakingNotes('');
                              setSpeakingSubmitted(false);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#1c2128] border border-[#30363d] text-xs font-semibold text-[#8b949e] hover:text-white transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (speakingVideos.length === 0) {
                                alert('Please attach at least one video file before submitting.');
                                return;
                              }

                              setIsUploading(true);
                              setUploadProgress(5);

                              // Simulate progress since FileReader doesn't have consistent progress for DataURLs
                              const progressInt = setInterval(() => {
                                setUploadProgress(prev => {
                                  if (prev >= 90) return prev;
                                  return prev + 5;
                                });
                              }, 300);

                              try {
                                const processedFiles = await Promise.all(
                                  speakingVideos.map(async (file) => {
                                    return new Promise<{ name: string; size: string; type: string; url: string }>((resolve) => {
                                      const reader = new FileReader();
                                      reader.onload = (e) => {
                                        resolve({
                                          name: file.name,
                                          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                                          type: file.type || 'video/mp4',
                                          url: (e.target?.result as string) || '',
                                        });
                                      };
                                      reader.onerror = () => {
                                        resolve({
                                          name: file.name,
                                          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                                          type: file.type || 'video/mp4',
                                          url: '',
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    });
                                  })
                                );

                                setUploadProgress(95);

                                await saveHomeworkSubmission({
                                  id: 'hw_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                  studentUsername: username,
                                  studentName: profile?.name || username,
                                  type: 'speaking',
                                  notes: speakingNotes,
                                  files: processedFiles,
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  status: 'pending',
                                });

                                setUploadProgress(100);
                                setTimeout(() => {
                                  clearInterval(progressInt);
                                  setIsUploading(false);
                                  setSpeakingSubmitted(true);
                                  setUploadProgress(0);
                                }, 500);
                              } catch (err) {
                                clearInterval(progressInt);
                                setIsUploading(false);
                                alert('Error uploading files. Please try again.');
                              }
                            }}
                            disabled={speakingVideos.length === 0}
                            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0d1117] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                          >
                            SUBMIT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
               ) : (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-[#161b22] border border-[#30363d] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[calc(100vh-2rem)] overflow-y-auto">
                    <button
                      onClick={() => {
                        setHomeworkType('select');
                        setHomeworkImages([]);
                        setHomeworkNotes('');
                        setHomeworkModalSubmitted(false);
                      }}
                      className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:text-white flex items-center justify-center cursor-pointer transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-['Space_Grotesk'] font-bold text-lg sm:text-xl text-purple-400 capitalize">
                          {homeworkType} Homework Submission
                        </h3>
                        <p className="text-xs text-[#8b949e]">Upload your image attachments and add notes for your teacher</p>
                      </div>
                    </div>

                    {homeworkModalSubmitted ? (
                      <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-white text-lg capitalize">{homeworkType} Homework Submitted Successfully!</h4>
                        <p className="text-xs text-[#8b949e] max-w-md mx-auto">
                          Your image files ({homeworkImages.length} attached) and teacher notes have been securely recorded in the cloud database.
                        </p>
                        <button
                          onClick={() => {
                            setHomeworkType('select');
                            setHomeworkImages([]);
                            setHomeworkNotes('');
                            setHomeworkModalSubmitted(false);
                          }}
                          className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-[#0d1117] font-bold text-xs transition-all cursor-pointer shadow-md"
                        >
                          Close & Return
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-white flex items-center justify-between">
                            <span>1. Attach Image(s) (Multiple images allowed):</span>
                            <span className="text-[11px] text-purple-400">{homeworkImages.length} selected</span>
                          </label>
                          <label className="border-2 border-dashed border-[#30363d] hover:border-purple-400/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#0d1117] transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-semibold text-white">Click to browse or drag & drop image files</span>
                            <span className="text-[10px] text-[#8b949e]">PNG, JPG, WEBP, HEIC</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files) {
                                  const filesArray = Array.from(e.target.files);
                                  setHomeworkImages((prev) => [...prev, ...filesArray]);
                                }
                              }}
                            />
                          </label>

                          {homeworkImages.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {homeworkImages.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl text-xs">
                                  <span className="text-white truncate max-w-[320px]">{file.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-[#8b949e]">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    <button
                                      type="button"
                                      onClick={() => setHomeworkImages(homeworkImages.filter((_, i) => i !== idx))}
                                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-white">
                            2. Notes for the teacher:
                          </label>
                          <textarea
                            rows={4}
                            value={homeworkNotes}
                            onChange={(e) => setHomeworkNotes(e.target.value)}
                            placeholder="Write any comments, questions, or notes for your teacher regarding your submission..."
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-purple-400 transition-all resize-none shadow-inner"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#30363d]">
                          <button
                            type="button"
                            onClick={() => {
                              setHomeworkType('select');
                              setHomeworkImages([]);
                              setHomeworkNotes('');
                              setHomeworkModalSubmitted(false);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#1c2128] border border-[#30363d] text-xs font-semibold text-[#8b949e] hover:text-white transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (homeworkImages.length === 0) {
                                alert('Please attach at least one image file before submitting.');
                                return;
                              }

                              setIsUploading(true);
                              setUploadProgress(5);

                              const progressInt = setInterval(() => {
                                setUploadProgress(prev => {
                                  if (prev >= 90) return prev;
                                  return prev + 5;
                                });
                              }, 300);

                              try {
                                const processedFiles = await Promise.all(
                                  homeworkImages.map(async (file) => {
                                    return new Promise<{ name: string; size: string; type: string; url: string }>((resolve) => {
                                      const reader = new FileReader();
                                      reader.onload = (e) => {
                                        resolve({
                                          name: file.name,
                                          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                                          type: file.type || 'image/jpeg',
                                          url: (e.target?.result as string) || '',
                                        });
                                      };
                                      reader.onerror = () => {
                                        resolve({
                                          name: file.name,
                                          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                                          type: file.type || 'image/jpeg',
                                          url: '',
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    });
                                  })
                                );

                                setUploadProgress(95);

                                await saveHomeworkSubmission({
                                  id: 'hw_' + Date.now() + Math.random().toString(36).substr(2, 5),
                                  studentUsername: username,
                                  studentName: profile?.name || username,
                                  type: homeworkType as any,
                                  notes: homeworkNotes,
                                  files: processedFiles,
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  status: 'pending',
                                });

                                setUploadProgress(100);
                                setTimeout(() => {
                                  clearInterval(progressInt);
                                  setIsUploading(false);
                                  setHomeworkModalSubmitted(true);
                                  setUploadProgress(0);
                                }, 500);
                              } catch (err) {
                                clearInterval(progressInt);
                                setIsUploading(false);
                                alert('Error uploading files. Please try again.');
                              }
                            }}
                            disabled={homeworkImages.length === 0}
                            className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-[#0d1117] font-bold text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                          >
                            SUBMIT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        <div
          className="w-[6px] self-stretch flex items-center justify-center select-none pointer-events-none relative z-10 shrink-0 bg-transparent"
          aria-hidden="true"
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 6 1000"
            preserveAspectRatio="none"
          >
            <line x1="3" y1="0" x2="3" y2="1000" stroke="#000000" strokeWidth="6" opacity="0.98" />
            <line x1="3" y1="0" x2="3" y2="1000" stroke="#000000" strokeWidth="3" />
          </svg>
        </div>

        {/* SIDEBAR */}
        <aside
          id="right-buttons-dock"
          className="hidden lg:flex lg:w-64 bg-[#161b22] p-3.5 flex-col justify-between gap-3 shrink-0 shadow-2xl z-20 border-l border-[#30363d] overflow-y-auto min-h-0"
        >
          <div className="flex flex-col gap-2.5">
            <div className="text-left pb-1.5 border-b border-[#30363d]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                Navigation
              </span>
            </div>

            <button
              id="btn-nav-chat"
              type="button"
              onClick={() => {
                if (isExamMode) {
                  handleExamLockedNotice('قسم الدردشة (CHAT)');
                  return;
                }
                setActiveTab(activeTab === 'CHAT' ? null : 'CHAT');
              }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 relative ${
                isExamMode
                  ? 'bg-[#161b22] text-[#8b949e] border-rose-500/40 opacity-70 cursor-not-allowed'
                  : activeTab === 'CHAT'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white border-teal-300 shadow-lg shadow-teal-950/70 scale-[1.01] cursor-pointer'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-teal-500/60 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'CHAT' ? 'bg-black/30 border border-teal-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <Users className="icon-responsive text-teal-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="tracking-wide block truncate">CHAT</span>
                    {isExamMode && <Lock className="w-3 h-3 text-rose-500 animate-pulse shrink-0" />}
                  </div>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">
                    {isExamMode ? '🔒 مغلق أثناء الاختبار' : 'Chat & Groups'}
                  </span>
                </div>
              </div>
              <span
                className={`capsule-responsive shrink-0 flex items-center gap-1 ${
                  isExamMode
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50 font-semibold'
                    : activeTab === 'CHAT'
                    ? 'bg-white/25 text-white font-semibold'
                    : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                }`}
              >
                {isExamMode ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-rose-500" />
                    <span>Locked</span>
                  </>
                ) : activeTab === 'CHAT' ? (
                  'Open'
                ) : (
                  'View'
                )}
              </span>
            </button>

            <button
              id="btn-nav-ai"
              type="button"
              onClick={() => {
                if (isExamMode) {
                  handleExamLockedNotice('قسم الذكاء الاصطناعي (AI)');
                  return;
                }
                setActiveTab(activeTab === 'AI' ? null : 'AI');
                setAiActiveMode(null);
              }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 relative ${
                isExamMode
                  ? 'bg-[#161b22] text-[#8b949e] border-rose-500/40 opacity-70 cursor-not-allowed'
                  : activeTab === 'AI'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#0d1117] border-amber-200 shadow-lg shadow-amber-950/70 scale-[1.01] cursor-pointer'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-amber-500/60 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'AI' ? 'bg-black/30 border border-amber-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <Bot className="icon-responsive text-amber-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="tracking-wide block truncate">AI</span>
                    {isExamMode && <Lock className="w-3 h-3 text-rose-500 animate-pulse shrink-0" />}
                  </div>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">
                    {isExamMode ? '🔒 مغلق أثناء الاختبار' : 'Speaking & Calls'}
                  </span>
                </div>
              </div>
              <span
                className={`capsule-responsive shrink-0 flex items-center gap-1 ${
                  isExamMode
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50 font-semibold'
                    : activeTab === 'AI'
                    ? 'bg-black/30 text-[#0d1117] font-bold'
                    : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                }`}
              >
                {isExamMode ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-rose-500" />
                    <span>Locked</span>
                  </>
                ) : activeTab === 'AI' ? (
                  'Open'
                ) : (
                  'View'
                )}
              </span>
            </button>

            <button
              id="btn-nav-homeworks"
              type="button"
              onClick={() => {
                if (isExamMode) {
                  handleExamLockedNotice('قسم الواجبات (HOMEWORKS)');
                  return;
                }
                setActiveTab(activeTab === 'HOMEWORKS' ? null : 'HOMEWORKS');
              }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 relative ${
                isExamMode
                  ? 'bg-[#161b22] text-[#8b949e] border-rose-500/40 opacity-70 cursor-not-allowed'
                  : activeTab === 'HOMEWORKS'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-300 shadow-lg shadow-indigo-950/70 scale-[1.01] cursor-pointer'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-indigo-500/60 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'HOMEWORKS' ? 'bg-black/30 border border-indigo-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <GraduationCap className="icon-responsive text-indigo-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="tracking-wide block whitespace-nowrap text-[11px]">HOMEWORKS</span>
                    {isExamMode && <Lock className="w-3 h-3 text-rose-500 animate-pulse shrink-0" />}
                  </div>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">
                    {isExamMode ? '🔒 مغلق أثناء الاختبار' : 'Lessons & Tasks'}
                  </span>
                </div>
              </div>
              <span
                className={`capsule-responsive shrink-0 flex items-center gap-1 ${
                  isExamMode
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50 font-semibold'
                    : activeTab === 'HOMEWORKS'
                    ? 'bg-white/25 text-white font-semibold'
                    : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                }`}
              >
                {isExamMode ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-rose-500" />
                    <span>Locked</span>
                  </>
                ) : activeTab === 'HOMEWORKS' ? (
                  'Open'
                ) : (
                  'View'
                )}
              </span>
            </button>

            <button
              id="btn-nav-games"
              type="button"
              onClick={() => {
                if (isExamMode) return;
                setActiveTab(activeTab === 'GAMES' ? null : 'GAMES');
                setGameModeType('select');
                setGamePlaying(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'GAMES'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-300 shadow-lg shadow-emerald-950/70 scale-[1.01]'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-emerald-500/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'GAMES' ? 'bg-black/30 border border-emerald-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <Gamepad2 className="icon-responsive text-emerald-400" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="tracking-wide block whitespace-nowrap text-[11px]">GAMES</span>
                    {isExamMode && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold border border-amber-500/40">
                        Exam Active
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">
                    {isExamMode ? '⚔️ Ranked / Practice in progress' : 'Ranked & Practice'}
                  </span>
                </div>
              </div>
              <span
                className={`capsule-responsive shrink-0 ${
                  activeTab === 'GAMES' ? 'bg-white/25 text-white font-semibold' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                }`}
              >
                {isExamMode ? 'Active' : activeTab === 'GAMES' ? 'Open' : 'View'}
              </span>
            </button>
          </div>

          <div className="mt-auto pt-3 border-t border-[#30363d] flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white font-semibold text-xs truncate">
                <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">{studentName}</span>
              </div>
              <span className="text-[10px] text-teal-400 font-mono">@{username}</span>
            </div>
            <button
              id="btn-open-my-profile"
              type="button"
              onClick={() => {
                if (isExamMode) {
                  handleExamLockedNotice('الملف الشخصي (Profile)');
                  return;
                }
                setIsProfileModalOpen(true);
              }}
              className={`group w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all duration-200 relative ${
                isExamMode
                  ? 'bg-[#161b22] border-rose-500/40 opacity-70 cursor-not-allowed'
                  : 'bg-[#1c2128] hover:bg-[#22272e] border-[#30363d] hover:border-pink-500/60 cursor-pointer shadow-md hover:shadow-pink-950/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <div className="p-[1.5px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-[#262626] flex items-center justify-center border border-[#161b22]">
                      {userAvatar === 'default' || !userAvatar ? (
                        <svg viewBox="0 0 100 100" className="w-full h-full text-[#8e8e8e]">
                          <circle cx="50" cy="38" r="20" fill="currentColor" />
                          <path d="M18 88 C18 64 32 57 50 57 C68 57 82 64 82 88 Z" fill="currentColor" />
                        </svg>
                      ) : (
                        <img src={userAvatar} alt={studentName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-['Space_Grotesk'] font-bold text-xs text-white group-hover:text-pink-300 transition-colors block truncate">
                      My profile
                    </span>
                    {isExamMode && <Lock className="w-3 h-3 text-rose-500 animate-pulse shrink-0" />}
                  </div>
                  <span className="text-[9px] text-[#8b949e] block font-sans truncate">
                    {isExamMode ? '🔒 مغلق أثناء الاختبار' : 'View avatar'}
                  </span>
                </div>
              </div>
              <span className={`capsule-responsive font-semibold shrink-0 flex items-center gap-1 ${
                isExamMode
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                  : 'bg-pink-950/70 text-pink-300 border border-pink-700/50 group-hover:bg-pink-600 group-hover:text-white transition-all'
              }`}>
                {isExamMode ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-rose-500" />
                    <span>Locked</span>
                  </>
                ) : (
                  'Open'
                )}
              </span>
            </button>
            {profile && (
              <div className="text-[10px] text-[#8b949e] px-1 space-y-0.5">
                <div>Age: {profile.age} • Born: {profile.yearBorn}</div>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verified Student</span>
            </div>
          </div>
        </aside>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav
          id="mobile-bottom-nav"
          className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#161b22] border-t border-[#30363d] flex items-center justify-around px-2 z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
        >
          {/* Overview Tab Button */}
          <button
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الصفحة الرئيسية (Home)');
                return;
              }
              setActiveTab(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 relative ${
              isExamMode
                ? 'text-[#8b949e]/60 cursor-not-allowed opacity-75'
                : activeTab === null
                ? 'text-teal-400 font-bold active:scale-90'
                : 'text-[#8b949e] hover:text-white active:scale-90'
            }`}
          >
            <div className="relative">
              <Home className="w-5 h-5" />
              {isExamMode && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                  <Lock className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide font-bold">Home</span>
          </button>

          {/* Chat Tab Button */}
          <button
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الدردشة (Chat)');
                return;
              }
              setActiveTab('CHAT');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 relative ${
              isExamMode
                ? 'text-[#8b949e]/60 cursor-not-allowed opacity-75'
                : activeTab === 'CHAT'
                ? 'text-teal-400 font-bold active:scale-90'
                : 'text-[#8b949e] hover:text-white active:scale-90'
            }`}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {isExamMode && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                  <Lock className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide font-bold">Chat</span>
          </button>

          {/* AI Tab Button */}
          <button
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الذكاء الاصطناعي (AI Tutor)');
                return;
              }
              setActiveTab('AI');
              setAiActiveMode(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 relative ${
              isExamMode
                ? 'text-[#8b949e]/60 cursor-not-allowed opacity-75'
                : activeTab === 'AI'
                ? 'text-amber-400 font-bold active:scale-90'
                : 'text-[#8b949e] hover:text-white active:scale-90'
            }`}
          >
            <div className="relative">
              <Bot className="w-5 h-5" />
              {isExamMode && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                  <Lock className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide font-bold font-['Space_Grotesk']">AI Tutor</span>
          </button>

          {/* Homeworks Tab Button */}
          <button
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الواجبات (Homeworks)');
                return;
              }
              setActiveTab('HOMEWORKS');
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 relative ${
              isExamMode
                ? 'text-[#8b949e]/60 cursor-not-allowed opacity-75'
                : activeTab === 'HOMEWORKS'
                ? 'text-indigo-400 font-bold active:scale-90'
                : 'text-[#8b949e] hover:text-white active:scale-90'
            }`}
          >
            <div className="relative">
              <GraduationCap className="w-5 h-5" />
              {isExamMode && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                  <Lock className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide font-bold">Homeworks</span>
          </button>

          {/* Games Tab Button */}
          <button
            onClick={() => {
              setActiveTab('GAMES');
              if (!isExamMode) {
                setGameModeType('select');
                setGamePlaying(false);
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 active:scale-90 ${
              activeTab === 'GAMES'
                ? 'text-emerald-400 font-bold'
                : 'text-[#8b949e] hover:text-white'
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-[10px] tracking-wide font-bold">
              {isExamMode ? 'Exam ⚔️' : 'Games'}
            </span>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => {
              if (isExamMode) {
                handleExamLockedNotice('الملف الشخصي (Profile)');
                return;
              }
              setIsProfileModalOpen(true);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 relative ${
              isExamMode
                ? 'text-[#8b949e]/60 cursor-not-allowed opacity-75'
                : 'text-[#8b949e] hover:text-white active:scale-90'
            }`}
          >
            <div className="relative">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-[#30363d] bg-[#21262d]">
                {userAvatar === 'default' || !userAvatar ? (
                  <User className="w-full h-full p-0.5 text-[#8b949e]" />
                ) : (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                )}
              </div>
              {isExamMode && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] shadow-sm">
                  <Lock className="w-2 h-2 text-white" />
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-wide font-bold">Profile</span>
          </button>
        </nav>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        username={username}
        studentName={studentName}
        profile={profile}
        currentUsername={username}
        isReadOnly={false}
        onAvatarChange={(newAvatar) => setUserAvatar(newAvatar)}
      />

      {viewingProfileUser && (
        <UserProfileModal
          isOpen={!!viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          username={viewingProfileUser.username}
          studentName={viewingProfileUser.name}
          initialAvatar={viewingProfileUser.avatar}
          initialBio={viewingProfileUser.bio}
          profile={{
            name: viewingProfileUser.name,
            age: viewingProfileUser.age ?? 18,
            yearBorn: viewingProfileUser.yearBorn ?? 2006,
            completedAt: '',
            bio: viewingProfileUser.bio,
            avatar: viewingProfileUser.avatar,
            honor: viewingProfileUser.honor,
            level: viewingProfileUser.level,
            exp: viewingProfileUser.exp,
          }}
          isReadOnly={true}
          currentUsername={username}
          onSendMessage={() => {
            setSelectedChatGroup(null);
            setSelectedChatUser(viewingProfileUser);
            setActiveTab('CHAT');
            setViewingProfileUser(null);
          }}
        />
      )}

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={username}
        allMembers={registeredMembers}
        onCreateGroup={handleCreateGroup}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onAccept={handleAcceptNotification}
        onDecline={handleDeclineNotification}
        onDelete={handleDeleteNotification}
      />

      {reportNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-teal-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{reportNotification}</span>
        </div>
      )}

      {lightboxImage && (
        <ImageLightboxModal
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          senderName={lightboxImage.senderName}
          time={lightboxImage.time}
          caption={lightboxImage.caption}
        />
      )}
      {levelUpCelebration && (
        <LevelUpModal
          oldLevel={levelUpCelebration.oldLevel}
          newLevel={levelUpCelebration.newLevel}
          totalExp={levelUpCelebration.totalExp}
          studentName={levelUpCelebration.studentName}
          onClose={() => setLevelUpCelebration(null)}
        />
      )}

      {isUploading && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-[#30363d]" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" 
                style={{ animationDuration: '1.5s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{uploadProgress}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Uploading file...</h3>
              <p className="text-xs text-[#8b949e]">Please wait, your video is being processed and uploaded to the database</p>
            </div>

            <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
