import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useIslandStore } from "../../stores/islandStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getTransformOriginForDock } from "../../core/dockingHelper";
import { useIdleAutoHide } from "../../hooks/useIdleAutoHide";
import { BousLandLogo } from "../Common/BousLandLogo";
import { SystemCard } from "./SystemCard";
import { MediaCard } from "./MediaCard";
import { QuickControls } from "./QuickControls";
import styles from "./controlCenter.module.css";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function getDateString(): string {
  const now = new Date();
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = days[now.getDay()];
  return `${dayName}, ${now.getDate()} tháng ${now.getMonth() + 1}`;
}

export const ControlCenter: React.FC = () => {
  const { collapse } = useIslandStore();
  const { enabled_modules, dock_position } = useSettingsStore();
  const origin = getTransformOriginForDock(dock_position);
  const { handleMouseEnter, handleMouseLeave } = useIdleAutoHide();
  const [timeStr, setTimeStr] = useState("");

  const hasSystemModules =
    enabled_modules.system !== false ||
    enabled_modules.network !== false ||
    enabled_modules.battery !== false;
  const showMedia = enabled_modules.media !== false;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        collapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [collapse]);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 30,
        mass: 0.5,
        staggerChildren: 0.03,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: { duration: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 420, damping: 25 },
    },
  };

  return (
    <div className={styles.controlCenterWrapper}>
      <motion.div
        className={styles.controlCenterContainer}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ transformOrigin: origin }}
      >
        {/* Header */}
        <motion.div className={styles.headerRow} variants={itemVariants}>
          <div className={styles.headerLeftCol}>
            <div className={styles.greetingBadge}>
              <BousLandLogo size={16} glow={true} />
              <span className={styles.greetingText}>{getGreeting()}</span>
            </div>
            <span className={styles.dateSubtext}>{getDateString()}</span>
          </div>
          <div className={styles.headerRightCol}>
            <span className={styles.clockText}>{timeStr}</span>
            <motion.button
              className={styles.closeButton}
              onClick={collapse}
              title="Đóng Trung tâm điều khiển (Esc)"
              whileHover={{ scale: 1.12, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
            >
              <X size={14} />
            </motion.button>
          </div>
        </motion.div>

        {/* System metrics */}
        {hasSystemModules && (
          <motion.div variants={itemVariants}>
            <SystemCard />
          </motion.div>
        )}

        {/* Media session */}
        {showMedia && (
          <motion.div variants={itemVariants}>
            <MediaCard />
          </motion.div>
        )}

        {/* Quick controls */}
        <motion.div variants={itemVariants}>
          <QuickControls />
        </motion.div>
      </motion.div>
    </div>
  );
};
