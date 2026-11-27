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

export const CORNICHE_ROUTE_LENGTH_M = 10280;
export const MANDARA_FINISH_M = 10000;

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
  { fromM: 0, toM: 600, title: '1. المنتزه (قصر المنتزه) · نقطة البداية' },
  { fromM: 600, toM: 1200, title: '2. العصافرة · الكورنيش' },
  { fromM: 1200, toM: 1600, title: '3. ميامي · شاطئ ميامي' },
  { fromM: 1600, toM: 2000, title: '4. سيدي بشر · مسجد سيدي بشر' },
  { fromM: 2000, toM: 2400, title: '5. السرايا · الكورنيش' },
  { fromM: 2400, toM: 2800, title: '6. لوران · طريق الجيش' },
  { fromM: 2800, toM: 3200, title: '7. ثروت · الكورنيش' },
  { fromM: 3200, toM: 3600, title: '8. سان ستيفانو · جراند بلازا' },
  { fromM: 3600, toM: 4000, title: '9. جليم · جليم باي' },
  { fromM: 4000, toM: 4400, title: '10. سابا باشا · الكورنيش' },
  { fromM: 4400, toM: 4800, title: '11. ستانلي · كوبري ستانلي' },
  { fromM: 4800, toM: 5200, title: '12. رشدي · طريق الجيش' },
  { fromM: 5200, toM: 5600, title: '13. مصطفى كامل · الكورنيش' },
  { fromM: 5600, toM: 6000, title: '14. سيدي جابر · الكورنيش' },
  { fromM: 6000, toM: 6400, title: '15. كليوباترا · طريق الجيش' },
  { fromM: 6400, toM: 6800, title: '16. سبورتنج · الكورنيش' },
  { fromM: 6800, toM: 7200, title: '17. الإبراهيمية · طريق الجيش' },
  { fromM: 7200, toM: 7600, title: '18. كامب شيزار · الكورنيش' },
  { fromM: 7600, toM: 8000, title: '19. الشاطبي · مكتبة الإسكندرية' },
  { fromM: 8000, toM: 8400, title: '20. الأزاريطة (السلسلة)' },
  { fromM: 8400, toM: 8800, title: '21. محطة الرمل · مسجد القائد إبراهيم' },
  { fromM: 8800, toM: 9200, title: '22. المنشية · ميدان الجندي المجهول' },
  { fromM: 9200, toM: 9600, title: '23. بحري (السيالة) · المرسي أبو العباس' },
  { fromM: 9600, toM: 10000, title: '24. الأنفوشي · الميناء الشرقي' },
  { fromM: 10000, toM: 10800, title: '25. قلعة قايتباي (رأس التين) · خط النهاية' },
];

export interface CornicheUTurnZone {
  id: string;
  z: number;
  name: string;
}

export const U_TURN_ZONES: CornicheUTurnZone[] = [
  { id: 'ut_montaza', z: -52, name: 'ملف دوران قصر المنتزه' },
  { id: 'ut_montaza_gate', z: -440, name: 'ملف دوران بوابة المنتزه' },
  { id: 'ut_asafra', z: -940, name: 'ملف دوران العصافرة وميامي' },
  { id: 'ut_sidi_bishr', z: -1560, name: 'ملف دوران سيدي بشر' },
  { id: 'ut_saraya', z: -2140, name: 'ملف دوران السرايا ولوران' },
  { id: 'ut_tharwat', z: -2840, name: 'ملف دوران ثروت وسان ستيفانو' },
  { id: 'ut_gleem', z: -3560, name: 'ملف دوران جليم وسابا باشا' },
  { id: 'ut_before_stanley', z: -4180, name: 'ملف دوران قبل كوبري ستانلي' },
  { id: 'ut_roushdy', z: -4920, name: 'ملف دوران رشدي ومصطفى كامل' },
  { id: 'ut_sidi_gaber', z: -5640, name: 'ملف دوران سيدي جابر وكليوباترا' },
  { id: 'ut_sporting', z: -6380, name: 'ملف دوران سبورتنج والإبراهيمية' },
  { id: 'ut_camp_caesar', z: -7080, name: 'ملف دوران كامب شيزار' },
  { id: 'ut_shatby', z: -7780, name: 'ملف دوران الشاطبي والأزاريطة' },
  { id: 'ut_raml', z: -8440, name: 'ملف دوران محطة الرمل والمنشية' },
  { id: 'ut_bahary', z: -9360, name: 'ملف دوران بحري والأنفوشي' },
  { id: 'ut_qaitbay', z: -9900, name: 'ملف دوران قلعة قايتباي ورأس التين' },
];

export interface CornicheGasStation {
  id: string;
  z: number;
  side: 'right' | 'left';
  name: string;
  district: string;
}

export const GAS_STATIONS: CornicheGasStation[] = [
  { id: 'gs_montaza_r', z: -240, side: 'right', name: 'بنزينة قصر المنتزه', district: 'المنتزه · يمين الطريق' },
  { id: 'gs_asafra_l', z: -740, side: 'left', name: 'بنزينة العصافرة السريعة', district: 'العصافرة · شمال الطريق' },
  { id: 'gs_miami_r', z: -1360, side: 'right', name: 'بنزينة ميامي وسيدي بشر', district: 'ميامي · يمين الطريق' },
  { id: 'gs_saraya_l', z: -1960, side: 'left', name: 'بنزينة السرايا ولوران', district: 'السرايا · شمال الطريق' },
  { id: 'gs_tharwat_r', z: -2640, side: 'right', name: 'بنزينة لوران وثروت', district: 'ثروت · يمين الطريق' },
  { id: 'gs_sanstefano_l', z: -3260, side: 'left', name: 'بنزينة سان ستيفانو وجليم', district: 'سان ستيفانو · شمال الطريق' },
  { id: 'gs_sabapasha_r', z: -3920, side: 'right', name: 'بنزينة سابا باشا', district: 'سابا باشا · يمين الطريق' },
  { id: 'gs_stanley_l', z: -4720, side: 'left', name: 'بنزينة ستانلي ورشدي', district: 'ستانلي · شمال الطريق' },
  { id: 'gs_mostafa_r', z: -5360, side: 'right', name: 'بنزينة مصطفى كامل وسيدي جابر', district: 'مصطفى كامل · يمين الطريق' },
  { id: 'gs_cleopatra_l', z: -6040, side: 'left', name: 'بنزينة كليوباترا وسبورتنج', district: 'كليوباترا · شمال الطريق' },
  { id: 'gs_sporting_r', z: -6680, side: 'right', name: 'بنزينة سبورتنج والإبراهيمية', district: 'سبورتنج · يمين الطريق' },
  { id: 'gs_campcaesar_l', z: -7320, side: 'left', name: 'بنزينة كامب شيزار والشاطبي', district: 'كامب شيزار · شمال الطريق' },
  { id: 'gs_azarita_r', z: -8040, side: 'right', name: 'بنزينة الأزاريطة والسلسلة', district: 'الأزاريطة · يمين الطريق' },
  { id: 'gs_raml_l', z: -8620, side: 'left', name: 'بنزينة محطة الرمل والمنشية', district: 'محطة الرمل · شمال الطريق' },
  { id: 'gs_bahary_r', z: -9180, side: 'right', name: 'بنزينة بحري والسيالة', district: 'بحري · يمين الطريق' },
  { id: 'gs_anfoushi_l', z: -9740, side: 'left', name: 'بنزينة الأنفوشي ورأس التين', district: 'الأنفوشي · شمال الطريق' },
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
    id: 'montaza',
    name: 'المنتزه (قصر المنتزه)',
    district: '1. المنتزه · نقطة البداية',
    distanceM: 0,
    description: 'نقطة الانطلاق من قصر وبوابة وحدائق المنتزه الملكية على يمين الطريق، وبعدها مباشرة ينفتح البحر الأبيض المتوسط بطول الكورنيش.',
    fareBonus: 25,
  },
  {
    id: 'asafra',
    name: 'العصافرة',
    district: '2. العصافرة · طريق الجيش',
    distanceM: 800,
    description: 'شاطئ العصافرة وكافيهات البحر ومحطة الزباين النشطة شرق الإسكندرية.',
    fareBonus: 35,
  },
  {
    id: 'miami',
    name: 'ميامي',
    district: '3. ميامي · شاطئ ميامي',
    distanceM: 1200,
    description: 'كورنيش وشاطئ ميامي الشهير وشارع خالد بن الوليد والزحام البحري الممتع.',
    fareBonus: 40,
  },
  {
    id: 'sidi_bishr',
    name: 'سيدي بشر',
    district: '4. سيدي بشر · المسجد الكبير',
    distanceM: 1600,
    description: 'مسجد سيدي بشر الكبير بواجهته الزاهية وقبابه الفيروزية ومئذنتيه المضيئتين على الكورنيش.',
    fareBonus: 46,
  },
  {
    id: 'saraya',
    name: 'السرايا',
    district: '5. السرايا · الكورنيش',
    distanceM: 2000,
    description: 'كورنيش السرايا وشاطئ السرايا الممتد بإطلالة بحرية مفتوحة.',
    fareBonus: 50,
  },
  {
    id: 'lauran',
    name: 'لوران',
    district: '6. لوران · طريق الجيش',
    distanceM: 2400,
    description: 'حي لوران الراقي وعماراته المطلة على البحر الأبيض المتوسط.',
    fareBonus: 55,
  },
  {
    id: 'tharwat',
    name: 'ثروت',
    district: '7. ثروت · الكورنيش',
    distanceM: 2800,
    description: 'منطقة ثروت الساحلية الهادئة قبل الوصول إلى أبراج سان ستيفانو.',
    fareBonus: 60,
  },
  {
    id: 'san_stefano',
    name: 'سان ستيفانو',
    district: '8. سان ستيفانو · جراند بلازا',
    distanceM: 3200,
    description: 'أبراج وفندق سان ستيفانو الشهير ومارينا الشاطئ ومجمع الزباين الحيوي.',
    fareBonus: 66,
  },
  {
    id: 'gleem',
    name: 'جليم',
    district: '9. جليم · جليم باي',
    distanceM: 3600,
    description: 'خليج جليم وكافيهات جليم باي المطلة مباشرة على البحر.',
    fareBonus: 72,
  },
  {
    id: 'saba_pasha',
    name: 'سابا باشا',
    district: '10. سابا باشا · الكورنيش',
    distanceM: 4000,
    description: 'كورنيش سابا باشا الجميل والتمهيد لمدخل كوبري ستانلي الملكي.',
    fareBonus: 76,
  },
  {
    id: 'stanley',
    name: 'ستانلي',
    district: '11. ستانلي · كوبري ستانلي',
    distanceM: 4400,
    description: 'كوبري ستانلي الملكي بأبراجه الأربعة وقبابه المذهبة فوق خليج ستانلي وكبائنه البحرية.',
    fareBonus: 84,
  },
  {
    id: 'roushdy',
    name: 'رشدي',
    district: '12. رشدي · طريق الجيش',
    distanceM: 4800,
    description: 'حي رشدي الحيوي مباشرة بعد عبور كوبري ستانلي باتجاه وسط البلد.',
    fareBonus: 88,
  },
  {
    id: 'mostafa_kamel',
    name: 'مصطفى كامل',
    district: '13. مصطفى كامل · الكورنيش',
    distanceM: 5200,
    description: 'منطقة مصطفى كامل الواسعة بأبراجها الحديثة ونشاطها المستمر على الكورنيش.',
    fareBonus: 92,
  },
  {
    id: 'sidi_gaber',
    name: 'سيدي جابر',
    district: '14. سيدي جابر · الكورنيش',
    distanceM: 5600,
    description: 'كورنيش سيدي جابر الشهير والمقاهي البحرية ومطلع شارع المشير.',
    fareBonus: 98,
  },
  {
    id: 'cleopatra',
    name: 'كليوباترا',
    district: '15. كليوباترا · طريق الجيش',
    distanceM: 6000,
    description: 'شاطئ وكورنيش كليوباترا وحمامات كليوباترا التاريخية على البحر.',
    fareBonus: 104,
  },
  {
    id: 'sporting',
    name: 'سبورتنج',
    district: '16. سبورتنج · الكورنيش',
    distanceM: 6400,
    description: 'كورنيش سبورتنج الهادئ والمنحنيات الساحلية المميزة نحو وسط المدينة.',
    fareBonus: 108,
  },
  {
    id: 'ibrahimiya',
    name: 'الإبراهيمية',
    district: '17. الإبراهيمية · طريق الجيش',
    distanceM: 6800,
    description: 'حي الإبراهيمية العريق والمحلات والشوارع المتفرعة نحو الكورنيش.',
    fareBonus: 112,
  },
  {
    id: 'camp_caesar',
    name: 'كامب شيزار',
    district: '18. كامب شيزار · الكورنيش',
    distanceM: 7200,
    description: 'كامب شيزار بواجهاته الكلاسيكية المطلة على البحر المتوسط.',
    fareBonus: 116,
  },
  {
    id: 'shatby',
    name: 'الشاطبي',
    district: '19. الشاطبي · مكتبة الإسكندرية',
    distanceM: 7600,
    description: 'مكتبة الإسكندرية بقرص الشمس الزجاجي وجدار الجرانيت المنقوش والقبة السماوية على شمال الكورنيش.',
    fareBonus: 122,
  },
  {
    id: 'azarita',
    name: 'الأزاريطة (السلسلة)',
    district: '20. الأزاريطة · لسان السلسلة',
    distanceM: 8000,
    description: 'منطقة الأزاريطة ولسان السلسلة الشهير المطل على الميناء الشرقي.',
    fareBonus: 128,
  },
  {
    id: 'raml',
    name: 'محطة الرمل',
    district: '21. محطة الرمل · القائد إبراهيم',
    distanceM: 8400,
    description: 'مسجد القائد إبراهيم بقبته الخضراء ومئذنته الرشيقة وعمارات وسط البلد الكلاسيكية.',
    fareBonus: 134,
  },
  {
    id: 'mansheya',
    name: 'المنشية',
    district: '22. المنشية · الجندي المجهول',
    distanceM: 8800,
    description: 'الأعمدة الرخامية النصف دائرية للنصب التذكاري للجندي المجهول وأبنية المنشية العريقة.',
    fareBonus: 140,
  },
  {
    id: 'bahary',
    name: 'بحري (السيالة)',
    district: '23. بحري · المرسي أبو العباس',
    distanceM: 9200,
    description: 'بحري والسيالة وميدان المساجد ومسجد المرسي أبو العباس بقبابه الأندلسية ومئذنته الشاهقة.',
    fareBonus: 148,
  },
  {
    id: 'anfoushi_corniche',
    name: 'الأنفوشي',
    district: '24. الأنفوشي · ميناء الصيادين',
    distanceM: 9600,
    description: 'حي الأنفوشي وحلقة السمك ومراكب الصيد الخشبية الملونة على الميناء الشرقي.',
    fareBonus: 156,
  },
  {
    id: 'qaitbay',
    name: 'قلعة قايتباي (رأس التين)',
    district: '25. قلعة قايتباي · خط النهاية',
    distanceM: 10000,
    description: 'قلعة قايتباي المملوكية العريقة ورأس التين ومراكب الصيد في الميناء الشرقي بنهاية خط الكورنيش (١٠ كم).',
    fareBonus: 170,
  },
];

export const MAX_TAXI_LEVEL = 7;

// Single Self-Evolving Alexandria Taxi (7 Progressive Levels: Easy -> Legendary Hard)
export const TAXI_LEVELS: TaxiLevelDef[] = [
  {
    level: 1,
    name: 'تاكسي الإسكندرية · المستوى 1',
    subtitle: 'انطلاقة سريعة وسلسة (١١٢ كم/س) — جمّع أجرة المشاوير وطوّر التاكسي لزيادة السرعة والربح!',
    difficultyLabel: 'سهل',
    difficultyTier: 'easy',
    upgradeCost: 0,
    topSpeedKmh: 112,
    accelBonus: 18,
    handlingBonus: 12,
    armorBonus: 0,
    fareMultiplier: 1.0,
    patienceBonus: 4,
    visualPerks: ['سرعة بداية نشيطة ١١٢ كم/س + عزم سريع', 'لوحة واضحة مضيئة: تاكسي الإسكندرية', 'تطوير المستوى ٢ يرفع السرعة إلى ١٢٨ كم/س'],
  },
  {
    level: 2,
    name: 'تاكسي الإسكندرية · المستوى 2',
    subtitle: 'موتور أقوى وجنوط رياضية وسرعة ١٢٨ كم/س مع حركة مرور أنشط وتغريز أكثر إثارة',
    difficultyLabel: 'متوسط',
    difficultyTier: 'medium',
    upgradeCost: 700,
    topSpeedKmh: 128,
    accelBonus: 28,
    handlingBonus: 16,
    armorBonus: 10,
    fareMultiplier: 1.18,
    patienceBonus: 0,
    visualPerks: ['سرعة ١٢٨ كم/س + عزم أقوى', 'جنوط رياضية وشبكة وسبليتر كروم', 'أجرة مشاوير ×1.18 وزحمة أعلى'],
  },
  {
    level: 3,
    name: 'تاكسي الإسكندرية · المستوى 3',
    subtitle: 'تعديل رياضي بسبويلر وشكمان مزدوج وزينون وسرعة ١٤٥ كم/س مع مرور أسرع ومشاوير مستعجلة',
    difficultyLabel: 'فوق المتوسط',
    difficultyTier: 'medium',
    upgradeCost: 1650,
    topSpeedKmh: 145,
    accelBonus: 38,
    handlingBonus: 22,
    armorBonus: 20,
    fareMultiplier: 1.38,
    patienceBonus: -4,
    visualPerks: ['سرعة ١٤٥ كم/س + تيربو أقوى', 'سبويلر رياضي + شكمان مزدوج وزينون', 'أجرة ×1.38 ووقت زبون أضيق'],
  },
  {
    level: 4,
    name: 'تاكسي الإسكندرية التيربو · المستوى 4',
    subtitle: 'بدي كيت عريض وكشافات LED أمامية وسرعة ١٦٢ كم/س — مرور مزدحم وعربيات بتكسر حارات قدامك!',
    difficultyLabel: 'صعب',
    difficultyTier: 'hard',
    upgradeCost: 2950,
    topSpeedKmh: 162,
    accelBonus: 48,
    handlingBonus: 28,
    armorBonus: 30,
    fareMultiplier: 1.6,
    patienceBonus: -8,
    visualPerks: ['سرعة ١٦٢ كم/س + تحكم رياضي', 'رفارف عريضة وشريط LED أمامي + زعنفة سقف', 'أجرة ×1.60 وتحدي مرور حقيقي'],
  },
  {
    level: 5,
    name: 'تاكسي الإسكندرية الذهبي · المستوى 5',
    subtitle: 'جنوط ذهبية وإضاءة سفلية و٤ مخارج شكمان وسرعة ١٨٠ كم/س مع مشاوير VIP متتالية ومرور سريع جداً',
    difficultyLabel: 'صعب جداً',
    difficultyTier: 'very_hard',
    upgradeCost: 4600,
    topSpeedKmh: 180,
    accelBonus: 58,
    handlingBonus: 34,
    armorBonus: 40,
    fareMultiplier: 1.85,
    patienceBonus: -12,
    visualPerks: ['سرعة ١٨٠ كم/س + ٤ مخارج شكمان', 'جنوط ذهبية وإضاءة نيون سفلية', 'أجرة ×1.85 وخصم صبر أعلى عند الخبطة'],
  },
  {
    level: 6,
    name: 'تاكسي الإسكندرية GT · المستوى 6',
    subtitle: 'جناح خلفي GT كربوني وفتحات تيربو مضيئة وسرعة ١٩٨ كم/س — تحدي احترافي بزحام كثيف وسرعة نار!',
    difficultyLabel: 'احترافي',
    difficultyTier: 'pro',
    upgradeCost: 6800,
    topSpeedKmh: 198,
    accelBonus: 70,
    handlingBonus: 40,
    armorBonus: 52,
    fareMultiplier: 2.15,
    patienceBonus: -15,
    visualPerks: ['سرعة ١٩٨ كم/س + ثبات GT عالي', 'جناح GT مزدوج + فتحات تيربو سماوي', 'أجرة ×2.15 ومكافآت تغريز ضخمة'],
  },
  {
    level: 7,
    name: 'ملك تاكسي الإسكندرية · المستوى 7',
    subtitle: 'أقصى تطور أسطوري ببدي كيت كامل وتاج إضاءة ملكي وديفيوزر خلفي وسرعة صاروخية (٢٢٠ كم/س) — أصعب تحدي!',
    difficultyLabel: 'أسطوري',
    difficultyTier: 'expert',
    upgradeCost: 9800,
    topSpeedKmh: 220,
    accelBonus: 86,
    handlingBonus: 48,
    armorBonus: 65,
    fareMultiplier: 2.5,
    patienceBonus: -18,
    visualPerks: ['أقصى سرعة ٢٢٠ كم/س + تيربو أسطوري', 'تاج ملكي مضيء + ديفيوزر ونيون مزدوج', 'أعلى أجرة ×2.50 وأصعب زحام في المدينة'],
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
    subtitle: 'الكورنيش الكامل (١٠ كم · ٢٥ منطقة بالترتيب الحقيقي): من قصر المنتزه والعصافرة وميامي وسيدي بشر وسان ستيفانو وستانلي وسيدي جابر والشاطبي ومحطة الرمل والمنشية وبحري والأنفوشي حتى قلعة قايتباي (رأس التين)',
    featureHighlight: '٢٥ منطقة كاملة بالترتيب (١٠ كم) · قصر المنتزه · العصافرة · سيدي بشر · سان ستيفانو · كوبري ستانلي · مكتبة الإسكندرية · محطة الرمل · المنشية · بحري · الأنفوشي · قلعة قايتباي',
    price: 0,
    hasSea: true,
    routeLengthM: 10000,
    difficultyLabel: 'سهل ← متوسط',
    fareMultiplier: 1.0,
    icon: '🌊',
    landmarks: LANDMARKS,
    streetZones: STREET_ZONES,
    uTurnZones: U_TURN_ZONES,
  },
  {
    id: 'abu_qir',
    name: 'المندرة ← أبو قير البلد والقطار المعلق',
    englishName: 'MANDARA TO ABU QIR & BEACHES BRANCH',
    subtitle: 'طريق أبو قير الكامل (٧.٢ كم · ٩ مناطق بالترتيب): المندرة ← المنتزه ← المعمورة الشاطئ والملاهي ← المعمورة البلد ← الإصلاح ← طوسون ← الكلية البحرية ويفطة أبو وعد (مدخل الشارع الفرعي للشواطئ ↗) ← وسط ونهاية أبو قير البلد',
    featureHighlight: '٩ مناطق كاملة بالترتيب (٧.٢ كم) · القطار المعلق العلوي · شارع فرعي مفتوح للشواطئ من عند يفطة أبو وعد (شاطئ أبو وعد · شاطئ أبو قير · براديس والجزيرة · الصيادين) · ملاهي وسوق المعمورة · الإصلاح · طوسون · الكلية البحرية · أبو قير البلد',
    price: 1800,
    hasSea: false,
    routeLengthM: 7200,
    difficultyLabel: 'متوسط',
    fareMultiplier: 1.22,
    icon: '🚝',
    landmarks: [
      {
        id: 'aq_mandara',
        name: 'المندرة (محطة المندرة العلوية)',
        district: '1. المندرة · نقطة البداية',
        distanceM: 0,
        description: 'نقطة انطلاق طريق أبو قير والقطار المعلق العلوي من المندرة شرقاً بطول ٧.٢ كم.',
        fareBonus: 32,
      },
      {
        id: 'aq_montaza',
        name: 'المنتزه (بوابات وحدائق المنتزه)',
        district: '2. المنتزه · طريق أبو قير',
        distanceM: 900,
        description: 'بوابات وأسوار وحدائق المنتزه الملكية على امتداد خط القطار المعلق.',
        fareBonus: 46,
      },
      {
        id: 'aq_maamoura_beach',
        name: 'المعمورة الشاطئ والملاهي',
        district: '3. المعمورة الشاطئ · مدينة الملاهي',
        distanceM: 1800,
        description: 'بوابة المعمورة الشاطئ والعجلة الدوارة المضيئة وألعاب الملاهي الحيوية.',
        fareBonus: 62,
      },
      {
        id: 'aq_maamoura_balad',
        name: 'المعمورة البلد (سوق المعمورة)',
        district: '4. المعمورة البلد · السوق الشعبي',
        distanceM: 2700,
        description: 'سوق المعمورة البلد المزدحم بالمحلات والفرش والخضار والفاكهة.',
        fareBonus: 78,
      },
      {
        id: 'aq_eslah',
        name: 'الإصلاح (محطة ومنطقة الإصلاح)',
        district: '5. الإصلاح · طريق أبو قير',
        distanceM: 3600,
        description: 'منطقة ومحطة الإصلاح الحيوية بين المعمورة البلد وطوسون.',
        fareBonus: 94,
      },
      {
        id: 'aq_tousson',
        name: 'طوسون ومجمع المدارس',
        district: '6. طوسون · شارع المدارس',
        distanceM: 4500,
        description: 'مجمع مدارس طوسون وفناء الطلبة أسفل مسار القطار المعلق العلوي.',
        fareBonus: 112,
      },
      {
        id: 'aq_abu_waad_naval',
        name: 'الكلية البحرية · يفطة أبو وعد (شارع الشواطئ ↗)',
        district: '7. يفطة أبو وعد · مدخل الشارع الفرعي للشواطئ',
        distanceM: 5400,
        description: 'صرح الكلية البحرية على الشمال، ومن عند يفطة أبو وعد على اليمين يتفرع الشارع الفرعي المفتوح لشواطئ أبو قير والبحر!',
        fareBonus: 134,
      },
      {
        id: 'aq_balad_services',
        name: 'أبو قير البلد (المعهد الديني · البريد · بنك مصر · الكافتيريات)',
        district: '8. وسط أبو قير البلد · وبجانبك شواطئ أبو قير ↗',
        distanceM: 6300,
        description: 'قلب أبو قير البلد على الشمال: المعهد الديني والبريد وبنك مصر وشركات الاتصال والكافتيريات، وعلى اليمين الشارع الفرعي للشواطئ.',
        fareBonus: 158,
      },
      {
        id: 'aq_balad_market',
        name: 'نهاية أبو قير البلد (الموقف · النوادي · سوق الأسماك وشاطئ الصيادين)',
        district: '9. أبو قير البلد · خط النهاية',
        distanceM: 7200,
        description: 'موقف عربيات أبو قير والنوادي وسوق الأسماك وشاطئ الصيادين بنهاية الخط (٧.٢ كم).',
        fareBonus: 188,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 900, title: '1. المندرة · محطة المندرة العلوية وبداية القطار المعلق' },
      { fromM: 900, toM: 1800, title: '2. المنتزه · بوابات وحدائق المنتزه' },
      { fromM: 1800, toM: 2700, title: '3. المعمورة الشاطئ · مدينة الملاهي والعجلة الدوارة' },
      { fromM: 2700, toM: 3600, title: '4. المعمورة البلد · السوق التجاري الشعبي' },
      { fromM: 3600, toM: 4500, title: '5. الإصلاح · محطة ومنطقة الإصلاح' },
      { fromM: 4500, toM: 5400, title: '6. طوسون · مجمع المدارس وأسفل القطار المعلق' },
      { fromM: 5400, toM: 6300, title: '7. الكلية البحرية · يفطة أبو وعد (الشارع الفرعي للشواطئ ↗)' },
      { fromM: 6300, toM: 7200, title: '8. وسط أبو قير البلد · المعهد الديني · البريد · بنك مصر · الشواطئ ↗' },
      { fromM: 7200, toM: 8000, title: '9. نهاية أبو قير البلد · الموقف · النوادي · سوق الأسماك · خط النهاية' },
    ],
    uTurnZones: [
      { id: 'aq_ut_1', z: -55, name: 'ملف دوران محطة المندرة العلوية' },
      { id: 'aq_ut_2', z: -920, name: 'ملف دوران بوابات المنتزه' },
      { id: 'aq_ut_3', z: -1820, name: 'ملف دوران المعمورة الشاطئ والملاهي' },
      { id: 'aq_ut_4', z: -2720, name: 'ملف دوران سوق المعمورة البلد' },
      { id: 'aq_ut_5', z: -3620, name: 'ملف دوران محطة الإصلاح' },
      { id: 'aq_ut_6', z: -4520, name: 'ملف دوران مدارس طوسون' },
      { id: 'aq_ut_7', z: -5420, name: 'ملف دوران يفطة أبو وعد والكلية البحرية' },
      { id: 'aq_ut_8', z: -6320, name: 'ملف دوران وسط أبو قير البلد والشواطئ' },
      { id: 'aq_ut_9', z: -7120, name: 'ملف دوران موقف وسوق أسماك أبو قير' },
    ],
  },
  {
    id: 'sidi_gaber_abuqir',
    name: 'طريق سيدي جابر ← شارع أبو قير ← المندرة',
    englishName: 'SIDI GABER TO ABU QIR ST & MANDARA',
    subtitle: 'شارع أبو قير الكامل (٨.٤ كم · ١٣ منطقة بالترتيب الحقيقي): سيدي جابر ومحطة القطار ← مصطفى كامل ← رشدي ← كفر عبده وبولكلي ← فلمنج ← جناكليس ← شوتس وسان ستيفانو ← لوران ← فيكتوريا ← محمد نجيب ← سيدي بشر ← ميامي والعصافرة ← المندرة',
    featureHighlight: '١٣ منطقة كاملة بالترتيب (٨.٤ كم) · محطة قطار سيدي جابر · مصطفى كامل · رشدي · كفر عبده وبولكلي · فلمنج · جناكليس · لوران · فيكتوريا · سيدي بشر · ميامي والعصافرة · المندرة + شارع جانبي هادئ',
    price: 2600,
    hasSea: false,
    routeLengthM: 8400,
    difficultyLabel: 'متوسط ← صعب',
    fareMultiplier: 1.35,
    icon: '🚉',
    landmarks: [
      {
        id: 'sg_sidi_gaber',
        name: 'سيدي جابر (محطة قطار سيدي جابر · بداية شارع أبو قير)',
        district: '1. سيدي جابر · نقطة البداية',
        distanceM: 0,
        description: 'نقطة الانطلاق من ميدان ومحطة قطار سيدي جابر الشهيرة على بداية شارع أبو قير (طريق الحرية) بدون بحر.',
        fareBonus: 34,
      },
      {
        id: 'sg_mostafa_kamel',
        name: 'مصطفى كامل (شارع أبو قير)',
        district: '2. مصطفى كامل · طريق الحرية',
        distanceM: 700,
        description: 'امتداد شارع أبو قير الحيوي بمنطقة مصطفى كامل والعمارات الحديثة والمحلات التجارية.',
        fareBonus: 48,
      },
      {
        id: 'sg_roushdy',
        name: 'رشدي (شارع أبو قير · طريق الحرية)',
        district: '3. رشدي · طريق الحرية',
        distanceM: 1400,
        description: 'قلب حي رشدي الشهير بالمحلات والمطاعم وإشارة المرور العريضة بطول شارع أبو قير.',
        fareBonus: 62,
      },
      {
        id: 'sg_kafr_abdo_bolkly',
        name: 'كفر عبده والوزارة (بولكلي)',
        district: '4. كفر عبده وبولكلي',
        distanceM: 2100,
        description: 'مدخل حي كفر عبده الراقي ومنطقة الوزارة وبولكلي والكافيهات المميزة على جانبي الطريق.',
        fareBonus: 76,
      },
      {
        id: 'sg_fleming',
        name: 'فلمنج (شارع أبو قير)',
        district: '5. فلمنج · طريق الحرية',
        distanceM: 2800,
        description: 'منطقة فلمنج العريقة والشوارع الجانبية المتفرعة والبيوت السكندرية الكلاسيكية.',
        fareBonus: 90,
      },
      {
        id: 'sg_gianaclis',
        name: 'جناكليس (شارع أبو قير)',
        district: '6. جناكليس · طريق الحرية',
        distanceM: 3500,
        description: 'حي جناكليس الهادئ بواجهاته الفاخرة والمحلات الراقية على امتداد طريق الحرية.',
        fareBonus: 104,
      },
      {
        id: 'sg_schutz_sanstefano',
        name: 'شوتس وسان ستيفانو (شارع أبو قير)',
        district: '7. شوتس وسان ستيفانو',
        distanceM: 4200,
        description: 'محور شوتس ومطلع سان ستيفانو الحيوي قبل الوصول إلى لوران.',
        fareBonus: 118,
      },
      {
        id: 'sg_louran',
        name: 'لوران (شارع أبو قير · طريق الحرية)',
        district: '8. لوران · تقاطع شعراوي',
        distanceM: 4900,
        description: 'منطقة لوران النابضة بالحياة وتقاطع شارع شعراوي والكافيهات وإشارة المرور الرئيسية.',
        fareBonus: 132,
      },
      {
        id: 'sg_victoria',
        name: 'فيكتوريا (ميدان وتقاطع فيكتوريا)',
        district: '9. فيكتوريا · نهاية طريق الحرية',
        distanceM: 5600,
        description: 'ميدان فيكتوريا الشهير وبداية امتداد شارع جمال عبد الناصر (طريق أبو قير الشرقي).',
        fareBonus: 148,
      },
      {
        id: 'sg_mohamed_naguib',
        name: 'محمد نجيب (شارع جمال عبد الناصر)',
        district: '10. محمد نجيب · امتداد أبو قير',
        distanceM: 6300,
        description: 'تقاطع شارع محمد نجيب التجاري المزدحم بالمطاعم والمحلات والزباين.',
        fareBonus: 164,
      },
      {
        id: 'sg_sidi_bishr',
        name: 'سيدي بشر (شارع جمال عبد الناصر)',
        district: '11. سيدي بشر · طريق أبو قير',
        distanceM: 7000,
        description: 'قلب سيدي بشر الداخلي وإشارة المرور الرئيسية وحركة التاكسي المستمرة شرق الإسكندرية.',
        fareBonus: 180,
      },
      {
        id: 'sg_miami_asafra',
        name: 'ميامي والعصافرة (شارع جمال عبد الناصر)',
        district: '12. ميامي والعصافرة',
        distanceM: 7700,
        description: 'امتداد ميامي والعصافرة الداخلي بالمحلات والقهاوي الشعبية قبل بوابة المندرة.',
        fareBonus: 196,
      },
      {
        id: 'sg_mandara_end',
        name: 'المندرة (نهاية شارع أبو قير · خط النهاية)',
        district: '13. المندرة · خط النهاية',
        distanceM: 8400,
        description: 'وصولك بالسلامة إلى المندرة بنهاية شارع أبو قير وجمال عبد الناصر بعد رحلة ٨.٤ كم.',
        fareBonus: 220,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 700, title: '1. سيدي جابر · محطة قطار سيدي جابر وبداية شارع أبو قير' },
      { fromM: 700, toM: 1400, title: '2. مصطفى كامل · شارع أبو قير (طريق الحرية)' },
      { fromM: 1400, toM: 2100, title: '3. رشدي · إشارة المرور والمحلات التجارية' },
      { fromM: 2100, toM: 2800, title: '4. كفر عبده والوزارة (بولكلي) · الشارع الجانبي ↗' },
      { fromM: 2800, toM: 3500, title: '5. فلمنج · شارع أبو قير (طريق الحرية)' },
      { fromM: 3500, toM: 4200, title: '6. جناكليس · بيوت وقهاوي ومحلات طريق الحرية' },
      { fromM: 4200, toM: 4900, title: '7. شوتس وسان ستيفانو · شارع أبو قير' },
      { fromM: 4900, toM: 5600, title: '8. لوران · تقاطع شعراوي وإشارة المرور' },
      { fromM: 5600, toM: 6300, title: '9. فيكتوريا · ميدان وتقاطع فيكتوريا' },
      { fromM: 6300, toM: 7000, title: '10. محمد نجيب · امتداد جمال عبد الناصر' },
      { fromM: 7000, toM: 7700, title: '11. سيدي بشر · إشارة المرور والمحلات' },
      { fromM: 7700, toM: 8400, title: '12. ميامي والعصافرة · شارع جمال عبد الناصر' },
      { fromM: 8400, toM: 9200, title: '13. المندرة · نهاية شارع أبو قير (خط النهاية)' },
    ],
    uTurnZones: [
      { id: 'sg_ut_1', z: -70, name: 'ملف دوران محطة سيدي جابر' },
      { id: 'sg_ut_2', z: -740, name: 'ملف دوران مصطفى كامل' },
      { id: 'sg_ut_3', z: -1440, name: 'ملف دوران رشدي' },
      { id: 'sg_ut_4', z: -2140, name: 'ملف دوران كفر عبده وبولكلي' },
      { id: 'sg_ut_5', z: -2840, name: 'ملف دوران فلمنج' },
      { id: 'sg_ut_6', z: -3540, name: 'ملف دوران جناكليس' },
      { id: 'sg_ut_7', z: -4240, name: 'ملف دوران شوتس وسان ستيفانو' },
      { id: 'sg_ut_8', z: -4940, name: 'ملف دوران لوران' },
      { id: 'sg_ut_9', z: -5640, name: 'ملف دوران ميدان فيكتوريا' },
      { id: 'sg_ut_10', z: -6340, name: 'ملف دوران محمد نجيب' },
      { id: 'sg_ut_11', z: -7040, name: 'ملف دوران سيدي بشر' },
      { id: 'sg_ut_12', z: -7740, name: 'ملف دوران ميامي والعصافرة' },
      { id: 'sg_ut_13', z: -8320, name: 'ملف دوران المندرة · خط النهاية' },
    ],
  },
  {
    id: 'ras_el_soda_victoria',
    name: 'طريق الرأس السوداء ← فيكتوريا',
    englishName: 'RAS EL-SODA TO VICTORIA',
    subtitle: 'شارع مصطفى كامل الكامل (٧.٢ كم · ١٠ مناطق بالترتيب الحقيقي): الرأس السوداء ← الفلكي ← السيوف شماعة ← مجمع القاعات ← كوبري العوايد ← ميدان وبرج الساعة ← باكوس ← غبريال ← كلية فيكتوريا ← ميدان وترام فيكتوريا',
    featureHighlight: '١٠ مناطق كاملة بالترتيب (٧.٢ كم) · الرأس السوداء · الفلكي · السيوف شماعة · كوبري العوايد · برج ميدان الساعة · باكوس · غبريال · كلية وميدان وترام فيكتوريا',
    price: 3600,
    hasSea: false,
    routeLengthM: 7200,
    difficultyLabel: 'صعب',
    fareMultiplier: 1.45,
    icon: '🕰️',
    landmarks: [
      {
        id: 'rv_ras_soda',
        name: 'الرأس السوداء (بداية شارع مصطفى كامل)',
        district: '1. الرأس السوداء · نقطة البداية',
        distanceM: 0,
        description: 'بداية طريق الرأس السوداء وشارع مصطفى كامل الرئيسي شرق الإسكندرية.',
        fareBonus: 38,
      },
      {
        id: 'rv_falaki',
        name: 'الفلكي (مدخل شارع ١٦ الملك)',
        district: '2. الفلكي · الرأس السوداء',
        distanceM: 800,
        description: 'مدخل منطقة الفلكي وشارع ١٦ الملك المزدحم بالمحلات والمواصلات.',
        fareBonus: 54,
      },
      {
        id: 'rv_seyouf',
        name: 'السيوف (السيوف قبلي وشماعة)',
        district: '3. السيوف شماعة',
        distanceM: 1600,
        description: 'قلب السيوف التجاري بالمحلات والمطاعم وكوبري المشاة ودوران السيوف.',
        fareBonus: 70,
      },
      {
        id: 'rv_mustafa_kamel',
        name: 'شارع مصطفى كامل (مجمع القاعات والمعرض)',
        district: '4. شارع مصطفى كامل',
        distanceM: 2400,
        description: 'امتداد شارع مصطفى كامل الحيوي ومجمع القاعات والمعرض الدولي والعمارات المضيئة.',
        fareBonus: 86,
      },
      {
        id: 'rv_awaied',
        name: 'العوايد (كوبري ومنطقة العوايد)',
        district: '5. العوايد · الكوبري العلوي',
        distanceM: 3200,
        description: 'كوبري العوايد العلوي الشهير والمحور الرابط نحو ميدان الساعة.',
        fareBonus: 102,
      },
      {
        id: 'rv_saa',
        name: 'ميدان الساعة (برج وميدان الساعة)',
        district: '6. ميدان الساعة',
        distanceM: 4000,
        description: 'برج الساعة الأيقوني المضيء بقلب ميدان الساعة وتقاطعه المزدحم الشهير.',
        fareBonus: 120,
      },
      {
        id: 'rv_bakos',
        name: 'باكوس (تقاطع وسوق باكوس)',
        district: '7. باكوس · حي السوق',
        distanceM: 4800,
        description: 'حي باكوس العريق وأسواقه الشعبية التجارية المزدحمة بقلب الرمل.',
        fareBonus: 138,
      },
      {
        id: 'rv_gabrial',
        name: 'غبريال (شارع مصطفى كامل)',
        district: '8. غبريال',
        distanceM: 5600,
        description: 'منطقة غبريال السكنية والتجارية المتصلة مباشرة بطريق فيكتوريا.',
        fareBonus: 156,
      },
      {
        id: 'rv_victoria_college',
        name: 'كلية فيكتوريا (شارع الجلاء)',
        district: '9. كلية فيكتوريا',
        distanceM: 6400,
        description: 'صرح وأسوار كلية فيكتوريا التاريخية العريقة قبل دخول الميدان الرئيسي.',
        fareBonus: 176,
      },
      {
        id: 'rv_victoria',
        name: 'ميدان ومحطة ترام فيكتوريا',
        district: '10. فيكتوريا · خط النهاية',
        distanceM: 7200,
        description: 'ميدان فيكتوريا العريق ومحطة ترام الإسكندرية الأزرق والأصفر بنهاية الخط (٧.٢ كم).',
        fareBonus: 198,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 800, title: '1. الرأس السوداء · بداية شارع مصطفى كامل' },
      { fromM: 800, toM: 1600, title: '2. الفلكي · مدخل شارع ١٦ الملك' },
      { fromM: 1600, toM: 2400, title: '3. السيوف · السيوف قبلي وشماعة' },
      { fromM: 2400, toM: 3200, title: '4. شارع مصطفى كامل · مجمع القاعات والمعرض' },
      { fromM: 3200, toM: 4000, title: '5. العوايد · كوبري ومنطقة العوايد' },
      { fromM: 4000, toM: 4800, title: '6. ميدان الساعة · برج وميدان الساعة' },
      { fromM: 4800, toM: 5600, title: '7. باكوس · تقاطع وسوق باكوس' },
      { fromM: 5600, toM: 6400, title: '8. غبريال · شارع مصطفى كامل' },
      { fromM: 6400, toM: 7200, title: '9. كلية فيكتوريا · شارع الجلاء' },
      { fromM: 7200, toM: 8000, title: '10. ميدان ومحطة ترام فيكتوريا · خط النهاية' },
    ],
    uTurnZones: [
      { id: 'rv_ut_1', z: -60, name: 'ملف دوران الرأس السوداء' },
      { id: 'rv_ut_2', z: -840, name: 'ملف دوران الفلكي' },
      { id: 'rv_ut_3', z: -1640, name: 'ملف دوران السيوف شماعة' },
      { id: 'rv_ut_4', z: -2440, name: 'ملف دوران شارع مصطفى كامل' },
      { id: 'rv_ut_5', z: -3240, name: 'ملف دوران كوبري العوايد' },
      { id: 'rv_ut_6', z: -4040, name: 'ملف دوران ميدان الساعة' },
      { id: 'rv_ut_7', z: -4840, name: 'ملف دوران باكوس' },
      { id: 'rv_ut_8', z: -5640, name: 'ملف دوران غبريال' },
      { id: 'rv_ut_9', z: -6440, name: 'ملف دوران كلية فيكتوريا' },
      { id: 'rv_ut_10', z: -7120, name: 'ملف دوران ميدان ومحطة ترام فيكتوريا' },
    ],
  },
  {
    id: 'anfoushi',
    name: 'مدينة الأنفوشي',
    englishName: 'ANFOUSHI MARITIME CITY',
    subtitle: 'ساحل الأنفوشي وبحري الكامل (٧.٢ كم · ٩ مناطق بالترتيب): من قصر رأس التين وطريق ومستشفى وشاطئ رأس التين وشاطئ الأنفوشي وقلعة قايتباي ولسان القلعة وميدان المساجد والسيالة حتى حلقة السمك وميناء الصيادين',
    featureHighlight: '٩ مناطق كاملة بالترتيب (٧.٢ كم) · قصر رأس التين · مستشفى رأس التين · شاطئ الأنفوشي · قلعة قايتباي · نادي اليخت والكشافة البحرية · ميدان المساجد · السيالة · حلقة السمك وميناء الصيادين',
    price: 6200,
    hasSea: true,
    routeLengthM: 7200,
    difficultyLabel: 'صعب جداً',
    fareMultiplier: 1.72,
    icon: '⚓',
    landmarks: [
      {
        id: 'an_ras_eltin_palace',
        name: 'قصر رأس التين',
        district: '1. قصر رأس التين · نقطة البداية',
        distanceM: 0,
        description: 'نقطة الانطلاق من أعمدة وبوابات قصر رأس التين الملكي التاريخي المطل على ساحل البحر المتوسط.',
        fareBonus: 45,
      },
      {
        id: 'an_ras_eltin_hospital',
        name: 'طريق رأس التين البحري (مستشفى رأس التين العام)',
        district: '2. طريق رأس التين البحري',
        distanceM: 900,
        description: 'طريق رأس التين البحري العريق وأمامه صرح مستشفى رأس التين العام على ساحل الأنفوشي.',
        fareBonus: 68,
      },
      {
        id: 'an_ras_eltin_beach',
        name: 'شاطئ رأس التين',
        district: '3. شاطئ رأس التين',
        distanceM: 1800,
        description: 'شاطئ رأس التين المفتوح على البحر الأزرق والشماسي البحرية ونسيم الميناء الغربي.',
        fareBonus: 88,
      },
      {
        id: 'an_anfoushi_beach',
        name: 'شاطئ الأنفوشي',
        district: '4. شاطئ الأنفوشي',
        distanceM: 2700,
        description: 'شاطئ الأنفوشي الشهير بكبائنه الملونة وزحام المصيفين والكورنيش الساحلي الحيوي.',
        fareBonus: 108,
      },
      {
        id: 'an_qaitbay_citadel',
        name: 'قلعة قايتباي',
        district: '5. قلعة قايتباي · رأس جزيرة فاروس',
        distanceM: 3600,
        description: 'حصون وأبراج قلعة قايتباي المملوكية العريقة المطلة على البحر المتوسط والميناء الشرقي.',
        fareBonus: 130,
      },
      {
        id: 'an_yacht_club',
        name: 'لسان القلعة (نادي اليخت والكشافة البحرية)',
        district: '6. لسان القلعة · المارينا',
        distanceM: 4500,
        description: 'لسان القلعة الممتد داخل البحر ومقر نادي اليخت المصري والكشافة البحرية والمراكب الشراعية.',
        fareBonus: 152,
      },
      {
        id: 'an_mosques_square',
        name: 'ميدان المساجد (الأنفوشي)',
        district: '7. ميدان المساجد · قلب الأنفوشي',
        distanceM: 5400,
        description: 'ميدان المساجد العريق بقبابه الأندلسية ومآذنه الشاهقة وأجواء الأنفوشي التاريخية.',
        fareBonus: 174,
      },
      {
        id: 'an_sayala_bahary',
        name: 'السيالة (بحري)',
        district: '8. السيالة · بحري',
        distanceM: 6300,
        description: 'حي السيالة العريق ببحري بزينة الشوارع المضيئة والمقاهي البحرية الشعبية.',
        fareBonus: 196,
      },
      {
        id: 'an_halqa_harbor',
        name: 'حلقة السمك وميناء الصيادين (بحري)',
        district: '9. حلقة السمك وميناء الصيادين · خط النهاية',
        distanceM: 7200,
        description: 'أشهر سوق سمك في الإسكندرية وميناء الصيادين المليء بمراكب الصيد الخشبية وفنار بحري بنهاية الخط (٧.٢ كم).',
        fareBonus: 225,
      },
    ],
    streetZones: [
      { fromM: 0, toM: 900, title: '1. قصر رأس التين · نقطة البداية' },
      { fromM: 900, toM: 1800, title: '2. طريق رأس التين البحري (مستشفى رأس التين العام)' },
      { fromM: 1800, toM: 2700, title: '3. شاطئ رأس التين' },
      { fromM: 2700, toM: 3600, title: '4. شاطئ الأنفوشي' },
      { fromM: 3600, toM: 4500, title: '5. قلعة قايتباي' },
      { fromM: 4500, toM: 5400, title: '6. لسان القلعة (نادي اليخت والكشافة البحرية)' },
      { fromM: 5400, toM: 6300, title: '7. ميدان المساجد (الأنفوشي)' },
      { fromM: 6300, toM: 7200, title: '8. السيالة (بحري)' },
      { fromM: 7200, toM: 8000, title: '9. حلقة السمك وميناء الصيادين (بحري) · خط النهاية' },
    ],
    uTurnZones: [
      { id: 'an_ut_1', z: -60, name: 'ملف دوران قصر رأس التين' },
      { id: 'an_ut_2', z: -860, name: 'ملف دوران مستشفى رأس التين العام' },
      { id: 'an_ut_3', z: -1760, name: 'ملف دوران شاطئ رأس التين' },
      { id: 'an_ut_4', z: -2660, name: 'ملف دوران شاطئ الأنفوشي' },
      { id: 'an_ut_5', z: -3560, name: 'ملف دوران قلعة قايتباي' },
      { id: 'an_ut_6', z: -4460, name: 'ملف دوران لسان القلعة ونادي اليخت' },
      { id: 'an_ut_7', z: -5360, name: 'ملف دوران ميدان المساجد' },
      { id: 'an_ut_8', z: -6260, name: 'ملف دوران السيالة ببحري' },
      { id: 'an_ut_9', z: -7120, name: 'ملف دوران حلقة السمك وميناء الصيادين' },
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
  adsRemoved: false,
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
      adsRemoved: Boolean(parsed.adsRemoved),
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

