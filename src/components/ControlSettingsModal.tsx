import React from 'react';
import { ArrowRight, Compass, Hand, Moon, Play, Smartphone, Sun, Sunset, X } from 'lucide-react';
import { TIME_OF_DAY_OPTIONS } from '../game/data';
import { AtmosphereMode, ControlSettings, GasMethod, SteeringMethod } from '../game/types';
import { RemoveAdsButton } from './RemoveAdsButton';
import { SeaSoundButton } from './SeaSoundButton';

interface ControlSettingsModalProps {
  open: boolean;
  controls: ControlSettings;
  atmosphere: AtmosphereMode;
  modeTitle: string;
  vehicleTitle: string;
  adsRemoved: boolean;
  removeAdsPrice: string | null;
  billingBusy: boolean;
  billingMessage?: string | null;
  onPurchaseRemoveAds: () => void;
  onRestoreRemoveAds: () => void;
  onChangeControls: (next: ControlSettings) => void;
  onChangeAtmosphere: (next: AtmosphereMode) => void;
  onStartGo: () => void;
  onClose: () => void;
}

export const ControlSettingsModal: React.FC<ControlSettingsModalProps> = ({
  open,
  controls,
  atmosphere,
  modeTitle,
  vehicleTitle,
  adsRemoved,
  removeAdsPrice,
  billingBusy,
  billingMessage,
  onPurchaseRemoveAds,
  onRestoreRemoveAds,
  onChangeControls,
  onChangeAtmosphere,
  onStartGo,
  onClose,
}) => {
  if (!open) return null;

  const steeringOptions: { id: SteeringMethod; label: string; sub: string; icon: React.ReactNode }[] = [
    {
      id: 'touch',
      label: 'أزرار Touch',
      sub: 'شمال ويمين باللمس',
      icon: <Hand className="w-4 h-4" />,
    },
    {
      id: 'joystick',
      label: 'عصا Joystick',
      sub: 'تحكم دائري مرن',
      icon: <Compass className="w-4 h-4" />,
    },
    {
      id: 'tilt',
      label: 'ميل الهاتف Tilt',
      sub: 'تحريك الموبايل يمين وشمال',
      icon: <Smartphone className="w-4 h-4" />,
    },
  ];

  const gasOptions: { id: GasMethod; label: string; sub: string }[] = [
    { id: 'manual', label: 'يدوي', sub: 'زر بنزين + فرامل' },
    { id: 'auto', label: 'أوتوماتيك', sub: 'تسارع تلقائي + فرامل' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="controls-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#0B111A] border-2 border-yellow-400 shadow-2xl p-5 sm:p-6 space-y-5 my-auto">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="رجوع"
              className="min-h-[40px] px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-yellow-400" />
              <span>رجوع</span>
            </button>
            <div>
              <h2 id="controls-modal-title" className="text-xl sm:text-2xl font-extrabold text-yellow-400 leading-tight">
                هتسوق إزاي؟
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {modeTitle} · <span className="text-sky-300 font-bold">{vehicleTitle}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steering Selection */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">طريقة التوجيه</div>
          <div className="grid grid-cols-3 gap-2">
            {steeringOptions.map((opt) => {
              const active = controls.steering === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeControls({ ...controls, steering: opt.id })}
                  className={`p-2.5 rounded-xl border text-right transition-colors flex flex-col gap-1 ${
                    active
                      ? 'bg-yellow-400 text-slate-950 border-yellow-300'
                      : 'bg-[#131E2E] text-slate-200 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {opt.icon}
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold leading-tight">{opt.label}</div>
                  <div className={`text-[10px] leading-tight ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Gas Selection */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">البنزين</div>
          <div className="grid grid-cols-2 gap-2.5">
            {gasOptions.map((opt) => {
              const active = controls.gas === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeControls({ ...controls, gas: opt.id })}
                  className={`px-3.5 py-2.5 rounded-xl border text-right transition-colors ${
                    active
                      ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                      : 'bg-[#131E2E] text-slate-200 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="text-sm font-extrabold">{opt.label}</div>
                  <div className={`text-[11px] ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sensitivity 1..5 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">حساسية الدركسيون</span>
            <span className="text-yellow-400 font-mono text-sm">{controls.sensitivity} / 5</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">١</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={controls.sensitivity}
              onChange={(e) =>
                onChangeControls({ ...controls, sensitivity: Number(e.target.value) })
              }
              className="w-full accent-yellow-400 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <span className="text-[11px] text-slate-400">٥</span>
          </div>
        </div>

        {/* Time of Day Multiplier */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">وقت اللعب ومضاعف النقاط</div>
          <div className="grid grid-cols-3 gap-2">
            {TIME_OF_DAY_OPTIONS.map((tod) => {
              const active = atmosphere === tod.id;
              const Icon = tod.id === 'day' ? Sun : tod.id === 'sunset' ? Sunset : Moon;
              return (
                <button
                  key={tod.id}
                  type="button"
                  onClick={() => onChangeAtmosphere(tod.id)}
                  className={`p-2.5 rounded-xl border text-center transition-colors flex flex-col items-center gap-1 ${
                    active
                      ? 'bg-sky-400 text-slate-950 border-sky-200'
                      : 'bg-[#131E2E] text-slate-200 border-white/10 hover:border-white/25'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-extrabold">{tod.label}</span>
                  <span className={`text-[10px] font-bold ${active ? 'text-slate-950' : 'text-yellow-400'}`}>
                    {tod.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sea Waves Audio Toggle */}
        <SeaSoundButton fullWidth />

        {/* Official Google Play Billing: Remove Ads (SKU: remove_ads) */}
        <RemoveAdsButton
          variant="panel"
          adsRemoved={adsRemoved}
          formattedPrice={removeAdsPrice}
          busy={billingBusy}
          statusMessage={billingMessage}
          onPurchase={onPurchaseRemoveAds}
          onRestore={onRestoreRemoveAds}
        />

        <button
          type="button"
          onClick={onStartGo}
          className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.99] text-slate-950 font-extrabold text-lg flex items-center justify-center gap-2 transition-transform shadow-lg"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>يلا GO</span>
        </button>
      </div>
    </div>
  );
};
