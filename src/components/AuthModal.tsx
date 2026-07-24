import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  doc, 
  getDoc, 
  setDoc, 
  db 
} from '../lib/firebase';
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { Turnstile } from './Turnstile';
import { verifyTurnstile } from '../services/discordAuth';
import { isTurnstileConfigured, isSteamConfigured } from '../lib/config';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const {
    t,
    closeGuestModal,
    guestModalReason,
    login,
    openOnboarding,
    language,
    theme,
    loginWithSteamProvider,
    isImportingSteam,
  } = useApp();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const needsHumanCheck = isTurnstileConfigured();

  /** Gate any sign-in method behind the Turnstile check when configured. */
  const ensureHuman = async (): Promise<boolean> => {
    if (!needsHumanCheck) return true;
    if (!turnstileToken) {
      setError(language === 'ar' ? 'يرجى إكمال فحص الحماية أولاً.' : 'Please complete the security check first.');
      return false;
    }
    const ok = await verifyTurnstile(turnstileToken);
    if (!ok) {
      setError(language === 'ar' ? 'فشل فحص الحماية. حاول مجدداً.' : 'Security check failed. Please try again.');
    }
    return ok;
  };

  const handleSteamLogin = async () => {
    setError(null);
    if (!(await ensureHuman())) return;
    try {
      setLoading(true);
      await loginWithSteamProvider();
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    if (!(await ensureHuman())) return;
    try {
      setLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      // Ensure user record exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      let loggedUser: User;
      if (!snap.exists()) {
        loggedUser = {
          id: user.uid,
          name: user.displayName || name || 'Pixel Gamer',
          username: user.email ? user.email.split('@')[0] : 'gamer_' + user.uid.substring(0, 5),
          avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
          banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
          bio: language === 'ar' ? 'عضو جديد في شبكة بيكسلز للألعاب' : 'New member of Pixels gaming network',
          verified: true,
          followersCount: 0,
          followingCount: 0,
          likesReceivedCount: 0,
          hoursPlayed: 0,
          gamesLoggedCount: 0,
          reviewsWrittenCount: 0,
        };
        await setDoc(userRef, loggedUser);
      } else {
        loggedUser = snap.data() as User;
      }

      login(loggedUser);
      closeGuestModal();
      if (isSignUp) {
        openOnboarding();
      } else {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(language === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول.' : 'Sign-in popup was closed.');
      } else {
        setError(language === 'ar' ? 'فشل تسجيل الدخول بواسطة جوجل.' : 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    if (!(await ensureHuman())) return;

    try {
      setLoading(true);

      if (isSignUp) {
        if (!name.trim()) {
          setError(language === 'ar' ? 'يرجى كتابة اسم المستخدم.' : 'Please enter your display name.');
          setLoading(false);
          return;
        }

        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;
        await updateProfile(user, { displayName: name });

        const newUser: User = {
          id: user.uid,
          name: name,
          username: email.split('@')[0],
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
          banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
          bio: language === 'ar' ? 'عضو جديد في شبكة بيكسلز للألعاب' : 'New member of Pixels gaming network',
          verified: false,
          followersCount: 0,
          followingCount: 0,
          likesReceivedCount: 0,
          hoursPlayed: 0,
          gamesLoggedCount: 0,
          reviewsWrittenCount: 0,
        };

        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, newUser);

        login(newUser);
        closeGuestModal();
        openOnboarding();
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        const user = res.user;

        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        let loggedUser: User;
        if (snap.exists()) {
          loggedUser = snap.data() as User;
        } else {
          loggedUser = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Gamer',
            username: user.email ? user.email.split('@')[0] : 'gamer',
            avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.uid)}`,
            banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',
            bio: language === 'ar' ? 'عضو في بيكسلز' : 'Pixels Gamer',
            verified: false,
            followersCount: 0,
            followingCount: 0,
            likesReceivedCount: 0,
            hoursPlayed: 0,
            gamesLoggedCount: 0,
            reviewsWrittenCount: 0,
          };
          await setDoc(userRef, loggedUser);
        }

        login(loggedUser);
        closeGuestModal();
        onSuccess();
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError(language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(language === 'ar' ? 'هذا البريد الإلكتروني مسجل بالفعل.' : 'Email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError(language === 'ar' ? 'كلمة المرور ضعيفة. يجب أن تتكون من ٦ أحرف على الأقل.' : 'Password should be at least 6 characters.');
      } else {
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول.' : 'Authentication error occurred.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6">
        
        {/* Close button */}
        <button
          onClick={closeGuestModal}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Branding & Reason */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#F43F5E] p-[2px] mx-auto mb-2 shadow-lg shadow-[#7C3AED]/30">
            <div className="w-full h-full bg-[#0E0F12] rounded-[14px] flex items-center justify-center font-mono font-bold text-white text-lg">
              PX
            </div>
          </div>
          <h2 className="text-lg font-black text-[var(--color-text-primary)]">
            {isSignUp ? (language === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account') : t('guestPromptTitle')}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
            {guestModalReason 
              ? `${language === 'ar' ? 'يلزم تسجيل الدخول من أجل' : 'Sign in required to'} ${guestModalReason}.` 
              : t('guestPromptSubtitle')
            }
          </p>
        </div>

        {/* Tab Toggle Login vs Sign Up */}
        <div className="grid grid-cols-2 p-1 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] mb-4">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              !isSignUp ? 'bg-[#7C3AED] text-white' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {t('login')}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              isSignUp ? 'bg-[#7C3AED] text-white' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {t('signup')}
          </button>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* OAuth Buttons (Google) */}
        <div className="space-y-2 mb-4">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-bold text-[var(--color-text-primary)] hover:border-[#7C3AED] hover:bg-[var(--color-card)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#7C3AED]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>{t('loginWithGoogle')}</span>
          </button>

          {/* Direct Steam sign-in (OpenID) — imports the library straight away */}
          {isSteamConfigured() && (
            <button
              type="button"
              disabled={loading}
              onClick={handleSteamLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1b2838] text-xs font-bold text-white hover:bg-[#2a3f5a] transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-[#66c0f4]/30"
            >
              {loading || isImportingSteam ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#66c0f4]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11.98 2C6.72 2 2.4 6.05 2.02 11.2l5.36 2.22a2.8 2.8 0 0 1 1.58-.49l2.39-3.46v-.05a3.74 3.74 0 1 1 3.74 3.74h-.09l-3.4 2.43a2.82 2.82 0 0 1-5.6.4L2.16 14.2A10 10 0 1 0 11.98 2zM8.5 17.17l-1.23-.51a2.11 2.11 0 0 0 3.9-.28 2.12 2.12 0 0 0-1.96-2.92c-.28 0-.55.06-.8.16l1.27.53a1.56 1.56 0 0 1-1.18 2.89v.13zm8.99-9.68a2.49 2.49 0 1 0-2.49 2.49 2.5 2.5 0 0 0 2.49-2.49zm-4.36 0a1.87 1.87 0 1 1 1.87 1.87 1.88 1.88 0 0 1-1.87-1.87z"/>
                </svg>
              )}
              <span>{t('loginWithSteam')}</span>
            </button>
          )}
        </div>

        {/* Cloudflare Turnstile bot-check (shown only when configured) */}
        <Turnstile
          theme={theme}
          onVerify={(token) => { setTurnstileToken(token); setError(null); }}
          onExpire={() => setTurnstileToken(null)}
        />

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-[var(--color-border)]"></div>
          <span className="flex-shrink mx-3 text-[10px] text-[var(--color-text-secondary)] uppercase font-bold">
            {language === 'ar' ? 'أو بالبريد الإلكتروني' : 'Or with Email'}
          </span>
          <div className="flex-grow border-t border-[var(--color-border)]"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3 text-xs mb-4">
          {isSignUp && (
            <div>
              <input
                type="text"
                required
                disabled={loading}
                placeholder={t('displayName')}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute top-2.5 left-3 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="email"
              required
              disabled={loading}
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
            />
          </div>

          <div className="relative">
            <Lock className="absolute top-2.5 left-3 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="password"
              required
              disabled={loading}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED] disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7C3AED] text-white font-bold rounded-xl hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/30 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSignUp ? t('signup') : t('login')}</span>
          </button>
        </form>

        {/* Continue as Guest button */}
        <button
          type="button"
          disabled={loading}
          onClick={closeGuestModal}
          className="w-full text-center text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1 font-semibold disabled:opacity-50"
        >
          {t('guestContinue')}
        </button>

      </div>
    </div>
  );
};

