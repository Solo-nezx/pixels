/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeFeed } from './components/HomeFeed';
import { Marketplace } from './components/Marketplace';
import { SearchScreen } from './components/SearchScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { WishlistScreen } from './components/WishlistScreen';
import { GameDetailModal } from './components/GameDetailModal';
import { CreatePostModal } from './components/CreatePostModal';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SplashScreen } from './components/SplashScreen';
import { Toast } from './components/Toast';

function AppContent() {
  const {
    selectedGameForDetail,
    setSelectedGameForDetail,
    isGuestModalOpen,
    isOnboardingOpen,
    closeOnboarding,
    viewingProfileUser,
    activeTab,
    setActiveTab
  } = useApp();

  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200 antialiased selection:bg-[#7C3AED]/30 selection:text-white">
      
      {/* Top Header */}
      <Header />

      {/* Main Responsive Screen Layout Container */}
      <main className="max-w-4xl lg:max-w-5xl mx-auto min-h-[calc(100vh-3.5rem)] border-x border-[var(--color-border)]/50 bg-[var(--color-bg)] transition-all">
        {/* If viewing another user's profile, force Profile view */}
        {viewingProfileUser ? (
          <ProfileScreen />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeFeed openCreatePostModal={() => setIsCreatePostOpen(true)} />
            )}

            {activeTab === 'marketplace' && (
              <Marketplace />
            )}

            {activeTab === 'search' && (
              <SearchScreen />
            )}

            {activeTab === 'wishlist' && (
              <WishlistScreen />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        openCreatePostModal={() => setIsCreatePostOpen(true)}
      />

      {/* Modals */}
      {selectedGameForDetail && (
        <GameDetailModal
          game={selectedGameForDetail}
          onClose={() => setSelectedGameForDetail(null)}
        />
      )}

      {isCreatePostOpen && (
        <CreatePostModal
          onClose={() => setIsCreatePostOpen(false)}
        />
      )}

      {isGuestModalOpen && (
        <AuthModal
          onSuccess={() => setIsCreatePostOpen(false)}
        />
      )}

      {isOnboardingOpen && (
        <OnboardingModal
          onFinish={closeOnboarding}
        />
      )}

      {/* Floating Toast Notification */}
      <Toast />

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
