import React from 'react';
import { Bell, Check, X, Clock, Users, Sparkles, ShieldAlert, AlertTriangle } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onAccept: (notification: AppNotification) => Promise<void>;
  onDecline: (notification: AppNotification) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onAccept,
  onDecline,
  onDelete,
}) => {
  if (!isOpen) return null;

  const pendingNotifications = notifications.filter((n) => n.status === 'pending' || n.status === 'unread');

  return (
    <div
      id="notifications-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="notifications-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#12161d] border border-[#2d333b] rounded-3xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] ring-1 ring-white/10 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
      >
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-[#30363d]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center shadow-inner text-teal-400">
              <Bell className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Space_Grotesk'] font-bold text-lg text-white">
                  Notifications
                </h3>
                {pendingNotifications.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {pendingNotifications.length} New
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8b949e]">
                Study group invitations and system updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#30363d]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 overflow-y-auto py-4 space-y-3.5 flex-1 pr-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-[#0d1117]/60 border border-dashed border-[#30363d] flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center text-[#8b949e] mb-3 shadow-inner">
                <Bell className="w-6 h-6 text-[#8b949e]" />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-white mb-1">
                No notifications right now
              </h4>
              <p className="text-xs text-[#8b949e] max-w-xs leading-relaxed">
                When fellow students invite you to join study groups or send platform alerts, they will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isGroupInvite = notif.type === 'group_invite';
              const isHomeworkStatus = notif.type === 'homework_rejected' || notif.type === 'homework_accepted';
              const isCheatPenalty = notif.type === 'cheat_penalty';
              const isPending = notif.status === 'pending' || notif.status === 'unread';
              
              let icon = <Bell className="w-6 h-6 text-[#8b949e]" />;
              if (isGroupInvite) icon = <Users className="w-6 h-6 text-teal-400" />;
              if (notif.type === 'homework_rejected') icon = <X className="w-6 h-6 text-rose-400" />;
              if (notif.type === 'homework_accepted') icon = <Check className="w-6 h-6 text-emerald-400" />;
              if (isCheatPenalty) icon = <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />;

              return (
                <div
                  key={notif.id}
                  className={`rounded-2xl border p-4 transition-all duration-200 shadow-md ${
                    isCheatPenalty
                      ? 'bg-gradient-to-r from-rose-950/70 to-[#161b22] border-rose-500/80 ring-1 ring-rose-500/40'
                      : isPending
                      ? 'bg-[#161b22] border-teal-500/40 hover:border-teal-500/70 shadow-teal-950/20'
                      : 'bg-[#161b22]/60 border-[#30363d] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-2xl overflow-hidden border flex items-center justify-center shadow-inner ${
                        isCheatPenalty
                          ? 'bg-rose-950/80 border-rose-500/60'
                          : 'bg-[#21262d] border-[#30363d]'
                      }`}>
                        {isGroupInvite && notif.groupAvatar ? (
                          <img
                            src={notif.groupAvatar}
                            alt={notif.groupName || 'Group Avatar'}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          icon
                        )}
                      </div>
                      {isPending && (
                        <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#161b22] shadow-sm ${
                          isCheatPenalty ? 'bg-rose-500 animate-ping' : 'bg-teal-400'
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                          isCheatPenalty ? 'text-rose-400 font-extrabold' :
                          notif.type === 'homework_rejected' ? 'text-rose-400' : 
                          notif.type === 'homework_accepted' ? 'text-emerald-400' : 'text-teal-300'
                        }`}>
                          {isCheatPenalty ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Sparkles className={`w-3.5 h-3.5 ${
                              notif.type === 'homework_rejected' ? 'text-rose-400' : 
                              notif.type === 'homework_accepted' ? 'text-emerald-400' : 'text-teal-400'
                            }`} />
                          )}
                          {notif.title || 'Notification'}
                        </span>
                        <span className="text-[10px] text-[#8b949e] flex items-center gap-1 font-mono shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#8b949e]" />
                          {notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                        </span>
                      </div>
                      <div className={`text-xs sm:text-sm leading-snug ${
                        isCheatPenalty ? 'text-rose-100 font-medium' : 'text-white'
                      }`}>
                        {isGroupInvite ? (
                          <>
                            <strong className="text-teal-300 font-semibold font-mono">@{notif.senderUsername}</strong>{' '}
                            invited you to join the group{' '}
                            <strong className="text-white font-bold underline decoration-teal-500/50 underline-offset-2">
                              &quot;{notif.groupName || 'Study Group'}&quot;
                            </strong>
                          </>
                        ) : (
                          <span>{notif.message}</span>
                        )}
                      </div>
                      {!isPending && isGroupInvite && (
                        <div className="mt-2 text-xs">
                          {notif.status === 'accepted' && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <Check className="w-3.5 h-3.5" /> Accepted & Joined
                            </span>
                          )}
                          {notif.status === 'declined' && (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                              <X className="w-3.5 h-3.5" /> Invitation Declined
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPending && isGroupInvite && (
                    <div className="mt-3.5 pt-3 border-t border-[#30363d]/70 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onDecline(notif)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-700/50 hover:border-rose-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                        title="Decline invitation"
                      >
                        <X className="w-4 h-4 text-rose-400 group-hover:text-white" />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAccept(notif)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/60 cursor-pointer active:scale-95"
                        title="Accept and join group"
                      >
                        <Check className="w-4 h-4 text-white" />
                        <span>Accept & Join</span>
                      </button>
                    </div>
                  )}

                  {(!isPending || isHomeworkStatus || isCheatPenalty) && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onDelete(notif.id)}
                        className="text-[11px] text-[#8b949e] hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        {(isHomeworkStatus || isCheatPenalty) && isPending ? 'Mark as read' : 'Dismiss'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="relative z-10 pt-3 border-t border-[#30363d]/80 flex items-center justify-between text-xs text-[#8b949e] shrink-0">
          <span>{notifications.length} total notification{notifications.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white font-medium transition-colors cursor-pointer border border-[#30363d]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
