import { useState, useEffect, FormEvent, useRef } from 'react';
import {
  GraduationCap,
  LogOut,
  Sparkles,
  Send,
  UserCheck,
  CheckCircle2,
  X,
  Users,
  Image as ImageIcon,
  Paperclip,
  FileText,
  Mic,
  Shield,
  BookOpen,
  Award,
  Clock,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { StudentProfile, RegisteredUserProfile, ChatMessage, ChatGroup } from '../types';
import {
  getRegisteredMembers,
  getConversationMessages,
  getGroupMessages,
  getChatGroupsForUser,
  createChatGroup,
  saveChatMessage,
  syncWithServerDatabase,
  getAllProfiles,
  getAllHomeworkSubmissions,
  updateHomeworkStatus,
  HomeworkSubmission,
} from '../services/storage';
import UserProfileModal from './UserProfileModal';
import { AiHub, AiMode } from './AiHub';
import CreateGroupModal from './CreateGroupModal';
import { ImageLightboxModal } from './ImageLightboxModal';

interface TeacherDashboardProps {
  username: string;
  onLogout: () => void;
}

export default function TeacherDashboard({ username, onLogout }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<'CHAT' | 'AI' | 'STUDENT_HOMEWORKS' | null>(null);
  const [aiActiveMode, setAiActiveMode] = useState<AiMode>(null);

  const [registeredMembers, setRegisteredMembers] = useState<RegisteredUserProfile[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<RegisteredUserProfile | null>(null);
  const [selectedChatGroup, setSelectedChatGroup] = useState<ChatGroup | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessageText, setChatMessageText] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem(`user_avatar_${username}`) || 'default';
  });
  const [reportNotification, setReportNotification] = useState<string | null>(null);
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
        setOnlineUsers((prev) => (prev.length > 0 ? prev : [myKey]));
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);

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

  // Student Homeworks state
  const [selectedStudentForHomework, setSelectedStudentForHomework] = useState<RegisteredUserProfile | null>(null);
  const [homeworkTypeFilter, setHomeworkTypeFilter] = useState<'all' | 'speaking' | 'writing' | 'copy' | 'other'>('all');
  const [allHomeworks, setAllHomeworks] = useState<HomeworkSubmission[]>([]);
  const [managingStudent, setManagingStudent] = useState<RegisteredUserProfile | null>(null);
  const [reviewingHomework, setReviewingHomework] = useState<HomeworkSubmission | null>(null);

  const [pendingAttachment, setPendingAttachment] = useState<{
    type: 'image' | 'file';
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    senderName?: string;
    time?: string;
    caption?: string;
    fileType?: string;
  } | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allProfiles = getAllProfiles();

  useEffect(() => {
    const init = async () => {
      await syncWithServerDatabase(username);
      setRegisteredMembers(getRegisteredMembers(username));
      setChatGroups(getChatGroupsForUser(username));
      const hws = await getAllHomeworkSubmissions();
      setAllHomeworks(hws);
    };
    init();
  }, [username]);

  // Load messages for selected chat or group
  useEffect(() => {
    if (selectedChatUser) {
      const msgs = getConversationMessages(username, selectedChatUser.username);
      setChatMessages(msgs);
    } else if (selectedChatGroup) {
      const msgs = getGroupMessages(selectedChatGroup.id);
      setChatMessages(msgs);
    } else {
      setChatMessages([]);
    }
  }, [selectedChatUser, selectedChatGroup, username]);

// Poll messages, members and homeworks
useEffect(() => {
  const timer = setInterval(() => {
    // Sync with server first
    syncWithServerDatabase(username).then(() => {
      if (selectedChatUser) {
        setChatMessages(getConversationMessages(username, selectedChatUser.username));
      } else if (selectedChatGroup) {
        setChatMessages(getGroupMessages(selectedChatGroup.id));
      }
      
      // Update members and homeworks in background
      setRegisteredMembers(getRegisteredMembers(username));
      getAllHomeworkSubmissions().then(hws => setAllHomeworks(hws));
    });
  }, 3000);
  return () => clearInterval(timer);
}, [selectedChatUser, selectedChatGroup, username]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() && !pendingAttachment) return;

    const recipient = selectedChatGroup ? selectedChatGroup.id : (selectedChatUser?.username || '');
    
    const options: any = {
      isStudent: false,
      senderAvatar: userAvatar,
      groupId: selectedChatGroup ? selectedChatGroup.id : undefined,
      type: pendingAttachment ? (pendingAttachment.type === 'image' ? 'image' : 'file') : 'text',
      fileName: pendingAttachment?.fileName,
      fileSize: pendingAttachment?.fileSize
    };

    const newMsg = await saveChatMessage(
      username,
      'Prof. Ahmed',
      recipient,
      chatMessageText.trim(),
      options
    );

    setChatMessages((prev) => [...prev, newMsg]);
    setChatMessageText('');
    setPendingAttachment(null);
  };

  const handleCreateGroup = async (groupData: { name: string; avatar?: string; members: string[] }) => {
    const newGroup = await createChatGroup(groupData.name, groupData.avatar, username, groupData.members);
    setChatGroups(getChatGroupsForUser(username));
    setSelectedChatGroup(newGroup);
    setSelectedChatUser(null);
    setIsCreateGroupOpen(false);
  };

  const handleGradeHomework = async (subId: string, status: 'accepted' | 'rejected') => {
    await updateHomeworkStatus(subId, status);
    const hws = await getAllHomeworkSubmissions();
    setAllHomeworks(hws);
    setReportNotification(`Homework ${status === 'accepted' ? 'accepted successfully!' : 'rejected.'}`);
    setTimeout(() => setReportNotification(null), 3000);
  };

  const filteredMembers = registeredMembers.filter((m) =>
    m.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
    m.username.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  return (
    <div id="teacher-dashboard" className="min-h-screen bg-[#0d1117] text-white flex flex-col font-sans select-none overflow-hidden h-screen">
      {/* 1. TOP NAVBAR */}
      <header className="h-16 bg-[#161b22] border-b border-[#30363d] px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-950/50">
            <Shield className="w-5 h-5 text-[#0d1117]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Space_Grotesk'] font-bold text-base sm:text-lg text-white tracking-wide">
                Teacher Management Portal
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                ADMIN / TEACHER
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[10px] text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{Math.max(1, onlineUsers.length)} Online</span>
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e]">Welcome back, Professor Ahmed</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c2128] border border-[#30363d] hover:border-amber-400 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              A
            </div>
            <span className="text-xs font-semibold text-white hidden sm:inline">Ahmed Teacher</span>
          </button>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="btn-responsive text-[#8b949e] hover:text-rose-300 hover:bg-rose-950/45 hover:border-rose-800/60"
            title="Sign out"
          >
            <LogOut className="icon-responsive" />
            <span className="hidden sm:inline">Logout</span>
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
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {activeTab ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[#8b949e]">Active Section:</span>
                      <span className="text-amber-400 font-bold">{activeTab}</span>
                    </span>
                  ) : (
                    <span>Select a tab from the right navigation panel to get started</span>
                  )}
                </span>
              </div>
              {activeTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="text-xs font-semibold text-[#8b949e] hover:text-white bg-[#1c2128] border border-[#30363d] px-3 py-1 rounded-lg cursor-pointer transition-all"
                >
                  Close View
                </button>
              )}
            </div>
          )}

          {!activeTab && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#161b22] border border-[#30363d] rounded-3xl shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 font-['Space_Grotesk']">
                Teacher Control Center
              </h2>
              <p className="text-xs sm:text-sm text-[#8b949e] max-w-md mx-auto mb-6">
                Manage student conversations, evaluate homework submissions in the Teacher Hub, or interact with Gemini AI assistants.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setActiveTab('CHAT')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                >
                  Open Chat & Groups
                </button>
                <button
                  onClick={() => setActiveTab('STUDENT_HOMEWORKS')}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0d1117] font-bold text-xs transition-all cursor-pointer shadow-md"
                >
                  Open Teacher Hub & Submissions
                </button>
              </div>
            </div>
          )}

          {activeTab === 'CHAT' && (
            <div
              id="project-chat"
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded-3xl flex flex-col md:flex-row shadow-2xl overflow-hidden min-h-0"
            >
              {/* CHAT SIDEBAR */}
              <div className="w-full md:w-80 bg-[#1c2128] border-b md:border-b-0 md:border-r border-[#30363d] flex flex-col shrink-0">
                <div className="p-3.5 border-b border-[#30363d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-white text-xs">Conversations & Groups</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="text-[11px] font-bold text-teal-400 bg-teal-950/80 border border-teal-800/60 px-2.5 py-1 rounded-lg hover:bg-teal-900 transition-all cursor-pointer"
                  >
                    + New Group
                  </button>
                </div>

                <div className="p-2 border-b border-[#30363d]">
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder="Search students..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-teal-400 transition-all"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {chatGroups.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e] px-2 mb-1 block">
                        Groups ({chatGroups.length})
                      </span>
                      {chatGroups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setSelectedChatGroup(g);
                            setSelectedChatUser(null);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            selectedChatGroup?.id === g.id
                              ? 'bg-teal-600 text-white font-bold shadow-md'
                              : 'hover:bg-[#22272e] text-white'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 font-bold text-xs">
                            #
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs block truncate">{g.name}</span>
                            <span className="text-[10px] opacity-75 block truncate">{g.members.length} members</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e] px-2 mb-1 block">
                      Students ({filteredMembers.length})
                    </span>
                    {filteredMembers.map((m) => (
                      <button
                        key={m.username}
                        type="button"
                        onClick={() => {
                          setSelectedChatUser(m);
                          setSelectedChatGroup(null);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          selectedChatUser?.username === m.username
                            ? 'bg-teal-600 text-white font-bold shadow-md'
                            : 'hover:bg-[#22272e] text-white'
                        }`}
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0d1117] border border-[#30363d] shrink-0 flex items-center justify-center">
                            {m.avatar && m.avatar !== 'default' ? (
                              <img src={m.avatar} alt={m.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-teal-400">{m.name.charAt(0)}</span>
                            )}
                          </div>
                          {onlineUsers.map(u => u.toLowerCase().trim()).includes(m.username.toLowerCase().trim()) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-[#161b22] rounded-full" title="Online now" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs block truncate">{m.name}</span>
                          <span className="text-[10px] opacity-75 block truncate">@{m.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHAT MAIN WINDOW */}
              <div className="flex-1 flex flex-col bg-[#161b22] min-w-0">
                {selectedChatUser || selectedChatGroup ? (
                  <>
                    <div className="p-3.5 border-b border-[#30363d] bg-[#1c2128] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#0d1117] border border-[#30363d] flex items-center justify-center font-bold text-teal-400">
                          {selectedChatGroup ? '#' : (
                            selectedChatUser?.avatar && selectedChatUser.avatar !== 'default' ? (
                              <img src={selectedChatUser.avatar} alt={selectedChatUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : selectedChatUser?.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs sm:text-sm">
                            {selectedChatGroup ? selectedChatGroup.name : selectedChatUser?.name}
                          </h4>
                          <p className="text-[10px] text-[#8b949e]">
                            {selectedChatGroup ? `Group chat (${selectedChatGroup.members.length} members)` : `@${selectedChatUser?.username} • Student`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8b949e]">
                          <Users className="w-10 h-10 mb-2 opacity-40" />
                          <p className="text-xs">No messages yet. Start the conversation with your student!</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.sender === username;
                          const senderProfile = registeredMembers.find(m => m.username.toLowerCase() === msg.sender.toLowerCase());
                          const profileAvatar = senderProfile?.avatar;
                          const messageAvatar = msg.senderAvatar;
                          const effectiveAvatar = (profileAvatar && profileAvatar !== 'default') ? profileAvatar : 
                                                  (messageAvatar && messageAvatar !== 'default') ? messageAvatar : 'default';

                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                {effectiveAvatar && effectiveAvatar !== 'default' ? (
                                  <img src={effectiveAvatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-[8px] font-bold shrink-0">
                                    {msg.senderName.charAt(0)}
                                  </div>
                                )}
                                <span className="text-[10px] font-semibold text-[#8b949e]">{msg.senderName}</span>
                                <span className="text-[9px] text-[#8b949e]/60">{msg.time}</span>
                              </div>
                              <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-md ${
                                  isMe
                                    ? 'bg-teal-600 text-white rounded-tr-sm'
                                    : 'bg-[#1c2128] border border-[#30363d] text-white rounded-tl-sm'
                                }`}
                              >
                                {msg.type !== 'text' && (
                                  <div
                                    onClick={() => {
                                      if (msg.type === 'image' && msg.mediaUrl) {
                                        setLightboxImage({
                                          url: msg.mediaUrl,
                                          senderName: msg.senderName,
                                          time: msg.time,
                                          caption: msg.text,
                                        });
                                      }
                                    }}
                                    className="mb-2 p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center gap-2 cursor-pointer hover:bg-black/30 transition-all"
                                  >
                                    {msg.type === 'image' ? <ImageIcon className="w-4 h-4 text-teal-300 shrink-0" /> : <Paperclip className="w-4 h-4 text-indigo-300 shrink-0" />}
                                    <div className="min-w-0 flex-1">
                                      <span className="font-semibold block truncate">{msg.fileName || 'Attachment'}</span>
                                      <span className="text-[10px] opacity-75">{msg.fileSize || 'Unknown size'}</span>
                                    </div>
                                  </div>
                                )}
                                {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-[#1c2128] border-t border-[#30363d] flex flex-col gap-2 shrink-0">
                      {pendingAttachment && (
                        <div className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-teal-400" />
                            <span className="text-white font-medium truncate max-w-[250px]">{pendingAttachment.fileName}</span>
                            <span className="text-[10px] text-[#8b949e]">({pendingAttachment.fileSize})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingAttachment(null)}
                            className="text-red-400 hover:text-red-300 font-bold text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={imageInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setPendingAttachment({
                                type: 'image',
                                fileName: file.name,
                                fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                              });
                            }
                          }}
                        />
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setPendingAttachment({
                                type: 'file',
                                fileName: file.name,
                                fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                              });
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="p-2 rounded-xl text-[#8b949e] hover:text-teal-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-xl text-[#8b949e] hover:text-indigo-400 hover:bg-[#161b22] transition-colors cursor-pointer"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>

                        <input
                          type="text"
                          value={chatMessageText}
                          onChange={(e) => setChatMessageText(e.target.value)}
                          placeholder="Type message to student..."
                          className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-teal-400 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!chatMessageText.trim() && !pendingAttachment}
                          className="btn-responsive bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white shadow-md"
                        >
                          <Send className="icon-responsive" />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#8b949e]">
                    <Users className="w-12 h-12 mb-3 opacity-30" />
                    <h3 className="font-bold text-white text-base mb-1">Select a Conversation</h3>
                    <p className="text-xs max-w-sm">Choose a student or a group from the sidebar to start messaging or reviewing student work.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'AI' && (
            <AiHub
              onNotify={(msg) => setReportNotification(msg)}
              activeMode={aiActiveMode}
              onChangeActiveMode={setAiActiveMode}
            />
          )}

          {activeTab === 'STUDENT_HOMEWORKS' && (
            <div
              id="student-homeworks-panel"
              className="flex-1 bg-[#161b22] border border-[#30363d] rounded-3xl p-6 sm:p-8 flex flex-col shadow-2xl overflow-y-auto space-y-6"
            >
              {!selectedStudentForHomework ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg font-['Space_Grotesk']">
                          Teacher Hub: Homework Submissions
                        </h3>
                        <p className="text-xs text-[#8b949e]">Review and grade student recordings and writing assignments</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        const hws = await getAllHomeworkSubmissions();
                        setAllHomeworks(hws);
                        setReportNotification("Data synced with server!");
                        setTimeout(() => setReportNotification(null), 2000);
                      }}
                      className="btn-responsive text-amber-400 bg-amber-950/40 border-amber-500/30 hover:bg-amber-900"
                    >
                      <Clock className="icon-responsive" />
                      <span>Sync Records</span>
                    </button>
                  </div>

                  <div className="pt-6 border-t border-[#30363d]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400" />
                        Filter by Student
                      </h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Search students by name or username..."
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {filteredMembers.length === 0 ? (
                    <div className="p-12 rounded-2xl bg-[#1c2128] border border-[#30363d] text-center text-[#8b949e]">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-xs">No registered students found.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredMembers.map((student) => {
                        const studentHws = allHomeworks.filter(h => h.studentUsername.toLowerCase() === student.username.toLowerCase());
                        const pendingHws = studentHws.filter(h => h.status === 'pending');

                        return (
                          <div
                            key={student.username}
                            className="p-4 rounded-2xl bg-[#1c2128] border border-[#30363d] hover:border-amber-500/40 shadow-sm flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#0d1117] border border-[#30363d] flex items-center justify-center font-bold text-amber-400 text-sm">
                                  {student.avatar && student.avatar !== 'default' ? (
                                    <img src={student.avatar} alt={student.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  ) : (
                                    student.name.charAt(0)
                                  )}
                                </div>
                                {onlineUsers.map(u => u.toLowerCase().trim()).includes(student.username.toLowerCase().trim()) && (
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#1c2128] rounded-full" title="Online now" />
                                )}
                                {pendingHws.length > 0 && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-[#0d1117] rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#1c2128]">
                                    {pendingHws.length}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-sm truncate">{student.name}</h5>
                                <span className="text-[11px] text-[#8b949e]">@{student.username}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => setManagingStudent(student)}
                              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0d1117] font-bold text-xs transition-all shadow-md active:scale-95"
                            >
                              Manage
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* DETAIL VIEW HEADER */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForHomework(null)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c2128] border border-[#30363d] text-xs font-semibold text-white hover:border-amber-400 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-amber-400" />
                      <span>Back to Students List</span>
                    </button>
                    <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-xl">
                      Student Record Review
                    </span>
                  </div>

                  {/* STUDENT INFO TABLE CARD */}
                  <div className="p-6 rounded-2xl bg-[#1c2128] border border-[#30363d] shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#0d1117] border border-[#30363d] flex items-center justify-center font-bold text-amber-400 text-xl shadow-inner">
                          {selectedStudentForHomework.avatar && selectedStudentForHomework.avatar !== 'default' ? (
                            <img src={selectedStudentForHomework.avatar} alt={selectedStudentForHomework.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            selectedStudentForHomework.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="font-['Space_Grotesk'] font-bold text-lg sm:text-xl text-white">
                            {selectedStudentForHomework.name}
                          </h3>
                          <p className="text-xs text-[#8b949e]">@{selectedStudentForHomework.username} • Enrolled Student</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChatUser(selectedStudentForHomework);
                            setSelectedChatGroup(null);
                            setActiveTab('CHAT');
                          }}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md"
                        >
                          Send Message
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#30363d]">
                      <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8b949e] block font-semibold mb-1">Student Name</span>
                        <span className="text-xs font-bold text-white">{selectedStudentForHomework.name}</span>
                      </div>
                      <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8b949e] block font-semibold mb-1">Student Age</span>
                        <span className="text-xs font-bold text-amber-400">{selectedStudentForHomework.age || allProfiles[selectedStudentForHomework.username.toLowerCase()]?.age || 'N/A'} years old</span>
                      </div>
                      <div className="bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8b949e] block font-semibold mb-1">Date of Birth (Year Born)</span>
                        <span className="text-xs font-bold text-indigo-400">{selectedStudentForHomework.yearBorn || allProfiles[selectedStudentForHomework.username.toLowerCase()]?.yearBorn || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* STUDENT HOMEWORKS SECTION */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#30363d]">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span>Student Homeworks & Submissions</span>
                      </h4>

                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                        {(['all', 'speaking', 'writing', 'copy', 'other'] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setHomeworkTypeFilter(type)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                              homeworkTypeFilter === type
                                ? 'bg-amber-500 text-[#0d1117] font-bold shadow-md'
                                : 'bg-[#1c2128] text-[#8b949e] hover:text-white border border-[#30363d]'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(() => {
                      const studentHws = allHomeworks.filter(h => {
                        const matchUser = h.studentUsername.toLowerCase() === selectedStudentForHomework.username.toLowerCase();
                        const matchType = homeworkTypeFilter === 'all' || h.type === homeworkTypeFilter;
                        return matchUser && matchType;
                      });

                      if (studentHws.length === 0) {
                        return (
                          <div className="p-12 rounded-2xl bg-[#1c2128] border border-[#30363d] text-center text-[#8b949e]">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="text-xs">No homework submissions found for this student under the selected filter.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {studentHws.map((hw) => (
                            <div key={hw.id} className="p-5 rounded-2xl bg-[#1c2128] border border-[#30363d] shadow-lg space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    {hw.type === 'speaking' ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-white text-sm capitalize">{hw.type} Homework Submission</h5>
                                    <span className="text-[10px] text-[#8b949e]">Submitted at {hw.timestamp}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {hw.status === 'accepted' ? (
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                      Accepted ✓
                                    </span>
                                  ) : hw.status === 'rejected' ? (
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                      Rejected ✗
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                      Pending Review
                                    </span>
                                  )}
                                </div>
                              </div>

                              {hw.notes && (
                                <div className="bg-[#0d1117] p-3.5 rounded-xl border border-[#30363d] text-xs text-white">
                                  <span className="text-[10px] uppercase font-bold text-[#8b949e] block mb-1">Student Notes:</span>
                                  <p className="whitespace-pre-wrap leading-relaxed">{hw.notes}</p>
                                </div>
                              )}

                              {hw.files && hw.files.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] uppercase font-bold text-[#8b949e] block">Attached Files / Media:</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {hw.files.map((file, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() => {
                                          setLightboxImage({
                                            url: file.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
                                            senderName: selectedStudentForHomework.name,
                                            time: hw.timestamp,
                                            caption: file.name,
                                            fileType: file.type,
                                          });
                                        }}
                                        className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all group"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                                          <div className="min-w-0">
                                            <span className="text-xs font-semibold text-white block truncate group-hover:text-amber-300">{file.name}</span>
                                            <span className="text-[10px] text-[#8b949e]">{file.size}</span>
                                          </div>
                                        </div>
                                        <span className="text-[10px] text-amber-400 font-semibold underline shrink-0">View</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* ACTION BUTTONS: GREEN CHECK & RED X */}
                              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#30363d]">
                                <span className="text-xs text-[#8b949e] font-semibold mr-auto">Teacher Action:</span>
                                <button
                                  type="button"
                                  onClick={() => handleGradeHomework(hw.id, 'rejected')}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/60 font-bold text-xs transition-all cursor-pointer shadow-md"
                                  title="Reject Homework"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Reject Homework (X)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGradeHomework(hw.id, 'accepted')}
                                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                                  title="Accept Homework"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Accept Homework (✓)</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
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
          <svg className="w-full h-full" viewBox="0 0 6 1000" preserveAspectRatio="none">
            <line x1="3" y1="0" x2="3" y2="1000" stroke="#000000" strokeWidth="6" opacity="0.98" />
            <line x1="3" y1="0" x2="3" y2="1000" stroke="#000000" strokeWidth="3" />
          </svg>
        </div>

        {/* SIDEBAR NAVIGATION */}
        <aside
          id="teacher-right-dock"
          className="w-52 sm:w-60 md:w-64 bg-[#161b22] p-2.5 sm:p-3.5 flex flex-col justify-between gap-3 shrink-0 shadow-2xl z-20 border-l border-[#30363d] overflow-y-auto min-h-0"
        >
          <div className="flex flex-col gap-2.5">
            <div className="text-left pb-1.5 border-b border-[#30363d]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
                Teacher Navigation
              </span>
            </div>

            <button
              id="btn-teacher-chat"
              type="button"
              onClick={() => setActiveTab(activeTab === 'CHAT' ? null : 'CHAT')}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'CHAT'
                  ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white border-teal-300 shadow-lg shadow-teal-950/70 scale-[1.01]'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-teal-500/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'CHAT' ? 'bg-black/30 border border-teal-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <Users className="icon-responsive text-teal-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="tracking-wide block truncate">CHAT</span>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">Chat & Groups</span>
                </div>
              </div>
              <span className={`capsule-responsive shrink-0 ${activeTab === 'CHAT' ? 'bg-white/25 text-white font-semibold' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'}`}>
                {activeTab === 'CHAT' ? 'Open' : 'View'}
              </span>
            </button>

            <button
              id="btn-teacher-ai"
              type="button"
              onClick={() => {
                setActiveTab(activeTab === 'AI' ? null : 'AI');
                setAiActiveMode(null);
              }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'AI'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#0d1117] border-amber-200 shadow-lg shadow-amber-950/70 scale-[1.01]'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'AI' ? 'bg-black/30 border border-amber-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <Sparkles className="icon-responsive text-amber-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="tracking-wide block truncate">AI</span>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">AI Learning Studio</span>
                </div>
              </div>
              <span className={`capsule-responsive shrink-0 ${activeTab === 'AI' ? 'bg-black/30 text-[#0d1117] font-bold' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'}`}>
                {activeTab === 'AI' ? 'Open' : 'View'}
              </span>
            </button>

            <button
              id="btn-student-homeworks"
              type="button"
              onClick={() => {
                setActiveTab(activeTab === 'STUDENT_HOMEWORKS' ? null : 'STUDENT_HOMEWORKS');
                setSelectedStudentForHomework(null);
              }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border font-['Space_Grotesk'] font-bold text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'STUDENT_HOMEWORKS'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-300 shadow-lg shadow-amber-950/70 scale-[1.01]'
                  : 'bg-[#1c2128] text-white border-[#30363d] hover:bg-[#22272e] hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'STUDENT_HOMEWORKS' ? 'bg-black/30 border border-amber-300' : 'bg-[#0d1117] border border-[#30363d]'
                }`}>
                  <GraduationCap className="icon-responsive text-amber-400" />
                </div>
                <div className="text-left min-w-0">
                  <span className="tracking-wide block whitespace-nowrap text-[11px]">STUDENT HOMEWORKS</span>
                  <span className="text-[9px] text-[#8b949e] font-normal font-sans block truncate">Review & Grade</span>
                </div>
              </div>
              <span className={`capsule-responsive shrink-0 ${activeTab === 'STUDENT_HOMEWORKS' ? 'bg-white/25 text-white font-semibold' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'}`}>
                {activeTab === 'STUDENT_HOMEWORKS' ? 'Open' : 'View'}
              </span>
            </button>
          </div>

          <div className="mt-auto pt-3 border-t border-[#30363d] flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white font-semibold text-xs truncate">
                <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Ahmed (Teacher)</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">@Ahmed_admin123</span>
            </div>
            <button
              id="btn-open-teacher-profile"
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="group w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#1c2128] hover:bg-[#22272e] border border-[#30363d] hover:border-amber-500/60 transition-all duration-200 cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
                  {userAvatar && userAvatar !== 'default' ? (
                    <img src={userAvatar} alt="Teacher" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    'A'
                  )}
                </div>
                <div className="text-left min-w-0">
                  <span className="font-['Space_Grotesk'] font-bold text-xs text-white group-hover:text-amber-300 transition-colors block truncate">
                    Teacher Profile
                  </span>
                  <span className="text-[9px] text-[#8b949e] block font-sans truncate">
                    Admin access
                  </span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 border border-amber-700/50 font-semibold group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                Open
              </span>
            </button>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Administrator Authorized</span>
            </div>
          </div>
        </aside>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        username={username}
        studentName="Prof. Ahmed"
        profile={{
          name: 'Prof. Ahmed',
          age: 35,
          yearBorn: 1989,
          completedAt: new Date().toISOString(),
          bio: 'Lead English Academy Instructor & Administrator',
          avatar: userAvatar,
          level: 99,
          exp: 5000,
          honor: 500,
        }}
        currentUsername={username}
        isReadOnly={false}
        onAvatarChange={(newAvatar) => setUserAvatar(newAvatar)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        currentUser={username}
        allMembers={registeredMembers}
        onCreateGroup={handleCreateGroup}
      />

      {reportNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-amber-500/60 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
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
          fileType={lightboxImage.fileType}
        />
      )}

      {/* 4. MANAGEMENT MODAL */}
      {managingStudent && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-[32px] w-full h-full max-w-7xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl overflow-hidden bg-[#0d1117] border-2 border-amber-500/30 flex items-center justify-center shadow-lg">
                  {managingStudent.avatar && managingStudent.avatar !== 'default' ? (
                    <img src={managingStudent.avatar} alt={managingStudent.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-amber-400">{managingStudent.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">{managingStudent.name}</h2>
                  <p className="text-sm text-[#8b949e]">Student Management & Record Tracking • @{managingStudent.username}</p>
                </div>
              </div>
              <button
                onClick={() => setManagingStudent(null)}
                className="w-12 h-12 rounded-2xl bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-rose-500/50 flex items-center justify-center transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-[#0d1117]">
              {/* Section: New Homeworks */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white">New Homeworks (Pending Review)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allHomeworks.filter(h => h.studentUsername === managingStudent.username && h.status === 'pending').length === 0 ? (
                    <div className="col-span-full py-20 bg-[#161b22] rounded-[32px] border border-dashed border-[#30363d] flex flex-col items-center justify-center text-[#8b949e]">
                      <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm">No pending homeworks for this student.</p>
                    </div>
                  ) : (
                    allHomeworks
                      .filter(h => h.studentUsername === managingStudent.username && h.status === 'pending')
                      .map((hw) => (
                        <div key={hw.id} className="bg-[#161b22] border border-[#30363d] rounded-[24px] p-6 space-y-4 hover:border-amber-500/40 transition-all shadow-lg group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {hw.type === 'speaking' ? <Mic className="w-5 h-5 text-amber-400" /> : <FileText className="w-5 h-5 text-purple-400" />}
                              <span className="font-bold text-white text-sm capitalize">{hw.type} Assignment</span>
                            </div>
                            <span className="text-[10px] text-[#8b949e] font-mono">{hw.timestamp}</span>
                          </div>
                          
                          <p className="text-xs text-[#8b949e] line-clamp-2 bg-[#0d1117] p-3 rounded-xl min-h-[60px]">
                            {hw.notes || 'No notes provided by student.'}
                          </p>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleGradeHomework(hw.id, 'accepted')}
                              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" /> Accept
                            </button>
                            <button
                              onClick={() => handleGradeHomework(hw.id, 'rejected')}
                              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                              <X className="w-4 h-4" /> Reject
                            </button>
                          </div>
                          <button
                            onClick={() => setReviewingHomework(hw)}
                            className="w-full py-2.5 rounded-xl border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500/10 transition-all"
                          >
                            View Recording
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </section>

              {/* Section: Student Record */}
              <section className="space-y-6 pt-12 border-t border-[#30363d]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Student Record (Sajil)</h3>
                </div>

                <div className="bg-[#161b22] rounded-[32px] border border-[#30363d] overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1c2128] border-b border-[#30363d]">
                        <th className="px-8 py-5 text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Date & Type</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Details & Result</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]">
                      {allHomeworks.filter(h => h.studentUsername === managingStudent.username && h.status !== 'pending').length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-8 py-12 text-center text-[#8b949e] text-xs">
                            No recorded history for this student.
                          </td>
                        </tr>
                      ) : (
                        allHomeworks
                          .filter(h => h.studentUsername === managingStudent.username && h.status !== 'pending')
                          .map((hw) => (
                            <tr key={hw.id} className="hover:bg-[#1c2128]/50 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hw.type === 'speaking' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                    {hw.type === 'speaking' ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white capitalize">{hw.type} Assignment</p>
                                    <p className="text-[10px] text-[#8b949e]">{hw.timestamp}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col gap-1.5">
                                  <p className={`text-[11px] font-bold flex items-center gap-1.5 ${hw.status === 'accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {hw.status === 'accepted' ? (
                                      <><CheckCircle2 className="w-3.5 h-3.5" /> Homework Accepted</>
                                    ) : (
                                      <><X className="w-3.5 h-3.5" /> Homework rejected for this student</>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-[#8b949e] truncate max-w-[300px]">{hw.notes || 'No notes'}</p>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <button
                                  onClick={() => setReviewingHomework(hw)}
                                  className="px-4 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] hover:border-amber-500 text-amber-400 font-bold text-[11px] transition-all"
                                >
                                  View the homework
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* 5. HOMEWORK REVIEW MODAL */}
      {reviewingHomework && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#161b22] border border-[#30363d] rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
            <div className="p-6 border-b border-[#30363d] flex items-center justify-between bg-[#1c2128]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  {reviewingHomework.type === 'speaking' ? <Mic className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Reviewing: {reviewingHomework.studentName}</h3>
                  <p className="text-[10px] text-[#8b949e]">{reviewingHomework.timestamp} • {reviewingHomework.status.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setReviewingHomework(null)}
                className="w-10 h-10 rounded-xl bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Media Content */}
              <div className="bg-black rounded-3xl overflow-hidden border border-[#30363d] aspect-video flex items-center justify-center">
                {reviewingHomework.files && reviewingHomework.files.length > 0 && reviewingHomework.files[0] ? (
                  reviewingHomework.files[0].type?.startsWith('video') ? (
                    <video
                      src={reviewingHomework.files[0].url}
                      controls
                      className="w-full h-full"
                    />
                  ) : (
                    <img
                      src={reviewingHomework.files[0].url}
                      alt="Homework"
                      className="max-w-full max-h-full object-contain"
                    />
                  )
                ) : (
                  <div className="text-[#8b949e] text-xs">No media files found.</div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-[#1c2128] p-6 rounded-3xl border border-[#30363d]">
                <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Student Notes</h4>
                <p className="text-sm text-white leading-relaxed">{reviewingHomework.notes || 'No additional notes provided.'}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-[#30363d]">
                <button
                  onClick={() => {
                    handleGradeHomework(reviewingHomework.id, 'accepted');
                    setReviewingHomework(prev => prev ? { ...prev, status: 'accepted' } : null);
                  }}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${
                    reviewingHomework.status === 'accepted'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/20'
                      : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:text-emerald-400 hover:border-emerald-500/50'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" /> Accept Submission
                </button>
                <button
                  onClick={() => {
                    handleGradeHomework(reviewingHomework.id, 'rejected');
                    setReviewingHomework(prev => prev ? { ...prev, status: 'rejected' } : null);
                  }}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${
                    reviewingHomework.status === 'rejected'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/20'
                      : 'bg-[#1c2128] border border-[#30363d] text-[#8b949e] hover:text-rose-400 hover:border-rose-500/50'
                  }`}
                >
                  <X className="w-5 h-5" /> Reject Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
