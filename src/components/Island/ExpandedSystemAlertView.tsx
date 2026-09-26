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
    <div className={styles.expandedBattery}>
      <div className={styles.expandedLeft}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: "rgba(224, 93, 82, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isCpu ? (
            <Cpu size={20} color="var(--status-critical)" />
          ) : (
            <HardDrive size={20} color="var(--status-warning)" />
          )}
        </div>

        <div className={styles.batteryStatusText}>
          <span className={styles.batteryTitle}>{event.title}</span>
          <span className={styles.batterySubtitle}>{event.message}</span>
        </div>
      </div>
    </div>
  );
};
