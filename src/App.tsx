import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Flag,
  Fuel,
  MapPin,
  Moon,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Sunset,
  TrendingUp,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ControlSettingsModal } from './components/ControlSettingsModal';
import { GameScene3D } from './components/GameScene3D';
import { GarageView } from './components/GarageView';
import { LandmarksView } from './components/LandmarksView';
import { MotoGarageScreen } from './components/MotoGarageScreen';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { RaceSetupScreen } from './components/RaceSetupScreen';
import { SeaSoundButton } from './components/SeaSoundButton';
import {
  ALEX_DISTRICTS,
  formatRaceTime,
  getAlexDistrictById,
  getMotoById,
  getTaxiLevelDef,
  getTodayDateKey,
  LANDMARKS,
  loadControlSettings,
  loadProgress,
  loadRaceConfig,
  saveControlSettings,
  saveProgress,
  saveRaceConfig,
  TAXI_LEVELS,
  TIME_OF_DAY_OPTIONS,
  UPGRADE_INFO,
  VEHICLE_UNLOCK_TIERS,
} from './game/data';
import { soundFX } from './game/sound';
import {
  ActiveTab,
  AlexDistrictId,
  AtmosphereMode,
  CameraMode,
  ControlSettings,
  GameMode,
  GameState,
  HudSnapshot,
  MotoTuningConfig,
  PlayerProgress,
  PlayerVehicleKind,
  RaceBikeId,
  RaceConfig,
  RunSummary,
  UpgradeLevels,
} from './game/types';

import heroTaxiImage from './assets/images/alexandria_taxi_corniche.webp';

const INITIAL_HUD: HudSnapshot = {
  speedKmh: 28,
  topSpeedKmh: 28,
  rpm: 3600,
  gear: 2,
  rpmRatio: 0.28,
  fuel: 100,
  maxFuel: 100,
  health: 100,
  maxHealth: 100,
  earnings: 0,
  points: 0,
  tripsCompleted: 0,
  passengersLoaded: 0,
  maxPassengers: 0,
  violationsStopped: 0,
  nearMisses: 0,
  stuntCombo: 1,
  activeStunt: 'none',
  distanceM: 0,
  routeProgressPct: 0,
  currentLandmark: 'بوابة المنتزه والمندرة',
  nextLandmark: 'مسجد سيدي بشر وميامي',
  streetBanner: 'طريق الجيش · المندرة والمنتزه',
  timeLeftSec: null,
  passenger: null,
  toastMessage: null,
  gameOverReason: null,
  reachedMandara: false,
  signalWarning: null,
  sirenActive: false,
  checkpointPrompt: null,
};

const CAMERA_LABELS: Record<CameraMode, string> = {
  hood: 'السائق POV',
  chase: 'خلفية',
  aerial: 'بانوراما',
};

const MODE_LABELS: Record<GameMode, string> = {
  taxi_classic: 'تاكسي الإسكندرية',
  mashrou3: 'مشروع (ميكروباص الكورنيش)',
  motorcycle: 'موتوسيكل وسكوتر (بطل الإسكندرية)',
  police_patrol: 'تاكسي الإسكندرية',
  race: 'تحدي الأبطال',
  traffic_officer: 'تاكسي الإسكندرية',
  superhero: 'بطل الإسكندرية (الشبح الكربوني)',
};

const VEHICLE_LABELS: Record<PlayerVehicleKind, string> = {
  vespa: 'موتوسيكل سبورت وسكوتر (POV)',
  black_supermoto: 'شبح الإسكندرية الكربوني',
  taxi: 'التاكسي الأصفر بالعداد',
  mashrou3: 'ميكروباص مشروع أبيض',
  police_car: 'التاكسي الأصفر بالعداد',
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [activeTab, setActiveTab] = useState<ActiveTab>('play');
  // Real City uses Taxi / Mashrou3 while ALL Motorcycle & Vespa play lives inside Racing & Hero of Alexandria
  const [mode, setMode] = useState<GameMode>('taxi_classic');
  const [playerVehicleKind, setPlayerVehicleKind] = useState<PlayerVehicleKind>('taxi');
  const [streetModeChoice, setStreetModeChoice] = useState<{ mode: GameMode; vehicle: PlayerVehicleKind }>({
    mode: 'taxi_classic',
    vehicle: 'taxi',
  });
  const [riderModalOpen, setRiderModalOpen] = useState(false);

  const [cameraMode, setCameraMode] = useState<CameraMode>('hood');
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>('sunset');
  const [controls, setControls] = useState<ControlSettings>(() => loadControlSettings());
  const [raceConfig, setRaceConfig] = useState<RaceConfig>(() => loadRaceConfig());
  const [controlsModalOpen, setControlsModalOpen] = useState(false);

  const [runId, setRunId] = useState(1);
  const [muted, setMuted] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [lastSummary, setLastSummary] = useState<RunSummary | null>(null);
  const [introHintVisible, setIntroHintVisible] = useState(false);
  const creditedEarningsRef = useRef(0);
  const creditedTripsRef = useRef(0);

  const inActiveRun = gameState === 'PLAYING' || gameState === 'PAUSED';
  useEffect(() => {
    if (!inActiveRun) {
      setIntroHintVisible(false);
      return;
    }
    setIntroHintVisible(true);
    const timer = window.setTimeout(() => setIntroHintVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [runId, inActiveRun]);

  useEffect(() => {
    const checkOrient = () => {
      setIsMobilePortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    checkOrient();
    window.addEventListener('resize', checkOrient);
    return () => window.removeEventListener('resize', checkOrient);
  }, []);

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const handleChangeControls = (next: ControlSettings) => {
    setControls(next);
    saveControlSettings(next);
  };

  const handleChangeRaceConfig = (next: RaceConfig) => {
    setRaceConfig(next);
    saveRaceConfig(next);
  };

  const openSetupFor = (chosenMode: GameMode, chosenVehicle: PlayerVehicleKind) => {
    setMode(chosenMode);
    setPlayerVehicleKind(chosenVehicle);
    if (chosenVehicle === 'taxi') {
      setCameraMode('chase');
    }
    setControlsModalOpen(true);
  };

  const launchDrive = useCallback(() => {
    creditedEarningsRef.current = 0;
    creditedTripsRef.current = 0;
    setControlsModalOpen(false);
    setRiderModalOpen(false);
    soundFX.startSeaAmbience();
    setActiveTab('play');
    setLastSummary(null);
    setHud(INITIAL_HUD);
    setRunId((n) => n + 1);
    setGameState('PLAYING');
  }, []);

  const launchConfiguredRace = useCallback(() => {
    const unlocked = progress.unlockedMotos ?? ['vespa_lv1'];
    const targetId = unlocked.includes(raceConfig.bikeId)
      ? raceConfig.bikeId
      : (progress.selectedMotoId ?? 'vespa_lv1');
    const chosenBike = getMotoById(targetId);
    if (targetId !== raceConfig.bikeId) {
      const nextCfg = { ...raceConfig, bikeId: targetId };
      setRaceConfig(nextCfg);
      saveRaceConfig(nextCfg);
    }
    setMode('race');
    setCameraMode('hood');
    setPlayerVehicleKind(chosenBike.vehicleKind);
    launchDrive();
  }, [launchDrive, progress.selectedMotoId, progress.unlockedMotos, raceConfig]);

  const handleSaveMotoTuning = useCallback(
    (nextTuning: MotoTuningConfig, newlyPurchasedKeys?: string[], totalCost = 0) => {
      updateProgress((prev) => {
        const nextOwned =
          newlyPurchasedKeys && newlyPurchasedKeys.length > 0
            ? Array.from(new Set([...(prev.ownedMotoParts ?? []), ...newlyPurchasedKeys]))
            : prev.ownedMotoParts;
        return {
          ...prev,
          wallet: Math.max(0, prev.wallet - totalCost),
          motoTuning: nextTuning,
          ownedMotoParts: nextOwned,
        };
      });
    },
    [updateProgress],
  );

  const launchTunedAreesMoto = useCallback(
    (tuning: MotoTuningConfig) => {
      const activeMoto = getMotoById(progress.selectedMotoId);
      setMode('superhero');
      setPlayerVehicleKind(
        activeMoto.isVespa || tuning.chassis === 'vespa' ? 'vespa' : 'black_supermoto',
      );
      setCameraMode('hood');
      launchDrive();
    },
    [launchDrive, progress.selectedMotoId],
  );

  const handleBackFromPlay = useCallback(() => {
    setControlsModalOpen(false);
    setActiveTab('play');
    if (mode === 'race') {
      setGameState('RACE_SETUP');
    } else if (mode === 'superhero') {
      setGameState('MOTO_GARAGE');
    } else {
      setGameState('TITLE_MENU');
    }
  }, [mode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (controlsModalOpen) {
        setControlsModalOpen(false);
        return;
      }
      if (riderModalOpen) {
        setRiderModalOpen(false);
        return;
      }
      if (gameState === 'RACE_SETUP' || gameState === 'MOTO_GARAGE') {
        setActiveTab('play');
        setGameState('TITLE_MENU');
        return;
      }
      if (gameState === 'TITLE_MENU' && activeTab !== 'play') {
        setActiveTab('play');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, controlsModalOpen, gameState, riderModalOpen]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
    if (!next && gameState === 'PLAYING') {
      soundFX.startSeaAmbience();
    }
  };

  const handleCycleCamera = useCallback(() => {
    setCameraMode((prev) =>
      prev === 'hood' ? 'chase' : prev === 'chase' ? 'aerial' : 'hood',
    );
  }, []);

  const handleInstantEarn = useCallback(
    (amount: number, tripCompleted = false) => {
      if (amount <= 0 && !tripCompleted) return;
      const safeAmt = Math.max(0, Math.round(amount));
      creditedEarningsRef.current += safeAmt;
      if (tripCompleted) creditedTripsRef.current += 1;
      const today = getTodayDateKey();
      updateProgress((prev) => {
        const sameDay = prev.dailyDate === today;
        return {
          ...prev,
          wallet: prev.wallet + safeAmt,
          dailyEarnings: (sameDay ? (prev.dailyEarnings ?? 0) : 0) + safeAmt,
          dailyTrips: (sameDay ? (prev.dailyTrips ?? 0) : 0) + (tripCompleted ? 1 : 0),
          dailyDate: today,
          totalTrips: prev.totalTrips + (tripCompleted ? 1 : 0),
        };
      });
    },
    [updateProgress],
  );

  const handleSpendMoney = useCallback(
    (amount: number) => {
      const safeAmt = Math.max(0, Math.round(amount));
      if (safeAmt <= 0) return;
      updateProgress((prev) => ({
        ...prev,
        wallet: Math.max(0, prev.wallet - safeAmt),
      }));
    },
    [updateProgress],
  );

  const handleGameOver = useCallback(
    (summary: RunSummary) => {
      let isNewRecord = false;
      if (summary.raceTrackId && summary.raceTimeSec !== undefined && !summary.fellDuringStunt && summary.reachedMandara) {
        const prevBest = progress.bestRaceTimes?.[summary.raceTrackId];
        isNewRecord = prevBest === undefined || summary.raceTimeSec < prevBest;
      }
      setLastSummary({ ...summary, isNewRecord });
      setGameState('GAME_OVER');
      const remainingEarnings = Math.max(0, summary.earnings - creditedEarningsRef.current);
      const remainingTrips = Math.max(0, summary.tripsCompleted - creditedTripsRef.current);
      const today = getTodayDateKey();
      updateProgress((prev) => {
        const nextBestTimes = { ...(prev.bestRaceTimes ?? {}) };
        if (summary.raceTrackId && summary.raceTimeSec !== undefined && !summary.fellDuringStunt && summary.reachedMandara) {
          const existing = nextBestTimes[summary.raceTrackId];
          if (existing === undefined || summary.raceTimeSec < existing) {
            nextBestTimes[summary.raceTrackId] = summary.raceTimeSec;
          }
        }
        const sameDay = prev.dailyDate === today;
        return {
          ...prev,
          wallet: prev.wallet + remainingEarnings,
          dailyEarnings: (sameDay ? (prev.dailyEarnings ?? 0) : 0) + remainingEarnings,
          dailyTrips: (sameDay ? (prev.dailyTrips ?? 0) : 0) + remainingTrips,
          dailyDate: today,
          totalPoints: prev.totalPoints + summary.points,
          bestEarnings: Math.max(prev.bestEarnings, summary.earnings),
          bestTrips: Math.max(prev.bestTrips, summary.tripsCompleted),
          totalTrips: prev.totalTrips + remainingTrips,
          mandaraCompletedCount:
            prev.mandaraCompletedCount + (summary.reachedMandara ? 1 : 0),
          bestRaceTimes: nextBestTimes,
        };
      });
    },
    [progress.bestRaceTimes, updateProgress],
  );

  const handleSelectMoto = useCallback(
    (motoId: RaceBikeId) => {
      const moto = getMotoById(motoId);
      updateProgress((prev) => {
        if (!(prev.unlockedMotos ?? ['vespa_lv1']).includes(motoId)) return prev;
        return {
          ...prev,
          selectedMotoId: motoId,
          motoTuning: prev.motoTuning
            ? {
                ...prev.motoTuning,
                chassis: moto.isVespa ? 'vespa' : 'sport',
                engineSound: moto.engineSound,
              }
            : prev.motoTuning,
        };
      });
      setRaceConfig((prev) => {
        const next = { ...prev, bikeId: motoId };
        saveRaceConfig(next);
        return next;
      });
    },
    [updateProgress],
  );

  const handleBuyMoto = useCallback(
    (motoId: RaceBikeId, price: number) => {
      const moto = getMotoById(motoId);
      updateProgress((prev) => {
        const owned = prev.unlockedMotos ?? ['vespa_lv1'];
        if (prev.wallet < price || owned.includes(motoId)) return prev;
        return {
          ...prev,
          wallet: prev.wallet - price,
          unlockedMotos: [...owned, motoId],
          selectedMotoId: motoId,
          motoTuning: prev.motoTuning
            ? {
                ...prev.motoTuning,
                chassis: moto.isVespa ? 'vespa' : 'sport',
                bodyColor: moto.paintCss,
                engineSound: moto.engineSound,
              }
            : prev.motoTuning,
        };
      });
      setRaceConfig((prev) => {
        const next = { ...prev, bikeId: motoId };
        saveRaceConfig(next);
        return next;
      });
    },
    [updateProgress],
  );

  const handleUpgradeTaxi = () => {
    updateProgress((prev) => {
      const currentLv = Math.max(1, Math.min(TAXI_LEVELS.length, prev.taxiLevel ?? 1));
      if (currentLv >= TAXI_LEVELS.length) return prev;
      const nextDef = TAXI_LEVELS[currentLv];
      if (!nextDef || prev.wallet < nextDef.upgradeCost) return prev;
      return {
        ...prev,
        wallet: prev.wallet - nextDef.upgradeCost,
        taxiLevel: currentLv + 1,
      };
    });
  };

  const handleSelectDistrict = (districtId: AlexDistrictId) => {
    updateProgress((prev) => {
      const owned = prev.unlockedDistricts ?? ['corniche'];
      if (!owned.includes(districtId)) return prev;
      return { ...prev, selectedDistrictId: districtId };
    });
  };

  const handleBuyDistrict = (districtId: AlexDistrictId, price: number) => {
    const targetDist = getAlexDistrictById(districtId);
    updateProgress((prev) => {
      const owned = prev.unlockedDistricts ?? ['corniche'];
      if (prev.wallet < price || owned.includes(districtId)) return prev;
      if (targetDist.requiresAllOtherDistricts) {
        const requiredIds = ALEX_DISTRICTS.filter((d) => !d.requiresAllOtherDistricts).map((d) => d.id);
        if (!requiredIds.every((id) => owned.includes(id))) return prev;
      }
      return {
        ...prev,
        wallet: prev.wallet - price,
        unlockedDistricts: [...owned, districtId],
        selectedDistrictId: districtId,
      };
    });
  };

  const handleBuyUpgrade = (key: keyof UpgradeLevels, cost: number) => {
    const maxLevel = UPGRADE_INFO[key].maxLevel;
    updateProgress((prev) => {
      if (prev.wallet < cost || prev.upgrades[key] >= maxLevel) return prev;
      return {
        ...prev,
        wallet: prev.wallet - cost,
        upgrades: {
          ...prev.upgrades,
          [key]: prev.upgrades[key] + 1,
        },
      };
    });
  };

  const isPlayingOrPaused =
    gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'GAME_OVER';

  // Compute unlock progress bar toward next vehicle tier
  const nextTier =
    VEHICLE_UNLOCK_TIERS.find((t) => progress.totalPoints < t.requiredPoints) ??
    VEHICLE_UNLOCK_TIERS[VEHICLE_UNLOCK_TIERS.length - 1];
  const prevTierPoints =
    VEHICLE_UNLOCK_TIERS.filter((t) => progress.totalPoints >= t.requiredPoints).pop()
      ?.requiredPoints ?? 0;
  const tierSpan = Math.max(1, nextTier.requiredPoints - prevTierPoints);
  const unlockPct =
    progress.totalPoints >= nextTier.requiredPoints
      ? 100
      : Math.min(100, Math.round(((progress.totalPoints - prevTierPoints) / tierSpan) * 100));

  const cycleAtmosphere = () => {
    setAtmosphere((a) => (a === 'day' ? 'sunset' : a === 'sunset' ? 'night' : 'day'));
  };

  const currentTod = TIME_OF_DAY_OPTIONS.find((t) => t.id === atmosphere) ?? TIME_OF_DAY_OPTIONS[0];

  return (
    <div
      className="min-h-dvh w-full text-slate-100 flex flex-col overflow-x-hidden"
      style={{ background: 'transparent' }}
    >
      {/* Main Menu Screen ("ملك الكورنيش: إسكندرية 3D") */}
      {gameState === 'TITLE_MENU' && activeTab === 'play' && (
        <div
          id="main-menu"
          className="relative w-screen h-dvh overflow-hidden flex flex-col justify-between p-4 sm:px-7 sm:py-5"
          style={{
            backgroundColor: '#090d16',
          }}
        >
          {/* Local Night Alexandria Coastal Backdrop Photo + Warm Amber Vignette (Zero External URLs) */}
          <img
            src={heroTaxiImage}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(255, 165, 0, 0.16), rgba(9, 13, 22, 0.92))',
            }}
          />

          {/* Portrait Rotation Recommendation Banner (dismissible so mobile portrait never locks) */}
          {isMobilePortrait && !portraitDismissed && (
            <div className="fixed inset-0 z-50 bg-[#090d16]/95 flex flex-col items-center justify-center text-center p-6 gap-4">
              <div className="text-4xl" aria-hidden="true">📱🔄</div>
              <div className="text-xl font-black text-[#ffd700]">من فضلك قم بتدوير الهاتف بالعرض</div>
              <p className="text-xs text-slate-300 max-w-xs">
                اللعبة مصممة لتجربة قيادة واقعية رائعة بالوضع الأفقي (Landscape)
              </p>
              <button
                type="button"
                onClick={() => setPortraitDismissed(true)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-[#d4af37] text-sm font-bold text-white"
              >
                متابعة بالطول
              </button>
            </div>
          )}

          {/* Top Bar */}
          <header className="relative z-10 flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('garage')}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#0f141e]/85 hover:bg-[#192334] border-[1.5px] border-[#d4af37] text-[#ffd700] font-bold text-xs sm:text-sm flex items-center gap-1.5 backdrop-blur-sm transition-all hover:scale-105 shadow-md"
              >
                <span aria-hidden="true">🔧</span>
                <span>الجراج (GARAGE)</span>
              </button>

              <button
                type="button"
                onClick={() => setRiderModalOpen(true)}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#0f141e]/85 hover:bg-[#192334] border-[1.5px] border-[#d4af37] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 backdrop-blur-sm transition-all hover:scale-105 shadow-md"
              >
                <span aria-hidden="true">🚕</span>
                <span>التاكسي والمناطق</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="hidden sm:flex px-3 py-1.5 sm:py-2 rounded-xl bg-[#0f141e]/85 border-[1.5px] border-emerald-400/60 text-emerald-300 font-extrabold text-xs items-center gap-1.5 font-mono tabular-nums shadow-md">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>إيراد اليوم: {progress.dailyEarnings ?? 0} ج.م</span>
              </div>

              <div className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#0f141e]/85 border-[1.5px] border-[#ffd700] text-[#ffd700] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 font-mono tabular-nums shadow-md">
                <span aria-hidden="true">💰</span>
                <span>{progress.wallet} ج.م</span>
              </div>

              <SeaSoundButton />

              <PWAInstallButton />

              <button
                type="button"
                onClick={() => setControlsModalOpen(true)}
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#0f141e]/85 hover:bg-[#192334] border-[1.5px] border-[#d4af37] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 backdrop-blur-sm transition-all hover:scale-105 shadow-md"
              >
                <span aria-hidden="true">⚙️</span>
                <span>الإعدادات</span>
              </button>
            </div>
          </header>

          {/* Center Title Section */}
          <div className="relative z-10 text-center my-auto py-2">
            <h1
              className="text-3xl sm:text-5xl font-black text-[#ffd700] tracking-tight leading-tight"
              style={{ textShadow: '0 4px 18px rgba(255, 215, 0, 0.45)' }}
            >
              ملك الكورنيش: إسكندرية 3D
            </h1>
            <p className="text-[11px] sm:text-sm font-bold text-[#a0b2c6] tracking-[0.18em] mt-1.5 uppercase">
              KING OF CORNICHE • ALEXANDRIA 3D
            </p>
            <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] text-slate-300">
              <span>{VEHICLE_LABELS[streetModeChoice.vehicle]}</span>
              <span className="text-white/25" aria-hidden="true">•</span>
              <button
                type="button"
                onClick={cycleAtmosphere}
                className="text-amber-300 hover:text-amber-200 font-bold underline underline-offset-4"
              >
                التوقيت: {currentTod.label} ({currentTod.badge})
              </button>
            </div>
          </div>

          {/* Bottom 3 Game Mode Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-4xl mx-auto">
            {/* 1. مشاوير تاكسي الإسكندرية -> opens Taxi Evolution (4 levels) & 4 Districts Hub */}
            <button
              type="button"
              onClick={() => {
                setStreetModeChoice({ mode: 'taxi_classic', vehicle: 'taxi' });
                setMode('taxi_classic');
                setPlayerVehicleKind('taxi');
                setCameraMode('chase');
                setRiderModalOpen(true);
              }}
              className="group rounded-2xl bg-[#121926]/88 hover:bg-[#1e293d]/95 border border-[#ffd700]/45 hover:border-[#ffd700] p-3.5 sm:p-5 text-center backdrop-blur-md transition-all hover:-translate-y-1.5 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">🚕</span>
              <div className="text-base sm:text-lg font-extrabold text-white group-hover:text-[#ffd700] transition-colors">
                مشاوير تاكسي الإسكندرية
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-[#ffd700] tracking-wider uppercase">
                {getAlexDistrictById(progress.selectedDistrictId).name} · مستوى {progress.taxiLevel}
              </div>
            </button>

            {/* 2. تحدي الأبطال -> opens Champions Challenge Setup Screen */}
            <button
              type="button"
              onClick={() => {
                setMode('race');
                setCameraMode('hood');
                setActiveTab('play');
                setGameState('RACE_SETUP');
              }}
              className="group rounded-2xl bg-[#121926]/88 hover:bg-[#1e293d]/95 border border-white/15 hover:border-[#ffd700] p-3.5 sm:p-5 text-center backdrop-blur-md transition-all hover:-translate-y-1.5 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">🏆</span>
              <div className="text-base sm:text-lg font-extrabold text-white group-hover:text-[#ffd700] transition-colors">
                تحدي الأبطال
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-[#94a3b8] tracking-wider uppercase">
                CHAMPIONS CHALLENGE
              </div>
            </button>

            {/* 3. بطل الإسكندرية -> opens 360° 3D Corniche Garage & Tuning System */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('play');
                setGameState('MOTO_GARAGE');
              }}
              className="group rounded-2xl bg-[#121926]/88 hover:bg-[#1e293d]/95 border border-white/15 hover:border-[#ffd700] p-3.5 sm:p-5 text-center backdrop-blur-md transition-all hover:-translate-y-1.5 shadow-xl cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span className="text-3xl sm:text-4xl mb-1" aria-hidden="true">🏍️</span>
              <div className="text-base sm:text-lg font-extrabold text-white group-hover:text-[#ffd700] transition-colors">
                بطل الإسكندرية
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-[#94a3b8] tracking-wider uppercase">
                ALEXANDRIA HERO
              </div>
            </button>
          </div>

          {/* Bottom Copyright Footer */}
          <footer className="relative z-10 text-center text-[11px] sm:text-xs text-[#64748b] pt-2">
            إصدار الموبايل 1.0 • جميع الحقوق محفوظة
          </footer>
        </div>
      )}

      {/* Race Setup Screen ("إعداد السباق") */}
      {gameState === 'RACE_SETUP' && (
        <RaceSetupScreen
          config={raceConfig}
          progress={progress}
          riderStyle="green_tracksuit"
          onChangeConfig={handleChangeRaceConfig}
          onSelectMoto={handleSelectMoto}
          onBuyMoto={handleBuyMoto}
          onOpenControls={() => setControlsModalOpen(true)}
          onBackToMenu={() => {
            setActiveTab('play');
            setGameState('TITLE_MENU');
          }}
          onStartRace={launchConfiguredRace}
        />
      )}

      {/* Hero of Alexandria 360° 3D Motorcycle & Vespa Garage & Tuning Screen */}
      {gameState === 'MOTO_GARAGE' && (
        <MotoGarageScreen
          progress={progress}
          onSaveTuning={handleSaveMotoTuning}
          onSelectMoto={handleSelectMoto}
          onBuyMoto={handleBuyMoto}
          onBuyUpgrade={handleBuyUpgrade}
          onLaunchCorniche={launchTunedAreesMoto}
          onBackToMenu={() => {
            setActiveTab('play');
            setGameState('TITLE_MENU');
          }}
        />
      )}

      {/* Garage & Landmarks Sub-Views (reachable from Top Bar / Rider Modal) */}
      {!isPlayingOrPaused &&
        gameState !== 'RACE_SETUP' &&
        gameState !== 'MOTO_GARAGE' &&
        activeTab !== 'play' && (
        <div className="min-h-dvh flex flex-col bg-[#0B121C]">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0D1623]/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('play')}
              aria-label="رجوع للرئيسية"
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-amber-400/40 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shrink-0 transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-amber-400" />
              <span>رجوع</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <SeaSoundButton />
              <button
                type="button"
                onClick={() => setActiveTab('garage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  activeTab === 'garage' ? 'bg-yellow-400 text-slate-950' : 'bg-white/5 text-slate-300'
                }`}
              >
                الجراج والتطوير
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('landmarks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  activeTab === 'landmarks' ? 'bg-yellow-400 text-slate-950' : 'bg-white/5 text-slate-300'
                }`}
              >
                معالم المندرة ← بحري ({LANDMARKS.length})
              </button>
            </div>
          </header>

          {activeTab === 'garage' && (
            <main className="flex-1">
              <GarageView
                progress={progress}
                onSelectMoto={handleSelectMoto}
                onBuyMoto={handleBuyMoto}
                onUpgradeTaxi={handleUpgradeTaxi}
                onSelectDistrict={handleSelectDistrict}
                onBuyDistrict={handleBuyDistrict}
                onBuyUpgrade={handleBuyUpgrade}
                onStartPlay={() => setControlsModalOpen(true)}
              />
            </main>
          )}

          {activeTab === 'landmarks' && (
            <main className="flex-1">
              <LandmarksView onStartPlay={() => setControlsModalOpen(true)} />
            </main>
          )}
        </div>
      )}

      {/* Alexandria Taxi City Hub Modal: Single 7-Level Self-Evolving Taxi + Alexandria Districts */}
      {riderModalOpen && (() => {
        const curTaxi = getTaxiLevelDef(progress.taxiLevel);
        const nextTaxi = progress.taxiLevel < TAXI_LEVELS.length ? TAXI_LEVELS[progress.taxiLevel] : null;
        const canUpgradeTaxi = Boolean(nextTaxi && progress.wallet >= nextTaxi.upgradeCost);
        const unlockedDistricts = progress.unlockedDistricts ?? ['corniche'];
        const activeDist = getAlexDistrictById(progress.selectedDistrictId);

        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-2xl rounded-2xl bg-[#0B111A] border-2 border-[#d4af37] shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[94dvh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRiderModalOpen(false)}
                    aria-label="رجوع"
                    className="min-h-[40px] px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-[#ffd700]/40 text-white font-extrabold text-xs flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 text-[#ffd700]" />
                    <span>رجوع</span>
                  </button>
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black text-[#ffd700] leading-tight">
                      مشاوير تاكسي الإسكندرية
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      طوّر تاكسي الإسكندرية (7 مستويات من سهل إلى أسطوري) وافتح المناطق الجديدة بالفلوس!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono font-black text-xs tabular-nums">
                    💰 {progress.wallet} ج.م
                  </div>
                  <button
                    type="button"
                    onClick={() => setRiderModalOpen(false)}
                    aria-label="إغلاق"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. Single Self-Evolving Alexandria Taxi (7 Levels: Easy -> Legendary Hard) */}
              <div className="p-4 rounded-xl bg-[#131f30] border border-[#ffd700]/45 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      🚕 تاكسي الإسكندرية المتطور (7 مستويات · يتطور تلقائياً بالدفع)
                    </div>
                    <div className="text-sm sm:text-base font-black text-white mt-0.5">
                      {curTaxi.name} — صعوبة: {curTaxi.difficultyLabel}
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    {curTaxi.topSpeedKmh} كم/س · أجرة ×{curTaxi.fareMultiplier.toFixed(2)}
                  </div>
                </div>

                {/* 7 Progress Steps */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {TAXI_LEVELS.map((lv) => {
                    const done = progress.taxiLevel >= lv.level;
                    return (
                      <div
                        key={lv.level}
                        className={`px-1.5 py-1.5 rounded-lg border text-center ${
                          done
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <div className="text-[10px] font-black">مستوى {lv.level}</div>
                        <div className="text-[9px] font-bold truncate">{lv.difficultyLabel}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-slate-300">
                    {curTaxi.visualPerks.join(' · ')}
                  </div>
                  {nextTaxi ? (
                    <button
                      type="button"
                      onClick={handleUpgradeTaxi}
                      disabled={!canUpgradeTaxi}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-colors whitespace-nowrap ${
                        canUpgradeTaxi
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {canUpgradeTaxi
                        ? `⬆️ طوّر للمستوى ${nextTaxi.level} (${nextTaxi.difficultyLabel}) · ${nextTaxi.upgradeCost.toLocaleString('en-US')} ج.م`
                        : `تحتاج ${nextTaxi.upgradeCost.toLocaleString('en-US')} ج.م للمستوى ${nextTaxi.level}`}
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-black">
                      ✓ أقصى مستوى أسطوري (7/7)
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Choose or Unlock Alexandria Districts & Ultimate Connected City */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  اختر المنطقة أو افتح طريق جديد بالفلوس — وعند فتح جميع المناطق الـ ٥ يمكنك ربط الإسكندرية كلها في مدينة واحدة!
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ALEX_DISTRICTS.map((dist) => {
                    const owned = unlockedDistricts.includes(dist.id);
                    const active = activeDist.id === dist.id;
                    const baseDistricts = ALEX_DISTRICTS.filter((d) => !d.requiresAllOtherDistricts);
                    const ownedBaseCount = baseDistricts.filter((d) => unlockedDistricts.includes(d.id)).length;
                    const meetsPrereq = !dist.requiresAllOtherDistricts || ownedBaseCount >= baseDistricts.length;
                    const canAfford = progress.wallet >= dist.price && meetsPrereq;
                    const isGrand = Boolean(dist.requiresAllOtherDistricts);
                    return (
                      <div
                        key={dist.id}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-colors ${
                          isGrand ? 'sm:col-span-2' : ''
                        } ${
                          active
                            ? 'bg-[#1a2c44] border-[#ffd700]'
                            : isGrand
                              ? owned
                                ? 'bg-gradient-to-l from-amber-950/55 via-[#172133] to-slate-900 border-amber-400/50'
                                : 'bg-gradient-to-l from-amber-950/35 via-[#101827] to-[#0d1420] border-amber-500/35'
                              : owned
                                ? 'bg-[#121C29] border-white/15'
                                : 'bg-[#0e1522] border-white/10'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${isGrand ? 'text-amber-300' : 'text-white'}`}>
                              <span aria-hidden="true">{dist.icon}</span>
                              <span>{dist.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
                              أجرة ×{dist.fareMultiplier.toFixed(2)}
                            </span>
                          </div>
                          <div className={`text-[10px] font-bold leading-snug ${isGrand ? 'text-amber-100/90' : 'text-sky-300'}`}>
                            {dist.featureHighlight}
                          </div>
                          {isGrand && !owned && (
                            <div className="text-[10px] font-black text-emerald-300 pt-0.5">
                              تقدم فتح المستويات والمناطق: {ownedBaseCount} / {baseDistricts.length} {meetsPrereq ? '✓ جاهز لربط المدينة كلها!' : '· افتح باقي المناطق أولاً'}
                            </div>
                          )}
                        </div>

                        {owned ? (
                          <button
                            type="button"
                            onClick={() => handleSelectDistrict(dist.id)}
                            className={`w-full py-1.5 rounded-lg text-xs font-black transition-colors ${
                              active
                                ? 'bg-[#ffd700] text-slate-950'
                                : 'bg-white/10 hover:bg-white/15 text-white'
                            }`}
                          >
                            {active ? (isGrand ? '👑 المدينة المترابطة المختارة ✓' : 'المنطقة المختارة ✓') : (isGrand ? '👑 اختر الإسكندرية الكاملة المترابطة' : 'اختيار المنطقة')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuyDistrict(dist.id, dist.price)}
                            disabled={!canAfford}
                            className={`w-full py-1.5 rounded-lg text-xs font-black transition-colors ${
                              canAfford
                                ? isGrand
                                  ? 'bg-[#ffd700] hover:bg-amber-300 text-slate-950'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                : 'bg-white/5 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {!meetsPrereq
                              ? `🔒 افتح جميع المناطق الـ ${baseDistricts.length} أولاً (${ownedBaseCount}/${baseDistricts.length}) · السعر ${dist.price.toLocaleString('en-US')} ج.م`
                              : canAfford
                                ? isGrand
                                  ? `👑 اربط المدينة كلها الآن! (${dist.price.toLocaleString('en-US')} ج.م)`
                                  : `🔓 افتح المنطقة الآن (${dist.price.toLocaleString('en-US')} ج.م)`
                                : `🔒 مقفولة · تُفتح بـ ${dist.price.toLocaleString('en-US')} ج.م`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setRiderModalOpen(false);
                    setActiveTab('landmarks');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sky-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>خريطة المعالم</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRiderModalOpen(false);
                    openSetupFor('taxi_classic', 'taxi');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#ffd700] hover:bg-yellow-300 text-slate-950 font-extrabold text-sm flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>انزل {activeDist.name}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pre-Play Control Settings Popup ("هتسوق إزاي؟") */}
      <ControlSettingsModal
        open={controlsModalOpen}
        controls={controls}
        atmosphere={atmosphere}
        modeTitle={MODE_LABELS[mode]}
        vehicleTitle={VEHICLE_LABELS[playerVehicleKind]}
        onChangeControls={handleChangeControls}
        onChangeAtmosphere={setAtmosphere}
        onStartGo={mode === 'race' ? launchConfiguredRace : launchDrive}
        onClose={() => setControlsModalOpen(false)}
      />

      {isPlayingOrPaused && (
        <main
          className="fixed inset-0 z-20 overflow-hidden m-0 p-0"
          style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', background: 'transparent' }}
        >
          {/* Full-Screen 3D Game Canvas starting strictly at y = 0 */}
          <div
            className="absolute inset-0 m-0 p-0"
            style={{ top: 0, left: 0, width: '100%', height: '100%', background: 'transparent' }}
          >
            <GameScene3D
              gameState={gameState}
              mode={mode}
              playerVehicleKind={playerVehicleKind}
              cameraMode={cameraMode}
              atmosphere={atmosphere}
              controlSettings={controls}
              progress={progress}
              raceConfig={raceConfig}
              runId={runId}
              onHudUpdate={setHud}
              onInstantEarn={handleInstantEarn}
              onSpendMoney={handleSpendMoney}
              onGameOver={handleGameOver}
              onCycleCamera={handleCycleCamera}
            />
          </div>

          {/* Direct Floating Transparent Overlay at position: absolute, top: 10px — Works cleanly in Portrait & Landscape with ZERO black box */}
          <div
            className="pointer-events-auto flex flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.92)]"
            style={{
              position: 'absolute',
              top: 'max(10px, env(safe-area-inset-top))',
              left: 'max(10px, env(safe-area-inset-left))',
              right: 'max(10px, env(safe-area-inset-right))',
              zIndex: 30,
              background: 'transparent',
            }}
          >
            {/* Right side (RTL start): Back + Speed + Money + Points + Fuel */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0" style={{ background: 'transparent' }}>
              <button
                type="button"
                onClick={handleBackFromPlay}
                aria-label="رجوع"
                className="border-0 p-0 text-white font-extrabold text-[11px] flex items-center gap-0.5 whitespace-nowrap active:opacity-60"
                style={{ background: 'transparent' }}
              >
                <ArrowRight className="w-3.5 h-3.5 text-white" />
                <span>رجوع</span>
              </button>

              <span className="text-[11px] font-extrabold text-white font-mono tabular-nums whitespace-nowrap">
                {hud.points}
              </span>

              {mode === 'race' ? (
                <>
                  <span className="flex items-center gap-0.5 text-[11px] font-extrabold text-white whitespace-nowrap">
                    <Flag className="w-3 h-3" />
                    <span>{hud.raceLap ?? 1}/{hud.raceTotalLaps ?? 1}</span>
                  </span>
                  <span className="text-[11px] font-extrabold font-mono tabular-nums text-white whitespace-nowrap">
                    {formatRaceTime(hud.raceTimeSec ?? 0)}
                  </span>
                  {raceConfig.subMode === 'race' && (
                    <span className="flex items-center gap-0.5 text-[11px] font-extrabold text-white whitespace-nowrap">
                      <Trophy className="w-3 h-3" />
                      <span>#{hud.racePosition ?? 1}</span>
                    </span>
                  )}
                </>
              ) : mode === 'mashrou3' ? (
                <span className="flex items-center gap-0.5 text-[11px] font-extrabold text-white whitespace-nowrap">
                  <Users className="w-3 h-3" />
                  <span>{hud.passengersLoaded}/14</span>
                </span>
              ) : (
                <span className="text-[11px] font-extrabold text-white font-mono tabular-nums whitespace-nowrap">
                  {hud.earnings}ج
                </span>
              )}

              <span className="text-[11px] font-mono font-extrabold text-white whitespace-nowrap">
                {hud.speedKmh} كم/س
              </span>

              <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold text-white/95 whitespace-nowrap">
                <Fuel className="w-2.5 h-2.5 text-white" />
                <span>{Math.round((hud.fuel / hud.maxFuel) * 100)}%</span>
              </span>

              {hud.timeLeftSec !== null && (
                <span className="text-white font-mono text-[11px] font-extrabold whitespace-nowrap">
                  {hud.timeLeftSec}ث
                </span>
              )}

              {hud.passenger && (
                <span className="text-[10px] font-extrabold text-white whitespace-nowrap">
                  ← {hud.passenger.destinationName} ({Math.max(0, Math.round(hud.passenger.destinationDistM))}م)
                </span>
              )}
            </div>

            {/* Left side (RTL end): Transparent Borderless Floating Action Buttons — ZERO black background */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0" style={{ background: 'transparent' }}>
              <button
                type="button"
                onClick={handleCycleCamera}
                aria-label="تبديل الكاميرا"
                className="border-0 p-0 text-white font-bold text-[10px] flex items-center gap-0.5 whitespace-nowrap active:opacity-60"
                style={{ background: 'transparent' }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden lg:inline landscape-hide-label">تبديل الكاميرا</span>
              </button>

              <button
                type="button"
                onClick={() => setControlsModalOpen(true)}
                aria-label="الإعدادات"
                className="border-0 p-0 text-white font-bold text-[10px] flex items-center gap-0.5 whitespace-nowrap active:opacity-60"
                style={{ background: 'transparent' }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden lg:inline landscape-hide-label">الإعدادات</span>
              </button>

              <SeaSoundButton compact />

              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={muted ? 'تشغيل الصوت' : 'كتم الصوت'}
                className="border-0 p-0 text-white font-bold text-[10px] flex items-center gap-0.5 whitespace-nowrap active:opacity-60"
                style={{ background: 'transparent' }}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden lg:inline landscape-hide-label">الصوت</span>
              </button>

              <button
                type="button"
                onClick={() => setGameState((s) => (s === 'PLAYING' ? 'PAUSED' : 'PLAYING'))}
                aria-label={gameState === 'PAUSED' ? 'كمل' : 'إيقاف'}
                className="border-0 p-0 text-white font-extrabold text-[11px] flex items-center gap-0.5 whitespace-nowrap active:opacity-60"
                style={{ background: 'transparent' }}
              >
                {gameState === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{gameState === 'PAUSED' ? 'كمل' : 'إيقاف'}</span>
              </button>
            </div>
          </div>

          {/* 3-Second Transparent Intro Hint Only (المندرة - بحري · ملف دوران · لف وارجع) — Auto-unmounts after 3 seconds, zero background */}
          {introHintVisible && gameState === 'PLAYING' && (
            <div
              className="pointer-events-none flex items-center justify-center gap-2 text-[10px] font-bold text-white/95 whitespace-nowrap [text-shadow:0_1px_3px_rgba(0,0,0,0.92)]"
              style={{
                position: 'absolute',
                top: 'calc(max(10px, env(safe-area-inset-top)) + 22px)',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                background: 'transparent',
              }}
            >
              <span>{hud.travelDir === 1 ? 'بحري ← المندرة' : 'المندرة ← بحري'}</span>
              <span>·</span>
              <span>ملف دوران · لف وارجع</span>
            </div>
          )}

          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-[#0B121C]/65 flex items-center justify-center p-4 z-40">
                <div className="w-full max-w-sm rounded-2xl bg-[#090B10] border-2 border-yellow-400 p-6 text-center space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleBackFromPlay}
                      aria-label="رجوع"
                      className="min-h-[36px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-amber-400/40 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                      <span>رجوع</span>
                    </button>
                    <h2 className="text-xl font-extrabold text-yellow-400">استراحة على الكورنيش</h2>
                    <span className="w-12" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-slate-300">
                    النقاط: <strong className="text-yellow-400 font-mono">{hud.points}</strong> · المسافة:{' '}
                    <strong className="text-sky-300 font-mono">{(hud.distanceM / 1000).toFixed(2)} كم</strong>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleCycleCamera}
                      className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex flex-col items-center gap-1"
                    >
                      <Camera className="w-4 h-4 text-sky-300" />
                      <span>{CAMERA_LABELS[cameraMode]}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cycleAtmosphere}
                      className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex flex-col items-center gap-1"
                    >
                      {atmosphere === 'day' ? (
                        <Sun className="w-4 h-4 text-yellow-300" />
                      ) : atmosphere === 'sunset' ? (
                        <Sunset className="w-4 h-4 text-orange-300" />
                      ) : (
                        <Moon className="w-4 h-4 text-sky-300" />
                      )}
                      <span>{currentTod.badge}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setControlsModalOpen(true)}
                      className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex flex-col items-center gap-1"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                      <span>التحكم</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <SeaSoundButton fullWidth />
                    <button
                      type="button"
                      onClick={() => setGameState('PLAYING')}
                      className="w-full py-2.5 rounded-xl bg-yellow-400 text-slate-950 font-extrabold text-sm"
                    >
                      استئناف اللعب
                    </button>
                    <button
                      type="button"
                      onClick={launchDrive}
                      className="w-full py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm"
                    >
                      إعادة الجولة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('play');
                        setGameState('TITLE_MENU');
                      }}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-sm font-bold flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                      <span>القائمة الرئيسية</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* End Results & Crash Screen ("شاشة النهاية والإحصائيات / وقعت!") — Black Card with Yellow Border */}
            {gameState === 'GAME_OVER' && lastSummary && (
              <div className="absolute inset-0 bg-black/88 flex items-center justify-center p-3 sm:p-5 z-30 overflow-y-auto">
                <div className="w-full max-w-md rounded-2xl bg-[#07090D] border-2 border-yellow-400 p-5 sm:p-6 space-y-5 shadow-2xl my-auto">
                  <div className="flex items-start gap-3">
                    {lastSummary.fellDuringStunt ? (
                      <AlertTriangle className="w-8 h-8 text-yellow-400 shrink-0 mt-0.5" />
                    ) : lastSummary.reachedMandara ? (
                      <Trophy className="w-8 h-8 text-yellow-400 shrink-0 mt-0.5" />
                    ) : (
                      <Flag className="w-7 h-7 text-yellow-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-yellow-400">
                        {lastSummary.fellDuringStunt
                          ? 'وقعت!'
                          : lastSummary.raceTrackId
                            ? lastSummary.raceSubMode === 'practice'
                              ? 'انتهى التمرين الحر!'
                              : lastSummary.racePosition === 1
                                ? 'بطل تحدي الأبطال! المركز الأول!'
                                : 'نتيجة تحدي الأبطال'
                            : lastSummary.reachedMandara
                              ? 'وصلت قلعة قايتباي ببحري بالسلامة!'
                              : 'نتائج الجولة'}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-200 mt-1">{lastSummary.reason}</p>
                      {lastSummary.isNewRecord && (
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-extrabold">
                          رقم قياسي جديد على هذا المسار!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 py-3.5 border-y border-yellow-400/25 text-center">
                    {lastSummary.raceTimeSec !== undefined ? (
                      <>
                        <div className="p-2.5 rounded-xl bg-white/5">
                          <div className="text-[11px] text-slate-400">الوقت المسجل</div>
                          <div className="text-xl font-black text-yellow-400 font-mono tabular-nums mt-0.5">
                            {formatRaceTime(lastSummary.raceTimeSec)}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5">
                          <div className="text-[11px] text-slate-400">
                            {lastSummary.raceSubMode === 'practice' ? 'وضع التدريب' : 'الترتيب النهائي'}
                          </div>
                          <div className="text-xl font-black text-sky-400 font-mono tabular-nums mt-0.5">
                            {lastSummary.raceSubMode === 'practice'
                              ? 'تمرين حر'
                              : `${lastSummary.racePosition ?? 1} / 5`}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2.5 rounded-xl bg-white/5">
                          <div className="text-[11px] text-slate-400">إجمالي النقاط</div>
                          <div className="text-xl font-black text-yellow-400 font-mono tabular-nums mt-0.5">
                            {lastSummary.points}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5">
                          <div className="text-[11px] text-slate-400">المسافة المقطوعة</div>
                          <div className="text-xl font-black text-sky-400 font-mono tabular-nums mt-0.5">
                            {(lastSummary.distanceM / 1000).toFixed(2)} كم
                          </div>
                        </div>
                      </>
                    )}
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <div className="text-[11px] text-slate-400">أعلى سرعة</div>
                      <div className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-0.5">
                        {lastSummary.topSpeedKmh} كم/س
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <div className="text-[11px] text-slate-400">
                        {lastSummary.raceTrackId ? 'إجمالي النقاط' : 'المرات القريبة (التغريز)'}
                      </div>
                      <div className="text-xl font-black text-white font-mono tabular-nums mt-0.5">
                        {lastSummary.raceTrackId ? lastSummary.points : lastSummary.nearMisses}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Unlock Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">تقدم فتح: {nextTier.name}</span>
                      <span className="text-yellow-400 font-mono">
                        {progress.totalPoints} / {nextTier.requiredPoints}
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden border border-yellow-400/30">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${unlockPct}%` }}
                      />
                    </div>
                  </div>

                  <div
                    className={`grid gap-2.5 ${
                      lastSummary.raceTrackId || mode === 'superhero' ? 'grid-cols-3' : 'grid-cols-2'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={lastSummary.raceTrackId ? launchConfiguredRace : launchDrive}
                      className="py-3 px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>العب تاني</span>
                    </button>
                    {lastSummary.raceTrackId && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('play');
                          setGameState('RACE_SETUP');
                        }}
                        className="py-3 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>إعداد تحدي الأبطال</span>
                      </button>
                    )}
                    {!lastSummary.raceTrackId && mode === 'superhero' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('play');
                          setGameState('MOTO_GARAGE');
                        }}
                        className="py-3 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>الجراج</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('play');
                        setGameState('TITLE_MENU');
                      }}
                      className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1"
                    >
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                      <span>الرئيسية</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
        </main>
      )}
      <OfflineIndicator hideDuringPlay={gameState === 'PLAYING'} />
    </div>
  );
}
