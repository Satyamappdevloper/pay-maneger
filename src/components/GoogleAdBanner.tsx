/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Pay Manager: Google Ads (AdSense / AdMob) Integration Banner Component
 * 
 * ==============================================================================
 * GOOGLE ADSENSE ACTIVATION INSTRUCTIONS:
 * 1. Add your AdSense script tag to /index.html inside <head>:
 *    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
 * 
 * 2. Set your Google AdSense Publisher ID (e.g., "ca-pub-1234567890123456") 
 *    and Ad Slot ID (e.g., "9876543210") in the props or in .env (VITE_ADSENSE_CLIENT_ID / VITE_ADSENSE_SLOT_ID).
 * 
 * 3. FOR ANDROID / ADMOB (Capacitor / Cordova / React Native WebView):
 *    - Use Google Mobile Ads SDK (@capacitor-community/admob) or AdMob Web view banner.
 *    - Insert your AdMob App ID (ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX) and Banner Unit ID.
 * ==============================================================================
 */

import React, { useEffect } from 'react';
import { Sparkles, Megaphone, Info } from 'lucide-react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export interface GoogleAdBannerProps {
  /**
   * Google AdSense Publisher Client ID (e.g., "ca-pub-XXXXXXXXXXXXXXXX")
   */
  client?: string;
  /**
   * Google AdSense Ad Slot ID (e.g., "1234567890")
   */
  slot?: string;
  /**
   * Ad layout format
   */
  format?: 'auto' | 'horizontal' | 'rectangle';
  /**
   * Optional custom styling
   */
  className?: string;
  /**
   * Show placeholder banner preview in development/testing mode
   */
  showPlaceholderInDev?: boolean;
}

export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({
  client = import.meta.env.VITE_ADSENSE_CLIENT_ID || '',
  slot = import.meta.env.VITE_ADSENSE_SLOT_ID || '',
  format = 'auto',
  className = '',
  showPlaceholderInDev = true,
}) => {
  const isConfigured = Boolean(client && slot && !client.includes('XXXX'));

  useEffect(() => {
    if (isConfigured && typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.warn('[GoogleAdBanner] AdSense push error:', err);
      }
    }
  }, [isConfigured]);

  // Production AdSense script container
  if (isConfigured) {
    return (
      <div className={`w-full overflow-hidden my-4 text-center ${className}`}>
        <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-mono mb-1">
          Advertisement
        </span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // If in dev / preview or not yet configured with real publisher ID:
  if (!showPlaceholderInDev) return null;

  return (
    <div
      className={`w-full rounded-2xl border border-dashed border-teal-500/30 dark:border-teal-500/20 bg-teal-500/5 dark:bg-teal-950/20 p-4 transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                Sponsored Ad Space
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Google AdSense / AdMob Ready</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              Monetization banner slot ready for your Publisher ID (<code className="text-teal-600 dark:text-teal-400">ca-pub-XXXXXXXXXXXX</code>)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
          <span>Reserved 728x90 / Responsive</span>
        </div>
      </div>
    </div>
  );
};
