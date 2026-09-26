import React from "react";
import { ClipboardCheck } from "lucide-react";
import { ClipboardEvent } from "../../core/types";
import styles from "./island.module.css";

interface Props {
  event: ClipboardEvent;
}

export const ExpandedClipboardView: React.FC<Props> = () => {
  return (
    <div className={styles.expandedBattery}>
      <div className={styles.expandedLeft}>
        <ClipboardCheck size={22} color="var(--accent)" />
        <div className={styles.batteryStatusText}>
          <span className={styles.batteryTitle}>Khay nhớ tạm</span>
          <span className={styles.batterySubtitle}>Đã sao chép nội dung vào khay nhớ tạm</span>
        </div>
      </div>
    </div>
  );
};
