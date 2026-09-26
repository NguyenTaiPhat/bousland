import React from "react";
import { useIslandStore } from "../../stores/islandStore";
import styles from "./audioVisualizer.module.css";

interface Props {
  isPlaying?: boolean;
  accentColor?: string;
  className?: string;
}

export const AudioVisualizer: React.FC<Props> = ({
  isPlaying = false,
  accentColor,
  className = "",
}) => {
  const spectrum = useIslandStore((state) => state.spectrum);

  return (
    <div
      className={`${styles.visualizerContainer} ${!isPlaying ? styles.paused : ""} ${className}`}
      title={isPlaying ? "Đang phát âm thanh" : "Đã tạm dừng"}
    >
      {spectrum.map((band, idx) => {
        // Minimum scale 0.15 (~2.1px height) keeps a crisp rounded dot even during pauses/breaks
        const scale = isPlaying ? Math.max(0.15, Math.min(1.0, band)) : 0.15;
        return (
          <div
            key={idx}
            className={styles.visualizerBar}
            style={{
              transform: `scaleY(${scale})`,
              backgroundColor: accentColor || undefined,
            }}
          />
        );
      })}
    </div>
  );
};
