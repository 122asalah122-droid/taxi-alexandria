import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createFoliageClusterTexture,
  createPalmFrondTexture,
  createTreeBarkTexture,
} from './textures3d';

function prepGeo(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  return g;
}

function buildCurvedPalmFrondGeo(length: number, width: number, archUp: number, droop: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 2, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const rawY = pos.getY(i) + length / 2; // 0 at stem base -> length at tip
    const t = rawY / length;

    const outZ = t * length * 0.92;
    const y = Math.sin(t * Math.PI * 0.75) * archUp - t * t * droop - Math.abs(x) * 0.16;
    pos.setXYZ(i, x, y, outZ);
  }
  geo.computeVertexNormals();
  return prepGeo(geo);
}

export interface RealisticTreeBundle {
  palmTrunkGeo: THREE.BufferGeometry;
  palmCrownGeo: THREE.BufferGeometry;
  palmDatesGeo: THREE.BufferGeometry;
  palmBarkMat: THREE.MeshStandardMaterial;
  palmFrondMat: THREE.MeshStandardMaterial;
  palmDatesMat: THREE.MeshStandardMaterial;

  leafWoodGeo: THREE.BufferGeometry;
  leafCanopyGeo: THREE.BufferGeometry;
  leafBarkMat: THREE.MeshStandardMaterial;
  ficusCanopyMat: THREE.MeshStandardMaterial;
  poincianaCanopyMat: THREE.MeshStandardMaterial;
  oliveCanopyMat: THREE.MeshStandardMaterial;

  createPalmGroup: (scale?: number) => THREE.Group;
  createLeafyTreeGroup: (kind?: 'ficus' | 'poinciana' | 'olive', scale?: number) => THREE.Group;
  dispose: () => void;
}

export function createRealisticTreeBundle(maxAnisotropy: number): RealisticTreeBundle {
  const palmBarkTex = createTreeBarkTexture(true, maxAnisotropy);
  const leafBarkTex = createTreeBarkTexture(false, maxAnisotropy);
  const palmFrondTex = createPalmFrondTexture(maxAnisotropy);
  const ficusTex = createFoliageClusterTexture('ficus', maxAnisotropy);
  const poincianaTex = createFoliageClusterTexture('poinciana', maxAnisotropy);
  const oliveTex = createFoliageClusterTexture('olive', maxAnisotropy);

  const palmBarkMat = new THREE.MeshStandardMaterial({
    map: palmBarkTex,
    roughness: 0.92,
  });
  const palmFrondMat = new THREE.MeshStandardMaterial({
    map: palmFrondTex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.72,
  });
  const palmDatesMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.68,
  });

  const leafBarkMat = new THREE.MeshStandardMaterial({
    map: leafBarkTex,
    roughness: 0.94,
  });
  const ficusCanopyMat = new THREE.MeshStandardMaterial({
    map: ficusTex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.82,
  });
  const poincianaCanopyMat = new THREE.MeshStandardMaterial({
    map: poincianaTex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.8,
  });
  const oliveCanopyMat = new THREE.MeshStandardMaterial({
    map: oliveTex,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.84,
  });

  // 1. Tall Stately Curved Date Palm Trunk + Crownshaft (Alexandria Corniche silhouette)
  const trunkH = 7.8;
  const trunkGeoRaw = new THREE.CylinderGeometry(0.15, 0.3, trunkH, 8, 7);
  const tPos = trunkGeoRaw.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const y = tPos.getY(i) + trunkH / 2; // 0..7.8
    const t = y / trunkH;
    const bend = Math.sin(t * Math.PI * 0.85) * 0.28;
    tPos.setXYZ(i, tPos.getX(i) + bend, y, tPos.getZ(i) + bend * 0.3);
  }
  trunkGeoRaw.computeVertexNormals();
  const crownShaftRaw = new THREE.CylinderGeometry(0.24, 0.17, 0.68, 8);
  crownShaftRaw.translate(0.12, trunkH + 0.16, 0.04);
  const palmTrunkGeo = mergeGeometries([prepGeo(trunkGeoRaw), prepGeo(crownShaftRaw)]);

  // Golden hanging date/fruit clusters under palm fronds
  const dateParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.4;
    const dCluster = new THREE.ConeGeometry(0.17, 0.58, 6);
    dCluster.rotateX(Math.PI);
    dCluster.translate(0.12 + Math.cos(ang) * 0.27, trunkH - 0.25, 0.04 + Math.sin(ang) * 0.27);
    dateParts.push(prepGeo(dCluster));
  }
  const palmDatesGeo = mergeGeometries(dateParts);

  // 18 Lush Arching & Drooping Feathered Palm Fronds (8 long lower drooping + 6 mid + 4 upper crown)
  const frondParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const f = buildCurvedPalmFrondGeo(3.25, 1.18, 0.88, 1.98);
    f.rotateY(ang);
    f.translate(0.12, trunkH + 0.26, 0.04);
    frondParts.push(f);
  }
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const f = buildCurvedPalmFrondGeo(2.75, 1.08, 1.18, 1.32);
    f.rotateY(ang);
    f.translate(0.12, trunkH + 0.38, 0.04);
    frondParts.push(f);
  }
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const f = buildCurvedPalmFrondGeo(2.0, 0.92, 1.35, 0.55);
    f.rotateY(ang);
    f.translate(0.12, trunkH + 0.48, 0.04);
    frondParts.push(f);
  }
  const palmCrownGeo = mergeGeometries(frondParts);

  // 2. Realistic Multi-Branch Mediterranean Street / Garden Tree
  const woodParts: THREE.BufferGeometry[] = [];
  const mainTrunk = new THREE.CylinderGeometry(0.16, 0.27, 2.3, 7);
  mainTrunk.translate(0, 1.15, 0);
  woodParts.push(prepGeo(mainTrunk));

  // Root flare at base
  const rootFlare = new THREE.CylinderGeometry(0.24, 0.36, 0.45, 7);
  rootFlare.translate(0, 0.22, 0);
  woodParts.push(prepGeo(rootFlare));

  // 4 diverging upper limbs + central crown branch
  const limbAngles = [0.2, 1.75, 3.35, 4.9];
  for (let i = 0; i < limbAngles.length; i++) {
    const ang = limbAngles[i];
    const limb = new THREE.CylinderGeometry(0.065, 0.135, 1.75, 6);
    limb.translate(0, 0.85, 0);
    limb.rotateZ(0.56);
    limb.rotateY(ang);
    limb.translate(0, 1.95, 0);
    woodParts.push(prepGeo(limb));
  }
  const centerLimb = new THREE.CylinderGeometry(0.07, 0.13, 1.55, 6);
  centerLimb.translate(0, 2.85, 0);
  woodParts.push(prepGeo(centerLimb));
  const leafWoodGeo = mergeGeometries(woodParts);

  // 22 angled/crossed 3D foliage cluster planes forming a natural airy organic canopy
  const canopyParts: THREE.BufferGeometry[] = [];
  const cardSpecs: [number, number, number, number, number, number, number][] = [
    // [x, y, z, rx, ry, rz, size]
    [0, 3.95, 0, 0.35, 0.2, 0.15, 2.25],
    [0, 3.85, 0, -0.35, 1.7, -0.2, 2.15],
    [0, 4.35, 0, 1.25, 0.4, 0, 1.95],
    [0.95, 3.35, 0.25, 0.55, 0.5, -0.35, 1.95],
    [0.95, 3.45, 0.25, -0.45, 2.05, 0.25, 1.9],
    [-0.95, 3.42, -0.2, 0.5, -0.7, 0.3, 1.95],
    [-0.95, 3.35, -0.2, -0.45, 0.85, -0.3, 1.9],
    [0.2, 3.45, 0.98, 0.65, 0.1, 0.2, 1.95],
    [0.2, 3.38, 0.98, -0.5, 1.55, -0.25, 1.85],
    [-0.25, 3.5, -0.95, 0.6, 3.0, 0.2, 1.95],
    [-0.25, 3.42, -0.95, -0.5, 1.35, -0.2, 1.85],
    [0.72, 3.92, -0.68, 0.85, 0.95, 0.1, 1.8],
    [-0.75, 3.9, 0.68, 0.85, -0.95, -0.1, 1.8],
    [0.7, 2.88, -0.7, 1.1, 2.2, 0.3, 1.7],
    [-0.72, 2.86, 0.7, 1.1, -2.1, -0.25, 1.7],
    [0.55, 2.82, 0.62, 1.15, 0.7, 0.2, 1.68],
    [-0.58, 2.85, -0.6, 1.15, -0.8, -0.2, 1.68],
    [0, 3.15, 0, 1.35, 0.8, 0.1, 2.05],
  ];
  for (const [cx, cy, cz, rx, ry, rz, size] of cardSpecs) {
    const card = new THREE.PlaneGeometry(size, size);
    card.rotateX(rx);
    card.rotateY(ry);
    card.rotateZ(rz);
    card.translate(cx, cy, cz);
    canopyParts.push(prepGeo(card));
  }
  const leafCanopyGeo = mergeGeometries(canopyParts);

  const createPalmGroup = (scale = 1): THREE.Group => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(palmTrunkGeo, palmBarkMat);
    const dates = new THREE.Mesh(palmDatesGeo, palmDatesMat);
    const crown = new THREE.Mesh(palmCrownGeo, palmFrondMat);
    g.add(trunk, dates, crown);
    g.scale.setScalar(scale);
    return g;
  };

  const createLeafyTreeGroup = (
    kind: 'ficus' | 'poinciana' | 'olive' = 'ficus',
    scale = 1,
  ): THREE.Group => {
    const g = new THREE.Group();
    const wood = new THREE.Mesh(leafWoodGeo, leafBarkMat);
    const mat =
      kind === 'poinciana'
        ? poincianaCanopyMat
        : kind === 'olive'
          ? oliveCanopyMat
          : ficusCanopyMat;
    const canopy = new THREE.Mesh(leafCanopyGeo, mat);
    g.add(wood, canopy);
    g.scale.setScalar(scale);
    return g;
  };

  return {
    palmTrunkGeo,
    palmCrownGeo,
    palmDatesGeo,
    palmBarkMat,
    palmFrondMat,
    palmDatesMat,
    leafWoodGeo,
    leafCanopyGeo,
    leafBarkMat,
    ficusCanopyMat,
    poincianaCanopyMat,
    oliveCanopyMat,
    createPalmGroup,
    createLeafyTreeGroup,
    dispose: () => {
      palmTrunkGeo.dispose();
      palmCrownGeo.dispose();
      palmDatesGeo.dispose();
      leafWoodGeo.dispose();
      leafCanopyGeo.dispose();
      palmBarkTex.dispose();
      leafBarkTex.dispose();
      palmFrondTex.dispose();
      ficusTex.dispose();
      poincianaTex.dispose();
      oliveTex.dispose();
      palmBarkMat.dispose();
      palmFrondMat.dispose();
      palmDatesMat.dispose();
      leafBarkMat.dispose();
      ficusCanopyMat.dispose();
      poincianaCanopyMat.dispose();
      oliveCanopyMat.dispose();
    },
  };
}
