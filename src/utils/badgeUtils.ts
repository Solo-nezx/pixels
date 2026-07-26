import { Badge, User, UserGameLog } from '../types';

export const BADGE_DEFINITIONS: Omit<Badge, 'unlocked' | 'unlockedAt' | 'progressCurrent' | 'progressMax'>[] = [
  {
    id: 'badge_top_reviewer',
    badgeKey: 'top_reviewer',
    titleEn: 'Top Reviewer',
    titleAr: 'ناقد متميز',
    descriptionEn: 'Published 10 or more detailed game reviews for the community.',
    descriptionAr: 'نشر ١٠ مراجعات تفصيلية أو أكثر للمجتمع.',
    iconName: 'Award',
    category: 'community',
    colorGradient: 'from-amber-500 to-yellow-400',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'badge_retro_enthusiast',
    badgeKey: 'retro_enthusiast',
    titleEn: 'Retro Enthusiast',
    titleAr: 'عاشق الكلاسيكيات',
    descriptionEn: 'Passionate player and collector of classic RPGs, retro handhelds, and arcade games.',
    descriptionAr: 'شغوف بجمع ولعب الألعاب الكلاسيكية وأجهزة الجيم بوي والآركيد.',
    iconName: 'Gamepad2',
    category: 'collector',
    colorGradient: 'from-fuchsia-500 to-purple-500',
    textColor: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/30',
  },
  {
    id: 'badge_hundred_hours',
    badgeKey: 'hundred_hours',
    titleEn: '100+ Hours Played',
    titleAr: '١٠٠+ ساعة لعب',
    descriptionEn: 'Dedicated gamer with over 100 logged hours across various titles.',
    descriptionAr: 'لاعب متفانٍ سجل أكثر من ١٠٠ ساعة لعب عبر مختلف الألعاب.',
    iconName: 'Clock',
    category: 'milestone',
    colorGradient: 'from-teal-400 to-cyan-500',
    textColor: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/30',
  },
  {
    id: 'badge_thousand_hours',
    badgeKey: 'thousand_hours',
    titleEn: '1000+ Hours Veteran',
    titleAr: 'مخضرم ١٠٠٠+ ساعة',
    descriptionEn: 'Elite gaming veteran logging over 1,000 hours of gameplay.',
    descriptionAr: 'محارب قديم في عالم الألعاب بسجل يتجاوز ١٠٠٠ ساعة لعب.',
    iconName: 'Crown',
    category: 'milestone',
    colorGradient: 'from-amber-400 to-orange-500',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'badge_souls_survivor',
    badgeKey: 'souls_survivor',
    titleEn: 'Souls Survivor',
    titleAr: 'ناجي السولز',
    descriptionEn: 'Conquered punishing bosses in Elden Ring, Dark Souls, or Bloodborne.',
    descriptionAr: 'هزم أعتى الزعماء في ألعاب إيلدن رينغ ودارك سولز.',
    iconName: 'Flame',
    category: 'gaming',
    colorGradient: 'from-red-500 to-rose-600',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'badge_completionist',
    badgeKey: 'completionist',
    titleEn: 'Completionist',
    titleAr: 'المكتمل القهري',
    descriptionEn: 'Completed 3 or more games to 100% story/trophy status.',
    descriptionAr: 'أنهى ٣ ألعاب أو أكثر بنسبة إكمال ١٠٠٪.',
    iconName: 'Trophy',
    category: 'milestone',
    colorGradient: 'from-indigo-500 to-purple-600',
    textColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'badge_verified_trader',
    badgeKey: 'verified_trader',
    titleEn: 'Verified Trader',
    titleAr: 'تاجر مقتنيات موثوق',
    descriptionEn: 'Active marketplace participant buying, selling, or trading gear.',
    descriptionAr: 'عضو نشط في سوق بيكسلز للمقايضة وبيع المعدات والألعاب.',
    iconName: 'ShoppingBag',
    category: 'community',
    colorGradient: 'from-sky-400 to-blue-500',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    id: 'badge_pixel_pioneer',
    badgeKey: 'pixel_pioneer',
    titleEn: 'Pixel Pioneer',
    titleAr: 'رائد بيكسلز',
    descriptionEn: 'Early community member shaping the future of Pixels social network.',
    descriptionAr: 'عضو مبكر يساهم في تشكيل مستقبل شبكة بيكسلز الاجتماعية.',
    iconName: 'Sparkles',
    category: 'community',
    colorGradient: 'from-[var(--color-primary)] to-pink-500',
    textColor: 'text-[var(--color-primary)]',
    bgColor: 'bg-[var(--color-primary)]/10',
    borderColor: 'border-[var(--color-primary)]/30',
  },
];

/**
 * Calculates badge unlock statuses and progress for a given user profile and their game logs.
 */
export function calculateUserBadges(
  user: User,
  userLogs: UserGameLog[] = []
): Badge[] {
  // Calculated metrics
  const totalHours = userLogs.reduce((acc, log) => acc + (log.hoursPlayed || 0), 0) || user.hoursPlayed || 0;
  const reviewsCount = userLogs.filter(log => log.reviewText && log.reviewText.trim().length > 0).length || user.reviewsWrittenCount || 0;
  const completedGamesCount = userLogs.filter(log => log.status === 'completed').length || Math.floor((user.gamesLoggedCount || 0) * 0.4);

  // Retro check: bio mentions retro / handheld, or user holds games like zelda, or user id === usr_5 / usr_me
  const isRetro =
    user.bio.toLowerCase().includes('retro') ||
    user.bio.toLowerCase().includes('handheld') ||
    user.bio.toLowerCase().includes('gameboy') ||
    user.bio.toLowerCase().includes('vita') ||
    user.id === 'usr_5' ||
    user.id === 'usr_me';

  // Souls check: user logged Elden Ring or bio mentions souls / lands between
  const isSouls =
    user.bio.toLowerCase().includes('souls') ||
    user.bio.toLowerCase().includes('lands between') ||
    user.bio.toLowerCase().includes('elden') ||
    userLogs.some(log => log.gameId === 'g_elden_ring') ||
    user.id === 'usr_2' ||
    user.id === 'usr_me';

  // Verified / Pioneer check
  const isPioneer = user.verified || user.id === 'usr_me' || user.followersCount > 1000;

  return BADGE_DEFINITIONS.map(def => {
    let unlocked = false;
    let progressCurrent = 0;
    let progressMax = 1;

    switch (def.badgeKey) {
      case 'hundred_hours':
        progressMax = 100;
        progressCurrent = Math.min(totalHours, 100);
        unlocked = totalHours >= 100;
        break;

      case 'thousand_hours':
        progressMax = 1000;
        progressCurrent = Math.min(totalHours, 1000);
        unlocked = totalHours >= 1000;
        break;

      case 'top_reviewer':
        progressMax = 10;
        progressCurrent = Math.min(reviewsCount, 10);
        unlocked = reviewsCount >= 10;
        break;

      case 'retro_enthusiast':
        progressMax = 1;
        progressCurrent = isRetro ? 1 : 0;
        unlocked = isRetro;
        break;

      case 'souls_survivor':
        progressMax = 1;
        progressCurrent = isSouls ? 1 : 0;
        unlocked = isSouls;
        break;

      case 'completionist':
        progressMax = 3;
        progressCurrent = Math.min(completedGamesCount, 3);
        unlocked = completedGamesCount >= 3;
        break;

      case 'verified_trader':
        progressMax = 1;
        progressCurrent = user.verified || user.id === 'usr_me' || user.id === 'usr_3' ? 1 : 0;
        unlocked = user.verified || user.id === 'usr_me' || user.id === 'usr_3';
        break;

      case 'pixel_pioneer':
        progressMax = 1;
        progressCurrent = isPioneer ? 1 : 0;
        unlocked = isPioneer;
        break;

      default:
        unlocked = false;
    }

    // Default featured pins for mock users if not explicitly set
    let featured = user.featuredBadgeIds?.includes(def.id) ?? false;

    if (!user.featuredBadgeIds) {
      if (user.id === 'usr_me' && ['badge_top_reviewer', 'badge_retro_enthusiast', 'badge_hundred_hours'].includes(def.id)) {
        featured = true;
      } else if (user.id === 'usr_5' && ['badge_retro_enthusiast', 'badge_hundred_hours'].includes(def.id)) {
        featured = true;
      } else if (user.id === 'usr_2' && ['badge_souls_survivor', 'badge_thousand_hours', 'badge_top_reviewer'].includes(def.id)) {
        featured = true;
      } else if (user.id === 'usr_4' && ['badge_top_reviewer', 'badge_thousand_hours', 'badge_pixel_pioneer'].includes(def.id)) {
        featured = true;
      }
    }

    return {
      ...def,
      unlocked,
      unlockedAt: unlocked ? 'Verified Milestone' : undefined,
      progressCurrent,
      progressMax,
      featured,
    };
  });
}
