import React from "react";
import { ClipboardCheck } from "lucide-react";
import { ClipboardEvent } from "../../core/types";
import styles from "./island.module.css";

interface Props {
  event: ClipboardEvent;
}

export const ExpandedClipboardView: React.FC<Props> = () => {
  return (
    <div className={styles.expandedNotification}>
      <div className={styles.notificationLeft}>
        <div className={styles.notificationIconBadge} style={{ color: "#38bdf8" }}>
          <ClipboardCheck size={16} />
        </div>
        <div className={styles.notificationTextCol}>
          <span className={styles.notificationTitle}>Khay nhớ tạm</span>
          <span className={styles.notificationSubtitle}>Đã sao chép nội dung mới</span>
        </div>
      </div>
    </div>
  );
};
