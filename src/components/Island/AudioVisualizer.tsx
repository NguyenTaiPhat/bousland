import React, { useEffect, useRef } from "react";
import { rawAudioSpectrumBuffer, smoothSpectrum } from "../../core/audioSmoothing";
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
  const bar0Ref = useRef<HTMLDivElement>(null);
  const bar1Ref = useRef<HTMLDivElement>(null);
  const bar2Ref = useRef<HTMLDivElement>(null);
  const bar3Ref = useRef<HTMLDivElement>(null);

  const smoothedRef = useRef(new Float32Array(4));
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bars = [bar0Ref.current, bar1Ref.current, bar2Ref.current, bar3Ref.current];

    if (!isPlaying || prefersReduced) {
      for (const bar of bars) {
        if (bar) {
          bar.style.transform = "scaleY(0.2)";
        }
      }
      return;
    }

    const renderLoop = () => {
      smoothSpectrum(smoothedRef.current, rawAudioSpectrumBuffer, 0.45, 0.14);
      const s = smoothedRef.current;

      for (let i = 0; i < 4; i++) {
        const bar = bars[i];
        if (bar) {
          // Dynamic scale range: 0.18 to 1.0 based on real audio energy
          const val = Math.max(0.18, Math.min(1.0, s[i]));
          bar.style.transform = `scaleY(${val.toFixed(3)})`;
        }
      }

      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    rafIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div
      className={`${styles.visualizerContainer} ${!isPlaying ? styles.paused : ""} ${className}`}
      title={isPlaying ? "Đang phát âm thanh (WASAPI Real-time)" : "Đã tạm dừng"}
    >
      <div
        ref={bar0Ref}
        className={styles.visualizerBar}
        style={{ backgroundColor: accentColor || undefined }}
      />
      <div
        ref={bar1Ref}
        className={styles.visualizerBar}
        style={{ backgroundColor: accentColor || undefined }}
      />
      <div
        ref={bar2Ref}
        className={styles.visualizerBar}
        style={{ backgroundColor: accentColor || undefined }}
      />
      <div
        ref={bar3Ref}
        className={styles.visualizerBar}
        style={{ backgroundColor: accentColor || undefined }}
      />
    </div>
  );
};
