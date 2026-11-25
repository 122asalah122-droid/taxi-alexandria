import {
  AlexDistrictDef,
  AlexDistrictId,
  AtmosphereMode,
  CheckpointConfig,
  CheckpointInspectionData,
  ControlSettings,
  DriverAppearance,
  EngineSoundProfile,
  ExhaustStyleType,
  HornSoundProfile,
  InspectionFaultType,
  InspectionVerdict,
  LandmarkDef,
  LedSignId,
  LicenseFieldId,
  MotoTuningConfig,
  PaintFinishType,
  PlayerProgress,
  PoliceRankDef,
  RaceBikeDef,
  RaceBikeId,
  RaceConfig,
  RaceTrackDef,
  TaxiLevelDef,
  VehicleUnlockTier,
} from './types';

export const CORNICHE_ROUTE_LENGTH_M = 3720;
export const MANDARA_FINISH_M = 3500;

export const TIME_OF_DAY_OPTIONS: {
  id: AtmosphereMode;
  label: string;
  multiplier: number;
  badge: string;
}[] = [
  { id: 'day', label: 'نهار', multiplier: 1.0, badge: 'نقاط x1' },
  { id: 'sunset', label: 'المغرب', multiplier: 1.5, badge: 'نقاط x1.5' },
  { id: 'night', label: 'بالليل', multiplier: 2.5, badge: 'نقاط x2.5' },
];

export const STREET_ZONES: { fromM: number; toM: number; title: string }[] = [
  { fromM: 0, toM: 220, title: 'طريق الجيش · المندرة والمنتزه' },
  { fromM: 220, toM: 480, title: 'طريق الجيش · العصافرة' },
  { fromM: 480, toM: 880, title: 'سيدي بشر وميامي' },
  { fromM: 880, toM: 1480, title: 'ستانلي · كوبري ستانلي' },
  { fromM: 1480, toM: 2050, title: 'طريق الجيش · الشاطبي' },
  { fromM: 2050, toM: 2540, title: 'محطة الرمل' },
  { fromM: 2540, toM: 2940, title: 'طريق الجيش · المنشية' },
  { fromM: 2940, toM: 3320, title: 'بحري · ميدان المساجد' },
  { fromM: 3320, toM: 4000, title: 'بحري · قلعة قايتباي والميناء الشرقي' },
];

export interface CornicheUTurnZone {
  id: string;
  z: number;
  name: string;
}

export const U_TURN_ZONES: CornicheUTurnZone[] = [
  { id: 'mandara_gate', z: -42, name: 'ملف دوران المندرة وبوابة المنتزه' },
  { id: 'montaza_sea', z: -260, name: 'ملف دوران المنتزه والعصافرة' },
  { id: 'sidi_bishr', z: -660, name: 'ملف دوران سيدي بشر وميامي' },
  { id: 'before_stanley', z: -1020, name: 'ملف دوران قبل كوبري ستانلي' },
  { id: 'shatby_lib', z: -1680, name: 'ملف دوران الشاطبي ومكتبة الإسكندرية' },
  { id: 'raml_station', z: -2260, name: 'ملف دوران محطة الرمل' },
  { id: 'mansheya', z: -2860, name: 'ملف دوران المنشية' },
  { id: 'bahary_qaitbay', z: -3430, name: 'ملف دوران بحري وقلعة قايتباي' },
];

export interface CornicheGasStation {
  id: string;
  z: number;
  side: 'right' | 'left';
  name: string;
  district: string;
}

export const GAS_STATIONS: CornicheGasStation[] = [
  { id: 'gs_mandara_r', z: -195, side: 'right', name: 'بنزينة المندرة والمنتزه', district: 'المندرة · يمين الطريق' },
  { id: 'gs_asafra_l', z: -430, side: 'left', name: 'بنزينة العصافرة السريعة', district: 'العصافرة · شمال الطريق' },
  { id: 'gs_miami_r', z: -840, side: 'right', name: 'بنزينة ميامي وسيدي بشر', district: 'ميامي · يمين الطريق' },
  { id: 'gs_stanley_l', z: -1440, side: 'left', name: 'بنزينة كليوباترا وستانلي', district: 'ستانلي · شمال الطريق' },
  { id: 'gs_shatby_r', z: -1940, side: 'right', name: 'بنزينة الشاطبي والجامعة', district: 'الشاطبي · يمين الطريق' },
  { id: 'gs_raml_l', z: -2480, side: 'left', name: 'بنزينة محطة الرمل', district: 'محطة الرمل · شمال الطريق' },
  { id: 'gs_mansheya_r', z: -2960, side: 'right', name: 'بنزينة المنشية الكورنيش', district: 'المنشية · يمين الطريق' },
  { id: 'gs_bahary_l', z: -3320, side: 'left', name: 'بنزينة بحري والميناء', district: 'بحري · شمال الطريق' },
];

export const GRAND_EXTRA_GAS_STATIONS: CornicheGasStation[] = [
  { id: 'gs_grand_saa_r', z: -4180, side: 'right', name: 'بنزينة ميدان الساعة والسيوف', district: 'الرأس السوداء · يمين الطريق' },
  { id: 'gs_grand_anf_l', z: -5280, side: 'left', name: 'بنزينة الأنفوشي ورأس التين', district: 'الأنفوشي · شمال الطريق' },
];

export const VEHICLE_UNLOCK_TIERS: VehicleUnlockTier[] = [
  { id: 'alex_taxi_lv1', name: 'تاكسي الإسكندرية (مستوى 1) + سكوتر بحري', requiredPoints: 0, kind: 'taxi' },
  { id: 'alex_taxi_lv2', name: 'تاكسي الإسكندرية المطوّر (مستوى 2)', requiredPoints: 600, kind: 'taxi' },
  { id: 'black_supermoto', name: 'شبح الإسكندرية الكربوني', requiredPoints: 1200, kind: 'black_supermoto' },
  { id: 'alex_taxi_lv3', name: 'تاكسي الإسكندرية التوربو (مستوى 3)', requiredPoints: 2100, kind: 'taxi' },
  { id: 'alex_taxi_lv4', name: 'تاكسي الإسكندرية الملكي (مستوى 4)', requiredPoints: 3200, kind: 'taxi' },
];

export const LANDMARKS: LandmarkDef[] = [
  {
    id: 'mandara',
    name: 'قصر وبوابة المنتزه والمندرة',
    district: 'المندرة · نقطة البداية',
    distanceM: 0,
    description: 'نقطة الانطلاق من قصر وبوابة وحدائق المنتزه الملكية على يمين الطريق، وبعدها مباشرة ينفتح البحر الأبيض المتوسط بطول الكورنيش.',
    fareBonus: 25,
  },
  {
    id: 'asafra',
    name: 'كورنيش وشاطئ العصافرة',
    district: 'العصافرة',
    distanceM: 320,
    description: 'شاطئ العصافرة الحيوي وكافيهات البحر ومحطة الزباين النشطة بين المنتزه وسيدي بشر.',
    fareBonus: 32,
  },
  {
    id: 'sidi_bishr',
    name: 'سيدي بشر وميامي',
    district: 'سيدي بشر · ميامي',
    distanceM: 620,
    description: 'مسجد سيدي بشر الكبير بواجهته الزاهية وقبابه الفيروزية ومئذنته المضيئة على كورنيش ميامي.',
    fareBonus: 42,
  },
  {
    id: 'stanley',
    name: 'كوبري ستانلي',
    district: 'ستانلي',
    distanceM: 1200,
    description: 'التحفة المعمارية الملكية الملونة بأبراجها الأربعة وقبابها المذهبة فوق خليج ستانلي وكبائنه البحرية.',
    fareBonus: 58,
  },
  {
    id: 'library',
    name: 'مكتبة الإسكندرية',
    district: 'الشاطبي (على الشمال)',
    distanceM: 1780,
    description: 'قرص الشمس الزجاجي المائل باتجاه البحر وجدار الجرانيت المنقوش بحروف العالم والقبة السماوية على شمال الكورنيش.',
    fareBonus: 72,
  },
  {
    id: 'raml',
    name: 'محطة الرمل ومسجد القائد إبراهيم',
    district: 'محطة الرمل',
    distanceM: 2320,
    description: 'مسجد القائد إبراهيم بقبته الخضراء ومئذنته الرشيقة وعمارات وسط البلد الملونة.',
    fareBonus: 88,
  },
  {
    id: 'mansheya',
    name: 'المنشية والجندي المجهول',
    district: 'المنشية',
    distanceM: 2740,
    description: 'الأعمدة الرخامية النصف دائرية على البحر وأبنية البورصة والعدالة الكلاسيكية بقلب المدينة.',
    fareBonus: 102,
  },
  {
    id: 'mursi',
    name: 'مسجد المرسي أبو العباس',
    district: 'بحري · ميدان المساجد',
    distanceM: 3150,
    description: 'القباب الأندلسية المزخرفة بالألوان والزخارف الإسلامية والمئذنة الشاهقة المطلة على الكورنيش.',
    fareBonus: 118,
  },
  {
    id: 'qaitbay',
    name: 'قلعة قايتباي',
    district: 'بحري · خط النهاية',
    distanceM: 3500,
    description: 'الحصون المملوكية العريقة على رأس جزيرة فاروس ومراكب الصيد في الميناء الشرقي بنهاية خط الكورنيش.',
    fareBonus: 135,
  },
];

export const MAX_TAXI_LEVEL = 7;

// Single Self-Evolving Alexandria Taxi (7 Progressive Levels: Easy -> Legendary Hard)
export const TAXI_LEVELS: TaxiLevelDef[] = [
  {
    level: 1,
    name: 'تاكسي الإسكندرية · المستوى 1',
    subtitle: 'البداية الكلاسيكية بسرعة هادئة (٧٨ كم/س) — جمّع أجرة المشاوير وطوّر التاكسي لزيادة السرعة والربح!',
    difficultyLabel: 'سهل',
    difficultyTier: 'easy',
    upgradeCost: 0,
    topSpeedKmh: 78,
    accelBonus: 0,
    handlingBonus: 8,
    armorBonus: 0,
    fareMultiplier: 1.0,
    patienceBonus: 4,
    visualPerks: ['سرعة بداية هادئة ٧٨ كم/س', 'لوحة مضيئة: تاكسي الإسكندرية', 'تطوير المستوى ٢ يرفع السرعة إلى ٩٨ كم/س'],
  },
  {
    level: 2,
    name: 'تاكسي الإسكندرية · المستوى 2',
    subtitle: 'موتور أقوى وجنوط رياضية وسرعة ٩٨ كم/س مع حركة مرور أنشط وتغريز أكثر إثارة',
    difficultyLabel: 'متوسط',
    difficultyTier: 'medium',
    upgradeCost: 700,
    topSpeedKmh: 98,
    accelBonus: 12,
    handlingBonus: 14,
    armorBonus: 10,
    fareMultiplier: 1.18,
    patienceBonus: 0,
    visualPerks: ['سرعة ٩٨ كم/س + عزم أفضل', 'جنوط رياضية وشبكة وسبليتر كروم', 'أجرة مشاوير ×1.18 وزحمة أعلى'],
  },
  {
    level: 3,
    name: 'تاكسي الإسكندرية · المستوى 3',
    subtitle: 'تعديل رياضي بسبويلر وشكمان مزدوج وزينون وسرعة ١١٨ كم/س مع مرور أسرع ومشاوير مستعجلة',
    difficultyLabel: 'فوق المتوسط',
    difficultyTier: 'medium',
    upgradeCost: 1650,
    topSpeedKmh: 118,
    accelBonus: 24,
    handlingBonus: 20,
    armorBonus: 20,
    fareMultiplier: 1.38,
    patienceBonus: -4,
    visualPerks: ['سرعة ١١٨ كم/س + تيربو أقوى', 'سبويلر رياضي + شكمان مزدوج وزينون', 'أجرة ×1.38 ووقت زبون أضيق'],
  },
  {
    level: 4,
    name: 'تاكسي الإسكندرية التيربو · المستوى 4',
    subtitle: 'بدي كيت عريض وكشافات LED أمامية وسرعة ١٣٨ كم/س — مرور مزدحم وعربيات بتكسر حارات قدامك!',
    difficultyLabel: 'صعب',
    difficultyTier: 'hard',
    upgradeCost: 2950,
    topSpeedKmh: 138,
    accelBonus: 36,
    handlingBonus: 26,
    armorBonus: 30,
    fareMultiplier: 1.6,
    patienceBonus: -8,
    visualPerks: ['سرعة ١٣٨ كم/س + تحكم رياضي', 'رفارف عريضة وشريط LED أمامي + زعنفة سقف', 'أجرة ×1.60 وتحدي مرور حقيقي'],
  },
  {
    level: 5,
    name: 'تاكسي الإسكندرية الذهبي · المستوى 5',
    subtitle: 'جنوط ذهبية وإضاءة سفلية و٤ مخارج شكمان وسرعة ١٥٨ كم/س مع مشاوير VIP متتالية ومرور سريع جداً',
    difficultyLabel: 'صعب جداً',
    difficultyTier: 'very_hard',
    upgradeCost: 4600,
    topSpeedKmh: 158,
    accelBonus: 48,
    handlingBonus: 32,
    armorBonus: 40,
    fareMultiplier: 1.85,
    patienceBonus: -12,
    visualPerks: ['سرعة ١٥٨ كم/س + ٤ مخارج شكمان', 'جنوط ذهبية وإضاءة نيون سفلية', 'أجرة ×1.85 وخصم صبر أعلى عند الخبطة'],
  },
  {
    level: 6,
    name: 'تاكسي الإسكندرية GT · المستوى 6',
    subtitle: 'جناح خلفي GT كربوني وفتحات تيربو مضيئة وسرعة ١٧٨ كم/س — تحدي احترافي بزحام كثيف وسرعة نار!',
    difficultyLabel: 'احترافي',
    difficultyTier: 'pro',
    upgradeCost: 6800,
    topSpeedKmh: 178,
    accelBonus: 62,
    handlingBonus: 38,
    armorBonus: 52,
    fareMultiplier: 2.15,
    patienceBonus: -15,
    visualPerks: ['سرعة ١٧٨ كم/س + ثبات GT عالي', 'جناح GT مزدوج + فتحات تيربو سماوي', 'أجرة ×2.15 ومكافآت تغريز ضخمة'],
  },
  {
    level: 7,
    name: 'ملك تاكسي الإسكندرية · المستوى 7',
    subtitle: 'أقصى تطور أسطوري ببدي كيت كامل وتاج إضاءة ملكي وديفيوزر خلفي وسرعة صاروخية (٢٠٠ كم/س) — أصعب تحدي!',
    difficultyLabel: 'أسطوري',
    difficultyTier: 'expert',
    upgradeCost: 9800,
    topSpeedKmh: 200,
    accelBonus: 78,
    handlingBonus: 46,
    armorBonus: 65,
    fareMultiplier: 2.5,
    patienceBonus: -18,
    visualPerks: ['أقصى سرعة ٢٠٠ كم/س + تيربو أسطوري', 'تاج ملكي مضيء + ديفيوزر ونيون مزدوج', 'أعلى أجرة ×2.50 وأصعب زحام في المدينة'],
  },
];

export function getTaxiLevelDef(level?: number): TaxiLevelDef {
  const clamped = Math.max(1, Math.min(MAX_TAXI_LEVEL, Math.round(level ?? 1)));
  return TAXI_LEVELS[clamped - 1] ?? TAXI_LEVELS[0];
}

// 4 Playable Alexandria Taxi Districts (Corniche Free + 3 Paid Unlockable Districts)
export const ALEX_DISTRICTS: AlexDistrictDef[] = [
  {
    id: 'corniche',
    name: 'كورنيش الإسكندرية',
    englishName: 'ALEXANDRIA CORNICHE',
    subtitle: 'من قصر وبوابة المنتزه والمندرة بطول البحر حتى كوبري ستانلي والقلعة',
    featureHighlight: 'الكورنيش البحري · كوبري ستانلي · مكتبة الإسكندرية · قلعة قايتباي',
    price: 0,
    hasSea: true,
    difficultyLabel: 'سهل ← متوسط',
    fareMultiplier: 1.0,
    icon: '🌊',
    landmarks: LANDMARKS,
    streetZones: STREET_ZONES,
    uTurnZones: U_TURN_ZONES,
  },
  {
    id: 'abu_qir',
    name: 'أبو قير البلد والقطار المعلق العلوي',
    englishName: 'ABU QIR & ELEVATED METRO',
    subtitle: 'طريق أبو قير الداخلي بدون كورنيش: المعمورة الشاطئ والملاهي · سوق المعمورة البلد · مدارس طوسون · الكلية البحرية · قلب أبو قير البلد',
    featureHighlight: 'بدون بحر ولا كورنيش · القطار المعلق العلوي · ملاهي المعمورة · سوق المعمورة · مدارس طوسون · الكلية البحرية · المعهد الديني والبريد وبنك مصر وشركات الاتصال والكافتيريات وموقف العربيات والنوادي وسوق الأسماك',
    price: 1800,
    hasSea: false,
    difficultyLabel: 'متوسط',
    fareMultiplier: 1.22,
    icon: '🚝',
    landmarks: [
      {
        id: 'aq_mandara',
        name: 'محطة المندرة العلوية',
        district: 'المندرة · بداية القطار المعلق',
        distanceM: 0,
        description: 'نقطة انطلاق طريق أبو قير الداخلي والقطار المعلق العلوي من المندرة شرقاً.',
        fareBonus: 32,
      },
      {
        id: 'aq_maamoura_beach',
        name: 'المعمورة الشاطئ والملاهي',
        district: 'المعمورة الشاطئ · مدينة الملاهي',
        distanceM: 520,
        description: 'بوابة المعمورة الشاطئ والعجلة الدوارة المضيئة وألعاب الملاهي الحيوية.',
        fareBonus: 48,
      },
      {
        id: 'aq_maamoura_balad',
        name: 'سوق المعمورة البلد',
        district: 'المعمورة البلد · السوق الشعبي',
        distanceM: 1120,
        description: 'سوق المعمورة البلد المزدحم بالمحلات والفرش والخضار والفاكهة.',
        fareBonus: 65,
      },
      {
        id: 'aq_tousson',
        name: 'طوسون ومجمع المدارس',
        district: 'طوسون · شارع المدارس',
        distanceM: 1720,
        description: 'مجمع مدارس طوسون وفناء الطلبة أسفل مسار القطار المعلق العلوي.',
        fareBonus: 82,
      },
      {
        id: 'aq_naval',
        name: 'الكلية البحرية بأبو قير',
        district: 'أبو قير · الكلية البحرية',
        distanceM: 2340,
        description: 'بوابة وصرح الكلية البحرية العريق بشعار المرساة الذهبية والأعلام.',
        fareBonus: 102,
      },
      {
        id: 'aq_balad_services',
        name: 'أبو قير البلد · المعهد الديني والبريد وبنك مصر',
        district: 'وسط أبو قير البلد · شركات الاتصال والكافتيريات',
        distanceM: 3000,
        description: 'قلب أبو قير البلد: المدارس والمعهد الديني الأزهري ومكتب البريد وبنك مصر وشركات الاتصال والكافتيريات والزحام.',
        fareBonus: 126,
      },
      {
        id: 'aq_balad_market',
        name: 'موقف العربيات والنوادي وسوق الأسماك',
        district: 'أبو قير البلد · المحطة النهائية',
        distanceM: 3480,
        description: 'موقف عربيات أبو قير والنوادي الرياضية وسوق الأسماك الكبير أسفل المحطة النهائية.',
        fareBonus: 152,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 340, title: 'المندرة · بداية طريق أبو قير والقطار المعلق العلوي' },
      { fromM: 340, toM: 860, title: 'المعمورة الشاطئ · مدينة الملاهي والعجلة الدوارة' },
      { fromM: 860, toM: 1460, title: 'المعمورة البلد · السوق التجاري الشعبي' },
      { fromM: 1460, toM: 2060, title: 'طوسون · مجمع المدارس وأسفل القطار المعلق' },
      { fromM: 2060, toM: 2720, title: 'صرح وبوابة الكلية البحرية بأبو قير' },
      { fromM: 2720, toM: 3260, title: 'أبو قير البلد · المعهد الديني · البريد · بنك مصر · شركات الاتصال · الكافتيريات' },
      { fromM: 3260, toM: 4000, title: 'أبو قير البلد · موقف العربيات · النوادي · سوق الأسماك' },
    ],
    uTurnZones: [
      { id: 'aq_ut_1', z: -55, name: 'ملف دوران محطة المندرة العلوية' },
      { id: 'aq_ut_2', z: -540, name: 'ملف دوران المعمورة الشاطئ والملاهي' },
      { id: 'aq_ut_3', z: -1140, name: 'ملف دوران سوق المعمورة البلد' },
      { id: 'aq_ut_4', z: -1740, name: 'ملف دوران مدارس طوسون' },
      { id: 'aq_ut_5', z: -2360, name: 'ملف دوران الكلية البحرية' },
      { id: 'aq_ut_6', z: -3020, name: 'ملف دوران وسط أبو قير البلد وبنك مصر' },
      { id: 'aq_ut_7', z: -3460, name: 'ملف دوران موقف العربيات وسوق الأسماك' },
    ],
  },
  {
    id: 'sidi_gaber_abuqir',
    name: 'طريق سيدي جابر ← شارع أبو قير ← المندرة',
    englishName: 'SIDI GABER TO ABU QIR ST & MANDARA',
    subtitle: 'مستوى جديد بدون بحر: ملف قبل المكتبة بيفطة سيدي جابر ← إشارة مرور ← ملفات يمين وشمال ← محطة قطار سيدي جابر ← شارع أبو قير طوالي حتى المندرة + شوارع جانبية بعيد عن الزحام',
    featureHighlight: 'بدون بحر خالص · ملفات سيدي جابر · إشارات مرور بطول الشارع · محطة قطار سيدي جابر · شارع أبو قير لحد المندرة · بيوت وقهاوي ومحلات · شوارع جانبية هادئة بعيد عن الزحام',
    price: 2600,
    hasSea: false,
    difficultyLabel: 'متوسط ← صعب',
    fareMultiplier: 1.35,
    icon: '🚉',
    landmarks: [
      {
        id: 'sg_entry_turn',
        name: 'ملف مدخل سيدي جابر (قبل المكتبة)',
        district: 'قبل المكتبة · يفطة سيدي جابر',
        distanceM: 0,
        description: 'بداية الطريق قبل المكتبة بمسافة مع يفطة سيدي جابر والملف الأول إلى قلب المدينة.',
        fareBonus: 34,
      },
      {
        id: 'sg_signal_1',
        name: 'إشارة مرور سيدي جابر الرئيسية (٢ كم)',
        district: 'سيدي جابر · إشارة بطول الشارع',
        distanceM: 540,
        description: 'إشارة مرور واسعة بطول الشارع بعد الملف الأول بـ ٢ كم يليها ملف يمين إلى قلب المدينة.',
        fareBonus: 52,
      },
      {
        id: 'sg_right_city',
        name: 'ملف يمين · قلب مدينة سيدي جابر',
        district: 'مدينة سيدي جابر · بيوت وقهاوي ومحلات',
        distanceM: 860,
        description: 'مدينة كاملة من العمارات والقهاوي والمحلات والشوارع الجانبية الهادئة بعيداً عن الزحام.',
        fareBonus: 68,
      },
      {
        id: 'sg_left_turns',
        name: 'ملفات سيدي جابر الداخلية (٥ كم ← ٦ كم)',
        district: 'سيدي جابر الداخلي · الشوارع الجانبية',
        distanceM: 1760,
        description: 'الملف الثالث شمال ثم ٥ كم ملف شمال و٦ كم ملف شمال وسط الأحياء والمحلات والقهاوي.',
        fareBonus: 92,
      },
      {
        id: 'sg_train_station',
        name: 'محطة قطار سيدي جابر (على اليمين)',
        district: 'ميدان محطة سيدي جابر · السكة الحديد',
        distanceM: 2720,
        description: 'بعد ٣ كم ملف يمين تظهر مباشرة على يمينك محطة قطار سيدي جابر والأرصفة والقطارات.',
        fareBonus: 122,
      },
      {
        id: 'sg_abuqir_signal',
        name: 'إشارة مرور مدخل شارع أبو قير',
        district: 'تقاطع شارع أبو قير · بعد ٣ كم طوالي',
        distanceM: 2960,
        description: 'طوالي ٣ كم من محطة القطار حتى إشارة المرور ثم الدخول مباشرة على شارع أبو قير.',
        fareBonus: 138,
      },
      {
        id: 'sg_mandara_end',
        name: 'المندرة · نهاية شارع أبو قير',
        district: 'شارع أبو قير ← المندرة · خط النهاية',
        distanceM: 3480,
        description: 'شارع أبو قير الممتد على طوله بالبيوت والقهاوي والمحلات حتى الوصول إلى المندرة.',
        fareBonus: 168,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 420, title: 'قبل المكتبة · يفطة وملف مدخل سيدي جابر' },
      { fromM: 420, toM: 700, title: 'بعد ٢ كم · إشارة مرور سيدي جابر بطول الشارع' },
      { fromM: 700, toM: 1120, title: 'ملف يمين · مدينة سيدي جابر (بيوت وقهاوي ومحلات)' },
      { fromM: 1120, toM: 1920, title: 'ملف ثالث شمال · ٥ كم ملف شمال (شوارع جانبية هادئة ↗)' },
      { fromM: 1920, toM: 2520, title: '٦ كم طوالي ← ملف شمال ← ٣ كم نحو المحطة' },
      { fromM: 2520, toM: 2900, title: 'ملف يمين · محطة قطار سيدي جابر على اليمين' },
      { fromM: 2900, toM: 3250, title: 'إشارة مرور ← دخول شارع أبو قير (طريق الحرية)' },
      { fromM: 3250, toM: 4000, title: 'شارع أبو قير طوالي حتى المندرة · بيوت وقهاوي ومحلات' },
    ],
    uTurnZones: [
      { id: 'sg_ut_1', z: -85, name: 'ملف دوران قبل يفطة سيدي جابر' },
      { id: 'sg_ut_2', z: -610, name: 'ملف دوران بعد إشارة سيدي جابر' },
      { id: 'sg_ut_3', z: -1340, name: 'ملف دوران قلب مدينة سيدي جابر' },
      { id: 'sg_ut_4', z: -2020, name: 'ملف دوران شوارع سيدي جابر الداخلية' },
      { id: 'sg_ut_5', z: -2780, name: 'ملف دوران أمام محطة قطار سيدي جابر' },
      { id: 'sg_ut_6', z: -3440, name: 'ملف دوران المندرة ونهاية شارع أبو قير' },
    ],
  },
  {
    id: 'ras_el_soda_victoria',
    name: 'طريق الرأس السوداء ← فيكتوريا',
    englishName: 'RAS EL-SODA TO VICTORIA',
    subtitle: 'شارع مصطفى كامل الحيوي من الرأس السوداء مروراً بميدان الساعة والسيوف حتى فيكتوريا',
    featureHighlight: 'برج ميدان الساعة · شارع السيوف شماعة · كوبري العوايد · ترام وميدان فيكتوريا',
    price: 3600,
    hasSea: false,
    difficultyLabel: 'صعب',
    fareMultiplier: 1.45,
    icon: '🕰️',
    landmarks: [
      {
        id: 'rv_ras_soda',
        name: 'ميدان وبوابة الرأس السوداء',
        district: 'الرأس السوداء · نقطة البداية',
        distanceM: 0,
        description: 'بوابة طريق الرأس السوداء وشارع مصطفى كامل الرئيسي شرق الإسكندرية.',
        fareBonus: 36,
      },
      {
        id: 'rv_mustafa',
        name: 'شارع مصطفى كامل',
        district: 'الرأس السوداء ← الساعة',
        distanceM: 640,
        description: 'عمارات ومحلات مصطفى كامل التجارية المضيئة على جانبي الطريق.',
        fareBonus: 54,
      },
      {
        id: 'rv_saa',
        name: 'ميدان وبرج الساعة',
        district: 'ميدان الساعة',
        distanceM: 1220,
        description: 'برج الساعة الأيقوني المضيء بقلب ميدان الساعة وتقاطعه المزدحم.',
        fareBonus: 78,
      },
      {
        id: 'rv_seyouf',
        name: 'شارع وميدان السيوف شماعة',
        district: 'السيوف',
        distanceM: 1960,
        description: 'قلب السيوف التجاري بالمحلات والمقاهي وكوبري المشاة المضيء.',
        fareBonus: 98,
      },
      {
        id: 'rv_awaied',
        name: 'كوبري ومنطقة العوايد',
        district: 'العوايد',
        distanceM: 2680,
        description: 'كوبري العوايد العلوي وطريق الوصول السريع نحو فيكتوريا.',
        fareBonus: 122,
      },
      {
        id: 'rv_victoria',
        name: 'ميدان ومحطة ترام فيكتوريا',
        district: 'فيكتوريا · نهاية الخط',
        distanceM: 3440,
        description: 'ميدان فيكتوريا العريق ومحطة ترام الإسكندرية الأزرق والأصفر.',
        fareBonus: 155,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 580, title: 'طريق الرأس السوداء · شارع مصطفى كامل' },
      { fromM: 580, toM: 1120, title: 'مطلع ميدان الساعة' },
      { fromM: 1120, toM: 1750, title: 'ميدان وبرج الساعة' },
      { fromM: 1750, toM: 2450, title: 'شارع وميدان السيوف شماعة' },
      { fromM: 2450, toM: 3080, title: 'كوبري ومنطقة العوايد' },
      { fromM: 3080, toM: 4000, title: 'ميدان فيكتوريا ومحطة الترام' },
    ],
    uTurnZones: [
      { id: 'rv_ut_1', z: -60, name: 'ملف دوران الرأس السوداء' },
      { id: 'rv_ut_2', z: -660, name: 'ملف دوران مصطفى كامل' },
      { id: 'rv_ut_3', z: -1240, name: 'ملف دوران ميدان الساعة' },
      { id: 'rv_ut_4', z: -1980, name: 'ملف دوران السيوف شماعة' },
      { id: 'rv_ut_5', z: -2700, name: 'ملف دوران كوبري العوايد' },
      { id: 'rv_ut_6', z: -3420, name: 'ملف دوران ميدان فيكتوريا' },
    ],
  },
  {
    id: 'anfoushi',
    name: 'مدينة الأنفوشي',
    englishName: 'ANFOUSHI MARITIME CITY',
    subtitle: 'حي الأنفوشي وبحري العريق بحلقة السمك والبيوت الملونة وزينة الشوارع وقصر رأس التين',
    featureHighlight: 'حلقة سمك الأنفوشي · زينة بحري المضيئة · مراكب الصيد · قصر رأس التين',
    price: 6200,
    hasSea: true,
    difficultyLabel: 'صعب جداً',
    fareMultiplier: 1.72,
    icon: '⚓',
    landmarks: [
      {
        id: 'an_gate',
        name: 'بوابة مدينة الأنفوشي',
        district: 'مدخل الأنفوشي وبحري',
        distanceM: 0,
        description: 'مدخل حي الأنفوشي التاريخي بأنوار الزينة الإسكندرانية والواجهات الملونة.',
        fareBonus: 44,
      },
      {
        id: 'an_halqa',
        name: 'حلقة السمك وميناء الصيادين',
        district: 'حلقة سمك الأنفوشي',
        distanceM: 880,
        description: 'أشهر سوق سمك في الإسكندرية وأمامه مراكب الصيد الخشبية الملونة بالميناء.',
        fareBonus: 76,
      },
      {
        id: 'an_mosque',
        name: 'ميدان ومسجد الأنفوشي',
        district: 'قلب الأنفوشي',
        distanceM: 1740,
        description: 'ساحة الأنفوشي الشعبية والمسجد الأثري والمقاهي البحرية.',
        fareBonus: 108,
      },
      {
        id: 'an_beach',
        name: 'شاطئ ولسان الأنفوشي',
        district: 'شاطئ الأنفوشي',
        distanceM: 2340,
        description: 'لسان الأنفوشي الممتد داخل البحر وإطلالة الميناء الشرقي الخلابة.',
        fareBonus: 132,
      },
      {
        id: 'an_ras_eltin',
        name: 'قصر رأس التين الملكي',
        district: 'رأس التين · الأنفوشي',
        distanceM: 2920,
        description: 'أعمدة وبوابات قصر رأس التين التاريخية العريقة المطلة على البحر.',
        fareBonus: 158,
      },
      {
        id: 'an_lighthouse',
        name: 'فنار وميناء الأنفوشي التاريخي',
        district: 'رأس الأنفوشي · خط النهاية',
        distanceM: 3460,
        description: 'الفنار البحري المضيء في أقصى لسان مدينة الأنفوشي وميناء الصيادين.',
        fareBonus: 192,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 680, title: 'مدخل مدينة الأنفوشي وبحري' },
      { fromM: 680, toM: 1450, title: 'حلقة السمك وميناء الصيادين' },
      { fromM: 1450, toM: 2150, title: 'ميدان ومسجد الأنفوشي العريق' },
      { fromM: 2150, toM: 2700, title: 'شاطئ ولسان الأنفوشي' },
      { fromM: 2700, toM: 3200, title: 'شارع قصر رأس التين الملكي' },
      { fromM: 3200, toM: 4000, title: 'فنار وميناء الأنفوشي التاريخي' },
    ],
    uTurnZones: [
      { id: 'an_ut_1', z: -60, name: 'ملف دوران بوابة الأنفوشي' },
      { id: 'an_ut_2', z: -860, name: 'ملف دوران حلقة السمك' },
      { id: 'an_ut_3', z: -1720, name: 'ملف دوران ميدان الأنفوشي' },
      { id: 'an_ut_4', z: -2320, name: 'ملف دوران شاطئ الأنفوشي' },
      { id: 'an_ut_5', z: -2900, name: 'ملف دوران قصر رأس التين' },
      { id: 'an_ut_6', z: -3430, name: 'ملف دوران فنار الأنفوشي' },
    ],
  },
  {
    id: 'grand_alexandria',
    name: 'الإسكندرية الكاملة · ربط المدينة كلها ببعض',
    englishName: 'GRAND CONNECTED ALEXANDRIA',
    subtitle: 'الخريطة الكبرى المترابطة! تجمع الـ ٥ مناطق في مدينة واحدة ضخمة متصلة بدون تحميل: الكورنيش ← أبو قير والقطار المعلق ← سيدي جابر ومحطة القطار وشارع أبو قير ← الرأس السوداء وفيكتوريا ← مدينة الأنفوشي!',
    featureHighlight: '٥ مناطق متصلة في طريق واحد ضخم (٦ كم) · الكورنيش + القطار المعلق + محطة سيدي جابر والشوارع الجانبية + برج الساعة وترام فيكتوريا + حلقة سمك وفنار الأنفوشي · أعلى أجرة في اللعبة ×2.40',
    price: 15000,
    hasSea: false,
    requiresAllOtherDistricts: true,
    routeLengthM: 5950,
    difficultyLabel: 'أسطوري · المدينة الكاملة',
    fareMultiplier: 2.4,
    icon: '👑',
    landmarks: [
      {
        id: 'ga_corniche_start',
        name: 'بوابة الكورنيش والمنتزه (القطاع ١)',
        district: 'كورنيش الإسكندرية · نقطة الانطلاق',
        distanceM: 0,
        description: 'بداية الرحلة الكبرى من الكورنيش والبحر الأبيض المتوسط نحو ربط المدينة بالكامل.',
        fareBonus: 45,
      },
      {
        id: 'ga_stanley',
        name: 'كوبري ستانلي الملكي',
        district: 'كورنيش الإسكندرية · ستانلي',
        distanceM: 840,
        description: 'عبور كوبري ستانلي وأبراجه الملكية فوق الخليج قبل محور ربط أبو قير.',
        fareBonus: 68,
      },
      {
        id: 'ga_abuqir_maamoura',
        name: 'أبو قير · ملاهي المعمورة والقطار المعلق (القطاع ٢)',
        district: 'أبو قير البلد · القطار المعلق العلوي',
        distanceM: 1460,
        description: 'الدخول لمدينة أبو قير أسفل القطار المعلق العلوي والعجلة الدوارة للملاهي.',
        fareBonus: 88,
      },
      {
        id: 'ga_abuqir_balad',
        name: 'الكلية البحرية وقلب أبو قير البلد',
        district: 'أبو قير · المعهد الديني وبنك مصر والأسواق',
        distanceM: 2180,
        description: 'الكلية البحرية والمعهد الديني والبريد وبنك مصر والكافتيريات وسوق الأسماك.',
        fareBonus: 110,
      },
      {
        id: 'ga_sidi_gaber_signal',
        name: 'مدخل سيدي جابر وإشارة المرور (القطاع ٣)',
        district: 'مدينة سيدي جابر · شوارع جانبية هادئة ↗',
        distanceM: 2680,
        description: 'دخول مدينة سيدي جابر الكاملة مع الشارع الجانبي الهادئ بعيداً عن الزحام.',
        fareBonus: 128,
      },
      {
        id: 'ga_sidi_gaber_station',
        name: 'محطة قطار سيدي جابر (على اليمين)',
        district: 'ميدان محطة سيدي جابر · السكة الحديد',
        distanceM: 3180,
        description: 'واجهة محطة قطار سيدي جابر الشهيرة وساعتها والأرصفة والقطار المتحرك.',
        fareBonus: 148,
      },
      {
        id: 'ga_abuqir_street',
        name: 'شارع أبو قير (طريق الحرية)',
        district: 'شارع أبو قير · بيوت وقهاوي ومحلات',
        distanceM: 3480,
        description: 'تقاطع إشارة مرور شارع أبو قير والبيوت والقهاوي والمحلات المضيئة.',
        fareBonus: 162,
      },
      {
        id: 'ga_clock_tower',
        name: 'ميدان وبرج الساعة · الرأس السوداء (القطاع ٤)',
        district: 'طريق الرأس السوداء · ميدان الساعة',
        distanceM: 4020,
        description: 'برج الساعة الأيقوني وشارع مصطفى كامل والسيوف شماعة.',
        fareBonus: 185,
      },
      {
        id: 'ga_victoria',
        name: 'كوبري العوايد وميدان ترام فيكتوريا',
        district: 'فيكتوريا · محطة الترام الأزرق والأصفر',
        distanceM: 4700,
        description: 'ترام فيكتوريا الإسكندراني المتحرك قبل محور الانفتاح على بحر الأنفوشي.',
        fareBonus: 208,
      },
      {
        id: 'ga_anfoushi_halqa',
        name: 'حلقة سمك الأنفوشي وميناء الصيادين (القطاع ٥)',
        district: 'مدينة الأنفوشي وبحري · البحر والمراكب',
        distanceM: 5140,
        description: 'العودة للبحر وحلقة سمك الأنفوشي وزينة بحري المضيئة ومراكب الصيد.',
        fareBonus: 235,
      },
      {
        id: 'ga_ras_eltin',
        name: 'قصر رأس التين الملكي',
        district: 'الأنفوشي · قصر رأس التين',
        distanceM: 5480,
        description: 'أعمدة وبوابات قصر رأس التين التاريخية على البحر.',
        fareBonus: 258,
      },
      {
        id: 'ga_grand_finish',
        name: 'فنار الأنفوشي وقلعة قايتباي · نهاية الإسكندرية الكاملة',
        district: 'أقصى الإسكندرية · خط النهاية الكبرى',
        distanceM: 5920,
        description: 'الفنار البحري المضيء ونهاية الرحلة الكبرى التي تربط كل أحياء الإسكندرية!',
        fareBonus: 295,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 640, title: 'القطاع ١ · كورنيش الإسكندرية والمنتزه وسيدي بشر' },
      { fromM: 640, toM: 1200, title: 'القطاع ١ · كوبري ستانلي ← محور ربط أبو قير' },
      { fromM: 1200, toM: 1850, title: 'القطاع ٢ · أبو قير · القطار المعلق وملاهي المعمورة' },
      { fromM: 1850, toM: 2400, title: 'القطاع ٢ · الكلية البحرية وقلب أبو قير البلد ← محور سيدي جابر' },
      { fromM: 2400, toM: 3020, title: 'القطاع ٣ · مدينة سيدي جابر وإشارة المرور (شارع جانبي ↗)' },
      { fromM: 3020, toM: 3650, title: 'القطاع ٣ · محطة قطار سيدي جابر ← شارع أبو قير' },
      { fromM: 3650, toM: 4300, title: 'القطاع ٤ · طريق الرأس السوداء وميدان وبرج الساعة' },
      { fromM: 4300, toM: 4850, title: 'القطاع ٤ · السيوف والعوايد وترام فيكتوريا ← محور الأنفوشي' },
      { fromM: 4850, toM: 5450, title: 'القطاع ٥ · مدينة الأنفوشي · حلقة السمك ومراكب الصيد' },
      { fromM: 5450, toM: 6500, title: 'القطاع ٥ · قصر رأس التين وفنار الأنفوشي · الإسكندرية الكاملة' },
    ],
    uTurnZones: [
      { id: 'ga_ut_1', z: -70, name: 'ملف دوران بداية الكورنيش' },
      { id: 'ga_ut_2', z: -600, name: 'ملف دوران سيدي بشر قبل ستانلي' },
      { id: 'ga_ut_3', z: -1300, name: 'ملف دوران مدخل أبو قير والقطار المعلق' },
      { id: 'ga_ut_4', z: -2020, name: 'ملف دوران وسط أبو قير البلد' },
      { id: 'ga_ut_5', z: -2600, name: 'ملف دوران سيدي جابر' },
      { id: 'ga_ut_6', z: -3280, name: 'ملف دوران محطة قطار سيدي جابر' },
      { id: 'ga_ut_7', z: -3920, name: 'ملف دوران ميدان الساعة' },
      { id: 'ga_ut_8', z: -4600, name: 'ملف دوران فيكتوريا' },
      { id: 'ga_ut_9', z: -5220, name: 'ملف دوران حلقة سمك الأنفوشي' },
      { id: 'ga_ut_10', z: -5860, name: 'ملف دوران فنار الأنفوشي' },
    ],
  },
];

export function getAlexDistrictById(id?: AlexDistrictId | string): AlexDistrictDef {
  return ALEX_DISTRICTS.find((d) => d.id === id) ?? ALEX_DISTRICTS[0];
}

export const UPGRADE_INFO = {
  engine: {
    name: 'تعديل موتور الموتوسيكل',
    description: '٧ مراحل تعديل دقيقة للموتور (+٤ كم/س وعزم إضافي لكل مرحلة — القفزة الكبرى من موديل الموتوسيكل!)',
    costs: [380, 720, 1250, 1950, 2900, 4200, 5900],
    maxLevel: 7,
  },
  tank: {
    name: 'توسيع تانك البنزين',
    description: 'يقلل استهلاك البنزين ويضيف سعة أكبر لمشاوير رايح جاي على الكورنيش',
    costs: [320, 680, 1200],
    maxLevel: 3,
  },
  brakes: {
    name: 'فرامل وعفشة رياضية',
    description: 'توقف أسرع لتنزيل وركوب الزباين وتحكم أدق في ملفات الدوران والزحام الصعب',
    costs: [360, 750, 1350],
    maxLevel: 3,
  },
};

export const PASSENGER_NAMES = [
  'أستاذ مجدي',
  'الحاج سيد',
  'مدام نادية',
  'كابتن طارق',
  'آنسة سلمى',
  'عم حسن',
  'دكتور كريم',
  'الأسطى إبراهيم',
  'أستاذة دينا',
  'مهندس شريف',
];

export const PASSENGER_QUOTES = [
  'على مهلك يا بطل، الجو النهارده على الكورنيش حكاية!',
  'خلي بالك من الإشارات وعربية الحنطور اللي ماشية على اليمين.',
  'يا سلام على ريحة البحر والملفات عند العصافرة وسيدي بشر.',
  'عدّي بينا من قدام ستانلي والمكتبة بالسلامة لو سمحت.',
  'مستعجل شوية يا كابتن، هديك بقشيش حلو لو وصلنا بدري!',
  'أحلى مشوار رايح جاي على كورنيش إسكندرية والله.',
];

export const RACE_TRACKS: RaceTrackDef[] = [
  {
    id: 'corniche_express',
    name: 'مسار الكورنيش السريع',
    district: 'المندرة ← بحري',
    laps: 1,
    distanceKm: 6.1,
    lapRenderM: 3050,
    characteristic: 'طريق مستقيم وسريع يبدأ من المندرة',
    svgPath: 'M 14 54 C 28 54, 42 46, 56 36 C 70 26, 82 22, 106 16',
    startDot: [14, 54],
  },
  {
    id: 'montaza_45',
    name: 'مسار المنتزه وكوبري 45',
    district: 'المنتزه · شارع 45',
    laps: 2,
    distanceKm: 2.1,
    lapRenderM: 1050,
    characteristic: 'منعطفات حادة',
    svgPath: 'M 20 52 L 42 52 C 58 52, 58 34, 40 30 C 22 26, 26 12, 48 12 L 88 12 C 104 12, 104 34, 86 38 L 68 42 C 54 46, 62 56, 86 54 L 20 52 Z',
    startDot: [20, 52],
  },
  {
    id: 'sidi_gaber',
    name: 'مسار كوبري سيدي جابر',
    district: 'سيدي جابر · الكوبري',
    laps: 4,
    distanceKm: 1.3,
    lapRenderM: 650,
    characteristic: 'حلبة دائرية سريعة',
    svgPath: 'M 32 14 L 84 14 C 102 14, 108 32, 98 44 C 88 54, 72 52, 58 52 L 28 52 C 12 52, 12 14, 32 14 Z',
    startDot: [44, 52],
  },
  {
    id: 'smouha_suez',
    name: 'مسار سموحة وقناة السويس',
    district: 'سموحة · قناة السويس',
    laps: 2,
    distanceKm: 2.8,
    lapRenderM: 1400,
    characteristic: 'منعطفات تقنية',
    svgPath: 'M 16 48 L 36 48 C 46 48, 46 32, 56 32 L 70 32 C 80 32, 76 14, 90 14 L 102 18 C 108 26, 100 44, 84 48 C 72 52, 62 42, 48 52 L 16 48 Z',
    startDot: [18, 48],
  },
];

export const RACE_BIKES: RaceBikeDef[] = [
  {
    id: 'vespa_lv1',
    level: 1,
    name: 'نسمة بحري الكلاسيك 125cc',
    categoryLabel: 'المستوى 1 · سكوتر كلاسيك 125cc',
    difficultyLabel: 'متوسط',
    difficultyTier: 'medium',
    subtitle: 'سكوتر كلاسيك 125cc بسرعة بداية واقعية (٨٢ كم/س) وتحدي مرور حقيقي — جمّع الفلوس واشتري موديلات أسرع!',
    price: 0,
    perkTitle: 'توفير بنزين ٢٥٪ · سرعة ٨٢ كم/س',
    perkDesc: 'بداية متوسطة التحدي بسرعة سكوتر 125cc حقيقية واستهلاك بنزين أقل ٢٥٪',
    vehicleKind: 'vespa',
    paintHex: 0x0d9488,
    paintCss: '#0d9488',
    accentHex: 0xfef3c7,
    isVespa: true,
    engineSound: 'classic_vespa',
    topSpeedKmh: 82,
    accelScore: 42,
    handlingScore: 86,
    speedBonus: 0,
    accelBonus: 0,
    handlingBonus: 10,
    fareMultiplier: 1.0,
    fuelSaver: 0.25,
    tankBonus: 0,
    brakeBonus: 6,
    armorBonus: 0,
    nearMissMultiplier: 1.0,
    patienceBonus: 2,
  },
  {
    id: 'boxer_lv2',
    level: 2,
    name: 'نجم المشاوير 150cc',
    categoryLabel: 'المستوى 2 · دراجة 150cc',
    difficultyLabel: 'تحدي',
    difficultyTier: 'medium',
    subtitle: 'دراجة 150cc عملية بسرعة ١١٠ كم/س وسحب أنشط وسط زحام الكورنيش والمشاوير السريعة',
    price: 1150,
    perkTitle: 'سرعة ١١٠ كم/س · أجرة +٢٠٪',
    perkDesc: 'أسرع من السكوتر بوضوح مع أجرة وبقشيش +٢٠٪ وزحام أشد على الطريق',
    vehicleKind: 'vespa',
    paintHex: 0xdc2626,
    paintCss: '#dc2626',
    accentHex: 0xf8fafc,
    isVespa: false,
    engineSound: 'classic_vespa',
    topSpeedKmh: 110,
    accelScore: 54,
    handlingScore: 88,
    speedBonus: 28,
    accelBonus: 10,
    handlingBonus: 12,
    fareMultiplier: 1.2,
    fuelSaver: 0.16,
    tankBonus: 14,
    brakeBonus: 10,
    armorBonus: 10,
    nearMissMultiplier: 1.15,
    patienceBonus: -1,
  },
  {
    id: 'dayun_lv3',
    level: 3,
    name: 'سهم المندرة 200cc',
    categoryLabel: 'المستوى 3 · ستريت 200cc',
    difficultyLabel: 'صعب',
    difficultyTier: 'hard',
    subtitle: 'موديل ستريت 200cc بسرعة ١٤٢ كم/س وتانك واسع مع مرور سريع وعربيات بتكسر حارات قدامك!',
    price: 2600,
    perkTitle: 'سرعة ١٤٢ كم/س · أجرة ×١.٤',
    perkDesc: 'قفزة قوية في السرعة والعزم لمحرك 200cc مع تانك +٣٠٪ وأجرة ×١.٤',
    vehicleKind: 'vespa',
    paintHex: 0x0284c7,
    paintCss: '#0284c7',
    accentHex: 0xe0f2fe,
    isVespa: false,
    engineSound: 'race_sport',
    topSpeedKmh: 142,
    accelScore: 66,
    handlingScore: 89,
    speedBonus: 60,
    accelBonus: 20,
    handlingBonus: 14,
    fareMultiplier: 1.4,
    fuelSaver: 0.18,
    tankBonus: 30,
    brakeBonus: 15,
    armorBonus: 16,
    nearMissMultiplier: 1.3,
    patienceBonus: -4,
  },
  {
    id: 'benelli_lv4',
    level: 4,
    name: 'رعد ستانلي 300cc',
    categoryLabel: 'المستوى 4 · ستريت فايتر 300cc',
    difficultyLabel: 'صعب جداً',
    difficultyTier: 'hard',
    subtitle: 'ستريت فايتر 300cc بسرعة ١٧٨ كم/س وفرامل حادة لمواجهة الزحام الصعب وملفات الدوران السريعة',
    price: 4800,
    perkTitle: 'سرعة ١٧٨ كم/س · أجرة ×١.٦٥',
    perkDesc: 'أداء رياضي 300cc حقيقي مع فرامل فورية وأرباح مشاوير ×١.٦٥ وسط مرور كثيف',
    vehicleKind: 'vespa',
    paintHex: 0xeab308,
    paintCss: '#eab308',
    accentHex: 0x111827,
    isVespa: false,
    engineSound: 'race_sport',
    topSpeedKmh: 178,
    accelScore: 76,
    handlingScore: 92,
    speedBonus: 96,
    accelBonus: 32,
    handlingBonus: 17,
    fareMultiplier: 1.65,
    fuelSaver: 0.16,
    tankBonus: 26,
    brakeBonus: 26,
    armorBonus: 22,
    nearMissMultiplier: 1.45,
    patienceBonus: -7,
  },
  {
    id: 'yamaha_lv5',
    level: 5,
    name: 'موجة المتوسط 600cc',
    categoryLabel: 'المستوى 5 · سوبر سبورت 600cc',
    difficultyLabel: 'ناري',
    difficultyTier: 'hard',
    subtitle: 'سوبر سبورت 600cc بسرعة ٢٢٢ كم/س — تحدي سرعة ناري وسط زحمة كثيفة ومكافآت تغريز ضخمة!',
    price: 7900,
    perkTitle: 'سرعة ٢٢٢ كم/س · تغريز +٦٥٪',
    perkDesc: 'محرك 600cc رياضي بسرعة خارقة وأجرة ×١.٩٠ ومكافآت تغريز عالية',
    vehicleKind: 'vespa',
    paintHex: 0x1d4ed8,
    paintCss: '#1d4ed8',
    accentHex: 0xfacc15,
    isVespa: false,
    engineSound: 'race_sport',
    topSpeedKmh: 222,
    accelScore: 86,
    handlingScore: 93,
    speedBonus: 140,
    accelBonus: 46,
    handlingBonus: 19,
    fareMultiplier: 1.9,
    fuelSaver: 0.2,
    tankBonus: 30,
    brakeBonus: 32,
    armorBonus: 28,
    nearMissMultiplier: 1.65,
    patienceBonus: -10,
  },
  {
    id: 'alex_hero_lv6',
    level: 6,
    name: 'شبح الإسكندرية الكربوني 1000cc',
    categoryLabel: 'المستوى 6 · سوبر بايك 1000cc',
    difficultyLabel: 'احترافي',
    difficultyTier: 'expert',
    subtitle: 'وحش كربوني 1000cc بسرعة ٢٦٨ كم/س للمحترفين بعزم جبار ومشاوير VIP متلاحقة وزحام قاتل!',
    price: 12500,
    perkTitle: 'سرعة ٢٦٨ كم/س · أجرة VIP ×٢.٢٥',
    perkDesc: 'سوبر بايك 1000cc بتسارع ناري وأجرة ×٢.٢٥ وتحمّل صدمات +٣٥',
    vehicleKind: 'black_supermoto',
    paintHex: 0x111827,
    paintCss: '#111827',
    accentHex: 0x3b82f6,
    isVespa: false,
    engineSound: 'race_sport',
    topSpeedKmh: 268,
    accelScore: 94,
    handlingScore: 95,
    speedBonus: 186,
    accelBonus: 62,
    handlingBonus: 22,
    fareMultiplier: 2.25,
    fuelSaver: 0.24,
    tankBonus: 40,
    brakeBonus: 38,
    armorBonus: 35,
    nearMissMultiplier: 1.85,
    patienceBonus: -13,
  },
  {
    id: 'hyper_h2r_lv7',
    level: 7,
    name: 'أسطورة الكورنيش الذهبي H2R',
    categoryLabel: 'المستوى 7 · هايبر بايك H2R الأسطوري',
    difficultyLabel: 'أسطوري',
    difficultyTier: 'expert',
    subtitle: 'أقوى وأسرع موتوسيكل في اللعبة بالكامل (٣٢٠ كم/س) — أصعب مستوى وتحدي أسطوري بأعلى أرباح ×٢.٧٥!',
    price: 19500,
    perkTitle: 'أقوى سرعة ٣٢٠ كم/س · أجرة ×٢.٧٥',
    perkDesc: 'وحش هايبر بايك H2R بأقوى سرعة وعزم في اللعبة وأعلى مكافآت تغريز وأجرة',
    vehicleKind: 'black_supermoto',
    paintHex: 0x18181b,
    paintCss: '#18181b',
    accentHex: 0xf59e0b,
    isVespa: false,
    engineSound: 'race_sport',
    topSpeedKmh: 320,
    accelScore: 100,
    handlingScore: 98,
    speedBonus: 238,
    accelBonus: 82,
    handlingBonus: 26,
    fareMultiplier: 2.75,
    fuelSaver: 0.3,
    tankBonus: 54,
    brakeBonus: 46,
    armorBonus: 50,
    nearMissMultiplier: 2.25,
    patienceBonus: -16,
  },
];

export const MOTO_MODELS = RACE_BIKES;

export function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getMotoById(id?: string): RaceBikeDef {
  return RACE_BIKES.find((b) => b.id === id) ?? RACE_BIKES[0];
}

const STORAGE_KEY = 'alex_taxi_progress_v3';
const CONTROLS_KEY = 'alex_taxi_controls_v1';
const RACE_CONFIG_KEY = 'alex_taxi_race_cfg_v1';

export const DEFAULT_MOTO_TUNING: MotoTuningConfig = {
  chassis: 'sport',
  underglowColor: '#3b82f6',
  angelEyeColor: '#3b82f6',
  rimLedColor: null,
  strobesEnabled: false,
  ledSign: 'arees',
  bodyColor: '#111827',
  rimColor: '#d1d5db',
  seatColor: '#111317',
  paintFinish: 'glossy',
  exhaustStyle: 'stock',
  sportMirrors: false,
  youthStickers: false,
  extraRacks: false,
  engineSound: 'race_sport',
  hornSound: 'sport',
};

export const DEFAULT_OWNED_MOTO_PARTS: string[] = [
  'underglow:none',
  'underglow:#3b82f6',
  'angelEye:none',
  'angelEye:#3b82f6',
  'rimLed:none',
  'ledSign:none',
  'ledSign:arees',
  'body:#111827',
  'body:#dc2626',
  'rim:#d1d5db',
  'seat:#111317',
  'finish:glossy',
  'exhaust:stock',
  'engine:race_sport',
  'engine:classic_vespa',
  'horn:sport',
  'horn:classic',
];

export const DEFAULT_PROGRESS: PlayerProgress = {
  wallet: 450,
  dailyEarnings: 0,
  dailyTrips: 0,
  dailyDate: getTodayDateKey(),
  totalPoints: 0,
  bestEarnings: 0,
  bestTrips: 0,
  totalTrips: 0,
  mandaraCompletedCount: 0,
  taxiLevel: 1,
  selectedDistrictId: 'corniche',
  unlockedDistricts: ['corniche'],
  selectedMotoId: 'vespa_lv1',
  unlockedMotos: ['vespa_lv1'],
  upgrades: {
    engine: 0,
    tank: 0,
    brakes: 0,
  },
  bestRaceTimes: {},
  motoTuning: { ...DEFAULT_MOTO_TUNING },
  ownedMotoParts: [...DEFAULT_OWNED_MOTO_PARTS],
};

export const DEFAULT_CONTROLS: ControlSettings = {
  steering: 'touch',
  gas: 'manual',
  sensitivity: 3,
};

export const DEFAULT_RACE_CONFIG: RaceConfig = {
  subMode: 'race',
  trackId: 'corniche_express',
  bikeId: 'vespa_lv1',
  difficulty: 'medium',
  graphicsQuality: 'high',
};

export function loadProgress(): PlayerProgress {
  try {
    const today = getTodayDateKey();
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem('alex_taxi_progress_v2') ||
      window.localStorage.getItem('alex_taxi_progress_v1');
    if (!raw) return { ...DEFAULT_PROGRESS, dailyDate: today };
    const parsed = JSON.parse(raw) as Partial<PlayerProgress> & {
      stanleyCompletedCount?: number;
      abouQirCompletedCount?: number;
      unlockedTaxis?: string[];
    };
    const mergedOwned = Array.from(
      new Set([...DEFAULT_OWNED_MOTO_PARTS, ...(Array.isArray(parsed.ownedMotoParts) ? parsed.ownedMotoParts : [])]),
    );
    const validMotoIds = new Set<string>(RACE_BIKES.map((b) => b.id));
    const parsedUnlockedMotos = Array.isArray(parsed.unlockedMotos)
      ? parsed.unlockedMotos.filter((id): id is RaceBikeId => validMotoIds.has(id))
      : [];
    const unlockedMotos: RaceBikeId[] = Array.from(new Set<RaceBikeId>(['vespa_lv1', ...parsedUnlockedMotos]));
    const selectedMotoId: RaceBikeId =
      parsed.selectedMotoId && unlockedMotos.includes(parsed.selectedMotoId)
        ? parsed.selectedMotoId
        : unlockedMotos[unlockedMotos.length - 1] ?? 'vespa_lv1';

    // Migrate legacy multi-taxi saves cleanly into the single 7-level self-evolving Taxi
    let taxiLevel = typeof parsed.taxiLevel === 'number' ? parsed.taxiLevel : 1;
    if (!parsed.taxiLevel && Array.isArray(parsed.unlockedTaxis)) {
      if (parsed.unlockedTaxis.includes('modern')) taxiLevel = 3;
      else if (parsed.unlockedTaxis.includes('lada2107')) taxiLevel = 2;
    }
    taxiLevel = Math.max(1, Math.min(MAX_TAXI_LEVEL, Math.round(taxiLevel)));

    const validDistrictIds = new Set<string>(ALEX_DISTRICTS.map((d) => d.id));
    const parsedDistricts = Array.isArray(parsed.unlockedDistricts)
      ? parsed.unlockedDistricts.filter((id): id is AlexDistrictId => validDistrictIds.has(id))
      : [];
    const unlockedDistricts: AlexDistrictId[] = Array.from(
      new Set<AlexDistrictId>(['corniche', ...parsedDistricts]),
    );
    const selectedDistrictId: AlexDistrictId =
      parsed.selectedDistrictId && unlockedDistricts.includes(parsed.selectedDistrictId)
        ? parsed.selectedDistrictId
        : 'corniche';

    const isSameDay = parsed.dailyDate === today;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      dailyDate: today,
      dailyEarnings: isSameDay ? (parsed.dailyEarnings ?? 0) : 0,
      dailyTrips: isSameDay ? (parsed.dailyTrips ?? 0) : 0,
      totalPoints: parsed.totalPoints ?? 0,
      mandaraCompletedCount:
        parsed.mandaraCompletedCount ?? parsed.stanleyCompletedCount ?? parsed.abouQirCompletedCount ?? 0,
      taxiLevel,
      selectedDistrictId,
      unlockedDistricts,
      selectedMotoId,
      unlockedMotos,
      upgrades: {
        ...DEFAULT_PROGRESS.upgrades,
        ...(parsed.upgrades ?? {}),
      },
      bestRaceTimes: parsed.bestRaceTimes ?? {},
      motoTuning: {
        ...DEFAULT_MOTO_TUNING,
        ...(parsed.motoTuning ?? {}),
      },
      ownedMotoParts: mergedOwned,
    };
  } catch {
    return { ...DEFAULT_PROGRESS, dailyDate: getTodayDateKey() };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadControlSettings(): ControlSettings {
  try {
    const raw = window.localStorage.getItem(CONTROLS_KEY);
    if (!raw) return DEFAULT_CONTROLS;
    const parsed = JSON.parse(raw) as Partial<ControlSettings>;
    return {
      steering: parsed.steering === 'joystick' || parsed.steering === 'tilt' ? parsed.steering : 'touch',
      gas: parsed.gas === 'auto' ? 'auto' : 'manual',
      sensitivity: Math.min(5, Math.max(1, Math.round(parsed.sensitivity ?? 3))),
    };
  } catch {
    return DEFAULT_CONTROLS;
  }
}

export function saveControlSettings(settings: ControlSettings): void {
  try {
    window.localStorage.setItem(CONTROLS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadRaceConfig(): RaceConfig {
  try {
    const raw = window.localStorage.getItem(RACE_CONFIG_KEY);
    if (!raw) return DEFAULT_RACE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<RaceConfig>;
    return {
      subMode: parsed.subMode === 'practice' ? 'practice' : 'race',
      trackId: RACE_TRACKS.some((t) => t.id === parsed.trackId) ? parsed.trackId! : 'corniche_express',
      bikeId: RACE_BIKES.some((b) => b.id === parsed.bikeId) ? parsed.bikeId! : 'vespa_lv1',
      difficulty: parsed.difficulty === 'easy' || parsed.difficulty === 'pro' ? parsed.difficulty : 'medium',
      graphicsQuality:
        parsed.graphicsQuality === 'low' || parsed.graphicsQuality === 'medium'
          ? parsed.graphicsQuality
          : 'high',
    };
  } catch {
    return DEFAULT_RACE_CONFIG;
  }
}

export function saveRaceConfig(cfg: RaceConfig): void {
  try {
    window.localStorage.setItem(RACE_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage quota errors
  }
}

export const POLICE_RANKS: PoliceRankDef[] = [
  { id: 'private', title: 'عسكري', minPoints: 0, stars: 1 },
  { id: 'corporal', title: 'عريف', minPoints: 250, stars: 2 },
  { id: 'sergeant', title: 'رقيب', minPoints: 650, stars: 3 },
  { id: 'staff_sgt', title: 'أمين شرطة', minPoints: 1200, stars: 4 },
  { id: 'lieutenant', title: 'ملازم', minPoints: 2000, stars: 5 },
  { id: 'captain', title: 'نقيب', minPoints: 3200, stars: 6 },
  { id: 'major', title: 'رائد', minPoints: 4800, stars: 7 },
  { id: 'colonel', title: 'عقيد', minPoints: 7000, stars: 8 },
];

export function getPoliceRankStatus(totalPoints: number): {
  current: PoliceRankDef;
  next: PoliceRankDef | null;
  progressPct: number;
} {
  let current = POLICE_RANKS[0];
  let next: PoliceRankDef | null = POLICE_RANKS[1] ?? null;
  for (let i = 0; i < POLICE_RANKS.length; i++) {
    if (totalPoints >= POLICE_RANKS[i].minPoints) {
      current = POLICE_RANKS[i];
      next = POLICE_RANKS[i + 1] ?? null;
    }
  }
  if (!next) {
    return { current, next: null, progressPct: 100 };
  }
  const span = Math.max(1, next.minPoints - current.minPoints);
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((totalPoints - current.minPoints) / span) * 100)),
  );
  return { current, next, progressPct };
}

const CHECKPOINT_CONFIG_KEY = 'alex_taxi_checkpoint_cfg_v1';

export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  teamMode: 'with_team',
  graphicsQuality: 'high',
};

export function loadCheckpointConfig(): CheckpointConfig {
  try {
    const raw = window.localStorage.getItem(CHECKPOINT_CONFIG_KEY);
    if (!raw) return DEFAULT_CHECKPOINT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<CheckpointConfig>;
    return {
      teamMode: parsed.teamMode === 'alone' ? 'alone' : 'with_team',
      graphicsQuality:
        parsed.graphicsQuality === 'low' || parsed.graphicsQuality === 'medium'
          ? parsed.graphicsQuality
          : 'high',
    };
  } catch {
    return DEFAULT_CHECKPOINT_CONFIG;
  }
}

export function saveCheckpointConfig(cfg: CheckpointConfig): void {
  try {
    window.localStorage.setItem(CHECKPOINT_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatRaceTime(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  const whole = Math.floor(rem);
  const cs = Math.floor((rem - whole) * 100);
  return `${String(mins).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

const CHECKPOINT_DRIVER_NAMES = [
  'أحمد محمود الشهاوي',
  'كريم عادل الإسكندراني',
  'سيد إبراهيم الحداد',
  'مصطفى حسن السويسي',
  'طارق محمد المنسي',
  'يوسف سمير الغريب',
  'هشام علي القبطان',
  'عمرو فتحي الدمنهوري',
  'وليد جمال النجار',
  'خالد عصام بحري',
];

const SKIN_TONES: { css: string; hex: number }[] = [
  { css: '#f1c29d', hex: 0xf1c29d },
  { css: '#dfa378', hex: 0xdfa378 },
  { css: '#c07e54', hex: 0xc07e54 },
  { css: '#915737', hex: 0x915737 },
];

const HAIR_OPTIONS: { style: DriverAppearance['hairStyle']; css: string; hex: number }[] = [
  { style: 'short', css: '#1e1b18', hex: 0x1e1b18 },
  { style: 'curly', css: '#3b2417', hex: 0x3b2417 },
  { style: 'cap', css: '#1e3a8a', hex: 0x1e3a8a },
  { style: 'short', css: '#7c8494', hex: 0x7c8494 },
  { style: 'bald', css: '#1e1b18', hex: 0x1e1b18 },
];

const SHIRT_OPTIONS: { css: string; hex: number }[] = [
  { css: '#2563eb', hex: 0x2563eb },
  { css: '#dc2626', hex: 0xdc2626 },
  { css: '#0f766e', hex: 0x0f766e },
  { css: '#d97706', hex: 0xd97706 },
  { css: '#475569', hex: 0x475569 },
];

function makeRandomAppearance(seed: number): DriverAppearance {
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const hair = HAIR_OPTIONS[(seed * 3 + 1) % HAIR_OPTIONS.length];
  const shirt = SHIRT_OPTIONS[(seed * 5 + 2) % SHIRT_OPTIONS.length];
  return {
    skinHex: skin.css,
    skinThreeHex: skin.hex,
    hairStyle: hair.style,
    hairHex: hair.css,
    hairThreeHex: hair.hex,
    hasGlasses: (seed % 3) === 0,
    hasBeard: (seed % 2) === 1,
    shirtHex: shirt.css,
    shirtThreeHex: shirt.hex,
  };
}

export function generateCheckpointInspection(
  vehicleKind: 'sedan' | 'taxi' | 'suv' | 'microbus' | 'motorcycle',
  plate: string,
  speedKmh: number,
): CheckpointInspectionData {
  const vehicleLabels: Record<CheckpointInspectionData['vehicleKind'], string> = {
    sedan: 'سيارة ملاكي',
    taxi: 'تاكسي أجرة الإسكندرية',
    suv: 'سيارة دفع رباعي (ملاكي)',
    microbus: 'ميكروباص أجرة (مشروع)',
    motorcycle: 'موتوسيكل (دراجة نارية)',
  };

  const correctClassByKind: Record<CheckpointInspectionData['vehicleKind'], string> = {
    sedan: 'خاصة (ملاكي)',
    suv: 'خاصة (ملاكي)',
    taxi: 'مهنية درجة ثالثة (أجرة)',
    microbus: 'مهنية درجة أولى (ميكروباص)',
    motorcycle: 'دراجة نارية',
  };

  const wrongClassByKind: Record<CheckpointInspectionData['vehicleKind'], string> = {
    sedan: 'دراجة نارية فقط',
    suv: 'دراجة نارية فقط',
    taxi: 'خاصة (ملاكي) — لا تصلح للأجرة',
    microbus: 'خاصة (ملاكي) — لا تصلح للمشروع',
    motorcycle: 'خاصة (ملاكي) — بدون تصريح دراجة',
  };

  // Pick fault type
  const roll = Math.random();
  let faultType: InspectionFaultType = 'none';
  if (vehicleKind === 'motorcycle') {
    if (roll < 0.34) faultType = 'none';
    else if (roll < 0.58) faultType = 'expired';
    else if (roll < 0.82) faultType = 'wrong_class';
    else faultType = 'fake_photo';
  } else {
    if (roll < 0.34) faultType = 'none';
    else if (roll < 0.54) faultType = 'expired';
    else if (roll < 0.72) faultType = 'wrong_class';
    else if (roll < 0.87) faultType = 'fake_photo';
    else faultType = 'contraband';
  }

  const seed = Math.floor(Math.random() * 1000);
  const realDriver = makeRandomAppearance(seed);

  // Contrasting fake photo appearance so visual comparison is unmistakable
  let licensePhotoDriver: DriverAppearance = { ...realDriver };
  if (faultType === 'fake_photo') {
    const altSkin = SKIN_TONES[(seed + 2) % SKIN_TONES.length];
    const altHairStyles: DriverAppearance['hairStyle'][] = ['bald', 'cap', 'curly', 'short'];
    const altStyle =
      altHairStyles.find((s) => s !== realDriver.hairStyle) ?? 'cap';
    licensePhotoDriver = {
      skinHex: altSkin.css,
      skinThreeHex: altSkin.hex,
      hairStyle: altStyle,
      hairHex: altStyle === 'cap' ? '#b91c1c' : '#cbd5e1',
      hairThreeHex: altStyle === 'cap' ? 0xb91c1c : 0xcbd5e1,
      hasGlasses: !realDriver.hasGlasses,
      hasBeard: !realDriver.hasBeard,
      shirtHex: '#e11d48',
      shirtThreeHex: 0xe11d48,
    };
  }

  const isExpired = faultType === 'expired';
  const expiredDates = ['2022/04/18', '2023/09/05', '2024/11/22', '2025/02/10'];
  const validDates = ['2027/08/14', '2028/03/29', '2029/11/06', '2030/05/19'];
  const issueYear = isExpired ? 2018 + (seed % 3) : 2023 + (seed % 3);
  const issueDate = `${issueYear}/${String(1 + (seed % 11)).padStart(2, '0')}/${String(10 + (seed % 18)).padStart(2, '0')}`;
  const expiryDate = isExpired
    ? expiredDates[seed % expiredDates.length]
    : validDates[seed % validDates.length];

  const classMatchesVehicle = faultType !== 'wrong_class';
  const licenseClass = classMatchesVehicle
    ? correctClassByKind[vehicleKind]
    : wrongClassByKind[vehicleKind];

  const photoMatchesDriver = faultType !== 'fake_photo';
  const hasContraband = faultType === 'contraband';
  const contrabandNotes = [
    'أسلحة بيضاء وعبوات محظورة مخبأة',
    'بضاعة مهربة غير مرخصة بالشنطة',
    'مواد مخالفة ومحظورات خطرة',
  ];
  const contrabandNote = hasContraband
    ? contrabandNotes[seed % contrabandNotes.length]
    : 'الشنطة فارغة وسليمة تماماً';

  let expectedField: LicenseFieldId | null = null;
  let expectedVerdict: InspectionVerdict = 'pass';
  let faultSummary = 'كل الأوراق مطابقة والشنطة سليمة';

  if (faultType === 'expired') {
    expectedField = 'expiry';
    expectedVerdict = 'ticket';
    faultSummary = `تاريخ الرخصة منتهي (${expiryDate})`;
  } else if (faultType === 'wrong_class') {
    expectedField = 'class';
    expectedVerdict = 'withdraw';
    faultSummary = `درجة الرخصة (${licenseClass}) لا تناسب ${vehicleLabels[vehicleKind]}`;
  } else if (faultType === 'fake_photo') {
    expectedField = 'photo';
    expectedVerdict = 'arrest';
    faultSummary = 'الصورة على الرخصة مزورة ولا تطابق وجه السائق!';
  } else if (faultType === 'contraband') {
    expectedField = 'trunk';
    expectedVerdict = 'arrest';
    faultSummary = `ممنوعات بالشنطة: ${contrabandNote}`;
  }

  return {
    plate,
    vehicleKind,
    vehicleLabel: vehicleLabels[vehicleKind],
    speedKmh,
    driverName: CHECKPOINT_DRIVER_NAMES[seed % CHECKPOINT_DRIVER_NAMES.length],
    nationalId: `29${1 + (seed % 8)}0${1 + (seed % 9)}02${100000 + Math.floor(Math.random() * 889999)}`,
    licenseNumber: `ALEX-${410000 + Math.floor(Math.random() * 580000)}`,
    issueDate,
    expiryDate,
    isExpired,
    licenseClass,
    classMatchesVehicle,
    realDriver,
    licensePhotoDriver,
    photoMatchesDriver,
    hasContraband,
    contrabandNote,
    faultType,
    expectedField,
    expectedVerdict,
    faultSummary,
  };
}

// ============================================================================
// ALEXANDRIA HERO — MOTORCYCLE & VESPA GARAGE TUNING CATALOG
// ============================================================================

export interface TuningColorOption {
  id: string;
  hex: string | null;
  label: string;
  price: number;
}

export const NEON_COLOR_OPTIONS: TuningColorOption[] = [
  { id: 'none', hex: null, label: 'إيقاف', price: 0 },
  { id: '#3b82f6', hex: '#3b82f6', label: 'أزرق', price: 0 },
  { id: '#ef4444', hex: '#ef4444', label: 'أحمر', price: 90 },
  { id: '#22c55e', hex: '#22c55e', label: 'أخضر', price: 90 },
  { id: '#a855f7', hex: '#a855f7', label: 'بنفسجي', price: 110 },
  { id: '#facc15', hex: '#facc15', label: 'ذهبي', price: 130 },
];

export const RIM_LED_COLOR_OPTIONS: TuningColorOption[] = [
  { id: 'none', hex: null, label: 'بدون', price: 0 },
  { id: '#3b82f6', hex: '#3b82f6', label: 'أزرق', price: 85 },
  { id: '#ef4444', hex: '#ef4444', label: 'أحمر', price: 85 },
  { id: '#22c55e', hex: '#22c55e', label: 'أخضر', price: 85 },
  { id: '#a855f7', hex: '#a855f7', label: 'بنفسجي', price: 95 },
  { id: '#facc15', hex: '#facc15', label: 'ذهبي', price: 110 },
];

export const LED_SIGN_OPTIONS: {
  id: LedSignId;
  text: string;
  glowHex: string;
  price: number;
}[] = [
  { id: 'none', text: 'بدون لافتة', glowHex: '#64748b', price: 0 },
  { id: 'arees', text: 'بطل الإسكندرية', glowHex: '#38bdf8', price: 0 },
  { id: 'mashallah', text: 'ما شاء الله', glowHex: '#22c55e', price: 100 },
  { id: 'king', text: 'ملك الكورنيش', glowHex: '#facc15', price: 140 },
  { id: 'protect', text: 'ربنا يحميك', glowHex: '#a855f7', price: 120 },
];

export const BODY_PAINT_OPTIONS: { hex: string; label: string; price: number }[] = [
  { hex: '#111827', label: 'أسود ليلي', price: 0 },
  { hex: '#dc2626', label: 'أحمر سباق', price: 0 },
  { hex: '#1d4ed8', label: 'أزرق بحري', price: 95 },
  { hex: '#0d9488', label: 'فيروزي بحري', price: 95 },
  { hex: '#facc15', label: 'أصفر ذهبي', price: 120 },
  { hex: '#f8fafc', label: 'أبيض لؤلؤي', price: 110 },
  { hex: '#16a34a', label: 'أخضر زمردي', price: 115 },
  { hex: '#7c3aed', label: 'بنفسجي ملكي', price: 140 },
];

export const RIM_PAINT_OPTIONS: { hex: string; label: string; price: number }[] = [
  { hex: '#d1d5db', label: 'فضي كروم', price: 0 },
  { hex: '#0f172a', label: 'أسود كربون', price: 65 },
  { hex: '#f59e0b', label: 'ذهبي رياضي', price: 95 },
  { hex: '#ef4444', label: 'أحمر لامع', price: 85 },
  { hex: '#38bdf8', label: 'أزرق سماوي', price: 85 },
];

export const SEAT_COLOR_OPTIONS: { hex: string; label: string; price: number }[] = [
  { hex: '#111317', label: 'جلد أسود', price: 0 },
  { hex: '#78350f', label: 'جملي كلاسيك', price: 60 },
  { hex: '#991b1b', label: 'نبيتي فاخر', price: 80 },
  { hex: '#e2e8f0', label: 'أبيض رياضي', price: 80 },
];

export const PAINT_FINISH_OPTIONS: {
  id: PaintFinishType;
  label: string;
  subtitle: string;
  price: number;
}[] = [
  { id: 'glossy', label: 'لامع', subtitle: 'Glossy', price: 0 },
  { id: 'matte', label: 'مطفي', subtitle: 'Matte', price: 110 },
  { id: 'metallic', label: 'معدني', subtitle: 'Metallic', price: 160 },
];

export const EXHAUST_OPTIONS: {
  id: ExhaustStyleType;
  label: string;
  subtitle: string;
  sparkDesc: string;
  price: number;
}[] = [
  {
    id: 'stock',
    label: 'شكمان قياسي',
    subtitle: 'أصلي هادئ',
    sparkDesc: 'شرار خفيف عند أقصى عزم',
    price: 0,
  },
  {
    id: 'carbon',
    label: 'رياضي كربون',
    subtitle: 'Carbon Racing',
    sparkDesc: 'شرارات رياضية ذهبية مع التروس',
    price: 180,
  },
  {
    id: 'dual_chrome',
    label: 'كروم مزدوج',
    subtitle: 'Dual Chrome',
    sparkDesc: 'شرارات مزدوجة من الشكمانين!',
    price: 260,
  },
];

export const BLING_ACCESSORY_PRICES = {
  strobes: 120,
  sportMirrors: 110,
  youthStickers: 95,
  extraRacks: 105,
};

export const ENGINE_SOUND_OPTIONS: {
  id: EngineSoundProfile;
  label: string;
  subtitle: string;
  price: number;
}[] = [
  {
    id: 'race_sport',
    label: 'صوت ريس رياضي عالي',
    subtitle: '4 سلندر حاد مع نقلة تروس سريعة',
    price: 0,
  },
  {
    id: 'classic_vespa',
    label: 'صوت سكوتر كلاسيكي',
    subtitle: 'نغمة إسكندراني أصلي 2 ستروك',
    price: 0,
  },
];

export const HORN_SOUND_OPTIONS: {
  id: HornSoundProfile;
  label: string;
  subtitle: string;
  price: number;
}[] = [
  { id: 'sport', label: 'كلاكس رياضي حاد', subtitle: 'نغمة سريعة للتنبيه', price: 0 },
  { id: 'classic', label: 'كلاكس سكوتر كلاسيك', subtitle: 'نغمة إسكندراني أصلي', price: 0 },
  { id: 'melody', label: 'سرينة إسكندراني نغمتين', subtitle: 'نغمة أفراح الكورنيش', price: 110 },
  { id: 'air', label: 'كلاكس هوائي قوي', subtitle: 'صوت ضخم يفتح الطريق', price: 140 },
];

export interface UnownedTuningItem {
  key: string;
  label: string;
  price: number;
}

export function computeUnownedTuningItems(
  tuning: MotoTuningConfig,
  ownedParts: string[],
): UnownedTuningItem[] {
  const owned = new Set(ownedParts);
  const items: UnownedTuningItem[] = [];

  const check = (key: string, label: string, price: number) => {
    if (price > 0 && !owned.has(key)) {
      items.push({ key, label, price });
    }
  };

  if (tuning.underglowColor) {
    const opt = NEON_COLOR_OPTIONS.find((o) => o.hex === tuning.underglowColor);
    if (opt) check(`underglow:${opt.id}`, `نيون سفلي (${opt.label})`, opt.price);
  }
  if (tuning.angelEyeColor) {
    const opt = NEON_COLOR_OPTIONS.find((o) => o.hex === tuning.angelEyeColor);
    if (opt) check(`angelEye:${opt.id}`, `عيون ملاك (${opt.label})`, opt.price);
  }
  if (tuning.rimLedColor) {
    const opt = RIM_LED_COLOR_OPTIONS.find((o) => o.hex === tuning.rimLedColor);
    if (opt) check(`rimLed:${opt.id}`, `لمبات جنوط (${opt.label})`, opt.price);
  }
  if (tuning.strobesEnabled) {
    check('strobes:on', 'فلاشرات أمامية', BLING_ACCESSORY_PRICES.strobes);
  }
  if (tuning.ledSign !== 'none') {
    const opt = LED_SIGN_OPTIONS.find((o) => o.id === tuning.ledSign);
    if (opt) check(`ledSign:${opt.id}`, `لافتة (${opt.text})`, opt.price);
  }

  const bodyOpt = BODY_PAINT_OPTIONS.find((o) => o.hex === tuning.bodyColor);
  if (bodyOpt) check(`body:${bodyOpt.hex}`, `دهان الهيكل (${bodyOpt.label})`, bodyOpt.price);

  const rimOpt = RIM_PAINT_OPTIONS.find((o) => o.hex === tuning.rimColor);
  if (rimOpt) check(`rim:${rimOpt.hex}`, `لون الجنوط (${rimOpt.label})`, rimOpt.price);

  const seatOpt = SEAT_COLOR_OPTIONS.find((o) => o.hex === tuning.seatColor);
  if (seatOpt) check(`seat:${seatOpt.hex}`, `لون المقعد (${seatOpt.label})`, seatOpt.price);

  const finishOpt = PAINT_FINISH_OPTIONS.find((o) => o.id === tuning.paintFinish);
  if (finishOpt) check(`finish:${finishOpt.id}`, `طلاء ${finishOpt.label}`, finishOpt.price);

  const exOpt = EXHAUST_OPTIONS.find((o) => o.id === tuning.exhaustStyle);
  if (exOpt) check(`exhaust:${exOpt.id}`, exOpt.label, exOpt.price);

  if (tuning.sportMirrors) {
    check('bling:sportMirrors', 'مرايا رياضية', BLING_ACCESSORY_PRICES.sportMirrors);
  }
  if (tuning.youthStickers) {
    check('bling:youthStickers', 'ملصقات شبابية', BLING_ACCESSORY_PRICES.youthStickers);
  }
  if (tuning.extraRacks) {
    check('bling:extraRacks', 'حوامل إضافية', BLING_ACCESSORY_PRICES.extraRacks);
  }

  const hornOpt = HORN_SOUND_OPTIONS.find((o) => o.id === tuning.hornSound);
  if (hornOpt) check(`horn:${hornOpt.id}`, hornOpt.label, hornOpt.price);

  return items;
}

