import * as THREE from 'three';
import { AlexDistrictId, RaceTrackId } from './types';

export const STANLEY_BRIDGE_Z = -4400;
export const STANLEY_HALF_LEN = 90;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Smooth urban avenue curves along Sidi Gaber -> Abu Qir Street (El-Horreya Road) -> El-Mandara (8,400m):
 * Straight launch past Sidi Gaber Train Station (0..320m), then realistic urban bends through
 * Mostafa Kamel, Roushdy, Bolkly, Fleming, Gianaclis, Louran, Victoria, Sidi Bishr & Miami into El-Mandara (8,400m).
 */
function getSidiGaberRoadCenterX(z: number): number {
  const dist = Math.max(0, -z);
  let x = 0;
  x += 28 * smoothstep(320, 620, dist);     // الخروج من سيدي جابر نحو مصطفى كامل
  x += 24 * smoothstep(1180, 1520, dist);   // انحناءة رشدي وكفر عبده
  x -= 36 * smoothstep(2180, 2560, dist);   // انحناءة بولكلي وفلمنج
  x -= 28 * smoothstep(3400, 3780, dist);   // انحناءة جناكليس وشوتس
  x += 34 * smoothstep(4680, 5080, dist);   // دخول لوران وفيكتوريا
  x -= 26 * smoothstep(5960, 6380, dist);   // محور محمد نجيب ← سيدي بشر
  x += 22 * smoothstep(7120, 7560, dist);   // استقامة ميامي والعصافرة نحو المندرة
  return x;
}

function getGrandAlexandriaRoadCenterX(z: number): number {
  const dist = Math.max(0, -z);
  let x = 0;
  // Sector 1: Corniche gentle coastal wave (0..1200)
  const s1Env = smoothstep(80, 240, dist) * (1 - smoothstep(1040, 1200, dist));
  x += Math.sin((dist - 80) * 0.0055) * 18 * s1Env;
  // Sector 3: Sidi Gaber signature city turns (2400..3650)
  x += 34 * smoothstep(2480, 2660, dist);  // ملف سيدي جابر يمين
  x -= 42 * smoothstep(2820, 3000, dist);  // ملف سيدي جابر شمال
  x += 28 * smoothstep(3040, 3160, dist);  // ملف يمين ← محطة قطار سيدي جابر
  // Sector 4: Ras El-Soda -> Victoria sweeping curve (3650..4850)
  x -= 24 * smoothstep(3760, 4000, dist);
  x += 24 * smoothstep(4360, 4660, dist);
  // Sector 5: Anfoushi coastal harbor sweep (4850..6050)
  const s5Env = smoothstep(4920, 5120, dist) * (1 - smoothstep(5820, 6020, dist));
  x += Math.sin((dist - 4920) * 0.006) * 20 * s5Env;
  return x;
}

/**
 * Scenic coastal Corniche curves ("ملفات") starting from Montaza Palace (z = 0) through Stanley Bridge (z = -4400)
 * all the way to Bahary, Anfoushi & Qaitbay Citadel (z = -10000), plus specialized curve profiles per Race Track & District.
 */
export function getRoadCenterX(
  z: number,
  trackId?: RaceTrackId,
  districtId?: AlexDistrictId,
): number {
  if (!trackId && districtId === 'sidi_gaber_abuqir') {
    return getSidiGaberRoadCenterX(z);
  }
  if (!trackId && districtId === 'grand_alexandria') {
    return getGrandAlexandriaRoadCenterX(z);
  }

  if (z >= -80) return 0;
  const dist = -z; // positive meters moving forward from start
  if (!trackId && (districtId === 'anfoushi' || districtId === 'ras_el_soda_victoria' || districtId === 'abu_qir')) {
    const longEnv = smoothstep(80, 260, dist) * (1 - smoothstep(6900, 7120, dist));
    if (longEnv <= 0.0001) return 0;
    const w1 = Math.sin((dist - 100) * 0.0038) * (districtId === 'anfoushi' ? 24 : 18);
    const w2 = Math.sin((dist - 400) * 0.0019) * (districtId === 'anfoushi' ? 14 : 11);
    return (w1 + w2) * longEnv;
  }
  const isLongCorniche = !trackId && (!districtId || districtId === 'corniche');
  const env1 = isLongCorniche
    ? smoothstep(80, 260, dist) * (1 - smoothstep(4120, 4270, dist))
    : smoothstep(80, 260, dist) * (1 - smoothstep(900, 1070, dist));
  const env2 = isLongCorniche
    ? smoothstep(4530, 4720, dist) * (1 - smoothstep(9740, 9920, dist))
    : smoothstep(1330, 1540, dist) * (1 - smoothstep(3240, 3440, dist));
  const env = env1 + env2;

  if (trackId === 'corniche_express') {
    if (env <= 0.0001) return 0;
    const wave1 = Math.sin((dist - 80) * 0.0022) * 12;
    return wave1 * env;
  }

  if (trackId === 'montaza_45') {
    const startEnv = smoothstep(80, 170, dist);
    const wave1 = Math.sin((dist - 80) * 0.0095) * 32;
    const wave2 = Math.sin((dist - 160) * 0.0048) * 14;
    return (wave1 + wave2) * startEnv;
  }

  if (trackId === 'sidi_gaber') {
    const startEnv = smoothstep(80, 160, dist);
    return (Math.sin((dist - 80) * 0.0062) * 28 + Math.cos((dist - 80) * 0.0031) * 10 - 10) * startEnv;
  }

  if (trackId === 'smouha_suez') {
    const startEnv = smoothstep(80, 170, dist);
    const chicane = Math.sin((dist - 80) * 0.0074) * 24 + Math.sin((dist - 80) * 0.0148) * 12;
    return chicane * startEnv;
  }

  if (env <= 0.0001) return 0;
  const wave1 = Math.sin((dist - 100) * 0.0046) * 26;
  const wave2 = Math.sin((dist - 400) * 0.0024) * 15;
  return (wave1 + wave2) * env;
}

/**
 * Heading rotation around Y (radians) for vehicles & roadside structures facing forward (-Z)
 * along the curved road spline.
 */
export function getRoadYawAt(
  z: number,
  trackId?: RaceTrackId,
  districtId?: AlexDistrictId,
): number {
  const eps = 1.5;
  const xPrev = getRoadCenterX(z + eps, trackId, districtId);
  const xNext = getRoadCenterX(z - eps, trackId, districtId);
  const dx = xNext - xPrev;
  // Local -Z rotated around +Y by theta goes toward (-sin(theta), 0, -cos(theta))
  return -Math.atan2(dx, eps * 2);
}

/**
 * Returns the road surface elevation at a given Z coordinate.
 * Inland city districts are flat; Corniche rises over Stanley Bridge (z = -1200).
 */
export function getRoadHeightAt(
  z: number,
  trackId?: RaceTrackId,
  districtId?: AlexDistrictId,
): number {
  if (trackId === 'montaza_45' || trackId === 'sidi_gaber' || trackId === 'smouha_suez') {
    // Smooth flyover bridge crest mid-lap on urban circuit tracks
    const dist = Math.abs(z - -950);
    if (dist < 70) {
      const t = 1 - dist / 70;
      return 3.8 * Math.sin((t * Math.PI) / 2) ** 2;
    }
    return 0;
  }
  if (districtId === 'grand_alexandria') {
    // Gentle Stanley Bridge crest inside Sector 1 (z = -840)
    const dStan = Math.abs(z - -840);
    if (dStan < 75) {
      const t = 1 - dStan / 75;
      return 4.4 * Math.sin((t * Math.PI) / 2) ** 2;
    }
    return 0;
  }
  if (districtId && districtId !== 'corniche') {
    return 0;
  }
  const dist = Math.abs(z - STANLEY_BRIDGE_Z);
  if (dist >= STANLEY_HALF_LEN) return 0;
  const t = 1 - dist / STANLEY_HALF_LEN;
  return 6.2 * Math.sin((t * Math.PI) / 2) ** 2;
}

/**
 * Computes road slope pitch angle (radians) so vehicles tilt naturally on bridges.
 */
export function getRoadPitchAt(
  z: number,
  trackId?: RaceTrackId,
  districtId?: AlexDistrictId,
): number {
  const hAhead = getRoadHeightAt(z - 1.5, trackId, districtId);
  const hBehind = getRoadHeightAt(z + 1.5, trackId, districtId);
  return Math.atan2(hAhead - hBehind, 3.0);
}

/**
 * Builds a continuous curved 3D ribbon strip following getRoadCenterX(z, trackId, districtId) and height function.
 */
export function createCurvedRibbonGeometry(
  offsetLeft: number,
  offsetRight: number,
  zStart: number,
  zEnd: number,
  stepZ: number,
  getY: (z: number, isLeft: boolean) => number,
  uTile = 1,
  vPerMeter = 0.05,
  trackId?: RaceTrackId,
  districtId?: AlexDistrictId,
): THREE.BufferGeometry {
  const zs: number[] = [];
  for (let z = zStart; z > zEnd; z -= stepZ) {
    zs.push(z);
  }
  zs.push(zEnd);

  const vertCount = zs.length * 2;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices: number[] = [];

  for (let i = 0; i < zs.length; i++) {
    const z = zs[i];
    const cx = getRoadCenterX(z, trackId, districtId);
    const v = Math.abs(z - zStart) * vPerMeter;

    const li = i * 2;
    positions[li * 3] = cx + offsetLeft;
    positions[li * 3 + 1] = getY(z, true);
    positions[li * 3 + 2] = z;
    uvs[li * 2] = 0;
    uvs[li * 2 + 1] = v;

    const ri = i * 2 + 1;
    positions[ri * 3] = cx + offsetRight;
    positions[ri * 3 + 1] = getY(z, false);
    positions[ri * 3 + 2] = z;
    uvs[ri * 2] = uTile;
    uvs[ri * 2 + 1] = v;

    if (i < zs.length - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
