import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MarketplaceListing, ListingCondition, ListingType } from '../types';
import { X, Plus, ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { compressImage, uploadErrorMessage } from '../lib/imageUpload';

interface CreateListingModalProps {
  onClose: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({ onClose }) => {
  const { t, addListing, showToast, language } = useApp();
  const isAr = language === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [type, setType] = useState<ListingType>('sale');
  const [condition, setCondition] = useState<ListingCondition>('Like New');
  const [category, setCategory] = useState<MarketplaceListing['category']>('Hardware');
  const [tradeOffersFor, setTradeOffersFor] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      setImageUrl(await compressImage(file, { maxDim: 1000, maxBytes: 140_000 }));
      showToast(isAr ? 'تمت إضافة الصورة' : 'Image added');
    } catch (err) {
      console.error('listing image failed:', err);
      showToast(uploadErrorMessage(err, isAr));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

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
            aria-label="Close"
            className="icon-btn"
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
                  type === 'sale' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {t('filterSale')}
              </button>
              <button
                type="button"
                onClick={() => setType('trade')}
                className={`py-2 rounded-lg font-bold transition-all ${
                  type === 'trade' ? 'bg-[var(--color-secondary)] text-slate-950' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {t('filterTrade')}
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="listing-title" className="font-semibold text-[var(--color-text-primary)] mb-1 block">Title</label>
            <input
              id="listing-title"
              type="text"
              required
              placeholder="e.g. DualSense Edge Controller"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="listing-category" className="font-semibold text-[var(--color-text-primary)] mb-1 block">Category</label>
              <select
                id="listing-category"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="Hardware">{t('categoryHardware')}</option>
                <option value="Games">{t('categoryGames')}</option>
                <option value="Collectibles">{t('categoryCollectibles')}</option>
                <option value="Accessories">{t('categoryAccessories')}</option>
                <option value="Digital">{t('categoryDigital')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="listing-condition" className="font-semibold text-[var(--color-text-primary)] mb-1 block">Condition</label>
              <select
                id="listing-condition"
                value={condition}
                onChange={e => setCondition(e.target.value as any)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
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
              <label htmlFor="listing-price" className="font-semibold text-[var(--color-text-primary)] mb-1 block">Price ($ USD)</label>
              <input
                id="listing-price"
                type="number"
                required
                placeholder="150"
                value={price}
                onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="listing-trade-for" className="font-semibold text-[var(--color-text-primary)] mb-1 block">Looking to trade for...</label>
              <input
                id="listing-trade-for"
                type="text"
                placeholder="e.g. Nintendo Switch OLED or PS5 Digital"
                value={tradeOffersFor}
                onChange={e => setTradeOffersFor(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-secondary)]"
              />
            </div>
          )}

          {/* Item image — upload from device, or paste a link */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {isAr ? 'صورة المنتج (اختياري)' : 'Item Image (Optional)'}
            </label>

            {imageUrl ? (
              <div className="relative mb-2 rounded-xl overflow-hidden border border-[var(--color-border)]">
                <img src={imageUrl} alt="" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  aria-label={isAr ? 'إزالة' : 'Remove'}
                  className="absolute top-2 end-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileRef.current?.click()}
                  className="pressable w-full mb-2 py-2.5 px-3 rounded-xl border border-[var(--color-secondary)]/40 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--color-secondary)]/20 transition-all disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  <span>{isAr ? 'رفع صورة من جهازك' : 'Upload from device'}</span>
                </button>
                <input
                  id="listing-image-url"
                  type="url"
                  placeholder={isAr ? 'أو الصق رابط صورة https://...' : 'or paste an image link https://...'}
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="listing-description" className="font-semibold text-[var(--color-text-primary)] mb-1 block">Description</label>
            <textarea
              id="listing-description"
              rows={3}
              required
              placeholder="Item condition details, included accessories, or shipping info..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] shadow-lg shadow-[var(--color-primary)]/30 transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createListing')}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
