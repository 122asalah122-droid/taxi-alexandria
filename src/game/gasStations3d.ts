import * as THREE from 'three';
import { CornicheGasStation, GAS_STATIONS } from './data';
import { getRoadCenterX, getRoadHeightAt, getRoadYawAt } from './terrain';

function createGasTotemTexture(stationName: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rich emerald-green Egyptian highway station branding (100% original)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
  bgGrad.addColorStop(0, '#047857');
  bgGrad.addColorStop(0.5, '#065f46');
  bgGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 256, 512);

  // Golden border frame
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 496);

  // Top glowing fuel badge
  ctx.fillStyle = '#facc15';
  ctx.fillRect(22, 24, 212, 86);
  ctx.fillStyle = '#052e16';
  ctx.font = '900 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('بنزينة', 128, 68);

  // Station name
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px sans-serif';
  ctx.fillText(stationName.replace(/^بنزينة\s+/, ''), 128, 148);

  // Digital fuel price rows (updated higher fuel prices)
  const rows: [string, string, string][] = [
    ['بنزين 95', '25.00', '#38bdf8'],
    ['بنزين 92', '22.50', '#4ade80'],
    ['بنزين 80', '20.00', '#fbbf24'],
  ];
  rows.forEach(([label, price, accent], idx) => {
    const ry = 196 + idx * 82;
    ctx.fillStyle = '#090f18';
    ctx.fillRect(24, ry, 208, 66);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, ry, 208, 66);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, 218, ry + 34);

    ctx.fillStyle = accent;
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(price, 36, ry + 35);
  });

  // 24h Open Banner
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(24, 444, 208, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('تفويل فوري · 24 ساعة', 128, 468);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createGasCanopyBannerTexture(stationName: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#059669';
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 110, 512, 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⛽  ${stationName}  ⛽`, 256, 65);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface GasStationsBuildResult {
  group: THREE.Group;
  rings: THREE.Mesh[];
}

export function buildCornicheGasStations(
  maxAnisotropy: number,
  atmosphere: 'day' | 'sunset' | 'night',
  isMobile: boolean,
  roadFns?: {
    getRoadCenterX: (z: number) => number;
    getRoadYawAt: (z: number) => number;
    getRoadHeightAt: (z: number) => number;
    rightExtraX?: number;
    getRightExtraX?: (z: number) => number;
    extraStations?: CornicheGasStation[];
  },
): GasStationsBuildResult {
  const root = new THREE.Group();
  const rings: THREE.Mesh[] = [];
  const isNight = atmosphere === 'night';
  const isSunset = atmosphere === 'sunset';
  const roadXFn = roadFns?.getRoadCenterX ?? getRoadCenterX;
  const roadYawFn = roadFns?.getRoadYawAt ?? getRoadYawAt;
  const roadHeightFn = roadFns?.getRoadHeightAt ?? getRoadHeightAt;
  const getRightExtra =
    roadFns?.getRightExtraX ?? (() => roadFns?.rightExtraX ?? 0);
  const allStations = roadFns?.extraStations
    ? [...GAS_STATIONS, ...roadFns.extraStations]
    : GAS_STATIONS;

  // Shared materials for minimal GPU state switches & fast mobile rendering
  const concretePadMat = new THREE.MeshStandardMaterial({
    color: 0x7d7a75,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0,
    emissive: isNight ? 0x242321 : 0x000000,
    emissiveIntensity: isNight ? 0.25 : 0,
  });
  const quayStoneMat = new THREE.MeshStandardMaterial({
    color: 0xc2b299,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0,
    emissive: isNight ? 0x2c2318 : 0x000000,
    emissiveIntensity: isNight ? 0.25 : 0,
  });
  const canopyTopMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    emissive: isNight ? 0x334155 : 0x000000,
    emissiveIntensity: isNight ? 0.38 : 0,
  });
  const canopyGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef9c3,
    emissiveIntensity: isNight ? 2.4 : isSunset ? 1.4 : 0.45,
    roughness: 0.2,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.35,
    emissive: isNight ? 0x334155 : 0x000000,
    emissiveIntensity: isNight ? 0.32 : 0,
  });
  const accentGreenMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.4,
    emissive: isNight ? 0x065f46 : 0x000000,
    emissiveIntensity: isNight ? 0.55 : 0,
  });
  const accentGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.32,
    emissive: isNight ? 0xca8a04 : 0x000000,
    emissiveIntensity: isNight ? 0.72 : 0,
  });
  const pumpBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.35,
    emissive: isNight ? 0x1e293b : 0x000000,
    emissiveIntensity: isNight ? 0.35 : 0,
  });
  const pumpScreenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: isNight ? 1.85 : 0.8,
    roughness: 0.2,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.65,
  });
  const martWallMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.55,
    emissive: isNight ? 0x334155 : 0x000000,
    emissiveIntensity: isNight ? 0.35 : 0,
  });
  const martGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: isNight ? 1.95 : isSunset ? 1.1 : 0.35,
    roughness: 0.18,
  });
  const refuelBayMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: isNight ? 0.34 : 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const refuelRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Shared geometries across all 8 stations
  const padGeo = new THREE.BoxGeometry(15.5, 0.36, 30);
  const quayBaseGeo = new THREE.BoxGeometry(16.2, 1.8, 31);
  const canopyRoofGeo = new THREE.BoxGeometry(11.4, 0.72, 18.6);
  const canopyLightPanelGeo = new THREE.PlaneGeometry(9.4, 15.6);
  canopyLightPanelGeo.rotateX(Math.PI / 2);
  const pillarGeo = new THREE.BoxGeometry(0.68, 5.4, 0.68);
  const islandGeo = new THREE.BoxGeometry(1.7, 0.32, 4.4);
  const dispenserGeo = new THREE.BoxGeometry(0.95, 1.95, 0.78);
  const dispenserHeadGeo = new THREE.BoxGeometry(1.02, 0.42, 0.84);
  const screenGeo = new THREE.BoxGeometry(0.58, 0.38, 0.82);
  const martBodyGeo = new THREE.BoxGeometry(5.2, 3.8, 12.4);
  const martGlassGeo = new THREE.BoxGeometry(0.18, 2.1, 8.8);
  const martRoofStripGeo = new THREE.BoxGeometry(5.5, 0.52, 12.8);
  const totemPostGeo = new THREE.CylinderGeometry(0.24, 0.3, 9.2, 8);
  const totemBoardGeo = new THREE.BoxGeometry(2.6, 5.4, 0.42);
  const bayStripGeo = new THREE.PlaneGeometry(3.2, 13.5);
  bayStripGeo.rotateX(-Math.PI / 2);
  const bayRingGeo = new THREE.RingGeometry(2.1, 2.85, isMobile ? 20 : 32);
  bayRingGeo.rotateX(-Math.PI / 2);

  for (const st of allStations) {
    const dir = st.side === 'right' ? 1 : -1;
    const stationExtra = st.side === 'right' ? getRightExtra(st.z) : 0;
    const sideShift = stationExtra;
    const roadX = roadXFn(st.z);
    const roadY = roadHeightFn(st.z);
    const roadYaw = roadYawFn(st.z);

    const g = new THREE.Group();
    g.position.set(roadX, roadY, st.z);
    g.rotation.y = roadYaw;

    // Forecourt pad centered at dir * 18.0 + sideShift
    const padX = dir * 18.0 + sideShift;
    const pad = new THREE.Mesh(padGeo, concretePadMat);
    pad.position.set(padX, 0.16, 0);
    g.add(pad);

    // Coastal stone retaining quay under right-side stations so they rest solidly above the Mediterranean Sea
    if (st.side === 'right' && stationExtra === 0) {
      const quay = new THREE.Mesh(quayBaseGeo, quayStoneMat);
      quay.position.set(padX + 0.5, -0.82, 0);
      g.add(quay);
    }

    // Canopy centered at dir * 16.4 + sideShift
    const canopyX = dir * 16.4 + sideShift;
    const roof = new THREE.Mesh(canopyRoofGeo, canopyTopMat);
    roof.position.set(canopyX, 5.55, 0);
    if (!isMobile) roof.castShadow = true;
    g.add(roof);

    // Glowing fascia banner facing the road
    const bannerTex = createGasCanopyBannerTexture(st.name, maxAnisotropy);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      emissiveMap: bannerTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: isNight ? 1.15 : isSunset ? 0.65 : 0.18,
      roughness: 0.3,
    });
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.92, 18.65), bannerMat);
    fascia.position.set(canopyX - dir * 5.72, 5.55, 0);
    g.add(fascia);

    // End fascia strips facing oncoming & outgoing traffic along Z
    for (const endZ of [-9.35, 9.35]) {
      const endTrim = new THREE.Mesh(new THREE.BoxGeometry(11.45, 0.82, 0.18), accentGreenMat);
      endTrim.position.set(canopyX, 5.55, endZ);
      const goldLine = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 0.22), accentGoldMat);
      goldLine.position.set(canopyX, 5.95, endZ);
      g.add(endTrim, goldLine);
    }

    // Bright LED light panel under the canopy
    const underGlow = new THREE.Mesh(canopyLightPanelGeo, canopyGlowMat);
    underGlow.position.set(canopyX, 5.17, 0);
    g.add(underGlow);

    // 4 Canopy support columns with green & gold base guards
    for (const px of [-3.6, 3.6]) {
      for (const pz of [-5.8, 5.8]) {
        const col = new THREE.Mesh(pillarGeo, pillarMat);
        col.position.set(canopyX + px, 2.85, pz);
        const colAccent = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.3, 0.76), accentGreenMat);
        colAccent.position.set(canopyX + px, 0.95, pz);
        g.add(col, colAccent);
      }
    }

    // 2 Fuel Pump Islands with glowing digital dispensers
    for (const iz of [-4.2, 4.2]) {
      const island = new THREE.Mesh(islandGeo, accentGoldMat);
      island.position.set(canopyX - dir * 1.4, 0.45, iz);
      g.add(island);

      for (const dz of [-1.2, 1.2]) {
        const disp = new THREE.Mesh(dispenserGeo, pumpBodyMat);
        disp.position.set(canopyX - dir * 1.4, 1.5, iz + dz);
        const head = new THREE.Mesh(dispenserHeadGeo, accentGreenMat);
        head.position.set(canopyX - dir * 1.4, 2.55, iz + dz);
        const scr = new THREE.Mesh(screenGeo, pumpScreenMat);
        scr.position.set(canopyX - dir * 1.4, 1.88, iz + dz);
        g.add(disp, head, scr);
      }
    }

    // Cashier / Mini-Mart Building behind the canopy
    const martX = dir * 23.4 + sideShift;
    const mart = new THREE.Mesh(martBodyGeo, martWallMat);
    mart.position.set(martX, 2.2, 0);
    const martGlass = new THREE.Mesh(martGlassGeo, martGlassMat);
    martGlass.position.set(martX - dir * 2.56, 1.85, 0);
    const martStrip = new THREE.Mesh(martRoofStripGeo, accentGreenMat);
    martStrip.position.set(martX, 4.2, 0);
    g.add(mart, martGlass, martStrip);

    // Tall Illuminated Price & Fuel Totem standing right at the station entry facing drivers
    const totemX = dir * 11.4 + sideShift;
    const totemZ = 12.2;
    const totemPost = new THREE.Mesh(totemPostGeo, darkMetalMat);
    totemPost.position.set(totemX, 4.6, totemZ);
    const totemTex = createGasTotemTexture(st.name, maxAnisotropy);
    const totemFrontMat = new THREE.MeshStandardMaterial({
      map: totemTex,
      emissiveMap: totemTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: isNight ? 1.18 : isSunset ? 0.65 : 0.16,
      roughness: 0.25,
    });
    const totemBoard = new THREE.Mesh(totemBoardGeo, [
      darkMetalMat,
      darkMetalMat,
      darkMetalMat,
      darkMetalMat,
      totemFrontMat,
      totemFrontMat,
    ]);
    totemBoard.position.set(totemX, 6.2, totemZ);
    g.add(totemPost, totemBoard);

    // Glowing Pull-In Refuel Bay Strip & Animated Target Ring right on the outer edge of the driving lane!
    const bayLaneX = dir * 8.15 + sideShift;
    const bayStrip = new THREE.Mesh(bayStripGeo, refuelBayMat);
    bayStrip.position.set(bayLaneX, 0.08, 0);
    bayStrip.renderOrder = 3;
    g.add(bayStrip);

    const bayRing = new THREE.Mesh(bayRingGeo, refuelRingMat);
    bayRing.position.set(bayLaneX, 0.11, 0);
    bayRing.renderOrder = 4;
    g.add(bayRing);
    rings.push(bayRing);

    root.add(g);
  }

  return { group: root, rings };
}
