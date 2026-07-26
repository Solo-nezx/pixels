import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { markNotificationRead } from '../services/messaging';
import { saveFcmToken } from '../services/socialData';
import { enablePush, pushAvailable, pushPermission } from '../lib/push';
import { AppNotification } from '../types';
import { X, Heart, MessageSquare, UserPlus, Mail, Bell, BellRing, CheckCheck, Loader2 } from 'lucide-react';

function timeAgo(ts: number, isAr: boolean): string {
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 60) return isAr ? 'الآن' : 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return isAr ? `${mins} د` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isAr ? `${hrs} س` : `${hrs}h`;
  return isAr ? `${Math.floor(hrs / 24)} ي` : `${Math.floor(hrs / 24)}d`;
}

const ICONS: Record<AppNotification['type'], React.ElementType> = {
  like: Heart,
  comment: MessageSquare,
  follow: UserPlus,
  message: Mail,
};

const TINTS: Record<AppNotification['type'], string> = {
  like: 'text-[var(--color-like)] bg-[var(--color-like)]/12',
  comment: 'text-[var(--color-primary)] bg-[var(--color-primary)]/12',
  follow: 'text-[var(--color-secondary)] bg-[var(--color-secondary)]/12',
  message: 'text-amber-400 bg-amber-400/12',
};

/** Sheet listing the signed-in user's recent activity. */
export const NotificationsPanel: React.FC = () => {
  const {
    language, notifications, closeNotifications, markAllRead,
    unreadNotificationCount, setViewingProfileUser, openConversationWith, setActiveTab,
    auth, showToast,
  } = useApp();

  const isAr = language === 'ar';

  // --- Web push opt-in ---
  const [canPush, setCanPush] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    pushAvailable().then((ok) => {
      setCanPush(ok);
      if (ok) setPermission(pushPermission());
    });
  }, []);

  const enableDevicePush = async () => {
    if (!auth.user) return;
    setEnabling(true);
    try {
      const token = await enablePush();
      setPermission(pushPermission());
      if (token) {
        await saveFcmToken(auth.user.id, token);
        showToast(isAr ? 'تم تفعيل تنبيهات المتصفح.' : 'Browser notifications enabled.');
      } else {
        showToast(isAr ? 'لم يتم تفعيل التنبيهات.' : 'Notifications were not enabled.');
      }
    } finally {
      setEnabling(false);
    }
  };

  const describe = (n: AppNotification): string => {
    switch (n.type) {
      case 'like': return isAr ? 'أعجبه منشورك' : 'liked your post';
      case 'comment': return isAr ? 'علّق على منشورك' : 'commented on your post';
      case 'follow': return isAr ? 'بدأ متابعتك' : 'started following you';
      case 'message': return isAr ? 'أرسل لك رسالة' : 'sent you a message';
    }
  };

  const activate = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.type === 'message') {
      openConversationWith(n.actor);
    } else if (n.type === 'follow') {
      setViewingProfileUser({ ...n.actor } as never);
    } else {
      setActiveTab('home');
    }
    closeNotifications();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          <Bell className="w-4 h-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-extrabold text-[var(--color-text-primary)]">
            {isAr ? 'التنبيهات' : 'Notifications'}
          </h2>
          {unreadNotificationCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black flex items-center justify-center">
              {unreadNotificationCount}
            </span>
          )}

          {unreadNotificationCount > 0 && (
            <button
              onClick={markAllRead}
              className="ms-auto flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isAr ? 'تعليم الكل كمقروء' : 'Mark all read'}
            </button>
          )}

          <button
            onClick={closeNotifications}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className={`icon-btn ${unreadNotificationCount > 0 ? '' : 'ms-auto'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enable web push (hidden when unavailable or already granted) */}
        {canPush && permission !== 'granted' && (
          <button
            onClick={enableDevicePush}
            disabled={enabling || permission === 'denied'}
            className="pressable flex items-center gap-2.5 m-3 p-3 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-start transition-colors hover:bg-[var(--color-primary)]/15 disabled:opacity-60"
          >
            {enabling ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[var(--color-primary)]" />
            ) : (
              <BellRing className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
            )}
            <span className="min-w-0">
              <span className="block text-xs font-bold text-[var(--color-text-primary)]">
                {permission === 'denied'
                  ? (isAr ? 'التنبيهات محجوبة في المتصفح' : 'Notifications blocked in your browser')
                  : (isAr ? 'تفعيل تنبيهات المتصفح' : 'Enable browser notifications')}
              </span>
              <span className="block text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                {permission === 'denied'
                  ? (isAr ? 'اسمح بالتنبيهات من إعدادات الموقع.' : 'Allow notifications in your site settings.')
                  : (isAr ? 'استلم تنبيهاً عند وصول رسالة جديدة.' : 'Get notified when a new message arrives.')}
              </span>
            </span>
          </button>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-xs text-[var(--color-text-secondary)]">
              <Bell className="w-8 h-8 mx-auto mb-3 text-[var(--color-primary)]/40" />
              <p className="font-semibold text-[var(--color-text-primary)] mb-1">
                {isAr ? 'لا توجد تنبيهات' : 'No notifications'}
              </p>
              <p>{isAr ? 'ستظهر هنا الإعجابات والتعليقات والمتابعات والرسائل.' : 'Likes, comments, follows and messages show up here.'}</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => activate(n)}
                  className={`w-full flex items-start gap-3 p-3.5 text-start hover:bg-[var(--color-bg)] transition-colors ${
                    n.read ? '' : 'bg-[var(--color-primary)]/5'
                  }`}
                >
                  <span className="relative shrink-0">
                    <img
                      src={n.actor.avatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)]"
                    />
                    <span className={`absolute -bottom-1 -end-1 p-1 rounded-full border border-[var(--color-card)] ${TINTS[n.type]}`}>
                      <Icon className="w-2.5 h-2.5" />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-[var(--color-text-primary)]">
                      <span className="font-bold">{n.actor.name}</span>{' '}
                      <span className="text-[var(--color-text-secondary)]">{describe(n)}</span>
                    </span>
                    {n.text && (
                      <span className="block text-[11px] text-[var(--color-text-secondary)] truncate mt-0.5">
                        “{n.text}”
                      </span>
                    )}
                    <span className="block text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                      {timeAgo(n.createdAtTs, isAr)}
                    </span>
                  </span>

                  {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
