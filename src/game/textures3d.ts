import * as THREE from 'three';

export function createRoadTexture(maxAnisotropy: number, repeatY = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pure flat solid black asphalt (#000000) — zero blue, zero grey wash, zero glare
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 512);

  // Crisp pure white (#FFFFFF) outer road edge lines
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(6, 0, 10, 512);
  ctx.fillRect(496, 0, 10, 512);

  // Crisp pure white (#FFFFFF) dashed center & traffic lane divider lines
  ctx.fillStyle = '#FFFFFF';
  for (const lx of [111, 224, 332, 428]) {
    const lw = lx === 224 ? 12 : 9;
    for (let y = 16; y < 512; y += 128) {
      ctx.fillRect(lx - lw * 0.5, y, lw, 74);
    }
  }

  // Big bold pure white (#FFFFFF) forward arrow pointing straight ahead (Montaza Palace -> Bahary)
  // On 3D road ribbon (flipY = true), upward on canvas (-Y) maps directly forward (-Z toward Bahary)
  const drawForwardArrow = (cx: number) => {
    ctx.fillStyle = '#FFFFFF';
    // Large sharp triangular arrowhead
    ctx.beginPath();
    ctx.moveTo(cx, 62);
    ctx.lineTo(cx + 38, 178);
    ctx.lineTo(cx + 15, 178);
    ctx.lineTo(cx + 15, 366);
    ctx.lineTo(cx - 15, 366);
    ctx.lineTo(cx - 15, 178);
    ctx.lineTo(cx - 38, 178);
    ctx.closePath();
    ctx.fill();
  };
  drawForwardArrow(380);
  drawForwardArrow(280);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createYellowBlackCurbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Crisp pure white (#FFFFFF) sidewalk curb edge framing the black sidewalks
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 128, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCornichePromenadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pure solid black (#000000) right sidewalk with crisp white (#FFFFFF) outer border edge
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 26, 512);
  ctx.fillRect(486, 0, 26, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSidewalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Pure solid black (#000000) left sidewalk with crisp white (#FFFFFF) street-side border edge
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(236, 0, 20, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCrosswalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = '#FFFFFF';
  for (let x = 14; x < 496; x += 38) {
    ctx.fillRect(x, 12, 22, 104);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSeaTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rich vivid Mediterranean blue base
  const baseGrad = ctx.createLinearGradient(0, 0, 512, 0);
  baseGrad.addColorStop(0, '#1366e0');
  baseGrad.addColorStop(0.5, '#0a4db8');
  baseGrad.addColorStop(1, '#1366e0');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Layered rolling blue wave troughs and cobalt swells running parallel to shore (vertical Y bands)
  for (let i = 0; i < 420; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = 10 + Math.random() * 26;
    const h = 36 + Math.random() * 110;
    ctx.fillStyle =
      i % 5 === 0
        ? 'rgba(96, 165, 250, 0.36)'
        : i % 3 === 0
          ? 'rgba(59, 130, 246, 0.34)'
          : 'rgba(10, 42, 118, 0.48)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distinct foaming whitecap wave lines parallel to shoreline
  for (let wIdx = 0; wIdx < 16; wIdx++) {
    const wx = ((wIdx + 0.5) / 16) * 512 + (Math.random() - 0.5) * 14;
    ctx.strokeStyle =
      wIdx % 2 === 0 ? 'rgba(235, 245, 255, 0.65)' : 'rgba(191, 219, 254, 0.46)';
    ctx.lineWidth = wIdx % 3 === 0 ? 4.5 : 2.6;
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 16) {
      const jitter = Math.sin(y * 0.045 + wIdx * 1.7) * 8 + Math.cos(y * 0.11 + wIdx) * 3;
      if (y === 0) ctx.moveTo(wx + jitter, y);
      else ctx.lineTo(wx + jitter, y);
    }
    ctx.stroke();

    // Fine foam lace bubbles along wave crest
    for (let b = 0; b < 18; b++) {
      const by = Math.random() * 512;
      const bx = wx + Math.sin(by * 0.045 + wIdx * 1.7) * 8 + (Math.random() - 0.5) * 10;
      ctx.fillStyle = 'rgba(240, 249, 255, 0.58)';
      ctx.beginPath();
      ctx.ellipse(bx, by, 2.2 + Math.random() * 4, 6 + Math.random() * 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 110);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createShoreFoamTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 512);

  // Turquoise shallow surf glow near seawall (x = 0 -> shore, x = 256 -> open sea)
  const shallowGrad = ctx.createLinearGradient(0, 0, 256, 0);
  shallowGrad.addColorStop(0, 'rgba(248, 252, 255, 0.92)');
  shallowGrad.addColorStop(0.14, 'rgba(224, 247, 255, 0.78)');
  shallowGrad.addColorStop(0.32, 'rgba(56, 189, 248, 0.42)');
  shallowGrad.addColorStop(0.62, 'rgba(14, 165, 233, 0.16)');
  shallowGrad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
  ctx.fillStyle = shallowGrad;
  ctx.fillRect(0, 0, 256, 512);

  // Primary breaking white surf band right against seawall/rocks
  const drawFoamBand = (baseX: number, amp: number, width: number, alpha: number, phase: number) => {
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 8) {
      const x = baseX + Math.sin(y * 0.049 + phase) * amp + Math.cos(y * 0.123 + phase * 1.4) * (amp * 0.4);
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  drawFoamBand(20, 9, 22, 0.95, 0.0);
  drawFoamBand(48, 12, 13, 0.72, 1.3);
  drawFoamBand(108, 16, 9, 0.58, 2.7);
  drawFoamBand(176, 14, 6, 0.36, 4.1);

  // Lacy foam bubbles & sea spray foam patches
  for (let i = 0; i < 420; i++) {
    const t = Math.pow(Math.random(), 1.65);
    const x = 6 + t * 210;
    const y = Math.random() * 512;
    const r = 1.5 + (1 - t) * 7.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.22 + (1 - t) * 0.65})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.85, r * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 95);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAlexBuildingFacadeTexture(
  baseColor: string,
  shutterColor: string,
  trimColor: string,
  styleVariant: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Decorative cornice & horizontal architectural bands
  ctx.fillStyle = trimColor;
  ctx.fillRect(0, 0, 512, 14);
  for (let y = 88; y < 440; y += 88) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, y, 512, 5);
    ctx.fillStyle = trimColor;
    ctx.fillRect(0, y - 4, 512, 4);
  }

  const cols = styleVariant % 2 === 0 ? 4 : 3;
  const rows = 5;
  const cellW = 512 / cols;
  const cellH = 445 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + (cols === 3 ? 28 : 18);
      const wy = r * cellH + 16;
      const winW = cols === 3 ? 68 : 48;

      // Arched or rectangular Alexandrian stone frame
      ctx.fillStyle = trimColor;
      if (styleVariant % 3 === 1) {
        ctx.beginPath();
        ctx.arc(wx + 16 + winW / 2, wy + 18, winW / 2 + 6, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillRect(wx + 10, wy - 3, winW + 12, 60);

      const isLit = (r * 3 + c * 5 + styleVariant) % 4 === 0;
      ctx.fillStyle = isLit ? '#FEF08A' : '#1E293B';
      ctx.fillRect(wx + 16, wy + 3, winW, 48);

      // Mullion crossbars
      ctx.fillStyle = '#334155';
      ctx.fillRect(wx + 16 + winW / 2 - 2, wy + 3, 4, 48);
      ctx.fillRect(wx + 16, wy + 25, winW, 4);

      if (!isLit) {
        ctx.fillStyle = 'rgba(148, 197, 255, 0.28)';
        ctx.fillRect(wx + 19, wy + 6, 14, 40);
      }

      // Colorful wooden shutters
      ctx.fillStyle = shutterColor;
      ctx.fillRect(wx - 2, wy + 3, 15, 48);
      ctx.fillRect(wx + 19 + winW, wy + 3, 15, 48);

      // Sill
      ctx.fillStyle = trimColor;
      ctx.fillRect(wx - 4, wy + 52, winW + 40, 7);
    }
  }

  ctx.fillStyle = 'rgba(30, 41, 59, 0.16)';
  ctx.fillRect(0, 452, 512, 60);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAlexBuildingWindowGlowTexture(
  styleVariant: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Pure black background so ONLY apartment windows illuminate via emissiveMap
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 512);

  const cols = styleVariant % 2 === 0 ? 4 : 3;
  const rows = 5;
  const cellW = 512 / cols;
  const cellH = 445 / rows;
  const warmWindowTones = ['#FEF08A', '#FDE047', '#FDBA74', '#FEF9C3'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * cellW + (cols === 3 ? 28 : 18);
      const wy = r * cellH + 16;
      const winW = cols === 3 ? 68 : 48;

      // ~55% of apartment windows warmly lit inside at sunset/evening
      const hash = (r * 7 + c * 11 + styleVariant * 3) % 9;
      if (hash <= 4) {
        const tone = warmWindowTones[(r + c + styleVariant) % warmWindowTones.length];
        const glowGrad = ctx.createLinearGradient(wx + 16, wy + 3, wx + 16, wy + 51);
        glowGrad.addColorStop(0, tone);
        glowGrad.addColorStop(1, '#F59E0B');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(wx + 16, wy + 3, winW, 48);

        // Subtle warm mullion silhouette inside the lit window
        ctx.fillStyle = 'rgba(30, 20, 10, 0.55)';
        ctx.fillRect(wx + 16 + winW / 2 - 2, wy + 3, 4, 48);
        ctx.fillRect(wx + 16, wy + 25, winW, 4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createShopfrontTexture(
  kind: 'supermarket' | 'cafe' | 'restaurant' | 'pharmacy',
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  const bgTop =
    kind === 'pharmacy'
      ? '#ECFEFF'
      : kind === 'supermarket'
        ? '#FEF9C3'
        : kind === 'cafe'
          ? '#FDE68A'
          : '#FED7AA';
  const bgBot =
    kind === 'pharmacy'
      ? '#A5F3FC'
      : kind === 'supermarket'
        ? '#FDE047'
        : kind === 'cafe'
          ? '#F59E0B'
          : '#FB923C';
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 192);
  bgGrad.addColorStop(0, bgTop);
  bgGrad.addColorStop(1, bgBot);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 256, 192);

  // Warm illuminated interior ceiling strip
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(16, 12, 224, 10);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 14, 192);
  ctx.fillRect(242, 0, 14, 192);
  ctx.fillRect(0, 0, 256, 12);

  if (kind === 'supermarket') {
    for (let sy = 34; sy <= 130; sy += 32) {
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(22, sy, 128, 6);
      const colors = ['#EF4444', '#FACC15', '#22C55E', '#38BDF8', '#F97316'];
      for (let gx = 26; gx < 142; gx += 18) {
        ctx.fillStyle = colors[(gx + sy) % colors.length];
        ctx.fillRect(gx, sy - 18, 12, 18);
      }
    }
  } else if (kind === 'pharmacy') {
    ctx.fillStyle = '#CBD5E1';
    for (let sy = 40; sy <= 125; sy += 28) {
      ctx.fillRect(22, sy, 128, 4);
    }
    ctx.fillStyle = '#10B981';
    ctx.fillRect(68, 46, 22, 68);
    ctx.fillRect(45, 69, 68, 22);
  } else {
    // Glowing cozy Alexandria cafe / restaurant counter + warm pendant bulbs
    ctx.fillStyle = '#78350F';
    ctx.fillRect(22, 134, 128, 46);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(22, 128, 128, 8);
    for (const lx of [46, 86, 126]) {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(lx - 1, 12, 2, 28);
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(lx, 44, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.32)';
      ctx.beginPath();
      ctx.arc(lx, 44, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Illuminated glass double-door & neon border
  ctx.fillStyle = '#E0F2FE';
  ctx.fillRect(164, 24, 70, 164);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(164, 24, 70, 164);
  ctx.beginPath();
  ctx.moveTo(199, 24);
  ctx.lineTo(199, 188);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fillRect(20, 20, 44, 168);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createShopSignTexture(
  title: string,
  bgHex: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 80);
  grad.addColorStop(0, bgHex);
  grad.addColorStop(1, '#0F172A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 80);

  // Double neon-style glowing border frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 248, 72);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, 236, 60);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 128, 41);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStoneMasonryTexture(
  baseHex: string,
  mortarHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  const rowH = 32;
  const colW = 64;
  ctx.strokeStyle = mortarHex;
  ctx.lineWidth = 2;

  for (let r = 0; r < 512 / rowH; r++) {
    const y = r * rowH;
    const offset = (r % 2) * (colW / 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    for (let c = -1; c < 512 / colW + 1; c++) {
      const x = c * colW + offset;
      ctx.fillStyle = (r + c) % 3 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWoodPlankTexture(baseHex: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(30, 18, 8, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
    ctx.fillStyle = (y / 22) % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, y + 2, 256, 18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBibliothecaGraniteTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78716C';
  ctx.fillRect(0, 0, 512, 256);

  const glyphs = ['أ', 'ب', 'ج', 'Δ', 'Ω', 'Σ', 'A', '☥', 'م', 'س', 'ق', 'إ'];
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = 16; y < 256; y += 32) {
    ctx.strokeStyle = 'rgba(28, 25, 23, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 16);
    ctx.lineTo(512, y + 16);
    ctx.stroke();

    for (let x = 20; x < 512; x += 36) {
      const g = glyphs[(x + y) % glyphs.length];
      ctx.fillStyle = 'rgba(41, 37, 36, 0.72)';
      ctx.fillText(g, x, y);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGlassCurtainWallTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 512);
  grad.addColorStop(0, '#0284C7');
  grad.addColorStop(0.5, '#0369A1');
  grad.addColorStop(1, '#0F172A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.38)';
  ctx.lineWidth = 3;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSignTexture(
  title: string,
  subtitle: string,
  accentHex = '#FACC15',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, 74);

  ctx.fillStyle = accentHex;
  ctx.font = '600 26px sans-serif';
  ctx.fillText(subtitle, 256, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBlueHighwaySignTexture(
  districtName: string,
  subLabel: string,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#004B93';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 172);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(districtName, 256, 76);

  ctx.fillStyle = '#E0F2FE';
  ctx.font = '700 24px sans-serif';
  ctx.fillText(`↑  ${subLabel}  ↑`, 256, 138);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSkyDomeMaterial(atmosphere: 'day' | 'sunset' | 'night'): THREE.ShaderMaterial {
  const palette =
    atmosphere === 'night'
      ? { top: 0x010309, mid: 0x030816, bottom: 0x081022 }
      : atmosphere === 'sunset'
        ? { top: 0x4c2b6e, mid: 0xc96480, bottom: 0xfb923c }
        : { top: 0x2563eb, mid: 0x7dd3fc, bottom: 0xbae6fd };

  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(palette.top) },
      midColor: { value: new THREE.Color(palette.mid) },
      bottomColor: { value: new THREE.Color(palette.bottom) },
      sunDir: { value: new THREE.Vector3(0.62, 0.145, -0.77).normalize() },
      moonDir: { value: new THREE.Vector3(0.42, 0.42, -0.80).normalize() },
      isSunset: { value: atmosphere === 'sunset' ? 1.0 : 0.0 },
      isNight: { value: atmosphere === 'night' ? 1.0 : 0.0 },
    },
    vertexShader: `
      varying vec3 vLocalDir;
      void main() {
        vLocalDir = normalize(position);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDir;
      uniform vec3 moonDir;
      uniform float isSunset;
      uniform float isNight;
      varying vec3 vLocalDir;
      void main() {
        vec3 dir = normalize(vLocalDir);
        float h = dir.y;
        // Horizon -> mid sky -> zenith gradient
        vec3 col = mix(bottomColor, midColor, smoothstep(-0.02, 0.24, h));
        col = mix(col, topColor, smoothstep(0.22, 0.72, h));

        if (isSunset > 0.5) {
          float sunAmt = max(dot(dir, sunDir), 0.0);
          // Warm golden-orange horizon glow band toward sea/west
          float westGlow = smoothstep(-0.2, 0.85, -dir.x) * (1.0 - smoothstep(0.0, 0.42, abs(h)));
          col += vec3(0.42, 0.21, 0.04) * westGlow;
          // Atmospheric solar halo + crisp golden setting sun disc
          col += vec3(1.0, 0.58, 0.20) * pow(sunAmt, 7.0) * 0.55;
          col += vec3(1.0, 0.86, 0.52) * pow(sunAmt, 96.0) * 0.95;
          col = mix(col, vec3(1.0, 0.96, 0.84), smoothstep(0.9986, 0.9994, sunAmt));

          // Soft procedural lavender/peach evening cloud wisps near horizon
          float wisp = sin(dir.x * 7.5 + dir.z * 4.5) * cos(dir.z * 9.0 - dir.x * 3.0);
          float cloudBand = smoothstep(0.04, 0.22, h) * (1.0 - smoothstep(0.22, 0.46, h));
          col = mix(col, vec3(0.98, 0.68, 0.52), max(0.0, wisp) * cloudBand * 0.24);
        } else if (isNight > 0.5) {
          // Pure deep midnight sky (zero sunset orange) with faint cool blue horizon mist
          float horizonBand = 1.0 - smoothstep(0.0, 0.16, abs(h));
          col += vec3(0.02, 0.04, 0.09) * horizonBand;

          // Crisp bright silver-white full moon & subtle moonlight halo
          float moonAmt = max(dot(dir, moonDir), 0.0);
          col += vec3(0.20, 0.34, 0.62) * pow(moonAmt, 10.0) * 0.28;
          col += vec3(0.78, 0.88, 1.0) * pow(moonAmt, 84.0) * 0.78;
          col = mix(col, vec3(0.99, 0.99, 1.0), smoothstep(0.9980, 0.9991, moonAmt));

          // Crisp bright twinkling star field across the dark midnight sky
          vec2 starUv = floor(dir.xz / max(0.18, h + 0.32) * 98.0);
          float starHash = fract(sin(dot(starUv, vec2(127.1, 311.7))) * 43758.5453);
          float star = smoothstep(0.986, 0.997, starHash) * smoothstep(0.08, 0.35, h);
          col += vec3(0.92, 0.96, 1.0) * star * 1.1;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export function createStreetLightPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 248, 214, 1.0)');
  grad.addColorStop(0.26, 'rgba(255, 222, 140, 0.72)');
  grad.addColorStop(0.58, 'rgba(251, 182, 74, 0.28)');
  grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHeadlightBeamTexture(isDual: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const drawBeam = (cx: number, spread: number, alpha: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 10, 254);
    ctx.lineTo(cx - spread, 4);
    ctx.lineTo(cx + spread, 4);
    ctx.lineTo(cx + 10, 254);
    ctx.closePath();
    const grad = ctx.createLinearGradient(cx, 254, cx, 4);
    grad.addColorStop(0, `rgba(255, 253, 232, ${alpha})`);
    grad.addColorStop(0.28, `rgba(254, 246, 198, ${alpha * 0.72})`);
    grad.addColorStop(0.68, `rgba(253, 234, 162, ${alpha * 0.30})`);
    grad.addColorStop(1, 'rgba(253, 224, 128, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright hot-spot core near the lamp
    const core = ctx.createRadialGradient(cx, 224, 4, cx, 196, 62);
    core.addColorStop(0, `rgba(255, 255, 245, ${alpha * 0.85})`);
    core.addColorStop(0.55, `rgba(254, 249, 195, ${alpha * 0.32})`);
    core.addColorStop(1, 'rgba(254, 249, 195, 0.0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, 256, 256);
    ctx.restore();
  };

  if (isDual) {
    drawBeam(86, 86, 0.72);
    drawBeam(170, 86, 0.72);
  } else {
    drawBeam(128, 108, 0.88);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHumanFaceTexture(
  skinTone: 'olive' | 'tan' | 'warm' | 'light',
  hasBeard: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const palettes = {
    olive: { base: '#C89572', shadow: '#A67252', lip: '#9E5B52' },
    tan: { base: '#B57D58', shadow: '#8F5D3E', lip: '#8C4D46' },
    warm: { base: '#D6A484', shadow: '#B58163', lip: '#A9645B' },
    light: { base: '#E4B89B', shadow: '#C39478', lip: '#B56E66' },
  };
  const pal = palettes[skinTone];

  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle skin contour shading across cheekbones, forehead & jaw
  const rad = ctx.createRadialGradient(128, 128, 20, 128, 128, 118);
  rad.addColorStop(0, 'rgba(255,255,255,0.08)');
  rad.addColorStop(0.7, 'rgba(0,0,0,0)');
  rad.addColorStop(1, 'rgba(50,25,15,0.22)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 256, 256);

  // Back & sides natural dark hair coverage (center U=0.5 is front face)
  ctx.fillStyle = '#1B1512';
  ctx.fillRect(0, 0, 62, 256);
  ctx.fillRect(194, 0, 62, 256);
  ctx.fillRect(0, 0, 256, 68);

  // Natural forehead hairline curve
  ctx.fillStyle = pal.base;
  ctx.beginPath();
  ctx.ellipse(128, 92, 62, 30, 0, Math.PI, 0);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#1E1714';
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(98, 110);
  ctx.quadraticCurveTo(109, 105, 118, 109);
  ctx.moveTo(138, 109);
  ctx.quadraticCurveTo(147, 105, 158, 110);
  ctx.stroke();

  // Natural human eyes (almond sclera, dark iris, pupil, eyelid crease)
  for (const ex of [108, 148]) {
    ctx.strokeStyle = pal.shadow;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(ex, 120, 8.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.ellipse(ex, 121, 7.8, 3.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3B2314';
    ctx.beginPath();
    ctx.arc(ex, 121, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0B0D12';
    ctx.beginPath();
    ctx.arc(ex, 121, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ex - 1.4, 119.6, 1.2, 1.2);

    ctx.strokeStyle = '#181412';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ex - 7.5, 120);
    ctx.quadraticCurveTo(ex, 116.5, ex + 7.5, 120);
    ctx.stroke();
  }

  // Nose bridge shading
  ctx.fillStyle = pal.shadow;
  ctx.beginPath();
  ctx.moveTo(126, 121);
  ctx.lineTo(130, 121);
  ctx.lineTo(132.5, 143);
  ctx.lineTo(123.5, 143);
  ctx.closePath();
  ctx.fill();

  if (hasBeard) {
    ctx.fillStyle = 'rgba(26, 20, 17, 0.55)';
    ctx.beginPath();
    ctx.arc(128, 152, 42, 0.16, Math.PI - 0.16);
    ctx.fill();
  }

  // Natural Lips
  ctx.fillStyle = pal.lip;
  ctx.beginPath();
  ctx.ellipse(128, 159, 10, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 25, 25, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(118, 159);
  ctx.lineTo(138, 159);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createClothingFabricTexture(
  baseHex: string,
  kind: 'shirt' | 'trousers' | 'police',
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.055)';
    ctx.fillRect(x, y, 2, 3);
  }
  for (let x = 16; x < 128; x += 24) {
    const grad = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.09)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 6, 0, 12, 128);
  }

  if (kind === 'shirt' || kind === 'police') {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(63, 18, 2, 92);
    ctx.fillStyle = kind === 'police' ? '#CBD5E1' : 'rgba(255,255,255,0.45)';
    for (let y = 26; y <= 98; y += 18) {
      ctx.beginPath();
      ctx.arc(64, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 114, 128, 14);
    if (kind === 'police') {
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(58, 115, 12, 12);
    }
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createTreeBarkTexture(isPalm: boolean, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (isPalm) {
    ctx.fillStyle = '#5C4430';
    ctx.fillRect(0, 0, 128, 256);
    // Overlapping diamond leaf-scar rings typical of Mediterranean date palms
    const rowH = 16;
    for (let y = 0; y < 256; y += rowH) {
      const offset = ((y / rowH) % 2) * 16;
      for (let x = -16; x < 144; x += 32) {
        const shade = ((x + y) % 3 === 0) ? '#6D523A' : '#4E3927';
        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.moveTo(x + offset, y + rowH * 0.5);
        ctx.lineTo(x + offset + 16, y);
        ctx.lineTo(x + offset + 32, y + rowH * 0.5);
        ctx.lineTo(x + offset + 16, y + rowH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(24, 16, 10, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      // Subtle weathered pale ring fiber highlight
      ctx.fillStyle = 'rgba(214, 193, 165, 0.14)';
      ctx.fillRect(0, y, 128, 2);
    }
  } else {
    ctx.fillStyle = '#4B3A2C';
    ctx.fillRect(0, 0, 128, 256);
    // Vertical organic bark furrows & weathered grey-brown ridges
    for (let x = 0; x < 128; x += 5) {
      ctx.fillStyle = x % 2 === 0 ? 'rgba(28, 19, 13, 0.45)' : 'rgba(130, 106, 84, 0.22)';
      ctx.fillRect(x, 0, 2 + (x % 3), 256);
    }
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 256;
      const h = 10 + Math.random() * 26;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(22, 14, 9, 0.42)' : 'rgba(155, 132, 108, 0.18)';
      ctx.fillRect(x, y, 2, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, isPalm ? 3 : 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPalmFrondTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Central tapered golden-olive rachis (stem) running from y=254 up to y=14
  const stemGrad = ctx.createLinearGradient(0, 254, 0, 12);
  stemGrad.addColorStop(0, '#7B6D34');
  stemGrad.addColorStop(0.5, '#688B2E');
  stemGrad.addColorStop(1, '#84A93B');
  ctx.strokeStyle = stemGrad;
  ctx.lineCap = 'round';

  for (let y = 248; y >= 14; y -= 4) {
    const t = (250 - y) / 236; // 0 at base -> 1 at tip
    ctx.lineWidth = Math.max(1.8, 6.5 * (1 - t * 0.78));
    ctx.beginPath();
    ctx.moveTo(128, y + 4);
    ctx.lineTo(128, y);
    ctx.stroke();

    // Pinnate narrow pointed palm leaflets fanning out left & right
    const span = Math.sin(Math.pow(t, 0.72) * Math.PI * 0.96) * 116;
    if (span < 6) continue;
    const sweepUp = -16 - t * 14;

    for (const side of [-1, 1]) {
      const tipX = 128 + side * span;
      const tipY = Math.max(4, y + sweepUp);
      const midX = 128 + side * span * 0.52;
      const midY = y + sweepUp * 0.42 - 3.5;

      const greenPick = Math.floor((y + (side > 0 ? 7 : 0)) % 3);
      ctx.fillStyle =
        greenPick === 0 ? '#245E26' : greenPick === 1 ? '#367A30' : '#4E9439';

      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.quadraticCurveTo(midX, midY - 2.6, tipX, tipY);
      ctx.quadraticCurveTo(midX, midY + 3.2, 128, y + 3.2);
      ctx.closePath();
      ctx.fill();

      // Sunlit center vein highlight on leaflet
      ctx.strokeStyle = 'rgba(190, 232, 110, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(128, y + 1.2);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createFoliageClusterTexture(
  tint: 'ficus' | 'olive' | 'poinciana',
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Subtle internal twigs radiating from base/center
  ctx.strokeStyle = '#3E2E20';
  ctx.lineCap = 'round';
  const twigs = [
    [128, 224, 128, 66, 3.2],
    [128, 178, 62, 102, 2.2],
    [128, 165, 196, 94, 2.2],
    [128, 125, 84, 52, 1.8],
    [128, 120, 174, 54, 1.8],
  ];
  for (const [x1, y1, x2, y2, w] of twigs) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const leafPalettes = {
    ficus: ['#143B1B', '#1F5626', '#2D7331', '#45913D', '#62AE49'],
    olive: ['#263F26', '#3A5835', '#517144', '#6D8D58', '#89A76E'],
    poinciana: ['#18421E', '#255F2A', '#357D33', '#4E9A3F', '#EA580C'],
  };
  const pal = leafPalettes[tint];

  // Deterministic organic distribution of ~175 crisp pointed leaves with inner shadow -> sunlit tips
  let seed = tint === 'ficus' ? 13 : tint === 'olive' ? 47 : 83;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 185; i++) {
    const ang = rand() * Math.PI * 2;
    const rad = Math.pow(rand(), 0.62) * 102;
    const cx = 128 + Math.cos(ang) * rad;
    const cy = 124 + Math.sin(ang) * rad * 0.92;
    const len = 11 + rand() * 14;
    const wid = 5 + rand() * 5.5;
    const rot = ang + (rand() - 0.5) * 1.1;

    // Darker depth inside canopy, brighter on outer edges; occasional flamboyant blossom on poinciana
    let colorIdx = Math.min(3, Math.floor((rad / 102) * 3.6 + rand() * 0.7));
    if (tint === 'poinciana' && rad > 54 && i % 9 === 0) {
      colorIdx = 4;
    } else if (rad > 74 && rand() > 0.55) {
      colorIdx = Math.min(4, colorIdx + 1);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.fillStyle = pal[colorIdx];
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, 0);
    ctx.quadraticCurveTo(0, -wid, len * 0.65, 0);
    ctx.quadraticCurveTo(0, wid, -len * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Fine leaf midrib
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-len * 0.35, 0);
    ctx.lineTo(len * 0.5, 0);
    ctx.stroke();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createMosqueOrnamentTexture(
  primaryHex: string,
  secondaryHex: string,
  trimHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 512, 512);

  // Mamluk Ablaq horizontal colored stone bands
  const bandH = 32;
  for (let y = 0; y < 512; y += bandH) {
    const isAlt = (y / bandH) % 2 === 1;
    ctx.fillStyle = isAlt ? secondaryHex : primaryHex;
    ctx.fillRect(0, y, 512, bandH);
    ctx.strokeStyle = 'rgba(60, 42, 24, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, y, 512, bandH);
  }

  // Ornamental turquoise-gold Islamic geometric frieze band at top & middle
  for (const fy of [36, 260]) {
    ctx.fillStyle = trimHex;
    ctx.fillRect(0, fy, 512, 34);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(0, fy, 512, 4);
    ctx.fillRect(0, fy + 30, 512, 4);

    for (let x = 16; x < 512; x += 32) {
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.moveTo(x, fy + 6);
      ctx.lineTo(x + 10, fy + 17);
      ctx.lineTo(x, fy + 28);
      ctx.lineTo(x - 10, fy + 17);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Pointed horseshoe / Moorish decorative arches
  for (let x = 36; x < 512; x += 96) {
    ctx.fillStyle = trimHex;
    ctx.beginPath();
    ctx.arc(x + 24, 152, 26, Math.PI, 0);
    ctx.lineTo(x + 50, 212);
    ctx.lineTo(x - 2, 212);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(x + 24, 154, 18, Math.PI, 0);
    ctx.lineTo(x + 42, 206);
    ctx.lineTo(x + 6, 206);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createMosqueDomeTexture(
  baseHex: string,
  ribHex: string,
  tileAccentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Vertical decorative dome ribs & chevrons
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = ribHex;
    ctx.fillRect(x, 0, 4, 256);
    ctx.fillStyle = tileAccentHex;
    for (let y = 16; y < 220; y += 28) {
      ctx.beginPath();
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x + 10, y + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Lower ceramic tile collar + golden band
  ctx.fillStyle = tileAccentHex;
  ctx.fillRect(0, 208, 256, 48);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(0, 204, 256, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGreenTracksuitTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Rich athletic emerald green knit base
  ctx.fillStyle = '#15803D';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle woven fabric shading & panel seams
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, y, 256, 2);
  }

  // Sporty white shoulder/side twin stripes (visible from back & sides)
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(14, 0, 10, 256);
  ctx.fillRect(30, 0, 10, 256);
  ctx.fillRect(216, 0, 10, 256);
  ctx.fillRect(232, 0, 10, 256);

  // Center front zipper + white collar/hem trim
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(125, 0, 6, 256);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 14);
  ctx.fillRect(0, 240, 256, 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBeanieKnitTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F1115';
  ctx.fillRect(0, 0, 128, 128);

  // Vertical ribbed wool knit ridges
  for (let x = 0; x < 128; x += 6) {
    ctx.fillStyle = '#222730';
    ctx.fillRect(x, 0, 2, 128);
    ctx.fillStyle = '#07080B';
    ctx.fillRect(x + 3, 0, 2, 128);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAsphaltRoughnessTexture(maxAnisotropy: number, repeatY = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Strictly dry matte asphalt roughness (no glossy spots or sky reflection patches)
  ctx.fillStyle = '#EEEEEE';
  ctx.fillRect(0, 0, 256, 256);

  const tracks = [32, 79, 147, 191, 233];
  for (const cx of tracks) {
    const g = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
    g.addColorStop(0, 'rgba(225,225,225,0)');
    g.addColorStop(0.5, 'rgba(218,218,218,0.45)');
    g.addColorStop(1, 'rgba(225,225,225,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 18, 0, 36, 256);
  }

  let seed = 8811;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 2400; i++) {
    const v = 222 + Math.floor(rand() * 32);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * 256, rand() * 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAsphaltNormalTexture(maxAnisotropy: number, repeatY = 1): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Neutral tangent-space normal (128, 128, 255)
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, 256, 256);

  // Micro mineral aggregate bump slopes (deterministic PRNG)
  let seed = 9913;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 4800; i++) {
    const x = Math.floor(rand() * 255);
    const y = Math.floor(rand() * 255);
    const nx = 104 + Math.floor(rand() * 48);
    const ny = 104 + Math.floor(rand() * 48);
    ctx.fillStyle = `rgb(${nx},${ny},246)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle longitudinal tire-track grooves
  const tracks = [32, 79, 147, 191, 233];
  for (const cx of tracks) {
    ctx.fillStyle = 'rgba(116,128,255,0.35)';
    ctx.fillRect(cx - 8, 0, 3, 256);
    ctx.fillStyle = 'rgba(140,128,255,0.35)';
    ctx.fillRect(cx + 5, 0, 3, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface MotorcycleDashUpdater {
  texture: THREE.CanvasTexture;
  update: (speedKmh: number, rpmRatio: number, gear: number, fuelPct: number, braking: boolean) => void;
}

export function createMotorcycleDashUpdater(maxAnisotropy = 4): MotorcycleDashUpdater {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  let lastKey = '';

  const update = (
    speedKmh: number,
    rpmRatio: number,
    gear: number,
    fuelPct: number,
    braking: boolean,
  ) => {
    const sInt = Math.round(speedKmh);
    const rpmStep = Math.round(Math.max(0, Math.min(1, rpmRatio)) * 36);
    const fInt = Math.round(Math.max(0, Math.min(100, fuelPct)) / 5);
    const key = `${sInt}-${rpmStep}-${gear}-${fInt}-${braking ? 1 : 0}`;
    if (key === lastKey) return;
    lastKey = key;

    const clampedRpm = Math.max(0, Math.min(1, rpmRatio));

    // Deep Sportbike TFT OLED Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
    bgGrad.addColorStop(0, '#040812');
    bgGrad.addColorStop(1, '#0B1324');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle Outer Racing Bezel
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 248);

    // Top Shift Light Bar (flashes bright red/amber at high RPM)
    const isShiftFlash = clampedRpm >= 0.88;
    ctx.fillStyle = isShiftFlash ? '#EF4444' : '#0F172A';
    ctx.fillRect(18, 12, 476, 12);
    const segCount = 24;
    for (let i = 0; i < segCount; i++) {
      const frac = i / (segCount - 1);
      const lit = clampedRpm >= frac * 0.95;
      ctx.fillStyle = lit
        ? frac >= 0.8
          ? '#EF4444'
          : frac >= 0.58
            ? '#FACC15'
            : '#38BDF8'
        : '#162235';
      ctx.fillRect(22 + i * 19.6, 14, 15, 8);
    }

    // Left Analog-Style Sweeping Arc Tachometer Dial (0..12 x1000 RPM)
    const cx = 138;
    const cy = 146;
    const rad = 86;
    const startAng = Math.PI * 0.78;
    const sweepAng = Math.PI * 1.44;

    ctx.beginPath();
    ctx.arc(cx, cy, rad, startAng, startAng + sweepAng);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Active glowing RPM arc
    const activeEnd = startAng + sweepAng * clampedRpm;
    const arcGrad = ctx.createLinearGradient(cx - rad, cy, cx + rad, cy);
    arcGrad.addColorStop(0, '#38BDF8');
    arcGrad.addColorStop(0.65, '#FACC15');
    arcGrad.addColorStop(1, '#EF4444');
    ctx.beginPath();
    ctx.arc(cx, cy, rad, startAng, activeEnd);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 14;
    ctx.stroke();

    // Redline Zone Arc (9k - 12k RPM)
    ctx.beginPath();
    ctx.arc(cx, cy, rad + 10, startAng + sweepAng * 0.75, startAng + sweepAng);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tick Marks & Numbers 0..12
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let t = 0; t <= 12; t++) {
      const a = startAng + (t / 12) * sweepAng;
      const innerR = rad - 13;
      const outerR = rad + 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      ctx.strokeStyle = t >= 9 ? '#EF4444' : '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (t % 2 === 0) {
        ctx.fillStyle = t >= 10 ? '#F87171' : '#94A3B8';
        ctx.fillText(String(t), cx + Math.cos(a) * (rad - 26), cy + Math.sin(a) * (rad - 26));
      }
    }

    // Physical Mechanical Needle inside Tachometer
    const needleAng = startAng + sweepAng * clampedRpm;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAng) * (rad - 6), cy + Math.sin(needleAng) * (rad - 6));
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('x1000 RPM', cx, cy + 32);

    // Center-Right Digital Speed Readout
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '900 84px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(sInt), 316, 138);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('KM/H', 316, 162);

    // Right Gear Indicator Box (N, 1..6)
    ctx.fillStyle = '#111C2E';
    ctx.fillRect(408, 48, 84, 96);
    ctx.strokeStyle = braking ? '#EF4444' : isShiftFlash ? '#F97316' : '#FACC15';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(408, 48, 84, 96);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('GEAR', 450, 68);

    ctx.fillStyle = sInt < 1 ? '#22C55E' : '#FACC15';
    ctx.font = '900 54px monospace';
    ctx.fillText(sInt < 1 ? 'N' : String(gear), 450, 128);

    // Bottom Status Strip: Fuel Gauge + Brake / Shift Badges
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(250, 198, 140, 16);
    ctx.fillStyle = fInt <= 4 ? '#EF4444' : '#22C55E';
    ctx.fillRect(250, 198, Math.max(8, (fInt / 20) * 140), 16);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FUEL ${Math.round(fuelPct)}%`, 250, 190);

    if (braking) {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(408, 162, 84, 34);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BRAKE', 450, 185);
    } else {
      ctx.fillStyle = '#0F291E';
      ctx.fillRect(408, 162, 84, 34);
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALEX POV', 450, 184);
    }

    texture.needsUpdate = true;
  };

  update(28, 0.35, 2, 100, false);
  return { texture, update };
}

export function createCarDashUpdater(maxAnisotropy = 4): MotorcycleDashUpdater {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  let lastKey = '';
  const update = (
    speedKmh: number,
    rpmRatio: number,
    gear: number,
    fuelPct: number,
    braking: boolean,
  ) => {
    const sInt = Math.round(speedKmh);
    const rpmStep = Math.round(Math.max(0, Math.min(1, rpmRatio)) * 28);
    const fInt = Math.round(Math.max(0, Math.min(100, fuelPct)) / 10);
    const key = `${sInt}-${rpmStep}-${gear}-${fInt}-${braking ? 1 : 0}`;
    if (key === lastKey) return;
    lastKey = key;

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 184);

    // Left Analog Speedometer Dial
    const drawDial = (cx: number, cy: number, r: number, frac: number, label: string, color: string) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 10;
      ctx.stroke();

      const ang = Math.PI * 0.75 + Math.PI * 1.5 * Math.max(0, Math.min(1, frac));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * (r - 8), cy + Math.sin(ang) * (r - 8));
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy + 36);
    };

    drawDial(110, 102, 64, Math.min(1, sInt / 180), `${sInt} KM/H`, '#FACC15');
    drawDial(402, 102, 64, rpmRatio, `G${sInt < 1 ? 'N' : gear} RPM`, '#38BDF8');

    // Center Digital Trip & Fuel
    ctx.fillStyle = '#111827';
    ctx.fillRect(198, 40, 116, 112);
    ctx.strokeStyle = braking ? '#EF4444' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(198, 40, 116, 112);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '900 38px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(sInt), 256, 90);
    ctx.fillStyle = fInt <= 2 ? '#EF4444' : '#22C55E';
    ctx.fillRect(216, 114, Math.max(6, (fInt / 10) * 80), 10);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`FUEL ${Math.round(fuelPct)}%`, 256, 142);

    texture.needsUpdate = true;
  };

  update(28, 0.35, 2, 100, false);
  return { texture, update };
}

export interface MirrorReflectionUpdater {
  texture: THREE.CanvasTexture;
  update: (
    atmosphere: 'day' | 'sunset' | 'night',
    tilt: number,
    speedKmh: number,
    rearTrafficHint: { dist: number; side: number } | null,
  ) => void;
}

export function createMirrorReflectionUpdater(maxAnisotropy = 4): MirrorReflectionUpdater {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  let frameSkip = 0;

  const update = (
    atmosphere: 'day' | 'sunset' | 'night',
    tilt: number,
    speedKmh: number,
    rearTrafficHint: { dist: number; side: number } | null,
  ) => {
    // Update every other tick to keep CPU micro-light while staying fluid
    frameSkip = (frameSkip + 1) % 2;
    if (frameSkip !== 0 && speedKmh > 0) return;

    const skyTop =
      atmosphere === 'night' ? '#040B1A' : atmosphere === 'sunset' ? '#3B2D54' : '#1D6FD1';
    const skyMid =
      atmosphere === 'night' ? '#132645' : atmosphere === 'sunset' ? '#E68A55' : '#8FD3FE';
    const seaHex =
      atmosphere === 'night' ? '#082342' : atmosphere === 'sunset' ? '#0C659A' : '#0284C7';
    const roadHex = atmosphere === 'night' ? '#12151C' : '#2A2D34';

    ctx.save();
    ctx.clearRect(0, 0, 128, 64);

    // Horizon tilt opposite motorcycle lean
    ctx.translate(64, 32);
    ctx.rotate(-tilt * 0.65);
    ctx.translate(-64, -32);

    const skyGrad = ctx.createLinearGradient(0, -10, 0, 34);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyMid);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-20, -20, 168, 56);

    // Asphalt road & Mediterranean sea strip behind rider
    ctx.fillStyle = roadHex;
    ctx.fillRect(-20, 34, 108, 50);
    ctx.fillStyle = seaHex;
    ctx.fillRect(88, 32, 60, 50);

    // Glowing Corniche shoreline lamps / skyline dots
    ctx.fillStyle = atmosphere === 'night' ? '#FBBF24' : '#FFFBEB';
    for (let lx = 8; lx < 124; lx += 22) {
      ctx.fillRect(lx, 31, 3, 2);
    }

    // Center dashed reflection lane line
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    ctx.fillRect(46, 40, 4, 18);

    // Approaching rear traffic vehicle silhouette + twin glowing headlights
    if (rearTrafficHint && rearTrafficHint.dist < 65) {
      const proximity = 1 - rearTrafficHint.dist / 65;
      const carW = 8 + proximity * 18;
      const carH = 5 + proximity * 11;
      const cx = 56 + rearTrafficHint.side * 12;
      const cy = 35 + (1 - proximity) * 2;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(cx - carW / 2, cy - carH / 2, carW, carH);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(cx - carW * 0.36, cy - 1, Math.max(2, carW * 0.18), Math.max(2, carH * 0.25));
      ctx.fillRect(cx + carW * 0.18, cy - 1, Math.max(2, carW * 0.18), Math.max(2, carH * 0.25));
    }

    ctx.restore();

    // Crisp subtle glass sheen along edge
    const glassGrad = ctx.createLinearGradient(0, 0, 128, 64);
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    glassGrad.addColorStop(0.45, 'rgba(255,255,255,0.03)');
    glassGrad.addColorStop(1, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(0, 0, 128, 64);

    texture.needsUpdate = true;
  };

  update('day', 0, 28, null);
  return { texture, update };
}

export function createTaxiRoofSignTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 96);
  grad.addColorStop(0, '#FEF08A');
  grad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 96);

  // Classic black taxi checker corners & outer frame
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 88);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#0F172A' : '#FACC15';
    ctx.fillRect(10 + i * 12, 10, 12, 12);
    ctx.fillRect(210 + i * 12, 10, 12, 12);
  }

  ctx.fillStyle = '#090D16';
  ctx.font = '900 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('تاكسي', 128, 52);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAlexTaxiSignTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  // Luminous golden-yellow Alexandria Taxi roof lightbox gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 144);
  grad.addColorStop(0, '#FEF9C3');
  grad.addColorStop(0.5, '#FACC15');
  grad.addColorStop(1, '#EAB308');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 144);

  // Outer sleek black frame
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 134);

  // Iconic Alexandria black-and-yellow taxi checker strips on top & bottom edges
  const sq = 16;
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#090D16' : '#FEF08A';
    ctx.fillRect(16 + i * sq, 12, sq, 12);
    ctx.fillStyle = i % 2 === 1 ? '#090D16' : '#FEF08A';
    ctx.fillRect(16 + i * sq, 120, sq, 12);
  }

  // Bold Arabic title: "تاكسي الإسكندرية"
  ctx.direction = 'rtl';
  ctx.fillStyle = '#090D16';
  ctx.font = '900 54px "Cairo", "Tajawal", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('تاكسي الإسكندرية', 256, 74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAlexTaxiDoorDecalTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 168;
  const ctx = canvas.getContext('2d')!;

  // Classic Alexandria Taxi jet-black lower door body
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 384, 168);

  // Subtle metallic highlight along upper shoulder of door
  const gloss = ctx.createLinearGradient(0, 0, 0, 168);
  gloss.addColorStop(0, 'rgba(255,255,255,0.14)');
  gloss.addColorStop(0.25, 'rgba(255,255,255,0.03)');
  gloss.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, 384, 168);

  // Yellow Alexandria checker belt across upper door
  const sq = 16;
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#FACC15' : '#0B0F19';
    ctx.fillRect(i * sq, 14, sq, 14);
    ctx.fillStyle = i % 2 === 1 ? '#FACC15' : '#0B0F19';
    ctx.fillRect(i * sq, 28, sq, 14);
  }

  // Golden-bordered door badge reading "تاكسي الإسكندرية"
  ctx.fillStyle = '#0B1120';
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 4;
  ctx.fillRect(30, 56, 324, 82);
  ctx.strokeRect(30, 56, 324, 82);

  ctx.direction = 'rtl';
  ctx.fillStyle = '#FDE047';
  ctx.font = '900 34px "Cairo", "Tajawal", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('تاكسي الإسكندرية', 192, 92);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '700 14px sans-serif';
  ctx.fillText('ALEXANDRIA TAXI', 192, 122);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createEgyptianPlateTexture(
  plateText: string,
  topBandHex: string,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 256, 96);

  // Colored top strip (Orange for Taxi, Blue for Private/Microbus)
  ctx.fillStyle = topBandHex;
  ctx.fillRect(0, 0, 256, 30);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 90);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('مـصـر   EGYPT', 128, 16);

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 34px sans-serif';
  ctx.fillText(plateText, 128, 63);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createLedSignTexture(
  text: string,
  glowHex: string,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Dark LED matrix acrylic backing
  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, 512, 128);

  // Subtle LED matrix grid dots
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 10; y < 120; y += 10) {
    for (let x = 10; x < 504; x += 10) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Outer glowing neon border frame
  ctx.save();
  ctx.strokeStyle = glowHex;
  ctx.lineWidth = 6;
  ctx.shadowColor = glowHex;
  ctx.shadowBlur = 18;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.restore();

  // Crisp glowing Arabic phrase
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 58px Cairo, sans-serif';
  ctx.shadowColor = glowHex;
  ctx.shadowBlur = 24;
  ctx.fillStyle = glowHex;
  ctx.fillText(text, 256, 68);
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, 256, 68);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createYouthStickerTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 256);

  // Dynamic diagonal street-racing chevrons
  const stripes = [
    { x: 24, color: '#facc15', w: 34 },
    { x: 74, color: '#ef4444', w: 28 },
    { x: 118, color: '#38bdf8', w: 22 },
  ];
  ctx.save();
  ctx.transform(1, 0, -0.35, 1, 45, 0);
  for (const s of stripes) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, 18, s.w, 220);
  }
  ctx.restore();

  // Bold Arabic street badge
  ctx.save();
  ctx.fillStyle = '#090D16';
  ctx.beginPath();
  ctx.roundRect(170, 56, 318, 134, 22);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#facc15';
  ctx.stroke();

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#facc15';
  ctx.font = '900 50px Cairo, sans-serif';
  ctx.fillText('نجم الكورنيش', 330, 108);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 26px Cairo, sans-serif';
  ctx.fillText('بطل الإسكندرية • 03', 330, 158);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}


