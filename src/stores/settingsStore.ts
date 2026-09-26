import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface BousSettingsState {
  theme: string;
  accent_color: string;
  system_accent: string;
  custom_colors: string[];
  dynamic_album_tint: boolean;
  start_with_windows: boolean;
  hover_to_expand: boolean;
  auto_collapse: boolean;
  collapse_delay: number;
  animation_speed: number;
  fullscreen_hide: boolean;
  gaming_mode: boolean;
  enabled_modules: Record<string, boolean>;
  island_name: string;
  name_display_mode: "default" | "device" | "custom";
  device_name: string;

  loadSettings: () => Promise<void>;
  updateSettings: (
    partial: Partial<
      Omit<
        BousSettingsState,
        "loadSettings" | "updateSettings" | "toggleModule" | "setTheme" | "setAccentColor" | "addCustomColor" | "removeCustomColor" | "setIslandName" | "setNameDisplayMode"
      >
    >
  ) => Promise<void>;
  toggleModule: (moduleId: string) => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
  setAccentColor: (color: string) => Promise<void>;
  addCustomColor: (color: string) => Promise<void>;
  removeCustomColor: (color: string) => Promise<void>;
  setIslandName: (name: string) => Promise<void>;
  setNameDisplayMode: (mode: "default" | "device" | "custom") => Promise<void>;
}

export function applyThemeToDOM(theme: string, accentHex?: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  if (accentHex && accentHex !== "system") {
    document.documentElement.style.setProperty("--accent", accentHex);
    document.documentElement.style.setProperty("--accent-hover", accentHex);
    document.documentElement.style.setProperty(
      "--accent-subtle",
      `color-mix(in srgb, ${accentHex} 16%, transparent)`
    );
    document.documentElement.style.setProperty(
      "--accent-border",
      `color-mix(in srgb, ${accentHex} 42%, transparent)`
    );
    document.documentElement.style.setProperty(
      "--accent-glow",
      `color-mix(in srgb, ${accentHex} 25%, transparent)`
    );
  }
}

export const useSettingsStore = create<BousSettingsState>((set, get) => ({
  theme: "dark",
  accent_color: "system",
  system_accent: "#0078d4",
  custom_colors: ["#6366f1", "#ec4899", "#14b8a6"],
  dynamic_album_tint: true,
  start_with_windows: true,
  hover_to_expand: true,
  auto_collapse: true,
  collapse_delay: 2.0,
  animation_speed: 1.0,
  fullscreen_hide: true,
  gaming_mode: true,
  enabled_modules: {
    volume: true,
    media: true,
    battery: true,
    system: true,
    system_alert: true,
    network: true,
    clipboard: false,
    screenshot: true,
  },
  island_name: "BousLand",
  name_display_mode: "default",
  device_name: "BousLand",

  loadSettings: async () => {
    try {
      let sysAccent = "#0078d4";
      let devName = "BousLand";
      try {
        const queryColor = await invoke<string>("get_system_accent_color");
        if (queryColor) sysAccent = queryColor;
      } catch (e) {
        console.debug("[SettingsStore] Failed to query system accent:", e);
      }

      try {
        const queryDevice = await invoke<string>("get_device_name");
        if (queryDevice) devName = queryDevice;
      } catch (e) {
        console.debug("[SettingsStore] Failed to query device name:", e);
      }

      const data = await invoke<any>("load_settings");
      if (data) {
        const currentTheme = data.theme ?? "dark";
        const currentAccent = data.accent_color ?? "system";
        const resolvedHex = currentAccent === "system" ? sysAccent : currentAccent;
        applyThemeToDOM(currentTheme, resolvedHex);

        set({
          theme: currentTheme,
          accent_color: currentAccent,
          system_accent: sysAccent,
          custom_colors: data.custom_colors ?? ["#6366f1", "#ec4899", "#14b8a6"],
          dynamic_album_tint: data.dynamic_album_tint ?? true,
          start_with_windows: data.start_with_windows ?? true,
          hover_to_expand: data.hover_to_expand ?? true,
          auto_collapse: data.auto_collapse ?? true,
          collapse_delay: data.collapse_delay ?? 2.0,
          animation_speed: data.animation_speed ?? 1.0,
          fullscreen_hide: data.fullscreen_hide ?? true,
          gaming_mode: data.gaming_mode ?? true,
          island_name: data.island_name ?? "BousLand",
          name_display_mode: data.name_display_mode ?? "default",
          device_name: devName,
          enabled_modules: {
            volume: true,
            media: true,
            battery: true,
            system: true,
            system_alert: true,
            network: true,
            clipboard: false,
            screenshot: true,
            ...(data.enabled_modules || {}),
          },
        });
      } else {
        applyThemeToDOM("dark", sysAccent);
        set({ system_accent: sysAccent, device_name: devName });
      }
    } catch (err) {
      console.debug("[SettingsStore] Failed to load settings from Tauri:", err);
    }
  },

  updateSettings: async (partial) => {
    const currentSystemAccent = get().system_accent;
    let resolvedHex = currentSystemAccent;

    const nextAccent = partial.accent_color ?? get().accent_color;
    if (nextAccent === "system") {
      resolvedHex = currentSystemAccent;
    } else {
      resolvedHex = nextAccent;
    }

    const nextTheme = partial.theme ?? get().theme;
    applyThemeToDOM(nextTheme, resolvedHex);

    set(partial);
    const state = get();
    try {
      await invoke("save_settings", {
        settings: {
          theme: state.theme,
          accent_color: state.accent_color,
          custom_colors: state.custom_colors,
          dynamic_album_tint: state.dynamic_album_tint,
          start_with_windows: state.start_with_windows,
          hover_to_expand: state.hover_to_expand,
          auto_collapse: state.auto_collapse,
          collapse_delay: state.collapse_delay,
          animation_speed: state.animation_speed,
          fullscreen_hide: state.fullscreen_hide,
          gaming_mode: state.gaming_mode,
          enabled_modules: state.enabled_modules,
          island_name: state.island_name,
          name_display_mode: state.name_display_mode,
        },
      });
    } catch (err) {
      console.debug("[SettingsStore] Failed to save settings to Tauri:", err);
    }
  },

  toggleModule: async (moduleId) => {
    const modules = { ...get().enabled_modules };
    modules[moduleId] = !modules[moduleId];
    await get().updateSettings({ enabled_modules: modules });
  },

  setTheme: async (theme: string) => {
    await get().updateSettings({ theme });
  },

  setAccentColor: async (accent_color: string) => {
    await get().updateSettings({ accent_color });
  },

  addCustomColor: async (color: string) => {
    let hex = color.trim().toLowerCase();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
    const current = get().custom_colors;
    if (!current.includes(hex)) {
      const updated = [...current, hex];
      await get().updateSettings({ custom_colors: updated, accent_color: hex });
    } else {
      await get().setAccentColor(hex);
    }
  },

  removeCustomColor: async (color: string) => {
    const hex = color.toLowerCase();
    const updated = get().custom_colors.filter((c) => c.toLowerCase() !== hex);
    const patch: Partial<BousSettingsState> = { custom_colors: updated };
    if (get().accent_color.toLowerCase() === hex) {
      patch.accent_color = "system";
    }
    await get().updateSettings(patch);
  },

  setIslandName: async (name: string) => {
    await get().updateSettings({ island_name: name });
  },

  setNameDisplayMode: async (mode: "default" | "device" | "custom") => {
    await get().updateSettings({ name_display_mode: mode });
  },
}));
