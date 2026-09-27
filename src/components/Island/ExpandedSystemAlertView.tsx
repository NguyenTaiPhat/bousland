import React from "react";
import { Cpu, HardDrive } from "lucide-react";
import { SystemAlertEvent } from "../../core/types";
import styles from "./island.module.css";

interface Props {
  event: SystemAlertEvent;
}

export const ExpandedSystemAlertView: React.FC<Props> = ({ event }) => {
  const isCpu = event.metricType === "cpu";

  return (
    <div className={styles.expandedNotification}>
      <div className={styles.notificationLeft}>
        <div
          className={styles.notificationIconBadge}
          style={{
            backgroundColor: isCpu ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: isCpu ? "var(--status-critical)" : "var(--status-warning)",
          }}
        >
          {isCpu ? (
            <Cpu size={16} />
          ) : (
            <HardDrive size={16} />
          )}
        </div>

        <div className={styles.notificationTextCol}>
          <span className={styles.notificationTitle}>{event.title}</span>
          <span className={styles.notificationSubtitle}>{event.message}</span>
        </div>
      </div>
    </div>
  );
};
