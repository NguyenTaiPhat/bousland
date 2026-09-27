import { describe, it, expect } from "vitest";
import { getBorderRadiusForDock, getContactingBorderStyle } from "../core/dockingHelper";

describe("getBorderRadiusForDock", () => {
  describe("compact mode", () => {
    it("gives flat top and left edges for TOP_LEFT", () => {
      expect(getBorderRadiusForDock("TOP_LEFT")).toBe("0px 0px 22px 0px");
    });
    it("gives flat top and right edges for TOP_RIGHT", () => {
      expect(getBorderRadiusForDock("TOP_RIGHT")).toBe("0px 0px 0px 22px");
    });
    it("gives flat left edge for LEFT", () => {
      expect(getBorderRadiusForDock("LEFT")).toBe("0px 22px 22px 0px");
    });
    it("gives flat right edge for RIGHT", () => {
      expect(getBorderRadiusForDock("RIGHT")).toBe("22px 0px 0px 22px");
    });
    it("gives flat top edge (0px) touching screen and rounded bottom for TOP_CENTER", () => {
      expect(getBorderRadiusForDock("TOP_CENTER")).toBe("0px 0px 22px 22px");
    });
  });

  describe("expanded mode", () => {
    it("gives flat top edge (0px) touching screen for TOP_CENTER expanded", () => {
      expect(getBorderRadiusForDock("TOP_CENTER", true)).toBe("0px 0px 18px 18px");
    });
    it("gives flat left edge (0px) touching screen for LEFT expanded", () => {
      expect(getBorderRadiusForDock("LEFT", true)).toBe("0px 18px 18px 0px");
    });
    it("gives flat right edge (0px) touching screen for RIGHT expanded", () => {
      expect(getBorderRadiusForDock("RIGHT", true)).toBe("18px 0px 0px 18px");
    });
  });
});

describe("getContactingBorderStyle", () => {
  it("removes borderTop for TOP_CENTER", () => {
    expect(getContactingBorderStyle("TOP_CENTER")).toEqual({ borderTop: "none" });
  });
  it("removes borderLeft for LEFT", () => {
    expect(getContactingBorderStyle("LEFT")).toEqual({ borderLeft: "none" });
  });
  it("removes borderRight for RIGHT", () => {
    expect(getContactingBorderStyle("RIGHT")).toEqual({ borderRight: "none" });
  });
});
