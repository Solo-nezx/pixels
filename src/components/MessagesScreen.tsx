import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { subscribeMessages, markConversationRead } from '../services/messaging';
import { Message } from '../types';
import { MessageSquare, Send, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

/** Relative timestamp that stays readable in both languages. */
function timeAgo(ts: number, isAr: boolean): string {
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 60) return isAr ? 'الآن' : 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return isAr ? `${mins} د` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isAr ? `${hrs} س` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return isAr ? `${days} ي` : `${days}d`;
}

export const MessagesScreen: React.FC = () => {
  const {
    auth, language, conversations, activeConversationId,
    openConversationWith, closeConversation, sendMessageTo, setViewingProfileUser, messagingError,
  } = useApp();

  const isAr = language === 'ar';
  const myId = auth.user?.id ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Live messages for the open thread.
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(activeConversationId, setMessages);
    if (myId) markConversationRead(activeConversationId, myId);
    return () => unsub();
  }, [activeConversationId, myId]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const activeConvo = conversations.find((c) => c.id === activeConversationId);
  const other = activeConvo
    ? activeConvo.participants.filter((p) => p !== myId).map((p) => activeConvo.participantsMeta?.[p]).find(Boolean)
    : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConversationId) return;
    sendMessageTo(activeConversationId, text);
    setDraft('');
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full pb-20 md:pb-0">
      {/* ---------- Thread view ---------- */}
      {activeConversationId ? (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
          {/* Thread header */}
          <div className="flex items-center gap-3 p-3 border-b border-[var(--color-border)] bg-[var(--color-card)]">
            <button
              onClick={closeConversation}
              aria-label={isAr ? 'رجوع' : 'Back'}
              className="pressable p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors"
            >
              <BackIcon className="w-4 h-4" />
            </button>
            {other && (
              <button
                onClick={() => setViewingProfileUser({ ...other } as never)}
                className="flex items-center gap-2.5 min-w-0 text-start"
              >
                <img
                  src={other.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[var(--color-text-primary)] truncate">{other.name}</span>
                  <span className="block text-[11px] text-[var(--color-text-secondary)] truncate">@{other.username}</span>
                </span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-xs text-[var(--color-text-secondary)] py-8">
                {isAr ? 'ابدأ المحادثة بأول رسالة 👋' : 'Say hello to start the conversation 👋'}
              </p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                      mine
                        ? 'bg-[var(--color-primary)] text-white rounded-ee-md'
                        : 'bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-es-md'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    <span className={`block mt-1 text-[9px] ${mine ? 'text-white/70' : 'text-[var(--color-text-secondary)]'}`}>
                      {timeAgo(m.createdAtTs, isAr)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <form onSubmit={submit} className="flex items-center gap-2 p-3 border-t border-[var(--color-border)] bg-[var(--color-card)]">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={isAr ? 'اكتب رسالة...' : 'Write a message…'}
              aria-label={isAr ? 'اكتب رسالة' : 'Write a message'}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-full px-4 py-2.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label={isAr ? 'إرسال' : 'Send'}
              className="pressable p-2.5 rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40"
            >
              <Send className={`w-4 h-4 ${isAr ? 'scale-x-[-1]' : ''}`} />
            </button>
          </form>
        </div>
      ) : (
        /* ---------- Conversation list ---------- */
        <>
          <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)] bg-[var(--color-card)]">
            <MessageSquare className="w-4 h-4 text-[var(--color-primary)]" />
            <h1 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
              {isAr ? 'الرسائل' : 'Messages'}
            </h1>
          </div>

          {messagingError ? (
            /* An empty list and a broken query look identical otherwise. */
            <div className="m-4 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-xs">
              <p className="flex items-center gap-2 font-bold text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                {isAr ? 'تعذّر تحميل المحادثات' : "Couldn't load conversations"}
              </p>
              <p className="text-[var(--color-text-secondary)]">
                {messagingError === 'index-missing'
                  ? (isAr
                    ? 'قاعدة البيانات تبني الفهرس المطلوب الآن — أعد المحاولة بعد دقيقة.'
                    : 'The database is still building the required index — try again in a minute.')
                  : messagingError === 'permission-denied'
                  ? (isAr ? 'لا تملك صلاحية القراءة. تحقّق من قواعد الأمان.' : 'Read permission denied. Check the security rules.')
                  : messagingError === 'offline'
                  ? (isAr ? 'لا يوجد اتصال بالإنترنت.' : 'You appear to be offline.')
                  : (isAr ? 'خطأ غير متوقع — التفاصيل في وحدة التحكم.' : 'Unexpected error — details are in the console.')}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="pressable mt-2 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-bold"
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center text-xs text-[var(--color-text-secondary)]">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 text-[var(--color-primary)]/40" />
              <p className="mb-1 font-semibold text-[var(--color-text-primary)]">
                {isAr ? 'لا توجد محادثات بعد' : 'No conversations yet'}
              </p>
              <p>
                {isAr
                  ? 'افتح ملف أي لاعب واضغط «رسالة» لبدء محادثة.'
                  : 'Open any gamer’s profile and tap “Message” to start chatting.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {conversations.map((c) => {
                const otherId = c.participants.find((p) => p !== myId);
                const meta = otherId ? c.participantsMeta?.[otherId] : undefined;
                const unread = c.unread?.[myId] ?? 0;
                if (!meta) return null;
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversationWith(meta)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-[var(--color-card)] transition-colors text-start"
                  >
                    <img
                      src={meta.avatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{meta.name}</span>
                        {c.lastMessage && (
                          <span className="ms-auto text-[10px] text-[var(--color-text-secondary)] shrink-0">
                            {timeAgo(c.lastMessage.createdAtTs, isAr)}
                          </span>
                        )}
                      </span>
                      <span className={`block text-[11px] truncate mt-0.5 ${
                        unread > 0 ? 'text-[var(--color-text-primary)] font-semibold' : 'text-[var(--color-text-secondary)]'
                      }`}>
                        {c.lastMessage
                          ? `${c.lastMessage.senderId === myId ? (isAr ? 'أنت: ' : 'You: ') : ''}${c.lastMessage.text}`
                          : (isAr ? 'لا رسائل بعد' : 'No messages yet')}
                      </span>
                    </span>
                    {unread > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
