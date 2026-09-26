import { useEffect, useRef } from "react";
import { useIslandStore } from "../stores/islandStore";

export function useIdleAutoHide() {
  const { islandState, isVisible, setIsVisible, collapse } = useIslandStore();
  const idleTimerRef = useRef<number | null>(null);
  const isHoveredRef = useRef(false);

  // Clear timer helper
  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  // Reset/start idle timer
  const resetIdleTimer = () => {
    clearIdleTimer();

    // If currently hovered by mouse, don't auto-hide
    if (isHoveredRef.current) return;

    if (islandState === "COMPACT" && isVisible) {
      // After 4s of inactivity in compact mode, smoothly slide up and hide
      idleTimerRef.current = setTimeout(() => {
        if (!isHoveredRef.current && useIslandStore.getState().islandState === "COMPACT") {
          setIsVisible(false);
        }
      }, 4000);
    } else if (islandState === "CONTROL_CENTER" || islandState === "COMMAND_BAR") {
      // In Control Center or Command Bar, after 12s of no mouse interaction, auto-close
      idleTimerRef.current = setTimeout(() => {
        if (!isHoveredRef.current) {
          collapse();
        }
      }, 12000);
    }
  };

  // Handle global blur (clicking outside window on desktop)
  useEffect(() => {
    const handleWindowBlur = () => {
      const currentState = useIslandStore.getState().islandState;
      if (currentState === "CONTROL_CENTER" || currentState === "COMMAND_BAR") {
        collapse();
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [collapse]);

  // Restart timer when islandState or isVisible changes
  useEffect(() => {
    resetIdleTimer();
    return clearIdleTimer;
  }, [islandState, isVisible]);

  // Mouse enter and leave handlers
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    clearIdleTimer();
    if (!isVisible) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    resetIdleTimer();
  };

  return {
    handleMouseEnter,
    handleMouseLeave,
    resetIdleTimer,
  };
}
