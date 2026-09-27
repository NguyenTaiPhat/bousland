import { describe, it, expect } from "vitest";
import { evaluateSnapMode } from "../core/dockingHelper";

describe("Hysteresis Snap Evaluation", () => {
  it("snaps into LEFT when entering within 48px from left edge", () => {
    expect(
      evaluateSnapMode({
        currentDock: "TOP_CENTER",
        x: 40,
        y: 200,
        screenWidth: 1920,
        screenHeight: 1080,
      })
    ).toBe("LEFT");
  });

  it("holds LEFT dock when hovering at 60px (inside hysteresis zone)", () => {
    expect(
      evaluateSnapMode({
        currentDock: "LEFT",
        x: 60,
        y: 10,
        screenWidth: 1920,
        screenHeight: 1080,
      })
    ).toBe("LEFT");
  });

  it("breaks away from LEFT when dragged past 80px", () => {
    expect(
      evaluateSnapMode({
        currentDock: "LEFT",
        x: 90,
        y: 10,
        screenWidth: 1920,
        screenHeight: 1080,
      })
    ).toBe("TOP_CENTER");
  });

  it("snaps into TOP_LEFT when within 60px corner", () => {
    expect(
      evaluateSnapMode({
        currentDock: "TOP_CENTER",
        x: 55,
        y: 5,
        screenWidth: 1920,
        screenHeight: 1080,
      })
    ).toBe("TOP_LEFT");
  });

  it("snaps into TOP_RIGHT when within 60px of right corner", () => {
    expect(
      evaluateSnapMode({
        currentDock: "TOP_CENTER",
        x: 1880,
        y: 5,
        screenWidth: 1920,
        screenHeight: 1080,
      })
    ).toBe("TOP_RIGHT");
  });
});
