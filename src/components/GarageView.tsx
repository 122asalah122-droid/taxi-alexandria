import React from 'react';
import {
  Bike,
  Car,
  Check,
  Coins,
  Fuel,
  Gauge,
  Lock,
  Shield,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { ALEX_DISTRICTS, getTaxiLevelDef, MOTO_MODELS, TAXI_LEVELS, UPGRADE_INFO } from '../game/data';
import { AlexDistrictId, PlayerProgress, RaceBikeId, UpgradeLevels } from '../game/types';

interface GarageViewProps {
  progress: PlayerProgress;
  onSelectMoto: (motoId: RaceBikeId) => void;
  onBuyMoto: (motoId: RaceBikeId, price: number) => void;
  onUpgradeTaxi: () => void;
  onSelectDistrict: (districtId: AlexDistrictId) => void;
  onBuyDistrict: (districtId: AlexDistrictId, price: number) => void;
  onBuyUpgrade: (key: keyof UpgradeLevels, cost: number) => void;
  onStartPlay: () => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  progress,
  onSelectMoto,
  onBuyMoto,
  onUpgradeTaxi,
  onSelectDistrict,
  onBuyDistrict,
  onBuyUpgrade,
  onStartPlay,
}) => {
  const upgradeKeys: (keyof UpgradeLevels)[] = ['engine', 'tank', 'brakes'];
  const unlockedMotos = progress.unlockedMotos ?? ['vespa_lv1'];
  const selectedMotoId = progress.selectedMotoId ?? 'vespa_lv1';
  const engineBonusKmh = progress.upgrades.engine * 4;
  const currentTaxiLv = getTaxiLevelDef(progress.taxiLevel);
  const nextTaxiLv = progress.taxiLevel < TAXI_LEVELS.length ? TAXI_LEVELS[progress.taxiLevel] : null;
  const canUpgradeTaxi = Boolean(nextTaxiLv && progress.wallet >= nextTaxiLv.upgradeCost);
  const unlockedDistricts = progress.unlockedDistricts ?? ['corniche'];
  const selectedDistrictId = progress.selectedDistrictId ?? 'corniche';

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12">
      {/* Header + Daily Revenue Summary */}
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            جراج الموتوسيكلات ومستويات السرعة
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            وصّل الركاب على كورنيش الإسكندرية، جمّع الإيراد اليومي، وافتح الـ 7 مستويات من الموتوسيكلات وطوّر 7 مستويات سرعة ومميزات خاصة لكل موتوسيكل.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-sm text-slate-300 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/12 border border-emerald-400/35 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-200/80">الإيراد اليومي ({progress.dailyTrips ?? 0} توصيلة)</div>
              <div className="text-emerald-300 font-black text-base font-mono tabular-nums">
                {progress.dailyEarnings ?? 0} ج.م
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-amber-500/12 border border-amber-400/35 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-amber-200/80">الرصيد المتاح</div>
              <div className="text-amber-300 font-black text-base font-mono tabular-nums">
                {progress.wallet} ج.م
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartPlay}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm transition-colors whitespace-nowrap shrink-0"
          >
            انزل الكورنيش
          </button>
        </div>
      </div>

      {/* 7 Motorcycle Levels Fleet */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
              <Bike className="w-5 h-5" />
              <span>أسطول الموتوسيكلات — 7 مستويات بمميزات خاصة</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              كل مستوى جديد يفتح من فلوس الإيراد اليومي ويمنحك سرعة أعلى وميزة حصرية على الكورنيش.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
            المفتوح: {unlockedMotos.length} / {MOTO_MODELS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOTO_MODELS.map((moto) => {
            const isUnlocked = unlockedMotos.includes(moto.id);
            const isSelected = selectedMotoId === moto.id;
            const canAfford = progress.wallet >= moto.price;
            const effectiveSpeed = moto.topSpeedKmh + engineBonusKmh;
            const accentCss = `#${moto.accentHex.toString(16).padStart(6, '0')}`;

            return (
              <div
                key={moto.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'bg-[#182638] border-amber-400 shadow-lg shadow-amber-500/10'
                    : isUnlocked
                      ? 'bg-[#121C29] border-white/15 hover:border-white/30'
                      : 'bg-[#0F1724] border-white/10'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-black font-mono">
                        مستوى {moto.level}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                          moto.difficultyTier === 'easy'
                            ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                            : moto.difficultyTier === 'medium'
                              ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                              : moto.difficultyTier === 'hard'
                                ? 'bg-orange-500/15 border-orange-400/40 text-orange-300'
                                : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                        }`}
                      >
                        {moto.difficultyLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-4 h-4 rounded-full border border-white/50"
                          style={{ backgroundColor: moto.paintCss }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-white/40"
                          style={{ backgroundColor: accentCss }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold tabular-nums text-slate-300">
                      {isUnlocked
                        ? isSelected
                          ? 'مُجهّز الآن'
                          : 'مملوك'
                        : `${moto.price.toLocaleString('en-US')} ج.م`}
                    </span>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-sky-300">{moto.categoryLabel}</div>
                    <h3 className="text-lg font-black text-white mt-0.5">{moto.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{moto.subtitle}</p>
                  </div>

                  {/* Special Perk Highlight */}
                  <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25 space-y-0.5">
                    <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>{moto.perkTitle}</span>
                    </div>
                    <p className="text-[11px] text-amber-100/85 leading-snug">{moto.perkDesc}</p>
                  </div>

                  {/* Performance Stats */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">السرعة القصوى</span>
                      <span className="font-mono font-bold text-amber-300 tabular-nums">
                        {effectiveSpeed} كم/س
                        {engineBonusKmh > 0 && (
                          <span className="text-emerald-300 text-[10px] mr-1">
                            (+{engineBonusKmh})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-amber-400 to-orange-500"
                        style={{ width: `${Math.min(100, Math.round((effectiveSpeed / 350) * 100))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 font-mono tabular-nums">
                      <span>تسارع: {moto.accelScore}%</span>
                      <span>تحكم: {moto.handlingScore}%</span>
                      <span>أجرة: ×{moto.fareMultiplier.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectMoto(moto.id)}
                    disabled={isSelected}
                    className={`w-full min-h-[44px] px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 cursor-default'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    <span>{isSelected ? 'الموتوسيكل النشط' : 'اختيار وتجهيز'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBuyMoto(moto.id, moto.price)}
                    disabled={!canAfford}
                    className={`w-full min-h-[44px] px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                      canAfford
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {canAfford
                        ? `فتح وشراء (${moto.price.toLocaleString('en-US')} ج.م)`
                        : `تحتاج ${moto.price.toLocaleString('en-US')} ج.م`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mechanical & 7-Level Speed Upgrades */}
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-black text-white">تطوير مستويات السرعة والورشة</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            ارفع مستوى سرعة الموتوسيكل حتى المستوى 7 بفلوس الإيراد اليومي، وطوّر التانك والفرامل.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upgradeKeys.map((key) => {
            const level = progress.upgrades[key];
            const info = UPGRADE_INFO[key];
            const maxLevel = info.maxLevel;
            const isMax = level >= maxLevel;
            const nextCost = isMax ? 0 : info.costs[level];
            const canAfford = !isMax && progress.wallet >= nextCost;

            const Icon = key === 'engine' ? Gauge : key === 'tank' ? Fuel : Shield;

            return (
              <div
                key={key}
                className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 ${
                  key === 'engine'
                    ? 'bg-[#142032] border-amber-400/35'
                    : 'bg-[#121C29] border-white/10'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${key === 'engine' ? 'text-amber-400' : 'text-sky-400'}`} />
                    <span className="text-xs font-mono font-bold tabular-nums text-amber-300">
                      المستوى {level} / {maxLevel}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{info.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{info.description}</p>
                    {key === 'engine' && (
                      <div className="text-xs font-bold text-emerald-300 mt-1.5 font-mono">
                        الزيادة الحالية: +{level * 10} كم/س
                      </div>
                    )}
                  </div>

                  {/* Dynamic level meter bars (7 segments for engine, 3 for tank/brakes) */}
                  <div
                    className="grid gap-1.5 pt-1"
                    style={{ gridTemplateColumns: `repeat(${maxLevel}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: maxLevel }).map((_, step) => (
                      <div
                        key={step}
                        className={`h-2 rounded-full transition-colors ${
                          step < level ? 'bg-amber-400' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isMax || !canAfford}
                  onClick={() => onBuyUpgrade(key, nextCost)}
                  className={`w-full min-h-[44px] px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                    isMax
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                      : canAfford
                        ? key === 'engine'
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  <span>
                    {isMax
                      ? 'أقصى مستوى سرعة'
                      : canAfford
                        ? `ترقية للمستوى ${level + 1} (${nextCost} ج.م)`
                        : `التكلفة ${nextCost} ج.م`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Single Self-Evolving Alexandria Taxi Section (7 Levels: Easy -> Legendary Hard) */}
      <div className="space-y-5 pt-6 border-t border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-amber-300 flex items-center gap-2">
              <Car className="w-5 h-5" />
              <span>تاكسي الإسكندرية المتطور — قسم واحد (7 مستويات من سهل إلى أسطوري)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              تاكسي الإسكندرية الواحد يتطور تلقائياً في الشكل والسرعة والأجرة وصعوبة الطريق والزحام عبر ٧ مستويات!
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-black font-mono">
            المستوى {currentTaxiLv.level} / {TAXI_LEVELS.length} · {currentTaxiLv.difficultyLabel}
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#142032] border border-amber-400/45 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black text-white">{currentTaxiLv.name}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${
                    currentTaxiLv.difficultyTier === 'easy'
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : currentTaxiLv.difficultyTier === 'medium'
                        ? 'bg-sky-500/15 border-sky-400/40 text-sky-300'
                        : currentTaxiLv.difficultyTier === 'hard'
                          ? 'bg-orange-500/15 border-orange-400/40 text-orange-300'
                          : currentTaxiLv.difficultyTier === 'very_hard'
                            ? 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                            : currentTaxiLv.difficultyTier === 'pro'
                              ? 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-300'
                              : 'bg-amber-500/20 border-amber-300 text-amber-200'
                  }`}
                >
                  صعوبة: {currentTaxiLv.difficultyLabel}
                </span>
              </div>
              <p className="text-sm text-slate-300">{currentTaxiLv.subtitle}</p>
            </div>

            {nextTaxiLv ? (
              <button
                type="button"
                onClick={onUpgradeTaxi}
                disabled={!canUpgradeTaxi}
                className={`min-h-[46px] px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-colors whitespace-nowrap ${
                  canUpgradeTaxi
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg'
                    : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {canUpgradeTaxi
                    ? `طوّر التاكسي للمستوى ${nextTaxiLv.level} (${nextTaxiLv.upgradeCost.toLocaleString('en-US')} ج.م)`
                    : `الترقية للمستوى ${nextTaxiLv.level} بـ ${nextTaxiLv.upgradeCost.toLocaleString('en-US')} ج.م`}
                </span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-sm font-black flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>وصل لأقصى تطور أسطوري (المستوى 7/7)</span>
              </div>
            )}
          </div>

          {/* 7-Level Evolution Track */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TAXI_LEVELS.map((lv) => {
              const reached = progress.taxiLevel >= lv.level;
              const isCurrent = progress.taxiLevel === lv.level;
              return (
                <div
                  key={lv.level}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    isCurrent
                      ? 'bg-[#1a2b42] border-amber-400'
                      : reached
                        ? 'bg-emerald-500/10 border-emerald-400/35'
                        : 'bg-[#0e1622] border-white/10 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-black text-amber-300">مستوى {lv.level}</span>
                    <span className="font-bold text-slate-300">{lv.difficultyLabel}</span>
                  </div>
                  <div className="text-xs font-mono text-white font-bold tabular-nums">
                    سرعة {lv.topSpeedKmh} كم/س · أجرة ×{lv.fareMultiplier.toFixed(2)}
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {lv.visualPerks.map((perk) => (
                      <li key={perk}>• {perk}</li>
                    ))}
                  </ul>
                  <div className="text-[11px] font-bold pt-1 border-t border-white/10 text-emerald-300">
                    {isCurrent
                      ? 'المستوى الحالي ✓'
                      : reached
                        ? 'تم التطوير ✓'
                        : `التكلفة: ${lv.upgradeCost} ج.م`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 Alexandria Districts (Corniche Free + 3 Paid Unlockable Districts) */}
      <div className="space-y-5 pt-6 border-t border-white/10">
        <div>
          <h2 className="text-xl font-black text-sky-300">
            مناطق ومدن مشاوير تاكسي الإسكندرية (تُفتح برصيد اللعبة)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            افتح منطقة أبو قير البلد والقطار المعلق العلوي، طريق الرأس السوداء ← فيكتوريا، ومدينة الأنفوشي برصيد المشاوير داخل اللعبة!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ALEX_DISTRICTS.map((dist) => {
            const isUnlocked = unlockedDistricts.includes(dist.id);
            const isSelected = selectedDistrictId === dist.id;
            const canAfford = progress.wallet >= dist.price;
            return (
              <div
                key={dist.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'bg-[#182638] border-amber-400'
                    : isUnlocked
                      ? 'bg-[#121C29] border-white/15'
                      : 'bg-[#0e1522] border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">{dist.icon}</span>
                      <span className="text-base font-black text-white">{dist.name}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-amber-300">
                      أجرة ×{dist.fareMultiplier.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{dist.subtitle}</p>
                  <div className="text-[11px] text-sky-300 font-bold bg-sky-500/10 border border-sky-400/25 rounded-lg px-2.5 py-1.5">
                    {dist.featureHighlight}
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onSelectDistrict(dist.id)}
                    disabled={isSelected}
                    className={`w-full min-h-[42px] px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35 cursor-default'
                        : 'bg-white/10 hover:bg-white/15 text-white'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    <span>{isSelected ? 'المنطقة النشطة الآن' : 'اختيار هذه المنطقة'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onBuyDistrict(dist.id, dist.price)}
                    disabled={!canAfford}
                    className={`w-full min-h-[42px] px-4 py-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 ${
                      canAfford
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {canAfford ? `فتح المنطقة الآن (${dist.price} ج.م)` : `تُفتح بـ ${dist.price} ج.م`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
