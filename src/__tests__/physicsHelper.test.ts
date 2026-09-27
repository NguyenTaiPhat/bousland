import { describe, it, expect } from "vitest";
import { calculateJellyScale, computeNormalizedVelocity } from "../core/physicsHelper";

describe("calculateJellyScale", () => {
  it("stretches horizontal axis and squishes vertical axis for horizontal drag", () => {
    const scale = calculateJellyScale(600, "horizontal", false);
    expect(scale.scaleX).toBeGreaterThan(1.0);
    expect(scale.scaleY).toBeLessThan(1.0);
    expect(scale.scaleX).toBeLessThanOrEqual(1.08); // Clamped to 8% max
    expect(scale.scaleY).toBeGreaterThanOrEqual(0.95);
  });

  it("stretches vertical axis and squishes horizontal axis for vertical drag", () => {
    const scale = calculateJellyScale(600, "vertical", false);
    expect(scale.scaleY).toBeGreaterThan(1.0);
    expect(scale.scaleX).toBeLessThan(1.0);
    expect(scale.scaleY).toBeLessThanOrEqual(1.08);
    expect(scale.scaleX).toBeGreaterThanOrEqual(0.95);
  });

  it("returns 1.0 for all axes when reducedMotion is true", () => {
    const scale = calculateJellyScale(800, "horizontal", true);
    expect(scale).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it("returns 1.0 for stationary drag (zero velocity)", () => {
    const scale = calculateJellyScale(0, "horizontal", false);
    expect(scale).toEqual({ scaleX: 1, scaleY: 1 });
  });
});

describe("computeNormalizedVelocity", () => {
  it("computes pixels per second using deltaTime correctly", () => {
    // 50px moved in 0.1s = 500 px/sec
    const v = computeNormalizedVelocity(50, 0.1);
    expect(v).toBeCloseTo(500);
  });

  it("guards against zero or negative deltaTime", () => {
    const v = computeNormalizedVelocity(50, 0);
    expect(Number.isFinite(v)).toBe(true);
  });
});
