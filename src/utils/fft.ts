import { MotionSample, ShaperRecommendation } from '../types';

/**
 * Radix-2 Cooley-Tukey FFT implementation
 */
export function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error('FFT length must be a power of 2');
  }

  // Bit reversal
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly updates
  for (let l = 2; l <= n; l <<= 1) {
    const angle = (-2 * Math.PI) / l;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += l) {
      let wR = 1.0;
      let wI = 0.0;
      const halfL = l >> 1;

      for (let k = 0; k < halfL; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];

        const vR = real[i + k + halfL] * wR - imag[i + k + halfL] * wI;
        const vI = real[i + k + halfL] * wI + imag[i + k + halfL] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;

        real[i + k + halfL] = uR - vR;
        imag[i + k + halfL] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }
}

/**
 * Compute Power Spectral Density (PSD) from an array of acceleration samples.
 */
export function computeResonanceSpectrum(
  samples: MotionSample[],
  axis: 'x' | 'y' | 'z' = 'x',
  maxFreq = 140
): { freqs: number[]; psd: number[]; peakFreq: number; peakPower: number } {
  if (samples.length < 32) {
    return { freqs: [], psd: [], peakFreq: 0, peakPower: 0 };
  }

  // Calculate sampling rate
  const dt = (samples[samples.length - 1].time - samples[0].time) / (samples.length - 1);
  const sampleRate = dt > 0 ? 1 / dt : 100; // fallback to 100Hz

  // Next power of 2
  let n = 1;
  while (n <= samples.length && n < 2048) {
    n <<= 1;
  }
  if (n > samples.length) n >>= 1;
  if (n < 32) n = 32;

  const real = new Float64Array(n);
  const imag = new Float64Array(n);

  // Extract axis data with mean removal (DC offset removal) and Hanning window
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const val = samples[i][axis];
    mean += val;
  }
  mean /= n;

  for (let i = 0; i < n; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1))); // Hanning window
    real[i] = (samples[i][axis] - mean) * window;
    imag[i] = 0;
  }

  fft(real, imag);

  const numBins = Math.floor((maxFreq / (sampleRate / 2)) * (n / 2));
  const freqs: number[] = [];
  const psd: number[] = [];

  let peakFreq = 0;
  let peakPower = 0;

  for (let i = 1; i < Math.min(n / 2, Math.max(numBins, 20)); i++) {
    const f = (i * sampleRate) / n;
    if (f < 5) continue; // ignore sub-5Hz drift
    if (f > maxFreq) break;

    const power = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / n;
    freqs.push(Math.round(f * 10) / 10);
    psd.push(power);

    if (power > peakPower) {
      peakPower = power;
      peakFreq = Math.round(f * 10) / 10;
    }
  }

  return { freqs, psd, peakFreq, peakPower };
}

/**
 * Calculate recommended Klipper input shapers based on primary resonance peak
 */
export function calculateKlipperShapers(peakFreq: number): ShaperRecommendation[] {
  if (peakFreq <= 0) {
    return [];
  }

  // Klipper's shaper formulas for max recommended acceleration
  // Reference: https://www.klipper3d.org/Resonance_Compensation.html
  return [
    {
      type: 'MZV',
      freq: Math.round(peakFreq * 10) / 10,
      maxAccel: Math.round(peakFreq * 85),
      vibrations: 1.2,
      description: 'Zbalansowany: dobre tłumienie rezonansu i wysokie przyspieszenie. Zalecany dla większości drukarek.',
    },
    {
      type: 'ZVD',
      freq: Math.round(peakFreq * 10) / 10,
      maxAccel: Math.round(peakFreq * 115),
      vibrations: 2.8,
      description: 'Najszybszy: pozwala na najwyższe przyspieszenia, nieco słabsze tłumienie przy szerokim piku.',
    },
    {
      type: 'EI',
      freq: Math.round(peakFreq * 10) / 10,
      maxAccel: Math.round(peakFreq * 55),
      vibrations: 0.5,
      description: 'Extra-Insensitive: bardzo wysokie tłumienie w szerokim paśmie, umiarkowane przyspieszenie.',
    },
    {
      type: '2HUMP_EI',
      freq: Math.round(peakFreq * 0.95 * 10) / 10,
      maxAccel: Math.round(peakFreq * 40),
      vibrations: 0.1,
      description: 'Dla dwóch bliskich rezonansów ramy/stołu. Bardzo gładkie ściany wydruku kosztem przyspieszenia.',
    },
    {
      type: '3HUMP_EI',
      freq: Math.round(peakFreq * 0.9 * 10) / 10,
      maxAccel: Math.round(peakFreq * 30),
      vibrations: 0.0,
      description: 'Maksymalna eliminacja ghostingu/ringingu przy wiotkiej konstrukcji lub ciężkim stole Bed Slinger.',
    },
  ];
}
