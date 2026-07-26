import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SideNav } from '../SideNav';
import { BottomNav } from '../BottomNav';
import type { AuthState } from '../../types';

/**
 * These tests lock in the guest rules we care about: member-only destinations
 * stay VISIBLE (so guests can discover them) but tapping one must ask for
 * sign-in rather than navigate — and it must never open the composer.
 */

const requireAuth = vi.fn();
const setActiveTab = vi.fn();
const openCreatePostModal = vi.fn();

let authState: AuthState;

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    t: (k: string) => k,
    language: 'en',
    theme: 'dark',
    auth: authState,
    activeTab: 'home',
    setActiveTab,
    setViewingProfileUser: vi.fn(),
    wishlist: [],
    requireAuth,
    toggleLanguage: vi.fn(),
    toggleTheme: vi.fn(),
    logout: vi.fn(),
    openGuestModal: vi.fn(),
    openNotifications: vi.fn(),
    unreadMessageCount: 0,
    unreadNotificationCount: 0,
    isAdmin: false,
  }),
}));

const guest: AuthState = { isLoggedIn: false, isGuest: true, user: null };
const member: AuthState = {
  isLoggedIn: true,
  isGuest: false,
  user: {
    id: 'u1', name: 'Ahmed', username: 'ahmed', avatar: 'a.png', banner: 'b.png',
    bio: '', followersCount: 0, followingCount: 0, likesReceivedCount: 0,
    hoursPlayed: 0, gamesLoggedCount: 0, reviewsWrittenCount: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  authState = guest;
});

describe('SideNav — guest', () => {
  it('still shows the member-only destinations', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    ['navHome', 'navMarketplace', 'navSearch', 'wishlistSection', 'navProfile'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('routes a member-only tab through the sign-in gate instead of navigating', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    screen.getByText('wishlistSection').click();
    expect(requireAuth).toHaveBeenCalled();
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it('navigates freely to the public tabs', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    screen.getByText('navMarketplace').click();
    expect(setActiveTab).toHaveBeenCalledWith('marketplace');
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it('gates the composer — a guest can never start a post', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    screen.getByText('createPost').click();
    expect(requireAuth).toHaveBeenCalled();
    expect(openCreatePostModal).not.toHaveBeenCalled();
  });

  it('hides the moderation entry from non-admins', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    expect(screen.queryByText('Moderation')).not.toBeInTheDocument();
  });
});

describe('SideNav — signed in', () => {
  beforeEach(() => { authState = member; });

  it('navigates straight to a member tab without the gate', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    screen.getByText('navProfile').click();
    expect(requireAuth).toHaveBeenCalledTimes(1); // requireAuth runs the action for members
  });

  it('shows the account row instead of the log-in button', () => {
    render(<SideNav openCreatePostModal={openCreatePostModal} />);
    expect(screen.getByText('Ahmed')).toBeInTheDocument();
    expect(screen.queryByText('login')).not.toBeInTheDocument();
  });
});

describe('BottomNav — guest', () => {
  // The mobile rail carries Home, Marketplace, create, Messages and Profile.
  it('shows every tab but gates the member-only ones', () => {
    render(<BottomNav openCreatePostModal={openCreatePostModal} />);
    expect(screen.getByLabelText('navHome')).toBeInTheDocument();
    expect(screen.getByLabelText('Messages')).toBeInTheDocument();
    expect(screen.getByLabelText('navProfile')).toBeInTheDocument();

    screen.getByLabelText('Messages').click();
    expect(requireAuth).toHaveBeenCalled();
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it('gates the centre create button', () => {
    render(<BottomNav openCreatePostModal={openCreatePostModal} />);
    screen.getByLabelText('createPost').click();
    expect(requireAuth).toHaveBeenCalled();
    expect(openCreatePostModal).not.toHaveBeenCalled();
  });
});
