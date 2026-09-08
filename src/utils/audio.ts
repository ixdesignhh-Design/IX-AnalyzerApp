/**
 * Audio processing utilities: Belt tension tuner, Decibel meter, and Tone generator.
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Autocorrelation pitch detection algorithm.
 * Extremely robust for finding fundamental frequency of plucked mechanical belts (60Hz - 400Hz).
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): { freq: number; confidence: number } {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // If too quiet, return zero
  if (rms < 0.01) {
    return { freq: 0, confidence: 0 };
  }

  // Trim silence at boundaries
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.subarray(r1, r2);
  const c = new Float32Array(trimmed.length);

  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  // Find first trough
  let d = 0;
  while (d < c.length - 1 && c[d] > c[d + 1]) {
    d++;
  }

  // Find maximum peak after trough
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < c.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  // Parabolic interpolation for sub-bin precision
  if (T0 > 0 && T0 < c.length - 1) {
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      T0 = T0 - b / (2 * a);
    }
  }

  const confidence = maxval / c[0];
  const freq = sampleRate / T0;

  // Filter realistic belt frequency range (40 Hz to 450 Hz)
  if (freq >= 40 && freq <= 450 && confidence > 0.4) {
    return { freq, confidence };
  }

  return { freq: 0, confidence: 0 };
}

/**
 * Play a subtle alignment tone / tick when reaching level 0.0°
 */
export function playLevelBeep(isPerfect = true): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isPerfect ? 880 : 587.33, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (err) {
    console.debug('Audio play failed', err);
  }
}

/**
 * Tone generator for resonance & audio testing
 */
export class ToneGenerator {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying = false;

  start(freq = 440, type: OscillatorType = 'sine', volume = 0.2): void {
    this.stop();
    this.ctx = getAudioContext();

    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();

    this.osc.type = type;
    this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    this.gain.gain.setValueAtTime(volume, this.ctx.currentTime);

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.osc.start();
    this.isPlaying = true;
  }

  setFrequency(freq: number): void {
    if (this.osc && this.ctx && this.isPlaying) {
      this.osc.frequency.setValueAtTime(Math.max(10, Math.min(20000, freq)), this.ctx.currentTime);
    }
  }

  setVolume(vol: number): void {
    if (this.gain && this.ctx && this.isPlaying) {
      this.gain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  setWaveform(type: OscillatorType): void {
    if (this.osc && this.isPlaying) {
      this.osc.type = type;
    }
  }

  stop(): void {
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {}
      this.osc = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
    this.isPlaying = false;
  }

  get active(): boolean {
    return this.isPlaying;
  }
}
