// Official Google Play Billing integration for Android TWA via W3C Digital Goods API & Payment Request API

export const GOOGLE_PLAY_BILLING_METHOD = 'https://play.google.com/billing';
export const REMOVE_ADS_SKU = 'remove_ads';

interface DigitalGoodsPrice {
  currency: string;
  value: string;
}

export interface DigitalGoodsItemDetails {
  itemId: string;
  title: string;
  description?: string;
  price: DigitalGoodsPrice;
  type?: 'product' | 'subscription';
}

interface DigitalGoodsPurchaseDetails {
  itemId: string;
  purchaseToken: string;
}

interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<DigitalGoodsItemDetails[]>;
  listPurchases(): Promise<DigitalGoodsPurchaseDetails[]>;
  listPurchaseHistory?(): Promise<DigitalGoodsPurchaseDetails[]>;
  acknowledge?(purchaseToken: string, purchaseType: 'onetime' | 'repeatable'): Promise<void>;
  consume?(purchaseToken: string): Promise<void>;
}

interface WindowWithDigitalGoods extends Window {
  getDigitalGoodsService?: (serviceProvider: string) => Promise<DigitalGoodsService>;
  __ALEX_TAXI_ADS_REMOVED__?: boolean;
}

export interface RemoveAdsProductInfo {
  available: boolean;
  formattedPrice: string | null;
  title: string;
  currency?: string;
  value?: string;
}

export interface RemoveAdsEntitlementCheck {
  supported: boolean;
  owned: boolean;
  purchaseToken?: string;
}

export type PurchaseRemoveAdsResult =
  | { status: 'purchased'; purchaseToken: string }
  | { status: 'already_owned'; purchaseToken?: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

function getWin(): WindowWithDigitalGoods {
  return window as WindowWithDigitalGoods;
}

export function isPlayBillingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = getWin();
  return typeof w.getDigitalGoodsService === 'function' && typeof window.PaymentRequest === 'function';
}

async function getPlayBillingService(): Promise<DigitalGoodsService | null> {
  if (!isPlayBillingSupported()) return null;
  try {
    const w = getWin();
    const service = await w.getDigitalGoodsService?.(GOOGLE_PLAY_BILLING_METHOD);
    return service ?? null;
  } catch {
    return null;
  }
}

export function formatPlayPrice(price?: DigitalGoodsPrice): string | null {
  if (!price || !price.currency || !price.value) return null;
  const numeric = Number(price.value);
  if (!Number.isFinite(numeric)) return `${price.value} ${price.currency}`;
  try {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: price.currency,
    }).format(numeric);
  } catch {
    return `${price.value} ${price.currency}`;
  }
}

export async function loadRemoveAdsProductDetails(): Promise<RemoveAdsProductInfo> {
  const service = await getPlayBillingService();
  if (!service) {
    return { available: false, formattedPrice: null, title: 'إزالة الإعلانات نهائياً' };
  }
  try {
    const details = await service.getDetails([REMOVE_ADS_SKU]);
    const item = details.find((d) => d.itemId === REMOVE_ADS_SKU);
    if (!item) {
      return { available: false, formattedPrice: null, title: 'إزالة الإعلانات نهائياً' };
    }
    return {
      available: true,
      formattedPrice: formatPlayPrice(item.price),
      title: item.title || 'إزالة الإعلانات نهائياً',
      currency: item.price?.currency,
      value: item.price?.value,
    };
  } catch {
    return { available: false, formattedPrice: null, title: 'إزالة الإعلانات نهائياً' };
  }
}

export async function checkRemoveAdsEntitlement(): Promise<RemoveAdsEntitlementCheck> {
  const service = await getPlayBillingService();
  if (!service) {
    return { supported: false, owned: false };
  }
  try {
    const purchases = await service.listPurchases();
    const existing = purchases.find(
      (p) => p.itemId === REMOVE_ADS_SKU && typeof p.purchaseToken === 'string' && p.purchaseToken.trim().length > 0,
    );
    if (existing) {
      // Acknowledge one-time purchase on runtimes supporting DGAPI 1.0 acknowledge()
      if (typeof service.acknowledge === 'function') {
        try {
          await service.acknowledge(existing.purchaseToken, 'onetime');
        } catch {
          // Already acknowledged on Google Play
        }
      }
      return { supported: true, owned: true, purchaseToken: existing.purchaseToken };
    }
    return { supported: true, owned: false };
  } catch {
    return { supported: true, owned: false };
  }
}

export async function purchaseRemoveAds(): Promise<PurchaseRemoveAdsResult> {
  const service = await getPlayBillingService();
  if (!service) {
    return {
      status: 'unavailable',
      message: 'ميزة إزالة الإعلانات عبر Google Play Billing تعمل داخل التطبيق الرسمي المثبت من متجر Google Play.',
    };
  }

  try {
    // 1. Prevent double-charging if the Google Play account already owns remove_ads
    const existing = await checkRemoveAdsEntitlement();
    if (existing.owned) {
      return { status: 'already_owned', purchaseToken: existing.purchaseToken };
    }

    // 2. Fetch official SKU details from Google Play Console
    const details = await service.getDetails([REMOVE_ADS_SKU]);
    const item = details.find((d) => d.itemId === REMOVE_ADS_SKU);
    if (!item) {
      return {
        status: 'error',
        message: 'المنتج (remove_ads) غير مفعّل بعد على Google Play Console. تأكد من تفعيله في المنتجات داخل التطبيق.',
      };
    }

    // 3. Invoke Google Play Billing sheet via W3C Payment Request API
    const paymentMethods: PaymentMethodData[] = [
      {
        supportedMethods: GOOGLE_PLAY_BILLING_METHOD,
        data: {
          sku: REMOVE_ADS_SKU,
        },
      },
    ];

    const paymentDetails: PaymentDetailsInit = {
      total: {
        label: item.title || 'إزالة الإعلانات نهائياً',
        amount: {
          currency: item.price?.currency || 'USD',
          value: item.price?.value || '0',
        },
      },
    };

    const request = new PaymentRequest(paymentMethods, paymentDetails);
    const response = await request.show();

    const responseDetails = response.details as { purchaseToken?: unknown } | null;
    const purchaseToken =
      typeof responseDetails?.purchaseToken === 'string' ? responseDetails.purchaseToken.trim() : '';

    if (!purchaseToken) {
      await response.complete('fail');
      return {
        status: 'error',
        message: 'لم يتم استلام تأكيد الشراء من Google Play. يرجى المحاولة مرة أخرى.',
      };
    }

    // 4. Complete payment UI and acknowledge non-consumable purchase (never consume remove_ads!)
    await response.complete('success');

    if (typeof service.acknowledge === 'function') {
      try {
        await service.acknowledge(purchaseToken, 'onetime');
      } catch {
        // Digital Goods API 2.1+ handles acknowledgement via Play Billing / Play Console
      }
    }

    return { status: 'purchased', purchaseToken };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    return {
      status: 'error',
      message: 'تعذر إتمام الشراء عبر Google Play حالياً. يرجى المحاولة مرة أخرى لاحقاً.',
    };
  }
}

export function syncAdFreeDocumentFlag(adsRemoved: boolean): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.adsRemoved = adsRemoved ? 'true' : 'false';
  }
  if (typeof window !== 'undefined') {
    getWin().__ALEX_TAXI_ADS_REMOVED__ = adsRemoved;
    window.dispatchEvent(
      new CustomEvent('alex-ads-status-changed', {
        detail: { adsRemoved },
      }),
    );
  }
}
