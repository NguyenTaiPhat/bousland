import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string;
  notes: string;
  pub_date: string;
  download_url: string;
}

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "downloading"
  | "ready"
  | "error";

interface UpdaterState {
  status: UpdaterStatus;
  updateInfo: UpdateInfo | null;
  errorMessage: string | null;
  downloadProgress: number;

  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  resetStatus: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  status: "idle",
  updateInfo: null,
  errorMessage: null,
  downloadProgress: 0,

  checkForUpdates: async () => {
    set({ status: "checking", errorMessage: null });
    try {
      const res = await invoke<UpdateInfo>("check_for_updates");
      if (res.available) {
        set({
          status: "update-available",
          updateInfo: res,
          errorMessage: null,
        });
      } else {
        set({
          status: "up-to-date",
          updateInfo: res,
          errorMessage: null,
        });
      }
    } catch (err: any) {
      console.error("[Updater] Check for updates failed:", err);
      set({
        status: "error",
        errorMessage: err?.message || String(err) || "Không thể kiểm tra bản cập nhật lúc này.",
      });
    }
  },

  installUpdate: async () => {
    set({ status: "downloading", downloadProgress: 10, errorMessage: null });
    try {
      // Simulate/trigger download & install
      const msg = await invoke<string>("download_and_install_update");
      set({ status: "ready", downloadProgress: 100 });
      console.log("[Updater] Install triggered:", msg);
    } catch (err: any) {
      console.error("[Updater] Download & install failed:", err);
      set({
        status: "error",
        errorMessage: err?.message || String(err) || "Lỗi tải bản cập nhật.",
      });
    }
  },

  resetStatus: () => {
    set({ status: "idle", errorMessage: null });
  },
}));
