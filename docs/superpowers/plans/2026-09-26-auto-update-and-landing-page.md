# Kế Hoạch Triển Khai: Auto-Update & Landing Page Thương Mại BousLand

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cơ chế Auto-Update qua GitHub Releases cho BousLand và xây dựng trang web giới thiệu thương mại sang trọng (Dark Luxury) tại thư mục `website/`.

**Architecture:** 
- Phân hệ Auto-Update: Backend Rust sử dụng `tauri-plugin-updater` cùng các lệnh wrapper an toàn (`check_for_updates`, `download_and_install_update`), cấu hình endpoint GitHub `NguyenTaiPhat/bousland`. Frontend React tại tab About trong `SettingsModal.tsx` hiển thị phiên bản, kiểm tra cập nhật, tiến trình tải và khởi động lại.
- Phân hệ Landing Page: Web tĩnh độc lập trong `website/` (HTML5 + CSS3 + Vanilla JS) phong cách Apple Dark Luxury, bao gồm bộ ảnh minh họa vector sắc nét, bộ mô phỏng Live Island Simulator có thể tương tác trực tiếp, bảng thông số kỹ thuật, và các nút tải file cài đặt Windows `.exe`.

**Tech Stack:** Tauri 2, Rust, React 18, HTML5, CSS3, Vanilla JS, SVG Graphics.

## Global Constraints
- Nguồn phát hành Auto-Update: `https://github.com/NguyenTaiPhat/bousland/releases/latest/download/latest.json`.
- Giao diện Landing Page: 100% Dark Luxury, kính mờ Obsidian Fluent, responsive trên mọi kích thước màn hình.
- Không dùng external CSS frameworks cồng kềnh cho website để tối ưu tải trang tức thì.
- Giữ nguyên các chức năng cốt lõi và kiểm thử passing 100%.

---

### Task 1: Cấu Hình Backend Tauri Updater & Rust Commands

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/system/updater.rs`

**Interfaces:**
- Produces: Tauri commands `check_for_updates`, `download_and_install_update`
- Returns: `UpdateInfo { available: bool, version: String, notes: String, pub_date: String }`

- [x] **Step 1: Thêm dependency tauri-plugin-updater vào Cargo.toml**
- [x] **Step 2: Cấu hình plugin updater trong tauri.conf.json**
- [x] **Step 3: Viết module src-tauri/src/system/updater.rs xử lý kiểm tra và tải cập nhật an toàn**
- [x] **Step 4: Đăng ký plugin và commands trong src-tauri/src/lib.rs**
- [x] **Step 5: Chạy cargo check để xác minh biên dịch backend**

---

### Task 2: Giao Diện Auto-Update Trong SettingsModal

**Files:**
- Create: `src/stores/updaterStore.ts`
- Modify: `src/components/Settings/SettingsModal.tsx`
- Create: `src/__tests__/updaterStore.test.ts`

**Interfaces:**
- Consumes: Tauri commands `check_for_updates`, `download_and_install_update`
- Produces: `useUpdaterStore` quản lý trạng thái kiểm tra, tiến trình tải %, và hành động khởi động lại

- [x] **Step 1: Viết test failing cho updaterStore trong src/__tests__/updaterStore.test.ts**
- [x] **Step 2: Triển khai src/stores/updaterStore.ts với Zustand**
- [x] **Step 3: Chạy test vitest để kiểm tra updaterStore pass 100%**
- [x] **Step 4: Tích hợp UI kiểm tra cập nhật vào tab About của SettingsModal.tsx**
- [x] **Step 5: Chạy npm run build để đảm bảo TypeScript không có lỗi**

---

### Task 3: Tạo Tài Nguyên Đồ Họa & Ảnh Minh Họa Cho Website

**Files:**
- Create: `website/assets/logo.svg`
- Create: `website/assets/favicon.svg`
- Create: `website/assets/preview-compact.svg`
- Create: `website/assets/preview-media.svg`
- Create: `website/assets/preview-control.svg`
- Create: `website/assets/preview-shelf.svg`
- Create: `website/assets/desktop-mockup.svg`

**Interfaces:**
- Produces: Vector illustration assets cho giao diện trang web

- [x] **Step 1: Tạo logo.svg và favicon.svg sắc nét trong website/assets/**
- [x] **Step 2: Tạo preview-compact.svg (Island nhỏ gọn trên thanh trạng thái)**
- [x] **Step 3: Tạo preview-media.svg (Island mở rộng nghe nhạc với sóng equalizer)**
- [x] **Step 4: Tạo preview-control.svg (Trung tâm điều khiển với các thẻ hệ thống)**
- [x] **Step 5: Tạo preview-shelf.svg (Quick Shelf kéo thả tệp)**
- [x] **Step 6: Tạo desktop-mockup.svg (Toàn cảnh BousLand trên Desktop Windows 11)**

---

### Task 4: Xây Dựng Cấu Trúc HTML Cho Landing Page

**Files:**
- Create: `website/index.html`

**Interfaces:**
- Produces: Cấu trúc semantic HTML5 của trang web với đầy đủ các section theo spec

- [x] **Step 1: Tạo website/index.html với thẻ meta SEO, OpenGraph, font Google Inter & Outfit**
- [x] **Step 2: Viết Header và Sticky Navbar với logo và nút Download CTA**
- [x] **Step 3: Viết Hero Section với tiêu đề ấn tượng và các nút tải file cài đặt**
- [x] **Step 4: Viết khung Live Interactive Island Simulator**
- [x] **Step 5: Viết Showcase Gallery hiển thị các hình ảnh minh họa**
- [x] **Step 6: Viết Feature Pillars (6 trụ cột tính năng) và Specs Privacy table**
- [x] **Step 7: Viết FAQ và Footer thương mại**

---

### Task 5: Thiết Kế CSS Dark Luxury Kính Mờ Cho Website

**Files:**
- Create: `website/styles.css`

**Interfaces:**
- Consumes: `website/index.html`
- Produces: Hệ thống thiết kế CSS hoàn chỉnh phong cách Obsidian Glassmorphism, animations và responsive

- [x] **Step 1: Thiết lập CSS variables (màu obsidian, viền kim loại, neon cyan & violet)**
- [x] **Step 2: Thiết kế giao diện Navbar, Hero Section và nút CTA phát sáng**
- [x] **Step 3: Thiết kế khung Live Simulator mô phỏng Dynamic Island mềm mại**
- [x] **Step 4: Thiết kế thẻ kính 3D cho Showcase Gallery và Feature Grid**
- [x] **Step 5: Thiết kế bảng Specs, khối FAQ Accordion và Footer**
- [x] **Step 6: Thêm Media Queries tối ưu hóa trên Mobile và Tablet**

---

### Task 6: Lập Trình Logic Tương Tác & Live Simulator Trong Website

**Files:**
- Create: `website/app.js`

**Interfaces:**
- Consumes: Các phần tử DOM trong `website/index.html`
- Produces: Trình tương tác trực tiếp mô phỏng các trạng thái BousLand ngay trên web

- [x] **Step 1: Viết logic chuyển đổi trạng thái mô phỏng (Compact, Media, Volume, CPU Alert, Battery)**
- [x] **Step 2: Lập trình hiệu ứng sóng nhạc equalizer và thanh trượt âm lượng động**
- [x] **Step 3: Viết logic tương tác FAQ Accordion mở/đóng mượt mà**
- [x] **Step 4: Tự động phát hiện hệ điều hành và gán link tải trực tiếp file setup .exe**
- [x] **Step 5: Thêm hiệu ứng cuộn mượt và hiệu ứng viền sáng theo con trỏ chuột**

---

### Task 7: Kiểm Thử Toàn Diện & Đóng Gói Hoàn Thiện

**Files:**
- Modify: `docs/superpowers/plans/2026-09-26-auto-update-and-landing-page.md` (cập nhật tiến độ)

- [x] **Step 1: Chạy kiểm thử vitest để đảm bảo toàn bộ unit test đạt 100%**
- [x] **Step 2: Chạy npm run build để kiểm tra frontend build**
- [x] **Step 3: Mở kiểm tra website/index.html trên trình duyệt và kiểm tra tương tác simulator**
- [x] **Step 4: Đóng gói lại BousLand.exe và bộ cài đặt release**
