import { describe, it, expect } from "vitest";
import {
  rawAudioSpectrumBuffer,
  updateRawAudioBuffer,
  smoothSpectrum,
  resetAudioSpectrumBuffer,
} from "../core/audioSmoothing";

describe("audioSmoothing", () => {
  it("updates raw buffer without recreating typed array reference", () => {
    const originalRef = rawAudioSpectrumBuffer;
    updateRawAudioBuffer([0.5, 0.8, 0.2, 0.9]);
    expect(rawAudioSpectrumBuffer).toBe(originalRef);
    expect(rawAudioSpectrumBuffer[0]).toBeCloseTo(0.5);
    expect(rawAudioSpectrumBuffer[1]).toBeCloseTo(0.8);
    expect(rawAudioSpectrumBuffer[2]).toBeCloseTo(0.2);
    expect(rawAudioSpectrumBuffer[3]).toBeCloseTo(0.9);
  });

  it("attacks fast when target > current", () => {
    const current = new Float32Array([0, 0, 0, 0]);
    const target = new Float32Array([1, 1, 1, 1]);
    const result = smoothSpectrum(current, target, 0.4, 0.1);
    expect(result[0]).toBeCloseTo(0.4, 2);
  });

  it("decays slowly when target < current", () => {
    const current = new Float32Array([1, 1, 1, 1]);
    const target = new Float32Array([0, 0, 0, 0]);
    const result = smoothSpectrum(current, target, 0.4, 0.1);
    expect(result[0]).toBeCloseTo(0.9, 2);
  });

  it("resets buffer to zeros", () => {
    updateRawAudioBuffer([0.4, 0.5, 0.6, 0.7]);
    resetAudioSpectrumBuffer();
    expect(rawAudioSpectrumBuffer[0]).toBe(0);
    expect(rawAudioSpectrumBuffer[1]).toBe(0);
    expect(rawAudioSpectrumBuffer[2]).toBe(0);
    expect(rawAudioSpectrumBuffer[3]).toBe(0);
  });
});
