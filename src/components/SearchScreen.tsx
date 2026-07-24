import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { mockUsers } from '../data/mockData';
import { PostCard } from './PostCard';
import { SuggestedFriends } from './SuggestedFriends';
import { Game } from '../types';
import { searchGamesFromApi } from '../services/gameApiService';
import { Search, UserPlus, UserCheck, ShieldCheck, Star, ShoppingBag, Gamepad2, Users, MessageSquare, Loader2, Globe } from 'lucide-react';

export const SearchScreen: React.FC = () => {
  const { 
    t, 
    posts, 
    listings, 
    allGames,
    loadingGames,
    setSelectedGameForDetail, 
    setSelectedListingForDetail, 
    setViewingProfileUser,
    followingIds,
    toggleFollowUser,
    language
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTab, setActiveSearchTab] = useState<'games' | 'people' | 'marketplace' | 'posts'>('games');
  const [liveSearchResults, setLiveSearchResults] = useState<Game[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState<boolean>(false);

  // Suggested accounts for empty state
  const suggestedUsers = mockUsers.filter(u => u.id !== 'usr_me');

  // Debounced live RAWG API search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLiveSearchResults([]);
      setIsSearchingApi(false);
      return;
    }

    setIsSearchingApi(true);
    const timer = setTimeout(async () => {
      const results = await searchGamesFromApi(searchQuery);
      setLiveSearchResults(results);
      setIsSearchingApi(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredGames = searchQuery.trim() !== '' ? liveSearchResults : allGames;

  const filteredPeople = mockUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.game && p.game.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full pb-20">
      
      {/* Search Header */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] sticky top-14 z-30">
        <div className="relative">
          <Search className="absolute top-3 left-3.5 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Active Search Result Tabs */}
        {searchQuery.trim() !== '' && (
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pt-1">
            <button
              onClick={() => setActiveSearchTab('games')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSearchTab === 'games'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{t('tabGames')} ({filteredGames.length})</span>
            </button>

            <button
              onClick={() => setActiveSearchTab('people')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSearchTab === 'people'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t('tabPeople')} ({filteredPeople.length})</span>
            </button>

            <button
              onClick={() => setActiveSearchTab('marketplace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSearchTab === 'marketplace'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t('tabMarketplace')} ({filteredListings.length})</span>
            </button>

            <button
              onClick={() => setActiveSearchTab('posts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSearchTab === 'posts'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('tabPosts')} ({filteredPosts.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* EMPTY SEARCH STATE: Suggested Accounts Horizontal Cards */}
      {searchQuery.trim() === '' && (
        <div className="p-4 space-y-6">
          {/* Friends based on shared games */}
          <SuggestedFriends />

          <section>
            <h3 className="text-sm font-extrabold text-[var(--color-text-primary)] mb-3">
              {t('suggestedAccounts')}
            </h3>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {suggestedUsers.map(user => {
                const isFollowing = followingIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex-shrink-0 w-60 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 flex flex-col justify-between shadow-sm hover:border-[#7C3AED] transition-all"
                  >
                    <div>
                      {/* Banner & Avatar */}
                      <div className="relative mb-8">
                        <img
                          src={user.banner}
                          alt="banner"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-16 rounded-xl object-cover"
                        />
                        <img
                          src={user.avatar}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                          }}
                          onClick={() => setViewingProfileUser(user)}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[var(--color-card)] absolute -bottom-5 left-3 cursor-pointer"
                        />
                      </div>

                      {/* Info */}
                      <div className="mb-3">
                        <div 
                          onClick={() => setViewingProfileUser(user)}
                          className="flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate">
                            {user.name}
                          </h4>
                          {user.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" />}
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] mb-2">
                          @{user.username}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                          {user.bio}
                        </p>
                      </div>

                      {/* Mutual Followers Snippet */}
                      {user.mutualFollowers && (
                        <div className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg)] p-2 rounded-lg mb-3">
                          <span>
                            {t('followedBy')} <strong className="text-[var(--color-text-primary)]">{user.mutualFollowers.name}</strong> + {user.mutualFollowers.otherCount} {t('andOthers')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Follow Button */}
                    <button
                      onClick={() => toggleFollowUser(user.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isFollowing
                          ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                          : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{t('following')}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{t('follow')}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Featured Popular Games List in Search empty state */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span>{language === 'ar' ? 'ألعاب شائعة ومباشرة من الإنترنت' : 'Live Trending Games from Database'}</span>
                <Globe className="w-3.5 h-3.5 text-[#F43F5E]" />
              </h3>
            </div>
            {loadingGames ? (
              <div className="flex items-center justify-center py-10 gap-2 text-xs text-[var(--color-text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" />
                <span>{language === 'ar' ? 'جاري جلب أحدث الألعاب...' : 'Fetching live games database...'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allGames.slice(0, 8).map(game => (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGameForDetail(game)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden cursor-pointer hover:border-[#7C3AED] transition-all group"
                  >
                    <div className="relative aspect-[3/4]">
                      <img
                        src={game.coverUrl}
                        alt={game.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-amber-400 font-bold text-[10px] flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        <span>{game.averageRating}</span>
                      </div>
                    </div>
                    <div className="p-2">
                      <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate group-hover:text-[#7C3AED] transition-colors">
                        {game.title}
                      </h4>
                      <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
                        {game.developer} ({game.releaseYear})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ACTIVE SEARCH RESULTS CONTENT */}
      {searchQuery.trim() !== '' && (
        <div className="p-4">
          
          {/* Games Tab */}
          {activeSearchTab === 'games' && (
            <div>
              {isSearchingApi ? (
                <div className="flex items-center justify-center py-12 gap-2 text-xs text-[var(--color-text-secondary)]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
                  <span>{language === 'ar' ? 'جاري البحث في قاعدة بيانات الألعاب العالمية...' : 'Searching global video game database...'}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredGames.length > 0 ? (
                    filteredGames.map(game => (
                      <div
                        key={game.id}
                        onClick={() => setSelectedGameForDetail(game)}
                        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden cursor-pointer hover:border-[#7C3AED] transition-all group shadow-sm"
                      >
                        <div className="relative aspect-[3/4]">
                          <img
                            src={game.coverUrl}
                            alt={game.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-amber-400 font-bold text-[10px] flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            <span>{game.averageRating}</span>
                          </div>
                        </div>
                        <div className="p-2.5">
                          <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate group-hover:text-[#7C3AED] transition-colors">
                            {game.title}
                          </h4>
                          <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
                            {game.developer} ({game.releaseYear})
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="col-span-full text-xs text-[var(--color-text-secondary)] text-center py-8">
                      {t('noSearchResults')} "{searchQuery}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* People Tab */}
          {activeSearchTab === 'people' && (
            <div className="space-y-3">
              {filteredPeople.length > 0 ? (
                filteredPeople.map(user => {
                  const isFollowing = followingIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between"
                    >
                      <div 
                        onClick={() => setViewingProfileUser(user)}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <img
                          src={user.avatar}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                          }}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)]"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate">{user.name}</h4>
                            {user.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#7C3AED]" />}
                          </div>
                          <p className="text-[11px] text-[var(--color-text-secondary)] truncate">@{user.username}</p>
                          <p className="text-[11px] text-[var(--color-text-secondary)] truncate">{user.bio}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleFollowUser(user.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isFollowing
                            ? 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                            : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                        }`}
                      >
                        {isFollowing ? t('following') : t('follow')}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)] text-center py-8">
                  {t('noSearchResults')} "{searchQuery}"
                </p>
              )}
            </div>
          )}

          {/* Marketplace Tab */}
          {activeSearchTab === 'marketplace' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredListings.length > 0 ? (
                filteredListings.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedListingForDetail(item)}
                    className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] flex gap-3 cursor-pointer hover:border-[#7C3AED] transition-all"
                  >
                    <img src={item.images[0]} alt={item.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-[#F43F5E] uppercase">{item.category}</span>
                      <h4 className="font-bold text-xs text-[var(--color-text-primary)] truncate">{item.title}</h4>
                      <p className="text-xs font-extrabold text-[#7C3AED]">{item.type === 'trade' ? 'TRADE' : `$${item.price}`}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{item.seller.name}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-xs text-[var(--color-text-secondary)] text-center py-8">
                  {t('noSearchResults')} "{searchQuery}"
                </p>
              )}
            </div>
          )}

          {/* Posts Tab */}
          {activeSearchTab === 'posts' && (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)] text-center py-8">
                  {t('noSearchResults')} "{searchQuery}"
                </p>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
