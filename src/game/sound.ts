import { EngineSoundProfile, HornSoundProfile } from './types';

const SEA_SOUND_STORAGE_KEY = 'alex_sea_sound_enabled';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private seaSoundEnabled: boolean = (() => {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(SEA_SOUND_STORAGE_KEY) !== 'false'
        : true;
    } catch {
      return true;
    }
  })();
  private seaListeners = new Set<(enabled: boolean) => void>();

  // Ambient Mediterranean sea waves (right +X) & Alexandria street ambience (left -X)
  private seaActive = false;
  private seaGain: GainNode | null = null;
  private seaSource: AudioBufferSourceNode | null = null;
  private seaLfo: OscillatorNode | null = null;
  private seaLfoGain: GainNode | null = null;
  private seaLfoFreqGain: GainNode | null = null;
  private seaFilter: BiquadFilterNode | null = null;
  private seaPanner: StereoPannerNode | null = null;
  private surfSource: AudioBufferSourceNode | null = null;
  private surfFilter: BiquadFilterNode | null = null;
  private surfGain: GainNode | null = null;
  private surfLfo: OscillatorNode | null = null;
  private surfLfoGain: GainNode | null = null;
  private surfLfoFreqGain: GainNode | null = null;
  private seaWaveTimer: number | null = null;
  private streetSource: AudioBufferSourceNode | null = null;
  private streetFilter: BiquadFilterNode | null = null;
  private streetGain: GainNode | null = null;
  private streetPanner: StereoPannerNode | null = null;
  private seaBuffer: AudioBuffer | null = null;
  private surfWhiteBuffer: AudioBuffer | null = null;

  // Continuous real-time multi-harmonic engine RPM & aerodynamic wind nodes
  private engineActive = false;
  private engineOscMain: OscillatorNode | null = null;
  private engineOscSub: OscillatorNode | null = null;
  private engineOscGrowl: OscillatorNode | null = null;
  private engineShaper: WaveShaperNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private lastGear = 2;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.seaBuffer && this.seaBuffer.sampleRate === ctx.sampleRate) {
      return this.seaBuffer;
    }
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.02) * 0.42;
    }
    const fade = Math.floor(ctx.sampleRate * 0.15);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = data[i] * t + data[len - fade + i] * (1 - t);
    }
    this.seaBuffer = buf;
    return buf;
  }

  private ensureSurfBuffer(ctx: AudioContext): AudioBuffer {
    if (this.surfWhiteBuffer && this.surfWhiteBuffer.sampleRate === ctx.sampleRate) {
      return this.surfWhiteBuffer;
    }
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      // Bright ocean spray/foam noise with smooth high-mid density
      prev = prev * 0.42 + white * 0.58;
      data[i] = prev * 0.72;
    }
    const fade = Math.floor(ctx.sampleRate * 0.15);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = data[i] * t + data[len - fade + i] * (1 - t);
    }
    this.surfWhiteBuffer = buf;
    return buf;
  }

  private createSaturationCurve(drive = 2.6): Float32Array<ArrayBuffer> {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + drive) * x * 20 * (Math.PI / 180)) / (Math.PI + drive * Math.abs(x));
    }
    return curve;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopSeaAmbience();
      this.stopEngineLoop();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isSeaSoundEnabled(): boolean {
    return this.seaSoundEnabled;
  }

  public subscribeSeaSound(listener: (enabled: boolean) => void): () => void {
    this.seaListeners.add(listener);
    return () => {
      this.seaListeners.delete(listener);
    };
  }

  public setSeaSoundEnabled(enabled: boolean): void {
    this.seaSoundEnabled = enabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SEA_SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
      }
    } catch {
      // Ignore storage quota / privacy mode errors
    }
    if (!enabled) {
      this.stopSeaAmbience();
    } else if (!this.muted) {
      this.startSeaAmbience();
    }
    this.seaListeners.forEach((fn) => fn(enabled));
  }

  public toggleSeaSound(): boolean {
    const next = !this.seaSoundEnabled;
    this.setSeaSoundEnabled(next);
    return next;
  }

  private triggerWaveCrashBurst(withSeagull = false): void {
    if (!this.seaActive || !this.seaSoundEnabled || this.muted || !this.ctx || this.ctx.state !== 'running') return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const surfBuf = this.ensureSurfBuffer(ctx);

      // Organic breaking wave crash ("فشّشّش الأمواج على صخور الكورنيش")
      const src = ctx.createBufferSource();
      src.buffer = surfBuf;
      src.loop = true;

      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(420, now);
      flt.frequency.exponentialRampToValueAtTime(1650, now + 0.95);
      flt.frequency.exponentialRampToValueAtTime(480, now + 3.4);
      flt.Q.value = 0.72;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.85);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.6);

      src.connect(flt);
      flt.connect(gain);

      if (typeof ctx.createStereoPanner === 'function') {
        const pan = ctx.createStereoPanner();
        pan.pan.value = 0.52;
        gain.connect(pan);
        pan.connect(ctx.destination);
      } else {
        gain.connect(ctx.destination);
      }

      src.start(now);
      src.stop(now + 3.7);

      // Occasional distant Alexandria coastal seagull call over the sea
      if (withSeagull) {
        const gOsc = ctx.createOscillator();
        const gGain = ctx.createGain();
        gOsc.type = 'sine';
        const base = 1850 + Math.random() * 280;
        gOsc.frequency.setValueAtTime(base * 0.88, now + 0.2);
        gOsc.frequency.exponentialRampToValueAtTime(base * 1.18, now + 0.42);
        gOsc.frequency.exponentialRampToValueAtTime(base * 0.72, now + 0.82);

        gGain.gain.setValueAtTime(0.0001, now + 0.2);
        gGain.gain.linearRampToValueAtTime(0.022, now + 0.36);
        gGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.86);

        gOsc.connect(gGain);
        if (typeof ctx.createStereoPanner === 'function') {
          const gPan = ctx.createStereoPanner();
          gPan.pan.value = 0.62;
          gGain.connect(gPan);
          gPan.connect(ctx.destination);
        } else {
          gGain.connect(ctx.destination);
        }
        gOsc.start(now + 0.2);
        gOsc.stop(now + 0.9);
      }
    } catch {
      // Ignore transient audio burst errors
    }
  }

  public startSeaAmbience(): void {
    if (!this.seaSoundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || this.seaActive) return;

    try {
      const buf = this.ensureNoiseBuffer(ctx);
      const surfBuf = this.ensureSurfBuffer(ctx);

      // Shared right-side Mediterranean sea stereo panner (+0.48 = RIGHT, where the sea is!)
      const seaOut: AudioNode =
        typeof ctx.createStereoPanner === 'function'
          ? (() => {
              const pan = ctx.createStereoPanner();
              pan.pan.value = 0.48;
              pan.connect(ctx.destination);
              this.seaPanner = pan;
              return pan;
            })()
          : ctx.destination;

      // 1A. Deep Rolling Mediterranean Ocean Swell
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      filter.Q.value = 0.85;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.28;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.19;

      const lfoGainAmp = ctx.createGain();
      lfoGainAmp.gain.value = 0.15;

      const lfoGainFreq = ctx.createGain();
      lfoGainFreq.gain.value = 310;

      lfo.connect(lfoGainAmp);
      lfoGainAmp.connect(masterGain.gain);
      lfo.connect(lfoGainFreq);
      lfoGainFreq.connect(filter.frequency);

      source.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(seaOut);

      // 1B. Crisp Foamy Surf & Wave Wash Layer ("صوت رغاوي الأمواج")
      const surfSrc = ctx.createBufferSource();
      surfSrc.buffer = surfBuf;
      surfSrc.loop = true;
      surfSrc.playbackRate.value = 0.94;

      const surfFlt = ctx.createBiquadFilter();
      surfFlt.type = 'bandpass';
      surfFlt.frequency.value = 1350;
      surfFlt.Q.value = 0.78;

      const surfGain = ctx.createGain();
      surfGain.gain.value = 0.12;

      const surfLfo = ctx.createOscillator();
      surfLfo.type = 'sine';
      surfLfo.frequency.value = 0.23;

      const surfLfoAmp = ctx.createGain();
      surfLfoAmp.gain.value = 0.085;

      const surfLfoFreq = ctx.createGain();
      surfLfoFreq.gain.value = 620;

      surfLfo.connect(surfLfoAmp);
      surfLfoAmp.connect(surfGain.gain);
      surfLfo.connect(surfLfoFreq);
      surfLfoFreq.connect(surfFlt.frequency);

      surfSrc.connect(surfFlt);
      surfFlt.connect(surfGain);
      surfGain.connect(seaOut);

      // 2. Subtle Alexandria Corniche Street Murmur (panned gently LEFT toward city buildings)
      const stSrc = ctx.createBufferSource();
      stSrc.buffer = buf;
      stSrc.loop = true;
      stSrc.playbackRate.value = 1.18;

      const stFlt = ctx.createBiquadFilter();
      stFlt.type = 'bandpass';
      stFlt.frequency.value = 680;
      stFlt.Q.value = 0.65;

      const stGain = ctx.createGain();
      stGain.gain.value = 0.026;

      stSrc.connect(stFlt);
      stFlt.connect(stGain);

      if (typeof ctx.createStereoPanner === 'function') {
        const stPan = ctx.createStereoPanner();
        stPan.pan.value = -0.45;
        stGain.connect(stPan);
        stPan.connect(ctx.destination);
        this.streetPanner = stPan;
      } else {
        stGain.connect(ctx.destination);
      }

      source.start();
      lfo.start();
      surfSrc.start();
      surfLfo.start();
      stSrc.start();

      this.seaSource = source;
      this.seaFilter = filter;
      this.seaGain = masterGain;
      this.seaLfo = lfo;
      this.seaLfoGain = lfoGainAmp;
      this.seaLfoFreqGain = lfoGainFreq;
      this.surfSource = surfSrc;
      this.surfFilter = surfFlt;
      this.surfGain = surfGain;
      this.surfLfo = surfLfo;
      this.surfLfoGain = surfLfoAmp;
      this.surfLfoFreqGain = surfLfoFreq;
      this.streetSource = stSrc;
      this.streetFilter = stFlt;
      this.streetGain = stGain;
      this.seaActive = true;

      // Schedule organic breaking wave surges + occasional distant seagull calls
      let waveCount = 0;
      const scheduleNextWave = () => {
        if (!this.seaActive) return;
        waveCount += 1;
        this.triggerWaveCrashBurst(waveCount % 4 === 2);
        const delayMs = 3600 + Math.random() * 2400;
        this.seaWaveTimer = window.setTimeout(scheduleNextWave, delayMs);
      };
      this.seaWaveTimer = window.setTimeout(scheduleNextWave, 900);
    } catch {
      this.seaActive = false;
    }
  }

  public stopSeaAmbience(): void {
    if (!this.seaActive) return;
    this.seaActive = false;
    if (this.seaWaveTimer !== null) {
      window.clearTimeout(this.seaWaveTimer);
      this.seaWaveTimer = null;
    }
    try {
      this.seaSource?.stop();
      this.seaLfo?.stop();
      this.surfSource?.stop();
      this.surfLfo?.stop();
      this.streetSource?.stop();
      this.seaSource?.disconnect();
      this.seaFilter?.disconnect();
      this.seaGain?.disconnect();
      this.seaPanner?.disconnect();
      this.seaLfo?.disconnect();
      this.seaLfoGain?.disconnect();
      this.seaLfoFreqGain?.disconnect();
      this.surfSource?.disconnect();
      this.surfFilter?.disconnect();
      this.surfGain?.disconnect();
      this.surfLfo?.disconnect();
      this.surfLfoGain?.disconnect();
      this.surfLfoFreqGain?.disconnect();
      this.streetSource?.disconnect();
      this.streetFilter?.disconnect();
      this.streetGain?.disconnect();
      this.streetPanner?.disconnect();
    } catch {
      // Ignore cleanup errors
    }
    this.seaSource = null;
    this.seaFilter = null;
    this.seaGain = null;
    this.seaPanner = null;
    this.seaLfo = null;
    this.seaLfoGain = null;
    this.seaLfoFreqGain = null;
    this.surfSource = null;
    this.surfFilter = null;
    this.surfGain = null;
    this.surfLfo = null;
    this.surfLfoGain = null;
    this.surfLfoFreqGain = null;
    this.streetSource = null;
    this.streetFilter = null;
    this.streetGain = null;
    this.streetPanner = null;
  }

  public startEngineLoop(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.engineActive) return;

    try {
      const buf = this.ensureNoiseBuffer(ctx);

      const mainOsc = ctx.createOscillator();
      mainOsc.type = 'sawtooth';
      mainOsc.frequency.value = 54;

      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.value = 27;

      const growlOsc = ctx.createOscillator();
      growlOsc.type = 'sawtooth';
      growlOsc.frequency.value = 81;

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.createSaturationCurve(2.2);
      shaper.oversample = 'none';

      const engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 220;
      engFilter.Q.value = 2.8;

      const engGain = ctx.createGain();
      engGain.gain.value = 0.001;

      mainOsc.connect(shaper);
      subOsc.connect(shaper);
      growlOsc.connect(shaper);
      shaper.connect(engFilter);
      engFilter.connect(engGain);
      engGain.connect(ctx.destination);

      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;

      const windFlt = ctx.createBiquadFilter();
      windFlt.type = 'bandpass';
      windFlt.frequency.value = 420;
      windFlt.Q.value = 0.85;

      const wGain = ctx.createGain();
      wGain.gain.value = 0.001;

      windSrc.connect(windFlt);
      windFlt.connect(wGain);
      wGain.connect(ctx.destination);

      mainOsc.start();
      subOsc.start();
      growlOsc.start();
      windSrc.start();

      this.engineOscMain = mainOsc;
      this.engineOscSub = subOsc;
      this.engineOscGrowl = growlOsc;
      this.engineShaper = shaper;
      this.engineFilter = engFilter;
      this.engineGain = engGain;
      this.windSource = windSrc;
      this.windFilter = windFlt;
      this.windGain = wGain;
      this.engineActive = true;
    } catch {
      this.engineActive = false;
    }
  }

  public playGearShift(upshift: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(upshift ? 115 : 155, now);
      osc.frequency.exponentialRampToValueAtTime(upshift ? 68 : 195, now + 0.075);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio errors
    }
  }

  public updateEngineAudio(
    speedKmh: number,
    rpmRatio: number,
    gear: number,
    throttle: boolean,
    braking: boolean,
    isMoto: boolean,
    engineProfile: EngineSoundProfile = 'race_sport',
  ): void {
    if (this.muted) {
      this.stopEngineLoop();
      return;
    }
    if (!this.engineActive) {
      this.startEngineLoop();
      if (!this.engineActive) return;
    }
    const ctx = this.ctx;
    if (
      !ctx ||
      !this.engineOscMain ||
      !this.engineOscSub ||
      !this.engineOscGrowl ||
      !this.engineFilter ||
      !this.engineGain ||
      !this.windFilter ||
      !this.windGain
    ) {
      return;
    }

    if (gear !== this.lastGear && speedKmh > 12) {
      this.playGearShift(gear > this.lastGear);
      this.lastGear = gear;
    } else if (speedKmh <= 12) {
      this.lastGear = gear;
    }

    const t = ctx.currentTime;
    const clampedRpm = Math.max(0.08, Math.min(1, rpmRatio));
    const isVespaTone = isMoto && engineProfile === 'classic_vespa';

    const baseHz = isMoto
      ? isVespaTone
        ? 36 + clampedRpm * 86 + (throttle ? 8 : 0)
        : 54 + clampedRpm * 164 + (throttle ? 14 : 0)
      : 32 + clampedRpm * 78 + (throttle ? 5 : 0);

    this.engineOscMain.frequency.setTargetAtTime(baseHz, t, 0.032);
    this.engineOscSub.frequency.setTargetAtTime(baseHz * (isVespaTone ? 0.48 : 0.5), t, 0.032);
    this.engineOscGrowl.frequency.setTargetAtTime(
      baseHz * (isMoto ? (isVespaTone ? 1.98 : 1.504) : 1.335),
      t,
      0.032,
    );

    const filterCut = isMoto
      ? isVespaTone
        ? 260 + clampedRpm * 520 + (throttle ? 160 : 0)
        : 280 + clampedRpm * 980 + (throttle ? 260 : 0)
      : 145 + clampedRpm * 400 + (throttle ? 110 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterCut, t, 0.04);

    const targetEngGain =
      (isMoto ? (isVespaTone ? 0.032 : 0.038) : 0.025) +
      clampedRpm * (throttle ? 0.034 : 0.015) -
      (braking && speedKmh < 8 ? 0.012 : 0);
    this.engineGain.gain.setTargetAtTime(Math.max(0.012, targetEngGain), t, 0.05);

    // Aerodynamic wind rush scaling cleanly at highway speed (> 35 km/h)
    const speedFactor = Math.max(0, Math.min(1, (speedKmh - 35) / 135));
    const windCut = 380 + speedFactor * 1550;
    const windVol = speedFactor * speedFactor * (isMoto ? 0.15 : 0.08);
    this.windFilter.frequency.setTargetAtTime(windCut, t, 0.08);
    this.windGain.gain.setTargetAtTime(Math.max(0.001, windVol), t, 0.08);
  }

  /** Garage & Showcase "تجربة التروس والبنزين" — realistic rev blip + upshift + exhaust pop */
  public playRevBurst(profile: EngineSoundProfile = 'race_sport', exhaustPop = true): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const isVespa = profile === 'classic_vespa';

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = isVespa ? 'square' : 'triangle';

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(isVespa ? 2.4 : 3.2, now);

      if (isVespa) {
        // Iconic 2-stroke Alexandria Vespa rev-up & quick gear step
        osc1.frequency.setValueAtTime(52, now);
        osc1.frequency.exponentialRampToValueAtTime(148, now + 0.34);
        osc1.frequency.setValueAtTime(102, now + 0.38);
        osc1.frequency.exponentialRampToValueAtTime(174, now + 0.68);
        osc1.frequency.exponentialRampToValueAtTime(56, now + 1.05);

        osc2.frequency.setValueAtTime(104, now);
        osc2.frequency.exponentialRampToValueAtTime(296, now + 0.34);
        osc2.frequency.setValueAtTime(204, now + 0.38);
        osc2.frequency.exponentialRampToValueAtTime(348, now + 0.68);
        osc2.frequency.exponentialRampToValueAtTime(112, now + 1.05);

        filter.frequency.setValueAtTime(340, now);
        filter.frequency.exponentialRampToValueAtTime(1050, now + 0.68);
        filter.frequency.exponentialRampToValueAtTime(320, now + 1.05);
      } else {
        // High-revving inline-4 Superbike scream + rapid quick-shift blip!
        osc1.frequency.setValueAtTime(76, now);
        osc1.frequency.exponentialRampToValueAtTime(248, now + 0.3);
        osc1.frequency.setValueAtTime(165, now + 0.35);
        osc1.frequency.exponentialRampToValueAtTime(310, now + 0.66);
        osc1.frequency.exponentialRampToValueAtTime(84, now + 1.08);

        osc2.frequency.setValueAtTime(114, now);
        osc2.frequency.exponentialRampToValueAtTime(372, now + 0.3);
        osc2.frequency.setValueAtTime(248, now + 0.35);
        osc2.frequency.exponentialRampToValueAtTime(466, now + 0.66);
        osc2.frequency.exponentialRampToValueAtTime(126, now + 1.08);

        filter.frequency.setValueAtTime(420, now);
        filter.frequency.exponentialRampToValueAtTime(1950, now + 0.66);
        filter.frequency.exponentialRampToValueAtTime(380, now + 1.08);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.085, now + 0.06);
      gain.gain.setValueAtTime(0.09, now + 0.66);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.08);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.1);
      osc2.stop(now + 1.1);

      // Crisp exhaust backfire crackle on decel if sport/chrome exhaust
      if (exhaustPop) {
        const popTimes = [0.35, 0.72, 0.82];
        for (const offset of popTimes) {
          const pOsc = ctx.createOscillator();
          const pGain = ctx.createGain();
          pOsc.type = 'sawtooth';
          pOsc.frequency.setValueAtTime(160, now + offset);
          pOsc.frequency.exponentialRampToValueAtTime(42, now + offset + 0.055);
          pGain.gain.setValueAtTime(0.055, now + offset);
          pGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
          pOsc.connect(pGain);
          pGain.connect(ctx.destination);
          pOsc.start(now + offset);
          pOsc.stop(now + offset + 0.065);
        }
      }
    } catch {
      // Ignore audio errors
    }
  }

  public stopEngineLoop(): void {
    if (!this.engineActive) return;
    this.engineActive = false;
    try {
      this.engineOscMain?.stop();
      this.engineOscSub?.stop();
      this.engineOscGrowl?.stop();
      this.windSource?.stop();
      this.engineOscMain?.disconnect();
      this.engineOscSub?.disconnect();
      this.engineOscGrowl?.disconnect();
      this.engineShaper?.disconnect();
      this.engineFilter?.disconnect();
      this.engineGain?.disconnect();
      this.windSource?.disconnect();
      this.windFilter?.disconnect();
      this.windGain?.disconnect();
    } catch {
      // Ignore cleanup errors
    }
    this.engineOscMain = null;
    this.engineOscSub = null;
    this.engineOscGrowl = null;
    this.engineShaper = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.windSource = null;
    this.windFilter = null;
    this.windGain = null;
  }

  public playHorn(isMoto = true, profile?: HornSoundProfile): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chosen: HornSoundProfile = profile ?? (isMoto ? 'sport' : 'classic');

    if (chosen === 'melody') {
      // Iconic Alexandria Corniche two-tone celebratory street horn
      const seq = [
        { f1: 523.25, f2: 659.25, start: 0, dur: 0.14 },
        { f1: 659.25, f2: 783.99, start: 0.16, dur: 0.14 },
        { f1: 783.99, f2: 1046.5, start: 0.32, dur: 0.24 },
      ];
      for (const n of seq) {
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();
        o1.type = 'sawtooth';
        o2.type = 'triangle';
        o1.frequency.setValueAtTime(n.f1, now + n.start);
        o2.frequency.setValueAtTime(n.f2, now + n.start);
        g.gain.setValueAtTime(0.001, now + n.start);
        g.gain.exponentialRampToValueAtTime(0.085, now + n.start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);
        o1.start(now + n.start);
        o2.start(now + n.start);
        o1.stop(now + n.start + n.dur + 0.02);
        o2.stop(now + n.start + n.dur + 0.02);
      }
      return;
    }

    if (chosen === 'air') {
      // Deep powerful dual-trumpet air horn
      const freqs = [246.94, 311.13, 369.99];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.095, now + 0.03);
      gain.gain.setValueAtTime(0.09, now + 0.32);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      filter.connect(gain);
      gain.connect(ctx.destination);
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.connect(filter);
        osc.start(now);
        osc.stop(now + 0.47);
      }
      return;
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (chosen === 'classic') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(392, now);
      osc2.frequency.setValueAtTime(494, now);
    } else {
      osc1.type = 'triangle';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(560, now);
      osc2.frequency.setValueAtTime(710, now);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.setValueAtTime(0.085, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }

  public playBrakeStop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.16);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.001, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.09, now + i * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.16);
    });
  }

  public playPassengerHail(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.09);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playDropoff(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.001, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.1, now + i * 0.065 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.25);
    });
  }

  public playFuel(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.18);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playWhistle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2650, now);
    lfo.frequency.setValueAtTime(28, now);
    lfoGain.gain.setValueAtTime(160, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.setValueAtTime(0.075, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.44);
    lfo.stop(now + 0.44);
  }

  public playPoliceSiren(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.linearRampToValueAtTime(980, now + 0.22);
    osc.frequency.linearRampToValueAtTime(640, now + 0.44);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playHorseBell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1320, now + offset);
      gain.gain.setValueAtTime(0.06, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  }

  public playMotoPass(panOffset = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.11);
    osc.frequency.exponentialRampToValueAtTime(105, now + 0.28);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, panOffset)), now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(ctx.destination);
    }

    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playTrafficWhoosh(panOffset = 0, isOncoming = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isOncoming ? 210 : 128, now);
    osc.frequency.exponentialRampToValueAtTime(isOncoming ? 78 : 66, now + 0.26);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(680, now);

    gain.gain.setValueAtTime(0.002, now);
    gain.gain.linearRampToValueAtTime(isOncoming ? 0.065 : 0.042, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    osc.connect(filter);
    filter.connect(gain);
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, panOffset)), now);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playCrash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.28;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.085));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.06, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.22);
    });
  }

  public playCountdownBeep(isGo: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.24);
    }
    gain.gain.setValueAtTime(isGo ? 0.16 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.36 : 0.18));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isGo ? 0.38 : 0.2));
  }

  public playBeep(freq = 720, durationSec = 0.06, volume = 0.12): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(Math.max(0.002, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }
}

export const soundFX = new SoundEngine();
