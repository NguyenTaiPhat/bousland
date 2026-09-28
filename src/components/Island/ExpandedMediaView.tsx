import React from "react";
import { Play, Pause, SkipBack, SkipForward, Music } from "lucide-react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { MediaChangedEvent } from "../../core/types";
import { AudioVisualizer } from "./AudioVisualizer";
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
      {/* 1. High-res Album Art with Apple-grade Squircle */}
      <motion.div
        className={styles.mediaArtwork}
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        {event.artwork ? (
          <img src={event.artwork} alt={event.title || "Album Art"} />
        ) : (
          <div className={styles.mediaArtworkFallback}>
            <Music size={20} color="var(--text-secondary)" />
          </div>
        )}
      </motion.div>

      {/* 2. Track Title & Artist (Clean Typography & Ellipsis) */}
      <div className={styles.mediaInfoCol}>
        <div className={styles.mediaTrackTitle} title={event.title || "Không rõ bài hát"}>
          {event.title || "Không rõ bài hát"}
        </div>
        <div className={styles.mediaArtistName} title={event.artist || "Nghệ sĩ không xác định"}>
          {event.artist || "Nghệ sĩ không xác định"}
        </div>
      </div>

      {/* 3. Centered Apple-Style Media Controls */}
      <div className={styles.mediaControlsGroup}>
        <motion.button
          type="button"
          className={styles.mediaBtnSecondary}
          onClick={handlePrev}
          title="Bài trước"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
        >
          <SkipBack size={15} fill="currentColor" />
        </motion.button>

        <motion.button
          type="button"
          className={styles.mediaBtnPrimary}
          onClick={handleToggle}
          title={event.isPlaying ? "Tạm dừng" : "Phát tiếp"}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          {event.isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </motion.button>

        <motion.button
          type="button"
          className={styles.mediaBtnSecondary}
          onClick={handleNext}
          title="Bài tiếp theo"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
        >
          <SkipForward size={15} fill="currentColor" />
        </motion.button>
      </div>

      {/* 4. Apple Dynamic Island 4-Bar Audio Equalizer */}
      <div className={styles.mediaVisualizerCol}>
        <AudioVisualizer isPlaying={event.isPlaying} />
      </div>
    </div>
  );
};
