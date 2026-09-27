import { describe, it, expect } from "vitest";
import { resolveAuraState, getAuraBoxShadow } from "../core/auraHelper";

describe("resolveAuraState", () => {
  it("prioritizes FLASH above all else", () => {
    expect(
      resolveAuraState({
        isScreenshotFlash: true,
        isCharging: true,
        isPlaying: true,
        batteryPct: 10,
      })
    ).toBe("FLASH");
  });

  it("prioritizes LOW_BATTERY over charging and media when battery < 20 and not charging", () => {
    expect(
      resolveAuraState({
        isScreenshotFlash: false,
        isCharging: false,
        isPlaying: true,
        batteryPct: 15,
      })
    ).toBe("LOW_BATTERY");
  });

  it("prioritizes CHARGING over media when charging", () => {
    expect(
      resolveAuraState({
        isScreenshotFlash: false,
        isCharging: true,
        isPlaying: true,
        batteryPct: 50,
      })
    ).toBe("CHARGING");
  });

  it("returns MEDIA when playing and not charging or low battery", () => {
    expect(
      resolveAuraState({
        isScreenshotFlash: false,
        isCharging: false,
        isPlaying: true,
        batteryPct: 80,
      })
    ).toBe("MEDIA");
  });

  it("returns IDLE when no active events", () => {
    expect(
      resolveAuraState({
        isScreenshotFlash: false,
        isCharging: false,
        isPlaying: false,
        batteryPct: 80,
      })
    ).toBe("IDLE");
  });
});

describe("getAuraBoxShadow", () => {
  it("returns none for IDLE state", () => {
    expect(getAuraBoxShadow("IDLE", "TOP_CENTER")).toBe("none");
  });

  it("returns white flash halo for FLASH state", () => {
    const shadow = getAuraBoxShadow("FLASH", "TOP_CENTER");
    expect(shadow).toContain("rgba(255, 255, 255");
  });

  it("returns emerald green aura for CHARGING state", () => {
    const shadow = getAuraBoxShadow("CHARGING", "TOP_CENTER");
    expect(shadow).toContain("rgba(16, 185, 129");
  });

  it("returns amber-red aura for LOW_BATTERY state", () => {
    const shadow = getAuraBoxShadow("LOW_BATTERY", "TOP_CENTER");
    expect(shadow).toContain("rgba(239, 68, 68");
  });

  it("uses dominant color for MEDIA state when provided", () => {
    const shadow = getAuraBoxShadow("MEDIA", "TOP_CENTER", "rgb(120, 40, 200)");
    expect(shadow).toContain("rgb(120, 40, 200)");
  });

  it("applies directional offset depending on dock position", () => {
    const topShadow = getAuraBoxShadow("CHARGING", "TOP_CENTER");
    expect(topShadow).toContain("0px 10px");

    const leftShadow = getAuraBoxShadow("CHARGING", "LEFT");
    expect(leftShadow).toContain("10px 0px");

    const rightShadow = getAuraBoxShadow("CHARGING", "RIGHT");
    expect(rightShadow).toContain("-10px 0px");
  });
});
