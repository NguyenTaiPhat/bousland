import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Settings,
  ClipboardList,
  FolderArchive,
  CheckSquare,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useIslandStore } from "../../stores/islandStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { notifyUserVolumeAdjustment } from "../../core/nativeBridge";
import styles from "./controlCenter.module.css";

export const QuickControls: React.FC = () => {
  const { volume, updateVolume, setIslandState } = useIslandStore();
  const { enabled_modules } = useSettingsStore();

  const showVolume = enabled_modules.volume !== false;

  const [sliderVal, setSliderVal] = useState<number>(volume.volume);
  const isDraggingRef = useRef(false);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external volume updates when user is not actively dragging the slider
  useEffect(() => {
    if (!isDraggingRef.current) {
      setSliderVal(volume.volume);
    }
  }, [volume.volume]);

  // Always verify fresh volume on mount when ControlCenter opens
  useEffect(() => {
    invoke<{ volume: number; muted: boolean }>("get_volume")
      .then((status) => {
        if (status && typeof status.volume === "number") {
          updateVolume(status.volume, status.muted);
          setSliderVal(status.volume);
        }
      })
      .catch(() => {});
  }, []);

  const sendVolumeToBackend = (val: number) => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }
    throttleTimerRef.current = setTimeout(() => {
      invoke("set_volume", { volume: val }).catch(console.error);
    }, 20);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setSliderVal(newVol);
    notifyUserVolumeAdjustment();
    updateVolume(newVol, volume.muted);
    sendVolumeToBackend(newVol);
  };

  const handlePointerDown = () => {
    isDraggingRef.current = true;
    notifyUserVolumeAdjustment();
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    notifyUserVolumeAdjustment();
  };

  const handleMuteToggle = () => {
    notifyUserVolumeAdjustment();
    const nextMuted = !volume.muted;
    updateVolume(volume.volume, nextMuted);
    invoke("set_mute", { mute: nextMuted }).catch(console.error);
  };

  const currentVol = volume.muted ? 0 : sliderVal;
  const sliderGradient = `linear-gradient(to right, #38bdf8 0%, #a78bfa ${currentVol}%, rgba(255, 255, 255, 0.12) ${currentVol}%, rgba(255, 255, 255, 0.12) 100%)`;

  return (
    <div className={styles.quickControls}>
      {/* Volume slider */}
      {showVolume && (
        <div className={styles.volumeControlRow}>
          <button
            type="button"
            className={styles.volumeMuteBtn}
            onClick={handleMuteToggle}
            title={volume.muted ? "Bật tiếng" : "Tắt tiếng"}
          >
            {volume.muted ? (
              <VolumeX size={16} color="#ef4444" />
            ) : sliderVal < 40 ? (
              <Volume2 size={16} color="#38bdf8" />
            ) : (
              <Volume2 size={16} color="#a78bfa" />
            )}
          </button>

          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={currentVol}
              onChange={handleVolumeChange}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              className={styles.volumeSlider}
              style={{ background: sliderGradient }}
            />
          </div>

          <span className={styles.volumeValueText}>
            {volume.muted ? "Tắt" : `${sliderVal}%`}
          </span>
        </div>
      )}

      {/* Quick Action Tiles */}
      <div className={styles.quickTogglesGrid}>
        <button
          type="button"
          className={styles.actionTile}
          onClick={() => setIslandState("CLIPBOARD_HISTORY")}
          title="Lịch sử khay nhớ tạm (Ctrl+Shift+V)"
        >
          <div className={styles.actionTileIcon} style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8" }}>
            <ClipboardList size={16} />
          </div>
          <div className={styles.actionTileText}>
            <span className={styles.actionTileTitle}>Clipboard</span>
            <span className={styles.actionTileSub}>Khay nhớ tạm</span>
          </div>
        </button>

        <button
          type="button"
          className={styles.actionTile}
          onClick={() => setIslandState("QUICK_SHELF")}
          title="Trạm kéo thả và ghim tệp nhanh"
        >
          <div className={styles.actionTileIcon} style={{ background: "rgba(251, 191, 36, 0.12)", color: "#fbbf24" }}>
            <FolderArchive size={16} />
          </div>
          <div className={styles.actionTileText}>
            <span className={styles.actionTileTitle}>Quick Shelf</span>
            <span className={styles.actionTileSub}>Ghim tệp nhanh</span>
          </div>
        </button>

        <button
          type="button"
          className={styles.actionTile}
          onClick={() => setIslandState("SCRATCHPAD")}
          title="Ghi chú & Checklist việc cần làm"
        >
          <div className={styles.actionTileIcon} style={{ background: "rgba(52, 211, 153, 0.12)", color: "#34d399" }}>
            <CheckSquare size={16} />
          </div>
          <div className={styles.actionTileText}>
            <span className={styles.actionTileTitle}>Ghi chú</span>
            <span className={styles.actionTileSub}>Checklist việc</span>
          </div>
        </button>

        <button
          type="button"
          className={styles.actionTile}
          onClick={() => setIslandState("SETTINGS")}
          title="Cài đặt hệ thống"
        >
          <div className={styles.actionTileIcon} style={{ background: "rgba(167, 139, 250, 0.12)", color: "#a78bfa" }}>
            <Settings size={16} />
          </div>
          <div className={styles.actionTileText}>
            <span className={styles.actionTileTitle}>Cài đặt</span>
            <span className={styles.actionTileSub}>Tùy chỉnh máy</span>
          </div>
        </button>
      </div>
    </div>
  );
};
