import React, { useEffect, useState, useRef } from "react";
import {
  Clipboard,
  Search,
  Trash2,
  X,
  Copy,
  Check,
  Link,
  Code,
  Palette,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClipboardStore, ClipboardKind, ClipboardItem } from "../../stores/clipboardStore";
import { useIslandStore } from "../../stores/islandStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getTransformOriginForDock } from "../../core/dockingHelper";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./clipboard.module.css";

function formatTimestamp(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return "Vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
}

export const ClipboardPanel: React.FC = () => {
  const { collapse } = useIslandStore();
  const {
    searchQuery,
    filterKind,
    setSearchQuery,
    setFilterKind,
    getFilteredItems,
    copyItem,
    removeItem,
    clearHistory,
    loadHistory,
  } = useClipboardStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
    inputRef.current?.focus();
  }, [loadHistory]);

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

  const handleCopy = async (item: ClipboardItem) => {
    await copyItem(item.text);
    setToastMessage("Đã sao chép vào khay nhớ!");
    setTimeout(() => {
      setToastMessage(null);
      collapse();
    }, 600);
  };

  const filteredItems = getFilteredItems();

  const renderKindIcon = (kind: string) => {
    switch (kind) {
      case "url":
        return <Link size={11} color="var(--status-info)" />;
      case "color":
        return <Palette size={11} color="var(--status-warning)" />;
      case "code":
        return <Code size={11} color="var(--status-success)" />;
      default:
        return <FileText size={11} color="var(--text-secondary)" />;
    }
  };

  const filterOptions: { id: ClipboardKind; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "text", label: "Văn bản" },
    { id: "url", label: "Liên kết" },
    { id: "code", label: "Mã code" },
    { id: "color", label: "Màu sắc" },
  ];

  const { dock_position } = useSettingsStore();
  const origin = getTransformOriginForDock(dock_position);

  return (
    <div className={styles.clipboardWrapper}>
      <motion.div
        className={styles.clipboardContainer}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.6 }}
        style={{ position: "relative", transformOrigin: origin }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BousLandLogo size={18} glow={true} />
            <Clipboard size={15} color="var(--accent)" />
            <span className={styles.headerTitle}>Lịch sử Khay nhớ tạm</span>
            <span className={styles.itemCountBadge}>{filteredItems.length}</span>
          </div>

          <div className={styles.headerActions}>
            <button
              onClick={clearHistory}
              className={styles.iconBtn}
              title="Xóa toàn bộ lịch sử khay nhớ"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={collapse}
              className={styles.iconBtn}
              title="Đóng (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <Search size={14} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm nội dung đã copy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className={styles.filterTags}>
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              className={`${styles.filterTag} ${
                filterKind === opt.id ? styles.filterTagActive : ""
              }`}
              onClick={() => setFilterKind(opt.id)}
            >
              {filterKind === opt.id && (
                <motion.div
                  layoutId="clipboardFilterPill"
                  className={styles.filterActivePill}
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Item List */}
        <div className={styles.itemList}>
          {filteredItems.length === 0 ? (
            <div className={styles.emptyState}>
              <Clipboard size={24} color="var(--text-muted)" />
              <span>Chưa có nội dung sao chép nào phù hợp</span>
            </div>
          ) : (
            filteredItems.map((item) => (
              <motion.div
                key={item.id}
                className={styles.clipboardItem}
                onClick={() => handleCopy(item)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className={styles.itemMain}>
                  <div
                    className={`${styles.itemText} ${
                      item.kind === "code" ? styles.codeText : ""
                    }`}
                  >
                    {item.text}
                  </div>

                  <div className={styles.itemMeta}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {renderKindIcon(item.kind)}
                      <span className={styles.kindBadge}>{item.kind}</span>
                    </div>

                    {item.kind === "color" && (
                      <span
                        className={styles.colorPreviewDot}
                        style={{ backgroundColor: item.text.trim() }}
                      />
                    )}

                    <span className={styles.timeText}>
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(item);
                    }}
                    title="Sao chép lại"
                  >
                    <Copy size={13} />
                  </button>

                  <button
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                    title="Xóa mục này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Feedback toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className={styles.feedbackToast}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Check size={12} />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
