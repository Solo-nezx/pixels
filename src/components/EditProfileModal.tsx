import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, Save, ImageIcon, Loader2, Mail } from 'lucide-react';
import { compressImage, uploadErrorMessage } from '../lib/imageUpload';
import { auth as firebaseAuth, linkWithCredential, EmailAuthProvider } from '../lib/firebase';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { 
    t, 
    auth, 
    updateProfile,
    showToast,
    language 
  } = useApp();

  const currentUser = auth.user!;

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [banner, setBanner] = useState(currentUser.banner);

  const isAr = language === 'ar';
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  // --- Optional email + password for Steam accounts (recovery) ---
  const isSteamAccount = currentUser.provider === 'steam';
  const alreadyLinked = !!firebaseAuth.currentUser?.email;
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linking, setLinking] = useState(false);

  /**
   * A Steam sign-in carries no email, so the account can't be recovered if the
   * Steam login is lost. Linking email/password credentials fixes that without
   * changing the existing uid or any of their data.
   */
  const linkEmailToAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = firebaseAuth.currentUser;
    if (!user || !linkEmail.trim() || linkPassword.length < 6) return;
    setLinking(true);
    try {
      const credential = EmailAuthProvider.credential(linkEmail.trim(), linkPassword);
      await linkWithCredential(user, credential);
      showToast(isAr ? 'تم ربط البريد بحسابك.' : 'Email linked to your account.');
      setLinkEmail('');
      setLinkPassword('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      console.error('linkWithCredential failed:', err);
      showToast(
        code === 'auth/email-already-in-use'
          ? (isAr ? 'هذا البريد مستخدم في حساب آخر.' : 'That email is already used by another account.')
          : code === 'auth/weak-password'
          ? (isAr ? 'كلمة المرور ضعيفة (٦ أحرف على الأقل).' : 'Password too weak (6 characters minimum).')
          : (isAr ? 'تعذّر ربط البريد.' : 'Could not link the email.'),
      );
    } finally {
      setLinking(false);
    }
  };

  /** Compress a picked file and set it as the avatar or banner. */
  const pickImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'avatar' | 'banner',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind);
    try {
      const dataUrl = kind === 'avatar'
        ? await compressImage(file, { maxDim: 400, maxBytes: 45_000 })
        : await compressImage(file, { maxDim: 1200, maxBytes: 150_000 });
      if (kind === 'avatar') setAvatar(dataUrl); else setBanner(dataUrl);
      showToast(isAr ? 'تم تحديث الصورة' : 'Image updated');
    } catch (err) {
      console.error(`${kind} upload failed:`, err);
      showToast(uploadErrorMessage(err, isAr));
    } finally {
      setUploading(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // Persists to Firestore (and refreshes the search mirrors), where a plain
    // local login() left everyone else seeing the old profile.
    updateProfile({
      name: name.trim(),
      username: username.trim().replace(/^@+/, ''),
      bio: bio.trim(),
      avatar: avatar.trim(),
      banner: banner.trim(),
    });
    showToast(language === 'ar' ? 'تم تحديث الملف الشخصي!' : 'Profile updated!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('editProfile')}
          </h3>
          <button
            onClick={onClose}
            aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
            className="icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          
          {/* Display Name */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {t('displayName')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Username Handle */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {t('usernameHandle')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {t('bioText')}
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Steam accounts have no email — offer to link one for recovery */}
          {isSteamAccount && !alreadyLinked && (
            <div className="p-3 rounded-xl border border-[var(--color-secondary)]/40 bg-[var(--color-secondary)]/10 space-y-2">
              <p className="font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                {isAr ? 'أضف بريداً لاسترجاع الحساب (اختياري)' : 'Add an email to recover your account (optional)'}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                {isAr
                  ? 'دخولك عبر Steam فقط — لو فقدت حساب Steam ستفقد هذا الحساب. اربط بريداً وكلمة مرور لتستطيع الدخول بهما أيضاً.'
                  : 'You sign in with Steam only — losing that Steam account would lose this one. Link an email and password so you can sign in with those too.'}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  aria-label={t('emailPlaceholder')}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-secondary)]"
                />
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  aria-label={t('passwordPlaceholder')}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-secondary)]"
                />
              </div>
              <button
                type="button"
                onClick={linkEmailToAccount}
                disabled={linking || !linkEmail.trim() || linkPassword.length < 6}
                className="pressable w-full py-2 rounded-xl bg-[var(--color-secondary)] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {linking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isAr ? 'ربط البريد' : 'Link email'}
              </button>
            </div>
          )}

          {/* Avatar & Banner — upload from device, or paste a link */}
          <div className="space-y-3">
            {/* Banner preview + picker */}
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
                {isAr ? 'صورة الغلاف' : 'Banner'}
              </label>
              <div className="relative rounded-xl overflow-hidden border border-[var(--color-border)] mb-2">
                <img src={banner} alt="" className="w-full h-24 object-cover" referrerPolicy="no-referrer" />
                {/* Avatar overlaps the banner, like the profile screen */}
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute bottom-2 start-3 w-14 h-14 rounded-full object-cover border-2 border-[var(--color-card)] ring-2 ring-[var(--color-primary)]/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input ref={avatarFileRef} type="file" accept="image/*" onChange={(e) => pickImage(e, 'avatar')} className="hidden" />
                <input ref={bannerFileRef} type="file" accept="image/*" onChange={(e) => pickImage(e, 'banner')} className="hidden" />
                <button
                  type="button"
                  disabled={uploading !== null}
                  onClick={() => avatarFileRef.current?.click()}
                  className="pressable py-2 px-2 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--color-primary)]/20 transition-all disabled:opacity-50"
                >
                  {uploading === 'avatar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'رفع الصورة الشخصية' : 'Upload avatar'}</span>
                </button>
                <button
                  type="button"
                  disabled={uploading !== null}
                  onClick={() => bannerFileRef.current?.click()}
                  className="pressable py-2 px-2 rounded-xl border border-[var(--color-secondary)]/40 bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--color-secondary)]/20 transition-all disabled:opacity-50"
                >
                  {uploading === 'banner' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'رفع الغلاف' : 'Upload banner'}</span>
                </button>
              </div>
            </div>

            {/* Link fallbacks (hidden when the value is an uploaded data URL) */}
            <div className="grid grid-cols-2 gap-2">
              {!avatar.startsWith('data:') && (
                <div>
                  <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">{t('avatarUrl')}</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              )}
              {!banner.startsWith('data:') && (
                <div>
                  <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">{t('bannerUrl')}</label>
                  <input
                    type="url"
                    value={banner}
                    onChange={e => setBanner(e.target.value)}
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* The logged-games showcase lived here. Games are now managed on the
              profile page itself, where they are actually displayed. */}

          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] shadow-lg shadow-[var(--color-primary)]/30 transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{t('saveChanges')}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
