import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { X, Check, Copy, Camera, Upload, Edit3, Shield, Star, Image, Send, Zap, Sparkles, Info, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { StudentProfile, LEVEL_THRESHOLDS, calculateLevelFromExp, getNextLevelInfo } from '../types';
import { saveAvatar, saveBio } from '../services/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  studentName: string;
  profile: StudentProfile | null;
  onAvatarChange?: (avatarUrl: string) => void;
  isReadOnly?: boolean;
  initialAvatar?: string;
  initialBio?: string;
  currentUsername?: string;
  onSendMessage?: () => void;
}

export const INSTAGRAM_AVATARS = [
  {
    id: 'default-ig',
    label: 'Instagram Default',
    isDefaultIcon: true,
    url: 'default',
  },
  {
    id: 'casual-1',
    label: 'Casual Selfie',
    isDefaultIcon: false,
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    id: 'casual-2',
    label: 'Street Portrait',
    isDefaultIcon: false,
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    id: 'casual-3',
    label: 'Lifestyle Candid',
    isDefaultIcon: false,
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    id: 'casual-4',
    label: 'Campus Vibe',
    isDefaultIcon: false,
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
  },
  {
    id: 'casual-5',
    label: 'Friendly Smile',
    isDefaultIcon: false,
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=80',
  },
];

export default function UserProfileModal({
  isOpen,
  onClose,
  username,
  studentName,
  profile,
  onAvatarChange,
  isReadOnly = false,
  initialAvatar,
  initialBio,
  currentUsername,
  onSendMessage,
}: UserProfileModalProps) {
  const isPeerProfile = Boolean(
    isReadOnly ||
    (currentUsername && currentUsername.toLowerCase().trim() !== username.toLowerCase().trim())
  );

  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return initialAvatar || profile?.avatar || localStorage.getItem(`user_avatar_${username}`) || 'default';
  });
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [showAvatarDrawer, setShowAvatarDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState<string>(() => {
    return (
      initialBio ||
      profile?.bio ||
      localStorage.getItem(`user_bio_${username}`) ||
      'English Language Student\nLearning conversation, grammar & new vocabulary daily.'
    );
  });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(bio);
  const [bioSavedToast, setBioSavedToast] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);

  const currentExp = profile?.exp !== undefined ? profile.exp : 0;
  const currentLevel = calculateLevelFromExp(currentExp);
  const nextInfo = getNextLevelInfo(currentExp);

  useEffect(() => {
    if (isOpen) {
      const activeAvatar = initialAvatar || profile?.avatar || localStorage.getItem(`user_avatar_${username}`) || 'default';
      const activeBio = initialBio || profile?.bio || localStorage.getItem(`user_bio_${username}`) || 'English Language Student\nLearning conversation, grammar & new vocabulary daily.';
      setSelectedAvatar(activeAvatar);
      setBio(activeBio);
      setTempBio(activeBio);
      setIsEditingBio(false);
      setShowAvatarDrawer(false);
    }
  }, [isOpen, username, initialAvatar, initialBio, profile?.avatar, profile?.bio]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  const handleSelectAvatar = (url: string) => {
    if (isPeerProfile) return;
    setSelectedAvatar(url);
    saveAvatar(username, url);
    if (onAvatarChange) onAvatarChange(url);
    setShowAvatarDrawer(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (isPeerProfile) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleSelectAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBio = () => {
    if (isPeerProfile) return;
    const cleanBio = tempBio.trim();
    setBio(cleanBio);
    saveBio(username, cleanBio);
    setIsEditingBio(false);
    setBioSavedToast(true);
    setTimeout(() => setBioSavedToast(false), 2500);
  };

  const isDefaultSilhouette = selectedAvatar === 'default' || !selectedAvatar;

  return (
    <div
      id="profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="profile-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[430px] bg-[#0d1117] border border-[#30363d] rounded-[2rem] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-y-auto max-h-[calc(100vh-2rem)] transform transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header Strip */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#30363d]/60 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-[0.15em] text-teal-400 uppercase bg-teal-950/60 border border-teal-800/40 px-2.5 py-1 rounded-md">
              {isPeerProfile ? 'Peer Student' : 'My Profile'}
            </span>
            <button
              type="button"
              id="btn-level-info-header"
              onClick={() => setShowLevelInfo(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
              title="Level Info & EXP Requirements"
            >
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
              <span>Level Info</span>
            </button>
          </div>
          <button
            type="button"
            id="btn-close-profile-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#161b22] border border-[#30363d] hover:border-red-500/40 text-[#8b949e] hover:text-red-400 flex items-center justify-center transition-all cursor-pointer shadow-inner"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Avatar Ring Frame with glowing teal-emerald-indigo border */}
          <div className="relative mb-5 group">
            <div className="p-1 rounded-full bg-gradient-to-tr from-teal-400 via-cyan-500 to-indigo-500 shadow-xl shadow-teal-950/40">
              <div className="p-[3px] rounded-full bg-[#0d1117]">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[#161b22] flex items-center justify-center relative select-none">
                  {isDefaultSilhouette ? (
                    <div className="w-full h-full bg-[#161b22] flex items-center justify-center text-[#8b949e]">
                      <svg viewBox="0 0 100 100" className="w-full h-full p-4 opacity-70">
                        <circle cx="50" cy="38" r="19" fill="currentColor" />
                        <path d="M18 88 C18 64 32 57 50 57 C68 57 82 64 82 88 Z" fill="currentColor" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={selectedAvatar}
                      alt={studentName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
              </div>
            </div>
            {!isPeerProfile && (
              <button
                type="button"
                onClick={() => setShowAvatarDrawer(!showAvatarDrawer)}
                className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-teal-500 hover:bg-teal-400 text-[#0d1117] flex items-center justify-center border-3 border-[#0d1117] shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-4 h-4 font-bold" />
              </button>
            )}
          </div>

          {/* Name & Badge */}
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {studentName}
            </h2>
            <div className="text-teal-400" title="Verified AI Studio Learner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-[0_0_8px_rgba(45,212,191,0.3)]">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
          </div>

          {/* Username copying */}
          <div className="flex items-center gap-1.5 mb-5 bg-[#161b22] px-3.5 py-1.5 rounded-full border border-[#30363d]/60 shadow-inner">
            <span className="text-xs text-[#8b949e] font-mono font-medium">@{username}</span>
            <span className="text-[#30363d]">•</span>
            <button
              type="button"
              onClick={handleCopyUsername}
              className="text-[#8b949e] hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              title="Copy username"
            >
              {copiedUsername ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </span>
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Premium stats layout */}
          <div id="user-stats-strip" className="w-full grid grid-cols-3 gap-3 mb-6">
            <div className="relative overflow-hidden bg-[#161b22] border border-[#30363d]/80 hover:border-amber-500/40 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-all shadow-md group/stat">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-amber-500/30 group-hover/stat:bg-amber-400/60 transition-colors" />
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-1.5">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-white font-mono tracking-tight">
                {profile?.honor !== undefined ? profile.honor : 100}
              </span>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider mt-0.5">
                Honor
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowLevelInfo(true)}
              className="relative overflow-hidden bg-[#161b22] border border-[#30363d]/80 hover:border-teal-500/60 hover:bg-[#1f2631] rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-all shadow-md group/stat cursor-pointer active:scale-95"
              title="Click to view Level requirements breakdown"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-teal-500/30 group-hover/stat:bg-teal-400/80 transition-colors" />
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-1.5 group-hover/stat:scale-110 transition-transform">
                <Star className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-white font-mono tracking-tight flex items-center gap-1">
                <span>{currentLevel}</span>
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              </span>
              <span className="text-[10px] font-black text-teal-400 uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                <span>Level</span>
                <Info className="w-2.5 h-2.5 opacity-70" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowLevelInfo(true)}
              className="relative overflow-hidden bg-[#161b22] border border-[#30363d]/80 hover:border-indigo-500/60 hover:bg-[#1f2631] rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-all shadow-md group/stat cursor-pointer active:scale-95"
              title="Click to view EXP info"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-indigo-500/30 group-hover/stat:bg-indigo-400/80 transition-colors" />
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-1.5 group-hover/stat:scale-110 transition-transform">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-white font-mono tracking-tight">
                {currentExp}
              </span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                <span>XP</span>
                <Info className="w-2.5 h-2.5 opacity-70" />
              </span>
            </button>
          </div>

          {/* Bio card */}
          <div className="w-full text-left bg-[#161b22] border border-[#30363d]/80 rounded-2xl p-4 sm:p-5 mb-5 transition-all shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/60 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide uppercase">Biography</span>
                {profile?.age && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0d1117] text-[#8b949e] border border-[#30363d]">
                    {profile.age} Years Old
                  </span>
                )}
              </div>
              {!isPeerProfile && !isEditingBio && (
                <button
                  type="button"
                  id="btn-trigger-edit-bio"
                  onClick={() => {
                    setTempBio(bio);
                    setIsEditingBio(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
              {!isPeerProfile && isEditingBio && (
                <span className="text-[10px] font-mono text-[#8b949e]">
                  {tempBio.length}/150
                </span>
              )}
            </div>

            {!isPeerProfile && isEditingBio ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                <textarea
                  value={tempBio}
                  onChange={(e) => {
                    if (e.target.value.length <= 150) {
                      setTempBio(e.target.value);
                    }
                  }}
                  maxLength={150}
                  rows={3}
                  placeholder="Write a short bio or your English learning goal..."
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-teal-500 rounded-xl p-3.5 text-xs text-white placeholder-[#8b949e] focus:outline-none transition-colors resize-none leading-relaxed shadow-inner"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTempBio(bio);
                      setIsEditingBio(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#0d1117] hover:bg-[#161b22] border border-[#30363d] text-xs font-bold text-[#8b949e] hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="btn-save-bio"
                    onClick={handleSaveBio}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white transition-all cursor-pointer shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Bio</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#c9d1d9] leading-relaxed">
                {bio.trim() ? (
                  <p className="whitespace-pre-line break-words font-medium">{bio}</p>
                ) : isPeerProfile ? (
                  <p className="text-[#8b949e] italic py-1">No bio provided by this student yet.</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTempBio('');
                      setIsEditingBio(true);
                    }}
                    className="text-[#8b949e] hover:text-white italic text-left flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                    <span>No bio yet. Tap here to write a description...</span>
                  </button>
                )}
                {bioSavedToast && (
                  <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                    <Check className="w-3 h-3" />
                    <span>Bio saved successfully!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Choose Avatar Drawer */}
          {!isPeerProfile && showAvatarDrawer && (
            <div className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3 border-b border-[#30363d]/60 pb-2">
                <span className="text-xs font-black text-teal-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Image className="w-4 h-4 text-teal-400" />
                  <span>Select Profile Avatar</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAvatarDrawer(false)}
                  className="text-[10px] font-bold text-[#8b949e] hover:text-white bg-[#0d1117] border border-[#30363d] px-2 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2.5 mb-4">
                {INSTAGRAM_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectAvatar(av.url)}
                      className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-400 scale-110 shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/40'
                          : 'border-[#30363d] opacity-75 hover:opacity-100 hover:scale-105'
                      }`}
                      title={av.label}
                    >
                      {av.isDefaultIcon ? (
                        <div className="w-full h-full bg-[#0d1117] flex items-center justify-center text-[#8b949e]">
                          <svg viewBox="0 0 100 100" className="w-full h-full p-2.5">
                            <circle cx="50" cy="38" r="20" fill="currentColor" />
                            <path d="M18 88 C18 64 32 57 50 57 C68 57 82 64 82 88 Z" fill="currentColor" />
                          </svg>
                        </div>
                      ) : (
                        <img
                          src={av.url}
                          alt={av.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#30363d]/60 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8b949e]">Or upload from device:</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0d1117] hover:bg-[#161b22] border border-[#30363d] text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:border-teal-500/50"
                >
                  <Upload className="w-3.5 h-3.5 text-teal-400" />
                  <span>Upload Image</span>
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isPeerProfile ? (
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!isEditingBio) {
                    setTempBio(bio);
                    setIsEditingBio(true);
                  } else {
                    setIsEditingBio(false);
                  }
                }}
                className={`btn-responsive w-full bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] text-white font-bold rounded-xl transition-all ${
                  isEditingBio ? 'border-teal-500/50 text-teal-400' : ''
                }`}
              >
                <Edit3 className="icon-responsive text-teal-400" />
                <span>{isEditingBio ? 'Cancel Bio' : 'Edit Bio'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAvatarDrawer(!showAvatarDrawer)}
                className={`btn-responsive w-full bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] text-white font-bold rounded-xl transition-all ${
                  showAvatarDrawer ? 'border-teal-500/50 text-teal-400' : ''
                }`}
              >
                <Camera className="icon-responsive text-teal-400" />
                <span>{showAvatarDrawer ? 'Hide Photos' : 'Change Photo'}</span>
              </button>
            </div>
          ) : (
            onSendMessage && (
              <div className="w-full">
                <button
                  type="button"
                  onClick={onSendMessage}
                  className="btn-responsive w-full bg-teal-600 hover:bg-teal-500 text-white font-black rounded-xl shadow-lg shadow-teal-950/40"
                >
                  <Send className="icon-responsive" />
                  <span>Start Conversation with {studentName}</span>
                </button>
              </div>
            )
          )}

          <button
            type="button"
            onClick={onClose}
            className={`btn-responsive w-full mt-3 font-extrabold rounded-xl ${
              isPeerProfile
                ? 'bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] text-white shadow-md'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-950/40'
            }`}
          >
            {isPeerProfile ? 'Close' : 'Done'}
          </button>
        </div>
      </div>

      {/* LEVEL INFO MODAL OVERLAY (معلومات حول اللفل مع تغبيش الخلفية) */}
      {showLevelInfo && (
        <div
          id="level-info-modal-backdrop"
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          onClick={() => setShowLevelInfo(false)}
        >
          <div
            id="level-info-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#0d1117] border border-amber-500/50 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-y-auto max-h-[calc(100vh-2rem)] transform transition-all animate-in zoom-in-95 duration-200 text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#30363d] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-['Space_Grotesk'] tracking-tight flex items-center gap-2">
                    <span>Level & EXP System Info</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full">
                      Progression Guide
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8b949e]">
                    English Mastery Progression & Ranked Match Rules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelInfo(false)}
                className="w-8 h-8 rounded-full bg-[#161b22] border border-[#30363d] hover:border-red-500/40 text-[#8b949e] hover:text-red-400 flex items-center justify-center transition-all cursor-pointer shadow-inner"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Player Progress Snapshot */}
            <div className="bg-gradient-to-br from-[#161b22] to-[#1c2330] border border-teal-500/40 rounded-2xl p-4 mb-4 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {LEVEL_THRESHOLDS.find(t => t.level === currentLevel)?.badge || '🌱'}
                  </span>
                  <div>
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider block">Current Rank</span>
                    <h4 className="text-sm font-extrabold text-white">
                      Level {currentLevel} • {LEVEL_THRESHOLDS.find(t => t.level === currentLevel)?.title || 'Novice Learner'}
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider block">Total Experience</span>
                  <span className="text-base font-mono font-black text-amber-400">{currentExp} EXP</span>
                </div>
              </div>

              {currentLevel < 10 ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-[#8b949e] mb-1">
                    <span>Progress to Level {nextInfo.nextLevel}</span>
                    <span className="font-mono text-teal-300 font-bold">
                      {nextInfo.expNeeded} EXP needed ({nextInfo.progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#0d1117] rounded-full overflow-hidden border border-[#30363d] shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${nextInfo.progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 text-center text-xs font-bold text-amber-300">
                  🏆 Maximum Level Reached! You are a Grandmaster Legend.
                </div>
              )}
            </div>

            {/* EXP Requirements List (exact requirements from user) */}
            <div className="mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] mb-2 flex items-center justify-between">
                <span>Level Requirements Table</span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">10 Levels</span>
              </h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {LEVEL_THRESHOLDS.map((thresh) => {
                  const isCurrent = thresh.level === currentLevel;
                  const isUnlocked = currentExp >= thresh.expRequired;

                  return (
                    <div
                      key={thresh.level}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                          : isUnlocked
                          ? 'bg-[#161b22]/70 border-[#30363d] text-[#f0f6fc]'
                          : 'bg-[#0d1117]/50 border-[#21262d] text-[#6e7681]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{thresh.badge}</span>
                        <div>
                          <span className={`text-xs font-extrabold ${isCurrent ? 'text-amber-300' : isUnlocked ? 'text-white' : 'text-[#8b949e]'}`}>
                            LEVEL {thresh.level}
                          </span>
                          <span className="text-[10px] text-[#8b949e] block font-medium">
                            {thresh.title}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono text-xs font-bold ${isCurrent ? 'text-amber-400' : isUnlocked ? 'text-teal-400' : 'text-[#8b949e]'}`}>
                          {thresh.expRequired === 0 ? '0 EXP (Start)' : `${thresh.expRequired.toLocaleString()} EXP`}
                        </span>
                        {thresh.level > 1 && (
                          <span className="text-[9px] text-[#8b949e] block">
                            Requires {thresh.expRequired.toLocaleString()} EXP
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranked Match EXP Rules Card & Honor Penalty Warning */}
            <div className="bg-[#141a23] border border-indigo-500/40 rounded-2xl p-4 space-y-2.5 shadow-inner">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Ranked Match EXP & Rules:</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0d1117] border border-emerald-500/40 rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
                  <span className="text-emerald-400 font-extrabold text-sm font-mono">+70 EXP</span>
                  <div>
                    <span className="text-[11px] font-bold text-white block">Victory</span>
                    <span className="text-[9px] text-[#8b949e]">Instant reward on win</span>
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-rose-500/40 rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
                  <span className="text-rose-400 font-extrabold text-sm font-mono">-20 EXP</span>
                  <div>
                    <span className="text-[11px] font-bold text-white block">Defeat</span>
                    <span className="text-[9px] text-[#8b949e]">Deducted on loss</span>
                  </div>
                </div>
              </div>

              {/* Honor Recovery Bonus for Victory when Honor < 100 */}
              <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-emerald-200 leading-relaxed shadow-sm">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-emerald-300 block mb-0.5">
                    Honor Recovery Bonus (+1 Honor on Victory):
                  </span>
                  <span>
                    If your Honor rating is below 100, winning a Ranked Match grants an additional <strong className="text-emerald-300 underline">+1 Honor point</strong> bonus alongside the +70 EXP reward to help restore your full Honor!
                  </span>
                </div>
              </div>

              {/* Warning on 0 EXP and -3 Pride penalty */}
              <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-rose-200 leading-relaxed shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-rose-300 block mb-0.5">
                    Honor Penalty & Zero EXP Rule:
                  </span>
                  <span>
                    Experience points (EXP) cannot drop below 0. If your EXP is depleted to 0 and you continue to lose matches, the system will deduct <strong className="text-rose-300 underline">-3 Honor points</strong> for each defeat!
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('player-level-up', {
                    detail: {
                      oldLevel: Math.max(1, currentLevel - 1),
                      newLevel: currentLevel,
                      totalExp: currentExp,
                      studentName: profile?.name || username
                    }
                  }));
                }}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-black animate-spin" />
                <span>Celebrate Current Rank 🎉</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLevelInfo(false)}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Got it, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
