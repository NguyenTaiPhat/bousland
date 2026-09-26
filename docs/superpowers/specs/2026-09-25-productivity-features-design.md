# BousLand — Kế hoạch & Đặc tả Kỹ thuật: Nhóm Tính năng Năng suất (Productivity Suite)

## 1. Mục tiêu
Nâng cấp BousLand thành trạm trung chuyển thao tác nhanh trên desktop Windows:
- Kéo thả tệp tạm (Quick Shelf / Drop Zone).
- Lịch sử khay nhớ tạm cục bộ (Clipboard History).
- Ghi chú ghim nhanh (Quick Scratchpad).

---

## 2. Kiến trúc & Thiết kế chi tiết

### 2.1. Quick Shelf (Kéo thả & Trạm trung chuyển tệp)
- **Cơ chế kích hoạt**:
  - Khi con trỏ chuột đang kéo (drag) tệp di chuyển vào phạm vi mép trên màn hình (`y < 50px`), Island tự động bung rộng thành khung viền đứt nét phát sáng (Drop Zone) với icon khay nhận tệp.
  - Sau khi thả (drop), tệp được ghim vào Shelf (tối đa 5 tệp gần nhất).
- **Thao tác trên Shelf**:
  - Hiển thị danh sách thumbnail ảnh hoặc icon loại tệp + tên tệp + dung lượng.
  - Cho phép kéo từ Shelf thả sang app khác (Discord, trình duyệt, Photoshop).
  - Nút bấm nhanh:
    - Sao chép đường dẫn tuyệt đối (Full Path).
    - Mở trong File Explorer (`explorer /select,<path>`).
    - Xóa khỏi Shelf.
- **Tầng Backend Rust**:
  - Lắng nghe sự kiện kéo thả từ Tauri 2 window (`on_drag_drop_event`).
  - Hỗ trợ `CF_HDROP` Windows Clipboard để sao chép danh sách tệp.

---

### 2.2. Clipboard History (Lịch sử khay nhớ tạm an toàn)
- **Cơ chế thu thập**:
  - Mở rộng [src-tauri/src/system/clipboard.rs](file:///d:/PROJECT/BOUSLAND/src-tauri/src/system/clipboard.rs).
  - Khi `GetClipboardSequenceNumber` thay đổi:
    - Nếu là văn bản (`CF_UNICODETEXT`): Đọc chuỗi (giới hạn 5.000 ký tự / mục).
    - Tự động nhận diện định dạng: Link URL, Mã màu Hex/RGB, Mã code, Đoạn văn bản thường.
    - Lưu trữ trong Ring Buffer (tối đa 25 mục).
- **Quyền riêng tư & Bảo mật**:
  - Hoạt động 100% trên bộ nhớ RAM.
  - Tùy chọn xóa toàn bộ lịch sử với 1 click.
  - Tự động bỏ qua nội dung từ các trình quản lý mật khẩu nếu có cờ `Clipboard Viewer Ignore`.
- **Giao diện**:
  - Tab "Khay nhớ tạm" mới trong Trung tâm điều khiển và bảng popover mở rộng.
  - Nhấp 1 click để copy lại vào khay nhớ và hiển thị thông báo phản hồi.
  - Phím tắt mở nhanh: `Ctrl + Shift + V`.

---

### 2.3. Quick Scratchpad (Ghi chú ghim nhanh)
- **Cơ chế**:
  - Bảng ghi chú tối giản (Markdown hoặc Checklist todo).
  - Có thể ghim 1 dòng todo quan trọng lên Compact Island (dòng chữ cuộn mượt hoặc badge đếm việc).
  - Hỗ trợ nhập nhanh từ Command Bar: gõ `note <nội dung>` hoặc `todo <nội dung>`.
- **Lưu trữ**:
  - Lưu cục bộ dạng JSON tại `%APPDATA%/BousLand/scratchpad.json` qua `config.rs`.

---

## 3. Lộ trình triển khai (Implementation Plan)

### Giai đoạn 1: Clipboard History Engine & UI
1. Mở rộng `clipboard.rs` (Rust): Đọc chuỗi text utf-16, phân loại loại dữ liệu (text/url/color), phát sự kiện `bous://clipboard-new-item`.
2. Tạo `clipboardStore.ts`: Quản lý danh sách 25 mục, filter search.
3. Tạo giao diện `ClipboardPanel.tsx`: Hiển thị danh sách, copy 1 chạm, tag phân loại.
4. Đăng ký phím tắt toàn cầu `Ctrl + Shift + V` và lệnh Command Bar `clip` / `lichsu`.

### Giai đoạn 2: Quick Shelf (Drag & Drop Zone)
1. Thêm sự kiện drag over / drop trong `App.tsx` & `Island.tsx`.
2. Tạo hiệu ứng bung rộng Drop Zone khi kéo tệp vào Island.
3. Tạo `ShelfCard.tsx` hiển thị file đã ghim, nút copy path và mở Explorer.

### Giai đoạn 3: Quick Scratchpad & Pinning
1. Viết `scratchpad.rs` đọc/ghi `%APPDATA%/BousLand/scratchpad.json`.
2. Tạo component `ScratchpadCard.tsx` với checklist todo và quick note.
3. Tích hợp hiển thị todo đang ghim lên `CompactView.tsx`.
