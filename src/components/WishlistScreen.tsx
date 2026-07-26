import React from 'react';
import { useApp } from '../context/AppContext';
import { mockGames } from '../data/mockData';
import { Game } from '../types';
import { Heart, Star, Trash2, Search as SearchIcon, Gamepad2 } from 'lucide-react';

/**
 * Dedicated Wishlist view — a focused board of the games the user wants to
 * play/buy next, with quick removal and a jump to browse more.
 */
export const WishlistScreen: React.FC = () => {
  const {
    t,
    language,
    wishlist,
    allGames,
    toggleWishlist,
    setSelectedGameForDetail,
    setActiveTab,
  } = useApp();

  const games = wishlist
    .map((id) => allGames.find((g) => g.id === id) || mockGames.find((g) => g.id === id))
    .filter((g): g is Game => Boolean(g));

  return (
    <div className="w-full pb-24">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-gradient-to-br from-[var(--color-like)]/15 via-[var(--color-card)] to-[var(--color-primary)]/10 px-5 py-7">
        <div className="absolute -right-6 -top-6 opacity-10">
          <Heart className="w-40 h-40 text-[var(--color-like)]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-like)]/15 border border-[var(--color-like)]/30 mb-3">
            <Heart className="w-3.5 h-3.5 text-[var(--color-like)] fill-[var(--color-like)]" />
            <span className="text-[11px] font-bold text-[var(--color-like)] uppercase tracking-wider">
              {t('wishlistSection')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]">
            {language === 'ar' ? 'قائمة أمنياتك' : 'Your Wishlist'}
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-md leading-relaxed">
            {language === 'ar'
              ? 'الألعاب التي تنوي لعبها أو شراءها لاحقاً — احتفظ بها هنا وتابع تخفيضاتها.'
              : 'Games you plan to play or buy next — keep them here and track them over time.'}
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] font-bold text-[var(--color-text-primary)]">
              {games.length} {language === 'ar' ? 'لعبة' : games.length === 1 ? 'game' : 'games'}
            </span>
          </div>
        </div>
      </div>

      {games.length > 0 ? (
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {games.map((game) => (
            <div
              key={game.id}
              className="group relative rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm hover:shadow-xl hover:shadow-[var(--color-like)]/10 hover:border-[var(--color-like)]/60 transition-all duration-300"
            >
              <div
                onClick={() => setSelectedGameForDetail(game)}
                className="relative aspect-[3/4] cursor-pointer"
              >
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {game.averageRating > 0 && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur text-amber-400 font-bold text-[10px] flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    <span>{game.averageRating}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <p className="text-xs font-bold text-white truncate">{game.title}</p>
                  {game.releaseYear > 0 && (
                    <p className="text-[10px] text-gray-300 truncate">{game.developer}</p>
                  )}
                </div>
              </div>

              {/* Remove from wishlist */}
              <button
                onClick={() => toggleWishlist(game.id)}
                title={t('removeFromWishlist')}
                aria-label={t('removeFromWishlist')}
                className="absolute top-2 left-2 min-w-11 min-h-11 inline-flex items-center justify-center rounded-full bg-black/60 backdrop-blur text-white opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8">
          <div className="max-w-sm mx-auto text-center py-12 px-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-like)]/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-7 h-7 text-[var(--color-like)]" />
            </div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
              {t('emptyWishlist')}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5 leading-relaxed">
              {language === 'ar'
                ? 'أضف ألعاباً بالضغط على أيقونة القلب في صفحة أي لعبة.'
                : 'Add games by tapping the heart on any game page.'}
            </p>
            <button
              onClick={() => setActiveTab('search')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] shadow-lg shadow-[var(--color-primary)]/25 transition-all"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تصفح الألعاب' : 'Browse games'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
