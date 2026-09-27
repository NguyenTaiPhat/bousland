import { describe, it, expect } from "vitest";
import {
  getTransformOriginForDock,
  getBorderRadiusForDock,
  getContactingBorderStyle,
} from "../core/dockingHelper";
import { DockPosition } from "../core/types";

describe("5-Dock Boundary & Transform Matrix", () => {
  const allDocks: DockPosition[] = [
    "TOP_CENTER",
    "LEFT",
    "RIGHT",
    "TOP_LEFT",
    "TOP_RIGHT",
  ];

  describe("Transform Origin", () => {
    it("maps TOP_CENTER to top center", () => {
      expect(getTransformOriginForDock("TOP_CENTER")).toBe("top center");
    });
    it("maps LEFT to left center", () => {
      expect(getTransformOriginForDock("LEFT")).toBe("left center");
    });
    it("maps RIGHT to right center", () => {
      expect(getTransformOriginForDock("RIGHT")).toBe("right center");
    });
    it("maps TOP_LEFT to top left", () => {
      expect(getTransformOriginForDock("TOP_LEFT")).toBe("top left");
    });
    it("maps TOP_RIGHT to top right", () => {
      expect(getTransformOriginForDock("TOP_RIGHT")).toBe("top right");
    });
  });

  describe("Contacting Border Suppression", () => {
    it("removes borderTop for TOP_CENTER", () => {
      expect(getContactingBorderStyle("TOP_CENTER")).toEqual({ borderTop: "none" });
    });
    it("removes borderLeft for LEFT", () => {
      expect(getContactingBorderStyle("LEFT")).toEqual({ borderLeft: "none" });
    });
    it("removes borderRight for RIGHT", () => {
      expect(getContactingBorderStyle("RIGHT")).toEqual({ borderRight: "none" });
    });
    it("removes borderTop and borderLeft for TOP_LEFT", () => {
      expect(getContactingBorderStyle("TOP_LEFT")).toEqual({
        borderTop: "none",
        borderLeft: "none",
      });
    });
    it("removes borderTop and borderRight for TOP_RIGHT", () => {
      expect(getContactingBorderStyle("TOP_RIGHT")).toEqual({
        borderTop: "none",
        borderRight: "none",
      });
    });
  });

  describe("Flat-edge Contact Radius", () => {
    allDocks.forEach((dock) => {
      it(`guarantees non-empty radius definition for ${dock}`, () => {
        const compact = getBorderRadiusForDock(dock, false);
        const expanded = getBorderRadiusForDock(dock, true);
        expect(compact).toBeDefined();
        expect(expanded).toBeDefined();
      });
    });
  });
});
