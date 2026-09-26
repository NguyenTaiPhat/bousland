# Audio Visualizer (Mini Equalizer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai Audio Visualizer dạng Mini Equalizer 4 cột sóng nhảy theo âm thanh thực tế từ Windows Core Audio (WASAPI Loopback Capture) trực tiếp trên Dynamic Island của BousLand khi phát nhạc.

**Architecture:** Sử dụng Win32 WASAPI Loopback Capture trong Rust backend (`IAudioCaptureClient`) trích xuất 4 dải tần biên độ (Bass, Low-Mid, High-Mid, Treble), throttle 30-40fps bắn event `bous://audio-spectrum`. Frontend React lắng nghe và cập nhật 4 thanh equalizer bằng CSS Hardware Acceleration (`scaleY`), tự động đổi màu theo `Dynamic Album Tint` hoặc `--accent`.

**Tech Stack:** Rust 2021, Windows Core Audio API (WASAPI `windows` crate 0.58), Tauri 2, React 19, TypeScript, CSS Modules.

## Global Constraints

- 100% Local-First, không lưu trữ âm thanh, không mở quyền Microphone.
- Tải CPU bổ sung < 0.5%, tự động idle sleep khi không có âm thanh hoặc khi `media.isPlaying == false`.
- Giao diện tối giản sang trọng chuẩn Apple Dynamic Island, kích thước cột 2.5px, bo góc tròn.

---

### Task 1: Core Audio WASAPI Loopback Capture & 4-Band Extractor in Rust

**Files:**
- Create: `src-tauri/src/media/visualizer.rs`
- Modify: `src-tauri/src/media/mod.rs`
- Test: `src-tauri/tests/system_tests.rs` (hoặc inline `#[cfg(test)]` trong `visualizer.rs`)

**Interfaces:**
- Produces:
  - `pub fn start_visualizer(app_handle: AppHandle, running: Arc<AtomicBool>) -> Result<(), String>`
  - Event payload: `bous://audio-spectrum` -> `[f32; 4]`
  - `pub fn extract_4_bands(pcm_samples: &[f32], channels: usize) -> [f32; 4]`

- [x] **Step 1: Write unit tests for 4-band audio extraction & smoothing**

Add tests in `src-tauri/src/media/visualizer.rs`:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_4_bands_silence() {
        let samples = vec![0.0f32; 512];
        let bands = extract_4_bands(&samples, 2);
        assert_eq!(bands, [0.0, 0.0, 0.0, 0.0]);
    }

    #[test]
    fn test_extract_4_bands_normalized_amplitude() {
        let samples: Vec<f32> = (0..512).map(|i| ((i as f32) * 0.1).sin() * 0.8).collect();
        let bands = extract_4_bands(&samples, 2);
        for &val in &bands {
            assert!(val >= 0.0 && val <= 1.0, "Band out of range: {}", val);
        }
    }
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml -- test_extract_4_bands`
Expected: FAIL with "module visualizer not found"

- [x] **Step 3: Implement `src-tauri/src/media/visualizer.rs`**

Implement WASAPI Loopback Capture loop:
- `IMMDeviceEnumerator` -> `GetDefaultAudioEndpoint(eRender, eConsole)`.
- `IAudioClient::Initialize` với `AUDCLNT_STREAMFLAGS_LOOPBACK` và `AUDCLNT_SHAREMODE_SHARED`.
- `IAudioCaptureClient::GetBuffer` đọc gói PCM float.
- `extract_4_bands` chia mẫu thành 4 dải tần (Bass, Low-Mid, High-Mid, Treble) với làm mịn `lerp`.
- `app_handle.emit("bous://audio-spectrum", bands)`.
- Chạy ngầm trong `tokio::task::spawn_blocking`.
- Đăng ký `pub mod visualizer;` trong `src-tauri/src/media/mod.rs`.

- [x] **Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path src-tauri/Cargo.toml -- test_extract_4_bands`
Expected: PASS (2 passed)

- [x] **Step 5: Commit**

```bash
git add src-tauri/src/media/visualizer.rs src-tauri/src/media/mod.rs
git commit -m "feat(media): implement WASAPI loopback capture and 4-band audio visualizer"
```

---

### Task 2: Wire Visualizer Background Worker into App Lifecycle

**Files:**
- Modify: `src-tauri/src/lib.rs:100-120`

**Interfaces:**
- Consumes: `media::visualizer::start_visualizer(app_handle, running_clone)`

- [x] **Step 1: Check existing background threads in `src-tauri/src/lib.rs`**

Examine how `battery_monitor` and `metrics_monitor` are spawned in `setup`.

- [x] **Step 2: Spawn `media::visualizer::start_visualizer` in `lib.rs`**

Call `media::visualizer::start_visualizer(handle.clone(), running_clone.clone());` inside `.setup()` block.

- [x] **Step 3: Run cargo check to verify compilation**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: SUCCESS with 0 errors.

- [x] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(lib): start audio visualizer background worker on app initialization"
```

---

### Task 3: Create Frontend AudioVisualizer Component

**Files:**
- Create: `src/components/Island/AudioVisualizer.tsx`
- Create: `src/components/Island/audioVisualizer.module.css`
- Modify: `src/core/nativeBridge.ts` (lắng nghe event `bous://audio-spectrum`)
- Modify: `src/stores/islandStore.ts` (lưu trữ spectrum data `[number, number, number, number]`)

**Interfaces:**
- Consumes: Tauri event `bous://audio-spectrum`
- Produces: `<AudioVisualizer isPlaying={boolean} />` component

- [x] **Step 1: Add spectrum state and updater in `src/stores/islandStore.ts`**

Add `spectrum: [number, number, number, number]` defaulting to `[0, 0, 0, 0]`.
Add `updateSpectrum: (bands: [number, number, number, number]) => void`.

- [x] **Step 2: Add event listener in `src/core/nativeBridge.ts`**

Listen to `"bous://audio-spectrum"` and invoke `useIslandStore.getState().updateSpectrum(event.payload)`.

- [x] **Step 3: Create `src/components/Island/AudioVisualizer.tsx` & CSS**

Render 4 vertical bars with:
- `width: 2.5px`, `borderRadius: 2px`.
- CSS variable `--accent` for dynamic coloring.
- `transform: scaleY(bandValue)` with `transformOrigin: "bottom"` for 60fps GPU acceleration.
- When `isPlaying == false`, gracefully animate down to minimum height dot.

- [x] **Step 4: Run frontend build to verify typing**

Run: `npm run build`
Expected: SUCCESS

- [x] **Step 5: Commit**

```bash
git add src/components/Island/AudioVisualizer.tsx src/components/Island/audioVisualizer.module.css src/stores/islandStore.ts src/core/nativeBridge.ts
git commit -m "feat(ui): create AudioVisualizer component with GPU-accelerated CSS scaling"
```

---

### Task 4: Integrate Visualizer into CompactView on Dynamic Island

**Files:**
- Modify: `src/components/Island/CompactView.tsx`
- Modify: `src/components/Island/island.module.css`

**Interfaces:**
- Consumes: `<AudioVisualizer />`
- Places visualizer beside rotating album artwork in Compact mode.

- [x] **Step 1: Inspect `src/components/Island/CompactView.tsx` media display structure**

Identify where album art and media badge are placed.

- [x] **Step 2: Place `<AudioVisualizer />` in CompactView**

Display `<AudioVisualizer />` beside the album art whenever `media.isPlaying` is true or when audio is actively detected.

- [x] **Step 3: Test and verify visually**

Run: `npm run build`
Verify layout padding, alignment, and responsiveness.

- [x] **Step 4: Commit**

```bash
git add src/components/Island/CompactView.tsx src/components/Island/island.module.css
git commit -m "feat(ui): integrate AudioVisualizer beside media artwork in CompactView"
```

---

### Task 5: End-to-End Verification & Performance Check

**Files:**
- None (verification task)

- [x] **Step 1: Run full unit test suite**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: All tests pass.

- [x] **Step 2: Run frontend production build**

Run: `npm run build`
Expected: Zero errors.

- [x] **Step 3: Push changes to main**

```bash
git push origin main
```
