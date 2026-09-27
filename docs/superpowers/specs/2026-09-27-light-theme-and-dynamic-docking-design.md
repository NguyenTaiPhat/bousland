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
   - Khi di chuyển vào mép cạnh trái hoặc phải, Island tự động xoay sang hướng dọc (`vertical`, viên thuốc dựng đứng $44 \times 280\text{px}$) với các thành phần sắp xếp theo cột.

---

## 2. Kiến Trúc DockPosition & Định Vị Cửa Sổ (Backend Rust)

### 2.1 Kiểu dữ liệu Docking
Trong `src-tauri/src/system/config.rs`:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct BousSettings {
    // ... các trường hiện tại ...
    pub dock_position: String, // "TOP_CENTER" | "TOP_LEFT" | "TOP_RIGHT" | "LEFT" | "RIGHT"
    pub island_x_offset: f64,
    pub island_y_offset: f64,
}
```
Giá trị mặc định: `dock_position = "TOP_CENTER"`, `island_x_offset = 0.0`, `island_y_offset = 0.0`.

### 2.2 Thuật toán Định vị trong `manager.rs`
Hàm `position_island_window` trong `src-tauri/src/windows/manager.rs`:
```rust
pub fn position_island_window(
    window: &WebviewWindow,
    width: f64,
    height: f64,
    dock_position: &str,
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
        "TOP_LEFT" => (mon_x, mon_y),
        "TOP_RIGHT" => (mon_x + mon_width - width, mon_y),
        "LEFT" => (
            mon_x,
            mon_y + (mon_height - height) / 2.0 + offset_y,
        ),
        "RIGHT" => (
            mon_x + mon_width - width,
            mon_y + (mon_height - height) / 2.0 + offset_y,
        ),
        _ => {
            // TOP_CENTER (Mặc định)
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

## 5. Tương Tác Kéo Thả & Bảng Điều Khiển Vị Trí

1. **Kéo thả tự do bằng chuột:**
   - Người dùng giữ phím `Alt` và kéo thả Island, hoặc bấm biểu tượng "Di chuyển" ở bảng Cài đặt.
   - Khi kéo gần mép trái/phải trên cùng: Tự động hít vào góc và chuyển `TOP_LEFT` / `TOP_RIGHT`.
   - Khi kéo vào mép cạnh trái/phải màn hình: Tự động chuyển hướng thành thanh dọc `LEFT` / `RIGHT`.
   - Vị trí được tự động lưu vĩnh viễn vào tệp cấu hình qua IPC `save_settings`.
2. **Nút bấm trực quan trong Cài Đặt:**
   - 5 nút vị trí minh họa: `Góc Trái`, `Giữa Trên`, `Góc Phải`, `Cạnh Trái (Dọc)`, `Cạnh Phải (Dọc)`.
   - Nút "Đặt lại về chính giữa" (Reset to Center).
3. **Thao tác Click Chuột Phải (Quick Peek):**
   - Click chuột phải lập tức ẩn Island thành vạch chỉ báo 5px sát mép, giải phóng toàn bộ không gian cho tab trình duyệt bên dưới.
   - Rê chuột vào vạch chỉ báo hoặc bấm `Shift + B` để mở lại Island ngay lập tức.

---

## 6. Kế Hoạch Kiểm Thử (Testing & Verification)
1. **Kiểm thử Theme:**
   - Chuyển đổi giữa 6 theme (`dark`, `glass`, `mica`, `titanium`, `light`, `snow`).
   - Kiểm tra độ tương phản văn bản, bóng đổ, màu icon và màu accent.
2. **Kiểm thử Docking:**
   - Chuyển lần lượt giữa 5 chế độ: `TOP_CENTER`, `TOP_LEFT`, `TOP_RIGHT`, `LEFT`, `RIGHT`.
   - Xác nhận cửa sổ Tauri thay đổi kích thước và vị trí mượt mà, không bị giật hay cắt cụt nội dung.
   - Kiểm tra click mở Control Center từ thanh dọc bung ra đúng hướng.
3. **Kiểm thử Khởi động & Lưu trạng thái:**
   - Đóng ứng dụng và mở lại, kiểm tra vị trí và theme đã lưu có được nạp chính xác hay không.
