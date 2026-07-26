import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchFollowerIds, fetchFollowingIds, fetchUsersByIds,
} from '../services/socialData';
import { User } from '../types';
import { X, Users, UserPlus, UserCheck, ShieldCheck, Loader2 } from 'lucide-react';

export type FollowListKind = 'followers' | 'following';

interface FollowListModalProps {
  userId: string;
  kind: FollowListKind;
  onClose: () => void;
}

/** Sheet listing a profile's followers or the accounts it follows. */
export const FollowListModal: React.FC<FollowListModalProps> = ({ userId, kind, onClose }) => {
  const {
    t, language, followingIds, toggleFollowUser, setViewingProfileUser, isBlocked, auth, showToast,
  } = useApp();
  const isAr = language === 'ar';

  const [tab, setTab] = useState<FollowListKind>(kind);
  const [users, setUsers] = useState<User[] | null>(null);
  /** Followed ids with no profile document — e.g. an account that was removed. */
  const [orphanIds, setOrphanIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    setUsers(null);
    setOrphanIds([]);
    (async () => {
      const ids = tab === 'followers'
        ? await fetchFollowerIds(userId)
        : await fetchFollowingIds(userId);
      const profiles = await fetchUsersByIds(ids);
      if (!active) return;
      const found = new Set(profiles.map((p) => p.id));
      setUsers(profiles.filter((u) => !isBlocked(u.id)));
      // Surface the rest instead of silently showing an empty list.
      setOrphanIds(ids.filter((id) => !found.has(id)));
    })();
    return () => { active = false; };
  }, [userId, tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">

        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          <Users className="w-4 h-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-extrabold text-[var(--color-text-primary)]">
            {tab === 'followers' ? t('followers') : t('following')}
          </h2>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="icon-btn ms-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switch between the two lists */}
        <div className="grid grid-cols-2 gap-1 p-2 border-b border-[var(--color-border)]">
          {(['followers', 'following'] as FollowListKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                tab === k
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {k === 'followers' ? t('followers') : t('following')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
          {users === null ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : users.length === 0 && orphanIds.length === 0 ? (
            <p className="p-10 text-center text-xs text-[var(--color-text-secondary)]">
              {tab === 'followers'
                ? (isAr ? 'لا متابعين بعد.' : 'No followers yet.')
                : (isAr ? 'لا يتابع أحداً بعد.' : 'Not following anyone yet.')}
            </p>
          ) : (
            users.map((u) => {
              const isFollowing = followingIds.includes(u.id);
              const isMe = u.id === auth.user?.id;
              return (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <img
                    src={u.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    onClick={() => { setViewingProfileUser(u); onClose(); }}
                    className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] cursor-pointer shrink-0"
                  />
                  <button
                    onClick={() => { setViewingProfileUser(u); onClose(); }}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] truncate hover:underline">{u.name}</span>
                      {u.verified && <ShieldCheck className="w-3 h-3 shrink-0 text-[var(--color-primary)]" />}
                    </span>
                    <span className="block text-[11px] text-[var(--color-text-secondary)] truncate">@{u.username}</span>
                  </button>

                  {!isMe && (
                    <button
                      onClick={() => toggleFollowUser(u.id)}
                      className={`pressable shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isFollowing
                          ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                          : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                      }`}
                    >
                      {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isFollowing ? t('following') : t('follow')}</span>
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Follows pointing at accounts that no longer exist */}
          {orphanIds.map((id) => (
            <div key={id} className="flex items-center gap-3 p-3 opacity-70">
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[var(--color-text-secondary)]">
                  {isAr ? 'حساب غير متاح' : 'Account unavailable'}
                </span>
                <span className="block text-[10px] text-[var(--color-text-secondary)] truncate font-mono">{id}</span>
              </span>
              {tab === 'following' && userId === auth.user?.id && (
                <button
                  onClick={() => {
                    toggleFollowUser(id);
                    // Drop the row immediately: there's no profile to re-render
                    // into a "Follow" state, so leaving it looked like a no-op.
                    setOrphanIds((prev) => prev.filter((x) => x !== id));
                    showToast(isAr ? 'تم إلغاء المتابعة.' : 'Unfollowed.');
                  }}
                  className="pressable shrink-0 px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-rose-400 hover:border-rose-500"
                >
                  {isAr ? 'إلغاء المتابعة' : 'Unfollow'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
