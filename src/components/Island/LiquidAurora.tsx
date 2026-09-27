import React, { useEffect, useRef } from "react";
import { rawAudioSpectrumBuffer, smoothSpectrum } from "../../core/audioSmoothing";
import styles from "./liquidAurora.module.css";

interface Props {
  isPlaying?: boolean;
  accentColor?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const LiquidAurora: React.FC<Props> = ({
  isPlaying = false,
  accentColor,
  className = "",
  width = 68,
  height = 14,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const smoothedRef = useRef(new Float32Array(4));
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const midY = height / 2;
    const maxAmplitude = height * 0.42;

    if (!isPlaying || prefersReduced) {
      if (pathRef.current) {
        pathRef.current.setAttribute("d", `M 0 ${midY} L ${width} ${midY}`);
      }
      return;
    }

    const renderFrame = () => {
      smoothSpectrum(smoothedRef.current, rawAudioSpectrumBuffer, 0.38, 0.12);
      const s = smoothedRef.current;

      const y0 = Math.max(1, Math.min(height - 1, midY - (s[0] - 0.2) * maxAmplitude));
      const y1 = Math.max(1, Math.min(height - 1, midY + (s[1] - 0.2) * maxAmplitude));
      const y2 = Math.max(1, Math.min(height - 1, midY - (s[2] - 0.2) * maxAmplitude));
      const y3 = Math.max(1, Math.min(height - 1, midY + (s[3] - 0.2) * maxAmplitude));

      const p0x = 0;
      const p1x = width * 0.25;
      const p2x = width * 0.5;
      const p3x = width * 0.75;
      const p4x = width;

      // Smooth cubic Bézier spline across the 4 frequency bands
      const d = `M ${p0x} ${midY} C ${p1x * 0.5} ${y0}, ${p1x * 0.8} ${y0}, ${p1x} ${midY} C ${p2x * 0.7} ${y1}, ${p2x * 0.9} ${y1}, ${p2x} ${midY} C ${p3x * 0.7} ${y2}, ${p3x * 0.9} ${y2}, ${p3x} ${midY} C ${width * 0.85} ${y3}, ${width * 0.95} ${y3}, ${p4x} ${midY}`;

      if (pathRef.current) {
        pathRef.current.setAttribute("d", d);
      }

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    rafIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isPlaying, width, height]);

  const midY = height / 2;
  const gradientId = "auroraGradient";

  return (
    <div
      className={`${styles.auroraWrapper} ${!isPlaying ? styles.paused : ""} ${className}`}
      title={isPlaying ? "Liquid Aurora Equalizer" : "Đã tạm dừng"}
    >
      <svg
        className={styles.auroraSvg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentColor || "#38bdf8"} />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor={accentColor || "#34d399"} />
          </linearGradient>
        </defs>
        <path
          ref={pathRef}
          className={styles.auroraPath}
          d={`M 0 ${midY} L ${width} ${midY}`}
          stroke={`url(#${gradientId})`}
        />
      </svg>
    </div>
  );
};
