import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from '../PostCard';
import { TooltipProvider } from '../ui/tooltip';
import type { AuthState, Post, User } from '../../types';

/**
 * The post menu moved from a hand-rolled panel to a Radix dropdown, and delete
 * moved from `window.confirm` to an AlertDialog. These lock in the parts that
 * matter: only the author sees destructive actions, and a post is never
 * deleted until the confirmation is actually accepted.
 */

const deleteOwnPost = vi.fn();
const requireAuth = vi.fn((fn: () => void) => fn());

let authState: AuthState;

vi.mock('../../services/socialData', () => ({
  subscribeComments: () => () => {},
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    t: (k: string) => k,
    language: 'en',
    auth: authState,
    toggleLikePost: vi.fn(),
    toggleRepost: vi.fn(),
    addComment: vi.fn(),
    setSelectedGameForDetail: vi.fn(),
    setViewingProfileUser: vi.fn(),
    requireAuth,
    editPost: vi.fn(),
    deleteOwnPost,
    showToast: vi.fn(),
  }),
}));

const author: User = {
  id: 'u1', name: 'Ahmed Ali', username: 'ahmed', avatar: 'a.png', banner: 'b.png',
  bio: '', followersCount: 0, followingCount: 0, likesReceivedCount: 0,
  hoursPlayed: 0, gamesLoggedCount: 0, reviewsWrittenCount: 0,
};

const post: Post = {
  id: 'p1', author, createdAt: 'now', content: 'hello world',
  likesCount: 0, commentsCount: 0, repostsCount: 0, comments: [],
};

const asUser = (id: string): AuthState => ({
  isLoggedIn: true, isGuest: false, user: { ...author, id },
});

const renderCard = () => render(
  <TooltipProvider>
    <PostCard post={post} />
  </TooltipProvider>,
);

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByLabelText('Post options'));
  return screen.findByRole('menu');
};

beforeEach(() => {
  vi.clearAllMocks();
  authState = asUser('u1');
});

describe('post menu', () => {
  it('offers the author edit and delete', async () => {
    const user = userEvent.setup();
    renderCard();
    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /delete/i })).toBeTruthy();
  });

  it('offers everyone else report instead — never delete', async () => {
    authState = asUser('someone-else');
    const user = userEvent.setup();
    renderCard();
    await openMenu(user);
    expect(screen.getByRole('menuitem', { name: /report/i })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /delete/i })).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderCard();
    await openMenu(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.activeElement).toBe(screen.getByLabelText('Post options'));
  });
});

describe('delete confirmation', () => {
  it('asks before deleting rather than deleting on the menu click', async () => {
    const user = userEvent.setup();
    renderCard();
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));

    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    // The dangerous part: the menu click alone must not have deleted anything.
    expect(deleteOwnPost).not.toHaveBeenCalled();
  });

  it('cancelling leaves the post alone', async () => {
    const user = userEvent.setup();
    renderCard();
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(deleteOwnPost).not.toHaveBeenCalled();
  });

  it('deletes only once confirmed', async () => {
    const user = userEvent.setup();
    renderCard();
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: /delete/i }));
    await screen.findByRole('alertdialog');
    const dialog = screen.getByRole('alertdialog');
    const confirm = Array.from(dialog.querySelectorAll('button'))
      .find((b) => /^delete$/i.test(b.textContent || ''))!;
    await user.click(confirm);

    expect(deleteOwnPost).toHaveBeenCalledWith('p1');
    expect(deleteOwnPost).toHaveBeenCalledTimes(1);
  });
});

describe('author avatar', () => {
  it('falls back to initials rather than an unrelated stock photo', () => {
    renderCard();
    expect(screen.getByText('AA')).toBeTruthy(); // "Ahmed Ali"
  });
});
