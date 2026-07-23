import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '../types';
import { useApp } from '../context/AppContext';
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
  CheckCircle2 
} from 'lucide-react';

interface BadgeTooltipProps {
  badge: Badge;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export const BadgeTooltip: React.FC<BadgeTooltipProps> = ({ badge, children, position = 'top' }) => {
  const { language } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const title = language === 'ar' ? badge.titleAr : badge.titleEn;
  const description = language === 'ar' ? badge.descriptionAr : badge.descriptionEn;

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const handleClickOrTouch = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsVisible(prev => !prev);
  };

  useEffect(() => {
    const handleOutsideClick = () => setIsVisible(false);
    if (isVisible) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [isVisible]);

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
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClickOrTouch}
    >
      {children}

      {isVisible && (
        <div 
          className={`absolute z-50 w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl border border-slate-700 shadow-2xl transition-all duration-200 animate-fadeIn pointer-events-none ${
            position === 'top' 
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' 
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Arrow */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-slate-700 rotate-45 ${
              position === 'top' ? '-bottom-1.5 border-t-0 border-l-0' : '-top-1.5 border-r-0 border-b-0 border-t border-l'
            }`}
          />

          {/* Tooltip Content Header */}
          <div className="flex items-start gap-2 mb-2 pb-2 border-b border-slate-800">
            <div className={`p-1.5 rounded-lg border ${badge.bgColor} ${badge.borderColor} ${badge.textColor} shrink-0`}>
              {renderIcon("w-4 h-4")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h5 className="font-extrabold text-xs text-white truncate">{title}</h5>
                {badge.unlocked ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{language === 'ar' ? 'مكتمل' : 'Met'}</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{language === 'ar' ? 'قيد التقدم' : 'In Progress'}</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium capitalize">
                Category: {badge.category}
              </span>
            </div>
          </div>

          {/* Earn Criteria Description */}
          <div className="text-[11px] text-slate-300 leading-snug mb-2">
            <span className="font-bold text-[#2DD4BF] block mb-0.5">
              {language === 'ar' ? 'معايير الإنجاز:' : 'Achievement Criteria:'}
            </span>
            {description}
          </div>

          {/* Progress metric if locked */}
          {!badge.unlocked && badge.progressMax && badge.progressMax > 1 && (
            <div className="pt-1.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>{language === 'ar' ? 'نسبة التقدم' : 'Criteria Progress'}</span>
                <span className="text-[#7C5CFF]">{badge.progressCurrent} / {badge.progressMax} ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#7C5CFF] to-[#2DD4BF] h-full rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
