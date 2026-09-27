import { DockPosition } from "./types";

export type AuraState = "FLASH" | "LOW_BATTERY" | "CHARGING" | "MEDIA" | "IDLE";

export interface AuraInput {
  isScreenshotFlash: boolean;
  isCharging: boolean;
  isPlaying: boolean;
  batteryPct: number;
}

/**
 * Strict Priority Hierarchy:
 * P0: FLASH (Screenshot shutter pulse)
 * P1: LOW_BATTERY (<20% & unplugged)
 * P2: CHARGING (Emerald breathing pulse)
 * P3: MEDIA (Vibrant aura from album art or accent)
 * P4: IDLE (Aura off to conserve GPU)
 */
export function resolveAuraState(input: AuraInput): AuraState {
  if (input.isScreenshotFlash) return "FLASH";
  if (!input.isCharging && input.batteryPct < 20) return "LOW_BATTERY";
  if (input.isCharging) return "CHARGING";
  if (input.isPlaying) return "MEDIA";
  return "IDLE";
}

/**
 * Computes directional aura box-shadow based on state and dock position.
 * Does not emit light backwards into the contacting physical bezel.
 */
export function getAuraBoxShadow(
  state: AuraState,
  dock: DockPosition,
  dominantColor?: string | null
): string {
  if (state === "IDLE") return "none";

  let color = "rgba(56, 189, 248, 0.4)"; // fallback accent
  let blurRadius = 24;
  let spreadRadius = 2;

  switch (state) {
    case "FLASH":
      color = "rgba(255, 255, 255, 0.9)";
      blurRadius = 36;
      spreadRadius = 6;
      break;
    case "CHARGING":
      color = "rgba(16, 185, 129, 0.55)";
      blurRadius = 26;
      spreadRadius = 3;
      break;
    case "LOW_BATTERY":
      color = "rgba(239, 68, 68, 0.5)";
      blurRadius = 24;
      spreadRadius = 2;
      break;
    case "MEDIA":
      if (dominantColor) {
        color = dominantColor;
      }
      blurRadius = 28;
      spreadRadius = 3;
      break;
  }

  // Directional offsets (X, Y) avoiding bezel
  let offsetX = 0;
  let offsetY = 0;

  switch (dock) {
    case "LEFT":
      offsetX = 10;
      offsetY = 0;
      break;
    case "RIGHT":
      offsetX = -10;
      offsetY = 0;
      break;
    case "TOP_LEFT":
      offsetX = 8;
      offsetY = 8;
      break;
    case "TOP_RIGHT":
      offsetX = -8;
      offsetY = 8;
      break;
    case "TOP_CENTER":
    default:
      offsetX = 0;
      offsetY = 10;
      break;
  }

  return `${offsetX}px ${offsetY}px ${blurRadius}px ${spreadRadius}px ${color}, 0 0 ${Math.round(blurRadius * 0.75)}px ${color}`;
}
