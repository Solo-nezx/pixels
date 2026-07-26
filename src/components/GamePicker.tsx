import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Gamepad2 } from 'lucide-react';
import { Game } from '../types';
import { useApp } from '../context/AppContext';
import { searchGames } from '../services/rawg';

interface GamePickerProps {
  value: Game | null;
  onChange: (game: Game | null) => void;
  /** Optional label rendered above the field. */
  label?: string;
}

/**
 * Type-to-search game picker backed by the RAWG catalogue, so any PC or console
 * title is reachable — not just the games currently loaded in the app. Falls
 * back to filtering the in-memory catalogue when the API is unavailable.
 */
export const GamePicker: React.FC<GamePickerProps> = ({ value, onChange, label }) => {
  const { allGames, language } = useApp();
  const isAr = language === 'ar';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Debounced search — local catalogue first for instant feedback, then RAWG.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const local = allGames
      .filter((g) => g.title.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5);
    setResults(local);
    setIsSearching(true);

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const remote = await searchGames(q, 12);
        if (!active) return;
        // Merge, de-duplicating by title so local hits don't repeat.
        const seen = new Set(local.map((g) => g.title.toLowerCase()));
        const merged = [...local, ...remote.filter((g) => !seen.has(g.title.toLowerCase()))];
        setResults(merged.slice(0, 12));
      } catch {
        /* keep local results */
      } finally {
        if (active) setIsSearching(false);
      }
    }, 320);

    return () => { active = false; clearTimeout(timer); };
  }, [query, allGames]);

  const pick = (game: Game) => {
    onChange(game);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      {label && (
        <span className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)] mb-1.5">
          <Gamepad2 className="w-4 h-4 text-[var(--color-primary)]" />
          {label}
        </span>
      )}

      {/* Selected game chip */}
      {value ? (
        <div className="flex items-center gap-2.5 p-2 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10">
          <img
            src={value.coverUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80';
            }}
            className="w-8 h-11 rounded-md object-cover shrink-0 border border-[var(--color-border)]"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-[var(--color-text-primary)] truncate">{value.title}</span>
            <span className="block text-[10px] text-[var(--color-text-secondary)] truncate">
              {[value.developer, value.releaseYear || null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={isAr ? 'إزالة اللعبة' : 'Clear game'}
            className="pressable p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-white hover:bg-rose-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
              placeholder={isAr ? 'اكتب اسم أي لعبة (PC أو كونسول)...' : 'Type any game name (PC or console)...'}
              aria-label={isAr ? 'ابحث عن لعبة' : 'Search for a game'}
              className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl ps-9 pe-9 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
            {isSearching && (
              <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 animate-spin text-[var(--color-primary)]" />
            )}
          </div>

          {/* Results list — kept in normal flow so a scrollable modal can't clip it */}
          {isOpen && query.trim().length >= 2 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-inner p-1 divide-y divide-[var(--color-border)]/60">
              {results.length > 0 ? (
                results.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => pick(game)}
                    className="w-full flex items-center gap-2.5 p-2 first:rounded-t-lg last:rounded-b-lg hover:bg-[var(--color-primary)]/10 transition-colors text-start"
                  >
                    <img
                      src={game.coverUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80';
                      }}
                      className="w-8 h-11 rounded-md object-cover shrink-0 border border-[var(--color-border)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-[var(--color-text-primary)] truncate">{game.title}</span>
                      <span className="block text-[10px] text-[var(--color-text-secondary)] truncate">
                        {[game.releaseYear || null, game.platforms?.slice(0, 3).join(', ') || null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-3 text-center text-[11px] text-[var(--color-text-secondary)]">
                  {isSearching
                    ? (isAr ? 'جاري البحث...' : 'Searching…')
                    : (isAr ? 'لا توجد نتائج.' : 'No games found.')}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
