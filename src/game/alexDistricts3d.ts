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

    // Continuous Elevated Metro Viaduct running from Mandara (z = +50) all the way to Abu Qir El-Balad (z = -7320)!
    // Viaduct rides cleanly above the center median (x = roadCenterX, y = 8.4m) so you drive right underneath & alongside it!
    const segStep = 32;
    const zStart = 50;
    const zEnd = -7320;
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

    // Inland Urban Ground Plane from Mandara to Abu Waad (z = +180 .. -5060), plus Left-Side Urban Ground from Abu Waad to Abu Qir El-Balad (so Right Side opens cleanly to Abu Qir Beaches & Blue Sea!)
    const aqGroundMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const aqGroundNorth = new THREE.Mesh(new THREE.PlaneGeometry(820, 5400), aqGroundMat);
    aqGroundNorth.rotation.x = -Math.PI / 2;
    aqGroundNorth.position.set(0, -0.09, -2480);
    group.add(aqGroundNorth);

    const aqGroundLeftSouth = new THREE.Mesh(new THREE.PlaneGeometry(460, 2700), aqGroundMat);
    aqGroundLeftSouth.rotation.x = -Math.PI / 2;
    aqGroundLeftSouth.position.set(-220, -0.09, -6360);
    group.add(aqGroundLeftSouth);

    // Pure-black right sidewalk with crisp white edge along main avenue from Mandara up to Abu Waad branch (z = +120 .. -5060)
    const aqSidewalkCanvas = document.createElement('canvas');
    aqSidewalkCanvas.width = 128;
    aqSidewalkCanvas.height = 128;
    const aqSwCtx = aqSidewalkCanvas.getContext('2d')!;
    aqSwCtx.fillStyle = '#000000';
    aqSwCtx.fillRect(0, 0, 128, 128);
    aqSwCtx.fillStyle = '#FFFFFF';
    aqSwCtx.fillRect(0, 0, 12, 128);
    const aqSidewalkTex = new THREE.CanvasTexture(aqSidewalkCanvas);
    aqSidewalkTex.colorSpace = THREE.SRGBColorSpace;
    aqSidewalkTex.wrapS = THREE.RepeatWrapping;
    aqSidewalkTex.wrapT = THREE.RepeatWrapping;
    textures.push(aqSidewalkTex);
    const aqSidewalkMat = new THREE.MeshBasicMaterial({ map: aqSidewalkTex, fog: false });
    const aqRightWalkMainGeo = createCurvedRibbonGeometry(
      10.0,
      14.8,
      120,
      -5060,
      5,
      () => 0.24,
      2,
      0.22,
      undefined,
      'abu_qir',
    );
    group.add(new THREE.Mesh(aqRightWalkMainGeo, aqSidewalkMat));

    // Dense Right-Side Alexandrian Apartment & Shop Buildings (Mandara .. before Abu Waad Beach Branch at z = -5020)
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

    const aqBldgStep = isMobile ? 34 : 26;
    const aqBldgGeo = new THREE.BoxGeometry(1, 1, 1);
    const aqBldgBuckets: Array<THREE.Matrix4[]> = aqFacadeMats.map(() => []);
    const aqLandmarkClearRanges: Array<[number, number]> = [
      [-970, -830], // بوابات وحدائق المنتزه
      [-1875, -1725], // المعمورة الشاطئ والملاهي
      [-2775, -2625], // سوق المعمورة البلد
      [-3675, -3525], // منطقة ومحطة الإصلاح
      [-4575, -4425], // مجمع مدارس طوسون
    ];

    for (let z = 60; z >= -5000; z -= aqBldgStep) {
      if (aqLandmarkClearRanges.some(([minZ, maxZ]) => z >= minZ && z <= maxZ)) continue;
      // Keep clear near right-side gas stations
      if (
        Math.abs(z + 240) < 34 ||
        Math.abs(z + 1360) < 34 ||
        Math.abs(z + 2640) < 34 ||
        Math.abs(z + 3920) < 34
      ) {
        continue;
      }
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

    // 9 Illuminated Elevated Metro Stations along المندرة ← المنتزه ← المعمورة ← الإصلاح ← طوسون ← يفطة أبو وعد والكلية البحرية ← أبو قير البلد (7.2 km)
    const stations = [
      { z: -65, title: '1. محطة المندرة العلوية', sub: 'بداية طريق أبو قير والقطار المعلق (٧.٢ كم)' },
      { z: -900, title: '2. محطة المنتزه العلوية', sub: 'بوابات وحدائق المنتزه الملكية' },
      { z: -1800, title: '3. محطة المعمورة الشاطئ', sub: 'ملاهي وعجلة المعمورة الدوارة' },
      { z: -2700, title: '4. محطة المعمورة البلد', sub: 'سوق المعمورة البلد التجاري' },
      { z: -3600, title: '5. محطة الإصلاح العلوية', sub: 'منطقة ومجمع الإصلاح · طريق أبو قير' },
      { z: -4500, title: '6. محطة طوسون العلوية', sub: 'مجمع مدارس طوسون · استعد ليفطة أبو وعد' },
      { z: -5400, title: '7. الكلية البحرية · أبو وعد', sub: 'الشارع الفرعي للشواطئ على اليمين ↗ · الكلية البحرية شمال' },
      { z: -6300, title: '8. وسط أبو قير البلد', sub: 'المعهد الديني · البريد · بنك مصر · وبجانبك الشواطئ ↗' },
      { z: -7150, title: '9. محطة أبو قير البلد النهائية', sub: 'الموقف · النوادي · سوق الأسماك وشاطئ الصيادين' },
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
    // LANDMARK 0 (z = -900): بوابات وحدائق المنتزه (Royal Montaza Gates & Gardens)
    // ==========================================================================
    const montazaGateGroup = new THREE.Group();
    const mzStoneMat = new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.72 });
    const mzTerracottaMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 });
    const mzGardenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    const mzFloor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.35, 86), mzGardenMat);
    mzFloor.position.set(20, 0.17, 0);
    const mzWallL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.2, 30), mzStoneMat);
    mzWallL.position.set(4.2, 2.1, -26);
    const mzWallR = mzWallL.clone();
    mzWallR.position.z = 26;
    const mzTowerL = new THREE.Mesh(new THREE.BoxGeometry(3.4, 11.5, 3.4), mzStoneMat);
    mzTowerL.position.set(4.5, 5.75, -10.5);
    const mzTowerR = mzTowerL.clone();
    mzTowerR.position.z = 10.5;
    const mzCapL = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 4), mzTerracottaMat);
    mzCapL.rotation.y = Math.PI / 4;
    mzCapL.position.set(4.5, 13.0, -10.5);
    const mzCapR = mzCapL.clone();
    mzCapR.position.z = 10.5;
    const mzSign = makeSignBoardMesh(
      'بوابات وحدائق المنتزه',
      'حدائق وقصر المنتزه الملكي · طريق أبو قير',
      '#7C2D12',
      '#FACC15',
      '#FEF08A',
      19.0,
      3.1,
      mzTerracottaMat,
    );
    mzSign.position.set(4.5, 8.8, 0);
    mzSign.rotation.y = -Math.PI / 2;
    montazaGateGroup.add(mzFloor, mzWallL, mzWallR, mzTowerL, mzTowerR, mzCapL, mzCapR, mzSign);
    montazaGateGroup.position.set(getRoadCenterX(-900) + 16.5, getRoadHeightAt(-900), -900);
    montazaGateGroup.rotation.y = getRoadYawAt(-900);
    group.add(montazaGateGroup);

    // ==========================================================================
    // LANDMARK 1 (z = -1800): المعمورة الشاطئ والملاهي (Spinning Ferris Wheel + Amusement Park)
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

    maamouraPark.position.set(getRoadCenterX(-1800) + 16.5, getRoadHeightAt(-1800), -1800);
    maamouraPark.rotation.y = getRoadYawAt(-1800);
    group.add(maamouraPark);

    // ==========================================================================
    // LANDMARK 2 (z = -2700): سوق المعمورة البلد (Bustling Traditional Market)
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

    maamouraMarket.position.set(getRoadCenterX(-2700) + 16.5, getRoadHeightAt(-2700), -2700);
    maamouraMarket.rotation.y = getRoadYawAt(-2700);
    group.add(maamouraMarket);

    // ==========================================================================
    // LANDMARK 2B (z = -3600): منطقة ومحطة الإصلاح (El-Eslah District Commercial Plaza)
    // ==========================================================================
    const eslahPlaza = new THREE.Group();
    const eslahBase = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.32, 84),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 }),
    );
    eslahBase.position.set(17, 0.16, 0);
    const eslahMain = new THREE.Mesh(
      new THREE.BoxGeometry(14, 14.5, 52),
      aqFacadeMats[0],
    );
    eslahMain.position.set(22, 7.25, 0);
    const eslahSign = makeSignBoardMesh(
      'منطقة ومحطة الإصلاح',
      'شارع ومحطة الإصلاح · بين المعمورة وطوسون',
      '#1E3A8A',
      '#FACC15',
      '#FEF08A',
      18.5,
      3.0,
      canopyMat,
    );
    eslahSign.position.set(5.2, 7.4, 0);
    eslahSign.rotation.y = -Math.PI / 2;
    const esPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 7.4, 0.65), canopyMat);
    esPost1.position.set(5.2, 3.7, -9.2);
    const esPost2 = esPost1.clone();
    esPost2.position.z = 9.2;
    eslahPlaza.add(eslahBase, eslahMain, eslahSign, esPost1, esPost2);
    eslahPlaza.position.set(getRoadCenterX(-3600) + 16.5, getRoadHeightAt(-3600), -3600);
    eslahPlaza.rotation.y = getRoadYawAt(-3600);
    group.add(eslahPlaza);

    // ==========================================================================
    // LANDMARK 3 (z = -4500): طوسون ومجمع المدارس (Egyptian Schools Complex)
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

    toussonSchools.position.set(getRoadCenterX(-4500) + 16.5, getRoadHeightAt(-4500), -4500);
    toussonSchools.rotation.y = getRoadYawAt(-4500);
    group.add(toussonSchools);

    // ==========================================================================
    // LANDMARK 4 (z = -5400, LEFT SIDE): الكلية البحرية بأبو قير (Opposite يفطة أبو وعد وشارع الشواطئ!)
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
    navalCollege.position.set(getRoadCenterX(-5400) - 16.5, getRoadHeightAt(-5400), -5400);
    navalCollege.rotation.y = getRoadYawAt(-5400) + Math.PI;
    group.add(navalCollege);

    // ==========================================================================
    // ★ STAR FEATURE: يفطة أبو وعد + الشارع الفرعي للشواطئ (z = -5060 .. -7320, RIGHT +X SIDE!)
    // Drivable parallel beach street branching right from يفطة أبو وعد with golden sand, vivid blue sea,
    // 4 named Abu Qir beaches (شاطئ أبو وعد · شاطئ أبو قير · براديس والجزيرة · الصيادين), umbrellas & boats!
    // ==========================================================================
    const abuWaadGantry = buildOverheadGantry(
      'يفطة أبو وعد ↗ · مدخل الشارع الفرعي للشواطئ',
      'لف يمين للشارع الفرعي ← شاطئ أبو وعد · شاطئ أبو قير · براديس والجزيرة · الصيادين',
      '#0C4A6E',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      isNight,
      textures,
    );
    abuWaadGantry.scale.set(1.18, 1, 1);
    abuWaadGantry.position.set(getRoadCenterX(-5060) + 2.8, getRoadHeightAt(-5060), -5060);
    abuWaadGantry.rotation.y = getRoadYawAt(-5060);
    group.add(abuWaadGantry);

    // Monumental Glowing Roadside Signboard: "يفطة أبو وعد" right at the beach branch turn!
    const abuWaadPostGroup = new THREE.Group();
    const awPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 10.2, 8), canopyMat);
    awPillar1.position.set(0, 5.1, -6.2);
    const awPillar2 = awPillar1.clone();
    awPillar2.position.z = 6.2;
    const awHeroSign = makeSignBoardMesh(
      '★ يفطة أبو وعد · شارع الشواطئ ↗',
      'الشارع الفرعي المفتوح على البحر وشواطئ أبو قير',
      '#9A3412',
      '#FACC15',
      '#FEF08A',
      14.5,
      3.4,
      canopyMat,
    );
    awHeroSign.position.set(0, 9.2, 0);
    awHeroSign.rotation.y = -Math.PI / 2;
    abuWaadPostGroup.add(awPillar1, awPillar2, awHeroSign);
    abuWaadPostGroup.position.set(getRoadCenterX(-5075) + 19.2, 0, -5075);
    abuWaadPostGroup.rotation.y = getRoadYawAt(-5075);
    group.add(abuWaadPostGroup);

    // Drivable Pure-Black Beach Branch Street (x = +9.65 .. +16.75, z = -5060 .. -7320) with crisp white lines
    const beachRoadCanvas = document.createElement('canvas');
    beachRoadCanvas.width = 256;
    beachRoadCanvas.height = 512;
    const brCtx = beachRoadCanvas.getContext('2d')!;
    brCtx.fillStyle = '#000000';
    brCtx.fillRect(0, 0, 256, 512);
    brCtx.fillStyle = '#FFFFFF';
    brCtx.fillRect(8, 0, 10, 512);
    brCtx.fillRect(238, 0, 10, 512);
    for (let y = 18; y < 512; y += 96) {
      brCtx.fillRect(123, y, 10, 52);
    }
    const beachRoadTex = new THREE.CanvasTexture(beachRoadCanvas);
    beachRoadTex.wrapS = THREE.RepeatWrapping;
    beachRoadTex.wrapT = THREE.RepeatWrapping;
    beachRoadTex.colorSpace = THREE.SRGBColorSpace;
    beachRoadTex.anisotropy = maxAnisotropy;
    textures.push(beachRoadTex);
    const beachRoadMat = new THREE.MeshBasicMaterial({ map: beachRoadTex, fog: false });
    const beachBranchRoadGeo = createCurvedRibbonGeometry(
      9.65,
      16.75,
      -5060,
      -7320,
      5,
      () => 0.015,
      1,
      0.06,
      undefined,
      'abu_qir',
    );
    group.add(new THREE.Mesh(beachBranchRoadGeo, beachRoadMat));

    // Beachside Boardwalk Sidewalk (x = +16.85 .. +21.6, z = -5060 .. -7320)
    const beachWalkGeo = createCurvedRibbonGeometry(
      16.85,
      21.6,
      -5060,
      -7320,
      5,
      () => 0.24,
      2,
      0.22,
      undefined,
      'abu_qir',
    );
    group.add(new THREE.Mesh(beachWalkGeo, aqSidewalkMat));

    // Yellow reflective divider studs with wide open access ramps between main avenue & Beach Branch Street
    const awStudMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: isNight ? 1.15 : 0.3,
      roughness: 0.35,
    });
    const awStuds: Array<{ x: number; z: number; yaw: number }> = [];
    for (let z = -5140; z >= -7260; z -= 14) {
      if (Math.abs(z) % 140 < 54) continue;
      awStuds.push({ x: getRoadCenterX(z) + 9.88, z, yaw: getRoadYawAt(z) });
    }
    if (awStuds.length > 0) {
      const awStudInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.14, 4.6), awStudMat, awStuds.length);
      awStuds.forEach((sp, i) => {
        dummy.position.set(sp.x, 0.08, sp.z);
        dummy.rotation.set(0, sp.yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        awStudInst.setMatrixAt(i, dummy.matrix);
      });
      awStudInst.instanceMatrix.needsUpdate = true;
      awStudInst.frustumCulled = false;
      group.add(awStudInst);
    }

    // Golden Sandy Beaches Ribbon (x = +21.6 .. +58) + Vivid Blue Abu Qir Sea Ribbon (x = +54 .. +480)
    const aqBeachSandMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x6b5b3e : isSunset ? 0xe5b874 : 0xf5d796,
      roughness: 0.92,
    });
    const aqBeachSandGeo = createCurvedRibbonGeometry(
      21.6,
      58,
      -5060,
      -7380,
      12,
      (_z, isLeft) => (isLeft ? 0.1 : -0.45),
      1,
      0.02,
      undefined,
      'abu_qir',
    );
    group.add(new THREE.Mesh(aqBeachSandGeo, aqBeachSandMat));

    const aqSeaMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x0b357a : isSunset ? 0x144ea8 : 0x1565d8,
      roughness: 0.15,
      metalness: 0.28,
      emissive: isNight ? 0x09245e : isSunset ? 0x143b8c : 0x1d4ed8,
      emissiveIntensity: isNight ? 0.42 : 0.24,
    });
    const aqSeaGeo = createCurvedRibbonGeometry(
      54,
      480,
      -5060,
      -7480,
      18,
      () => -0.58,
      1,
      0.01,
      undefined,
      'abu_qir',
    );
    group.add(new THREE.Mesh(aqSeaGeo, aqSeaMat));

    // 4 Named 3D Abu Qir Beaches along the Abu Waad Side Branch Street (arches, umbrellas, cabanas!)
    const aqBeachDefs = [
      { z: -5320, title: 'شاطئ أبو وعد', sub: 'بداية شارع الشواطئ · كافيهات وشماسي على البحر', bg: '#0369A1' },
      { z: -5860, title: 'شاطئ أبو قير السياحي', sub: 'شاطئ رملي مفتوح · كبائن وملاعب شاطئية', bg: '#0E7490' },
      { z: -6400, title: 'شاطئ براديس والجزيرة', sub: 'إطلالة خليج أبو قير · مراكب ورحلات بحرية', bg: '#1D4ED8' },
      { z: -6960, title: 'شاطئ الصيادين وميناء أبو قير', sub: 'مراكب الصيد وكورنيش أبو قير الشرقي', bg: '#0F766E' },
    ];
    const beachUmbPalette = [0xef4444, 0x0ea5e9, 0xf59e0b, 0x10b981, 0xec4899, 0x8b5cf6];
    const beachPoleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const cabanaWoodMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });

    aqBeachDefs.forEach((bd, bIdx) => {
      const bg = new THREE.Group();
      const bSign = makeSignBoardMesh(bd.title, bd.sub, bd.bg, '#FACC15', '#FEF08A', 15.5, 2.9, canopyMat);
      bSign.position.set(20.6, 6.2, 0);
      bSign.rotation.y = -Math.PI / 2;
      const bp1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.2, 0.55), beachPoleMat);
      bp1.position.set(20.6, 3.1, -7.8);
      const bp2 = bp1.clone();
      bp2.position.z = 7.8;
      bg.add(bSign, bp1, bp2);

      // Beach Cabanas & Rows of Colorful Beach Umbrellas on the Golden Sand!
      for (let row = 0; row < 2; row++) {
        for (let u = -4; u <= 4; u++) {
          const ux = 28 + row * 12 + (Math.abs(u) % 2) * 2.2;
          const uz = u * 16 + row * 7;
          const uPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), beachPoleMat);
          uPole.position.set(ux, 1.5, uz);
          const uCone = new THREE.Mesh(
            new THREE.ConeGeometry(2.6, 1.0, 8),
            new THREE.MeshStandardMaterial({
              color: beachUmbPalette[(Math.abs(u) + bIdx + row) % beachUmbPalette.length],
              roughness: 0.55,
            }),
          );
          uCone.position.set(ux, 3.1, uz);
          bg.add(uPole, uCone);
        }
      }
      for (const cz of [-28, 0, 28]) {
        const cab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.6, 6.4), cabanaWoodMat);
        cab.position.set(25.2, 1.8, cz);
        const cabRoof = new THREE.Mesh(
          new THREE.BoxGeometry(5.2, 0.45, 7.0),
          new THREE.MeshStandardMaterial({ color: beachUmbPalette[(bIdx + Math.abs(cz)) % beachUmbPalette.length], roughness: 0.5 }),
        );
        cabRoof.position.set(25.2, 3.8, cz);
        bg.add(cab, cabRoof);
      }

      bg.position.set(getRoadCenterX(bd.z), 0, bd.z);
      bg.rotation.y = getRoadYawAt(bd.z);
      group.add(bg);
    });

    // 10 Colorful Fishing & Pleasure Boats bobbing gently on the vivid blue Abu Qir sea off the Beach Branch!
    const aqBoatEntries: Array<{ mesh: THREE.Group; baseY: number; phase: number }> = [];
    const aqBoatHulls = [0x0284c7, 0xe11d48, 0x16a34a, 0xd97706, 0x7c3aed, 0x0ea5e9];
    for (let b = 0; b < 10; b++) {
      const bz = -5180 - b * 215;
      const bx = getRoadCenterX(bz) + 74 + (b % 3) * 26;
      const boat = buildFishingBoat(aqBoatHulls[b % aqBoatHulls.length], 0xfacc15);
      boat.position.set(bx, -0.42, bz);
      boat.rotation.y = (b % 2 === 0 ? 0.35 : -0.45) + (b * 0.17);
      boat.scale.setScalar(1.18 + (b % 3) * 0.14);
      group.add(boat);
      aqBoatEntries.push({ mesh: boat, baseY: -0.42, phase: b * 0.9 });
    }

    // ==========================================================================
    // HEART OF ABU QIR EL-BALAD (z = -5760 .. -7200, LEFT -X SIDE opposite Abu Qir Beaches!)
    // المدارس · المعهد الديني · البريد · بنك مصر · شركات الاتصال · الكافتيريات · موقف العربيات · النوادي · سوق الأسماك
    // ==========================================================================
    const baladGantry = buildOverheadGantry(
      'أهلاً بكم في قلب أبو قير البلد',
      'المعهد الديني · البريد · بنك مصر · الكافتيريات · الموقف · النوادي · سوق الأسماك — والشواطئ على اليمين ↗',
      '#0F172A',
      '#FACC15',
      '#FEF08A',
      maxAnisotropy,
      isNight,
      textures,
    );
    baladGantry.scale.set(1.18, 1, 1);
    baladGantry.position.set(getRoadCenterX(-5760) + 2.8, getRoadHeightAt(-5760), -5760);
    baladGantry.rotation.y = getRoadYawAt(-5760);
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
    azharZone.position.set(getRoadCenterX(-5940) - 16.5, getRoadHeightAt(-5940), -5940);
    azharZone.rotation.y = getRoadYawAt(-5940) + Math.PI;
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
    civicZone.position.set(getRoadCenterX(-6160) - 16.5, getRoadHeightAt(-6160), -6160);
    civicZone.rotation.y = getRoadYawAt(-6160) + Math.PI;
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
    telecomZone.position.set(getRoadCenterX(-6360) - 16.5, getRoadHeightAt(-6360), -6360);
    telecomZone.rotation.y = getRoadYawAt(-6360) + Math.PI;
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
    cafesZone.position.set(getRoadCenterX(-6560) - 16.5, getRoadHeightAt(-6560), -6560);
    cafesZone.rotation.y = getRoadYawAt(-6560) + Math.PI;
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
    transitStation.position.set(getRoadCenterX(-6780) - 16.5, getRoadHeightAt(-6780), -6780);
    transitStation.rotation.y = getRoadYawAt(-6780) + Math.PI;
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
    clubsZone.position.set(getRoadCenterX(-6980) - 16.5, getRoadHeightAt(-6980), -6980);
    clubsZone.rotation.y = getRoadYawAt(-6980) + Math.PI;
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
    fishMarket.position.set(getRoadCenterX(-7160) - 16.5, getRoadHeightAt(-7160), -7160);
    fishMarket.rotation.y = getRoadYawAt(-7160) + Math.PI;
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
      // Spread lively crowds along Abu Waad Beaches boardwalk, Abu Qir El-Balad, Maamoura Market & Park
      const z =
        i < crowdCount * 0.72
          ? -5140 - (i / (crowdCount * 0.72)) * 2040
          : i % 2 === 0
            ? -2655 - ((i * 19) % 90)
            : -1755 - ((i * 17) % 75);
      const onRight = i % 2 === 0;
      const sideOffset =
        z <= -5060 && onRight
          ? 18.2 + (i % 3) * 1.15
          : onRight
            ? 12.6 + (i % 3) * 0.9
            : -13.6 - (i % 3) * 1.35;
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

    // 2 LIVE ANIMATED ELEVATED TRAINS gliding smoothly along the 7.2 km viaduct overhead!
    const trainForward = buildElevatedTrain(maxAnisotropy, isNight, textures);
    const trainReverse = buildElevatedTrain(maxAnisotropy, isNight, textures);
    group.add(trainForward, trainReverse);

    let train1Z = -180;
    let train2Z = -3850;

    updaters.push((dt, elapsed) => {
      // Train 1 glides Mandara -> Abu Qir (track +1.85m right of viaduct centerline)
      train1Z -= dt * 42;
      if (train1Z < -7260) train1Z = 20;
      const yaw1 = getRoadYawAt(train1Z);
      trainForward.position.set(
        getRoadCenterX(train1Z) - 0.1 + Math.cos(yaw1) * 1.9,
        getRoadHeightAt(train1Z) + 9.55,
        train1Z - Math.sin(yaw1) * 1.9,
      );
      trainForward.rotation.y = yaw1;

      // Train 2 glides Abu Qir -> Mandara (track -1.85m left of viaduct centerline)
      train2Z += dt * 44;
      if (train2Z > 20) train2Z = -7260;
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

      // Gently bob fishing boats off Abu Qir beaches
      for (let i = 0; i < aqBoatEntries.length; i++) {
        const b = aqBoatEntries[i];
        b.mesh.position.y = b.baseY + Math.sin(elapsed * 1.5 + b.phase) * 0.16;
        b.mesh.rotation.z = Math.sin(elapsed * 1.2 + b.phase) * 0.04;
      }

      // Subtle lively bobbing of Abu Qir El-Balad & Beaches pedestrian crowds
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
    // Full Inland Urban Ground Plane across 7.2km (NO SEA — bustling Alexandrian city on BOTH sides!)
    const urbanGroundMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog: false,
    });
    const urbanGround = new THREE.Mesh(new THREE.PlaneGeometry(780, 8200), urbanGroundMat);
    urbanGround.rotation.x = -Math.PI / 2;
    urbanGround.position.set(0, -0.09, -3660);
    group.add(urbanGround);

    // Dense Right-Side Alexandrian Buildings + Shops mirroring the city boulevard on the +X side across 7.2km!
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

    const bldgStep = isMobile ? 36 : 26;
    const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
    const dummy = new THREE.Object3D();
    const buckets: Array<THREE.Matrix4[]> = facadeMats.map(() => []);

    for (let z = 60; z >= -7360; z -= bldgStep) {
      // Keep clear around right-side landmarks (Halls -2400, Awaied -3200, Clock Tower -4000, Victoria -7200)
      if (
        Math.abs(z + 2400) < 38 ||
        Math.abs(z + 3200) < 34 ||
        Math.abs(z + 4000) < 42 ||
        Math.abs(z + 7200) < 48
      ) {
        continue;
      }
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

    // All 10 Ordered Overhead Highway Gantries (الرأس السوداء -> الفلكي -> السيوف -> مصطفى كامل -> العوايد -> الساعة -> باكوس -> غبريال -> كلية فيكتوريا -> فيكتوريا)
    const rvGantries: [string, string, number, string, string, string][] = [
      ['1. الرأس السوداء', 'بداية شارع مصطفى كامل ← فيكتوريا (٧.٢ كم)', -45, '#1E293B', '#FACC15', '#FEF08A'],
      ['2. الفلكي', 'مدخل شارع ١٦ الملك · ٨٠٠ م', -750, '#0F172A', '#38BDF8', '#FFFFFF'],
      ['3. السيوف (السيوف شماعة)', 'دوران والسيوف التجاري · ١٦٠٠ م', -1550, '#1E1B4B', '#38BDF8', '#FFFFFF'],
      ['4. شارع مصطفى كامل', 'مجمع القاعات والمعرض · ٢٤٠٠ م', -2350, '#0C4A6E', '#FACC15', '#FFFFFF'],
      ['5. العوايد (كوبري العوايد)', 'مطلع كوبري العوايد العلوي · ٣٢٠٠ م', -3140, '#1E293B', '#F59E0B', '#FEF08A'],
      ['6. ميدان وبرج الساعة', 'قلب ميدان الساعة · ٤٠٠٠ م', -3940, '#0F172A', '#F59E0B', '#FDE047'],
      ['7. باكوس', 'تقاطع وسوق باكوس الشعبي · ٤٨٠٠ م', -4750, '#064E3B', '#FACC15', '#FFFFFF'],
      ['8. غبريال', 'شارع مصطفى كامل · ٥٦٠٠ م', -5550, '#1E293B', '#38BDF8', '#FFFFFF'],
      ['9. كلية فيكتوريا', 'شارع الجلاء · ٦٤٠٠ م', -6350, '#0F172A', '#FACC15', '#FEF08A'],
      ['10. ميدان ومحطة ترام فيكتوريا', 'خط النهاية · ٧٢٠٠ م', -7120, '#0C4A6E', '#FACC15', '#FEF08A'],
    ];
    for (const [title, sub, gz, bg, border, accent] of rvGantries) {
      const gate = buildOverheadGantry(title, sub, bg, border, accent, maxAnisotropy, isNight, textures);
      gate.position.set(getRoadCenterX(gz), getRoadHeightAt(gz), gz);
      gate.rotation.y = getRoadYawAt(gz);
      group.add(gate);
    }

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe5d5bd, roughness: 0.76 });
    const trimGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: isNight ? 0.5 : 0.12,
      metalness: 0.6,
      roughness: 0.3,
    });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

    // 4. شارع مصطفى كامل · مجمع القاعات والمعرض (Right +X at z = -2400)
    {
      const cz = -2400;
      const halls = new THREE.Group();
      const hallBody = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 34), stoneMat);
      hallBody.position.y = 6;
      const goldRoof = new THREE.Mesh(new THREE.BoxGeometry(21, 1.3, 35), trimGoldMat);
      goldRoof.position.y = 12.6;
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: isNight ? 0x0284c7 : 0x000000,
        emissiveIntensity: isNight ? 0.9 : 0,
        roughness: 0.2,
      });
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.5, 24), glassMat);
      glassFront.position.set(-10.1, 5.2, 0);
      halls.add(hallBody, goldRoof, glassFront);
      halls.position.set(getRoadCenterX(cz) + 30, 0, cz);
      halls.rotation.y = getRoadYawAt(cz);
      group.add(halls);
    }

    // 5. كوبري العوايد العلوي (El-Awaied Flyover spanning across the boulevard at z = -3200)
    const awaiedBridge = new THREE.Group();
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(36, 1.8, 12), concreteMat);
    bridgeDeck.position.y = 7.6;
    const bridgePillarL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7.6, 8), concreteMat);
    bridgePillarL.position.set(-15.5, 3.8, 0);
    const bridgePillarR = bridgePillarL.clone();
    bridgePillarR.position.x = 15.5;
    awaiedBridge.add(bridgeDeck, bridgePillarL, bridgePillarR);
    awaiedBridge.position.set(getRoadCenterX(-3200), getRoadHeightAt(-3200), -3200);
    awaiedBridge.rotation.y = getRoadYawAt(-3200);
    group.add(awaiedBridge);

    // 6. Iconic Landmark: Midan El-Saa'a 3D Clock Tower (برج ميدان الساعة) at z = -4000!
    const clockTower = new THREE.Group();
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
    clockTower.position.set(getRoadCenterX(-4000) + 21, 0, -4000);
    group.add(clockTower);

    // 7. سوق باكوس الشعبي (Colorful Market Arcade on LEFT -X at z = -4800)
    {
      const cz = -4800;
      const bakos = new THREE.Group();
      const bBody = new THREE.Mesh(new THREE.BoxGeometry(16, 9.5, 32), stoneMat);
      bBody.position.y = 4.75;
      bakos.add(bBody);
      const awnCols = [0xdc2626, 0x059669, 0xf59e0b, 0x0284c7];
      for (let i = 0; i < 4; i++) {
        const awn = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.55, 6.8),
          new THREE.MeshStandardMaterial({ color: awnCols[i], roughness: 0.55 }),
        );
        awn.position.set(9.2, 3.6, -11.5 + i * 7.6);
        bakos.add(awn);
      }
      bakos.position.set(getRoadCenterX(cz) - 28, 0, cz);
      bakos.rotation.y = getRoadYawAt(cz);
      group.add(bakos);
    }

    // 9. كلية فيكتوريا التاريخية (Classic Heritage Stone Campus on LEFT -X at z = -6400)
    {
      const cz = -6400;
      const college = new THREE.Group();
      const wing = new THREE.Mesh(new THREE.BoxGeometry(20, 12.5, 38), stoneMat);
      wing.position.y = 6.25;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(7.5, 19, 7.5), stoneMat);
      tower.position.set(5, 9.5, 0);
      const domeCap = new THREE.Mesh(new THREE.ConeGeometry(4.4, 4.8, 8), trimGoldMat);
      domeCap.position.set(5, 21.4, 0);
      college.add(wing, tower, domeCap);
      college.position.set(getRoadCenterX(cz) - 29, 0, cz);
      college.rotation.y = getRoadYawAt(cz);
      group.add(college);
    }

    // 10. Animated Classic Alexandria Blue & Yellow Tramcar cruising along the entire 7.2km right tramway corridor!
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

    let tramZ = -7200;
    updaters.push((dt) => {
      tramZ += dt * 18;
      if (tramZ > -100) tramZ = -7200;
      const yaw = getRoadYawAt(tramZ);
      tram.position.set(getRoadCenterX(tramZ) + 15.6, getRoadHeightAt(tramZ), tramZ);
      tram.rotation.y = yaw + Math.PI;
    });
  }

  // ============================================================================
  // 3) ANFOUSHI MARITIME CITY (ساحل رأس التين والأنفوشي وبحري · ٧.٢ كم · ٩ مناطق بالترتيب)
  // 1. قصر رأس التين -> 2. مستشفى رأس التين -> 3. شاطئ رأس التين -> 4. شاطئ الأنفوشي ->
  // 5. قلعة قايتباي -> 6. لسان القلعة (نادي اليخت والكشافة) -> 7. ميدان المساجد ->
  // 8. السيالة (بحري) -> 9. حلقة السمك وميناء الصيادين (بحري)
  // ============================================================================
  else if (districtId === 'anfoushi') {
    // Festive Overhead Glowing Lantern Garlands ("زينة بحري والأنفوشي") arching across the 7.2km coastal avenue!
    const garlandStep = isMobile ? 115 : 80;
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
    const garlandCableGeo = new THREE.BoxGeometry(27.6, 0.08, 0.08);
    const bulbGeo = new THREE.SphereGeometry(0.24, 6, 6);

    for (let z = -30; z >= -7220; z -= garlandStep) {
      const rx = getRoadCenterX(z);
      const ry = getRoadHeightAt(z);
      const yaw = getRoadYawAt(z);
      const garland = new THREE.Group();
      const poleL = new THREE.Mesh(garlandPoleGeo, wireMat);
      poleL.position.set(-13.8, 3.8, 0);
      const poleR = new THREE.Mesh(garlandPoleGeo, wireMat);
      poleR.position.set(13.8, 3.8, 0);
      const cable = new THREE.Mesh(garlandCableGeo, wireMat);
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

    // All 9 Ordered Overhead Highway Gantries (من قصر رأس التين حتى حلقة السمك وميناء الصيادين)
    const anfGantries: [string, string, number, string, string, string][] = [
      ['1. قصر رأس التين', 'نقطة البداية · ساحل الأنفوشي وبحري (٧.٢ كم)', -28, '#0F172A', '#FACC15', '#FFFFFF'],
      ['2. طريق رأس التين البحري', 'مستشفى رأس التين العام · ٩٠٠ م', -840, '#0C4A6E', '#38BDF8', '#FFFFFF'],
      ['3. شاطئ رأس التين', 'الشاطئ البحري المفتوح · ١٨٠٠ م', -1740, '#0369A1', '#FDE047', '#FFFFFF'],
      ['4. شاطئ الأنفوشي', 'شاطئ وكبائن الأنفوشي · ٢٧٠٠ م', -2640, '#0C4A6E', '#38BDF8', '#FDE047'],
      ['5. قلعة قايتباي', 'الحصن المملوكي على البحر · ٣٦٠٠ م', -3520, '#1E293B', '#FACC15', '#FFFFFF'],
      ['6. لسان القلعة', 'نادي اليخت والكشافة البحرية · ٤٥٠٠ م', -4440, '#0F172A', '#38BDF8', '#FFFFFF'],
      ['7. ميدان المساجد (الأنفوشي)', 'المرسي أبو العباس ومساجد الأنفوشي · ٥٤٠٠ م', -5340, '#064E3B', '#FACC15', '#FFFFFF'],
      ['8. السيالة (بحري)', 'حي السيالة العريق والمقاهي البحرية · ٦٣٠٠ م', -6240, '#0F172A', '#FB7185', '#FDE047'],
      ['9. حلقة السمك وميناء الصيادين', 'بحري · خط النهاية ٧٢٠٠ م', -7120, '#0C4A6E', '#FACC15', '#FFFFFF'],
    ];
    for (const [title, sub, gz, bg, border, accent] of anfGantries) {
      const gate = buildOverheadGantry(title, sub, bg, border, accent, maxAnisotropy, isNight, textures);
      gate.position.set(getRoadCenterX(gz), getRoadHeightAt(gz), gz);
      gate.rotation.y = getRoadYawAt(gz);
      group.add(gate);
    }

    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const roofGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.5 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.42, metalness: 0.25 });
    const fortStoneMat = new THREE.MeshStandardMaterial({ color: 0xe2cca8, roughness: 0.85 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0xb7a07d, roughness: 0.9 });
    const hospBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48 });
    const darkWinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.25 });

    // 1. قصر رأس التين الملكي (Start — Left -X at z = -45)
    {
      const cz = -45;
      const palace = new THREE.Group();
      const wing = new THREE.Mesh(new THREE.BoxGeometry(22, 11.5, 36), marbleMat);
      wing.position.y = 5.75;
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(23.5, 1.2, 37.5), roofGoldMat);
      cornice.position.y = 11.9;
      palace.add(wing, cornice);
      for (let wz = -12; wz <= 12; wz += 6) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 10.8, 10), marbleMat);
        col.position.set(11.6, 5.4, wz);
        palace.add(col);
      }
      palace.position.set(getRoadCenterX(cz) - 29, 0, cz);
      palace.rotation.y = getRoadYawAt(cz);
      group.add(palace);
    }

    // 2. مستشفى رأس التين العام (Left -X at z = -900)
    {
      const cz = -900;
      const hospital = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 32), marbleMat);
      body.position.y = 7;
      const blueBand = new THREE.Mesh(new THREE.BoxGeometry(20.6, 1.8, 32.6), hospBlueMat);
      blueBand.position.y = 13.6;
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 1.0), redMat);
      crossV.position.set(10.2, 10.2, 0);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 3.6), redMat);
      crossH.position.set(10.2, 10.2, 0);
      hospital.add(body, blueBand, crossV, crossH);
      for (let wz = -11; wz <= 11; wz += 5.5) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 2.8), hospBlueMat);
        win.position.set(10.1, 5.2, wz);
        hospital.add(win);
      }
      hospital.position.set(getRoadCenterX(cz) - 29, 0, cz);
      hospital.rotation.y = getRoadYawAt(cz);
      group.add(hospital);
    }

    // 3. شاطئ رأس التين (Coastal Beach Umbrellas & Sand Terrace on RIGHT +X at z = -1800)
    {
      const cz = -1800;
      const beach = new THREE.Group();
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xe6cfa2, roughness: 0.92 });
      const terrace = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 44), sandMat);
      terrace.position.set(22, -0.1, 0);
      beach.add(terrace);
      const umbColors = [0x0284c7, 0xfacc15, 0xef4444, 0x10b981, 0xf97316];
      for (let i = 0; i < 6; i++) {
        const uz = -16 + i * 6.5;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), marbleMat);
        pole.position.set(21 + (i % 2) * 3.5, 1.6, uz);
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(2.1, 0.9, 8),
          new THREE.MeshStandardMaterial({ color: umbColors[i % umbColors.length], roughness: 0.55 }),
        );
        cap.position.set(21 + (i % 2) * 3.5, 3.1, uz);
        beach.add(pole, cap);
      }
      beach.position.set(getRoadCenterX(cz), 0, cz);
      beach.rotation.y = getRoadYawAt(cz);
      group.add(beach);
    }

    // 4. شاطئ الأنفوشي (Colorful Seaside Cabins & Beach Promenade on RIGHT +X at z = -2700)
    {
      const cz = -2700;
      const anfBeach = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 52), darkStoneMat);
      deck.position.set(22, 0.1, 0);
      anfBeach.add(deck);
      const cabinCols = [0x0284c7, 0xfacc15, 0xf97316, 0x10b981, 0xe11d48];
      for (let i = 0; i < 5; i++) {
        const czOff = -20 + i * 10;
        const cab = new THREE.Mesh(
          new THREE.BoxGeometry(4.6, 3.2, 6.4),
          new THREE.MeshStandardMaterial({ color: cabinCols[i], roughness: 0.58 }),
        );
        cab.position.set(22.5, 2.2, czOff);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.35, 6.8), marbleMat);
        roof.position.set(22.5, 3.95, czOff);
        anfBeach.add(cab, roof);
      }
      anfBeach.position.set(getRoadCenterX(cz), 0, cz);
      anfBeach.rotation.y = getRoadYawAt(cz);
      group.add(anfBeach);
    }

    // 5. قلعة قايتباي المملوكية (On Sea Headland RIGHT +X at z = -3600)
    {
      const cz = -3600;
      const fort = new THREE.Group();
      const jetty = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 7.5), darkStoneMat);
      jetty.position.set(-11, 0.8, 0);
      const base = new THREE.Mesh(new THREE.BoxGeometry(30, 2.2, 30), darkStoneMat);
      base.position.y = 1.1;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(25, 8.2, 25), fortStoneMat);
      wall.position.y = 6.2;
      const keep = new THREE.Mesh(new THREE.BoxGeometry(12.5, 14.5, 12.5), fortStoneMat);
      keep.position.y = 9.5;
      fort.add(jetty, base, wall, keep);
      for (const [tx, tz] of [
        [-11.8, -11.8],
        [11.8, -11.8],
        [-11.8, 11.8],
        [11.8, 11.8],
      ]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 12.2, 14), fortStoneMat);
        tower.position.set(tx, 7.4, tz);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.8, 14), darkStoneMat);
        cap.position.set(tx, 14.8, tz);
        fort.add(tower, cap);
      }
      // Egyptian flag atop Qaitbay Citadel
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 7.5, 8), roofGoldMat);
      pole.position.set(0, 20.2, 0);
      const fRed = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.12), redMat);
      fRed.position.set(-1.8, 23.2, 0);
      const fWhite = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.12), marbleMat);
      fWhite.position.set(-1.8, 22.5, 0);
      const fBlack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.12), darkWinMat);
      fBlack.position.set(-1.8, 21.8, 0);
      fort.add(pole, fRed, fWhite, fBlack);

      fort.position.set(getRoadCenterX(cz) + 34, 0, cz);
      fort.rotation.y = getRoadYawAt(cz);
      group.add(fort);
    }

    // 6. لسان القلعة · نادي اليخت والكشافة البحرية (Sea Tongue Pier & Yacht Club on RIGHT +X at z = -4500)
    {
      const cz = -4500;
      const yachtClub = new THREE.Group();
      const pier = new THREE.Mesh(new THREE.BoxGeometry(44, 1.5, 16), darkStoneMat);
      pier.position.set(34, 0.4, 0);
      const clubHouse = new THREE.Mesh(new THREE.BoxGeometry(16, 7.2, 22), marbleMat);
      clubHouse.position.set(28, 4.7, 0);
      const navyStripe = new THREE.Mesh(new THREE.BoxGeometry(16.4, 1.1, 22.4), hospBlueMat);
      navyStripe.position.set(28, 8.2, 0);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 12, 8), marbleMat);
      mast.position.set(44, 6.8, 0);
      const pennant = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 0.12), hospBlueMat);
      pennant.position.set(41.9, 11.4, 0);
      yachtClub.add(pier, clubHouse, navyStripe, mast, pennant);
      yachtClub.position.set(getRoadCenterX(cz), 0, cz);
      yachtClub.rotation.y = getRoadYawAt(cz);
      group.add(yachtClub);
    }

    // 7. ميدان المساجد (الأنفوشي) — Andalusian Mosque on LEFT -X at z = -5400
    {
      const cz = -5400;
      const mosque = new THREE.Group();
      const hall = new THREE.Mesh(new THREE.BoxGeometry(20, 10.5, 24), creamMat);
      hall.position.y = 5.25;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(6.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), domeMat);
      dome.position.y = 10.4;
      const sideDome1 = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), domeMat);
      sideDome1.position.set(0, 10.4, -7.8);
      const sideDome2 = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), domeMat);
      sideDome2.position.set(0, 10.4, 7.8);
      const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.6, 26, 10), creamMat);
      minaret.position.set(8.2, 13, -8.5);
      const minCap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.6, 10), domeMat);
      minCap.position.set(8.2, 27.6, -8.5);
      mosque.add(hall, dome, sideDome1, sideDome2, minaret, minCap);
      mosque.position.set(getRoadCenterX(cz) - 29, 0, cz);
      mosque.rotation.y = getRoadYawAt(cz);
      group.add(mosque);
    }

    // 8. السيالة (بحري) — Historic Bahary Waterfront Cafés & Colorful Arcade on LEFT -X at z = -6300
    {
      const cz = -6300;
      const sayala = new THREE.Group();
      const arcade = new THREE.Mesh(new THREE.BoxGeometry(16, 10, 34), creamMat);
      arcade.position.y = 5;
      sayala.add(arcade);
      const awningCols = [0xdc2626, 0x0284c7, 0xd97706, 0x059669];
      for (let i = 0; i < 4; i++) {
        const az = -12 + i * 8;
        const awn = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.55, 6.6),
          new THREE.MeshStandardMaterial({ color: awningCols[i], roughness: 0.5 }),
        );
        awn.position.set(9.2, 3.6, az);
        sayala.add(awn);
      }
      sayala.position.set(getRoadCenterX(cz) - 28, 0, cz);
      sayala.rotation.y = getRoadYawAt(cz);
      group.add(sayala);
    }

    // 9. حلقة السمك وميناء الصيادين (بحري) + فنار بحري التاريخي (Finish at z = -7200)
    {
      const cz = -7200;
      const halqaHall = new THREE.Group();
      const marketBody = new THREE.Mesh(new THREE.BoxGeometry(20, 8.5, 32), creamMat);
      marketBody.position.y = 4.25;
      const marketRoof = new THREE.Mesh(new THREE.BoxGeometry(21.4, 1.4, 33.4), hospBlueMat);
      marketRoof.position.y = 9.0;
      const marketTrim = new THREE.Mesh(new THREE.BoxGeometry(21.6, 0.45, 33.6), roofGoldMat);
      marketTrim.position.y = 9.85;
      halqaHall.add(marketBody, marketRoof, marketTrim);
      halqaHall.position.set(getRoadCenterX(cz) - 29, 0, cz);
      halqaHall.rotation.y = getRoadYawAt(cz);
      group.add(halqaHall);
    }

    // Historic Coastal Lighthouse (فنار بحري وميناء الصيادين) at z = -7200 with rotating warm beacon!
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
    lighthouse.position.set(getRoadCenterX(-7200) + 28, 0, -7200);
    group.add(lighthouse);

    // Lively Dense Fleet of Colorful Anfoushi & Bahary Fishing Boats bobbing along the entire 7.2km blue harbor!
    const anfBoats: Array<{ mesh: THREE.Group; baseY: number; phase: number }> = [];
    const palette = [0x1d4ed8, 0x059669, 0xdc2626, 0xd97706, 0x2563eb, 0xffffff];
    const boatStep = isMobile ? 225 : 145;
    let boatIdx = 0;
    for (let bz = -140; bz >= -7160; bz -= boatStep) {
      // Avoid clipping directly into Qaitbay Citadel (-3600) or Yacht Club Pier (-4500)
      if (Math.abs(bz - -3600) < 42 || Math.abs(bz - -4500) < 30) continue;
      const boat = buildFishingBoat(palette[boatIdx % palette.length], boatIdx % 2 === 0 ? 0xffffff : 0xfef08a);
      boat.position.set(getRoadCenterX(bz) + 26 + (boatIdx % 4) * 12, -0.68, bz);
      boat.rotation.y = (boatIdx % 5) * 0.45 - 0.8;
      group.add(boat);
      anfBoats.push({ mesh: boat, baseY: -0.68, phase: boatIdx * 0.85 });
      boatIdx += 1;
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
    const sgGround = new THREE.Mesh(new THREE.PlaneGeometry(1100, 9600), sgGroundMat);
    sgGround.rotation.x = -Math.PI / 2;
    sgGround.position.set(12, -0.09, -4250);
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
      -8620,
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
      -8620,
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
    for (let z = 60; z >= -8520; z -= 14) {
      // Leave generous open ramp openings every ~140m & near intersections/station so players merge freely!
      const mod = Math.abs(z) % 140;
      if (mod < 48) continue;
      if (Math.abs(z + 180) < 68 || Math.abs(z + 1400) < 35 || Math.abs(z + 4900) < 35 || Math.abs(z + 7000) < 35) continue;
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
    for (let z = 60; z >= -8520; z -= isMobile ? 34 : 24) {
      if (Math.abs(z + 180) < 68) continue;
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

    // 3. Intersecting Cross Side Streets ("شوارع جانبية متفرعة يمين وشمال") cutting between city blocks across 8.4 km!
    const crossStreetZs = [
      -460, -960, -1680, -2420, -3100, -3780, -4500, -5220, -5920, -6620, -7320, -8020,
    ];
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

    // 4. Overhead Highway Gantries matching ALL 13 Ordered Areas (Sidi Gaber -> Abu Qir Street -> El-Mandara, 8.4 km)!
    const sgGantries = [
      {
        z: -55,
        title: '1. سيدي جابر · بداية شارع أبو قير',
        sub: 'محطة قطار سيدي جابر على يمينك 🚉 · الطريق ٨.٤ كم حتى المندرة',
        bg: '#065F46',
        border: '#FACC15',
        text: '#FFFFFF',
      },
      {
        z: -700,
        title: '2. مصطفى كامل · شارع أبو قير',
        sub: 'طريق الحرية · الشارع الجانبي الهادئ على يمينك ↗',
        bg: '#0C4A6E',
        border: '#38BDF8',
        text: '#FEF08A',
      },
      {
        z: -1340,
        title: '3. رشدي · طريق الحرية',
        sub: 'قلب رشدي · محلات وكافيهات وإشارة مرور رئيسية',
        bg: '#0C4A6E',
        border: '#FACC15',
        text: '#FFFFFF',
      },
      {
        z: -2100,
        title: '4. كفر عبده والوزارة (بولكلي)',
        sub: 'مدخل كفر عبده وبولكلي · شارع أبو قير',
        bg: '#1E3A8A',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -2800,
        title: '5. فلمنج · شارع أبو قير',
        sub: 'حي فلمنج العريق · كمل طوالي نحو جناكليس ولوران',
        bg: '#1E3A8A',
        border: '#38BDF8',
        text: '#FFFFFF',
      },
      {
        z: -3500,
        title: '6. جناكليس · طريق الحرية',
        sub: 'منطقة جناكليس · بيوت وقهاوي ومحلات الإسكندرية',
        bg: '#065F46',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -4200,
        title: '7. شوتس وسان ستيفانو',
        sub: 'امتداد شارع أبو قير · مطلع سان ستيفانو ولوران',
        bg: '#0C4A6E',
        border: '#38BDF8',
        text: '#FFFFFF',
      },
      {
        z: -4840,
        title: '8. لوران · تقاطع شعراوي',
        sub: 'قلب لوران · إشارة المرور الرئيسية ← فيكتوريا',
        bg: '#7C2D12',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -5600,
        title: '9. فيكتوريا · ميدان فيكتوريا',
        sub: 'نهاية طريق الحرية وبداية شارع جمال عبد الناصر ← المندرة',
        bg: '#7C2D12',
        border: '#38BDF8',
        text: '#FFFFFF',
      },
      {
        z: -6300,
        title: '10. محمد نجيب · شارع جمال عبد الناصر',
        sub: 'تقاطع محمد نجيب التجاري · استمر طوالي نحو سيدي بشر',
        bg: '#1E3A8A',
        border: '#FACC15',
        text: '#FEF08A',
      },
      {
        z: -6940,
        title: '11. سيدي بشر · شارع جمال عبد الناصر',
        sub: 'قلب سيدي بشر وإشارة المرور الرئيسية ← ميامي والعصافرة',
        bg: '#0C4A6E',
        border: '#FACC15',
        text: '#FFFFFF',
      },
      {
        z: -7700,
        title: '12. ميامي والعصافرة · جمال عبد الناصر',
        sub: 'باقي ٧٠٠ متر على بوابة المندرة · خط النهاية',
        bg: '#065F46',
        border: '#4ADE80',
        text: '#FEF08A',
      },
      {
        z: -8370,
        title: '13. المندرة · نهاية شارع أبو قير',
        sub: 'وصلت المندرة بالسلامة · نهاية الطريق (٨.٤ كم)',
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

    buildFullStreetSignalBridge(-1400, 'إشارة مرور رشدي · شارع أبو قير', 'تقاطع رشدي وكفر عبده — كمل طوالي نحو بولكلي وفلمنج');
    buildFullStreetSignalBridge(-4900, 'إشارة مرور لوران · شارع شعراوي', 'تقاطع لوران الرئيسي — استعد لميدان فيكتوريا');
    buildFullStreetSignalBridge(-7000, 'إشارة مرور سيدي بشر · جمال عبد الناصر', 'تقاطع سيدي بشر — كمل طوالي نحو ميامي والعصافرة والمندرة');

    // 6. MONUMENTAL LANDMARK (z = -180, ON THE RIGHT +X): محطة قطار سيدي جابر (Sidi Gaber Train Station at Route Start!)
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

    stationGroup.position.set(getRoadCenterX(-180), 0, -180);
    stationGroup.rotation.y = getRoadYawAt(-180);
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
    const bldgStep = isMobile ? 34 : 26;

    for (let z = 65; z >= -8550; z -= bldgStep) {
      // Leave clean open space for Sidi Gaber Train Station on the right
      const nearStation = Math.abs(z + 180) < 68;
      // Leave clean open cross side streets
      const nearCross = crossStreetZs.some((cz) => Math.abs(z - cz) < 15);
      // Leave clean space for right-side gas stations
      const nearRightGas =
        Math.abs(z + 240) < 28 ||
        Math.abs(z + 1360) < 28 ||
        Math.abs(z + 2640) < 28 ||
        Math.abs(z + 3920) < 28 ||
        Math.abs(z + 5360) < 28 ||
        Math.abs(z + 6680) < 28 ||
        Math.abs(z + 8040) < 28;

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
      -340, -610, -840, -1160, -1540, -1940, -2280, -2640, -2960, -3340, -3660, -4020,
      -4360, -4720, -5080, -5440, -5780, -6140, -6480, -6840, -7180, -7540, -7880, -8220,
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
