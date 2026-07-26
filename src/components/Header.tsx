import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon, Globe, LogIn, User as UserIcon, LogOut, ShieldAlert, Search, Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const Header: React.FC = () => {
  const {
    language,
    toggleLanguage,
    theme,
    toggleTheme,
    auth,
    logout,
    openGuestModal,
    setViewingProfileUser,
    setActiveTab,
    requireAuth,
    t
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const goHome = () => {
    setViewingProfileUser(null);
    setActiveTab('home');
  };

  return (
    // Mobile-only: on md+ the SideNav carries the wordmark and these controls.
    <header className="md:hidden sticky top-0 z-40 w-full border-b backdrop-blur-md bg-[var(--color-bg)]/85 border-[var(--color-border)] transition-colors duration-200">
      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Logo Wordmark with subtle pixel-art accent */}
        <div
          onClick={goHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-[2px] flex items-center justify-center shadow-sm shadow-[var(--color-primary)]/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[var(--color-bg)] rounded-[6px] flex items-center justify-center relative overflow-hidden">
              {/* Pixel Art Accent Detail (3x3 grid) */}
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <div className="bg-[var(--color-primary)] rounded-[1px]"></div>
                <div className="bg-[var(--color-secondary)] rounded-[1px]"></div>
                <div className="bg-[var(--color-secondary)] rounded-[1px]"></div>
                <div className="bg-[var(--color-like)] rounded-[1px]"></div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl tracking-tight text-gradient font-display">
                {t('appName')}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-[var(--color-primary)] animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          
          {/* Guest Mode Indicator Badge */}
          {auth.isGuest && (
            <div 
              onClick={() => openGuestModal()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/20 cursor-pointer hover:bg-[var(--color-secondary)]/20 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t('guestBadge')}</span>
            </div>
          )}

          {/* Search shortcut — guests get the sign-in prompt */}
          <button
            onClick={() => requireAuth(() => { setViewingProfileUser(null); setActiveTab('search'); }, t('navSearch'))}
            title={t('navSearch')}
            aria-label={t('navSearch')}
            className="icon-btn border border-[var(--color-border)]"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title={t('language')}
            aria-label={t('language')}
            className="icon-btn gap-1 px-2.5 border border-[var(--color-border)] text-xs font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-bold">{language === 'en' ? 'AR' : 'EN'}</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            title={t('settings')}
            aria-label={t('settings')}
            className="icon-btn border border-[var(--color-border)]"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('themeLight') : t('themeDark')}
            aria-label={theme === 'dark' ? t('themeLight') : t('themeDark')}
            className="icon-btn border border-[var(--color-border)]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Login / Profile Button */}
          {auth.isLoggedIn && auth.user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label={t('navProfile')}
                aria-expanded={showProfileMenu}
                className="icon-btn-inline flex items-center gap-2 p-1 rounded-full border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all"
              >
                <img
                  src={auth.user.avatar}
                  alt={auth.user.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                  }}
                  className="w-7 h-7 rounded-full object-cover"
                />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div 
                  className={`absolute top-full mt-2 ${language === 'ar' ? 'left-0' : 'right-0'} w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl p-1.5 z-50`}
                >
                  <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
                    <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{auth.user.name}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">@{auth.user.username}</p>
                  </div>
                  <button
                    onClick={() => {
                      setViewingProfileUser(null);
                      setActiveTab('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors text-start"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{t('navProfile')}</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium text-xs shadow-md shadow-[var(--color-primary)]/25 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('login')}</span>
            </button>
          )}

        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </header>
  );
};
