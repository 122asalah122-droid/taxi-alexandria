import * as THREE from 'three';
import { LED_SIGN_OPTIONS } from './data';
import {
  createAlexTaxiDoorDecalTexture,
  createAlexTaxiRearBannerTexture,
  createAlexTaxiSignTexture,
  createBeanieKnitTexture,
  createCarDashUpdater,
  createClothingFabricTexture,
  createEgyptianPlateTexture,
  createGreenTracksuitTexture,
  createHumanFaceTexture,
  createLedSignTexture,
  createMirrorReflectionUpdater,
  createMotorcycleDashUpdater,
  createTaxiRoofSignTexture,
  createYouthStickerTexture,
} from './textures3d';
import {
  AtmosphereMode,
  DriverAppearance,
  LedSignId,
  MotoTuningConfig,
  PlayerVehicleKind,
  RiderStyle,
  StuntType,
} from './types';

// Reusable module-scope math temporaries for zero-GC analytical arm IK
const _ikGrip = new THREE.Vector3();
const _ikShoulder = new THREE.Vector3();
const _ikToTarget = new THREE.Vector3();
const _ikPlaneOut = new THREE.Vector3();
const _ikElbowPos = new THREE.Vector3();
const _ikUpperDir = new THREE.Vector3();
const _ikForeDir = new THREE.Vector3();
const _ikLocalForeDir = new THREE.Vector3();
const _ikXAxis = new THREE.Vector3();
const _ikYAxis = new THREE.Vector3();
const _ikZAxis = new THREE.Vector3();
const _ikPoleHint = new THREE.Vector3();
const _ikMat4 = new THREE.Matrix4();
const _ikQuatArm = new THREE.Quaternion();
const _ikQuatElbow = new THREE.Quaternion();
const _ikQuatTorsoInv = new THREE.Quaternion();
const _ikQuatSteer = new THREE.Quaternion();
const _ikAxisY = new THREE.Vector3(0, 1, 0);
const _ikNegY = new THREE.Vector3(0, -1, 0);
const _ikSteerOrigin = new THREE.Vector3(0, 0.88, -0.52);
const _ikStuntArmQ = new THREE.Quaternion();
const _ikStuntElbowQ = new THREE.Quaternion();
const _ikEuler = new THREE.Euler();

export interface TaxiRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  roofSignMat: THREE.MeshStandardMaterial;
  setDoorOpen: (side: 'right' | 'left' | 'none', openAmt: number) => void;
  setPassengerSeated: (seated: boolean, shirtHex?: number) => void;
  animatePassenger: (time: number) => void;
  keepVisibleInPov: THREE.Object3D[];
}

export interface PlayerVehicleAnimateOptions {
  throttle?: boolean;
  braking?: boolean;
  speedKmh?: number;
  rpmRatio?: number;
  gear?: number;
  fuelPct?: number;
  tilt?: number;
  noseDive?: number;
  isPov?: boolean;
  atmosphere?: AtmosphereMode;
  rearTrafficHint?: { dist: number; side: number } | null;
}

export interface PlayerVehicleRig {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  roofSignMat?: THREE.MeshStandardMaterial;
  setPovMode?: (isPov: boolean) => void;
  setMirrorTexture?: (tex: THREE.Texture | null) => void;
  applyMotoTuning?: (tuning: MotoTuningConfig) => void;
  triggerExhaustRev?: (strength?: number) => void;
  setPassengerSeated?: (seated: boolean, shirtHex?: number) => void;
  setDoorOpen?: (side: 'right' | 'left' | 'none', openAmt: number) => void;
  animateVehicle?: (
    time: number,
    dt: number,
    stunt: StuntType,
    sirenOn: boolean,
    steerInput?: number,
    opts?: PlayerVehicleAnimateOptions,
  ) => void;
}

export interface VehicleRig {
  group: THREE.Group;
  animate?: (time: number, speedMps: number) => void;
}

export interface CheckpointInspectionRig {
  setHandExtended: (extended: boolean) => void;
  setTrunkOpen: (open: boolean) => void;
  update: (dt: number) => void;
}

export interface TrafficSignalRig {
  group: THREE.Group;
  redMat: THREE.MeshStandardMaterial;
  yellowMat: THREE.MeshStandardMaterial;
  greenMat: THREE.MeshStandardMaterial;
  officerArm: THREE.Object3D;
}

export interface PedestrianRig {
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
}

export interface WaitingPassengerRig {
  group: THREE.Group;
  personGroup: THREE.Group;
  ringGroup: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
}

export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      geometries.add(mesh.geometry);
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        materials.add(m);
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) textures.add(std.map);
        if (std.emissiveMap) textures.add(std.emissiveMap);
        if (std.alphaMap) textures.add(std.alphaMap);
        if (std.roughnessMap) textures.add(std.roughnessMap);
        if (std.metalnessMap) textures.add(std.metalnessMap);
        if (std.normalMap) textures.add(std.normalMap);
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

export function buildPlayerTaxi3D(
  taxiLevel = 1,
  maxAnisotropy = 4,
): TaxiRig {
  const lv = Math.max(1, Math.min(7, Math.round(taxiLevel)));
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const brakeLights: THREE.Mesh[] = [];
  const keepVisibleInPov: THREE.Object3D[] = [];

  const blackBodyMat = new THREE.MeshStandardMaterial({
    color: lv >= 7 ? 0x06080e : lv >= 4 ? 0x090c14 : 0x0d1119,
    roughness: lv >= 6 ? 0.12 : lv >= 3 ? 0.17 : 0.24,
    metalness: lv >= 6 ? 0.8 : lv >= 3 ? 0.68 : 0.5,
  });

  // Rich iconic Alexandria Taxi golden-yellow (harmonized & vivid across all 7 levels)
  const yellowPaintMat = new THREE.MeshStandardMaterial({
    color: lv >= 7 ? 0xfde047 : lv >= 4 ? 0xfacc15 : 0xf5b800,
    roughness: lv >= 6 ? 0.14 : lv >= 3 ? 0.18 : 0.24,
    metalness: lv >= 6 ? 0.52 : lv >= 3 ? 0.42 : 0.3,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: lv >= 5 ? 0xfacc15 : 0xe2e8f0,
    roughness: 0.16,
    metalness: 0.92,
  });

  // Semi-transparent clear glass so driver & seated passenger inside the taxi are clearly visible!
  const clearGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.08,
    metalness: 0.18,
    opacity: 0.34,
    transparent: true,
    depthWrite: false,
  });

  const interiorMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.82 });
  const seatMat = new THREE.MeshStandardMaterial({ color: lv >= 5 ? 0x7c2d12 : lv >= 3 ? 0x451a03 : 0x334155, roughness: 0.74 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.88, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: lv >= 7 ? 0xfef08a : lv >= 5 ? 0xf59e0b : lv >= 2 ? 0xf1f5f9 : 0x94a3b8,
    roughness: lv >= 5 ? 0.12 : lv >= 2 ? 0.18 : 0.34,
    metalness: lv >= 2 ? 0.92 : 0.75,
  });

  const bodyLen = lv >= 6 ? 4.54 : lv >= 3 ? 4.42 : 4.28;
  const bodyW = lv >= 6 ? 2.04 : lv >= 4 ? 1.96 : lv >= 2 ? 1.88 : 1.84;
  const cabinLen = lv >= 2 ? 2.28 : 2.18;
  const cabinW = bodyW - 0.18;

  // Lower chassis split cleanly around cabin floor so cabin interior is open & visible
  const chassisFloor = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.08, 0.32, bodyLen), blackBodyMat);
  chassisFloor.position.y = 0.36;
  chassisFloor.castShadow = true;
  chassisFloor.receiveShadow = true;
  group.add(chassisFloor);

  // Front hood & engine bay
  const frontNose = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.54, 1.24), blackBodyMat);
  frontNose.position.set(0, 0.54, -bodyLen * 0.34);
  frontNose.castShadow = true;
  group.add(frontNose);

  const hoodCap = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.06, 0.1, 1.22), yellowPaintMat);
  hoodCap.position.set(0, 0.84, -bodyLen * 0.34);
  hoodCap.castShadow = true;
  group.add(hoodCap);

  // Rear trunk (aligned flush to bodyLen / 2 so rear "تاكسي الإسكندرية" plaque, lights, and plate sit cleanly)
  const rearBoot = new THREE.Mesh(new THREE.BoxGeometry(bodyW, 0.54, 0.96), blackBodyMat);
  rearBoot.position.set(0, 0.54, bodyLen / 2 - 0.48);
  rearBoot.castShadow = true;
  group.add(rearBoot);

  const trunkCap = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.08, 0.09, 0.92), yellowPaintMat);
  trunkCap.position.set(0, 0.84, bodyLen / 2 - 0.48);
  group.add(trunkCap);

  // Side sills below doors
  for (const sx of [-1, 1]) {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, cabinLen + 0.1), blackBodyMat);
    sill.position.set(sx * (bodyW / 2 - 0.06), 0.36, 0.08);
    group.add(sill);
  }

  // Interior Cabin Floor, Dashboard, Front & Rear Seats (visible through clear glass & open doors!)
  const interiorDash = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.12, 0.34, 0.42), interiorMat);
  interiorDash.position.set(0, 0.78, -0.74);
  group.add(interiorDash);

  const frontLeftSeatBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.54), seatMat);
  frontLeftSeatBase.position.set(-0.4, 0.58, -0.14);
  const frontLeftSeatBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.14), seatMat);
  frontLeftSeatBack.position.set(-0.4, 0.88, 0.08);
  frontLeftSeatBack.rotation.x = 0.14;

  const frontRightSeatBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.54), seatMat);
  frontRightSeatBase.position.set(0.4, 0.58, -0.14);
  const frontRightSeatBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.58, 0.14), seatMat);
  frontRightSeatBack.position.set(0.4, 0.88, 0.08);
  frontRightSeatBack.rotation.x = 0.14;

  const rearBenchBase = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.2, 0.22, 0.56), seatMat);
  rearBenchBase.position.set(0, 0.6, 0.68);
  const rearBenchBack = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.22, 0.58, 0.16), seatMat);
  rearBenchBack.position.set(0, 0.92, 0.94);
  rearBenchBack.rotation.x = 0.15;
  group.add(frontLeftSeatBase, frontLeftSeatBack, frontRightSeatBase, frontRightSeatBack, rearBenchBase, rearBenchBack);

  // Driver seated on the left (-X) so the taxi clearly has a driver inside
  const driverGroup = new THREE.Group();
  driverGroup.position.set(-0.4, 0.68, -0.14);
  const driverShirtMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 });
  const driverSkinMat = new THREE.MeshStandardMaterial({ color: 0xc89572, roughness: 0.62 });
  const driverHairMat = new THREE.MeshStandardMaterial({ color: 0x181310, roughness: 0.88 });
  const dTorso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.24), driverShirtMat);
  dTorso.position.set(0, 0.22, 0.04);
  const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 10), driverSkinMat);
  dHead.position.set(0, 0.54, 0.02);
  const dCap = new THREE.Mesh(new THREE.SphereGeometry(0.142, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), driverHairMat);
  dCap.position.set(0, 0.57, 0.02);
  driverGroup.add(dTorso, dHead, dCap);
  group.add(driverGroup);

  // Visible 3D Seated Passenger inside the Taxi (front-right passenger seat so clearly seen in BOTH Chase & POV!)
  const seatedPassengerGroup = new THREE.Group();
  seatedPassengerGroup.position.set(0.4, 0.68, -0.12);
  seatedPassengerGroup.visible = false;
  const paxShirtMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.65,
    emissive: 0x1e293b,
    emissiveIntensity: 0.28,
  });
  const paxPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 });
  const paxSkinMat = new THREE.MeshStandardMaterial({
    color: 0xd19f7c,
    roughness: 0.6,
    emissive: 0x3a2518,
    emissiveIntensity: 0.2,
  });
  const paxHairMat = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.86 });

  const pLegs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.44), paxPantsMat);
  pLegs.position.set(0, 0.04, -0.14);
  const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.24), paxShirtMat);
  pTorso.position.set(0, 0.24, 0.04);
  const pLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.11), paxShirtMat);
  pLeftArm.position.set(-0.22, 0.22, -0.04);
  pLeftArm.rotation.x = 0.58;
  const pRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.11), paxShirtMat);
  pRightArm.position.set(0.22, 0.22, -0.04);
  pRightArm.rotation.x = 0.58;
  const pHeadGroup = new THREE.Group();
  pHeadGroup.position.set(0, 0.55, 0.03);
  const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), paxSkinMat);
  const pHair = new THREE.Mesh(new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), paxHairMat);
  pHair.position.y = 0.025;
  pHeadGroup.add(pHead, pHair);
  seatedPassengerGroup.add(pLegs, pTorso, pLeftArm, pRightArm, pHeadGroup);
  group.add(seatedPassengerGroup);
  keepVisibleInPov.push(seatedPassengerGroup);

  // Subtle interior cabin dome light glow bar (lights up inside when door opens or passenger is seated!)
  const domeLightMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.25,
    roughness: 0.2,
  });
  const domeLightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.2), domeLightMat);
  domeLightMesh.position.set(0, 1.38, 0.06);
  group.add(domeLightMesh);

  // Hollow Framed Cabin Roof + Slim Yellow Pillars + Clear Front/Rear Glass
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.08, 0.1, cabinLen - 0.28), yellowPaintMat);
  roofSlab.position.set(0, 1.43, 0.1);
  roofSlab.castShadow = true;
  group.add(roofSlab);

  for (const sx of [-1, 1]) {
    const px = sx * (cabinW / 2 - 0.06);
    // Front A-pillar
    const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.09), yellowPaintMat);
    aPillar.position.set(px, 1.12, -cabinLen / 2 + 0.18);
    aPillar.rotation.x = -0.34;
    // Middle B-pillar
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.09), blackBodyMat);
    bPillar.position.set(px, 1.12, 0.34);
    // Rear C-pillar
    const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.6, 0.16), yellowPaintMat);
    cPillar.position.set(px, 1.12, cabinLen / 2 - 0.06);
    cPillar.rotation.x = 0.28;
    // Rear fixed quarter panel below rear window
    const rearSidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.72), blackBodyMat);
    rearSidePanel.position.set(px + sx * 0.04, 0.66, 0.74);
    const rearSideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.62), clearGlassMat);
    rearSideGlass.position.set(px + sx * 0.02, 1.12, 0.74);
    group.add(aPillar, bPillar, cPillar, rearSidePanel, rearSideGlass);
  }

  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.2, 0.56, 0.05), clearGlassMat);
  frontGlass.position.set(0, 1.12, -cabinLen / 2 + 0.15);
  frontGlass.rotation.x = lv >= 3 ? -0.4 : -0.32;
  group.add(frontGlass);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(cabinW - 0.2, 0.52, 0.05), clearGlassMat);
  rearGlass.position.set(0, 1.12, cabinLen / 2 - 0.02);
  rearGlass.rotation.x = 0.32;
  group.add(rearGlass);

  // Hinged 3D Right & Left Passenger Doors with Ultra-Clear "تاكسي الإسكندرية" Door Plaques!
  const doorDecalTex = createAlexTaxiDoorDecalTexture(maxAnisotropy);
  const doorDecalMat = new THREE.MeshStandardMaterial({
    map: doorDecalTex,
    emissiveMap: doorDecalTex,
    emissive: new THREE.Color(0xfffbeb),
    emissiveIntensity: 0.16,
    roughness: 0.28,
    metalness: 0.12,
  });

  const buildHingedDoor = (side: 1 | -1) => {
    // Hinge located at front edge of passenger door (z = -0.68) so door swings cleanly outward!
    const pivot = new THREE.Group();
    pivot.position.set(side * (bodyW / 2 - 0.02), 0.44, -0.68);

    const doorLen = 1.06;
    const doorOuterMats =
      side === 1
        ? [doorDecalMat, blackBodyMat, yellowPaintMat, blackBodyMat, blackBodyMat, blackBodyMat]
        : [blackBodyMat, doorDecalMat, yellowPaintMat, blackBodyMat, blackBodyMat, blackBodyMat];
    const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, doorLen), doorOuterMats);
    lowerPanel.position.set(0, 0.22, doorLen / 2);

    // Door upper window frame + clear glass so passenger is visible sitting inside
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, doorLen), yellowPaintMat);
    topFrame.position.set(-side * 0.04, 0.94, doorLen / 2);
    const rearPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), yellowPaintMat);
    rearPost.position.set(-side * 0.04, 0.68, doorLen - 0.03);
    const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, doorLen - 0.14), clearGlassMat);
    doorGlass.position.set(-side * 0.04, 0.68, doorLen / 2);

    // Chrome door handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.14), chromeMat);
    handle.position.set(side * 0.05, 0.36, doorLen - 0.18);

    pivot.add(lowerPanel, topFrame, rearPost, doorGlass, handle);
    group.add(pivot);
    keepVisibleInPov.push(pivot);
    return pivot;
  };

  const rightDoorPivot = buildHingedDoor(1);
  const leftDoorPivot = buildHingedDoor(-1);

  // Illuminated Roof Lightbox Plaque reading "تاكسي الإسكندرية" (razor-sharp high-contrast day & night!)
  const roofMount = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 0.38), blackBodyMat);
  roofMount.position.set(0, 1.5, -0.04);
  group.add(roofMount);

  const taxiSignTex = createAlexTaxiSignTexture(maxAnisotropy);
  const taxiSignFaceMat = new THREE.MeshStandardMaterial({
    map: taxiSignTex,
    emissiveMap: taxiSignTex,
    emissive: new THREE.Color(0xfff8d6),
    emissiveIntensity: 0.38,
    roughness: 0.26,
    metalness: 0.05,
  });
  const taxiSignSideMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.28,
    roughness: 0.28,
  });
  const roofSignBox = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.36, 0.32), [
    taxiSignSideMat,
    taxiSignSideMat,
    taxiSignSideMat,
    blackBodyMat,
    taxiSignFaceMat,
    taxiSignFaceMat,
  ]);
  roofSignBox.position.set(0, 1.7, -0.04);
  group.add(roofSignBox);

  // Small LED Availability Indicator Strip on top of the "تاكسي الإسكندرية" lightbox (Green = Free, Amber = Busy)
  const roofSignMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.0,
    roughness: 0.24,
  });
  const statusBeacon = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.14), roofSignMat);
  statusBeacon.position.set(0, 1.91, -0.04);
  group.add(statusBeacon);

  // Crisp Rear Trunk "تاكسي الإسكندرية" Plaque (clearly readable in 3rd-person chase camera!)
  const rearBannerTex = createAlexTaxiRearBannerTexture(maxAnisotropy);
  const rearBannerMat = new THREE.MeshStandardMaterial({
    map: rearBannerTex,
    emissiveMap: rearBannerTex,
    emissive: new THREE.Color(0xfff8d6),
    emissiveIntensity: 0.28,
    roughness: 0.26,
    metalness: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const rearBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(1.52, bodyW - 0.28), 0.24),
    rearBannerMat,
  );
  rearBanner.position.set(0, 0.74, bodyLen / 2 + 0.026);
  group.add(rearBanner);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.08, 0.16, 0.16), chromeMat);
  frontBumper.position.set(0, 0.3, -bodyLen / 2 - 0.04);
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.08, 0.16, 0.16), chromeMat);
  rearBumper.position.set(0, 0.3, bodyLen / 2 + 0.04);
  group.add(rearBumper);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.24, 0.06), chromeMat);
  grille.position.set(0, 0.53, -bodyLen / 2 - 0.02);
  group.add(grille);

  const taxiPlateTex = createEgyptianPlateTexture('س ن ق ٤٨٢', '#F97316', maxAnisotropy);
  const plateMat = new THREE.MeshStandardMaterial({
    map: taxiPlateTex,
    emissiveMap: taxiPlateTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.15,
    roughness: 0.35,
  });
  const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.04), plateMat);
  rearPlate.position.set(0, 0.49, bodyLen / 2 + 0.02);
  group.add(rearPlate);

  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.12), yellowPaintMat);
    mirror.position.set(side * (bodyW / 2 + 0.06), 0.9, -0.68);
    group.add(mirror);
  }

  const headlightMat = new THREE.MeshStandardMaterial({
    color: lv >= 3 ? 0xe0f2fe : 0xfef9c3,
    emissive: lv >= 3 ? 0xbae6fd : 0xfef08a,
    emissiveIntensity: lv >= 3 ? 2.1 : 1.5,
  });
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.75,
  });
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), headlightMat);
    hl.position.set(side * (bodyW * 0.33), 0.55, -bodyLen / 2 - 0.02);
    group.add(hl);

    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.06), brakeMat);
    bl.position.set(side * (bodyW * 0.34), 0.55, bodyLen / 2 + 0.02);
    group.add(bl);
    brakeLights.push(bl);
  }

  // Self-Evolving Alexandria Taxi Upgrades (Levels 2, 3 & 4 visually upgrade the car!)
  if (lv >= 2) {
    // Level 2+: Sleek lower side skirts + chrome sport front splitter
    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.35), chromeMat);
      skirt.position.set(side * (bodyW / 2 + 0.01), 0.26, 0);
      group.add(skirt);
    }
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.14, 0.06, 0.28), yellowPaintMat);
    splitter.position.set(0, 0.21, -bodyLen / 2 - 0.06);
    group.add(splitter);
  }

  if (lv >= 3) {
    // Level 3+: Aerodynamic rear sport spoiler + twin chrome exhaust pipes + hood scoop!
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.7, roughness: 0.22 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.1, 0.07, 0.3), spoilerMat);
    wing.position.set(0, 1.07, bodyLen / 2 - 0.18);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.16), yellowPaintMat);
    legL.position.set(-0.56, 0.94, bodyLen / 2 - 0.18);
    const legR = legL.clone();
    legR.position.x = 0.56;
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.09, 0.62), spoilerMat);
    scoop.position.set(0, 0.92, -bodyLen * 0.32);
    group.add(wing, legL, legR, scoop);

    const exGeo = new THREE.CylinderGeometry(0.055, 0.06, 0.28, 8);
    exGeo.rotateX(Math.PI / 2);
    for (const sx of [-0.52, 0.52]) {
      const pipe = new THREE.Mesh(exGeo, chromeMat);
      pipe.position.set(sx, 0.24, bodyLen / 2 + 0.1);
      group.add(pipe);
    }
  }

  if (lv >= 4) {
    // Level 4+: Widebody fender flares + shark-fin roof antenna + front LED bar
    const wideFlareMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.22, metalness: 0.65 });
    for (const side of [-1, 1]) {
      for (const fz of [-bodyLen * 0.31, bodyLen * 0.31]) {
        const flare = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.78), wideFlareMat);
        flare.position.set(side * (bodyW / 2 + 0.03), 0.44, fz);
        group.add(flare);
      }
    }
    const roofFin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.34), wideFlareMat);
    roofFin.position.set(0, 1.54, 0.88);
    group.add(roofFin);

    const frontLedBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.05, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    frontLedBar.position.set(0, 0.36, -bodyLen / 2 - 0.08);
    group.add(frontLedBar);
  }

  if (lv >= 5) {
    // Level 5+: Golden underglow neon + quad exhaust pipes!
    const underglowMat = new THREE.MeshBasicMaterial({
      color: lv >= 7 ? 0xfef08a : 0xfacc15,
      transparent: true,
      opacity: lv >= 7 ? 0.72 : 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(bodyW + 0.62, bodyLen + 0.52), underglowMat);
    glowPlane.rotation.x = -Math.PI / 2;
    glowPlane.position.y = 0.04;
    group.add(glowPlane);

    const exGeo2 = new THREE.CylinderGeometry(0.052, 0.056, 0.3, 8);
    exGeo2.rotateX(Math.PI / 2);
    for (const sx of [-0.66, 0.66]) {
      const outerPipe = new THREE.Mesh(exGeo2, chromeMat);
      outerPipe.position.set(sx, 0.24, bodyLen / 2 + 0.12);
      group.add(outerPipe);
    }
  }

  if (lv >= 6) {
    // Level 6+: High GT dual-deck carbon wing + glowing cyan turbo intake vents!
    const gtCarbonMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.78, roughness: 0.18 });
    const upperWing = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.16, 0.06, 0.34), gtCarbonMat);
    upperWing.position.set(0, 1.24, bodyLen / 2 - 0.14);
    for (const sx of [-1, 1]) {
      const endPlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.42), yellowPaintMat);
      endPlate.position.set(sx * (bodyW / 2 + 0.09), 1.18, bodyLen / 2 - 0.14);
      const turboVent = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.42),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      turboVent.position.set(sx * 0.48, 0.9, -bodyLen * 0.3);
      group.add(endPlate, turboVent);
    }
    group.add(upperWing);
  }

  if (lv >= 7) {
    // Level 7 (Legendary King of Alexandria Taxi): Rear race diffuser + golden crown roof halo + dual cyan/gold accent strips!
    const diffuserMat = new THREE.MeshStandardMaterial({ color: 0x050811, roughness: 0.25, metalness: 0.75 });
    const diffuserBase = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.1, 0.16, 0.22), diffuserMat);
    diffuserBase.position.set(0, 0.22, bodyLen / 2 + 0.08);
    group.add(diffuserBase);
    for (let f = -2; f <= 2; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.26), chromeMat);
      fin.position.set(f * 0.28, 0.22, bodyLen / 2 + 0.1);
      group.add(fin);
    }

    const crownHalo = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.05, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    crownHalo.position.set(0, 1.89, -0.04);
    group.add(crownHalo);

    for (const sx of [-1, 1]) {
      const sideNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.04, 2.5),
        new THREE.MeshBasicMaterial({ color: 0xfde047 }),
      );
      sideNeon.position.set(sx * (bodyW / 2 + 0.06), 0.22, 0.04);
      group.add(sideNeon);
    }
  }

  const wheelPositions: [number, number, number][] = [
    [-bodyW / 2 - 0.02, 0.34, -bodyLen * 0.31],
    [bodyW / 2 + 0.02, 0.34, -bodyLen * 0.31],
    [-bodyW / 2 - 0.02, 0.34, bodyLen * 0.31],
    [bodyW / 2 + 0.02, 0.34, bodyLen * 0.31],
  ];

  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(lv >= 2 ? 0.24 : 0.2, lv >= 2 ? 0.24 : 0.2, 0.26, 10);
  rimGeo.rotateZ(Math.PI / 2);

  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(tireGeo, tireMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheel.add(rim);
    group.add(wheel);
    wheels.push(wheel);
  }

  let passengerSeatedNow = false;
  let doorOpenNow = 0;

  const setDoorOpen = (side: 'right' | 'left' | 'none', openAmt: number) => {
    const clamped = THREE.MathUtils.clamp(openAmt, 0, 1);
    doorOpenNow = clamped;
    const maxAngle = 1.16; // ~66 degrees wide open!
    if (side === 'right') {
      rightDoorPivot.rotation.y = clamped * maxAngle;
      leftDoorPivot.rotation.y = 0;
    } else if (side === 'left') {
      leftDoorPivot.rotation.y = -clamped * maxAngle;
      rightDoorPivot.rotation.y = 0;
    } else {
      rightDoorPivot.rotation.y = 0;
      leftDoorPivot.rotation.y = 0;
    }
    domeLightMat.emissiveIntensity = clamped > 0.05 ? 2.4 : passengerSeatedNow ? 0.95 : 0.25;
  };

  const setPassengerSeated = (seated: boolean, shirtHex?: number) => {
    passengerSeatedNow = seated;
    seatedPassengerGroup.visible = seated;
    if (shirtHex !== undefined) {
      paxShirtMat.color.setHex(shirtHex);
    }
    domeLightMat.emissiveIntensity = doorOpenNow > 0.05 ? 2.4 : seated ? 0.95 : 0.25;
  };

  const animatePassenger = (time: number) => {
    if (!passengerSeatedNow) return;
    pHeadGroup.rotation.y = Math.sin(time * 1.45) * 0.22;
    pHeadGroup.rotation.x = Math.sin(time * 2.3) * 0.05;
    seatedPassengerGroup.position.y = 0.68 + Math.sin(time * 3.8) * 0.008;
  };

  return {
    group,
    wheels,
    brakeLights,
    roofSignMat,
    setDoorOpen,
    setPassengerSeated,
    animatePassenger,
    keepVisibleInPov,
  };
}

function attachCarPovCockpit(
  group: THREE.Group,
  maxAnisotropy: number,
  options: {
    driverX: number;
    dashY: number;
    dashZ: number;
    pillarTopY: number;
    hideInPov: THREE.Object3D[];
    onExtraAnimate?: (time: number, sirenOn: boolean) => void;
  },
): Pick<PlayerVehicleRig, 'setPovMode' | 'setMirrorTexture' | 'animateVehicle'> {
  const cockpit = new THREE.Group();
  cockpit.visible = false;
  group.add(cockpit);

  const dashUpdater = createCarDashUpdater(maxAnisotropy);
  const mirrorUpdater = createMirrorReflectionUpdater(maxAnisotropy);

  const dashMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 });
  const gloveMat = new THREE.MeshStandardMaterial({ color: 0xc89572, roughness: 0.65 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.74 });

  // Dashboard cowling + glowing speedometer/RPM cluster
  const dashBody = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.24, 0.44), dashMat);
  dashBody.position.set(0, options.dashY - 0.08, options.dashZ - 0.14);
  const gaugeHood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.2), dashMat);
  gaugeHood.position.set(options.driverX, options.dashY + 0.07, options.dashZ - 0.04);
  const gaugeScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.135),
    new THREE.MeshStandardMaterial({
      map: dashUpdater.texture,
      emissiveMap: dashUpdater.texture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.25,
      roughness: 0.2,
    }),
  );
  gaugeScreen.position.set(options.driverX, options.dashY + 0.07, options.dashZ + 0.064);
  gaugeScreen.rotation.x = -0.18;

  // Steering Wheel + Driver Hands rotating together
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(options.driverX, options.dashY + 0.05, options.dashZ + 0.19);
  wheelPivot.rotation.x = 0.42;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.018, 10, 24), trimMat);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 12), dashMat);
  hub.rotation.x = Math.PI / 2;
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.025, 0.02), trimMat);
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.02), trimMat);
  spokeV.position.y = -0.08;
  wheelPivot.add(rim, hub, spokeH, spokeV);

  for (const sx of [-1, 1]) {
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.068, 0.045), gloveMat);
    hand.position.set(sx * 0.165, 0.01, 0.01);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 0.28, 8), sleeveMat);
    arm.position.set(sx * 0.2, -0.1, 0.12);
    arm.rotation.x = 0.92;
    arm.rotation.z = sx * -0.22;
    wheelPivot.add(hand, arm);
  }

  // Windshield A-pillars & Interior Top Rearview Mirror
  for (const sx of [-0.74, 0.74]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, options.pillarTopY - options.dashY + 0.08, 0.07), dashMat);
    pillar.position.set(sx, (options.pillarTopY + options.dashY) * 0.5, options.dashZ - 0.16);
    pillar.rotation.x = 0.36;
    cockpit.add(pillar);
  }

  const mirrorGlassGeo = new THREE.PlaneGeometry(0.24, 0.068);
  const uv = mirrorGlassGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setX(i, 1 - uv.getX(i));
  }
  const mirrorMat = new THREE.MeshStandardMaterial({
    map: mirrorUpdater.texture,
    emissiveMap: mirrorUpdater.texture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.4,
    roughness: 0.08,
    metalness: 0.2,
  });
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.082, 0.025), dashMat);
  mirrorFrame.position.set(0, options.pillarTopY - 0.02, options.dashZ - 0.02);
  const mirrorGlass = new THREE.Mesh(mirrorGlassGeo, mirrorMat);
  mirrorGlass.position.set(0, options.pillarTopY - 0.02, options.dashZ - 0.005);

  cockpit.add(dashBody, gaugeHood, gaugeScreen, wheelPivot, mirrorFrame, mirrorGlass);

  let isPovNow = false;
  let steerVis = 0;
  let customMirrorTex: THREE.Texture | null = null;

  const setPovMode = (isPov: boolean) => {
    if (isPovNow === isPov) return;
    isPovNow = isPov;
    cockpit.visible = isPov;
    for (const obj of options.hideInPov) {
      obj.visible = !isPov;
    }
  };

  const setMirrorTexture = (tex: THREE.Texture | null) => {
    if (customMirrorTex === tex) return;
    customMirrorTex = tex;
    const activeTex = tex ?? mirrorUpdater.texture;
    mirrorMat.map = activeTex;
    mirrorMat.emissiveMap = activeTex;
    mirrorMat.emissiveIntensity = tex ? 0.22 : 0.4;
    mirrorMat.needsUpdate = true;
  };

  return {
    setPovMode,
    setMirrorTexture,
    animateVehicle: (time, dt, _stunt, sirenOn, steerInput = 0, opts) => {
      options.onExtraAnimate?.(time, sirenOn);
      setPovMode(Boolean(opts?.isPov));
      if (!isPovNow) return;

      steerVis = THREE.MathUtils.damp(steerVis, steerInput, 10, dt);
      wheelPivot.rotation.z = -steerVis * 0.72;
      dashUpdater.update(
        opts?.speedKmh ?? 0,
        opts?.rpmRatio ?? 0.25,
        opts?.gear ?? 1,
        opts?.fuelPct ?? 100,
        Boolean(opts?.braking),
      );
      if (!customMirrorTex) {
        mirrorUpdater.update(
          opts?.atmosphere ?? 'day',
          opts?.tilt ?? 0,
          opts?.speedKmh ?? 0,
          opts?.rearTrafficHint ?? null,
        );
      }
    },
  };
}

export interface BikeVisualOverride {
  paintHex?: number;
  accentHex?: number;
  isVespa?: boolean;
  hideRiderForPreview?: boolean;
  isPoliceMoto?: boolean;
  tuning?: MotoTuningConfig;
}

export function buildPlayerVehicle3D(
  kind: PlayerVehicleKind,
  taxiLevel = 1,
  isRace = false,
  maxAnisotropy = 4,
  riderStyle: RiderStyle = 'green_tracksuit',
  bikeOverride?: BikeVisualOverride,
): PlayerVehicleRig {
  if (kind === 'taxi') {
    const base = buildPlayerTaxi3D(taxiLevel, maxAnisotropy);
    if (isRace) {
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
      const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 2.2), stripeMat);
      hoodStripe.position.set(0, 0.87, -0.8);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.08, 0.34), wingMat);
      spoiler.position.set(0, 1.02, 1.92);
      base.group.add(hoodStripe, spoiler);
    }
    const keepSet = new Set<THREE.Object3D>(base.keepVisibleInPov);
    const hideMeshes = base.group.children.filter((c) => c.position.y > 0.95 && !keepSet.has(c));
    const pov = attachCarPovCockpit(base.group, maxAnisotropy, {
      driverX: -0.34,
      dashY: 1.05,
      dashZ: -0.78,
      pillarTopY: 1.46,
      hideInPov: hideMeshes,
      onExtraAnimate: (time) => {
        base.animatePassenger(time);
      },
    });
    return {
      group: base.group,
      wheels: base.wheels,
      brakeLights: base.brakeLights,
      roofSignMat: base.roofSignMat,
      setDoorOpen: base.setDoorOpen,
      setPassengerSeated: base.setPassengerSeated,
      ...pov,
    };
  }

  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const brakeLights: THREE.Mesh[] = [];

  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.25, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.25,
    opacity: 0.88,
    transparent: true,
  });
  const headLampMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 1.8,
  });
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0x991b1b,
    emissiveIntensity: 0.7,
  });

  if (kind === 'mashrou3') {
    // Alexandria White & Striped Mashrou3 Microbus (ميكروباص أبيض بخط ملون)
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const amberStripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.06, 1.58, 4.95), whiteMat);
    body.position.y = 1.08;
    body.castShadow = true;
    const blueLine = new THREE.Mesh(new THREE.BoxGeometry(2.09, 0.26, 4.97), stripeMat);
    blueLine.position.y = 0.86;
    const goldLine = new THREE.Mesh(new THREE.BoxGeometry(2.09, 0.1, 4.97), amberStripeMat);
    goldLine.position.y = 1.03;

    const wind = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.62, 0.08), glassMat);
    wind.position.set(0, 1.4, -2.47);
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.48, 3.75), glassMat);
    sideGlass.position.set(0, 1.4, 0.2);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.14, 2.9), rackMat);
    rack.position.set(0, 1.94, 0.32);

    for (const sx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), headLampMat);
      hl.position.set(sx, 0.68, -2.49);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), brakeMat);
      bl.position.set(sx, 0.66, 2.49);
      group.add(hl, bl);
      brakeLights.push(bl);
    }

    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.28, 10);
    rimGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.98, -1.55], [0.98, -1.55], [-0.98, 1.55], [0.98, 1.55]]) {
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(wx, 0.36, wz);
      wheel.add(new THREE.Mesh(rimGeo, rimMat));
      group.add(wheel);
      wheels.push(wheel);
    }
    group.add(body, blueLine, goldLine, wind, sideGlass, rack);
    const pov = attachCarPovCockpit(group, maxAnisotropy, {
      driverX: -0.44,
      dashY: 1.48,
      dashZ: -1.65,
      pillarTopY: 1.98,
      hideInPov: [body, blueLine, goldLine, wind, sideGlass, rack],
    });
    return { group, wheels, brakeLights, ...pov };
  }

  if (kind === 'police_car') {
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const navyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.58, 4.35), whiteMat);
    lower.position.y = 0.52;
    lower.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.93, 0.18, 4.37), navyMat);
    stripe.position.y = 0.62;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.56, 2.25), whiteMat);
    cabin.position.set(0, 1.09, 0.12);
    cabin.castShadow = true;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.38, 1.95), glassMat);
    glass.position.set(0, 1.1, 0.12);

    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 0.28), darkMat);
    barBase.position.set(0, 1.4, 0.05);
    const redBeaconMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.8 });
    const blueBeaconMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.3 });
    const redBulb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.24), redBeaconMat);
    redBulb.position.set(-0.3, 1.48, 0.05);
    const blueBulb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.24), blueBeaconMat);
    blueBulb.position.set(0.3, 1.48, 0.05);

    for (const sx of [-0.64, 0.64]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), headLampMat);
      hl.position.set(sx, 0.55, -2.19);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.06), brakeMat);
      bl.position.set(sx, 0.55, 2.19);
      group.add(hl, bl);
      brakeLights.push(bl);
    }

    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10);
    rimGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.95, -1.35], [0.95, -1.35], [-0.95, 1.35], [0.95, 1.35]]) {
      const wheel = new THREE.Mesh(tireGeo, tireMat);
      wheel.position.set(wx, 0.34, wz);
      wheel.add(new THREE.Mesh(rimGeo, rimMat));
      group.add(wheel);
      wheels.push(wheel);
    }

    group.add(lower, stripe, cabin, glass, barBase, redBulb, blueBulb);
    const pov = attachCarPovCockpit(group, maxAnisotropy, {
      driverX: -0.34,
      dashY: 1.05,
      dashZ: -0.78,
      pillarTopY: 1.46,
      hideInPov: [cabin, glass, barBase, redBulb, blueBulb],
      onExtraAnimate: (time, sirenOn) => {
        const rate = sirenOn ? 10 : 4;
        const flash = Math.floor(time * rate) % 2 === 0;
        redBeaconMat.emissiveIntensity = flash ? (sirenOn ? 3.8 : 1.6) : 0.2;
        blueBeaconMat.emissiveIntensity = flash ? 0.2 : (sirenOn ? 3.8 : 1.6);
      },
    });
    return { group, wheels, brakeLights, ...pov };
  }

  // ============================================================================
  // MODERN SPORT MOTORCYCLE & DETAILED STYLIZED LOW-POLY PLAYER CHARACTER
  // ============================================================================
  const isSuper = kind === 'black_supermoto';
  const isRetroVespa = Boolean(bikeOverride?.isVespa);
  const bikePivot = new THREE.Group();
  bikePivot.position.set(0, 0.33, 0.68); // Pivoted cleanly around rear axle for Wheelie ("حصان")
  group.add(bikePivot);

  const bikeBody = new THREE.Group();
  bikeBody.position.set(0, -0.33, -0.68);
  bikePivot.add(bikeBody);

  // Sportbike & Retro Vespa Materials
  const paintColor = bikeOverride?.paintHex ?? (isSuper ? 0x111827 : 0xdc2626);
  const accentColor = isRetroVespa ? 0xfef3c7 : isSuper ? 0x2563eb : 0x0f172a;
  const stripeAccentHex = bikeOverride?.accentHex ?? (isSuper ? 0x60a5fa : 0xf8fafc);

  const fairingPaintMat = new THREE.MeshPhysicalMaterial({
    color: paintColor,
    roughness: isSuper ? 0.32 : 0.16,
    metalness: isSuper ? 0.55 : 0.35,
    clearcoat: isSuper ? 0.5 : 0.96,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.35,
  });
  const bellyTrimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.42,
    metalness: 0.42,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.22,
    metalness: 0.88,
    envMapIntensity: 1.35,
  });
  const rimMetalMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.22,
    metalness: 0.88,
    envMapIntensity: 1.4,
  });
  const rimLedMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });
  const rimLedNodes: THREE.Object3D[] = [];
  const goldForkMat = new THREE.MeshStandardMaterial({
    color: isRetroVespa ? 0xd1d5db : 0xd97706,
    roughness: 0.24,
    metalness: 0.85,
    envMapIntensity: 1.3,
  });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: isRetroVespa ? 0xf59e0b : bikeOverride?.accentHex ?? (isSuper ? 0x2563eb : 0xef4444),
    roughness: 0.3,
    metalness: 0.55,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: isRetroVespa ? 0x334155 : 0x18181b,
    roughness: 0.52,
    metalness: 0.28,
  });
  const seatLeatherMat = new THREE.MeshStandardMaterial({
    color: isRetroVespa ? 0x78350f : 0x111317,
    roughness: 0.72,
  });
  const visorShieldMat = new THREE.MeshPhysicalMaterial({
    color: 0x090e1a,
    roughness: 0.06,
    metalness: 0.35,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });
  const ledHeadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 3.0,
    roughness: 0.12,
  });
  const drlMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 2.2,
  });
  const mirrorUpdater = createMirrorReflectionUpdater(maxAnisotropy);
  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    map: mirrorUpdater.texture,
    emissiveMap: mirrorUpdater.texture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.48,
    roughness: 0.06,
    metalness: 0.25,
  });
  const dashUpdater = createMotorcycleDashUpdater(maxAnisotropy);
  const rimStripeMat = new THREE.MeshStandardMaterial({
    color: isRetroVespa ? 0xfef3c7 : bikeOverride?.accentHex ?? (isSuper ? 0x3b82f6 : 0xef4444),
    roughness: 0.28,
    metalness: 0.48,
  });

  // Helper: Extrude a side silhouette (shape +x -> -Z forward, shape +y -> +Y up)
  const makeSideExtrude = (
    shape: THREE.Shape,
    width: number,
    bevel = 0.028,
  ): THREE.ExtrudeGeometry => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, -width / 2);
    geo.rotateY(Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  };

  // 1. Detailed Front & Rear Sport Wheels (Torus Tire + Alloy Rim + Split 5-Spoke Y + Brake Rotor)
  const makeSportWheel = (radius: number, tireTube: number, isFront: boolean): THREE.Mesh => {
    const tireGeo = new THREE.TorusGeometry(radius - tireTube, tireTube, 14, 28);
    tireGeo.rotateY(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;

    const rimRadius = radius - tireTube * 1.85;
    const rimRingGeo = new THREE.TorusGeometry(rimRadius, 0.019, 8, 24);
    rimRingGeo.rotateY(Math.PI / 2);
    const rimRing = new THREE.Mesh(rimRingGeo, rimMetalMat);

    const stripeGeo = new THREE.TorusGeometry(rimRadius + 0.015, 0.01, 6, 24);
    stripeGeo.rotateY(Math.PI / 2);
    const stripeRing = new THREE.Mesh(stripeGeo, rimStripeMat);

    // Tunable Rim & Valve LED Ring + Twin Glowing Valve Caps (spins brightly with the wheel!)
    const ledRingGeo = new THREE.TorusGeometry(rimRadius + 0.008, 0.011, 6, 24);
    ledRingGeo.rotateY(Math.PI / 2);
    const wheelLedGroup = new THREE.Group();
    wheelLedGroup.visible = false;
    const ledRingL = new THREE.Mesh(ledRingGeo, rimLedMat);
    ledRingL.position.x = -0.048;
    const ledRingR = new THREE.Mesh(ledRingGeo, rimLedMat);
    ledRingR.position.x = 0.048;
    const valveGeo = new THREE.SphereGeometry(0.022, 8, 6);
    const valve1 = new THREE.Mesh(valveGeo, rimLedMat);
    valve1.position.set(0, rimRadius - 0.01, 0);
    const valve2 = new THREE.Mesh(valveGeo, rimLedMat);
    valve2.position.set(0, -(rimRadius - 0.01), 0);
    wheelLedGroup.add(ledRingL, ledRingR, valve1, valve2);
    rimLedNodes.push(wheelLedGroup);

    const hubGeo = new THREE.CylinderGeometry(0.056, 0.056, isFront ? 0.14 : 0.19, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, carbonMat);

    // 5 Split Alloy Y-Spokes
    const spokeGeo = new THREE.BoxGeometry(0.028, rimRadius * 1.9, 0.02);
    for (let s = 0; s < 5; s++) {
      const sp = new THREE.Mesh(spokeGeo, rimMetalMat);
      sp.rotation.x = (s * Math.PI) / 5;
      tireMesh.add(sp);
    }

    // Slotted Steel Brake Rotor Disc
    const rotorGeo = new THREE.CylinderGeometry(rimRadius * 0.74, rimRadius * 0.74, 0.016, 18);
    rotorGeo.rotateZ(Math.PI / 2);
    const rotor = new THREE.Mesh(rotorGeo, alloyMat);
    rotor.position.x = isFront ? -0.075 : 0.092;

    tireMesh.add(rimRing, stripeRing, wheelLedGroup, hub, rotor);
    return tireMesh;
  };

  const frontWheel = makeSportWheel(0.31, 0.078, true);
  const rearWheel = makeSportWheel(0.33, 0.092, false);
  rearWheel.position.set(0, 0.33, 0.68);
  wheels.push(frontWheel, rearWheel);
  bikeBody.add(rearWheel);

  // Rear Brake Caliper mounted to swingarm axle
  const rearCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.07), caliperMat);
  rearCaliper.position.set(0.098, 0.44, 0.61);
  bikeBody.add(rearCaliper);

  // 2. Steerable Front End (Gold Inverted Forks, Front Wheel, Caliper, Fender, Handlebars, TFT Dash)
  const steerAssembly = new THREE.Group();
  steerAssembly.position.set(0, 0.88, -0.52);
  bikeBody.add(steerAssembly);

  // Mount front wheel inside steerAssembly so steering visibly turns the wheel & forks together!
  frontWheel.position.set(0, -0.57, -0.26);
  steerAssembly.add(frontWheel);

  for (const sx of [-0.115, 0.115]) {
    const upperFork = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.026, 0.44, 10), goldForkMat);
    upperFork.position.set(sx, -0.18, -0.09);
    upperFork.rotation.x = 0.42;
    const lowerFork = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.38, 10), alloyMat);
    lowerFork.position.set(sx, -0.42, -0.19);
    lowerFork.rotation.x = 0.42;
    steerAssembly.add(upperFork, lowerFork);
  }
  const frontCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.085, 0.065), caliperMat);
  frontCaliper.position.set(-0.08, -0.48, -0.18);
  steerAssembly.add(frontCaliper);

  // Sculpted Front Mudguard Fender (shares fairingPaintMat so live paint & finish apply cleanly)
  const fenderGeo = new THREE.CylinderGeometry(0.335, 0.335, 0.175, 14, 1, true, -Math.PI * 0.36, Math.PI * 0.68);
  fenderGeo.rotateZ(Math.PI / 2);
  fairingPaintMat.side = THREE.DoubleSide;
  const frontFender = new THREE.Mesh(fenderGeo, fairingPaintMat);
  frontFender.position.set(0, -0.56, -0.26);
  steerAssembly.add(frontFender);

  // Triple Clamp & Sport Clip-on Handlebars ("جادون") + Grips + Brake Levers
  const tripleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.042, 0.095), carbonMat);
  tripleClamp.position.set(0, 0.05, 0.01);
  const stemNut = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 6), goldForkMat);
  stemNut.position.set(0, 0.075, 0.01);
  steerAssembly.add(tripleClamp, stemNut);

  const gripPosX = 0.29;
  const gripPosY = 0.08;
  const gripPosZ = 0.07;
  const brakeLevers: THREE.Mesh[] = [];
  let rightThrottleGrip: THREE.Mesh | null = null;

  for (const sx of [-1, 1]) {
    const barHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), alloyMat);
    barHalf.rotation.z = Math.PI / 2;
    barHalf.rotation.y = sx * -0.22;
    barHalf.position.set(sx * 0.19, gripPosY - 0.01, gripPosZ - 0.02);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.13, 12), carbonMat);
    grip.rotation.z = Math.PI / 2;
    grip.rotation.y = sx * -0.22;
    grip.position.set(sx * gripPosX, gripPosY, gripPosZ);
    if (sx === 1) rightThrottleGrip = grip;

    const barEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.03, 8), rimStripeMat);
    barEnd.rotation.z = Math.PI / 2;
    barEnd.position.set(sx * (gripPosX + 0.065), gripPosY, gripPosZ + 0.014);

    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.022), alloyMat);
    lever.position.set(sx * (gripPosX - 0.02), gripPosY - 0.014, gripPosZ - 0.048);
    brakeLevers.push(lever);

    steerAssembly.add(barHalf, grip, barEnd, lever);
  }

  // Digital TFT Speedometer Dash Cluster (Live Dynamic CanvasTexture!)
  const dashFrame = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.098, 0.032), carbonMat);
  dashFrame.position.set(0, 0.105, -0.095);
  dashFrame.rotation.x = -0.58;
  const dashScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.17, 0.08),
    new THREE.MeshStandardMaterial({
      map: dashUpdater.texture,
      emissiveMap: dashUpdater.texture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.3,
      roughness: 0.16,
    }),
  );
  dashScreen.position.set(0, 0.114, -0.076);
  dashScreen.rotation.x = -0.58;
  steerAssembly.add(dashFrame, dashScreen);

  // 3. Sculpted Aerodynamic Fairing Body (Nose Cowl + Side Winglet Fairings + Belly Pan + Fuel Tank + Sport Tail)
  const noseShape = new THREE.Shape();
  noseShape.moveTo(0.18, 0.62);
  noseShape.lineTo(0.95, 0.78); // sharp aerodynamic nose beak
  noseShape.lineTo(0.86, 0.99); // upper cowl
  noseShape.lineTo(0.48, 1.07); // windscreen base
  noseShape.lineTo(0.18, 0.95);
  noseShape.lineTo(0.1, 0.56);
  noseShape.closePath();
  const noseFairing = new THREE.Mesh(makeSideExtrude(noseShape, 0.36, 0.03), fairingPaintMat);
  noseFairing.castShadow = true;

  // Lower Aerodynamic Belly Pan & Radiator Core
  const bellyShape = new THREE.Shape();
  bellyShape.moveTo(-0.34, 0.28);
  bellyShape.lineTo(0.44, 0.29);
  bellyShape.lineTo(0.6, 0.56);
  bellyShape.lineTo(0.18, 0.63);
  bellyShape.lineTo(-0.28, 0.48);
  bellyShape.closePath();
  const bellyPan = new THREE.Mesh(makeSideExtrude(bellyShape, 0.32, 0.022), bellyTrimMat);

  const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.05), carbonMat);
  radiator.position.set(0, 0.6, -0.58);
  radiator.rotation.x = 0.28;

  // Exposed Sport Trellis Frame Side Tubes
  for (const sx of [-0.145, 0.145]) {
    const trellisCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.88, -0.42),
      new THREE.Vector3(sx, 0.76, -0.08),
      new THREE.Vector3(sx, 0.62, 0.18),
    ]);
    const trellisTube = new THREE.Mesh(
      new THREE.TubeGeometry(trellisCurve, 8, 0.017, 6, false),
      isSuper ? alloyMat : caliperMat,
    );
    bikeBody.add(trellisTube);
  }

  // Sculpted Side Fairing Winglet Panels (Left & Right) + Racing Stripes
  const sideWingShape = new THREE.Shape();
  sideWingShape.moveTo(-0.08, 0.54);
  sideWingShape.lineTo(0.7, 0.75);
  sideWingShape.lineTo(0.58, 0.93);
  sideWingShape.lineTo(0.06, 0.86);
  sideWingShape.closePath();
  const sideWingGeo = makeSideExtrude(sideWingShape, 0.035, 0.018);
  for (const sx of [-0.19, 0.19]) {
    const sw = new THREE.Mesh(sideWingGeo, fairingPaintMat);
    sw.position.x = sx;
    const decal = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.045, 0.44),
      new THREE.MeshStandardMaterial({ color: stripeAccentHex, roughness: 0.32 }),
    );
    decal.position.set(sx + Math.sign(sx) * 0.025, 0.77, -0.34);
    decal.rotation.x = -0.22;
    bikeBody.add(sw, decal);
  }

  // Sculpted Sport Fuel Tank + Knee Grip Pads
  const tankShape = new THREE.Shape();
  tankShape.moveTo(-0.18, 0.75);
  tankShape.lineTo(0.38, 0.88);
  tankShape.lineTo(0.25, 1.04);
  tankShape.lineTo(-0.06, 1.01);
  tankShape.lineTo(-0.24, 0.84);
  tankShape.closePath();
  const fuelTank = new THREE.Mesh(makeSideExtrude(tankShape, 0.34, 0.035), fairingPaintMat);
  fuelTank.castShadow = true;

  const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.026, 12), alloyMat);
  tankCap.position.set(0, 1.05, -0.14);

  for (const sx of [-0.18, 0.18]) {
    const tankPad = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.1, 0.24), carbonMat);
    tankPad.position.set(sx, 0.89, -0.04);
    bikeBody.add(tankPad);
  }

  // Curved Double-Bubble Smoked Windscreen Visor
  const shieldGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.3, 14, 1, true, -Math.PI * 0.34, Math.PI * 0.68);
  const windShield = new THREE.Mesh(shieldGeo, visorShieldMat);
  windShield.position.set(0, 1.07, -0.49);
  windShield.rotation.x = -0.82;

  // Side Mirrors on Nose Cowl ("مرايا جانبية") — Stock Group + Toggleable Sport Aerodynamic Mirrors
  const motoMirrorPlaneGeo = new THREE.PlaneGeometry(0.136, 0.072);
  const mUv = motoMirrorPlaneGeo.attributes.uv;
  for (let i = 0; i < mUv.count; i++) {
    mUv.setX(i, 1 - mUv.getX(i));
  }
  const stockMirrorsGroup = new THREE.Group();
  const sportMirrorsGroup = new THREE.Group();
  sportMirrorsGroup.visible = false;
  const sportWingMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.24,
    metalness: 0.85,
  });
  for (const sx of [-1, 1]) {
    const stalkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.18, 1.02, -0.6),
      new THREE.Vector3(sx * 0.28, 1.1, -0.55),
      new THREE.Vector3(sx * 0.34, 1.15, -0.52),
    ]);
    const stalk = new THREE.Mesh(new THREE.TubeGeometry(stalkCurve, 6, 0.012, 6, false), carbonMat);

    const mirrorPod = new THREE.Mesh(new THREE.BoxGeometry(0.158, 0.088, 0.042), bellyTrimMat);
    mirrorPod.position.set(sx * 0.345, 1.15, -0.525);
    mirrorPod.rotation.y = sx * -0.32;
    mirrorPod.rotation.x = -0.16;

    const mirrorGlass = new THREE.Mesh(motoMirrorPlaneGeo, mirrorGlassMat);
    mirrorGlass.position.set(sx * 0.345, 1.15, -0.501);
    mirrorGlass.rotation.y = sx * -0.32;
    mirrorGlass.rotation.x = -0.16;
    stockMirrorsGroup.add(stalk, mirrorPod, mirrorGlass);

    // Sleek Low-Profile Aerodynamic Winglet Sport Mirrors ("مرايا رياضية")
    const sArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.055), sportWingMat);
    sArm.position.set(sx * 0.29, 1.08, -0.57);
    sArm.rotation.z = sx * 0.22;
    sArm.rotation.y = sx * -0.26;
    const sGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.014, 0.062), goldForkMat);
    sGoldTrim.position.set(sx * 0.37, 1.12, -0.545);
    sGoldTrim.rotation.y = sx * -0.32;
    const sGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.052), mirrorGlassMat);
    sGlass.position.set(sx * 0.37, 1.115, -0.512);
    sGlass.rotation.y = sx * -0.32;
    sGlass.rotation.x = -0.12;
    sportMirrorsGroup.add(sArm, sGoldTrim, sGlass);
  }
  bikeBody.add(stockMirrorsGroup, sportMirrorsGroup);

  // Glowing Twin LED Headlights, RAM Air Duct & DRL Strip ("كشاف أمامي مضيء")
  for (const sx of [-0.095, 0.095]) {
    const headPod = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.072, 0.065), ledHeadMat);
    headPod.position.set(sx, 0.85, -0.96);
    headPod.rotation.y = sx > 0 ? -0.24 : 0.24;
    bikeBody.add(headPod);
  }
  const ramIntake = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.08), carbonMat);
  ramIntake.position.set(0, 0.81, -0.95);
  const drlBrow = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.025, 0.055), drlMat);
  drlBrow.position.set(0, 0.915, -0.94);

  // Upswept Sport Tail Section + Stepped Sport Seat ("مقعد رياضي") + LED Brake Light
  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.92, 0.9);
  tailShape.lineTo(-0.22, 0.72);
  tailShape.lineTo(-0.28, 0.87);
  tailShape.lineTo(-0.84, 1.0);
  tailShape.closePath();
  const tailCowl = new THREE.Mesh(makeSideExtrude(tailShape, 0.28, 0.025), fairingPaintMat);
  tailCowl.castShadow = true;

  const riderSeat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.085, 0.43), seatLeatherMat);
  riderSeat.position.set(0, 0.785, 0.14);
  riderSeat.rotation.x = 0.08;

  const pillionSeat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.35), seatLeatherMat);
  pillionSeat.position.set(0, 0.915, 0.56);
  pillionSeat.rotation.x = 0.22;

  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.068, 0.055), brakeMat);
  tailLight.position.set(0, 0.945, 0.93);
  brakeLights.push(tailLight);

  const plateHolder = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.03), carbonMat);
  plateHolder.position.set(0, 0.8, 0.93);
  plateHolder.rotation.x = 0.35;

  // Optional Egyptian Traffic Police Motorcycle Flashing Red & Blue Beacons
  let motoPoliceRedMat: THREE.MeshStandardMaterial | null = null;
  let motoPoliceBlueMat: THREE.MeshStandardMaterial | null = null;
  if (bikeOverride?.isPoliceMoto) {
    motoPoliceRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 2.6,
    });
    motoPoliceBlueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.35,
    });
    const frontPodBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.055, 0.06), carbonMat);
    frontPodBase.position.set(0, 0.96, -0.84);
    const fRed = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.065), motoPoliceRedMat);
    fRed.position.set(-0.09, 0.96, -0.855);
    const fBlue = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.065), motoPoliceBlueMat);
    fBlue.position.set(0.09, 0.96, -0.855);

    // Tall rear police mast + strobe beacon visible in 3rd-person too
    const rearMast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.44, 8), alloyMat);
    rearMast.position.set(-0.14, 1.18, 0.78);
    const rearBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 10), motoPoliceBlueMat);
    rearBeacon.position.set(-0.14, 1.42, 0.78);
    bikeBody.add(frontPodBase, fRed, fBlue, rearMast, rearBeacon);
  }

  // 4. Engine Crankcase, Aluminum Swingarm, Mono-Shock, Footpegs & Sculpted Lathe Exhaust ("شكمان خلفي")
  const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.32, 0.42), carbonMat);
  engineBlock.position.set(0, 0.52, -0.05);
  const clutchCover = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.33, 14), alloyMat);
  clutchCover.rotation.z = Math.PI / 2;
  clutchCover.position.set(0, 0.48, 0.02);

  for (const sx of [-0.145, 0.145]) {
    const swingarm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.078, 0.65), alloyMat);
    swingarm.position.set(sx, 0.38, 0.39);
    swingarm.rotation.x = 0.12;
    bikeBody.add(swingarm);
  }
  const shockSpring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.26, 10),
    caliperMat,
  );
  shockSpring.position.set(0, 0.55, 0.32);
  shockSpring.rotation.x = -0.6;

  // Footpegs ("دواسات الموتوسيكل")
  for (const sx of [-1, 1]) {
    const pegBracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), alloyMat);
    pegBracket.position.set(sx * 0.16, 0.4, 0.08);
    const pegBar = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.115, 8), carbonMat);
    pegBar.rotation.z = Math.PI / 2;
    pegBar.position.set(sx * 0.22, 0.38, 0.08);
    bikeBody.add(pegBracket, pegBar);
  }

  // Swept Rear Exhaust Pipe & Lathe Tapered Titanium Muffler ("شكمان خلفي")
  const exhaustCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.42, -0.22),
    new THREE.Vector3(0.18, 0.32, 0.14),
    new THREE.Vector3(0.21, 0.4, 0.48),
    new THREE.Vector3(0.22, 0.52, 0.72),
  ]);
  const headerPipe = new THREE.Mesh(new THREE.TubeGeometry(exhaustCurve, 16, 0.027, 8, false), alloyMat);
  const mufflerPts = [
    new THREE.Vector2(0.028, 0.0),
    new THREE.Vector2(0.056, 0.07),
    new THREE.Vector2(0.062, 0.38),
    new THREE.Vector2(0.044, 0.42),
    new THREE.Vector2(0.0, 0.42),
  ];
  const mufflerGeo = new THREE.LatheGeometry(mufflerPts, 12);
  const mufflerBody = new THREE.Mesh(mufflerGeo, alloyMat);
  mufflerBody.position.set(0.225, 0.49, 0.69);
  mufflerBody.rotation.x = Math.PI / 2 - 0.38;
  const mufflerTip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.07, 12), carbonMat);
  mufflerTip.position.set(0.225, 0.675, 1.04);
  mufflerTip.rotation.x = Math.PI / 2 - 0.38;

  // ============================================================================
  // GARAGE & TUNING 3D SYSTEMS (Lights, LEDs, Exhaust Variants + Sparks, Bling)
  // ============================================================================

  // A. Underglow Neon Strip + Ground Glow Disc + Downward PointLight ("نيون سفلي")
  const underglowGroup = new THREE.Group();
  underglowGroup.visible = false;
  const underglowTubeMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 3.4,
    roughness: 0.15,
  });
  const neonTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.96, 8), underglowTubeMat);
  neonTubeL.rotation.x = Math.PI / 2;
  neonTubeL.position.set(-0.14, 0.22, 0.02);
  const neonTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.96, 8), underglowTubeMat);
  neonTubeR.rotation.x = Math.PI / 2;
  neonTubeR.position.set(0.14, 0.22, 0.02);

  // Soft radial neon pool texture projected onto the sidewalk directly below the motorcycle
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const gCtx = glowCanvas.getContext('2d')!;
  const rad = gCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  rad.addColorStop(0, 'rgba(255,255,255,0.92)');
  rad.addColorStop(0.45, 'rgba(255,255,255,0.42)');
  rad.addColorStop(1, 'rgba(255,255,255,0)');
  gCtx.fillStyle = rad;
  gCtx.fillRect(0, 0, 128, 128);
  const neonPoolTex = new THREE.CanvasTexture(glowCanvas);
  const neonPoolMat = new THREE.MeshBasicMaterial({
    map: neonPoolTex,
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const neonPool = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.35), neonPoolMat);
  neonPool.rotation.x = -Math.PI / 2;
  neonPool.position.set(0, 0.02, 0.0);

  const underglowLight = new THREE.PointLight(0x3b82f6, 2.6, 4.2, 1.8);
  underglowLight.position.set(0, 0.26, 0.0);
  underglowGroup.add(neonTubeL, neonTubeR, neonPool, underglowLight);
  bikeBody.add(underglowGroup);

  // B. Angel Eyes Headlight Rings ("عيون ملاك")
  const angelEyeMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 3.6,
    roughness: 0.1,
  });
  const angelEyesGroup = new THREE.Group();
  angelEyesGroup.visible = false;
  if (isRetroVespa) {
    const vespaAngel = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.011, 8, 24), angelEyeMat);
    vespaAngel.position.set(0, 0.11, -0.214);
    angelEyesGroup.add(vespaAngel);
    steerAssembly.add(angelEyesGroup);
  } else {
    for (const sx of [-0.095, 0.095]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.009, 8, 20), angelEyeMat);
      ring.position.set(sx, 0.85, -0.998);
      ring.rotation.y = sx > 0 ? -0.24 : 0.24;
      angelEyesGroup.add(ring);
    }
    bikeBody.add(angelEyesGroup);
  }

  // C. Front Strobe LED Pods ("فلاشرات")
  const strobeGroup = new THREE.Group();
  strobeGroup.visible = false;
  const strobeLeftMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.2,
  });
  const strobeRightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xef4444,
    emissiveIntensity: 0.2,
  });
  const strobeL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.026, 0.03), strobeLeftMat);
  const strobeR = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.026, 0.03), strobeRightMat);
  if (isRetroVespa) {
    strobeL.position.set(-0.15, 0.94, -0.635);
    strobeR.position.set(0.15, 0.94, -0.635);
  } else {
    strobeL.position.set(-0.14, 0.77, -0.935);
    strobeR.position.set(0.14, 0.77, -0.935);
  }
  strobeGroup.add(strobeL, strobeR);
  bikeBody.add(strobeGroup);

  // D. Glowing Arabic LED Front Sign ("لافتات مضيئة": بطل الإسكندرية / ما شاء الله / ملك الكورنيش)
  const ledSignGroup = new THREE.Group();
  ledSignGroup.visible = false;
  const ledSignTexCache = new Map<LedSignId, THREE.CanvasTexture>();
  const ledSignScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.85,
    roughness: 0.14,
  });
  const ledSignHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.095, 0.024), carbonMat);
  const ledSignFace = new THREE.Mesh(new THREE.PlaneGeometry(0.295, 0.074), ledSignScreenMat);
  ledSignFace.position.z = -0.014;
  ledSignFace.rotation.y = Math.PI;
  ledSignGroup.add(ledSignHousing, ledSignFace);
  if (isRetroVespa) {
    ledSignGroup.position.set(0, 0.76, -0.65);
    ledSignGroup.rotation.x = 0.24;
  } else {
    ledSignGroup.position.set(0, 0.965, -0.84);
    ledSignGroup.rotation.x = -0.34;
  }
  bikeBody.add(ledSignGroup);

  // E. 3 Exhaust Pipe Assemblies (Stock, Carbon Sport, Dual Chrome) + Exhaust Sparks Pool ("شرارات خفيفة")
  const exhaustStockGroup = new THREE.Group();
  const exhaustCarbonGroup = new THREE.Group();
  const exhaustDualChromeGroup = new THREE.Group();
  exhaustCarbonGroup.visible = false;
  exhaustDualChromeGroup.visible = false;

  const carbonWeaveMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.34,
    metalness: 0.42,
  });
  const titaniumBlueMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    roughness: 0.18,
    metalness: 0.92,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.28,
  });
  const chromeMirrorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.08,
    metalness: 0.98,
    envMapIntensity: 1.7,
  });

  // Carbon Sport Akra-style Angled Canister (Right side)
  const carbonPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 0.41, -0.2),
    new THREE.Vector3(0.19, 0.32, 0.14),
    new THREE.Vector3(0.22, 0.44, 0.5),
    new THREE.Vector3(0.23, 0.58, 0.76),
  ]);
  const carbonHeader = new THREE.Mesh(new THREE.TubeGeometry(carbonPipeCurve, 14, 0.028, 8, false), titaniumBlueMat);
  const carbonCan = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.44, 8), carbonWeaveMat);
  carbonCan.position.set(0.235, 0.56, 0.82);
  carbonCan.rotation.x = Math.PI / 2 - 0.46;
  const carbonBand = new THREE.Mesh(new THREE.CylinderGeometry(0.069, 0.069, 0.04, 8), goldForkMat);
  carbonBand.position.set(0.235, 0.54, 0.78);
  carbonBand.rotation.x = Math.PI / 2 - 0.46;
  const carbonTip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.056, 0.09, 10), titaniumBlueMat);
  carbonTip.position.set(0.235, 0.68, 1.04);
  carbonTip.rotation.x = Math.PI / 2 - 0.46;
  exhaustCarbonGroup.add(carbonHeader, carbonCan, carbonBand, carbonTip);

  // Dual Chrome Twin Exhausts (Symmetrical Left & Right Polished Chrome Pipes!)
  for (const sx of [-1, 1]) {
    const dualCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.12, 0.4, -0.18),
      new THREE.Vector3(sx * 0.21, 0.33, 0.18),
      new THREE.Vector3(sx * 0.24, 0.45, 0.56),
      new THREE.Vector3(sx * 0.25, 0.56, 0.82),
    ]);
    const dHeader = new THREE.Mesh(new THREE.TubeGeometry(dualCurve, 14, 0.027, 8, false), chromeMirrorMat);
    const dCan = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.062, 0.44, 14), chromeMirrorMat);
    dCan.position.set(sx * 0.25, 0.54, 0.82);
    dCan.rotation.x = Math.PI / 2 - 0.34;
    const dTip = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.075, 14), carbonMat);
    dTip.position.set(sx * 0.25, 0.64, 1.05);
    dTip.rotation.x = Math.PI / 2 - 0.34;
    exhaustDualChromeGroup.add(dHeader, dCan, dTip);
  }
  bikeBody.add(exhaustStockGroup, exhaustCarbonGroup, exhaustDualChromeGroup);

  // Pre-allocated Exhaust Spark Pool (Zero per-frame allocations!)
  interface ExhaustSparkParticle {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
  }
  const sparkGeo = new THREE.BoxGeometry(0.022, 0.022, 0.14);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const exhaustSparks: ExhaustSparkParticle[] = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(sparkGeo, sparkMat);
    m.visible = false;
    bikeBody.add(m);
    exhaustSparks.push({
      mesh: m,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.28,
    });
  }
  let activeExhaustStyle: 'stock' | 'carbon' | 'dual_chrome' = 'stock';
  let revSparkTimer = 0;
  let revSparkStrength = 0;
  const triggerExhaustRev = (strength = 1.0) => {
    revSparkTimer = 0.85;
    revSparkStrength = Math.max(revSparkStrength, strength);
  };

  // F. Bling & Accessories: Youth Stickers ("ملصقات شبابية") & Extra Racks ("حوامل إضافية")
  const stickersGroup = new THREE.Group();
  stickersGroup.visible = false;
  const stickerTex = createYouthStickerTexture(maxAnisotropy);
  const stickerMat = new THREE.MeshStandardMaterial({
    map: stickerTex,
    transparent: true,
    roughness: 0.25,
    metalness: 0.15,
    depthWrite: false,
  });
  for (const sx of [-1, 1]) {
    const decalPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.22), stickerMat);
    if (isRetroVespa) {
      decalPlane.position.set(sx * 0.345, 0.62, 0.44);
    } else {
      decalPlane.position.set(sx * 0.228, 0.74, -0.32);
    }
    decalPlane.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    stickersGroup.add(decalPlane);
  }
  bikeBody.add(stickersGroup);

  const extraRacksGroup = new THREE.Group();
  extraRacksGroup.visible = false;
  // Chrome Rear Stunt/Luggage Carrier Rack
  const rackBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.028, 0.3), chromeMirrorMat);
  rackBase.position.set(0, isRetroVespa ? 0.91 : 0.97, isRetroVespa ? 0.84 : 0.96);
  const rackRailL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), chromeMirrorMat);
  rackRailL.rotation.x = Math.PI / 2;
  rackRailL.position.set(-0.15, isRetroVespa ? 0.94 : 1.0, isRetroVespa ? 0.84 : 0.96);
  const rackRailR = rackRailL.clone();
  rackRailR.position.x = 0.15;
  const rackBackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), chromeMirrorMat);
  rackBackBar.rotation.z = Math.PI / 2;
  rackBackBar.position.set(0, isRetroVespa ? 1.0 : 1.06, isRetroVespa ? 0.98 : 1.1);
  // Front Handlebar Phone/GPS Mount & Gold Action Cam
  const phoneMountArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6), alloyMat);
  phoneMountArm.position.set(-0.11, 0.11, -0.02);
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.12, 0.016), carbonMat);
  phoneBody.position.set(-0.11, 0.16, -0.01);
  phoneBody.rotation.x = -0.45;
  const phoneScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.056, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  );
  phoneScreen.position.set(-0.11, 0.163, -0.001);
  phoneScreen.rotation.x = -0.45;
  steerAssembly.add(phoneMountArm, phoneBody, phoneScreen);
  extraRacksGroup.add(rackBase, rackRailL, rackRailR, rackBackBar);
  bikeBody.add(extraRacksGroup);

  if (isRetroVespa) {
    // Classic Alexandria Retro Vespa Scooter Silhouette (legshield apron, step-through floorboard, round chrome headlight, bulbous rear cowls)
    const vespaApron = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.76, 0.12), fairingPaintMat);
    vespaApron.position.set(0, 0.74, -0.56);
    vespaApron.rotation.x = 0.26;
    vespaApron.castShadow = true;

    const vespaTrim = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.78, 0.04), alloyMat);
    vespaTrim.position.set(0, 0.74, -0.58);
    vespaTrim.rotation.x = 0.26;

    const floorboard = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.64), bellyTrimMat);
    floorboard.position.set(0, 0.36, -0.18);

    const floorRubber = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.56), carbonMat);
    floorRubber.position.set(0, 0.395, -0.18);

    const rearShell = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.76), fairingPaintMat);
    rearShell.position.set(0, 0.6, 0.42);
    rearShell.castShadow = true;

    for (const sx of [-0.21, 0.21]) {
      const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), fairingPaintMat);
      cowl.scale.set(0.55, 0.88, 1.55);
      cowl.position.set(sx, 0.6, 0.46);
      cowl.castShadow = true;
      bikeBody.add(cowl);
    }

    const roundHeadShell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.13, 14), alloyMat);
    roundHeadShell.rotation.x = Math.PI / 2;
    roundHeadShell.position.set(0, 0.11, -0.14);
    const roundHeadLens = new THREE.Mesh(new THREE.CircleGeometry(0.092, 14), ledHeadMat);
    roundHeadLens.position.set(0, 0.11, -0.208);
    roundHeadLens.rotation.y = Math.PI;
    steerAssembly.add(roundHeadShell, roundHeadLens);

    const tanSeat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.62), seatLeatherMat);
    tanSeat.position.set(0, 0.84, 0.3);

    const rearRack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.24), alloyMat);
    rearRack.position.set(0, 0.85, 0.78);

    const chromeMuffler = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.46, 12), alloyMat);
    chromeMuffler.rotation.x = Math.PI / 2;
    chromeMuffler.position.set(0.21, 0.36, 0.56);
    exhaustStockGroup.add(chromeMuffler);

    const retroTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.06), brakeMat);
    retroTail.position.set(0, 0.72, 0.84);
    brakeLights.push(retroTail);

    bikeBody.add(
      vespaApron,
      vespaTrim,
      floorboard,
      floorRubber,
      rearShell,
      tanSeat,
      rearRack,
      retroTail,
      windShield,
    );
  } else {
    exhaustStockGroup.add(headerPipe, mufflerBody, mufflerTip);
    bikeBody.add(
      noseFairing,
      bellyPan,
      radiator,
      fuelTank,
      tankCap,
      windShield,
      ramIntake,
      drlBrow,
      tailCowl,
      riderSeat,
      pillionSeat,
      tailLight,
      plateHolder,
      engineBlock,
      clutchCover,
      shockSpring,
    );
  }

  // Live Zero-Rebuild Moto Tuning Applier (instant feedback in Garage & Gameplay!)
  let strobesActive = false;
  const applyMotoTuning = (t: MotoTuningConfig) => {
    // 1. Paint & Finish (Glossy / Matte / Metallic)
    fairingPaintMat.color.set(t.bodyColor);
    if (t.paintFinish === 'matte') {
      fairingPaintMat.roughness = 0.78;
      fairingPaintMat.metalness = 0.08;
      fairingPaintMat.clearcoat = 0.0;
      fairingPaintMat.clearcoatRoughness = 0.7;
      fairingPaintMat.envMapIntensity = 0.65;
    } else if (t.paintFinish === 'metallic') {
      fairingPaintMat.roughness = 0.18;
      fairingPaintMat.metalness = 0.92;
      fairingPaintMat.clearcoat = 0.85;
      fairingPaintMat.clearcoatRoughness = 0.1;
      fairingPaintMat.envMapIntensity = 1.85;
    } else {
      fairingPaintMat.roughness = 0.14;
      fairingPaintMat.metalness = 0.28;
      fairingPaintMat.clearcoat = 1.0;
      fairingPaintMat.clearcoatRoughness = 0.08;
      fairingPaintMat.envMapIntensity = 1.4;
    }
    fairingPaintMat.needsUpdate = true;

    rimMetalMat.color.set(t.rimColor);
    rimStripeMat.color.set(t.rimColor);
    seatLeatherMat.color.set(t.seatColor);

    // 2. Lights & LEDs
    if (t.underglowColor) {
      underglowGroup.visible = true;
      underglowTubeMat.color.set(t.underglowColor);
      underglowTubeMat.emissive.set(t.underglowColor);
      neonPoolMat.color.set(t.underglowColor);
      underglowLight.color.set(t.underglowColor);
    } else {
      underglowGroup.visible = false;
    }

    if (t.angelEyeColor) {
      angelEyesGroup.visible = true;
      angelEyeMat.color.set(t.angelEyeColor);
      angelEyeMat.emissive.set(t.angelEyeColor);
    } else {
      angelEyesGroup.visible = false;
    }

    if (t.rimLedColor) {
      rimLedMat.color.set(t.rimLedColor);
      rimLedMat.emissive.set(t.rimLedColor);
      for (const n of rimLedNodes) n.visible = true;
    } else {
      for (const n of rimLedNodes) n.visible = false;
    }

    strobesActive = t.strobesEnabled;
    strobeGroup.visible = t.strobesEnabled;

    if (t.ledSign !== 'none') {
      const signDef = LED_SIGN_OPTIONS.find((s) => s.id === t.ledSign);
      if (signDef) {
        let tex = ledSignTexCache.get(t.ledSign);
        if (!tex) {
          tex = createLedSignTexture(signDef.text, signDef.glowHex, maxAnisotropy);
          ledSignTexCache.set(t.ledSign, tex);
        }
        ledSignScreenMat.map = tex;
        ledSignScreenMat.emissiveMap = tex;
        ledSignScreenMat.needsUpdate = true;
        ledSignGroup.visible = true;
      }
    } else {
      ledSignGroup.visible = false;
    }

    // 3. Exhausts
    activeExhaustStyle = t.exhaustStyle;
    exhaustStockGroup.visible = t.exhaustStyle === 'stock';
    exhaustCarbonGroup.visible = t.exhaustStyle === 'carbon';
    exhaustDualChromeGroup.visible = t.exhaustStyle === 'dual_chrome';

    // 4. Bling & Accessories
    stockMirrorsGroup.visible = !t.sportMirrors;
    sportMirrorsGroup.visible = t.sportMirrors;
    stickersGroup.visible = t.youthStickers;
    extraRacksGroup.visible = t.extraRacks;
    phoneMountArm.visible = t.extraRacks;
    phoneBody.visible = t.extraRacks;
    phoneScreen.visible = t.extraRacks;
  };

  if (bikeOverride?.tuning) {
    applyMotoTuning(bikeOverride.tuning);
  } else {
    phoneMountArm.visible = false;
    phoneBody.visible = false;
    phoneScreen.visible = false;
  }

  // 5. DETAILED STYLIZED LOW-POLY PLAYER CHARACTER
  // ("شخصية السائق": جاكيت ترينج رياضي أخضر بخطوط بيضاء، بنطلون داكن، حذاء رياضي، وطاقية Beanie سوداء)
  const riderRoot = new THREE.Group();
  riderRoot.position.set(0, 0.8, 0.13);
  if (bikeOverride?.hideRiderForPreview) {
    riderRoot.visible = false;
  }
  bikeBody.add(riderRoot);

  const jacketTex = createGreenTracksuitTexture(maxAnisotropy);
  const jacketTint =
    riderStyle === 'black_jacket' ? 0x262932 : riderStyle === 'alex_blue' ? 0x1d68c4 : 0xffffff;
  const jacketMat = new THREE.MeshStandardMaterial({
    map: jacketTex,
    color: jacketTint,
    roughness: 0.72,
    metalness: 0.06,
  });
  const whiteStripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.44 });
  const darkPantsTex = createClothingFabricTexture('#18202C', 'trousers', maxAnisotropy);
  const darkPantsMat = new THREE.MeshStandardMaterial({ map: darkPantsTex, roughness: 0.84 });
  const sneakerUpperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.62 });
  const sneakerSoleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.52 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89572, roughness: 0.62 });
  const faceTex = createHumanFaceTexture('olive', true, maxAnisotropy);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6 });
  const beanieTex = createBeanieKnitTexture(maxAnisotropy);
  const beanieMat = new THREE.MeshStandardMaterial({ map: beanieTex, roughness: 0.88 });
  const hairTuftMat = new THREE.MeshStandardMaterial({ color: 0x181310, roughness: 0.88 });

  // Pelvis seated naturally on stepped sport saddle
  const rPelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.142, 0.15, 12), darkPantsMat);
  rPelvis.scale.set(1.05, 1, 0.72);
  rPelvis.position.set(0, 0.02, 0);
  riderRoot.add(rPelvis);

  // Articulated Thighs, Knees, Calves & Two-Tone Athletic Sneakers resting on Footpegs
  const legsPivot = new THREE.Group();
  legsPivot.position.set(0, 0.02, 0);
  riderRoot.add(legsPivot);

  for (const sx of [-1, 1]) {
    const hipSide = sx * 0.125;

    const thighGrp = new THREE.Group();
    thighGrp.position.set(hipSide, 0, -0.02);
    thighGrp.rotation.x = 0.82;
    thighGrp.rotation.z = sx * -0.18;
    const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.34, 12), darkPantsMat);
    thighMesh.position.y = -0.17;
    thighMesh.castShadow = true;

    const kneeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.059, 10, 8), darkPantsMat);
    kneeMesh.position.y = -0.34;

    const calfGrp = new THREE.Group();
    calfGrp.position.set(0, -0.34, 0);
    calfGrp.rotation.x = -1.32;
    const calfMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.04, 0.35, 12), darkPantsMat);
    calfMesh.position.y = -0.175;
    calfMesh.castShadow = true;

    // Detailed Athletic Sneaker ("حذاء رياضي") on Footpeg
    const shoeGrp = new THREE.Group();
    shoeGrp.position.set(0, -0.35, -0.02);
    shoeGrp.rotation.x = 0.5;
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.026, 0.215), sneakerSoleMat);
    sole.position.set(0, -0.015, -0.03);
    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.062, 0.185), sneakerUpperMat);
    shoeUpper.position.set(0, 0.022, -0.02);
    const shoeToe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), sneakerSoleMat);
    shoeToe.scale.set(1, 0.65, 1.1);
    shoeToe.position.set(0, 0.01, -0.118);
    const shoeStripe = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.018, 0.09), whiteStripeMat);
    shoeStripe.position.set(0, 0.025, -0.01);
    const shoeLaces = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.075), whiteStripeMat);
    shoeLaces.position.set(0, 0.055, -0.055);
    shoeGrp.add(sole, shoeUpper, shoeToe, shoeStripe, shoeLaces);

    calfGrp.add(calfMesh, shoeGrp);
    thighGrp.add(thighMesh, kneeMesh, calfGrp);
    legsPivot.add(thighGrp);
  }

  // Upper Torso Pivot (Natural Forward Sport Riding Lean)
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.06, 0);
  torsoPivot.rotation.x = -0.36;
  riderRoot.add(torsoPivot);

  // Green Tracksuit Jacket + Twin White Shoulder/Back/Side Stripes + Front Zipper + Stand Collar
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.138, 0.48, 14), jacketMat);
  torsoMesh.scale.set(1.08, 1, 0.68);
  torsoMesh.position.set(0, 0.24, 0);
  torsoMesh.castShadow = true;

  const jacketHem = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.144, 0.055, 14), whiteStripeMat);
  jacketHem.scale.set(1.08, 1, 0.68);
  jacketHem.position.set(0, 0.025, 0);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.096, 0.078, 12), jacketMat);
  collar.position.set(0, 0.48, 0);
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 14), whiteStripeMat);
  collarTrim.rotation.x = Math.PI / 2;
  collarTrim.position.set(0, 0.516, 0);

  const torsoStripes: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.42, 0.045), whiteStripeMat);
    sideStripe.position.set(sx * 0.168, 0.24, 0);
    sideStripe.rotation.z = sx * -0.06;
    const backStripe = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.38, 0.018), whiteStripeMat);
    backStripe.position.set(sx * 0.085, 0.26, 0.115);
    torsoPivot.add(sideStripe, backStripe);
    torsoStripes.push(sideStripe, backStripe);
  }

  // Head, Neck, Face Features & Sculpted Slouchy Black Knit Beanie Cap ("طاقية Beanie سوداء")
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.5, -0.01);
  headGroup.rotation.x = 0.32;
  torsoPivot.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.057, 0.115, 10), skinMat);
  neck.position.set(0, 0.04, 0);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.113, 18, 14), faceMat);
  headMesh.scale.set(0.88, 1.05, 0.94);
  headMesh.position.set(0, 0.17, 0);
  headMesh.rotation.y = Math.PI / 2;
  headMesh.castShadow = true;

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.042, 6), skinMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.155, -0.106);

  const ears = [-1, 1].map((sx) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), skinMat);
    ear.scale.set(0.45, 1.0, 0.75);
    ear.position.set(sx * 0.099, 0.165, 0.01);
    return ear;
  });

  // Lathe Knit Beanie Profile (ribbed fold brim + rounded slouchy knit dome)
  const beaniePts = [
    new THREE.Vector2(0.11, -0.02),
    new THREE.Vector2(0.126, -0.015),
    new THREE.Vector2(0.128, 0.032),
    new THREE.Vector2(0.115, 0.04),
    new THREE.Vector2(0.112, 0.095),
    new THREE.Vector2(0.088, 0.145),
    new THREE.Vector2(0.045, 0.172),
    new THREE.Vector2(0.0, 0.178),
  ];
  const beanieMesh = new THREE.Mesh(new THREE.LatheGeometry(beaniePts, 16), beanieMat);
  beanieMesh.scale.set(0.88, 1.0, 0.96);
  beanieMesh.position.set(0, 0.195, 0.014);
  beanieMesh.rotation.x = -0.22;
  beanieMesh.castShadow = true;

  const backHairTuft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.05), hairTuftMat);
  backHairTuft.position.set(0, 0.13, 0.086);

  headGroup.add(neck, headMesh, nose, ...ears, beanieMesh, backHairTuft);

  // Articulated Arms in Green Tracksuit Sleeves with Dual White Stripes & Gripping Hands on Handlebars
  const makeRiderArm = (sx: -1 | 1) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(sx * 0.19, 0.42, 0);

    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), jacketMat);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.28, 10), jacketMat);
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    const upperStripe = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.25, 0.034), whiteStripeMat);
    upperStripe.position.set(sx * 0.048, -0.14, 0);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.034, 0.26, 10), jacketMat);
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    const foreStripe = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.23, 0.028), whiteStripeMat);
    foreStripe.position.set(sx * 0.038, -0.125, 0);
    const whiteCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 10), whiteStripeMat);
    whiteCuff.position.y = -0.25;

    // Articulated Hand + Thumb + Finger Grip wrapping handlebar & brake lever
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.275, 0);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.058, 0.038), skinMat);
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.042, 0.032), skinMat);
    fingers.position.set(0, -0.026, -0.02);
    fingers.rotation.x = 0.72;
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.024, 4, 6), skinMat);
    thumb.position.set(sx * -0.028, -0.01, -0.018);
    thumb.rotation.z = sx * 0.55;
    handGroup.add(palm, fingers, thumb);

    elbow.add(forearm, foreStripe, whiteCuff, handGroup);
    armPivot.add(shoulderBall, upperArm, upperStripe, elbow);
    torsoPivot.add(armPivot);
    return { armPivot, elbow, fingers };
  };

  const leftArmRig = makeRiderArm(-1);
  const rightArmRig = makeRiderArm(1);

  torsoPivot.add(torsoMesh, jacketHem, collar, collarTrim);

  // Analytical 2-Bone IK solver keeping hands locked onto handlebar grips during steering, throttle & braking
  const UPPER_ARM_LEN = 0.28;
  const FORE_ARM_LEN = 0.275;
  const solveArmToHandlebar = (
    sx: -1 | 1,
    armRig: { armPivot: THREE.Group; elbow: THREE.Group; fingers: THREE.Mesh },
    steerYaw: number,
    throttlePull: number,
    brakePull: number,
    noHandsBlend: number,
    stuntWaveTime: number,
  ) => {
    // 1. Grip point in bikeBody coordinates (matching steerAssembly rotation around Y)
    _ikQuatSteer.setFromAxisAngle(_ikAxisY, steerYaw);
    _ikGrip
      .set(sx * 0.285, 0.08 + (sx === 1 ? throttlePull * 0.008 : 0), 0.07)
      .applyQuaternion(_ikQuatSteer)
      .add(_ikSteerOrigin);

    // 2. Transform grip point into torsoPivot local coordinates
    _ikGrip.sub(riderRoot.position).sub(torsoPivot.position);
    _ikQuatTorsoInv.setFromEuler(torsoPivot.rotation).invert();
    _ikGrip.applyQuaternion(_ikQuatTorsoInv);

    // 3. Two-bone law-of-cosines triangle in shoulder->grip plane with natural outward-down elbow pole
    _ikShoulder.copy(armRig.armPivot.position);
    _ikToTarget.subVectors(_ikGrip, _ikShoulder);
    const rawDist = _ikToTarget.length();
    const d = THREE.MathUtils.clamp(rawDist, 0.16, UPPER_ARM_LEN + FORE_ARM_LEN - 0.004);
    if (rawDist > 0.0001) _ikToTarget.divideScalar(rawDist);
    else _ikToTarget.set(0, -1, 0);

    _ikPoleHint.set(sx * 0.48, -0.75, 0.35).normalize();
    // Gram-Schmidt orthogonal outward direction in the bending plane
    _ikPlaneOut.copy(_ikPoleHint).addScaledVector(_ikToTarget, -_ikPoleHint.dot(_ikToTarget));
    if (_ikPlaneOut.lengthSq() < 1e-5) _ikPlaneOut.set(sx, 0, 0);
    _ikPlaneOut.normalize();

    const cosA = THREE.MathUtils.clamp(
      (UPPER_ARM_LEN * UPPER_ARM_LEN + d * d - FORE_ARM_LEN * FORE_ARM_LEN) / (2 * UPPER_ARM_LEN * d),
      -1,
      1,
    );
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));

    _ikElbowPos
      .copy(_ikShoulder)
      .addScaledVector(_ikToTarget, UPPER_ARM_LEN * cosA)
      .addScaledVector(_ikPlaneOut, UPPER_ARM_LEN * sinA);

    _ikUpperDir.subVectors(_ikElbowPos, _ikShoulder).normalize();
    _ikForeDir.subVectors(_ikGrip, _ikElbowPos).normalize();

    // Build orthonormal frame for armPivot where -Y = _ikUpperDir
    _ikYAxis.copy(_ikUpperDir).negate();
    _ikZAxis.crossVectors(_ikPlaneOut, _ikYAxis);
    if (_ikZAxis.lengthSq() < 1e-5) _ikZAxis.set(0, 0, 1);
    _ikZAxis.normalize();
    _ikXAxis.crossVectors(_ikYAxis, _ikZAxis).normalize();
    _ikMat4.makeBasis(_ikXAxis, _ikYAxis, _ikZAxis);
    _ikQuatArm.setFromRotationMatrix(_ikMat4);

    // Orient elbow in armPivot space so -Y = _ikForeDir
    _ikLocalForeDir.copy(_ikForeDir).applyQuaternion(_ikQuatArm.clone().invert()).normalize();
    _ikQuatElbow.setFromUnitVectors(_ikNegY, _ikLocalForeDir);

    // Blend smoothly with "إيدين" (no-hands) stunt spread if active
    if (noHandsBlend > 0.005) {
      const spread = 1.55 + Math.sin(stuntWaveTime * 9) * 0.14;
      _ikEuler.set(0.15, 0, sx * spread);
      _ikStuntArmQ.setFromEuler(_ikEuler);
      _ikEuler.set(0.32, 0, 0);
      _ikStuntElbowQ.setFromEuler(_ikEuler);
      _ikQuatArm.slerp(_ikStuntArmQ, noHandsBlend);
      _ikQuatElbow.slerp(_ikStuntElbowQ, noHandsBlend);
    }

    armRig.armPivot.quaternion.copy(_ikQuatArm);
    armRig.elbow.quaternion.copy(_ikQuatElbow);

    // Subtle wrist/finger curl forward onto brake lever when squeezing brakes
    armRig.fingers.rotation.x = 0.72 - brakePull * 0.42;
    armRig.fingers.position.z = -0.02 - brakePull * 0.012;
  };

  let curWheelie = 0;
  let curStand = 0;
  let curSuperman = 0;
  let curNoHands = 0;
  let curSteerVisual = 0;
  let curThrottleTwist = 0;
  let curBrakeSqueeze = 0;
  let povModeActive = false;
  let customMirrorTex: THREE.Texture | null = null;

  const setPovMode = (isPov: boolean) => {
    if (povModeActive === isPov) return;
    povModeActive = isPov;
    headGroup.visible = !isPov;
    torsoMesh.visible = !isPov;
    jacketHem.visible = !isPov;
    collar.visible = !isPov;
    collarTrim.visible = !isPov;
    for (const ts of torsoStripes) ts.visible = !isPov;
  };

  const setMirrorTexture = (tex: THREE.Texture | null) => {
    if (customMirrorTex === tex) return;
    customMirrorTex = tex;
    const activeTex = tex ?? mirrorUpdater.texture;
    mirrorGlassMat.map = activeTex;
    mirrorGlassMat.emissiveMap = activeTex;
    mirrorGlassMat.emissiveIntensity = tex ? 0.22 : 0.48;
    mirrorGlassMat.needsUpdate = true;
  };

  // Seated Pillion Passenger Rig (visible behind rider whenever a passenger boards!)
  const pillionGroup = new THREE.Group();
  pillionGroup.visible = false;
  const pillionShirtMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.72 });
  const pillionPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const pillionSkinMat = new THREE.MeshStandardMaterial({ color: 0xe6b58a, roughness: 0.62 });
  const pillionHairMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.88 });
  const pillionShoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78 });

  const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.2), pillionShirtMat);
  pTorso.position.set(0, 1.12, 0.56);
  pTorso.rotation.x = -0.18;
  const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), pillionSkinMat);
  pHead.position.set(0, 1.44, 0.51);
  const pHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.122, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
    pillionHairMat,
  );
  pHair.position.set(0, 1.46, 0.52);
  const pPelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.22), pillionPantsMat);
  pPelvis.position.set(0, 0.88, 0.59);
  for (const sx of [-1, 1]) {
    const pThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.34, 8), pillionPantsMat);
    pThigh.position.set(sx * 0.16, 0.78, 0.48);
    pThigh.rotation.x = 1.15;
    pThigh.rotation.z = sx * -0.16;
    const pShin = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.34, 8), pillionPantsMat);
    pShin.position.set(sx * 0.19, 0.55, 0.43);
    pShin.rotation.x = -0.25;
    const pShoe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), pillionShoeMat);
    pShoe.position.set(sx * 0.19, 0.38, 0.38);
    const pArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.38, 8), pillionShirtMat);
    pArm.position.set(sx * 0.17, 1.07, 0.38);
    pArm.rotation.x = 1.12;
    pArm.rotation.z = sx * 0.14;
    pillionGroup.add(pThigh, pShin, pShoe, pArm);
  }
  pillionGroup.add(pTorso, pHead, pHair, pPelvis);
  bikeBody.add(pillionGroup);

  const setPassengerSeated = (seated: boolean, shirtHex?: number) => {
    pillionGroup.visible = seated;
    if (shirtHex !== undefined) {
      pillionShirtMat.color.setHex(shirtHex);
    }
  };

  return {
    group,
    wheels,
    brakeLights,
    setPovMode,
    setMirrorTexture,
    applyMotoTuning,
    triggerExhaustRev,
    setPassengerSeated,
    animateVehicle: (time, dt, stunt, _sirenOn, steerInput = 0, opts) => {
      const tWheelie = stunt === 'wheelie' ? 0.48 : 0;
      const tStand = stunt === 'stand' ? 1 : 0;
      const tSuper = stunt === 'superman' ? 1 : 0;
      const tNoHands = stunt === 'nohands' ? 1 : 0;

      curWheelie = THREE.MathUtils.damp(curWheelie, tWheelie, 9, dt);
      curStand = THREE.MathUtils.damp(curStand, tStand, 10, dt);
      curSuperman = THREE.MathUtils.damp(curSuperman, tSuper, 10, dt);
      curNoHands = THREE.MathUtils.damp(curNoHands, tNoHands, 10, dt);
      curSteerVisual = THREE.MathUtils.damp(curSteerVisual, steerInput, 10, dt);
      curThrottleTwist = THREE.MathUtils.damp(curThrottleTwist, opts?.throttle ? 1 : 0, 12, dt);
      curBrakeSqueeze = THREE.MathUtils.damp(curBrakeSqueeze, opts?.braking ? 1 : 0, 14, dt);

      const isPov = Boolean(opts?.isPov);
      setPovMode(isPov);

      // Animate Front Strobe LEDs ("فلاشرات")
      if (strobesActive) {
        const phase = Math.floor(time * 14) % 4;
        strobeLeftMat.emissiveIntensity = phase === 0 || phase === 1 ? 4.4 : 0.15;
        strobeRightMat.emissiveIntensity = phase === 2 || phase === 3 ? 4.4 : 0.15;
      }

      // Animate Underglow gentle night/day intensity adaptation
      if (underglowGroup.visible) {
        const isNight = opts?.atmosphere === 'night';
        const isSunset = opts?.atmosphere === 'sunset';
        underglowLight.intensity = isNight ? 3.8 : isSunset ? 2.6 : 1.5;
        neonPoolMat.opacity = isNight ? 0.85 : isSunset ? 0.65 : 0.38;
      }

      // Animate Exhaust Sparks ("شرارات خفيفة عند التسارع وتجربة البنزين")
      const highThrottleSpark =
        Boolean(opts?.throttle) &&
        (opts?.rpmRatio ?? 0) > 0.78 &&
        activeExhaustStyle !== 'stock';
      if (revSparkTimer > 0) {
        revSparkTimer = Math.max(0, revSparkTimer - dt);
        revSparkStrength = Math.max(0, revSparkStrength - dt * 1.15);
      }
      const wantSparks = revSparkTimer > 0.05 || highThrottleSpark;
      const emitChance =
        activeExhaustStyle === 'dual_chrome'
          ? 0.85
          : activeExhaustStyle === 'carbon'
            ? 0.65
            : 0.38;
      for (let i = 0; i < exhaustSparks.length; i++) {
        const sp = exhaustSparks[i];
        if (sp.life > 0) {
          sp.life -= dt;
          if (sp.life <= 0) {
            sp.mesh.visible = false;
          } else {
            sp.mesh.position.addScaledVector(sp.vel, dt);
            sp.vel.y -= 2.4 * dt;
            const s = Math.max(0.15, sp.life / sp.maxLife);
            sp.mesh.scale.set(s, s, 0.7 + s * 1.1);
          }
        } else if (wantSparks && Math.random() < emitChance) {
          const isDualLeft = activeExhaustStyle === 'dual_chrome' && i % 2 === 1;
          const tipX = isDualLeft ? -0.25 : activeExhaustStyle === 'dual_chrome' ? 0.25 : 0.23;
          const tipY = isRetroVespa && activeExhaustStyle === 'stock' ? 0.36 : 0.67;
          const tipZ = isRetroVespa && activeExhaustStyle === 'stock' ? 0.82 : 1.08;
          sp.mesh.position.set(
            tipX + (Math.random() - 0.5) * 0.04,
            tipY + (Math.random() - 0.5) * 0.04,
            tipZ,
          );
          sp.vel.set(
            (Math.random() - 0.5) * 0.65,
            0.35 + Math.random() * 0.75,
            2.2 + Math.random() * 2.4,
          );
          sp.maxLife = 0.16 + Math.random() * 0.18;
          sp.life = sp.maxLife;
          sp.mesh.visible = true;
        }
      }

      if (motoPoliceRedMat && motoPoliceBlueMat) {
        const rate = _sirenOn ? 11 : 4.5;
        const flash = Math.floor(time * rate) % 2 === 0;
        motoPoliceRedMat.emissiveIntensity = flash ? (_sirenOn ? 3.8 : 1.7) : 0.2;
        motoPoliceBlueMat.emissiveIntensity = flash ? 0.2 : (_sirenOn ? 3.8 : 1.7);
      }

      // Update Live TFT Speedometer/RPM/Gear Dash & Side Mirror Reflections
      dashUpdater.update(
        opts?.speedKmh ?? 0,
        opts?.rpmRatio ?? 0.25,
        opts?.gear ?? 1,
        opts?.fuelPct ?? 100,
        Boolean(opts?.braking),
      );
      if (!customMirrorTex) {
        mirrorUpdater.update(
          opts?.atmosphere ?? 'day',
          opts?.tilt ?? 0,
          opts?.speedKmh ?? 0,
          opts?.rearTrafficHint ?? null,
        );
      }

      // Steer handlebars + forks + front wheel smoothly in unison
      const steerYaw = -curSteerVisual * 0.16;
      steerAssembly.rotation.y = steerYaw;

      // Right throttle twist + brake levers pull inward under braking
      if (rightThrottleGrip) {
        rightThrottleGrip.rotation.x = curThrottleTwist * 0.34;
      }
      brakeLevers.forEach((lv, idx) => {
        const side = idx === 0 ? -1 : 1;
        lv.rotation.y = side * curBrakeSqueeze * 0.24;
        lv.position.z = gripPosZ - 0.048 + curBrakeSqueeze * 0.02;
      });

      // Wheelie pitches the sportbike smoothly around the rear axle + suspension nose-dive compression
      bikePivot.rotation.x = curWheelie;
      bikeBody.position.y = -0.33 + (opts?.noseDive ?? 0);

      // Rider Stunts ("حصان", "سوبرمان", "واقف", "إيدين") + Subtle Cornering Body Lean
      riderRoot.position.y = 0.8 + curStand * 0.32 + curSuperman * 0.18;
      riderRoot.position.z = 0.13 + curSuperman * 0.28;

      legsPivot.rotation.x = -curSuperman * 1.45 + curStand * 0.35;

      torsoPivot.rotation.x =
        -0.36 * (1 - curStand - curNoHands - curSuperman) -
        curSuperman * 1.36 -
        curStand * 0.08 -
        curNoHands * 0.06;
      torsoPivot.rotation.z = -curSteerVisual * 0.11;

      headGroup.rotation.x = 0.32 + curSuperman * 0.78 - curStand * 0.22 - curNoHands * 0.24;

      // Keep both hands physically locked onto left & right grips (smoothly blending out on No-Hands stunt)
      solveArmToHandlebar(-1, leftArmRig, steerYaw, 0, curBrakeSqueeze, curNoHands, time);
      solveArmToHandlebar(1, rightArmRig, steerYaw, curThrottleTwist, curBrakeSqueeze, curNoHands, time);
    },
  };
}

export function buildPlayerCheckpointOfficerRig(): {
  group: THREE.Group;
  stopArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
} {
  const group = new THREE.Group();
  const whiteUniMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  const navyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89572, roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.65, roughness: 0.3 });
  const stopRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.8 });

  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.16, 8), whiteUniMat);
  pelvis.position.y = 0.88;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.54, 10), whiteUniMat);
  torso.position.y = 1.22;
  torso.castShadow = true;
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.34), navyMat);
  sash.position.set(0.02, 1.22, 0);
  sash.rotation.z = 0.52;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skinMat);
  head.position.y = 1.65;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.12, 0.08, 12), whiteUniMat);
  cap.position.y = 1.76;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.14), navyMat);
  visor.position.set(0, 1.72, -0.09);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.09, 0.85, 0);
  const llMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.78, 8), whiteUniMat);
  llMesh.position.y = -0.39;
  const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.2), navyMat);
  lShoe.position.set(0, -0.81, -0.04);
  leftLeg.add(llMesh, lShoe);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.09, 0.85, 0);
  const rlMesh = llMesh.clone();
  const rShoe = lShoe.clone();
  rightLeg.add(rlMesh, rShoe);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.54, 8), whiteUniMat);
  leftArm.position.set(-0.22, 1.18, 0);

  const stopArm = new THREE.Group();
  stopArm.position.set(0.22, 1.43, 0);
  const raMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.52, 8), whiteUniMat);
  raMesh.position.y = -0.26;
  const paddleStick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), goldMat);
  paddleStick.position.set(0, -0.58, -0.08);
  paddleStick.rotation.x = Math.PI / 2;
  const paddleSign = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10), stopRedMat);
  paddleSign.rotation.x = Math.PI / 2;
  paddleSign.position.set(0, -0.58, -0.28);
  stopArm.add(raMesh, paddleStick, paddleSign);

  group.add(pelvis, torso, sash, head, cap, visor, leftLeg, rightLeg, leftArm, stopArm);
  return { group, stopArm, leftLeg, rightLeg };
}

export function buildOrangeRoadBarrier3D(): THREE.Group {
  const group = new THREE.Group();
  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0x9a3412,
    emissiveIntensity: 0.28,
    roughness: 0.42,
  });
  const whiteReflectMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });
  const baseDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.82 });

  const mainRail = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.56, 0.16), orangeMat);
  mainRail.position.y = 0.72;
  mainRail.castShadow = true;
  mainRail.receiveShadow = true;
  group.add(mainRail);

  for (const sx of [-0.72, 0, 0.72]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.175), whiteReflectMat);
    stripe.position.set(sx, 0.72, 0);
    stripe.rotation.z = 0.35;
    group.add(stripe);
  }

  for (const lx of [-0.88, 0.88]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.12), baseDarkMat);
    leg.position.set(lx, 0.28, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.62), baseDarkMat);
    foot.position.set(lx, 0.04, 0);
    group.add(leg, foot);
  }
  return group;
}

export function buildOfficerPovRig(): {
  group: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  paddleMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const whiteSleeveMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  const navyCuffMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89572, roughness: 0.62 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.3 });
  const paddleMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.95,
    roughness: 0.28,
  });
  const rimWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });

  // Right POV forearm holding Egyptian Traffic Police Stop/Clear Paddle
  const rightArm = new THREE.Group();
  rightArm.position.set(0.28, -0.26, -0.34);
  const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.42, 10), whiteSleeveMat);
  rSleeve.rotation.x = Math.PI * 0.42;
  rSleeve.position.set(0, -0.02, -0.1);
  const rCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.045, 10), navyCuffMat);
  rCuff.rotation.x = Math.PI * 0.42;
  rCuff.position.set(0, 0.03, -0.26);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinMat);
  rHand.position.set(0, 0.05, -0.31);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8), woodMat);
  stick.position.set(0, 0.16, -0.32);
  const signRim = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.022, 18), rimWhiteMat);
  signRim.rotation.x = Math.PI / 2;
  signRim.position.set(0, 0.31, -0.32);
  const signFace = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.028, 18), paddleMat);
  signFace.rotation.x = Math.PI / 2;
  signFace.position.set(0, 0.31, -0.32);
  rightArm.add(rSleeve, rCuff, rHand, stick, signRim, signFace);

  // Left POV forearm holding Police Handheld Radio
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.29, -0.28, -0.32);
  const lSleeve = rSleeve.clone();
  const lCuff = rCuff.clone();
  const lHand = rHand.clone();
  const radioBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.135, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }),
  );
  radioBody.position.set(0, 0.11, -0.32);
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.007, 0.13, 6),
    new THREE.MeshStandardMaterial({ color: 0x1e293b }),
  );
  antenna.position.set(0.02, 0.22, -0.32);
  const radioLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 2.0 }),
  );
  radioLed.position.set(-0.018, 0.165, -0.3);
  leftArm.add(lSleeve, lCuff, lHand, radioBody, antenna, radioLed);

  group.add(rightArm, leftArm);
  return { group, rightArm, leftArm, paddleMat };
}

export function createEntityModelFactory(maxAnisotropy = 4) {
  const trackedGeos: THREE.BufferGeometry[] = [];
  const trackedMats: THREE.Material[] = [];
  const trackedTexs: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    trackedGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    trackedMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    trackedTexs.push(t);
    return t;
  };

  // Shared vehicle materials (glossy sunset-reflective glass & paint)
  const tireMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 }));
  const hubcapMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.85, envMapIntensity: 1.4 }));
  const bumperDarkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.35 }));
  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b1626,
      roughness: 0.08,
      metalness: 0.52,
      envMapIntensity: 1.65,
    }),
  );
  const tailMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.15 }));
  const amberSignalMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.25 }));
  const whiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.22, envMapIntensity: 1.3 }));
  const blueStripeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.25 }));
  const navyMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.32, metalness: 0.32 }));
  const rackMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.8, envMapIntensity: 1.3 }));
  const headLampMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.8 }));
  const goldMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.28, metalness: 0.75 }));
  const woodMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }));

  // Cone shared resources
  const coneBaseGeo = trackGeo(new THREE.BoxGeometry(0.7, 0.08, 0.7));
  const coneBodyGeo = trackGeo(new THREE.ConeGeometry(0.26, 0.85, 10));
  const coneStripeGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.19, 0.22, 10));
  const coneBaseMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
  const coneOrangeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 }));
  const coneWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25 }));

  // Detailed Alexandria Microbus shared geometries
  const mbLowerGeo = trackGeo(new THREE.BoxGeometry(2.06, 0.78, 4.92));
  const mbCabinGeo = trackGeo(new THREE.BoxGeometry(1.98, 0.84, 4.48));
  const mbNoseGeo = trackGeo(new THREE.BoxGeometry(1.94, 0.56, 0.56));
  const mbStripeGeo = trackGeo(new THREE.BoxGeometry(2.09, 0.22, 4.94));
  const mbThinStripeGeo = trackGeo(new THREE.BoxGeometry(2.09, 0.07, 4.94));
  const mbWindGeo = trackGeo(new THREE.BoxGeometry(1.82, 0.62, 0.08));
  const mbSideWinGeo = trackGeo(new THREE.BoxGeometry(2.01, 0.48, 0.92));
  const mbRearWinGeo = trackGeo(new THREE.BoxGeometry(1.68, 0.48, 0.08));
  const mbRackGeo = trackGeo(new THREE.BoxGeometry(1.58, 0.14, 3.1));
  const mbRackRailGeo = trackGeo(new THREE.BoxGeometry(1.62, 0.06, 0.08));
  const mbBumperGeo = trackGeo(new THREE.BoxGeometry(2.1, 0.18, 0.18));
  const mbTailGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.18, 0.06));
  const mbRoofLampGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.09, 0.14));
  const mbTireGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14));
  mbTireGeo.rotateZ(Math.PI / 2);
  const wheelRimGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.28, 12));
  wheelRimGeo.rotateZ(Math.PI / 2);
  const mirrorPodGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.14, 0.1));

  // Egyptian License Plates & Illuminated "تاكسي" Roof Sign
  const taxiRoofTex = trackTex(createTaxiRoofSignTexture(maxAnisotropy));
  const taxiPlateTex = trackTex(createEgyptianPlateTexture('س ك م ٧٣٥٢', '#EA580C', maxAnisotropy));
  const microbusPlateTex = trackTex(createEgyptianPlateTexture('س ر ط ٤٨١٩', '#0284C7', maxAnisotropy));

  const taxiPlateMat = trackMat(new THREE.MeshStandardMaterial({ map: taxiPlateTex, roughness: 0.35 }));
  const microbusPlateMat = trackMat(new THREE.MeshStandardMaterial({ map: microbusPlateTex, roughness: 0.35 }));
  const npcTaxiRoofMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: taxiRoofTex,
      emissiveMap: taxiRoofTex,
      emissive: new THREE.Color(0xfef08a),
      emissiveIntensity: 1.35,
      roughness: 0.25,
    }),
  );
  const plateGeo = trackGeo(new THREE.PlaneGeometry(0.54, 0.2));

  // Sedan, SUV, NPC Taxi, Police
  const carPaintMats = new Map<number, THREE.MeshStandardMaterial>();
  const getCarPaintMat = (hex: number) => {
    let mat = carPaintMats.get(hex);
    if (!mat) {
      mat = trackMat(
        new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.2,
          metalness: 0.5,
          envMapIntensity: 1.35,
        }),
      );
      carPaintMats.set(hex, mat);
    }
    return mat;
  };
  const npcTaxiBlackMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.2, metalness: 0.55, envMapIntensity: 1.35 }),
  );
  const npcTaxiYellowMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.18, metalness: 0.38, envMapIntensity: 1.38 }),
  );
  const npcTaxiRoofGeo = trackGeo(new THREE.BoxGeometry(0.64, 0.22, 0.22));
  const npcTaxiRoofSideGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.05, 0.26));

  const sedanLowerGeo = trackGeo(new THREE.BoxGeometry(1.82, 0.6, 4.15));
  const sedanUpperGeo = trackGeo(new THREE.BoxGeometry(1.58, 0.54, 2.15));
  const sedanGlassGeo = trackGeo(new THREE.BoxGeometry(1.62, 0.38, 1.85));
  const sedanRoofPillarGeo = trackGeo(new THREE.BoxGeometry(1.64, 0.39, 0.08));
  const taxiHoodStripeGeo = trackGeo(new THREE.BoxGeometry(1.22, 0.03, 1.05));
  const carBumperGeo = trackGeo(new THREE.BoxGeometry(1.86, 0.18, 0.16));
  const carGrilleGeo = trackGeo(new THREE.BoxGeometry(0.88, 0.2, 0.06));
  const suvLowerGeo = trackGeo(new THREE.BoxGeometry(1.98, 0.72, 4.5));
  const suvUpperGeo = trackGeo(new THREE.BoxGeometry(1.74, 0.66, 2.9));
  const suvGlassGeo = trackGeo(new THREE.BoxGeometry(1.78, 0.42, 2.5));
  const carTailGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.15, 0.06));
  const carTireGeo = trackGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 14));
  carTireGeo.rotateZ(Math.PI / 2);

  const polBarBaseGeo = trackGeo(new THREE.BoxGeometry(1.05, 0.1, 0.28));
  const polBeaconGeo = trackGeo(new THREE.BoxGeometry(0.45, 0.14, 0.24));
  const polSideStripeGeo = trackGeo(new THREE.BoxGeometry(1.86, 0.16, 4.18));

  // Motorcycle geometries
  const motoWheelGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 12));
  motoWheelGeo.rotateZ(Math.PI / 2);
  const motoFrameGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.42, 1.35));
  const motoTankGeo = trackGeo(new THREE.BoxGeometry(0.36, 0.24, 0.52));
  const motoHandleGeo = trackGeo(new THREE.BoxGeometry(0.78, 0.07, 0.08));
  const motoHeadGeo = trackGeo(new THREE.SphereGeometry(0.12, 8, 8));
  const riderHelmetGeo = trackGeo(new THREE.SphereGeometry(0.145, 14, 12));
  const helmetMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.35 }));
  const visorMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.5 }));
  const jacketMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 }));

  // Realistic Alexandria Hantour (Egyptian Horse-Drawn Carriage) geometries & materials
  const carriageMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x6b121b, roughness: 0.26, metalness: 0.24, envMapIntensity: 1.25 }),
  );
  const carriageDarkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b1b0e, roughness: 0.48, metalness: 0.12 }),
  );
  const velvetSeatMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x9f1239, roughness: 0.88, metalness: 0.02 }),
  );
  const canopyMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72, metalness: 0.08, side: THREE.DoubleSide }),
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.24, metalness: 0.86, envMapIntensity: 1.4 }),
  );
  const lanternGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.75,
      roughness: 0.2,
    }),
  );
  const leatherHarnessMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.68, metalness: 0.1 }),
  );
  const plumeRedMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55, metalness: 0.05 }),
  );
  const horseCoatMats = [
    trackMat(new THREE.MeshStandardMaterial({ color: 0x6b3519, roughness: 0.58, metalness: 0.06 })), // Chestnut bay
    trackMat(new THREE.MeshStandardMaterial({ color: 0x452212, roughness: 0.56, metalness: 0.08 })), // Dark mahogany bay
    trackMat(new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.62, metalness: 0.04 })), // Classic white/grey horse
  ];
  const horseManeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x16110e, roughness: 0.86 }));
  const horseHoofMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.15 }));
  const horseMuzzleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x261c18, roughness: 0.55 }));

  // Spoked Wheel Geometries (rear R=0.58, front R=0.42)
  const hRearTireGeo = trackGeo(new THREE.TorusGeometry(0.56, 0.036, 8, 24));
  hRearTireGeo.rotateY(Math.PI / 2);
  const hRearRimGeo = trackGeo(new THREE.TorusGeometry(0.515, 0.026, 8, 24));
  hRearRimGeo.rotateY(Math.PI / 2);
  const hRearSpokeGeo = trackGeo(new THREE.CylinderGeometry(0.015, 0.018, 1.02, 6));

  const hFrontTireGeo = trackGeo(new THREE.TorusGeometry(0.40, 0.032, 8, 22));
  hFrontTireGeo.rotateY(Math.PI / 2);
  const hFrontRimGeo = trackGeo(new THREE.TorusGeometry(0.362, 0.022, 8, 22));
  hFrontRimGeo.rotateY(Math.PI / 2);
  const hFrontSpokeGeo = trackGeo(new THREE.CylinderGeometry(0.013, 0.016, 0.72, 6));

  const hHubGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 12));
  hHubGeo.rotateZ(Math.PI / 2);
  const hAxleGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 1.62, 8));
  hAxleGeo.rotateZ(Math.PI / 2);
  const hLeafSpringGeo = trackGeo(new THREE.TorusGeometry(0.24, 0.022, 6, 12, Math.PI));
  hLeafSpringGeo.rotateY(Math.PI / 2);

  // Victoria Carriage Body Geometries
  const hFloorGeo = trackGeo(new THREE.BoxGeometry(1.26, 0.09, 1.62));
  const hRearTubGeo = trackGeo(new THREE.BoxGeometry(1.36, 0.52, 0.96));
  const hSidePanelGeo = trackGeo(new THREE.BoxGeometry(0.07, 0.44, 0.96));
  const hGoldTrimStripGeo = trackGeo(new THREE.BoxGeometry(0.085, 0.045, 0.98));
  const hStepBoardGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.04, 0.36));
  const hSeatCushionGeo = trackGeo(new THREE.BoxGeometry(1.24, 0.16, 0.56));
  const hSeatBackGeo = trackGeo(new THREE.BoxGeometry(1.24, 0.52, 0.14));
  const hCoachBoxGeo = trackGeo(new THREE.BoxGeometry(1.16, 0.44, 0.52));
  const hCoachSeatGeo = trackGeo(new THREE.BoxGeometry(1.18, 0.12, 0.42));
  const hDashBoardGeo = trackGeo(new THREE.BoxGeometry(1.18, 0.46, 0.07));
  const hBrassRailGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 1.18, 8));
  hBrassRailGeo.rotateZ(Math.PI / 2);
  const hCanopyArcGeo = trackGeo(new THREE.CylinderGeometry(0.71, 0.71, 0.96, 14, 1, true, -Math.PI * 0.52, Math.PI * 1.04));
  hCanopyArcGeo.rotateZ(Math.PI / 2);
  const hCanopyBackGeo = trackGeo(new THREE.CircleGeometry(0.71, 14, 0, Math.PI));
  const hCanopyStrutGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.66, 6));
  const hLanternBodyGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.052, 0.18, 8));
  const hLanternCapGeo = trackGeo(new THREE.ConeGeometry(0.082, 0.09, 8));
  const hShaftGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.036, 1.95, 8));
  hShaftGeo.rotateX(Math.PI / 2);
  const hReinGeo = trackGeo(new THREE.CylinderGeometry(0.009, 0.009, 1.85, 6));
  hReinGeo.rotateX(Math.PI / 2);
  const hWhipGeo = trackGeo(new THREE.CylinderGeometry(0.008, 0.015, 1.25, 6));

  // Anatomically Sculpted Horse Geometries
  const horseBarrelGeo = trackGeo(new THREE.CylinderGeometry(0.30, 0.31, 0.96, 14));
  horseBarrelGeo.rotateX(Math.PI / 2);
  const horseChestGeo = trackGeo(new THREE.SphereGeometry(0.32, 14, 12));
  horseChestGeo.scale(0.95, 1.04, 1.02);
  const horseCroupGeo = trackGeo(new THREE.SphereGeometry(0.325, 14, 12));
  horseCroupGeo.scale(0.96, 1.02, 1.08);
  const horseNeckGeo = trackGeo(new THREE.CylinderGeometry(0.145, 0.225, 0.68, 12));
  const horseHeadGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.145, 0.50, 10));
  horseHeadGeo.rotateX(Math.PI / 2);
  const horseMuzzleGeo = trackGeo(new THREE.SphereGeometry(0.092, 10, 8));
  horseMuzzleGeo.scale(0.92, 0.9, 1.12);
  const horseEarGeo = trackGeo(new THREE.ConeGeometry(0.036, 0.14, 6));
  const horseBlinderGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.11, 0.11));
  const horsePlumeGeo = trackGeo(new THREE.ConeGeometry(0.055, 0.20, 8));
  const hPlumeBaseGeo = trackGeo(new THREE.SphereGeometry(0.036, 8, 6));
  const horseManeGeo = trackGeo(new THREE.BoxGeometry(0.065, 0.56, 0.12));
  const horseCollarGeo = trackGeo(new THREE.TorusGeometry(0.245, 0.048, 8, 16));
  const horseGirthGeo = trackGeo(new THREE.TorusGeometry(0.315, 0.025, 6, 16));
  const horseUpperLegGeo = trackGeo(new THREE.CylinderGeometry(0.074, 0.052, 0.48, 8));
  const horseLowerLegGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.036, 0.42, 8));
  const horseHoofGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.054, 0.085, 8));
  const horseTailTopGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.068, 0.46, 8));
  const horseTailLowGeo = trackGeo(new THREE.ConeGeometry(0.072, 0.36, 8));
  horseTailLowGeo.rotateX(Math.PI);

  // ============================================================================
  // REALISTIC ANATOMICAL HUMAN GEOMETRIES & PHOTOGRAPHIC CANVAS TEXTURES
  // ============================================================================
  const skinConfigs: { tone: 'olive' | 'tan' | 'warm' | 'light'; hex: number; beard: boolean }[] = [
    { tone: 'olive', hex: 0xc89572, beard: true },
    { tone: 'tan', hex: 0xb57d58, beard: false },
    { tone: 'warm', hex: 0xd6a484, beard: true },
    { tone: 'light', hex: 0xe4b89b, beard: false },
  ];

  const skinMats = skinConfigs.map((c) =>
    trackMat(new THREE.MeshStandardMaterial({ color: c.hex, roughness: 0.65, metalness: 0.02 })),
  );
  const faceMats = skinConfigs.map((c) => {
    const tex = trackTex(createHumanFaceTexture(c.tone, c.beard, maxAnisotropy));
    return trackMat(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.02 }));
  });

  const darkJeansTex = trackTex(createClothingFabricTexture('#1E293B', 'trousers', maxAnisotropy));
  const khakiTrouserTex = trackTex(createClothingFabricTexture('#4B4237', 'trousers', maxAnisotropy));
  const trousersMats = [
    trackMat(new THREE.MeshStandardMaterial({ map: darkJeansTex, roughness: 0.85 })),
    trackMat(new THREE.MeshStandardMaterial({ map: khakiTrouserTex, roughness: 0.82 })),
  ];

  const shirtFabricTex = trackTex(createClothingFabricTexture('#FFFFFF', 'shirt', maxAnisotropy));
  const policeShirtTex = trackTex(createClothingFabricTexture('#F8FAFC', 'police', maxAnisotropy));
  const policeShirtMat = trackMat(new THREE.MeshStandardMaterial({ map: policeShirtTex, roughness: 0.55 }));
  const policeTrouserMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78 }));
  const policeCapMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }));

  const shoeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.78 }));
  const hairMats = [0x1c1512, 0x2f2118, 0x0f172a, 0x4a3525].map((hex) =>
    trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.88 })),
  );

  const shirtMats = new Map<number, THREE.MeshStandardMaterial>();
  const getShirtMat = (hex: number) => {
    let mat = shirtMats.get(hex);
    if (!mat) {
      mat = trackMat(
        new THREE.MeshStandardMaterial({
          map: shirtFabricTex,
          color: hex,
          roughness: 0.78,
          metalness: 0.02,
        }),
      );
      shirtMats.set(hex, mat);
    }
    return mat;
  };

  // Organic Tapered Human Meshes (~1.74m tall realistic proportions, 1:7.5 head-to-body ratio)
  const humanTorsoGeo = trackGeo(new THREE.CylinderGeometry(0.185, 0.148, 0.52, 12));
  humanTorsoGeo.scale(1.05, 1.0, 0.65);

  const humanPelvisGeo = trackGeo(new THREE.CylinderGeometry(0.148, 0.155, 0.15, 12));
  humanPelvisGeo.scale(1.05, 1.0, 0.68);

  const humanNeckGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.058, 0.11, 10));

  const humanHeadGeo = trackGeo(new THREE.SphereGeometry(0.112, 16, 14));
  humanHeadGeo.scale(0.86, 1.06, 0.94);

  const humanNoseGeo = trackGeo(new THREE.ConeGeometry(0.016, 0.044, 6));
  humanNoseGeo.rotateX(-Math.PI / 2);

  const humanHairCapGeo = trackGeo(
    new THREE.SphereGeometry(0.116, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.53),
  );
  humanHairCapGeo.scale(0.88, 1.04, 0.96);

  const humanHijabGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.145, 0.25, 12));

  const humanShoulderGeo = trackGeo(new THREE.SphereGeometry(0.056, 10, 8));
  const humanUpperArmGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.042, 0.27, 10));
  const humanForearmGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.031, 0.26, 10));
  const humanHandGeo = trackGeo(new THREE.SphereGeometry(0.034, 8, 8));
  humanHandGeo.scale(0.72, 1.15, 0.88);

  const humanThighGeo = trackGeo(new THREE.CylinderGeometry(0.072, 0.056, 0.42, 10));
  const humanCalfGeo = trackGeo(new THREE.CylinderGeometry(0.054, 0.04, 0.39, 10));
  const humanShoeGeo = trackGeo(new THREE.BoxGeometry(0.088, 0.068, 0.21));
  const humanToeGeo = trackGeo(new THREE.SphereGeometry(0.044, 8, 6));
  humanToeGeo.scale(1.0, 0.65, 1.15);

  // Shared human anatomy bundle so GameScene3D can also instance realistic static crowds
  const sharedHumanAssets = {
    humanTorsoGeo,
    humanPelvisGeo,
    humanNeckGeo,
    humanHeadGeo,
    humanHairCapGeo,
    humanUpperArmGeo,
    humanForearmGeo,
    humanThighGeo,
    humanCalfGeo,
    humanShoeGeo,
    faceMat: faceMats[0],
    skinMat: skinMats[0],
    trousersMat: trousersMats[0],
    hairMat: hairMats[0],
    shoeMat,
    shirtFabricTex,
  };

  // Pickup Beacon
  const ringMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.78, side: THREE.DoubleSide }));
  const padMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.26 }));
  const ringGeo = trackGeo(new THREE.RingGeometry(1.9, 2.5, 22));
  ringGeo.rotateX(-Math.PI / 2);
  const padGeo = trackGeo(new THREE.CircleGeometry(1.9, 20));
  padGeo.rotateX(-Math.PI / 2);

  // Traffic Light & Police Officer shared resources
  const poleDarkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 }));
  const policeSashMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.35 }));
  const polePostGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8));
  const poleArmGeo = trackGeo(new THREE.BoxGeometry(5.6, 0.2, 0.2));
  const sigBoxGeo = trackGeo(new THREE.BoxGeometry(0.65, 1.65, 0.45));
  const sigBulbGeo = trackGeo(new THREE.SphereGeometry(0.18, 10, 10));

  // Fuel / Repair / Coin pickups
  const fuelCanMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.35, metalness: 0.25 }));
  const fuelCapMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }));
  const repairBoxMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35 }));
  const repairCrossMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const coinMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xb45309,
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.2,
  }));
  const fuelCanGeo = trackGeo(new THREE.BoxGeometry(0.85, 1.05, 0.55));
  const fuelCapGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8));
  const repairBoxGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.75, 0.65));
  const cross1Geo = trackGeo(new THREE.BoxGeometry(0.45, 0.14, 0.68));
  const cross2Geo = trackGeo(new THREE.BoxGeometry(0.14, 0.45, 0.68));
  const coinGeo = trackGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 14));
  coinGeo.rotateX(Math.PI / 2);

  const buildRealisticHumanRig = (
    shirtMat: THREE.Material,
    trousersMat: THREE.Material,
    variant = 0,
    isOfficer = false,
  ): PedestrianRig => {
    const group = new THREE.Group();
    const skinIdx = variant % skinMats.length;
    const faceMat = faceMats[skinIdx];
    const skinMat = skinMats[skinIdx];
    const hairMat = hairMats[variant % hairMats.length];

    // Torso & Pelvis (1.74m total height)
    const pelvis = new THREE.Mesh(humanPelvisGeo, trousersMat);
    pelvis.position.set(0, 0.89, 0);
    pelvis.castShadow = true;

    const torso = new THREE.Mesh(humanTorsoGeo, shirtMat);
    torso.position.set(0, 1.22, 0);
    torso.castShadow = true;

    const neck = new THREE.Mesh(humanNeckGeo, skinMat);
    neck.position.set(0, 1.51, 0);

    // Realistic Textured Head & Subtle Nose
    const head = new THREE.Mesh(humanHeadGeo, faceMat);
    head.position.set(0, 1.65, 0);
    head.rotation.y = Math.PI / 2; // Align painted face cleanly to -Z forward!
    head.castShadow = true;

    const nose = new THREE.Mesh(humanNoseGeo, skinMat);
    nose.position.set(0, 1.63, -0.105);

    group.add(pelvis, torso, neck, head, nose);

    if (isOfficer) {
      const capCrown = new THREE.Mesh(humanHairCapGeo, policeCapMat);
      capCrown.position.set(0, 1.67, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.11), poleDarkMat);
      visor.position.set(0, 1.68, -0.105);
      const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.12, 12), policeSashMat);
      sash.scale.set(1.06, 1, 0.67);
      sash.position.set(0, 1.18, 0);
      group.add(capCrown, visor, sash);
    } else if (variant % 5 === 2) {
      // Modest Hijab Scarf Wrap
      const hijab = new THREE.Mesh(humanHijabGeo, shirtMat);
      hijab.position.set(0, 1.61, 0.01);
      group.add(hijab);
    } else {
      const hair = new THREE.Mesh(humanHairCapGeo, hairMat);
      hair.position.set(0, 1.655, 0.006);
      group.add(hair);
    }

    // Articulated Shoulder-Pivoted Left & Right Arms (y = 1.43)
    const makeArm = (side: -1 | 1) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.225, 1.43, 0);

      const shoulder = new THREE.Mesh(humanShoulderGeo, shirtMat);
      const upper = new THREE.Mesh(humanUpperArmGeo, shirtMat);
      upper.position.set(0, -0.135, 0);
      const forearm = new THREE.Mesh(humanForearmGeo, isOfficer ? shirtMat : skinMat);
      forearm.position.set(0, -0.37, 0);
      const hand = new THREE.Mesh(humanHandGeo, skinMat);
      hand.position.set(0, -0.52, 0);

      armPivot.add(shoulder, upper, forearm, hand);
      return armPivot;
    };

    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    // Articulated Hip-Pivoted Left & Right Legs (y = 0.85)
    const makeLeg = (side: -1 | 1) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.095, 0.85, 0);

      const thigh = new THREE.Mesh(humanThighGeo, trousersMat);
      thigh.position.set(0, -0.21, 0);
      thigh.castShadow = true;

      const calf = new THREE.Mesh(humanCalfGeo, trousersMat);
      calf.position.set(0, -0.59, 0);
      calf.castShadow = true;

      const shoe = new THREE.Mesh(humanShoeGeo, shoeMat);
      shoe.position.set(0, -0.81, -0.04);
      const toe = new THREE.Mesh(humanToeGeo, shoeMat);
      toe.position.set(0, -0.818, -0.14);

      legPivot.add(thigh, calf, shoe, toe);
      return legPivot;
    };

    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    group.add(leftArm, rightArm, leftLeg, rightLeg);
    return { group, leftLeg, rightLeg, leftArm, rightArm };
  };

  const buildPedestrianRig = (shirtColor: number, variant = 0): PedestrianRig => {
    const shirtMat = getShirtMat(shirtColor);
    const trousersMat = trousersMats[variant % trousersMats.length];
    return buildRealisticHumanRig(shirtMat, trousersMat, variant, false);
  };

  const buildPassengerBeacon = (shirtColor: number, variant = 0): WaitingPassengerRig => {
    const group = new THREE.Group();

    const ringGroup = new THREE.Group();
    ringGroup.position.set(-2.5, 0.06, 0);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const pad = new THREE.Mesh(padGeo, padMat);
    ringGroup.add(ring, pad);

    const pedRig = buildPedestrianRig(shirtColor, variant);
    pedRig.group.position.set(0, 0.18, 0);
    pedRig.group.rotation.y = Math.PI / 2;

    group.add(ringGroup, pedRig.group);
    return {
      group,
      personGroup: pedRig.group,
      ringGroup,
      leftLeg: pedRig.leftLeg,
      rightLeg: pedRig.rightLeg,
      leftArm: pedRig.leftArm,
      rightArm: pedRig.rightArm,
    };
  };

  const buildTrafficSignalAndOfficer = (): TrafficSignalRig => {
    const group = new THREE.Group();

    const pole = new THREE.Mesh(polePostGeo, poleDarkMat);
    pole.position.set(10.3, 3.1, 0);
    const arm = new THREE.Mesh(poleArmGeo, poleDarkMat);
    arm.position.set(7.6, 5.9, 0);

    const housing = new THREE.Mesh(sigBoxGeo, poleDarkMat);
    housing.position.set(5.4, 5.3, 0);

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.15,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.15,
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 2.2,
    });

    const rBulb = new THREE.Mesh(sigBulbGeo, redMat);
    rBulb.position.set(5.4, 5.8, 0.22);
    const yBulb = new THREE.Mesh(sigBulbGeo, yellowMat);
    yBulb.position.set(5.4, 5.3, 0.22);
    const gBulb = new THREE.Mesh(sigBulbGeo, greenMat);
    gBulb.position.set(5.4, 4.8, 0.22);

    // Realistic Egyptian Traffic Police Officer standing on right curb
    const officerRig = buildRealisticHumanRig(policeShirtMat, policeTrouserMat, 0, true);
    officerRig.group.position.set(10.6, 0.2, 1.4);
    officerRig.group.rotation.y = Math.PI * 0.35;

    group.add(pole, arm, housing, rBulb, yBulb, gBulb, officerRig.group);

    return {
      group,
      redMat,
      yellowMat,
      greenMat,
      officerArm: officerRig.rightArm,
    };
  };

  const buildTeammateOfficerRig = () => {
    const officerRig = buildRealisticHumanRig(policeShirtMat, policeTrouserMat, 0, true);
    const paddleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.75,
        roughness: 0.3,
      }),
    );
    const stickGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6));
    const discGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 14));
    const stick = new THREE.Mesh(stickGeo, poleDarkMat);
    stick.position.set(0, -0.58, -0.06);
    stick.rotation.x = Math.PI / 2;
    const disc = new THREE.Mesh(discGeo, paddleMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(0, -0.58, -0.22);
    officerRig.rightArm.add(stick, disc);
    return {
      ...officerRig,
      paddleMat,
    };
  };

  const buildTrafficVehicle = (
    kind: 'microbus' | 'sedan' | 'suv' | 'taxi' | 'police' | 'motorcycle' | 'hantour' | 'cone',
    colorHex: number,
  ): VehicleRig => {
    const group = new THREE.Group();

    if (kind === 'cone') {
      const base = new THREE.Mesh(coneBaseGeo, coneBaseMat);
      base.position.y = 0.04;
      const cone = new THREE.Mesh(coneBodyGeo, coneOrangeMat);
      cone.position.y = 0.48;
      const stripe = new THREE.Mesh(coneStripeGeo, coneWhiteMat);
      stripe.position.y = 0.52;
      group.add(base, cone, stripe);
      return { group };
    }

    if (kind === 'motorcycle') {
      const paint = getCarPaintMat(colorHex);
      const frontW = new THREE.Mesh(motoWheelGeo, tireMat);
      frontW.position.set(0, 0.32, -0.78);
      const rearW = new THREE.Mesh(motoWheelGeo, tireMat);
      rearW.position.set(0, 0.32, 0.72);
      const frame = new THREE.Mesh(motoFrameGeo, paint);
      frame.position.set(0, 0.56, 0);
      const tank = new THREE.Mesh(motoTankGeo, paint);
      tank.position.set(0, 0.82, -0.25);
      const bar = new THREE.Mesh(motoHandleGeo, rackMat);
      bar.position.set(0, 1.04, -0.58);
      const lamp = new THREE.Mesh(motoHeadGeo, headLampMat);
      lamp.position.set(0, 0.88, -0.82);

      // Realistic Proportioned Rider leaning over handlebars
      const riderTorso = new THREE.Mesh(humanTorsoGeo, jacketMat);
      riderTorso.position.set(0, 1.08, 0.14);
      riderTorso.rotation.x = -0.32;
      const riderNeck = new THREE.Mesh(humanNeckGeo, skinMats[0]);
      riderNeck.position.set(0, 1.34, 0.04);
      const riderHelmet = new THREE.Mesh(riderHelmetGeo, helmetMat);
      riderHelmet.name = 'motoHelmet';
      riderHelmet.position.set(0, 1.48, -0.02);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.12), visorMat);
      visor.name = 'motoVisor';
      visor.position.set(0, 1.48, -0.11);

      for (const sx of [-0.18, 0.18]) {
        const arm = new THREE.Mesh(humanUpperArmGeo, jacketMat);
        arm.position.set(sx, 1.15, -0.22);
        arm.rotation.x = 1.15;
        const leg = new THREE.Mesh(humanThighGeo, trousersMats[0]);
        leg.position.set(sx, 0.68, 0.06);
        leg.rotation.x = -0.55;
        group.add(arm, leg);
      }

      group.add(frontW, rearW, frame, tank, bar, lamp, riderTorso, riderNeck, riderHelmet, visor);
      return {
        group,
        animate: (_t, speedMps) => {
          frontW.rotation.x -= speedMps * 0.06;
          rearW.rotation.x -= speedMps * 0.06;
        },
      };
    }

    if (kind === 'hantour') {
      const carriage = new THREE.Group();
      const carriageBody = new THREE.Group();
      carriage.add(carriageBody);

      // Helper to assemble a realistic spoked wooden carriage wheel with iron tire & brass hub
      const makeSpokedWheel = (isRear: boolean) => {
        const wGroup = new THREE.Group();
        const tire = new THREE.Mesh(isRear ? hRearTireGeo : hFrontTireGeo, tireMat);
        const rim = new THREE.Mesh(isRear ? hRearRimGeo : hFrontRimGeo, carriageDarkWoodMat);
        const hub = new THREE.Mesh(hHubGeo, brassMat);
        wGroup.add(tire, rim, hub);
        const spokeGeo = isRear ? hRearSpokeGeo : hFrontSpokeGeo;
        // 4 full-diameter rods rotated every 45 deg = 8 radial spokes!
        for (let s = 0; s < 4; s++) {
          const spoke = new THREE.Mesh(spokeGeo, carriageDarkWoodMat);
          spoke.rotation.x = (s * Math.PI) / 4;
          wGroup.add(spoke);
        }
        return wGroup;
      };

      // Axles & Leaf Springs
      const rearAxle = new THREE.Mesh(hAxleGeo, poleDarkMat);
      rearAxle.position.set(0, 0.58, 1.24);
      const frontAxle = new THREE.Mesh(hAxleGeo, poleDarkMat);
      frontAxle.position.set(0, 0.42, -0.02);
      carriage.add(rearAxle, frontAxle);

      const rearWheels: THREE.Group[] = [];
      const frontWheels: THREE.Group[] = [];
      for (const sx of [-1, 1]) {
        const rw = makeSpokedWheel(true);
        rw.position.set(sx * 0.80, 0.58, 1.24);
        const fw = makeSpokedWheel(false);
        fw.position.set(sx * 0.76, 0.42, -0.02);
        carriage.add(rw, fw);
        rearWheels.push(rw);
        frontWheels.push(fw);

        // Elliptical Leaf Springs under body
        const rSpring = new THREE.Mesh(hLeafSpringGeo, poleDarkMat);
        rSpring.position.set(sx * 0.58, 0.62, 1.24);
        const fSpring = new THREE.Mesh(hLeafSpringGeo, poleDarkMat);
        fSpring.position.set(sx * 0.54, 0.48, -0.02);
        fSpring.scale.setScalar(0.8);
        carriage.add(rSpring, fSpring);

        // Boarding Footsteps on low waist
        const step = new THREE.Mesh(hStepBoardGeo, carriageDarkWoodMat);
        step.position.set(sx * 0.72, 0.44, 0.52);
        carriageBody.add(step);

        // Curved Wooden Harness Shafts reaching horse collar
        const shaft = new THREE.Mesh(hShaftGeo, carriageDarkWoodMat);
        shaft.position.set(sx * 0.41, 0.82, -1.04);
        shaft.rotation.x = -0.14;
        shaft.rotation.y = sx * 0.06;
        carriage.add(shaft);
      }

      // Main Victoria Carriage Hull (low center floor + raised burgundy rear passenger tub)
      const floor = new THREE.Mesh(hFloorGeo, carriageDarkWoodMat);
      floor.position.set(0, 0.58, 0.68);
      floor.castShadow = true;

      const rearTub = new THREE.Mesh(hRearTubGeo, carriageMat);
      rearTub.position.set(0, 0.88, 1.22);
      rearTub.castShadow = true;

      for (const sx of [-1, 1]) {
        const sidePanel = new THREE.Mesh(hSidePanelGeo, carriageMat);
        sidePanel.position.set(sx * 0.65, 1.02, 1.22);
        const goldTrim = new THREE.Mesh(hGoldTrimStripGeo, brassMat);
        goldTrim.position.set(sx * 0.66, 1.21, 1.22);
        carriageBody.add(sidePanel, goldTrim);
      }

      // Plush Crimson Velvet Passenger Bench & Tufted Backrest
      const seatCushion = new THREE.Mesh(hSeatCushionGeo, velvetSeatMat);
      seatCushion.position.set(0, 1.06, 1.18);
      const seatBack = new THREE.Mesh(hSeatBackGeo, velvetSeatMat);
      seatBack.position.set(0, 1.36, 1.54);
      seatBack.rotation.x = -0.16;

      // Iconic Folding Pleated Leather Canopy Hood ("الكابوت") + Brass Folding Struts
      const canopyGroup = new THREE.Group();
      canopyGroup.position.set(0, 1.44, 1.26);
      const canopyArch = new THREE.Mesh(hCanopyArcGeo, canopyMat);
      canopyArch.castShadow = true;
      const canopyBack = new THREE.Mesh(hCanopyBackGeo, canopyMat);
      canopyBack.position.set(0, 0, 0.47);
      const canopyTrimRim = new THREE.Mesh(hBrassRailGeo, brassMat);
      canopyTrimRim.position.set(0, 0.71, -0.47);
      canopyGroup.add(canopyArch, canopyBack, canopyTrimRim);

      for (const sx of [-1, 1]) {
        const strutA = new THREE.Mesh(hCanopyStrutGeo, brassMat);
        strutA.position.set(sx * 0.72, 0.16, 0.18);
        strutA.rotation.x = 0.42;
        const strutB = new THREE.Mesh(hCanopyStrutGeo, brassMat);
        strutB.position.set(sx * 0.72, 0.18, -0.16);
        strutB.rotation.x = -0.34;
        canopyGroup.add(strutA, strutB);
      }

      // Elevated Front Coachman Box ("دكة السواق"), Curved Dashboard & Brass Footrail
      const coachBox = new THREE.Mesh(hCoachBoxGeo, carriageMat);
      coachBox.position.set(0, 0.96, -0.02);
      coachBox.castShadow = true;
      const coachSeat = new THREE.Mesh(hCoachSeatGeo, velvetSeatMat);
      coachSeat.position.set(0, 1.22, 0.02);
      const dashBoard = new THREE.Mesh(hDashBoardGeo, carriageDarkWoodMat);
      dashBoard.position.set(0, 1.14, -0.32);
      dashBoard.rotation.x = 0.28;
      const dashBrass = new THREE.Mesh(hBrassRailGeo, brassMat);
      dashBrass.position.set(0, 1.38, -0.38);

      // Twin Classic Brass Carriage Side Lanterns ("فوانيس الحنطور")
      for (const sx of [-1, 1]) {
        const lantern = new THREE.Group();
        lantern.position.set(sx * 0.72, 1.42, -0.16);
        const lGlass = new THREE.Mesh(hLanternBodyGeo, lanternGlowMat);
        const lCap = new THREE.Mesh(hLanternCapGeo, brassMat);
        lCap.position.y = 0.13;
        const lBase = new THREE.Mesh(hLanternCapGeo, brassMat);
        lBase.rotation.x = Math.PI;
        lBase.position.y = -0.12;
        lantern.add(lGlass, lCap, lBase);
        carriageBody.add(lantern);
      }

      // Coachman seated up front holding reins & carriage whip
      const coachmanShirt = getShirtMat(0x1e3a5f);
      const coachTorso = new THREE.Mesh(humanTorsoGeo, coachmanShirt);
      coachTorso.position.set(0, 1.54, 0.02);
      coachTorso.rotation.x = -0.1;
      const coachNeck = new THREE.Mesh(humanNeckGeo, skinMats[1]);
      coachNeck.position.set(0, 1.82, -0.01);
      const coachHead = new THREE.Mesh(humanHeadGeo, faceMats[1]);
      coachHead.position.set(0, 1.96, -0.02);
      coachHead.rotation.y = Math.PI / 2;
      const coachCap = new THREE.Mesh(humanHairCapGeo, carriageDarkWoodMat);
      coachCap.position.set(0, 1.98, -0.01);
      for (const sx of [-0.19, 0.19]) {
        const arm = new THREE.Mesh(humanUpperArmGeo, coachmanShirt);
        arm.position.set(sx, 1.58, -0.18);
        arm.rotation.x = 1.05;
        const rein = new THREE.Mesh(hReinGeo, leatherHarnessMat);
        rein.position.set(sx * 0.9, 1.48, -1.16);
        rein.rotation.x = 0.08;
        carriageBody.add(arm, rein);
      }
      const whip = new THREE.Mesh(hWhipGeo, carriageDarkWoodMat);
      whip.position.set(0.32, 1.96, -0.45);
      whip.rotation.x = -0.42;
      whip.rotation.z = -0.14;

      // Sightseeing Passenger seated in the velvet rear bench!
      const paxShirt = getShirtMat(colorHex || 0x0284c7);
      const paxTorso = new THREE.Mesh(humanTorsoGeo, paxShirt);
      paxTorso.position.set(-0.24, 1.40, 1.24);
      const paxNeck = new THREE.Mesh(humanNeckGeo, skinMats[2]);
      paxNeck.position.set(-0.24, 1.68, 1.24);
      const paxHead = new THREE.Mesh(humanHeadGeo, faceMats[2]);
      paxHead.position.set(-0.24, 1.82, 1.24);
      paxHead.rotation.y = Math.PI / 2;
      const paxHair = new THREE.Mesh(humanHairCapGeo, hairMats[1]);
      paxHair.position.set(-0.24, 1.83, 1.25);

      carriageBody.add(
        floor,
        rearTub,
        seatCushion,
        seatBack,
        canopyGroup,
        coachBox,
        coachSeat,
        dashBoard,
        dashBrass,
        coachTorso,
        coachNeck,
        coachHead,
        coachCap,
        whip,
        paxTorso,
        paxNeck,
        paxHead,
        paxHair,
      );

      // Anatomically Sculpted Alexandria Carriage Horse
      const horseMat = horseCoatMats[Math.abs(colorHex) % horseCoatMats.length];
      const horse = new THREE.Group();
      horse.position.set(0, 0, -1.52);

      const hBarrel = new THREE.Mesh(horseBarrelGeo, horseMat);
      hBarrel.position.set(0, 1.08, 0.02);
      hBarrel.castShadow = true;

      const hChest = new THREE.Mesh(horseChestGeo, horseMat);
      hChest.position.set(0, 1.10, -0.46);
      hChest.castShadow = true;

      const hCroup = new THREE.Mesh(horseCroupGeo, horseMat);
      hCroup.position.set(0, 1.12, 0.48);
      hCroup.castShadow = true;

      // Leather Harness Collar & Belly Girth Strap
      const hCollar = new THREE.Mesh(horseCollarGeo, leatherHarnessMat);
      hCollar.position.set(0, 1.18, -0.58);
      hCollar.rotation.x = 0.34;
      const hGirth = new THREE.Mesh(horseGirthGeo, leatherHarnessMat);
      hGirth.position.set(0, 1.08, -0.14);

      // Articulated Neck + Sculpted Head + Ears + Blinders + Egyptian Red/Gold Plume
      const neckPivot = new THREE.Group();
      neckPivot.position.set(0, 1.22, -0.54);

      const hNeck = new THREE.Mesh(horseNeckGeo, horseMat);
      hNeck.position.set(0, 0.28, -0.18);
      hNeck.rotation.x = 0.54;
      hNeck.castShadow = true;

      const hMane = new THREE.Mesh(horseManeGeo, horseManeMat);
      hMane.position.set(0, 0.34, -0.06);
      hMane.rotation.x = 0.54;

      const hHead = new THREE.Mesh(horseHeadGeo, horseMat);
      hHead.position.set(0, 0.52, -0.48);
      hHead.rotation.x = 0.46;
      hHead.castShadow = true;

      const hMuzzle = new THREE.Mesh(horseMuzzleGeo, horseMuzzleMat);
      hMuzzle.position.set(0, 0.41, -0.70);

      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(horseEarGeo, horseMat);
        ear.position.set(sx * 0.08, 0.72, -0.34);
        ear.rotation.x = -0.18;
        ear.rotation.z = -sx * 0.14;
        const blinder = new THREE.Mesh(horseBlinderGeo, leatherHarnessMat);
        blinder.position.set(sx * 0.125, 0.57, -0.45);
        neckPivot.add(ear, blinder);
      }

      // Traditional Red & Gold Forehead Plume ("زينة وريشة الحنطور")
      const plumeBase = new THREE.Mesh(hPlumeBaseGeo, brassMat);
      plumeBase.position.set(0, 0.70, -0.37);
      const plume = new THREE.Mesh(horsePlumeGeo, plumeRedMat);
      plume.position.set(0, 0.80, -0.36);
      plume.rotation.x = 0.18;

      neckPivot.add(hNeck, hMane, hHead, hMuzzle, plumeBase, plume);

      // Articulated Flowing Tail
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 1.18, 0.76);
      const tailTop = new THREE.Mesh(horseTailTopGeo, horseManeMat);
      tailTop.position.set(0, -0.22, 0.08);
      tailTop.rotation.x = 0.28;
      const tailLow = new THREE.Mesh(horseTailLowGeo, horseManeMat);
      tailLow.position.set(0, -0.58, 0.16);
      tailPivot.add(tailTop, tailLow);

      // 4 Articulated Two-Segment Legs (shoulder/hip at y=0.95, hooves resting cleanly at y=0)
      const makeHorseLeg = (lx: number, lz: number) => {
        const hipPivot = new THREE.Group();
        hipPivot.position.set(lx, 0.94, lz);
        const upper = new THREE.Mesh(horseUpperLegGeo, horseMat);
        upper.position.set(0, -0.24, 0);
        upper.castShadow = true;

        const kneePivot = new THREE.Group();
        kneePivot.position.set(0, -0.46, 0);
        const lower = new THREE.Mesh(horseLowerLegGeo, horseMat);
        lower.position.set(0, -0.21, 0);
        const hoof = new THREE.Mesh(horseHoofGeo, horseHoofMat);
        hoof.position.set(0, -0.435, -0.01);
        kneePivot.add(lower, hoof);

        hipPivot.add(upper, kneePivot);
        return { hipPivot, kneePivot };
      };

      const legFL = makeHorseLeg(-0.18, -0.48);
      const legFR = makeHorseLeg(0.18, -0.48);
      const legBL = makeHorseLeg(-0.18, 0.48);
      const legBR = makeHorseLeg(0.18, 0.48);

      horse.add(
        hBarrel,
        hChest,
        hCroup,
        hCollar,
        hGirth,
        neckPivot,
        tailPivot,
        legFL.hipPivot,
        legFR.hipPivot,
        legBL.hipPivot,
        legBR.hipPivot,
      );
      group.add(carriage, horse);

      return {
        group,
        animate: (t, speedMps) => {
          const moving = speedMps > 0.25;
          // Physically proportional wheel rotation
          const rSpin = speedMps * 0.055;
          const fSpin = speedMps * 0.075;
          for (let w = 0; w < rearWheels.length; w++) {
            rearWheels[w].rotation.x -= rSpin;
            frontWheels[w].rotation.x -= fSpin;
          }
          // Diagonal trotting gait with realistic knee flexion, head bob & tail swish
          const phase = t * 9.2;
          const swing = moving ? Math.sin(phase) * 0.46 : 0;
          const kneeA = moving ? Math.max(0, Math.cos(phase)) * 0.42 : 0;
          const kneeB = moving ? Math.max(0, -Math.cos(phase)) * 0.42 : 0;

          legFL.hipPivot.rotation.x = swing;
          legFL.kneePivot.rotation.x = kneeA;
          legBR.hipPivot.rotation.x = swing * 0.92;
          legBR.kneePivot.rotation.x = -kneeA * 0.55;

          legFR.hipPivot.rotation.x = -swing;
          legFR.kneePivot.rotation.x = kneeB;
          legBL.hipPivot.rotation.x = -swing * 0.92;
          legBL.kneePivot.rotation.x = -kneeB * 0.55;

          horse.position.y = moving ? Math.abs(Math.sin(phase)) * 0.045 : 0;
          neckPivot.rotation.x = moving ? Math.sin(phase * 2) * 0.065 : Math.sin(t * 1.4) * 0.025;
          tailPivot.rotation.z = Math.sin(t * 3.8) * (moving ? 0.16 : 0.07);
          carriageBody.position.y = moving ? Math.sin(phase * 2) * 0.015 : 0;
        },
      };
    }

    if (kind === 'microbus') {
      // Iconic White Alexandria Microbus with Dual Blue Side Stripes, Divided Glass Bays, Roof Rack & Spinning Wheels
      const lowerBody = new THREE.Mesh(mbLowerGeo, whiteMat);
      lowerBody.position.y = 0.72;
      lowerBody.castShadow = true;
      group.add(lowerBody);

      const upperCabin = new THREE.Mesh(mbCabinGeo, whiteMat);
      upperCabin.position.set(0, 1.48, 0.22);
      upperCabin.castShadow = true;
      group.add(upperCabin);

      const frontNose = new THREE.Mesh(mbNoseGeo, whiteMat);
      frontNose.position.set(0, 1.12, -2.14);
      frontNose.rotation.x = 0.18;
      group.add(frontNose);

      // Dual iconic Alexandria Mashrou3 blue stripes
      const mainStripe = new THREE.Mesh(mbStripeGeo, blueStripeMat);
      mainStripe.position.y = 0.88;
      const thinStripe = new THREE.Mesh(mbThinStripeGeo, navyMat);
      thinStripe.position.y = 0.68;
      group.add(mainStripe, thinStripe);

      // Sunset-reflective front windshield, 4 divided side bays, and rear window
      const windshield = new THREE.Mesh(mbWindGeo, glassMat);
      windshield.position.set(0, 1.48, -2.16);
      windshield.rotation.x = 0.22;
      group.add(windshield);

      for (const wz of [-1.25, -0.15, 0.95, 1.95]) {
        const winBay = new THREE.Mesh(mbSideWinGeo, glassMat);
        winBay.position.set(0, 1.48, wz);
        group.add(winBay);
      }
      const rearWin = new THREE.Mesh(mbRearWinGeo, glassMat);
      rearWin.position.set(0, 1.48, 2.45);
      group.add(rearWin);

      // Front radiator grille, front/rear bumpers & Egyptian blue-top license plates
      const grille = new THREE.Mesh(carGrilleGeo, bumperDarkMat);
      grille.position.set(0, 0.66, -2.47);
      const frontBumper = new THREE.Mesh(mbBumperGeo, bumperDarkMat);
      frontBumper.position.set(0, 0.42, -2.46);
      const rearBumper = new THREE.Mesh(mbBumperGeo, bumperDarkMat);
      rearBumper.position.set(0, 0.42, 2.46);
      const fPlate = new THREE.Mesh(plateGeo, microbusPlateMat);
      fPlate.position.set(0, 0.44, -2.56);
      fPlate.rotation.y = Math.PI;
      const rPlate = new THREE.Mesh(plateGeo, microbusPlateMat);
      rPlate.position.set(0, 0.44, 2.56);
      group.add(grille, frontBumper, rearBumper, fPlate, rPlate);

      // Roof rack + crossbars + glowing amber roof markers
      const rack = new THREE.Mesh(mbRackGeo, rackMat);
      rack.position.set(0, 1.97, 0.35);
      group.add(rack);
      for (const rz of [-0.95, 0.35, 1.65]) {
        const rail = new THREE.Mesh(mbRackRailGeo, rackMat);
        rail.position.set(0, 2.02, rz);
        group.add(rail);
      }
      for (const sx of [-0.74, 0.74]) {
        const roofMarker = new THREE.Mesh(mbRoofLampGeo, amberSignalMat);
        roofMarker.position.set(sx, 1.94, -1.96);
        const mirror = new THREE.Mesh(mirrorPodGeo, bumperDarkMat);
        mirror.position.set(sx * 1.46, 1.24, -1.85);
        group.add(roofMarker, mirror);
      }

      // Twin bright headlights + amber corners + glowing rear brake lamps
      for (const sx of [-0.72, 0.72]) {
        const hl = new THREE.Mesh(mbTailGeo, headLampMat);
        hl.position.set(sx, 0.68, -2.48);
        const tl = new THREE.Mesh(mbTailGeo, tailMat);
        tl.position.set(sx, 0.72, 2.48);
        group.add(hl, tl);
      }

      const mbWheels: THREE.Group[] = [];
      for (const [wx, wz] of [
        [-0.98, -1.55],
        [0.98, -1.55],
        [-0.98, 1.55],
        [0.98, 1.55],
      ]) {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(wx, 0.36, wz);
        const tire = new THREE.Mesh(mbTireGeo, tireMat);
        const rim = new THREE.Mesh(wheelRimGeo, hubcapMat);
        wheelGroup.add(tire, rim);
        group.add(wheelGroup);
        mbWheels.push(wheelGroup);
      }
      return {
        group,
        animate: (_t, speedMps) => {
          const spin = speedMps * 0.055;
          for (const wg of mbWheels) wg.rotation.x -= spin;
        },
      };
    }

    const isSuv = kind === 'suv';
    const isTaxi = kind === 'taxi';
    const isPolice = kind === 'police';
    const bodyW = isSuv ? 1.98 : 1.82;
    const bodyLen = isSuv ? 4.5 : 4.15;
    const lowerMat = isTaxi
      ? npcTaxiBlackMat
      : isPolice
        ? whiteMat
        : getCarPaintMat(colorHex);
    const upperMat = isTaxi ? npcTaxiYellowMat : isPolice ? whiteMat : lowerMat;

    const lower = new THREE.Mesh(isSuv ? suvLowerGeo : sedanLowerGeo, lowerMat);
    lower.position.y = 0.56;
    lower.castShadow = true;
    group.add(lower);

    const upper = new THREE.Mesh(isSuv ? suvUpperGeo : sedanUpperGeo, upperMat);
    upper.position.set(0, isSuv ? 1.24 : 1.12, isSuv ? 0.35 : 0.12);
    upper.castShadow = true;
    group.add(upper);

    // Front & rear bumpers + radiator grille
    const fBumper = new THREE.Mesh(carBumperGeo, bumperDarkMat);
    fBumper.position.set(0, 0.36, -bodyLen / 2 - 0.03);
    const rBumper = new THREE.Mesh(carBumperGeo, bumperDarkMat);
    rBumper.position.set(0, 0.36, bodyLen / 2 + 0.03);
    const grille = new THREE.Mesh(carGrilleGeo, bumperDarkMat);
    grille.position.set(0, 0.56, -bodyLen / 2 - 0.02);
    group.add(fBumper, rBumper, grille);

    if (isTaxi) {
      // Yellow Alexandria Taxi hood stripe + side mirrors + illuminated "تاكسي" roof sign + Egyptian front/rear plates
      const hoodStripe = new THREE.Mesh(taxiHoodStripeGeo, npcTaxiYellowMat);
      hoodStripe.position.set(0, 0.87, -1.42);
      const sign = new THREE.Mesh(npcTaxiRoofGeo, npcTaxiRoofMat);
      sign.position.set(0, 1.5, 0.05);
      const signCap = new THREE.Mesh(npcTaxiRoofSideGeo, npcTaxiBlackMat);
      signCap.position.set(0, 1.4, 0.05);
      const fPlate = new THREE.Mesh(plateGeo, taxiPlateMat);
      fPlate.position.set(0, 0.38, -bodyLen / 2 - 0.12);
      fPlate.rotation.y = Math.PI;
      const rPlate = new THREE.Mesh(plateGeo, taxiPlateMat);
      rPlate.position.set(0, 0.38, bodyLen / 2 + 0.12);
      group.add(hoodStripe, sign, signCap, fPlate, rPlate);
    }

    let policeRedMat: THREE.MeshStandardMaterial | null = null;
    let policeBlueMat: THREE.MeshStandardMaterial | null = null;
    if (isPolice) {
      const stripe = new THREE.Mesh(polSideStripeGeo, navyMat);
      stripe.position.y = 0.64;
      group.add(stripe);

      const barBase = new THREE.Mesh(polBarBaseGeo, glassMat);
      barBase.position.set(0, 1.44, 0.1);
      group.add(barBase);

      policeRedMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 2.2,
      });
      policeBlueMat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.3,
      });
      const rBulb = new THREE.Mesh(polBeaconGeo, policeRedMat);
      rBulb.position.set(-0.27, 1.5, 0.1);
      const bBulb = new THREE.Mesh(polBeaconGeo, policeBlueMat);
      bBulb.position.set(0.27, 1.5, 0.1);
      group.add(rBulb, bBulb);
    }

    const glass = new THREE.Mesh(isSuv ? suvGlassGeo : sedanGlassGeo, glassMat);
    glass.position.set(0, isSuv ? 1.24 : 1.12, isSuv ? 0.35 : 0.12);
    group.add(glass);

    if (!isSuv) {
      const bPillar = new THREE.Mesh(sedanRoofPillarGeo, isTaxi ? npcTaxiBlackMat : upperMat);
      bPillar.position.set(0, 1.13, 0.15);
      group.add(bPillar);
    }

    for (const sx of [-bodyW * 0.51, bodyW * 0.51]) {
      const mirror = new THREE.Mesh(mirrorPodGeo, isTaxi ? npcTaxiYellowMat : upperMat);
      mirror.position.set(sx, 0.94, -0.58);
      group.add(mirror);
    }

    for (const sx of [-bodyW * 0.34, bodyW * 0.34]) {
      const hl = new THREE.Mesh(carTailGeo, headLampMat);
      hl.position.set(sx, 0.58, -bodyLen / 2 - 0.03);
      const tl = new THREE.Mesh(carTailGeo, tailMat);
      tl.position.set(sx, 0.58, bodyLen / 2 + 0.03);
      group.add(hl, tl);
    }

    const carWheels: THREE.Group[] = [];
    for (const [wx, wz] of [
      [-bodyW / 2, -bodyLen * 0.3],
      [bodyW / 2, -bodyLen * 0.3],
      [-bodyW / 2, bodyLen * 0.3],
      [bodyW / 2, bodyLen * 0.3],
    ]) {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, 0.35, wz);
      const tire = new THREE.Mesh(carTireGeo, tireMat);
      const rim = new THREE.Mesh(wheelRimGeo, hubcapMat);
      wheelGroup.add(tire, rim);
      group.add(wheelGroup);
      carWheels.push(wheelGroup);
    }

    if (isPolice && policeRedMat && policeBlueMat) {
      return {
        group,
        animate: (t, speedMps) => {
          const flash = Math.floor(t * 7.5) % 2 === 0;
          policeRedMat!.emissiveIntensity = flash ? 3.2 : 0.25;
          policeBlueMat!.emissiveIntensity = flash ? 0.25 : 3.2;
          const spin = speedMps * 0.055;
          for (const wg of carWheels) wg.rotation.x -= spin;
        },
      };
    }

    return {
      group,
      animate: (_t, speedMps) => {
        const spin = speedMps * 0.055;
        for (const wg of carWheels) wg.rotation.x -= spin;
      },
    };
  };

  const buildPickupItem = (kind: 'fuel' | 'repair' | 'coin'): THREE.Group => {
    const group = new THREE.Group();
    if (kind === 'fuel') {
      const can = new THREE.Mesh(fuelCanGeo, fuelCanMat);
      can.position.y = 0.65;
      const cap = new THREE.Mesh(fuelCapGeo, fuelCapMat);
      cap.position.set(0.22, 1.24, 0);
      group.add(can, cap);
    } else if (kind === 'repair') {
      const box = new THREE.Mesh(repairBoxGeo, repairBoxMat);
      box.position.y = 0.55;
      const cross1 = new THREE.Mesh(cross1Geo, repairCrossMat);
      cross1.position.y = 0.55;
      const cross2 = new THREE.Mesh(cross2Geo, repairCrossMat);
      cross2.position.y = 0.55;
      group.add(box, cross1, cross2);
    } else {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.y = 0.85;
      group.add(coin);
    }
    return group;
  };

  const attachCheckpointDriver3D = (
    vehicleGroup: THREE.Group,
    kind: 'sedan' | 'taxi' | 'suv' | 'microbus' | 'motorcycle',
    driver: DriverAppearance,
    hasContraband: boolean,
  ): CheckpointInspectionRig => {
    const isMoto = kind === 'motorcycle';
    const isMicrobus = kind === 'microbus';
    const isSuv = kind === 'suv';

    const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: driver.skinThreeHex, roughness: 0.72 }));
    const hairMat = trackMat(new THREE.MeshStandardMaterial({ color: driver.hairThreeHex, roughness: 0.75 }));
    const shirtMat = trackMat(new THREE.MeshStandardMaterial({ color: driver.shirtThreeHex, roughness: 0.75 }));
    const cardWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
    const cardBlueMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }));
    const glassesMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.75 }));

    const driverGroup = new THREE.Group();
    if (isMoto) {
      // Hide default full-face helmet so real rider face matches photo check
      const mh = vehicleGroup.getObjectByName('motoHelmet');
      const mv = vehicleGroup.getObjectByName('motoVisor');
      if (mh) mh.visible = false;
      if (mv) mv.visible = false;
      driverGroup.position.set(0, 1.48, -0.02);
      driverGroup.rotation.y = -Math.PI * 0.42;
    } else {
      const seatX = isMicrobus ? -0.78 : -0.76;
      const seatY = isMicrobus ? 1.44 : isSuv ? 1.24 : 1.13;
      const seatZ = isMicrobus ? -1.25 : -0.22;
      driverGroup.position.set(seatX, seatY, seatZ);
      driverGroup.rotation.y = -Math.PI * 0.46; // Looking left directly out driver window at officer
    }

    // Open-window dark backing recess for cars
    if (!isMoto) {
      const recess = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.38, 0.66)),
        bumperDarkMat,
      );
      recess.position.set(0, 0, -0.14);
      driverGroup.add(recess);
    }

    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.135, 14, 12)), skinMat);
    head.scale.set(0.95, 1.08, 0.98);
    driverGroup.add(head);

    // Eyes / face direction (-Z of driverGroup faces the officer outside left window)
    if (driver.hasGlasses) {
      const glassFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.17, 0.048, 0.05)), glassesMat);
      glassFrame.position.set(0, 0.02, -0.118);
      driverGroup.add(glassFrame);
    } else {
      const eyeGeo = trackGeo(new THREE.SphereGeometry(0.017, 6, 6));
      for (const ex of [-0.042, 0.042]) {
        const eye = new THREE.Mesh(eyeGeo, glassesMat);
        eye.position.set(ex, 0.025, -0.122);
        driverGroup.add(eye);
      }
    }

    // Beard if applicable
    if (driver.hasBeard) {
      const beard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.085, 0.09)), hairMat);
      beard.position.set(0, -0.075, -0.072);
      driverGroup.add(beard);
    }

    // Hair / Cap
    if (driver.hairStyle === 'cap') {
      const capCrown = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.142, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56)), hairMat);
      capCrown.position.y = 0.015;
      const capBrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.022, 0.12)), hairMat);
      capBrim.position.set(0, 0.05, -0.13);
      driverGroup.add(capCrown, capBrim);
    } else if (driver.hairStyle !== 'bald') {
      const hairCap = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(driver.hairStyle === 'curly' ? 0.152 : 0.141, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58)),
        hairMat,
      );
      hairCap.position.y = 0.018;
      driverGroup.add(hairCap);
    }

    if (!isMoto) {
      const shoulders = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.18, 0.16)), shirtMat);
      shoulders.position.set(0, -0.21, 0.02);
      driverGroup.add(shoulders);
    }

    vehicleGroup.add(driverGroup);

    // Articulated Arm Extending Egyptian Driver's License Card out Window
    const handGroup = new THREE.Group();
    const baseHandX = isMoto ? -0.18 : isMicrobus ? -0.84 : -0.82;
    const baseHandY = isMoto ? 1.12 : isMicrobus ? 1.24 : isSuv ? 1.04 : 0.94;
    const baseHandZ = isMoto ? -0.12 : isMicrobus ? -1.32 : -0.26;
    handGroup.position.set(baseHandX, baseHandY, baseHandZ);

    const forearm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.07, 0.07)), skinMat);
    forearm.position.set(-0.18, 0, 0);
    const sleeve = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.088, 0.088)), shirtMat);
    sleeve.position.set(-0.08, 0, 0);

    // Egyptian License Card in Driver's Fingertips
    const licenseCard = new THREE.Group();
    licenseCard.position.set(-0.4, 0.03, 0);
    licenseCard.rotation.y = Math.PI * 0.15;
    const cardBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.014, 0.13, 0.21)), cardWhiteMat);
    const cardHeader = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.017, 0.032, 0.2)), cardBlueMat);
    cardHeader.position.set(0, 0.044, 0);
    const cardPhoto = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.018, 0.06, 0.052)), shirtMat);
    cardPhoto.position.set(0, -0.012, -0.055);
    licenseCard.add(cardBase, cardHeader, cardPhoto);

    handGroup.add(sleeve, forearm, licenseCard);
    handGroup.scale.setScalar(0.01);
    vehicleGroup.add(handGroup);

    // Rear Trunk Prop (for Sedan, Taxi, SUV, Microbus)
    let trunkPivot: THREE.Group | null = null;
    if (!isMoto) {
      const rearZ = isMicrobus ? 2.46 : isSuv ? 2.26 : 2.08;
      const trunkY = isMicrobus ? 0.92 : isSuv ? 0.9 : 0.82;
      const trunkAssembly = new THREE.Group();
      trunkAssembly.position.set(0, trunkY, rearZ);

      const interior = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.38, 0.42, 0.56)),
        bumperDarkMat,
      );
      interior.position.set(0, -0.18, -0.26);
      trunkAssembly.add(interior);

      if (hasContraband) {
        const crateMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 }));
        const tapeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.45 }));
        const crate1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.34, 0.36)), crateMat);
        crate1.position.set(-0.28, -0.06, -0.12);
        const strap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.07, 0.38)), tapeMat);
        strap.position.set(-0.28, -0.02, -0.12);
        const sack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.28, 0.34)), bumperDarkMat);
        sack.position.set(0.28, -0.08, -0.12);
        trunkAssembly.add(crate1, strap, sack);
      } else {
        const spare = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 14)),
          tireMat,
        );
        spare.rotation.x = Math.PI / 2;
        spare.position.set(0, -0.12, -0.16);
        trunkAssembly.add(spare);
      }

      trunkPivot = new THREE.Group();
      trunkPivot.position.set(0, 0.1, -0.18);
      const lidMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.42, 0.08, 0.48)),
        bumperDarkMat,
      );
      lidMesh.position.set(0, 0, 0.14);
      trunkPivot.add(lidMesh);
      trunkAssembly.add(trunkPivot);
      vehicleGroup.add(trunkAssembly);
    }

    let handTarget = 0;
    let handNow = 0;
    let trunkTarget = 0;
    let trunkNow = 0;

    return {
      setHandExtended: (ext: boolean) => {
        handTarget = ext ? 1 : 0;
      },
      setTrunkOpen: (open: boolean) => {
        trunkTarget = open ? 1 : 0;
      },
      update: (dt: number) => {
        handNow = THREE.MathUtils.damp(handNow, handTarget, 9, dt);
        const s = Math.max(0.01, handNow);
        handGroup.scale.set(s, s, s);
        handGroup.position.x = baseHandX - handNow * 0.22;
        handGroup.rotation.z = (1 - handNow) * 0.45;

        if (trunkPivot) {
          trunkNow = THREE.MathUtils.damp(trunkNow, trunkTarget, 7, dt);
          trunkPivot.rotation.x = trunkNow * 1.12;
        }
      },
    };
  };

  const dispose = () => {
    trackedGeos.forEach((g) => g.dispose());
    trackedMats.forEach((m) => m.dispose());
    trackedTexs.forEach((t) => t.dispose());
    carPaintMats.clear();
    shirtMats.clear();
  };

  return {
    sharedHumanAssets,
    buildTrafficVehicle,
    buildTrafficSignalAndOfficer,
    buildTeammateOfficerRig,
    buildPassengerBeacon,
    buildPedestrianRig,
    buildPickupItem,
    attachCheckpointDriver3D,
    dispose,
  };
}
