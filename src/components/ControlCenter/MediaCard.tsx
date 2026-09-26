import React from "react";
import { Play, Pause, SkipBack, SkipForward, Music } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useIslandStore } from "../../stores/islandStore";
import styles from "./controlCenter.module.css";

export const MediaCard: React.FC = () => {
  const { media } = useIslandStore();

  const handleToggle = () => {
    invoke("media_toggle_play_pause").catch(console.error);
  };

  const handlePrev = () => {
    invoke("media_previous").catch(console.error);
  };

  const handleNext = () => {
    invoke("media_next").catch(console.error);
  };

  if (!media.title && !media.isPlaying) {
    return (
      <div className={styles.mediaCard} style={{ opacity: 0.7 }}>
        <div className={styles.mediaMain}>
          <div className={styles.mediaArt}>
            <Music size={18} color="var(--text-muted)" />
          </div>
          <div className={styles.mediaInfo}>
            <span className={styles.mediaTitle}>Không có phiên phát nhạc</span>
            <span className={styles.mediaArtist}>Mở nhạc trên Windows để điều khiển tại đây</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mediaCard}>
      <div className={styles.mediaMain}>
        <div className={styles.mediaArt}>
          {media.artwork ? (
            <img src={media.artwork} alt="Ảnh bìa" />
          ) : (
            <Music size={18} color="var(--text-muted)" />
          )}
        </div>
        <div className={styles.mediaInfo}>
          <span className={styles.mediaTitle} title={media.title}>
            {media.title || "Không rõ bài hát"}
          </span>
          <span className={styles.mediaArtist} title={media.artist}>
            {media.artist || "Nghệ sĩ không xác định"}
          </span>
        </div>
      </div>

      <div className={styles.mediaActions}>
        <button
          className={styles.actionBtn}
          onClick={handlePrev}
          title="Bài trước"
        >
          <SkipBack size={14} />
        </button>
        <button
          className={styles.actionBtn}
          onClick={handleToggle}
          title={media.isPlaying ? "Tạm dừng" : "Phát tiếp"}
          style={{ width: 34, height: 34 }}
        >
          {media.isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          className={styles.actionBtn}
          onClick={handleNext}
          title="Bài tiếp theo"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  );
};
