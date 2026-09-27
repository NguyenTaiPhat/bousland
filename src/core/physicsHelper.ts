/**
 * Normalizes mouse displacement into pixels per second using deltaTime.
 */
export function computeNormalizedVelocity(deltaPx: number, dtSeconds: number): number {
  const dt = Math.max(0.001, dtSeconds);
  return deltaPx / dt;
}

/**
 * Calculates subtle physical jelly deformation (Squish & Stretch)
 * based on drag speed, clamped to a premium elegance threshold (max 8% stretch, 5% squish).
 * Fully respects prefers-reduced-motion.
 */
export function calculateJellyScale(
  velocityPxPerSec: number,
  axis: "horizontal" | "vertical",
  reducedMotion = false
): { scaleX: number; scaleY: number } {
  if (reducedMotion) {
    return { scaleX: 1, scaleY: 1 };
  }

  const speed = Math.abs(velocityPxPerSec);
  if (speed < 10) {
    return { scaleX: 1, scaleY: 1 };
  }

  // Smooth decay factor mapping 0..2000px/s to 0..0.08
  const stretchAmount = Math.min(0.08, speed * 0.00004);
  const squishAmount = Math.min(0.05, speed * 0.000025);

  if (axis === "horizontal") {
    return {
      scaleX: 1 + stretchAmount,
      scaleY: 1 - squishAmount,
    };
  } else {
    return {
      scaleX: 1 - squishAmount,
      scaleY: 1 + stretchAmount,
    };
  }
}
