import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import { Flame, Users, Sparkles, PlusCircle, Star, Eye, Loader2 } from 'lucide-react';
import { Game } from '../types';
import { GamePreviewModal } from './GamePreviewModal';
import { useLongPress } from '../hooks/useLongPress';

interface HomeFeedProps {
  openCreatePostModal: () => void;
}

/** Compact player-count formatting: 12345 -> "12.3K", 1200000 -> "1.2M". */
function formatPlayers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

const TrendingGameCardItem: React.FC<{
  game: Game;
  onSelect: (game: Game) => void;
  onPreview: (game: Game) => void;
  isAr: boolean;
}> = ({ game, onSelect, onPreview, isAr }) => {
  const longPressProps = useLongPress({
    onLongPress: () => onPreview(game),
    onClick: () => onSelect(game),
  });

  return (
    <div
      {...longPressProps}
      className="flex-shrink-0 w-28 group cursor-pointer select-none touch-manipulation"
      title={isAr ? 'اضغط مطولاً للمعاينة السريعة' : 'Hold for quick preview'}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-1.5 border border-[var(--color-border)] group-hover:border-[var(--color-primary)] shadow-sm group-hover:shadow-lg group-hover:shadow-[var(--color-primary)]/20 transition-all">
        <img
          src={game.coverUrl}
          alt={game.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {game.averageRating > 0 && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            <span>{game.averageRating}</span>
          </div>
        )}

        {/* Live Steam player count (real "currently playing") */}
        {typeof game.playerCount === 'number' && game.playerCount > 0 && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-md text-[9px] font-bold text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{formatPlayers(game.playerCount)}</span>
          </div>
        )}

        {/* Quick Peek Hint Badge */}
        <div className="absolute bottom-1.5 left-1.5 p-1 rounded-md bg-black/75 backdrop-blur-md text-[9px] text-white opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 border border-white/10">
          <Eye className="w-2.5 h-2.5 text-[var(--color-primary)]" />
        </div>
      </div>
      <h4 className="text-xs font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
        {game.title}
      </h4>
      {typeof game.playerCount === 'number' && game.playerCount > 0 ? (
        <p className="text-[10px] font-semibold text-emerald-500 truncate flex items-center gap-1">
          <Users className="w-2.5 h-2.5" />
          {formatPlayers(game.playerCount)} {isAr ? 'يلعبون الآن' : 'playing'}
        </p>
      ) : (
        <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
          {game.developer}
        </p>
      )}
    </div>
  );
};

export const HomeFeed: React.FC<HomeFeedProps> = ({ openCreatePostModal }) => {
  const {
    t, posts, followingIds, setSelectedGameForDetail, auth, allGames, language, requireAuth,
    hasMorePosts, loadMorePosts,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'trends' | 'friends'>('trends');
  const [previewGame, setPreviewGame] = useState<Game | null>(null);

  // Infinite scroll: ask for more posts when the sentinel becomes visible.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMorePosts) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMorePosts(); },
      { rootMargin: '400px' }, // start fetching before the reader reaches the end
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMorePosts, loadMorePosts, posts.length]);

  const isAr = language === 'ar';

  // The Friends tab is only available to signed-in users; guests always see Trends.
  const isLoggedIn = !!(auth.isLoggedIn && auth.user);
  const effectiveTab = isLoggedIn ? activeTab : 'trends';

  // Filter posts for Friends tab vs Trends tab
  const friendsPosts = posts.filter(p => followingIds.includes(p.author.id) || p.author.id === auth.user?.id);
  const displayPosts = effectiveTab === 'trends' ? posts : friendsPosts;

  return (
    <div className="w-full pb-20">
      
      {/* Top Segmented Tabs: Trends & Friends — Friends only shows once signed in */}
      {isLoggedIn && (
        <div className="sticky top-14 md:top-0 z-30 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)] p-2">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">

            <button
              onClick={() => setActiveTab('trends')}
              aria-pressed={activeTab === 'trends'}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'trends'
                  ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{t('tabTrends')}</span>
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              aria-pressed={activeTab === 'friends'}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'friends'
                  ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t('tabFriends')}</span>
            </button>

          </div>
        </div>
      )}

      {/* Trending Games carousel — on xl+ this moves to the RightRail column */}
      {effectiveTab === 'trends' && (
        <section className="xl:hidden p-4 border-b border-[var(--color-border)] bg-[var(--color-card)]/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                {t('trendingGames')}
              </h3>
            </div>
            <span className="text-[11px] text-[var(--color-secondary)] font-semibold cursor-pointer">
              {t('viewAll')}
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {allGames.map(game => (
              <TrendingGameCardItem
                key={game.id}
                game={game}
                isAr={isAr}
                onSelect={(g) => setSelectedGameForDetail(g)}
                onPreview={(g) => setPreviewGame(g)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Post Creator Prompt Box — guests get the sign-in prompt on tap */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] flex items-center gap-3">
        <img
          src={auth.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80'}
          alt="Avatar"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
          }}
          className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)]"
        />
        <button
          onClick={() => requireAuth(openCreatePostModal, t('createPost'))}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full px-4 py-2.5 text-xs text-[var(--color-text-secondary)] text-start hover:border-[var(--color-primary)] transition-colors"
        >
          {t('whatsPlaying')}
        </button>
        <button
          onClick={() => requireAuth(openCreatePostModal, t('createPost'))}
          aria-label={t('createPost')}
          className="icon-btn-inline p-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Posts List */}
      <div className="divide-y divide-[var(--color-border)]">
        {displayPosts.length > 0 ? (
          displayPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="p-8 text-center text-xs text-[var(--color-text-secondary)]">
            <p className="mb-2">{t('noPostsYet')}</p>
            {effectiveTab === 'friends' && (
              <p className="text-[var(--color-primary)] font-medium">Follow other gamers from the Search tab to populate your Friends feed!</p>
            )}
          </div>
        )}
      </div>

      {/* Infinite scroll: loading the next batch when this scrolls into view */}
      {hasMorePosts && displayPosts.length > 0 && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
        </div>
      )}

      {/* Quick Preview Modal for Game Long Press */}
      <GamePreviewModal
        isOpen={!!previewGame}
        game={previewGame}
        onClose={() => setPreviewGame(null)}
        onOpenFullDetail={(g) => setSelectedGameForDetail(g)}
      />

    </div>
  );
};
