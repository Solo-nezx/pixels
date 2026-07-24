import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ListingType } from '../types';
import { MarketplaceDetailModal } from './MarketplaceDetailModal';
import { CreateListingModal } from './CreateListingModal';
import { Search, Tag, Plus } from 'lucide-react';

export const Marketplace: React.FC = () => {
  const { t, listings, setSelectedListingForDetail, selectedListingForDetail } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ListingType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const categories = [
    { key: 'All', label: t('categoryAll') },
    { key: 'Hardware', label: t('categoryHardware') },
    { key: 'Games', label: t('categoryGames') },
    { key: 'Collectibles', label: t('categoryCollectibles') },
    { key: 'Accessories', label: t('categoryAccessories') },
    { key: 'Digital', label: t('categoryDigital') },
  ];

  // Filter listings
  const filteredListings = listings.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="w-full pb-20">
      
      {/* Marketplace Header */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card)]/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-extrabold text-[var(--color-text-primary)]">
              {t('marketplaceTitle')}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t('marketplaceSubtitle')}
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('createListing')}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute top-2.5 left-3 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder={t('searchMarketplace')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
          />
        </div>

        {/* Type Filter Pills (All / For Sale / For Trade) */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              typeFilter === 'all'
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('filterAll')}
          </button>
          <button
            onClick={() => setTypeFilter('sale')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              typeFilter === 'sale'
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('filterSale')}
          </button>
          <button
            onClick={() => setTypeFilter('trade')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              typeFilter === 'trade'
                ? 'bg-[#F43F5E] text-slate-950 shadow-sm'
                : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t('filterTrade')}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.key
                  ? 'text-[#7C3AED] bg-[#7C3AED]/10 font-bold'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Listing Cards */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredListings.length > 0 ? (
          filteredListings.map(item => (
            <div
              key={item.id}
              onClick={() => setSelectedListingForDetail(item)}
              className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden cursor-pointer hover:border-[#7C3AED] shadow-sm hover:shadow-xl hover:shadow-[#7C3AED]/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Image & Badges */}
                <div className="relative aspect-video overflow-hidden bg-black/40">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                    {item.type === 'trade' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F43F5E] text-slate-950 shadow-md">
                        {t('tradeBadge')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#7C3AED] text-white shadow-md">
                        ${item.price}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-black/70 text-white backdrop-blur-md">
                      {item.condition}
                    </span>
                  </div>
                </div>

                {/* Listing Details */}
                <div className="p-3">
                  <span className="text-[10px] font-bold text-[#F43F5E] uppercase tracking-wider block mb-0.5">
                    {item.category}
                  </span>
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)] line-clamp-2 leading-snug group-hover:text-[#7C3AED] transition-colors mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Seller Footer Snippet */}
              <div className="p-3 pt-0 border-t border-[var(--color-border)]/50 flex items-center justify-between text-xs mt-auto">
                <div className="flex items-center gap-2">
                  <img
                    src={item.seller.avatar}
                    alt={item.seller.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                    }}
                    className="w-6 h-6 rounded-full object-cover border border-[var(--color-border)]"
                  />
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[120px]">
                    {item.seller.name}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-text-secondary)]">{item.createdAt}</span>
              </div>

            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-xs text-[var(--color-text-secondary)]">
            <Tag className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto mb-2 opacity-50" />
            <p>{t('noListingsFound')}</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedListingForDetail && (
        <MarketplaceDetailModal
          listing={selectedListingForDetail}
          onClose={() => setSelectedListingForDetail(null)}
        />
      )}

      {/* Create Listing Modal */}
      {isCreateModalOpen && (
        <CreateListingModal
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

    </div>
  );
};
