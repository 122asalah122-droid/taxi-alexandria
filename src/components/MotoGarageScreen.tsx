import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowRight,
  Bike,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Flame,
  Gauge,
  Lightbulb,
  Lock,
  Moon,
  Paintbrush,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Sunset,
  TrendingUp,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  BLING_ACCESSORY_PRICES,
  BODY_PAINT_OPTIONS,
  computeUnownedTuningItems,
  DEFAULT_MOTO_TUNING,
  DEFAULT_OWNED_MOTO_PARTS,
  ENGINE_SOUND_OPTIONS,
  EXHAUST_OPTIONS,
  getMotoById,
  HORN_SOUND_OPTIONS,
  LED_SIGN_OPTIONS,
  MOTO_MODELS,
  NEON_COLOR_OPTIONS,
  PAINT_FINISH_OPTIONS,
  RIM_LED_COLOR_OPTIONS,
  RIM_PAINT_OPTIONS,
  SEAT_COLOR_OPTIONS,
  UPGRADE_INFO,
} from '../game/data';
import {
  buildPlayerVehicle3D,
  disposeObject3D,
  PlayerVehicleRig,
} from '../game/models3d';
import { soundFX } from '../game/sound';
import {
  createCornichePromenadeTexture,
  createRoadTexture,
  createSeaTexture,
  createShoreFoamTexture,
  createSkyDomeMaterial,
  createYellowBlackCurbTexture,
} from '../game/textures3d';
import { createRealisticTreeBundle } from '../game/trees3d';
import { SeaSoundButton } from './SeaSoundButton';
import {
  AtmosphereMode,
  MotoChassisType,
  MotoTuningConfig,
  PlayerProgress,
  RaceBikeId,
  UpgradeLevels,
} from '../game/types';

type GarageTab = 'models' | 'lights' | 'paint' | 'exhaust' | 'bling' | 'sound';

interface MotoGarageScreenProps {
  progress: PlayerProgress;
  atmosphere: AtmosphereMode;
  onChangeAtmosphere: (mode: AtmosphereMode) => void;
  onSaveTuning: (nextTuning: MotoTuningConfig, newlyPurchasedKeys?: string[], totalCost?: number) => void;
  onSelectMoto: (motoId: RaceBikeId) => void;
  onBuyMoto: (motoId: RaceBikeId, price: number) => void;
  onBuyUpgrade: (key: keyof UpgradeLevels, cost: number) => void;
  onLaunchCorniche: (tuning: MotoTuningConfig) => void;
  onBackToMenu: () => void;
}

const GARAGE_TABS: { id: GarageTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'models', label: 'المستويات 7', Icon: Bike },
  { id: 'lights', label: 'الإضاءة', Icon: Lightbulb },
  { id: 'paint', label: 'الدهان', Icon: Paintbrush },
  { id: 'exhaust', label: 'الشكمان', Icon: Flame },
  { id: 'bling', label: 'الزينة', Icon: Sparkles },
  { id: 'sound', label: 'الصوت', Icon: Volume2 },
];

export const MotoGarageScreen: React.FC<MotoGarageScreenProps> = ({
  progress,
  atmosphere,
  onChangeAtmosphere,
  onSaveTuning,
  onSelectMoto,
  onBuyMoto,
  onBuyUpgrade,
  onLaunchCorniche,
  onBackToMenu,
}) => {
  const savedTuning: MotoTuningConfig = progress.motoTuning ?? DEFAULT_MOTO_TUNING;
  const ownedParts = progress.ownedMotoParts ?? DEFAULT_OWNED_MOTO_PARTS;
  const ownedSet = useMemo(() => new Set(ownedParts), [ownedParts]);
  const unlockedMotos = progress.unlockedMotos ?? ['vespa_lv1'];
  const activeMotoId: RaceBikeId = progress.selectedMotoId ?? 'vespa_lv1';
  const activeMoto = getMotoById(activeMotoId);

  const [previewMotoId, setPreviewMotoId] = useState<RaceBikeId>(activeMotoId);
  const [previewTuning, setPreviewTuning] = useState<MotoTuningConfig>(() => ({
    ...savedTuning,
    chassis: activeMoto.isVespa ? 'vespa' : 'sport',
  }));
  const [activeTab, setActiveTab] = useState<GarageTab>('models');
  const [dockOpen, setDockOpen] = useState(true);
  const [userDragged, setUserDragged] = useState(false);
  const [isRevving, setIsRevving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const tuningRef = useRef<MotoTuningConfig>(previewTuning);
  const timeModeRef = useRef<AtmosphereMode>(atmosphere);
  const rigRef = useRef<PlayerVehicleRig | null>(null);
  const rebuildBikeRef = useRef<((chassis: MotoChassisType, tuning: MotoTuningConfig) => void) | null>(null);
  const applyAtmoRef = useRef<((mode: AtmosphereMode) => void) | null>(null);
  const revPulseRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const unownedItems = useMemo(
    () => computeUnownedTuningItems(previewTuning, ownedParts),
    [previewTuning, ownedParts],
  );
  const totalCartCost = useMemo(
    () => unownedItems.reduce((sum, item) => sum + item.price, 0),
    [unownedItems],
  );
  const canAffordCart = progress.wallet >= totalCartCost;

  // Keep live 3D motorcycle synced whenever previewTuning changes
  useEffect(() => {
    const prevChassis = tuningRef.current.chassis;
    tuningRef.current = previewTuning;
    if (prevChassis !== previewTuning.chassis && rebuildBikeRef.current) {
      rebuildBikeRef.current(previewTuning.chassis, previewTuning);
    } else if (rigRef.current?.applyMotoTuning) {
      rigRef.current.applyMotoTuning(previewTuning);
    }
  }, [previewTuning]);

  // Auto-persist immediately whenever the player equips an already-owned combination
  const updatePreview = (patch: Partial<MotoTuningConfig>) => {
    setPreviewTuning((prev) => {
      const next = { ...prev, ...patch };
      const stillUnowned = computeUnownedTuningItems(next, ownedParts);
      if (stillUnowned.length === 0) {
        onSaveTuning(next);
      }
      return next;
    });
  };

  // Sync Day / Sunset / Night atmosphere instantly in BOTH the 3D garage & the driving game
  useEffect(() => {
    timeModeRef.current = atmosphere;
    applyAtmoRef.current?.(atmosphere);
  }, [atmosphere]);

  const handleRevEngine = () => {
    soundFX.playRevBurst(
      previewTuning.engineSound,
      previewTuning.exhaustStyle !== 'stock',
    );
    revPulseRef.current = 1.05;
    rigRef.current?.triggerExhaustRev?.(1.1);
    setIsRevving(true);
    window.setTimeout(() => setIsRevving(false), 950);
  };

  const handleTestHorn = (profile = previewTuning.hornSound) => {
    soundFX.playHorn(true, profile);
  };

  const handleBuyAndEquip = () => {
    if (unownedItems.length === 0) {
      onSaveTuning(previewTuning);
      showToast('تم تثبيت التعديل بنجاح!');
      return;
    }
    if (!canAffordCart) {
      showToast(`رصيدك غير كافٍ — محتاج ${totalCartCost - progress.wallet} ج.م إضافية`);
      return;
    }
    soundFX.playDropoff();
    onSaveTuning(
      previewTuning,
      unownedItems.map((i) => i.key),
      totalCartCost,
    );
    showToast(`تم الشراء والتركيب بنجاح (-${totalCartCost} ج.م)`);
  };

  const handleResetToOwned = () => {
    setPreviewTuning({ ...savedTuning });
    showToast('تم الرجوع للتعديلات المثبتة');
  };

  const handlePreviewMotoModel = (motoId: RaceBikeId) => {
    const moto = getMotoById(motoId);
    setPreviewMotoId(motoId);
    const nextChassis: MotoChassisType = moto.isVespa ? 'vespa' : 'sport';
    setPreviewTuning((prev) => ({
      ...prev,
      chassis: nextChassis,
      bodyColor: moto.paintCss,
      engineSound: moto.engineSound,
    }));
    if (unlockedMotos.includes(motoId)) {
      onSelectMoto(motoId);
      showToast(`تم تجهيز ${moto.name} (مستوى ${moto.level})`);
    } else {
      showToast(`معاينة ${moto.name} — يفتح بـ ${moto.price} ج.م`);
    }
  };

  const handleBuyMotoModel = (motoId: RaceBikeId, price: number) => {
    const moto = getMotoById(motoId);
    if (progress.wallet < price) {
      showToast(`محتاج ${price - progress.wallet} ج.م إضافية من الإيراد اليومي`);
      return;
    }
    soundFX.playDropoff();
    onBuyMoto(motoId, price);
    setPreviewMotoId(motoId);
    const nextChassis: MotoChassisType = moto.isVespa ? 'vespa' : 'sport';
    setPreviewTuning((prev) => ({
      ...prev,
      chassis: nextChassis,
      bodyColor: moto.paintCss,
      engineSound: moto.engineSound,
    }));
    showToast(`مبروك! فتحت ${moto.name} (المستوى ${moto.level})`);
  };

  const handleBuySpeedUpgrade = () => {
    const info = UPGRADE_INFO.engine;
    const curLvl = progress.upgrades.engine;
    if (curLvl >= info.maxLevel) return;
    const cost = info.costs[curLvl];
    if (progress.wallet < cost) {
      showToast(`محتاج ${cost - progress.wallet} ج.م لترقية السرعة للمستوى ${curLvl + 1}`);
      return;
    }
    soundFX.playDropoff();
    onBuyUpgrade('engine', cost);
    showToast(`تمت ترقية سرعة الموتوسيكل للمستوى ${curLvl + 1} (+10 كم/س)!`);
  };

  const handleDriveNow = () => {
    const launchTuning: MotoTuningConfig = {
      ...(unownedItems.length === 0 ? previewTuning : savedTuning),
      chassis: activeMoto.isVespa ? 'vespa' : 'sport',
    };
    if (unownedItems.length === 0) {
      onSaveTuning(launchTuning);
    }
    onLaunchCorniche(launchTuning);
  };

  // ============================================================================
  // 360° INTERACTIVE ALEXANDRIA CORNICHE SIDEWALK 3D GARAGE SCENE
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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

    const isMobileDevice =
      Boolean(window.matchMedia?.('(pointer: coarse)').matches) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && !isMobileDevice,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl && !isMobileDevice;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(
      isSoftwareGl || isMobileDevice ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
    );

    const w = Math.max(300, container.clientWidth || window.innerWidth);
    const h = Math.max(240, container.clientHeight || window.innerHeight);
    renderer.setSize(w, h);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onRestored = () => setWebglLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    renderer.domElement.addEventListener('webglcontextrestored', onRestored);

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 6);
    const scene = new THREE.Scene();

    // Realistic PBR reflections for Metallic / Glossy / Chrome finishes
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.15, 420);

    // Sky Dome (swapped dynamically between Day / Sunset / Night)
    let skyMat = createSkyDomeMaterial(timeModeRef.current);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(340, 22, 16), skyMat);
    scene.add(sky);

    // Scene Lights (natural neutral illumination — zero blue sky tint on sidewalk or asphalt)
    const hemiLight = new THREE.HemisphereLight(0xfaf8f2, 0x6b665e, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e5, 2.2);
    keyLight.position.set(6, 11, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 36;
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xfff4e0, 0.55);
    rimLight.position.set(-7, 5, -6);
    scene.add(rimLight);

    const lampLights: THREE.PointLight[] = [];
    const lampBulbMats: THREE.MeshStandardMaterial[] = [];

    // ============================================================================
    // CLASSIC ALEXANDRIA CORNICHE SIDEWALK ENVIRONMENT
    // ============================================================================
    const envGroup = new THREE.Group();
    scene.add(envGroup);

    // 1. Solid Black Sidewalk (#000000) with Crisp White Edges (#FFFFFF), Zero Reflection
    const sidewalkTex = createCornichePromenadeTexture(maxAniso);
    sidewalkTex.repeat.set(1, 18);
    const sidewalkMat = new THREE.MeshBasicMaterial({
      map: sidewalkTex,
      fog: false,
    });
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.24, 72), sidewalkMat);
    sidewalk.position.set(0, -0.12, 0);
    envGroup.add(sidewalk);

    // 2. Crisp Pure White Curb Edge facing the Corniche Road (Right side: +X)
    const curbTex = createYellowBlackCurbTexture(maxAniso);
    curbTex.repeat.set(1, 24);
    const curbMat = new THREE.MeshBasicMaterial({
      map: curbTex,
      fog: false,
    });
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 72), curbMat);
    curb.position.set(3.62, -0.1, 0);
    envGroup.add(curb);

    // 3. Solid Black Corniche Asphalt Road (#000000) with Pure White Dashed Lines & Forward Arrows (+X)
    const roadTex = createRoadTexture(maxAniso, 12);
    const roadMat = new THREE.MeshBasicMaterial({
      map: roadTex,
      fog: false,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(18, 86), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(12.6, -0.22, 0);
    envGroup.add(road);

    // 4. Classic Alexandria Corniche Seawall on Sea Edge (Left side: -X)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd6cfc2,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0,
    });
    const copingMat = new THREE.MeshStandardMaterial({
      color: 0xe7e0d2,
      roughness: 0.85,
      metalness: 0,
      envMapIntensity: 0,
    });
    const seawall = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.02, 72), wallMat);
    seawall.position.set(-3.55, 0.5, 0);
    seawall.receiveShadow = true;
    seawall.castShadow = true;
    const seawallTop = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 72), copingMat);
    seawallTop.position.set(-3.55, 1.05, 0);
    envGroup.add(seawall, seawallTop);

    // 5. Mediterranean Sea beyond the seawall (-X) in vivid blue with animated waves, shoreline surf & boats
    const seaTex = createSeaTexture(maxAniso);
    seaTex.repeat.set(9, 14);
    const garageSeaTime = { value: 0 };
    const seaMat = new THREE.MeshStandardMaterial({
      map: seaTex,
      color: 0x1565d8,
      roughness: 0.14,
      metalness: 0.26,
    });
    seaMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = garageSeaTime;
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
          transformed.z += sin(wp.x * 0.28 - uTime * 2.1 + sin(wp.z * 0.11) * 1.1) * 0.22 + cos(wp.z * 0.16 + uTime * 1.4) * 0.08;
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `,
        );
      shader.fragmentShader =
        `
        uniform float uTime;
        varying vec3 vWorldPos;
        ` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          float wA = sin(vWorldPos.x * 0.38 - uTime * 2.25 + sin(vWorldPos.z * 0.1 + uTime * 0.5) * 1.3) * 0.5 + 0.5;
          float crest = smoothstep(0.55, 0.94, pow(wA, 3.6));
          totalEmissiveRadiance += vec3(0.08, 0.28, 0.72) * wA * 0.34 + vec3(0.88, 0.95, 1.0) * crest * 0.55;
          `,
        );
    };
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 240, 48, 64), seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(-104, -1.15, 0);
    envGroup.add(sea);

    // Classic Alexandrian boats & white sailboats floating on the vivid blue sea beyond the garage seawall
    const garageBoats: { mesh: THREE.Group; baseY: number; phase: number }[] = [];
    const gBoatWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, side: THREE.DoubleSide });
    const gBoatWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.78 });
    const gBoatSpecs = [
      { x: -24, z: -12, rot: 0.25, hull: 0xdc2626, sail: false },
      { x: -38, z: 7, rot: -0.32, hull: 0xffffff, sail: true },
      { x: -52, z: -22, rot: 0.4, hull: 0x1d4ed8, sail: false },
      { x: -30, z: 22, rot: -0.2, hull: 0xffffff, sail: true },
    ];
    gBoatSpecs.forEach((bs, idx) => {
      const bg = new THREE.Group();
      const hMat = new THREE.MeshStandardMaterial({ color: bs.hull, roughness: 0.5 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 6.8), hMat);
      hull.position.y = 0.25;
      const bow = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.4, 4), hMat);
      bow.rotation.x = -Math.PI / 2;
      bow.rotation.z = Math.PI / 4;
      bow.position.set(0, 0.32, -4.5);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 2.2), gBoatWhiteMat);
      cabin.position.set(0, 1.2, 0.5);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, bs.sail ? 7.2 : 4.5, 6), gBoatWoodMat);
      mast.position.set(0, bs.sail ? 4.2 : 2.8, -0.8);
      bg.add(hull, bow, cabin, mast);
      if (bs.sail) {
        const sShape = new THREE.Shape();
        sShape.moveTo(0, 0);
        sShape.lineTo(3.2, 0.2);
        sShape.lineTo(0, 5.8);
        sShape.closePath();
        const sGeo = new THREE.ShapeGeometry(sShape);
        sGeo.rotateY(Math.PI / 2);
        const sMesh = new THREE.Mesh(sGeo, gBoatWhiteMat);
        sMesh.position.set(0.04, 1.5, -0.75);
        bg.add(sMesh);
      }
      bg.position.set(bs.x, -1.05, bs.z);
      bg.rotation.y = bs.rot;
      envGroup.add(bg);
      garageBoats.push({ mesh: bg, baseY: -1.05, phase: idx * 1.4 });
    });

    const shoreFoamTex = createShoreFoamTexture(maxAniso);
    shoreFoamTex.repeat.set(1, 5);
    const shoreFoam = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 200),
      new THREE.MeshBasicMaterial({
        map: shoreFoamTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    );
    shoreFoam.rotation.x = -Math.PI / 2;
    shoreFoam.rotation.z = Math.PI;
    shoreFoam.position.set(-12.8, -0.95, 0);
    envGroup.add(shoreFoam);
    soundFX.startSeaAmbience();

    // 6. Corniche Ornate Streetlamps + Alexandria Date Palms framing the Garage
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.72 });
    for (const lz of [-9, 9]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 8), poleMat);
      pole.position.set(-3.15, 2.6, lz);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), poleMat);
      arm.position.set(-2.6, 5.1, lz);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff7ed,
        emissive: 0xfdba74,
        emissiveIntensity: 2.2,
      });
      lampBulbMats.push(bulbMat);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), bulbMat);
      bulb.position.set(-2.1, 4.98, lz);
      const pLight = new THREE.PointLight(0xffb86c, 4.5, 18, 1.5);
      pLight.position.set(-2.1, 4.7, lz);
      lampLights.push(pLight);
      envGroup.add(pole, arm, bulb, pLight);
    }

    const treeBundle = createRealisticTreeBundle(maxAniso);
    for (const [px, pz, sc] of [
      [-2.75, -5.6, 0.88],
      [-2.75, 5.8, 0.94],
      [-2.8, -16, 1.02],
      [-2.8, 16.5, 0.96],
    ] as [number, number, number][]) {
      const palm = treeBundle.createPalmGroup(sc);
      palm.position.set(px, 0, pz);
      envGroup.add(palm);
    }

    // Subtle Soft Contact Shadow Disc under the parked motorcycle
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(0,0,0,0.68)');
    sGrad.addColorStop(0.65, 'rgba(0,0,0,0.28)');
    sGrad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.5),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.008, 0);
    scene.add(contactShadow);

    // ============================================================================
    // PARKED SHOWCASE MOTORCYCLE / VESPA ROOT
    // ============================================================================
    const bikeMount = new THREE.Group();
    bikeMount.position.set(0, 0.01, 0);
    // Slight natural kickstand park lean (-0.06 rad)
    bikeMount.rotation.z = -0.04;
    scene.add(bikeMount);

    const mountBike = (chassis: MotoChassisType, tuning: MotoTuningConfig) => {
      if (rigRef.current) {
        bikeMount.remove(rigRef.current.group);
        disposeObject3D(rigRef.current.group);
        rigRef.current = null;
      }
      const nextRig = buildPlayerVehicle3D(
        chassis === 'vespa' ? 'vespa' : 'black_supermoto',
        1,
        false,
        maxAniso,
        'green_tracksuit',
        {
          isVespa: chassis === 'vespa',
          hideRiderForPreview: true,
          tuning,
        },
      );
      bikeMount.add(nextRig.group);
      rigRef.current = nextRig;
    };

    rebuildBikeRef.current = mountBike;
    mountBike(tuningRef.current.chassis, tuningRef.current);

    // Atmosphere updater (Day / Sunset / Night)
    const applyAtmosphere = (mode: AtmosphereMode) => {
      const nextSkyMat = createSkyDomeMaterial(mode);
      sky.material = nextSkyMat;
      skyMat.dispose();
      skyMat = nextSkyMat;

      if (mode === 'night') {
        scene.fog = new THREE.FogExp2(0x09101f, 0.0078);
        hemiLight.color.setHex(0x4a5f82);
        hemiLight.groundColor.setHex(0x1b1d24);
        hemiLight.intensity = 0.62;
        keyLight.color.setHex(0xdbeafe);
        keyLight.intensity = 1.15;
        keyLight.position.set(5, 11, 7);
        rimLight.color.setHex(0x93c5fd);
        rimLight.intensity = 0.65;
        seaMat.color.setHex(0x0b357a);
        renderer.toneMappingExposure = 1.12;
        lampLights.forEach((l) => (l.intensity = 7.5));
        lampBulbMats.forEach((m) => (m.emissiveIntensity = 3.6));
      } else if (mode === 'sunset') {
        scene.fog = new THREE.FogExp2(0xd98055, 0.0062);
        hemiLight.color.setHex(0xfbd3a8);
        hemiLight.groundColor.setHex(0x7c4b34);
        hemiLight.intensity = 0.92;
        keyLight.color.setHex(0xff9e4d);
        keyLight.intensity = 2.55;
        keyLight.position.set(-10, 6.2, -5);
        rimLight.color.setHex(0xfb923c);
        rimLight.intensity = 0.85;
        seaMat.color.setHex(0x144ea8);
        renderer.toneMappingExposure = 1.12;
        lampLights.forEach((l) => (l.intensity = 3.4));
        lampBulbMats.forEach((m) => (m.emissiveIntensity = 2.1));
      } else {
        scene.fog = new THREE.FogExp2(0xcfe8fb, 0.0034);
        hemiLight.color.setHex(0xffffff);
        hemiLight.groundColor.setHex(0x78736b);
        hemiLight.intensity = 1.12;
        keyLight.color.setHex(0xfffdf5);
        keyLight.intensity = 2.65;
        keyLight.position.set(8, 15, 9);
        rimLight.color.setHex(0xfff9eb);
        rimLight.intensity = 0.55;
        seaMat.color.setHex(0x1565d8);
        renderer.toneMappingExposure = 1.08;
        lampLights.forEach((l) => (l.intensity = 0.0));
        lampBulbMats.forEach((m) => (m.emissiveIntensity = 0.1));
      }
    };
    applyAtmoRef.current = applyAtmosphere;
    applyAtmosphere(timeModeRef.current);

    // ============================================================================
    // SMOOTH 360° TOUCH / MOUSE ORBIT + PINCH / WHEEL ZOOM
    // ============================================================================
    let targetAzimuth = 0.68; // 3/4 front hero angle
    let curAzimuth = targetAzimuth;
    let targetPolar = 1.24; // eye-level slight downward look
    let curPolar = targetPolar;
    let targetRadius = 3.35;
    let curRadius = targetRadius;
    let interacted = false;

    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (!interacted) {
        interacted = true;
        setUserDragged(true);
      }
      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const prev = activePointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        targetAzimuth -= dx * 0.0085;
        targetPolar = THREE.MathUtils.clamp(targetPolar - dy * 0.0055, 0.35, 1.44);
      } else if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (lastPinchDist !== null) {
          targetRadius = THREE.MathUtils.clamp(targetRadius - (dist - lastPinchDist) * 0.009, 2.25, 5.2);
        }
        lastPinchDist = dist;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) lastPinchDist = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetRadius = THREE.MathUtils.clamp(targetRadius + e.deltaY * 0.0022, 2.25, 5.2);
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const nw = Math.max(300, container.clientWidth);
      const nh = Math.max(240, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // Render loop with software-GL pacing guard
    let alive = true;
    let rafId = 0;
    let timerId: number | null = null;
    let lastTs = performance.now();
    let elapsed = 0;
    const lookTarget = new THREE.Vector3(0, 0.72, 0.02);

    const scheduleNext = (fn: () => void) => {
      if (!alive) return;
      if (isSoftwareGl) {
        timerId = window.setTimeout(fn, 140);
      } else {
        rafId = window.requestAnimationFrame(fn);
      }
    };

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      elapsed += dt;

      // Gentle slow 360° showcase orbit ONLY before the user drags manually
      if (!interacted) {
        targetAzimuth += dt * 0.22;
      }

      curAzimuth = THREE.MathUtils.damp(curAzimuth, targetAzimuth, 9, dt);
      curPolar = THREE.MathUtils.damp(curPolar, targetPolar, 9, dt);
      curRadius = THREE.MathUtils.damp(curRadius, targetRadius, 9, dt);

      const sinP = Math.sin(curPolar);
      camera.position.set(
        lookTarget.x + curRadius * sinP * Math.sin(curAzimuth),
        Math.max(0.32, lookTarget.y + curRadius * Math.cos(curPolar)),
        lookTarget.z + curRadius * sinP * Math.cos(curAzimuth),
      );
      camera.lookAt(lookTarget);

      // Animate Mediterranean sea waves, shoreline surf & bobbing boats
      garageSeaTime.value = elapsed;
      seaTex.offset.x = (seaTex.offset.x - dt * 0.16 + 1) % 1;
      seaTex.offset.y = (elapsed * 0.06) % 1;
      shoreFoamTex.offset.x = -0.04 + Math.sin(elapsed * 1.45) * 0.065;
      shoreFoamTex.offset.y = (elapsed * 0.05) % 1;
      for (const gb of garageBoats) {
        gb.mesh.position.y = gb.baseY + Math.sin(elapsed * 2.0 + gb.phase) * 0.16;
        gb.mesh.rotation.z = Math.sin(elapsed * 1.5 + gb.phase) * 0.055;
      }

      // Animate rev pulse (chassis shake + rear wheel spin so Rim & Valve LEDs shine in motion!)
      if (revPulseRef.current > 0) {
        revPulseRef.current = Math.max(0, revPulseRef.current - dt * 1.15);
      }
      const revAmt = revPulseRef.current;
      bikeMount.position.y = 0.01 + (revAmt > 0.05 ? Math.sin(elapsed * 58) * 0.008 * revAmt : 0);

      const rig = rigRef.current;
      if (rig) {
        // Subtle wheel rotation when rim LEDs are active or revving so wheel LEDs visibly shine
        const wheelSpin =
          revAmt > 0.05
            ? 24 * revAmt * dt
            : tuningRef.current.rimLedColor
              ? 3.2 * dt
              : 0;
        if (wheelSpin > 0) {
          for (const wh of rig.wheels) {
            wh.rotation.x -= wheelSpin;
          }
        }
        rig.animateVehicle?.(elapsed, dt, 'none', false, 0, {
          throttle: revAmt > 0.1,
          speedKmh: revAmt > 0.05 ? Math.round(revAmt * 145) : 0,
          rpmRatio: 0.18 + revAmt * 0.82,
          gear: revAmt > 0.45 ? 3 : revAmt > 0.15 ? 2 : 1,
          atmosphere: timeModeRef.current,
          isPov: false,
        });
      }

      renderer.render(scene, camera);
      scheduleNext(tick);
    };

    scheduleNext(tick);

    return () => {
      alive = false;
      window.cancelAnimationFrame(rafId);
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('webglcontextlost', onLost);
      dom.removeEventListener('webglcontextrestored', onRestored);
      rebuildBikeRef.current = null;
      applyAtmoRef.current = null;
      rigRef.current = null;
      soundFX.stopSeaAmbience();
      disposeObject3D(scene);
      seaTex.dispose();
      shoreFoamTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, []);

  const isPartOwned = (key: string, price: number) => price === 0 || ownedSet.has(key);

  const renderColorCircles = (
    options: { id: string; hex: string | null; label: string; price: number }[],
    selectedHex: string | null,
    keyPrefix: string,
    onSelect: (hex: string | null) => void,
  ) => (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {options.map((opt) => {
        const active = selectedHex === opt.hex;
        const owned = isPartOwned(`${keyPrefix}:${opt.id}`, opt.price);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.hex)}
            className={`relative shrink-0 min-h-[44px] px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
              active
                ? 'border-amber-400 bg-amber-400/15 text-white'
                : 'border-white/12 bg-[#141D2E] text-slate-300 hover:border-white/30'
            }`}
          >
            <span
              className="w-6 h-6 rounded-full border-2 border-white/60 shrink-0 flex items-center justify-center"
              style={{
                background: opt.hex ?? 'repeating-linear-gradient(45deg,#1e293b,#1e293b 4px,#475569 4px,#475569 8px)',
                boxShadow: opt.hex ? `0 0 10px ${opt.hex}` : undefined,
              }}
            >
              {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
            </span>
            <div className="text-right leading-tight">
              <div className="text-xs font-extrabold whitespace-nowrap">{opt.label}</div>
              {!owned && (
                <div className="text-[10px] font-bold text-amber-300 whitespace-nowrap flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{opt.price} ج.م</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div dir="rtl" className="relative w-full h-dvh overflow-hidden bg-[#080E1A] text-white select-none">
      {/* Full-Viewport 360° Interactive 3D Corniche Garage Canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
      />

      {webglLost && (
        <div className="absolute inset-0 z-30 bg-[#080E1A]/95 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Wrench className="w-10 h-10 text-amber-400" />
          <div className="text-lg font-black">تم إيقاف عرض 3D مؤقتاً</div>
          <button
            type="button"
            onClick={onBackToMenu}
            className="min-h-[44px] px-5 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع للرئيسية</span>
          </button>
        </div>
      )}

      {/* TOP COMPACT HEADER BAR (Solid dark obsidian — ZERO backdrop-blur over WebGL) */}
      <header className="absolute top-0 inset-x-0 z-20 pointer-events-none p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2">
        {/* Right: Back + Title + Wallet */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToMenu}
            aria-label="رجوع للرئيسية"
            className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-[#0B111E]/95 hover:bg-[#162136] border border-amber-400/45 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>رجوع</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-[#0B111E]/92 border border-amber-400/35 flex items-center gap-2.5 flex-wrap">
            <div>
              <h1 className="text-xs sm:text-sm font-black text-amber-300 leading-tight whitespace-nowrap">
                بطل الإسكندرية · مستوى {activeMoto.level}/7
              </h1>
              <div className="text-[10px] text-slate-300 font-bold whitespace-nowrap">
                {activeMoto.name} · {activeMoto.difficultyLabel} · سرعة +{progress.upgrades.engine * 10}
              </div>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1 text-amber-300 font-black text-xs sm:text-sm whitespace-nowrap font-mono tabular-nums">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{progress.wallet} ج.م</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <div className="hidden md:flex items-center gap-1 text-emerald-300 font-black text-xs whitespace-nowrap font-mono tabular-nums">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>إيراد اليوم: {progress.dailyEarnings ?? 0} ج.م</span>
            </div>
          </div>
        </div>

        {/* Left: Bike Switcher + Day/Night Toggle + Rev Engine Test */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Chassis Switcher: Sport Moto vs Classic Vespa */}
          <div className="flex rounded-xl bg-[#0B111E]/95 border border-white/15 p-1">
            <button
              type="button"
              onClick={() =>
                updatePreview({ chassis: 'sport', engineSound: 'race_sport' })
              }
              className={`min-h-[36px] px-2.5 sm:px-3 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors ${
                previewTuning.chassis === 'sport'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              موتوسيكل حديث
            </button>
            <button
              type="button"
              onClick={() =>
                updatePreview({ chassis: 'vespa', engineSound: 'classic_vespa' })
              }
              className={`min-h-[36px] px-2.5 sm:px-3 rounded-lg text-xs font-black whitespace-nowrap shrink-0 transition-colors ${
                previewTuning.chassis === 'vespa'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              سكوتر كلاسيك
            </button>
          </div>

          {/* Sea Sound On/Off Toggle */}
          <SeaSoundButton />

          {/* Day / Sunset / Night 3-Way Switcher (syncs live with 3D garage & motorcycle road!) */}
          <div className="flex rounded-xl bg-[#0B111E]/95 border border-white/20 p-1 gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onChangeAtmosphere('day')}
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-black flex items-center gap-1 whitespace-nowrap transition-colors ${
                atmosphere === 'day'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>نهار</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeAtmosphere('sunset')}
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-black flex items-center gap-1 whitespace-nowrap transition-colors ${
                atmosphere === 'sunset'
                  ? 'bg-orange-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" />
              <span>غروب</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeAtmosphere('night')}
              className={`min-h-[36px] px-2.5 rounded-lg text-xs font-black flex items-center gap-1 whitespace-nowrap transition-colors ${
                atmosphere === 'night'
                  ? 'bg-indigo-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>ليل</span>
            </button>
          </div>

          {/* Rev Engine & Gears Test Button */}
          <button
            type="button"
            onClick={handleRevEngine}
            className={`min-h-[44px] px-3 sm:px-3.5 rounded-xl border font-black text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-transform active:scale-95 ${
              isRevving
                ? 'bg-orange-500 border-amber-300 text-slate-950'
                : 'bg-[#1A1320]/95 hover:bg-[#2A1924] border-orange-400/50 text-orange-300'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>تجربة البنزين</span>
          </button>
        </div>
      </header>

      {/* Subtle 360 Orbit Hint (disappears automatically once dragged) */}
      {!userDragged && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1.5 rounded-lg bg-[#0B111E]/85 border border-white/15 text-[11px] font-bold text-slate-200 whitespace-nowrap">
          اسحب بإصبعك لتدوير الموتوسيكل 360° • قرّب للتفاصيل
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ======================================================================== */}
      {/* BOTTOM COLLAPSIBLE TUNING DOCK (5 Main Categories + Try Before Buy)      */}
      {/* ======================================================================== */}
      <section className="absolute bottom-0 inset-x-0 z-20 flex flex-col items-center pointer-events-none px-2 sm:px-4 pb-2 sm:pb-3">
        {/* Collapse / Expand Handle + Quick Launch when collapsed */}
        <div className="pointer-events-auto flex items-center gap-2 mb-1.5">
          <button
            type="button"
            onClick={() => setDockOpen((v) => !v)}
            className="min-h-[36px] px-3.5 rounded-t-xl rounded-b-lg bg-[#0B111E]/95 border border-white/15 text-xs font-extrabold text-amber-300 flex items-center gap-1.5 whitespace-nowrap"
          >
            {dockOpen ? (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>إخفاء القائمة للتأمل 360°</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>إظهار التعديلات</span>
              </>
            )}
          </button>

          {!dockOpen && (
            <button
              type="button"
              onClick={handleDriveNow}
              className="min-h-[36px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>انزل الكورنيش</span>
            </button>
          )}
        </div>

        {dockOpen && (
          <div className="pointer-events-auto w-full max-w-4xl rounded-2xl bg-[#0B111E]/95 border border-white/15 shadow-2xl overflow-hidden flex flex-col">
            {/* 6 Category Tabs */}
            <div className="grid grid-cols-6 border-b border-white/10 bg-[#080D18]">
              {GARAGE_TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`min-h-[46px] px-1 py-2 flex flex-col sm:flex-row items-center justify-center gap-1 text-[10px] sm:text-xs font-black whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                      active
                        ? 'border-amber-400 text-amber-300 bg-[#121C30]'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Category Content Area (Compact & Scrollable on Small Mobile) */}
            <div className="p-3 sm:p-4 max-h-[38vh] overflow-y-auto space-y-3">
              {/* 0. 7 MOTORCYCLE LEVELS + 7 SPEED UPGRADE LEVELS */}
              {activeTab === 'models' && (
                <div className="space-y-3">
                  {/* Quick 7-Level Speed Upgrade Strip */}
                  {(() => {
                    const engInfo = UPGRADE_INFO.engine;
                    const engLvl = progress.upgrades.engine;
                    const isMax = engLvl >= engInfo.maxLevel;
                    const nextCost = isMax ? 0 : engInfo.costs[engLvl];
                    const canAfford = !isMax && progress.wallet >= nextCost;
                    return (
                      <div className="p-2.5 sm:p-3 rounded-xl bg-[#131E32] border border-amber-400/35 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="space-y-1 flex-1 min-w-[200px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                              <Zap className="w-4 h-4" />
                              <span>ترقية سرعة الموتوسيكل (المستوى {engLvl} / {engInfo.maxLevel})</span>
                            </span>
                            <span className="text-[11px] font-mono font-bold text-emerald-300">
                              +{engLvl * 10} كم/س
                            </span>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: engInfo.maxLevel }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-1.5 rounded-full ${
                                  i < engLvl ? 'bg-amber-400' : 'bg-white/10'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isMax}
                          onClick={handleBuySpeedUpgrade}
                          className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                            isMax
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 cursor-default'
                              : canAfford
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          <Gauge className="w-3.5 h-3.5" />
                          <span>
                            {isMax
                              ? 'أقصى سرعة (مستوى 7)'
                              : `طوّر للمستوى ${engLvl + 1} (${nextCost} ج.م)`}
                          </span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* 7 Motorcycle Models Horizontal/Grid Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {MOTO_MODELS.map((moto) => {
                      const isUnlocked = unlockedMotos.includes(moto.id);
                      const isActive = activeMotoId === moto.id;
                      const isPreview = previewMotoId === moto.id;
                      const canAfford = progress.wallet >= moto.price;
                      const totalSpeed = moto.topSpeedKmh + progress.upgrades.engine * 4;

                      return (
                        <div
                          key={moto.id}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                            isActive
                              ? 'border-emerald-400 bg-emerald-500/12'
                              : isPreview
                                ? 'border-amber-400 bg-amber-400/12'
                                : 'border-white/12 bg-[#141D2E]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handlePreviewMotoModel(moto.id)}
                            className="text-right space-y-1.5 w-full"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-black font-mono">
                                  مستوى {moto.level}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                    moto.difficultyTier === 'easy'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : moto.difficultyTier === 'medium'
                                        ? 'bg-sky-500/20 text-sky-300'
                                        : moto.difficultyTier === 'hard'
                                          ? 'bg-orange-500/20 text-orange-300'
                                          : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {moto.difficultyLabel}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-sky-300">
                                {totalSpeed} كم/س
                              </span>
                            </div>
                            <div className="text-xs font-black text-white leading-tight">
                              {moto.name}
                            </div>
                            <div className="text-[10px] text-amber-200/90 font-bold leading-snug">
                              ★ {moto.perkTitle}: {moto.perkDesc}
                            </div>
                          </button>

                          {isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handlePreviewMotoModel(moto.id)}
                              className={`w-full min-h-[34px] rounded-lg text-[11px] font-black flex items-center justify-center gap-1 ${
                                isActive
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                                  : 'bg-white/10 hover:bg-white/15 text-white'
                              }`}
                            >
                              {isActive && <Check className="w-3.5 h-3.5" />}
                              <span>{isActive ? 'الموتوسيكل النشط' : 'تجهيز الآن'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBuyMotoModel(moto.id, moto.price)}
                              className={`w-full min-h-[34px] rounded-lg text-[11px] font-black flex items-center justify-center gap-1 ${
                                canAfford
                                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                  : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              <Lock className="w-3 h-3" />
                              <span>
                                {canAfford
                                  ? `فتح وشراء (${moto.price.toLocaleString('en-US')} ج.م)`
                                  : `يفتح بـ ${moto.price.toLocaleString('en-US')} ج.م`}
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 1. LIGHTS & LEDs */}
              {activeTab === 'lights' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                      نيون سفلي (Underglow Neon)
                    </div>
                    {renderColorCircles(
                      NEON_COLOR_OPTIONS,
                      previewTuning.underglowColor,
                      'underglow',
                      (hex) => updatePreview({ underglowColor: hex }),
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                      عيون ملاك داخل الكشاف (Angel Eyes)
                    </div>
                    {renderColorCircles(
                      NEON_COLOR_OPTIONS,
                      previewTuning.angelEyeColor,
                      'angelEye',
                      (hex) => updatePreview({ angelEyeColor: hex }),
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                      لمبات الجنوط والبلوف (Rim & Valve LEDs)
                    </div>
                    {renderColorCircles(
                      RIM_LED_COLOR_OPTIONS,
                      previewTuning.rimLedColor,
                      'rimLed',
                      (hex) => updatePreview({ rimLedColor: hex }),
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Strobes Toggle */}
                    <button
                      type="button"
                      onClick={() => updatePreview({ strobesEnabled: !previewTuning.strobesEnabled })}
                      className={`min-h-[46px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                        previewTuning.strobesEnabled
                          ? 'border-sky-400 bg-sky-500/15 text-white'
                          : 'border-white/12 bg-[#141D2E] text-slate-300'
                      }`}
                    >
                      <div className="text-right">
                        <div className="text-xs font-black">فلاشرات أمامية (Strobes)</div>
                        <div className="text-[10px] text-slate-400">وميض متقطع سريع على المقدمة</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isPartOwned('strobes:on', BLING_ACCESSORY_PRICES.strobes) && (
                          <span className="text-[10px] font-black text-amber-300">
                            {BLING_ACCESSORY_PRICES.strobes} ج.م
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            previewTuning.strobesEnabled
                              ? 'bg-sky-400 text-slate-950'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {previewTuning.strobesEnabled ? 'مفعّل' : 'إيقاف'}
                        </span>
                      </div>
                    </button>

                    {/* LED Front Arabic Signs */}
                    <div className="rounded-xl border border-white/12 bg-[#141D2E] p-2">
                      <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                        لافتة مضيئة أمامية (LED Sign)
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {LED_SIGN_OPTIONS.map((sign) => {
                          const active = previewTuning.ledSign === sign.id;
                          const owned = isPartOwned(`ledSign:${sign.id}`, sign.price);
                          return (
                            <button
                              key={sign.id}
                              type="button"
                              onClick={() => updatePreview({ ledSign: sign.id })}
                              className={`min-h-[36px] px-2.5 rounded-lg border text-[11px] font-black whitespace-nowrap shrink-0 flex items-center gap-1 ${
                                active
                                  ? 'border-amber-400 bg-amber-400/20 text-white'
                                  : 'border-white/10 bg-[#0B111E] text-slate-300'
                              }`}
                            >
                              <span>{sign.text}</span>
                              {!owned && (
                                <span className="text-[9px] text-amber-300">({sign.price})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PAINT & FINISHES */}
              {activeTab === 'paint' && (
                <div className="space-y-3">
                  {/* Paint Finish Type */}
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                      نوع الطلاء (Paint Finish)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {PAINT_FINISH_OPTIONS.map((fin) => {
                        const active = previewTuning.paintFinish === fin.id;
                        const owned = isPartOwned(`finish:${fin.id}`, fin.price);
                        return (
                          <button
                            key={fin.id}
                            type="button"
                            onClick={() => updatePreview({ paintFinish: fin.id })}
                            className={`min-h-[46px] px-3 py-1.5 rounded-xl border text-center transition-colors ${
                              active
                                ? 'border-amber-400 bg-amber-400/20 text-white'
                                : 'border-white/12 bg-[#141D2E] text-slate-300'
                            }`}
                          >
                            <div className="text-xs font-black">{fin.label}</div>
                            <div className="text-[10px] text-slate-400">
                              {owned ? fin.subtitle : `${fin.price} ج.م`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Body Color */}
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                      لون هيكل الموتوسيكل (Body)
                    </div>
                    {renderColorCircles(
                      BODY_PAINT_OPTIONS.map((o) => ({ id: o.hex, ...o })),
                      previewTuning.bodyColor,
                      'body',
                      (hex) => hex && updatePreview({ bodyColor: hex }),
                    )}
                  </div>

                  {/* Rims & Seat Colors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                        لون الجنوط (Rims)
                      </div>
                      {renderColorCircles(
                        RIM_PAINT_OPTIONS.map((o) => ({ id: o.hex, ...o })),
                        previewTuning.rimColor,
                        'rim',
                        (hex) => hex && updatePreview({ rimColor: hex }),
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                        لون المقعد (Seat)
                      </div>
                      {renderColorCircles(
                        SEAT_COLOR_OPTIONS.map((o) => ({ id: o.hex, ...o })),
                        previewTuning.seatColor,
                        'seat',
                        (hex) => hex && updatePreview({ seatColor: hex }),
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. EXHAUST & SPARKS */}
              {activeTab === 'exhaust' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-300">
                      اختر شكل الشكمان وجرّب الشرارات أثناء التسارع
                    </span>
                    <button
                      type="button"
                      onClick={handleRevEngine}
                      className="min-h-[34px] px-3 rounded-lg bg-orange-500/20 border border-orange-400/50 text-orange-300 text-[11px] font-black flex items-center gap-1 whitespace-nowrap"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>جرّب الشرارات</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {EXHAUST_OPTIONS.map((ex) => {
                      const active = previewTuning.exhaustStyle === ex.id;
                      const owned = isPartOwned(`exhaust:${ex.id}`, ex.price);
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => {
                            updatePreview({ exhaustStyle: ex.id });
                            soundFX.playRevBurst(previewTuning.engineSound, ex.id !== 'stock');
                            revPulseRef.current = 0.85;
                            rigRef.current?.triggerExhaustRev?.(0.95);
                          }}
                          className={`min-h-[68px] p-3 rounded-xl border text-right transition-colors ${
                            active
                              ? 'border-amber-400 bg-amber-400/15 text-white'
                              : 'border-white/12 bg-[#141D2E] text-slate-300 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black">{ex.label}</span>
                            {owned ? (
                              <span className="text-[10px] font-extrabold text-emerald-300">مملوك</span>
                            ) : (
                              <span className="text-[10px] font-black text-amber-300">{ex.price} ج.م</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">{ex.sparkDesc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. BLING & ACCESSORIES */}
              {activeTab === 'bling' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      field: 'sportMirrors' as const,
                      key: 'bling:sportMirrors',
                      title: 'مرايا رياضية',
                      desc: 'مرايا جناح انسيابية بلمسة ذهبية وكربون',
                      price: BLING_ACCESSORY_PRICES.sportMirrors,
                    },
                    {
                      field: 'youthStickers' as const,
                      key: 'bling:youthStickers',
                      title: 'ملصقات شبابية',
                      desc: 'ستيكرات نجم الكورنيش وخطوط سباق جانبية',
                      price: BLING_ACCESSORY_PRICES.youthStickers,
                    },
                    {
                      field: 'extraRacks' as const,
                      key: 'bling:extraRacks',
                      title: 'حوامل إضافية',
                      desc: 'حامل موبايل للجادون + شبكة كروم خلفية',
                      price: BLING_ACCESSORY_PRICES.extraRacks,
                    },
                  ].map((item) => {
                    const active = previewTuning[item.field];
                    const owned = isPartOwned(item.key, item.price);
                    return (
                      <button
                        key={item.field}
                        type="button"
                        onClick={() => updatePreview({ [item.field]: !active })}
                        className={`min-h-[72px] p-3 rounded-xl border text-right flex flex-col justify-between gap-1 transition-colors ${
                          active
                            ? 'border-amber-400 bg-amber-400/15 text-white'
                            : 'border-white/12 bg-[#141D2E] text-slate-300 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black">{item.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              active ? 'bg-amber-400 text-slate-950' : 'bg-white/10 text-slate-300'
                            }`}
                          >
                            {active ? 'مُركّب' : owned ? 'تركيب' : `${item.price} ج.م`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 5. SOUND & HORNS */}
              {activeTab === 'sound' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-300 mb-1.5">
                      صوت المحرك (Engine Sound)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ENGINE_SOUND_OPTIONS.map((eng) => {
                        const active = previewTuning.engineSound === eng.id;
                        return (
                          <button
                            key={eng.id}
                            type="button"
                            onClick={() => {
                              updatePreview({ engineSound: eng.id });
                              soundFX.playRevBurst(eng.id, previewTuning.exhaustStyle !== 'stock');
                              revPulseRef.current = 0.85;
                              rigRef.current?.triggerExhaustRev?.(0.85);
                            }}
                            className={`min-h-[54px] px-3 py-2 rounded-xl border text-right flex items-center justify-between gap-2 ${
                              active
                                ? 'border-amber-400 bg-amber-400/15 text-white'
                                : 'border-white/12 bg-[#141D2E] text-slate-300'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-black">{eng.label}</div>
                              <div className="text-[10px] text-slate-400">{eng.subtitle}</div>
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-extrabold text-amber-300 whitespace-nowrap">
                              اسمع
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-300">
                        صوت الكلاكس (Horn Sound)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTestHorn()}
                        className="min-h-[32px] px-3 rounded-lg bg-sky-500/20 border border-sky-400/50 text-sky-300 text-[11px] font-black flex items-center gap-1 whitespace-nowrap"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>جرّب الكلاكس</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {HORN_SOUND_OPTIONS.map((horn) => {
                        const active = previewTuning.hornSound === horn.id;
                        const owned = isPartOwned(`horn:${horn.id}`, horn.price);
                        return (
                          <button
                            key={horn.id}
                            type="button"
                            onClick={() => {
                              updatePreview({ hornSound: horn.id });
                              handleTestHorn(horn.id);
                            }}
                            className={`min-h-[54px] p-2.5 rounded-xl border text-right transition-colors ${
                              active
                                ? 'border-amber-400 bg-amber-400/15 text-white'
                                : 'border-white/12 bg-[#141D2E] text-slate-300'
                            }`}
                          >
                            <div className="text-[11px] font-black leading-snug">{horn.label}</div>
                            <div className="text-[10px] mt-0.5 text-amber-300 font-bold">
                              {owned ? 'مملوك' : `${horn.price} ج.م`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Try-Before-Buy & Launch Footer */}
            <div className="px-3 sm:px-4 py-2.5 border-t border-white/10 bg-[#080D18] flex flex-wrap items-center justify-between gap-2">
              {unownedItems.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-xs font-extrabold text-amber-300 whitespace-nowrap">
                      معاينة ({unownedItems.length} قطع): {totalCartCost} ج.م
                    </div>
                    <button
                      type="button"
                      onClick={handleResetToOwned}
                      className="min-h-[38px] px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إلغاء المعاينة</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mr-auto">
                    <button
                      type="button"
                      onClick={handleBuyAndEquip}
                      className={`min-h-[44px] px-4 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        canAffordCart
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>شراء وتثبيت ({totalCartCost} ج.م)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDriveNow}
                      className="min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>انزل الكورنيش</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>كل التعديلات المختارة مثبّتة وجاهزة للقيادة!</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDriveNow}
                    className="min-h-[44px] px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>انزل الكورنيش الآن</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
