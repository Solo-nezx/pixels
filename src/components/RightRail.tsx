import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Users, Star, UserPlus, UserCheck, Gamepad2, ShieldCheck } from 'lucide-react';

/** Compact player-count formatting: 12345 -> "12.3K", 1200000 -> "1.2M". */
function formatPlayers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

/**
 * Desktop third column (inline-end side): Trending Games as a ranked vertical
 * list — a better fit for the tall empty space than the in-feed carousel.
 * Hidden below xl, where the feed keeps its horizontal carousel instead.
 */
export const RightRail: React.FC = () => {
  const {
    t, allGames, loadingGames, setSelectedGameForDetail, setActiveTab, language,
    suggestedFriends, followingIds, toggleFollowUser, setViewingProfileUser, auth,
  } = useApp();
  const isAr = language === 'ar';
  const isLoggedIn = !!(auth.isLoggedIn && auth.user);

  return (
    <aside className="hidden xl:flex fixed top-0 bottom-0 end-0 z-30 w-80 flex-col border-s border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            {t('trendingGames')}
          </h2>
        </div>
        <button
          onClick={() => setActiveTab('search')}
          className="text-[11px] font-semibold text-[var(--color-secondary)] hover:underline"
        >
          {t('viewAll')}
        </button>
      </div>

      {/* Ranked list */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2">
        {loadingGames && allGames.length === 0 && (
          <div className="space-y-2 p-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl skeleton" />
            ))}
          </div>
        )}

        {allGames.slice(0, 20).map((game, idx) => (
          <button
            key={game.id}
            onClick={() => setSelectedGameForDetail(game)}
            className="pressable group w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-card)] transition-colors text-start"
          >
            {/* Rank */}
            <span className="w-5 shrink-0 text-center text-xs font-black text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
              {idx + 1}
            </span>

            {/* Cover */}
            <img
              src={game.coverUrl}
              alt={game.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80';
              }}
              className="w-10 h-14 shrink-0 rounded-md object-cover border border-[var(--color-border)] group-hover:border-[var(--color-primary)]/50 transition-colors"
            />

            {/* Meta */}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                {game.title}
              </span>
              {typeof game.playerCount === 'number' && game.playerCount > 0 ? (
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                  <Users className="w-2.5 h-2.5" />
                  {formatPlayers(game.playerCount)} {isAr ? 'يلعبون الآن' : 'playing'}
                </span>
              ) : (
                <span className="block text-[10px] text-[var(--color-text-secondary)] truncate">
                  {game.developer}
                </span>
              )}
            </span>

            {/* Rating */}
            {game.averageRating > 0 && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                {game.averageRating}
              </span>
            )}
          </button>
        ))}

        {/* ---- Suggested gamers (shared games) — members only ---- */}
        {isLoggedIn && suggestedFriends.length > 0 && (
          <section className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 px-2 mb-1">
              <Users className="w-4 h-4 text-[var(--color-secondary)]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                {t('suggestedFriendsTitle')}
              </h2>
            </div>
            <p className="px-2 mb-2 text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
              {t('suggestedFriendsSubtitle')}
            </p>

            {suggestedFriends.slice(0, 6).map(({ user, sharedGames }) => {
              const isFollowing = followingIds.includes(user.id);
              const count = sharedGames.length;
              return (
                <div key={user.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--color-card)] transition-colors">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                    }}
                    onClick={() => setViewingProfileUser(user)}
                    className="w-9 h-9 shrink-0 rounded-full object-cover border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition-colors"
                  />
                  <button
                    onClick={() => setViewingProfileUser(user)}
                    className="min-w-0 flex-1 text-start"
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-xs font-bold text-[var(--color-text-primary)] truncate hover:underline">{user.name}</span>
                      {user.verified && <ShieldCheck className="w-3 h-3 shrink-0 text-[var(--color-primary)]" />}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--color-secondary)]">
                      <Gamepad2 className="w-2.5 h-2.5" />
                      {count} {count === 1 ? t('gameInCommon') : t('gamesInCommon')}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleFollowUser(user.id)}
                    aria-label={isFollowing ? t('following') : t('follow')}
                    className={`pressable shrink-0 p-2 rounded-full transition-all ${
                      isFollowing
                        ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                        : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                    }`}
                    title={isFollowing ? t('following') : t('follow')}
                  >
                    {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </aside>
  );
};
