import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderArchive } from "lucide-react";
import { useIslandStore } from "../../stores/islandStore";
import { useShelfStore } from "../../stores/shelfStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { CompactView } from "./CompactView";
import { VerticalCompactView } from "./VerticalCompactView";
import { ExpandedVolumeView } from "./ExpandedVolumeView";
import { ExpandedMediaView } from "./ExpandedMediaView";
import { ExpandedBatteryView } from "./ExpandedBatteryView";
import { ExpandedScreenshotView } from "./ExpandedScreenshotView";
import { ExpandedClipboardView } from "./ExpandedClipboardView";
import { ExpandedSystemAlertView } from "./ExpandedSystemAlertView";
import { useIdleAutoHide } from "../../hooks/useIdleAutoHide";
import styles from "./island.module.css";
import shelfStyles from "../Shelf/shelf.module.css";

export function getBorderRadiusForDock(dock: string): string {
  switch (dock) {
    case "TOP_LEFT":
      return "0px 22px 22px 22px";
    case "TOP_RIGHT":
      return "22px 0px 22px 22px";
    case "LEFT":
      return "0px 22px 22px 0px";
    case "RIGHT":
      return "22px 0px 0px 22px";
    default:
      return "22px 22px 22px 22px";
  }
}

export const Island: React.FC = () => {
  const { islandState, activeEvent, isVisible, media, setIslandState, collapse, toggleVisibility } =
    useIslandStore();
  const { dock_position } = useSettingsStore();
  const { handleMouseEnter, handleMouseLeave } = useIdleAutoHide();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const isExpanded = islandState === "EXPANDED" && activeEvent !== null;
  const isVertical = dock_position === "LEFT" || dock_position === "RIGHT";

  const targetWidth = isVertical
    ? (isDraggingOver ? 54 : isExpanded ? 88 : 44)
    : (isDraggingOver ? 340 : isExpanded ? 380 : (media.isPlaying && media.title) ? 330 : 280);

  const targetHeight = isVertical
    ? (isDraggingOver ? 340 : isExpanded ? 380 : (media.isPlaying && media.title) ? 330 : 280)
    : (isDraggingOver ? 54 : isExpanded ? 88 : 44);

  const reactiveBorderRadius = getBorderRadiusForDock(dock_position);

  const handleClick = () => {
    if (islandState === "COMPACT") {
      setIslandState("CONTROL_CENTER");
    } else if (islandState === "EXPANDED") {
      collapse();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleVisibility();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      useShelfStore.getState().addFiles(Array.from(e.dataTransfer.files));
      setIslandState("QUICK_SHELF");
    }
  };

  return (
    <div className={styles.islandWrapper}>
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key="island-main"
            className={styles.islandContainer}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            initial={{ y: -24, opacity: 0, scaleX: 0.65, scaleY: 0.25, filter: "blur(8px)" }}
            animate={{
              y: 0,
              opacity: 1,
              scaleX: 1,
              scaleY: 1,
              filter: "blur(0px)",
              scale: isDraggingOver ? 1.05 : 1,
              width: targetWidth,
              height: targetHeight,
              borderRadius: reactiveBorderRadius,
            }}
            exit={{
              y: -24,
              opacity: 0,
              scaleX: 0.65,
              scaleY: 0.25,
              filter: "blur(8px)",
              transition: {
                type: "spring",
                stiffness: 420,
                damping: 28,
                mass: 0.6,
              },
            }}
            whileHover={{
              scale: isDraggingOver ? 1.05 : 1.02,
            }}
            whileTap={{
              scale: 0.97,
            }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 28,
              mass: 0.55,
            }}
            title="BousLand - Nhấp để mở Trung tâm điều khiển, chuột phải để ẩn"
          >
            {isDraggingOver && (
              <div className={shelfStyles.dropZoneOverlay}>
                <div className={shelfStyles.dropZoneTitle}>
                  <FolderArchive size={14} />
                  <span>Smart Action Dropzone</span>
                </div>
                <span className={shelfStyles.dropZoneSub}>Thả để Nén ZIP • Mở Thư Mục • Tính SHA-256</span>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {!isExpanded ? (
                <motion.div
                  key={isVertical ? "vertical-compact" : "horizontal-compact"}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: "100%", height: "100%" }}
                >
                  {isVertical ? <VerticalCompactView /> : <CompactView />}
                </motion.div>
              ) : (
                <motion.div
                  key={activeEvent.type}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: "100%", height: "100%" }}
                >
                  {activeEvent.type === "VOLUME_CHANGED" && (
                    <ExpandedVolumeView event={activeEvent} />
                  )}
                  {activeEvent.type === "MEDIA_CHANGED" && (
                    <ExpandedMediaView event={activeEvent} />
                  )}
                  {activeEvent.type === "BATTERY_CHANGED" && (
                    <ExpandedBatteryView event={activeEvent} />
                  )}
                  {activeEvent.type === "SCREENSHOT_CAPTURED" && (
                    <ExpandedScreenshotView event={activeEvent} />
                  )}
                  {activeEvent.type === "CLIPBOARD_CHANGED" && (
                    <ExpandedClipboardView event={activeEvent} />
                  )}
                  {activeEvent.type === "SYSTEM_ALERT" && (
                    <ExpandedSystemAlertView event={activeEvent} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="island-peek"
            className={styles.peekIndicator}
            onClick={handleMouseEnter}
            onMouseEnter={handleMouseEnter}
            initial={{ y: -8, opacity: 0, scaleX: 0.6 }}
            animate={{ y: 0, opacity: 0.85, scaleX: 1 }}
            exit={{ y: -8, opacity: 0, scaleX: 0.6 }}
            whileHover={{ opacity: 1, scaleY: 1.4, scaleX: 1.15 }}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            title="BousLand - Rê chuột hoặc nhấp để mở lại (Ctrl+Shift+B)"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
