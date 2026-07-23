import React from 'react';
import { Game } from '../types';
import { useApp } from '../context/AppContext';
import { X, Star, Heart, Gamepad2, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

interface GamePreviewModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullDetail?: (game: Game) => void;
}

export const GamePreviewModal: React.FC<GamePreviewModalProps> = ({
  game,
  isOpen,
  onClose,
  onOpenFullDetail,
}) => {
  const { language, wishlist, toggleWishlist, setSelectedGameForDetail, t } = useApp();

  if (!isOpen || !game) return null;

  const isAr = language === 'ar';
  const isInWishlist = wishlist.includes(game.id);

  const getMetascoreBg = (score?: number) => {
    if (!score) return 'bg-gray-600';
    if (score >= 75) return 'bg-emerald-500 text-white';
    if (score >= 60) return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const handleFullDetail = () => {
    onClose();
    if (onOpenFullDetail) {
      onOpenFullDetail(game);
    } else {
      setSelectedGameForDetail(game);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Pop-up Card */}
      <div className="relative w-full max-w-sm bg-[var(--color-card)] rounded-3xl border border-[#7C5CFF]/40 shadow-2xl shadow-[#7C5CFF]/20 overflow-hidden z-10 animate-scale-up">
        
        {/* Banner / Poster Hero */}
        <div className="relative h-44 w-full bg-black">
          <img
            src={game.bannerUrl || game.coverUrl}
            alt={game.title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-card)] via-black/30 to-black/60" />

          {/* Badge: Quick Preview Tag */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-[#7C5CFF] border border-[#7C5CFF]/30">
            <Flame className="w-3 h-3 text-[#7C5CFF]" />
            <span>{isAr ? 'معاينة سريعة' : 'Quick Preview'}</span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Poster Image Overlay */}
          <div className="absolute -bottom-6 left-5 w-20 aspect-[3/4] rounded-xl overflow-hidden border-2 border-[var(--color-card)] shadow-xl bg-black">
            <img
              src={game.coverUrl}
              alt={game.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
              }}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="pt-8 px-5 pb-5 space-y-3">
          
          {/* Title & Developer */}
          <div>
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)] leading-snug">
              {game.title}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {game.developer} • {game.releaseYear}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 pt-1">
            {/* Rating */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 font-bold text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{game.averageRating} / 5</span>
              <span className="text-[10px] text-amber-400/70">({game.ratingCount})</span>
            </div>

            {/* Metascore */}
            {game.metascore && (
              <div className={`px-2 py-1 rounded-lg text-xs font-black ${getMetascoreBg(game.metascore)}`}>
                {game.metascore} Metascore
              </div>
            )}
          </div>

          {/* Genres Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {game.genres.slice(0, 3).map((g, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-secondary)]">
                {g}
              </span>
            ))}
          </div>

          {/* Summary Excerpt */}
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 bg-[var(--color-bg)]/60 p-2.5 rounded-xl border border-[var(--color-border)]">
            {game.summary}
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-2">
            {/* Wishlist button */}
            <button
              onClick={() => toggleWishlist(game.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                isInWishlist
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/40'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[#7C5CFF]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-rose-500' : ''}`} />
              <span>{isInWishlist ? (isAr ? 'في الأمنيات' : 'In Wishlist') : (isAr ? 'قائمة الأمنيات' : 'Wishlist')}</span>
            </button>

            {/* Full Details button */}
            <button
              onClick={handleFullDetail}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#7C5CFF] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#6D4CFF] transition-all shadow-md shadow-[#7C5CFF]/20"
            >
              <span>{isAr ? 'التفاصيل الكاملة' : 'Full Overview'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
