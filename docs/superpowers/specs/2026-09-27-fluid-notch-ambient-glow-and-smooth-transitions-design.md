# BousLand v1.0.7: Fluid Notch, Ambient Glow & Smooth Tab Transitions

- **Date:** 2026-09-27
- **Target Version:** 1.0.7
- **Status:** Approved / Spec Ready (Updated with Staff Engineering Review)
- **Scope:** Dynamic visual excellence, contextual aura glow with strict state priority, zero-react-render liquid waveform with EMA smoothing, time-delta jelly drag physics, accessible reduced-motion, and fluid tab navigation.

---

## 1. Mục tiêu & Bối cảnh

BousLand đã hoàn thiện hệ sinh thái đa thanh neo (Top, Left, Right, TopLeft, TopRight), loại bỏ bo góc tại các mép tiếp xúc với màn hình (v1.0.6) và hỗ trợ giao diện Fluent/Luxury.

Phiên bản **v1.0.7** đưa trải nghiệm thị giác và tương tác vật lý lên chuẩn công nghiệp cao cấp:
1. **Ambient Edge Glow**: Hào quang quang học phát sáng viền theo ma trận ưu tiên trạng thái (*Strict State Priority*), tự động crossfade theo màu album nhạc thời gian thực, nhịp thở khi sạc, cảnh báo pin yếu, hoặc chớp trắng màn trập máy ảnh.
2. **Liquid Aurora Audio Visualizer**: Sóng âm Bézier uốn lượn liên tục dẫn xuất từ WASAPI 4-band spectrum, có bộ lọc làm mượt (*EMA/Interpolation*) và **hoạt động độc lập ngoài React render cycle** (Direct RAF to Canvas/SVG) để giữ CPU < 1%.
3. **Jelly Elastic Drag Physics (DeltaTime-based)**: Biến dạng co giãn giọt nước (*Squish & Stretch*) chuẩn hóa theo `deltaTime` vật lý (độc lập với refresh rate màn hình 60/144/240Hz và polling rate chuột), kèm nảy đàn hồi (*spring overshoot bounce*).
4. **Sliding Pill Indicator**: Nền tab lướt mượt mà chuẩn Fluent/macOS giữa các danh mục trong Cài đặt (`SettingsModal`), bộ lọc Clipboard (`ClipboardPanel`), và Quick Shelf (`ShelfPanel`).
5. **Anchor-Aware Panel Morphing**: Phóng to thu nhỏ Panel lớn nở từ đúng điểm neo của dock (`transform-origin`), **loại bỏ dynamic blur filter khi morph** để triệt tiêu tình trạng tụt khung hình GPU khi resize canvas.
6. **Hỗ trợ `prefers-reduced-motion`**: Tuân thủ tiêu chuẩn Accessibility của hệ điều hành.
7. **Test boundary toàn diện cho cả 5 dock**: Kiểm thử biên tọa độ, transform-origin, góc phẳng và hào quang cho `TOP_CENTER`, `LEFT`, `RIGHT`, `TOP_LEFT`, `TOP_RIGHT`.

---

## 2. Kiến trúc & Thiết kế chi tiết

### 2.1. State Priority & Ambient Edge Glow System

#### 2.1.1. Ma trận Ưu tiên Trạng thái (Strict Priority Hierarchy)
Khi nhiều sự kiện diễn ra đồng thời (ví dụ: đang phát nhạc, pin yếu lại cắm sạc và vừa chụp màn hình), hệ thống áp dụng máy trạng thái đơn nhất:

```
[P0: FLASH_SCREENSHOT] (Chớp trắng 150ms - Đè lên tất cả)
         │ (hết 150ms)
         ▼
[P1: LOW_BATTERY_WARN] (Pin < 20% & Không cắm sạc: Thở hổ phách đỏ)
         │ (khi cắm sạc)
         ▼
[P2: BATTERY_CHARGING] (Đang sạc pin: Thở xanh ngọc neon emerald)
         │ (khi pin đầy hoặc rút sạc)
         ▼
[P3: MEDIA_DOMINANT]   (Đang phát nhạc: Hào quang loang màu theo Album Art)
         │ (khi nhạc tắt)
         ▼
[P4: IDLE_AURA_OFF]    (Tắt hoàn toàn hào quang để giải phóng GPU)
```

#### 2.1.2. Hướng hắt sáng (Directional Aura Masking)
Hào quang chỉ phát ra từ các mép hở tiếp xúc với không gian màn hình, tuyệt đối không hắt ngược vào viền bezel vật lý:
- `TOP_CENTER`: Hắt ánh sáng xuống phía dưới và hai bên (`box-shadow: 0 10px 28px var(--aura-color)`).
- `LEFT`: Hắt ánh sáng sang phải, trên và dưới (`box-shadow: 10px 0 28px var(--aura-color)`).
- `RIGHT`: Hắt ánh sáng sang trái, trên và dưới (`box-shadow: -10px 0 28px var(--aura-color)`).
- `TOP_LEFT`: Hắt ánh sáng góc đông nam.
- `TOP_RIGHT`: Hắt ánh sáng góc tây nam.

---

### 2.2. Zero-React-Render Liquid Aurora Visualizer

#### 2.2.1. Vấn đề hiệu năng cốt lõi
Nếu đẩy dữ liệu FFT spectrum từ WASAPI (30-60 gói tin/giây) vào React state (`useState`/Zustand `setSpectrum`), toàn bộ React tree sẽ bị re-render liên tục ở 60fps, gây lãng phí CPU và xé hình khi kéo thả.

#### 2.2.2. Kiến trúc Direct RAF Canvas / Path
- Native bridge ghi raw spectrum vào một biến đệm tham chiếu tĩnh ngoài React:
  ```ts
  // Shared audio buffer (không trigger React state update)
  export const rawAudioSpectrumBuffer = new Float32Array(4);
  ```
- Component `LiquidAurora` quản lý một vòng lặp `requestAnimationFrame`:
  - **Làm mượt phổ tần (Exponential Moving Average - EMA Smoothing)**:
    ```ts
    // Attack nhanh để bắt nhịp bass (0.35), decay chậm để sóng lượn dẻo (0.12)
    const factor = target > current ? 0.35 : 0.12;
    smoothedSpectrum[i] += (target - smoothedSpectrum[i]) * factor;
    ```
  - **Dựng đường cong Bézier mượt mà**:
    Vẽ trực tiếp lên phần tử `<canvas>` kích thước nhỏ (ví dụ 80x24px, 2x DPR) hoặc cập nhật trực tiếp thuộc tính `d` của `<path>` SVG qua `ref.current.setAttribute("d", ...)`.
  - **Zero Component Re-render**: React component không re-render khi nhạc đập, giữ CPU ổn định dưới **0.8%**.

---

### 2.3. Jelly Elastic Drag Physics (DeltaTime-normalized)

#### 2.3.1. Tính toán chuẩn hóa theo thời gian thực (Time-delta)
Thay vì lấy `deltaMove` thô phụ thuộc vào tần số chuột:
```ts
const now = performance.now();
const dt = Math.max(0.001, (now - lastTime) / 1000); // đơn vị giây
lastTime = now;

// Vận tốc tính bằng pixels / giây
const velocity = (currentPos - prevPos) / dt;

// Exponential moving average cho vận tốc để loại bỏ nhiễu rung chuột
smoothVelocity += (velocity - smoothVelocity) * (1 - Math.exp(-dt * 18));
```

#### 2.3.2. Tính toán Squish & Stretch
- Giới hạn độ giãn tối đa $\le 8\%$ để giữ tính thanh lịch cao cấp, không bị biến dạng lố bịch:
  - `stretch = 1 + Math.min(0.08, Math.abs(smoothVelocity) * 0.00004);`
  - `squish = 1 - Math.min(0.05, Math.abs(smoothVelocity) * 0.000025);`
- Hướng co giãn theo trục dock:
  - `TOP_CENTER`, `TOP_LEFT`, `TOP_RIGHT`: Kéo ngang $\rightarrow$ scaleX = stretch, scaleY = squish.
  - `LEFT`, `RIGHT`: Kéo dọc $\rightarrow$ scaleY = stretch, scaleX = squish.
- Khi buông chuột: Cú nảy lò xo (*overshoot bounce*):
  - `type: "spring", stiffness: 450, damping: 22, mass: 0.5`.

---

### 2.4. Sliding Pill Tab Indicator & Morphing Tối ưu

#### 2.4.1. Sliding Pill Tab Indicator
- Sử dụng Framer Motion `layoutId="activeTabGlider"` cho sidebar `SettingsModal` và filter bar `ClipboardPanel`.
- Chuyển trang nội dung bằng **Directional Slide-Fade**: `initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}`.

#### 2.4.2. Loại bỏ Blur(8px) khi Morph Panel
- **Phân tích lỗi**: Áp dụng `filter: blur(8px)` trong khi cửa sổ Tauri đang thay đổi kích thước (`resize_island_canvas`) ép GPU phải reallocate swapchain buffer và tính toán Gaussian kernel nhiều lần trên diện tích lớn, gây giật khựng khung hình (*frame stutter*).
- **Giải pháp tối ưu**:
  - Loại bỏ hoàn toàn `filter: blur(...)` trong animation mở rộng của các Panel lớn.
  - Chỉ sử dụng bộ đôi chuyển động siêu nhẹ: **Opacity** (`0 -> 1`) và **Scale** (`0.96 -> 1`).
  - Điểm neo mở rộng (`transform-origin`) gắn chặt vào vị trí dock của Island:
    - `TOP_CENTER`: `transformOrigin: "top center"`
    - `LEFT`: `transformOrigin: "left center"`
    - `RIGHT`: `transformOrigin: "right center"`
    - `TOP_LEFT`: `transformOrigin: "top left"`
    - `TOP_RIGHT`: `transformOrigin: "top right"`

---

### 2.5. Tuân thủ Accessibility: `prefers-reduced-motion`

Sử dụng hook `useReducedMotion()` từ `framer-motion`:
- Khi người dùng bật **Reduce Motion** trong Windows Settings:
  - **Jelly Drag**: Tắt biến dạng co giãn (Scale luôn cố định `1.0`).
  - **Aura**: Tắt nhịp thở Breathing pulse, giữ độ sáng tĩnh mờ nhẹ nhàng.
  - **Visualizer**: Chuyển sóng cực quang uốn lượn thành thanh vạch tĩnh tối giản.
  - **Tab & Panel Transitions**: Chuyển toàn bộ hiệu ứng trượt thành crossfade tức thời (`duration: 0.08s`).

---

### 2.6. Performance Budget

| Chỉ số | Ngưỡng cho phép (Budget) | Phương pháp xác minh |
| :--- | :--- | :--- |
| **CPU Overhead (Idle / Compact)** | $\le 0.2\%$ | Task Manager / Performance Profiler |
| **CPU Overhead (Playing Audio + Waveform)** | $\le 0.8\%$ | Không re-render React tree khi phát âm thanh |
| **Framerate khi Morph / Chuyển Tab** | $60 - 120\text{ fps}$ không drop frame | DevTools Performance timeline |
| **Bundle Size Delta** | $< 8\text{ KB}$ gzipped | Vite build chunk analysis |
| **Memory Delta** | $< 10\text{ MB}$ | Edge WebView2 memory footprint |

---

## 3. Test Boundary & Kế hoạch Xác minh

### 3.1. Ma trận Kiểm thử 5 Dock (`TOP_CENTER`, `LEFT`, `RIGHT`, `TOP_LEFT`, `TOP_RIGHT`)

1. **Transform-Origin Test**:
   - Xác nhận từng vị trí dock trả về đúng `transformOrigin` chuẩn xác tương ứng.
2. **Contacting Edge Flatness Test**:
   - `TOP_CENTER`: `borderTop: "none"`, radius `0px 0px 22px 22px`.
   - `LEFT`: `borderLeft: "none"`, radius `0px 22px 22px 0px`.
   - `RIGHT`: `borderRight: "none"`, radius `22px 0px 0px 22px`.
   - `TOP_LEFT`: `borderTop: "none"`, `borderLeft: "none"`, radius `0px 0px 22px 0px`.
   - `TOP_RIGHT`: `borderTop: "none"`, `borderRight: "none"`, radius `0px 0px 0px 22px`.
3. **Aura Priority State Machine Test**:
   - `resolveAuraState({ isPlaying: true, isCharging: true, isScreenshot: true })` $\rightarrow$ `FLASH`.
   - `resolveAuraState({ isPlaying: true, isCharging: true, isScreenshot: false })` $\rightarrow$ `CHARGING`.
   - `resolveAuraState({ isPlaying: true, isCharging: false, batteryPct: 15 })` $\rightarrow$ `LOW_BATTERY`.
   - `resolveAuraState({ isPlaying: true, isCharging: false, batteryPct: 80 })` $\rightarrow$ `MEDIA`.
4. **EMA Smoothing Test**:
   - Xác minh thuật toán EMA làm mượt dải tần số không bị NaN/Infinity và suy giảm dần khi nguồn âm dừng đột ngột.

### 3.2. Verification Quy chuẩn
1. `npx vitest run` $\rightarrow$ 100% test files pass.
2. `cargo test --manifest-path src-tauri/Cargo.toml` $\rightarrow$ 14/14 test pass.
3. `npm run build` $\rightarrow$ Exit code 0, không có type error.
4. Cập nhật số hiệu phiên bản lên `v1.0.7` trong `package.json`, `Cargo.toml`, `tauri.conf.json`.
