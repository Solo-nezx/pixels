import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Send, Star, Image as ImageIcon, Link2, Trash2, Loader2, Plus } from 'lucide-react';
import { compressImage, uploadErrorMessage, dataUrlBytes } from '../lib/imageUpload';
import { GamePicker } from './GamePicker';
import { Game } from '../types';

/** Keep every attachment set comfortably under Firestore's 1 MB document cap. */
const MAX_POST_IMAGE_BYTES = 100_000;
const MAX_TOTAL_ATTACHMENT_BYTES = 620_000;
const MAX_IMAGES = 4;

interface CreatePostModalProps {
  onClose: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
  const { t, addPost, language, showToast } = useApp();

  const [content, setContent] = useState('');
  const [taggedGame, setTaggedGame] = useState<Game | null>(null);
  const [rating, setRating] = useState(5);

  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const isAr = language === 'ar';
  const atLimit = images.length >= MAX_IMAGES;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      showToast(isAr ? `يمكن إضافة ${MAX_IMAGES} صور كحد أقصى` : `Maximum ${MAX_IMAGES} images per post`);
    }

    const filesToProcess = (Array.from(files) as File[]).slice(0, MAX_IMAGES - images.length);

    setIsUploading(true);
    try {
      const processed: string[] = [];
      let budget = MAX_TOTAL_ATTACHMENT_BYTES - images.reduce((n, img) => n + dataUrlBytes(img), 0);

      for (const file of filesToProcess) {
        const dataUrl = await compressImage(file, { maxDim: 900, maxBytes: MAX_POST_IMAGE_BYTES });
        const size = dataUrlBytes(dataUrl);
        if (size > budget) {
          showToast(isAr
            ? 'تم الوصول للحد الأقصى لحجم المرفقات — لم تُضف بقية الصور.'
            : 'Attachment size limit reached — remaining images were skipped.');
          break;
        }
        budget -= size;
        processed.push(dataUrl);
      }

      if (processed.length) {
        setImages(prev => [...prev, ...processed].slice(0, MAX_IMAGES));
      }
    } catch (err) {
      console.error('Error processing image:', err);
      showToast(uploadErrorMessage(err, isAr));
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (atLimit) {
      showToast(isAr ? `حد أقصى ${MAX_IMAGES} صور` : `Maximum ${MAX_IMAGES} images`);
      return;
    }
    setImages(prev => [...prev, url]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;

    addPost(
      content.trim(),
      taggedGame ?? undefined,
      taggedGame ? rating : undefined,
      images[0] || undefined,
      images.length > 0 ? images : undefined,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4 sticky top-0 bg-[var(--color-card)] z-10">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('createPost')}
          </h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Composer: textarea with an inline action toolbar */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] focus-within:border-[var(--color-primary)] transition-colors overflow-hidden">
            <textarea
              rows={4}
              required={images.length === 0}
              autoFocus
              placeholder={t('whatsPlaying')}
              aria-label={t('whatsPlaying')}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-transparent p-3 text-xs text-[var(--color-text-primary)] resize-none focus:outline-none"
            />

            {/* Attached image thumbnails */}
            {images.length > 0 && (
              <div className={`px-3 pb-2 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-[var(--color-border)] bg-black">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label={isAr ? 'إزالة الصورة' : 'Remove image'}
                      className="absolute top-1.5 end-1.5 p-1 rounded-full bg-black/75 text-white hover:bg-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline toolbar */}
            <div className="flex items-center gap-1 px-2 py-2 border-t border-[var(--color-border)]">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={atLimit || isUploading}
                onClick={() => imageInputRef.current?.click()}
                title={isAr ? 'إضافة صورة' : 'Add image'}
                aria-label={isAr ? 'إضافة صورة' : 'Add image'}
                className="pressable p-2 rounded-full text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isUploading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <ImageIcon className="w-4.5 h-4.5" />}
              </button>
              <button
                type="button"
                disabled={atLimit}
                onClick={() => setShowUrlInput(!showUrlInput)}
                title={isAr ? 'صورة برابط' : 'Image by link'}
                aria-label={isAr ? 'صورة برابط' : 'Image by link'}
                className="pressable p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Link2 className="w-4.5 h-4.5" />
              </button>

              <span className="ms-auto text-[10px] font-semibold text-[var(--color-text-secondary)] pe-1">
                {images.length}/{MAX_IMAGES}
              </span>
            </div>

            {/* Image link input */}
            {showUrlInput && (
              <div className="flex gap-2 px-2 pb-2 animate-fadeIn">
                <input
                  type="url"
                  placeholder={isAr ? 'الصق رابط صورة...' : 'Paste an image link...'}
                  aria-label={isAr ? 'رابط صورة' : 'Image link'}
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="flex-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  aria-label={isAr ? 'إضافة' : 'Add'}
                  className="pressable px-3 py-1.5 bg-[var(--color-primary)] text-white font-bold rounded-lg text-xs hover:bg-[var(--color-primary-hover)]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tag a game — type to search the full PC + console catalogue */}
          <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] space-y-2">
            <GamePicker
              value={taggedGame}
              onChange={setTaggedGame}
              label={isAr ? 'ربط لعبة بالمنشور' : 'Tag a Game'}
            />

            {/* Rating appears only once a game is chosen */}
            {taggedGame && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] animate-fadeIn">
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {isAr ? 'التقييم:' : 'Star Rating:'}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={isAr ? `تقييم ${star} نجوم` : `Rate ${star} star${star > 1 ? 's' : ''}`}
                      className={`pressable p-1 rounded ${rating >= star ? 'text-amber-400' : 'text-gray-500'}`}
                    >
                      <Star className={`w-4 h-4 ${rating >= star ? 'fill-amber-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className={`pressable w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-1.5 ${
              isUploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[var(--color-primary-hover)] shadow-[var(--color-primary)]/30'
            }`}
          >
            <Send className={`w-4 h-4 ${isAr ? 'scale-x-[-1]' : ''}`} />
            <span>{t('post')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
