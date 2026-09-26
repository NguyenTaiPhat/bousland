import React, { useState } from "react";
import { Camera, ExternalLink, Copy, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ScreenshotEvent } from "../../core/types";
import styles from "./island.module.css";

interface Props {
  event: ScreenshotEvent;
}

export const ExpandedScreenshotView: React.FC<Props> = ({ event }) => {
  const [copied, setCopied] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("open_screenshot_file", { filePath: event.filePath }).catch(console.error);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    invoke("copy_screenshot_to_clipboard", { filePath: event.filePath })
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(console.error);
  };

  return (
    <div className={styles.expandedBattery}>
      <div className={styles.expandedLeft}>
        <Camera size={22} color="var(--accent)" />
        <div className={styles.batteryStatusText}>
          <span className={styles.batteryTitle}>Đã chụp màn hình</span>
          <span className={styles.batterySubtitle}>Lưu tại Pictures/Screenshots</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={handleOpen}
          className={styles.controlBtn}
          title="Mở ảnh chụp màn hình"
          style={{ width: "auto", padding: "6px 10px", borderRadius: 6, fontSize: 11, gap: 4 }}
        >
          <ExternalLink size={12} />
          <span>Mở ảnh</span>
        </button>

        <button
          onClick={handleCopy}
          className={styles.controlBtn}
          title="Sao chép ảnh vào khay nhớ tạm"
          style={{ width: "auto", padding: "6px 10px", borderRadius: 6, fontSize: 11, gap: 4 }}
        >
          {copied ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>
      </div>
    </div>
  );
};
