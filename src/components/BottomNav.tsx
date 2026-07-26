import React from 'react';
import { useApp, MainTab } from '../context/AppContext';
import { Home, ShoppingBag, User, PlusCircle, MessageSquare } from 'lucide-react';

export type TabType = MainTab;

interface BottomNavProps {
  openCreatePostModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ openCreatePostModal }) => {
  const { t, activeTab, setActiveTab, setViewingProfileUser, requireAuth, language, unreadMessageCount } = useApp();

  const handleTabClick = (tab: MainTab) => {
    if (tab === 'profile') {
      setViewingProfileUser(null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Member-only tabs stay visible; tapping one prompts a guest to sign in. */
  const gatedTabClick = (tab: MainTab, label: string) =>
    requireAuth(() => handleTabClick(tab), label);

  const itemClass = (tab: MainTab) =>
    `relative flex flex-col items-center justify-center gap-1 min-w-11 min-h-11 py-1.5 rounded-xl transition-all active:scale-90 ${
      activeTab === tab
        ? 'text-[var(--color-primary)] scale-105'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)]'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--color-bg)]/90 backdrop-blur-lg border-[var(--color-border)] transition-colors duration-200">
      <div className="max-w-xl lg:max-w-2xl mx-auto px-4 h-16 flex items-center justify-around">

        {/* Home */}
        <button onClick={() => handleTabClick('home')} aria-label={t('navHome')} aria-current={activeTab === 'home' ? 'page' : undefined} className={itemClass('home')}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('navHome')}</span>
        </button>

        {/* Marketplace */}
        <button onClick={() => handleTabClick('marketplace')} aria-label={t('navMarketplace')} aria-current={activeTab === 'marketplace' ? 'page' : undefined} className={itemClass('marketplace')}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('navMarketplace')}</span>
        </button>

        {/* Center Create Post — guests get the sign-in prompt */}
        <button
          onClick={() => requireAuth(openCreatePostModal, t('createPost'))}
          aria-label={t('createPost')}
          className="relative -top-3 p-3 min-w-11 min-h-11 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] text-white shadow-lg shadow-[var(--color-primary)]/30 hover:scale-110 active:scale-95 transition-all"
          title={t('createPost')}
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        {/* Messages */}
        <button onClick={() => gatedTabClick('messages', language === 'ar' ? 'الرسائل' : 'Messages')} aria-label={language === 'ar' ? 'الرسائل' : 'Messages'} aria-current={activeTab === 'messages' ? 'page' : undefined} className={itemClass('messages')}>
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--color-like)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">{language === 'ar' ? 'الرسائل' : 'Messages'}</span>
        </button>

        {/* Profile */}
        <button onClick={() => gatedTabClick('profile', t('navProfile'))} aria-label={t('navProfile')} aria-current={activeTab === 'profile' ? 'page' : undefined} className={itemClass('profile')}>
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('navProfile')}</span>
        </button>

      </div>
    </nav>
  );
};
