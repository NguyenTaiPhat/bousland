import React from "react";
import { Cpu, HardDrive, Wifi, Battery, BatteryCharging } from "lucide-react";
import { useIslandStore } from "../../stores/islandStore";
import { useSettingsStore } from "../../stores/settingsStore";
import styles from "./controlCenter.module.css";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
}

export const SystemCard: React.FC = () => {
  const { system, network, battery } = useIslandStore();
  const { enabled_modules } = useSettingsStore();

  const showSystem = enabled_modules.system !== false;
  const showNetwork = enabled_modules.network !== false;
  const showBattery = enabled_modules.battery !== false;

  if (!showSystem && !showNetwork && !showBattery) {
    return null;
  }

  const columnsCount = (showSystem ? 2 : 0) + (showNetwork ? 1 : 0);
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: columnsCount > 0 ? `repeat(${columnsCount}, 1fr)` : "1fr",
  };

  return (
    <div className={styles.metricsGrid} style={gridStyle}>
      {/* CPU */}
      {showSystem && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>CPU</span>
            <Cpu size={14} />
          </div>
          <div className={styles.metricValue}>{system.cpuUsage}%</div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{ width: `${system.cpuUsage}%` }}
            />
          </div>
        </div>
      )}

      {/* RAM */}
      {showSystem && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>RAM</span>
            <HardDrive size={14} />
          </div>
          <div className={styles.metricValue}>{system.ramUsage}%</div>
          <div className={styles.metricSubtext}>
            {(system.ramUsedMb / 1024).toFixed(1)} / {(system.ramTotalMb / 1024).toFixed(1)} GB
          </div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{ width: `${system.ramUsage}%` }}
            />
          </div>
        </div>
      )}

      {/* Network */}
      {showNetwork && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>Mạng</span>
            <Wifi size={14} />
          </div>
          <div className={styles.metricValue} style={{ fontSize: 13 }}>
            ↓ {formatBytes(network.downloadSpeed)}
          </div>
          <div className={styles.metricSubtext}>
            ↑ {formatBytes(network.uploadSpeed)}
          </div>
        </div>
      )}

      {/* Battery */}
      {showBattery && (
        <div className={styles.metricCard} style={{ gridColumn: "1 / -1" }}>
          <div className={styles.metricHeader}>
            <span>Nguồn & Pin</span>
            {battery.charging ? (
              <BatteryCharging size={14} color="var(--status-success)" />
            ) : (
              <Battery size={14} />
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className={styles.metricValue}>{battery.percentage}%</div>
            <div className={styles.metricSubtext}>
              {battery.charging ? "Đang cắm sạc, đang nạp" : battery.pluggedIn ? "Đã cắm sạc, pin đầy" : "Đang dùng pin"}
            </div>
          </div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{
                width: `${battery.percentage}%`,
                backgroundColor: battery.percentage <= 20 ? "var(--status-critical)" : "var(--status-success)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
