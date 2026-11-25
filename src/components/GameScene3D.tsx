import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CORNICHE_ROUTE_LENGTH_M,
  GAS_STATIONS,
  GRAND_EXTRA_GAS_STATIONS,
  generateCheckpointInspection,
  getAlexDistrictById,
  getMotoById,
  getTaxiLevelDef,
  MANDARA_FINISH_M,
  PASSENGER_NAMES,
  PASSENGER_QUOTES,
  RACE_BIKES,
  RACE_TRACKS,
  TIME_OF_DAY_OPTIONS,
} from '../game/data';
import { buildAlexDistrictEnvironment } from '../game/alexDistricts3d';
import { buildCornicheGasStations } from '../game/gasStations3d';
import { buildAllAlexandriaLandmarks } from '../game/landmarks3d';
import {
  buildOfficerPovRig,
  buildOrangeRoadBarrier3D,
  buildPlayerCheckpointOfficerRig,
  buildPlayerVehicle3D,
  CheckpointInspectionRig,
  createEntityModelFactory,
  disposeObject3D,
  PedestrianRig,
  PlayerVehicleRig,
  TrafficSignalRig,
  VehicleRig,
  WaitingPassengerRig,
} from '../game/models3d';
import {
  createAlexBuildingFacadeTexture,
  createAlexBuildingWindowGlowTexture,
  createAsphaltNormalTexture,
  createAsphaltRoughnessTexture,
  createBlueHighwaySignTexture,
  createCornichePromenadeTexture,
  createCrosswalkTexture,
  createHeadlightBeamTexture,
  createRoadTexture,
  createSeaTexture,
  createShoreFoamTexture,
  createShopfrontTexture,
  createShopSignTexture,
  createSidewalkTexture,
  createSignTexture,
  createSkyDomeMaterial,
  createStoneMasonryTexture,
  createStreetLightPoolTexture,
  createYellowBlackCurbTexture,
} from '../game/textures3d';
import { createRealisticTreeBundle } from '../game/trees3d';
import {
  createCurvedRibbonGeometry as buildCurvedRibbonGeometry,
  getRoadCenterX as getBaseRoadCenterX,
  getRoadHeightAt as getBaseRoadHeightAt,
  getRoadPitchAt as getBaseRoadPitchAt,
  getRoadYawAt as getBaseRoadYawAt,
  STANLEY_BRIDGE_Z,
} from '../game/terrain';
import { soundFX } from '../game/sound';
import {
  ActivePassenger,
  AtmosphereMode,
  CameraMode,
  CheckpointConfig,
  CheckpointInspectionData,
  ControlSettings,
  GameMode,
  GameState,
  HudSnapshot,
  InspectionVerdict,
  LicenseFieldId,
  PlayerProgress,
  PlayerVehicleKind,
  RaceConfig,
  RiderStyle,
  RunSummary,
  StuntType,
} from '../game/types';

interface GameScene3DProps {
  gameState: GameState;
  mode: GameMode;
  playerVehicleKind: PlayerVehicleKind;
  riderStyle?: RiderStyle;
  cameraMode: CameraMode;
  atmosphere: AtmosphereMode;
  controlSettings: ControlSettings;
  progress: PlayerProgress;
  raceConfig?: RaceConfig;
  checkpointConfig?: CheckpointConfig;
  runId: number;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (summary: RunSummary) => void;
  onCycleCamera: () => void;
  onInstantEarn?: (amount: number, tripCompleted?: boolean) => void;
  onSpendMoney?: (amount: number) => void;
}

type TrafficKind =
  | 'microbus'
  | 'sedan'
  | 'suv'
  | 'taxi'
  | 'police'
  | 'motorcycle'
  | 'hantour'
  | 'cone';

interface TrafficEntity {
  id: number;
  rig: VehicleRig;
  laneOffset: number;
  targetLaneOffset: number;
  z: number;
  halfW: number;
  halfL: number;
  speedKmh: number;
  baseSpeedKmh: number;
  kind: TrafficKind;
  direction: -1 | 1;
  nudgedTimer: number;
  soundPlayed: boolean;
  nearMissed: boolean;
  isViolator?: boolean;
  violatorMarker?: THREE.Mesh;
  pulledOver?: boolean;
  isRacer?: boolean;
  laneChangeTimer?: number;
}

interface CrossingPedestrian {
  rig: PedestrianRig;
  laneOffset: number;
  dirX: -1 | 1;
  zOffset: number;
  speed: number;
  phase: number;
}

interface SignalIntersection {
  z: number;
  phaseOffset: number;
  rig: TrafficSignalRig;
  state: 'green' | 'yellow' | 'red';
  crossers: CrossingPedestrian[];
  violated: boolean;
}

interface PickupEntity {
  id: number;
  mesh: THREE.Group;
  laneOffset: number;
  z: number;
  kind: 'fuel' | 'repair' | 'coin';
}

interface Mashrou3Stop {
  z: number;
  count: number;
  ring: THREE.Group;
  loaded: boolean;
}

interface CheckpointCar {
  rig: VehicleRig;
  driverRig: CheckpointInspectionRig;
  z: number;
  laneOffset: number;
  plate: string;
  kindLabel: string;
  speedKmh: number;
  isViolator: boolean;
  reason: string;
  willFlee: boolean;
  fleeAtWindow: boolean;
  announced: boolean;
  inspection: CheckpointInspectionData;
  inspectionStage: 'at_window' | 'inspecting';
  trunkChecked: boolean;
  state: 'approaching' | 'signaled_stop' | 'waiting' | 'fleeing' | 'cleared' | 'pulled_over';
  marker: THREE.Mesh;
}

const ONCOMING_LANE_XS = [-7.3, -3.7];
const MEDIAN_CENTER_X = -1.05;
const FORWARD_LANE_XS = [1.8, 4.8, 7.8];
const SIDEWALK_CURB_X = 9.8;

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _povLocalEye = new THREE.Vector3();
const _mirrorPos = new THREE.Vector3();
const _mirrorLookTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const STUNT_ITEMS: { id: Exclude<StuntType, 'none'>; label: string }[] = [
  { id: 'wheelie', label: 'حصان' },
  { id: 'superman', label: 'سوبرمان' },
  { id: 'stand', label: 'واقف' },
  { id: 'nohands', label: 'إيدين' },
];

export const GameScene3D: React.FC<GameScene3DProps> = ({
  gameState,
  mode,
  playerVehicleKind,
  riderStyle = 'green_tracksuit',
  cameraMode,
  atmosphere,
  controlSettings,
  progress,
  raceConfig,
  checkpointConfig,
  runId,
  onHudUpdate,
  onGameOver,
  onCycleCamera,
  onInstantEarn,
  onSpendMoney,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const windOverlayRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [showRotateTip, setShowRotateTip] = useState(true);
  const [streetBannerText, setStreetBannerText] = useState<string | null>(null);
  const [countdownUi, setCountdownUi] = useState<string | null>(null);
  const [activeStuntUi, setActiveStuntUi] = useState<StuntType>('none');
  const [stuntComboUi, setStuntComboUi] = useState(1);
  const [sirenUi, setSirenUi] = useState(false);
  const [canStopViolator, setCanStopViolator] = useState(false);
  const [nearUTurnUi, setNearUTurnUi] = useState<{ name: string; distM: number; active: boolean } | null>(null);
  const [nearGasStationUi, setNearGasStationUi] = useState<{
    id: string;
    name: string;
    side: 'right' | 'left';
    distM: number;
    cost: number;
    canAfford: boolean;
    needsFuel: boolean;
  } | null>(null);
  const [lowFuelGuideUi, setLowFuelGuideUi] = useState<{
    stationName: string;
    side: 'right' | 'left';
    distM: number;
  } | null>(null);
  const [outOfFuelUi, setOutOfFuelUi] = useState<{
    stationName: string;
    isAtStation: boolean;
    fullCost: number;
    wallet: number;
  } | null>(null);
  const [checkpointSubPhaseUi, setCheckpointSubPhaseUi] = useState<'duty' | 'chase'>('duty');
  const [fleeingInfoUi, setFleeingInfoUi] = useState<{
    plate: string;
    distM: number;
    canIntercept: boolean;
  } | null>(null);
  const [checkpointUi, setCheckpointUi] = useState<{
    plate: string;
    kindLabel: string;
    speedKmh: number;
    isViolator: boolean;
    reason: string;
    status: 'approaching' | 'signaled_stop' | 'at_window' | 'inspecting' | 'fleeing';
    teamHint?: string;
    inspection: CheckpointInspectionData;
    highlightedField: LicenseFieldId | null;
    trunkChecked: boolean;
  } | null>(null);
  const highlightedFieldRef = useRef<LicenseFieldId | null>(null);

  // Joystick visual knob offset [-1..1]
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyPointerIdRef = useRef<number | null>(null);
  const joyCenterRef = useRef({ x: 0, y: 0, r: 44 });
  const analogSteerRef = useRef(0);
  const tiltZeroRef = useRef<number | null>(null);
  const tiltRawRef = useRef(0);

  const keysRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    reverse: false,
    turbo: false,
  });

  const touchSetsRef = useRef<{
    up: Set<number>;
    down: Set<number>;
    left: Set<number>;
    right: Set<number>;
    reverse: Set<number>;
    turbo: Set<number>;
  }>({
    up: new Set(),
    down: new Set(),
    left: new Set(),
    right: new Set(),
    reverse: new Set(),
    turbo: new Set(),
  });

  const [activeButtons, setActiveButtons] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
    reverse: false,
    turbo: false,
  });

  const [turboUi, setTurboUi] = useState({ charge: 40, active: false });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  const controlSettingsRef = useRef(controlSettings);
  controlSettingsRef.current = controlSettings;

  const activeStuntRef = useRef<StuntType>('none');
  const sirenActiveRef = useRef(false);

  const onHudUpdateRef = useRef(onHudUpdate);
  onHudUpdateRef.current = onHudUpdate;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const onCycleCameraRef = useRef(onCycleCamera);
  onCycleCameraRef.current = onCycleCamera;

  const onInstantEarnRef = useRef(onInstantEarn);
  onInstantEarnRef.current = onInstantEarn;

  const onSpendMoneyRef = useRef(onSpendMoney);
  onSpendMoneyRef.current = onSpendMoney;

  const walletRef = useRef(progress.wallet);
  walletRef.current = progress.wallet;

  const [headlightMode, setHeadlightMode] = useState<'off' | 'low' | 'high'>(() =>
    atmosphere === 'night' ? 'high' : atmosphere === 'sunset' ? 'low' : 'off',
  );
  const headlightModeRef = useRef<'off' | 'low' | 'high'>(headlightMode);
  const headlightToggleTriggerRef = useRef<() => void>(() => {});

  const hornTriggerRef = useRef<() => void>(() => {});
  const uturnTriggerRef = useRef<() => void>(() => {});
  const refuelTriggerRef = useRef<() => void>(() => {});
  const emergencyRefuelTriggerRef = useRef<() => void>(() => {});
  const giveUpOutOfFuelTriggerRef = useRef<() => void>(() => {});
  const stopViolatorTriggerRef = useRef<() => void>(() => {});
  const checkpointDecisionRef = useRef<
    (action: 'signal_stop' | 'pass' | 'ask_license' | 'inspect_trunk' | 'chase_intercept' | 'finish') => void
  >(() => {});
  const checkpointVerdictRef = useRef<(verdict: InspectionVerdict) => void>(() => {});
  const checkpointSelectFieldRef = useRef<(field: LicenseFieldId) => void>((field) => {
    const next = highlightedFieldRef.current === field ? null : field;
    highlightedFieldRef.current = next;
    setCheckpointUi((prev) => (prev ? { ...prev, highlightedField: next } : prev));
  });

  const isMotoMode =
    (mode !== 'traffic_officer' &&
      (playerVehicleKind === 'vespa' || playerVehicleKind === 'black_supermoto')) ||
    (mode === 'traffic_officer' && checkpointSubPhaseUi === 'chase');

  useEffect(() => {
    setShowRotateTip(true);
    const t = window.setTimeout(() => setShowRotateTip(false), 6000);
    return () => window.clearTimeout(t);
  }, [runId]);

  // Keep continuous sea waves (coastal districts only) & engine/wind audio synced with active gameplay
  useEffect(() => {
    const hasDistrictSea = getAlexDistrictById(progress.selectedDistrictId).hasSea;
    if (gameState === 'PLAYING') {
      if (hasDistrictSea) {
        soundFX.startSeaAmbience();
      } else {
        soundFX.stopSeaAmbience();
      }
      if (mode !== 'traffic_officer' || checkpointSubPhaseUi === 'chase') {
        soundFX.startEngineLoop();
      } else {
        soundFX.stopEngineLoop();
      }
    } else {
      soundFX.stopSeaAmbience();
      soundFX.stopEngineLoop();
    }
    return () => {
      soundFX.stopSeaAmbience();
      soundFX.stopEngineLoop();
    };
  }, [gameState, mode, checkpointSubPhaseUi, progress.selectedDistrictId]);

  // Accelerometer / DeviceOrientation listener for Tilt steering
  useEffect(() => {
    if (controlSettings.steering !== 'tilt') {
      tiltRawRef.current = 0;
      tiltZeroRef.current = null;
      return;
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const rawAngle = isLandscape ? (e.beta ?? 0) : (e.gamma ?? 0);
      if (tiltZeroRef.current === null) {
        tiltZeroRef.current = rawAngle;
      }
      const delta = rawAngle - tiltZeroRef.current;
      // Deadzone 3 deg, full lock around 24 deg
      const sign = delta >= 0 ? 1 : -1;
      const mag = Math.max(0, Math.abs(delta) - 3) / 22;
      tiltRawRef.current = THREE.MathUtils.clamp(sign * mag, -1, 1);
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [controlSettings.steering, runId]);

  const clearAllTouches = () => {
    const sets = touchSetsRef.current;
    sets.up.clear();
    sets.down.clear();
    sets.left.clear();
    sets.right.clear();
    sets.reverse.clear();
    sets.turbo.clear();
    keysRef.current.up = false;
    keysRef.current.down = false;
    keysRef.current.left = false;
    keysRef.current.right = false;
    keysRef.current.reverse = false;
    keysRef.current.turbo = false;
    analogSteerRef.current = 0;
    joyPointerIdRef.current = null;
    setJoyKnob({ x: 0, y: 0 });
    setActiveButtons({ up: false, down: false, left: false, right: false, reverse: false, turbo: false });
  };

  const makeTouchHandlers = (control: 'up' | 'down' | 'left' | 'right' | 'reverse' | 'turbo') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      soundFX.startSeaAmbience();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }
      touchSetsRef.current[control].add(e.pointerId);
      keysRef.current[control] = true;
      setActiveButtons((prev) => (prev[control] ? prev : { ...prev, [control]: true }));
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      touchSetsRef.current[control].delete(e.pointerId);
      const isActive = touchSetsRef.current[control].size > 0;
      keysRef.current[control] = isActive;
      setActiveButtons((prev) => (prev[control] === isActive ? prev : { ...prev, [control]: isActive }));
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      touchSetsRef.current[control].delete(e.pointerId);
      const isActive = touchSetsRef.current[control].size > 0;
      keysRef.current[control] = isActive;
      setActiveButtons((prev) => (prev[control] === isActive ? prev : { ...prev, [control]: isActive }));
    },
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => {
      touchSetsRef.current[control].delete(e.pointerId);
      const isActive = touchSetsRef.current[control].size > 0;
      keysRef.current[control] = isActive;
      setActiveButtons((prev) => (prev[control] === isActive ? prev : { ...prev, [control]: isActive }));
    },
    onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault(),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
        if (gameStateRef.current === 'PLAYING') {
          e.preventDefault();
          soundFX.startSeaAmbience();
        }
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'r' || e.key === 'R') keysRef.current.reverse = true;
      if (e.key === 'Shift' || e.key === 'e' || e.key === 'E') keysRef.current.turbo = true;
      if ((e.key === ' ' || e.code === 'Space') && gameStateRef.current === 'PLAYING') {
        hornTriggerRef.current();
      }
      if ((e.key === 'c' || e.key === 'C') && gameStateRef.current === 'PLAYING') {
        onCycleCameraRef.current();
      }
      if ((e.key === 'u' || e.key === 'U') && gameStateRef.current === 'PLAYING') {
        uturnTriggerRef.current();
      }
      if ((e.key === 'l' || e.key === 'L') && gameStateRef.current === 'PLAYING') {
        headlightToggleTriggerRef.current();
      }
      if ((e.key === 'f' || e.key === 'F') && gameStateRef.current === 'PLAYING') {
        refuelTriggerRef.current();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = touchSetsRef.current.up.size > 0;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.down = touchSetsRef.current.down.size > 0;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = touchSetsRef.current.left.size > 0;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = touchSetsRef.current.right.size > 0;
      }
      if (e.key === 'r' || e.key === 'R') {
        keysRef.current.reverse = touchSetsRef.current.reverse.size > 0;
      }
      if (e.key === 'Shift' || e.key === 'e' || e.key === 'E') {
        keysRef.current.turbo = touchSetsRef.current.turbo.size > 0;
      }
    };

    const handleVisibilityOrBlur = () => clearAllTouches();

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleVisibilityOrBlur);
    document.addEventListener('visibilitychange', handleVisibilityOrBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleVisibilityOrBlur);
      document.removeEventListener('visibilitychange', handleVisibilityOrBlur);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const activeDistrict = getAlexDistrictById(
      mode === 'taxi_classic' ? progress.selectedDistrictId : 'corniche',
    );
    const activeLandmarks = activeDistrict.landmarks;
    const activeStreetZones = activeDistrict.streetZones;
    const activeUTurnZones = activeDistrict.uTurnZones;
    const districtHasSea = activeDistrict.hasSea;
    const activeTaxiLevel = getTaxiLevelDef(progress.taxiLevel);

    const activeTrack =
      mode === 'race'
        ? (RACE_TRACKS.find((t) => t.id === raceConfig?.trackId) ?? RACE_TRACKS[0])
        : null;
    const activeTrackId = activeTrack?.id;
    const activeMotoModel = getMotoById(
      mode === 'race' ? raceConfig?.bikeId : progress.selectedMotoId,
    );
    const activeRaceBike = mode === 'race' ? activeMotoModel : null;
    const isMotoDrivingMode =
      mode === 'superhero' ||
      mode === 'motorcycle' ||
      mode === 'race' ||
      playerVehicleKind === 'vespa' ||
      playerVehicleKind === 'black_supermoto';
    const isMotoDeliveryMode =
      mode === 'superhero' || mode === 'motorcycle' || mode === 'taxi_classic';
    const isRaceMode = mode === 'race' && Boolean(activeTrack);
    const isPracticeSubMode = isRaceMode && raceConfig?.subMode === 'practice';
    const raceDifficulty = raceConfig?.difficulty ?? 'medium';
    const quality =
      mode === 'race'
        ? (raceConfig?.graphicsQuality ?? 'high')
        : mode === 'traffic_officer'
          ? (checkpointConfig?.graphicsQuality ?? 'high')
          : 'high';
    const isUrbanCircuitTrack =
      activeTrackId === 'montaza_45' || activeTrackId === 'sidi_gaber' || activeTrackId === 'smouha_suez';
    const raceFinishM = activeTrack ? activeTrack.laps * activeTrack.lapRenderM : MANDARA_FINISH_M;

    const isSidiGaberDistrict = activeDistrict.id === 'sidi_gaber_abuqir';
    const isGrandCity = activeDistrict.id === 'grand_alexandria';
    const activeFinishM = activeDistrict.routeLengthM ?? MANDARA_FINISH_M;
    const activeGasStations = isGrandCity ? [...GAS_STATIONS, ...GRAND_EXTRA_GAS_STATIONS] : GAS_STATIONS;
    const isSideBypassAtZ = (z: number) =>
      isSidiGaberDistrict || (isGrandCity && z <= -2380 && z >= -3660);
    const sgCrossStreetZs = [-380, -760, -960, -1380, -1620, -1960, -2140, -2450, -2860, -3100, -3260, -3380];

    // Post-Stanley Return-Side Flyover Bridge ("كوبري الكورنيش اليمين — الجنب الراجع") descending back onto the Corniche
    // followed immediately by the Sidi Gaber Right-Turn Exit ("ملف يمين • اتجاه سيدي جابر") on the -X city side (RIGHT when returning toward +Z!)
    const hasPostStanleyRightBridge =
      !isUrbanCircuitTrack && (activeDistrict.id === 'corniche' || isGrandCity);
    const rightBridgeCfg = isGrandCity
      ? {
          bridgeStartZ: -742,
          bridgeEndZ: -570,
          bridgePeak: 4.8,
          turnStartZ: -556,
          turnEndZ: -494,
          turnCenterZ: -525,
        }
      : {
          bridgeStartZ: -1082,
          bridgeEndZ: -870,
          bridgePeak: 5.6,
          turnStartZ: -854,
          turnEndZ: -766,
          turnCenterZ: -810,
        };
    const isOnRightBridgeSpan = (z: number) =>
      hasPostStanleyRightBridge && z >= rightBridgeCfg.bridgeStartZ && z <= rightBridgeCfg.bridgeEndZ;
    const isOnRightBridgeApproach = (z: number) =>
      hasPostStanleyRightBridge && z >= rightBridgeCfg.bridgeStartZ - 18 && z <= rightBridgeCfg.bridgeEndZ + 18;
    const isOnSidiGaberTurnZone = (z: number) =>
      hasPostStanleyRightBridge && z >= rightBridgeCfg.turnStartZ && z <= rightBridgeCfg.turnEndZ;
    const isPostStanleyRightZone = (z: number) =>
      hasPostStanleyRightBridge &&
      z >= rightBridgeCfg.bridgeStartZ - 22 &&
      z <= rightBridgeCfg.turnEndZ + 16;
    const getRightBridgeHeightAt = (z: number): number => {
      if (!isOnRightBridgeSpan(z)) return 0;
      const len = rightBridgeCfg.bridgeEndZ - rightBridgeCfg.bridgeStartZ;
      const t = (z - rightBridgeCfg.bridgeStartZ) / len;
      return rightBridgeCfg.bridgePeak * Math.sin(t * Math.PI) ** 2;
    };

    const getRoadCenterX = (z: number) => getBaseRoadCenterX(z, activeTrackId, activeDistrict.id);
    const getRoadYawAt = (z: number) => getBaseRoadYawAt(z, activeTrackId, activeDistrict.id);
    const getRoadHeightAt = (z: number) => getBaseRoadHeightAt(z, activeTrackId, activeDistrict.id);
    const getRoadPitchAt = (z: number) => getBaseRoadPitchAt(z, activeTrackId, activeDistrict.id);
    const getPlayerSurfaceHeightAt = (z: number, laneOffset: number) => {
      const baseH = getRoadHeightAt(z);
      if (hasPostStanleyRightBridge && laneOffset < -9.6 && isOnRightBridgeSpan(z)) {
        return Math.max(baseH, getRightBridgeHeightAt(z));
      }
      return baseH;
    };
    const getPlayerSurfacePitchAt = (z: number, laneOffset: number) => {
      if (hasPostStanleyRightBridge && laneOffset < -9.6 && isOnRightBridgeApproach(z)) {
        const hAhead = getPlayerSurfaceHeightAt(z - 1.5, laneOffset);
        const hBehind = getPlayerSurfaceHeightAt(z + 1.5, laneOffset);
        return Math.atan2(hAhead - hBehind, 3.0);
      }
      return getRoadPitchAt(z);
    };
    const createCurvedRibbonGeometry = (
      offsetLeft: number,
      offsetRight: number,
      zStart: number,
      zEnd: number,
      stepZ: number,
      getY: (z: number, isLeft: boolean) => number,
      uTile = 1,
      vPerMeter = 0.05,
    ) =>
      buildCurvedRibbonGeometry(
        offsetLeft,
        offsetRight,
        zStart,
        zEnd,
        stepZ,
        getY,
        uTile,
        vPerMeter,
        activeTrackId,
        activeDistrict.id,
      );

    setContextLost(false);
    activeStuntRef.current = 'none';
    setActiveStuntUi('none');
    setStuntComboUi(1);
    sirenActiveRef.current = mode === 'police_patrol';
    setSirenUi(mode === 'police_patrol');
    setCanStopViolator(false);
    setCheckpointSubPhaseUi('duty');
    setFleeingInfoUi(null);
    highlightedFieldRef.current = null;
    setCheckpointUi(null);
    setCountdownUi(isRaceMode ? '3' : null);
    setStreetBannerText(activeTrack ? activeTrack.name : activeStreetZones[0].title);
    setNearGasStationUi(null);
    setLowFuelGuideUi(null);
    setOutOfFuelUi(null);

    const defaultHeadlight: 'off' | 'low' | 'high' =
      atmosphere === 'night' ? 'high' : atmosphere === 'sunset' ? 'low' : 'off';
    headlightModeRef.current = defaultHeadlight;
    setHeadlightMode(defaultHeadlight);

    const timeOpt = TIME_OF_DAY_OPTIONS.find((t) => t.id === atmosphere) ?? TIME_OF_DAY_OPTIONS[0];
    const timeMultiplier = timeOpt.multiplier;

    const isMobileDevice =
      Boolean(window.matchMedia?.('(pointer: coarse)').matches) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const lowSpecOrMobile = isSoftwareGl || isMobileDevice || quality === 'low';

    const renderer = new THREE.WebGLRenderer({
      antialias: !lowSpecOrMobile,
      powerPreference: 'high-performance',
      precision: isMobileDevice ? 'mediump' : 'highp',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure =
      atmosphere === 'night' ? 1.08 : atmosphere === 'sunset' ? 1.14 : 1.1;
    renderer.setPixelRatio(
      isMobileDevice
        ? Math.min(window.devicePixelRatio || 1, 0.85)
        : lowSpecOrMobile
          ? 1
          : Math.min(window.devicePixelRatio || 1, quality === 'medium' ? 1.25 : 1.5),
    );
    renderer.shadowMap.enabled = !lowSpecOrMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(300, container.clientWidth || window.innerWidth);
    const height = Math.max(200, container.clientHeight || window.innerHeight);
    renderer.setSize(width, height, false);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0px';
    renderer.domElement.style.left = '0px';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.margin = '0';
    renderer.domElement.style.padding = '0';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const extraTexturesToDispose: THREE.Texture[] = [];
    const fogColor =
      atmosphere === 'night'
        ? 0x121214
        : atmosphere === 'sunset'
          ? 0xd99672
          : 0xdcdad5;
    scene.background = new THREE.Color(fogColor);
    const isMobileLandscapeNow = isMobileDevice && width > height;
    scene.fog = new THREE.FogExp2(
      fogColor,
      isMobileDevice && !isMobileLandscapeNow
        ? atmosphere === 'night'
          ? 0.0022
          : atmosphere === 'sunset'
            ? 0.0032
            : 0.0018
        : atmosphere === 'night'
          ? 0.0016
          : atmosphere === 'sunset'
            ? 0.0026
            : 0.0014,
    );

    // Sky Dome (Moonlit Night with Stars / Sunset / Mediterranean Day)
    const skyMat = createSkyDomeMaterial(atmosphere);
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(
        isMobileDevice && !isMobileLandscapeNow ? 260 : 420,
        isMobileDevice ? 14 : 24,
        isMobileDevice ? 10 : 16,
      ),
      skyMat,
    );
    scene.add(skyDome);

    // Build subtle neutral PMREM reflection map for glossy vehicles while keeping ground/asphalt/sidewalks completely reflection-free.
    // On mobile/Android, skip heavy per-fragment PBR cubemap sampling (compensated via hemisphere fill) for much higher FPS.
    let envRenderTarget: THREE.WebGLRenderTarget | null = null;
    if (!isMobileDevice) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const envSkyGeo = new THREE.SphereGeometry(40, 14, 10);
      const envSkyMat = new THREE.MeshBasicMaterial({
        color: atmosphere === 'night' ? 0x1c1c1e : atmosphere === 'sunset' ? 0xe0a47a : 0xebe8e1,
        side: THREE.BackSide,
      });
      const envSkyMesh = new THREE.Mesh(envSkyGeo, envSkyMat);
      const envSeaGeo = new THREE.CircleGeometry(40, 14);
      envSeaGeo.rotateX(-Math.PI / 2);
      const envSeaMat = new THREE.MeshBasicMaterial({
        color: atmosphere === 'night' ? 0x141416 : atmosphere === 'sunset' ? 0x6e4736 : 0x3a3a38,
      });
      const envSeaMesh = new THREE.Mesh(envSeaGeo, envSeaMat);
      envSeaMesh.position.y = -0.5;
      envScene.add(envSkyMesh, envSeaMesh);
      envRenderTarget = pmremGenerator.fromScene(envScene, 0.04);
      scene.environment = envRenderTarget.texture;
      scene.environmentIntensity =
        atmosphere === 'night' ? 0.28 : atmosphere === 'sunset' ? 0.82 : 0.55;
      envSkyGeo.dispose();
      envSkyMat.dispose();
      envSeaGeo.dispose();
      envSeaMat.dispose();
      pmremGenerator.dispose();
    }

    const maxAniso = isMobileDevice ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const modelFactory = createEntityModelFactory(maxAniso);

    const camera = new THREE.PerspectiveCamera(
      68,
      width / height,
      0.18,
      isMobileDevice && !isMobileLandscapeNow ? 270 : 460,
    );
    camera.position.set(FORWARD_LANE_XS[1], 1.5, 0.2);

    // Natural neutral lighting so sky color never dyes the asphalt road or sidewalks blue
    const hemiLight = new THREE.HemisphereLight(
      atmosphere === 'night' ? 0x3a3a3c : atmosphere === 'sunset' ? 0xf5d6bc : 0xfaf8f2,
      atmosphere === 'night' ? 0x201e1c : atmosphere === 'sunset' ? 0x7a5c46 : 0x6b665e,
      isMobileDevice
        ? atmosphere === 'night'
          ? 0.48
          : atmosphere === 'sunset'
            ? 1.0
            : 0.96
        : atmosphere === 'night'
          ? 0.38
          : atmosphere === 'sunset'
            ? 0.85
            : 0.82,
    );
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(
      atmosphere === 'night' ? 0xe4e4e4 : atmosphere === 'sunset' ? 0xffb066 : 0xfff8eb,
      atmosphere === 'night' ? 0.45 : atmosphere === 'sunset' ? 2.45 : 1.95,
    );
    sunLight.position.set(
      atmosphere === 'sunset' ? 88 : -45,
      atmosphere === 'night' ? 62 : atmosphere === 'sunset' ? 22 : 70,
      atmosphere === 'sunset' ? -48 : 35,
    );
    sunLight.castShadow = !lowSpecOrMobile;
    const shadowRes = quality === 'medium' ? 512 : 1024;
    sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 230;
    const shadowBound = 58;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    if (atmosphere === 'sunset' && !isMobileDevice) {
      // Soft warm neutral rim fill from city side (-X) with zero blue/violet cast on ground
      const twilightRim = new THREE.DirectionalLight(0xfde6cc, 0.28);
      twilightRim.position.set(-55, 38, 40);
      scene.add(twilightRim);
    }

    // Overhead golden streetlamp PointLight(s) that glide from lamppost to lamppost at night.
    // On mobile/Android, use 1 wider gliding light instead of 2 to halve dynamic PointLight shader cost!
    const overheadLampLight =
      atmosphere === 'night'
        ? new THREE.PointLight(0xffca68, isMobileDevice ? 96 : 82, isMobileDevice ? 56 : 48, 1.32)
        : null;
    const overheadLampLightAhead =
      atmosphere === 'night' && !isMobileDevice ? new THREE.PointLight(0xffc258, 76, 48, 1.32) : null;
    if (overheadLampLight) {
      overheadLampLight.position.set(0, 6.2, -16);
      scene.add(overheadLampLight);
    }
    if (overheadLampLightAhead) {
      overheadLampLightAhead.position.set(0, 6.2, -32);
      scene.add(overheadLampLightAhead);
    }

    const Z_START = 160;
    const Z_END = isGrandCity ? -6240 : -3840;
    const ROUTE_SPAN = Z_START - Z_END;
    const ROUTE_MID_Z = (Z_START + Z_END) / 2;

    // 1. Mediterranean Sea & Stanley Bay Cove (animated 3D rolling swells, per-fragment whitecap waves, shoreline surf & sun-glitter)
    const seaTex = createSeaTexture(maxAniso);
    const shoreFoamTex = createShoreFoamTexture(maxAniso);
    const seaUniformTime = { value: 0 };
    const seaGlitterColor =
      atmosphere === 'night'
        ? new THREE.Color(0x93c5fd).multiplyScalar(0.54)
        : atmosphere === 'sunset'
          ? new THREE.Color(0xffcf88).multiplyScalar(0.85)
          : new THREE.Color(0xdbeafe).multiplyScalar(0.6);
    const seaFoamColor =
      atmosphere === 'night'
        ? new THREE.Color(0xbfdbfe).multiplyScalar(0.52)
        : atmosphere === 'sunset'
          ? new THREE.Color(0xffe6cc).multiplyScalar(0.62)
          : new THREE.Color(0xffffff).multiplyScalar(0.75);
    const seaTurquoiseColor =
      atmosphere === 'night'
        ? new THREE.Color(0x1e40af).multiplyScalar(0.45)
        : atmosphere === 'sunset'
          ? new THREE.Color(0x1d4ed8).multiplyScalar(0.38)
          : new THREE.Color(0x2563eb).multiplyScalar(0.52);

    const seaMat = isMobileDevice
      ? new THREE.MeshStandardMaterial({
          map: seaTex,
          color: atmosphere === 'night' ? 0x0b357a : atmosphere === 'sunset' ? 0x144ea8 : 0x1565d8,
          roughness: atmosphere === 'sunset' ? 0.14 : 0.18,
          metalness: atmosphere === 'sunset' ? 0.34 : 0.2,
          envMapIntensity: atmosphere === 'sunset' ? 1.3 : 1.05,
        })
      : new THREE.MeshPhysicalMaterial({
          map: seaTex,
          color: atmosphere === 'night' ? 0x0b357a : atmosphere === 'sunset' ? 0x144ea8 : 0x1565d8,
          roughness: atmosphere === 'sunset' ? 0.1 : 0.14,
          metalness: atmosphere === 'sunset' ? 0.38 : 0.22,
          clearcoat: 0.94,
          clearcoatRoughness: 0.1,
          envMapIntensity: atmosphere === 'sunset' ? 1.45 : 1.1,
        });
    seaMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = seaUniformTime;
      shader.uniforms.uGlitter = { value: seaGlitterColor };
      shader.uniforms.uFoamColor = { value: seaFoamColor };
      shader.uniforms.uTurquoise = { value: seaTurquoiseColor };
      shader.vertexShader =
        `
        uniform float uTime;
        varying vec3 vWorldPos;
        ` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          float w1 = sin(wp.x * 0.22 + uTime * 2.2 + sin(wp.z * 0.055) * 1.3) * 0.18;
          float w2 = cos(wp.x * 0.41 + wp.z * 0.14 + uTime * 2.85) * 0.09;
          float w3 = sin(wp.z * 0.09 - uTime * 1.4) * 0.06;
          transformed.z += w1 + w2 + w3;
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `,
        );
      shader.fragmentShader =
        `
        uniform float uTime;
        uniform vec3 uGlitter;
        uniform vec3 uFoamColor;
        uniform vec3 uTurquoise;
        varying vec3 vWorldPos;
        ` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          // Rolling Mediterranean swells moving inward toward the Corniche (-X)
          float swellPhase1 = vWorldPos.x * 0.34 + uTime * 2.15 + sin(vWorldPos.z * 0.08 + uTime * 0.55) * 1.55;
          float swellPhase2 = vWorldPos.x * 0.58 + uTime * 2.95 - sin(vWorldPos.z * 0.13 - uTime * 0.72) * 1.15;
          float waveA = sin(swellPhase1) * 0.5 + 0.5;
          float waveB = sin(swellPhase2) * 0.5 + 0.5;
          float crestMask = pow(clamp(waveA * 0.68 + waveB * 0.32, 0.0, 1.0), 4.2);
          float frothSparkle = sin(vWorldPos.z * 0.52 + uTime * 1.8) * 0.3 + 0.7;
          float whitecap = smoothstep(0.42, 0.88, crestMask * frothSparkle);

          // Sunlit turquoise water glow on rising wave slopes + crisp white foam crests
          float slopeGlow = smoothstep(0.28, 0.86, waveA);
          float s1 = sin(vWorldPos.x * 0.65 + uTime * 2.6);
          float s2 = cos(vWorldPos.z * 0.48 - uTime * 2.05);
          float glitter = pow(max(0.0, s1 * s2), 5.0);

          totalEmissiveRadiance += uTurquoise * slopeGlow * 0.45 + uFoamColor * whitecap * 0.78 + uGlitter * glitter;
          `,
        );
    };

    // Mediterranean Sea strictly OUTSIDE the Corniche seawall (x >= roadCenterX + 14.8) so zero sea geometry ever exists beneath the asphalt road or sidewalks!
    const seaWidth = 510;
    const seaGeo = new THREE.PlaneGeometry(
      seaWidth,
      ROUTE_SPAN + 260,
      isMobileDevice ? 24 : 72,
      isMobileDevice ? 110 : 260,
    );
    const seaPosAttr = seaGeo.attributes.position;
    for (let i = 0; i < seaPosAttr.count; i++) {
      const localX = seaPosAttr.getX(i);
      const localY = seaPosAttr.getY(i);
      const u = (localX + seaWidth * 0.5) / seaWidth;
      const worldZ = ROUTE_MID_Z - localY;
      seaPosAttr.setX(i, getRoadCenterX(worldZ) + 14.8 + u * seaWidth);
    }
    seaPosAttr.needsUpdate = true;
    seaGeo.computeBoundingBox();
    seaGeo.computeBoundingSphere();

    const seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.rotation.x = -Math.PI / 2;
    seaMesh.position.set(0, -0.75, ROUTE_MID_Z);
    if (districtHasSea) {
      scene.add(seaMesh);
    }

    if (!isUrbanCircuitTrack && districtHasSea) {
      if (activeDistrict.id === 'corniche') {
        const stanleyBaySea = new THREE.Mesh(
          new THREE.PlaneGeometry(66, 128, isMobileDevice ? 12 : 24, isMobileDevice ? 24 : 48),
          seaMat,
        );
        stanleyBaySea.rotation.x = -Math.PI / 2;
        stanleyBaySea.position.set(getRoadCenterX(STANLEY_BRIDGE_Z) - 4, -0.85, STANLEY_BRIDGE_Z);
        scene.add(stanleyBaySea);
      }

      // Crashing white shoreline surf & shallow foam ribbon strictly outside the Corniche seawall
      const shoreFoamMat = new THREE.MeshBasicMaterial({
        map: shoreFoamTex,
        color: atmosphere === 'night' ? 0xbae6fd : atmosphere === 'sunset' ? 0xfff0db : 0xffffff,
        transparent: true,
        opacity: atmosphere === 'night' ? 0.72 : 0.94,
        depthWrite: false,
      });
      const shoreSegments =
        activeDistrict.id === 'corniche'
          ? [
              { zStart: -85, zEnd: STANLEY_BRIDGE_Z + 86 },
              { zStart: STANLEY_BRIDGE_Z - 86, zEnd: Z_END },
            ]
          : [{ zStart: 40, zEnd: Z_END }];
      for (const seg of shoreSegments) {
        const foamGeo = createCurvedRibbonGeometry(14.95, 34.5, seg.zStart, seg.zEnd, isMobileDevice ? 12 : 8, () => -0.60, 1, 0.042);
        const foamMesh = new THREE.Mesh(foamGeo, shoreFoamMat);
        foamMesh.renderOrder = 2;
        scene.add(foamMesh);
      }
    }

    // Dynamic 3D Rolling Wave Crests & Breakwater Rock Sea-Spray Splash Plumes (recycled around player z)
    const WAVE_CREST_COUNT = isMobileDevice ? 8 : 32;
    const waveCrestGeo = new THREE.CylinderGeometry(0.32, 0.62, 1, 6, 1, false, 0, Math.PI);
    waveCrestGeo.rotateZ(Math.PI / 2);
    waveCrestGeo.rotateY(Math.PI / 2);
    const waveCrestMat = new THREE.MeshStandardMaterial({
      color: atmosphere === 'night' ? 0xbae6fd : atmosphere === 'sunset' ? 0xffedd5 : 0xf0fbff,
      emissive: atmosphere === 'night' ? 0x38bdf8 : atmosphere === 'sunset' ? 0x7c4a21 : 0x38bdf8,
      emissiveIntensity: atmosphere === 'night' ? 0.34 : 0.34,
      roughness: 0.35,
      transparent: true,
      opacity: atmosphere === 'night' ? 0.72 : 0.84,
      depthWrite: false,
    });
    const rollingWaveInst = new THREE.InstancedMesh(waveCrestGeo, waveCrestMat, WAVE_CREST_COUNT);
    rollingWaveInst.frustumCulled = false;
    rollingWaveInst.renderOrder = 3;
    const rollingWaveSpecs = Array.from({ length: WAVE_CREST_COUNT }, (_, i) => ({
      zRel: 24 - (i / WAVE_CREST_COUNT) * 235,
      phase: (i * 0.73) % 1,
      speed: 0.145 + (i % 5) * 0.018,
      length: 11 + (i % 4) * 4.5,
      height: 0.52 + (i % 3) * 0.22,
      rowBand: i % 3,
    }));
    if (!isUrbanCircuitTrack && districtHasSea) scene.add(rollingWaveInst);

    const SPRAY_PLUME_COUNT = isMobileDevice ? 4 : 22;
    const sprayGeo = new THREE.DodecahedronGeometry(0.95, 0);
    const sprayMat = new THREE.MeshBasicMaterial({
      color: atmosphere === 'night' ? 0xe0f2fe : atmosphere === 'sunset' ? 0xfff3e0 : 0xffffff,
      transparent: true,
      opacity: atmosphere === 'night' ? 0.44 : 0.62,
      depthWrite: false,
    });
    const sprayInst = new THREE.InstancedMesh(sprayGeo, sprayMat, SPRAY_PLUME_COUNT);
    sprayInst.frustumCulled = false;
    sprayInst.renderOrder = 4;
    const spraySpecs = Array.from({ length: SPRAY_PLUME_COUNT }, (_, i) => ({
      zRel: 18 - (i / SPRAY_PLUME_COUNT) * 205,
      phase: (i * 0.618) % 1,
      rate: 0.24 + (i % 4) * 0.045,
      xOff: 15.8 + (i % 3) * 1.15,
      maxHeight: 1.45 + (i % 4) * 0.48,
    }));
    if (!isUrbanCircuitTrack && districtHasSea) scene.add(sprayInst);

    // Coastal Breakwater Rocks along the RIGHT (+X) Mediterranean Sea edge
    const rockPositions: { x: number; z: number; sx: number; sy: number; rot: number }[] = [];
    for (let rz = 120; rz >= Z_END + 60; rz -= 22) {
      if (!isUrbanCircuitTrack && activeDistrict.id === 'corniche' && rz > -88) continue;
      if (!isUrbanCircuitTrack && activeDistrict.id === 'corniche' && Math.abs(rz - STANLEY_BRIDGE_Z) < 86) continue;
      rockPositions.push({
        x: getRoadCenterX(rz) + 16.5 + (Math.abs(rz) % 2) * 1.4,
        z: rz,
        sx: 0.9 + (Math.abs(rz) % 3) * 0.36,
        sy: 0.75 + (Math.abs(rz) % 2) * 0.35,
        rot: rz * 0.15,
      });
    }
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x948979, roughness: 0.92 }),
      rockPositions.length,
    );
    rockPositions.forEach((rk, i) => {
      _dummy.position.set(rk.x, 0.15, rk.z);
      _dummy.scale.set(rk.sx, rk.sy, rk.sx);
      _dummy.rotation.set(rk.rot, rk.rot * 1.3, 0);
      _dummy.updateMatrix();
      rockMesh.setMatrixAt(i, _dummy.matrix);
    });
    rockMesh.computeBoundingSphere();
    if (districtHasSea) {
      scene.add(rockMesh);
    }

    const prepMerge = (g: THREE.BufferGeometry) => {
      const nonIdx = g.index ? g.toNonIndexed() : g;
      if (!nonIdx.getAttribute('normal')) nonIdx.computeVertexNormals();
      if (!nonIdx.getAttribute('uv')) {
        const count = nonIdx.getAttribute('position').count;
        nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      return nonIdx;
    };

    // 2. Curved Dark Asphalt Corniche Road with PBR Roughness & Micro-Aggregate Normal Map
    const roadTex = createRoadTexture(maxAniso, 1);
    const roadRoughTex = createAsphaltRoughnessTexture(maxAniso, 1);
    const roadNormalTex = createAsphaltNormalTexture(maxAniso, 1);
    const roadGeo = createCurvedRibbonGeometry(
      -9.8,
      9.8,
      Z_START,
      Z_END,
      5,
      (z) =>
        isUrbanCircuitTrack
          ? getRoadHeightAt(z) + 0.02
          : Math.abs(z - STANLEY_BRIDGE_Z) < 88
            ? -1.5
            : 0.02,
      1,
      0.065,
    );
    const roadMat = isMobileDevice
      ? new THREE.MeshStandardMaterial({
          map: roadTex,
          roughness: 0.98,
          metalness: 0,
          envMapIntensity: 0,
        })
      : new THREE.MeshStandardMaterial({
          map: roadTex,
          roughnessMap: roadRoughTex,
          normalMap: roadNormalTex,
          normalScale: new THREE.Vector2(0.2, 0.2),
          roughness: 0.98,
          metalness: 0,
          envMapIntensity: 0,
        });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = !lowSpecOrMobile;
    scene.add(roadMesh);

    const cityGroundMat = new THREE.MeshStandardMaterial({
      color: 0xc8bca4,
      roughness: 0.96,
      metalness: 0,
      envMapIntensity: 0,
    });

    // 3. Classic Alexandria Corniche Promenade (Terracotta & Light Grey Interlocking Tiles),
    //    Sharp Yellow-Black Striped Curbs, and Open Stone-Pillar + Ornate Iron Railing Seawall
    const corniStoneTex = createStoneMasonryTexture('#E4DAC7', '#AFA28A', maxAniso);
    corniStoneTex.repeat.set(1, 1);
    const corniWallMat = new THREE.MeshStandardMaterial({
      map: corniStoneTex,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0,
    });
    const corniCapMat = new THREE.MeshStandardMaterial({
      color: 0xeae1cf,
      roughness: 0.85,
      metalness: 0,
      envMapIntensity: 0,
    });
    const wroughtIronMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e1e,
      metalness: 0.55,
      roughness: 0.42,
    });
    const yellowBlackCurbTex = createYellowBlackCurbTexture(maxAniso);
    const yellowBlackCurbMat = new THREE.MeshStandardMaterial({
      map: yellowBlackCurbTex,
      roughness: 0.86,
      metalness: 0,
      envMapIntensity: 0,
    });
    const medianGrassMat = new THREE.MeshStandardMaterial({
      color: 0x2f6b18,
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0,
    });
    const corniPromTex = createCornichePromenadeTexture(maxAniso);
    const corniPromMat = new THREE.MeshStandardMaterial({
      map: corniPromTex,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0,
    });
    const sidewalkTex = createSidewalkTexture(maxAniso);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0,
    });

    const roadSegments = isUrbanCircuitTrack
      ? [{ zStart: Z_START, zEnd: Z_END }]
      : [
          { zStart: Z_START, zEnd: STANLEY_BRIDGE_Z + 86 },
          { zStart: STANLEY_BRIDGE_Z - 86, zEnd: Z_END },
        ];

    for (const seg of roadSegments) {
      // City-side ground ribbon on LEFT (-X, South) following the Corniche curves cleanly
      const cityGroundSegGeo = createCurvedRibbonGeometry(-280, -9.6, seg.zStart, seg.zEnd, 10, () => -0.02, 1, 0.02);
      const cityGroundSegMesh = new THREE.Mesh(cityGroundSegGeo, cityGroundMat);
      cityGroundSegMesh.receiveShadow = true;

      // Coastal Terracotta & Light Grey Interlocking Tile Promenade on RIGHT (+X, Sea Side)
      const promGeo = createCurvedRibbonGeometry(10.04, 14.6, seg.zStart, seg.zEnd, 5, () => 0.28, 2, 0.26);
      const promMesh = new THREE.Mesh(promGeo, corniPromMat);
      promMesh.receiveShadow = true;

      // Crisp Yellow & Black Striped Coastal Curb on RIGHT (+X)
      const promCurbFaceGeo = createCurvedRibbonGeometry(
        9.6,
        9.78,
        seg.zStart,
        seg.zEnd,
        5,
        (_z, isLeft) => (isLeft ? 0.03 : 0.292),
        0.4,
        0.34,
      );
      const promCurbTopGeo = createCurvedRibbonGeometry(9.78, 10.04, seg.zStart, seg.zEnd, 5, () => 0.292, 0.4, 0.34);

      // Sea-Edge Embankment & Low Stone Parapet Base on RIGHT (+X)
      const wallParapetInnerGeo = createCurvedRibbonGeometry(
        14.06,
        14.1,
        seg.zStart,
        seg.zEnd,
        5,
        (_z, isLeft) => (isLeft ? 0.28 : 0.58),
        1,
        0.2,
      );
      const wallParapetTopGeo = createCurvedRibbonGeometry(14.08, 14.62, seg.zStart, seg.zEnd, 5, () => 0.58, 1, 0.2);
      const wallParapetOuterGeo = createCurvedRibbonGeometry(
        14.6,
        14.64,
        seg.zStart,
        seg.zEnd,
        5,
        (_z, isLeft) => (isLeft ? 0.58 : 0.28),
        1,
        0.2,
      );
      const seaEmbankGeo = createCurvedRibbonGeometry(
        14.58,
        15.05,
        seg.zStart,
        seg.zEnd,
        5,
        (_z, isLeft) => (isLeft ? 0.29 : -1.15),
        1,
        0.2,
      );

      // Center Median with Sharp Yellow & Black Striped Curbs + Flush Open Asphalt U-Turn Gaps ("ملفات الدوران")
      const isUTurnGap = (z: number) =>
        !isUrbanCircuitTrack && activeUTurnZones.some((ut) => Math.abs(z - ut.z) < 13.5);
      const medianLeftFaceGeo = createCurvedRibbonGeometry(
        MEDIAN_CENTER_X - 0.72,
        MEDIAN_CENTER_X - 0.54,
        seg.zStart,
        seg.zEnd,
        5,
        (z, isLeft) => (isUTurnGap(z) ? -0.06 : isLeft ? 0.03 : 0.34),
        0.4,
        0.34,
      );
      const medianLeftTopGeo = createCurvedRibbonGeometry(
        MEDIAN_CENTER_X - 0.54,
        MEDIAN_CENTER_X - 0.36,
        seg.zStart,
        seg.zEnd,
        5,
        (z) => (isUTurnGap(z) ? -0.06 : 0.34),
        0.4,
        0.34,
      );
      const medianRightTopGeo = createCurvedRibbonGeometry(
        MEDIAN_CENTER_X + 0.36,
        MEDIAN_CENTER_X + 0.54,
        seg.zStart,
        seg.zEnd,
        5,
        (z) => (isUTurnGap(z) ? -0.06 : 0.34),
        0.4,
        0.34,
      );
      const medianRightFaceGeo = createCurvedRibbonGeometry(
        MEDIAN_CENTER_X + 0.54,
        MEDIAN_CENTER_X + 0.72,
        seg.zStart,
        seg.zEnd,
        5,
        (z, isLeft) => (isUTurnGap(z) ? -0.06 : isLeft ? 0.34 : 0.03),
        0.4,
        0.34,
      );
      const medianSoilGeo = createCurvedRibbonGeometry(
        MEDIAN_CENTER_X - 0.36,
        MEDIAN_CENTER_X + 0.36,
        seg.zStart,
        seg.zEnd,
        5,
        (z) => (isUTurnGap(z) ? -0.06 : 0.35),
        1,
        0.1,
      );

      // City-Side Interlocking Sidewalk + Yellow-Black Striped Curb on LEFT (-X, Buildings Side)
      // Sinks cleanly beneath asphalt across the Post-Stanley Return-Side Flyover Bridge & Sidi Gaber Right-Turn Exit
      const cityWalkGeo = createCurvedRibbonGeometry(
        -SIDEWALK_CURB_X - 9.4,
        -SIDEWALK_CURB_X - 0.24,
        seg.zStart,
        seg.zEnd,
        5,
        (z) => (isPostStanleyRightZone(z) ? -1.35 : 0.24),
        4,
        0.26,
      );
      const cityCurbTopGeo = createCurvedRibbonGeometry(
        -SIDEWALK_CURB_X - 0.24,
        -SIDEWALK_CURB_X - 0.02,
        seg.zStart,
        seg.zEnd,
        5,
        (z) => (isPostStanleyRightZone(z) ? -1.35 : 0.245),
        0.4,
        0.34,
      );
      const cityCurbDropGeo = createCurvedRibbonGeometry(
        -SIDEWALK_CURB_X - 0.02,
        -SIDEWALK_CURB_X + 0.16,
        seg.zStart,
        seg.zEnd,
        5,
        (z, isLeft) => (isPostStanleyRightZone(z) ? -1.35 : isLeft ? 0.245 : 0.03),
        0.4,
        0.34,
      );

      scene.add(
        cityGroundSegMesh,
        new THREE.Mesh(medianLeftFaceGeo, yellowBlackCurbMat),
        new THREE.Mesh(medianLeftTopGeo, yellowBlackCurbMat),
        new THREE.Mesh(medianRightTopGeo, yellowBlackCurbMat),
        new THREE.Mesh(medianRightFaceGeo, yellowBlackCurbMat),
        new THREE.Mesh(medianSoilGeo, medianGrassMat),
        new THREE.Mesh(cityWalkGeo, sidewalkMat),
        new THREE.Mesh(cityCurbTopGeo, yellowBlackCurbMat),
        new THREE.Mesh(cityCurbDropGeo, yellowBlackCurbMat),
      );
      if (!isSidiGaberDistrict && !isGrandCity) {
        scene.add(
          promMesh,
          new THREE.Mesh(promCurbTopGeo, yellowBlackCurbMat),
          new THREE.Mesh(promCurbFaceGeo, yellowBlackCurbMat),
        );
      }
      if (districtHasSea) {
        scene.add(
          new THREE.Mesh(seaEmbankGeo, corniWallMat),
          new THREE.Mesh(wallParapetTopGeo, corniCapMat),
          new THREE.Mesh(wallParapetInnerGeo, corniWallMat),
          new THREE.Mesh(wallParapetOuterGeo, corniWallMat),
        );
      }
    }

    // Spaced Sculpted Stone Pillars + Ornate Dark Wrought-Iron Railings along Sea Edge
    const pillarParts: THREE.BufferGeometry[] = [];
    const pBase = new THREE.BoxGeometry(0.62, 0.34, 0.62);
    pBase.translate(0, 0.43, 0);
    pillarParts.push(prepMerge(pBase));
    const pShaft = new THREE.BoxGeometry(0.46, 0.66, 0.46);
    pShaft.translate(0, 0.93, 0);
    pillarParts.push(prepMerge(pShaft));
    const pCornice = new THREE.BoxGeometry(0.58, 0.11, 0.58);
    pCornice.translate(0, 1.31, 0);
    pillarParts.push(prepMerge(pCornice));
    const pCap = new THREE.BoxGeometry(0.4, 0.08, 0.4);
    pCap.translate(0, 1.4, 0);
    pillarParts.push(prepMerge(pCap));
    const seawallPillarGeo = mergeGeometries(pillarParts);

    // Ornate Wrought-Iron Railing Span (unit length 1.0 along Z, scaled dynamically between consecutive pillars!)
    const railParts: THREE.BufferGeometry[] = [];
    const rTopBar = new THREE.BoxGeometry(0.065, 0.055, 1.0);
    rTopBar.translate(0, 1.16, 0);
    railParts.push(prepMerge(rTopBar));
    const rFriezeBar = new THREE.BoxGeometry(0.045, 0.036, 1.0);
    rFriezeBar.translate(0, 1.02, 0);
    railParts.push(prepMerge(rFriezeBar));
    const rBotBar = new THREE.BoxGeometry(0.055, 0.045, 1.0);
    rBotBar.translate(0, 0.63, 0);
    railParts.push(prepMerge(rBotBar));
    for (let k = -4; k <= 4; k++) {
      const bar = new THREE.BoxGeometry(0.026, 0.52, 0.026);
      bar.translate(0, 0.89, k * 0.1);
      railParts.push(prepMerge(bar));
    }
    // Top frieze decorative rings & center scrollwork ring
    for (let k = -3; k <= 3; k++) {
      const ring = new THREE.TorusGeometry(0.048, 0.012, 5, 10);
      ring.rotateY(Math.PI / 2);
      ring.translate(0, 1.09, k * 0.13);
      railParts.push(prepMerge(ring));
    }
    const centerRing = new THREE.TorusGeometry(0.145, 0.018, 6, 14);
    centerRing.rotateY(Math.PI / 2);
    centerRing.translate(0, 0.82, 0);
    railParts.push(prepMerge(centerRing));
    const centerDiamond = new THREE.BoxGeometry(0.032, 0.13, 0.13);
    centerDiamond.rotateX(Math.PI / 4);
    centerDiamond.translate(0, 0.82, 0);
    railParts.push(prepMerge(centerDiamond));
    const seawallRailGeo = mergeGeometries(railParts);

    const pillarPositions: { x: number; z: number; yaw: number }[] = [];
    const railSpans: { x: number; z: number; len: number; yaw: number }[] = [];
    const SEAWALL_STEP = 5;
    for (const seg of roadSegments) {
      let prevP: { x: number; z: number } | null = null;
      for (let wz = seg.zStart - 2; wz >= seg.zEnd + 2; wz -= SEAWALL_STEP) {
        if (!isUrbanCircuitTrack && wz <= -28 && wz >= -52) {
          prevP = null;
          continue;
        }
        if (!isUrbanCircuitTrack && GAS_STATIONS.some((gs) => gs.side === 'right' && Math.abs(wz - gs.z) < 20)) {
          prevP = null;
          continue;
        }
        const px = getRoadCenterX(wz) + 14.35;
        pillarPositions.push({ x: px, z: wz, yaw: getRoadYawAt(wz) });
        if (prevP) {
          const dx = px - prevP.x;
          const dz = wz - prevP.z;
          const spanLen = Math.hypot(dx, dz);
          const spanYaw = Math.atan2(-dx, -dz);
          railSpans.push({
            x: (prevP.x + px) * 0.5,
            z: (prevP.z + wz) * 0.5,
            len: Math.max(0.5, spanLen - 0.42),
            yaw: spanYaw,
          });
        }
        prevP = { x: px, z: wz };
      }
    }

    if (districtHasSea && pillarPositions.length > 0) {
      const wallPillars = new THREE.InstancedMesh(seawallPillarGeo, corniCapMat, pillarPositions.length);
      wallPillars.castShadow = !lowSpecOrMobile;
      wallPillars.receiveShadow = !lowSpecOrMobile;
      pillarPositions.forEach((p, idx) => {
        _dummy.position.set(p.x, 0, p.z);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, p.yaw, 0);
        _dummy.updateMatrix();
        wallPillars.setMatrixAt(idx, _dummy.matrix);
      });
      wallPillars.computeBoundingSphere();
      scene.add(wallPillars);
    }

    if (districtHasSea && railSpans.length > 0) {
      const wallRails = new THREE.InstancedMesh(seawallRailGeo, wroughtIronMat, railSpans.length);
      railSpans.forEach((r, idx) => {
        _dummy.position.set(r.x, 0, r.z);
        _dummy.scale.set(1, 1, r.len);
        _dummy.rotation.set(0, r.yaw, 0);
        _dummy.updateMatrix();
        wallRails.setMatrixAt(idx, _dummy.matrix);
      });
      wallRails.computeBoundingSphere();
      scene.add(wallRails);
    }

    if (!isUrbanCircuitTrack) {
      if (activeDistrict.id === 'corniche') {
        const stanleyDividerSegs = 22;
        const stanleySegLen = 170 / stanleyDividerSegs;
        for (let si = 0; si < stanleyDividerSegs; si++) {
          const bz = STANLEY_BRIDGE_Z + 85 - (si + 0.5) * stanleySegLen;
          const bh = getRoadHeightAt(bz);
          const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, stanleySegLen + 0.3), yellowBlackCurbMat);
          barrier.position.set(getRoadCenterX(bz) + MEDIAN_CENTER_X, bh + 0.28, bz);
          barrier.rotation.x = getRoadPitchAt(bz);
          scene.add(barrier);
        }
      }

      // 3B. 3D Corniche U-Turn Turnaround Crossovers & Dual-Sided Signposts ("طرق وملفات دوران الكورنيش")
      const uturnRoadCanvas = document.createElement('canvas');
      uturnRoadCanvas.width = 256;
      uturnRoadCanvas.height = 256;
      const uCtx = uturnRoadCanvas.getContext('2d')!;
      uCtx.fillStyle = '#080808';
      uCtx.fillRect(0, 0, 256, 256);
      uCtx.strokeStyle = '#FFFFFF';
      uCtx.lineWidth = 10;
      uCtx.setLineDash([18, 12]);
      uCtx.strokeRect(8, 8, 240, 240);
      uCtx.setLineDash([]);
      // Bold painted white curved U-turn arrow on black asphalt
      uCtx.strokeStyle = '#FFFFFF';
      uCtx.lineWidth = 16;
      uCtx.lineCap = 'round';
      uCtx.beginPath();
      uCtx.moveTo(176, 200);
      uCtx.lineTo(176, 118);
      uCtx.arc(128, 118, 48, 0, Math.PI, true);
      uCtx.lineTo(80, 175);
      uCtx.stroke();
      uCtx.fillStyle = '#FFFFFF';
      uCtx.beginPath();
      uCtx.moveTo(80, 208);
      uCtx.lineTo(54, 166);
      uCtx.lineTo(106, 166);
      uCtx.closePath();
      uCtx.fill();
      const uturnRoadTex = new THREE.CanvasTexture(uturnRoadCanvas);
      uturnRoadTex.colorSpace = THREE.SRGBColorSpace;
      uturnRoadTex.anisotropy = maxAniso;
      extraTexturesToDispose.push(uturnRoadTex);

      const uturnSignCanvas = document.createElement('canvas');
      uturnSignCanvas.width = 384;
      uturnSignCanvas.height = 160;
      const sCtx = uturnSignCanvas.getContext('2d')!;
      sCtx.fillStyle = '#0c4a6e';
      sCtx.fillRect(0, 0, 384, 160);
      sCtx.strokeStyle = '#facc15';
      sCtx.lineWidth = 10;
      sCtx.strokeRect(6, 6, 372, 148);
      sCtx.fillStyle = '#facc15';
      sCtx.font = 'bold 46px Cairo, sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('↩ ملف دوران', 192, 74);
      sCtx.fillStyle = '#e0f2fe';
      sCtx.font = 'bold 30px sans-serif';
      sCtx.fillText('U-TURN CORNICHE', 192, 124);
      const uturnSignTex = new THREE.CanvasTexture(uturnSignCanvas);
      uturnSignTex.colorSpace = THREE.SRGBColorSpace;
      uturnSignTex.anisotropy = maxAniso;
      extraTexturesToDispose.push(uturnSignTex);

      const uturnPadMat = new THREE.MeshStandardMaterial({
        map: uturnRoadTex,
        roughness: 0.96,
        metalness: 0,
        envMapIntensity: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const uturnSignMat = new THREE.MeshStandardMaterial({
        map: uturnSignTex,
        emissive: 0x0ea5e9,
        emissiveMap: uturnSignTex,
        emissiveIntensity: atmosphere === 'night' ? 0.85 : 0.35,
        roughness: 0.35,
      });
      const bollardMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.45,
        roughness: 0.4,
      });
      const poleSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.38 });

      for (const ut of activeUTurnZones) {
        const ux = getRoadCenterX(ut.z) + MEDIAN_CENTER_X;
        const uy = getRoadHeightAt(ut.z);
        const uyaw = getRoadYawAt(ut.z);
        const utGroup = new THREE.Group();
        utGroup.position.set(ux, uy, ut.z);
        utGroup.rotation.y = uyaw;

        const pad = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 22), uturnPadMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = 0.04;
        utGroup.add(pad);

        // Reflective bollards & dual-sided U-turn signs on both ends of the median gap
        for (const sz of [-12.5, 12.5]) {
          const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.95, 8), bollardMat);
          bollard.position.set(0, 0.48, sz);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 4.1, 8), poleSteelMat);
          pole.position.set(0, 2.05, sz);
          const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.08, 0.14), uturnSignMat);
          board.position.set(0, 3.85, sz);
          utGroup.add(bollard, pole, board);
        }
        scene.add(utGroup);
      }

      // 3C. Post-Stanley Return-Side Flyover Bridge ("كوبري الكورنيش اليمين — الجنب الثاني الراجع") descending back onto the Corniche
      //     + Immediate Right-Turn Exit ("ملف يمين • اتجاه سيدي جابر") on the -X city side (RIGHT when returning toward +Z!)
      if (hasPostStanleyRightBridge) {
        const { bridgeStartZ, bridgeEndZ, turnStartZ, turnEndZ, turnCenterZ } = rightBridgeCfg;
        const flyoverGroup = new THREE.Group();

        const concretePierMat = new THREE.MeshStandardMaterial({
          color: 0xcbc7bf,
          roughness: 0.88,
          metalness: 0,
          envMapIntensity: 0,
        });
        const bridgeBeamMat = new THREE.MeshStandardMaterial({
          color: 0x9b9790,
          roughness: 0.86,
          metalness: 0,
          envMapIntensity: 0,
        });
        const bridgeParapetMat = new THREE.MeshStandardMaterial({
          map: corniStoneTex,
          roughness: 0.88,
          metalness: 0,
          envMapIntensity: 0,
        });
        const gantrySteelMat = new THREE.MeshStandardMaterial({ color: 0x525252, metalness: 0.5, roughness: 0.45 });
        const slipAsphaltMat = new THREE.MeshStandardMaterial({
          color: 0x080808,
          roughness: 0.98,
          metalness: 0,
          envMapIntensity: 0,
        });
        const bridgeLampGlobeMat = new THREE.MeshBasicMaterial({
          color: atmosphere === 'night' ? 0xfff0b3 : 0xfef3c7,
        });

        // Note: createCurvedRibbonGeometry expects offsetLeft < offsetRight and zStart > zEnd!
        // Here bridgeStartZ (-1082) < bridgeEndZ (-870), so ribbon zStart = bridgeEndZ + pad and zEnd = bridgeStartZ - pad.
        const deckZMax = bridgeEndZ + 18;
        const deckZMin = bridgeStartZ - 18;
        const rightDeckGeo = createCurvedRibbonGeometry(
          -16.05,
          -9.55,
          deckZMax,
          deckZMin,
          3,
          (z) => getRightBridgeHeightAt(z) + 0.04,
          0.55,
          0.085,
        );
        const rightDeckMesh = new THREE.Mesh(rightDeckGeo, roadMat);
        rightDeckMesh.receiveShadow = !lowSpecOrMobile;
        flyoverGroup.add(rightDeckMesh);

        // Concrete Bridge Underside / Soffit & Outer/Inner Structural Fascia Beams
        const spanZMax = bridgeEndZ + 4;
        const spanZMin = bridgeStartZ - 4;
        const soffitGeo = createCurvedRibbonGeometry(
          -16.18,
          -9.42,
          spanZMax,
          spanZMin,
          4,
          (z) => getRightBridgeHeightAt(z) - 0.68,
          1,
          0.06,
        );
        flyoverGroup.add(new THREE.Mesh(soffitGeo, concretePierMat));

        const outerFasciaGeo = createCurvedRibbonGeometry(
          -16.22,
          -16.05,
          spanZMax,
          spanZMin,
          3,
          (z, isLeft) => getRightBridgeHeightAt(z) + (isLeft ? -0.7 : 0.04),
          1,
          0.08,
        );
        flyoverGroup.add(new THREE.Mesh(outerFasciaGeo, bridgeBeamMat));

        const innerFasciaGeo = createCurvedRibbonGeometry(
          -9.56,
          -9.4,
          spanZMax,
          spanZMin,
          3,
          (z, isLeft) => getRightBridgeHeightAt(z) + (isLeft ? 0.04 : -0.7),
          1,
          0.08,
        );
        flyoverGroup.add(new THREE.Mesh(innerFasciaGeo, bridgeBeamMat));

        // Safety Parapets on Outer Edge (-16.05, full bridge) & Inner Edge (-9.55, elevated span only so entry/exit ramps stay wide open!)
        const outerParapetH = (z: number) => getRightBridgeHeightAt(z) + 0.94;
        const parZMax = bridgeEndZ + 8;
        const parZMin = bridgeStartZ - 8;
        const outerParapetInner = createCurvedRibbonGeometry(
          -15.9,
          -15.86,
          parZMax,
          parZMin,
          3,
          (z, isLeft) => (isLeft ? outerParapetH(z) : getRightBridgeHeightAt(z) + 0.04),
          1,
          0.16,
        );
        const outerParapetTop = createCurvedRibbonGeometry(
          -16.26,
          -15.88,
          parZMax,
          parZMin,
          3,
          (z) => outerParapetH(z),
          1,
          0.16,
        );
        const outerParapetOuter = createCurvedRibbonGeometry(
          -16.28,
          -16.24,
          parZMax,
          parZMin,
          3,
          (z, isLeft) => (isLeft ? getRightBridgeHeightAt(z) - 0.1 : outerParapetH(z)),
          1,
          0.16,
        );
        flyoverGroup.add(
          new THREE.Mesh(outerParapetInner, bridgeParapetMat),
          new THREE.Mesh(outerParapetTop, corniCapMat),
          new THREE.Mesh(outerParapetOuter, bridgeParapetMat),
        );

        const innerWallZMax = bridgeEndZ - 26;
        const innerWallZMin = bridgeStartZ + 26;
        const innerParapetTop = createCurvedRibbonGeometry(
          -9.72,
          -9.42,
          innerWallZMax,
          innerWallZMin,
          3,
          (z) => getRightBridgeHeightAt(z) + 0.88,
          0.4,
          0.34,
        );
        const innerParapetFace = createCurvedRibbonGeometry(
          -9.75,
          -9.7,
          innerWallZMax,
          innerWallZMin,
          3,
          (z, isLeft) => getRightBridgeHeightAt(z) + (isLeft ? 0.04 : 0.88),
          0.4,
          0.34,
        );
        flyoverGroup.add(
          new THREE.Mesh(innerParapetTop, yellowBlackCurbMat),
          new THREE.Mesh(innerParapetFace, bridgeParapetMat),
        );

        // Reinforced Concrete Support Piers & Glowing Bridge Streetlamps along the Return-Side Flyover Span
        for (let pz = bridgeStartZ + 24; pz <= bridgeEndZ - 24; pz += 24) {
          const bh = getRightBridgeHeightAt(pz);
          if (bh < 0.7) continue;
          const pxCenter = getRoadCenterX(pz) - 12.8;
          const pyaw = getRoadYawAt(pz) + Math.PI;

          const pierGrp = new THREE.Group();
          pierGrp.position.set(pxCenter, 0, pz);
          pierGrp.rotation.y = pyaw;

          const colH = bh + 2.5;
          const col1 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, colH, 10), concretePierMat);
          col1.position.set(-1.95, bh - 0.65 - colH * 0.5, 0);
          const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, colH, 10), concretePierMat);
          col2.position.set(1.95, bh - 0.65 - colH * 0.5, 0);
          const capBeam = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.72, 1.15), bridgeBeamMat);
          capBeam.position.set(0, bh - 0.92, 0);
          pierGrp.add(col1, col2, capBeam);

          // Bridge outer parapet streetlamp (local +X = outer -X edge!)
          const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 4.6, 8), poleSteelMat);
          lampPole.position.set(3.22, bh + 0.9 + 2.3, 0);
          const lampArm = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.08), poleSteelMat);
          lampArm.position.set(2.45, bh + 5.4, 0);
          const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), bridgeLampGlobeMat);
          lampBulb.position.set(1.75, bh + 5.32, 0);
          pierGrp.add(lampPole, lampArm, lampBulb);

          flyoverGroup.add(pierGrp);
        }

        // Custom High-Resolution Highway Signs facing the returning driver (+Z direction)
        const makeHighwayBoardTex = (
          line1: string,
          line2: string,
          bgHex: string,
          accentHex: string,
          drawRightArrow: boolean,
        ) => {
          const c = document.createElement('canvas');
          c.width = 768;
          c.height = 256;
          const ctx = c.getContext('2d')!;
          ctx.fillStyle = bgHex;
          ctx.fillRect(0, 0, 768, 256);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 12;
          ctx.strokeRect(12, 12, 744, 232);
          ctx.strokeStyle = accentHex;
          ctx.lineWidth = 4;
          ctx.strokeRect(24, 24, 720, 208);

          if (drawRightArrow) {
            ctx.fillStyle = '#FACC15';
            ctx.beginPath();
            ctx.moveTo(625, 184);
            ctx.lineTo(625, 118);
            ctx.lineTo(682, 118);
            ctx.lineTo(682, 82);
            ctx.lineTo(734, 134);
            ctx.lineTo(682, 186);
            ctx.lineTo(682, 150);
            ctx.lineTo(655, 150);
            ctx.lineTo(655, 184);
            ctx.closePath();
            ctx.fill();
          }

          const textCenterX = drawRightArrow ? 320 : 384;
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 68px Cairo, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(line1, textCenterX, 102);

          ctx.fillStyle = accentHex;
          ctx.font = 'bold 34px Cairo, sans-serif';
          ctx.fillText(line2, textCenterX, 182);

          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAniso;
          extraTexturesToDispose.push(tex);
          return tex;
        };

        const bridgeEntranceTex = makeHighwayBoardTex(
          '▲ كوبري الكورنيش اليمين',
          'ينزل على الكورنيش ثم ملف سيدي جابر ➔',
          '#004B93',
          '#FACC15',
          false,
        );
        const sidiGaberGantryTex = makeHighwayBoardTex(
          'اتجاه سيدي جابر',
          'ملف يمين بعد نزول الكوبري ➔',
          '#004B93',
          '#FDE047',
          true,
        );
        const sidiGaberExitPostTex = createBlueHighwaySignTexture(
          'اتجاه سيدي جابر ➔',
          'ملف يمين · سيدي جابر',
          maxAniso,
        );
        extraTexturesToDispose.push(sidiGaberExitPostTex);

        const rightTurnArrowCanvas = document.createElement('canvas');
        rightTurnArrowCanvas.width = 256;
        rightTurnArrowCanvas.height = 256;
        const aCtx = rightTurnArrowCanvas.getContext('2d')!;
        aCtx.clearRect(0, 0, 256, 256);
        aCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        aCtx.beginPath();
        aCtx.moveTo(96, 230);
        aCtx.lineTo(96, 112);
        aCtx.lineTo(176, 112);
        aCtx.lineTo(176, 70);
        aCtx.lineTo(242, 134);
        aCtx.lineTo(176, 198);
        aCtx.lineTo(176, 154);
        aCtx.lineTo(136, 154);
        aCtx.lineTo(136, 230);
        aCtx.closePath();
        aCtx.fill();
        const rightTurnArrowTex = new THREE.CanvasTexture(rightTurnArrowCanvas);
        rightTurnArrowTex.colorSpace = THREE.SRGBColorSpace;
        rightTurnArrowTex.anisotropy = maxAniso;
        extraTexturesToDispose.push(rightTurnArrowTex);

        const rightTurnArrowMat = new THREE.MeshBasicMaterial({
          map: rightTurnArrowTex,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });

        const signEmissiveIntensity = atmosphere === 'night' ? 0.95 : 0.34;
        const bridgeEntranceMat = new THREE.MeshStandardMaterial({
          map: bridgeEntranceTex,
          emissive: 0x0284c7,
          emissiveMap: bridgeEntranceTex,
          emissiveIntensity: signEmissiveIntensity,
          roughness: 0.32,
        });
        const sidiGaberGantryMat = new THREE.MeshStandardMaterial({
          map: sidiGaberGantryTex,
          emissive: 0x0284c7,
          emissiveMap: sidiGaberGantryTex,
          emissiveIntensity: signEmissiveIntensity,
          roughness: 0.3,
        });
        const sidiGaberExitMat = new THREE.MeshStandardMaterial({
          map: sidiGaberExitPostTex,
          emissive: 0x0284c7,
          emissiveMap: sidiGaberExitPostTex,
          emissiveIntensity: signEmissiveIntensity,
          roughness: 0.32,
        });

        // (A) Bridge Entrance Overhead Steel Gantry just after Stanley descent on the return side (-X)
        const entZ = bridgeStartZ - 2;
        const entGrp = new THREE.Group();
        entGrp.position.set(getRoadCenterX(entZ) - 12.75, 0, entZ);
        entGrp.rotation.y = getRoadYawAt(entZ) + Math.PI;
        const entLeftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.4, 8), gantrySteelMat);
        entLeftPole.position.set(-3.45, 3.2, 0);
        const entRightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.4, 8), gantrySteelMat);
        entRightPole.position.set(3.45, 3.2, 0);
        const entCross = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.28, 0.28), gantrySteelMat);
        entCross.position.set(0, 6.25, 0);
        const entBoard = new THREE.Mesh(new THREE.BoxGeometry(6.3, 1.9, 0.16), bridgeEntranceMat);
        entBoard.position.set(0, 5.55, 0.12);
        entGrp.add(entLeftPole, entRightPole, entCross, entBoard);
        flyoverGroup.add(entGrp);

        // (B) Overhead Highway Gantry right after Bridge Touchdown announcing "اتجاه سيدي جابر ➔"
        const ganZ = bridgeEndZ + 12;
        const ganGrp = new THREE.Group();
        ganGrp.position.set(getRoadCenterX(ganZ) - 8.6, 0, ganZ);
        ganGrp.rotation.y = getRoadYawAt(ganZ) + Math.PI;
        const gPoleL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 7.2, 10), gantrySteelMat);
        gPoleL.position.set(-7.6, 3.6, 0);
        const gPoleR = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 7.2, 10), gantrySteelMat);
        gPoleR.position.set(7.6, 3.6, 0);
        const gBeamTop = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.34, 0.34), gantrySteelMat);
        gBeamTop.position.set(0, 6.95, 0);
        const gBoard = new THREE.Mesh(new THREE.BoxGeometry(8.8, 2.65, 0.2), sidiGaberGantryMat);
        gBoard.position.set(1.2, 6.05, 0.16);
        for (const lx of [-1.8, 1.2, 4.2]) {
          const spotBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), bridgeLampGlobeMat);
          spotBulb.position.set(lx, 7.28, 0.95);
          ganGrp.add(spotBulb);
        }
        ganGrp.add(gPoleL, gPoleR, gBeamTop, gBoard);
        flyoverGroup.add(ganGrp);

        // (C) Sidi Gaber Right-Turn Slip Road ("ملف يمين • اتجاه سيدي جابر") branching to -X (city side = RIGHT of return driver!)
        const turnApronGeo = createCurvedRibbonGeometry(
          -17.8,
          -9.4,
          turnEndZ + 6,
          turnStartZ - 8,
          4,
          () => 0.035,
          0.6,
          0.08,
        );
        flyoverGroup.add(new THREE.Mesh(turnApronGeo, roadMat));

        // 3D Paved Right-Turn Boulevard branching off into the city (-X = local +X when rotated +PI!)
        const turnGrp = new THREE.Group();
        turnGrp.position.set(getRoadCenterX(turnCenterZ) - 12.5, 0, turnCenterZ);
        turnGrp.rotation.y = getRoadYawAt(turnCenterZ) + Math.PI;

        const branchRoad = new THREE.Mesh(new THREE.PlaneGeometry(78, 24), slipAsphaltMat);
        branchRoad.rotation.x = -Math.PI / 2;
        branchRoad.position.set(39, 0.04, 0);
        branchRoad.receiveShadow = !lowSpecOrMobile;
        turnGrp.add(branchRoad);

        const northCurb = new THREE.Mesh(new THREE.BoxGeometry(74, 0.34, 0.65), yellowBlackCurbMat);
        northCurb.position.set(41, 0.17, -12.3);
        const southCurb = new THREE.Mesh(new THREE.BoxGeometry(74, 0.34, 0.65), yellowBlackCurbMat);
        southCurb.position.set(41, 0.17, 12.3);
        turnGrp.add(northCurb, southCurb);

        const northWalk = new THREE.Mesh(new THREE.BoxGeometry(74, 0.28, 4.2), sidewalkMat);
        northWalk.position.set(41, 0.14, -14.7);
        const southWalk = new THREE.Mesh(new THREE.BoxGeometry(74, 0.28, 4.2), sidewalkMat);
        southWalk.position.set(41, 0.14, 14.7);
        turnGrp.add(northWalk, southWalk);

        const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let dx = 10; dx <= 72; dx += 8) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.32), dashMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(dx, 0.06, 0);
          turnGrp.add(dash);
        }

        // Painted white Right-Turn Arrows guiding return drivers into "ملف يمين • اتجاه سيدي جابر"
        for (const az of [18, 4, -8]) {
          const arrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), rightTurnArrowMat);
          arrowMesh.rotation.x = -Math.PI / 2;
          arrowMesh.position.set(-4.2, 0.07, az);
          turnGrp.add(arrowMesh);
        }

        // Illuminated Roadside Exit Signboard at the corner of the Right Turn: "اتجاه سيدي جابر ➔"
        const exitPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 4.8, 8), gantrySteelMat);
        exitPostL.position.set(5.4, 2.4, -13.6);
        const exitPostR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 4.8, 8), gantrySteelMat);
        exitPostR.position.set(9.4, 2.4, -13.6);
        const exitBoard = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.95, 0.18), sidiGaberExitMat);
        exitBoard.position.set(7.4, 4.35, -13.6);
        exitBoard.rotation.y = -0.28;
        turnGrp.add(exitPostL, exitPostR, exitBoard);

        // Reflective Orange & White Chevron Turning Boards along the far edge of the right turn
        const chevronTex = createSignTexture('➔ ➔ ➔', 'اتجاه سيدي جابر', '#F97316', maxAniso);
        extraTexturesToDispose.push(chevronTex);
        const chevronMat = new THREE.MeshStandardMaterial({
          map: chevronTex,
          emissive: 0xea580c,
          emissiveMap: chevronTex,
          emissiveIntensity: atmosphere === 'night' ? 0.85 : 0.25,
          roughness: 0.4,
        });
        for (let ci = 0; ci < 3; ci++) {
          const cx = 12 + ci * 14;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.4, 8), poleSteelMat);
          post.position.set(cx, 1.2, -13.2);
          const chev = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.95, 0.14), chevronMat);
          chev.position.set(cx, 2.15, -13.2);
          turnGrp.add(post, chev);
        }

        // Streetlamps lining both sides of the Sidi Gaber Right-Turn Boulevard
        for (let lx = 14; lx <= 66; lx += 18) {
          for (const sideSign of [-1, 1]) {
            const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 8), poleSteelMat);
            lp.position.set(lx, 3.1, sideSign * 13.8);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 2.0), poleSteelMat);
            arm.position.set(lx, 6.1, sideSign * 12.8);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), bridgeLampGlobeMat);
            bulb.position.set(lx, 6.02, sideSign * 11.9);
            turnGrp.add(lp, arm, bulb);
          }
        }

        // Low Mediterranean city facades framing the Sidi Gaber right-turn avenue in the distance
        const facadeColors = [0xe8dcc8, 0xd9c6a8, 0xcfd8e3, 0xe2cfb4];
        for (let bi = 0; bi < 4; bi++) {
          const bx = 26 + bi * 14;
          for (const sideSign of [-1, 1]) {
            const bh = 12 + ((bi * 5 + (sideSign > 0 ? 3 : 0)) % 9);
            const bldg = new THREE.Mesh(
              new THREE.BoxGeometry(11.5, bh, 9.5),
              new THREE.MeshStandardMaterial({
                color: facadeColors[(bi + (sideSign > 0 ? 1 : 0)) % facadeColors.length],
                roughness: 0.85,
              }),
            );
            bldg.position.set(bx, bh * 0.5, sideSign * 22.5);
            turnGrp.add(bldg);
          }
        }

        flyoverGroup.add(turnGrp);
        scene.add(flyoverGroup);
      }
    }

    // 4. Long Regular Row of Tall Palm Trees along Corniche Promenade + Median Foliage
    const treeBundle = createRealisticTreeBundle(maxAniso);
    const treeEntries: {
      x: number;
      z: number;
      scale: number;
      rot: number;
      isPalm: boolean;
      leafKind: 'ficus' | 'poinciana' | 'olive';
    }[] = [];

    // Regular tall Corniche palm avenue every 16m along RIGHT (+X) sea promenade (skipped on Sidi Gaber & Grand City bypass sector!)
    for (let pz = 144, ti = 0; pz >= Z_END + 76; pz -= 16, ti++) {
      if (
        !isSideBypassAtZ(pz) &&
        (isUrbanCircuitTrack ||
          (Math.abs(pz - STANLEY_BRIDGE_Z) >= 92 &&
            !activeGasStations.some((gs) => gs.side === 'right' && Math.abs(pz - gs.z) < 20)))
      ) {
        treeEntries.push({
          x: getRoadCenterX(pz) + 11.45,
          z: pz,
          scale: 1.04 + (ti % 3) * 0.04,
          rot: pz * 0.31,
          isPalm: true,
          leafKind: 'ficus',
        });
      }
      // Median trees & palms spaced cleanly away from median lamp posts & U-turn gaps
      if (
        ti % 2 === 0 &&
        (isUrbanCircuitTrack ||
          (Math.abs(pz - STANLEY_BRIDGE_Z) >= 96 && !activeUTurnZones.some((ut) => Math.abs(pz - 8 - ut.z) < 17)))
      ) {
        const leafKinds: ('ficus' | 'poinciana' | 'olive')[] = ['ficus', 'poinciana', 'olive'];
        treeEntries.push({
          x: getRoadCenterX(pz - 8) + MEDIAN_CENTER_X,
          z: pz - 8,
          scale: 0.88 + ((ti * 5) % 4) * 0.05,
          rot: pz * 0.43,
          isPalm: ti % 4 === 0,
          leafKind: leafKinds[ti % 3],
        });
      }
    }

    const palms = treeEntries.filter((t) => t.isPalm);
    const ficusTrees = treeEntries.filter((t) => !t.isPalm && t.leafKind === 'ficus');
    const poincianaTrees = treeEntries.filter((t) => !t.isPalm && t.leafKind === 'poinciana');
    const oliveTrees = treeEntries.filter((t) => !t.isPalm && t.leafKind === 'olive');

    if (palms.length > 0) {
      const palmTrunkInst = new THREE.InstancedMesh(treeBundle.palmTrunkGeo, treeBundle.palmBarkMat, palms.length);
      const palmDatesInst = new THREE.InstancedMesh(treeBundle.palmDatesGeo, treeBundle.palmDatesMat, palms.length);
      const palmCrownInst = new THREE.InstancedMesh(treeBundle.palmCrownGeo, treeBundle.palmFrondMat, palms.length);
      palmTrunkInst.castShadow = !lowSpecOrMobile;
      palmCrownInst.castShadow = !lowSpecOrMobile;
      palms.forEach((p, i) => {
        _dummy.position.set(p.x, 0.28, p.z);
        _dummy.scale.set(p.scale, p.scale, p.scale);
        _dummy.rotation.set(0, p.rot, 0);
        _dummy.updateMatrix();
        palmTrunkInst.setMatrixAt(i, _dummy.matrix);
        palmDatesInst.setMatrixAt(i, _dummy.matrix);
        palmCrownInst.setMatrixAt(i, _dummy.matrix);
      });
      palmTrunkInst.computeBoundingSphere();
      palmDatesInst.computeBoundingSphere();
      palmCrownInst.computeBoundingSphere();
      scene.add(palmTrunkInst, palmDatesInst, palmCrownInst);
    }

    const addLeafyTreeSpecies = (list: typeof treeEntries, canopyMat: THREE.Material) => {
      if (list.length === 0) return;
      const woodInst = new THREE.InstancedMesh(treeBundle.leafWoodGeo, treeBundle.leafBarkMat, list.length);
      const canopyInst = new THREE.InstancedMesh(treeBundle.leafCanopyGeo, canopyMat, list.length);
      list.forEach((t, i) => {
        _dummy.position.set(t.x, 0.34, t.z);
        _dummy.scale.set(t.scale, t.scale, t.scale);
        _dummy.rotation.set(0, t.rot, 0);
        _dummy.updateMatrix();
        woodInst.setMatrixAt(i, _dummy.matrix);
        canopyInst.setMatrixAt(i, _dummy.matrix);
      });
      woodInst.computeBoundingSphere();
      canopyInst.computeBoundingSphere();
      scene.add(woodInst, canopyInst);
    };

    addLeafyTreeSpecies(ficusTrees, treeBundle.ficusCanopyMat);
    addLeafyTreeSpecies(poincianaTrees, treeBundle.poincianaCanopyMat);
    addLeafyTreeSpecies(oliveTrees, treeBundle.oliveCanopyMat);

    // 5. Classic Black Cast-Iron Alexandria Streetlights with Double & Triple Top Lanterns
    const buildClassicLanternLampGeo = (isTriple: boolean) => {
      const ironParts: THREE.BufferGeometry[] = [];
      const glassParts: THREE.BufferGeometry[] = [];

      // Ornate tiered cast-iron base plinth
      const plinth = new THREE.CylinderGeometry(0.22, 0.28, 0.42, 8);
      plinth.translate(0, 0.21, 0);
      ironParts.push(prepMerge(plinth));

      const ped = new THREE.CylinderGeometry(0.14, 0.21, 0.65, 8);
      ped.translate(0, 0.74, 0);
      ironParts.push(prepMerge(ped));

      const collar1 = new THREE.TorusGeometry(0.15, 0.032, 6, 10);
      collar1.rotateX(Math.PI / 2);
      collar1.translate(0, 1.08, 0);
      ironParts.push(prepMerge(collar1));

      // Tapered black post
      const shaft = new THREE.CylinderGeometry(0.068, 0.11, 4.15, 8);
      shaft.translate(0, 3.15, 0);
      ironParts.push(prepMerge(shaft));

      const topCapital = new THREE.CylinderGeometry(0.13, 0.08, 0.24, 8);
      topCapital.translate(0, 5.25, 0);
      ironParts.push(prepMerge(topCapital));

      // Sweeping twin side bracket arms + optional center crown post for triple-lantern candelabra
      const addLanternAt = (lx: number, ly: number, scale = 1) => {
        const bottomCup = new THREE.CylinderGeometry(0.14 * scale, 0.06 * scale, 0.1 * scale, 6);
        bottomCup.translate(lx, ly - 0.14 * scale, 0);
        ironParts.push(prepMerge(bottomCup));

        const glass = new THREE.CylinderGeometry(0.17 * scale, 0.12 * scale, 0.32 * scale, 6);
        glass.translate(lx, ly + 0.06 * scale, 0);
        glassParts.push(prepMerge(glass));

        const roof = new THREE.ConeGeometry(0.22 * scale, 0.18 * scale, 6);
        roof.translate(lx, ly + 0.3 * scale, 0);
        ironParts.push(prepMerge(roof));

        const finial = new THREE.SphereGeometry(0.045 * scale, 6, 6);
        finial.translate(lx, ly + 0.42 * scale, 0);
        ironParts.push(prepMerge(finial));
      };

      const crossbar = new THREE.BoxGeometry(1.48, 0.065, 0.065);
      crossbar.translate(0, 5.38, 0);
      ironParts.push(prepMerge(crossbar));

      for (const side of [-1, 1]) {
        const scrollCurve = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.08, 5.05, 0),
            new THREE.Vector3(side * 0.44, 5.32, 0),
            new THREE.Vector3(side * 0.72, 5.42, 0),
          ]),
          8,
          0.032,
          6,
          false,
        );
        ironParts.push(prepMerge(scrollCurve));
        addLanternAt(side * 0.72, 5.56, 0.96);
      }

      if (isTriple) {
        const centerRise = new THREE.CylinderGeometry(0.05, 0.065, 0.42, 8);
        centerRise.translate(0, 5.52, 0);
        ironParts.push(prepMerge(centerRise));
        addLanternAt(0, 5.88, 1.08);
      }

      return {
        ironGeo: mergeGeometries(ironParts),
        glassGeo: mergeGeometries(glassParts),
      };
    };

    const doubleLampGeos = buildClassicLanternLampGeo(false);
    const tripleLampGeos = buildClassicLanternLampGeo(true);
    const blackCastIronMat = new THREE.MeshStandardMaterial({
      color: 0x0f141c,
      metalness: 0.78,
      roughness: 0.34,
    });
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: atmosphere === 'night' ? 0xffd166 : 0xfbbf24,
      emissiveIntensity: atmosphere === 'night' ? 5.6 : atmosphere === 'sunset' ? 2.9 : 1.75,
      roughness: 0.18,
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: atmosphere === 'night' ? 0xffe49a : 0xfef08a,
      transparent: true,
      opacity: atmosphere === 'night' ? 0.72 : atmosphere === 'sunset' ? 0.34 : 0.16,
      blending: atmosphere === 'night' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const promLampEntries: { x: number; y: number; z: number; yaw: number }[] = [];
    const medianLampEntries: { x: number; y: number; z: number; yaw: number }[] = [];
    const leftLampEntries: { x: number; y: number; z: number; yaw: number }[] = [];

    // Promenade Double-Lantern Black Lamps cleanly centered between consecutive palm trees on RIGHT (+X)
    for (let lz = 136; lz >= Z_END + 76; lz -= 16) {
      if (
        !isSideBypassAtZ(lz) &&
        (isUrbanCircuitTrack ||
          (Math.abs(lz - STANLEY_BRIDGE_Z) >= 92 &&
            !activeGasStations.some((gs) => gs.side === 'right' && Math.abs(lz - gs.z) < 20)))
      ) {
        promLampEntries.push({
          x: getRoadCenterX(lz) + 10.65,
          y: 0.28,
          z: lz,
          yaw: getRoadYawAt(lz),
        });
      }
    }
    // Left Sidewalk Double-Lantern Lamps along the cafés & buildings edge (-X) so BOTH street sides glow brightly!
    for (let llz = 128; llz >= Z_END + 76; llz -= 20) {
      if (
        !isPostStanleyRightZone(llz) &&
        !activeGasStations.some((gs) => gs.side === 'left' && Math.abs(llz - gs.z) < 22)
      ) {
        leftLampEntries.push({
          x: getRoadCenterX(llz) - 10.75,
          y: getRoadHeightAt(llz) + 0.26,
          z: llz,
          yaw: getRoadYawAt(llz),
        });
      }
    }
    // Center Median Triple-Lantern Black Candelabras every 20m (skipping U-Turn openings)
    for (let mz = 132; mz >= Z_END + 80; mz -= 20) {
      if (!isUrbanCircuitTrack && activeUTurnZones.some((ut) => Math.abs(mz - ut.z) < 16)) continue;
      medianLampEntries.push({
        x: getRoadCenterX(mz) + MEDIAN_CENTER_X,
        y: getRoadHeightAt(mz) + 0.34,
        z: mz,
        yaw: getRoadYawAt(mz),
      });
    }

    const sideLampEntries = [...promLampEntries, ...leftLampEntries];
    if (sideLampEntries.length > 0) {
      const promIronInst = new THREE.InstancedMesh(doubleLampGeos.ironGeo, blackCastIronMat, sideLampEntries.length);
      const promGlassInst = new THREE.InstancedMesh(doubleLampGeos.glassGeo, globeMat, sideLampEntries.length);
      sideLampEntries.forEach((le, i) => {
        _dummy.position.set(le.x, le.y, le.z);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, le.yaw, 0);
        _dummy.updateMatrix();
        promIronInst.setMatrixAt(i, _dummy.matrix);
        promGlassInst.setMatrixAt(i, _dummy.matrix);
      });
      promIronInst.computeBoundingSphere();
      promGlassInst.computeBoundingSphere();
      scene.add(promIronInst, promGlassInst);
    }

    if (medianLampEntries.length > 0) {
      const medIronInst = new THREE.InstancedMesh(tripleLampGeos.ironGeo, blackCastIronMat, medianLampEntries.length);
      const medGlassInst = new THREE.InstancedMesh(tripleLampGeos.glassGeo, globeMat, medianLampEntries.length);
      medianLampEntries.forEach((le, i) => {
        _dummy.position.set(le.x, le.y, le.z);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, le.yaw, 0);
        _dummy.updateMatrix();
        medIronInst.setMatrixAt(i, _dummy.matrix);
        medGlassInst.setMatrixAt(i, _dummy.matrix);
      });
      medIronInst.computeBoundingSphere();
      medGlassInst.computeBoundingSphere();
      scene.add(medIronInst, medGlassInst);
    }

    const totalHaloCount = sideLampEntries.length * 2 + medianLampEntries.length * 3;
    if (totalHaloCount > 0) {
      const haloMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(atmosphere === 'night' ? 0.92 : 0.68, 8, 8),
        haloMat,
        totalHaloCount,
      );
      let hIdx = 0;
      const pushLanternHalo = (lx: number, ly: number, lz: number, yaw: number, ox: number, oy: number) => {
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        _dummy.position.set(lx + ox * cosY, ly + oy, lz - ox * sinY);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        haloMesh.setMatrixAt(hIdx++, _dummy.matrix);
      };
      for (const le of sideLampEntries) {
        pushLanternHalo(le.x, le.y, le.z, le.yaw, -0.72, 5.62);
        pushLanternHalo(le.x, le.y, le.z, le.yaw, 0.72, 5.62);
      }
      for (const le of medianLampEntries) {
        pushLanternHalo(le.x, le.y, le.z, le.yaw, -0.72, 5.62);
        pushLanternHalo(le.x, le.y, le.z, le.yaw, 0.72, 5.62);
        pushLanternHalo(le.x, le.y, le.z, le.yaw, 0, 5.94);
      }
      haloMesh.computeBoundingSphere();
      scene.add(haloMesh);
    }

    // 1-Draw-Call Instanced Warm Golden Streetlamp Light Pools + Volumetric Downward Light Cones at Night!
    if (atmosphere === 'night' || atmosphere === 'sunset') {
      const streetPoolTex = createStreetLightPoolTexture();
      extraTexturesToDispose.push(streetPoolTex);
      const poolGeo = new THREE.PlaneGeometry(1, 1);
      poolGeo.rotateX(-Math.PI / 2);
      const poolMat = new THREE.MeshBasicMaterial({
        map: streetPoolTex,
        color: atmosphere === 'night' ? 0xffe4a0 : 0xffd584,
        transparent: true,
        opacity: atmosphere === 'night' ? 0.94 : 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const totalPools = promLampEntries.length + leftLampEntries.length + medianLampEntries.length;
      if (totalPools > 0) {
        const poolInst = new THREE.InstancedMesh(poolGeo, poolMat, totalPools);
        poolInst.renderOrder = 2;
        let pIdx = 0;
        for (const le of promLampEntries) {
          const cosY = Math.cos(le.yaw);
          const sinY = Math.sin(le.yaw);
          const inX = -3.6;
          _dummy.position.set(
            le.x + inX * cosY,
            getRoadHeightAt(le.z) + 0.06,
            le.z - inX * sinY,
          );
          _dummy.rotation.set(0, le.yaw, 0);
          _dummy.scale.set(16.5, 1, 18.5);
          _dummy.updateMatrix();
          poolInst.setMatrixAt(pIdx++, _dummy.matrix);
        }
        for (const le of leftLampEntries) {
          const cosY = Math.cos(le.yaw);
          const sinY = Math.sin(le.yaw);
          const inX = 2.8;
          _dummy.position.set(
            le.x + inX * cosY,
            getRoadHeightAt(le.z) + 0.06,
            le.z - inX * sinY,
          );
          _dummy.rotation.set(0, le.yaw, 0);
          _dummy.scale.set(16.5, 1, 18.5);
          _dummy.updateMatrix();
          poolInst.setMatrixAt(pIdx++, _dummy.matrix);
        }
        for (const le of medianLampEntries) {
          _dummy.position.set(le.x, getRoadHeightAt(le.z) + 0.065, le.z);
          _dummy.rotation.set(0, le.yaw, 0);
          _dummy.scale.set(22.5, 1, 23.0);
          _dummy.updateMatrix();
          poolInst.setMatrixAt(pIdx++, _dummy.matrix);
        }
        poolInst.computeBoundingSphere();
        scene.add(poolInst);
      }

      // Visible downward golden streetlight beam cones at Night (1 draw call!)
      if (atmosphere === 'night' && totalPools > 0) {
        const coneGeo = new THREE.CylinderGeometry(0.28, 3.3, 5.4, 8, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
          color: 0xffd57a,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const coneInst = new THREE.InstancedMesh(coneGeo, coneMat, totalPools);
        let cIdx = 0;
        for (const le of [...promLampEntries, ...leftLampEntries, ...medianLampEntries]) {
          _dummy.position.set(le.x, le.y + 2.85, le.z);
          _dummy.rotation.set(0, le.yaw, 0);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          coneInst.setMatrixAt(cIdx++, _dummy.matrix);
        }
        coneInst.computeBoundingSphere();
        scene.add(coneInst);
      }
    }

    // 6. Colorful Varied Buildings + Illuminated Apartment Windows & Open Shops
    const facadeVariants = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4];
    const facadeTextures = [
      createAlexBuildingFacadeTexture('#E28562', '#7C2D12', '#FFF5EB', 0, maxAniso),
      createAlexBuildingFacadeTexture('#86CFBA', '#0F766E', '#F8FAFC', 1, maxAniso),
      createAlexBuildingFacadeTexture('#F3C44F', '#1E3A5F', '#FFFBEB', 2, maxAniso),
      createAlexBuildingFacadeTexture('#7CBCE8', '#1E40AF', '#F8FAFC', 3, maxAniso),
      createAlexBuildingFacadeTexture('#F09B8D', '#9F1239', '#FFF1F2', 4, maxAniso),
      createAlexBuildingFacadeTexture('#A3D49C', '#065F46', '#F7FEE7', 5, maxAniso),
      createAlexBuildingFacadeTexture('#B8B2E8', '#4C1D95', '#F5F3FF', 6, maxAniso),
      createAlexBuildingFacadeTexture('#F5B06B', '#9A3412', '#FFF7ED', 0, maxAniso),
      createAlexBuildingFacadeTexture('#7AD3E0', '#0E7490', '#ECFEFF', 1, maxAniso),
      createAlexBuildingFacadeTexture('#E89EB8', '#831843', '#FDF2F8', 2, maxAniso),
      createAlexBuildingFacadeTexture('#F2DFB6', '#78350F', '#FFFDF7', 3, maxAniso),
      createAlexBuildingFacadeTexture('#D97E6B', '#450A0A', '#FEF2F2', 4, maxAniso),
    ];
    const windowGlowTextures = facadeVariants.map((variant) =>
      createAlexBuildingWindowGlowTexture(variant, maxAniso),
    );
    const facadeMats = facadeTextures.map(
      (tex, idx) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.72,
          emissive: new THREE.Color(0xffd584),
          emissiveMap: windowGlowTextures[idx],
          emissiveIntensity: atmosphere === 'night' ? 2.8 : atmosphere === 'sunset' ? 0.95 : 0.05,
        }),
    );

    interface BldgEntry {
      x: number;
      z: number;
      yaw: number;
      w: number;
      h: number;
      d: number;
      hasPenthouse: boolean;
      pentColor: number;
    }
    const bldgBatches: BldgEntry[][] = Array.from({ length: facadeMats.length }, () => []);
    const penthouseEntries: { x: number; y: number; z: number; yaw: number; w: number; d: number; color: number }[] = [];
    const balconySlabs: { x: number; y: number; z: number; yaw: number; d: number }[] = [];
    const shopInstances: {
      kind: 'supermarket' | 'cafe' | 'restaurant' | 'pharmacy';
      frontX: number;
      z: number;
      yaw: number;
      awningColor: number;
    }[] = [];

    const shopKinds: ('supermarket' | 'cafe' | 'restaurant' | 'pharmacy')[] = [
      'cafe',
      'supermarket',
      'restaurant',
      'pharmacy',
      'cafe',
    ];
    const awningColors = [0x0284c7, 0xd97706, 0xdc2626, 0x059669, 0x7c3aed, 0xe11d48];
    const pentColors = [0xfef3c7, 0xbae6fd, 0xfecdd3, 0xa7f3d0, 0xfde68a];

    let bz = 45;
    let bi = 0;
    while (bz >= Z_END + 100) {
      const hash = ((bi * 2654435761) >>> 0) % 1000;
      const d = 12 + (hash % 13);
      const w = 10 + ((hash >> 3) % 11);
      const h = 9 + ((hash * 17) % 33);

      // Buildings stand on the LEFT (-X, South/City) side opposite the Sea and Montaza Palace
      const nearLeftLandmark = activeLandmarks.some((lm) => {
        if (lm.id === 'qaitbay' || lm.id === 'mandara') return false;
        if (lm.id === 'stanley') return Math.abs(-lm.distanceM - bz) < 92;
        return Math.abs(-lm.distanceM - bz) < 48;
      });
      const nearLeftGasStation =
        !isUrbanCircuitTrack &&
        activeGasStations.some((gs) => gs.side === 'left' && Math.abs(gs.z - bz) < 26);
      const nearSgCrossStreet =
        isSidiGaberDistrict && sgCrossStreetZs.some((cz) => Math.abs(cz - bz) < 16);
      const nearReturnBridgeOrTurn =
        hasPostStanleyRightBridge &&
        bz >= rightBridgeCfg.bridgeStartZ - 34 &&
        bz <= rightBridgeCfg.turnEndZ + 30;
      if (!nearLeftLandmark && !nearLeftGasStation && !nearSgCrossStreet && !nearReturnBridgeOrTurn) {
        const roadX = getRoadCenterX(bz);
        const yaw = getRoadYawAt(bz);
        const frontOffset = 18.8 + (hash % 4) * 0.6;
        const centerOffset = frontOffset + w / 2;
        const paletteIdx = (bi * 5 + (hash % 7)) % facadeMats.length;
        const pentColor = pentColors[bi % pentColors.length];

        const entry: BldgEntry = {
          x: roadX - centerOffset,
          z: bz,
          yaw,
          w,
          h,
          d,
          hasPenthouse: bi % 2 === 0,
          pentColor,
        };
        bldgBatches[paletteIdx].push(entry);

        if (entry.hasPenthouse) {
          penthouseEntries.push({
            x: roadX - centerOffset - 1.2,
            y: h + 1.4,
            z: bz,
            yaw,
            w: w * 0.52,
            d: d * 0.5,
            color: pentColor,
          });
        }

        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);

        const floors = Math.floor((h - 4.5) / 3.4);
        const balSpan = Math.min(4.6, d * 0.28);
        const balOff = d * 0.25;
        for (let f = 0; f < Math.min(floors, 7); f++) {
          const by = 5.4 + f * 3.4;
          for (const oz of [-balOff, balOff]) {
            const lx = -(frontOffset - 0.5);
            balconySlabs.push({
              x: roadX + lx * cosY + oz * sinY,
              y: by,
              z: bz - lx * sinY + oz * cosY,
              yaw,
              d: balSpan,
            });
          }
        }

        const numShops = d >= 18 ? 2 : 1;
        for (let s = 0; s < numShops; s++) {
          const oz = numShops === 1 ? 0 : s === 0 ? -d * 0.24 : d * 0.24;
          shopInstances.push({
            kind: shopKinds[(bi + s) % shopKinds.length],
            frontX: roadX - frontOffset * cosY + oz * sinY,
            z: bz + frontOffset * sinY + oz * cosY,
            yaw,
            awningColor: awningColors[(bi + s) % awningColors.length],
          });
        }
      }

      bz -= d + 2.6 + (hash % 4);
      bi++;
    }

    bldgBatches.forEach((list, idx) => {
      if (list.length === 0) return;
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMats[idx], list.length);
      inst.castShadow = !lowSpecOrMobile;
      inst.receiveShadow = !lowSpecOrMobile;
      list.forEach((b, i) => {
        _dummy.position.set(b.x, b.h / 2, b.z);
        _dummy.scale.set(b.w, b.h, b.d);
        _dummy.rotation.set(0, b.yaw, 0);
        _dummy.updateMatrix();
        inst.setMatrixAt(i, _dummy.matrix);
      });
      inst.computeBoundingSphere();
      scene.add(inst);
    });

    if (penthouseEntries.length > 0) {
      const pentInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 2.8, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }),
        penthouseEntries.length,
      );
      penthouseEntries.forEach((p, i) => {
        _dummy.position.set(p.x, p.y, p.z);
        _dummy.scale.set(p.w, 1, p.d);
        _dummy.rotation.set(0, p.yaw, 0);
        _dummy.updateMatrix();
        pentInst.setMatrixAt(i, _dummy.matrix);
        _color.setHex(p.color);
        pentInst.setColorAt(i, _color);
      });
      pentInst.computeBoundingSphere();
      if (pentInst.instanceColor) pentInst.instanceColor.needsUpdate = true;
      scene.add(pentInst);
    }

    if (balconySlabs.length > 0) {
      const balSlabInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1.15, 0.2, 1),
        new THREE.MeshStandardMaterial({ color: 0xf1e8d6, roughness: 0.8 }),
        balconySlabs.length,
      );
      const balRailInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.1, 0.72, 1),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 }),
        balconySlabs.length,
      );
      balconySlabs.forEach((bs, i) => {
        _dummy.position.set(bs.x, bs.y, bs.z);
        _dummy.scale.set(1, 1, bs.d);
        _dummy.rotation.set(0, bs.yaw, 0);
        _dummy.updateMatrix();
        balSlabInst.setMatrixAt(i, _dummy.matrix);

        _dummy.position.set(bs.x + 0.52 * Math.cos(bs.yaw), bs.y + 0.44, bs.z - 0.52 * Math.sin(bs.yaw));
        _dummy.updateMatrix();
        balRailInst.setMatrixAt(i, _dummy.matrix);
      });
      balSlabInst.computeBoundingSphere();
      balRailInst.computeBoundingSphere();
      scene.add(balSlabInst, balRailInst);
    }

    const shopMeta: Record<
      'supermarket' | 'cafe' | 'restaurant' | 'pharmacy',
      { title: string; bg: string; accent: string }
    > = {
      supermarket: { title: 'سوبر ماركت', bg: '#0369A1', accent: '#FACC15' },
      cafe: { title: 'مقهى إسكندرية', bg: '#78350F', accent: '#FBBF24' },
      restaurant: { title: 'مطعم الميناء', bg: '#B91C1C', accent: '#FDE047' },
      pharmacy: { title: 'صيدلية الشاطئ', bg: '#047857', accent: '#FFFFFF' },
    };

    // 7. Landmark & Shop Signage Textures (tracked in extraTexturesToDispose)
    const shopFaceGeo = new THREE.PlaneGeometry(8.2, 3.6);
    const shopSignGeo = new THREE.PlaneGeometry(5.8, 1.35);

    (['supermarket', 'cafe', 'restaurant', 'pharmacy'] as const).forEach((kind) => {
      const subset = shopInstances.filter((s) => s.kind === kind);
      if (subset.length === 0) return;
      const frontTex = createShopfrontTexture(kind, maxAniso);
      const signTex = createShopSignTexture(
        shopMeta[kind].title,
        shopMeta[kind].bg,
        shopMeta[kind].accent,
        maxAniso,
      );
      extraTexturesToDispose.push(frontTex, signTex);

      const frontMat = new THREE.MeshStandardMaterial({
        map: frontTex,
        emissiveMap: frontTex,
        emissive: new THREE.Color(0xfff3d6),
        emissiveIntensity: atmosphere === 'night' ? 2.2 : atmosphere === 'sunset' ? 1.15 : 0.42,
        roughness: 0.32,
      });
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: atmosphere === 'night' ? 2.4 : atmosphere === 'sunset' ? 1.25 : 0.45,
        roughness: 0.3,
      });

      const frontInst = new THREE.InstancedMesh(shopFaceGeo, frontMat, subset.length);
      const signInst = new THREE.InstancedMesh(shopSignGeo, signMat, subset.length);
      subset.forEach((item, idx) => {
        const cosY = Math.cos(item.yaw);
        const sinY = Math.sin(item.yaw);
        _dummy.position.set(item.frontX + 0.12 * cosY, 2.0, item.z - 0.12 * sinY);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, item.yaw + Math.PI / 2, 0);
        _dummy.updateMatrix();
        frontInst.setMatrixAt(idx, _dummy.matrix);

        _dummy.position.set(item.frontX + 0.25 * cosY, 4.45, item.z - 0.25 * sinY);
        _dummy.updateMatrix();
        signInst.setMatrixAt(idx, _dummy.matrix);
      });
      frontInst.computeBoundingSphere();
      signInst.computeBoundingSphere();
      scene.add(frontInst, signInst);
    });

    if (shopInstances.length > 0) {
      const awningInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1.5, 0.22, 8.0),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
        shopInstances.length,
      );
      const bulbsPerShop = atmosphere === 'night' ? 4 : 2;
      const awningBulbInst =
        atmosphere !== 'day'
          ? new THREE.InstancedMesh(
              new THREE.SphereGeometry(atmosphere === 'night' ? 0.17 : 0.14, 8, 8),
              new THREE.MeshStandardMaterial({
                color: 0xfffbeb,
                emissive: 0xffd166,
                emissiveIntensity: atmosphere === 'night' ? 4.8 : 1.9,
              }),
              shopInstances.length * bulbsPerShop,
            )
          : null;

      shopInstances.forEach((s, idx) => {
        const cosY = Math.cos(s.yaw);
        const sinY = Math.sin(s.yaw);
        _dummy.position.set(s.frontX + 0.8 * cosY, 3.72, s.z - 0.8 * sinY);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, s.yaw, -0.25);
        _dummy.updateMatrix();
        awningInst.setMatrixAt(idx, _dummy.matrix);
        _color.setHex(s.awningColor);
        awningInst.setColorAt(idx, _color);

        if (awningBulbInst) {
          for (let b = 0; b < bulbsPerShop; b++) {
            const oz = bulbsPerShop === 4 ? -3.0 + b * 2.0 : b === 0 ? -2.2 : 2.2;
            _dummy.position.set(
              s.frontX + 1.18 * cosY + oz * sinY,
              3.42,
              s.z - 1.18 * sinY + oz * cosY,
            );
            _dummy.scale.set(1, 1, 1);
            _dummy.rotation.set(0, 0, 0);
            _dummy.updateMatrix();
            awningBulbInst.setMatrixAt(idx * bulbsPerShop + b, _dummy.matrix);
          }
        }
      });
      awningInst.computeBoundingSphere();
      if (awningInst.instanceColor) awningInst.instanceColor.needsUpdate = true;
      scene.add(awningInst);
      if (awningBulbInst) {
        awningBulbInst.computeBoundingSphere();
        scene.add(awningBulbInst);
      }

      // Warm Café & Shop Sidewalk Spill-Light Pools at Night so every café glows brightly onto the pavement!
      if (atmosphere === 'night') {
        const cafePoolTex = createStreetLightPoolTexture();
        extraTexturesToDispose.push(cafePoolTex);
        const cafePoolGeo = new THREE.PlaneGeometry(1, 1);
        cafePoolGeo.rotateX(-Math.PI / 2);
        const cafePoolMat = new THREE.MeshBasicMaterial({
          map: cafePoolTex,
          color: 0xffd27d,
          transparent: true,
          opacity: 0.86,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        const cafePoolInst = new THREE.InstancedMesh(cafePoolGeo, cafePoolMat, shopInstances.length);
        cafePoolInst.renderOrder = 2;
        shopInstances.forEach((s, idx) => {
          const cosY = Math.cos(s.yaw);
          const sinY = Math.sin(s.yaw);
          _dummy.position.set(s.frontX + 2.6 * cosY, getRoadHeightAt(s.z) + 0.14, s.z - 2.6 * sinY);
          _dummy.rotation.set(0, s.yaw, 0);
          _dummy.scale.set(11.0, 1, 12.0);
          _dummy.updateMatrix();
          cafePoolInst.setMatrixAt(idx, _dummy.matrix);
        });
        cafePoolInst.computeBoundingSphere();
        scene.add(cafePoolInst);
      }
    }

    const cafeSpots = shopInstances.filter((s) => s.kind === 'cafe' || s.kind === 'restaurant');
    const tableList: { x: number; z: number; color: number }[] = [];
    cafeSpots.forEach((cs, idx) => {
      const cosY = Math.cos(cs.yaw);
      const sinY = Math.sin(cs.yaw);
      const tx = cs.frontX + 2.9 * cosY;
      const tz = cs.z - 2.9 * sinY;
      tableList.push({ x: tx + 1.9 * sinY, z: tz + 1.9 * cosY, color: idx % 2 === 0 ? 0xd97706 : 0x0284c7 });
      tableList.push({ x: tx - 1.9 * sinY, z: tz - 1.9 * cosY, color: idx % 2 === 0 ? 0xdc2626 : 0x10b981 });
    });

    if (tableList.length > 0) {
      const tableTopInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.08, 10),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 }),
        tableList.length,
      );
      const tableLegInst = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.06, 0.14, 0.72, 6),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 }),
        tableList.length,
      );
      const umbrellaInst = new THREE.InstancedMesh(
        new THREE.ConeGeometry(1.25, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }),
        tableList.length,
      );
      const chairInst = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.42, 0.52, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 }),
        tableList.length * 2,
      );

      tableList.forEach((t, idx) => {
        _dummy.position.set(t.x, 0.94, t.z);
        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        tableTopInst.setMatrixAt(idx, _dummy.matrix);

        _dummy.position.set(t.x, 0.56, t.z);
        _dummy.updateMatrix();
        tableLegInst.setMatrixAt(idx, _dummy.matrix);

        _dummy.position.set(t.x, 2.35, t.z);
        _dummy.updateMatrix();
        umbrellaInst.setMatrixAt(idx, _dummy.matrix);
        _color.setHex(t.color);
        umbrellaInst.setColorAt(idx, _color);

        for (let c = 0; c < 2; c++) {
          _dummy.position.set(t.x, 0.46, t.z + (c === 0 ? -0.82 : 0.82));
          _dummy.updateMatrix();
          chairInst.setMatrixAt(idx * 2 + c, _dummy.matrix);
          _color.setHex(c === 0 ? 0x92400e : 0x78350f);
          chairInst.setColorAt(idx * 2 + c, _color);
        }
      });
      tableTopInst.computeBoundingSphere();
      tableLegInst.computeBoundingSphere();
      umbrellaInst.computeBoundingSphere();
      chairInst.computeBoundingSphere();
      if (umbrellaInst.instanceColor) umbrellaInst.instanceColor.needsUpdate = true;
      if (chairInst.instanceColor) chairInst.instanceColor.needsUpdate = true;
      scene.add(tableTopInst, tableLegInst, umbrellaInst, chairInst);

      // Glowing warm lanterns hanging under every outdoor café umbrella at Night!
      if (atmosphere === 'night') {
        const cafeLanternInst = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.16, 8, 8),
          new THREE.MeshStandardMaterial({
            color: 0xfffbeb,
            emissive: 0xffc857,
            emissiveIntensity: 4.4,
          }),
          tableList.length,
        );
        tableList.forEach((t, idx) => {
          _dummy.position.set(t.x, 1.98, t.z);
          _dummy.scale.set(1, 1, 1);
          _dummy.rotation.set(0, 0, 0);
          _dummy.updateMatrix();
          cafeLanternInst.setMatrixAt(idx, _dummy.matrix);
        });
        cafeLanternInst.computeBoundingSphere();
        scene.add(cafeLanternInst);
      }
    }

    // 7. Static Realistic Sidewalk Pedestrians
    const crowdShirtPalette = [
      0x38bdf8, 0xf472b6, 0x34d399, 0xfbbf24, 0xa78bfa, 0xef4444, 0xffffff, 0xf97316,
    ];
    const staticPeople: { x: number; z: number; rotY: number; color: number }[] = [];
    const staticPedStep = isMobileDevice ? 56 : 28;
    for (let pz = 25, ci = 0; pz >= Z_END + 140; pz -= staticPedStep, ci++) {
      const roadX = getRoadCenterX(pz);
      if (isUrbanCircuitTrack || Math.abs(pz - STANLEY_BRIDGE_Z) >= 92) {
        const groupSize = isMobileDevice ? 1 : 2 + (ci % 2);
        for (let k = 0; k < groupSize; k++) {
          staticPeople.push({
            x: roadX + 13.0 - (k % 2) * 0.9,
            z: pz + k * 1.15,
            rotY: k === 0 ? -1.2 : 1.4,
            color: crowdShirtPalette[(ci + k) % crowdShirtPalette.length],
          });
        }
      }
      const cityCount = isMobileDevice ? 1 : 2;
      for (let k = 0; k < cityCount; k++) {
        staticPeople.push({
          x: roadX - SIDEWALK_CURB_X - 1.8 - k * 1.1,
          z: pz - 8 + k * 0.9,
          rotY: k === 0 ? 0.8 : -2.1,
          color: crowdShirtPalette[(ci + k + 3) % crowdShirtPalette.length],
        });
      }
    }

    if (staticPeople.length > 0) {
      const ha = modelFactory.sharedHumanAssets;
      const pShirtMat = new THREE.MeshStandardMaterial({
        map: ha.shirtFabricTex,
        color: 0xffffff,
        roughness: 0.78,
      });

      const n = staticPeople.length;
      const pPelvis = new THREE.InstancedMesh(ha.humanPelvisGeo, ha.trousersMat, n);
      const pTorso = new THREE.InstancedMesh(ha.humanTorsoGeo, pShirtMat, n);
      const pNeck = new THREE.InstancedMesh(ha.humanNeckGeo, ha.skinMat, n);
      const pHead = new THREE.InstancedMesh(ha.humanHeadGeo, ha.faceMat, n);
      const pHair = new THREE.InstancedMesh(ha.humanHairCapGeo, ha.hairMat, n);
      const pLegs = new THREE.InstancedMesh(ha.humanThighGeo, ha.trousersMat, n * 2);
      const pCalves = new THREE.InstancedMesh(ha.humanCalfGeo, ha.trousersMat, n * 2);
      const pShoes = new THREE.InstancedMesh(ha.humanShoeGeo, ha.shoeMat, n * 2);
      const pUpperArms = new THREE.InstancedMesh(ha.humanUpperArmGeo, pShirtMat, n * 2);
      const pForearms = new THREE.InstancedMesh(ha.humanForearmGeo, ha.skinMat, n * 2);

      staticPeople.forEach((sp, i) => {
        const baseY = sp.x > getRoadCenterX(sp.z) ? 0.28 : 0.24;
        const cosR = Math.cos(sp.rotY);
        const sinR = Math.sin(sp.rotY);
        const worldOff = (lx: number, ly: number, lz: number) => {
          _dummy.position.set(
            sp.x + lx * cosR + lz * sinR,
            baseY + ly,
            sp.z - lx * sinR + lz * cosR,
          );
        };

        _dummy.scale.set(1, 1, 1);
        _dummy.rotation.set(0, sp.rotY, 0);

        worldOff(0, 0.89, 0);
        _dummy.updateMatrix();
        pPelvis.setMatrixAt(i, _dummy.matrix);

        worldOff(0, 1.22, 0);
        _dummy.updateMatrix();
        pTorso.setMatrixAt(i, _dummy.matrix);
        _color.setHex(sp.color);
        pTorso.setColorAt(i, _color);

        worldOff(0, 1.51, 0);
        _dummy.updateMatrix();
        pNeck.setMatrixAt(i, _dummy.matrix);

        worldOff(0, 1.65, 0);
        _dummy.rotation.set(0, sp.rotY + Math.PI / 2, 0);
        _dummy.updateMatrix();
        pHead.setMatrixAt(i, _dummy.matrix);

        worldOff(0, 1.655, 0.006);
        _dummy.rotation.set(0, sp.rotY, 0);
        _dummy.updateMatrix();
        pHair.setMatrixAt(i, _dummy.matrix);

        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? -1 : 1;
          const idx2 = i * 2 + s;

          worldOff(side * 0.095, 0.64, 0);
          _dummy.updateMatrix();
          pLegs.setMatrixAt(idx2, _dummy.matrix);

          worldOff(side * 0.095, 0.26, 0);
          _dummy.updateMatrix();
          pCalves.setMatrixAt(idx2, _dummy.matrix);

          worldOff(side * 0.095, 0.04, -0.04);
          _dummy.updateMatrix();
          pShoes.setMatrixAt(idx2, _dummy.matrix);

          worldOff(side * 0.225, 1.29, 0);
          _dummy.updateMatrix();
          pUpperArms.setMatrixAt(idx2, _dummy.matrix);
          pUpperArms.setColorAt(idx2, _color);

          worldOff(side * 0.225, 1.06, 0);
          _dummy.updateMatrix();
          pForearms.setMatrixAt(idx2, _dummy.matrix);
        }
      });

      [pPelvis, pTorso, pNeck, pHead, pHair, pLegs, pCalves, pShoes, pUpperArms, pForearms].forEach((m) => {
        m.computeBoundingSphere();
        scene.add(m);
      });
      if (pTorso.instanceColor) pTorso.instanceColor.needsUpdate = true;
      if (pUpperArms.instanceColor) pUpperArms.instanceColor.needsUpdate = true;
    }

    // 8. Walking & Waving Pedestrians
    interface AnimatedPedestrian {
      rig: PedestrianRig;
      side: 'sea' | 'city';
      isWaver: boolean;
      laneOffset: number;
      z: number;
      dirZ: 1 | -1;
      speed: number;
      phase: number;
    }
    const animatedPeds: AnimatedPedestrian[] = [];
    const pedCount = isMobileDevice ? 6 : 28;
    for (let i = 0; i < pedCount; i++) {
      const side: 'sea' | 'city' = i % 3 === 0 ? 'sea' : 'city';
      const isWaver = side === 'city' && i % 4 === 1;
      const rig = modelFactory.buildPedestrianRig(crowdShirtPalette[i % crowdShirtPalette.length], i);
      const laneOffset = isWaver
        ? SIDEWALK_CURB_X + 0.45
        : side === 'sea'
          ? (isSidiGaberDistrict ? 18.2 : 12.0) + (i % 2 === 0 ? 0.7 : -0.6)
          : -SIDEWALK_CURB_X - 1.4 - (i % 2 === 0 ? 0.5 : 1.5);
      const z = -12 - i * 7.2;
      const dirZ: 1 | -1 = i % 2 === 0 ? -1 : 1;
      rig.group.position.set(getRoadCenterX(z) + laneOffset, isWaver || side === 'sea' ? 0.28 : 0.24, z);
      rig.group.rotation.y = isWaver ? Math.PI / 2 : dirZ === -1 ? 0 : Math.PI;
      scene.add(rig.group);
      animatedPeds.push({
        rig,
        side,
        isWaver,
        laneOffset,
        z,
        dirZ,
        speed: isWaver ? 0 : 1.45 + (i % 3) * 0.35,
        phase: i * 0.85,
      });
    }

    // 9. Working Traffic Signals & Officers
    const crosswalkTex = createCrosswalkTexture(maxAniso);
    extraTexturesToDispose.push(crosswalkTex);
    const crosswalkMat = new THREE.MeshBasicMaterial({
      map: crosswalkTex,
      transparent: true,
      depthWrite: false,
    });
    const crosswalkGeo = new THREE.PlaneGeometry(19.6, 5.4);
    crosswalkGeo.rotateX(-Math.PI / 2);

    const signalZones = isSidiGaberDistrict
      ? [-540, -1500, -2960]
      : isGrandCity
        ? [-520, -1680, -2680, -3420, -4320, -5360]
        : [-480, -1040, -1580, -2060, -2680, -3220];
    const signals: SignalIntersection[] = signalZones.map((sz, idx) => {
      const roadX = getRoadCenterX(sz);
      const yaw = getRoadYawAt(sz);

      const cw = new THREE.Mesh(crosswalkGeo, crosswalkMat);
      cw.position.set(roadX, 0.04, sz);
      cw.rotation.y = yaw;
      scene.add(cw);

      const rig = modelFactory.buildTrafficSignalAndOfficer();
      rig.group.position.set(roadX, 0, sz);
      rig.group.rotation.y = yaw;
      scene.add(rig.group);

      const crossers: CrossingPedestrian[] = [];
      for (let c = 0; c < 3; c++) {
        const pRig = modelFactory.buildPedestrianRig(crowdShirtPalette[(idx * 3 + c) % crowdShirtPalette.length], c + idx);
        const dirX: -1 | 1 = c % 2 === 0 ? -1 : 1;
        const startLane = dirX === -1 ? SIDEWALK_CURB_X + 0.8 : -SIDEWALK_CURB_X - 0.8;
        const zOff = (c - 1) * 1.4;
        pRig.group.position.set(roadX + startLane, 0.06, sz + zOff);
        pRig.group.rotation.y = dirX === -1 ? Math.PI / 2 : -Math.PI / 2;
        pRig.group.visible = false;
        scene.add(pRig.group);
        crossers.push({
          rig: pRig,
          laneOffset: startLane,
          dirX,
          zOffset: zOff,
          speed: 3.1 + c * 0.45,
          phase: c * 1.7 + idx,
        });
      }

      return {
        z: sz,
        phaseOffset: idx * 5.2,
        rig,
        state: 'green',
        crossers,
        violated: false,
      };
    });

    // 10. Alexandria Landmarks (Corniche iconic landmarks OR 3 custom unlockable 3D districts!)
    const landmarksBuilt =
      !isUrbanCircuitTrack && activeDistrict.id === 'corniche'
        ? buildAllAlexandriaLandmarks(maxAniso, treeBundle, atmosphere, isMobileDevice)
        : null;
    if (landmarksBuilt) {
      scene.add(landmarksBuilt.group);
    }
    const animatedBoats = landmarksBuilt ? landmarksBuilt.animatedBoats : [];

    const districtEnv =
      !isUrbanCircuitTrack && activeDistrict.id !== 'corniche'
        ? buildAlexDistrictEnvironment(
            activeDistrict.id,
            maxAniso,
            atmosphere,
            isMobileDevice,
            getRoadCenterX,
            getRoadYawAt,
            getRoadHeightAt,
          )
        : null;
    if (districtEnv) {
      scene.add(districtEnv.group);
    }

    // 10b. Corniche & District Gas Stations on BOTH Right & Left Sides (بنزينات اليمين والشمال)
    const gasStationsBuilt = !isUrbanCircuitTrack
      ? buildCornicheGasStations(maxAniso, atmosphere, isMobileDevice, {
          getRoadCenterX,
          getRoadYawAt,
          getRoadHeightAt,
          getRightExtraX: (z) => (isSideBypassAtZ(z) ? 6.6 : 0),
          extraStations: isGrandCity ? GRAND_EXTRA_GAS_STATIONS : undefined,
        })
      : null;
    if (gasStationsBuilt) {
      scene.add(gasStationsBuilt.group);
    }
    const gasStationRings = gasStationsBuilt ? gasStationsBuilt.rings : [];

    // Race Start / Finish & Lap Checkered Gantry Arches
    if (isRaceMode && activeTrack) {
      const bannerCanvas = document.createElement('canvas');
      bannerCanvas.width = 256;
      bannerCanvas.height = 64;
      const bCtx = bannerCanvas.getContext('2d');
      if (bCtx) {
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 16; c++) {
            bCtx.fillStyle = (r + c) % 2 === 0 ? '#0f172a' : '#f8fafc';
            bCtx.fillRect(c * 16, r * 16, 16, 16);
          }
        }
        bCtx.fillStyle = 'rgba(245, 158, 11, 0.92)';
        bCtx.fillRect(88, 14, 80, 36);
        bCtx.fillStyle = '#0f172a';
        bCtx.font = 'bold 20px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText('RACE', 128, 33);
      }
      const archTex = new THREE.CanvasTexture(bannerCanvas);
      archTex.colorSpace = THREE.SRGBColorSpace;
      extraTexturesToDispose.push(archTex);

      const archPillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 });
      const archBannerMat = new THREE.MeshStandardMaterial({
        map: archTex,
        emissiveMap: archTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.45,
        roughness: 0.4,
      });
      const finishBannerMat = new THREE.MeshStandardMaterial({
        map: archTex,
        emissive: 0xfacc15,
        emissiveIntensity: 0.65,
        roughness: 0.35,
      });

      const gateZs = [-4];
      for (let lapIdx = 1; lapIdx <= activeTrack.laps; lapIdx++) {
        gateZs.push(-lapIdx * activeTrack.lapRenderM);
      }
      gateZs.forEach((gz, gIdx) => {
        const isFinal = gIdx === gateZs.length - 1;
        const gate = new THREE.Group();
        const leftP = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.6, 0.45), archPillarMat);
        leftP.position.set(-0.4, 2.8, 0);
        const rightP = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.6, 0.45), archPillarMat);
        rightP.position.set(10.1, 2.8, 0);
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(11.1, 1.35, 0.55),
          isFinal ? finishBannerMat : archBannerMat,
        );
        beam.position.set(4.85, 5.45, 0);
        gate.add(leftP, rightP, beam);
        gate.position.set(getRoadCenterX(gz), getRoadHeightAt(gz), gz);
        gate.rotation.y = getRoadYawAt(gz);
        scene.add(gate);
      });
    }

    // 11. Player Rig (7-Level Motorcycles with Perks, OR Single Self-Evolving 4-Level Alexandria Taxi!)
    const activeMotoTuning =
      !activeRaceBike && (mode === 'superhero' || mode === 'motorcycle') && progress.motoTuning
        ? {
            ...progress.motoTuning,
            chassis: activeMotoModel.isVespa ? ('vespa' as const) : ('sport' as const),
            engineSound: activeMotoModel.engineSound,
          }
        : undefined;

    const effectiveVehicleKind: PlayerVehicleKind = activeRaceBike
      ? activeRaceBike.vehicleKind
      : mode === 'police_patrol'
        ? 'police_car'
        : mode === 'mashrou3'
          ? 'mashrou3'
          : mode === 'superhero' || mode === 'motorcycle'
            ? activeMotoModel.vehicleKind
            : playerVehicleKind;

    const isCheckpointMode = mode === 'traffic_officer';
    const isTeamCheckpoint = isCheckpointMode && checkpointConfig?.teamMode === 'with_team';
    const soloBonusMult = isCheckpointMode && !isTeamCheckpoint ? 1.35 : 1.0;

    let playerRig: PlayerVehicleRig | null = isCheckpointMode
      ? null
      : buildPlayerVehicle3D(
          effectiveVehicleKind,
          activeTaxiLevel.level,
          mode === 'race',
          maxAniso,
          riderStyle,
          activeRaceBike
            ? {
                paintHex: activeRaceBike.paintHex,
                accentHex: activeRaceBike.accentHex,
                isVespa: activeRaceBike.isVespa,
              }
            : activeMotoTuning
              ? {
                  paintHex: activeMotoModel.paintHex,
                  accentHex: activeMotoModel.accentHex,
                  isVespa: activeMotoModel.isVespa,
                  tuning: activeMotoTuning,
                }
              : undefined,
        );
    const officerRig = isCheckpointMode ? buildPlayerCheckpointOfficerRig() : null;
    const officerPovRig = isCheckpointMode ? buildOfficerPovRig() : null;
    const policeChaseRig = isCheckpointMode
      ? buildPlayerVehicle3D('vespa', 3, false, maxAniso, 'alex_blue', {
          paintHex: 0xf8fafc,
          accentHex: 0x1e3a8a,
          isVespa: false,
          isPoliceMoto: true,
        })
      : null;

    let checkpointParkedCruiser: VehicleRig | null = null;
    let checkpointRedLight: THREE.PointLight | null = null;
    let checkpointBlueLight: THREE.PointLight | null = null;
    const checkpointTeammates: ReturnType<typeof modelFactory.buildTeammateOfficerRig>[] = [];

    if (playerRig) {
      playerRig.group.position.set(getRoadCenterX(0) + FORWARD_LANE_XS[1], 0, 0);
      scene.add(playerRig.group);
    } else if (isCheckpointMode && officerRig && officerPovRig && policeChaseRig) {
      scene.add(camera);
      camera.add(officerPovRig.group);
      officerPovRig.group.visible = cameraModeRef.current === 'hood';

      officerRig.group.position.set(getRoadCenterX(-260) + FORWARD_LANE_XS[1], 0.04, -260);
      officerRig.group.visible = cameraModeRef.current !== 'hood';
      scene.add(officerRig.group);

      // Parked Fast Police Sport Motorcycle beside the checkpoint ready for pursuits
      policeChaseRig.group.position.set(
        getRoadCenterX(-262) + 8.3,
        getRoadHeightAt(-262),
        -262,
      );
      policeChaseRig.group.rotation.y = getRoadYawAt(-262) + 0.16;
      policeChaseRig.setPovMode?.(false);
      scene.add(policeChaseRig.group);

      // Parked Egyptian Police Cruiser with animated flashing red & blue lights reflecting on asphalt
      checkpointParkedCruiser = modelFactory.buildTrafficVehicle('police', 0xffffff);
      checkpointParkedCruiser.group.position.set(
        getRoadCenterX(-266) + SIDEWALK_CURB_X - 0.8,
        getRoadHeightAt(-266),
        -266,
      );
      checkpointParkedCruiser.group.rotation.y = getRoadYawAt(-266) - 0.18;
      scene.add(checkpointParkedCruiser.group);

      checkpointRedLight = new THREE.PointLight(0xff3b3b, 10, 16, 1.8);
      checkpointRedLight.position.set(
        getRoadCenterX(-266) + SIDEWALK_CURB_X - 1.1,
        getRoadHeightAt(-266) + 2.0,
        -266,
      );
      checkpointBlueLight = new THREE.PointLight(0xffd27d, 8, 16, 1.8);
      checkpointBlueLight.position.set(
        getRoadCenterX(-266) + SIDEWALK_CURB_X - 0.5,
        getRoadHeightAt(-266) + 2.0,
        -266,
      );
      scene.add(checkpointRedLight, checkpointBlueLight);

      // Orange Reflective Traffic Barriers forming inspection funnel around z = -260
      const barrierLayout: [number, number, number][] = [
        [1.15, -252, 0.34],
        [1.45, -257, 0.1],
        [1.55, -262, 0.04],
        [8.35, -252, -0.34],
        [8.15, -257, -0.1],
      ];
      for (const [bx, bz, ry] of barrierLayout) {
        const bar = buildOrangeRoadBarrier3D();
        bar.position.set(getRoadCenterX(bz) + bx, getRoadHeightAt(bz), bz);
        bar.rotation.y = getRoadYawAt(bz) + ry;
        scene.add(bar);
      }

      // Safety Cones guiding vehicles toward checkpoint inspection
      for (const [cx, cz] of [
        [2.6, -242],
        [7.0, -242],
        [2.9, -247],
        [6.7, -247],
        [3.1, -253],
        [6.5, -253],
      ]) {
        const cone = modelFactory.buildTrafficVehicle('cone', 0xf97316);
        cone.group.position.set(getRoadCenterX(cz) + cx, getRoadHeightAt(cz), cz);
        scene.add(cone.group);
      }

      // Optional AI Police Teammates when WITH TEAM is selected
      if (isTeamCheckpoint) {
        const matePositions: [number, number, number][] = [
          [2.35, -256.5, Math.PI + 0.18],
          [7.25, -258.5, Math.PI - 0.22],
        ];
        for (const [mx, mz, myaw] of matePositions) {
          const mate = modelFactory.buildTeammateOfficerRig();
          mate.group.position.set(getRoadCenterX(mz) + mx, getRoadHeightAt(mz) + 0.03, mz);
          mate.group.rotation.y = getRoadYawAt(mz) + myaw;
          scene.add(mate.group);
          checkpointTeammates.push(mate);
        }
      }
    }

    // Live 3D Rearview Mirror Render Target (active on desktop GPU POV mode; disabled on mobile for 2x FPS)
    const mirrorW = quality === 'medium' ? 160 : 192;
    const mirrorH = quality === 'medium' ? 104 : 128;
    const mirrorRT = !lowSpecOrMobile ? new THREE.WebGLRenderTarget(mirrorW, mirrorH) : null;
    const mirrorCam = mirrorRT ? new THREE.PerspectiveCamera(56, mirrorW / mirrorH, 0.25, 210) : null;
    if (mirrorRT && playerRig) {
      playerRig.setMirrorTexture?.(cameraModeRef.current === 'hood' ? mirrorRT.texture : null);
    }

    // 3-State Toggleable Headlight Rig (Off / Low Beam / High Beam) for Motorcycle & Taxi
    let headlight: THREE.SpotLight | null = null;
    let headlightBeamMesh: THREE.Mesh | null = null;
    let headlightBeamMat: THREE.MeshBasicMaterial | null = null;
    let headlightFlareGroup: THREE.Group | null = null;
    const isDualHeadlightVehicle = !isMotoDrivingMode;

    const applyHeadlightMode = (hlMode: 'off' | 'low' | 'high') => {
      const isNightNow = atmosphere === 'night';
      const isSunsetNow = atmosphere === 'sunset';
      if (headlight) {
        if (hlMode === 'off') {
          headlight.intensity = 0;
        } else if (hlMode === 'low') {
          headlight.intensity = isNightNow ? 105 : isSunsetNow ? 42 : 18;
          headlight.angle = Math.PI * 0.28;
          headlight.distance = 105;
          headlight.target.position.set(0, 0.12, -28);
        } else {
          headlight.intensity = isNightNow ? 225 : isSunsetNow ? 92 : 38;
          headlight.angle = Math.PI * 0.36;
          headlight.distance = 160;
          headlight.target.position.set(0, 0.28, -56);
        }
      }
      if (headlightBeamMesh && headlightBeamMat) {
        headlightBeamMesh.visible = hlMode !== 'off';
        if (hlMode === 'low') {
          const w = isDualHeadlightVehicle ? 9.8 : 7.0;
          const len = 36;
          headlightBeamMesh.scale.set(w, 1, len);
          headlightBeamMesh.position.set(0, 0.09, -(isDualHeadlightVehicle ? 2.2 : 1.15) - len * 0.5);
          headlightBeamMat.opacity = isNightNow ? 0.76 : isSunsetNow ? 0.42 : 0.22;
        } else if (hlMode === 'high') {
          const w = isDualHeadlightVehicle ? 14.2 : 11.0;
          const len = 66;
          headlightBeamMesh.scale.set(w, 1, len);
          headlightBeamMesh.position.set(0, 0.09, -(isDualHeadlightVehicle ? 2.2 : 1.15) - len * 0.5);
          headlightBeamMat.opacity = isNightNow ? 0.96 : isSunsetNow ? 0.62 : 0.34;
        }
      }
      if (headlightFlareGroup) {
        headlightFlareGroup.visible = hlMode !== 'off';
        const s = hlMode === 'high' ? 1.35 : 0.85;
        headlightFlareGroup.scale.set(s, s, s);
      }
    };

    if (playerRig) {
      headlight = new THREE.SpotLight(0xfff6d6, 0, 148, Math.PI * 0.32, 0.52, 1.1);
      headlight.position.set(0, isDualHeadlightVehicle ? 0.92 : 1.05, isDualHeadlightVehicle ? -2.0 : -1.1);
      headlight.target.position.set(0, 0.2, -46);
      playerRig.group.add(headlight);
      playerRig.group.add(headlight.target);

      const beamTex = createHeadlightBeamTexture(isDualHeadlightVehicle);
      extraTexturesToDispose.push(beamTex);
      const beamGeo = new THREE.PlaneGeometry(1, 1);
      beamGeo.rotateX(-Math.PI / 2);
      headlightBeamMat = new THREE.MeshBasicMaterial({
        map: beamTex,
        color: 0xfff8dc,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      headlightBeamMesh = new THREE.Mesh(beamGeo, headlightBeamMat);
      headlightBeamMesh.renderOrder = 5;
      playerRig.group.add(headlightBeamMesh);

      headlightFlareGroup = new THREE.Group();
      const flareMat = new THREE.MeshBasicMaterial({
        color: 0xfffbeb,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const flareGeo = new THREE.SphereGeometry(0.18, 8, 8);
      if (isDualHeadlightVehicle) {
        for (const fx of [-0.64, 0.64]) {
          const fl = new THREE.Mesh(flareGeo, flareMat);
          fl.position.set(fx, 0.72, -2.18);
          headlightFlareGroup.add(fl);
        }
      } else {
        const fl = new THREE.Mesh(flareGeo, flareMat);
        fl.position.set(0, 0.94, -1.12);
        headlightFlareGroup.add(fl);
      }
      playerRig.group.add(headlightFlareGroup);

      applyHeadlightMode(headlightModeRef.current);
    }

    headlightToggleTriggerRef.current = () => {
      const cur = headlightModeRef.current;
      const next: 'off' | 'low' | 'high' = cur === 'off' ? 'high' : cur === 'high' ? 'low' : 'off';
      headlightModeRef.current = next;
      setHeadlightMode(next);
      applyHeadlightMode(next);
      soundFX.playBeep(next === 'high' ? 860 : next === 'low' ? 660 : 420, 0.06, 0.14);
      showToast(
        next === 'high'
          ? 'تم تشغيل النور العالي للكشافات 💡'
          : next === 'low'
            ? 'تم تشغيل النور الواطي 💡'
            : 'تم إطفاء نور الكشافات',
        1.6,
      );
    };

    // Dropoff Beacon (Taxi & Mashrou3 stops) in crisp pure white so the black asphalt stays black & white ONLY
    const dropoffGroup = new THREE.Group();
    const dropRing = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.75, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    dropRing.rotation.x = -Math.PI / 2;
    dropRing.position.y = 0.08;
    const dropPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.9, 1.9, 8, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    );
    dropPillar.position.y = 4;
    dropoffGroup.add(dropRing, dropPillar);
    dropoffGroup.visible = false;
    scene.add(dropoffGroup);

    // Mashrou3 Microbus Stops (7 stops along Bahary -> Mandara loading up to 14 riders!)
    const mashrou3Stops: Mashrou3Stop[] = [];
    if (mode === 'mashrou3') {
      const stopZs = [-140, -540, -1000, -1480, -1980, -2640, -3240];
      stopZs.forEach((sz, idx) => {
        const stopGroup = new THREE.Group();
        const r = new THREE.Mesh(
          new THREE.RingGeometry(2.2, 2.9, 28),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
        );
        r.rotation.x = -Math.PI / 2;
        r.position.y = 0.08;
        const p = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x16a34a }),
        );
        p.position.set(2.4, 1.6, 0);
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.55, 0.14),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.5 }),
        );
        sign.position.set(2.4, 3.1, 0);
        stopGroup.add(r, p, sign);
        // 2 waiting commuters at stop
        for (let w = 0; w < 2; w++) {
          const ped = modelFactory.buildPedestrianRig(crowdShirtPalette[(idx + w) % crowdShirtPalette.length], w);
          ped.group.position.set(1.8 + w * 0.75, 0.05, w * 0.8);
          ped.group.rotation.y = Math.PI / 2;
          stopGroup.add(ped.group);
        }
        stopGroup.position.set(getRoadCenterX(sz) + FORWARD_LANE_XS[2], getRoadHeightAt(sz), sz);
        stopGroup.rotation.y = getRoadYawAt(sz);
        scene.add(stopGroup);
        mashrou3Stops.push({
          z: sz,
          count: idx === 6 ? 2 : 2, // 7 * 2 = 14 passengers total!
          ring: stopGroup,
          loaded: false,
        });
      });
    }

    // Horn Ring (clean white pulse)
    const hornRing = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.6, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    hornRing.rotation.x = -Math.PI / 2;
    hornRing.position.y = 0.25;
    hornRing.visible = false;
    scene.add(hornRing);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Vehicle Stats, Easy-to-Hard Level Progression (7-Level Moto OR 7-Level Self-Evolving Alexandria Taxi!)
    const chaseSpeedBonus = isCheckpointMode ? 52 : 0;
    const isTaxiPlayerMode = !isMotoDrivingMode && effectiveVehicleKind === 'taxi';
    const motoLevelFactor = isMotoDrivingMode
      ? 0.24 + ((activeMotoModel.level - 1) / 6) * 0.76
      : isTaxiPlayerMode
        ? (activeTaxiLevel.level - 1) / 6
        : 0.25; // Moto starts challenging (0.24) -> extreme (1.0) at Lv7 H2R!
    const fuelSaverFactor = isMotoDrivingMode ? activeMotoModel.fuelSaver : 1;
    const fareMultiplier =
      (isMotoDrivingMode ? activeMotoModel.fareMultiplier : isTaxiPlayerMode ? activeTaxiLevel.fareMultiplier : 1) *
      (mode === 'taxi_classic' ? activeDistrict.fareMultiplier : 1);
    const nearMissMult = isMotoDrivingMode
      ? activeMotoModel.nearMissMultiplier
      : isTaxiPlayerMode
        ? 1 + (activeTaxiLevel.level - 1) * 0.2
        : 1;
    const patienceBonusSec = isMotoDrivingMode
      ? activeMotoModel.patienceBonus
      : isTaxiPlayerMode
        ? activeTaxiLevel.patienceBonus
        : 0;

    const maxSpeedKmh = isMotoDrivingMode
      ? activeMotoModel.topSpeedKmh + progress.upgrades.engine * 4 + chaseSpeedBonus
      : activeTaxiLevel.topSpeedKmh +
        progress.upgrades.engine * 4 +
        (effectiveVehicleKind === 'police_car' ? 24 : effectiveVehicleKind === 'mashrou3' ? 4 : 0) +
        chaseSpeedBonus;
    const maxFuel =
      100 +
      progress.upgrades.tank * 28 +
      (isMotoDrivingMode ? activeMotoModel.tankBonus : (activeTaxiLevel.level - 1) * 10);
    const maxHealth =
      100 +
      (isMotoDrivingMode ? activeMotoModel.armorBonus : activeTaxiLevel.armorBonus);
    const baseLateralSpeed =
      10.2 +
      (isMotoDrivingMode ? activeMotoModel.handlingBonus : activeTaxiLevel.handlingBonus) * 0.14 +
      progress.upgrades.brakes * 1.1 +
      (isCheckpointMode ? 3.2 : 0);
    const brakeRate =
      92 +
      progress.upgrades.brakes * 16 +
      (isMotoDrivingMode ? activeMotoModel.brakeBonus : (activeTaxiLevel.level - 1) * 6);

    let nextEntityId = 1;
    const sim = {
      laneOffset: FORWARD_LANE_XS[1],
      latVel: 0,
      z: isCheckpointMode ? -260 : 8,
      travelDir: -1 as -1 | 1,
      headingOffset: 0,
      tilt: 0,
      pitch: 0,
      noseDive: 0,
      noseDiveVel: 0,
      speedKmh: isCheckpointMode || isRaceMode ? 0 : 18,
      topSpeedKmh: isCheckpointMode || isRaceMode ? 0 : 18,
      gear: isCheckpointMode || isRaceMode ? 1 : 1,
      rpm: isRaceMode ? 2200 : 2800,
      rpmRatio: isRaceMode ? 0.18 : 0.22,
      steerSmooth: 0,
      wasMoving: !isCheckpointMode && !isRaceMode,
      fuel: maxFuel,
      outOfFuel: false,
      gasRefuelCooldown: 0,
      reverseBeepTimer: 0,
      turboCharge: 40,
      turboActive: false,
      comboStreak: 0,
      comboTimer: 0,
      rushHourTimer: 0,
      shakeTimer: 0,
      shakeIntensity: 0,
      inSideBypass: false,
      onRightBridge: false,
      inSidiGaberTurn: false,
      health: maxHealth,
      earnings: 0,
      points: 0,
      tripsCompleted: 0,
      passengersLoaded: 0,
      maxPassengers: mode === 'mashrou3' ? 14 : isMotoDeliveryMode ? 1 : 0,
      violationsStopped: 0,
      pursuitsCompleted: 0,
      nearMisses: 0,
      stuntCombo: 1,
      stuntTimer: 0,
      reachedStanley: false,
      reachedMandara: false,
      invulnerableTimer: 0,
      timeLeftSec: isCheckpointMode ? 140 : (null as number | null),
      raceCountdownTimer: isRaceMode ? 3.2 : 0,
      raceCountdownStage: isRaceMode ? 3 : 0,
      raceGoBannerTimer: 0,
      raceTimeSec: 0,
      lastRaceLap: 1,
      hornCooldown: 0,
      hornWaveTime: 0,
      uturnCooldown: 0,
      nearUTurnName: null as string | null,
      nearUTurnDistM: null as number | null,
      nearUTurnZ: null as number | null,
      uturn: null as {
        startLane: number;
        endLane: number;
        startHeading: number;
        endHeading: number;
        startZ: number;
        targetDir: -1 | 1;
        progress: number;
        zoneName: string;
      } | null,
      sirenTimer: 0,
      trafficTimer: isPracticeSubMode ? 1.4 : 0.4,
      pickupTimer: 3.5,
      passengerSpawnCooldown: 0.9,
      signalWarning: null as 'green' | 'yellow' | 'red' | null,
      passenger: null as ActivePassenger | null,
      waitingPassenger: null as {
        rig: WaitingPassengerRig;
        z: number;
        curbX: number;
        laneX: number;
        shirtHex: number;
        travelDir: -1 | 1;
        name: string;
        destinationId: string;
        destinationName: string;
        destinationZ: number;
        fare: number;
        needsUTurn: boolean;
        isVipRush: boolean;
        boarding: boolean;
        boardProgress: number;
        hailSoundPlayed: boolean;
        doorOpenSoundPlayed: boolean;
        doorCloseSoundPlayed: boolean;
      } | null,
      taxiExitDoorTimer: 0,
      taxiExitDoorSide: 'right' as 'right' | 'left',
      dropoffZ: null as number | null,
      dropoffLaneX: FORWARD_LANE_XS[2],
      traffic: [] as TrafficEntity[],
      pickups: [] as PickupEntity[],
      checkpointCars: [] as CheckpointCar[],
      checkpointProcessed: 0,
      checkpointSubPhase: 'duty' as 'duty' | 'chase',
      stopPaddleTimer: 0,
      officerZ: -260,
      trunkPeekTimer: 0,
      chaseTarget: null as {
        rig: VehicleRig;
        z: number;
        laneOffset: number;
        targetLaneOffset: number;
        speedKmh: number;
        plate: string;
        kindLabel: string;
        marker: THREE.Mesh;
        weaveTimer: number;
      } | null,
      lastZoneTitle: activeTrack ? activeTrack.name : activeStreetZones[0].title,
      streetBannerTimer: isRaceMode ? 2.4 : 3.2,
      toastMessage:
        isCheckpointMode
          ? isTeamCheckpoint
            ? 'أنت وزمايلك على الكمين! اضغط إشارة قف للمركبات القادمة وافحص الرخص'
            : 'كمين فردي (+٣٥٪ نقاط): أشر للمركبات بالتوقف، وإذا هرب أحدهم طارده بالموتوسيكل!'
          : isPracticeSubMode && activeTrack
            ? `تمرين حر على ${activeTrack.name} — سجّل أسرع وقت!`
            : isRaceMode && activeTrack
              ? `${activeTrack.name} (${activeTrack.laps} لفات · ${activeTrack.distanceKm} كم) — استعد للانطلاق!`
              : mode === 'mashrou3'
                ? 'ميكروباص مشروع: حمّل ١٤ راكب من المواقف من المندرة والمنتزه لحد بحري!'
                : mode === 'police_patrol'
                  ? 'دورية الشرطة: شغّل السارينة ووقف العربيات المخالفة بطلب الرخص!'
                  : effectiveVehicleKind === 'black_supermoto' || effectiveVehicleKind === 'vespa'
                    ? `${activeMotoModel.name} (مستوى ${activeMotoModel.level}/7): هدّي جنب الزباين عشان يركبوا وراك، واستخدم ملفات الدوران للرجوع!`
                    : 'يا مسهل! انطلق من بوابة المندرة والمنتزه حتى قلعة قايتباي ببحري.' as string | null,
      toastTimer: 4.5,
      ended: false,
      hudAccum: 0,
    };

    const showToast = (msg: string, dur = 3.5) => {
      sim.toastMessage = msg;
      sim.toastTimer = dur;
    };

    // Initial race rivals on Starting Grid (skipped in solo Practice subMode)
    if (isRaceMode && !isPracticeSubMode) {
      const rivalLanes = [
        FORWARD_LANE_XS[0],
        FORWARD_LANE_XS[2],
        FORWARD_LANE_XS[0] + 1.15,
        FORWARD_LANE_XS[2] - 1.15,
      ];
      const rivalZs = [-4.5, -6.5, -9.2, -11.8];
      const rivalColors = [0xef4444, 0x3b82f6, 0x10b981, 0xa855f7];
      const diffSpeeds =
        raceDifficulty === 'easy'
          ? [116, 124, 132, 138]
          : raceDifficulty === 'pro'
            ? [176, 186, 198, 210]
            : [146, 156, 166, 176];

      rivalLanes.forEach((rl, idx) => {
        const rig = modelFactory.buildTrafficVehicle('motorcycle', rivalColors[idx]);
        const rz = rivalZs[idx];
        rig.group.position.set(getRoadCenterX(rz) + rl, getRoadHeightAt(rz), rz);
        rig.group.rotation.y = getRoadYawAt(rz);
        scene.add(rig.group);
        sim.traffic.push({
          id: nextEntityId++,
          rig,
          laneOffset: rl,
          targetLaneOffset: rl,
          z: rz,
          halfW: 0.44,
          halfL: 1.0,
          speedKmh: 0,
          baseSpeedKmh: diffSpeeds[idx],
          kind: 'motorcycle',
          direction: -1,
          nudgedTimer: 0,
          soundPlayed: true,
          nearMissed: false,
          isRacer: true,
        });
      });
    }

    // Spawn incoming cars & motorcycles in وضع اللجنة
    const spawnCheckpointCar = () => {
      const kinds: ('sedan' | 'microbus' | 'taxi' | 'suv' | 'motorcycle')[] = [
        'sedan',
        'microbus',
        'taxi',
        'suv',
        'motorcycle',
      ];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const kindLabels: Record<string, string> = {
        sedan: 'سيارة ملاكي',
        microbus: 'ميكروباص مشروع',
        taxi: 'تاكسي إسكندرية',
        suv: 'دفع رباعي',
        motorcycle: 'موتوسيكل',
      };
      const colors = [0x2563eb, 0xdc2626, 0xe2e8f0, 0x059669, 0x475569];
      const rig = modelFactory.buildTrafficVehicle(
        kind,
        kind === 'taxi' ? 0xfacc15 : colors[Math.floor(Math.random() * colors.length)],
      );

      const letters = ['س ك م', 'أ ب ج', 'س ر ط', 'ل م ن', 'د هـ و'];
      const plate = `${letters[Math.floor(Math.random() * letters.length)]} ${1200 + Math.floor(Math.random() * 8500)}`;
      const preSpeed = 46 + Math.floor(Math.random() * 44);
      const inspection = generateCheckpointInspection(kind, plate, preSpeed);
      const isViolator = inspection.faultType !== 'none';
      const speedKmh = isViolator ? 74 + Math.floor(Math.random() * 38) : 44 + Math.floor(Math.random() * 22);
      inspection.speedKmh = speedKmh;

      // Exact 15% chance for a violating driver to flee from checkpoint
      const willFlee = isViolator && Math.random() < 0.15;
      const fleeAtWindow = willFlee && Math.random() < 0.55;

      const driverRig = modelFactory.attachCheckpointDriver3D(
        rig.group,
        kind,
        inspection.realDriver,
        inspection.hasContraband,
      );

      const lane = FORWARD_LANE_XS[1];
      const cz = -172;
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({ color: isViolator ? 0xef4444 : 0x22c55e }),
      );
      marker.position.y = kind === 'motorcycle' ? 1.85 : 2.45;
      marker.visible = isTeamCheckpoint || !isViolator;
      rig.group.add(marker);
      rig.group.position.set(getRoadCenterX(cz) + lane, getRoadHeightAt(cz), cz);
      rig.group.rotation.y = getRoadYawAt(cz);
      scene.add(rig.group);

      sim.checkpointCars.push({
        rig,
        driverRig,
        z: cz,
        laneOffset: lane,
        plate,
        kindLabel: kindLabels[kind] ?? 'مركبة',
        speedKmh,
        isViolator,
        reason: inspection.faultSummary,
        willFlee,
        fleeAtWindow,
        announced: false,
        inspection,
        inspectionStage: 'at_window',
        trunkChecked: false,
        state: 'approaching',
        marker,
      });
    };

    const spawnChaseTrafficSeed = () => {
      const seeds: { kind: TrafficKind; z: number; lane: number; dir: -1 | 1; spd: number; col: number }[] = [
        { kind: 'sedan', z: -295, lane: FORWARD_LANE_XS[0], dir: -1, spd: 56, col: 0x3b82f6 },
        { kind: 'microbus', z: -328, lane: FORWARD_LANE_XS[2], dir: -1, spd: 46, col: 0xf8fafc },
        { kind: 'taxi', z: -362, lane: FORWARD_LANE_XS[1], dir: -1, spd: 54, col: 0xfacc15 },
      ];
      for (const sd of seeds) {
        const rig = modelFactory.buildTrafficVehicle(sd.kind, sd.col);
        rig.group.position.set(getRoadCenterX(sd.z) + sd.lane, getRoadHeightAt(sd.z), sd.z);
        rig.group.rotation.y = getRoadYawAt(sd.z);
        scene.add(rig.group);
        sim.traffic.push({
          id: nextEntityId++,
          rig,
          laneOffset: sd.lane,
          targetLaneOffset: sd.lane,
          z: sd.z,
          halfW: sd.kind === 'microbus' ? 1.02 : 0.92,
          halfL: sd.kind === 'microbus' ? 2.45 : 2.05,
          speedKmh: sd.spd,
          baseSpeedKmh: sd.spd,
          kind: sd.kind,
          direction: sd.dir,
          nudgedTimer: 0,
          soundPlayed: false,
          nearMissed: false,
        });
      }
    };

    const returnToCheckpointDuty = () => {
      for (const tc of sim.traffic) {
        scene.remove(tc.rig.group);
      }
      sim.traffic = [];
      if (sim.chaseTarget) {
        scene.remove(sim.chaseTarget.rig.group);
        sim.chaseTarget = null;
      }
      sim.checkpointSubPhase = 'duty';
      setCheckpointSubPhaseUi('duty');
      setFleeingInfoUi(null);
      sirenActiveRef.current = false;
      setSirenUi(false);

      sim.z = -260;
      sim.officerZ = -260;
      sim.trunkPeekTimer = 0;
      sim.laneOffset = FORWARD_LANE_XS[1];
      sim.speedKmh = 0;
      sim.tilt = 0;
      sim.pitch = 0;
      sim.noseDive = 0;
      sim.steerSmooth = 0;

      if (policeChaseRig) {
        policeChaseRig.setPovMode?.(false);
        policeChaseRig.group.position.set(getRoadCenterX(-262) + 8.3, getRoadHeightAt(-262), -262);
        policeChaseRig.group.rotation.set(0, getRoadYawAt(-262) + 0.16, 0);
      }

      for (const cc of sim.checkpointCars) {
        scene.remove(cc.rig.group);
      }
      sim.checkpointCars = [];
      highlightedFieldRef.current = null;
      setCheckpointUi(null);

      if (sim.checkpointProcessed >= 12) {
        finishRun(
          `أتممت وردية اللجنة! ضبطت ${sim.violationsStopped} مخالفة و${sim.pursuitsCompleted} مطاردة ناجحة.`,
        );
      } else {
        spawnCheckpointCar();
      }
    };

    const enterMotorcycleChase = (fleeCar: CheckpointCar) => {
      if (!policeChaseRig || sim.checkpointSubPhase === 'chase') return;
      const idx = sim.checkpointCars.indexOf(fleeCar);
      if (idx >= 0) sim.checkpointCars.splice(idx, 1);

      fleeCar.marker.visible = true;
      (fleeCar.marker.material as THREE.MeshBasicMaterial).color.setHex(0xef4444);

      sim.checkpointSubPhase = 'chase';
      setCheckpointSubPhaseUi('chase');
      setCheckpointUi(null);

      sim.chaseTarget = {
        rig: fleeCar.rig,
        z: Math.min(-280, fleeCar.z - 12),
        laneOffset: FORWARD_LANE_XS[1],
        targetLaneOffset: FORWARD_LANE_XS[1],
        speedKmh: 122 + Math.random() * 22,
        plate: fleeCar.plate,
        kindLabel: fleeCar.kindLabel,
        marker: fleeCar.marker,
        weaveTimer: 1.4,
      };
      setFleeingInfoUi({
        plate: fleeCar.plate,
        distM: Math.round(Math.abs(-262 - sim.chaseTarget.z)),
        canIntercept: false,
      });

      sim.z = -262;
      sim.laneOffset = FORWARD_LANE_XS[2];
      sim.speedKmh = 54;
      sim.fuel = maxFuel;
      sim.trafficTimer = 0.25;
      sirenActiveRef.current = true;
      setSirenUi(true);
      soundFX.playWhistle();
      soundFX.playPoliceSiren();
      spawnChaseTrafficSeed();
      showToast(`هروب! ${fleeCar.plate} كسر اللجنة — طارده بالموتوسيكل الشرطي واقبض عليه!`, 3.6);
    };

    if (isCheckpointMode) {
      spawnCheckpointCar();
    } else if (!isRaceMode) {
      // Immediate showcase of Alexandria Microbus, Yellow/Black Taxi, and Sport Motorcycle on the Corniche
      const showcaseSeeds: {
        kind: TrafficKind;
        z: number;
        laneOffset: number;
        direction: -1 | 1;
        speedKmh: number;
        colorHex: number;
      }[] = [
        { kind: 'microbus', z: -26, laneOffset: FORWARD_LANE_XS[2], direction: -1, speedKmh: 44, colorHex: 0xf8fafc },
        { kind: 'taxi', z: -48, laneOffset: FORWARD_LANE_XS[0], direction: -1, speedKmh: 52, colorHex: 0xfacc15 },
        { kind: 'motorcycle', z: -72, laneOffset: FORWARD_LANE_XS[1], direction: -1, speedKmh: 68, colorHex: 0xef4444 },
        { kind: 'microbus', z: -102, laneOffset: ONCOMING_LANE_XS[1], direction: 1, speedKmh: 46, colorHex: 0xf8fafc },
      ];
      for (const sd of showcaseSeeds) {
        const rig = modelFactory.buildTrafficVehicle(sd.kind, sd.colorHex);
        const rx = getRoadCenterX(sd.z);
        const ry = getRoadHeightAt(sd.z);
        const ryaw = getRoadYawAt(sd.z);
        rig.group.position.set(rx + sd.laneOffset, ry, sd.z);
        rig.group.rotation.order = 'YXZ';
        rig.group.rotation.y = ryaw + (sd.direction === 1 ? Math.PI : 0);
        rig.group.rotation.x = sd.direction * -getRoadPitchAt(sd.z);
        scene.add(rig.group);
        sim.traffic.push({
          id: nextEntityId++,
          rig,
          laneOffset: sd.laneOffset,
          targetLaneOffset: sd.laneOffset,
          z: sd.z,
          halfW: sd.kind === 'microbus' ? 1.02 : sd.kind === 'motorcycle' ? 0.42 : 0.92,
          halfL: sd.kind === 'microbus' ? 2.45 : sd.kind === 'motorcycle' ? 0.95 : 2.05,
          speedKmh: sd.speedKmh,
          baseSpeedKmh: sd.speedKmh,
          kind: sd.kind,
          direction: sd.direction,
          nudgedTimer: 0,
          soundPlayed: false,
          nearMissed: false,
        });
      }
    }

    const addPoints = (basePts: number) => {
      const totalAdd = Math.round(basePts * sim.stuntCombo * timeMultiplier);
      sim.points += totalAdd;
      return totalAdd;
    };

    const finishRun = (
      reason: string,
      fellDuringStunt = false,
      extra?: Pick<RunSummary, 'raceTimeSec' | 'racePosition' | 'raceTrackId' | 'raceSubMode'>,
    ) => {
      if (sim.ended) return;
      sim.ended = true;
      setCountdownUi(null);
      soundFX.stopSeaAmbience();
      if (fellDuringStunt) {
        soundFX.playCrash();
        soundFX.playGameOver();
      } else if (sim.reachedMandara || mode === 'traffic_officer') {
        soundFX.playDropoff();
      } else {
        soundFX.playGameOver();
      }
      const rawDistM = isCheckpointMode ? sim.checkpointProcessed * 120 : Math.max(0, Math.round(-sim.z));
      const reportDistM =
        isRaceMode && activeTrack
          ? Math.round(Math.min(1, rawDistM / raceFinishM) * activeTrack.distanceKm * 1000)
          : rawDistM;
      onGameOverRef.current({
        points: sim.points,
        earnings: sim.earnings,
        tripsCompleted: sim.tripsCompleted,
        distanceM: reportDistM,
        topSpeedKmh: Math.round(sim.topSpeedKmh),
        nearMisses: sim.nearMisses,
        passengersLoaded: sim.passengersLoaded,
        violationsStopped: sim.violationsStopped,
        pursuitsCompleted: sim.pursuitsCompleted,
        fellDuringStunt,
        reachedMandara: sim.reachedMandara,
        reason,
        timeMultiplier,
        ...extra,
      });
    };

    // Wire Police Pull-Over & Checkpoint triggers
    stopViolatorTriggerRef.current = () => {
      if (sim.ended || mode !== 'police_patrol') return;
      const target = sim.traffic.find(
        (c) =>
          c.isViolator &&
          !c.pulledOver &&
          Math.abs(c.z - sim.z) < 30 &&
          Math.abs(c.laneOffset - sim.laneOffset) < 4.5,
      );
      if (!target) {
        showToast('قرّب من عربية مخالفة (علامة حمراء) واضغط إيقاف وطلب الرخص!', 2.0);
        return;
      }
      target.pulledOver = true;
      target.baseSpeedKmh = 0;
      target.speedKmh = 0;
      target.targetLaneOffset = FORWARD_LANE_XS[2];
      target.nudgedTimer = 2.0;
      if (target.violatorMarker) target.violatorMarker.visible = false;
      sim.violationsStopped += 1;
      const pts = addPoints(120);
      sim.earnings += 85;
      soundFX.playWhistle();
      soundFX.playPoliceSiren();
      showToast(`تم إيقاف المخالف وفحص الرخص! (+${pts} نقطة · +٨٥ ج.م)`, 3.2);
    };

    checkpointDecisionRef.current = (action) => {
      if (sim.ended || !isCheckpointMode) return;
      if (action === 'finish') {
        finishRun(
          `أنهيت خدمة اللجنة: ${sim.violationsStopped} مخالفة مضبوطة و${sim.pursuitsCompleted} مطاردة!`,
        );
        return;
      }

      if (action === 'chase_intercept' && sim.checkpointSubPhase === 'chase' && sim.chaseTarget) {
        const dist = Math.abs(sim.z - sim.chaseTarget.z);
        if (dist <= 18) {
          sim.violationsStopped += 1;
          sim.pursuitsCompleted += 1;
          const pts = addPoints(Math.round(250 * soloBonusMult));
          sim.earnings += 180;
          soundFX.playWhistle();
          soundFX.playPickup();
          showToast(
            `تم القبض على الهارب (${sim.chaseTarget.plate})! (+${pts} نقطة · +١٨٠ ج.م)`,
            3.2,
          );
          returnToCheckpointDuty();
        } else {
          showToast('قرّب أكتر من العربية الهاربة عشان توقفها!', 1.5);
        }
        return;
      }

      const activeCar = sim.checkpointCars.find(
        (c) => c.state === 'approaching' || c.state === 'signaled_stop' || c.state === 'waiting',
      );
      if (!activeCar) return;

      if (action === 'signal_stop') {
        if (activeCar.state === 'waiting') return;
        sim.stopPaddleTimer = 1.6;
        if (officerPovRig) {
          officerPovRig.paddleMat.color.setHex(0xef4444);
          officerPovRig.paddleMat.emissive.setHex(0xef4444);
        }
        soundFX.playWhistle();
        if (activeCar.willFlee && !activeCar.fleeAtWindow) {
          activeCar.state = 'fleeing';
          soundFX.playHorn();
          setCheckpointUi({
            plate: activeCar.plate,
            kindLabel: activeCar.kindLabel,
            speedKmh: activeCar.speedKmh,
            isViolator: activeCar.isViolator,
            reason: activeCar.reason,
            status: 'fleeing',
            inspection: activeCar.inspection,
            highlightedField: null,
            trunkChecked: activeCar.trunkChecked,
          });
          showToast(`انتبه! ${activeCar.plate} رفض التوقف وهارب من اللجنة!`, 2.2);
        } else {
          activeCar.state = 'signaled_stop';
          setCheckpointUi({
            plate: activeCar.plate,
            kindLabel: activeCar.kindLabel,
            speedKmh: activeCar.speedKmh,
            isViolator: activeCar.isViolator,
            reason: activeCar.reason,
            status: 'signaled_stop',
            teamHint: isTeamCheckpoint
              ? activeCar.isViolator
                ? 'رصد الزملاء: اشتباه مخالفة! افحص الرخصة بدقة'
                : 'رصد الزملاء: يبدو سليم'
              : undefined,
            inspection: activeCar.inspection,
            highlightedField: null,
            trunkChecked: activeCar.trunkChecked,
          });
        }
        return;
      }

      if (action === 'ask_license') {
        if (activeCar.state !== 'waiting') return;
        if (activeCar.willFlee) {
          activeCar.state = 'fleeing';
          soundFX.playWhistle();
          soundFX.playHorn();
          setCheckpointUi((prev) => (prev ? { ...prev, status: 'fleeing' } : prev));
          showToast(`هروب مفاجئ! ${activeCar.plate} رفض تسليم الرخصة وانطلق!`, 2.2);
          return;
        }
        activeCar.inspectionStage = 'inspecting';
        activeCar.driverRig.setHandExtended(true);
        highlightedFieldRef.current = null;
        soundFX.playPickup();
        setCheckpointUi((prev) =>
          prev
            ? {
                ...prev,
                status: 'inspecting',
                highlightedField: null,
              }
            : prev,
        );
        return;
      }

      if (action === 'inspect_trunk') {
        if (activeCar.state !== 'waiting') return;
        activeCar.trunkChecked = true;
        activeCar.driverRig.setTrunkOpen(true);
        sim.trunkPeekTimer = 2.6;
        soundFX.playPickup();
        setCheckpointUi((prev) => (prev ? { ...prev, trunkChecked: true } : prev));
        if (activeCar.inspection.hasContraband) {
          showToast('تنبيه! وجدت ممنوعات بالشنطة الخلفية — حددها بالأحمر واختر (قبض)!', 3.4);
        } else {
          showToast('تم فتح وتفتيش الشنطة: نظيفة تماماً', 2.2);
        }
        return;
      }

      if (action === 'pass') {
        if (officerPovRig) {
          officerPovRig.paddleMat.color.setHex(0x22c55e);
          officerPovRig.paddleMat.emissive.setHex(0x16a34a);
        }
        sim.checkpointProcessed += 1;
        activeCar.state = 'cleared';
        if (!activeCar.isViolator) {
          const pts = addPoints(Math.round(75 * soloBonusMult));
          sim.earnings += 45;
          soundFX.playPickup();
          showToast(`مرور سليم للمركبة ${activeCar.plate} (+${pts} نقطة)`, 2.2);
        } else {
          soundFX.playWhistle();
          showToast(`فاتك مخالف! ${activeCar.plate}: ${activeCar.reason}`, 2.8);
        }
        highlightedFieldRef.current = null;
        setCheckpointUi(null);
        if (sim.checkpointProcessed >= 12) {
          finishRun(
            `أتممت وردية اللجنة! (${sim.violationsStopped} مخالفة مضبوطة · ${sim.pursuitsCompleted} مطاردة)`,
          );
        } else {
          spawnCheckpointCar();
        }
      }
    };

    checkpointVerdictRef.current = (verdict) => {
      if (sim.ended || !isCheckpointMode) return;
      const activeCar = sim.checkpointCars.find((c) => c.state === 'waiting');
      if (!activeCar) return;

      const expected = activeCar.inspection.expectedVerdict;
      const expectedField = activeCar.inspection.expectedField;
      const pickedField = highlightedFieldRef.current;

      sim.checkpointProcessed += 1;
      sim.trunkPeekTimer = 0;
      activeCar.driverRig.setHandExtended(false);

      if (verdict === expected) {
        if (expected === 'pass') {
          if (officerPovRig) {
            officerPovRig.paddleMat.color.setHex(0x22c55e);
            officerPovRig.paddleMat.emissive.setHex(0x16a34a);
          }
          activeCar.state = 'cleared';
          const pts = addPoints(Math.round(95 * soloBonusMult));
          sim.earnings += 60;
          soundFX.playPickup();
          showToast(`مرور سليم (${activeCar.plate})! الرخصة والشنطة سليمة (+${pts} نقطة)`, 2.8);
        } else {
          activeCar.state = 'pulled_over';
          sim.violationsStopped += 1;
          soundFX.playWhistle();
          if (pickedField === expectedField) {
            const pts = addPoints(Math.round(195 * soloBonusMult));
            sim.earnings += 140;
            soundFX.playPickup();
            showToast(
              `ضبط دقيق ١٠٠٪! حددت الدليل واتخذت القرار الصحيح (+${pts} نقطة · +١٤٠ ج.م)`,
              3.4,
            );
          } else {
            const pts = addPoints(Math.round(115 * soloBonusMult));
            sim.earnings += 80;
            showToast(
              `قرار صحيح! المخالفة: ${activeCar.inspection.faultSummary} (+${pts} نقطة)`,
              3.2,
            );
          }
        }
      } else {
        activeCar.state = expected === 'pass' ? 'cleared' : 'pulled_over';
        soundFX.playHorn();
        if (expected === 'pass') {
          showToast(`خطأ! السائق ${activeCar.inspection.driverName} أوراقه سليمة ١٠٠٪`, 3.0);
        } else {
          showToast(
            `قرار غير مطابق! السبب الحقيقي: ${activeCar.inspection.faultSummary}`,
            3.2,
          );
        }
      }

      highlightedFieldRef.current = null;
      setCheckpointUi(null);
      if (sim.checkpointProcessed >= 12) {
        finishRun(
          `أتممت وردية اللجنة! (${sim.violationsStopped} مخالفة مضبوطة · ${sim.pursuitsCompleted} مطاردة)`,
        );
      } else {
        spawnCheckpointCar();
      }
    };

    hornTriggerRef.current = () => {
      if (sim.hornCooldown > 0 || sim.ended) return;
      soundFX.startSeaAmbience();
      sim.hornCooldown = 0.45;
      sim.hornWaveTime = 0.42;
      soundFX.playHorn(isMotoMode, isMotoMode ? activeMotoTuning?.hornSound : undefined);

      for (const car of sim.traffic) {
        if (car.kind === 'cone' || car.kind === 'hantour' || car.direction === 1 || car.isRacer) continue;
        const dz = sim.z - car.z;
        if (dz > 2 && dz < 44 && Math.abs(car.laneOffset - sim.laneOffset) < 2.6) {
          car.nudgedTimer = 1.25;
          const curLane = FORWARD_LANE_XS.reduce(
            (best, lx, idx) =>
              Math.abs(lx - car.laneOffset) < Math.abs(FORWARD_LANE_XS[best] - car.laneOffset) ? idx : best,
            0,
          );
          const dir = car.laneOffset <= sim.laneOffset ? -1 : 1;
          const nextLane = Math.max(0, Math.min(FORWARD_LANE_XS.length - 1, curLane + dir));
          car.targetLaneOffset = FORWARD_LANE_XS[nextLane];
        }
      }
    };

    // Smooth 180-Degree U-Turn Initiation ("لف وارجع من ملف الدوران")
    const initiateUTurn = (zoneName: string) => {
      if (sim.uturn || sim.uturnCooldown > 0 || isRaceMode || isCheckpointMode || isUrbanCircuitTrack) return;
      const nextDir: -1 | 1 = sim.travelDir === -1 ? 1 : -1;
      sim.uturn = {
        startLane: sim.laneOffset,
        endLane: nextDir === -1 ? FORWARD_LANE_XS[1] : ONCOMING_LANE_XS[1],
        startHeading: sim.headingOffset,
        endHeading: nextDir === -1 ? 0 : Math.PI,
        startZ: sim.z,
        targetDir: nextDir,
        progress: 0,
        zoneName,
      };
      sim.speedKmh = Math.min(sim.speedKmh, 52);
      soundFX.playHorn(isMotoMode, activeMotoTuning?.hornSound);
      showToast(`بتلف من ${zoneName}... ↩`, 2.2);
    };

    uturnTriggerRef.current = () => {
      if (sim.uturn || isRaceMode || isCheckpointMode || isUrbanCircuitTrack) return;
      if (sim.nearUTurnName && sim.nearUTurnDistM !== null && sim.nearUTurnDistM <= 72) {
        initiateUTurn(sim.nearUTurnName);
      } else {
        showToast('قرّب من أقرب ملف دوران (U-Turn) على الجزيرة الوسطى للرجوع!', 2.2);
      }
    };

    const spawnWaitingPassenger = () => {
      if (!isMotoDeliveryMode || isRaceMode || isCheckpointMode) return;
      const dir = sim.travelDir;

      let spawnZ = sim.z + dir * (92 + Math.random() * 48);
      spawnZ = THREE.MathUtils.clamp(spawnZ, -3410, -50);
      if (Math.abs(spawnZ - STANLEY_BRIDGE_Z) < 98) {
        spawnZ = STANLEY_BRIDGE_Z + (dir === -1 ? -115 : 115);
      }
      for (const sz of signalZones) {
        if (Math.abs(spawnZ - sz) < 18) spawnZ += dir * 24;
      }
      const pickupDistM = Math.max(0, -spawnZ);

      const upcoming =
        dir === -1
          ? activeLandmarks.filter((lm) => lm.distanceM > pickupDistM + 230)
          : activeLandmarks.filter((lm) => lm.distanceM < pickupDistM - 230);
      const opposite =
        dir === -1
          ? activeLandmarks.filter((lm) => lm.distanceM < pickupDistM - 220)
          : activeLandmarks.filter((lm) => lm.distanceM > pickupDistM + 220);

      // True bi-directional "رايح جاي" riders: ~45% ask for a destination in the OPPOSITE direction
      const wantsOppositeDir =
        opposite.length > 0 && (upcoming.length === 0 || Math.random() < 0.45);

      let dest = activeLandmarks[1] ?? activeLandmarks[0];
      if (wantsOppositeDir) {
        if (dir === -1) {
          const eastFavorites = opposite.filter(
            (lm) => lm.id === 'asafra' || lm.id === 'sidi_bishr' || lm.id === 'mandara',
          );
          const pool = eastFavorites.length > 0 && Math.random() < 0.72 ? eastFavorites : opposite;
          dest = pool[Math.floor(Math.random() * pool.length)];
        } else {
          const pool = opposite.slice(0, Math.min(4, opposite.length));
          dest = pool[Math.floor(Math.random() * pool.length)];
        }
      } else if (upcoming.length > 0) {
        const maxPool = Math.min(upcoming.length, motoLevelFactor >= 0.5 ? 5 : 3);
        dest = upcoming[Math.floor(Math.random() * maxPool)];
      } else {
        dest = dir === -1 ? activeLandmarks[activeLandmarks.length - 1] : activeLandmarks[0];
      }

      const shirtColors = [0x38bdf8, 0xf472b6, 0x34d399, 0xfbbf24, 0xa78bfa, 0xf97316];
      const shirtHex = shirtColors[Math.floor(Math.random() * shirtColors.length)];
      const rig = modelFactory.buildPassengerBeacon(shirtHex, Math.floor(Math.random() * 8));
      const curbX = dir === -1 ? SIDEWALK_CURB_X + 0.45 : -SIDEWALK_CURB_X - 0.45;
      const laneX = dir === -1 ? FORWARD_LANE_XS[2] : ONCOMING_LANE_XS[0];
      const roadX = getRoadCenterX(spawnZ);
      rig.group.position.set(roadX + curbX, 0, spawnZ);
      rig.group.rotation.y = getRoadYawAt(spawnZ) + (dir === 1 ? Math.PI : 0);
      scene.add(rig.group);

      const name = PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)];
      const destZ = -dest.distanceM;
      const needsUTurn = (destZ - spawnZ) * dir < 0;
      const tripDist = Math.max(260, Math.round(Math.abs(destZ - spawnZ)));
      const isVipRush = sim.tripsCompleted > 0 && Math.random() < (0.30 + motoLevelFactor * 0.26);
      // Balanced lower Egyptian fares (~18-55 EGP at Level 1), growing with Taxi/District upgrades + VIP Rush bonus
      const rawFare = Math.max(
        14,
        Math.round(dest.fareBonus * 0.42 + tripDist * 0.02 + (needsUTurn ? 10 : 0) + (isVipRush ? 10 : 0)),
      );
      sim.waitingPassenger = {
        rig,
        z: spawnZ,
        curbX,
        laneX,
        shirtHex,
        travelDir: dir,
        name,
        destinationId: dest.id,
        destinationName: dest.name,
        destinationZ: destZ,
        fare: Math.round(rawFare * fareMultiplier),
        needsUTurn,
        isVipRush,
        boarding: false,
        boardProgress: 0,
        hailSoundPlayed: false,
        doorOpenSoundPlayed: false,
        doorCloseSoundPlayed: false,
      };
    };

    const spawnTraffic = () => {
      if (isCheckpointMode && sim.checkpointSubPhase !== 'chase') return;
      const maxTrafficCount = isPracticeSubMode ? 5 : isMobileDevice ? 14 : 26;
      if (sim.traffic.length >= maxTrafficCount) return;
      const playerDir = sim.travelDir;
      const isOncoming = Math.random() < 0.36;
      const sameSidePool = playerDir === -1 ? FORWARD_LANE_XS : ONCOMING_LANE_XS;
      const oppSidePool = playerDir === -1 ? ONCOMING_LANE_XS : FORWARD_LANE_XS;
      const lanePool = isOncoming ? oppSidePool : sameSidePool;
      const roll = Math.random();

      const spawnZ = sim.z + playerDir * (isOncoming ? 205 : 165);
      if (spawnZ > 110 || spawnZ < Z_END + 60) return;

      const allowHantour =
        !isUrbanCircuitTrack &&
        (activeDistrict.id === 'corniche' || (isGrandCity && spawnZ > -1150));

      let kind: TrafficKind = 'sedan';
      if (!isOncoming && roll < 0.05) kind = 'cone';
      else if (allowHantour && roll < 0.16) kind = 'hantour';
      else if (roll < 0.29) kind = 'motorcycle';
      else if (roll < 0.35 && mode !== 'police_patrol') kind = 'police';
      else if (roll < 0.54) kind = 'taxi';
      else if (roll < 0.78) kind = 'microbus';
      else if (roll > 0.9) kind = 'suv';

      const laneOffset =
        kind === 'hantour'
          ? isOncoming
            ? oppSidePool[0]
            : sameSidePool[sameSidePool.length - 1]
          : lanePool[Math.floor(Math.random() * lanePool.length)];
      if (sim.traffic.some((c) => Math.abs(c.laneOffset - laneOffset) < 2.2 && Math.abs(c.z - spawnZ) < 22)) return;

      const direction: -1 | 1 = isOncoming ? ((playerDir === -1 ? 1 : -1) as -1 | 1) : playerDir;
      const colors = [0x2563eb, 0xdc2626, 0x059669, 0x64748b, 0xe2e8f0, 0x334155];
      const colorHex =
        kind === 'taxi'
          ? 0xfacc15
          : kind === 'motorcycle'
            ? [0xef4444, 0x0ea5e9, 0x10b981, 0xf97316][Math.floor(Math.random() * 4)]
            : colors[Math.floor(Math.random() * colors.length)];

      const rig = modelFactory.buildTrafficVehicle(kind, colorHex);
      const isViolator =
        mode === 'police_patrol' &&
        !isOncoming &&
        kind !== 'cone' &&
        kind !== 'hantour' &&
        Math.random() < 0.38;
      let violatorMarker: THREE.Mesh | undefined;
      if (isViolator) {
        violatorMarker = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.45, 0),
          new THREE.MeshBasicMaterial({ color: 0xef4444 }),
        );
        violatorMarker.position.set(0, 2.35, 0);
        rig.group.add(violatorMarker);
      }

      const roadX = getRoadCenterX(spawnZ);
      const spawnY = getRoadHeightAt(spawnZ);
      const yaw = getRoadYawAt(spawnZ);

      rig.group.position.set(roadX + laneOffset, spawnY, spawnZ);
      rig.group.rotation.order = 'YXZ';
      rig.group.rotation.y = yaw + (direction === 1 ? Math.PI : 0);
      rig.group.rotation.x = direction * -getRoadPitchAt(spawnZ);
      scene.add(rig.group);

      // Traffic speeds scale noticeably from Level 1 (Easy) to Level 7 (Legendary Hard), keeping Hantour authentic
      const trafficSpeedScale = isMotoDrivingMode || isTaxiPlayerMode ? 0.88 + motoLevelFactor * 0.48 : 1.0;
      const baseSpeedKmh =
        kind === 'cone'
          ? 0
          : isViolator
            ? 88 + Math.random() * 25
            : kind === 'hantour'
              ? 15 + Math.random() * 5
              : (kind === 'motorcycle'
                  ? 60 + Math.random() * 22
                  : kind === 'police'
                    ? 52 + Math.random() * 16
                    : kind === 'microbus'
                      ? 36 + Math.random() * 20
                      : 44 + Math.random() * 26) * trafficSpeedScale;

      const dims: Record<TrafficKind, [number, number]> = {
        cone: [0.45, 0.45],
        motorcycle: [0.42, 0.95],
        hantour: [0.85, 2.3],
        sedan: [0.92, 2.05],
        taxi: [0.92, 2.05],
        police: [0.92, 2.05],
        suv: [0.98, 2.25],
        microbus: [1.02, 2.45],
      };

      sim.traffic.push({
        id: nextEntityId++,
        rig,
        laneOffset,
        targetLaneOffset: laneOffset,
        z: spawnZ,
        halfW: dims[kind][0],
        halfL: dims[kind][1],
        speedKmh: baseSpeedKmh,
        baseSpeedKmh,
        kind,
        direction,
        nudgedTimer: 0,
        soundPlayed: false,
        nearMissed: false,
        isViolator,
        violatorMarker,
        laneChangeTimer:
          !isOncoming &&
          (kind === 'microbus' || kind === 'sedan' || kind === 'taxi' || (motoLevelFactor >= 0.45 && kind === 'suv'))
            ? Math.max(0.85, 2.6 - motoLevelFactor * 1.45) + Math.random() * Math.max(1.2, 3.6 - motoLevelFactor * 1.9)
            : 99,
      });
    };

    const spawnPickup = () => {
      if (isCheckpointMode) return;
      const activePool = sim.travelDir === -1 ? FORWARD_LANE_XS : ONCOMING_LANE_XS;
      const laneOffset = activePool[Math.floor(Math.random() * activePool.length)];
      const z = sim.z + sim.travelDir * 145;
      if (z > 80 || z < Z_END + 80) return;
      const roll = Math.random();
      const kind: PickupEntity['kind'] =
        sim.fuel < maxFuel * 0.45 && roll < 0.58 ? 'fuel' : roll < 0.5 ? 'fuel' : 'coin';

      const mesh = modelFactory.buildPickupItem(kind);
      mesh.position.set(getRoadCenterX(z) + laneOffset, getRoadHeightAt(z), z);
      scene.add(mesh);
      sim.pickups.push({ id: nextEntityId++, mesh, laneOffset, z, kind });
    };

    const getLandmarkStatus = (distM: number) => {
      let current = activeLandmarks[0];
      let next = activeLandmarks[1] ?? activeLandmarks[0];
      for (let i = 0; i < activeLandmarks.length; i++) {
        if (distM >= activeLandmarks[i].distanceM) {
          current = activeLandmarks[i];
          next = activeLandmarks[Math.min(activeLandmarks.length - 1, i + 1)];
        }
      }
      return { current: current.name, next: next.name };
    };

    const syncHud = () => {
      const rawDistM = isCheckpointMode
        ? sim.checkpointSubPhase === 'chase'
          ? Math.max(0, Math.round(-sim.z - 260))
          : sim.checkpointProcessed * 120
        : Math.max(0, Math.round(-sim.z));
      const distM =
        isRaceMode && activeTrack
          ? Math.round(Math.min(1, rawDistM / raceFinishM) * activeTrack.distanceKm * 1000)
          : rawDistM;
      const lm = getLandmarkStatus(rawDistM);
      const raceLap =
        isRaceMode && activeTrack
          ? Math.min(activeTrack.laps, 1 + Math.floor(rawDistM / activeTrack.lapRenderM))
          : undefined;
      const racePosition =
        isRaceMode && !isPracticeSubMode
          ? 1 + sim.traffic.filter((c) => c.isRacer && c.z < sim.z).length
          : isPracticeSubMode
            ? 1
            : undefined;
      onHudUpdateRef.current({
        speedKmh: Math.round(Math.abs(sim.speedKmh)),
        topSpeedKmh: Math.round(sim.topSpeedKmh),
        rpm: Math.round(sim.rpm),
        gear: sim.gear,
        rpmRatio: sim.rpmRatio,
        fuel: Math.max(0, Math.round(sim.fuel)),
        maxFuel,
        health: Math.max(0, Math.round(sim.health)),
        maxHealth,
        earnings: sim.earnings,
        points: sim.points,
        tripsCompleted: sim.tripsCompleted,
        passengersLoaded: sim.passengersLoaded,
        maxPassengers: sim.maxPassengers,
        violationsStopped: sim.violationsStopped,
        pursuitsCompleted: sim.pursuitsCompleted,
        checkpointSubPhase: isCheckpointMode ? sim.checkpointSubPhase : undefined,
        fleeingPlate: sim.chaseTarget?.plate,
        fleeingDistM: sim.chaseTarget ? Math.max(0, Math.round(sim.z - sim.chaseTarget.z)) : undefined,
        nearMisses: sim.nearMisses,
        stuntCombo: sim.stuntCombo,
        activeStunt: activeStuntRef.current,
        distanceM: distM,
        routeProgressPct: Math.min(
          100,
          Math.round((rawDistM / (isRaceMode ? raceFinishM : activeFinishM)) * 100),
        ),
        currentLandmark: activeTrack ? activeTrack.name : lm.current,
        nextLandmark: activeTrack ? `${activeTrack.district} · لفة ${raceLap}/${activeTrack.laps}` : lm.next,
        streetBanner: sim.streetBannerTimer > 0 ? sim.lastZoneTitle : null,
        timeLeftSec: sim.timeLeftSec !== null ? Math.max(0, Math.ceil(sim.timeLeftSec)) : null,
        passenger: sim.passenger ? { ...sim.passenger } : null,
        toastMessage: sim.toastTimer > 0 ? sim.toastMessage : null,
        gameOverReason: null,
        reachedMandara: sim.reachedMandara,
        signalWarning: sim.signalWarning,
        sirenActive: sirenActiveRef.current,
        checkpointPrompt: null,
        raceLap,
        raceTotalLaps: activeTrack?.laps,
        raceTimeSec: isRaceMode ? sim.raceTimeSec : undefined,
        racePosition,
        raceTotalRacers: isRaceMode ? (isPracticeSubMode ? 1 : 5) : undefined,
        raceTrackName: activeTrack?.name,
        travelDir: sim.travelDir,
        nearUTurnName: sim.nearUTurnName,
        nearUTurnDistM: sim.nearUTurnDistM,
        isUTurning: Boolean(sim.uturn),
        waitingPassengerHint:
          sim.waitingPassenger && !sim.waitingPassenger.boarding
            ? {
                name: sim.waitingPassenger.name,
                destName: sim.waitingPassenger.destinationName,
                distM: Math.max(0, Math.round(Math.abs(sim.waitingPassenger.z - sim.z))),
                fare: sim.waitingPassenger.fare,
                needsUTurn: sim.waitingPassenger.needsUTurn,
                isVipRush: sim.waitingPassenger.isVipRush,
              }
            : null,
        activeMotoLevel: isMotoDrivingMode ? activeMotoModel.level : undefined,
        activeMotoName: isMotoDrivingMode ? activeMotoModel.name : undefined,
        activeTaxiLevel: isTaxiPlayerMode ? activeTaxiLevel.level : undefined,
        activeDistrictName: mode === 'taxi_classic' ? activeDistrict.name : undefined,
        turboCharge: Math.round(sim.turboCharge),
        turboActive: sim.turboActive,
        comboStreak: sim.comboStreak,
        rushHourActive: sim.rushHourTimer > 0,
      });
      setTurboUi((prev) => {
        const nextCharge = Math.round(sim.turboCharge);
        if (prev.charge === nextCharge && prev.active === sim.turboActive) return prev;
        return { charge: nextCharge, active: sim.turboActive };
      });
    };

    syncHud();

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    let orientResizeTimer: number | null = null;
    const handleResize = () => {
      if (!container || disposed) return;
      const vv = window.visualViewport;
      const w = Math.max(300, Math.round(vv?.width || container.clientWidth || window.innerWidth));
      const h = Math.max(200, Math.round(vv?.height || container.clientHeight || window.innerHeight));
      const mobileLand = isMobileDevice && w > h;
      const targetFar = isMobileDevice && !mobileLand ? 270 : 460;
      if (camera.far !== targetFar) {
        camera.far = targetFar;
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density =
          isMobileDevice && !mobileLand
            ? atmosphere === 'night'
              ? 0.0022
              : atmosphere === 'sunset'
                ? 0.0032
                : 0.0018
            : atmosphere === 'night'
              ? 0.0016
              : atmosphere === 'sunset'
                ? 0.0026
                : 0.0014;
      }
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const handleOrientationChange = () => {
      handleResize();
      if (orientResizeTimer !== null) window.clearTimeout(orientResizeTimer);
      orientResizeTimer = window.setTimeout(handleResize, 220);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.visualViewport?.addEventListener('resize', handleResize);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    const GAS_FULL_TANK_COST = 85;
    const GAS_DELIVERY_COST = 130;
    const GAS_MIN_REFUEL_COST = 25;

    const executeGasRefuel = (stationName: string, isDelivery: boolean) => {
      const missingFrac = Math.max(0, (maxFuel - sim.fuel) / maxFuel);
      if (!sim.outOfFuel && missingFrac < 0.04) {
        showToast('التانك مليان بالفعل! ⛽', 1.5);
        return;
      }
      const fullCost = isDelivery
        ? GAS_DELIVERY_COST
        : Math.max(GAS_MIN_REFUEL_COST, Math.round(missingFrac * GAS_FULL_TANK_COST));
      const liveWallet = walletRef.current;

      if (liveWallet >= fullCost) {
        onSpendMoneyRef.current?.(fullCost);
        walletRef.current = Math.max(0, liveWallet - fullCost);
        sim.fuel = maxFuel;
        sim.outOfFuel = false;
        sim.gasRefuelCooldown = 6;
        setOutOfFuelUi(null);
        soundFX.playFuel();
        soundFX.playPickup();
        showToast(
          isDelivery
            ? `⛽ وصل التفويل من ${stationName}! (-${fullCost} ج.م · التانك ١٠٠٪)`
            : `⛽ فوّلت التانك ١٠٠٪ في ${stationName}! (-${fullCost} ج.م)`,
          3.0,
        );
        syncHud();
      } else if (liveWallet >= GAS_MIN_REFUEL_COST) {
        const addedFuel = Math.max(
          maxFuel * 0.32,
          Math.min(maxFuel - sim.fuel, (liveWallet / fullCost) * maxFuel),
        );
        onSpendMoneyRef.current?.(liveWallet);
        walletRef.current = 0;
        sim.fuel = Math.min(maxFuel, sim.fuel + addedFuel);
        sim.outOfFuel = false;
        sim.gasRefuelCooldown = 6;
        setOutOfFuelUi(null);
        soundFX.playFuel();
        showToast(
          `⛽ فوّلت بـ ${liveWallet} ج.م (رصيدك المتاح) في ${stationName} — وصّل زبون وهات فلوس!`,
          3.2,
        );
        syncHud();
      } else {
        soundFX.playBeep(320, 0.14, 0.16);
        showToast(`رصيدك (${liveWallet} ج.م) مش كافي للتفويل — محتاج ${fullCost} ج.م!`, 2.6);
      }
    };

    refuelTriggerRef.current = () => {
      if (sim.outOfFuel) {
        emergencyRefuelTriggerRef.current();
        return;
      }
      let closestGs = activeGasStations[0];
      let closestDist = Infinity;
      for (const gs of activeGasStations) {
        const d = Math.abs(gs.z - sim.z);
        if (d < closestDist) {
          closestDist = d;
          closestGs = gs;
        }
      }
      if (closestDist <= 52) {
        executeGasRefuel(closestGs.name, false);
      } else {
        showToast('اقترب من أي بنزينة على اليمين أو الشمال عشان تفوّل! ⛽', 2.0);
      }
    };

    emergencyRefuelTriggerRef.current = () => {
      let closestGs = activeGasStations[0];
      let closestDist = Infinity;
      for (const gs of activeGasStations) {
        const d = Math.abs(gs.z - sim.z);
        if (d < closestDist) {
          closestDist = d;
          closestGs = gs;
        }
      }
      executeGasRefuel(closestGs.name, closestDist > 95);
    };

    giveUpOutOfFuelTriggerRef.current = () => {
      setOutOfFuelUi(null);
      sim.outOfFuel = false;
      finishRun('خلص البنزين! عدّي على أي بنزينة على اليمين أو الشمال وادفع وفوّل التانك.');
    };

    let mobileAnimFrame = 0;
    const stepSimulation = (dt: number) => {
      const elapsed = clock.elapsedTime;
      mobileAnimFrame = (mobileAnimFrame + 1) & 3;
      const updateSeaInst = !isMobileDevice || (mobileAnimFrame & 1) === 0;

      // Animate Mediterranean sea waves, shoreline breaking surf, 3D rolling wave crests, rock sea-spray & boats
      seaUniformTime.value = elapsed;
      seaTex.offset.x = (seaTex.offset.x + dt * 0.24) % 1;
      seaTex.offset.y = (seaTex.offset.y + dt * 0.11) % 1;
      shoreFoamTex.offset.x = -0.04 + Math.sin(elapsed * 1.45) * 0.065;
      shoreFoamTex.offset.y = (shoreFoamTex.offset.y + dt * 0.08) % 1;

      if (!isUrbanCircuitTrack && updateSeaInst) {
        for (let i = 0; i < WAVE_CREST_COUNT; i++) {
          const w = rollingWaveSpecs[i];
          const wz = sim.z + w.zRel;
          if (wz > -92 || wz < Z_END + 20) {
            _dummy.position.set(0, -40, wz);
            _dummy.scale.set(0.001, 0.001, 0.001);
            _dummy.rotation.set(0, 0, 0);
            _dummy.updateMatrix();
            rollingWaveInst.setMatrixAt(i, _dummy.matrix);
            continue;
          }
          // Cycle progresses 0 -> 1 as each wave marches inward from open sea toward the Corniche seawall
          const cycle = (w.phase + elapsed * w.speed) % 1;
          const distFromShore = 58 - cycle * 42 + w.rowBand * 9;
          const swellEnv = Math.sin(cycle * Math.PI);
          const nearShoreBoost = 1 + Math.pow(cycle, 2.2) * 0.65;
          const roadX = getRoadCenterX(wz);
          const yaw = getRoadYawAt(wz);
          _dummy.position.set(
            roadX + distFromShore,
            -0.70 + swellEnv * w.height * nearShoreBoost * 0.62,
            wz,
          );
          _dummy.rotation.set(0, yaw, -0.18 * cycle);
          _dummy.scale.set(
            1.2 + swellEnv * 0.9,
            Math.max(0.05, swellEnv * w.height * nearShoreBoost),
            w.length * (0.85 + swellEnv * 0.3),
          );
          _dummy.updateMatrix();
          rollingWaveInst.setMatrixAt(i, _dummy.matrix);
        }
        rollingWaveInst.instanceMatrix.needsUpdate = true;

        for (let i = 0; i < SPRAY_PLUME_COUNT; i++) {
          const sp = spraySpecs[i];
          const sz = sim.z + sp.zRel;
          if (sz > -90 || sz < Z_END + 30 || Math.abs(sz - STANLEY_BRIDGE_Z) < 88) {
            _dummy.position.set(0, -40, sz);
            _dummy.scale.set(0.001, 0.001, 0.001);
            _dummy.rotation.set(0, 0, 0);
            _dummy.updateMatrix();
            sprayInst.setMatrixAt(i, _dummy.matrix);
            continue;
          }
          // Sharp splash burst on the first 45% of each wave impact cycle, quiet trough afterwards
          const t = (sp.phase + elapsed * sp.rate) % 1;
          if (t > 0.48) {
            _dummy.position.set(0, -40, sz);
            _dummy.scale.set(0.001, 0.001, 0.001);
            _dummy.updateMatrix();
            sprayInst.setMatrixAt(i, _dummy.matrix);
            continue;
          }
          const u = t / 0.48;
          const rise = Math.sin(u * Math.PI);
          const roadX = getRoadCenterX(sz);
          _dummy.position.set(
            roadX + sp.xOff - u * 1.1,
            0.08 + rise * sp.maxHeight,
            sz + Math.sin(elapsed * 2 + i) * 0.6,
          );
          _dummy.rotation.set(elapsed * 0.8 + i, elapsed * 1.1, 0);
          _dummy.scale.set(
            0.65 + u * 1.15,
            Math.max(0.05, rise * (0.95 + sp.maxHeight * 0.42)),
            1.15 + u * 1.55,
          );
          _dummy.updateMatrix();
          sprayInst.setMatrixAt(i, _dummy.matrix);
        }
        sprayInst.instanceMatrix.needsUpdate = true;
      }

      const boatCullDist = isMobileDevice ? 190 : 360;
      for (const b of animatedBoats) {
        if (Math.abs(b.mesh.position.z - sim.z) > boatCullDist) continue;
        b.mesh.position.y = b.baseY + 0.16 + Math.sin(elapsed * 1.9 + b.phase) * 0.22;
        b.mesh.rotation.z = Math.sin(elapsed * 1.45 + b.phase) * 0.065;
        b.mesh.rotation.x = Math.cos(elapsed * 1.2 + b.phase) * 0.03;
      }

      // Animate sidewalk pedestrians (distance-culled on mobile for smooth Android CPU frames)
      const pedLimbCull = isMobileDevice ? 115 : 210;
      for (const ped of animatedPeds) {
        if (ped.z > sim.z + 28) {
          ped.z = sim.z - (165 + ((ped.phase * 13) % 45));
        } else if (ped.z < sim.z - 220) {
          ped.z = sim.z + 15;
        }
        ped.z += ped.dirZ * ped.speed * dt;

        if ((ped.side === 'sea' || ped.isWaver) && Math.abs(ped.z - STANLEY_BRIDGE_Z) < 88) {
          ped.rig.group.visible = false;
          continue;
        }
        ped.rig.group.visible = true;
        const yaw = getRoadYawAt(ped.z);
        ped.rig.group.position.set(
          getRoadCenterX(ped.z) + ped.laneOffset,
          ped.side === 'sea' || ped.isWaver ? 0.28 : 0.24,
          ped.z,
        );
        ped.rig.group.rotation.y = yaw + (ped.isWaver ? Math.PI / 2 : ped.dirZ === -1 ? 0 : Math.PI);

        if (Math.abs(ped.z - sim.z) > pedLimbCull) continue;
        if (ped.isWaver) {
          const wave = Math.sin(elapsed * 6.5 + ped.phase);
          ped.rig.rightArm.rotation.z = 2.45 + wave * 0.35;
        } else {
          const swing = Math.sin(elapsed * 5.2 + ped.phase) * 0.55;
          ped.rig.leftLeg.rotation.x = swing;
          ped.rig.rightLeg.rotation.x = -swing;
          ped.rig.leftArm.rotation.x = -swing * 0.75;
          ped.rig.rightArm.rotation.x = swing * 0.75;
        }
      }

      // Update Working Traffic Signals (skip far crosswalk pedestrian animation on mobile)
      const sigCrosserCull = isMobileDevice ? 130 : 230;
      for (const sig of signals) {
        const cyc = (elapsed + sig.phaseOffset) % 20;
        sig.state = cyc < 10 ? 'green' : cyc < 12.5 ? 'yellow' : 'red';
        sig.rig.redMat.emissiveIntensity = sig.state === 'red' ? 3.0 : 0.15;
        sig.rig.yellowMat.emissiveIntensity = sig.state === 'yellow' ? 3.0 : 0.15;
        sig.rig.greenMat.emissiveIntensity = sig.state === 'green' ? 2.6 : 0.15;

        if (Math.abs(sig.z - sim.z) > sigCrosserCull) continue;

        if (sig.state === 'red') {
          sig.rig.officerArm.rotation.z = 2.35;
        } else if (sig.state === 'yellow') {
          sig.rig.officerArm.rotation.z = 1.6 + Math.sin(elapsed * 8) * 0.32;
        } else {
          sig.rig.officerArm.rotation.z = 0.45 + Math.sin(elapsed * 5) * 0.42;
        }

        for (const cp of sig.crossers) {
          const worldZ = sig.z + cp.zOffset;
          const roadX = getRoadCenterX(worldZ);
          if (sig.state === 'red') {
            cp.rig.group.visible = true;
            cp.laneOffset += cp.dirX * cp.speed * dt;
            if (cp.dirX === -1 && cp.laneOffset < -SIDEWALK_CURB_X - 1.2) cp.dirX = 1;
            else if (cp.dirX === 1 && cp.laneOffset > SIDEWALK_CURB_X + 1.2) cp.dirX = -1;
            const swing = Math.sin(elapsed * 7.5 + cp.phase) * 0.65;
            cp.rig.leftLeg.rotation.x = swing;
            cp.rig.rightLeg.rotation.x = -swing;
            cp.rig.leftArm.rotation.x = -swing * 0.8;
            cp.rig.rightArm.rotation.x = swing * 0.8;
            cp.rig.group.position.set(roadX + cp.laneOffset, 0.06, worldZ);
            cp.rig.group.rotation.y = cp.dirX === -1 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            const targetEdge = cp.dirX === -1 ? -SIDEWALK_CURB_X - 1.4 : SIDEWALK_CURB_X + 1.4;
            if (Math.abs(cp.laneOffset) < SIDEWALK_CURB_X + 0.5) {
              cp.rig.group.visible = true;
              cp.laneOffset += Math.sign(targetEdge - cp.laneOffset) * cp.speed * 1.4 * dt;
              const swing = Math.sin(elapsed * 9 + cp.phase) * 0.65;
              cp.rig.leftLeg.rotation.x = swing;
              cp.rig.rightLeg.rotation.x = -swing;
              cp.rig.group.position.set(roadX + cp.laneOffset, 0.06, worldZ);
            } else {
              cp.rig.group.visible = false;
            }
          }
        }
      }

      if (gameStateRef.current !== 'PLAYING' || sim.ended) return;

      if (sim.hornCooldown > 0) sim.hornCooldown -= dt;
      if (sim.toastTimer > 0) sim.toastTimer -= dt;
      if (sim.streetBannerTimer > 0) {
        sim.streetBannerTimer -= dt;
        if (sim.streetBannerTimer <= 0) setStreetBannerText(null);
      }
      if (sim.invulnerableTimer > 0) sim.invulnerableTimer -= dt;

      // Checkpoint Scene Lights & AI Teammates Animation
      if (isCheckpointMode) {
        if (checkpointParkedCruiser) checkpointParkedCruiser.animate?.(elapsed, 0);
        if (checkpointRedLight && checkpointBlueLight) {
          const redOn = Math.sin(elapsed * 14) >= 0;
          checkpointRedLight.intensity = redOn ? 10 : 1;
          checkpointBlueLight.intensity = redOn ? 1 : 8;
        }
        checkpointTeammates.forEach((mate, idx) => {
          mate.rightArm.rotation.x = 1.05 + Math.sin(elapsed * 3.8 + idx * 1.4) * 0.25;
        });
      }

      // Stationary First-Person Checkpoint Duty Phase ("وضع اللجنة")
      if (isCheckpointMode && sim.checkpointSubPhase === 'duty' && officerRig) {
        const waitingCar = sim.checkpointCars.find((c) => c.state === 'waiting') ?? null;

        if (sim.timeLeftSec !== null) {
          // Slow down clock while actively reading Egyptian driver license papers at window
          const timerScale = waitingCar ? 0.35 : 1.0;
          sim.timeLeftSec -= dt * timerScale;
          if (sim.timeLeftSec <= 0) {
            sim.timeLeftSec = 0;
            syncHud();
            finishRun(
              `انتهت وردية اللجنة! ضبطت ${sim.violationsStopped} مخالفة و${sim.pursuitsCompleted} مطاردة.`,
            );
            return;
          }
        }

        if (sim.trunkPeekTimer > 0) sim.trunkPeekTimer -= dt;

        const keys = keysRef.current;
        const moveSteer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (waitingCar) {
          // Officer smoothly walks right beside the driver's window (or rear trunk when inspecting trunk)
          const targetLane = waitingCar.laneOffset - 1.56;
          const targetZ =
            sim.trunkPeekTimer > 0 ? waitingCar.z + 2.25 : waitingCar.z - 0.22;
          sim.laneOffset = THREE.MathUtils.damp(sim.laneOffset, targetLane, 6.5, dt);
          sim.officerZ = THREE.MathUtils.damp(sim.officerZ, targetZ, 6.5, dt);
        } else {
          const targetLane = THREE.MathUtils.clamp(sim.laneOffset + moveSteer * 3.4 * dt, 2.1, 7.6);
          sim.laneOffset = waitingCar ? sim.laneOffset : targetLane;
          sim.officerZ = THREE.MathUtils.damp(sim.officerZ, sim.z, 6.5, dt);
        }

        const rx = getRoadCenterX(sim.officerZ);
        officerRig.group.position.set(rx + sim.laneOffset, getRoadHeightAt(sim.officerZ) + 0.04, sim.officerZ);
        officerRig.group.rotation.y = waitingCar
          ? getRoadYawAt(sim.officerZ) - Math.PI * 0.5
          : getRoadYawAt(sim.officerZ) + Math.PI;
        officerRig.stopArm.rotation.x = 1.1 + Math.sin(elapsed * 3.5) * 0.15;

        if (sim.stopPaddleTimer > 0) sim.stopPaddleTimer -= dt;
        if (officerPovRig) {
          const raised = sim.stopPaddleTimer > 0;
          const targetRightX = raised ? 0.24 : waitingCar ? -0.35 : -0.14 + Math.sin(elapsed * 2.1) * 0.03;
          const targetRightY = raised ? -0.1 : waitingCar ? -0.34 : -0.26;
          officerPovRig.rightArm.rotation.x = THREE.MathUtils.damp(
            officerPovRig.rightArm.rotation.x,
            targetRightX,
            11,
            dt,
          );
          officerPovRig.rightArm.position.y = THREE.MathUtils.damp(
            officerPovRig.rightArm.position.y,
            targetRightY,
            11,
            dt,
          );
          officerPovRig.leftArm.position.y = THREE.MathUtils.damp(
            officerPovRig.leftArm.position.y,
            (waitingCar ? -0.36 : -0.28) + Math.cos(elapsed * 2.1) * 0.012,
            9,
            dt,
          );
        }

        if (policeChaseRig) {
          policeChaseRig.animateVehicle?.(elapsed, dt, 'none', false, 0, {
            throttle: false,
            braking: false,
            speedKmh: 0,
            atmosphere,
            isPov: false,
          });
        }

        for (let ci = sim.checkpointCars.length - 1; ci >= 0; ci--) {
          const cc = sim.checkpointCars[ci];
          cc.marker.rotation.y += dt * 3;
          cc.driverRig.update(dt);
          if (cc.state === 'approaching') {
            const approachSpeed = isTeamCheckpoint ? cc.speedKmh * 0.8 : cc.speedKmh * 0.92;
            const mps = (approachSpeed / 3.6) * 0.85;
            cc.z -= mps * dt;
            const dist = cc.z - sim.z;
            if (dist <= 52 && dist > 0 && !cc.announced) {
              cc.announced = true;
              setCheckpointUi({
                plate: cc.plate,
                kindLabel: cc.kindLabel,
                speedKmh: cc.speedKmh,
                isViolator: cc.isViolator,
                reason: cc.reason,
                status: 'approaching',
                teamHint: isTeamCheckpoint
                  ? cc.isViolator
                    ? 'رصد الزملاء: اشتباه مخالفة! افحص الرخصة عند التوقف'
                    : 'رصد الزملاء: يبدو سليم'
                  : undefined,
                inspection: cc.inspection,
                highlightedField: null,
                trunkChecked: false,
              });
            }
            if (dist <= 9.0) {
              if (cc.willFlee && !cc.fleeAtWindow) {
                cc.state = 'fleeing';
                soundFX.playHorn();
                setCheckpointUi((prev) => (prev ? { ...prev, status: 'fleeing' } : prev));
                showToast(`هروب! ${cc.plate} كسر الكمين بدون توقف!`, 2.2);
              } else {
                cc.state = 'waiting';
                cc.inspectionStage = 'at_window';
                highlightedFieldRef.current = null;
                setCheckpointUi({
                  plate: cc.plate,
                  kindLabel: cc.kindLabel,
                  speedKmh: cc.speedKmh,
                  isViolator: cc.isViolator,
                  reason: cc.reason,
                  status: 'at_window',
                  inspection: cc.inspection,
                  highlightedField: null,
                  trunkChecked: cc.trunkChecked,
                });
              }
            }
          } else if (cc.state === 'signaled_stop') {
            const decelMps = Math.max(5.5, (cc.z - (sim.z + 8.5)) * 1.45);
            cc.z -= decelMps * dt;
            if (cc.z - sim.z <= 9.0) {
              cc.state = 'waiting';
              cc.inspectionStage = 'at_window';
              highlightedFieldRef.current = null;
              setCheckpointUi({
                plate: cc.plate,
                kindLabel: cc.kindLabel,
                speedKmh: cc.speedKmh,
                isViolator: cc.isViolator,
                reason: cc.reason,
                status: 'at_window',
                inspection: cc.inspection,
                highlightedField: null,
                trunkChecked: cc.trunkChecked,
              });
            }
          } else if (cc.state === 'fleeing') {
            cc.z -= 34 * dt;
            if (cc.z <= sim.z - 5.5) {
              enterMotorcycleChase(cc);
              return;
            }
          } else if (cc.state === 'waiting') {
            // Officer stands beside driver window inspecting license & trunk
          } else if (cc.state === 'cleared') {
            cc.z -= 24 * dt;
            if (cc.z < sim.z - 55) {
              scene.remove(cc.rig.group);
              sim.checkpointCars.splice(ci, 1);
            }
          } else if (cc.state === 'pulled_over') {
            cc.laneOffset = THREE.MathUtils.damp(cc.laneOffset, FORWARD_LANE_XS[2], 4, dt);
            cc.z -= 4 * dt;
            if (Math.abs(cc.laneOffset - FORWARD_LANE_XS[2]) < 0.25 && sim.checkpointCars.length > 1) {
              scene.remove(cc.rig.group);
              sim.checkpointCars.splice(ci, 1);
            }
          }
          cc.rig.group.position.set(getRoadCenterX(cc.z) + cc.laneOffset, getRoadHeightAt(cc.z), cc.z);
          cc.rig.group.rotation.y = getRoadYawAt(cc.z);
          cc.rig.animate?.(elapsed, cc.state === 'waiting' ? 0 : 12);
        }
        skyDome.position.set(rx + sim.laneOffset, 0, sim.officerZ);
        sim.hudAccum += dt;
        if (sim.hudAccum >= 0.08) {
          sim.hudAccum = 0;
          syncHud();
        }
        return;
      }

      const activeDriveRig = isCheckpointMode ? policeChaseRig : playerRig;
      if (!activeDriveRig) return;
      const motoDrivingNow = isMotoMode || (isCheckpointMode && sim.checkpointSubPhase === 'chase');

      // Starting Grid 3 - 2 - 1 - انطلق! Countdown for Race / Practice
      if (isRaceMode && sim.raceGoBannerTimer > 0) {
        sim.raceGoBannerTimer -= dt;
        if (sim.raceGoBannerTimer <= 0) {
          setCountdownUi(null);
        }
      }

      if (isRaceMode && sim.raceCountdownTimer > 0) {
        if (sim.raceCountdownStage === 3 && sim.raceCountdownTimer >= 3.1) {
          soundFX.playCountdownBeep(false);
        }
        sim.raceCountdownTimer -= dt;
        const nextStage =
          sim.raceCountdownTimer > 2.0 ? 3 : sim.raceCountdownTimer > 1.0 ? 2 : sim.raceCountdownTimer > 0 ? 1 : 0;
        if (nextStage !== sim.raceCountdownStage) {
          sim.raceCountdownStage = nextStage;
          if (nextStage === 2) {
            setCountdownUi('2');
            soundFX.playCountdownBeep(false);
          } else if (nextStage === 1) {
            setCountdownUi('1');
            soundFX.playCountdownBeep(false);
          } else {
            sim.raceCountdownTimer = 0;
            sim.raceGoBannerTimer = 0.85;
            setCountdownUi('انطلق!');
            soundFX.playCountdownBeep(true);
            showToast('انطلق! دوس بنزين على الآخر!', 2.2);
          }
        }

        if (sim.raceCountdownTimer > 0) {
          const keysGrid = keysRef.current;
          const revving = keysGrid.up || controlSettingsRef.current.gas === 'auto';
          const targetGridRpm = revving ? 0.72 : 0.16;
          sim.rpmRatio = THREE.MathUtils.damp(sim.rpmRatio, targetGridRpm, 9, dt);
          sim.rpm = 1200 + sim.rpmRatio * 10300;
          soundFX.updateEngineAudio(
            0,
            sim.rpmRatio,
            1,
            revving,
            keysGrid.down,
            isMotoMode,
            activeMotoTuning?.engineSound,
          );

          const gx = getRoadCenterX(sim.z);
          const gy = getRoadHeightAt(sim.z);
          const gyaw = getRoadYawAt(sim.z);
          activeDriveRig.group.position.set(gx + sim.laneOffset, gy, sim.z);
          activeDriveRig.group.rotation.set(getRoadPitchAt(sim.z), gyaw, 0);
          activeDriveRig.animateVehicle?.(elapsed, dt, 'none', false, 0, {
            throttle: revving,
            braking: keysGrid.down,
            speedKmh: 0,
            rpmRatio: sim.rpmRatio,
            gear: 1,
            fuelPct: 100,
            tilt: 0,
            noseDive: 0,
            isPov: cameraModeRef.current === 'hood',
            atmosphere,
            rearTrafficHint: null,
          });
          skyDome.position.set(gx + sim.laneOffset, gy, sim.z);
          sim.hudAccum += dt;
          if (sim.hudAccum >= 0.08) {
            sim.hudAccum = 0;
            syncHud();
          }
          return;
        }
      }

      if (isRaceMode) {
        sim.raceTimeSec += dt;
      }

      if (sim.health < maxHealth) {
        sim.health = Math.min(maxHealth, sim.health + 14 * dt);
      }

      // Police Siren audio loop in Police Patrol mode
      if (mode === 'police_patrol' && sirenActiveRef.current) {
        sim.sirenTimer -= dt;
        if (sim.sirenTimer <= 0) {
          sim.sirenTimer = 1.65;
          soundFX.playPoliceSiren();
        }
      }

      // Motorcycle Stunts Combo & Continuous Trick Points!
      const currentStunt = activeStuntRef.current;
      if (isMotoMode && currentStunt !== 'none' && sim.speedKmh >= 45) {
        sim.stuntTimer += dt;
        const newCombo = Math.min(4, 2 + Math.floor(sim.stuntTimer / 2.2));
        if (newCombo !== sim.stuntCombo) {
          sim.stuntCombo = newCombo;
          setStuntComboUi(newCombo);
          soundFX.playPickup();
        }
        // Earn steady trick points every ~0.4s
        if (Math.floor((sim.stuntTimer - dt) * 2.5) < Math.floor(sim.stuntTimer * 2.5)) {
          addPoints(12);
        }
      } else {
        if (sim.stuntCombo !== 1) {
          sim.stuntCombo = 1;
          setStuntComboUi(1);
        }
        sim.stuntTimer = 0;
      }

      // Progressive Gas, Reverse Gear (for Cars), Turbo Boost & Taxi Upgrade Speed Curve
      const keys = keysRef.current;
      const ctrl = controlSettingsRef.current;
      const autoGas = ctrl.gas === 'auto';
      const allowReverse = !motoDrivingNow;
      const reverseActive = allowReverse && keys.reverse && !keys.up;
      const gasActive = keys.up || (autoGas && !keys.down && !reverseActive);

      // Exciting Turbo Boost (charged via Near Misses, VIP Deliveries & Coins)
      const wantsTurbo = keys.turbo && !keys.down && !reverseActive && !sim.outOfFuel && sim.speedKmh >= 8;
      if (wantsTurbo && (sim.turboActive ? sim.turboCharge > 1 : sim.turboCharge >= 18)) {
        if (!sim.turboActive) {
          soundFX.playBeep(740, 0.12, 0.14);
        }
        sim.turboActive = true;
        sim.turboCharge = Math.max(0, sim.turboCharge - 29 * dt);
        if (sim.turboCharge <= 0.5) {
          sim.turboActive = false;
        }
      } else {
        sim.turboActive = false;
        if (sim.speedKmh > 20) {
          // Gentle passive charge while cruising fast
          sim.turboCharge = Math.min(100, sim.turboCharge + 1.8 * dt);
        }
      }

      if (sim.comboTimer > 0) {
        sim.comboTimer -= dt;
        if (sim.comboTimer <= 0) sim.comboStreak = 0;
      }
      if (sim.rushHourTimer > 0) sim.rushHourTimer = Math.max(0, sim.rushHourTimer - dt);
      if (sim.shakeTimer > 0) sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);

      const effectiveMaxSpeedKmh = maxSpeedKmh * (sim.turboActive ? 1.36 : 1);
      const absSpeedBefore = Math.abs(sim.speedKmh);
      const speedFraction = Math.min(1, absSpeedBefore / effectiveMaxSpeedKmh);
      const maxReverseKmh = 36;

      // Grounded model-scaled acceleration that climbs dramatically across the 7 Moto & 7 Taxi levels!
      const baseAccel = isMotoDrivingMode
        ? 26 + progress.upgrades.engine * 2.5 + activeMotoModel.accelBonus
        : 28 +
          activeTaxiLevel.accelBonus +
          progress.upgrades.engine * 2.5 +
          (effectiveVehicleKind === 'police_car' ? 14 : 0) +
          (activeRaceBike?.accelBonus ?? 0);
      const accel = baseAccel * (sim.turboActive ? 1.58 : 1.0) * (1.12 - speedFraction * 0.42);

      let targetPitch = 0;
      let targetNoseDive = 0;
      if (sim.outOfFuel) {
        if (sim.speedKmh > 0) {
          sim.speedKmh = Math.max(0, sim.speedKmh - 26 * dt);
        } else if (sim.speedKmh < 0) {
          sim.speedKmh = Math.min(0, sim.speedKmh + 26 * dt);
        }
        if (Math.abs(sim.speedKmh) < 0.1) {
          sim.speedKmh = 0;
          sim.wasMoving = false;
        }
      } else if (keys.down) {
        if (sim.speedKmh > 0) {
          sim.speedKmh = Math.max(0, sim.speedKmh - brakeRate * dt);
          targetPitch = sim.speedKmh > 3 ? -0.072 : 0;
          targetNoseDive = sim.speedKmh > 3 ? -0.056 : 0;
        } else if (sim.speedKmh < 0) {
          sim.speedKmh = Math.min(0, sim.speedKmh + brakeRate * dt);
          targetPitch = sim.speedKmh < -3 ? 0.042 : 0;
        }
        if (Math.abs(sim.speedKmh) < 0.1 && sim.wasMoving) {
          sim.speedKmh = 0;
          sim.wasMoving = false;
          soundFX.playBrakeStop();
        }
      } else if (reverseActive) {
        if (sim.speedKmh > 0.5) {
          // Smoothly brake forward momentum before engaging Reverse
          sim.speedKmh = Math.max(0, sim.speedKmh - brakeRate * 1.15 * dt);
          targetPitch = -0.055;
          targetNoseDive = -0.04;
        } else {
          sim.speedKmh = Math.max(-maxReverseKmh, sim.speedKmh - 44 * dt);
          targetPitch = -0.024;
          targetNoseDive = -0.015;
          sim.wasMoving = true;
        }
      } else if (gasActive || sim.turboActive) {
        const forwardGain = sim.speedKmh < 0 ? accel + 48 : accel;
        if (sim.speedKmh > effectiveMaxSpeedKmh) {
          sim.speedKmh = Math.max(effectiveMaxSpeedKmh, sim.speedKmh - 22 * dt);
        } else {
          sim.speedKmh = Math.min(effectiveMaxSpeedKmh, sim.speedKmh + forwardGain * dt);
        }
        targetPitch = (sim.turboActive ? 0.052 : 0.034) * (1 - speedFraction * 0.35);
        targetNoseDive = sim.turboActive ? 0.028 : 0.016;
        sim.wasMoving = true;
      } else {
        if (sim.speedKmh > 0) {
          sim.speedKmh = Math.max(0, sim.speedKmh - 14 * dt);
        } else if (sim.speedKmh < 0) {
          sim.speedKmh = Math.min(0, sim.speedKmh + 34 * dt);
        }
        if (Math.abs(sim.speedKmh) < 0.1) {
          sim.speedKmh = 0;
          sim.wasMoving = false;
        }
      }

      const absSpeedKmh = Math.abs(sim.speedKmh);
      const isReversingNow = sim.speedKmh < -0.5 || (reverseActive && sim.speedKmh <= 0.5);
      if (isReversingNow && sim.speedKmh < -1) {
        sim.reverseBeepTimer -= dt;
        if (sim.reverseBeepTimer <= 0) {
          sim.reverseBeepTimer = 0.62;
          soundFX.playBeep(960, 0.075, 0.055);
        }
      } else {
        sim.reverseBeepTimer = 0;
      }

      sim.topSpeedKmh = Math.max(sim.topSpeedKmh, sim.speedKmh);

      // Authentic second-order front fork suspension spring-damper for realistic braking nose-dive & rebound
      const springK = 88;
      const dampC = 14;
      sim.noseDiveVel += ((targetNoseDive - sim.noseDive) * springK - sim.noseDiveVel * dampC) * dt;
      sim.noseDive = THREE.MathUtils.clamp(sim.noseDive + sim.noseDiveVel * dt, -0.078, 0.035);
      sim.pitch = THREE.MathUtils.damp(sim.pitch, targetPitch + sim.noseDive * 0.45, 11, dt);

      // Dynamic 6-Speed Sequential Transmission + Reverse Gear (0 = R)
      const gearBounds = [
        0,
        maxSpeedKmh * 0.16,
        maxSpeedKmh * 0.32,
        maxSpeedKmh * 0.49,
        maxSpeedKmh * 0.67,
        maxSpeedKmh * 0.85,
        effectiveMaxSpeedKmh + 8,
      ];
      let newGear = 1;
      if (isReversingNow) {
        newGear = 0;
      } else {
        for (let g = 1; g <= 6; g++) {
          if (sim.speedKmh >= gearBounds[g - 1]) {
            newGear = g;
          }
        }
      }
      if (newGear > sim.gear && gasActive && activeMotoTuning && activeMotoTuning.exhaustStyle !== 'stock') {
        activeDriveRig.triggerExhaustRev?.(0.75);
      }
      sim.gear = newGear;
      const gMin = newGear > 0 ? gearBounds[newGear - 1] : 0;
      const gMax = newGear > 0 ? gearBounds[newGear] : maxReverseKmh;
      const inGearFrac = THREE.MathUtils.clamp((absSpeedKmh - gMin) / Math.max(12, gMax - gMin), 0, 1);
      const targetRpmRatio = isReversingNow
        ? THREE.MathUtils.clamp(0.18 + (absSpeedKmh / maxReverseKmh) * 0.42, 0.16, 0.62)
        : absSpeedKmh < 1.5
          ? gasActive
            ? 0.44
            : 0.1
          : THREE.MathUtils.clamp(
              0.24 + inGearFrac * 0.68 + (sim.turboActive ? 0.18 : gasActive ? 0.09 : -0.05),
              0.12,
              0.99,
            );
      sim.rpmRatio = THREE.MathUtils.damp(sim.rpmRatio, targetRpmRatio, 10, dt);
      sim.rpm = 1200 + sim.rpmRatio * 10300;

      // Update continuous engine RPM + gear shift exhaust pop + aerodynamic wind synthesizer
      soundFX.updateEngineAudio(
        absSpeedKmh,
        sim.rpmRatio,
        Math.max(1, sim.gear),
        (gasActive || sim.turboActive || isReversingNow) && !keys.down,
        keys.down,
        motoDrivingNow,
        activeMotoTuning?.engineSound,
      );

      // Update high-speed / Turbo wind radial streaks overlay directly (skip on mobile/Android to avoid expensive full-screen CSS conic repaints)
      if (!isMobileDevice && windOverlayRef.current) {
        const windThreshold = Math.max(58, maxSpeedKmh * 0.72);
        const rawWind = THREE.MathUtils.clamp((sim.speedKmh - windThreshold) / Math.max(25, maxSpeedKmh - windThreshold + 24), 0, 1);
        const windIntensity = sim.turboActive ? Math.max(0.78, rawWind) : rawWind;
        windOverlayRef.current.style.opacity = String(Number((windIntensity * 0.88).toFixed(3)));
        windOverlayRef.current.style.transform =
          windIntensity > 0.02
            ? `scale(${(1 + windIntensity * 0.1).toFixed(3)}) rotate(${((elapsed * (sim.turboActive ? 38 : 22)) % 8 - 4).toFixed(2)}deg)`
            : 'scale(1)';
      }

      activeDriveRig.brakeLights.forEach((bl) => {
        const mat = bl.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = keys.down || isReversingNow || absSpeedKmh < 1 ? 2.8 : 0.7;
      });

      if (activeDriveRig.roofSignMat) {
        const signColorHex = sim.passenger ? 0xf59e0b : 0x22c55e;
        activeDriveRig.roofSignMat.color.setHex(signColorHex);
        activeDriveRig.roofSignMat.emissive.setHex(signColorHex);
      }

      // Steering & Smooth Bi-Directional U-Turn Handling
      if (sim.uturnCooldown > 0) sim.uturnCooldown -= dt;
      let steer = 0;
      const prevZ = sim.z;
      const mps = (sim.speedKmh / 3.6) * 1.45;

      // Nearest District U-Turn detector
      if (!isRaceMode && !isCheckpointMode && !isUrbanCircuitTrack) {
        let bestUt: (typeof activeUTurnZones)[number] | null = null;
        let bestDist = Infinity;
        for (const ut of activeUTurnZones) {
          const d = Math.abs(ut.z - sim.z);
          if (d < bestDist) {
            bestDist = d;
            bestUt = ut;
          }
        }
        if (bestUt && bestDist <= 72) {
          sim.nearUTurnName = bestUt.name;
          sim.nearUTurnDistM = Math.round(bestDist);
          sim.nearUTurnZ = bestUt.z;
          setNearUTurnUi({ name: bestUt.name, distM: Math.round(bestDist), active: Boolean(sim.uturn) });
        } else {
          sim.nearUTurnName = null;
          sim.nearUTurnDistM = null;
          sim.nearUTurnZ = null;
          setNearUTurnUi(null);
        }
      }

      if (sim.uturn) {
        // Execute sweeping 180° U-turn arc across the median opening
        sim.uturn.progress = Math.min(1, sim.uturn.progress + dt * 0.85);
        const u = sim.uturn.progress;
        const smooth = u * u * (3 - 2 * u);
        sim.laneOffset = THREE.MathUtils.lerp(sim.uturn.startLane, sim.uturn.endLane, smooth);
        sim.headingOffset = THREE.MathUtils.lerp(sim.uturn.startHeading, sim.uturn.endHeading, smooth);
        sim.z = sim.uturn.startZ + Math.sin(u * Math.PI) * 5.8 * (-sim.uturn.targetDir);
        sim.tilt = THREE.MathUtils.damp(sim.tilt, -0.34 * Math.sin(u * Math.PI), 10, dt);
        sim.speedKmh = Math.max(24, Math.min(sim.speedKmh, 44));

        if (sim.uturn.progress >= 1) {
          const finishedZone = sim.uturn.zoneName;
          sim.travelDir = sim.uturn.targetDir;
          sim.headingOffset = sim.travelDir === -1 ? 0 : Math.PI;
          sim.uturn = null;
          sim.uturnCooldown = 1.6;
          // Clear waiting passenger on old direction so a fresh one spawns ahead on the return carriageway
          if (sim.waitingPassenger && sim.waitingPassenger.travelDir !== sim.travelDir && !sim.waitingPassenger.boarding) {
            scene.remove(sim.waitingPassenger.rig.group);
            sim.waitingPassenger = null;
            sim.passengerSpawnCooldown = 0.8;
          }
          if (sim.passenger) {
            sim.dropoffLaneX = sim.travelDir === -1 ? FORWARD_LANE_XS[2] : ONCOMING_LANE_XS[0];
          }
          const startLmName = activeLandmarks[0]?.name ?? 'بداية الخط';
          const endLmName = activeLandmarks[activeLandmarks.length - 1]?.name ?? 'نهاية الخط';
          showToast(
            `تم الدوران من ${finishedZone}! اتجاهك الآن: ${
              sim.travelDir === -1 ? `${startLmName} ← ${endLmName}` : `${endLmName} ← ${startLmName}`
            }`,
            3.2,
          );
        }
      } else {
        if (absSpeedKmh > 1.5) {
          if (keys.left) steer -= 1;
          if (keys.right) steer += 1;
          if (ctrl.steering === 'joystick' && Math.abs(analogSteerRef.current) > 0.05) {
            steer = analogSteerRef.current;
          } else if (ctrl.steering === 'tilt' && Math.abs(tiltRawRef.current) > 0.05) {
            steer = THREE.MathUtils.clamp(steer + tiltRawRef.current, -1, 1);
          }
        }
        sim.steerSmooth = THREE.MathUtils.damp(sim.steerSmooth, steer, 12, dt);
        const sensMultiplier = 0.65 + (ctrl.sensitivity - 1) * 0.22;
        const speedTurnFactor = 0.65 + Math.min(0.45, (absSpeedKmh / maxSpeedKmh) * 0.45);
        const targetLatVel = steer * baseLateralSpeed * sensMultiplier * speedTurnFactor * (sim.speedKmh < 0 ? 0.75 : 1);
        sim.latVel = THREE.MathUtils.damp(sim.latVel, targetLatVel, motoDrivingNow ? 11 : 13, dt);
        // Flip lateral X delta when travelling East (+Z) so Left/Right always matches screen direction!
        sim.laneOffset += -sim.travelDir * sim.latVel * dt;
        const targetLean = motoDrivingNow ? -steer * 0.36 : -steer * 0.16 * (sim.speedKmh < 0 ? -1 : 1);
        sim.tilt = THREE.MathUtils.damp(sim.tilt, targetLean, 10, dt);

        // Auto-enter U-Turn when steering into an open median U-turn gap!
        const inUTurnOpening =
          !isRaceMode &&
          !isCheckpointMode &&
          !isUrbanCircuitTrack &&
          sim.nearUTurnName !== null &&
          sim.nearUTurnDistM !== null &&
          sim.nearUTurnDistM <= 16;

        if (sim.travelDir === -1) {
          const canUseSideBypass = isSideBypassAtZ(sim.z);
          const maxRightEdge = canUseSideBypass ? 15.95 : 9.55;
          const clampRightEdge = canUseSideBypass ? 15.72 : 9.38;
          if (sim.onRightBridge) sim.onRightBridge = false;
          if (sim.inSidiGaberTurn) sim.inSidiGaberTurn = false;

          if (canUseSideBypass) {
            if (!sim.inSideBypass && sim.laneOffset > 10.35) {
              sim.inSideBypass = true;
              showToast('🛣️ دخلت الشارع الجانبي الهادئ — بعيد عن الزحام!', 2.4);
            } else if (sim.inSideBypass && sim.laneOffset < 9.35) {
              sim.inSideBypass = false;
              showToast('↩️ رجعت للشارع الرئيسي', 1.8);
            }
          } else if (sim.inSideBypass) {
            sim.inSideBypass = false;
            sim.laneOffset = Math.min(sim.laneOffset, 9.2);
          }
          if (inUTurnOpening && sim.laneOffset <= 0.65 && steer < -0.2 && sim.speedKmh >= 0) {
            initiateUTurn(sim.nearUTurnName!);
          } else if (sim.laneOffset <= 0.25 || sim.laneOffset >= maxRightEdge) {
            const hitLeft = sim.laneOffset <= 0.25;
            sim.laneOffset = hitLeft ? 0.38 : clampRightEdge;
            sim.tilt = hitLeft ? 0.14 : -0.14;
            if (motoDrivingNow && currentStunt !== 'none' && sim.speedKmh > 38) {
              syncHud();
              finishRun('فقدت توازنك أثناء الحركة الاستعراضية على الرصيف!', true);
              return;
            }
            if (sim.invulnerableTimer <= 0) {
              sim.invulnerableTimer = 0.65;
              sim.speedKmh = sim.speedKmh < 0 ? sim.speedKmh * 0.65 : Math.max(12, sim.speedKmh * 0.68);
              soundFX.playCrash();
              showToast(
                hitLeft
                  ? 'احتكيت بالجزيرة الوسطى! استخدم ملف الدوران للرجوع'
                  : districtHasSea
                    ? 'احتكيت برصيف البحر! خليك في الحارة'
                    : canUseSideBypass
                      ? 'احتكيت برصيف المحلات والقهاوي! خليك جوه الشارع الجانبي'
                      : 'احتكيت بالرصيف اليمين! خليك في الحارة',
                2.2,
              );
            }
          }
        } else {
          // Eastbound return carriageway (بحري ← المندرة): lanes [-9.38 .. -2.35], RIGHT side is -X!
          const onRightBridgeApproachNow = isOnRightBridgeApproach(sim.z);
          const onSidiGaberTurnNow = isOnSidiGaberTurnZone(sim.z);
          const rightBridgeHNow = getRightBridgeHeightAt(sim.z);

          let maxMedianEdge = -2.15;
          let clampMedianEdge = -2.35;
          let minRightEdge = -9.55;
          let clampRightEdge = -9.35;

          if (onRightBridgeApproachNow) {
            if (sim.onRightBridge) {
              // Riding on the elevated right-side flyover bridge on the return carriageway (-X)
              minRightEdge = -15.55;
              clampRightEdge = -15.32;
              if (rightBridgeHNow > 1.1) {
                // Keep vehicle safely inside bridge inner parapet while elevated
                maxMedianEdge = -9.95;
                clampMedianEdge = -10.15;
              } else if (sim.laneOffset > -9.45) {
                sim.onRightBridge = false;
                if (sim.z > rightBridgeCfg.bridgeEndZ - 22) {
                  showToast('🛣️ نزلت من الكوبري على الكورنيش — قدامك ملف يمين: اتجاه سيدي جابر ➔', 3.4);
                }
              }
            } else if (rightBridgeHNow <= 1.1) {
              // Smooth entry/exit ramp zone: steer RIGHT (-X) smoothly up onto the bridge!
              minRightEdge = -15.55;
              clampRightEdge = -15.32;
              if (sim.laneOffset < -9.95) {
                sim.onRightBridge = true;
                showToast('🌉 طلعت على كوبري الكورنيش اليمين — ينزلك على نفس الكورنيش!', 3.0);
              }
            }
          } else if (sim.onRightBridge) {
            sim.onRightBridge = false;
            showToast('🛣️ نزلت من الكوبري على الكورنيش — قدامك ملف يمين: اتجاه سيدي جابر ➔', 3.6);
            if (!onSidiGaberTurnNow) {
              sim.laneOffset = Math.max(sim.laneOffset, -9.2);
            }
          }

          if (onSidiGaberTurnNow) {
            // Wide paved right-turn junction ("ملف يمين • اتجاه سيدي جابر") on -X city side
            minRightEdge = -22.5;
            clampRightEdge = -21.8;
            if (!sim.inSidiGaberTurn && sim.laneOffset < -11.4) {
              sim.inSidiGaberTurn = true;
              showToast('↪️ ملف يمين · اتجاه سيدي جابر!', 3.2);
            } else if (sim.inSidiGaberTurn && sim.laneOffset > -9.4) {
              sim.inSidiGaberTurn = false;
            }
            if (sim.z > rightBridgeCfg.turnEndZ - 18 && sim.laneOffset < -9.3) {
              sim.laneOffset = Math.min(-9.2, sim.laneOffset + dt * 11.5);
            }
          } else if (sim.inSidiGaberTurn) {
            sim.inSidiGaberTurn = false;
            sim.laneOffset = Math.max(sim.laneOffset, -9.2);
          }

          if (inUTurnOpening && !sim.onRightBridge && sim.laneOffset >= -2.65 && steer < -0.2 && sim.speedKmh >= 0) {
            initiateUTurn(sim.nearUTurnName!);
          } else if (sim.laneOffset >= maxMedianEdge || sim.laneOffset <= minRightEdge) {
            const hitMedian = sim.laneOffset >= maxMedianEdge;
            sim.laneOffset = hitMedian ? clampMedianEdge : clampRightEdge;
            sim.tilt = hitMedian ? 0.14 : -0.14;
            if (motoDrivingNow && currentStunt !== 'none' && sim.speedKmh > 38) {
              syncHud();
              finishRun('فقدت توازنك أثناء الحركة الاستعراضية على الرصيف!', true);
              return;
            }
            if (sim.invulnerableTimer <= 0) {
              sim.invulnerableTimer = 0.65;
              sim.speedKmh = sim.speedKmh < 0 ? sim.speedKmh * 0.65 : Math.max(12, sim.speedKmh * 0.68);
              soundFX.playCrash();
              showToast(
                sim.onRightBridge
                  ? 'احتكيت بسور كوبري الكورنيش اليمين! خليك في حارة الكوبري'
                  : hitMedian
                    ? 'احتكيت بالجزيرة الوسطى! استخدم ملف الدوران للرجوع'
                    : onSidiGaberTurnNow
                      ? 'احتكيت برصيف ملف سيدي جابر اليمين!'
                      : 'احتكيت برصيف المحلات! خليك في الحارة',
                2.2,
              );
            }
          }
        }

        sim.z += sim.travelDir * mps * dt;
        // Prevent backing off the physical road boundaries while reversing
        if (sim.speedKmh < 0) {
          const minRoadZ = -(activeFinishM + 30);
          if (sim.z > 24) {
            sim.z = 24;
            sim.speedKmh = 0;
          } else if (sim.z < minRoadZ) {
            sim.z = minRoadZ;
            sim.speedKmh = 0;
          }
        }
        // Clamp softly at route ends and guide driver to turnaround U-turn!
        if (!isRaceMode && !isCheckpointMode && sim.speedKmh >= 0) {
          const startUtName = activeUTurnZones[0]?.name ?? 'ملف دوران بداية الطريق';
          const endUtName = activeUTurnZones[activeUTurnZones.length - 1]?.name ?? 'ملف دوران نهاية الطريق';
          const startLmName = activeLandmarks[0]?.name ?? 'بداية الخط';
          const endLmName = activeLandmarks[activeLandmarks.length - 1]?.name ?? 'نهاية الخط';
          const farTurnZ = -(activeFinishM - 15);
          if (sim.travelDir === 1 && sim.z > -18) {
            sim.z = -18;
            initiateUTurn(startUtName);
          } else if (sim.travelDir === -1 && sim.z < farTurnZ && isMotoDeliveryMode) {
            sim.z = farTurnZ;
            if (!sim.reachedMandara) {
              sim.reachedMandara = true;
              const endBonus = Math.round(75 * fareMultiplier);
              sim.earnings += endBonus;
              onInstantEarnRef.current?.(endBonus, false);
              const pts = addPoints(320);
              soundFX.playDropoff();
              showToast(`وصلت ${endLmName} (+${endBonus} ج.م · +${pts} نقطة) — بتلف وترجع لـ ${startLmName}!`, 4.0);
            }
            initiateUTurn(endUtName);
          }
        }
      }

      // Zone Street Name Banner Detection!
      const distMNow = Math.max(0, -sim.z);
      const curZone = activeStreetZones.find((z) => distMNow >= z.fromM && distMNow < z.toM);
      if (curZone && curZone.title !== sim.lastZoneTitle) {
        sim.lastZoneTitle = curZone.title;
        sim.streetBannerTimer = 3.4;
        setStreetBannerText(curZone.title);
      }

      // Red-light check (Police patrol & Police Chase immune to red lights when siren is on!)
      sim.signalWarning = null;
      for (const sig of signals) {
        const distAhead = sim.z - sig.z;
        if (distAhead > 0 && distAhead < 85) {
          sim.signalWarning = sig.state;
        }
        if (
          !((mode === 'police_patrol' || isCheckpointMode) && sirenActiveRef.current) &&
          !sig.violated &&
          prevZ > sig.z + 4 &&
          sim.z <= sig.z + 4 &&
          sig.state === 'red' &&
          sim.speedKmh > 18
        ) {
          sig.violated = true;
          soundFX.playWhistle();
          soundFX.playPoliceSiren();
          sim.earnings = Math.max(0, sim.earnings - 25);
          showToast('صفارة المرور! كسرت إشارة حمراء (-٢٥ ج.م مخالفة)', 3.2);
        }
        if (Math.abs(sim.z - sig.z) < 4.2) {
          for (const cp of sig.crossers) {
            if (!cp.rig.group.visible) continue;
            if (Math.abs(cp.laneOffset - sim.laneOffset) < 1.15 && Math.abs(sim.z - (sig.z + cp.zOffset)) < 2.2) {
              sim.speedKmh = Math.max(0, sim.speedKmh * 0.25);
              cp.laneOffset += cp.laneOffset >= sim.laneOffset ? 1.8 : -1.8;
              if (sim.invulnerableTimer <= 0) {
                sim.invulnerableTimer = 0.8;
                soundFX.playWhistle();
                showToast('حاسب المشاة عند الإشارة!', 2.4);
              }
            }
          }
        }
      }

      // Find closest trailing vehicle behind rider for live side mirror reflection hint
      let rearTrafficHint: { dist: number; side: number } | null = null;
      let closestRearDist = 65;
      for (const tc of sim.traffic) {
        if (tc.z > sim.z + 1.5 && tc.z < sim.z + closestRearDist) {
          closestRearDist = tc.z - sim.z;
          rearTrafficHint = {
            dist: closestRearDist,
            side: THREE.MathUtils.clamp((tc.laneOffset - sim.laneOffset) / 6, -1, 1),
          };
        }
      }

      const wheelSpin = (mps * dt) / 0.34;
      for (const w of activeDriveRig.wheels) {
        w.rotation.x -= wheelSpin;
      }
      activeDriveRig.animateVehicle?.(elapsed, dt, currentStunt, sirenActiveRef.current, steer, {
        throttle: (gasActive || isReversingNow) && !keys.down,
        braking: keys.down,
        speedKmh: absSpeedKmh,
        rpmRatio: sim.rpmRatio,
        gear: sim.gear,
        fuelPct: (sim.fuel / maxFuel) * 100,
        tilt: sim.tilt,
        noseDive: sim.noseDive,
        isPov: cameraModeRef.current === 'hood',
        atmosphere,
        rearTrafficHint,
      });

      const roadX = getRoadCenterX(sim.z);
      const roadY = getPlayerSurfaceHeightAt(sim.z, sim.laneOffset);
      const roadPitch = getPlayerSurfacePitchAt(sim.z, sim.laneOffset);
      const roadYaw = getRoadYawAt(sim.z);

      activeDriveRig.group.position.set(roadX + sim.laneOffset, roadY, sim.z);
      activeDriveRig.group.rotation.order = 'YXZ';
      activeDriveRig.group.rotation.set(
        (sim.travelDir === -1 ? 1 : -1) * roadPitch + sim.pitch,
        roadYaw + sim.headingOffset + sim.tilt * (motoDrivingNow ? 0.26 : 0.45),
        sim.tilt * (motoDrivingNow ? 0.96 : 0.42),
      );
      activeDriveRig.group.updateMatrixWorld();

      skyDome.position.set(roadX + sim.laneOffset, roadY, sim.z);
      sunLight.position.set(
        roadX + sim.laneOffset + (atmosphere === 'sunset' ? 88 : -45),
        roadY + (atmosphere === 'night' ? 62 : atmosphere === 'sunset' ? 22 : 70),
        sim.z + (atmosphere === 'sunset' ? -48 : 35),
      );
      sunLight.target.position.set(roadX + sim.laneOffset, roadY, sim.z - 25);

      if (overheadLampLight) {
        const lampSnapZ = Math.round((sim.z + sim.travelDir * 6) / 16) * 16;
        overheadLampLight.position.set(
          getRoadCenterX(lampSnapZ) + (sim.laneOffset >= 0 ? 4.4 : -4.4),
          getRoadHeightAt(lampSnapZ) + 6.2,
          lampSnapZ,
        );
      }
      if (overheadLampLightAhead) {
        const lampSnapAheadZ = Math.round((sim.z + sim.travelDir * 24) / 16) * 16;
        overheadLampLightAhead.position.set(
          getRoadCenterX(lampSnapAheadZ) + (sim.laneOffset >= 0 ? -2.2 : 2.2),
          getRoadHeightAt(lampSnapAheadZ) + 6.2,
          lampSnapAheadZ,
        );
      }

      // Police Motorcycle Pursuit Target Simulation ("مطاردة الهارب!")
      if (isCheckpointMode && sim.checkpointSubPhase === 'chase' && sim.chaseTarget) {
        if (sirenActiveRef.current) {
          sim.sirenTimer -= dt;
          if (sim.sirenTimer <= 0) {
            sim.sirenTimer = 1.65;
            soundFX.playPoliceSiren();
          }
        }
        const ct = sim.chaseTarget;
        ct.marker.rotation.y += dt * 4.5;
        ct.weaveTimer -= dt;
        if (ct.weaveTimer <= 0) {
          ct.weaveTimer = 1.3 + Math.random() * 1.4;
          ct.targetLaneOffset = FORWARD_LANE_XS[Math.floor(Math.random() * FORWARD_LANE_XS.length)];
        }
        ct.laneOffset = THREE.MathUtils.damp(ct.laneOffset, ct.targetLaneOffset, 3.2, dt);
        const ctMps = (ct.speedKmh / 3.6) * 1.45;
        ct.z -= ctMps * dt;
        ct.rig.group.position.set(getRoadCenterX(ct.z) + ct.laneOffset, getRoadHeightAt(ct.z), ct.z);
        ct.rig.group.rotation.y = getRoadYawAt(ct.z);
        ct.rig.group.rotation.x = -getRoadPitchAt(ct.z);
        ct.rig.animate?.(elapsed, ctMps);

        const gapM = sim.z - ct.z;
        const latGap = Math.abs(sim.laneOffset - ct.laneOffset);
        setFleeingInfoUi({
          plate: ct.plate,
          distM: Math.max(0, Math.round(gapM)),
          canIntercept: Math.abs(gapM) <= 18,
        });

        if (Math.abs(gapM) < 8.5 && latGap < 3.4) {
          sim.violationsStopped += 1;
          sim.pursuitsCompleted += 1;
          sim.checkpointProcessed += 1;
          const pts = addPoints(Math.round(250 * soloBonusMult));
          sim.earnings += 180;
          soundFX.playWhistle();
          soundFX.playPickup();
          showToast(
            `عاش يا بطل! قبضت على الهارب (${ct.plate}) (+${pts} نقطة · +١٨٠ ج.م) — راجع للكمين`,
            3.5,
          );
          returnToCheckpointDuty();
          syncHud();
          return;
        }
        if (gapM > 215 || sim.z < -MANDARA_FINISH_M) {
          sim.checkpointProcessed += 1;
          soundFX.playHorn();
          showToast(`الهارب (${ct.plate}) فلت! راجع للكمين لاستكمال الوردية`, 3.2);
          returnToCheckpointDuty();
          syncHud();
          return;
        }
      }

      // Animate glowing gas station refuel bay rings & handle pull-in auto-refuel
      if (sim.gasRefuelCooldown > 0) sim.gasRefuelCooldown -= dt;
      if (gasStationRings.length > 0) {
        const ringPulse = 1 + Math.sin(elapsed * 4.5) * 0.09;
        for (let r = 0; r < gasStationRings.length; r++) {
          gasStationRings[r].scale.set(ringPulse, ringPulse, 1);
        }
      }

      // Proximity check for right & left gas stations + automatic pull-in refueling
      if (!isCheckpointMode && !isUrbanCircuitTrack) {
        let nearestGs: (typeof activeGasStations)[number] | null = null;
        let nearestDist = Infinity;
        let aheadGs: (typeof activeGasStations)[number] | null = null;
        let aheadDist = Infinity;

        for (const gs of activeGasStations) {
          const d = Math.abs(gs.z - sim.z);
          if (d < nearestDist) {
            nearestDist = d;
            nearestGs = gs;
          }
          const deltaAlong = (gs.z - sim.z) * sim.travelDir;
          if (deltaAlong > 12 && deltaAlong < aheadDist) {
            aheadDist = deltaAlong;
            aheadGs = gs;
          }
        }

        const missingFracNow = Math.max(0, (maxFuel - sim.fuel) / maxFuel);
        const needsFuelNow = missingFracNow >= 0.05;

        // Pull into the gas station bay on RIGHT (+X) or LEFT (-X) and slow down -> auto pay & fill!
        if (
          nearestGs &&
          nearestDist <= 18 &&
          needsFuelNow &&
          !sim.outOfFuel &&
          sim.gasRefuelCooldown <= 0 &&
          sim.speedKmh <= 55
        ) {
          const inStationBay =
            nearestGs.side === 'right' ? sim.laneOffset >= 5.0 : sim.laneOffset <= -5.0;
          if (inStationBay) {
            executeGasRefuel(nearestGs.name, false);
          }
        }

        if (sim.hudAccum + dt >= (isMobileDevice ? 0.16 : 0.08)) {
          if (nearestGs && nearestDist <= 48 && !sim.outOfFuel) {
            const estCost = Math.max(
              GAS_MIN_REFUEL_COST,
              Math.round(missingFracNow * GAS_FULL_TANK_COST),
            );
            setNearGasStationUi({
              id: nearestGs.id,
              name: nearestGs.name,
              side: nearestGs.side,
              distM: Math.round(nearestDist),
              cost: estCost,
              canAfford: walletRef.current >= Math.min(GAS_MIN_REFUEL_COST, estCost),
              needsFuel: needsFuelNow,
            });
          } else {
            setNearGasStationUi(null);
          }

          if (sim.fuel / maxFuel <= 0.3 && !sim.outOfFuel && (!nearestGs || nearestDist > 48)) {
            const guideGs = aheadGs ?? nearestGs;
            if (guideGs) {
              setLowFuelGuideUi({
                stationName: guideGs.name,
                side: guideGs.side,
                distM: Math.round(aheadGs ? aheadDist : nearestDist),
              });
            }
          } else {
            setLowFuelGuideUi(null);
          }
        }
      }

      // Fuel Consumption (reduced by motorcycle Fuel Saver perk + Tank Upgrade!)
      if (!isCheckpointMode && !sim.outOfFuel) {
        const idleFactor = absSpeedKmh < 2 ? 0.12 : 1.0;
        const fuelBurn =
          (0.68 + (absSpeedKmh / maxSpeedKmh) * 0.82) *
          idleFactor *
          fuelSaverFactor *
          (1 - progress.upgrades.tank * 0.08);
        sim.fuel -= fuelBurn * dt;
        if (sim.fuel <= 0) {
          sim.fuel = 0;
          sim.outOfFuel = true;
          let closestGs = activeGasStations[0];
          let closestDist = Infinity;
          for (const gs of activeGasStations) {
            const d = Math.abs(gs.z - sim.z);
            if (d < closestDist) {
              closestDist = d;
              closestGs = gs;
            }
          }
          const isAtStation = closestDist <= 95;
          setOutOfFuelUi({
            stationName: closestGs.name,
            isAtStation,
            fullCost: isAtStation ? GAS_FULL_TANK_COST : GAS_DELIVERY_COST,
            wallet: walletRef.current,
          });
          setNearGasStationUi(null);
          setLowFuelGuideUi(null);
          soundFX.playBeep(300, 0.25, 0.18);
          syncHud();
        }
      }

      // Steady distance points while moving fast (both directions)
      if (sim.speedKmh >= 40 && Math.floor(Math.abs(prevZ) / 25) !== Math.floor(Math.abs(sim.z) / 25)) {
        addPoints(8);
      }

      // Landmarks, Lap Counters & Race / Mandara Finish
      const distM = Math.max(0, -sim.z);
      if (isRaceMode && activeTrack) {
        const curLap = Math.min(activeTrack.laps, 1 + Math.floor(distM / activeTrack.lapRenderM));
        if (curLap > sim.lastRaceLap) {
          sim.lastRaceLap = curLap;
          soundFX.playPickup();
          showToast(`اللفة ${curLap} من ${activeTrack.laps}`, 2.4);
        }
        if (!sim.reachedMandara && distM >= raceFinishM) {
          sim.reachedMandara = true;
          const finalPos = isPracticeSubMode
            ? 1
            : 1 + sim.traffic.filter((c) => c.isRacer && c.z < sim.z).length;
          const rawPrize = isPracticeSubMode
            ? 180
            : finalPos === 1
              ? 480
              : finalPos === 2
                ? 320
                : finalPos === 3
                  ? 220
                  : 140;
          const prize = Math.round(rawPrize * fareMultiplier);
          const pts = addPoints(isPracticeSubMode ? 260 : finalPos === 1 ? 700 : finalPos === 2 ? 480 : 300);
          sim.earnings += prize;
          onInstantEarnRef.current?.(prize, false);
          soundFX.playDropoff();
          syncHud();
          finishRun(
            isPracticeSubMode
              ? `أتممت التمرين الحر على ${activeTrack.name}! (+${pts} نقطة · +${prize} ج.م)`
              : finalPos === 1
                ? `المركز الأول! بطل ${activeTrack.name} (+${pts} نقطة · +${prize} ج.م)`
                : `أنهيت ${activeTrack.name} في المركز ${finalPos} (+${pts} نقطة · +${prize} ج.م)`,
            false,
            {
              raceTimeSec: sim.raceTimeSec,
              racePosition: finalPos,
              raceTrackId: activeTrack.id,
              raceSubMode: raceConfig?.subMode ?? 'race',
            },
          );
          return;
        }
      } else if (!isCheckpointMode) {
        if (!sim.reachedStanley && distM >= Math.abs(STANLEY_BRIDGE_Z)) {
          sim.reachedStanley = true;
          const stBonus = Math.round(45 * fareMultiplier);
          sim.earnings += stBonus;
          onInstantEarnRef.current?.(stBonus, false);
          const pts = addPoints(180);
          soundFX.playDropoff();
          showToast(`أهلاً بك على كوبري ستانلي الملوّن! (+${pts} نقطة · +${stBonus} ج.م)`, 4.0);
        }
        if (!isMotoDeliveryMode && !sim.reachedMandara && distM >= MANDARA_FINISH_M) {
          sim.reachedMandara = true;
          sim.earnings += 110;
          onInstantEarnRef.current?.(110, false);
          const pts = addPoints(450);
          soundFX.playDropoff();
          syncHud();
          finishRun(`ألف مبروك! انطلقت من المندرة ووصلت قلعة قايتباي ببحري بنجاح (+${pts} نقطة)`);
          return;
        }
      }

      // Mashrou3 Microbus Stops (load up to 14 passengers!)
      if (mode === 'mashrou3') {
        for (const st of mashrou3Stops) {
          if (st.loaded) continue;
          const dz = Math.abs(sim.z - st.z);
          if (dz < 11.5 && sim.laneOffset >= 5.0) {
            if (sim.speedKmh <= 62) {
              st.loaded = true;
              st.ring.visible = false;
              const addRiders = Math.min(14 - sim.passengersLoaded, st.count);
              sim.passengersLoaded += addRiders;
              sim.tripsCompleted += 1;
              const earned = addRiders * 8;
              sim.earnings += earned;
              const pts = addPoints(addRiders * 45);
              soundFX.playPickup();
              showToast(`ركب ${addRiders} ركاب في المشروع (${sim.passengersLoaded}/14) (+${pts} نقطة)`, 2.8);
            } else {
              showToast('هدّي على اليمين عند موقف المشروع عشان تحمّل الركاب!', 1.2);
            }
          }
        }
      }

      if (sim.hornWaveTime > 0) {
        sim.hornWaveTime -= dt;
        hornRing.visible = true;
        hornRing.position.set(roadX + sim.laneOffset, roadY + 0.25, sim.z);
        const p = 1 - sim.hornWaveTime / 0.42;
        hornRing.scale.setScalar(1 + p * 8);
        (hornRing.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
      } else {
        hornRing.visible = false;
      }

      // Motorcycle & Taxi Passenger Pickup / Drop-off System (works in BOTH Corniche directions "رايح جاي" + live daily revenue!)
      if (isMotoDeliveryMode && !isRaceMode && !isCheckpointMode) {
        const isTaxiVehicle = effectiveVehicleKind === 'taxi';

        // Animate taxi door briefly opening & closing after a passenger exits
        if (isTaxiVehicle && sim.taxiExitDoorTimer > 0) {
          sim.taxiExitDoorTimer = Math.max(0, sim.taxiExitDoorTimer - dt);
          if (!sim.waitingPassenger?.boarding) {
            const exitPhase = sim.taxiExitDoorTimer / 1.35;
            const exitOpen = Math.sin(exitPhase * Math.PI);
            playerRig?.setDoorOpen?.(sim.taxiExitDoorSide, exitOpen);
            if (sim.taxiExitDoorTimer <= 0.001) {
              playerRig?.setDoorOpen?.('none', 0);
            }
          }
        }

        if (sim.passenger) {
          const dropZ = sim.dropoffZ ?? sim.z;
          sim.passenger.destinationDistM = Math.max(0, Math.abs(dropZ - sim.z));
          sim.passenger.needsUTurn = (dropZ - sim.z) * sim.travelDir < -18;
          sim.passenger.patienceLeftSec -= dt;

          if (sim.dropoffZ !== null) {
            dropoffGroup.visible = true;
            const dropSideX = sim.travelDir === -1 ? FORWARD_LANE_XS[2] : ONCOMING_LANE_XS[0];
            sim.dropoffLaneX = dropSideX;
            dropoffGroup.position.set(
              getRoadCenterX(sim.dropoffZ) + dropSideX,
              getRoadHeightAt(sim.dropoffZ),
              sim.dropoffZ,
            );
            dropRing.rotation.z += dt * 1.8;

            const latClose = Math.abs(sim.laneOffset - dropSideX) < 3.6;
            const inDropZone = Math.abs(sim.z - sim.dropoffZ) < 13.5 && latClose;
            if (inDropZone) {
              if (Math.abs(sim.speedKmh) <= 72) {
                soundFX.playDropoff();
                sim.comboStreak = Math.min(4, sim.comboStreak + 1);
                sim.comboTimer = 26;
                const timeFrac = sim.passenger.patienceLeftSec / Math.max(1, sim.passenger.patienceMaxSec);
                const isFastVip = Boolean(sim.passenger.isVipRush && timeFrac >= 0.32);
                const baseTip = sim.passenger.patienceLeftSec > 20 ? 10 : 4;
                const comboBonus = Math.round(sim.passenger.baseFare * Math.max(0, sim.comboStreak - 1) * 0.12);
                const vipBonus = isFastVip ? Math.round(sim.passenger.baseFare * 0.45) : 0;
                const tip = Math.round(baseTip * fareMultiplier) + comboBonus + vipBonus;
                const earned = sim.passenger.baseFare + tip;
                sim.earnings += earned;
                sim.tripsCompleted += 1;
                sim.passengersLoaded = 0;
                sim.turboCharge = Math.min(100, sim.turboCharge + (isFastVip ? 60 : 35));

                // Launch an exciting 22-second Rush Hour wave every 3 deliveries!
                const triggeredRushHour = sim.tripsCompleted % 3 === 0;
                if (triggeredRushHour) {
                  sim.rushHourTimer = 22;
                }

                playerRig?.setPassengerSeated?.(false);
                if (isTaxiVehicle) {
                  sim.taxiExitDoorSide = 'right';
                  sim.taxiExitDoorTimer = 1.35;
                  soundFX.playBeep(460, 0.06, 0.11);
                }
                onInstantEarnRef.current?.(earned, true);
                const pts = addPoints((120 + earned) * Math.max(1, sim.comboStreak));
                const streakTxt = sim.comboStreak > 1 ? ` · 🔥 كومبو ×${sim.comboStreak}` : '';
                const rushTxt = triggeredRushHour ? ' · 🚨 بدأت ساعة الذروة!' : '';
                showToast(
                  isFastVip
                    ? `🔥 توصيل VIP صاروخي لـ ${sim.passenger.name}! (+${earned} ج.م مع بقشيش سريع · ⚡ تيربو مشحون${streakTxt}${rushTxt})`
                    : isTaxiVehicle
                      ? `نزل ${sim.passenger.name} عند ${sim.passenger.destinationName}! 🚕 (+${earned} ج.م${streakTxt}${rushTxt})`
                      : `نزل ${sim.passenger.name} عند ${sim.passenger.destinationName}! (+${earned} ج.م · +${pts} نقطة${streakTxt})`,
                  3.6,
                );
                sim.passenger = null;
                sim.dropoffZ = null;
                dropoffGroup.visible = false;
                sim.passengerSpawnCooldown = 0.9;
              } else {
                showToast('هدّي بالفرامل جنب العلامة الخضراء لتنزيل الراكب!', 1.2);
              }
            } else {
              const passedDrop =
                (sim.travelDir === -1 && sim.z < sim.dropoffZ - 38) ||
                (sim.travelDir === 1 && sim.z > sim.dropoffZ + 38);
              if (passedDrop && sim.toastTimer <= 0) {
                showToast(`لف من أقرب ملف دوران (U-Turn) راجع لـ ${sim.passenger.destinationName} ↩`, 2.4);
              }
            }
          }

          if (sim.passenger && sim.passenger.patienceLeftSec <= 0) {
            showToast(`${sim.passenger.name}: اتأخرنا أوي يا بطل! نزل هنا`, 2.6);
            sim.passenger = null;
            sim.passengersLoaded = 0;
            playerRig?.setPassengerSeated?.(false);
            if (isTaxiVehicle) {
              sim.taxiExitDoorSide = 'right';
              sim.taxiExitDoorTimer = 1.1;
            }
            sim.dropoffZ = null;
            dropoffGroup.visible = false;
            sim.passengerSpawnCooldown = 1.4;
          }
        } else if (!sim.waitingPassenger) {
          sim.passengerSpawnCooldown -= dt;
          if (sim.passengerSpawnCooldown <= 0) {
            spawnWaitingPassenger();
          }
        }

        if (sim.waitingPassenger) {
          const wp = sim.waitingPassenger;
          const distAhead = (wp.z - sim.z) * sim.travelDir;
          if (!wp.hailSoundPlayed && distAhead > 0 && distAhead < 58) {
            wp.hailSoundPlayed = true;
            soundFX.playPassengerHail();
            showToast(
              wp.isVipRush
                ? `🔥 زبون مستعجل (${wp.name}): "الحقني يا أسطى لـ ${wp.destinationName} وهتاخد بقشيش جامد!" (${wp.fare} ج.م)`
                : wp.needsUTurn
                  ? `🙋 ${wp.name} بينادي: "${wp.destinationName} يا أسطى!" (مشوار راجع ↩ · ${wp.fare} ج.م)`
                  : `🙋 ${wp.name} بينادي: "طالع ${wp.destinationName} لو سمحت!" (${wp.fare} ج.م)`,
              2.8,
            );
          }

          if (!wp.boarding) {
            const wave = Math.sin(elapsed * 7.2);
            wp.rig.rightArm.rotation.z = 2.45 + wave * 0.38;
            wp.rig.ringGroup.rotation.y += dt * 1.5;

            const latClose = Math.abs(sim.laneOffset - wp.laneX) < 3.6;
            const nearCurb = Math.abs(sim.z - wp.z) < 13.5 && latClose;
            if (nearCurb) {
              if (Math.abs(sim.speedKmh) <= 68) {
                wp.boarding = true;
                wp.rig.rightArm.rotation.z = 0;
                wp.rig.ringGroup.visible = false;
                soundFX.playPassengerHail();
              } else {
                showToast(
                  isTaxiVehicle
                    ? 'هدّي بالفرامل جنب الزبون عشان يفتح الباب ويركب التاكسي!'
                    : 'هدّي بالفرامل جنب الزبون عشان يركب وراك!',
                  1.2,
                );
              }
            } else if (distAhead < (isTaxiVehicle ? -48 : -28)) {
              scene.remove(wp.rig.group);
              sim.waitingPassenger = null;
              sim.passengerSpawnCooldown = 1.1;
            }
          } else if (isTaxiVehicle) {
            // Multi-stage visible Alexandria Taxi boarding:
            // 1) Passenger walks to curbside door & reaches for handle
            // 2) Taxi 3D door visibly swings wide open
            // 3) Passenger steps into the open cabin & sits visibly inside the passenger seat
            // 4) Door swings smoothly shut with a latch click!
            sim.speedKmh = THREE.MathUtils.clamp(sim.speedKmh, -3, 7);
            sim.taxiExitDoorTimer = 0;
            wp.boardProgress += dt * 0.72;
            const t = Math.min(1, wp.boardProgress);

            const doorSide: 'right' | 'left' =
              (wp.curbX - sim.laneOffset) * -sim.travelDir >= 0 ? 'right' : 'left';
            const sideSign = doorSide === 'right' ? (sim.travelDir === -1 ? 1 : -1) : sim.travelDir === -1 ? -1 : 1;
            const doorStandOff = sim.laneOffset + sideSign * 1.48;
            const seatOff = sim.laneOffset + sideSign * 0.42;

            const swing = Math.sin(elapsed * 11.5) * 0.65;
            if (t < 0.36) {
              // Stage 1: Walk from sidewalk right up to the taxi door & reach for handle
              const p = t / 0.36;
              const curOff = THREE.MathUtils.lerp(wp.curbX, doorStandOff, p);
              const curZ = THREE.MathUtils.lerp(wp.z, sim.z + (sim.travelDir === -1 ? 0.15 : -0.15), p);
              wp.rig.group.position.set(getRoadCenterX(curZ) + curOff, 0, curZ);
              wp.rig.personGroup.position.set(0, 0.12, 0);
              wp.rig.leftLeg.rotation.x = swing;
              wp.rig.rightLeg.rotation.x = -swing;
              wp.rig.leftArm.rotation.x = -swing * 0.6;
              wp.rig.rightArm.rotation.x = p > 0.62 ? -1.18 : swing * 0.6;
              playerRig?.setDoorOpen?.(doorSide, 0);
            } else if (t < 0.76) {
              // Stage 2: Taxi door swings wide open as passenger pulls handle & steps into the seat
              const openP = Math.min(1, (t - 0.36) / 0.18);
              const stepP = Math.max(0, (t - 0.48) / 0.28);
              if (!wp.doorOpenSoundPlayed) {
                wp.doorOpenSoundPlayed = true;
                soundFX.playBeep(520, 0.055, 0.12);
              }
              playerRig?.setDoorOpen?.(doorSide, openP);

              const curOff = THREE.MathUtils.lerp(doorStandOff, seatOff, stepP);
              const curY = THREE.MathUtils.lerp(0.12, -0.22, stepP);
              wp.rig.group.position.set(getRoadCenterX(sim.z) + curOff, 0, sim.z);
              wp.rig.personGroup.position.set(0, curY, 0);
              wp.rig.leftLeg.rotation.x = stepP > 0 ? Math.sin(stepP * Math.PI) * 0.55 : 0;
              wp.rig.rightLeg.rotation.x = stepP > 0 ? -Math.sin(stepP * Math.PI) * 0.55 : 0;
              wp.rig.rightArm.rotation.x = -1.05 * (1 - stepP);
              wp.rig.leftArm.rotation.x = -0.35 * stepP;
            } else {
              // Stage 3: Passenger is visibly seated inside the taxi cabin while door swings shut!
              wp.rig.personGroup.visible = false;
              playerRig?.setPassengerSeated?.(true, wp.shirtHex);
              const closeP = (t - 0.76) / 0.24;
              playerRig?.setDoorOpen?.(doorSide, Math.max(0, 1 - closeP));
              if (!wp.doorCloseSoundPlayed && closeP >= 0.85) {
                wp.doorCloseSoundPlayed = true;
                soundFX.playBeep(310, 0.065, 0.14);
              }
            }

            if (wp.boardProgress >= 1) {
              playerRig?.setDoorOpen?.('none', 0);
              soundFX.playPickup();
              const wrongDir = (wp.destinationZ - sim.z) * sim.travelDir < 0;
              const quote = wrongDir
                ? `لو سمحت يا أسطى لف من أقرب ملف دوران، رايحين ${wp.destinationName}!`
                : PASSENGER_QUOTES[Math.floor(Math.random() * PASSENGER_QUOTES.length)];
              const basePatience = Math.round((wp.isVipRush ? 52 : 70) - motoLevelFactor * 22);
              const maxPatience = Math.max(22, basePatience + patienceBonusSec + (wrongDir ? 16 : 0));
              sim.passenger = {
                name: wp.name,
                destinationId: wp.destinationId,
                destinationName: wp.destinationName,
                destinationDistM: Math.abs(wp.destinationZ - sim.z),
                baseFare: wp.fare,
                quote: wp.isVipRush ? `بسرعة يا أسطى مستعجل جداً على ${wp.destinationName}! 🔥` : quote,
                patienceMaxSec: maxPatience,
                patienceLeftSec: maxPatience,
                needsUTurn: wrongDir,
                isVipRush: wp.isVipRush,
              };
              sim.passengersLoaded = 1;
              sim.dropoffZ = wp.destinationZ;
              playerRig?.setPassengerSeated?.(true, wp.shirtHex);
              scene.remove(wp.rig.group);
              sim.waitingPassenger = null;
              showToast(
                wp.isVipRush
                  ? `🔥 مشوار VIP مستعجل! ${wp.name} ركب التاكسي — طير بيه على ${wp.destinationName} قبل الوقت ما يخلص!`
                  : wrongDir
                    ? `فتح الباب وقعد ${wp.name} في تاكسي الإسكندرية! 🚕 مشوار راجع ↩ لف لـ ${wp.destinationName} (${wp.fare} ج.م)`
                    : `فتح الباب وقعد ${wp.name} في تاكسي الإسكندرية! 🚕 وصّله ${wp.destinationName} (${wp.fare} ج.م)`,
                3.8,
              );
            }
          } else {
            wp.boardProgress += dt * 1.9;
            const t = Math.min(1, wp.boardProgress);
            const swing = Math.sin(elapsed * 12) * 0.7;
            wp.rig.leftLeg.rotation.x = swing;
            wp.rig.rightLeg.rotation.x = -swing;
            wp.rig.leftArm.rotation.x = -swing * 0.7;
            wp.rig.rightArm.rotation.x = swing * 0.7;

            const curOff = THREE.MathUtils.lerp(wp.curbX, sim.laneOffset + (wp.travelDir === -1 ? 0.6 : -0.6), t);
            const curZ = THREE.MathUtils.lerp(wp.z, sim.z, t);
            wp.rig.group.position.set(getRoadCenterX(curZ) + curOff, 0, curZ);
            wp.rig.personGroup.position.set(0, 0.1, 0);

            if (wp.boardProgress >= 1) {
              soundFX.playPickup();
              const wrongDir = (wp.destinationZ - sim.z) * sim.travelDir < 0;
              const quote = wrongDir
                ? `لو سمحت يا بطل لف من أقرب ملف دوران، رايحين ${wp.destinationName}!`
                : PASSENGER_QUOTES[Math.floor(Math.random() * PASSENGER_QUOTES.length)];
              const basePatience = Math.round((wp.isVipRush ? 52 : 70) - motoLevelFactor * 22);
              const maxPatience = Math.max(22, basePatience + patienceBonusSec + (wrongDir ? 16 : 0));
              sim.passenger = {
                name: wp.name,
                destinationId: wp.destinationId,
                destinationName: wp.destinationName,
                destinationDistM: Math.abs(wp.destinationZ - sim.z),
                baseFare: wp.fare,
                quote: wp.isVipRush ? `بسرعة يا بطل مستعجل جداً على ${wp.destinationName}! 🔥` : quote,
                patienceMaxSec: maxPatience,
                patienceLeftSec: maxPatience,
                needsUTurn: wrongDir,
                isVipRush: wp.isVipRush,
              };
              sim.passengersLoaded = 1;
              sim.dropoffZ = wp.destinationZ;
              playerRig?.setPassengerSeated?.(true, wp.shirtHex);
              scene.remove(wp.rig.group);
              sim.waitingPassenger = null;
              showToast(
                wp.isVipRush
                  ? `🔥 مشوار VIP مستعجل! ${wp.name} ركب وراك — طير على ${wp.destinationName}!`
                  : wrongDir
                    ? `ركب ${wp.name} وراك! مشوار راجع ↩ لف من ملف الدوران لـ ${wp.destinationName} (${wp.fare} ج.م)`
                    : `ركب ${wp.name} وراك — وصّله ${wp.destinationName} (${wp.fare} ج.م)`,
                3.8,
              );
            }
          }
        }
      }

      // Traffic AI + Near Miss Detection ("التغريز") + Easy-to-Hard & Rush Hour Density Scaling
      sim.trafficTimer -= dt;
      if (sim.trafficTimer <= 0) {
        if (!isPracticeSubMode || sim.traffic.length < 5) {
          spawnTraffic();
        }
        const rushBoost = sim.rushHourTimer > 0 ? 0.24 : 0;
        const deliveryInterval =
          (0.68 - motoLevelFactor * 0.42 - rushBoost) + Math.random() * (0.40 - motoLevelFactor * 0.22);
        sim.trafficTimer = isPracticeSubMode
          ? 1.45 + Math.random() * 0.9
          : mode === 'race'
            ? 0.65 + Math.random() * 0.55
            : Math.max(0.18, deliveryInterval);
      }

      let foundViolatorClose = false;
      const playerHalfW = motoDrivingNow ? 0.36 : 0.78;

      for (let i = sim.traffic.length - 1; i >= 0; i--) {
        const car = sim.traffic[i];
        if (car.kind !== 'cone') {
          let desiredSpeed = car.baseSpeedKmh;

          if (car.isRacer) {
            // Subtle pack rubber-banding so AI rivals stay competitive without teleporting
            const gapToPlayer = car.z - sim.z; // >0 means player is ahead of AI
            if (gapToPlayer > 48) {
              desiredSpeed = car.baseSpeedKmh * (raceDifficulty === 'pro' ? 1.18 : 1.1);
            } else if (gapToPlayer < -55) {
              desiredSpeed = car.baseSpeedKmh * (raceDifficulty === 'easy' ? 0.84 : 0.92);
            }
          } else if (!car.pulledOver) {
            for (const sig of signals) {
              if (sig.state === 'red' || sig.state === 'yellow') {
                const distToStop =
                  car.direction === -1 ? car.z - (sig.z + 5.0) : sig.z - 5.0 - car.z;
                if (distToStop > 0 && distToStop < 26) {
                  desiredSpeed = distToStop < 8 ? 0 : Math.min(desiredSpeed, distToStop * 1.8);
                }
              }
            }
          }

          for (const other of sim.traffic) {
            if (other.id === car.id || other.direction !== car.direction) continue;
            if (Math.abs(other.laneOffset - car.laneOffset) < 1.8) {
              const gap = car.direction === -1 ? car.z - other.z : other.z - car.z;
              if (gap > 0 && gap < 15) {
                desiredSpeed = gap < 6.5 ? 0 : Math.min(desiredSpeed, Math.max(0, other.speedKmh * 0.85));
              }
            }
          }
          car.speedKmh = THREE.MathUtils.damp(car.speedKmh, desiredSpeed, car.isRacer ? 3.2 : 4.5, dt);
        }

        const carMps = (car.speedKmh / 3.6) * 1.45;
        car.z += car.direction * carMps * dt;

        // Exciting Dynamic Alexandrian Traffic: Microbuses & Sedans occasionally cut lanes ahead of you!
        if (
          car.laneChangeTimer !== undefined &&
          car.laneChangeTimer < 50 &&
          !car.isRacer &&
          !car.pulledOver &&
          car.direction === sim.travelDir
        ) {
          car.laneChangeTimer -= dt;
          const distAheadOfPlayer = (car.z - sim.z) * sim.travelDir;
          if (car.laneChangeTimer <= 0 && distAheadOfPlayer > 22 && distAheadOfPlayer < 78) {
            car.laneChangeTimer = 99;
            const pool = car.direction === -1 ? FORWARD_LANE_XS : ONCOMING_LANE_XS;
            const altLanes = pool.filter((lx) => Math.abs(lx - car.laneOffset) > 1.8);
            if (altLanes.length > 0) {
              const chosen = altLanes[Math.floor(Math.random() * altLanes.length)];
              const laneClear = !sim.traffic.some(
                (o) => o.id !== car.id && Math.abs(o.laneOffset - chosen) < 1.9 && Math.abs(o.z - car.z) < 15,
              );
              if (laneClear) {
                car.targetLaneOffset = chosen;
                car.nudgedTimer = 1.65;
                soundFX.playBeep(440, 0.06, 0.08);
              }
            }
          }
        }

        if (car.nudgedTimer > 0) {
          car.nudgedTimer -= dt;
          car.laneOffset = THREE.MathUtils.damp(car.laneOffset, car.targetLaneOffset, 4.5, dt);
        }

        if (car.violatorMarker && car.violatorMarker.visible) {
          car.violatorMarker.rotation.y += dt * 4;
          if (!car.pulledOver && Math.abs(car.z - sim.z) < 30 && Math.abs(car.laneOffset - sim.laneOffset) < 4.5) {
            foundViolatorClose = true;
          }
        }

        const carRoadX = getRoadCenterX(car.z);
        const carYaw = getRoadYawAt(car.z);
        car.rig.group.position.set(carRoadX + car.laneOffset, getRoadHeightAt(car.z), car.z);
        car.rig.group.rotation.y = carYaw + (car.direction === 1 ? Math.PI : 0);
        if (car.kind !== 'cone') {
          car.rig.group.rotation.x = car.direction * -getRoadPitchAt(car.z);
        }
        car.rig.animate?.(elapsed, carMps);

        if (!car.soundPlayed && Math.abs(car.z - sim.z) < 26) {
          car.soundPlayed = true;
          const pan = THREE.MathUtils.clamp((car.laneOffset - sim.laneOffset) / 5.5, -0.95, 0.95);
          if (car.kind === 'hantour') soundFX.playHorseBell();
          else if (car.kind === 'police') soundFX.playPoliceSiren();
          else if (car.kind === 'motorcycle') soundFX.playMotoPass(pan);
          else if (car.kind !== 'cone') soundFX.playTrafficWhoosh(pan, car.direction === 1);
        }

        const latDist = Math.abs(car.laneOffset - sim.laneOffset);
        const zDist = Math.abs(car.z - sim.z);

        // Collision Check
        if (latDist < car.halfW + playerHalfW && zDist < car.halfL + 1.8) {
          if (motoDrivingNow && currentStunt !== 'none') {
            syncHud();
            finishRun('وقعت من على الموتوسيكل أثناء الحركة الاستعراضية!', true);
            return;
          }
          if (sim.invulnerableTimer <= 0) {
            sim.invulnerableTimer = 0.85;
            sim.speedKmh = sim.speedKmh < 0 ? sim.speedKmh * 0.42 : Math.max(8, sim.speedKmh * (0.42 - motoLevelFactor * 0.08));
            const crashDmg = 12 + Math.round(motoLevelFactor * 10);
            sim.health = Math.max(20, sim.health - crashDmg);
            sim.comboStreak = 0;
            sim.comboTimer = 0;
            sim.turboActive = false;
            sim.shakeTimer = 0.38;
            sim.shakeIntensity = 0.34;
            const pushDir = sim.laneOffset >= car.laneOffset ? 1 : -1;
            const minLane = sim.travelDir === -1 ? 0.38 : -9.35;
            const maxLane = sim.travelDir === -1 ? (isSideBypassAtZ(sim.z) ? 15.72 : 9.35) : -2.35;
            sim.laneOffset = THREE.MathUtils.clamp(sim.laneOffset + pushDir * 1.15, minLane, maxLane);
            sim.tilt = -pushDir * 0.18;
            soundFX.playCrash();
            soundFX.playHorn();
            if (sim.passenger) {
              const patiencePenalty = 4 + Math.round(motoLevelFactor * 5);
              sim.passenger.patienceLeftSec = Math.max(1, sim.passenger.patienceLeftSec - patiencePenalty);
              showToast(`💥 خبطة! الزبون اتعصب (-${patiencePenalty} ث صبر) واتكسر الكومبو!`, 2.2);
            } else {
              showToast('💥 خبطة! اتكسر الكومبو — ركّز وكمّل!', 2.0);
            }
          }

          if (car.kind === 'cone') {
            scene.remove(car.rig.group);
            sim.traffic.splice(i, 1);
            continue;
          } else {
            car.z += sim.travelDir * 3.2;
            car.nudgedTimer = 0.9;
            car.targetLaneOffset = THREE.MathUtils.clamp(
              car.laneOffset + (car.laneOffset >= sim.laneOffset ? 1.4 : -1.4),
              car.direction === -1 ? 0.8 : -8.6,
              car.direction === -1 ? 8.6 : -2.8,
            );
          }
        } else if (
          !car.nearMissed &&
          car.kind !== 'cone' &&
          sim.speedKmh >= 42 &&
          zDist < car.halfL + 1.4 &&
          latDist < car.halfW + playerHalfW + 1.15
        ) {
          // Exciting Near Miss / التغريز -> charges Turbo + builds Combo Streak!
          car.nearMissed = true;
          sim.nearMisses += 1;
          sim.comboStreak = Math.min(4, sim.comboStreak + 1);
          sim.comboTimer = 14;
          sim.turboCharge = Math.min(100, sim.turboCharge + 22);
          const rushMult = sim.rushHourTimer > 0 ? 1.4 : 1.0;
          const pts = addPoints(Math.round(35 * nearMissMult * sim.comboStreak));
          const cashBonus = Math.max(4, Math.round(6 * nearMissMult * rushMult + (sim.comboStreak - 1) * 2));
          sim.earnings += cashBonus;
          onInstantEarnRef.current?.(cashBonus, false);
          soundFX.playMotoPass();
          showToast(
            sim.comboStreak > 1
              ? `🔥 تغريزة نارية ×${sim.comboStreak}! (+${cashBonus} ج.م · ⚡ +٢٢٪ تيربو)`
              : `⚡ تغريزة قريبة! (+${cashBonus} ج.م · +${pts} نقطة · شحن تيربو)`,
            1.6,
          );
        }

        const relZ = (car.z - sim.z) * sim.travelDir;
        if (!car.isRacer && (relZ < -65 || relZ > 280)) {
          scene.remove(car.rig.group);
          sim.traffic.splice(i, 1);
        }
      }
      if (mode === 'police_patrol') {
        setCanStopViolator(foundViolatorClose);
      }

      // Pickups
      sim.pickupTimer -= dt;
      if (sim.pickupTimer <= 0) {
        spawnPickup();
        sim.pickupTimer = 3.2 + Math.random() * 2.4;
      }

      for (let i = sim.pickups.length - 1; i >= 0; i--) {
        const item = sim.pickups[i];
        item.mesh.rotation.y += dt * 2.2;
        item.mesh.position.set(getRoadCenterX(item.z) + item.laneOffset, getRoadHeightAt(item.z), item.z);
        if (Math.abs(item.laneOffset - sim.laneOffset) < 1.75 && Math.abs(item.z - sim.z) < 2.6) {
          if (item.kind === 'fuel') {
            sim.fuel = Math.min(maxFuel, sim.fuel + 36);
            soundFX.playFuel();
            showToast('فوّلت بنزين! (+٣٦٪)');
          } else {
            const coinVal = Math.max(8, Math.round(12 * fareMultiplier));
            sim.earnings += coinVal;
            sim.turboCharge = Math.min(100, sim.turboCharge + 18);
            onInstantEarnRef.current?.(coinVal, false);
            const pts = addPoints(40);
            soundFX.playPickup();
            showToast(`عملة ذهبية! (+${coinVal} ج.م · ⚡ +١٨٪ تيربو · +${pts} نقطة)`);
          }
          scene.remove(item.mesh);
          sim.pickups.splice(i, 1);
          continue;
        }
        if ((item.z - sim.z) * sim.travelDir < -35) {
          scene.remove(item.mesh);
          sim.pickups.splice(i, 1);
        }
      }

      // Animate custom Alexandria district landmarks (Abu Qir elevated trains, Victoria tram, Anfoushi boats & lighthouse)
      districtEnv?.update(dt, elapsed, sim.z);

      sim.hudAccum += dt;
      if (sim.hudAccum >= (isMobileDevice ? 0.16 : 0.08)) {
        sim.hudAccum = 0;
        syncHud();
      }
    };

    const updateCamera = (dt: number) => {
      if (isCheckpointMode && sim.checkpointSubPhase === 'duty') {
        const rx = getRoadCenterX(sim.officerZ);
        const ry = getRoadHeightAt(sim.officerZ);
        const isPovNow = cameraModeRef.current === 'hood';
        if (officerRig) officerRig.group.visible = !isPovNow;
        if (officerPovRig) officerPovRig.group.visible = isPovNow;

        const waitingCar = sim.checkpointCars.find((c) => c.state === 'waiting') ?? null;

        if (isPovNow) {
          const breatheY = Math.sin(clock.elapsedTime * 2.2) * 0.008;
          camera.position.set(rx + sim.laneOffset, ry + 1.64 + breatheY, sim.officerZ);
          if (waitingCar) {
            const lookTargetZ =
              sim.trunkPeekTimer > 0
                ? waitingCar.z + 1.95
                : waitingCar.inspection.vehicleKind === 'microbus'
                  ? waitingCar.z - 1.25
                  : waitingCar.z - 0.22;
            const lookTargetY =
              sim.trunkPeekTimer > 0
                ? getRoadHeightAt(waitingCar.z) + 0.85
                : waitingCar.inspection.vehicleKind === 'microbus'
                  ? getRoadHeightAt(waitingCar.z) + 1.42
                  : waitingCar.inspection.vehicleKind === 'motorcycle'
                    ? getRoadHeightAt(waitingCar.z) + 1.38
                    : getRoadHeightAt(waitingCar.z) + 1.16;
            _camLookAt.set(
              getRoadCenterX(waitingCar.z) + waitingCar.laneOffset - 0.28,
              lookTargetY,
              lookTargetZ,
            );
            camera.lookAt(_camLookAt);
          } else {
            camera.lookAt(
              getRoadCenterX(sim.z + 32) + 4.8,
              getRoadHeightAt(sim.z + 32) + 1.25,
              sim.z + 32,
            );
          }
        } else {
          _camTargetPos.set(rx + sim.laneOffset - 1.2, ry + 2.8, sim.officerZ - 6.8);
          _camLookAt.set(rx + 4.5, ry + 1.4, sim.z + 34);
          camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
          camera.lookAt(_camLookAt);
        }
        return;
      }

      if (officerRig) officerRig.group.visible = false;
      if (officerPovRig) officerPovRig.group.visible = false;

      const activeDriveRig = isCheckpointMode ? policeChaseRig : playerRig;
      const motoViewNow = isMotoMode || (isCheckpointMode && sim.checkpointSubPhase === 'chase');

      const modeNow = cameraModeRef.current;
      const speedRatio = Math.min(1, Math.abs(sim.speedKmh) / maxSpeedKmh);
      const turboFovBoost = sim.turboActive ? 11 : 0;
      // On ultra-wide Android landscape phones (20:9+), gently open vertical FOV so sky & road framing matches Laptop 16:9
      const mobileLandscapeFovBoost =
        isMobileDevice && camera.aspect > 1.85 ? Math.min(6, (camera.aspect - 1.78) * 10) : 0;
      const targetFov =
        (modeNow === 'hood' ? 74 + speedRatio * 10 : 62 + speedRatio * 9) +
        turboFovBoost +
        mobileLandscapeFovBoost;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
        camera.updateProjectionMatrix();
      }

      const elapsedShake = clock.elapsedTime;
      const shakeMag =
        sim.shakeTimer > 0
          ? (sim.shakeTimer / 0.38) * sim.shakeIntensity
          : sim.turboActive
            ? 0.055
            : 0;
      const shakeX = shakeMag > 0 ? Math.sin(elapsedShake * 54) * shakeMag : 0;
      const shakeY = shakeMag > 0 ? Math.cos(elapsedShake * 63) * shakeMag * 0.72 : 0;

      const roadX = getRoadCenterX(sim.z);
      const roadY = getPlayerSurfaceHeightAt(sim.z, sim.laneOffset);
      const yaw = getRoadYawAt(sim.z) + sim.headingOffset;
      const fwdX = -Math.sin(yaw);
      const fwdZ = -Math.cos(yaw);
      const aheadZ = sim.z + fwdZ * 24;
      const aheadX = getRoadCenterX(aheadZ) + sim.laneOffset * 0.9 + fwdX * 4;
      const aheadRoadY = getPlayerSurfaceHeightAt(aheadZ, sim.laneOffset);

      if (modeNow === 'hood') {
        const elapsedNow = clock.elapsedTime;
        // Authentic speed-reactive head bobbing & asphalt micro-vibration
        const roadVibX = Math.sin(elapsedNow * 34) * 0.004 * speedRatio + shakeX * 0.45;
        const roadVibY =
          Math.sin(elapsedNow * (7.5 + speedRatio * 10)) * 0.011 * speedRatio +
          Math.cos(elapsedNow * 27) * 0.0035 * speedRatio +
          shakeY * 0.45;

        if (motoViewNow && activeDriveRig) {
          // Exact Rider Eye-Level Position behind handlebars, gauges, mirrors & arms
          _povLocalEye.set(roadVibX, 1.31 + roadVibY + sim.noseDive * 0.9, 0.06);
          activeDriveRig.group.localToWorld(_povLocalEye);
          camera.position.copy(_povLocalEye);

          const wheelieLift = activeStuntRef.current === 'wheelie' ? 3.2 : 0;
          const lookZ = sim.z + fwdZ * 38;
          _camLookAt.set(
            roadX + sim.laneOffset + fwdX * 38 + sim.steerSmooth * 2.1 * (-sim.travelDir),
            getRoadHeightAt(lookZ) + 1.12 + wheelieLift + sim.noseDive * 4.5,
            lookZ,
          );
          camera.lookAt(_camLookAt);
          // Realistic motorcycle lean horizon tilt!
          camera.rotateZ(-sim.tilt * 0.62);
        } else if (activeDriveRig) {
          // Cockpit / Windshield Eye-Level aligned with car steering wheel, gauges & rearview mirror
          const carEyeX = effectiveVehicleKind === 'mashrou3' ? -0.44 : -0.34;
          const carEyeY = effectiveVehicleKind === 'mashrou3' ? 1.82 : 1.38;
          const carEyeZ = effectiveVehicleKind === 'mashrou3' ? -1.16 : -0.32;
          _povLocalEye.set(carEyeX + roadVibX, carEyeY + roadVibY + sim.noseDive * 0.6, carEyeZ);
          activeDriveRig.group.localToWorld(_povLocalEye);
          camera.position.copy(_povLocalEye);
          const lookZ = sim.z + fwdZ * 40;
          _camLookAt.set(
            roadX + sim.laneOffset + fwdX * 40 + sim.steerSmooth * 1.8 * (-sim.travelDir),
            getRoadHeightAt(lookZ) + 1.25 + sim.noseDive * 3.5,
            lookZ,
          );
          camera.lookAt(_camLookAt);
          camera.rotateZ(-sim.tilt * 0.25);
        }
        return;
      } else if (modeNow === 'aerial') {
        _camTargetPos.set(
          roadX + sim.laneOffset * 0.8 - fwdX * 16 + shakeX,
          roadY + 11.8 + shakeY,
          sim.z - fwdZ * 16,
        );
        _camLookAt.set(aheadX, aheadRoadY + 1.2, aheadZ);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 8, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 8, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 14, dt);
      } else {
        const distBack = (motoViewNow ? 6.8 : 9.2) + (sim.turboActive ? 0.9 : 0);
        const heightBack = motoViewNow ? 3.2 : 4.3;
        const backX = roadX + sim.laneOffset * 0.96 - fwdX * distBack + shakeX;
        const backZ = sim.z - fwdZ * distBack;
        _camTargetPos.set(backX, roadY + heightBack + shakeY, backZ);
        _camLookAt.set(roadX + sim.laneOffset * 0.94 + fwdX * 22, aheadRoadY + 1.3, sim.z + fwdZ * 22);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 9, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 9, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 18, dt);
      }
      camera.lookAt(_camLookAt);
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    let mirrorFrame = 0;
    const renderLiveMirror = () => {
      const activeMirrorRig = isCheckpointMode ? policeChaseRig : playerRig;
      const mirrorMoto = isMotoMode || (isCheckpointMode && sim.checkpointSubPhase === 'chase');
      if (!mirrorRT || !mirrorCam || !activeMirrorRig || (isCheckpointMode && sim.checkpointSubPhase === 'duty')) {
        return;
      }
      const isHood = cameraModeRef.current === 'hood';
      activeMirrorRig.setMirrorTexture?.(isHood ? mirrorRT.texture : null);
      if (!isHood || gameStateRef.current !== 'PLAYING') return;
      mirrorFrame = (mirrorFrame + 1) & 1;
      if (mirrorFrame !== 0) return;

      _mirrorPos.set(
        0,
        mirrorMoto ? 1.24 : effectiveVehicleKind === 'mashrou3' ? 1.94 : 1.42,
        mirrorMoto ? -0.35 : effectiveVehicleKind === 'mashrou3' ? -1.4 : -0.6,
      );
      activeMirrorRig.group.localToWorld(_mirrorPos);
      mirrorCam.position.copy(_mirrorPos);

      const rearZ = sim.z - sim.travelDir * 45;
      _mirrorLookTarget.set(
        getRoadCenterX(rearZ) + sim.laneOffset,
        getRoadHeightAt(rearZ) + 1.15,
        rearZ,
      );
      mirrorCam.lookAt(_mirrorLookTarget);

      activeMirrorRig.group.visible = false;
      renderer.setRenderTarget(mirrorRT);
      renderer.render(scene, mirrorCam);
      renderer.setRenderTarget(null);
      activeMirrorRig.group.visible = true;
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      stepSimulation(dt);
      updateCamera(dt);
      renderLiveMirror();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      soundFX.stopSeaAmbience();
      soundFX.stopEngineLoop();
      if (orientResizeTimer !== null) window.clearTimeout(orientResizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      disposeObject3D(scene);
      districtEnv?.dispose();
      treeBundle.dispose();
      modelFactory.dispose();
      envRenderTarget?.dispose();
      mirrorRT?.dispose();
      roadTex.dispose();
      roadRoughTex.dispose();
      roadNormalTex.dispose();
      sidewalkTex.dispose();
      yellowBlackCurbTex.dispose();
      seaTex.dispose();
      shoreFoamTex.dispose();
      corniStoneTex.dispose();
      facadeTextures.forEach((t) => t.dispose());
      windowGlowTextures.forEach((t) => t.dispose());
      extraTexturesToDispose.forEach((t) => t.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    runId,
    mode,
    playerVehicleKind,
    riderStyle,
    atmosphere,
    progress.taxiLevel,
    progress.selectedDistrictId,
    progress.selectedMotoId,
    progress.upgrades.brakes,
    progress.upgrades.engine,
    progress.upgrades.tank,
    raceConfig?.trackId,
    raceConfig?.bikeId,
    raceConfig?.subMode,
    raceConfig?.difficulty,
    raceConfig?.graphicsQuality,
    checkpointConfig?.teamMode,
    checkpointConfig?.graphicsQuality,
  ]);

  // Joystick pointer handlers
  const handleJoyStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    soundFX.startSeaAmbience();
    const rect = e.currentTarget.getBoundingClientRect();
    joyCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      r: rect.width / 2 - 12,
    };
    joyPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    updateJoyFromPoint(e.clientX, e.clientY);
  };

  const updateJoyFromPoint = (clientX: number, clientY: number) => {
    const { x: cx, y: cy, r } = joyCenterRef.current;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = Math.max(16, r);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 2 ? (Math.cos(angle) * clampedDist) / maxR : 0;
    const ny = dist > 2 ? (Math.sin(angle) * clampedDist) / maxR : 0;
    analogSteerRef.current = nx;
    setJoyKnob({ x: nx, y: ny });
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateJoyFromPoint(e.clientX, e.clientY);
  };

  const handleJoyEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== e.pointerId) return;
    joyPointerIdRef.current = null;
    analogSteerRef.current = 0;
    setJoyKnob({ x: 0, y: 0 });
  };

  const toggleStunt = (stunt: Exclude<StuntType, 'none'>) => {
    soundFX.startSeaAmbience();
    const next = activeStuntRef.current === stunt ? 'none' : stunt;
    activeStuntRef.current = next;
    setActiveStuntUi(next);
  };

  const toggleSiren = () => {
    soundFX.startSeaAmbience();
    const next = !sirenActiveRef.current;
    sirenActiveRef.current = next;
    setSirenUi(next);
    if (next) soundFX.playPoliceSiren();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-transparent touch-control">
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Dynamic High-Speed Wind Lines & Edge Motion Blur Overlay */}
      <div
        ref={windOverlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] transition-opacity duration-75"
        style={{
          opacity: 0,
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0) 56%, rgba(186,230,253,0.12) 84%, rgba(15,23,42,0.42) 100%), repeating-conic-gradient(from 0deg at 50% 48%, rgba(255,255,255,0.08) 0deg 1.1deg, transparent 1.1deg 8deg)',
          maskImage: 'radial-gradient(ellipse at center, transparent 48%, black 92%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 48%, black 92%)',
        }}
      />

      {/* Minimal transparent U-Turn tap trigger only when right next to a U-turn (no text bar on screen) */}
      {nearUTurnUi && nearUTurnUi.distM <= 32 && mode !== 'race' && mode !== 'traffic_officer' && gameState === 'PLAYING' && !outOfFuelUi && (
        <button
          type="button"
          aria-label="دوران للخلف"
          onPointerDown={(e) => {
            e.preventDefault();
            uturnTriggerRef.current();
          }}
          className="absolute top-1/2 -translate-y-1/2 right-2 z-20 w-9 h-9 rounded-full bg-transparent active:bg-white/25 active:scale-95 border border-white/45 text-white text-sm font-black flex items-center justify-center transition-transform touch-control [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
          style={{ right: 'max(0.5rem, env(safe-area-inset-right))' }}
        >
          <span aria-hidden="true">↩</span>
        </button>
      )}

      {/* Interactive Gas Station Pull-In Refuel Button — transparent white floating on right edge */}
      {nearGasStationUi && mode !== 'traffic_officer' && gameState === 'PLAYING' && !outOfFuelUi && (
        <div
          className="absolute top-[36%] right-2 z-20 flex flex-col items-end gap-0.5 touch-control"
          style={{ right: 'max(0.5rem, env(safe-area-inset-right))' }}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              soundFX.startSeaAmbience();
              refuelTriggerRef.current();
            }}
            className="min-h-[28px] px-2.5 py-1 rounded-xl border border-white/50 bg-transparent active:bg-white/25 text-white text-[10px] sm:text-xs font-extrabold flex items-center gap-1 transition-transform active:scale-95 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]"
          >
            <span aria-hidden="true">⛽</span>
            <span>
              {nearGasStationUi.needsFuel
                ? `فوّل (-${nearGasStationUi.cost}ج)`
                : 'مليان ١٠٠٪'}
            </span>
          </button>
        </div>
      )}

      {/* Out of Fuel Pay-to-Refuel Interactive Modal ("لما البنزين يخلص يدفع فلوس ويفول") */}
      {outOfFuelUi && gameState === 'PLAYING' && (
        <div className="absolute inset-0 z-30 bg-slate-950/65 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0B1320]/85 border-2 border-emerald-400 p-5 text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">⛽</div>
            <div>
              <h3 className="text-xl font-black text-amber-300">البنزين خلص!</h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                {outOfFuelUi.isAtStation
                  ? `أنت أمام ${outOfFuelUi.stationName} — ادفع وفوّل التانك وكمل مشوارك فوراً.`
                  : `أقرب محطة: ${outOfFuelUi.stationName} — تقدر تطلب تفويل فوري وتدفع وتكمل الطريق!`}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-white/10 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-slate-300">رصيد محفظتك الحالي:</span>
              <span className="text-emerald-400 font-mono text-base">{progress.wallet} ج.م</span>
            </div>
            <div className="space-y-2.5">
              {progress.wallet >= outOfFuelUi.fullCost ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    emergencyRefuelTriggerRef.current();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 font-black text-sm sm:text-base transition-transform"
                >
                  ⛽ ادفع {outOfFuelUi.fullCost} ج.م وفوّل التانك ١٠٠٪
                </button>
              ) : progress.wallet >= 25 ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    emergencyRefuelTriggerRef.current();
                  }}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-sm sm:text-base transition-transform"
                >
                  ⛽ ادفع رصيدك ({progress.wallet} ج.م) وفوّل جزئي
                </button>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-400/50 text-rose-200 text-xs font-bold">
                  رصيدك أقل من ٢٥ ج.م — أنهي المشوار وابدأ من جديد لتجميع فلوس من الزباين.
                </div>
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  giveUpOutOfFuelTriggerRef.current();
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs sm:text-sm"
              >
                إنهاء المشوار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Starting Grid 3 - 2 - 1 - انطلق! Pure Transparent Countdown Overlay */}
      {countdownUi && gameState === 'PLAYING' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            className={`px-6 py-3 bg-transparent text-center transition-transform [text-shadow:0_2px_12px_rgba(0,0,0,0.98),0_0_22px_rgba(0,0,0,0.9)] ${
              countdownUi === 'انطلق!'
                ? 'text-emerald-300 scale-110'
                : 'text-[#ffd700]'
            }`}
          >
            <div className="text-6xl sm:text-8xl font-black tracking-tight tabular-nums">
              {countdownUi}
            </div>
            {countdownUi !== 'انطلق!' && (
              <div className="text-xs sm:text-sm font-black text-white/95 mt-1">
                استعد على خط البداية
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zero extra second-line banners below top HUD — sky remains 100% open */}

      {/* LEFT Side Pure Transparent Motorcycle Stunt Buttons */}
      {isMotoMode && gameState === 'PLAYING' && (
        <div
          dir="ltr"
          className="landscape-stunts absolute left-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 sm:gap-1.5 touch-control"
          style={{ paddingLeft: 'env(safe-area-inset-left)' }}
        >
          {stuntComboUi > 1 && (
            <div className="px-1.5 py-0.5 rounded bg-transparent text-yellow-300 font-black text-[11px] text-center [text-shadow:0_1px_4px_rgba(0,0,0,0.98)]">
              x{stuntComboUi}
            </div>
          )}
          {STUNT_ITEMS.map((item) => {
            const active = activeStuntUi === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  toggleStunt(item.id);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`touch-control min-h-[32px] min-w-[62px] sm:min-w-[70px] px-2 py-1 rounded-lg border text-[11px] font-extrabold transition-transform active:scale-95 [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                  active
                    ? 'bg-yellow-400/35 text-yellow-100 border-yellow-300/85'
                    : 'bg-transparent text-white/95 border-white/35 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B121C]/85 text-white p-6 text-center z-30">
          <div className="space-y-2">
            <div className="text-lg font-bold">جاري استعادة عرض ثلاثي الأبعاد...</div>
            <p className="text-sm text-slate-300">يرجى الانتظار لحظة لاستقرار الرسوميات.</p>
          </div>
        </div>
      )}

      {/* Portrait & Landscape Multi-Touch Mobile Controls Overlay — 100% Transparent & Lightweight for Android */}
      {(mode !== 'traffic_officer' || checkpointSubPhaseUi === 'chase') && (
        <div
          dir="ltr"
          className="landscape-compact-controls pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 sm:gap-4 px-2.5 pb-2.5 sm:px-5 sm:pb-3"
          style={{
            paddingLeft: 'max(0.55rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.55rem, env(safe-area-inset-right))',
            paddingBottom: 'max(0.55rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Left Thumb Zone: Horn + Headlight Toggle + Steering (Transparent outline buttons) */}
          <div className="pointer-events-auto flex flex-col items-start gap-1.5 touch-control">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundFX.startSeaAmbience();
                  hornTriggerRef.current();
                }}
                onContextMenu={(e) => e.preventDefault()}
                className="ctrl-small-btn touch-control min-h-[34px] min-w-[62px] sm:min-w-[72px] px-2.5 py-1 rounded-xl bg-amber-400/15 active:bg-amber-400/45 active:scale-95 text-amber-200 font-extrabold text-[11px] sm:text-xs border border-amber-300/65 transition-transform [text-shadow:0_1px_3px_rgba(0,0,0,0.98)]"
              >
                كلاكس
              </button>
              <button
                type="button"
                aria-label="زر إضاءة الكشافات"
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundFX.startSeaAmbience();
                  headlightToggleTriggerRef.current();
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`ctrl-small-btn touch-control min-h-[34px] px-2.5 py-1 rounded-xl font-extrabold text-[11px] sm:text-xs border transition-transform active:scale-95 flex items-center gap-1 [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                  headlightMode === 'high'
                    ? 'bg-yellow-300/30 text-yellow-100 border-yellow-200/85'
                    : headlightMode === 'low'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-300/70'
                      : 'bg-transparent text-white/90 border-white/35'
                }`}
              >
                <span aria-hidden="true">💡</span>
                <span>
                  {headlightMode === 'high'
                    ? 'عالي'
                    : headlightMode === 'low'
                      ? 'واطي'
                      : 'نور'}
                </span>
              </button>
            </div>

            {controlSettings.steering === 'joystick' ? (
              <div
                onPointerDown={handleJoyStart}
                onPointerMove={handleJoyMove}
                onPointerUp={handleJoyEnd}
                onPointerCancel={handleJoyEnd}
                onContextMenu={(e) => e.preventDefault()}
                className="touch-control relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-transparent border-2 border-yellow-400/55 flex items-center justify-center"
              >
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400/40 border-2 border-white/75 pointer-events-none"
                  style={{
                    transform: `translate(${joyKnob.x * 26}px, ${joyKnob.y * 15}px)`,
                  }}
                />
              </div>
            ) : controlSettings.steering === 'tilt' ? (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    tiltZeroRef.current = null;
                  }}
                  className="ctrl-small-btn px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-200 text-[10px] font-extrabold border border-sky-300/60 [text-shadow:0_1px_3px_rgba(0,0,0,0.98)]"
                >
                  ضبط الميل
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="توجيه شمال"
                    {...makeTouchHandlers('left')}
                    className="ctrl-drive-btn touch-control min-h-[44px] min-w-[52px] px-2.5 rounded-xl border bg-transparent active:bg-amber-400/35 text-white border-white/40 text-xs font-extrabold [text-shadow:0_1px_3px_rgba(0,0,0,0.98)]"
                  >
                    شمال
                  </button>
                  <button
                    type="button"
                    aria-label="توجيه يمين"
                    {...makeTouchHandlers('right')}
                    className="ctrl-drive-btn touch-control min-h-[44px] min-w-[52px] px-2.5 rounded-xl border bg-transparent active:bg-amber-400/35 text-white border-white/40 text-xs font-extrabold [text-shadow:0_1px_3px_rgba(0,0,0,0.98)]"
                  >
                    يمين
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 touch-control">
                <button
                  type="button"
                  aria-label="اتجاه الشمال"
                  {...makeTouchHandlers('left')}
                  className={`ctrl-drive-btn touch-control min-h-[52px] min-w-[60px] sm:min-h-[60px] sm:min-w-[74px] px-3 rounded-2xl border text-xs sm:text-sm font-extrabold transition-transform [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                    activeButtons.left
                      ? 'bg-amber-400/40 text-amber-100 border-amber-300 scale-95'
                      : 'bg-transparent text-white border-white/45'
                  }`}
                >
                  شمال
                </button>
                <button
                  type="button"
                  aria-label="اتجاه اليمين"
                  {...makeTouchHandlers('right')}
                  className={`ctrl-drive-btn touch-control min-h-[52px] min-w-[60px] sm:min-h-[60px] sm:min-w-[74px] px-3 rounded-2xl border text-xs sm:text-sm font-extrabold transition-transform [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                    activeButtons.right
                      ? 'bg-amber-400/40 text-amber-100 border-amber-300 scale-95'
                      : 'bg-transparent text-white border-white/45'
                  }`}
                >
                  يمين
                </button>
              </div>
            )}
          </div>

          {/* Right Thumb Zone: Turbo Boost + Car Reverse (R) + Brake & Manual/Auto Gas Pedals (Transparent) */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 touch-control">
            <button
              type="button"
              aria-label="تيربو سرعة إضافية"
              {...makeTouchHandlers('turbo')}
              className={`ctrl-small-btn touch-control relative overflow-hidden min-h-[34px] min-w-[100px] sm:min-w-[118px] px-2.5 py-1 rounded-xl border font-black text-[11px] sm:text-xs transition-transform active:scale-95 flex items-center justify-between gap-1.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                turboUi.active
                  ? 'bg-orange-500/35 text-yellow-100 border-yellow-300/85 scale-105'
                  : turboUi.charge >= 18
                    ? 'bg-sky-500/20 text-sky-100 border-sky-300/70'
                    : 'bg-transparent text-white/75 border-white/30'
              }`}
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-0 bg-sky-300/20 transition-[width] duration-100"
                style={{ width: `${turboUi.charge}%` }}
              />
              <span className="relative z-10 flex items-center gap-1">
                <span>⚡</span>
                <span>{turboUi.active ? 'تيربو!' : 'تيربو'}</span>
              </span>
              <span className="relative z-10 font-mono text-[10px]">{turboUi.charge}%</span>
            </button>

            <div className="flex items-end gap-1.5 sm:gap-2">
              {!isMotoMode && (
                <button
                  type="button"
                  aria-label="رجوع للخلف"
                  {...makeTouchHandlers('reverse')}
                  className={`ctrl-drive-btn touch-control min-h-[50px] min-w-[54px] sm:min-h-[58px] sm:min-w-[68px] px-2 rounded-2xl border font-extrabold transition-transform flex flex-col items-center justify-center leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                    activeButtons.reverse
                      ? 'bg-amber-400/45 text-white border-amber-200 scale-95'
                      : 'bg-amber-500/15 text-amber-200 border-amber-300/60'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black">R</span>
                  <span className="text-[9px] sm:text-[10px] font-extrabold">رجوع</span>
                </button>
              )}
              <button
                type="button"
                aria-label="فرامل"
                {...makeTouchHandlers('down')}
                className={`ctrl-drive-btn touch-control min-h-[52px] min-w-[58px] sm:min-h-[60px] sm:min-w-[72px] px-2.5 rounded-2xl border text-xs sm:text-sm font-extrabold transition-transform [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                  activeButtons.down
                    ? 'bg-rose-500/45 text-white border-rose-200 scale-95'
                    : 'bg-rose-600/15 text-rose-200 border-rose-400/60'
                }`}
              >
                فرامل
              </button>
              {controlSettings.gas === 'manual' ? (
                <button
                  type="button"
                  aria-label="بنزين"
                  {...makeTouchHandlers('up')}
                  className={`ctrl-gas-btn touch-control min-h-[60px] min-w-[66px] sm:min-h-[70px] sm:min-w-[82px] px-3.5 rounded-2xl border text-sm sm:text-base font-extrabold transition-transform [text-shadow:0_1px_3px_rgba(0,0,0,0.98)] ${
                    activeButtons.up
                      ? 'bg-emerald-400/45 text-white border-emerald-200 scale-95'
                      : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/65'
                  }`}
                >
                  بنزين
                </button>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-transparent border border-emerald-400/45 text-emerald-200 text-[11px] font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.98)]">
                  بنزين أوتوماتيك
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
