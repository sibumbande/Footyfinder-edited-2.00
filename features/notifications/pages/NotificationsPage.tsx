
import React, { useEffect, useState, useCallback } from 'react';
import { Bell, UserPlus, Users, Shield, MessageCircle, CheckCheck, Trophy, Loader2, X } from 'lucide-react';
import { AppNotification } from '../../../types';
import { getNotifications, markAllRead, markNotificationRead } from '../../../frontend/api';

interface NotificationsPageProps {
  onNavigate: (page: string) => void;
}

const TYPE_ICONS: Record<AppNotification['type'], React.ReactNode> = {
  FRIEND_REQUEST:     <UserPlus size={18} className="text-blue-500" />,
  FRIEND_ACCEPTED:    <UserPlus size={18} className="text-emerald-500" />,
  TEAM_INVITE:        <Shield size={18} className="text-violet-500" />,
  TEAM_JOIN_ACCEPTED: <Users size={18} className="text-emerald-500" />,
  TEAM_JOIN_DECLINED: <Users size={18} className="text-red-400" />,
  TEAM_JOIN_REQUEST:  <Users size={18} className="text-amber-500" />,
  MATCH_TODAY:        <Trophy size={18} className="text-amber-500" />,
  TEAM_MESSAGE:       <MessageCircle size={18} className="text-blue-500" />,
  TEAM_BIO_UPDATE:    <Shield size={18} className="text-slate-400" />,
  DM_REQUEST:         <MessageCircle size={18} className="text-violet-500" />,
  LOBBY_CANCELLED:    <X size={18} className="text-red-500" />,
};

const TYPE_BG: Record<AppNotification['type'], string> = {
  FRIEND_REQUEST:     'bg-blue-50',
  FRIEND_ACCEPTED:    'bg-emerald-50',
  TEAM_INVITE:        'bg-violet-50',
  TEAM_JOIN_ACCEPTED: 'bg-emerald-50',
  TEAM_JOIN_DECLINED: 'bg-red-50',
  TEAM_JOIN_REQUEST:  'bg-amber-50',
  MATCH_TODAY:        'bg-amber-50',
  TEAM_MESSAGE:       'bg-blue-50',
  TEAM_BIO_UPDATE:    'bg-slate-50',
  DM_REQUEST:         'bg-violet-50',
  LOBBY_CANCELLED:    'bg-red-50',
};

function groupNotifications(notifications: AppNotification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups[0].items.push(n);
    else if (d.getTime() === yesterday.getTime()) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAndMarkRead = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications);
      // Mark all as read after a short delay
      if (res.notifications.some(n => !n.isRead)) {
        setTimeout(() => markAllRead().catch(() => {}), 2000);
      }
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAndMarkRead();
  }, [fetchAndMarkRead]);

  const handleClick = (n: AppNotification) => {
    markNotificationRead(n.id).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    if (n.type === 'TEAM_INVITE' || n.type === 'TEAM_JOIN_REQUEST' || n.type === 'FRIEND_REQUEST') {
      onNavigate('social');
    } else if (n.type === 'DM_REQUEST' || n.type === 'TEAM_MESSAGE') {
      onNavigate('social');
    } else if (n.type === 'MATCH_TODAY') {
      onNavigate('matchmaking');
    }
  };

  const grouped = groupNotifications(notifications);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pt-20 font-inter">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Notifications</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">
                {notifications.filter(n => !n.isRead).length} unread
              </p>
            </div>
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={() => {
                  markAllRead().catch(() => {});
                  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                }}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-[48px] p-16 text-center shadow-sm border border-slate-100">
            <Bell className="mx-auto text-slate-200 mb-4" size={64} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              No notifications yet.<br />We'll let you know when something happens.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{group.label}</h3>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100 divide-y divide-slate-50">
                  {group.items.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-5 p-6 text-left transition-all hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${TYPE_BG[n.type]}`}>
                        {TYPE_ICONS[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-black text-sm text-slate-900 uppercase tracking-tight leading-tight">{n.title}</p>
                          {!n.isRead && (
                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{n.body}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
