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
/**
 * Converts any hex or rgb color string into an ultra-subtle, whisper-light RGBA
 */
function toSubtleAuraColor(colorStr: string, alpha: number = 0.06): string {
  if (colorStr.startsWith("#")) {
    const raw = colorStr.slice(1);
    const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }
  const rgbaMatch = colorStr.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${alpha})`;
  }
  return `rgba(56, 189, 248, ${alpha})`;
}

/**
 * Computes directional aura box-shadow based on state and dock position.
 * Designed to be ultra-subtle, whisper-light, and non-distracting.
 */
export function getAuraBoxShadow(
  state: AuraState,
  dock: DockPosition,
  dominantColor?: string | null
): string {
  if (state === "IDLE") return "none";

  let color = "rgba(56, 189, 248, 0.05)"; // fallback accent
  let blurRadius = 8;
  let spreadRadius = 0;

  switch (state) {
    case "FLASH":
      color = "rgba(255, 255, 255, 0.75)";
      blurRadius = 18;
      spreadRadius = 1;
      break;
    case "CHARGING":
      color = "rgba(16, 185, 129, 0.07)";
      blurRadius = 8;
      spreadRadius = 0;
      break;
    case "LOW_BATTERY":
      color = "rgba(239, 68, 68, 0.07)";
      blurRadius = 8;
      spreadRadius = 0;
      break;
    case "MEDIA":
      if (dominantColor) {
        color = toSubtleAuraColor(dominantColor, 0.06);
      } else {
        color = "rgba(56, 189, 248, 0.05)";
      }
      blurRadius = 8;
      spreadRadius = 0;
      break;
  }

  // Directional offsets (X, Y) avoiding bezel, closely hugging the boundary
  let offsetX = 0;
  let offsetY = 0;

  switch (dock) {
    case "LEFT":
      offsetX = 4;
      offsetY = 0;
      break;
    case "RIGHT":
      offsetX = -4;
      offsetY = 0;
      break;
    case "TOP_LEFT":
      offsetX = 3;
      offsetY = 3;
      break;
    case "TOP_RIGHT":
      offsetX = -3;
      offsetY = 3;
      break;
    case "TOP_CENTER":
    default:
      offsetX = 0;
      offsetY = 4;
      break;
  }

  return `${offsetX}px ${offsetY}px ${blurRadius}px ${spreadRadius}px ${color}`;
}
