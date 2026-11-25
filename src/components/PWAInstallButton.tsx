import React, { useState } from 'react';
import { CheckCircle2, Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    offlineReady,
    isCaching,
    install,
    ensureOfflineCached,
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // When already running as an installed standalone PWA on the phone, hide the install button
  if (isInstalled) {
    return null;
  }

  const handlePrimaryClick = async () => {
    await ensureOfflineCached();
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrimaryClick}
        disabled={isCaching}
        className="px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 border-[1.5px] border-emerald-300/80 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all hover:scale-105 shadow-md disabled:opacity-70"
        title="تثبيت وتخزين اللعبة على الموبايل للعب بدون إنترنت"
      >
        {offlineReady && !isInstallable ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
        ) : (
          <Download className="w-4 h-4 text-white shrink-0" />
        )}
        <span>
          {isCaching
            ? 'جاري التخزين...'
            : isInstallable
              ? 'تثبيت بدون نت'
              : isIOS
                ? 'تثبيت على الآيفون'
                : offlineReady
                  ? 'حفظ على الموبايل'
                  : 'تخزين بدون نت'}
        </span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-amber-400/50 p-5 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-amber-300 font-extrabold text-base">
                <Smartphone className="w-5 h-5" />
                <span>تثبيت اللعبة للعب بدون نت</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {offlineReady && (
              <div className="mb-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-3 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>تم تخزين ملفات اللعبة في ذاكرة الموبايل وجاهزة للعمل بدون نت.</span>
              </div>
            )}

            {isIOS ? (
              <ol className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed list-decimal list-inside">
                <li>
                  افتح اللعبة في متصفح <strong>Safari</strong>.
                </li>
                <li>
                  اضغط على زر <strong>المشاركة (Share)</strong> أسفل الشاشة.
                </li>
                <li>
                  اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> ثم اضغط{' '}
                  <strong>إضافة</strong>.
                </li>
                <li>بعدها افتح الأيقونة من شاشة الموبايل في أي وقت بدون إنترنت.</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed list-decimal list-inside">
                <li>
                  افتح رابط اللعبة مباشرة في متصفح <strong>Chrome</strong> على الموبايل.
                </li>
                <li>
                  اضغط على قائمة <strong>الثلاث نقاط (⋮)</strong> أعلى المتصفح.
                </li>
                <li>
                  اختر <strong>تثبيت التطبيق (Install app)</strong> أو{' '}
                  <strong>الإضافة إلى الشاشة الرئيسية</strong>.
                </li>
                <li>بعد التثبيت هتفتح اللعبة كأيقونة على الموبايل وتشتغل بدون نت بالكامل.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold py-2.5 text-sm transition"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ hideDuringPlay?: boolean }> = ({
  hideDuringPlay = false,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline || hideDuringPlay) return null;

  return (
    <div className="fixed bottom-3 right-3 z-40 flex items-center gap-1.5 rounded-xl bg-amber-500/95 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>وضع بدون نت — تعمل من الذاكرة</span>
    </div>
  );
};
