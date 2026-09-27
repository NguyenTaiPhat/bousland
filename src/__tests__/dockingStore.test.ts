import { describe, it, expect } from "vitest";
import { STATE_DIMENSIONS, STATE_DIMENSIONS_VERTICAL } from "../stores/islandStore";

describe("Docking dimensions", () => {
  it("provides horizontal compact dimensions", () => {
    expect(STATE_DIMENSIONS.COMPACT).toEqual({ width: 360, height: 60 });
  });

  it("provides vertical compact dimensions", () => {
    expect(STATE_DIMENSIONS_VERTICAL.COMPACT).toEqual({ width: 60, height: 360 });
  });
});
