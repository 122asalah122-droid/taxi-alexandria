export type GameState =
  | 'TITLE_MENU'
  | 'RACE_SETUP'
  | 'CHECKPOINT_SETUP'
  | 'MOTO_GARAGE'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER';

export type ActiveTab = 'play' | 'garage' | 'landmarks';

export type GameMode =
  | 'taxi_classic'
  | 'mashrou3'
  | 'motorcycle'
  | 'police_patrol'
  | 'race'
  | 'traffic_officer'
  | 'superhero';

export type PlayerVehicleKind =
  | 'taxi'
  | 'vespa'
  | 'black_supermoto'
  | 'mashrou3'
  | 'police_car';

export type RaceSubMode = 'race' | 'practice';
export type RaceTrackId = 'corniche_express' | 'montaza_45' | 'sidi_gaber' | 'smouha_suez';
export type RaceDifficulty = 'easy' | 'medium' | 'pro';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type RaceBikeId =
  | 'vespa_lv1'
  | 'boxer_lv2'
  | 'dayun_lv3'
  | 'benelli_lv4'
  | 'yamaha_lv5'
  | 'alex_hero_lv6'
  | 'hyper_h2r_lv7';

export type CheckpointTeamMode = 'alone' | 'with_team';

export interface CheckpointConfig {
  teamMode: CheckpointTeamMode;
  graphicsQuality: GraphicsQuality;
}

export interface PoliceRankDef {
  id: string;
  title: string;
  minPoints: number;
  stars: number;
}

export type InspectionFaultType = 'none' | 'expired' | 'wrong_class' | 'fake_photo' | 'contraband';
export type LicenseFieldId = 'photo' | 'name' | 'expiry' | 'class' | 'trunk';
export type InspectionVerdict = 'pass' | 'ticket' | 'withdraw' | 'arrest';

export interface DriverAppearance {
  skinHex: string;
  skinThreeHex: number;
  hairStyle: 'short' | 'curly' | 'bald' | 'cap';
  hairHex: string;
  hairThreeHex: number;
  hasGlasses: boolean;
  hasBeard: boolean;
  shirtHex: string;
  shirtThreeHex: number;
}

export interface CheckpointInspectionData {
  plate: string;
  vehicleKind: 'sedan' | 'taxi' | 'suv' | 'microbus' | 'motorcycle';
  vehicleLabel: string;
  speedKmh: number;
  driverName: string;
  nationalId: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  isExpired: boolean;
  licenseClass: string;
  classMatchesVehicle: boolean;
  realDriver: DriverAppearance;
  licensePhotoDriver: DriverAppearance;
  photoMatchesDriver: boolean;
  hasContraband: boolean;
  contrabandNote: string;
  faultType: InspectionFaultType;
  expectedField: LicenseFieldId | null;
  expectedVerdict: InspectionVerdict;
  faultSummary: string;
}

export interface RaceTrackDef {
  id: RaceTrackId;
  name: string;
  district: string;
  laps: number;
  distanceKm: number;
  lapRenderM: number;
  characteristic: string;
  svgPath: string;
  startDot: [number, number];
}

export interface RaceBikeDef {
  id: RaceBikeId;
  level: number; // 1..7
  name: string;
  categoryLabel: string;
  difficultyLabel: string;
  difficultyTier: 'easy' | 'medium' | 'hard' | 'expert';
  subtitle: string;
  price: number;
  perkTitle: string;
  perkDesc: string;
  vehicleKind: PlayerVehicleKind;
  paintHex: number;
  paintCss: string;
  accentHex: number;
  isVespa: boolean;
  engineSound: EngineSoundProfile;
  topSpeedKmh: number;
  accelScore: number;
  handlingScore: number;
  speedBonus: number;
  accelBonus: number;
  handlingBonus: number;
  fareMultiplier: number;
  fuelSaver: number; // 0..0.35 reduction in fuel consumption
  tankBonus: number;
  brakeBonus: number;
  armorBonus: number;
  nearMissMultiplier: number;
  patienceBonus: number;
}

export interface RaceConfig {
  subMode: RaceSubMode;
  trackId: RaceTrackId;
  bikeId: RaceBikeId;
  difficulty: RaceDifficulty;
  graphicsQuality: GraphicsQuality;
}

export type SteeringMethod = 'touch' | 'joystick' | 'tilt';
export type GasMethod = 'manual' | 'auto';
export type AtmosphereMode = 'day' | 'sunset' | 'night';
export type StuntType = 'none' | 'wheelie' | 'superman' | 'stand' | 'nohands';

export type CameraMode = 'chase' | 'hood' | 'aerial';
export type RiderStyle = 'green_tracksuit' | 'black_jacket' | 'alex_blue';

export interface ControlSettings {
  steering: SteeringMethod;
  gas: GasMethod;
  sensitivity: number; // 1..5
}

export interface UpgradeLevels {
  engine: number; // 0..7 (7 motorcycle speed levels!)
  tank: number;   // 0..3
  brakes: number; // 0..3
}

export type AlexDistrictId =
  | 'corniche'
  | 'abu_qir'
  | 'sidi_gaber_abuqir'
  | 'ras_el_soda_victoria'
  | 'anfoushi'
  | 'grand_alexandria';

export interface TaxiLevelDef {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  name: string;
  subtitle: string;
  difficultyLabel: string;
  difficultyTier: 'easy' | 'medium' | 'hard' | 'very_hard' | 'pro' | 'expert';
  upgradeCost: number;
  topSpeedKmh: number;
  accelBonus: number;
  handlingBonus: number;
  armorBonus: number;
  fareMultiplier: number;
  patienceBonus: number;
  visualPerks: string[];
}

export interface DistrictStreetZone {
  fromM: number;
  toM: number;
  title: string;
}

export interface DistrictUTurnZone {
  id: string;
  z: number;
  name: string;
}

export interface AlexDistrictDef {
  id: AlexDistrictId;
  name: string;
  englishName: string;
  subtitle: string;
  featureHighlight: string;
  price: number;
  hasSea: boolean;
  requiresAllOtherDistricts?: boolean;
  routeLengthM?: number;
  difficultyLabel: string;
  fareMultiplier: number;
  icon: string;
  landmarks: LandmarkDef[];
  streetZones: DistrictStreetZone[];
  uTurnZones: DistrictUTurnZone[];
}

export interface VehicleUnlockTier {
  id: string;
  name: string;
  requiredPoints: number;
  kind: PlayerVehicleKind;
}

export interface LandmarkDef {
  id: string;
  name: string;
  district: string;
  distanceM: number;
  description: string;
  fareBonus: number;
}

export interface ActivePassenger {
  name: string;
  destinationId: string;
  destinationName: string;
  destinationDistM: number;
  baseFare: number;
  quote: string;
  patienceMaxSec: number;
  patienceLeftSec: number;
  needsUTurn?: boolean;
  isVipRush?: boolean;
}

export interface HudSnapshot {
  speedKmh: number;
  topSpeedKmh: number;
  rpm?: number;
  gear?: number;
  rpmRatio?: number;
  fuel: number;
  maxFuel: number;
  health: number;
  maxHealth: number;
  earnings: number;
  points: number;
  tripsCompleted: number;
  passengersLoaded: number;
  maxPassengers: number;
  violationsStopped: number;
  nearMisses: number;
  stuntCombo: number;
  activeStunt: StuntType;
  distanceM: number;
  routeProgressPct: number;
  currentLandmark: string;
  nextLandmark: string;
  streetBanner: string | null;
  timeLeftSec: number | null;
  passenger: ActivePassenger | null;
  toastMessage: string | null;
  gameOverReason: string | null;
  reachedMandara: boolean;
  signalWarning: 'green' | 'yellow' | 'red' | null;
  sirenActive: boolean;
  checkpointPrompt: { plate: string; speedKmh: number; isViolator: boolean } | null;
  checkpointSubPhase?: 'duty' | 'chase';
  fleeingPlate?: string;
  fleeingDistM?: number;
  pursuitsCompleted?: number;
  raceLap?: number;
  raceTotalLaps?: number;
  raceTimeSec?: number;
  racePosition?: number;
  raceTotalRacers?: number;
  raceTrackName?: string;
  travelDir?: -1 | 1; // -1 = المندرة ← بحري, 1 = بحري ← المندرة
  nearUTurnName?: string | null;
  nearUTurnDistM?: number | null;
  isUTurning?: boolean;
  waitingPassengerHint?: {
    name: string;
    destName: string;
    distM: number;
    fare: number;
    needsUTurn?: boolean;
    isVipRush?: boolean;
  } | null;
  activeMotoLevel?: number;
  activeMotoName?: string;
  activeTaxiLevel?: number;
  activeDistrictName?: string;
  turboCharge?: number;
  turboActive?: boolean;
  comboStreak?: number;
  rushHourActive?: boolean;
}

export interface RunSummary {
  points: number;
  earnings: number;
  tripsCompleted: number;
  distanceM: number;
  topSpeedKmh: number;
  nearMisses: number;
  passengersLoaded: number;
  violationsStopped: number;
  pursuitsCompleted?: number;
  fellDuringStunt: boolean;
  reachedMandara: boolean;
  reason: string;
  timeMultiplier: number;
  raceTimeSec?: number;
  racePosition?: number;
  raceTrackId?: RaceTrackId;
  raceSubMode?: RaceSubMode;
  isNewRecord?: boolean;
}

export type MotoChassisType = 'sport' | 'vespa';
export type PaintFinishType = 'glossy' | 'matte' | 'metallic';
export type ExhaustStyleType = 'stock' | 'carbon' | 'dual_chrome';
export type LedSignId = 'none' | 'arees' | 'mashallah' | 'king' | 'protect';
export type EngineSoundProfile = 'race_sport' | 'classic_vespa';
export type HornSoundProfile = 'sport' | 'classic' | 'melody' | 'air';

export interface MotoTuningConfig {
  chassis: MotoChassisType;
  underglowColor: string | null;
  angelEyeColor: string | null;
  rimLedColor: string | null;
  strobesEnabled: boolean;
  ledSign: LedSignId;
  bodyColor: string;
  rimColor: string;
  seatColor: string;
  paintFinish: PaintFinishType;
  exhaustStyle: ExhaustStyleType;
  sportMirrors: boolean;
  youthStickers: boolean;
  extraRacks: boolean;
  engineSound: EngineSoundProfile;
  hornSound: HornSoundProfile;
}

export interface PlayerProgress {
  wallet: number;
  dailyEarnings: number;
  dailyTrips: number;
  dailyDate: string;
  totalPoints: number;
  bestEarnings: number;
  bestTrips: number;
  totalTrips: number;
  mandaraCompletedCount: number;
  taxiLevel: number; // 1..7 (single self-evolving Alexandria Taxi from Easy to Legendary Hard)
  selectedDistrictId: AlexDistrictId;
  unlockedDistricts: AlexDistrictId[];
  selectedMotoId: RaceBikeId;
  unlockedMotos: RaceBikeId[];
  upgrades: UpgradeLevels;
  bestRaceTimes?: Partial<Record<RaceTrackId, number>>;
  motoTuning?: MotoTuningConfig;
  ownedMotoParts?: string[];
  adsRemoved?: boolean;
}
