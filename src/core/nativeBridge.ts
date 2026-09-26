import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { eventBus } from "./eventBus";
import { PriorityManager } from "./priorityManager";
import { useIslandStore } from "../stores/islandStore";
import { useClipboardStore } from "../stores/clipboardStore";
import { useSettingsStore, applyThemeToDOM } from "../stores/settingsStore";
import { extractDominantColor } from "../utils/colorExtractor";
import {
  VolumeChangedEvent,
  BatteryChangedEvent,
  MediaChangedEvent,
  SystemAlertEvent,
} from "./types";

export const priorityManager = new PriorityManager(
  (event) => {
    useIslandStore.getState().setActiveEvent(event);
  },
  () => {
    const current = useIslandStore.getState().islandState;
    if (current === "EXPANDED") {
      useIslandStore.getState().collapse();
    }
  }
);

let unlisteners: UnlistenFn[] = [];
let lastChargingState: boolean | null = null;
let lastPluggedInState: boolean | null = null;
let lastSystemAlertTime = 0;
let lastUserVolumeAdjustTime = 0;

export function notifyUserVolumeAdjustment() {
  lastUserVolumeAdjustTime = Date.now();
}

export async function setupNativeBridge(): Promise<() => void> {
  try {
    // 0. Proactively sync current Windows volume on startup
    invoke<{ volume: number; muted: boolean }>("get_volume")
      .then((status) => {
        if (status && typeof status.volume === "number") {
          useIslandStore.getState().updateVolume(status.volume, status.muted);
        }
      })
      .catch((err) => {
        console.warn("[NativeBridge] Failed to fetch initial volume:", err);
      });

    // 1. Listen to real Windows Volume changes
    const unlistenVol = await listen<{ volume: number; muted: boolean }>(
      "bous://volume-change",
      (event) => {
        const { volume, muted } = event.payload;
        useIslandStore.getState().updateVolume(volume, muted);

        const isInternalAdjustment = Date.now() - lastUserVolumeAdjustTime < 1200;
        const currentIslandState = useIslandStore.getState().islandState;
        const isModalOpen =
          currentIslandState !== "COMPACT" && currentIslandState !== "EXPANDED";

        const settings = useSettingsStore.getState();
        if (
          settings.enabled_modules?.volume !== false &&
          !isInternalAdjustment &&
          !isModalOpen
        ) {
          useIslandStore.getState().setIsVisible(true);
          const bousEvent: VolumeChangedEvent = {
            id: `vol-${Date.now()}`,
            timestamp: Date.now(),
            type: "VOLUME_CHANGED",
            priority: "HIGH",
            volume,
            muted,
          };

          eventBus.publish(bousEvent);
          priorityManager.processEvent(bousEvent);
        }
      }
    );
    unlisteners.push(unlistenVol);

    // 2. Listen to real Windows Battery changes
    const unlistenBat = await listen<{
      percentage: number;
      charging: boolean;
      plugged_in: boolean;
      has_battery: boolean;
      is_critical: boolean;
    }>("bous://battery-change", (event) => {
      const { percentage, charging, plugged_in, is_critical } = event.payload;
      useIslandStore.getState().updateBattery(percentage, charging, plugged_in);

      const isChargingTransition =
        lastChargingState !== null && lastChargingState !== charging;
      const isPluggedTransition =
        lastPluggedInState !== null && lastPluggedInState !== plugged_in;

      lastChargingState = charging;
      lastPluggedInState = plugged_in;

      const settings = useSettingsStore.getState();
      // Trigger notification when: charger plugged/unplugged OR battery critical/low
      if (
        settings.enabled_modules?.battery !== false &&
        (isChargingTransition || isPluggedTransition || (percentage <= 20 && !charging))
      ) {
        useIslandStore.getState().setIsVisible(true);
        const bousEvent: BatteryChangedEvent = {
          id: `bat-${Date.now()}`,
          timestamp: Date.now(),
          type: "BATTERY_CHANGED",
          priority: is_critical ? "CRITICAL" : "HIGH",
          percentage,
          charging,
          pluggedIn: plugged_in,
        };
        eventBus.publish(bousEvent);
        priorityManager.processEvent(bousEvent);
      }
    });
    unlisteners.push(unlistenBat);

    // 3. Listen to real Windows System Metrics
    const unlistenMetrics = await listen<{
      cpu_usage: number;
      ram_usage: number;
      ram_used_mb: number;
      ram_total_mb: number;
      disk_usage: number;
    }>("bous://system-metrics", (event) => {
      const { cpu_usage, ram_usage, ram_used_mb, ram_total_mb, disk_usage } =
        event.payload;
      const roundedCpu = Math.round(cpu_usage);
      const roundedRam = Math.round(ram_usage);

      useIslandStore.getState().updateSystem({
        cpuUsage: roundedCpu,
        ramUsage: roundedRam,
        ramUsedMb: ram_used_mb,
        ramTotalMb: ram_total_mb,
        diskUsage: Math.round(disk_usage),
      });

      // System resource warning (CPU >= 90% or RAM >= 90%), throttled to once every 45s
      const settings = useSettingsStore.getState();
      const allowSystemAlert = settings.enabled_modules?.system_alert !== false;
      const now = Date.now();
      if (allowSystemAlert && (roundedCpu >= 90 || roundedRam >= 90) && now - lastSystemAlertTime > 45000) {
        lastSystemAlertTime = now;
        useIslandStore.getState().setIsVisible(true);
        const alertType = roundedCpu >= 90 ? "cpu" : "ram";
        const val = alertType === "cpu" ? roundedCpu : roundedRam;

        const bousEvent: SystemAlertEvent = {
          id: `sys-alert-${now}`,
          timestamp: now,
          type: "SYSTEM_ALERT",
          priority: "HIGH",
          metricType: alertType,
          value: val,
          title: alertType === "cpu" ? `Tải CPU cao (${val}%)` : `RAM sắp đầy (${val}%)`,
          message:
            alertType === "cpu"
              ? "Hệ thống đang hoạt động với cường độ cao"
              : `Đã dùng ${Math.round(ram_used_mb / 1024)}GB / ${Math.round(ram_total_mb / 1024)}GB`,
        };

        eventBus.publish(bousEvent);
        priorityManager.processEvent(bousEvent);
      }
    });
    unlisteners.push(unlistenMetrics);

    // 4. Listen to real Windows Network stats
    const unlistenNet = await listen<{
      connected: boolean;
      is_wifi: boolean;
      upload_speed: number;
      download_speed: number;
    }>("bous://network-change", (event) => {
      const { connected, is_wifi, upload_speed, download_speed } = event.payload;
      useIslandStore.getState().updateNetwork({
        connected,
        isWifi: is_wifi,
        uploadSpeed: upload_speed,
        downloadSpeed: download_speed,
      });
    });
    unlisteners.push(unlistenNet);

    // 5. Listen to real Windows Media Session changes (SMTC)
    const unlistenMedia = await listen<{
      has_media: boolean;
      title: string;
      artist: string;
      album: string;
      artwork: string | null;
      is_playing: boolean;
      position: number;
      duration: number;
    }>("bous://media-change", (event) => {
      const {
        has_media,
        title,
        artist,
        album,
        artwork,
        is_playing,
        position,
        duration,
      } = event.payload;

      useIslandStore.getState().updateMedia({
        title,
        artist,
        album,
        artwork,
        isPlaying: is_playing,
        position,
        duration,
      });

      // Dynamic Album Art Tinting: extract and apply dominant color from artwork
      const settings = useSettingsStore.getState();
      if (settings.dynamic_album_tint) {
        if (is_playing && artwork) {
          extractDominantColor(artwork).then((vibrantColor) => {
            if (vibrantColor && useIslandStore.getState().media.isPlaying) {
              applyThemeToDOM(settings.theme, vibrantColor);
            }
          });
        } else if (!is_playing) {
          // Revert to user's configured accent color
          const baseAccent = settings.accent_color === "system" ? settings.system_accent : settings.accent_color;
          applyThemeToDOM(settings.theme, baseAccent);
        }
      }

      if (has_media && title && settings.enabled_modules?.media !== false) {
        useIslandStore.getState().setIsVisible(true);
        const bousEvent: MediaChangedEvent = {
          id: `media-${Date.now()}`,
          timestamp: Date.now(),
          type: "MEDIA_CHANGED",
          priority: "NORMAL",
          title,
          artist,
          album,
          artwork,
          isPlaying: is_playing,
          position,
          duration,
        };

        eventBus.publish(bousEvent);
        priorityManager.processEvent(bousEvent);
      }
    });
    unlisteners.push(unlistenMedia);

    // 6. Listen to Fullscreen / Gaming state
    const unlistenFullscreen = await listen<boolean>(
      "bous://fullscreen-state",
      (event) => {
        if (event.payload) {
          useIslandStore.getState().setIsVisible(false);
          useIslandStore.getState().collapse();
        } else {
          useIslandStore.getState().setIsVisible(true);
        }
      }
    );
    unlisteners.push(unlistenFullscreen);

    // 7. Listen to global shortcut for Command Bar
    const unlistenCmdBar = await listen("bous://open-command-bar", () => {
      useIslandStore.getState().setIsVisible(true);
      const current = useIslandStore.getState().islandState;
      if (current === "COMMAND_BAR") {
        useIslandStore.getState().collapse();
      } else {
        useIslandStore.getState().setIslandState("COMMAND_BAR");
      }
    });
    unlisteners.push(unlistenCmdBar);

    // 8. Listen to Screenshot capture events
    const unlistenScreenshot = await listen<{
      file_path: string;
      filename: string;
    }>("bous://screenshot-captured", (event) => {
      const settings = useSettingsStore.getState();
      if (settings.enabled_modules?.screenshot !== false) {
        useIslandStore.getState().setIsVisible(true);
        const bousEvent = {
          id: `shot-${Date.now()}`,
          timestamp: Date.now(),
          type: "SCREENSHOT_CAPTURED" as const,
          priority: "HIGH" as const,
          filePath: event.payload.file_path,
        };
        eventBus.publish(bousEvent);
        priorityManager.processEvent(bousEvent);
      }
    });
    unlisteners.push(unlistenScreenshot);

    // 9. Listen to Clipboard notices and history updates
    const unlistenClipboard = await listen<{ has_content: boolean }>(
      "bous://clipboard-notice",
      () => {
        const settings = useSettingsStore.getState();
        if (settings.enabled_modules?.clipboard !== false) {
          useIslandStore.getState().setIsVisible(true);
          const bousEvent = {
            id: `clip-${Date.now()}`,
            timestamp: Date.now(),
            type: "CLIPBOARD_CHANGED" as const,
            priority: "NORMAL" as const,
            hasContent: true,
          };
          eventBus.publish(bousEvent);
          priorityManager.processEvent(bousEvent);
        }
      }
    );
    unlisteners.push(unlistenClipboard);

    const unlistenClipHistory = await listen<any[]>(
      "bous://clipboard-history-update",
      (event) => {
        useClipboardStore.getState().setItems(event.payload);
      }
    );
    unlisteners.push(unlistenClipHistory);

    // Initial fetch of clipboard history
    useClipboardStore.getState().loadHistory();

    const unlistenOpenClipboard = await listen("bous://open-clipboard", () => {
      useIslandStore.getState().setIsVisible(true);
      const current = useIslandStore.getState().islandState;
      if (current === "CLIPBOARD_HISTORY") {
        useIslandStore.getState().collapse();
      } else {
        useIslandStore.getState().setIslandState("CLIPBOARD_HISTORY");
      }
    });
    unlisteners.push(unlistenOpenClipboard);

    // 10. Listen to tray menu actions & toggle visibility
    const unlistenToggleVis = await listen("bous://toggle-visibility", () => {
      useIslandStore.getState().toggleVisibility();
    });
    unlisteners.push(unlistenToggleVis);

    const unlistenTrayCC = await listen("bous://open-control-center", () => {
      useIslandStore.getState().setIsVisible(true);
      useIslandStore.getState().setIslandState("CONTROL_CENTER");
    });
    unlisteners.push(unlistenTrayCC);

    const unlistenTraySettings = await listen("bous://open-settings", () => {
      useIslandStore.getState().setIsVisible(true);
      useIslandStore.getState().setIslandState("SETTINGS");
    });
    unlisteners.push(unlistenTraySettings);

    const unlistenAutostart = await listen<boolean>("bous://autostart-changed", (event) => {
      useSettingsStore.setState({ start_with_windows: event.payload });
    });
    unlisteners.push(unlistenAutostart);

    const unlistenShowIsland = await listen("bous://show-island", () => {
      useIslandStore.getState().setIsVisible(true);
    });
    unlisteners.push(unlistenShowIsland);

    // 11. Listen to real-time Audio Visualizer spectrum
    const unlistenAudioSpectrum = await listen<{ bands: [number, number, number, number] }>(
      "bous://audio-spectrum",
      (event) => {
        if (event.payload?.bands) {
          useIslandStore.getState().updateSpectrum(event.payload.bands);
        }
      }
    );
    unlisteners.push(unlistenAudioSpectrum);
  } catch (err) {
    console.debug("[NativeBridge] Not in Tauri environment or error:", err);
  }

  return () => {
    unlisteners.forEach((fn) => fn());
    unlisteners = [];
  };
}
