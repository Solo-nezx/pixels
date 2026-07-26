import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { GamePicker } from './GamePicker';
import { Game, GameStatus } from '../types';
import {
  X, Star, Check, Play, CheckCircle2, CalendarClock, XCircle, Trash2, Gamepad2,
} from 'lucide-react';

interface LogGameModalProps {
  onClose: () => void;
  /** Pre-selected game, when opened from a poster rather than the Add button. */
  initialGame?: Game | null;
}

const STATUSES: { key: GameStatus; icon: React.ElementType; ar: string; en: string }[] = [
  { key: 'playing', icon: Play, ar: 'ألعبها الآن', en: 'Playing' },
  { key: 'completed', icon: CheckCircle2, ar: 'أكملتها', en: 'Completed' },
  { key: 'backlog', icon: CalendarClock, ar: 'أخطط للعبها', en: 'Plan to Play' },
  { key: 'dropped', icon: XCircle, ar: 'تركتها', en: 'Dropped' },
];

/**
 * Log or update a game.
 *
 * Replaces the old "Add game" button, which opened the game-detail modal on
 * `mockGames[0]` — a hardcoded demo title — so it could only ever log that one
 * game. This searches the full RAWG catalogue instead.
 */
export const LogGameModal: React.FC<LogGameModalProps> = ({ onClose, initialGame = null }) => {
  const { t, language, userGames, logGame, removeUserGame, showToast } = useApp();
  const isAr = language === 'ar';

  const [game, setGame] = useState<Game | null>(initialGame);
  const [rating, setRating] = useState(0);
  const [hours, setHours] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [reviewText, setReviewText] = useState('');

  const existing = game ? userGames.find((l) => l.gameId === game.id) : undefined;

  // Picking a game that's already logged should edit it, not silently reset it.
  useEffect(() => {
    if (!game) return;
    const log = userGames.find((l) => l.gameId === game.id);
    setRating(log?.rating ?? 0);
    setHours(log?.hoursPlayed ?? 0);
    setStatus(log?.status ?? 'playing');
    setReviewText(log?.reviewText ?? '');
  }, [game?.id]);

  const save = () => {
    if (!game) return;
    logGame(game.id, rating, hours, status, reviewText.trim() || undefined, game);
    showToast(existing
      ? (isAr ? 'تم تحديث اللعبة.' : 'Game updated.')
      : (isAr ? 'أُضيفت إلى مكتبتك.' : 'Added to your library.'));
    onClose();
  };

  const remove = () => {
    if (!game) return;
    removeUserGame(game.id);
    showToast(isAr ? 'أُزيلت من مكتبتك.' : 'Removed from your library.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('addGameToLog')}
      >
        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          <Gamepad2 className="w-4 h-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-extrabold text-[var(--color-text-primary)]">
            {existing ? (isAr ? 'تحديث اللعبة' : 'Update game') : t('addGameToLog')}
          </h2>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="icon-btn ms-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <GamePicker value={game} onChange={setGame} label={isAr ? 'اللعبة' : 'Game'} />

          {game && (
            <>
              {/* Status — the main thing people come here to change */}
              <div>
                <span className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1.5">
                  {t('yourStatus')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(({ key, icon: Icon, ar, en }) => (
                    <button
                      key={key}
                      onClick={() => setStatus(key)}
                      aria-pressed={status === key}
                      className={`pressable flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        status === key
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {isAr ? ar : en}
                      {status === key && <Check className="w-3 h-3 ms-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1.5">
                    {t('yourRating')}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star === rating ? 0 : star)}
                        aria-label={isAr ? `تقييم ${star}` : `Rate ${star}`}
                        className="p-0.5 hover:scale-125 transition-transform"
                      >
                        <Star className={`w-5 h-5 ${rating >= star ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-text-secondary)]'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1.5">
                    {t('hoursLogged')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1.5">
                  {t('writeReview')}
                </span>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={isAr ? 'اختياري — رأيك في اللعبة' : 'Optional — what did you think?'}
                  className="w-full p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none resize-none"
                />
              </label>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-[var(--color-border)]">
          {existing && (
            <button
              onClick={remove}
              aria-label={isAr ? 'إزالة من المكتبة' : 'Remove from library'}
              className="pressable p-2.5 rounded-xl border border-[var(--color-border)] text-rose-400 hover:border-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={save}
            disabled={!game}
            className="pressable flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="w-4 h-4" />
            {existing ? t('saveChanges') : t('addGameToLog')}
          </button>
        </div>
      </div>
    </div>
  );
};
