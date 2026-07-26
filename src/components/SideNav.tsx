import React, { useState } from 'react';
import { useApp, MainTab } from '../context/AppContext';
import { SettingsModal } from './SettingsModal';
import {
  Home, ShoppingBag, Search, Heart, User, PlusCircle,
  Sun, Moon, Globe, LogIn, LogOut, MessageSquare, Bell, ShieldAlert, Settings,
} from 'lucide-react';

interface SideNavProps {
  openCreatePostModal: () => void;
}

/**
 * Desktop/web primary navigation — a fixed vertical rail on the inline-start
 * side (left in English, right in Arabic thanks to logical properties).
 * Carries the wordmark, the primary tabs, and the utility controls that live
 * in the mobile Header (language, theme, account). Hidden on small screens,
 * where Header + BottomNav take over.
 */
export const SideNav: React.FC<SideNavProps> = ({ openCreatePostModal }) => {
  const {
    t, activeTab, setActiveTab, setViewingProfileUser, wishlist, auth,
    language, toggleLanguage, theme, toggleTheme, logout, openGuestModal, requireAuth,
    unreadMessageCount, unreadNotificationCount, openNotifications, isAdmin,
  } = useApp();

  const isAr = language === 'ar';

  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const isLoggedIn = !!(auth.isLoggedIn && auth.user);

  const go = (tab: MainTab) => {
    if (tab === 'profile') setViewingProfileUser(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Member-only tabs stay visible; tapping one prompts a guest to sign in. */
  const open = (tab: MainTab, authOnly: boolean | undefined, label: string) => {
    if (authOnly) requireAuth(() => go(tab), label);
    else go(tab);
  };

  const items: { tab: MainTab; label: string; icon: React.ElementType; badge?: number; authOnly?: boolean }[] = [
    { tab: 'home', label: t('navHome'), icon: Home },
    { tab: 'marketplace', label: t('navMarketplace'), icon: ShoppingBag },
    { tab: 'search', label: t('navSearch'), icon: Search, authOnly: true },
    { tab: 'messages', label: isAr ? 'الرسائل' : 'Messages', icon: MessageSquare, badge: unreadMessageCount, authOnly: true },
    { tab: 'wishlist', label: t('wishlistSection'), icon: Heart, badge: wishlist.length, authOnly: true },
    { tab: 'profile', label: t('navProfile'), icon: User, authOnly: true },
    // Only moderators ever see this entry.
    ...(isAdmin
      ? [{ tab: 'moderation' as MainTab, label: isAr ? 'الإشراف' : 'Moderation', icon: ShieldAlert, authOnly: true }]
      : []),
  ];

  return (
    <nav
      aria-label={t('navHome')}
      className="hidden md:flex fixed top-0 bottom-0 start-0 z-40 w-56 lg:w-60 flex-col p-3 border-e border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-lg"
    >
      {/* Wordmark */}
      <button
        onClick={() => { setViewingProfileUser(null); setActiveTab('home'); }}
        className="flex items-center gap-2.5 px-1.5 py-3 mb-2 cursor-pointer group select-none text-start"
      >
        <div className="relative w-8 h-8 shrink-0 rounded-lg bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-[2px] flex items-center justify-center shadow-sm shadow-[var(--color-primary)]/30 group-hover:scale-105 transition-transform">
          <div className="w-full h-full bg-[var(--color-bg)] rounded-[6px] flex items-center justify-center overflow-hidden">
            <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
              <div className="bg-[var(--color-primary)] rounded-[1px]" />
              <div className="bg-[var(--color-secondary)] rounded-[1px]" />
              <div className="bg-[var(--color-secondary)] rounded-[1px]" />
              <div className="bg-[var(--color-like)] rounded-[1px]" />
            </div>
          </div>
        </div>
        <span className="font-extrabold text-xl tracking-tight text-gradient font-display truncate">
          {t('appName')}
        </span>
      </button>

      {/* Primary tabs */}
      <div className="flex flex-col gap-1">
        {items.map(({ tab, label, icon: Icon, badge, authOnly }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => open(tab, authOnly, label)}
              aria-current={active ? 'page' : undefined}
              className={`pressable group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                active
                  ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/25'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)]'
              }`}
            >
              <span className="relative shrink-0">
                <Icon className={`w-5 h-5 ${active && tab === 'wishlist' ? 'fill-[var(--color-primary)]' : ''}`} />
                {typeof badge === 'number' && badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--color-like)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}

        {/* Notifications */}
        <button
          onClick={openNotifications}
          className="pressable group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-all"
        >
          <span className="relative shrink-0">
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -end-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--color-like)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </span>
          <span className="truncate">{isAr ? 'التنبيهات' : 'Notifications'}</span>
        </button>

        {/* Primary action — guests get the sign-in prompt instead of the composer */}
        <button
          onClick={() => requireAuth(openCreatePostModal, t('createPost'))}
          title={t('createPost')}
          className="pressable mt-3 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white text-sm font-bold shadow-lg shadow-[var(--color-primary)]/30 hover:shadow-[var(--glow-primary)] transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="truncate">{t('createPost')}</span>
        </button>
      </div>

      {/* Spacer pushes the utility controls to the bottom */}
      <div className="flex-1" />

      {/* ---- Utility controls (moved here from the top Header) ---- */}
      <div className="flex flex-col gap-2 pt-3 border-t border-[var(--color-border)]">

        {/* Full settings sheet — language, theme, account, privacy in one place */}
        <button
          onClick={() => setShowSettings(true)}
          title={t('settings')}
          className="pressable flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span className="truncate">{t('settings')}</span>
        </button>

        {/* Language + Theme quick toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            title={t('language')}
            aria-label={t('language')}
            className="pressable flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">{language === 'en' ? 'AR' : 'EN'}</span>
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('themeLight') : t('themeDark')}
            aria-label={theme === 'dark' ? t('themeLight') : t('themeDark')}
            className="pressable flex-1 flex items-center justify-center px-2 py-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-card)] transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>

        {/* Account: signed-in row (with logout) or Log In button */}
        {isLoggedIn && auth.user ? (
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              aria-expanded={showAccountMenu}
              className="pressable w-full flex items-center gap-2.5 p-2 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-card)] transition-all text-start"
            >
              <img
                src={auth.user.avatar}
                alt={auth.user.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                }}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[var(--color-text-primary)] truncate">{auth.user.name}</span>
                <span className="block text-[11px] text-[var(--color-text-secondary)] truncate">@{auth.user.username}</span>
              </span>
            </button>

            {showAccountMenu && (
              <div className="absolute bottom-full mb-2 start-0 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-1.5 z-50">
                <button
                  onClick={() => { setViewingProfileUser(null); setActiveTab('profile'); setShowAccountMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors text-start"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t('navProfile')}</span>
                </button>
                <button
                  onClick={() => { logout(); setShowAccountMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition-colors text-start"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openGuestModal()}
            className="pressable flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs shadow-md shadow-[var(--color-primary)]/25 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('login')}</span>
          </button>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </nav>
  );
};
