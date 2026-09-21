export interface StudentProfile {
  name: string;
  age: number;
  yearBorn: number;
  completedAt: string;
  bio?: string;
  avatar?: string;
  updatedAt?: string;
  honor: number;
  level: number;
  exp: number;
}

export interface UserAccount {
  username: string;
  passwordHash: string;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface ChatMessage {
  id: string;
  sender: string;
  senderName: string;
  recipient: string;
  text: string;
  time: string;
  createdAt: string;
  isStudent?: boolean;
  senderAvatar?: string;
  groupId?: string;
  type?: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  avatar?: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface AppNotification {
  id: string;
  recipientUsername: string;
  senderUsername: string;
  senderName: string;
  type: 'group_invite' | 'system' | 'message' | 'homework_rejected' | 'homework_accepted' | 'cheat_penalty';
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
  title: string;
  message: string;
  createdAt: string;
  time: string;
  status: 'pending' | 'accepted' | 'declined' | 'read' | 'unread';
}

export interface RegisteredUserProfile {
  username: string;
  name: string;
  age?: number;
  yearBorn?: number;
  role: 'student' | 'teacher';
  bio?: string;
  avatarBg: string;
  avatar?: string;
  isOnline: boolean;
  honor: number;
  level: number;
  exp: number;
}

export type AppView = 'landing' | 'auth' | 'profile-form' | 'dashboard';
export type DashboardTab = 'CHAT' | 'AI' | 'HOMEWORKS' | 'GAMES';

export interface LevelThreshold {
  level: number;
  expRequired: number;
  title: string;
  badge: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, expRequired: 0, title: 'Novice Learner', badge: '🌱' },
  { level: 2, expRequired: 120, title: 'Apprentice Speaker', badge: '🥉' },
  { level: 3, expRequired: 450, title: 'Skilled Communicator', badge: '🥈' },
  { level: 4, expRequired: 700, title: 'Fluent Explorer', badge: '🥇' },
  { level: 5, expRequired: 1300, title: 'Grammar Master', badge: '💎' },
  { level: 6, expRequired: 2900, title: 'Elite Linguist', badge: '🔮' },
  { level: 7, expRequired: 4200, title: 'Champion Scholar', badge: '⚡' },
  { level: 8, expRequired: 7120, title: 'Grand Scholar', badge: '🛡️' },
  { level: 9, expRequired: 10000, title: 'English Legend', badge: '👑' },
  { level: 10, expRequired: 16000, title: 'Grandmaster Legend', badge: '🏆' },
];

export function calculateLevelFromExp(exp: number): number {
  const currentExp = Math.max(0, Number(exp) || 0);
  if (currentExp >= 16000) return 10;
  if (currentExp >= 10000) return 9;
  if (currentExp >= 7120) return 8;
  if (currentExp >= 4200) return 7;
  if (currentExp >= 2900) return 6;
  if (currentExp >= 1300) return 5;
  if (currentExp >= 700) return 4;
  if (currentExp >= 450) return 3;
  if (currentExp >= 120) return 2;
  return 1;
}

export function getNextLevelInfo(exp: number): { nextLevel: number; nextLevelExp: number; progressPercent: number; expNeeded: number } {
  const currentExp = Math.max(0, Number(exp) || 0);
  const currentLevel = calculateLevelFromExp(currentExp);
  if (currentLevel >= 10) {
    return {
      nextLevel: 10,
      nextLevelExp: 16000,
      progressPercent: 100,
      expNeeded: 0,
    };
  }

  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)?.expRequired || 0;
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1)?.expRequired || 120;
  const range = nextThreshold - currentThreshold;
  const earnedInRange = Math.max(0, currentExp - currentThreshold);
  const progressPercent = Math.min(100, Math.round((earnedInRange / range) * 100));

  return {
    nextLevel: currentLevel + 1,
    nextLevelExp: nextThreshold,
    progressPercent,
    expNeeded: Math.max(0, nextThreshold - currentExp),
  };
}

