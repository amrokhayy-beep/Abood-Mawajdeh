import React, { useState, useRef, ChangeEvent } from 'react';
import { X, Check, Users, Camera, Upload, Search, Sparkles } from 'lucide-react';
import { RegisteredUserProfile } from '../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  allMembers: RegisteredUserProfile[];
  onCreateGroup: (groupData: { name: string; avatar?: string; members: string[] }) => void;
}

const PRESET_GROUP_AVATARS = [
  {
    id: 'preset-study',
    label: 'English Club',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=300&h=300&q=80',
  },
  {
    id: 'preset-speak',
    label: 'Speaking Circle',
    url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=300&h=300&q=80',
  },
  {
    id: 'preset-grammar',
    label: 'Grammar Masters',
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=300&h=300&q=80',
  },
  {
    id: 'preset-global',
    label: 'Global Friends',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=300&h=300&q=80',
  },
];

export default function CreateGroupModal({
  isOpen,
  onClose,
  currentUser,
  allMembers,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleToggleMember = (username: string) => {
    const normalized = username.toLowerCase().trim();
    setSelectedMembers((prev) =>
      prev.includes(normalized)
        ? prev.filter((u) => u !== normalized)
        : [...prev, normalized]
    );
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedAvatar(result);
        setShowPresets(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = groupName.trim();
    if (!trimmedName) return;

    onCreateGroup({
      name: trimmedName,
      avatar: selectedAvatar || undefined,
      members: selectedMembers,
    });
    setGroupName('');
    setSelectedAvatar('');
    setSelectedMembers([]);
    onClose();
  };

  const availableMembers = allMembers.filter(
    (m) => m.username.toLowerCase() !== currentUser.toLowerCase()
  );
  const filteredMembers = availableMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="create-group-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="create-group-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#12161d] border border-[#2d333b] rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] ring-1 ring-white/10 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-[#2d333b]/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-['Space_Grotesk']">
                Create New Group
              </h3>
              <p className="text-[11px] text-[#8b949e]">
                Study circles, conversation rooms & team chats
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1c2128] hover:bg-[#2d333b] text-[#8b949e] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <div className="relative group mb-2">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1c2128] border-2 border-[#30363d] flex items-center justify-center shadow-lg">
                {selectedAvatar ? (
                  <img
                    src={selectedAvatar}
                    alt="Group Avatar"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#8b949e]">
                    <Users className="w-8 h-8 text-teal-400 mb-1" />
                    <span className="text-[9px] font-medium">Group Photo</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-md border-2 border-[#12161d] transition-transform hover:scale-110 cursor-pointer"
                title="Choose or Upload Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{selectedAvatar ? 'Change Group Photo' : 'Select Photo / Presets'}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-[#8b949e] hover:text-white flex items-center gap-1 cursor-pointer pl-2 border-l border-[#30363d]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {showPresets && (
              <div className="w-full mt-3 p-2.5 bg-[#161b22] border border-[#30363d] rounded-2xl animate-in fade-in">
                <p className="text-[10px] text-[#8b949e] mb-2 font-medium">
                  Choose a preset or upload from your device:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_GROUP_AVATARS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(p.url);
                        setShowPresets(false);
                      }}
                      className={`group/preset p-1 rounded-xl border transition-all cursor-pointer ${
                        selectedAvatar === p.url
                          ? 'border-teal-400 bg-teal-500/10'
                          : 'border-[#30363d] hover:border-teal-500/60 bg-[#1c2128]'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-11 object-cover rounded-lg mb-1"
                      />
                      <span className="text-[9px] text-[#c9d1d9] block truncate">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5">
              What&apos;s the group name you want ?
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. English Advanced Learners"
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-teal-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-teal-400/40 transition-all"
            />
          </div>

          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-semibold text-white">
                Who&apos;s you want invite for this group ?
              </label>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                {selectedMembers.length} selected
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered members..."
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-teal-400 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-[#8b949e] focus:outline-none transition-all"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-2xl bg-[#0d1117]/60 border border-[#30363d] p-2">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.username.toLowerCase());
                  return (
                    <div
                      key={member.username}
                      onClick={() => handleToggleMember(member.username)}
                      className={`p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                          : 'bg-[#161b22] hover:bg-[#1c2128] border-transparent hover:border-[#30363d]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#21262d] shrink-0 flex items-center justify-center text-white border border-[#30363d]">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-teal-300">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-semibold truncate transition-colors ${
                                isSelected ? 'text-emerald-400 font-bold' : 'text-white'
                              }`}
                            >
                              {member.name}
                            </span>
                            <span className="text-[10px] text-[#8b949e] font-mono">
                              @{member.username}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#8b949e] truncate">
                            {member.role === 'teacher' ? 'Instructor' : 'Student'} • Lv. {member.level ?? 1}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-[#484f58] hover:border-emerald-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-[#8b949e]">
                  No members found matching your search.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#2d333b]/80">
            <button
              type="submit"
              disabled={!groupName.trim()}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-teal-950/60 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SUBMIT</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
