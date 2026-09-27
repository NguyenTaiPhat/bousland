import React, { useEffect, useState, useRef } from "react";
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
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useShelfStore, formatFileSize, ShelfFileItem } from "../../stores/shelfStore";
import { useIslandStore } from "../../stores/islandStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getTransformOriginForDock } from "../../core/dockingHelper";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./shelf.module.css";

export const ShelfPanel: React.FC = () => {
  const { collapse } = useIslandStore();
  const { dock_position } = useSettingsStore();
  const origin = getTransformOriginForDock(dock_position);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files,
    isDraggingOver,
    setIsDraggingOver,
    addFiles,
    addPaths,
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      const paths = fileList.map((f: any) => f.path).filter(Boolean);
      if (paths.length > 0) {
        addPaths(paths);
      } else {
        addFiles(fileList);
      }
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
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
      const fileList = Array.from(e.dataTransfer.files);
      const paths = fileList.map((f: any) => f.path).filter(Boolean);
      if (paths.length > 0) {
        addPaths(paths);
      } else {
        addFiles(fileList);
      }
    }
  };

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
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: "none" }}
      />
      <motion.div
        className={styles.shelfContainer}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.6 }}
        style={{ transformOrigin: origin, position: "relative" }}
      >
        {isDraggingOver && (
          <div className={styles.dropZoneOverlay}>
            <FolderArchive size={24} color="var(--accent)" />
            <span>Thả tệp vào đây để ghim vào Quick Shelf</span>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BousLandLogo size={18} glow={true} />
            <FolderArchive size={15} color="var(--accent)" />
            <span className={styles.headerTitle}>Quick Shelf — Tệp tạm</span>
            <span className={styles.countBadge}>{files.length} tệp</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.addFileHeaderBtn}
              title="Chọn tệp từ máy tính để ghim"
            >
              <Plus size={12} />
              <span>Thêm tệp</span>
            </button>

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
              <FolderArchive size={32} color="var(--text-muted)" />
              <span style={{ fontWeight: 600, marginTop: 4 }}>Chưa có tệp nào trên Shelf</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Kéo bất kỳ tệp nào từ máy tính vào Island để ghim tạm
              </span>
              <button
                type="button"
                className={styles.emptyAddBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={14} />
                <span>Chọn tệp từ máy tính</span>
              </button>
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
