import React from 'react';
import { CheckCircle2, Loader2, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

interface RemoveAdsButtonProps {
  adsRemoved: boolean;
  formattedPrice: string | null;
  busy: boolean;
  statusMessage?: string | null;
  variant?: 'header' | 'panel';
  onPurchase: () => void;
  onRestore?: () => void;
}

export const RemoveAdsButton: React.FC<RemoveAdsButtonProps> = ({
  adsRemoved,
  formattedPrice,
  busy,
  statusMessage,
  variant = 'header',
  onPurchase,
  onRestore,
}) => {
  if (variant === 'header') {
    if (adsRemoved) {
      return (
        <div
          className="px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 font-extrabold text-xs flex items-center gap-1.5 shadow-md"
          title="تمت إزالة الإعلانات نهائياً عبر Google Play"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>بدون إعلانات</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={busy}
        onClick={onPurchase}
        className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 border border-yellow-100 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all hover:scale-105 shadow-md disabled:opacity-65 disabled:cursor-wait"
        title="إزالة الإعلانات نهائياً عبر نظام الدفع الرسمي من Google Play"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 shrink-0" />
        )}
        <span>
          {busy
            ? 'جاري الشراء...'
            : formattedPrice
              ? `إزالة الإعلانات (${formattedPrice})`
              : 'إزالة الإعلانات'}
        </span>
      </button>
    );
  }

  // Full settings panel view (includes Restore Purchases button recommended by Google Play)
  return (
    <div className="rounded-xl bg-[#131E2E] border border-amber-400/35 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-white">
              إزالة الإعلانات نهائياً
            </div>
            <div className="text-[11px] text-slate-400">
              شراء آمن لمرة واحدة عبر Google Play Billing (remove_ads)
            </div>
          </div>
        </div>
        {adsRemoved && (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-[11px] font-black shrink-0">
            ✓ مفعّل
          </span>
        )}
      </div>

      {!adsRemoved ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onPurchase}
            className="flex-1 min-w-[160px] py-2.5 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-65"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0" />
            )}
            <span>
              {busy
                ? 'جاري الاتصال بـ Google Play...'
                : formattedPrice
                  ? `إزالة الإعلانات (${formattedPrice})`
                  : 'إزالة الإعلانات نهائياً'}
            </span>
          </button>

          {onRestore && (
            <button
              type="button"
              disabled={busy}
              onClick={onRestore}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-65"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>استعادة الشراء</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تمت إزالة الإعلانات نهائياً من حسابك. استمتع باللعب بدون أي إعلانات!</span>
        </div>
      )}

      {statusMessage && (
        <div className="rounded-lg bg-slate-900/90 border border-amber-400/30 px-3 py-2 text-[11px] font-bold text-amber-200 leading-relaxed">
          {statusMessage}
        </div>
      )}
    </div>
  );
};
