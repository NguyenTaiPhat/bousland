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
      <div className={styles.mediaCardIdle}>
        <div className={styles.mediaMain}>
          <div className={styles.mediaArtIdle}>
            <Music size={16} color="#38bdf8" />
          </div>
          <div className={styles.mediaInfo}>
            <span className={styles.mediaTitleIdle}>Sẵn sàng phát nhạc</span>
            <span className={styles.mediaArtistIdle}>Mở Spotify, Youtube hoặc trình duyệt để điều khiển</span>
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
            <Music size={18} color="#a78bfa" />
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
          type="button"
          className={styles.actionBtn}
          onClick={handlePrev}
          title="Bài trước"
        >
          <SkipBack size={13} />
        </button>
        <button
          type="button"
          className={styles.playPauseBtn}
          onClick={handleToggle}
          title={media.isPlaying ? "Tạm dừng" : "Phát tiếp"}
        >
          {media.isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleNext}
          title="Bài tiếp theo"
        >
          <SkipForward size={13} />
        </button>
      </div>
    </div>
  );
};
