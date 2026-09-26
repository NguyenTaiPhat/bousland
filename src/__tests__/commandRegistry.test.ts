import { describe, it, expect, vi } from "vitest";
import { CommandRegistry } from "../core/commandRegistry";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe("CommandRegistry", () => {
  it("registers and searches default commands", () => {
    const registry = new CommandRegistry();
    const all = registry.getAll();
    expect(all.length).toBeGreaterThan(5);

    const volumeCommands = registry.search("volume");
    expect(volumeCommands.some((c) => c.id === "volume")).toBe(true);

    const screenshotCommands = registry.search("screenshot");
    expect(screenshotCommands.some((c) => c.id === "screenshot")).toBe(true);
  });

  it("handles valid volume arguments", async () => {
    const registry = new CommandRegistry();
    const result = await registry.execute("volume 65");
    expect(result).toBe("Volume set to 65%");
  });

  it("rejects out-of-range volume input", async () => {
    const registry = new CommandRegistry();
    const result = await registry.execute("volume 150");
    expect(result).toContain("Invalid volume level");
  });

  it("executes theme and color commands", async () => {
    const registry = new CommandRegistry();
    const themeResult = await registry.execute("theme glass");
    expect(themeResult).toContain("GLASS");

    const colorResult = await registry.execute("color blue");
    expect(colorResult).toContain("#38bdf8");
  });

  it("returns unknown command error for non-existent command", async () => {
    const registry = new CommandRegistry();
    const result = await registry.execute("nonexistent_command_xyz");
    expect(result).toContain("Unknown command");
  });
});
