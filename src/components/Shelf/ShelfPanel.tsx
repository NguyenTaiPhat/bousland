import React, { useEffect, useState } from "react";
import {
  FolderArchive,
  Copy,
  ExternalLink,
  Trash2,
  X,
  File as FileIcon,
  Check,
  Archive,
  FolderOpen,
  ShieldCheck,
  Binary,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useShelfStore, formatFileSize, ShelfFileItem } from "../../stores/shelfStore";
import { useIslandStore } from "../../stores/islandStore";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./shelf.module.css";

export const ShelfPanel: React.FC = () => {
  const { collapse } = useIslandStore();
  const {
    files,
    removeFile,
    clearShelf,
    copyFilePath,
    compressToZip,
    showInFolder,
    computeHash,
    copyBase64,
  } = useShelfStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; msg: string } | null>(null);

  const showFeedback = (id: string, msg: string) => {
    setActionFeedback({ id, msg });
    setTimeout(() => setActionFeedback(null), 2000);
  };

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
    showFeedback(item.id, "Đã chép đường dẫn!");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleOpenFile = (path: string) => {
    invoke("open_screenshot_file", { filePath: path }).catch((err) => {
      console.debug("[ShelfPanel] Open file error:", err);
    });
  };

  const handleZip = async (item: ShelfFileItem) => {
    try {
      const zipPath = await compressToZip(item.path);
      showFeedback(item.id, "Đã nén tệp .ZIP!");
      console.log("[ShelfPanel] Created ZIP at:", zipPath);
    } catch (err: any) {
      showFeedback(item.id, "Lỗi nén ZIP");
    }
  };

  const handleFolder = async (item: ShelfFileItem) => {
    try {
      await showInFolder(item.path);
      showFeedback(item.id, "Đã mở thư mục!");
    } catch (err: any) {
      showFeedback(item.id, "Lỗi mở Explorer");
    }
  };

  const handleHash = async (item: ShelfFileItem) => {
    try {
      const hash = await computeHash(item.path);
      showFeedback(item.id, `Đã chép SHA256: ${hash.slice(0, 8)}...`);
    } catch (err: any) {
      showFeedback(item.id, "Lỗi tính SHA256");
    }
  };

  const handleBase64 = async (item: ShelfFileItem) => {
    try {
      await copyBase64(item.path);
      showFeedback(item.id, "Đã chép mã Base64!");
    } catch (err: any) {
      showFeedback(item.id, err?.message || "Lỗi chuyển Base64");
    }
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
                    {actionFeedback && actionFeedback.id === file.id && (
                      <span className={styles.actionSuccessPill} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
                        {actionFeedback.msg}
                      </span>
                    )}

                    <button
                      className={styles.actionPill}
                      onClick={() => handleZip(file)}
                      title="Nén tệp này thành file .ZIP ngay lập tức"
                    >
                      <Archive size={12} color="var(--accent)" />
                      <span>Nén ZIP</span>
                    </button>

                    <button
                      className={styles.actionPill}
                      onClick={() => handleFolder(file)}
                      title="Xem vị trí tệp trong Windows Explorer"
                    >
                      <FolderOpen size={12} />
                      <span>Thư mục</span>
                    </button>

                    <button
                      className={styles.actionPill}
                      onClick={() => handleHash(file)}
                      title="Tính và sao chép mã băm bảo mật SHA-256"
                    >
                      <ShieldCheck size={12} />
                      <span>SHA256</span>
                    </button>

                    {file.type.startsWith("image/") && (
                      <button
                        className={styles.actionPill}
                        onClick={() => handleBase64(file)}
                        title="Chuyển đổi và sao chép mã Data URI Base64"
                      >
                        <Binary size={12} />
                        <span>Base64</span>
                      </button>
                    )}

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
                      <span>Đường dẫn</span>
                    </button>

                    <button
                      className={styles.actionPill}
                      onClick={() => handleOpenFile(file.path)}
                      title="Mở tệp bằng ứng dụng mặc định"
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
