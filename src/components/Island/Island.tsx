import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderArchive } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useIslandStore, syncWindowCanvas } from "../../stores/islandStore";
import { useShelfStore } from "../../stores/shelfStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getBorderRadiusForDock, getContactingBorderStyle } from "../../core/dockingHelper";
import { resolveAuraState, getAuraBoxShadow } from "../../core/auraHelper";
import { extractDominantColor } from "../../utils/colorExtractor";
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

export const Island: React.FC = () => {
  const { islandState, activeEvent, isVisible, media, battery, setIslandState, collapse, toggleVisibility } =
    useIslandStore();
  const { dock_position } = useSettingsStore();
  const { handleMouseEnter, handleMouseLeave } = useIdleAutoHide();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);

  const isExpanded = islandState === "EXPANDED" && activeEvent !== null;
  const isVertical = dock_position === "LEFT" || dock_position === "RIGHT";

  const targetWidth = isVertical
    ? (isDraggingOver ? 54 : isExpanded ? 360 : 44)
    : (isDraggingOver ? 340 : isExpanded ? 380 : (media.isPlaying && media.title) ? 330 : 280);

  const targetHeight = isVertical
    ? (isDraggingOver ? 340 : isExpanded ? 68 : (media.isPlaying && media.title) ? 330 : 280)
    : (isDraggingOver ? 54 : isExpanded ? 88 : 44);

  const reactiveBorderRadius = getBorderRadiusForDock(dock_position, isExpanded);
  const contactingBorder = getContactingBorderStyle(dock_position);

  const [mediaAuraColor, setMediaAuraColor] = useState<string | null>(null);

  useEffect(() => {
    if (media.artwork && media.isPlaying) {
      extractDominantColor(media.artwork).then(setMediaAuraColor);
    } else {
      setMediaAuraColor(null);
    }
  }, [media.artwork, media.isPlaying]);

  const isScreenshotFlash = activeEvent?.type === "SCREENSHOT_CAPTURED";
  const auraState = resolveAuraState({
    isScreenshotFlash,
    isCharging: battery.charging,
    isPlaying: media.isPlaying,
    batteryPct: battery.percentage,
  });
  const auraShadow = getAuraBoxShadow(auraState, dock_position, mediaAuraColor);

  const handleClick = () => {
    if (islandState === "COMPACT") {
      setIslandState("CONTROL_CENTER");
    } else if (islandState === "EXPANDED") {
      collapse();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const startX = e.screenX;
    const startY = e.screenY;
    let moved = false;
    let initialWinX = 0;
    let initialWinY = 0;

    invoke<[number, number]>("get_window_position")
      .then(([wx, wy]) => {
        initialWinX = wx;
        initialWinY = wy;
      })
      .catch(() => {});

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.screenX - startX;
      const dy = moveEvent.screenY - startY;

      if (!moved && Math.hypot(dx, dy) > 4) {
        moved = true;
        setIsDraggingWindow(true);
      }

      if (moved) {
        const screenW = window.screen.availWidth || 1920;
        const screenH = window.screen.availHeight || 1080;

        let curX = initialWinX;
        let curY = initialWinY;

        if (dock_position === "LEFT") {
          curX = 0; // Strictly locked flush to left bezel
          curY = Math.max(0, Math.min(screenH - targetHeight, initialWinY + dy));
        } else if (dock_position === "RIGHT") {
          curX = screenW - targetWidth; // Strictly locked flush to right bezel
          curY = Math.max(0, Math.min(screenH - targetHeight, initialWinY + dy));
        } else {
          // TOP_CENTER, TOP_LEFT, TOP_RIGHT: Strictly locked flush to top bezel
          curY = 0;
          curX = Math.max(0, Math.min(screenW - targetWidth, initialWinX + dx));
        }

        invoke("set_window_position", {
          x: curX,
          y: curY,
        }).catch(() => {});
      }
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      if (moved) {
        setIsDraggingWindow(false);
        const screenW = window.screen.availWidth || 1920;
        const screenH = window.screen.availHeight || 1080;

        if (dock_position === "LEFT") {
          const finalY = Math.max(0, Math.min(screenH - targetHeight, initialWinY + (upEvent.screenY - startY)));
          if (finalY <= 60) {
            useSettingsStore.getState().updateSettings({
              dock_position: "TOP_LEFT",
              island_x_offset: 0,
              island_y_offset: 0,
            });
            syncWindowCanvas(undefined, "TOP_LEFT", 0, 0);
          } else {
            const newOy = Math.round(finalY - (screenH - targetHeight) / 2);
            useSettingsStore.getState().updateSettings({
              dock_position: "LEFT",
              island_x_offset: 0,
              island_y_offset: newOy,
            });
            syncWindowCanvas(undefined, "LEFT", 0, newOy);
          }
        } else if (dock_position === "RIGHT") {
          const finalY = Math.max(0, Math.min(screenH - targetHeight, initialWinY + (upEvent.screenY - startY)));
          if (finalY <= 60) {
            useSettingsStore.getState().updateSettings({
              dock_position: "TOP_RIGHT",
              island_x_offset: 0,
              island_y_offset: 0,
            });
            syncWindowCanvas(undefined, "TOP_RIGHT", 0, 0);
          } else {
            const newOy = Math.round(finalY - (screenH - targetHeight) / 2);
            useSettingsStore.getState().updateSettings({
              dock_position: "RIGHT",
              island_x_offset: 0,
              island_y_offset: newOy,
            });
            syncWindowCanvas(undefined, "RIGHT", 0, newOy);
          }
        } else {
          // TOP_CENTER / TOP_LEFT / TOP_RIGHT
          const finalX = Math.max(0, Math.min(screenW - targetWidth, initialWinX + (upEvent.screenX - startX)));
          if (finalX <= 60) {
            useSettingsStore.getState().updateSettings({
              dock_position: "TOP_LEFT",
              island_x_offset: 0,
              island_y_offset: 0,
            });
            syncWindowCanvas(undefined, "TOP_LEFT", 0, 0);
          } else if (finalX >= screenW - targetWidth - 60) {
            useSettingsStore.getState().updateSettings({
              dock_position: "TOP_RIGHT",
              island_x_offset: 0,
              island_y_offset: 0,
            });
            syncWindowCanvas(undefined, "TOP_RIGHT", 0, 0);
          } else {
            const newOx = Math.round(finalX - (screenW - targetWidth) / 2);
            useSettingsStore.getState().updateSettings({
              dock_position: "TOP_CENTER",
              island_x_offset: newOx,
              island_y_offset: 0,
            });
            syncWindowCanvas(undefined, "TOP_CENTER", newOx, 0);
          }
        }
      } else {
        handleClick();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
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
    <div
      className={styles.islandWrapper}
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        justifyContent:
          dock_position === "LEFT" || dock_position === "TOP_LEFT"
            ? "flex-start"
            : dock_position === "RIGHT" || dock_position === "TOP_RIGHT"
            ? "flex-end"
            : "center",
        alignItems:
          dock_position === "LEFT" || dock_position === "RIGHT"
            ? "center"
            : "flex-start",
      }}
    >
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key="island-main"
            className={styles.islandContainer}
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              cursor: isDraggingWindow ? "grabbing" : "grab",
              borderRadius: reactiveBorderRadius,
              ...contactingBorder,
            }}
            initial={{
              y: -24,
              opacity: 0,
              scaleX: 0.65,
              scaleY: 0.25,
              filter: "blur(8px)",
              borderRadius: reactiveBorderRadius,
            }}
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
              boxShadow: auraShadow !== "none" ? auraShadow : undefined,
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
