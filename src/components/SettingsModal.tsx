import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { sanitizeHandle } from '../utils/statUtils';
import {
  X, Settings as SettingsIcon, User as UserIcon, Palette, Languages,
  Lock, LogOut, Check, Sun, Moon, Loader2,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

/**
 * One place for the preferences that were previously scattered across the
 * sidebar (language, theme) or buried in the profile page (privacy), plus the
 * account name / handle.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    t, language, setLanguage, theme, setTheme, auth, updateProfile, showToast,
    isPrivacyPrivate, setIsPrivacyPrivate, logout,
  } = useApp();
  const isAr = language === 'ar';
  const me = auth.user;

  const [name, setName] = useState(me?.name || '');
  const [username, setUsername] = useState(me?.username || '');
  const [saving, setSaving] = useState(false);

  const nameError = name.trim().length === 0
    ? (isAr ? 'الاسم مطلوب.' : 'Name is required.')
    : name.trim().length > 40
      ? (isAr ? 'الاسم طويل جداً (40 حرفاً كحد أقصى).' : 'Name is too long (40 characters max).')
      : null;

  const handle = sanitizeHandle(username);
  const handleError = handle.length < 3
    ? (isAr ? 'المعرّف 3 أحرف على الأقل.' : 'Handle must be at least 3 characters.')
    : !/^[a-z0-9._]+$/.test(handle)
      ? (isAr ? 'حروف إنجليزية وأرقام و _ فقط.' : 'Letters, numbers, dots and underscores only.')
      : null;

  const dirty = me ? (name.trim() !== me.name || handle !== me.username) : false;

  const saveAccount = async () => {
    if (!me || nameError || handleError || !dirty) return;
    setSaving(true);
    updateProfile({ name: name.trim(), username: handle });
    showToast(isAr ? 'تم حفظ التغييرات.' : 'Changes saved.');
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-12 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-lg bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('settings')}
      >
        <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
          <SettingsIcon className="w-4 h-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-extrabold text-[var(--color-text-primary)]">{t('settings')}</h2>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="icon-btn ms-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Account: display name + handle */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              <UserIcon className="w-3.5 h-3.5" /> {t('accountSection')}
            </h3>

            {me ? (
              <div className="space-y-3 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)]">
                <label className="block">
                  <span className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1">
                    {t('displayName')}
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                  {nameError && <span className="block mt-1 text-[10px] text-rose-400">{nameError}</span>}
                </label>

                <label className="block">
                  <span className="block text-[11px] font-bold text-[var(--color-text-secondary)] mb-1">
                    {t('usernameHandle')}
                  </span>
                  <div className="flex items-center gap-1 px-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] focus-within:border-[var(--color-primary)]">
                    <span className="text-xs text-[var(--color-text-secondary)]">@</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={30}
                      dir="ltr"
                      className="flex-1 py-2 bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
                    />
                  </div>
                  {handleError
                    ? <span className="block mt-1 text-[10px] text-rose-400">{handleError}</span>
                    : handle !== username && (
                      <span className="block mt-1 text-[10px] text-[var(--color-text-secondary)]">
                        {isAr ? 'سيُحفظ كـ ' : 'Will be saved as '}<span dir="ltr">@{handle}</span>
                      </span>
                    )}
                </label>

                <button
                  onClick={saveAccount}
                  disabled={!dirty || !!nameError || !!handleError || saving}
                  className="pressable w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t('saveChanges')}
                </button>
              </div>
            ) : (
              <p className="p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                {isAr ? 'سجّل الدخول لتعديل حسابك.' : 'Sign in to edit your account.'}
              </p>
            )}
          </section>

          {/* Appearance */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              <Palette className="w-3.5 h-3.5" /> {t('appearanceSection')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'dark', label: t('themeDark'), icon: Moon },
                { key: 'light', label: t('themeLight'), icon: Sun },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  aria-pressed={theme === key}
                  className={`pressable flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    theme === key
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${key === 'dark' ? 'text-indigo-400' : 'text-amber-400'}`} />
                  {label}
                  {theme === key && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </section>

          {/* Language */}
          <section>
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              <Languages className="w-3.5 h-3.5" /> {t('language')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'ar', label: 'العربية' },
                { key: 'en', label: 'English' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setLanguage(key)}
                  aria-pressed={language === key}
                  className={`pressable flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    language === key
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {label}
                  {language === key && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </section>

          {/* Privacy — moved off the profile page so it lives with the rest */}
          {me && (
            <section>
              <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
                <Lock className="w-3.5 h-3.5" /> {t('privacySetting')}
              </h3>
              <label className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] cursor-pointer">
                <span className="text-xs text-[var(--color-text-primary)]">
                  {isAr ? 'ملف خاص — تُخفى إحصاءاتك وألعابك عن الآخرين.' : 'Private profile — hide your stats and games from others.'}
                </span>
                <span className="relative inline-flex items-center shrink-0">
                  <input
                    type="checkbox"
                    checked={isPrivacyPrivate}
                    onChange={(e) => setIsPrivacyPrivate(e.target.checked)}
                    aria-label={t('privacySetting')}
                    className="sr-only peer"
                  />
                  <span className="w-9 h-5 bg-[var(--color-border)] rounded-full peer peer-checked:bg-[var(--color-primary)] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full transition-colors" />
                </span>
              </label>
            </section>
          )}

          {/* Sign out */}
          {auth.isLoggedIn && (
            <button
              onClick={() => { logout(); onClose(); }}
              className="pressable w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-rose-400 hover:border-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('logout')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
