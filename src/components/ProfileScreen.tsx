import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  countFollowers, fetchAuthoredStats, fetchPublicProfileData, fetchUserPosts,
  fetchUserReplies, AuthoredStats, ReplyWithContext, PublicProfileData,
} from '../services/socialData';
import { GameStatus, Post, UserGameLog } from '../types';
import { PostCard } from './PostCard';
import { SettingsModal } from './SettingsModal';
import { LogGameModal } from './LogGameModal';
import { FollowListModal, FollowListKind } from './FollowListModal';
import { useApp } from '../context/AppContext';
import { mockCurrentUser, mockGames } from '../data/mockData';
import { EditProfileModal } from './EditProfileModal';
import { BadgesSection } from './BadgesSection';
import { BadgeTooltip } from './BadgeTooltip';
import { CountUp } from './CountUp';
import { calculateUserBadges } from '../utils/badgeUtils';
import { countRatedOrReviewed, profileCollections } from '../utils/statUtils';
import { 
  ShieldCheck, 
  Lock, 
  Heart, 
  Gamepad2, 
  Star, 
  Clock, 
  UserPlus, 
  UserCheck, 
  PlusCircle, 
  Edit3,
  Award,
  MessageSquare,
  Ban,
  CalendarDays,
  Link as LinkIcon,
  Flame,
  Sparkles,
  Trophy,
  ShoppingBag,
  Crown,
  CalendarClock,
  Loader2,
  Settings as SettingsIcon,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/** Renders a badge's lucide icon from the name stored on the badge. */
const BADGE_ICONS: Record<string, React.ElementType> = {
  Award, Flame, Clock, Gamepad2, Sparkles, Trophy, ShoppingBag, Crown,
};
const BadgeIcon: React.FC<{ name: string }> = ({ name }) => {
  const Icon = BADGE_ICONS[name] || Award;
  return <Icon className="w-3.5 h-3.5 stroke-[2.5]" />;
};

type ProfileSection = 'reviews' | 'games' | 'badges';
/** Library filters: the four game tabs this page used to have, collapsed into one row. */
type GameFilter = 'all' | GameStatus | 'favorites';

/** One-tap status changes offered on every poster. */
const STATUS_ACTIONS = [
  { status: 'playing' as GameStatus, icon: Play, ar: 'ألعبها الآن', en: 'Playing' },
  { status: 'completed' as GameStatus, icon: CheckCircle2, ar: 'أكملتها', en: 'Completed' },
  { status: 'backlog' as GameStatus, icon: CalendarClock, ar: 'أخطط للعبها', en: 'Plan to Play' },
  { status: 'dropped' as GameStatus, icon: XCircle, ar: 'تركتها', en: 'Dropped' },
];

export const ProfileScreen: React.FC = () => {
  const { 
    t, 
    auth, 
    userGames,
    allGames,
    posts,
    logGame,
    showToast,
    wishlist, 
    viewingProfileUser, 
    followingIds, 
    toggleFollowUser,
    setSelectedGameForDetail,
    toggleFavoriteGame,
    openConversationWith,
    isBlocked,
    toggleBlockUser,
    setActiveTab,
    openGuestModal,
    language
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logGameOpen, setLogGameOpen] = useState(false);
  const [section, setSection] = useState<ProfileSection>('reviews');
  /** Sub-filters inside the merged tabs. */
  const [reviewFilter, setReviewFilter] = useState<'all' | 'posts' | 'replies'>('all');
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');

  /** Everything this member wrote — loaded on demand by the Posts/Replies tabs. */
  const [authoredPosts, setAuthoredPosts] = useState<Post[] | null>(null);
  const [replies, setReplies] = useState<ReplyWithContext[] | null>(null);

  // Follower total counted from the `follows` collection (the stored field is
  // only a fallback, since it isn't authoritative).
  const [liveFollowers, setLiveFollowers] = useState<number | null>(null);
  const [followList, setFollowList] = useState<FollowListKind | null>(null);
  /** Likes / reviews counted across every post the profile owner wrote. */
  const [authoredStats, setAuthoredStats] = useState<AuthoredStats | null>(null);
  /** Another member's library + wishlist. Null while loading (or on my own page). */
  const [otherData, setOtherData] = useState<PublicProfileData | null>(null);

  /** Shareable link to this profile (read on load by App). */
  const copyProfileLink = async () => {
    const url = `${window.location.origin}/?user=${encodeURIComponent(targetUser.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(language === 'ar' ? 'تم نسخ رابط الملف.' : 'Profile link copied.');
    } catch {
      showToast(language === 'ar' ? 'تعذّر النسخ.' : 'Copy failed.');
    }
  };

  // Determine which user profile to show
  const isSelf = !viewingProfileUser || (auth.user && viewingProfileUser.id === auth.user.id);
  const targetUser = isSelf ? (auth.user || mockCurrentUser) : viewingProfileUser;

  const isFollowing = followingIds.includes(targetUser.id);

  /**
   * Whose data this page renders. Everything below must derive from these two
   * rather than from context, or a visitor sees their own library and wishlist
   * on someone else's profile.
   */
  const { logs: displayLogs, wishlist: displayWishlist } = profileCollections<UserGameLog, string>(
    !!isSelf,
    { logs: userGames, wishlist },
    otherData && { logs: otherData.gameLogs, wishlist: otherData.wishlist },
  );
  /** True while another member's collections are still loading. */
  const loadingOther = !isSelf && otherData === null;

  // Map the logs to actual Game objects with rating.
  // Prefer the snapshot saved with the log, so a game logged from live search
  // still renders after a reload even if it left the trending catalogue.
  const loggedGamesWithData = displayLogs
    .map(log => {
      const g = log.game
        || allGames.find(game => game.id === log.gameId)
        || mockGames.find(game => game.id === log.gameId)
        // Never drop a log we can't resolve: dropping it made an imported
        // library of 61 titles render as the 8 that happened to be trending,
        // and the counters silently agreed. A placeholder keeps it honest.
        || {
          id: log.gameId,
          title: log.gameId.startsWith('steam_')
            ? `${language === 'ar' ? 'لعبة Steam' : 'Steam game'} #${log.gameId.replace('steam_', '')}`
            : log.gameId,
          coverUrl: '',
          releaseYear: 0,
          developer: '',
          genres: [],
          platforms: [],
          averageRating: 0,
          ratingCount: 0,
          summary: '',
        };
      return { game: g, log };
    })
    .filter(Boolean)
    // Most-played first — the interesting titles should lead.
    .sort((a, b) => (b!.log.hoursPlayed || 0) - (a!.log.hoursPlayed || 0)) as {
      game: typeof mockGames[0]; log: typeof userGames[0];
    }[];

  useEffect(() => {
    let active = true;
    setLiveFollowers(null);
    countFollowers(targetUser.id).then((n) => { if (active) setLiveFollowers(n); });
    return () => { active = false; };
  }, [targetUser.id, isFollowing]);

  // Real like / review totals for whoever's profile this is.
  useEffect(() => {
    let active = true;
    setAuthoredStats(null);
    fetchAuthoredStats(targetUser.id).then((s) => { if (active) setAuthoredStats(s); });
    return () => { active = false; };
  }, [targetUser.id, posts.length]);

  // Load another member's library + wishlist once, then derive everything from it.
  useEffect(() => {
    if (isSelf) { setOtherData(null); return; }
    let active = true;
    setOtherData(null);
    fetchPublicProfileData(targetUser.id).then((d) => { if (active) setOtherData(d); });
    return () => { active = false; };
  }, [targetUser.id, isSelf]);

  // Posts and replies are fetched per profile, and only for the tab in view —
  // the loaded feed page holds a fraction of what someone has written.
  // Clear only when the profile changes — leaving the tab shouldn't discard
  // what was loaded, or the tab's own counter would drop as you navigate away.
  useEffect(() => {
    setAuthoredPosts(null);
    setReplies(null);
  }, [targetUser.id]);

  useEffect(() => {
    if (section !== 'reviews') return;
    let active = true;
    fetchUserPosts(targetUser.id).then((p) => { if (active) setAuthoredPosts(p); });
    return () => { active = false; };
  }, [targetUser.id, section, posts.length]);

  useEffect(() => {
    if (section !== 'reviews') return;
    let active = true;
    fetchUserReplies(targetUser.id).then((r) => { if (active) setReplies(r); });
    return () => { active = false; };
  }, [targetUser.id, section]);

  // Someone else's page has no Badges tab, so never leave the view stuck there.
  useEffect(() => {
    if (!isSelf && section === 'badges') setSection('reviews');
  }, [isSelf, section]);

  /** Games this profile shares with mine — only meaningful on someone else's page. */
  const sharedCount = (() => {
    if (isSelf || otherData === null) return null;
    const mine = new Set(userGames.map((l) => l.gameId));
    return otherData.gameLogs.filter((l) => mine.has(l.gameId)).length;
  })();

  const favoriteGamesData = loggedGamesWithData.filter(({ log }) => log.isFavorite);

  /** Unlocked badges, shown beside the name. Capped so the header stays a header. */
  const earnedBadges = calculateUserBadges(targetUser, displayLogs)
    .filter((b) => b.unlocked)
    .slice(0, 6);

  // Wishlisted titles aren't logs, so they carry no log — the grid treats them
  // as a separate kind of entry rather than a fifth status.
  const wishlistEntries = displayWishlist
    .map((id) => allGames.find((g) => g.id === id) || mockGames.find((g) => g.id === id))
    .filter(Boolean)
    .map((game) => ({ game: game!, log: undefined, wishlistOnly: true as const }));

  const loggedEntries = loggedGamesWithData.map(({ game, log }) => ({
    game, log, wishlistOnly: false as const,
  }));

  /** Which slice of the library the filter row is asking for. */
  const visibleEntries = gameFilter === 'all'
    ? [...loggedEntries, ...wishlistEntries]
    : gameFilter === 'favorites'
      ? loggedEntries.filter((e) => e.log?.isFavorite)
      : gameFilter === 'wishlist'
        ? wishlistEntries
        : loggedEntries.filter((e) => e.log?.status === gameFilter);

  const gameFilters = ([
    { key: 'all', label: language === 'ar' ? 'الكل' : 'All', icon: undefined, count: loggedEntries.length + wishlistEntries.length },
    { key: 'playing', label: language === 'ar' ? 'ألعبها' : 'Playing', icon: Play, count: loggedEntries.filter((e) => e.log?.status === 'playing').length },
    { key: 'completed', label: language === 'ar' ? 'أكملها' : 'Completed', icon: CheckCircle2, count: loggedEntries.filter((e) => e.log?.status === 'completed').length },
    { key: 'backlog', label: t('planToPlaySection'), icon: CalendarClock, count: loggedEntries.filter((e) => e.log?.status === 'backlog').length },
    { key: 'favorites', label: t('favoriteGames'), icon: Star, count: favoriteGamesData.length },
    { key: 'wishlist', label: t('wishlistSection'), icon: Heart, count: wishlistEntries.length },
    { key: 'dropped', label: language === 'ar' ? 'تركها' : 'Dropped', icon: XCircle, count: loggedEntries.filter((e) => e.log?.status === 'dropped').length },
  ] as { key: GameFilter; label: string; icon?: React.ElementType; count: number }[]);

  /** Posts and replies woven into one timeline, newest first. */
  const timeline = (() => {
    if (!authoredPosts || !replies) return [];
    const items: ({ kind: 'post'; ts: number; post: Post } | { kind: 'reply'; ts: number; reply: ReplyWithContext })[] = [];
    if (reviewFilter !== 'replies') {
      authoredPosts.forEach((p) => items.push({ kind: 'post', ts: (p as Post & { createdAtTs?: number }).createdAtTs || 0, post: p }));
    }
    if (reviewFilter !== 'posts') {
      replies.forEach((r) => items.push({
        kind: 'reply',
        ts: (r.comment as { createdAtTs?: number }).createdAtTs || 0,
        reply: r,
      }));
    }
    return items.sort((a, b) => b.ts - a.ts);
  })();

  const tabs = ([
    { key: 'reviews', label: t('reviewsSection'), icon: MessageSquare, count: (authoredStats?.posts ?? 0) + (replies?.length ?? 0) },
    { key: 'games', label: t('gamesTab'), icon: Gamepad2, count: loggedEntries.length + wishlistEntries.length },
    // Progress toward locked badges is only meaningful to the person earning them.
    ...(isSelf ? [{ key: 'badges' as const, label: t('badgesSection'), icon: Award, count: undefined }] : []),
  ] as { key: ProfileSection; label: string; icon: React.ElementType; count?: number }[]);

  // Stats: derive from the viewer's own data where we have it, and only fall
  // back to the stored counters for other people's profiles (or before load).
  const totalHours = isSelf
    ? (userGames.reduce((acc, log) => acc + (log.hoursPlayed || 0), 0) || targetUser.hoursPlayed)
    : (displayLogs.reduce((acc, log) => acc + (log.hoursPlayed || 0), 0) || targetUser.hoursPlayed);

  const gamesLoggedCount = isSelf
    ? (loggedGamesWithData.length || userGames.length)
    : (loggedGamesWithData.length || targetUser.gamesLoggedCount);

  // "Rated & Reviewed": any game the player put an opinion on — a star rating
  // or a written review (counted once even when it has both) — plus rated posts.
  const reviewsWrittenCount = (authoredStats?.reviews ?? 0) + countRatedOrReviewed(displayLogs);

  // Counted across every post the owner wrote, not just the loaded page.
  const likesReceivedCount = authoredStats?.likes ?? targetUser.likesReceivedCount;

  const followingCount = isSelf ? followingIds.length : targetUser.followingCount;

  return (
    <div className="w-full pb-20">
      
      {/* 1. Header: Banner, Avatar, Bio, Follow/Edit */}
      <div className="relative border-b border-[var(--color-border)] bg-[var(--color-card)]">
        
        {/* Banner */}
        <div className="h-36 sm:h-48 w-full overflow-hidden bg-slate-800 relative">
          <img
            src={targetUser.banner}
            alt="Banner"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-card)] via-transparent to-black/30"></div>
        </div>

        {/* Profile Header Content */}
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between relative -top-10 mb-[-1.5rem] flex-wrap gap-2">
            
            {/* Overlapping Avatar */}
            <div className="relative">
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[var(--color-card)] ring-2 ring-[var(--color-primary)]/50 shadow-[var(--glow-primary)] bg-[var(--color-card)]"
              />
              {targetUser.verified && (
                <span className="absolute bottom-1 right-1 bg-[var(--color-primary)] text-white p-1 rounded-full shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Edit / Follow Action Buttons */}
            <div className="flex items-center gap-2">
              {isSelf ? (
                auth.isLoggedIn ? (
                  <>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    title={t('settings')}
                    aria-label={t('settings')}
                    className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)] transition-all shadow-sm"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('settings')}</span>
                  </button>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    aria-label={t('editProfile')}
                    className="icon-btn-inline flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>{t('editProfile')}</span>
                  </button>
                  </>
                ) : (
                  <button
                    onClick={() => openGuestModal()}
                    className="px-4 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-all"
                  >
                    {t('login')}
                  </button>
                )
              ) : (
                <>
                <button
                  onClick={() => openConversationWith(targetUser)}
                  aria-label={language === 'ar' ? 'رسالة' : 'Message'}
                  className="pressable flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] transition-all shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>{language === 'ar' ? 'رسالة' : 'Message'}</span>
                </button>
                <button
                  onClick={() => toggleFollowUser(targetUser.id)}
                  aria-label={isFollowing ? t('following') : t('follow')}
                  aria-pressed={isFollowing}
                  className={`icon-btn-inline flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                    isFollowing
                      ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                      : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t('following')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('follow')}</span>
                    </>
                  )}
                </button>

                {/* Block / unblock */}
                <button
                  onClick={() => {
                    const blocked = isBlocked(targetUser.id);
                    const ok = blocked || window.confirm(
                      language === 'ar'
                        ? `حظر ${targetUser.name}؟ لن ترى منشوراته أو منتجاته أو رسائله.`
                        : `Block ${targetUser.name}? You won't see their posts, listings or messages.`,
                    );
                    if (ok) toggleBlockUser(targetUser);
                  }}
                  title={isBlocked(targetUser.id)
                    ? (language === 'ar' ? 'إلغاء الحظر' : 'Unblock')
                    : (language === 'ar' ? 'حظر' : 'Block')}
                  aria-label={isBlocked(targetUser.id)
                    ? (language === 'ar' ? 'إلغاء الحظر' : 'Unblock')
                    : (language === 'ar' ? 'حظر' : 'Block')}
                  className={`pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isBlocked(targetUser.id)
                      ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-rose-500 hover:text-rose-400'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isBlocked(targetUser.id)
                      ? (language === 'ar' ? 'محظور' : 'Blocked')
                      : (language === 'ar' ? 'حظر' : 'Block')}
                  </span>
                </button>
                </>
              )}
            </div>

          </div>

          {/* User Bio & Handle */}
          <div className="mt-2 mb-4">
            <h1 className="text-lg font-extrabold text-[var(--color-text-primary)] flex items-center gap-1.5 flex-wrap">
              <span>{targetUser.name}</span>
              {targetUser.verified && <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />}

              {/* Earned badges sit beside the name, Discord-style, so they read
                  as part of the identity rather than a section further down. */}
              {earnedBadges.length > 0 && (
                <span className="flex items-center gap-1 ps-1.5 ms-0.5 border-s border-[var(--color-border)]">
                  {earnedBadges.map((badge) => (
                    <BadgeTooltip key={badge.id} badge={badge} position="bottom">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-lg border shadow-sm transition-transform hover:scale-110 cursor-pointer ${badge.bgColor} ${badge.borderColor} ${badge.textColor}`}
                      >
                        <BadgeIcon name={badge.iconName} />
                      </span>
                    </BadgeTooltip>
                  ))}
                </span>
              )}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
              @{targetUser.username}
            </p>
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed max-w-xl">
              {targetUser.bio}
            </p>

            {/* Member since · games in common · share */}
            <div className="flex items-center gap-3 flex-wrap mt-2 text-[11px] text-[var(--color-text-secondary)]">
              {targetUser.createdAtTs && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'عضو منذ ' : 'Member since '}
                  {new Date(targetUser.createdAtTs).toLocaleDateString(
                    language === 'ar' ? 'ar' : 'en',
                    { month: 'long', year: 'numeric' },
                  )}
                </span>
              )}

              {!isSelf && sharedCount !== null && sharedCount > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-[var(--color-secondary)]">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  {sharedCount} {sharedCount === 1 ? t('gameInCommon') : t('gamesInCommon')}
                </span>
              )}

              <button
                onClick={copyProfileLink}
                className="pressable flex items-center gap-1.5 hover:text-[var(--color-text-primary)] transition-colors"
                title={language === 'ar' ? 'نسخ رابط الملف' : 'Copy profile link'}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {language === 'ar' ? 'مشاركة الملف' : 'Share profile'}
              </button>
            </div>

          </div>

          {/* 2. Stats Bar: Followers, Following, Likes, Hours, Games Logged, Reviews */}
          {!isSelf && targetUser.isPrivate ? (
            <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-[var(--color-like)]" />
              <span>{t('privateProfileNotice')}</span>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-3 sm:grid-cols-6 gap-2 py-3 border-t border-[var(--color-border)] text-center"
            >
              {[
                { value: liveFollowers ?? targetUser.followersCount, label: t('followers'), color: 'text-[var(--color-primary)]', opens: 'followers' as const },
                { value: followingCount, label: t('following'), color: 'text-[var(--color-text-primary)]', opens: 'following' as const },
                { value: likesReceivedCount, label: t('likesReceived'), color: 'text-[var(--color-like)]' },
                { value: totalHours, label: t('hoursPlayed'), color: 'text-[var(--color-secondary)]', suffix: 'h' },
                { value: gamesLoggedCount, label: t('gamesLogged'), color: 'text-[var(--color-text-primary)]' },
                { value: reviewsWrittenCount, label: t('reviewsWritten'), color: 'text-[var(--color-text-primary)]' },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={{ hidden: { opacity: 0, y: 12, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -3 }}
                  onClick={stat.opens ? () => setFollowList(stat.opens) : undefined}
                  role={stat.opens ? 'button' : undefined}
                  className={`p-2.5 rounded-2xl bg-gradient-to-b from-[var(--color-elevated)] to-[var(--color-bg)] border border-white/5 hover:border-[var(--color-primary)]/40 transition-colors ${
                    stat.opens ? 'cursor-pointer' : ''
                  }`}
                >
                  <CountUp
                    value={stat.value}
                    suffix={stat.suffix}
                    className={`block text-sm font-black ${stat.color}`}
                  />
                  <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>
      </div>

      {/* Privacy now lives in Settings, alongside language and theme. */}

      {/* Section tabs — three now: what they wrote, what they play, their badges */}
      <div className="px-4 pt-2 border-b border-[var(--color-border)] bg-[var(--color-card)]/40 flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const active = section === key;
          return (
            <button
              key={key}
              onClick={() => setSection(key)}
              aria-current={active ? 'page' : undefined}
              className={`relative shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors ${
                active
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{label}</span>
              {typeof count === 'number' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  active ? 'bg-[var(--color-primary)]/15' : 'bg-[var(--color-border)]'
                }`}>
                  {count}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="profileTabIndicator"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-[var(--color-primary)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >

      {loadingOther && section !== 'reviews' && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
        </div>
      )}

      {/* ---------------- REVIEWS: posts and replies in one timeline ------------- */}
      {section === 'reviews' && (
        <section className="p-4 border-b border-[var(--color-border)]">
          {/* Sub-filter — one tab, but still separable */}
          <div className="flex items-center gap-1.5 mb-3">
            {([
              { key: 'all', label: language === 'ar' ? 'الكل' : 'All', count: undefined },
              { key: 'posts', label: t('postsSection'), count: authoredPosts?.length },
              { key: 'replies', label: t('repliesSection'), count: replies?.length },
            ] as const).map(({ key, label, count }) => {
              const active = reviewFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setReviewFilter(key)}
                  className={`pressable px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {label}
                  {typeof count === 'number' && <span className={active ? ' opacity-80' : ' opacity-60'}> {count}</span>}
                </button>
              );
            })}
          </div>

          {authoredPosts === null || replies === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : timeline.length > 0 ? (
            <div className="space-y-3">
              {timeline.map((item) => item.kind === 'post' ? (
                <PostCard key={`p_${item.post.id}`} post={item.post} />
              ) : (
                <div
                  key={`c_${item.reply.comment.id}`}
                  className="p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)]"
                >
                  {item.reply.post ? (
                    <a
                      href={`/?post=${encodeURIComponent(item.reply.postId)}`}
                      className="block mb-2 ps-2 border-s-2 border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
                    >
                      <span className="block text-[10px] font-bold text-[var(--color-text-secondary)]">
                        {t('repliedTo')} @{item.reply.post.author?.username || '—'}
                      </span>
                      <span className="block text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                        {item.reply.post.content}
                      </span>
                    </a>
                  ) : (
                    <span className="block mb-2 text-[10px] italic text-[var(--color-text-secondary)]">
                      {t('postUnavailable')}
                    </span>
                  )}
                  <p className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap break-words">
                    {item.reply.comment.content}
                  </p>
                  <span className="block mt-1 text-[10px] text-[var(--color-text-secondary)]">
                    {item.reply.comment.createdAt}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>{reviewFilter === 'replies' ? t('noRepliesYet') : t('noAuthoredPosts')}</p>
            </div>
          )}
        </section>
      )}

      {/* ---------------- GAMES: library, favourites, plan-to-play, wishlist ----- */}
      {section === 'games' && !loadingOther && (
        <section className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
                {t('gamesSection')} ({loggedGamesWithData.length})
              </h3>
            </div>

            {isSelf && (
              <button
                onClick={() => setLogGameOpen(true)}
                aria-label={t('addGameToLog')}
                className="pressable flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t('addGameToLog')}</span>
              </button>
            )}
          </div>

          {/* One row of filters replaces what used to be four separate tabs */}
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {gameFilters.map(({ key, label, count, icon: Icon }) => {
              if (count === 0 && key !== 'all') return null;
              const active = gameFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setGameFilter(key)}
                  className={`pressable flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {label} <span className={active ? 'opacity-80' : 'opacity-60'}>{count}</span>
                </button>
              );
            })}
          </div>

          {visibleEntries.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-3 sm:grid-cols-5 gap-3"
            >
              {visibleEntries.map(({ game, log, wishlistOnly }) => (
                <motion.div
                  key={game.id}
                  variants={{ hidden: { opacity: 0, scale: 0.92, y: 16 }, show: { opacity: 1, scale: 1, y: 0 } }}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  onClick={() => setSelectedGameForDetail(game)}
                  className={`group relative aspect-[3/4] rounded-xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer transition-all duration-300 border ${
                    wishlistOnly
                      ? 'border-dashed border-[var(--color-like)]/50 hover:border-[var(--color-like)]'
                      : log?.isFavorite
                        ? 'border-amber-400/50 hover:border-amber-400'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg)]">
                      <Gamepad2 className="w-6 h-6 text-[var(--color-text-secondary)]/40" />
                    </div>
                  )}

                  {/* Rating, once it's actually rated */}
                  {(log?.rating || 0) > 0 && (
                    <div className="absolute top-2 end-2 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-amber-400 font-black text-[10px] flex items-center gap-0.5 shadow">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      <span>{log?.rating}</span>
                    </div>
                  )}

                  {wishlistOnly && (
                    <div className="absolute top-2 end-2 p-1 rounded-full bg-[var(--color-like)] text-white shadow-md">
                      <Heart className="w-3 h-3 fill-white" />
                    </div>
                  )}

                  {/* Favourite toggle (own profile, logged games only) */}
                  {isSelf && !wishlistOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavoriteGame(game.id); }}
                      title={log?.isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                      aria-label={log?.isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                      aria-pressed={!!log?.isFavorite}
                      className={`pressable absolute top-2 start-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
                        log?.isFavorite
                          ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40'
                          : 'bg-black/70 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-amber-400 hover:text-black'
                      }`}
                    >
                      <Star className={`w-3 h-3 ${log?.isFavorite ? 'fill-black' : ''}`} />
                    </button>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
                    <p className="text-[11px] font-bold text-white truncate">{game.title}</p>
                    <p className="text-[9px] text-[var(--color-secondary)] font-semibold">
                      {wishlistOnly
                        ? (language === 'ar' ? 'في قائمة الأمنيات' : 'On the wishlist')
                        : (log?.hoursPlayed || 0) > 0
                          ? `${log!.hoursPlayed.toLocaleString()}${language === 'ar' ? ' ساعة' : 'h played'}`
                          : (language === 'ar' ? 'لم تُلعب بعد' : 'Not played yet')}
                    </p>

                    {/* Rate straight from the poster — an imported library arrives unrated */}
                    {isSelf && !wishlistOnly && log && (
                      <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={(e) => {
                              e.stopPropagation();
                              logGame(game.id, star, log.hoursPlayed, log.status, log.reviewText, game);
                            }}
                            title={language === 'ar' ? `تقييم ${star}` : `Rate ${star}`}
                            aria-label={language === 'ar' ? `تقييم ${star}` : `Rate ${star}`}
                            className="p-0.5 hover:scale-125 transition-transform"
                          >
                            <Star
                              className={`w-3 h-3 ${
                                (log.rating || 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-white/70'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* One-tap status change — the whole point of "make it easier" */}
                  {isSelf && !wishlistOnly && log && (
                    <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {STATUS_ACTIONS.map(({ status, icon: Icon, ar, en }) => {
                        const current = log.status === status;
                        return (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              logGame(game.id, log.rating, log.hoursPlayed, status, log.reviewText, game);
                              showToast(language === 'ar' ? `تم النقل إلى «${ar}»` : `Moved to “${en}”`);
                            }}
                            title={language === 'ar' ? ar : en}
                            aria-label={language === 'ar' ? ar : en}
                            aria-pressed={current}
                            className={`p-1.5 rounded-lg backdrop-blur-md transition-all hover:scale-110 ${
                              current
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-black/75 text-white/85 hover:bg-[var(--color-primary)]'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="p-8 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]">
              <Gamepad2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>
                {gameFilter === 'wishlist' ? t('emptyWishlist')
                  : gameFilter === 'favorites' ? t('noFavoriteGames')
                  : gameFilter === 'backlog' ? t('noPlanToPlay')
                  : t('noGamesLogged')}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ---------------- BADGES: the owner's own progress board ----------------- */}
      {section === 'badges' && isSelf && (
        <BadgesSection user={targetUser} userLogs={displayLogs} isSelf={isSelf} />
      )}

        </motion.div>
      </AnimatePresence>

      {/* Followers / following list */}
      {followList && (
        <FollowListModal
          userId={targetUser.id}
          kind={followList}
          onClose={() => setFollowList(null)}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal onClose={() => setIsEditModalOpen(false)} />
      )}

      {/* Settings: account, appearance, language, privacy */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Log / update a game from the full catalogue */}
      {logGameOpen && <LogGameModal onClose={() => setLogGameOpen(false)} />}

    </div>
  );
};
