import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUpdaterStore } from "../stores/updaterStore";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("updaterStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUpdaterStore.setState({
      status: "idle",
      updateInfo: null,
      errorMessage: null,
      downloadProgress: 0,
    });
  });

  it("should have initial idle state", () => {
    const state = useUpdaterStore.getState();
    expect(state.status).toBe("idle");
    expect(state.updateInfo).toBeNull();
    expect(state.downloadProgress).toBe(0);
  });

  it("should handle up-to-date response correctly", async () => {
    const mockInfo = {
      available: false,
      current_version: "1.0.0",
      latest_version: "1.0.0",
      notes: "Phiên bản hiện tại là mới nhất.",
      pub_date: "",
      download_url: "",
    };

    (tauriCore.invoke as any).mockResolvedValueOnce(mockInfo);

    await useUpdaterStore.getState().checkForUpdates();

    const state = useUpdaterStore.getState();
    expect(state.status).toBe("up-to-date");
    expect(state.updateInfo?.available).toBe(false);
  });

  it("should handle update-available response correctly", async () => {
    const mockInfo = {
      available: true,
      current_version: "1.0.0",
      latest_version: "1.0.1",
      notes: "Bản nâng cấp logo sang trọng.",
      pub_date: "2026-09-26",
      download_url: "https://github.com/NguyenTaiPhat/bousland/releases",
    };

    (tauriCore.invoke as any).mockResolvedValueOnce(mockInfo);

    await useUpdaterStore.getState().checkForUpdates();

    const state = useUpdaterStore.getState();
    expect(state.status).toBe("update-available");
    expect(state.updateInfo?.available).toBe(true);
    expect(state.updateInfo?.latest_version).toBe("1.0.1");
  });
});
