import React from "react";
import { Play, Pause, SkipBack, SkipForward, Music } from "lucide-react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { MediaChangedEvent } from "../../core/types";
import { LiquidAurora } from "./LiquidAurora";
import styles from "./island.module.css";

interface Props {
  event: MediaChangedEvent;
}

export const ExpandedMediaView: React.FC<Props> = ({ event }) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("media_toggle_play_pause").catch(console.error);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("media_previous").catch(console.error);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("media_next").catch(console.error);
  };

  return (
    <div className={styles.expandedMedia}>
      <motion.div
        className={styles.albumArt}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {event.artwork ? (
          <img src={event.artwork} alt="Album Art" />
        ) : (
          <Music size={22} color="var(--accent-muted)" />
        )}
      </motion.div>

      <div className={styles.mediaDetails}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div className={styles.songTitle} title={event.title}>
            {event.title || "Không rõ bài hát"}
          </div>
          {event.isPlaying && (
            <LiquidAurora isPlaying={event.isPlaying} width={54} height={12} className={styles.equalizerWave} />
          )}
        </div>

        <div className={styles.artistName} title={event.artist}>
          {event.artist || "Nghệ sĩ không xác định"}
        </div>

        <div className={styles.mediaControls}>
          <motion.button
            className={styles.controlBtn}
            onClick={handlePrev}
            title="Bài trước"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <SkipBack size={12} />
          </motion.button>
          <motion.button
            className={styles.controlBtn}
            onClick={handleToggle}
            title={event.isPlaying ? "Tạm dừng" : "Phát tiếp"}
            whileHover={{ scale: 1.18 }}
            whileTap={{ scale: 0.88 }}
          >
            {event.isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </motion.button>
          <motion.button
            className={styles.controlBtn}
            onClick={handleNext}
            title="Bài tiếp theo"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <SkipForward size={12} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
