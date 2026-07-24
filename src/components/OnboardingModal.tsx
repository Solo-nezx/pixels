import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Search, Sparkles, Gamepad2 } from 'lucide-react';

interface OnboardingModalProps {
  onFinish: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onFinish }) => {
  const { t, logGame, showToast, allGames } = useApp();

  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGameSelection = (gameId: string) => {
    setSelectedGameIds(prev =>
      prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]
    );
  };

  const handleFinish = () => {
    // Populate profile with selected games
    selectedGameIds.forEach((id, idx) => {
      logGame(id, 5, 20 + idx * 15, 'playing');
    });

    showToast(t('finishOnboarding'));
    onFinish();
  };

  const filteredGames = allGames.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.developer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Onboarding Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center mx-auto mb-2 border border-[#7C3AED]/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-[var(--color-text-primary)]">
            {t('onboardingTitle')}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto mt-1">
            {t('onboardingSubtitle')}
          </p>
        </div>

        {/* Game Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute top-2.5 left-3 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder={t('searchGamesToPick')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Selected Count Indicator */}
        <div className="flex items-center justify-between text-xs font-semibold mb-3 px-1 text-[var(--color-text-secondary)]">
          <span>{selectedGameIds.length} {t('selectedCount')}</span>
          <span className="text-[#F43F5E]">RAWG/IGDB Sync Ready</span>
        </div>

        {/* Multi-Select Game Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-64 overflow-y-auto pr-1">
          {filteredGames.map(game => {
            const isSelected = selectedGameIds.includes(game.id);
            return (
              <div
                key={game.id}
                onClick={() => toggleGameSelection(game.id)}
                className={`group relative rounded-xl border-2 p-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#7C3AED] bg-[#7C3AED]/10 shadow-md shadow-[#7C3AED]/20'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-gray-500'
                }`}
              >
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2">
                  <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#7C3AED] text-white shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate">{game.title}</h4>
                  <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{game.platforms.join(', ')}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Finish Button */}
        <button
          onClick={handleFinish}
          className="w-full py-3 bg-[#7C3AED] text-white font-bold rounded-xl hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/30 transition-all text-xs flex items-center justify-center gap-1.5"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>{t('finishOnboarding')}</span>
        </button>

      </div>
    </div>
  );
};
