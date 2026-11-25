import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowRight,
  Check,
  Coins,
  Flag,
  Gauge,
  Lock,
  Moon,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { formatRaceTime, getMotoById, RACE_BIKES, RACE_TRACKS } from '../game/data';
import { buildPlayerVehicle3D, disposeObject3D } from '../game/models3d';
import { createSeaTexture, createSkyDomeMaterial } from '../game/textures3d';
import { createRealisticTreeBundle } from '../game/trees3d';
import { SeaSoundButton } from './SeaSoundButton';
import {
  AtmosphereMode,
  GraphicsQuality,
  PlayerProgress,
  RaceBikeDef,
  RaceBikeId,
  RaceConfig,
  RaceDifficulty,
  RiderStyle,
} from '../game/types';

interface RaceSetupScreenProps {
  config: RaceConfig;
  progress: PlayerProgress;
  riderStyle: RiderStyle;
  atmosphere: AtmosphereMode;
  onChangeAtmosphere: (mode: AtmosphereMode) => void;
  onChangeConfig: (next: RaceConfig) => void;
  onSelectMoto: (motoId: RaceBikeId) => void;
  onBuyMoto: (motoId: RaceBikeId, price: number) => void;
  onOpenControls: () => void;
  onBackToMenu: () => void;
  onStartRace: () => void;
}

const DIFFICULTY_OPTIONS: { id: RaceDifficulty; label: string }[] = [
  { id: 'easy', label: 'سهل' },
  { id: 'medium', label: 'متوسط' },
  { id: 'pro', label: 'محترف' },
];

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string }[] = [
  { id: 'low', label: 'منخفض' },
  { id: 'medium', label: 'متوسط' },
  { id: 'high', label: 'عالي' },
];

const CornicheBackdrop3D: React.FC<{ quality: GraphicsQuality; atmosphere: AtmosphereMode }> = ({
  quality,
  atmosphere,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [lost, setLost] = useState(false);

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
      antialias: !isSoftwareGl && !isMobileDevice && quality !== 'low',
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl || isMobileDevice || quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.3),
    );

    const w = Math.max(300, container.clientWidth || window.innerWidth);
    const h = Math.max(200, container.clientHeight || window.innerHeight);
    renderer.setSize(w, h);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setLost(true);
    };
    const onRestored = () => setLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    renderer.domElement.addEventListener('webglcontextrestored', onRestored);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      atmosphere === 'night' ? 0x091122 : atmosphere === 'sunset' ? 0xd97d5a : 0xbae0fa,
      atmosphere === 'night' ? 0.0056 : atmosphere === 'sunset' ? 0.0052 : 0.0032,
    );

    const camera = new THREE.PerspectiveCamera(56, w / h, 0.2, 520);
    camera.position.set(4, 5.2, 22);
    camera.lookAt(-12, 3.2, -75);

    const skyMat = createSkyDomeMaterial(atmosphere);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 20, 14), skyMat);
    scene.add(sky);

    const hemi = new THREE.HemisphereLight(
      atmosphere === 'night' ? 0x4b638a : atmosphere === 'sunset' ? 0xc495f5 : 0xe0f2fe,
      atmosphere === 'night' ? 0x101827 : atmosphere === 'sunset' ? 0xea8a4b : 0x64748b,
      atmosphere === 'night' ? 0.55 : atmosphere === 'sunset' ? 0.9 : 1.05,
    );
    const sun = new THREE.DirectionalLight(
      atmosphere === 'night' ? 0xbfdbfe : atmosphere === 'sunset' ? 0xffa955 : 0xfffdf5,
      atmosphere === 'night' ? 0.85 : atmosphere === 'sunset' ? 2.2 : 2.35,
    );
    sun.position.set(
      atmosphere === 'sunset' ? -70 : 45,
      atmosphere === 'sunset' ? 22 : 68,
      atmosphere === 'sunset' ? -65 : 30,
    );
    scene.add(hemi, sun);

    const maxAniso = Math.min(2, renderer.capabilities.getMaxAnisotropy());
    const seaTex = createSeaTexture(maxAniso);
    const seaMat = new THREE.MeshStandardMaterial({
      map: seaTex,
      color: atmosphere === 'night' ? 0x0b357a : atmosphere === 'sunset' ? 0x144ea8 : 0x1565d8,
      roughness: 0.14,
      metalness: atmosphere === 'sunset' ? 0.45 : 0.25,
    });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(360, 420), seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(-130, -0.4, -140);
    scene.add(sea);

    // Coastal promenade seawall & palms silhouette
    const roadRibbon = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 340),
      new THREE.MeshStandardMaterial({ color: 0x1c2129, roughness: 0.58 }),
    );
    roadRibbon.rotation.x = -Math.PI / 2;
    roadRibbon.position.set(12, 0.02, -120);
    const prom = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.45, 340),
      new THREE.MeshStandardMaterial({ color: 0xb97a56, roughness: 0.85 }),
    );
    prom.position.set(-2.5, 0.22, -120);
    scene.add(roadRibbon, prom);

    const treeBundle = createRealisticTreeBundle(maxAniso);
    const palmCount = 14;
    const trunkInst = new THREE.InstancedMesh(treeBundle.palmTrunkGeo, treeBundle.palmBarkMat, palmCount);
    const crownInst = new THREE.InstancedMesh(treeBundle.palmCrownGeo, treeBundle.palmFrondMat, palmCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < palmCount; i++) {
      dummy.position.set(-1.6, 0.42, 10 - i * 18);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.scale.setScalar(1.05);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);
      crownInst.setMatrixAt(i, dummy.matrix);
    }
    scene.add(trunkInst, crownInst);

    const handleResize = () => {
      if (!container) return;
      const nw = Math.max(300, container.clientWidth || window.innerWidth);
      const nh = Math.max(200, container.clientHeight || window.innerHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      seaTex.offset.y += dt * 0.14;
      seaTex.offset.x = Math.sin(t * 0.4) * 0.04;
      camera.position.x = 4 + Math.sin(t * 0.16) * 1.4;
      camera.position.y = 5.2 + Math.cos(t * 0.22) * 0.25;
      camera.lookAt(-12, 3.0, -75);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        frameId = window.setTimeout(animate, 120);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      frameId = window.setTimeout(animate, 140);
    } else {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      disposeObject3D(scene);
      treeBundle.dispose();
      seaTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [quality, atmosphere]);

  const fallbackGradient =
    atmosphere === 'night'
      ? 'linear-gradient(180deg, #020617 0%, #0b1630 48%, #102546 78%, #040914 100%)'
      : atmosphere === 'sunset'
        ? 'linear-gradient(180deg, #2d1b4e 0%, #8f3d56 42%, #e88446 72%, #0e2438 100%)'
        : 'linear-gradient(180deg, #1d6fe2 0%, #56b2f6 48%, #a9dcff 74%, #1565d8 100%)';

  const overlayGradient =
    atmosphere === 'night'
      ? 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12), rgba(2, 6, 23, 0.72) 72%, rgba(2, 6, 23, 0.9) 100%)'
      : atmosphere === 'sunset'
        ? 'radial-gradient(circle at 50% 20%, rgba(251, 191, 36, 0.12), rgba(7, 11, 20, 0.72) 72%, rgba(7, 11, 20, 0.9) 100%)'
        : 'radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.08), rgba(7, 16, 32, 0.48) 72%, rgba(7, 14, 28, 0.76) 100%)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background: fallbackGradient,
      }}
    >
      {!lost && <div ref={mountRef} className="w-full h-full" />}
      <div
        className="absolute inset-0"
        style={{
          background: overlayGradient,
        }}
      />
    </div>
  );
};

const VehiclePreview3D: React.FC<{
  bike: RaceBikeDef;
  riderStyle: RiderStyle;
  quality: GraphicsQuality;
  atmosphere: AtmosphereMode;
}> = ({ bike, riderStyle, quality, atmosphere }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const dragYawRef = useRef(0.58);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    setContextLost(false);

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

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && quality !== 'low',
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setPixelRatio(
      isSoftwareGl || quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
    );

    const w = Math.max(220, container.clientWidth || 320);
    const h = Math.max(160, container.clientHeight || 200);
    renderer.setSize(w, h);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', onLost);
    renderer.domElement.addEventListener('webglcontextrestored', onRestored);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 40);
    camera.position.set(0, 1.05, 3.15);
    camera.lookAt(0, 0.58, 0);

    // Three-point showroom lighting synced to Day / Sunset / Night
    const hemi = new THREE.HemisphereLight(
      atmosphere === 'night' ? 0x60a5fa : atmosphere === 'sunset' ? 0xd8b4fe : 0xffffff,
      atmosphere === 'night' ? 0x1e293b : atmosphere === 'sunset' ? 0x334155 : 0x64748b,
      atmosphere === 'night' ? 0.85 : atmosphere === 'sunset' ? 1.15 : 1.25,
    );
    const keyLight = new THREE.DirectionalLight(
      atmosphere === 'night' ? 0xdbeafe : atmosphere === 'sunset' ? 0xffbe7b : 0xfffef8,
      atmosphere === 'night' ? 1.8 : atmosphere === 'sunset' ? 2.5 : 2.65,
    );
    keyLight.position.set(3.2, 4.4, 3.8);
    const rimLight = new THREE.DirectionalLight(
      atmosphere === 'night' ? 0x38bdf8 : atmosphere === 'sunset' ? 0xfb923c : 0x7dd3fc,
      atmosphere === 'night' ? 1.9 : 1.45,
    );
    rimLight.position.set(-3.5, 2.2, -3.5);
    const fillLight = new THREE.DirectionalLight(
      atmosphere === 'night' ? 0x93c5fd : atmosphere === 'sunset' ? 0xfef08a : 0xf8fafc,
      atmosphere === 'night' ? 0.85 : 1.05,
    );
    fillLight.position.set(0, 1.2, 4.2);
    scene.add(hemi, keyLight, rimLight, fillLight);

    // Showroom turntable platform
    const padBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.52, 0.09, 36),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.72 }),
    );
    padBase.position.y = -0.045;
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(1.36, 1.43, 40),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.y = 0.005;
    scene.add(padBase, padRing);

    const turntable = new THREE.Group();
    scene.add(turntable);

    const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const rig = buildPlayerVehicle3D(bike.vehicleKind, 1, true, maxAniso, riderStyle, {
      paintHex: bike.paintHex,
      accentHex: bike.accentHex,
      isVespa: bike.isVespa,
      hideRiderForPreview: true,
    });
    turntable.add(rig.group);

    const resizeObs =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!container) return;
            const nw = Math.max(200, container.clientWidth);
            const nh = Math.max(150, container.clientHeight);
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
          })
        : null;
    resizeObs?.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      if (!draggingRef.current) {
        dragYawRef.current += dt * 0.42;
      }
      turntable.rotation.y = dragYawRef.current;
      rig.animateVehicle?.(t, dt, 'none', false, Math.sin(t * 0.8) * 0.12, {
        throttle: false,
        braking: false,
        speedKmh: 0,
        rpmRatio: 0.14,
        gear: 1,
        fuelPct: 100,
        atmosphere,
        isPov: false,
      });
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        frameId = window.setTimeout(animate, 100);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      frameId = window.setTimeout(animate, 110);
    } else {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      disposeObject3D(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [bike.id, bike.vehicleKind, bike.paintHex, bike.accentHex, bike.isVespa, riderStyle, quality, atmosphere]);

  return (
    <div
      className="relative w-full h-[185px] sm:h-[215px] rounded-xl overflow-hidden bg-gradient-to-b from-[#111927]/75 to-[#070b14]/90 border border-white/10 cursor-grab active:cursor-grabbing touch-none"
      onPointerDown={(e) => {
        draggingRef.current = true;
        lastXRef.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        const dx = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        dragYawRef.current += dx * 0.012;
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
    >
      {!contextLost ? (
        <div ref={mountRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 text-xs gap-1">
          <Gauge className="w-6 h-6 text-yellow-400" />
          <span>{bike.name}</span>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2.5 text-[10px] text-slate-400">
        اسحب للتدوير ٣٦٠°
      </div>
    </div>
  );
};

export const RaceSetupScreen: React.FC<RaceSetupScreenProps> = ({
  config,
  progress,
  riderStyle,
  atmosphere,
  onChangeAtmosphere,
  onChangeConfig,
  onSelectMoto,
  onBuyMoto,
  onOpenControls,
  onBackToMenu,
  onStartRace,
}) => {
  const [bikePickerOpen, setBikePickerOpen] = useState(false);

  const unlockedMotos = progress.unlockedMotos ?? ['vespa_lv1'];
  const selectedBike = getMotoById(config.bikeId);
  const selectedBikeUnlocked = unlockedMotos.includes(selectedBike.id);
  const canAffordSelected = progress.wallet >= selectedBike.price;
  const speedUpgradeBonus = progress.upgrades.engine * 10;
  const effectiveTopSpeed = selectedBike.topSpeedKmh + speedUpgradeBonus;
  const selectedTrack = RACE_TRACKS.find((t) => t.id === config.trackId) ?? RACE_TRACKS[0];

  return (
    <div className="relative min-h-dvh w-full flex flex-col text-slate-100 overflow-x-hidden">
      {/* Live 3D Alexandria Corniche Background (Day / Sunset / Night) */}
      <CornicheBackdrop3D quality={config.graphicsQuality} atmosphere={atmosphere} />

      {/* Top Navigation & Mode Switcher */}
      <header className="relative z-10 shrink-0 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToMenu}
            aria-label="رجوع للرئيسية"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-amber-400/40 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 backdrop-blur-md transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>رجوع</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-amber-300 leading-tight">
              تحدي الأبطال
            </h1>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              كورنيش الإسكندرية · وضع الشخص الأول POV
            </p>
          </div>
        </div>

        {/* 1. Mode Switcher (Race vs Practice) */}
        <div className="flex items-center gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/15 backdrop-blur-md w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, subMode: 'race' })}
              className={`min-h-[42px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                config.subMode === 'race'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>تحدي الأبطال</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ ...config, subMode: 'practice' })}
              className={`min-h-[42px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                config.subMode === 'practice'
                  ? 'bg-sky-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>تمرين حر - Practice</span>
            </button>
          </div>
        </div>

        <div className="order-2 sm:order-3 flex items-center gap-2 flex-wrap justify-end">
          {/* Day / Sunset / Night 3-Way Switcher */}
          <div className="flex rounded-xl bg-slate-950/85 border border-white/15 p-1 gap-0.5 backdrop-blur-md shrink-0">
            <button
              type="button"
              onClick={() => onChangeAtmosphere('day')}
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-black flex items-center gap-1 whitespace-nowrap transition-colors ${
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
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-black flex items-center gap-1 whitespace-nowrap transition-colors ${
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
              className={`min-h-[34px] px-2.5 rounded-lg text-xs font-black flex items-center gap-1 whitespace-nowrap transition-colors ${
                atmosphere === 'night'
                  ? 'bg-indigo-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>ليل</span>
            </button>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-400/35 text-amber-300 font-black text-xs font-mono tabular-nums flex items-center gap-1.5 whitespace-nowrap">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{progress.wallet} ج.م</span>
          </div>
          <SeaSoundButton />
          <button
            type="button"
            onClick={onOpenControls}
            aria-label="إعدادات التحكم"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-950/75 hover:bg-slate-900 border border-white/15 text-slate-100 text-xs sm:text-sm font-bold flex items-center gap-1.5 backdrop-blur-md transition-colors whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-300" />
            <span className="hidden xs:inline">التحكم</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pb-24 pt-1 flex flex-col gap-4">
        {/* 2. Track Selection Cards (4 Cards with Minimap) */}
        <section aria-label="اختيار حلبة تحدي الأبطال" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 px-0.5">
            <h2 className="text-sm sm:text-base font-extrabold text-white">اختر حلبة تحدي الأبطال</h2>
            <span className="text-[11px] text-amber-300 font-bold">
              {selectedTrack.name} · {selectedTrack.laps === 1 ? 'لفة واحدة' : selectedTrack.laps === 2 ? 'لفتين' : `${selectedTrack.laps} لفات`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {RACE_TRACKS.map((track) => {
              const active = track.id === config.trackId;
              const bestSec = progress.bestRaceTimes?.[track.id];
              const lapLabel =
                track.laps === 1 ? 'لفة واحدة' : track.laps === 2 ? 'لفتين' : `${track.laps} لفات`;

              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, trackId: track.id })}
                  className={`group rounded-2xl p-3 sm:p-3.5 text-right border transition-all backdrop-blur-md flex flex-col justify-between gap-2.5 min-h-[116px] ${
                    active
                      ? 'bg-slate-900/90 border-amber-400 shadow-lg shadow-amber-500/15'
                      : 'bg-slate-950/70 border-white/15 hover:border-white/35 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 w-full">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-black text-white leading-snug">
                        {track.name}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5 truncate">{track.district}</div>
                    </div>

                    {/* Clean SVG Minimap Diagram */}
                    <svg
                      viewBox="0 0 120 66"
                      className={`w-[74px] h-[42px] shrink-0 rounded-lg p-1 ${
                        active ? 'bg-amber-400/10' : 'bg-white/5'
                      }`}
                      aria-hidden="true"
                    >
                      <path
                        d={track.svgPath}
                        fill="none"
                        stroke={active ? '#FBBF24' : '#94A3B8'}
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={track.startDot[0]}
                        cy={track.startDot[1]}
                        r="4.5"
                        fill={active ? '#22C55E' : '#F8FAFC'}
                      />
                    </svg>
                  </div>

                  {/* Clean unboxed telemetry metadata with middot separators */}
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold border-t border-white/10 pt-2 w-full">
                    <div className="flex items-center gap-1.5 text-amber-300 font-mono tabular-nums">
                      <span>{lapLabel}</span>
                      <span className="text-white/30" aria-hidden="true">·</span>
                      <span>{track.distanceKm} كم</span>
                    </div>
                    <span className="text-slate-300">{track.characteristic}</span>
                  </div>

                  {typeof bestSec === 'number' && bestSec > 0 && (
                    <div className="text-[10px] text-emerald-300 font-mono tabular-nums">
                      أفضل وقت: {formatRaceTime(bestSec)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Center 3D Vehicle Preview Box + 4. Settings & Difficulty */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* 3D Vehicle Preview Box */}
          <section className="lg:col-span-7 rounded-2xl bg-slate-950/75 border border-white/15 backdrop-blur-md p-3.5 sm:p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 font-mono">
                    مستوى {selectedBike.level} / 7
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-emerald-300 text-[10px] font-black">
                    {selectedBike.difficultyLabel}
                  </span>
                  <span>{selectedBike.categoryLabel}</span>
                </div>
                <h2 className="text-base sm:text-xl font-black text-white mt-0.5">{selectedBike.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => setBikePickerOpen(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-transform active:scale-95 whitespace-nowrap shrink-0"
              >
                الموتوسيكلات (7 مستويات)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-7">
                <VehiclePreview3D
                  bike={selectedBike}
                  riderStyle={riderStyle}
                  quality={config.graphicsQuality}
                  atmosphere={atmosphere}
                />
              </div>

              {/* Motorcycle Specs & Special Perk */}
              <div className="sm:col-span-5 flex flex-col gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-400/12 border border-amber-400/30">
                  <div className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedBike.perkTitle}</span>
                  </div>
                  <p className="text-[11px] text-amber-100/85 mt-0.5 leading-snug">
                    {selectedBike.perkDesc}
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-amber-300" />
                        السرعة القصوى
                      </span>
                      <span className="text-amber-300 font-mono tabular-nums">
                        {effectiveTopSpeed} كم/س
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((effectiveTopSpeed / 350) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-sky-400" />
                        التسارع
                      </span>
                      <span className="text-sky-300 font-mono tabular-nums">
                        {selectedBike.accelScore}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all duration-300"
                        style={{ width: `${selectedBike.accelScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        التحكم والتغريز
                      </span>
                      <span className="text-emerald-300 font-mono tabular-nums">
                        {selectedBike.handlingScore}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-300"
                        style={{ width: `${selectedBike.handlingScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {!selectedBikeUnlocked && (
                  <button
                    type="button"
                    disabled={!canAffordSelected}
                    onClick={() => {
                      onBuyMoto(selectedBike.id, selectedBike.price);
                      onChangeConfig({ ...config, bikeId: selectedBike.id });
                    }}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors ${
                      canAffordSelected
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                        : 'bg-white/10 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {canAffordSelected
                        ? `فتح الموتوسيكل الآن (${selectedBike.price} ج.م)`
                        : `مغلق — اجمع ${selectedBike.price} ج.م من الإيراد اليومي`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 4. Settings & Difficulty */}
          <section className="lg:col-span-5 rounded-2xl bg-slate-950/75 border border-white/15 backdrop-blur-md p-3.5 sm:p-4 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Competitor Difficulty */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-white">
                    صعوبة المتسابقين (AI)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {config.subMode === 'practice' ? 'تمرين فردي بدون منافسين' : '٤ منافسين على المسار'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const active = config.difficulty === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, difficulty: opt.id })}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-amber-400 text-slate-950 border-amber-200'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graphics Quality */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-white">جودة الجرافيك</span>
                  <span className="text-[11px] text-slate-400">
                    {config.graphicsQuality === 'low'
                      ? 'أداء أسرع للأجهزة الخفيفة'
                      : config.graphicsQuality === 'medium'
                        ? 'توازن بين الجودة والسرعة'
                        : 'ظلال كاملة ومرايا حية'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {QUALITY_OPTIONS.map((opt) => {
                    const active = config.graphicsQuality === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeConfig({ ...config, graphicsQuality: opt.id })}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-extrabold transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-sky-400 text-slate-950 border-sky-200'
                            : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Race Summary Strip */}
            <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <span>المنظور: السائق الواقعي (POV)</span>
              <span className="text-amber-300 font-bold">
                خط البداية · العد التنازلي 3-2-1
              </span>
            </div>
          </section>
        </div>
      </main>

      {/* 5. Bottom Wide Glowing Golden Start Race CTA */}
      <div className="fixed bottom-0 inset-x-0 z-20 p-3 sm:p-4 bg-gradient-to-t from-[#070b14] via-[#070b14]/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          {selectedBikeUnlocked ? (
            <button
              type="button"
              onClick={onStartRace}
              className="w-full min-h-[52px] py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-base sm:text-lg tracking-wide shadow-[0_0_28px_rgba(251,191,36,0.48)] active:scale-[0.985] transition-all flex items-center justify-center gap-2.5 whitespace-nowrap"
            >
              <Flag className="w-5 h-5" />
              <span>ابدأ تحدي الأبطال - GO</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (canAffordSelected) {
                  onBuyMoto(selectedBike.id, selectedBike.price);
                  onChangeConfig({ ...config, bikeId: selectedBike.id });
                } else {
                  setBikePickerOpen(true);
                }
              }}
              className={`w-full min-h-[52px] py-3 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 whitespace-nowrap ${
                canAffordSelected
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                  : 'bg-slate-800 border border-amber-400/40 text-amber-300'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span>
                {canAffordSelected
                  ? `افتح ${selectedBike.name} (${selectedBike.price} ج.م)`
                  : `هذا الموتوسيكل مغلق (${selectedBike.price} ج.م) — اختر موتوسيكل مفتوح`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Motorcycle Selection Drawer / Modal ("7 مستويات") */}
      {bikePickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-[#0B111A] border-2 border-amber-400 shadow-2xl p-4 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setBikePickerOpen(false)}
                  aria-label="رجوع"
                  className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-amber-400/40 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                  <span>رجوع</span>
                </button>
                <div>
                  <h3 className="text-base sm:text-xl font-black text-amber-300">
                    اختر الموتوسيكل — 7 مستويات بمميزات خاصة
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    رصيدك: <strong className="text-amber-300 font-mono">{progress.wallet} ج.م</strong> · الإيراد اليومي:{' '}
                    <strong className="text-emerald-300 font-mono">{progress.dailyEarnings ?? 0} ج.م</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBikePickerOpen(false)}
                aria-label="إغلاق"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RACE_BIKES.map((bike) => {
                const active = bike.id === config.bikeId;
                const unlocked = unlockedMotos.includes(bike.id);
                const canAfford = progress.wallet >= bike.price;
                const swatch = `#${bike.paintHex.toString(16).padStart(6, '0')}`;
                const accent = `#${bike.accentHex.toString(16).padStart(6, '0')}`;

                return (
                  <div
                    key={bike.id}
                    className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2.5 ${
                      active
                        ? 'bg-slate-800/95 border-amber-400 shadow-lg'
                        : unlocked
                          ? 'bg-slate-900/80 border-white/15 hover:border-white/30'
                          : 'bg-slate-950/75 border-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChangeConfig({ ...config, bikeId: bike.id });
                        if (unlocked) {
                          onSelectMoto(bike.id);
                          setBikePickerOpen(false);
                        }
                      }}
                      className="text-right space-y-2 w-full"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 font-mono">
                              مستوى {bike.level}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 text-[10px] font-black">
                              {bike.difficultyLabel}
                            </span>
                            <span>{bike.categoryLabel}</span>
                          </div>
                          <div className="text-sm sm:text-base font-black text-white mt-0.5">
                            {bike.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="w-5 h-5 rounded-full border border-white/40"
                            style={{ backgroundColor: swatch }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/40"
                            style={{ backgroundColor: accent }}
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-amber-200/90 font-bold bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1">
                        ★ {bike.perkTitle}: {bike.perkDesc}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-200 border-t border-white/10 pt-2">
                        <span>السرعة: {bike.topSpeedKmh + speedUpgradeBonus} كم/س</span>
                        <span>تسارع: {bike.accelScore}%</span>
                        <span>أجرة ×{bike.fareMultiplier.toFixed(2)}</span>
                      </div>
                    </button>

                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMoto(bike.id);
                          onChangeConfig({ ...config, bikeId: bike.id });
                          setBikePickerOpen(false);
                        }}
                        className={`w-full min-h-[38px] rounded-lg text-xs font-black flex items-center justify-center gap-1.5 ${
                          active
                            ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                            : 'bg-white/10 hover:bg-white/15 text-white'
                        }`}
                      >
                        {active && <Check className="w-3.5 h-3.5" />}
                        <span>{active ? 'مُختار للتحدي' : 'اختيار للتحدي'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          onBuyMoto(bike.id, bike.price);
                          onChangeConfig({ ...config, bikeId: bike.id });
                          setBikePickerOpen(false);
                        }}
                        className={`w-full min-h-[38px] rounded-lg text-xs font-black flex items-center justify-center gap-1.5 ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>
                          {canAfford ? `شراء وفتح (${bike.price} ج.م)` : `يفتح بـ ${bike.price} ج.م`}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
