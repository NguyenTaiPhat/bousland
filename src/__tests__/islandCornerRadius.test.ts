import { describe, it, expect } from "vitest";

export function getBorderRadiusForDock(dock: string): string {
  switch (dock) {
    case "TOP_LEFT":
      return "0px 22px 22px 22px";
    case "TOP_RIGHT":
      return "22px 0px 22px 22px";
    case "LEFT":
      return "0px 22px 22px 0px";
    case "RIGHT":
      return "22px 0px 0px 22px";
    default:
      return "22px 22px 22px 22px";
  }
}

describe("getBorderRadiusForDock", () => {
  it("gives square top-left for TOP_LEFT", () => {
    expect(getBorderRadiusForDock("TOP_LEFT")).toBe("0px 22px 22px 22px");
  });
  it("gives square top-right for TOP_RIGHT", () => {
    expect(getBorderRadiusForDock("TOP_RIGHT")).toBe("22px 0px 22px 22px");
  });
  it("gives flat left edge for LEFT", () => {
    expect(getBorderRadiusForDock("LEFT")).toBe("0px 22px 22px 0px");
  });
  it("gives flat right edge for RIGHT", () => {
    expect(getBorderRadiusForDock("RIGHT")).toBe("22px 0px 0px 22px");
  });
  it("gives fully rounded pill for TOP_CENTER", () => {
    expect(getBorderRadiusForDock("TOP_CENTER")).toBe("22px 22px 22px 22px");
  });
});
