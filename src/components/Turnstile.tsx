import React, { useEffect, useRef } from 'react';
import { config } from '../lib/config';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';

let scriptPromise: Promise<void> | null = null;

/** Load the Turnstile script exactly once. */
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve) => {
    window.onTurnstileLoad = () => resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: 'dark' | 'light';
}

/**
 * Renders a Cloudflare Turnstile bot-check. Renders nothing when no site key
 * is configured, so the app stays usable before Cloudflare is set up.
 */
export const Turnstile: React.FC<TurnstileProps> = ({ onVerify, onExpire, theme = 'dark' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!config.turnstileSiteKey || !ref.current) return;
    let cancelled = false;

    loadTurnstileScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: config.turnstileSiteKey,
        theme,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onExpire?.(),
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (!config.turnstileSiteKey) return null;
  return <div ref={ref} className="flex justify-center my-1" />;
};
