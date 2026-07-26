import React, { useState } from 'react';
import { MarketplaceListing } from '../types';
import { useApp } from '../context/AppContext';
import { X, MessageSquare, ArrowLeftRight, ShieldCheck, Star, Send } from 'lucide-react';

interface MarketplaceDetailModalProps {
  listing: MarketplaceListing;
  onClose: () => void;
}

export const MarketplaceDetailModal: React.FC<MarketplaceDetailModalProps> = ({ listing, onClose }) => {
  const { t, requireAuth, language, setViewingProfileUser, showToast } = useApp();
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [tradeOfferText, setTradeOfferText] = useState('');
  const [showTradeForm, setShowTradeForm] = useState(false);

  const handleMessageSeller = () => {
    requireAuth(() => {
      showToast(t('successMessage'));
      onClose();
    }, t('messageSeller'));
  };

  const handleSendTradeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeOfferText.trim()) return;
    requireAuth(() => {
      showToast(t('successTrade'));
      setShowTradeForm(false);
      onClose();
    }, t('proposeTrade'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
          className="absolute top-4 right-4 icon-btn !rounded-full bg-[var(--color-bg)] z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery Image */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 mb-3 border border-[var(--color-border)]">
          <img
            src={listing.images[selectedImgIdx] || listing.images[0]}
            alt={listing.title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
              listing.type === 'trade' ? 'bg-[var(--color-secondary)] text-slate-950' : 'bg-[var(--color-primary)] text-white'
            }`}>
              {listing.type === 'trade' ? t('tradeBadge') : `$${listing.price}`}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-black/75 text-white backdrop-blur-md">
              {listing.condition}
            </span>
          </div>
        </div>

        {/* Image Thumbnails if multiple */}
        {listing.images.length > 1 && (
          <div className="flex gap-2 mb-4">
            {listing.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImgIdx(idx)}
                aria-label={`${listing.title} ${idx + 1}`}
                aria-current={selectedImgIdx === idx}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImgIdx === idx ? 'border-[var(--color-primary)] scale-105' : 'border-transparent opacity-70'
                }`}
              >
                <img
                  src={img}
                  alt="thumb"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Listing Title & Category */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--color-secondary)] font-semibold uppercase tracking-wider">
              {listing.category}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">•</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{listing.createdAt}</span>
          </div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-snug">
            {listing.title}
          </h2>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4 whitespace-pre-line">
          {listing.description}
        </p>

        {/* Trade Requirements if trade listing */}
        {listing.type === 'trade' && listing.tradeOffersFor && (
          <div className="p-3 rounded-xl bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/20 mb-4 text-xs">
            <p className="font-bold text-[var(--color-secondary)] mb-0.5">{t('lookingForTrade')}:</p>
            <p className="text-[var(--color-text-primary)]">{listing.tradeOffersFor}</p>
          </div>
        )}

        {/* Seller Info snippet */}
        <div 
          onClick={() => {
            setViewingProfileUser(listing.seller);
            onClose();
          }}
          className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:border-[var(--color-primary)] transition-all mb-5"
        >
          <div className="flex items-center gap-3">
            <img
              src={listing.seller.avatar}
              alt={listing.seller.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
              }}
              className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)]"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-[var(--color-text-primary)]">{listing.seller.name}</span>
                {listing.seller.verified && <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
              </div>
              <p className="text-[11px] text-[var(--color-text-secondary)]">@{listing.seller.username}</p>
            </div>
          </div>
          <div className="text-end">
            <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>4.9</span>
            </div>
            <span className="text-[10px] text-[var(--color-text-secondary)]">Verified Gamer</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleMessageSeller}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs hover:bg-[var(--color-primary-hover)] shadow-md shadow-[var(--color-primary)]/30 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('messageSeller')}</span>
            </button>

            <button
              onClick={() => setShowTradeForm(!showTradeForm)}
              aria-expanded={showTradeForm}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--color-secondary)] text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10 font-bold text-xs transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{t('proposeTrade')}</span>
            </button>
          </div>

          {/* Trade Form dropdown */}
          {showTradeForm && (
            <form onSubmit={handleSendTradeOffer} className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2 text-xs">
              <label className="font-semibold text-[var(--color-text-primary)] block">
                {t('proposeTrade')}
              </label>
              <textarea
                rows={2}
                placeholder={language === 'ar' ? 'اشرح الممرض الخاص بك (مثلاً: أقدم لابتوب جيمنج + مبلغ فرقي)...' : 'Describe your trade offer (e.g. I offer a DualSense + $30)...'}
                value={tradeOfferText}
                onChange={e => setTradeOfferText(e.target.value)}
                className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-secondary)]"
              />
              <button
                type="submit"
                className="w-full py-2 bg-[var(--color-secondary)] text-slate-950 font-extrabold rounded-lg hover:bg-[var(--color-secondary)]/90 transition-colors flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('proposeTrade')}</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
