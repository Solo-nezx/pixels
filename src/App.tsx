/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, useApp, MainTab } from './context/AppContext';
import { fetchPostById, fetchUsersByIds } from './services/socialData';
import { Post } from './types';
import { PostCard } from './components/PostCard';
import { X, Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SideNav } from './components/SideNav';
import { RightRail } from './components/RightRail';
import { HomeFeed } from './components/HomeFeed';

// Everything below the feed loads on demand — a first visit only downloads the
// code for the screen it actually shows.
const Marketplace = lazy(() => import('./components/Marketplace').then(m => ({ default: m.Marketplace })));
const SearchScreen = lazy(() => import('./components/SearchScreen').then(m => ({ default: m.SearchScreen })));
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const WishlistScreen = lazy(() => import('./components/WishlistScreen').then(m => ({ default: m.WishlistScreen })));
const MessagesScreen = lazy(() => import('./components/MessagesScreen').then(m => ({ default: m.MessagesScreen })));
const NotificationsPanel = lazy(() => import('./components/NotificationsPanel').then(m => ({ default: m.NotificationsPanel })));
const ModerationScreen = lazy(() => import('./components/ModerationScreen').then(m => ({ default: m.ModerationScreen })));
const GameDetailModalLazy = lazy(() => import('./components/GameDetailModal').then(m => ({ default: m.GameDetailModal })));
const CreatePostModalLazy = lazy(() => import('./components/CreatePostModal').then(m => ({ default: m.CreatePostModal })));
const OnboardingModalLazy = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import { AuthModal } from './components/AuthModal';
import { SplashScreen } from './components/SplashScreen';
import { Toast } from './components/Toast';

/** Placeholder while a lazily-loaded screen's chunk arrives. */
const ScreenLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
  </div>
);

function AppContent() {
  const {
    selectedGameForDetail,
    setSelectedGameForDetail,
    isGuestModalOpen,
    isOnboardingOpen,
    closeOnboarding,
    viewingProfileUser,
    activeTab,
    auth,
    isNotificationsOpen,
    isAdmin,
    setViewingProfileUser
  } = useApp();

  // Guests get the feed and the marketplace only; anything else falls back to
  // the feed (covers logging out while on a member-only tab).
  const isLoggedIn = !!(auth.isLoggedIn && auth.user);
  const guestAllowed: MainTab[] = ['home', 'marketplace'];
  const effectiveTab = !isLoggedIn && !guestAllowed.includes(activeTab) ? 'home' : activeTab;

  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Deep link: /?post=<id> opens that single post (shared links).
  const [sharedPost, setSharedPost] = useState<Post | null>(null);
  const [sharedPostMissing, setSharedPostMissing] = useState(false);

  // Deep link: /?user=<id> opens that member's profile.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('user');
    if (!id) return;
    let active = true;
    fetchUsersByIds([id]).then(([user]) => {
      if (!active || !user) return;
      setViewingProfileUser(user);
      window.history.replaceState({}, '', window.location.pathname);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('post');
    if (!id) return;
    let active = true;
    fetchPostById(id, auth.user && !auth.isGuest ? auth.user.id : null).then((p) => {
      if (!active) return;
      if (p) setSharedPost(p); else setSharedPostMissing(true);
    });
    return () => { active = false; };
  }, [auth.user?.id, auth.isGuest]);

  /** Close the shared-post view and drop the query param from the URL. */
  const closeSharedPost = () => {
    setSharedPost(null);
    setSharedPostMissing(false);
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200 antialiased selection:bg-[var(--color-primary)]/30 selection:text-white">
      
      {/* Top Header */}
      <Header />

      {/* Desktop side rail (web); replaced by BottomNav on mobile */}
      <SideNav openCreatePostModal={() => setIsCreatePostOpen(true)} />

      {/* Third column on wide screens: trending games */}
      <RightRail />

      {/* Main Responsive Screen Layout Container (offset for both rails) */}
      <div className="md:ps-56 lg:ps-60 xl:pe-80">
      <main className="max-w-4xl lg:max-w-5xl mx-auto min-h-[calc(100vh-3.5rem)] md:min-h-screen border-x border-[var(--color-border)]/50 bg-[var(--color-bg)] transition-all">
        <Suspense fallback={<ScreenLoader />}>
        {/* If viewing another user's profile, force Profile view */}
        {viewingProfileUser ? (
          <ProfileScreen />
        ) : (
          <>
            {effectiveTab ==='home' && (
              <HomeFeed openCreatePostModal={() => setIsCreatePostOpen(true)} />
            )}

            {effectiveTab ==='marketplace' && (
              <Marketplace />
            )}

            {effectiveTab ==='search' && (
              <SearchScreen />
            )}

            {effectiveTab ==='wishlist' && (
              <WishlistScreen />
            )}

            {effectiveTab ==='messages' && (
              <MessagesScreen />
            )}

            {effectiveTab ==='moderation' && isAdmin && (
              <ModerationScreen />
            )}

            {effectiveTab ==='profile' && (
              <ProfileScreen />
            )}
          </>
        )}
        </Suspense>
      </main>
      </div>

      {/* Bottom Navigation Bar (mobile only — SideNav covers desktop) */}
      <div className="md:hidden">
        <BottomNav
          openCreatePostModal={() => setIsCreatePostOpen(true)}
        />
      </div>

      {/* Modals — each loads its own chunk the first time it opens */}
      <Suspense fallback={null}>
        {selectedGameForDetail && (
          <GameDetailModalLazy
            game={selectedGameForDetail}
            onClose={() => setSelectedGameForDetail(null)}
          />
        )}

        {isCreatePostOpen && (
          <CreatePostModalLazy
            onClose={() => setIsCreatePostOpen(false)}
          />
        )}

        {isOnboardingOpen && (
          <OnboardingModalLazy
            onFinish={closeOnboarding}
          />
        )}

        {isNotificationsOpen && <NotificationsPanel />}
      </Suspense>

      {/* Auth stays eager: it's the gate for every guest action */}
      {isGuestModalOpen && (
        <AuthModal
          onSuccess={() => setIsCreatePostOpen(false)}
        />
      )}

      {/* Shared post link (/?post=<id>) */}
      {(sharedPost || sharedPostMissing) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">
                {sharedPost ? 'Pixels' : ''}
              </span>
              <button onClick={closeSharedPost} aria-label="Close" className="icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sharedPost ? (
              <PostCard post={sharedPost} />
            ) : (
              <p className="p-10 text-center text-xs text-[var(--color-text-secondary)]">
                This post is no longer available.
              </p>
            )}
          </div>
        </div>
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
