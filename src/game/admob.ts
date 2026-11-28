// Official AdMob integration for Alexandria Taxi (Production Ad Unit IDs ONLY)

export const ADMOB_CONFIG = {
  appId: 'ca-app-pub-2226579682603861~7973735969',
  bannerUnitId: 'ca-app-pub-2226579682603861/6180928955',
  interstitialUnitId: 'ca-app-pub-2226579682603861/5593104307',
  rewardedUnitId: 'ca-app-pub-2226579682603861/1142723402',
  rewardAmount: 500,
  interstitialTripsInterval: 3,
  interstitialCooldownMs: 90_000,
  bannerHeightPx: 56,
} as const;

interface NativeAdMobBridge {
  initialize?: (appId: string) => void | Promise<void>;
  showBanner?: (adUnitId: string) => void | Promise<void>;
  hideBanner?: () => void | Promise<void>;
  showInterstitial?: (adUnitId: string) => boolean | Promise<boolean>;
  showRewarded?: (adUnitId: string) => boolean | { rewarded?: boolean } | Promise<boolean | { rewarded?: boolean }>;
}

interface CapacitorAdMobPlugin {
  initialize?: (opts: { initializeForTesting?: boolean }) => Promise<void>;
  showBanner?: (opts: { adId: string; position?: string; isTesting?: boolean }) => Promise<void>;
  hideBanner?: () => Promise<void>;
  removeBanner?: () => Promise<void>;
  prepareInterstitial?: (opts: { adId: string; isTesting?: boolean }) => Promise<void>;
  showInterstitial?: () => Promise<void>;
  prepareRewardVideoAd?: (opts: { adId: string; isTesting?: boolean }) => Promise<void>;
  showRewardVideoAd?: () => Promise<{ amount?: number; type?: string } | null>;
}

interface WindowWithAdMob extends Window {
  AndroidAdMob?: NativeAdMobBridge;
  AdMobBridge?: NativeAdMobBridge;
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      AdMob?: CapacitorAdMobPlugin;
    };
  };
}

export type RewardedAdOutcome =
  | { status: 'rewarded'; amount: number; isPreviewDemo: boolean }
  | { status: 'incomplete'; message: string }
  | { status: 'disabled' }
  | { status: 'error'; message: string };

export type InterstitialAdOutcome =
  | { status: 'shown' }
  | { status: 'skipped_removed' }
  | { status: 'skipped_preview' }
  | { status: 'skipped_cooldown'; remainingSec: number }
  | { status: 'skipped_trips'; tripsTowardNext: number }
  | { status: 'error' };

const INTERSTITIAL_STATE_KEY = 'alex_taxi_admob_interstitial_v1';

interface InterstitialTrackerState {
  pendingTaxiTrips: number;
  lastShownAtMs: number;
}

function loadInterstitialTracker(): InterstitialTrackerState {
  try {
    const raw = window.localStorage.getItem(INTERSTITIAL_STATE_KEY);
    if (!raw) return { pendingTaxiTrips: 0, lastShownAtMs: 0 };
    const parsed = JSON.parse(raw) as Partial<InterstitialTrackerState>;
    return {
      pendingTaxiTrips: Math.max(0, Number(parsed.pendingTaxiTrips) || 0),
      lastShownAtMs: Math.max(0, Number(parsed.lastShownAtMs) || 0),
    };
  } catch {
    return { pendingTaxiTrips: 0, lastShownAtMs: 0 };
  }
}

function saveInterstitialTracker(state: InterstitialTrackerState): void {
  try {
    window.localStorage.setItem(INTERSTITIAL_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

function getWin(): WindowWithAdMob {
  return window as WindowWithAdMob;
}

function getNativeBridge(): NativeAdMobBridge | null {
  if (typeof window === 'undefined') return null;
  const w = getWin();
  return w.AndroidAdMob ?? w.AdMobBridge ?? null;
}

function getCapacitorAdMob(): CapacitorAdMobPlugin | null {
  if (typeof window === 'undefined') return null;
  const w = getWin();
  if (w.Capacitor?.isNativePlatform?.() && w.Capacitor.Plugins?.AdMob) {
    return w.Capacitor.Plugins.AdMob;
  }
  return null;
}

/**
 * Real AdMob ads ONLY execute inside the installed Google Play Android app
 * with an active native AdMob bridge or Capacitor AdMob plugin.
 * Browser previews never attempt to load live AdMob network ads.
 */
export function isGooglePlayAdMobRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(getNativeBridge() || getCapacitorAdMob());
}

let initializedOnce = false;

export async function initializeAdMob(adsRemoved: boolean): Promise<void> {
  if (adsRemoved || !isGooglePlayAdMobRuntime()) return;
  if (initializedOnce) return;
  initializedOnce = true;

  const bridge = getNativeBridge();
  if (bridge?.initialize) {
    try {
      await bridge.initialize(ADMOB_CONFIG.appId);
    } catch {
      // Non-fatal native bridge error
    }
    return;
  }

  const cap = getCapacitorAdMob();
  if (cap?.initialize) {
    try {
      await cap.initialize({ initializeForTesting: false });
    } catch {
      // Non-fatal plugin error
    }
  }
}

/**
 * Bottom banner ads are disabled; ensure zero bottom spacing and hide any native banner.
 */
export async function hideBottomBannerAd(): Promise<void> {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--ad-banner-offset', '0px');
  }

  if (!isGooglePlayAdMobRuntime()) {
    return;
  }

  const bridge = getNativeBridge();
  const cap = getCapacitorAdMob();

  try {
    await bridge?.hideBanner?.();
    await cap?.removeBanner?.();
    await cap?.hideBanner?.();
  } catch {
    // Ignore native hide errors
  }
}

/**
 * Called ONLY after a round finishes (never during driving!).
 * Tracks completed taxi trips; shows Interstitial after every 3 completed taxi trips
 * with a strict 90-second cooldown and hard skip if remove_ads is owned.
 */
export async function maybeShowInterstitialAfterRound(
  completedTaxiTripsInRound: number,
  adsRemoved: boolean,
): Promise<InterstitialAdOutcome> {
  if (adsRemoved) {
    return { status: 'skipped_removed' };
  }

  const safeTrips = Math.max(0, Math.floor(completedTaxiTripsInRound));
  const tracker = loadInterstitialTracker();
  const nextPending = tracker.pendingTaxiTrips + safeTrips;

  if (nextPending < ADMOB_CONFIG.interstitialTripsInterval) {
    saveInterstitialTracker({ ...tracker, pendingTaxiTrips: nextPending });
    return { status: 'skipped_trips', tripsTowardNext: nextPending };
  }

  const now = Date.now();
  const elapsedMs = now - tracker.lastShownAtMs;
  if (tracker.lastShownAtMs > 0 && elapsedMs < ADMOB_CONFIG.interstitialCooldownMs) {
    // Preserve pending count so it triggers on the next round end once the 90s cooldown expires
    saveInterstitialTracker({ ...tracker, pendingTaxiTrips: nextPending });
    return {
      status: 'skipped_cooldown',
      remainingSec: Math.ceil((ADMOB_CONFIG.interstitialCooldownMs - elapsedMs) / 1000),
    };
  }

  // Never attempt to load a real AdMob Interstitial inside browser preview
  if (!isGooglePlayAdMobRuntime()) {
    saveInterstitialTracker({
      pendingTaxiTrips: nextPending % ADMOB_CONFIG.interstitialTripsInterval,
      lastShownAtMs: now,
    });
    return { status: 'skipped_preview' };
  }

  await initializeAdMob(false);

  const bridge = getNativeBridge();
  const cap = getCapacitorAdMob();

  try {
    if (bridge?.showInterstitial) {
      await bridge.showInterstitial(ADMOB_CONFIG.interstitialUnitId);
    } else if (cap?.prepareInterstitial && cap?.showInterstitial) {
      await cap.prepareInterstitial({
        adId: ADMOB_CONFIG.interstitialUnitId,
        isTesting: false,
      });
      await cap.showInterstitial();
    } else {
      return { status: 'skipped_preview' };
    }

    saveInterstitialTracker({
      pendingTaxiTrips: nextPending % ADMOB_CONFIG.interstitialTripsInterval,
      lastShownAtMs: now,
    });
    return { status: 'shown' };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Triggers Rewarded Ad (ca-app-pub-2226579682603861/1142723402) for +500 in-game currency.
 * - Disabled permanently if remove_ads is owned.
 * - In browser preview: demo mode awards +500 immediately without loading real ads.
 * - In installed Google Play app: awards +500 ONLY if the user completes the entire ad.
 */
export async function showRewardedAdForBonus(adsRemoved: boolean): Promise<RewardedAdOutcome> {
  if (adsRemoved) {
    return { status: 'disabled' };
  }

  // Browser preview mode: never load live AdMob; demo grants +500 directly
  if (!isGooglePlayAdMobRuntime()) {
    return {
      status: 'rewarded',
      amount: ADMOB_CONFIG.rewardAmount,
      isPreviewDemo: true,
    };
  }

  await initializeAdMob(false);

  const bridge = getNativeBridge();
  const cap = getCapacitorAdMob();

  try {
    if (bridge?.showRewarded) {
      const res = await bridge.showRewarded(ADMOB_CONFIG.rewardedUnitId);
      const earned = typeof res === 'boolean' ? res : Boolean(res?.rewarded);
      if (earned) {
        return {
          status: 'rewarded',
          amount: ADMOB_CONFIG.rewardAmount,
          isPreviewDemo: false,
        };
      }
      return {
        status: 'incomplete',
        message: 'لم تكتمل مشاهدة الإعلان — شاهد الإعلان كاملاً للحصول على +500 ج.م.',
      };
    }

    if (cap?.prepareRewardVideoAd && cap?.showRewardVideoAd) {
      await cap.prepareRewardVideoAd({
        adId: ADMOB_CONFIG.rewardedUnitId,
        isTesting: false,
      });
      const reward = await cap.showRewardVideoAd();
      if (reward && (reward.amount === undefined || reward.amount > 0)) {
        return {
          status: 'rewarded',
          amount: ADMOB_CONFIG.rewardAmount,
          isPreviewDemo: false,
        };
      }
      return {
        status: 'incomplete',
        message: 'لم تكتمل مشاهدة الإعلان — شاهد الإعلان كاملاً للحصول على +500 ج.م.',
      };
    }

    return {
      status: 'error',
      message: 'الإعلان غير متاح حالياً، حاول مرة أخرى بعد لحظات.',
    };
  } catch {
    return {
      status: 'error',
      message: 'تعذر تحميل إعلان المكافأة حالياً، يرجى المحاولة مرة أخرى.',
    };
  }
}
