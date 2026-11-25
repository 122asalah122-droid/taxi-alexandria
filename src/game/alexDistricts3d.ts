import * as THREE from 'three';
import { createCurvedRibbonGeometry } from './terrain';
import { AlexDistrictId, AtmosphereMode } from './types';

export interface AlexDistrictEnvironment {
  group: THREE.Group;
  update: (dt: number, elapsed: number, playerZ: number) => void;
  dispose: () => void;
}

type RoadFn = (z: number) => number;

function makeArabicSignTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  borderHex: string,
  textHex: string,
  maxAnisotropy: number,
  width = 512,
  height = 144,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(5, 5, width - 10, height - 10);

  ctx.direction = 'rtl';
  ctx.fillStyle = textHex;
  ctx.font = `900 ${Math.round(height * 0.34)}px "Cairo", "Tajawal", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, height * 0.42);

  if (subtitle) {
    ctx.fillStyle = '#E2E8F0';
    ctx.font = `700 ${Math.round(height * 0.18)}px "Cairo", "Tajawal", sans-serif`;
    ctx.fillText(subtitle, width / 2, height * 0.78);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeClockFaceTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 256, 256);

  // Warm illuminated ivory dial
  const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 114);
  grad.addColorStop(0, '#FFFBEB');
  grad.addColorStop(0.85, '#FEF3C7');
  grad.addColorStop(1, '#D97706');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 10;
  ctx.stroke();

  // 12 hour markers
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const inner = i % 3 === 0 ? 74 : 86;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = i % 3 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * inner, 128 + Math.sin(a) * inner);
    ctx.lineTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    ctx.stroke();
  }

  // Classic hands (10:10 iconic pose)
  ctx.strokeStyle = '#0F172A';
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(84, 96);
  ctx.stroke();

  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(186, 86);
  ctx.stroke();

  ctx.fillStyle = '#B45309';
  ctx.beginPath();
  ctx.arc(128, 128, 10, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeUrbanFacadeTexture(
  baseHex: string,
  accentHex: string,
  isNight: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isNight ? '#111827' : baseHex;
  ctx.fillRect(0, 0, 256, 512);

  // Horizontal Alexandrian balcony bands & shuttered windows
  for (let row = 0; row < 7; row++) {
    const y = 20 + row * 60;
    ctx.fillStyle = isNight ? '#1E293B' : accentHex;
    ctx.fillRect(0, y + 44, 256, 8);
    for (let col = 0; col < 4; col++) {
      const x = 18 + col * 60;
      const lit = isNight ? (row * 3 + col) % 4 !== 0 : (row + col) % 4 === 0;
      ctx.fillStyle = lit ? '#FEF08A' : isNight ? '#0B1120' : '#334155';
      ctx.fillRect(x, y, 36, 40);
      ctx.strokeStyle = isNight ? '#334155' : '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 36, 40);
    }
  }

  // Ground-floor illuminated Egyptian storefront / café
  ctx.fillStyle = '#090E1A';
  ctx.fillRect(0, 448, 256, 64);
  ctx.fillStyle = isNight ? '#FFF3B0' : '#38BDF8';
  ctx.fillRect(14, 460, 104, 44);
  ctx.fillStyle = isNight ? '#FCD34D' : '#F59E0B';
  ctx.fillRect(138, 460, 104, 44);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function buildOverheadGantry(
  title: string,
  subtitle: string,
  bgHex: string,
  borderHex: string,
  textHex: string,
  maxAnisotropy: number,
  isNight: boolean,
  textures: THREE.Texture[],
): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.72, roughness: 0.34 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: isNight ? 0.55 : 0.15,
    roughness: 0.35,
  });

  const leftCol = new THREE.Mesh(new THREE.BoxGeometry(0.85, 8.6, 0.85), steelMat);
  leftCol.position.set(-14.2, 4.3, 0);
  const rightCol = new THREE.Mesh(new THREE.BoxGeometry(0.85, 8.6, 0.85), steelMat);
  rightCol.position.set(14.2, 4.3, 0);
  const truss = new THREE.Mesh(new THREE.BoxGeometry(29.4, 0.75, 0.9), steelMat);
  truss.position.set(0, 8.2, 0);
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(29.4, 0.18, 0.96), trimMat);
  topTrim.position.set(0, 8.65, 0);

  const signTex = makeArabicSignTexture(title, subtitle, bgHex, borderHex, textHex, maxAnisotropy);
  textures.push(signTex);
  const signFaceMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: 0xffffff,
    emissiveIntensity: isNight ? 0.82 : 0.24,
    roughness: 0.32,
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(11.8, 2.55, 0.36), [
    steelMat,
    steelMat,
    steelMat,
    steelMat,
    signFaceMat,
    signFaceMat,
  ]);
  signBoard.position.set(0, 7.65, 0);

  g.add(leftCol, rightCol, truss, topTrim, signBoard);
  return g;
}

function buildElevatedTrain(maxAnisotropy: number, isNight: boolean, textures: THREE.Texture[]): THREE.Group {
  const train = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.26 });
  const blueStripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.45, roughness: 0.28 });
  const goldStripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: isNight ? 0.45 : 0.12,
    roughness: 0.3,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.55, roughness: 0.42 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: isNight ? 0xfef08a : 0x0f172a,
    emissive: isNight ? 0xfde047 : 0x38bdf8,
    emissiveIntensity: isNight ? 1.15 : 0.22,
    roughness: 0.15,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbeb,
    emissiveIntensity: 1.9,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.5,
  });

  const destTex = makeArabicSignTexture(
    'قطار أبو قير المعلق',
    'المندرة ⇄ أبو قير البلد',
    '#0C4A6E',
    '#FACC15',
    '#FEF08A',
    maxAnisotropy,
    256,
    72,
  );
  textures.push(destTex);
  const destMat = new THREE.MeshStandardMaterial({
    map: destTex,
    emissiveMap: destTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.85,
  });

  // 4 sleek connected modern elevated metro carriages
  const carLen = 14.2;
  const carGap = 0.7;
  for (let i = 0; i < 4; i++) {
    const cz = (i - 1.5) * (carLen + carGap);
    const car = new THREE.Group();
    car.position.z = cz;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.15, 2.75, carLen), bodyMat);
    hull.position.y = 1.65;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.58, carLen + 0.04), blueStripeMat);
    stripe.position.y = 1.05;
    const goldBand = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.16, carLen + 0.04), goldStripeMat);
    goldBand.position.y = 1.44;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.34, carLen - 0.3), roofMat);
    roof.position.y = 3.16;

    // Continuous side panoramic window ribbons
    const winRibbon = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.82, carLen - 1.2), windowMat);
    winRibbon.position.y = 2.08;

    // Bogies / bogie skirts
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.52, carLen - 0.8), roofMat);
    skirt.position.y = 0.26;

    car.add(hull, stripe, goldBand, roof, winRibbon, skirt);

    // Front cab nose & headlights
    if (i === 0) {
      const wind = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.05, 0.22), windowMat);
      wind.position.set(0, 2.1, -carLen / 2 - 0.02);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.55), destMat);
      sign.position.set(0, 2.78, -carLen / 2 - 0.05);
      sign.rotation.y = Math.PI;
      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.18), headMat);
      hlL.position.set(-1.05, 0.95, -carLen / 2 - 0.04);
      const hlR = hlL.clone();
      hlR.position.x = 1.05;
      car.add(wind, sign, hlL, hlR);
    }
    if (i === 3) {
      const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.26, 0.18), tailMat);
      tlL.position.set(-1.05, 0.95, carLen / 2 + 0.04);
      const tlR = tlL.clone();
      tlR.position.x = 1.05;
      car.add(tlL, tlR);
    }

    // Overhead pantograph arm on middle cars
    if (i === 1 || i === 2) {
      const panto = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 0.14), roofMat);
      panto.position.set(0, 3.6, 0);
      car.add(panto);
    }

    train.add(car);
  }

  return train;
}

function buildFishingBoat(hullHex: number, trimHex: number): THREE.Group {
  const boat = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: hullHex, roughness: 0.58 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.45 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.05, 6.4), hullMat);
  hull.position.y = 0.52;
  const prow = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 4), hullMat);
  prow.rotation.x = -Math.PI / 2;
  prow.rotation.z = Math.PI / 4;
  prow.position.set(0, 0.62, -4.1);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.22, 6.5), trimMat);
  trim.position.y = 1.04;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 5.8), woodMat);
  deck.position.y = 0.92;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.25, 1.9), cabinMat);
  cabin.position.set(0, 1.62, 0.95);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6), woodMat);
  mast.position.set(0, 2.8, -1.2);

  boat.add(hull, prow, trim, deck, cabin, mast);
  return boat;
}

export function buildAlexDistrictEnvironment(
  districtId: AlexDistrictId,
  maxAnisotropy: number,
  atmosphere: AtmosphereMode,
  isMobile: boolean,
  getRoadCenterX: RoadFn,
  getRoadYawAt: RoadFn,
  getRoadHeightAt: RoadFn,
): AlexDistrictEnvironment {
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const isNight = atmosphere === 'night';
  const isSunset = atmosphere === 'sunset';

  const updaters: Array<(dt: number, elapsed: number, playerZ: number) => void> = [];

  // ============================================================================
  // 1) ABU QIR EL-BALAD + ELEVATED METRO VIADUCT (القطار المعلق العلوي: المندرة ← أبو قير)
  // ============================================================================
  if (districtId === 'abu_qir') {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78, metalness: 0.08 });
    const darkConcreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.32 });
    const viaductLightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: isNight ? 1.55 : 0.35,
    });

    // Continuous Elevated Metro Viaduct running from Mandara (z = +50) all the way to Abu Qir El-Balad (z = -3560)!
    // Viaduct rides cleanly above the center median (x = roadCenterX, y = 8.4m) so you drive right underneath & alongside it!
    const segStep = 28;
    const zStart = 50;
    const zEnd = -3560;
    const count = Math.ceil((zStart - zEnd) / segStep) + 1;

    const pierGeo = new THREE.BoxGeometry(1.55, 8.2, 1.85);
    const capGeo = new THREE.BoxGeometry(8.4, 1.15, 2.1);
    const deckGeo = new THREE.BoxGeometry(7.8, 1.05, segStep + 1.2);
    const parapetGeo = new THREE.BoxGeometry(0.32, 0.95, segStep + 1.2);
    const lightStripGeo = new THREE.BoxGeometry(0.24, 0.16, segStep * 0.55);

    const pierInst = new THREE.InstancedMesh(pierGeo, darkConcreteMat, count);
    const capInst = new THREE.InstancedMesh(capGeo, concreteMat, count);
    const deckInst = new THREE.InstancedMesh(deckGeo, concreteMat, count);
    const parapetLInst = new THREE.InstancedMesh(parapetGeo, railSteelMat, count);
    const parapetRInst = new THREE.InstancedMesh(parapetGeo, railSteelMat, count);
    const underLightInst = new THREE.InstancedMesh(lightStripGeo, viaductLightMat, count);

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let z = zStart; z >= zEnd && idx < count; z -= segStep) {
      const rx = getRoadCenterX(z);
      const ry = getRoadHeightAt(z);
      const yaw = getRoadYawAt(z);
      const vx = rx - 0.1; // Right over the central divider so both directions see the suspended train overhead!

      // Concrete pier rooted flush on the central divider
      dummy.position.set(vx, ry + 4.1, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pierInst.setMatrixAt(idx, dummy.matrix);

      // T-Pier cross-head cap
      dummy.position.set(vx, ry + 8.15, z);
      dummy.updateMatrix();
      capInst.setMatrixAt(idx, dummy.matrix);

      // Elevated viaduct track deck
      const midZ = z - segStep * 0.5;
      const midX = getRoadCenterX(midZ) - 0.1;
      const midY = getRoadHeightAt(midZ);
      const midYaw = getRoadYawAt(midZ);
      dummy.position.set(midX, midY + 9.0, midZ);
      dummy.rotation.set(0, midYaw, 0);
      dummy.updateMatrix();
      deckInst.setMatrixAt(idx, dummy.matrix);

      // Blue-steel acoustic safety parapets on both sides of elevated track
      const cosY = Math.cos(midYaw);
      const sinY = Math.sin(midYaw);
      dummy.position.set(midX - 3.8 * cosY, midY + 9.95, midZ + 3.8 * sinY);
      dummy.updateMatrix();
      parapetLInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(midX + 3.8 * cosY, midY + 9.95, midZ - 3.8 * sinY);
      dummy.updateMatrix();
      parapetRInst.setMatrixAt(idx, dummy.matrix);

      // Under-viaduct warm LED guidance lights (awesome visibility at night!)
      dummy.position.set(midX, midY + 8.42, midZ);
      dummy.updateMatrix();
      underLightInst.setMatrixAt(idx, dummy.matrix);

      idx++;
    }
    for (const inst of [pierInst, capInst, deckInst, parapetLInst, parapetRInst, underLightInst]) {
      inst.count = idx;
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    }

    // Full Inland Urban Ground Plane (NO CORNICHE / NO SEA — bustling Alexandrian avenue on BOTH sides!)
    const aqGroundMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const aqGround = new THREE.Mesh(new THREE.PlaneGeometry(760, 4200), aqGroundMat);
    aqGround.rotation.x = -Math.PI / 2;
    aqGround.position.set(0, -0.09, -1760);
    group.add(aqGround);

    // Dense Right-Side Alexandrian Apartment & Shop Buildings (skipping clear footprints for all Abu Qir landmarks)
    const aqFacadeColors = [
      { base: '#E5CFAF', accent: '#9A6B42' },
      { base: '#DCD4C8', accent: '#64748B' },
      { base: '#EAD8BC', accent: '#B45309' },
      { base: '#CBD5E1', accent: '#475569' },
    ];
    const aqFacadeMats = aqFacadeColors.map((fc) => {
      const tex = makeUrbanFacadeTexture(fc.base, fc.accent, isNight, maxAnisotropy);
      textures.push(tex);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: isNight ? tex : undefined,
        emissive: isNight ? 0xffedd5 : 0x000000,
        emissiveIntensity: isNight ? 0.34 : 0,
        roughness: 0.78,
      });
    });

    const aqBldgStep = isMobile ? 30 : 23;
    const aqBldgGeo = new THREE.BoxGeometry(1, 1, 1);
    const aqBldgBuckets: Array<THREE.Matrix4[]> = aqFacadeMats.map(() => []);
    const aqLandmarkClearRanges: Array<[number, number]> = [
      [-585, -455], // المعمورة الشاطئ والملاهي
      [-1185, -1055], // سوق المعمورة البلد
      [-1785, -1655], // مجمع مدارس طوسون
      [-2410, -2270], // الكلية البحرية بأبو قير
      [-3575, -2775], // قلب أبو قير البلد (المدارس، المعهد الديني، البريد، بنك مصر، شركات الاتصال، الكافتيريات، الموقف، النوادي، سوق الأسماك)
    ];

    for (let z = 60; z >= -3560; z -= aqBldgStep) {
      if (aqLandmarkClearRanges.some(([minZ, maxZ]) => z >= minZ && z <= maxZ)) continue;
      // Keep clear near right-side gas stations too
      if (Math.abs(z + 1220) < 38 || Math.abs(z + 2580) < 38) continue;
      const rx = getRoadCenterX(z);
      const yaw = getRoadYawAt(z);
      const w = 13 + (Math.abs(z) % 5) * 1.5;
      const h = 15 + (Math.abs(z * 7) % 13);
      const d = 16 + (Math.abs(z * 3) % 7);

      dummy.position.set(rx + 23.5 + w * 0.5, h * 0.5, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      aqBldgBuckets[Math.abs(Math.floor(z / aqBldgStep)) % aqFacadeMats.length].push(dummy.matrix.clone());
    }

    aqBldgBuckets.forEach((mats, bIdx) => {
      if (mats.length === 0) return;
      const inst = new THREE.InstancedMesh(aqBldgGeo, aqFacadeMats[bIdx], mats.length);
      mats.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    });

    // Helper: create a glowing Arabic landmark signboard mounted on twin pillars or a building facade
    const makeSignBoardMesh = (
      title: string,
      sub: string,
      bgHex: string,
      borderHex: string,
      textHex: string,
      w: number,
      h: number,
      backingMat: THREE.Material,
    ) => {
      const tex = makeArabicSignTexture(title, sub, bgHex, borderHex, textHex, maxAnisotropy);
      textures.push(tex);
      const faceMat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: isNight ? 0.92 : 0.28,
        roughness: 0.3,
      });
      return new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.32), [
        backingMat,
        backingMat,
        backingMat,
        backingMat,
        faceMat,
        faceMat,
      ]);
    };

    // Helper: build an Egyptian Flagpole (red / white / black tricolor + golden eagle emblem)
    const buildEgyptFlagpole = (poleH = 11.5): THREE.Group => {
      const fg = new THREE.Group();
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.72, roughness: 0.28 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, poleH, 8), poleMat);
      pole.position.y = poleH * 0.5;
      const redStripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.65, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }),
      );
      redStripe.position.set(1.65, poleH - 0.55, 0);
      const whiteStripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.65, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }),
      );
      whiteStripe.position.set(1.65, poleH - 1.2, 0);
      const eagleDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.44, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.3 }),
      );
      eagleDot.position.set(1.65, poleH - 1.2, 0);
      const blackStripe = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.65, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
      );
      blackStripe.position.set(1.65, poleH - 1.85, 0);
      fg.add(pole, redStripe, whiteStripe, eagleDot, blackStripe);
      return fg;
    };

    // 6 Illuminated Elevated Metro Stations along المندرة ← المعمورة ← طوسون ← الكلية البحرية ← أبو قير البلد
    const stations = [
      { z: -65, title: 'محطة المندرة العلوية', sub: 'بداية القطار المعلق العلوي ← أبو قير' },
      { z: -500, title: 'محطة المعمورة الشاطئ', sub: 'ملاهي وبوابة المعمورة الشاطئ' },
      { z: -1100, title: 'محطة المعمورة البلد', sub: 'سوق المعمورة البلد التجاري' },
      { z: -1720, title: 'محطة طوسون العلوية', sub: 'مجمع مدارس طوسون' },
      { z: -2340, title: 'محطة الكلية البحرية', sub: 'الكلية البحرية بأبو قير' },
      { z: -3450, title: 'محطة أبو قير البلد', sub: 'أبو قير البلد · الموقف · النوادي · سوق الأسماك' },
    ];
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.65,
      roughness: 0.3,
    });
    const canopyGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: isNight ? 0.72 : 0.22,
      roughness: 0.2,
      transparent: true,
      opacity: 0.72,
    });

    stations.forEach((st) => {
      const stGroup = new THREE.Group();
      const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.55, 36), canopyMat);
      canopyRoof.position.set(0, 14.2, 0);
      const canopyGlow = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.22, 34), canopyGlassMat);
      canopyGlow.position.set(0, 13.85, 0);

      for (let az = -14; az <= 14; az += 14) {
        const archL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.2, 0.45), canopyMat);
        archL.position.set(-5.2, 11.6, az);
        const archR = archL.clone();
        archR.position.x = 5.2;
        stGroup.add(archL, archR);
      }

      const frontBoard = makeSignBoardMesh(st.title, st.sub, '#0C4A6E', '#FACC15', '#FEF08A', 9.4, 2.1, canopyMat);
      frontBoard.position.set(0, 11.5, 18.2);
      const backBoard = frontBoard.clone();
      backBoard.position.z = -18.2;

      stGroup.add(canopyRoof, canopyGlow, frontBoard, backBoard);
      stGroup.position.set(getRoadCenterX(st.z) - 0.1, getRoadHeightAt(st.z), st.z);
      stGroup.rotation.y = getRoadYawAt(st.z);
      group.add(stGroup);
    });

    // ==========================================================================
    // LANDMARK 1 (z = -520): المعمورة الشاطئ والملاهي (Spinning Ferris Wheel + Amusement Park)
    // ==========================================================================
    const maamouraPark = new THREE.Group();
    const parkBaseMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.78 });
    const parkFloor = new THREE.Mesh(new THREE.BoxGeometry(36, 0.35, 92), parkBaseMat);
    parkFloor.position.set(22, 0.17, 0);
    maamouraPark.add(parkFloor);

    // Colorful Entrance Archway facing the avenue
    const archPillarMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.45 });
    const archTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: isNight ? 0.95 : 0.25,
      roughness: 0.3,
    });
    const parkPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 8.2, 10), archPillarMat);
    parkPillar1.position.set(5.5, 4.1, -10);
    const parkPillar2 = parkPillar1.clone();
    parkPillar2.position.z = 10;
    const parkArchSign = makeSignBoardMesh(
      'المعمورة الشاطئ · الملاهي',
      'ألعاب وعجلة دوارة وكافيهات المعمورة',
      '#881337',
      '#FACC15',
      '#FEF08A',
      16.5,
      3.1,
      archPillarMat,
    );
    parkArchSign.position.set(5.5, 8.4, 0);
    parkArchSign.rotation.y = -Math.PI / 2;
    maamouraPark.add(parkPillar1, parkPillar2, parkArchSign);

    // Illuminated Spinning 3D Ferris Wheel (عجلة ملاهي المعمورة الدوارة)
    const wheelCenterY = 16.5;
    const wheelRadius = 11.5;
    const steelWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.55, roughness: 0.28 });
    const legGeo = new THREE.CylinderGeometry(0.42, 0.58, 18.2, 8);
    for (const sideX of [-1.8, 1.8]) {
      for (const tiltZ of [-0.28, 0.28]) {
        const leg = new THREE.Mesh(legGeo, steelWhiteMat);
        leg.position.set(22 + sideX, 8.4, tiltZ * 18);
        leg.rotation.x = tiltZ;
        maamouraPark.add(leg);
      }
    }
    const ferrisWheelRot = new THREE.Group();
    ferrisWheelRot.position.set(22, wheelCenterY, 0);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: isNight ? 1.15 : 0.35,
      metalness: 0.45,
      roughness: 0.25,
    });
    const rimL = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.32, 8, 28), rimMat);
    rimL.rotation.y = Math.PI / 2;
    rimL.position.x = -1.35;
    const rimR = rimL.clone();
    rimR.position.x = 1.35;
    ferrisWheelRot.add(rimL, rimR);

    const gondolaColors = [0xf43f5e, 0xf59e0b, 0x10b981, 0x3b82f6, 0xa855f7];
    const ferrisGondolas: THREE.Group[] = [];
    const spokeGeo = new THREE.CylinderGeometry(0.14, 0.14, wheelRadius * 2, 6);
    const cabinGeo = new THREE.BoxGeometry(2.1, 1.9, 1.9);
    const numCabins = 10;
    for (let i = 0; i < numCabins; i++) {
      const a = (i / numCabins) * Math.PI * 2;
      if (i < numCabins / 2) {
        const spL = new THREE.Mesh(spokeGeo, archTrimMat);
        spL.position.x = -1.35;
        spL.rotation.x = a;
        const spR = spL.clone();
        spR.position.x = 1.35;
        ferrisWheelRot.add(spL, spR);
      }
      const gPivot = new THREE.Group();
      gPivot.position.set(0, Math.sin(a) * wheelRadius, Math.cos(a) * wheelRadius);
      const col = gondolaColors[i % gondolaColors.length];
      const cabin = new THREE.Mesh(
        cabinGeo,
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: isNight ? 0.68 : 0.15,
          roughness: 0.35,
        }),
      );
      cabin.position.y = -0.8;
      gPivot.add(cabin);
      ferrisWheelRot.add(gPivot);
      ferrisGondolas.push(gPivot);
    }
    maamouraPark.add(ferrisWheelRot);

    // Colorful Carousel / Amusement Pavilion next to the Ferris Wheel
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
    const carouselBase = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.0, 1.1, 14), parkBaseMat);
    carouselBase.position.set(20, 0.65, -24);
    const carouselRoof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 4.4, 14), tentMat);
    carouselRoof.position.set(20, 7.6, -24);
    const carouselCore = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5.2, 10), archTrimMat);
    carouselCore.position.set(20, 3.4, -24);
    maamouraPark.add(carouselBase, carouselRoof, carouselCore);

    maamouraPark.position.set(getRoadCenterX(-520) + 16.5, getRoadHeightAt(-520), -520);
    maamouraPark.rotation.y = getRoadYawAt(-520);
    group.add(maamouraPark);

    // ==========================================================================
    // LANDMARK 2 (z = -1120): سوق المعمورة البلد (Bustling Traditional Market)
    // ==========================================================================
    const maamouraMarket = new THREE.Group();
    const mktFloor = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.32, 92),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 }),
    );
    mktFloor.position.set(17, 0.16, 0);
    maamouraMarket.add(mktFloor);

    const mktSign = makeSignBoardMesh(
      'سوق المعمورة البلد',
      'خضار · فاكهة · محلات وتجارة شعبية',
      '#14532D',
      '#FACC15',
      '#FEF08A',
      17.5,
      3.0,
      canopyMat,
    );
    mktSign.position.set(3.5, 7.2, 0);
    mktSign.rotation.y = -Math.PI / 2;
    const mktPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 7.2, 0.65), canopyMat);
    mktPost1.position.set(3.5, 3.6, -9);
    const mktPost2 = mktPost1.clone();
    mktPost2.position.z = 9;
    maamouraMarket.add(mktSign, mktPost1, mktPost2);

    const awningColors = [0xdc2626, 0x16a34a, 0xd97706, 0x2563eb, 0xe11d48, 0x059669];
    const crateColors = [0xf97316, 0x22c55e, 0xef4444, 0xeab308];
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
    for (let s = 0; s < 6; s++) {
      const sz = -34 + s * 13.5;
      const stall = new THREE.Group();
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.35, 9.6), woodMat);
      counter.position.set(11, 0.82, sz);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.26, 10.6),
        new THREE.MeshStandardMaterial({ color: awningColors[s % awningColors.length], roughness: 0.65 }),
      );
      awning.position.set(10.8, 4.15, sz);
      awning.rotation.z = 0.18;
      const crate1 = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.85, 2.4),
        new THREE.MeshStandardMaterial({ color: crateColors[s % crateColors.length], roughness: 0.72 }),
      );
      crate1.position.set(9.4, 1.85, sz - 2.4);
      const crate2 = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.85, 2.4),
        new THREE.MeshStandardMaterial({ color: crateColors[(s + 1) % crateColors.length], roughness: 0.72 }),
      );
      crate2.position.set(9.4, 1.85, sz + 2.4);
      const shopBack = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 7.6, 11.2),
        aqFacadeMats[s % aqFacadeMats.length],
      );
      shopBack.position.set(19.5, 3.9, sz);
      stall.add(counter, awning, crate1, crate2, shopBack);
      maamouraMarket.add(stall);
    }

    maamouraMarket.position.set(getRoadCenterX(-1120) + 16.5, getRoadHeightAt(-1120), -1120);
    maamouraMarket.rotation.y = getRoadYawAt(-1120);
    group.add(maamouraMarket);

    // ==========================================================================
    // LANDMARK 3 (z = -1720): طوسون ومجمع المدارس (Egyptian Schools Complex)
    // ==========================================================================
    const toussonSchools = new THREE.Group();
    const schoolWallMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.82 });
    const schoolTrimMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
    const schoolWinMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0xfef08a : 0x1e293b,
      emissive: isNight ? 0xfde047 : 0x38bdf8,
      emissiveIntensity: isNight ? 0.65 : 0.15,
    });

    const yardFloor = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.3, 88),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 }),
    );
    yardFloor.position.set(20, 0.15, 0);
    toussonSchools.add(yardFloor);

    // Perimeter low school wall with open front gate
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.5, 30), schoolWallMat);
    wallLeft.position.set(3.2, 1.35, -26);
    const wallRight = wallLeft.clone();
    wallRight.position.z = 26;
    toussonSchools.add(wallLeft, wallRight);

    // Main 3-story School Building + Side Wing
    const mainSchool = new THREE.Mesh(new THREE.BoxGeometry(11, 13.5, 58), schoolWallMat);
    mainSchool.position.set(25, 6.9, 0);
    const roofBand = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.9, 58.6), schoolTrimMat);
    roofBand.position.set(25, 13.4, 0);
    toussonSchools.add(mainSchool, roofBand);

    for (let floor = 0; floor < 3; floor++) {
      for (let w = 0; w < 6; w++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 4.6), schoolWinMat);
        win.position.set(19.4, 3.0 + floor * 3.8, -21 + w * 8.4);
        toussonSchools.add(win);
      }
    }

    // Playground green court + Egyptian Flagpole + Gate Sign
    const pitch = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.08, 28),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 }),
    );
    pitch.position.set(11.5, 0.34, 0);
    const schoolFlag = buildEgyptFlagpole(12.5);
    schoolFlag.position.set(11.5, 0.3, -18);
    const schoolSign = makeSignBoardMesh(
      'مجمع مدارس طوسون',
      'المدارس الإعدادية والثانوية · طريق أبو قير',
      '#1E3A8A',
      '#FACC15',
      '#FFFFFF',
      17.0,
      3.0,
      schoolTrimMat,
    );
    schoolSign.position.set(3.2, 6.8, 0);
    schoolSign.rotation.y = -Math.PI / 2;
    const scPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 6.8, 0.75), schoolTrimMat);
    scPost1.position.set(3.2, 3.4, -8.8);
    const scPost2 = scPost1.clone();
    scPost2.position.z = 8.8;
    toussonSchools.add(pitch, schoolFlag, schoolSign, scPost1, scPost2);

    toussonSchools.position.set(getRoadCenterX(-1720) + 16.5, getRoadHeightAt(-1720), -1720);
    toussonSchools.rotation.y = getRoadYawAt(-1720);
    group.add(toussonSchools);

    // ==========================================================================
    // LANDMARK 4 (z = -2340): الكلية البحرية بأبو قير (Monumental Naval College)
    // ==========================================================================
    const navalCollege = new THREE.Group();
    const navalWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
    const navalBlueMat = new THREE.MeshStandardMaterial({ color: 0x0c2d57, metalness: 0.35, roughness: 0.38 });
    const navalGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: isNight ? 0.8 : 0.22,
      metalness: 0.75,
      roughness: 0.25,
    });

    const navalPlaza = new THREE.Mesh(
      new THREE.BoxGeometry(44, 0.35, 108),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 }),
    );
    navalPlaza.position.set(24, 0.17, 0);
    navalCollege.add(navalPlaza);

    // Grand Symmetrical Naval College Building with Classical Portico Columns
    const navalMain = new THREE.Mesh(new THREE.BoxGeometry(15, 16.5, 70), navalWhiteMat);
    navalMain.position.set(30, 8.4, 0);
    const navalCrown = new THREE.Mesh(new THREE.BoxGeometry(15.6, 1.8, 70.8), navalBlueMat);
    navalCrown.position.set(30, 16.9, 0);
    const navalCenterBlock = new THREE.Mesh(new THREE.BoxGeometry(17.5, 20.5, 24), navalWhiteMat);
    navalCenterBlock.position.set(29, 10.4, 0);
    const navalPediment = new THREE.Mesh(new THREE.BoxGeometry(18.2, 2.2, 25), navalBlueMat);
    navalPediment.position.set(29, 21.0, 0);
    navalCollege.add(navalMain, navalCrown, navalCenterBlock, navalPediment);

    // Classical Portico Columns along the Naval College entrance
    for (let c = -9; c <= 9; c += 4.5) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 15.5, 10), navalWhiteMat);
      col.position.set(19.5, 7.9, c);
      navalCollege.add(col);
    }

    // Golden Naval Anchor Crest mounted proudly on the monumental archway
    const anchorGroup = new THREE.Group();
    const anchorShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.6, 8), navalGoldMat);
    const anchorCross = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 2.2), navalGoldMat);
    anchorCross.position.y = 0.9;
    const anchorArc = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.24, 8, 16, Math.PI), navalGoldMat);
    anchorArc.rotation.y = Math.PI / 2;
    anchorArc.rotation.x = Math.PI;
    anchorArc.position.y = -0.7;
    anchorGroup.add(anchorShaft, anchorCross, anchorArc);
    anchorGroup.position.set(4.1, 10.8, 0);
    navalCollege.add(anchorGroup);

    // Ceremonial Perimeter Wall, Guard Booths, Twin Flagpoles & Sign
    const nWallL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.4, 38), navalWhiteMat);
    nWallL.position.set(4.0, 1.8, -32);
    const nWallR = nWallL.clone();
    nWallR.position.z = 32;
    const gatePillarL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.6, 1.8), navalBlueMat);
    gatePillarL.position.set(4.0, 4.3, -11.5);
    const gatePillarR = gatePillarL.clone();
    gatePillarR.position.z = 11.5;
    const navalSign = makeSignBoardMesh(
      'الكلية البحرية · أبو قير',
      'صرح القوات البحرية المصرية · الإسكندرية',
      '#0C2D57',
      '#FACC15',
      '#FEF08A',
      21.5,
      3.4,
      navalBlueMat,
    );
    navalSign.position.set(4.0, 8.0, 0);
    navalSign.rotation.y = -Math.PI / 2;

    const flagL = buildEgyptFlagpole(14.5);
    flagL.position.set(11.5, 0.3, -16);
    const flagR = buildEgyptFlagpole(14.5);
    flagR.position.set(11.5, 0.3, 16);

    navalCollege.add(nWallL, nWallR, gatePillarL, gatePillarR, navalSign, flagL, flagR);
    navalCollege.position.set(getRoadCenterX(-2340) + 16.5, getRoadHeightAt(-2340), -2340);
    navalCollege.rotation.y = getRoadYawAt(-2340);
    group.add(navalCollege);

    // ==========================================================================
    // HEART OF ABU QIR EL-BALAD (z = -2750 .. -3550)
    // المدارس · المعهد الديني · البريد · بنك مصر · شركات الاتصال · الكافتيريات + ناس كثيرة · موقف العربيات · النوادي · سوق الأسماك
    // ==========================================================================
    const baladGantry = buildOverheadGantry(
      'أهلاً بكم في قلب أبو قير البلد',
      'المعهد الديني · البريد · بنك مصر · شركات الاتصال · الكافتيريات · موقف العربيات · النوادي · سوق الأسماك',
      '#0F172A',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      isNight,
      textures,
    );
    baladGantry.position.set(getRoadCenterX(-2750), getRoadHeightAt(-2750), -2750);
    baladGantry.rotation.y = getRoadYawAt(-2750);
    group.add(baladGantry);

    // 5A (z = -2845): مدارس أبو قير والمعهد الديني الأزهري
    const azharZone = new THREE.Group();
    const creamStoneMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.78 });
    const emeraldDomeMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: isNight ? 0.45 : 0.12,
      roughness: 0.38,
    });
    const azharBldg = new THREE.Mesh(new THREE.BoxGeometry(14, 13.5, 36), creamStoneMat);
    azharBldg.position.set(16, 6.75, -14);
    const azharDome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), emeraldDomeMat);
    azharDome.position.set(16, 13.4, -14);
    const azharFinial = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 3.2, 8), navalGoldMat);
    azharFinial.position.set(16, 19.6, -14);
    const aqSchoolBldg = new THREE.Mesh(new THREE.BoxGeometry(13, 12, 32), schoolWallMat);
    aqSchoolBldg.position.set(16, 6.0, 24);
    const aqSchoolFlag = buildEgyptFlagpole(11);
    aqSchoolFlag.position.set(6, 0.2, 24);
    const azharSign = makeSignBoardMesh(
      'المعهد الديني الأزهري · مدارس أبو قير',
      'الأزهر الشريف ومدارس أبو قير البلد',
      '#065F46',
      '#FACC15',
      '#FEF08A',
      20.0,
      3.0,
      emeraldDomeMat,
    );
    azharSign.position.set(8.6, 11.4, 4);
    azharSign.rotation.y = -Math.PI / 2;
    azharZone.add(azharBldg, azharDome, azharFinial, aqSchoolBldg, aqSchoolFlag, azharSign);
    azharZone.position.set(getRoadCenterX(-2845) + 16.5, getRoadHeightAt(-2845), -2845);
    azharZone.rotation.y = getRoadYawAt(-2845);
    group.add(azharZone);

    // 5B (z = -2985): مكتب بريد أبو قير + بنك مصر فرع أبو قير
    const civicZone = new THREE.Group();
    // Egypt Post (Green & Gold)
    const postGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45 });
    const postBldg = new THREE.Mesh(new THREE.BoxGeometry(13, 11.5, 28), creamStoneMat);
    postBldg.position.set(15.5, 5.75, 18);
    const postBand = new THREE.Mesh(new THREE.BoxGeometry(13.5, 2.2, 28.5), postGreenMat);
    postBand.position.set(15.5, 4.4, 18);
    const postBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 1.1), navalGoldMat);
    postBox.position.set(6.5, 1.05, 18);
    const postSign = makeSignBoardMesh(
      'البريد المصري · مكتب بريد أبو قير',
      'الخدمات البريدية والمالية · أبو قير البلد',
      '#14532D',
      '#FACC15',
      '#FEF08A',
      17.5,
      2.8,
      postGreenMat,
    );
    postSign.position.set(8.6, 8.8, 18);
    postSign.rotation.y = -Math.PI / 2;

    // Banque Misr (Burgundy Maroon & Gold)
    const bankMaroonMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.42 });
    const bankBldg = new THREE.Mesh(new THREE.BoxGeometry(14, 13.5, 32), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55 }));
    bankBldg.position.set(16, 6.75, -18);
    const bankBand = new THREE.Mesh(new THREE.BoxGeometry(14.6, 2.8, 32.6), bankMaroonMat);
    bankBand.position.set(16, 5.1, -18);
    const bankGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 3.6, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: isNight ? 0.75 : 0.2,
        roughness: 0.15,
      }),
    );
    bankGlass.position.set(8.9, 1.9, -18);
    const bankSign = makeSignBoardMesh(
      'بنك مصر · فرع أبو قير',
      'خدمات مصرفية وماكينات صراف آلي ATM',
      '#7F1D1D',
      '#FACC15',
      '#FEF08A',
      18.5,
      3.0,
      bankMaroonMat,
    );
    bankSign.position.set(8.5, 10.2, -18);
    bankSign.rotation.y = -Math.PI / 2;

    civicZone.add(postBldg, postBand, postBox, postSign, bankBldg, bankBand, bankGlass, bankSign);
    civicZone.position.set(getRoadCenterX(-2985) + 16.5, getRoadHeightAt(-2985), -2985);
    civicZone.rotation.y = getRoadYawAt(-2985);
    group.add(civicZone);

    // 5C (z = -3105): مجمع شركات الاتصالات والإنترنت (4 vibrant modern telecom storefronts)
    const telecomZone = new THREE.Group();
    const telecomBack = new THREE.Mesh(
      new THREE.BoxGeometry(13, 13, 62),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 }),
    );
    telecomBack.position.set(16, 6.5, 0);
    telecomZone.add(telecomBack);

    const telecomColors = [0xdc2626, 0xf97316, 0x16a34a, 0x7c3aed];
    telecomColors.forEach((col, i) => {
      const sz = 21 - i * 14;
      const fasciaMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: isNight ? 0.78 : 0.24,
        roughness: 0.3,
      });
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 12.2), fasciaMat);
      fascia.position.set(9.1, 4.9, sz);
      const storefront = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 3.6, 11.4),
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          emissive: 0xfde68a,
          emissiveIntensity: isNight ? 0.62 : 0.14,
          roughness: 0.2,
        }),
      );
      storefront.position.set(9.35, 1.9, sz);
      telecomZone.add(fascia, storefront);
    });
    const telecomSign = makeSignBoardMesh(
      'شركات الاتصالات والإنترنت · أبو قير',
      'فروع شبكات المحمول والإنترنت وخدمات الدفع',
      '#1E1B4B',
      '#38BDF8',
      '#FFFFFF',
      22.0,
      3.0,
      canopyMat,
    );
    telecomSign.position.set(9.1, 10.6, 0);
    telecomSign.rotation.y = -Math.PI / 2;
    telecomZone.add(telecomSign);
    telecomZone.position.set(getRoadCenterX(-3105) + 16.5, getRoadHeightAt(-3105), -3105);
    telecomZone.rotation.y = getRoadYawAt(-3105);
    group.add(telecomZone);

    // 5D (z = -3220): كافتيريات ومقاهي أبو قير البلد (Warm lit outdoor umbrellas, tables & cafés)
    const cafesZone = new THREE.Group();
    const cafeFacade = new THREE.Mesh(
      new THREE.BoxGeometry(12, 12.5, 68),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 }),
    );
    cafeFacade.position.set(17.5, 6.25, 0);
    const cafeGlowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.75, 66),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: isNight ? 1.4 : 0.35,
      }),
    );
    cafeGlowStrip.position.set(11.3, 4.8, 0);
    cafesZone.add(cafeFacade, cafeGlowStrip);

    const umbColors = [0xe11d48, 0x0284c7, 0xd97706, 0x16a34a, 0x9333ea, 0xea580c];
    for (let u = 0; u < 6; u++) {
      const uz = -26 + u * 10.4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 6), canopyMat);
      pole.position.set(6.5, 1.55, uz);
      const umb = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 1.0, 8),
        new THREE.MeshStandardMaterial({ color: umbColors[u % umbColors.length], roughness: 0.55 }),
      );
      umb.position.set(6.5, 3.2, uz);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.14, 10), creamStoneMat);
      table.position.set(6.5, 1.05, uz);
      cafesZone.add(pole, umb, table);
    }
    const cafeSign = makeSignBoardMesh(
      'كافتيريات ومقاهي أبو قير البلد',
      'جلسات ومشروبات ساخنة وباردة · وسط البلد',
      '#78350F',
      '#FDE047',
      '#FEF9C3',
      21.0,
      3.0,
      canopyMat,
    );
    cafeSign.position.set(11.1, 9.6, 0);
    cafeSign.rotation.y = -Math.PI / 2;
    cafesZone.add(cafeSign);
    cafesZone.position.set(getRoadCenterX(-3220) + 16.5, getRoadHeightAt(-3220), -3220);
    cafesZone.rotation.y = getRoadYawAt(-3220);
    group.add(cafesZone);

    // 5E (z = -3335): موقف عربيات أبو قير (Shaded Transit Bay + Parked 3D Microbuses & Taxis)
    const transitStation = new THREE.Group();
    const bayPad = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.25, 62),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 }),
    );
    bayPad.position.set(14, 0.12, 0);
    const bayRoof = new THREE.Mesh(
      new THREE.BoxGeometry(19, 0.55, 58),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.5, roughness: 0.4 }),
    );
    bayRoof.position.set(14, 6.2, 0);
    transitStation.add(bayPad, bayRoof);

    for (let pz = -24; pz <= 24; pz += 16) {
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.2, 0.5), archTrimMat);
      p1.position.set(5.2, 3.1, pz);
      const p2 = p1.clone();
      p2.position.x = 22.8;
      transitStation.add(p1, p2);
    }

    // 5 Parked Microbuses & Alexandria Taxis lined up inside موقف عربيات أبو قير!
    const vanColors = [0xf8fafc, 0xfacc15, 0xe2e8f0, 0xfacc15, 0xf1f5f9];
    const vanStripeColors = [0x0284c7, 0x0f172a, 0x16a34a, 0x0f172a, 0xdc2626];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    for (let v = 0; v < 5; v++) {
      const vz = -21 + v * 10.5;
      const isTaxi = v % 2 === 1;
      const veh = new THREE.Group();
      const bodyH = isTaxi ? 1.45 : 2.25;
      const bodyLen = isTaxi ? 4.4 : 5.4;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, bodyH, bodyLen),
        new THREE.MeshStandardMaterial({ color: vanColors[v], roughness: 0.4 }),
      );
      body.position.y = 0.45 + bodyH * 0.5;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(2.22, 0.42, bodyLen + 0.04),
        new THREE.MeshStandardMaterial({ color: vanStripeColors[v], roughness: 0.45 }),
      );
      stripe.position.y = isTaxi ? 0.9 : 1.15;
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.72, bodyLen * 0.76),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }),
      );
      glass.position.y = isTaxi ? 1.48 : 2.02;
      for (const wx of [-1.02, 1.02]) {
        for (const wz of [-1.45, 1.45]) {
          const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10), wheelMat);
          wh.rotation.z = Math.PI / 2;
          wh.position.set(wx, 0.42, wz);
          veh.add(wh);
        }
      }
      veh.add(body, stripe, glass);
      veh.position.set(13.5, 0.2, vz);
      veh.rotation.y = Math.PI / 2 - 0.18;
      transitStation.add(veh);
    }

    const transitSign = makeSignBoardMesh(
      'موقف عربيات أبو قير البلد',
      'ميكروباصات وتاكسي لجميع مناطق الإسكندرية',
      '#1E3A8A',
      '#FACC15',
      '#FEF08A',
      22.0,
      3.1,
      canopyMat,
    );
    transitSign.position.set(4.8, 7.6, 0);
    transitSign.rotation.y = -Math.PI / 2;
    transitStation.add(transitSign);
    transitStation.position.set(getRoadCenterX(-3335) + 16.5, getRoadHeightAt(-3335), -3335);
    transitStation.rotation.y = getRoadYawAt(-3335);
    group.add(transitStation);

    // 5F (z = -3430): نوادي أبو قير الرياضية والاجتماعية (Sports Clubs + Floodlit Pitch)
    const clubsZone = new THREE.Group();
    const clubGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const clubPitch = new THREE.Mesh(new THREE.BoxGeometry(28, 0.28, 56), clubGreenMat);
    clubPitch.position.set(19, 0.14, 0);
    const pitchLine = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.06, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    );
    pitchLine.position.set(19, 0.31, 0);
    const clubHouse = new THREE.Mesh(new THREE.BoxGeometry(10, 9.5, 28), navalWhiteMat);
    clubHouse.position.set(34, 4.75, 0);
    clubsZone.add(clubPitch, pitchLine, clubHouse);

    // Twin Stadium Floodlight Towers
    const floodMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef9c3,
      emissiveIntensity: isNight ? 1.85 : 0.3,
    });
    for (const fz of [-22, 22]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 16, 8), canopyMat);
      mast.position.set(28, 8, fz);
      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.4), floodMat);
      lampHead.position.set(27.5, 16.2, fz);
      clubsZone.add(mast, lampHead);
    }

    const clubSign = makeSignBoardMesh(
      'نوادي أبو قير الرياضية',
      'الملاعب والنادي الاجتماعي بأبو قير البلد',
      '#065F46',
      '#FFFFFF',
      '#FEF08A',
      20.0,
      3.0,
      emeraldDomeMat,
    );
    clubSign.position.set(4.5, 6.8, 0);
    clubSign.rotation.y = -Math.PI / 2;
    const clPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.8, 0.7), emeraldDomeMat);
    clPost1.position.set(4.5, 3.4, -9.5);
    const clPost2 = clPost1.clone();
    clPost2.position.z = 9.5;
    clubsZone.add(clubSign, clPost1, clPost2);
    clubsZone.position.set(getRoadCenterX(-3430) + 16.5, getRoadHeightAt(-3430), -3430);
    clubsZone.rotation.y = getRoadYawAt(-3430);
    group.add(clubsZone);

    // 5G (z = -3525): سوق الأسماك بأبو قير البلد (Grand Inland Covered Fish Market Hall)
    const fishMarket = new THREE.Group();
    const fmFloor = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.35, 62),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.7 }),
    );
    fmFloor.position.set(17, 0.17, 0);
    const fmRoofMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.38, roughness: 0.38 });
    const fmRoof = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 13.5, 58, 12, 1, false, 0, Math.PI), fmRoofMat);
    fmRoof.rotation.x = Math.PI / 2;
    fmRoof.rotation.z = -Math.PI / 2;
    fmRoof.scale.set(1, 1, 0.42);
    fmRoof.position.set(18, 7.6, 0);
    fishMarket.add(fmFloor, fmRoof);

    // Market Columns & Iced Seafood Counters inside سوق الأسماك
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: isNight ? 0.55 : 0.18,
      roughness: 0.25,
    });
    for (let fz = -24; fz <= 24; fz += 12) {
      const colF = new THREE.Mesh(new THREE.BoxGeometry(0.65, 7.8, 0.65), navalWhiteMat);
      colF.position.set(6.5, 3.9, fz);
      const colB = colF.clone();
      colB.position.x = 29;
      fishMarket.add(colF, colB);
      if (fz < 24) {
        const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.35, 8.6), iceMat);
        counter.position.set(13.5, 0.85, fz + 6);
        const counter2 = counter.clone();
        counter2.position.x = 22.5;
        fishMarket.add(counter, counter2);
      }
    }
    const fishSign = makeSignBoardMesh(
      'سوق الأسماك · أبو قير البلد',
      'أسماك طازجة ومأكولات بحرية يومياً',
      '#0C4A6E',
      '#38BDF8',
      '#FEF08A',
      22.5,
      3.4,
      fmRoofMat,
    );
    fishSign.position.set(6.0, 9.2, 0);
    fishSign.rotation.y = -Math.PI / 2;
    fishMarket.add(fishSign);
    fishMarket.position.set(getRoadCenterX(-3525) + 16.5, getRoadHeightAt(-3525), -3525);
    fishMarket.rotation.y = getRoadYawAt(-3525);
    group.add(fishMarket);

    // ==========================================================================
    // LIVELY CROWDS OF PEOPLE (ناس كثيرة) along Abu Qir El-Balad & Maamoura Market!
    // Built with 3 InstancedMeshes for blazing-fast 60fps mobile rendering!
    // ==========================================================================
    const crowdCount = isMobile ? 48 : 76;
    const headInst = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.24, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 }),
      crowdCount,
    );
    const torsoInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.56, 0.85, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }),
      crowdCount,
    );
    const legsInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.46, 0.78, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 }),
      crowdCount,
    );

    const crowdData: Array<{ x: number; z: number; baseY: number; phase: number; speed: number }> = [];
    const shirtPalette = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0xe2e8f0, 0x0ea5e9];
    const tmpColor = new THREE.Color();

    for (let i = 0; i < crowdCount; i++) {
      // 75% concentrated in bustling Abu Qir El-Balad (cafés, bank, post, transit, fish market), 25% at Maamoura Market & Park
      const z =
        i < crowdCount * 0.75
          ? -2780 - (i / (crowdCount * 0.75)) * 755
          : i % 2 === 0
            ? -1075 - ((i * 19) % 90)
            : -485 - ((i * 17) % 75);
      const onRight = i % 3 !== 0;
      const sideOffset = onRight ? 13.8 + (i % 4) * 1.45 : -13.6 - (i % 3) * 1.35;
      const x = getRoadCenterX(z) + sideOffset;
      const baseY = getRoadHeightAt(z) + 0.26;
      crowdData.push({ x, z, baseY, phase: i * 0.9, speed: 2.2 + (i % 4) * 0.55 });

      tmpColor.setHex(shirtPalette[i % shirtPalette.length]);
      torsoInst.setColorAt(i, tmpColor);

      dummy.rotation.set(0, onRight ? -Math.PI / 2 : Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.position.set(x, baseY + 0.39, z);
      dummy.updateMatrix();
      legsInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, baseY + 1.15, z);
      dummy.updateMatrix();
      torsoInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, baseY + 1.78, z);
      dummy.updateMatrix();
      headInst.setMatrixAt(i, dummy.matrix);
    }
    for (const inst of [headInst, torsoInst, legsInst]) {
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    }
    if (torsoInst.instanceColor) torsoInst.instanceColor.needsUpdate = true;

    // 2 LIVE ANIMATED ELEVATED TRAINS gliding smoothly along the viaduct overhead!
    const trainForward = buildElevatedTrain(maxAnisotropy, isNight, textures);
    const trainReverse = buildElevatedTrain(maxAnisotropy, isNight, textures);
    group.add(trainForward, trainReverse);

    let train1Z = -180;
    let train2Z = -1950;

    updaters.push((dt, elapsed) => {
      // Train 1 glides Mandara -> Abu Qir (track +1.85m right of viaduct centerline)
      train1Z -= dt * 36;
      if (train1Z < -3540) train1Z = 20;
      const yaw1 = getRoadYawAt(train1Z);
      trainForward.position.set(
        getRoadCenterX(train1Z) - 0.1 + Math.cos(yaw1) * 1.9,
        getRoadHeightAt(train1Z) + 9.55,
        train1Z - Math.sin(yaw1) * 1.9,
      );
      trainForward.rotation.y = yaw1;

      // Train 2 glides Abu Qir -> Mandara (track -1.85m left of viaduct centerline)
      train2Z += dt * 38;
      if (train2Z > 20) train2Z = -3540;
      const yaw2 = getRoadYawAt(train2Z);
      trainReverse.position.set(
        getRoadCenterX(train2Z) - 0.1 - Math.cos(yaw2) * 1.9,
        getRoadHeightAt(train2Z) + 9.55,
        train2Z + Math.sin(yaw2) * 1.9,
      );
      trainReverse.rotation.y = yaw2 + Math.PI;

      // Smoothly spin the illuminated Maamoura Ferris Wheel and keep gondolas upright!
      const wheelAngle = elapsed * 0.48;
      ferrisWheelRot.rotation.x = wheelAngle;
      for (let i = 0; i < ferrisGondolas.length; i++) {
        ferrisGondolas[i].rotation.x = -wheelAngle;
      }

      // Subtle lively bobbing of Abu Qir El-Balad pedestrian crowds
      for (let i = 0; i < crowdData.length; i++) {
        const p = crowdData[i];
        const bob = Math.abs(Math.sin(elapsed * p.speed + p.phase)) * 0.12;
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.position.set(p.x, p.baseY + 1.15 + bob, p.z);
        dummy.updateMatrix();
        torsoInst.setMatrixAt(i, dummy.matrix);
        dummy.position.set(p.x, p.baseY + 1.78 + bob, p.z);
        dummy.updateMatrix();
        headInst.setMatrixAt(i, dummy.matrix);
      }
      torsoInst.instanceMatrix.needsUpdate = true;
      headInst.instanceMatrix.needsUpdate = true;
    });
  }

  // ============================================================================
  // 2) RAS EL-SODA -> EL-SAA'A -> EL-SEYOUF -> VICTORIA (طريق الرأس السوداء ← فيكتوريا)
  // ============================================================================
  else if (districtId === 'ras_el_soda_victoria') {
    // Full Inland Urban Ground Plane (NO SEA — bustling Alexandrian city on BOTH sides!)
    const urbanGroundMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const urbanGround = new THREE.Mesh(new THREE.PlaneGeometry(760, 4200), urbanGroundMat);
    urbanGround.rotation.x = -Math.PI / 2;
    urbanGround.position.set(0, -0.09, -1760);
    group.add(urbanGround);

    // Dense Right-Side Alexandrian Buildings + Shops mirroring the city boulevard on the +X side!
    const facadeColors = [
      { base: '#E2C9A8', accent: '#9A6B42' },
      { base: '#D8CFC2', accent: '#64748B' },
      { base: '#E9D5B5', accent: '#B45309' },
      { base: '#CBD5E1', accent: '#475569' },
    ];
    const facadeMats = facadeColors.map((fc) => {
      const tex = makeUrbanFacadeTexture(fc.base, fc.accent, isNight, maxAnisotropy);
      textures.push(tex);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: isNight ? tex : undefined,
        emissive: isNight ? 0xffedd5 : 0x000000,
        emissiveIntensity: isNight ? 0.85 : 0,
        roughness: 0.78,
      });
    });

    const bldgStep = isMobile ? 32 : 24;
    const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();
    const buckets: Array<THREE.Matrix4[]> = facadeMats.map(() => []);

    for (let z = 60; z >= -3560; z -= bldgStep) {
      // Keep clear around right-side gas stations and major landmarks
      if (Math.abs(z + 1220) < 42 || Math.abs(z + 3440) < 48) continue;
      const rx = getRoadCenterX(z);
      const yaw = getRoadYawAt(z);
      const w = 13 + (Math.abs(z) % 5) * 1.6;
      const h = 16 + (Math.abs(z * 7) % 14);
      const d = 16 + (Math.abs(z * 3) % 7);

      dummy.position.set(rx + 23.5 + w * 0.5, h * 0.5, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      buckets[Math.abs(Math.floor(z / bldgStep)) % facadeMats.length].push(dummy.matrix.clone());
    }

    buckets.forEach((mats, bIdx) => {
      if (mats.length === 0) return;
      const inst = new THREE.InstancedMesh(bldgGeo, facadeMats[bIdx], mats.length);
      mats.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    });

    // Gate 1: Ras El-Soda Start Arch
    const rasSodaGate = buildOverheadGantry(
      'طريق الرأس السوداء ← فيكتوريا',
      'شارع مصطفى كامل · ميدان الساعة · السيوف',
      '#1E293B',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      isNight,
      textures,
    );
    rasSodaGate.position.set(getRoadCenterX(-55), getRoadHeightAt(-55), -55);
    rasSodaGate.rotation.y = getRoadYawAt(-55);
    group.add(rasSodaGate);

    // Iconic Landmark: Midan El-Saa'a 3D Clock Tower (برج ميدان الساعة) at z = -1220!
    const clockTower = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe5d5bd, roughness: 0.76 });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: isNight ? 0.5 : 0.12,
      metalness: 0.6,
      roughness: 0.3,
    });
    const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.8, 3.2, 12), stoneMat);
    basePedestal.position.y = 1.6;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(4.4, 14.5, 4.4), stoneMat);
    shaft.position.y = 10.2;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(5.4, 5.2, 5.4), stoneMat);
    crown.position.y = 19.6;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5.8, 8), trimGoldMat);
    spire.position.y = 25.1;

    const clockTex = makeClockFaceTexture(maxAnisotropy);
    textures.push(clockTex);
    const clockMat = new THREE.MeshStandardMaterial({
      map: clockTex,
      emissiveMap: clockTex,
      emissive: 0xfffbeb,
      emissiveIntensity: isNight ? 1.25 : 0.45,
      roughness: 0.25,
    });
    const dialGeo = new THREE.PlaneGeometry(4.1, 4.1);
    const dialPositions: Array<[number, number, number, number]> = [
      [0, 19.6, 2.74, 0],
      [0, 19.6, -2.74, Math.PI],
      [2.74, 19.6, 0, Math.PI / 2],
      [-2.74, 19.6, 0, -Math.PI / 2],
    ];
    for (const [dx, dy, dz, rotY] of dialPositions) {
      const dial = new THREE.Mesh(dialGeo, clockMat);
      dial.position.set(dx, dy, dz);
      dial.rotation.y = rotY;
      clockTower.add(dial);
    }
    clockTower.add(basePedestal, shaft, crown, spire);
    clockTower.position.set(getRoadCenterX(-1220) + 21, 0, -1220);
    group.add(clockTower);

    const saaGate = buildOverheadGantry(
      'ميدان وبرج الساعة',
      'الرأس السوداء ⇄ السيوف ⇄ فيكتوريا',
      '#0F172A',
      '#F59E0B',
      '#FDE047',
      maxAnisotropy,
      isNight,
      textures,
    );
    saaGate.position.set(getRoadCenterX(-1190), getRoadHeightAt(-1190), -1190);
    saaGate.rotation.y = getRoadYawAt(-1190);
    group.add(saaGate);

    // El-Seyouf Shama'a Commercial Overpass at z = -1960 & El-Awaied Flyover at z = -2680
    const seyoufGate = buildOverheadGantry(
      'شارع وميدان السيوف شماعة',
      'المتاجر والمطاعم · طريق فيكتوريا',
      '#1E1B4B',
      '#38BDF8',
      '#FFFFFF',
      maxAnisotropy,
      isNight,
      textures,
    );
    seyoufGate.position.set(getRoadCenterX(-1960), getRoadHeightAt(-1960), -1960);
    seyoufGate.rotation.y = getRoadYawAt(-1960);
    group.add(seyoufGate);

    const awaiedBridge = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(36, 1.8, 12), concreteMat);
    bridgeDeck.position.y = 7.6;
    const bridgePillarL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7.6, 8), concreteMat);
    bridgePillarL.position.set(-15.5, 3.8, 0);
    const bridgePillarR = bridgePillarL.clone();
    bridgePillarR.position.x = 15.5;
    awaiedBridge.add(bridgeDeck, bridgePillarL, bridgePillarR);
    awaiedBridge.position.set(getRoadCenterX(-2680), getRoadHeightAt(-2680), -2680);
    awaiedBridge.rotation.y = getRoadYawAt(-2680);
    group.add(awaiedBridge);

    // Victoria Plaza Gate + Classic Blue & Yellow Alexandria Tramcar (ترام فيكتوريا)!
    const victoriaGate = buildOverheadGantry(
      'ميدان ومحطة ترام فيكتوريا',
      'كلية فيكتوريا · نهاية طريق الرأس السوداء',
      '#0C4A6E',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      isNight,
      textures,
    );
    victoriaGate.position.set(getRoadCenterX(-3400), getRoadHeightAt(-3400), -3400);
    victoriaGate.rotation.y = getRoadYawAt(-3400);
    group.add(victoriaGate);

    // Animated Classic Alexandria Blue & Yellow Tramcar cruising along the right tramway corridor!
    const tram = new THREE.Group();
    const tramBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.25 });
    const tramYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32 });
    const tramWinMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0xfef08a : 0x1e293b,
      emissive: isNight ? 0xfde047 : 0x38bdf8,
      emissiveIntensity: isNight ? 1.1 : 0.15,
    });
    for (let c = 0; c < 2; c++) {
      const car = new THREE.Group();
      car.position.z = (c - 0.5) * 11.4;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 10.6), tramBlueMat);
      lower.position.y = 1.1;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.45, 10.5), tramYellowMat);
      upper.position.y = 2.45;
      const wins = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.85, 9.4), tramWinMat);
      wins.position.y = 2.45;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 10.1), tramBlueMat);
      roof.position.y = 3.3;
      car.add(lower, upper, wins, roof);
      tram.add(car);
    }
    group.add(tram);

    let tramZ = -3480;
    updaters.push((dt) => {
      tramZ += dt * 16;
      if (tramZ > -100) tramZ = -3480;
      const yaw = getRoadYawAt(tramZ);
      tram.position.set(getRoadCenterX(tramZ) + 15.6, getRoadHeightAt(tramZ), tramZ);
      tram.rotation.y = yaw + Math.PI;
    });
  }

  // ============================================================================
  // 3) ANFOUSHI MARITIME CITY (مدينة الأنفوشي · حلقة السمك · زينة بحري · قصر رأس التين)
  // ============================================================================
  else if (districtId === 'anfoushi') {
    // Festive Overhead Glowing Lantern Garlands ("زينة بحري والأنفوشي") arching across the historic avenue!
    const garlandStep = isMobile ? 75 : 55;
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const bulbColors = [0xfacc15, 0x38bdf8, 0xfb7185, 0x34d399];
    const bulbMats = bulbColors.map(
      (hex) =>
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: isNight ? 1.75 : isSunset ? 1.15 : 0.45,
          roughness: 0.2,
        }),
    );

    const garlandPoleGeo = new THREE.CylinderGeometry(0.14, 0.18, 7.6, 6);
    const bulbGeo = new THREE.SphereGeometry(0.24, 6, 6);

    for (let z = -30; z >= -3480; z -= garlandStep) {
      const rx = getRoadCenterX(z);
      const ry = getRoadHeightAt(z);
      const yaw = getRoadYawAt(z);
      const garland = new THREE.Group();
      const poleL = new THREE.Mesh(garlandPoleGeo, wireMat);
      poleL.position.set(-13.8, 3.8, 0);
      const poleR = new THREE.Mesh(garlandPoleGeo, wireMat);
      poleR.position.set(13.8, 3.8, 0);
      const cable = new THREE.Mesh(new THREE.BoxGeometry(27.6, 0.08, 0.08), wireMat);
      cable.position.set(0, 7.1, 0);
      garland.add(poleL, poleR, cable);

      const bulbsPerRow = isMobile ? 7 : 11;
      for (let b = 0; b < bulbsPerRow; b++) {
        const bx = -12 + (b / (bulbsPerRow - 1)) * 24;
        const sag = Math.cos((bx / 12) * (Math.PI / 2)) * 0.75;
        const bulb = new THREE.Mesh(bulbGeo, bulbMats[(b + Math.abs(Math.floor(z))) % bulbMats.length]);
        bulb.position.set(bx, 7.05 - sag, 0);
        garland.add(bulb);
      }

      garland.position.set(rx, ry, z);
      garland.rotation.y = yaw;
      group.add(garland);
    }

    // Anfoushi City Entrance Arch
    const anfoushiGate = buildOverheadGantry(
      'أهلاً بكم في مدينة الأنفوشي',
      'حلقة السمك · ميناء الصيادين · قصر رأس التين',
      '#0F172A',
      '#38BDF8',
      '#FDE047',
      maxAnisotropy,
      isNight,
      textures,
    );
    anfoushiGate.position.set(getRoadCenterX(-70), getRoadHeightAt(-70), -70);
    anfoushiGate.rotation.y = getRoadYawAt(-70);
    group.add(anfoushiGate);

    // Halqa Fish Market Arch (حلقة سمك الأنفوشي) at z = -880
    const halqaGate = buildOverheadGantry(
      'حلقة سمك الأنفوشي',
      'أشهر سوق سمك وميناء صيد في الإسكندرية',
      '#0C4A6E',
      '#FACC15',
      '#FFFFFF',
      maxAnisotropy,
      isNight,
      textures,
    );
    halqaGate.position.set(getRoadCenterX(-880), getRoadHeightAt(-880), -880);
    halqaGate.rotation.y = getRoadYawAt(-880);
    group.add(halqaGate);

    // Anfoushi Historic Mosque & Sea Pier at z = -1740
    const mosque = new THREE.Group();
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.42, metalness: 0.25 });
    const hall = new THREE.Mesh(new THREE.BoxGeometry(18, 9.5, 18), creamMat);
    hall.position.y = 4.75;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), domeMat);
    dome.position.y = 9.4;
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 22, 10), creamMat);
    minaret.position.set(7.5, 11, -7.5);
    mosque.add(hall, dome, minaret);
    mosque.position.set(getRoadCenterX(-1740) - 27, 0, -1740);
    group.add(mosque);

    // Ras El-Tin Royal Palace Colonnade (قصر رأس التين الملكي) at z = -2920
    const palace = new THREE.Group();
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const roofGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.5 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(22, 11, 34), marbleMat);
    wing.position.y = 5.5;
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(23.5, 1.1, 35.5), roofGoldMat);
    cornice.position.y = 11.4;
    palace.add(wing, cornice);
    for (let cz = -12; cz <= 12; cz += 6) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 10.5, 10), marbleMat);
      col.position.set(11.6, 5.25, cz);
      palace.add(col);
    }
    palace.position.set(getRoadCenterX(-2920) - 28, 0, -2920);
    group.add(palace);

    // Anfoushi Historic Coastal Lighthouse (فنار الأنفوشي) at z = -3460 with rotating warm beacon!
    const lighthouse = new THREE.Group();
    const lhWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const lhRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    for (let seg = 0; seg < 4; seg++) {
      const rBot = 3.2 - seg * 0.36;
      const rTop = 3.2 - (seg + 1) * 0.36;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, 4.8, 14),
        seg % 2 === 0 ? lhWhite : lhRed,
      );
      band.position.y = 2.4 + seg * 4.8;
      lighthouse.add(band);
    }
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 2.2,
    });
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 12), lanternMat);
    lantern.position.y = 20.3;
    const beamPivot = new THREE.Group();
    beamPivot.position.y = 20.3;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: isNight ? 0.34 : 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamCone = new THREE.Mesh(new THREE.ConeGeometry(4.8, 34, 12, 1, true), beamMat);
    beamCone.rotation.z = Math.PI / 2;
    beamCone.position.x = 17;
    beamPivot.add(beamCone);
    lighthouse.add(lantern, beamPivot);
    lighthouse.position.set(getRoadCenterX(-3460) + 28, 0, -3460);
    group.add(lighthouse);

    // Lively Dense Fleet of Colorful Anfoushi Fishing Boats bobbing along the blue harbor!
    const anfBoats: Array<{ mesh: THREE.Group; baseY: number; phase: number }> = [];
    const palette = [0x1d4ed8, 0x059669, 0xdc2626, 0xd97706, 0x2563eb, 0xffffff];
    const boatCount = isMobile ? 20 : 34;
    for (let i = 0; i < boatCount; i++) {
      const bz = -140 - i * (isMobile ? 165 : 98);
      const boat = buildFishingBoat(palette[i % palette.length], i % 2 === 0 ? 0xffffff : 0xfef08a);
      boat.position.set(getRoadCenterX(bz) + 25 + (i % 4) * 12, -0.68, bz);
      boat.rotation.y = (i % 5) * 0.45 - 0.8;
      group.add(boat);
      anfBoats.push({ mesh: boat, baseY: -0.68, phase: i * 0.85 });
    }

    updaters.push((dt, elapsed) => {
      beamPivot.rotation.y += dt * 1.1;
      for (const b of anfBoats) {
        b.mesh.position.y = b.baseY + Math.sin(elapsed * 2.2 + b.phase) * 0.2;
        b.mesh.rotation.z = Math.sin(elapsed * 1.7 + b.phase) * 0.06;
      }
    });
  }

  // ============================================================================
  // 4) SIDI GABER -> SIDI GABER TRAIN STATION -> ABU QIR STREET -> EL MANDARA
  // (طريق سيدي جابر ← محطة قطار سيدي جابر ← شارع أبو قير حتى المندرة · بدون بحر + شوارع جانبية بعيد عن الزحام)
  // ============================================================================
  if (districtId === 'sidi_gaber_abuqir') {
    const dummy = new THREE.Object3D();

    // 1. Massive Continuous Inland Urban Ground Plane (ZERO SEA — city on both sides!)
    const sgGroundMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const sgGround = new THREE.Mesh(new THREE.PlaneGeometry(980, 4400), sgGroundMat);
    sgGround.rotation.x = -Math.PI / 2;
    sgGround.position.set(12, -0.09, -1760);
    group.add(sgGround);

    // 2. Drivable Parallel Side Bypass Street ("الشارع الجانبي الهادئ بعيد عن الزحام")
    // Pure solid black #000000 with crisp white #FFFFFF dashed lines & forward arrow
    const sideRoadCanvas = document.createElement('canvas');
    sideRoadCanvas.width = 256;
    sideRoadCanvas.height = 512;
    const srCtx = sideRoadCanvas.getContext('2d')!;
    srCtx.fillStyle = '#000000';
    srCtx.fillRect(0, 0, 256, 512);
    // Crisp pure white outer edge lines on both sides
    srCtx.fillStyle = '#FFFFFF';
    srCtx.fillRect(8, 0, 10, 512);
    srCtx.fillRect(238, 0, 10, 512);
    // Center dashed pure white stripe
    srCtx.fillStyle = '#FFFFFF';
    for (let y = 18; y < 512; y += 96) {
      srCtx.fillRect(123, y, 10, 52);
    }
    const sideRoadTex = new THREE.CanvasTexture(sideRoadCanvas);
    sideRoadTex.wrapS = THREE.RepeatWrapping;
    sideRoadTex.wrapT = THREE.RepeatWrapping;
    sideRoadTex.colorSpace = THREE.SRGBColorSpace;
    sideRoadTex.anisotropy = maxAnisotropy;
    textures.push(sideRoadTex);

    const sideRoadMat = new THREE.MeshBasicMaterial({
      map: sideRoadTex,
      fog: false,
    });
    const sideRoadGeo = createCurvedRibbonGeometry(
      9.65,
      16.75,
      120,
      -3620,
      5,
      () => 0.015,
      1,
      0.06,
      undefined,
      'sidi_gaber_abuqir',
    );
    const sideRoadMesh = new THREE.Mesh(sideRoadGeo, sideRoadMat);
    group.add(sideRoadMesh);

    // Outer Right City Sidewalk (x = +16.75 .. +21.6) — pure black with white edge
    const rightSidewalkCanvas = document.createElement('canvas');
    rightSidewalkCanvas.width = 128;
    rightSidewalkCanvas.height = 128;
    const rswCtx = rightSidewalkCanvas.getContext('2d')!;
    rswCtx.fillStyle = '#000000';
    rswCtx.fillRect(0, 0, 128, 128);
    rswCtx.fillStyle = '#FFFFFF';
    rswCtx.fillRect(0, 0, 12, 128);
    const rightSidewalkTex = new THREE.CanvasTexture(rightSidewalkCanvas);
    rightSidewalkTex.colorSpace = THREE.SRGBColorSpace;
    rightSidewalkTex.wrapS = THREE.RepeatWrapping;
    rightSidewalkTex.wrapT = THREE.RepeatWrapping;
    textures.push(rightSidewalkTex);
    const rightSidewalkMat = new THREE.MeshBasicMaterial({
      map: rightSidewalkTex,
      fog: false,
    });
    const rightWalkGeo = createCurvedRibbonGeometry(
      16.85,
      21.6,
      120,
      -3620,
      5,
      () => 0.24,
      2,
      0.22,
      undefined,
      'sidi_gaber_abuqir',
    );
    group.add(new THREE.Mesh(rightWalkGeo, rightSidewalkMat));

    // Low reflective yellow divider studs between Main Avenue & Side Bypass Street (with wide open access gaps!)
    const studMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: isNight ? 1.15 : 0.3,
      roughness: 0.35,
    });
    const studPositions: Array<{ x: number; z: number; yaw: number }> = [];
    for (let z = 60; z >= -3540; z -= 14) {
      // Leave generous open ramp openings every ~140m & near intersections/station so players merge freely!
      const mod = Math.abs(z) % 140;
      if (mod < 48) continue;
      if (Math.abs(z + 540) < 35 || Math.abs(z + 2720) < 65 || Math.abs(z + 2960) < 35) continue;
      studPositions.push({ x: getRoadCenterX(z) + 9.88, z, yaw: getRoadYawAt(z) });
    }
    if (studPositions.length > 0) {
      const studInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.14, 4.6), studMat, studPositions.length);
      studPositions.forEach((sp, i) => {
        dummy.position.set(sp.x, 0.08, sp.z);
        dummy.rotation.set(0, sp.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        studInst.setMatrixAt(i, dummy.matrix);
      });
      studInst.instanceMatrix.needsUpdate = true;
      studInst.frustumCulled = false;
      group.add(studInst);
    }

    // Outer Right Sidewalk Streetlights along x = +17.55 (keeping Side Bypass Street 100% open!)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.34 });
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfbbf24,
      emissiveIntensity: isNight ? 2.8 : isSunset ? 1.6 : 0.4,
    });
    const outerLamps: Array<{ x: number; z: number; yaw: number }> = [];
    for (let z = 60; z >= -3540; z -= isMobile ? 28 : 20) {
      if (Math.abs(z + 2720) < 65) continue;
      outerLamps.push({ x: getRoadCenterX(z) + 17.55, z, yaw: getRoadYawAt(z) });
    }
    if (outerLamps.length > 0) {
      const postInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.16, 6.4, 6), poleMat, outerLamps.length);
      const armInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), poleMat, outerLamps.length);
      const headInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.24, 0.42), lampBulbMat, outerLamps.length);
      outerLamps.forEach((lp, i) => {
        const cosY = Math.cos(lp.yaw);
        const sinY = Math.sin(lp.yaw);
        dummy.position.set(lp.x, 3.2, lp.z);
        dummy.rotation.set(0, lp.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(lp.x - 0.8 * cosY, 6.25, lp.z + 0.8 * sinY);
        dummy.updateMatrix();
        armInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(lp.x - 1.55 * cosY, 6.12, lp.z + 1.55 * sinY);
        dummy.updateMatrix();
        headInst.setMatrixAt(i, dummy.matrix);
      });
      for (const inst of [postInst, armInst, headInst]) {
        inst.instanceMatrix.needsUpdate = true;
        inst.frustumCulled = false;
        group.add(inst);
      }
    }

    // 3. Intersecting Cross Side Streets ("شوارع جانبية متفرعة يمين وشمال") cutting between city blocks!
    const crossStreetZs = [-380, -760, -960, -1380, -1620, -1960, -2140, -2450, -2860, -3100, -3260, -3380];
    const crossAsphaltMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const crossStripeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
    });
    const crossRoadGeo = new THREE.PlaneGeometry(118, 12.4);
    crossRoadGeo.rotateX(-Math.PI / 2);
    const crossDashGeo = new THREE.PlaneGeometry(108, 0.34);
    crossDashGeo.rotateX(-Math.PI / 2);

    const sideBypassSignMat = (() => {
      const tex = makeArabicSignTexture(
        '↗ شارع جانبي · بدون زحام',
        'طريق مختصر هادئ على اليمين',
        '#065F46',
        '#4ADE80',
        '#ECFDF5',
        maxAnisotropy,
        384,
        112,
      );
      textures.push(tex);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: isNight ? 0.9 : 0.28,
        roughness: 0.3,
      });
    })();

    crossStreetZs.forEach((cz, idx) => {
      const rx = getRoadCenterX(cz);
      const yaw = getRoadYawAt(cz);
      const cg = new THREE.Group();
      cg.position.set(rx, 0.03, cz);
      cg.rotation.y = yaw;

      // Cross street stretching deep Left (-X) & Right (+X) into the neighborhood
      const leftBranch = new THREE.Mesh(crossRoadGeo, crossAsphaltMat);
      leftBranch.position.set(-68, 0, 0);
      const rightBranch = new THREE.Mesh(crossRoadGeo, crossAsphaltMat);
      rightBranch.position.set(76, 0, 0);
      const leftDash = new THREE.Mesh(crossDashGeo, crossStripeMat);
      leftDash.position.set(-68, 0.02, 0);
      const rightDash = new THREE.Mesh(crossDashGeo, crossStripeMat);
      rightDash.position.set(76, 0.02, 0);
      cg.add(leftBranch, rightBranch, leftDash, rightDash);

      // Green side-street shortcut guide sign every other intersection!
      if (idx % 2 === 0) {
        const sPole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 5.2, 6), poleMat);
        sPole.position.set(17.8, 2.6, 8.2);
        const sBoard = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.4, 0.2), [
          poleMat,
          poleMat,
          poleMat,
          poleMat,
          sideBypassSignMat,
          sideBypassSignMat,
        ]);
        sBoard.position.set(17.8, 5.1, 8.2);
        cg.add(sPole, sBoard);
      }

      group.add(cg);
    });

    // 4. Overhead Highway & Turn Guide Gantries matching EVERY Requested Landmark & Turn!
    const sgGantries = [
      {
        z: -150,
        title: 'سيدي جابر ↗ · ملف قبل المكتبة',
        sub: 'طريق سيدي جابر الداخلي · شوارع جانبية بعيد عن الزحام ↗',
        bg: '#065F46',
        border: '#FACC15',
        text: '#FFFFFF',
      },
      {
        z: -620,
        title: 'ملف يمين ↱ · مدينة سيدي جابر',
        sub: 'بعد الإشارة ملف يمين ← بيوت وقهاوي ومحلات سيدي جابر',
        bg: '#0C4A6E',
        border: '#38BDF8',
        text: '#FEF08A',
      },
      {
        z: -1025,
        title: 'ملف ثالث شمال ↰ · قلب سيدي جابر',
        sub: 'لف شمال وسط العمارات والقهاوي · الشارع الجانبي يمينك مفتوح',
        bg: '#0C4A6E',
        border: '#FACC15',
        text: '#FFFFFF',
      },
      {
        z: -1640,
        title: 'بعد ٥ كم · ملف شمال ↰',
        sub: 'كمل ٦ كم طوالي نحو ملف محطة سيدي جابر',
        bg: '#1E3A8A',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -2180,
        title: 'بعد ٦ كم · ملف شمال ↰',
        sub: 'بعد ٣ كم ملف يمين ← محطة قطار سيدي جابر على اليمين',
        bg: '#1E3A8A',
        border: '#38BDF8',
        text: '#FFFFFF',
      },
      {
        z: -2505,
        title: 'ملف يمين ↱ · محطة قطار سيدي جابر',
        sub: 'لف يمين — محطة قطار سيدي جابر مباشرة على يمينك 🚉',
        bg: '#7C2D12',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -3015,
        title: 'شارع أبو قير (طريق الحرية) ← المندرة',
        sub: 'طوالي على طول شارع أبو قير حتى المندرة · بيوت وقهاوي ومحلات',
        bg: '#065F46',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -3480,
        title: 'المندرة · نهاية شارع أبو قير',
        sub: 'وصلت المندرة بالسلامة · شارع أبو قير',
        bg: '#0F172A',
        border: '#FACC15',
        text: '#FEF08A',
      },
    ];

    sgGantries.forEach((gd) => {
      const gantry = buildOverheadGantry(
        gd.title,
        gd.sub,
        gd.bg,
        gd.border,
        gd.text,
        maxAnisotropy,
        isNight,
        textures,
      );
      // Widen gantry truss subtly to span both main avenue + side bypass street cleanly!
      gantry.scale.set(1.18, 1, 1);
      gantry.position.set(getRoadCenterX(gd.z) + 2.8, getRoadHeightAt(gd.z), gd.z);
      gantry.rotation.y = getRoadYawAt(gd.z);
      group.add(gantry);
    });

    // 5. Full-Street Overhead Traffic Signal Bridges ("إشارة مرور بطول الشارع") at z = -540 (2 km) & z = -2960 (Abu Qir entry)
    const buildFullStreetSignalBridge = (zPos: number, label: string, subLabel: string) => {
      const bg = new THREE.Group();
      const steelM = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.34 });
      const leftP = new THREE.Mesh(new THREE.BoxGeometry(0.75, 7.6, 0.75), steelM);
      leftP.position.set(-11.2, 3.8, 0);
      const rightP = new THREE.Mesh(new THREE.BoxGeometry(0.75, 7.6, 0.75), steelM);
      rightP.position.set(17.6, 3.8, 0);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(29.8, 0.65, 0.65), steelM);
      beam.position.set(3.2, 7.3, 0);
      bg.add(leftP, rightP, beam);

      const signTex = makeArabicSignTexture(label, subLabel, '#0F172A', '#EF4444', '#FEF08A', maxAnisotropy);
      textures.push(signTex);
      const signM = new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: 0xffffff,
        emissiveIntensity: isNight ? 0.95 : 0.3,
      });
      const board = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.9, 0.3), [
        steelM,
        steelM,
        steelM,
        steelM,
        signM,
        signM,
      ]);
      board.position.set(3.2, 8.75, 0);
      bg.add(board);

      // 4 Suspended Full-Street Traffic Signal Boxes across the entire avenue width
      const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.5 });
      const yelMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.9 });
      const grnMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 });
      for (const hx of [-6.2, 1.6, 7.0, 13.4]) {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.85, 0.56), steelM);
        housing.position.set(hx, 6.25, 0);
        const rDot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), redMat);
        rDot.position.set(hx, 6.75, 0.3);
        const yDot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), yelMat);
        yDot.position.set(hx, 6.25, 0.3);
        const gDot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10), grnMat);
        gDot.position.set(hx, 5.75, 0.3);
        bg.add(housing, rDot, yDot, gDot);
      }

      bg.position.set(getRoadCenterX(zPos), 0, zPos);
      bg.rotation.y = getRoadYawAt(zPos);
      group.add(bg);
    };

    buildFullStreetSignalBridge(-540, 'إشارة مرور سيدي جابر · ٢ كم', 'إشارة بطول الشارع — بعدها ملف يمين');
    buildFullStreetSignalBridge(-2960, 'إشارة مرور تقاطع شارع أبو قير', 'بعد ٣ كم طوالي من المحطة · ادخل شارع أبو قير ← المندرة');

    // 6. MONUMENTAL LANDMARK (z = -2720, ON THE RIGHT +X): محطة قطار سيدي جابر (Sidi Gaber Train Station)
    const stationGroup = new THREE.Group();
    const stoneCreamMat = new THREE.MeshStandardMaterial({ color: 0xf5ecd8, roughness: 0.72 });
    const stoneTrimMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 });
    const stationGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: isNight ? 0.85 : 0.22,
      roughness: 0.18,
      metalness: 0.3,
    });
    const stationRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.45, roughness: 0.36 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: isNight ? 0.78 : 0.2,
      metalness: 0.75,
      roughness: 0.25,
    });

    // Wide paved station drop-off plaza starting right past the right sidewalk (+20.5 .. +70)
    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(52, 0.32, 118),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.86 }),
    );
    plaza.position.set(45, 0.16, 0);
    stationGroup.add(plaza);

    // Grand Heritage-Modern Main Terminal Building
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(16, 15.5, 76), stoneCreamMat);
    mainHall.position.set(35, 7.9, 0);
    const roofCornice = new THREE.Mesh(new THREE.BoxGeometry(16.8, 1.4, 77.2), stoneTrimMat);
    roofCornice.position.set(35, 16.0, 0);
    // Central grand arched glass atrium + twin corner towers + iconic station clock
    const centerAtrium = new THREE.Mesh(new THREE.BoxGeometry(18.5, 19.5, 24), stoneCreamMat);
    centerAtrium.position.set(34.5, 9.9, 0);
    const glassEntrance = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11.5, 18), stationGlassMat);
    glassEntrance.position.set(25.1, 6.2, 0);
    const centerDome = new THREE.Mesh(
      new THREE.SphereGeometry(7.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      stationRoofMat,
    );
    centerDome.position.set(34.5, 19.4, 0);
    const clockFaceTex = makeClockFaceTexture(maxAnisotropy);
    textures.push(clockFaceTex);
    const clockFaceMat = new THREE.MeshStandardMaterial({
      map: clockFaceTex,
      emissiveMap: clockFaceTex,
      emissive: 0xfef3c7,
      emissiveIntensity: isNight ? 1.15 : 0.3,
    });
    const stationClock = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.5, 20), [
      goldMat,
      clockFaceMat,
      clockFaceMat,
    ]);
    stationClock.rotation.z = Math.PI / 2;
    stationClock.position.set(25.0, 15.6, 0);

    // Twin classical columns & canopy awning along the station front facade
    for (let c = -28; c <= 28; c += 7) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 9.2, 8), stoneCreamMat);
      col.position.set(24.6, 4.7, c);
      stationGroup.add(col);
    }
    const frontCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.55, 68), stationRoofMat);
    frontCanopy.position.set(24.5, 9.4, 0);

    // Massive Glowing Signboard: محطة قطار سيدي جابر · السكة الحديد
    const stationSignTex = makeArabicSignTexture(
      'محطة قطار سيدي جابر',
      'هيئة سكك حديد مصر · رصيف ١ و ٢ · الإسكندرية',
      '#0C2D57',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      640,
      160,
    );
    textures.push(stationSignTex);
    const stationSignMat = new THREE.MeshStandardMaterial({
      map: stationSignTex,
      emissiveMap: stationSignTex,
      emissive: 0xffffff,
      emissiveIntensity: isNight ? 1.05 : 0.32,
    });
    const stationSignBoard = new THREE.Mesh(new THREE.BoxGeometry(24, 3.8, 0.45), [
      stationRoofMat,
      stationRoofMat,
      stationRoofMat,
      stationRoofMat,
      stationSignMat,
      stationSignMat,
    ]);
    stationSignBoard.position.set(21.6, 11.4, 0);
    stationSignBoard.rotation.y = -Math.PI / 2;

    // Covered Railway Platforms & Steel Tracks behind the terminal (x = +46 .. +66)
    const platFloor = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1.1, 108),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 }),
    );
    platFloor.position.set(49, 0.65, 0);
    const platCanopy = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.45, 96), stationRoofMat);
    platCanopy.position.set(50, 7.6, 0);
    const railMetalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 128), railMetalMat);
    rail1.position.set(56.5, 0.38, 0);
    const rail2 = rail1.clone();
    rail2.position.x = 59.5;
    stationGroup.add(
      mainHall,
      roofCornice,
      centerAtrium,
      glassEntrance,
      centerDome,
      stationClock,
      frontCanopy,
      stationSignBoard,
      platFloor,
      platCanopy,
      rail1,
      rail2,
    );

    // Animated Egyptian Railways Express Train pulling smoothly along Sidi Gaber Station platforms!
    const sgTrain = buildElevatedTrain(maxAnisotropy, isNight, textures);
    sgTrain.position.set(58, 0.45, 0);
    stationGroup.add(sgTrain);

    stationGroup.position.set(getRoadCenterX(-2720), 0, -2720);
    stationGroup.rotation.y = getRoadYawAt(-2720);
    group.add(stationGroup);

    // 7. COMPLETE CITY ON BOTH SIDES: Dense Houses/Apartments, Egyptian Cafés ("قهاوي") & Illuminated Shops ("محلات")
    const sgFacadePalette = [
      { base: '#E5CFAF', accent: '#9A6B42' },
      { base: '#D8CFC2', accent: '#64748B' },
      { base: '#EBC8A4', accent: '#B45309' },
      { base: '#C7D6E5', accent: '#334155' },
      { base: '#E6B8A2', accent: '#9F1239' },
    ];
    const sgFacadeMats = sgFacadePalette.map((fp) => {
      const tex = makeUrbanFacadeTexture(fp.base, fp.accent, isNight, maxAnisotropy);
      textures.push(tex);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: isNight ? tex : undefined,
        emissive: isNight ? 0xffedd5 : 0x000000,
        emissiveIntensity: isNight ? 0.9 : 0,
        roughness: 0.76,
      });
    });

    const sgBldgGeo = new THREE.BoxGeometry(1, 1, 1);
    const sgBldgBuckets: Array<THREE.Matrix4[]> = sgFacadeMats.map(() => []);
    const bldgStep = isMobile ? 28 : 21;

    for (let z = 65; z >= -3550; z -= bldgStep) {
      // Leave clean open space for Sidi Gaber Train Station on the right
      const nearStation = Math.abs(z + 2720) < 68;
      // Leave clean open cross side streets
      const nearCross = crossStreetZs.some((cz) => Math.abs(z - cz) < 15);
      // Leave clean space for right-side gas stations
      const nearRightGas =
        Math.abs(z + 195) < 24 || Math.abs(z + 840) < 24 || Math.abs(z + 1940) < 24 || Math.abs(z + 2960) < 24;

      const rx = getRoadCenterX(z);
      const yaw = getRoadYawAt(z);
      const bucketIdx = Math.abs(Math.floor(z / bldgStep)) % sgFacadeMats.length;

      // Primary Right-Side Residential & Commercial Buildings (sitting cleanly behind the Side Bypass Street at x >= +22.5)
      if (!nearStation && !nearCross && !nearRightGas) {
        const w = 13 + (Math.abs(z) % 5) * 1.4;
        const h = 14 + (Math.abs(z * 7) % 16);
        const d = 15 + (Math.abs(z * 3) % 6);
        dummy.position.set(rx + 22.8 + w * 0.5, h * 0.5, z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();
        sgBldgBuckets[bucketIdx].push(dummy.matrix.clone());
      }

      // Secondary Deep Skyline Row on BOTH Left & Right sides so the entire horizon is 100% dense city (zero empty void!)
      if (!nearCross && Math.abs(Math.floor(z / bldgStep)) % 2 === 0) {
        const bgW = 16 + (Math.abs(z) % 6) * 2;
        const bgH = 22 + (Math.abs(z * 11) % 20);
        const bgD = 18 + (Math.abs(z * 5) % 8);
        // Deep Left skyline
        dummy.position.set(rx - 48 - bgW * 0.5, bgH * 0.5, z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(bgW, bgH, bgD);
        dummy.updateMatrix();
        sgBldgBuckets[(bucketIdx + 2) % sgFacadeMats.length].push(dummy.matrix.clone());

        // Deep Right skyline (behind right buildings / station)
        if (!nearStation) {
          dummy.position.set(rx + 46 + bgW * 0.5, bgH * 0.5, z);
          dummy.updateMatrix();
          sgBldgBuckets[(bucketIdx + 3) % sgFacadeMats.length].push(dummy.matrix.clone());
        }
      }
    }

    sgBldgBuckets.forEach((mats, bIdx) => {
      if (mats.length === 0) return;
      const inst = new THREE.InstancedMesh(sgBldgGeo, sgFacadeMats[bIdx], mats.length);
      mats.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    });

    // 8. Bustling Egyptian Cafés ("قهاوي بلدي وكافيهات") & Illuminated Shopfronts ("محلات") along Sidi Gaber & Abu Qir Street!
    const cafeNames = [
      { name: 'قهوة سيدي جابر البلدي', sub: 'شاي · قهوة · شيشة · جلسات هادئة', bg: '#78350F', border: '#FACC15' },
      { name: 'محلات وسوبر ماركت الحرية', sub: 'خضار · فاكهة · مأكولات · ٢٤ ساعة', bg: '#0369A1', border: '#38BDF8' },
      { name: 'قهوة وكافيه المحطة', sub: 'كافتيريا سيدي جابر · مشروبات ساخنة', bg: '#7C2D12', border: '#FBBF24' },
      { name: 'مطعم وكشري أبو قير', sub: 'شاورما · فلافل · كشري · حلويات', bg: '#991B1B', border: '#FDE047' },
      { name: 'قهوة شارع أبو قير', sub: 'أحلى قعدة على شارع أبو قير للمندرة', bg: '#451A03', border: '#FACC15' },
      { name: 'محلات وصيدلية المندرة', sub: 'ملابس · موبايلات · صيدلية · مخبز', bg: '#065F46', border: '#4ADE80' },
    ];
    const cafeSignMats = cafeNames.map((cn) => {
      const tex = makeArabicSignTexture(cn.name, cn.sub, cn.bg, cn.border, '#FEF08A', maxAnisotropy, 384, 112);
      textures.push(tex);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: isNight ? 2.1 : 0.32,
        roughness: 0.3,
      });
    });

    const cafeUmbrellaColors = [0xdc2626, 0xd97706, 0x0284c7, 0x16a34a, 0x9333ea];
    const cafeGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xffc857,
      emissiveIntensity: isNight ? 3.8 : 0.4,
    });
    const cafeTableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    const cafeZs = [
      -260, -450, -690, -890, -1120, -1290, -1490, -1750, -2040, -2280, -2400, -2590, -2810, -3050, -3180, -3320, -3430,
    ];
    cafeZs.forEach((cz, idx) => {
      const rx = getRoadCenterX(cz);
      const yaw = getRoadYawAt(cz);
      const cg = new THREE.Group();
      cg.position.set(rx + 21.8, 0, cz);
      cg.rotation.y = yaw;

      // Glowing Arabic Café / Shop Sign mounted cleanly above the sidewalk storefront
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.55, 8.2), [
        cafeSignMats[idx % cafeSignMats.length],
        cafeSignMats[idx % cafeSignMats.length],
        poleMat,
        poleMat,
        poleMat,
        poleMat,
      ]);
      signBoard.position.set(0.6, 4.9, 0);
      cg.add(signBoard);

      // Warm illuminated storefront glow strip
      const glowBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 10.2), cafeGlowMat);
      glowBar.position.set(0.65, 3.85, 0);
      cg.add(glowBar);

      // Outdoor Egyptian Café Umbrellas + Sidewalk Tables on the spacious outer right sidewalk
      const umbMat = new THREE.MeshStandardMaterial({
        color: cafeUmbrellaColors[idx % cafeUmbrellaColors.length],
        roughness: 0.58,
      });
      for (const uz of [-3.4, 3.4]) {
        const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 6), poleMat);
        uPole.position.set(-1.5, 1.55, uz);
        const uTop = new THREE.Mesh(new THREE.ConeGeometry(1.75, 0.72, 8), umbMat);
        uTop.position.set(-1.5, 2.95, uz);
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.14, 8), cafeTableMat);
        tbl.position.set(-1.5, 1.0, uz);
        cg.add(uPole, uTop, tbl);
      }

      group.add(cg);
    });

    // Animate the Sidi Gaber Train smoothly gliding along the station platform tracks
    updaters.push((_dt, elapsed) => {
      sgTrain.position.z = Math.sin(elapsed * 0.22) * 32;
    });
  }

  // ============================================================================
  // 5) GRAND CONNECTED ALEXANDRIA (الإسكندرية الكاملة · ربط الـ ٥ مناطق في مدينة واحدة ٦ كم!)
  // Sector 1: Corniche Sea & Stanley (0 .. -1200)
  // Sector 2: Abu Qir Elevated Metro & Maamoura Ferris Wheel (-1200 .. -2400)
  // Sector 3: Sidi Gaber + Side Bypass Street + Train Station + Abu Qir St (-2400 .. -3650)
  // Sector 4: Ras El-Soda Clock Tower + El-Awaied + Victoria Tram (-3650 .. -4850)
  // Sector 5: Anfoushi Sea Harbor + Fish Market + Fishing Boats + Lighthouse (-4850 .. -6150)
  // ============================================================================
  if (districtId === 'grand_alexandria') {
    const dummy = new THREE.Object3D();

    // A) Dedicated Coastal Sea Planes ONLY on Sector 1 (Corniche) & Sector 5 (Anfoushi)
    const grandSeaMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x0b357a : isSunset ? 0x144ea8 : 0x1565d8,
      roughness: 0.16,
      metalness: 0.3,
      emissive: isNight ? 0x09245e : isSunset ? 0x143b8c : 0x1d4ed8,
      emissiveIntensity: isNight ? 0.42 : 0.24,
    });
    const seaSector1Geo = createCurvedRibbonGeometry(
      14.8,
      460,
      180,
      -1220,
      20,
      () => -0.75,
      1,
      0.01,
      undefined,
      'grand_alexandria',
    );
    const seaSector1 = new THREE.Mesh(seaSector1Geo, grandSeaMat);
    const seaSector5Geo = createCurvedRibbonGeometry(
      14.8,
      460,
      -4820,
      -6340,
      20,
      () => -0.75,
      1,
      0.01,
      undefined,
      'grand_alexandria',
    );
    const seaSector5 = new THREE.Mesh(seaSector5Geo, grandSeaMat);
    group.add(seaSector1, seaSector5);

    // B) Solid Inland Urban Ground Plane ONLY across Sectors 2, 3, 4 (Abu Qir + Sidi Gaber + Ras El-Soda/Victoria)
    const inlandGroundMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const inlandGround = new THREE.Mesh(new THREE.PlaneGeometry(920, 3680), inlandGroundMat);
    inlandGround.rotation.x = -Math.PI / 2;
    inlandGround.position.set(16, -0.09, -3020);
    group.add(inlandGround);

    // C) Grand Opening & Inter-District Connector Gantries (محاور ربط المدينة كلها)
    const connectorGantries = [
      {
        z: -48,
        title: '👑 الإسكندرية الكاملة · المدينة المترابطة الكبرى',
        sub: '٥ مناطق متصلة بدون تحميل · أجرة ×2.40 · انطلق بطول ٦ كم!',
        bg: '#0F172A',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -1160,
        title: '↗ محور الربط ١ · دخول أبو قير والقطار المعلق',
        sub: 'من الكورنيش مباشرة إلى ملاهي المعمورة والكلية البحرية وأبو قير البلد',
        bg: '#0C4A6E',
        border: '#38BDF8',
        text: '#FEF08A',
      },
      {
        z: -2385,
        title: '↗ محور الربط ٢ · دخول سيدي جابر وشارع أبو قير',
        sub: 'ملفات سيدي جابر · محطة القطار · شارع جانبي هادئ على اليمين ↗',
        bg: '#065F46',
        border: '#4ADE80',
        text: '#FFFFFF',
      },
      {
        z: -3645,
        title: '↗ محور الربط ٣ · دخول طريق الرأس السوداء ← فيكتوريا',
        sub: 'ميدان وبرج الساعة · السيوف شماعة · كوبري العوايد · ترام فيكتوريا',
        bg: '#7C2D12',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -4845,
        title: '↗ محور الربط ٤ · دخول مدينة الأنفوشي والبحر',
        sub: 'حلقة السمك · مراكب الصيد · قصر رأس التين · فنار الأنفوشي',
        bg: '#1E3A8A',
        border: '#38BDF8',
        text: '#FEF08A',
      },
      {
        z: -5920,
        title: '👑 فنار الأنفوشي · خط نهاية الإسكندرية الكاملة',
        sub: 'أتممت جولة المدينة المترابطة الكبرى (٥ مناطق كاملة)!',
        bg: '#0F172A',
        border: '#FACC15',
        text: '#FEF08A',
      },
    ];
    connectorGantries.forEach((cg) => {
      const g = buildOverheadGantry(cg.title, cg.sub, cg.bg, cg.border, cg.text, maxAnisotropy, isNight, textures);
      g.position.set(getRoadCenterX(cg.z), getRoadHeightAt(cg.z), cg.z);
      g.rotation.y = getRoadYawAt(cg.z);
      group.add(g);
    });

    // D) SECTOR 1 ICONIC LANDMARK: Stanley Royal Twin-Tower Archway (z = -840)
    const stanleyGroup = new THREE.Group();
    const stanStoneMat = new THREE.MeshStandardMaterial({ color: 0xf4e4c8, roughness: 0.65 });
    const stanRoofMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.42 });
    const stanGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: isNight ? 0.85 : 0.2,
      metalness: 0.72,
      roughness: 0.25,
    });
    for (const sx of [-11.5, 11.5]) {
      for (const sz of [-24, 24]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 15.5, 3.4), stanStoneMat);
        tower.position.set(sx, 7.75, sz);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.6, 4), stanRoofMat);
        cap.rotation.y = Math.PI / 4;
        cap.position.set(sx, 17.2, sz);
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 6), stanGoldMat);
        spire.position.set(sx, 19.6, sz);
        stanleyGroup.add(tower, cap, spire);
      }
    }
    const stanArch = new THREE.Mesh(new THREE.BoxGeometry(26, 1.4, 1.8), stanStoneMat);
    stanArch.position.set(0, 10.6, 0);
    stanleyGroup.add(stanArch);
    stanleyGroup.position.set(getRoadCenterX(-840), getRoadHeightAt(-840), -840);
    stanleyGroup.rotation.y = getRoadYawAt(-840);
    group.add(stanleyGroup);

    // E) SECTOR 2 LANDMARKS: Abu Qir Elevated Metro Viaduct (-1200..-2400) + Animated Train + Spinning Ferris Wheel
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 });
    const darkConcMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.65, roughness: 0.34 });
    const segStep = 30;
    const vCount = Math.ceil((2400 - 1200) / segStep) + 1;
    const pierInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 8.2, 1.8), darkConcMat, vCount);
    const capInst = new THREE.InstancedMesh(new THREE.BoxGeometry(8.2, 1.1, 2.0), concreteMat, vCount);
    const deckInst = new THREE.InstancedMesh(new THREE.BoxGeometry(7.6, 1.0, segStep + 1.2), concreteMat, vCount);
    const railLInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.9, segStep + 1.2), railSteelMat, vCount);
    const railRInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.9, segStep + 1.2), railSteelMat, vCount);
    let vIdx = 0;
    for (let z = -1200; z >= -2380 && vIdx < vCount; z -= segStep) {
      const rx = getRoadCenterX(z) - 0.1;
      const yaw = getRoadYawAt(z);
      dummy.position.set(rx, 4.1, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pierInst.setMatrixAt(vIdx, dummy.matrix);

      dummy.position.set(rx, 8.15, z);
      dummy.updateMatrix();
      capInst.setMatrixAt(vIdx, dummy.matrix);

      const mz = z - segStep * 0.5;
      const mx = getRoadCenterX(mz) - 0.1;
      const myaw = getRoadYawAt(mz);
      dummy.position.set(mx, 9.0, mz);
      dummy.rotation.set(0, myaw, 0);
      dummy.updateMatrix();
      deckInst.setMatrixAt(vIdx, dummy.matrix);

      const cosY = Math.cos(myaw);
      const sinY = Math.sin(myaw);
      dummy.position.set(mx - 3.7 * cosY, 9.9, mz + 3.7 * sinY);
      dummy.updateMatrix();
      railLInst.setMatrixAt(vIdx, dummy.matrix);

      dummy.position.set(mx + 3.7 * cosY, 9.9, mz - 3.7 * sinY);
      dummy.updateMatrix();
      railRInst.setMatrixAt(vIdx, dummy.matrix);
      vIdx++;
    }
    for (const inst of [pierInst, capInst, deckInst, railLInst, railRInst]) {
      inst.count = vIdx;
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    }

    const grandElevatedTrain = buildElevatedTrain(maxAnisotropy, isNight, textures);
    group.add(grandElevatedTrain);

    // Spinning Maamoura Ferris Wheel (z = -1460)
    const wheelGroup = new THREE.Group();
    const ferrisRot = new THREE.Group();
    ferrisRot.position.set(22, 15.5, 0);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: isNight ? 1.15 : 0.35,
      metalness: 0.45,
      roughness: 0.25,
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.36, 8, 24), rimMat);
    rim.rotation.y = Math.PI / 2;
    ferrisRot.add(rim);
    const cabColors = [0xf43f5e, 0xf59e0b, 0x10b981, 0x3b82f6, 0xa855f7];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 1.8, 1.8),
        new THREE.MeshStandardMaterial({
          color: cabColors[i % cabColors.length],
          emissive: cabColors[i % cabColors.length],
          emissiveIntensity: isNight ? 0.65 : 0.14,
        }),
      );
      cab.position.set(0, Math.sin(a) * 10.8, Math.cos(a) * 10.8);
      ferrisRot.add(cab);
    }
    const legM = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.3 });
    for (const tz of [-0.26, 0.26]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 17, 6), legM);
      leg.position.set(22, 7.8, tz * 16);
      leg.rotation.x = tz;
      wheelGroup.add(leg);
    }
    wheelGroup.add(ferrisRot);
    wheelGroup.position.set(getRoadCenterX(-1460) + 14, 0, -1460);
    group.add(wheelGroup);

    // Abu Qir Naval College & Civic Hub Signboard Gantry (z = -2120)
    const aqCivicGantry = buildOverheadGantry(
      'أبو قير البلد · الكلية البحرية وبنك مصر وسوق الأسماك',
      'المعهد الديني · البريد · شركات الاتصال · الكافتيريات',
      '#065F46',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      isNight,
      textures,
    );
    aqCivicGantry.position.set(getRoadCenterX(-2120), 0, -2120);
    aqCivicGantry.rotation.y = getRoadYawAt(-2120);
    group.add(aqCivicGantry);

    // F) SECTOR 3 LANDMARKS: Sidi Gaber Drivable Side Bypass Street (-2400..-3660) + Sidi Gaber Train Station (-3180)
    const sideRoadGeo = createCurvedRibbonGeometry(
      9.65,
      16.75,
      -2380,
      -3660,
      6,
      () => 0.015,
      1,
      0.06,
      undefined,
      'grand_alexandria',
    );
    const grandSideCanvas = document.createElement('canvas');
    grandSideCanvas.width = 256;
    grandSideCanvas.height = 512;
    const gsCtx = grandSideCanvas.getContext('2d')!;
    gsCtx.fillStyle = '#000000';
    gsCtx.fillRect(0, 0, 256, 512);
    gsCtx.fillStyle = '#FFFFFF';
    gsCtx.fillRect(10, 0, 10, 512);
    gsCtx.fillRect(236, 0, 10, 512);
    for (let y = 18; y < 512; y += 78) {
      gsCtx.fillRect(123, y, 10, 44);
    }
    const grandSideTex = new THREE.CanvasTexture(grandSideCanvas);
    grandSideTex.wrapS = THREE.RepeatWrapping;
    grandSideTex.wrapT = THREE.RepeatWrapping;
    grandSideTex.colorSpace = THREE.SRGBColorSpace;
    grandSideTex.anisotropy = maxAnisotropy;
    textures.push(grandSideTex);

    const sideRoadMat = new THREE.MeshBasicMaterial({
      map: grandSideTex,
      fog: false,
    });
    group.add(new THREE.Mesh(sideRoadGeo, sideRoadMat));

    // Sidi Gaber Train Station on the Right (z = -3180)
    const sgStation = new THREE.Group();
    const sgStoneMat = new THREE.MeshStandardMaterial({ color: 0xf5ecd8, roughness: 0.7 });
    const sgRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.45, roughness: 0.35 });
    const sgGlassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: isNight ? 0.85 : 0.24,
    });
    const stMain = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 68), sgStoneMat);
    stMain.position.set(34, 7.5, 0);
    const stDome = new THREE.Mesh(
      new THREE.SphereGeometry(6.8, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
      sgRoofMat,
    );
    stDome.position.set(34, 15.0, 0);
    const stGlass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10, 18), sgGlassMat);
    stGlass.position.set(26.4, 5.5, 0);
    const stSignTex = makeArabicSignTexture(
      'محطة قطار سيدي جابر',
      'السكة الحديد · رصيف ١ و ٢ · الإسكندرية الكاملة',
      '#0C2D57',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      512,
      144,
    );
    textures.push(stSignTex);
    const stSignMat = new THREE.MeshStandardMaterial({
      map: stSignTex,
      emissiveMap: stSignTex,
      emissive: 0xffffff,
      emissiveIntensity: isNight ? 1.0 : 0.3,
    });
    const stSign = new THREE.Mesh(new THREE.BoxGeometry(22, 3.4, 0.4), [
      sgRoofMat,
      sgRoofMat,
      sgRoofMat,
      sgRoofMat,
      stSignMat,
      stSignMat,
    ]);
    stSign.position.set(22.5, 11.0, 0);
    stSign.rotation.y = -Math.PI / 2;
    const sgStationTrain = buildElevatedTrain(maxAnisotropy, isNight, textures);
    sgStationTrain.position.set(52, 0.4, 0);
    sgStation.add(stMain, stDome, stGlass, stSign, sgStationTrain);
    sgStation.position.set(getRoadCenterX(-3180), 0, -3180);
    sgStation.rotation.y = getRoadYawAt(-3180);
    group.add(sgStation);

    // G) SECTOR 4 LANDMARKS: Ras El-Soda El-Saa Clock Tower (z = -4020) + Animated Victoria Tram (-3950..-4800)
    const clockTower = new THREE.Group();
    const ctBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.4, 7.2), stanStoneMat);
    ctBase.position.y = 1.7;
    const ctShaft = new THREE.Mesh(new THREE.BoxGeometry(4.8, 17.5, 4.8), stanStoneMat);
    ctShaft.position.y = 12.1;
    const ctCap = new THREE.Mesh(new THREE.ConeGeometry(3.8, 5.2, 4), stanRoofMat);
    ctCap.rotation.y = Math.PI / 4;
    ctCap.position.y = 23.4;
    const ctTex = makeClockFaceTexture(maxAnisotropy);
    textures.push(ctTex);
    const ctFaceMat = new THREE.MeshStandardMaterial({
      map: ctTex,
      emissiveMap: ctTex,
      emissive: 0xfef3c7,
      emissiveIntensity: isNight ? 1.25 : 0.35,
    });
    for (let f = 0; f < 4; f++) {
      const a = (f * Math.PI) / 2;
      const dial = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), ctFaceMat);
      dial.position.set(Math.sin(a) * 2.48, 17.8, Math.cos(a) * 2.48);
      dial.rotation.y = a;
      clockTower.add(dial);
    }
    clockTower.add(ctBase, ctShaft, ctCap);
    clockTower.position.set(getRoadCenterX(-4020) + 21, 0, -4020);
    group.add(clockTower);

    // Animated Blue-Yellow Alexandria Tram gliding through Victoria Sector!
    const tram = new THREE.Group();
    const tramBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.32, metalness: 0.3 });
    const tramYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.34 });
    const tramWinMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0xfef08a : 0x0f172a,
      emissive: isNight ? 0xfde047 : 0x38bdf8,
      emissiveIntensity: isNight ? 1.1 : 0.22,
    });
    for (let c = 0; c < 2; c++) {
      const car = new THREE.Group();
      car.position.z = c * 11.4 - 5.7;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.35, 10.6), tramBlueMat);
      lower.position.y = 1.05;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.35, 10.6), tramYellowMat);
      upper.position.y = 2.4;
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.78, 9.6), tramWinMat);
      win.position.y = 2.38;
      car.add(lower, upper, win);
      tram.add(car);
    }
    group.add(tram);

    // H) SECTOR 5 LANDMARKS: Anfoushi Festive String Lights + Fishing Boats + Rotating Lighthouse (z = -4850..-5950)
    const bulbPalette = [0xfacc15, 0xf43f5e, 0x38bdf8, 0x22c55e, 0xf97316];
    const stringStep = isMobile ? 48 : 34;
    for (let z = -4920; z >= -5860; z -= stringStep) {
      const rx = getRoadCenterX(z);
      const yaw = getRoadYawAt(z);
      const sg = new THREE.Group();
      sg.position.set(rx, 0, z);
      sg.rotation.y = yaw;
      for (let b = -5; b <= 5; b++) {
        const bx = b * 2.1;
        const sag = 6.6 + (bx * bx) * 0.015;
        const col = bulbPalette[Math.abs(b + Math.floor(z / stringStep)) % bulbPalette.length];
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 6, 6),
          new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: isNight ? 1.85 : 0.45,
          }),
        );
        bulb.position.set(bx, sag, 0);
        sg.add(bulb);
      }
      group.add(sg);
    }

    // Bobbing Fishing Boats across BOTH Sector 1 (Corniche) & Sector 5 (Anfoushi Harbor)
    const grandBoats: Array<{ mesh: THREE.Group; phase: number }> = [];
    const boatColors = [0x1d4ed8, 0x059669, 0xdc2626, 0xd97706, 0x2563eb, 0xffffff];
    const s1Count = isMobile ? 8 : 14;
    for (let i = 0; i < s1Count; i++) {
      const bz = -110 - i * (isMobile ? 128 : 74);
      const boat = buildFishingBoat(boatColors[i % boatColors.length], i % 2 === 0 ? 0xffffff : 0xfef08a);
      boat.position.set(getRoadCenterX(bz) + 26 + (i % 4) * 11, -0.68, bz);
      boat.rotation.y = (i % 5) * 0.38 - 0.7;
      group.add(boat);
      grandBoats.push({ mesh: boat, phase: i * 0.75 });
    }
    const bCount = isMobile ? 14 : 22;
    for (let i = 0; i < bCount; i++) {
      const bz = -4890 - i * (isMobile ? 76 : 48);
      const boat = buildFishingBoat(boatColors[i % boatColors.length], i % 2 === 0 ? 0xffffff : 0xfef08a);
      boat.position.set(getRoadCenterX(bz) + 26 + (i % 4) * 11, -0.68, bz);
      boat.rotation.y = (i % 5) * 0.4 - 0.8;
      group.add(boat);
      grandBoats.push({ mesh: boat, phase: i * 0.85 });
    }

    // Rotating Anfoushi Lighthouse at z = -5910
    const lighthouse = new THREE.Group();
    const lhWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
    const lhRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    for (let ring = 0; ring < 5; ring++) {
      const rB = 3.2 - ring * 0.35;
      const rT = 3.2 - (ring + 1) * 0.35;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rT, rB, 3.8, 12),
        ring % 2 === 0 ? lhWhite : lhRed,
      );
      seg.position.y = 1.9 + ring * 3.8;
      lighthouse.add(seg);
    }
    const lhBeamPivot = new THREE.Group();
    lhBeamPivot.position.y = 20.3;
    const lhBeam = new THREE.Mesh(
      new THREE.ConeGeometry(4.8, 36, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: isNight ? 0.36 : 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    lhBeam.rotation.z = Math.PI / 2;
    lhBeam.position.x = 18;
    lhBeamPivot.add(lhBeam);
    lighthouse.add(lhBeamPivot);
    lighthouse.position.set(getRoadCenterX(-5910) + 28, 0, -5910);
    group.add(lighthouse);

    // I) Dense Right-Side Urban Buildings across ALL 3 Inland Sectors (-1220 .. -4800)
    const grandPalette = [
      { base: '#E5CFAF', accent: '#9A6B42' },
      { base: '#DCD4C8', accent: '#64748B' },
      { base: '#EBC8A4', accent: '#B45309' },
      { base: '#CBD5E1', accent: '#334155' },
    ];
    const grandFacadeMats = grandPalette.map((gp) => {
      const tex = makeUrbanFacadeTexture(gp.base, gp.accent, isNight, maxAnisotropy);
      textures.push(tex);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: isNight ? tex : undefined,
        emissive: isNight ? 0xffedd5 : 0x000000,
        emissiveIntensity: isNight ? 0.88 : 0,
        roughness: 0.78,
      });
    });
    const grandBuckets: Array<THREE.Matrix4[]> = grandFacadeMats.map(() => []);
    const gbStep = isMobile ? 32 : 24;
    for (let z = -1230; z >= -4790; z -= gbStep) {
      // Skip right-side iconic landmark footprints (Ferris wheel, Sidi Gaber Station, Clock Tower, gas stations)
      if (
        Math.abs(z + 1460) < 48 ||
        Math.abs(z + 3180) < 62 ||
        Math.abs(z + 4020) < 38 ||
        Math.abs(z + 1940) < 26 ||
        Math.abs(z + 2960) < 26 ||
        Math.abs(z + 4180) < 28
      ) {
        continue;
      }
      const rx = getRoadCenterX(z);
      const yaw = getRoadYawAt(z);
      const inSideBypassSector = z <= -2380 && z >= -3660;
      const rightStart = inSideBypassSector ? 23.0 : 19.5;
      const w = 13 + (Math.abs(z) % 5) * 1.4;
      const h = 15 + (Math.abs(z * 7) % 16);
      const d = 15 + (Math.abs(z * 3) % 7);
      dummy.position.set(rx + rightStart + w * 0.5, h * 0.5, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      grandBuckets[Math.abs(Math.floor(z / gbStep)) % grandFacadeMats.length].push(dummy.matrix.clone());
    }
    const gbGeo = new THREE.BoxGeometry(1, 1, 1);
    grandBuckets.forEach((mats, bi) => {
      if (mats.length === 0) return;
      const inst = new THREE.InstancedMesh(gbGeo, grandFacadeMats[bi], mats.length);
      mats.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
    });

    // J) Animate all live Grand Connected Alexandria set-pieces smoothly!
    let elTrainZ = -1320;
    let tramZ = -4100;
    let tramDir = -1;
    updaters.push((dt, elapsed) => {
      // Abu Qir Elevated Train looping along Sector 2 (-1220 .. -2360)
      elTrainZ -= dt * 36;
      if (elTrainZ < -2360) elTrainZ = -1220;
      const tyaw = getRoadYawAt(elTrainZ);
      grandElevatedTrain.position.set(getRoadCenterX(elTrainZ) + 1.8 * Math.cos(tyaw), 9.55, elTrainZ);
      grandElevatedTrain.rotation.y = tyaw;

      // Maamoura Ferris wheel rotation
      ferrisRot.rotation.x += dt * 0.34;

      // Sidi Gaber Station express train gliding
      sgStationTrain.position.z = Math.sin(elapsed * 0.22) * 28;

      // Victoria Alexandria Tram gliding along Sector 4 (-4100 .. -4780)
      tramZ += tramDir * dt * 16;
      if (tramZ < -4780) tramDir = 1;
      if (tramZ > -4100) tramDir = -1;
      tram.position.set(getRoadCenterX(tramZ) + 15.4, 0, tramZ);
      tram.rotation.y = getRoadYawAt(tramZ) + (tramDir === 1 ? Math.PI : 0);

      // Anfoushi Fishing Boats & Lighthouse beam
      lhBeamPivot.rotation.y += dt * 1.1;
      for (const b of grandBoats) {
        b.mesh.position.y = -0.68 + Math.sin(elapsed * 2.2 + b.phase) * 0.2;
        b.mesh.rotation.z = Math.sin(elapsed * 1.7 + b.phase) * 0.06;
      }
    });
  }

  return {
    group,
    update: (dt, elapsed, playerZ) => {
      for (const fn of updaters) {
        fn(dt, elapsed, playerZ);
      }
    },
    dispose: () => {
      textures.forEach((t) => t.dispose());
    },
  };
}
