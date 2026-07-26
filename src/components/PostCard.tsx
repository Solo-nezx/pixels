import React, { useEffect, useState } from 'react';
import { Post, Game, Comment } from '../types';
import { subscribeComments } from '../services/socialData';
import { useApp } from '../context/AppContext';
import { Heart, MessageSquare, Repeat2, Share2, Star, Send, ShieldCheck, Eye, MoreHorizontal, Pencil, Trash2, Flag, Link as LinkIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ReportModal } from './ReportModal';
import { ShareModal } from './ShareModal';
import { GamePreviewModal } from './GamePreviewModal';
import { useLongPress } from '../hooks/useLongPress';

interface PostCardProps {
  post: Post;
}

/** Up to two initials for the avatar fallback, in either script. */
function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { 
    t, 
    toggleLikePost, 
    toggleRepost, 
    addComment, 
    setSelectedGameForDetail, 
    setViewingProfileUser,
    requireAuth,
    auth,
    editPost,
    deleteOwnPost,
    showToast,
    language
  } = useApp();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(post.content);
  const [isReporting, setIsReporting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isAr = language === 'ar';
  const isMine = !!auth.user && post.author?.id === auth.user.id;

  // Comments now live in a subcollection; older posts may still carry embedded
  // ones, so show both. Only subscribe while the section is open.
  const [liveComments, setLiveComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!showComments) return;
    const unsub = subscribeComments(post.id, setLiveComments);
    return () => unsub();
  }, [showComments, post.id]);

  const allComments: Comment[] = [...(post.comments || []), ...liveComments];

  /** Shareable deep link to this post (read on load by App). */
  const postUrl = `${window.location.origin}/?post=${encodeURIComponent(post.id)}`;

  const copyPostLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      showToast(isAr ? 'تم نسخ رابط المنشور.' : 'Post link copied.');
    } catch {
      showToast(isAr ? 'تعذّر النسخ — انسخ الرابط يدوياً.' : 'Copy failed — copy the link manually.');
    }
  };
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
        
        {/* Author avatar — Avatar renders initials while the image loads and
            if it fails, instead of swapping in an unrelated stock photo. */}
        <button
          onClick={() => requireAuth(() => setViewingProfileUser(post.author), t('navProfile'))}
          className="flex-shrink-0 relative group"
        >
          <Avatar className="w-10 h-10 border border-[var(--color-border)] group-hover:border-[var(--color-primary)] transition-all">
            <AvatarImage src={post.author.avatar} alt={post.author.name} referrerPolicy="no-referrer" />
            <AvatarFallback className="bg-[var(--color-elevated)] text-[var(--color-text-secondary)] text-xs font-bold">
              {initials(post.author.name)}
            </AvatarFallback>
          </Avatar>
          {post.author.verified && (
            <span className="absolute -bottom-1 -end-1 bg-[var(--color-primary)] text-white p-0.5 rounded-full">
              <ShieldCheck className="w-2.5 h-2.5" />
            </span>
          )}
        </button>

        {/* Post Content Body */}
        <div className="flex-1 min-w-0">
          
          {/* Post Header: Name, Handle, Time */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => requireAuth(() => setViewingProfileUser(post.author), t('navProfile'))}
                className="font-bold text-sm text-[var(--color-text-primary)] hover:underline truncate"
              >
                {post.author.name}
              </button>
              <span className="text-xs text-[var(--color-text-secondary)]">
                @{post.author.username}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">•</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{post.createdAt}</span>
              {post.editedAtTs && (
                <span className="text-[10px] text-[var(--color-text-secondary)] italic">
                  ({isAr ? 'معدّل' : 'edited'})
                </span>
              )}
            </div>

            {/* Post menu: author gets edit/delete, everyone else gets report.
                Radix handles what the hand-rolled panel didn't — closing on
                outside click and Escape, arrow-key navigation, and returning
                focus to the trigger. It also flips side automatically in RTL. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={isAr ? 'خيارات المنشور' : 'Post options'}
                className="pressable shrink-0 p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={copyPostLink}>
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{isAr ? 'نسخ الرابط' : 'Copy link'}</span>
                </DropdownMenuItem>

                {isMine ? (
                  <>
                    <DropdownMenuItem
                      onSelect={() => { setIsEditing(true); setEditDraft(post.content); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حذف' : 'Delete'}</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => requireAuth(() => setIsReporting(true), isAr ? 'الإبلاغ' : 'Report')}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إبلاغ' : 'Report'}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Post Body Text — inline editor for the author */}
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = editDraft.trim();
                if (next && next !== post.content) editPost(post.id, next);
                setIsEditing(false);
              }}
              className="mb-3 space-y-2"
            >
              <textarea
                rows={3}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                autoFocus
                className="w-full bg-[var(--color-bg)] border border-[var(--color-primary)] rounded-xl p-3 text-sm text-[var(--color-text-primary)] focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!editDraft.trim()}
                  className="pressable px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="pressable px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line mb-3">
              {post.content}
            </p>
          )}

          {/* Letterboxd Style Game Attachment Badge / Poster */}
          {post.game && (
            <div
              {...gameLongPressProps}
              title={language === 'ar' ? 'اضغط مطولاً للمعاينة السريعة' : 'Hold for quick preview'}
              className="group flex items-center gap-3 p-2.5 rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-bg)]/60 to-[var(--color-secondary)]/10 hover:border-[var(--color-primary)]/70 hover:shadow-[var(--glow-primary)] cursor-pointer transition-all mb-3 select-none touch-manipulation relative"
            >
              <img
                src={post.game.coverUrl}
                alt={post.game.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                }}
                className="w-12 h-16 object-cover rounded-lg shadow-lg ring-1 ring-white/10 flex-shrink-0 group-hover:scale-105 group-hover:ring-[var(--color-primary)]/40 transition-all"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] uppercase tracking-wider">
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
                  <span className="text-[10px] text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-3 h-3" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'معاينة' : 'Hold Preview'}</span>
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                  {post.game.title}
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {post.game.developer} ({post.game.releaseYear})
                </p>
              </div>
            </div>
          )}

          {/* Image Attachments Grid (Up to 4 images) */}
          {(post.images?.length || post.imageUrl) && (
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
              onClick={() => requireAuth(() => setShowComments(!showComments), t('comment'))}
              aria-label={t('comment')}
              aria-expanded={showComments}
              className="pressable icon-btn-inline flex items-center gap-1.5 hover:text-[var(--color-primary)] transition-colors group"
            >
              <div className="p-1.5 rounded-full group-hover:bg-[var(--color-primary)]/10">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-medium">{post.commentsCount}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => toggleRepost(post.id)}
              aria-label={language === 'ar' ? 'إعادة نشر' : 'Repost'}
              aria-pressed={post.isReposted}
              className={`pressable icon-btn-inline flex items-center gap-1.5 transition-colors group ${
                post.isReposted ? 'text-[var(--color-secondary)]' : 'hover:text-[var(--color-secondary)]'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-[var(--color-secondary)]/10">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span className="font-medium">{post.repostsCount}</span>
            </button>

            {/* Like */}
            <button
              onClick={() => toggleLikePost(post.id)}
              aria-label={language === 'ar' ? 'إعجاب' : 'Like'}
              aria-pressed={post.isLiked}
              className={`pressable icon-btn-inline flex items-center gap-1.5 transition-colors group ${
                post.isLiked ? 'text-[var(--color-like)]' : 'hover:text-[var(--color-like)]'
              }`}
            >
              <div className="p-1.5 rounded-full group-hover:bg-[var(--color-like)]/10">
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-[var(--color-like)] heart-pop' : ''}`} />
              </div>
              <span className="font-medium">{post.likesCount}</span>
            </button>

            {/* Share to external */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenShare}
                  aria-label={isAr ? 'مشاركة خارجية' : 'External Share'}
                  className="pressable icon-btn-inline p-1.5 rounded-full hover:bg-[var(--color-border)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{isAr ? 'مشاركة خارجية' : 'External share'}</TooltipContent>
            </Tooltip>

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
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="submit"
                  aria-label={t('comment')}
                  className="icon-btn-inline px-3 py-1.5 min-h-11 bg-[var(--color-primary)] text-white rounded-xl text-xs font-semibold hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-1"
                >
                  <Send className={`w-3 h-3 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
              </form>

              {/* Existing Comments (subcollection + any legacy embedded ones) */}
              {allComments.length > 0 ? (
                <div className="space-y-2">
                  {allComments.map(c => (
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

      {/* Report sheet */}
      {isReporting && (
        <ReportModal
          targetType="post"
          targetId={post.id}
          targetOwnerId={post.author?.id}
          targetPreview={post.content}
          onClose={() => setIsReporting(false)}
        />
      )}

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

      {/* Deleting a post is irreversible, so it gets a real confirmation step
          rather than window.confirm — which can't be translated or styled and
          is suppressible by the browser. */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'حذف هذا المنشور؟' : 'Delete this post?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? 'سيُحذف نهائياً مع تعليقاته وإعجاباته. لا يمكن التراجع.'
                : 'It will be removed permanently, along with its comments and likes. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOwnPost(post.id)}
              className="bg-[var(--color-like)] text-white hover:bg-[var(--color-like)]/90"
            >
              {isAr ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen attachment. As a Dialog it closes on Escape, traps focus
          and restores it afterwards — the plain overlay did none of that. */}
      <Dialog open={!!lightboxImg} onOpenChange={(open) => !open && setLightboxImg(null)}>
        <DialogContent
          showCloseButton
          className="max-w-4xl border-0 bg-transparent p-0 shadow-none sm:max-w-4xl"
        >
          <DialogTitle className="sr-only">
            {isAr ? 'عرض الصورة' : 'Image preview'}
          </DialogTitle>
          {lightboxImg && (
            <img
              src={lightboxImg}
              alt={isAr ? 'مرفق بالحجم الكامل' : 'Fullscreen attachment'}
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
};
