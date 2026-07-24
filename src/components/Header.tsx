import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sun, Moon, Globe, LogIn, User as UserIcon, LogOut, ShieldAlert, Search } from 'lucide-react';

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
    t
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const goHome = () => {
    setViewingProfileUser(null);
    setActiveTab('home');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md bg-[var(--color-bg)]/85 border-[var(--color-border)] transition-colors duration-200">
      <div className="max-w-4xl lg:max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Logo Wordmark with subtle pixel-art accent */}
        <div
          onClick={goHome}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#F43F5E] p-[2px] flex items-center justify-center shadow-sm shadow-[#7C3AED]/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0E0F12] dark:bg-[#0E0F12] rounded-[6px] flex items-center justify-center relative overflow-hidden">
              {/* Pixel Art Accent Detail (3x3 grid) */}
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <div className="bg-[#7C3AED] rounded-[1px]"></div>
                <div className="bg-[#F43F5E] rounded-[1px]"></div>
                <div className="bg-[#F43F5E] rounded-[1px]"></div>
                <div className="bg-[#FF5D8F] rounded-[1px]"></div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl tracking-tight text-gradient font-display">
                {t('appName')}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-[#7C3AED] animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          
          {/* Guest Mode Indicator Badge */}
          {auth.isGuest && (
            <div 
              onClick={() => openGuestModal()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20 cursor-pointer hover:bg-[#F43F5E]/20 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t('guestBadge')}</span>
            </div>
          )}

          {/* Search shortcut */}
          <button
            onClick={() => { setViewingProfileUser(null); setActiveTab('search'); }}
            title={t('navSearch')}
            className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-all"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title={t('language')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider font-bold">{language === 'en' ? 'AR' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('themeLight') : t('themeDark')}
            className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Login / Profile Button */}
          {auth.isLoggedIn && auth.user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 rounded-full border border-[var(--color-border)] hover:border-[#7C3AED] transition-all"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-xs shadow-md shadow-[#7C3AED]/25 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('login')}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
