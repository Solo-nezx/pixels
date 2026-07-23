import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import { Flame, Users, Sparkles, PlusCircle, Star, Eye } from 'lucide-react';
import { Game } from '../types';
import { GamePreviewModal } from './GamePreviewModal';
import { useLongPress } from '../hooks/useLongPress';

interface HomeFeedProps {
  openCreatePostModal: () => void;
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
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-1.5 border border-[var(--color-border)] group-hover:border-[#7C5CFF] shadow-sm group-hover:shadow-lg group-hover:shadow-[#7C5CFF]/20 transition-all">
        <img
          src={game.coverUrl}
          alt={game.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-amber-400" />
          <span>{game.averageRating}</span>
        </div>

        {/* Quick Peek Hint Badge */}
        <div className="absolute bottom-1.5 left-1.5 p-1 rounded-md bg-black/75 backdrop-blur-md text-[9px] text-white opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 border border-white/10">
          <Eye className="w-2.5 h-2.5 text-[#7C5CFF]" />
        </div>
      </div>
      <h4 className="text-xs font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[#7C5CFF] transition-colors">
        {game.title}
      </h4>
      <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
        {game.developer}
      </p>
    </div>
  );
};

export const HomeFeed: React.FC<HomeFeedProps> = ({ openCreatePostModal }) => {
  const { t, posts, followingIds, setSelectedGameForDetail, auth, allGames, language } = useApp();
  const [activeTab, setActiveTab] = useState<'trends' | 'friends'>('trends');
  const [previewGame, setPreviewGame] = useState<Game | null>(null);

  const isAr = language === 'ar';

  // Filter posts for Friends tab vs Trends tab
  const friendsPosts = posts.filter(p => followingIds.includes(p.author.id) || p.author.id === auth.user?.id);
  const displayPosts = activeTab === 'trends' ? posts : friendsPosts;

  return (
    <div className="w-full pb-20">
      
      {/* Top Segmented Tabs: Trends & Friends */}
      <div className="sticky top-14 z-30 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)] p-2">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
          
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'trends'
                ? 'bg-[#7C5CFF] text-white shadow-md shadow-[#7C5CFF]/30'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>{t('tabTrends')}</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'friends'
                ? 'bg-[#7C5CFF] text-white shadow-md shadow-[#7C5CFF]/30'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('tabFriends')}</span>
          </button>

        </div>
      </div>

      {/* Trending Games Horizontal Carousel Widget (Only on Trends Tab) */}
      {activeTab === 'trends' && (
        <section className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card)]/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                {t('trendingGames')}
              </h3>
            </div>
            <span className="text-[11px] text-[#2DD4BF] font-semibold cursor-pointer">
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

      {/* Post Creator Prompt Box */}
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
          onClick={openCreatePostModal}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full px-4 py-2.5 text-xs text-[var(--color-text-secondary)] text-start hover:border-[#7C5CFF] transition-colors"
        >
          {t('whatsPlaying')}
        </button>
        <button
          onClick={openCreatePostModal}
          className="p-2 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF] hover:bg-[#7C5CFF]/20 transition-colors"
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
            {activeTab === 'friends' && (
              <p className="text-[#7C5CFF] font-medium">Follow other gamers from the Search tab to populate your Friends feed!</p>
            )}
          </div>
        )}
      </div>

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
