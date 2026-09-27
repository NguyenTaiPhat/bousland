# BousLand v1.0.7: Fluid Notch, Ambient Glow & Smooth Tab Transitions

- **Date:** 2026-09-27
- **Target Version:** 1.0.7
- **Status:** Approved / Spec Ready
- **Scope:** Dynamic visual excellence, contextual aura glow, real-time liquid waveform, jelly drag physics, and fluid tab navigation.

---

## 1. Mục tiêu & Bối cảnh

BousLand đã hoàn thiện hệ sinh thái đa thanh neo (Top, Left, Right, TopLeft, TopRight), bỏ hoàn toàn bo góc tại các mép tiếp xúc với màn hình (v1.0.6) và hỗ trợ theme Fluent/Luxury.

Phiên bản **v1.0.7** nâng cấp trải nghiệm thị giác và xúc giác (haptic-like visual feedback) lên mức cao cấp nhất:
1. **Ambient Edge Glow**: Hào quang quang học phát sáng viền theo ngữ cảnh thực tế (màu album nhạc thời gian thực, nhịp thở xanh khi sạc pin, thở đỏ khi pin yếu, tia chớp flash trắng khi chụp ảnh màn hình).
2. **Liquid Aurora Audio Visualizer**: Thay thế 4 vạch equalizer CSS nhảy tĩnh bằng dải sóng âm cực quang uốn lượn liên tục (Bézier curves) dẫn xuất từ luồng WASAPI native 4-band spectrum.
3. **Jelly Elastic Drag Physics**: Hiệu ứng biến dạng co giãn giọt nước (*Squish & Stretch*) dựa trên vận tốc kéo dọc mép màn hình, kèm cú nảy đàn hồi (*spring overshoot bounce*) khi buông chuột.
4. **Sliding Pill Indicator**: Nền tab lướt mượt mà chuẩn Fluent/macOS giữa các danh mục trong Cài đặt (`SettingsModal`), bộ lọc Clipboard (`ClipboardPanel`), và Quick Shelf (`ShelfPanel`).
5. **Anchor-Aware Panel Morphing**: Hiệu ứng mở rộng từ Island sang các Panel lớn (Control Center, Clipboard, Shelf, Scratchpad, Settings) nở từ đúng điểm neo của dock (`transform-origin`).

---

## 2. Kiến trúc & Thiết kế chi tiết

### 2.1. Ambient Edge Glow System

#### Cơ chế hoạt động:
Mỗi khi có sự kiện hệ thống hoặc trạng thái đa phương tiện, một lớp hào quang đa tầng được áp dụng lên phần viền không tiếp xúc với mép màn hình:

- **Media Dominant Aura**:
  - Khi nhạc đang phát và có `artwork`: Gọi `extractDominantColor(artwork)` (canvas offscreen <2ms đã có sẵn trong `colorExtractor.ts`).
  - Màu trích xuất được áp dụng vào CSS variable `--island-aura-color` dạng `rgba(R, G, B, 0.45)`.
  - Tạo `box-shadow`:
    ```css
    box-shadow: 0 10px 30px var(--island-aura-color), 0 0 20px var(--island-aura-color);
    ```
  - Khi bài hát đổi hoặc tạm dừng: Chuyển màu qua CSS transition `box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)`.

- **Charging Breathing Pulse**:
  - Khi pin đang sạc (`battery.isCharging === true`): Hào quang màu xanh ngọc neon (`rgba(16, 185, 129, 0.5)`) co giãn theo chu kỳ nhịp thở 2.8s:
    ```css
    @keyframes auraBreathe {
      0%, 100% { box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25); }
      50% { box-shadow: 0 8px 28px rgba(16, 185, 129, 0.65), 0 0 14px rgba(16, 185, 129, 0.4); }
    }
    ```

- **Low Battery Pulse (<20%)**:
  - Hào quang màu hổ phách/đỏ cảnh báo (`rgba(239, 68, 68, 0.45)`), thở nhẹ nhàng không gây khó chịu.

- **Screenshot Camera Flash (150ms)**:
  - Khi bắt được sự kiện `SCREENSHOT_CAPTURED`: Bung hào quang trắng tinh khôi `rgba(255, 255, 255, 0.85)` với bán kính tỏa rộng 40px rồi tan dần trong 180ms.

---

### 2.2. Liquid Aurora Visualizer

#### Vị trí:
Thay thế hoàn toàn 4 thanh vạch `.equalizerWave` tĩnh trong `ExpandedMediaView.tsx` và nâng cấp `AudioVisualizer.tsx`.

#### Cơ chế đường cong Bézier:
- Tín hiệu đầu vào: Mảng 4 dải tần `spectrum: [number, number, number, number]` từ WASAPI bridge native.
- Dựng đường cong SVG path dạng cubic Bézier:
  ```ts
  // 4 điểm kiểm soát uốn lượn theo nhịp nhạc
  const p0 = { x: 0, y: height / 2 };
  const p1 = { x: width * 0.3, y: (height / 2) - spectrum[0] * maxAmp };
  const p2 = { x: width * 0.65, y: (height / 2) + spectrum[2] * maxAmp };
  const p3 = { x: width, y: height / 2 };
  ```
- Dải màu: Tuyến tính đa sắc (Aurora linear-gradient: Cyan `#38bdf8` sang Violet `#a78bfa` sang Emerald `#34d399` hoặc hòa theo màu album art).
- Trạng thái dừng: Đường sóng phẳng thanh lịch (Flat line) với độ mờ 40%.

---

### 2.3. Jelly Elastic Drag Physics

#### Cơ chế vật lý:
- Trong quá trình kéo rê trên thanh ray mép màn hình (`handleMouseDown` / `onMouseMove` trong `Island.tsx`):
  - Tính toán vận tốc kéo tức thời:
    ```ts
    const velocity = currentMoveDelta - prevMoveDelta;
    ```
  - Tính biến dạng co giãn (*Squish & Stretch*):
    - Khi kéo theo trục X (Top Dock):
      - `stretchX = 1 + Math.min(0.09, Math.abs(velocity) * 0.003)`
      - `squishY = 1 - Math.min(0.06, Math.abs(velocity) * 0.002)`
    - Khi kéo theo trục Y (Left/Right Dock):
      - `stretchY = 1 + Math.min(0.09, Math.abs(velocity) * 0.003)`
      - `squishX = 1 - Math.min(0.06, Math.abs(velocity) * 0.002)`
- Khi nhả chuột (`onMouseUp`):
  - Áp dụng cấu hình lò xo đàn hồi overshoot:
    ```ts
    transition: {
      type: "spring",
      stiffness: 460,
      damping: 22,
      mass: 0.5
    }
    ```
  - Island nảy nhẹ về kích thước gốc như một giọt nước tự nhiên.

---

### 2.4. Sliding Pill Tab Indicator & Slide-Fade Content

#### Trong `SettingsModal.tsx`:
- Sidebar chuyển từ class đổi màu thông thường sang Framer Motion `layoutId="activeSettingsTabPill"`:
  ```tsx
  {activeTab === tab.id && (
    <motion.div
      layoutId="activeSettingsTabPill"
      className={styles.activePillGlider}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
    />
  )}
  ```
- Panel Content: Thay vì fade tại chỗ, nội dung trượt lướt có hướng (*Directional slide-fade*):
  ```tsx
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, x: 12 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -12 }}
    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
  >
    {/* Tab contents */}
  </motion.div>
  ```

#### Trong `ClipboardPanel.tsx`:
- Các nút lọc loại nội dung (`Tất cả`, `Văn bản`, `Liên kết`, `Mã nguồn`, `Màu sắc`) sử dụng `layoutId="clipboardFilterPill"`.

---

### 2.5. Anchor-Aware Panel Morphing

#### Cơ chế Transform-Origin theo Dock:
- Khi Island mở rộng ra Panel lớn (Control Center, Clipboard, Quick Shelf, Scratchpad, Settings):
  ```ts
  const getTransformOrigin = (dock: DockPosition) => {
    switch (dock) {
      case "LEFT": return "left center";
      case "RIGHT": return "right center";
      case "TOP_LEFT": return "top left";
      case "TOP_RIGHT": return "top right";
      case "TOP_CENTER":
      default: return "top center";
    }
  };
  ```
- Thống nhất motion curve lò xo cho tất cả các Panel lớn:
  - `stiffness: 380, damping: 28, mass: 0.6`.
  - Kết hợp `filter: blur(8px) -> blur(0px)` giúp toàn bộ thao tác mở và đóng liền mạch, không còn cảm giác cửa sổ giật nảy.

---

## 3. Kế hoạch Kiểm thử & Xác minh

1. **Unit Tests (Vitest)**:
   - Test logic tính toán hào quang ngữ cảnh (`auraHelper.test.ts`): đảm bảo đúng màu và opacity cho từng trạng thái Media / Battery / Screenshot.
   - Test tính toán Squish & Stretch theo vận tốc kéo.
   - Test tính toán Bézier curve points cho Liquid Aurora visualizer.
2. **Typecheck & Linter**:
   - `npm run build` (`tsc && vite build`) không có bất kỳ warning/error nào.
   - `cargo test --manifest-path src-tauri/Cargo.toml` kiểm tra toàn bộ 14 test native.
3. **Cập nhật Version v1.0.7**:
   - Bump version `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` lên `1.0.7`.
