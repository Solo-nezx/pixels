import React from 'react';
import { Post, Game } from '../types';
import { useApp } from '../context/AppContext';
import { X, Copy, Share2, Check, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: Post | null;
  game?: Game | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  post,
  game,
}) => {
  const { language, showToast } = useApp();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || (!post && !game)) return null;

  const isAr = language === 'ar';

  const shareTitle = post
    ? (isAr ? `منشور من ${post.author.name} على بيكسلز` : `Post by ${post.author.name} on Pixels`)
    : game
    ? (isAr ? `لعبة ${game.title} على بيكسلز` : `${game.title} on Pixels`)
    : 'Pixels Gamer Network';

  const shareText = post
    ? `"${post.content.slice(0, 100)}${post.content.length > 100 ? '...' : ''}"`
    : game
    ? (isAr ? `تفاصيل لعبة ${game.title} - المطور: ${game.developer}` : `Check out ${game.title} developed by ${game.developer}`)
    : 'Join the Pixels gamer community!';

  // Build from origin + path so an existing ?post= query can't be duplicated.
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const shareUrl = post
    ? `${baseUrl}?post=${encodeURIComponent(post.id)}`
    : game
    ? `${baseUrl}?game=${encodeURIComponent(game.id)}`
    : baseUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      showToast(isAr ? 'تم نسخ الرابط للحافظة بنجاح!' : 'Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(isAr ? 'تعذر نسخ الرابط' : 'Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        showToast(isAr ? 'تمت المشاركة!' : 'Shared successfully!');
        onClose();
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  const socialPlatforms = [
    {
      name: 'WhatsApp',
      color: 'bg-[#25D366] hover:bg-[#20bd5a] text-white',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.012 2c-5.508 0-9.989 4.481-9.989 9.989 0 1.964.57 3.863 1.642 5.485l-1.665 6.086 6.275-1.645c1.554.908 3.328 1.411 5.137 1.411 5.508 0 9.989-4.48 9.989-9.989 0-5.508-4.481-9.987-9.989-9.987zm0 18.281c-1.637 0-3.238-.445-4.632-1.288l-.333-.2-.372.1-.3.08-2.613.685.697-2.546.08-.293.093-.365-.213-.339c-.931-1.479-1.424-3.181-1.424-4.928 0-4.57 3.719-8.289 8.289-8.289s8.289 3.719 8.289 8.289c0 4.57-3.719 8.285-8.289 8.285zm4.544-6.207c-.249-.125-1.472-.726-1.7-.809-.228-.083-.395-.125-.561.125-.166.249-.645.809-.79 0.975-.145.166-.291.187-.54.062s-1.05-.387-2.001-1.234c-.74-.66-1.24-1.475-1.385-1.724-.145-.249-.015-.384.11-.508.112-.112.249-.291.374-.436.125-.145.166-.249.249-.415.083-.166.042-.312-.021-.436-.062-.125-.561-1.35-.769-1.849-.203-.488-.41-.422-.561-.428l-.478-.008c-.166 0-.436.062-.664.312-.228.249-.872.852-.872 2.078 0 1.226.893 2.41 1.018 2.576.125.166 1.758 2.685 4.26 3.765.595.257 1.06.41 1.423.525.598.19 1.142.163 1.572.099.48-.071 1.472-.602 1.679-1.183.208-.581.208-1.08.145-1.183-.062-.104-.228-.166-.478-.291z" />
        </svg>
      ),
      getUrl: () => `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`,
    },
    {
      name: 'X (Twitter)',
      color: 'bg-black hover:bg-neutral-800 text-white border border-neutral-700',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Telegram',
      color: 'bg-[#229ED9] hover:bg-[#1f8ec4] text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Reddit',
      color: 'bg-[#FF4500] hover:bg-[#e03d00] text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.04 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.045l2.901.609c.19-.383.585-.64 1.041-.64z" />
        </svg>
      ),
      getUrl: () => `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--color-card)] rounded-t-3xl sm:rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden p-5 z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                {isAr ? 'مشاركة خارجية' : 'External Share'}
              </h3>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                {isAr ? 'شارك مع أصدقائك عبر المنصات المختلفة' : 'Share with friends across social platforms'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Snippet Preview */}
        <div className="p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs space-y-2">
          {post && (
            <div className="flex gap-2.5 items-center">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[var(--color-text-primary)] block truncate">{post.author.name}</span>
                <p className="text-[var(--color-text-secondary)] line-clamp-2 italic">{post.content}</p>
              </div>
            </div>
          )}
          {game && (
            <div className="flex gap-2.5 items-center">
              <img
                src={game.coverUrl}
                alt={game.title}
                className="w-10 h-12 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[var(--color-text-primary)] block truncate">{game.title}</span>
                <p className="text-[var(--color-text-secondary)]">{game.developer} ({game.releaseYear})</p>
              </div>
            </div>
          )}
        </div>

        {/* Social Platforms Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {socialPlatforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.getUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${platform.color}`}
            >
              {platform.icon}
              <span>{platform.name}</span>
            </a>
          ))}
        </div>

        {/* Native Share & Copy Link Action Bar */}
        <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-hover)] transition-all shadow-md shadow-[var(--color-primary)]/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isAr ? 'مشاركة عبر تطبيقات الجهاز' : 'Share via System Apps'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                : 'border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'تم نسخ الرابط!' : 'Link Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span>{isAr ? 'نسخ رابط المشاركة' : 'Copy Share Link'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
