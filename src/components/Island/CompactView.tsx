import React from "react";
import { Battery, BatteryCharging, Cpu, Pin, Music, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIslandStore } from "../../stores/islandStore";
import { useScratchpadStore } from "../../stores/scratchpadStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUpdaterStore } from "../../stores/updaterStore";
import { BousLandLogo } from "../Common/BousLandLogo";
import { AudioVisualizer } from "./AudioVisualizer";
import styles from "./island.module.css";

export const CompactView: React.FC = () => {
  const { battery, media, system } = useIslandStore();
  const { island_name, name_display_mode, device_name } = useSettingsStore();
  const pinnedItem = useScratchpadStore((s) => s.getPinnedItem());
  const updater = useUpdaterStore();

  const displayName = (() => {
    if (name_display_mode === "device") {
      return device_name || "BousLand";
    }
    if (name_display_mode === "custom") {
      return island_name?.trim() || "BousLand";
    }
    return "BousLand";
  })();

  const brandKey = pinnedItem
    ? `pin-${pinnedItem.id}`
    : media.isPlaying && media.title
    ? `media-${media.title}`
    : `brand-${displayName}`;

  return (
    <div className={styles.compactView}>
      <div className={styles.compactBrand}>
        <BousLandLogo size={16} glow={true} />
        <AnimatePresence mode="popLayout" initial={false}>
          {pinnedItem ? (
            <motion.div
              key={brandKey}
              className={styles.pinnedBadge}
              title={`Ghi chú ghim: ${pinnedItem.text}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Pin size={10} color="#f59e0b" />
              <span>{pinnedItem.text}</span>
            </motion.div>
          ) : media.isPlaying && media.title ? (
            <motion.div
              key={brandKey}
              className={styles.compactMediaBadge}
              title={`Đang phát nền: ${media.title}${media.artist ? ` - ${media.artist}` : ""}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {media.artwork ? (
                <img src={media.artwork} className={styles.compactThumb} alt="" />
              ) : (
                <Music size={11} color="var(--accent)" />
              )}
              <span className={styles.compactMediaTitle}>{media.title}</span>
            </motion.div>
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <motion.span
                key={brandKey}
                className={styles.brandText}
                title={`BousLand (${displayName})`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {displayName}
              </motion.span>
              {updater.status === "update-available" && (
                <button
                  type="button"
                  className={styles.updatePill}
                  onClick={(e) => {
                    e.stopPropagation();
                    useIslandStore.getState().setIslandState("SETTINGS");
                  }}
                  title={`Đã có BousLand v${updater.updateInfo?.latest_version}! Nhấp để cập nhật.`}
                >
                  <Download size={10} />
                  <span>v{updater.updateInfo?.latest_version}</span>
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.compactIndicators}>
        <AnimatePresence>
          {media.isPlaying && (
            <motion.div
              key="equalizer"
              className={styles.compactItem}
              title={`Đang phát âm thanh: ${media.title || "Windows Core Audio"}`}
              initial={{ opacity: 0, width: 0, scale: 0.8 }}
              animate={{ opacity: 1, width: "auto", scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden", display: "flex", alignItems: "center" }}
            >
              <AudioVisualizer isPlaying={media.isPlaying} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.compactItem} title={`Tải CPU: ${system.cpuUsage}%`}>
          <Cpu size={12} />
          <span>{system.cpuUsage}%</span>
        </div>

        <div
          className={styles.compactItem}
          title={`Pin: ${battery.percentage}% ${battery.charging ? "(Đang sạc)" : "(Dùng pin)"}`}
        >
          {battery.charging ? (
            <BatteryCharging size={13} color="var(--status-success)" />
          ) : (
            <Battery
              size={13}
              color={battery.percentage <= 20 ? "var(--status-critical)" : "inherit"}
            />
          )}
          <span>{battery.percentage}%</span>
        </div>
      </div>
    </div>
  );
};
