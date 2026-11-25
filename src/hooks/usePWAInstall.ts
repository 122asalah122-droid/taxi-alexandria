import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Capture beforeinstallprompt at module load so early browser events are never missed
let earlyDeferredPrompt: BeforeInstallPromptEvent | null = null;
let earlyOfflineReady = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    earlyDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });
  window.addEventListener('pwa-offline-ready', () => {
    earlyOfflineReady = true;
  });
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => earlyDeferredPrompt,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [offlineReady, setOfflineReady] = useState(() => earlyOfflineReady);
  const [isCaching, setIsCaching] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if service worker is already active & controlling this page
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg.active) {
            earlyOfflineReady = true;
            setOfflineReady(true);
          }
        })
        .catch(() => {});
    }

    const syncPrompt = () => {
      if (earlyDeferredPrompt) {
        setDeferredPrompt(earlyDeferredPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      earlyDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(earlyDeferredPrompt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      earlyDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    const handleOfflineReady = () => {
      earlyOfflineReady = true;
      setOfflineReady(true);
    };

    window.addEventListener('pwa-prompt-available', syncPrompt);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-offline-ready', handleOfflineReady);

    return () => {
      window.removeEventListener('pwa-prompt-available', syncPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-offline-ready', handleOfflineReady);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      earlyDeferredPrompt = null;
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const ensureOfflineCached = useCallback(async () => {
    setIsCaching(true);
    try {
      // Request persistent storage so mobile OS keeps the cached game intact
      if (navigator.storage?.persist) {
        await navigator.storage.persist().catch(() => false);
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.update().catch(() => {});
      }
      if ('caches' in window) {
        const cache = await caches.open('alex-taxi-offline-runtime');
        await cache.addAll(['/', '/index.html', '/icon.svg', '/pwa-192x192.png']).catch(() => {});
      }
      earlyOfflineReady = true;
      setOfflineReady(true);
    } finally {
      setIsCaching(false);
    }
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    offlineReady,
    isCaching,
    install,
    ensureOfflineCached,
  };
}
