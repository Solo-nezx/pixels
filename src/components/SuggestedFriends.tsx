import React from 'react';
import { useApp } from '../context/AppContext';
import { isSteamConfigured } from '../lib/config';
import { Users, UserPlus, UserCheck, ShieldCheck, Gamepad2 } from 'lucide-react';

/**
 * Suggests gamers to connect with based on the games they have in common with
 * the current user (their logged games + any imported Steam library).
 * Renders nothing when there are no matches.
 */
export const SuggestedFriends: React.FC = () => {
  const {
    t,
    language,
    suggestedFriends,
    followingIds,
    toggleFollowUser,
    setViewingProfileUser,
    setSelectedGameForDetail,
    auth,
  } = useApp();

  if (suggestedFriends.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-[#F43F5E]" />
        <h3 className="text-sm font-extrabold text-[var(--color-text-primary)]">
          {t('suggestedFriendsTitle')}
        </h3>
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)] mb-3">
        {t('suggestedFriendsSubtitle')}
      </p>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {suggestedFriends.map(({ user, sharedGames }) => {
          const isFollowing = followingIds.includes(user.id);
          const count = sharedGames.length;
          return (
            <div
              key={user.id}
              className="flex-shrink-0 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm hover:border-[#F43F5E]/60 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                  }}
                  onClick={() => setViewingProfileUser(user)}
                  className="w-11 h-11 rounded-full object-cover border border-[var(--color-border)] cursor-pointer"
                />
                <div className="min-w-0">
                  <div
                    onClick={() => setViewingProfileUser(user)}
                    className="flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate">{user.name}</h4>
                    {user.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-secondary)] truncate">@{user.username}</p>
                </div>
              </div>

              {/* Shared games */}
              <div className="flex items-center gap-1.5 mb-2">
                <Gamepad2 className="w-3.5 h-3.5 text-[#F43F5E]" />
                <span className="text-[11px] font-bold text-[#F43F5E]">
                  {count} {count === 1 ? t('gameInCommon') : t('gamesInCommon')}
                </span>
              </div>
              <div className="flex gap-1.5 mb-3">
                {sharedGames.slice(0, 4).map((g) => (
                  <img
                    key={g.id}
                    src={g.coverUrl}
                    alt={g.title}
                    title={g.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80';
                    }}
                    onClick={() => setSelectedGameForDetail(g)}
                    className="w-10 h-14 rounded-md object-cover border border-[var(--color-border)] cursor-pointer hover:border-[#7C3AED] transition-all"
                  />
                ))}
                {count > 4 && (
                  <div className="w-10 h-14 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-secondary)]">
                    +{count - 4}
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleFollowUser(user.id)}
                className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isFollowing
                    ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                    : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('following')}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{t('follow')}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Nudge to connect Steam for richer matches (only when logged in without Steam) */}
      {isSteamConfigured() && auth.user?.provider !== 'steam' && (
        <p className="text-[11px] text-[var(--color-text-secondary)] mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#66c0f4]" />
          {t('connectDiscordForMore')}
        </p>
      )}
    </section>
  );
};
