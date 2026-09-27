import React from "react";
import { BatteryCharging, BatteryWarning, AlertCircle } from "lucide-react";
import { BatteryChangedEvent } from "../../core/types";
import styles from "./island.module.css";

interface Props {
  event: BatteryChangedEvent;
}

export const ExpandedBatteryView: React.FC<Props> = ({ event }) => {
  const isCritical = event.percentage <= 10;

  return (
    <div className={styles.expandedNotification}>
      <div className={styles.notificationLeft}>
        <div
          className={styles.notificationIconBadge}
          style={{
            color: event.charging
              ? "var(--status-success)"
              : isCritical
              ? "var(--status-critical)"
              : "var(--status-warning)",
          }}
        >
          {event.charging ? (
            <BatteryCharging size={18} />
          ) : isCritical ? (
            <AlertCircle size={18} />
          ) : (
            <BatteryWarning size={18} />
          )}
        </div>
        <div className={styles.notificationTextCol}>
          <span className={styles.notificationTitle}>
            {event.charging
              ? "Đang sạc pin"
              : isCritical
              ? "Pin rất yếu! Cần cắm sạc"
              : event.percentage <= 20
              ? "Pin yếu"
              : "Đã ngắt sạc (Dùng pin)"}
          </span>
          <span className={styles.notificationSubtitle}>
            {event.percentage}% dung lượng
          </span>
        </div>
      </div>
    </div>
  );
};
