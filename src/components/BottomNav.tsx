import React from 'react';
import { useApp, MainTab } from '../context/AppContext';
import { Home, ShoppingBag, Search, Heart, User, PlusCircle } from 'lucide-react';

export type TabType = MainTab;

interface BottomNavProps {
  openCreatePostModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ openCreatePostModal }) => {
  const { t, activeTab, setActiveTab, setViewingProfileUser, wishlist } = useApp();

  const handleTabClick = (tab: MainTab) => {
    if (tab === 'profile') {
      setViewingProfileUser(null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const itemClass = (tab: MainTab) =>
    `relative flex flex-col items-center gap-1 transition-all ${
      activeTab === tab
        ? 'text-[#7C3AED] scale-105'
        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--color-bg)]/90 backdrop-blur-lg border-[var(--color-border)] transition-colors duration-200">
      <div className="max-w-xl lg:max-w-2xl mx-auto px-4 h-16 flex items-center justify-around">

        {/* Home */}
        <button onClick={() => handleTabClick('home')} className={itemClass('home')}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('navHome')}</span>
        </button>

        {/* Marketplace */}
        <button onClick={() => handleTabClick('marketplace')} className={itemClass('marketplace')}>
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('navMarketplace')}</span>
        </button>

        {/* Center Create Post */}
        <button
          onClick={openCreatePostModal}
          className="relative -top-3 p-3 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#F43F5E] text-white shadow-lg shadow-[#7C3AED]/30 hover:scale-110 active:scale-95 transition-all"
          title={t('createPost')}
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        {/* Wishlist */}
        <button onClick={() => handleTabClick('wishlist')} className={itemClass('wishlist')}>
          <div className="relative">
            <Heart className={`w-5 h-5 ${activeTab === 'wishlist' ? 'fill-[#7C3AED]' : ''}`} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#FF5D8F] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {wishlist.length > 9 ? '9+' : wishlist.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">{t('wishlistSection')}</span>
        </button>

        {/* Profile */}
        <button onClick={() => handleTabClick('profile')} className={itemClass('profile')}>
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{t('navProfile')}</span>
        </button>

      </div>
    </nav>
  );
};
