import React, { useEffect, useState } from 'react';
import { VolumeX, Waves } from 'lucide-react';
import { soundFX } from '../game/sound';

interface SeaSoundButtonProps {
  /** Compact variant for the in-game top HUD bar */
  compact?: boolean;
  /** Full-width card style for modals and pause menus */
  fullWidth?: boolean;
  className?: string;
}

export const SeaSoundButton: React.FC<SeaSoundButtonProps> = ({
  compact = false,
  fullWidth = false,
  className = '',
}) => {
  const [enabled, setEnabled] = useState<boolean>(() => soundFX.isSeaSoundEnabled());

  useEffect(() => {
    setEnabled(soundFX.isSeaSoundEnabled());
    return soundFX.subscribeSeaSound(setEnabled);
  }, []);

  const handleToggle = () => {
    soundFX.toggleSeaSound();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={enabled}
        aria-label={enabled ? 'إيقاف صوت البحر' : 'تشغيل صوت البحر'}
        title={enabled ? 'إيقاف صوت البحر' : 'تشغيل صوت البحر'}
        className={`border-0 p-0 text-[10px] font-extrabold flex items-center gap-0.5 whitespace-nowrap shrink-0 active:opacity-60 ${
          enabled ? 'text-white' : 'text-white/65'
        } ${className}`}
        style={{ background: 'transparent' }}
      >
        <span className="relative flex items-center justify-center">
          <Waves className="w-3.5 h-3.5" />
          {!enabled && (
            <span className="absolute w-3.5 h-[1.5px] bg-rose-400 rotate-45 rounded-full" />
          )}
        </span>
        <span className="hidden lg:inline landscape-hide-label">صوت البحر</span>
      </button>
    );
  }

  if (fullWidth) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={enabled}
        className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border font-extrabold text-sm flex items-center justify-between gap-2 transition-colors ${
          enabled
            ? 'bg-sky-500/18 border-sky-400/55 text-sky-100 hover:bg-sky-500/25'
            : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
        } ${className}`}
      >
        <span className="flex items-center gap-2">
          <Waves className={`w-4 h-4 ${enabled ? 'text-sky-300' : 'text-slate-400'}`} />
          <span>صوت البحر والأمواج</span>
        </span>
        <span
          className={`px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${
            enabled
              ? 'bg-sky-400 text-slate-950'
              : 'bg-rose-500/20 text-rose-300 border border-rose-400/35'
          }`}
        >
          {!enabled && <VolumeX className="w-3.5 h-3.5" />}
          <span>{enabled ? 'مفتوح' : 'مقفول'}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'إيقاف صوت البحر' : 'تشغيل صوت البحر'}
      title={enabled ? 'إيقاف صوت البحر' : 'تشغيل صوت البحر'}
      className={`min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl border font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
        enabled
          ? 'bg-[#0B1B2E]/95 hover:bg-[#102944] border-sky-400/60 text-sky-200 shadow-md'
          : 'bg-[#0f141e]/90 hover:bg-[#192334] border-white/20 text-slate-400 hover:text-slate-200'
      } ${className}`}
    >
      <span className="relative flex items-center justify-center">
        <Waves className={`w-4 h-4 ${enabled ? 'text-sky-300' : 'text-slate-400'}`} />
        {!enabled && (
          <span className="absolute w-4.5 h-[2px] bg-rose-400 rotate-45 rounded-full" />
        )}
      </span>
      <span>{enabled ? 'صوت البحر: مفتوح' : 'صوت البحر: مقفول'}</span>
    </button>
  );
};
