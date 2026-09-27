/**
 * High-performance, unreactive shared buffer for WASAPI audio spectrum.
 * Avoids triggering 60fps React state re-renders across the main app tree.
 */
export const rawAudioSpectrumBuffer = new Float32Array(4);

/**
 * Updates the 4-band audio spectrum in-place.
 */
export function updateRawAudioBuffer(bands: [number, number, number, number]): void {
  rawAudioSpectrumBuffer[0] = bands[0];
  rawAudioSpectrumBuffer[1] = bands[1];
  rawAudioSpectrumBuffer[2] = bands[2];
  rawAudioSpectrumBuffer[3] = bands[3];
}

/**
 * Exponential Moving Average (EMA) with asymmetric attack and decay factors.
 * - Attack (e.g. 0.35 - 0.45): captures transient percussion and bass hits swiftly.
 * - Decay (e.g. 0.08 - 0.15): allows the liquid curve to recede gracefully without jitter.
 */
export function smoothSpectrum(
  current: Float32Array,
  target: Float32Array,
  attack = 0.35,
  decay = 0.12
): Float32Array {
  for (let i = 0; i < 4; i++) {
    const t = target[i];
    const c = current[i];
    const factor = t > c ? attack : decay;
    current[i] = c + (t - c) * factor;
  }
  return current;
}

/**
 * Resets the buffer values to zero when media pauses or stops.
 */
export function resetAudioSpectrumBuffer(): void {
  rawAudioSpectrumBuffer.fill(0);
}
