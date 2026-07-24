export type Language = 'en' | 'ar';
export type Theme = 'dark' | 'light';

export interface Badge {
  id: string;
  badgeKey: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  iconName: 'Award' | 'Flame' | 'Clock' | 'Gamepad2' | 'Sparkles' | 'Trophy' | 'ShieldCheck' | 'Repeat' | 'ShoppingBag' | 'Star' | 'Crown';
  category: 'milestone' | 'gaming' | 'community' | 'collector';
  colorGradient: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent?: number;
  progressMax?: number;
  featured?: boolean;
}

export type AuthProvider = 'email' | 'google' | 'discord' | 'steam';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  banner: string;
  bio: string;
  verified?: boolean;
  followersCount: number;
  followingCount: number;
  likesReceivedCount: number;
  hoursPlayed: number;
  gamesLoggedCount: number;
  reviewsWrittenCount: number;
  featuredBadgeIds?: string[];
  mutualFollowers?: {
    name: string;
    avatar: string;
    otherCount: number;
  };
  isFollowing?: boolean;
  isPrivate?: boolean;

  // Auth provenance & linked accounts
  provider?: AuthProvider;
  steamId?: string | null;
  /** Steam appIds the user owns/plays — powers shared-game friend matching. */
  libraryAppIds?: number[];
}

/** A game imported from a linked Steam account (via the Cloudflare Worker). */
export interface SteamGame {
  appId: number;
  title: string;
  coverUrl: string;
  bannerUrl: string;
  hoursPlayed: number;
  recent: boolean;
}

/** Payload the Worker posts back after a Discord OAuth round-trip. */
export interface DiscordAuthResult {
  ok: boolean;
  error?: string;
  profile?: {
    id: string;
    username: string;
    handle: string;
    email: string | null;
    avatar: string;
    steamId: string | null;
  };
  connections?: { type: string; name: string; id: string }[];
  games?: SteamGame[];
}

export type GameStatus = 'playing' | 'completed' | 'backlog' | 'dropped' | 'wishlist';

export interface Game {
  id: string;
  title: string;
  coverUrl: string;
  bannerUrl?: string;
  releaseYear: number;
  developer: string;
  genres: string[];
  platforms: string[];
  averageRating: number;
  ratingCount: number;
  summary: string;
  metascore?: number;
  /** Current concurrent players (from Steam most-played chart), when available. */
  playerCount?: number;
  /** 24h peak concurrent players (from Steam), when available. */
  peakPlayers?: number;
}

export interface UserGameLog {
  gameId: string;
  rating: number; // 1 to 5 stars
  hoursPlayed: number;
  status: GameStatus;
  loggedAt: string;
  reviewText?: string;
  isFavorite?: boolean;
}

export interface Post {
  id: string;
  author: User;
  createdAt: string;
  content: string;
  game?: Game;
  rating?: number; // 1-5
  imageUrl?: string;
  images?: string[];
  videos?: string[];
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isSaved?: boolean;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  author: User;
  createdAt: string;
  content: string;
  likesCount: number;
  isLiked?: boolean;
}

export type ListingType = 'sale' | 'trade';
export type ListingCondition = 'New' | 'Like New' | 'Good' | 'Fair';

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  price?: number;
  type: ListingType;
  condition: ListingCondition;
  category: 'Hardware' | 'Games' | 'Collectibles' | 'Accessories' | 'Digital';
  images: string[];
  seller: User;
  createdAt: string;
  tradeOffersFor?: string; // what seller is looking for
  status: 'active' | 'pending' | 'sold';
}

export interface AuthState {
  isLoggedIn: boolean;
  isGuest: boolean;
  user: User | null;
}
