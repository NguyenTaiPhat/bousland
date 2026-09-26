import React, { useEffect, useState } from "react";
import {
  FolderArchive,
  Copy,
  ExternalLink,
  Trash2,
  X,
  File as FileIcon,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useShelfStore, formatFileSize, ShelfFileItem } from "../../stores/shelfStore";
import { useIslandStore } from "../../stores/islandStore";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./shelf.module.css";

export const ShelfPanel: React.FC = () => {
  const { collapse } = useIslandStore();
  const { files, removeFile, clearShelf, copyFilePath } = useShelfStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyPath = async (item: ShelfFileItem) => {
    await copyFilePath(item.path);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleOpenFile = (path: string) => {
    invoke("open_screenshot_file", { filePath: path }).catch((err) => {
      console.debug("[ShelfPanel] Open file error:", err);
    });
  };

  return (
    <div className={styles.shelfWrapper}>
      <motion.div
        className={styles.shelfContainer}
        initial={{ opacity: 0, scale: 0.93, y: -16, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.94, y: -12, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BousLandLogo size={18} glow={true} />
            <FolderArchive size={15} color="var(--accent)" />
            <span className={styles.headerTitle}>Quick Shelf — Tệp tạm</span>
            <span className={styles.countBadge}>{files.length} tệp</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {files.length > 0 && (
              <button
                onClick={clearShelf}
                className={styles.iconBtn}
                title="Xóa tất cả tệp khỏi Shelf"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={collapse}
              className={styles.iconBtn}
              title="Đóng (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className={styles.fileList}>
          {files.length === 0 ? (
            <div className={styles.emptyShelf}>
              <FolderArchive size={28} color="var(--text-muted)" />
              <span>Chưa có tệp nào trên Shelf</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Kéo bất kỳ tệp nào từ máy tính vào Island để ghim tạm
              </span>
            </div>
          ) : (
            <AnimatePresence>
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  className={styles.fileItem}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className={styles.fileLeft}>
                    <div className={styles.fileThumb}>
                      {file.thumbnailUrl ? (
                        <img src={file.thumbnailUrl} alt={file.name} />
                      ) : (
                        <FileIcon size={16} color="var(--accent-muted)" />
                      )}
                    </div>

                    <div className={styles.fileInfo}>
                      <span className={styles.fileName} title={file.name}>
                        {file.name}
                      </span>
                      <span className={styles.fileSize}>
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.fileActions}>
                    <button
                      className={styles.actionPill}
                      onClick={() => handleCopyPath(file)}
                      title="Sao chép đường dẫn tuyệt đối (Full Path)"
                    >
                      {copiedId === file.id ? (
                        <Check size={12} color="var(--status-success)" />
                      ) : (
                        <Copy size={12} />
                      )}
                      <span>{copiedId === file.id ? "Đã chép" : "Đường dẫn"}</span>
                    </button>

                    <button
                      className={styles.actionPill}
                      onClick={() => handleOpenFile(file.path)}
                      title="Mở tệp"
                    >
                      <ExternalLink size={12} />
                      <span>Mở</span>
                    </button>

                    <button
                      className={styles.iconBtn}
                      onClick={() => removeFile(file.id)}
                      title="Gỡ khỏi Shelf"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};
