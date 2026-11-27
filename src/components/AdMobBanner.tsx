import React, { useEffect } from 'react';
import { ADMOB_CONFIG, isGooglePlayAdMobRuntime, syncBannerAd } from '../game/admob';

interface AdMobBannerProps {
  adsRemoved: boolean;
}

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ adsRemoved }) => {
  const isNativePlay = isGooglePlayAdMobRuntime();

  useEffect(() => {
    void syncBannerAd(adsRemoved);
  }, [adsRemoved]);

  if (adsRemoved) {
    return null;
  }

  return (
    <aside
      id="google-play-ad-slot"
      aria-label="مساحة الإعلان"
      data-admob-app-id={ADMOB_CONFIG.appId}
      data-admob-banner-unit-id={ADMOB_CONFIG.bannerUnitId}
      data-admob-runtime={isNativePlay ? 'google-play' : 'browser-preview'}
      className="fixed bottom-0 inset-x-0 z-[60] flex items-center justify-center select-none"
      style={{
        height: `${ADMOB_CONFIG.bannerHeightPx}px`,
        backgroundColor: isNativePlay ? '#090d16' : '#4b5563',
        borderTop: isNativePlay ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {!isNativePlay && (
        <span className="text-xs sm:text-sm font-extrabold tracking-wide text-slate-100">
          مكان الإعلان
        </span>
      )}
    </aside>
  );
};
