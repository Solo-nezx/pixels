import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockCurrentUser, mockGames } from '../data/mockData';
import { EditProfileModal } from './EditProfileModal';
import { BadgesSection } from './BadgesSection';
import { BadgeTooltip } from './BadgeTooltip';
import { calculateUserBadges } from '../utils/badgeUtils';
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
  Flame,
  Sparkles,
  Trophy,
  ShoppingBag,
  Crown
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { 
    t, 
    auth, 
    userGames, 
    allGames,
    wishlist, 
    viewingProfileUser, 
    followingIds, 
    toggleFollowUser,
    isPrivacyPrivate,
    setIsPrivacyPrivate,
    setSelectedGameForDetail,
    setActiveTab,
    openGuestModal,
    language
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Determine which user profile to show
  const isSelf = !viewingProfileUser || (auth.user && viewingProfileUser.id === auth.user.id);
  const targetUser = isSelf ? (auth.user || mockCurrentUser) : viewingProfileUser;

  const isFollowing = followingIds.includes(targetUser.id);

  // Map userGames to actual Game objects with rating
  const loggedGamesWithData = userGames
    .map(log => {
      const g = allGames.find(game => game.id === log.gameId) || mockGames.find(game => game.id === log.gameId);
      return g ? { game: g, log } : null;
    })
    .filter(Boolean) as { game: typeof mockGames[0]; log: typeof userGames[0] }[];

  // Map wishlist game IDs to Game objects
  const wishlistGamesData = wishlist
    .map(id => allGames.find(g => g.id === id) || mockGames.find(g => g.id === id))
    .filter(Boolean) as typeof mockGames;

  // Total calculated stats
  const totalHours = userGames.reduce((acc, log) => acc + (log.hoursPlayed || 0), 0) || targetUser.hoursPlayed;
  const gamesLoggedCount = userGames.length || targetUser.gamesLoggedCount;

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
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[var(--color-card)] shadow-xl bg-[var(--color-card)]"
              />
              {targetUser.verified && (
                <span className="absolute bottom-1 right-1 bg-[#7C3AED] text-white p-1 rounded-full shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Edit / Follow Action Buttons */}
            <div className="flex items-center gap-2">
              {isSelf ? (
                auth.isLoggedIn ? (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-primary)] hover:border-[#7C3AED] transition-all shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span>{t('editProfile')}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => openGuestModal()}
                    className="px-4 py-1.5 rounded-xl bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] transition-all"
                  >
                    {t('login')}
                  </button>
                )
              ) : (
                <button
                  onClick={() => toggleFollowUser(targetUser.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                    isFollowing
                      ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                      : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
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
              )}
            </div>

          </div>

          {/* User Bio & Handle */}
          <div className="mt-2 mb-4">
            <h1 className="text-lg font-extrabold text-[var(--color-text-primary)] flex items-center gap-1">
              <span>{targetUser.name}</span>
              {targetUser.verified && <ShieldCheck className="w-4 h-4 text-[#7C3AED]" />}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
              @{targetUser.username}
            </p>
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed max-w-xl">
              {targetUser.bio}
            </p>

            {/* Featured Badges Pills */}
            {calculateUserBadges(targetUser, isSelf ? userGames : []).filter(b => b.unlocked && b.featured).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {calculateUserBadges(targetUser, isSelf ? userGames : [])
                  .filter(b => b.unlocked && b.featured)
                  .map(badge => {
                    const title = language === 'ar' ? badge.titleAr : badge.titleEn;
                    return (
                      <BadgeTooltip key={badge.id} badge={badge} position="bottom">
                        <span
                          className={`px-2.5 py-1 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer ${badge.bgColor} ${badge.borderColor} ${badge.textColor}`}
                        >
                          {badge.iconName === 'Award' && <Award className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'Flame' && <Flame className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'Clock' && <Clock className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'Gamepad2' && <Gamepad2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'Sparkles' && <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'Trophy' && <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'ShoppingBag' && <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />}
                          {badge.iconName === 'Crown' && <Crown className="w-3.5 h-3.5 stroke-[2.5]" />}
                          <span>{title}</span>
                        </span>
                      </BadgeTooltip>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 2. Stats Bar: Followers, Following, Likes, Hours, Games Logged, Reviews */}
          {!isSelf && targetUser.isPrivate ? (
            <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-center text-xs text-[var(--color-text-secondary)] flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-[#FF5D8F]" />
              <span>{t('privateProfileNotice')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 py-3 border-t border-[var(--color-border)] text-center">
              <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="block text-sm font-black text-[#7C3AED]">{targetUser.followersCount}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{t('followers')}</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="block text-sm font-black text-[var(--color-text-primary)]">{targetUser.followingCount}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{t('following')}</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="block text-sm font-black text-[#FF5D8F]">{targetUser.likesReceivedCount}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{t('likesReceived')}</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="block text-sm font-black text-[#F43F5E]">{totalHours}h</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{t('hoursPlayed')}</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="block text-sm font-black text-[var(--color-text-primary)]">{gamesLoggedCount}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{t('gamesLogged')}</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <span className="block text-sm font-black text-[var(--color-text-primary)]">{targetUser.reviewsWrittenCount}</span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{t('reviewsWritten')}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Profile Privacy Settings Bar (For Own Profile) */}
      {isSelf && (
        <div className="p-3 bg-[var(--color-card)]/60 border-b border-[var(--color-border)] flex items-center justify-between text-xs px-4">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#FF5D8F]" />
            <span className="font-semibold text-[var(--color-text-primary)]">{t('privacySetting')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivacyPrivate}
              onChange={e => setIsPrivacyPrivate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7C3AED]"></div>
          </label>
        </div>
      )}

      {/* Badges & Milestones Showcase Section */}
      {(!targetUser.isPrivate || isSelf) && (
        <BadgesSection
          user={targetUser}
          userLogs={isSelf ? userGames : []}
          isSelf={isSelf}
        />
      )}

      {/* 3. Games Section (Letterboxd Style Poster Grid with Star Ratings) */}
      <section className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
              {t('gamesSection')} ({loggedGamesWithData.length})
            </h3>
          </div>

          {isSelf && (
            <button
              onClick={() => setSelectedGameForDetail(mockGames[0])}
              className="flex items-center gap-1 text-xs font-bold text-[#7C3AED] hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('addGameToLog')}</span>
            </button>
          )}
        </div>

        {loggedGamesWithData.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {loggedGamesWithData.map(({ game, log }) => (
              <div
                key={game.id}
                onClick={() => setSelectedGameForDetail(game)}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[#7C3AED] shadow-md hover:shadow-xl hover:shadow-[#7C3AED]/20 cursor-pointer transition-all duration-300"
              >
                {/* Poster Cover */}
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Star Rating Overlay */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-amber-400 font-black text-[10px] flex items-center gap-0.5 shadow">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  <span>{log.rating}</span>
                </div>

                {/* Status & Hours Overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent opacity-90 group-hover:opacity-100 transition-opacity">
                  <p className="text-[11px] font-bold text-white truncate">{game.title}</p>
                  <p className="text-[9px] text-[#F43F5E] font-semibold">{log.hoursPlayed}h played</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]">
            <p>{t('noGamesLogged')}</p>
          </div>
        )}
      </section>

      {/* 4. Wishlist Section (Distinct Grid with Heart Badges / Dashed Border) */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#FF5D8F] fill-[#FF5D8F]" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
              {t('wishlistSection')} ({wishlistGamesData.length})
            </h3>
          </div>
          {isSelf && wishlistGamesData.length > 0 && (
            <button
              onClick={() => setActiveTab('wishlist')}
              className="text-xs font-bold text-[#7C3AED] hover:underline"
            >
              {t('viewAll')}
            </button>
          )}
        </div>

        {wishlistGamesData.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {wishlistGamesData.map(game => (
              <div
                key={game.id}
                onClick={() => setSelectedGameForDetail(game)}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-[#FF5D8F]/50 hover:border-[#FF5D8F] shadow-sm hover:shadow-lg hover:shadow-[#FF5D8F]/20 cursor-pointer transition-all duration-300"
              >
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Heart Badge */}
                <div className="absolute top-2 left-2 p-1 rounded-full bg-[#FF5D8F] text-white shadow-md">
                  <Heart className="w-3 h-3 fill-white" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                  <p className="text-[10px] font-bold text-white truncate">{game.title}</p>
                  <p className="text-[9px] text-gray-300 truncate">{game.releaseYear}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]">
            <p>{t('emptyWishlist')}</p>
          </div>
        )}
      </section>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal onClose={() => setIsEditModalOpen(false)} />
      )}

    </div>
  );
};
