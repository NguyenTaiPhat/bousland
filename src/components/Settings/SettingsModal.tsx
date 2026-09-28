import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Monitor,
  Layers,
  Keyboard,
  Shield,
  Info,
  Moon,
  Sparkles,
  Box,
  Check,
  Plus,
  Pipette,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Sun,
  Snowflake,
  Compass,
  Trees,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "../../stores/settingsStore";
import { useIslandStore, syncWindowCanvas } from "../../stores/islandStore";
import { useUpdaterStore } from "../../stores/updaterStore";
import { DockPosition } from "../../core/types";
import { BousLandLogo } from "../Common/BousLandLogo";
import styles from "./settings.module.css";

type TabId = "general" | "behavior" | "modules" | "shortcuts" | "privacy" | "about";

const THEMES = [
  {
    id: "dark",
    name: "Onyx Black",
    shortName: "Onyx",
    desc: "Đen tuyền sâu thẳm, viền vi chamfer tinh giản sang trọng",
    icon: Moon,
    preview: { bg: "#000000", border: "rgba(255,255,255,0.22)", dot: "#FFFFFF" },
  },
  {
    id: "glass",
    name: "Liquid Glass",
    shortName: "Thủy Tinh",
    desc: "Kính trong mờ tinh khiết, khúc xạ quang học mềm mại",
    icon: Sparkles,
    preview: { bg: "rgba(26,32,46,0.88)", border: "rgba(255,255,255,0.32)", dot: "#38bdf8" },
  },
  {
    id: "titanium",
    name: "Titanium Satin",
    shortName: "Titanium",
    desc: "Xám titan ấm ánh kim loại cao cấp, lịch lãm",
    icon: Box,
    preview: { bg: "#1C1C1F", border: "rgba(235,226,214,0.32)", dot: "#F5F3EF" },
  },
  {
    id: "midnight",
    name: "Midnight Navy",
    shortName: "Midnight",
    desc: "Xanh đêm thẳm tĩnh lặng, huyền bí và sâu lắng",
    icon: Compass,
    preview: { bg: "#090E17", border: "rgba(147,197,253,0.32)", dot: "#60a5fa" },
  },
  {
    id: "alpine",
    name: "Alpine Forest",
    shortName: "Alpine",
    desc: "Xanh ngọc bích sẫm điềm đạm, cổ điển và thanh tao",
    icon: Trees,
    preview: { bg: "#0B1612", border: "rgba(110,231,183,0.32)", dot: "#34d399" },
  },
  {
    id: "light",
    name: "Ceramic White",
    shortName: "Ceramic",
    desc: "Trắng gốm sứ thuần khiết, tương phản chữ sắc nét",
    icon: Sun,
    preview: { bg: "#FFFFFF", border: "rgba(0,0,0,0.18)", dot: "#1D1D1F" },
  },
  {
    id: "snow",
    name: "Frost Ice",
    shortName: "Frost",
    desc: "Băng tuyết trong trẻo, ánh sắc lạnh dịu mắt",
    icon: Snowflake,
    preview: { bg: "#F0F6FA", border: "rgba(2,132,199,0.3)", dot: "#0284C7" },
  },
  {
    id: "mica",
    name: "Graphite Slate",
    shortName: "Graphite",
    desc: "Than chì trung tính, hài hòa và êm dịu",
    icon: Layers,
    preview: { bg: "#18191E", border: "rgba(255,255,255,0.2)", dot: "#a1a1aa" },
  },
];

const ACCENT_COLORS = [
  { id: "system", name: "Theo hệ thống" },
  { id: "#FFFFFF", name: "Trắng Đen Tối Giản" },
  { id: "#38bdf8", name: "Xanh Băng Glacier" },
  { id: "#34d399", name: "Xanh Ngọc Emerald" },
  { id: "#a78bfa", name: "Tím Dạ Quang" },
  { id: "#f59e0b", name: "Cam Hổ Phách" },
  { id: "#fb7185", name: "Hồng Hoàng Hôn" },
];

const TAB_ORDER: TabId[] = ["general", "behavior", "modules", "shortcuts", "privacy", "about"];

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "Cài đặt chung", icon: <Sliders size={14} /> },
  { id: "behavior", label: "Hành vi", icon: <Monitor size={14} /> },
  { id: "modules", label: "Mô-đun", icon: <Layers size={14} /> },
  { id: "shortcuts", label: "Phím tắt", icon: <Keyboard size={14} /> },
  { id: "privacy", label: "Bảo mật", icon: <Shield size={14} /> },
  { id: "about", label: "Giới thiệu", icon: <Info size={14} /> },
];

export const SettingsModal: React.FC = () => {
  const { collapse } = useIslandStore();
  const settings = useSettingsStore();
  const updater = useUpdaterStore();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [prevTab, setPrevTab] = useState<TabId>("general");
  const direction = TAB_ORDER.indexOf(activeTab) >= TAB_ORDER.indexOf(prevTab) ? 1 : -1;
  const [customHex, setCustomHex] = useState("#6366f1");
  const [hexError, setHexError] = useState(false);
  const [appVersion, setAppVersion] = useState("1.0.12");

  useEffect(() => {
    invoke<string>("get_app_version")
      .then((ver) => {
        if (ver) setAppVersion(ver);
      })
      .catch(() => {});
  }, []);

  const handleAddCustomColor = () => {
    let val = customHex.trim().toLowerCase();
    if (!val.startsWith("#")) val = "#" + val;
    if (/^#[0-9a-f]{6}$/i.test(val)) {
      settings.addCustomColor(val);
      setHexError(false);
    } else {
      setHexError(true);
    }
  };

  return (
    <div className={styles.settingsWrapper}>
      <motion.div
        className={styles.settingsContainer}
        initial={{ opacity: 0, scale: 0.93, y: -16, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.94, y: -12, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.7 }}
      >
        <div className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BousLandLogo size={22} glow={true} />
            <span className={styles.headerTitle}>Cài đặt BousLand</span>
          </div>
          <button
            onClick={collapse}
            className={styles.closeButton}
            style={{ width: 24, height: 24, borderRadius: 4 }}
            title="Đóng Cài đặt (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        <div className={styles.contentRow}>
          {/* Sidebar */}
          <div className={styles.navSidebar}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ""}`}
                onClick={() => {
                  setPrevTab(activeTab);
                  setActiveTab(tab.id);
                }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeSettingsTabPill"
                    className={styles.activePillGlider}
                    transition={{ type: "spring", stiffness: 480, damping: 34 }}
                  />
                )}
                <span className={styles.navItemIcon}>{tab.icon}</span>
                <span className={styles.navItemLabel}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className={styles.panelContent}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: direction * 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 12 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {activeTab === "general" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Phong cách & Chủ đề</h3>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>8 phong cách cao cấp</span>
                </div>
                <div className={styles.themeGrid}>
                  {THEMES.map((t) => {
                    const isActive = (settings.theme || "dark") === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`${styles.themeCard} ${
                          isActive ? styles.themeCardActive : ""
                        }`}
                        onClick={() => settings.setTheme(t.id)}
                        title={`${t.name} • ${t.desc}`}
                      >
                        <div className={styles.themeCardLeft}>
                          <div
                            className={styles.themeSwatch}
                            style={{
                              backgroundColor: t.preview.bg,
                              borderColor: t.preview.border,
                            }}
                          >
                            <div
                              className={styles.themeSwatchDot}
                              style={{ backgroundColor: t.preview.dot }}
                            />
                          </div>
                          <span className={styles.themeName}>{t.shortName || t.name}</span>
                        </div>
                        {isActive && <Check size={12} color="var(--accent)" />}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 4 }}>
                  <div className={styles.settingInfo}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className={styles.settingLabel}>
                        Màu nhấn (Accent Color)
                      </span>
                      <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                        {settings.accent_color === "system"
                          ? `Theo hệ thống (${settings.system_accent})`
                          : settings.accent_color.toUpperCase() === "#FFFFFF"
                          ? "Trắng Đen Tối Giản"
                          : settings.accent_color}
                      </span>
                    </div>
                  </div>
                  <div className={styles.accentGrid}>
                    {ACCENT_COLORS.map((c) => {
                      const isSystem = c.id === "system";
                      const isActive =
                        isSystem
                          ? settings.accent_color === "system"
                          : settings.accent_color.toLowerCase() === c.id.toLowerCase();
                      const dotBg = isSystem ? settings.system_accent || "#0078d4" : c.id;
                      const isWhite = c.id.toUpperCase() === "#FFFFFF";

                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.colorDot} ${
                            isSystem ? styles.colorDotSystem : ""
                          } ${isActive ? styles.colorDotActive : ""}`}
                          style={{
                            backgroundColor: dotBg,
                            border: isWhite ? "1px solid rgba(255, 255, 255, 0.4)" : undefined,
                          }}
                          onClick={() => settings.setAccentColor(c.id)}
                          title={isSystem ? `Theo màu hệ thống (${settings.system_accent})` : c.name}
                        >
                          {isActive ? (
                            <Check
                              size={12}
                              color={isWhite ? "#0D0D0F" : "#FFFFFF"}
                              strokeWidth={3}
                            />
                          ) : isSystem ? (
                            <Monitor size={12} color="rgba(255,255,255,0.85)" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bảng màu yêu thích từ mã màu */}
                  <div className={styles.customColorSection}>
                    <div className={styles.customColorHeader}>
                      <span className={styles.customColorTitle}>Bảng màu yêu thích (Tự chọn mã HEX)</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {settings.custom_colors.length} màu đã lưu
                      </span>
                    </div>

                    <div className={styles.customColorControls}>
                      <div
                        className={styles.colorPickerWrapper}
                        style={{ backgroundColor: customHex }}
                        title="Mở bảng chọn màu trực quan của hệ thống"
                      >
                        <input
                          type="color"
                          className={styles.nativeColorInput}
                          value={customHex.startsWith("#") && customHex.length === 7 ? customHex : "#6366f1"}
                          onChange={(e) => {
                            setCustomHex(e.target.value);
                            setHexError(false);
                          }}
                        />
                        <Pipette size={13} color="#FFFFFF" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }} />
                      </div>

                      <input
                        type="text"
                        className={`${styles.hexTextInput} ${hexError ? styles.hexTextInputError : ""}`}
                        value={customHex}
                        onChange={(e) => {
                          setCustomHex(e.target.value.trim());
                          setHexError(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddCustomColor();
                          }
                        }}
                        placeholder="#FF007F"
                        maxLength={7}
                        title="Nhập mã màu HEX (ví dụ: #6366F1 hoặc #FF007F)"
                      />

                      <button
                        type="button"
                        className={styles.addHexButton}
                        onClick={handleAddCustomColor}
                        title="Lưu màu này vào bảng màu yêu thích"
                      >
                        <Plus size={13} />
                        <span>Lưu màu</span>
                      </button>
                    </div>

                    {settings.custom_colors.length > 0 && (
                      <div className={styles.favoriteColorsRow}>
                        {settings.custom_colors.map((hex) => {
                          const isActive = settings.accent_color.toLowerCase() === hex.toLowerCase();
                          return (
                            <div key={hex} className={styles.favDotWrapper}>
                              <button
                                type="button"
                                className={`${styles.colorDot} ${isActive ? styles.colorDotActive : ""}`}
                                style={{ backgroundColor: hex }}
                                onClick={() => settings.setAccentColor(hex)}
                                title={`Áp dụng màu ${hex}`}
                              >
                                {isActive && (
                                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                )}
                              </button>
                              <button
                                type="button"
                                className={styles.deleteFavBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  settings.removeCustomColor(hex);
                                }}
                                title={`Xóa mã ${hex}`}
                              >
                                <X size={9} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.settingRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: 12, marginTop: 4 }}>
                  <div className={styles.settingInfo} style={{ width: "100%" }}>
                    <span className={styles.settingLabel}>Tên hiển thị trên Island</span>
                    <span className={styles.settingDesc}>
                      Đổi chữ "BousLand" thành tên máy tính hoặc đặt biệt danh tùy chỉnh theo sở thích
                    </span>
                  </div>

                  <div className={styles.nameModeGrid}>
                    <button
                      type="button"
                      className={`${styles.nameModeCard} ${settings.name_display_mode === "default" ? styles.nameModeCardActive : ""}`}
                      onClick={() => settings.setNameDisplayMode("default")}
                    >
                      <span className={styles.nameModeCardTitle}>Mặc định</span>
                      <span className={styles.nameModeCardSub}>BousLand</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.nameModeCard} ${settings.name_display_mode === "device" ? styles.nameModeCardActive : ""}`}
                      onClick={() => settings.setNameDisplayMode("device")}
                      title={`Tên máy: ${settings.device_name || "Laptop"}`}
                    >
                      <span className={styles.nameModeCardTitle}>Tên Laptop</span>
                      <span className={styles.nameModeCardSub}>{settings.device_name || "Laptop"}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.nameModeCard} ${settings.name_display_mode === "custom" ? styles.nameModeCardActive : ""}`}
                      onClick={() => settings.setNameDisplayMode("custom")}
                    >
                      <span className={styles.nameModeCardTitle}>Tùy chỉnh</span>
                      <span className={styles.nameModeCardSub}>{settings.island_name || "Tự đặt tên"}</span>
                    </button>
                  </div>

                  {settings.name_display_mode === "custom" && (
                    <div className={styles.customNameInputRow} style={{ width: "100%" }}>
                      <input
                        type="text"
                        className={styles.customNameInput}
                        value={settings.island_name}
                        placeholder="Nhập tên hiển thị (VD: Phát Island, ThinkPad...)"
                        maxLength={24}
                        onChange={(e) => settings.setIslandName(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.addHexButton}
                        onClick={() => settings.setIslandName(settings.device_name || "BousLand")}
                        title="Điền nhanh tên laptop vào ô này"
                      >
                        Lấy tên laptop
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.settingRow} style={{ marginTop: 4 }}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Đổi màu theo nhạc (Dynamic Album Tint)</span>
                    <span className={styles.settingDesc}>
                      Tự động trích xuất màu chủ đạo từ bìa bài hát Spotify, YouTube khi đang phát nhạc
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={settings.dynamic_album_tint}
                      onChange={(e) => settings.updateSettings({ dynamic_album_tint: e.target.checked })}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Khởi động cùng Windows</span>
                    <span className={styles.settingDesc}>Tự động mở BousLand khi đăng nhập máy tính</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={settings.start_with_windows}
                      onChange={(e) => settings.updateSettings({ start_with_windows: e.target.checked })}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Vị trí & Docking Viền Màn Hình</h3>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Giữ Alt để kéo nhanh</span>
                </div>

                <div className={styles.dockSelectorGrid}>
                  {[
                    { id: "TOP_LEFT", label: "Góc Trái", title: "Góc Trên Trái (Top-Left)" },
                    { id: "TOP_CENTER", label: "Giữa Trên", title: "Chính Giữa Trên (Top-Center)" },
                    { id: "TOP_RIGHT", label: "Góc Phải", title: "Góc Trên Phải (Top-Right)" },
                    { id: "LEFT", label: "Cạnh Trái", title: "Cạnh Trái Dọc (Left Edge)" },
                    { id: "RIGHT", label: "Cạnh Phải", title: "Cạnh Phải Dọc (Right Edge)" },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      title={pos.title}
                      className={`${styles.dockButton} ${settings.dock_position === pos.id ? styles.dockButtonActive : ""}`}
                      onClick={() => {
                        const newPos = pos.id as DockPosition;
                        settings.updateSettings({ dock_position: newPos, island_x_offset: 0, island_y_offset: 0 });
                        syncWindowCanvas(undefined, newPos, 0, 0);
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                {settings.dock_position === "TOP_CENTER" && (
                  <div className={styles.settingRow} style={{ marginTop: 8 }}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Độ lệch ngang (Offset X)</span>
                      <span className={styles.settingDesc}>
                        Dịch chuyển trái/phải dọc theo mép trên ({settings.island_x_offset}px)
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="range"
                        min="-600"
                        max="600"
                        step="5"
                        value={settings.island_x_offset}
                        onChange={(e) => {
                          const ox = parseInt(e.target.value, 10);
                          settings.updateSettings({ island_x_offset: ox, island_y_offset: 0 });
                          syncWindowCanvas(undefined, undefined, ox, 0);
                        }}
                        style={{ width: 100 }}
                      />
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() => {
                          settings.updateSettings({ island_x_offset: 0, island_y_offset: 0 });
                          syncWindowCanvas(undefined, undefined, 0, 0);
                        }}
                      >
                        Về giữa
                      </button>
                    </div>
                  </div>
                )}

                {(settings.dock_position === "LEFT" || settings.dock_position === "RIGHT") && (
                  <div className={styles.settingRow} style={{ marginTop: 8 }}>
                    <div className={styles.settingInfo}>
                      <span className={styles.settingLabel}>Độ lệch dọc (Offset Y)</span>
                      <span className={styles.settingDesc}>
                        Di chuyển lên/xuống dọc theo mép sườn ({settings.island_y_offset}px)
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="range"
                        min="-500"
                        max="500"
                        step="5"
                        value={settings.island_y_offset}
                        onChange={(e) => {
                          const oy = parseInt(e.target.value, 10);
                          settings.updateSettings({ island_y_offset: oy, island_x_offset: 0 });
                          syncWindowCanvas(undefined, undefined, 0, oy);
                        }}
                        style={{ width: 100 }}
                      />
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() => {
                          settings.updateSettings({ island_y_offset: 0, island_x_offset: 0 });
                          syncWindowCanvas(undefined, undefined, 0, 0);
                        }}
                      >
                        Ở giữa
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "behavior" && (
              <>
                <h3 className={styles.sectionTitle}>Hành vi Island</h3>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Rê chuột để mở rộng</span>
                    <span className={styles.settingDesc}>Tự động mở rộng Island khi con trỏ chuột rê qua</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={settings.hover_to_expand}
                      onChange={(e) => settings.updateSettings({ hover_to_expand: e.target.checked })}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Tự động thu gọn</span>
                    <span className={styles.settingDesc}>Tự động thu gọn sau khi sự kiện hệ thống kết thúc</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={settings.auto_collapse}
                      onChange={(e) => settings.updateSettings({ auto_collapse: e.target.checked })}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Thời gian chờ thu gọn</span>
                    <span className={styles.settingDesc}>
                      Thời gian duy trì hiển thị thông báo sự kiện ({settings.collapse_delay} giây)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.5"
                    value={settings.collapse_delay}
                    onChange={(e) => settings.updateSettings({ collapse_delay: parseFloat(e.target.value) })}
                    style={{ width: 120 }}
                  />
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Ẩn khi toàn màn hình</span>
                    <span className={styles.settingDesc}>Tự động ẩn Island khi xem video full màn hình hoặc chơi game</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={settings.fullscreen_hide}
                      onChange={(e) => settings.updateSettings({ fullscreen_hide: e.target.checked })}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </>
            )}

            {activeTab === "modules" && (
              <>
                <h3 className={styles.sectionTitle}>Cấu hình mô-đun & Thông báo</h3>
                {(() => {
                  const moduleLabels: Record<string, { label: string; desc: string }> = {
                    volume: {
                      label: "Mô-đun Âm lượng",
                      desc: "Tích hợp điều khiển và hiển thị mức âm lượng Windows Core Audio",
                    },
                    media: {
                      label: "Mô-đun Đa phương tiện & Nhạc",
                      desc: "Hiển thị bài hát từ Spotify, YouTube, Edge qua Windows SMTC",
                    },
                    system: {
                      label: "Mô-đun Phần cứng",
                      desc: "Theo dõi mức tải CPU, RAM và Disk thời gian thực trong Control Center",
                    },
                    system_alert: {
                      label: "Cảnh báo RAM & CPU cao",
                      desc: "Tự động bung thông báo trên Island khi RAM sắp đầy hoặc CPU quá tải (≥ 90%)",
                    },
                    battery: {
                      label: "Mô-đun Nguồn & Pin",
                      desc: "Theo dõi trạng thái cắm sạc và cảnh báo mức pin yếu",
                    },
                    network: {
                      label: "Mô-đun Băng thông Mạng",
                      desc: "Theo dõi tốc độ tải lên và tải xuống của kết nối mạng",
                    },
                    screenshot: {
                      label: "Mô-đun Chụp màn hình",
                      desc: "Xem nhanh ảnh vừa chụp và thao tác mở hoặc sao chép nhanh",
                    },
                    clipboard: {
                      label: "Mô-đun Khay nhớ tạm",
                      desc: "Lịch sử và thông báo sao chép văn bản, tệp bảo mật",
                    },
                  };

                  const orderedKeys = [
                    "volume",
                    "media",
                    "system",
                    "system_alert",
                    "battery",
                    "network",
                    "screenshot",
                    "clipboard",
                  ];

                  // Include any extra custom modules
                  const allKeys = Array.from(
                    new Set([...orderedKeys, ...Object.keys(settings.enabled_modules)])
                  );

                  return allKeys.map((id) => {
                    const enabled = settings.enabled_modules[id] !== false;
                    const info = moduleLabels[id] || {
                      label: `Mô-đun ${id}`,
                      desc: `Kích hoạt tích hợp Windows ${id}`,
                    };

                    return (
                      <div key={id} className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                          <span className={styles.settingLabel}>{info.label}</span>
                          <span className={styles.settingDesc}>{info.desc}</span>
                        </div>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => settings.toggleModule(id)}
                          />
                          <span className={styles.slider} />
                        </label>
                      </div>
                    );
                  });
                })()}
              </>
            )}

            {activeTab === "shortcuts" && (
              <>
                <h3 className={styles.sectionTitle}>Phím tắt toàn cầu</h3>
                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Thanh lệnh & Tìm kiếm</span>
                    <span className={styles.settingDesc}>Mở bảng tìm kiếm và thực thi lệnh nhanh</span>
                  </div>
                  <span className={styles.shortcutBadge}>Ctrl + Space</span>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Mở rộng sự kiện</span>
                    <span className={styles.settingDesc}>Tạm thời mở rộng chi tiết sự kiện đang hoạt động</span>
                  </div>
                  <span className={styles.shortcutBadge}>Ctrl + Shift + Space</span>
                </div>

                <div className={styles.settingRow}>
                  <div className={styles.settingInfo}>
                    <span className={styles.settingLabel}>Ẩn / Hiện BousLand</span>
                    <span className={styles.settingDesc}>Trượt ẩn Island lên trên hoặc hiện lại</span>
                  </div>
                  <span className={styles.shortcutBadge}>Ctrl + Shift + B</span>
                </div>
              </>
            )}

            {activeTab === "privacy" && (
              <>
                <h3 className={styles.sectionTitle}>Quyền riêng tư Cục bộ (Local-First)</h3>
                <p style={{ fontSize: 13, lineHeight: "1.6", color: "var(--text-secondary)" }}>
                  BousLand được thiết kế là một tiện ích thuần desktop chạy hoàn toàn cục bộ trên máy tính của bạn.
                </p>
                <ul style={{ fontSize: 12, lineHeight: "1.8", color: "var(--text-secondary)", paddingLeft: 18 }}>
                  <li>Không yêu cầu và không bao giờ tạo tài khoản người dùng.</li>
                  <li>Không chứa bất kỳ mã theo dõi, thu thập dữ liệu (telemetry) hay kết nối bên ngoài.</li>
                  <li>Nội dung khay nhớ tạm và dữ liệu bài hát chỉ xử lý tạm thời trên bộ nhớ RAM.</li>
                  <li>Toàn bộ cấu hình được lưu trữ trực tiếp dưới dạng tệp JSON tại %APPDATA%/BousLand trên máy của bạn.</li>
                </ul>
              </>
            )}

            {activeTab === "about" && (
              <div className={styles.aboutContainer}>
                {/* Hero App Card */}
                <div className={styles.aboutHeroCard}>
                  <BousLandLogo size={46} glow={true} />
                  <div className={styles.aboutHeroInfo}>
                    <div className={styles.aboutHeroTitleRow}>
                      <span className={styles.aboutHeroTitle}>BousLand for Windows</span>
                      <span className={styles.aboutVersionBadge}>
                        <span className={styles.aboutVersionDot} />
                        v{appVersion}
                      </span>
                      <span className={styles.aboutEditionBadge}>Commercial Pro</span>
                    </div>
                    <div className={styles.aboutHeroSub}>
                      Không gian thông minh tương tác chất lỏng Dynamic Island cho Windows 10 & 11
                    </div>
                  </div>
                </div>

                <p className={styles.aboutDesc}>
                  BousLand tối ưu hóa triệt để không gian làm việc với độ trễ thấp, kết nối trực tiếp Win32 Native APIs và không lưu trữ dữ liệu người dùng ra bên ngoài (100% Local-First).
                </p>

                {/* 2x2 Specifications Bento Grid */}
                <div className={styles.aboutSpecsGrid}>
                  <div className={styles.aboutSpecCard}>
                    <div className={styles.aboutSpecIcon}>
                      <Sparkles size={16} />
                    </div>
                    <div className={styles.aboutSpecText}>
                      <span className={styles.aboutSpecLabel}>Phiên bản</span>
                      <span className={styles.aboutSpecValue}>v{appVersion} • Kênh Stable</span>
                    </div>
                  </div>

                  <div className={styles.aboutSpecCard}>
                    <div className={styles.aboutSpecIcon}>
                      <Cpu size={16} />
                    </div>
                    <div className={styles.aboutSpecText}>
                      <span className={styles.aboutSpecLabel}>Công nghệ</span>
                      <span className={styles.aboutSpecValue}>Tauri 2 + Rust + React 19</span>
                    </div>
                  </div>

                  <div className={styles.aboutSpecCard}>
                    <div className={styles.aboutSpecIcon}>
                      <Monitor size={16} />
                    </div>
                    <div className={styles.aboutSpecText}>
                      <span className={styles.aboutSpecLabel}>Hệ điều hành</span>
                      <span className={styles.aboutSpecValue}>Windows 10 / 11 (x64)</span>
                    </div>
                  </div>

                  <div className={styles.aboutSpecCard}>
                    <div className={styles.aboutSpecIcon}>
                      <Layers size={16} />
                    </div>
                    <div className={styles.aboutSpecText}>
                      <span className={styles.aboutSpecLabel}>Win32 Native API</span>
                      <span className={styles.aboutSpecValue}>Core Audio, SMTC, Run Reg</span>
                    </div>
                  </div>
                </div>

                {/* Auto Update Section */}
                <div className={styles.aboutUpdaterCard}>
                  <div className={styles.aboutUpdaterHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <RefreshCw
                        size={16}
                        className={updater.status === "checking" ? styles.spinIcon : ""}
                        color="var(--accent)"
                      />
                      <div>
                        <div className={styles.aboutUpdaterTitle}>
                          Tự động cập nhật (Auto-Update)
                        </div>
                        <div className={styles.aboutUpdaterSub}>
                          Nguồn phát hành: GitHub Releases (NguyenTaiPhat/bousland)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={updater.status === "checking" || updater.status === "downloading"}
                      onClick={() => updater.checkForUpdates()}
                      className={styles.aboutUpdateBtn}
                    >
                      {updater.status === "checking" ? (
                        <>
                          <RefreshCw size={12} className={styles.spinIcon} />
                          <span>Đang kiểm tra...</span>
                        </>
                      ) : (
                        "Kiểm tra cập nhật"
                      )}
                    </button>
                  </div>

                  {updater.status === "up-to-date" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#10b981", padding: "8px 12px", background: "rgba(16, 185, 129, 0.08)", borderRadius: 6 }}>
                      <CheckCircle2 size={14} />
                      <span>{updater.updateInfo?.notes || `Bạn đang ở phiên bản mới nhất (v${appVersion}).`}</span>
                    </div>
                  )}

                  {updater.status === "update-available" && (
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: 8,
                        background: "rgba(167, 139, 250, 0.08)",
                        border: "1px solid rgba(167, 139, 250, 0.25)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                          Đã có phiên bản mới: v{updater.updateInfo?.latest_version}
                        </span>
                        <button
                          type="button"
                          onClick={() => updater.installUpdate()}
                          style={{
                            padding: "6px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Cài đặt & Khởi động lại
                        </button>
                      </div>
                      {updater.updateInfo?.notes && (
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                          {updater.updateInfo.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {updater.status === "error" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248, 113, 113, 0.08)", borderRadius: 6 }}>
                      <AlertCircle size={14} />
                      <span>{updater.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Footer Links & Copyright */}
                <div className={styles.aboutFooterLinks}>
                  <span>© 2026 BousLand • NguyenTaiPhat</span>
                  <div className={styles.aboutLinksGroup}>
                    <a
                      href="https://github.com/NguyenTaiPhat/bousland"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.aboutLink}
                    >
                      <span>Mã nguồn GitHub</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
