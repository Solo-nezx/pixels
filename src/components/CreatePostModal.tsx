import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Send, Gamepad2, Star, Image as ImageIcon, Video, Plus, Link2, Trash2, Loader2, CloudUpload } from 'lucide-react';
import { uploadFileToFirebaseStorage } from '../lib/firebase';

interface CreatePostModalProps {
  onClose: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose }) => {
  const { t, addPost, language, allGames, showToast } = useApp();

  const [content, setContent] = useState('');
  const [attachGame, setAttachGame] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState(allGames[0]?.id || '');
  const [rating, setRating] = useState(5);

  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isAr = language === 'ar';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (videos.length > 0) {
      setVideos([]);
      showToast(isAr ? 'تم إلغاء الفيديوهات المرفقة وتفعيل الصور' : 'Switched from video to image mode');
    }

    if (images.length + files.length > 4) {
      showToast(isAr ? 'يمكن إضافة 4 صور كحد أقصى لكل منشور' : 'Maximum 4 images allowed per post');
    }

    const availableSlots = 4 - images.length;
    const filesToProcess = (Array.from(files) as File[]).slice(0, availableSlots);

    setIsUploading(true);
    try {
      for (const file of filesToProcess) {
        const uploadedUrl = await uploadFileToFirebaseStorage(file, 'posts/images');
        setImages(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, uploadedUrl];
        });
      }
      showToast(isAr ? 'تم رفع الصور إلى Firebase Storage بنجاح!' : 'Uploaded image(s) to Firebase Storage!');
    } catch (err) {
      console.error('Error uploading image:', err);
      showToast(isAr ? 'حدث خطأ أثناء رفع الصورة' : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length > 0) {
      setImages([]);
      showToast(isAr ? 'تم إلغاء الصور المرفقة وتفعيل الفيديوهات' : 'Switched from image to video mode');
    }

    if (videos.length + files.length > 4) {
      showToast(isAr ? 'يمكن إضافة 4 مقاطع فيديو كحد أقصى' : 'Maximum 4 videos allowed per post');
    }

    const availableSlots = 4 - videos.length;
    const filesToProcess = (Array.from(files) as File[]).slice(0, availableSlots);

    setIsUploading(true);
    try {
      for (const file of filesToProcess) {
        const uploadedUrl = await uploadFileToFirebaseStorage(file, 'posts/videos');
        setVideos(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, uploadedUrl];
        });
      }
      showToast(isAr ? 'تم رفع الفيديو إلى Firebase Storage بنجاح!' : 'Uploaded video(s) to Firebase Storage!');
    } catch (err) {
      console.error('Error uploading video:', err);
      showToast(isAr ? 'حدث خطأ أثناء رفع الفيديو' : 'Failed to upload video');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };


  const handleAddMediaUrl = () => {
    const url = urlInput.trim();
    if (!url) return;

    const isVideoUrl = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('video');

    if (isVideoUrl) {
      if (images.length > 0) setImages([]);
      if (videos.length >= 4) {
        showToast(isAr ? 'حد أقصى 4 مقاطع فيديو' : 'Maximum 4 videos allowed');
        return;
      }
      setVideos(prev => [...prev, url]);
    } else {
      if (videos.length > 0) setVideos([]);
      if (images.length >= 4) {
        showToast(isAr ? 'حد أقصى 4 صور' : 'Maximum 4 images allowed');
        return;
      }
      setImages(prev => [...prev, url]);
    }

    setUrlInput('');
    setShowUrlInput(false);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0 && videos.length === 0) return;

    const game = attachGame ? allGames.find(g => g.id === selectedGameId) : undefined;
    addPost(
      content.trim(),
      game,
      attachGame ? rating : undefined,
      images[0] || undefined,
      images.length > 0 ? images : undefined,
      videos.length > 0 ? videos : undefined
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <textarea
            rows={3}
            required={images.length === 0 && videos.length === 0}
            autoFocus
            placeholder={t('whatsPlaying')}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
          />

          {/* Media Attachments Preview Section */}
          {images.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-secondary)]">
                <span>{isAr ? `الصور المرفقة (${images.length}/4)` : `Attached Images (${images.length}/4)`}</span>
                <span className="text-[10px] text-[#F43F5E] flex items-center gap-1 font-normal">
                  <CloudUpload className="w-3 h-3" />
                  Firebase Storage
                </span>
              </div>
              <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[var(--color-border)] group bg-black">
                    <img src={img} alt="attachment" className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] text-[#F43F5E] flex items-center gap-0.5 font-mono">
                      <CloudUpload className="w-2.5 h-2.5" />
                      <span>Firebase</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-white hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-text-secondary)]">
                <span>{isAr ? `مقاطع الفيديو (${videos.length}/4)` : `Attached Videos (${videos.length}/4)`}</span>
                <span className="text-[10px] text-[#7C3AED] flex items-center gap-1 font-normal">
                  <CloudUpload className="w-3 h-3" />
                  Firebase Storage
                </span>
              </div>
              <div className={`grid gap-2 ${videos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {videos.map((vid, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-[var(--color-border)] bg-black">
                    <video src={vid} controls className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] text-[#7C3AED] flex items-center gap-0.5 font-mono">
                      <CloudUpload className="w-2.5 h-2.5" />
                      <span>Firebase</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideo(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-white hover:bg-red-500 transition-colors z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Upload Buttons Bar */}
          <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] space-y-2">
            <span className="font-semibold text-[11px] text-[var(--color-text-secondary)] block">
              {isAr ? 'إضافة وسائط إلى المنشور (حتى 4 صور أو 4 فيديوهات)' : 'Add media (up to 4 images OR 4 videos)'}
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Image Upload Button */}
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
                disabled={images.length >= 4 || videos.length > 0}
                onClick={() => imageInputRef.current?.click()}
                className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  images.length >= 4 || videos.length > 0
                    ? 'opacity-50 border-[var(--color-border)] text-gray-500 cursor-not-allowed'
                    : 'border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#F43F5E] hover:bg-[#F43F5E]/20'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>{isAr ? 'رفع صور' : 'Upload Images'}</span>
                {images.length > 0 && <span className="text-[10px] bg-[#F43F5E] text-black px-1.5 py-0.2 rounded-full font-black">{images.length}</span>}
              </button>

              {/* Video Upload Button */}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={videos.length >= 4 || images.length > 0}
                onClick={() => videoInputRef.current?.click()}
                className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  videos.length >= 4 || images.length > 0
                    ? 'opacity-50 border-[var(--color-border)] text-gray-500 cursor-not-allowed'
                    : 'border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED] hover:bg-[#7C3AED]/20'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>{isAr ? 'رفع فيديو' : 'Upload Videos'}</span>
                {videos.length > 0 && <span className="text-[10px] bg-[#7C3AED] text-white px-1.5 py-0.2 rounded-full font-black">{videos.length}</span>}
              </button>

              {/* URL Option Button */}
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                title={isAr ? 'إدخال رابط' : 'Paste URL'}
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* Optional URL input expansion */}
            {showUrlInput && (
              <div className="flex gap-2 pt-2 border-t border-[var(--color-border)] animate-fadeIn">
                <input
                  type="url"
                  placeholder={isAr ? 'أدخل رابط الصورة أو الفيديو...' : 'Paste image or video URL...'}
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="flex-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={handleAddMediaUrl}
                  className="px-3 py-1.5 bg-[#7C3AED] text-white font-bold rounded-lg text-xs hover:bg-[#6D28D9]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Toggle Tag Game */}
          <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[#7C3AED]" />
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {isAr ? 'ربط لعبة بالمنشور' : 'Tag a Game'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={attachGame}
                onChange={e => setAttachGame(e.target.checked)}
                className="w-4 h-4 accent-[#7C3AED]"
              />
            </div>

            {attachGame && (
              <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                <select
                  value={selectedGameId}
                  onChange={e => setSelectedGameId(e.target.value)}
                  className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-2 text-xs text-[var(--color-text-primary)]"
                >
                  {allGames.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {isAr ? 'التقييم:' : 'Star Rating:'}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 rounded ${rating >= star ? 'text-amber-400' : 'text-gray-500'}`}
                      >
                        <Star className={`w-4 h-4 ${rating >= star ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress Indicator */}
          {isUploading && (
            <div className="p-3 bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-xl flex items-center gap-2 text-[#7C3AED] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <div className="text-[11px] font-bold">
                {isAr ? 'جاري رفع الملفات إلى Firebase Storage...' : 'Uploading files to Firebase Storage...'}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className={`w-full py-3 bg-[#7C3AED] text-white font-bold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-1.5 ${
              isUploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#6D28D9] shadow-[#7C3AED]/30'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري الرفع...' : 'Uploading...'}</span>
              </>
            ) : (
              <>
                <Send className={`w-4 h-4 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                <span>{t('postButton')}</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};
