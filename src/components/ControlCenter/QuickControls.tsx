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

  return (
    <div className={styles.quickControls}>
      {/* Volume slider */}
      {showVolume && (
        <div className={styles.volumeControlRow}>
          <button
            className={styles.actionBtn}
            onClick={handleMuteToggle}
            title={volume.muted ? "Bật tiếng" : "Tắt tiếng"}
          >
            {volume.muted ? (
              <VolumeX size={16} color="var(--status-critical)" />
            ) : (
              <Volume2 size={16} />
            )}
          </button>

          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              value={volume.muted ? 0 : sliderVal}
              onChange={handleVolumeChange}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              className={styles.volumeSlider}
            />
          </div>

          <span className={styles.volumeValueText}>
            {volume.muted ? "Tắt" : `${sliderVal}%`}
          </span>
        </div>
      )}

      {/* Quick toggles */}
      <div className={styles.quickToggles}>
        <button
          className={styles.toggleBtn}
          onClick={() => setIslandState("CLIPBOARD_HISTORY")}
          title="Lịch sử khay nhớ tạm (Ctrl+Shift+V)"
        >
          <ClipboardList size={15} />
          <span>Clipboard</span>
        </button>

        <button
          className={styles.toggleBtn}
          onClick={() => setIslandState("QUICK_SHELF")}
          title="Trạm kéo thả tệp nhanh"
        >
          <FolderArchive size={15} />
          <span>Quick Shelf</span>
        </button>

        <button
          className={styles.toggleBtn}
          onClick={() => setIslandState("SCRATCHPAD")}
          title="Ghi chú & Checklist việc cần làm"
        >
          <CheckSquare size={15} />
          <span>Ghi chú</span>
        </button>

        <button
          className={styles.toggleBtn}
          onClick={() => setIslandState("SETTINGS")}
          title="Cài đặt hệ thống"
        >
          <Settings size={15} />
          <span>Cài đặt</span>
        </button>
      </div>
    </div>
  );
};
