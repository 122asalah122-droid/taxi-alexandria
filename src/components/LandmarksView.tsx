import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { LANDMARKS } from '../game/data';

interface LandmarksViewProps {
  onStartPlay: () => void;
}

export const LandmarksView: React.FC<LandmarksViewProps> = ({ onStartPlay }) => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            خريطة محطات الكورنيش
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            يمتد خط الكورنيش ثلاثي الأبعاد على ساحل الإسكندرية بطول ١٠,٠٠٠ متر (٢٦ منطقة بالترتيب الحقيقي) بدايةً من المنتزه (قصر المنتزه) والمندرة والعصافرة وميامي وسيدي بشر مروراً بسان ستيفانو وكوبري ستانلي وسيدي جابر والشاطبي ومحطة الرمل والمنشية وبحري والأنفوشي وحتى قلعة قايتباي (رأس التين).
          </p>
        </div>

        <button
          type="button"
          onClick={onStartPlay}
          className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          <span>ابدأ الرحلة</span>
        </button>
      </div>

      <div className="divide-y divide-white/10 border border-white/10 rounded-xl bg-[#121C29]">
        {LANDMARKS.map((lm, index) => (
          <div
            key={lm.id}
            className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
                <span className="font-mono text-amber-400 font-semibold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{lm.district}</span>
                <span aria-hidden="true">·</span>
                <span>نقطة الكيلو {lm.distanceM} م</span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-sky-400 shrink-0" />
                <span>{lm.name}</span>
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl">{lm.description}</p>
            </div>

            <div className="sm:text-left shrink-0">
              <div className="text-xs text-slate-400">متوسط أجرة الوجهة</div>
              <div className="text-lg font-extrabold text-amber-400 font-mono tabular-nums mt-0.5">
                +{lm.fareBonus} ج.م
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
