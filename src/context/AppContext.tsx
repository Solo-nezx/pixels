import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Language,
  Theme,
  User,
  Game,
  Post,
  UserGameLog,
  MarketplaceListing,
  AuthState,
  GameStatus,
  SteamGame,
  DiscordAuthResult,
  Conversation,
  ParticipantMeta,
  AppNotification
} from '../types';
import { translations } from '../i18n/translations';
import { mockCurrentUser, mockGames, mockUsers } from '../data/mockData';
import { auth as firebaseAuth, firebaseSignOut, onAuthStateChanged, signInWithCustomToken, doc, getDoc, setDoc, db } from '../lib/firebase';
import { fetchTrendingGames } from '../services/rawg';
import { fetchSteamTrending, fetchSteamRecent } from '../services/steam';
import { loginWithSteam, steamGameToGame } from '../services/discordAuth';
import {
  subscribePosts,
  subscribeListings,
  createPost,
  updatePostContent,
  deletePost,
  toggleLikePost as fsToggleLikePost,
  toggleRepostPost as fsToggleRepostPost,
  addCommentToPost,
  createListing,
  fetchUserData,
  saveGameLog,
  removeGameLog,
  saveGameLogs,
  setWishlistItem,
  setFollow,
  seedIfEmpty,
  ensureUserArrays,
  setBlocked,
  hasBlockedMe,
  checkIsAdmin,
  fetchMemberPool,
  fetchUserGameLogs,
  markOnboarded,
  saveProfileFields,
  EditableProfile,
} from '../services/socialData';
import {
  subscribeConversations,
  subscribeNotifications,
  ensureConversation,
  sendMessage as fsSendMessage,
  markConversationRead,
  markAllNotificationsRead,
  createNotification,
  toParticipantMeta,
  conversationId,
} from '../services/messaging';
import { listenForegroundPush } from '../lib/push';
import { setErrorUser } from '../lib/errorReporting';
import { syncPlayingFromSteam } from '../utils/statUtils';

/** Turn a Firestore error into something a reader can act on. */
function describeQueryError(e: unknown): string {
  const code = (e as { code?: string })?.code || '';
  if (code === 'failed-precondition') return 'index-missing';
  if (code === 'permission-denied') return 'permission-denied';
  if (code === 'unavailable') return 'offline';
  return 'unknown';
}

/** Parse the numeric Steam appId out of a `steam_<id>` game id. */
function appIdFromGameId(gameId: string): number | null {
  const m = gameId.match(/^steam_(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export interface SuggestedFriend {
  user: User;
  sharedGames: Game[];
}

export type MainTab = 'home' | 'marketplace' | 'search' | 'profile' | 'wishlist' | 'messages' | 'moderation';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  t: (key: keyof typeof translations.en) => string;

  // Auth State
  auth: AuthState;
  login: (user?: User) => void;
  /** Save your own profile fields (persists to Firestore, not just locally). */
  updateProfile: (fields: EditableProfile) => void;
  logout: () => void;
  continueAsGuest: () => void;
  loginWithSteamProvider: () => Promise<void>;
  isImportingSteam: boolean;

  // Friend suggestions (based on games in common)
  suggestedFriends: SuggestedFriend[];
  /** Real members available to search / suggest (never the bundled demo users). */
  memberPool: User[];

  // Primary navigation tab (lifted so Header / Profile can navigate too)
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;

  // Guest Barrier Trigger
  isGuestModalOpen: boolean;
  guestModalReason: string;
  openGuestModal: (reason?: string) => void;
  closeGuestModal: () => void;
  requireAuth: (action: () => void, reason?: string) => boolean;

  // Games & Profile Showcase
  allGames: Game[];
  loadingGames: boolean;
  userGames: UserGameLog[];
  logGame: (gameId: string, rating: number, hours: number, status: GameStatus, reviewText?: string, game?: Game) => void;
  removeUserGame: (gameId: string) => void;
  toggleFavoriteGame: (gameId: string) => void;
  isFavoriteGame: (gameId: string) => boolean;
  wishlist: string[];
  toggleWishlist: (gameId: string) => void;
  isPrivacyPrivate: boolean;
  setIsPrivacyPrivate: (val: boolean) => void;

  // Social Feed & Posts
  posts: Post[];
  /** True while more posts exist beyond what's loaded. */
  hasMorePosts: boolean;
  /** Load the next batch (called by the feed's infinite-scroll sentinel). */
  loadMorePosts: () => void;
  addPost: (content: string, game?: Game, rating?: number, imageUrl?: string, images?: string[]) => void;
  editPost: (postId: string, content: string) => void;
  deleteOwnPost: (postId: string) => void;
  toggleLikePost: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  addComment: (postId: string, commentText: string) => void;

  // Marketplace
  listings: MarketplaceListing[];
  addListing: (listing: Omit<MarketplaceListing, 'id' | 'seller' | 'createdAt' | 'status'>) => void;

  // Follows
  followingIds: string[];
  toggleFollowUser: (userId: string) => void;

  /** True when the signed-in user has an `admins/<uid>` document. */
  isAdmin: boolean;

  // Blocking
  blockedIds: string[];
  isBlocked: (userId: string) => boolean;
  toggleBlockUser: (user: User | ParticipantMeta) => void;

  // Detail Modals & Navigation helpers
  selectedGameForDetail: Game | null;
  setSelectedGameForDetail: (game: Game | null) => void;
  selectedListingForDetail: MarketplaceListing | null;
  setSelectedListingForDetail: (listing: MarketplaceListing | null) => void;
  viewingProfileUser: User | null;
  setViewingProfileUser: (user: User | null) => void;

  // Onboarding
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;

  // Direct messages
  conversations: Conversation[];
  activeConversationId: string | null;
  openConversationWith: (user: User | ParticipantMeta) => void;
  closeConversation: () => void;
  sendMessageTo: (convId: string, text: string) => void;
  /** `index-missing` | `permission-denied` | `offline` | `unknown` when the thread list failed to load. */
  messagingError: string | null;

  // Notifications
  notifications: AppNotification[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  markAllRead: () => void;

  // Global Toast / Notice
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language & Direction
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('pixels_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pixels_lang', lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // 2. Theme (Dark by default)
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('pixels_theme') as Theme) || 'dark';
  });

  const setTheme = (th: Theme) => {
    setThemeState(th);
    localStorage.setItem('pixels_theme', th);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Translation helper
  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  // 3. Auth state
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('pixels_auth');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      isLoggedIn: false,
      isGuest: true,
      user: null,
    };
  });

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);

          let loggedUser: User;
          if (snap.exists()) {
            loggedUser = snap.data() as User;
          } else {
            loggedUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Gamer',
              username: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'gamer',
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(firebaseUser.uid)}`,
              banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
              bio: language === 'ar' ? 'عضو في بيكسلز' : 'Pixels Gamer',
              verified: false,
              followersCount: 0,
              followingCount: 0,
              likesReceivedCount: 0,
              hoursPlayed: 0,
              gamesLoggedCount: 0,
              reviewsWrittenCount: 0,
              createdAtTs: Date.now(),
            };
            await setDoc(userRef, loggedUser);
          }

          const newState: AuthState = {
            isLoggedIn: true,
            isGuest: false,
            user: loggedUser,
          };
          setAuth(newState);
          localStorage.setItem('pixels_auth', JSON.stringify(newState));
        } catch (e) {
          console.error('Error fetching Firestore user profile:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [language]);

  const login = (userToLogin?: User) => {
    const loggedUser = userToLogin || mockCurrentUser;
    const newState: AuthState = {
      isLoggedIn: true,
      isGuest: false,
      user: loggedUser,
    };
    setAuth(newState);
    localStorage.setItem('pixels_auth', JSON.stringify(newState));
    showToast(language === 'ar' ? 'مرحباً بك مجدداً!' : 'Welcome back!');
  };

  /**
   * Change your own profile fields. Writes through to Firestore so the new
   * name reaches everyone else and stays searchable — local state alone left
   * the rest of the site showing the old one.
   */
  const updateProfile = (fields: EditableProfile) => {
    const current = auth.user;
    if (!current) return;
    const merged = { ...current, ...fields };
    setAuth((prev) => ({ ...prev, user: merged }));
    localStorage.setItem('pixels_auth', JSON.stringify({ ...auth, user: merged }));
    // A Steam-only session has no Firebase credentials, so rules would reject
    // the write; the `pixels_auth` copy above is all it gets.
    if (!isLocalSession) {
      saveProfileFields(current.id, fields).catch((e) => {
        console.error('saveProfileFields failed:', e);
        showToast(language === 'ar' ? 'تعذّر حفظ التغييرات.' : "Couldn't save changes.");
      });
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (e) {
      console.error('Firebase SignOut error:', e);
    }
    const newState: AuthState = {
      isLoggedIn: false,
      isGuest: true,
      user: null,
    };
    setAuth(newState);
    localStorage.setItem('pixels_auth', JSON.stringify(newState));
    showToast(language === 'ar' ? 'تم تسجيل الخروج.' : 'Logged out.');
  };

  const continueAsGuest = () => {
    const newState: AuthState = {
      isLoggedIn: false,
      isGuest: true,
      user: null,
    };
    setAuth(newState);
    localStorage.setItem('pixels_auth', JSON.stringify(newState));
  };

  // 3b. Steam sign-in (via Cloudflare Worker) + Steam library import
  const [isImportingSteam, setIsImportingSteam] = useState(false);

  const loginWithSteamProvider = async () => {
    let result: DiscordAuthResult;
    try {
      setIsImportingSteam(true);
      result = await loginWithSteam();
    } catch (e: any) {
      setIsImportingSteam(false);
      if (e?.message === 'steam_not_configured') {
        showToast(language === 'ar'
          ? 'دخول Steam غير مُهيأ بعد (تحقق من إعدادات البيئة والـ Worker).'
          : 'Steam sign-in is not configured yet (check your .env / Worker).');
      } else if (e?.message === 'popup_blocked') {
        showToast(language === 'ar' ? 'المتصفح منع النافذة المنبثقة.' : 'The popup was blocked by the browser.');
      } else {
        showToast(language === 'ar' ? 'تم إلغاء تسجيل الدخول عبر Steam.' : 'Steam sign-in was cancelled.');
      }
      return;
    }

    if (!result.ok || !result.profile) {
      setIsImportingSteam(false);
      showToast(language === 'ar' ? 'فشل تسجيل الدخول عبر Steam.' : 'Steam sign-in failed.');
      return;
    }

    const p = result.profile;
    const importedGames = result.games || [];

    const providerUser: User = {
      id: `steam_${p.id}`,
      name: p.username,
      username: p.handle,
      avatar: p.avatar,
      banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
      bio: language === 'ar' ? 'لاعب على Pixels عبر Steam' : 'Pixels gamer via Steam',
      verified: true,
      followersCount: 0,
      followingCount: 0,
      likesReceivedCount: 0,
      hoursPlayed: importedGames.reduce((a, g) => a + g.hoursPlayed, 0),
      gamesLoggedCount: importedGames.length,
      reviewsWrittenCount: 0,
      provider: 'steam',
      steamId: p.steamId,
      libraryAppIds: importedGames.map((g) => g.appId),
    };

    // If the function minted a custom token, sign in for real so the player
    // becomes a Firebase user (visible in Authentication) with full Firestore
    // access — otherwise fall back to a browser-local session.
    if (result.customToken) {
      try {
        await signInWithCustomToken(firebaseAuth, result.customToken);
      } catch (e) {
        console.error('signInWithCustomToken failed:', e);
      }
    }

    login(providerUser);
    closeGuestModal();
    importSteamGames(importedGames, providerUser.id);
    setIsImportingSteam(false);

    if (importedGames.length > 0) {
      showToast(language === 'ar'
        ? `تم جلب ${importedGames.length} لعبة من حساب Steam!`
        : `Imported ${importedGames.length} games from Steam!`);
    } else {
      showToast(language === 'ar'
        ? 'تم تسجيل الدخول. تأكد أن ملف Steam عام لجلب الألعاب.'
        : 'Signed in. Make your Steam profile public to import games.');
    }
  };

  /**
   * Merge a Steam-imported library into the catalogue and the user's game log.
   * `sessionUid` is passed explicitly because this runs in the same handler as
   * `login()`, before the auth state has re-rendered.
   */
  const importSteamGames = (games: SteamGame[], sessionUid: string) => {
    if (!games.length) return;

    setAllGames((prev) => {
      const existing = new Set(prev.map((g) => g.id));
      const additions = games
        .map(steamGameToGame)
        .filter((g) => !existing.has(g.id));
      return additions.length ? [...prev, ...additions] : prev;
    });

    // The Steam library is authoritative for playtime, so build the logs from it.
    // Each log carries the game itself: the imported library is far larger than
    // the trending catalogue, so without a snapshot most titles would vanish (or
    // resolve to the wrong game) the next time the catalogue changed.
    const logs: UserGameLog[] = games.map((sg) => ({
      gameId: `steam_${sg.appId}`,
      game: steamGameToGame(sg),
      rating: 0,
      hoursPlayed: sg.hoursPlayed,
      status: sg.recent ? 'playing' : 'completed',
      loggedAt: language === 'ar' ? 'من Steam' : 'from Steam',
    }));

    setUserGames((prev) => {
      const byId = new Map<string, UserGameLog>(prev.map((l) => [l.gameId, l]));
      for (const log of logs) {
        // Keep a rating the user already gave; refresh the hours from Steam.
        byId.set(log.gameId, { ...log, rating: byId.get(log.gameId)?.rating ?? 0 });
      }
      return Array.from(byId.values());
    });

    // Firebase session → Firestore; Steam-only session → local storage.
    const fbUid = firebaseAuth.currentUser?.uid;
    if (fbUid) {
      saveGameLogs(fbUid, logs).catch((e) => console.error('saveGameLogs failed:', e));
    } else {
      saveLocal(sessionUid, { gameLogs: logs });
    }
  };

  // 4. Guest Barrier Modal
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestModalReason, setGuestModalReason] = useState('');

  const openGuestModal = (reason?: string) => {
    setGuestModalReason(reason || '');
    setIsGuestModalOpen(true);
  };

  const closeGuestModal = () => {
    setIsGuestModalOpen(false);
  };

  // Guard action: returns true if executed, false if blocked & opened guest modal
  const requireAuth = (action: () => void, reason?: string): boolean => {
    if (auth.isLoggedIn && auth.user) {
      action();
      return true;
    } else {
      openGuestModal(reason);
      return false;
    }
  };

  // 5. User Games & Wishlist & Live API Games
  const [allGames, setAllGames] = useState<Game[]>(mockGames);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLiveGames() {
      setLoadingGames(true);
      // Steam "most played" first (real live player counts, via the Netlify
      // Function). Falls back to RAWG, then the bundled mock list.
      const steamGames = await fetchSteamTrending();
      if (isMounted && steamGames.length > 0) {
        setAllGames(steamGames);
        setLoadingGames(false);
        return;
      }
      const liveGames = await fetchTrendingGames(24);
      if (isMounted && liveGames && liveGames.length > 0) {
        setAllGames(liveGames);
      }
      if (isMounted) setLoadingGames(false);
    }
    loadLiveGames();
    return () => { isMounted = false; };
  }, []);

  const [userGames, setUserGames] = useState<UserGameLog[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [blockedByIds, setBlockedByIds] = useState<string[]>([]);
  /** Everyone whose content I shouldn't see — blocked by me, or who blocked me. */
  const hiddenIds = useMemo(
    () => Array.from(new Set([...blockedIds, ...blockedByIds])),
    [blockedIds, blockedByIds],
  );
  const [isPrivacyPrivate, setIsPrivacyPrivate] = useState<boolean>(false);

  /**
   * A Steam sign-in is not a Firebase account, so Firestore rules (which key on
   * request.auth.uid) reject its writes. Those sessions persist locally instead
   * so an imported library survives a refresh.
   */
  const isLocalSession = auth.user?.provider === 'steam' && !firebaseAuth.currentUser;
  const localKey = (uid: string) => `pixels_local_${uid}`;

  const saveLocal = (uid: string, patch: Partial<{ gameLogs: UserGameLog[]; wishlist: string[]; followingIds: string[]; blockedIds: string[] }>) => {
    try {
      const raw = localStorage.getItem(localKey(uid));
      const cur = raw ? JSON.parse(raw) : { gameLogs: [], wishlist: [], followingIds: [], blockedIds: [] };
      localStorage.setItem(localKey(uid), JSON.stringify({ ...cur, ...patch }));
    } catch { /* storage full / disabled — non-fatal */ }
  };

  // Load the signed-in user's data (game logs, wishlist, follows) from Firestore,
  // or from local storage for Steam sessions. Clears for guests / on logout.
  useEffect(() => {
    const uid = auth.user && !auth.isGuest ? auth.user.id : null;
    if (!uid) {
      setUserGames([]);
      setWishlist([]);
      setFollowingIds([]);
      setBlockedIds([]);
      setBlockedByIds([]);
      return;
    }

    if (isLocalSession) {
      let localLogs: UserGameLog[] = [];
      try {
        const raw = localStorage.getItem(localKey(uid));
        const d = raw ? JSON.parse(raw) : null;
        localLogs = d?.gameLogs || [];
        setUserGames(localLogs);
        setWishlist(d?.wishlist || []);
        setFollowingIds(d?.followingIds || []);
        setBlockedIds(d?.blockedIds || []);
      } catch {
        setUserGames([]); setWishlist([]); setFollowingIds([]); setBlockedIds([]);
      }

      // A local copy written before logs carried a game snapshot has only ids,
      // and an id alone can't be rendered — 61 games would show as the handful
      // that happen to be in today's trending list. Game logs are publicly
      // readable, so heal the gaps from Firestore even without credentials.
      if (localLogs.some((l) => !l.game)) {
        let active = true;
        fetchUserGameLogs(uid).then((remote) => {
          if (!active || !remote.length) return;
          const byId = new Map(remote.map((l) => [l.gameId, l]));
          const healed = localLogs.map((l) => (l.game ? l : { ...l, game: byId.get(l.gameId)?.game }));
          const gained = healed.filter((l) => l.game).length - localLogs.filter((l) => l.game).length;
          if (gained > 0) {
            setUserGames(healed);
            saveLocal(uid, { gameLogs: healed });
          }
        });
        return () => { active = false; };
      }
      return;
    }

    let active = true;
    (async () => {
      await ensureUserArrays(uid);
      const data = await fetchUserData(uid);
      if (!active) return;
      setUserGames(data.gameLogs);
      setWishlist(data.wishlist);
      setFollowingIds(data.followingIds);
      setBlockedIds(data.blockedIds);
      setBlockedByIds(data.blockedByIds);

      // A brand-new account (no games, nobody followed) gets the setup flow —
      // whatever provider it signed in with. Shown once per account.
      if (!data.onboardedAtTs && data.gameLogs.length === 0 && data.followingIds.length === 0) {
        setIsOnboardingOpen(true);
      }
    })();
    return () => { active = false; };
  }, [auth.user?.id, auth.isGuest, isLocalSession]);

  /**
   * Keep the "Playing" shelf in step with what Steam says was actually played
   * recently, so it stops being a stale snapshot of import day.
   *
   * Throttled to once an hour per account: Steam's two-week playtime barely
   * moves, and this runs on every app load.
   */
  useEffect(() => {
    const uid = auth.user && !auth.isGuest ? auth.user.id : null;
    const steamId = uid?.startsWith('steam_') ? uid.slice('steam_'.length) : null;
    if (!steamId || userGames.length === 0) return;

    const stampKey = `pixels_recent_sync_${uid}`;
    const last = Number(localStorage.getItem(stampKey) || 0);
    if (Date.now() - last < 60 * 60 * 1000) return;

    let active = true;
    (async () => {
      const recent = await fetchSteamRecent(steamId, 5);
      if (!active || recent.length === 0) return;
      localStorage.setItem(stampKey, String(Date.now()));

      const changed = syncPlayingFromSteam(userGames, recent);
      if (!changed.length) return;

      const byId = new Map(changed.map((l) => [l.gameId, l]));
      const next = userGames.map((l) => byId.get(l.gameId) ?? l);
      setUserGames(next);

      const fbUid = firebaseAuth.currentUser?.uid;
      if (fbUid) saveGameLogs(fbUid, changed).catch((e) => console.error('recent sync save failed:', e));
      else if (uid) saveLocal(uid, { gameLogs: next });
    })();
    return () => { active = false; };
  }, [auth.user?.id, auth.isGuest, userGames.length]);

  const logGame = (
    gameId: string,
    rating: number,
    hours: number,
    status: GameStatus,
    reviewText?: string,
    /** Pass the game when it came from a live search — it may not be in `allGames`. */
    game?: Game,
  ) => {
    requireAuth(() => {
      const snapshot = game
        ?? allGames.find((g) => g.id === gameId)
        ?? mockGames.find((g) => g.id === gameId);

      const newLog: UserGameLog = {
        gameId,
        game: snapshot,
        rating,
        hoursPlayed: hours,
        status,
        loggedAt: language === 'ar' ? 'الآن' : 'Just now',
        reviewText,
      };
      const existingIdx = userGames.findIndex(g => g.gameId === gameId);
      const next = existingIdx >= 0
        ? userGames.map((l, i) => (i === existingIdx ? newLog : l))
        : [newLog, ...userGames];
      setUserGames(next);

      const uid = auth.user?.id;
      if (uid) {
        if (isLocalSession) saveLocal(uid, { gameLogs: next });
        else saveGameLog(uid, newLog).catch((e) => console.error('saveGameLog failed:', e));
      }
      showToast(t('successLog'));
    }, t('logThisGame'));
  };

  const removeUserGame = (gameId: string) => {
    requireAuth(() => {
      const next = userGames.filter(g => g.gameId !== gameId);
      setUserGames(next);
      const uid = auth.user?.id;
      if (uid) {
        if (isLocalSession) saveLocal(uid, { gameLogs: next });
        else removeGameLog(uid, gameId).catch((e) => console.error('removeGameLog failed:', e));
      }
    });
  };

  const isFavoriteGame = (gameId: string): boolean =>
    !!userGames.find((g) => g.gameId === gameId)?.isFavorite;

  /**
   * Star / un-star a game. Favouriting a game that isn't logged yet creates a
   * minimal log entry for it, so favourites always live on a real game log.
   */
  const toggleFavoriteGame = (gameId: string) => {
    requireAuth(() => {
      const existing = userGames.find((g) => g.gameId === gameId);
      const updated: UserGameLog = existing
        ? { ...existing, isFavorite: !existing.isFavorite }
        : {
            gameId,
            rating: 0,
            hoursPlayed: 0,
            status: 'backlog',
            loggedAt: language === 'ar' ? 'الآن' : 'Just now',
            isFavorite: true,
          };

      const next = existing
        ? userGames.map((g) => (g.gameId === gameId ? updated : g))
        : [updated, ...userGames];
      setUserGames(next);

      const uid = auth.user?.id;
      if (uid) {
        if (isLocalSession) saveLocal(uid, { gameLogs: next });
        else saveGameLog(uid, updated).catch((e) => console.error('favourite save failed:', e));
      }
      showToast(updated.isFavorite ? t('addedToFavorites') : t('removedFromFavorites'));
    }, t('favoriteGames'));
  };

  const toggleWishlist = (gameId: string) => {
    requireAuth(() => {
      const willAdd = !wishlist.includes(gameId);
      const next = willAdd ? [...wishlist, gameId] : wishlist.filter(id => id !== gameId);
      setWishlist(next);
      showToast(willAdd ? t('addToWishlist') : t('removeFromWishlist'));
      const uid = auth.user?.id;
      if (uid) {
        if (isLocalSession) saveLocal(uid, { wishlist: next });
        else setWishlistItem(uid, gameId, willAdd).catch((e) => console.error('setWishlistItem failed:', e));
      }
    }, t('addToWishlist'));
  };

  // 6. Posts state — live from Firestore (re-subscribes when the viewer
  // changes so per-user like/repost flags stay correct).
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  /** Blocked authors — in either direction — disappear from the feed. */
  const posts = useMemo(
    () => (hiddenIds.length ? rawPosts.filter((p) => !hiddenIds.includes(p.author?.id)) : rawPosts),
    [rawPosts, hiddenIds],
  );
  const setPosts = setRawPosts;

  const POSTS_PAGE = 20;
  const [postLimit, setPostLimit] = useState(POSTS_PAGE);

  useEffect(() => {
    seedIfEmpty();
    const uid = auth.user && !auth.isGuest ? auth.user.id : null;
    const unsub = subscribePosts(uid, setPosts, undefined, postLimit);
    return () => unsub();
  }, [auth.user?.id, auth.isGuest, postLimit]);

  // If the query returned a full page, assume there's more to fetch.
  const hasMorePosts = rawPosts.length >= postLimit;
  const loadMorePosts = () => {
    if (hasMorePosts) setPostLimit((n) => n + POSTS_PAGE);
  };

  const addPost = (content: string, game?: Game, rating?: number, imageUrl?: string, images?: string[]) => {
    requireAuth(() => {
      if (!auth.user) return;
      const finalImages = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : undefined);
      createPost({
        author: auth.user,
        createdAt: language === 'ar' ? 'الآن' : 'Just now',
        content,
        game,
        rating,
        imageUrl: finalImages && finalImages.length > 0 ? finalImages[0] : imageUrl,
        images: finalImages,
      })
        .then(() => showToast(t('successPost')))
        .catch((e) => {
          console.error('createPost failed:', e);
          showToast(language === 'ar' ? 'تعذّر نشر المنشور.' : 'Could not publish post.');
        });
    }, t('createPost'));
  };

  /** Author-only: rewrite the body of one of my posts. */
  const editPost = (postId: string, content: string) => {
    requireAuth(() => {
      const target = rawPosts.find((p) => p.id === postId);
      if (!target || target.author?.id !== auth.user?.id) return;
      updatePostContent(postId, content.trim())
        .then(() => showToast(language === 'ar' ? 'تم تعديل المنشور.' : 'Post updated.'))
        .catch((e) => {
          console.error('editPost failed:', e);
          showToast(language === 'ar' ? 'تعذّر تعديل المنشور.' : 'Could not update the post.');
        });
    }, t('createPost'));
  };

  /** Author-only: delete one of my posts. */
  const deleteOwnPost = (postId: string) => {
    requireAuth(() => {
      const target = rawPosts.find((p) => p.id === postId);
      if (!target || target.author?.id !== auth.user?.id) return;
      deletePost(postId)
        .then(() => showToast(language === 'ar' ? 'تم حذف المنشور.' : 'Post deleted.'))
        .catch((e) => {
          console.error('deletePost failed:', e);
          showToast(language === 'ar' ? 'تعذّر حذف المنشور.' : 'Could not delete the post.');
        });
    }, t('createPost'));
  };

  const toggleLikePost = (postId: string) => {
    requireAuth(() => {
      const uid = auth.user?.id;
      if (!uid || !auth.user) return;
      const target = posts.find(p => p.id === postId);
      const wasLiked = !!target?.isLiked;
      fsToggleLikePost(postId, wasLiked, uid).catch((e) => console.error('like failed:', e));
      // Notify the author on a new like (not on un-liking).
      if (!wasLiked && target?.author?.id) {
        createNotification({
          userId: target.author.id,
          type: 'like',
          actor: toParticipantMeta(auth.user),
          postId,
          text: target.content?.slice(0, 90),
        });
      }
    }, t('like'));
  };

  const toggleRepost = (postId: string) => {
    requireAuth(() => {
      const uid = auth.user?.id;
      if (!uid) return;
      const target = posts.find(p => p.id === postId);
      fsToggleRepostPost(postId, !!target?.isReposted, uid).catch((e) => console.error('repost failed:', e));
    }, t('repost'));
  };

  const addComment = (postId: string, commentText: string) => {
    requireAuth(() => {
      if (!auth.user) return;
      const newComment = {
        id: 'c_' + Date.now(),
        author: auth.user,
        createdAt: language === 'ar' ? 'الآن' : 'Just now',
        content: commentText,
        likesCount: 0,
      };
      addCommentToPost(postId, newComment)
        .then(() => showToast(language === 'ar' ? 'تمت إضافة التعليق!' : 'Comment added!'))
        .catch((e) => console.error('addComment failed:', e));

      const target = posts.find(p => p.id === postId);
      if (target?.author?.id) {
        createNotification({
          userId: target.author.id,
          type: 'comment',
          actor: toParticipantMeta(auth.user),
          postId,
          text: commentText.slice(0, 90),
        });
      }
    }, t('comment'));
  };

  // 7. Marketplace Listings — live from Firestore.
  const [rawListings, setRawListings] = useState<MarketplaceListing[]>([]);
  /** Blocked sellers — in either direction — disappear from the marketplace. */
  const listings = useMemo(
    () => (hiddenIds.length ? rawListings.filter((l) => !hiddenIds.includes(l.seller?.id)) : rawListings),
    [rawListings, hiddenIds],
  );

  useEffect(() => {
    const unsub = subscribeListings(setRawListings);
    return () => unsub();
  }, []);

  const addListing = (itemData: Omit<MarketplaceListing, 'id' | 'seller' | 'createdAt' | 'status'>) => {
    requireAuth(() => {
      if (!auth.user) return;
      const newListing: Omit<MarketplaceListing, 'id'> = {
        ...itemData,
        seller: auth.user,
        createdAt: language === 'ar' ? 'الآن' : 'Just now',
        status: 'active',
      };
      createListing(newListing)
        .then(() => showToast(language === 'ar' ? 'تمت إضافة المنتج بنجاح!' : 'Listing created successfully!'))
        .catch((e) => {
          console.error('createListing failed:', e);
          showToast(language === 'ar' ? 'تعذّر إضافة المنتج.' : 'Could not create listing.');
        });
    }, t('createListing'));
  };

  // 8. Follows — persisted on the user's Firestore doc (loaded above).
  const toggleFollowUser = (userId: string) => {
    requireAuth(() => {
      const willFollow = !followingIds.includes(userId);
      const next = willFollow ? [...followingIds, userId] : followingIds.filter(id => id !== userId);
      setFollowingIds(next);
      const uid = auth.user?.id;
      if (uid) {
        if (isLocalSession) saveLocal(uid, { followingIds: next });
        else setFollow(uid, userId, willFollow).catch((e) => console.error('setFollow failed:', e));
      }
      if (willFollow && auth.user) {
        createNotification({ userId, type: 'follow', actor: toParticipantMeta(auth.user) });
      }
    }, t('follow'));
  };

  // 8c. Blocking — hides the other person's content everywhere for this user and
  // stops them from opening or writing a conversation.
  const isBlocked = (userId: string): boolean => blockedIds.includes(userId);

  const toggleBlockUser = (target: User | ParticipantMeta) => {
    requireAuth(() => {
      const uid = auth.user?.id;
      if (!uid || target.id === uid) return;

      const wasFollowing = followingIds.includes(target.id);
      const willBlock = !blockedIds.includes(target.id);
      const next = willBlock
        ? [...blockedIds, target.id]
        : blockedIds.filter((id) => id !== target.id);
      setBlockedIds(next);

      // Blocking also stops following them (and decrements their counter).
      if (willBlock && wasFollowing) {
        const nextFollowing = followingIds.filter((id) => id !== target.id);
        setFollowingIds(nextFollowing);
        if (isLocalSession) saveLocal(uid, { followingIds: nextFollowing });
        else setFollow(uid, target.id, false).catch(() => {});
      }

      if (isLocalSession) saveLocal(uid, { blockedIds: next });
      else setBlocked(uid, target.id, willBlock).catch((e) => console.error('setBlocked failed:', e));

      // Leave the thread if it's open.
      if (willBlock) {
        const convo = conversationId(uid, target.id);
        if (activeConversationId === convo) setActiveConversationId(null);
      }

      showToast(willBlock
        ? (language === 'ar' ? `تم حظر ${target.name}` : `Blocked ${target.name}`)
        : (language === 'ar' ? `تم إلغاء حظر ${target.name}` : `Unblocked ${target.name}`));
    }, language === 'ar' ? 'الحظر' : 'Blocking');
  };

  // Real members to draw suggestions from (replaces the bundled demo users).
  const [memberPool, setMemberPool] = useState<User[]>([]);
  useEffect(() => {
    if (!auth.user || auth.isGuest) { setMemberPool([]); return; }
    let active = true;
    fetchMemberPool(40).then((users) => { if (active) setMemberPool(users); });
    return () => { active = false; };
  }, [auth.user?.id, auth.isGuest]);

  // 8b. Friend suggestions based on games in common.
  // Combines the signed-in user's declared Steam library (from Discord) with
  // any games they've logged, then ranks other gamers by shared titles.
  const suggestedFriends = useMemo<SuggestedFriend[]>(() => {
    const myAppIds = new Set<number>();
    (auth.user?.libraryAppIds || []).forEach((id) => myAppIds.add(id));
    userGames.forEach((log) => {
      const appId = appIdFromGameId(log.gameId);
      if (appId) myAppIds.add(appId);
    });
    const gameByAppId = (appId: number): Game | undefined =>
      allGames.find((g) => g.id === `steam_${appId}`) ||
      mockGames.find((g) => g.id === `steam_${appId}`);

    return memberPool
      .filter((u) => u.id !== auth.user?.id
        && !followingIds.includes(u.id) && !hiddenIds.includes(u.id))
      .map((u) => {
        const shared = (u.libraryAppIds || [])
          .filter((appId) => myAppIds.has(appId))
          .map(gameByAppId)
          .filter((g): g is Game => Boolean(g));
        return { user: u, sharedGames: shared };
      })
      // Shared-library matches first; otherwise still suggest real members so a
      // brand-new account isn't shown an empty list.
      .sort((a, b) => b.sharedGames.length - a.sharedGames.length)
      .slice(0, 12);
  }, [auth.user, userGames, followingIds, hiddenIds, allGames, memberPool]);

  // 8c. Primary navigation tab
  const [activeTab, setActiveTab] = useState<MainTab>('home');

  // 9. Modals & Detail Navigation
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<Game | null>(null);
  const [selectedListingForDetail, setSelectedListingForDetail] = useState<MarketplaceListing | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);

  // 10. Onboarding
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => {
    setIsOnboardingOpen(false);
    // Record completion so it doesn't reappear on every visit.
    const uid = auth.user?.id;
    if (uid && !isLocalSession) markOnboarded(uid);
  };

  // 10b. Direct messages + notifications (Firebase-authenticated sessions only —
  // Firestore rules key on request.auth.uid, which a Steam session doesn't have).
  const [rawConversations, setRawConversations] = useState<Conversation[]>([]);
  /** Non-null when the thread list could not be loaded at all. */
  const [messagingError, setMessagingError] = useState<string | null>(null);
  const [rawNotifications, setRawNotifications] = useState<AppNotification[]>([]);

  /** Threads with, and activity from, blocked users are hidden. */
  const conversations = useMemo(
    () => (hiddenIds.length
      ? rawConversations.filter((c) => !c.participants.some((p) => hiddenIds.includes(p)))
      : rawConversations),
    [rawConversations, hiddenIds],
  );
  const notifications = useMemo(
    () => (hiddenIds.length
      ? rawNotifications.filter((n) => !hiddenIds.includes(n.actor?.id))
      : rawNotifications),
    [rawNotifications, hiddenIds],
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const messagingUid = auth.user && !auth.isGuest && !isLocalSession ? auth.user.id : null;

  // Tag crash reports with the signed-in account.
  useEffect(() => {
    setErrorUser(auth.user && !auth.isGuest ? auth.user.id : undefined);
  }, [auth.user?.id, auth.isGuest]);

  // Moderator role — presence of an `admins/<uid>` document (console-managed).
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!messagingUid) { setIsAdmin(false); return; }
    let active = true;
    checkIsAdmin(messagingUid).then((ok) => { if (active) setIsAdmin(ok); });
    return () => { active = false; };
  }, [messagingUid]);

  useEffect(() => {
    if (!messagingUid) {
      setRawConversations([]);
      setRawNotifications([]);
      setActiveConversationId(null);
      return;
    }
    // Surface subscription failures. A missing Firestore index made this query
    // fail server-side while the panel rendered a cheerful "no conversations
    // yet" — the outage was invisible. Never again.
    setMessagingError(null);
    const unsubConvos = subscribeConversations(messagingUid, (c) => {
      setMessagingError(null);
      setRawConversations(c);
    }, (e) => setMessagingError(describeQueryError(e)));
    const unsubNotifs = subscribeNotifications(messagingUid, setRawNotifications);

    // FCM doesn't display pushes that arrive while the tab is focused, so
    // surface those as a toast instead.
    let unsubPush: (() => void) | undefined;
    listenForegroundPush((title, body) => showToast(body ? `${title}: ${body}` : title))
      .then((fn) => { unsubPush = fn; });

    return () => { unsubConvos(); unsubNotifs(); unsubPush?.(); };
  }, [messagingUid]);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;
  const unreadMessageCount = conversations.reduce(
    (sum, c) => sum + (messagingUid ? c.unread?.[messagingUid] ?? 0 : 0),
    0,
  );

  const openConversationWith = (other: User | ParticipantMeta) => {
    requireAuth(() => {
      if (!auth.user) return;
      if (isLocalSession) {
        showToast(language === 'ar'
          ? 'الرسائل تحتاج حساب Google أو بريد إلكتروني.'
          : 'Messaging requires a Google or email account.');
        return;
      }
      if (other.id === auth.user.id) return;

      if (blockedIds.includes(other.id)) {
        showToast(language === 'ar'
          ? 'لقد حظرت هذا المستخدم. أزل الحظر أولاً.'
          : 'You blocked this user. Unblock them first.');
        return;
      }
      if (blockedByIds.includes(other.id)) {
        showToast(language === 'ar' ? 'لا يمكنك مراسلة هذا المستخدم.' : 'You can’t message this user.');
        return;
      }

      setActiveTab('messages');
      // Refuse if they've blocked us (one public profile read).
      hasBlockedMe(other.id, auth.user.id).then((blocked) => {
        if (blocked) {
          showToast(language === 'ar'
            ? 'لا يمكنك مراسلة هذا المستخدم.'
            : 'You can’t message this user.');
          return;
        }
        return ensureConversation(auth.user!, toParticipantMeta(other)).then((id) => {
          setActiveConversationId(id);
          markConversationRead(id, auth.user!.id);
        });
      }).catch((e) => {
        console.error('openConversationWith failed:', e);
        showToast(language === 'ar' ? 'تعذّر فتح المحادثة.' : 'Could not open the conversation.');
      });
    }, language === 'ar' ? 'الرسائل' : 'Messages');
  };

  const closeConversation = () => setActiveConversationId(null);

  const sendMessageTo = (convId: string, text: string) => {
    if (!auth.user || !convId || !text.trim()) return;
    const convo = conversations.find((c) => c.id === convId);
    const recipientId = convo?.participants.find((p) => p !== auth.user!.id)
      // Fall back to the id encoding when the doc hasn't synced yet.
      ?? convId.split('__').find((p) => p !== auth.user!.id);
    if (!recipientId) return;

    fsSendMessage(convId, auth.user, recipientId, text).catch((e) => {
      console.error('sendMessage failed:', e);
      showToast(language === 'ar' ? 'تعذّر إرسال الرسالة.' : 'Could not send the message.');
    });
  };

  const openNotifications = () => {
    requireAuth(() => setIsNotificationsOpen(true), language === 'ar' ? 'التنبيهات' : 'Notifications');
  };
  const closeNotifications = () => setIsNotificationsOpen(false);
  const markAllRead = () => {
    if (messagingUid) markAllNotificationsRead(messagingUid);
  };

  // 11. Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        theme,
        setTheme,
        toggleTheme,
        t,

        auth,
        login,
        updateProfile,
        logout,
        continueAsGuest,
        loginWithSteamProvider,
        isImportingSteam,
        suggestedFriends,
        memberPool,

        activeTab,
        setActiveTab,

        isGuestModalOpen,
        guestModalReason,
        openGuestModal,
        closeGuestModal,
        requireAuth,

        userGames,
        allGames,
        loadingGames,
        logGame,
        removeUserGame,
        toggleFavoriteGame,
        isFavoriteGame,
        wishlist,
        toggleWishlist,
        isPrivacyPrivate,
        setIsPrivacyPrivate,

        posts,
        hasMorePosts,
        loadMorePosts,
        addPost,
        editPost,
        deleteOwnPost,
        toggleLikePost,
        toggleRepost,
        addComment,

        listings,
        addListing,

        followingIds,
        toggleFollowUser,

        isAdmin,
        blockedIds,
        isBlocked,
        toggleBlockUser,

        selectedGameForDetail,
        setSelectedGameForDetail,
        selectedListingForDetail,
        setSelectedListingForDetail,
        viewingProfileUser,
        setViewingProfileUser,

        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,

        conversations,
        activeConversationId,
        openConversationWith,
        closeConversation,
        sendMessageTo,
        messagingError,

        notifications,
        unreadNotificationCount,
        unreadMessageCount,
        isNotificationsOpen,
        openNotifications,
        closeNotifications,
        markAllRead,

        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
