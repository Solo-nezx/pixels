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
  DiscordAuthResult
} from '../types';
import { translations } from '../i18n/translations';
import { mockCurrentUser, mockGames, mockUsers } from '../data/mockData';
import { auth as firebaseAuth, firebaseSignOut, onAuthStateChanged, doc, getDoc, setDoc, db } from '../lib/firebase';
import { fetchTrendingGames } from '../services/rawg';
import { fetchSteamTrending } from '../services/steam';
import { loginWithSteam, steamGameToGame } from '../services/discordAuth';
import {
  subscribePosts,
  subscribeListings,
  createPost,
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
} from '../services/socialData';

/** Parse the numeric Steam appId out of a `steam_<id>` game id. */
function appIdFromGameId(gameId: string): number | null {
  const m = gameId.match(/^steam_(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export interface SuggestedFriend {
  user: User;
  sharedGames: Game[];
}

export type MainTab = 'home' | 'marketplace' | 'search' | 'profile' | 'wishlist';

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
  logout: () => void;
  continueAsGuest: () => void;
  loginWithSteamProvider: () => Promise<void>;
  isImportingSteam: boolean;

  // Friend suggestions (based on games in common)
  suggestedFriends: SuggestedFriend[];

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
  logGame: (gameId: string, rating: number, hours: number, status: GameStatus, reviewText?: string) => void;
  removeUserGame: (gameId: string) => void;
  wishlist: string[];
  toggleWishlist: (gameId: string) => void;
  isPrivacyPrivate: boolean;
  setIsPrivacyPrivate: (val: boolean) => void;

  // Social Feed & Posts
  posts: Post[];
  addPost: (content: string, game?: Game, rating?: number, imageUrl?: string, images?: string[], videos?: string[]) => void;
  toggleLikePost: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  addComment: (postId: string, commentText: string) => void;

  // Marketplace
  listings: MarketplaceListing[];
  addListing: (listing: Omit<MarketplaceListing, 'id' | 'seller' | 'createdAt' | 'status'>) => void;

  // Follows
  followingIds: string[];
  toggleFollowUser: (userId: string) => void;

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

    login(providerUser);
    closeGuestModal();
    importSteamGames(importedGames);
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

  /** Merge Steam-imported games into the catalogue and the user's game log. */
  const importSteamGames = (games: SteamGame[]) => {
    if (!games.length) return;

    setAllGames((prev) => {
      const existing = new Set(prev.map((g) => g.id));
      const additions = games
        .map(steamGameToGame)
        .filter((g) => !existing.has(g.id));
      return additions.length ? [...prev, ...additions] : prev;
    });

    const newLogs: UserGameLog[] = [];
    setUserGames((prev) => {
      const byId = new Map(prev.map((l) => [l.gameId, l]));
      for (const sg of games) {
        const gameId = `steam_${sg.appId}`;
        if (byId.has(gameId)) continue;
        const log: UserGameLog = {
          gameId,
          rating: 0,
          hoursPlayed: sg.hoursPlayed,
          status: sg.recent ? 'playing' : 'completed',
          loggedAt: language === 'ar' ? 'من Steam' : 'from Steam',
        };
        byId.set(gameId, log);
        newLogs.push(log);
      }
      return Array.from(byId.values());
    });

    // Persist to Firestore when the current session is Firebase-authenticated.
    const uid = firebaseAuth.currentUser?.uid;
    if (uid && newLogs.length) saveGameLogs(uid, newLogs).catch(() => {});
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
  const [isPrivacyPrivate, setIsPrivacyPrivate] = useState<boolean>(false);

  // Load the signed-in user's Firestore data (game logs, wishlist, follows).
  // Clears back to empty for guests / on logout.
  useEffect(() => {
    const uid = auth.user && !auth.isGuest ? auth.user.id : null;
    if (!uid) {
      setUserGames([]);
      setWishlist([]);
      setFollowingIds([]);
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
    })();
    return () => { active = false; };
  }, [auth.user?.id, auth.isGuest]);

  const logGame = (gameId: string, rating: number, hours: number, status: GameStatus, reviewText?: string) => {
    requireAuth(() => {
      const newLog: UserGameLog = {
        gameId,
        rating,
        hoursPlayed: hours,
        status,
        loggedAt: language === 'ar' ? 'الآن' : 'Just now',
        reviewText,
      };
      setUserGames(prev => {
        const existingIdx = prev.findIndex(g => g.gameId === gameId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newLog;
          return updated;
        }
        return [newLog, ...prev];
      });
      const uid = auth.user?.id;
      if (uid) saveGameLog(uid, newLog).catch((e) => console.error('saveGameLog failed:', e));
      showToast(t('successLog'));
    }, t('logThisGame'));
  };

  const removeUserGame = (gameId: string) => {
    requireAuth(() => {
      setUserGames(prev => prev.filter(g => g.gameId !== gameId));
      const uid = auth.user?.id;
      if (uid) removeGameLog(uid, gameId).catch((e) => console.error('removeGameLog failed:', e));
    });
  };

  const toggleWishlist = (gameId: string) => {
    requireAuth(() => {
      const willAdd = !wishlist.includes(gameId);
      setWishlist(prev => (willAdd ? [...prev, gameId] : prev.filter(id => id !== gameId)));
      showToast(willAdd ? t('addToWishlist') : t('removeFromWishlist'));
      const uid = auth.user?.id;
      if (uid) setWishlistItem(uid, gameId, willAdd).catch((e) => console.error('setWishlistItem failed:', e));
    }, t('addToWishlist'));
  };

  // 6. Posts state — live from Firestore (re-subscribes when the viewer
  // changes so per-user like/repost flags stay correct).
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    seedIfEmpty();
    const uid = auth.user && !auth.isGuest ? auth.user.id : null;
    const unsub = subscribePosts(uid, setPosts);
    return () => unsub();
  }, [auth.user?.id, auth.isGuest]);

  const addPost = (content: string, game?: Game, rating?: number, imageUrl?: string, images?: string[], videos?: string[]) => {
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
        videos: videos && videos.length > 0 ? videos : undefined,
      })
        .then(() => showToast(t('successPost')))
        .catch((e) => {
          console.error('createPost failed:', e);
          showToast(language === 'ar' ? 'تعذّر نشر المنشور.' : 'Could not publish post.');
        });
    }, t('createPost'));
  };

  const toggleLikePost = (postId: string) => {
    requireAuth(() => {
      const uid = auth.user?.id;
      if (!uid) return;
      const target = posts.find(p => p.id === postId);
      fsToggleLikePost(postId, !!target?.isLiked, uid).catch((e) => console.error('like failed:', e));
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
    }, t('comment'));
  };

  // 7. Marketplace Listings — live from Firestore.
  const [listings, setListings] = useState<MarketplaceListing[]>([]);

  useEffect(() => {
    const unsub = subscribeListings(setListings);
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
      setFollowingIds(prev => (willFollow ? [...prev, userId] : prev.filter(id => id !== userId)));
      const uid = auth.user?.id;
      if (uid) setFollow(uid, userId, willFollow).catch((e) => console.error('setFollow failed:', e));
    }, t('follow'));
  };

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
    if (myAppIds.size === 0) return [];

    const gameByAppId = (appId: number): Game | undefined =>
      allGames.find((g) => g.id === `steam_${appId}`) ||
      mockGames.find((g) => g.id === `steam_${appId}`);

    return mockUsers
      .filter((u) => u.id !== 'usr_me' && u.id !== auth.user?.id && !followingIds.includes(u.id))
      .map((u) => {
        const shared = (u.libraryAppIds || [])
          .filter((appId) => myAppIds.has(appId))
          .map(gameByAppId)
          .filter((g): g is Game => Boolean(g));
        return { user: u, sharedGames: shared };
      })
      .filter((s) => s.sharedGames.length > 0)
      .sort((a, b) => b.sharedGames.length - a.sharedGames.length);
  }, [auth.user, userGames, followingIds, allGames]);

  // 8c. Primary navigation tab
  const [activeTab, setActiveTab] = useState<MainTab>('home');

  // 9. Modals & Detail Navigation
  const [selectedGameForDetail, setSelectedGameForDetail] = useState<Game | null>(null);
  const [selectedListingForDetail, setSelectedListingForDetail] = useState<MarketplaceListing | null>(null);
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);

  // 10. Onboarding
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);

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
        logout,
        continueAsGuest,
        loginWithSteamProvider,
        isImportingSteam,
        suggestedFriends,

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
        wishlist,
        toggleWishlist,
        isPrivacyPrivate,
        setIsPrivacyPrivate,

        posts,
        addPost,
        toggleLikePost,
        toggleRepost,
        addComment,

        listings,
        addListing,

        followingIds,
        toggleFollowUser,

        selectedGameForDetail,
        setSelectedGameForDetail,
        selectedListingForDetail,
        setSelectedListingForDetail,
        viewingProfileUser,
        setViewingProfileUser,

        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,

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
