# Bản Đặc Tả Thiết Kế: Audio Visualizer Trên Dynamic Island (BousLand)

- **Ngày tạo:** 2026-09-27
- **Tác giả:** Tai Phat & Antigravity
- **Trạng thái:** Đã phê duyệt (Approved)

---

## 1. Mục Tiêu (Goals)

1. Cung cấp trải nghiệm thị giác sống động chuẩn Dynamic Island trên Windows khi người dùng đang phát nhạc (Spotify, YouTube, Edge, v.v.).
2. Hiển thị 4 thanh sóng Mini Equalizer nhảy mượt mà theo đúng biên độ và nhịp điệu của âm thanh thực tế phát ra từ hệ thống.
3. Sử dụng công nghệ **WASAPI Loopback Capture** thông qua Win32 Core Audio trong Rust backend, không yêu cầu thiết bị ảo (Virtual Cable) hay quyền Microphone.
4. Đảm bảo hiệu năng cao và tiết kiệm pin tối đa: Tải CPU duy trì < 0.5%, tự động ngủ sâu (idle sleep) khi tạm dừng bài hát hoặc hệ thống không có âm thanh.
5. Màu sắc cột sóng tự động hòa hợp với màu bìa bài hát (`Dynamic Album Tint`) hoặc màu nhấn (`Accent Color`) của người dùng.

---

## 2. Giới Hạn & Phạm Vi (Non-Goals)

1. Không ghi âm hay lưu trữ dữ liệu âm thanh dưới mọi hình thức (100% xử lý tạm thời trên bộ nhớ đệm RAM theo nguyên tắc Local-First & Privacy).
2. Không làm visualizer phức tạp toàn màn hình; giữ đúng phong cách tối giản sang trọng (Minimal Luxury) của Apple Dynamic Island.

---

## 3. Kiến Trúc Hệ Thống (Architecture)

```text
[ Windows Audio Endpoint (Speakers / Headphones) ]
                      │
                      ▼
[ WASAPI Loopback Capture (IAudioCaptureClient) ]
                      │ (Buffer ~10-20ms)
                      ▼
[ 4-Band Amplitude Extractor (Bass, Low-Mid, High-Mid, Treble) ]
                      │
                      ▼ (Throttle ~30-40 fps)
[ Tauri Event: "bous://audio-spectrum" ([f32; 4]) ]
                      │
                      ▼
[ Native Bridge & Island Store ]
                      │
                      ▼
[ AudioVisualizer Component (CSS ScaleY / Framer Motion) ]
                      │
[ CompactView (Bên cạnh Album Artwork trên Island) ]
```

---

## 4. Chi Tiết Triển Khai Backend (Rust)

### 4.1. File: `src-tauri/src/media/visualizer.rs`
* **API Win32 Core Audio**:
  * `IMMDeviceEnumerator::GetDefaultAudioEndpoint(eRender, eConsole)`
  * `IMMDevice::Activate<IAudioClient>()`
  * Khởi tạo `IAudioClient::Initialize` với cờ `AUDCLNT_STREAMFLAGS_LOOPBACK` và `AUDCLNT_SHAREMODE_SHARED`.
  * `IAudioClient::GetService<IAudioCaptureClient>()`.
* **Cơ chế phân tích**:
  * Đọc gói mẫu âm thanh PCM 32-bit float (`WAVEFORMATEX`).
  * Tính toán biên độ trung bình bình phương (RMS) hoặc phân đoạn 4 băng tần:
    * Băng 1: Bass / Sub-bass
    * Băng 2: Low-Mid (trầm - trung)
    * Băng 3: High-Mid (giọng hát - giai điệu)
    * Băng 4: Treble (tiếng treble, cymbal, hi-hat)
  * Chuẩn hóa về dải `0.0 .. 1.0` với hệ số làm mịn (smoothing decay `lerp`).
* **Vòng đời & Quản lý tài nguyên**:
  * Quản lý trạng thái luồng chạy qua `Arc<AtomicBool>`.
  * Khi SMTC phát hiện `isPlaying == false` hoặc hệ thống im lặng liên tục > 1.5 giây: Giảm tần số đọc hoặc sleep luồng để không hao phí chu kỳ CPU.
  * Tự động khởi động lại nếu người dùng cắm/rút tai nghe hoặc đổi thiết bị âm thanh mặc định.

---

## 5. Chi Tiết Triển Khai Frontend (React + Framer Motion)

### 5.1. Component: `src/components/Island/AudioVisualizer.tsx`
* Nhận props: `isPlaying: boolean`, `accentColor?: string`.
* Lắng nghe event `bous://audio-spectrum` và cập nhật trực tiếp 4 thanh equalizer.
* Sử dụng CSS Hardware Acceleration (`transform: scaleY(...)`, `transform-origin: bottom`) để đạt tốc độ 60fps mượt mà không gây re-render các phần tử xung quanh.
* Kích thước thanh:
  * Chiều rộng: 2.5px.
  * Khoảng cách giữa các thanh: 2px.
  * Chiều cao tối đa: 14px, tối thiểu: 3px.
  * Bo góc: `rounded-full` (1.5px).

### 5.2. Tích Hợp Vào `src/components/Island/CompactView.tsx`
* Đặt cạnh ảnh bìa đĩa nhạc xoay tròn ở bên phải thanh Island khi ở trạng thái `COMPACT`.
* Khi `isPlaying == true` và có tín hiệu âm thanh: 4 cột sóng nhảy nhẹ nhàng.
* Khi pause: 4 cột sóng từ từ hạ về mức tối thiểu (3px) rồi mờ đi thanh lịch.

---

## 6. Xử Lý Các Trường Hợp Biên (Edge Cases)

| Trường hợp | Cách xử lý |
|---|---|
| Không phát âm thanh dù `isPlaying = true` | Visualizer hạ về 4 chấm nhỏ (chiều cao 3px), không giật lag. |
| Người dùng đổi cổng âm thanh (Loa ngoài -> Tai nghe Bluetooth) | Backend bắt lỗi, tái khởi tạo `IMMDevice` mặc định sau 500ms. |
| Âm lượng hệ thống = 0 (Mute) | Visualizer tự động phẳng hoàn toàn. |
| Tắt mô-đun trong Cài đặt | Tùy chọn `enabled_modules.visualizer` cho phép ẩn hoàn toàn nếu người dùng muốn Island tối giản tuyệt đối. |

---

## 7. Kế Hoạch Xác Minh (Verification Plan)

1. **Unit Test Backend**: Kiểm tra thuật toán tính toán 4 băng tần với luồng dữ liệu giả lập PCM buffer.
2. **Build Test**: Chạy `cargo check` và `npm run build` không có lỗi cảnh báo.
3. **Runtime Verification**:
   * Mở nhạc trên Spotify / YouTube: 4 cột sóng nhảy mượt theo nhịp bài hát.
   * Pause nhạc: Sóng hạ xuống và dừng lại tự nhiên.
   * Chuyển bài / đổi màu Album Tint: Màu của các cột sóng đổi màu đồng bộ tức thì.
