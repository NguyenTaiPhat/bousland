import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { commandRegistry, CommandDefinition } from "../../core/commandRegistry";
import { useIslandStore } from "../../stores/islandStore";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./commandBar.module.css";

export const CommandBar: React.FC = () => {
  const { collapse } = useIslandStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = commandRegistry.search(query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectCommand = async (cmd: CommandDefinition) => {
    // If the command syntax requires arguments (like volume <0-100>), put it in the input for the user
    if (cmd.syntax.includes("<")) {
      const prefix = cmd.syntax.split("<")[0];
      setQuery(prefix);
      inputRef.current?.focus();
      return;
    }

    const res = await commandRegistry.execute(cmd.id);
    setFeedback(res);
    setTimeout(() => {
      collapse();
    }, 800);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      collapse();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, results.length - 1) : prev - 1
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        const res = await commandRegistry.execute(query);
        setFeedback(res);
        setTimeout(() => {
          collapse();
        }, 800);
      } else if (results[selectedIndex]) {
        handleSelectCommand(results[selectedIndex]);
      }
    }
  };

  return (
    <div className={styles.commandBarWrapper}>
      <motion.div
        className={styles.commandBarContainer}
        initial={{ opacity: 0, scale: 0.92, y: -16, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.94, y: -10, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
      >
        <div className={styles.inputRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BousLandLogo size={20} glow={true} />
            <Search size={16} color="var(--text-secondary)" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm lệnh BousLand (ví dụ: am luong 50, cpu, chup anh, cai dat)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className={styles.escapeHint}>ESC</span>
        </div>

        {feedback && (
          <div className={styles.feedbackBanner}>
            <span>{feedback}</span>
          </div>
        )}

        <div className={styles.resultsList}>
          {results.length === 0 ? (
            <div style={{ padding: "16px 12px", color: "var(--text-muted)", fontSize: 13 }}>
              Không tìm thấy lệnh nào phù hợp với "{query}"
            </div>
          ) : (
            results.map((cmd, idx) => (
              <motion.div
                key={cmd.id}
                className={`${styles.commandItem} ${
                  idx === selectedIndex ? styles.commandItemSelected : ""
                }`}
                onClick={() => handleSelectCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
              >
                <div className={styles.commandLeft}>
                  <span className={styles.commandSyntax}>{cmd.syntax}</span>
                  <span className={styles.commandDesc}>{cmd.description}</span>
                </div>
                <span className={styles.commandCategory}>{cmd.category}</span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
