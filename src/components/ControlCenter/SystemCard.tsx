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

  return (
    <div className={styles.metricsGrid}>
      {/* 1. CPU */}
      {showSystem && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>CPU</span>
            <div className={styles.metricIconWrap} style={{ color: "#38bdf8" }}>
              <Cpu size={14} />
            </div>
          </div>
          <div className={styles.metricValueRow}>
            <span className={styles.metricValue}>{system.cpuUsage}%</span>
            <span className={styles.metricStatusPill} style={{ color: system.cpuUsage > 80 ? "#ef4444" : "#94a3b8" }}>
              {system.cpuUsage > 80 ? "Tải cao" : "Ổn định"}
            </span>
          </div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{
                width: `${system.cpuUsage}%`,
                background: system.cpuUsage > 80
                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                  : "linear-gradient(90deg, #38bdf8, #818cf8)",
              }}
            />
          </div>
        </div>
      )}

      {/* 2. RAM */}
      {showSystem && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>RAM</span>
            <div className={styles.metricIconWrap} style={{ color: "#a78bfa" }}>
              <HardDrive size={14} />
            </div>
          </div>
          <div className={styles.metricValueRow}>
            <span className={styles.metricValue}>{system.ramUsage}%</span>
            <span className={styles.metricSubtext}>
              {(system.ramUsedMb / 1024).toFixed(1)} / {(system.ramTotalMb / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{
                width: `${system.ramUsage}%`,
                background: "linear-gradient(90deg, #a78bfa, #c084fc)",
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Network */}
      {showNetwork && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Mạng</span>
            <div className={styles.metricIconWrap} style={{ color: "#38bdf8" }}>
              <Wifi size={14} />
            </div>
          </div>
          <div className={styles.metricValueRow}>
            <span className={styles.metricValue} style={{ fontSize: 13.5 }}>
              ↓ {formatBytes(network.downloadSpeed)}
            </span>
            <span className={styles.metricSubtext}>
              ↑ {formatBytes(network.uploadSpeed)}
            </span>
          </div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{
                width: network.downloadSpeed > 0 ? "70%" : "15%",
                background: "linear-gradient(90deg, #38bdf8, #34d399)",
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Battery */}
      {showBattery && (
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Nguồn & Pin</span>
            <div
              className={styles.metricIconWrap}
              style={{
                color: battery.charging || battery.percentage > 20 ? "#34d399" : "#ef4444",
              }}
            >
              {battery.charging ? (
                <BatteryCharging size={14} />
              ) : (
                <Battery size={14} />
              )}
            </div>
          </div>
          <div className={styles.metricValueRow}>
            <span className={styles.metricValue}>{battery.percentage}%</span>
            <span
              className={styles.metricStatusPill}
              style={{
                color: battery.charging ? "#34d399" : battery.percentage <= 20 ? "#ef4444" : "#94a3b8",
              }}
            >
              {battery.charging ? "Đang sạc" : battery.pluggedIn ? "Pin đầy" : "Dùng pin"}
            </span>
          </div>
          <div className={styles.metricMiniBar}>
            <div
              className={styles.metricMiniBarFill}
              style={{
                width: `${battery.percentage}%`,
                background: battery.percentage <= 20
                  ? "linear-gradient(90deg, #ef4444, #f87171)"
                  : "linear-gradient(90deg, #34d399, #10b981)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
