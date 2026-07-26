import React, { useState, useEffect } from 'react';
import { Game, GameStatus } from '../types';
import { useApp } from '../context/AppContext';
import { fetchGameDetailsFromApi } from '../services/gameApiService';
import { fetchGameDetails } from '../services/rawg';
import { X, Star, Heart, Gamepad2, Check } from 'lucide-react';

interface GameDetailModalProps {
  game: Game;
  onClose: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({ game: initialGame, onClose }) => {
  const { 
    t, 
    userGames, 
    logGame, 
    wishlist, 
    toggleWishlist,
    toggleFavoriteGame,
    isFavoriteGame,
    addPost, 
    language 
  } = useApp();

  const [game, setGame] = useState<Game>(initialGame);

  useEffect(() => {
    let isMounted = true;
    if (initialGame.id.startsWith('rawg_')) {
      fetchGameDetails(initialGame.id).then(enriched => {
        if (isMounted && enriched) {
          setGame(enriched);
        }
      });
    } else if (initialGame.id.startsWith('steam_')) {
      fetchGameDetailsFromApi(initialGame.id).then(enriched => {
        if (isMounted && enriched) {
          setGame(enriched);
        }
      });
    }
    return () => { isMounted = false; };
  }, [initialGame.id]);

  const existingLog = userGames.find(g => g.gameId === game.id);
  const isInWishlist = wishlist.includes(game.id);
  const isFav = isFavoriteGame(game.id);

  const [rating, setRating] = useState(existingLog?.rating || 5);
  const [hours, setHours] = useState(existingLog?.hoursPlayed || 10);
  const [status, setStatus] = useState<GameStatus>(existingLog?.status || 'playing');
  const [reviewText, setReviewText] = useState(existingLog?.reviewText || '');
  const [showLogForm, setShowLogForm] = useState(false);

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    // Pass the game itself: a title from live search isn't in the catalogue.
    logGame(game.id, rating, hours, status, reviewText, game);
    if (reviewText.trim()) {
      // Also post as a social review on feed!
      addPost(reviewText.trim(), game, rating);
    }
    setShowLogForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
          className="absolute top-4 right-4 z-20 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Banner with Poster Overlay */}
        <div className="relative h-44 sm:h-56 -mx-5 -mt-5 mb-12 rounded-t-2xl overflow-hidden bg-slate-900">
          <img
            src={game.bannerUrl || game.coverUrl}
            alt="banner"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-card)] via-black/40 to-black/60"></div>

          {/* Letterboxd Style Poster Image */}
          <div className="absolute -bottom-8 left-6 w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 border-[var(--color-card)] shadow-2xl bg-black">
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

        {/* Game Title & Metadata */}
        <div className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <h1 className="text-xl font-black text-[var(--color-text-primary)] leading-tight">
              {game.title}
            </h1>
            {game.metascore && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-xs">
                Metascore {game.metascore}
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            {game.developer} • {game.releaseYear}
          </p>

          {/* Genres & Platforms tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {game.genres.map(g => (
              <span key={g} className="px-2 py-0.5 rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-text-primary)]">
                {g}
              </span>
            ))}
            {game.platforms.map(p => (
              <span key={p} className="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold">
                {p}
              </span>
            ))}
          </div>

          <p className="text-xs text-[var(--color-text-primary)] leading-relaxed mb-4">
            {game.summary}
          </p>
        </div>

        {/* User Action Bar: Log Game & Wishlist Button */}
        <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl flex items-center justify-between gap-2 mb-5">
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs hover:bg-[var(--color-primary-hover)] shadow-md shadow-[var(--color-primary)]/30 transition-all flex items-center justify-center gap-1.5"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>{existingLog ? 'Update Rating / Log' : t('logThisGame')}</span>
          </button>

          <button
            onClick={() => toggleWishlist(game.id)}
            aria-label={isInWishlist ? t('inWishlist') : t('addToWishlist')}
            aria-pressed={isInWishlist}
            className={`py-2.5 px-4 min-h-11 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              isInWishlist
                ? 'border-[var(--color-like)] bg-[var(--color-like)]/15 text-[var(--color-like)]'
                : 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-like)]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-[var(--color-like)]' : ''}`} />
            <span className="hidden sm:inline">{isInWishlist ? t('inWishlist') : t('addToWishlist')}</span>
          </button>

          {/* Favourite toggle */}
          <button
            onClick={() => toggleFavoriteGame(game.id)}
            aria-label={isFav ? t('removeFromFavorites') : t('addToFavorites')}
            aria-pressed={isFav}
            title={isFav ? t('removeFromFavorites') : t('addToFavorites')}
            className={`py-2.5 px-4 min-h-11 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              isFav
                ? 'border-amber-400 bg-amber-400/15 text-amber-400'
                : 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-amber-400'
            }`}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
            <span className="hidden sm:inline">{t('favoriteGames')}</span>
          </button>
        </div>

        {/* Interactive Log & Review Form */}
        {showLogForm && (
          <form onSubmit={handleSaveLog} className="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl mb-5 space-y-3 text-xs">
            <h4 className="font-bold text-sm text-[var(--color-text-primary)]">
              {t('logThisGame')}
            </h4>

            {/* Star Rating Picker */}
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">{t('yourRating')}</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={language === 'ar' ? `تقييم ${star} من 5` : `Rate ${star} out of 5`}
                    aria-pressed={rating >= star}
                    className={`icon-btn-inline p-1.5 rounded-lg border transition-all ${
                      rating >= star ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-[var(--color-border)] text-gray-500'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${rating >= star ? 'fill-amber-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Hours & Status */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">{t('hoursLogged')}</label>
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                  className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">{t('yourStatus')}</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as GameStatus)}
                  className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text-primary)]"
                >
                  <option value="playing">{t('statusPlaying')}</option>
                  <option value="completed">{t('statusCompleted')}</option>
                  <option value="backlog">{t('statusBacklog')}</option>
                  <option value="dropped">{t('statusDropped')}</option>
                </select>
              </div>
            </div>

            {/* Review text */}
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">{t('writeReview')}</label>
              <textarea
                rows={3}
                placeholder={language === 'ar' ? 'اكتب مراجعتك أو انطباعك عن هذه اللعبة ليراه المتابعون...' : 'Write your review or thoughts on this game for the feed...'}
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t('saveChanges')}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
