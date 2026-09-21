
import { 
  StudentProfile, 
  ChatMessage, 
  ChatGroup, 
  AppNotification, 
  RegisteredUserProfile, 
  UserAccount,
  MessageType
} from '../types';

export interface HomeworkSubmission {
  id: string;
  studentUsername: string;
  studentName: string;
  type: 'speaking' | 'writing' | 'copywork' | 'direct_question';
  content: string;
  notes?: string;
  timestamp?: string;
  files?: { name: string; url: string; size: number; type?: string }[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  teacherFeedback?: string;
}

const STORAGE_PROFILES_KEY = 'app_profiles';
const STORAGE_MESSAGES_KEY = 'app_messages';
const STORAGE_GROUPS_KEY = 'app_groups';
const STORAGE_NOTIFICATIONS_KEY = 'app_notifications';
const STORAGE_USERS_KEY = 'app_users';
const STORAGE_HOMEWORKS_KEY = 'app_homeworks';
const STORAGE_CURRENT_USER_KEY = 'app_current_user';

const AVATAR_COLORS = [
  'bg-teal-500', 'bg-indigo-500', 'bg-purple-500', 'bg-rose-500', 
  'bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-orange-500'
];

export function initStorage() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_USERS_KEY)) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify({}));
  }
  if (!localStorage.getItem(STORAGE_PROFILES_KEY)) {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify({}));
  }
  if (!localStorage.getItem(STORAGE_MESSAGES_KEY)) {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_GROUPS_KEY)) {
    localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_HOMEWORKS_KEY)) {
    localStorage.setItem(STORAGE_HOMEWORKS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_NOTIFICATIONS_KEY)) {
    localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify([]));
  }
}

export async function syncWithServerDatabase(currentUsername?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  initStorage();

  // --- Self-healing & Auto-restoration logic ---
  try {
    const localUsers = getAllUsers();
    const usernames = Object.keys(localUsers);

    for (const uname of usernames) {
      const normalized = uname.toLowerCase().trim();
      const cachedUser = localUsers[normalized];
      if (!cachedUser) continue;

      // Check if profile exists on the server
      const checkRes = await fetch(`/api/profile/${normalized}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        // If the server doesn't have this user's profile, it means the server DB reset/restarted
        if (!checkData.success) {
          console.log(`[Self-Healing] Restoring account and profile for '${normalized}' on the server...`);
          
          // 1. Re-register the user on the server
          const regRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: normalized, passwordHash: cachedUser.passwordHash })
          });
          const regData = await regRes.json();

          if (regData.success) {
            // 2. Re-upload their profile
            const localProfile = getProfile(normalized);
            if (localProfile) {
              await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: normalized, profile: localProfile })
              });
              console.log(`[Self-Healing] Successfully restored profile for '${normalized}'.`);
            }
          }
        }
      }
    }
  } catch (healErr) {
    console.warn('[Self-Healing] Error restoring users:', healErr);
  }
  // --- End of Self-healing ---

  try {
    const [membersRes, messagesRes, groupsRes, homeworksRes, notificationsRes] = await Promise.all([
      fetch('/api/members'),
      fetch('/api/messages/all'),
      fetch('/api/groups'),
      fetch('/api/homeworks'),
      fetch('/api/notifications')
    ]);

    if (membersRes.ok) {
      const data = await membersRes.json();
      if (data.success && data.profiles) {
        // Merge server profiles with local ones to keep both updated
        const localProfiles = getAllProfiles();
        const mergedProfiles = { ...localProfiles, ...data.profiles };
        localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(mergedProfiles));
      }
    }

    if (messagesRes.ok) {
      const data = await messagesRes.json();
      if (data.success && data.messages) {
        if (data.messages.length === 0) {
          // If server database restarted and has 0 messages, re-upload local ones in the background
          const localMsgs = getAllChatMessages();
          if (localMsgs.length > 0) {
            console.log(`[Self-Healing] Re-uploading local chat messages...`);
            for (const msg of localMsgs) {
              fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msg),
              }).catch(() => {});
            }
          }
        } else {
          localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(data.messages));
        }
      }
    }

    if (groupsRes.ok) {
      const data = await groupsRes.json();
      if (data.success && data.groups) {
        if (data.groups.length === 0) {
          // Re-upload groups if server has none
          const localGroups = getAllChatGroups();
          for (const g of localGroups) {
            fetch('/api/groups', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: g.name, avatar: g.avatar, createdBy: g.createdBy, members: g.members })
            }).catch(() => {});
          }
        } else {
          localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(data.groups));
        }
      }
    }

    if (homeworksRes.ok) {
      const data = await homeworksRes.json();
      if (data.success && data.homeworks) {
        if (data.homeworks.length === 0) {
          // Re-upload homework submissions if server lost them
          const rawHw = localStorage.getItem(STORAGE_HOMEWORKS_KEY);
          const localHws = rawHw ? JSON.parse(rawHw) : [];
          if (localHws.length > 0) {
            console.log(`[Self-Healing] Re-uploading local homework submissions...`);
            for (const hw of localHws) {
              fetch('/api/homeworks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hw)
              }).catch(() => {});
            }
          }
        } else {
          localStorage.setItem(STORAGE_HOMEWORKS_KEY, JSON.stringify(data.homeworks));
        }
      }
    }

    if (notificationsRes.ok) {
      const data = await notificationsRes.json();
      if (data.success && data.notifications) {
        localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(data.notifications));
      }
    }
  } catch (err) {
    console.warn('Sync error:', err);
  }
}

export function getAllUsers(): Record<string, UserAccount> {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCurrentUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_CURRENT_USER_KEY);
}

export function setCurrentUser(username: string | null): void {
  if (typeof window === 'undefined') return;
  if (username) {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, username);
  } else {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  }
}

export function getAllProfiles(): Record<string, StudentProfile> {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getProfile(username: string): StudentProfile | null {
  const profiles = getAllProfiles();
  return profiles[username.toLowerCase().trim()] || null;
}

export function hasCompletedProfile(username: string): boolean {
  return !!getProfile(username);
}

export async function saveBio(username: string, bio: string): Promise<void> {
  const normalized = username.toLowerCase().trim();
  const profiles = getAllProfiles();
  if (profiles[normalized]) {
    profiles[normalized].bio = bio;
    profiles[normalized].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: normalized,
        profile: { ...profiles[normalized], bio }
      })
    }).catch(err => console.warn('Server profile sync error:', err));
  }
  localStorage.setItem(`user_bio_${normalized}`, bio);
}

export async function saveAvatar(username: string, avatar: string): Promise<void> {
  const normalized = username.toLowerCase().trim();
  const profiles = getAllProfiles();
  if (profiles[normalized]) {
    profiles[normalized].avatar = avatar;
    profiles[normalized].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));

    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: normalized,
        profile: { ...profiles[normalized], avatar }
      })
    }).catch(err => console.warn('Server avatar sync error:', err));
  }
  localStorage.setItem(`user_avatar_${normalized}`, avatar);
}

export async function registerUser(username: string, passwordHash: string): Promise<{ success: boolean, message?: string }> {
  initStorage();
  const normalized = username.toLowerCase().trim();
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: normalized, passwordHash })
    });
    const data = await res.json();
    if (data.success) {
      const users = getAllUsers();
      users[normalized] = {
        username: normalized,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    }
    return data;
  } catch (err) {
    console.warn('Server registration error:', err);
    // Fallback locally
    const users = getAllUsers();
    if (users[normalized]) return { success: false, message: 'Username already taken locally.' };
    users[normalized] = {
      username: normalized,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return { success: true };
  }
}

export async function verifyUser(username: string, passwordHash: string): Promise<{ success: boolean, message?: string }> {
  initStorage();
  const normalized = username.toLowerCase().trim();
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: normalized, passwordHash })
    });
    const data = await res.json();
    if (data.success) {
      // Save locally as cache
      const users = getAllUsers();
      users[normalized] = {
        username: normalized,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

      // Fetch profile from server to sync it
      try {
        const profRes = await fetch(`/api/profile/${normalized}`);
        if (profRes.ok) {
          const profData = await profRes.json();
          if (profData.success && profData.profile) {
            const profiles = getAllProfiles();
            profiles[normalized] = profData.profile;
            localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
          }
        }
      } catch (profErr) {
        console.warn('Profile sync error on login:', profErr);
      }
    }
    return data;
  } catch (err) {
    console.warn('Server login error:', err);
    // Fallback to local storage
    const users = getAllUsers();
    const user = users[normalized];
    if (!user) return { success: false, message: 'User not found.' };
    if (user.passwordHash !== passwordHash) return { success: false, message: 'Incorrect password.' };
    return { success: true };
  }
}

export function saveProfile(username: string, profileData: Omit<StudentProfile, 'completedAt'>): StudentProfile {
  initStorage();
  const profiles = getAllProfiles();
  const normalized = username.toLowerCase().trim();
  const fullProfile: StudentProfile = {
    ...profileData,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  profiles[normalized] = fullProfile;
  localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  
  fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: normalized, profile: profiles[normalized] })
  }).catch(err => console.warn('Server profile save error:', err));

  return fullProfile;
}

export function getRegisteredMembers(currentUsername?: string): RegisteredUserProfile[] {
  initStorage();
  const profiles = getAllProfiles();
  const members: RegisteredUserProfile[] = [];
  const normalizedCurrent = currentUsername?.toLowerCase().trim();
  let colorIdx = 0;
  for (const uname of Object.keys(profiles)) {
    if (uname === normalizedCurrent) continue;
    const prof = profiles[uname];
    const isTeacher = uname.includes('teacher') || uname.includes('coach') || uname === 'ahmed_admin123';
    const displayName = prof?.name || uname.charAt(0).toUpperCase() + uname.slice(1);
    members.push({
      username: uname,
      name: displayName,
      age: prof?.age,
      yearBorn: prof?.yearBorn,
      role: isTeacher ? 'teacher' : 'student',
      bio: prof?.bio || (isTeacher ? 'Certified English instructor & conversation coach' : 'Registered student practicing English daily'),
      avatar: prof?.avatar || undefined,
      avatarBg: AVATAR_COLORS[colorIdx % AVATAR_COLORS.length],
      isOnline: true,
      honor: prof?.honor !== undefined ? prof.honor : 100,
      level: prof?.level !== undefined ? prof.level : 1,
      exp: prof?.exp !== undefined ? prof.exp : 1,
    });
    colorIdx++;
  }
  return members;
}

export function getAllChatMessages(): ChatMessage[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getConversationMessages(user1: string, user2: string): ChatMessage[] {
  const all = getAllChatMessages();
  const u1 = user1.toLowerCase().trim();
  const u2 = user2.toLowerCase().trim();
  return all.filter(
    (m) =>
      (m.sender.toLowerCase() === u1 && m.recipient.toLowerCase() === u2) ||
      (m.sender.toLowerCase() === u2 && m.recipient.toLowerCase() === u1)
  );
}

export function getGroupMessages(groupId: string): ChatMessage[] {
  const all = getAllChatMessages();
  const gid = groupId.toLowerCase().trim();
  return all.filter((m) => m.recipient.toLowerCase() === gid || m.groupId?.toLowerCase() === gid);
}

export interface SendMessageOptions {
  isStudent?: boolean;
  senderAvatar?: string;
  groupId?: string;
  type?: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioDuration?: number;
}

export async function saveChatMessage(
  sender: string,
  senderName: string,
  recipient: string,
  text: string,
  isStudentOrOptions: boolean | SendMessageOptions = true,
  senderAvatar?: string,
  groupId?: string
): Promise<ChatMessage> {
  initStorage();
  const all = getAllChatMessages();
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let options: SendMessageOptions = {};
  if (typeof isStudentOrOptions === 'boolean') {
    options = {
      isStudent: isStudentOrOptions,
      senderAvatar,
      groupId,
      type: 'text',
    };
  } else {
    options = isStudentOrOptions;
  }
  const effectiveGroupId =
    options.groupId || (recipient.startsWith('group-') ? recipient.toLowerCase().trim() : undefined);
  const msgType: MessageType = options.type || 'text';
  let defaultText = text ? text.trim() : '';
  if (!defaultText) {
    if (msgType === 'image') defaultText = 'Photo';
    else if (msgType === 'audio') defaultText = 'Voice note';
    else if (msgType === 'file') defaultText = options.fileName ? `${options.fileName}` : 'Attachment';
  }
  
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender: sender.toLowerCase().trim(),
    senderName,
    recipient: recipient.toLowerCase().trim(),
    text: defaultText,
    time: timeFormatted,
    createdAt: now.toISOString(),
    isStudent: options.isStudent !== false,
    senderAvatar: options.senderAvatar || localStorage.getItem(`user_avatar_${sender.toLowerCase().trim()}`) || 'default',
    groupId: effectiveGroupId,
    type: msgType,
    mediaUrl: options.mediaUrl,
    fileName: options.fileName,
    fileSize: options.fileSize,
    audioDuration: options.audioDuration,
  };
  
  all.push(newMsg);
  localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(all));

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.message) return data.message;
    }
  } catch (err) {
    console.warn('Server sync error:', err);
  }

  return newMsg;
}

export function getAllChatGroups(): ChatGroup[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_GROUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getChatGroupsForUser(username?: string): ChatGroup[] {
  const all = getAllChatGroups();
  if (!username) return all;
  const u = username.toLowerCase().trim();
  return all.filter((g) => g.members.map((m) => m.toLowerCase()).includes(u) || g.createdBy.toLowerCase() === u);
}

export async function createChatGroup(
  name: string,
  avatar: string | undefined,
  createdBy: string,
  members: string[]
): Promise<ChatGroup> {
  initStorage();
  const uCreator = createdBy.toLowerCase().trim();
  const invitedMembers = members.map((m) => m.toLowerCase().trim()).filter((m) => m && m !== uCreator);
  
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      avatar,
      createdBy: uCreator,
      members: invitedMembers
    })
  });
  const data = await res.json();
  if (data.success && data.group) {
    const all = getAllChatGroups();
    all.unshift(data.group);
    localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(all));
    return data.group;
  }
  throw new Error('Failed to create group');
}

export async function getAllHomeworkSubmissions(): Promise<HomeworkSubmission[]> {
  const res = await fetch('/api/homeworks');
  const data = await res.json();
  return data.homeworks || [];
}

export async function saveHomeworkSubmission(submission: any) {
  const res = await fetch('/api/homeworks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission)
  });
  return await res.json();
}

export async function updateHomeworkStatus(id: string, status: string, feedback?: string) {
  const res = await fetch(`/api/homeworks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, teacherFeedback: feedback })
  });
  return await res.json();
}

export function getNotificationsForUser(username: string): AppNotification[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    const u = username.toLowerCase().trim();
    return all.filter((n: AppNotification) => n.recipientUsername.toLowerCase() === u);
  } catch {
    return [];
  }
}

export async function respondToNotification(notificationId: string, response: 'accept' | 'decline', username: string): Promise<{ success: boolean, group?: ChatGroup }> {
  initStorage();
  const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
  const all: AppNotification[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex(n => n.id === notificationId);
  if (idx !== -1) {
    const notif = all[idx];
    all[idx].status = response === 'accept' ? 'accepted' : 'declined';
    localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(all));
    
    if (response === 'accept' && notif.groupId) {
      const groups = getAllChatGroups();
      const group = groups.find(g => g.id === notif.groupId);
      return { success: true, group };
    }
  }
  return { success: true };
}

export function deleteNotification(notificationId: string): void {
  initStorage();
  const raw = localStorage.getItem(STORAGE_NOTIFICATIONS_KEY);
  const all: AppNotification[] = raw ? JSON.parse(raw) : [];
  const filtered = all.filter(n => n.id !== notificationId);
  localStorage.setItem(STORAGE_NOTIFICATIONS_KEY, JSON.stringify(filtered));
  
  fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' })
    .catch(err => console.warn('Notification sync error:', err));
}
