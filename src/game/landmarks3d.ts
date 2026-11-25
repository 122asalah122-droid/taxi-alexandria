import * as THREE from 'three';
import {
  getRoadCenterX,
  getRoadHeightAt,
  getRoadYawAt,
  STANLEY_BRIDGE_Z,
  STANLEY_HALF_LEN,
} from './terrain';
import {
  createBibliothecaGraniteTexture,
  createBlueHighwaySignTexture,
  createGlassCurtainWallTexture,
  createMosqueDomeTexture,
  createMosqueOrnamentTexture,
  createRoadTexture,
  createSignTexture,
  createStoneMasonryTexture,
  createWoodPlankTexture,
} from './textures3d';
import { RealisticTreeBundle } from './trees3d';

function addLandmarkSignboard(
  parent: THREE.Group,
  title: string,
  subtitle: string,
  accentHex: string,
  x: number,
  y: number,
  z: number,
  maxAnisotropy: number,
  isNight = false,
) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.28 });
  const signTex = createSignTexture(title, subtitle, accentHex, maxAnisotropy);
  const boardMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: isNight ? 0.82 : 0.12,
    roughness: 0.35,
  });

  const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, y, 8), poleMat);
  poleL.position.set(x - 2.4, y / 2, z);
  const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, y, 8), poleMat);
  poleR.position.set(x + 2.4, y / 2, z);

  const board = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.7, 0.28), boardMat);
  board.position.set(x, y, z);

  parent.add(poleL, poleR, board);
}

function addBlueHighwayGantry(
  parent: THREE.Group,
  districtName: string,
  subLabel: string,
  z: number,
  maxAnisotropy: number,
  baseY = 0,
  isNight = false,
) {
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.28 });
  const signTex = createBlueHighwaySignTexture(districtName, subLabel, maxAnisotropy);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissiveMap: signTex,
    emissive: new THREE.Color(0xe0f2fe),
    emissiveIntensity: isNight ? 0.92 : 0.14,
    roughness: 0.32,
  });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

  const gantry = new THREE.Group();
  gantry.position.set(getRoadCenterX(z), baseY, z);
  gantry.rotation.y = getRoadYawAt(z);

  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 8.2, 10), steelMat);
  postL.position.set(-10.2, 4.1, 0);
  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 8.2, 10), steelMat);
  postR.position.set(10.2, 4.1, 0);

  const beam = new THREE.Mesh(new THREE.BoxGeometry(20.9, 0.45, 0.45), steelMat);
  beam.position.set(0, 7.8, 0);

  const signBox = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 3.3, 0.28),
    [backMat, backMat, backMat, backMat, signMat, backMat],
  );
  signBox.position.set(0, 7.6, 0.25);

  gantry.add(postL, postR, beam, signBox);
  parent.add(gantry);
}

function createRealisticFishingBoat(
  hullColor: number,
  stripeColor: number,
  creamMat: THREE.Material,
  woodDeckMat: THREE.Material,
  woodMat: THREE.Material,
  glassMat: THREE.Material,
  ropeMat: THREE.Material,
  lifebuoyMat: THREE.Material,
  goldMat: THREE.Material,
): THREE.Group {
  const boat = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.56 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.5 });

  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.95, 7.2), hullMat);
  lowerHull.position.y = 0.22;
  lowerHull.castShadow = true;

  const sheerBand = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.28, 7.3), stripeMat);
  sheerBand.position.y = 0.72;

  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.42, 2.7, 4), hullMat);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.z = Math.PI / 4;
  bow.position.set(0, 0.36, -4.85);

  const bowStem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 0.38), creamMat);
  bowStem.position.set(0, 0.72, -5.95);
  bowStem.rotation.x = 0.35;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 6.9), woodDeckMat);
  deck.position.y = 0.85;

  for (const sx of [-1.2, 1.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 6.8), creamMat);
    rail.position.set(sx, 1.06, 0);
    boat.add(rail);
  }
  const sternRail = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.45, 0.12), creamMat);
  sternRail.position.set(0, 1.08, 3.45);
  boat.add(sternRail);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.48, 2.45), creamMat);
  cabin.position.set(0, 1.56, 0.75);
  cabin.castShadow = true;

  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.14, 2.75), stripeMat);
  cabinRoof.position.set(0, 2.34, 0.75);

  const frontWin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.56, 0.08), glassMat);
  frontWin.position.set(0, 1.78, -0.49);
  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.52, 1.65), glassMat);
  sideWin.position.set(0, 1.78, 0.75);

  const searchLamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), goldMat);
  searchLamp.position.set(0, 2.52, -0.2);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8), woodMat);
  mast.position.set(0, 3.3, -1.65);

  const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 6), woodMat);
  yardarm.rotation.z = Math.PI / 2;
  yardarm.position.set(0, 4.75, -1.65);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 3.4, 6), woodMat);
  boom.rotation.x = Math.PI / 2.2;
  boom.position.set(0, 2.4, -0.25);

  for (const sx of [-1.05, 1.05]) {
    const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 4.7, 5), ropeMat);
    stay.position.set(sx * 0.52, 3.15, -1.65);
    stay.rotation.z = sx * 0.22;
    boat.add(stay);
  }

  const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 12), lifebuoyMat);
  buoy.rotation.y = Math.PI / 2;
  buoy.position.set(0.92, 1.5, 0.8);

  const netCrate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.45, 1.15), woodMat);
  netCrate.position.set(0, 1.1, 2.55);

  for (const sx of [-1.28, 1.28]) {
    for (const tz of [-1.8, 0, 1.8]) {
      const fender = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 10), ropeMat);
      fender.rotation.y = Math.PI / 2;
      fender.position.set(sx, 0.55, tz);
      boat.add(fender);
    }
  }

  boat.add(
    lowerHull,
    sheerBand,
    bow,
    bowStem,
    deck,
    cabin,
    cabinRoof,
    frontWin,
    sideWin,
    searchLamp,
    mast,
    yardarm,
    boom,
    buoy,
    netCrate,
  );
  return boat;
}

function createMediterraneanSailboat(
  hullColor: number,
  stripeColor: number,
  sailMat: THREE.Material,
  woodMat: THREE.Material,
  woodDeckMat: THREE.Material,
): THREE.Group {
  const sail = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.42 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.45 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 7.6), hullMat);
  hull.position.y = 0.25;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 7.7), stripeMat);
  stripe.position.y = 0.62;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.32, 3.0, 4), hullMat);
  bow.rotation.x = -Math.PI / 2;
  bow.rotation.z = Math.PI / 4;
  bow.position.set(0, 0.34, -5.2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 7.2), woodDeckMat);
  deck.position.y = 0.72;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.68, 2.8), hullMat);
  cabin.position.set(0, 1.08, 0.4);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 8.8, 8), woodMat);
  mast.position.set(0, 5.1, -0.5);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 4.2, 6), woodMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 1.95, 1.6);

  // Tall crisp white main sail & forward jib sail (clearly visible along the Corniche horizon)
  const mainSailShape = new THREE.Shape();
  mainSailShape.moveTo(0, 0);
  mainSailShape.lineTo(3.9, 0.25);
  mainSailShape.lineTo(0, 7.2);
  mainSailShape.closePath();
  const mainSailGeo = new THREE.ShapeGeometry(mainSailShape);
  mainSailGeo.rotateY(Math.PI / 2);
  const mainSail = new THREE.Mesh(mainSailGeo, sailMat);
  mainSail.position.set(0.04, 2.0, -0.4);

  const jibShape = new THREE.Shape();
  jibShape.moveTo(0, 0);
  jibShape.lineTo(-3.1, 0.15);
  jibShape.lineTo(0, 6.1);
  jibShape.closePath();
  const jibGeo = new THREE.ShapeGeometry(jibShape);
  jibGeo.rotateY(Math.PI / 2);
  const jibSail = new THREE.Mesh(jibGeo, sailMat);
  jibSail.position.set(-0.04, 1.85, -0.65);

  sail.add(hull, stripe, bow, deck, cabin, mast, boom, mainSail, jibSail);
  return sail;
}

export interface LandmarksBuildResult {
  group: THREE.Group;
  animatedBoats: { mesh: THREE.Group; baseY: number; phase: number }[];
}

/**
 * Builds high-detail colorful Alexandria landmarks from Bahary (Qaitbay Citadel)
 * through Stanley Bridge (z = -2300) all the way to El Mandara (z = -3500).
 * Includes richly colored mosques (Abu El-Abbas El-Mursi, Al-Qaed Ibrahim, Sidi Bishr),
 * vibrantly colored Stanley Bridge, Bibliotheca Alexandrina on the right (+X),
 * and realistic palm & leafy garden trees.
 */
export function buildAllAlexandriaLandmarks(
  maxAnisotropy: number,
  treeBundle: RealisticTreeBundle,
  atmosphere: 'day' | 'sunset' | 'night' = 'day',
  isMobile = false,
): LandmarksBuildResult {
  const worldGroup = new THREE.Group();
  const animatedBoats: { mesh: THREE.Group; baseY: number; phase: number }[] = [];
  const isNight = atmosphere === 'night';
  const warmFloodEmissive = isNight ? 0x4b3518 : 0x000000;
  const coolFloodEmissive = isNight ? 0x14334d : 0x000000;

  const mamlukLimestoneTex = createStoneMasonryTexture('#E4D2B2', '#B5A17D', maxAnisotropy);
  const fortStoneMat = new THREE.MeshStandardMaterial({
    map: mamlukLimestoneTex,
    roughness: 0.86,
    emissive: warmFloodEmissive,
    emissiveIntensity: isNight ? 0.56 : 0,
  });
  const stanleyMasonryTex = createStoneMasonryTexture('#ECC587', '#9F6636', maxAnisotropy);
  const stanleyStoneMat = new THREE.MeshStandardMaterial({
    map: stanleyMasonryTex,
    roughness: 0.72,
    emissive: warmFloodEmissive,
    emissiveIntensity: isNight ? 0.62 : 0,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0xb7a07d,
    roughness: 0.9,
    emissive: isNight ? 0x2c2114 : 0x000000,
    emissiveIntensity: isNight ? 0.36 : 0,
  });
  const whiteMosqueMat = new THREE.MeshStandardMaterial({
    color: 0xf7f2e8,
    roughness: 0.65,
    emissive: isNight ? 0x4f3e24 : 0x000000,
    emissiveIntensity: isNight ? 0.58 : 0,
  });
  const creamMat = new THREE.MeshStandardMaterial({
    color: 0xf3e9d2,
    roughness: 0.72,
    emissive: warmFloodEmissive,
    emissiveIntensity: isNight ? 0.52 : 0,
  });
  const royalRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.52,
    emissive: isNight ? 0x451212 : 0x000000,
    emissiveIntensity: isNight ? 0.45 : 0,
  });
  const turquoiseMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    roughness: 0.42,
    emissive: isNight ? 0x0d5c57 : 0x000000,
    emissiveIntensity: isNight ? 0.58 : 0,
  });
  const cobaltTileMat = new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.42,
    emissive: coolFloodEmissive,
    emissiveIntensity: isNight ? 0.62 : 0,
  });
  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.44,
    emissive: isNight ? 0x064e3b : 0x000000,
    emissiveIntensity: isNight ? 0.55 : 0,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.85,
    emissive: isNight ? 0xb45309 : 0x000000,
    emissiveIntensity: isNight ? 0.65 : 0,
  });
  const amberGlowWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: isNight ? 2.1 : 0.75,
    roughness: 0.22,
  });
  const stainedTurqWinMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x14b8a6,
    emissiveIntensity: isNight ? 1.65 : 0.6,
    roughness: 0.22,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const woodDeckTex = createWoodPlankTexture('#8C5A32', maxAnisotropy);
  const woodDeckMat = new THREE.MeshStandardMaterial({ map: woodDeckTex, roughness: 0.82 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
  const lifebuoyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
  const windowDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.18, metalness: 0.32 });

  const bibGraniteTex = createBibliothecaGraniteTexture(maxAnisotropy);
  const bibGraniteMat = new THREE.MeshStandardMaterial({
    map: bibGraniteTex,
    roughness: 0.62,
    metalness: 0.16,
    emissive: isNight ? 0x2b3648 : 0x000000,
    emissiveIntensity: isNight ? 0.52 : 0,
  });

  const glassCurtainTex = createGlassCurtainWallTexture(maxAnisotropy);
  const glassCurtainMat = isMobile
    ? new THREE.MeshStandardMaterial({
        map: glassCurtainTex,
        roughness: 0.18,
        metalness: 0.5,
        emissive: isNight ? 0x1d4ed8 : 0x000000,
        emissiveIntensity: isNight ? 0.52 : 0,
      })
    : new THREE.MeshPhysicalMaterial({
        map: glassCurtainTex,
        roughness: 0.12,
        metalness: 0.55,
        clearcoat: 0.9,
        emissive: isNight ? 0x1d4ed8 : 0x000000,
        emissiveIntensity: isNight ? 0.52 : 0,
      });

  // ============================================================================
  // BLUE HIGHWAY DISTRICT SIGNS (المندرة ← العصافرة ← سيدي بشر ← ستانلي ← بحري)
  // ============================================================================
  addBlueHighwayGantry(worldGroup, 'المندرة · قصر المنتزه', 'بوابة وقصر المنتزه · نقطة البداية', -28, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'العصافرة', 'كورنيش العصافرة · البحر على اليمين', -290, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'سيدي بشر وميامي', 'مسجد سيدي بشر · البحر على اليمين', -540, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'كوبري ستانلي', 'خليج ستانلي الملكي', -1095, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'الشاطبي', 'مكتبة الإسكندرية على الشمال', -1720, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'محطة الرمل', 'مسجد القائد إبراهيم ووسط البلد', -2270, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'المنشية', 'ميدان الجندي المجهول', -2690, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'المرسي أبو العباس', 'ميدان المساجد · بحري', -3100, maxAnisotropy, 0, isNight);
  addBlueHighwayGantry(worldGroup, 'بحري · قلعة قايتباي', 'الميناء الشرقي · خط النهاية', -3430, maxAnisotropy, 0, isNight);

  // ============================================================================
  // 8. قلعة قايتباي الحجرية + مراكب صيد واقعية في البحر (بحري · خط النهاية z = -3500)
  // ============================================================================
  {
    const cz = -3500;
    const cx = getRoadCenterX(cz);
    const g = new THREE.Group();
    // Qaitbay Citadel stands out in the Mediterranean Sea on the RIGHT (+X) peninsula at Bahary
    g.position.set(cx + 35, 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    const jetty = new THREE.Mesh(new THREE.BoxGeometry(24, 1.8, 7.5), darkStoneMat);
    jetty.position.set(-12, 0.9, 0);
    g.add(jetty);

    const base = new THREE.Mesh(new THREE.BoxGeometry(33, 2.5, 33), darkStoneMat);
    base.position.y = 1.25;
    g.add(base);

    const wall = new THREE.Mesh(new THREE.BoxGeometry(27, 8.6, 27), fortStoneMat);
    wall.position.y = 6.4;
    wall.castShadow = true;
    g.add(wall);

    for (let m = -11.5; m <= 11.5; m += 3.2) {
      for (const sideZ of [-13.1, 13.1]) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.9), fortStoneMat);
        merlon.position.set(m, 11.3, sideZ);
        g.add(merlon);
      }
      for (const sideX of [-13.1, 13.1]) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 1.4), fortStoneMat);
        merlon.position.set(sideX, 11.3, m);
        g.add(merlon);
      }
    }

    const keep = new THREE.Mesh(new THREE.BoxGeometry(13.5, 15.2, 13.5), fortStoneMat);
    keep.position.y = 9.9;
    keep.castShadow = true;
    const portal = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.4, 3.2), windowDarkMat);
    portal.position.set(-13.6, 4.4, 0);
    g.add(keep, portal);

    const upperTurret = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 5.6, 12), fortStoneMat);
    upperTurret.position.set(-3.5, 19.6, -3.5);
    const turretCap = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.0, 12), darkStoneMat);
    turretCap.position.set(-3.5, 23.8, -3.5);
    g.add(upperTurret, turretCap);

    for (const [tx, tz] of [
      [-12.8, -12.8],
      [12.8, -12.8],
      [-12.8, 12.8],
      [12.8, 12.8],
    ]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 13.0, 16), fortStoneMat);
      tower.position.set(tx, 7.8, tz);
      tower.castShadow = true;
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 5.8), windowDarkMat);
      slit.position.set(tx, 10.2, tz);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.0, 3.2, 16), darkStoneMat);
      cap.position.set(tx, 15.8, tz);
      g.add(tower, slit, cap);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 7.8, 8), goldMat);
    pole.position.set(0, 21.0, 0);
    const flagRed = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.72, 0.12), royalRedMat);
    flagRed.position.set(-1.9, 24.1, 0);
    const flagWhite = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.72, 0.12), whiteMosqueMat);
    flagWhite.position.set(-1.9, 23.38, 0);
    const flagBlack = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.72, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a }),
    );
    flagBlack.position.set(-1.9, 22.66, 0);
    g.add(pole, flagRed, flagWhite, flagBlack);

    addLandmarkSignboard(g, 'قلعة قايتباي', 'بحري · خط النهاية ٣٥٠٠ م', '#FACC15', -19.5, 5.2, 16, maxAnisotropy);
    worldGroup.add(g);

    // Rich Fleet of Alexandrian Fishing Boats & White Mediterranean Sailboats bobbing across the blue sea!
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      side: THREE.DoubleSide,
      emissive: isNight ? 0x334155 : 0x000000,
      emissiveIntensity: isNight ? 0.35 : 0,
    });
    const allBoatSpecs: { ox: number; z: number; rot: number; hull: number; stripe: number; type: 'fishing' | 'sail' }[] = [
      { ox: 25, z: -90, rot: -0.24, hull: 0x1d4ed8, stripe: 0xfacc15, type: 'fishing' },
      { ox: 44, z: -125, rot: 0.32, hull: 0xffffff, stripe: 0x1d4ed8, type: 'sail' },
      { ox: 30, z: -165, rot: 0.22, hull: 0xdc2626, stripe: 0xffffff, type: 'fishing' },
      { ox: 62, z: -205, rot: -0.35, hull: 0xffffff, stripe: 0xdc2626, type: 'sail' },
      { ox: 28, z: -255, rot: -0.18, hull: 0x059669, stripe: 0xfef3c7, type: 'fishing' },
      { ox: 48, z: -315, rot: 0.16, hull: 0x1d4ed8, stripe: 0xf97316, type: 'fishing' },
      { ox: 34, z: -380, rot: -0.28, hull: 0xffffff, stripe: 0x0284c7, type: 'sail' },
      { ox: 72, z: -440, rot: 0.4, hull: 0xea580c, stripe: 0xffffff, type: 'fishing' },
      { ox: 27, z: -510, rot: -0.22, hull: 0x0369a1, stripe: 0xffffff, type: 'fishing' },
      { ox: 52, z: -585, rot: 0.25, hull: 0xffffff, stripe: 0x059669, type: 'sail' },
      { ox: 31, z: -660, rot: -0.15, hull: 0xb91c1c, stripe: 0xfacc15, type: 'fishing' },
      { ox: 66, z: -740, rot: -0.32, hull: 0xffffff, stripe: 0x1d4ed8, type: 'sail' },
      { ox: 34, z: -830, rot: 0.18, hull: 0x7c2d12, stripe: 0xfacc15, type: 'fishing' },
      { ox: 46, z: -910, rot: -0.22, hull: 0x2563eb, stripe: 0xffffff, type: 'fishing' },
      { ox: 58, z: -990, rot: 0.3, hull: 0xffffff, stripe: 0xdc2626, type: 'sail' },
      { ox: 29, z: -1075, rot: 0.24, hull: 0xb91c1c, stripe: 0xfde047, type: 'fishing' },
      { ox: 42, z: -1155, rot: -0.2, hull: 0xffffff, stripe: 0x2563eb, type: 'sail' },
      { ox: 36, z: -1325, rot: 0.28, hull: 0x059669, stripe: 0xffffff, type: 'fishing' },
      { ox: 60, z: -1410, rot: -0.24, hull: 0xffffff, stripe: 0xf97316, type: 'sail' },
      { ox: 28, z: -1495, rot: 0.14, hull: 0x1d4ed8, stripe: 0xfacc15, type: 'fishing' },
      { ox: 48, z: -1580, rot: -0.3, hull: 0xdc2626, stripe: 0xffffff, type: 'fishing' },
      { ox: 32, z: -1680, rot: -0.2, hull: 0x0ea5e9, stripe: 0xdc2626, type: 'fishing' },
      { ox: 56, z: -1765, rot: 0.35, hull: 0xffffff, stripe: 0x1d4ed8, type: 'sail' },
      { ox: 30, z: -1855, rot: -0.18, hull: 0xd97706, stripe: 0xffffff, type: 'fishing' },
      { ox: 68, z: -1950, rot: 0.22, hull: 0xffffff, stripe: 0x059669, type: 'sail' },
      { ox: 34, z: -2045, rot: -0.26, hull: 0x2563eb, stripe: 0xfacc15, type: 'fishing' },
      { ox: 50, z: -2140, rot: 0.18, hull: 0xffffff, stripe: 0xdc2626, type: 'sail' },
      { ox: 29, z: -2240, rot: -0.22, hull: 0x059669, stripe: 0xfef3c7, type: 'fishing' },
      { ox: 62, z: -2345, rot: 0.28, hull: 0xb91c1c, stripe: 0xffffff, type: 'fishing' },
      { ox: 36, z: -2450, rot: -0.34, hull: 0xffffff, stripe: 0x1d4ed8, type: 'sail' },
      { ox: 48, z: -2560, rot: 0.16, hull: 0x0284c7, stripe: 0xfacc15, type: 'fishing' },
      { ox: 27, z: -2670, rot: -0.18, hull: 0x059669, stripe: 0xfacc15, type: 'fishing' },
      { ox: 54, z: -2775, rot: 0.3, hull: 0xffffff, stripe: 0xf97316, type: 'sail' },
      { ox: 32, z: -2880, rot: -0.24, hull: 0xdc2626, stripe: 0xffffff, type: 'fishing' },
      { ox: 64, z: -2985, rot: 0.2, hull: 0xffffff, stripe: 0x2563eb, type: 'sail' },
      { ox: 30, z: -3085, rot: -0.16, hull: 0x1d4ed8, stripe: 0xfde047, type: 'fishing' },
      { ox: 46, z: -3170, rot: 0.26, hull: 0xffffff, stripe: 0x059669, type: 'sail' },
      { ox: 31, z: -3245, rot: 0.2, hull: 0x0284c7, stripe: 0xffffff, type: 'fishing' },
      { ox: 52, z: -3325, rot: -0.28, hull: 0xffffff, stripe: 0xdc2626, type: 'sail' },
      { ox: 25, z: -3410, rot: -0.3, hull: 0xdc2626, stripe: 0xfacc15, type: 'fishing' },
      { ox: 40, z: -3485, rot: 0.22, hull: 0xffffff, stripe: 0x1d4ed8, type: 'sail' },
    ];
    const boatSpecs = isMobile ? allBoatSpecs.filter((_, i) => i % 3 !== 2) : allBoatSpecs;
    boatSpecs.forEach((spec, idx) => {
      const boat =
        spec.type === 'sail'
          ? createMediterraneanSailboat(spec.hull, spec.stripe, sailMat, woodMat, woodDeckMat)
          : createRealisticFishingBoat(
              spec.hull,
              spec.stripe,
              creamMat,
              woodDeckMat,
              woodMat,
              windowDarkMat,
              ropeMat,
              lifebuoyMat,
              goldMat,
            );
      boat.position.set(getRoadCenterX(spec.z) + spec.ox, -0.68, spec.z);
      boat.rotation.y = spec.rot + getRoadYawAt(spec.z);
      worldGroup.add(boat);
      animatedBoats.push({ mesh: boat, baseY: -0.68, phase: idx * 0.95 });
    });
  }

  // ============================================================================
  // 7. مسجد المرسي أبو العباس الملوّن بالأبلق والزخارف الأندلسية (الشمال · -X — z = -3150)
  // ============================================================================
  {
    const cz = -3150;
    const g = new THREE.Group();
    g.position.set(getRoadCenterX(cz) - 33, 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    const mursiWallTex = createMosqueOrnamentTexture('#F7EBD3', '#DFBC84', '#0F766E', maxAnisotropy);
    const mursiWallMat = new THREE.MeshStandardMaterial({ map: mursiWallTex, roughness: 0.58 });
    const mursiDomeTex = createMosqueDomeTexture('#F9EED7', '#D97706', '#0D9488', maxAnisotropy);
    const mursiDomeMat = new THREE.MeshStandardMaterial({ map: mursiDomeTex, roughness: 0.45 });

    const plaza = new THREE.Mesh(new THREE.BoxGeometry(27, 0.78, 38), stanleyStoneMat);
    plaza.position.y = 0.39;

    const prayerHall = new THREE.Mesh(new THREE.BoxGeometry(17.5, 11.8, 25.5), mursiWallMat);
    prayerHall.position.set(-3.5, 6.2, 0);
    prayerHall.castShadow = true;

    const corniceBand = new THREE.Mesh(new THREE.BoxGeometry(18.1, 1.1, 26.1), turquoiseMat);
    corniceBand.position.set(-3.5, 11.9, 0);
    const goldTrimBand = new THREE.Mesh(new THREE.BoxGeometry(18.3, 0.35, 26.3), goldMat);
    goldTrimBand.position.set(-3.5, 12.55, 0);

    // Glowing stained-glass arched windows overlooking the Corniche (+X)
    for (let wz = -9; wz <= 9; wz += 4.5) {
      const archWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 4.1, 1.9),
        Math.abs(wz) < 3 ? amberGlowWinMat : stainedTurqWinMat,
      );
      archWin.position.set(5.35, 6.4, wz);
      g.add(archWin);
    }

    // 4 Andalusian Domes + Central Cupola in colorful mosaic & gold trim
    for (const [dx, dz, scale] of [
      [-0.5, -5.8, 1.0],
      [-6.5, -5.8, 1.0],
      [-0.5, 5.8, 1.0],
      [-6.5, 5.8, 1.0],
      [-3.5, 0, 1.3],
    ] as [number, number, number][]) {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.55 * scale, 2.65 * scale, 2.3, 8), mursiWallMat);
      drum.position.set(dx, 13.0, dz);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.65 * scale, 2.65 * scale, 0.45, 8), turquoiseMat);
      collar.position.set(dx, 14.0, dz);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.55 * scale, 12, 12), mursiDomeMat);
      dome.position.set(dx, 14.5, dz);
      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.9, 8), goldMat);
      finial.position.set(dx, 17.6, dz);
      const crest = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 6, 12, Math.PI * 1.4), goldMat);
      crest.position.set(dx, 18.7, dz);
      g.add(drum, collar, dome, finial, crest);
    }

    // Tall Colorful 4-Tier Andalusian Minaret
    const minBase = new THREE.Mesh(new THREE.BoxGeometry(3.9, 14.8, 3.9), mursiWallMat);
    minBase.position.set(6.6, 7.6, -10.8);
    const minShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.95, 11.8, 8), mursiWallMat);
    minShaft.position.set(6.6, 20.2, -10.8);
    const minBalcony1 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.25, 0.95, 8), turquoiseMat);
    minBalcony1.position.set(6.6, 16.5, -10.8);
    const minBalcony2 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.9, 0.85, 8), royalRedMat);
    minBalcony2.position.set(6.6, 23.0, -10.8);
    const minCupola = new THREE.Mesh(new THREE.ConeGeometry(1.55, 4.6, 8), mursiDomeMat);
    minCupola.position.set(6.6, 27.9, -10.8);
    const minCrescent = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 8, 14, Math.PI * 1.4), goldMat);
    minCrescent.position.set(6.6, 30.9, -10.8);

    for (let az = -9; az <= 9; az += 3.6) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 6.5, 10), stanleyStoneMat);
      col.position.set(6.9, 3.4, az);
      g.add(col);
    }

    g.add(
      plaza,
      prayerHall,
      corniceBand,
      goldTrimBand,
      minBase,
      minShaft,
      minBalcony1,
      minBalcony2,
      minCupola,
      minCrescent,
    );
    addLandmarkSignboard(g, 'مسجد المرسي أبو العباس', 'ميدان المساجد · بحري', '#FBBF24', 11.5, 5.2, 14, maxAnisotropy);
    worldGroup.add(g);
  }

  // ============================================================================
  // 6. المنشية والنصب التذكاري للجندي المجهول — z = -2740
  // ============================================================================
  {
    const cz = -2740;
    const g = new THREE.Group();
    g.position.set(getRoadCenterX(cz), 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    // Unknown Soldier Memorial colonnade overlooking the Mediterranean Sea on RIGHT (+X)
    const terrace = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 15.5, 1.3, 24, 1, false, 0, Math.PI), creamMat);
    terrace.position.set(22, 0.65, 0);
    terrace.rotation.y = -Math.PI / 2;
    g.add(terrace);

    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (i / 7) * Math.PI;
      const cx = 22 + Math.cos(ang) * 10.8;
      const czOff = Math.sin(ang) * 10.8;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.7, 9.8, 12), creamMat);
      col.position.set(cx, 5.9, czOff);
      col.castShadow = true;
      g.add(col);
    }

    const crown = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.92, 8, 24, Math.PI), creamMat);
    crown.rotation.x = Math.PI / 2;
    crown.rotation.z = -Math.PI / 2;
    crown.position.set(22, 11.1, 0);
    g.add(crown);

    // Mansheya civic hall on LEFT (-X, City side)
    const hall = new THREE.Mesh(new THREE.BoxGeometry(17, 16.5, 34), stanleyStoneMat);
    hall.position.set(-32, 8.25, 0);
    hall.castShadow = true;
    const pediment = new THREE.Mesh(new THREE.ConeGeometry(8.5, 4.5, 4), royalRedMat);
    pediment.position.set(-32, 18.6, 0);
    pediment.rotation.y = Math.PI / 4;
    for (let wz = -12; wz <= 12; wz += 6) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 11, 10), whiteMosqueMat);
      col.position.set(-22.5, 5.5, wz);
      g.add(col);
    }
    g.add(hall, pediment);

    addLandmarkSignboard(g, 'المنشية والجندي المجهول', 'قلب الإسكندرية · ٢٧٤٠ م', '#38BDF8', -20.5, 5.2, 15, maxAnisotropy);
    worldGroup.add(g);
  }

  // ============================================================================
  // 5. محطة الرمل ومسجد القائد إبراهيم الملوّن (الشمال · -X — z = -2320)
  // ============================================================================
  {
    const cz = -2320;
    const g = new THREE.Group();
    g.position.set(getRoadCenterX(cz) - 32, 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    const qaedWallTex = createMosqueOrnamentTexture('#F8EAD8', '#D99B72', '#047857', maxAnisotropy);
    const qaedWallMat = new THREE.MeshStandardMaterial({ map: qaedWallTex, roughness: 0.58 });
    const qaedDomeTex = createMosqueDomeTexture('#10B981', '#065F46', '#FACC15', maxAnisotropy);
    const qaedDomeMat = new THREE.MeshStandardMaterial({ map: qaedDomeTex, roughness: 0.42 });

    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(17, 13.5, 29), qaedWallMat);
    mainHall.position.set(-4.5, 6.75, 0);
    mainHall.castShadow = true;

    const frieze = new THREE.Mesh(new THREE.BoxGeometry(17.6, 1.0, 29.6), emeraldMat);
    frieze.position.set(-4.5, 13.6, 0);

    for (let wz = -10; wz <= 10; wz += 5) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 2.2), amberGlowWinMat);
      win.position.set(4.1, 7.6, wz);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 2.8), woodMat);
      door.position.set(4.1, 1.9, wz);
      g.add(win, door);
    }

    // Iconic Emerald-Green & Gold Dome
    const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.5, 2.6, 16), qaedWallMat);
    domeDrum.position.set(-4.5, 15.2, 0);
    const mainDome = new THREE.Mesh(new THREE.SphereGeometry(5.1, 18, 14), qaedDomeMat);
    mainDome.position.set(-4.5, 17.0, 0);
    const domeCrest = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.4, 8), goldMat);
    domeCrest.position.set(-4.5, 22.8, 0);

    // Tall Slender Polychrome Minaret of Al-Qaed Ibrahim
    const minLower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 15, 3.4), qaedWallMat);
    minLower.position.set(5.8, 7.5, -10.5);
    const minUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.55, 16, 12), qaedWallMat);
    minUpper.position.set(5.8, 22.5, -10.5);
    for (const [by, rad] of [[15.5, 2.1], [22.2, 1.8], [28.4, 1.55]]) {
      const bal = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.88, 0.75, 12), emeraldMat);
      bal.position.set(5.8, by, -10.5);
      g.add(bal);
    }
    const minTop = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.8, 10), qaedDomeMat);
    minTop.position.set(5.8, 32.8, -10.5);
    const minCres = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 14, Math.PI * 1.4), goldMat);
    minCres.position.set(5.8, 35.8, -10.5);

    const p1 = treeBundle.createPalmGroup(0.95);
    p1.position.set(8.5, 0, 12);
    const p2 = treeBundle.createLeafyTreeGroup('poinciana', 0.92);
    p2.position.set(8.5, 0, -15);

    g.add(mainHall, frieze, domeDrum, mainDome, domeCrest, minLower, minUpper, minTop, minCres, p1, p2);
    addLandmarkSignboard(g, 'مسجد القائد إبراهيم', 'محطة الرمل · ٢٣٢٠ م', '#10B981', 11, 5.2, 16, maxAnisotropy);
    worldGroup.add(g);
  }

  // ============================================================================
  // 4. مكتبة الإسكندرية على الشمال (الشاطبي · -X side) — z = -1780
  // ============================================================================
  {
    const cz = -1780;
    const g = new THREE.Group();
    g.position.set(getRoadCenterX(cz) - 35, 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    const plazaDeck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 48), darkStoneMat);
    plazaDeck.position.set(-2, 0.2, 0);

    const pool = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.52, 42),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.55 }),
    );
    pool.position.set(-1, 0.3, 0);

    // Tilted granite sun-disc cylinder sloping down toward the Mediterranean Sea (+X)!
    const cylinderBody = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.2, 12.2, 36), bibGraniteMat);
    cylinderBody.position.set(-6, 4.4, 0);
    cylinderBody.rotation.z = -0.27;
    cylinderBody.castShadow = true;

    const glassRoof = new THREE.Mesh(new THREE.CylinderGeometry(14.8, 14.8, 0.65, 36), glassCurtainMat);
    glassRoof.position.set(-4.4, 10.3, 0);
    glassRoof.rotation.z = -0.27;

    const planetarium = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 24, 24),
      new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, metalness: 0.78, roughness: 0.2, clearcoat: 0.85 }),
    );
    planetarium.position.set(7.2, 6.2, 13.5);
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.3, 8, 24), goldMat);
    cradle.position.set(7.2, 6.2, 13.5);
    cradle.rotation.x = 0.42;

    // Realistic Palm Trees flanking the Bibliotheca plaza
    for (const pz of [-20, 20]) {
      const palm = treeBundle.createPalmGroup(1.05);
      palm.position.set(12, 0.35, pz);
      g.add(palm);
    }

    g.add(plazaDeck, pool, cylinderBody, glassRoof, planetarium, cradle);
    addLandmarkSignboard(g, 'مكتبة الإسكندرية', 'على الشمال · الشاطبي', '#A78BFA', 13, 5.2, 19, maxAnisotropy);
    worldGroup.add(g);
  }

  // ============================================================================
  // 6. كوبري ستانلي الملوّن بأبراجه الملكية + كبائن خليج ستانلي (z = -2300)
  // ============================================================================
  {
    const bridgeGroup = new THREE.Group();
    const bridgeCenterX = getRoadCenterX(STANLEY_BRIDGE_Z);
    bridgeGroup.position.set(bridgeCenterX, 0, STANLEY_BRIDGE_Z);

    const segs = 36;
    const bridgeLen = STANLEY_HALF_LEN * 2;
    const deckGeo = new THREE.PlaneGeometry(19.8, bridgeLen, 1, segs);
    deckGeo.rotateX(-Math.PI / 2);
    const posAttr = deckGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const localZ = posAttr.getZ(i);
      const worldZ = STANLEY_BRIDGE_Z + localZ;
      posAttr.setY(i, getRoadHeightAt(worldZ) + 0.06);
    }
    deckGeo.computeVertexNormals();

    const bridgeRoadTex = createRoadTexture(maxAnisotropy, 10);
    const deckMesh = new THREE.Mesh(
      deckGeo,
      new THREE.MeshStandardMaterial({
        map: bridgeRoadTex,
        roughness: 0.96,
        metalness: 0,
        envMapIntensity: 0,
      }),
    );
    deckMesh.receiveShadow = true;
    bridgeGroup.add(deckMesh);

    const stanleyCupolaTex = createMosqueDomeTexture('#F6D89E', '#B45309', '#0E7490', maxAnisotropy);
    const stanleyCupolaMat = new THREE.MeshStandardMaterial({ map: stanleyCupolaTex, roughness: 0.44 });
    const stanleyTowerTex = createMosqueOrnamentTexture('#EFC78C', '#C98952', '#991B1B', maxAnisotropy);
    const stanleyTowerMat = new THREE.MeshStandardMaterial({ map: stanleyTowerTex, roughness: 0.6 });

    // Colored Bridge Piers, Arched Span Supports & Stone Balustrades with Golden Lamps
    for (let localZ = -76; localZ <= 76; localZ += 14) {
      const worldZ = STANLEY_BRIDGE_Z + localZ;
      const h = getRoadHeightAt(worldZ);
      if (h < 0.4) continue;

      for (const px of [-10.1, 0, 10.1]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(1.7, h + 1.5, 2.3), stanleyStoneMat);
        pier.position.set(px, (h - 0.5) / 2, localZ);
        const pierTrim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 2.5), royalRedMat);
        pierTrim.position.set(px, h - 0.15, localZ);
        bridgeGroup.add(pier, pierTrim);
      }

      for (const sideX of [-10.2, 10.2]) {
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.38, 14.2), stanleyStoneMat);
        parapet.position.set(sideX, h + 0.65, localZ);
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 14.2), creamMat);
        topRail.position.set(sideX, h + 1.4, localZ);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), amberGlowWinMat);
        globe.position.set(sideX, h + 1.85, localZ);
        bridgeGroup.add(parapet, topRail, globe);
      }
    }

    // 4 Richly Colored Royal Neo-Islamic Stanley Bridge Towers
    for (const [tx, localTz] of [
      [-13.5, -26],
      [-13.5, 26],
      [13.5, -26],
      [13.5, 26],
    ]) {
      const deckY = getRoadHeightAt(STANLEY_BRIDGE_Z + localTz);
      const towerBase = new THREE.Mesh(new THREE.BoxGeometry(5.4, deckY + 16.2, 5.6), stanleyTowerMat);
      towerBase.position.set(tx, (deckY + 16.2) / 2 - 0.5, localTz);
      towerBase.castShadow = true;

      const midFrieze = new THREE.Mesh(new THREE.BoxGeometry(5.75, 1.25, 5.95), cobaltTileMat);
      midFrieze.position.set(tx, deckY + 5.2, localTz);

      const archWin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.3, 5.85), amberGlowWinMat);
      archWin.position.set(tx, deckY + 9.2, localTz);

      const royalGallery = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.7, 6.4), royalRedMat);
      royalGallery.position.set(tx, deckY + 16.1, localTz);

      const turqBelt = new THREE.Mesh(new THREE.BoxGeometry(6.45, 0.75, 6.65), turquoiseMat);
      turqBelt.position.set(tx, deckY + 14.4, localTz);

      const cornice = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.9, 6.8), creamMat);
      cornice.position.set(tx, deckY + 17.8, localTz);

      const cupola = new THREE.Mesh(new THREE.ConeGeometry(3.45, 5.6, 8), stanleyCupolaMat);
      cupola.position.set(tx, deckY + 20.9, localTz);

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.74, 10, 10), goldMat);
      finial.position.set(tx, deckY + 24.1, localTz);

      bridgeGroup.add(towerBase, midFrieze, archWin, royalGallery, turqBelt, cornice, cupola, finial);
    }

    // Colorful Stanley Arch Sign at the Bridge Crest (localZ = 0)
    const crestY = getRoadHeightAt(STANLEY_BRIDGE_Z);
    const finishSign = new THREE.Mesh(
      new THREE.BoxGeometry(12.4, 3.2, 0.35),
      new THREE.MeshStandardMaterial({
        map: createSignTexture('كوبري ستانلي', 'المسار مستمر حتى بحري ↑', '#FACC15', maxAnisotropy),
        roughness: 0.35,
      }),
    );
    finishSign.position.set(0, crestY + 8.5, 0);
    const archCrossbar = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.55, 0.55), goldMat);
    archCrossbar.position.set(0, crestY + 8.5, 0);
    bridgeGroup.add(finishSign, archCrossbar);

    // Sea overlook on RIGHT (+X, Mediterranean Sea side) & Stanley Bay beach cabins on LEFT (-X, cove side)
    const seaOverlook = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 62), stanleyStoneMat);
    seaOverlook.position.set(18, 4.2, 0);
    bridgeGroup.add(seaOverlook);

    const cabinColors = [0x0284c7, 0xfacc15, 0xf97316, 0x10b981, 0xe11d48];
    for (let ci = 0; ci < 5; ci++) {
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 3.1, 6.2),
        new THREE.MeshStandardMaterial({ color: cabinColors[ci], roughness: 0.58 }),
      );
      cabin.position.set(-17.5, 1.4, -32 + ci * 16);
      const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 6.5), whiteMosqueMat);
      cabinRoof.position.set(-17.5, 3.05, -32 + ci * 16);
      bridgeGroup.add(cabin, cabinRoof);
    }

    for (let b = 0; b < 3; b++) {
      const boat = createRealisticFishingBoat(
        0x0284c7,
        0xfacc15,
        creamMat,
        woodDeckMat,
        woodMat,
        windowDarkMat,
        ropeMat,
        lifebuoyMat,
        goldMat,
      );
      boat.position.set(22 + b * 7, -0.08, -22 + b * 24);
      boat.rotation.y = -0.4 + b * 0.25;
      bridgeGroup.add(boat);
      animatedBoats.push({ mesh: boat, baseY: -0.08, phase: b * 1.6 });
    }

    worldGroup.add(bridgeGroup);
  }

  // ============================================================================
  // 2. مسجد سيدي بشر الكبير الملوّن (سيدي بشر · ميامي — الشمال -X — z = -580)
  // ============================================================================
  {
    const cz = -580;
    const g = new THREE.Group();
    g.position.set(getRoadCenterX(cz) - 33, 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    const sidiWallTex = createMosqueOrnamentTexture('#F7F1E5', '#D6B682', '#1D4ED8', maxAnisotropy);
    const sidiWallMat = new THREE.MeshStandardMaterial({
      map: sidiWallTex,
      roughness: 0.56,
      emissive: warmFloodEmissive,
      emissiveIntensity: isNight ? 0.58 : 0,
    });
    const sidiDomeTex = createMosqueDomeTexture('#0284C7', '#0369A1', '#FACC15', maxAnisotropy);
    const sidiDomeMat = new THREE.MeshStandardMaterial({
      map: sidiDomeTex,
      roughness: 0.4,
      emissive: coolFloodEmissive,
      emissiveIntensity: isNight ? 0.65 : 0,
    });

    const plaza = new THREE.Mesh(new THREE.BoxGeometry(28, 0.7, 38), stanleyStoneMat);
    plaza.position.y = 0.35;

    const hall = new THREE.Mesh(new THREE.BoxGeometry(18, 12.2, 27), sidiWallMat);
    hall.position.set(-3.5, 6.3, 0);
    hall.castShadow = true;

    const blueFrieze = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1.15, 27.5), cobaltTileMat);
    blueFrieze.position.set(-3.5, 12.1, 0);

    for (let wz = -9; wz <= 9; wz += 4.5) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.38, 4.0, 2.0), amberGlowWinMat);
      win.position.set(5.6, 6.5, wz);
      g.add(win);
    }

    const centralDrum = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.9, 2.5, 16), sidiWallMat);
    centralDrum.position.set(-3.5, 13.7, 0);
    const centralDome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 16, 12), sidiDomeMat);
    centralDome.position.set(-3.5, 15.2, 0);
    const centralFinial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.1, 8), goldMat);
    centralFinial.position.set(-3.5, 20.4, 0);

    // Twin Colorful Minarets flanking Sidi Bishr Mosque facing Corniche (+X)
    for (const mz of [-11.5, 11.5]) {
      const mBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 13.5, 3.4), sidiWallMat);
      mBase.position.set(5.8, 6.9, mz);
      const mShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.65, 11, 10), sidiWallMat);
      mShaft.position.set(5.8, 18.8, mz);
      const mBal = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.9, 0.85, 10), cobaltTileMat);
      mBal.position.set(5.8, 15.2, mz);
      const mCap = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.2, 10), sidiDomeMat);
      mCap.position.set(5.8, 26.2, mz);
      const mCres = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 12, Math.PI * 1.4), goldMat);
      mCres.position.set(5.8, 29.0, mz);
      g.add(mBase, mShaft, mBal, mCap, mCres);
    }

    const pTree1 = treeBundle.createPalmGroup(1.0);
    pTree1.position.set(10, 0.35, 15);
    const pTree2 = treeBundle.createLeafyTreeGroup('ficus', 0.95);
    pTree2.position.set(10, 0.35, -15);

    g.add(plaza, hall, blueFrieze, centralDrum, centralDome, centralFinial, pTree1, pTree2);
    addLandmarkSignboard(g, 'مسجد سيدي بشر الكبير', 'سيدي بشر · ميامي', '#38BDF8', 11.5, 5.2, 15, maxAnisotropy, isNight);
    worldGroup.add(g);
  }

  // ============================================================================
  // 1. قصر وبوابة وحدائق المنتزه والمندرة (المندرة · نقطة البداية — اليمين +X، وبعده البحر مباشرة!)
  // ============================================================================
  {
    const cz = -40;
    const g = new THREE.Group();
    g.position.set(getRoadCenterX(cz), 0, cz);
    g.rotation.y = getRoadYawAt(cz);

    // Coastal Headland Stone Retaining Base + Lush Montaza Palace Park on RIGHT (+X)
    // Ends cleanly at z = -85 (local z = -45) so immediately after Montaza Palace it opens directly to the Mediterranean Sea!
    const coastalBase = new THREE.Mesh(
      new THREE.BoxGeometry(56, 1.1, 92),
      stanleyStoneMat,
    );
    coastalBase.position.set(43, -0.15, 0);

    const parkGrass = new THREE.Mesh(
      new THREE.BoxGeometry(54, 0.45, 90),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 }),
    );
    parkGrass.position.set(43, 0.42, 0);

    const gateWallTex = createMosqueOrnamentTexture('#F5E2C4', '#D9A773', '#991B1B', maxAnisotropy);
    const gateWallMat = new THREE.MeshStandardMaterial({
      map: gateWallTex,
      roughness: 0.62,
      emissive: warmFloodEmissive,
      emissiveIntensity: isNight ? 0.6 : 0,
    });

    // Royal Montaza Gate facing Corniche
    const leftPylon = new THREE.Mesh(new THREE.BoxGeometry(5.2, 12.5, 5.2), gateWallMat);
    leftPylon.position.set(19, 6.25, -8.5);
    const rightPylon = new THREE.Mesh(new THREE.BoxGeometry(5.2, 12.5, 5.2), gateWallMat);
    rightPylon.position.set(19, 6.25, 8.5);

    const gateArchBeam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 21.0), royalRedMat);
    gateArchBeam.position.set(19, 12.8, 0);
    const gateCrown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10), goldMat);
    gateCrown.position.set(19, 15.8, 0);

    for (const pz of [-8.5, 8.5]) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3.8, 8), turquoiseMat);
      cap.position.set(19, 14.4, pz);
      g.add(cap);
    }

    // Iconic Montaza Haramlek Palace (قصر المنتزه الملكي) rising above the coastal park overlooking the sea
    const palaceBase = new THREE.Mesh(new THREE.BoxGeometry(22, 13.5, 36), gateWallMat);
    palaceBase.position.set(45, 7.2, -4);
    palaceBase.castShadow = true;

    const palaceRedBelt = new THREE.Mesh(new THREE.BoxGeometry(22.6, 1.35, 36.6), royalRedMat);
    palaceRedBelt.position.set(45, 13.8, -4);

    const palaceUpper = new THREE.Mesh(new THREE.BoxGeometry(16, 6.4, 24), creamMat);
    palaceUpper.position.set(46, 17.3, -4);
    palaceUpper.castShadow = true;

    // Glowing Florentine Palace Arched Windows facing the Corniche
    for (let wz = -14; wz <= 8; wz += 5.5) {
      const pWin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.8, 2.0), amberGlowWinMat);
      pWin.position.set(33.8, 8.2, wz);
      g.add(pWin);
    }

    // Famous Montaza Florentine Clocktower & Turquoise Royal Cupola
    const palaceTower = new THREE.Mesh(new THREE.BoxGeometry(6.8, 28, 6.8), gateWallMat);
    palaceTower.position.set(44, 14.4, -18);
    palaceTower.castShadow = true;
    const towerGallery = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.8, 7.6), royalRedMat);
    towerGallery.position.set(44, 27.6, -18);
    const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 6.8, 4), turquoiseMat);
    towerRoof.position.set(44, 32.3, -18);
    towerRoof.rotation.y = Math.PI / 4;
    const towerFinial = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), goldMat);
    towerFinial.position.set(44, 36.1, -18);

    const palaceDome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12), turquoiseMat);
    palaceDome.position.set(46, 21.2, 4);
    const palaceDomeFinial = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.4, 8), goldMat);
    palaceDomeFinial.position.set(46, 27.0, 4);

    // Lush Realistic Palms & Leafy Garden Trees inside Montaza Park
    for (let pz = -36; pz <= 36; pz += 12) {
      const palm = treeBundle.createPalmGroup(1.0 + (Math.abs(pz) % 3) * 0.08);
      palm.position.set(24 + (Math.abs(pz) % 2) * 5, 0.55, pz);
      g.add(palm);

      if (Math.abs(pz + 4) > 18) {
        const treeKind = Math.abs(pz) % 24 === 0 ? 'poinciana' : 'ficus';
        const leafy = treeBundle.createLeafyTreeGroup(treeKind, 1.05);
        leafy.position.set(34 + (Math.abs(pz) % 2) * 4, 0.55, pz + 4);
        g.add(leafy);
      }
    }

    // Start Line Gantry Banner across Corniche at Mandara (0m)
    const finishSignTex = createSignTexture('كورنيش وقصر المنتزه', 'المندرة · نقطة البداية ← بحري', '#FACC15', maxAnisotropy);
    const finishBanner = new THREE.Mesh(
      new THREE.BoxGeometry(13.2, 3.4, 0.38),
      new THREE.MeshStandardMaterial({
        map: finishSignTex,
        emissiveMap: finishSignTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: isNight ? 0.88 : 0.14,
        roughness: 0.32,
      }),
    );
    finishBanner.position.set(0, 8.4, 0);
    const finishCrossbar = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.55, 0.55), goldMat);
    finishCrossbar.position.set(0, 8.4, 0);
    for (const sx of [-10.6, 10.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 8.8, 10), royalRedMat);
      post.position.set(sx, 4.4, 0);
      g.add(post);
    }

    g.add(
      coastalBase,
      parkGrass,
      leftPylon,
      rightPylon,
      gateArchBeam,
      gateCrown,
      palaceBase,
      palaceRedBelt,
      palaceUpper,
      palaceTower,
      towerGallery,
      towerRoof,
      towerFinial,
      palaceDome,
      palaceDomeFinial,
      finishBanner,
      finishCrossbar,
    );
    addLandmarkSignboard(g, 'قصر وحدائق المنتزه', 'المندرة · وبعده البحر مباشرة', '#FACC15', 14.2, 5.2, 16, maxAnisotropy, isNight);
    worldGroup.add(g);
  }

  // Ensure every custom landmark material & signboard glows softly at night and skip heavy shadow casting on mobile
  if (isNight || isMobile) {
    worldGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (isMobile) {
          obj.castShadow = false;
        }
        if (isNight) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshStandardMaterial && m.emissiveIntensity === 0) {
              if (m.map && !m.emissiveMap) {
                m.emissive.setHex(0x3f2e18);
                m.emissiveIntensity = 0.44;
              } else if (!m.map) {
                m.emissive.copy(m.color).multiplyScalar(0.24);
                m.emissiveIntensity = 0.65;
              }
            }
          }
        }
      }
    });
  }

  return { group: worldGroup, animatedBoats };
}
