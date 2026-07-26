import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { submitReport, ReportReason, ReportTargetType } from '../services/socialData';
import { X, Flag, Loader2 } from 'lucide-react';

interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  targetPreview?: string;
  onClose: () => void;
}

const REASONS: ReportReason[] = ['spam', 'harassment', 'hate', 'nsfw', 'scam', 'other'];

const LABELS: Record<ReportReason, { en: string; ar: string }> = {
  spam: { en: 'Spam or misleading', ar: 'رسائل مزعجة أو مضلّلة' },
  harassment: { en: 'Harassment or bullying', ar: 'إساءة أو تنمّر' },
  hate: { en: 'Hate speech', ar: 'خطاب كراهية' },
  nsfw: { en: 'Adult or graphic content', ar: 'محتوى غير لائق' },
  scam: { en: 'Scam or fraud', ar: 'احتيال أو نصب' },
  other: { en: 'Something else', ar: 'سبب آخر' },
};

/** Lets a member report a post, listing or profile for review. */
export const ReportModal: React.FC<ReportModalProps> = ({
  targetType, targetId, targetOwnerId, targetPreview, onClose,
}) => {
  const { language, auth, showToast } = useApp();
  const isAr = language === 'ar';

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !auth.user) return;
    setSending(true);
    try {
      await submitReport({
        targetType,
        targetId,
        targetOwnerId,
        targetPreview: targetPreview?.slice(0, 200),
        reason,
        details: details.trim() || undefined,
        reporterId: auth.user.id,
      });
      showToast(isAr ? 'تم إرسال البلاغ. شكراً لك.' : 'Report sent. Thank you.');
      onClose();
    } catch (err) {
      console.error('submitReport failed:', err);
      showToast(isAr ? 'تعذّر إرسال البلاغ.' : 'Could not send the report.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
            <Flag className="w-4 h-4 text-rose-500" />
            {isAr ? 'إبلاغ' : 'Report'}
          </h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 text-xs">
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            {isAr
              ? 'اختر سبب البلاغ. ستُراجع البلاغات ولن يعرف الطرف الآخر من أبلغ.'
              : 'Pick a reason. Reports are reviewed and the other person won’t know who reported them.'}
          </p>

          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  reason === r
                    ? 'border-rose-500 bg-rose-500/10 text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-rose-500/50'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-rose-500"
                />
                <span className="font-semibold">{isAr ? LABELS[r].ar : LABELS[r].en}</span>
              </label>
            ))}
          </div>

          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={isAr ? 'تفاصيل إضافية (اختياري)...' : 'Anything else we should know? (optional)'}
            aria-label={isAr ? 'تفاصيل إضافية' : 'Additional details'}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-rose-500 resize-none"
          />

          <button
            type="submit"
            disabled={!reason || sending}
            className="pressable w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isAr ? 'إرسال البلاغ' : 'Submit report'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
