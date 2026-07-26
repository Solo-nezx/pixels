import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setFade(true);
    }, 1200);

    const timer2 = setTimeout(() => {
      onFinish();
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)] text-white transition-opacity duration-500 select-none ${
      fade ? 'opacity-0' : 'opacity-100'
    }`}>

      <span className="sr-only">Loading Pixels…</span>

      {/* Pixel Icon animation */}
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-[3px] flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/40 mb-4 animate-bounce">
        <div className="w-full h-full bg-[var(--color-bg)] rounded-[13px] flex items-center justify-center">
          <div className="grid grid-cols-2 gap-1 w-7 h-7">
            <div className="bg-[var(--color-primary)] rounded-sm animate-pulse"></div>
            <div className="bg-[var(--color-secondary)] rounded-sm"></div>
            <div className="bg-[var(--color-secondary)] rounded-sm"></div>
            <div className="bg-[var(--color-like)] rounded-sm animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Pixels Logo Wordmark */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="font-mono font-extrabold text-3xl tracking-tight text-white">
          Pixels
        </span>
        <span className="w-2 h-2 rounded-sm bg-[var(--color-primary)] animate-ping"></span>
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] font-medium tracking-widest uppercase">
        The Social Network for Gamers
      </p>

    </div>
  );
};
