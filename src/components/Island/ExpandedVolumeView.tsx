import React from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";
import { motion } from "framer-motion";
import { VolumeChangedEvent } from "../../core/types";
import styles from "./island.module.css";

interface Props {
  event: VolumeChangedEvent;
}

export const ExpandedVolumeView: React.FC<Props> = ({ event }) => {
  const isMuted = event.muted || event.volume === 0;

  return (
    <div className={styles.expandedVolume}>
      <div className={styles.expandedRow}>
        <div className={styles.expandedLeft}>
          <motion.div
            key={isMuted ? "muted" : "active"}
            initial={{ scale: 0.7, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 20 }}
            style={{ display: "flex", alignItems: "center" }}
          >
            {isMuted ? (
              <VolumeX size={18} color="var(--status-critical)" />
            ) : event.volume < 40 ? (
              <Volume1 size={18} color="var(--accent)" />
            ) : (
              <Volume2 size={18} color="var(--accent)" />
            )}
          </motion.div>
          <span className={styles.volumeLabel}>Âm lượng</span>
        </div>
        <motion.span
          key={event.volume}
          initial={{ opacity: 0.6, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className={styles.volumeValue}
        >
          {isMuted ? "Đã tắt tiếng" : `${event.volume}%`}
        </motion.span>
      </div>

      <div className={styles.progressBarTrack}>
        <motion.div
          className={styles.progressBarFill}
          initial={false}
          animate={{ width: `${isMuted ? 0 : event.volume}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>
    </div>
  );
};
