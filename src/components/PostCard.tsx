import React, { useState } from 'react';
import { Post, Game } from '../types';
import { useApp } from '../context/AppContext';
import { Heart, MessageSquare, Repeat2, Share2, Star, Send, ShieldCheck, Eye } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { GamePreviewModal } from './GamePreviewModal';
import { useLongPress } from '../hooks/useLongPress';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { 
    t, 
    toggleLikePost, 
    toggleRepost, 
    addComment, 
    setSelectedGameForDetail, 
    setViewingProfileUser,
    language
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(post.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleOpenShare = () => {
    setIsShareModalOpen(true);
  };

  const gameLongPressProps = useLongPress({
    onLongPress: () => {
      if (post.game) setPreviewGame(post.game);
    },
    onClick: () => {
      if (post.game) setSelectedGameForDetail(post.game);
    }
  });

  return (
    <article className="border-b border-[var(--color-border)] p-4 bg-[var(--color-card)] hover:bg-[var(--color-card)]/80 transition-colors">
      <div className="flex items-start gap-3">
        
        {/* Author Avatar */}
        <button 
          onClick={() => setViewingProfileUser(post.author)}
          className="flex-shrink-0 relative group"
        >
          <img
            src={post.author.avatar}
            alt={post.author.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
            }}
            className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)] group-hover:border-[#7C5CFF] transition-all"
          />
          {post.author.verified && (
            <span className="absolute -bottom-1 -right-1 bg-[#7C5CFF] text-white p-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5" />
            </span>
          )}
        </button>

        {/* Post Content Body */}
        <div className="flex-1 min-w-0">
          
          {/* Post Header: Name, Handle, Time */}
          <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => setViewingProfileUser(post.author)}
                className="font-bold text-sm text-[var(--color-text-primary)] hover:underline truncate"
              >
                {post.author.name}
              </button>
              <span className="text-xs text-[var(--color-text-secondary)]">
                @{post.author.username}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">•</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{post.createdAt}</span>
            </div>
          </div>

          {/* Post Body Text */}
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line mb-3">
            {post.content}
          </p>

          {/* Letterboxd Style Game Attachment Badge / Poster */}
          {post.game && (
            <div 
              {...gameLongPressProps}
              title={language === 'ar' ? 'اضغط مطولاً للمعاينة السريعة' : 'Hold for quick preview'}
              className="group flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/70 hover:border-[#7C5CFF]/60 cursor-pointer transition-all mb-3 select-none touch-manipulation relative"
            >
              <img
                src={post.game.coverUrl}
                alt={post.game.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                }}
                className="w-12 h-16 object-cover rounded-lg shadow-md border border-white/10 flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#7C5CFF]/10 text-[#7C5CFF] uppercase tracking-wider">
                      Game
                    </span>
                    {post.rating && (
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{post.rating}{t('ratingOver5')}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Preview Hint Eye */}
                  <span className="text-[10px] text-[var(--color-text-secondary)] group-hover:text-[#7C5CFF] flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'معاينة' : 'Hold Preview'}</span>
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[var(--color-text-primary)] truncate group-hover:text-[#7C5CFF] transition-colors">
                  {post.game.title}
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {post.game.developer} ({post.game.releaseYear})
                </p>
              </div>
            </div>
          )}

          {/* Video Attachments (Up to 4 videos) */}
          {post.videos && post.videos.length > 0 && (
            <div className="mb-3">
              {post.videos.length === 1 ? (
                <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-black max-h-[400px]">
                  <video src={post.videos[0]} controls className="w-full max-h-[400px] object-contain bg-black" />
                </div>
              ) : (
                <div className={`grid gap-1.5 rounded-2xl overflow-hidden border border-[var(--color-border)] bg-black p-1 ${post.videos.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {post.videos.slice(0, 4).map((vid, idx) => (
                    <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-black">
                      <video src={vid} controls className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Image Attachments Grid (Up to 4 images) */}
          {(!post.videos || post.videos.length === 0) && (post.images?.length || post.imageUrl) && (
            (() => {
              const allImgs = post.images && post.images.length > 0 ? post.images : (post.imageUrl ? [post.imageUrl] : []);
              if (allImgs.length === 0) return null;

              if (allImgs.length === 1) {
                return (
                  <div className="mb-3 rounded-2xl overflow-hidden border border-[var(--color-border)] max-h-96 bg-black">
                    <img
                      src={allImgs[0]}
                      alt="Attachment"
                      onClick={() => setLightboxImg(allImgs[0])}
                      className="w-full h-full object-cover hover:scale-102 transition-transform cursor-pointer"
                    />
                  </div>
                );
              }

              if (allImgs.length === 2) {
                return (
                  <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-[var(--color-border)] aspect-[16/9] bg-black">
                    {allImgs.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Attachment"
                        onClick={() => setLightboxImg(img)}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </div>
                );
              }

              if (allImgs.length === 3) {
                return (
                  <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-[var(--color-border)] aspect-[16/9] bg-black">
                    <img
                      src={allImgs[0]}
                      alt="Attachment"
                      onClick={() => setLightboxImg(allImgs[0])}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity row-span-2"
                    />
                    <img
                      src={allImgs[1]}
                      alt="Attachment"
                      onClick={() => setLightboxImg(allImgs[1])}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                    <img
                      src={allImgs[2]}
                      alt="Attachment"
                      onClick={() => setLightboxImg(allImgs[2])}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </div>
                );
              }

              return (
                <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-2xl overflow-hidden border border-[var(--color-border)] aspect-[16/9] bg-black">
                  {allImgs.slice(0, 4).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Attachment"
                      onClick={() => setLightboxImg(img)}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              );
            })()
          )}

          {/* Post Actions Bar */}
          <div className="flex items-center justify-between text-[var(--color-text-secondary)] pt-1 text-xs">
            
            {/* Comment */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 hover:text-[#7C5CFF] transition-colors group"
            >
              <div className="p-1.5 rounded-full group-hover:bg-[#7C5CFF]/10">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-medium">{post.commentsCount}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => toggleRepost(post.id)}
              className={`flex items-center gap-1.5 transition-colors group ${
                post.isReposted ? 'text-[#2DD4BF]' : 'hover:text-[#2DD4BF]'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-[#2DD4BF]/10">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span className="font-medium">{post.repostsCount}</span>
            </button>

            {/* Like */}
            <button
              onClick={() => toggleLikePost(post.id)}
              className={`flex items-center gap-1.5 transition-colors group ${
                post.isLiked ? 'text-[#FF5D8F]' : 'hover:text-[#FF5D8F]'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-[#FF5D8F]/10">
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-[#FF5D8F]' : ''}`} />
              </div>
              <span className="font-medium">{post.likesCount}</span>
            </button>

            {/* Share to external */}
            <button
              onClick={handleOpenShare}
              title={language === 'ar' ? 'مشاركة خارجية' : 'External Share'}
              className="p-1.5 rounded-full hover:bg-[var(--color-border)] hover:text-[#7C5CFF] transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>

          </div>

          {/* Expanded Comments Section */}
          {showComments && (
            <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-3">
              {/* Comment Input */}
              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('comment') + '...'}
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C5CFF]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#7C5CFF] text-white rounded-xl text-xs font-semibold hover:bg-[#6D4CFF] transition-colors flex items-center gap-1"
                >
                  <Send className={`w-3 h-3 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
              </form>

              {/* Existing Comments */}
              {post.comments && post.comments.length > 0 ? (
                <div className="space-y-2">
                  {post.comments.map(c => (
                    <div key={c.id} className="p-2 rounded-xl bg-[var(--color-bg)] flex gap-2 text-xs">
                      <img
                        src={c.author.avatar}
                        alt={c.author.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';
                        }}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[var(--color-text-primary)]">{c.author.name}</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)]">{c.createdAt}</span>
                        </div>
                        <p className="text-[var(--color-text-primary)]">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--color-text-secondary)] text-center py-1">
                  {language === 'ar' ? 'لا توجد تعليقات بعد. كُن أول المعلقين!' : 'No comments yet. Be the first to comment!'}
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* External Share Sheet Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
      />

      {/* Game Long Press Quick Preview Modal */}
      <GamePreviewModal
        isOpen={!!previewGame}
        game={previewGame}
        onClose={() => setPreviewGame(null)}
        onOpenFullDetail={(g) => {
          setSelectedGameForDetail(g);
        }}
      />

      {/* Image Fullscreen Lightbox Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={lightboxImg}
              alt="Fullscreen attachment"
              className="w-full h-full object-contain max-h-[85vh] rounded-xl"
            />
          </div>
        </div>
      )}
    </article>
  );
};
