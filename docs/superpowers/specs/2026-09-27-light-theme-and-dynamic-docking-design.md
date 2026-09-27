# Thiết Kế Kỹ Thuật: Hệ Thống Theme Trắng & Dynamic Edge Docking (Góc Vuông & Thanh Dọc)

**Ngày lập:** 27 Tháng 09, 2026  
**Trạng thái:** Đã phê duyệt (Approved)  
**Phiên bản mục tiêu:** BousLand v1.0.6  

---

## 1. Mục Tiêu & Bối Cảnh

1. **Vấn đề che thanh Tab trình duyệt:** Khi mở trình duyệt hoặc ứng dụng có tab kéo dài đến vị trí giữa mép trên màn hình, viên thuốc BousLand (luôn nổi trên cùng - Always on Top) che mất nút đóng tab (`x`) và thêm tab mới (`+`).
2. **Nhu cầu giao diện Sáng (Light Theme):** Hiện tại hệ thống có 4 theme đều thuộc gam tối (`dark`, `glass`, `mica`, `titanium`). Cần bổ sung 2 phong cách màu sáng cao cấp: **Trắng Sứ Tối Giản** (Pure Ceramic) và **Kính Mờ Băng Tuyết** (Frosted Snow).
3. **Cơ chế Docking đa hướng (Corner & Vertical Dock):** 
   - Khi di chuyển Island vào sát góc trên màn hình, Island tự động chuyển sang kiểu góc vuông ôm trọn góc viền (`border-radius: 0` ở góc tiếp xúc).
   - Khi d## 2. Kiến Trúc DockPosition & Định Vị Cửa Sổ (Backend Rust)

### 2.1 Kiểu Dữ Liệu Type-Safe `DockPosition`
Thay thế kiểu `String` tự do bằng `enum` có kiểu dữ liệu chặt chẽ ở cả Backend và Frontend:

**Trong Rust (`src-tauri/src/system/config.rs`):**
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DockPosition {
    #[default]
    TopCenter,
    TopLeft,
    TopRight,
    Left,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct BousSettings {
    // ... các trường hiện tại ...
    pub dock_position: DockPosition,
    pub island_x_offset: f64,
    pub island_y_offset: f64,
}
```

**Trong TypeScript (`src/core/types.ts`):**
```typescript
export type DockPosition = "TOP_CENTER" | "TOP_LEFT" | "TOP_RIGHT" | "LEFT" | "RIGHT";
```

### 2.2 Chuẩn Hóa Coordinate System & Đa Màn Hình (DPI / Multi-Monitor)
1. **Đơn vị Tọa độ Chuẩn (Logical Units - DIP):**
   - Mọi kích thước ($width, height$), độ dời ($offset\_x, offset\_y$) và vị trí chuột đều được tính toán theo **Logical Pixels (Device Independent Pixels)**.
   - Tauri tự động xử lý chuyển đổi giữa Physical Pixels và Logical Pixels thông qua `scale_factor` của màn hình chứa cửa sổ.
2. **Xử lý Đa Màn Hình (Multi-Monitor Awareness):**
   - Xác định monitor hiện hành qua `window.current_monitor()`.
   - Mỗi monitor có gốc tọa độ riêng trong không gian ảo của Windows: `mon_logical_x = mon_pos.x / scale_factor`, `mon_logical_y = mon_pos.y / scale_factor`.
   - Tất cả phép tính vị trí ($target\_x, target\_y$) đều được neo tương đối với `mon_logical_x` và `mon_logical_y` của monitor đó, đảm bảo Island không bị nhảy tọa độ sai lệch khi di chuyển giữa các màn hình có độ phân giải và DPI khác nhau (ví dụ: màn chính 4K 150%, màn phụ Full HD 100%).
3. **Phép tính Định vị Neo Mép:**
```rust
pub fn position_island_window(
    window: &WebviewWindow,
    width: f64,
    height: f64,
    dock_position: DockPosition,
    offset_x: f64,
    offset_y: f64,
) -> Result<(), String> {
    let monitor = match window.current_monitor().map_err(|e| e.to_string())? {
        Some(m) => m,
        None => match window.primary_monitor().map_err(|e| e.to_string())? {
            Some(pm) => pm,
            None => return Err("Không tìm thấy màn hình hiển thị".to_string()),
        },
    };

    let scale_factor = monitor.scale_factor();
    let mon_size = monitor.size();
    let mon_pos = monitor.position();

    let mon_width = mon_size.width as f64 / scale_factor;
    let mon_height = mon_size.height as f64 / scale_factor;
    let mon_x = mon_pos.x as f64 / scale_factor;
    let mon_y = mon_pos.y as f64 / scale_factor;

    let (target_x, target_y) = match dock_position {
        DockPosition::TopLeft => (mon_x, mon_y),
        DockPosition::TopRight => (mon_x + mon_width - width, mon_y),
        DockPosition::Left => (
            mon_x,
            mon_y + (mon_height - height) / 2.0 + offset_y,
        ),
        DockPosition::Right => (
            mon_x + mon_width - width,
            mon_y + (mon_height - height) / 2.0 + offset_y,
        ),
        DockPosition::TopCenter => {
            let base_x = mon_x + (mon_width - width) / 2.0 + offset_x;
            let clamped_x = base_x.clamp(mon_x + 8.0, mon_x + mon_width - width - 8.0);
            (clamped_x, mon_y + 10.0)
        }
    };

    window.set_size(Size::Logical(LogicalSize { width, height })).map_err(|e| e.to_string())?;
    window.set_position(Position::Logical(LogicalPosition { x: target_x, y: target_y })).map_err(|e| e.to_string())?;

    Ok(())
}
```

---

## 3. Hệ Thống Theme Màu Trắng (Design Tokens)

Bổ sung các CSS variables tương ứng vào `src/styles/theme.css`:

### 3.1 Theme `light`: Trắng Sứ Tối Giản (Pure Ceramic)
```css
[data-theme="light"] {
  --bg-color: #F8F9FA;
  --surface: #FFFFFF;
  --surface-2: #F3F4F6;
  --surface-hover: #E5E7EB;
  --surface-active: #D1D5DB;
  --border: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-focus: rgba(0, 0, 0, 0.20);
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  --shadow-island: 0 10px 30px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --shadow-glow: 0 0 14px rgba(0, 0, 0, 0.06);
  --glass-blur: none;
}
```

### 3.2 Theme `snow`: Kính Mờ Băng Tuyết (Frosted Snow)
```css
[data-theme="snow"] {
  --bg-color: rgba(240, 244, 248, 0.7);
  --surface: rgba(255, 255, 255, 0.84);
  --surface-2: rgba(243, 244, 246, 0.88);
  --surface-hover: rgba(229, 231, 235, 0.92);
  --surface-active: rgba(209, 213, 219, 0.96);
  --border: rgba(255, 255, 255, 0.85);
  --border-subtle: rgba(0, 0, 0, 0.06);
  --border-focus: rgba(59, 130, 246, 0.40);
  --text-primary: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --shadow-island: 0 12px 36px rgba(0, 0, 0, 0.12), 0 3px 10px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95);
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --shadow-glow: 0 0 16px rgba(186, 230, 253, 0.4);
  --glass-blur: blur(20px);
}
```

### 3.3 Đảo màu Accent trên nền sáng
Trong `applyThemeToDOM(theme: string, accentHex?: string)`:
Khi theme là `light` hoặc `snow`, nếu accent người dùng chọn là `#FFFFFF` (hoặc mặc định trắng), hệ thống tự động đổi `--accent` thành `#111827` (đen sang trọng) để các nút bấm, thanh tiến trình và icon tương phản 100% rõ ràng.

---

## 4. Thiết Kế Layout Engine: Ngang (Horizontal) & Dọc (Vertical)

### 4.1 Quy chuẩn Kích Thước Canvas Hệ Điều Hành (`STATE_DIMENSIONS`)
* **Dạng Ngang (`TOP_CENTER`, `TOP_LEFT`, `TOP_RIGHT`):**
  * `COMPACT`: $360 \times 60\text{px}$ (Pill: $280\text{px} \times 44\text{px}$, khi có nhạc: $330\text{px} \times 44\text{px}$)
  * `EXPANDED`: $410 \times 110\text{px}$
  * `CONTROL_CENTER`: $480 \times 630\text{px}$
* **Dạng Dọc (`LEFT`, `RIGHT`):**
  * `COMPACT`: $60 \times 360\text{px}$ (Pill: $44\text{px} \times 280\text{px}$, khi có nhạc: $44\text{px} \times 330\text{px}$)
  * `EXPANDED`: $110 \times 410\text{px}$
  * `CONTROL_CENTER`: $480 \times 630\text{px}$ (Bung ngang vào phía trong màn hình)

### 4.2 Kiểu Bo Góc Phản Ứng (Reactive Border Radius)
* `TOP_CENTER`: `border-radius: 22px;`
* `TOP_LEFT`: `border-radius: 0 22px 22px 22px;` (Góc trên-trái vuông 90° áp sát góc màn hình)
* `TOP_RIGHT`: `border-radius: 22px 0 22px 22px;` (Góc trên-phải vuông 90° áp sát góc màn hình)
* `LEFT`: `border-radius: 0 22px 22px 0;` (Cạnh trái phẳng áp sát mép màn hình, cạnh phải bo tròn)
* `RIGHT`: `border-radius: 22px 0 0 22px;` (Cạnh phải phẳng áp sát mép màn hình, cạnh trái bo tròn)

### 4.3 Cấu trúc Thành phần Dọc (`VerticalCompactView.tsx`)
* **Đỉnh:** Camera Dot phát sáng theo nhịp thở.
* **Giữa:** 
  - Ảnh đĩa nhạc xoay (hoặc icon trạng thái) kích thước $28 \times 28\text{px}$.
  - Audio Visualizer 4 dải tần xếp thành 4 vạch nằm ngang co giãn theo nhịp bass.
* **Đáy:** Đồng hồ giờ (ví dụ `15:45` xếp dòng 2 hàng `15` / `45`) hoặc % Pin.

---

## 5. Tương Tác Kéo Thả, Snap Threshold & Hysteresis

### 5.1 Thuật Toán Hysteresis Snap (Chống Rung Ranh Giới)
Để tránh hiện tượng giật cục / flicker khi người dùng kéo chuột mấp mé ranh giới giữa 2 chế độ, hệ thống sử dụng cơ chế ngưỡng trễ hai chiều (Dual-threshold Hysteresis):

1. **Ngưỡng Hút Vào (Snap-In Threshold - $T_{in}$):**
   - Khoảng cách đến góc mép trên: $\le 60\text{px}$ $\rightarrow$ Hút vào `TOP_LEFT` hoặc `TOP_RIGHT`.
   - Khoảng cách đến mép viền trái/phải: $\le 48\text{px}$ $\rightarrow$ Hút vào `LEFT` hoặc `RIGHT` (chuyển sang dọc).
2. **Ngưỡng Thoát Ra (Break-Away Threshold - $T_{out}$):**
   - Khi Island đang ở trạng thái đã snap (ví dụ `LEFT`), người dùng phải kéo chuột ra xa tối thiểu $\ge 80\text{px}$ từ viền màn hình mới nhả snap về `TOP_CENTER`.
   - Độ chênh lệch Hysteresis: $\Delta = T_{out} - T_{in} = 32\text{px}$. 
   - Lợi ích: Loại bỏ hoàn toàn tình trạng Island bị rung lắc hay liên tục gửi IPC resize khi người dùng rê chuột ngập ngừng tại ranh giới.

```text
[ Viền Màn Hình ] 0px -------------------- 48px (Snap-in) ---------- 80px (Break-away) ----------> Giữa màn hình
                  |<------ Vùng Đã Hít ------>|                      |
                  |<---------- Giữ nguyên chế độ Dock dọc ---------->| 
                                                                     |---> Chuyển về ngang tự do
```

### 5.2 Transition & Animation Khi Chuyển Đổi Ngang ↔ Dọc (Framer Motion)
Chuyển đổi giữa 2 hình thái kích thước chéo ($360 \times 60 \leftrightarrow 60 \times 360$) được thiết kế qua chuỗi animation mượt mà (Morph Sequence):
1. **Pha 1 - Cross-fade Nội Dung (0ms - 120ms):**
   - Nội dung thanh ngang (`CompactView`) mờ dần `opacity: 1 -> 0`.
   - Khi `opacity` đạt 0, switch component hiển thị sang thanh dọc (`VerticalCompactView`).
2. **Pha 2 - Morphing Khung Hình (0ms - 280ms):**
   - Container viên thuốc biến đổi kích thước qua Spring physics:
     `{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }`.
   - Bo góc `border-radius` biến đổi đồng thời (ví dụ từ `22px` sang `0px` ở cạnh áp sát viền).
3. **Pha 3 - Đồng Bộ Canvas Cửa Sổ HĐH:**
   - Để tránh cửa sổ Windows cắt cụt viền (clipping) trong lúc co giãn, hàm `syncWindowCanvas` ngay lập tức nới rộng kích thước canvas bao bọc an toàn ($360 \times 360\text{px}$), sau khi Spring animation kết thúc (300ms) mới thu canvas về đúng kích thước chuẩn ($60 \times 360$ hoặc $360 \times 60$).

---

## 6. Kế Hoạch Kiểm Thử Chuyên Sâu (Testing & Verification)

### 6.1 Kiểm Thử Đa Màn Hình & DPI Lệch (Multi-Monitor & DPI Matrix)
1. **Kiểm thử Scale Factor Đơn:**
   - Windows Display Scaling ở các mức: `100%`, `125%`, `150%`, `175%`, `200%`.
   - Xác nhận: Khi hít góc `TOP_LEFT` ($x=0, y=0$) và `TOP_RIGHT` ($x=\text{max}, y=0$), viền vuông ôm sát 100% không bị khe hở sub-pixel (không hở 1-2px) và không bị tràn viền gây mất góc.
2. **Kiểm thử Hệ Thống 2 Màn Hình (Dual-Monitor):**
   - Thiết lập Monitor 1 (Chính: 4K @ 150%) bên cạnh Monitor 2 (Phụ: 1080p @ 100%).
   - Kéo Island từ Monitor 1 sang Monitor 2:
     - Xác nhận `window.current_monitor()` cập nhật đúng màn hình đích.
     - Vị trí neo mép của Monitor 2 được tính đúng theo gốc tọa độ `mon_logical_x` của Monitor 2.
3. **Kiểm thử Hysteresis & Snap:**
   - Rê chuột lắc qua lại quanh ranh giới 50px mép trái: Island phải giữ vững trạng thái neo, không bị nhấp nháy chuyển mode liên tục.
   - Kéo dứt khoát ra ngoài > 80px: Island nhả snap mượt mà về dạng ngang.
4. **Kiểm thử Theme:**
   - Kiểm tra tương phản màu chữ/icon trên nền `light` và `snow` đạt chuẩn WCAG AA.
   - Xác nhận chuyển đổi theme không làm reload lại toàn bộ state ứng dụng.
5. **Kiểm thử Khởi động & Lưu trạng thái:**
   - Đóng ứng dụng và mở lại, kiểm tra vị trí `dock_position`, `island_x_offset`, `island_y_offset` và theme đã lưu có được nạp chính xác hay không.
