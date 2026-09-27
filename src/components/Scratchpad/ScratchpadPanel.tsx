import React, { useState, useEffect } from "react";
import { CheckSquare, Pin, Trash2, X, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useScratchpadStore, ScratchpadItem } from "../../stores/scratchpadStore";
import { useIslandStore } from "../../stores/islandStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getTransformOriginForDock } from "../../core/dockingHelper";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./scratchpad.module.css";

export const ScratchpadPanel: React.FC = () => {
  const { collapse } = useIslandStore();
  const { dock_position } = useSettingsStore();
  const origin = getTransformOriginForDock(dock_position);
  const {
    items,
    loadItems,
    addTodo,
    toggleTodo,
    deleteTodo,
    pinTodo,
    clearCompleted,
  } = useScratchpadStore();

  const [inputText, setInputText] = useState("");

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        collapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [collapse]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await addTodo(inputText);
    setInputText("");
  };

  const activeCount = items.filter((i) => !i.completed).length;
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div className={styles.scratchpadWrapper}>
      <motion.div
        className={styles.scratchpadContainer}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.6 }}
        style={{ transformOrigin: origin }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BousLandLogo size={18} glow={true} />
            <CheckSquare size={15} color="var(--accent)" />
            <span className={styles.headerTitle}>Ghi chú & Checklist</span>
            <span className={styles.countBadge}>
              {activeCount} việc cần làm
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={collapse}
              className={styles.iconBtn}
              title="Đóng (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAdd} className={styles.inputBar}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Thêm việc cần làm hoặc ghi chú nhanh... (Enter)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.addBtn} disabled={!inputText.trim()}>
            <Plus size={13} />
            <span>Thêm</span>
          </button>
        </form>

        {/* Todo List */}
        <div className={styles.todoList}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckSquare size={26} color="var(--text-muted)" />
              <span>Chưa có ghi chú nào</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Nhập nội dung ở trên và nhấn Enter để lưu
              </span>
            </div>
          ) : (
            <AnimatePresence>
              {items.map((item: ScratchpadItem) => (
                <motion.div
                  key={item.id}
                  className={`${styles.todoItem} ${
                    item.pinned ? styles.pinnedItem : ""
                  }`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className={styles.todoLeft}
                    onClick={() => toggleTodo(item.id)}
                  >
                    <div
                      className={`${styles.checkCircle} ${
                        item.completed ? styles.checked : ""
                      }`}
                    >
                      {item.completed && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span
                      className={`${styles.todoText} ${
                        item.completed ? styles.completedText : ""
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>

                  <div className={styles.todoActions}>
                    <button
                      className={`${styles.iconBtn} ${
                        item.pinned ? styles.activePin : ""
                      }`}
                      onClick={() => pinTodo(item.id)}
                      title={
                        item.pinned
                          ? "Bỏ ghim khỏi thanh đảo"
                          : "Ghim lên thanh đảo Compact"
                      }
                    >
                      <Pin size={13} />
                    </button>

                    <button
                      className={styles.iconBtn}
                      onClick={() => deleteTodo(item.id)}
                      title="Xóa việc này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <span>{items.length} tổng cộng</span>
            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className={styles.footerBtn}
                title="Xóa các việc đã đánh dấu hoàn thành"
              >
                Xóa {completedCount} việc đã xong
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
