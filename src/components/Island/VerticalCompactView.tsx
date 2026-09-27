import React from "react";
import { Battery, BatteryCharging, Cpu, Pin, Music, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIslandStore } from "../../stores/islandStore";
import { useScratchpadStore } from "../../stores/scratchpadStore";
import { useUpdaterStore } from "../../stores/updaterStore";
import { BousLandLogo } from "../Common/BousLandLogo";
import { AudioVisualizer } from "./AudioVisualizer";
import styles from "./island.module.css";

export const VerticalCompactView: React.FC = () => {
  const { battery, media, system } = useIslandStore();
  const pinnedItem = useScratchpadStore((s) => s.getPinnedItem());
  const updater = useUpdaterStore();

  return (
    <div className={styles.verticalCompactView}>
      {/* 1. Top: Camera & BousLand Logo */}
      <div className={styles.verticalTop}>
        <BousLandLogo size={16} glow={true} />
      </div>

      {/* 2. Center: Pinned note / Media artwork / Visualizer */}
      <div className={styles.verticalCenter}>
        <AnimatePresence mode="popLayout" initial={false}>
          {pinnedItem ? (
            <motion.div
              key={`pin-${pinnedItem.id}`}
              className={styles.verticalBadge}
              title={`Ghi chú ghim: ${pinnedItem.text}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Pin size={14} color="#f59e0b" />
            </motion.div>
          ) : media.isPlaying && media.title ? (
            <motion.div
              key={`media-${media.title}`}
              className={styles.verticalMedia}
              title={`Đang phát: ${media.title}${media.artist ? ` - ${media.artist}` : ""}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {media.artwork ? (
                <img src={media.artwork} alt={media.title} className={styles.verticalArtwork} />
              ) : (
                <div className={styles.verticalMusicIcon}>
                  <Music size={14} color="var(--accent)" />
                </div>
              )}
              <div className={styles.verticalVisualizerWrapper}>
                <AudioVisualizer isPlaying={media.isPlaying} />
              </div>
            </motion.div>
          ) : updater.status === "downloading" ? (
            <motion.div
              key="download"
              className={styles.verticalBadge}
              title={`Đang tải bản cập nhật: ${Math.round(updater.downloadProgress)}%`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Download size={14} color="#38bdf8" />
            </motion.div>
          ) : (
            <motion.div
              key="cpu-status"
              className={styles.verticalCpu}
              title={`CPU: ${system.cpuUsage}%`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Cpu size={14} className={styles.metricIcon} />
              <span className={styles.verticalText}>{Math.round(system.cpuUsage)}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Bottom: Battery or RAM */}
      <div className={styles.verticalBottom} title={`Pin: ${battery.percentage}%`}>
        {battery.charging ? (
          <BatteryCharging size={14} color="var(--status-success)" />
        ) : (
          <Battery
            size={14}
            color={
              battery.percentage <= 20
                ? "var(--status-critical)"
                : "var(--text-secondary)"
            }
          />
        )}
        <span className={styles.verticalText}>{battery.percentage}%</span>
      </div>
    </div>
  );
};
