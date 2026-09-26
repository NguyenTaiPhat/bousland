# Thiết Kế Chi Tiết: Tính Năng Auto-Update & Trang Web Giới Thiệu Thương Mại BousLand

- **Ngày tạo**: 2026-09-26
- **Trạng thái**: Draft - Chờ duyệt
- **Mục tiêu**:
  1. Xây dựng cơ chế Auto-Update (tự động cập nhật) hoàn chỉnh, an toàn cho ứng dụng desktop BousLand thông qua GitHub Releases.
  2. Xây dựng trang web thương mại sang trọng (Dark Luxury Landing Page) trong thư mục `website/` với đầy đủ ảnh minh họa, mô phỏng trực tiếp tương tác (Live Simulator) và nút tải về Windows.

---

## 1. Phân Hệ Auto-Update (Tự Động Cập Nhật)

### 1.1. Kiến Trúc & Quy Trình
- **Giao thức cập nhật**: Tauri v2 Updater kết hợp GitHub Releases.
- **Manifest File (`latest.json`)**:
  Được lưu trữ công khai tại GitHub Releases (`https://github.com/phat-developer/bousland/releases/latest/download/latest.json`):
  ```json
  {
    "version": "1.0.1",
    "notes": "Cập nhật logo thương mại sang trọng và tối ưu hóa hiệu ứng động chất lỏng.",
    "pub_date": "2026-09-26T12:00:00Z",
    "platforms": {
      "windows-x86_64": {
        "signature": "<ed25519-signature>",
        "url": "https://github.com/NguyenTaiPhat/bousland/releases/download/v1.0.1/BousLand_1.0.1_x64-setup.exe"
      }
    }
  }
  ```
- **Bảo mật chữ ký số**:
  Sử dụng cặp khóa Ed25519 do Tauri sinh ra. Public key được cấu hình trong `src-tauri/tauri.conf.json`. Mọi bản tải về đều được kiểm tra tính toàn vẹn và nguồn gốc trước khi chạy.

### 1.2. Backend Rust Core (`src-tauri`)
- Cấu hình plugin `tauri-plugin-updater` trong `Cargo.toml` và kích hoạt trong `lib.rs`.
- Cung cấp các lệnh Tauri Commands:
  - `check_for_updates`: Kiểm tra xem có phiên bản mới hơn phiên bản hiện tại hay không. Trả về thông tin: `{ available: bool, version: string, notes: string, date: string }`.
  - `download_and_install_update`: Tải tệp cập nhật ở chế độ nền (báo cáo tiến độ %) và chuẩn bị khởi động lại để hoàn tất.
  - Hỗ trợ cơ chế Dev/Fallback Mode khi chạy offline hoặc chưa kết nối GitHub để giao diện luôn hoạt động ổn định và hiển thị thông báo rõ ràng cho người dùng.

### 1.3. Giao Diện Người Dùng (Frontend UI)
- Đặt tại tab **Giới thiệu (About)** trong `SettingsModal.tsx`:
  - **Khu vực phiên bản**: Hiển thị phiên bản hiện tại (`v1.0.0 Commercial Edition`).
  - **Nút "Kiểm tra cập nhật"**: Có hiệu ứng xoay nạp (spinner), trạng thái đang kết nối.
  - **Trạng thái thông báo**:
    - *Đang dùng bản mới nhất*: Hiển thị dấu tích xanh và thông điệp "BousLand đã được cập nhật phiên bản mới nhất".
    - *Phát hiện bản mới*: Hiển thị banner tím dạ quang kèm số phiên bản mới, nút "Xem changelog", tiến trình tải thanh phần trăm (%) và nút "Cài đặt & Khởi động lại ngay".
  - **Tự động kiểm tra**: Khi khởi động ứng dụng (nếu người dùng bật tùy chọn "Tự động kiểm tra cập nhật" trong Cài đặt).

---

## 2. Phân Hệ Trang Web Giới Thiệu (Dark Luxury Landing Page)

### 2.1. Cấu Trúc Thư Mục
```text
website/
├── index.html          # Trang chủ semantic HTML5, chuẩn SEO & OpenGraph
├── styles.css          # CSS thiết kế Dark Luxury, kính mờ Obsidian, hiệu ứng neon
├── app.js              # Xử lý tương tác, Live Simulator, bộ đếm tải và điều hướng
└── assets/             # Tài nguyên đồ họa
    ├── logo.svg        # Logo chính thức BousLand
    ├── favicon.svg     # Icon thanh địa chỉ
    ├── preview-compact.svg     # Ảnh đồ họa minh họa chế độ Compact
    ├── preview-media.svg       # Ảnh đồ họa minh họa nghe nhạc
    ├── preview-control.svg     # Ảnh đồ họa minh họa Trung tâm điều khiển
    ├── preview-shelf.svg       # Ảnh đồ họa minh họa Quick Shelf
    └── desktop-mockup.svg      # Mô phỏng màn hình Windows 11 thực tế
```

### 2.2. Chi Tiết Các Phân Vùng Trang Web (Sections)

1. **Header & Sticky Navigation Bar**:
   - Logo thương hiệu BousLand phát sáng dạ quang.
   - Menu điều hướng: *Tính năng*, *Trải nghiệm trực tiếp*, *Bảo mật & Hiệu năng*, *FAQ*.
   - Nút CTA nổi bật: **"Tải BousLand cho Windows"** (trỏ tải trực tiếp installer `.exe`).

2. **Hero Section (Khu Vực Tiêu Đề Chính)**:
   - Tagline thương mại: *"Không gian thông minh Dynamic Island đẳng cấp trên màn hình Windows"*.
   - Khẩu hiệu: *"Tối ưu hóa năng suất, quản trị âm thanh, giải trí và hệ thống tức thì với 0% phân tâm."*
   - Hai nút hành động:
     - **Tải bộ cài đặt (.exe)** (kèm nhãn: *Windows 10 / 11 • Bản 1.0.0*).
     - **Tải bản Portable (chạy ngay không cần cài)**.
   - Huy hiệu chứng thực: *100% Local-First*, *Mã nguồn Rust siêu nhẹ*, *Bản quyền thương mại*.

3. **Live Interactive Island Simulator (Mô Phỏng Trực Tiếp Trên Web)**:
   - Một chiếc BousLand thực tế chạy bằng CSS/JS ngay giữa trang web để khách ghé thăm trải nghiệm ngay mà chưa cần tải về:
     - Bấm nút **"Phát nhạc"**: Island mở rộng với sóng equalizer chạy sống động, tên bài hát và ảnh bìa.
     - Bấm nút **"Tăng âm lượng"**: Hiển thị thanh volume gradient màu cam/xanh mượt mà.
     - Bấm nút **"Tải CPU cao"**: Hiển thị cảnh báo thông minh màu đỏ hổ phách.
     - Bấm nút **"Cắm sạc"**: Hiển thị trạng thái pin xanh ngọc và biểu tượng sạc.

4. **Showcase Gallery (Bộ Sưu Tập Hình Ảnh Minh Họa Chuyên Nghiệp)**:
   - Các slide/card hình ảnh trực quan thể hiện BousLand trên màn hình Desktop Windows 11:
     - *Compact Mode*: Tinh gọn ẩn hiện ở mép trên màn hình.
     - *Expanded Media View*: Trình phát đa phương tiện sang trọng.
     - *Control Center*: Bảng điều khiển trung tâm toàn diện.
     - *Quick Shelf & Clipboard*: Kéo thả tệp và quản lý lịch sử sao chép tức thì.

5. **Bộ 6 Trụ Cột Tính Năng (Feature Grid)**:
   - Thẻ kính mờ 3D (Obsidian Glass Cards) với viền phát sáng khi di chuột:
     1. **Native Core Audio**: Đồng bộ 1-1 với mixer âm lượng Windows.
     2. **SMTC Media Control**: Nhận diện Spotify, Chrome, Edge, Apple Music.
     3. **Hardware Health Monitor**: Đo nhịp tim CPU, RAM, Disk với chu kỳ 1s.
     4. **Quick Shelf Kéo Thả**: Lưu trữ tệp tạm thời không rác Desktop.
     5. **Khay Nhớ Tạm Thông Minh**: Tự động phân loại Text, Link, Code, Màu sắc.
     6. **Tùy Biến Giao Diện**: 4 chủ đề thẩm mỹ và bảng chọn màu nhấn không giới hạn.

6. **Hiệu Năng & Cam Kết Riêng Tư (Specs & Privacy)**:
   - Bảng so sánh thông số:
     - Mức chiếm dụng RAM: `< 25 MB` (Tối ưu hóa bằng Rust).
     - Thu thập dữ liệu / Telemetry: `0% (Tuyệt đối không thu thập)`.
     - Độ trễ phản hồi: `< 5ms`.
     - Lưu trữ: `100% Offline trên ổ cứng cục bộ`.

7. **FAQ & Tải Về Cuối Trang (Footer & CTA)**:
   - Câu hỏi thường gặp: Hướng dẫn cài đặt, yêu cầu hệ thống, phím tắt toàn cầu (`Ctrl+Space`, `Ctrl+Shift+B`).
   - Footer sang trọng với thông tin phát hành, liên kết GitHub và bản quyền © 2026 BousLand.

---

## 3. Kế Hoạch Xác Minh & Kiểm Thử
1. **Kiểm thử Auto-Update**:
   - Kiểm tra lệnh `check_for_updates` và hiển thị UI trong Settings.
   - Thử nghiệm trạng thái tải về và xử lý lỗi khi mạng ngắt kết nối.
2. **Kiểm thử Website**:
   - Mở website trực tiếp trên trình duyệt bằng `browser_subagent` hoặc local HTTP server.
   - Kiểm tra toàn bộ tương tác của Live Simulator.
   - Đảm bảo hiển thị hoàn hảo trên cả Desktop, Tablet và Mobile (Responsive 100%).
