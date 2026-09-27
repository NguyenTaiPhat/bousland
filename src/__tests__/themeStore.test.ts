import { describe, it, expect, beforeEach } from "vitest";
import { applyThemeToDOM } from "../stores/settingsStore";

const fakeStyles: Record<string, string> = {};
const fakeAttrs: Record<string, string> = {};

(globalThis as any).document = {
  documentElement: {
    setAttribute: (k: string, v: string) => { fakeAttrs[k] = v; },
    getAttribute: (k: string) => fakeAttrs[k],
    removeAttribute: (k: string) => { delete fakeAttrs[k]; },
    style: {
      setProperty: (k: string, v: string) => { fakeStyles[k] = v; },
      getPropertyValue: (k: string) => fakeStyles[k],
      cssText: "",
    },
  },
};

describe("applyThemeToDOM", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.cssText = "";
  });

  it("applies light theme with auto-inverted dark accent when accent is default white", () => {
    applyThemeToDOM("light", "#FFFFFF");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#111827");
    expect(document.documentElement.style.getPropertyValue("--accent-contrast")).toBe("#FFFFFF");
  });

  it("applies snow theme with custom colorful accent unchanged", () => {
    applyThemeToDOM("snow", "#38bdf8");
    expect(document.documentElement.getAttribute("data-theme")).toBe("snow");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#38bdf8");
    expect(document.documentElement.style.getPropertyValue("--accent-contrast")).toBe("#000000");
  });
});
