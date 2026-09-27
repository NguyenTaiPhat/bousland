import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { BousEvent, IslandState } from "../core/types";

interface IslandStoreState {
  islandState: IslandState;
  activeEvent: BousEvent | null;
  
  volume: {
    volume: number;
    muted: boolean;
  };
  
  battery: {
    percentage: number;
    charging: boolean;
    pluggedIn: boolean;
  };
  
  media: {
    title: string;
    artist: string;
    album: string;
    artwork: string | null;
    isPlaying: boolean;
    position: number;
    duration: number;
  };
  
  network: {
    connected: boolean;
    isWifi: boolean;
    uploadSpeed: number;
    downloadSpeed: number;
  };
  
  system: {
    cpuUsage: number;
    ramUsage: number;
    ramUsedMb: number;
    ramTotalMb: number;
    diskUsage: number;
  };

  isVisible: boolean;

  // Actions
  setIslandState: (state: IslandState) => void;
  setActiveEvent: (event: BousEvent | null) => void;
  setIsVisible: (visible: boolean) => void;
  toggleVisibility: () => void;
  updateVolume: (volume: number, muted: boolean) => void;
  updateBattery: (percentage: number, charging: boolean, pluggedIn: boolean) => void;
  updateMedia: (media: Partial<IslandStoreState["media"]>) => void;
  updateNetwork: (net: Partial<IslandStoreState["network"]>) => void;
  updateSystem: (sys: Partial<IslandStoreState["system"]>) => void;
  spectrum: [number, number, number, number];
  updateSpectrum: (bands: [number, number, number, number]) => void;
  collapse: () => void;
}

let lastSyncedDimensions = { width: 0, height: 0 };
let shrinkTimer: ReturnType<typeof setTimeout> | null = null;

import { useSettingsStore } from "./settingsStore";
import { DockPosition } from "../core/types";

export const STATE_DIMENSIONS: Record<IslandState, { width: number; height: number }> = {
  COMPACT: { width: 360, height: 60 },
  EXPANDED: { width: 410, height: 110 },
  CONTROL_CENTER: { width: 480, height: 630 },
  COMMAND_BAR: { width: 580, height: 420 },
  SETTINGS: { width: 660, height: 540 },
  CLIPBOARD_HISTORY: { width: 540, height: 500 },
  QUICK_SHELF: { width: 520, height: 460 },
  SCRATCHPAD: { width: 500, height: 480 },
};

export const STATE_DIMENSIONS_VERTICAL: Record<IslandState, { width: number; height: number }> = {
  COMPACT: { width: 60, height: 360 },
  EXPANDED: { width: 110, height: 410 },
  CONTROL_CENTER: { width: 480, height: 630 },
  COMMAND_BAR: { width: 580, height: 420 },
  SETTINGS: { width: 660, height: 540 },
  CLIPBOARD_HISTORY: { width: 540, height: 500 },
  QUICK_SHELF: { width: 520, height: 460 },
  SCRATCHPAD: { width: 500, height: 480 },
};

export async function syncWindowCanvas(
  state?: IslandState,
  dockPositionOverride?: DockPosition,
  offsetXOverride?: number,
  offsetYOverride?: number
) {
  try {
    const s = useIslandStore.getState();
    const settings = useSettingsStore.getState();
    const currentState = state ?? s.islandState;
    const dock = dockPositionOverride ?? settings.dock_position;
    const ox = offsetXOverride ?? settings.island_x_offset;
    const oy = offsetYOverride ?? settings.island_y_offset;
    const isVertical = dock === "LEFT" || dock === "RIGHT";
    const dimTable = isVertical ? STATE_DIMENSIONS_VERTICAL : STATE_DIMENSIONS;

    let dim: { width: number; height: number };

    if (!s.isVisible) {
      dim = isVertical ? { width: 16, height: 70 } : { width: 70, height: 16 };
    } else {
      dim = dimTable[currentState] || (isVertical ? { width: 60, height: 360 } : { width: 360, height: 60 });
    }

    if (dim.width === lastSyncedDimensions.width && dim.height === lastSyncedDimensions.height) {
      return;
    }

    if (shrinkTimer) {
      clearTimeout(shrinkTimer);
      shrinkTimer = null;
    }

    const isShrinking =
      (lastSyncedDimensions.width > 0 && dim.width < lastSyncedDimensions.width) ||
      (lastSyncedDimensions.height > 0 && dim.height < lastSyncedDimensions.height);

    const callIpc = async (w: number, h: number) => {
      try {
        await invoke("resize_island_canvas", {
          width: w,
          height: h,
          dockPosition: dock,
          offsetX: ox,
          offsetY: oy,
        });
      } catch {
        // ignore
      }
    };

    if (isShrinking) {
      // Khi thu nhỏ: Chờ 220ms để animation mượt mà của React/Framer Motion hoàn tất, tránh bị cửa sổ hệ điều hành cắt cụt
      shrinkTimer = setTimeout(async () => {
        lastSyncedDimensions = dim;
        await callIpc(dim.width, dim.height);
      }, 220);
    } else {
      // Khi mở rộng: Resize ngay lập tức để container có đủ không gian hiển thị animation
      lastSyncedDimensions = dim;
      await callIpc(dim.width, dim.height);
    }
  } catch (err) {
    console.debug("[IslandStore] Window resize IPC not available:", err);
  }
}

export const useIslandStore = create<IslandStoreState>((set, get) => ({
  islandState: "COMPACT",
  activeEvent: null,

  volume: {
    volume: 100,
    muted: false,
  },

  battery: {
    percentage: 100,
    charging: false,
    pluggedIn: true,
  },

  media: {
    title: "",
    artist: "",
    album: "",
    artwork: null,
    isPlaying: false,
    position: 0,
    duration: 0,
  },

  network: {
    connected: true,
    isWifi: true,
    uploadSpeed: 0,
    downloadSpeed: 0,
  },

  system: {
    cpuUsage: 0,
    ramUsage: 0,
    ramUsedMb: 0,
    ramTotalMb: 16384,
    diskUsage: 0,
  },

  spectrum: [0, 0, 0, 0],

  isVisible: true,

  setIsVisible: (visible) => {
    set({ isVisible: visible });
    syncWindowCanvas();
  },

  toggleVisibility: () => {
    const next = !get().isVisible;
    set({ isVisible: next });
    syncWindowCanvas();
  },

  setIslandState: (state) => {
    syncWindowCanvas(state);
    set({ islandState: state });
  },

  setActiveEvent: (event) => {
    const currentState = get().islandState;
    const isModalOpen =
      currentState === "CONTROL_CENTER" ||
      currentState === "SETTINGS" ||
      currentState === "COMMAND_BAR" ||
      currentState === "CLIPBOARD_HISTORY" ||
      currentState === "QUICK_SHELF" ||
      currentState === "SCRATCHPAD";

    if (event) {
      if (!isModalOpen) {
        syncWindowCanvas("EXPANDED");
        set({ activeEvent: event, islandState: "EXPANDED" });
      } else {
        set({ activeEvent: event });
      }
    } else {
      if (!isModalOpen) {
        syncWindowCanvas("COMPACT");
        set({ activeEvent: null, islandState: "COMPACT" });
      } else {
        set({ activeEvent: null });
      }
    }
  },

  updateVolume: (volume, muted) => {
    set({ volume: { volume, muted } });
  },

  updateBattery: (percentage, charging, pluggedIn) => {
    set({ battery: { percentage, charging, pluggedIn } });
  },

  updateMedia: (mediaUpdate) => {
    set((s) => ({ media: { ...s.media, ...mediaUpdate } }));
  },

  updateNetwork: (netUpdate) => {
    set((s) => ({ network: { ...s.network, ...netUpdate } }));
  },

  updateSystem: (sysUpdate) => {
    set((s) => ({ system: { ...s.system, ...sysUpdate } }));
  },

  updateSpectrum: (bands) => {
    set({ spectrum: bands });
  },

  collapse: () => {
    syncWindowCanvas("COMPACT");
    set({ islandState: "COMPACT", activeEvent: null });
  },
}));
