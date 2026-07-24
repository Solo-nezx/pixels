import React from 'react';
import { Badge } from '../types';
import { useApp } from '../context/AppContext';
import { 
  X, 
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
  CheckCircle2,
  Pin,
  PinOff
} from 'lucide-react';

interface BadgeDetailModalProps {
  badge: Badge;
  onClose: () => void;
  isSelf: boolean;
  isPinned: boolean;
  onTogglePin: (badgeId: string) => void;
}

export const BadgeDetailModal: React.FC<BadgeDetailModalProps> = ({
  badge,
  onClose,
  isSelf,
  isPinned,
  onTogglePin,
}) => {
  const { t, language } = useApp();

  const title = language === 'ar' ? badge.titleAr : badge.titleEn;
  const description = language === 'ar' ? badge.descriptionAr : badge.descriptionEn;

  // Dynamic Lucide icon lookup
  const renderIcon = (className: string) => {
    switch (badge.iconName) {
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

  const progressPercent = badge.progressMax
    ? Math.min(100, Math.round(((badge.progressCurrent || 0) / badge.progressMax) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Badge Graphic */}
        <div className="relative my-4 inline-block">
          <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center border-2 shadow-xl transition-all ${
            badge.unlocked
              ? `${badge.bgColor} ${badge.borderColor} ${badge.textColor}`
              : 'bg-gray-800/40 border-gray-700 text-gray-500 opacity-60'
          }`}>
            {renderIcon("w-10 h-10 stroke-[2.2]")}
          </div>

          {/* Status Badge Indicator Overlay */}
          <div className="absolute -bottom-2 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 border border-[var(--color-card)]">
            {badge.unlocked ? (
              <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                <span>{t('badgeUnlocked')}</span>
              </span>
            ) : (
              <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>{t('badgeLocked')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-black text-[var(--color-text-primary)] mt-3 mb-1">
          {title}
        </h3>

        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-3 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
          {badge.category}
        </span>

        <p className="text-xs text-[var(--color-text-primary)] leading-relaxed mb-4 px-2">
          {description}
        </p>

        {/* Progress Bar for Locked / In Progress Badges */}
        {!badge.unlocked && badge.progressMax && badge.progressMax > 1 && (
          <div className="mb-5 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-left">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-[var(--color-text-secondary)]">{t('badgeProgress')}</span>
              <span className="text-[#7C3AED]">
                {badge.progressCurrent} / {badge.progressMax} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#7C3AED] to-[#F43F5E] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Feature / Pin Toggle Button for Profile Owner */}
        {isSelf && badge.unlocked && (
          <button
            onClick={() => onTogglePin(badge.id)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-md ${
              isPinned
                ? 'bg-[#FF5D8F]/15 text-[#FF5D8F] border-[#FF5D8F]/40 hover:bg-[#FF5D8F]/25'
                : 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[#7C3AED]'
            }`}
          >
            {isPinned ? (
              <>
                <PinOff className="w-4 h-4" />
                <span>{t('unpinBadge')}</span>
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 text-[#7C3AED]" />
                <span>{t('pinBadge')}</span>
              </>
            )}
          </button>
        )}

      </div>
    </div>
  );
};
