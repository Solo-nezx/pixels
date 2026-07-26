import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  subscribeReports, resolveReport, moderatorDeletePost, fetchPostById, deleteSeededContent,
  ReportRecord,
} from '../services/socialData';
import { Post } from '../types';
import { ShieldAlert, Trash2, Check, Loader2, Eye, Flag, Sparkles } from 'lucide-react';

const REASON_LABEL: Record<string, { en: string; ar: string }> = {
  spam: { en: 'Spam', ar: 'سبام' },
  harassment: { en: 'Harassment', ar: 'إساءة' },
  hate: { en: 'Hate speech', ar: 'كراهية' },
  nsfw: { en: 'Adult content', ar: 'محتوى غير لائق' },
  scam: { en: 'Scam', ar: 'احتيال' },
  other: { en: 'Other', ar: 'أخرى' },
};

/** Moderator queue: triage reports and remove offending posts. */
export const ModerationScreen: React.FC = () => {
  const { language, showToast, setViewingProfileUser } = useApp();
  const isAr = language === 'ar';

  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [preview, setPreview] = useState<Post | null>(null);

  useEffect(() => {
    const unsub = subscribeReports(setReports);
    return () => unsub();
  }, []);

  const visible = reports.filter((r) => (showResolved ? true : r.status !== 'resolved'));
  const openCount = reports.filter((r) => r.status !== 'resolved').length;

  const doResolve = async (r: ReportRecord) => {
    setBusyId(r.id);
    try {
      await resolveReport(r.id);
      showToast(isAr ? 'تم إغلاق البلاغ.' : 'Report resolved.');
    } catch (e) {
      console.error(e);
      showToast(isAr ? 'تعذّر إغلاق البلاغ.' : 'Could not resolve the report.');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async (r: ReportRecord) => {
    if (r.targetType !== 'post') return;
    if (!window.confirm(isAr ? 'حذف المحتوى المُبلَّغ عنه؟' : 'Delete the reported content?')) return;
    setBusyId(r.id);
    try {
      await moderatorDeletePost(r.targetId);
      await resolveReport(r.id);
      showToast(isAr ? 'تم حذف المحتوى وإغلاق البلاغ.' : 'Content deleted and report closed.');
    } catch (e) {
      console.error(e);
      showToast(isAr ? 'تعذّر الحذف.' : 'Could not delete.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="w-full pb-20">
      <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)] bg-[var(--color-card)]">
        <ShieldAlert className="w-4 h-4 text-rose-500" />
        <h1 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
          {isAr ? 'لوحة الإشراف' : 'Moderation'}
        </h1>
        {openCount > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
            {openCount}
          </span>
        )}
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="ms-auto text-[11px] font-bold text-[var(--color-primary)] hover:underline"
        >
          {showResolved
            ? (isAr ? 'المفتوحة فقط' : 'Open only')
            : (isAr ? 'إظهار المُغلقة' : 'Show resolved')}
        </button>
      </div>

      {/* Maintenance: clear the demo content that was seeded before launch */}
      <div className="m-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center gap-3">
        <Sparkles className="w-4 h-4 shrink-0 text-[var(--color-secondary)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-[var(--color-text-primary)]">
            {isAr ? 'إزالة المحتوى التجريبي' : 'Remove demo content'}
          </span>
          <span className="block text-[11px] text-[var(--color-text-secondary)]">
            {isAr
              ? 'يحذف المنشورات والمنتجات التي زُرعت قبل الإطلاق ولا مالك حقيقي لها.'
              : 'Deletes the pre-launch seeded posts and listings that have no real owner.'}
          </span>
        </span>
        <button
          onClick={async () => {
            if (!window.confirm(isAr ? 'حذف كل المحتوى التجريبي؟' : 'Delete all demo content?')) return;
            setCleaning(true);
            try {
              const { posts, listings } = await deleteSeededContent();
              showToast(isAr
                ? `تم حذف ${posts} منشوراً و${listings} منتجاً.`
                : `Deleted ${posts} posts and ${listings} listings.`);
            } catch (e) {
              console.error(e);
              showToast(isAr ? 'تعذّر الحذف.' : 'Cleanup failed.');
            } finally {
              setCleaning(false);
            }
          }}
          disabled={cleaning}
          className="pressable shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
        >
          {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {isAr ? 'حذف' : 'Clean up'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="p-10 text-center text-xs text-[var(--color-text-secondary)]">
          <Flag className="w-8 h-8 mx-auto mb-3 text-[var(--color-primary)]/40" />
          <p className="font-semibold text-[var(--color-text-primary)] mb-1">
            {isAr ? 'لا بلاغات' : 'No reports'}
          </p>
          <p>{isAr ? 'ستظهر بلاغات الأعضاء هنا.' : 'Member reports will appear here.'}</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {visible.map((r) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-[10px] font-black uppercase">
                  {isAr ? REASON_LABEL[r.reason]?.ar : REASON_LABEL[r.reason]?.en}
                </span>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                  {r.targetType}
                </span>
                {r.status === 'resolved' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-black">
                    {isAr ? 'مُغلق' : 'RESOLVED'}
                  </span>
                )}
                <span className="ms-auto text-[10px] text-[var(--color-text-secondary)]">
                  {new Date(r.createdAtTs).toLocaleString()}
                </span>
              </div>

              {r.targetPreview && (
                <p className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg)] rounded-xl p-2.5 border border-[var(--color-border)] line-clamp-3">
                  “{r.targetPreview}”
                </p>
              )}
              {r.details && (
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {isAr ? 'ملاحظة المُبلِّغ:' : 'Reporter note:'} {r.details}
                </p>
              )}

              {r.status !== 'resolved' && (
                <div className="flex items-center gap-2 pt-1">
                  {r.targetType === 'post' && (
                    <>
                      <button
                        onClick={async () => {
                          const p = await fetchPostById(r.targetId, null);
                          if (p) setPreview(p);
                          else showToast(isAr ? 'المحتوى محذوف مسبقاً.' : 'Content already deleted.');
                        }}
                        className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-primary)] hover:border-[var(--color-primary)]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isAr ? 'عرض' : 'View'}
                      </button>
                      <button
                        onClick={() => doDelete(r)}
                        disabled={busyId === r.id}
                        className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
                      >
                        {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {isAr ? 'حذف المحتوى' : 'Delete content'}
                      </button>
                    </>
                  )}
                  {r.targetOwnerId && (
                    <button
                      onClick={() => setViewingProfileUser({ id: r.targetOwnerId } as never)}
                      className="pressable px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      {isAr ? 'الملف' : 'Profile'}
                    </button>
                  )}
                  <button
                    onClick={() => doResolve(r)}
                    disabled={busyId === r.id}
                    className="pressable ms-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/50 text-emerald-400 text-xs font-bold hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isAr ? 'تجاهل' : 'Dismiss'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reported post preview */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-4 text-xs text-[var(--color-text-primary)] whitespace-pre-line"
          >
            <p className="font-bold mb-2">{preview.author?.name}</p>
            <p>{preview.content}</p>
            {preview.imageUrl && (
              <img src={preview.imageUrl} alt="" className="mt-3 w-full rounded-xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
