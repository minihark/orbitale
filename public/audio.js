/**
 * Orbitale — Procedural Web Audio Engine
 * Features: Polyphonic FM bell synthesis, algorithmic convolver reverb,
 * dynamic spatial stereo panning, and generative binaural cosmic drone.
 */

class CosmicAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.droneGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Musical Scales (Frequency ratios based on root C3 = 130.81Hz)
    this.rootFreq = 130.81;
    this.scales = {
      hirajoshi: {
        name: "Hirajoshi (Zen)",
        intervals: [0, 2, 3, 7, 8], // C, D, Eb, G, Ab
      },
      pygmy: {
        name: "Pygmy (Deep Space)",
        intervals: [0, 2, 3, 7, 10], // C, D, Eb, G, Bb
      },
      lydian: {
        name: "Lydian (Cosmic)",
        intervals: [0, 2, 4, 6, 7, 9, 11], // C, D, E, F#, G, A, B
      },
      dorian: {
        name: "Dorian (Nebula)",
        intervals: [0, 2, 3, 5, 7, 9, 10], // C, D, Eb, F, G, A, Bb
      },
      ambient: {
        name: "Ambient Major",
        intervals: [0, 2, 4, 7, 9], // C, D, E, G, A
      }
    };
    this.currentScale = "hirajoshi";
    this.droneOscs = [];
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Dynamic Convolver Reverb
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(3.8, 2.0);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.45, this.ctx.currentTime);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Limiter to prevent clipping
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);

    this.dryGain.connect(compressor);
    this.reverbGain.connect(compressor);
    compressor.connect(this.ctx.destination);

    // Initialize Drone
    this.startCosmicDrone();

    this.initialized = true;
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createImpulseResponse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  startCosmicDrone() {
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    const baseFreqs = [65.41, 98.0, 130.81]; // C2, G2, C3
    baseFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Low pass to keep drone warm and unobtrusive
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220 + idx * 60, this.ctx.currentTime);

      if (panner) {
        panner.pan.value = (idx - 1) * 0.4;
        osc.connect(filter);
        filter.connect(panner);
        panner.connect(this.droneGain);
      } else {
        osc.connect(filter);
        filter.connect(this.droneGain);
      }

      osc.start();
      this.droneOscs.push(osc);
    });

    this.droneGain.connect(this.reverbNode);
    this.droneGain.connect(this.dryGain);
  }

  getFrequencyFromValue(val, octaveRange = 3) {
    const scale = this.scales[this.currentScale] || this.scales.hirajoshi;
    const numNotes = scale.intervals.length;
    const totalNotes = numNotes * octaveRange;

    // Map normalized value [0, 1] to note index
    const index = Math.floor(Math.min(Math.max(val, 0), 0.999) * totalNotes);
    const octave = Math.floor(index / numNotes);
    const noteInScale = scale.intervals[index % numNotes];

    const semitones = noteInScale + octave * 12;
    return this.rootFreq * Math.pow(2, semitones / 12);
  }

  /**
   * Synthesize a chime / bell note when bodies interact or cross rings
   * @param {number} pitchNorm - Normalized pitch [0.0 - 1.0]
   * @param {number} velocity - Impact or passage intensity [0.0 - 1.0]
   * @param {number} panX - Stereo pan [-1.0 to 1.0]
   * @param {string} timbre - 'crystal', 'chime', 'bass', 'sparkle'
   */
  triggerChime(pitchNorm, velocity = 0.5, panX = 0, timbre = 'chime') {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const freq = this.getFrequencyFromValue(pitchNorm);

    // FM Synthesis Setup: Carrier + Modulator
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const noteGain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    let modRatio = 2.0;
    let decayTime = 1.2;
    let attackTime = 0.005;

    if (timbre === 'crystal') {
      carrier.type = 'sine';
      modulator.type = 'sine';
      modRatio = 3.5;
      decayTime = 2.4;
    } else if (timbre === 'bass') {
      carrier.type = 'triangle';
      modulator.type = 'sine';
      modRatio = 0.5;
      decayTime = 1.8;
    } else if (timbre === 'sparkle') {
      carrier.type = 'sine';
      modulator.type = 'sawtooth';
      modRatio = 5.0;
      decayTime = 0.8;
    } else {
      carrier.type = 'sine';
      modulator.type = 'sine';
      modRatio = 2.0;
      decayTime = 1.5;
    }

    const modFreq = freq * modRatio;
    carrier.frequency.setValueAtTime(freq, t);
    modulator.frequency.setValueAtTime(modFreq, t);

    const modIndex = 150 * velocity;
    modGain.gain.setValueAtTime(modIndex, t);
    modGain.gain.exponentialRampToValueAtTime(0.01, t + decayTime * 0.8);

    modulator.connect(carrier.frequency);

    const vol = Math.min(Math.max(velocity, 0.1), 0.9) * 0.4;
    noteGain.gain.setValueAtTime(0.0001, t);
    noteGain.gain.linearRampToValueAtTime(vol, t + attackTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, t + decayTime);

    if (panner) {
      panner.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, panX)), t);
      carrier.connect(noteGain);
      noteGain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      carrier.connect(noteGain);
      noteGain.connect(this.masterGain);
    }

    carrier.start(t);
    modulator.start(t);

    carrier.stop(t + decayTime + 0.1);
    modulator.stop(t + decayTime + 0.1);
  }

  /**
   * Gravitational Wave Chirp (LIGO Black Hole Merger Simulation)
   * Sweeping sub-bass chirp from 32Hz to 320Hz into the reverb buffer.
   */
  triggerGravitationalChirp(panX = 0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(32, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.38);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.linearRampToValueAtTime(480, t + 0.38);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.65, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

    osc.connect(filter);
    filter.connect(gain);

    if (panner) {
      panner.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, panX)), t);
      gain.connect(panner);
      panner.connect(this.masterGain);
      panner.connect(this.reverbNode);
    } else {
      gain.connect(this.masterGain);
      gain.connect(this.reverbNode);
    }

    osc.start(t);
    osc.stop(t + 2.3);
  }

  /**
   * Stellar Supernova / Core Collapse Detonation
   */
  triggerSupernovaExplosion(panX = 0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    
    // 1. Sub-bass concussive implosion boom
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(90, t);
    boomOsc.frequency.exponentialRampToValueAtTime(24, t + 0.9);
    boomGain.gain.setValueAtTime(0.8, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);
    boomOsc.connect(boomGain);
    boomGain.connect(this.masterGain);
    boomGain.connect(this.reverbNode);
    boomOsc.start(t);
    boomOsc.stop(t + 2.9);

    // 2. High-energy plasma detonation burst (filtered noise)
    const bufSize = this.ctx.sampleRate * 0.6;
    const noiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(650, t);
    noiseFilter.Q.setValueAtTime(3.5, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.reverbNode);
    noiseSrc.start(t);

    // 3. Shimmering cosmic ringdown chime
    this.triggerChime(0.9, 0.95, panX, 'sparkle');
  }

  /**
   * Tidal Disruption Event (TDE) - Relativistic tearing sound
   */
  triggerTidalDisruption(panX = 0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    mod.type = 'triangle';

    // Shredding frequency drop as matter plunges across event horizon
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.85);

    mod.frequency.setValueAtTime(140, t);
    mod.frequency.linearRampToValueAtTime(32, t + 0.85);

    modGain.gain.setValueAtTime(280, t);
    modGain.gain.exponentialRampToValueAtTime(10, t + 0.85);

    mod.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(240, t + 1.2);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    mod.start(t);
    osc.stop(t + 1.9);
    mod.stop(t + 1.9);
  }

  /**
   * Planetary Impact & Crustal Merger
   */
  triggerPlanetaryImpact(intensity = 0.5, panX = 0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Low percussive thud
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.25);

    const vol = Math.min(Math.max(intensity, 0.2), 0.9) * 0.7;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.reverbNode);

    osc.start(t);
    osc.stop(t + 0.85);

    // Complement with resonant crystal timbre
    this.triggerChime(0.35 + intensity * 0.3, intensity, panX, 'crystal');
  }

  /**
   * Thermonuclear Star Ignition
   */
  triggerStellarIgnition(panX = 0) {
    if (!this.initialized || this.isMuted) return;
    this.resume();

    const t = this.ctx.currentTime;
    const base = 98.0; // G2
    [1, 1.5, 2, 2.67].forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * ratio, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18 / (i + 1), t + 0.6 + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);

      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.reverbNode);

      osc.start(t);
      osc.stop(t + 3.3);
    });
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  setDroneVolume(val) {
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setValueAtTime(val * 0.25, this.ctx.currentTime);
    }
  }

  setReverbLevel(val) {
    if (this.reverbGain && this.ctx) {
      this.reverbGain.gain.setValueAtTime(val * 0.8, this.ctx.currentTime);
    }
  }

  setScale(scaleKey) {
    if (this.scales[scaleKey]) {
      this.currentScale = scaleKey;
    }
  }
}

window.CosmicAudio = new CosmicAudioEngine();
