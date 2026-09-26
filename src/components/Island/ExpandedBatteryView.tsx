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
    <div className={styles.expandedBattery}>
      <div className={styles.expandedLeft}>
        {event.charging ? (
          <BatteryCharging size={24} color="var(--status-success)" />
        ) : isCritical ? (
          <AlertCircle size={24} color="var(--status-critical)" />
        ) : (
          <BatteryWarning size={24} color="var(--status-warning)" />
        )}
        <div className={styles.batteryStatusText}>
          <span className={styles.batteryTitle}>
            {event.charging
              ? "Đang sạc pin"
              : isCritical
              ? "Pin rất yếu! Cần cắm sạc"
              : event.percentage <= 20
              ? "Pin yếu"
              : "Đã ngắt sạc (Dùng pin)"}
          </span>
          <span className={styles.batterySubtitle}>
            {event.percentage}% dung lượng
          </span>
        </div>
      </div>
    </div>
  );
};
