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
    <div className={styles.expandedNotification}>
      <div className={styles.notificationLeft}>
        <div className={styles.notificationIconBadge}>
          <Camera size={16} />
        </div>
        <div className={styles.notificationTextCol}>
          <span className={styles.notificationTitle}>Đã chụp màn hình</span>
          <span className={styles.notificationSubtitle} title={event.filePath}>
            Lưu tại Pictures/Screenshots
          </span>
        </div>
      </div>

      <div className={styles.notificationActions}>
        <button
          type="button"
          onClick={handleOpen}
          className={styles.notifBtnSecondary}
          title="Mở tệp ảnh đã chụp"
        >
          <ExternalLink size={12} />
          <span>Mở ảnh</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className={copied ? styles.notifBtnSuccess : styles.notifBtnPrimary}
          title="Sao chép ảnh vào khay nhớ tạm"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>
      </div>
    </div>
  );
};
