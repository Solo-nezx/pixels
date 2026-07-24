import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MarketplaceListing, ListingCondition, ListingType } from '../types';
import { X, Plus } from 'lucide-react';

interface CreateListingModalProps {
  onClose: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({ onClose }) => {
  const { t, addListing } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [type, setType] = useState<ListingType>('sale');
  const [condition, setCondition] = useState<ListingCondition>('Like New');
  const [category, setCategory] = useState<MarketplaceListing['category']>('Hardware');
  const [tradeOffersFor, setTradeOffersFor] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    addListing({
      title: title.trim(),
      description: description.trim(),
      price: type === 'sale' ? Number(price) || 0 : undefined,
      type,
      condition,
      category,
      images: [
        imageUrl.trim() || 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&auto=format&fit=crop&q=80'
      ],
      tradeOffersFor: type === 'trade' ? tradeOffersFor : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('createListing')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Listing Type Toggle */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Listing Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setType('sale')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  type === 'sale' ? 'bg-[#7C3AED] text-white' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {t('filterSale')}
              </button>
              <button
                type="button"
                onClick={() => setType('trade')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  type === 'trade' ? 'bg-[#F43F5E] text-slate-950' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {t('filterTrade')}
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. DualSense Edge Controller"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="Hardware">{t('categoryHardware')}</option>
                <option value="Games">{t('categoryGames')}</option>
                <option value="Collectibles">{t('categoryCollectibles')}</option>
                <option value="Accessories">{t('categoryAccessories')}</option>
                <option value="Digital">{t('categoryDigital')}</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Condition</label>
              <select
                value={condition}
                onChange={e => setCondition(e.target.value as any)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="New">{t('conditionNew')}</option>
                <option value="Like New">{t('conditionLikeNew')}</option>
                <option value="Good">{t('conditionGood')}</option>
                <option value="Fair">{t('conditionFair')}</option>
              </select>
            </div>
          </div>

          {/* Price or Trade offer */}
          {type === 'sale' ? (
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Price ($ USD)</label>
              <input
                type="number"
                required
                placeholder="150"
                value={price}
                onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          ) : (
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Looking to trade for...</label>
              <input
                type="text"
                placeholder="e.g. Nintendo Switch OLED or PS5 Digital"
                value={tradeOffersFor}
                onChange={e => setTradeOffersFor(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#F43F5E]"
              />
            </div>
          )}

          {/* Image URL */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Item Image URL (Optional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">Description</label>
            <textarea
              rows={3}
              required
              placeholder="Item condition details, included accessories, or shipping info..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#7C3AED] text-white font-bold rounded-xl hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/30 transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createListing')}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
