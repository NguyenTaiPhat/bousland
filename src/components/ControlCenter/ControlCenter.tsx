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
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 380,
        damping: 28,
        mass: 0.6,
        staggerChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BousLandLogo size={18} glow={true} />
            <span className={styles.greetingText}>{getGreeting()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className={styles.clockText}>{timeStr}</span>
            <motion.button
              className={styles.closeButton}
              onClick={collapse}
              title="Đóng Trung tâm điều khiển (Esc)"
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={15} />
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
