import React, { useState } from 'react';
import { Badge, User, UserGameLog } from '../types';
import { useApp } from '../context/AppContext';
import { calculateUserBadges } from '../utils/badgeUtils';
import { BadgeDetailModal } from './BadgeDetailModal';
import { BadgeTooltip } from './BadgeTooltip';
import { 
  Award, 
  Flame, 
  Clock, 
  Gamepad2, 
  Sparkles, 
  Trophy, 
  ShieldCheck, 
  ShoppingBag, 
  Star, 
  Crown, 
  Lock,
  Pin
} from 'lucide-react';

interface BadgesSectionProps {
  user: User;
  userLogs?: UserGameLog[];
  isSelf: boolean;
}

export const BadgesSection: React.FC<BadgesSectionProps> = ({ user, userLogs = [], isSelf }) => {
  const { t, language, showToast } = useApp();

  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  // State for pinned/featured badge IDs
  const [pinnedBadgeIds, setPinnedBadgeIds] = useState<string[]>(() => {
    return user.featuredBadgeIds || ['badge_top_reviewer', 'badge_retro_enthusiast', 'badge_hundred_hours'];
  });

  const allBadges = calculateUserBadges(user, userLogs);

  const unlockedCount = allBadges.filter(b => b.unlocked).length;

  const togglePinBadge = (badgeId: string) => {
    setPinnedBadgeIds(prev => {
      let updated;
      if (prev.includes(badgeId)) {
        updated = prev.filter(id => id !== badgeId);
        showToast(language === 'ar' ? 'تم إلغاء التثبيت من الواجهة' : 'Badge unpinned from profile header');
      } else {
        if (prev.length >= 3) {
          showToast(language === 'ar' ? 'يمكنك تثبيت ٣ أوسمة كحد أقصى' : 'Max 3 featured badges allowed on header');
          return prev;
        }
        updated = [...prev, badgeId];
        showToast(language === 'ar' ? 'تم تثبيت الوسام بأعلى الملف الشخصي' : 'Badge pinned to profile header!');
      }
      return updated;
    });
  };

  const filteredBadges = allBadges.filter(b => {
    if (filter === 'unlocked') return b.unlocked;
    if (filter === 'locked') return !b.unlocked;
    return true;
  });

  // Dynamic Lucide icon lookup
  const renderBadgeIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Award': return <Award className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Clock': return <Clock className={className} />;
      case 'Gamepad2': return <Gamepad2 className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Trophy': return <Trophy className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'Star': return <Star className={className} />;
      case 'Crown': return <Crown className={className} />;
      default: return <Award className={className} />;
    }
  };

  return (
    <section className="p-4 border-b border-[var(--color-border)] select-none">
      
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
            {t('badgesSection')}
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] font-black text-[11px] border border-[#7C3AED]/30">
            {unlockedCount}/{allBadges.length} {t('badgeUnlocked')}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 p-0.5 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] text-[10px] font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filter === 'all'
                ? 'bg-[#7C3AED] text-white shadow'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('filterAllBadges')}
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filter === 'unlocked'
                ? 'bg-[#7C3AED] text-white shadow'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('filterUnlocked')}
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filter === 'locked'
                ? 'bg-[#7C3AED] text-white shadow'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('filterLocked')}
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] mb-4">
        {t('badgesSubtitle')}
      </p>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {filteredBadges.map(badge => {
          const isPinned = pinnedBadgeIds.includes(badge.id);
          const title = language === 'ar' ? badge.titleAr : badge.titleEn;

          return (
            <BadgeTooltip key={badge.id} badge={badge} position="top">
              <div
                onClick={() => setSelectedBadge(badge)}
                className={`group relative p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between w-full h-full ${
                  badge.unlocked
                    ? `${badge.bgColor} ${badge.borderColor} hover:scale-[1.02] shadow-sm hover:shadow-md`
                    : 'bg-[var(--color-card)]/50 border-[var(--color-border)] opacity-60 hover:opacity-80'
                }`}
              >
                {/* Pin indicator icon */}
                {isPinned && badge.unlocked && (
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-[#FF5D8F] text-white shadow text-[9px] flex items-center justify-center">
                    <Pin className="w-2.5 h-2.5 fill-white stroke-[2.5]" />
                  </div>
                )}

                {/* Badge Icon Graphic Container */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                    badge.unlocked
                      ? `${badge.bgColor} ${badge.borderColor} ${badge.textColor}`
                      : 'bg-gray-800 border-gray-700 text-gray-500'
                  }`}>
                    {badge.unlocked ? (
                      renderBadgeIcon(badge.iconName, "w-5 h-5")
                    ) : (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-xs text-[var(--color-text-primary)] truncate">
                      {title}
                    </h4>
                    <p className="text-[10px] text-[var(--color-text-secondary)] truncate capitalize">
                      {badge.category}
                    </p>
                  </div>
                </div>

                {/* Status / Progress bar */}
                <div className="pt-2 border-t border-[var(--color-border)]/40 flex items-center justify-between text-[10px] font-semibold">
                  {badge.unlocked ? (
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{t('badgeUnlocked')}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 truncate">
                      {badge.progressCurrent}/{badge.progressMax}
                    </span>
                  )}
                  <span className="text-[9px] text-[var(--color-text-secondary)] group-hover:text-[#7C3AED] transition-colors">
                    Details →
                  </span>
                </div>
              </div>
            </BadgeTooltip>
          );
        })}
      </div>

      {/* Badge Detail Modal Popup */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
          isSelf={isSelf}
          isPinned={pinnedBadgeIds.includes(selectedBadge.id)}
          onTogglePin={togglePinBadge}
        />
      )}

    </section>
  );
};
