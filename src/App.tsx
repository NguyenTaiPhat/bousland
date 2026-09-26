import React, { useEffect } from "react";
import { setupNativeBridge } from "./core/nativeBridge";
import { useIslandStore, syncWindowCanvas } from "./stores/islandStore";
import { Island } from "./components/Island/Island";
import { ControlCenter } from "./components/ControlCenter/ControlCenter";
import { CommandBar } from "./components/CommandBar/CommandBar";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { ClipboardPanel } from "./components/Clipboard/ClipboardPanel";
import { ShelfPanel } from "./components/Shelf/ShelfPanel";
import { ScratchpadPanel } from "./components/Scratchpad/ScratchpadPanel";
import { useSettingsStore } from "./stores/settingsStore";
import { AnimatePresence } from "framer-motion";
import "./styles/globals.css";

export const App: React.FC = () => {
  const { islandState } = useIslandStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
    syncWindowCanvas("COMPACT");
    let cleanupPromise = setupNativeBridge();
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [loadSettings]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <AnimatePresence mode="wait">
        {islandState === "CONTROL_CENTER" && <ControlCenter key="control-center" />}
        {islandState === "COMMAND_BAR" && <CommandBar key="command-bar" />}
        {islandState === "SETTINGS" && <SettingsModal key="settings" />}
        {islandState === "CLIPBOARD_HISTORY" && <ClipboardPanel key="clipboard-history" />}
        {islandState === "QUICK_SHELF" && <ShelfPanel key="quick-shelf" />}
        {islandState === "SCRATCHPAD" && <ScratchpadPanel key="scratchpad" />}
        {islandState !== "CONTROL_CENTER" &&
          islandState !== "COMMAND_BAR" &&
          islandState !== "SETTINGS" &&
          islandState !== "CLIPBOARD_HISTORY" &&
          islandState !== "QUICK_SHELF" &&
          islandState !== "SCRATCHPAD" && <Island key="island" />}
      </AnimatePresence>
    </div>
  );
};

export default App;
